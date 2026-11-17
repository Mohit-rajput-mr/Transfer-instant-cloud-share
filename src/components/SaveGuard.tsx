"use client";
// The sender's "saved online" moment (owner 2026-10-25: a receiver in Barcelona couldn't get a file because the sender's
// phone left Orbi before its online copy finished). The progress and "keep open" now live inside the sending card itself
// (LaunchDock / ResumeUploads: "saving online 42% · 1.2 MB/s · others see it once saved, keep open"); owner 2026-11-17:
// no separate widget, it overlapped that card. What stays here: a short buzz on phones when every copy is saved.
import { useEffect, useRef } from "react";
import { useCloud } from "@/lib/cloud";

export default function SaveGuard() {
  const cloud = useCloud();
  const list = [...cloud.values()];
  const anySaved = list.some((s) => s.state === "saved");
  const saving = list.filter((s) => s.state === "saving" || s.state === "paused").length;
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !saving && anySaved) {
      try {
        navigator.vibrate?.([60, 40, 60]);
      } catch {}
    }
    was.current = saving > 0;
  }, [saving, anySaved]);
  return null;
}
