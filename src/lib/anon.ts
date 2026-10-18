"use client";
// "Stay anonymous". Only the switch itself is kept on this device; every id used while anonymous is thrown away.
// Effective anon = the switch is on, or the active space is an anonymous space (everyone in it is anonymous).
// Side effects check isAnon() at call time; React state (useAnon) is only for drawing.
import { useSyncExternalStore } from "react";

const KEY = "orbit:anon"; // "1" while the switch is on (localStorage)
const SEEN = "orbit:anon-seen"; // the explainer was shown once (localStorage)
const TAB = "orbit:anon-tab"; // this tab's throwaway id (sessionStorage)
const EVT = "orbit:anon";

const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string | null) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
};

let on: boolean = typeof window !== "undefined" && lsGet(KEY) === "1";
let scoped: string | null = null; // anonId of the active anonymous space (lib/space.ts setActiveSpace)
let mem: string | null = null; // fallback when sessionStorage is blocked

const emit = () => {
  snap = { on, now: on || !!scoped };
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
};
let snap = { on, now: on || !!scoped };

export const anonSwitch = () => on;
export const isAnon = () => on || !!scoped;

export function setAnon(v: boolean) {
  on = v;
  lsSet(KEY, v ? "1" : null);
  if (!v) {
    try {
      sessionStorage.removeItem(TAB);
    } catch {}
    mem = null;
  }
  emit();
}

export function setScopedAnon(id: string | null) {
  if (scoped === id) return;
  scoped = id;
  emit();
}

export const newAnonId = () => crypto.randomUUID();

/** the id this device goes by while anonymous: the space's own (one per space), or this tab's throwaway one */
export function anonId(): string {
  if (scoped) return scoped;
  try {
    let id = sessionStorage.getItem(TAB);
    if (!id) {
      id = newAnonId();
      sessionStorage.setItem(TAB, id);
    }
    return id;
  } catch {
    return (mem ??= newAnonId());
  }
}

export const anonSeen = () => lsGet(SEEN) === "1";
export const markAnonSeen = () => lsSet(SEEN, "1");

const subscribe = (f: () => void) => {
  // other tabs follow at once
  const st = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    on = e.newValue === "1";
    snap = { on, now: on || !!scoped };
    f();
  };
  window.addEventListener(EVT, f);
  window.addEventListener("storage", st);
  return () => {
    window.removeEventListener(EVT, f);
    window.removeEventListener("storage", st);
  };
};
const SERVER = { on: false, now: false };

/** on: the switch; now: effective anon (switch or an anonymous space) */
export function useAnon(): { on: boolean; now: boolean } {
  return useSyncExternalStore(subscribe, () => snap, () => SERVER);
}
