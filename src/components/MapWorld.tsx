"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LuEarth, LuMaximize, LuMinus, LuPlus } from "react-icons/lu";
import { mapView } from "@/lib/map";
import { dragAt, overTrash, toTrash } from "@/lib/trash";
import { TrashButton } from "./Trash";

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
 * follows the area as it grows. Zooming out just shows more (smaller); the Earth button goes up to the globe.
 */
// what picks a whole panel up: its header, or its own background (never a button, field or row inside it)
const HANDLE = ".tb-head, .bub-stack.on-map > header";
const INNER = "button, a, input, textarea, select, label, form, .tb-row";
const TEXTY = "input, textarea, select, [contenteditable], .tb-edit, .tb-take, .tb-redeem, .tb-route";

export default function MapWorld({ W, H, band, children, fit, empty, onRect, onEarth, onMoveItem }: {
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
  /** the Earth button: up to the globe */
  onEarth?: () => void;
  /** a panel (task panel, bubble stack) was dragged by this much (world px) */
  onMoveItem?: (key: string, dx: number, dy: number) => void;
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
  // zooming out goes well past the whole area (it all just gets smaller); the fit button brings the opening view back
  const lowK = useCallback(() => Math.min(allK() * 0.5, 0.25), [allK]);
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
    // known at once (not only after the next render): steps a frame apart (smooth wheel zoom) build on each other
    viewRef.current = v;
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
  const pushRect = useCallback(() => {
    const v = viewRef.current, sz = sizeRef.current;
    // keep a whole screen of margin on every side (in world px, so zooming in never shrinks it): nothing within
    // a screen of the edge is ever unmounted, so dragging and pinching never make things blink out and back
    const m = Math.max(sz.w, sz.h, 360) / v.k;
    if (sz.w) onRectRef.current?.({ x0: -v.x / v.k - m, y0: -v.y / v.k - m, x1: (sz.w - v.x) / v.k + m, y1: (sz.h - v.y) / v.k + m, k: v.k });
  }, []);
  useEffect(() => {
    if (rectT.current) return;
    // while the map is actively moving, leave the visible set alone; recompute once it settles (see moving())
    if (box.current?.classList.contains("moving")) return;
    rectT.current = window.setTimeout(() => {
      rectT.current = 0;
      pushRect();
    }, 120);
  }, [view, size, pushRect]);
  useEffect(() => () => clearTimeout(rectT.current), []);

  // while the map moves nothing else animates or reacts to hover: every frame goes to the move
  const stillT = useRef(0);
  const moving = useCallback(() => {
    box.current?.classList.add("moving");
    clearTimeout(stillT.current);
    stillT.current = window.setTimeout(() => {
      box.current?.classList.remove("moving");
      pushRect(); // movement settled: update the visible set once, in one go
    }, 180);
  }, [pushRect]);

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number, animate: boolean) => {
      const v = viewRef.current;
      const k = Math.min(MAX_K, Math.max(lowK(), v.k * factor));
      const f = k / v.k;
      setFollow(false);
      moving();
      go(keepIn({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f }), animate);
    },
    [lowK, keepIn, go, moving],
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

  const emptyRef = useRef(empty);
  emptyRef.current = empty;
  // smooth wheel zoom: the zoom still owed (g.f) is paid out a part every frame, eased, around the pointer
  const wz = useRef({ f: 1, x: 0, y: 0, raf: 0 });
  const step = useCallback(() => {
    const g = wz.current;
    const before = viewRef.current.k;
    const part = Math.abs(Math.log(g.f)) < 0.004 ? g.f : Math.pow(g.f, 0.22);
    zoomAt(part, g.x, g.y, false);
    // at the closest or farthest zoom nothing changes: stop owing it
    g.f = viewRef.current.k === before ? 1 : g.f / part;
    g.raf = Math.abs(Math.log(g.f)) > 0.0005 ? requestAnimationFrame(step) : 0;
    if (!g.raf) g.f = 1;
  }, [zoomAt]);
  useEffect(() => () => cancelAnimationFrame(wz.current.raf), []);

  // wheel: a pinch (ctrl) or a mouse wheel zooms at the pointer; a trackpad's two-finger scroll moves the map
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if ((e.target as Element).closest?.("textarea, .tb-acts, .tb-route, .map-tools, [data-no-pan]")) return;
      // nothing on the map: the wheel scrolls the page as usual (down to How it works)
      if (emptyRef.current && !e.ctrlKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mouse = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || mouse) {
        const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        const f = Math.exp(-d * (e.ctrlKey ? 0.01 : 0.0022));
        // a trackpad pinch is already continuous: follow it as is. A mouse wheel comes in notches: glide there
        if (e.ctrlKey) return zoomAt(f, e.clientX - r.left, e.clientY - r.top, false);
        const g = wz.current;
        g.f *= f;
        g.x = e.clientX - r.left;
        g.y = e.clientY - r.top;
        if (!g.raf) g.raf = requestAnimationFrame(step);
      } else panBy(-e.deltaX, -e.deltaY, false);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    // a trackpad pinch (ctrl + wheel) anywhere else on the page (the bar, the dock…) would zoom the whole
    // browser page and push the controls off screen: it zooms the map instead
    const page = (e: WheelEvent) => {
      if (!e.ctrlKey || el.contains(e.target as Node)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.01), r.width / 2, r.height / 2, false);
    };
    // Safari's own pinch gestures
    const gesture = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", page, { passive: false });
    window.addEventListener("gesturestart", gesture);
    window.addEventListener("gesturechange", gesture);
    return () => {
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("wheel", page);
      window.removeEventListener("gesturestart", gesture);
      window.removeEventListener("gesturechange", gesture);
    };
  }, [zoomAt, panBy, step]);

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
  // ---- a whole panel dragged around the map: a mouse grabs it at once, a finger holds it a moment first ----
  const item = useRef<{ id: number; key: string; el: HTMLElement; sx: number; sy: number; lx: number; ly: number; k: number; armed: boolean; moved: boolean; timer: number } | null>(null);
  const grabItem = (e: React.PointerEvent) => {
    const t = e.target as Element;
    const el = t.closest?.<HTMLElement>("[data-map-key]");
    if (!el || !onMoveItem || pts.current.size) return false;
    const mouse = e.pointerType === "mouse";
    // a mouse grabs a task panel anywhere but its text fields (a click that doesn't move still clicks)
    const onHandle = !!t.closest?.(HANDLE) || (mouse && !!t.closest?.(".task-board") && !t.closest?.(TEXTY));
    if (!onHandle && t.closest?.(INNER)) return false;
    const it = { id: e.pointerId, key: el.dataset.mapKey!, el, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, k: viewRef.current.k, armed: mouse, moved: false, timer: 0 };
    item.current = it;
    // a mouse only captures once the panel really moves (capturing at once would steal the click from its buttons)
    if (!mouse)
      it.timer = window.setTimeout(() => {
        if (item.current !== it) return;
        it.armed = true;
        document.body.dataset.grab = "panel";
        el.classList.add("lifted");
        window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "light" }));
      }, 320);
    return mouse;
  };
  const moveItem = (e: React.PointerEvent) => {
    const it = item.current;
    if (!it || it.id !== e.pointerId) return false;
    // the same invisible wall at the screen's edges for a dragged panel
    const px = Math.min(window.innerWidth - 40, Math.max(40, e.clientX)), py = Math.min(window.innerHeight - 60, Math.max(64, e.clientY));
    const dx = px - it.sx, dy = py - it.sy;
    if (!it.armed) {
      // a finger that moves before the hold is a pan of the map
      if (Math.hypot(dx, dy) > 8) {
        clearTimeout(it.timer);
        item.current = null;
      }
      return false;
    }
    it.lx = px;
    it.ly = py;
    if (!it.moved && Math.hypot(dx, dy) < 5) return true;
    if (!it.moved) {
      it.moved = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      it.el.classList.add("lifted");
      setFollow(false);
    }
    it.el.style.translate = `calc(-50% + ${dx / it.k}px) calc(-50% + ${dy / it.k}px)`;
    dragAt(e.clientX, e.clientY);
    return true;
  };
  const dropItem = (e: React.PointerEvent) => {
    const it = item.current;
    if (!it || it.id !== e.pointerId) return false;
    clearTimeout(it.timer);
    item.current = null;
    delete document.body.dataset.grab;
    it.el.classList.remove("lifted");
    if (!it.moved) return false;
    dragAt(null);
    // let go over the trash: hidden on this browser (lib/trash.ts)
    if (overTrash(it.lx, it.ly)) {
      const label = it.el.getAttribute("aria-label") || it.el.querySelector("header b")?.textContent || "";
      toTrash(it.key, it.key.startsWith("b:") ? `${label.replace(/ \(you\)$/, "")}'s bubbles` : label);
      it.el.style.translate = "";
      return true;
    }
    // the drop lands where it was last seen under the pointer (a lifted finger or a cancel can report 0,0)
    it.el.classList.add("dropped");
    onMoveItem?.(it.key, (it.lx - it.sx) / it.k, (it.ly - it.sy) / it.k);
    requestAnimationFrame(() => {
      it.el.style.translate = "";
      requestAnimationFrame(() => it.el.classList.remove("dropped"));
    });
    // the click that ends a drag never presses the header (folding the panel)
    const stop = (ev: Event) => (ev.stopPropagation(), ev.preventDefault());
    window.addEventListener("click", stop, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 350);
    return true;
  };

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (grabItem(e)) return;
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
    if (moveItem(e)) return;
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
      const k = Math.min(MAX_K, Math.max(lowK(), s.v.k * (d / s.d)));
      const f = k / s.v.k, cx = s.x - r.left, cy = s.y - r.top;
      setView(keepIn({ k, x: cx - (cx - s.v.x) * f + (m.x - s.x), y: cy - (cy - s.v.y) * f + (m.y - s.y) }));
    } else setView(keepIn({ ...s.v, x: s.v.x + m.x - s.x, y: s.v.y + m.y - s.y }));
  };
  const up = (e: React.PointerEvent) => {
    dropItem(e);
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
        <TrashButton />
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
