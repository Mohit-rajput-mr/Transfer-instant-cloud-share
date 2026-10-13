import { NextRequest, NextResponse } from "next/server";
import { getMeta, isOwner, member, removeMember } from "@/lib/spaces";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await req.json().catch(() => null);
  const me = await member(slug, b?.deviceId, b?.token);
  const meta = me && (await getMeta(me.slug));
  if (!me || !meta || !isOwner(meta, b?.owner)) return NextResponse.json({ error: "Only the space's creator can remove people" }, { status: 403 });
  const target = typeof b?.target === "string" && /^[0-9a-f]{16}$/.test(b.target) ? b.target : null;
  if (!target || target === me.dh) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await removeMember(slug, target, true);
  return NextResponse.json({ ok: true });
}
