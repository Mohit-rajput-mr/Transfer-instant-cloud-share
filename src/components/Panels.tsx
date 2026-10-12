"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  deviceId, deviceLabel, dropOwnerKey, ext, formatBytes, formatClock, ownerKey, timeAgo, type Orb, type OwnerView,
} from "@/lib/client";
import { MAX_FILE_BYTES } from "@/lib/limits";
import { FOLDER_MIME, INLINE_MAX, LINK_MIME, canWriteFolders, isLinkText, packFolder, pickFolderTarget, textToFile, type DirHandle, type Folder } from "@/lib/bundle";
import { launch, pickSaveTarget, receive, UnlockError, type Stage } from "@/lib/transfer";

// Screen point the card zooms out of (the tapped sphere / button). Set right before opening.
let origin: { x: number; y: number } | null = null;
export const setCardOrigin = (x: number, y: number) => {
  origin = { x, y };
};

const CloseCtx = createContext<() => void>(() => {});
export const useCloseCard = () => useContext(CloseCtx);

export function Drawer({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const [closing, setClosing] = useState(false);
  const [from] = useState(() => {
    const o = origin;
    origin = null;
    if (!o || typeof window === "undefined") return { x: 0, y: 40 };
    return { x: o.x - window.innerWidth / 2, y: o.y - window.innerHeight / 2 };
  });
  const closingRef = useRef(false);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(onClose, 320);
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  const vars = { "--fx": `${from.x}px`, "--fy": `${from.y}px` } as CSSProperties;
  return (
    <CloseCtx.Provider value={close}>
      <div className={`scrim${closing ? " out" : ""}`} onClick={close} />
      <aside className={`drawer${closing ? " out" : ""}`} style={vars} role="dialog" aria-label={label}>
        <div className="drawer-head">
          <span className="mono dim">{label}</span>
          <button className="x" onClick={close} aria-label="Close">×</button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </CloseCtx.Provider>
  );
}

function BackBtn() {
  const close = useCloseCard();
  return <button className="ghost-btn" onClick={close}>Back to the void</button>;
}

const STAGE_LABEL: Record<Stage, string> = {
  packing: "Packing folder on this device",
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
      <div className="wide big-num">{Math.floor(frac * 100)}<span className="pct">%</span></div>
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
    <div className="share-mini">
      {qr ? <img src={qr} alt="QR code to this object" /> : <div className="qr-ph" />}
      <div className="share-side">
        <span className="mono dim">Orbit code</span>
        <div className="wide share-code">{id}</div>
        <button className={`pill${copied ? " solid" : ""}`} onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
      </div>
    </div>
  );
}

/* ------------------------------ SEND ------------------------------ */

