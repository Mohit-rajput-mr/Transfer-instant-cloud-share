import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { untag } from "@/lib/spaces";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.owner, 64) || typeof b.url !== "string")
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  // Only accept URLs from Vercel Blob storage, and only for this transfer's pathname.
  let u: URL;
  try {
    u = new URL(b.url);
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }
  if (u.protocol !== "https:" || !u.hostname.endsWith(".public.blob.vercel-storage.com") || !u.pathname.startsWith(`/o/${id}-`))
    return NextResponse.json({ error: "bad url" }, { status: 400 });

  const item = await rpc<{ name?: unknown; expiresAt?: unknown } | null>("orbit_finalize", { p_id: id, p_owner_hash: sha256(b.owner), p_url: u.toString() });
  if (!item) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(untag(item));
}
