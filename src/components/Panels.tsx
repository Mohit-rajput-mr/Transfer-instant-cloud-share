"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  deviceId, deviceLabel, dropOwnerKey, ext, formatBytes, formatClock, hasGot, markGot, ownerKey, timeAgo, type Orb, type OwnerView, homePath,
} from "@/lib/client";
import { MAX_FILE_BYTES, MAX_LABEL } from "@/lib/limits";
import { previewUrl } from "@/lib/preview";
import { release } from "@/lib/p2p";
import { enqueue } from "@/lib/downloads";
import { FOLDER_MIME, INLINE_MAX, LINK_MIME, canWriteFolders, filesBundle, isFolder, isLoose, isLinkText, itemName, itemSize, mergeItems, packFolder, pickFolderTarget, textToFile, type DirHandle, type Item } from "@/lib/bundle";
import { needsSavePicker, pickSaveTarget, receive, unlockOrb, UnlockError, type Unlocked, type Received, type Stage } from "@/lib/transfer";
import { autoDownload, canPickSave, canShareFile, canShareFiles, deviceNoun, downloadWhere, downloadsShortcut, pickAndWrite, saveEnv, shareFile } from "@/lib/save";
import "@/app/save.css";
import { glyph } from "./Glyph";
import Viewer, { viewKind } from "./Viewer";
import { canPeek, peekFile } from "@/lib/peek";
import { Meter } from "@/lib/rate";
import type { Task } from "@/lib/tasks";
import { LuArrowRight, LuCheck, LuChevronDown, LuFlag, LuInfinity } from "react-icons/lu";
import { BsIncognito } from "react-icons/bs";
import { isAnon } from "@/lib/anon";
import { genericTitle } from "@/lib/scrub";

// Screen point the card zooms out of (the tapped sphere / button). Set right before opening.
let origin: { x: number; y: number } | null = null;
export const setCardOrigin = (x: number, y: number) => {
  origin = { x, y };
};

const CloseCtx = createContext<() => void>(() => {});
export const useCloseCard = () => useContext(CloseCtx);

// Phones and short landscape screens get an iOS-style bottom sheet; everything else the centred card.
const SHEET_MQ = "(max-width: 720px), (max-height: 520px)";
const isSheet = () => typeof window !== "undefined" && window.matchMedia(SHEET_MQ).matches;
/** Autofocus only with a mouse: on a phone the keyboard would jump up mid-animation and cover the card. */
const finePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
/** Haptic tick through the Liquid Glass runtime (Android vibrate, iOS switch trick; no-op elsewhere). */
const tick = (detail: "light" | "success" | "warn" = "light") => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orbit:haptic", { detail }));
};

type SheetDrag = { y0: number; dy: number; off: number; v: number; ly: number; lt: number; raf: number };

/**
 * The glass card. Desktop: zooms out of the tapped sphere into the centre. Phones: a bottom sheet
 * that slides up, rides on top of the keyboard, and can be dragged down to dismiss (grabber or, when
 * the content is scrolled to the top, anywhere on it). `locked` keeps stray swipes / scrim taps from
 * closing it mid-operation; × and Escape always work.
 */
export function Drawer({ label, onClose, children, locked = false }: { label: string; onClose: () => void; children: ReactNode; locked?: boolean }) {
  const [closing, setClosing] = useState(false);
  const [from] = useState(() => {
    const o = origin;
    origin = null;
    if (!o || typeof window === "undefined") return { x: 0, y: 40 };
    return { x: o.x - window.innerWidth / 2, y: o.y - window.innerHeight / 2 };
  });
  const sheet = useRef<HTMLElement>(null);
  const closingRef = useRef(false);
  const doneRef = useRef(false);
  const gen = useRef(0);
  const mounted = useRef(true);
  const lockedRef = useRef(locked);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    lockedRef.current = locked;
    onCloseRef.current = onClose;
  }, [locked, onClose]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // after the exit animation: hand over to the parent (which normally unmounts the card)
  const finish = useCallback((g: number) => {
    if (g !== gen.current || doneRef.current) return;
    doneRef.current = true;
    onCloseRef.current();
    // the parent kept the card (it only cancelled something): bring it back instead of leaving an invisible overlay
    setTimeout(() => {
      if (!mounted.current || g !== gen.current) return;
      gen.current++;
      closingRef.current = false;
      doneRef.current = false;
      if (sheet.current) {
        sheet.current.style.animation = "";
        sheet.current.style.removeProperty("--drag");
      }
      document.documentElement.classList.add("card-open");
      setClosing(false);
    }, 80);
  }, []);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const g = ++gen.current;
    // a drag that sprang back (or a vetoed swipe) leaves `animation: none` inline, which would mask the
    // exit animation: the card would sit there frozen until the fallback timer, then vanish
    const el = sheet.current;
    if (el && el.style.animationName === "none") {
      el.style.removeProperty("--drag");
      el.style.animation = isSheet() ? "sheet-out var(--dur-2) var(--ease-in) both" : "unpop 0.3s var(--ease-in) both";
    }
    document.documentElement.classList.remove("card-open"); // the page springs back while the card leaves
    setClosing(true);
    setTimeout(() => finish(g), 560); // fallback if animationend never arrives
  }, [finish]);
  const onAnimEnd = (e: React.AnimationEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget || !closingRef.current) return;
    if (e.animationName === "unpop" || e.animationName === "sheet-out") finish(gen.current);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Page behind: scroll-locked + receding. Keyboard: the sheet follows the visual viewport.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sy", `${Math.round(window.scrollY)}px`); // recede around what is on screen
    root.classList.add("card-open");
    const el = sheet.current;
    const vv = window.visualViewport;
    let raf = 0;
    const sync = () => {
      raf = 0;
      if (!el) return;
      if (!vv || !isSheet() || vv.scale > 1.01) {
        el.style.removeProperty("--kb");
        el.style.removeProperty("--vvh");
        el.classList.remove("kb");
        return;
      }
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      el.style.setProperty("--kb", `${kb}px`);
      el.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      el.classList.toggle("kb", kb > 80);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    sync();
    vv?.addEventListener("resize", on);
    vv?.addEventListener("scroll", on);
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", on);
      vv?.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      root.classList.remove("card-open");
    };
  }, []);

  // Swipe down to dismiss (sheet mode only).
  useEffect(() => {
    const el = sheet.current;
    const head = el?.querySelector<HTMLElement>(".drawer-head");
    const body = el?.querySelector<HTMLElement>(".drawer-body");
    if (!el || !head || !body) return;
    let d: SheetDrag | null = null;
    let settle: ReturnType<typeof setTimeout> | null = null;

    const currentY = () => {
      const t = getComputedStyle(el).transform;
      if (!t || t === "none") return 0;
      try {
        return new DOMMatrixReadOnly(t).m42;
      } catch {
        return 0;
      }
    };
    const start = (y: number) => {
      if (closingRef.current || !isSheet()) return false;
      if (settle) clearTimeout(settle);
      const base = currentY(); // pick it up where it is, even mid-entrance
      el.style.animation = "none";
      el.style.transition = "none";
      el.style.transform = `translate3d(0, ${base}px, 0)`;
      d = { y0: y - base, dy: base, off: base, v: 0, ly: y, lt: performance.now(), raf: 0 };
      el.classList.add("dragging");
      return true;
    };
    const move = (y: number) => {
      if (!d) return;
      const g = d;
      const t = performance.now();
      g.v = g.v * 0.4 + ((y - g.ly) / Math.max(1, t - g.lt)) * 0.6;
      g.ly = y;
      g.lt = t;
      g.dy = y - g.y0;
      g.off = g.dy < 0 ? -Math.sqrt(-g.dy) * 3 : g.dy; // pulling up resists like rubber
      if (!g.raf) g.raf = requestAnimationFrame(() => {
        g.raf = 0;
        if (d === g) el.style.transform = `translate3d(0, ${g.off}px, 0)`;
      });
    };
    // a programmatic tap on × so whatever guards that button (an unsaved file) can veto the swipe too
    const requestClose = () => {
      const x = head.querySelector<HTMLButtonElement>(".x");
      if (x) x.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      else close();
      return closingRef.current;
    };
    const end = () => {
      const g = d;
      d = null;
      if (!g) return;
      cancelAnimationFrame(g.raf);
      el.classList.remove("dragging");
      const far = g.dy > Math.min(170, el.offsetHeight * 0.3) || (g.v > 0.45 && g.dy > 28);
      if (far && !lockedRef.current) {
        el.style.setProperty("--drag", `${Math.max(0, g.off)}px`);
        el.style.transition = "";
        el.style.transform = "";
        el.style.animation = "sheet-out var(--dur-2) var(--ease-in) both";
        if (requestClose()) {
          tick();
          return;
        }
        el.style.animation = "none";
        el.style.removeProperty("--drag");
        el.style.transform = `translate3d(0, ${g.off}px, 0)`;
        void el.offsetWidth;
      }
      // not far enough (or vetoed): spring back into place
      el.style.transition = "transform 0.5s var(--spring-soft)";
      el.style.transform = "translate3d(0, 0, 0)";
      settle = setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
      }, 520);
    };

    // grabber / header: any pointer
    const headDown = (e: PointerEvent) => {
      if ((e.target as Element).closest("button") || (e.pointerType === "mouse" && e.button !== 0)) return;
      if (!start(e.clientY)) return;
      const id = e.pointerId;
      const mv = (ev: PointerEvent) => ev.pointerId === id && move(ev.clientY);
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return;
        window.removeEventListener("pointermove", mv);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        end();
      };
      window.addEventListener("pointermove", mv);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    };

    // content: a downward pull while it is scrolled to the top moves the whole sheet (like iOS)
    let sx = 0, sy = 0, mode: "idle" | "drag" | "pass" = "pass";
    const scrolledInside = (t: Element | null) => {
      for (let n = t as HTMLElement | null; n && n !== body; n = n.parentElement) {
        if (n.scrollTop > 0 && n.scrollHeight > n.clientHeight + 1) return true;
      }
      return false;
    };
    const ts = (e: TouchEvent) => {
      const t = e.target as Element;
      mode = e.touches.length === 1 && isSheet() && !closingRef.current && !t.closest("input, textarea, select, video, audio, [data-noswipe]") ? "idle" : "pass";
      sx = e.touches[0]?.clientX ?? 0;
      sy = e.touches[0]?.clientY ?? 0;
    };
    const tm = (e: TouchEvent) => {
      if (mode === "pass") return;
      const p = e.touches[0];
      if (!p) return;
      if (mode === "idle") {
        const dx = p.clientX - sx, dy = p.clientY - sy;
        const pulling = dy > 0 && dy >= Math.abs(dx) && body.scrollTop <= 0 && !scrolledInside(e.target as Element);
        if (!pulling) {
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) mode = "pass";
          return;
        }
        if (e.cancelable) e.preventDefault(); // no rubber-band of the content: the sheet moves instead
        if (dy < 8) return;
        if (!start(sy)) {
          mode = "pass";
          return;
        }
        mode = "drag";
      }
      if (e.cancelable) e.preventDefault();
      move(p.clientY);
    };
    const te = () => {
      if (mode === "drag") end();
      mode = "pass";
    };

    head.addEventListener("pointerdown", headDown);
    body.addEventListener("touchstart", ts, { passive: true });
    body.addEventListener("touchmove", tm, { passive: false });
    body.addEventListener("touchend", te);
    body.addEventListener("touchcancel", te);
    return () => {
      if (settle) clearTimeout(settle);
      head.removeEventListener("pointerdown", headDown);
      body.removeEventListener("touchstart", ts);
      body.removeEventListener("touchmove", tm);
      body.removeEventListener("touchend", te);
      body.removeEventListener("touchcancel", te);
    };
  }, [close]);

  const vars = { "--fx": `${from.x}px`, "--fy": `${from.y}px` } as CSSProperties;
  return (
    <CloseCtx.Provider value={close}>
      <div className={`scrim${closing ? " out" : ""}`} onClick={() => !lockedRef.current && close()} />
      <aside ref={sheet} className={`drawer lg${closing ? " out" : ""}`} style={vars} role="dialog" aria-modal="true" aria-label={label} onAnimationEnd={onAnimEnd}>
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
  return <button className="ghost-btn lg-press" onClick={close}>Back to the void</button>;
}