export function SendPanel(props: { files: File[]; folder?: Folder | null; onClose: () => void; onLaunched: (orb: Orb) => void; onOpenOwner: (id: string) => void }) {
  const { folder, onClose, onLaunched } = props;
  // a folder travels as one object (no zipping: its files are streamed as-is behind a small manifest)
  const files = useMemo(() => (folder ? [packFolder(folder)] : props.files), [folder, props.files]);
  const single = files.length === 1;
  const total = folder ? folder.entries.reduce((a, e) => a + e.file.size, 0) : files.reduce((a, f) => a + f.size, 0);
  const isLink = single && files[0].type === LINK_MIME;
  const [name, setName] = useState(
    folder ? folder.name.slice(0, 60) : single ? files[0].name.replace(/\.[^.]+$/, "").slice(0, 60) : "",
  );
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

  const tooBig = folder ? (total > MAX_FILE_BYTES ? { name: `${folder.name} folder` } : undefined) : files.find((f) => f.size > MAX_FILE_BYTES);
  const go = async () => {
    if (code.length < 4 || busy || tooBig) return;
    setBusy(true);
    setErr(null);
    abort.current = new AbortController();
    const launched: Orb[] = [];
    try {
      const queue = files;
      for (let i = 0; i < queue.length; i++) {
        setIndex(i);
        const f = queue[i];
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
        <div className="col">
          <div className="wide d-title">In orbit.</div>
          <p className="note">{done.length > 1 ? `${done.length} objects float` : "It floats"} in the void for 30 minutes. Encrypted on this device. <b>Share the passcode separately.</b></p>
          {done.length > 1 && (
            <div className="files">{done.map((o) => <div key={o.id}><span>{o.name}</span><span className="mono dim">{o.id}</span></div>)}</div>
          )}
          {err && <p className="err">{err}</p>}
          <div className="grow" />
          <button className="cta" onClick={() => props.onOpenOwner(done[0].id)}>Mission control →</button>
        </div>
        <div className="col">
          <ShareBlock id={done[0].id} />
          <div className="grow" />
          <BackBtn />
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer label="New object" onClose={() => (busy ? abort.current?.abort() : onClose())}>
      <div className="col">
        <div>
          <span className="mono dim">
            {folder ? `folder · ${folder.entries.length} files` : isLink ? "link" : single ? files[0].type || "file" : `${files.length} files`} · {formatBytes(total)}
          </span>
          <div className="wide d-title">{folder ? "Folder" : isLink ? "Link" : single ? ext(files[0].name) : `${files.length}×`}</div>
          <p className="note ellip">{folder ? `${folder.name}/ — arrives as a real folder, structure intact` : single ? files[0].name : "Each file becomes its own object, one passcode."}</p>
        </div>
        {busy ? (
          <Progress stage={stage} frac={frac} extra={files.length > 1 ? `${index + 1} / ${files.length}` : formatBytes(total * frac)} />
        ) : single ? (
          <div className="field">
            <label><span className="mono">Name in orbit</span><span className="mono dim">{name.length}/60</span></label>
            <input className="line-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Give it a name" />
          </div>
        ) : (
          <div className="files">
            {files.map((f, i) => (
              <div key={i}><span>{f.name}</span><span className="mono dim">{formatBytes(f.size)}</span></div>
            ))}
          </div>
        )}
        <div className="grow" />
        <p className="mono dim">30 min lifetime · AES-256-GCM on device</p>
      </div>
      <div className="col">
        {busy ? (
          <>
            <div className="grow" />
            <button className="ghost-btn" onClick={() => abort.current?.abort()}>Abort launch</button>
          </>
        ) : (
          <>
            <PasscodeInput value={code} onChange={setCode} onEnter={go} autoFocus generate />
            <div className="field">
              <label><span className="mono">Burn after downloads</span><span className="mono dim">{max ? `${max} max` : "unlimited"}</span></label>
              <div className="chips">
                {[null, 1, 2, 3, 5, 10].map((m) => (
                  <button key={String(m)} className={`chip${max === m ? " on" : ""}`} onClick={() => setMax(m)}>{m ?? "∞"}</button>
                ))}
              </div>
            </div>
            {err && <p className="err">{err}</p>}
            {tooBig && <p className="err">{tooBig.name} is over the 2 GB limit</p>}
            <div className="grow" />
            <button className="cta" disabled={code.length < 4 || !!tooBig} onClick={go}>{code.length > 0 && code.length < 4 ? "Min 4 characters" : "Launch ↗"}</button>
          </>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------------------- TEXT / LINK ---------------------------- */

export function ComposePanel(props: { onClose: () => void; onReady: (file: File) => void }) {
  const [text, setText] = useState("");
  const link = isLinkText(text);
  const ok = text.trim().length > 0 && text.length <= 200_000;
  return (
    <Drawer label="Beam text or a link" onClose={props.onClose}>
      <div className="col">
        <span className="mono dim">{link ? "link detected" : text ? `${text.length.toLocaleString()} characters` : "anything you'd copy-paste"}</span>
        <div className="wide d-title">{link ? "Link" : "Note"}</div>
        <p className="note">Paste a URL, a code, an address, a message. It is encrypted like any file; the receiver can open or copy it instantly. Nothing is downloaded.</p>
      </div>
      <div className="col">
        <textarea
          className="compose"
          autoFocus
          value={text}
          maxLength={200_000}
          placeholder="https://… or any text"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && ok && props.onReady(textToFile(text))}
        />
        <button className="cta" disabled={!ok} onClick={() => props.onReady(textToFile(text))}>Continue →</button>
      </div>
    </Drawer>
  );
}

/* ----------------------------- RECEIVE ----------------------------- */

export function UnlockPanel(props: { orb: Orb; now: number; watchers: number; onClose: () => void; onDownloaded: () => void; onViewed: () => void }) {
  const { orb, now, watchers, onClose } = props;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("deriving");
  const [frac, setFrac] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [landed, setLanded] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const left = new Date(orb.expiresAt).getTime() - now;
  const isLink = orb.mime === LINK_MIME;
  const isFolder = orb.mime === FOLDER_MIME;
  const [saved, setSaved] = useState<{ folder: string; files: number; asZip: boolean; where?: string } | null>(null);
  const [needSpot, setNeedSpot] = useState(false);
  const inline = (isLink || orb.mime.startsWith("text/")) && orb.size <= INLINE_MAX;
  const [report, setReport] = useState<"idle" | "arm" | "sent">("idle");

  useEffect(() => () => abort.current?.abort(), []);

  const sendReport = () => {
    if (report === "idle") return setReport("arm");
    if (report !== "arm") return;
    setReport("sent");
    fetch(`/api/transfers/${orb.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId(), device: deviceLabel() }),
    }).then(() => props.onDownloaded()).catch(() => {});
  };

  const { onViewed } = props;
  useEffect(() => {
    fetch(`/api/transfers/${orb.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId(), device: deviceLabel() }),
    }).then(onViewed).catch(() => {});
  }, [orb.id, onViewed]);

  const go = async (mode?: { zip?: boolean }) => {
    if (!code || busy) return;
    // pickers must open inside the click gesture, before anything is unlocked or counted
    const target = inline || isFolder ? Promise.resolve(null) : pickSaveTarget(orb);
    let folderTarget: DirHandle | null = null;
    if (isFolder && !mode?.zip && canWriteFolders()) {
      const pick = await pickFolderTarget();
      if ("cancelled" in pick) {
        setNeedSpot(true);
        return;
      }
      if ("handle" in pick) folderTarget = pick.handle;
    }
    setNeedSpot(false);
    setBusy(true);
    setErr(null);
    abort.current = new AbortController();
    receive({
      orb, passcode: code, target, folderTarget, signal: abort.current.signal, inline,
      onProgress: (s, p) => {
        setStage(s);
        setFrac(p);
      },
    })
      .then((t) => {
        if (typeof t === "string") setText(t);
        else if (t) setSaved(t);
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
      <div className="col">
        <div>
          <span className="mono dim ellip">{orb.fileName}</span>
          <div className="wide d-title">{orb.name}</div>
        </div>
        <div className="grow" />
        <div className="kv">
          <div><span className="mono">Size</span><b>{formatBytes(orb.size)}</b></div>
          <div><span className="mono">Burns in</span><b>{formatClock(left)}</b></div>
          <div><span className="mono">Downloads</span><b>{orb.downloads}{orb.maxDownloads ? ` / ${orb.maxDownloads}` : ""}</b></div>
          <div><span className="mono">Live now</span><b>{watchers}</b></div>
        </div>
        <button className={`report mono${report === "arm" ? " arm" : ""}`} onClick={sendReport} disabled={report === "sent"}>
          {report === "sent" ? "Reported · thank you" : report === "arm" ? "Tap again to report abuse" : "⚑ Report"}
        </button>
      </div>
      <div className="col">
        {landed && text !== null ? (
          <>
            <span className="mono dim">{isLink ? "Decrypted link" : "Decrypted note"}</span>
            {isLink ? (
              <a className="link-out" href={text} target="_blank" rel="noopener noreferrer nofollow">{text}</a>
            ) : (
              <pre className="note-out">{text}</pre>
            )}
            <div className="grow" />
            <div className="row-btns">
              <button
                className="ghost-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {}
                }}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              {isLink && <a className="cta" href={text} target="_blank" rel="noopener noreferrer nofollow">Open link ↗</a>}
            </div>
          </>
        ) : landed && saved ? (
          <>
            <div className="wide d-title">Landed ✓</div>
            <p className="note">
              {saved.asZip
                ? <>Your browser can&apos;t write folders, so <b>{saved.folder}</b> ({saved.files} files) was saved as <b>{saved.folder}.zip</b>.</>
                : <>Folder <b>{saved.folder}/</b> saved inside <b>{saved.where}/</b> with all {saved.files} files and subfolders, exactly as sent.</>}
            </p>
            <div className="grow" />
            <BackBtn />
          </>
        ) : landed ? (
          <>
            <div className="wide d-title">Landed ✓</div>
            <p className="note">Decrypted on this device and saved as <b>{orb.fileName}</b>.</p>
            <div className="grow" />
            <BackBtn />
          </>
        ) : orb.status === "sealed" && !busy ? (
          <div className="sealed-msg mono">{err ? `${err} · ` : ""}Sealed: the sender&apos;s download limit was reached. It will burn up shortly.</div>
        ) : busy ? (
          <>
            <Progress stage={stage} frac={frac} extra={formatBytes(orb.size * frac)} />
            <div className="grow" />
            <button className="ghost-btn" onClick={() => abort.current?.abort()}>Abort</button>
          </>
        ) : (
          <>
            <PasscodeInput value={code} onChange={setCode} onEnter={() => go()} autoFocus />
            {err && <p className="err">{err}</p>}
            <p className="note">Decrypted locally. The passcode never leaves this device.</p>
            <div className="grow" />
            {isFolder && needSpot ? (
              <div className="spot-help">
                <b>Pick another folder</b>
                <span>Chrome locks <b>Downloads</b>, <b>Desktop</b> and <b>Documents</b> themselves for every website. Choose any folder inside them, or anywhere else, and the folder is saved there as-is.</span>
                <div className="row-btns">
                  <button className="ghost-btn" onClick={() => go({ zip: true })}>Get .zip instead</button>
                  <button className="cta" onClick={() => go()}>Choose folder</button>
                </div>
              </div>
            ) : isFolder ? (
              <p className="note">
                {!canWriteFolders()
                  ? "This browser can't write folders, so it arrives as a .zip (Chrome or Edge on a computer saves a real folder)."
                  : "Choose any folder and it lands there as-is: same name, every subfolder, no zip."}
              </p>
            ) : null}
            <button className="cta" disabled={!code || needSpot} onClick={() => go()}>{isLink ? "Decrypt + open link ↗" : inline ? "Decrypt + read" : isFolder ? "Decrypt + save folder ↓" : "Decrypt + download ↓"}</button>
          </>
        )}
      </div>
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
        <div className="col">
          <div className="wide d-title">Burned up.</div>
          <p className="note">This object has left orbit: it expired, was destroyed, or hit its download limit.</p>
        </div>
        <div className="col">
          <div className="grow" />
          <BackBtn />
        </div>
      </Drawer>
    );
  }

  const left = data ? new Date(data.expiresAt).getTime() - now : 0;
  const uniqueFails = data ? new Set(data.events.filter((e) => e.kind === "fail").map((e) => e.deviceId)).size : 0;

  return (
    <Drawer label="Mission control · sender only" onClose={onClose}>
      {!data ? (
        <>
          <div className="col">
            <div className="skel" style={{ width: "60%", height: 10 }} />
            <div className="skel" style={{ width: "80%", height: 52, marginTop: 4 }} />
            <div className="grow" />
            <div className="tiles">{[0, 1, 2, 3].map((i) => <div key={i} className="tile skel" style={{ height: 56 }} />)}</div>
          </div>
          <div className="col">
            <div className="skel" style={{ height: 84 }} />
            <div className="skel" style={{ height: 60 }} />
            <div className="grow" />
            <div className="skel" style={{ height: 36, borderRadius: 999 }} />
          </div>
        </>
      ) : (
        <>
          <div className="col">
            <div>
              <span className="mono dim ellip">{data.name} · {formatBytes(data.size)}</span>
              <div className="wide big-num" style={{ color: left < 60_000 ? "var(--danger)" : undefined }}>{formatClock(left)}</div>
              <span className="mono dim">until burn-up</span>
            </div>
            <div className="grow" />
            <div className="tiles">
              <div className="tile live-tile"><b className="wide">{watchers}</b><span className="mono">Live now</span></div>
              <div className="tile"><b className="wide">{data.views}</b><span className="mono">Opened</span></div>
              <div className="tile"><b className="wide">{data.downloads}{data.maxDownloads ? <small>/{data.maxDownloads}</small> : null}</b><span className="mono">Downloads</span></div>
              <div className={`tile${data.failed ? " bad" : ""}`}><b className="wide">{data.failed}</b><span className="mono" title={`${uniqueFails} devices · locks at 12`}>Wrong code</span></div>
            </div>
          </div>
          <div className="col">
            <ShareBlock id={id} />
            <div className="log">
              {data.events.length === 0 && <div><i style={{ background: "#333" }} /><span className="dim">Waiting for the first receiver…</span><time /></div>}
              {data.events.map((e, i) => (
                <div key={i} className={e.kind === "fail" || e.kind === "report" ? "fail" : e.kind === "view" ? "view" : ""}>
                  <i />
                  <span>{e.device || "Unknown"} · {e.kind === "fail" ? "wrong code" : e.kind === "view" ? "opened" : e.kind === "report" ? "reported it" : "downloaded"}</span>
                  <time>{timeAgo(e.at, now)}</time>
                </div>
              ))}
            </div>
            <div className="grow" />
            <button className={`danger-btn${arm ? " arm" : ""}`} onClick={destroy} disabled={deleting}>
              {deleting ? "Destroying…" : arm ? "Tap again to destroy" : "Destroy now"}
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}
