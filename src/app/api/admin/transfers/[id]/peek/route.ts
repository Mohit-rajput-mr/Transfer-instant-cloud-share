import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { burnedUp, untag } from "@/lib/spaces";
import { objectKey, presign, r2On } from "@/lib/r2";

export const dynamic = "force-dynamic";

// HQ preview (migration 033). GET: what the admin's browser needs to work out the key. POST {auth}: the passcode
// proof is checked and a signed link to the stored (still encrypted) copy comes back. The file is decrypted in the
// admin's browser only. Nothing is counted, and a wrong passcode never locks the object for its receivers.
type Meta = { ok: boolean; reason?: string; name?: string; salt?: string; iterations?: number; expiresAt?: string };

const no = (reason: string, status = 403) => NextResponse.json({ ok: false, reason }, { status });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return no("unauthorized", 401);
  const { id } = await params;
  if (!validId(id)) return no("bad id", 400);
  const m = await rpc<Meta>("orbit_admin_peek", { p_id: id, p_auth_hash: null });
  if (!m?.ok) return no(m?.reason ?? "gone", 404);
  const t = untag(m);
  if (burnedUp(t)) return no("gone", 404);
  return NextResponse.json({ ok: true, salt: t.salt, iterations: t.iterations, open: t.open, anon: t.anon }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return no("unauthorized", 401);
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.auth, 64)) return no("bad request", 400);
  const r = await rpc<Record<string, unknown>>("orbit_admin_peek", { p_id: id, p_auth_hash: sha256(b.auth) });
  if (!r?.ok) return NextResponse.json(r ?? { ok: false, reason: "gone" }, { status: 403 });
  // only the stored copy: a device-only object would need a live connection to the sender
  r.store = r2On() ? await presign("GET", objectKey(id), {}, 3600).catch(() => undefined) : undefined;
  return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
}
