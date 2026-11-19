import { NextResponse, type NextRequest } from "next/server";
import { userOf } from "@/lib/account";
import { otpOn } from "@/lib/otp";

export const dynamic = "force-dynamic";

/** does this login still need its emailed code? (the code itself is Supabase's: lib/otp.ts) */
export async function GET(req: NextRequest) {
  const u = await userOf(req, { otp: false });
  if (!u) return NextResponse.json({ error: "signed out" }, { status: 401 });
  return NextResponse.json({ required: otpOn(), verified: !otpOn() || !!u.codeAt, email: u.email }, { headers: { "Cache-Control": "no-store" } });
}
