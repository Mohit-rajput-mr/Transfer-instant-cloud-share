"use client";
import { useEffect, useRef, useState } from "react";
import { OPEN_PASS, deriveKeys, fromB64, streamDecrypt } from "@/lib/crypto";
import { FOLDER_MIME, LINK_MIME } from "@/lib/bundle";
import { formatBytes } from "@/lib/client";
import type { AdminTransfer } from "./types";

// HQ → Objects → Preview (migration 033, api/admin/transfers/[id]/peek). The file is decrypted here, in the admin's
// browser: a passcode object needs its passcode (the server never has it), an open one opens at once. Nothing is
// counted and a wrong passcode never locks the object for its receivers.

/** decrypted in memory: past this, a browser tab may run out of memory */
const MAX = 1536 * 1024 * 1024;
const TEXT_MAX = 512 * 1024;

type Kind = "image" | "video" | "audio" | "pdf" | "text" | "link" | "folder" | "other";
const EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", svg: "image/svg+xml", ico: "image/x-icon",
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", ogv: "video/ogg", mkv: "video/x-matroska",
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/opus", flac: "audio/flac",
  pdf: "application/pdf",
  txt: "text/plain", md: "text/plain", csv: "text/plain", json: "text/plain", log: "text/plain", xml: "text/plain", html: "text/plain", css: "text/plain", js: "text/plain", ts: "text/plain", py: "text/plain", url: LINK_MIME,
};
export function mimeOf(fileName: string, mime: string) {
  if (mime && mime !== "application/octet-stream") return mime;
  return EXT[fileName.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}
export function kindOf(mime: string): Kind {
  if (mime === LINK_MIME) return "link";
  if (mime === FOLDER_MIME) return "folder";
  if (mime === "image/svg+xml") return "text"; // never rendered as a picture: it can carry script
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/") || mime === "application/json") return "text";
  return "other";
}

type Meta = { salt: string; iterations: number; open: boolean; anon: boolean };
type Shown = { url: string; kind: Kind; mime: string; fileName: string; size: number; text?: string };
type Stage = { s: "meta" } | { s: "pass"; err?: string } | { s: "checking" } | { s: "loading"; done: number; size: number } | { s: "shown" } | { s: "error"; msg: string };

const REASONS: Record<string, string> = {
  gone: "This object is gone (burned, destroyed or expired).",
  uploading: "Still uploading. Try again in a moment.",
  unauthorized: "Your admin session ended. Log in again.",
};

export default function AdminPeek({ t, onClose }: { t: AdminTransfer; onClose: () => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [stage, setStage] = useState<Stage>({ s: "meta" });
  const [pass, setPass] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const abort = useRef<AbortController | null>(null);

  // stop the download and free the decrypted copy when the window closes
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => () => { if (shown) URL.revokeObjectURL(shown.url); }, [shown]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const open = async (m: Meta, code: string) => {
    abort.current?.abort();
    const ac = (abort.current = new AbortController());
    setStage({ s: "checking" });
    try {
      const { key, auth } = await deriveKeys(code, fromB64(m.salt), m.iterations);
      const res = await fetch(`/api/admin/transfers/${t.id}/peek`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auth }), signal: ac.signal });
      const r = await res.json().catch(() => ({ ok: false, reason: "gone" }));
      if (!r.ok) {
        if (r.reason === "wrong") return setStage(m.open ? { s: "error", msg: "This open object uses its anonymous space's key, which HQ doesn't have." } : { s: "pass", err: "Wrong passcode" });
        return setStage({ s: "error", msg: REASONS[r.reason] ?? "Could not open it." });
      }
      if (!r.store) return setStage({ s: "error", msg: "No stored copy: this object lives only on the sender's device, so HQ can't fetch it." });
      if (r.size > MAX) return setStage({ s: "error", msg: `Too big to preview here (${formatBytes(r.size)}; up to ${formatBytes(MAX)}).` });
      const mime = mimeOf(r.fileName ?? "", r.mime ?? "");
      const parts: Uint8Array[] = [];
      setStage({ s: "loading", done: 0, size: r.size });
      await streamDecrypt({
        url: r.store, key, nonce: fromB64(r.nonce), size: r.size, chunkSize: r.chunkSize, signal: ac.signal,
        sink: { write: async (c) => void parts.push(c), close: async () => {}, abort: async () => {} },
        onProgress: (done) => setStage({ s: "loading", done, size: r.size }),
      });
      const blob = new Blob(parts as BlobPart[], { type: mime });
      const kind = kindOf(mime);
      const text = kind === "text" || kind === "link" ? (await blob.slice(0, TEXT_MAX).text()) : undefined;
      setShown({ url: URL.createObjectURL(blob), kind, mime, fileName: r.fileName || t.fileName || t.name, size: r.size, text });
      setStage({ s: "shown" });
    } catch (e) {
      if (ac.signal.aborted) return;
      const msg = e instanceof Error ? e.message : String(e);
      setStage({ s: "error", msg: /403|404/.test(msg) ? "The stored copy is gone or not complete yet." : `Could not open it: ${msg}` });
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/admin/transfers/${t.id}/peek`, { cache: "no-store", signal: ac.signal });
        const m = await res.json().catch(() => ({ ok: false, reason: "gone" }));
        if (!m.ok) return setStage({ s: "error", msg: REASONS[m.reason] ?? "Could not open it." });
        setMeta(m);
        if (m.open && !m.anon) void open(m, OPEN_PASS);
        else if (m.open) setStage({ s: "error", msg: "This open object uses its anonymous space's key, which HQ doesn't have." });
        else setStage({ s: "pass" });
      } catch {
        if (!ac.signal.aborted) setStage({ s: "error", msg: "Orbi didn't answer. Try again." });
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id]);

  const pct = stage.s === "loading" ? Math.round((stage.done / Math.max(1, stage.size)) * 100) : 0;
  return (
    <div className="hq-peek" role="dialog" aria-label={`Preview ${t.name}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hq-peek-box">
        <div className="hq-peek-head">
          <span><b>{t.name}</b><small className="mono dim">{t.id} · {formatBytes(t.size)} · {t.open ? "open" : "passcode"}</small></span>
          <span className="hq-peek-tools">
            {shown && <a className="pill" href={shown.url} download={shown.fileName}>Save</a>}
            <button className="pill" onClick={onClose}>Close ✕</button>
          </span>
        </div>
        <div className="hq-peek-body">
          {stage.s === "meta" && <p className="mono dim">Looking it up…</p>}
          {stage.s === "pass" && meta && (
            <form className="hq-peek-pass" onSubmit={(e) => (e.preventDefault(), pass && void open(meta, pass))}>
              <label htmlFor="hq-peek-code">Passcode of this object</label>
              <input id="hq-peek-code" className="hq-input" type="password" autoFocus autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} />
              <button className="pill" type="submit" disabled={!pass}>Open</button>
              {stage.err && <p className="hq-peek-err">{stage.err}</p>}
              <p className="mono dim">Files are encrypted on the sender&apos;s device with this passcode; Orbi never has it. Not counted as a view or download, and a wrong try doesn&apos;t lock it.</p>
            </form>
          )}
          {stage.s === "checking" && <p className="mono dim">Checking…</p>}
          {stage.s === "loading" && (
            <div className="hq-peek-load">
              <p className="mono dim">Decrypting · {formatBytes(stage.done)} of {formatBytes(stage.size)}</p>
              <div className="hq-peek-bar"><i style={{ width: `${pct}%` }} /></div>
            </div>
          )}
          {stage.s === "error" && <p className="hq-peek-err">{stage.msg}</p>}
          {stage.s === "shown" && shown && <View v={shown} />}
        </div>
      </div>
    </div>
  );
}

