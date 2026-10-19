"use client";
// The stored copy (Cloudflare R2). Right after a launch the sender's browser encrypts the file again,
// chunk by chunk in the same format as the direct transfer, and uploads it in parallel parts through
// signed URLs. Once it is saved the sender may close the page: receivers fetch it from R2 instead, in
// parallel byte ranges. Until then the direct (peer-to-peer) path serves it, so nothing waits on this.
import { useSyncExternalStore } from "react";
import { encryptChunk } from "./crypto";
import { ALIVE_EVERY_MS, PART_CHUNKS, STORE_CHUNK, STORE_TAG, storeChunks } from "./limits";
import { stayAwake } from "./wake";
import { Meter } from "./rate";

export type CloudState = { state: "saving" | "paused" | "saved" | "failed"; frac: number; speed?: string };
const states = new Map<string, CloudState>();
const aborts = new Map<string, AbortController>();
const subs = new Set<() => void>();
let snap = new Map(states);
/** progress listeners of one upload (storeCopy opts.onFrac) */
const fracs = new Map<string, (f: number) => void>();
const set = (id: string, s: CloudState | null) => {
  if (s) fracs.get(id)?.(s.frac);
  if (s) states.set(id, s);
  else states.delete(id);
  snap = new Map(states);
  subs.forEach((f) => f());
  stayAwake("cloud", [...states.values()].some((x) => x.state === "saving" || x.state === "paused"));
};

export const cloudSaved = (id: string) => states.get(id)?.state === "saved";
export const cloudSaving = () => [...states.values()].some((s) => s.state === "saving" || s.state === "paused");
export function useCloud() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => snap,
    () => snap,
  );
}

const PARALLEL_UP = 3;
const TRIES = 3;

// ---- a gentle upload: back off as soon as the line starts to choke ----------------------------------
// A full-speed upload fills the router's queue (bufferbloat): pages, DNS and Windows' own internet check
// time out and the computer looks offline. While uploads run, a tiny request to our own edge measures the
// round trip every 1.5 s; when it climbs well above this line's quiet level, uploads drop to one lane and
// pause briefly between parts so everything else on the network gets through.
const net = { users: 0, timer: 0 as ReturnType<typeof setInterval> | 0, base: Infinity, recent: [] as number[], congested: false };
async function probe() {
  const t = performance.now();
  const ok = await fetch(`/favicon.ico?rtt=${Date.now()}`, { method: "HEAD", cache: "no-store" }).then((r) => r.ok, () => false);
  const ms = ok ? performance.now() - t : 5000;
  net.recent = [...net.recent.slice(-2), ms];
  if (ok) net.base = Math.min(net.base, ms);
  const med = [...net.recent].sort((a, b) => a - b)[Math.floor(net.recent.length / 2)];
  // calm again only once it has clearly come back down (no flapping)
  net.congested = net.congested ? med > Math.max(net.base * 2.5, net.base + 200) : med > Math.max(net.base * 4, net.base + 400);
}
function watchNet(on: boolean) {
  net.users += on ? 1 : -1;
  if (net.users > 0 && !net.timer) {
    void probe();
    net.timer = setInterval(probe, 1500);
  } else if (net.users <= 0 && net.timer) {
    clearInterval(net.timer);
    net.timer = 0;
    net.users = 0;
    net.recent = [];
    net.congested = false;
  }
}
/** how many parts may go up at once right now */
const laneLimit = () => (net.congested ? 1 : PARALLEL_UP);
/** the line is choking: uploads are holding back */
export const netCongested = () => net.congested;

/** Switching Work ↔ Classic reloads the page: say so first if a cloud copy is still going up. */
export function switchView(href: string) {
  if (cloudSaving() && !confirm("Files are still uploading. Switching now pauses them (they pick up again after). Switch anyway?")) return;
  window.location.assign(href);
}

