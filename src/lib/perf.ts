"use client";

// How much this device can take. "low": few cores or little memory, data saver on, reduced motion asked for, or the
// first second of frames came in slow. Low devices get a lighter Orbit: no glass blur, no idle animations, a still
// starfield, simple cables. Read once; the page marks <html data-perf="low"> so CSS follows too.

type Tier = "low" | "high";
let tier: Tier | null = null;
const listeners = new Set<(t: Tier) => void>();

function guess(): Tier {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";
  if (n.connection?.saveData) return "low";
  if ((n.hardwareConcurrency ?? 8) <= 4) return "low";
  if ((n.deviceMemory ?? 8) <= 4) return "low";
  try {
    if (localStorage.getItem("orbit:perf") === "low") return "low";
  } catch {}
  return "high";
}

function set(t: Tier) {
  tier = t;
  document.documentElement.dataset.perf = t;
  listeners.forEach((f) => f(t));
}

export function perf(): Tier {
  if (tier) return tier;
  if (typeof window === "undefined") return "high";
  set(guess());
  if (tier === "high") probe();
  return tier!;
}
export const isLow = () => perf() === "low";
export function onPerf(f: (t: Tier) => void) {
  listeners.add(f);
  return () => void listeners.delete(f);
}

// a strong-looking device that still drops frames on this page is treated as low (and remembered)
function probe() {
  let n = 0, slow = 0, last = performance.now();
  const step = (t: number) => {
    const dt = t - last;
    last = t;
    if (n++ > 5 && dt > 34) slow++;
    if (n < 70) return void requestAnimationFrame(step);
    if (slow > 25 && document.visibilityState === "visible") {
      try {
        localStorage.setItem("orbit:perf", "low");
      } catch {}
      set("low");
    }
  };
  setTimeout(() => requestAnimationFrame(step), 2500);
}
