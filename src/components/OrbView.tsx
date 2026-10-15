"use client";
import { LuArrowUp, LuCheck, LuDownload, LuLock, LuLockOpen, LuMaximize2, LuTrash2 } from "react-icons/lu";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { setCardOrigin } from "./Panels";
import { ext, formatBytes, formatClock, type Orb } from "@/lib/client";
import { toneOf, typeHue } from "@/lib/skin-list";

/** 7 → "7", 12 → "10+", 140 → "100+": a crowd stays readable */
const crowd = (n: number) => (n >= 1000 ? "1k+" : n >= 100 ? "100+" : n >= 10 ? "10+" : String(n));

export const LIFETIME_MS = 30 * 60 * 1000;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** How the void is laid out: a wide desktop sky, a phone, a short phone on its side, or a portrait tablet. */
export type VoidMode = "desk" | "phone" | "short" | "tall";
/** How many spheres each layout holds (phones scroll through a longer void instead of piling up). */
export const ORB_CAP: Record<VoidMode, number> = { desk: 40, phone: 14, short: 12, tall: 20 };

// A fixed constellation of slots keeps objects from piling up on each other (y is mapped into the
// band between the header and the send zone by CSS; the bottom-left corner is the send button's).
const SLOTS: [number, number][] = [
  [50, 50], [26, 38], [74, 36], [36, 70], [66, 68], [14, 58], [86, 56], [50, 28], [32, 86],
  [80, 82], [40, 46], [60, 46], [8, 34], [92, 30], [50, 84], [30, 24], [70, 22], [92, 74],
];
// the desktop sky is wide: a percent across is worth more than a percent down
const ASPECT = 1.7;
const slotDist = (a: [number, number], b: [number, number]) => Math.hypot((a[0] - b[0]) * ASPECT, a[1] - b[1]);
// Phones: a flowing constellation instead of a fixed sky. Newest on top, one row-step apart,
// zig-zagging through a column pattern (CSS turns rows into pixels and grows the void to fit), so
// nothing overlaps however many objects there are. Each object keeps its column for life: an arrival
// only pushes the others straight down, and a burn only lets the ones below glide up.
type FlowMode = Exclude<VoidMode, "desk">;
const FLOW: Record<FlowMode, { cols: number[]; sep: number; clear: number }> = {
  // two sides (>= 36% apart); a sphere on the same side as one above it sits 2 rows lower
  phone: { cols: [28, 72, 24, 76, 32, 68], sep: 30, clear: 2 },
  // five columns (>= 17% apart); the same column needs 3 rows of clearance
  short: { cols: [16, 50, 84, 33, 67], sep: 15, clear: 3 },
  // portrait tablets: a phone's two sides, spread wider
  tall: { cols: [26, 74, 22, 78, 30, 70], sep: 30, clear: 2 },
};
const flowCols: Record<FlowMode, Map<string, number>> = { phone: new Map(), short: new Map(), tall: new Map() };

