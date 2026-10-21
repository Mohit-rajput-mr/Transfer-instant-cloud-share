"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/lib/client";
import { joinLive, liveOn, roomsFor } from "@/lib/live";
import { supabase } from "@/lib/realtime";
import type { SyncMsg } from "@/lib/sync";

// HQ "Void": the void as visitors see it — files as orbs, notes as bubbles, tasks on a board — but for every area at
// once, and HQ may burn anything. A burn is also beamed to that area's live room, so open screens drop it at once.

type VFile = { id: string; name: string; fileName: string; size: number; hue: number; area: string | null; space: string | null; by: string | null; open: boolean; city: string | null; country: string | null; downloads: number; createdAt: string; expiresAt: string };
type VTask = { id: string; num: number; text: string; by: string | null; space: string | null; area: string | null; assignee: string | null; doneAt: string | null; createdAt: string; expiresAt: string };
type VNote = { id: string; text: string; by: string | null; space: string | null; area: string | null; hue: number; createdAt: string; expiresAt: string };
type Data = { now: string; files: VFile[]; tasks: VTask[]; notes: VNote[] };
type Kind = "file" | "task" | "note";

/** tell the area's open screens that something is gone (public void only; a space's screens catch up on refresh) */
// the public void is one worldwide room (r/void · orbit-void): every open screen hears it there
function beam(msg: SyncMsg) {
  if (liveOn) {
    let done = false;
    const l = joinLive(roomsFor(null, ""), "", {
      on() {},
      status(up) {
        if (!up || done) return;
        done = true;
        l.chan.send({ type: "broadcast", event: "sync", payload: msg });
        setTimeout(() => l.close(), 600);
      },
    });
    setTimeout(() => l.close(), 8000);
    return;
  }
  const ch = supabase.channel("orbit-void", { config: { broadcast: { self: false } } });
  ch.subscribe((s) => {
    if (s !== "SUBSCRIBED") return;
    ch.send({ type: "broadcast", event: "sync", payload: msg });
    setTimeout(() => supabase.removeChannel(ch), 600);
  });
}

const left = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((Date.parse(iso) - now) / 1000));
  return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
// a stable spot for each orb (same id → same place), so the void doesn't reshuffle on every refresh
const spot = (id: string) => {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return [((h >>> 0) % 1000) / 1000, (((h >>> 10) >>> 0) % 1000) / 1000];
};

