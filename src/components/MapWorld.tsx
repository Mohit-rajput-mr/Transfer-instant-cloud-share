"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LuEarth, LuMaximize, LuMinus, LuPlus } from "react-icons/lu";
import { mapView } from "@/lib/map";

type View = { x: number; y: number; k: number };
/** what covers the edges of the screen (header, send button…): the world is fitted inside the rest */
export type Band = { top: number; bottom: number; left: number; right: number };
/** the part of the world on screen (world px), a little wider than the screen so nothing pops in at the edge */
export type Rect = { x0: number; y0: number; x1: number; y1: number; k: number };

const MAX_K = 2.5;
// the view opens at a size things are easy to read at; zooming out further shows more of the area, then the Earth
const OPEN_K = 0.62;
// far out, things are drawn simply (no names, stats or idle motion): cheaper, and unreadable anyway
const FAR_K = 0.42;
// touches on these are the thing's own (open, drag, type), never a pan of the map
const OWN = "button, a, input, textarea, select, label, form, .orb-anchor, .task-board, .bub-stack, .tb-acts, .map-tools, [data-no-pan]";
// a finger on a ball still moves the map (a short hold picks the ball up instead, see OrbView)
// (a finger on a panel moves the map too; the tap that ends a pan never presses what it lifted off)
const OWN_TOUCH = "input, textarea, select, .tb-acts, .tb-route, .map-tools, [data-no-pan], .orb-anchor.dragging";

/**
 * The area, seen from above, with Google Maps' controls: drag to move, scroll / pinch to zoom at the pointer,
 * double-click to zoom in, arrow keys to move, + / - to zoom, 0 to go back. Until you move it yourself the view
 * follows the area as it grows. Zooming out past all of it (or the Earth button) goes up to the Earth.
 */
