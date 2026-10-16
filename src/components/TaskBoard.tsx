"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LuArrowDown, LuArrowUp, LuRows3, LuCheck, LuChevronDown, LuFolderUp, LuLock, LuPaperclip, LuPencil, LuPlus, LuRoute, LuTrash2, LuUserCheck, LuX } from "react-icons/lu";
import { PRO_FOR_ALL, STAGES, TASK_LIVES, TASK_MAX, dropPro, forMe, isMyTask, parseTask, proCode, redeemPro, type Task } from "@/lib/tasks";
import { hueFor } from "@/lib/bubbles";
import { formatBytes, type Orb } from "@/lib/client";

export type TaskActs = {
  onAdd: (line: string, life: number) => Promise<void>;
  onTick: (t: Task, done: boolean) => void;
  onTake: (t: Task, who: string) => void;
  onBurn: (t: Task) => void;
  onAttach: (t: Task, what: "files" | "folder") => void;
  onEdit: (t: Task, change: { text?: string; route?: string[]; stage?: number }) => Promise<void>;
  onMove: (t: Task, dir: -1 | 1) => void;
  /** a file listed under its task: tap opens its card, double-tap previews it */
  onOpenFile?: (o: Orb) => void;
  onPreviewFile?: (o: Orb) => void;
  /** public void only: make a private space and take the team (and these tasks) there */
  onGoPrivate?: () => void;
};

