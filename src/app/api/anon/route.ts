import { NextRequest, NextResponse } from "next/server";
import { anonSessKey, clean, geo, ipOf, rpc, validSid } from "@/lib/server";

export const dynamic = "force-dynamic";

// same as lib/anon.ts aliasOf (that module is client-only)
const aliasOf = (id: string) => `Anon-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

/** An anonymous session's record (migration 021): when it started, for how long, where from (the IP's rough area)
 *  and how it ended. Only the record stays, for the admin; the session's spaces and everything in them burn with it. */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || !validSid(b.sid)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const key = anonSessKey(b.sid);
  if (b.action === "start") {
    const min = Math.max(5, Math.min(30, Math.round(Number(b.min) || 30)));
    const g = geo(req);
    const ip = ipOf(req);
    await rpc("orbit_anon_session_start", {
      p_key: key,
      p: {
        alias: aliasOf(b.sid),
        min,
        tz: clean(b.tz, 64),
        offset: Number.isFinite(Number(b.offset)) ? Math.round(Number(b.offset)) : null,
        ip: ip === "0" ? "" : ip,
        country: g.country,
        city: g.city,
        lat: g.lat,
        lon: g.lon,
      },
    }).catch(() => {});
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
  if (b.action === "end") {
    const reason = b.reason === "timer" ? "timer" : "exit";
    await rpc("orbit_anon_session_end", { p_key: key, p_reason: reason }).catch(() => {});
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
