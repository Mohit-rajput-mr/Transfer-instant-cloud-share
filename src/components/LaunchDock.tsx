"use client";
import DownloadCard from "./DownloadCard";
import { useDownloads } from "@/lib/downloads";
import { useCloud } from "@/lib/cloud";
import { useState, type CSSProperties } from "react";
import { formatBytes, type Orb } from "@/lib/client";
import type { Stage } from "@/lib/transfer";
import { ShareBlock } from "./Panels";
import { glyph } from "./Glyph";
import { LuCheck } from "react-icons/lu";

/** One send in flight (or just landed). The card closes on Launch; this is all that stays on screen. */
export interface Launch {
  key: string;
  name: string;
  size: number;
  files: number;
  hue: number;
  createdAt: string;
  stage: Stage;
  frac: number;
  abort: AbortController;
  life?: number;
  /** open object (no passcode) */
  free?: boolean;
  orb?: Orb;
  err?: string;
  /** expanded: QR + share; collapsed: one slim pill */
  open: boolean;
}

export const pendingId = (key: string) => `up-${key}`;
export const isPending = (id: string) => id.startsWith("up-");

/** A stand-in sphere so the ball is in the void the moment Launch is pressed. */
export function pendingOrb(l: Launch): Orb {
  const t = new Date(l.createdAt).getTime();
  return {
    id: pendingId(l.key),
    name: l.name,
    fileName: l.name,
    mime: "application/octet-stream",
    size: l.size,
    salt: "",
    iterations: 0,
    hue: l.hue,
    status: "ready",
    netHash: null,
    maxDownloads: null,
    downloads: 0,
    devices: 0,
    views: 0,
    createdAt: l.createdAt,
    expiresAt: new Date(t + (l.life ?? 30) * 60_000).toISOString(),
    life: l.life,
    open: l.free,
  };
}

const STAGE: Partial<Record<Stage, string>> = {
  packing: "Packing",
  deriving: "Locking",
  encrypting: "Encrypting",
  uploading: "Launching",
  finalizing: "Entering orbit",
};

export default function LaunchDock(props: {
  launches: Launch[];
  /** your balls' numbers (same as on the ball), keyed by object id */
  badges: Map<string, number>;
  onToggle: (key: string) => void;
  onDismiss: (key: string) => void;
  onOpenOwner: (id: string) => void;
}) {
  const { launches } = props;
  const dl = useDownloads();
  if (!launches.length && !dl.jobs.length) return null;
  return (
    <div className="dock" aria-live="polite">
      <DownloadCard />
      {launches.slice(-3).map((l) => (
        <DockItem key={l.key} l={l} {...props} />
      ))}
    </div>
  );
}

function DockItem({ l, badges, onToggle, onDismiss, onOpenOwner }: { l: Launch } & Omit<Parameters<typeof LaunchDock>[0], "launches">) {
  const [copied, setCopied] = useState(false);
  const cloud = useCloud().get(l.orb?.id ?? "");
  const n = badges.get(l.orb ? l.orb.id : pendingId(l.key));
  const dot = (live?: boolean) => <i className={`dock-dot${live ? " live" : ""}`}>{n ?? ""}</i>;
  const hue = { "--hue": l.hue } as CSSProperties;
  const pct = Math.round(Math.max(0, Math.min(1, l.frac)) * 100);

  const copy = async () => {
    if (!l.orb) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?o=${l.orb.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  if (l.err)
    return (
      <div className="dock-item lg err" style={hue}>
        {dot()}
        <div className="dock-main">
          <b className="ellip">{l.name}</b>
          <span className="mono">{l.err}</span>
        </div>
        <button className="dock-x lg-press" aria-label="Dismiss" onClick={() => onDismiss(l.key)}>×</button>
      </div>
    );

  if (!l.orb)
    return (
      <div className="dock-item lg" style={hue}>
        {dot(true)}
        <div className="dock-main">
          <b className="ellip">{l.name}</b>
          <span className="mono">{STAGE[l.stage] ?? "Launching"} · {l.stage === "uploading" ? `${pct}%` : formatBytes(l.size)}{l.files > 1 ? ` · ${l.files} files` : ""}</span>
          <span className="dock-bar"><i style={{ transform: `scaleX(${l.stage === "uploading" || l.stage === "finalizing" ? Math.max(0.03, l.frac) : 0.03})` }} /></span>
        </div>
        <button className="dock-x lg-press" aria-label="Abort launch" onClick={() => l.abort.abort()}>×</button>
      </div>
    );

  return (
    <div className={`dock-item lg done${l.open ? " open" : ""}`} style={hue}>
      <div className="dock-row">
        {dot()}
        <div className="dock-main">
          <b className="ellip">{l.name}</b>
          <span className="mono">In orbit · <span className="dock-code">{l.orb.id}</span>
            {cloud?.state === "saving" && <span className="dock-cloud"> · saving {Math.round(cloud.frac * 100)}%, keep open</span>}
            {cloud?.state === "saved" && <span className="dock-cloud ok"> · saved <LuCheck className="ic-inline" /> safe to close</span>}
            {cloud?.state === "failed" && <span className="dock-cloud"> · keep this page open</span>}
          </span>
          {cloud?.state === "saving" && <span className="dock-bar"><i style={{ transform: `scaleX(${Math.max(0.03, cloud.frac)})` }} /></span>}
        </div>
        {!l.open && (
          <button className={`pill lg-press${copied ? " solid" : ""}`} onClick={copy}>{glyph(copied ? "Copied ✓" : "Copy link")}</button>
        )}
        <button className="dock-x lg-press" aria-label={l.open ? "Minimize" : "Expand"} aria-expanded={l.open} onClick={() => onToggle(l.key)}>
          <svg viewBox="0 0 12 12" aria-hidden><path d={l.open ? "M2.5 4.5L6 8l3.5-3.5" : "M2.5 7.5L6 4l3.5 3.5"} /></svg>
        </button>
        <button className="dock-x lg-press" aria-label="Close" onClick={() => onDismiss(l.key)}>×</button>
      </div>
      {l.open && (
        <div className="dock-more">
          <ShareBlock id={l.orb.id} />
          <p className="note">Floats for 30 minutes, encrypted on this device. <b>Share the passcode separately.</b></p>
          <button className="cta lg-press" onClick={() => onOpenOwner(l.orb!.id)}>{glyph("Mission control →")}</button>
        </div>
      )}
    </div>
  );
}
