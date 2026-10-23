"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/lib/client";
import { country, flag, n } from "./fmt";
import AdminPages from "./Pages";

// /admin/spaces: every space of the last 30 days (who is live in it now, what is in it, what has flowed through it),
// the anonymous sessions, and 30 days of history. Data: /api/admin/spaces?full=1 (migration 029), every 10 s.

type SpaceRow = {
  slug: string; anon: boolean; title: string | null; priv: boolean | null; handles: string[];
  created_at: string; burnt_at: string | null; last_seen: string | null;
  members: number; joined: number; live: number;
  files_now: number; bytes_now: number; notes_now: number; tasks_now: number;
  files: number; bytes_up: number; downloads: number; bytes_down: number; notes: number; tasks: number;
};
type Session = { alias: string; min: number; started_at: string; ends_at: string; ended_at: string | null; end_reason: string | null; country: string | null; city: string | null; spaces: string[] };
type Day = { day: string; spaces: number; anon_spaces: number; sessions: number };
type Data = { now: string; spaces: SpaceRow[]; sessions: { total: number; live: number; today: number; list: Session[] }; days: Day[] };

const ago = (iso: string | null, now: number) => {
  if (!iso) return "—";
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const code = (slug: string) => slug.slice(5, 9).toUpperCase();
const objectsNow = (s: SpaceRow) => s.files_now + s.notes_now + s.tasks_now;
/** live: someone is in it now; open: not burnt and something is in it or it was used today; else gone */
const state = (s: SpaceRow, now: number) =>
  s.burnt_at ? "burnt" : s.live > 0 ? "live" : objectsNow(s) > 0 || (s.last_seen && now - Date.parse(s.last_seen) < 864e5) ? "open" : "quiet";

function Tile({ label, value, sub, live }: { label: string; value: string; sub?: string; live?: boolean }) {
  return (
    <div className={`tile hq-tile${live ? " live-tile" : ""}`}>
      <span className="mono">{label}</span>
      <b className="wide">{value}</b>
      {sub && <span className="mono dim">{sub}</span>}
    </div>
  );
}

export default function AdminSpaces() {
  const [data, setData] = useState<Data | null>(null);
  const [auth, setAuth] = useState<"checking" | "locked" | "in">("checking");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"spaces" | "anon" | "history">("spaces");
  const [kind, setKind] = useState<"all" | "named" | "anon">("all");
  const [hideBurnt, setHideBurnt] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let on = true;
    const get = async () => {
      const r = await fetch("/api/admin/spaces?full=1", { cache: "no-store" }).catch(() => null);
      if (!on) return;
      if (r?.status === 401) return setAuth("locked");
      const d = r?.ok ? ((await r.json().catch(() => null)) as Data | null) : null;
      if (!d) return setErr("Couldn't load the spaces, retrying…");
      setErr("");
      setAuth("in");
      setData(d);
    };
    void get();
    const t = setInterval(get, 10_000);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      on = false;
      clearInterval(t);
      clearInterval(c);
    };
  }, []);

  const spaces = useMemo(() => data?.spaces ?? [], [data]);
  const shown = useMemo(() => {
    const rank = { live: 0, open: 1, quiet: 2, burnt: 3 } as const;
    return spaces
      .filter((s) => (kind === "all" ? true : kind === "anon" ? s.anon : !s.anon))
      .filter((s) => !hideBurnt || !s.burnt_at)
      .sort((a, b) => rank[state(a, now)] - rank[state(b, now)] || Date.parse(b.created_at) - Date.parse(a.created_at));
  }, [spaces, kind, hideBurnt, now]);

  const sum = (f: (s: SpaceRow) => number, list = spaces) => list.reduce((a, s) => a + f(s), 0);
  const named = spaces.filter((s) => !s.anon), anon = spaces.filter((s) => s.anon);
  const sessions = data?.sessions;
  const maxDay = Math.max(1, ...(data?.days ?? []).map((d) => d.spaces + d.anon_spaces + d.sessions));

  if (auth === "locked")
    return (
      <div className="hq hqs-locked">
        <p className="mono">Locked. <Link href="/admin">Sign in on HQ</Link>, then come back.</p>
      </div>
    );

  return (
    <div className="hq hqs">
      <header className="hq-top">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.svg" alt="Orbi Transfer" width={194} height={28} />
          <span className="brand-by">Mission HQ</span>
        </Link>
        <AdminPages />
        <span className="live"><span className="dot" /><b>{n(sum((s) => s.live))}</b> live in spaces</span>
        <span className="mono dim hq-clock">{data ? `updated ${ago(data.now, now)}` : "loading…"}</span>
      </header>

      <main className="hqs-main">
        {err && <p className="hqs-err mono">{err}</p>}
        <div className="hqs-tiles">
          <Tile label="Live in spaces now" value={n(sum((s) => s.live))} sub={`${n(spaces.filter((s) => s.live > 0).length)} spaces with people in them`} live />
          <Tile label="Objects in spaces now" value={n(sum(objectsNow))} sub={`${n(sum((s) => s.files_now))} files · ${formatBytes(sum((s) => s.bytes_now))}`} />
          <Tile label="Flowed through spaces · 30 d" value={formatBytes(sum((s) => s.bytes_up))} sub={`${n(sum((s) => s.files))} files up · ${n(sum((s) => s.downloads))} downloads`} />
          <Tile label="Named spaces · 30 d" value={n(named.length)} sub={`${n(named.filter((s) => !s.burnt_at && state(s, now) !== "quiet").length)} open · ${n(sum((s) => s.members, named))} members`} />
          <Tile label="Anonymous now" value={n(sessions?.live)} sub={`${n(sessions?.today)} today · ${n(sessions?.total)} all-time`} live />
          <Tile label="Anonymous spaces · 30 d" value={n(anon.length)} sub={`${n(anon.filter((s) => !s.burnt_at).length)} not burnt · ${n(sum(objectsNow, anon))} objects in them`} />
        </div>

        <nav className="hq-tabs hqs-tabs" aria-label="Spaces views">
          <button className={tab === "spaces" ? "on" : ""} onClick={() => setTab("spaces")}>Spaces <b>{shown.length}</b></button>
          <button className={tab === "anon" ? "on" : ""} onClick={() => setTab("anon")}>Anonymous <b>{sessions?.list.length ?? 0}</b></button>
          <button className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>History</button>
        </nav>

        {tab === "spaces" && (
          <section className="hq-panel">
            <div className="hqs-filters">
              {(["all", "named", "anon"] as const).map((k) => (
                <button key={k} className={`pill${kind === k ? " on" : ""}`} onClick={() => setKind(k)}>{k === "all" ? "All" : k === "named" ? "Named" : "Anonymous"}</button>
              ))}
              <label className="mono dim hqs-check"><input type="checkbox" checked={hideBurnt} onChange={(e) => setHideBurnt(e.target.checked)} /> hide burnt</label>
            </div>
            <div className="hqs-scroll">
              <table className="hqs-table">
                <thead>
                  <tr><th>Space</th><th>State</th><th>People</th><th>In it now</th><th>Flowed (all time)</th><th>Made</th><th>Last seen</th></tr>
                </thead>
                <tbody>
                  {shown.map((s) => {
                    const st = state(s, now);
                    return (
                      <tr key={s.slug} className={`st-${st}`}>
                        <td>
                          <b>{s.anon ? `Anon · ${code(s.slug)}` : s.title ?? s.slug}</b>
                          <span className="mono dim">{s.anon ? "anonymous" : s.priv ? "private" : "public"}{s.handles.length ? ` · ${s.handles.slice(0, 3).join(", ")}${s.handles.length > 3 ? ` +${s.handles.length - 3}` : ""}` : ""}</span>
                        </td>
                        <td><span className={`hqs-state ${st}`}><i />{st}</span></td>
                        <td><b className={s.live ? "live-n" : ""}>{n(s.live)}</b> <span className="dim">live · {n(s.members)} in · {n(s.joined)} joined</span></td>
                        <td>{objectsNow(s) ? <>{n(s.files_now)} files · {n(s.notes_now)} notes · {n(s.tasks_now)} tasks<br /><span className="dim">{formatBytes(s.bytes_now)}</span></> : <span className="dim">empty</span>}</td>
                        <td>{n(s.files)} files · {formatBytes(s.bytes_up)}<br /><span className="dim">{n(s.downloads)} downloads · {formatBytes(s.bytes_down)} out · {n(s.notes)} notes · {n(s.tasks)} tasks</span></td>
                        <td className="dim">{ago(s.created_at, now)}{s.burnt_at ? <><br />burnt {ago(s.burnt_at, now)}</> : null}</td>
                        <td className="dim">{ago(s.last_seen, now)}</td>
                      </tr>
                    );
                  })}
                  {!shown.length && <tr><td colSpan={7} className="dim">{data ? "No spaces here" : "Loading…"}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "anon" && (
          <section className="hq-panel">
            <div className="hqs-scroll">
              <table className="hqs-table">
                <thead>
                  <tr><th>Who</th><th>State</th><th>Length</th><th>Started</th><th>Spaces it made</th><th>From</th></tr>
                </thead>
                <tbody>
                  {(sessions?.list ?? []).map((a) => {
                    const live = !a.ended_at && Date.parse(a.ends_at) > now;
                    const own = a.spaces.map((slug) => spaces.find((s) => s.slug === slug)).filter((s): s is SpaceRow => !!s);
                    return (
                      <tr key={a.alias + a.started_at} className={live ? "st-live" : "st-burnt"}>
                        <td><b>{a.alias}</b></td>
                        <td><span className={`hqs-state ${live ? "live" : "burnt"}`}><i />{live ? `${mmss(Date.parse(a.ends_at) - now)} left` : a.end_reason === "timer" ? "time ran out" : "exited"}</span></td>
                        <td>{a.min} min</td>
                        <td className="dim">{ago(a.started_at, now)}<br />{new Date(a.started_at).toUTCString().slice(5, 22)} UTC</td>
                        <td>
                          {a.spaces.length ? a.spaces.map((slug) => <span key={slug} className="hqs-code">{code(slug)}</span>) : <span className="dim">none</span>}
                          {own.length > 0 && <><br /><span className="dim">{n(sum((s) => s.files, own))} files · {formatBytes(sum((s) => s.bytes_up, own))} · {n(sum((s) => s.notes + s.tasks, own))} notes/tasks</span></>}
                        </td>
                        <td>{flag(a.country)} {a.city ? `${a.city}, ` : ""}{country(a.country)}</td>
                      </tr>
                    );
                  })}
                  {!sessions?.list.length && <tr><td colSpan={6} className="dim">{data ? "No anonymous sessions yet" : "Loading…"}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="hq-panel">
            <div className="hqs-legend mono dim"><i className="k-sp" /> named spaces <i className="k-an" /> anonymous spaces <i className="k-se" /> anonymous sessions · last 30 days</div>
            <div className="hqs-bars" role="img" aria-label="Spaces and anonymous sessions per day, last 30 days">
              {(data?.days ?? []).map((d) => (
                <div key={d.day} className="hqs-bar" title={`${d.day}: ${d.spaces} named · ${d.anon_spaces} anonymous spaces · ${d.sessions} sessions`}>
                  <div className="stack" style={{ height: `${((d.spaces + d.anon_spaces + d.sessions) / maxDay) * 100}%` }}>
                    <i className="k-se" style={{ flex: d.sessions }} />
                    <i className="k-an" style={{ flex: d.anon_spaces }} />
                    <i className="k-sp" style={{ flex: d.spaces }} />
                  </div>
                  <span className="mono dim">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
            <div className="hqs-scroll">
              <table className="hqs-table">
                <thead><tr><th>Day</th><th>Named spaces</th><th>Anonymous spaces</th><th>Anonymous sessions</th></tr></thead>
                <tbody>
                  {[...(data?.days ?? [])].reverse().filter((d) => d.spaces + d.anon_spaces + d.sessions > 0).map((d) => (
                    <tr key={d.day}><td>{d.day}</td><td>{n(d.spaces)}</td><td>{n(d.anon_spaces)}</td><td>{n(d.sessions)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
