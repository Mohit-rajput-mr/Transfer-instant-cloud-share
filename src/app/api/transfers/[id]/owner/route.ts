import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const r = await rpc<{ name?: unknown } | null>("orbit_owner", { p_id: id, p_owner_hash: sha256(b.owner) });
  if (!r) return NextResponse.json({ error: "gone" }, { status: 404 });
  return NextResponse.json(untag(r), { headers: { "Cache-Control": "no-store" } });
}
