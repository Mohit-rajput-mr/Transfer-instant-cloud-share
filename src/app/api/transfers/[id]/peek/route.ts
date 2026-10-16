import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { burnedUp, member, untag } from "@/lib/spaces";
import { objectKey, presign, r2On } from "@/lib/r2";

// Look inside without downloading: for no-password objects only (anyone can open those anyway), and never
// for an object with a download limit. Same answer as unlock, nothing counted, so a preview can be fetched
// ahead of time and be ready the moment it is asked for.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.auth, 64)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const raw = await rpc<{ name?: unknown; expiresAt?: unknown } | null>("orbit_get", { p_id: id });
  const info = raw ? untag(raw) : null;
  if (!info || burnedUp(info) || !info.open) return NextResponse.json({ ok: false, reason: "gone" }, { status: 403 });
  if (info.space && !(await member(info.space, b.deviceId, b.spaceToken))) return NextResponse.json({ ok: false, reason: "gone" }, { status: 403 });
  const r = await rpc<Record<string, unknown>>("orbit_peek", { p_id: id, p_auth_hash: sha256(b.auth) });
  if (r?.ok && r2On()) r.store = await presign("GET", objectKey(id), {}, 3 * 3600).catch(() => undefined);
  return NextResponse.json(r, { status: r?.ok ? 200 : 403 });
}
