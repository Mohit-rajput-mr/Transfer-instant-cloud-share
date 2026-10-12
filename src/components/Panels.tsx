"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  dropOwnerKey, ext, formatBytes, formatClock, ownerKey, timeAgo, type Orb, type OwnerView,
} from "@/lib/client";
import { launch, pickSaveTarget, receive, UnlockError, type Stage } from "@/lib/transfer";

export function Drawer({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={label}>
        <div className="drawer-head">
          <span className="mono dim">{label}</span>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

const STAGE_LABEL: Record<Stage, string> = {
  deriving: "Forging key from passcode",
  encrypting: "Encrypting in your browser",
  uploading: "Encrypting + beaming into orbit",
  finalizing: "Stabilising orbit",
  decrypting: "Receiving + decrypting",
  done: "Done",
};

function Progress({ stage, frac, extra }: { stage: Stage; frac: number; extra?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="wide big-num">{Math.floor(frac * 100)}%</div>
      <div className="progress"><i style={{ transform: `scaleX(${frac})` }} /></div>
      <div className="stage mono"><span>{STAGE_LABEL[stage]}</span><span>{extra}</span></div>
    </div>
  );
}

function PasscodeInput(props: { value: string; onChange: (v: string) => void; onEnter?: () => void; autoFocus?: boolean; generate?: boolean }) {
  const [show, setShow] = useState(true);
  const gen = () => {
    const words = ["NOVA", "ORBIT", "LUNA", "COMET", "VEGA", "ATLAS", "ORION", "PULSAR", "QUASAR", "TITAN", "IO", "MARS"];
    const r = crypto.getRandomValues(new Uint32Array(2));
    props.onChange(`${words[r[0] % words.length]}${String(r[1] % 100).padStart(2, "0")}`);
  };
  return (
    <div className="field">
      <label>
        <span className="mono">Passcode</span>
        <span style={{ display: "flex", gap: 12 }}>
          {props.generate && <button className="mono dim" onClick={gen} type="button">Generate</button>}
          <button className="mono dim" onClick={() => setShow((s) => !s)} type="button">{show ? "Hide" : "Show"}</button>
        </span>
      </label>
      <input
        className="line-input code-input"
        type={show ? "text" : "password"}
        value={props.value}
        autoFocus={props.autoFocus}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="••••"
        maxLength={64}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && props.onEnter?.()}
      />
    </div>
  );
}

function useQR(text: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    QRCode.toDataURL(text, { margin: 0, width: 224, color: { dark: "#000000", light: "#ffffff" } }).then(setSrc).catch(() => setSrc(null));
  }, [text]);
  return src;
}

