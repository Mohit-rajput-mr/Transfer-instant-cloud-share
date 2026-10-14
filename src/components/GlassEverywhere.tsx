"use client";
import { useEffect } from "react";
import { LiquidGlassEngine, type LiquidGlassOptions } from "liquid-glass-web-react";

/**
 * Every glass surface on the site (`.lg`, `.glass`: header, Send, menus, panels, pop-ups, dock,
 * bubbles, Exit…) is rendered by liquid-glass-web-react's LiquidGlassEngine.
 *
 * The engine refracts the content of the element it filters, so each surface gets its own lens
 * layer: a canvas holding the slice of the star sky that sits behind it (copied from the live
 * starfield a few times a second), filtered through a displacement map built from the surface's
 * size and corner radius. The lens layer sits under the surface's text and icons, which stay
 * sharp and clickable. The space card has its own, larger lens (SpaceLens) and is skipped here.
 */
const SEL = ".lg, .glass";
const SKIP = ".room-glass, .jar-box *";
const FPS = 20;

type Lens = {
  el: HTMLElement;
  host: HTMLDivElement;
  cv: HTMLCanvasElement;
  engine: LiquidGlassEngine;
  key: string;
  box: string;
};

const IS_SAFARI = typeof navigator !== "undefined" && /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

function lensOptions(w: number, h: number, radius: string): Partial<LiquidGlassOptions> {
  const m = Math.min(w, h);
  const px = parseFloat(radius);
  // a pill / circle (50%, 999px) is the engine's "auto"
  const r: number | "auto" = radius.includes("%") || !Number.isFinite(px) || px >= m / 2 - 1 ? "auto" : px;
  // the bend at the rim, in px; strength is a fraction of the filtered box, per axis
  const bend = Math.max(6, Math.min(26, m * 0.42));
  return {
    width: w,
    height: h,
    radius: r,
    strength: bend / Math.sqrt(w * h),
    depth: Math.round(Math.max(4, Math.min(24, m * 0.24))),
    curvature: 0.6,
    splay: 1,
    chromaticAberration: 0.5,
    // on a black sky the glass is seen by the light it catches: a bright rim, a glow pooled inside
    glow: 0.42,
    glowSpread: 0.7,
    glowExponent: 1.6,
    edgeHighlight: 1,
    edgeWidth: Math.max(1.5, Math.min(7, m * 0.1)),
    edgeExponent: 1.4,
    specular: 1.5,
    specularAngle: 60,
    quality: m < 80 && Math.max(w, h) < 320 ? 256 : 512,
  };
}

export default function GlassEverywhere() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    const lenses = new Map<HTMLElement, Lens>();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const detach = (l: Lens) => {
      l.engine.destroy();
      l.host.remove();
      l.el.removeAttribute("data-lgx");
      lenses.delete(l.el);
    };

    const attach = (el: HTMLElement) => {
      if (lenses.has(el) || el.matches(SKIP)) return;
      const host = document.createElement("div");
      host.className = "lgx";
      host.setAttribute("aria-hidden", "true");
      const filtered = document.createElement("div");
      filtered.className = "lgx-f";
      const cv = document.createElement("canvas");
      filtered.appendChild(cv);
      const defs = document.createElement("div");
      defs.className = "lgx-defs";
      host.append(filtered, defs);
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.setAttribute("data-lgx", "");
      el.appendChild(host);
      const engine = new LiquidGlassEngine({ container: host, filtered, defsHost: defs }, { width: 2, height: 2 });
      engine.setPosition(0.5, 0.5);
      lenses.set(el, { el, host, cv, engine, key: "", box: "" });
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SEL).forEach(attach);
    };

    // size / shape: regenerate the map only when they change
    const fit = (l: Lens) => {
      const w = l.host.clientWidth, h = l.host.clientHeight;
      if (w < 8 || h < 8) return false;
      const radius = getComputedStyle(l.el).borderTopLeftRadius;
      const key = `${w}x${h}:${radius}`;
      if (key !== l.key) {
        l.key = key;
        l.cv.width = Math.round(w * dpr);
        l.cv.height = Math.round(h * dpr);
        l.engine.setOptions(lensOptions(w, h, radius));
      }
      // The engine places its lens from the element's on-screen box, which includes transforms:
      // a surface measured mid-entrance (scaled down) needs placing again once it has settled.
      const r = l.host.getBoundingClientRect();
      const box = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (box !== l.box) {
        l.box = box;
        l.engine.refresh();
      }
      return true;
    };

    // what's behind each surface: its slice of the live star sky, on black
    const copy = (l: Lens, sky: HTMLCanvasElement | null) => {
      const r = l.host.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
      const g = l.cv.getContext("2d");
      if (!g) return;
      // the body of the glass: a faint lift off the black, so its shape reads
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "#0c0d11";
      g.fillRect(0, 0, l.cv.width, l.cv.height);
      if (sky && sky.clientWidth) {
        const k = sky.width / sky.clientWidth;
        // stars drawn twice, additively: brighter points make the bend at the rim visible
        g.globalCompositeOperation = "lighter";
        for (let i = 0; i < 2; i++) g.drawImage(sky, r.left * k, r.top * k, r.width * k, r.height * k, 0, 0, l.cv.width, l.cv.height);
        g.globalCompositeOperation = "source-over";
      }
      // Safari caches a filter's output by id: a refresh gives it a new one so the new sky shows
      if (IS_SAFARI) l.engine.refresh();
    };

    let raf = 0, last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 1000 / FPS || document.hidden) return;
      last = t;
      const sky = document.querySelector<HTMLCanvasElement>("canvas.stars");
      for (const l of [...lenses.values()]) {
        if (!l.el.isConnected || !l.el.matches(SEL) || l.el.matches(SKIP)) {
          detach(l);
          continue;
        }
        // React replaced the element's text (textContent): put the lens back
        if (l.host.parentNode !== l.el) l.el.appendChild(l.host);
        if (!l.el.hasAttribute("data-lgx")) l.el.setAttribute("data-lgx", "");
        if (fit(l)) copy(l, sky);
      }
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    raf = requestAnimationFrame(loop);
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
      [...lenses.values()].forEach(detach);
    };
  }, []);
  return null;
}
