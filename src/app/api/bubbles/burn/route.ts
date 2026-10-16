import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256 } from "@/lib/server";

export const dynamic = "force-dynamic";

// the sender burns their own bubble early
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^b[a-z0-9]{9}$/.test(b.id) || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ok = await rpc<boolean>("orbit_bubble_burn", { p_id: b.id, p_owner_hash: sha256(b.owner) });
  return NextResponse.json({ ok: !!ok });
}
