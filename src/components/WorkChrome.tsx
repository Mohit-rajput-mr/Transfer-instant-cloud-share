"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LuCircleHelp, LuFile, LuX, LuFolderUp, LuGlobe, LuLayers, LuListChecks, LuLock, LuMenu, LuMessageSquareText, LuMoon, LuOrbit, LuShare2, LuSparkles, LuStickyNote, LuSun, LuType, LuUpload, LuUser, LuWifi } from "react-icons/lu";
import { BsIncognito } from "react-icons/bs";
import type { Kind } from "@/lib/skin-list";
import { useTheme } from "@/lib/theme";
import KindFilter from "./KindFilter";
import { switchView } from "@/lib/cloud";

// The /work chrome: an editor-style top bar, a slim icon rail and a canvas action bar (phones: a bottom tab bar).
// Everything here only calls into Void's own handlers, so /work does exactly what the main page does.


export function WorkMark() {
  return <span className="w-mark" aria-hidden />;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [t, set] = useTheme();
  const light = t === "light";
  return (
    <button className={`w-icon ${className}`} onClick={() => set(light ? "dark" : "light")} aria-label={light ? "Switch to dark mode" : "Switch to light mode"} title={light ? "Dark mode" : "Light mode"}>
      {light ? <LuMoon /> : <LuSun />}
    </button>
  );
}

export function WorkBar(p: {
  space: string | null;
  isPrivate: boolean;
  online: number;
  scope: "all" | "near" | "mine";
  onScope: (s: "all" | "near" | "mine") => void;
  nearbyCount: number;
  mineCount: number;
  kind: Kind;
  onKind: (k: Kind) => void;
  pin: ReactNode;
  /** anonymous here (lib/anon.ts): the tag says so and Nearby goes (it is the network you're on) */
  anon: boolean;
  /** the "Stay anonymous" mask, just before the pin (null while it's on: the pin's place holds the badge) */
  anonChip: ReactNode;
  /** the switch is on: one tap leaves anonymous mode */
  onAnonExit?: () => void;
  onLogo: () => void;
  onSpaces: () => void;
  onShare: () => void;
  onMenu: () => void;
  area: string;
}) {
  return (
    <header className="w-bar">
      <div className="w-left">
        <button className="w-logo" onClick={p.onLogo} aria-label="Orbi Transfer for work"><WorkMark /></button>
        <button className="w-title" onClick={p.onSpaces} title={p.space ? "Change space" : "Open spaces"}>
          <span className="w-crumb">Orbi Work</span>
          <span className="w-sep">/</span>
          <b className="ellip">{p.space ?? "Public workspace"}</b>
        </button>
        {p.anon ? (
          <>
            <span className="w-tag anon"><BsIncognito aria-hidden />anonymous</span>
            {p.onAnonExit && <button className="w-btn w-anon-exit" onClick={p.onAnonExit} title="Turn off Anonymous">Exit anonymous</button>}
          </>
        ) : (
          <span className={`w-tag${p.isPrivate ? " lock" : ""}`}>
            {p.space ? (p.isPrivate ? <><LuLock aria-hidden />private</> : "space") : p.area ? <><LuGlobe aria-hidden />{p.area}</> : "public"}
          </span>
        )}
        {/* back to the orbit look, in the page (no reload: uploads and the live connection keep going) */}
        <button className="w-classic-btn" onClick={() => switchView("/")} title="Switch to the Classic orbit view"><LuOrbit aria-hidden /><span>Switch to Classic</span></button>
      </div>

      <div className="w-tabs" role="tablist" aria-label="Show">
        <button role="tab" aria-selected={p.scope === "all"} className={p.scope === "all" ? "on" : ""} onClick={() => p.onScope("all")}><LuLayers aria-hidden /><span>All</span></button>
        {!p.space && !p.anon && (
          <button role="tab" aria-selected={p.scope === "near"} className={p.scope === "near" ? "on" : ""} onClick={() => p.onScope("near")}>
            <LuWifi aria-hidden /><span>Nearby</span>{p.nearbyCount ? <em>{p.nearbyCount}</em> : null}
          </button>
        )}
        <button role="tab" aria-selected={p.scope === "mine"} disabled={!p.mineCount} className={p.scope === "mine" ? "on" : ""} onClick={() => p.onScope(p.scope === "mine" ? "all" : "mine")}>
          <LuUser aria-hidden /><span>Mine</span>{p.mineCount ? <em>{p.mineCount}</em> : null}
        </button>
      </div>

      <div className="w-right">
        <KindFilter kind={p.kind} onKind={p.onKind} className="w-filter" />
        <span className="w-live" title={`${p.online} ${p.online > 1 ? "devices" : "device"} online${p.space ? " in this space" : " around you"}`}>
          <i />{p.online}<span> online</span>
        </span>
        {p.anonChip}
        {p.pin}
        <ThemeToggle className="w-hide-s" />
        <button className="w-btn" onClick={p.onShare}><LuShare2 aria-hidden /><span>Share</span></button>
        <Link href="/upgrade" className="w-btn w-upg"><LuSparkles aria-hidden /><span>Upgrade</span></Link>
        <button className="w-icon w-only-s" onClick={p.onMenu} aria-label="Menu"><LuMenu /></button>
      </div>
    </header>
  );
}

