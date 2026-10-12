import { createHash, createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "orbit_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;

// Signing key changes whenever the password hash changes, which logs out every session.
const key = () => createHash("sha256").update(`${process.env.ORBIT_SECRET}:${process.env.ADMIN_PASSWORD_HASH}`).digest();

export function verifyPassword(password: string) {
  const stored = process.env.ADMIN_PASSWORD_HASH ?? "";
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash || typeof password !== "string" || password.length > 200) return false;
  const expected = Buffer.from(hash, "base64");
  const got = scryptSync(password, Buffer.from(salt, "base64"), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(got, expected);
}

export function issueSession() {
  const exp = String(Date.now() + SESSION_MS);
  const sig = createHmac("sha256", key()).update(exp).digest("base64url");
  return { value: `${exp}.${sig}`, maxAge: SESSION_MS / 1000 };
}

export function isAdmin(req: NextRequest) {
  const raw = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!raw || !process.env.ADMIN_PASSWORD_HASH) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const want = createHmac("sha256", key()).update(exp).digest();
  const have = Buffer.from(sig, "base64url");
  return have.length === want.length && timingSafeEqual(have, want);
}
