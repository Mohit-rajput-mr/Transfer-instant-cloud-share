import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { accountOf, userOf } from "@/lib/account";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// The account vault (migration 037, lib/vault.ts): sealed here with a key per user, so the database never holds it in
// the clear. GET → the merged state every device of this account wrote; PUT → this device's merged state.
const MAX = 512 * 1024;
const keyFor = (uid: string) => createHash("sha256").update(`${process.env.ORBIT_SECRET}:vault:${uid}`).digest();
function seal(uid: string, text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyFor(uid), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64");
}
function unseal(uid: string, b64: string) {
  try {
    const raw = Buffer.from(b64, "base64");
    const d = createDecipheriv("aes-256-gcm", keyFor(uid), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await userOf(req);
  if (!user) return NextResponse.json({ error: "signed out" }, { status: 401 });
  await accountOf(user); // (creates the account row on first sight)
  const sealed = await rpc<string | null>("orbit_vault_get", { p_user: user.id });
  const text = sealed ? unseal(user.id, sealed) : null;
  return new NextResponse(text ?? "{}", { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export async function PUT(req: NextRequest) {
  const user = await userOf(req);
  if (!user) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const text = await req.text();
  if (text.length > MAX) return NextResponse.json({ error: "too big" }, { status: 413 });
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error();
  } catch {
    return NextResponse.json({ error: "bad vault" }, { status: 400 });
  }
  await accountOf(user);
  await rpc("orbit_vault_put", { p_user: user.id, p_vault: seal(user.id, text) });
  return NextResponse.json({ ok: true });
}
