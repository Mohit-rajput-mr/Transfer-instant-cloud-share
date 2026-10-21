import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { untag } from "@/lib/spaces";
import { getObject, previewKey, putObject, r2On } from "@/lib/r2";

export const dynamic = "force-dynamic";

// The preview picture of an open object (lib/preview.ts): the owner stores it once, everyone fetches it.
// Kept in R2 next to the file and deleted with it.
const MAX = 64 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!r2On()) return NextResponse.json({ error: "storage off" }, { status: 501 });
  const { id } = await params;
  const owner = req.headers.get("x-owner");
  if (!validId(id) || !isHex(owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const item = await rpc<{ size?: number; name?: unknown } | null>("orbit_owner", { p_id: id, p_owner_hash: sha256(owner!) });
  if (!item) return NextResponse.json({ error: "gone" }, { status: 404 });
  // anonymous objects never get a preview
  if (untag(item).anon) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.arrayBuffer();
  const b = new Uint8Array(body);
  // a JPEG and nothing else, small
  if (b.length < 100 || b.length > MAX || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return NextResponse.json({ error: "bad image" }, { status: 400 });
  await putObject(previewKey(id), body, "image/jpeg");
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validId(id)) return new NextResponse(null, { status: 404 });
  const body = await getObject(previewKey(id));
  if (!body) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(body, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=1800, s-maxage=1800, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
