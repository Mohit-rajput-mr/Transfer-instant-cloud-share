"use client";
import { hueOf } from "@/lib/dlprog";
import { homePath } from "@/lib/client";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BsIncognito } from "react-icons/bs";
import { ANON_MINUTES, lastMinutes } from "@/lib/anon";
import { useDialog } from "@/lib/dialog";
import {
  ANON_PASS_MIN, createSpace, joinAnonByName, joinSpace, knock, knockState, savedHandle, savedSpaces, searchSpaces,
  type Knock, type SpaceHit, type SpaceInfo, type SpaceSession,
} from "@/lib/space";

const Lock = () => (
  <svg className="sp-lock" viewBox="0 0 12 12" aria-label="private" role="img">
    <rect x="2.2" y="5.2" width="7.6" height="5.6" rx="1.2" fill="currentColor" />
    <path d="M4 5.2V3.8a2 2 0 0 1 4 0v1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h13" /><path d="M13 6l6 6-6 6" />
  </svg>
);
const initials = (s: string) => s.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

/** A liquid-glass card that pops out in the centre of the screen (phones too: never a bottom sheet). */
/** A card. `action`: a white button in its top bar (it stays there while the body scrolls); it runs, then the card closes. */
export function Pop(props: { label: string; onClose: () => void; children: ReactNode; className?: string; small?: boolean; action?: { label: string; onClick: () => void } }) {
  const [out, setOut] = useState(false);
  const { onClose } = props;
  const close = useCallback(() => {
    setOut(true);
    setTimeout(onClose, 220);
  }, [onClose]);
  useEffect(() => {
    document.documentElement.classList.add("card-open");
    return () => document.documentElement.classList.remove("card-open");
  }, []);
  // focus in, Tab kept inside, Escape (top card only), focus back to the trigger (lib/dialog.ts)
  const box = useRef<HTMLDivElement>(null);
  useDialog(box, close);
  return (
    <>
      <div className={`scrim pop-scrim${out ? " out" : ""}`} onClick={close} />
      <div ref={box} tabIndex={-1} className={`pop lg${props.small ? " small" : ""}${out ? " out" : ""} ${props.className ?? ""}`} role="dialog" aria-modal="true" aria-label={props.label}>
        <div className="pop-head">
          <span className="mono dim">{props.label}</span>
          <span className="pop-acts">
            {props.action && (
              <button type="button" className="pop-apply lg-press" onClick={() => (props.action!.onClick(), close())}>
                {props.action.label}
              </button>
            )}
            <button className="x" onClick={close} aria-label="Close">×</button>
          </span>
        </div>
        <div className="pop-body">{props.children}</div>
      </div>
    </>
  );
}

type Step = "pick" | "here" | "browse" | "create";

const Back = (props: { onClick: () => void }) => (
  <button type="button" className="sp-back lg-press" onClick={props.onClick} aria-label="Back">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H6" /><path d="M11 6l-6 6 6 6" /></svg>
    Back
  </button>
);

/**
 * Spaces (owner 2026-11-20: "first only Browse and Create, then the rest; simple, little text; wide on a wide screen").
 * + Space opens on two big choices. Browse: one search, the spaces as cards with their host. Create: name, passcode,
 * confirm passcode, your name as host, then the look (flexible / workspace only). Anonymous: passcode twice.
 */
