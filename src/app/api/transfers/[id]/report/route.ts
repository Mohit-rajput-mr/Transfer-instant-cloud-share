import { NextRequest, NextResponse } from "next/server";
import { anonReportId, clean, rpc, validId } from "@/lib/server";

// Anyone can flag an object; it is removed once enough distinct devices report it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b) return NextResponse.json({ error: "bad request" }, { status: 400 });
  // anonymous: one report per network per object per day, whatever ids it makes up
  const anon = b.anon === true;
  const r = await rpc("orbit_report", { p_id: id, p_device: anon ? anonReportId(id, req) : clean(b.deviceId, 40), p_label: anon ? "" : clean(b.device, 60) });
  return NextResponse.json(r);
}
