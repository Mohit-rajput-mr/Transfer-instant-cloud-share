import { NextResponse, type NextRequest } from "next/server";
import { accountOf, userOf } from "@/lib/account";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Send history (lib/plans.ts): Pro 30 days; Business a year, and the owner sees the whole team. Free has none. */
export async function GET(req: NextRequest) {
  const user = await userOf(req);
  if (!user) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const a = await accountOf(user);
  if (a.plan === "free") return NextResponse.json({ items: [], used: 0 });
  const team = a.owner && req.nextUrl.searchParams.get("team") === "1";
  const [items, used] = await Promise.all([
    rpc<unknown[]>("orbit_history", { p_user: user.id, p_days: a.plan === "business" ? 365 : 30, p_team: team }),
    rpc<number>("orbit_pool_used", { p_pool: a.pool }),
  ]);
  return NextResponse.json({ items, used: Number(used) || 0 }, { headers: { "Cache-Control": "no-store" } });
}