function flowLayout(orbs: Orb[], mode: FlowMode) {
  const f = FLOW[mode];
  const L = f.cols.length;
  const flowCol = flowCols[mode];
  const live = new Set(orbs.map((o) => o.id));
  for (const id of flowCol.keys()) if (!live.has(id)) flowCol.delete(id);
  const oldest = [...orbs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let prev: number | undefined;
  for (const o of oldest) {
    let c = flowCol.get(o.id);
    if (c === undefined) {
      // read newest-first, the columns run through the pattern in order
      c = prev === undefined ? hash(o.id) % L : (prev - 1 + L) % L;
      flowCol.set(o.id, c);
    }
    prev = c;
  }
  const newest = oldest.reverse();
  const out = new Map<string, { x: number; y: number }>();
  const placed: { x: number; y: number }[] = [];
  newest.forEach((o, i) => {
    let x: number;
    if (newest.length === 1) x = 50;
    else if (mode === "short" && newest.length === 2) x = i ? 66 : 34;
    else x = f.cols[flowCol.get(o.id)!] + ((hash(o.id) >> 4) % 3) - 1;
    let y = i === 0 ? 0 : placed[i - 1].y + 1;
    for (const p of placed) if (Math.abs(p.x - x) < f.sep) y = Math.max(y, p.y + f.clear);
    placed.push({ x, y });
    out.set(o.id, { x, y }); // y = row index in flow layouts
  });
  return out;
}

// Desktop slots stick to an object for its whole life, so nothing jumps when a neighbour burns up.
const sticky = new Map<string, number>();

export function layout(orbs: Orb[], mode: VoidMode = "desk") {
  if (mode !== "desk") return flowLayout(orbs, mode);
  const table = SLOTS;
  const stick = sticky;
  const live = new Set(orbs.map((o) => o.id));
  for (const id of stick.keys()) if (!live.has(id)) stick.delete(id);
  const taken = new Set<number>(stick.values());
  const out = new Map<string, { x: number; y: number }>();
  const sorted = [...orbs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const o of sorted) {
    const h = hash(o.id);
    let slot = stick.get(o.id) ?? -1;
    if (slot >= table.length) slot = -1;
    if (slot < 0) {
      // the free slot farthest from every taken one (the first object takes the centre), so a
      // half-empty sky is evenly spread instead of randomly clumped
      let best = -1;
      for (let s = 0, bestD = -1; s < table.length; s++) {
        if (taken.has(s)) continue;
        let d = taken.size ? Infinity : s === 0 ? 1 : 0;
        for (const t of taken) d = Math.min(d, slotDist(table[s], table[t]));
        d += ((h >>> (s % 24)) & 7) * 0.05; // stable tie-break
        if (d > bestD) {
          bestD = d;
          best = s;
        }
      }
      slot = best;
    }
    let x: number, y: number;
    if (slot >= 0) {
      taken.add(slot);
      stick.set(o.id, slot);
      [x, y] = table[slot];
      x += ((h >> 4) % 7) - 3;
      y += ((h >> 9) % 7) - 3;
    } else {
      x = 8 + (h % 84);
      y = 22 + ((h >> 8) % 64);
    }
    out.set(o.id, { x, y });
  }
  return out;
}

// Every sphere gets its own colour. Start from the hue the server picked, then walk the
// golden angle (137.5°) until it is at least MIN_GAP away from every colour on screen.
// Assignments stick for the object's lifetime so colours never shuffle.
const hues = new Map<string, number>();
const MIN_GAP = 24;
const gap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};
/** A colour for a new ball, as far as possible from the ones already floating (golden-angle candidates). */
export function pickHue(taken: number[]): number {
  const start = Math.floor(Math.random() * 360);
  let best = start, bestGap = -1;
  for (let k = 0; k < 24; k++) {
    const h = Math.round((start + k * 137.508) % 360);
    const g = taken.length ? Math.min(...taken.map((u) => gap(u, h))) : 360;
    if (g > bestGap) {
      bestGap = g;
      best = h;
    }
  }
  return best;
}

export function assignHues(orbs: Orb[]) {
  const live = new Set(orbs.map((o) => o.id));
  for (const id of hues.keys()) if (!live.has(id)) hues.delete(id);
  const sorted = [...orbs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const o of sorted) {
    if (hues.has(o.id)) continue;
    const used = [...hues.values()];
    let h = ((o.hue % 360) + 360) % 360;
    const need = Math.min(MIN_GAP, 360 / Math.max(1, used.length + 1) / 1.5);
    for (let k = 0; k < 64 && used.some((u) => gap(u, h) < need); k++) h = (h + 137.508) % 360;
    hues.set(o.id, Math.round(h));
  }
  return hues;
}

// Where the user has thrown each orb, kept across re-renders (this device only).
const offsets = new Map<string, { x: number; y: number }>();

/** The real sphere takes over the stand-in's place (slot + drag offset), so a launch never jumps. */
export function inheritSlot(from: string, to: string) {
  const slot = sticky.get(from);
  if (slot !== undefined) sticky.set(to, slot);
  const off = offsets.get(from);
  if (off) offsets.set(to, off);
  const hue = hues.get(from);
  if (hue !== undefined) hues.set(to, hue);
}

type Drag = {
  id: number; touch: boolean; sx: number; sy: number; ox: number; oy: number;
  armed: boolean; // picked up (shows as lifted)
  moved: boolean; // actually dragged since pick-up
  hold: ReturnType<typeof setTimeout> | null;
  vx: number; vy: number; lx: number; ly: number; lt: number; raf: number;
  tx: number; ty: number; tilt: number; // latest target, painted once per frame
  // geometry cached at pick-up so moves never force a layout read
  bw: number; bh: number; bx: number; by: number;
};

