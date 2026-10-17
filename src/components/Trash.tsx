"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LuArchive, LuUndo2, LuX } from "react-icons/lu";
import { overTrash, restore, setZone, useTrashList } from "@/lib/trash";

/** The big trash zone: rises while anything on the map is dragged, opens up when the pointer comes close. */
export function TrashZone() {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    const on = (e: Event) => setAt((e as CustomEvent<{ x: number; y: number } | null>).detail);
    window.addEventListener("orbit:drag", on);
    return () => window.removeEventListener("orbit:drag", on);
  }, []);
  const near = !!at && overTrash(at.x, at.y);
  useEffect(() => {
    if (near) window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "light" }));
  }, [near]);
  if (!ready) return null;
  return createPortal(
    <div className={`trash-zone${at ? " on" : ""}${near ? " near" : ""}`} aria-hidden={!at}>
      <div className="trash-hole" ref={setZone}>
        <LuArchive aria-hidden />
        <b>{near ? "Let go to archive" : "Drag here to archive"}</b>
        <small className="mono">kept on this device only</small>
      </div>
    </div>,
    document.body,
  );
}

const kindOf = (key: string) => (key.startsWith("o:") ? "object" : key.startsWith("b:") ? "bubbles" : "tasks");
// a steady scattered spot for each archived ball, so they float like objects in a space (not a flat list)
function scatter(i: number, n: number): { x: number; y: number } {
  const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(n))));
  const col = i % cols, rowN = Math.ceil(n / cols), row = Math.floor(i / cols);
  const jx = ((i * 2654435761) % 1000) / 1000 - 0.5, jy = ((i * 40503) % 1000) / 1000 - 0.5;
  return { x: ((col + 0.5) / cols + jx * 0.1) * 100, y: ((row + 0.5) / Math.max(1, rowN) + jy * 0.12) * 100 };
}

/** The archive is its own little space: a glass container with the archived items floating inside, each tapped
 *  to bring it back. Opened by the round bubble in the top-right corner. Kept on this device only. */
export function TrashButton() {
  const list = useTrashList();
  const [open, setOpen] = useState(false);
  if (!list.length) return null;
  return createPortal(
    <>
      <button className="arch-bubble lg lg-press" onClick={() => setOpen(true)} aria-label={`Archive space, ${list.length} ${list.length === 1 ? "item" : "items"}`} title="Archive space (kept on this device)">
        <LuArchive aria-hidden />
        <i>{list.length}</i>
      </button>
      {open && (
        <div className="archive-space" role="dialog" aria-modal="true" aria-label="Archive space">
          <div className="arch-scrim" onClick={() => setOpen(false)} />
          <div className="arch-glass">
            <span className="c tl" aria-hidden /><span className="c tr" aria-hidden /><span className="c bl" aria-hidden /><span className="c br" aria-hidden />
            <div className="arch-head">
              <div className="arch-name">
                <span className="mono dim">archive space · {list.length} {list.length === 1 ? "item" : "items"} · this device only</span>
                <b className="wide">Archive</b>
              </div>
              <button className="arch-all lg-press" onClick={() => (restore(), setOpen(false))}><LuUndo2 aria-hidden /> Restore all</button>
              <button className="arch-x lg-press" onClick={() => setOpen(false)} aria-label="Close"><LuX /></button>
            </div>
            <div className="arch-float">
              {list.map((t, i) => {
                const p = scatter(i, list.length);
                return (
                  <button key={t.key} className="arch-ball lg-press" style={{ left: `${p.x}%`, top: `${p.y}%`, "--ai": i } as CSSProperties} onClick={() => restore(t.key)} title={`Restore ${t.label}`}>
                    <span className="arch-orb" data-kind={kindOf(t.key)}><LuArchive aria-hidden /></span>
                    <b className="ellip">{t.label}</b>
                    <small className="mono"><LuUndo2 aria-hidden /> tap to restore</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
