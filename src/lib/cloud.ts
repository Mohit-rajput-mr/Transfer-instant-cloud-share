"use client";
// The stored copy (Cloudflare R2). Right after a launch the sender's browser encrypts the file again,
// chunk by chunk in the same format as the direct transfer, and uploads it in parallel parts through
// signed URLs. Once it is saved the sender may close the page: receivers fetch it from R2 instead, in
// parallel byte ranges. Until then the direct (peer-to-peer) path serves it, so nothing waits on this.
import { useSyncExternalStore } from "react";
import { encryptChunk } from "./crypto";
import { ALIVE_EVERY_MS, LEGACY_PART_CHUNKS, PART_CHUNKS, STORE_CHUNK, STORE_TAG, storeChunks } from "./limits";
import { stayAwake } from "./wake";
import { Meter } from "./rate";
import { acquire, netCongested, netHiccup, netShaky, nudgeNet, tryAcquire, watchNet } from "./net";

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
/** this page is uploading that copy right now */
export const copying = (id: string) => aborts.has(id);
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

const TRIES = 3;
/** lanes one file may use at most (how many really run is up to lib/net.ts: 2 gently, 1 on a busy line, 6 at full speed) */
const LANES_UP = 6;

// ---- a gentle upload: back off as soon as the line starts to choke (lib/net.ts) -----------------------------------
// Every part (and every small file) takes a turn from the network watch first, across all files at once, so a send of
// ten 'Separate' files doesn't start thirty parallel uploads. On a busy line one part goes at a time with a pause after
// it in proportion to how long it took (a duty cycle), so pages, DNS and Windows' own internet check get through.
export { netCongested, setUpSpeed, upSpeed, type UpSpeed } from "./net";
/** big files' parts go up in the order the files were picked: the first ball is stored first (a small file, one
 *  upload, goes ahead of them: see single) */
let picked = 0;
/** after a part on a busy line: let the queue drain for half as long as the part took (capped) */
// (only once parts have really failed on this line: a slow round trip alone is no reason to stop sending)
const breather = (ms: number, signal: AbortSignal) => (netCongested() && netShaky() ? sleep(Math.min(30_000, Math.max(800, ms / 2)), signal) : Promise.resolve());

// ---- uploads that resume -------------------------------------------------------------------------
// A big upload is remembered on this device (IndexedDB: the object, its owner key, R2's upload id and
// the encryption key, which stays non-extractable). After the page closes or crashes, reopening the
// site offers to finish it: pick the same file again and only the missing parts go up.

