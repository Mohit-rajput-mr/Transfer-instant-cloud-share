"use client";
// Visible = downloadable (owner 2026-10-25). An object only appears on other people's screens once its encrypted
// copy is saved online, so whoever sees it can get it, whether or not the sender's page is still open. Until then it
// waits here: the file itself (encrypted copy not yet saved) is kept in this browser (IndexedDB), so if the sender
// closes the tab, switches apps or the phone sleeps, the next time Orbi opens in this browser the upload starts again
// by itself and the object appears when it is done. Nothing has to be picked again.
import { copying, storeCopy } from "./cloud";
import { CHUNK } from "./crypto";
import { hold } from "./p2p";
import { deviceId, dropOwnerKey, type Orb } from "./client";

/** files up to this size are kept in the browser for a restart; bigger ones resume through the multipart record
 *  (cloud.ts remember: pick the same file again) */
export const KEEP_MAX = 500 * 1024 * 1024;

export type Pending = { id: string; owner: string; url: string; file: File; key: CryptoKey; nonce: Uint8Array; label: string; life: number; at: number };
const DB = "orbit-outbox";
const idb = () =>
  new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("launch", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb();
  return new Promise<T>((res, rej) => {
    const t = db.transaction("launch", mode);
    const q = fn(t.objectStore("launch"));
    t.oncomplete = () => res(q.result);
    t.onerror = () => rej(t.error);
  });
}
export const keep = (p: Pending) => tx("readwrite", (s) => s.put(p)).then(() => true, () => false);
export const unkeep = (id: string) => tx("readwrite", (s) => s.delete(id)).catch(() => {});
const kept = () => tx<Pending[]>("readonly", (s) => s.getAll() as IDBRequest<Pending[]>).catch(() => [] as Pending[]);

/** make it visible: the object is placed in orbit (status ready) and this page also serves it directly */
export async function publish(p: Omit<Pending, "at">): Promise<Orb> {
  const fin = await fetch(`/api/transfers/${p.id}/finalize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner: p.owner, url: p.url, deviceId: deviceId() }) });
  if (!fin.ok) throw new Error("Could not place the object in orbit");
  hold(p.id, p.file, p.key, p.nonce, CHUNK, p.life * 60_000 + 60_000);
  void unkeep(p.id);
  return (await fin.json()) as Orb;
}

let running = false;
/** Opened again: finish every upload a closed page left behind, then show those objects. */
export async function resumeOutbox(onDone?: () => void) {
  if (running || typeof indexedDB === "undefined") return;
  running = true;
  try {
    for (const p of await kept()) {
      // (this page's own launch still uploading it: "back online" mid-send must not start a second upload)
      if (copying(p.id)) continue;
      // still in orbit? (asking also keeps it alive while it uploads)
      const r = await fetch(`/api/transfers/${p.id}/store`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner: p.owner, action: "alive" }) }).catch(() => null);
      const alive = r?.ok ? (await r.json().catch(() => null))?.ok !== false : !r;
      if (!alive) {
        await unkeep(p.id);
        dropOwnerKey(p.id);
        continue;
      }
      if (!r) continue; // offline: next time
      const saved = await storeCopy(p.id, p.owner, p.file, p.key, p.nonce, p.label, false);
      if (saved) {
        await publish(p).catch(() => {});
        onDone?.();
      }
    }
  } finally {
    running = false;
  }
}
