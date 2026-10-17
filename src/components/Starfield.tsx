"use client";
import { useEffect, useRef } from "react";
import { isLow } from "@/lib/perf";

type Star = { x: number; y: number; z: number; r: number; tw: number };
const BUCKETS = 6; // stars are batched by brightness: 6 fills per frame instead of one per star

// Three parallax layers of stars + the occasional meteor. Pure canvas, no deps.
// Phone-friendly: the sky never re-rolls when Safari's toolbar collapses, frames are capped on
// touch devices, and nothing is drawn while the void is scrolled away or the tab is hidden.
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    // a low-end device gets a still sky: drawn once, never animated (lib/perf.ts)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || isLow();
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const FPS = coarse ? 30 : 60;
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0;
    let lastW = 0;
    let mx = 0, my = 0, tx = 0, ty = 0;
    let stars: Star[] = [];
    let meteor: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let visible = true;

    const sprinkle = (x0: number, y0: number, x1: number, y1: number) =>
      Array.from({ length: Math.round(((x1 - x0) * (y1 - y0)) / 2600) }, (): Star => {
        const z = Math.random();
        return { x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0), z, r: 0.25 + z * 1.1, tw: Math.random() * Math.PI * 2 };
      });

    // Size to the *largest* viewport the toolbar can reveal, so collapsing it shows stars, not a gap.
    const fullHeight = () => {
      if (!coarse) return window.innerHeight;
      const long = Math.max(screen.width, screen.height), short = Math.min(screen.width, screen.height);
      return Math.max(window.innerHeight, window.innerWidth > window.innerHeight ? short : long);
    };

    const draw = (ts: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const paths = Array.from({ length: BUCKETS }, () => new Path2D());
      for (const s of stars) {
        if (!reduce) {
          s.x -= (0.02 + s.z * 0.12) * dt;
          if (s.x < -4) s.x = w + 4;
        }
        const px = s.x - mx * s.z * 14;
        const py = s.y - my * s.z * 14;
        const a = Math.max(0.05, Math.min(1, 0.25 + s.z * 0.6 + (reduce ? 0 : Math.sin(ts * 0.0012 + s.tw) * 0.15)));
        const p = paths[Math.min(BUCKETS - 1, (a * BUCKETS) | 0)];
        if (s.r < 0.8) p.rect(px - s.r, py - s.r, s.r * 2, s.r * 2);
        else {
          p.moveTo(px + s.r, py);
          p.arc(px, py, s.r, 0, Math.PI * 2);
        }
      }
      ctx.fillStyle = "#fff";
      paths.forEach((p, i) => {
        ctx.globalAlpha = (i + 0.5) / BUCKETS;
        ctx.fill(p);
      });
      if (!reduce) {
        if (!meteor && Math.random() < 0.0025 * dt) {
          meteor = { x: Math.random() * w * 0.8 + w * 0.2, y: Math.random() * h * 0.4, vx: -7 - Math.random() * 5, vy: 3 + Math.random() * 2, life: 1 };
        }
        if (meteor) {
          const m = meteor;
          const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14);
          g.addColorStop(0, `rgba(255,255,255,${0.8 * m.life})`);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.globalAlpha = 1;
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14);
          ctx.stroke();
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.life -= 0.012 * dt;
          if (m.life <= 0 || m.x < -200 || m.y > h + 200) meteor = null;
        }
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const nw = window.innerWidth;
      const nh = fullHeight();
      // iOS/Android fire resize every time the toolbar shows or hides: same width = same sky
      if (nw === lastW && nh <= h) return;
      const regen = nw !== lastW || !stars.length;
      const oldH = h;
      lastW = nw;
      w = nw;
      h = Math.max(nh, regen ? 0 : h);
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (regen) stars = sprinkle(0, 0, w, h);
      else if (h > oldH) stars = stars.concat(sprinkle(0, oldH, w, h)); // only the newly revealed strip
      draw(performance.now(), 0);
    };

    const frame = (ts: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      raf = requestAnimationFrame(frame);
      // the Earth view covers the sky: nothing to draw
      if (document.documentElement.dataset.earth) return;
      if (ts - last < 1000 / FPS - 2) return;
      const dt = last ? Math.min(3, (ts - last) / 16.667) : 1; // speed is per time, not per frame (120 Hz safe)
      last = ts;
      mx += (tx - mx) * 0.03 * dt;
      my += (ty - my) * 0.03 * dt;
      draw(ts, dt);
    };
    const start = () => {
      if (reduce || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return; // a finger scrolling the page would make the sky lurch
      tx = (e.clientX / w - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onVis = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : start());

    // stop drawing while the void is scrolled out of view (the page above it is opaque)
    const target = document.getElementById("void");
    const io = target
      ? new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          if (visible) start();
        })
      : null;
    if (target) io!.observe(target);

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="stars" aria-hidden />;
}
