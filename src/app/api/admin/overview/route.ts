import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { rpc } from "@/lib/server";
import { untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // ?since=<time>: every number, list and globe layer only from that moment on (migration 030)
  const raw = req.nextUrl.searchParams.get("since");
  const since = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw).toISOString() : null;
  const [data, cloud, anon, anonSessions] = await Promise.all([
    since
      ? rpc<{ transfers?: { name?: unknown; expiresAt?: unknown }[]; cloud?: unknown; anon?: unknown; anonSessions?: unknown }>("orbit_admin_overview_since", { p_since: since })
      : rpc<{ transfers?: { name?: unknown; expiresAt?: unknown }[]; cloud?: unknown; anon?: unknown; anonSessions?: unknown }>("orbit_admin_overview", {}),
    rpc("orbit_cloud_now", {}).catch(() => null),
    // where "Stay anonymous" was used, with the IPs (migration 020)
    rpc("orbit_admin_anon", {}).catch(() => []),
    // each anonymous session: alias, start / end (UTC + the device's time zone), how it ended (migration 021)
    rpc("orbit_admin_anon_sessions", {}).catch(() => []),
  ]);
  const after = (v: unknown) => !since || (typeof v === "string" && Date.parse(v) >= Date.parse(since));
  if (data) {
    data.cloud = cloud;
    data.anon = since && Array.isArray(anon) ? anon.filter((a: { last?: unknown }) => after(a.last)) : anon;
    data.anonSessions = since && Array.isArray(anonSessions) ? anonSessions.filter((a: { start?: unknown; ended?: unknown }) => after(a.start) || after(a.ended) || a.ended === null) : anonSessions;
  }
  // names carry space / lifetime / open tags: HQ sees them split out
  if (data?.transfers) data.transfers = data.transfers.map(untag);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
