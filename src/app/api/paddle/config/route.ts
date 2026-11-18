import { NextResponse } from "next/server";
import { paddleConfig } from "@/lib/paddle";

export const dynamic = "force-dynamic";

/** the Upgrade page: client token, sandbox or live, and the price ids it may open a checkout for */
export function GET() {
  return NextResponse.json(paddleConfig(), { headers: { "Cache-Control": "no-store" } });
}
