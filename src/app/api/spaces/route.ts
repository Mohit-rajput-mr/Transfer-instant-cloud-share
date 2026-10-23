import { NextRequest, NextResponse } from "next/server";
import { anonNet, anonSessKey, clean, newId, rpc, validSid } from "@/lib/server";
import { addMember, anonAlias, chanFor, cleanHandle, createSpace, devHash, search, slugify, tokenFor, validSlug } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// search: ?q=part-of-a-name
export async function GET(req: NextRequest) {
  const q = clean(req.nextUrl.searchParams.get("q"), 40);
  const items = await search(q);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

// a passcode space's name: 4 of the characters newId uses (no 0/o, 1/l/i to misread)
const ANON_NAME = /^[abcdefghjkmnpqrstuvwxyz23456789]{4}$/;

// anonymous spaces made per network, per hour (in memory, per instance)
const anonMade = new Map<string, number>();

/** an anonymous space: random slug and title, private, its creator joins under an alias (no handle asked) */
async function createAnon(req: NextRequest, b: { deviceId?: unknown; pass?: unknown; sid?: unknown; name?: unknown }) {
  const deviceId = clean(b.deviceId, 40);
  const pass = typeof b.pass === "string" ? b.pass : "";
  if (!deviceId || !/^[a-z0-9]{12,32}$/.test(pass)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const net = anonNet(req);
  if (anonMade.size > 5000) anonMade.clear();
  const n = anonMade.get(net) ?? 0;
  if (n >= 20) return NextResponse.json({ error: "Too many anonymous spaces from your network. Try again in an hour." }, { status: 429 });
  anonMade.set(net, n + 1);
  // with a passcode: the browser picked the 4-character name (its passcode is turned into `pass` and the content key
  // with that name, so the name can't change here); it must not be the name of another live anonymous space
  const name = typeof b.name === "string" ? b.name : null;
  if (name !== null) {
    if (!ANON_NAME.test(name)) return NextResponse.json({ error: "bad request" }, { status: 400 });
    const taken = await rpc<string[]>("orbit_anon_find", { p_name: name }).catch(() => null);
    if (!taken) return NextResponse.json({ error: "Anonymous spaces aren't available yet" }, { status: 500 });
    if (taken.length) return NextResponse.json({ error: "name taken", taken: true }, { status: 409 });
  }
  let made: Awaited<ReturnType<typeof createSpace>> = null;
  for (let i = 0; i < 3 && !made; i++) {
    const slug = "anon-" + (name ? name + newId(4) : newId(8));
    made = await createSpace("Anonymous · " + slug.slice(5, 9).toUpperCase(), true, pass, { slug, anon: true });
  }
  if (!made) return NextResponse.json({ error: "Anonymous spaces aren't available yet" }, { status: 500 });
  const { meta, owner } = made;
  const dh = devHash(deviceId);
  const handle = anonAlias(dh, []);
  await addMember(meta.slug, dh, handle);
  // the space belongs to the anonymous session that made it: it burns with it (migration 021)
  if (validSid(b.sid)) await rpc("orbit_anon_session_space", { p_key: anonSessKey(b.sid), p_slug: meta.slug }).catch(() => {});
  return NextResponse.json({ slug: meta.slug, title: meta.title, priv: true, anon: true, handle, token: tokenFor(meta.slug, dh), chan: chanFor(meta.slug), owner });
}

// create, and join it as its owner, in one step
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (b?.anon === true) return createAnon(req, b);
  const title = clean(b?.title, 32);
  const handle = cleanHandle(b?.handle);
  const deviceId = clean(b?.deviceId, 40);
  const priv = !!b?.priv;
  const pass = typeof b?.pass === "string" ? b.pass.slice(0, 64) : "";
  if (!validSlug(slugify(title)) || !handle || !deviceId) return NextResponse.json({ error: "Give the space a name and yourself a name" }, { status: 400 });
  if (priv && pass.length < 4) return NextResponse.json({ error: "Private spaces need a passcode of 4+ characters" }, { status: 400 });
  const made = await createSpace(title, priv, priv ? pass : null, { work: b?.work === true });
  if (!made) return NextResponse.json({ error: "That name is taken. Search for it to join, or pick another" }, { status: 409 });
  const { meta, owner } = made;
  const dh = devHash(deviceId);
  await addMember(meta.slug, dh, handle);
  return NextResponse.json({ slug: meta.slug, title: meta.title, priv: meta.priv, work: !!meta.work, handle, token: tokenFor(meta.slug, dh), chan: chanFor(meta.slug), owner });
}