export default function SpacePanel(props: {
  current: SpaceSession | null;
  info: SpaceInfo | null;
  start?: string;
  onEnter: (s: SpaceSession) => void;
  onLeave: () => void;
  /** leave the space for good: removed from its members, forgotten on this device */
  onQuit: () => void;
  onClose: () => void;
  toast: (t: string) => void;
  /** the "Stay anonymous" switch (lib/anon.ts): named spaces show your name, so they are closed while it is on */
  anon?: boolean;
  /** make an anonymous space (random title, code and key; one link) and step in */
  onAnonSpace?: (min: number, pass: string) => void;
  copyAnonLink?: () => void;
}) {
  const { current, info } = props;
  const anon = !!props.anon;
  const blocked = (title: string) => props.toast(`Turn off Anonymous to enter ${title}: it shows your name to its members`);
  const [quitArm, setQuitArm] = useState(false);
  // + Space (":create") opens on the two choices; a search (a name, ":search") on Browse; the panel alone on this space
  const [step, setStep] = useState<Step>(props.start === ":search" || (props.start && !props.start.startsWith(":")) ? "browse" : props.start === ":create" || !current ? "pick" : "here");
  const [q, setQ] = useState(props.start?.startsWith(":") ? "" : props.start ?? "");
  const [hits, setHits] = useState<SpaceHit[] | null>(null);
  const [saved, setSaved] = useState<SpaceSession[]>([]);
  const [handle, setHandle] = useState("");
  const [joining, setJoining] = useState<SpaceHit | null>(null);
  const [code, setCode] = useState(false);

  useEffect(() => {
    savedHandle().then((h) => setHandle((c) => c || h));
    savedSpaces().then(setSaved);
  }, []);

  useEffect(() => {
    if (step !== "browse") return;
    let live = true;
    const t = setTimeout(() => searchSpaces(q.trim()).then((h) => live && setHits(h)).catch(() => live && setHits([])), q ? 160 : 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, step]);

  const pick = (h: SpaceHit) => {
    if (anon) return blocked(h.title);
    const mine = saved.find((s) => s.slug === h.slug);
    if (mine) return props.onEnter(mine); // already in it: straight back in
    setJoining(h);
  };
  const copyInvite = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${homePath()}?space=${current.slug}`);
      props.toast("Invite link copied");
    } catch {}
  };

  const list = hits ?? [];
  const savedHere = saved.filter((s) => s.slug !== current?.slug && !s.anon && (!q || s.title.toLowerCase().includes(q.trim().toLowerCase())));
  const others = list.filter((h) => h.slug !== current?.slug && !savedHere.some((s) => s.slug === h.slug));
  const card = (key: string, slug: string, title: string, priv: boolean, host: string | null | undefined, joined: boolean, go: () => void) => (
    <button key={key} className={`sp-card lg-press${anon ? " off" : ""}`} aria-disabled={anon} style={{ "--hue": hueOf(slug) } as CSSProperties} onClick={go}>
      <i className="sp-orb" />
      <b>{title}</b>
      <span className="sp-host">{host ? <>Host · <em>{host}</em></> : <em className="dim">&nbsp;</em>}</span>
      <span className="mono dim">{priv ? <><Lock /> private</> : "open"}{joined ? " · joined" : ""}</span>
      <span className="sp-go"><Arrow /></span>
    </button>
  );

  return (
    <Pop label="Spaces" onClose={props.onClose} className="spaces-pop">
      {step === "pick" && (
        <div className="sp-pane sp-pick" key="pick">
          {current && (
            <button className="sp-here-chip lg-press" onClick={() => setStep("here")}>You&apos;re in <b>{current.title}</b> <Arrow /></button>
          )}
          <div className="sp-choices">
            <button className="sp-choice lg-press" onClick={() => setStep("browse")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
              <b>Browse</b>
              <span>Find a space and enter</span>
            </button>
            <button className="sp-choice lg-press" onClick={() => setStep("create")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              <b>Create</b>
              <span>Make your own space</span>
            </button>
          </div>
        </div>
      )}

      {step === "here" && current && (
        <div className="sp-pane" key="here">
          <Back onClick={() => setStep("pick")} />
          <div className="sp-hero">
            <span className="mono dim">{current.anon ? <><BsIncognito className="ic-inline" aria-hidden /> anonymous</> : current.priv ? "private" : "open"} · you are <b>{current.handle}</b></span>
            <div className="wide sp-title">{current.title}{current.priv && <Lock />}</div>
            <span className="mono dim">{info ? `${info.members.length} ${info.members.length === 1 ? "member" : "members"}` : "…"}{info?.host ? ` · host ${info.host}` : ""}{info?.ends && !current.anon ? ` · closes ${new Date(info.ends).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          </div>
          <div className="sp-acts">
            <button className="ghost-btn lg-press" onClick={current.anon ? props.copyAnonLink : copyInvite}>{current.anon ? "Copy anonymous link" : "Copy invite link"}</button>
            <button className="cta lg-press" onClick={props.onLeave}>Exit this space</button>
            <button className={`ghost-btn lg-press sp-quit${quitArm ? " arm" : ""}`} onClick={() => (quitArm ? props.onQuit() : setQuitArm(true))}>
              {quitArm ? "Tap again: leave for good" : "Leave for good"}
            </button>
          </div>
        </div>
      )}

      {step === "browse" && (
        <div className="sp-pane" key="browse">
          <div className="sp-row">
            <Back onClick={() => setStep("pick")} />
            <label className="sp-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search spaces" autoComplete="off" maxLength={32} enterKeyHint="search" autoFocus />
            </label>
          </div>
          <div className="sp-grid">
            {savedHere.map((s) => card(`s-${s.slug}`, s.slug, s.title, s.priv, null, true, () => (anon ? blocked(s.title) : props.onEnter(s))))}
            {others.map((h) => card(`h-${h.slug}`, h.slug, h.title, h.priv, h.host, false, () => pick(h)))}
          </div>
          {hits !== null && !savedHere.length && !others.length && (
            <div className="sp-empty">
              <span className="mono dim">{q ? `No space called “${q}”` : "No spaces yet"}</span>
              <button className="pill lg-press" onClick={() => setStep("create")}>Create {q ? `“${q}”` : "one"}</button>
            </div>
          )}
          {code ? <KnockForm onEnter={props.onEnter} /> : (
            <button className="sp-link" onClick={() => setCode(true)}><BsIncognito className="ic-inline" aria-hidden /> Have an anonymous space code?</button>
          )}
        </div>
      )}

      {step === "create" && (
        <CreateForm title0={q} handle0={handle} anon={anon} onBack={() => setStep("pick")} onDone={(s) => props.onEnter(s)} onAnon={(m, p) => props.onAnonSpace?.(m, p)} />
      )}

      {joining && (
        <JoinBubble
          hit={joining}
          handle0={handle}
          onClose={() => setJoining(null)}
          onDone={(s) => {
            setJoining(null);
            props.onEnter(s);
          }}
        />
      )}
    </Pop>
  );
}