export function WorkRail(p: { inSpace: boolean; onHome: () => void; onSpaces: () => void; onTasks: () => void; taskCount: number; onBoard: () => void; noteCount: number }) {
  return (
    <nav className="w-rail" aria-label="Workspace">
      <div className="w-rail-top">
        <button className={!p.inSpace ? "on" : ""} onClick={p.onHome} title="Public workspace" aria-label="Public workspace"><LuGlobe /></button>
        <button className={p.inSpace ? "on" : ""} onClick={p.onSpaces} title="Spaces" aria-label="Spaces"><LuOrbit /></button>
        <button onClick={p.onTasks} title="Tasks" aria-label={`Tasks, ${p.taskCount} open`}><LuListChecks />{p.taskCount ? <em>{p.taskCount}</em> : null}</button>
        <button onClick={p.onBoard} title="Notes board" aria-label={`Notes board, ${p.noteCount}`}><LuMessageSquareText />{p.noteCount ? <em>{p.noteCount}</em> : null}</button>
      </div>
      <div className="w-rail-bot">
        <ThemeToggle />
        <Link href="/about" title="About" aria-label="About"><LuCircleHelp /></Link>
        <Link href="/" className="w-classic" title="Classic Orbit view" aria-label="Classic Orbit view"><LuOrbit /></Link>
      </div>
    </nav>
  );
}

export function WorkDock(p: { onFiles: () => void; onFolder: () => void; onText: () => void; onNote: () => void; onTasks: () => void; onSpaces: () => void }) {
  // one Upload button; File, Folder and Text fan out of it as glass buttons
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
  const go = (f: () => void) => () => (setOpen(false), f());
  return (
    <div className={`w-dock${open ? " open" : ""}`} role="toolbar" aria-label="Add to the canvas" ref={box}>
      <button className="w-ghost w-only-s" onClick={p.onNote}><LuStickyNote aria-hidden /><span>Note</span></button>
      <button className="w-ghost w-only-s" onClick={p.onTasks}><LuListChecks aria-hidden /><span>Tasks</span></button>
      <div className="w-up-wrap">
        <div className="w-fan" aria-hidden={!open}>
          <button style={{ "--i": 0 } as CSSProperties} tabIndex={open ? 0 : -1} onClick={go(p.onFiles)}><LuFile aria-hidden /><b>Files</b><small>photos · videos · docs</small></button>
          <button style={{ "--i": 1 } as CSSProperties} tabIndex={open ? 0 : -1} onClick={go(p.onFolder)}><LuFolderUp aria-hidden /><b>Folder</b><small>structure intact</small></button>
          <button style={{ "--i": 2 } as CSSProperties} tabIndex={open ? 0 : -1} onClick={go(p.onText)}><LuType aria-hidden /><b>Text or link</b><small>opens instantly</small></button>
        </div>
        <button className="w-primary w-up" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close" : "Upload"}>
          <LuUpload className="i-up" aria-hidden /><LuX className="i-x" aria-hidden /><span>Upload</span>
        </button>
      </div>
      <button className="w-ghost w-only-s" onClick={p.onSpaces}><LuOrbit aria-hidden /><span>Spaces</span></button>
    </div>
  );
}

