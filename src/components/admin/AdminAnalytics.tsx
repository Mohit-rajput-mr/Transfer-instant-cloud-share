"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { formatBytes } from "@/lib/client";
import { country, flag, n, took } from "./fmt";
import AdminPages from "./Pages";

// /admin/analytics (owner 2026-10-27): how much reach Orbi gets each day and whether it is growing. Per UTC day:
// visitors, new devices, uploaders, downloaders, uploads, downloads, data, GPS, peak live (migration 032). One chart
// at a time, one unit per chart (people / activity / data / live), up to four lines; a sortable, filterable table.

type Day = {
  day: string; visits: number; uploads: number; downloads: number; bytesUp: number; bytesDown: number; countries: number;
  newDevices: number; visitors: number | null; gps: number | null; uploaders: number | null; downloaders: number | null;
  livePeak: number | null; upMs: number | null; downMs: number | null;
};
type Data = { from: string; to: string; country: string | null; trackedFrom: string | null; liveFrom: string | null; countries: { cc: string; n: number }[]; days: Day[] };
type Key = Exclude<keyof Day, "day">;

// fixed series slots (dataviz reference palette, dark steps; validated against #0b0f14: all checks pass)
const SLOT = ["#3987e5", "#d95926", "#199e70", "#c98500"];
const COL: { k: Key; label: string; fmt?: (v: number) => string }[] = [
  { k: "visitors", label: "Visitors" },
  { k: "newDevices", label: "New devices" },
  { k: "uploaders", label: "Uploaders" },
  { k: "downloaders", label: "Downloaders" },
  { k: "visits", label: "Visits" },
  { k: "uploads", label: "Uploads" },
  { k: "downloads", label: "Downloads" },
  { k: "bytesUp", label: "Data up", fmt: formatBytes },
  { k: "bytesDown", label: "Data down", fmt: formatBytes },
  { k: "gps", label: "With GPS" },
  { k: "livePeak", label: "Peak live" },
  { k: "countries", label: "Countries" },
  { k: "upMs", label: "Upload time (median)", fmt: (v) => took(v) },
  { k: "downMs", label: "Download time (median)", fmt: (v) => took(v) },
];
const label = (k: Key) => COL.find((c) => c.k === k)?.label ?? k;
const fmtOf = (k: Key) => COL.find((c) => c.k === k)?.fmt ?? ((v: number) => n(v));
// one unit per chart: never two scales on one axis
const CHARTS: { id: string; label: string; keys: Key[]; sum: boolean }[] = [
  { id: "people", label: "People", keys: ["visitors", "newDevices", "uploaders", "downloaders"], sum: true },
  { id: "activity", label: "Activity", keys: ["visits", "uploads", "downloads"], sum: true },
  { id: "data", label: "Data moved", keys: ["bytesUp", "bytesDown"], sum: true },
  { id: "live", label: "Live & GPS", keys: ["livePeak", "gps"], sum: false },
  { id: "speed", label: "Speed", keys: ["upMs", "downMs"], sum: false },
];
const RANGES = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "all", label: "All", days: 0 },
] as const;
type Group = "day" | "week" | "month";

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const shortDay = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
const weekOf = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
  return ymd(d);
};

/** days folded into weeks or months: counts are summed, peaks / medians take the highest / the middle */
function fold(days: Day[], g: Group): Day[] {
  if (g === "day") return days;
  const m = new Map<string, Day[]>();
  for (const d of days) {
    const k = g === "week" ? weekOf(d.day) : `${d.day.slice(0, 7)}-01`;
    m.set(k, [...(m.get(k) ?? []), d]);
  }
  const sum = (l: Day[], k: Key) => (l.every((d) => d[k] == null) ? null : l.reduce((a, d) => a + Number(d[k] ?? 0), 0));
  const max = (l: Day[], k: Key) => (l.every((d) => d[k] == null) ? null : Math.max(...l.map((d) => Number(d[k] ?? 0))));
  const mid = (l: Day[], k: Key) => {
    const v = l.map((d) => d[k]).filter((x): x is number => x != null).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : null;
  };
  return [...m].map(([day, l]) => ({
    day, visits: sum(l, "visits") ?? 0, uploads: sum(l, "uploads") ?? 0, downloads: sum(l, "downloads") ?? 0,
    bytesUp: sum(l, "bytesUp") ?? 0, bytesDown: sum(l, "bytesDown") ?? 0, newDevices: sum(l, "newDevices") ?? 0,
    // distinct people per week/month can't be added up from days: the busiest day stands for it
    visitors: max(l, "visitors"), gps: max(l, "gps"), uploaders: max(l, "uploaders"), downloaders: max(l, "downloaders"),
    countries: max(l, "countries") ?? 0, livePeak: max(l, "livePeak"), upMs: mid(l, "upMs"), downMs: mid(l, "downMs"),
  }));
}

