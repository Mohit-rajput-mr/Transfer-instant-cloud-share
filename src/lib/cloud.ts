"use client";
// The stored copy (Cloudflare R2). Right after a launch the sender's browser encrypts the file again,
// chunk by chunk in the same format as the direct transfer, and uploads it in parallel parts through
// signed URLs. Once it is saved the sender may close the page: receivers fetch it from R2 instead, in
// parallel byte ranges. Until then the direct (peer-to-peer) path serves it, so nothing waits on this.
import { useSyncExternalStore } from "react";
import { encryptChunk } from "./crypto";
import { PART_CHUNKS, STORE_CHUNK, STORE_TAG, storeChunks } from "./limits";

export type CloudState = { state: "saving" | "saved" | "failed"; frac: number };
const states = new Map<string, CloudState>();
const aborts = new Map<string, AbortController>();
const subs = new Set<() => void>();
let snap = new Map(states);
const set = (id: string, s: CloudState | null) => {
  if (s) states.set(id, s);
  else states.delete(id);
  snap = new Map(states);
  subs.forEach((f) => f());
};

export const cloudSaved = (id: string) => states.get(id)?.state === "saved";
export const cloudSaving = () => [...states.values()].some((s) => s.state === "saving");
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
const TRIES = 4;

/** PUT one part with progress; resolves to its ETag. */
function put(url: string, body: Blob, onSent: (n: number) => void, signal: AbortSignal) {
  return new Promise<string>((res, rej) => {
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

/** Uploads the encrypted copy. Never throws: on any failure the direct path still serves the file. */
export async function storeCopy(id: string, owner: string, file: File, key: CryptoKey, nonce: Uint8Array) {
  const ac = new AbortController();
  aborts.set(id, ac);
  const total = storeChunks(file.size);
  const sent = new Map<number, number>();
  const encTotal = file.size + total * STORE_TAG;
  const progress = () => set(id, { state: "saving", frac: Math.min(0.99, [...sent.values()].reduce((a, b) => a + b, 0) / encTotal) });
  let uploadId: string | null = null;
  try {
    set(id, { state: "saving", frac: 0 });
    // can this page reach the bucket at all (its CORS rule)? If not, don't send a byte: the direct path serves it
    const pr = await call(id, { owner, action: "start", probe: true });
    if (!pr.ok) {
      set(id, pr.status === 501 ? null : { state: "failed", frac: 0 });
      return;
    }
    const { probe } = (await pr.json()) as { probe: string };
    const reach = await fetch(probe, { headers: { Range: "bytes=0-0" }, cache: "no-store", signal: ac.signal }).catch(() => null);
    if (!reach) {
      set(id, null);
      return;
    }
    const r = await call(id, { owner, action: "start" });
    if (!r.ok) {
      set(id, r.status === 501 ? null : { state: "failed", frac: 0 });
      return;
    }
    const s = (await r.json()) as { put?: string; uploadId?: string; urls?: string[] };
    const tryPut = async (url: string, n: number, from: number, to: number) => {
      for (let attempt = 1; ; attempt++) {
        try {
          const body = await sealRange(file, key, nonce, from, to, total);
          return await put(url, body, (b) => ((sent.set(n, b), progress())), ac.signal);
        } catch (e) {
          if (ac.signal.aborted || attempt >= TRIES) throw e;
          sent.set(n, 0);
          await new Promise((res) => setTimeout(res, 800 * attempt));
        }
      }
    };
    if (s.put) {
      await tryPut(s.put, 0, 0, total);
    } else if (s.uploadId && s.urls) {
      uploadId = s.uploadId;
      const urls = s.urls;
      const etags: string[] = new Array(urls.length);
      let next = 0;
      const worker = async () => {
        while (next < urls.length) {
          const p = next++;
          const etag = await tryPut(urls[p], p, p * PART_CHUNKS, Math.min(total, (p + 1) * PART_CHUNKS));
          // R2 must expose ETag to the page (bucket CORS); without it the parts can't be put together
          if (!etag) throw new Error("no etag");
          etags[p] = etag;
        }
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL_UP, urls.length) }, worker));
      const c = await call(id, { owner, action: "complete", uploadId, etags });
      if (!c.ok) throw new Error("complete");
    } else throw new Error("start");
    set(id, { state: "saved", frac: 1 });
  } catch {
    if (uploadId) call(id, { owner, action: "abort", uploadId }).catch(() => {});
    set(id, ac.signal.aborted ? null : { state: "failed", frac: 0 });
  } finally {
    aborts.delete(id);
  }
}

/** Stop uploading (the ball was destroyed or burnt). */
export function stopCopy(id: string) {
  aborts.get(id)?.abort();
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
