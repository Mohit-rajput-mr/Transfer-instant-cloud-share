"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Starfield from "./Starfield";
import Uploader, { Icon } from "./Uploader";
import LiquidGlass from "./LiquidGlass";
import OrbView, { ORB_CAP, inheritSlot, pickHue, layout, type VoidMode } from "./OrbView";
import { ComposePanel, OwnerPanel, SendPanel, UnlockPanel, setCardOrigin, type LaunchJob } from "./Panels";
import LaunchDock, { isPending, pendingId, pendingOrb, type Launch } from "./LaunchDock";
import { launch, type Stage } from "@/lib/transfer";
import { preloadBurn } from "@/lib/burn";
import { folderFromInput, fromDrop, textToFile, type Folder } from "@/lib/bundle";
import { useRouter } from "next/navigation";
import { deviceId, deviceInfo, dropOwnerKey, ownerKey, type Orb } from "@/lib/client";
import { supabase, type RealtimeChannel } from "@/lib/realtime";
import SpacePanel, { SpaceRoom } from "./Spaces";
import { enterSpace as fetchRoom, forget, kickMember, leaveSpace, lastSpace, remember, savedSpaces, setActiveSpace, setCurrent, spaceHeaders, type SpaceInfo, type SpaceSession } from "@/lib/space";

/** Someone else's launch, announced over realtime the moment they press Launch (before it has landed). */
type Incoming = { key: string; by: string | null; life: number; open: boolean; name: string; size: number; files: number; hue: number; createdAt: string; net: string | null; frac: number; seen: number };
const incomingId = (k: string) => `in-${k}`;
const isIncoming = (id: string) => id.startsWith("in-");
// a launch that stops announcing itself (tab closed, network gone) fades out after this
const INCOMING_TTL = 20_000;
const INCOMING_MAX = 8;
const validKey = (k: unknown): k is string => typeof k === "string" && /^[a-z0-9]{1,16}$/.test(k);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

function incomingOrb(i: Incoming): Orb {
  return {
    id: incomingId(i.key), name: i.name, fileName: i.name, mime: "application/octet-stream", size: i.size,
    salt: "", iterations: 0, hue: i.hue, status: "ready", netHash: i.net, maxDownloads: null, by: i.by,
    downloads: 0, devices: 0, views: 0, createdAt: i.createdAt, life: i.life, open: i.open,
    expiresAt: new Date(new Date(i.createdAt).getTime() + i.life * 60_000).toISOString(),
  };
}

type Panel =
  | { kind: "send"; files: File[]; folder?: Folder | null }
  | { kind: "compose" }
  | { kind: "unlock"; id: string }
  | { kind: "owner"; id: string }
  | { kind: "space"; start?: string }
  | null;

