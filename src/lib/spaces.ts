import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { rpc } from "./server";
import { validSkin } from "./skin-list";

// Spaces: separate voids, kept in Supabase (supabase/migrations/004_spaces.sql) behind the same
// secret-gated functions as everything else:
//   spaces         slug -> meta, sealed with a key derived from ORBIT_SECRET (title, private, password hash, owner hash)
//   space_members  slug, dh (keyed hash of the device id), handle; leaving marks it gone
//   space_kicked   slug, dh
// Objects launched inside a space carry a tag in their stored name: ⟪s=slug;b=handle⟫name.
// Short caches keep the database calls to a trickle while members poll.
const ROSTER_TTL = 15_000;
const META_TTL = 60_000;
const INDEX_TTL = 60_000;

const hmac = (s: string) => createHmac("sha256", process.env.ORBIT_SECRET!).update(s).digest();
const key = () => hmac("spaces:key");

export interface SpaceMeta {
  slug: string;
  title: string;
  priv: boolean;
  pass: string | null;
  owner: string;
  at: number;
  /** an anonymous space (lib/anon.ts): random title, members go by aliases, never in search */
  anon?: boolean;
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
const unseal = (sealed: unknown): SpaceMeta | null => {
  if (typeof sealed !== "string" || !sealed) return null;
  try {
    return open<SpaceMeta>(Buffer.from(sealed, "base64"));
  } catch {
    return null;
  }
};
function open<T>(buf: Buffer): T {
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString());
}

// A named space (open or private) closes 8 hours after it was made: from then on it is gone everywhere (getMeta), and
// its name can be taken again (createSpace re-opens the row: migration 025 orbit_space_reopen ends the old one).
// Anonymous spaces burn with their anonymous session instead.
export const SPACE_LIFE_MS = 8 * 3600_000;
export const closesAt = (m: SpaceMeta) => (!m.anon ? m.at + SPACE_LIFE_MS : null);
const isClosed = (m: SpaceMeta) => {
  const c = closesAt(m);
  return c !== null && Date.now() >= c;
};

const metaCache = new Map<string, { at: number; meta: SpaceMeta | null }>();
async function rawMeta(slug: string): Promise<SpaceMeta | null> {
  const c = metaCache.get(slug);
  if (c && Date.now() - c.at < META_TTL) return c.meta;
  const sealed = await rpc<string | null>("orbit_space_get", { p_slug: slug }).catch(() => null);
  const meta = unseal(sealed);
  metaCache.set(slug, { at: Date.now(), meta });
  return meta;
}
/** the space, or null when there is none (or its 8 hours are up) */
export async function getMeta(slug: string): Promise<SpaceMeta | null> {
  const m = await rawMeta(slug);
  return m && !isClosed(m) ? m : null;
}

export async function createSpace(
  title: string, priv: boolean, pass: string | null, opts?: { slug?: string; anon?: boolean },
): Promise<{ meta: SpaceMeta; owner: string } | null> {
  const slug = opts?.slug ?? slugify(title);
  if (!validSlug(slug)) return null;
  // the anon- prefix is kept for anonymous spaces
  if (!opts?.anon && slug.startsWith("anon-")) return null;
  metaCache.delete(slug);
  const old = await rawMeta(slug);
  if (old && !isClosed(old)) return null;
  const owner = randomBytes(24).toString("base64url");
  const meta: SpaceMeta = { slug, title, priv, pass: priv && pass ? passHash(slug, pass) : null, owner: sha(owner), at: Date.now(), anon: !!opts?.anon };
  // two people racing for the same name: only one wins. A closed private space's name is taken over (its members,
  // files, notes and tasks end there)
  const won = old
    ? !opts?.anon && (await rpc<boolean>("orbit_space_reopen", { p_slug: slug, p_meta: seal(meta).toString("base64") }).catch(() => false))
    : await rpc<boolean>(opts?.anon ? "orbit_space_create_anon" : "orbit_space_create", { p_slug: slug, p_meta: seal(meta).toString("base64") }).catch(() => false);
  if (old) memberCache.delete(slug);
  if (!won) return null;
  metaCache.set(slug, { at: Date.now(), meta });
  slugCache = null;
  return { meta, owner };
}

