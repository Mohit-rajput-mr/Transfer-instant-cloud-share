import { NextRequest, NextResponse } from "next/server";
import { clean } from "@/lib/server";
import { addMember, chanFor, cleanHandle, createSpace, devHash, search, slugify, tokenFor, validSlug } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// search: ?q=part-of-a-name
export async function GET(req: NextRequest) {
  const q = clean(req.nextUrl.searchParams.get("q"), 40);
  const items = await search(q);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

// create, and join it as its owner, in one step
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const title = clean(b?.title, 32);
  const handle = cleanHandle(b?.handle);
  const deviceId = clean(b?.deviceId, 40);
  const priv = !!b?.priv;
  const pass = typeof b?.pass === "string" ? b.pass.slice(0, 64) : "";
  if (!validSlug(slugify(title)) || !handle || !deviceId) return NextResponse.json({ error: "Give the space a name and yourself a name" }, { status: 400 });
  if (priv && pass.length < 4) return NextResponse.json({ error: "Private spaces need a passcode of 4+ characters" }, { status: 400 });
  const made = await createSpace(title, priv, priv ? pass : null);
  if (!made) return NextResponse.json({ error: "That name is taken. Search for it to join, or pick another" }, { status: 409 });
  const { meta, owner } = made;
  const dh = devHash(deviceId);
  await addMember(meta.slug, dh, handle);
  return NextResponse.json({ slug: meta.slug, title: meta.title, priv: meta.priv, handle, token: tokenFor(meta.slug, dh), chan: chanFor(meta.slug), owner });
}
