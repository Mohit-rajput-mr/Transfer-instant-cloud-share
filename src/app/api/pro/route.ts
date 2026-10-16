import { NextRequest, NextResponse } from "next/server";
import { validPro } from "@/lib/pro";

export const dynamic = "force-dynamic";

// a device checks a Pro code before keeping it
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  return NextResponse.json({ ok: validPro(b?.code) });
}
