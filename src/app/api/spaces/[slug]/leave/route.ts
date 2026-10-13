import { NextRequest, NextResponse } from "next/server";
import { member, removeMember } from "@/lib/spaces";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await req.json().catch(() => null);
  const me = await member(slug, b?.deviceId, b?.token);
  if (me) await removeMember(me.slug, me.dh, false);
  return NextResponse.json({ ok: true });
}
