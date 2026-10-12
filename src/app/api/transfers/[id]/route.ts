import { NextRequest, NextResponse } from "next/server";
import { isHex, removeBlobs, rpc, sha256, validId } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const item = await rpc("orbit_get", { p_id: id });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(item, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = req.headers.get("x-owner");
  if (!validId(id) || !isHex(owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = await rpc<string | null>("orbit_delete", { p_id: id, p_owner_hash: sha256(owner) });
  if (!url) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await removeBlobs([url]);
  return NextResponse.json({ ok: true });
}
