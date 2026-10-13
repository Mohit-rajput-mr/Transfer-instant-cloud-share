"use client";
// The burn-up effect is drawn by tsParticles (engine + slim bundle + emitters + additive blending):
// one shared transparent canvas over the page; each burning sphere gets three short-lived emitters
// (flame, smoke, sparks) at its position. Loaded lazily so it never weighs on the first paint.
import type { Container, ISourceOptions, RecursivePartial } from "@tsparticles/engine";
import type { EmitterContainer } from "@tsparticles/plugin-emitters";

type IEmitter = Parameters<NonNullable<EmitterContainer["addEmitter"]>>[0];

let ready: Promise<(Container & EmitterContainer) | undefined> | null = null;

function fx() {
  ready ??= (async () => {
    const [{ tsParticles }, { loadSlim }, { loadEmittersPlugin }, { loadEmittersShapeCircle }, { loadBlendPlugin }] = await Promise.all([
      import("@tsparticles/engine"),
      import("@tsparticles/slim"),
      import("@tsparticles/plugin-emitters"),
      import("@tsparticles/plugin-emitters-shape-circle"),
      import("@tsparticles/plugin-blend"),
    ]);
    await loadSlim(tsParticles);
    await loadEmittersPlugin(tsParticles);
    await loadEmittersShapeCircle(tsParticles);
    await loadBlendPlugin(tsParticles);
    const el = document.createElement("div");
    el.className = "burn-fx";
    document.body.appendChild(el);
    const options: ISourceOptions = {
      fullScreen: { enable: true, zIndex: 9 },
      background: { color: { value: "transparent" } },
      fpsLimit: 60,
      detectRetina: true,
      particles: { number: { value: 0 } },
      emitters: [],
    };
    return (await tsParticles.load({ id: "burn-fx", element: el, options })) as (Container & EmitterContainer) | undefined;
  })();
  return ready;
}

/** Warm the engine up in idle time so the first burn starts on the same frame. */
export function preloadBurn() {
  const go = () => void fx().catch(() => {});
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) (window as Window & { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(go);
  else setTimeout(go, 1500);
}

// emitter areas are given as a share of the screen, so they match the sphere at any size
const area = (w: number, h: number) => ({ mode: "percent" as const, width: (w / window.innerWidth) * 100, height: (h / window.innerHeight) * 100 });

const flame = (r: number): RecursivePartial<IEmitter> => ({
  direction: "top",
  life: { count: 1, duration: 1.0 },
  rate: { quantity: 42, delay: 0.016 },
  shape: { type: "circle" },
  size: area(r * 1.7, r * 1.4),
  particles: {
    paint: { fill: { enable: true, color: { value: ["#fff7d6", "#ffe08a", "#ffb43a", "#ff7a1a", "#ff4a12", "#d92b0b"] } } },
    shape: { type: "circle" },
    blend: { enable: true, mode: "lighter" },
    opacity: { value: { min: 0.18, max: 0.45 }, animation: { enable: true, speed: 0.9, startValue: "max", destroy: "min", sync: false } },
    size: { value: { min: r * 0.04, max: r * 0.11 }, animation: { enable: true, speed: r * 0.1, startValue: "max", destroy: "min", sync: false } },
    move: {
      enable: true, direction: "top", speed: { min: 1, max: 3.4 }, straight: false, outModes: "destroy",
      angle: { value: 26, offset: 0 }, drift: { min: -0.35, max: 0.35 },
      gravity: { enable: true, inverse: true, acceleration: 5, maxSpeed: 7 },
    },
    life: { count: 1, duration: { value: { min: 0.5, max: 1.15 } } },
  },
});

const smoke = (r: number): RecursivePartial<IEmitter> => ({
  direction: "top",
  life: { count: 1, delay: 0.3, duration: 1.1 },
  rate: { quantity: 4, delay: 0.05 },
  shape: { type: "circle" },
  size: area(r * 1.3, r * 0.6),
  particles: {
    paint: { fill: { enable: true, color: { value: ["#3a3a3a", "#2a2624", "#4a4440"] } } },
    shape: { type: "circle" },
    opacity: { value: { min: 0.06, max: 0.16 }, animation: { enable: true, speed: 0.2, startValue: "max", destroy: "min", sync: false } },
    size: { value: { min: r * 0.12, max: r * 0.28 }, animation: { enable: true, speed: r * 0.08, startValue: "min", sync: false } },
    move: {
      enable: true, direction: "top", speed: { min: 0.6, max: 1.6 }, outModes: "destroy",
      angle: { value: 25, offset: 0 }, drift: { min: -0.4, max: 0.4 },
    },
    life: { count: 1, duration: { value: { min: 1.4, max: 2.4 } } },
  },
});

const sparks = (r: number): RecursivePartial<IEmitter> => ({
  life: { count: 1, duration: 0.5 },
  rate: { quantity: 6, delay: 0.04 },
  shape: { type: "circle" },
  size: area(r * 1.2, r * 1.2),
  particles: {
    paint: { fill: { enable: true, color: { value: ["#fff3b0", "#ffc04d", "#ff8a2a"] } } },
    shape: { type: "circle" },
    blend: { enable: true, mode: "lighter" },
    opacity: { value: 1, animation: { enable: true, speed: 0.9, startValue: "max", destroy: "min", sync: false } },
    size: { value: { min: 0.8, max: 2.2 } },
    move: {
      enable: true, direction: "none", speed: { min: 4, max: 11 }, outModes: "destroy", decay: 0.04,
      gravity: { enable: true, acceleration: 7, maxSpeed: 14 },
    },
    life: { count: 1, duration: { value: { min: 0.6, max: 1.3 } } },
  },
});

/** Burn up whatever sits at this screen point (client px), radius r. */
export async function burnAt(x: number, y: number, r: number) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = await fx().catch(() => undefined);
  if (!c?.addEmitter) return;
  const at = { position: { x: (x / window.innerWidth) * 100, y: (y / window.innerHeight) * 100 } };
  const big = Math.max(24, Math.min(90, r));
  await Promise.all([
    c.addEmitter({ ...flame(big), ...at }),
    c.addEmitter({ ...smoke(big), ...at }),
    c.addEmitter({ ...sparks(big), ...at }),
  ]).catch(() => {});
}