export type PendingUpload = {
  id: string; owner: string; uploadId: string; fileName: string; size: number; lastModified: number;
  key: CryptoKey; nonce: Uint8Array; label: string; at: number;
  /** chunks per part this upload was started with (missing: from before parts of 1 chunk, so 4) */
  pc?: number;
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

/** a PUT that moved no byte for this long is dead (a half-open connection after a network switch, a stuck proxy) */
const STALL_MS = 30_000;

/** PUT one part with progress; resolves to its ETag. A stalled request is cut and fails as a network error, so the
 *  caller tries it again: before (owner 2026-10-27, Mumbai, 20 MB) one stuck request left an upload at "uploading"
 *  for an hour with nothing failing and nothing retried. */
function put(url: string, body: Blob, onSent: (n: number) => void, signal: AbortSignal) {
  return new Promise<string>((res, rej) => {
    if (signal.aborted) return rej(new DOMException("Aborted", "AbortError"));
    const x = new XMLHttpRequest();
    let stalled = false;
    let watch = 0 as ReturnType<typeof setTimeout> | 0;
    const arm = () => {
      clearTimeout(watch);
      watch = setTimeout(() => ((stalled = true), x.abort()), STALL_MS);
    };
    const stop = () => x.abort();
    const end = () => (clearTimeout(watch), signal.removeEventListener("abort", stop));
    x.open("PUT", url);
    x.upload.onprogress = (e) => (arm(), onSent(e.loaded), nudgeNet());
    // the last byte is sent: the answer (ETag) may take a moment, but not forever
    x.upload.onload = arm;
    x.onload = () => (end(), x.status >= 200 && x.status < 300 ? res((x.getResponseHeader("ETag") ?? "").trim()) : rej(new Error(`upload ${x.status}`)));
    x.onerror = () => (end(), rej(new Error("upload network")));
    x.onabort = () => (end(), rej(stalled ? new Error("upload network stalled") : new DOMException("Aborted", "AbortError")));
    signal.addEventListener("abort", stop, { once: true });
    arm();
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

// (a hung request on a dead line fails after 25 s like any other network error, and is asked again: never waited on forever)
// pc: the part layout of this upload (lib/limits.ts), so the server signs and checks the same parts
const callStore = (id: string, body: object, pc = PART_CHUNKS) =>
  fetch(`/api/transfers/${id}/store`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, pc }), signal: within(undefined, 25_000) });
const call = (id: string, body: object) => callStore(id, body);

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

/** `signal`, or `ms` passed: whichever first (AbortSignal.any is missing on older iPhones) */
export function within(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new DOMException("Timed out", "TimeoutError")), ms);
  if (signal) {
    if (signal.aborted) ac.abort(signal.reason);
    else signal.addEventListener("abort", () => (clearTimeout(t), ac.abort(signal.reason)), { once: true });
  }
  return ac.signal;
}

/** Big uploads under way on this page: closing it keeps them in orbit, to be finished on the next visit. */
const resumables = new Set<string>();
export const isResumable = (id: string) => resumables.has(id);

/** ids whose copy can't be stored at all (no storage, this month's free storage used up, bucket unreachable): the
 *  launch then falls back to sending directly while the page is open (lib/outbox.ts) */
const noStore = new Set<string>();
export const storeUnavailable = (id: string) => noStore.has(id);

/** Uploads the encrypted copy. Never throws: on any failure the direct path still serves the file.
 *  Resolves true only when the copy is saved (anonymous sends wait for that: they have no direct path). */
