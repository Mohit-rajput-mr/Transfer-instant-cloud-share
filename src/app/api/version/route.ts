import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lets open tabs notice a new deployment and refresh themselves.
export function GET() {
  const v = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "dev";
  return NextResponse.json({ v }, { headers: { "Cache-Control": "no-store" } });
}
