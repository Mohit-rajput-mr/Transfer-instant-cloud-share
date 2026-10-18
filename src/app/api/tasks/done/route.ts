import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256 } from "@/lib/server";
import { cleanHandle, isAnonSpace, member } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// only the task's writer ticks it (or unticks it)
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^t[a-z0-9]{9}$/.test(b.id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!isHex(b.owner, 64) || !(await rpc<boolean>("orbit_task_owned", { p_id: b.id, p_owner_hash: sha256(b.owner) }).catch(() => false)))
    return NextResponse.json({ error: "Only the person who wrote this task can change it" }, { status: 403 });
  let space: string | null = null;
  let by = cleanHandle(b.by);
  if (b.space != null) {
    const me = await member(b.space, b.deviceId, b.spaceToken);
    if (!me) return NextResponse.json({ error: "You are no longer in this space" }, { status: 403 });
    space = me.slug;
    // an anonymous space: always the alias
    if (await isAnonSpace(space)) by = me.handle;
  }
  const ok = await rpc<boolean>("orbit_task_done", { p_id: b.id, p_space: space, p_done: b.done !== false, p_by: by });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "This task has burnt" }, { status: 404 });
}