// ---- uploads that resume -------------------------------------------------------------------------
// A big upload is remembered on this device (IndexedDB: the object, its owner key, R2's upload id and
// the encryption key, which stays non-extractable). After the page closes or crashes, reopening the
// site offers to finish it: pick the same file again and only the missing parts go up.

export type PendingUpload = {
  id: string; owner: string; uploadId: string; fileName: string; size: number; lastModified: number;
  key: CryptoKey; nonce: Uint8Array; label: string; at: number;
};
const DB = "orbit-uploads";
const idb = () =>
  new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("up", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await idb();
  try {
    return await new Promise<T>((res, rej) => {
      const q = fn(db.transaction("up", mode).objectStore("up"));
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  } finally {
    db.close();
  }
}
const remember = (u: PendingUpload) => tx("readwrite", (s) => s.put(u)).catch(() => null);
const forgetUpload = (id: string) => tx("readwrite", (s) => s.delete(id)).catch(() => null);
/** Unfinished uploads from earlier visits (newest first), at most a day old. */
export async function pendingUploads(): Promise<PendingUpload[]> {
  const all = ((await tx<PendingUpload[]>("readonly", (s) => s.getAll() as IDBRequest<PendingUpload[]>).catch(() => [])) ?? []).filter((u) => !aborts.has(u.id));
  const old = all.filter((u) => Date.now() - u.at > 24 * 3600_000);
  old.forEach((u) => forgetUpload(u.id));
  return all.filter((u) => !old.includes(u)).sort((a, b) => b.at - a.at);
}
export const dropPending = (id: string) => forgetUpload(id);
/** Is this the same file the upload started with? */
export const sameFile = (u: PendingUpload, f: File) => f.size === u.size && f.name === u.fileName && (!u.lastModified || f.lastModified === u.lastModified);

/** PUT one part with progress; resolves to its ETag. */
function put(url: string, body: Blob, onSent: (n: number) => void, signal: AbortSignal) {
  return new Promise<string>((res, rej) => {
    if (signal.aborted) return rej(new DOMException("Aborted", "AbortError"));
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.upload.onprogress = (e) => onSent(e.loaded);
    x.onload = () => (x.status >= 200 && x.status < 300 ? res((x.getResponseHeader("ETag") ?? "").trim()) : rej(new Error(`upload ${x.status}`)));
    x.onerror = () => rej(new Error("upload network"));
    x.onabort = () => rej(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", () => x.abort(), { once: true });
    x.send(body);
  });
}

async function sealRange(file: File, key: CryptoKey, nonce: Uint8Array, from: number, to: number, total: number) {
  const out: BlobPart[] = [];
  for (let i = from; i < to; i++) {
    const plain = await file.slice(i * STORE_CHUNK, Math.min(file.size, (i + 1) * STORE_CHUNK)).arrayBuffer();
    out.push((await encryptChunk(key, nonce, i, i === total - 1, plain)) as BlobPart);
  }
  return new Blob(out);
}

const call = (id: string, body: object) =>
  fetch(`/api/transfers/${id}/store`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), res()), { once: true });
  });
/** Offline: wait until the network is back (or `ms` passes, onLine is not always truthful). */
const backOnline = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res) => {
    if (navigator.onLine) return void setTimeout(res, Math.min(ms, 1500));
    const done = () => (window.removeEventListener("online", done), clearTimeout(t), res());
    const t = setTimeout(done, ms);
    window.addEventListener("online", done);
    signal.addEventListener("abort", done, { once: true });
  });

class Gone extends Error {}

/** Big uploads under way on this page: closing it keeps them in orbit, to be finished on the next visit. */
const resumables = new Set<string>();
export const isResumable = (id: string) => resumables.has(id);

/** Uploads the encrypted copy. Never throws: on any failure the direct path still serves the file.
 *  Resolves true only when the copy is saved (anonymous sends wait for that: they have no direct path). */