const DEFAULT_ROUTE = ["In progress", "In review", "Done"];
/** 0 grey (not started) · 1 orange (first step) · 2 blue (on its way) · 3 green (done) */
export const stepOf = (t: Task) => (t.doneAt || (t.route.length && t.stage >= t.route.length - 1) ? 3 : t.stage < 0 ? 0 : t.stage === 0 ? 1 : 2);

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
export default function TaskBoard(props: { tasks: Task[]; orbs: Orb[]; me: string; focus: string | null; onFocus: (id: string | null) => void; onClose: () => void; /** a cable is being plugged in: the tasks light up as targets */ wiring?: boolean; arranged?: boolean; onArrange?: () => void; /** arranged: each row is a lane this tall, its files on the same line */ laneH?: number } & TaskActs) {
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const [taking, setTaking] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [routing, setRouting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Pro (a code from Mission HQ on this device): tasks stay up to 8 hours
  const [pro, setPro] = useState(false);
  const [life, setLife] = useState(480);
  const [redeem, setRedeem] = useState<string | null>(null);
  const [proErr, setProErr] = useState("");
  useEffect(() => setPro(!!proCode()), []);
  const input = useRef<HTMLInputElement>(null);
  const done = props.tasks.filter((t) => t.doneAt).length;
  // the tick walks the route: grey → orange (first step) → blue → green (done). Only the writer can move it;
  // everyone else ticks it done / undone as before.
  const tap = (t: Task) => {
    if (!isMyTask(t.id)) return props.onTick(t, !t.doneAt);
    if (t.doneAt) return void props.onEdit(t, { stage: -1 }).then(() => props.onTick(t, false)).catch(() => {});
    const route = t.route.length ? t.route : DEFAULT_ROUTE;
    props.onEdit(t, { route, stage: Math.min(route.length - 1, t.stage + 1) }).catch(() => {});
  };
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
      await props.onAdd(line, pro ? life : 30);
      setLine("");
    } catch {}
    setBusy(false);
    input.current?.focus();
  };

  const wired = useMemo(() => new Map(props.tasks.map((t) => [t.id, wiredBy(t.id, props.orbs)])), [props.tasks, props.orbs]);
  // every file attached to a task, listed right under it (newest first)
  const files = useMemo(() => {
    const m = new Map<string, Orb[]>();
    for (const o of props.orbs) if (o.task) m.set(o.task, [...(m.get(o.task) ?? []), o]);
    for (const l of m.values()) l.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return m;
  }, [props.orbs]);

  return (
    <aside className={`task-board lg${open || props.wiring ? " open" : ""}${props.wiring ? " wiring" : ""}${props.laneH ? " lanes" : ""}`} style={props.laneH ? ({ "--lane-h": `${props.laneH}px` } as CSSProperties) : undefined} aria-label="Tasks">
      <button className="tb-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <i className="task-dot" aria-hidden />
        <b>Tasks</b>
        <span className="mono dim">{total ? `${done}/${total} done` : "none yet"}</span>
        <span className="tb-bar" aria-hidden><i style={{ transform: `scaleX(${total ? done / total : 0})` }} /></span>
        <LuChevronDown className={`tb-chev${open ? " up" : ""}`} aria-hidden />
      </button>
      {props.onArrange && total > 0 && (
        <button className={`tb-arrange mono${props.arranged ? " on" : ""}`} onClick={props.onArrange} aria-pressed={!!props.arranged} title={props.arranged ? "Back to the free-floating void" : "Line every file up in its task's lane"}>
          <LuRows3 aria-hidden />{props.arranged ? "Arranged" : "Arrange"}
        </button>
      )}
      {!total && <button className="tb-x" onClick={props.onClose} aria-label="Close tasks"><LuX /></button>}
      {(open || props.wiring) && (
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
                  <button className="tb-tick" onClick={() => tap(t)} aria-label={t.doneAt ? `Untick task ${t.num}` : `Move task ${t.num} to its next step`} title={t.doneAt ? `Done${t.doneBy ? ` by ${t.doneBy}` : ""}` : t.stage >= 0 && t.route[t.stage] ? `${t.route[t.stage]} · tap for the next step` : "Tap: first step"}>
                    <i className="task-dot big" data-task-dot={t.id} data-step={stepOf(t)}>{(t.doneAt || t.stage >= 0) && <LuCheck aria-hidden />}</i>
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
                      {Date.parse(t.expiresAt) - Date.parse(t.createdAt) > 31 * 60_000 && ` · ${left(t.expiresAt)}`}
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
                  {files.get(t.id)?.length ? (
                    <div className="tb-files">
                      {files.get(t.id)!.map((o) => (
                        <button key={o.id} className="tb-file" style={{ "--wh": hueFor(o.from ?? o.id) } as CSSProperties} onClick={() => props.onOpenFile?.(o)} onDoubleClick={() => props.onPreviewFile?.(o)} title={`${o.name}${o.by ? ` · from ${o.by}` : ""} · ${formatBytes(o.size)}`}>
                          <i aria-hidden />
                          <span className="ellip">{o.name}</span>
                          <em className="mono">{formatBytes(o.size)}</em>
                        </button>
                      ))}
                    </div>
                  ) : null}
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
          {pro ? (
            <div className="tb-keep" role="radiogroup" aria-label="New tasks stay">
              <span className="mono">Pro · keep for</span>
              {TASK_LIVES.map(([m, l]) => (
                <button key={m} role="radio" aria-checked={life === m} className={life === m ? "on" : ""} onClick={() => setLife(m)}>{l}</button>
              ))}
              {!PRO_FOR_ALL && <button className="tb-unpro" onClick={() => (dropPro(), setPro(false))} aria-label="Remove the Pro code from this device" title="Remove Pro from this device"><LuX /></button>}
            </div>
          ) : redeem !== null ? (
            <form className="tb-redeem" onSubmit={async (e) => {
              e.preventDefault();
              try {
                await redeemPro(redeem);
                setPro(true);
                setRedeem(null);
                setProErr("");
              } catch (err) {
                setProErr((err as Error).message);
              }
            }}>
              <input autoFocus value={redeem} onChange={(e) => setRedeem(e.target.value.toUpperCase().slice(0, 20))} placeholder="PRO-XXXXXX-XXXXXXXX" aria-label="Pro code" />
              <button type="submit" className="mono">Unlock</button>
              <button type="button" onClick={() => (setRedeem(null), setProErr(""))} aria-label="Cancel"><LuX /></button>
              {proErr && <span className="mono">{proErr}</span>}
            </form>
          ) : (
            <button className="tb-pro mono" onClick={() => setRedeem("")}>Pro: keep tasks up to 8 hours</button>
          )}
          {props.onGoPrivate && (
            <button className="tb-private mono" onClick={props.onGoPrivate}><LuLock aria-hidden /> Go private with the team</button>
          )}
          {props.focus && <button className="tb-showall mono" onClick={() => props.onFocus(null)}>Showing task {props.tasks.find((t) => t.id === props.focus)?.num}&apos;s files · show everything</button>}
        </>
      )}
    </aside>
  );
}

