"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { LuCopy, LuLayoutDashboard, LuMaximize, LuMessageCircle, LuMinus, LuPencil, LuPlus, LuSearch, LuShare2, LuTrash2, LuX } from "react-icons/lu";
import { createPortal } from "react-dom";
import { Pop } from "./Spaces";
import EmojiPicker from "./EmojiPicker";
import { BUBBLE_MAX, bubbleName, hueFor, isMine, looksLikeName, senderOf, splitLinks, type Bubble } from "@/lib/bubbles";
import { formatClock } from "@/lib/client";
import { BUBBLE_LIFE as LIFE_MIN, BUBBLE_LIVES } from "@/lib/limits";

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
};
const initials = (s: string) => s.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
/** the "new" mark on added text fades out after this */
const NEW_FOR = 10 * 60_000;

export type Stack = { key: string; name: string; hue: number; mine: boolean; items: Bubble[]; first: number; last: number };
export type BubbleChange = { id: string; mode: "append" | "edit" };

/** One stack per person (their device), with one steady colour each. */
export function useStacks(bubbles: Bubble[]) {
  return useMemo(() => {
    const m = new Map<string, Stack>();
    for (const b of bubbles) {
      const key = senderOf(b);
      const s = m.get(key) ?? { key, name: b.by || "Someone", hue: hueFor(key), mine: false, items: [], first: Infinity, last: 0 };
      s.items.push(b);
      const t = Date.parse(b.createdAt), u = Date.parse(b.updatedAt ?? b.createdAt);
      s.first = Math.min(s.first, t);
      s.last = Math.max(s.last, t, u);
      if (isMine(b.id)) s.mine = true;
      m.set(key, s);
    }
    for (const s of m.values()) s.items.sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt));
    return [...m.values()];
  }, [bubbles]);
}

type Actions = { now: number; toast: (m: string) => void; onBurn: (id: string) => void; onChange: (c: BubbleChange) => void };

async function copyText(t: string, toast: (m: string) => void) {
  try {
    await navigator.clipboard.writeText(t);
    toast("Copied");
  } catch {
    toast("Couldn't copy");
  }
}
async function shareText(t: string, toast: (m: string) => void) {
  if (navigator.share) {
    try {
      await navigator.share({ text: t });
    } catch {}
    return;
  }
  copyText(t, toast);
}

// ---- an edit, shown: for its first seconds the words that changed blink white to green, marked "edited" ----
const EDIT_FOR = 5000;
const lastText = new Map<string, string>();
const edits = new Map<string, { at: number; changed: Set<number> }>();
/** which words of `now` are new compared to `was` (longest common run of words kept, the rest changed) */
function changedWords(was: string, now: string) {
  const a = was.split(/\s+/).filter(Boolean), b = now.split(/\s+/).filter(Boolean);
  if (a.length * b.length > 250_000) return new Set(b.map((_, i) => i));
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Set<number>();
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) (keep.add(j), i++, j++);
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return new Set(b.map((_, i) => i).filter((i) => !keep.has(i)));
}
/** the words this device just saw change in this bubble (rewritten, not added to), for EDIT_FOR */
function useEditMarks(b: Bubble) {
  const was = lastText.get(b.id);
  if (was !== undefined && was !== b.text && b.editedAt && b.added == null) edits.set(b.id, { at: Date.now(), changed: changedWords(was, b.text) });
  lastText.set(b.id, b.text);
  const e = edits.get(b.id);
  const live = e && Date.now() - e.at < EDIT_FOR ? e : null;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => tick((n) => n + 1), EDIT_FOR - (Date.now() - live.at) + 50);
    return () => clearTimeout(t);
  }, [live]);
  return live?.changed ?? null;
}

