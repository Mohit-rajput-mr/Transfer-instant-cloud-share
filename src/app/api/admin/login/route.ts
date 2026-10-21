import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdmin, issueSession, verifyPassword } from "@/lib/admin";
import { netHash, rpc } from "@/lib/server";

const MAX_TRIES = 5; // per network per 15 minutes

export const dynamic = "force-dynamic";

/** is this browser signed in? Always 200, so HQ asks for its data only once it is (no 401 in the console first) */
export function GET(req: NextRequest) {
  return NextResponse.json({ in: isAdmin(req) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const net = netHash(req);
  const tries = await rpc<number>("orbit_admin_attempts", { p_net: net, p_failed: false });
  if (tries >= MAX_TRIES) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!verifyPassword(b?.password)) {
    const n = await rpc<number>("orbit_admin_attempts", { p_net: net, p_failed: true });
    return NextResponse.json({ error: `Wrong password · ${Math.max(0, MAX_TRIES - n)} tries left` }, { status: 401 });
  }
  const s = issueSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, s.value, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: s.maxAge });
  return res;
}
