"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/lib/client";
import type { Layer } from "./Earth";
import type { AdminSpace, AdminTransfer, Overview } from "./types";

// three.js only loads for the admin, never for regular visitors
const Earth = dynamic(() => import("./Earth"), { ssr: false, loading: () => <div className="earth earth-loading mono">Booting globe…</div> });

const regionName = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();
const flag = (cc: string | null) =>
  cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐";
const country = (cc: string | null) => (cc ? regionName?.of(cc) ?? cc : "Unknown");
const n = (v: number | undefined) => (v ?? 0).toLocaleString("en-US");
const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
};

export default function AdminApp() {
  const [auth, setAuth] = useState<"checking" | "locked" | "in">("checking");
  const [data, setData] = useState<Overview | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/overview", { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401) return setAuth("locked");
    if (r.ok) {
      setData(await r.json());
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
      const v = await fetch("/api/version", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d?.v as string | undefined).catch(() => undefined);
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
  return <Dashboard data={data} now={now} onRefresh={load} onLogout={() => setAuth("locked")} />;
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
  { id: "visitors", label: "All visitors", dot: "#ffffff" },
  { id: "uploads", label: "Uploads", dot: "#59b8ff" },
  { id: "downloads", label: "Downloads", dot: "#ffa045" },
  { id: "routes", label: "Transfer routes", dot: "linear-gradient(90deg,#59b8ff,#ffa045)" },
];

type Expand = "objects" | "cities" | "spaces" | null;

function Dashboard({ data, now, onRefresh, onLogout }: { data: Overview | null; now: number; onRefresh: () => void; onLogout: () => void }) {
  const [layers, setLayers] = useState<Set<Layer>>(new Set(["live", "visitors", "uploads", "downloads", "routes"]));
  const [expand, setExpand] = useState<Expand>(null);
  const [spaces, setSpaces] = useState<AdminSpace[] | null>(null);
  useEffect(() => {
    const get = () => fetch("/api/admin/spaces", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setSpaces(d.spaces)).catch(() => {});
    get();
    const t = setInterval(get, 20_000);
    return () => clearInterval(t);
  }, []);
  const [spin, setSpin] = useState(true);
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
  const destroy = async (id: string) => {
    if (!confirm("Destroy this object for everyone?")) return;
    await fetch(`/api/admin/transfers/${id}`, { method: "DELETE" }).catch(() => {});
    onRefresh();
  };

  const today = data?.today ?? {};
  const maxCountry = Math.max(1, ...(data?.topCountries.map((c) => c.devices) ?? [1]));

  return (
    <div className="hq">
      <header className="hq-top">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.svg" alt="OrbitTransfer" width={194} height={28} />
          <span className="brand-by">Mission HQ</span>
        </Link>
        <nav className="hq-tabs" aria-label="HQ sections">
          <button className={!expand ? "on" : ""} onClick={() => setExpand(null)}>Globe</button>
          <button className={expand === "objects" ? "on" : ""} onClick={() => setExpand("objects")}>Objects <b>{data?.transfers.length ?? 0}</b></button>
          <button className={expand === "spaces" ? "on" : ""} onClick={() => setExpand("spaces")}>Spaces <b>{spaces?.length ?? 0}</b></button>
          <button className={expand === "cities" ? "on" : ""} onClick={() => setExpand("cities")}>Places</button>
        </nav>
        <span className="live"><span className="dot" /><b>{n(data?.online)}</b> online now</span>
        <span className="mono dim hq-clock">{new Date(now).toLocaleTimeString()}</span>
        <button className="pill" onClick={logout}>Lock</button>
      </header>

      <main className="hq-main">
        <section className="hq-globe">
          <Earth data={data} layers={layers} spin={spin} />
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

          <Panel title="Countries" right={`${n(data?.countries)} total`}>
            <div className="hq-list">
              {data?.topCountries.length ? data.topCountries.map((c) => (
                <div key={c.country} className="hq-row">
                  <span className="hq-flag">{flag(c.country)}</span>
                  <span className="hq-name">{country(c.country)}</span>
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

          <Panel title="Live feed">
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
                    <b>{t.name}{t.space ? <span className="hq-tag">◎ {t.space}{t.by ? ` · ${t.by}` : ""}</span> : null}{t.open ? <span className="hq-tag open">open</span> : null}</b>
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
      {expand && data && <Expanded kind={expand} data={data} spaces={spaces ?? []} now={now} onClose={() => setExpand(null)} onDestroy={destroy} />}
    </div>
  );
}

/** Full-screen detail for one panel, with filters. */
function Expanded({ kind, data, spaces, now, onClose, onDestroy }: { kind: Exclude<Expand, null>; data: Overview; spaces: AdminSpace[]; now: number; onClose: () => void; onDestroy: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [cc, setCc] = useState("");
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
  const rows = T.filter((t: AdminTransfer) =>
    (!q || `${t.name} ${t.id} ${t.by ?? ""} ${t.fileName}`.toLowerCase().includes(q.toLowerCase())) &&
    (!cc || t.country === cc) && (!city || t.city === city) &&
    (!space || (space === "public" ? !t.space : t.space === space)) &&
    (!access || (access === "open" ? t.open : !t.open)));
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
        <b className="wide">{kind === "objects" ? "Objects in orbit" : kind === "cities" ? "Places" : "Spaces"}</b>
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
          </div>
          <p className="mono dim hq-sum">{rows.length} objects · {formatBytes(bytes)} · {rows.reduce((a, t) => a + t.downloads, 0)} downloads · {rows.reduce((a, t) => a + t.watchers, 0)} watching now</p>
          <div className="hq-grid-table">
            <div className="hq-gt head"><span>Name</span><span>Where</span><span>Space · by</span><span>Size</span><span>Views</span><span>Down</span><span>Live</span><span>Burns</span><span /></div>
            {rows.map((t) => (
              <div key={t.id} className="hq-gt">
                <span><b>{t.name}</b><small className="mono dim">{t.id} · {t.open ? "open" : "passcode"} · {t.status}</small></span>
                <span>{flag(t.country)} {t.city || country(t.country)}</span>
                <span>{t.space ? `◎ ${t.space}${t.by ? ` · ${t.by}` : ""}` : "public"}</span>
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
