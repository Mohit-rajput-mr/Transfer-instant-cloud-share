"use client";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ext, formatBytes, formatClock, hasGot, type Orb } from "@/lib/client";
import { bubbleLayout } from "./OrbView";

/**
 * Zoomed into one sender's bubble: the bubble grows out of where it floats to fill the screen, its
 * balls full size with their orbit rings and details. ← → (or the arrows, or a swipe) surf to the
 * next bubble; Esc, the back button or a tap outside zooms back out.
 */
export default function BubbleZoom(props: {
  /** every bubble in the void, in order: [id, name, members] */
  bubbles: { id: string; name: string; members: Orb[] }[];
  id: string;
  /** where the bubble floats (zoom grows from / shrinks back to it) */
  from: { x: number; y: number } | null;
  now: number;
  onSurf: (id: string) => void;
  onOpen: (o: Orb) => void;
  onDownloadAll: (id: string) => void;
  onClose: () => void;
}) {
  const { bubbles, id, now } = props;
  const at = Math.max(0, bubbles.findIndex((b) => b.id === id));
  const b = bubbles[at];
  const [leaving, setLeaving] = useState(false);
  const [dir, setDir] = useState<0 | 1 | -1>(0);

  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(props.onClose, 180);
  }, [props.onClose]);
  const surf = useCallback(
    (d: 1 | -1) => {
      if (bubbles.length < 2) return;
      setDir(d);
      props.onSurf(bubbles[(at + d + bubbles.length) % bubbles.length].id);
    },
    [at, bubbles, props],
  );

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      // a panel opened from here (an object, Download all) takes the keys first
      if (document.querySelector(".drawer, .pop")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") surf(1);
      else if (e.key === "ArrowLeft") surf(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [close, surf]);

  // swipe sideways on touch screens to surf
  const [sx, setSx] = useState<number | null>(null);

  if (!b) return null;
  const n = b.members.length;
  // the same loose, round arrangement as the bubble in the void, just bigger
  const L = bubbleLayout(n);
  const origin = props.from ? `${props.from.x}px ${props.from.y}px` : "50% 50%";

  return (
    <div
      className={`zoom-layer${leaving ? " out" : ""}`}
      style={{ "--zo": origin } as CSSProperties}
      onClick={(e) => e.target === e.currentTarget && close()}
      onPointerDown={(e) => e.pointerType !== "mouse" && setSx(e.clientX)}
      onPointerUp={(e) => {
        if (sx == null) return;
        const dx = e.clientX - sx;
        setSx(null);
        if (Math.abs(dx) > 60) surf(dx < 0 ? 1 : -1);
      }}
      role="dialog"
      aria-label={`${b.name}: ${n} items from one sender`}
    >
      <div className="zoom-top">
        <button className="pill lg-press" onClick={close}>← Back to the void</button>
        <div className="zoom-title">
          <b className="wide">{b.name}</b>
          <span className="mono dim">{n} items · {formatBytes(b.members.reduce((a, o) => a + o.size, 0))}{bubbles.length > 1 ? ` · bubble ${at + 1} of ${bubbles.length}` : ""}</span>
        </div>
        <span className="zoom-spacer" />
      </div>

      <div key={b.id} className={`zoom-bubble${dir === 1 ? " from-right" : dir === -1 ? " from-left" : ""}`}>
        <div className="blob big" />
        <div className="zoom-members" style={{ "--zr": (L.d / L.D) * 0.82 } as CSSProperties}>
          {b.members.map((o, i) => {
            const left = new Date(o.expiresAt).getTime() - now;
            const frac = Math.max(0, Math.min(1, left / ((o.life ?? 30) * 60_000)));
            const got = hasGot(o.id);
            return (
              <button
                key={o.id}
                className={`zball${got ? " got" : ""}`}
                style={{ "--sh": o.hue, "--mi": i, left: `${(L.spots[i]?.[0] ?? 0.5) * 100}%`, top: `${(L.spots[i]?.[1] ?? 0.5) * 100}%` } as CSSProperties}
                onClick={() => props.onOpen(o)}
              >
                <span className="zsphere">
                  <svg className="zring" viewBox="0 0 100 100" aria-hidden>
                    <circle className="track" cx="50" cy="50" r="48" />
                    <circle className="life" cx="50" cy="50" r="48" strokeDasharray={301.6} strokeDashoffset={301.6 * (1 - frac)} />
                  </svg>
                  <span className="zext">{ext(o.fileName)}</span>
                  <span className="zstats mono">↓{o.downloads} · {o.views} seen</span>
                </span>
                <span className="zname wide">{o.name}</span>
                <span className="zmeta mono">{formatBytes(o.size)} · {formatClock(left)}</span>
                <span className="ztags">
                  {o.open ? <span className="tag open">OPEN</span> : <span className="tag">PASSCODE</span>}
                  {got && <span className="tag got">DOWNLOADED</span>}
                </span>
                <span className="zdl">{got ? "Again ↓" : "Download ↓"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {bubbles.length > 1 && (
        <>
          <button className="zoom-nav prev" onClick={() => surf(-1)} aria-label="Previous bubble">‹</button>
          <button className="zoom-nav next" onClick={() => surf(1)} aria-label="Next bubble">›</button>
        </>
      )}
      <button className="cta lg-press zoom-all" onClick={() => props.onDownloadAll(b.id)}>Download all {n} ↓</button>
      <p className="zoom-hint mono dim">Tap a ball to download just that one · {bubbles.length > 1 ? "← → to surf bubbles · " : ""}Esc to zoom out</p>
    </div>
  );
}
