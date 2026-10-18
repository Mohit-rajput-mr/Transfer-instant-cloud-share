"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatBytes } from "@/lib/client";
import type { Layer, RouteLine } from "./Earth";
import History, { loadHistory, routeLines } from "./History";
import type { AdminSpace, AdminTransfer, AnonSessionRec, Overview } from "./types";
import { country, flag, n } from "./fmt";

// three.js only loads for the admin, never for regular visitors
const Earth = dynamic(() => import("./Earth"), { ssr: false, loading: () => <div className="earth earth-loading mono">Booting globe…</div> });

type Ev = Overview["feed"][number];
const HIST_KEY = "hq:events";
const HIST_MAX = 5000;
const evKey = (e: Ev) => `${e.kind}|${e.at}|${e.label ?? ""}|${e.bytes ?? ""}|${e.city ?? ""}`;
/** Every event HQ has seen (the overview sends only the latest), newest first, remembered on this browser for 30 days. */
function remember(prev: Ev[], feed: Ev[]): Ev[] {
  const seen = new Set(prev.map(evKey));
  const fresh = feed.filter((e) => !seen.has(evKey(e)));
  if (!fresh.length) return prev;
  const cut = Date.now() - 30 * 86_400_000;
  const all = [...fresh, ...prev].filter((e) => Date.parse(e.at) > cut).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, HIST_MAX);
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(all));
  } catch {}
  return all;
}
function recalled(): Ev[] {
  try {
    const v = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Per-country totals: devices and live from sessions, uploads/downloads/visits from the map's event points,
 *  data moved from the event history, objects in orbit right now from the transfers. */
type CountryRow = { cc: string; devices: number; live: number; up: number; down: number; visits: number; bytesUp: number; bytesDown: number; objects: number; inOrbit: number; cities: number };
function countryRows(data: Overview, events: Ev[]): CountryRow[] {
  const m = new Map<string, CountryRow>();
  const row = (cc: string | null | undefined) => {
    const k = cc && /^[A-Z]{2}$/.test(cc) ? cc : "??";
    let r = m.get(k);
    if (!r) m.set(k, (r = { cc: k, devices: 0, live: 0, up: 0, down: 0, visits: 0, bytesUp: 0, bytesDown: 0, objects: 0, inOrbit: 0, cities: 0 }));
    return r;
  };
  for (const c of data.topCountries) Object.assign(row(c.country), { devices: c.devices, live: c.live });
  for (const p of data.points) row(p.cc)[p.k === "upload" ? "up" : "down"] += p.n;
  for (const p of data.visitors) row(p.cc).visits += p.n;
  for (const e of events) {
    if (e.kind === "upload") row(e.country).bytesUp += e.bytes ?? 0;
    if (e.kind === "download") row(e.country).bytesDown += e.bytes ?? 0;
  }
  for (const t of data.transfers) {
    row(t.country).objects++;
    row(t.country).inOrbit += t.size;
  }
  const cities = new Map<string, Set<string>>();
  for (const c of data.cities) (cities.get(c.country) ?? cities.set(c.country, new Set()).get(c.country)!).add(c.city);
  for (const r of m.values()) r.cities = cities.get(r.cc)?.size ?? 0;
  return [...m.values()];
}

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
};

export default function AdminApp() {
  const [auth, setAuth] = useState<"checking" | "locked" | "in">("checking");
  const [data, setData] = useState<Overview | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [events, setEvents] = useState<Ev[]>([]);
  useEffect(() => setEvents(recalled()), []);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/overview", { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401) return setAuth("locked");
    if (r.ok) {
      const d: Overview = await r.json();
      setData(d);
      if (d?.feed?.length) setEvents((prev) => remember(prev.length ? prev : recalled(), d.feed));
      setAuth("in");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // a new deploy reloads HQ by itself, so it never shows an old build
  useEffect(() => {
    let first: string | null = null;
    const check = async () => {
      const v = await fetch("/api/version", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => (d?.build ?? d?.v) as string | undefined).catch(() => undefined);
      if (!v) return;
      if (first === null) first = v;
      else if (v !== first) window.location.reload();
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (auth !== "in") return;
    const t = setInterval(load, 5000);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [auth, load]);

  if (auth === "checking") return <div className="hq-boot mono">Establishing uplink…</div>;
  if (auth === "locked") return <Login onIn={load} />;
  return <Dashboard data={data} events={events} now={now} onRefresh={load} onLogout={() => setAuth("locked")} />;
}

function Login({ onIn }: { onIn: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!pw || busy) return;
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) return onIn();
    setErr((await r?.json().catch(() => null))?.error ?? "Could not reach HQ");
    setPw("");
  };
  return (
    <div className="hq-login">
      <div className="drawer hq-card" role="dialog" aria-label="Admin login">
        <div className="drawer-head">
          <span className="mono dim">Mission HQ · restricted</span>
          <Link href="/" className="x" aria-label="Back">×</Link>
        </div>
        <div className="drawer-body" style={{ gridTemplateColumns: "1fr" }}>
          <div className="col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hq-emblem" src="/brand/emblem.svg" alt="" width={606} height={561} />
            <div className="wide d-title">Identify.</div>
            <div className="field">
              <label><span className="mono">Password</span></label>
              <input className="line-input code-input" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
            {err && <p className="err">{err}</p>}
            <div className="grow" />
            <button className="cta" disabled={!pw || busy} onClick={submit}>{busy ? "Verifying…" : "Enter HQ →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LAYERS: { id: Layer; label: string; dot: string }[] = [
  { id: "live", label: "Live now", dot: "#3dff8c" },
  { id: "exact", label: "Exact · live", dot: "#ff4fd8" },
  { id: "exactSeen", label: "Last GPS seen", dot: "#a0498f" },
  { id: "anon", label: "Anonymous (IP)", dot: "#9a9a9a" },
  { id: "visitors", label: "All visitors", dot: "#ffffff" },
  { id: "uploads", label: "Uploads", dot: "#59b8ff" },
  { id: "downloads", label: "Downloads", dot: "#ffa045" },
  { id: "routes", label: "Transfer routes", dot: "linear-gradient(90deg,#59b8ff,#ffa045)" },
];

type Expand = "history" | "anon" | "activity" | "countries" | "objects" | "containers" | "cities" | "spaces" | null;

function Dashboard({ data, events, now, onRefresh, onLogout }: { data: Overview | null; events: Ev[]; now: number; onRefresh: () => void; onLogout: () => void }) {
  const [layers, setLayers] = useState<Set<Layer>>(new Set(["live", "exact", "exactSeen", "anon", "visitors", "uploads", "downloads", "routes"]));
  const [expand, setExpand] = useState<Expand>(null);
  // a click on a country anywhere opens Activity filtered to it
  const [focusCc, setFocusCc] = useState("");
  const openCountry = (cc: string) => {
    setFocusCc(cc);
    setExpand("activity");
  };
  const [spaces, setSpaces] = useState<AdminSpace[] | null>(null);
  useEffect(() => {
    const get = () => fetch("/api/admin/spaces", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setSpaces(d.spaces)).catch(() => {});
    get();
    const t = setInterval(get, 20_000);
    return () => clearInterval(t);
  }, []);
  const [spin, setSpin] = useState(true);
  // routes on the globe: the live ones, or a set picked in History (all time by default)
  const [hist, setHist] = useState<{ lines: RouteLine[]; label: string } | null>(null);
  const routesLoaded = useRef(false);
  const allTime = async (quiet = false) => {
    if (hist && !quiet) return setHist(null);
    const d = await loadHistory(null, null);
    if (d && typeof d === "object") {
      // a background refresh only updates the all-time view (or opens it the first time); it never
      // replaces a set picked in History or brings back routes you closed
      const first = !routesLoaded.current;
      routesLoaded.current = true;
      setHist((h) => (quiet && !first && h?.label !== "All-time routes" ? h : { lines: routeLines(d.routes), label: "All-time routes" }));
    }
    else if (!quiet) alert(d === "setup" ? "Run supabase/migrations/003_history.sql in Supabase first (see History)." : "Couldn't load routes.");
  };
  // the globe opens on every route ever (the live view only has the last 24 h), refreshed every 2 min
  useEffect(() => {
    void allTime(true);
    const t = setInterval(() => document.visibilityState === "visible" && void allTime(true), 120_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggle = (l: Layer) => setLayers((s) => {
    const x = new Set(s);
    if (x.has(l)) x.delete(l);
    else x.add(l);
    return x;
  });
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    onLogout();
  };
  const destroy = async (id: string | string[]) => {
    const ids = Array.isArray(id) ? id : [id];
    if (!confirm(ids.length > 1 ? `Destroy all ${ids.length} objects for everyone?` : "Destroy this object for everyone?")) return;
    await Promise.all(ids.map((x) => fetch(`/api/admin/transfers/${x}`, { method: "DELETE" }).catch(() => {})));
    onRefresh();
  };

  const today = data?.today ?? {};
  const cloudIds = useMemo(() => new Set(data?.cloud?.ids ?? []), [data]);
  const cByCc = useMemo(() => new Map((data ? countryRows(data, events) : []).map((r) => [r.cc, r])), [data, events]);
  const maxCountry = Math.max(1, ...(data?.topCountries.map((c) => c.devices) ?? [1]));

  return (
    <div className="hq">
      <header className="hq-top">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.svg" alt="Orbi Transfer" width={194} height={28} />
          <span className="brand-by">Mission HQ</span>
        </Link>
        <nav className="hq-tabs" aria-label="HQ sections">
          <button className={!expand ? "on" : ""} onClick={() => setExpand(null)}>Globe</button>
          <button className={expand === "history" ? "on" : ""} onClick={() => setExpand("history")}>History</button>
          <button className={expand === "activity" ? "on" : ""} onClick={() => (setFocusCc(""), setExpand("activity"))}>Activity</button>
          <button className={expand === "countries" ? "on" : ""} onClick={() => setExpand("countries")}>Countries <b>{data?.topCountries.length ?? 0}</b></button>
          <button className={expand === "objects" ? "on" : ""} onClick={() => setExpand("objects")}>Objects <b>{data?.transfers.length ?? 0}</b></button>
          <button className={expand === "containers" ? "on" : ""} onClick={() => setExpand("containers")}>Containers <b>{containers(data?.transfers ?? []).length}</b></button>
          <button className={expand === "spaces" ? "on" : ""} onClick={() => setExpand("spaces")}>Spaces <b>{spaces?.length ?? 0}</b></button>
          <button className={expand === "cities" ? "on" : ""} onClick={() => setExpand("cities")}>Places</button>
          <button className={expand === "anon" ? "on" : ""} onClick={() => setExpand("anon")}>Anonymous <b>{data?.anonSessions?.length ?? 0}</b></button>
        </nav>
        <span className="live"><span className="dot" /><b>{n(data?.online)}</b> online now</span>
        <span className="mono dim hq-clock">{new Date(now).toLocaleTimeString()}</span>
        <button
          className="pill"
          title="Mint a Pro code: tasks made on a device holding it stay up to 8 hours"
          onClick={async () => {
            const d = await fetch("/api/admin/pro", { method: "POST" }).then((r) => r.json()).catch(() => null);
            if (!d?.code) return;
            await navigator.clipboard.writeText(d.code).catch(() => {});
            window.prompt("Pro code (copied). Give it to a member: tasks stay up to 8 hours.", d.code);
          }}
        >
          Pro code
        </button>
        <button className="pill" onClick={logout}>Lock</button>
      </header>

      <main className="hq-main">
        <section className="hq-globe">
          <Earth data={data} layers={layers} spin={spin} routes={hist?.lines ?? null} />
          <div className="hq-globe-title">
            <span className="mono dim">Universe view</span>
            <div className="wide">{n(data?.online)} <small>live</small></div>
            <span className="mono dim">{n(data?.devices)} devices · {n(data?.countries)} countries all-time</span>
          </div>
          <div className="hq-layers">
            {LAYERS.map((l) => (
              <button key={l.id} className={`chip${layers.has(l.id) ? " on" : ""}`} onClick={() => toggle(l.id)}>
                <i style={{ background: l.dot }} />{l.label}
              </button>
            ))}
            <button className={`chip${spin ? " on" : ""}`} onClick={() => setSpin((s) => !s)}>⟳ Auto-spin</button>
            <button className={`chip${hist ? " on" : ""}`} onClick={() => allTime()} title="Routes on the globe: every route ever, or only the last 24 hours">{hist ? `${hist.label} · ${hist.lines.length} ✕` : "Last 24 h routes · show all time"}</button>
          </div>
          <p className="hq-hint mono">Drag to rotate · scroll to zoom to street level · right-drag to tilt · hover a dot</p>
        </section>

        <aside className="hq-side">
          <div className="hq-tiles">
            <Tile label="Online now" value={n(data?.online)} accent="live" />
            <Tile label="Objects in orbit" value={n(data?.orbit.objects)} sub={`${formatBytes(data?.orbit.bytes ?? 0)} · ${n(data?.orbit.uploading)} uploading`} />
            <Tile label="Uploads today" value={n(today.uploads)} sub={formatBytes(today.bytes_up ?? 0)} />
            <Tile label="Downloads today" value={n(today.downloads)} sub={formatBytes(today.bytes_down ?? 0)} />
            <Tile label="Devices all-time" value={n(data?.devices)} sub={`${n(data?.visits)} visits`} />
            <Tile label="Spaces" value={n(spaces?.length)} sub={`${n(spaces?.filter((x) => x.priv).length)} private · ${n(spaces?.reduce((a, x) => a + x.members.length, 0))} members`} />
            <Tile label="Open objects now" value={n(data?.transfers.filter((t) => t.open).length)} sub={`${n(data?.transfers.filter((t) => !t.open).length)} with passcode`} />
            <Tile label="Saved in cloud now" value={n(data?.cloud?.ids.length)} sub={`${formatBytes(data?.cloud?.bytes ?? 0)} · today ${n(data?.cloud?.today.copies)} (${formatBytes(data?.cloud?.today.bytes ?? 0)})`} />
            <Tile label="Containers now" value={n(containers(data?.transfers ?? []).length)} sub={`${n(containers(data?.transfers ?? []).reduce((a, c) => a + c.items.length, 0))} objects inside`} />
            <Tile label="In spaces now" value={n(data?.transfers.filter((t) => t.space).length)} sub={`${n(data?.transfers.filter((t) => !t.space).length)} in the public void`} />
            <Tile label="Data moved all-time" value={formatBytes((data?.totals.bytes_up ?? 0) + (data?.totals.bytes_down ?? 0))} sub={`${n(data?.totals.uploads)} up · ${n(data?.totals.downloads)} down`} />
          </div>

          <Panel title="Spaces" right={`${spaces?.length ?? "…"}`} onExpand={() => setExpand("spaces")}>
            <div className="hq-list">
              {spaces?.length ? spaces.slice(0, 6).map((sp) => (
                <div key={sp.slug} className="hq-row short">
                  <span className="hq-flag">{sp.priv ? "🔒" : "◎"}</span>
                  <span className="hq-name">{sp.title} <span className="mono dim">· {data?.transfers.filter((t) => t.space === sp.slug).length ?? 0} objects</span></span>
                  <b>{sp.members.length}</b>
                </div>
              )) : <Empty />}
            </div>
          </Panel>

          <Panel title="Last 24 hours">
            <Hourly data={data} />
          </Panel>

          <Panel title="Countries" right={`${n(data?.countries)} total`} onExpand={() => setExpand("countries")}>
            <div className="hq-list">
              {data?.topCountries.length ? data.topCountries.map((c) => (
                <div key={c.country} className="hq-row hq-click" role="button" tabIndex={0} onClick={() => openCountry(c.country)} title="Show this country's activity">
                  <span className="hq-flag">{flag(c.country)}</span>
                  <span className="hq-name">{country(c.country)} <span className="mono dim">· ↑{n(cByCc.get(c.country)?.up)} ↓{n(cByCc.get(c.country)?.down)}</span></span>
                  <span className="hq-live">{c.live > 0 ? `● ${c.live}` : ""}</span>
                  <span className="hq-bar"><i style={{ width: `${(c.devices / maxCountry) * 100}%` }} /></span>
                  <b>{n(c.devices)}</b>
                </div>
              )) : <Empty />}
            </div>
          </Panel>

          <Panel title="Top cities" onExpand={() => setExpand("cities")}>
            <div className="hq-list">
              {data?.cities.length ? data.cities.map((c) => (
                <div key={`${c.city}-${c.country}`} className="hq-row short">
                  <span className="hq-flag">{flag(c.country)}</span>
                  <span className="hq-name">{c.city}</span>
                  <b>{n(c.n)}</b>
                </div>
              )) : <Empty />}
            </div>
          </Panel>

          <Panel title="Devices">
            <Breakdown title="Browser" map={data?.browsers} />
            <Breakdown title="OS" map={data?.os} />
            <Breakdown title="Form" map={data?.forms} />
          </Panel>

          <Panel title="Live feed" right={`${n(events.length)} kept`} onExpand={() => (setFocusCc(""), setExpand("activity"))}>
            <div className="hq-feed">
              {data?.feed.length ? data.feed.map((e, i) => (
                <div key={i} className={`hq-ev ${e.kind}`}>
                  <i />
                  <span>{flag(e.country)} {e.city || country(e.country)} · {e.label || "someone"} {e.kind === "visit" ? "arrived" : e.kind === "upload" ? `launched ${formatBytes(e.bytes ?? 0)}` : `received ${formatBytes(e.bytes ?? 0)}`}</span>
                  <time>{ago(e.at, now)}</time>
                </div>
              )) : <Empty />}
            </div>
          </Panel>

          <Panel title="Objects in orbit" right={`${data?.transfers.length ?? 0}`} onExpand={() => setExpand("objects")}>
            <div className="hq-table">
              {data?.transfers.length ? data.transfers.map((t) => (
                <div key={t.id} className="hq-tr">
                  <div>
                    <b>{t.name}{t.space ? <span className="hq-tag">◎ {t.space}{t.by ? ` · ${t.by}` : ""}</span> : null}{t.open ? <span className="hq-tag open">open</span> : null}{cloudIds.has(t.id) ? <span className="hq-tag cloud">cloud</span> : null}</b>
                    <span className="mono dim">{t.id} · {formatBytes(t.size)} · {t.status} · {flag(t.country)} {t.city || ""}</span>
                    <span className="mono dim">👁 {t.views} · ↓ {t.downloads} · ● {t.watchers} live · ✕ {t.failed} wrong{t.reports ? ` · ⚑ ${t.reports}` : ""} · burns in {Math.max(0, Math.round((new Date(t.expiresAt).getTime() - now) / 60000))}m</span>
                  </div>
                  <button className="danger-btn" onClick={() => destroy(t.id)}>Destroy</button>
                </div>
              )) : <Empty />}
            </div>
          </Panel>
        </aside>
      </main>
      {expand === "history" && (
        <div className="hq-expand" role="dialog" aria-label="History">
          <div className="hq-expand-head">
            <b className="wide">History</b>
            <button className="pill" onClick={() => setExpand(null)}>Close ✕</button>
          </div>
          <History onRoutes={(lines, label) => {
            setHist({ lines, label });
            setLayers((s) => new Set([...s, "routes"]));
            setExpand(null);
          }} />
        </div>
      )}
      {expand === "anon" && (
        <div className="hq-expand" role="dialog" aria-label="Anonymous sessions">
          <div className="hq-expand-head">
            <b className="wide">Anonymous sessions</b>
            <button className="pill" onClick={() => setExpand(null)}>Close ✕</button>
          </div>
          <AnonSessions list={data?.anonSessions ?? []} />
        </div>
      )}
      {expand && expand !== "history" && expand !== "anon" && data && <Expanded kind={expand} data={data} events={events} focusCc={focusCc} onCountry={openCountry} spaces={spaces ?? []} now={now} onClose={() => setExpand(null)} onDestroy={destroy} />}
    </div>
  );
}

/** Objects one device sent together, as a named container (2+ items, same sender, same name). */
type Container = { key: string; name: string; from: string; items: AdminTransfer[] };
function containers(T: AdminTransfer[]): Container[] {
  const m = new Map<string, Container>();
  for (const t of T) {
    if (!t.from) continue;
    const key = `${t.from}|${t.groupName ?? ""}|${t.space ?? ""}`;
    let c = m.get(key);
    if (!c) m.set(key, (c = { key, name: t.groupName || "Unnamed container", from: t.from, items: [] }));
    c.items.push(t);
  }
  return [...m.values()].filter((c) => c.items.length > 1).sort((a, b) => b.items.length - a.items.length);
}

const WINDOWS = [
  { id: "15m", label: "Last 15 min", ms: 15 * 60_000 },
  { id: "1h", label: "Last hour", ms: 3_600_000 },
  { id: "24h", label: "Last 24 h", ms: 86_400_000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 86_400_000 },
  { id: "all", label: "Everything kept", ms: Infinity },
] as const;
const SIZES = [
  { id: "", label: "Any size", min: 0, max: Infinity },
  { id: "s", label: "Under 10 MB", min: 0, max: 10 << 20 },
  { id: "m", label: "10 – 100 MB", min: 10 << 20, max: 100 << 20 },
  { id: "l", label: "100 MB – 1 GB", min: 100 << 20, max: 1 << 30 },
  { id: "xl", label: "Over 1 GB", min: 1 << 30, max: Infinity },
] as const;

/** Full-screen detail for one panel, with filters. */
function Expanded({ kind, data, events, focusCc, onCountry, spaces, now, onClose, onDestroy }: { kind: Exclude<Expand, null>; data: Overview; events: Ev[]; focusCc: string; onCountry: (cc: string) => void; spaces: AdminSpace[]; now: number; onClose: () => void; onDestroy: (id: string | string[]) => void }) {
  const [q, setQ] = useState("");
  const [cc, setCc] = useState(focusCc);
  useEffect(() => setCc(focusCc), [focusCc, kind]);
  const [evKind, setEvKind] = useState<"" | "upload" | "download" | "visit">("");
  const [win, setWin] = useState<(typeof WINDOWS)[number]["id"]>("24h");
  const [size, setSize] = useState<(typeof SIZES)[number]["id"]>("");
  const [box, setBox] = useState("");
  const [sort, setSort] = useState<"new" | "big" | "down" | "views" | "burn">("new");
  const [where, setWhere] = useState<"" | "cloud" | "device">("");
  const inCloud = new Set(data.cloud?.ids ?? []);
  const [cSort, setCSort] = useState<keyof CountryRow>("devices");
  const [city, setCity] = useState("");
  const [space, setSpace] = useState("");
  const [access, setAccess] = useState<"" | "open" | "locked">("");
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const T = data.transfers;
  const countries = [...new Set(T.map((t) => t.country).filter(Boolean))] as string[];
  const citiesIn = [...new Set(T.filter((t) => !cc || t.country === cc).map((t) => t.city).filter(Boolean))] as string[];
  const boxes = containers(T);
  const sz = SIZES.find((x) => x.id === size)!;
  const inBox = box ? new Set(boxes.find((b) => b.key === box)?.items.map((t) => t.id)) : null;
  const rows = T.filter((t: AdminTransfer) =>
    (!q || `${t.name} ${t.id} ${t.by ?? ""} ${t.fileName} ${t.groupName ?? ""}`.toLowerCase().includes(q.toLowerCase())) &&
    (!cc || t.country === cc) && (!city || t.city === city) &&
    (!space || (space === "public" ? !t.space : t.space === space)) &&
    (!access || (access === "open" ? t.open : !t.open)) &&
    t.size >= sz.min && t.size < sz.max &&
    (!where || (where === "cloud" ? inCloud.has(t.id) : !inCloud.has(t.id))) &&
    (!inBox || inBox.has(t.id))).sort((a, b) =>
    sort === "big" ? b.size - a.size : sort === "down" ? b.downloads - a.downloads : sort === "views" ? b.views - a.views
      : sort === "burn" ? Date.parse(a.expiresAt) - Date.parse(b.expiresAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt));

  // activity: every kept event, filtered
  const winMs = WINDOWS.find((w) => w.id === win)!.ms;
  const evCountries = [...new Set(events.map((e) => e.country).filter(Boolean))] as string[];
  const evCities = [...new Set(events.filter((e) => !cc || e.country === cc).map((e) => e.city).filter(Boolean))] as string[];
  const evRows = events.filter((e) =>
    now - Date.parse(e.at) <= winMs && (!evKind || e.kind === evKind) && (!cc || e.country === cc) && (!city || e.city === city) &&
    (!q || `${e.label ?? ""} ${e.city ?? ""} ${country(e.country)}`.toLowerCase().includes(q.toLowerCase())));
  const evBy = (k: string) => evRows.filter((e) => e.kind === k);
  // the same events per country, for the summary table above the list
  const evPerCc = Object.values(evRows.reduce<Record<string, { cc: string | null; up: number; down: number; visit: number; bu: number; bd: number }>>((m, e) => {
    const k = e.country ?? "??";
    m[k] ??= { cc: e.country, up: 0, down: 0, visit: 0, bu: 0, bd: 0 };
    if (e.kind === "upload") {
      m[k].up++;
      m[k].bu += e.bytes ?? 0;
    } else if (e.kind === "download") {
      m[k].down++;
      m[k].bd += e.bytes ?? 0;
    } else m[k].visit++;
    return m;
  }, {})).sort((a, b) => b.up + b.down + b.visit - (a.up + a.down + a.visit));

  const cRows = countryRows(data, events).filter((r) => !q || country(r.cc).toLowerCase().includes(q.toLowerCase()) || r.cc.toLowerCase() === q.toLowerCase())
    .sort((a, b) => (Number(b[cSort]) || 0) - (Number(a[cSort]) || 0));
  const cTot = cRows.reduce((t, r) => ({ up: t.up + r.up, down: t.down + r.down, visits: t.visits + r.visits, devices: t.devices + r.devices }), { up: 0, down: 0, visits: 0, devices: 0 });
  const bytes = rows.reduce((a, t) => a + t.size, 0);
  // data in orbit by place
  const byCity = Object.values(T.reduce<Record<string, { key: string; cc: string | null; city: string; n: number; bytes: number; down: number }>>((m, t) => {
    const key = `${t.city ?? "?"}|${t.country ?? "?"}`;
    m[key] ??= { key, cc: t.country, city: t.city || "Unknown", n: 0, bytes: 0, down: 0 };
    m[key].n++;
    m[key].bytes += t.size;
    m[key].down += t.downloads;
    return m;
  }, {})).sort((a, b) => b.bytes - a.bytes);
  const maxB = Math.max(1, ...byCity.map((c) => c.bytes));
  return (
    <div className="hq-expand" role="dialog" aria-label="Details">
      <div className="hq-expand-head">
        <b className="wide">{({ history: "History", activity: "Activity", countries: "Countries", objects: "Objects in orbit", containers: "Containers", cities: "Places", spaces: "Spaces", anon: "Anonymous" } as const)[kind]}</b>
        <button className="pill" onClick={onClose}>Close ✕</button>
      </div>
      {kind === "objects" && (
        <>
          <div className="hq-filters">
            <input className="hq-input" placeholder="Search name, id, sender" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="hq-input" value={cc} onChange={(e) => (setCc(e.target.value), setCity(""))}>
              <option value="">All countries</option>
              {countries.map((c) => <option key={c} value={c}>{flag(c)} {country(c)}</option>)}
            </select>
            <select className="hq-input" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {citiesIn.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="hq-input" value={space} onChange={(e) => setSpace(e.target.value)}>
              <option value="">Everywhere</option>
              <option value="public">Public void</option>
              {spaces.map((s) => <option key={s.slug} value={s.slug}>◎ {s.title}</option>)}
            </select>
            <select className="hq-input" value={access} onChange={(e) => setAccess(e.target.value as typeof access)}>
              <option value="">Open + locked</option>
              <option value="open">Open only</option>
              <option value="locked">Passcode only</option>
            </select>
            <select className="hq-input" value={size} onChange={(e) => setSize(e.target.value as typeof size)}>
              {SIZES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            <select className="hq-input" value={box} onChange={(e) => setBox(e.target.value)}>
              <option value="">Any container</option>
              {boxes.map((b) => <option key={b.key} value={b.key}>▣ {b.name} ({b.items.length})</option>)}
            </select>
            <select className="hq-input" value={where} onChange={(e) => setWhere(e.target.value as typeof where)}>
              <option value="">Cloud + device only</option>
              <option value="cloud">Saved in cloud</option>
              <option value="device">Only on the sender&apos;s device</option>
            </select>
            <select className="hq-input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="new">Newest first</option>
              <option value="big">Largest first</option>
              <option value="down">Most downloaded</option>
              <option value="views">Most viewed</option>
              <option value="burn">Burning soonest</option>
            </select>
            {(q || cc || city || space || access || size || box || where) && <button className="pill" onClick={() => (setQ(""), setCc(""), setCity(""), setSpace(""), setAccess(""), setSize(""), setBox(""), setWhere(""))}>Clear</button>}
          </div>
          <p className="mono dim hq-sum">{rows.length} objects · {formatBytes(bytes)} · {rows.reduce((a, t) => a + t.downloads, 0)} downloads · {rows.reduce((a, t) => a + t.watchers, 0)} watching now</p>
          <div className="hq-grid-table">
            <div className="hq-gt head"><span>Name</span><span>Where</span><span>Space · container</span><span>Size</span><span>Views</span><span>Down</span><span>Live</span><span>Burns</span><span /></div>
            {rows.map((t) => (
              <div key={t.id} className="hq-gt">
                <span><b>{t.name}</b><small className="mono dim">{t.id} · {t.open ? "open" : "passcode"} · {inCloud.has(t.id) ? "in cloud" : "device only"} · {t.status}</small></span>
                <span>{flag(t.country)} {t.city || country(t.country)}</span>
                <span>{t.space ? `◎ ${t.space}${t.by ? ` · ${t.by}` : ""}` : "public"}{t.groupName ? <small className="mono dim">▣ {t.groupName}</small> : null}</span>
                <span>{formatBytes(t.size)}</span>
                <span>{t.views}</span>
                <span>{t.downloads}</span>
                <span>{t.watchers}</span>
                <span>{Math.max(0, Math.round((new Date(t.expiresAt).getTime() - now) / 60000))}m</span>
                <span><button className="danger-btn" onClick={() => onDestroy(t.id)}>Destroy</button></span>
              </div>
            ))}
            {!rows.length && <Empty />}
          </div>
        </>
      )}
      {kind === "activity" && (
        <>
          <div className="hq-filters">
            <div className="hq-seg" role="group" aria-label="Kind">
              {([["", "All"], ["upload", "↑ Uploads"], ["download", "↓ Downloads"], ["visit", "Visits"]] as const).map(([k, l]) => (
                <button key={k} className={evKind === k ? "on" : ""} onClick={() => setEvKind(k)}>{l}</button>
              ))}
            </div>
            <select className="hq-input" value={win} onChange={(e) => setWin(e.target.value as typeof win)}>
              {WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
            </select>
            <select className="hq-input" value={cc} onChange={(e) => (setCc(e.target.value), setCity(""))}>
              <option value="">All countries</option>
              {evCountries.sort((a, b) => country(a).localeCompare(country(b))).map((c) => <option key={c} value={c}>{flag(c)} {country(c)}</option>)}
            </select>
            <select className="hq-input" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {evCities.sort().map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="hq-input" placeholder="Search device, city" value={q} onChange={(e) => setQ(e.target.value)} />
            {(q || cc || city || evKind) && <button className="pill" onClick={() => (setQ(""), setCc(""), setCity(""), setEvKind(""))}>Clear</button>}
          </div>
          <div className="hq-tiles hq-tiles-row">
            <Tile label="Uploads" value={n(evBy("upload").length)} sub={formatBytes(evBy("upload").reduce((a, e) => a + (e.bytes ?? 0), 0))} />
            <Tile label="Downloads" value={n(evBy("download").length)} sub={formatBytes(evBy("download").reduce((a, e) => a + (e.bytes ?? 0), 0))} />
            <Tile label="Visits" value={n(evBy("visit").length)} />
            <Tile label="Countries" value={n(evPerCc.length)} sub={`${n(new Set(evRows.map((e) => e.city).filter(Boolean)).size)} cities`} />
          </div>
          <div className="hq-split">
            <section>
              <span className="mono dim">By country</span>
              <div className="hq-grid-table">
                <div className="hq-gt cc head"><span>Country</span><span>↑ Up</span><span>↓ Down</span><span>Visits</span><span>Data up</span><span>Data down</span></div>
                {evPerCc.map((r) => (
                  <div key={r.cc ?? "?"} className="hq-gt cc hq-click" role="button" tabIndex={0} onClick={() => (setCc(r.cc ?? ""), setCity(""))}>
                    <span>{flag(r.cc)} {country(r.cc)}</span><span>{n(r.up)}</span><span>{n(r.down)}</span><span>{n(r.visit)}</span><span>{formatBytes(r.bu)}</span><span>{formatBytes(r.bd)}</span>
                  </div>
                ))}
                {!evPerCc.length && <Empty />}
              </div>
            </section>
            <section>
              <span className="mono dim">{n(evRows.length)} events</span>
              <div className="hq-feed tall">
                {evRows.slice(0, 400).map((e, i) => (
                  <div key={i} className={`hq-ev ${e.kind}`}>
                    <i />
                    <span>{flag(e.country)} {e.city || country(e.country)} · {e.label || "someone"} {e.kind === "visit" ? "arrived" : e.kind === "upload" ? `launched ${formatBytes(e.bytes ?? 0)}` : `received ${formatBytes(e.bytes ?? 0)}`}</span>
                    <time title={new Date(e.at).toLocaleString()}>{ago(e.at, now)}</time>
                  </div>
                ))}
                {!evRows.length && <Empty />}
              </div>
            </section>
          </div>
          <p className="mono dim hq-sum">Events are kept on this browser for 30 days from the moment HQ first sees them; keep HQ open to collect more.</p>
        </>
      )}
      {kind === "countries" && (
        <>
          <div className="hq-filters">
            <input className="hq-input" placeholder="Find a country" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="hq-input" value={cSort} onChange={(e) => setCSort(e.target.value as keyof CountryRow)}>
              <option value="devices">Most devices</option>
              <option value="live">Most live now</option>
              <option value="up">Most uploads</option>
              <option value="down">Most downloads</option>
              <option value="visits">Most visits</option>
              <option value="bytesUp">Most data sent</option>
              <option value="bytesDown">Most data received</option>
              <option value="inOrbit">Most in orbit now</option>
            </select>
          </div>
          <p className="mono dim hq-sum">{cRows.length} countries · {n(cTot.devices)} devices · ↑{n(cTot.up)} uploads · ↓{n(cTot.down)} downloads · {n(cTot.visits)} visits · click a row for its activity</p>
          <div className="hq-grid-table">
            <div className="hq-gt ct head"><span>Country</span><span>Live</span><span>Devices</span><span>Visits</span><span>↑ Uploads</span><span>↓ Downloads</span><span>Data up</span><span>Data down</span><span>In orbit now</span><span>Cities</span></div>
            {cRows.map((r) => (
              <div key={r.cc} className="hq-gt ct hq-click" role="button" tabIndex={0} onClick={() => onCountry(r.cc)}>
                <span>{flag(r.cc === "??" ? null : r.cc)} {r.cc === "??" ? "Unknown" : country(r.cc)}</span>
                <span className={r.live ? "hq-live" : "dim"}>{r.live ? `● ${r.live}` : "0"}</span>
                <span>{n(r.devices)}</span><span>{n(r.visits)}</span><span>{n(r.up)}</span><span>{n(r.down)}</span>
                <span>{formatBytes(r.bytesUp)}</span><span>{formatBytes(r.bytesDown)}</span>
                <span>{r.objects ? `${r.objects} · ${formatBytes(r.inOrbit)}` : "—"}</span><span>{r.cities || "—"}</span>
              </div>
            ))}
            {!cRows.length && <Empty />}
          </div>
          <p className="mono dim hq-sum">Uploads, downloads and visits come from the map events (last 30 days); data sizes from the events HQ has kept.</p>
        </>
      )}
      {kind === "containers" && (
        <div className="hq-grid-table">
          <div className="hq-gt bx head"><span>Container</span><span>Where</span><span>Objects</span><span>Size</span><span>Views</span><span>Down</span><span>Live</span><span>Burns</span><span /></div>
          {boxes.map((b) => {
            const first = b.items[0];
            const burn = Math.min(...b.items.map((t) => Date.parse(t.expiresAt)));
            return (
              <div key={b.key} className="hq-gt bx">
                <span><b>▣ {b.name}</b><small className="mono dim">sender {b.from} · {first.space ? `◎ ${first.space}` : "public"} · {b.items.map((t) => t.name).slice(0, 4).join(", ")}{b.items.length > 4 ? "…" : ""}</small></span>
                <span>{flag(first.country)} {first.city || country(first.country)}</span>
                <span>{b.items.length}</span>
                <span>{formatBytes(b.items.reduce((a, t) => a + t.size, 0))}</span>
                <span>{b.items.reduce((a, t) => a + t.views, 0)}</span>
                <span>{b.items.reduce((a, t) => a + t.downloads, 0)}</span>
                <span>{b.items.reduce((a, t) => a + t.watchers, 0)}</span>
                <span>{Math.max(0, Math.round((burn - now) / 60000))}m</span>
                <span><button className="danger-btn" onClick={() => onDestroy(b.items.map((t) => t.id))}>Destroy all</button></span>
              </div>
            );
          })}
          {!boxes.length && <Empty />}
        </div>
      )}
      {kind === "cities" && (
        <div className="hq-split">
          <section>
            <span className="mono dim">Data in orbit right now, by place</span>
            <div className="hq-list">
              {byCity.length ? byCity.map((c) => (
                <div key={c.key} className="hq-row">
                  <span className="hq-flag">{flag(c.cc)}</span>
                  <span className="hq-name">{c.city} <span className="mono dim">· {c.n} objects · ↓{c.down}</span></span>
                  <span className="hq-live" />
                  <span className="hq-bar"><i style={{ width: `${(c.bytes / maxB) * 100}%` }} /></span>
                  <b>{formatBytes(c.bytes)}</b>
                </div>
              )) : <Empty />}
            </div>
          </section>
          <section>
            <span className="mono dim">Devices by city (all-time)</span>
            <div className="hq-list">
              {data.cities.map((c) => (
                <div key={`${c.city}-${c.country}`} className="hq-row short">
                  <span className="hq-flag">{flag(c.country)}</span>
                  <span className="hq-name">{c.city}, {country(c.country)}</span>
                  <b>{n(c.n)}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      {kind === "spaces" && (
        <div className="hq-grid-table">
          <div className="hq-gt sp head"><span>Space</span><span>Access</span><span>Members</span><span>Objects now</span><span>Removed</span><span>Created</span></div>
          {spaces.map((s) => (
            <div key={s.slug} className="hq-gt sp">
              <span><b>{s.title}</b><small className="mono dim">{s.slug}</small></span>
              <span>{s.priv ? "🔒 private" : "open"}</span>
              <span title={s.members.join(", ")}>{s.members.length} <small className="mono dim">{s.members.slice(0, 6).join(", ")}{s.members.length > 6 ? "…" : ""}</small></span>
              <span>{T.filter((t) => t.space === s.slug).length}</span>
              <span>{s.kicked}</span>
              <span>{new Date(s.at).toLocaleDateString()}</span>
            </div>
          ))}
          {!spaces.length && <Empty />}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "live" }) {
  return (
    <div className={`tile hq-tile${accent === "live" ? " live-tile" : ""}`}>
      <span className="mono">{label}</span>
      <b className="wide">{value}</b>
      {sub && <span className="mono dim">{sub}</span>}
    </div>
  );
}

function Panel({ title, right, children, onExpand }: { title: string; right?: string; children: React.ReactNode; onExpand?: () => void }) {
  return (
    <section className="hq-panel">
      <div className="hq-panel-head">
        <span className="mono">{title}</span>
        <span className="hq-panel-r">{right && <span className="mono dim">{right}</span>}{onExpand && <button className="hq-exp mono" onClick={onExpand}>Expand ↗</button>}</span>
      </div>
      {children}
    </section>
  );
}

const Empty = () => <p className="mono dim" style={{ padding: "8px 0" }}>No signals yet</p>;

function Breakdown({ title, map }: { title: string; map?: Record<string, number> }) {
  const rows = useMemo(() => Object.entries(map ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6), [map]);
  const total = rows.reduce((a, [, v]) => a + v, 0) || 1;
  return (
    <div className="hq-break">
      <span className="mono dim">{title}</span>
      <div className="hq-stack">
        {rows.map(([k, v], i) => <i key={k} style={{ width: `${(v / total) * 100}%`, opacity: 1 - i * 0.14 }} title={`${k}: ${v}`} />)}
      </div>
      <div className="hq-legend">{rows.map(([k, v]) => <span key={k}>{k} <b>{Math.round((v / total) * 100)}%</b></span>)}</div>
    </div>
  );
}

function Hourly({ data }: { data: Overview | null }) {
  // fill the last 24 hourly buckets so gaps show as gaps
  const buckets = useMemo(() => {
    const map = new Map((data?.hourly ?? []).map((h) => [new Date(h.h).getTime(), h]));
    const end = Math.floor(Date.now() / 3_600_000) * 3_600_000;
    return Array.from({ length: 24 }, (_, i) => {
      const t = end - (23 - i) * 3_600_000;
      const h = map.get(t);
      return { t, up: h?.up ?? 0, down: h?.down ?? 0, visit: h?.visit ?? 0 };
    });
  }, [data]);
  const max = Math.max(1, ...buckets.map((b) => b.up + b.down + b.visit));
  return (
    <div className="hq-hourly">
      <div className="hq-bars">
        {buckets.map((b) => (
          <div key={b.t} className="hq-col" title={`${new Date(b.t).getHours()}:00 · ${b.visit} visits · ${b.up} up · ${b.down} down`}>
            <i className="v" style={{ height: `${(b.visit / max) * 100}%` }} />
            <i className="u" style={{ height: `${(b.up / max) * 100}%` }} />
            <i className="d" style={{ height: `${(b.down / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="hq-legend"><span><i className="v" /> visits</span><span><i className="u" /> uploads</span><span><i className="d" /> downloads</span></div>
    </div>
  );
}

/** every anonymous session (migration 021): who (alias), when (UTC and the device's own zone), where from, how it ended */
function AnonSessions({ list }: { list: AnonSessionRec[] }) {
  const t = (iso: string | null, tz?: string | null) => {
    if (!iso) return "now";
    try {
      return new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: tz || "UTC" });
    } catch {
      return iso.slice(0, 16).replace("T", " ");
    }
  };
  if (!list.length) return <p className="mono dim">No anonymous sessions yet.</p>;
  return (
    <div className="hq-anon">
      <table>
        <thead>
          <tr><th>Alias</th><th>Length</th><th>Start (UTC)</th><th>End (UTC)</th><th>Local zone</th><th>Ended</th><th>Where</th><th>IP</th><th>Spaces</th></tr>
        </thead>
        <tbody>
          {list.map((x) => {
            const end = x.ended ?? (Date.parse(x.ends) < Date.now() ? x.ends : null);
            return (
              <tr key={x.alias + x.start}>
                <td><b>{x.alias}</b></td>
                <td>{x.min} min</td>
                <td>{t(x.start)}</td>
                <td>{end ? t(end) : "live"}</td>
                <td>{x.tz ? `${t(x.start, x.tz)} → ${end ? t(end, x.tz) : "now"} · ${x.tz}` : "—"}</td>
                <td>{!end ? "live" : x.reason === "exit" ? "exited" : "burnt (timer)"}</td>
                <td>{[x.city, x.cc].filter(Boolean).join(", ") || "—"}</td>
                <td className="mono">{x.ip || "—"}</td>
                <td>{x.spaces}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