const STAGE_LABEL: Record<Stage, string> = {
  packing: "Packing folder on this device",
  deriving: "Unlocking",
  encrypting: "Encrypting in your browser",
  uploading: "Encrypting + beaming into orbit",
  finalizing: "Stabilising orbit",
  decrypting: "Receiving + decrypting",
  done: "Done",
};

/**
 * Progress that never stalls or jumps: reports can arrive in big steps (decrypt reports once per
 * 8 MB chunk), so between them the bar keeps gliding at the measured rate, never past ~85% of the
 * next expected step and never backwards. Painted straight onto the DOM once per frame (transform +
 * a text node), so a transfer doesn't re-render React 60 times a second.
 */
function Progress({ stage, frac, extra }: { stage: Stage; frac: number; extra?: string }) {
  const num = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  const st = useRef({ cur: 0, stage, hist: [] as { t: number; f: number }[] });
  // nothing measurable yet (key derivation, the first chunk): a sweep instead of a frozen 0%
  const indet = frac <= 0.001 && stage !== "done";
  const moving = (stage === "uploading" || stage === "decrypting" || stage === "encrypting") && frac < 1;

  useEffect(() => {
    const s = st.current;
    const now = performance.now();
    const h = s.hist;
    // a new stage, or the next file of a batch: measure the rate afresh
    if (s.stage !== stage || (h.length && frac < h[h.length - 1].f)) {
      h.length = 0;
      if (frac < s.cur) s.cur = frac;
    }
    s.stage = stage;
    h.push({ t: now, f: frac });
    if (h.length > 5) h.shift();
  }, [frac, stage]);

  useEffect(() => {
    let raf = 0;
    const paint = () => {
      raf = 0;
      const s = st.current, h = s.hist;
      let goal = frac;
      if (moving && h.length >= 2) {
        const a = h[0], b = h[h.length - 1];
        const per = (b.f - a.f) / (h.length - 1); // typical jump between two reports
        const rate = (b.f - a.f) / Math.max(1, b.t - a.t); // progress per ms
        goal = Math.min(0.995, frac + Math.min(per * 0.85, rate * (performance.now() - b.t)));
      }
      const d = goal - s.cur;
      if (d > 0) s.cur = d < 0.0005 ? goal : s.cur + d * (moving ? 0.14 : 0.22);
      if (bar.current) bar.current.style.transform = `scaleX(${s.cur})`;
      const t = num.current?.firstChild;
      if (t) t.nodeValue = String(Math.min(100, Math.floor(s.cur * 100 + 1e-6)));
      if (moving || goal - s.cur > 0.0005) raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [frac, moving]);

  return (
    <div className="progress-wrap">
      <div className="wide big-num"><span ref={num}>0</span><span className="pct">%</span></div>
      <div className="progress" role="progressbar" aria-label={STAGE_LABEL[stage]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indet ? undefined : Math.round(frac * 100)}>
        <i ref={bar} />
        {indet && <b className="sweep" />}
      </div>
      <div className="stage mono"><span>{STAGE_LABEL[stage]}</span><span>{extra}</span></div>
    </div>
  );
}

function PasscodeInput(props: { value: string; onChange: (v: string) => void; onEnter?: () => void; autoFocus?: boolean; generate?: boolean }) {
  const [show, setShow] = useState(true);
  // mask with CSS where possible: type=password makes iOS offer Keychain / "Save Password?" for a one-off code
  const [cssMask] = useState(() => typeof CSS !== "undefined" && !!CSS.supports?.("-webkit-text-security", "disc"));
  const [focusNow] = useState(() => !!props.autoFocus && finePointer());
  const gen = () => {
    const words = ["NOVA", "ORBIT", "LUNA", "COMET", "VEGA", "ATLAS", "ORION", "PULSAR", "QUASAR", "TITAN", "IO", "MARS"];
    const r = crypto.getRandomValues(new Uint32Array(2));
    props.onChange(`${words[r[0] % words.length]}${String(r[1] % 100).padStart(2, "0")}`);
  };
  return (
    <div className="field">
      <label>
        <span className="mono">Password</span>
        <span style={{ display: "flex", gap: 14 }}>
          {props.generate && <button className="mono dim" onClick={gen} type="button">Generate</button>}
          <button className="mono dim" onClick={() => setShow((s) => !s)} type="button">{show ? "Hide" : "Show"}</button>
        </span>
      </label>
      <input
        className={`line-input code-input${!show && cssMask ? " masked" : ""}`}
        type={show || cssMask ? "text" : "password"}
        value={props.value}
        autoFocus={focusNow}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="go"
        data-1p-ignore=""
        data-lpignore="true"
        placeholder="••••"
        maxLength={64}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.currentTarget.blur(); // drop the keyboard so the progress is visible
          props.onEnter?.();
        }}
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
  const link = typeof window !== "undefined" ? `${window.location.origin}${homePath()}?o=${id}` : "";
  const qr = useQR(link);
  const [copied, setCopied] = useState(false);
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  // phones: straight into the share sheet (Messages, AirDrop, WhatsApp …)
  const share = () => {
    navigator.share({ title: "Orbi Transfer", text: `Open ${id} on Orbi Transfer`, url: link }).catch(() => {});
  };
  return (
    <div className="share-mini">
      {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URL, nothing to optimise */}
      {qr ? <img src={qr} alt="QR code to this object" /> : <div className="qr-ph" />}
      <div className="share-side">
        <span className="mono dim">Orbit code</span>
        <div className="wide share-code">{id}</div>
        <div className="share-btns">
          <button className={`pill lg-press${copied ? " solid" : ""}`} onClick={copy}>{glyph(copied ? "Copied ✓" : "Copy link")}</button>
          {canShare && <button className="pill lg-press" onClick={share}>{glyph("Share ↗")}</button>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ SEND ------------------------------ */

export type LaunchJob = { file: File; name: string; files: number; passcode: string; maxDownloads: number | null; life: number; open: boolean; group?: string; /** wired to this task */ task?: string; /** and tick that task done */ done?: boolean; /** anonymous "hide file names": the file goes as photo.jpg, file.pdf… */ hideNames?: boolean };

const LIVES = [5, 10, 15, 20, 25, 30];
// the last choices stick (this device only): the next send is one tap
const pref = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(`orbit:pref:${k}`);
    return v == null ? d : (JSON.parse(v) as T);
  } catch {
    return d;
  }
};
const setPref = (k: string, v: unknown) => {
  try {
    localStorage.setItem(`orbit:pref:${k}`, JSON.stringify(v));
  } catch {}
};

export function SendPanel(props: {
  items: Item[];
  onClose: () => void;
  onLaunch: (job: LaunchJob) => void;
  /** the picker takes one folder at a time: add more to this send */
  onAddFolder?: () => void;
  onAddFiles?: () => void;
  onRemove?: (index: number) => void;
  /** tasks in this void/space: the files can be wired to one */
  tasks?: Task[];
  /** preselected (Attach on a task) */
  task?: string | null;
  /** sending anonymously (lib/anon.ts): into which space, names hidden or not, what couldn't be cleaned */
  anon?: { space: string; hideNames: boolean; setHideNames: (v: boolean) => void; asIs: string[]; cleaning?: boolean };
}) {
  const { onClose } = props;
  const openTasks = props.tasks ?? [];
  const [wire, setWire] = useState<string | null>(props.task ?? null);
  const [markDone, setMarkDone] = useState(false);
  // several picks (files, folders or both): one ball for all of them, or one ball each
  const multi = props.items.length > 1;
  const [split, setSplit] = useState<boolean>(() => multi && pref("split", false));
  // a second pick added from here: "Separate" only makes sense with two or more
  useEffect(() => {
    if (!multi && split) setSplit(false);
  }, [multi, split]);
  const allFiles = props.items.every((x) => !isFolder(x));
  // together: a single folder stays itself; several things with a folder among them become one folder
  const folder = !multi ? (isFolder(props.items[0]) ? props.items[0] : null) : allFiles ? null : mergeItems("", props.items);
  const files = props.items.filter((x): x is File => !isFolder(x));
  const many = multi && allFiles;
  const single = !folder && !many;
  const first = files[0];
  const count = folder ? folder.entries.length : files.length;
  const total = props.items.reduce((a, x) => a + itemSize(x), 0);
  const isLink = single && first?.type === LINK_MIME;
  const hide = !!props.anon?.hideNames;
  const autoName = (hide ? genericTitle(single ? first : null, !!folder, count) : !multi && folder ? folder.name : single ? first.name.replace(/\.[^.]+$/, "") : many ? `${count} files` : `${props.items.length} items`).slice(0, 60);
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? autoName;
  const setName = setTyped;
  const [code, setCode] = useState("");
  const [bubble, setBubble] = useState("");
  const [more, setMore] = useState(false);
  const [max, setMax] = useState<number | null>(null);
  // every send starts open (no password); a password is a deliberate choice each time
  const [locked, setLocked] = useState(false);
  const [life, setLife] = useState(() => pref("life", 30));
  const [focusNow] = useState(finePointer);

  const tooBig = split ? props.items.some((x) => itemSize(x) > MAX_FILE_BYTES) : total > MAX_FILE_BYTES;
  const ready = !tooBig && (!locked || code.length >= 4) && !props.anon?.cleaning;
  const go = () => {
    if (!ready) return;
    tick("success");
    setPref("life", life);
    if (multi) setPref("split", split);
    const common = { passcode: locked ? code : "", maxDownloads: max, life, open: !locked, task: wire ?? undefined, done: !!wire && markDone, hideNames: hide };
    if (split) {
      // one ball per pick, each under its own name, all with the same settings
      for (const it of props.items) {
        const label = (hide ? genericTitle(isFolder(it) ? null : it, isFolder(it), 1) : itemName(it)).slice(0, 60) || "untitled";
        props.onLaunch({ ...common, file: isFolder(it) ? packFolder(it) : it, name: label, files: isFolder(it) ? it.entries.length : 1, group: bubble.trim() || undefined });
      }
      return;
    }
    const label = (name.trim() || (hide ? autoName : folder && !multi ? folder.name : single ? first.name : `${count} files`)).slice(0, 60);
    // several files travel as ONE ball (no zipping: streamed as-is behind a small manifest)
    const file = folder ? packFolder(multi ? { ...folder, name: label } : folder) : many ? packFolder(filesBundle(label, files), true) : first;
    props.onLaunch({ ...common, file, name: label, files: count });
  };
  const n = props.items.length;
  const kind = split ? `${n} balls` : folder ? (multi ? `${n} items · one ball` : `Folder · ${count} files`) : isLink ? "Link" : single ? `${ext(first.name)} · ${first.type || "file"}` : `${count} files · one ball`;

  return (
    <Drawer label="Send" onClose={onClose}>
      <div className="col">
        {props.anon && (
          <div className="field anon-send">
            <p className="note"><BsIncognito className="ic-inline" aria-hidden /> Sending anonymously into {props.anon.space}</p>
            <label className="anon-names">
              <input type="checkbox" checked={props.anon.hideNames} onChange={(e) => props.anon?.setHideNames(e.target.checked)} />
              <span>Hide file names</span>
              <span className="mono dim">sent as photo.jpg, file.pdf…</span>
            </label>
            {props.anon.asIs.length > 0 && (
              <p className="note">Photos and videos can carry where they were taken. Orbi can&apos;t clean {props.anon.asIs[0]}{props.anon.asIs.length > 1 ? ` and ${props.anon.asIs.length - 1} more` : ""}: they&apos;re sent as they are.</p>
            )}
            <p className="mono dim">Goes through Orbi&apos;s encrypted cloud copy only, never device to device. Keep this page open until it says sent.</p>
          </div>
        )}
        {multi && (
          <div className="field">
            <label><span className="mono">Send as</span><span className="mono dim">{n} picked</span></label>
            <div className="seg" role="radiogroup" aria-label="Launch as">
              <button role="radio" aria-checked={!split} className={`lg-press${!split ? " on" : ""}`} onClick={() => setSplit(false)}>One ball</button>
              <button role="radio" aria-checked={split} className={`lg-press${split ? " on" : ""}`} onClick={() => setSplit(true)}>{n} balls</button>
            </div>
          </div>
        )}
        {split && (
          <div className="field">
            <label><span className="mono">Name the container</span><span className="mono dim">{bubble.length}/40</span></label>
            <input
              className="line-input name-input"
              value={bubble}
              maxLength={40}
              autoFocus={focusNow}
              autoComplete="off"
              onChange={(e) => setBubble(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !locked) go();
              }}
              placeholder={`${n} items`}
            />
          </div>
        )}
        {!split && (
          <div className="field">
            <label><span className="mono">Name it</span><span className="mono dim">{name.length}/60</span></label>
            <input
              className="line-input name-input"
              value={name}
              maxLength={60}
              autoFocus={focusNow}
              enterKeyHint="go"
              autoComplete="off"
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (locked) e.currentTarget.closest(".drawer")?.querySelector<HTMLInputElement>(".code-input")?.focus();
                else go();
              }}
              placeholder="Give it a name"
            />
          </div>
        )}
        <div className="send-meta">
          <span className="mono">{kind}</span>
          <span className="mono dim">{formatBytes(total)}</span>
        </div>
        <p className="note ellip">
          {split
            ? "Each one its own ball, in one container."
            : folder
              ? multi ? "All in one ball." : `${folder.name}/ · arrives as a folder`
              : single ? first.name : "All in one ball."}
        </p>
        {multi && (
          <div className="files">
            {props.items.map((it, i) => (
              <div key={i}>
                <span>{isFolder(it) ? `${it.name}/` : it.name}</span>
                <span className="mono dim">{isFolder(it) ? `${it.entries.length} files · ` : ""}{formatBytes(itemSize(it))}</span>
                {props.onRemove && <button type="button" className="add-x" onClick={() => props.onRemove?.(i)} aria-label={`Remove ${itemName(it)}`}>×</button>}
              </div>
            ))}
          </div>
        )}
        {(props.onAddFolder || props.onAddFiles) && !isLink && (
          <div className="add-more">
            {props.onAddFolder && <button type="button" className="pill lg-press" onClick={props.onAddFolder}>+ Folder</button>}
            {props.onAddFiles && <button type="button" className="pill lg-press" onClick={props.onAddFiles}>+ Files</button>}
            <span className="mono dim">{multi ? "keep this page open until saved" : "or drop more here"}</span>
          </div>
        )}
        <div className="grow" />
        {!multi && !props.anon && <p className="mono dim">Encrypted · keep this page open until it says saved</p>}
      </div>
      <div className="col">
        {openTasks.length > 0 && (
          <div className="field wire-field">
            <label><span className="mono">Wire to a task</span><span className="mono dim">{wire ? "its wire shows in the void" : "optional"}</span></label>
            <div className="wire-chips" role="radiogroup" aria-label="Wire to a task">
              <button role="radio" aria-checked={!wire} className={`chip lg-press${!wire ? " on" : ""}`} onClick={() => setWire(null)}>None</button>
              {openTasks.map((t) => (
                <button key={t.id} role="radio" aria-checked={wire === t.id} className={`chip task-chip lg-press${wire === t.id ? " on" : ""}${t.doneAt ? " done" : ""}`} onClick={() => setWire(t.id)} title={t.text}>
                  <i className="task-dot" aria-hidden /><b>Task {t.num}</b><span>{t.text}</span>
                </button>
              ))}
            </div>
            {wire && !openTasks.find((t) => t.id === wire)?.doneAt && (
              <label className="wire-done"><input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} /> <span>Tick Task {openTasks.find((t) => t.id === wire)?.num} done when it lands</span></label>
            )}
          </div>
        )}
        <div className="field">
          <label><span className="mono">Password</span><span className="mono dim">{locked ? "only people with it" : "anyone can open it"}</span></label>
          <div className="seg" role="radiogroup" aria-label="Password">
            <button role="radio" aria-checked={!locked} className={`lg-press${!locked ? " on" : ""}`} onClick={() => setLocked(false)}>No password</button>
            <button role="radio" aria-checked={locked} className={`lg-press${locked ? " on" : ""}`} onClick={() => setLocked(true)}>Add password</button>
          </div>
        </div>
        {locked && <PasscodeInput value={code} onChange={setCode} onEnter={go} autoFocus generate />}
        {/* the rest folds away: one line says what is set, a tap shows the choices */}
        <button type="button" className={`more-opts${more ? " open" : ""}`} onClick={() => setMore((m) => !m)} aria-expanded={more}>
          <span className="mono">More options</span>
          <span className="mono dim">{life} min · {max ? `${max} download${max > 1 ? "s" : ""}` : "unlimited"}</span>
          <i aria-hidden><LuChevronDown className="ic-inline" /></i>
        </button>
        {more && (
          <>
            <div className="field">
              <label><span className="mono">Disappears in</span><span className="mono dim">{life} min</span></label>
              <div className="chips lives" role="radiogroup" aria-label="Disappears in">
                {LIVES.map((m) => (
                  <button key={m} role="radio" aria-checked={life === m} className={`chip lg-press${life === m ? " on" : ""}`} onClick={() => setLife(m)}>{m}m</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label><span className="mono">Download limit</span><span className="mono dim">{max ? `gone after ${max}` : "unlimited"}</span></label>
              <div className="chips" role="radiogroup" aria-label="Download limit">
                {[null, 1, 2, 3, 5, 10].map((m) => (
                  <button key={String(m)} role="radio" aria-checked={max === m} className={`chip lg-press${max === m ? " on" : ""}`} onClick={() => setMax(m)}>{m ?? <LuInfinity className="ic-inline" aria-label="Unlimited" />}</button>
                ))}
              </div>
            </div>
          </>
        )}
        {tooBig && <p className="err">{split ? "One of them is" : multi ? "Together they are" : folder ? `The ${folder.name} folder is` : `${first.name} is`} over the {MAX_LABEL} limit</p>}
        <div className="grow" />
        <button className="cta lg-press" disabled={!ready} onClick={go}>{glyph(props.anon?.cleaning ? "Cleaning photos…" : locked && code.length > 0 && code.length < 4 ? "Password: 4+ characters" : split ? `Send ${n} ↗` : "Send ↗")}</button>
      </div>
    </Drawer>
  );
}

/* ---------------------------- TEXT / LINK ---------------------------- */

export function ComposePanel(props: { onClose: () => void; onReady: (file: File) => void }) {
  const [text, setText] = useState("");
  const [focusNow] = useState(finePointer);
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
          autoFocus={focusNow}
          value={text}
          maxLength={200_000}
          placeholder="https://… or any text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && ok && props.onReady(textToFile(text))}
        />
        <button className="cta lg-press" disabled={!ok} onClick={() => props.onReady(textToFile(text))}>{glyph("Continue →")}</button>
      </div>
    </Drawer>
  );
}

