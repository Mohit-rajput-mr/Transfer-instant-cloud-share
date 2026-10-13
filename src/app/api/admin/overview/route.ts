import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { rpc } from "@/lib/server";
import { untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await rpc<{ transfers?: { name?: unknown; expiresAt?: unknown }[] }>("orbit_admin_overview", {});
  // names carry space / lifetime / open tags: HQ sees them split out
  if (data?.transfers) data.transfers = data.transfers.map(untag);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