const left = (iso: string) => {
  const m = Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 60000));
  return m < 60 ? `${m}m left` : `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m ` : ""}left`;
};
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

/** A real cable between two points: it hangs (sags under its own weight) and sways a little. */
function cable(ax: number, ay: number, bx: number, by: number, t: number, seed: number) {
  const dx = bx - ax, dist = Math.hypot(dx, by - ay);
  const sag = Math.min(150, 26 + dist * 0.2);
  const sway = Math.sin(t / 900 + seed) * Math.min(8, dist * 0.02);
  const c1x = ax + dx * 0.28, c1y = Math.max(ay, by) * 0 + ay + sag + sway;
  const c2x = bx - dx * 0.3, c2y = by + sag * 0.85 - sway;
  return `M${ax.toFixed(1)} ${ay.toFixed(1)} C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
}
const CABLE_DEFS = `<defs><linearGradient id="twm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef1f4"/><stop offset="0.45" stop-color="#9aa3ad"/><stop offset="1" stop-color="#d6dbe0"/></linearGradient></defs>`;
const drawCable = (d: string, hue: number | null, op: number) =>
  `<g opacity="${op}"><path d="${d}" class="tw-shadow"/><path d="${d}" class="tw-line"/><path d="${d}" class="tw-glint"/></g>`;

type Drag = { orb: string; x: number; y: number; moved: number; snap: string | null };

/**
 * The wiring: a hanging cable from every wired ball to its task, in brushed metal, with the sender's colour
 * at the ball end and a "T2" tag on the ball. Your own balls get a plug: press it and a cable follows the
 * pointer; the tasks pull it in like magnets (snap within reach); let go (or click) on one to connect.
 */