/**
 * Anonymous spaces are never listed. Typing their 4 letters (the space's code, or the anonymous person's Anon-XXXX)
 * knocks; someone inside taps Let in and this device gets the invite, sealed to a one-time key, and steps in.
 */
function KnockForm(props: { onEnter: (s: SpaceSession) => void }) {
  const [code, setCode] = useState("");
  // with the space's passcode: straight in (no knock, nobody has to let you in)
  const [pass, setPass] = useState("");
  const [k, setK] = useState<Knock | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = /^[A-Z0-9]{4}$/.test(code);
  const enter = useRef(props.onEnter);
  enter.current = props.onEnter;
  const go = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setMsg("");
    try {
      if (pass) return enter.current(await joinAnonByName(code, pass));
      setK(await knock(code));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!k) return;
    let live = true;
    const tick = async () => {
      const r = await knockState(k).catch((e: Error) => ({ status: "err" as const, e }));
      if (!live) return;
      if (r.status === "in") return enter.current(r.space);
      if (r.status === "no" || r.status === "gone" || r.status === "err") {
        setK(null);
        setMsg(r.status === "no" ? "They didn't let you in" : r.status === "gone" ? "No answer: the knock ran out" : "Couldn't step in, try again");
        return;
      }
      t = setTimeout(tick, 2500);
    };
    let t = setTimeout(tick, 2500);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [k]);
  if (k)
    return (
      <div className="knock wait">
        <span className="mono dim"><BsIncognito className="ic-inline" aria-hidden /> Knocking on <b>{k.title}</b></span>
        <span className="knock-note">Waiting for someone inside to let you in…</span>
        <button className="ghost-btn lg-press" onClick={() => setK(null)}>Cancel</button>
      </div>
    );
  return (
    <div className="knock">
      <span className="mono dim"><BsIncognito className="ic-inline" aria-hidden /> Anonymous space: its 4-letter name</span>
      <div className="knock-row">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/^ANON(YMOUS)?[-·\s]*/, "").replace(/[^A-Z0-9]/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && go()} placeholder="A1B2" inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-label="4-letter anonymous space name" />
        <input type="password" className="knock-pass" value={pass} onChange={(e) => setPass(e.target.value.slice(0, 64))}
          onKeyDown={(e) => e.key === "Enter" && go()} placeholder="Passcode" autoComplete="off" aria-label="Its passcode (empty: knock instead)" />
        <button className="cta lg-press" disabled={!ok || busy} onClick={go}>{busy ? "…" : pass ? "Enter" : "Knock"}</button>
      </div>
      <span className="knock-note dim">With the passcode you go straight in. Without it you knock and someone inside lets you in.</span>
      {msg && <span className="knock-note">{msg}</span>}
    </div>
  );
}

