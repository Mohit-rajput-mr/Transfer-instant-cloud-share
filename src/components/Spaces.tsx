"use client";
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
const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
const initials = (s: string) => s.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

/** A liquid-glass card that pops out in the centre of the screen (phones too: never a bottom sheet). */
export function Pop(props: { label: string; onClose: () => void; children: ReactNode; className?: string; small?: boolean }) {
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
          <button className="x" onClick={close} aria-label="Close">×</button>
        </div>
        <div className="pop-body">{props.children}</div>
      </div>
    </>
  );
}

type Tab = "here" | "browse" | "create";

/**
 * Spaces, split into three clear tabs: the space you are in, browsing every space, and making one.
 * Joining someone else's asks only what it needs, in a small bubble: your name (and the passcode if private).
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
  const named = (s: { anon?: boolean }) => !s.anon;
  const blocked = (title: string) => props.toast(`Turn off Anonymous to enter ${title}: it shows your name to its members`);
  const ends = info?.ends ? new Date(info.ends).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
  const [quitArm, setQuitArm] = useState(false);
  const [mins, setMins] = useState<number>(() => lastMinutes());
  const [anonPass, setAnonPass] = useState("");
  // start: a space to look up, or the header's "+" (":create") / search (":search") buttons
  const [tab, setTab] = useState<Tab>(props.start === ":create" ? "create" : props.start ? "browse" : current ? "here" : "browse");
  const [q, setQ] = useState(props.start?.startsWith(":") ? "" : props.start ?? "");
  const [hits, setHits] = useState<SpaceHit[] | null>(null);
  const [saved, setSaved] = useState<SpaceSession[]>([]);
  const [handle, setHandle] = useState("");
  const [joining, setJoining] = useState<SpaceHit | null>(null);

  useEffect(() => {
    savedHandle().then((h) => setHandle((c) => c || h));
    savedSpaces().then(setSaved);
  }, []);

  useEffect(() => {
    if (tab !== "browse") return;
    let live = true;
    const t = setTimeout(() => searchSpaces(q.trim()).then((h) => live && setHits(h)).catch(() => live && setHits([])), q ? 160 : 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, tab]);

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
  const savedHere = saved.filter((s) => s.slug !== current?.slug && (!q || s.title.toLowerCase().includes(q.trim().toLowerCase())));
  const others = list.filter((h) => h.slug !== current?.slug && !savedHere.some((s) => s.slug === h.slug));

  return (
    <Pop label="Spaces" onClose={props.onClose} className="spaces-pop">
      <div className="seg sp-tabs" role="tablist">
        {current && <button role="tab" aria-selected={tab === "here"} className={tab === "here" ? "on" : ""} onClick={() => setTab("here")}>This space</button>}
        <button role="tab" aria-selected={tab === "browse"} className={tab === "browse" ? "on" : ""} onClick={() => setTab("browse")}>Browse</button>
        <button role="tab" aria-selected={tab === "create"} className={tab === "create" ? "on" : ""} onClick={() => setTab("create")}>Create</button>
      </div>

      {tab === "here" && current?.anon && (
        <div className="sp-pane" key="here">
          <div className="sp-hero">
            <span className="mono dim"><BsIncognito className="ic-inline" aria-hidden /> Anonymous space · you are <b>{current.handle}</b></span>
            <div className="wide sp-title">{current.title}<Lock /></div>
            <span className="mono dim">{info ? `${info.members.length} ${info.members.length === 1 ? "member" : "members"}${ends ? ` · deletes ${ends}` : ""}` : "…"}</span>
          </div>
          <p className="note">Only people with the link are in here. Notes and tasks aren&apos;t end-to-end encrypted; files are.</p>
          <div className="sp-acts">
            <button className="ghost-btn lg-press" onClick={props.copyAnonLink}>Copy anonymous link</button>
            <button className="cta lg-press" onClick={props.onLeave}>Exit to the public void</button>
            <button className={`ghost-btn lg-press sp-quit${quitArm ? " arm" : ""}`} onClick={() => (quitArm ? props.onQuit() : setQuitArm(true))}>
              {quitArm ? "Tap again: leave for good" : "Leave this space for good"}
            </button>
          </div>
        </div>
      )}

      {tab === "here" && current && !current.anon && (
        <div className="sp-pane" key="here">
          <div className="sp-hero">
            <span className="mono dim">{current.priv ? "Private space" : "Open space"} · you are <b>{current.handle}</b></span>
            <div className="wide sp-title">{current.title}{current.priv && <Lock />}</div>
            <span className="mono dim">{info ? `${info.members.length} ${info.members.length === 1 ? "member" : "members"}` : "…"}{info?.owner ? " · you created it" : ""}{info?.ends ? ` · closes at ${new Date(info.ends).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          </div>
          <p className="note">Only people in this space see what is launched here. Everyone in it floats as a bubble at the top of the glass{info?.owner ? "; tap one to remove them" : ""}.</p>
          <div className="sp-acts">
            <button className="ghost-btn lg-press" onClick={copyInvite}>Copy invite link</button>
            <button className="cta lg-press" onClick={props.onLeave}>Exit to the public void</button>
            <button className={`ghost-btn lg-press sp-quit${quitArm ? " arm" : ""}`} onClick={() => (quitArm ? props.onQuit() : setQuitArm(true))}>
              {quitArm ? "Tap again: leave for good" : "Leave this space for good"}
            </button>
          </div>
        </div>
      )}

      {tab === "browse" && (
        <div className="sp-pane" key="browse">
          <KnockForm onEnter={props.onEnter} />
          <label className="sp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search spaces" autoComplete="off" maxLength={32} enterKeyHint="search" />
          </label>
          <div className="sp-grid">
            {savedHere.map((s) => {
              const off = anon && named(s);
              return (
              <button key={`s-${s.slug}`} className={`sp-card lg-press${off ? " off" : ""}`} aria-disabled={off} style={{ "--hue": hueOf(s.slug) } as CSSProperties} onClick={() => (off ? blocked(s.title) : props.onEnter(s))}>
                <i className="sp-orb" />
                <b>{s.title}</b>
                <span className="mono dim">{off ? "turn off Anonymous to enter" : s.anon ? <><BsIncognito className="ic-inline" aria-hidden /> anonymous · joined</> : <>{s.priv ? <><Lock /> private · </> : null}joined</>}</span>
                <span className="sp-go"><Arrow /></span>
              </button>
              );
            })}
            {others.map((h) => (
              <button key={`h-${h.slug}`} className={`sp-card lg-press${anon ? " off" : ""}`} aria-disabled={anon} style={{ "--hue": hueOf(h.slug) } as CSSProperties} onClick={() => pick(h)}>
                <i className="sp-orb" />
                <b>{h.title}</b>
                <span className="mono dim">{anon ? "turn off Anonymous to enter" : h.priv ? <><Lock /> private</> : "open"}</span>
                <span className="sp-go"><Arrow /></span>
              </button>
            ))}
          </div>
          {hits !== null && !savedHere.length && !others.length && (
            <div className="sp-empty">
              <span className="mono dim">{q ? `No space called “${q}” yet` : "No spaces yet"}</span>
              <button className="pill lg-press" onClick={() => setTab("create")}>Create {q ? `“${q}”` : "one"}</button>
            </div>
          )}
        </div>
      )}

      {tab === "create" && (
        <div className="sp-pane" key="create-anon">
          <div className="sp-hero sp-anon">
            <span className="mono dim"><BsIncognito className="ic-inline" aria-hidden /> <b>Anonymous space</b></span>
            <p className="note">No name, private, off the map. It gets a 4-character code: people need the code and your passcode to get in.</p>
            {anon ? (
              <span className="mono dim">It burns with your anonymous session</span>
            ) : (
              <>
                <span className="mono dim">You go anonymous for</span>
                <div className="seg anon-min" role="radiogroup" aria-label="How long">
                  {ANON_MINUTES.map((m) => (
                    <button key={m} role="radio" aria-checked={mins === m} className={mins === m ? "on" : ""} onClick={() => setMins(m)}>{m} min</button>
                  ))}
                </div>
                <span className="mono dim">then you, the space and everything in it burn</span>
              </>
            )}
            <label className="anon-pass">
              <span className="mono">Passcode</span>
              <input type="password" className="line-input" value={anonPass} onChange={(e) => setAnonPass(e.target.value.slice(0, 64))} placeholder={`${ANON_PASS_MIN}+ characters`} autoComplete="new-password" aria-label="Passcode for the new anonymous space" />
              <small>{anonPass.length >= ANON_PASS_MIN ? "Code + this passcode lets people in" : `At least ${ANON_PASS_MIN} characters (required)`}</small>
            </label>
            <button className="cta lg-press" disabled={anonPass.length < ANON_PASS_MIN} onClick={() => props.onAnonSpace?.(mins, anonPass)}>Create anonymous space <Arrow /></button>
          </div>
          {anon ? (
            <p className="note">Named spaces show your name to their members. Turn off Anonymous to make one.</p>
          ) : (
            <span className="mono dim sp-or">Or a named space</span>
          )}
        </div>
      )}
      {tab === "create" && !anon && (
        <CreateForm
          title0={q}
          handle0={handle}
          onDone={(s) => props.onEnter(s)}
        />
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

function CreateForm(props: { title0: string; handle0: string; onDone: (s: SpaceSession) => void }) {
  const [title, setTitle] = useState(props.title0);
  const [handle, setHandle] = useState(props.handle0);
  const [priv, setPriv] = useState(false);
  const [work, setWork] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => setHandle((h) => h || props.handle0), [props.handle0]);
  const ok = title.trim().length > 0 && handle.trim().length > 0 && (!priv || pass.length >= 4);
  const go = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setErr("");
    try {
      props.onDone(await createSpace(title.trim(), handle.trim(), priv, pass, work));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sp-pane" key="create">
      <div className="field">
        <label><span className="mono">Name your space</span><span className="mono dim">{title.length}/32</span></label>
        <input className="line-input name-input" value={title} maxLength={32} onChange={(e) => setTitle(e.target.value)} placeholder="Studio, Family, Team…" autoComplete="off" />
      </div>
      <div className="seg" role="radiogroup" aria-label="Who can enter">
        <button role="radio" aria-checked={!priv} className={!priv ? "on" : ""} onClick={() => setPriv(false)}>Open · anyone</button>
        <button role="radio" aria-checked={priv} className={priv ? "on" : ""} onClick={() => setPriv(true)}><Lock /> Private</button>
      </div>
      {priv && (
        <div className="field">
          <label><span className="mono">Passcode to enter</span></label>
          <input className="line-input" value={pass} maxLength={64} onChange={(e) => setPass(e.target.value)} placeholder="4+ characters" autoComplete="off" />
        </div>
      )}
      <div className="seg" role="radiogroup" aria-label="How people see it">
        <button role="radio" aria-checked={!work} className={!work ? "on" : ""} onClick={() => setWork(false)}>Flexible · any view</button>
        <button role="radio" aria-checked={work} className={work ? "on" : ""} onClick={() => setWork(true)}>Workspace only</button>
      </div>
      {work && <p className="note">Everyone who joins sees it in the Work view. In Classic they step out of it, with a button to come back.</p>}
      <p className="note">A space closes 8 hours after it is made: its people, files, notes and tasks go with it. What you send in it stays until then.</p>
      <div className="field">
        <label><span className="mono">Your name in it</span></label>
        <input className="line-input" value={handle} maxLength={24} onChange={(e) => setHandle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="How others see your objects" autoComplete="off" />
      </div>
      {err && <p className="err">{err}</p>}
      <button className="cta lg-press" disabled={!ok || busy} onClick={go}>{busy ? "Creating…" : <>Create {priv ? "private " : ""}space <Arrow /></>}</button>
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
  const members = [...(info?.members ?? [])].sort((a, b) => Number(b.you) - Number(a.you) || Number(online.has(b.id)) - Number(online.has(a.id)));
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
          <span className="mono dim">{space.anon ? "anonymous space" : space.priv ? "private space" : "space"} · {live} live</span>
          <b className="wide">{space.title}</b>
        </div>
        <button className="room-exit glass lg-press" onClick={props.onExit} aria-label="Exit this space, back to the public void">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></svg>
          Exit
        </button>
        <div className="room-crew">
          {members.slice(0, 14).map((m) => (
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
          {members.length > 14 && <span className="crew more"><i>+{members.length - 14}</i></span>}
        </div>
      </div>
    </div>
  );
}
