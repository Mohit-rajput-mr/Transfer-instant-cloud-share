import { NextRequest, NextResponse } from "next/server";
import { chanFor, getMeta, isOwner, member, roster } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// re-enter a saved space (and refresh its member list)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await req.json().catch(() => null);
  const me = await member(slug, b?.deviceId, b?.token);
  const meta = me && (await getMeta(me.slug));
  if (!me || !meta) return NextResponse.json({ error: "You are not in this space (removed, or it is gone)" }, { status: 403 });
  const owner = isOwner(meta, b?.owner);
  const { members } = await roster(slug);
  return NextResponse.json(
    {
      slug, title: meta.title, priv: meta.priv, handle: me.handle, chan: chanFor(slug), owner,
      members: members.map((m) => ({ id: m.dh, handle: m.handle, you: m.dh === me.dh })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
