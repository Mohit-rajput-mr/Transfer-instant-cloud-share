"use client";
// Owner 2026-11-20: in an anonymous space the sender sees who is downloading their file, live: a small ball in the
// downloader's colour with their alias and the real percentage (bytes received and decrypted / file size).
// The downloading page reports here (Panels' unlock, the batch downloader); Void says it in the space's own live room
// as a "sync" { dp } and the sender's ball shows it (OrbView). Nothing is said in the public void.

/** e: 1 = finished, 2 = cancelled by the downloader, 3 = failed */
export type DlEnd = 1 | 2 | 3;
export type DlNote = { id: string; f: number; e?: DlEnd };

/** this page's download of `id` moved (f 0..1), or ended */
export function dlProgress(id: string, f: number, e?: DlEnd) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DlNote>("orbit:dl", { detail: { id, f: Math.max(0, Math.min(1, f)), e } }));
}

/** a member's colour in a space (the same as their ball in the member row) */
export const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

/** one downloader as the sender heard them: at = when heard here, t = when they said it (their clock), z = stalled */
export type Downloader = { w: string; f: number; e?: DlEnd; z?: boolean; at: number; t: number };
export type DlState = "down" | "paused" | "done" | "canceled" | "failed";
export type DlShown = { w: string; f: number; state: DlState; hue: number };

// the downloader's page speaks at least every 2.5 s while it runs: quiet for longer means its internet dropped
const QUIET = 7000;
export function dlState(d: Downloader, now: number): DlState {
  if (d.e === 1) return "done";
  if (d.e === 2) return "canceled";
  if (d.e === 3) return "failed";
  return d.z || now - d.at > QUIET ? "paused" : "down";
}

/** what stays on screen: done for 6 s, cancelled / failed for 10 s, a silent one (paused) for 2 minutes */
export function pruneDl(m: Map<string, Downloader[]>, now: number): Map<string, Downloader[]> {
  let changed = false;
  const out = new Map<string, Downloader[]>();
  for (const [id, list] of m) {
    const keep = list.filter((d) => now - d.at < (d.e === 1 ? 6000 : d.e ? 10_000 : 120_000));
    if (keep.length !== list.length) changed = true;
    if (keep.length) out.set(id, keep);
  }
  return changed ? out : m;
}

/** the newest note per (object, who) wins (a note queued while offline can arrive after a newer one) */
export function addDl(m: Map<string, Downloader[]>, id: string, d: Downloader): Map<string, Downloader[]> {
  const list = m.get(id) ?? [];
  const was = list.find((x) => x.w === d.w);
  if (was && was.t > d.t) return m;
  const out = new Map(m);
  out.set(id, [...list.filter((x) => x.w !== d.w), d].slice(-12));
  return out;
}

const RANK: Record<DlState, number> = { down: 0, paused: 1, done: 2, canceled: 3, failed: 3 };
/** several at once: running ones first (furthest along on top), then paused, then finished and stopped */
export function shownDl(list: Downloader[], now: number): DlShown[] {
  return list
    .map((d) => ({ w: d.w, f: d.f, state: dlState(d, now), hue: hueOf(d.w) }))
    .sort((a, b) => RANK[a.state] - RANK[b.state] || b.f - a.f || a.w.localeCompare(b.w));
}
