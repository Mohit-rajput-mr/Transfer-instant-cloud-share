import { NextResponse, type NextRequest } from "next/server";
import { accountOf, userOf } from "@/lib/account";
import { paddle } from "@/lib/paddle";

export const dynamic = "force-dynamic";

/** a Paddle customer-portal link for the signed-in user: card, invoices, seats, cancel */
export async function POST(req: NextRequest) {
  const user = await userOf(req);
  if (!user) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const a = await accountOf(user);
  if (!a.customer) return NextResponse.json({ error: "No billing yet" }, { status: 404 });
  try {
    const s = await paddle<{ urls: { general: { overview: string } } }>(`customers/${a.customer}/portal-sessions`, { body: {} });
    return NextResponse.json({ url: s.urls.general.overview });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
