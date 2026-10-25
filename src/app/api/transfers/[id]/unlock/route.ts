import { NextRequest, NextResponse } from "next/server";
import { anonEventId, clean, geo, isHex, rpc, sha256, validId } from "@/lib/server";
import { burnedUp, member, untag } from "@/lib/spaces";
import { objectKey, presign, r2On } from "@/lib/r2";
import { edgeLink } from "@/lib/edge";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.auth, 64)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const raw = await rpc<{ name?: unknown; expiresAt?: unknown } | null>("orbit_get", { p_id: id });
  const info = raw ? untag(raw) : null;
  if (info && burnedUp(info)) return NextResponse.json({ ok: false, reason: "gone" }, { status: 403 });
  if (info?.space && !(await member(info.space, b.deviceId, b.spaceToken))) return NextResponse.json({ ok: false, reason: "gone" }, { status: 403 });
  // anonymous receiver, or an anonymous object: counted, never located or linked to other objects
  const anon = b.anon === true || !!info?.anon;
  // checks the passcode only: the download is counted when the file has arrived (../received, migration 031)
  const r = await rpc<Record<string, unknown>>("orbit_unlock_check", {
    p_id: id,
    p_auth_hash: sha256(b.auth),
    p_device: anon ? anonEventId(id, clean(b.deviceId, 40)) : clean(b.deviceId, 40),
    p_label: anon ? "" : clean(b.device, 60),
    p_geo: anon ? {} : geo(req),
  });
  // a signed link to the stored copy (it may still be uploading: the receiver checks before using it)
  if (r?.ok && r2On()) {
    // and the same copy through Cloudflare's edge, near the reader (lib/edge.ts); the signed link stays the fallback
    const store = await presign("GET", objectKey(id), {}, 3 * 3600).catch(() => undefined);
    const edge = edgeLink(id);
    r.store = store;
    if (edge) r.edge = edge;
  }
  return NextResponse.json(r, { status: r?.ok ? 200 : 403 });
}
