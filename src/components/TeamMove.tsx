"use client";
import { useState } from "react";
import { LuLock, LuUsers } from "react-icons/lu";
import { Pop } from "./Spaces";

/**
 * Going private with the team: one card. It makes a private space, carries your tasks into it, and invites
 * everyone on your Wi-Fi with one tap (the passcode is sealed for your network only). People elsewhere get
 * the link and the code.
 */
export function GoPrivate(props: { me: string; tasks: number; onGo: (title: string, handle: string, pass: string) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(props.me ? `${props.me}'s team` : "Our team");
  const [handle, setHandle] = useState(props.me);
  const [pass] = useState(() => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)));
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!title.trim() || !handle.trim() || busy) return;
    setBusy(true);
    try {
      await props.onGo(title.trim(), handle.trim(), pass);
      props.onClose();
    } catch {
      setBusy(false);
    }
  };
  return (
    <Pop label="Go private with the team" onClose={props.onClose} className="go-private">
      <div className="gp-steps">
        <p><LuLock aria-hidden /> A private space, passcode <b className="mono">{pass}</b></p>
        <p><LuUsers aria-hidden /> Everyone on your Wi-Fi gets a one-tap invite</p>
        {props.tasks > 0 && <p><i className="task-dot" aria-hidden /> Your {props.tasks} {props.tasks > 1 ? "tasks move" : "task moves"} with you</p>}
      </div>
      <input className="line-input" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} placeholder="Space name" aria-label="Space name" />
      <input className="line-input" value={handle} onChange={(e) => setHandle(e.target.value.slice(0, 24))} placeholder="Your name in it" aria-label="Your name" />
      <p className="mono dim gp-note">Files already in the void stay where they are (they burn on time). Teammates elsewhere: share the link and the code.</p>
      <button className="cta lg-press" disabled={busy || !title.trim() || !handle.trim()} onClick={go}>{busy ? "Moving…" : "Go private"}</button>
    </Pop>
  );
}

/** The other side: someone on this network is taking the team private. */
export function InviteCard(props: { by: string; title: string; onJoin: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="invite-card lg" role="dialog" aria-label="Invite to a private space">
      <LuLock aria-hidden />
      <div>
        <b>{props.by || "Your team"} is going private</b>
        <span className="mono dim">{props.title} · on your Wi-Fi</span>
      </div>
      <button className="cta-mini" disabled={busy} onClick={async () => { setBusy(true); try { await props.onJoin(); } catch { setBusy(false); } }}>{busy ? "Joining…" : "Join"}</button>
      <button className="dock-x lg-press" onClick={props.onClose} aria-label="Not now">×</button>
    </div>
  );
}
