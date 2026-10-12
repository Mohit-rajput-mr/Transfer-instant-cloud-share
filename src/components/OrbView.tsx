"use client";
import type { CSSProperties } from "react";
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
    <button
      className={`orb${mine ? " mine" : ""}${dying ? " dying" : ""}${sealed ? " sealed" : ""}`}
      style={style}
      onClick={onOpen}
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
        <span>↓{orb.downloads}{orb.maxDownloads ? `/${orb.maxDownloads}` : ""}</span>
      </div>
      {(mine || nearby || sealed) && (
        <div className="tags">
          {mine && <span className="tag me">YOURS</span>}
          {nearby && !mine && <span className="tag near">NEARBY</span>}
          {sealed && <span className="tag dead">SEALED</span>}
        </div>
      )}
    </button>
  );
}