export default function MapWorld({ W, H, band, children, fit, empty, onRect, onEarth }: {
  W: number;
  H: number;
  band: Band;
  children: ReactNode;
  /** bumped when this device adds something: back to the opening view, so it is in sight */
  fit?: number;
  /** nothing on the map yet: no zoom tools */
  empty?: boolean;
  /** what is on screen (only that needs drawing) */
  onRect?: (r: Rect) => void;
  /** zoomed out past the whole area: up to the Earth */
  onEarth?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [glide, setGlide] = useState(false);
  const [follow, setFollow] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (fit) setFollow(true);
  }, [fit]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const on = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    on();
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** the zoom that shows the whole area */
  const allK = useCallback(() => {
    const aw = Math.max(100, size.w - band.left - band.right), ah = Math.max(100, size.h - band.top - band.bottom);
    return Math.min(1, aw / W, ah / H);
  }, [size, band, W, H]);
  const lowK = useCallback(() => allK() * 0.85, [allK]);
  const fitView = useCallback((): View => {
    const k = Math.max(allK(), OPEN_K);
    const aw = size.w - band.left - band.right, ah = size.h - band.top - band.bottom;
    return { k, x: band.left + (aw - W * k) / 2, y: band.top + (ah - H * k) / 2 };
  }, [allK, size, band, W, H]);
  // a view never drifts so far that the area leaves the screen
  const keepIn = useCallback(
    (v: View): View => {
      const k = Math.min(MAX_K, Math.max(lowK(), v.k));
      const pad = 80;
      const x = Math.min(size.w - pad, Math.max(pad - W * k, v.x));
      const y = Math.min(size.h - pad, Math.max(pad - H * k, v.y));
      return { k, x, y };
    },
    [lowK, size, W, H],
  );
  const go = useCallback((v: View, animate: boolean) => {
    setGlide(animate);
    setView(v);
  }, []);

  // following: the area stays framed as it grows or the screen changes
  useEffect(() => {
    if (!size.w) return;
    if (follow) go(fitView(), viewRef.current.k !== 1 || viewRef.current.x !== 0);
    else go(keepIn(viewRef.current), true);
  }, [follow, fitView, keepIn, go, size.w]);

  useEffect(() => {
    mapView.on = true;
    mapView.k = view.k;
  }, [view.k]);
  useEffect(
    () => () => {
      mapView.on = false;
      mapView.k = 1;
    },
    [],
  );

  // what is on screen, told at most every 120 ms (the page draws only that)
  // (read through refs when the timer fires: the screen size and the view as they are then)
  const rectT = useRef(0);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const onRectRef = useRef(onRect);
  onRectRef.current = onRect;
  useEffect(() => {
    if (rectT.current) return;
    rectT.current = window.setTimeout(() => {
      rectT.current = 0;
      const v = viewRef.current, sz = sizeRef.current, m = 260 / v.k;
      if (sz.w) onRectRef.current?.({ x0: -v.x / v.k - m, y0: -v.y / v.k - m, x1: (sz.w - v.x) / v.k + m, y1: (sz.h - v.y) / v.k + m, k: v.k });
    }, 120);
  }, [view, size]);
  useEffect(() => () => clearTimeout(rectT.current), []);

  // while the map moves nothing else animates or reacts to hover: every frame goes to the move
  const stillT = useRef(0);
  const moving = useCallback(() => {
    box.current?.classList.add("moving");
    clearTimeout(stillT.current);
    stillT.current = window.setTimeout(() => box.current?.classList.remove("moving"), 180);
  }, []);

  // zooming out against the edge a few times in a row goes up to the Earth
  const push = useRef({ n: 0, t: 0 });
  const outAtEdge = useCallback(() => {
    const now = performance.now();
    push.current = now - push.current.t < 700 ? { n: push.current.n + 1, t: now } : { n: 1, t: now };
    if (push.current.n >= 4 && onEarth) {
      push.current = { n: 0, t: 0 };
      onEarth();
    }
  }, [onEarth]);

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number, animate: boolean) => {
      const v = viewRef.current;
      if (factor < 1 && v.k <= lowK() + 1e-4) return outAtEdge();
      const k = Math.min(MAX_K, Math.max(lowK(), v.k * factor));
      const f = k / v.k;
      setFollow(false);
      moving();
      go(keepIn({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f }), animate);
    },
    [lowK, keepIn, go, moving, outAtEdge],
  );
  const center = useCallback(() => ({ x: band.left + (size.w - band.left - band.right) / 2, y: band.top + (size.h - band.top - band.bottom) / 2 }), [band, size]);
  const panBy = useCallback(
    (dx: number, dy: number, animate: boolean) => {
      const v = viewRef.current;
      setFollow(false);
      moving();
      go(keepIn({ ...v, x: v.x + dx, y: v.y + dy }), animate);
    },
    [keepIn, go, moving],
  );

  // wheel: a pinch (ctrl) or a mouse wheel zooms at the pointer; a trackpad's two-finger scroll moves the map
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if ((e.target as Element).closest?.("textarea, .tb-acts, .tb-route, .map-tools, [data-no-pan]")) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mouse = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || mouse) {
        const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        zoomAt(Math.exp(-d * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX - r.left, e.clientY - r.top, false);
      } else panBy(-e.deltaX, -e.deltaY, false);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoomAt, panBy]);

  // keys, like a map: arrows move, + / - zoom, 0 goes back to the opening view (not while typing or with a card open)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest?.("input, textarea, select, [contenteditable]") || document.documentElement.classList.contains("card-open")) return;
      const c = center(), step = 140;
      const acts: Record<string, () => void> = {
        ArrowLeft: () => panBy(step, 0, true),
        ArrowRight: () => panBy(-step, 0, true),
        ArrowUp: () => panBy(0, step, true),
        ArrowDown: () => panBy(0, -step, true),
        "+": () => zoomAt(1.35, c.x, c.y, true),
        "=": () => zoomAt(1.35, c.x, c.y, true),
        "-": () => zoomAt(1 / 1.35, c.x, c.y, true),
        "0": () => setFollow(true),
      };
      const f = acts[e.key];
      if (!f) return;
      e.preventDefault();
      f();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [center, panBy, zoomAt]);

  // drag the sky to pan; two fingers pinch
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{ x: number; y: number; d: number; v: View; moved: boolean } | null>(null);
  const mid = () => {
    const ps = [...pts.current.values()];
    return { ps, x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length };
  };
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // a second finger joins a pinch even if it lands on something
    const mouse = e.pointerType === "mouse";
    if (!pts.current.size && (e.target as Element).closest?.(mouse ? OWN : OWN_TOUCH)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // a finger is already held by what it touched (and its moves bubble up here); taking it would rob a ball of its hold
    if (mouse)
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    const m = mid();
    g.current = { x: m.x, y: m.y, d: m.ps.length > 1 ? Math.hypot(m.ps[0].x - m.ps[1].x, m.ps[0].y - m.ps[1].y) : 0, v: viewRef.current, moved: false };
    setGlide(false);
  };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId) || !g.current) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = g.current, m = mid();
    // a ball (or a task) was picked up: it is what moves now, not the map
    if (pts.current.size === 1 && (document.querySelector(".orb-anchor.dragging") || document.body.dataset.grab)) {
      pts.current.clear();
      g.current = null;
      return;
    }
    if (!s.moved && Math.hypot(m.x - s.x, m.y - s.y) < 4) return;
    if (!s.moved) setFollow(false);
    s.moved = true;
    moving();
    if (m.ps.length > 1 && s.d > 0) {
      const r = box.current!.getBoundingClientRect();
      const d = Math.hypot(m.ps[0].x - m.ps[1].x, m.ps[0].y - m.ps[1].y);
      // pinching in against the edge: up to the Earth
      if (d / s.d < 0.7 && s.v.k <= lowK() + 1e-4 && onEarth) {
        pts.current.clear();
        g.current = null;
        return onEarth();
      }
      const k = Math.min(MAX_K, Math.max(lowK(), s.v.k * (d / s.d)));
      const f = k / s.v.k, cx = s.x - r.left, cy = s.y - r.top;
      setView(keepIn({ k, x: cx - (cx - s.v.x) * f + (m.x - s.x), y: cy - (cy - s.v.y) * f + (m.y - s.y) }));
    } else setView(keepIn({ ...s.v, x: s.v.x + m.x - s.x, y: s.v.y + m.y - s.y }));
  };
  const up = (e: React.PointerEvent) => {
    if (!pts.current.delete(e.pointerId)) return;
    if (g.current?.moved && e.pointerType !== "mouse") {
      const stop = (ev: Event) => (ev.stopPropagation(), ev.preventDefault());
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 350);
    }
    if (!pts.current.size) g.current = null;
    else {
      // one finger left of a pinch: keep panning from here
      const m = mid();
      g.current = { x: m.x, y: m.y, d: 0, v: viewRef.current, moved: true };
    }
  };

  return (
    <div
      ref={box}
      className="map-view"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={(e) => {
        if ((e.target as Element).closest?.(OWN)) return;
        const r = box.current!.getBoundingClientRect();
        zoomAt(1.6, e.clientX - r.left, e.clientY - r.top, true);
      }}
    >
      <div
        className={`world${glide ? " glide" : ""}${view.k < FAR_K ? " far" : ""}`}
        style={{ width: W, height: H, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.k})`, "--mk": view.k } as CSSProperties}
      >
        {children}
      </div>
      <div className="map-tools lg" data-no-pan>
        {!empty && (
          <>
            <button onClick={() => zoomAt(1.35, center().x, center().y, true)} aria-label="Zoom in (+)" title="Zoom in (+)"><LuPlus /></button>
            <span className="mono">{Math.round(view.k * 100)}%</span>
            <button onClick={() => zoomAt(1 / 1.35, center().x, center().y, true)} aria-label="Zoom out (-)" title="Zoom out (-)"><LuMinus /></button>
            <button className={follow ? "on" : ""} onClick={() => setFollow(true)} aria-label="Back to the opening view (0)" title="Back to the opening view (0)"><LuMaximize /></button>
          </>
        )}
        {onEarth && <button className="map-earth" onClick={onEarth} aria-label="See the whole Earth" title="See the whole Earth"><LuEarth /></button>}
      </div>
    </div>
  );
}
