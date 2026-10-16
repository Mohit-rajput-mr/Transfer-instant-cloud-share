import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256 } from "@/lib/server";

export const dynamic = "force-dynamic";

// the writer moves a task up or down the list
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^t[a-z0-9]{9}$/.test(b.id) || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ok = await rpc<boolean>("orbit_task_reorder", { p_id: b.id, p_owner_hash: sha256(b.owner), p_dir: b.dir < 0 ? -1 : 1 }).catch(() => false);
  return NextResponse.json({ ok: !!ok });
}