function CreateForm(props: { title0: string; handle0: string; anon: boolean; onBack: () => void; onDone: (s: SpaceSession) => void; onAnon: (min: number, pass: string) => void }) {
  // anonymous on: only an anonymous space can be made (a named one shows your name)
  const [kind, setKind] = useState<"named" | "anon">(props.anon ? "anon" : "named");
  const [title, setTitle] = useState(props.title0);
  const [handle, setHandle] = useState(props.handle0);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [work, setWork] = useState(false);
  const [mins, setMins] = useState<number>(() => lastMinutes());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => setHandle((h) => h || props.handle0), [props.handle0]);
  const isAnon = kind === "anon";
  const min = isAnon ? ANON_PASS_MIN : 4;
  // named: the passcode is optional (empty = an open space anyone can enter); anonymous: required
  const passNeeded = isAnon || pass.length > 0;
  const passOk = !passNeeded || (pass.length >= min && pass === pass2);
  const ok = passOk && (isAnon || (title.trim().length > 0 && handle.trim().length > 0));
  const mismatch = pass2.length > 0 && pass !== pass2;
  const go = async () => {
    if (!ok || busy) return;
    if (isAnon) return props.onAnon(mins, pass);
    setBusy(true);
    setErr("");
    try {
      props.onDone(await createSpace(title.trim(), handle.trim(), pass.length > 0, pass, work));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const enter = (e: React.KeyboardEvent) => e.key === "Enter" && go();
  return (
    <div className="sp-pane sp-create" key="create">
      <div className="sp-row">
        <Back onClick={props.onBack} />
        {!props.anon && (
          <div className="seg sp-kind" role="radiogroup" aria-label="Kind of space">
            <button role="radio" aria-checked={!isAnon} className={!isAnon ? "on" : ""} onClick={() => setKind("named")}>Named</button>
            <button role="radio" aria-checked={isAnon} className={isAnon ? "on" : ""} onClick={() => setKind("anon")}><BsIncognito className="ic-inline" aria-hidden /> Anonymous</button>
          </div>
        )}
      </div>
      <div className="sp-fields">
        {!isAnon && (
          <label className="sp-field wide-f">
            <span>Space name</span>
            <input value={title} maxLength={32} onChange={(e) => setTitle(e.target.value)} onKeyDown={enter} placeholder="Studio, Family, Team…" autoComplete="off" autoFocus />
          </label>
        )}
        <label className="sp-field">
          <span>Passcode{!isAnon && <em> · optional</em>}</span>
          <input type="password" value={pass} maxLength={64} onChange={(e) => setPass(e.target.value)} onKeyDown={enter} placeholder={isAnon ? `${ANON_PASS_MIN}+ characters` : "Empty = open to anyone"} autoComplete="new-password" autoFocus={isAnon} />
        </label>
        <label className={`sp-field${mismatch ? " bad" : ""}`}>
          <span>Confirm passcode</span>
          <input type="password" value={pass2} maxLength={64} onChange={(e) => setPass2(e.target.value)} onKeyDown={enter} placeholder={passNeeded ? "Type it again" : "—"} disabled={!passNeeded} autoComplete="new-password" />
        </label>
        {!isAnon && (
          <label className="sp-field wide-f">
            <span>Your name · host</span>
            <input value={handle} maxLength={24} onChange={(e) => setHandle(e.target.value)} onKeyDown={enter} placeholder="Shown as the host" autoComplete="off" />
          </label>
        )}
      </div>
      {isAnon ? (
        !props.anon && (
          <div className="seg anon-min" role="radiogroup" aria-label="How long">
            {ANON_MINUTES.map((m) => (
              <button key={m} role="radio" aria-checked={mins === m} className={mins === m ? "on" : ""} onClick={() => setMins(m)}>{m} min</button>
            ))}
          </div>
        )
      ) : (
        <div className="seg" role="radiogroup" aria-label="How people see it">
          <button role="radio" aria-checked={!work} className={!work ? "on" : ""} onClick={() => setWork(false)}>Flexible · any view</button>
          <button role="radio" aria-checked={work} className={work ? "on" : ""} onClick={() => setWork(true)}>Workspace only</button>
        </div>
      )}
      <p className="sp-hint mono dim">
        {mismatch ? "The passcodes don't match" : isAnon ? "Gets a 4-letter code · burns with your anonymous time" : pass ? "Private · closes after 8 hours" : "Open · closes after 8 hours"}
      </p>
      {err && <p className="err">{err}</p>}
      <button className="cta lg-press" disabled={!ok || busy} onClick={go}>{busy ? "Creating…" : <>Create {isAnon ? "anonymous " : pass ? "private " : ""}space <Arrow /></>}</button>
    </div>
  );
}

/** The droplet that pops over a space you tapped: name yourself (and the passcode), then step in. */
function JoinBubble(props: { hit: SpaceHit; handle0: string; onClose: () => void; onDone: (s: SpaceSession) => void }) {
  const { hit } = props;
  const [handle, setHandle] = useState(props.handle0);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);
  const ok = handle.trim().length > 0 && (!hit.priv || pass.length > 0);
  const go = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setErr("");
    try {
      props.onDone(await joinSpace(hit.slug, handle.trim(), hit.priv ? pass : undefined));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="join-wrap" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="join-bubble glass" style={{ "--hue": hueOf(hit.slug) } as CSSProperties}>
        <i className="sp-orb big" />
        <span className="mono dim">Entering</span>
        <div className="wide sp-title">{hit.title}{hit.priv && <Lock />}</div>
        <div className="join-row">
          <input ref={first} className="join-input" value={handle} maxLength={24} placeholder="Name yourself" autoComplete="off"
            onChange={(e) => setHandle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
          {!hit.priv && <button className="join-go lg-press" disabled={!ok || busy} onClick={go} aria-label="Enter the space"><Arrow /></button>}
        </div>
        {hit.priv && (
          <div className="join-row">
            <input className="join-input" value={pass} maxLength={64} placeholder="Passcode" autoComplete="off"
              onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
            <button className="join-go lg-press" disabled={!ok || busy} onClick={go} aria-label="Enter the space"><Arrow /></button>
          </div>
        )}
        {err && <p className="err">{err}</p>}
      </div>
    </div>
  );
}

/**
 * Inside a space the void sits under one big pane of glass (corners left open, like a ship's canopy),
 * with everyone in the space floating as bubbles along its top edge. Live ones glow; the creator can remove anyone.
 */
export function SpaceRoom(props: { space: SpaceSession; info: SpaceInfo | null; online: Set<string>; onKick: (id: string, handle: string) => void; onExit: () => void }) {
  const { space, info, online } = props;
  const [arm, setArm] = useState<string | null>(null);
  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(null), 3000);
    return () => clearTimeout(t);
  }, [arm]);
  // (owner 2026-11-20: a busy Ghost World ran the row over the page) an anonymous space shows only who is here now;
  // any space shows at most CREW_MAX balls (you first, then online), the rest counted in one "+N" ball
  const members = [...(info?.members ?? [])]
    .filter((m) => !space.anon || m.you || online.has(m.id))
    .sort((a, b) => Number(b.you) - Number(a.you) || Number(online.has(b.id)) - Number(online.has(a.id)));
  const CREW_MAX = 5;
  const crew = members.length > CREW_MAX ? members.slice(0, CREW_MAX - 1) : members;
  const live = members.filter((m) => online.has(m.id) || m.you).length;
  // a named space closes 8 hours after it was made: its clock above the name
  const ends = !space.anon && info?.ends ? info.ends : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ends) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ends]);
  const left = ends ? Math.max(0, ends - now) : 0;
  const clock = `${Math.floor(left / 3600_000)}:${String(Math.floor(left / 60_000) % 60).padStart(2, "0")}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`;
  return (
    <div className="room" aria-label={`Space ${space.title}`}>
      {ends && (
        <div className={`space-clock mono${left < 15 * 60_000 ? " late" : ""}`} role="timer" aria-label={`This space closes in ${clock}`}>
          closes in <b>{clock}</b>
        </div>
      )}
      <div className="room-glass glass" aria-hidden />
      <div className="room-top">
        <div className="room-name">
          <span className="mono dim">{space.anon ? "anonymous space" : space.priv ? "private space" : "space"} · {live} live{info?.host ? <> · host <b className="room-host">{info.host}</b></> : null}</span>
          <b className="wide">{space.title}</b>
        </div>
        <button className="room-exit glass lg-press" onClick={props.onExit} aria-label="Exit this space, back to the public void">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></svg>
          Exit
        </button>
        <div className="room-crew">
          {crew.map((m) => (
            <button
              key={m.id}
              className={`crew${online.has(m.id) || m.you ? " on" : ""}${m.you ? " you" : ""}${arm === m.id ? " arm" : ""}`}
              style={{ "--hue": hueOf(m.handle) } as CSSProperties}
              title={m.handle}
              onClick={() => {
                if (!info?.owner || m.you) return;
                if (arm === m.id) {
                  setArm(null);
                  props.onKick(m.id, m.handle);
                } else setArm(m.id);
              }}
            >
              <i>{initials(m.handle)}</i>
              <span>{arm === m.id ? "Remove?" : m.you ? "you" : m.handle}</span>
            </button>
          ))}
          {members.length > crew.length && <span className="crew more" title={`${members.length - crew.length} more here`}><i>+{members.length - crew.length}</i><span>more</span></span>}
        </div>
      </div>
    </div>
  );
}
