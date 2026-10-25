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
import { bubbleName } from "./bubbles";
import { P2P_PREFIX, holding, isP2P, pull } from "./p2p";
import { fetchStored, isStored, openStored, stopCopy, storeCopy, storeUnavailable, waitStored } from "./cloud";
import { KEEP_MAX, keep, publish, unkeep } from "./outbox";
import { stayAwake } from "./wake";

/** A POST that survives a dropped or stuck connection (a phone switching networks, a cold server, a choked line): up to 3 tries of 20 s, then a clear message. */
async function sendRetry(url: string, init: RequestInit, tries = 3): Promise<Response> {
  for (let i = 0; ; i++) {
    try {
      // a busy or half-dead line can leave a request hanging forever (the file sat at "Locking"): 20 s a try
      return await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      if (i >= tries - 1) throw new Error("The connection dropped while sending. Check your internet and try again");
      await new Promise((r) => setTimeout(r, 800 * 2 ** i));
    }
  }
}

export type Stage = "packing" | "deriving" | "encrypting" | "uploading" | "finalizing" | "waiting" | "decrypting" | "done";

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

  const res = await sendRetry("/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name, fileName: opts.fileName ?? (file.name || "file"), mime: file.type || "application/octet-stream", size: file.size,
      chunkSize: CHUNK, iterations, salt: toB64(salt), nonce: toB64(nonce), auth, owner,
      maxDownloads, device: deviceLabel(), hue: opts.hue, life: opts.life ?? 30, open: !!opts.open, from: await senderKey(), group: opts.group, task: opts.task, skin: anon ? undefined : pickedSkin() ?? undefined, thumb: !!preview, by: anon ? undefined : bubbleName() || deviceLabel(), ...spaceBody(),
    }),
    signal,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not open a slot in orbit");
  const { id } = (await res.json()) as { id: string };
  setOwnerKey(id, owner);
  if (preview)
    // never in the way of the launch: on a weak line this upload could hang for minutes with the ball stuck at "Locking"
    void fetch(`/api/transfers/${id}/thumb`, { method: "POST", headers: { "x-owner": owner, "Content-Type": "image/jpeg" }, body: preview, signal: AbortSignal.timeout(15_000) }).catch(() => null);

  const url = `${P2P_PREFIX}${id}`;
  if (anon) {
    // never device to device: the encrypted cloud copy must be complete before anyone sees the object
    onProgress("uploading", 0);
    const saved = await storeCopy(id, owner, file, key, nonce, name, false, { onFrac: (f) => onProgress("uploading", f) });
    if (!saved) {
      await fetch(`/api/transfers/${id}`, { method: "DELETE", headers: { "x-owner": owner } }).catch(() => null);
      dropOwnerKey(id);
      throw new Error("Not sent: the encrypted cloud copy is unavailable right now. Anonymous mode never sends device to device.");
    }
    onProgress("finalizing", 1);
    const fin = await sendRetry(`/api/transfers/${id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, url }),
    });
    if (!fin.ok) throw new Error("Could not place the object in orbit");
    onProgress("done", 1);
    return (await fin.json()) as Orb;
  }

  // Visible = downloadable (owner 2026-10-25): the object appears for others only once its encrypted copy is saved
  // online, so everyone who sees it can download it, sender's page open or not. Before, it appeared at once and was
  // served from this device until the copy landed; a sender who closed the tab or locked the phone left a ball on
  // every screen that nobody could open. The file is kept in this browser meanwhile (lib/outbox.ts): if the page
  // closes before the copy is saved, the next visit finishes it and only then shows it.
  const life = opts.life ?? 30;
  const kept = file.size <= KEEP_MAX && (await keep({ id, owner, url, file, key, nonce, label: name, life, at: Date.now() }));
  onProgress("uploading", 0);
  const stop = () => stopCopy(id);
  signal?.addEventListener("abort", stop, { once: true });
  // a folder is packed on the fly, so it can't be picked again after a reload: only real files resume by re-picking
  const saved = await storeCopy(id, owner, file, key, nonce, name, !kept && file.type !== FOLDER_MIME, { onFrac: (f) => onProgress("uploading", f) });
  signal?.removeEventListener("abort", stop);
  if (signal?.aborted || (!saved && !storeUnavailable(id))) {
    void unkeep(id);
    await fetch(`/api/transfers/${id}`, { method: "DELETE", headers: { "x-owner": owner } }).catch(() => null);
    dropOwnerKey(id);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new Error("Not sent: the upload didn't go through. Check the connection and send it again.");
  }
  // !saved here: no online storage at all right now (none set up, or this month's free storage is used up): then it
  // is the old way, sent straight from this page while it stays open (and removed from orbit when it closes)
  onProgress("finalizing", 1);
  const orb = await publish({ id, owner, url, file, key, nonce, label: name, life });
  onProgress("done", 1);
  return orb;
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

type UnlockReply = { /** already counted at unlock (objects with a download limit) */ counted?: boolean; url: string; nonce: string; size: number; chunkSize: number; fileName: string; mime: string; store?: string; /** the same copy through Cloudflare's edge (lib/edge.ts) */ edge?: string };
/** Checked passcode: the key plus where the ciphertext lives. Nothing is saved or picked before this succeeds. */
export type Unlocked = { key: Awaited<ReturnType<typeof deriveKeys>>["key"]; r: UnlockReply; /** the passcode proof, to say "received" */ auth?: string };

/** the code an open object was encrypted with: its anonymous space's key, or the well-known one */
function openPassFor(o: Orb) {
  if (!o.anon) return OPEN_PASS;
  const p = spaceOpenPass();
  if (!p) throw new UnlockError("nokey");
  return p;
}

/** A request that answers or fails within `ms`: a dropped connection otherwise leaves it (and the card on
 *  "Unlocking") pending for minutes. Asked a second time once, then it says so. */
async function quickPost(url: string, body: unknown, signal?: AbortSignal, ms = 12_000): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const t = new AbortController();
    const timer = setTimeout(() => t.abort(), ms);
    const stop = () => t.abort();
    signal?.addEventListener("abort", stop, { once: true });
    try {
      return await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: t.signal });
    } catch (e) {
      if (signal?.aborted) throw e;
      if (attempt >= 2) throw new Error("Orbi didn't answer. Check your connection and try again");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", stop);
    }
  }
}

// the key of a no-password object, worked out ahead (warmKey: its card opened) so Download goes straight to the network
const keys = new Map<string, ReturnType<typeof deriveKeys>>();
const keyFor = (orb: Orb, pass: string) => {
  if (!orb.open) return deriveKeys(pass, fromB64(orb.salt), orb.iterations);
  let k = keys.get(orb.id);
  if (!k) {
    if (keys.size > 50) keys.clear();
    k = deriveKeys(openPassFor(orb), fromB64(orb.salt), orb.iterations);
    k.catch(() => keys.delete(orb.id));
    keys.set(orb.id, k);
  }
  return k;
};
/** a no-password object's card is open: get its key ready now */
export const warmKey = (orb: Orb) => void (orb.open && keyFor(orb, "").catch(() => {}));

export async function unlockOrb(orb: Orb, passcode: string, signal?: AbortSignal): Promise<Unlocked> {
  const { key, auth } = await keyFor(orb, passcode);
  const res = await quickPost(`/api/transfers/${orb.id}/unlock`, { auth, device: deviceLabel(), ...spaceBody() }, signal);
  const r = await res.json().catch(() => ({ ok: false, reason: "gone" }));
  if (!r.ok) throw new UnlockError(r.reason, r.left);
  return { key, r, auth };
}

/**
 * The file is complete on this device: only now is it a download (counted, on the globe, in the sender's numbers).
 * Unlock no longer counts (migration 031): a receiver stuck on "Unlocking" or waiting for an asleep sender, who then
 * gave up, used to show up as a download. Objects with a download limit are still counted at unlock (r.counted).
 * Once per unlock; keepalive so it still goes out if the page closes right after the save.
 */
const told = new WeakSet<Unlocked>();
export function markReceived(orb: Orb, un: Unlocked) {
  if (un.r.counted || !un.auth || told.has(un)) return;
  told.add(un);
  void fetch(`/api/transfers/${orb.id}/received`, {
    method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth: un.auth, device: deviceLabel(), anon: isAnon() || !!orb.anon, ...spaceBody() }),
  }).catch(() => {});
}

/** No-password objects only: the same key + location as unlock, but nothing is counted (previews). */
export async function peekOrb(orb: Orb, signal?: AbortSignal): Promise<Unlocked> {
  const { key, auth } = await keyFor(orb, "");
  const res = await quickPost(`/api/transfers/${orb.id}/peek`, { auth, ...spaceBody() }, signal);
  const r = await res.json().catch(() => ({ ok: false, reason: "gone" }));
  if (!r.ok) throw new UnlockError(r.reason, r.left);
  return { key, r };
}

/**
 * Where the ciphertext comes from: this tab (it sent it), the stored copy when it is complete (fast,
 * parallel, and spares the sender's line), or straight from the sender's device. If the direct path
 * can't connect (sender gone, or a network that blocks it), a copy that is still uploading is waited for.
 * A guess (a background preview nobody asked for yet) takes only a stored copy that is complete now, and fetches it
 * gently: it never adds a pull on the sender's line (often still uploading that very file), and never waits.
 */
async function source(r: UnlockReply, signal: AbortSignal | undefined, cloudOnly: boolean, guess = false, onWait?: () => void) {
  if (guess) {
    // this tab sent it: read here, no network at all (not downloaded back from storage)
    const id = r.url.slice(P2P_PREFIX.length);
    if (!cloudOnly && holding(id)) return { body: await pull(id, signal), stored: false };
    if (r.store && (await isStored(r.store, signal))) return { body: fetchStored(r.store, r.size, signal, 1), stored: true };
    throw new NotYet("not stored yet");
  }
  if (cloudOnly) {
    // anonymous: only the stored copy (a direct connection would show each side the other's IP)
    const now = r.store ? await openStored(r.store, r.size, signal, undefined, r.edge) : null;
    if (now) return { body: now, stored: true };
    if (r.store && (await waitStored(r.store, 3 * 60_000, signal))) return { body: fetchStored(r.store, r.size, signal), stored: true };
    throw new Error("This file is only on the sender's device. Receiving it directly would show them your IP, so anonymous mode doesn't. Turn off Anonymous to receive it.");
  }
  const id = r.url.slice(P2P_PREFIX.length);
  if (holding(id)) return { body: await pull(id, signal), stored: false };
  const store = r.store;
  if (!store) return { body: await pull(id, signal), stored: false };
  const now = await openStored(store, r.size, signal, undefined, r.edge);
  if (now) return { body: now, stored: true };
  return firstSource(id, store, r.size, signal, r.edge, onWait);
}

type Src = { body: ReadableStream<Uint8Array>; stored: boolean };
/**
 * The stored copy isn't complete yet: the direct connection and the stored copy, both at once, and whichever is ready
 * first serves the download. The direct path needs a handshake (live channel, network addresses, an answer: a few
 * seconds, longer or never on networks that block it), while a small file's stored copy lands within a second or two
 * of its launch. The loser is dropped: a late direct stream is cancelled (that hangs up), a late stored stream was never read.
 * Patient (owner 2026-10-25, Barcelona ← Hannover): a sender's phone that locks its screen or switches apps freezes the
 * page, so neither path answers for a while. Before, the receiver gave up after one try + 3 min ("the sender is offline")
 * although the sender came back minutes later. Now the direct path is asked again every `retryMs` and the stored copy is
 * watched for the whole life of a file (30 min), so the download starts by itself the moment either one is there;
 * `onWait` tells the card it is waiting for the sender. Closing the card (signal) stops it.
 */
export function firstSource(id: string, store: string, size: number, signal?: AbortSignal, edge?: string, onWait?: () => void, retryMs = 15_000): Promise<Src> {
  let won = false;
  let over = false;
  return new Promise<Src>((resolve, reject) => {
    let directErr: unknown = null;
    const take = (x: Src) => {
      if (won || over) return void x.body.cancel().catch(() => {});
      won = true;
      resolve(x);
    };
    const giveUp = (e: unknown) => {
      if (won || over) return;
      over = true;
      // the direct path's reason says more (sender offline, network blocks it) than "not stored"
      reject(directErr ?? e);
    };
    void (async () => {
      for (;;) {
        try {
          return take({ body: await pull(id, signal), stored: false });
        } catch (e) {
          directErr = e;
          if (won || over || signal?.aborted) return;
          onWait?.();
          await new Promise<void>((r) => {
            const t = setTimeout(r, retryMs);
            signal?.addEventListener("abort", () => (clearTimeout(t), r()), { once: true });
          });
          if (won || over || signal?.aborted) return;
        }
      }
    })();
    waitStored(store, 30 * 60_000, signal, () => won || over).then(
      async (ok) => {
        if (!ok) return giveUp(signal?.aborted ? signal.reason : new Error("The file isn't stored yet"));
        // stored now: read it near the reader if the edge can, else from the bucket
        const body = (await openStored(store, size, signal, undefined, edge).catch(() => null)) ?? fetchStored(store, size, signal);
        take({ body, stored: true });
      },
      giveUp,
    );
  });
}

/** A background preview whose stored copy isn't complete yet (try again later; nothing was fetched). */
export class NotYet extends Error {}

let pulling = 0;
/** a download someone asked for is running on this page (background previews wait for it) */
export const receiving = () => pulling > 0;

/** Download and decrypt one object; the screen stays on meanwhile (see receiveNow), not for a guess. */
export async function receive(opts: Parameters<typeof receiveNow>[0]): Promise<Received> {
  if (opts.guess) return receiveNow(opts);
  const why = `recv-${opts.orb.id}`;
  stayAwake(why, true);
  pulling++;
  try {
    const got = await receiveNow(opts);
    markReceived(opts.orb, opts.unlocked);
    return got;
  } finally {
    pulling--;
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
  /** a background preview nobody asked for yet: the complete stored copy or nothing (see source) */
  guess?: boolean;
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
      const src = await source(r, signal, isAnon() || !!opts.orb.anon, !!opts.guess, () => onProgress("waiting", 0));
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
