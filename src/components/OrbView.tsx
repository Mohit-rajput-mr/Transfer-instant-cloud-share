"use client";
import { useRef, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { ext, formatBytes, formatClock, type Orb } from "@/lib/client";

export const LIFETIME_MS = 30 * 60 * 1000;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A fixed constellation of slots keeps objects from piling up on each other.
const SLOTS: [number, number][] = [
  [50, 50], [26, 38], [74, 36], [36, 70], [66, 68], [14, 58], [86, 56], [50, 28], [22, 80],
  [80, 82], [40, 46], [60, 46], [8, 34], [92, 30], [50, 84], [30, 24], [70, 22], [12, 84],
];

export function layout(orbs: Orb[]) {
  const taken = new Set<number>();
  const out = new Map<string, { x: number; y: number }>();
  const sorted = [...orbs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const o of sorted) {
    const h = hash(o.id);
    let slot = -1;
    for (let k = 0; k < SLOTS.length; k++) {
      const s = (k === 0 ? (taken.size === 0 ? 0 : h % SLOTS.length) : (h + k) % SLOTS.length);
      if (!taken.has(s)) {
        slot = s;
        break;
      }
    }
    let x: number, y: number;
    if (slot >= 0) {
      taken.add(slot);
      [x, y] = SLOTS[slot];
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

// Where the user has thrown each orb, kept across re-renders (this device only).
const offsets = new Map<string, { x: number; y: number }>();

export default function OrbView(props: {
  orb: Orb;
  pos: { x: number; y: number };
  now: number;
  mine: boolean;
  nearby: boolean;
  watchers: number;
  onOpen: () => void;
}) {
  const { orb, pos, now, mine, nearby, watchers, onOpen } = props;
  const h = hash(orb.id);
  const left = new Date(orb.expiresAt).getTime() - now;
  const frac = Math.max(0, Math.min(1, left / LIFETIME_MS));
  const size = Math.round(96 + Math.min(1, Math.log10(Math.max(orb.size, 1024)) / 10) * 70);
  const R = 48;
  const C = 2 * Math.PI * R;
  const sealed = orb.status === "sealed";
  const dying = left < 60_000;

  const anchor = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean; vx: number; vy: number; lx: number; ly: number; lt: number; raf: number } | null>(null);
  const suppressClick = useRef(false);
  const off = offsets.get(orb.id) ?? { x: 0, y: 0 };

  const apply = (x: number, y: number, tilt = 0) => {
    offsets.set(orb.id, { x, y });
    const el = anchor.current;
    if (el) {
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.setProperty("--tilt", `${tilt}deg`);
    }
  };

  // keep the orb inside the void
  const clamp = (x: number, y: number) => {
    const el = anchor.current;
    const box = el?.offsetParent?.getBoundingClientRect();
    if (!el || !box) return { x, y, hitX: false, hitY: false };
    const bx = el.offsetLeft, by = el.offsetTop, m = 40;
    const cx = Math.min(box.width - m - bx, Math.max(m - bx, x));
    const cy = Math.min(box.height - m - by, Math.max(90 - by, y));
    return { x: cx, y: cy, hitX: cx !== x, hitY: cy !== y };
  };

  const onPointerDown = (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const d = drag.current;
    if (d) cancelAnimationFrame(d.raf);
    const cur = offsets.get(orb.id) ?? { x: 0, y: 0 };
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: cur.x, oy: cur.y, moved: false, vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now(), raf: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      anchor.current?.classList.add("dragging");
    }
    const now = performance.now(), dt = Math.max(1, now - d.lt);
    d.vx = d.vx * 0.6 + ((e.clientX - d.lx) / dt) * 16 * 0.4;
    d.vy = d.vy * 0.6 + ((e.clientY - d.ly) / dt) * 16 * 0.4;
    d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
    const c = clamp(d.ox + dx, d.oy + dy);
    apply(c.x, c.y, Math.max(-18, Math.min(18, d.vx * 1.2)));
  };

  const onPointerUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      drag.current = null;
      return;
    }
    suppressClick.current = true;
    const el = anchor.current;
    el?.classList.remove("dragging");
    el?.classList.add("flung");
    // momentum glide with soft bounces off the edges
    let { vx, vy } = d;
    let { x, y } = offsets.get(orb.id) ?? { x: 0, y: 0 };
    const step = () => {
      vx *= 0.95; vy *= 0.95;
      const c = clamp(x + vx, y + vy);
      if (c.hitX) vx = -vx * 0.6;
      if (c.hitY) vy = -vy * 0.6;
      x = c.x; y = c.y;
      apply(x, y, Math.max(-18, Math.min(18, vx * 1.2)));
      if (Math.hypot(vx, vy) > 0.15) d.raf = requestAnimationFrame(step);
      else {
        apply(x, y, 0);
        el?.classList.remove("flung");
        drag.current = null;
      }
    };
    d.raf = requestAnimationFrame(step);
  };

  const style = {
    "--x": `${pos.x}%`,
    "--y": `${pos.y}%`,
    "--s": `${size}px`,
    "--hue": orb.hue,
    "--dur": `${14 + (h % 9)}s`,
    "--delay": `-${h % 12}s`,
    "--dx": `${10 + (h % 18)}px`,
    "--dy": `${8 + ((h >> 5) % 16)}px`,
  } as CSSProperties;

  return (
    <div className="orb-anchor" ref={anchor} style={{ ...style, transform: `translate(${off.x}px, ${off.y}px)` }}>
    <button
      className={`orb${mine ? " mine" : ""}${dying ? " dying" : ""}${sealed ? " sealed" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onOpen();
      }}
      aria-label={`Open ${orb.name}`}
    >
      <div className="orb-body">
        <div className="halo" />
        <div className="sphere" />
        <svg className="ring" viewBox="0 0 100 100">
          <circle className="track" cx="50" cy="50" r={R} />
          <circle className="life" cx="50" cy="50" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
        </svg>
        <span className="ext">{ext(orb.fileName)}</span>
        <span className={`bubble${watchers ? " hot" : ""}`} aria-label={`${watchers} live, ${orb.views} opened, ${orb.downloads} downloads`}>
          <span title="Live now"><i className="b-live" />{watchers}</span>
          <span title="Opened by"><svg viewBox="0 0 16 16" aria-hidden><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>{orb.views ?? 0}</span>
          <span title="Downloads">↓{orb.downloads}</span>
        </span>
        {Array.from({ length: Math.min(watchers, 8) }, (_, i) => (
          <span
            key={i}
            className="sat"
            style={{ "--r": `${6 + i * 5}px`, "--t": `${5 + i * 1.7}s`, "--d": `-${i * 0.9}s` } as CSSProperties}
          />
        ))}
      </div>
      <div className="orb-label wide">{orb.name}</div>
      <div className="orb-meta mono">
        <span>{formatBytes(orb.size)}</span>
        <span>{formatClock(left)}</span>
        {orb.maxDownloads ? <span>max {orb.maxDownloads}</span> : null}
      </div>
      {(mine || nearby || sealed) && (
        <div className="tags">
          {mine && <span className="tag me">YOURS</span>}
          {nearby && !mine && <span className="tag near">NEARBY</span>}
          {sealed && <span className="tag dead">SEALED</span>}
        </div>
      )}
    </button>
    </div>
  );
}