const HOLD_MS = 280;

export type GroupMember = { id: string; name: string; hue: number; size: number; got: boolean; fileName: string; expiresAt: string; life: number; watchers: number; mine: boolean };

export const clampTo = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** where the user dragged each ball inside its container (kept across re-renders, shared with the zoom) */
export const memberPos = new Map<string, [number, number]>();

/**
 * Let go of a ball inside a container: it carries the throw (v in container-widths per ms), slows down
 * and bounces off the glass walls, like a single sphere flung across the void.
 */
const flinging = new Map<string, number>();
export function fling(el: HTMLElement, id: string, x: number, y: number, vx: number, vy: number, box: { x0: number; x1: number; y0: number; y1: number }) {
  cancelAnimationFrame(flinging.get(id) ?? 0);
  let last = performance.now();
  const step = (t: number) => {
    const k = Math.min(3, Math.max(0.25, (t - last) / 16.667));
    last = t;
    const decay = Math.pow(0.94, k);
    vx *= decay;
    vy *= decay;
    x += vx * 16.667 * k;
    y += vy * 16.667 * k;
    if (x < box.x0 || x > box.x1) {
      x = clampTo(x, box.x0, box.x1);
      vx = -vx * 0.65;
    }
    if (y < box.y0 || y > box.y1) {
      y = clampTo(y, box.y0, box.y1);
      vy = -vy * 0.65;
    }
    el.style.left = `${x * 100}%`;
    el.style.top = `${y * 100}%`;
    memberPos.set(id, [x, y]);
    if (Math.hypot(vx, vy) > 0.00002 && el.isConnected) flinging.set(id, requestAnimationFrame(step));
    else {
      flinging.delete(id);
      el.classList.remove("lifted");
    }
  };
  flinging.set(id, requestAnimationFrame(step));
}
/** caught mid-glide: stop it where it is */
export function stopFling(id: string) {
  cancelAnimationFrame(flinging.get(id) ?? 0);
  flinging.delete(id);
}
/** follows the pointer to know how fast it was moving when it let go */
export function tracker() {
  let px = 0, py = 0, pt = 0, vx = 0, vy = 0;
  return {
    start(x: number, y: number) {
      px = x; py = y; pt = performance.now(); vx = vy = 0;
    },
    move(x: number, y: number, w: number, h: number) {
      const t = performance.now(), dt = Math.max(1, t - pt);
      vx = vx * 0.5 + ((x - px) / w / dt) * 0.5;
      vy = vy * 0.5 + ((y - py) / h / dt) * 0.5;
      px = x; py = y; pt = t;
    },
    /** stale if the pointer stopped before letting go */
    velocity(): [number, number] {
      return performance.now() - pt > 120 ? [0, 0] : [vx, vy];
    },
  };
}

/**
 * A sender's glass container: a landscape rectangle sized to what it holds. Each ball gets its own
 * cell, nudged off-centre by a fixed amount so they float loosely instead of standing in rows; the
 * more balls, the smaller each one.
 */
export function bubbleLayout(n: number) {
  const d = n <= 2 ? 58 : n <= 3 ? 52 : n <= 4 ? 48 : n <= 6 ? 42 : n <= 9 ? 36 : n <= 12 ? 32 : 28;
  const cols = n <= 3 ? n : Math.ceil(Math.sqrt(n * 1.6));
  const rows = Math.ceil(n / cols);
  const cw = d * 2.2, ch = d * 2.15, px = d * 0.5, py = d * 0.45;
  const W = cols * cw + px * 2, H = rows * ch + py * 2;
  const spots: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i - r * cols + (cols - inRow) / 2; // a shorter last row sits in the middle
    // a fixed per-ball nudge (same every render), so the arrangement looks loose, not gridded
    const jx = Math.sin(i * 12.9898) * 0.16, jy = Math.cos(i * 78.233) * 0.12;
    spots.push([(px + (c + 0.5 + jx) * cw) / W, (py + (r + 0.42 + jy) * ch) / H]);
  }
  return { d, W, H, spots };
}

