"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LuCopy, LuMessageCircle, LuShare2, LuTrash2 } from "react-icons/lu";
import { Pop } from "./Spaces";
import { BUBBLE_MAX, bubbleName, isMine, splitLinks, type Bubble } from "@/lib/bubbles";
import { formatClock } from "@/lib/client";

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
};
const initials = (s: string) => s.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

type Stack = { key: string; name: string; hue: number; mine: boolean; items: Bubble[] };

/** Bubble text, one glass stack per sender (newest sender first), each bubble with copy / share / burn. */
export default function BubbleBoard(props: { bubbles: Bubble[]; now: number; onBurn: (id: string) => void; toast: (m: string) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // phones show each sender's newest bubble in one swipeable row; desktop shows three
  const [limit, setLimit] = useState(3);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const on = () => setLimit(mq.matches ? 1 : 3);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const stacks = useMemo(() => {
    const m = new Map<string, Stack>();
    for (const b of props.bubbles) {
      const key = b.from || `n:${b.by ?? ""}` || b.id;
      const s = m.get(key) ?? { key, name: b.by || "Someone", hue: b.hue, mine: false, items: [] };
      s.items.push(b);
      if (isMine(b.id)) s.mine = true;
      m.set(key, s);
    }
    // your own stack first, then whoever posted most recently
    return [...m.values()].sort((a, b) => Number(b.mine) - Number(a.mine) || b.items[0].createdAt.localeCompare(a.items[0].createdAt));
  }, [props.bubbles]);
  if (!stacks.length) return null;

  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      props.toast("Copied");
    } catch {
      props.toast("Couldn't copy");
    }
  };
  const share = async (t: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: t });
        return;
      } catch {
        return;
      }
    }
    copy(t);
  };

  return (
    <aside className="bub-board" aria-label="Bubble text">
      {stacks.map((s) => {
        const all = open[s.key];
        const shown = all ? s.items : s.items.slice(0, limit);
        return (
          <section key={s.key} className={`bub-stack${s.mine ? " mine" : ""}`} style={{ "--bh": s.hue } as CSSProperties}>
            <header>
              <i className="bub-av" aria-hidden>{initials(s.name)}</i>
              <b>{s.mine ? `${s.name} (you)` : s.name}</b>
              <span className="mono dim">{s.items.length} {s.items.length > 1 ? "bubbles" : "bubble"}</span>
            </header>
            {shown.map((b) => (
              <article key={b.id} className="bub">
                <p>{splitLinks(b.text).map((p, i) => (p.href ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow">{p.t}</a> : <span key={i}>{p.t}</span>))}</p>
                <footer>
                  <span className="mono dim">{ago(b.createdAt, props.now)} · {formatClock(Date.parse(b.expiresAt) - props.now)}</span>
                  <span className="bub-acts">
                    <button onClick={() => copy(b.text)} aria-label="Copy" title="Copy"><LuCopy /></button>
                    <button onClick={() => share(b.text)} aria-label="Share" title="Share"><LuShare2 /></button>
                    {isMine(b.id) && <button className="kill" onClick={() => props.onBurn(b.id)} aria-label="Burn this bubble" title="Burn"><LuTrash2 /></button>}
                  </span>
                </footer>
              </article>
            ))}
            {s.items.length > limit && (
              <button className="bub-more mono" onClick={() => setOpen((o) => ({ ...o, [s.key]: !all }))}>{all ? "Show less" : `+${s.items.length - limit} more`}</button>
            )}
          </section>
        );
      })}
    </aside>
  );
}

/** Write a bubble: your name (remembered) and up to 500 characters. */
export function BubbleCompose(props: { defaultName: string; inSpace: string | null; onPost: (text: string, by: string) => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState("");
  const [name, setName] = useState(() => bubbleName() || props.defaultName);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const post = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await props.onPost(text, name.trim());
      props.onClose();
    } catch {
      setBusy(false);
    }
  };
  return (
    <Pop label="Bubble text" onClose={props.onClose} className="bub-pop">
      <p className="dim bub-note">{props.inSpace ? `Only people in ${props.inSpace} see it.` : "Anyone in the public void sees it, as is: no password, nothing to unlock."} It burns in 30 minutes.</p>
      <input className="line-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" maxLength={24} autoComplete="off" />
      <div className="bub-write">
        <textarea
          ref={ref}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, BUBBLE_MAX))}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && post()}
          placeholder="A note, a link, a code…"
          rows={4}
        />
        <span className="mono dim">{text.length}/{BUBBLE_MAX}</span>
      </div>
      <button className="cta lg-press" disabled={!text.trim() || busy} onClick={post}><LuMessageCircle aria-hidden /> {busy ? "Posting…" : "Post bubble"}</button>
    </Pop>
  );
}
