"use client";
import { useEffect, useRef, useState } from "react";
import { OPEN_PASS, deriveKeys, fromB64, streamDecrypt } from "@/lib/crypto";
import { FOLDER_MIME, LINK_MIME } from "@/lib/bundle";
import { formatBytes } from "@/lib/client";
import type { AdminTransfer } from "./types";

// HQ → Objects → Preview (migration 033, api/admin/transfers/[id]/peek). The file is decrypted here, in the admin's
// browser: a passcode object needs its passcode (the server never has it), an open one opens at once. Nothing is
// counted and a wrong passcode never locks the object for its receivers.

/** only the start of a text/link object is read into a string for display */
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
type Reply = { ok: boolean; reason?: string; store?: string; nonce: string; size: number; chunkSize: number; fileName?: string; mime?: string };
type Shown = { url: string; kind: Kind; mime: string; fileName: string; size: number; text?: string };
type Stage = { s: "meta" } | { s: "pass"; err?: string } | { s: "checking" } | { s: "loading"; done: number; size: number } | { s: "shown" } | { s: "error"; msg: string };

const REASONS: Record<string, string> = {
  gone: "This object is gone (burned, destroyed or expired).",
  uploading: "Still uploading. Try again in a moment.",
  unauthorized: "Your admin session ended. Log in again.",
};

// A service worker (public/hqpeek-sw.js) decrypts the stored copy on the fly and serves /hqpeek/<id> with Range
// support, so media plays and seeks while it streams instead of waiting for the whole file. Registered once, lazily.
type PeekJob = { key: CryptoKey; nonce: Uint8Array; storeUrl: string; size: number; chunkSize: number; mime: string };
let swReady: Promise<boolean> | null = null;
function ensureSW(): Promise<boolean> {
  if (swReady) return swReady;
  swReady = (async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !window.isSecureContext) return false;
    try {
      await navigator.serviceWorker.register("/hqpeek-sw.js", { scope: "/admin" });
      if (navigator.serviceWorker.controller) return true;
      // the worker claims this page on activate; wait for it to take control (or give up and use the blob fallback)
      await new Promise<void>((res) => {
        const t = setTimeout(res, 4000);
        navigator.serviceWorker.addEventListener("controllerchange", () => (clearTimeout(t), res()), { once: true });
      });
      return !!navigator.serviceWorker.controller;
    } catch {
      return false;
    }
  })();
  return swReady;
}
// hand the worker the key + where the ciphertext is, and wait for it to acknowledge before the media element asks
function postJob(id: string, job: PeekJob): Promise<boolean> {
  const sw = navigator.serviceWorker.controller;
  if (!sw) return Promise.resolve(false);
  return new Promise((res) => {
    const mc = new MessageChannel();
    const t = setTimeout(() => res(false), 4000);
    mc.port1.onmessage = () => (clearTimeout(t), res(true));
    sw.postMessage({ type: "peek", id, job }, [mc.port2]);
  });
}
const dropJob = (id: string) => navigator.serviceWorker?.controller?.postMessage({ type: "drop", id });