export default function Void() {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const orbsRef = useRef(orbs);
  orbsRef.current = orbs;
  const [loaded, setLoaded] = useState(false);
  const [net, setNet] = useState<string | null>(null);
  const netRef = useRef(net);
  netRef.current = net;
  const [skew, setSkew] = useState(0);
  const skewRef = useRef(skew);
  skewRef.current = skew;
  const [incoming, setIncoming] = useState<Record<string, Incoming>>({});
  // the space this device is in (null = the public void); restored from IndexedDB before the first load
  const [space, setSpace] = useState<SpaceSession | null>(null);
  const spaceRef = useRef<SpaceSession | null>(null);
  const [spaceReady, setSpaceReady] = useState(false);
  // who is in the space (and who is live right now, via realtime presence on its channel)
  const [room, setRoom] = useState<SpaceInfo | null>(null);
  const [live, setLive] = useState<Set<string>>(new Set());
  const myId = room?.members.find((m) => m.you)?.id ?? null;
  // incoming launch the user tapped: it opens by itself the moment it lands
  const waitFor = useRef<string | null>(null);
  const landedKeys = useRef(new Set<string>());
  const toasted = useRef(new Set<string>());
  const [now, setNow] = useState(() => Date.now());
  const [panel, setPanel] = useState<Panel>(null);
  const [launches, setLaunches] = useState<Launch[]>([]);
  // ids handed over from a stand-in sphere to its real one: no burn-up, no second entrance
  const swapped = useRef(new Set<string>());
  const [scope, setScope] = useState<"all" | "near" | "mine">("all");
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
  const [menuOut, setMenuOut] = useState(false);
  const menuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // the menu flows back into the button before it unmounts
  const closeMenu = useCallback(() => {
    setMenuOut(true);
    if (menuTimer.current) clearTimeout(menuTimer.current);
    menuTimer.current = setTimeout(() => {
      setMenu(false);
      setMenuOut(false);
    }, 200);
  }, []);
  const openMenu = useCallback(() => {
    if (menuTimer.current) clearTimeout(menuTimer.current);
    setMenuOut(false);
    setMenu(true);
  }, []);
  useEffect(() => () => {
    if (menuTimer.current) clearTimeout(menuTimer.current);
  }, []);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      raf = 0;
      setCompact(window.scrollY > 40);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(on);
    };
    on();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  // Layout mode follows the screen: wide sky, tall phone, or a phone on its side.
  const [mode, setMode] = useState<VoidMode>("desk");
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 720px)");
    const short = window.matchMedia("(max-height: 520px) and (orientation: landscape)");
    const tall = window.matchMedia("(min-width: 721px) and (max-width: 1100px) and (orientation: portrait)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const qs = [phone, short, tall, coarse];
    const on = () => {
      // a small phone on its side matches both; the landscape layout (later in the CSS) wins there too
      setMode(short.matches ? "short" : phone.matches ? "phone" : tall.matches ? "tall" : "desk");
      setTouch(coarse.matches);
    };
    on();
    qs.forEach((q) => q.addEventListener("change", on));
    return () => qs.forEach((q) => q.removeEventListener("change", on));
  }, []);
  const me = useRef<string>("");

  const toast = useCallback((text: string) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const recent = useRef(new Map<string, Orb>());
  const removedRef = useRef<(sp: SpaceSession) => void>(() => {});
  // Coalesced fetch: at most one request in flight; bursts of triggers collapse into one follow-up.
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const refresh = useCallback((): Promise<void> => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const run = (async () => {
      const sp = spaceRef.current;
      const r = await fetch(sp ? `/api/spaces/${sp.slug}/transfers` : "/api/transfers", sp ? { headers: spaceHeaders(), cache: "no-store" } : undefined).catch(() => null);
      if (spaceRef.current !== sp) return; // switched while this was in flight
      if (sp && r?.status === 403) return removedRef.current(sp);
      if (!r?.ok) return;
      const d = (await r.json()) as { items: Orb[]; online: number; now: number };
      setSkew(d.now - Date.now());
      // a launch that just landed stays put even if this list was cached a moment before it
      const ids = new Set(d.items.map((o) => o.id));
      const keep = [...recent.current.values()].filter((o) => !ids.has(o.id));
      setOrbs(keep.length ? [...d.items, ...keep] : d.items);
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
  const beam = useCallback((event: "launch" | "landed" | "gone", payload: Record<string, unknown>) => {
    channel.current?.send({ type: "broadcast", event, payload });
  }, []);

  // ---- launches: the card closes on Launch, the ball is in the void at once, a small dock tracks it ----
  const [prog, setProg] = useState<Record<string, { stage: Stage; frac: number }>>({});
  const progQ = useRef<Record<string, { stage: Stage; frac: number }>>({});
  const progT = useRef(0);
  const report = useCallback((key: string, stage: Stage, frac: number) => {
    progQ.current[key] = { stage, frac };
    if (progT.current) return;
    progT.current = window.setTimeout(() => {
      progT.current = 0;
      const q = progQ.current;
      progQ.current = {};
      setProg((p) => ({ ...p, ...q }));
    }, 120);
  }, []);
  const startLaunch = useCallback((job: LaunchJob) => {
    const key = Math.random().toString(36).slice(2, 10);
    const l: Launch = {
      key, name: job.name, size: job.file.size, files: job.files, hue: pickHue(orbsRef.current.map((o) => o.hue)),
      createdAt: new Date(Date.now() + skew).toISOString(), stage: "deriving", frac: 0, abort: new AbortController(), open: false,
      life: job.life,
      free: job.open,
    };
    setLaunches((ls) => [...ls, l]);
    setPanel(null);
    // Every other open tab sees the ball right now, and watches it fill up, instead of after the upload.
    const info = { k: key, name: l.name, size: l.size, files: l.files, hue: l.hue, at: l.createdAt, life: job.life, o: job.open };
    let frac = 0;
    let beamed = 0;
    const announce = () => {
      beamed = Date.now();
      beam("launch", { ...info, net: netRef.current, f: frac, by: spaceRef.current?.handle ?? null });
    };
    announce();
    const keepAlive = setInterval(announce, 4000);
    const onProgress = (st: Stage, f: number) => {
      report(key, st, f);
      frac = st === "uploading" ? f : st === "finalizing" || st === "done" ? 1 : 0;
      if (Date.now() - beamed > 500) announce();
    };
    launch({ file: job.file, name: job.name, passcode: job.passcode, maxDownloads: job.maxDownloads, life: job.life, open: job.open, hue: l.hue, signal: l.abort.signal, onProgress })
      .then((orb) => {
        clearInterval(keepAlive);
        beam("landed", { k: key, id: orb.id });
        const from = pendingId(key);
        inheritSlot(from, orb.id);
        swapped.current.add(from).add(orb.id);
        setTimeout(() => (swapped.current.delete(from), swapped.current.delete(orb.id)), 5000);
        recent.current.set(orb.id, orb);
        setTimeout(() => recent.current.delete(orb.id), 20_000);
        setOrbs((list) => (list.some((o) => o.id === orb.id) ? list : [...list, orb]));
        setLaunches((ls) => ls.map((x) => (x.key === key ? { ...x, orb } : x)));
        refresh();
        broadcast();
      })
      .catch((e: unknown) => {
        clearInterval(keepAlive);
        beam("gone", { k: key });
        if (l.abort.signal.aborted) return setLaunches((ls) => ls.filter((x) => x.key !== key));
        setLaunches((ls) => ls.map((x) => (x.key === key ? { ...x, err: e instanceof Error ? e.message : "Launch failed" } : x)));
      });
    // refresh/broadcast/report are stable; skew only nudges the stand-in's clock
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skew]);
  const dockLaunches = useMemo(() => launches.map((l) => (prog[l.key] && !l.orb ? { ...l, ...prog[l.key] } : l)), [launches, prog]);

  useEffect(() => preloadBurn(), []);

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // initial load, polling fallback, deep link
  useEffect(() => {
    if (!spaceReady) return;
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
  }, [refresh, spaceReady]);

  // back into the space this device was last in (no setup twice), and ?space= invite links
  useEffect(() => {
    (async () => {
      const slug = await lastSpace().catch(() => null);
      const s = slug ? (await savedSpaces().catch(() => [])).find((x) => x.slug === slug) ?? null : null;
      if (s) {
        setActiveSpace(s);
        spaceRef.current = s;
        setSpace(s);
      }
      setSpaceReady(true);
      const inv = new URLSearchParams(window.location.search).get("space");
      if (inv && /^[a-z0-9-]{1,32}$/.test(inv) && inv !== s?.slug) setPanel({ kind: "space", start: inv });
    })();
  }, []);

  const switchSpace = useCallback((s: SpaceSession | null) => {
    setActiveSpace(s);
    spaceRef.current = s;
    setSpace(s);
    setCurrent(s ? s.slug : null);
    setOrbs([]);
    setIncoming({});
    recent.current.clear();
    known.current = null;
    setScope("all");
    setLoaded(false);
    refresh();
  }, [refresh]);
  const enterSpace = useCallback((s: SpaceSession) => {
    remember(s);
    switchSpace(s);
    setPanel(null);
    toast(`You are in ${s.title}`);
  }, [switchSpace, toast]);
  removedRef.current = (sp) => {
    forget(sp.slug);
    switchSpace(null);
    toast(`You were removed from ${sp.title}`);
  };

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

  const dropIncoming = useCallback((k: string) => {
    setIncoming((m) => {
      if (!m[k]) return m;
      const next = { ...m };
      delete next[k];
      return next;
    });
  }, []);

  // Someone pressed Launch somewhere: their ball floats here at once and fills up as it uploads.
  const onLaunchBeam = useCallback((p: Record<string, unknown>) => {
    const k = p?.k;
    if (!validKey(k) || landedKeys.current.has(k)) return;
    const name = (typeof p.name === "string" ? p.name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60) : "") || "untitled";
    const serverNow = Date.now() + skewRef.current;
    const at = typeof p.at === "string" ? Date.parse(p.at) : NaN;
    const createdAt = new Date(Number.isFinite(at) && Math.abs(at - serverNow) < 120_000 ? at : serverNow).toISOString();
    const net = typeof p.net === "string" && /^[0-9a-f]{12}$/.test(p.net) ? p.net : null;
    const by = typeof p.by === "string" ? p.by.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24) || null : null;
    const life = [5, 10, 15, 20, 25, 30].includes(Number(p.life)) ? Number(p.life) : 30;
    const item: Incoming = {
      key: k, by, life, open: p.o === true, name, createdAt, net,
      size: Math.round(num(p.size, 0, 4 * 1024 ** 3, 0)),
      files: Math.round(num(p.files, 1, 100_000, 1)),
      hue: Math.round(num(p.hue, 0, 359, 0)),
      frac: num(p.f, 0, 1, 0),
      seen: Date.now(),
    };
    setIncoming((m) => (!m[k] && Object.keys(m).length >= INCOMING_MAX ? m : { ...m, [k]: m[k] ? { ...item, createdAt: m[k].createdAt } : item }));
    if (!toasted.current.has(k)) {
      toasted.current.add(k);
      setTimeout(() => toasted.current.delete(k), 120_000);
      toast(`Incoming: ${name}`);
    }
  }, [toast]);

  // It landed: fetch the real object straight from the server (not the cached list) and swap it in place.
  const onLandedBeam = useCallback(async (p: Record<string, unknown>) => {
    const k = p?.k;
    const id = p?.id;
    if (!validKey(k) || typeof id !== "string" || !/^[a-z0-9]{4,12}$/.test(id)) return;
    landedKeys.current.add(k);
    setTimeout(() => landedKeys.current.delete(k), 60_000);
    let orb: Orb | null = null;
    for (let a = 0; a < 3 && !orb; a++) {
      if (a) await new Promise((r) => setTimeout(r, 500 * a));
      const r = await fetch(`/api/transfers/${id}`, { headers: spaceHeaders() }).catch(() => null);
      if (r?.ok) orb = (await r.json().catch(() => null)) as Orb | null;
      else if (r?.status === 404) break;
    }
    const from = incomingId(k);
    if (orb) {
      const got = orb;
      inheritSlot(from, got.id);
      swapped.current.add(from).add(got.id);
      setTimeout(() => (swapped.current.delete(from), swapped.current.delete(got.id)), 5000);
      recent.current.set(got.id, got);
      setTimeout(() => recent.current.delete(got.id), 20_000);
      known.current?.add(got.id);
      setOrbs((list) => (list.some((o) => o.id === got.id) ? list : [...list, got]));
    }
    dropIncoming(k);
    if (waitFor.current === k) {
      waitFor.current = null;
      if (orb) {
        const got = orb;
        setPanel((cur) => cur ?? { kind: "unlock", id: got.id });
      }
    }
    if (!orb) refresh();
  }, [dropIncoming, refresh]);

  const onGoneBeam = useCallback((p: Record<string, unknown>) => {
    const k = p?.k;
    if (!validKey(k)) return;
    dropIncoming(k);
    if (waitFor.current === k) {
      waitFor.current = null;
      toast("That launch was cancelled");
    }
  }, [dropIncoming, toast]);

  // a launch whose sender went quiet (closed the tab mid-upload) does not float forever
  useEffect(() => {
    const t = setInterval(() => {
      const cut = Date.now() - INCOMING_TTL;
      setIncoming((m) => {
        const stale = Object.values(m).filter((i) => i.seen < cut).map((i) => i.key);
        if (!stale.length) return m;
        const next = { ...m };
        for (const k of stale) delete next[k];
        if (waitFor.current && stale.includes(waitFor.current)) waitFor.current = null;
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const beams = useRef({ launch: onLaunchBeam, landed: onLandedBeam, gone: onGoneBeam });
  beams.current = { launch: onLaunchBeam, landed: onLandedBeam, gone: onGoneBeam };

  const chanName = space ? `orbit-s-${space.chan}` : "orbit-void";
  const myIdRef = useRef<string | null>(null);
  useEffect(() => {
    myIdRef.current = myId;
    if (myId && spaceRef.current && channel.current) channel.current.track({ id: myId }).catch(() => {});
  }, [myId]);
  // the member list: on entering, every 15 s, and right after someone is removed
  const loadRoom = useCallback(async () => {
    const sp = spaceRef.current;
    if (!sp) return setRoom(null);
    try {
      const info = await fetchRoom(sp);
      if (spaceRef.current === sp) setRoom(info);
    } catch (e) {
      if ((e as { status?: number }).status === 403 && spaceRef.current === sp) removedRef.current(sp);
    }
  }, []);
  useEffect(() => {
    setRoom(null);
    setLive(new Set());
    if (!space) return;
    loadRoom();
    const t = setInterval(loadRoom, 15_000);
    return () => clearInterval(t);
  }, [space, loadRoom]);
  const kick = useCallback(async (id: string, who: string) => {
    const sp = spaceRef.current;
    if (!sp) return;
    try {
      await kickMember(sp, id);
      toast(`${who} was removed`);
      loadRoom();
    } catch (e) {
      toast((e as Error).message);
    }
  }, [loadRoom, toast]);
  // realtime broadcast only (no presence): constant cost per message, scales with Supabase's fan-out
  useEffect(() => {
    const ch = supabase.channel(chanName, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "pulse" }, () => {
      scheduleRefresh();
      setPulse((p) => p + 1);
    });
    ch.on("broadcast", { event: "launch" }, ({ payload }) => beams.current.launch(payload ?? {}));
    ch.on("broadcast", { event: "landed" }, ({ payload }) => void beams.current.landed(payload ?? {}));
    ch.on("broadcast", { event: "gone" }, ({ payload }) => beams.current.gone(payload ?? {}));
    if (spaceRef.current) {
      ch.on("presence", { event: "sync" }, () => {
        const ids = new Set<string>();
        for (const list of Object.values(ch.presenceState())) for (const p of list as { id?: string }[]) if (p.id) ids.add(p.id);
        setLive(ids);
      });
    }
    ch.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      channel.current = ch;
      if (spaceRef.current && myIdRef.current) ch.track({ id: myIdRef.current }).catch(() => {});
    });
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [scheduleRefresh, chanName]);

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

  // The open card's object, kept after it leaves the list (expired, or destroyed by the sender right after
  // "downloaded"): the card, and a phone's decrypted, still-unsaved file in it, stay until the user closes it.
  const keptUnlock = useRef<Orb | null>(null);

  // fetch an object opened by link that is not in the list yet
  const openId = panel?.kind === "unlock" ? panel.id : null;
  useEffect(() => {
    if (!openId || orbs.some((o) => o.id === openId)) return setExtra(null);
    fetch(`/api/transfers/${openId}`, { headers: spaceHeaders() })
      .then(async (r) => {
        if (r.ok) return setExtra(await r.json());
        setExtra(null);
        if (keptUnlock.current?.id === openId) return; // gone while its card is open: only an unknown link closes
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
  // Short-lived objects of yours: the server already hides and refuses them on time; this device also
  // deletes the stored ciphertext the moment it burns, so nothing outlives the lifetime the sender picked.
  const purged = useRef(new Set<string>());
  useEffect(() => {
    for (const o of orbs) {
      if ((o.life ?? 30) >= 30 || purged.current.has(o.id) || new Date(o.expiresAt).getTime() > serverNow) continue;
      const key = ownerKey(o.id);
      if (!key) continue;
      purged.current.add(o.id);
      fetch(`/api/transfers/${o.id}`, { method: "DELETE", headers: { "x-owner": key } }).finally(() => dropOwnerKey(o.id));
    }
  }, [orbs, serverNow]);
  // Membership only changes when something launches or expires, not on every clock tick, so the
  // layout / colour / choreography work below runs on change instead of every second.
  const aliveKey = useMemo(() => orbs.filter((o) => new Date(o.expiresAt).getTime() > serverNow).map((o) => o.id).join(","), [orbs, serverNow]);
  const alive = useMemo(() => {
    const ids = new Set(aliveKey.split(","));
    return orbs.filter((o) => ids.has(o.id));
  }, [orbs, aliveKey]);
  // launches in flight already float as stand-in spheres; the real one takes their place on landing
  const pending = useMemo(() => launches.filter((l) => !l.orb && !l.err).map(pendingOrb), [launches]);
  // other people's launches still on their way up
  const arrivingOrbs = useMemo(() => Object.values(incoming).map(incomingOrb), [incoming]);
  const shown = useMemo(
    () => [
      ...alive.filter((o) => scope === "all" || (scope === "near" ? o.netHash === net || !!ownerKey(o.id) : !!ownerKey(o.id))),
      ...pending,
      ...(scope === "mine" ? [] : arrivingOrbs.filter((o) => scope === "all" || (!!net && o.netHash === net))),
    ],
    [alive, scope, net, pending, arrivingOrbs],
  );
  // Your balls are numbered 1..N in launch order, on the ball and on its dock row, so you can count yours at a glance.
  const badges = useMemo(() => {
    const launchedAt = new Map(launches.filter((l) => l.orb).map((l) => [l.orb!.id, l.createdAt]));
    const at = (o: Orb) => launchedAt.get(o.id) ?? o.createdAt;
    const mine = [...alive.filter((o) => !!ownerKey(o.id)), ...pending].sort((a, b) => at(a).localeCompare(at(b)));
    return new Map(mine.map((o, i) => [o.id, i + 1]));
  }, [alive, pending, launches]);
  const upFrac = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of dockLaunches) if (!l.orb && !l.err) m.set(pendingId(l.key), l.stage === "uploading" ? l.frac : l.stage === "finalizing" ? 1 : 0);
    for (const i of Object.values(incoming)) m.set(incomingId(i.key), i.frac);
    return m;
  }, [dockLaunches, incoming]);
  // The void can only hold so many spheres (fewer on a phone); keep yours, then nearby, then the newest.
  const cap = ORB_CAP[mode];
  const visible = useMemo(() => {
    if (shown.length <= cap) return shown;
    const rank = (o: Orb) => (ownerKey(o.id) || isPending(o.id) ? 2 : 0) + (o.netHash === net ? 1 : 0);
    return [...shown].sort((a, b) => rank(b) - rank(a) || b.createdAt.localeCompare(a.createdAt)).slice(0, cap);
  }, [shown, net, cap]);
  const positions = useMemo(() => layout(visible, mode), [visible, mode]);
  // a ball is the same colour on every device: the hue stored with it, never a local re-shuffle
  const colors = useMemo(() => new Map(visible.map((o) => [o.id, ((o.hue % 360) + 360) % 360])), [visible]);

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
      const fresh = visible.filter((o) => !p.ids.has(o.id) && !swapped.current.has(o.id)).map((o) => o.id);
      if (fresh.length) {
        setArriving((a) => new Set([...a, ...fresh]));
        setTimeout(() => setArriving((a) => new Set([...a].filter((id) => !fresh.includes(id)))), 2600);
      }
      const gone = [...p.ids].filter((id) => !ids.has(id) && !aliveIds.has(id) && !swapped.current.has(id));
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
  const mineCount = badges.size;
  useEffect(() => {
    if (scope === "mine" && !mineCount) setScope("all");
  }, [scope, mineCount]);

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
    if (menu) closeMenu();
    fileInput.current?.click();
  };
  const pickFolder = () => {
    if (menu) closeMenu();
    folderInput.current?.click();
  };
  const compose = () => {
    setMenu(false);
    setMenuOut(false);
    setPanel({ kind: "compose" });
  };

  const open = useCallback((o: Orb) => {
    if (isIncoming(o.id)) {
      waitFor.current = o.id.slice(3);
      return toast(`${o.name} is still launching. It opens here the moment it lands`);
    }
    if (isPending(o.id)) return setLaunches((ls) => ls.map((l) => (pendingId(l.key) === o.id ? { ...l, open: true } : l)));
    setPanel(ownerKey(o.id) ? { kind: "owner", id: o.id } : { kind: "unlock", id: o.id });
  }, [toast]);
  const noop = useCallback(() => {}, []);
  const listedUnlock = panel?.kind === "unlock" ? orbs.find((o) => o.id === panel.id) ?? extra : null;
  if (listedUnlock) keptUnlock.current = listedUnlock;
  else if (panel?.kind !== "unlock") keptUnlock.current = null;
  const unlockOrb = listedUnlock ?? (panel?.kind === "unlock" && keptUnlock.current?.id === panel.id ? keptUnlock.current : null);
  // Phones stack the spheres in rows (see layout()); the void is as tall as its rows, including a
  // sphere that is still burning up in the last one.
  const flow = mode !== "desk" && (visible.length > 0 || ghosts.length > 0);
  const lastRow = flow ? Math.max(0, ...[...positions.values()].map((p) => p.y)) : 0;
  const rows = flow ? Math.max(lastRow + 1, ...ghosts.map((g) => Math.min(g.pos.y + 1, lastRow + 3))) : 1;

  return (
    <>
      <Starfield />
      <LiquidGlass />

      <header className={`top lg${compact ? " compact" : ""}`}>
        <div className="top-row">
          <div className="brand" onClick={tapLogo} role="presentation">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/logo.svg" alt="ORBITRANSFER" width={180} height={24} draggable={false} />
            <span className="brand-by">Instant transfer</span>
          </div>
          <nav className="nav">
            <a href="#void">Void</a>
            <a href="#how">How it works</a>
            <button onClick={openMenu}>Launch</button>
          </nav>
          <div className="top-right">
            <span className="live" aria-label={`${online} ${online > 1 ? "devices" : "device"} in orbit`}><span className="dot" /><b>{online}</b><span className="live-txt">{space ? "in this space" : online > 1 ? "devices in orbit" : "device in orbit"}</span></span>
            <button className={`pill lg-press space-chip${space ? " in" : ""}`} onClick={() => setPanel({ kind: "space" })} aria-label={space ? `Space: ${space.title}. Change space` : "Public void. Open spaces"}>
              <i className="space-dot" />{space ? space.title : "Public void"}
            </button>
            <button className="pill solid lg-press send-pill" onClick={openMenu}>Send</button>
          </div>
        </div>
        <div className="top-row">
          <div className="sub-left">
            <span className="hl"><i />No login</span><span>End-to-end encrypted</span><span>Any size</span><span>Burns in 5–30 min</span>
          </div>
          <span />
          <div className="toggle" role="tablist" aria-label="Scope">
            <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>All</button>
            {!space && <button className={scope === "near" ? "on" : ""} onClick={() => setScope("near")}>Nearby{nearbyCount ? ` ${nearbyCount}` : ""}</button>}
            {mineCount > 0 && (
              <button className={`mine-tab${scope === "mine" ? " on" : ""}`} onClick={() => setScope(scope === "mine" ? "all" : "mine")} aria-label={`Show only your ${mineCount} ${mineCount > 1 ? "objects" : "object"}`}>
                Mine <b>{mineCount}</b>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={menu && !menuOut ? "menu-open" : undefined}>
        <section
          className={`void${space ? " in-space" : ""}${flow ? " flow" : ""}${mode !== "desk" && mode !== "tall" && visible.length > 6 ? " many" : ""}`}
          id="void"
          style={flow ? ({ "--n": rows } as React.CSSProperties) : undefined}
        >
          {space && <SpaceRoom space={space} info={room} online={live} onKick={kick} onExit={() => {
            switchSpace(null);
            toast("Back in the public void");
          }} />}
          <div className="ghost-type" aria-hidden>
            <span className="wide">Drop</span>
            <span className="wide">Lock</span>
            <span className="wide">Beam</span>
            <span className="wide">Burn.</span>
            <p className="mono">Anything dropped here floats in the void, encrypted, until it burns up. No accounts. No traces.</p>
          </div>
          <div className="ghost-big" aria-hidden>
            <div className="wide">30 Min</div>
            <p className="mono">Longest life of any object.<br />The sender picks 5 to 30.</p>
          </div>

          {loaded && shown.length === 0 && (
            <div className="empty">
              <p className="mono">
                {space ? `${space.title} is empty. Launch something: only people in this space see it` : scope === "near" ? "Nothing from your network yet" : (
                  <>
                    <span className="on-fine">The void is empty. Drop files, folders or text anywhere</span>
                    <span className="on-touch">The void is empty. Tap upload to launch photos, videos, files or text</span>
                  </>
                )}
                <span className="cursor" />
              </p>
              <Uploader onFiles={pickFiles} onFolder={pickFolder} onText={compose} folderSub={touch ? "a folder, or many files at once" : undefined} />
            </div>
          )}

          {visible.map((o, i) => (
            <OrbView
              key={o.id}
              orb={o}
              index={i}
              pos={positions.get(o.id)!}
              now={serverNow}
              mine={!!ownerKey(o.id) || isPending(o.id)}
              nearby={!!net && o.netHash === net}
              watchers={watchers(o.id)}
              onOpen={open}
              phase={arriving.has(o.id) ? "arriving" : undefined}
              hue={colors.get(o.id)}
              launching={upFrac.get(o.id)}
              incoming={isIncoming(o.id)}
              badge={badges.get(o.id)}
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
              onOpen={noop}
              phase="burning"
              hue={g.hue}
            />
          ))}
        </section>

        <section className="how" id="how">
          <div className="how-top"><span>Protocol</span><span>Objects in orbit right now</span></div>
          <div className="how-hero">
            <span className="wide">Orbit</span>
            <span className="wide count num">{alive.length}</span>
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
            <button className="lnk" onClick={openMenu}>Launch something into orbit</button>
          </div>
          <p className="how-sub">The four phases</p>
          <div className="table-head"><span>Phase</span><span>Codename</span><span>What happens</span><span style={{ textAlign: "right" }}>Step</span></div>
          {[
            ["Upload", "Drop", "Drag any file onto the page, or paste it. Name it whatever you like. It becomes an object drifting in the void."],
            ["Encrypt", "Lock", "Send it open (one tap for anyone) or with a passcode. Either way it is chunk-encrypted with AES-256-GCM inside your browser."],
            ["Receive", "Beam", "Open ORBIT on the other device. Tap the object, enter the passcode, and it decrypts and lands. Live stats show who is accessing it."],
            ["Destroy", "Burn", "After the lifetime the sender picked (5 to 30 minutes), after N downloads, or the moment the sender hits destroy, it is erased for good."],
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
        multiple
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          const folder = folderFromInput(files);
          if (folder?.entries.length) setPanel({ kind: "send", files: [], folder });
          // phones ignore webkitdirectory and hand back plain picks: send those as files instead of nothing
          else if (files.length) setPanel({ kind: "send", files });
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
      {panel?.kind === "space" && (
        <SpacePanel
          current={space}
          info={room}
          start={panel.start}
          onEnter={enterSpace}
          onLeave={() => {
            switchSpace(null);
            setPanel(null);
            toast("Back in the public void");
          }}
          onQuit={() => {
            const sp = spaceRef.current;
            if (sp) {
              leaveSpace(sp);
              forget(sp.slug);
              toast(`You left ${sp.title}`);
            }
            switchSpace(null);
            setPanel(null);
          }}
          onClose={() => setPanel(null)}
          toast={toast}
        />
      )}
      {panel?.kind === "send" && (
        <SendPanel
          files={panel.files}
          folder={panel.folder}
          onClose={() => setPanel(null)}
          onLaunch={startLaunch}
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
          className={`send-fab lg lg-press${menu && !menuOut ? " open" : ""}${compact && !menu ? " mini" : ""}`}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setCardOrigin(r.left + r.width / 2, r.top + r.height / 2);
            if (menu && !menuOut) closeMenu();
            else openMenu();
          }}
          aria-label={menu && !menuOut ? "Close send menu" : "Send something"}
          aria-expanded={menu && !menuOut}
        >
          <span className="ico"><span className="i-up">{Icon.up}</span><span className="i-x">{Icon.close}</span></span>
          <span className="fab-label">Send<small>files · folders · links</small></span>
        </button>
      )}

      {menu && !panel && (
        <>
          <div className={`menu-scrim${menuOut ? " out" : ""}`} onClick={closeMenu} />
          <div className={`send-menu bubbles${menuOut ? " out" : ""}`} role="menu">
            <button role="menuitem" className="bubble-btn lg lg-press" style={{ "--i": 0 } as React.CSSProperties} onClick={pickFiles}><span>{Icon.file}</span><b>Files</b><small>photos · videos · docs · anything</small></button>
            <button role="menuitem" className="bubble-btn lg lg-press" style={{ "--i": 1 } as React.CSSProperties} onClick={pickFolder}><span>{Icon.folder}</span><b>Folder</b><small>{touch ? "a folder, or many files at once" : "whole folder, structure intact"}</small></button>
            <button role="menuitem" className="bubble-btn lg lg-press" style={{ "--i": 2 } as React.CSSProperties} onClick={compose}><span>{Icon.link}</span><b>Text or link</b><small>opens instantly on the other side</small></button>
          </div>
        </>
      )}

      <LaunchDock
        launches={dockLaunches}
        badges={badges}
        onToggle={(key) => setLaunches((ls) => ls.map((l) => (l.key === key ? { ...l, open: !l.open } : l)))}
        onDismiss={(key) => setLaunches((ls) => ls.filter((l) => l.key !== key))}
        onOpenOwner={(id) => setPanel({ kind: "owner", id })}
      />
    </>
  );
}
