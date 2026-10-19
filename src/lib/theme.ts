"use client";
import { useEffect, useState } from "react";

// /work: dark (default) or light, kept in this browser. The root layout's boot script applies it before the first paint
// of a direct /work load; VoidShell applies it on the in-place switch.
export type WorkTheme = "dark" | "light";
const KEY = "orbit:work-theme";
const EVT = "orbit:work-theme";

export const readTheme = (): WorkTheme => {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export function setTheme(t: WorkTheme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f7f7f6" : "#1b1b1c");
  try {
    localStorage.setItem(KEY, t);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVT, { detail: t }));
}

export function useTheme() {
  const [t, set] = useState<WorkTheme>("dark");
  useEffect(() => {
    set(readTheme());
    const on = (e: Event) => set((e as CustomEvent<WorkTheme>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return [t, (n: WorkTheme) => setTheme(n)] as const;
}
