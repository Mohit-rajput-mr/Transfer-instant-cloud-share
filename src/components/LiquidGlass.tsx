"use client";
import { useEffect } from "react";

type HapticKind = "light" | "success" | "warn";
let hapticSwitch: HTMLLabelElement | null = null;

/**
 * A short, subtle tick. Android: navigator.vibrate. iOS 18+ Safari has no vibrate, but toggling a
 * native `<input type=checkbox switch>` plays the system haptic, so a hidden one is clicked
 * (only works inside a real tap, which is the only place this is called from).
 * Anything else (desktop, reduced motion) is silently skipped.
 */
export function haptic(kind: HapticKind = "light") {
  if (typeof window === "undefined") return;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(kind === "success" ? [10, 40, 14] : kind === "warn" ? [22, 50, 22] : 8);
      return;
    }
    if (!/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent)) return;
    if (!hapticSwitch) {
      const label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.cssText = "position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.tabIndex = -1;
      input.setAttribute("switch", "");
      label.appendChild(input);
      document.body.appendChild(label);
      hapticSwitch = label;
    }
    hapticSwitch.click();
  } catch {}
}

// presses that deserve a tick (not every glass surface: native iOS buttons don't buzz either)
const TICK = ".send-fab, .up-pill, .up-card, .send-menu button, .chip, .cta, .top-right .pill";
// squash & stretch on release; `scale`, so it composes with transform-based layouts and animations
const SQUISH: Keyframe[] = [
  { scale: "0.96" },
  { scale: "1.06 0.92", offset: 0.28 },
  { scale: "0.97 1.04", offset: 0.52 },
  { scale: "1.012 0.99", offset: 0.74 },
  { scale: "1" },
];

/**
 * Liquid Glass runtime (iOS 26 style), shared by every `.lg` surface:
 *  - SVG filters: #lg-refract bends what's behind the glass, #lg-goo melts shapes together
 *  - a specular highlight that follows the pointer (and device tilt on Android)
 *  - press feedback: CSS compresses `.lg-press` while held, a squash-and-stretch plays on release
 *  - haptics, also on demand: `window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "warn" }))`
 * Refraction (backdrop-filter:url()) only runs on desktop Chromium with headroom; phones keep frosted glass.
 */
export default function LiquidGlass() {
  useEffect(() => {
    const root = document.documentElement;
    const mq = (q: string) => window.matchMedia(q).matches;
    const ua = navigator.userAgent;
    const chromium = /Chrome\/|Edg\//.test(ua) && !/Firefox\//.test(ua);
    const fine = mq("(hover: hover) and (pointer: fine)");
    const calm = !mq("(prefers-reduced-motion: reduce)") && !mq("(prefers-reduced-transparency: reduce)");
    const cores = navigator.hardwareConcurrency ?? 4;
    if (chromium && fine && calm && cores >= 4) root.classList.add("lg-refract");

    let raf = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      raf = 0;
      if (!last) return;
      const el = (last.target as Element | null)?.closest?.(".lg") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty("--mx", `${((last.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((last.clientY - r.top) / r.height) * 100}%`);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return; // a finger dragging the page should not drag the light
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    // Tilt (Android; iOS needs a permission prompt, not worth it for a highlight): batched to one
    // write per frame, quantised so sensor noise doesn't cause work, and written only on the few
    // big glass surfaces instead of <html> (which would restyle the whole document 60×/s).
    let tiltRaf = 0;
    let tiltKey = "";
    let lastTilt: DeviceOrientationEvent | null = null;
    const applyTilt = () => {
      tiltRaf = 0;
      const e = lastTilt;
      if (!e || e.gamma == null || e.beta == null) return;
      const x = 50 + Math.round(Math.max(-30, Math.min(30, e.gamma)) / 3) * 3;
      const y = 30 + Math.round(Math.max(-30, Math.min(30, e.beta - 45)) / 3) * 3;
      const key = `${x},${y}`;
      if (key === tiltKey) return;
      tiltKey = key;
      document.querySelectorAll<HTMLElement>(".top.lg, .send-fab.lg, .drawer.lg, .up-pill.lg, .send-menu.lg").forEach((el) => {
        el.style.setProperty("--tx", `${x}%`);
        el.style.setProperty("--ty", `${y}%`);
      });
    };
    const tilt = (e: DeviceOrientationEvent) => {
      lastTilt = e;
      if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt);
    };
    const useTilt = calm && !fine;

    // Release = jelly. `click` only fires for real taps, so starting a scroll over a glass button
    // never wobbles it (pointerdown would). Played with the Web Animations API, not a class: a class
    // swap replaced the element's own CSS animations (the Send button replayed its entrance and blinked
    // out), and React rewriting className mid-wobble cut it short.
    const jelly = !mq("(prefers-reduced-motion: reduce)");
    const release = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const el = t?.closest?.(".lg-press") as HTMLElement | null;
      if (!el) return;
      if (jelly && typeof el.animate === "function") {
        try {
          el.animate(SQUISH, { duration: 580, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        } catch {}
      }
      if (el.matches(TICK) && !(el as HTMLButtonElement).disabled) haptic("light");
    };
    const onHaptic = (e: Event) => haptic(((e as CustomEvent).detail as HapticKind) || "light");

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("click", release, { capture: true, passive: true });
    if (useTilt) window.addEventListener("deviceorientation", tilt, { passive: true });
    window.addEventListener("orbit:haptic", onHaptic);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(tiltRaf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("click", release, { capture: true });
      window.removeEventListener("deviceorientation", tilt);
      window.removeEventListener("orbit:haptic", onHaptic);
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