/** a member's name in an anonymous space: Anon- and the start of their device hash, longer only when taken */
export function anonAlias(dh: string, taken: string[]) {
  const t = new Set(taken.map((x) => x.toLowerCase()));
  for (let n = 3; n <= 8; n++) {
    const a = "Anon-" + dh.slice(0, n).toUpperCase();
    if (!t.has(a.toLowerCase())) return a;
  }
  return "Anon-" + dh.slice(0, 8).toUpperCase();
}
export const isAnonSpace = async (slug: string) => (await getMeta(slug))?.anon === true;

export const checkPass = (meta: SpaceMeta, pass: unknown) => !meta.priv || (typeof pass === "string" && !!meta.pass && same(passHash(meta.slug, pass), meta.pass));
export const isOwner = (meta: SpaceMeta, owner: unknown) => typeof owner === "string" && owner.length > 10 && same(sha(owner), meta.owner);

export interface Member { dh: string; handle: string }
const memberCache = new Map<string, { at: number; members: Member[]; kicked: Set<string> }>();
export async function roster(slug: string, fresh = false) {
  const c = memberCache.get(slug);
  if (!fresh && c && Date.now() - c.at < ROSTER_TTL) return c;
  const r = await rpc<{ members: Member[]; kicked: string[] }>("orbit_space_roster", { p_slug: slug });
  const kicked = new Set(r?.kicked ?? []);
  const members = (r?.members ?? []).filter((x) => x.dh && x.handle && !kicked.has(x.dh));
  const v = { at: Date.now(), members, kicked };
  memberCache.set(slug, v);
  return v;
}

export async function addMember(slug: string, dh: string, handle: string) {
  await rpc("orbit_space_join", { p_slug: slug, p_dh: dh, p_handle: handle });
  memberCache.delete(slug);
}

export async function removeMember(slug: string, dh: string, kick: boolean) {
  await rpc("orbit_space_leave", { p_slug: slug, p_dh: dh, p_kick: kick });
  memberCache.delete(slug);
}