function View({ v }: { v: Shown }) {
  const [broken, setBroken] = useState(false);
  if (broken || v.kind === "other" || v.kind === "folder")
    return (
      <div className="hq-peek-none">
        <p>{v.kind === "folder" ? "A folder: no preview." : broken ? "This browser can't show this format." : "No preview for this kind of file."}</p>
        <p className="mono dim">{v.fileName} · {v.mime} · {formatBytes(v.size)}</p>
        <a className="pill" href={v.url} download={v.fileName}>Save to this computer</a>
      </div>
    );
  if (v.kind === "image") return <img className="hq-peek-media" src={v.url} alt={v.fileName} onError={() => setBroken(true)} />;
  if (v.kind === "video") return <video className="hq-peek-media" src={v.url} controls autoPlay playsInline onError={() => setBroken(true)} />;
  if (v.kind === "audio") return <audio src={v.url} controls autoPlay onError={() => setBroken(true)} />;
  if (v.kind === "pdf") return <iframe className="hq-peek-pdf" src={v.url} title={v.fileName} />;
  if (v.kind === "link") {
    const u = (v.text ?? "").trim();
    const safe = /^https?:\/\//i.test(u);
    return <p className="hq-peek-text">{safe ? <a href={u} target="_blank" rel="noopener noreferrer nofollow">{u}</a> : u}</p>;
  }
  return <pre className="hq-peek-text">{v.text}{v.size > TEXT_MAX ? "\n…" : ""}</pre>;
}
