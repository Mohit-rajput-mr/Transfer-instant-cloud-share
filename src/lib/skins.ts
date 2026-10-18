"use client";
import { useEffect, useState } from "react";

// Styles: how a dropped object looks in the void. Pure CSS (the "Styles" block at the end of globals.css),
// switched by a data-skin attribute on the void, the zoomed container and each preview tile.
// The pick is kept in this browser; with the visitor's OK it is also remembered for this computer
// (every browser on it) and can be carried anywhere with a short style code. No login, no personal data.

import { isAnon } from "./anon";
import { DEFAULT_PALETTE, DEFAULT_SKIN, validPalette, validSkin } from "./skin-list";
export * from "./skin-list";

/**
 * Testing mode: the look is remembered for this computer (every browser on it) automatically, once the visitor
 * does anything at all on the page (a click, a tap, a scroll, a key). For the public launch set this to false:
 * the Style picker then shows a one-tap "Remember on this computer" switch instead.
 */
export const AUTO_DEVICE = true;

const KEY = "orbit:skin";
const PAL = "orbit:pal";
const SYNC = "orbit:skin-device";
const EVT = "orbit:skin";
const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const put = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
};

/** the style picked in this browser (null: never picked here) */
export const pickedSkin = () => {
  const v = get(KEY);
  return validSkin(v) ? v : null;
};
export const pickedPalette = () => {
  const v = get(PAL);
  return validPalette(v) ? v : null;
};
export const deviceSync = () => AUTO_DEVICE || get(SYNC) === "1";
const look = () => ({ skin: pickedSkin() ?? DEFAULT_SKIN, pal: pickedPalette() ?? DEFAULT_PALETTE });
const announce = () => window.dispatchEvent(new CustomEvent(EVT, { detail: look() }));

/** Traits that are the same in every browser on one computer (and say nothing about the person). */
function traits() {
  const s = window.screen;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return {
    screen: `${s.width}x${s.height}x${s.colorDepth}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    platform: nav.userAgentData?.platform || navigator.platform || "",
    cores: navigator.hardwareConcurrency || 0,
    touch: navigator.maxTouchPoints || 0,
  };
}
async function prefsApi<T>(body: Record<string, unknown>): Promise<T | null> {
  const r = await fetch("/api/prefs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return r && r.ok ? ((await r.json()) as T) : null;
}

const saveDevice = () => void prefsApi({ action: "save", traits: traits(), prefs: look() });

export function setSkin(id: string) {
  if (!validSkin(id)) return;
  put(KEY, id);
  announce();
  // anonymous: the look stays in this browser only
  if (deviceSync() && !isAnon()) saveDevice();
}
export function setPalette(id: string) {
  if (!validPalette(id)) return;
  put(PAL, id);
  announce();
  if (deviceSync() && !isAnon()) saveDevice();
}

/** testing mode: after the first thing the visitor does here, remember this browser's look for the computer */
export function autoRemember() {
  if (!AUTO_DEVICE || isAnon()) return () => {};
  const evs = ["pointerdown", "keydown", "wheel", "scroll", "touchstart"] as const;
  const once = () => {
    off();
    if (!isAnon() && (pickedSkin() || pickedPalette())) saveDevice();
  };
  const off = () => evs.forEach((e) => window.removeEventListener(e, once));
  evs.forEach((e) => window.addEventListener(e, once, { passive: true, once: true }));
  return off;
}

/** turn "remember on this computer (every browser)" on or off */
export async function setDeviceSync(on: boolean) {
  put(SYNC, on ? "1" : null);
  if (isAnon()) return;
  await prefsApi({ action: on ? "save" : "forget", traits: traits(), prefs: look() });
}

/** a browser that never picked a style: the one remembered for this computer, if there is one */
export async function findDeviceSkin(): Promise<string | null> {
  if (isAnon() || pickedSkin() || pickedPalette()) return null;
  const r = await prefsApi<{ prefs: { skin?: string; pal?: string } | null }>({ action: "find", traits: traits() });
  const id = r?.prefs?.skin;
  if (!validSkin(id)) return null;
  put(KEY, id);
  if (validPalette(r?.prefs?.pal)) put(PAL, r!.prefs!.pal!);
  if (!AUTO_DEVICE) put(SYNC, "1");
  announce();
  return id;
}

/** turning anonymous on: Orbi forgets the look it remembered for this computer (its traits key) */
export const forgetDeviceLook = () => prefsApi({ action: "forget", traits: traits() });

/** a short code that carries the style to any browser or device */
export async function makeStyleCode(): Promise<string | null> {
  const r = await prefsApi<{ code: string }>({ action: "code", prefs: look() });
  return r?.code ?? null;
}
export async function redeemStyleCode(code: string): Promise<string | null> {
  const r = await prefsApi<{ prefs: { skin?: string; pal?: string } | null }>({ action: "redeem", code: code.trim().toUpperCase() });
  const id = r?.prefs?.skin;
  if (!validSkin(id)) return null;
  if (validPalette(r?.prefs?.pal)) put(PAL, r!.prefs!.pal!);
  setSkin(id);
  return id;
}

/** the current look (style + colours), following changes from the picker and from other tabs */
export function useLook() {
  const [cur, set] = useState({ skin: DEFAULT_SKIN, pal: DEFAULT_PALETTE });
  useEffect(() => {
    set(look());
    const on = (e: Event) => set((e as CustomEvent<{ skin: string; pal: string }>).detail);
    const st = (e: StorageEvent) => (e.key === KEY || e.key === PAL) && set(look());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", st);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", st);
    };
  }, []);
  return cur;
}
