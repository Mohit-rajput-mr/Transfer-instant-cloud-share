import { NextRequest, NextResponse } from "next/server";
import { clean, netHash } from "@/lib/server";
import { addMember, anonAlias, chanFor, checkPass, cleanHandle, devHash, getMeta, roster, tokenFor, uniqueHandle, validSlug } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// wrong passcodes per network, per instance: slows guessing to a crawl
const fails = new Map<string, number[]>();

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await req.json().catch(() => null);
  const deviceId = clean(b?.deviceId, 40);
  const typed = cleanHandle(b?.handle);
  if (!validSlug(slug) || !deviceId) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const meta = await getMeta(slug);
  // an anonymous space gives every member an alias: a typed name is ignored
  if (!typed && !meta?.anon) return NextResponse.json({ error: "Pick a name for yourself" }, { status: 400 });
  if (!meta) return NextResponse.json({ error: "No such space" }, { status: 404 });
  const dh = devHash(deviceId);
  const r = await roster(slug, true);
  if (r.kicked.has(dh)) return NextResponse.json({ error: "You were removed from this space" }, { status: 403 });

  // wrong passcodes: 8 per device, and 40 for a whole network (a VPN exit or an office shares one: one person's
  // typos must not lock out everyone behind it, while guessing with fresh device ids still hits the network cap)
  const net = netHash(req), mine = `${net}:${dh}`;
  const now = Date.now();
  const fresh = (k: string) => (fails.get(k) ?? []).filter((t) => now - t < 10 * 60_000);
  const recent = fresh(mine), all = fresh(net);
  if (meta.priv && (recent.length >= 8 || all.length >= 40)) return NextResponse.json({ error: "Too many wrong passcodes. Try again in 10 minutes" }, { status: 429 });
  if (!checkPass(meta, b?.pass)) {
    fails.set(mine, [...recent, now]);
    fails.set(net, [...all, now]);
    return NextResponse.json({ error: "Wrong passcode", needPass: true }, { status: 401 });
  }
  if (meta.anon) {
    const alias = r.members.find((m) => m.dh === dh)?.handle ?? anonAlias(dh, r.members.map((m) => m.handle));
    await addMember(slug, dh, alias);
    return NextResponse.json({ slug, title: meta.title, priv: meta.priv, handle: alias, token: tokenFor(slug, dh), chan: chanFor(slug), anon: true });
  }
  // a name someone else holds gets a number at the end ("Mohit 2"); the same device coming back keeps its name
  const handle = uniqueHandle(typed, r.members.filter((m) => m.dh !== dh).map((m) => m.handle));
  await addMember(slug, dh, handle);
  return NextResponse.json({ slug, title: meta.title, priv: meta.priv, work: !!meta.work, handle, token: tokenFor(slug, dh), chan: chanFor(slug) });
}
