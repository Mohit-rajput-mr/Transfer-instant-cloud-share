"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LuArchive, LuArrowDown, LuArrowUp, LuRows3, LuCheck, LuChevronDown, LuFolderUp, LuLock, LuPaperclip, LuPencil, LuPlus, LuRoute, LuSettings2, LuTrash2, LuUserCheck, LuX } from "react-icons/lu";
import { PRO_FOR_ALL, STAGES, TASK_LIVES, TASK_MAX, dropPro, forMe, isCancel, isMyTask, parseTask, proCode, redeemPro, type Task } from "@/lib/tasks";
import { hueFor } from "@/lib/bubbles";
import { formatBytes, type Orb } from "@/lib/client";
import { isLow } from "@/lib/perf";

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
  /** your task picked up off the panel (drag it, or hold a finger on it) to be thrown into a space */
  onGrab?: (t: Task, x: number, y: number) => void;
};

const DEFAULT_ROUTE = ["In progress", "In review", "Done"];
/** 0 grey (not started) · 1 orange (first step) · 2 blue (second step) · 3 green (third step on, or done) · 4 red (cancelled) */
export const stepOf = (t: Task) =>
  t.stage >= 0 && isCancel(t.route[t.stage]) ? 4 : t.doneAt ? 3 : t.route.length && t.stage >= 0 ? (t.stage === 0 ? 1 : t.stage === 1 ? 2 : 3) : 0;

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

export type TaskGroup = { key: string; mine: boolean; name: string; tasks: Task[] };
/** one panel per person who writes tasks (yours first), never merged */
export function taskGroups(tasks: Task[]): TaskGroup[] {
  const m = new Map<string, TaskGroup>();
  for (const t of tasks) {
    const mineT = isMyTask(t.id);
    const key = mineT ? "me" : t.from || t.by || "someone";
    const g = m.get(key) ?? { key, mine: mineT, name: mineT ? "Your tasks" : `${t.by || "Someone"}'s tasks`, tasks: [] };
    g.tasks.push(t);
    m.set(key, g);
  }
  return [...m.values()].sort((a, b) => Number(b.mine) - Number(a.mine));
}

/**
 * Tasks, one line each: a big orange dot, "TASK 1", the line, who it is for, and a tick anyone can set.
 * Files wired to a task hang off its dot (TaskWires). Tapping a task shows only its files.
 */
