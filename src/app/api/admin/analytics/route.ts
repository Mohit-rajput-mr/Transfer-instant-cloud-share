import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// HQ Analytics (/admin/analytics): one row per UTC day (migration 032 orbit_admin_analytics).
// ?from=YYYY-MM-DD&to=YYYY-MM-DD&country=ES, all optional (default: from the first day on record to today).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
  const cc = q.get("country");
  try {
    const data = await rpc("orbit_admin_analytics", { p_from: day(q.get("from")), p_to: day(q.get("to")), p_country: cc && /^[A-Za-z]{2}$/.test(cc) ? cc.toUpperCase() : null });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const missing = /orbit_admin_analytics|PGRST202|404/.test(String(e));
    return NextResponse.json({ error: missing ? "setup" : "failed" }, { status: missing ? 501 : 502 });
  }
}
