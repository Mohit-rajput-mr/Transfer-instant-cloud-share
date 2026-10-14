import { NextRequest, NextResponse } from "next/server";
import { MAX_FILE_BYTES } from "@/lib/limits";
import { clean, geo, isB64, isHex, netHash, newId, reap, rpc, sha256 } from "@/lib/server";
import { LIVES, burnedUp, cleanGroup, member, tagName, untag, validFrom } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// Same answer for everyone, so the CDN serves it: database load stays ~1 query/second
// per region no matter how many people are watching the void.
export async function GET() {
  await reap();
  const r = await rpc<{ items: { name?: unknown; expiresAt?: unknown }[]; online: number }>("orbit_list2", {});
  // objects inside a space never show in the public void; short-lived ones leave on time
  const items = (r.items ?? []).map(untag).filter((o) => !o.space && !burnedUp(o));
  return NextResponse.json(
    { ...r, items, now: Date.now() },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=1, stale-while-revalidate=5" } },
  );
}


export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const size = Number(b.size);
  const chunkSize = Number(b.chunkSize);
  const iterations = Number(b.iterations);
  const maxDownloads = b.maxDownloads == null ? null : Number(b.maxDownloads);
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_FILE_BYTES) return NextResponse.json({ error: "File is larger than 5 GB" }, { status: 413 });
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 << 20 || chunkSize > 64 << 20) return bad("chunk");
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 2_000_000) return bad("iterations");
  if (maxDownloads !== null && (!Number.isSafeInteger(maxDownloads) || maxDownloads < 1 || maxDownloads > 999)) return bad("max");
  if (!isB64(b.salt) || !isB64(b.nonce)) return bad("crypto");
  if (!isHex(b.auth, 64) || !isHex(b.owner, 64)) return bad("keys");

  let name = (clean(b.name, 60) || "untitled").replace(/^⟪/, "(");
  const life = LIVES.includes(Number(b.life)) ? Number(b.life) : 30;
  const tags = { life, open: b.open === true, from: validFrom(b.from) ? b.from : undefined, group: cleanGroup(b.group) || undefined } as Parameters<typeof tagName>[1];
  if (b.space != null) {
    const me = await member(b.space, b.deviceId, b.spaceToken);
    if (!me) return NextResponse.json({ error: "You are no longer in this space" }, { status: 403 });
    tags.space = me.slug;
    tags.by = me.handle;
  }
  name = tagName(name, tags);
  const fileName = clean(b.fileName, 180) || "file";
  const mime = clean(b.mime, 120) || "application/octet-stream";

  const id = newId();
  // no storage: the sender's device serves the file directly (lib/p2p.ts)
  const pathname = `p2p/${id}`;

  try {
    await rpc("orbit_create", {
    p: {
      id, name, fileName, mime, size, pathname, chunkSize, iterations,
      salt: b.salt, nonce: b.nonce,
      authHash: sha256(b.auth), ownerHash: sha256(b.owner),
      netHash: netHash(req), device: clean(b.device, 60),
      maxDownloads: maxDownloads ?? "",
      // the sender picks the colour (spread away from what's already floating); every device draws exactly this hue
      hue: Number.isInteger(b.hue) && b.hue >= 0 && b.hue < 360 ? b.hue : Math.floor(Math.random() * 360),
      ...geo(req),
    },
    });
  } catch (e) {
    if (String(e).includes("rate_limited"))
      return NextResponse.json({ error: "Too many uploads from your network. Try again in an hour." }, { status: 429 });
    throw e;
  }

  return NextResponse.json({ id });
}

const bad = (what: string) => NextResponse.json({ error: `invalid ${what}` }, { status: 400 });
