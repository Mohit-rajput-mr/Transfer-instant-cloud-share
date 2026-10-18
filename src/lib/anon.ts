"use client";
// "Stay anonymous". Only the switch itself is kept on this device; every id used while anonymous is thrown away.
// Effective anon = the switch is on, or the active space is an anonymous space (everyone in it is anonymous).
// Side effects check isAnon() at call time; React state (useAnon) is only for drawing.
import { useSyncExternalStore } from "react";

const KEY = "orbit:anon"; // "1" while the switch is on (localStorage)
const SEEN = "orbit:anon-seen"; // the explainer was shown once (localStorage)
const TAB = "orbit:anon-tab"; // this tab's throwaway id (sessionStorage)
const EVT = "orbit:anon";
const SESS = "orbit:anon-sess"; // the running session: { id, start, ends, min } (localStorage, gone when it burns)

/** one anonymous session: picked for 5 to 30 minutes, then it burns (lib/anon.ts endAnon in Void) */
export interface AnonSession {
  /** random, secret: the server files the session's record and its spaces under it */
  id: string;
  start: number;
  ends: number;
  min: number;
}
export const ANON_MINUTES = [5, 10, 15, 20, 30] as const;
export const aliasOf = (id: string) => `Anon-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

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
const readSess = (): AnonSession | null => {
  try {
    const v = JSON.parse(lsGet(SESS) || "null") as AnonSession | null;
    return v && typeof v.id === "string" && v.ends > 0 ? v : null;
  } catch {
    return null;
  }
};
let sess: AnonSession | null = on ? readSess() : null;
let scoped: string | null = null; // anonId of the active anonymous space (lib/space.ts setActiveSpace)
let mem: string | null = null; // fallback when sessionStorage is blocked

const emit = () => {
  snap = { on, now: on || !!scoped, sess };
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
};
let snap: AnonSnap = { on, now: on || !!scoped, sess };
type AnonSnap = { on: boolean; now: boolean; sess: AnonSession | null };

export const anonSwitch = () => on;
export const isAnon = () => on || !!scoped;

export const anonSession = () => sess;

/** on: starts a session of `min` minutes (clamped to 5..30); off: the session is over */
export function setAnon(v: boolean, min = 30) {
  on = v;
  lsSet(KEY, v ? "1" : null);
  if (v) {
    const m = Math.max(5, Math.min(30, Math.round(min)));
    const start = Date.now();
    sess = { id: newAnonId(), start, ends: start + m * 60_000, min: m };
    lsSet(SESS, JSON.stringify(sess));
    lsSet(LAST, String(m));
  } else {
    sess = null;
    lsSet(SESS, null);
  }
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

const LAST = "orbit:anon-min"; // the length picked last time (the picker starts there)
export const lastMinutes = () => {
  const n = Number(lsGet(LAST));
  return (ANON_MINUTES as readonly number[]).includes(n) ? n : 30;
};

export const anonSeen = () => lsGet(SEEN) === "1";
export const markAnonSeen = () => lsSet(SEEN, "1");

const subscribe = (f: () => void) => {
  // other tabs follow at once
  const st = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== SESS) return;
    on = lsGet(KEY) === "1";
    sess = on ? readSess() : null;
    snap = { on, now: on || !!scoped, sess };
    f();
  };
  window.addEventListener(EVT, f);
  window.addEventListener("storage", st);
  return () => {
    window.removeEventListener(EVT, f);
    window.removeEventListener("storage", st);
  };
};
const SERVER: AnonSnap = { on: false, now: false, sess: null };

/** on: the switch; now: effective anon (switch or an anonymous space); sess: the running session (switch only) */
export function useAnon(): AnonSnap {
  return useSyncExternalStore(subscribe, () => snap, () => SERVER);
}