export async function storeCopy(
  id: string, owner: string, file: File, key: CryptoKey, nonce: Uint8Array, label = file.name, canResume = true,
  opts?: { onFrac?(f: number): void },
): Promise<boolean> {
  const ac = new AbortController();
  aborts.set(id, ac);
  const rank = ++picked;
  if (opts?.onFrac) fracs.set(id, opts.onFrac);
  try {
    set(id, { state: "saving", frac: 0 });
    // can this page reach the bucket at all (its CORS rule)? If not, don't send a byte: the direct path serves it
    const pr = await call(id, { owner, action: "start", probe: true });
    if (!pr.ok) {
      if (pr.status === 501) noStore.add(id);
      set(id, pr.status === 501 ? null : { state: "failed", frac: 0 });
      return false;
    }
    const { probe } = (await pr.json()) as { probe: string };
    const reach = await fetch(probe, { headers: { Range: "bytes=0-0" }, cache: "no-store", signal: within(ac.signal, 20_000) }).catch(() => null);
    if (!reach) {
      noStore.add(id);
      set(id, null);
      return false;
    }
    const r = await call(id, { owner, action: "start" });
    if (!r.ok) {
      // 501: no storage; 507: this month's free storage is used up. Either way it still sends directly
      if (r.status === 501 || r.status === 507) noStore.add(id);
      set(id, r.status === 501 || r.status === 507 ? null : { state: "failed", frac: 0 });
      return false;
    }
    const s = (await r.json()) as { put?: string; uploadId?: string; urls?: string[] };
    if (s.put) await single(id, owner, file, key, nonce, s.put, ac);
    else if (s.uploadId && s.urls) {
      if (canResume) {
        await remember({ id, owner, uploadId: s.uploadId, fileName: file.name, size: file.size, lastModified: file.lastModified, key, nonce, label, at: Date.now(), pc: PART_CHUNKS });
        resumables.add(id);
      }
      await multi(id, owner, file, key, nonce, s.uploadId, s.urls.map((url, i) => ({ n: i + 1, url })), [], ac, rank, PART_CHUNKS);
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
  const rank = ++picked;
  try {
    set(u.id, { state: "saving", frac: 0 });
    await remember({ ...u, at: Date.now() });
    resumables.add(u.id);
    await multi(u.id, u.owner, file, u.key, u.nonce, u.uploadId, null, null, ac, rank, u.pc ?? LEGACY_PART_CHUNKS);
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

/** A small file: one plain upload in its turn on the line (lib/net.ts), retried through network drops. Its turn comes
 *  before any big file's next part (rank 0: one upload of a part's size at most, not an hour behind a 6 GB video), it
 *  keeps the object in orbit while it waits (as multi does), and a signed link that ran out meanwhile is renewed. */
async function single(id: string, owner: string, file: File, key: CryptoKey, nonce: Uint8Array, url: string, ac: AbortController) {
  const { signal } = ac;
  const total = storeChunks(file.size);
  const enc = file.size + total * STORE_TAG;
  const meter = new Meter(enc);
  // small files are watched too: ten of them at once choke a line just like one big one
  await watchNet(true);
  const beat = setInterval(async () => {
    const r = await call(id, { owner, action: "alive" }).catch(() => null);
    if (r?.ok && (await r.json().catch(() => null))?.ok === false) ac.abort(new Gone());
  }, ALIVE_EVERY_MS);
  let expired = false;
  try {
    for (let attempt = 1; ; attempt++) {
      let done = tryAcquire("up");
      if (!done) {
        set(id, { state: "saving", frac: 0, speed: "waiting its turn" });
        done = await acquire("up", signal, 0);
      }
      try {
        if (expired) {
          const r = await call(id, { owner, action: "start" });
          if (r.status === 404 || r.status === 403) throw new Gone();
          const fresh = r.ok ? ((await r.json()) as { put?: string }).put : undefined;
          if (!fresh) throw new Error("start");
          url = fresh;
          expired = false;
        }
        const body = await sealRange(file, key, nonce, 0, total, total);
        const t = performance.now();
        await put(url, body, (b) => set(id, { state: "saving", frac: Math.min(0.99, b / enc), speed: netCongested() ? `${meter.label(b)} · connection busy, going gently` : meter.label(b) }), signal);
        await breather(performance.now() - t, signal);
        break;
      } catch (e) {
        if (e instanceof Gone || signal.aborted || attempt >= 8) throw e;
        if (String(e).includes("network")) netHiccup();
        // its link is signed for an hour: a long wait (a laptop asleep, a choked line) outlives it
        if (String(e).includes("upload 403")) expired = true;
        set(id, { state: "paused", frac: 0 });
        done(); // (nobody waits on a turn held by a paused upload)
        await backOnline(Math.min(30_000, 1000 * 2 ** attempt), signal);
      } finally {
        done();
      }
    }
  } finally {
    clearInterval(beat);
    watchNet(false);
  }
  await call(id, { owner, action: "saved" }).catch(() => null);
}

/**
 * A big file in parts, as many at a time as the line allows (lib/net.ts). Any break (offline, laptop asleep, links expired) pauses it;
 * then R2 is asked which parts it already has, and only the rest go up. It gives up only when the
 * object is gone (burnt or destroyed) or the user stops it.
 */
async function multi(
  id: string, owner: string, file: File, key: CryptoKey, nonce: Uint8Array, uploadId: string,
  todo: { n: number; url: string }[] | null, have: { n: number; etag: string }[] | null, ac: AbortController, rank: number,
  pc: number,
) {
  const PART_CHUNKS = pc;
  const call = (i: string, body: object) => callStore(i, body, pc);
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
  // parts of this file with a turn on the line right now, and lanes waiting for one (behind other uploads)
  let turns = 0;
  let queued = 0;
  const progress = () => {
    const done = base + [...sent.values()].reduce((a, b) => a + b, 0);
    const speed = paused ? undefined : !turns && queued ? "waiting its turn" : netCongested() ? `${meter.label(done)} · connection busy, going gently` : meter.label(done);
    set(id, { state: paused ? "paused" : "saving", frac: Math.min(0.99, done / enc), speed });
  };
  const sync = async () => {
    const r = await call(id, { owner, action: "resume", uploadId });
    if (r.status === 404 || r.status === 403) throw new Gone();
    if (!r.ok) throw new Error("resume");
    const d = (await r.json()) as { parts: number; done: { n: number; etag: string }[]; urls: { n: number; url: string }[] };
    have = d.done;
    todo = d.urls;
  };
  // the line's quiet level first (before the first byte), then watched while this runs
  await watchNet(true);
  // keeps the object in orbit while this runs, paused or not
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
        const worker = async () => {
          while (next < queue.length && !round.signal.aborted) {
            // a turn on the line first, shared with every other upload on this page (a choked line: one at a time)
            let done = tryAcquire("up");
            if (!done) {
              queued++;
              progress();
              try {
                done = await acquire("up", round.signal, rank);
              } finally {
                queued--;
              }
            }
            turns++;
            try {
              if (next >= queue.length) return;
              const p = queue[next++];
              for (let attempt = 1; ; attempt++) {
                try {
                  const body = await sealRange(file, key, nonce, (p.n - 1) * PART_CHUNKS, Math.min(total, p.n * PART_CHUNKS), total);
                  const t = performance.now();
                  const etag = await put(p.url, body, (b) => (sent.set(p.n, b), progress()), round.signal);
                  // R2 must expose ETag to the page (bucket CORS); without it the parts can't be put together
                  if (!etag) throw new Error("no etag");
                  etags.set(p.n, etag);
                  sent.set(p.n, partBytes(p.n));
                  paused = false;
                  progress();
                  // a busy line: keep the turn a while (half as long as this part took) so everything else drains
                  await breather(performance.now() - t, round.signal);
                  break;
                } catch (e) {
                  sent.delete(p.n);
                  if (round.signal.aborted) throw e;
                  // a dropped connection on a choked line: start again gently, not every lane at once
                  if (String(e).includes("network")) netHiccup();
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
            } finally {
              turns--;
              done();
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(LANES_UP, Math.max(1, queue.length)) }, () => worker()));
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

/** Waits for a copy that is still uploading, up to `ms` (false also once `stop()` says it isn't needed any more).
 *  Asked every second for the first 30 s (a small file's copy lands within a second or two of its launch), then every
 *  3 s. Each ask is one tiny ranged GET, free on R2. */
export async function waitStored(url: string, ms: number, signal?: AbortSignal, stop?: () => boolean) {
  const start = Date.now(), end = start + ms;
  while (Date.now() < end) {
    if (signal?.aborted || stop?.()) return false;
    if (await isStored(url, signal)) return true;
    await new Promise((r) => setTimeout(r, Date.now() - start < 30_000 ? 1000 : 3000));
  }
  return false;
}

const RANGE_CHUNKS = 2;
const PARALLEL_DOWN = 4;

/** The stored copy, if it is complete: its first range is read right away and IS the check (no separate tiny read
 *  first, one round trip less to R2 per download). null: not there (yet). The other lanes start the moment it is. */
export async function openStored(url: string, size: number, signal?: AbortSignal, lanes = PARALLEL_DOWN, edge?: string, onBytes?: (n: number) => void): Promise<ReadableStream<Uint8Array> | null> {
  const enc = size + storeChunks(size) * STORE_TAG;
  const to = Math.min(enc, RANGE_CHUNKS * (STORE_CHUNK + STORE_TAG)) - 1;
  const first = async (u: string) => {
    // an answer (its headers) within 12 s, or this way is given up: an edge that hung used to hold the download at 0%
    const ac = new AbortController();
    const stop = () => ac.abort();
    signal?.addEventListener("abort", stop, { once: true });
    const t = setTimeout(stop, 12_000);
    try {
      const r = await fetch(u, { headers: { Range: `bytes=0-${to}` }, cache: "no-store", signal: ac.signal }).catch(() => null);
      clearTimeout(t);
      if (!r) return { missing: false, b: null };
      // the bucket's 404, or the edge worker's own "not uploaded yet" (an edge without that mark isn't serving files)
      if (r.status === 404) return { missing: u === url || r.headers.get("X-Edge-Missing") === "1", b: null };
      if (r.status !== 206 && r.status !== 200) return { missing: false, b: null };
      const b = await readAll(r, to + 1, onBytes).catch(() => null);
      return { missing: false, b };
    } finally {
      clearTimeout(t);
      signal?.removeEventListener("abort", stop);
    }
  };
  // through Cloudflare's edge first (the location near the reader, cached there for the next one: live/ worker);
  // not stored yet there means not stored yet at all; any other trouble (the worker's allowance, a hiccup) falls
  // back to the bucket's own signed link
  if (edge) {
    const e = await first(edge);
    if (e.b) return fetchStored(edge, size, signal, lanes, e.b, onBytes);
    if (e.missing) return null;
  }
  const d = await first(url);
  return d.b ? fetchStored(url, size, signal, lanes, d.b, onBytes) : null;
}

/** A response body of exactly `len` bytes, read as it streams in (each piece counted by onBytes; a failed read takes
 *  its count back, so a retried range isn't counted twice). Short or long: an error. */
async function readAll(r: Response, len: number, onBytes?: (n: number) => void): Promise<Uint8Array> {
  if (!r.body) {
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.length !== len) throw new Error("short read");
    onBytes?.(len);
    return b;
  }
  const b = new Uint8Array(len);
  const rd = r.body.getReader();
  let at = 0;
  try {
    for (;;) {
      const { value, done } = await rd.read();
      if (done) break;
      if (at + value.length > len) throw new Error("long read");
      b.set(value, at);
      at += value.length;
      onBytes?.(value.length);
    }
    if (at !== len) throw new Error("short read");
    return b;
  } catch (e) {
    onBytes?.(-at);
    rd.cancel().catch(() => {});
    throw e;
  }
}

/** The stored ciphertext as a stream, fetched in parallel byte ranges (`lanes`; background previews take 1) and handed out in order. */
export function fetchStored(url: string, size: number, signal?: AbortSignal, lanes = PARALLEL_DOWN, first?: Uint8Array, onBytes?: (n: number) => void): ReadableStream<Uint8Array> {
  const chunks = storeChunks(size);
  const enc = size + chunks * STORE_TAG;
  const step = RANGE_CHUNKS * (STORE_CHUNK + STORE_TAG);
  const count = Math.ceil(enc / step);
  const pending = new Map<number, Promise<Uint8Array>>();
  let next = 0;
  let out = 0;
  const get = async (k: number) => {
    if (k === 0 && first) return first;
    const from = k * step;
    const to = Math.min(enc, from + step) - 1;
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await fetch(url, { headers: { Range: `bytes=${from}-${to}` }, cache: "no-store", signal });
        if (r.status !== 206 && !(r.status === 200 && from === 0 && to === enc - 1)) throw new Error(`Download failed (${r.status})`);
        return await readAll(r, to - from + 1, onBytes);
      } catch (e) {
        if (signal?.aborted || attempt >= 4) throw e;
        await new Promise((res) => setTimeout(res, 700 * attempt));
      }
    }
  };
  const fill = () => {
    while (next < count && pending.size < lanes) {
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