export default function OrbView(props: {
  orb: Orb;
  pos: { x: number; y: number };
  now: number;
  mine: boolean;
  nearby: boolean;
  watchers: number;
  onOpen: (orb: Orb) => void;
  phase?: "arriving" | "burning";
  hue?: number;
  /** how it looks: the sender's style (or this viewer's, for objects without one) */
  skin?: string;
  index?: number;
  /** still on its way up (0..1): the ring shows the upload instead of the lifetime */
  launching?: number;
  /** someone else's launch, seen live before it has landed */
  incoming?: boolean;
  /** yours: its number, the same one the launch dock shows */
  badge?: number;
  /** this device already downloaded it */
  got?: boolean;
  /** a bubble holding one sender's objects */
  group?: GroupMember[];
  /** tap on one ball inside the bubble */
  onOpenMember?: (id: string) => void;
  /** the sender's own: destroy this ball (or everything in this container) */
  onDestroy?: () => void;
  /** the sender's own ball inside a container */
  onDestroyMember?: (id: string) => void;
}) {
  const { orb, pos, now, mine, nearby, watchers, onOpen, phase, launching, incoming, badge, got, group } = props;
  const up = launching !== undefined;
  const h = hash(orb.id);
  const left = new Date(orb.expiresAt).getTime() - now;
  const frac = Math.max(0, Math.min(1, left / ((orb.life ?? 30) * 60_000)));
  const size = Math.round(96 + Math.min(1, Math.log10(Math.max(orb.size, 1024)) / 10) * 70);
  const R = 48;
  const C = 2 * Math.PI * R;
  const sealed = orb.status === "sealed";
  const dying = left < 60_000;

  const anchor = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const pressed = useRef<string | null>(null);
  // one ball inside a bubble, dragged on its own
  const mdrag = useRef<{ id: number; el: HTMLElement; mid: string; sx: number; sy: number; x: number; y: number; w: number; h: number; armed: boolean; moved: boolean; hold: ReturnType<typeof setTimeout> | null; tr: ReturnType<typeof tracker>; cx: number; cy: number } | null>(null);
  const off = offsets.get(orb.id) ?? { x: 0, y: 0 };
  // stagger slot is fixed at mount: re-indexing later must not replay the entrance
  const [idx] = useState(() => Math.min(props.index ?? 0, 20));

  const apply = (x: number, y: number, tilt = 0) => {
    offsets.set(orb.id, { x, y });
    const el = anchor.current;
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px)`;
    // `rotate` is its own property: no inherited custom property, no restyle of the whole subtree
    const body = el.querySelector<HTMLElement>(".orb-body");
    if (body) body.style.rotate = `${tilt}deg`;
  };

  // keep the orb inside the void (clear of the header)
  const clamp = (d: Drag, x: number, y: number) => {
    const m = 40;
    const cx = Math.min(d.bw - m - d.bx, Math.max(m - d.bx, x));
    const cy = Math.min(d.bh - m - d.by, Math.max(90 - d.by, y));
    return { x: cx, y: cy, hitX: cx !== x, hitY: cy !== y };
  };

  // Hover a bubble and scroll up: it swells under the cursor, then opens zoomed in. Scrolling down (or
  // anywhere else) still scrolls the page.
  const isGroupOrb = !!group;
  useEffect(() => {
    const el = button.current;
    if (!el || !isGroupOrb) return;
    let acc = 0, idle: ReturnType<typeof setTimeout> | null = null;
    const body = () => el.querySelector<HTMLElement>(".bubble-body");
    const settle = () => {
      acc = 0;
      body()?.style.removeProperty("scale");
    };
    const wheel = (e: WheelEvent) => {
      const up = e.deltaY < 0 || (e.ctrlKey && e.deltaY < 0);
      if (!up && acc <= 0) return;
      e.preventDefault();
      acc = Math.max(0, acc - e.deltaY * (e.deltaMode === 1 ? 16 : 1));
      const b = body();
      if (b) b.style.scale = String(1 + Math.min(acc, 150) / 700);
      if (idle) clearTimeout(idle);
      if (acc > 150) {
        settle();
        onOpenRef.current();
        return;
      }
      // a mouse wheel sends one notch at a time with a pause between: keep counting across it
      idle = setTimeout(settle, 900);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      if (idle) clearTimeout(idle);
    };
  }, [isGroupOrb]);

  // While a touch drag is armed the page must not scroll. React's touch listeners are passive,
  // so the blocking one is attached by hand.
  useEffect(() => {
    const el = button.current;
    if (!el) return;
    const tm = (e: TouchEvent) => {
      if (drag.current?.armed && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", tm, { passive: false });
    return () => el.removeEventListener("touchmove", tm);
  }, []);

  const arm = (d: Drag) => {
    d.armed = true;
    anchor.current?.classList.add("dragging");
  };

  const onOpenRef = useRef(() => {});
  onOpenRef.current = () => {
    const r = anchor.current?.querySelector(".orb-body")?.getBoundingClientRect();
    if (r) setCardOrigin(r.left + r.width / 2, r.top + r.height / 2);
    onOpen(orb);
  };
  const open = (target: Element) => {
    const r = target.querySelector(".orb-body")?.getBoundingClientRect();
    if (r) setCardOrigin(r.left + r.width / 2, r.top + r.height / 2);
    onOpen(orb);
  };

  const onPointerDown = (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || phase === "burning") return;
    // the button captures the pointer (for dragging), so the click reports the button: remember the ball pressed
    if ((e.target as Element).closest?.("[data-destroy]")) {
      pressed.current = null;
      return;
    }
    const mel = (e.target as Element).closest?.("[data-member]") as HTMLElement | null;
    pressed.current = mel?.dataset.member ?? null;
    if (mel && group) {
      const box = mel.parentElement!.getBoundingClientRect();
      const mid = mel.dataset.member!;
      stopFling(mid);
      const at = memberPos.get(mid) ?? [parseFloat(mel.style.left) / 100, parseFloat(mel.style.top) / 100];
      const touch = e.pointerType !== "mouse";
      const tr = tracker();
      tr.start(e.clientX, e.clientY);
      const md = { id: e.pointerId, el: mel, mid, sx: e.clientX, sy: e.clientY, x: at[0], y: at[1], w: box.width, h: box.height, armed: !touch, moved: false, hold: null as ReturnType<typeof setTimeout> | null, tr, cx: at[0], cy: at[1] };
      mdrag.current = md;
      if (touch) {
        // like the spheres: a short hold picks the ball up, a quick swipe still scrolls
        md.hold = setTimeout(() => {
          md.hold = null;
          md.armed = true;
          try {
            button.current?.setPointerCapture(md.id);
          } catch {}
          mel.classList.add("lifted");
          window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "light" }));
        }, HOLD_MS);
      } else e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const prev = drag.current;
    if (prev) {
      cancelAnimationFrame(prev.raf);
      if (prev.hold) clearTimeout(prev.hold);
    }
    const a = anchor.current;
    const box = a?.offsetParent?.getBoundingClientRect();
    const cur = offsets.get(orb.id) ?? { x: 0, y: 0 };
    const touch = e.pointerType !== "mouse";
    // where the anchor really sits (phones place it with `translate`, which offsetLeft/Top ignore),
    // minus the user's own drag offset that clamp() adds back
    const ar = a?.getBoundingClientRect();
    const d: Drag = {
      id: e.pointerId, touch, sx: e.clientX, sy: e.clientY, ox: cur.x, oy: cur.y, armed: false, moved: false, hold: null,
      vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now(), raf: 0, tx: cur.x, ty: cur.y, tilt: 0,
      bw: box?.width ?? window.innerWidth, bh: box?.height ?? window.innerHeight,
      bx: ar && box ? ar.left - box.left - cur.x : a?.offsetLeft ?? 0,
      by: ar && box ? ar.top - box.top - cur.y : a?.offsetTop ?? 0,
    };
    drag.current = d;
    if (touch) {
      // iOS-style: a short hold lifts the sphere; a quick swipe still scrolls the page
      d.hold = setTimeout(() => {
        d.hold = null;
        if (drag.current !== d || d.armed) return;
        arm(d);
        try {
          button.current?.setPointerCapture(d.id);
        } catch {}
        window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "light" }));
      }, HOLD_MS);
    } else e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const md = mdrag.current;
    if (md && md.id === e.pointerId) {
      const dx = e.clientX - md.sx, dy = e.clientY - md.sy;
      if (!md.armed) {
        if (Math.hypot(dx, dy) > 8) {
          if (md.hold) clearTimeout(md.hold);
          mdrag.current = null; // a swipe before the hold: let the page scroll
        }
        return;
      }
      if (!md.moved && Math.hypot(dx, dy) < 5) return;
      if (!md.moved) md.el.classList.add("lifted");
      md.moved = true;
      const x = clampTo(md.x + dx / md.w, 0.08, 0.92), y = clampTo(md.y + dy / md.h, 0.1, 0.74);
      md.tr.move(e.clientX, e.clientY, md.w, md.h);
      md.cx = x;
      md.cy = y;
      md.el.style.left = `${x * 100}%`;
      md.el.style.top = `${y * 100}%`;
      memberPos.set(md.mid, [x, y]);
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      if (!d.armed) {
        // touch before the hold: a sideways flick picks it up straight away, anything else is a scroll
        if (d.touch && !(Math.abs(dx) > Math.abs(dy) * 1.2)) {
          if (d.hold) clearTimeout(d.hold);
          drag.current = null;
          return;
        }
        arm(d);
      }
      if (d.hold) clearTimeout(d.hold);
      d.hold = null;
      d.moved = true;
    }
    const t = performance.now(), dt = Math.max(1, t - d.lt);
    d.vx = d.vx * 0.6 + ((e.clientX - d.lx) / dt) * 16 * 0.4;
    d.vy = d.vy * 0.6 + ((e.clientY - d.ly) / dt) * 16 * 0.4;
    d.lx = e.clientX; d.ly = e.clientY; d.lt = t;
    const c = clamp(d, d.ox + dx, d.oy + dy);
    d.tx = c.x; d.ty = c.y; d.tilt = Math.max(-18, Math.min(18, d.vx * 1.2));
    if (!d.raf) {
      d.raf = requestAnimationFrame(() => {
        d.raf = 0;
        if (drag.current === d && d.armed) apply(d.tx, d.ty, d.tilt);
      });
    }
  };

  const onPointerUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const md = mdrag.current;
    if (md && md.id === e.pointerId) {
      if (md.hold) clearTimeout(md.hold);
      mdrag.current = null;
      if (md.moved) {
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 450);
        const [vx, vy] = md.tr.velocity();
        fling(md.el, md.mid, md.cx, md.cy, vx, vy, { x0: 0.08, x1: 0.92, y0: 0.1, y1: 0.74 });
      } else md.el.classList.remove("lifted");
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.hold) clearTimeout(d.hold);
    cancelAnimationFrame(d.raf);
    d.raf = 0;
    const el = anchor.current;
    if (!d.armed) {
      drag.current = null; // a plain tap: the click opens it
      return;
    }
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 450);
    if (!d.moved) {
      // lifted but never moved (a slow tap): put it down and open it
      el?.classList.remove("dragging");
      drag.current = null;
      if (e.type === "pointerup") open(e.currentTarget);
      return;
    }
    d.armed = false;
    el?.classList.remove("dragging");
    el?.classList.add("flung");
    // momentum glide with soft bounces off the edges
    let { vx, vy } = d;
    let x = d.tx, y = d.ty;
    apply(x, y, d.tilt);
    let lt = performance.now();
    const step = (t: number) => {
      const k = Math.min(3, Math.max(0.25, (t - lt) / 16.667)); // frame-rate independent (60/120 Hz)
      lt = t;
      const decay = Math.pow(0.95, k);
      vx *= decay; vy *= decay;
      const c = clamp(d, x + vx * k, y + vy * k);
      if (c.hitX) vx = -vx * 0.6;
      if (c.hitY) vy = -vy * 0.6;
      x = c.x; y = c.y;
      apply(x, y, Math.max(-18, Math.min(18, vx * 1.2)));
      if (Math.hypot(vx, vy) > 0.15) d.raf = requestAnimationFrame(step);
      else {
        apply(x, y, 0);
        el?.classList.remove("flung");
        if (drag.current === d) drag.current = null;
      }
    };
    d.raf = requestAnimationFrame(step);
  };

  const style = {
    "--x": `${pos.x}%`,
    "--xn": pos.x,
    "--yn": pos.y,
    "--y": `${pos.y}%`,
    "--row": pos.y,
    "--s": `${size}px`,
    "--hue": props.hue ?? orb.hue,
    "--th": typeHue(orb.fileName, orb.mime),
    "--dur": `${14 + (h % 9)}s`,
    "--delay": `-${h % 12}s`,
    "--dx": `${10 + (h % 18)}px`,
    "--dy": `${8 + ((h >> 5) % 16)}px`,
    "--i": idx,
  } as CSSProperties;

  return (
    <div
      className={`orb-anchor${phase ? ` ${phase}` : ""}${group ? " grp" : ""}`}
      data-orb={orb.id}
      data-skin={props.skin ?? "orbit"}
      data-tone={toneOf(props.skin ?? "orbit")}
      ref={anchor}
      style={{
        ...style,
        // a container is far wider than a sphere: its half-size keeps it fully on screen
        ...(group ? { "--hw": `calc(${bubbleLayout(group.length).W / 2}px * var(--k, 1))`, "--hh": `calc(${bubbleLayout(group.length).H / 2}px * var(--k, 1))` } : null),
        transform: `translate(${off.x}px, ${off.y}px)`,
      } as CSSProperties}
    >
    <button
      ref={button}
      className={`orb${mine ? " mine" : ""}${up ? " launching" : ""}${dying && !up ? " dying" : ""}${sealed ? " sealed" : ""}${got && !up ? " got" : ""}${group ? " group" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        // the red destroy icons
        const kill = (e.target as Element).closest?.("[data-destroy]") as HTMLElement | null;
        if (kill) {
          pressed.current = null;
          const mid = kill.dataset.destroy;
          if (mid && props.onDestroyMember) props.onDestroyMember(mid);
          else props.onDestroy?.();
          return;
        }
        const id = pressed.current ?? ((e.target as Element).closest?.("[data-member]") as HTMLElement | null)?.dataset.member;
        pressed.current = null;
        if (id && props.onOpenMember) {
          const r = e.currentTarget.querySelector(`[data-member="${id}"]`)?.getBoundingClientRect();
          if (r) setCardOrigin(r.left + r.width / 2, r.top + r.height / 2);
          return props.onOpenMember(id);
        }
        open(e.currentTarget);
      }}
      aria-label={`${up ? "Launching" : "Open"} ${group ? `a group of ${group.length} from one sender: ` : ""}${orb.name}${mine ? `, yours${badge ? ` number ${badge}` : ""}` : ""}${got && !up ? ", already downloaded" : ""}`}
    >
      {group ? (
        (() => {
          const L = bubbleLayout(group.length);
          return (
            <div className="orb-body bubble-body" style={{ width: `calc(${L.W}px * var(--k))`, height: `calc(${L.H}px * var(--k))` }}>
              <div className="blob" />
              {/* the container's own live viewers: green dots travelling round its edge */}
              {watchers > 0 && (
                <svg className="edge-run" aria-hidden>
                  {Array.from({ length: Math.min(watchers, 4) }, (_, k) => (
                    <rect key={k} pathLength={100} style={{ "--d": `${-k * 2.2}s` } as CSSProperties} />
                  ))}
                </svg>
              )}
              <span className="zoom-cue glyph" aria-hidden><LuMaximize2 />Click or scroll to open</span>
              {props.onDestroy && mine && <span className="destroy box" data-destroy="" role="button" aria-label="Destroy everything in this container" title="Destroy all"><LuTrash2 /></span>}
              <div className="members" style={{ "--md": `calc(${L.d}px * var(--k))` } as CSSProperties}>
                {group.map((m, i) => {
                  const mleft = new Date(m.expiresAt).getTime() - now;
                  const mf = Math.max(0, Math.min(1, mleft / (m.life * 60_000)));
                  const [x, y] = memberPos.get(m.id) ?? L.spots[i] ?? [0.5, 0.5];
                  return (
                    <span
                      key={m.id}
                      className={`member${m.got ? " got" : ""}`}
                      data-member={m.id}
                      style={{ "--sh": m.hue, "--th": typeHue(m.fileName), "--mi": i, "--life": mf, left: `${x * 100}%`, top: `${y * 100}%` } as CSSProperties}
                      title={`${m.name} · ${formatBytes(m.size)} · ${formatClock(mleft)}`}
                    >
                      <span className="mball">
                        <svg className="mring" viewBox="0 0 100 100" aria-hidden>
                          <circle className="track" cx="50" cy="50" r="48" />
                          <circle className="life" cx="50" cy="50" r="48" strokeDasharray={301.6} strokeDashoffset={301.6 * (1 - mf)} />
                        </svg>
                        <span>{ext(m.fileName)}</span>
                        {Array.from({ length: Math.min(m.watchers, 3) }, (_, k) => (
                          <span key={k} className="sat msat" style={{ "--r": `${5 + k * 4}px`, "--t": `${4 + k * 1.5}s`, "--d": `-${k * 0.8}s` } as CSSProperties} aria-hidden />
                        ))}
                      </span>
                      {m.mine && props.onDestroyMember && <span className="destroy small" data-destroy={m.id} role="button" aria-label={`Destroy ${m.name}`} title="Destroy"><LuTrash2 /></span>}
                      <span className="mname">{m.name}</span>
                      <span className="mmeta">{formatBytes(m.size)} · {formatClock(mleft)}</span>
                    </span>
                  );
                })}
              </div>
        {got && !up ? <span className="got-mark" aria-hidden><LuCheck /></span> : null}
        {!up && <span className={`bubble lg${watchers ? " hot" : ""}`} aria-label={`${watchers} live, ${orb.views} opened, ${orb.downloads} downloads`}>
          <span title="Live now"><i className="b-live" />{crowd(watchers)}</span>
          <span title="Opened by"><svg viewBox="0 0 16 16" aria-hidden><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>{crowd(orb.views ?? 0)}</span>
          <span title="Downloads"><LuDownload />{crowd(orb.downloads)}</span>
        </span>}
            </div>
          );
        })()
      ) : (
      <div className="orb-body" style={{ "--life": up ? Math.max(0.03, launching) : frac } as CSSProperties}>
        <div className="halo" />
        {mine && <span className="claim" />}
        <div className="sphere" />
        <svg className="ring" viewBox="0 0 100 100">
          <circle className="track" cx="50" cy="50" r={R} />
          <circle className="life" cx="50" cy="50" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - (up ? Math.max(0.03, launching) : frac))} />
        </svg>
        <span className="ext">{up && incoming ? `${Math.round(launching * 100)}%` : ext(orb.fileName)}</span>
        {props.onDestroy && mine && !up && phase !== "burning" && <span className="destroy" data-destroy="" role="button" aria-label={`Destroy ${orb.name}`} title="Destroy"><LuTrash2 /></span>}
        {mine && badge ? <span className="mine-no" aria-hidden>{badge}</span> : null}
        {got && !up ? <span className="got-mark" aria-hidden><LuCheck /></span> : null}
        {!up && <span className={`bubble lg${watchers ? " hot" : ""}`} aria-label={`${watchers} live, ${orb.views} opened, ${orb.downloads} downloads`}>
          <span title="Live now"><i className="b-live" />{crowd(watchers)}</span>
          <span title="Opened by"><svg viewBox="0 0 16 16" aria-hidden><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>{crowd(orb.views ?? 0)}</span>
          <span title="Downloads"><LuDownload />{crowd(orb.downloads)}</span>
        </span>}
        {phase === "arriving" && <span className="shock" />}
        {Array.from({ length: Math.min(watchers, 4) }, (_, i) => (
          <span
            key={i}
            className="sat"
            style={{ "--r": `${6 + i * 5}px`, "--t": `${5 + i * 1.7}s`, "--d": `-${i * 0.9}s` } as CSSProperties}
          />
        ))}
      </div>
      )}
      <div className="orb-label wide">{orb.name}</div>
      <div className="orb-meta mono">
        {orb.by ? <span className="orb-by">{orb.by}</span> : null}
        <span>{formatBytes(orb.size)}</span>
        {up ? <span className="glyph"><LuArrowUp aria-hidden />{Math.round(launching * 100)}%</span> : <span>{formatClock(left)}</span>}
        {orb.maxDownloads ? <span>max {orb.maxDownloads}</span> : null}
      </div>
      {(mine || nearby || sealed || incoming || !up || group) && (
        <div className="tags">
          {mine && <span className="tag me">{badge ? `YOURS · #${badge}` : "YOURS"}</span>}
          {incoming && <span className="tag in">INCOMING</span>}
          {orb.open && !incoming && <span className="tag open ic-tag" title="No password" aria-label="No password"><LuLockOpen /></span>}
          {!orb.open && !incoming && !up && <span className="tag ic-tag" title="Password needed" aria-label="Password needed"><LuLock /></span>}
          {nearby && !mine && !incoming && <span className="tag near">NEARBY</span>}
          {sealed && <span className="tag dead">SEALED</span>}
          {got && !up && <span className="tag got ic-tag" title="Downloaded" aria-label="Downloaded"><LuCheck /></span>}
          {group && <span className="tag grp">{group.length} ITEMS</span>}
        </div>
      )}
    </button>
    </div>
  );
}
