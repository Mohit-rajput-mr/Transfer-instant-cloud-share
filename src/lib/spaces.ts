import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";

// Spaces: separate voids. Stored in the Blob store (no database change):
//   sp/x/<slug>        meta, encrypted with a key derived from ORBIT_SECRET
//   sp/m/<slug>/<dh>/<handle>   one empty marker per member (dh = keyed hash of the device id)
//   sp/k/<slug>/<dh>   kicked
// Objects launched inside a space carry a tag in their stored name: ⟪slug|handle⟫name.
//
// Every list() is a billed "advanced operation" (the Hobby plan allows a few thousand a month), and
// members poll their space every 15 s: rosters and the space index are cached for minutes and
// re-read only when this instance changes them, never per request.
const ROSTER_TTL = 5 * 60_000;
const META_TTL = 10 * 60_000;
const INDEX_TTL = 5 * 60_000;

const hmac = (s: string) => createHmac("sha256", process.env.ORBIT_SECRET!).update(s).digest();
const key = () => hmac("spaces:key");

export interface SpaceMeta {
  slug: string;
  title: string;
  priv: boolean;
  pass: string | null;
  owner: string;
  at: number;
}

export const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
export const validSlug = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(s);
export const cleanHandle = (s: unknown) =>
  typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f⟪⟫|/;=]/g, "").replace(/\s+/g, " ").trim().slice(0, 24) : "";

export const devHash = (deviceId: string) => hmac(`dev:${deviceId}`).toString("hex").slice(0, 16);
export const tokenFor = (slug: string, dh: string) => hmac(`tok:${slug}:${dh}`).toString("base64url").slice(0, 32);
export const chanFor = (slug: string) => hmac(`chan:${slug}`).toString("hex").slice(0, 20);
const passHash = (slug: string, pass: string) => hmac(`pass:${slug}:${pass.normalize("NFKC")}`).toString("hex");
export const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// space meta at rest: AES-256-GCM, iv | tag | body
function seal(obj: unknown) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj)), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]);
}
function open<T>(buf: Buffer): T {
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString());
}

const metaCache = new Map<string, { at: number; meta: SpaceMeta | null }>();
export async function getMeta(slug: string): Promise<SpaceMeta | null> {
  const c = metaCache.get(slug);
  if (c && Date.now() - c.at < META_TTL) return c.meta;
  const r = await get(`sp/x/${slug}`, { access: "public", useCache: false }).catch(() => null);
  let meta: SpaceMeta | null = null;
  if (r && r.statusCode === 200) {
    try {
      meta = open<SpaceMeta>(Buffer.from(await new Response(r.stream).arrayBuffer()));
    } catch {
      meta = null;
    }
  }
  metaCache.set(slug, { at: Date.now(), meta });
  return meta;
}

export async function createSpace(title: string, priv: boolean, pass: string | null): Promise<{ meta: SpaceMeta; owner: string } | null> {
  const slug = slugify(title);
  if (!validSlug(slug)) return null;
  metaCache.delete(slug);
  if (await getMeta(slug)) return null;
  const owner = randomBytes(24).toString("base64url");
  const meta: SpaceMeta = { slug, title, priv, pass: priv && pass ? passHash(slug, pass) : null, owner: sha(owner), at: Date.now() };
  // allowOverwrite false: two people racing for the same name, only one wins
  try {
    await put(`sp/x/${slug}`, seal(meta), { access: "public", addRandomSuffix: false, contentType: "application/octet-stream", cacheControlMaxAge: 60 });
  } catch {
    return null;
  }
  metaCache.set(slug, { at: Date.now(), meta });
  slugCache = null;
  return { meta, owner };
}

export const checkPass = (meta: SpaceMeta, pass: unknown) => !meta.priv || (typeof pass === "string" && !!meta.pass && same(passHash(meta.slug, pass), meta.pass));
export const isOwner = (meta: SpaceMeta, owner: unknown) => typeof owner === "string" && owner.length > 10 && same(sha(owner), meta.owner);

async function listAll(prefix: string) {
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs.map((b) => b.pathname));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor && out.length < 5000);
  return out;
}

export interface Member { dh: string; handle: string }
const memberCache = new Map<string, { at: number; members: Member[]; kicked: Set<string> }>();
export async function roster(slug: string, fresh = false) {
  const c = memberCache.get(slug);
  if (!fresh && c && Date.now() - c.at < ROSTER_TTL) return c;
  const [m, k] = await Promise.all([listAll(`sp/m/${slug}/`), listAll(`sp/k/${slug}/`)]);
  const kicked = new Set(k.map((p) => p.split("/")[3]));
  const members = m
    .map((p) => {
      const [, , , dh, h] = p.split("/");
      let handle = h ?? "";
      try {
        handle = decodeURIComponent(handle);
      } catch {}
      return { dh, handle };
    })
    .filter((x) => x.dh && x.handle && !kicked.has(x.dh));
  const v = { at: Date.now(), members, kicked };
  memberCache.set(slug, v);
  return v;
}

