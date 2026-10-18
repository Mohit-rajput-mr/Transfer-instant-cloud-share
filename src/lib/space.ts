"use client";
import { deviceId, homePath, persistentId } from "./client";
import { isAnon, newAnonId, setScopedAnon } from "./anon";
import { myArea } from "./where";

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
  // anonymous spaces (lib/anon.ts), local only: this device's id in it, the join code and the content key
  // (the key never reaches Orbi: it rides in the link's #fragment)
  anon?: true;
  anonId?: string;
  code?: string;
  key?: string;
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
  // an anonymous alias is never kept as your name
  if (!s.anon) await kvSet("handle", s.handle);
}
export async function forget(slug: string) {
  await kvSet("spaces", (await savedSpaces()).filter((x) => x.slug !== slug));
}
export const setCurrent = (slug: string | null) => kvSet("current", slug);

// ---- the active space, read by the transfer code ----
let active: SpaceSession | null = null;
export const setActiveSpace = (s: SpaceSession | null) => {
  active = s;
  setScopedAnon(s?.anon ? s.anonId ?? null : null);
};
/** the id a space knows this device by: its own throwaway one in an anonymous space */
const idFor = (s: SpaceSession) => (s.anon && s.anonId ? s.anonId : persistentId());
/** Fields every space-aware request carries. */
/** (and the area this device is in: what it posts in the public void belongs there, lib/area.ts; never while anonymous) */
export const spaceBody = () => ({
  ...(active ? { space: active.slug, spaceToken: active.token } : null),
  deviceId: deviceId(),
  ...(isAnon() ? { anon: true as const } : { area: myArea() || undefined }),
});
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
  post<SpaceSession>("/api/spaces", { title, handle, priv, pass, deviceId: persistentId() });
export const joinSpace = (slug: string, handle: string, pass?: string) =>
  post<SpaceSession>(`/api/spaces/${slug}/join`, { handle, pass, deviceId: persistentId() });
export type SpaceInfo = {
  title: string; priv: boolean; handle: string; chan: string; owner: boolean; members: { id: string; handle: string; you: boolean }[];
  anon?: boolean;
  /** anonymous spaces: when it and its member list are deleted (ms) */
  ends?: number | null;
};
export const enterSpace = (s: SpaceSession) => post<SpaceInfo>(`/api/spaces/${s.slug}/enter`, { deviceId: idFor(s), token: s.token, owner: s.owner });
export const kickMember = (s: SpaceSession, target: string) =>
  post(`/api/spaces/${s.slug}/kick`, { deviceId: idFor(s), token: s.token, owner: s.owner, target });
export const leaveSpace = (s: SpaceSession) => post(`/api/spaces/${s.slug}/leave`, { deviceId: idFor(s), token: s.token }).catch(() => null);

// ---- anonymous spaces: a random title, code and key; one link carries the code and the key ----
const AZ = "abcdefghijklmnopqrstuvwxyz0123456789";
const code12 = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => AZ[b % 36]).join("");
const key22 = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export async function createAnonSpace(): Promise<SpaceSession> {
  const anonId = newAnonId(), code = code12(), key = key22();
  const s = await post<SpaceSession>("/api/spaces", { anon: true, pass: code, deviceId: anonId });
  return { ...s, anon: true, anonId, code, key };
}
export async function joinAnonSpace(slug: string, code: string, key: string): Promise<SpaceSession> {
  const anonId = newAnonId();
  const s = await post<SpaceSession>(`/api/spaces/${slug}/join`, { anon: true, pass: code, deviceId: anonId });
  return { ...s, anon: true, anonId, code, key };
}
/** the only way in: the code and the key sit after the #, which browsers never send to a server */
export const anonLink = (s: SpaceSession) => `${location.origin}${homePath()}?space=${s.slug}#j=${s.code}&k=${s.key}`;
/** the key "open" files in the active anonymous space are encrypted with (instead of the well-known OPEN_PASS) */
export const spaceOpenPass = () => (active?.anon && active.key ? `orbit:space:${active.key}` : null);
/** the anonymous space's title from its slug, before anything is asked of the server */
export const anonTitle = (slug: string) => "Anonymous · " + slug.slice(5, 9).toUpperCase();
