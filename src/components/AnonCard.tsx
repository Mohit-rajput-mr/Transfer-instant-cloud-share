"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LuArrowLeft, LuChevronRight, LuCloud, LuCopy, LuEye, LuEyeOff, LuMapPinOff, LuPlus, LuSearch, LuShare2, LuShieldCheck, LuUserRoundX } from "react-icons/lu";
import { BsIncognito } from "react-icons/bs";
import { ANON_MINUTES, aliasOf, lastMinutes, type AnonSession } from "@/lib/anon";
import { Pop } from "./Spaces";
import { ANON_PASS_MIN, anonLive, cleanAnonName, type SpaceSession } from "@/lib/space";

// "Stay anonymous" (lib/anon.ts), as one simple portal card. Three things to do, nothing else on the first screen:
//   look around  the open void, as a ghost
//   create       a private space with its own 4-character code (made up for you) and a passcode you pick (required)
//   find         someone's space: type its code, see that it's live, give its passcode
// Every anonymous space burns with the session that made it (5 to 30 minutes). The copy says what Orbi does NOT keep
// or share, and plainly what still happens (privacy page): never more than that.

export type AnonMode = "intro" | "start" | "on" | "status" | "gate" | "join" | "link";

/** what anonymous mode does (the privacy page) */
export function AnonFacts() {
  return (
    <ul className="anon-list">
      <li><LuMapPinOff aria-hidden /><span>Your location is hidden from other users. GPS is off and never asked for.</span></li>
      <li><LuUserRoundX aria-hidden /><span>No name and no device. Others see you as Anon-7F3, not &quot;Chrome · iPhone&quot;.</span></li>
      <li><LuCloud aria-hidden /><span>Cloud only. Files travel as an encrypted copy through Orbi&apos;s cloud, never device to device, so the other person never sees your IP address.</span></li>
      <li><LuShieldCheck aria-hidden /><span>Encrypted in your browser before it leaves. In an anonymous space only people with its code and passcode can open what you send. Orbi can&apos;t.</span></li>
      <li><LuEyeOff aria-hidden /><span>No trackers or analytics, and your style isn&apos;t remembered for this computer.</span></li>
    </ul>
  );
}

/** the explainer's lead line (the privacy page) */
export const ANON_LEAD = "Become a ghost. No login, no name, no location. Sender and receiver never meet: files cross through the encrypted cloud, in a temporary space off the map that burns when your time is up.";

/** what still happens while anonymous (the privacy page) */
const ANON_STILL = [
  "Orbi's servers see your IP address, like any website, and keep it with its rough area (city) for abuse and legal requests. Other users never see it. For more, use a VPN or Tor.",
  "People in the space see the file names (unless you hide them), sizes and when you send.",
  "Notes and tasks aren't end-to-end encrypted: Orbi can read them. Put private things in a file.",
  "Photos can carry where they were taken. Orbi removes this from JPEG and PNG photos; other files (HEIC, videos, documents) are sent as they are.",
  "This browser remembers the anonymous spaces you're in, so you can come back, until you leave them.",
  "Paying for Pro needs an email at our payment provider. Sending never does.",
];