export function ShareBlock({ id }: { id: string }) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/?o=${id}` : "";
  const qr = useQR(link);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="share">
        {qr ? <img src={qr} alt="QR code to this object" /> : <div style={{ width: 112, height: 112 }} />}
        <div>
          <span className="mono dim">Orbit code</span>
          <div className="wide share-code">{id}</div>
          <p className="note" style={{ marginTop: 8 }}>Scan, open the link, or just open this site on the other device. The object is already floating there.</p>
        </div>
      </div>
      <div className="linkbox">
        <span>{link.replace(/^https?:\/\//, "")}</span>
        <button className={`pill${copied ? " solid" : ""}`} onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
      </div>
    </div>
  );
}

/* ------------------------------ SEND ------------------------------ */

export function SendPanel(props: { files: File[]; onClose: () => void; onLaunched: (orb: Orb) => void; onOpenOwner: (id: string) => void }) {
  const { files, onClose, onLaunched } = props;
  const single = files.length === 1;
  const total = files.reduce((a, f) => a + f.size, 0);
  const [name, setName] = useState(single ? files[0].name.replace(/\.[^.]+$/, "").slice(0, 60) : "");
  const [code, setCode] = useState("");
  const [max, setMax] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("deriving");
  const [frac, setFrac] = useState(0);
  const [index, setIndex] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Orb[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const go = async () => {
    if (code.length < 4 || busy) return;
    setBusy(true);
    setErr(null);
    abort.current = new AbortController();
    const launched: Orb[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setIndex(i);
        const f = files[i];
        const orb = await launch({
          file: f,
          name: single ? name.trim() || f.name : f.name.replace(/\.[^.]+$/, "").slice(0, 60),
          passcode: code,
          maxDownloads: max,
          signal: abort.current.signal,
          onProgress: (s, p) => {
            setStage(s);
            setFrac(p);
          },
        });
        launched.push(orb);
        onLaunched(orb);
      }
      setDone(launched);
    } catch (e) {
      if (!abort.current.signal.aborted) setErr(e instanceof Error ? e.message : "Launch failed");
      if (launched.length) setDone(launched);
    } finally {
      setBusy(false);
    }
  };

  if (done.length) {
    return (
      <Drawer label="Launched" onClose={onClose}>
        <div>
          <span className="mono dim">Status</span>
          <div className="wide d-title" style={{ marginTop: 8 }}>In orbit.</div>
          <p className="d-sub">{done.length > 1 ? `${done.length} objects are` : "Your object is"} floating in the void for the next 30 minutes. Encrypted on this device. Nobody, not even the server, can open {done.length > 1 ? "them" : "it"} without the passcode.</p>
        </div>
        {done.length === 1 ? (
          <ShareBlock id={done[0].id} />
        ) : (
          <div className="files">{done.map((o) => <div key={o.id}><span>{o.name}</span><span className="mono dim">{o.id}</span></div>)}</div>
        )}
        <p className="note"><b>Share the passcode separately</b>: say it out loud or send it in another app.</p>
        {err && <p className="err">{err}</p>}
        <button className="cta" onClick={() => props.onOpenOwner(done[0].id)}>Live mission control →</button>
        <button className="ghost-btn" onClick={onClose}>Back to the void</button>
      </Drawer>
    );
  }

  return (
    <Drawer label="New object" onClose={() => (busy ? abort.current?.abort() : onClose())}>
      <div>
        <span className="mono dim">{single ? files[0].type || "file" : `${files.length} files`}</span>
        <div className="wide d-title" style={{ marginTop: 8 }}>{single ? ext(files[0].name) : `${files.length}×`}</div>
        <p className="d-sub">{single ? files[0].name : "Each file becomes its own floating object, sharing one passcode."} · {formatBytes(total)}</p>
      </div>

      {!single && (
        <div className="files">
          {files.map((f, i) => (
            <div key={i}><span>{f.name}</span><span className="mono dim">{formatBytes(f.size)}</span></div>
          ))}
        </div>
      )}

      {busy ? (
        <>
          <Progress stage={stage} frac={frac} extra={files.length > 1 ? `${index + 1} / ${files.length}` : formatBytes(files[0].size * frac)} />
          <button className="ghost-btn" onClick={() => abort.current?.abort()}>Abort launch</button>
        </>
      ) : (
        <>
          {single && (
            <div className="field">
              <label><span className="mono">Name in orbit</span><span className="mono dim">{name.length}/60</span></label>
              <input className="line-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Give it a name" />
            </div>
          )}
          <PasscodeInput value={code} onChange={setCode} onEnter={go} autoFocus generate />
          <div className="field">
            <label><span className="mono">Burn after downloads</span><span className="mono dim">{max ? `${max} max` : "unlimited"}</span></label>
            <div className="chips">
              {[null, 1, 2, 3, 5, 10].map((m) => (
                <button key={String(m)} className={`chip${max === m ? " on" : ""}`} onClick={() => setMax(m)}>{m ?? "∞"}</button>
              ))}
            </div>
          </div>
          <div className="kv">
            <div><span className="mono">Lifetime</span><b>30 minutes</b></div>
            <div><span className="mono">Encryption</span><b>AES-256-GCM · on device</b></div>
          </div>
          {err && <p className="err">{err}</p>}
          <button className="cta" disabled={code.length < 4} onClick={go}>Launch into orbit ↗</button>
          {code.length > 0 && code.length < 4 && <p className="note">Passcode needs at least 4 characters.</p>}
        </>
      )}
    </Drawer>
  );
}

/* ----------------------------- RECEIVE ----------------------------- */

export function UnlockPanel(props: { orb: Orb; now: number; watchers: number; onClose: () => void; onDownloaded: () => void }) {
  const { orb, now, watchers, onClose } = props;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("deriving");
  const [frac, setFrac] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [landed, setLanded] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const left = new Date(orb.expiresAt).getTime() - now;

  useEffect(() => () => abort.current?.abort(), []);

  const go = () => {
    if (!code || busy) return;
    const target = pickSaveTarget(orb); // must run inside the click gesture
    setBusy(true);
    setErr(null);
    abort.current = new AbortController();
    receive({
      orb, passcode: code, target, signal: abort.current.signal,
      onProgress: (s, p) => {
        setStage(s);
        setFrac(p);
      },
    })
      .then(() => {
        setLanded(true);
        props.onDownloaded();
      })
      .catch((e) => {
        if (abort.current?.signal.aborted) return;
        if (e instanceof UnlockError) {
          setErr(
            e.reason === "wrong" ? `Wrong passcode · ${e.left ?? 0} tries left`
              : e.reason === "locked" ? "Locked: too many wrong attempts"
              : e.reason === "sealed" ? "Sealed: download limit reached"
              : "This object already burned up",
          );
          if (e.reason !== "wrong") props.onDownloaded();
        } else setErr(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => setBusy(false));
  };

  return (
    <Drawer label="Incoming object" onClose={() => (busy ? abort.current?.abort() : onClose())}>
      <div>
        <span className="mono dim">{orb.fileName}</span>
        <div className="wide d-title" style={{ marginTop: 8 }}>{orb.name}</div>
      </div>
      <div className="kv">
        <div><span className="mono">Size</span><b>{formatBytes(orb.size)}</b></div>
        <div><span className="mono">Burns in</span><b>{formatClock(left)}</b></div>
        <div><span className="mono">Downloads</span><b>{orb.downloads}{orb.maxDownloads ? ` / ${orb.maxDownloads}` : ""}</b></div>
        <div><span className="mono">Watching now</span><b>{watchers}</b></div>
      </div>

      {landed ? (
        <>
          <div className="wide d-title">Landed ✓</div>
          <p className="note">Decrypted on this device and saved as <b>{orb.fileName}</b>.</p>
          <button className="ghost-btn" onClick={onClose}>Back to the void</button>
        </>
      ) : orb.status === "sealed" && !busy ? (
        <div className="sealed-msg mono">{err ? `${err} · ` : ""}Sealed: the sender&apos;s download limit was reached. It will burn up shortly.</div>
      ) : busy ? (
        <>
          <Progress stage={stage} frac={frac} extra={formatBytes(orb.size * frac)} />
          <button className="ghost-btn" onClick={() => abort.current?.abort()}>Abort</button>
        </>
      ) : (
        <>
          <PasscodeInput value={code} onChange={setCode} onEnter={go} autoFocus />
          {err && <p className="err">{err}</p>}
          <button className="cta" disabled={!code} onClick={go}>Decrypt + download ↓</button>
          <p className="note">The passcode never leaves this device. It derives the key that decrypts the file locally.</p>
        </>
      )}
    </Drawer>
  );
}

/* ------------------------------ OWNER ------------------------------ */

export function OwnerPanel(props: { id: string; now: number; watchers: number; pulse: number; onClose: () => void; onDeleted: (id: string) => void }) {
  const { id, now, watchers, pulse, onClose } = props;
  const [data, setData] = useState<OwnerView | null>(null);
  const [gone, setGone] = useState(false);
  const [arm, setArm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    const key = ownerKey(id);
    if (!key) {
      setGone(true);
      return;
    }
    const load = async () => {
      const r = await fetch(`/api/transfers/${id}/owner`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner: key }) }).catch(() => null);
      if (!alive || !r) return;
      if (r.status === 404) setGone(true);
      else if (r.ok) setData(await r.json());
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id, pulse]);

  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 3000);
    return () => clearTimeout(t);
  }, [arm]);

  const destroy = async () => {
    if (!arm) return setArm(true);
    setDeleting(true);
    const key = ownerKey(id) ?? "";
    const r = await fetch(`/api/transfers/${id}`, { method: "DELETE", headers: { "x-owner": key } }).catch(() => null);
    if (r?.ok || r?.status === 403) {
      dropOwnerKey(id);
      props.onDeleted(id);
    }
    setDeleting(false);
  };

  if (gone) {
    return (
      <Drawer label="Mission control" onClose={onClose}>
        <div className="wide d-title">Burned up.</div>
        <p className="note">This object has left orbit: it expired, was destroyed, or hit its download limit.</p>
        <button className="ghost-btn" onClick={onClose}>Back to the void</button>
      </Drawer>
    );
  }

  const left = data ? new Date(data.expiresAt).getTime() - now : 0;
  const uniqueFails = data ? new Set(data.events.filter((e) => e.kind === "fail").map((e) => e.deviceId)).size : 0;

  return (
    <Drawer label="Mission control · sender only" onClose={onClose}>
      {!data ? (
        <div className="mono dim">Establishing uplink…</div>
      ) : (
        <>
          <div>
            <span className="mono dim">{data.fileName} · {formatBytes(data.size)}</span>
            <div className="wide d-title" style={{ marginTop: 8 }}>{data.name}</div>
          </div>
          <div>
            <span className="mono dim">Burns up in</span>
            <div className="wide big-num" style={{ color: left < 60_000 ? "var(--danger)" : undefined }}>{formatClock(left)}</div>
          </div>
          <div className="stats">
            <div className="stat live-row">
              <div><span className="mono">Accessing now</span><p className="note">Devices with this object open right now</p></div>
              <span className="wide">{watchers}</span>
            </div>
            <div className="stat">
              <div><span className="mono">Downloads</span><p className="note">{data.maxDownloads ? `Burns after ${data.maxDownloads}` : "No limit set"}</p></div>
              <span className="wide">{data.downloads}{data.maxDownloads ? <span style={{ color: "#333" }}>/{data.maxDownloads}</span> : null}</span>
            </div>
            <div className="stat">
              <div><span className="mono">Unique devices</span><p className="note">Distinct devices that received it</p></div>
              <span className={`wide${data.devices ? "" : " faint"}`}>{data.devices}</span>
            </div>
            <div className="stat">
              <div><span className="mono">Wrong passcodes</span><p className="note">{data.failed ? `From ${uniqueFails} device${uniqueFails === 1 ? "" : "s"} · locks at 12` : "No intruders"}</p></div>
              <span className={`wide${data.failed ? "" : " faint"}`} style={data.failed ? { color: "var(--danger)" } : undefined}>{data.failed}</span>
            </div>
          </div>
          <div>
            <span className="mono dim">Flight log</span>
            <div className="log" style={{ marginTop: 8 }}>
              {data.events.length === 0 && <div><i style={{ background: "#333" }} /><span className="dim">Waiting for the first receiver…</span><time /></div>}
              {data.events.map((e, i) => (
                <div key={i} className={e.kind === "fail" ? "fail" : ""}>
                  <i />
                  <span>{e.device || "Unknown device"} · {e.kind === "fail" ? "wrong passcode" : "downloaded"}</span>
                  <time>{timeAgo(e.at, now)}</time>
                </div>
              ))}
            </div>
          </div>
          <ShareBlock id={id} />
          <button className={`danger-btn${arm ? " arm" : ""}`} onClick={destroy} disabled={deleting}>
            {deleting ? "Destroying…" : arm ? "Tap again to destroy forever" : "Destroy now"}
          </button>
        </>
      )}
    </Drawer>
  );
}
