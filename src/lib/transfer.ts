"use client";
import { pickedSkin } from "./skins";
import { makePreview } from "./preview";
import {
  CHUNK, ITERATIONS, deriveKeys, fromB64, randomBytes, streamDecrypt, toB64, toHex,
  type DownloadSink,
} from "./crypto";
import { deviceLabel, dropOwnerKey, senderKey, setOwnerKey, type Orb } from "./client";
import { isAnon } from "./anon";
import { FOLDER_MIME, directoryOutput, folderSink, zipOutput, type DirHandle, type Manifest } from "./bundle";
import { autoDownload, safeMime, saveName } from "./save";
import { spaceBody, spaceOpenPass } from "./space";
import { P2P_PREFIX, hold, holding, isP2P, pull } from "./p2p";
import { fetchStored, isStored, storeCopy, waitStored } from "./cloud";
import { stayAwake } from "./wake";

export type Stage = "packing" | "deriving" | "encrypting" | "uploading" | "finalizing" | "decrypting" | "done";

/** Open objects (no passcode) are still encrypted, with this well-known code: the server stays blind to the
 *  content, and anyone who opens the object can decrypt it without typing anything. */
export const OPEN_PASS = "orbit:open";

export async function launch(opts: {
  file: File;
  name: string;
  passcode: string;
  maxDownloads: number | null;
  /** minutes until it burns (5..30) */
  life?: number;
  open?: boolean;
  hue?: number;
  /** name for the sender's bubble (several balls sent at once) */
  group?: string;
  /** wired to this task */
  task?: string;
  /** the name the file goes by (anonymous "hide file names": photo.jpg, file.pdf…) */
  fileName?: string;
  onProgress: (stage: Stage, fraction: number) => void;
  signal?: AbortSignal;
}): Promise<Orb> {
  const { file, name, passcode, maxDownloads, onProgress, signal } = opts;
  // anonymous (lib/anon.ts): no style, no thumbnail, and cloud only, never device to device
  const anon = isAnon();
  // open files in an anonymous space are encrypted with the space's key (only its members have it), not OPEN_PASS
  if (anon && opts.open && !spaceOpenPass()) throw new Error("This anonymous space is missing its key on this device. Open it from its link again");
  onProgress("deriving", 0);
  const salt = randomBytes(16);
  const nonce = randomBytes(8);
  const owner = toHex(randomBytes(32));
  // open objects have nothing to stretch against guessing: the lightest setting the server accepts launches faster
  const iterations = opts.open ? 100_000 : ITERATIONS;
  const { key, auth } = await deriveKeys(opts.open ? (spaceOpenPass() ?? OPEN_PASS) : passcode, salt, iterations);
  // a picture of what is inside (photo, video frame, PDF page), only for objects anyone may open
  const preview = opts.open && !anon ? await makePreview(file) : null;

  const res = await fetch("/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name, fileName: opts.fileName ?? (file.name || "file"), mime: file.type || "application/octet-stream", size: file.size,
      chunkSize: CHUNK, iterations, salt: toB64(salt), nonce: toB64(nonce), auth, owner,
      maxDownloads, device: deviceLabel(), hue: opts.hue, life: opts.life ?? 30, open: !!opts.open, from: await senderKey(), group: opts.group, task: opts.task, skin: anon ? undefined : pickedSkin() ?? undefined, thumb: !!preview, ...spaceBody(),
    }),
    signal,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not open a slot in orbit");
  const { id } = (await res.json()) as { id: string };
  setOwnerKey(id, owner);
  if (preview)
    await fetch(`/api/transfers/${id}/thumb`, { method: "POST", headers: { "x-owner": owner, "Content-Type": "image/jpeg" }, body: preview, signal }).catch(() => null);

  if (anon) {
    // never device to device: the encrypted cloud copy must be complete before anyone sees the object
    onProgress("uploading", 0);
    const saved = await storeCopy(id, owner, file, key, nonce, name, false, { onFrac: (f) => onProgress("uploading", f) });
    if (!saved) {
      await fetch(`/api/transfers/${id}`, { method: "DELETE", headers: { "x-owner": owner } }).catch(() => null);
      dropOwnerKey(id);
      throw new Error("Not sent: the encrypted cloud copy is unavailable right now. Anonymous mode never sends device to device.");
    }
  }
  // Nothing is uploaded first: this device keeps the file and sends it, encrypted, straight to whoever
  // opens it (lib/p2p.ts) until it burns.
  else hold(id, file, key, nonce, CHUNK, (opts.life ?? 30) * 60_000 + 60_000);
  const url = `${P2P_PREFIX}${id}`;

  onProgress("finalizing", 1);
  const fin = await fetch(`/api/transfers/${id}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, url }),
  });
  if (!fin.ok) throw new Error("Could not place the object in orbit");
  // and an encrypted copy into storage, so it stays downloadable after this page closes
  // a folder is packed on the fly, so it can't be picked again after a reload: only real files resume
  if (!anon) void storeCopy(id, owner, file, key, nonce, name, file.type !== FOLDER_MIME);
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

type UnlockReply = { url: string; nonce: string; size: number; chunkSize: number; fileName: string; mime: string; store?: string };
/** Checked passcode: the key plus where the ciphertext lives. Nothing is saved or picked before this succeeds. */
export type Unlocked = { key: Awaited<ReturnType<typeof deriveKeys>>["key"]; r: UnlockReply };

/** the code an open object was encrypted with: its anonymous space's key, or the well-known one */
function openPassFor(o: Orb) {
  if (!o.anon) return OPEN_PASS;
  const p = spaceOpenPass();
  if (!p) throw new UnlockError("nokey");
  return p;
}

export async function unlockOrb(orb: Orb, passcode: string, signal?: AbortSignal): Promise<Unlocked> {
  const { key, auth } = await deriveKeys(orb.open ? openPassFor(orb) : passcode, fromB64(orb.salt), orb.iterations);
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

/** No-password objects only: the same key + location as unlock, but nothing is counted (previews). */
export async function peekOrb(orb: Orb, signal?: AbortSignal): Promise<Unlocked> {
  const { key, auth } = await deriveKeys(openPassFor(orb), fromB64(orb.salt), orb.iterations);
  const res = await fetch(`/api/transfers/${orb.id}/peek`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth, ...spaceBody() }),
    signal,
  });
  const r = await res.json().catch(() => ({ ok: false, reason: "gone" }));
  if (!r.ok) throw new UnlockError(r.reason, r.left);
  return { key, r };
}

/**
 * Where the ciphertext comes from: this tab (it sent it), the stored copy when it is complete (fast,
 * parallel, and spares the sender's line), or straight from the sender's device. If the direct path
 * can't connect (sender gone, or a network that blocks it), a copy that is still uploading is waited for.
 */
async function source(r: UnlockReply, signal: AbortSignal | undefined, cloudOnly: boolean) {
  if (cloudOnly) {
    // anonymous: only the stored copy (a direct connection would show each side the other's IP)
    if (r.store && ((await isStored(r.store, signal)) || (await waitStored(r.store, 3 * 60_000, signal))))
      return { body: fetchStored(r.store, r.size, signal), stored: true };
    throw new Error("This file is only on the sender's device. Receiving it directly would show them your IP, so anonymous mode doesn't. Turn off Anonymous to receive it.");
  }
  const id = r.url.slice(P2P_PREFIX.length);
  if (holding(id)) return { body: await pull(id, signal), stored: false };
  if (r.store && (await isStored(r.store, signal))) return { body: fetchStored(r.store, r.size, signal), stored: true };
  try {
    return { body: await pull(id, signal), stored: false };
  } catch (e) {
    if (r.store && !signal?.aborted && (await waitStored(r.store, 3 * 60_000, signal))) return { body: fetchStored(r.store, r.size, signal), stored: true };
    throw e;
  }
}

/** Download and decrypt one object; the screen stays on meanwhile (see receiveNow). */
export async function receive(opts: Parameters<typeof receiveNow>[0]): Promise<Received> {
  const why = `recv-${opts.orb.id}`;
  stayAwake(why, true);
  try {
    return await receiveNow(opts);
  } finally {
    stayAwake(why, false);
  }
}

async function receiveNow(opts: {
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

  // set from callbacks / the sink factory, so kept on an object (TS does not narrow a callback-assigned `let`)
  const got: { manifest?: Manifest; zip?: File; parts?: File[]; mem?: ReturnType<typeof memorySink> } = {};
  // phones, multi-file balls: also keep each file, so the share sheet can save them all (photos → Photos)
  const keepParts = r.size <= KEEP_PARTS_MAX;
  const dir = opts.folderTarget ?? null;
  const handle = r.mime === FOLDER_MIME ? null : await opts.target;
  // a fresh place to write (again from scratch if a broken transfer is restarted)
  const makeSink = async (): Promise<DownloadSink> => {
    got.manifest = got.zip = got.parts = got.mem = undefined;
    if (r.mime === FOLDER_MIME)
      return folderSink(
        (m: Manifest) =>
          dir ? directoryOutput(dir, m.name)
            : zipOutput(m.name, (z) => (got.zip = z), keepParts && m.loose ? (f) => (got.parts ??= []).push(f) : undefined),
        (m) => (got.manifest = m),
      );
    if (handle) {
      const w = await handle.createWritable();
      return { write: (c) => w.write(c as BufferSource), close: () => w.close(), abort: () => w.abort() };
    }
    got.mem = memorySink();
    return got.mem;
  };
  let sink = await makeSink();
  const decrypt = (body?: ReadableStream<Uint8Array>) =>
    streamDecrypt({
      url: r.url, body, key, nonce: fromB64(r.nonce), size: r.size, chunkSize: r.chunkSize, sink, signal,
      onProgress: (d) => onProgress("decrypting", d / Math.max(1, r.size)),
    });

  onProgress("decrypting", 0);
  try {
    if (!isP2P(r.url)) await decrypt();
    else {
      const src = await source(r, signal, isAnon() || !!opts.orb.anon);
      try {
        await decrypt(src.body);
      } catch (e) {
        // the direct connection broke partway (sender's phone slept, network changed): start again from
        // the stored copy if there is one (or one finishing), instead of failing
        if (src.stored || !r.store || signal?.aborted) throw e;
        await sink.abort().catch(() => {});
        onProgress("decrypting", 0);
        if (!(await waitStored(r.store, 3 * 60_000, signal))) throw e;
        sink = await makeSink();
        await decrypt(fetchStored(r.store, r.size, signal));
      }
    }
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
  const mem = got.mem;
  if (!mem) throw new Error("Nothing was received");
  if (opts.inline) return { kind: "text", text: await mem.take("note.txt", "text/plain").text() };
  // never the sender's raw type: an html/svg blob: URL would run their script on our origin
  const type = safeMime(r.mime, r.fileName);
  const file = mem.take(saveName(r.fileName, type), type);
  if (!hold) autoDownload(file);
  return { kind: "file", file, held: hold };
}