export function AnonStillList() {
  return <ul>{ANON_STILL.map((t) => <li key={t}>{t}</li>)}</ul>;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
/** a named anonymous space's code: the 4 characters after "anon-" in its slug */
export const anonCode = (s: SpaceSession) => (s.named ? s.slug.slice(5, 9).toUpperCase() : "");

export default function AnonCard(props: {
  mode: AnonMode;
  onClose: () => void;
  /** the switch itself (an anonymous space makes you anonymous even with it off) */
  switchOn: boolean;
  /** the running session (its alias and clock) */
  sess: AnonSession | null;
  /** the anonymous space this device is in right now */
  space: SpaceSession | null;
  /** anonymous spaces this browser is in */
  saved: SpaceSession[];
  /** look around: anonymous in the open void (starts a session of `min` minutes if none runs) */
  onLook: (min: number) => void;
  onTurnOff: () => void;
  /** a new space: its code is made up, the passcode is required */
  onCreate: (pass: string, min: number) => Promise<void>;
  /** into someone's space with its code and passcode */
  onFind: (code: string, pass: string, min: number) => Promise<void>;
  onPick: (s: SpaceSession) => void;
  /** out of the anonymous space, back to the open void (still anonymous) */
  onLeave?: () => void;
  /** an old-style link was opened: its title, and joining */
  join?: { title: string; go: () => Promise<void> };
  /** an old-style space (no code): its link */
  link?: string;
}) {
  const { mode, space, sess } = props;
  const [step, setStep] = useState<"home" | "create" | "find">("home");
  const [min, setMin] = useState(lastMinutes);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pass, setPass] = useState("");
  const [code, setCode] = useState("");
  const [live, setLive] = useState<"idle" | "checking" | "live" | "none" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sess) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sess]);

  // find: as soon as 4 characters are in, ask whether that space is live
  const name = cleanAnonName(code);
  useEffect(() => {
    if (step !== "find" || name.length !== 4) return;
    let on = true;
    const t = setTimeout(async () => {
      setLive("checking");
      const r = await anonLive(name);
      if (!on) return;
      setLive(r === null ? "error" : r ? "live" : "none");
      if (r) setTimeout(() => passRef.current?.focus(), 50);
    }, 200);
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, [name, step]);
  const shown = name.length === 4 ? live : "idle";

  const go = (to: "home" | "create" | "find") => {
    setStep(to);
    setErr("");
    setPass("");
  };
  const run = (f: () => Promise<void>) => async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await f();
    } catch (e) {
      setErr((e as Error).message || "Something went wrong");
    }
    setBusy(false);
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const share = (c: string) =>
    navigator.share?.({ title: "Anonymous space", text: `Join my anonymous space on Orbi Transfer. Code: ${c} (ask me for the passcode)`, url: location.origin }).catch(() => {});

  const passOk = pass.length >= ANON_PASS_MIN;
  const left = sess ? sess.ends - now : 0;
  const needsSession = !props.switchOn && !space?.anon;

  const card = (title: string, sub: string | null, body: ReactNode) => (
    <Pop label="Anonymous" onClose={props.onClose} className="anon-portal" small>
      <div className="ap">
        <div className="ap-head">
          <i className="ap-mark" aria-hidden><BsIncognito /></i>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
          {sess && props.switchOn && <span className="ap-clock"><b>{aliasOf(sess.id)}</b> · burns in <b>{mmss(left)}</b></span>}
        </div>
        {body}
        {err && <p className="ap-err" role="alert">{err}</p>}
      </div>
    </Pop>
  );
  const back = <button type="button" className="ap-back" onClick={() => go("home")}><LuArrowLeft aria-hidden /> Back</button>;
  const timePick = needsSession && (
    <div className="ap-time" role="radiogroup" aria-label="Burns after">
      <span>Burns after</span>
      <div>
        {ANON_MINUTES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={min === m} className={min === m ? "on" : ""} onClick={() => setMin(m)}>{m}<small>min</small></button>
        ))}
      </div>
    </div>
  );
  const opt = (icon: ReactNode, title: string, hint: string, onClick: () => void) => (
    <button type="button" className="ap-opt" onClick={onClick}>
      <i aria-hidden>{icon}</i>
      <span><b>{title}</b><small>{hint}</small></span>
      <LuChevronRight className="ap-go" aria-hidden />
    </button>
  );
  const savedRow = (verb: string) =>
    props.saved.length > 0 && (
      <div className="ap-saved">
        <span>{verb}</span>
        <div>
          {props.saved.map((s) => (
            <button key={s.slug} type="button" className="ap-chip" onClick={() => props.onPick(s)}>{anonCode(s) || s.title.replace(/^Anonymous · /, "")}</button>
          ))}
        </div>
      </div>
    );
  const codeTiles = (c: string) => (
    <div className="ap-code" aria-label={`Code ${c.split("").join(" ")}`}>
      {c.split("").map((ch, i) => <b key={i}>{ch}</b>)}
    </div>
  );

  // ---- create: the passcode (required); the code is made up for you ----
  if (step === "create")
    return card("Create a space", "You get a 4-character code. People need the code and your passcode to get in.", (
      <form className="ap-form" onSubmit={(e) => (e.preventDefault(), passOk && void run(() => props.onCreate(pass, min))())}>
        {back}
        {timePick}
        <label className="ap-field">
          <span>Passcode</span>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value.slice(0, 64))} placeholder={`At least ${ANON_PASS_MIN} characters`} autoComplete="new-password" autoFocus aria-label="Passcode for your space" />
        </label>
        <button type="submit" className="ap-cta" disabled={busy || !passOk}>{busy ? "Creating…" : "Create space"}</button>
      </form>
    ));

  // ---- find: the code, then (once it shows live) its passcode ----
  if (step === "find")
    return card("Find a space", "Type the space's 4-character code.", (
      <form className="ap-form" onSubmit={(e) => (e.preventDefault(), shown === "live" && passOk && void run(() => props.onFind(name, pass, min))())}>
        {back}
        <label className="ap-field">
          <span>Code</span>
          <div className="ap-search">
            <LuSearch aria-hidden />
            <input value={code.toUpperCase()} onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 4))} placeholder="K7QX" autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-label="Space code" />
          </div>
        </label>
        <p className={`ap-live ${shown}`} aria-live="polite">
          {shown === "checking" ? "Looking…" : shown === "live" ? <><i aria-hidden />{name.toUpperCase()} is live</> : shown === "none" ? `No live space called ${name.toUpperCase()}` : shown === "error" ? "Couldn't check, try again" : " "}
        </p>
        {shown === "live" && (
          <>
            {timePick}
            <label className="ap-field">
              <span>Passcode</span>
              <input ref={passRef} type="password" value={pass} onChange={(e) => setPass(e.target.value.slice(0, 64))} placeholder="The space's passcode" autoComplete="off" aria-label="Passcode" />
            </label>
            <button type="submit" className="ap-cta" disabled={busy || !passOk}>{busy ? "Opening…" : "Enter space"}</button>
          </>
        )}
      </form>
    ));

  // ---- inside an anonymous space (or right after making one): its code, to share ----
  if ((mode === "status" || mode === "link") && space?.anon) {
    const c = anonCode(space);
    return card(mode === "link" ? "Your space is live" : `You're in ${c || "an anonymous space"}`, c ? "Share the code and your passcode. Nothing else gets anyone in." : "Share its link: it holds the key.", (
      <>
        {c ? codeTiles(c) : <input readOnly className="ap-link" value={props.link ?? ""} onFocus={(e) => e.currentTarget.select()} aria-label="Link" />}
        <div className="ap-row">
          <button type="button" className="ap-cta" onClick={() => copy(c || props.link || "")}><LuCopy aria-hidden /> {copied ? "Copied" : c ? "Copy code" : "Copy link"}</button>
          {canShare && c && <button type="button" className="ap-btn" onClick={() => share(c)}><LuShare2 aria-hidden /> Share</button>}
        </div>
        {mode === "link" ? (
          <button type="button" className="ap-quiet" onClick={props.onClose}>Done</button>
        ) : (
          <div className="ap-foot">
            {props.onLeave && <button type="button" className="ap-quiet" onClick={props.onLeave}>Leave space</button>}
            {props.switchOn && <button type="button" className="ap-quiet danger" onClick={props.onTurnOff}>Exit anonymous</button>}
          </div>
        )}
      </>
    ));
  }

  // ---- an old-style link (code and key in it) ----
  if (mode === "join" && props.join)
    return card(`Join ${props.join.title}?`, "You'll get a random name like Anon-7F3. Nothing about you is shared with the space.", (
      <>
        <button type="button" className="ap-cta" disabled={busy} onClick={run(props.join.go)}><BsIncognito aria-hidden /> {busy ? "Joining…" : "Join anonymously"}</button>
        <button type="button" className="ap-quiet" onClick={props.onClose}>Not now</button>
      </>
    ));

  // ---- sending while anonymous in the open void: it goes into a space ----
  if (mode === "gate")
    return card("Send anonymously", "Anonymous sends go into a private space, never the open void.", (
      <>
        {savedRow("Send into")}
        <div className="ap-opts">
          {opt(<LuPlus />, "Create a space", "Get a code, set a passcode", () => go("create"))}
          {opt(<LuSearch />, "Find a space", "Enter a code + passcode", () => go("find"))}
        </div>
        <button type="button" className="ap-quiet" onClick={props.onClose}>Cancel</button>
      </>
    ));

  // ---- home: the three choices ----
  return card(props.switchOn ? "You're anonymous" : "Go anonymous", props.switchOn ? null : "No name. No location. It all burns when your time is up.", (
    <>
      {timePick}
      <div className="ap-opts">
        {opt(<LuEye />, "Look around", "The open void, as a ghost", () => (props.switchOn ? props.onClose() : props.onLook(min)))}
        {opt(<LuPlus />, "Create a space", "Get a code, set a passcode", () => go("create"))}
        {opt(<LuSearch />, "Find a space", "Enter a code + passcode", () => go("find"))}
      </div>
      {savedRow("Your spaces")}
      {props.switchOn && <button type="button" className="ap-quiet danger" onClick={props.onTurnOff}>Exit anonymous</button>}
    </>
  ));
}
