"use client";
import { useState, type ReactNode } from "react";
import { LuCloud, LuEyeOff, LuLink, LuMapPinOff, LuShieldCheck, LuTimer, LuUserRoundX } from "react-icons/lu";
import { BsIncognito } from "react-icons/bs";
import { ANON_MINUTES, lastMinutes } from "@/lib/anon";
import { Pop } from "./Spaces";
import { ANON_PASS_MIN, type SpaceSession } from "@/lib/space";

// "Stay anonymous" (lib/anon.ts): the explainer, the "you're anonymous" status, the gate in front of every send in the
// public void, the join card of an anonymous link and the link itself. The copy says what Orbi does NOT keep or share,
// and plainly what still happens: never more than that.

export type AnonMode = "intro" | "start" | "on" | "status" | "gate" | "join" | "link";

/** what anonymous mode does (also on the privacy page) */
export function AnonFacts() {
  return (
    <ul className="anon-list">
      <li><LuMapPinOff aria-hidden /><span>Your location is hidden from other users. GPS is off and never asked for.</span></li>
      <li><LuUserRoundX aria-hidden /><span>No name and no device. Others see you as Anon-7F3, not &quot;Chrome · iPhone&quot;.</span></li>
      <li><LuCloud aria-hidden /><span>Cloud only. Files travel as an encrypted copy through Orbi&apos;s cloud, never device to device, so the other person never sees your IP address.</span></li>
      <li><LuShieldCheck aria-hidden /><span>Encrypted in your browser before it leaves. In an anonymous space only people with its link can open what you send. Orbi can&apos;t.</span></li>
      <li><LuEyeOff aria-hidden /><span>No trackers or analytics, and your style isn&apos;t remembered for this computer.</span></li>
    </ul>
  );
}

/** the explainer's lead line (also on the privacy page): about the people you send to, not Orbi's servers */
export const ANON_LEAD = "Become a ghost. No login, no name, no location. Sender and receiver never meet: files cross through the encrypted cloud, in a temporary space off the map that burns when your time is up.";

/** what still happens while anonymous */
const ANON_STILL = [
  "Orbi's servers see your IP address, like any website, and keep it with its rough area (city) for abuse and legal requests. Other users never see it. For more, use a VPN or Tor.",
  "People in the space see the file names (unless you hide them), sizes and when you send.",
  "Notes and tasks aren't end-to-end encrypted: Orbi can read them. Put private things in a file.",
  "Photos can carry where they were taken. Orbi removes this from JPEG and PNG photos; other files (HEIC, videos, documents) are sent as they are.",
  "This browser remembers the anonymous spaces you're in, so you can come back, until you leave them.",
  "Paying for Pro needs an email at our payment provider. Sending never does.",
];

/** the same, as a plain list (the privacy page) */
export function AnonStillList() {
  return <ul>{ANON_STILL.map((t) => <li key={t}>{t}</li>)}</ul>;
}

/** three things to read at a glance (the full list is in AnonFacts / Still) */
function Points() {
  return (
    <ul className="anon-pts" data-keep-words>
      <li><LuLink aria-hidden /><span>One link gets people in</span></li>
      <li><LuShieldCheck aria-hidden /><span>Encrypted in your browser</span></li>
      <li><LuTimer aria-hidden /><span>Burns when your time is up</span></li>
    </ul>
  );
}

function Still({ open }: { open: boolean }) {
  return (
    <details className="anon-still" open={open}>
      <summary>What still happens</summary>
      {ANON_STILL.map((t) => <p key={t}>{t}</p>)}
    </details>
  );
}

