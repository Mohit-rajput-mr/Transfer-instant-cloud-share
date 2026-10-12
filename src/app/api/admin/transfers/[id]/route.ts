import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { removeBlobs, rpc, validId } from "@/lib/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const url = await rpc<string | null>("orbit_admin_destroy", { p_id: id });
  await removeBlobs([url]);
  return NextResponse.json({ ok: !!url });
}
