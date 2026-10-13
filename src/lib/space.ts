"use client";
import { deviceId } from "./client";

/** This device's pass into a space. Kept in IndexedDB so it is never set up twice. */
export interface SpaceSession {
  slug: string;
  title: string;
  priv: boolean;
  handle: string;
  token: string;
  chan: string;
  /** only on the creator's device */
  owner?: string;
}

// ---- tiny IndexedDB key/value (localStorage fallback when IDB is blocked) ----
const DB = "orbit", STORE = "kv";
let dbp: Promise<IDBDatabase | null> | null = null;
const db = () =>
  (dbp ??= new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  }));

async function kvGet<T>(k: string): Promise<T | null> {
  const d = await db();
  if (!d) {
    try {
      const v = localStorage.getItem(`orbit:kv:${k}`);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  }
  return new Promise((res) => {
    const r = d.transaction(STORE).objectStore(STORE).get(k);
    r.onsuccess = () => res((r.result as T) ?? null);
    r.onerror = () => res(null);
  });
}
async function kvSet(k: string, v: unknown) {
  const d = await db();
  if (!d) {
    try {
      localStorage.setItem(`orbit:kv:${k}`, JSON.stringify(v));
    } catch {}
    return;
  }
  await new Promise<void>((res) => {
    const t = d.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(v, k);
    t.oncomplete = () => res();
    t.onerror = () => res();
  });
}

export const savedSpaces = async () => (await kvGet<SpaceSession[]>("spaces")) ?? [];
export const lastSpace = () => kvGet<string>("current");
export const savedHandle = async () => (await kvGet<string>("handle")) ?? "";
export async function remember(s: SpaceSession) {
  const list = (await savedSpaces()).filter((x) => x.slug !== s.slug);
  await kvSet("spaces", [s, ...list].slice(0, 20));
  await kvSet("handle", s.handle);
}
export async function forget(slug: string) {
  await kvSet("spaces", (await savedSpaces()).filter((x) => x.slug !== slug));
}
export const setCurrent = (slug: string | null) => kvSet("current", slug);

// ---- the active space, read by the transfer code ----
let active: SpaceSession | null = null;
export const setActiveSpace = (s: SpaceSession | null) => {
  active = s;
};
/** Fields every space-aware request carries. */
export const spaceBody = () => (active ? { space: active.slug, spaceToken: active.token, deviceId: deviceId() } : { deviceId: deviceId() });
export const spaceHeaders = (): Record<string, string> => (active ? { "x-device": deviceId(), "x-space-token": active.token } : {});

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error ?? "Something went wrong"), { status: r.status, needPass: !!d.needPass });
  return d as T;
}

export type SpaceHit = { slug: string; title: string; priv: boolean };
export const searchSpaces = async (q: string) =>
  ((await (await fetch(`/api/spaces?q=${encodeURIComponent(q)}`)).json().catch(() => ({ items: [] }))) as { items: SpaceHit[] }).items ?? [];
export const createSpace = (title: string, handle: string, priv: boolean, pass: string) =>
  post<SpaceSession>("/api/spaces", { title, handle, priv, pass, deviceId: deviceId() });
export const joinSpace = (slug: string, handle: string, pass?: string) =>
  post<SpaceSession>(`/api/spaces/${slug}/join`, { handle, pass, deviceId: deviceId() });
export type SpaceInfo = { title: string; priv: boolean; handle: string; chan: string; owner: boolean; members: { id: string; handle: string; you: boolean }[] };
export const enterSpace = (s: SpaceSession) => post<SpaceInfo>(`/api/spaces/${s.slug}/enter`, { deviceId: deviceId(), token: s.token, owner: s.owner });
export const kickMember = (s: SpaceSession, target: string) =>
  post(`/api/spaces/${s.slug}/kick`, { deviceId: deviceId(), token: s.token, owner: s.owner, target });
export const leaveSpace = (s: SpaceSession) => post(`/api/spaces/${s.slug}/leave`, { deviceId: deviceId(), token: s.token }).catch(() => null);
