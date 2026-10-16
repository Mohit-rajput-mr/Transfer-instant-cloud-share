import { createHash, randomBytes } from "node:crypto";
import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { abortAllUploads, objectKey, previewKey, removeObjects } from "./r2";

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

// Coarse "same network" fingerprint: salted hash of the public IP, never stored raw.
export function netHash(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0";
  return sha256(`${SECRET}:net:${ip}`).slice(0, 12);
}

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

export async function removeBlobs(urls: (string | null | undefined)[]) {
  // p2p:<id> objects may have an encrypted copy in R2 (deletes there are free; a missing one is fine)
  const ids = urls.filter((u): u is string => !!u && u.startsWith("p2p:")).map((u) => u.slice(4));
  await removeObjects(ids.flatMap((id) => [objectKey(id), previewKey(id)])).catch(() => {});
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
