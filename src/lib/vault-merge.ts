// The account vault's shape and how two copies merge (pure: tested in vault.test.ts; the browser side is lib/vault.ts).
// Merging only ever adds: something one device knows is never dropped because another device didn't know it yet.

/** a space pass: the session one device holds, and that device's id (its token only works for that id) */
export type VaultSpace = { slug: string; title: string; priv: boolean; work?: boolean; ends?: number | null; handle: string; token: string; chan: string; owner?: string; dev: string };
export type Trashed = { key: string; label: string; at: number };

export interface Vault {
  v: 1;
  /** owner keys of objects sent (orbit:own:<id>): manage or destroy them from any device */
  own: Record<string, string>;
  /** notes (orbit:bubbles) and tasks (orbit:tasks) this account made: edit, move, burn */
  bubbles: Record<string, string>;
  tasks: Record<string, string>;
  /** hidden on the map / the archive (orbit:trash) */
  trash: Trashed[];
  /** the name notes are signed with */
  name: string;
  spaces: VaultSpace[];
}

export const EMPTY: Vault = { v: 1, own: {}, bubbles: {}, tasks: {}, trash: [], name: "", spaces: [] };
const LIMIT = { own: 2000, map: 1000, trash: 500, spaces: 40 };

const obj = (x: unknown): Record<string, string> => {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(x)) if (typeof v === "string" && k.length <= 64 && v.length <= 256) out[k] = v;
  return out;
};
/** the newest `n` entries (insertion order is oldest first) */
const lastN = (m: Record<string, string>, n: number) => Object.fromEntries(Object.entries(m).slice(-n));

/** anything read from the server or another device, made safe to merge */
export function cleanVault(x: unknown): Vault {
  const v = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const trash = Array.isArray(v.trash) ? v.trash.filter((t): t is Trashed => !!t && typeof t.key === "string" && typeof t.label === "string" && Number.isFinite(t.at)) : [];
  const spaces = Array.isArray(v.spaces)
    ? v.spaces.filter((s): s is VaultSpace => !!s && typeof s.slug === "string" && typeof s.token === "string" && typeof s.dev === "string" && typeof s.chan === "string" && typeof s.title === "string")
    : [];
  return { v: 1, own: obj(v.own), bubbles: obj(v.bubbles), tasks: obj(v.tasks), trash, name: typeof v.name === "string" ? v.name.slice(0, 24) : "", spaces };
}

/** a ∪ b: `a` (this device) wins where both hold the same key */
export function mergeVault(a: Vault, b: Vault): Vault {
  const trash = new Map<string, Trashed>();
  for (const t of [...b.trash, ...a.trash]) {
    const had = trash.get(t.key);
    if (!had || t.at > had.at) trash.set(t.key, t);
  }
  const spaces = new Map<string, VaultSpace>();
  for (const s of [...b.spaces, ...a.spaces]) spaces.set(s.slug, s);
  return {
    v: 1,
    own: lastN({ ...b.own, ...a.own }, LIMIT.own),
    bubbles: lastN({ ...b.bubbles, ...a.bubbles }, LIMIT.map),
    tasks: lastN({ ...b.tasks, ...a.tasks }, LIMIT.map),
    trash: [...trash.values()].sort((x, y) => x.at - y.at).slice(-LIMIT.trash),
    name: a.name || b.name,
    spaces: [...spaces.values()].slice(-LIMIT.spaces),
  };
}

/** what `merged` holds that `local` doesn't (what this device has to write) */
export function missing(local: Vault, merged: Vault) {
  const diff = (l: Record<string, string>, m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([k]) => !(k in l)));
  const have = new Set(local.trash.map((t) => t.key));
  const slugs = new Set(local.spaces.map((s) => s.slug));
  return {
    own: diff(local.own, merged.own),
    bubbles: diff(local.bubbles, merged.bubbles),
    tasks: diff(local.tasks, merged.tasks),
    trash: merged.trash.filter((t) => !have.has(t.key)),
    name: !local.name && merged.name ? merged.name : "",
    spaces: merged.spaces.filter((s) => !slugs.has(s.slug)),
  };
}