/* ----------------------------- RECEIVE ----------------------------- */

type SaveAct = "share" | "pick" | "download";
type SaveOp = "idle" | "sharing" | "picking" | "cancelled" | "failed";
type SaveDone = "shared" | "picked" | "downloaded";
const IMAGE_PREVIEW_MAX = 30 * 1024 * 1024;
const previewOf = (f: File) =>
  f.type.startsWith("image/") && f.size <= IMAGE_PREVIEW_MAX ? "image" : f.type.startsWith("video/") ? "video" : f.type.startsWith("audio/") ? "audio" : null;
const kindOf = (f: File) =>
  /^image\//.test(f.type) ? "Image" : /^video\//.test(f.type) ? "Video" : /^audio\//.test(f.type) ? "Audio" : /^text\//.test(f.type) ? "Text"
    : f.type === "application/pdf" ? "Document" : /zip|compressed|rar|7z/.test(f.type) ? "Archive" : ext(f.name) === "FILE" ? "No preview" : "File";
const nFiles = (n: number) => `${n} file${n === 1 ? "" : "s"}`;
const errName = (e: unknown) => (e as { name?: string } | null)?.name;

// links, emails, phone numbers and long codes in a received note: highlighted, each with its own copy
const RICH = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]|www\.[^\s<>"']+[^\s<>"'.,;:!?)\]]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\+?\d[\d\s().-]{7,}\d|\b[A-Z0-9]{6,}\b)/g;
const kindOfChunk = (t: string) =>
  /^(https?:|www\.)/.test(t) ? "link" : t.includes("@") ? "email" : /^\+?\d[\d\s().-]+$/.test(t) ? "phone" : "code";

function RichText({ text }: { text: string }) {
  const [copied, setCopied] = useState<number | null>(null);
  const parts = text.split(RICH);
  const copy = async (t: string, i: number) => {
    try {
      await navigator.clipboard.writeText(t);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 1300);
    } catch {}
  };
  return (
    <pre className="note-out rich">
      {parts.map((p, i) => {
        if (i % 2 === 0) return p;
        const k = kindOfChunk(p);
        const href = k === "link" ? (p.startsWith("www.") ? `https://${p}` : p) : k === "email" ? `mailto:${p}` : k === "phone" ? `tel:${p.replace(/[^\d+]/g, "")}` : undefined;
        return (
          <span key={i} className={`rt rt-${k}`}>
            {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow">{p}</a> : <b>{p}</b>}
            <button type="button" className="rt-copy" onClick={() => copy(p, i)} aria-label={`Copy ${k}`}>{copied === i ? <LuCheck className="ic-inline" /> : "copy"}</button>
          </span>
        );
      })}
    </pre>
  );
}

export function UnlockPanel(props: { orb: Orb; now: number; watchers: number; onClose: () => void; onDownloaded: () => void; onViewed: () => void; preview?: boolean }) {
  const { orb, now, watchers, onClose } = props;
  const [env] = useState(saveEnv);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("deriving");
  const [frac, setFrac] = useState(0);
  const [speed, setSpeed] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [got, setGot] = useState<Received | null>(null);
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const left = new Date(orb.expiresAt).getTime() - now;
  const isLink = orb.mime === LINK_MIME;
  const isFolder = orb.mime === FOLDER_MIME;
  const loose = isFolder && isLoose(orb.fileName); // several picked files in one ball
  const asDir = isFolder && !loose; // a real folder: rebuilt on disk where the browser can
  const [needSpot, setNeedSpot] = useState(false);
  const [verified, setVerified] = useState<Unlocked | null>(null);
  const inline = (isLink || orb.mime.startsWith("text/")) && orb.size <= INLINE_MAX;
  const [report, setReport] = useState<"idle" | "arm" | "sent">("idle");
  const [wrong, setWrong] = useState(0);
  // full-screen preview: decrypt into memory (never auto-download), then look inside
  const [viewing, setViewing] = useState(false);
  const wantView = useRef(false);
  const canView = !isFolder && !inline && !!viewKind(orb.fileName, orb.mime) && orb.size <= 400 * 1024 * 1024;
  // open files preview straight from memory (fetched quietly, not counted): no progress, no saving
  const quick = canPeek(orb);
  const [peekF, setPeekF] = useState<File | null>(null);
  const [peekOff, setPeekOff] = useState(false);
  useEffect(() => {
    if (!quick) return;
    let alive = true;
    peekFile(orb)
      .then((f) => alive && setPeekF(f))
      .catch(() => alive && setPeekOff(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quick, orb.id]);
  const peekMode = quick && !peekOff;
  const fellBack = useRef(false);

  // ---- the received file: phones hold it until the user picks where it goes ----
  const file = got?.kind === "file" ? got.file : null;
  const folder = got?.kind === "file" ? got.folder : undefined;
  const held = got?.kind === "file" && got.held;
  const [shareParts, setShareParts] = useState(false);
  const parts = got?.kind === "file" && shareParts ? got.parts ?? null : null;
  const [op, setOp] = useState<SaveOp>("idle");
  const [done, setDone] = useState<SaveDone | null>(null);
  const [pickedName, setPickedName] = useState("");
  const [shareOk, setShareOk] = useState(false);
  const [pickOk, setPickOk] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [closeArm, setCloseArm] = useState(false);
  const lock = useRef<SaveAct | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const saved = done !== null;
  // in-app browsers often drop a blob download silently: there the guard stays until the user leaves on purpose
  const unsaved = held && (!saved || (done === "downloaded" && env.inApp));
  const preview = file && !broken ? previewOf(file) : null;

  useEffect(() => () => abort.current?.abort(), []);

  // wrong passcode: the field comes back selected, so the next keystroke replaces it (no deleting it char by char)
  useEffect(() => {
    if (!wrong) return;
    const input = card.current?.querySelector<HTMLInputElement>(".code-input");
    input?.focus({ preventScroll: true });
    input?.select();
  }, [wrong]);

  // One object URL per received file (preview + Download link), revoked when the card goes away.
  // Never revoke right after a tap: iOS reads the blob only after its own "Download?" prompt is confirmed.
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
      setUrl(null);
    };
  }, [file]);

  // the result replaces the form: bring the preview into view (the keyboard may have scrolled the card)
  useEffect(() => {
    if (got) card.current?.closest(".drawer-body")?.scrollTo({ top: 0 });
  }, [got]);

  // Android Chrome sometimes never settles share(): release the lock once the page is back in front.
  useEffect(() => {
    const back = () => {
      if (document.visibilityState !== "visible" || lock.current !== "share") return;
      setTimeout(() => {
        if (lock.current !== "share") return;
        lock.current = null;
        setOp((s) => (s === "sharing" ? "idle" : s));
      }, 1500);
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, []);

  // Unsaved file in memory (and maybe the last allowed download): a stray ×, scrim tap or Escape must not throw it away.
  // The first attempt is held back (capture phase, before the card's own handlers) and asks for a second one.
  useEffect(() => {
    if (!unsaved || closeArm || viewing) return;
    const drawer = card.current?.closest(".drawer");
    if (!drawer) return;
    const hold = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      setCloseArm(true);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.classList.contains("scrim") || (drawer.contains(t) && t.closest(".drawer-head .x"))) hold(e);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hold(e);
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [unsaved, closeArm, viewing]);

  useEffect(() => {
    if (!closeArm) return;
    const t = setTimeout(() => setCloseArm(false), 3500);
    return () => clearTimeout(t);
  }, [closeArm]);

  // closing the tab with an unsaved file: Android/desktop ask "Leave site?" (iOS ignores it)
  useEffect(() => {
    if (!unsaved) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [unsaved]);

  // Received on this device: text read, saved straight to disk / a folder, handed to the downloads, or saved / shared from the hold.
  const received = !!got && (got.kind !== "file" || !got.held || !!done);
  useEffect(() => {
    if (received) markGot(orb.id);
  }, [received, orb.id]);

  // Both call the platform API synchronously inside the tap (no await before it: transient activation).
  const doShare = () => {
    if (!file || lock.current) return;
    lock.current = "share";
    setOp("sharing");
    shareFile(parts ?? file)
      .then(() => {
        setDone("shared");
        setOp("idle");
      })
      .catch((e: unknown) => {
        const n = errName(e);
        if (n === "AbortError") setOp("cancelled");
        else if (n === "InvalidStateError") setOp("idle"); // a sheet was still closing: just tap again
        else {
          setShareOk(false); // NotAllowedError / TypeError / DataError: this browser will not share it, Download takes over
          setOp("failed");
        }
      })
      .finally(() => {
        if (lock.current === "share") lock.current = null;
      });
  };
  const doPick = () => {
    if (!file || lock.current) return;
    lock.current = "pick";
    setOp("picking");
    pickAndWrite(file)
      .then((name) => {
        setPickedName(name);
        setDone("picked");
        setOp("idle");
      })
      .catch((e: unknown) => {
        if (errName(e) === "AbortError") setOp("cancelled");
        else {
          setPickOk(false);
          setOp("failed");
        }
      })
      .finally(() => {
        lock.current = null;
      });
  };
  const doDownload = (e: { preventDefault(): void }) => {
    if (!url || lock.current) return e.preventDefault(); // double tap = two "Download?" prompts on iOS
    lock.current = "download";
    setTimeout(() => {
      if (lock.current === "download") lock.current = null;
    }, 1200);
    setDone("downloaded");
    setOp("idle");
  };

  const sendReport = () => {
    if (report === "idle") return setReport("arm");
    if (report !== "arm") return;
    setReport("sent");
    fetch(`/api/transfers/${orb.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId(), device: deviceLabel(), anon: isAnon() }),
    }).then(() => props.onDownloaded()).catch(() => {});
  };

  const { onViewed } = props;
  useEffect(() => {
    fetch(`/api/transfers/${orb.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId(), device: deviceLabel(), anon: isAnon() }),
    }).then(onViewed).catch(() => {});
  }, [orb.id, onViewed]);

  const fail = (e: unknown) => {
    if (abort.current?.signal.aborted) return;
    if (e instanceof UnlockError) {
      setErr(
        e.reason === "wrong" ? `Wrong passcode · ${e.left ?? 0} tries left`
          : e.reason === "locked" ? "Locked: too many wrong attempts"
          : e.reason === "sealed" ? "Sealed: download limit reached"
          : e.reason === "nokey" ? "This anonymous space is missing its key on this device. Open it from its link again"
          : "This object already burned up",
      );
      if (e.reason !== "wrong") props.onDownloaded();
      else {
        tick("warn");
        setWrong((n) => n + 1);
      }
    } else setErr(e instanceof Error ? e.message : "Something went wrong");
  };

  // Step 1: the passcode is checked with the server FIRST. Nothing is picked or saved until it's right.
  const free = !!orb.open;
  const go = async () => {
    if ((!free && !code) || busy) return;
    setErr(null);
    setNeedSpot(false);
    setBusy(true);
    setStage("deriving");
    setFrac(0);
    abort.current = new AbortController();
    let un: Unlocked;
    try {
      un = await unlockOrb(orb, code, abort.current.signal);
    } catch (e) {
      fail(e);
      setBusy(false);
      return;
    }
    setBusy(false);
    tick("success");
    // a folder or a big file needs a "where?" picker, which browsers only open on a fresh tap
    if (!wantView.current && (asDir && canWriteFolders()) || (!wantView.current && !inline && !isFolder && needsSavePicker(orb))) return setVerified(un);
    run(un, Promise.resolve(null), null);
  };

  // Step 2 (folders / big files): the passcode is already verified; this tap opens the picker.
  const choose = async (mode?: { zip?: boolean }) => {
    if (!verified || busy) return;
    let folderTarget: DirHandle | null = null;
    let target: ReturnType<typeof pickSaveTarget> = Promise.resolve(null);
    if (asDir && !mode?.zip && canWriteFolders()) {
      const pick = await pickFolderTarget();
      if ("cancelled" in pick) return setNeedSpot(true);
      if ("handle" in pick) folderTarget = pick.handle;
    } else if (!isFolder && !inline) target = pickSaveTarget(orb);
    setNeedSpot(false);
    run(verified, target, folderTarget);
  };

  const run = (un: Unlocked, target: ReturnType<typeof pickSaveTarget>, folderTarget: DirHandle | null) => {
    setBusy(true);
    setErr(null);
    abort.current = new AbortController();
    const meter = new Meter(orb.size);
    setSpeed("");
    receive({
      orb, unlocked: un, target, folderTarget, signal: abort.current.signal, inline, hold: env.mobile || wantView.current,
      onProgress: (s, p) => {
        setStage(s);
        setFrac(p);
        if (s === "decrypting") setSpeed(meter.label(p * orb.size));
      },
    })
      .then((res) => {
        if (res.kind === "file") {
          const many = !!res.parts?.length && res.held && canShareFiles(res.parts, env);
          setShareParts(many);
          setShareOk(res.held && (many || canShareFile(res.file, env)));
          setPickOk(res.held && canPickSave(env));
        }
        setBroken(false);
        setOp("idle");
        setDone(null);
        setVerified(null);
        setGot(res);
        if (wantView.current && res.kind === "file" && viewKind(res.file.name, res.file.type)) setViewing(true);
        props.onDownloaded();
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };

  const startPreview = () => {
    if (!canView) return;
    if (got?.kind === "file" || peekMode) return setViewing(true);
    wantView.current = true;
    void go();
  };
  // the quiet fetch failed while the preview was open: fall back to the normal decrypt
  useEffect(() => {
    if (!peekOff || !viewing || got || fellBack.current) return;
    fellBack.current = true;
    setViewing(false);
    wantView.current = true;
    void go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peekOff, viewing]);
  // double-clicked ball: an open object opens straight into the preview; a locked one previews after its passcode
  const askedPreview = !!props.preview;
  const asked = useRef(false);
  useEffect(() => {
    if (!askedPreview || asked.current || !canView) return;
    asked.current = true;
    if (peekMode) return setViewing(true);
    wantView.current = true;
    if (orb.open) void go();
    // go only reads state that is current on this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askedPreview, canView]);

  // ---- copy + actions for the held file ----
  const where = downloadWhere(env);
  const shortcut = downloadsShortcut(env);
  const dev = deviceNoun(env);
  const media = parts ? parts.every((f) => /^(image|video)\//.test(f.type)) : file ? /^(image|video)\//.test(file.type) : false;
  const order: SaveAct[] = [...(!env.ios && pickOk ? (["pick"] as const) : []), ...(shareOk ? (["share"] as const) : []), "download"];
  const working = op === "sharing" || op === "picking";
  const label = (a: SaveAct, role: "lead" | "alt" | "again") =>
    a === "share" && op === "sharing" ? "Opening…"
      : a === "pick" && op === "picking" ? "Saving…"
      : role === "again" ? "Save again"
      : a === "pick" ? "Choose where to save…"
      : a === "share" && parts ? (env.ios ? (media ? `Save all ${parts.length} to Photos or Files` : `Save all ${parts.length} to Files…`) : `Save all ${parts.length}…`)
      : a === "share" ? (env.ios ? (media ? "Save to Photos or Files" : "Save to Files…") : role === "lead" ? "Save or share…" : "Share to an app…")
      : role === "lead" ? "Download ↓" : "Download";
  const action = (a: SaveAct, role: "lead" | "alt" | "again") => {
    const cls = `${role === "lead" ? "cta lead" : "ghost-btn"} lg-press`;
    if (a === "download")
      return (
        <a key={a} className={cls} href={url ?? undefined} download={file?.name} onClick={doDownload} aria-disabled={!url}>
          {glyph(label(a, role))}
        </a>
      );
    return (
      <button key={a} type="button" className={cls} disabled={working} onClick={a === "share" ? doShare : doPick}>
        {glyph(label(a, role))}
      </button>
    );
  };
  const readyNote = !file ? null
    : order[0] === "share" && env.ios
      ? media
        ? <>Decrypted on this {dev}. Tap <b>Save</b>, then <b>Save Image</b> / <b>Save Video</b> to put it in Photos, or <b>Save to Files</b> to pick a folder.</>
        : <>Decrypted on this {dev}. Tap <b>Save</b>, then <b>Save to Files</b> and pick a folder or iCloud Drive.</>
      : order[0] === "pick"
        ? <>Decrypted on this {dev}. Nothing is saved yet: choose a folder (Downloads, Pictures, Drive…) and it goes there.</>
        : order[0] === "share"
          ? <>Decrypted on this {dev}. Nothing is saved yet: pick where it goes (Files, Drive, Photos or any app).</>
          : <>Decrypted on this {dev}. Tap <b>Download</b> and it goes to <b>{where}</b>.</>;
  const doneNote =
    done === "picked" ? <>Saved as <b>{pickedName}</b> in the folder you chose.</>
      : done === "shared"
        ? env.ios
          ? media ? <>It&apos;s where you picked: <b>Photos</b> (Save Image / Save Video) or the <b>Files</b> folder you chose.</> : <>It&apos;s in the <b>Files</b> folder you picked.</>
          : <>Handed to the app you picked.</>
      : <>It&apos;s in <b>{where}</b>.{env.ios && media ? <> To add it to Photos: open it in Files, tap Share, then Save Image / Save Video.</> : null}</>;
  const hueVar = { "--hue": orb.hue } as CSSProperties;

  return (
    <Drawer label={held ? (saved ? "Saved on this device" : "Ready to save") : "Incoming object"} locked={busy || op === "picking"} onClose={() => {
      abort.current?.abort();
      onClose();
    }}>
      {held && file ? (
        <div className="col save-media" key="media" style={hueVar}>
          <div className={`save-hero${preview === "image" || preview === "video" ? " media" : ""}`}>
            {preview === "image" && url ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, nothing to optimise
              <img src={url} alt={file.name} decoding="async" draggable={false} onError={() => setBroken(true)} />
            ) : preview === "video" && url ? (
              <video src={`${url}#t=0.001`} muted playsInline controls preload="metadata" onError={() => setBroken(true)} />
            ) : (
              <>
                <div className="save-orb"><span className="wide">{folder ? (loose ? `${folder.files}×` : "ZIP") : ext(file.name)}</span></div>
                <span className="save-kind mono">{folder ? (loose ? nFiles(folder.files) : `Folder · ${nFiles(folder.files)}`) : kindOf(file)}</span>
              </>
            )}
          </div>
          {preview === "audio" && url && <audio src={url} controls preload="metadata" />}
          {viewKind(file.name, file.type) && <button type="button" className="ghost-btn lg-press" onClick={() => setViewing(true)}>Preview full screen ⤢</button>}
          <div className="save-meta">
            <span className="mono ellip">{parts && folder ? folder.name : file.name}</span>
            <span className="mono dim">{formatBytes(file.size)}</span>
          </div>
        </div>
      ) : (
        <div className="col" key="info">
          {orb.thumb && orb.open && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="card-thumb" src={previewUrl(orb.id)} alt={`Preview of ${orb.name}`} title={canView ? "Click to preview" : undefined} onClick={canView ? startPreview : undefined} style={canView ? { cursor: "zoom-in" } : undefined} onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          <div>
            <span className="mono dim ellip">{orb.fileName}</span>
            <div className="wide d-title">{orb.name}</div>
          </div>
          <div className="grow" />
          <div className="kv">
            <div><span className="mono">Size</span><b>{formatBytes(orb.size)}</b></div>
            <div><span className="mono">Burns in</span><b>{formatClock(left)}</b></div>
            {orb.by && <div><span className="mono">From</span><b>{orb.by}</b></div>}
            <div><span className="mono">Downloads</span><b>{orb.downloads}{orb.maxDownloads ? ` / ${orb.maxDownloads}` : ""}</b></div>
            <div><span className="mono">Live now</span><b>{watchers}</b></div>
          </div>
          <button className={`report mono${report === "arm" ? " arm" : ""}`} onClick={sendReport} disabled={report === "sent"}>
            {report === "sent" ? "Reported · thank you" : report === "arm" ? "Tap again to report abuse" : <span className="glyph"><LuFlag aria-hidden />Report</span>}
          </button>
        </div>
      )}
      {got?.kind === "text" ? (
        <div className="col" key="text" ref={card}>
          <span className="mono dim">{isLink ? "Decrypted link" : "Decrypted note"}</span>
          {isLink ? (
            <a className="link-out" href={got.text} target="_blank" rel="noopener noreferrer nofollow">{got.text}</a>
          ) : (
            <RichText text={got.text} />
          )}
          <div className="grow" />
          <div className="row-btns">
            <button
              className="ghost-btn lg-press"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(got.text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {}
              }}
            >
              {glyph(copied ? "Copied ✓" : "Copy all")}
            </button>
            {isLink && <a className="cta lg-press" href={got.text} target="_blank" rel="noopener noreferrer nofollow">{glyph("Open link ↗")}</a>}
          </div>
        </div>
      ) : held && file ? (
        <div className="col save-ready" key="ready" ref={card} style={hueVar}>
          <div className="save-head">
            <span className="mono dim">{saved ? `On this ${dev}` : `Decrypted · not saved yet`}</span>
            <div className="wide d-title save-title" key={saved ? "saved" : "ready"}>
              {saved ? "Saved" : "Ready"}
              {saved && <svg className="save-check" viewBox="0 0 24 24" aria-hidden><path d="M3.5 12.5l5.5 5.5L20.5 6" /></svg>}
            </div>
          </div>
          <p className="note">
            {saved ? doneNote : readyNote}
            {folder && !saved ? parts ? <> All {nFiles(parts.length)} go in one go.</> : <> It&apos;s {loose ? "" : "the folder "}<b>{folder.name}</b> ({nFiles(folder.files)}) as one .zip; tap it in Files to unpack.</> : null}
          </p>
          {closeArm ? (
            <p className="save-status err mono" key="arm">Not saved yet · tap × again to discard it</p>
          ) : op === "failed" ? (
            <p className="save-status err mono" key="failed">That didn&apos;t work in this browser · use Download</p>
          ) : op === "cancelled" && !saved ? (
            <p className="save-status mono" key="cancelled">Not saved yet · tap {order[0] === "download" ? "Download" : "Save"} to choose where</p>
          ) : env.inApp && !saved ? (
            <p className="save-status calm mono" key="inapp">In-app browser? If nothing saves, open this page in Safari or Chrome.</p>
          ) : null}
          <div className="grow" />
          <div className="save-acts">
            {saved ? (
              <div className="row-btns">
                {action(order[0], "again")}
                <BackBtn />
              </div>
            ) : (
              <>
                {action(order[0], "lead")}
                {order.length === 2 && action(order[1], "alt")}
                {order.length > 2 && <div className="row-btns">{order.slice(1).map((a) => action(a, "alt"))}</div>}
              </>
            )}
            {order[0] !== "download" && !saved && <p className="save-where mono"><span className="glyph">Download<LuArrowRight aria-hidden /></span> <b>{where}</b></p>}
          </div>
        </div>
      ) : got ? (
        <div className="col" key="landed" ref={card}>
          <div className="wide d-title save-title">
            Landed<svg className="save-check" viewBox="0 0 24 24" aria-hidden><path d="M3.5 12.5l5.5 5.5L20.5 6" /></svg>
          </div>
          <p className="note">
            {got.kind === "dir"
              ? <>Folder <b>{got.folder}/</b> saved inside <b>{got.where}/</b> with all {got.files} files and subfolders, exactly as sent.</>
              : got.kind === "picked"
                ? <>Decrypted on this device and saved as <b>{got.name}</b> where you chose.</>
                : folder && got.kind === "file" && got.parts?.length && loose
                  ? <>All <b>{nFiles(got.parts.length)}</b> from <b>{folder.name}</b> saved to <b>{where}</b>, each as its own file.</>
                : folder
                  ? <>Your browser can&apos;t write folders, so <b>{folder.name}</b> ({nFiles(folder.files)}) was saved as <b>{file?.name}</b> to <b>{where}</b>.</>
                  : <>Decrypted on this device and saved to <b>{where}</b> as <b>{file?.name}</b>.</>}
          </p>
          {got.kind === "file" && shortcut && <span className="save-shortcut mono">Open downloads <kbd>{shortcut}</kbd></span>}
          <div className="grow" />
          {got.kind === "file" && file ? (
            <div className="row-btns even">
              {loose && got.kind === "file" && got.parts?.length ? (
                <button type="button" className="ghost-btn lg-press" onClick={() => got.parts!.forEach((f, i) => setTimeout(() => autoDownload(f), i * 250))}>Download all again</button>
              ) : (
                <a className="ghost-btn lg-press" href={url ?? undefined} download={file.name}>Download again</a>
              )}
              {viewKind(file.name, file.type) && <button type="button" className="ghost-btn lg-press" onClick={() => setViewing(true)}>Preview ⤢</button>}
              <BackBtn />
            </div>
          ) : (
            <BackBtn />
          )}
        </div>
      ) : (
        <div className="col" key="form" ref={card}>
          {orb.status === "sealed" && !busy ? (
            <div className="sealed-msg mono">{err ? `${err} · ` : ""}Sealed: the sender&apos;s download limit was reached. It will burn up shortly.</div>
          ) : busy ? (
            <>
              <Progress stage={stage} frac={frac} extra={speed || formatBytes(orb.size * frac)} />
              <div className="grow" />
              <button className="ghost-btn lg-press" onClick={() => abort.current?.abort()}>Abort</button>
            </>
          ) : verified ? (
            <>
              <div className="verified">
                <svg className="save-check" viewBox="0 0 24 24" aria-hidden><path d="M3.5 12.5l5.5 5.5L20.5 6" /></svg>
                <b className="wide">{free ? "Ready" : "Passcode correct"}</b>
              </div>
              <p className="note">
                {asDir ? "Now choose a folder. It lands there as-is: same name, every subfolder, no zip." : "Now choose where to save it."}
              </p>
              {err && <p className="err">{err}</p>}
              <div className="grow" />
              {asDir && needSpot ? (
                <div className="spot-help">
                  <b>Pick another folder</b>
                  <span>
                    {env.android
                      ? <>Android won&apos;t let websites use the <b>Download</b> folder itself. Pick or create a folder inside it, or anywhere else.</>
                      : <>Chrome locks <b>Downloads</b>, <b>Desktop</b> and <b>Documents</b> themselves for every website. Choose any folder inside them, or anywhere else, and the folder is saved there as-is.</>}
                  </span>
                  <div className="row-btns">
                    <button className="ghost-btn lg-press" onClick={() => choose({ zip: true })}>Get .zip instead</button>
                    <button className="cta lg-press" onClick={() => choose()}>Choose folder</button>
                  </div>
                </div>
              ) : (
                <button className="cta lg-press" onClick={() => choose()}>{glyph(asDir ? "Choose folder + save ↓" : "Choose where to save ↓")}</button>
              )}
            </>
          ) : (
            <>
              {free ? (
                <div className="open-badge"><i className="dot" /><b className="wide">No password</b><span className="mono dim">just tap Download</span></div>
              ) : (
                <PasscodeInput value={code} onChange={setCode} onEnter={() => go()} autoFocus />
              )}
              {err && <p className="err">{err}</p>}
              <p className="note">
                {free ? "Encrypted end to end, unlocked on this device." : "The password never leaves this device."}
                {env.mobile && !inline && !(asDir && canWriteFolders()) ? " After decrypting, you choose where to save it." : ""}
              </p>
              {env.inApp && (
                <div className="spot-help">
                  <b>Open in your browser</b>
                  <span>This app&apos;s built-in browser often can&apos;t save files, and every unlock counts as a download. Tap ⋯ and choose <b>Open in Safari</b> / <b>Open in Chrome</b> first.</span>
                </div>
              )}
              <div className="grow" />
              {loose ? (
                <p className="note">{env.mobile ? "Every file in this ball arrives together; then you choose where they go." : "Every file in this ball downloads at once, straight into your Downloads. If the browser asks, allow multiple downloads."}</p>
              ) : asDir ? (
                <p className="note">
                  {!canWriteFolders()
                    ? env.mobile
                      ? "It arrives as one .zip, and you choose where to save it."
                      : "This browser can't write folders, so it arrives as a .zip (Chrome or Edge on a computer saves a real folder)."
                    : "First the password is checked, then you pick the folder."}
                </p>
              ) : null}
              {canView && (
                <button type="button" className="ghost-btn lg-press" disabled={!free && !code} onClick={startPreview}>{glyph("Preview ⤢")}</button>
              )}
              <button className="cta lg-press" disabled={!free && !code} onClick={() => go()}>
                {glyph(free ? (isLink || inline ? "Open ↗" : isFolder ? "Get it ↓" : "Download ↓") : isLink ? "Decrypt + open link ↗" : inline ? "Decrypt + read" : env.mobile && !(asDir && canWriteFolders()) ? "Decrypt →" : loose ? "Decrypt + download all ↓" : isFolder ? "Unlock folder →" : needsSavePicker(orb) ? "Unlock →" : "Decrypt + download ↓")}
              </button>
            </>
          )}
        </div>
      )}
      {viewing && (file || peekMode) && (
        <Viewer
          file={file ?? peekF}
          name={orb.fileName}
          failed={peekOff && !file}
          thumb={orb.thumb && orb.open ? previewUrl(orb.id) : undefined}
          onClose={() => setViewing(false)}
          onDownload={file ? () => autoDownload(file) : () => (setViewing(false), void go())}
        />
      )}
    </Drawer>
  );
}

/* ------------------------------ OWNER ------------------------------ */

/* ---------------------------- GROUP (one sender, several objects) ---------------------------- */

export function GroupPanel(props: { members: Orb[]; now: number; onOpen: (o: Orb) => void; onClose: () => void; onDownloaded: () => void }) {
  const { members } = props;
  const locked = members.filter((o) => !o.open);
  const [code, setCode] = useState("");
  const total = members.reduce((a, o) => a + o.size, 0);
  const by = members[0]?.by;
  const ready = !locked.length || code.length >= 4;
  // queued in the background: closing this panel (or the container) never stops them; progress shows bottom-right
  const all = () => {
    if (!ready) return;
    tick("success");
    enqueue(members, code);
    props.onClose();
  };

  return (
    <Drawer label="From one sender" onClose={props.onClose}>
      <div className="col">
        <div className="sp-title wide">{members.find((o) => o.groupName)?.groupName ?? (by ? `${by}'s drop` : `${members.length} items`)}</div>
        <div className="send-meta">
          <span className="mono">{members.length} items · one sender</span>
          <span className="mono dim">{formatBytes(total)}</span>
        </div>
        <div className="files grp-list">
          {members.map((o) => (
            <div key={o.id} className={hasGot(o.id) ? "got" : undefined}>
              <span>{o.name}</span>
              <span className="mono dim">{hasGot(o.id) ? <><LuCheck className="ic-inline" /> · </> : ""}{o.open ? "open · " : "passcode · "}{formatBytes(o.size)}</span>
              <button type="button" className="pill lg-press" onClick={() => props.onOpen(o)}>Open</button>
            </div>
          ))}
        </div>
        <p className="mono dim">Burns in {formatClock(Math.max(0, Math.min(...members.map((o) => new Date(o.expiresAt).getTime())) - props.now))} (the first one)</p>
      </div>
      <div className="col">
        {locked.length > 0 && (
          <div className="field">
            <label><span className="mono">Password</span><span className="mono dim">{locked.length} need it</span></label>
            <PasscodeInput value={code} onChange={setCode} onEnter={all} />
          </div>
        )}
        <p className="note">Downloads run in the background: close this and keep browsing, progress shows bottom right.</p>
        <div className="grow" />
        <button className="cta lg-press" disabled={!ready} onClick={all}>
          {glyph(locked.length && code.length < 4 ? "Enter the password" : `Download all ${members.length} ↓`)}
        </button>
      </div>
    </Drawer>
  );
}

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
    const t = setInterval(() => document.visibilityState === "visible" && load(), 10_000);
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
    if (!arm) {
      tick("warn");
      return setArm(true);
    }
    setDeleting(true);
    const key = ownerKey(id) ?? "";
    const r = await fetch(`/api/transfers/${id}`, { method: "DELETE", headers: { "x-owner": key } }).catch(() => null);
    if (r?.ok || r?.status === 403) {
      dropOwnerKey(id);
      release(id);
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
