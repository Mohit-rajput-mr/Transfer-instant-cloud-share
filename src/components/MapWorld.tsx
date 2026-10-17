"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LuMaximize, LuMinus, LuPlus } from "react-icons/lu";
import { mapView } from "@/lib/map";

type View = { x: number; y: number; k: number };
/** what covers the edges of the screen (header, send button…): the world is fitted inside the rest */
export type Band = { top: number; bottom: number; left: number; right: number };

const MAX_K = 2.5;
// touches on these are the thing's own (open, drag, type), never a pan of the map
const OWN = "button, a, input, textarea, select, label, form, .orb-anchor, .task-board, .bub-stack, .tb-acts, .map-tools, [data-no-pan]";
// a finger on a ball still moves the map (a short hold picks the ball up instead, see OrbView)
// (a finger on a panel moves the map too; the tap that ends a pan never presses what it lifted off)
const OWN_TOUCH = "input, textarea, select, .tb-acts, .tb-route, .map-tools, [data-no-pan], .orb-anchor.dragging";

/**
 * The world, seen from above: drag the sky to move around, scroll / pinch to zoom (at the pointer), double-click
 * to zoom in. Until you move it yourself the view follows the world, zooming out as it grows so everything is
 * in sight; the fit button goes back to that.
 */
export default function MapWorld({ W, H, band, children, onView, fit, empty }: { W: number; H: number; band: Band; children: ReactNode; onView?: (k: number) => void; /** bumped when this device adds something: back to seeing everything, so it is in sight */ fit?: number; /** nothing on the map yet: no zoom tools */ empty?: boolean }) {
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

  const minK = useCallback(() => {
    const aw = Math.max(100, size.w - band.left - band.right), ah = Math.max(100, size.h - band.top - band.bottom);
    return Math.min(1, aw / W, ah / H);
  }, [size, band, W, H]);
  const fitView = useCallback((): View => {
    const k = minK();
    const aw = size.w - band.left - band.right, ah = size.h - band.top - band.bottom;
    return { k, x: band.left + (aw - W * k) / 2, y: band.top + (ah - H * k) / 2 };
  }, [minK, size, band, W, H]);
  // a view never drifts so far that the world leaves the screen
  const keepIn = useCallback(
    (v: View): View => {
      const k = Math.min(MAX_K, Math.max(minK() * 0.6, v.k));
      const pad = 80;
      const x = Math.min(size.w - pad, Math.max(pad - W * k, v.x));
      const y = Math.min(size.h - pad, Math.max(pad - H * k, v.y));
      return { k, x, y };
    },
    [minK, size, W, H],
  );
  const go = useCallback((v: View, animate: boolean) => {
    setGlide(animate);
    setView(v);
  }, []);

  // following: the whole world stays in sight as it grows or the screen changes
  useEffect(() => {
    if (!size.w) return;
    if (follow) go(fitView(), viewRef.current.k !== 1 || viewRef.current.x !== 0);
    else go(keepIn(viewRef.current), true);
  }, [follow, fitView, keepIn, go, size.w]);

  useEffect(() => {
    mapView.on = true;
    mapView.k = view.k;
    onView?.(view.k);
  }, [view.k, onView]);
  useEffect(
    () => () => {
      mapView.on = false;
      mapView.k = 1;
    },
    [],
  );

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number, animate: boolean) => {
      const v = viewRef.current;
      const k = Math.min(MAX_K, Math.max(minK() * 0.6, v.k * factor));
      const f = k / v.k;
      setFollow(false);
      go(keepIn({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f }), animate);
    },
    [minK, keepIn, go],
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
      } else {
        const v = viewRef.current;
        setFollow(false);
        go(keepIn({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }), false);
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoomAt, keepIn, go]);

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
    // a ball was picked up (held): it is the ball that moves now, not the map
    if (pts.current.size === 1 && document.querySelector(".orb-anchor.dragging")) {
      pts.current.clear();
      g.current = null;
      return;
    }
    if (!s.moved && Math.hypot(m.x - s.x, m.y - s.y) < 4) return;
    if (!s.moved) setFollow(false);
    s.moved = true;
    if (m.ps.length > 1 && s.d > 0) {
      const r = box.current!.getBoundingClientRect();
      const d = Math.hypot(m.ps[0].x - m.ps[1].x, m.ps[0].y - m.ps[1].y);
      const k = Math.min(MAX_K, Math.max(minK() * 0.6, s.v.k * (d / s.d)));
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

  const center = () => ({ x: band.left + (size.w - band.left - band.right) / 2, y: band.top + (size.h - band.top - band.bottom) / 2 });
  const fitted = follow;

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
        className={`world${glide ? " glide" : ""}`}
        style={{ width: W, height: H, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.k})`, "--mk": view.k } as CSSProperties}
      >
        {children}
      </div>
      {!empty && <div className="map-tools lg" data-no-pan>
        <button onClick={() => zoomAt(1.35, center().x, center().y, true)} aria-label="Zoom in" title="Zoom in"><LuPlus /></button>
        <span className="mono">{Math.round(view.k * 100)}%</span>
        <button onClick={() => zoomAt(1 / 1.35, center().x, center().y, true)} aria-label="Zoom out" title="Zoom out"><LuMinus /></button>
        <button className={fitted ? "on" : ""} onClick={() => setFollow(true)} aria-label="See everything" title="See everything"><LuMaximize /></button>
      </div>}
    </div>
  );
}
