"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Starfield from "./Starfield";
import Uploader from "./Uploader";
import LiquidGlass from "./LiquidGlass";
import OrbView, { assignHues, layout } from "./OrbView";
import { ComposePanel, OwnerPanel, SendPanel, UnlockPanel, setCardOrigin } from "./Panels";
import { folderFromInput, fromDrop, textToFile, type Folder } from "@/lib/bundle";
import { useRouter } from "next/navigation";
import { deviceId, deviceInfo, ownerKey, type Orb } from "@/lib/client";
import { supabase, type RealtimeChannel } from "@/lib/realtime";

type Panel =
  | { kind: "send"; files: File[]; folder?: Folder | null }
  | { kind: "compose" }
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
  const [online, setOnline] = useState(1);
  const [pulse, setPulse] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [extra, setExtra] = useState<Orb | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const known = useRef<Set<string> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const on = () => setCompact(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const me = useRef<string>("");

  const toast = useCallback((text: string) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  // Coalesced fetch: at most one request in flight; bursts of triggers collapse into one follow-up.
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const refresh = useCallback((): Promise<void> => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const run = (async () => {
      const r = await fetch("/api/transfers").catch(() => null);
      if (!r?.ok) return;
      const d = (await r.json()) as { items: Orb[]; online: number; now: number };
      setSkew(d.now - Date.now());
      setOrbs(d.items);
      setOnline(Math.max(1, d.online));
      setLoaded(true);
      if (known.current) {
        for (const o of d.items) if (!known.current.has(o.id) && !ownerKey(o.id)) toast(`New object in orbit: ${o.name}`);
      }
      known.current = new Set(d.items.map((o) => o.id));
    })().finally(() => {
      inflight.current = null;
      if (again.current) {
        again.current = false;
        refresh();
      }
    });
    inflight.current = run;
    return run;
  }, [toast]);

  // Realtime pulses fan out to every open tab at once; random jitter spreads the refetches
  // so a million tabs don't hit the edge in the same millisecond.
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (pulseTimer.current) return;
    pulseTimer.current = setTimeout(() => {
      pulseTimer.current = null;
      refresh();
    }, 150 + Math.random() * 900);
  }, [refresh]);

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

  // Heartbeat: tells the server this device is here and what it is looking at.
  const viewing = panel?.kind === "unlock" ? panel.id : null;
  const viewingRef = useRef<string | null>(null);
  viewingRef.current = viewing;
  const sendPulse = useCallback(() => {
    if (document.visibilityState !== "visible") return Promise.resolve();
    return fetch("/api/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId(), viewing: viewingRef.current, ...deviceInfo() }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((d: { net?: string }) => d.net && setNet(d.net))
      .catch(() => {});
  }, []);

  useEffect(() => {
    sendPulse();
    const t = setInterval(sendPulse, 25_000);
    const onVis = () => document.visibilityState === "visible" && sendPulse();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sendPulse]);

  // realtime broadcast only (no presence): constant cost per message, scales with Supabase's fan-out
  useEffect(() => {
    const ch = supabase.channel("orbit-void", { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "pulse" }, () => {
      scheduleRefresh();
      setPulse((p) => p + 1);
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") channel.current = ch;
    });
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [scheduleRefresh]);

  // opening / closing an object updates live-viewer counts everywhere right away
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    sendPulse().then(() => {
      refresh();
      broadcast();
    });
  }, [viewing, sendPulse, refresh, broadcast]);

  // auto-refresh stale tabs after a new deploy (never while a card is open)
  const version = useRef<string | null>(null);
  const stale = useRef(false);
  const panelOpen = useRef(false);
  panelOpen.current = panel !== null;
  useEffect(() => {
    const check = async () => {
      const r = await fetch("/api/version", { cache: "no-store" }).catch(() => null);
      const v = r?.ok ? ((await r.json()) as { v: string }).v : null;
      if (!v) return;
      if (version.current === null) version.current = v;
      else if (v !== version.current) {
        stale.current = true;
        if (!panelOpen.current) window.location.reload();
      }
    };
    check();
    const t = setInterval(check, 60_000);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  useEffect(() => {
    if (!panel && stale.current) window.location.reload();
  }, [panel]);

  // sync ?o= with open object
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = panel && (panel.kind === "unlock" || panel.kind === "owner") ? panel.id : null;
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
      if (!e.dataTransfer) return;
      // folders keep their structure; plain files stay files
      fromDrop(e.dataTransfer)
        .then(({ files, folder }) => {
          if (folder?.entries.length) setPanel({ kind: "send", files: [], folder });
          else if (files.length) setPanel({ kind: "send", files });
        })
        .catch(() => {});
    };
    const paste = (e: ClipboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) return setPanel({ kind: "send", files });
      const text = e.clipboardData?.getData("text");
      if (text?.trim()) setPanel({ kind: "send", files: [textToFile(text)] });
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
  // The void can only hold so many spheres; keep yours, then nearby, then the newest.
  const MAX_ORBS = 40;
  const visible = useMemo(() => {
    if (shown.length <= MAX_ORBS) return shown;
    const rank = (o: Orb) => (ownerKey(o.id) ? 2 : 0) + (o.netHash === net ? 1 : 0);
    return [...shown].sort((a, b) => rank(b) - rank(a) || b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ORBS);
  }, [shown, net]);
  const positions = useMemo(() => layout(visible), [visible]);
  const colors = useMemo(() => new Map(assignHues(visible)), [visible]);

  // arrival + burn-up choreography
  const [arriving, setArriving] = useState<Set<string>>(new Set());
  const [ghosts, setGhosts] = useState<{ orb: Orb; pos: { x: number; y: number }; mine: boolean; hue?: number }[]>([]);
  const prev = useRef<{ ids: Set<string>; orbs: Map<string, Orb>; pos: Map<string, { x: number; y: number }>; hue: Map<string, number> } | null>(null);
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(visible.map((o) => o.id));
    const aliveIds = new Set(alive.map((o) => o.id));
    const p = prev.current;
    if (p) {
      const fresh = visible.filter((o) => !p.ids.has(o.id)).map((o) => o.id);
      if (fresh.length) {
        setArriving((a) => new Set([...a, ...fresh]));
        setTimeout(() => setArriving((a) => new Set([...a].filter((id) => !fresh.includes(id)))), 2600);
      }
      const gone = [...p.ids].filter((id) => !ids.has(id) && !aliveIds.has(id));
      if (gone.length) {
        const g = gone.map((id) => ({ orb: p.orbs.get(id)!, pos: p.pos.get(id)!, mine: !!ownerKey(id), hue: p.hue.get(id) })).filter((x) => x.orb && x.pos);
        setGhosts((list) => [...list, ...g]);
        setTimeout(() => setGhosts((list) => list.filter((x) => !gone.includes(x.orb.id))), 1700);
      }
    }
    prev.current = { ids, orbs: new Map(visible.map((o) => [o.id, o])), pos: new Map(positions), hue: colors };
  }, [visible, alive, positions, colors, loaded]);
  const watchers = useCallback((id: string) => orbs.find((o) => o.id === id)?.watchers ?? 0, [orbs]);
  const nearbyCount = alive.filter((o) => o.netHash === net).length;

  const onViewed = useCallback(() => {
    refresh();
    broadcast();
  }, [refresh, broadcast]);

  // 10 quick taps on the logo open mission HQ
  const router = useRouter();
  const taps = useRef<number[]>([]);
  const tapLogo = () => {
    const t = performance.now();
    taps.current = [...taps.current.filter((x) => t - x < 4000), t];
    if (taps.current.length >= 10) {
      taps.current = [];
      router.push("/admin");
    }
  };

  const pickFiles = () => {
    setMenu(false);
    fileInput.current?.click();
  };
  const pickFolder = () => {
    setMenu(false);
    folderInput.current?.click();
  };
  const compose = () => {
    setMenu(false);
    setPanel({ kind: "compose" });
  };

  const open = (o: Orb) => setPanel(ownerKey(o.id) ? { kind: "owner", id: o.id } : { kind: "unlock", id: o.id });
  const unlockOrb = panel?.kind === "unlock" ? orbs.find((o) => o.id === panel.id) ?? extra : null;

  return (
    <>
      <Starfield />
      <LiquidGlass />

      <header className={`top lg${compact ? " compact" : ""}`}>
        <div className="top-row">
          <div className="brand" onClick={tapLogo} role="presentation">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/logo.svg" alt="ORBIT" width={103} height={24} draggable={false} />
            <span className="brand-by">Instant transfer</span>
          </div>
          <nav className="nav">
            <a href="#void">Void</a>
            <a href="#how">How it works</a>
            <button onClick={() => setMenu(true)}>Launch</button>
          </nav>
          <div className="top-right">
            <span className="live"><span className="dot" /><b>{online}</b> {online > 1 ? "devices" : "device"} in orbit</span>
            <button className="pill lg-press" onClick={() => setMenu(true)}>Send</button>
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
              <p className="mono">{scope === "near" ? "Nothing from your network yet" : "The void is empty. Drop files, folders or text anywhere"}<span className="cursor" /></p>
              <Uploader onFiles={pickFiles} onFolder={pickFolder} onText={compose} />
            </div>
          )}

          {visible.map((o) => (
            <OrbView
              key={o.id}
              orb={o}
              pos={positions.get(o.id)!}
              now={serverNow}
              mine={!!ownerKey(o.id)}
              nearby={!!net && o.netHash === net}
              watchers={watchers(o.id)}
              onOpen={() => open(o)}
              phase={arriving.has(o.id) ? "arriving" : undefined}
              hue={colors.get(o.id)}
            />
          ))}
          {ghosts.map((g) => (
            <OrbView
              key={`ghost-${g.orb.id}`}
              orb={g.orb}
              pos={g.pos}
              now={serverNow}
              mine={g.mine}
              nearby={false}
              watchers={0}
              onOpen={() => {}}
              phase="burning"
              hue={g.hue}
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
            <button className="lnk" onClick={() => setMenu(true)}>Launch something into orbit</button>
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
          <div className="legal">
            <span>Files are end-to-end encrypted. Max 2 GB each. 30 uploads per network per hour.</span>
            <span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · Abuse? Open the object and tap ⚑ Report</span>
          </div>
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

      <input
        ref={folderInput}
        type="file"
        hidden
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => {
          const folder = folderFromInput(Array.from(e.target.files ?? []));
          if (folder?.entries.length) setPanel({ kind: "send", files: [], folder });
          e.target.value = "";
        }}
      />

      <div className={`dropzone${dragging ? " on" : ""}`} aria-hidden>
        <div className="frame" />
        <div className="wide">Release<br />to launch</div>
      </div>

      {panel?.kind === "compose" && (
        <ComposePanel onClose={() => setPanel(null)} onReady={(file) => setPanel({ kind: "send", files: [file] })} />
      )}
      {panel?.kind === "send" && (
        <SendPanel
          files={panel.files}
          folder={panel.folder}
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
          className={`send-fab lg lg-press${menu ? " open" : ""}`}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setCardOrigin(r.left + r.width / 2, r.top + r.height / 2);
            setMenu((m) => !m);
          }}
          aria-label="Send something"
          aria-expanded={menu}
        >
          <span className="ico">↑</span>
          <span>Send<small>files · folders · links</small></span>
        </button>
      )}

      {menu && !panel && (
        <>
          <div className="menu-scrim" onClick={() => setMenu(false)} />
          <div className="send-menu lg" role="menu">
            <button role="menuitem" className="lg-press" style={{ "--i": 0 } as React.CSSProperties} onClick={pickFiles}><span>⬆</span><b>Files</b><small>photos · videos · docs · anything</small></button>
            <button role="menuitem" className="lg-press" style={{ "--i": 1 } as React.CSSProperties} onClick={pickFolder}><span>▣</span><b>Folder</b><small>whole folder, structure intact</small></button>
            <button role="menuitem" className="lg-press" style={{ "--i": 2 } as React.CSSProperties} onClick={compose}><span>↗</span><b>Text or link</b><small>opens instantly on the other side</small></button>
          </div>
        </>
      )}

      <div className="made">made with <span className="heart">♥</span> by <b>Mohit</b></div>
    </>
  );
}
