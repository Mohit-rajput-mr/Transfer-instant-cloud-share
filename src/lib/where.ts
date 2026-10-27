"use client";
import { areaOf, validArea } from "./area";
import { isAnon } from "./anon";
import { isMobileDevice } from "./save";

// Where this device is in the void (lib/area.ts). Shared location → the cell it is really in; otherwise the cell its
// IP points to (rougher). Only the cell is kept on the device and used for the void; the exact fix (in memory only)
// goes to Orbit with the heartbeat, for its own live map, and is never shown to other people.

/** gps: the device shared its location; pick: chosen by hand on the map (location blocked); ip: the connection's guess */
export type Where = { area: string; how: "gps" | "pick" | "ip" };
const KEY = "orbit:area";
const ASKED = "orbit:geo-asked";

const load = (): Where | null => {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) || "null") as Where | null;
    return w && validArea(w.area) && (w.how === "gps" || w.how === "pick" || w.how === "ip") ? w : null;
  } catch {
    return null;
  }
};
let cur: Where | null = typeof window === "undefined" ? null : load();
const save = (w: Where) => {
  cur = w;
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {}
};

export type Fix = { lat: number; lon: number; acc: number; at: number };
let fix: Fix | null = null;
let sent: Fix | null = null;
// (a computer is asked only every half hour, see follow(): its fix stays good that long)
const FIX_FOR_PHONE = 10 * 60_000;
const FIX_FOR_DESK = 40 * 60_000;
const setFix = (c: GeolocationCoordinates) => {
  fix = { lat: c.latitude, lon: c.longitude, acc: Math.round(c.accuracy), at: Date.now() };
  return fix;
};
/** the last exact position, while fresh: sent with the heartbeat */
export const fixNow = () => (isAnon() ? null : fix && Date.now() - fix.at < (isMobileDevice() ? FIX_FOR_PHONE : FIX_FOR_DESK) ? fix : null);
export const markSent = (f: Fix | null) => (sent = f);
/** metres between two fixes */
const dist = (a: Fix, b: Fix) => {
  const r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.hypot(x, y) * 6_371_000;
};

export const where = () => cur;
export const myArea = () => (isAnon() ? "" : cur?.area ?? "");
/** turning anonymous on: the exact fix is dropped from memory */
export const forgetFix = () => {
  fix = sent = null;
};
// anonymous: the IP's cell from the anonymous heartbeat, only to look around the public void; never written to orbit:area
let anonCell = "";
export const setAnonCell = (a: unknown) => {
  anonCell = validArea(a) ? a : "";
};
export const anonCellNow = () => anonCell;

// A cell border is jittery: a GPS fix wobbles across it, and a network change (VPN, IPv6/IPv4, Wi-Fi/cable) can
// geolocate the same connection to the next cell and back. Each flip moved this device to another void (and away from
// the devices next to it), so a new cell counts only once it is read twice in a row.
let ipNext: string | null = null;
let gpsNext: string | null = null;
// ...except the first IP reading of a page load: the stored area may be from another day in another place
let ipHeard = false;

/** the server's guess from the IP: used only until (or unless) the device shares its location */
export function fromIp(area: unknown) {
  if (isAnon()) return false;
  if (!validArea(area) || cur?.how === "gps" || cur?.how === "pick") return false;
  const first = !ipHeard;
  ipHeard = true;
  // the same as now: any half-heard other cell is forgotten
  const next = cur?.area === area ? null : area;
  // (nothing known yet, or the first reading since load: taken at once)
  if (!next || (cur && !first && ipNext !== next)) {
    ipNext = next;
    return false;
  }
  ipNext = null;
  save({ area, how: "ip" });
  return true;
}
/** location blocked: the area picked by hand on the map, kept until the device shares its location */
export function pickArea(area: string) {
  if (validArea(area)) save({ area, how: "pick" });
}
/** location sharing turned off in the browser: back to the IP's area */
export function dropGps() {
  fix = sent = null;
  if (cur?.how === "gps") save({ area: cur.area, how: "ip" });
}

/** the location popup shows at most once every 2 days per browser (owner's rule) */
export const ASK_EVERY = 2 * 24 * 3600_000;
/** whether this browser saw the location popup within the last 2 days (an old "1" from before the rule counts as long ago) */
export const askedRecently = (stored: string | null, now = Date.now()) => {
  const at = Number(stored);
  return stored !== "1" && Number.isFinite(at) && at > 0 && now - at < ASK_EVERY;
};
export const asked = () => {
  try {
    return askedRecently(localStorage.getItem(ASKED));
  } catch {
    return true;
  }
};
export const markAsked = () => {
  try {
    localStorage.setItem(ASKED, String(Date.now()));
  } catch {}
};