/** A device's pass into a space: its token matches, it is a member, it was not kicked. */
export async function member(slug: unknown, deviceId: unknown, token: unknown): Promise<{ slug: string; dh: string; handle: string } | null> {
  if (!validSlug(slug) || typeof deviceId !== "string" || !deviceId || typeof token !== "string") return null;
  const dh = devHash(deviceId);
  if (!same(tokenFor(slug, dh), token)) return null;
  // a space whose 8 hours are up lets nobody in (no read, no send)
  if (!(await getMeta(slug))) return null;
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

type IndexRow = { slug: string; meta: string; members: string[]; kicked: number };
let slugCache: { at: number; rows: IndexRow[] } | null = null;
async function index() {
  if (!slugCache || Date.now() - slugCache.at > INDEX_TTL)
    slugCache = { at: Date.now(), rows: (await rpc<IndexRow[]>("orbit_space_index", {}).catch(() => null)) ?? [] };
  return slugCache.rows;
}
export async function search(q: string) {
  const s = slugify(q);
  // anonymity is read from the sealed meta only (a named space made before the anon- prefix was reserved can use it)
  const out: { slug: string; title: string; priv: boolean }[] = [];
  const rows = (await index())
    .filter((x) => !s || x.slug.includes(s))
    .sort((a, b) => Number(b.slug.startsWith(s)) - Number(a.slug.startsWith(s)) || a.slug.length - b.slug.length);
  for (const h of rows) {
    const m = unseal(h.meta);
    if (!m || m.anon || isClosed(m)) continue;
    out.push({ slug: m.slug, title: m.title, priv: m.priv });
    if (out.length >= 8) break;
  }
  return out;
}

// ---- tags on transfer names ----
// Extra facts about an object ride in its stored name: ⟪s=slug;b=handle;t=10;o=1;g=ab12cd34ef⟫name
//   s: space, b: launched by (name in the space), t: lifetime in minutes (< 30), o: open (no passcode),
//   g: sender group (an anonymous per-device hash: one device's objects gather into one bubble), n: its name,
//   k: the sender's style (how the object looks to everyone; see lib/skin-list.ts), p: has a preview picture,
//   a: sent anonymously (cloud only; open ones are encrypted with the anonymous space's key)
// The old space-only form ⟪slug|handle⟫ is still read.
export interface Tags { space?: string; by?: string; life?: number; open?: boolean; from?: string; group?: string; skin?: string; thumb?: boolean; task?: string; anon?: boolean }
/** a task id (lib/tasks.ts): files wired to it carry it */
export const validTask = (x: unknown): x is string => typeof x === "string" && /^t[a-z0-9]{9}$/.test(x);
const OLD = /^⟪([a-z0-9-]{1,32})\|([^⟫]{0,24})⟫/;
const NEW = /^⟪((?:[sbtognkpwa]=[^;⟫]*;?)*)⟫/;
/** a bubble's name, safe inside a tag */
export const cleanGroup = (x: unknown) => (typeof x === "string" ? x.replace(/[\u0000-\u001f\u007f⟪⟫;=|]/g, "").replace(/\s+/g, " ").trim().slice(0, 40) : "");
export const validFrom = (x: unknown): x is string => typeof x === "string" && /^[a-f0-9]{10}$/.test(x);
export const LIFE_MIN = 30;
export const LIVES = [5, 10, 15, 20, 25, 30];

export function tagName(name: string, t: Tags) {
  const parts: string[] = [];
  if (t.space) parts.push(`s=${t.space}`);
  if (t.by) parts.push(`b=${t.by}`);
  if (t.life && t.life < LIFE_MIN) parts.push(`t=${t.life}`);
  if (t.open) parts.push("o=1");
  if (t.from) parts.push(`g=${t.from}`);
  if (t.from && t.group) parts.push(`n=${t.group}`);
  if (t.skin && validSkin(t.skin) && t.skin !== "orbit") parts.push(`k=${t.skin}`);
  if (t.thumb && t.open) parts.push("p=1");
  if (t.task && validTask(t.task)) parts.push(`w=${t.task}`);
  if (t.anon) parts.push("a=1");
  return parts.length ? `⟪${parts.join(";")}⟫${name}` : name;
}

export type Untagged<T> = T & { space: string | null; by: string | null; life: number; open: boolean; from: string | null; groupName: string | null; skin: string | null; thumb: boolean; task: string | null; anon: boolean };
export function untag<T extends { name?: unknown; expiresAt?: unknown }>(o: T): Untagged<T> {
  const name = typeof o.name === "string" ? o.name : "";
  const old = OLD.exec(name);
  if (old) return { ...o, name: name.slice(old[0].length), space: old[1], by: old[2] || null, life: LIFE_MIN, open: false, from: null, groupName: null, skin: null, thumb: false, task: null, anon: false };
  const m = NEW.exec(name);
  if (!m) return { ...o, space: null, by: null, life: LIFE_MIN, open: false, from: null, groupName: null, skin: null, thumb: false, task: null, anon: false };
  const kv = Object.fromEntries(m[1].split(";").filter(Boolean).map((x) => [x[0], x.slice(2)]));
  const life = LIVES.includes(Number(kv.t)) ? Number(kv.t) : LIFE_MIN;
  const out = { ...o, name: name.slice(m[0].length), space: kv.s || null, by: kv.b || null, life, open: kv.o === "1", from: validFrom(kv.g) ? kv.g : null, groupName: cleanGroup(kv.n) || null, skin: validSkin(kv.k) ? kv.k : null, thumb: kv.p === "1" && kv.o === "1", task: validTask(kv.w) ? kv.w : null, anon: kv.a === "1" };
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
  slugCache = null;
  return (await index())
    .slice(0, limit)
    .map((r) => {
      const meta = unseal(r.meta);
      return meta ? { slug: r.slug, title: meta.title, priv: meta.priv, anon: !!meta.anon, at: meta.at, members: r.members, kicked: r.kicked } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

/** What is posted in a named space lives as long as the space (up to its 8-hour close), not the usual 15-30 minutes
 *  (migration 026 orbit_space_extend). kind: o file, b note, t task. */
export async function liveWithSpace(slug: string | null | undefined, kind: "o" | "b" | "t", id: string) {
  if (!slug) return;
  const m = await getMeta(slug);
  const until = m && closesAt(m);
  if (!until) return;
  await rpc("orbit_space_extend", { p_slug: slug, p_kind: kind, p_id: id, p_until: new Date(until).toISOString() }).catch(() => {});
}
