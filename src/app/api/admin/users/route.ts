import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

/** HQ "Users" (migration 038): every account, its profile, sign-in method, dates, plan and use */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await rpc("orbit_admin_users", {}), { headers: { "Cache-Control": "no-store" } });
}
