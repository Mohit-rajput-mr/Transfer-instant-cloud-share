"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LuArrowDown, LuArrowUp, LuCheck, LuChevronDown, LuFolderUp, LuLock, LuPaperclip, LuPencil, LuPlus, LuRoute, LuTrash2, LuUserCheck, LuX } from "react-icons/lu";
import { STAGES, TASK_MAX, forMe, isMyTask, parseTask, type Task } from "@/lib/tasks";
import { hueFor } from "@/lib/bubbles";
import type { Orb } from "@/lib/client";

export type TaskActs = {
  onAdd: (line: string) => Promise<void>;
  onTick: (t: Task, done: boolean) => void;
  onTake: (t: Task, who: string) => void;
  onBurn: (t: Task) => void;
  onAttach: (t: Task, what: "files" | "folder") => void;
  onEdit: (t: Task, change: { text?: string; route?: string[]; stage?: number }) => Promise<void>;
  onMove: (t: Task, dir: -1 | 1) => void;
  /** public void only: make a private space and take the team (and these tasks) there */
  onGoPrivate?: () => void;
};

/** Who wired files to a task: one dot per sender, in their colour, with how many. */
export function wiredBy(task: string, orbs: Orb[]) {
  const m = new Map<string, { hue: number; n: number; name: string }>();
  for (const o of orbs) {
    if (o.task !== task) continue;
    const k = o.from ?? o.id;
    const e = m.get(k) ?? { hue: hueFor(k), n: 0, name: o.by ?? "" };
    e.n++;
    m.set(k, e);
  }
  return [...m.values()];
}

/**
 * Tasks, one line each: a big orange dot, "TASK 1", the line, who it is for, and a tick anyone can set.
 * Files wired to a task hang off its dot (TaskWires). Tapping a task shows only its files.
 */
