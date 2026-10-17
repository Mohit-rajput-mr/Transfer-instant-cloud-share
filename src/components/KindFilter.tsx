"use client";
import { useEffect, useRef, useState } from "react";
import { LuArchive, LuCheck, LuChevronDown, LuFileText, LuImage, LuLayoutGrid, LuListFilter, LuMusic, LuVideo } from "react-icons/lu";
import { KINDS, type Kind } from "@/lib/skin-list";

const ICON = { all: LuLayoutGrid, photo: LuImage, video: LuVideo, doc: LuFileText, audio: LuMusic, archive: LuArchive } as const;

/** One "Filter" button: a small list of file types drops down from it (instead of a row of six icons). */
export default function KindFilter({ kind, onKind, className = "" }: { kind: Kind; onKind: (k: Kind) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", esc);
    return () => (window.removeEventListener("pointerdown", down, true), window.removeEventListener("keydown", esc));
  }, [open]);
  const cur = KINDS.find((k) => k.id === kind);
  const I = ICON[kind];
  return (
    <div className={`kf ${className}`} ref={box} data-no-pan>
      <button className={`kf-btn${kind !== "all" ? " set" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} title="Filter by file type">
        {kind === "all" ? <LuListFilter aria-hidden /> : <I aria-hidden />}
        <span>{kind === "all" ? "Filter" : cur?.name}</span>
        <LuChevronDown className={`kf-chev${open ? " up" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="kf-menu" role="listbox" aria-label="Show only">
          {KINDS.map((k) => {
            const KI = ICON[k.id];
            return (
              <button key={k.id} role="option" aria-selected={kind === k.id} className={kind === k.id ? "on" : ""} onClick={() => (onKind(k.id), setOpen(false))}>
                <KI aria-hidden />
                <span>{k.id === "all" ? "Everything" : k.name}</span>
                {kind === k.id && <LuCheck className="kf-ok" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
