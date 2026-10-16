import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/server";
import { cleanHandle, member } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// anyone who can see a task ticks it (or unticks it); inside a space, only its members
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^t[a-z0-9]{9}$/.test(b.id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  let space: string | null = null;
  if (b.space != null) {
    const me = await member(b.space, b.deviceId, b.spaceToken);
    if (!me) return NextResponse.json({ error: "You are no longer in this space" }, { status: 403 });
    space = me.slug;
  }
  const ok = await rpc<boolean>("orbit_task_done", { p_id: b.id, p_space: space, p_done: b.done !== false, p_by: cleanHandle(b.by) });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "This task has burnt" }, { status: 404 });
}
