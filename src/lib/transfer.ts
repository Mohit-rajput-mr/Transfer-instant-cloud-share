"use client";
import { completeMultipartUpload, createMultipartUpload, put, uploadPart } from "@vercel/blob/client";
import {
  CHUNK, ITERATIONS, chunkCount, deriveKeys, encryptChunk, fromB64, randomBytes, streamDecrypt, toB64, toHex,
  type DownloadSink,
} from "./crypto";
import { deviceLabel, setOwnerKey, type Orb } from "./client";
import { FOLDER_MIME, directoryOutput, folderSink, zipOutput, type DirHandle, type Manifest } from "./bundle";
import { autoDownload, safeMime, saveName } from "./save";
import { spaceBody } from "./space";

export type Stage = "packing" | "deriving" | "encrypting" | "uploading" | "finalizing" | "decrypting" | "done";

const PARALLEL = 6;

export async function launch(opts: {
  file: File;
  name: string;
  passcode: string;
  maxDownloads: number | null;
  hue?: number;
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
      maxDownloads, device: deviceLabel(), hue: opts.hue, ...spaceBody(),
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

const memorySink = () => {
  let parts: BlobPart[] = [];
  return {
    async write(c: Uint8Array) {
      parts.push(c as BlobPart);
    },
    async close() {},
    async abort() {
      parts = [];
    },
    /** Builds the File once and drops the chunks, so only one copy stays in memory (matters on phones). */
    take(name: string, type: string) {
      const f = new File(parts, name, { type });
      parts = [];
      return f;
    },
  };
};

type SaveHandle = { name: string; createWritable(): Promise<{ write(d: BufferSource): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> };
type PickerWindow = Window & { showSaveFilePicker?: (o: { suggestedName: string }) => Promise<SaveHandle> };

const BIG = 512 * 1024 * 1024;

/** True when this file will go through the browser's "Save as…" picker (big files, desktop Chromium). */
export const needsSavePicker = (orb: Orb) => orb.size >= BIG && typeof window !== "undefined" && !!(window as PickerWindow).showSaveFilePicker;

// Call synchronously inside the click handler so the browser still sees the user gesture.
export function pickSaveTarget(orb: Orb): Promise<SaveHandle | null> {
  const w = window as PickerWindow;
  if (orb.size < BIG || !w.showSaveFilePicker) return Promise.resolve(null);
  return w.showSaveFilePicker({ suggestedName: saveName(orb.fileName, safeMime(orb.mime, orb.fileName)) }).catch(() => null);
}

const KEEP_PARTS_MAX = 400 * 1024 * 1024;

export type Received =
  /** text and links, shown in the card */
  | { kind: "text"; text: string }
  /** written through the save picker (big files); name = what the user called it */
  | { kind: "picked"; name: string }
  /** a file (or a folder as .zip). held: nothing saved yet, the user picks where (phones/tablets).
   *  !held: already handed to the browser's downloads (desktop) */
  | { kind: "file"; file: File; held: boolean; folder?: { name: string; files: number }; parts?: File[] }
  /** folder rebuilt inside a directory the user picked */
  | { kind: "dir"; folder: string; files: number; where: string };

type UnlockReply = { url: string; nonce: string; size: number; chunkSize: number; fileName: string; mime: string };
/** Checked passcode: the key plus where the ciphertext lives. Nothing is saved or picked before this succeeds. */
export type Unlocked = { key: Awaited<ReturnType<typeof deriveKeys>>["key"]; r: UnlockReply };

export async function unlockOrb(orb: Orb, passcode: string, signal?: AbortSignal): Promise<Unlocked> {
  const { key, auth } = await deriveKeys(passcode, fromB64(orb.salt), orb.iterations);
  const res = await fetch(`/api/transfers/${orb.id}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth, device: deviceLabel(), ...spaceBody() }),
    signal,
  });
  const r = await res.json().catch(() => ({ ok: false, reason: "gone" }));
  if (!r.ok) throw new UnlockError(r.reason, r.left);
  return { key, r };
}

export async function receive(opts: {
  orb: Orb;
  /** already-verified passcode (see unlockOrb) */
  unlocked: Unlocked;
  target: Promise<SaveHandle | null>;
  onProgress: (stage: Stage, fraction: number) => void;
  signal?: AbortSignal;
  /** text and links: return the decrypted text instead of saving a file */
  inline?: boolean;
  /** folders: where to rebuild them (null → zip fallback) */
  folderTarget?: DirHandle | null;
  /** phones/tablets: never auto-download; hand the File back so the user picks where it goes */
  hold?: boolean;
}): Promise<Received> {
  const { onProgress, signal } = opts;
  const { key, r } = opts.unlocked;

  let sink: DownloadSink;
  let mem: ReturnType<typeof memorySink> | null = null;
  // set from callbacks, so kept on an object (TS does not narrow a callback-assigned `let`)
  const got: { manifest?: Manifest; zip?: File; parts?: File[] } = {};
  // phones, multi-file balls: also keep each file, so the share sheet can save them all (photos → Photos)
  const keepParts = r.size <= KEEP_PARTS_MAX;
  const dir = opts.folderTarget ?? null;
  const handle = r.mime === FOLDER_MIME ? null : await opts.target;
  if (r.mime === FOLDER_MIME) {
    sink = folderSink(
      (m: Manifest) =>
        dir ? directoryOutput(dir, m.name)
          : zipOutput(m.name, (z) => (got.zip = z), keepParts && m.loose ? (f) => (got.parts ??= []).push(f) : undefined),
      (m) => (got.manifest = m),
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

  onProgress("done", 1);
  const hold = !!opts.hold;
  if (got.manifest) {
    const { name, files } = got.manifest;
    if (dir) return { kind: "dir", folder: name, files: files.length, where: dir.name };
    if (!got.zip) throw new Error("The folder arrived incomplete");
    if (!hold) {
      // several picked files: each lands in Downloads on its own (no zip); the browser asks once to allow it
      if (got.manifest.loose && got.parts?.length) got.parts.forEach((f, i) => setTimeout(() => autoDownload(f), i * 250));
      else autoDownload(got.zip);
    }
    return { kind: "file", file: got.zip, held: hold, folder: { name, files: files.length }, parts: got.parts };
  }
  if (handle) return { kind: "picked", name: handle.name };
  if (!mem) throw new Error("Nothing was received");
  if (opts.inline) return { kind: "text", text: await mem.take("note.txt", "text/plain").text() };
  // never the sender's raw type: an html/svg blob: URL would run their script on our origin
  const type = safeMime(r.mime, r.fileName);
  const file = mem.take(saveName(r.fileName, type), type);
  if (!hold) autoDownload(file);
  return { kind: "file", file, held: hold };
}
