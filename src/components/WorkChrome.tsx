"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { LuArchive, LuCircleHelp, LuFileText, LuFolderUp, LuGlobe, LuImage, LuLayers, LuLayoutGrid, LuListChecks, LuLock, LuMenu, LuMessageSquareText, LuMoon, LuMusic, LuOrbit, LuShare2, LuStickyNote, LuSun, LuType, LuUpload, LuUser, LuVideo, LuWifi } from "react-icons/lu";
import { KINDS, type Kind } from "@/lib/skin-list";
import { useTheme } from "@/lib/theme";

// The /work chrome: an editor-style top bar, a slim icon rail and a canvas action bar (phones: a bottom tab bar).
// Everything here only calls into Void's own handlers, so /work does exactly what the main page does.

const KIND_ICON = { all: LuLayoutGrid, photo: LuImage, video: LuVideo, doc: LuFileText, audio: LuMusic, archive: LuArchive } as const;

export function WorkMark() {
  return (
    <svg className="w-mark" viewBox="0 0 28 28" aria-hidden>
      <circle cx="7" cy="14" r="3.4" />
      <circle cx="21" cy="7.5" r="3.4" />
      <circle cx="21" cy="20.5" r="3.4" />
      <path d="M10.4 14h2.6c2.2 0 2.6-6.5 4.6-6.5M13 14c2.2 0 2.6 6.5 4.6 6.5" />
    </svg>
  );
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
        <span className={`w-tag${p.isPrivate ? " lock" : ""}`}>
          {p.space ? (p.isPrivate ? <><LuLock aria-hidden />private</> : "space") : p.area ? <><LuGlobe aria-hidden />{p.area}</> : "public"}
        </span>
      </div>

      <div className="w-tabs" role="tablist" aria-label="Show">
        <button role="tab" aria-selected={p.scope === "all"} className={p.scope === "all" ? "on" : ""} onClick={() => p.onScope("all")}><LuLayers aria-hidden /><span>All</span></button>
        {!p.space && (
          <button role="tab" aria-selected={p.scope === "near"} className={p.scope === "near" ? "on" : ""} onClick={() => p.onScope("near")}>
            <LuWifi aria-hidden /><span>Nearby</span>{p.nearbyCount ? <em>{p.nearbyCount}</em> : null}
          </button>
        )}
        <button role="tab" aria-selected={p.scope === "mine"} disabled={!p.mineCount} className={p.scope === "mine" ? "on" : ""} onClick={() => p.onScope(p.scope === "mine" ? "all" : "mine")}>
          <LuUser aria-hidden /><span>Mine</span>{p.mineCount ? <em>{p.mineCount}</em> : null}
        </button>
      </div>

      <div className="w-right">
        <div className="w-kinds" role="radiogroup" aria-label="Show only">
          {KINDS.map((k) => {
            const I = KIND_ICON[k.id];
            return <button key={k.id} role="radio" aria-checked={p.kind === k.id} className={p.kind === k.id ? "on" : ""} onClick={() => p.onKind(k.id)} title={k.name} aria-label={k.name}><I /></button>;
          })}
        </div>
        <span className="w-live" title={`${p.online} ${p.online > 1 ? "devices" : "device"} online${p.space ? " in this space" : " around you"}`}>
          <i />{p.online}<span> online</span>
        </span>
        {p.pin}
        <ThemeToggle className="w-hide-s" />
        <button className="w-btn" onClick={p.onShare}><LuShare2 aria-hidden /><span>Share</span></button>
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
  return (
    <div className="w-dock" role="toolbar" aria-label="Add to the canvas">
      <button className="w-primary" onClick={p.onFiles}><LuUpload aria-hidden /><span>Send files</span></button>
      <button className="w-ghost w-hide-s" onClick={p.onFolder}><LuFolderUp aria-hidden /><span>Folder</span></button>
      <button className="w-ghost" onClick={p.onText}><LuType aria-hidden /><span>Text</span></button>
      <button className="w-ghost" onClick={p.onNote}><LuStickyNote aria-hidden /><span>Note</span></button>
      <button className="w-ghost w-only-s" onClick={p.onTasks}><LuListChecks aria-hidden /><span>Tasks</span></button>
      <button className="w-ghost w-only-s" onClick={p.onSpaces}><LuOrbit aria-hidden /><span>Spaces</span></button>
    </div>
  );
}

export function WorkEmpty(p: { space: string | null; near: boolean; onFiles: () => void; onFolder: () => void; onText: () => void }) {
  return (
    <div className="w-empty" data-no-pan>
      <div className="w-empty-art" aria-hidden>
        <span className="n a"><LuFileText /></span>
        <svg viewBox="0 0 120 72" preserveAspectRatio="none"><path d="M0 36h40c16 0 16-35 34-35h46M40 36c16 0 16 35 34 35h46" /></svg>
        <span className="n b"><LuImage /></span>
        <span className="n c"><LuVideo /></span>
      </div>
      <h2>{p.space ? `${p.space} is empty` : p.near ? "Nothing from your network yet" : "Your workspace is empty"}</h2>
      <p>
        {p.space ? "Send something: only people in this space see it." : "Drop files, folders or text anywhere on the canvas."} Everything is encrypted end to end and burns in 5 to 30 minutes.
      </p>
      <div className="w-empty-acts">
        <button className="w-primary" onClick={p.onFiles}><LuUpload aria-hidden /><span>Send files</span></button>
        <button className="w-ghost" onClick={p.onFolder}><LuFolderUp aria-hidden /><span>Folder</span></button>
        <button className="w-ghost" onClick={p.onText}><LuType aria-hidden /><span>Text</span></button>
      </div>
    </div>
  );
}
