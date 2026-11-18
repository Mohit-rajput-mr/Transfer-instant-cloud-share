"use client";
// Logged in, every device of the account sees and manages the same things (owner 2026-11-18): the objects it sent
// (owner keys), its notes and tasks, its spaces, its trash/archive and its name. Each device merges its own copy
// with the account's sealed vault (/api/account/vault, migration 037) on login, every minute, and when the tab hides.
// Merging only adds. Anonymous spaces never leave the device.
import { auth, authFetch } from "./auth";
import { persistentId } from "./client";
import { remember, savedSpaces, type SpaceSession } from "./space";
import { EMPTY, cleanVault, mergeVault, missing, type Vault, type VaultSpace } from "./vault-merge";

const ls = () => (typeof localStorage === "undefined" ? null : localStorage);
const json = <T,>(k: string, d: T): T => {
  try {
    const v = ls()?.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};

/** this device's copy */
async function collect(): Promise<Vault> {
  const own: Record<string, string> = {};
  const s = ls();
  if (s)
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith("orbit:own:")) {
        const v = s.getItem(k);
        if (v) own[k.slice(10)] = v;
      }
    }
  const dev = persistentId();
  const spaces: VaultSpace[] = (await savedSpaces().catch(() => [] as SpaceSession[]))
    .filter((x) => !x.anon)
    .map((x) => ({ slug: x.slug, title: x.title, priv: x.priv, work: x.work, ends: x.ends ?? null, handle: x.handle, token: x.token, chan: x.chan, owner: x.owner, dev }));
  return cleanVault({ own, bubbles: json("orbit:bubbles", {}), tasks: json("orbit:tasks", {}), trash: json("orbit:trash", []), name: s?.getItem("orbit:bubble-name") ?? "", spaces });
}

/** write what the account knows and this device doesn't; spaces get this device's own pass */
async function apply(local: Vault, merged: Vault) {
  const need = missing(local, merged);
  const s = ls();
  let changed = false;
  if (s) {
    const put = (k: string, v: string) => {
      s.setItem(k, v);
      changed = true;
    };
    for (const [id, key] of Object.entries(need.own)) put(`orbit:own:${id}`, key);
    if (Object.keys(need.bubbles).length) put("orbit:bubbles", JSON.stringify({ ...json("orbit:bubbles", {}), ...need.bubbles }));
    if (Object.keys(need.tasks).length) put("orbit:tasks", JSON.stringify({ ...json("orbit:tasks", {}), ...need.tasks }));
    if (need.trash.length) put("orbit:trash", JSON.stringify([...json<unknown[]>("orbit:trash", []), ...need.trash]));
    if (need.name) put("orbit:bubble-name", need.name);
  }
  const me = persistentId();
  for (const sp of need.spaces) {
    if (sp.ends && sp.ends < Date.now()) continue;
    // the pass belongs to the device that made it: ask for this device's own
    const r = await authFetch(`/api/spaces/${sp.slug}/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDevice: sp.dev, fromToken: sp.token, deviceId: me, handle: sp.handle }),
    }).catch(() => null);
    if (!r?.ok) continue;
    const p = (await r.json()) as { token: string; chan: string; handle: string };
    await remember({ slug: sp.slug, title: sp.title, priv: sp.priv, work: sp.work, ends: sp.ends, handle: p.handle, token: p.token, chan: p.chan, owner: sp.owner });
    changed = true;
  }
  // open screens pick it up (spaces list, ownership, trash)
  if (changed) window.dispatchEvent(new CustomEvent("orbi:vault"));
  return changed;
}

let running: Promise<void> | null = null;
let lastSent = "";
/** one round: pull, merge, write locally, push the merged copy if it changed */
export function syncVault() {
  return (running ??= (async () => {
    try {
      const { data } = await auth.getSession();
      if (!data.session) return;
      const r = await authFetch("/api/account/vault", { cache: "no-store" });
      if (!r.ok) return;
      const remote = cleanVault(await r.json().catch(() => EMPTY));
      const local = await collect();
      const merged = mergeVault(local, remote);
      await apply(local, merged);
      // spaces now hold this device's own pass: send that one, so the account keeps a working pass per space
      const out = JSON.stringify(mergeVault(await collect(), merged));
      if (out !== lastSent && out !== JSON.stringify(remote)) {
        const p = await authFetch("/api/account/vault", { method: "PUT", headers: { "Content-Type": "application/json" }, body: out }).catch(() => null);
        if (p?.ok) lastSent = out;
      } else lastSent = out;
    } finally {
      running = null;
    }
  })());
}

let started = false;
/** start syncing on this page: now, on login, every minute, and when the tab is hidden */
export function startVaultSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  void syncVault();
  auth.onAuthStateChange((e) => {
    if (e === "SIGNED_IN") void syncVault();
    if (e === "SIGNED_OUT") lastSent = "";
  });
  setInterval(() => void syncVault(), 60_000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && void syncVault());
}
