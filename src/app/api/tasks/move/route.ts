import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256 } from "@/lib/server";
import { member } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// going private with the team: the writer's task moves into a space they are now in
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^t[a-z0-9]{9}$/.test(b.id) || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const me = await member(b.space, b.deviceId, b.spaceToken);
  if (!me) return NextResponse.json({ error: "You are not in that space" }, { status: 403 });
  const ok = await rpc<boolean>("orbit_task_to_space", { p_id: b.id, p_owner_hash: sha256(b.owner), p_space: me.slug }).catch(() => false);
  return NextResponse.json({ ok: !!ok });
}
