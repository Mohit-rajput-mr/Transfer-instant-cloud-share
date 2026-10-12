"use client";
import { completeMultipartUpload, createMultipartUpload, put, uploadPart } from "@vercel/blob/client";
import {
  CHUNK, ITERATIONS, chunkCount, deriveKeys, encryptChunk, fromB64, randomBytes, streamDecrypt, toB64, toHex,
  type DownloadSink,
} from "./crypto";
import { deviceId, deviceLabel, setOwnerKey, type Orb } from "./client";
import { FOLDER_MIME, directoryOutput, folderSink, zipOutput, type Manifest, type pickFolderTarget } from "./bundle";

export type Stage = "packing" | "deriving" | "encrypting" | "uploading" | "finalizing" | "decrypting" | "done";

const PARALLEL = 3;

export async function launch(opts: {
  file: File;
  name: string;
  passcode: string;
  maxDownloads: number | null;
  onProgress: (stage: Stage, fraction: number) => void;
  signal?: AbortSignal;
}): Promise<Orb> {
  const { file, name, passcode, maxDownloads, onProgress, signal } = opts;
  onProgress("deriving", 0);
  const salt = randomBytes(16);
  const nonce = randomBytes(8);
  const owner = toHex(randomBytes(32));
  const { key, auth } = await deriveKeys(passcode, salt, ITERATIONS);

  const res = await fetch("/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name, fileName: file.name || "file", mime: file.type || "application/octet-stream", size: file.size,
      chunkSize: CHUNK, iterations: ITERATIONS, salt: toB64(salt), nonce: toB64(nonce), auth, owner,
      maxDownloads, device: deviceLabel(),
    }),
    signal,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not open a slot in orbit");
  const { id, pathname, token } = (await res.json()) as { id: string; pathname: string; token: string };
  setOwnerKey(id, owner);

  const total = chunkCount(file.size);
  const encryptAt = async (i: number) => {
    const plain = await file.slice(i * CHUNK, Math.min(file.size, (i + 1) * CHUNK)).arrayBuffer();
    return encryptChunk(key, nonce, i, i === total - 1, plain);
  };
  const common = { access: "public" as const, token, contentType: "application/octet-stream", abortSignal: signal };

  let url: string;
  if (total === 1) {
    onProgress("encrypting", 0);
    const body = await encryptAt(0);
    const r = await put(pathname, new Blob([body as BlobPart]), {
      ...common,
      onUploadProgress: (e) => onProgress("uploading", e.loaded / Math.max(1, e.total)),
    });
    url = r.url;
  } else {
    const { key: mpKey, uploadId } = await createMultipartUpload(pathname, common);
    const loaded = new Array<number>(total).fill(0);
    const report = () => onProgress("uploading", loaded.reduce((a, b) => a + b, 0) / Math.max(1, file.size));
    const parts: { etag: string; partNumber: number }[] = [];
    let next = 0;
    const worker = async () => {
      while (next < total) {
        const i = next++;
        const body = await encryptAt(i);
        const plainLen = Math.min(CHUNK, file.size - i * CHUNK);
        for (let attempt = 0; ; attempt++) {
          try {
            const part = await uploadPart(pathname, new Blob([body as BlobPart]), {
              ...common, key: mpKey, uploadId, partNumber: i + 1,
              onUploadProgress: (e) => {
                loaded[i] = (e.loaded / Math.max(1, e.total)) * plainLen;
                report();
              },
            });
            parts.push(part);
            loaded[i] = plainLen;
            report();
            break;
          } catch (e) {
            if (signal?.aborted || attempt >= 3) throw e;
            await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, total) }, worker));
    parts.sort((a, b) => a.partNumber - b.partNumber);
    onProgress("finalizing", 1);
    const r = await completeMultipartUpload(pathname, parts, { ...common, key: mpKey, uploadId });
    url = r.url;
  }

  onProgress("finalizing", 1);
  const fin = await fetch(`/api/transfers/${id}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, url }),
  });
  if (!fin.ok) throw new Error("Could not place the object in orbit");
  onProgress("done", 1);
  return (await fin.json()) as Orb;
}

export class UnlockError extends Error {
  constructor(public reason: string, public left?: number) {
    super(reason);
  }
}

const memorySink = (): DownloadSink & { blob(mime: string): Blob } => {
  const parts: BlobPart[] = [];
  return {
    async write(c) {
      parts.push(c as BlobPart);
    },
    async close() {},
    async abort() {
      parts.length = 0;
    },
    blob: (mime) => new Blob(parts, { type: mime }),
  };
};

type SaveHandle = { createWritable(): Promise<{ write(d: BufferSource): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> };
type PickerWindow = Window & { showSaveFilePicker?: (o: { suggestedName: string }) => Promise<SaveHandle> };

const BIG = 512 * 1024 * 1024;

// Call synchronously inside the click handler so the browser still sees the user gesture.
export function pickSaveTarget(orb: Orb): Promise<SaveHandle | null> {
  const w = window as PickerWindow;
  if (orb.size < BIG || !w.showSaveFilePicker) return Promise.resolve(null);
  return w.showSaveFilePicker({ suggestedName: orb.fileName }).catch(() => null);
}

export async function receive(opts: {
  orb: Orb;
  passcode: string;
  target: Promise<SaveHandle | null>;
  onProgress: (stage: Stage, fraction: number) => void;
  signal?: AbortSignal;
  /** text and links: return the decrypted text instead of saving a file */
  inline?: boolean;
  /** folders: where to rebuild them (null → zip fallback) */
  folderTarget?: ReturnType<typeof pickFolderTarget>;
}): Promise<string | { folder: string; files: number; asZip: boolean } | void> {
  const { orb, passcode, onProgress, signal } = opts;
  onProgress("deriving", 0);
  const { key, auth } = await deriveKeys(passcode, fromB64(orb.salt), orb.iterations);
  const res = await fetch(`/api/transfers/${orb.id}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth, deviceId: deviceId(), device: deviceLabel() }),
    signal,
  });
  const r = await res.json().catch(() => ({ ok: false, reason: "gone" }));
  if (!r.ok) throw new UnlockError(r.reason, r.left);

  let sink: DownloadSink;
  let mem: ReturnType<typeof memorySink> | null = null;
  let folderInfo: { folder: string; files: number; asZip: boolean } | null = null;
  const handle = r.mime === FOLDER_MIME ? null : await opts.target;
  if (r.mime === FOLDER_MIME) {
    const dir = (await opts.folderTarget) ?? null;
    sink = folderSink(
      (m: Manifest) => (dir ? directoryOutput(dir, m.name) : zipOutput(m.name)),
      (m) => (folderInfo = { folder: m.name, files: m.files.length, asZip: !dir }),
    );
  } else if (handle) {
    const w = await handle.createWritable();
    sink = { write: (c) => w.write(c as BufferSource), close: () => w.close(), abort: () => w.abort() };
  } else {
    mem = memorySink();
    sink = mem;
  }

  onProgress("decrypting", 0);
  try {
    await streamDecrypt({
      url: r.url, key, nonce: fromB64(r.nonce), size: r.size, chunkSize: r.chunkSize, sink, signal,
      onProgress: (d) => onProgress("decrypting", d / Math.max(1, r.size)),
    });
  } catch (e) {
    await sink.abort().catch(() => {});
    throw e;
  }

  if (folderInfo) {
    onProgress("done", 1);
    return folderInfo;
  }
  if (mem && opts.inline) {
    onProgress("done", 1);
    return await mem.blob(r.mime).text();
  }
  if (mem) {
    const href = URL.createObjectURL(mem.blob(r.mime));
    const a = document.createElement("a");
    a.href = href;
    a.download = r.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
  }
  onProgress("done", 1);
}
