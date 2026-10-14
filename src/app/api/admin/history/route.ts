import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// HQ History: permanent totals, routes and events for any date range (supabase/migrations/003_history.sql).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const date = (s: string | null) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null);
  try {
    const data = await rpc("orbit_admin_history", { p_from: date(q.get("from")), p_to: date(q.get("to")) });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // the SQL in 003_history.sql hasn't been run yet
    const missing = /orbit_admin_history|PGRST202|404/.test(String(e));
    return NextResponse.json({ error: missing ? "setup" : "failed" }, { status: missing ? 501 : 502 });
  }
}
