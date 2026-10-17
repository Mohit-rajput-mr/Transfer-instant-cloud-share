"use client";
import type { Orb } from "./client";
import { peekOrb, receive } from "./transfer";
import { viewKind } from "@/components/Viewer";
import { isLow } from "./perf";

// Previews that are ready before anyone asks: every no-password file in sight is fetched and decrypted quietly in
// the background as soon as it is in orbit (smallest first, a few at a time), on the assumption that it will be
// opened, so a tap shows it at once. Bigger ones start on hover / when the card opens. Nothing is counted as a
// download and nothing is saved to disk. A low-end device keeps less in memory and fetches one at a time.

const MB = 1024 * 1024;
const low = () => isLow();
// fetched as soon as the ball shows up
const eagerMax = () => (low() ? 25 : 100) * MB;
const HOVER_MAX = 400 * MB; // fetched on hover / card open
// memory kept for ready previews (oldest dropped first)
const budget = () => (low() ? 160 : 600) * MB;
const lanes = () => (low() ? 1 : 3);

const cache = new Map<string, Promise<File>>();
const sizes = new Map<string, number>();
let running = 0;
const queue: (() => void)[] = [];

export const canPeek = (o: Orb) =>
  !!o.open && !o.id.startsWith("up-") && o.maxDownloads == null && o.status === "ready" && !!viewKind(o.fileName, o.mime) && o.size <= HOVER_MAX;

function trim() {
  let total = [...sizes.values()].reduce((a, b) => a + b, 0);
  for (const id of sizes.keys()) {
    if (total <= budget()) break;
    total -= sizes.get(id)!;
    sizes.delete(id);
    cache.delete(id);
  }
}

const slot = () => (running < lanes() ? Promise.resolve() : new Promise<void>((ok) => queue.push(ok)));

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

/** Warm previews as soon as they appear in the void: the smallest first (most ready soonest), newest first among equals. */
export function warm(orbs: Orb[]) {
  const todo = orbs.filter((o) => canPeek(o) && o.size <= eagerMax() && !cache.has(o.id));
  todo.sort((a, b) => a.size - b.size || b.createdAt.localeCompare(a.createdAt));
  for (const o of todo) void peekFile(o).catch(() => {});
}
