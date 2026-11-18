import { NextResponse, type NextRequest } from "next/server";
import { accountOf, userOf } from "@/lib/account";
import { PERKS } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** the signed-in user's plan and what it unlocks */
export async function GET(req: NextRequest) {
  const user = await userOf(req);
  if (!user) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const a = await accountOf(user);
  return NextResponse.json({ email: user.email, ...a, perks: PERKS[a.plan] }, { headers: { "Cache-Control": "no-store" } });
}
