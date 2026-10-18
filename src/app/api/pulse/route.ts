import { NextRequest, NextResponse } from "next/server";
import { anonOnlineId, areaFor, clean, geo, ipOf, netHash, netInviteKey, rpc, validId } from "@/lib/server";

export const dynamic = "force-dynamic";

// Heartbeat: one small upsert per device every ~25s. Powers "online", live viewers and the admin globe.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  // turning anonymous on: this browser's heartbeat row goes (label, browser, network hash, IP place, last GPS spot)
  if (b?.forget === true) {
    const d = clean(b.deviceId, 40);
    if (d) await rpc("orbit_session_forget", { p_device: d }).catch(() => {});
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
  // anonymous heartbeat: counted as online under a hashed throwaway id; other users get nothing. The IP and its rough
  // area are kept for the admin only (abuse and legal requests, 90 days: migration 020, privacy page)
  if (b?.anon === true) {
    const id = clean(b.id, 40);
    if (!/^[A-Za-z0-9-]{8,40}$/.test(id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
    const g = geo(req);
    const ip = ipOf(req);
    await rpc("orbit_pulse_anon", { p_id: anonOnlineId(id), p_ip: ip === "0" ? "" : ip, p_geo: { country: g.country, city: g.city, lat: g.lat, lon: g.lon } }).catch(() => {});
    // the IP's area for this answer too (to look around the public void)
    return NextResponse.json(b.void === true ? { area: areaFor(req, null) } : {}, { headers: { "Cache-Control": "no-store" } });
  }
  const deviceId = clean(b?.deviceId, 40);
  if (!deviceId) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const net = netHash(req);
  // location shared on the device: its exact spot (for Orbit's own live map) instead of the IP's guess
  const lat = Number(b.lat), lon = Number(b.lon), acc = Number(b.acc);
  const precise = b.precise === true && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
  const exact = precise
    ? { lat: lat.toFixed(5), lon: lon.toFixed(5), acc: Number.isFinite(acc) && acc >= 0 ? String(Math.min(Math.round(acc), 100_000)) : "", precise: true }
    : {};
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
      ...exact,
    },
  });
  // the area this device's IP is in: where it lives in the void until it shares its location
  return NextResponse.json({ net, invite: netInviteKey(req), area: areaFor(req, null) }, { headers: { "Cache-Control": "no-store" } });
}
