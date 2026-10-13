"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Crisp line icons instead of unicode arrows: ⬆/↗ fall back to colour emoji on iOS.
const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
export const Icon = {
  upload: svg(<><path d="M12 15V4" /><path d="M7 8.5 12 4l5 4.5" /><path d="M4.5 14.5v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" /></>),
  file: svg(<><path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" /><path d="M14 3.5V8h4.5" /></>),
  folder: svg(<path d="M3.5 7.5a2 2 0 0 1 2-2h3.8l2 2.2h7.2a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />),
  link: svg(<><path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1" /><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1" /></>),
  up: svg(<><path d="M12 19V5.5" /><path d="M6 11.5 12 5.5l6 6" /></>),
  close: svg(<><path d="M6.5 6.5l11 11" /><path d="M17.5 6.5l-11 11" /></>),
};

const CHOICES = [
  { key: "files", icon: Icon.file, title: "Files", sub: "photos, videos, docs, anything" },
  { key: "folder", icon: Icon.folder, title: "Folder", sub: "arrives as a real folder" },
  { key: "text", icon: Icon.link, title: "Text / link", sub: "opens instantly on the other side" },
] as const;

/**
 * One liquid-glass "Upload" pill. Tap it and the glass stretches and splits into three choices
 * (a gooey layer underneath shows the liquid bridging apart on desktop); tap outside and they flow back.
 * On phones the choices stack as rows; `folderSub` lets the page explain what Folder does there.
 */
export default function Uploader(props: { onFiles: () => void; onFolder: () => void; onText: () => void; folderSub?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const act = { files: props.onFiles, folder: props.onFolder, text: props.onText };

  return (
    <div ref={box} className={`uploader${open ? " open" : ""}`}>
      {/* liquid body: three blobs that start as one and melt apart */}
      <div className="up-goo" aria-hidden>
        {CHOICES.map((c, i) => <i key={c.key} style={{ "--i": i } as React.CSSProperties} />)}
      </div>

      <button className="up-pill lg lg-press" onClick={() => setOpen(true)} aria-expanded={open} tabIndex={open ? -1 : 0}>
        <span className="up-ico">{Icon.upload}</span>
        <b>Upload</b>
      </button>

      {CHOICES.map((c, i) => (
        <button
          key={c.key}
          className="up-card lg lg-press"
          style={{ "--i": i } as React.CSSProperties}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          onClick={() => {
            setOpen(false);
            act[c.key]();
          }}
        >
          <span className="bp-ico">{c.icon}</span>
          <b>{c.title}</b>
          <small>{c.key === "folder" && props.folderSub ? props.folderSub : c.sub}</small>
        </button>
      ))}
    </div>
  );
}
