import { NextRequest, NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { clean, isB64, isHex, netHash, newId, randomHex, reap, rpc, sha256 } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await reap();
  const items = await rpc<unknown[]>("orbit_list", {});
  return NextResponse.json({ items, net: netHash(req), now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}

const MAX_BYTES = 5 * 1024 ** 4; // Vercel Blob hard limit (5TB)

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const size = Number(b.size);
  const chunkSize = Number(b.chunkSize);
  const iterations = Number(b.iterations);
  const maxDownloads = b.maxDownloads == null ? null : Number(b.maxDownloads);
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_BYTES) return bad("size");
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 << 20 || chunkSize > 64 << 20) return bad("chunk");
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 2_000_000) return bad("iterations");
  if (maxDownloads !== null && (!Number.isSafeInteger(maxDownloads) || maxDownloads < 1 || maxDownloads > 999)) return bad("max");
  if (!isB64(b.salt) || !isB64(b.nonce)) return bad("crypto");
  if (!isHex(b.auth, 64) || !isHex(b.owner, 64)) return bad("keys");

  const name = clean(b.name, 60) || "untitled";
  const fileName = clean(b.fileName, 180) || "file";
  const mime = clean(b.mime, 120) || "application/octet-stream";

  const id = newId();
  const pathname = `o/${id}-${randomHex(12)}.bin`;
  const chunks = Math.max(1, Math.ceil(size / chunkSize));
  const encryptedSize = size + chunks * 16;

  await rpc("orbit_create", {
    p: {
      id, name, fileName, mime, size, pathname, chunkSize, iterations,
      salt: b.salt, nonce: b.nonce,
      authHash: sha256(b.auth), ownerHash: sha256(b.owner),
      netHash: netHash(req), device: clean(b.device, 60),
      maxDownloads: maxDownloads ?? "",
      hue: Math.floor(Math.random() * 360),
    },
  });

  const token = await generateClientTokenFromReadWriteToken({
    pathname,
    maximumSizeInBytes: encryptedSize + 1024,
    allowedContentTypes: ["application/octet-stream"],
    validUntil: Date.now() + 6 * 60 * 60 * 1000,
    cacheControlMaxAge: 60,
  });

  return NextResponse.json({ id, pathname, token });
}

const bad = (what: string) => NextResponse.json({ error: `invalid ${what}` }, { status: 400 });
