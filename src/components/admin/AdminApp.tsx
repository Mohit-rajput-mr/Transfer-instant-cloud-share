"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/lib/client";
import type { Layer } from "./Earth";
import type { Overview } from "./types";

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

function Dashboard({ data, now, onRefresh, onLogout }: { data: Overview | null; now: number; onRefresh: () => void; onLogout: () => void }) {
  const [layers, setLayers] = useState<Set<Layer>>(new Set(["live", "visitors", "uploads", "downloads", "routes"]));
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
          <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden><circle cx="32" cy="32" r="10" fill="#fff" /><ellipse cx="32" cy="32" rx="27" ry="9" fill="none" stroke="#fff" strokeWidth="3" transform="rotate(-24 32 32)" /></svg>
          <span className="brand-name">ORBIT</span>
          <span className="brand-by">Mission HQ</span>
        </Link>
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
            <Tile label="Data moved all-time" value={formatBytes((data?.totals.bytes_up ?? 0) + (data?.totals.bytes_down ?? 0))} sub={`${n(data?.totals.uploads)} up · ${n(data?.totals.downloads)} down`} />
          </div>

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

          <Panel title="Top cities">
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

          <Panel title="Objects in orbit" right={`${data?.transfers.length ?? 0}`}>
            <div className="hq-table">
              {data?.transfers.length ? data.transfers.map((t) => (
                <div key={t.id} className="hq-tr">
                  <div>
                    <b>{t.name}</b>
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

function Panel({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <section className="hq-panel">
      <div className="hq-panel-head"><span className="mono">{title}</span>{right && <span className="mono dim">{right}</span>}</div>
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
