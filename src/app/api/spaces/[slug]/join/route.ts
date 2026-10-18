import { NextRequest, NextResponse } from "next/server";
import { clean, netHash } from "@/lib/server";
import { addMember, anonAlias, chanFor, checkPass, cleanHandle, devHash, getMeta, roster, tokenFor, validSlug } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// wrong passcodes per network, per instance: slows guessing to a crawl
const fails = new Map<string, number[]>();

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await req.json().catch(() => null);
  const deviceId = clean(b?.deviceId, 40);
  const handle = cleanHandle(b?.handle);
  if (!validSlug(slug) || !deviceId) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const meta = await getMeta(slug);
  // an anonymous space gives every member an alias: a typed name is ignored
  if (!handle && !meta?.anon) return NextResponse.json({ error: "Pick a name for yourself" }, { status: 400 });
  if (!meta) return NextResponse.json({ error: "No such space" }, { status: 404 });
  const dh = devHash(deviceId);
  const r = await roster(slug, true);
  if (r.kicked.has(dh)) return NextResponse.json({ error: "You were removed from this space" }, { status: 403 });

  const net = netHash(req);
  const now = Date.now();
  const recent = (fails.get(net) ?? []).filter((t) => now - t < 10 * 60_000);
  if (meta.priv && recent.length >= 8) return NextResponse.json({ error: "Too many wrong passcodes. Try again in 10 minutes" }, { status: 429 });
  if (!checkPass(meta, b?.pass)) {
    fails.set(net, [...recent, now]);
    return NextResponse.json({ error: "Wrong passcode", needPass: true }, { status: 401 });
  }
  if (meta.anon) {
    const alias = r.members.find((m) => m.dh === dh)?.handle ?? anonAlias(dh, r.members.map((m) => m.handle));
    await addMember(slug, dh, alias);
    return NextResponse.json({ slug, title: meta.title, priv: meta.priv, handle: alias, token: tokenFor(slug, dh), chan: chanFor(slug), anon: true });
  }
  if (r.members.some((m) => m.dh !== dh && m.handle.toLowerCase() === handle.toLowerCase()))
    return NextResponse.json({ error: `"${handle}" is taken in this space. Pick another name` }, { status: 409 });
  await addMember(slug, dh, handle);
  return NextResponse.json({ slug, title: meta.title, priv: meta.priv, handle, token: tokenFor(slug, dh), chan: chanFor(slug) });
}
