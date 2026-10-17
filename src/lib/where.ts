"use client";
import { areaOf, validArea } from "./area";

// Where this device is in the void (lib/area.ts). Shared location → the cell it is really in; otherwise the cell its
// IP points to (rougher). Only the cell is kept and sent, never the coordinates.

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
        const w: Where = { area: areaOf(p.coords.latitude, p.coords.longitude), how: "gps" };
        save(w);
        res(w);
      },
      (e) => rej(Object.assign(new Error(e.code === 1 ? "Location is blocked for this site" : "Couldn't get your location"), { denied: e.code === 1 })),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60_000 },
    );
  });
}
