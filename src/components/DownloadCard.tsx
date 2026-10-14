"use client";
import { cancelAll, dismiss, saveHeld, useDownloads } from "@/lib/downloads";

/** Bottom-right: every background download with its progress; stays when panels and containers close. */
export default function DownloadCard() {
  const { jobs, held } = useDownloads();
  if (!jobs.length) return null;
  const done = jobs.filter((j) => j.state === "done").length;
  const active = jobs.some((j) => j.state === "queued" || j.state === "running");
  const failed = jobs.filter((j) => j.state === "failed").length;
  return (
    <div className="dock-item dl-card" role="status" aria-live="polite">
      <div className="dl-head">
        <b className="mono">{active ? `Downloading ${done + 1 > jobs.length ? jobs.length : done + 1} of ${jobs.length}` : `${done} of ${jobs.length} downloaded`}</b>
        {active ? (
          <button className="dl-x" onClick={cancelAll} aria-label="Cancel the downloads">Stop</button>
        ) : (
          <button className="dl-x" onClick={dismiss} aria-label="Close">×</button>
        )}
      </div>
      <div className="dl-list">
        {jobs.map((j) => (
          <div key={j.id} className={`dl-row ${j.state}`}>
            <span className="dl-name">{j.name}</span>
            <span className="dl-state mono">
              {j.state === "done" ? "✓" : j.state === "failed" ? j.err ?? "Failed" : j.state === "running" ? `${Math.round(j.frac * 100)}%` : "waiting"}
            </span>
            <i className="dl-bar" style={{ transform: `scaleX(${j.state === "done" ? 1 : j.frac})` }} />
          </div>
        ))}
      </div>
      {held.length > 0 && !active && <button className="cta lg-press dl-save" onClick={saveHeld}>Save all {held.length} ↓</button>}
      {failed > 0 && !active && <p className="mono dim dl-note">{failed} couldn&apos;t be downloaded: open those one by one.</p>}
    </div>
  );
}
