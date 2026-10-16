import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lets open tabs notice a release they should reload for. Deliberately NOT the deployment id: a reload
// takes a sender's files out of orbit (they live in that tab), so not every deploy asks for one.
// Bump RELEASE only when old tabs must pick up new code; tabs wait until they hold nothing to reload.
// (Pinned to the deployment that was live before this rule, so its open tabs don't reload.)
const RELEASE = "r-2026-10-16-wiredone";

export function GET() {
  // `build` changes with every deploy: HQ (which holds no files) reloads on it
  const build = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "dev";
  return NextResponse.json({ v: RELEASE, build }, { headers: { "Cache-Control": "no-store" } });
}
