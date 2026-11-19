import { NextResponse, type NextRequest } from "next/server";
import { userOf } from "@/lib/account";
import { checkCode, otpOn, sendCode, sessionOf } from "@/lib/otp";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Delete my account: { action: "send" } emails a fresh code, { action: "delete", code } deletes (code needed when
 *  codes are on). A paid plan should be cancelled first (Paddle keeps billing otherwise). */
export async function POST(req: NextRequest) {
  const u = await userOf(req);
  const s = sessionOf(/^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "")?.[1] || "");
  if (!u || !s) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; code?: string };
  if (b.action === "send") {
    if (!otpOn()) return NextResponse.json({ ok: true, noCode: true });
    const sent = await sendCode(s, u.id, u.email ?? "", "delete").catch(() => false);
    return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Couldn't send a code just now. Try again in a minute." }, { status: 429 });
  }
  if (b.action !== "delete") return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (otpOn() && (await checkCode(s, u.id, String(b.code ?? "").trim())) !== "ok") return NextResponse.json({ error: "Wrong or expired code" }, { status: 400 });
  await rpc("orbit_account_delete", { p_user: u.id });
  return NextResponse.json({ ok: true });
}
