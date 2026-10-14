"use client";
import { useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/lib/client";
import type { RouteLine } from "./Earth";
import { country, flag, n } from "./fmt";

// HQ History: permanent totals from Supabase (supabase/migrations/003_history.sql) for any date range,
// with filters for kind, country and search, and every transfer route (all time or in the range).

type Row = { visits: number; uploads: number; downloads: number; bytes_up: number; bytes_down: number };
export type HistoryData = {
  totals: Row & { countries: number };
  days: (Row & { day: string })[];
  countries: (Row & { country: string; active_days: number })[];
  cities: { country: string | null; city: string; visits: number; uploads: number; downloads: number; bytes: number }[];
  devices: { label: string; uploads: number; downloads: number }[];
  routes: { from_cc: string; from_city: string; to_cc: string; to_city: string; from_lat: number | null; from_lon: number | null; to_lat: number | null; to_lon: number | null; n: number; bytes: number; first_at: string; last_at: string }[];
  events: { kind: string; label: string | null; country: string | null; city: string | null; bytes: number | null; at: string }[];
};

const RANGES = [
  { id: "today", label: "Today", days: 0 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "1y", label: "1 year", days: 365 },
  { id: "all", label: "All time", days: -1 },
  { id: "custom", label: "Custom", days: -2 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const dayStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const place = (cc: string | null, city: string | null) => (city ? `${city}, ${country(cc)}` : country(cc));

export function routeLines(routes: HistoryData["routes"]): RouteLine[] {
  return routes
    .filter((r) => r.from_lat != null && r.from_lon != null && r.to_lat != null && r.to_lon != null)
    .map((r) => ({ a: r.from_lat!, b: r.from_lon!, c: r.to_lat!, d: r.to_lon!, n: r.n }));
}

export async function loadHistory(from: string | null, to: string | null): Promise<HistoryData | "setup" | null> {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const r = await fetch(`/api/admin/history?${q}`, { cache: "no-store" }).catch(() => null);
  if (!r) return null;
  if (r.status === 501) return "setup";
  return r.ok ? r.json() : null;
}

export default function History({ onRoutes }: { onRoutes: (lines: RouteLine[], label: string) => void }) {
  const [range, setRange] = useState<RangeId>("30d");
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [data, setData] = useState<HistoryData | "setup" | null>(null);
  const [busy, setBusy] = useState(false);
  const [cc, setCc] = useState("");
  const [kind, setKind] = useState<"" | "upload" | "download" | "visit">("");
  const [q, setQ] = useState("");
  const [sortC, setSortC] = useState<keyof Row>("uploads");
  const [sameOnly, setSameOnly] = useState(false);

  const span = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!;
    if (r.days === -1) return { from: null, to: null };
    // custom: whole days, inclusive (to = the last millisecond of the chosen end day)
    if (r.days === -2) return { from: from ? new Date(from).toISOString() : null, to: to ? new Date(Date.parse(to) + 86_400_000 - 1).toISOString() : null };
    const start = dayStart(new Date(Date.now() - r.days * 86_400_000));
    return { from: start.toISOString(), to: null };
  }, [range, from, to]);

  useEffect(() => {
    let live = true;
    setBusy(true);
    loadHistory(span.from, span.to).then((d) => {
      if (!live) return;
      setData(d);
      setBusy(false);
    });
    return () => {
      live = false;
    };
  }, [span]);

  if (data === "setup")
    return (
      <div className="hq-setup">
        <b>One step left: switch on permanent history</b>
        <p>The database is missing the history functions (<code>supabase/migrations/003_history.sql</code>). Run that file once in Supabase → SQL Editor.</p>
      </div>
    );

  const d = data && typeof data === "object" ? data : null;
  const has = (c: string | null) => !cc || (c ?? "??") === cc;
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const countries = (d?.countries ?? []).filter((c) => has(c.country) && match(country(c.country))).sort((a, b) => Number(b[sortC]) - Number(a[sortC]));
  const routes = (d?.routes ?? []).filter((r) => (!cc || r.from_cc === cc || r.to_cc === cc) && match(`${place(r.from_cc, r.from_city)} ${place(r.to_cc, r.to_city)}`) && (!sameOnly || (r.from_cc === r.to_cc && r.from_city === r.to_city)));
  const cities = (d?.cities ?? []).filter((c) => has(c.country) && match(`${c.city} ${country(c.country)}`));
  const events = (d?.events ?? []).filter((e) => has(e.country) && (!kind || e.kind === kind) && match(`${e.label ?? ""} ${e.city ?? ""} ${country(e.country)}`));
  const days = d?.days ?? [];
  const maxDay = Math.max(1, ...days.map((x) => x.uploads + x.downloads + x.visits));
  const sel = cc ? d?.countries.find((c) => c.country === cc) : null;
  const tot = sel ?? d?.totals;
  const rangeLabel = RANGES.find((x) => x.id === range)!.label;
  const allCc = (d?.countries ?? []).map((c) => c.country).sort((a, b) => country(a).localeCompare(country(b)));

  return (
    <>
      <div className="hq-filters">
        <div className="hq-seg" role="group" aria-label="Range">
          {RANGES.map((r) => <button key={r.id} className={range === r.id ? "on" : ""} onClick={() => setRange(r.id)}>{r.label}</button>)}
        </div>
        {range === "custom" && (
          <>
            <input className="hq-input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
            <input className="hq-input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To" />
          </>
        )}
        <select className="hq-input" value={cc} onChange={(e) => setCc(e.target.value)}>
          <option value="">All countries</option>
          {allCc.map((c) => <option key={c} value={c}>{flag(c)} {country(c)}</option>)}
        </select>
        <input className="hq-input" placeholder="Search place, device" value={q} onChange={(e) => setQ(e.target.value)} />
        {(cc || q || kind) && <button className="pill" onClick={() => (setCc(""), setQ(""), setKind(""))}>Clear</button>}
        {busy && <span className="mono dim">Loading…</span>}
      </div>

      {!d && !busy && <p className="mono dim">Couldn&apos;t load history. Try again in a moment.</p>}
      {d && (
        <>
          <div className="hq-tiles hq-tiles-row six">
            <Tile label="Visits" value={n(tot?.visits)} />
            <Tile label="Uploads" value={n(tot?.uploads)} sub={formatBytes(tot?.bytes_up ?? 0)} />
            <Tile label="Downloads" value={n(tot?.downloads)} sub={formatBytes(tot?.bytes_down ?? 0)} />
            <Tile label="Data moved" value={formatBytes((tot?.bytes_up ?? 0) + (tot?.bytes_down ?? 0))} />
            <Tile label="Countries" value={n(cc ? 1 : d.totals.countries)} />
            <Tile label="Routes" value={n(routes.length)} sub={`${n(routes.reduce((a, r) => a + r.n, 0))} transfers`} />
          </div>

          <section className="hq-sec">
            <span className="mono dim">Per day · {rangeLabel}{cc ? ` · totals for all countries` : ""}</span>
            <div className="hq-days">
              {days.map((x) => (
                <div key={x.day} className="hq-col" title={`${x.day} · ${x.visits} visits · ${x.uploads} uploads · ${x.downloads} downloads · ${formatBytes(x.bytes_up + x.bytes_down)}`}>
                  <i className="v" style={{ height: `${(x.visits / maxDay) * 100}%` }} />
                  <i className="u" style={{ height: `${(x.uploads / maxDay) * 100}%` }} />
                  <i className="d" style={{ height: `${(x.downloads / maxDay) * 100}%` }} />
                </div>
              ))}
              {!days.length && <p className="mono dim">No activity in this range</p>}
            </div>
            <div className="hq-legend"><span><i className="v" /> visits</span><span><i className="u" /> uploads</span><span><i className="d" /> downloads</span></div>
          </section>

          <section className="hq-sec">
            <div className="hq-sec-head">
              <span className="mono dim">Transfer routes · {range === "all" ? "all time" : rangeLabel} · sender → receiver</span>
              <label className="hq-check"><input type="checkbox" checked={sameOnly} onChange={(e) => setSameOnly(e.target.checked)} /> Same place only</label>
              <button className="pill" onClick={() => onRoutes(routeLines(routes), `${range === "all" ? "All-time" : rangeLabel} routes${cc ? ` · ${country(cc)}` : ""}`)}>Show these on the globe</button>
            </div>
            <div className="hq-grid-table">
              <div className="hq-gt rt head"><span>From</span><span>To</span><span>Transfers</span><span>Data</span><span>First</span><span>Last</span></div>
              {routes.slice(0, 300).map((r, i) => {
                const same = r.from_cc === r.to_cc && r.from_city === r.to_city;
                return (
                  <div key={i} className="hq-gt rt">
                    <span>{flag(r.from_cc)} {place(r.from_cc, r.from_city)}</span>
                    <span>{flag(r.to_cc)} {same ? <em className="hq-tag">same place</em> : place(r.to_cc, r.to_city)}</span>
                    <span>{n(r.n)}</span><span>{formatBytes(r.bytes)}</span>
                    <span className="mono dim">{new Date(r.first_at).toLocaleDateString()}</span>
                    <span className="mono dim">{new Date(r.last_at).toLocaleDateString()}</span>
                  </div>
                );
              })}
              {!routes.length && <p className="mono dim">No routes yet</p>}
            </div>
          </section>

          <div className="hq-split">
            <section className="hq-sec">
              <div className="hq-sec-head">
                <span className="mono dim">Countries</span>
                <select className="hq-input sm" value={sortC} onChange={(e) => setSortC(e.target.value as keyof Row)}>
                  <option value="uploads">Most uploads</option>
                  <option value="downloads">Most downloads</option>
                  <option value="visits">Most visits</option>
                  <option value="bytes_up">Most data sent</option>
                  <option value="bytes_down">Most data received</option>
                </select>
              </div>
              <div className="hq-grid-table">
                <div className="hq-gt hc head"><span>Country</span><span>Visits</span><span>↑ Up</span><span>↓ Down</span><span>Sent</span><span>Received</span></div>
                {countries.map((c) => (
                  <div key={c.country} className="hq-gt hc hq-click" role="button" tabIndex={0} onClick={() => setCc(c.country === cc ? "" : c.country)}>
                    <span>{flag(c.country)} {country(c.country)}</span><span>{n(c.visits)}</span><span>{n(c.uploads)}</span><span>{n(c.downloads)}</span>
                    <span>{formatBytes(c.bytes_up)}</span><span>{formatBytes(c.bytes_down)}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="hq-sec">
              <span className="mono dim">Cities</span>
              <div className="hq-grid-table">
                <div className="hq-gt hc head"><span>City</span><span>Visits</span><span>↑ Up</span><span>↓ Down</span><span>Data</span><span /></div>
                {cities.slice(0, 200).map((c) => (
                  <div key={`${c.city}-${c.country}`} className="hq-gt hc">
                    <span>{flag(c.country)} {c.city}</span><span>{n(c.visits)}</span><span>{n(c.uploads)}</span><span>{n(c.downloads)}</span><span>{formatBytes(c.bytes)}</span><span />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="hq-split">
            <section className="hq-sec">
              <span className="mono dim">Devices sending and receiving</span>
              <div className="hq-grid-table">
                <div className="hq-gt dv head"><span>Device</span><span>↑ Up</span><span>↓ Down</span></div>
                {(d.devices ?? []).filter((x) => match(x.label)).map((x) => (
                  <div key={x.label} className="hq-gt dv"><span>{x.label}</span><span>{n(x.uploads)}</span><span>{n(x.downloads)}</span></div>
                ))}
              </div>
            </section>
            <section className="hq-sec">
              <div className="hq-sec-head">
                <span className="mono dim">{n(events.length)} events (latest 2,000 · last 30 days kept raw)</span>
                <div className="hq-seg" role="group" aria-label="Kind">
                  {([["", "All"], ["upload", "Up"], ["download", "Down"], ["visit", "Visits"]] as const).map(([k, l]) => (
                    <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="hq-feed tall">
                {events.slice(0, 500).map((e, i) => (
                  <div key={i} className={`hq-ev ${e.kind}`}>
                    <i />
                    <span>{flag(e.country)} {e.city || country(e.country)} · {e.label || "someone"} {e.kind === "visit" ? "arrived" : e.kind === "upload" ? `launched ${formatBytes(e.bytes ?? 0)}` : `received ${formatBytes(e.bytes ?? 0)}`}</span>
                    <time>{new Date(e.at).toLocaleString()}</time>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </>
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
