import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256 } from "@/lib/server";

export const dynamic = "force-dynamic";

// the person who wrote a task removes it
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^t[a-z0-9]{9}$/.test(b.id) || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ok = await rpc<boolean>("orbit_task_burn", { p_id: b.id, p_owner_hash: sha256(b.owner) });
  return NextResponse.json({ ok: !!ok });
}
