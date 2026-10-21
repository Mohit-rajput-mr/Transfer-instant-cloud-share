"use client";
import { useLayoutEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Void from "./Void";
import { readTheme } from "@/lib/theme";
import { speakWork } from "@/lib/words";
import { rememberClassic } from "@/lib/view";
import { langOf } from "@/lib/seo";

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

  // html[lang] is the page's language (/fr → fr), for screen readers, translation and search; the app chrome stays
  // left-to-right (only the Arabic guide, SeoContent, is dir="rtl": the void's English controls must not mirror)
  useLayoutEffect(() => {
    document.documentElement.lang = work ? "en" : langOf(path);
    return () => void (document.documentElement.lang = "en");
  }, [path, work]);

  // the switch keeps the loaded page's metadata: give the tab the title this view's own load would have
  useLayoutEffect(() => {
    if (!work) rememberClassic(path);
    const want = titles[work ? "/work" : path] ?? titles["/"];
    // a running download shows "(42%) " in front (DownloadCard): keep it
    const pct = document.title.match(/^\(\d+%\) /)?.[0] ?? "";
    if (want && document.title !== pct + want) document.title = pct + want;
  }, [path, work, titles]);

  return (
    <>
      <Void ui={work ? "work" : undefined} />
      {children}
    </>
  );
}
