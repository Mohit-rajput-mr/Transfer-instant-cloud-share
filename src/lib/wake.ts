"use client";
// Keeps the screen on while this device is moving a file (saving a copy, sending directly, or
// downloading): a phone that locks mid-transfer suspends the page and the transfer with it.
// Released as soon as nothing needs it; re-taken when the page comes back into view.
type Sentinel = { release(): Promise<void>; released?: boolean };
type WakeNav = Navigator & { wakeLock?: { request(type: "screen"): Promise<Sentinel> } };

const reasons = new Set<string>();
let lock: Sentinel | null = null;
let asking = false;

async function sync() {
  const nav = navigator as WakeNav;
  if (!nav.wakeLock) return;
  if (reasons.size && (!lock || lock.released) && !asking && document.visibilityState === "visible") {
    asking = true;
    try {
      lock = await nav.wakeLock.request("screen");
    } catch {
      lock = null;
    } finally {
      asking = false;
    }
    if (!reasons.size) sync();
  } else if (!reasons.size && lock) {
    const l = lock;
    lock = null;
    l.release().catch(() => {});
  }
}

if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => sync());

export function stayAwake(reason: string, on: boolean) {
  if (typeof navigator === "undefined") return;
  if (on) reasons.add(reason);
  else reasons.delete(reason);
  void sync();
}
