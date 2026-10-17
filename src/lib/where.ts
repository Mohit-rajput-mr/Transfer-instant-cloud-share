"use client";
import { areaOf, validArea } from "./area";

// Where this device is in the void (lib/area.ts). Shared location → the cell it is really in; otherwise the cell its
// IP points to (rougher). Only the cell is kept on the device and used for the void; the exact fix (in memory only)
// goes to Orbit with the heartbeat, for its own live map, and is never shown to other people.

export type Where = { area: string; how: "gps" | "ip" };
const KEY = "orbit:area";
const ASKED = "orbit:geo-asked";

const load = (): Where | null => {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) || "null") as Where | null;
    return w && validArea(w.area) && (w.how === "gps" || w.how === "ip") ? w : null;
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
const FIX_FOR = 10 * 60_000;
const setFix = (c: GeolocationCoordinates) => {
  fix = { lat: c.latitude, lon: c.longitude, acc: Math.round(c.accuracy), at: Date.now() };
  return fix;
};
/** the last exact position, while fresh: sent with the heartbeat */
export const fixNow = () => (fix && Date.now() - fix.at < FIX_FOR ? fix : null);
export const markSent = (f: Fix | null) => (sent = f);
/** metres between two fixes */
const dist = (a: Fix, b: Fix) => {
  const r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.hypot(x, y) * 6_371_000;
};

export const where = () => cur;
export const myArea = () => cur?.area ?? "";

/** the server's guess from the IP: used only until (or unless) the device shares its location */
export function fromIp(area: unknown) {
  if (!validArea(area) || cur?.how === "gps" || cur?.area === area) return false;
  save({ area, how: "ip" });
  return true;
}
/** location sharing turned off in the browser: back to the IP's area */
export function dropGps() {
  fix = sent = null;
  if (cur?.how === "gps") save({ area: cur.area, how: "ip" });
}

export const asked = () => {
  try {
    return localStorage.getItem(ASKED) === "1";
  } catch {
    return true;
  }
};
export const markAsked = () => {
  try {
    localStorage.setItem(ASKED, "1");
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
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60_000 },
    );
  });
}

/** while location is allowed: follow the device. `onArea` when it walks into another cell, `onMoved` when it is
 * more than 100 m from the position Orbit last heard. Returns the stop function. */
export function follow(onArea: (w: Where) => void, onMoved: () => void) {
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    (p) => {
      const f = setFix(p.coords);
      const area = areaOf(f.lat, f.lon);
      if (cur?.area !== area || cur.how !== "gps") {
        save({ area, how: "gps" });
        onArea(cur!);
      }
      if (!sent || dist(sent, f) > 100) onMoved();
    },
    () => {},
    { enableHighAccuracy: true, timeout: 30_000, maximumAge: 15_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
