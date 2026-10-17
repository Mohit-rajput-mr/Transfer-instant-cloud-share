"use client";
import { useEffect } from "react";
import { readTheme } from "@/lib/theme";

/** The work look on a page reached inside the app (no full load, so the page's boot script never ran). */
export default function WorkLook({ fonts }: { fonts: string }) {
  useEffect(() => {
    const d = document.documentElement;
    const cls = fonts.split(" ").filter(Boolean);
    d.dataset.ui = "work";
    d.dataset.theme = readTheme();
    d.classList.add(...cls);
    return () => {
      delete d.dataset.ui;
      delete d.dataset.theme;
    };
  }, [fonts]);
  return null;
}
