import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/server";
import { burnedUp, member, roster, untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// The objects inside one space, for its members only.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await member(slug, req.headers.get("x-device"), req.headers.get("x-space-token"));
  if (!me) return NextResponse.json({ error: "removed" }, { status: 403 });
  const [r, ros, bubbles, tasks] = await Promise.all([
    rpc<{ items: { name?: unknown; expiresAt?: unknown }[]; online: number }>("orbit_list2", {}),
    roster(slug),
    rpc<unknown[]>("orbit_bubble_list", { p_space: slug }).catch(() => []),
    rpc<unknown[]>("orbit_task_list", { p_space: slug }).catch(() => []),
  ]);
  const items = (r.items ?? []).map(untag).filter((o) => o.space === slug && !burnedUp(o));
  return NextResponse.json({ items, bubbles: bubbles ?? [], tasks: tasks ?? [], online: ros.members.length, now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
