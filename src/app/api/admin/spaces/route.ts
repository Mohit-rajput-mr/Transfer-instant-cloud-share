import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { rpc } from "@/lib/server";
import { allSpaces } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// ?full=1: the Spaces page (/admin/spaces): every space of the last 30 days with its live members, what is in it now
// and what has flowed through it, the anonymous sessions and 30 days of history (migration 029 orbit_admin_spaces).
// Titles are sealed in the database, so they come from allSpaces.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (req.nextUrl.searchParams.get("full") !== "1") {
    const spaces = await allSpaces().catch(() => []);
    return NextResponse.json({ spaces }, { headers: { "Cache-Control": "no-store" } });
  }
  const [stats, named] = await Promise.all([
    rpc<{ spaces: { slug: string }[] } & Record<string, unknown>>("orbit_admin_spaces", {}).catch(() => null),
    allSpaces(400).catch(() => []),
  ]);
  if (!stats) return NextResponse.json({ error: "Spaces stats aren't available yet" }, { status: 500 });
  const meta = new Map(named.map((x) => [x.slug, x]));
  stats.spaces = stats.spaces.map((x) => {
    const m = meta.get(x.slug);
    return { ...x, title: m?.title ?? null, priv: m?.priv ?? null, handles: m?.members ?? [] };
  });
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
