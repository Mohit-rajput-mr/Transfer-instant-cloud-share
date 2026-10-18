import { NextRequest, NextResponse } from "next/server";
import { anonEventId, clean, rpc, validId } from "@/lib/server";

// Records that a device opened an object (counted once per device).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const anon = b.anon === true;
  await rpc("orbit_view", { p_id: id, p_device: anon ? anonEventId(id, clean(b.deviceId, 40)) : clean(b.deviceId, 40), p_label: anon ? "" : clean(b.device, 60) });
  return NextResponse.json({ ok: true });
}
