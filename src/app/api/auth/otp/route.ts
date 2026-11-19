import { NextResponse, type NextRequest } from "next/server";
import { userOf } from "@/lib/account";
import { checkCode, otpOn, sendCode, sessionOf, sessionVerified } from "@/lib/otp";

export const dynamic = "force-dynamic";

const sess = (req: NextRequest) => sessionOf(/^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "")?.[1] || "");

/** GET: does this login still need its emailed code? */
export async function GET(req: NextRequest) {
  const u = await userOf(req, { otp: false });
  if (!u) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const s = sess(req);
  const verified = !otpOn() || (!!s && (await sessionVerified(s, u.id)));
  return NextResponse.json({ required: otpOn(), verified, email: u.email }, { headers: { "Cache-Control": "no-store" } });
}

/** POST { action: "send" } emails a code; { action: "verify", code } finishes the login */
export async function POST(req: NextRequest) {
  const u = await userOf(req, { otp: false });
  const s = sess(req);
  if (!u || !s || !u.email) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  if (!otpOn()) return NextResponse.json({ ok: true, verified: true });
  const b = (await req.json().catch(() => null)) as { action?: string; code?: string } | null;
  if (b?.action === "send") {
    try {
      const sent = await sendCode(s, u.id, u.email);
      return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "A code was just sent. Wait a moment before asking again." }, { status: 429 });
    } catch {
      return NextResponse.json({ error: "Couldn't send the email. Try again in a minute." }, { status: 502 });
    }
  }
  if (b?.action === "verify") {
    const r = await checkCode(s, u.id, String(b.code ?? "").trim());
    if (r === "ok") return NextResponse.json({ ok: true, verified: true });
    const msg = r === "locked" ? "Too many wrong codes. Ask for a new one." : r === "expired" ? "That code has expired. Ask for a new one." : "Wrong code. Check the email and try again.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
