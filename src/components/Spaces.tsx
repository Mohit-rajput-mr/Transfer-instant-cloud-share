"use client";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "./Panels";
import {
  createSpace, enterSpace, joinSpace, kickMember, savedHandle, savedSpaces, searchSpaces,
  type SpaceHit, type SpaceInfo, type SpaceSession,
} from "@/lib/space";

const Lock = () => (
  <svg className="sp-lock" viewBox="0 0 12 12" aria-label="private" role="img">
    <rect x="2.2" y="5.2" width="7.6" height="5.6" rx="1.2" fill="currentColor" />
    <path d="M4 5.2V3.8a2 2 0 0 1 4 0v1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/**
 * Spaces in one card: your name, one box that both finds and creates, your saved spaces (one tap),
 * and, when you are in one, who else is there (the creator can remove people).
 */
export default function SpacePanel(props: {
  current: SpaceSession | null;
  start?: string;
  onEnter: (s: SpaceSession) => void;
  onLeave: () => void;
  onClose: () => void;
  toast: (t: string) => void;
}) {
  const { current } = props;
  const [handle, setHandle] = useState("");
  const [q, setQ] = useState(props.start ?? "");
  const [hits, setHits] = useState<SpaceHit[]>([]);
  const [saved, setSaved] = useState<SpaceSession[]>([]);
  // the row waiting for a passcode (a private space), or "new" for create-private
  const [askPass, setAskPass] = useState<string | null>(null);
  const [pass, setPass] = useState("");
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState<SpaceInfo | null>(null);
  const handleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    savedHandle().then((h) => setHandle((cur) => cur || h));
    savedSpaces().then(setSaved);
  }, []);

  useEffect(() => {
    if (!current) return setInfo(null);
    enterSpace(current).then(setInfo).catch(() => {});
  }, [current]);

  // search as you type (debounced)
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => searchSpaces(q.trim()).then((h) => live && setHits(h)).catch(() => {}), q ? 180 : 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  const needName = () => {
    if (handle.trim()) return false;
    setErr("First, your name in the space");
    handleRef.current?.focus();
    return true;
  };

  const run = async (fn: () => Promise<SpaceSession>) => {
    setBusy(true);
    setErr("");
    try {
      const s = await fn();
      props.onEnter(s);
    } catch (e) {
      const x = e as Error & { needPass?: boolean };
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const pick = (h: SpaceHit) => {
    if (needName()) return;
    const mine = saved.find((s) => s.slug === h.slug);
    if (mine) return props.onEnter(mine); // already a member: straight in
    if (h.priv && askPass !== h.slug) {
      setAskPass(h.slug);
      setPass("");
      setErr("");
      return;
    }
    run(() => joinSpace(h.slug, handle.trim(), h.priv ? pass : undefined));
  };

  const create = () => {
    if (needName()) return;
    if (priv && pass.length < 4) {
      setAskPass("new");
      return setErr("Private spaces need a passcode (4+ characters)");
    }
    run(() => createSpace(q.trim(), handle.trim(), priv, pass));
  };

  const kick = async (id: string, who: string) => {
    if (!current) return;
    try {
      await kickMember(current, id);
      props.toast(`${who} was removed`);
      setInfo(await enterSpace(current));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const copyInvite = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?space=${current.slug}`);
      props.toast("Invite link copied");
    } catch {}
  };

  const query = q.trim();
  const exact = hits.some((h) => h.slug === query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  const others = saved.filter((s) => s.slug !== current?.slug && (!query || s.title.toLowerCase().includes(query.toLowerCase())));
  const found = hits.filter((h) => h.slug !== current?.slug && !others.some((s) => s.slug === h.slug));

  return (
    <Drawer label="Spaces" onClose={props.onClose}>
      <div className="col">
        {current ? (
          <>
            <div>
              <span className="mono dim">{current.priv ? "private space" : "space"} · {info ? `${info.members.length} in it` : "…"}</span>
              <div className="wide d-title">{current.title}</div>
              <p className="note">Only people in this space see what is launched here. You are <b>{current.handle}</b>.</p>
            </div>
            {info && (
              <div className="files sp-members">
                {info.members.map((m) => (
                  <div key={m.id}>
                    <span>{m.handle}{m.you ? " · you" : ""}</span>
                    {info.owner && !m.you ? (
                      <button className="mono sp-kick" onClick={() => kick(m.id, m.handle)}>Remove</button>
                    ) : (
                      <span className="mono dim">{m.you && info.owner ? "creator" : ""}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="grow" />
            <div className="sp-row">
              <button className="pill lg-press" onClick={copyInvite}>Copy invite link</button>
            </div>
            <button className="ghost-btn lg-press" onClick={props.onLeave}>Back to the public void</button>
          </>
        ) : (
          <>
            <div>
              <span className="mono dim">you are in</span>
              <div className="wide d-title">Public void</div>
              <p className="note">A space is your own void: only people in it see its objects. Make one, or find one and step in.</p>
            </div>
            <div className="grow" />
          </>
        )}
      </div>

      <div className="col">
        <div className="field">
          <label><span className="mono">Your name in spaces</span><span className="mono dim">{handle.length}/24</span></label>
          <input
            ref={handleRef}
            className="line-input"
            value={handle}
            maxLength={24}
            autoComplete="off"
            placeholder="How others see your objects"
            onChange={(e) => setHandle(e.target.value)}
          />
        </div>
        <div className="field">
          <label><span className="mono">Find or create a space</span></label>
          <input
            className="line-input"
            value={q}
            maxLength={32}
            autoComplete="off"
            enterKeyHint="go"
            placeholder="Search by name"
            onChange={(e) => {
              setQ(e.target.value);
              setAskPass(null);
              setErr("");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (found[0] && (exact || !query)) pick(found[0]);
              else if (query) create();
            }}
          />
        </div>

        <div className="files sp-list">
          {others.map((s) => (
            <div key={`s-${s.slug}`}>
              <button className="sp-item" onClick={() => props.onEnter(s)}>
                <b>{s.title}</b>{s.priv && <Lock />}<span className="mono dim">as {s.handle}</span>
              </button>
              <span className="mono sp-go">Enter</span>
            </div>
          ))}
          {found.map((h) => (
            <div key={`h-${h.slug}`} className={askPass === h.slug ? "ask" : undefined}>
              <button className="sp-item" disabled={busy} onClick={() => pick(h)}>
                <b>{h.title}</b>{h.priv && <Lock />}
              </button>
              {askPass === h.slug ? (
                <span className="sp-pass">
                  <input
                    className="line-input"
                    autoFocus
                    value={pass}
                    placeholder="Passcode"
                    autoComplete="off"
                    onChange={(e) => setPass(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && pick(h)}
                  />
                  <button className="pill solid lg-press" disabled={busy || !pass} onClick={() => pick(h)}>Join</button>
                </span>
              ) : (
                <span className="mono sp-go">Join</span>
              )}
            </div>
          ))}
          {query && !exact && (
            <div className="sp-new">
              <button className="sp-item" disabled={busy} onClick={create}>
                <b>Create “{query}”</b>
              </button>
              <span className="chips">
                <button className={`chip lg-press${!priv ? " on" : ""}`} onClick={() => (setPriv(false), setAskPass(null))}>Open</button>
                <button className={`chip lg-press${priv ? " on" : ""}`} onClick={() => (setPriv(true), setAskPass("new"))}><Lock /> Private</button>
              </span>
              {priv && askPass === "new" && (
                <span className="sp-pass">
                  <input className="line-input" value={pass} placeholder="Passcode to enter" autoComplete="off" onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
                </span>
              )}
            </div>
          )}
          {!others.length && !found.length && !query && <div><span className="mono dim">No spaces yet. Type a name to create one</span></div>}
        </div>
        {err && <p className="err">{err}</p>}
        <div className="grow" />
        {query && !exact && (
          <button className="cta lg-press" disabled={busy} onClick={create}>{busy ? "Creating…" : `Create ${priv ? "private " : ""}space`}</button>
        )}
      </div>
    </Drawer>
  );
}
