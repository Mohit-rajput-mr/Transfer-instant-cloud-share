import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { validSkin } from "@/lib/skin-list";
import { retagName, untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// The sender applies a new style (Style → Apply): what they still have floating takes it too, on every screen.
// Only the owner may (the object's owner key); only the style tag changes. Anonymous objects carry no style.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.owner, 64) || !validSkin(b.skin)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const ownerHash = sha256(b.owner);
  const item = await rpc<{ name?: unknown; expiresAt?: unknown } | null>("orbit_owner", { p_id: id, p_owner_hash: ownerHash });
  if (!item || typeof item.name !== "string") return NextResponse.json({ error: "gone" }, { status: 404 });
  const u = untag(item);
  if (u.anon) return NextResponse.json({ ok: true, skipped: true });
  const ok = await rpc<boolean>("orbit_retag", { p_id: id, p_owner_hash: ownerHash, p_name: retagName(u, { skin: b.skin }) });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "gone" }, { status: 404 });
}
