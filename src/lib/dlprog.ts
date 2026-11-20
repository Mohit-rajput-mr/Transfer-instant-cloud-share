"use client";
// Owner 2026-11-20: in an anonymous space the sender sees who is downloading their file, live: a small ball in the
// downloader's colour with their alias and the real percentage (bytes received and decrypted / file size).
// The downloading page reports here (Panels' unlock, the batch downloader); Void says it in the space's own live room
// as a "sync" { dp } and the sender's ball shows it (OrbView). Nothing is said in the public void.

/** e: 1 = finished, 2 = stopped (cancelled, failed) */
export type DlEnd = 1 | 2;
export type DlNote = { id: string; f: number; e?: DlEnd };

/** this page's download of `id` moved (f 0..1), or ended */
export function dlProgress(id: string, f: number, e?: DlEnd) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DlNote>("orbit:dl", { detail: { id, f: Math.max(0, Math.min(1, f)), e } }));
}

/** one downloader as the sender sees it */
export type Downloader = { w: string; f: number; e?: DlEnd; at: number };

/** the newest note per (object, who) wins; quiet ones fade: a running download that says nothing for 15 s (tab closed),
 *  a finished one after 6 s, a stopped one at once */
export function pruneDl(m: Map<string, Downloader[]>, now: number): Map<string, Downloader[]> {
  let changed = false;
  const out = new Map<string, Downloader[]>();
  for (const [id, list] of m) {
    const keep = list.filter((d) => (d.e === 2 ? false : d.e === 1 ? now - d.at < 6000 : now - d.at < 15_000));
    if (keep.length !== list.length) changed = true;
    if (keep.length) out.set(id, keep);
  }
  return changed ? out : m;
}

export function addDl(m: Map<string, Downloader[]>, id: string, d: Downloader): Map<string, Downloader[]> {
  const out = new Map(m);
  const list = (out.get(id) ?? []).filter((x) => x.w !== d.w);
  out.set(id, [...list, d].slice(-6));
  return out;
}
