"use client";
// One watch over this device's internet line, shared by everything that moves files in bulk.
// A full-speed upload fills the router's queue (bufferbloat): pages, DNS and Windows' own internet check (NCSI) time
// out, Windows flips its connectivity state and Chrome fails every socket with ERR_NETWORK_CHANGED, Orbi's own uploads
// included, which then send whole parts again and fill the line once more: a loop. So while anything goes up, a tiny
// request to our own edge measures the round trip; when it climbs well above this line's quiet level the line is
// "busy". And every bulk job takes a turn here first (acquire): a 'Separate' send of ten files must not start thirty
// uploads at once, and background previews never compete with an upload or a device-to-device send.

const st = { users: 0, timer: 0 as ReturnType<typeof setInterval> | 0, base: Infinity, recent: [] as number[], busy: false, probing: false, last: 0, ready: null as Promise<void> | null };

async function probe() {
  if (st.probing) return; // a slow answer must not stack up more requests on a choked line
  st.probing = true;
  st.last = Date.now();
  try {
    const t = performance.now();
    const ok = await fetch(`/favicon.ico?rtt=${Date.now()}`, { method: "HEAD", cache: "no-store" }).then((r) => r.ok, () => false);
    // the watch ended meanwhile: a late (slow) sample would mark the line busy with nothing left to clear it
    if (!st.timer) return;
    const ms = ok ? performance.now() - t : 5000;
    st.recent = [...st.recent.slice(-2), ms];
    if (ok) st.base = Math.min(st.base, ms);
    const med = [...st.recent].sort((a, b) => a - b)[Math.floor(st.recent.length / 2)];
    // calm again only once it has clearly come back down, over at least 2 samples (no flapping)
    const was = st.busy;
    st.busy = was ? st.recent.length < 2 || med > Math.max(st.base * 2.5, st.base + 200) : med > Math.max(st.base * 4, st.base + 400);
    if (was !== st.busy) {
      console.info(st.busy ? `orbi: line busy (${Math.round(med)} ms vs ${Math.round(st.base)} ms), uploading gently` : "orbi: line calm again, full speed");
      grant();
    }
  } finally {
    st.probing = false;
  }
}

/** Something big goes up (balanced by watchNet(false)). The first watcher measures the quiet round trip with 2 quick
 *  samples before the first byte (a base taken mid-upload would be inflated and never see the line choke). */
export function watchNet(on: boolean): Promise<void> {
  st.users += on ? 1 : -1;
  if (st.users > 0 && !st.timer) {
    st.ready = Promise.race([probe().then(probe), new Promise<void>((r) => setTimeout(r, 2500))]).catch(() => {});
    st.timer = setInterval(probe, 1500);
  } else if (st.users <= 0 && st.timer) {
    clearInterval(st.timer);
    Object.assign(st, { timer: 0, users: 0, recent: [], busy: false, ready: null });
    grant();
  }
  return on ? st.ready ?? Promise.resolve() : Promise.resolve();
}
/** Upload progress events keep firing in a background tab, where timers slow to once a minute: they keep the watch going. */
export function nudgeNet() {
  if (st.timer && Date.now() - st.last > 1500) void probe();
}
/** A part failed on the network (often Chrome's ERR_NETWORK_CHANGED on a choked line): start again gently, and only
 *  speed up after 2 calm samples, instead of re-sending every lane at once into the same jam. */
export function netHiccup() {
  if (!st.timer) return; // (nothing watched: nothing would ever clear it)
  st.recent = [];
  st.busy = true;
}
// back from offline, maybe on another network (Wi-Fi ↔ mobile) with another quiet level: measure it again. (Not on
// navigator.connection 'change': that fires on every estimate update, mid-upload too, where a fresh base would be inflated)
if (typeof window !== "undefined") window.addEventListener("online", () => (st.base = Infinity));

// the person's pick: "gentle" (default) backs off on a busy line, "full" always goes flat out
const SPEED_KEY = "orbit:upspeed";
export type UpSpeed = "gentle" | "full";
export const upSpeed = (): UpSpeed => {
  try {
    return localStorage.getItem(SPEED_KEY) === "full" ? "full" : "gentle";
  } catch {
    return "gentle";
  }
};
export const setUpSpeed = (v: UpSpeed) => {
  try {
    localStorage.setItem(SPEED_KEY, v);
  } catch {}
  grant();
};
/** the line is choking and this device is set to be gentle: uploads (and device-to-device sends) hold back */
export const netCongested = () => st.busy && upSpeed() === "gentle";
/** bulk bytes move on this device (an upload, a device-to-device send), or the line was seen choking: a round trip may
 *  take seconds with nothing wrong (lib/live.ts waits longer for its pongs then) */
export const netLoaded = () => st.busy || st.users > 0 || runs.up > 0 || runs.serve > 0;

// ---- turns: who may move bytes right now ------------------------------------------------------------------------
// up: one upload part (or a small file). serve: one device-to-device send to someone over the internet (same Wi-Fi
// doesn't touch the line and takes no turn). peek: a background preview, only when nothing else moves.
export type NetKind = "up" | "serve" | "peek";
const ORDER: NetKind[] = ["up", "serve", "peek"];
const runs: Record<NetKind, number> = { up: 0, serve: 0, peek: 0 };
type Wait = { kind: NetKind; rank: number; seq: number; go: (release: () => void) => void };
const waits: Wait[] = [];
let seq = 0;

const limit = (k: NetKind) => {
  const busy = netCongested();
  if (k === "up") return upSpeed() === "full" ? 6 : busy ? 1 : 2; // (never 0: nothing stalls for good on a wrong probe)
  if (k === "serve") return busy ? 1 : 2;
  return st.busy || runs.up || runs.serve || waits.some((w) => w.kind !== "peek") ? 0 : 1;
};

function grant() {
  // by kind, then the earliest rank (the first file picked goes up first), then the order asked
  waits.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.rank - b.rank || a.seq - b.seq);
  for (let i = 0; i < waits.length; ) {
    const w = waits[i];
    if (runs[w.kind] < limit(w.kind)) {
      waits.splice(i, 1);
      w.go(take(w.kind));
    } else i++;
  }
}
function take(k: NetKind) {
  runs[k]++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    runs[k]--;
    grant();
  };
}

/** Wait for a turn; call the returned function when done. `rank`: lower goes first within a kind (default: in order). */
export function acquire(kind: NetKind, signal?: AbortSignal, rank?: number): Promise<() => void> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  const s = ++seq;
  return new Promise((res, rej) => {
    const w: Wait = { kind, rank: rank ?? s, seq: s, go: (r) => (signal?.removeEventListener("abort", stop), res(r)) };
    const stop = () => {
      const i = waits.indexOf(w);
      if (i >= 0) waits.splice(i, 1);
      rej(new DOMException("Aborted", "AbortError"));
      grant();
    };
    signal?.addEventListener("abort", stop, { once: true });
    waits.push(w);
    grant();
  });
}
/** A turn now or never (background work that simply skips when the line is in use). */
export function tryAcquire(kind: NetKind): (() => void) | null {
  return !waits.some((w) => w.kind === kind) && runs[kind] < limit(kind) ? take(kind) : null;
}
/** How many turns of this kind are running. */
export const netActive = (kind: NetKind) => runs[kind];
