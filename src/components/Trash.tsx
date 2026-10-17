"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuArchive, LuUndo2 } from "react-icons/lu";
import { overTrash, restore, setZone, useTrashList } from "@/lib/trash";

/** The big trash zone: rises while anything on the map is dragged, opens up when the pointer comes close. */
export function TrashZone() {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    const on = (e: Event) => setAt((e as CustomEvent<{ x: number; y: number } | null>).detail);
    // a drag that ends anywhere (let go outside the window, Esc, the tab losing focus) always takes the zone away
    const off = () => setAt(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && off();
    window.addEventListener("orbit:drag", on);
    window.addEventListener("pointerup", off, true);
    window.addEventListener("pointercancel", off, true);
    window.addEventListener("blur", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("orbit:drag", on);
      window.removeEventListener("pointerup", off, true);
      window.removeEventListener("pointercancel", off, true);
      window.removeEventListener("blur", off);
      window.removeEventListener("keydown", esc);
    };
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


/** The way into the archive: a round button with the count (only when something is archived). */
export function TrashButton() {
  const list = useTrashList();
  if (!list.length) return null;
  return createPortal(
    <button className="arch-bubble lg lg-press" onClick={() => window.dispatchEvent(new CustomEvent("orbit:archive"))} aria-label={`Archive space, ${list.length} ${list.length === 1 ? "item" : "items"}`} title="Archive space (kept on this device)">
      <LuArchive aria-hidden />
      <i>{list.length}</i>
    </button>,
    document.body,
  );
}

/** Inside the archive: the same room as a private space, everything archived on its usual map (open, preview,
 *  who's watching), plus Restore all / Exit. Each item has its own restore button (ArchiveRestore). */
export function ArchiveRoom(props: { onExit: () => void }) {
  const list = useTrashList();
  return (
    <div className="room arch-room" aria-label="Archive space">
      <div className="room-glass glass" aria-hidden />
      <div className="room-top">
        <div className="room-name">
          <span className="mono dim">archive space · {list.length} {list.length === 1 ? "item" : "items"} · this device only</span>
          <b className="wide">Archive</b>
        </div>
        <button className="room-exit glass lg-press arch-all-btn" onClick={() => (restore(), props.onExit())}><LuUndo2 aria-hidden /> Restore all</button>
        <button className="room-exit glass lg-press" onClick={props.onExit} aria-label="Exit the archive">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></svg>
          Exit
        </button>
      </div>
    </div>
  );
}

/** A small restore button pinned to an archived item's top-right corner (world coordinates on the map). */
export function ArchiveRestore(props: { k: string; x: number; y: number; label: string }) {
  return (
    <button className="arch-restore lg-press" data-no-pan style={{ left: props.x, top: props.y }} onClick={() => restore(props.k)} title={`Restore ${props.label}`} aria-label={`Restore ${props.label}`}>
      <LuUndo2 aria-hidden /><span>Restore</span>
    </button>
  );
}
