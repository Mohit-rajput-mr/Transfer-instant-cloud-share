"use client";
import type { Orb } from "./client";
import { NotYet, peekOrb, receive, receiving } from "./transfer";
import { viewKind } from "@/components/Viewer";
import { isLow } from "./perf";
import { cloudSaving } from "./cloud";
import { downloading } from "./downloads";
import { tryAcquire } from "./net";

// Previews that are ready before anyone asks: small no-password files in sight are fetched and decrypted quietly in
// the background (smallest first, one at a time), on the assumption that they will be opened, so a tap shows them at
// once. Bigger ones start on hover, and anything up to HOVER_MAX when the card opens. Nothing is counted as a
// download and nothing is saved to disk.
// A guess must never cost the line anything: only from a stored copy that is complete (never pulled from the sender's
// device, whose line is often still uploading that very file), only while nothing else moves on this device (no
// upload, device-to-device send or download, lib/net.ts), only in a visible tab and not on a slow or data-saving
// connection. A file that failed, isn't stored yet or was dropped for memory waits a while before another try (once,
// this re-downloaded the same files every 20 s forever).

const MB = 1024 * 1024;
const low = () => isLow();
// guessed as soon as the ball shows up / on hover
// the void is worldwide: every open file would be pulled by every visible tab on Earth; only small ones are warmed
const WARM_MAX = 1 * MB;
const hoverMax = () => (low() ? 25 : 100) * MB;
const HOVER_MAX = 400 * MB; // fetched when the card opens
// memory kept for ready previews (oldest dropped first)
const budget = () => (low() ? 160 : 600) * MB;
// background bytes per 10 minutes, at most
const guessCap = () => (low() ? 40 : 160) * MB;
const lanes = () => (low() ? 1 : 3);

const cache = new Map<string, Promise<File>>();
const sizes = new Map<string, number>();
/** cache entries that are only a guess (stored copy only): someone opening the card may still need the sender's device */
const guessed = new Set<string>();
/** a guess on its way, called off when someone opens that card (theirs goes at full width at once, not after it) */
const guessStop = new Map<string, AbortController>();
/** id → not guessed again before this time, and how often it found no stored copy (each wait twice as long) */
const skip = new Map<string, number>();
const misses = new Map<string, number>();
const spent: { at: number; n: number }[] = [];
let running = 0;
const queue: (() => void)[] = [];
/** the files in sight at the last warm(): the next one is guessed when one is done */
let pool: Orb[] = [];

export const canPeek = (o: Orb) =>
  !!o.open && !o.id.startsWith("up-") && o.maxDownloads == null && o.status === "ready" && !!viewKind(o.fileName, o.mime) && o.size <= HOVER_MAX;

function trim() {
  let total = [...sizes.values()].reduce((a, b) => a + b, 0);
  for (const id of sizes.keys()) {
    if (total <= budget()) break;
    total -= sizes.get(id)!;
    sizes.delete(id);
    cache.delete(id);
    guessed.delete(id);
    // dropped for memory: never fetched again in the background (it still opens on a tap). A while later was a loop:
    // more small files in sight than the budget holds were downloaded in turn, each pushing out the next, for good
    skip.set(id, Infinity);
  }
}

const slot = () => (running < lanes() ? Promise.resolve() : new Promise<void>((ok) => queue.push(ok)));

async function fetchPeek(o: Orb, guess: boolean, signal?: AbortSignal) {
  const un = await peekOrb(o, signal);
  const res = await receive({ orb: o, unlocked: un, target: Promise.resolve(null), folderTarget: null, hold: true, onProgress: () => {}, guess, signal });
  if (res.kind !== "file") throw new Error("no preview");
  sizes.set(o.id, res.file.size);
  trim();
  return res.file;
}

function keep(id: string, p: Promise<File>, guess: boolean) {
  cache.set(id, p);
  if (guess) guessed.add(id);
  else guessed.delete(id);
  p.then(
    () => cache.get(id) === p && guessed.delete(id),
    () => cache.get(id) === p && (cache.delete(id), guessed.delete(id)),
  );
}

