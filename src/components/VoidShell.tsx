"use client";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Void from "./Void";
import { readTheme } from "@/lib/theme";
import { speakWork } from "@/lib/words";
import { rememberClassic } from "@/lib/view";

const isWork = (path: string) => /^\/work(\/|$)/.test(path);
const COLOR = { classic: "#000000", dark: "#1b1b1c", light: "#f7f7f6" } as const;

/**
 * The one <Void> behind /, /[lang] and /work (app/(void)/layout.tsx). The look follows the address, so the
 * Work ↔ Classic switch (lib/view.ts) flips it in place: nothing remounts, nothing reloads.
 * The only owner of html[data-ui] / [data-theme], the theme-color and the work wording; set in a layout effect so
 * neither look paints for a frame with the other's styles (the root layout's boot script covers a direct /work load).
 */
export default function VoidShell({ titles, children }: { titles: Record<string, string>; children: ReactNode }) {
  const path = usePathname();
  const work = isWork(path);

  useLayoutEffect(() => {
    const d = document.documentElement;
    const meta = () => document.querySelector('meta[name="theme-color"]');
    if (work) {
      d.dataset.ui = "work";
      d.dataset.theme = readTheme();
    } else {
      delete d.dataset.ui;
      delete d.dataset.theme;
    }
    meta()?.setAttribute("content", work ? COLOR[d.dataset.theme === "light" ? "light" : "dark"] : COLOR.classic);
    // /work's plain office words (lib/words.ts); stopping puts the classic words back
    const quiet = work ? speakWork() : null;
    return () => {
      quiet?.();
      // flipping back, or leaving the void (About, Upgrade): the page underneath is the classic one again
      if (!work) return;
      delete d.dataset.ui;
      delete d.dataset.theme;
      meta()?.setAttribute("content", COLOR.classic);
    };
  }, [work]);

  // the switch keeps the loaded page's metadata: give the tab the title this view's own load would have
  useLayoutEffect(() => {
    if (!work) rememberClassic(path);
    const want = titles[work ? "/work" : path] ?? titles["/"];
    // a running download shows "(42%) " in front (DownloadCard): keep it
    const pct = document.title.match(/^\(\d+%\) /)?.[0] ?? "";
    if (want && document.title !== pct + want) document.title = pct + want;
  }, [path, work, titles]);

  // the first switch to Work should not flash the fallback type: fetch Geist once the browser is idle (not preloaded)
  useEffect(() => {
    if (work || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const warm = () => {
      const css = getComputedStyle(document.documentElement);
      for (const v of ["--font-work", "--font-work-mono"]) {
        const f = css.getPropertyValue(v).trim();
        if (f) document.fonts?.load(`1em ${f}`).catch(() => {});
      }
    };
    const t = setTimeout(() => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(warm, { timeout: 5000 }) : warm()), 4000);
    return () => clearTimeout(t);
  }, [work]);

  return (
    <>
      <Void ui={work ? "work" : undefined} />
      {children}
    </>
  );
}