export default function AnonCard(props: {
  mode: AnonMode;
  onClose: () => void;
  /** the switch itself (an anonymous space makes you anonymous even with it off) */
  switchOn: boolean;
  /** the anonymous space this device is in right now */
  space: SpaceSession | null;
  /** anonymous spaces this browser is in (to send into one again) */
  saved: SpaceSession[];
  /** turn it on for this many minutes (5 to 30): then everything burns */
  onTurnOn: (min: number) => void;
  onTurnOff: () => void;
  /** make an anonymous space and carry on (the gate: with the same files); with a passcode: its name + passcode open it */
  onCreate: (pass?: string) => Promise<void>;
  /** go to where a name + passcode (or a knock) gets you into someone's anonymous space */
  onEnterByName?: () => void;
  onPick: (s: SpaceSession) => void;
  /** the link opened: the title worked out from it, and joining */
  join?: { title: string; go: () => Promise<void> };
  /** the active space's link (it holds the code and the key) */
  link?: string;
  onCopy: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [min, setMin] = useState(lastMinutes);
  // how long this anonymous identity lives: when it's up, the session and its spaces burn everywhere
  const picker = (
    <div className="anon-time" role="radiogroup" aria-label="How long to stay anonymous">
      {/* the identity burns (not a file expiring): the same words in Work, whose office words would say "expires" */}
      <span className="mono" data-keep-words>Burns after</span>
      <div>
        {ANON_MINUTES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={min === m} className={`pill lg-press${min === m ? " on" : ""}`} onClick={() => setMin(m)}>{m} min</button>
        ))}
      </div>
    </div>
  );
  const run = (f: () => Promise<void>) => async () => {
    if (busy) return;
    setBusy(true);
    await f().catch(() => {});
    setBusy(false);
  };
  // optional: a passcode makes the new space open with its 4-character name + this passcode (as well as its link)
  const [pass, setPass] = useState("");
  const passOk = pass.length === 0 || pass.length >= ANON_PASS_MIN;
  const passBox = (
    <label className="anon-pass">
      <span className="mono">Passcode <i>(optional)</i></span>
      <input type="password" className="line-input" value={pass} onChange={(e) => setPass(e.target.value.slice(0, 64))} placeholder={`${ANON_PASS_MIN}+ characters`} autoComplete="new-password" aria-label="Passcode for the new space (optional)" />
      <small>{pass ? (passOk ? "People get in with the space's 4-letter name + this passcode" : `At least ${ANON_PASS_MIN} characters`) : "Leave empty: only the link gets people in"}</small>
    </label>
  );
  const createBtn = (label: string) => (
    <button className="cta lg-press" disabled={busy || !passOk} onClick={run(() => props.onCreate(pass || undefined))}>{busy ? "Creating…" : pass ? `${label} with passcode` : label}</button>
  );
  const enterBtn = props.onEnterByName && <button className="ghost-btn lg-press" onClick={props.onEnterByName}>Have a name + passcode? Enter</button>;

  const share = typeof navigator !== "undefined" && !!navigator.share && !!props.link;
  const doShare = () => props.link && navigator.share?.({ title: props.space?.title ?? "Anonymous space", url: props.link }).catch(() => {});
  const ring = <i className="geo-ring anon-ring" aria-hidden><BsIncognito /></i>;
  const savedList = (verb: string) =>
    props.saved.length > 0 && (
      <div className="anon-saved">
        {props.saved.map((s) => (
          <button key={s.slug} className="pill lg-press" onClick={() => props.onPick(s)}>{verb} {s.title}</button>
        ))}
      </div>
    );
  const card = (label: string, body: ReactNode) => (
    <Pop label={label} onClose={props.onClose} className="geo-pop anon-pop" small>
      <div className="geo-ask anon-ask">{ring}{body}</div>
    </Pop>
  );

  const { mode, space } = props;
  if (mode === "intro")
    return card("Stay anonymous", (
      <>
        <h3 className="wide">Stay anonymous</h3>
        <p>{ANON_LEAD}</p>
        {picker}
        <AnonFacts />
        <Still open />
        {/* stays in view at the card's bottom edge while the explainer scrolls */}
        <div className="anon-actions">
          <button className="cta lg-press" onClick={() => props.onTurnOn(min)}><BsIncognito aria-hidden /> Stay anonymous · {min} min</button>
          <button className="geo-later mono" onClick={props.onClose}>Not now</button>
        </div>
      </>
    ));

  if (mode === "start")
    return card("Stay anonymous", (
      <>
        <h3 className="wide">Become a ghost</h3>
        <p>Pick how long. When the time is up your anonymous identity burns, with every anonymous space it made and all that&apos;s in them.</p>
        {picker}
        <button className="cta lg-press" onClick={() => props.onTurnOn(min)}><BsIncognito aria-hidden /> Go anonymous · {min} min</button>
        <button className="geo-later mono" onClick={props.onClose}>Not now</button>
      </>
    ));

  if (mode === "status" && space?.anon)
    return card("Anonymous", (
      <>
        <h3 className="wide">You&apos;re anonymous in {space.title}</h3>
        <p>You are {space.handle} here.{props.switchOn ? "" : " Leave this space and you're back to normal."}</p>
        <button className="cta lg-press" onClick={props.onCopy}>Copy anonymous link</button>
        {share && <button className="ghost-btn lg-press" onClick={doShare}>Share…</button>}
        {props.switchOn && <button className="ghost-btn lg-press" onClick={props.onTurnOff}>Turn off Anonymous</button>}
        <Still open={false} />
      </>
    ));

  if (mode === "on" || mode === "status")
    return card("Anonymous", (
      <>
        <h3 className="wide">You&apos;re anonymous</h3>
        <p>What you send goes into your own private space, not the open void.</p>
        <Points />
        {savedList("Send into")}
        {passBox}
        {createBtn("Create anonymous space")}
        {enterBtn}
        <button className="geo-later mono" onClick={props.onClose}>Just look around</button>
        {mode === "status" && (
          <>
            {props.switchOn && <button className="ghost-btn lg-press" onClick={props.onTurnOff}>Turn off Anonymous</button>}
            <Still open={false} />
          </>
        )}
      </>
    ));

  if (mode === "gate")
    return card("Send anonymously", (
      <>
        <h3 className="wide">Send anonymously</h3>
        <p>The open void is seen worldwide and shows your area and network. Anonymous sends go into your own private space instead.</p>
        <Points />
        {savedList("Into")}
        {passBox}
        {createBtn("Create space and continue")}
        <button className="geo-later mono" onClick={props.onClose}>Cancel</button>
      </>
    ));

  if (mode === "join" && props.join)
    return card("Anonymous space", (
      <>
        <h3 className="wide">Join {props.join.title}?</h3>
        <p>You&apos;ll get a random name like Anon-7F3. Nothing about you or your location is shared with the space.</p>
        <button className="cta lg-press" disabled={busy} onClick={run(props.join.go)}><BsIncognito aria-hidden /> {busy ? "Joining…" : "Join anonymously"}</button>
        <button className="geo-later mono" onClick={props.onClose}>Not now</button>
      </>
    ));

  // "link": right after the first send into a new anonymous space, or when the link couldn't be copied
  return card("Share the link", (
    <>
      <h3 className="wide">{space?.named ? "Your space is ready" : "Share the link"}</h3>
      {space?.named && (
        <div className="anon-name" data-keep-words>
          <span className="mono">Name</span>
          <b>{space.slug.slice(5, 9).toUpperCase()}</b>
          <small>Give people this name and your passcode (Spaces → Browse), or send the link below.</small>
        </div>
      )}
      <input readOnly className="line-input anon-link" value={props.link ?? ""} onFocus={(e) => e.currentTarget.select()} aria-label="Anonymous link" />
      <p>It holds the space&apos;s code and its key. Anyone who has it can get in and open what&apos;s sent here, so send it only to the person you mean. Orbi never sees the key: it stays after the # in the link.</p>
      <button className="cta lg-press" onClick={props.onCopy}>Copy link</button>
      {share && <button className="ghost-btn lg-press" onClick={doShare}>Share…</button>}
    </>
  ));
}
