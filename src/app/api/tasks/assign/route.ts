import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256 } from "@/lib/server";
import { cleanHandle, member } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// who a task is for: only its writer hands it to someone ("" clears it)
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^t[a-z0-9]{9}$/.test(b.id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!isHex(b.owner, 64) || !(await rpc<boolean>("orbit_task_owned", { p_id: b.id, p_owner_hash: sha256(b.owner) }).catch(() => false)))
    return NextResponse.json({ error: "Only the person who wrote this task can change it" }, { status: 403 });
  let space: string | null = null;
  if (b.space != null) {
    const me = await member(b.space, b.deviceId, b.spaceToken);
    if (!me) return NextResponse.json({ error: "You are no longer in this space" }, { status: 403 });
    space = me.slug;
  }
  const ok = await rpc<boolean>("orbit_task_assign", { p_id: b.id, p_space: space, p_assignee: cleanHandle(b.assignee) });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "This task has burnt" }, { status: 404 });
}
