"use client";
import { useSyncExternalStore } from "react";

// This browser's own trash: anything on the map (a ball, a bubble stack, a task panel) dragged onto the trash zone
// is hidden here only, never for anyone else. Kept in localStorage; restored from the trash list.
// Keys are the map keys: "o:<object id>", "b:<bubble sender>", "t:<task panel>".
// A key that stands for a sender (a container "o:g-<sender>", a bubble stack "b:<sender>") hides only what that sender
// had made by the time it went in (see trashedAt): what they send later still shows.

export type Trashed = { key: string; label: string; at: number };
const KEY = "orbit:trash";

const load = (): Trashed[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((t) => t && typeof t.key === "string") : [];
  } catch {
    return [];
  }
};
let list: Trashed[] = typeof window === "undefined" ? [] : load();
let keys = new Set(list.map((t) => t.key));
// (an entry without a time hides everything, as it always did)
const whenOf = () => new Map(list.map((t) => [t.key, Number.isFinite(t.at) ? t.at : Infinity]));
let when = whenOf();
const subs = new Set<() => void>();
const save = (next: Trashed[]) => {
  list = next.slice(-500);
  keys = new Set(list.map((t) => t.key));
  when = whenOf();
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  subs.forEach((f) => f());
};

export function toTrash(key: string, label: string) {
  save([...list.filter((t) => t.key !== key), { key, label: label.trim().slice(0, 80) || "Something", at: Date.now() }]);
}
/** one thing back (or everything, without a key) */
export function restore(key?: string) {
  save(key ? list.filter((t) => t.key !== key) : []);
}

const subscribe = (f: () => void) => (subs.add(f), () => void subs.delete(f));
const EMPTY = new Set<string>();
/** the trashed keys: re-renders when something goes in or comes back */
export const useTrash = () => useSyncExternalStore(subscribe, () => keys, () => EMPTY);
export const useTrashList = () => useSyncExternalStore(subscribe, () => list, () => [] as Trashed[]);

// ---- the drop zone: shown while anything is dragged, grows when the pointer comes close ----
let zone: HTMLElement | null = null;
export const setZone = (el: HTMLElement | null) => void (zone = el);
/** a drag is under way at this screen point (null: it ended) */
export function dragAt(x: number | null, y?: number) {
  window.dispatchEvent(new CustomEvent("orbit:drag", { detail: x == null ? null : { x, y } }));
}
/** close enough to the zone to drop into it */
export function overTrash(x: number, y: number) {
  const r = zone?.getBoundingClientRect();
  if (!r || !r.width) return false;
  return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < r.width / 2 + 36;
}

/** when a key went in (this device's clock), 0 when it is not in; re-read on useTrash()'s re-render */
export const trashedAt = (key: string) => when.get(key) ?? 0;

/** what an archived key was called when it went in */
export const trashLabel = (key: string) => list.find((t) => t.key === key)?.label ?? "this";
