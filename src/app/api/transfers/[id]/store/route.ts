import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { storeParts } from "@/lib/limits";
import { abortMultipart, completeMultipart, objectKey, presign, r2On, startMultipart } from "@/lib/r2";

export const dynamic = "force-dynamic";

// The sender's browser uploads the encrypted file to R2 itself; this only hands out signed URLs for
// exactly the parts its declared size needs, and only to the owner.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!r2On()) return NextResponse.json({ error: "storage off" }, { status: 501 });
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const item = await rpc<{ size?: number } | null>("orbit_owner", { p_id: id, p_owner_hash: sha256(b.owner) });
  if (!item || typeof item.size !== "number") return NextResponse.json({ error: "gone" }, { status: 404 });
  const key = objectKey(id);
  const parts = storeParts(item.size);

  try {
    if (b.action === "start") {
      // `probe`: the browser checks it can talk to the bucket (CORS) before sending a single part
      const probe = await presign("GET", key, {}, 600);
      if (b.probe) return NextResponse.json({ probe });
      // one part: a single plain upload (1 operation instead of 3)
      if (parts === 1) return NextResponse.json({ put: await presign("PUT", key, {}, 3600) });
      const uploadId = await startMultipart(key);
      const urls = await Promise.all(
        Array.from({ length: parts }, (_, i) => presign("PUT", key, { partNumber: String(i + 1), uploadId }, 6 * 3600)),
      );
      return NextResponse.json({ uploadId, urls });
    }
    if (typeof b.uploadId !== "string" || b.uploadId.length > 1024) return NextResponse.json({ error: "bad request" }, { status: 400 });
    if (b.action === "complete") {
      if (!Array.isArray(b.etags) || b.etags.length !== parts || !b.etags.every((e: unknown) => typeof e === "string" && e.length < 200))
        return NextResponse.json({ error: "bad parts" }, { status: 400 });
      await completeMultipart(key, b.uploadId, b.etags);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "abort") {
      await abortMultipart(key, b.uploadId);
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("store", e);
    return NextResponse.json({ error: "storage failed" }, { status: 502 });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