export default function TaskBoard(props: { tasks: Task[]; orbs: Orb[]; me: string; focus: string | null; onFocus: (id: string | null) => void; onClose: () => void } & TaskActs) {
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const [taking, setTaking] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [routing, setRouting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const done = props.tasks.filter((t) => t.doneAt).length;
  const total = props.tasks.length;
  const parsed = parseTask(line);

  // phones start folded (one slim row); wide screens open
  useEffect(() => {
    if (window.matchMedia("(max-width: 720px)").matches) setOpen(false);
  }, []);

  const add = async () => {
    if (!line.trim() || busy) return;
    setBusy(true);
    try {
      await props.onAdd(line);
      setLine("");
    } catch {}
    setBusy(false);
    input.current?.focus();
  };

  const wired = useMemo(() => new Map(props.tasks.map((t) => [t.id, wiredBy(t.id, props.orbs)])), [props.tasks, props.orbs]);

  return (
    <aside className={`task-board lg${open ? " open" : ""}`} aria-label="Tasks">
      <button className="tb-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <i className="task-dot" aria-hidden />
        <b>Tasks</b>
        <span className="mono dim">{total ? `${done}/${total} done` : "none yet"}</span>
        <span className="tb-bar" aria-hidden><i style={{ transform: `scaleX(${total ? done / total : 0})` }} /></span>
        <LuChevronDown className={`tb-chev${open ? " up" : ""}`} aria-hidden />
      </button>
      {!total && <button className="tb-x" onClick={props.onClose} aria-label="Close tasks"><LuX /></button>}
      {open && (
        <>
          <ol className="tb-list">
            {props.tasks.map((t, i) => {
              const w = wired.get(t.id) ?? [];
              const n = w.reduce((a, x) => a + x.n, 0);
              const mine = forMe(t, props.me);
              return (
                <li
                  key={t.id}
                  data-task-row={t.id}
                  className={`tb-row${t.doneAt ? " done" : ""}${props.focus === t.id ? " focus" : ""}${mine && !t.doneAt ? " forme" : ""}`}
                >
                  <button className="tb-tick" onClick={() => props.onTick(t, !t.doneAt)} aria-label={t.doneAt ? `Untick task ${t.num}` : `Tick task ${t.num} done`} title={t.doneAt ? `Done${t.doneBy ? ` by ${t.doneBy}` : ""}` : "Tick it done"}>
                    <i className="task-dot big" data-task-dot={t.id}>{t.doneAt && <LuCheck aria-hidden />}</i>
                  </button>
                  {editing === t.id ? (
                    <form className="tb-edit" onSubmit={(e) => { e.preventDefault(); if (draft.trim() && draft.trim() !== t.text) props.onEdit(t, { text: draft.trim() }).catch(() => {}); setEditing(null); }}>
                      <span className="tb-num mono">Task {t.num}</span>
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value.slice(0, TASK_MAX))} onKeyDown={(e) => e.key === "Escape" && setEditing(null)} aria-label={`Edit task ${t.num}`} />
                      <button type="submit" aria-label="Save"><LuCheck /></button>
                    </form>
                  ) : (
                  <button className="tb-main" onClick={() => props.onFocus(props.focus === t.id ? null : t.id)} title={props.focus === t.id ? "Show everything" : "Show only this task's files"}>
                    <span className="tb-num mono">Task {t.num}</span>
                    <span className="tb-text">{t.text}</span>
                    <span className="tb-meta mono">
                      {t.stage >= 0 && t.route[t.stage] && <em className="tb-stage">{t.route[t.stage]} · {t.stage + 1}/{t.route.length}</em>}
                      {t.doneAt ? `done${t.doneBy ? ` · ${t.doneBy}` : ""}` : t.assignee ? (mine ? "for you" : `@${t.assignee}`) : t.by ? `from ${t.by}` : "open"}
                      {t.editedAt && " · edited"}
                    </span>
                    {t.route.length > 0 && (
                      <span className="tb-rbar" aria-hidden>
                        {t.route.map((r, i) => <i key={i} className={i < t.stage ? "past" : i === t.stage ? "now" : ""} />)}
                      </span>
                    )}
                  </button>
                  )}
                  <span className="tb-wired" title={n ? `${n} wired: ${w.map((x) => `${x.name || "someone"} ${x.n}`).join(", ")}` : "Nothing wired yet"}>
                    {w.slice(0, 4).map((x, i) => <i key={i} style={{ "--wh": x.hue } as CSSProperties} />)}
                    {n > 0 && <b className="mono">{n}</b>}
                  </span>
                  <span className="tb-acts">
                    <button onClick={() => props.onAttach(t, "files")} aria-label={`Attach files to task ${t.num}`} title="Attach files"><LuPaperclip /></button>
                    <button onClick={() => props.onAttach(t, "folder")} aria-label={`Attach a folder to task ${t.num}`} title="Attach a folder"><LuFolderUp /></button>
                    {!t.doneAt && <button onClick={() => (setTaking(taking === t.id ? null : t.id), setWho(t.assignee ?? props.me))} aria-label={`Assign task ${t.num}`} title={t.assignee ? "Reassign" : "Take it / assign"}><LuUserCheck /></button>}
                    <button className={routing === t.id ? "on" : ""} onClick={() => setRouting(routing === t.id ? null : t.id)} aria-label={`Route of task ${t.num}`} title={isMyTask(t.id) ? "Route: edit and update" : "Route: see progress"}><LuRoute /></button>
                    {isMyTask(t.id) && <button onClick={() => (setEditing(t.id), setDraft(t.text))} aria-label={`Edit task ${t.num}`} title="Edit"><LuPencil /></button>}
                    {isMyTask(t.id) && i > 0 && <button onClick={() => props.onMove(t, -1)} aria-label={`Move task ${t.num} up`} title="Move up"><LuArrowUp /></button>}
                    {isMyTask(t.id) && i < props.tasks.length - 1 && <button onClick={() => props.onMove(t, 1)} aria-label={`Move task ${t.num} down`} title="Move down"><LuArrowDown /></button>}
                    {isMyTask(t.id) && <button className="kill" onClick={() => props.onBurn(t)} aria-label={`Remove task ${t.num}`} title="Remove"><LuTrash2 /></button>}
                  </span>
                  {routing === t.id && <RoutePanel t={t} mine={isMyTask(t.id)} onEdit={(c) => props.onEdit(t, c)} />}
                  {taking === t.id && (
                    <form className="tb-take" onSubmit={(e) => { e.preventDefault(); props.onTake(t, who.trim()); setTaking(null); }}>
                      <input autoFocus value={who} onChange={(e) => setWho(e.target.value.slice(0, 24))} placeholder="Name (empty = nobody)" />
                      <button type="submit" className="mono">{who.trim() && who.trim().toLowerCase() === props.me.toLowerCase() ? "Take it" : "Assign"}</button>
                      <button type="button" aria-label="Cancel" onClick={() => setTaking(null)}><LuX /></button>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
          <form className="tb-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <i className="task-dot ghost" aria-hidden />
            <input
              ref={input}
              value={line}
              onChange={(e) => setLine(e.target.value.slice(0, TASK_MAX + 26))}
              placeholder={total ? "Add a task… (@name to assign)" : "Add the first task… (@name to assign)"}
              aria-label="New task"
              enterKeyHint="done"
            />
            {parsed.assignee && <span className="tb-for mono">@{parsed.assignee}</span>}
          </form>
          {props.onGoPrivate && (
            <button className="tb-private mono" onClick={props.onGoPrivate}><LuLock aria-hidden /> Go private with the team</button>
          )}
          {props.focus && <button className="tb-showall mono" onClick={() => props.onFocus(null)}>Showing task {props.tasks.find((t) => t.id === props.focus)?.num}&apos;s files · show everything</button>}
        </>
      )}
    </aside>
  );
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
};

/**
 * A task's route. Its writer names the stages (In progress → AI reviewing → Generating zip → Zip sent to
 * email…), rewrites the line, and taps a stage to move the task there; the last stage ticks it done.
 * Everyone else sees the same route as a live timeline: which stage, who moved it, when.
 */
function RoutePanel({ t, mine, onEdit }: { t: Task; mine: boolean; onEdit: (c: { text?: string; route?: string[]; stage?: number }) => Promise<void> }) {
  const [title, setTitle] = useState(t.text);
  const [stages, setStages] = useState<string[]>(t.route.length ? t.route : ["In progress", "In review", "Delivered"]);
  const [busy, setBusy] = useState(false);
  const dirty = title.trim() !== t.text || stages.join("|") !== t.route.join("|");
  const last = (i: number) => [...t.log].reverse().find((l) => l.i === i);
  const run = async (c: { text?: string; route?: string[]; stage?: number }) => {
    setBusy(true);
    try {
      await onEdit(c);
    } catch {}
    setBusy(false);
  };
  const clean = () => stages.map((x) => x.trim()).filter(Boolean);

  if (!mine)
    return (
      <div className="tb-route">
        {!t.route.length && <p className="mono dim">No route yet. Its writer sets the stages.</p>}
        <ol className="tr-line">
          {t.route.map((r, i) => {
            const l = last(i);
            return (
              <li key={i} className={i < t.stage ? "past" : i === t.stage ? "now" : ""}>
                <i aria-hidden>{i < t.stage || (i === t.stage && t.doneAt) ? <LuCheck /> : null}</i>
                <b>{r}</b>
                <span className="mono">{l ? `${l.by ?? "someone"} · ${ago(l.at)}` : i === t.stage ? "now" : ""}</span>
              </li>
            );
          })}
        </ol>
      </div>
    );

  return (
    <div className="tb-route">
      <label className="tr-title">
        <span className="mono">Task {t.num}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 140))} aria-label="Task line" />
      </label>
      <span className="mono dim tr-hint">Route · tap a stage to move the task there</span>
      <ol className="tr-line edit">
        {stages.map((r, i) => {
          const l = last(i);
          return (
            <li key={i} className={i < t.stage ? "past" : i === t.stage ? "now" : ""}>
              <button disabled={busy} onClick={() => run({ text: title.trim() || undefined, route: clean(), stage: i })} aria-label={`Move to ${r}`} title={`Move to ${r}`}>
                <i aria-hidden>{i < t.stage || (i === t.stage && t.doneAt) ? <LuCheck /> : null}</i>
              </button>
              <input value={r} onChange={(e) => setStages((s) => s.map((x, k) => (k === i ? e.target.value.slice(0, 40) : x)))} aria-label={`Stage ${i + 1}`} />
              <span className="mono">{l ? ago(l.at) : ""}</span>
              <button className="tr-x" onClick={() => setStages((s) => s.filter((_, k) => k !== i))} aria-label={`Remove ${r}`}><LuX /></button>
            </li>
          );
        })}
      </ol>
      {stages.length < 8 && (
        <div className="tr-presets">
          {STAGES.filter((x) => !stages.includes(x)).slice(0, 6).map((x) => (
            <button key={x} className="mono" onClick={() => setStages((s) => [...s, x])}><LuPlus aria-hidden />{x}</button>
          ))}
          <button className="mono" onClick={() => setStages((s) => [...s, ""])}><LuPlus aria-hidden />Your own</button>
        </div>
      )}
      <div className="tr-go">
        {t.stage >= 0 && <button className="mono" disabled={busy} onClick={() => run({ stage: -1 })}>Back to not started</button>}
        <button className="cta-mini" disabled={!dirty || busy || !clean().length} onClick={() => run({ text: title.trim() || undefined, route: clean() })}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

/**
 * The wiring: a line from every wired ball to its task's orange dot, in the sender's colour, plus a
 * small "T2" tag on the ball. Measured from the page (balls drift), redrawn ~20 times a second, only
 * while something is wired.
 */
export function TaskWires({ tasks, orbs, focus }: { tasks: Task[]; orbs: Orb[]; focus: string | null }) {
  const svg = useRef<SVGSVGElement>(null);
  const wired = useMemo(() => orbs.filter((o) => o.task && tasks.some((t) => t.id === o.task)), [orbs, tasks]);
  const num = useMemo(() => new Map(tasks.map((t) => [t.id, t.num])), [tasks]);
  useEffect(() => {
    const el = svg.current;
    if (!el || !wired.length) {
      if (el) el.innerHTML = "";
      return;
    }
    let raf = 0, last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 50 || document.hidden) return;
      last = now;
      const box = el.getBoundingClientRect();
      // each task gets its own vertical lane, each wire its own track in it: parallel, never on top of each other
      const lanes = new Map<string, number>();
      const lane = (task: string) => (lanes.has(task) ? lanes.get(task)! : (lanes.set(task, lanes.size), lanes.size - 1));
      const tracks = new Map<string, number>();
      let s = `<defs><linearGradient id="twm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9edf2"/><stop offset="0.5" stop-color="#9aa3ad"/><stop offset="1" stop-color="#d4d9df"/></linearGradient></defs>`;
      for (const o of wired) {
        const a = document.querySelector(`[data-orb="${o.id}"] .orb`)?.getBoundingClientRect();
        if (!a || !a.width) continue;
        const ox = a.left + a.width / 2 - box.left, oy = a.top + a.height / 2 - box.top;
        const hue = hueFor(o.from ?? o.id);
        const on = !focus || focus === o.task;
        const op = on ? 1 : 0.1;
        const d = document.querySelector(`[data-task-dot="${o.task}"]`)?.getBoundingClientRect();
        const row = document.querySelector(`[data-task-row="${o.task}"]`)?.getBoundingClientRect();
        const r = a.width * 0.44;
        if (d && d.width && row && row.width) {
          const k = tracks.get(o.task!) ?? 0;
          tracks.set(o.task!, k + 1);
          const tx = row.right - box.left + 2, ty = d.top + d.height / 2 - box.top + (k - 1) * 3;
          // out of the row, along its lane, then straight across to the ball: right angles, soft corners
          const vx = tx + 22 + lane(o.task!) * 9 + k * 3;
          const ex = ox - (ox > vx ? r : -r), ey = oy;
          const R = Math.max(2, Math.min(10, Math.abs(ey - ty) / 2, Math.abs(ex - vx) / 2));
          const dy = ey > ty ? 1 : -1, dx = ex > vx ? 1 : -1;
          const path = Math.abs(ey - ty) < 2
            ? `M${tx} ${ty} H${ex}`
            : `M${tx} ${ty} H${vx - R} Q${vx} ${ty} ${vx} ${ty + dy * R} V${ey - dy * R} Q${vx} ${ey} ${vx + dx * R} ${ey} H${ex}`;
          s += `<g opacity="${op}"><path d="${path}" class="tw-shadow"/><path d="${path}" class="tw-line"/>`;
          s += `<circle cx="${tx}" cy="${ty}" r="2.6" class="tw-pin"/>`;
          // the terminal on the ball: a metal ring with the sender's colour inside (who wired it)
          s += `<circle cx="${ex}" cy="${ey}" r="5" class="tw-pin"/><circle cx="${ex}" cy="${ey}" r="2.6" fill="hsl(${hue} 70% 58%)"/></g>`;
        }
        // the task tag on the ball (also when the board is folded away, as on phones)
        const n = num.get(o.task!);
        const w = n && n > 9 ? 34 : 28;
        const lx = a.left - box.left + a.width * 0.06, ly = a.top - box.top + a.height * 0.04;
        s += `<g opacity="${op}" transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)})"><rect x="-4" y="-12" width="${w}" height="19" rx="6" class="tw-tagbg"/><rect x="-4" y="-12" width="3" height="19" rx="1.5" fill="hsl(${hue} 70% 58%)"/><text x="${w / 2 - 2}" y="2" text-anchor="middle" class="tw-tag">T${n}</text></g>`;
      }
      el.innerHTML = s;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [wired, num, focus]);
  return <svg ref={svg} className="task-wires" aria-hidden />;
}
