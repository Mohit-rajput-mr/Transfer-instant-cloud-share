import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { rpc } from "@/lib/server";
import { untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [data, cloud, anon, anonSessions] = await Promise.all([
    rpc<{ transfers?: { name?: unknown; expiresAt?: unknown }[]; cloud?: unknown; anon?: unknown; anonSessions?: unknown }>("orbit_admin_overview", {}),
    rpc("orbit_cloud_now", {}).catch(() => null),
    // where "Stay anonymous" was used, with the IPs (migration 020)
    rpc("orbit_admin_anon", {}).catch(() => []),
    // each anonymous session: alias, start / end (UTC + the device's time zone), how it ended (migration 021)
    rpc("orbit_admin_anon_sessions", {}).catch(() => []),
  ]);
  if (data) {
    data.cloud = cloud;
    data.anon = anon;
    data.anonSessions = anonSessions;
  }
  // names carry space / lifetime / open tags: HQ sees them split out
  if (data?.transfers) data.transfers = data.transfers.map(untag);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
