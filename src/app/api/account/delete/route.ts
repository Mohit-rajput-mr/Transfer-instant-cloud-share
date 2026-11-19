import { NextResponse, type NextRequest } from "next/server";
import { userOf } from "@/lib/account";
import { otpOn } from "@/lib/otp";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Delete my account: only right after a fresh emailed code (entered in the last 15 minutes). A paid plan should be
 *  cancelled first (Paddle keeps billing otherwise). */
export async function POST(req: NextRequest) {
  const u = await userOf(req);
  if (!u) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  if (otpOn() && (!u.codeAt || Date.now() / 1000 - u.codeAt > 15 * 60)) return NextResponse.json({ error: "Confirm with a fresh code first", code: true }, { status: 403 });
  await rpc("orbit_account_delete", { p_user: u.id });
  return NextResponse.json({ ok: true });
}
