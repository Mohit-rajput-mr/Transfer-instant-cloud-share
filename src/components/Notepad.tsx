"use client";
// A received note or a bubble, opened big (owner 2026-10-27): the whole text in a notepad window, every link, email,
// phone number and code found and clickable, one Copy for everything, Select all, and the links listed on their own.
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuCopy, LuExternalLink, LuTextSelect, LuX } from "react-icons/lu";
import { useDialog } from "@/lib/dialog";

// links, emails, phone numbers and long codes
export const RICH = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]|www\.[^\s<>"']+[^\s<>"'.,;:!?)\]]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\+?\d[\d\s().-]{7,}\d|\b[A-Z0-9]{6,}\b)/g;
export type ChunkKind = "link" | "email" | "phone" | "code";
export const kindOfChunk = (t: string): ChunkKind =>
  /^(https?:|www\.)/.test(t) ? "link" : t.includes("@") ? "email" : /^\+?\d[\d\s().-]+$/.test(t) ? "phone" : "code";
export const hrefOf = (t: string, k: ChunkKind) =>
  k === "link" ? (t.startsWith("www.") ? `https://${t}` : t) : k === "email" ? `mailto:${t}` : k === "phone" ? `tel:${t.replace(/[^\d+]/g, "")}` : undefined;

async function copy(t: string) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    // (older Safari / no permission) the old way, through a hidden field
    const f = document.createElement("textarea");
    f.value = t;
    f.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(f);
    f.select();
    const ok = document.execCommand("copy");
    f.remove();
    return ok;
  }
}

/** The text with what was found in it marked: links open, everything else gets its own copy. */
export function RichText({ text, chips = true, className = "note-out rich" }: { text: string; chips?: boolean; className?: string }) {
  const [copied, setCopied] = useState<number | null>(null);
  const parts = text.split(RICH);
  const one = async (t: string, i: number) => {
    if (!(await copy(t))) return;
    setCopied(i);
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1300);
  };
  return (
    <pre className={className}>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p;
        const k = kindOfChunk(p);
        const href = hrefOf(p, k);
        return (
          <span key={i} className={`rt rt-${k}`}>
            {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow">{p}</a> : <b>{p}</b>}
            {chips && <button type="button" className="rt-copy" onClick={() => one(p, i)} aria-label={`Copy ${k}`}>{copied === i ? <LuCheck className="ic-inline" /> : "copy"}</button>}
          </span>
        );
      })}
    </pre>
  );
}

/** The expand button that opens a text in the notepad. */
export function ExpandText({ text, title, className = "" }: { text: string; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`np-open ${className}`} onClick={(e) => (e.stopPropagation(), setOpen(true))} aria-label="Open in notepad" title="Open in notepad">
        <svg viewBox="0 0 24 24" aria-hidden><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" /></svg>
      </button>
      {open && <Notepad text={text} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

export default function Notepad({ text, title, onClose }: { text: string; title: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDialog(box, close);
  const found = [...new Set(text.match(RICH) ?? [])].map((t) => ({ t, k: kindOfChunk(t) })).filter((x) => x.k !== "code" || x.t.length >= 8);
  const links = found.filter((x) => x.k === "link");
  const lines = text.split("\n").length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const did = (what: string) => {
    setCopied(what);
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 1400);
  };
  const selectAll = () => {
    const el = body.current?.querySelector("pre");
    if (!el) return;
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  };
  return createPortal(
    <div className="np-scrim" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="np" ref={box} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="np-head">
          <span className="np-dots" aria-hidden><i /><i /><i /></span>
          <b className="np-title ellip">{title}</b>
          <span className="mono dim np-count">{words} words · {lines} lines</span>
          <button type="button" className="np-btn" onClick={selectAll}><LuTextSelect aria-hidden />Select all</button>
          <button type="button" className="np-btn lead" onClick={async () => (await copy(text)) && did("all")}>
            {copied === "all" ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}{copied === "all" ? "Copied" : "Copy all"}
          </button>
          <button type="button" className="np-x" onClick={close} aria-label="Close"><LuX /></button>
        </header>
        <div className="np-body" ref={body}>
          <RichText text={text} chips={false} className="np-text rich" />
        </div>
        {found.length > 0 && (
          <footer className="np-found">
            <span className="mono dim">Found · {found.length}{links.length > 1 ? ` · ${links.length} links` : ""}</span>
            <div className="np-chips">
              {found.slice(0, 40).map(({ t, k }) => {
                const href = hrefOf(t, k);
                return (
                  <span key={t} className={`np-chip rt-${k}`}>
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" title={t}>{k === "link" && <LuExternalLink aria-hidden />}<span className="ellip">{t.replace(/^https?:\/\//, "")}</span></a> : <b className="ellip">{t}</b>}
                    <button type="button" onClick={async () => (await copy(t)) && did(t)} aria-label={`Copy ${t}`}>{copied === t ? <LuCheck /> : <LuCopy />}</button>
                  </span>
                );
              })}
            </div>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