export default function TaskBoard(props: { tasks: Task[]; orbs: Orb[]; me: string; focus: string | null; onFocus: (id: string | null) => void; onClose: () => void; /** a cable is being plugged in: the tasks light up as targets */ wiring?: boolean; arranged?: boolean; onArrange?: () => void; /** arranged: each row is a lane this tall, its files on the same line */ laneH?: number; /** the Tasks button in the bar opened the new-task box */ composing?: boolean; onComposed?: () => void; /** hide every task panel with its files (this device) */ onArchive?: () => void; /** the map (lib/map.ts): each panel's centre in the world */ spots?: Map<string, { x: number; y: number }> } & TaskActs) {
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  const [taking, setTaking] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [routing, setRouting] = useState<string | null>(null);
  // the extras (how long tasks stay, go private) stay out of the way until asked for
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
  // the row's tools: on a computer they float just outside the board, beside the row, so they never cover
  // the line (or the box you are typing in); on a phone they sit under the row
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 720px)");
    const on = () => setNarrow(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keep = () => hideT.current && (clearTimeout(hideT.current), (hideT.current = null));
  const showFor = (id: string, el: HTMLElement) => {
    keep();
    const r = el.getBoundingClientRect();
    const board = el.closest(".task-board")?.getBoundingClientRect();
    setHover({ id, x: (board?.right ?? r.right) + 8, y: r.top + 6 });
  };
  const hideSoon = () => {
    keep();
    hideT.current = setTimeout(() => setHover(null), 260);
  };
  useEffect(() => {
    if (!hover) return;
    const off = (e: Event) => ((e.target as Element)?.classList?.contains("tb-list") || (e.target as Element)?.classList?.contains("task-boards")) && setHover(null);
    document.addEventListener("scroll", off, true);
    return () => document.removeEventListener("scroll", off, true);
  }, [hover]);
  const acts = (t: Task, i: number) => (
    <>
                    <button onClick={() => props.onAttach(t, "files")} aria-label={`Attach files to task ${t.num}`} title="Attach files"><LuPaperclip /></button>
                    <button onClick={() => props.onAttach(t, "folder")} aria-label={`Attach a folder to task ${t.num}`} title="Attach a folder"><LuFolderUp /></button>
                    {isMyTask(t.id) && !t.doneAt && <button onClick={() => (setTaking(taking === t.id ? null : t.id), setWho(t.assignee ?? props.me))} aria-label={`Assign task ${t.num}`} title={t.assignee ? "Reassign" : "Take it / assign"}><LuUserCheck /></button>}
                    <button className={routing === t.id ? "on" : ""} onClick={() => setRouting(routing === t.id ? null : t.id)} aria-label={`Route of task ${t.num}`} title={isMyTask(t.id) ? "Route: edit and update" : "Route: see progress"}><LuRoute /></button>
                    {isMyTask(t.id) && <button onClick={() => (setEditing(t.id), setDraft(t.text))} aria-label={`Edit task ${t.num}`} title="Edit"><LuPencil /></button>}
                    {isMyTask(t.id) && i > 0 && <button onClick={() => props.onMove(t, -1)} aria-label={`Move task ${t.num} up`} title="Move up"><LuArrowUp /></button>}
                    {isMyTask(t.id) && i < props.tasks.length - 1 && <button onClick={() => props.onMove(t, 1)} aria-label={`Move task ${t.num} down`} title="Move down"><LuArrowDown /></button>}
                    {isMyTask(t.id) && <button className="kill" onClick={() => props.onBurn(t)} aria-label={`Remove task ${t.num}`} title="Remove"><LuTrash2 /></button>}
    </>
  );
  // the tick walks the route: grey → orange (first step) → blue → green (done). Only the writer can move it;
  // everyone else ticks it done / undone as before.
  const tap = (t: Task) => {
    if (!isMyTask(t.id)) return; // only the task's writer moves it
    if (stepOf(t) >= 3) return void props.onEdit(t, { stage: -1 }).then(() => t.doneAt && props.onTick(t, false)).catch(() => {});
    const route = t.route.length ? t.route : DEFAULT_ROUTE;
    // on the last step of a short route the next tap finishes it
    if (t.stage >= route.length - 1) return props.onTick(t, true);
    props.onEdit(t, { route, stage: t.stage + 1 }).catch(() => {});
  };
  const total = props.tasks.length;
  const parsed = parseTask(line);

  // phones start folded (one slim row); wide screens open
  useEffect(() => {
    // (on the map every panel shows its tasks: there is room, you zoom instead)
    if (window.matchMedia("(max-width: 720px)").matches && !mappedAtStart.current) setOpen(false);
  }, []);

  const add = async () => {
    if (!line.trim() || busy) return;
    setBusy(true);
    try {
      await props.onAdd(line, pro ? life : 30);
      setLine("");
      props.onComposed?.();
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

  const groups = useMemo(() => taskGroups(props.tasks), [props.tasks]);
  // picking a task up: a mouse drags it off the row; a finger holds still on it for a moment (a swipe still moves the map)
  const grabbed = useRef(false);
  const startGrab = (t: Task, e: React.PointerEvent) => {
    if (!props.onGrab || !isMyTask(t.id) || e.button !== 0 || editing === t.id) return;
    const mouse = e.pointerType === "mouse", id = e.pointerId, x0 = e.clientX, y0 = e.clientY;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const done = () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", done);
      window.removeEventListener("pointercancel", done);
    };
    const go = (x: number, y: number) => {
      done();
      grabbed.current = true;
      setTimeout(() => (grabbed.current = false), 500);
      setHover(null);
      props.onGrab!(t, x, y);
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id || Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) return;
      if (mouse) go(ev.clientX, ev.clientY);
      else done();
    };
    if (!mouse)
      timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "light" }));
        go(x0, y0);
      }, 380);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", done);
    window.addEventListener("pointercancel", done);
  };
  const mappedAtStart = useRef(!!props.spots);
  const mapped = !!props.spots;
  const [shut, setShut] = useState<Set<string>>(new Set());
  const row = (t: Task, i: number) => {
              const w = wired.get(t.id) ?? [];
              const n = w.reduce((a, x) => a + x.n, 0);
              const mine = forMe(t, props.me);
              return (
                <li
                  key={t.id}
                  data-task-row={t.id}
                  onPointerEnter={(e) => !narrow && editing !== t.id && routing !== t.id && showFor(t.id, e.currentTarget)}
                  onPointerLeave={() => !narrow && hideSoon()}
                  className={`tb-row${stepOf(t) === 3 ? " done" : stepOf(t) === 4 ? " cancel" : ""}${props.focus === t.id ? " focus" : ""}${mine && !t.doneAt ? " forme" : ""}`}
                >
                  <button className="tb-tick" disabled={!isMyTask(t.id)} onClick={() => tap(t)} aria-label={t.doneAt ? `Untick task ${t.num}` : `Move task ${t.num} to its next step`} title={!isMyTask(t.id) ? `${t.stage >= 0 && t.route[t.stage] ? t.route[t.stage] : t.doneAt ? "Done" : "Not started"} · only its writer moves it` : t.doneAt ? `Done${t.doneBy ? ` by ${t.doneBy}` : ""}` : t.stage >= 0 && t.route[t.stage] ? `${t.route[t.stage]} · tap for the next step` : "Tap: first step"}>
                    <i className="task-dot big" data-task-dot={t.id} data-step={stepOf(t)}>{(t.doneAt || t.stage >= 0) && <LuCheck aria-hidden />}</i>
                  </button>
                  {editing === t.id ? (
                    <form className="tb-edit" onSubmit={(e) => { e.preventDefault(); if (draft.trim() && draft.trim() !== t.text) props.onEdit(t, { text: draft.trim() }).catch(() => {}); setEditing(null); }}>
                      <span className="tb-num mono">Task {t.num}</span>
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value.slice(0, TASK_MAX))} onKeyDown={(e) => e.key === "Escape" && setEditing(null)} aria-label={`Edit task ${t.num}`} />
                      <button type="submit" aria-label="Save"><LuCheck /></button>
                    </form>
                  ) : (
                  <button
                    className={`tb-main${props.onGrab && isMyTask(t.id) ? " grabbable" : ""}`}
                    onPointerDown={(e) => startGrab(t, e)}
                    onClick={() => !grabbed.current && props.onFocus(props.focus === t.id ? null : t.id)}
                    title={props.focus === t.id ? "Show everything" : props.onGrab && isMyTask(t.id) ? "Show only this task's files · drag it to throw it into a space" : "Show only this task's files"}
                  >
                    <span className="tb-num mono">Task {t.num}</span>
                    <span className="tb-text">{t.text}</span>
                    <span className="tb-meta mono">
                      {t.stage >= 0 && t.route[t.stage] && <em className="tb-stage">{t.route[t.stage]} · {t.stage + 1}/{t.route.length}</em>}
                      {stepOf(t) === 4 ? "cancelled" : t.doneAt ? `done${t.doneBy ? ` · ${t.doneBy}` : ""}` : t.assignee ? (mine ? "for you" : `@${t.assignee}`) : t.by ? `from ${t.by}` : "open"}
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
                  {narrow ? <span className="tb-acts">{acts(t, i)}</span> : null}
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
                  {routing === t.id && <RoutePanel t={t} mine={isMyTask(t.id)} onEdit={(c) => props.onEdit(t, c)} onClose={() => setRouting(null)} />}
                  {taking === t.id && (
                    <form className="tb-take" onSubmit={(e) => { e.preventDefault(); props.onTake(t, who.trim()); setTaking(null); }}>
                      <input autoFocus value={who} onChange={(e) => setWho(e.target.value.slice(0, 24))} placeholder="Name (empty = nobody)" />
                      <button type="submit" className="mono">{who.trim() && who.trim().toLowerCase() === props.me.toLowerCase() ? "Take it" : "Assign"}</button>
                      <button type="button" aria-label="Cancel" onClick={() => setTaking(null)}><LuX /></button>
                    </form>
                  )}
                </li>
              );
              };

  return (
    <div className={`task-boards${props.laneH ? " lanes" : ""}${props.wiring ? " wiring" : ""}${mapped ? " mapped" : ""}`} style={props.laneH ? ({ "--lane-h": `${props.laneH}px` } as CSSProperties) : undefined}>
      {(props.composing || !total) && portalIf(mapped, (
        <form className={`task-board lg tb-compose${mapped ? " floating" : ""}`} onSubmit={(e) => { e.preventDefault(); add(); }}>
          <div className="tb-compose-head">
            <b>New task</b>
            <button type="button" className="tr-close" onClick={() => (total ? props.onComposed?.() : props.onClose())} aria-label="Close"><LuX /></button>
          </div>
          <div className="tb-add">
            <i className="task-dot ghost" aria-hidden />
            <input
              ref={input}
              autoFocus
              value={line}
              onChange={(e) => setLine(e.target.value.slice(0, TASK_MAX + 26))}
              placeholder="Write the task… (@name to assign)"
              aria-label="New task"
              enterKeyHint="done"
            />
            {parsed.assignee && <span className="tb-for mono">@{parsed.assignee}</span>}
          </div>
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
        </form>
      ))}
      {groups.map((g, gi) => {
        // on the map, a panel off screen is not drawn
        if (mapped && !props.spots!.has(`t:${g.key}`)) return null;
        const isOpen = (open || !!props.wiring) && !shut.has(g.key);
        const gDone = g.tasks.filter((t) => stepOf(t) === 3).length;
        return (
          <aside key={g.key} data-map-key={`t:${g.key}`} style={mapped ? spotStyle(props.spots!.get(`t:${g.key}`)) : undefined} className={`task-board lg${isOpen ? " open" : ""}${props.wiring ? " wiring" : ""}${props.laneH ? ` lanes${props.laneH < 62 ? " tight" : ""}` : ""}${g.mine ? " mine" : " theirs"}`} aria-label={g.name}>
            <button className="tb-head" onClick={() => (narrow && gi === 0 && groups.length === 1 ? setOpen((o) => !o) : setShut((x) => { const n = new Set(x); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); if (!open) setOpen(true); return n; }))} aria-expanded={isOpen}>
              <i className="task-dot" aria-hidden />
              <b>{g.mine ? "Tasks" : g.name}</b>
              <span className="mono dim">{gDone}/{g.tasks.length} done</span>
              <span className="tb-bar" aria-hidden><i style={{ transform: `scaleX(${g.tasks.length ? gDone / g.tasks.length : 0})` }} /></span>
              <LuChevronDown className={`tb-chev${isOpen ? " up" : ""}`} aria-hidden />
            </button>
            {gi === 0 && props.onArchive && (
              <button className="tb-archive" onClick={props.onArchive} aria-label="Archive tasks" title="Archive: hide the tasks and their files (Tasks in the bar brings them back)"><LuArchive /></button>
            )}
            {gi === 0 && props.onArrange && (
              <button className={`tb-arrange mono${props.arranged ? " on" : ""}`} onClick={props.onArrange} aria-pressed={!!props.arranged} title={props.arranged ? "Back to the free-floating void" : "Line every file up in its task's lane"}>
                <LuRows3 aria-hidden />{props.arranged ? "Arranged" : "Arrange"}
              </button>
            )}
            {isOpen && <ol className="tb-list">{g.tasks.map((t) => row(t, props.tasks.indexOf(t)))}</ol>}
          </aside>
        );
      })}
          {!narrow && hover && editing !== hover.id && routing !== hover.id && (() => {
            const i = props.tasks.findIndex((x) => x.id === hover.id);
            if (i < 0) return null;
            return createPortal(
              <span className="tb-acts float" style={{ left: hover.x, top: hover.y }} onPointerEnter={keep} onPointerLeave={hideSoon}>
                {acts(props.tasks[i], i)}
              </span>,
              document.body,
            );
          })()}
    </div>
  );
}

