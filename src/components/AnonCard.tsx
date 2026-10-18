"use client";
import { useState, type ReactNode } from "react";
import { LuCloud, LuEyeOff, LuMapPinOff, LuShieldCheck, LuUserRoundX } from "react-icons/lu";
import { BsIncognito } from "react-icons/bs";
import { Pop } from "./Spaces";
import type { SpaceSession } from "@/lib/space";

// "Stay anonymous" (lib/anon.ts): the explainer, the "you're anonymous" status, the gate in front of every send in the
// public void, the join card of an anonymous link and the link itself. The copy says what Orbi does NOT keep or share,
// and plainly what still happens: never more than that.

export type AnonMode = "intro" | "on" | "status" | "gate" | "join" | "link";

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
export const ANON_LEAD = "Become a ghost. No location, no identity shown to other users. Send anonymously.";

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
  onTurnOn: () => void;
  onTurnOff: () => void;
  /** make an anonymous space and carry on (the gate: with the same files) */
  onCreate: () => Promise<void>;
  onPick: (s: SpaceSession) => void;
  /** the link opened: the title worked out from it, and joining */
  join?: { title: string; go: () => Promise<void> };
  /** the active space's link (it holds the code and the key) */
  link?: string;
  onCopy: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = (f: () => Promise<void>) => async () => {
    if (busy) return;
    setBusy(true);
    await f().catch(() => {});
    setBusy(false);
  };
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
        <AnonFacts />
        <Still open />
        {/* stays in view at the card's bottom edge while the explainer scrolls */}
        <div className="anon-actions">
          <button className="cta lg-press" onClick={props.onTurnOn}><BsIncognito aria-hidden /> Stay anonymous</button>
          <button className="geo-later mono" onClick={props.onClose}>Not now</button>
        </div>
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
        <p>Anonymous sends go into a private space of their own. Share it with one link: whoever has it can get in and open what you send.</p>
        {savedList("Send into")}
        <button className="cta lg-press" disabled={busy} onClick={run(props.onCreate)}>{busy ? "Creating…" : "Create anonymous space"}</button>
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
        <p>The public void shows what you post to people around your area, so anonymous sends go into an anonymous space instead. Only people with its link see what&apos;s in it.</p>
        {savedList("Into")}
        <button className="cta lg-press" disabled={busy} onClick={run(props.onCreate)}>{busy ? "Creating…" : "Create anonymous space and continue"}</button>
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
      <h3 className="wide">Share the link</h3>
      <input readOnly className="line-input anon-link" value={props.link ?? ""} onFocus={(e) => e.currentTarget.select()} aria-label="Anonymous link" />
      <p>It holds the space&apos;s code and its key. Anyone who has it can get in and open what&apos;s sent here, so send it only to the person you mean. Orbi never sees the key: it stays after the # in the link.</p>
      <button className="cta lg-press" onClick={props.onCopy}>Copy link</button>
      {share && <button className="ghost-btn lg-press" onClick={doShare}>Share…</button>}
    </>
  ));
}
