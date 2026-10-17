"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuTrash2, LuUndo2 } from "react-icons/lu";
import { overTrash, restore, setZone, useTrashList } from "@/lib/trash";
import { Pop } from "./Spaces";

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
        <LuTrash2 aria-hidden />
        <b>{near ? "Let go to trash" : "Drag here to trash"}</b>
        <small className="mono">hidden on this browser only</small>
      </div>
    </div>,
    document.body,
  );
}

/** What this browser put in the trash, each one back with a tap. */
export function TrashButton() {
  const list = useTrashList();
  const [open, setOpen] = useState(false);
  if (!list.length) return null;
  return (
    <>
      <button className="map-trash" onClick={() => setOpen(true)} aria-label={`Trash (${list.length})`} title="Trash: hidden on this browser"><LuTrash2 /><i>{list.length}</i></button>
      {open && createPortal(
        <Pop label="Trash" onClose={() => setOpen(false)} small>
          <div className="trash-list">
            <p className="mono dim">Hidden on this browser only. Everyone else still sees them until they burn up.</p>
            <ul>
              {[...list].reverse().map((t) => (
                <li key={t.key}>
                  <span><small className="mono dim">{t.key.startsWith("o:") ? "object" : t.key.startsWith("b:") ? "bubbles" : "tasks"}</small>{t.label}</span>
                  <button className="pill lg-press" onClick={() => restore(t.key)}><LuUndo2 aria-hidden /> Restore</button>
                </li>
              ))}
            </ul>
            <button className="cta lg-press" onClick={() => (restore(), setOpen(false))}><LuUndo2 aria-hidden /> Restore all</button>
          </div>
        </Pop>,
        document.body,
      )}
    </>
  );
}
