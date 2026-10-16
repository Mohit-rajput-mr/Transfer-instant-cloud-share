import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { CLOUD_LIVE_BYTES, CLOUD_MONTH_BYTES, storeParts } from "@/lib/limits";
import { abortMultipart, completeMultipart, listParts, objectKey, presign, r2On, startMultipart, storedSize } from "@/lib/r2";
import { LIFE_MIN, untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// The sender's browser uploads the encrypted file to R2 itself; this only hands out signed URLs for
// exactly the parts its declared size needs, and only to the owner.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!r2On()) return NextResponse.json({ error: "storage off" }, { status: 501 });
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const ownerHash = sha256(b.owner);
  const item = await rpc<{ size?: number; name?: unknown; expiresAt?: unknown } | null>("orbit_owner", { p_id: id, p_owner_hash: ownerHash });
  if (!item || typeof item.size !== "number") return NextResponse.json({ error: "gone" }, { status: 404 });
  const { life } = untag(item);
  // keeps the object alive while it uploads (the sender may come back and resume); once saved, the life
  // the sender picked starts from now. The database stores 30-minute lives, shorter ones are cut from it.
  const alive = (done: boolean) =>
    rpc("orbit_upload_alive", { p_id: id, p_owner_hash: ownerHash, p_minutes: done ? LIFE_MIN : LIFE_MIN + (LIFE_MIN - life), p_done: done }).catch(() => null);
  const sign = (uploadId: string, ns: number[]) =>
    Promise.all(ns.map((n) => presign("PUT", key, { partNumber: String(n), uploadId }, 6 * 3600).then((url) => ({ n, url }))));
  const key = objectKey(id);
  const parts = storeParts(item.size);

  try {
    if (b.action === "start") {
      // `probe`: the browser checks it can talk to the bucket (CORS) before sending a single part
      const probe = await presign("GET", key, {}, 600);
      if (b.probe) return NextResponse.json({ probe });
      // free-tier guard: past it the file still goes directly, it just isn't stored
      const bud = await rpc<{ month?: number; live?: number }>("orbit_cloud_budget", {}).catch(() => null);
      if (bud && (Number(bud.month) + item.size > CLOUD_MONTH_BYTES || Number(bud.live) > CLOUD_LIVE_BYTES))
        return NextResponse.json({ error: "storage full" }, { status: 507 });
      // one part: a single plain upload (1 operation instead of 3)
      if (parts === 1) return NextResponse.json({ put: await presign("PUT", key, {}, 3600) });
      const uploadId = await startMultipart(key);
      const urls = (await sign(uploadId, Array.from({ length: parts }, (_, i) => i + 1))).map((p) => p.url);
      await alive(false);
      return NextResponse.json({ uploadId, urls });
    }
    // still uploading: keep it in orbit
    if (b.action === "alive") return NextResponse.json({ ok: (await alive(false)) !== false });
    // a single-part copy was uploaded straight from the browser: record it once it is really there
    if (b.action === "saved") {
      await markSaved(id, key);
      await alive(true);
      return NextResponse.json({ ok: true });
    }
    if (typeof b.uploadId !== "string" || b.uploadId.length > 1024) return NextResponse.json({ error: "bad request" }, { status: 400 });
    // pick up an upload where it stopped (network dropped, page closed): which parts R2 already has,
    // and fresh links for the rest
    if (b.action === "resume") {
      if ((await alive(false)) === false) return NextResponse.json({ error: "gone" }, { status: 404 });
      const done = await listParts(key, b.uploadId);
      if (!done) return NextResponse.json({ error: "gone" }, { status: 404 });
      const have = new Set(done.map((p) => p.n));
      const missing = Array.from({ length: parts }, (_, i) => i + 1).filter((n) => !have.has(n));
      return NextResponse.json({ parts, done: done.filter((p) => p.n <= parts), urls: await sign(b.uploadId, missing) });
    }
    if (b.action === "complete") {
      if (!Array.isArray(b.etags) || b.etags.length !== parts || !b.etags.every((e: unknown) => typeof e === "string" && e.length < 200))
        return NextResponse.json({ error: "bad parts" }, { status: 400 });
      await completeMultipart(key, b.uploadId, b.etags);
      await markSaved(id, key);
      await alive(true);
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

/** HQ: which objects have a cloud copy, and how much is saved there per day. */
async function markSaved(id: string, key: string) {
  const bytes = await storedSize(key);
  if (bytes != null) await rpc("orbit_cloud_saved", { p_id: id, p_bytes: bytes }).catch(() => {});
}
