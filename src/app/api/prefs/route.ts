import { createHmac, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/server";
import { validPalette, validSkin } from "@/lib/skin-list";

export const dynamic = "force-dynamic";

// Look preferences without accounts (supabase/migrations/006_prefs.sql).
//  - "this computer": only when the visitor turns it on. The key is a keyed hash of the network address
//    plus a few traits every browser on one computer shares (screen, time zone, platform, cores, touch),
//    so the raw values are never stored. Another browser on the same computer finds the same key.
//  - style codes: ORBI-XXXXXX, for any browser or device.
// Only the look is stored ({ skin, pal }), nothing about the person.
const key = (s: string) => createHmac("sha256", process.env.ORBIT_SECRET!).update(s).digest("hex").slice(0, 40);
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function deviceKey(req: NextRequest, t: unknown) {
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 0);
  let ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  if (!ip) return null;
  // IPv6: the /64 a home or office gets, not the per-device suffix that rotates
  if (ip.includes(":")) ip = ip.split(":").slice(0, 4).join(":");
  return key(`pref:dev:${ip}|${str(o.screen, 20)}|${str(o.tz, 40)}|${str(o.platform, 30)}|${num(o.cores)}|${num(o.touch)}`);
}
const prefsOf = (p: unknown) => {
  const o = p as { skin?: unknown; pal?: unknown } | null;
  if (!validSkin(o?.skin)) return null;
  return validPalette(o?.pal) ? { skin: o.skin, pal: o.pal } : { skin: o.skin };
};

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const no = { headers: { "Cache-Control": "no-store" } };
  try {
    switch (b.action) {
      case "save": {
        const k = deviceKey(req, b.traits), p = prefsOf(b.prefs);
        if (!k || !p) return NextResponse.json({ error: "bad request" }, { status: 400 });
        await rpc("orbit_pref_set", { p_key: k, p_prefs: p });
        return NextResponse.json({ ok: true }, no);
      }
      case "forget": {
        const k = deviceKey(req, b.traits);
        if (k) await rpc("orbit_pref_set", { p_key: k, p_prefs: null });
        return NextResponse.json({ ok: true }, no);
      }
      case "find": {
        const k = deviceKey(req, b.traits);
        const prefs = k ? prefsOf(await rpc<unknown>("orbit_pref_get", { p_key: k })) : null;
        return NextResponse.json({ prefs }, no);
      }
      case "code": {
        const p = prefsOf(b.prefs);
        if (!p) return NextResponse.json({ error: "bad request" }, { status: 400 });
        const code = "ORBI-" + Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
        await rpc("orbit_pref_set", { p_key: key(`pref:code:${code}`), p_prefs: p });
        return NextResponse.json({ code }, no);
      }
      case "redeem": {
        const code = typeof b.code === "string" ? b.code.trim().toUpperCase().replace(/^(ORBI-?)?/, "ORBI-") : "";
        if (!/^ORBI-[A-Z2-9]{6}$/.test(code)) return NextResponse.json({ prefs: null }, no);
        const prefs = prefsOf(await rpc<unknown>("orbit_pref_get", { p_key: key(`pref:code:${code}`) }));
        return NextResponse.json({ prefs }, no);
      }
    }
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
