import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// the knocker waits: { status: wait | in | no | gone, slug, box } (box = the invite sealed to the knocker's key)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{16,32}$/.test(id)) return NextResponse.json({ status: "gone" }, { status: 404 });
  const k = await rpc<{ status: string; slug: string; box: string | null } | null>("orbit_knock_get", { p_id: id }).catch(() => null);
  if (!k) return NextResponse.json({ status: "gone" }, { status: 404 });
  return NextResponse.json(k.status === "in" ? k : { status: k.status }, { headers: { "Cache-Control": "no-store" } });
}
