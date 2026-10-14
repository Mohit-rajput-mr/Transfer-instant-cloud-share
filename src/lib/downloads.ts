"use client";
// Background downloads: "Download all" (and a ball's own Download in a container) queue here instead
// of living inside a panel, so closing the panel or the container never stops them. One at a time,
// each with the full connection; every finished one is marked downloaded at once (its ball greys out
// live). Phones collect the files and save them together with one tap at the end.
import { useSyncExternalStore } from "react";
import { markGot, type Orb } from "./client";
import { receive, unlockOrb, UnlockError } from "./transfer";
import { autoDownload, canShareFiles, saveEnv, shareFile } from "./save";
import { stayAwake } from "./wake";
import { Meter } from "./rate";

export type DlJob = { id: string; name: string; state: "queued" | "running" | "done" | "failed"; frac: number; speed?: string; err?: string; orb: Orb; code: string };
type State = { jobs: DlJob[]; held: File[] };

let state: State = { jobs: [], held: [] };
const subs = new Set<() => void>();
const emit = (next: Partial<State>) => {
  state = { ...state, ...next };
  subs.forEach((f) => f());
  stayAwake("downloads", state.jobs.some((j) => j.state === "queued" || j.state === "running"));
};
const patch = (id: string, p: Partial<DlJob>) => emit({ jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) });

let running = false;
let abort: AbortController | null = null;

/** Queue objects for download; ones already queued or running are skipped. */
export function enqueue(orbs: Orb[], code = "") {
  const busy = new Set(state.jobs.filter((j) => j.state === "queued" || j.state === "running").map((j) => j.id));
  const fresh = orbs.filter((o) => !busy.has(o.id)).map((o): DlJob => ({ id: o.id, name: o.name, state: "queued", frac: 0, orb: o, code }));
  if (!fresh.length) return;
  // finished rows of an earlier batch make room for the new one
  emit({ jobs: [...state.jobs.filter((j) => j.state === "queued" || j.state === "running" || j.state === "failed"), ...fresh] });
  void run();
}

async function run() {
  if (running) return;
  running = true;
  const env = saveEnv();
  for (;;) {
    const job = state.jobs.find((j) => j.state === "queued");
    if (!job) break;
    patch(job.id, { state: "running", frac: 0 });
    abort = new AbortController();
    const meter = new Meter(job.orb.size);
    try {
      const un = await unlockOrb(job.orb, job.orb.open ? "" : job.code, abort.signal);
      const res = await receive({
        orb: job.orb, unlocked: un, target: Promise.resolve(null), folderTarget: null, signal: abort.signal, hold: env.mobile,
        onProgress: (_s, f) => patch(job.id, { frac: f, speed: meter.label(f * job.orb.size) }),
      });
      if (res.kind === "file" && res.held) emit({ held: [...state.held, ...(res.parts?.length ? res.parts : [res.file])] });
      if (res.kind === "text") autoDownload(new File([res.text], `${job.name || "note"}.txt`, { type: "text/plain" }));
      if (res.kind !== "file" || !res.held) markGot(job.id);
      patch(job.id, { state: "done", frac: 1 });
    } catch (e) {
      if (abort?.signal.aborted) {
        emit({ jobs: state.jobs.map((j) => (j.state === "queued" || j.state === "running" ? { ...j, state: "failed", err: "Cancelled" } : j)) });
        break;
      }
      const err = e instanceof UnlockError
        ? e.reason === "wrong" ? "Wrong passcode" : e.reason === "sealed" ? "Download limit reached" : e.reason === "locked" ? "Locked" : "Gone"
        : e instanceof Error ? e.message : "Failed";
      patch(job.id, { state: "failed", err });
    }
  }
  abort = null;
  running = false;
}

/** Something is still downloading (a page refresh now would cut it). */
export const downloading = () => state.jobs.some((j) => j.state === "queued" || j.state === "running");

export function cancelAll() {
  abort?.abort();
}

/** Phones: hand every collected file to the share sheet at once (falls back to downloading each). */
export function saveHeld() {
  const files = state.held;
  if (!files.length) return;
  const env = saveEnv();
  const go = canShareFiles(files, env) ? shareFile(files) : Promise.reject(new Error("no share"));
  go.catch(() => files.forEach((f, i) => setTimeout(() => autoDownload(f), i * 300))).finally(() => {
    for (const j of state.jobs) if (j.state === "done") markGot(j.id);
    emit({ held: [] });
  });
}

export function dismiss() {
  if (running) return;
  emit({ jobs: [], held: [] });
}

export function useDownloads() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
}
