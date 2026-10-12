import { NextRequest, NextResponse } from "next/server";
import { clean, geo, isHex, rpc, sha256, validId } from "@/lib/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.auth, 64)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const r = await rpc<Record<string, unknown>>("orbit_unlock", {
    p_id: id,
    p_auth_hash: sha256(b.auth),
    p_device: clean(b.deviceId, 40),
    p_label: clean(b.device, 60),
    p_geo: geo(req),
  });
  return NextResponse.json(r, { status: r?.ok ? 200 : 403 });
}
