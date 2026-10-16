"use client";
import { fileKind, typeHue } from "@/lib/skin-list";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ext, formatBytes, formatClock, hasGot, ownerKey, type Orb } from "@/lib/client";
import { KindBadge, Thumb, bubbleLayout, clampTo, fling, memberPos, stopFling, tracker } from "./OrbView";
import { enqueue, useDownloads } from "@/lib/downloads";
import { LuArrowLeft, LuCheck, LuChevronLeft, LuChevronRight, LuDownload, LuEye, LuLock, LuLockOpen, LuTrash2 } from "react-icons/lu";

/**
 * Zoomed into one sender's bubble: the bubble grows out of where it floats to fill the screen, its
 * balls full size with their orbit rings and details. ← → (or the arrows, or a swipe) surf to the
 * next bubble; Esc, the back button or a tap outside zooms back out.
 */
const crowd = (n: number) => (n >= 1000 ? "1k+" : n >= 100 ? "100+" : n >= 10 ? "10+" : String(n));

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
  /** the sender destroys their own objects */
  onDestroy?: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { bubbles, id, now } = props;
  // background downloads: progress per ball, and it greys out the moment it lands
  const { jobs } = useDownloads();
  const job = (oid: string) => jobs.find((j) => j.id === oid);
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
  const ball = useRef<{ id: number; el: HTMLElement; oid: string; sx: number; sy: number; x: number; y: number; w: number; h: number; moved: boolean; tr: ReturnType<typeof tracker>; cx: number; cy: number } | null>(null);
  const skipClick = useRef(false);
  const grab = (e: React.PointerEvent<HTMLButtonElement>, oid: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = e.currentTarget;
    stopFling(oid);
    const box = el.parentElement!.getBoundingClientRect();
    const at = memberPos.get(oid) ?? [parseFloat(el.style.left) / 100, parseFloat(el.style.top) / 100];
    const tr = tracker();
    tr.start(e.clientX, e.clientY);
    ball.current = { id: e.pointerId, el, oid, sx: e.clientX, sy: e.clientY, x: at[0], y: at[1], w: box.width, h: box.height, moved: false, tr, cx: at[0], cy: at[1] };
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
    g.tr.move(e.clientX, e.clientY, g.w, g.h);
    g.cx = x;
    g.cy = y;
    g.el.style.left = `${x * 100}%`;
    g.el.style.top = `${y * 100}%`;
    memberPos.set(g.oid, [x, y]);
  };
  const drop = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const g = ball.current;
    if (!g || g.id !== e.pointerId) return;
    if (g.moved) {
      skipClick.current = true;
      setTimeout(() => (skipClick.current = false), 400);
      // thrown: it glides on and bounces off the glass
      const [vx, vy] = g.tr.velocity();
      fling(g.el, g.oid, g.cx, g.cy, vx, vy, { x0: 0.08, x1: 0.92, y0: 0.12, y1: 0.76 });
    } else g.el.classList.remove("lifted");
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
        <button className="ic-btn" onClick={close} aria-label="Back to the void" title="Back"><LuArrowLeft /></button>
        <div className="zoom-title">
          <b className="wide">{b.name}</b>
          <span className="mono dim">{n} items · {formatBytes(b.members.reduce((a, o) => a + o.size, 0))}{bubbles.length > 1 ? ` · ${at + 1} of ${bubbles.length}` : ""}</span>
        </div>
        {props.onDestroy && b.members.some((o) => ownerKey(o.id)) ? (
          <button className="ic-btn kill" onClick={() => props.onDestroy?.(b.members.map((o) => o.id))} aria-label="Destroy everything in this container" title="Destroy all"><LuTrash2 /></button>
        ) : (
          <span className="zoom-spacer" />
        )}
      </div>

      <div key={b.id} className={`zoom-bubble${dir === 1 ? " from-right" : dir === -1 ? " from-left" : ""}`} style={{ "--ar": L.W / L.H } as CSSProperties}>
        <div className="blob big" />
        {/* live viewers: green dots running exactly along the glass edge */}
        {(() => {
          const live = b.members.reduce((n, o) => n + (o.watchers ?? 0), 0);
          return live > 0 ? (
            <svg className="edge-run big" aria-hidden>
              {Array.from({ length: Math.min(live, 4) }, (_, k) => <rect key={k} pathLength={100} style={{ "--d": `${-k * 2.2}s` } as CSSProperties} />)}
            </svg>
          ) : null;
        })()}
        <div className="zoom-members" style={{ "--zr": (L.d / L.W) * 0.86 } as CSSProperties}>
          {b.members.map((o, i) => {
            const left = new Date(o.expiresAt).getTime() - now;
            const frac = Math.max(0, Math.min(1, left / ((o.life ?? 30) * 60_000)));
            const got = hasGot(o.id);
            return (
              <button
                key={o.id}
                className={`zball${got ? " got" : ""}`}
                style={{ "--sh": o.hue, "--th": typeHue(o.fileName, o.mime), "--mi": i, "--life": frac, left: `${(memberPos.get(o.id)?.[0] ?? L.spots[i]?.[0] ?? 0.5) * 100}%`, top: `${(memberPos.get(o.id)?.[1] ?? L.spots[i]?.[1] ?? 0.5) * 100}%` } as CSSProperties}
                onPointerDown={(e) => grab(e, o.id)}
                onPointerMove={move}
                onPointerUp={drop}
                onPointerCancel={drop}
                onClick={() => {
                  if (skipClick.current) return;
                  props.onOpen(o);
                }}
              >
                <span className={`zsphere${o.thumb && o.open ? " thumbed" : ""}`} data-kind={fileKind(o.fileName, o.mime)}>
                  <KindBadge kind={fileKind(o.fileName, o.mime)} />
                  {o.thumb && o.open && <Thumb id={o.id} fileName={o.fileName} mime={o.mime} />}
                  <span className="zhalo" aria-hidden />
                  <svg className="zring" viewBox="0 0 100 100" aria-hidden>
                    <circle className="track" cx="50" cy="50" r="48" />
                    <circle className="life" cx="50" cy="50" r="48" strokeDasharray={301.6} strokeDashoffset={301.6 * (1 - frac)} />
                  </svg>
                  <span className="zext">{ext(o.fileName)}</span>
                  {/* one green dot orbiting per person looking at it right now */}
                  {Array.from({ length: Math.min(o.watchers ?? 0, 4) }, (_, k) => (
                    <span key={k} className="sat" style={{ "--r": `calc(var(--zd) * 0.19 + ${6 + k * 5}px)`, "--t": `${5 + k * 1.7}s`, "--d": `-${k * 0.9}s` } as CSSProperties} aria-hidden />
                  ))}
                  <span className={`bubble lg zbub${o.watchers ? " hot" : ""}`} aria-label={`${o.watchers ?? 0} live, ${o.views ?? 0} opened, ${o.downloads} downloads`}>
                    <span title="Live now"><i className="b-live" />{crowd(o.watchers ?? 0)}</span>
                    <span title="Opened by"><LuEye />{crowd(o.views ?? 0)}</span>
                    <span title="Downloads"><LuDownload />{crowd(o.downloads)}</span>
                  </span>
                  {/* separate round icons pinned to the ball: grouped on the upper-left of the ring: download, lock, trash */}
                  <span className="zicons">
                    {ownerKey(o.id) && props.onDestroy && (
                      <span
                        className="ic kill"
                        role="button"
                        tabIndex={0}
                        aria-label={`Destroy ${o.name}`}
                        title="Destroy"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onDestroy?.([o.id]);
                        }}
                      >
                        <LuTrash2 />
                      </span>
                    )}
                    <span className={`ic lock${o.open ? " open" : ""}`} title={o.open ? "No password" : "Password needed"} aria-label={o.open ? "No password" : "Password needed"}>
                      {o.open ? <LuLockOpen /> : <LuLock />}
                    </span>
                    {(() => {
                      const j = job(o.id);
                      const busy = j && (j.state === "running" || j.state === "queued");
                      const pct = busy ? (j.state === "running" ? j.frac : 0) : 0;
                      return (
                        <span
                          role="button"
                          tabIndex={0}
                          className={`ic dl${busy ? " busy" : ""}${got ? " got" : ""}${j?.state === "failed" ? " fail" : ""}`}
                          style={{ "--p": pct } as CSSProperties}
                          aria-label={busy ? `Downloading ${o.name}` : `Download ${o.name}`}
                          title={j?.state === "failed" ? `${j.err}: tap to retry` : got ? "Downloaded · tap to get it again" : "Download"}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (busy) return;
                            // open objects go straight to the background queue; locked ones ask for the password first
                            if (o.open) enqueue([o]);
                            else props.onOpen(o);
                          }}
                        >
                          {got && !busy ? <LuCheck /> : <LuDownload />}
                        </span>
                      );
                    })()}
                  </span>
                </span>
                <span className="zname wide">{o.name}</span>
                <span className="zmeta mono">
                  <span>{formatBytes(o.size)}</span>
                  <span>{formatClock(left)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {bubbles.length > 1 && (
        <>
          <button className="zoom-nav prev" onClick={() => surf(-1)} aria-label="Previous container"><LuChevronLeft /></button>
          <button className="zoom-nav next" onClick={() => surf(1)} aria-label="Next container"><LuChevronRight /></button>
        </>
      )}
      <button
        className="cta lg-press zoom-all"
        onClick={() => {
          // all open: straight into the background queue (the balls grey out here as they land); any locked: ask for the code
          if (b.members.every((o) => o.open)) enqueue(b.members);
          else props.onDownloadAll(b.id);
        }}
      >
        <LuDownload />
        {(() => {
          const mine = jobs.filter((j) => b.members.some((o) => o.id === j.id));
          const left = mine.filter((j) => j.state === "queued" || j.state === "running").length;
          return left ? `${mine.length - left}/${mine.length}` : `All ${n}`;
        })()}
      </button>
      <p className="zoom-hint mono dim">Drag · tap to open · scroll down to close</p>
    </div>
  );
}
