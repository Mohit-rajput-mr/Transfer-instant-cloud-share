import { NextRequest, NextResponse } from "next/server";
import { clean, geo, netHash, rpc, validId } from "@/lib/server";

export const dynamic = "force-dynamic";

// Heartbeat: one small upsert per device every ~25s. Powers "online", live viewers and the admin globe.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const deviceId = clean(b?.deviceId, 40);
  if (!deviceId) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const net = netHash(req);
  await rpc("orbit_pulse", {
    p: {
      deviceId,
      viewing: validId(b.viewing) ? b.viewing : "",
      label: clean(b.label, 60),
      browser: clean(b.browser, 20),
      os: clean(b.os, 20),
      form: clean(b.form, 10),
      net,
      ...geo(req),
    },
  });
  return NextResponse.json({ net }, { headers: { "Cache-Control": "no-store" } });
}
