"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatBytes } from "@/lib/client";
import { useDialog } from "@/lib/dialog";

// Full-screen look inside a received file, like a chat app: every PDF page with real, selectable text
// (copy a line or the whole report), photos you can zoom, video/audio that plays, text you can select.
// The file never leaves this device; nothing is downloaded unless the user asks.

export type ViewKind = "pdf" | "image" | "video" | "audio" | "text";
const TEXT_EXT = /\.(txt|md|csv|json|log|xml|ya?ml|ini|conf|js|ts|tsx|jsx|css|html?|py|java|c|cpp|h|rs|go|rb|php|sh|sql)$/i;
export function viewKind(name: string, type: string): ViewKind | null {
  const n = name.toLowerCase();
  if (type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (/^image\/(jpeg|png|gif|webp|avif|bmp|svg\+xml)$/.test(type) || /\.(jpe?g|png|gif|webp|avif|bmp)$/.test(n)) return "image";
  if (/^video\//.test(type) || /\.(mp4|m4v|webm|mov)$/.test(n)) return "video";
  if (/^audio\//.test(type) || /\.(mp3|m4a|wav|ogg|aac|flac)$/.test(n)) return "audio";
  if (/^text\//.test(type) || type === "application/json" || TEXT_EXT.test(n)) return "text";
  return null;
}

const TEXT_MAX = 2 * 1024 * 1024;

/** `file` may still be on its way (a background preview): the viewer opens at once and fills in when it lands. */
export default function Viewer({ file, name, failed, thumb, onClose, onDownload }: { file: File | null; name?: string; failed?: boolean; /** the stored preview picture: shown at once while the full file is still on its way */ thumb?: string; onClose: () => void; onDownload?: () => void }) {
  const kind = file ? viewKind(file.name, file.type) : null;
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const [copied, setCopied] = useState<string | null>(null);
  const pdfText = useRef<(() => Promise<string>) | null>(null);

  // on top of the card that opened it: Escape closes only the preview, Tab stays in it (lib/dialog.ts)
  const box = useRef<HTMLDivElement>(null);
  useDialog(box, onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => void (document.body.style.overflow = prev);
  }, []);

  const flash = (s: string) => {
    setCopied(s);
    setTimeout(() => setCopied(null), 1600);
  };
  const copyAll = async () => {
    try {
      const text = kind === "pdf" ? await pdfText.current?.() : await file?.text();
      if (!text) return flash("No text in this file");
      await navigator.clipboard.writeText(text);
      flash("All text copied ✓");
    } catch {
      flash("Copy blocked by the browser");
    }
  };

  if (!file)
    return createPortal(
      <div ref={box} tabIndex={-1} className="viewer" role="dialog" aria-modal="true" aria-label={`Preview of ${name ?? "file"}`}>
        <header className="viewer-top">
          <div className="viewer-name"><b className="ellip">{name}</b></div>
          <div className="viewer-acts">
            <button type="button" className="viewer-x lg-press" aria-label="Close preview" onClick={onClose}>×</button>
          </div>
        </header>
        <div className="viewer-body">
          {thumb && !failed ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="viewer-media viewer-thumb" src={thumb} alt="" draggable={false} />
              <i className="viewer-spin corner" aria-label="Loading the full file" />
            </>
          ) : (
            <div className="viewer-none mono">{failed ? "No preview right now · use Download" : <i className="viewer-spin" aria-label="Opening" />}</div>
          )}
        </div>
      </div>,
      document.body,
    );

  return createPortal(
    <div ref={box} tabIndex={-1} className="viewer" role="dialog" aria-modal="true" aria-label={`Preview of ${file.name}`}>
      <header className="viewer-top">
        <div className="viewer-name">
          <b className="ellip">{file.name}</b>
          <span className="mono">{formatBytes(file.size)}{kind === "pdf" ? " · select text to copy" : ""}</span>
        </div>
        <div className="viewer-acts">
          {(kind === "pdf" || kind === "text") && (
            <button type="button" className="pill lg-press" onClick={copyAll}>{copied ?? "Copy all text"}</button>
          )}
          {onDownload ? (
            <button type="button" className="pill lg-press" onClick={onDownload}>Download ↓</button>
          ) : (
            <a className="pill lg-press" href={url} download={file.name}>Download ↓</a>
          )}
          <button type="button" className="viewer-x lg-press" aria-label="Close preview" onClick={onClose}>×</button>
        </div>
      </header>
      <div className="viewer-body">
        {kind === "pdf" ? (
          <PdfView file={file} textRef={pdfText} />
        ) : kind === "image" ? (
          <ImageView url={url} name={file.name} />
        ) : kind === "video" ? (
          <video className="viewer-media" src={url} controls autoPlay playsInline />
        ) : kind === "audio" ? (
          <div className="viewer-audio"><b className="wide">{file.name.replace(/\.[^.]+$/, "")}</b><audio src={url} controls autoPlay /></div>
        ) : kind === "text" ? (
          <TextView file={file} />
        ) : (
          <div className="viewer-none mono">No preview for this type of file · download it to open</div>
        )}
      </div>
      {copied && kind !== "pdf" && kind !== "text" && <div className="viewer-toast mono">{copied}</div>}
    </div>,
    document.body,
  );
}

/** Photo: fits the screen, centred. Scroll (or pinch) zooms in/out right where the pointer is, drag pans,
 *  double-click toggles 2.5×. */
function ImageView({ url, name }: { url: string; name: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [v, setV] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const zoomAt = (cx: number, cy: number, k2: number) =>
    setV((o) => {
      const k = Math.max(1, Math.min(8, k2));
      if (k === 1) return { k: 1, x: 0, y: 0 };
      const r = box.current!.getBoundingClientRect();
      // keep the point under the pointer where it is
      const px = cx - r.left - r.width / 2, py = cy - r.top - r.height / 2;
      return { k, x: px - ((px - o.x) * k) / o.k, y: py - ((py - o.y) * k) / o.k };
    });
  useEffect(() => {
    const el = box.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
      zoomAt(e.clientX, e.clientY, vRef.current.k * f);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const vRef = useRef(v);
  vRef.current = v;
  return (
    <div
      ref={box}
      className={`viewer-img${v.k > 1 ? " zoom" : ""}`}
      onDoubleClick={(e) => zoomAt(e.clientX, e.clientY, v.k > 1 ? 1 : 2.5)}
      onPointerDown={(e) => {
        if (v.k === 1) return;
        drag.current = { px: e.clientX, py: e.clientY, x: v.x, y: v.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d) setV((o) => ({ ...o, x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py }));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: URL */}
      <img src={url} alt={name} draggable={false} style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.k})`, transition: drag.current ? "none" : undefined }} />
      <span className="viewer-hint mono">{v.k > 1 ? `${Math.round(v.k * 100)}% · drag to move · double-click to fit` : "scroll to zoom"}</span>
    </div>
  );
}

function TextView({ file }: { file: File }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    file.slice(0, TEXT_MAX).text().then((t) => alive && setText(file.size > TEXT_MAX ? `${t}\n\n… (first 2 MB shown)` : t));
    return () => {
      alive = false;
    };
  }, [file]);
  return <pre className="viewer-text">{text ?? "Loading…"}</pre>;
}

type PdfDoc = Awaited<ReturnType<(typeof import("pdfjs-dist"))["getDocument"]>["promise"]>;

function PdfView({ file, textRef }: { file: File; textRef: React.MutableRefObject<(() => Promise<string>) | null> }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState(0); // 0 = fit width
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const pdfjsRef = useRef<typeof import("pdfjs-dist") | null>(null);

  useEffect(() => {
    let alive = true;
    let loaded: PdfDoc | null = null;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      pdfjsRef.current = pdfjs;
      loaded = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      if (!alive) return void loaded.destroy();
      setDoc(loaded);
    })().catch(() => alive && setErr("This PDF could not be opened here · download it instead"));
    return () => {
      alive = false;
      void loaded?.destroy();
    };
  }, [file]);

  // the whole report's text, for "Copy all text"
  useEffect(() => {
    textRef.current = doc
      ? async () => {
          const out: string[] = [];
          for (let i = 1; i <= doc.numPages; i++) {
            const tc = await (await doc.getPage(i)).getTextContent();
            let line = "";
            const lines: string[] = [];
            for (const it of tc.items as { str?: string; hasEOL?: boolean }[]) {
              line += it.str ?? "";
              if (it.hasEOL) {
                lines.push(line);
                line = "";
              }
            }
            if (line) lines.push(line);
            out.push(lines.join("\n"));
          }
          return out.join("\n\n").trim();
        }
      : null;
  }, [doc, textRef]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const pages = doc ? Array.from({ length: doc.numPages }, (_, i) => i + 1) : [];
  return (
    <div className="viewer-pdf" ref={box}>
      {err ? (
        <div className="viewer-none mono">{err}</div>
      ) : !doc ? (
        <div className="viewer-none mono">Opening the PDF…</div>
      ) : (
        <>
          {pages.map((n) => (
            <PdfPage key={n} doc={doc} n={n} pdfjs={pdfjsRef.current!} fitWidth={Math.min(width - 32, 980)} scale={scale} />
          ))}
          <div className="viewer-zoom">
            <span className="mono">{doc.numPages} page{doc.numPages === 1 ? "" : "s"}</span>
            <button type="button" className="lg-press" aria-label="Zoom out" onClick={() => setScale((s) => Math.max(0.5, (s || 1) - 0.25))}>−</button>
            <button type="button" className="lg-press mono" onClick={() => setScale(0)}>Fit</button>
            <button type="button" className="lg-press" aria-label="Zoom in" onClick={() => setScale((s) => Math.min(4, (s || 1) + 0.25))}>+</button>
          </div>
        </>
      )}
    </div>
  );
}

/** one page: drawn when it scrolls near the screen, with pdf.js's text layer on top so the words are real text */
function PdfPage({ doc, n, pdfjs, fitWidth, scale }: { doc: PdfDoc; n: number; pdfjs: typeof import("pdfjs-dist"); fitWidth: number; scale: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const textBox = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number; s: number } | null>(null);
  const [near, setNear] = useState(n <= 2);

  // page size first (cheap), so the scroll height is right before anything is drawn
  useEffect(() => {
    let alive = true;
    doc.getPage(n).then((p) => {
      if (!alive) return;
      const v = p.getViewport({ scale: 1 });
      const s = scale || Math.max(0.3, fitWidth / v.width);
      setSize({ w: v.width * s, h: v.height * s, s });
    });
    return () => {
      alive = false;
    };
  }, [doc, n, fitWidth, scale]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !size) return;
    let cancelled = false;
    let task: { cancel(): void } | null = null;
    let text: { cancel(): void } | null = null;
    (async () => {
      const page = await doc.getPage(n);
      if (cancelled) return;
      const vp = page.getViewport({ scale: size.s });
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const c = canvas.current!;
      c.width = Math.floor(vp.width * dpr);
      c.height = Math.floor(vp.height * dpr);
      const g = c.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = page.render({ canvasContext: g, viewport: vp });
      task = r;
      await r.promise.catch(() => {});
      if (cancelled) return;
      const tb = textBox.current!;
      tb.replaceChildren();
      tb.style.setProperty("--scale-factor", String(size.s));
      const layer = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: tb, viewport: vp });
      text = layer;
      await layer.render().catch(() => {});
    })();
    return () => {
      cancelled = true;
      task?.cancel();
      text?.cancel();
    };
  }, [near, size, doc, n, pdfjs]);

  return (
    <div className="pdf-page" ref={wrap} style={size ? { width: size.w, height: size.h } : { width: fitWidth, height: fitWidth * 1.3 }}>
      <canvas ref={canvas} style={size ? { width: size.w, height: size.h } : undefined} />
      <div className="textLayer" ref={textBox} />
      <span className="pdf-num mono">{n}</span>
    </div>
  );
}
