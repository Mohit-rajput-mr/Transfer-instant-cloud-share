"use client";
import type { Orb } from "./client";
import { peekOrb, receive } from "./transfer";
import { viewKind } from "@/components/Viewer";

// Previews that are ready before anyone asks: no-password files are fetched and decrypted quietly in the
// background (small ones as soon as they appear, bigger ones when a pointer hovers or the card opens), so a
// double-click shows them at once. Nothing is counted as a download and nothing is saved to disk.

const EAGER_MAX = 12 * 1024 * 1024; // fetched as soon as the ball shows up
const HOVER_MAX = 120 * 1024 * 1024; // fetched on hover / card open
const BUDGET = 240 * 1024 * 1024; // memory kept for ready previews (oldest dropped first)

const cache = new Map<string, Promise<File>>();
const sizes = new Map<string, number>();
let running = 0;
const queue: (() => void)[] = [];

export const canPeek = (o: Orb) =>
  !!o.open && !o.id.startsWith("up-") && o.maxDownloads == null && o.status === "ready" && !!viewKind(o.fileName, o.mime) && o.size <= HOVER_MAX;

function trim() {
  let total = [...sizes.values()].reduce((a, b) => a + b, 0);
  for (const id of sizes.keys()) {
    if (total <= BUDGET) break;
    total -= sizes.get(id)!;
    sizes.delete(id);
    cache.delete(id);
  }
}

const slot = () => (running < 2 ? Promise.resolve() : new Promise<void>((ok) => queue.push(ok)));

/** The decrypted file for a preview (started now if it isn't already on its way). */
export function peekFile(o: Orb): Promise<File> {
  const hit = cache.get(o.id);
  if (hit) return hit;
  const p = (async () => {
    await slot();
    running++;
    try {
      const un = await peekOrb(o);
      const res = await receive({ orb: o, unlocked: un, target: Promise.resolve(null), folderTarget: null, hold: true, onProgress: () => {} });
      if (res.kind !== "file") throw new Error("no preview");
      sizes.set(o.id, res.file.size);
      trim();
      return res.file;
    } finally {
      running--;
      queue.shift()?.();
    }
  })();
  cache.set(o.id, p);
  p.catch(() => cache.delete(o.id));
  return p;
}

/** Ready already (no waiting at all)? */
export const peeked = (id: string) => sizes.has(id);

/** Warm small previews as soon as they appear in the void. */
export function warm(orbs: Orb[]) {
  for (const o of orbs) if (canPeek(o) && o.size <= EAGER_MAX && !cache.has(o.id)) void peekFile(o).catch(() => {});
}
