import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/server";
import { member, roster, untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// The objects inside one space, for its members only.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await member(slug, req.headers.get("x-device"), req.headers.get("x-space-token"));
  if (!me) return NextResponse.json({ error: "removed" }, { status: 403 });
  const [r, ros] = await Promise.all([rpc<{ items: { name?: unknown }[]; online: number }>("orbit_list2", {}), roster(slug)]);
  const items = (r.items ?? []).map(untag).filter((o) => o.space === slug);
  return NextResponse.json({ items, online: ros.members.length, now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
