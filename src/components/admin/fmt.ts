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