function Text({ b, now }: { b: Bubble; now: number }) {
  const fresh = b.added != null && b.added < b.text.length && now - Date.parse(b.updatedAt ?? b.createdAt) < NEW_FOR;
  const links = (t: string, k: string) => splitLinks(t).map((p, i) => (p.href ? <a key={k + i} href={p.href} target="_blank" rel="noopener noreferrer nofollow">{p.t}</a> : <span key={k + i}>{p.t}</span>));
  const changed = useEditMarks(b);
  if (changed?.size) {
    let w = -1;
    return (
      <p>
        <i className="bub-edited mono">edited</i>
        {b.text.split(/(\s+)/).map((part, i) => {
          if (!part || /^\s+$/.test(part)) return <span key={i}>{part}</span>;
          w++;
          return changed.has(w) ? <mark key={i} className="bub-chg">{part}</mark> : <span key={i}>{part}</span>;
        })}
      </p>
    );
  }
  if (!fresh) return <p>{links(b.text, "a")}</p>;
  return (
    <p>
      {links(b.text.slice(0, b.added!), "a")}
      <mark className="bub-new">
        <i className="mono">new</i>
        {links(b.text.slice(b.added!).replace(/^\n/, ""), "b")}
      </mark>
    </p>
  );
}

/** A bubble burns when its life (30 min by default, up to 8 h) runs out: a ring drains down to it, red in the last 5 min. */
const BUBBLE_LIFE = LIFE_MIN * 60_000;
function BurnTimer({ b, now }: { b: Bubble; now: number }) {
  const left = Math.max(0, Date.parse(b.expiresAt) - now);
  const life = Math.max(60_000, Date.parse(b.expiresAt) - Date.parse(b.createdAt)) || BUBBLE_LIFE;
  const f = Math.min(1, left / life);
  const late = left < 5 * 60_000;
  return (
    <span className={`bub-timer mono${late ? " late" : ""}`} title={`Burns in ${formatClock(left)}`} aria-label={`Burns in ${Math.ceil(left / 60_000)} minutes`} style={{ "--f": f } as CSSProperties}>
      <svg viewBox="0 0 20 20" aria-hidden><circle cx="10" cy="10" r="8" /><circle className="fill" cx="10" cy="10" r="8" pathLength="100" /></svg>
      {formatClock(left)}
    </span>
  );
}

export function BubbleItem({ b, now, toast, onBurn, onChange }: { b: Bubble } & Actions) {
  const mine = isMine(b.id);
  return (
    <article className={`bub${b.added != null ? " grew" : ""}`}>
      <BurnTimer b={b} now={now} />
      <Text b={b} now={now} />
      <footer>
        <span className="mono dim">
          {ago(b.createdAt, now)}
          {b.editedAt ? " · edited" : b.added != null ? " · updated" : ""}
        </span>
        <span className="bub-acts">
          {mine && <button onClick={() => onChange({ id: b.id, mode: "append" })} aria-label="Add more" title="Add more"><LuPlus /></button>}
          {mine && <button onClick={() => onChange({ id: b.id, mode: "edit" })} aria-label="Edit" title="Edit"><LuPencil /></button>}
          <button onClick={() => copyText(b.text, toast)} aria-label="Copy" title="Copy"><LuCopy /></button>
          <button onClick={() => shareText(b.text, toast)} aria-label="Share" title="Share"><LuShare2 /></button>
          {mine && <button className="kill" onClick={() => onBurn(b.id)} aria-label="Burn this bubble" title="Burn"><LuTrash2 /></button>}
        </span>
      </footer>
    </article>
  );
}

function StackHead({ s, onClick }: { s: Stack; onClick?: () => void }) {
  return (
    <header onClick={onClick} className={onClick ? "tap" : undefined}>
      <i className="bub-av" aria-hidden>{initials(s.name)}</i>
      <b>{s.mine ? `${s.name} (you)` : s.name}</b>
      <span className="mono dim">{s.items.length} {s.items.length > 1 ? "bubbles" : "bubble"}</span>
    </header>
  );
}

const useNarrow = () => {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
};

/**
 * Bubbles in the void: people take turns right and left (you first, on the right), a couple each side,
 * newest bubble on top. More people than fit → the board, which holds everyone.
 */
