import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256 } from "@/lib/server";
import { cleanHandle, member } from "@/lib/spaces";

export const dynamic = "force-dynamic";

const line = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

// the task's writer: rewrite its line, set its route (stage names), move it along the route
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^t[a-z0-9]{9}$/.test(b.id) || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let route: string[] | null = null;
  if (b.route != null) {
    if (!Array.isArray(b.route) || b.route.length > 8) return NextResponse.json({ error: "Up to 8 stages" }, { status: 400 });
    route = b.route.map((x: unknown) => line(x, 40)).filter(Boolean);
  }
  const stage = b.stage == null ? null : Number.isInteger(b.stage) && b.stage >= -1 && b.stage < 8 ? b.stage : null;
  // anonymous: the space's alias, or no name at all
  let by = cleanHandle(b.by);
  // in a space: your member name (or alias), never what the browser sends; anonymous outside one: no name
  if (b.space != null) by = (await member(b.space, b.deviceId, b.spaceToken))?.handle || "";
  else if (b.anon === true) by = "";
  const ok = await rpc<boolean>("orbit_task_edit", {
    p_id: b.id, p_owner_hash: sha256(b.owner), p_body: line(b.text, 140) || null, p_route: route, p_stage: stage, p_by: by,
  }).catch(() => false);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Only the person who wrote this task can change it" }, { status: 403 });
}