export async function storeCopy(
  id: string, owner: string, file: File, key: CryptoKey, nonce: Uint8Array, label = file.name, canResume = true,
  opts?: { onFrac?(f: number): void },
): Promise<boolean> {
  const ac = new AbortController();
  aborts.set(id, ac);
  if (opts?.onFrac) fracs.set(id, opts.onFrac);
  try {
    set(id, { state: "saving", frac: 0 });
    // can this page reach the bucket at all (its CORS rule)? If not, don't send a byte: the direct path serves it
    const pr = await call(id, { owner, action: "start", probe: true });
    if (!pr.ok) {
      set(id, pr.status === 501 ? null : { state: "failed", frac: 0 });
      return false;
    }
    const { probe } = (await pr.json()) as { probe: string };
    const reach = await fetch(probe, { headers: { Range: "bytes=0-0" }, cache: "no-store", signal: ac.signal }).catch(() => null);
    if (!reach) {
      set(id, null);
      return false;
    }
    const r = await call(id, { owner, action: "start" });
    if (!r.ok) {
      // 501: no storage; 507: this month's free storage is used up. Either way it still sends directly
      set(id, r.status === 501 || r.status === 507 ? null : { state: "failed", frac: 0 });
      return false;
    }
    const s = (await r.json()) as { put?: string; uploadId?: string; urls?: string[] };
    if (s.put) await single(id, owner, file, key, nonce, s.put, ac.signal);
    else if (s.uploadId && s.urls) {
      if (canResume) {
        await remember({ id, owner, uploadId: s.uploadId, fileName: file.name, size: file.size, lastModified: file.lastModified, key, nonce, label, at: Date.now() });
        resumables.add(id);
      }
      await multi(id, owner, file, key, nonce, s.uploadId, s.urls.map((url, i) => ({ n: i + 1, url })), [], ac);
    } else throw new Error("start");
    set(id, { state: "saved", frac: 1 });
    forgetUpload(id);
    return true;
  } catch (e) {
    forgetUpload(id);
    set(id, ac.signal.aborted || e instanceof Gone ? null : { state: "failed", frac: 0 });
    return false;
  } finally {
    aborts.delete(id);
    resumables.delete(id);
    fracs.delete(id);
  }
}

/** Finishes an upload from an earlier visit: the same file picked again, only the missing parts go up. */
export async function resumeCopy(u: PendingUpload, file: File) {
  if (aborts.has(u.id) || !sameFile(u, file)) return false;
  const ac = new AbortController();
  aborts.set(u.id, ac);
  try {
    set(u.id, { state: "saving", frac: 0 });
    await remember({ ...u, at: Date.now() });
    resumables.add(u.id);
    await multi(u.id, u.owner, file, u.key, u.nonce, u.uploadId, null, null, ac);
    set(u.id, { state: "saved", frac: 1 });
    forgetUpload(u.id);
    return true;
  } catch (e) {
    forgetUpload(u.id);
    set(u.id, ac.signal.aborted || e instanceof Gone ? null : { state: "failed", frac: 0 });
    return false;
  } finally {
    aborts.delete(u.id);
    resumables.delete(u.id);
  }
}

/** A small file: one plain upload, retried through network drops. */
async function single(id: string, owner: string, file: File, key: CryptoKey, nonce: Uint8Array, url: string, signal: AbortSignal) {
  const total = storeChunks(file.size);
  const enc = file.size + total * STORE_TAG;
  const meter = new Meter(enc);
  for (let attempt = 1; ; attempt++) {
    try {
      const body = await sealRange(file, key, nonce, 0, total, total);
      await put(url, body, (b) => set(id, { state: "saving", frac: Math.min(0.99, b / enc), speed: meter.label(b) }), signal);
      break;
    } catch (e) {
      if (signal.aborted || attempt >= 8) throw e;
      set(id, { state: "paused", frac: 0 });
      await backOnline(Math.min(30_000, 1000 * 2 ** attempt), signal);
    }
  }
  await call(id, { owner, action: "saved" }).catch(() => null);
}

