"use client";
// The sender's reminder while a file is still being saved online (owner 2026-10-25: a receiver in Barcelona couldn't
// get a file because the sender's Android phone left Orbi before its online copy finished). Phones pause a page the
// moment you switch apps or lock the screen, and no website can change that, so the sender has to know: a clear bar
// "Saving online 37% · keep Orbi open", a ✓ "safe to close" (with a buzz) when it is done, and when they come back
// after leaving too early, that it carries on now.
import { useEffect, useRef, useState } from "react";
import { useCloud } from "@/lib/cloud";

export default function SaveGuard() {
  const cloud = useCloud();
  const list = [...cloud.values()];
  const anySaved = list.some((s) => s.state === "saved");
  const saving = list.filter((s) => s.state === "saving" || s.state === "paused");
  const frac = saving.length ? saving.reduce((a, s) => a + s.frac, 0) / saving.length : 1;
  const [done, setDone] = useState(false);
  const [back, setBack] = useState(false);
  const was = useRef(false);

  useEffect(() => {
    const now = saving.length > 0;
    if (was.current && !now && anySaved) {
      setDone(true);
      try {
        navigator.vibrate?.([60, 40, 60]);
      } catch {}
      const t = setTimeout(() => setDone(false), 5000);
      was.current = now;
      return () => clearTimeout(t);
    }
    was.current = now;
  }, [saving.length, anySaved]);

  // left Orbi while saving (the page was paused): say it goes on now
  useEffect(() => {
    let hiddenWhileSaving = false;
    const vis = () => {
      if (document.visibilityState === "hidden") hiddenWhileSaving = was.current;
      else if (hiddenWhileSaving) {
        hiddenWhileSaving = false;
        if (was.current) {
          setBack(true);
          setTimeout(() => setBack(false), 6000);
        }
      }
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  if (!saving.length && !done) return null;
  const pct = Math.round(frac * 100);
  return (
    <div className={`save-guard lg${done ? " ok" : ""}`} role="status" aria-live="polite">
      {done ? (
        <b>✓ Saved online · safe to close Orbi</b>
      ) : (
        <>
          <b>{back ? "Paused while Orbi was in the background · continuing" : `Saving online · ${pct}%`}</b>
          <span className="mono">Keep Orbi open until ✓, so people far away can still get it after you leave</span>
          <i className="save-guard-bar"><i style={{ transform: `scaleX(${Math.max(0.03, frac)})` }} /></i>
        </>
      )}
    </div>
  );
}