export function TaskWires({ tasks, orbs, focus, mine, onConnect, onWiring, straight }: {
  tasks: Task[];
  orbs: Orb[];
  focus: string | null;
  /** my own balls (they get a plug) */
  mine: Set<string>;
  onConnect: (orb: string, task: string) => void;
  onWiring: (on: boolean) => void;
  /** arranged lanes: taut, dead-straight cables */
  straight?: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const plugs = useRef(new Map<string, HTMLButtonElement>());
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState<Drag | null>(null);
  // a plain click on a plug: a small list of the tasks, one tap wires it
  const [menu, setMenu] = useState<{ orb: string; x: number; y: number } | null>(null);
  const wired = useMemo(() => orbs.filter((o) => o.task && tasks.some((t) => t.id === o.task)), [orbs, tasks]);
  const pluggable = useMemo(() => (tasks.length ? orbs.filter((o) => mine.has(o.id)) : []), [orbs, tasks, mine]);
  const num = useMemo(() => new Map(tasks.map((t) => [t.id, t.num])), [tasks]);
  const focusHas = !!focus && wired.some((o) => o.task === focus);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    let raf = 0, last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 40 || document.hidden) return;
      last = now;
      const box = el.getBoundingClientRect();
      // the sphere itself (not the sphere + its name), so a cable meets the ball's middle
      const ballRect = (id: string) => (document.querySelector(`[data-orb="${id}"] .orb-body`) ?? document.querySelector(`[data-orb="${id}"] .orb`))?.getBoundingClientRect();
      const rowEnd = (task: string) => {
        const d = document.querySelector(`[data-task-dot="${task}"]`)?.getBoundingClientRect();
        const row = document.querySelector(`[data-task-row="${task}"]`)?.getBoundingClientRect();
        return d && d.width && row && row.width ? { x: row.right - box.left + 2, y: d.top + d.height / 2 - box.top } : null;
      };
      let s = CABLE_DEFS;
      let k = 0;
      for (const o of wired) {
        const a = ballRect(o.id);
        if (!a || !a.width) continue;
        const ox = a.left + a.width / 2 - box.left, oy = a.top + a.height / 2 - box.top;
        const hue = hueFor(o.from ?? o.id);
        const op = !focusHas || focus === o.task ? 1 : 0.18;
        const end = rowEnd(o.task!);
        if (end) {
          // the cable leaves the ball from its side facing the task
          const ang = Math.atan2(end.y - oy, end.x - ox), r = a.width * 0.44;
          const bx = ox + Math.cos(ang) * r, by = oy + Math.sin(ang) * r;
          s += drawCable(straight ? `M${end.x.toFixed(1)} ${end.y.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}` : cable(end.x, end.y, bx, by, now, k++ * 1.7), hue, op);
          s += `<g opacity="${op}"><rect x="${end.x - 3}" y="${end.y - 4}" width="7" height="8" rx="2" class="tw-pin"/><circle cx="${bx}" cy="${by}" r="5" class="tw-pin"/><circle cx="${bx}" cy="${by}" r="2.6" fill="hsl(${hue} 70% 58%)"/></g>`;
        }
        const n = num.get(o.task!);
        const w = n && n > 9 ? 34 : 28;
        const lx = a.left - box.left + a.width * 0.06, ly = a.top - box.top + a.height * 0.04;
        // in arranged lanes the row already says which task: no tag crowding the names
        if (!straight) s += `<g opacity="${op}" transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)})"><rect x="-4" y="-12" width="${w}" height="19" rx="6" class="tw-tagbg"/><rect x="-4" y="-12" width="3" height="19" rx="1.5" fill="hsl(${hue} 70% 58%)"/><text x="${w / 2 - 2}" y="2" text-anchor="middle" class="tw-tag">T${n}</text></g>`;
      }
      // the cable being plugged in right now
      const d = drag.current;
      if (d) {
        const a = ballRect(d.orb);
        if (a && a.width) {
          const ox = a.left + a.width / 2 - box.left, oy = a.top + a.height / 2 - box.top;
          const snap = d.snap ? rowEnd(d.snap) : null;
          const ex = snap ? snap.x : d.x - box.left, ey = snap ? snap.y : d.y - box.top;
          const ang = Math.atan2(ey - oy, ex - ox), r = a.width * 0.44;
          s += drawCable(cable(ex, ey, ox + Math.cos(ang) * r, oy + Math.sin(ang) * r, now, 3), null, 1);
          s += `<circle cx="${ex}" cy="${ey}" r="${snap ? 7 : 5}" class="tw-pin${snap ? " hot" : ""}"/>`;
        }
      }
      el.innerHTML = s;
      // plugs ride along with their balls
      for (const [id, btn] of plugs.current) {
        const a = ballRect(id);
        if (!a || !a.width) {
          btn.style.opacity = "0";
          continue;
        }
        btn.style.opacity = "";
        // on the sphere's right edge, level with its middle: clear of the delete / type / number badges
        btn.style.transform = `translate(${(a.right - box.left + 12).toFixed(1)}px, ${(a.top - box.top + a.height / 2).toFixed(1)}px)`;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [wired, num, focus, focusHas, straight]);

  // magnet: the nearest task row within reach pulls the cable in
  const nearest = (x: number, y: number) => {
    let best: string | null = null, bd = 200;
    document.querySelectorAll<HTMLElement>("[data-task-row]").forEach((row) => {
      const r = row.getBoundingClientRect();
      const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
      const dd = Math.hypot(dx, dy);
      if (dd < bd) (bd = dd), (best = row.dataset.taskRow!);
    });
    return best;
  };
  const set = (d: Drag | null) => {
    drag.current = d;
    setDragging(d);
    document.querySelectorAll(".tb-row.magnet").forEach((r) => r.classList.remove("magnet"));
    if (d?.snap) document.querySelector(`[data-task-row="${d.snap}"]`)?.classList.add("magnet");
  };
  const start = (orb: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    set({ orb, x: e.clientX, y: e.clientY, moved: 0, snap: null });
    onWiring(true);
  };
  const end = (connect: boolean) => {
    const d = drag.current;
    set(null);
    onWiring(false);
    if (connect && d?.snap) onConnect(d.orb, d.snap);
  };
  useEffect(() => {
    if (!dragging) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && end(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const snapTask = dragging?.snap ? tasks.find((t) => t.id === dragging.snap) : null;

  return (
    <>
    <div className="wire-layer">
      <svg ref={svg} className="task-wires" aria-hidden />
    </div>
    <div className="plug-layer">
      {pluggable.map((o) => (
        <button
          key={o.id}
          ref={(b) => {
            if (b) plugs.current.set(o.id, b);
            else plugs.current.delete(o.id);
          }}
          className={`wire-plug${o.task ? " on" : ""}`}
          onPointerDown={(e) => start(o.id, e)}
          aria-label={o.task ? `Rewire ${o.name} to another task` : `Wire ${o.name} to a task`}
          title={o.task ? "Rewire to another task" : "Wire to a task"}
        >
          <LuPlus aria-hidden />
        </button>
      ))}
    </div>
      {menu && createPortal(
        <div className="wire-menu-catch" onPointerDown={() => setMenu(null)}>
          <div
            className="wire-menu lg"
            role="menu"
            style={{ left: Math.min(menu.x, window.innerWidth - 270), top: Math.min(menu.y, window.innerHeight - 60 - tasks.length * 44) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="mono">Wire {orbs.find((o) => o.id === menu.orb)?.name ?? "this file"} to</span>
            {tasks.map((t) => (
              <button
                key={t.id}
                role="menuitem"
                className={`lg-press${orbs.find((o) => o.id === menu.orb)?.task === t.id ? " on" : ""}`}
                onClick={() => {
                  setMenu(null);
                  onConnect(menu.orb, t.id);
                }}
              >
                <i className="task-dot step-dot" data-step={stepOf(t)} aria-hidden />
                <b className="mono">Task {t.num}</b>
                <span>{t.text}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
      {dragging && (
        <div
          className="wire-catch"
          onPointerMove={(e) => {
            const d = drag.current!;
            set({ ...d, x: e.clientX, y: e.clientY, moved: d.moved + Math.abs(e.movementX) + Math.abs(e.movementY), snap: nearest(e.clientX, e.clientY) });
          }}
          onPointerUp={(e) => {
            const d = drag.current!;
            const snap = nearest(e.clientX, e.clientY);
            if (snap) {
              drag.current = { ...d, snap };
              return end(true);
            }
            // let go in empty space after a real drag: cancel; a plain click opens the task list instead
            end(false);
            if (d.moved <= 12) {
              const b = plugs.current.get(d.orb)?.getBoundingClientRect();
              setMenu({ orb: d.orb, x: b ? b.right + 8 : e.clientX + 8, y: b ? b.top - 6 : e.clientY - 6 });
            }
          }}
        >
          <span className="wire-hint mono" style={{ transform: `translate(${dragging.x + 18}px, ${dragging.y + 14}px)` }}>
            {snapTask ? `Connect to Task ${snapTask.num}` : "Bring it to a task"}
          </span>
        </div>
      )}
    </>
  );
}