/**
 * A big file in parts, three at a time. Any break (offline, laptop asleep, links expired) pauses it;
 * then R2 is asked which parts it already has, and only the rest go up. It gives up only when the
 * object is gone (burnt or destroyed) or the user stops it.
 */
async function multi(
  id: string, owner: string, file: File, key: CryptoKey, nonce: Uint8Array, uploadId: string,
  todo: { n: number; url: string }[] | null, have: { n: number; etag: string }[] | null, ac: AbortController,
) {
  const total = storeChunks(file.size);
  const enc = file.size + total * STORE_TAG;
  const partBytes = (n: number) => {
    const from = (n - 1) * PART_CHUNKS, to = Math.min(total, n * PART_CHUNKS);
    return Math.min(file.size, to * STORE_CHUNK) - from * STORE_CHUNK + (to - from) * STORE_TAG;
  };
  const etags = new Map<number, string>();
  const sent = new Map<number, number>();
  let base = 0;
  const meter = new Meter(enc);
  let paused = false;
  const progress = () => {
    const done = base + [...sent.values()].reduce((a, b) => a + b, 0);
    set(id, { state: paused ? "paused" : "saving", frac: Math.min(0.99, done / enc), speed: paused ? undefined : meter.label(done) });
  };
  const sync = async () => {
    const r = await call(id, { owner, action: "resume", uploadId });
    if (r.status === 404 || r.status === 403) throw new Gone();
    if (!r.ok) throw new Error("resume");
    const d = (await r.json()) as { parts: number; done: { n: number; etag: string }[]; urls: { n: number; url: string }[] };
    have = d.done;
    todo = d.urls;
  };
  // keeps the object in orbit while this runs, paused or not
  watchNet(true);
  const beat = setInterval(async () => {
    const r = await call(id, { owner, action: "alive" }).catch(() => null);
    if (r?.ok && (await r.json().catch(() => null))?.ok === false) ac.abort(new Gone());
  }, ALIVE_EVERY_MS);
  try {
    if (!todo) await sync();
    for (let tries = 0; ; tries++) {
      etags.clear();
      for (const p of have ?? []) etags.set(p.n, p.etag);
      base = [...etags.keys()].reduce((a, n) => a + partBytes(n), 0);
      sent.clear();
      paused = false;
      progress();
      const queue = (todo ?? []).filter((p) => !etags.has(p.n));
      // one round: when a part gives up, the other lanes stop too, so nothing is sent twice after the resume
      const round = new AbortController();
      const stopRound = () => round.abort();
      ac.signal.addEventListener("abort", stopRound, { once: true });
      try {
        let next = 0;
        const worker = async (lane: number) => {
          while (next < queue.length && !round.signal.aborted) {
            // a choked line: only lane 0 keeps going, the others wait until it clears
            if (lane >= laneLimit()) {
              await sleep(700, round.signal);
              continue;
            }
            const p = queue[next++];
            for (let attempt = 1; ; attempt++) {
              try {
                const body = await sealRange(file, key, nonce, (p.n - 1) * PART_CHUNKS, Math.min(total, p.n * PART_CHUNKS), total);
                const etag = await put(p.url, body, (b) => (sent.set(p.n, b), progress()), round.signal);
                // R2 must expose ETag to the page (bucket CORS); without it the parts can't be put together
                if (!etag) throw new Error("no etag");
                etags.set(p.n, etag);
                sent.set(p.n, partBytes(p.n));
                paused = false;
                progress();
                // give the queued traffic of everything else on the network a moment to drain
                if (net.congested) await sleep(1500, round.signal);
                break;
              } catch (e) {
                sent.delete(p.n);
                if (round.signal.aborted) throw e;
                if (attempt >= TRIES) {
                  round.abort();
                  throw e;
                }
                // shows as paused right away, not after the retries run out
                paused = true;
                progress();
                await sleep(800 * attempt, round.signal);
              }
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(PARALLEL_UP, Math.max(1, queue.length)) }, (_, i) => worker(i)));
        const parts = Math.ceil(total / PART_CHUNKS);
        const list = Array.from({ length: parts }, (_, i) => etags.get(i + 1));
        if (list.some((e) => !e)) throw new Error("missing parts");
        const c = await call(id, { owner, action: "complete", uploadId, etags: list });
        if (c.status === 404 || c.status === 403) throw new Gone();
        if (!c.ok) throw new Error("complete");
        ac.signal.removeEventListener("abort", stopRound);
        return;
      } catch (e) {
        round.abort();
        ac.signal.removeEventListener("abort", stopRound);
        if (ac.signal.aborted) throw ac.signal.reason instanceof Gone ? ac.signal.reason : e;
        if (e instanceof Gone) throw e;
        if (String(e).includes("no etag")) throw e;
        // pause, wait for the network, then ask R2 what it has and carry on from there
        paused = true;
        progress();
        await backOnline(Math.min(30_000, 2000 * 2 ** Math.min(tries, 4)), ac.signal);
        if (ac.signal.aborted) throw ac.signal.reason instanceof Gone ? ac.signal.reason : e;
        for (;;) {
          try {
            await sync();
            break;
          } catch (err) {
            if (err instanceof Gone || ac.signal.aborted) throw err instanceof Gone ? err : e;
            await backOnline(15_000, ac.signal);
          }
        }
      }
    }
  } finally {
    clearInterval(beat);
    watchNet(false);
  }
}