export async function addMember(slug: string, dh: string, handle: string) {
  const r = await roster(slug, true);
  const old = r.members.filter((m) => m.dh === dh);
  await put(`sp/m/${slug}/${dh}/${encodeURIComponent(handle)}`, "1", { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain" });
  const stale = old.filter((m) => m.handle !== handle).map((m) => `sp/m/${slug}/${dh}/${encodeURIComponent(m.handle)}`);
  if (stale.length) await del(stale).catch(() => {});
  memberCache.delete(slug);
}

export async function removeMember(slug: string, dh: string, kick: boolean) {
  const r = await roster(slug, true);
  const paths = r.members.filter((m) => m.dh === dh).map((m) => `sp/m/${slug}/${dh}/${encodeURIComponent(m.handle)}`);
  if (kick) await put(`sp/k/${slug}/${dh}`, "1", { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain" });
  if (paths.length) await del(paths).catch(() => {});
  memberCache.delete(slug);
}

/** A device's pass into a space: its token matches, it is a member, it was not kicked. */
export async function member(slug: unknown, deviceId: unknown, token: unknown): Promise<{ slug: string; dh: string; handle: string } | null> {
  if (!validSlug(slug) || typeof deviceId !== "string" || !deviceId || typeof token !== "string") return null;
  const dh = devHash(deviceId);
  if (!same(tokenFor(slug, dh), token)) return null;
  const r = await roster(slug);
  if (r.kicked.has(dh)) return null;
  let me = r.members.find((m) => m.dh === dh);
  // joined through another server instance since this one cached the roster: one fresh read,
  // at most every 20 s per space, so a stream of unknown devices can't turn into a stream of lists
  if (!me && Date.now() - (lastFresh.get(slug) ?? 0) > 20_000) {
    lastFresh.set(slug, Date.now());
    me = (await roster(slug, true)).members.find((m) => m.dh === dh);
  }
  return me ? { slug, dh, handle: me.handle } : null;
}
const lastFresh = new Map<string, number>();

let slugCache: { at: number; slugs: string[] } | null = null;
export async function search(q: string) {
  if (!slugCache || Date.now() - slugCache.at > INDEX_TTL) slugCache = { at: Date.now(), slugs: (await listAll("sp/x/")).map((p) => p.slice(5)) };
  const s = slugify(q);
  const hits = slugCache.slugs
    .filter((x) => !s || x.includes(s))
    .sort((a, b) => Number(b.startsWith(s)) - Number(a.startsWith(s)) || a.length - b.length)
    .slice(0, 8);
  const metas = await Promise.all(hits.map(getMeta));
  return metas.filter((m): m is SpaceMeta => !!m).map((m) => ({ slug: m.slug, title: m.title, priv: m.priv }));
}

// ---- tags on transfer names ----
// Extra facts about an object ride in its stored name: ⟪s=slug;b=handle;t=10;o=1;g=ab12cd34ef⟫name
//   s: space, b: launched by (name in the space), t: lifetime in minutes (< 30), o: open (no passcode),
//   g: sender group (an anonymous per-device hash: one device's objects gather into one bubble)
// The old space-only form ⟪slug|handle⟫ is still read.
export interface Tags { space?: string; by?: string; life?: number; open?: boolean; from?: string }
const OLD = /^⟪([a-z0-9-]{1,32})\|([^⟫]{0,24})⟫/;
const NEW = /^⟪((?:[sbtog]=[^;⟫]*;?)*)⟫/;
export const validFrom = (x: unknown): x is string => typeof x === "string" && /^[a-f0-9]{10}$/.test(x);
export const LIFE_MIN = 30;
export const LIVES = [5, 10, 15, 20, 25, 30];

export function tagName(name: string, t: Tags) {
  const parts: string[] = [];
  if (t.space) parts.push(`s=${t.space}`);
  if (t.space && t.by) parts.push(`b=${t.by}`);
  if (t.life && t.life < LIFE_MIN) parts.push(`t=${t.life}`);
  if (t.open) parts.push("o=1");
  if (t.from) parts.push(`g=${t.from}`);
  return parts.length ? `⟪${parts.join(";")}⟫${name}` : name;
}

export type Untagged<T> = T & { space: string | null; by: string | null; life: number; open: boolean; from: string | null };
export function untag<T extends { name?: unknown; expiresAt?: unknown }>(o: T): Untagged<T> {
  const name = typeof o.name === "string" ? o.name : "";
  const old = OLD.exec(name);
  if (old) return { ...o, name: name.slice(old[0].length), space: old[1], by: old[2] || null, life: LIFE_MIN, open: false, from: null };
  const m = NEW.exec(name);
  if (!m) return { ...o, space: null, by: null, life: LIFE_MIN, open: false, from: null };
  const kv = Object.fromEntries(m[1].split(";").filter(Boolean).map((x) => [x[0], x.slice(2)]));
  const life = LIVES.includes(Number(kv.t)) ? Number(kv.t) : LIFE_MIN;
  const out = { ...o, name: name.slice(m[0].length), space: kv.s || null, by: kv.b || null, life, open: kv.o === "1", from: validFrom(kv.g) ? kv.g : null };
  // a shorter life burns earlier than the database's 30 minutes: the server hides it and refuses it from then on
  if (life < LIFE_MIN && typeof o.expiresAt === "string") {
    const t = Date.parse(o.expiresAt);
    if (Number.isFinite(t)) out.expiresAt = new Date(t - (LIFE_MIN - life) * 60_000).toISOString();
  }
  return out;
}
export const burnedUp = (o: { expiresAt?: unknown }) => typeof o.expiresAt === "string" && Date.parse(o.expiresAt) <= Date.now();

/** Every space with its people (admin HQ). */
export async function allSpaces(limit = 200) {
  const slugs = (await listAll("sp/x/")).map((p) => p.slice(5)).slice(0, limit);
  const out = await Promise.all(
    slugs.map(async (slug) => {
      const [meta, r] = await Promise.all([getMeta(slug), roster(slug)]);
      return meta ? { slug, title: meta.title, priv: meta.priv, at: meta.at, members: r.members.map((m) => m.handle), kicked: r.kicked.size } : null;
    }),
  );
  return out.filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.at - a.at);
}
