"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { setCardOrigin } from "./Panels";
import { ext, formatBytes, formatClock, type Orb } from "@/lib/client";

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
  index?: number;
  /** still on its way up (0..1): the ring shows the upload instead of the lifetime */
  launching?: number;
  /** someone else's launch, seen live before it has landed */
  incoming?: boolean;
  /** yours: its number, the same one the launch dock shows */
  badge?: number;
}) {
  const { orb, pos, now, mine, nearby, watchers, onOpen, phase, launching, incoming, badge } = props;
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

  const open = (target: Element) => {
    const r = target.querySelector(".orb-body")?.getBoundingClientRect();
    if (r) setCardOrigin(r.left + r.width / 2, r.top + r.height / 2);
    onOpen(orb);
  };

  const onPointerDown = (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || phase === "burning") return;
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
    "--dur": `${14 + (h % 9)}s`,
    "--delay": `-${h % 12}s`,
    "--dx": `${10 + (h % 18)}px`,
    "--dy": `${8 + ((h >> 5) % 16)}px`,
    "--i": idx,
  } as CSSProperties;

  return (
    <div className={`orb-anchor${phase ? ` ${phase}` : ""}`} ref={anchor} style={{ ...style, transform: `translate(${off.x}px, ${off.y}px)` }}>
    <button
      ref={button}
      className={`orb${mine ? " mine" : ""}${up ? " launching" : ""}${dying && !up ? " dying" : ""}${sealed ? " sealed" : ""}`}
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
        open(e.currentTarget);
      }}
      aria-label={`${up ? "Launching" : "Open"} ${orb.name}${mine ? `, yours${badge ? ` number ${badge}` : ""}` : ""}`}
    >
      <div className="orb-body">
        <div className="halo" />
        {mine && <span className="claim" />}
        <div className="sphere" />
        <svg className="ring" viewBox="0 0 100 100">
          <circle className="track" cx="50" cy="50" r={R} />
          <circle className="life" cx="50" cy="50" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - (up ? Math.max(0.03, launching) : frac))} />
        </svg>
        <span className="ext">{up && incoming ? `${Math.round(launching * 100)}%` : ext(orb.fileName)}</span>
        {mine && badge ? <span className="mine-no" aria-hidden>{badge}</span> : null}
        {!up && <span className={`bubble lg${watchers ? " hot" : ""}`} aria-label={`${watchers} live, ${orb.views} opened, ${orb.downloads} downloads`}>
          <span title="Live now"><i className="b-live" />{crowd(watchers)}</span>
          <span title="Opened by"><svg viewBox="0 0 16 16" aria-hidden><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>{crowd(orb.views ?? 0)}</span>
          <span title="Downloads">↓{crowd(orb.downloads)}</span>
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
      <div className="orb-label wide">{orb.name}</div>
      <div className="orb-meta mono">
        {orb.by ? <span className="orb-by">{orb.by}</span> : null}
        <span>{formatBytes(orb.size)}</span>
        {up ? <span>↑ {Math.round(launching * 100)}%</span> : <span>{formatClock(left)}</span>}
        {orb.maxDownloads ? <span>max {orb.maxDownloads}</span> : null}
      </div>
      {(mine || nearby || sealed || incoming || orb.open) && (
        <div className="tags">
          {mine && <span className="tag me">{badge ? `YOURS · #${badge}` : "YOURS"}</span>}
          {incoming && <span className="tag in">INCOMING</span>}
          {orb.open && !incoming && <span className="tag open">OPEN</span>}
          {nearby && !mine && !incoming && <span className="tag near">NEARBY</span>}
          {sealed && <span className="tag dead">SEALED</span>}
        </div>
      )}
    </button>
    </div>
  );
}
