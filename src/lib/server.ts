import { createHash, randomBytes } from "node:crypto";
import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";

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

export async function removeBlobs(urls: (string | null | undefined)[]) {
  const list = urls.filter((u): u is string => !!u);
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