/** on the map a panel sits centred on its spot (hidden until it has one) */
const spotStyle = (p?: { x: number; y: number }): CSSProperties => (p ? { left: p.x, top: p.y } : { visibility: "hidden" });
/** the new-task box floats over the map (it is not a place in the world) */
const portalIf = (on: boolean, el: React.ReactElement) => (on && typeof document !== "undefined" ? createPortal(el, document.body) : el);

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
function RoutePanel({ t, mine, onEdit, onClose }: { t: Task; mine: boolean; onEdit: (c: { text?: string; route?: string[]; stage?: number }) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(t.text);
  const [stages, setStages] = useState<string[]>(t.route);
  const [saved, setSaved] = useState(false);
  // follow changes from other devices while nothing is being typed here
  const typing = useRef(false);
  useEffect(() => {
    if (!typing.current) setStages(t.route), setTitle(t.text);
  }, [t.route, t.text]);
  const last = (i: number) => [...t.log].reverse().find((l) => l.i === i);
  // a tap anywhere outside (or Escape) saves what was typed and closes the panel
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const shut = () => {
      const a = document.activeElement as HTMLElement | null;
      if (a && box.current?.contains(a)) a.blur(); // fires the save for a half-typed name
      closeRef.current();
    };
    const down = (e: PointerEvent) => {
      const el = e.target as Element;
      if (box.current?.contains(el) || el.closest?.('[aria-label^="Route of task"]')) return;
      shut();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && shut();
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key);
    };
  }, []);
  const flash = () => (setSaved(true), setTimeout(() => setSaved(false), 1200));
  // every change goes out the moment it is made (the list updates on screen instantly)
  const save = (c: { text?: string; route?: string[]; stage?: number }) => {
    typing.current = false;
    onEdit(c).catch(() => {});
    flash();
  };
  const cleanOf = (l: string[]) => l.map((x) => x.trim()).filter(Boolean);
  const setRoute = (next: string[]) => {
    setStages(next);
    const c = cleanOf(next);
    if (c.join("|") !== t.route.join("|")) save({ route: c, stage: Math.min(t.stage, c.length - 1) });
  };
  const commitTitle = () => title.trim() && title.trim() !== t.text && save({ text: title.trim() });
  const commitStages = () => setRoute(stages);
  const done = (i: number) => i < t.stage || (i === t.stage && i === t.route.length - 1);

  if (!mine)
    return (
      <div className="tb-route" ref={box}>
        <div className="tr-head"><span className="mono">Route · only its writer moves it</span><button className="tr-close" onClick={onClose} aria-label="Close route"><LuX /></button></div>
        {!t.route.length && <p className="mono dim">No route yet.</p>}
        <ol className="tr-line">
          {t.route.map((r, i) => {
            const l = last(i);
            return (
              <li key={i} className={i < t.stage ? "past" : i === t.stage ? "now" : ""} data-step={i === t.stage ? stepOf(t) : undefined}>
                <i aria-hidden>{done(i) || i === t.stage ? <LuCheck /> : null}</i>
                <b>{r}</b>
                <span className="mono">{l ? `${l.by ?? "someone"} · ${ago(l.at)}` : ""}</span>
              </li>
            );
          })}
        </ol>
      </div>
    );

  return (
    <div className="tb-route" ref={box}>
      <div className="tr-head">
        <span className="mono">{saved ? "Saved ✓" : "Changes save instantly"}</span>
        <button className="tr-close" onClick={onClose} aria-label="Close route"><LuX /></button>
      </div>
      <input
        className="tr-title-in"
        value={title}
        onFocus={() => (typing.current = true)}
        onChange={(e) => setTitle(e.target.value.slice(0, 140))}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
        aria-label="Task line"
      />
      {stages.length > 0 && <span className="mono dim tr-hint">Tap a step to move the task there</span>}
      <ol className="tr-line edit">
        {stages.map((r, i) => {
          const l = last(i);
          const cur = i === t.stage;
          return (
            <li key={i} className={i < t.stage ? "past" : cur ? "now" : ""} data-step={cur ? stepOf(t) : undefined}>
              <button onClick={() => save({ route: cleanOf(stages), stage: cur ? i - 1 : i })} aria-label={cur ? `Undo ${r}` : `Move to ${r}`} title={cur ? "Tap again to step back" : `Move to ${r}`}>
                <i aria-hidden>{done(i) || cur ? <LuCheck /> : null}</i>
              </button>
              <input
                value={r}
                placeholder="Step name"
                onFocus={() => (typing.current = true)}
                onChange={(e) => setStages((s) => s.map((x, k) => (k === i ? e.target.value.slice(0, 40) : x)))}
                onBlur={commitStages}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                aria-label={`Step ${i + 1}`}
              />
              <span className="mono">{l ? ago(l.at) : ""}</span>
              <button className="tr-x" onClick={() => setRoute(stages.filter((_, k) => k !== i))} aria-label={`Remove ${r}`}><LuX /></button>
            </li>
          );
        })}
      </ol>
      {stages.length < 8 && (
        <div className="tr-presets">
          <span className="mono dim">{stages.length ? "Add a step" : "Build the route: tap steps in order"}</span>
          {STAGES.filter((x) => !stages.includes(x)).slice(0, 6).map((x) => (
            <button key={x} className="mono" onClick={() => setRoute([...stages, x])}><LuPlus aria-hidden />{x}</button>
          ))}
          <button className="mono" onClick={() => (typing.current = true, setStages((s) => [...s, ""]))}><LuPlus aria-hidden />Your own</button>
        </div>
      )}
      <div className="tr-go">
        {t.stage >= 0 && <button className="mono" onClick={() => save({ stage: -1 })}>Back to not started</button>}
        {!isCancel(t.route[t.stage]) && (
          <button
            className="mono tr-cancel"
            onClick={() => {
              const base = cleanOf(stages).filter((x) => !isCancel(x));
              const route = [...base, "Cancelled"].slice(-8);
              setStages(route);
              save({ route, stage: route.length - 1 });
            }}
          >
            Cancel order
          </button>
        )}
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
    let raf = 0, last = 0, drawn = "";
    // a low-end device: taut cables, fewer redraws (lib/perf.ts)
    const low = isLow();
    const taut = straight || low;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < (low ? 90 : 40) || document.hidden) return;
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
          s += drawCable(taut ? `M${end.x.toFixed(1)} ${end.y.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}` : cable(end.x, end.y, bx, by, now, k++ * 1.7), hue, op);
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
      // nothing moved: leave the SVG alone (rebuilding it is what costs)
      if (s !== drawn) el.innerHTML = drawn = s;
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
