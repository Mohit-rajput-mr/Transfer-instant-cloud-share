"use client";
import { useEffect, useRef, useState } from "react";
import { LuArchive, LuCheck, LuChevronDown, LuFileText, LuImage, LuLayers, LuLayoutGrid, LuListFilter, LuMusic, LuUser, LuVideo, LuWifi } from "react-icons/lu";
import { KINDS, type Kind } from "@/lib/skin-list";

const ICON = { all: LuLayoutGrid, photo: LuImage, video: LuVideo, doc: LuFileText, audio: LuMusic, archive: LuArchive } as const;

type Scope = "all" | "near" | "mine";
/** what to show (`near`: null where there is no nearby, inside a space) */
type ScopeOpt = { value: Scope; set: (s: Scope) => void; near: number | null; mine: number };

/** One "Filter" button: what to show and which file types drop down from it (instead of rows of icons). */
export default function KindFilter({ kind, onKind, scope, className = "" }: { kind: Kind; onKind: (k: Kind) => void; scope?: ScopeOpt; className?: string }) {
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
  const active = (kind !== "all" ? 1 : 0) + (scope && scope.value !== "all" ? 1 : 0);
  const scopes: { id: Scope; name: string; icon: typeof LuLayers; n?: number | null }[] = scope
    ? [
        { id: "all", name: "Open void", icon: LuLayers },
        ...(scope.near !== null ? [{ id: "near" as const, name: "Wi-Fi", icon: LuWifi, n: scope.near }] : []),
        ...(scope.mine ? [{ id: "mine" as const, name: "Mine", icon: LuUser, n: scope.mine }] : []),
      ]
    : [];
  return (
    <div className={`kf ${className}`} ref={box} data-no-pan>
      <button className={`kf-btn${active ? " set" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} title="Filter">
        {kind === "all" ? <LuListFilter aria-hidden /> : <I aria-hidden />}
        <span>{kind === "all" ? (scope && scope.value !== "all" ? (scope.value === "near" ? "Wi-Fi" : "Mine") : "Filter") : cur?.name}</span>
        {active > 1 && <em className="kf-n">{active}</em>}
        <LuChevronDown className={`kf-chev${open ? " up" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="kf-menu" role="listbox" aria-label="Show only">
          {scopes.length > 1 && (
            <>
              <span className="kf-sec">Show</span>
              {scopes.map((o) => (
                <button key={o.id} role="option" aria-selected={scope!.value === o.id} className={scope!.value === o.id ? "on" : ""} onClick={() => (scope!.set(o.id), setOpen(false))}>
                  <o.icon aria-hidden />
                  <span>{o.name}</span>
                  {o.n ? <small className="kf-count">{o.n}</small> : null}
                  {scope!.value === o.id && <LuCheck className="kf-ok" aria-hidden />}
                </button>
              ))}
              <span className="kf-sec">File type</span>
            </>
          )}
          {KINDS.map((k) => {
            const KI = ICON[k.id];
            return (
              <button key={k.id} role="option" aria-selected={kind === k.id} className={kind === k.id ? "on" : ""} onClick={() => (onKind(k.id), setOpen(false))}>
                <KI aria-hidden />
                <span>{k.name}</span>
                {kind === k.id && <LuCheck className="kf-ok" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
