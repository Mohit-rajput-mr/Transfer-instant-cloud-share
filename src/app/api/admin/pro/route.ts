import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { mintPro } from "@/lib/pro";

export const dynamic = "force-dynamic";

// Mission HQ mints a Pro code (give it to a member; it unlocks tasks that stay up to 8 hours)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ code: mintPro() });
}
