import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { allSpaces } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const spaces = await allSpaces().catch(() => []);
  return NextResponse.json({ spaces }, { headers: { "Cache-Control": "no-store" } });
}