export default function AdminVoid({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [area, setArea] = useState<string>("all");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/void", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return setErr(r?.status === 401 ? "Signed out — log in again" : "Couldn't load the void");
    setErr("");
    setData(await r.json());
  }, []);
  useEffect(() => {
    load();
    const a = setInterval(load, 10_000), b = setInterval(() => setNow(Date.now()), 1000);
    return () => (clearInterval(a), clearInterval(b));
  }, [load]);

  const areaOf = (x: { area: string | null; space: string | null }) => (x.space ? `space:${x.space}` : x.area || "—");
  const areas = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of [...(data?.files ?? []), ...(data?.tasks ?? []), ...(data?.notes ?? [])]) m.set(areaOf(x), (m.get(areaOf(x)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);
  const pick = <T extends { area: string | null; space: string | null; expiresAt: string }>(xs: T[] = []) =>
    xs.filter((x) => Date.parse(x.expiresAt) > now && (area === "all" || areaOf(x) === area));
  const files = pick(data?.files), tasks = pick(data?.tasks), notes = pick(data?.notes);

  const burn = async (kind: Kind, x: { id: string; area: string | null; space: string | null }, ask = true) => {
    if (ask && !confirm(`Burn this ${kind} for everyone, now?`)) return false;
    setBusy((s) => new Set(s).add(x.id));
    const r = await fetch("/api/admin/void", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id: x.id }) }).catch(() => null);
    setBusy((s) => ((s = new Set(s)), s.delete(x.id), s));
    if (!r?.ok) return setErr(`Couldn't burn that ${kind}`), false;
    if (!x.space) beam(kind === "file" ? { og: [x.id] } : kind === "task" ? { tg: [x.id] } : { bg: [x.id] });
    setData((d) => d && { ...d, files: d.files.filter((f) => f.id !== x.id), tasks: d.tasks.filter((t) => t.id !== x.id), notes: d.notes.filter((n) => n.id !== x.id) });
    return true;
  };
  const burnAll = async () => {
    const n = files.length + tasks.length + notes.length;
    if (!n || !confirm(`Burn all ${n} things ${area === "all" ? "in every area" : `in ${area}`}?`)) return;
    for (const f of files) await burn("file", f, false);
    for (const t of tasks) await burn("task", t, false);
    for (const b of notes) await burn("note", b, false);
  };
  const X = ({ kind, x }: { kind: Kind; x: { id: string; area: string | null; space: string | null } }) => (
    <button className="av-x" disabled={busy.has(x.id)} onClick={(e) => (e.stopPropagation(), burn(kind, x))} title={`Burn this ${kind}`} aria-label={`Burn this ${kind}`}>✕</button>
  );

  return (
    <div className="hq-expand av" role="dialog" aria-label="Void">
      <div className="hq-expand-head">
        <b className="wide">Void</b>
        <span className="mono dim">{files.length} files · {notes.length} notes · {tasks.length} tasks{err ? ` · ${err}` : ""}</span>
        <span style={{ display: "flex", gap: 8 }}>
          <button className="pill av-burnall" onClick={burnAll} disabled={!files.length && !tasks.length && !notes.length}>Burn all here</button>
          <button className="pill" onClick={onClose}>Close ✕</button>
        </span>
      </div>
      <div className="hq-filters">
        <button className={`pill ${area === "all" ? "on" : ""}`} onClick={() => setArea("all")}>All areas <b>{areas.reduce((s, a) => s + a[1], 0)}</b></button>
        {areas.map(([a, c]) => (
          <button key={a} className={`pill ${area === a ? "on" : ""}`} onClick={() => setArea(a)}>{a.startsWith("space:") ? `◆ ${a.slice(6)}` : a} <b>{c}</b></button>
        ))}
      </div>
      <div className="av-sky">
        {tasks.length > 0 && (
          <div className="av-tasks glass">
            <div className="mono dim">Tasks · {tasks.length}</div>
            {tasks.map((t) => (
              <div key={t.id} className={`av-task ${t.doneAt ? "done" : ""}`}>
                <span className="av-dot" />
                <span className="av-tt">
                  <b>{t.text}</b>
                  <span className="mono dim">#{t.num}{t.by ? ` · ${t.by}` : ""}{t.assignee ? ` → @${t.assignee}` : ""} · {areaOf(t)} · {left(t.expiresAt, now)}</span>
                </span>
                <X kind="task" x={t} />
              </div>
            ))}
          </div>
        )}
        {files.map((f) => {
          const [x, y] = spot(f.id);
          return (
            <div key={f.id} className="av-orb" style={{ left: `${8 + x * 74}%`, top: `${10 + y * 70}%`, ["--h" as string]: f.hue }} title={`${f.fileName} · ${formatBytes(f.size)}`}>
              <div className="ball"><span>{(f.fileName.split(".").pop() || "file").slice(0, 4).toUpperCase()}</span></div>
              <div className="av-cap"><b>{f.name || f.fileName}</b><span className="mono dim">{formatBytes(f.size)} · {areaOf(f)}{f.open ? " · open" : ""} · {left(f.expiresAt, now)}</span></div>
              <X kind="file" x={f} />
            </div>
          );
        })}
        {notes.map((b) => {
          const [x, y] = spot(b.id);
          return (
            <div key={b.id} className="av-note" style={{ left: `${40 + x * 50}%`, top: `${6 + y * 78}%`, ["--h" as string]: b.hue }}>
              <p>{b.text.length > 160 ? b.text.slice(0, 160) + "…" : b.text}</p>
              <span className="mono dim">{b.by || "someone"} · {areaOf(b)} · {left(b.expiresAt, now)}</span>
              <X kind="note" x={b} />
            </div>
          );
        })}
        {!files.length && !tasks.length && !notes.length && <div className="av-empty mono dim">{data ? "The void is empty here" : "Loading…"}</div>}
      </div>
    </div>
  );
}
