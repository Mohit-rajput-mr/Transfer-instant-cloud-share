import { NextRequest, NextResponse } from "next/server";
import { anonEventId, clean, geo, isHex, rpc, sha256, validId } from "@/lib/server";

// The receiver's page has the whole file: this is when it counts as a download (unlock only checks the passcode,
// migration 031). Needs the same passcode proof as unlock, so a count can't be faked without it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.auth, 64)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const anon = b.anon === true;
  const r = await rpc<Record<string, unknown>>("orbit_received", {
    p_id: id,
    p_auth_hash: sha256(b.auth),
    p_device: anon ? anonEventId(id, clean(b.deviceId, 40)) : clean(b.deviceId, 40),
    p_label: anon ? "" : clean(b.device, 60),
    p_geo: anon ? {} : geo(req),
  });
  return NextResponse.json(r ?? { ok: false }, { status: r?.ok ? 200 : 403 });
}