/** The decrypted file for a preview someone asked for (the card opened): started now if it isn't on its way already. */
export function peekFile(o: Orb): Promise<File> {
  const hit = cache.get(o.id);
  if (hit && !guessed.has(o.id)) return hit;
  const ask = async () => {
    await slot();
    running++;
    try {
      return await fetchPeek(o, false);
    } finally {
      running--;
      queue.shift()?.();
    }
  };
  // a guess on its way: called off, this one goes now (a guess fetches one range at a time)
  guessStop.get(o.id)?.abort();
  const p = ask();
  keep(o.id, p, false);
  return p;
}

/** Ready already (no waiting at all)? */
export const peeked = (id: string) => sizes.has(id);

/** Nothing else moves and the connection is fine: a guess may go. */
function quiet() {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || /2g|3g/.test(c?.effectiveType ?? "")) return false;
  const since = Date.now() - 10 * 60_000;
  while (spent.length && spent[0].at < since) spent.shift();
  return !running && !receiving() && !downloading() && !cloudSaving() && spent.reduce((a, b) => a + b.n, 0) < guessCap();
}

/** One background guess, if the line is free (a turn from lib/net.ts, never waited for). */
function guess(o: Orb) {
  if (cache.has(o.id) || (skip.get(o.id) ?? 0) > Date.now() || !quiet()) return false;
  // the previews in sight already fill the memory kept for them: another would only push one of them out
  const inSight = new Set(pool.map((x) => x.id));
  let held = 0;
  for (const [id, n] of sizes) if (inSight.has(id)) held += n;
  if (held + o.size > budget()) return false;
  const done = tryAcquire("peek");
  if (!done) return false;
  const ac = new AbortController();
  guessStop.set(o.id, ac);
  const p = fetchPeek(o, true, ac.signal);
  keep(o.id, p, true);
  p.then(
    (f) => spent.push({ at: Date.now(), n: f.size }),
    // not stored yet: soon again (the upload is under way), then less and less often (a place with no storage never
    // stores it); anything else: much later. Called off for a card that opened: nothing to wait for
    (e) => {
      if (ac.signal.aborted) return;
      const n = e instanceof NotYet ? (misses.get(o.id) ?? 0) + 1 : 4;
      misses.set(o.id, n);
      // (not stored yet: 5 s, 10 s, 20 s… a fresh file's copy usually lands within seconds; other trouble: minutes)
      skip.set(o.id, Date.now() + Math.min(10 * 60_000, (e instanceof NotYet ? 5_000 : 60_000) * 2 ** (n - 1)));
    },
  ).finally(() => {
    if (guessStop.get(o.id) === ac) guessStop.delete(o.id);
    done();
    // then the next one in sight (each file is tried once, then cached or set aside: this ends)
    setTimeout(() => warm(pool, poolSpace), 500);
  });
  return true;
}

// inside a space the people who see a file are the few it was sent to, so files up to this size are on their device
// before they tap (like a chat app); the worldwide void stays at WARM_MAX
const SPACE_WARM_MAX = 50 * MB;
const spaceWarmMax = () => (low() ? 10 : 50) * MB;

/** Warm small previews as they appear in the void (in a space: up to SPACE_WARM_MAX): the smallest first (most ready
 *  soonest), newest first among equals. */
let poolSpace = false;
export function warm(orbs: Orb[], inSpace = false) {
  pool = orbs;
  poolSpace = inSpace;
  const now = Date.now();
  const max = inSpace ? Math.min(SPACE_WARM_MAX, spaceWarmMax()) : WARM_MAX;
  const next = orbs
    .filter((o) => canPeek(o) && o.size <= max && !cache.has(o.id) && !((skip.get(o.id) ?? 0) > now))
    .sort((a, b) => a.size - b.size || b.createdAt.localeCompare(a.createdAt))[0];
  if (next) guess(next);
}

/** The pointer is on a ball: worth a guess if it is not big (the same rules as warm). */
export function hoverPeek(o: Orb) {
  if (canPeek(o) && o.size <= hoverMax()) guess(o);
}
