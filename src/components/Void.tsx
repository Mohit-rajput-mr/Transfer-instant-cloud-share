"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Starfield from "./Starfield";
import OrbView, { layout } from "./OrbView";
import { OwnerPanel, SendPanel, UnlockPanel, setCardOrigin } from "./Panels";
import { deviceId, deviceLabel, ownerKey, type Orb } from "@/lib/client";
import { supabase, type Presence, type RealtimeChannel } from "@/lib/realtime";

type Panel =
  | { kind: "send"; files: File[] }
  | { kind: "unlock"; id: string }
  | { kind: "owner"; id: string }
  | null;

export default function Void() {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [net, setNet] = useState<string | null>(null);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [panel, setPanel] = useState<Panel>(null);
  const [scope, setScope] = useState<"all" | "near">("all");
  const [dragging, setDragging] = useState(false);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [pulse, setPulse] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [extra, setExtra] = useState<Orb | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const known = useRef<Set<string> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const me = useRef<string>("");

  const toast = useCallback((text: string) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/transfers", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const d = (await r.json()) as { items: Orb[]; net: string; now: number };
    setNet(d.net);
    setSkew(d.now - Date.now());
    setOrbs(d.items);
    setLoaded(true);
    if (known.current) {
      for (const o of d.items) if (!known.current.has(o.id) && !ownerKey(o.id)) toast(`New object in orbit: ${o.name}`);
    }
    known.current = new Set(d.items.map((o) => o.id));
  }, [toast]);

  const broadcast = useCallback(() => {
    channel.current?.send({ type: "broadcast", event: "pulse", payload: { at: Date.now() } });
  }, []);

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // initial load, polling fallback, deep link
  useEffect(() => {
    me.current = deviceId();
    refresh();
    const t = setInterval(refresh, 15_000);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    const o = new URLSearchParams(window.location.search).get("o");
    if (o && /^[a-z0-9]{4,12}$/.test(o)) setPanel(ownerKey(o) ? { kind: "owner", id: o } : { kind: "unlock", id: o });
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  // what this device is looking at, broadcast via presence
  const viewing = panel?.kind === "unlock" ? panel.id : panel?.kind === "owner" ? `owner:${panel.id}` : null;
  const presenceRef = useRef<Presence>({ device: "", viewing: null, net: null, at: 0 });
  presenceRef.current = { ...presenceRef.current, viewing, net };
  const track = useCallback(() => {
    if (!presenceRef.current.device) presenceRef.current.device = deviceLabel();
    channel.current?.track({ ...presenceRef.current, at: Date.now() });
  }, []);

  // realtime: presence (who is here / who is looking at what) + pulses (something changed)
  useEffect(() => {
    const ch = supabase.channel("orbit-void", { config: { presence: { key: deviceId() }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Presence>();
      setPresence(Object.values(state).map((list) => list[list.length - 1]));
    });
    ch.on("broadcast", { event: "pulse" }, () => {
      refresh();
      setPulse((p) => p + 1);
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.current = ch;
        track();
      }
    });
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [refresh, track]);

  useEffect(() => {
    track();
    const t = setInterval(track, 25_000);
    return () => clearInterval(t);
  }, [viewing, net, track]);

  // sync ?o= with open object
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = panel && panel.kind !== "send" ? panel.id : null;
    if (id) url.searchParams.set("o", id);
    else url.searchParams.delete("o");
    window.history.replaceState(null, "", url);
  }, [panel]);

  // fetch an object opened by link that is not in the list yet
  const openId = panel?.kind === "unlock" ? panel.id : null;
  useEffect(() => {
    if (!openId || orbs.some((o) => o.id === openId)) return setExtra(null);
    fetch(`/api/transfers/${openId}`)
      .then(async (r) => {
        if (r.ok) return setExtra(await r.json());
        setExtra(null);
        setPanel(null);
        toast("That object already burned up");
      })
      .catch(() => setExtra(null));
  }, [openId, orbs, toast]);

  // drag & drop anywhere + paste
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) setPanel({ kind: "send", files });
    };
    const paste = (e: ClipboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) return setPanel({ kind: "send", files });
      const text = e.clipboardData?.getData("text");
      if (text) setPanel({ kind: "send", files: [new File([text], "note.txt", { type: "text/plain" })] });
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
    };
  }, []);

  const serverNow = now + skew;
  const alive = useMemo(() => orbs.filter((o) => new Date(o.expiresAt).getTime() > serverNow), [orbs, serverNow]);
  const shown = useMemo(
    () => alive.filter((o) => scope === "all" || o.netHash === net || !!ownerKey(o.id)),
    [alive, scope, net],
  );
  const positions = useMemo(() => layout(shown), [shown]);
  const watchers = useCallback((id: string) => presence.filter((p) => p.viewing === id).length, [presence]);
  const nearbyCount = alive.filter((o) => o.netHash === net).length;

  const onViewed = useCallback(() => {
    refresh();
    broadcast();
  }, [refresh, broadcast]);

  const open = (o: Orb) => setPanel(ownerKey(o.id) ? { kind: "owner", id: o.id } : { kind: "unlock", id: o.id });
  const unlockOrb = panel?.kind === "unlock" ? orbs.find((o) => o.id === panel.id) ?? extra : null;

  return (
    <>
      <Starfield />

      <header className="top">
        <div className="top-row">
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden>
              <circle cx="32" cy="32" r="10" fill="#fff" />
              <ellipse cx="32" cy="32" rx="27" ry="9" fill="none" stroke="#fff" strokeWidth="3" transform="rotate(-24 32 32)" />
            </svg>
            <span className="brand-name">ORBIT</span>
            <span className="brand-by">Instant transfer</span>
          </div>
          <nav className="nav">
            <a href="#void">Void</a>
            <a href="#how">How it works</a>
            <button onClick={() => fileInput.current?.click()}>Launch</button>
          </nav>
          <div className="top-right">
            <span className="live"><span className="dot" /><b>{Math.max(1, presence.length)}</b> {presence.length > 1 ? "devices" : "device"} in orbit</span>
            <button className="pill" onClick={() => fileInput.current?.click()}>Send</button>
          </div>
        </div>
        <div className="top-row">
          <div className="sub-left">
            <span>No login</span><span>End-to-end encrypted</span><span>Any size</span><span>Burns in 30 min</span>
          </div>
          <span />
          <div className="toggle" role="tablist" aria-label="Scope">
            <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>All</button>
            <button className={scope === "near" ? "on" : ""} onClick={() => setScope("near")}>Nearby{nearbyCount ? ` ${nearbyCount}` : ""}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="void" id="void">
          <div className="ghost-type" aria-hidden>
            <span className="wide">Drop</span>
            <span className="wide">Lock</span>
            <span className="wide">Beam</span>
            <span className="wide">Burn.</span>
            <p className="mono">Anything dropped here floats in the void, encrypted, until it burns up. No accounts. No traces.</p>
          </div>
          <div className="ghost-big" aria-hidden>
            <div className="wide">30 Min</div>
            <p className="mono">Lifetime of every object,<br />from launch to burn-up.</p>
          </div>

          {loaded && shown.length === 0 && (
            <div className="empty">
              <p className="mono">{scope === "near" ? "Nothing from your network yet" : "The void is empty. Drop a file anywhere"}<span className="cursor" /></p>
              <button className="pill empty-btn" onClick={() => fileInput.current?.click()}>Choose file</button>
            </div>
          )}

          {shown.map((o) => (
            <OrbView
              key={o.id}
              orb={o}
              pos={positions.get(o.id)!}
              now={serverNow}
              mine={!!ownerKey(o.id)}
              nearby={!!net && o.netHash === net}
              watchers={watchers(o.id)}
              onOpen={() => open(o)}
            />
          ))}
        </section>

        <section className="how" id="how">
          <div className="how-top"><span>Protocol</span><span>Objects in orbit right now</span></div>
          <div className="how-hero">
            <span className="wide">Orbit</span>
            <span className="wide count">{alive.length}</span>
          </div>
          <div className="how-cols">
            <div>
              <h4>What is it</h4>
              <p>A shared void between your devices. Open this page anywhere, on any browser, and whatever you launch floats here, end-to-end encrypted.</p>
            </div>
            <div>
              <h4>Works between</h4>
              <ul><li>Chrome, Safari, Edge, Firefox</li><li>Phone to laptop</li><li>Office PC to home</li><li>Any size, any format</li></ul>
            </div>
            <button className="lnk" onClick={() => fileInput.current?.click()}>Launch something into orbit</button>
          </div>
          <p className="how-sub">The four phases</p>
          <div className="table-head"><span>Phase</span><span>Codename</span><span>What happens</span><span style={{ textAlign: "right" }}>Step</span></div>
          {[
            ["Upload", "Drop", "Drag any file onto the page, or paste it. Name it whatever you like. It becomes an object drifting in the void."],
            ["Encrypt", "Lock", "Pick a passcode. The file is chunk-encrypted with AES-256-GCM inside your browser. The server never sees the passcode or the content."],
            ["Receive", "Beam", "Open ORBIT on the other device. Tap the object, enter the passcode, and it decrypts and lands. Live stats show who is accessing it."],
            ["Destroy", "Burn", "After 30 minutes, after N downloads, or the moment the sender hits destroy, it is erased for good."],
          ].map(([a, b, c], i) => (
            <div className="table-row" key={b}>
              <span>{a}</span>
              <span className="wide">{b}</span>
              <p>{c}</p>
              <span className="wide n">{i + 1}</span>
            </div>
          ))}
        </section>
      </main>

      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) setPanel({ kind: "send", files });
          e.target.value = "";
        }}
      />

      <div className={`dropzone${dragging ? " on" : ""}`} aria-hidden>
        <div className="frame" />
        <div className="wide">Release<br />to launch</div>
      </div>

      {panel?.kind === "send" && (
        <SendPanel
          files={panel.files}
          onClose={() => setPanel(null)}
          onLaunched={() => {
            refresh();
            broadcast();
          }}
          onOpenOwner={(id) => setPanel({ kind: "owner", id })}
        />
      )}
      {panel?.kind === "unlock" && unlockOrb && (
        <UnlockPanel
          key={unlockOrb.id}
          orb={unlockOrb}
          now={serverNow}
          watchers={watchers(unlockOrb.id)}
          onClose={() => setPanel(null)}
          onDownloaded={() => {
            refresh();
            broadcast();
          }}
          onViewed={onViewed}
        />
      )}
      {panel?.kind === "owner" && (
        <OwnerPanel
          id={panel.id}
          now={serverNow}
          watchers={watchers(panel.id)}
          pulse={pulse}
          onClose={() => setPanel(null)}
          onDeleted={(id) => {
            setOrbs((list) => list.filter((o) => o.id !== id));
            setPanel(null);
            toast("Object destroyed");
            broadcast();
          }}
        />
      )}

      <div className="toast" aria-live="polite">
        {toasts.map((t) => <div key={t.id}>{t.text}</div>)}
      </div>

      {!panel && (
        <button
          className="send-fab"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setCardOrigin(r.left + r.width / 2, r.top + r.height / 2);
            fileInput.current?.click();
          }}
          aria-label="Send a file"
        >
          <span className="ico">↑</span>
          <span>Send<small>or drop anywhere</small></span>
        </button>
      )}

      <div className="made">made with <span className="heart">♥</span> by <b>Mohit</b></div>
    </>
  );
}
