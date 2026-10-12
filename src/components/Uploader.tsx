"use client";
import { useEffect, useRef, useState } from "react";

const CHOICES = [
  { key: "files", icon: "⬆", title: "Files", sub: "photos, videos, docs, anything" },
  { key: "folder", icon: "▣", title: "Folder", sub: "arrives as a real folder" },
  { key: "text", icon: "↗", title: "Text / link", sub: "opens instantly on the other side" },
] as const;

/**
 * One liquid-glass "Upload" pill. Tap it and the glass stretches and splits into three choices
 * (a gooey layer underneath shows the liquid bridging apart); tap outside and they flow back.
 */
export default function Uploader(props: { onFiles: () => void; onFolder: () => void; onText: () => void }) {
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
        <span className="up-ico">⬆</span>
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
          <small>{c.sub}</small>
        </button>
      ))}
    </div>
  );
}