export default function BubbleBoard(props: { bubbles: Bubble[]; onOpenBoard: (focus: string | null) => void; /** the left side is taken (tasks): everyone on the right */ oneSide?: boolean; /** the map (lib/map.ts): each person's stack centred on its spot in the world */ spots?: Map<string, { x: number; y: number }> } & Actions) {
  const stacks = useStacks(props.bubbles);
  const narrow = useNarrow();
  if (!stacks.length) return null;
  if (props.spots) {
    const spots = props.spots;
    return (
      <>
        {stacks.map((s, i) => {
          const p = spots.get(`b:${s.key}`);
          // off screen (or not placed yet): not drawn
          if (!p) return null;
          return (
            <section key={s.key} data-map-key={`b:${s.key}`} className={`bub-stack on-map${s.mine ? " mine" : ""}`} style={{ "--bh": s.hue, "--i": i, left: p.x, top: p.y } as CSSProperties}>
              <StackHead s={s} onClick={() => props.onOpenBoard(s.key)} />
              {s.items.slice(0, 2).map((b) => (
                <BubbleItem key={b.id} b={b} {...props} />
              ))}
              {s.items.length > 2 && <button className="bub-more mono" onClick={() => props.onOpenBoard(s.key)}>+{s.items.length - 2} more</button>}
            </section>
          );
        })}
        {createPortal(
          <button className="bub-open lg lg-press" onClick={() => props.onOpenBoard(null)}><LuLayoutDashboard aria-hidden /><b>Board</b></button>,
          document.body,
        )}
      </>
    );
  }
  // you first, then whoever spoke last
  const order = [...stacks].sort((a, b) => Number(b.mine) - Number(a.mine) || b.last - a.last);
  const PER_SIDE = 2;
  const shown = narrow ? order : order.slice(0, props.oneSide ? PER_SIDE + 1 : PER_SIDE * 2);
  const hidden = order.length - shown.length;
  const per = narrow ? 1 : 2;
  const stack = (s: Stack, i: number) => (
    <section key={s.key} className={`bub-stack${s.mine ? " mine" : ""}`} style={{ "--bh": s.hue, "--i": i } as CSSProperties}>
      <StackHead s={s} onClick={() => props.onOpenBoard(s.key)} />
      {s.items.slice(0, per).map((b) => (
        <BubbleItem key={b.id} b={b} {...props} />
      ))}
      {s.items.length > per && (
        <button className="bub-more mono" onClick={() => props.onOpenBoard(s.key)}>+{s.items.length - per} more</button>
      )}
    </section>
  );
  if (narrow)
    return (
      <aside className="bub-board" aria-label="Bubble text">
        {shown.map(stack)}
        <button className="bub-open lg lg-press" onClick={() => props.onOpenBoard(null)}><LuLayoutDashboard aria-hidden /><b>Open board</b><small className="mono">{order.length} {order.length > 1 ? "people" : "person"}</small></button>
      </aside>
    );
  const right = props.oneSide ? shown : shown.filter((_, i) => i % 2 === 0);
  const left = props.oneSide ? [] : shown.filter((_, i) => i % 2 === 1);
  return (
    <>
      <aside className="bub-board right" aria-label="Bubble text">{right.map(stack)}</aside>
      {left.length > 0 && <aside className="bub-board left" aria-label="More bubble text">{left.map(stack)}</aside>}
      <button className="bub-open lg lg-press" onClick={() => props.onOpenBoard(null)}>
        <LuLayoutDashboard aria-hidden />
        <b>{hidden > 0 ? `+${hidden} more ${hidden > 1 ? "people" : "person"}` : "Board"}</b>
      </button>
    </>
  );
}

// ---- the board: everyone's bubbles on one surface you can drag and zoom ----------------------------

const GAP = 350;
const CARD_W = 300;
type View = { x: number; y: number; k: number };
const clampK = (k: number) => Math.max(0.12, Math.min(2.2, k));

/** Where each person sits: a sunflower spiral out from the middle, in the order they arrived (stable). */
function place(stacks: Stack[]) {
  const order = [...stacks].sort((a, b) => Number(b.mine) - Number(a.mine) || a.first - b.first);
  const golden = Math.PI * (3 - Math.sqrt(5));
  return order.map((s, i) => ({ s, x: Math.round(Math.cos(i * golden) * GAP * Math.sqrt(i) * 1.1), y: Math.round(Math.sin(i * golden) * GAP * Math.sqrt(i) * 0.85) }));
}