/** Stop uploading (the ball was destroyed or burnt). */
export function stopCopy(id: string) {
  aborts.get(id)?.abort();
  forgetUpload(id);
  set(id, null);
}

/** Is the stored copy complete? (A tiny ranged read; the link is signed for GET only.) */
export async function isStored(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { headers: { Range: "bytes=0-0" }, cache: "no-store", signal }).catch(() => null);
  return !!r && (r.status === 206 || r.status === 200);
}

/** Waits for a copy that is still uploading (the direct path failed), up to `ms`. */
export async function waitStored(url: string, ms: number, signal?: AbortSignal) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (signal?.aborted) return false;
    if (await isStored(url, signal)) return true;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

const RANGE_CHUNKS = 2;
const PARALLEL_DOWN = 4;

/** The stored ciphertext as a stream, fetched in parallel byte ranges and handed out in order. */
export function fetchStored(url: string, size: number, signal?: AbortSignal): ReadableStream<Uint8Array> {
  const chunks = storeChunks(size);
  const enc = size + chunks * STORE_TAG;
  const step = RANGE_CHUNKS * (STORE_CHUNK + STORE_TAG);
  const count = Math.ceil(enc / step);
  const pending = new Map<number, Promise<Uint8Array>>();
  let next = 0;
  let out = 0;
  const get = async (k: number) => {
    const from = k * step;
    const to = Math.min(enc, from + step) - 1;
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await fetch(url, { headers: { Range: `bytes=${from}-${to}` }, cache: "no-store", signal });
        if (r.status !== 206 && !(r.status === 200 && from === 0 && to === enc - 1)) throw new Error(`Download failed (${r.status})`);
        const b = new Uint8Array(await r.arrayBuffer());
        if (b.length !== to - from + 1) throw new Error("short read");
        return b;
      } catch (e) {
        if (signal?.aborted || attempt >= 4) throw e;
        await new Promise((res) => setTimeout(res, 700 * attempt));
      }
    }
  };
  const fill = () => {
    while (next < count && pending.size < PARALLEL_DOWN) {
      const p = get(next);
      p.catch(() => {});
      pending.set(next++, p);
    }
  };
  return new ReadableStream<Uint8Array>(
    {
      async pull(ctrl) {
        if (out >= count) return ctrl.close();
        fill();
        try {
          const b = await pending.get(out)!;
          pending.delete(out++);
          fill();
          ctrl.enqueue(b);
        } catch (e) {
          ctrl.error(e);
        }
      },
    },
    { highWaterMark: 0 },
  );
}