/** the person switched location off here (the pin's switch): never located again until they switch it back on */
const OFF = "orbit:loc-off";
export const locOff = () => {
  try {
    return localStorage.getItem(OFF) === "1";
  } catch {
    return false;
  }
};
export const setLocOff = (off: boolean) => {
  try {
    if (off) localStorage.setItem(OFF, "1");
    else localStorage.removeItem(OFF);
  } catch {}
};

/** what the browser says about location: granted, denied (blocked in settings), or it will ask */
export async function permission(): Promise<PermissionState | "unknown"> {
  try {
    return (await navigator.permissions.query({ name: "geolocation" as PermissionName })).state;
  } catch {
    return "unknown";
  }
}

/** ask for the location (the browser shows its prompt the first time) and move to the cell it is in */
export function locate(): Promise<Where> {
  if (isAnon()) return Promise.reject(Object.assign(new Error("Location is off while you're anonymous"), { anon: true }));
  markAsked();
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("This browser can't share its location"));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFix(p.coords);
        const w: Where = { area: areaOf(p.coords.latitude, p.coords.longitude), how: "gps" };
        save(w);
        res(w);
      },
      (e) => rej(Object.assign(new Error(e.code === 1 ? "Location is blocked for this site" : "Couldn't get your location"), { denied: e.code === 1 })),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: (isMobileDevice() ? 10 : 30) * 60_000 },
    );
  });
}

/** while location is allowed: follow the device. `onArea` when it walks into another cell, `onMoved` when it is
 * more than 100 m from the position Orbit last heard. Returns the stop function. */
export function follow(onArea: (w: Where) => void, onMoved: () => void) {
  if (!navigator.geolocation || isAnon()) return () => {};
  // a computer doesn't walk anywhere: high accuracy there means Windows scanning Wi-Fi over and over (the radio leaves
  // its channel for each scan: lag spikes), for nothing. Phones and tablets keep the precise fix
  const mobile = isMobileDevice();
  let stopped = false;
  let confirmT: ReturnType<typeof setTimeout> | undefined;
  const commit = (area: string) => {
    clearTimeout(confirmT);
    gpsNext = null;
    save({ area, how: "gps" });
    onArea(cur!);
  };
  const onFix = (p: GeolocationPosition) => {
    if (stopped || isAnon()) return;
    const f = setFix(p.coords);
    const area = areaOf(f.lat, f.lon);
    if (cur?.area === area && cur.how === "gps") {
      gpsNext = null;
      clearTimeout(confirmT);
    }
    // the first fix replaces a guess (IP, picked) at once; a move between GPS cells needs a second fix there
    else if (cur?.how === "gps" && gpsNext !== area) {
      gpsNext = area;
      // a computer that stays put may never report again (watchPosition answers moves): asked once more shortly, so
      // a real move (lid shut at home, opened at the office) isn't left pending until a reload. No answer: nothing
      // said otherwise, the new cell stands
      clearTimeout(confirmT);
      confirmT = setTimeout(() => {
        if (stopped || gpsNext !== area) return;
        navigator.geolocation.getCurrentPosition(onFix, () => !stopped && !isAnon() && gpsNext === area && cur?.how === "gps" && commit(area), {
          enableHighAccuracy: mobile, timeout: 30_000, maximumAge: mobile ? 0 : 5 * 60_000,
        });
      }, 20_000);
    } else commit(area);
    if (!sent || dist(sent, f) > 100) onMoved();
  };
  // A computer is NOT followed (owner 2026-10-27: "opening Orbi makes the whole computer's internet stop, other
  // browsers too"). On Windows every fresh position makes the Wi-Fi card scan all channels, and watchPosition asked
  // for one about every minute: each scan takes the radio off its channel, so the whole machine's connection stalls
  // or drops. A computer doesn't move: one cached position every 30 minutes (maximumAge: no new scan while it is
  // fresh) is plenty. Phones and tablets keep following.
  if (!mobile) {
    const ask = () => !stopped && navigator.geolocation.getCurrentPosition(onFix, () => {}, { enableHighAccuracy: false, timeout: 30_000, maximumAge: 30 * 60_000 });
    const t = setInterval(ask, 30 * 60_000);
    return () => {
      stopped = true;
      clearTimeout(confirmT);
      clearInterval(t);
    };
  }
  const id = navigator.geolocation.watchPosition(onFix, () => {}, { enableHighAccuracy: true, timeout: 30_000, maximumAge: 15_000 });
  return () => {
    stopped = true;
    clearTimeout(confirmT);
    navigator.geolocation.clearWatch(id);
  };
}