export default function AdminAnalytics() {
  const [auth, setAuth] = useState<"checking" | "locked" | "in">("checking");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [range, setRange] = useState<string>("30");
  const [from, setFrom] = useState(() => ymd(new Date(Date.now() - 29 * 864e5)));
  const [to, setTo] = useState(() => ymd(new Date()));
  const [cc, setCc] = useState("");
  const [chart, setChart] = useState("people");
  const [hidden, setHidden] = useState<Set<Key>>(new Set());
  const [group, setGroup] = useState<Group>("day");
  const [sort, setSort] = useState<{ k: Key | "day"; dir: 1 | -1 }>({ k: "day", dir: -1 });
  const [hideEmpty, setHideEmpty] = useState(false);

  const pick = (id: string) => {
    setRange(id);
    const r = RANGES.find((x) => x.id === id);
    if (!r) return;
    setTo(ymd(new Date()));
    setFrom(r.days ? ymd(new Date(Date.now() - (r.days - 1) * 864e5)) : "");
  };

  useEffect(() => {
    let on = true;
    const get = async () => {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      if (cc) q.set("country", cc);
      const r = await fetch(`/api/admin/analytics?${q}`, { cache: "no-store" }).catch(() => null);
      if (!on) return;
      if (r?.status === 401) return setAuth("locked");
      if (r?.status === 501) return (setAuth("in"), setErr("Run supabase/migrations/032_hq_times_analytics.sql first."));
      const d = r?.ok ? ((await r.json().catch(() => null)) as Data | null) : null;
      if (!d) return setErr("Couldn't load analytics, retrying…");
      setErr("");
      setAuth("in");
      setData(d);
    };
    void get();
    const t = setInterval(() => document.visibilityState === "visible" && void get(), 60_000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [from, to, cc]);

  const days = useMemo(() => fold(data?.days ?? [], group), [data, group]);
  const spec = CHARTS.find((c) => c.id === chart) ?? CHARTS[0];
  const keys = spec.keys.filter((k) => !hidden.has(k));

  // totals over the range, and growth: the second half of the range against the first
  const tot = (k: Key, l = data?.days ?? []) => l.reduce((a, d) => a + Number(d[k] ?? 0), 0);
  const all = data?.days ?? [];
  const half = Math.floor(all.length / 2);
  const growth = (k: Key) => {
    if (all.length < 4) return null;
    const a = tot(k, all.slice(0, half)), b = tot(k, all.slice(all.length - half));
    return a ? Math.round(((b - a) / a) * 100) : b ? Infinity : 0;
  };
  const peak = (k: Key) => Math.max(0, ...all.map((d) => Number(d[k] ?? 0)));

  const rows = useMemo(() => {
    const list = hideEmpty ? days.filter((d) => d.visits || d.uploads || d.downloads || d.newDevices) : days;
    const k = sort.k;
    return [...list].sort((a, b) => (k === "day" ? a.day.localeCompare(b.day) : Number(a[k] ?? -1) - Number(b[k] ?? -1)) * sort.dir);
  }, [days, sort, hideEmpty]);
  const th = (k: Key | "day", text: string) => (
    <button type="button" className={`hqa-th${sort.k === k ? " on" : ""}`} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))}>
      {text}{sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </button>
  );

  if (auth === "locked")
    return (
      <div className="hq hqs-locked">
        <p className="mono">Locked. <Link href="/admin">Sign in on HQ</Link>, then come back.</p>
      </div>
    );

  const g = (k: Key) => {
    const v = growth(k);
    return v == null ? undefined : v === Infinity ? "new in the 2nd half" : `${v >= 0 ? "▲" : "▼"} ${Math.abs(v)}% 2nd half vs 1st`;
  };

  return (
    <div className="hq hqs hqa">
      <header className="hq-top">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.svg" alt="Orbi Transfer" width={194} height={28} />
          <span className="brand-by">Mission HQ</span>
        </Link>
        <AdminPages />
        <span className="mono dim hq-clock">{data ? `${shortDay(data.from)} – ${shortDay(data.to)} · UTC days` : "loading…"}</span>
      </header>

      <main className="hqs-main">
        {err && <p className="hqs-err mono">{err}</p>}

        {/* filters: one row, above everything they change */}
        <div className="hqa-filters">
          <div className="hqa-seg">
            {RANGES.map((r) => <button key={r.id} className={`pill${range === r.id ? " on" : ""}`} onClick={() => pick(r.id)}>{r.label}</button>)}
          </div>
          <label className="hqa-date mono">From <input type="date" value={from} max={to || undefined} onChange={(e) => (setRange("custom"), setFrom(e.target.value))} /></label>
          <label className="hqa-date mono">To <input type="date" value={to} min={from || undefined} onChange={(e) => (setRange("custom"), setTo(e.target.value))} /></label>
          <select className="hqa-sel" value={cc} onChange={(e) => setCc(e.target.value)} aria-label="Country">
            <option value="">All countries</option>
            {(data?.countries ?? []).map((c) => <option key={c.cc} value={c.cc}>{flag(c.cc)} {country(c.cc)} · {n(c.n)}</option>)}
          </select>
          <div className="hqa-seg">
            {(["day", "week", "month"] as const).map((x) => <button key={x} className={`pill${group === x ? " on" : ""}`} onClick={() => setGroup(x)}>By {x}</button>)}
          </div>
        </div>

        <div className="hqs-tiles">
          <Tile label="Visitors (busiest day)" value={n(peak("visitors"))} sub={data?.trackedFrom ? `people counted from ${shortDay(data.trackedFrom)}` : "counted from migration 032 on"} />
          <Tile label="New devices" value={n(tot("newDevices"))} sub={g("newDevices")} />
          <Tile label="Visits" value={n(tot("visits"))} sub={g("visits")} />
          <Tile label="Uploads" value={n(tot("uploads"))} sub={`${formatBytes(tot("bytesUp"))}${g("uploads") ? ` · ${g("uploads")}` : ""}`} />
          <Tile label="Downloads" value={n(tot("downloads"))} sub={`${formatBytes(tot("bytesDown"))}${g("downloads") ? ` · ${g("downloads")}` : ""}`} />
          <Tile label="Peak live" value={n(peak("livePeak"))} sub={data?.liveFrom ? `sampled every 2 min from ${shortDay(data.liveFrom.slice(0, 10))}` : "sampling not started yet"} />
        </div>

        <section className="hq-panel hqa-chart">
          <div className="hqa-chart-head">
            <div className="hqa-seg" role="tablist" aria-label="Chart">
              {CHARTS.map((c) => <button key={c.id} role="tab" aria-selected={chart === c.id} className={`pill${chart === c.id ? " on" : ""}`} onClick={() => (setChart(c.id), setHidden(new Set()))}>{c.label}</button>)}
            </div>
            {/* legend: always, with each series switchable */}
            <div className="hqa-legend">
              {spec.keys.map((k, i) => (
                <button key={k} type="button" className={`hqa-key${hidden.has(k) ? " off" : ""}`} aria-pressed={!hidden.has(k)} onClick={() => setHidden((h) => {
                  const x = new Set(h);
                  if (x.has(k)) x.delete(k);
                  else x.add(k);
                  return x;
                })}>
                  <i style={{ background: SLOT[i] }} />{label(k)}
                </button>
              ))}
            </div>
          </div>
          <LineChart days={days} keys={keys} colorOf={(k) => SLOT[spec.keys.indexOf(k)]} fmt={fmtOf(keys[0] ?? spec.keys[0])} group={group} />
          {(chart === "people" || chart === "live") && data?.trackedFrom && <p className="mono dim hqa-note">Visitors, uploaders, downloaders and GPS are counted per device from {shortDay(data.trackedFrom)}; earlier days only have totals.</p>}
        </section>

        <section className="hq-panel">
          <div className="hqa-table-head">
            <span className="mono">Per {group} · {rows.length} rows · click a column to sort</span>
            <label className="mono dim hqs-check"><input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} /> hide quiet {group}s</label>
          </div>
          <div className="hqa-scroll">
            <table className="hqa-table">
              <thead>
                <tr>
                  <th>{th("day", group === "day" ? "Day" : group === "week" ? "Week of" : "Month")}</th>
                  {COL.map((c) => <th key={c.k}>{th(c.k, c.label)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.day}>
                    <td className="mono">{group === "month" ? new Date(`${d.day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" }) : shortDay(d.day)}</td>
                    {COL.map((c) => <td key={c.k}>{d[c.k] == null ? <span className="dim">—</span> : fmtOf(c.k)(Number(d[c.k]))}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile hq-tile">
      <span className="mono">{label}</span>
      <b className="wide">{value}</b>
      {sub && <span className="mono dim">{sub}</span>}
    </div>
  );
}

/** Lines over time, one axis, crosshair + tooltip on hover (and tap). */
function LineChart({ days, keys, colorOf, fmt, group }: { days: Day[]; keys: Key[]; colorOf: (k: Key) => string; fmt: (v: number) => string; group: Group }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(280, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 260, L = 52, R = 14, T = 14, B = 28;
  const pw = w - L - R, ph = H - T - B;
  const vals = days.flatMap((d) => keys.map((k) => d[k])).filter((v): v is number => v != null);
  const top = nice(Math.max(1, ...vals));
  const x = (i: number) => L + (days.length <= 1 ? pw / 2 : (i / (days.length - 1)) * pw);
  const y = (v: number) => T + ph - (v / top) * ph;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const every = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(pw / 80))));
  const path = (k: Key) => {
    let d = "", pen = false;
    days.forEach((day, i) => {
      const v = day[k];
      if (v == null) return void (pen = false);
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(Number(v)).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const at = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || !days.length) return null;
    const px = clientX - r.left;
    const i = days.length <= 1 ? 0 : Math.round(((px - L) / pw) * (days.length - 1));
    return Math.max(0, Math.min(days.length - 1, i));
  };
  const h = hover != null ? days[hover] : null;
  const dayName = (s: string) => (group === "month" ? new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }) : `${group === "week" ? "Week of " : ""}${shortDay(s)}`);
  return (
    <div className="hqa-plot" ref={box} onPointerMove={(e) => setHover(at(e.clientX))} onPointerDown={(e) => setHover(at(e.clientX))} onPointerLeave={() => setHover(null)}>
      {!days.length || !keys.length ? (
        <p className="mono dim hqa-empty">{keys.length ? "No days in this range" : "Every line is switched off"}</p>
      ) : (
        <svg width={w} height={H} role="img" aria-label={`${keys.map(label).join(", ")} per ${group}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={w - R} y1={y(t)} y2={y(t)} className="hqa-grid" />
              <text x={L - 8} y={y(t) + 4} className="hqa-tick" textAnchor="end">{fmt(t)}</text>
            </g>
          ))}
          {days.map((d, i) => (i % every === 0 || i === days.length - 1 ? <text key={d.day} x={x(i)} y={H - 8} className="hqa-tick" textAnchor="middle">{shortDay(d.day)}</text> : null))}
          {keys.map((k) => <path key={k} d={path(k)} fill="none" stroke={colorOf(k)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
          {/* short ranges: a dot per value (with a surface ring) so single days are visible */}
          {days.length <= 45 && keys.map((k) => days.map((d, i) => (d[k] == null ? null : <circle key={`${k}${i}`} cx={x(i)} cy={y(Number(d[k]))} r={hover === i ? 4.5 : 2.5} fill={colorOf(k)} stroke="#0b0f14" strokeWidth={2} />)))}
          {h && hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ph} className="hqa-cross" />}
        </svg>
      )}
      {h && hover != null && (
        <div className="hqa-tip" style={{ "--x": `${Math.min(w - 190, Math.max(0, x(hover) + 12))}px` } as CSSProperties}>
          <b>{dayName(h.day)}</b>
          {keys.map((k) => (
            <div key={k}><i style={{ background: colorOf(k) }} />{label(k)}<span>{h[k] == null ? "—" : fmt(Number(h[k]))}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

/** a round top for the axis (1, 2, 2.5 or 5 × 10ⁿ) */
function nice(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
