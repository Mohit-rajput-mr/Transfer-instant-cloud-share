"use client";
import { useEffect, useRef } from "react";

// Three parallax layers of stars + the occasional meteor. Pure canvas, no deps.
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0;
    let mx = 0, my = 0, tx = 0, ty = 0;
    type Star = { x: number; y: number; z: number; r: number; tw: number };
    let stars: Star[] = [];
    let meteor: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 2600);
      stars = Array.from({ length: count }, () => {
        const z = Math.random();
        return { x: Math.random() * w, y: Math.random() * h, z, r: 0.25 + z * 1.1, tw: Math.random() * Math.PI * 2 };
      });
    };

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / w - 0.5) * 2;
      ty = (e.clientY / h - 0.5) * 2;
    };

    let t = 0;
    const frame = () => {
      t += 1;
      mx += (tx - mx) * 0.03;
      my += (ty - my) * 0.03;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        if (!reduce) {
          s.x -= 0.02 + s.z * 0.12;
          if (s.x < -4) s.x = w + 4;
        }
        const px = s.x - mx * s.z * 14;
        const py = s.y - my * s.z * 14;
        const a = 0.25 + s.z * 0.6 + Math.sin(t * 0.02 + s.tw) * 0.15;
        ctx.globalAlpha = Math.max(0.05, Math.min(1, a));
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) {
        if (!meteor && Math.random() < 0.0025) {
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
          m.x += m.vx;
          m.y += m.vy;
          m.life -= 0.012;
          if (m.life <= 0 || m.x < -200 || m.y > h + 200) meteor = null;
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    resize();
    frame();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="stars" aria-hidden />;
}
