import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { liveWithSpace, untag } from "@/lib/spaces";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.owner, 64) || typeof b.url !== "string")
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  // Files are never stored: the only "location" is the sender's own device, reached peer to peer.
  if (b.url !== `p2p:${id}`) return NextResponse.json({ error: "bad url" }, { status: 400 });

  const item = await rpc<{ name?: unknown; expiresAt?: unknown } | null>("orbit_finalize", { p_id: id, p_owner_hash: sha256(b.owner), p_url: b.url });
  if (!item) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const o = untag(item);
  // inside a named space it stays until the space closes (8 hours at most)
  if (o.space && !o.anon) {
    await liveWithSpace(o.space, "o", id);
    const r = await rpc<{ name?: unknown; expiresAt?: unknown } | null>("orbit_get", { p_id: id }).catch(() => null);
    if (r) return NextResponse.json(untag(r));
  }
  return NextResponse.json(o);
}
