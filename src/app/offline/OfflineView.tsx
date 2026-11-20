"use client";
// /offline: send and receive with no internet (same Wi-Fi or a phone hotspot). Handshake by two QR codes, files straight
// across the local network (lib/offline.ts). The page caches itself (public/offline-sw.js) so it opens with no signal.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { LuArrowLeft, LuCamera, LuCheck, LuCopy, LuDownload, LuUpload, LuWifiOff } from "react-icons/lu";
import { decodeSignal, encodeSignal, gathered, newPeer, receiveFiles, revealLocalAddress, sendFiles, type Meta } from "@/lib/offline";

type Step =
  | { s: "home" }
  | { s: "pick" }
  | { s: "show"; who: "send" | "recv"; code: string }       // our code on screen (the other side scans it)
  | { s: "scan"; who: "send" | "recv" }                      // we scan the other side's code
  | { s: "wait"; who: "send" | "recv" }                      // connecting
  | { s: "move"; who: "send" | "recv"; total: number; done: number; names: string[] }
  | { s: "got"; files: File[] }
  | { s: "sent"; n: number; bytes: number }
  | { s: "err"; msg: string };

const fmt = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : b < 1073741824 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1073741824).toFixed(2)} GB`);

/** the page caches itself + its scripts so it opens next time with no internet */
function useOfflineCache() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register("/offline-sw.js", { scope: "/offline" }).then(async (reg) => {
      await navigator.serviceWorker.ready;
      const urls = [location.pathname, ...performance.getEntriesByType("resource").map((e) => e.name).filter((u) => u.startsWith(location.origin) && /\/_next\/static\//.test(u))];
      (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: "cache", urls });
      setReady(true);
    }).catch(() => {});
  }, []);
  return ready;
}

function QR({ text }: { text: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(text, { errorCorrectionLevel: "L", margin: 2, width: 720, color: { dark: "#000000", light: "#ffffff" } }).then(setSrc).catch(() => setSrc("")); }, [text]);
  // eslint-disable-next-line @next/next/no-img-element -- generated data: URL
  return src ? <img className="off-qr" src={src} alt="QR code to scan with the other device" /> : <div className="off-qr" />;
}

/** camera scanner: BarcodeDetector where the browser has it, jsQR on canvas frames otherwise; paste box as a fallback */
function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const vid = useRef<HTMLVideoElement>(null);
  const cb = useRef(onCode); cb.current = onCode;
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState("");
  const done = useRef(false);
  useEffect(() => {
    let stream: MediaStream | null = null, raf = 0, alive = true;
    const cnv = document.createElement("canvas"), g = cnv.getContext("2d", { willReadFrequently: true });
    type BD = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    const BDC = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BD }).BarcodeDetector;
    const det = BDC ? new BDC({ formats: ["qr_code"] }) : null;
    const hit = (s: string) => { if (done.current || !s.startsWith("ORBI-")) return; done.current = true; cb.current(s); };
    const tick = async () => {
      if (!alive) return;
      const v = vid.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        try {
          if (det) { const r = await det.detect(v); if (r[0]) hit(r[0].rawValue); }
          else if (g) { const w = Math.min(960, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth); cnv.width = w; cnv.height = h; g.drawImage(v, 0, 0, w, h); const r = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" }); if (r) hit(r.data); }
        } catch {}
      }
      raf = requestAnimationFrame(tick);
    };
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then((s) => {
      stream = s; if (!alive) return s.getTracks().forEach((t) => t.stop());
      if (vid.current) { vid.current.srcObject = s; vid.current.play().catch(() => {}); } tick();
    }).catch(() => setErr("No camera here (or it was blocked). Paste the code instead."));
    return () => { alive = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  return (
    <div className="off-scan">
      {!err && <video ref={vid} className="off-video" playsInline muted />}
      {!err && <div className="off-frame" aria-hidden />}
      {err && <p className="off-note">{err}</p>}
      <form className="off-paste" onSubmit={(e) => { e.preventDefault(); if (paste.trim()) onCode(paste.trim()); }}>
        <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="…or paste the code" aria-label="Paste the code" autoComplete="off" spellCheck={false} />
        <button className="pill lg-press" type="submit">Use</button>
      </form>
    </div>
  );
}

export default function OfflineView() {
  const cached = useOfflineCache();
  const [step, setStep] = useState<Step>({ s: "home" });
  const [online, setOnline] = useState(true);
  const [copied, setCopied] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const files = useRef<File[]>([]);
  const fileIn = useRef<HTMLInputElement>(null);

  useEffect(() => { const u = () => setOnline(navigator.onLine); u(); addEventListener("online", u); addEventListener("offline", u); return () => { removeEventListener("online", u); removeEventListener("offline", u); }; }, []);
  useEffect(() => () => pc.current?.close(), []);
  const fail = (e: unknown) => { pc.current?.close(); pc.current = null; setStep({ s: "err", msg: e instanceof Error ? e.message : String(e) }); };
  const watch = (p: RTCPeerConnection) => p.addEventListener("connectionstatechange", () => { if (p.connectionState === "failed") fail(new Error("Couldn't reach the other device. Are both on the same Wi-Fi or hotspot?")); });

  // ---- SEND: pick → our offer code → scan their reply → stream
  const startSend = async (list: File[]) => {
    if (!list.length) return;
    files.current = list;
    try {
      const camOff = await revealLocalAddress();
      const p = newPeer(); pc.current = p; watch(p);
      const dc = p.createDataChannel("orbi-offline", { ordered: true });
      dc.onopen = () => {
        const total = list.reduce((s, f) => s + f.size, 0), names = list.map((f) => f.name);
        setStep({ s: "move", who: "send", total, done: 0, names });
        sendFiles(dc, list, (d) => setStep({ s: "move", who: "send", total, done: d, names }))
          .then(() => { setStep({ s: "sent", n: list.length, bytes: total }); setTimeout(() => p.close(), 4000); }).catch(fail);
      };
      await p.setLocalDescription(await p.createOffer()); await gathered(p); camOff();
      setStep({ s: "show", who: "send", code: encodeSignal("offer", p.localDescription!.sdp) });
    } catch (e) { fail(e); }
  };
  const gotAnswer = async (code: string) => {
    try { await pc.current!.setRemoteDescription({ type: "answer", sdp: decodeSignal("answer", code) }); setStep({ s: "wait", who: "send" }); } catch (e) { fail(e); }
  };

  // ---- RECEIVE: scan their offer → our reply code → files arrive
  const gotOffer = async (code: string) => {
    try {
      const sdp = decodeSignal("offer", code);
      const camOff = await revealLocalAddress();
      const p = newPeer(); pc.current = p; watch(p);
      p.ondatachannel = ({ channel }) => {
        let total = 0, names: string[] = [];
        receiveFiles(channel, (m: Meta[]) => { total = m.reduce((s, f) => s + f.size, 0); names = m.map((f) => f.name); setStep({ s: "move", who: "recv", total, done: 0, names }); },
          (d) => setStep({ s: "move", who: "recv", total, done: d, names })).then((got) => setStep({ s: "got", files: got })).catch(fail);
      };
      await p.setRemoteDescription({ type: "offer", sdp });
      await p.setLocalDescription(await p.createAnswer()); await gathered(p); camOff();
      setStep({ s: "show", who: "recv", code: encodeSignal("answer", p.localDescription!.sdp) });
    } catch (e) { fail(e); }
  };

  const copy = async (c: string) => { try { await navigator.clipboard.writeText(c); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  const reset = () => { pc.current?.close(); pc.current = null; files.current = []; setStep({ s: "home" }); };
  const save = (f: File) => { const u = URL.createObjectURL(f); const a = document.createElement("a"); a.href = u; a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 30_000); };

  return (
    <main className="off" data-step={step.s}>
      <header className="off-top">
        <Link href="/" className="off-back glyph" onClick={() => pc.current?.close()}><LuArrowLeft aria-hidden />Orbi Transfer</Link>
        <span className={`off-net mono${online ? "" : " off"}`}>{online ? "online" : <><LuWifiOff aria-hidden /> no internet</>}</span>
      </header>
      <h1 className="wide off-h">Offline send</h1>
      <p className="off-sub">Same Wi-Fi or one phone&apos;s hotspot, no internet needed. Scan two codes and the files go straight across, device to device.</p>

      {step.s === "home" && (
        <div className="off-two">
          <button className="off-big lg-press" onClick={() => fileIn.current?.click()}><LuUpload aria-hidden /><b className="wide">Send</b><span className="mono dim">pick files</span></button>
          <button className="off-big lg-press" onClick={() => setStep({ s: "scan", who: "recv" })}><LuDownload aria-hidden /><b className="wide">Receive</b><span className="mono dim">scan the sender&apos;s code</span></button>
          <input ref={fileIn} type="file" multiple hidden onChange={(e) => { const l = Array.from(e.target.files || []); e.target.value = ""; if (l.length) { setStep({ s: "pick" }); startSend(l); } }} />
        </div>
      )}
      {step.s === "pick" && <p className="off-note">Getting ready…</p>}

      {step.s === "show" && (
        <section className="off-card" data-code={step.code}>
          <p className="off-k mono">{step.who === "send" ? "1 · show this to the receiver" : "2 · show this to the sender"}</p>
          <QR text={step.code} />
          <div className="off-row">
            <button className="pill lg-press glyph" onClick={() => copy(step.code)}>{copied ? <><LuCheck aria-hidden />Copied</> : <><LuCopy aria-hidden />Copy code</>}</button>
            {step.who === "send" && <button className="pill solid lg-press glyph" onClick={() => setStep({ s: "scan", who: "send" })}><LuCamera aria-hidden />Scan their reply</button>}
          </div>
          {step.who === "send" && <p className="off-note">{files.current.length} file{files.current.length > 1 ? "s" : ""} · {fmt(files.current.reduce((s, f) => s + f.size, 0))}. Keep this page open.</p>}
          {step.who === "recv" && <p className="off-note">Waiting for the sender to scan this. The files start by themselves.</p>}
        </section>
      )}

      {step.s === "scan" && (
        <section className="off-card">
          <p className="off-k mono">{step.who === "recv" ? "1 · scan the sender's code" : "2 · scan the receiver's reply"}</p>
          <Scanner onCode={step.who === "recv" ? gotOffer : gotAnswer} />
        </section>
      )}

      {step.s === "wait" && <section className="off-card"><p className="off-k mono">connecting…</p><div className="off-spin" aria-hidden /></section>}

      {step.s === "move" && (
        <section className="off-card">
          <p className="off-k mono">{step.who === "send" ? "sending" : "receiving"} · {step.names.length} file{step.names.length > 1 ? "s" : ""}</p>
          <div className="off-bar"><i style={{ width: `${step.total ? (step.done / step.total) * 100 : 0}%` }} /></div>
          <p className="off-note mono">{fmt(step.done)} / {fmt(step.total)}</p>
          <ul className="off-list">{step.names.slice(0, 6).map((n) => <li key={n} className="mono">{n}</li>)}</ul>
        </section>
      )}

      {step.s === "sent" && <section className="off-card"><p className="off-k mono">done</p><h2 className="wide off-done">Sent</h2><p className="off-note">{step.n} file{step.n > 1 ? "s" : ""} · {fmt(step.bytes)}, straight across. Nothing went through the internet.</p><button className="pill solid lg-press" onClick={reset}>Send more</button></section>}

      {step.s === "got" && (
        <section className="off-card">
          <p className="off-k mono">received · only on this device</p>
          <ul className="off-files">{step.files.map((f, i) => (
            <li key={i}>
              {f.type.startsWith("image/") && <Thumb f={f} />}
              <span className="mono">{f.name}<small className="dim"> · {fmt(f.size)}</small></span>
              <button className="pill solid lg-press glyph" onClick={() => save(f)}><LuDownload aria-hidden />Save</button>
            </li>))}
          </ul>
          <button className="pill lg-press" onClick={reset}>Done</button>
        </section>
      )}

      {step.s === "err" && <section className="off-card"><p className="off-k mono">didn&apos;t work</p><p className="off-note">{step.msg}</p><button className="pill solid lg-press" onClick={reset}>Try again</button></section>}

      <footer className="off-foot mono dim">{cached ? "Saved on this device: this page opens even with no internet." : "Open this page once with internet so it works offline next time."}</footer>
    </main>
  );
}

function Thumb({ f }: { f: File }) {
  const [u, setU] = useState("");
  useEffect(() => { const x = URL.createObjectURL(f); setU(x); return () => URL.revokeObjectURL(x); }, [f]);
  // eslint-disable-next-line @next/next/no-img-element -- a local blob preview
  return u ? <img className="off-thumb" src={u} alt="" /> : null;
}