export default function AdminPeek({ t, onClose }: { t: AdminTransfer; onClose: () => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [stage, setStage] = useState<Stage>({ s: "meta" });
  const [pass, setPass] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const abort = useRef<AbortController | null>(null);
  const token = useRef<string | null>(null);

  // stop the download, free the decrypted copy and drop the worker's job when the window closes
  useEffect(() => () => { abort.current?.abort(); if (token.current) dropJob(token.current); }, []);
  useEffect(() => () => { if (shown?.url.startsWith("blob:")) URL.revokeObjectURL(shown.url); }, [shown]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  // kept so a stream that a browser won't play through the worker can be retried as a decrypt-then-show blob
  const last = useRef<{ r: Reply; key: CryptoKey; mime: string; kind: Kind; fileName: string } | null>(null);
  const triedBlob = useRef(false);

  // Decrypt the whole file into a disk-backed Blob, then show it. Any size (each chunk streams in so memory stays
  // bounded), but it only appears once finished. Used when there is no service worker, or if streaming playback failed.
  const showViaBlob = async (ctx: NonNullable<typeof last.current>, ac: AbortController) => {
    const { r, key, mime, kind, fileName } = ctx;
    setStage({ s: "loading", done: 0, size: r.size });
    const ts = new TransformStream<Uint8Array, Uint8Array>();
    const writer = ts.writable.getWriter();
    const blobPromise = new Response(ts.readable).blob();
    try {
      await streamDecrypt({
        url: r.store!, key, nonce: fromB64(r.nonce), size: r.size, chunkSize: r.chunkSize, signal: ac.signal,
        sink: { write: (c) => writer.write(c), close: () => writer.close(), abort: () => writer.abort() },
        onProgress: (done) => setStage({ s: "loading", done, size: r.size }),
      });
    } catch (e) {
      await writer.abort(e).catch(() => {});
      await blobPromise.catch(() => {});
      throw e;
    }
    const blob = (await blobPromise).slice(0, r.size, mime); // slice shares the bytes; it only stamps the type
    const text = kind === "text" || kind === "link" ? await blob.slice(0, TEXT_MAX).text() : undefined;
    if (ac.signal.aborted) return;
    setShown({ url: URL.createObjectURL(blob), kind, mime, fileName, size: r.size, text });
    setStage({ s: "shown" });
  };

  // the player couldn't read the streamed copy (a browser that won't route media through the worker): fall back once
  const retryBlob = () => {
    if (triedBlob.current || !last.current) return;
    triedBlob.current = true;
    if (token.current) (dropJob(token.current), (token.current = null));
    const ac = (abort.current = new AbortController());
    showViaBlob(last.current, ac).catch((e) => {
      if (!ac.signal.aborted) setStage({ s: "error", msg: `Could not open it: ${e instanceof Error ? e.message : String(e)}` });
    });
  };

  const open = async (m: Meta, code: string) => {
    abort.current?.abort();
    triedBlob.current = false;
    const ac = (abort.current = new AbortController());
    setStage({ s: "checking" });
    try {
      const { key, auth } = await deriveKeys(code, fromB64(m.salt), m.iterations);
      const res = await fetch(`/api/admin/transfers/${t.id}/peek`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auth }), signal: ac.signal });
      const r: Reply = await res.json().catch(() => ({ ok: false, reason: "gone" }));
      if (!r.ok) {
        if (r.reason === "wrong") return setStage(m.open ? { s: "error", msg: "This open object uses its anonymous space's key, which HQ doesn't have." } : { s: "pass", err: "Wrong passcode" });
        return setStage({ s: "error", msg: REASONS[r.reason ?? ""] ?? "Could not open it." });
      }
      if (!r.store) return setStage({ s: "error", msg: "No stored copy: this object lives only on the sender's device, so HQ can't fetch it." });
      const mime = mimeOf(r.fileName ?? "", r.mime ?? "");
      const kind = kindOf(mime);
      const fileName = r.fileName || t.fileName || t.name;
      last.current = { r, key, mime, kind, fileName };

      // Preferred path: a service worker decrypts on the fly and serves /hqpeek/<id> with Range, so the player
      // streams and seeks while it loads (owner 2026-11-02: play as it loads, don't wait for the whole file).
      if (await ensureSW()) {
        const id = crypto.randomUUID();
        const ok = await postJob(id, { key, nonce: fromB64(r.nonce), storeUrl: r.store, size: r.size, chunkSize: r.chunkSize, mime });
        if (ac.signal.aborted) return;
        if (ok) {
          if (token.current) dropJob(token.current);
          token.current = id;
          const url = `/hqpeek/${id}`;
          // text/links need the characters to show, so read just the start through the same worker
          const text = kind === "text" || kind === "link" ? await fetch(url, { headers: { Range: `bytes=0-${TEXT_MAX - 1}` }, signal: ac.signal }).then((x) => x.text()).catch(() => "") : undefined;
          if (ac.signal.aborted) return;
          setShown({ url, kind, mime, fileName, size: r.size, text });
          return setStage({ s: "shown" });
        }
      }

      await showViaBlob(last.current, ac);
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
          {stage.s === "shown" && shown && <View v={shown} onStreamFail={shown.url.startsWith("/hqpeek/") ? retryBlob : undefined} />}
        </div>
      </div>
    </div>
  );
}

function View({ v, onStreamFail }: { v: Shown; onStreamFail?: () => void }) {
  const [broken, setBroken] = useState(false);
  // A streamed media element that errors: if the browser won't route it through the worker, retry as a blob once;
  // otherwise it is genuinely an unplayable format.
  const fail = () => (onStreamFail ? onStreamFail() : setBroken(true));
  if (broken || v.kind === "other" || v.kind === "folder")
    return (
      <div className="hq-peek-none">
        <p>{v.kind === "folder" ? "A folder: no preview." : broken ? "This browser can't show this format." : "No preview for this kind of file."}</p>
        <p className="mono dim">{v.fileName} · {v.mime} · {formatBytes(v.size)}</p>
        <a className="pill" href={v.url} download={v.fileName}>Save to this computer</a>
      </div>
    );
  if (v.kind === "image") return <img className="hq-peek-media" src={v.url} alt={v.fileName} onError={fail} />;
  if (v.kind === "video") return <video className="hq-peek-media" src={v.url} controls autoPlay playsInline onError={fail} />;
  if (v.kind === "audio") return <audio src={v.url} controls autoPlay onError={fail} />;
  if (v.kind === "pdf") return <iframe className="hq-peek-pdf" src={v.url} title={v.fileName} />;
  if (v.kind === "link") {
    const u = (v.text ?? "").trim();
    const safe = /^https?:\/\//i.test(u);
    return <p className="hq-peek-text">{safe ? <a href={u} target="_blank" rel="noopener noreferrer nofollow">{u}</a> : u}</p>;
  }
  return <pre className="hq-peek-text">{v.text}{v.size > TEXT_MAX ? "\n…" : ""}</pre>;
}
