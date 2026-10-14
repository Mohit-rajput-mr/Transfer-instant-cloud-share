"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ext, formatBytes, formatClock, hasGot, type Orb } from "@/lib/client";
import { bubbleLayout, clampTo, memberPos } from "./OrbView";

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

  // scroll down (or pinch out) to zoom back out to the void. Subscribed once: the void re-renders
  // every second, and re-subscribing would reset a scroll that is under way.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    let acc = 0, idle: ReturnType<typeof setTimeout> | null = null;
    const wheel = (e: WheelEvent) => {
      if (document.querySelector(".drawer, .pop")) return;
      e.preventDefault();
      acc = Math.max(0, acc + e.deltaY * (e.deltaMode === 1 ? 16 : 1));
      if (idle) clearTimeout(idle);
      // a mouse wheel sends one notch at a time with a pause between: keep counting across it
      idle = setTimeout(() => (acc = 0), 900);
      if (acc > 150) {
        acc = 0;
        closeRef.current();
      }
    };
    window.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", wheel);
      if (idle) clearTimeout(idle);
    };
  }, []);

  // drag any ball anywhere inside the bubble; a drag never opens it
  const ball = useRef<{ id: number; el: HTMLElement; oid: string; sx: number; sy: number; x: number; y: number; w: number; h: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const grab = (e: React.PointerEvent<HTMLButtonElement>, oid: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const box = el.parentElement!.getBoundingClientRect();
    const at = memberPos.get(oid) ?? [parseFloat(el.style.left) / 100, parseFloat(el.style.top) / 100];
    ball.current = { id: e.pointerId, el, oid, sx: e.clientX, sy: e.clientY, x: at[0], y: at[1], w: box.width, h: box.height, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const g = ball.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < 6) return;
    if (!g.moved) g.el.classList.add("lifted");
    g.moved = true;
    const x = clampTo(g.x + dx / g.w, 0.08, 0.92), y = clampTo(g.y + dy / g.h, 0.12, 0.76);
    g.el.style.left = `${x * 100}%`;
    g.el.style.top = `${y * 100}%`;
    memberPos.set(g.oid, [x, y]);
  };
  const drop = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const g = ball.current;
    if (!g || g.id !== e.pointerId) return;
    g.el.classList.remove("lifted");
    if (g.moved) {
      skipClick.current = true;
      setTimeout(() => (skipClick.current = false), 400);
    }
    ball.current = null;
  };

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
          <span className="mono dim">{n} items · {formatBytes(b.members.reduce((a, o) => a + o.size, 0))}{bubbles.length > 1 ? ` · ${at + 1} of ${bubbles.length}` : ""}</span>
        </div>
        <span className="zoom-spacer" />
      </div>

      <div key={b.id} className={`zoom-bubble${dir === 1 ? " from-right" : dir === -1 ? " from-left" : ""}`} style={{ "--ar": L.W / L.H } as CSSProperties}>
        <div className="blob big" />
        <div className="zoom-members" style={{ "--zr": (L.d / L.W) * 0.86 } as CSSProperties}>
          {b.members.map((o, i) => {
            const left = new Date(o.expiresAt).getTime() - now;
            const frac = Math.max(0, Math.min(1, left / ((o.life ?? 30) * 60_000)));
            const got = hasGot(o.id);
            return (
              <button
                key={o.id}
                className={`zball${got ? " got" : ""}`}
                style={{ "--sh": o.hue, "--mi": i, left: `${(memberPos.get(o.id)?.[0] ?? L.spots[i]?.[0] ?? 0.5) * 100}%`, top: `${(memberPos.get(o.id)?.[1] ?? L.spots[i]?.[1] ?? 0.5) * 100}%` } as CSSProperties}
                onPointerDown={(e) => grab(e, o.id)}
                onPointerMove={move}
                onPointerUp={drop}
                onPointerCancel={drop}
                onClick={() => {
                  if (skipClick.current) return;
                  props.onOpen(o);
                }}
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
          <button className="zoom-nav prev" onClick={() => surf(-1)} aria-label="Previous container">‹</button>
          <button className="zoom-nav next" onClick={() => surf(1)} aria-label="Next container">›</button>
        </>
      )}
      <button className="cta lg-press zoom-all" onClick={() => props.onDownloadAll(b.id)}>Download all {n} ↓</button>
      <p className="zoom-hint mono dim">Drag balls anywhere · tap one to download just that one · scroll down to zoom out · {bubbles.length > 1 ? "← → to surf senders · " : ""}Esc to zoom out</p>
    </div>
  );
}
