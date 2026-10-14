"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LiquidGlass } from "liquid-glass-web-react";

/**
 * A space's glass jar, rendered by liquid-glass-web-react: a lens whose displacement map is
 * built from the card's own rounded shape (curvature → dome, depth → thick refracting rim), and
 * whose SVG feDisplacementMap bends the live content painted inside it — the star sky and the
 * spheres — with chromatic fringing and a baked specular rim. Works in Chrome, Safari and
 * Firefox because it filters the content itself, not the backdrop.
 *
 * The lens covers the pane drawn by SpaceRoom (.room-glass.glass); it is measured from it so
 * every layout (desktop, phone flow, landscape) keeps the exact size and position.
 */
export default function SpaceLens({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number; r: number; vw: number; vh: number } | null>(null);

  useEffect(() => {
    const root = box.current?.closest(".void") as HTMLElement | null;
    if (!root) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const pane = root.querySelector<HTMLElement>(".room-glass.glass");
      if (!pane) return;
      const v = root.getBoundingClientRect(), p = pane.getBoundingClientRect();
      if (!v.width || !v.height || p.width < 40 || p.height < 40) return;
      const next = {
        x: (p.left - v.left + p.width / 2) / v.width,
        y: (p.top - v.top + p.height / 2) / v.height,
        w: Math.round(p.width),
        h: Math.round(p.height),
        r: parseFloat(getComputedStyle(pane).borderTopLeftRadius) || 30,
        vw: Math.round(v.width),
        vh: Math.round(v.height),
      };
      setLens((o) => (o && o.w === next.w && o.h === next.h && o.r === next.r && o.vw === next.vw && o.vh === next.vh && Math.abs(o.x - next.x) < 1e-4 && Math.abs(o.y - next.y) < 1e-4 ? o : next));
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(ask);
    ro.observe(root);
    const pane = root.querySelector(".room-glass.glass");
    if (pane) ro.observe(pane);
    measure();
    // the pane fades/settles in with the room; pick up its final box
    const t = setTimeout(ask, 900);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  // The filter runs on every composite. A device that can't keep the page smooth with it (no GPU,
  // a weak phone) gets the same layout without the lens: plain glass beats a stuttering void.
  const [lite, setLite] = useState(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-transparency: reduce)").matches) {
      setLite(true);
      return;
    }
    let raf = 0, n = 0, t0 = 0;
    const gaps: number[] = [];
    let last = 0;
    const tick = (t: number) => {
      if (!t0) t0 = t;
      else gaps.push(t - last);
      last = t;
      if (++n < 90 && t - t0 < 2500) raf = requestAnimationFrame(tick);
      else {
        gaps.sort((a, b) => a - b);
        const median = gaps[gaps.length >> 1] ?? 0;
        if (median > 30 && document.visibilityState === "visible") setLite(true);
      }
    };
    // measured once the room has settled in
    const go = setTimeout(() => (raf = requestAnimationFrame(tick)), 1200);
    return () => {
      clearTimeout(go);
      cancelAnimationFrame(raf);
    };
  }, []);

  const m = lens ? Math.min(lens.w, lens.h) : 400;
  if (lite) return <div ref={box} className="jar-box lite">{children}</div>;
  return (
    <div ref={box} className="jar-box">
      <LiquidGlass
        className="jar-lens"
        style={{ position: "absolute", inset: 0 }}
        shadow={false}
        x={lens?.x ?? 0.5}
        y={lens?.y ?? 0.5}
        width={lens?.w ?? 2}
        height={lens?.h ?? 2}
        radius={lens?.r ?? 30}
        // strength is a fraction of the refracted box (the whole void), per axis: aim for a fixed bend in px
        strength={lens ? bend(m) / Math.sqrt(lens.vw * lens.vh) : 0}
        depth={Math.round(Math.max(26, Math.min(90, m * 0.14)))}
        curvature={0.3}
        splay={1}
        chromaticAberration={0.5}
        glow={0.3}
        glowSpread={0.5}
        edgeHighlight={1}
        edgeWidth={6}
        specular={1.5}
        specularAngle={45}
        quality={512}
      >
        {lens && <Sky {...lens} />}
        {children}
      </LiquidGlass>
    </div>
  );
}

/** Bend at the rim in px (the filter's displacement scale): strong on a big card, gentler on a phone. */
const bend = (m: number) => Math.max(24, Math.min(64, m * 0.085));

/** The star sky inside the jar: drawn once per size, so the lens has something real to bend. */
function Sky({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round((w - 2) * dpr);
    c.height = Math.round((h - 2) * dpr);
    const g = c.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const n = Math.round((w * h) / 2600);
    for (let i = 0; i < n; i++) {
      const big = rnd() < 0.06;
      g.globalAlpha = big ? 0.75 + rnd() * 0.25 : 0.25 + rnd() * 0.5;
      g.fillStyle = rnd() < 0.12 ? "#bcd4ff" : rnd() < 0.08 ? "#ffe2b8" : "#fff";
      g.beginPath();
      g.arc(rnd() * w, rnd() * h, big ? 1.1 + rnd() * 0.7 : 0.5 + rnd() * 0.5, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }, [w, h]);
  return (
    <canvas
      ref={ref}
      className="jar-sky"
      aria-hidden
      // 1px inside the pane, so the pane's hairline edge stays visible around the glass
      style={{ left: `calc(${x * 100}% - ${w / 2 - 1}px)`, top: `calc(${y * 100}% - ${h / 2 - 1}px)`, width: w - 2, height: h - 2, borderRadius: r - 1 }}
    />
  );
}
