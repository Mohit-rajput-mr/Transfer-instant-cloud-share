"use client";
import { useEffect, useState } from "react";

// Styles: how a dropped object looks in the void. Pure CSS (the "Styles" block at the end of globals.css),
// switched by a data-skin attribute on the void, the zoomed container and each preview tile.
// The pick is kept in this browser; with the visitor's OK it is also remembered for this computer
// (every browser on it) and can be carried anywhere with a short style code. No login, no personal data.

import { DEFAULT_SKIN, validSkin } from "./skin-list";
export * from "./skin-list";

const KEY = "orbit:skin";
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
export const deviceSync = () => get(SYNC) === "1";

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

export function setSkin(id: string) {
  if (!validSkin(id)) return;
  put(KEY, id);
  window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
  if (deviceSync()) void prefsApi({ action: "save", traits: traits(), prefs: { skin: id } });
}

/** turn "remember on this computer (every browser)" on or off */
export async function setDeviceSync(on: boolean) {
  put(SYNC, on ? "1" : null);
  await prefsApi({ action: on ? "save" : "forget", traits: traits(), prefs: { skin: pickedSkin() ?? DEFAULT_SKIN } });
}

/** a browser that never picked a style: the one remembered for this computer, if there is one */
export async function findDeviceSkin(): Promise<string | null> {
  if (pickedSkin()) return null;
  const r = await prefsApi<{ prefs: { skin?: string } | null }>({ action: "find", traits: traits() });
  const id = r?.prefs?.skin;
  if (!validSkin(id)) return null;
  put(KEY, id);
  put(SYNC, "1");
  window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
  return id;
}

/** a short code that carries the style to any browser or device */
export async function makeStyleCode(): Promise<string | null> {
  const r = await prefsApi<{ code: string }>({ action: "code", prefs: { skin: pickedSkin() ?? DEFAULT_SKIN } });
  return r?.code ?? null;
}
export async function redeemStyleCode(code: string): Promise<string | null> {
  const r = await prefsApi<{ prefs: { skin?: string } | null }>({ action: "redeem", code: code.trim().toUpperCase() });
  const id = r?.prefs?.skin;
  if (!validSkin(id)) return null;
  setSkin(id);
  return id;
}

/** the current style, following changes from the picker and from other tabs */
export function useSkin() {
  const [skin, set] = useState(DEFAULT_SKIN);
  useEffect(() => {
    set(pickedSkin() ?? DEFAULT_SKIN);
    const on = (e: Event) => set((e as CustomEvent<string>).detail);
    const st = (e: StorageEvent) => e.key === KEY && validSkin(e.newValue) && set(e.newValue);
    window.addEventListener(EVT, on);
    window.addEventListener("storage", st);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", st);
    };
  }, []);
  return skin;
}
