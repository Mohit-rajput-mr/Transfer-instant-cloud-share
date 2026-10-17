import { NextResponse } from "next/server";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// The Earth view (supabase/migrations/015_world.sql): how much is live in each area, worldwide. The same for
// everyone, so the CDN answers nearly every request.
export async function GET() {
  const cells = await rpc<{ a: string; f: number; b: number; t: number }[]>("orbit_world", {}).catch(() => []);
  return NextResponse.json({ cells: cells ?? [], now: Date.now() }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=20, stale-while-revalidate=60" } });
}
