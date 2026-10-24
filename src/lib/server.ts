import { createHash, randomBytes } from "node:crypto";
import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { abortAllUploads, objectKey, previewKey, removeObjects, ticketKey } from "./r2";
import { areaOf, validArea } from "./area";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SECRET = process.env.ORBIT_SECRET!;

export const LIFETIME_MIN = 30;

// Every database call goes through SECURITY DEFINER functions gated by ORBIT_SECRET.
export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_secret: SECRET, ...args }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`rpc ${fn} failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function newId(len = 6) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function randomHex(n: number) {
  return randomBytes(n).toString("hex");
}

export const ipOf = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0";

// Coarse "same network" fingerprint: salted hash of the public IP, never stored raw.
export function netHash(req: NextRequest) {
  return sha256(`${SECRET}:net:${ipOf(req)}`).slice(0, 12);
}

/** A key only devices on the same network get (never broadcast, unlike netHash): seals invites to a private space. */
export function netInviteKey(req: NextRequest) {
  return sha256(`${SECRET}:invite:${ipOf(req)}`).slice(0, 32);
}

// ---- anonymous requests (lib/anon.ts): nothing here links one request to another for long, or to netHash ----
/** anonymous requests: a rate-limit key that changes every hour and never equals netHash */
export const anonNet = (req: NextRequest) => sha256(`${SECRET}:anon:${new Date().toISOString().slice(0, 13)}:${ipOf(req)}`).slice(0, 12);
/** a stand-in device id for one object: dedupes views/downloads on it, links nothing across objects */
export const anonEventId = (id: string, device: string) => "a" + sha256(`${SECRET}:ev:${id}:${device}`).slice(0, 15);
/** reports: one per network per object per day, whatever ids it makes up */
export const anonReportId = (id: string, req: NextRequest) => "r" + sha256(`${SECRET}:rep:${new Date().toISOString().slice(0, 10)}:${id}:${ipOf(req)}`).slice(0, 15);
/** anonymous heartbeats are counted under this, never the id the browser sent */
export const anonOnlineId = (id: string) => sha256(`${SECRET}:online:${id}`).slice(0, 24);
/** where an anonymous session's record is filed: the client only ever holds the raw (secret) session id */
export const anonSessKey = (sid: string) => sha256(`${SECRET}:anon-sess:${sid}`).slice(0, 32);
export const validSid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);
/** where anonymous space rows are filed: never a geohash (it has a, o), so never in a public list */
export const ANON_AREA = "anon";

export interface Geo {
  country: string;
  region: string;
  city: string;
  lat: string;
  lon: string;
}

// Coarse location from Vercel's edge headers. Coordinates rounded to ~1 km; raw IPs are never stored.
export function geo(req: NextRequest): Geo {
  const h = (k: string) => req.headers.get(k) ?? "";
  const num = (v: string) => (v && Number.isFinite(Number(v)) ? String(Math.round(Number(v) * 100) / 100) : "");
  let city = h("x-vercel-ip-city");
  try {
    city = decodeURIComponent(city);
  } catch {}
  return {
    country: clean(h("x-vercel-ip-country"), 2),
    region: clean(h("x-vercel-ip-country-region"), 8),
    city: clean(city, 60),
    lat: num(h("x-vercel-ip-latitude")),
    lon: num(h("x-vercel-ip-longitude")),
  };
}

/** The area something posted belongs to: the one the device sent (from its location), else the one its IP is in. */
export function areaFor(req: NextRequest, given: unknown) {
  if (validArea(given)) return given;
  const g = geo(req);
  return g.lat && g.lon ? areaOf(Number(g.lat), Number(g.lon)) : "";
}
/** `?a=` on a list request: up to nine cells (yours and the ones around it) */
export const areasParam = (v: string | null) => {
  const list = (v ?? "").split(",").filter(validArea).slice(0, 9);
  return list.length ? list : null;
};

export async function removeBlobs(urls: (string | null | undefined)[]) {
  // p2p:<id> objects may have an encrypted copy in R2 (deletes there are free; a missing one is fine)
  // also "p2p/<id>": a row removed before finalize (an anonymous send uploads its cloud copy first) only has its pathname
  const ids = urls.flatMap((u) => (u && (u.startsWith("p2p:") || u.startsWith("p2p/")) && validId(u.slice(4)) ? [u.slice(4)] : []));
  // (its edge ticket too: the worker then serves it to nobody, even from a location that still has it cached)
  await removeObjects(ids.flatMap((id) => [objectKey(id), previewKey(id), ticketKey(id)])).catch(() => {});
  // and the parts of a big upload that never finished
  await Promise.all(ids.map((id) => abortAllUploads(objectKey(id)).catch(() => {})));
  const list = urls.filter((u): u is string => !!u && u.startsWith("https://"));
  if (!list.length) return;
  try {
    await del(list);
  } catch (e) {
    console.error("blob delete failed", e);
  }
}

let lastReap = 0;
// Lazy garbage collection: piggybacks on regular traffic, at most every 30s per instance.
export async function reap(force = false) {
  const now = Date.now();
  if (!force && now - lastReap < 30_000) return 0;
  lastReap = now;
  try {
    const gone = await rpc<string[]>("orbit_reap", {});
    // anonymous spaces, their notes and tasks, stale anonymous heartbeats (migration 020)
    rpc("orbit_reap_anon", {}).catch(() => {});
    // anonymous sessions whose time ran out with nobody there (tab closed): they burn now (migration 021)
    rpc("orbit_anon_sessions_sweep", {}).catch(() => {});
    await removeBlobs(gone ?? []);
    return gone?.length ?? 0;
  } catch (e) {
    console.error("reap failed", e);
    return 0;
  }
}

export const isHex = (s: unknown, len: number): s is string =>
  typeof s === "string" && s.length === len && /^[0-9a-f]+$/.test(s);

export const isB64 = (s: unknown, max = 64): s is string =>
  typeof s === "string" && s.length > 0 && s.length <= max && /^[A-Za-z0-9+/=_-]+$/.test(s);

export const validId = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9]{4,12}$/.test(s);

export function clean(s: unknown, max: number) {
  if (typeof s !== "string") return "";
  return s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}