export function BubbleSpace(props: { bubbles: Bubble[]; focus: string | null; onClose: () => void; onCompose: () => void } & Actions) {
  const stacks = useStacks(props.bubbles);
  const spots = useMemo(() => place(stacks), [stacks]);
  const viewRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [glide, setGlide] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(props.focus);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; d: number; v: View; moved: boolean } | null>(null);

  // the visible part of the surface: on wide screens the people list covers the left
  const size = () => {
    const r = viewRef.current?.getBoundingClientRect();
    const w = r?.width ?? window.innerWidth, h = r?.height ?? window.innerHeight;
    const rail = w > 720 ? 300 : 0;
    return { w: w - rail, h, ox: rail };
  };
  const go = useCallback((v: View, animate = true) => {
    setGlide(animate);
    setView({ ...v, k: clampK(v.k) });
  }, []);
  const focusOn = useCallback(
    (key: string, animate = true) => {
      const p = spots.find((x) => x.s.key === key);
      if (!p) return;
      const { w, h, ox } = size();
      const k = w < 720 ? 1 : 1.1;
      setSel(key);
      go({ k, x: ox + w / 2 - p.x * k, y: h / 2 - (p.y + 120) * k }, animate);
    },
    [spots, go],
  );
  const fit = useCallback(
    (animate = true) => {
      if (!spots.length) return;
      const { w, h, ox } = size();
      const xs = spots.map((p) => p.x), ys = spots.map((p) => p.y);
      const x0 = Math.min(...xs) - CARD_W / 2 - 40, x1 = Math.max(...xs) + CARD_W / 2 + 40;
      const y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 340;
      const k = clampK(Math.min(1.1, (w - 40) / (x1 - x0), (h - 160) / (y1 - y0)));
      go({ k, x: ox + w / 2 - ((x0 + x1) / 2) * k, y: h / 2 + 20 - ((y0 + y1) / 2) * k }, animate);
    },
    [spots, go],
  );
  // opening: straight to the person asked for, or everyone
  const opened = useRef(false);
  useLayoutEffect(() => {
    if (opened.current || !spots.length) return;
    opened.current = true;
    if (props.focus && spots.some((p) => p.s.key === props.focus)) focusOn(props.focus, false);
    else fit(false);
  }, [spots, props.focus, focusOn, fit]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [props]);

  const zoomAt = (factor: number, cx: number, cy: number, animate = false) =>
    setView((v) => {
      const k = clampK(v.k * factor);
      const f = k / v.k;
      setGlide(animate);
      return { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f };
    });
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".bs-rail, .bub")) {
        // let a long bubble or the people list scroll, unless zooming with a pinch / ctrl
        if (!e.ctrlKey) return;
      }
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  const down = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, .bs-rail")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const ps = [...pointers.current.values()];
    const mid = ps.reduce((a, p) => ({ x: a.x + p.x / ps.length, y: a.y + p.y / ps.length }), { x: 0, y: 0 });
    const d = ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
    gesture.current = { ...mid, d, v: view, moved: false };
    setGlide(false);
  };
  const move = (e: RPointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const ps = [...pointers.current.values()];
    const mid = ps.reduce((a, p) => ({ x: a.x + p.x / ps.length, y: a.y + p.y / ps.length }), { x: 0, y: 0 });
    if (Math.abs(mid.x - g.x) + Math.abs(mid.y - g.y) > 4) g.moved = true;
    if (ps.length > 1 && g.d > 0) {
      const r = viewRef.current!.getBoundingClientRect();
      const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      const k = clampK(g.v.k * (d / g.d));
      const f = k / g.v.k;
      const cx = g.x - r.left, cy = g.y - r.top;
      setView({ k, x: cx - (cx - g.v.x) * f + (mid.x - g.x), y: cy - (cy - g.v.y) * f + (mid.y - g.y) });
    } else setView({ ...g.v, x: g.v.x + mid.x - g.x, y: g.v.y + mid.y - g.y });
  };
  const up = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) {
      // a tap on someone's stack (not a drag) brings them close
      if (g && !g.moved) {
        const card = (e.target as HTMLElement).closest<HTMLElement>("[data-key]");
        if (card && view.k < 0.8) focusOn(card.dataset.key!);
      }
      gesture.current = null;
    } else {
      const ps = [...pointers.current.values()];
      gesture.current = { x: ps[0].x, y: ps[0].y, d: 0, v: view, moved: true };
    }
  };

  const people = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...stacks].sort((a, b) => Number(b.mine) - Number(a.mine) || b.last - a.last).filter((s) => !t || s.name.toLowerCase().includes(t) || s.items.some((b) => b.text.toLowerCase().includes(t)));
  }, [stacks, q]);
  const far = view.k < 0.5;
  const total = props.bubbles.length;

  return (
    <div className="bub-space" role="dialog" aria-label="Bubble board">
      <div
        ref={viewRef}
        className={`bs-view${far ? " far" : ""}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest("button, a, .bs-rail, .bub")) return;
          const r = viewRef.current!.getBoundingClientRect();
          zoomAt(1.8, e.clientX - r.left, e.clientY - r.top, true);
        }}
      >
        <div className={`bs-world${glide ? " glide" : ""}`} style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.k})`, "--k": view.k } as CSSProperties}>
          {spots.map(({ s, x, y }) => (
            <section key={s.key} data-key={s.key} className={`bub-stack bs-card${s.mine ? " mine" : ""}${sel === s.key ? " sel" : ""}`} style={{ "--bh": s.hue, left: x - CARD_W / 2, top: y } as CSSProperties}>
              <StackHead s={s} />
              <div className="bs-far" aria-hidden>
                <i className="bub-av">{initials(s.name)}</i>
                <b>{s.name}</b>
                <span className="mono">{s.items.length}</span>
              </div>
              <div className="bs-list">
                {s.items.map((b) => (
                  <BubbleItem key={b.id} b={b} {...props} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <aside className="bs-rail lg">
        <label className="bs-search">
          <LuSearch aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${stacks.length} ${stacks.length > 1 ? "people" : "person"}`} />
        </label>
        <ul>
          {people.map((s) => (
            <li key={s.key}>
              <button className={sel === s.key ? "on" : ""} style={{ "--bh": s.hue } as CSSProperties} onClick={() => focusOn(s.key)}>
                <i className="bub-av" aria-hidden>{initials(s.name)}</i>
                <span>
                  <b>{s.mine ? `${s.name} (you)` : s.name}</b>
                  <small>{s.items[0]?.text.slice(0, 60)}</small>
                </span>
                <em className="mono">{s.items.length}</em>
              </button>
            </li>
          ))}
          {!people.length && <li className="dim bs-none">Nobody matches</li>}
        </ul>
      </aside>

      <header className="bs-top">
        <b>Bubble board</b>
        <span className="mono dim">{stacks.length} {stacks.length > 1 ? "people" : "person"} · {total} {total > 1 ? "bubbles" : "bubble"}</span>
        <button className="dock-x lg-press" onClick={props.onClose} aria-label="Close board"><LuX /></button>
      </header>
      <div className="bs-tools lg">
        <button onClick={() => zoomAt(1 / 1.4, size().ox + size().w / 2, size().h / 2, true)} aria-label="Zoom out"><LuMinus /></button>
        <span className="mono">{Math.round(view.k * 100)}%</span>
        <button onClick={() => zoomAt(1.4, size().ox + size().w / 2, size().h / 2, true)} aria-label="Zoom in"><LuPlus /></button>
        <button onClick={() => fit()} aria-label="See everyone" title="See everyone"><LuMaximize /></button>
        <button className="bs-post" onClick={props.onCompose}><LuMessageCircle aria-hidden /> Bubble</button>
      </div>
    </div>
  );
}

/** Write a bubble, add to one of yours, or rewrite it. */
export function BubbleCompose(props: {
  defaultName: string;
  inSpace: string | null;
  /** anonymous (lib/anon.ts): no name field, the space gives an alias */
  anon?: boolean;
  /** changing an existing bubble of yours */
  edit?: { bubble: Bubble; mode: "append" | "edit" } | null;
  /** your newest live bubble, so a new note can go onto it instead */
  latest?: Bubble | null;
  onPost: (text: string, by: string, life: number) => Promise<void>;
  onChange: (id: string, text: string, mode: "append" | "edit") => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"new" | "append" | "edit">(props.edit?.mode ?? "new");
  const target = props.edit?.bubble ?? (mode === "append" ? props.latest : null) ?? null;
  const [text, setText] = useState(props.edit?.mode === "edit" ? props.edit.bubble.text : "");
  // in a space you post as your member name (the server signs with it); elsewhere the name this device chose
  const spaceName = props.inSpace && !props.anon ? props.defaultName : "";
  const [name, setName] = useState(() => spaceName || bubbleName() || props.defaultName);
  const [busy, setBusy] = useState(false);
  const [life, setLife] = useState(LIFE_MIN);
  // in a named space a bubble stays until the space closes, so there is nothing to pick
  const pickLife = !(props.inSpace && !props.anon);
  const post = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      if (mode === "new") await props.onPost(text, props.anon ? "" : spaceName || name.trim(), life);
      else if (target) await props.onChange(target.id, text, mode);
      props.onClose();
    } catch {
      setBusy(false);
    }
  };
  // an emoji goes in where the cursor is (like a chat app), then the cursor sits after it
  const area = useRef<HTMLTextAreaElement>(null);
  const addEmoji = (e: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : text.length, to = el ? el.selectionEnd : text.length;
    const next = (text.slice(0, at) + e + text.slice(to)).slice(0, BUBBLE_MAX);
    setText(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = Math.min(next.length, at + e.length);
    });
  };
  const label = mode === "edit" ? "Edit bubble" : mode === "append" ? "Add to bubble" : "Bubble text";
  return (
    <Pop label={label} onClose={props.onClose} className="bub-pop">
      {!props.edit && props.latest && (
        <div className="bub-modes" role="radiogroup" aria-label="Where it goes">
          <button role="radio" aria-checked={mode === "new"} className={mode === "new" ? "on" : ""} onClick={() => setMode("new")}>New bubble</button>
          <button role="radio" aria-checked={mode === "append"} className={mode === "append" ? "on" : ""} onClick={() => setMode("append")}>Add to my last one</button>
        </div>
      )}
      {mode === "new" ? (
        <>
          <p className="dim bub-note">{props.inSpace ? `Only people in ${props.inSpace} see it.` : "Anyone in the public void sees it, as is: no password, nothing to unlock."} {props.inSpace && !props.anon ? "It stays until the space closes." : `It burns in ${BUBBLE_LIVES.find(([m]) => m === life)?.[1] ?? "30 min"}.`}{props.anon ? " You post as your space alias. Notes aren't end-to-end encrypted." : ""}</p>
          {pickLife && (
            <div className="tb-keep bub-keep" role="radiogroup" aria-label="Bubble stays for">
              <span className="mono">Stays for</span>
              {BUBBLE_LIVES.map(([m, l]) => (
                <button type="button" key={m} role="radio" aria-checked={life === m} className={life === m ? "on" : ""} onClick={() => setLife(m)}>{l}</button>
              ))}
            </div>
          )}
          {!props.anon && (spaceName ? (
            <p className="mono dim bub-as">Posting as <b>{spaceName}</b></p>
          ) : (
            <label className="bub-name">
              <span className="mono dim">Your name <i>(shown on your notes and files)</i></span>
              <input className="line-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mohit" maxLength={24} autoComplete="name" aria-invalid={!!name.trim() && !looksLikeName(name)} />
              {!!name.trim() && !looksLikeName(name) && <span className="mono bub-name-bad">That looks like a title, not a name: it won&apos;t be saved as you</span>}
            </label>
          ))}
        </>
      ) : mode === "append" && target ? (
        <blockquote className="bub-quote">{target.text}</blockquote>
      ) : (
        <p className="dim bub-note">Everyone sees it marked as edited.</p>
      )}
      <div className="bub-write">
        <textarea
          ref={area}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, BUBBLE_MAX))}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && post()}
          placeholder={mode === "append" ? "What's new? It shows as new under the rest" : "A note, a link, a code…"}
          rows={4}
        />
        <span className="mono dim">{text.length}/{BUBBLE_MAX}</span>
      </div>
      <EmojiPicker onPick={addEmoji} />
      <button className="cta lg-press" disabled={!text.trim() || busy} onClick={post}>
        {mode === "new" ? <LuMessageCircle aria-hidden /> : mode === "append" ? <LuPlus aria-hidden /> : <LuPencil aria-hidden />}{" "}
        {busy ? "Saving…" : mode === "new" ? "Post bubble" : mode === "append" ? "Add to bubble" : "Save changes"}
      </button>
    </Pop>
  );
}
