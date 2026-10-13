import { NextRequest, NextResponse } from "next/server";
import { isHex, removeBlobs, rpc, sha256, validId } from "@/lib/server";
import { member, untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const raw = await rpc<{ name?: unknown } | null>("orbit_get", { p_id: id });
  if (!raw) return NextResponse.json({ error: "not found" }, { status: 404 });
  const item = untag(raw);
  // inside a space: members only
  if (item.space && !(await member(item.space, req.headers.get("x-device"), req.headers.get("x-space-token"))))
    return NextResponse.json({ error: "not found" }, { status: 404 });
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
