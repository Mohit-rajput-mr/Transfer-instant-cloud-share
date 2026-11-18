import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

/** HQ "Payments" (migration 034): every Paddle payment and every account with its plan */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const d = await rpc<{ payments: unknown[]; accounts: unknown[] }>("orbit_admin_payments", {});
  return NextResponse.json(d, { headers: { "Cache-Control": "no-store" } });
}
