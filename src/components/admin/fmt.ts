// Small formatting helpers shared by the HQ views.
const regionName = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();
export const flag = (cc: string | null) =>
  cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐";
export const country = (cc: string | null) => {
  if (!cc || !/^[A-Z]{2}$/.test(cc)) return "Unknown";
  try {
    return regionName?.of(cc) ?? cc;
  } catch {
    return cc;
  }
};
export const n = (v: number | undefined) => (v ?? 0).toLocaleString("en-US");

/** "27 Oct, 08:51:34" in HQ's own time zone */
export const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
/** 850 ms · 4.2 s · 3 min 12 s · 1 h 4 min */
export const took = (ms?: number | null) => {
  if (ms == null || !Number.isFinite(ms)) return "";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${Math.round(s % 60)} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};
