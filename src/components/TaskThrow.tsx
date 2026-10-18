"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LuLock, LuOrbit } from "react-icons/lu";
import { taskLabel, taskLine, type Task } from "@/lib/tasks";

export type ThrowTarget = { slug: string; title: string };
export type Grab = { task: Task; x: number; y: number };

/**
 * A task picked up off its panel: it follows the finger / pointer, and big targets rise from the bottom — "Throw into
 * <space>" for each of your spaces, or "New private space". Let go over one and the task flies in (it shrinks and
 * spins into the target, which swallows it); anywhere else it drops back.
 */
export default function TaskThrow(props: { grab: Grab; targets: ThrowTarget[]; onThrow: (t: Task, to: ThrowTarget | null) => void; onCancel: () => void }) {
  const { grab, targets } = props;
  const [pos, setPos] = useState({ x: grab.x, y: grab.y });
  const [hot, setHot] = useState<number | null>(null);
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null);
  const zones = useRef<(HTMLButtonElement | null)[]>([]);
  const hotRef = useRef(hot);
  hotRef.current = hot;
  // one slot per space, then "new private space"
  const slots = (t: ThrowTarget[]): (ThrowTarget | null)[] => [...t.slice(0, 3), null];
  const all = slots(targets);
  const act = useRef(props);
  act.current = props;

  useEffect(() => {
    document.body.dataset.grab = "task";
    const hit = (x: number, y: number) => {
      let best: number | null = null;
      zones.current.forEach((z, i) => {
        const r = z?.getBoundingClientRect();
        if (r && x > r.left - 24 && x < r.right + 24 && y > r.top - 40 && y < r.bottom + 24) best = i;
      });
      return best;
    };
    const move = (e: PointerEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY });
      const h = hit(e.clientX, e.clientY);
      if (h !== hotRef.current && h !== null) window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "light" }));
      setHot(h);
    };
    const up = (e: PointerEvent) => {
      const h = hit(e.clientX, e.clientY);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      if (h === null) return act.current.onCancel();
      const r = zones.current[h]!.getBoundingClientRect();
      setHot(h);
      setFly({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "success" }));
      // (the spaces arrive a moment after the pick-up: read the latest)
      const to = slots(act.current.targets)[h];
      setTimeout(() => act.current.onThrow(act.current.grab.task, to), 640);
    };
    const cancel = () => act.current.onCancel();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && cancel();
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", esc);
    return () => {
      delete document.body.dataset.grab;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", esc);
    };
    // the gesture lives for this component's life; the latest props are read through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const at = fly ?? pos;
  return createPortal(
    <div className={`throw-layer${fly ? " flying" : ""}`} aria-live="polite">
      <div className={`throw-chip${fly ? " fly" : ""}`} style={{ "--tx": `${at.x}px`, "--ty": `${at.y}px` } as CSSProperties}>
        <span className="mono">{taskLabel(grab.task)}</span>
        <b>{taskLine(grab.task)}</b>
      </div>
      <div className="throw-zones">
        {all.map((t, i) => (
          <button key={t?.slug ?? "new"} ref={(el) => void (zones.current[i] = el)} className={`throw-zone lg${hot === i ? " hot" : ""}${fly && hot === i ? " eat" : ""}`} tabIndex={-1}>
            <i aria-hidden>{t ? <LuOrbit /> : <LuLock />}</i>
            <b>{t ? `Throw into ${t.title}` : "New private space"}</b>
            <small className="mono">{t ? "only its members see it" : "take it private with your team"}</small>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
