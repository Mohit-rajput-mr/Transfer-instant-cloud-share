import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { removeBlobs, rpc, validId } from "@/lib/server";
import { untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// HQ "Void" (migration 023): everything alive in every area — files, tasks, notes — and burning any of it.
type Rec = { id: string; name?: unknown; expiresAt?: unknown; [k: string]: unknown };
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const d = await rpc<{ now: string; files: Rec[]; tasks: Rec[]; notes: Rec[] }>("orbit_admin_void", {});
  const now = Date.now();
  // names carry space / lifetime / open tags: split them out, and drop files whose shorter life already ran out
  const files = (d?.files ?? []).map(untag).filter((f) => Date.parse(String(f.expiresAt)) > now);
  return NextResponse.json({ ...d, files }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const kind = b?.kind, id = b?.id;
  if (kind === "file") {
    if (!validId(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
    const url = await rpc<string | null>("orbit_admin_destroy", { p_id: id });
    await removeBlobs([url]);
    return NextResponse.json({ ok: !!url });
  }
  if ((kind === "task" && /^t[a-z0-9]{9}$/.test(id)) || (kind === "note" && /^b[a-z0-9]{9}$/.test(id))) {
    const ok = await rpc<boolean>("orbit_admin_burn", { p_kind: kind, p_id: id });
    return NextResponse.json({ ok: !!ok });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
