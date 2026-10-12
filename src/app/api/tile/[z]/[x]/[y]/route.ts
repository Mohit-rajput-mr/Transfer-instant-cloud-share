import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

// Gray world map for the admin globe: Esri "Dark Gray Canvas" base + its label/boundary layer,
// merged into one tile so the globe can stream sharp detail at every zoom level.
// Tiles are immutable, so the CDN caches each one for a year after the first request.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
const NATIVE_MAX = 16; // deepest level Esri publishes for this basemap; deeper requests are upscaled crops

export async function GET(_req: NextRequest, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await params;
  const Z = Number(z), X = Number(x), Y = Number(String(y).replace(/\.\w+$/, ""));
  const max = 2 ** Z;
  if (![Z, X, Y].every(Number.isInteger) || Z < 0 || Z > 18 || X < 0 || Y < 0 || X >= max || Y >= max)
    return NextResponse.json({ error: "bad tile" }, { status: 400 });

  const d = Math.max(0, Z - NATIVE_MAX);
  const [sz, sx, sy] = [Z - d, X >> d, Y >> d];
  const get = (layer: string) =>
    fetch(`${ESRI}/${layer}/MapServer/tile/${sz}/${sy}/${sx}`, { headers: { "User-Agent": "orbit-admin" } })
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
  const [base, labels] = await Promise.all([get("World_Dark_Gray_Base"), get("World_Dark_Gray_Reference")]);
  if (!base) return new NextResponse(null, { status: 502 });

  let img = sharp(Buffer.from(base));
  if (labels) img = img.composite([{ input: Buffer.from(labels) }]);
  if (d > 0) {
    // over-zoom: crop this tile's share of the level-16 parent and scale it back up to 256px
    const part = 256 >> d;
    const merged = await img.png().toBuffer();
    img = sharp(merged)
      .extract({ left: (X & ((1 << d) - 1)) * part, top: (Y & ((1 << d) - 1)) * part, width: part, height: part })
      .resize(256, 256, { kernel: "lanczos3" });
  }
  const out = await img.webp({ quality: 82 }).toBuffer();
  return new NextResponse(new Uint8Array(out), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=604800, s-maxage=31536000, immutable" },
  });
}
