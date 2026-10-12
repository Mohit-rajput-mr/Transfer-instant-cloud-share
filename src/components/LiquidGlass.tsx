"use client";
import { useEffect } from "react";

/**
 * Liquid Glass runtime (iOS 26 style), shared by every `.lg` surface:
 *  - SVG filters: #lg-refract bends what's behind the glass, #lg-goo melts shapes together
 *  - a specular highlight that follows the pointer (and device tilt on phones)
 *  - squash-and-stretch press feedback on anything marked `.lg-press`
 * Chromium gets true refraction through backdrop-filter:url(); other engines keep frosted glass.
 */
export default function LiquidGlass() {
  useEffect(() => {
    const root = document.documentElement;
    const ua = navigator.userAgent;
    const chromium = /Chrome\/|Edg\//.test(ua) && !/Firefox\//.test(ua);
    if (chromium) root.classList.add("lg-refract");

    let raf = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      raf = 0;
      if (!last) return;
      const el = (last.target as Element | null)?.closest?.(".lg") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((last.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((last.clientY - r.top) / r.height) * 100}%`);
    };
    const move = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    // tilt on phones nudges every highlight like light sliding across glass
    const tilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      root.style.setProperty("--tx", `${50 + Math.max(-30, Math.min(30, e.gamma))}%`);
      root.style.setProperty("--ty", `${30 + Math.max(-30, Math.min(30, e.beta - 45))}%`);
    };

    const down = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(".lg-press") as HTMLElement | null;
      if (!el) return;
      el.classList.remove("lg-squish");
      void el.offsetWidth; // restart the animation
      el.classList.add("lg-squish");
    };
    const end = (e: AnimationEvent) => {
      if (e.animationName === "lg-squish") (e.target as HTMLElement).classList.remove("lg-squish");
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("deviceorientation", tilt, { passive: true });
    document.addEventListener("animationend", end);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("deviceorientation", tilt);
      document.removeEventListener("animationend", end);
    };
  }, []);

  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
      <defs>
        {/* lens: low-frequency noise drives a displacement map, bending the backdrop at the edges */}
        <filter id="lg-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="42" xChannelSelector="R" yChannelSelector="G" result="bent" />
          <feGaussianBlur in="bent" stdDeviation="0.6" />
        </filter>
        {/* goo: blur + alpha threshold so nearby shapes melt into one liquid body */}
        <filter id="lg-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
        </filter>
      </defs>
    </svg>
  );
}
