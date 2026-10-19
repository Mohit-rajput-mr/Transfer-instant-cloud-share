import type { Overview } from "./types";

// Every pin the HQ globe draws, as rows for the Pins page: one list, same layers and colours as the globe legend.
export type PinKind = "live" | "exact" | "seen" | "anon" | "visitors" | "uploads" | "downloads";

export const PIN_KINDS: { k: PinKind; label: string; color: string }[] = [
  { k: "live", label: "Live now", color: "#3dff8c" },
  { k: "exact", label: "Exact GPS · live", color: "#ff4fd8" },
  { k: "seen", label: "Last GPS seen", color: "#c2124f" },
  { k: "anon", label: "Anonymous", color: "#d8d8d8" },
  { k: "visitors", label: "Visitors", color: "#ffffff" },
  { k: "uploads", label: "Uploads", color: "#59b8ff" },
  { k: "downloads", label: "Downloads", color: "#ffa045" },
];

export interface PinRow {
  k: PinKind;
  lat: number;
  lon: number;
  city: string | null;
  cc: string | null;
  /** devices / transfers at this spot (1 for a GPS pin) */
  n: number;
  /** GPS accuracy in metres, when the device reported it */
  acc: number | null;
  /** device label, or the anonymous IPs */
  note: string | null;
  /** last seen (ISO), when known */
  at: string | null;
  online: boolean | null;
}

export function pinRows(d: Overview): PinRow[] {
  const base = { acc: null, note: null, at: null, online: null };
  const where = (p: { city?: string | null; cc?: string | null }) => ({ city: p.city ?? null, cc: p.cc ?? null });
  return [
    ...d.live.map((p) => ({ ...base, k: "live" as const, lat: p.lat, lon: p.lon, ...where(p), n: p.n, online: true })),
    ...(d.exact ?? []).map((p) => ({ ...base, k: "exact" as const, lat: p.lat, lon: p.lon, ...where(p), n: 1, acc: p.acc, note: p.label, at: p.at, online: true })),
    ...(d.exactSeen ?? []).map((p) => ({ ...base, k: "seen" as const, lat: p.lat, lon: p.lon, ...where(p), n: 1, acc: p.acc, note: p.label, at: p.at, online: p.online ?? null })),
    ...(d.anon ?? []).map((p) => ({ ...base, k: "anon" as const, lat: p.lat, lon: p.lon, ...where(p), n: p.n, note: p.ips?.join(", ") || null, at: p.last, online: p.online > 0 })),
    ...d.visitors.map((p) => ({ ...base, k: "visitors" as const, lat: p.lat, lon: p.lon, ...where(p), n: p.n })),
    ...d.points.map((p) => ({ ...base, k: p.k === "upload" ? ("uploads" as const) : ("downloads" as const), lat: p.lat, lon: p.lon, ...where(p), n: p.n })),
  ];
}
