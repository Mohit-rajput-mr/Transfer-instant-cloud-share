"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Starfield from "./Starfield";
import Uploader, { Icon } from "./Uploader";
import LiquidGlass from "./LiquidGlass";
import OrbView, { ORB_CAP, bubbleLayout, inheritSlot, pickHue, layout, type VoidMode } from "./OrbView";
import MapWorld, { type Band } from "./MapWorld";
import { pin, place, worldSize, type Thing } from "@/lib/map";
import { ComposePanel, GroupPanel, OwnerPanel, SendPanel, UnlockPanel, setCardOrigin, type LaunchJob } from "./Panels";
import LaunchDock, { isPending, pendingId, pendingOrb, type Launch } from "./LaunchDock";
import { launch, type Stage } from "@/lib/transfer";
import { folderFromInput, fromDrop, textToFile, type Item } from "@/lib/bundle";
import { useRouter } from "next/navigation";
import { deviceId, deviceInfo, dropOwnerKey, hasGot, ownerKey, homePath, persistentId, type Orb } from "@/lib/client";
import { aliasOf, anonId, anonSeen, anonSession, anonSwitch, isAnon, lastMinutes, markAnonSeen, setAnon, useAnon } from "@/lib/anon";
import { genericFileName, scrubItems } from "@/lib/scrub";
import AnonCard, { type AnonMode } from "./AnonCard";
import { supabase, type RealtimeChannel } from "@/lib/realtime";
import SpacePanel, { SpaceRoom } from "./Spaces";
import BubbleZoom from "./BubbleZoom";
import { heldIds, release as releaseP2P } from "@/lib/p2p";
import { cloudSaved, cloudSaving, isResumable, stopCopy } from "@/lib/cloud";
import { replaceUrl, switchView } from "@/lib/view";
// a ball leaving: stop offering it directly and stop any upload of its stored copy
const release = (id: string) => {
  releaseP2P(id);
  stopCopy(id);
};
import { downloading } from "@/lib/downloads";
import { warm } from "@/lib/peek";
import { anonLink, anonTitle, createAnonSpace, createSpace, joinAnonSpace, joinSpace, enterSpace as fetchRoom, forget, kickMember, leaveSpace, lastSpace, remember, savedSpaces, setActiveSpace, setCurrent, spaceHeaders, type SpaceInfo, type SpaceSession } from "@/lib/space";
import { BsIncognito } from "react-icons/bs";
import AnonSeal from "./AnonSeal";
import KnockBell from "./KnockBell";
import { LuFlag, LuMessageCircle, LuMapPin, LuMapPinOff, LuMenu, LuPalette, LuSearch, LuPlus, LuX, LuArrowUpDown, LuRocket } from "react-icons/lu";
import MobileMenu from "./MobileMenu";
import BubbleBoard, { BubbleCompose, BubbleSpace, useStacks, type BubbleChange } from "./BubbleBoard";
import TaskBoard, { TaskWires, taskGroups } from "./TaskBoard";
import { addTask, assignTask, burnTask, carryTasks, wireObject, editTask, isMyTask, moveTask, openInvite, parseTask, sealInvite, stageName, taskLabel, taskLine, tickTask, type Task } from "@/lib/tasks";
import { cleanOrb, ORB_ID, readSync, type SyncMsg } from "@/lib/sync";
import { joinLive, liveOn, roomsFor, type Chan, type Live } from "@/lib/live";
import { around } from "@/lib/area";
import { anonCellNow, asked, dropGps, fixNow, follow, forgetFix, fromIp, locate, markAsked, markSent, permission, pickArea, setAnonCell, where } from "@/lib/where";
import LocationAsk, { LocationBlocked } from "./LocationAsk";
import { ArchiveRestore, ArchiveRoom, TrashZone } from "./Trash";
import { trashedAt, trashLabel, useTrash } from "@/lib/trash";
import TaskThrow, { type Grab } from "./TaskThrow";
import dynamic from "next/dynamic";
import { perf } from "@/lib/perf";
import type { Rect } from "./MapWorld";
// the globe (MapLibre) loads only when someone goes up to it
const EarthView = dynamic(() => import("./EarthView"), { ssr: false, loading: () => <div className="earth-view earth-load"><span className="mono">Going up…</span></div> });
import { GoPrivate, InviteCard } from "./TeamMove";
import { bubbleName, burnBubble, editBubble, hueFor, isMine as isMyBubble, postBubble, senderOf, type Bubble } from "@/lib/bubbles";
import StylePicker from "./StylePicker";
import { autoRemember, findDeviceSkin, forgetDeviceLook, pickedPalette, pickedSkin, skinName, toneOf, useLook } from "@/lib/skins";
import { fileKind, type Kind } from "@/lib/skin-list";
import { WorkBar, WorkDock, WorkRail } from "./WorkChrome";
import KindFilter from "./KindFilter";

/** a task with a change applied the way the server will (so the screen updates before it answers) */
function applyEdit(t: Task, c: { text?: string; route?: string[]; stage?: number }, by: string): Task {
  const route = c.route ?? t.route;
  const last = route.length - 1;
  const stage = Math.min(c.stage ?? t.stage, last);
  const now = new Date().toISOString();
  const done = stage >= 2 && stage === last ? t.doneAt ?? now : c.stage !== undefined ? null : t.doneAt;
  return {
    ...t,
    text: c.text?.trim() || t.text,
    editedAt: c.text && c.text.trim() !== t.text ? now : t.editedAt,
    route,
    stage,
    log: stage !== t.stage && stage >= 0 ? [...t.log, { i: stage, name: route[stage], by: by || null, at: now }] : t.log,
    doneAt: done,
    doneBy: done ? t.doneBy ?? (by || null) : null,
  };
}

/** A live change (lib/sync.ts): the record as it is now (null: gone), stamped with when it happened (server clock). */
type Mark = { at: number; rec: { id: string } | null };
// a list made up to this long after a change may still predate it (clocks are never exactly in step)
const MARK_SLACK = 1500;
/** The shared list as of `made`, with every change made after it laid on top: nothing burned comes back, nothing new blinks out. */
function overlay<T extends { id: string }>(list: T[], kind: "b" | "t" | "o", made: number, marks: Map<string, Mark>) {
  let stale = false;
  const live = (id: string) => {
    const m = marks.get(`${kind}:${id}`);
    return m && made < m.at + MARK_SLACK ? m : null;
  };
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    seen.add(x.id);
    const m = live(x.id);
    if (!m) out.push(x);
    else {
      stale = true;
      if (m.rec) out.push(m.rec as T);
    }
  }
  for (const [k, m] of marks) {
    if (!m.rec || !k.startsWith(`${kind}:`) || seen.has(m.rec.id) || made >= m.at + MARK_SLACK) continue;
    stale = true;
    out.push(m.rec as T);
  }
  return { list: out, stale };
}
const upsert = <T extends { id: string }>(list: T[], x: T) => (list.some((y) => y.id === x.id) ? list.map((y) => (y.id === x.id ? x : y)) : [x, ...list]);
const iso = (ms: number) => new Date(ms).toISOString();

/** Someone else's launch, announced over realtime the moment they press Launch (before it has landed). `a`: the area
 *  it was announced from (public void) */
type Incoming = { key: string; by: string | null; life: number; open: boolean; name: string; size: number; files: number; hue: number; createdAt: string; net: string | null; frac: number; seen: number; a: string | null };
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

// ---- the live line, kept at module level: a launch outlives the Void that started it (About and back), and still
// announces itself and lands through whichever Void is up by then ----
type Line = { chan: Chan | RealtimeChannel; place: string };
let line: Line | null = null;
// said with no line up for its place (the first moments after load, between two Voids, a space just walked into or
// out of): goes out once there is one, if still fresh. Never into another place's room
let unsaid: { e: string; p: Record<string, unknown>; place: string; at: number }[] = [];
const UNSAID_TTL = 60_000;
/** say something where it belongs: `place` is the space's slug, "" for the public void */
function say(e: string, p: Record<string, unknown>, place: string, at = Date.now()) {
  // anonymous: nothing is said in the public void's rooms (only inside an anonymous space)
  if (isAnon() && !place) return;
  // same Wi-Fi, other area: the network's own room hears objects launched into the public void too
  if (!place && netLine && (e === "launch" || e === "landed" || e === "gone")) netLine.send({ type: "broadcast", event: e, payload: p });
  if (line?.place === place) return void line.chan.send({ type: "broadcast", event: e, payload: p });
  // (launches are announced afresh as soon as a line is up)
  if (e !== "launch") unsaid = [...unsaid.filter((x) => Date.now() - x.at < UNSAID_TTL).slice(-49), { e, p, place, at }];
}
// the live room of this device's own network (public void only; Nearby across areas)
let netLine: Chan | RealtimeChannel | null = null;
const setNetLine = (c: Chan | RealtimeChannel | null) => void (netLine = c);
function setLine(l: Line | null) {
  line = l;
  if (!l) return;
  const n = Date.now(), go = unsaid.filter((x) => x.place === l.place && n - x.at < UNSAID_TTL);
  unsaid = unsaid.filter((x) => x.place !== l.place);
  for (const x of go) say(x.e, x.p, x.place, x.at);
  if (flying.size) flyAt(n);
}
// This page's launches in flight, all in one "launch" message: at once for a new one (a "Separate" send of twelve is
// one message), progress at most every 2 s, else every 6 s (a receiver forgets a launch that is quiet for 20 s).
const FLY_PROGRESS = 2000, FLY_KEEP = 6000, FLY_PER_MSG = 20;
const flying = new Map<string, { info: Record<string, unknown>; place: string }>();
let flyT: ReturnType<typeof setTimeout> | undefined;
let flyDue = 0, flyLast = 0, flyTurn = 0;
function flyAt(at: number) {
  if (flyT !== undefined && flyDue <= at) return;
  clearTimeout(flyT);
  flyDue = at;
  flyT = setTimeout(sayFlying, Math.max(0, at - Date.now()));
}
function sayFlying() {
  flyT = undefined;
  flyLast = Date.now();
  const turn = flyTurn++;
  const by = new Map<string, Record<string, unknown>[]>();
  for (const x of flying.values()) by.set(x.place, [...(by.get(x.place) ?? []), x.info]);
  for (const [place, all] of by)
    for (let i = 0; i < all.length; i += FLY_PER_MSG) {
      const ls = all.slice(i, i + FLY_PER_MSG);
      // pages from before batching read only the top-level fields: one launch for them, a different one each time
      say("launch", ls.length > 1 ? { ...ls[turn % ls.length], ls, b: i / FLY_PER_MSG } : ls[0], place);
    }
  if (flying.size) flyAt(Date.now() + FLY_KEEP);
}
function flyStart(k: string, info: Record<string, unknown>, place: string) {
  flying.set(k, { info: { ...info, k }, place });
  flyAt(Date.now());
}
function flyUpdate(k: string, patch: Record<string, unknown>) {
  const x = flying.get(k);
  if (!x || Object.entries(patch).every(([f, v]) => x.info[f] === v)) return;
  x.info = { ...x.info, ...patch };
  flyAt(flyLast + FLY_PROGRESS);
}
function flyEnd(k: string) {
  flying.delete(k);
  if (flying.size) return;
  clearTimeout(flyT);
  flyT = undefined;
}
/** the repeats of a landing still to go out, by object id */
const replays = new Map<string, ReturnType<typeof setTimeout>[]>();
/** landed: the record itself goes along (no request on the other side), and is said twice more in case a line
 *  blinked right then (receivers take it once). The record only ever goes into its own place's room. */
function sayLanded(k: string, orb: Orb, place: string) {
  flyEnd(k);
  const o = (orb.space ?? "") === place ? orb : undefined;
  say("landed", { k, id: orb.id, o }, place);
  if (!o) return;
  // the repeats carry no top-level id: pages from before the record rode along fetch each landed by its id (an
  // uncached request and a database read each), so they hear only the first
  const again = () => say("landed", { k, o }, place);
  replays.set(orb.id, [setTimeout(again, 2000), setTimeout(() => (again(), replays.delete(orb.id)), 6000)]);
}
/** destroyed: a repeat still to come would put it back on every screen */
function unsayLanded(ids: string[]) {
  for (const id of ids) {
    replays.get(id)?.forEach(clearTimeout);
    replays.delete(id);
  }
}
/** in flight from this page (the live line is kept while there are any) */
const launching = () => flying.size > 0;

type Panel =
  | { kind: "send"; items: Item[] }
  | { kind: "compose" }
  | { kind: "unlock"; id: string; preview?: boolean }
  | { kind: "owner"; id: string }
  | { kind: "group"; id: string }
  | { kind: "space"; start?: string }
  | { kind: "style" }
  | { kind: "menu" }
  | { kind: "bubble"; edit?: BubbleChange }
  | { kind: "private" }
  // "Stay anonymous" (lib/anon.ts, components/AnonCard.tsx)
  | { kind: "anon"; mode: "intro" | "start" | "on" | "status" }
  | { kind: "anon-gate"; items?: Item[]; note?: boolean; task?: { line: string; life: number } }
  | { kind: "anon-join"; slug: string; code: string; key: string }
  | { kind: "anon-link" }
  | null;

// on the map the header, the send button and the zoom tools cover the screen's edges
const MAP_BAND: Record<VoidMode, Band> = {
  desk: { top: 124, bottom: 118, left: 24, right: 84 },
  tall: { top: 124, bottom: 118, left: 20, right: 72 },
  phone: { top: 70, bottom: 96, left: 10, right: 10 },
  short: { top: 56, bottom: 60, left: 60, right: 60 },
};
// inside a space or the archive (classic look): everything sits within the glass pane, clear of its title
const ROOM_BAND: Record<VoidMode, Band> = {
  desk: { top: 236, bottom: 70, left: 72, right: 112 },
  tall: { top: 236, bottom: 70, left: 56, right: 96 },
  phone: { top: 356, bottom: 34, left: 22, right: 22 },
  short: { top: 172, bottom: 28, left: 40, right: 40 },
};
// the map holds far more than a fixed sky
const MAP_CAP = 160;

// more balls in the void, smaller balls, so they all have room
const crowdScale = (n: number) => (n <= 5 ? 1 : n <= 8 ? 0.86 : n <= 12 ? 0.74 : 0.64);

// One device's objects gather into a single bubble once it has sent more than one.
const GROUP = "g-";
const isGroup = (id: string) => id.startsWith(GROUP);
// a short stable key for a container's name (ids stay plain letters and digits)
const nameKey = (n: string) => {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
function groupOrbs(list: Orb[]) {
  const by = new Map<string, Orb[]>();
  // files wired to a task never fold into a container: each stays its own ball (same colour per sender)
  // a container is one sender's batch under one name: a differently named one stays separate
  const keyOf = (o: Orb) => `${o.from}${o.groupName ? `-${nameKey(o.groupName)}` : ""}`;
  for (const o of list) if (o.from && !o.task) by.set(keyOf(o), [...(by.get(keyOf(o)) ?? []), o]);
  const groups = new Map<string, Orb[]>();
  const out: Orb[] = [];
  for (const o of list) {
    const m = o.from && !o.task ? by.get(keyOf(o))! : null;
    if (!m || m.length < 2) {
      out.push(o);
      continue;
    }
    const id = GROUP + keyOf(o);
    if (groups.has(id)) continue;
    m.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    groups.set(id, m);
    const sum = (k: "size" | "downloads" | "views" | "devices") => m.reduce((a, x) => a + (x[k] ?? 0), 0);
    out.push({
      ...m[0],
      id,
      name: m.find((x) => x.groupName)?.groupName ?? (m[0].by ? `${m[0].by} · ${m.length} items` : `${m.length} items`),
      fileName: `${m.length} items`,
      size: sum("size"),
      downloads: sum("downloads"),
      views: sum("views"),
      devices: sum("devices"),
      watchers: m.reduce((a, x) => a + (x.watchers ?? 0), 0),
      maxDownloads: null,
      status: "ready",
      open: m.every((x) => x.open),
      createdAt: m[0].createdAt,
      expiresAt: m.reduce((a, x) => (x.expiresAt > a ? x.expiresAt : a), m[0].expiresAt),
      life: Math.max(...m.map((x) => x.life ?? 30)),
    });
  }
  return { list: out, groups };
}

/** ui "work": the /work look (same void, calm editor-style look; app/(void)/work/work.css). It can flip while mounted
 *  (VoidShell, lib/view.ts), which also owns html[data-ui] / [data-theme] and the work wording. */
export default function Void({ ui }: { ui?: "work" } = {}) {
  const work = ui === "work";
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const orbsRef = useRef(orbs);
  orbsRef.current = orbs;
  const [loaded, setLoaded] = useState(false);
  const [net, setNet] = useState<string | null>(null);
  const netRef = useRef(net);
  // this network's private invite key (lib/tasks.ts sealInvite): never sent to anyone
  const inviteKeyRef = useRef("");
  netRef.current = net;
  // the area this device is in (lib/area.ts; what it posts goes there) and the area being looked at (the public
  // void shows it and the eight around it). They are the same until you fly somewhere else on the Earth.
  const [home, setHome] = useState("");
  const homeRef = useRef(home);
  homeRef.current = home;
  const [area, setArea] = useState("");
  useEffect(() => setArea(home), [home]);
  // up on the Earth (components/EarthView.tsx)
  const [earth, setEarth] = useState(false);
  const areaRef = useRef(area);
  areaRef.current = area;
  const [gps, setGps] = useState(false);
  const [areaReady, setAreaReady] = useState(false);
  const [geoAsk, setGeoAsk] = useState(false);
  // location refused or failed: how to fix it, or pick the area on the map (null: not shown)
  const [geoFail, setGeoFail] = useState<"denied" | "failed" | null>(null);
  // the "share location / create your space" strip, closed for this visit
  const [pillOff, setPillOffS] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("orbit:pill-off") === "1") setPillOffS(true);
    } catch {}
  }, []);
  const setPillOff = (v: boolean) => {
    setPillOffS(v);
    try {
      sessionStorage.setItem("orbit:pill-off", v ? "1" : "0");
    } catch {}
  };
  // the Earth was opened to pick this device's area by hand
  const [picking, setPicking] = useState(false);
  const [skew, setSkew] = useState(0);
  const skewRef = useRef(skew);
  skewRef.current = skew;
  const [incoming, setIncoming] = useState<Record<string, Incoming>>({});
  // the space this device is in (null = the public void); restored from IndexedDB before the first load
  const [space, setSpace] = useState<SpaceSession | null>(null);
  // phones: "scroll mode" (the small ↕ button on the left) lets a swipe scroll the page instead of dragging what's in the space
  const [scrollMode, setScrollMode] = useState(false);
  useEffect(() => {
    const h = document.documentElement;
    if (scrollMode) h.dataset.scrollmode = "";
    else delete h.dataset.scrollmode;
    return () => { delete h.dataset.scrollmode; };
  }, [scrollMode]);
  const spaceRef = useRef<SpaceSession | null>(null);
  const [spaceReady, setSpaceReady] = useState(false);
  // who is in the space (and who is live right now, via realtime presence on its channel)
  const [room, setRoom] = useState<SpaceInfo | null>(null);
  const roomRef = useRef(room);
  roomRef.current = room;
  // bubble text in this void (or space)
  // what this browser put in the trash (lib/trash.ts) stays out of sight here, for everyone else it is still there
  const trash = useTrash();
  // the archive space (this device only): everything archived, on its usual map, each with a restore button
  const [inArchive, setInArchive] = useState(false);
  useEffect(() => {
    const on = () => (setInArchive(true), setPanel(null));
    window.addEventListener("orbit:archive", on);
    return () => window.removeEventListener("orbit:archive", on);
  }, []);
  // nothing left in it: back out
  useEffect(() => {
    if (inArchive && !trash.size) setInArchive(false);
  }, [inArchive, trash]);
  // walking into (or out of) the archive or a space: the view fits everything in again
  useEffect(() => setFitAllN((n) => n + 1), [inArchive, space?.slug]);
  // inside it nothing is archived again (the drop zone is gone) and Esc walks out
  useEffect(() => {
    if (!inArchive) return;
    document.body.dataset.archive = "1";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector(".drawer, .pop, .viewer") && setInArchive(false);
    window.addEventListener("keydown", esc);
    return () => (delete document.body.dataset.archive, window.removeEventListener("keydown", esc));
  }, [inArchive]);
  const [allNotes, setNotes] = useState<Bubble[]>([]);
  // an archived stack holds what its sender had written by then: a newer bubble from them shows again
  const notes = useMemo(() => {
    if (!trash.size) return inArchive ? [] : allNotes;
    const hid = (b: Bubble) => {
      const at = trashedAt(`b:${senderOf(b)}`);
      return at > 0 && Date.parse(b.createdAt) <= at + skewRef.current;
    };
    return allNotes.filter((b) => hid(b) === inArchive);
  }, [allNotes, trash, inArchive]);
  const knownBubbles = useRef<Map<string, string> | null>(null);
  // tasks in this void/space, which one is in focus (only its files show), and the task a new send is wired to
  const [allTasks, setTasks] = useState<Task[]>([]);
  const tasks = useMemo(() => {
    const key = (t: Task) => `t:${isMyTask(t.id) ? "me" : t.from || t.by || "someone"}`;
    return inArchive ? allTasks.filter((t) => trash.has(key(t))) : trash.size ? allTasks.filter((t) => !trash.has(key(t))) : allTasks;
  }, [allTasks, trash, inArchive]);
  const knownTasks = useRef<Map<string, string> | null>(null);
  const [taskFocus, setTaskFocus] = useState<string | null>(null);
  // a focused task dims everything else: a tap anywhere else (or Esc) brings it all back
  useEffect(() => {
    if (!taskFocus) return;
    const down = (e: PointerEvent) => !(e.target as Element)?.closest?.(".task-board, .tb-acts, .wire-plug, .wire-menu") && setTaskFocus(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTaskFocus(null);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", esc);
    return () => (window.removeEventListener("pointerdown", down, true), window.removeEventListener("keydown", esc));
  }, [taskFocus]);
  const [wireTo, setWireTo] = useState<string | null>(null);
  // the board shows once someone opens it, even before the first task
  const [taskOpen, setTaskOpen] = useState(false);
  // new tasks are written from the Tasks button in the bar
  const [composing, setComposing] = useState(false);
  // archived (this device): the task panels, their files and wires all step out; the void looks as it always did
  const [archived, setArchivedS] = useState(false);
  useEffect(() => {
    try {
      setArchivedS(localStorage.getItem("orbit:tasks-archived") === "1");
    } catch {}
  }, []);
  const setArchived = (on: boolean) => {
    setArchivedS(on);
    try {
      localStorage.setItem("orbit:tasks-archived", on ? "1" : "0");
    } catch {}
  };
  const openTasks = () => (setArchived(false), setTaskOpen(true), setComposing(true));
  // a cable is being plugged into a task right now
  const [wiring, setWiring] = useState(false);
  // someone on this Wi-Fi is taking the team into a private space
  const [invite, setInvite] = useState<{ slug: string; title: string; by: string; pass: string } | null>(null);
  // the bubble board (everyone's bubbles, drag and zoom): false = closed, else who to bring close
  const [board, setBoard] = useState<string | null | false>(false);
  const [live, setLive] = useState<Set<string>>(new Set());
  const myId = room?.members.find((m) => m.you)?.id ?? null;
  // the member ids we already have a name for: a presence id we don't know means someone just joined, so pull the
  // member list at once instead of waiting for the 45 s refresh (that was the "reload to see them" lag)
  const memberIdsRef = useRef<Set<string>>(new Set());
  memberIdsRef.current = new Set(room?.members.map((m) => m.id) ?? []);
  const presenceSeenT = useRef(0);
  // incoming launch the user tapped: it opens by itself the moment it lands
  const waitFor = useRef<string | null>(null);
  const landedKeys = useRef(new Set<string>());
  const toasted = useRef(new Set<string>());
  const [now, setNow] = useState(() => Date.now());
  const [panel, setPanel] = useState<Panel>(null);
  // "Stay anonymous": on = the switch, now = anonymous here (the switch, or an anonymous space). Drawing only:
  // everything that sends something checks isAnon() at that moment
  const { on: anonOn, now: anonNow } = useAnon();
  // the whole page knows (html[data-anon]): the ghost look in globals.css / work.css
  useEffect(() => {
    if (anonNow) document.documentElement.dataset.anon = "1";
    else delete document.documentElement.dataset.anon;
  }, [anonNow]);
  // something of mine just went up: the map shows everything again so it is in sight (and if this device was
  // looking at another area, it goes back to its own, where the thing landed)
  const [fitAll, setFitAllN] = useState(0);
  const setFitAll = (f: (n: number) => number) => {
    setFitAllN(f);
    setArea(homeRef.current);
  };
  useEffect(() => void perf(), []);
  // up on the Earth the page holds still (the globe takes every drag and scroll), and the sky stops drawing
  useEffect(() => {
    if (!earth) return;
    window.scrollTo(0, 0);
    document.documentElement.dataset.earth = "1";
    return () => void delete document.documentElement.dataset.earth;
  }, [earth]);
  // a task of mine picked up to be thrown into one of my spaces (components/TaskThrow.tsx)
  const [grab, setGrab] = useState<(Grab & { spaces: SpaceSession[] }) | null>(null);
  const [launches, setLaunches] = useState<Launch[]>([]);
  // ids handed over from a stand-in sphere to its real one: no burn-up, no second entrance
  const swapped = useRef(new Set<string>());
  // real id → the stand-in's id it replaced: the sphere keeps its React key, so it is the same
  // element (no remount, no second entrance) when the upload lands
  const alias = useRef(new Map<string, string>());
  const [scope, setScope] = useState<"all" | "near" | "mine">("all");
  // "Show only": photos, videos, documents…
  const [kind, setKind] = useState<Kind>("all");
  const [dragging, setDragging] = useState(false);
  const [online, setOnline] = useState(1);
  const [pulse, setPulse] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [extra, setExtra] = useState<Orb | null>(null);
  const channel = useRef<Chan | RealtimeChannel | null>(null);
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
  // the look flipped in place (lib/view.ts): close what belongs to one look only (the send menu, the phone menu, the
  // style picker) before it paints in the other; launches, uploads, open cards, the map and drafts carry on
  const [shownUi, setShownUi] = useState(work);
  if (shownUi !== work) {
    setShownUi(work);
    setMenu(false);
    setMenuOut(false);
    setPanel((p) => (p?.kind === "menu" || p?.kind === "style" ? null : p));
  }
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

  // how dropped objects look (Style picker); a browser that never picked one asks for this computer's
  const { skin, pal } = useLook();
  const dropToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const toastSwipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const toast = useCallback((text: string) => {
    const id = Math.random();
    // the same notice twice in a row shows once
    setToasts((t) => [...t.filter((x) => x.text !== text).slice(-1), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  useEffect(() => {
    // anonymous: the look stays in this browser, nothing is asked of (or told to) the server
    if (isAnon()) return;
    findDeviceSkin().then((id) => id && toast(`Your style from this computer: ${skinName(id)}`)).catch(() => {});
    return autoRemember();
  }, [toast]);

  const recent = useRef(new Map<string, Orb>());
  // live changes (lib/sync.ts), kept over any cached list made before them
  const marks = useRef(new Map<string, Mark>());
  const staleTries = useRef(0);
  const taskKey = (t: Task) => `${t.doneAt ?? ""}|${t.assignee ?? ""}|${t.stage}`;
  // what changed about someone else's task, said once
  const taskNews = (t: Task, was: string | undefined, me: string) => {
    if (isMyTask(t.id)) return;
    if (was === undefined) return toast(t.assignee && t.assignee.toLowerCase() === me ? `${taskLabel(t)} is for you: ${taskLine(t)}` : `New task ${taskLabel(t)}${t.by ? ` from ${t.by}` : ""}: ${taskLine(t)}`);
    const [wasDone, wasWho, wasStage] = was.split("|");
    if (t.stage !== Number(wasStage) && t.stage >= 0) toast(`${taskLabel(t)} → ${stageName(t.route[t.stage]) || "next stage"}`);
    else if (t.doneAt && !wasDone) toast(`Task ${t.num} done${t.doneBy ? ` by ${t.doneBy}` : ""}`);
    else if (t.assignee && t.assignee.toLowerCase() === me && wasWho !== t.assignee) toast(`Task ${t.num} is for you`);
  };
  const removedRef = useRef<(sp: SpaceSession) => void>(() => {});
  // Coalesced fetch: at most one request in flight; bursts of triggers collapse into one follow-up (2: a fresh one).
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(0);
  const netTries = useRef(0);
  /** fresh: a catch-up after a gap. The public list is cached at the edge; a 2 s bucket in the address gets one made
   *  now (still one database query per area per bucket, however many devices catch up at once) */
  const refresh = useCallback((fresh = false): Promise<void> => {
    if (inflight.current) {
      again.current = Math.max(again.current, fresh ? 2 : 1);
      return inflight.current;
    }
    const run = (async () => {
      const sp = spaceRef.current;
      const a = areaRef.current;
      // the public void also carries what was sent from this network (same Wi-Fi), even when it was pinned to another area
      const sameNet = !sp && !isAnon() ? fetch("/api/transfers/net").then((x) => (x.ok ? x.json() : null)).then((x) => (x?.items ?? []) as Orb[]).catch(() => [] as Orb[]) : Promise.resolve([] as Orb[]);
      const q = [a && `a=${around(a).join(",")}`, fresh && `v=${Math.floor((Date.now() + skewRef.current) / 2000)}`].filter(Boolean).join("&");
      const r = await fetch(sp ? `/api/spaces/${sp.slug}/transfers` : `/api/transfers${q ? `?${q}` : ""}`, sp ? { headers: spaceHeaders(), cache: "no-store" } : undefined).catch(() => null);
      if (!sp && areaRef.current !== a) return; // moved to another area while this was in flight
      if (spaceRef.current !== sp) return; // switched while this was in flight
      if (sp && r?.status === 403) return removedRef.current(sp);
      if (!r?.ok) {
        // no answer (a network blip, a changed network) or a server stumble: asked again after 1 s, then 3 s
        if ((!r || r.status >= 500) && netTries.current < 2) {
          const n = netTries.current++;
          setTimeout(() => refresh(fresh), n ? 3000 : 1000);
        }
        return;
      }
      netTries.current = 0;
      const d = (await r.json()) as { items: Orb[]; bubbles?: Bubble[]; tasks?: Task[]; online: number; now: number };
      const extra = await sameNet;
      if (extra.length) {
        const have = new Set(d.items.map((o) => o.id));
        d.items = [...d.items, ...extra.filter((o) => !have.has(o.id))];
      }
      // the edge may hand out a list a few seconds old: changes made since stay on top, and it asks again shortly
      const made = Number(d.now) || 0;
      const ov = { t: overlay(d.tasks ?? [], "t", made, marks.current), b: overlay(d.bubbles ?? [], "b", made, marks.current), o: overlay(d.items ?? [], "o", made, marks.current) };
      const cut = Date.now() + skewRef.current - 120_000;
      for (const [k, m] of marks.current) if (m.at < cut) marks.current.delete(k);
      if (ov.t.stale || ov.b.stale || ov.o.stale) {
        if (staleTries.current++ < 4) setTimeout(() => refresh(), 2500);
      } else staleTries.current = 0;
      d.items = ov.o.list;
      const ts = ov.t.list;
      setTasks(ts);
      const me = (bubbleName() || roomRef.current?.handle || "").toLowerCase();
      if (knownTasks.current)
        for (const t of ts) {
          const was = knownTasks.current.get(t.id);
          const now = taskKey(t);
          if (was !== now) taskNews(t, was, me);
        }
      knownTasks.current = new Map(ts.map((t) => [t.id, taskKey(t)]));
      const bs = ov.b.list;
      setNotes(bs);
      if (knownBubbles.current)
        for (const b of bs) {
          if (isMyBubble(b.id)) continue;
          const was = knownBubbles.current.get(b.id);
          if (was === undefined) toast(`New bubble from ${b.by || "someone"}`);
          else if (was !== (b.updatedAt ?? "")) toast(`${b.by || "Someone"} ${b.editedAt ? "edited" : "added to"} a bubble`);
        }
      knownBubbles.current = new Map(bs.map((b) => [b.id, b.updatedAt ?? ""]));
      // a cached list is `age` seconds old: the server's clock moved on since it was made
      setSkew(made + (Number(r.headers.get("age")) || 0) * 1000 - Date.now());
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
        const f = again.current === 2;
        again.current = 0;
        refresh(f);
      }
    });
    inflight.current = run;
    return run;
    // taskNews / staleTries are stable refs and plain functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // After a gap (a line back up, a launch gone quiet, back from the background): the list now, and once more after
  // the edge's cache has turned over (a list made before the gap closed can still be handed out for a few seconds)
  const catchT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const catchUp = useCallback((fresh: boolean) => {
    refresh(fresh);
    clearTimeout(catchT.current);
    catchT.current = setTimeout(() => refresh(), 6000);
  }, [refresh]);
  const catchUpRef = useRef(catchUp);
  catchUpRef.current = catchUp;
  useEffect(() => () => clearTimeout(catchT.current), []);

  // Realtime pulses fan out to every open tab at once; random jitter spreads the refetches
  // so a million tabs don't hit the edge in the same millisecond. And at most one every 5 s: a busy area (many
  // devices, many clicks) must not keep a slow line busy with whole lists (what really changed comes as its own beam)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAt = useRef(0);
  const scheduleRefresh = useCallback(() => {
    if (pulseTimer.current) return;
    pulseTimer.current = setTimeout(() => {
      pulseTimer.current = null;
      pulseAt.current = Date.now();
      refresh();
    }, Math.max(150 + Math.random() * 900, pulseAt.current + 5000 - Date.now()));
  }, [refresh]);
  useEffect(() => () => clearTimeout(pulseTimer.current ?? undefined), []);

  // (say(): an anonymous device says nothing in the public void's region rooms, only inside its anonymous space)
  const broadcast = useCallback(() => say("pulse", { at: Date.now() }, spaceRef.current?.slug ?? ""), []);
  const beam = useCallback((event: "gone", payload: Record<string, unknown>) => say(event, payload, spaceRef.current?.slug ?? ""), []);
  const heardRef = useRef<((event: string, payload: Record<string, unknown>) => unknown) | null>(null);

  // a change, here and now: shown on this screen and kept over older lists
  const applySync = useCallback((m: SyncMsg) => {
    const at = Date.now() + skewRef.current;
    const put = (k: string, id: string, rec: { id: string } | null) => marks.current.set(`${k}:${id}`, { at, rec });
    if (m.b) {
      const b = m.b;
      put("b", b.id, b);
      knownBubbles.current?.set(b.id, b.updatedAt ?? "");
      setNotes((bs) => upsert(bs, b));
    }
    if (m.t) {
      const t = m.t;
      put("t", t.id, t);
      knownTasks.current?.set(t.id, taskKey(t));
      setTasks((ts) => (ts.some((x) => x.id === t.id) ? ts.map((x) => (x.id === t.id ? t : x)) : [...ts, t]));
    }
    if (m.bg?.length) {
      const gone = m.bg;
      gone.forEach((id) => put("b", id, null));
      setNotes((bs) => bs.filter((b) => !gone.includes(b.id)));
    }
    if (m.tg?.length) {
      const gone = m.tg;
      gone.forEach((id) => put("t", id, null));
      setTasks((ts) => ts.filter((t) => !gone.includes(t.id)));
    }
    if (m.og?.length) {
      const gone = m.og;
      unsayLanded(gone);
      gone.forEach((id) => (put("o", id, null), recent.current.delete(id)));
      setOrbs((list) => list.filter((o) => !gone.includes(o.id)));
    }
  }, []);
  /** this screen changed something: every other screen gets the change itself, not just a nudge to re-fetch */
  const sync = useCallback((m: SyncMsg) => {
    applySync(m);
    // (the change itself is enough: no extra "re-fetch" nudge, half the messages on the free plan)
    say("sync", m, spaceRef.current?.slug ?? "");
  }, [applySync]);

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
  const freshHues = useRef<number[]>([]);
  // zoomed into a sender's bubble (surfing between bubbles)
  const [zoom, setZoom] = useState<{ id: string; from: { x: number; y: number } | null } | null>(null);
  const startLaunch = useCallback((job: LaunchJob) => {
    const key = Math.random().toString(36).slice(2, 10);
    // several balls launched at once ("Separate") each get their own colour, not the same free one
    const hue = pickHue([...orbsRef.current.map((o) => o.hue), ...freshHues.current]);
    freshHues.current.push(hue);
    setTimeout(() => (freshHues.current = freshHues.current.filter((h) => h !== hue)), 5000);
    const l: Launch = {
      key, name: job.name, size: job.file.size, files: job.files, hue,
      createdAt: new Date(Date.now() + skew).toISOString(), stage: "deriving", frac: 0, abort: new AbortController(), open: false,
      life: job.life,
      free: job.open,
    };
    setLaunches((ls) => [...ls, l]);
    setPanel(null);
    setFitAll((n) => n + 1);
    // Every other open tab sees the ball right now, and watches it fill up, instead of after the upload. Said from
    // module level (flyStart…sayLanded) into the place it was launched in, even if this Void is gone by then.
    const place = spaceRef.current?.slug ?? "";
    flyStart(key, { name: l.name, size: l.size, files: l.files, hue: l.hue, at: l.createdAt, life: job.life, o: job.open, net: isAnon() ? null : netRef.current, f: 0, by: spaceRef.current?.handle ?? null }, place);
    const onProgress = (st: Stage, f: number) => {
      report(key, st, f);
      const frac = st === "uploading" ? f : st === "finalizing" || st === "done" ? 1 : 0;
      // (the network's id may arrive after the launch started)
      flyUpdate(key, { f: Math.round(frac * 100) / 100, net: isAnon() ? null : netRef.current });
    };
    // anonymous "hide file names": the name it goes by says only what kind of thing it is
    const fileName = job.hideNames ? genericFileName(job.file) : undefined;
    launch({ file: job.file, name: job.name, passcode: job.passcode, maxDownloads: job.maxDownloads, life: job.life, open: job.open, group: job.group, task: job.task, hue: l.hue, fileName, signal: l.abort.signal, onProgress })
      .then((orb) => {
        // the first send into a new anonymous space whose link couldn't be copied: the link, to pass on
        if (linkAfter.current && linkAfter.current === spaceRef.current?.slug) {
          linkAfter.current = null;
          setPanel((p) => p ?? { kind: "anon-link" });
        }
        if (job.task && job.done) tickTask(job.task, true).then(() => refresh()).catch(() => {});
        // said where the server put it (spaceBody() at the POST), not where Launch was pressed: walked into a space
        // (or out of one) during the derive / preview seconds, the record must not go into the other place's room
        const where = orb.space ?? "";
        if (where !== place) say("gone", { k: key }, place);
        sayLanded(key, orb, where);
        const from = pendingId(key);
        inheritSlot(from, orb.id);
        swapped.current.add(from).add(orb.id);
        alias.current.set(orb.id, alias.current.get(from) ?? from);
        setTimeout(() => (swapped.current.delete(from), swapped.current.delete(orb.id)), 5000);
        recent.current.set(orb.id, orb);
        setTimeout(() => recent.current.delete(orb.id), 20_000);
        // kept over any cached list made before it landed
        marks.current.set(`o:${orb.id}`, { at: Date.now() + skewRef.current, rec: orb });
        setOrbs((list) => (list.some((o) => o.id === orb.id) ? list : [...list, orb]));
        setLaunches((ls) => ls.map((x) => (x.key === key ? { ...x, orb } : x)));
        // (no "pulse" for everyone to re-fetch the list: the landing carries the object itself)
        refresh();
      })
      .catch((e: unknown) => {
        flyEnd(key);
        say("gone", { k: key }, place);
        if (l.abort.signal.aborted) return setLaunches((ls) => ls.filter((x) => x.key !== key));
        setLaunches((ls) => ls.map((x) => (x.key === key ? { ...x, err: e instanceof Error ? e.message : "Launch failed" } : x)));
      });
    // refresh/report are stable; skew only nudges the stand-in's clock
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skew]);
  // the anonymous space made by the gate whose link isn't copied yet: shown after its first send lands
  const linkAfter = useRef<string | null>(null);
  const dockLaunches = useMemo(() => launches.map((l) => (prog[l.key] && !l.orb ? { ...l, ...prog[l.key] } : l)), [launches, prog]);


  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    // tasks and notes leave the screen the moment they expire (the server already stopped listing them)
    const prune = setInterval(() => {
      const n = Date.now() + skewRef.current;
      const alive = <T extends { expiresAt: string }>(xs: T[]) => (xs.some((x) => Date.parse(x.expiresAt) <= n) ? xs.filter((x) => Date.parse(x.expiresAt) > n) : xs);
      setTasks(alive);
      setNotes(alive);
    }, 5000);
    return () => (clearInterval(t), clearInterval(prune));
  }, []);

  // initial load, polling fallback, deep link
  useEffect(() => {
    if (!spaceReady || !areaReady) return;
    me.current = deviceId();
    refresh();
    // new / landed / destroyed balls arrive instantly over realtime; this is only the safety net
    // (one request a minute per open page keeps the free hosting plan comfortable at scale)
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 60_000);
    // back in view: now, and once more past the edge's cache
    const onVis = () => document.visibilityState === "visible" && catchUp(false);
    document.addEventListener("visibilitychange", onVis);
    // the network came back (Wi-Fi switch, a dropped line): catch up at once, and once more when it has settled
    const onOnline = () => {
      refresh();
      setTimeout(refresh, 3000);
    };
    window.addEventListener("online", onOnline);
    const o = new URLSearchParams(window.location.search).get("o");
    if (o && /^[a-z0-9]{4,12}$/.test(o)) setPanel(ownerKey(o) ? { kind: "owner", id: o } : { kind: "unlock", id: o });
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh, catchUp, spaceReady, areaReady]);

  // back into the space this device was last in (no setup twice), and ?space= invite links
  useEffect(() => {
    // an anonymous link carries its code and key after the # (never sent to a server): read, then wiped from the
    // address bar at once
    const inv = new URLSearchParams(window.location.search).get("space");
    // an anonymous link is told apart by what it carries after the # (a named space may have an anon- slug from
    // before the prefix was reserved); a saved anonymous space is also known by its link without it
    const frag = new URLSearchParams(window.location.hash.slice(1));
    const anonLike = !!inv && /^anon-[a-z0-9]{8}$/.test(inv);
    let anonInv = anonLike && (frag.has("j") || frag.has("k")) ? inv : null;
    if (anonInv) replaceUrl(window.location.pathname);
    (async () => {
      const slug = await lastSpace().catch(() => null);
      const list = await savedSpaces().catch(() => [] as SpaceSession[]);
      let s = slug ? list.find((x) => x.slug === slug) ?? null : null;
      // the switch is on: a named space (it knows your name) is not walked back into
      if (s && anonSwitch() && !s.anon) s = null;
      // an anonymous link to a space this browser is already in: straight in
      if (!anonInv && anonLike && list.some((x) => x.slug === inv && x.anon)) anonInv = inv;
      const have = anonInv ? list.find((x) => x.slug === anonInv) ?? null : null;
      if (have) {
        s = have;
        setCurrent(have.slug);
      }
      if (s) {
        setActiveSpace(s);
        spaceRef.current = s;
        setSpace(s);
      }
      setSpaceReady(true);
      if (anonInv) {
        if (have) return;
        const code = frag.get("j") ?? "", key = frag.get("k") ?? "";
        if (/^[a-z0-9]{12}$/.test(code) && /^[A-Za-z0-9_-]{22}$/.test(key)) setPanel({ kind: "anon-join", slug: anonInv, code, key });
        else toast("This anonymous link is incomplete. Ask for the whole link");
        return;
      }
      if (inv && /^[a-z0-9-]{1,32}$/.test(inv) && inv !== s?.slug) setPanel({ kind: "space", start: inv });
    })();
    // toast is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchSpace = useCallback((s: SpaceSession | null) => {
    setInArchive(false);
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
    // anonymous (maybe switched on in another tab): a named space refuses the throwaway id. Only step out of it here;
    // it stays saved for when the switch is off again
    if (isAnon() && !sp.anon) return switchSpace(null);
    forget(sp.slug);
    switchSpace(null);
    toast(`You were removed from ${sp.title}`);
  };

  // Heartbeat: tells the server this device is here and what it is looking at.
  const viewing = panel?.kind === "unlock" ? panel.id : null;
  const viewingRef = useRef<string | null>(null);
  viewingRef.current = viewing;
  const lastPulse = useRef(0);
  const sendPulse = useCallback(() => {
    if (document.visibilityState !== "visible") return Promise.resolve();
    lastPulse.current = Date.now();
    // anonymous: counted as online and nothing else. No label, device, place or what it's looking at; the reply is
    // only the IP's rough area, kept in memory to look around the public void
    if (isAnon()) {
      const inVoid = !spaceRef.current;
      return fetch("/api/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anon: true, id: anonId(), void: inVoid }),
        keepalive: true,
      })
        .then((r) => r.json())
        .then((d: { area?: string }) => {
          if (inVoid && !spaceRef.current && isAnon()) {
            setAnonCell(d.area);
            if (anonCellNow()) setHome(anonCellNow());
          }
          setAreaReady(true);
        })
        .catch(() => setAreaReady(true));
    }
    // location shared: the exact spot goes to Orbit (its live map); others only ever see the rough area
    const f = fixNow();
    markSent(f);
    const exact = f ? { lat: f.lat, lon: f.lon, acc: f.acc, precise: true } : {};
    return fetch("/api/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId(), viewing: viewingRef.current, ...deviceInfo(), ...exact }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((d: { net?: string; invite?: string; area?: string }) => {
        if (d.invite) inviteKeyRef.current = d.invite;
        if (d.net) setNet(d.net);
        // no shared location: the void is the one around this IP
        if (fromIp(d.area)) setHome(d.area!);
        setAreaReady(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    sendPulse();
    // within the server's 120 s "online" window (migration 016): few requests, well inside the free plan
    const t = setInterval(sendPulse, 90_000);
    const onVis = () => document.visibilityState === "visible" && sendPulse();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sendPulse]);

  // ---- "Stay anonymous" (lib/anon.ts): the switch, and the anonymous spaces anonymous sends go into ----
  // anonymous spaces this browser is in (the cards offer to send into one again)
  const [anonSaved, setAnonSaved] = useState<SpaceSession[]>([]);
  const loadAnonSaved = useCallback(() => savedSpaces().then((l) => setAnonSaved(l.filter((x) => x.anon))).catch(() => {}), []);
  // set while this tab flips the switch itself, so the cross-tab follower below leaves it alone
  const localToggle = useRef<boolean | null>(null);
  const toggleAnon = useCallback((v: boolean, fromIntro = false, min = 30, reason: "exit" | "timer" = "exit") => {
    localToggle.current = v;
    if (v) {
      const lasting = persistentId();
      // first: no normal heartbeat leaves after this point
      setAnon(true, min);
      markAnonSeen();
      // the session's record (admin only): alias, length, start, the device's time zone (migration 021)
      const ss = anonSession();
      if (ss) {
        let tz = "";
        try {
          tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {}
        fetch("/api/anon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", sid: ss.id, min: ss.min, tz, offset: -new Date().getTimezoneOffset() }), keepalive: true }).catch(() => {});
      }
      // Orbi forgets this browser's heartbeat row (label, browser, network, IP place, last GPS spot)...
      fetch("/api/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ forget: true, deviceId: lasting }), keepalive: true }).catch(() => {});
      // ...and the style it remembered for this computer
      if (pickedSkin() || pickedPalette()) forgetDeviceLook().catch(() => {});
      forgetFix();
      setGps(false);
      setGeoAsk(false);
      setGeoFail(null);
      setEarth(false);
      setPicking(false);
      setNet(null);
      inviteKeyRef.current = "";
      setInvite(null);
      setScope((sc) => (sc === "near" ? "all" : sc));
      // the area being looked at is the IP's from now on (the next heartbeat brings it); never the GPS one
      homeRef.current = areaRef.current = "";
      setHome("");
      setArea("");
      const sp = spaceRef.current;
      if (sp && !sp.anon) {
        switchSpace(null);
        toast(`Anonymous on. You left ${sp.title}: it shows your name`);
      } else if (!fromIntro) toast("Anonymous on: location off, no name, cloud only");
      if (fromIntro) setPanel({ kind: "anon", mode: "on" });
      void sendPulse();
    } else {
      // the session burns: its record is closed on the server, its anonymous spaces (and all in them) burn there,
      // and this browser forgets every anonymous space it was in
      const ss = anonSession();
      if (ss) fetch("/api/anon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end", sid: ss.id, reason }), keepalive: true }).catch(() => {});
      if (spaceRef.current?.anon) switchSpace(null);
      savedSpaces().then((l) => Promise.all(l.filter((x) => x.anon).map((x) => forget(x.slug)))).then(() => setAnonSaved([])).catch(() => {});
      setAnon(false);
      setAnonCell("");
      toast(reason === "timer" ? `Time's up: ${ss ? aliasOf(ss.id) : "your anonymous identity"} burnt, with its spaces` : `${ss ? aliasOf(ss.id) : "Anonymous"} burnt. Location stays off until you tap the pin`);
      setHome(where()?.area ?? homeRef.current);
      setPanel((p) => (p?.kind === "anon" ? null : p));
      void sendPulse();
    }
  }, [switchSpace, toast, sendPulse]);
  // the switch flipped in another tab of this browser: apply the local part here too (the other tab already sent
  // the forget pulse). Named spaces are stepped out of, never forgotten; GPS, net and the GPS area are dropped at once
  const prevAnonOn = useRef(anonOn);
  useEffect(() => {
    if (prevAnonOn.current === anonOn) return;
    prevAnonOn.current = anonOn;
    if (localToggle.current === anonOn) {
      localToggle.current = null;
      return;
    }
    localToggle.current = null;
    if (anonOn) {
      const sp = spaceRef.current;
      if (sp && !sp.anon) {
        switchSpace(null);
        toast(`Anonymous on. You left ${sp.title}: it shows your name`);
      }
      forgetFix();
      setGps(false);
      setGeoAsk(false);
      setGeoFail(null);
      setEarth(false);
      setPicking(false);
      setNet(null);
      inviteKeyRef.current = "";
      setInvite(null);
      setScope((sc) => (sc === "near" ? "all" : sc));
      homeRef.current = areaRef.current = "";
      setHome("");
      setArea("");
    } else {
      setAnonCell("");
      setHome(where()?.area ?? homeRef.current);
      setPanel((p) => (p?.kind === "anon" ? null : p));
    }
    void sendPulse();
  }, [anonOn, switchSpace, toast, sendPulse]);
  /** every way of turning it on: the first time, the explainer (its button turns it on) */
  const requestAnon = useCallback(() => {
    setPanel({ kind: "anon", mode: anonSeen() ? "start" : "intro" });
  }, []);
  // the session's clock: when its time is up (also right after a reload past it) it burns
  const { sess: anonSess } = useAnon();
  useEffect(() => {
    if (!anonOn || !anonSess) return;
    const check = () => Date.now() >= anonSess.ends && toggleAnon(false, false, 30, "timer");
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [anonOn, anonSess, toggleAnon]);
  const copyAnonLink = useCallback(async () => {
    const sp = spaceRef.current;
    if (!sp?.anon) return;
    try {
      await navigator.clipboard.writeText(anonLink(sp));
      toast("Anonymous link copied");
    } catch {
      setPanel({ kind: "anon-link" });
    }
  }, [toast]);
  /** what the gate was holding back, carried on inside the anonymous space */
  type Then = { items?: Item[]; note?: boolean; task?: { line: string; life: number } };
  const carryOn = useRef<(then?: Then) => void>(() => {});
  /** into an anonymous space this browser is in, and on with what was being sent */
  const intoAnon = useCallback((s: SpaceSession, then?: Then) => {
    remember(s);
    switchSpace(s);
    toast(`You're anonymous in ${s.title}`);
    carryOn.current(then);
  }, [switchSpace, toast]);
  /** a new anonymous space (random title, code and key), stepped into; its one link is copied if it can be */
  const goAnonSpace = useCallback(async (then?: Then, min?: number) => {
    // an anonymous space only exists inside a timed anonymous session (5 to 30 min): start one first, so the space
    // is filed under it and burns with it
    if (!anonSwitch()) toggleAnon(true, false, min ?? lastMinutes());
    let s: SpaceSession;
    try {
      s = await createAnonSpace();
    } catch (e) {
      toast((e as { status?: number }).status === 500 ? "Anonymous spaces aren't available yet" : (e as Error).message);
      throw e;
    }
    await remember(s);
    switchSpace(s);
    let copied = false;
    try {
      await navigator.clipboard.writeText(anonLink(s));
      copied = true;
    } catch {}
    if (!copied) linkAfter.current = s.slug;
    toast(copied ? `${s.title} is ready · link copied` : `${s.title} is ready`);
    if (then) carryOn.current(then);
    else setPanel(copied ? null : { kind: "anon-link" });
  }, [switchSpace, toast, toggleAnon]);

  // stepped into an anonymous space (its link, a knock, or a saved one) without the switch on: being in one is being
  // anonymous, so a session starts (30 min at most) with its clock on the seal, and it ends by itself
  useEffect(() => {
    if (space?.anon && !anonOn) toggleAnon(true, false, 30);
  }, [space, anonOn, toggleAnon]);

  const dropIncoming = useCallback((k: string) => {
    setIncoming((m) => {
      if (!m[k]) return m;
      const next = { ...m };
      delete next[k];
      return next;
    });
  }, []);

  // Someone pressed Launch somewhere: their ball floats here at once and fills up as it uploads. Several launched at
  // once come in one message (ls); pages from before that say one launch per message.
  const onLaunchBeam = useCallback((p: Record<string, unknown>, a: string | null = null) => {
    const list = (Array.isArray(p.ls) ? (p.ls as unknown[]).slice(0, 40) : [p]).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
    const serverNow = Date.now() + skewRef.current;
    const items: Incoming[] = [];
    for (const x of list) {
      const k = x.k;
      if (!validKey(k) || landedKeys.current.has(k)) continue;
      const name = (typeof x.name === "string" ? x.name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60) : "") || "untitled";
      const at = typeof x.at === "string" ? Date.parse(x.at) : NaN;
      const createdAt = new Date(Number.isFinite(at) && Math.abs(at - serverNow) < 120_000 ? at : serverNow).toISOString();
      const netV = x.net ?? p.net, byV = x.by ?? p.by;
      const net = typeof netV === "string" && /^[0-9a-f]{12}$/.test(netV) ? netV : null;
      const by = typeof byV === "string" ? byV.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24) || null : null;
      const life = [5, 10, 15, 20, 25, 30].includes(Number(x.life)) ? Number(x.life) : 30;
      items.push({
        key: k, by, life, open: x.o === true, name, createdAt, net, a,
        size: Math.round(num(x.size, 0, 4 * 1024 ** 3, 0)),
        files: Math.round(num(x.files, 1, 100_000, 1)),
        hue: Math.round(num(x.hue, 0, 359, 0)),
        frac: num(x.f, 0, 1, 0),
        seen: Date.now(),
      });
    }
    if (!items.length) return;
    setIncoming((m) => {
      let next = m;
      for (const item of items) {
        const was = next[item.key];
        if (!was && Object.keys(next).length >= INCOMING_MAX) continue;
        next = { ...next, [item.key]: was ? { ...item, createdAt: was.createdAt } : item };
      }
      return next;
    });
    const news = items.filter((i) => !toasted.current.has(i.key));
    for (const i of news) {
      toasted.current.add(i.key);
      setTimeout(() => toasted.current.delete(i.key), 120_000);
    }
    if (news.length) toast(news.length > 1 ? `Incoming: ${news.length} items` : `Incoming: ${news[0].name}`);
  }, [toast]);

  // It landed: the record rides along with the message (newer senders), else it is fetched straight from the server
  // (not the cached list), and it takes the stand-in's place. The sender says it three times (and a neighbour
  // region may pass it twice): whichever comes first brings it, the rest only tidy up.
  const landing = useRef(new Set<string>());
  const onLandedBeam = useCallback(async (p: Record<string, unknown>) => {
    const k = p?.k;
    // (the sender's repeats carry the id only inside the record)
    const id = p?.id ?? (p?.o as { id?: unknown } | null | undefined)?.id;
    if (!validKey(k) || typeof id !== "string" || !ORB_ID.test(id)) return;
    landedKeys.current.add(k);
    setTimeout(() => landedKeys.current.delete(k), 60_000);
    // destroyed meanwhile: a late repeat (or a neighbour region's copy) must not bring it back
    const burnt = () => {
      if (marks.current.get(`o:${id}`)?.rec !== null) return false;
      if (waitFor.current === k) waitFor.current = null;
      dropIncoming(k);
      return true;
    };
    if (burnt() || landing.current.has(id)) return;
    if (recent.current.has(id) || orbsRef.current.some((o) => o.id === id)) return dropIncoming(k);
    landing.current.add(id);
    const sp = spaceRef.current;
    let orb: Orb | null = null;
    try {
      const serverNow = Date.now() + skewRef.current;
      orb = cleanOrb(p.o, serverNow);
      // (only an object of the place this screen is in: a space's stays in the space)
      if (orb && (orb.id !== id || (orb.space ?? null) !== (sp?.slug ?? null))) orb = null;
      for (let a = 0; a < 3 && !orb; a++) {
        if (a) await new Promise((r) => setTimeout(r, 500 * a));
        const r = await fetch(`/api/transfers/${id}`, { headers: spaceHeaders() }).catch(() => null);
        if (r?.ok) orb = (await r.json().catch(() => null)) as Orb | null;
        else if (r?.status === 404) break;
      }
      if (spaceRef.current !== sp) return; // walked into another place meanwhile
      if (burnt()) return; // (destroyed while it was fetched)
      const from = incomingId(k);
      if (orb) {
        const got = orb;
        inheritSlot(from, got.id);
        swapped.current.add(from).add(got.id);
        alias.current.set(got.id, alias.current.get(from) ?? from);
        setTimeout(() => (swapped.current.delete(from), swapped.current.delete(got.id)), 5000);
        recent.current.set(got.id, got);
        setTimeout(() => recent.current.delete(got.id), 20_000);
        // kept over any cached list made before it landed, and such a list is asked again (refresh's overlay)
        marks.current.set(`o:${got.id}`, { at: serverNow, rec: got });
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
      if (!orb) catchUpRef.current(true);
    } finally {
      landing.current.delete(id);
    }
  }, [dropIncoming]);

  const onGoneBeam = useCallback((p: Record<string, unknown>) => {
    // a sender destroyed objects: they leave every screen now (even ones that just landed here)
    const ids = Array.isArray(p?.ids) ? (p.ids as unknown[]).filter((x): x is string => typeof x === "string" && /^[a-z0-9]{4,12}$/.test(x)) : [];
    if (ids.length) return applySync({ og: ids });
    const k = p?.k;
    if (!validKey(k)) return;
    dropIncoming(k);
    if (waitFor.current === k) {
      waitFor.current = null;
      toast("That launch was cancelled");
    }
  }, [dropIncoming, toast, applySync]);

  // someone changed a bubble or a task: it shows here now (the toasts say what, once)
  const onSyncBeam = useCallback((p: Record<string, unknown>) => {
    const m = readSync(p, Date.now() + skewRef.current);
    if (m.b && knownBubbles.current) {
      const was = knownBubbles.current.get(m.b.id);
      if (!isMyBubble(m.b.id)) {
        if (was === undefined) toast(`New bubble from ${m.b.by || "someone"}`);
        else if (was !== (m.b.updatedAt ?? "")) toast(`${m.b.by || "Someone"} ${m.b.editedAt ? "edited" : "added to"} a bubble`);
      }
    }
    if (m.t && knownTasks.current) {
      const was = knownTasks.current.get(m.t.id);
      if (was !== taskKey(m.t)) taskNews(m.t, was, (bubbleName() || roomRef.current?.handle || "").toLowerCase());
    }
    applySync(m);
    // taskKey / taskNews are plain functions over refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applySync, toast]);

  // a launch whose sender went quiet (closed the tab mid-upload) does not float forever. Quiet without a landing may
  // also mean it landed while a line blinked (this one or the sender's): the list knows, so it is asked
  const incomingRef = useRef(incoming);
  incomingRef.current = incoming;
  useEffect(() => {
    const t = setInterval(() => {
      const cut = Date.now() - INCOMING_TTL;
      const stale = Object.values(incomingRef.current).filter((i) => i.seen < cut).map((i) => i.key);
      if (!stale.length) return;
      setIncoming((m) => {
        const next = { ...m };
        for (const k of stale) if (next[k] && next[k].seen < cut) delete next[k];
        return next;
      });
      if (waitFor.current && stale.includes(waitFor.current)) waitFor.current = null;
      if (stale.some((k) => !landedKeys.current.has(k))) catchUpRef.current(true);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const beams = useRef({ launch: onLaunchBeam, landed: onLandedBeam, gone: onGoneBeam, sync: onSyncBeam });
  beams.current = { launch: onLaunchBeam, landed: onLandedBeam, gone: onGoneBeam, sync: onSyncBeam };

  // live updates: a space's own channel, or the channels of this area and the eight around it (sent on this area's)
  const chanNames = liveOn
    ? roomsFor(space?.chan ?? null, area).join(" ")
    : space ? `orbit-s-${space.chan}` : area ? [area, ...around(area).filter((c) => c !== area)].map((c) => `orbit-a-${c}`).join(" ") : "orbit-void";
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
  // presence (who is live) arrives instantly; a live id we have no name for means someone just joined, so fetch the
  // member list right away (debounced) rather than waiting for the 45 s tick or a reload
  const onPresence = useCallback((ids: string[]) => {
    setLive(new Set(ids));
    if (!spaceRef.current) return;
    const unknown = ids.some((id) => id !== myIdRef.current && !memberIdsRef.current.has(id));
    if (unknown && Date.now() - presenceSeenT.current > 1500) {
      presenceSeenT.current = Date.now();
      loadRoom();
    }
  }, [loadRoom]);
  const onPresenceRef = useRef(onPresence);
  onPresenceRef.current = onPresence;
  useEffect(() => {
    setRoom(null);
    setLive(new Set());
    if (!space) return;
    loadRoom();
    const t = setInterval(() => document.visibilityState === "visible" && loadRoom(), 45_000);
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
  // Supabase: the live connection is the scarce thing on the free plan (about 200 at once): a tab holds one only while
  // it is looked at, and lets go a minute after it goes to the background. Coming back it reconnects and catches up.
  // Orbit's own rooms (liveOn): a quiet socket hibernates for free, so a hidden (or just covered) tab keeps listening
  // and things still pop up there.
  const [rtOn, setRtOn] = useState(true);
  useEffect(() => {
    if (liveOn) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = () => {
      clearTimeout(t);
      if (document.visibilityState === "visible") setRtOn(true);
      // (a tab still sending, saving or receiving a file keeps it: transfers talk over the same connection, and a
      // launch still has to say it landed)
      else t = setTimeout(function off() {
        if (heldIds().length || downloading() || cloudSaving() || launching()) t = setTimeout(off, 60_000);
        else setRtOn(false);
      }, 60_000);
    };
    document.addEventListener("visibilitychange", on);
    return () => (clearTimeout(t), document.removeEventListener("visibilitychange", on));
  }, []);
  // no live connection to be had (the plan is full, or the network blocks it): the cached list every few seconds instead
  const [rtDown, setRtDown] = useState(false);
  useEffect(() => {
    if (!rtDown) return;
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 8000);
    return () => clearInterval(t);
  }, [rtDown, refresh]);
  // realtime broadcast only (no presence): constant cost per message, scales with Supabase's fan-out; in the public
  // void only the people around hear it
  const liveRef = useRef<Live | null>(null);
  useEffect(() => {
    // (with no channel left the connection closes by itself). Not before the saved space and the area are known: the
    // rooms would be opened only to be swapped a moment later (meanwhile what is said waits in say()'s queue)
    if (!rtOn || !spaceReady || !areaReady) return;
    // what someone else said, whichever way it came
    const heard = async (event: string, payload: Record<string, unknown>, a: string | null = null) => {
      if (event === "pulse") {
        scheduleRefresh();
        return setPulse((p) => p + 1);
      }
      if (event === "launch") return beams.current.launch(payload, a);
      if (event === "landed") return void beams.current.landed(payload);
      if (event === "gone") return beams.current.gone(payload);
      if (event === "sync") return beams.current.sync(payload);
      // "go private with the team": only devices on the sender's network can open the passcode
      if (event === "invite") {
        // anonymous: nobody on this network gets to know this device is here
        if (isAnon()) return;
        const p = payload as { slug?: string; title?: string; by?: string; net?: string; seal?: { iv: string; c: string } };
        if (!p?.slug || !p.seal || spaceRef.current || p.net !== netRef.current || !inviteKeyRef.current || !/^[a-z0-9-]{1,32}$/.test(p.slug)) return;
        const pass = await openInvite(inviteKeyRef.current, p.seal);
        if (pass) setInvite({ slug: p.slug, title: String(p.title ?? "").slice(0, 40), by: String(p.by ?? "").slice(0, 24), pass });
      }
    };
    // where this line belongs (say() sends a launch only into the place it was launched in)
    const place = spaceRef.current?.slug ?? "";
    heardRef.current = heard;
    // Orbit's own Cloudflare rooms (lib/live.ts, live/): thousands online at once on the free plan
    if (liveOn) {
      let opened = false;
      const l = joinLive(chanNames.split(" "), spaceRef.current ? "" : areaRef.current, {
        on: (e, p, a) => void heard(e, p, a),
        status: (up) => {
          setRtDown(!up);
          if (!up) return;
          if (spaceRef.current && myIdRef.current) l.chan.track({ id: myIdRef.current });
          // the socket is live: pull anything created during the handshake, so the first send is never missed
          // (back after a drop, resync below catches up)
          if (!opened) refresh();
          opened = true;
        },
        // a room back after a drop (any of them): what was said there meanwhile is in the list
        resync: () => catchUpRef.current(true),
        presence: (ids) => onPresenceRef.current(ids),
      });
      liveRef.current = l;
      // the line from now on, not from when it connects: what is said meanwhile waits in its outbox
      channel.current = l.chan;
      const mine: Line = { chan: l.chan, place };
      setLine(mine);
      return () => {
        if (liveRef.current === l) liveRef.current = null;
        channel.current = null;
        if (line === mine) setLine(null);
        l.close();
      };
    }
    let mine: Line | null = null;
    let joined = false;
    const chans = chanNames.split(" ").map((name, i) => {
      const ch = supabase.channel(name, { config: { broadcast: { self: false } } });
      for (const ev of ["pulse", "launch", "landed", "gone", "sync", "invite"]) ch.on("broadcast", { event: ev }, ({ payload }) => void heard(ev, payload ?? {}));
      if (spaceRef.current) {
        ch.on("presence", { event: "sync" }, () => {
          const ids = new Set<string>();
          for (const list of Object.values(ch.presenceState())) for (const p of list as { id?: string }[]) if (p.id) ids.add(p.id);
          onPresenceRef.current([...ids]);
        });
      }
      // the first is this device's own (space or area): everything it says goes there
      ch.subscribe((status) => {
        if (i) return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") return setRtDown(true);
        if (status !== "SUBSCRIBED") return;
        setRtDown(false);
        channel.current = ch;
        if (!mine || line !== mine) {
          mine = { chan: ch, place };
          setLine(mine);
        }
        if (spaceRef.current && myIdRef.current) ch.track({ id: myIdRef.current }).catch(() => {});
        // joined again after a drop (supabase-js rejoins by itself): what was said meanwhile is in the list
        if (joined) catchUpRef.current(true);
        joined = true;
      });
      return ch;
    });
    return () => {
      channel.current = null;
      if (mine && line === mine) setLine(null);
      chans.forEach((ch) => supabase.removeChannel(ch));
    };
    // Orbit's rooms are rebuilt only for another space (an area change just moves them, below); Supabase's channels
    // are named by area, so they follow it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleRefresh, rtOn, spaceReady, areaReady, liveOn ? space?.chan ?? "" : chanNames]);
  // the area moved (a walk, a flight over the Earth, a new IP guess): the same rooms stay open (only their filter and
  // tag move), new regions open and ones left behind close; nothing said meanwhile is lost
  useEffect(() => {
    liveRef.current?.update(chanNames.split(" "), spaceRef.current ? "" : area);
  }, [chanNames, area]);
  // the network's own live room (public void, not anonymous): devices on one Wi-Fi hear each other's launches even
  // when they are pinned to different areas (one by GPS, the other by IP)
  useEffect(() => {
    if (!rtOn || space || anonNow || !net) return;
    const hear = (e: string, p: Record<string, unknown>) => {
      // only what concerns objects; pulses and invites keep to the area channels
      if (e === "launch" || e === "landed" || e === "gone") void heardRef.current?.(e, p);
    };
    if (liveOn) {
      const l = joinLive([`s/n${net}`], "", { on: hear, status: (up) => setNetLine(up ? l.chan : null) });
      return () => {
        setNetLine(null);
        l.close();
      };
    }
    const ch = supabase.channel(`orbit-n-${net}`, { config: { broadcast: { self: false } } });
    for (const ev of ["launch", "landed", "gone"]) ch.on("broadcast", { event: ev }, ({ payload }) => hear(ev, payload ?? {}));
    ch.subscribe((st) => setNetLine(st === "SUBSCRIBED" ? ch : null));
    return () => {
      setNetLine(null);
      supabase.removeChannel(ch);
    };
  }, [rtOn, space, anonNow, net]);
  // back from the background: whatever happened meanwhile
  const wasOn = useRef(true);
  useEffect(() => {
    if (rtOn && !wasOn.current) catchUp(true);
    wasOn.current = rtOn;
  }, [rtOn, catchUp]);

  // where this device is: its last area at once; a location already allowed is refreshed quietly; a first visit is
  // asked (after a moment) whether to share it
  useEffect(() => {
    // nothing known yet: the heartbeat brings the IP's area; never wait on it for long
    const t = setTimeout(() => setAreaReady(true), 2500);
    // anonymous: no location at all (not even the last one this browser kept); the heartbeat's IP area only
    if (isAnon()) return () => clearTimeout(t);
    const w = where();
    if (w) {
      setHome(w.area);
      setGps(w.how === "gps");
      setAreaReady(true);
    }
    permission().then((p) => {
      if (p === "granted")
        locate()
          .then((w) => (setHome(w.area), setGps(true)))
          .catch(() => {});
      else if (p === "denied" && w?.how === "gps") {
        dropGps();
        setGps(false);
      }
      // once per browser every 2 days (shown counts, whatever the answer); otherwise only when a feature needs it
      if (p !== "granted" && !asked()) setTimeout(() => (markAsked(), setGeoAsk(true)), 1400);
    });
    return () => clearTimeout(t);
  }, []);
  // while location is allowed: follow the device; a walk into another cell moves its void, a move of 100 m+ tells
  // Orbit early (at most every 15 s)
  const movedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!gps || anonNow) return;
    const stop = follow(
      (w) => setHome(w.area),
      () => {
        if (movedTimer.current) return;
        movedTimer.current = setTimeout(() => {
          movedTimer.current = null;
          sendPulse();
        }, Math.max(0, lastPulse.current + 15_000 - Date.now()));
      },
    );
    return () => {
      stop();
      if (movedTimer.current) clearTimeout(movedTimer.current);
      movedTimer.current = null;
    };
  }, [gps, anonNow, sendPulse]);
  const shareLocation = useCallback(async () => {
    setGeoAsk(false);
    // anonymous: location can't be on; the card says why
    if (isAnon()) return setPanel({ kind: "anon", mode: "status" });
    try {
      const w = await locate();
      setGps(true);
      setHome(w.area);
      toast("Location on: you see what's around you");
    } catch (e) {
      markAsked();
      setGps(false);
      setGeoFail((e as { denied?: boolean }).denied ? "denied" : "failed");
    }
  }, [toast]);
  // location blocked: this device's area is the one picked on the map (lib/where.ts), not its connection's guess
  const pickHere = useCallback((cell: string) => {
    pickArea(cell);
    setHome(cell);
    setArea(cell);
    toast("Your area is set: what you send goes here, and you see what's around it");
  }, [toast]);
  // a new area: its void (the first load waits for areaReady and asks with the area by then)
  useEffect(() => {
    if (!area || !areaReady || spaceRef.current) return;
    // launches on their way up from areas still around this one stay (a step over a cell border keeps them)
    const near = new Set(around(area));
    setIncoming((m) => {
      const keep = Object.values(m).filter((i) => i.a && near.has(i.a));
      return keep.length === Object.keys(m).length ? m : Object.fromEntries(keep.map((i) => [i.key, i]));
    });
    known.current = null;
    knownBubbles.current = null;
    knownTasks.current = null;
    refresh();
    // areaReady only gates the first time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, refresh]);

  // Opening / closing / zooming an object updates live-viewer counts everywhere. But every such pulse makes every
  // device in the area fetch its whole list again, so browsing card by card was constant chatter on everyone's line:
  // the report goes out a moment after the first change, then at most once per 10 s, with whatever is open by then.
  const viewT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const viewAt = useRef(0);
  const viewNews = useCallback(() => {
    if (viewT.current) return;
    viewT.current = setTimeout(() => {
      viewT.current = undefined;
      viewAt.current = Date.now();
      // anonymous: what this device opens is never reported (sendPulse sends no viewing then)
      void sendPulse().then(() => {
        refresh();
        broadcast();
      });
    }, Math.max(1000, viewAt.current + 10_000 - Date.now()));
  }, [sendPulse, refresh, broadcast]);
  useEffect(() => () => clearTimeout(viewT.current), []);
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    // anonymous: what this device opens is never reported (it adds nothing to watcher counts)
    if (isAnon()) return;
    viewNews();
  }, [viewing, viewNews]);

  // auto-refresh stale tabs after a new deploy. Never while a card is open, and never while this tab
  // is the source of files in orbit (a reload would take them down for everyone) or still downloading.
  const idle = () => !panelOpen.current && heldIds().length === 0 && !downloading();
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
      else if (v !== version.current) stale.current = true;
      if (stale.current && idle()) window.location.reload();
    };
    check();
    // also checked whenever the page comes back into view
    const t = setInterval(check, 5 * 60_000);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  useEffect(() => {
    if (!panel && stale.current && idle()) window.location.reload();
  }, [panel]);

  // sync ?o= with open object
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = panel && (panel.kind === "unlock" || panel.kind === "owner") ? panel.id : null;
    if (id) url.searchParams.set("o", id);
    else url.searchParams.delete("o");
    // (not a raw replaceState(null): on mount that would wipe Next's mark from this entry, lib/view.ts)
    replaceUrl(url);
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
        .then((items) => {
          // dropped onto an open send panel: added to it
          if (items.length) setPanel((p) => (p?.kind === "send" ? { kind: "send", items: [...p.items, ...items] } : p?.kind === "anon-gate" && p.items ? { ...p, items: [...p.items, ...items] } : { kind: "send", items }));
        })
        .catch(() => {});
    };
    const paste = (e: ClipboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) return setPanel({ kind: "send", items: files });
      const text = e.clipboardData?.getData("text");
      if (text?.trim()) setPanel({ kind: "send", items: [textToFile(text)] });
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
      release(o.id);
      fetch(`/api/transfers/${o.id}`, { method: "DELETE", headers: { "x-owner": key } }).finally(() => dropOwnerKey(o.id));
    }
  }, [orbs, serverNow]);
  // A file whose stored copy finished stays in orbit after this page closes (receivers fetch the copy).
  // One that only lives on this device goes with the page, so nobody waits on a file that can no longer
  // be sent; keepalive lets the requests finish after unload. While a copy is still saving, the browser
  // asks before leaving.
  useEffect(() => {
    const bye = () => {
      for (const id of heldIds()) {
        const saved = cloudSaved(id);
        releaseP2P(id);
        // saved, or a big upload this device can finish on its next visit (the parts already sent stay)
        if (saved || isResumable(id)) continue;
        const key = ownerKey(id);
        if (key) fetch(`/api/transfers/${id}`, { method: "DELETE", headers: { "x-owner": key }, keepalive: true }).catch(() => {});
      }
    };
    const ask = (e: BeforeUnloadEvent) => {
      if (!cloudSaving()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("pagehide", bye);
    window.addEventListener("beforeunload", ask);
    return () => {
      window.removeEventListener("pagehide", bye);
      window.removeEventListener("beforeunload", ask);
    };
  }, []);
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
  // (a stand-in whose real ball is already in the list goes, even if its "landed" message never arrived: no doubles)
  const arrivingOrbs = useMemo(
    () =>
      Object.values(incoming)
        .filter((i) => !orbs.some((o) => o.hue === i.hue && o.name === i.name && Math.abs(Date.parse(o.createdAt) - Date.parse(i.createdAt)) < 180_000))
        .map(incomingOrb),
    [incoming, orbs],
  );
  const grouped = useMemo(() => {
    const base = alive.filter(
      (o) =>
        !(archived && o.task) &&
        (scope === "all" || (scope === "near" ? o.netHash === net || !!ownerKey(o.id) : !!ownerKey(o.id))) &&
        (kind === "all" || fileKind(o.fileName, o.mime) === kind),
    );
    // a whole container archived at once holds what its sender had sent by then: newer ones arrive as usual (and,
    // two or more, make a container again)
    const boxed = (o: Orb) => {
      const at = o.from && !o.task ? trashedAt(`o:${GROUP}${o.from}`) : 0;
      return at > 0 && Date.parse(o.createdAt) <= at + skewRef.current;
    };
    if (!inArchive) return groupOrbs(base.filter((o) => !trash.has(`o:${o.id}`) && !boxed(o)));
    // the archive: files archived one by one, and whole containers archived at once (as they were then)
    const one = groupOrbs(base.filter((o) => trash.has(`o:${o.id}`)));
    const all = groupOrbs(base.filter((o) => !trash.has(`o:${o.id}`) && boxed(o)));
    // (one file left of such a container is no container any more: it is shown here on its own)
    const whole = all.list.filter((o) => !isGroup(o.id) || trash.has(`o:${o.id}`));
    return { list: [...one.list, ...whole], groups: new Map([...one.groups, ...whole.map((o) => [o.id, all.groups.get(o.id) ?? []] as const)]) };
  }, [alive, scope, net, kind, archived, trash, inArchive]);
  const groups = grouped.groups;
  const bubbleActs = {
    now: serverNow,
    toast,
    onBurn: async (id: string) => {
      if (await burnBubble(id)) {
        sync({ bg: [id] });
        toast("Bubble burned");
      }
    },
    onChange: (c: BubbleChange) => setPanel({ kind: "bubble", edit: c }),
  };
  const bubbles = useMemo(() => grouped.list.filter((o) => isGroup(o.id)).map((o) => ({ id: o.id, name: o.name, members: groups.get(o.id) ?? [] })), [grouped, groups]);
  // a container zoomed in keeps its sender's style
  const zoomSkin = (zoom && bubbles.find((b) => b.id === zoom.id)?.members[0]?.skin) || skin;
  // opening a container counts as looking at it: its viewer dot shows for everyone right away
  const zoomFirst = (zoom && bubbles.find((b) => b.id === zoom.id)?.members[0]?.id) || null;
  viewingRef.current = viewing ?? zoomFirst;
  const firstZoom = useRef(true);
  useEffect(() => {
    if (firstZoom.current) {
      firstZoom.current = false;
      return;
    }
    if (viewing || isAnon()) return; // an open card already reports itself; anonymous ones never do
    viewNews();
  }, [zoomFirst, viewing, viewNews]);
  const shown = useMemo(
    () => [
      // (grouped already left out what is archived; a container's id may be in the trash while its newer files show)
      ...grouped.list,
      ...(inArchive ? [] : pending),
      ...(inArchive || scope === "mine" ? [] : arrivingOrbs.filter((o) => scope === "all" || (!!net && o.netHash === net))),
    ],
    [grouped, scope, net, pending, arrivingOrbs, inArchive],
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
  // Arrange (tasks): every task gets a lane, its files line up in it grouped by sender; the rest share a last lane
  const [arranged, setArranged] = useState(false);
  useEffect(() => {
    try {
      setArranged(localStorage.getItem("orbit:arranged") !== "0"); // on unless this browser turned it off
    } catch {}
  }, []);
  const toggleArrange = () =>
    setArranged((a) => {
      try {
        localStorage.setItem("orbit:arranged", a ? "0" : "1");
      } catch {}
      return !a;
    });
  // The void can only hold so many spheres (fewer on a phone); keep yours, then nearby, then the newest.
  const cap = !(mode === "desk" && arranged && tasks.length) ? MAP_CAP : ORB_CAP[mode];
  const visible = useMemo(() => {
    if (shown.length <= cap) return shown;
    const rank = (o: Orb) => (ownerKey(o.id) || isPending(o.id) ? 2 : 0) + (o.netHash === net ? 1 : 0);
    return [...shown].sort((a, b) => rank(b) - rank(a) || b.createdAt.localeCompare(a.createdAt)).slice(0, cap);
  }, [shown, net, cap]);
  // the task board is solid ground: a ball that drifts, is dragged or lands behind it is nudged out to its right
  useEffect(() => {
    if (!tasks.length || archived) {
      document.querySelectorAll<HTMLElement>(".orb-anchor[data-push]").forEach((a) => ((a.style.translate = ""), delete a.dataset.push));
      return;
    }
    const t = setInterval(() => {
      // phones stack the board above the sky instead (nothing to push sideways into); the map gives everything its own spot
      const onMap = !!document.querySelector(".void.map");
      const board = window.innerWidth > 720 && !onMap ? document.querySelector<HTMLElement>(".task-boards")?.getBoundingClientRect() : undefined;
      document.querySelectorAll<HTMLElement>(".void .orb-anchor[data-orb]").forEach((a) => {
        const was = parseFloat(a.dataset.push || "0");
        const body = (a.querySelector(".orb-body") ?? a.querySelector(".orb"))?.getBoundingClientRect();
        if (!body || !body.width) return;
        let push = 0;
        if (board && board.width) {
          const left = body.left - was; // where it would be without the nudge
          const overlapY = body.bottom > board.top - 12 && body.top < board.bottom + 12;
          if (overlapY && left < board.right + 18) push = Math.ceil(board.right + 18 - left);
        }
        if (Math.abs(push - was) > 1) {
          a.dataset.push = String(push);
          a.style.translate = push ? `${push}px 0` : "";
        }
      });
    }, 300);
    return () => clearInterval(t);
  }, [tasks.length, archived]);
  // small open files in sight: decrypted quietly in the background (lib/peek.ts) so a tap previews them at once. Only
  // from a complete stored copy and only while nothing else moves on this device: warm() itself says no otherwise
  useEffect(() => {
    const go = () => warm(visible.filter((o) => !isPending(o.id) && !isIncoming(o.id)));
    const t = setTimeout(go, 400);
    // and again now and then: a file whose stored copy wasn't complete yet (or a busy moment) gets another try
    const again = setInterval(() => document.visibilityState === "visible" && go(), 20_000);
    return () => (clearTimeout(t), clearInterval(again));
  }, [visible]);
  const [vw, setVw] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const on = () => setVw({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  // Arranged lanes: every task row on the board is a lane; that task's files sit on the SAME line as the row
  // (so its cable runs dead straight), unwired files get one lane below. The rows grow to share the height,
  // and the balls shrink when a lane is crowded, so nothing overlaps.
  const laneTasks = !archived && arranged && mode === "desk" && tasks.length > 0 && visible.length > 0;
  // the task a ball (or a container, through any of its files) is wired to
  const taskOf = (o: Orb) => (isGroup(o.id) ? groups.get(o.id)?.find((m) => m.task)?.task : o.task) ?? null;
  const loose = laneTasks ? visible.filter((o) => !taskOf(o) || !tasks.some((t) => t.id === taskOf(o))) : [];
  const laneCount = tasks.length + (loose.length ? 1 : 0);
  // every lane fits on screen (the board never scrolls in Arranged): its height is the board's room split by the lanes
  const laneH = Math.round(Math.max(44, Math.min(150, (vw.h - 118 - 150 - 60) / Math.max(1, laneCount))));
  const [lanes, setLanes] = useState<{ y: Map<string, number>; x0: number; x1: number; W: number; H: number; last: number; off: number; offs: Map<string, number> } | null>(null);
  const voidRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!laneTasks) return setLanes(null);
    let raf = 0;
    const measure = () => {
      const v = document.querySelector<HTMLElement>("section.void");
      voidRef.current = v;
      const board = document.querySelector<HTMLElement>(".task-boards");
      if (!v || !board) return;
      // balls are placed in % of the box they are positioned in (not always the whole void)
      const host = (document.querySelector<HTMLElement>(".void .orb-anchor")?.offsetParent as HTMLElement | null) ?? v;
      const vr = host.getBoundingClientRect(), br = board.getBoundingClientRect();
      const y = new Map<string, number>();
      let last = 0;
      for (const t of tasks) {
        const r = document.querySelector(`[data-task-row="${t.id}"]`)?.getBoundingClientRect();
        // the lane runs level with the task's dot (where its cables leave the board), so they stay dead straight
        const d = document.querySelector(`[data-task-dot="${t.id}"]`)?.getBoundingClientRect();
        if (r && r.height) {
          y.set(t.id, (d && d.height ? d.top + d.height / 2 : r.top + r.height / 2) - vr.top);
          last = Math.max(last, r.bottom - vr.top);
        }
      }
      // the chat bubbles on the right are a wall: lanes end before them
      let wall = vr.right;
      document.querySelectorAll<HTMLElement>(".bub-stack").forEach((b) => {
        const r = b.getBoundingClientRect();
        if (r.width && r.left > vr.left + vr.width / 2) wall = Math.min(wall, r.left);
      });
      const x1 = wall - vr.left - 80;
      // where the sphere sits relative to its anchor point (the name hangs below it): lines go through the sphere's middle
      // (each shape sits a little differently, so every ball is measured on its own)
      let off = 0, n = 0;
      const offs = new Map<string, number>();
      document.querySelectorAll<HTMLElement>(".void.arranged .orb-anchor[data-orb]").forEach((a) => {
        const o = (a.querySelector(".orb-body") ?? a.querySelector(".orb"))?.getBoundingClientRect(), ar = a.getBoundingClientRect();
        if (!o || !o.height) return;
        const d = Math.round(o.top + o.height / 2 - ar.top);
        offs.set(a.dataset.orb!, d);
        off += d;
        n++;
      });
      off = n ? Math.round(off / n) : 0;
      const next = { y, x0: Math.max(40, br.right - vr.left + 64), x1, W: vr.width, H: vr.height, last, off, offs };
      const same = (p: typeof next) => p.x0 === next.x0 && p.x1 === next.x1 && p.W === next.W && p.H === next.H && p.last === next.last && [...y].every(([k, val]) => p.y.get(k) === val) && [...offs].every(([k, d]) => Math.abs((p.offs.get(k) ?? -99) - d) < 2);
      setLanes((p) => (p && same(p) ? p : next));
    };
    const loop = () => {
      measure();
      raf = window.setTimeout(loop, 400) as unknown as number;
    };
    loop();
    // lanes follow the task list as it scrolls
    const onScroll = (e: Event) => ((e.target as Element)?.classList?.contains("tb-list") || (e.target as Element)?.classList?.contains("task-boards")) && measure();
    document.addEventListener("scroll", onScroll, true);
    return () => (clearTimeout(raf), document.removeEventListener("scroll", onScroll, true));
  }, [laneTasks, tasks, vw, laneH]);
  const grid = useMemo(() => {
    if (!laneTasks || !lanes || !lanes.y.size) return null;
    const bySender = (a: Orb, b: Orb) => (a.from ?? a.id).localeCompare(b.from ?? b.id) || a.createdAt.localeCompare(b.createdAt);
    const rows: { y: number; list: Orb[] }[] = tasks
      .filter((t) => lanes.y.has(t.id))
      .map((t) => ({ y: lanes.y.get(t.id)!, list: visible.filter((o) => taskOf(o) === t.id).sort(bySender) }));
    if (loose.length) rows.push({ y: lanes.last + laneH / 2 + 8, list: [...loose].sort(bySender) });
    const span = Math.max(160, lanes.x1 - lanes.x0);
    const most = Math.max(1, ...rows.map((r) => r.list.length));
    // packed close to the board: a fixed comfortable step, tighter only when a lane is crowded
    const cell = Math.min(span / most, 168);
    // a ball with its name needs ~170 px wide and ~175 px tall at full size
    const k = Math.max(0.24, Math.min(1, cell / 170, laneH / 175));
    const pos = new Map<string, { x: number; y: number }>();
    for (const r of rows) r.list.forEach((o, i) => pos.set(o.id, { x: ((lanes.x0 + cell * (i + 0.5)) / lanes.W) * 100, y: ((r.y - (lanes.offs.get(o.id) ?? lanes.off)) / lanes.H) * 100 }));
    return { pos, k, tight: k < 0.62, cell: Math.round(cell) };
    // loose is derived from visible + tasks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneTasks, lanes, tasks, visible, laneH]);
  // ---- the map (lib/map.ts): every task panel, bubble stack and ball gets its own random spot in one world ----
  const mapOn = !laneTasks;
  const stacks = useStacks(notes);
  const tGroups = useMemo(() => taskGroups(tasks), [tasks]);
  const showTasks = !archived && (tasks.length > 0 || taskOpen);
  // what each panel really measures on screen (estimates until then)
  const [sizes, setSizes] = useState<Map<string, { w: number; h: number }>>(() => new Map());
  useEffect(() => {
    if (!mapOn) return;
    const t = setInterval(() => {
      const next = new Map<string, { w: number; h: number }>();
      document.querySelectorAll<HTMLElement>(".world [data-map-key]").forEach((el) => {
        if (el.offsetWidth) next.set(el.dataset.mapKey!, { w: el.offsetWidth, h: el.offsetHeight });
      });
      // (things off screen aren't drawn: they keep the size they last had)
      setSizes((prev) => ([...next].some(([k, v]) => {
        const p = prev.get(k);
        return !p || Math.abs(p.w - v.w) > 6 || Math.abs(p.h - v.h) > 6;
      }) ? new Map([...prev, ...next]) : prev));
    }, 500);
    return () => clearInterval(t);
  }, [mapOn]);
  // bumped when something is moved by hand (lib/map.ts pins it there)
  const [pinTick, setPinTick] = useState(0);
  const map = useMemo(() => {
    if (!mapOn) return null;
    void pinTick;
    const things: Thing[] = [];
    const taskKey = new Map(tGroups.flatMap((g) => g.tasks.map((t) => [t.id, `t:${g.key}`] as const)));
    const sz = (k: string, w: number, h: number) => sizes.get(k) ?? { w, h };
    if (showTasks)
      for (const g of tGroups) {
        const k = `t:${g.key}`;
        things.push({ key: k, ...sz(k, 344, 58 + 52 * g.tasks.length), born: Math.min(...g.tasks.map((t) => Date.parse(t.createdAt))) });
      }
    for (const st of stacks) {
      const k = `b:${st.key}`;
      things.push({ key: k, ...sz(k, 300, 44 + 118 * Math.min(2, st.items.length) + (st.items.length > 2 ? 34 : 0)), born: st.first });
    }
    // a ball keeps the spot its stand-in had while it was uploading
    const swapIn = new Set(visible.map((o) => alias.current.get(o.id)).filter(Boolean));
    for (const o of visible) {
      if (swapIn.has(o.id)) continue;
      const n = isGroup(o.id) ? groups.get(o.id)?.length ?? 0 : 0;
      const L = n ? bubbleLayout(n) : null;
      // wired to a task (a group: any of its files): it sits beside that task's panel
      const wired = showTasks ? (n ? groups.get(o.id)?.find((m) => m.task)?.task : o.task) : null;
      const near = wired ? taskKey.get(wired) : undefined;
      things.push({ key: `o:${alias.current.get(o.id) ?? o.id}`, w: L ? L.W + 60 : 210, h: L ? L.H + 120 : 250, born: Date.parse(o.createdAt), near });
    }
    const { W, H } = worldSize(things, vw.w, Math.max(620, vw.h));
    return { W, H, spots: place(things, W, H), size: new Map(things.map((t) => [t.key, t])) };
  }, [mapOn, sizes, showTasks, tGroups, stacks, visible, groups, vw, pinTick]);
  // only what is on screen is drawn (the map tells what that is as it moves); everything else waits off screen
  const [rect, setRect] = useState<Rect | null>(null);
  const onScreen = useCallback(
    (key: string) => {
      if (!map || !rect) return true;
      const p = map.spots.get(key), t = map.size.get(key);
      if (!p || !t) return true;
      return p.x + t.w / 2 > rect.x0 && p.x - t.w / 2 < rect.x1 && p.y + t.h / 2 > rect.y0 && p.y - t.h / 2 < rect.y1;
    },
    [map, rect],
  );
  const shownSpots = useMemo(() => (map ? new Map([...map.spots].filter(([k]) => onScreen(k))) : undefined), [map, onScreen]);
  const positions = useMemo(() => {
    if (grid) return grid.pos;
    if (!map) return layout(visible, mode);
    const out = new Map<string, { x: number; y: number }>();
    for (const o of visible) {
      const p = map.spots.get(`o:${alias.current.get(o.id) ?? o.id}`);
      if (p) out.set(o.id, { x: (p.x / map.W) * 100, y: (p.y / map.H) * 100 });
    }
    return out;
  }, [grid, map, visible, mode]);
  // a ball is the same colour on every device: the hue stored with it, never a local re-shuffle
  // wired files wear their sender's colour, so each team is easy to spot across tasks
  const colors = useMemo(() => new Map(visible.map((o) => [o.id, o.task ? hueFor(o.from ?? o.id) : ((o.hue % 360) + 360) % 360])), [visible]);

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
        setTimeout(() => setArriving((a) => new Set([...a].filter((id) => !fresh.includes(id)))), 600);
      }
      const gone = [...p.ids].filter((id) => !ids.has(id) && !aliveIds.has(id) && !swapped.current.has(id));
      if (gone.length) {
        const g = gone.map((id) => ({ orb: p.orbs.get(id)!, pos: p.pos.get(id)!, mine: !!ownerKey(id), hue: p.hue.get(id) })).filter((x) => x.orb && x.pos);
        setGhosts((list) => [...list, ...g]);
        setTimeout(() => setGhosts((list) => list.filter((x) => !gone.includes(x.orb.id))), 320);
      }
    }
    prev.current = { ids, orbs: new Map(visible.map((o) => [o.id, o])), pos: new Map(positions), hue: colors };
  }, [visible, alive, positions, colors, loaded]);
  // spheres this device already downloaded: dimmed, so what's new stands out
  const [gotTick, setGotTick] = useState(0);
  useEffect(() => {
    const on = () => setGotTick((t) => t + 1);
    window.addEventListener("orbit:got", on);
    return () => window.removeEventListener("orbit:got", on);
  }, []);
  const gotIds = useMemo(
    () => new Set(visible.filter((o) => (isGroup(o.id) ? !!groups.get(o.id)?.every((m) => hasGot(m.id)) : hasGot(o.id))).map((o) => o.id)),
    // gotTick: re-read localStorage when this device downloads something
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, groups, gotTick],
  );
  const watchers = useCallback((id: string) => orbs.find((o) => o.id === id)?.watchers ?? 0, [orbs]);
  const nearbyCount = alive.filter((o) => o.netHash === net).length;
  const mineCount = badges.size;
  useEffect(() => {
    if (scope === "mine" && !mineCount) setScope("all");
  }, [scope, mineCount]);

  // (a card's view is counted: told with the next viewer report, not a list refetch everywhere per card)
  const onViewed = viewNews;

  // 10 quick taps on the logo open mission HQ
  const router = useRouter();
  const markText = (inArchive ? "Archive" : space ? space.title : "Public workspace").toUpperCase();
  const taps = useRef<number[]>([]);
  const tapLogo = () => {
    const t = performance.now();
    taps.current = [...taps.current.filter((x) => t - x < 4000), t];
    if (taps.current.length >= 10) {
      taps.current = [];
      router.push("/admin");
    }
  };

  const pickFiles = (task: string | null = null) => {
    setWireTo(task);
    if (menu) closeMenu();
    adding.current = false;
    fileInput.current?.click();
  };
  const pickFolder = (task: string | null = null) => {
    setWireTo(task);
    if (menu) closeMenu();
    adding.current = false;
    folderInput.current?.click();
  };
  // the browser's picker takes one folder at a time: the send panel's "+ Folder / + Files" add to it
  const adding = useRef(false);
  const addTo = (more: Item[]) =>
    setPanel((p) => (adding.current && p?.kind === "send" ? { kind: "send", items: [...p.items, ...more] } : { kind: "send", items: more }));
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
    if (isGroup(o.id)) {
      const r = document.querySelector(`[data-orb="${o.id}"] .orb-body`)?.getBoundingClientRect();
      return setZoom({ id: o.id, from: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null });
    }
    lastOpen.current = { id: o.id, at: Date.now() };
    setPanel(ownerKey(o.id) ? { kind: "owner", id: o.id } : { kind: "unlock", id: o.id });
  }, [toast]);
  // double-click: straight into the full-screen preview (open objects), or after the passcode (locked ones)
  const preview = useCallback((id: string) => {
    if (isIncoming(id) || isPending(id) || isGroup(id)) return;
    setPanel({ kind: "unlock", id, preview: true });
  }, []);
  // The first click of a double-click already opened the card, so the second one lands on the card's backdrop:
  // a second click right after a ball opened is the double-click (preview), never a "close the card".
  const lastOpen = useRef<{ id: string; at: number } | null>(null);
  useEffect(() => {
    const recent = () => lastOpen.current && Date.now() - lastOpen.current.at < 550;
    const onClick = (e: MouseEvent) => {
      if (e.detail >= 2 && recent()) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const onDbl = (e: MouseEvent) => {
      if (!recent()) return;
      e.stopPropagation();
      const id = lastOpen.current!.id;
      lastOpen.current = null;
      preview(id);
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("dblclick", onDbl, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("dblclick", onDbl, true);
    };
  }, [preview]);
  const noop = useCallback(() => {}, []);
  // the sender destroys their own objects (a ball, or everything in their container): gone for everyone now
  const destroy = useCallback(async (ids: string[]) => {
    const mine = ids.filter((id) => ownerKey(id));
    if (!mine.length) return;
    window.dispatchEvent(new CustomEvent("orbit:haptic", { detail: "warn" }));
    await Promise.all(
      mine.map(async (id) => {
        const key = ownerKey(id) ?? "";
        release(id);
        const r = await fetch(`/api/transfers/${id}`, { method: "DELETE", headers: { "x-owner": key } }).catch(() => null);
        if (r?.ok || r?.status === 403) dropOwnerKey(id);
      }),
    );
    applySync({ og: mine });
    beam("gone", { ids: mine });
    toast(mine.length > 1 ? `${mine.length} objects destroyed` : "Object destroyed");
    broadcast();
  }, [toast, broadcast, beam, applySync]);
  const listedUnlock = panel?.kind === "unlock" ? orbs.find((o) => o.id === panel.id) ?? extra : null;
  if (listedUnlock) keptUnlock.current = listedUnlock;
  else if (panel?.kind !== "unlock") keptUnlock.current = null;
  const unlockOrb = listedUnlock ?? (panel?.kind === "unlock" && keptUnlock.current?.id === panel.id ? keptUnlock.current : null);
  // Phones stack the spheres in rows (see layout()); the void is as tall as its rows, including a
  // sphere that is still burning up in the last one.
  const flow = !map && mode !== "desk" && (visible.length > 0 || ghosts.length > 0);
  const lastRow = flow ? Math.max(0, ...[...positions.values()].map((p) => p.y)) : 0;
  const rows = flow ? Math.max(lastRow + 1, ...ghosts.map((g) => Math.min(g.pos.y + 1, lastRow + 3))) : 1;

  // a stand-in whose real sphere is already listed (the render of the swap): only the real one shows
  const replaced = new Set(visible.map((o) => alias.current.get(o.id)).filter((x): x is string => !!x));

  const mapSpots = shownSpots;
  // /work "Share": a link to this workspace (a space's link asks newcomers for its code, as on the main page)
  const shareWork = async () => {
    // an anonymous space: its one link (code and key after the #)
    const url = space?.anon ? anonLink(space) : `${window.location.origin}/work${space ? `?space=${space.slug}` : ""}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: space?.title ?? "Orbi Work", url });
      else {
        await navigator.clipboard.writeText(url);
        toast(space?.anon ? "Anonymous link copied" : space ? `Link to ${space.title} copied` : "Workspace link copied");
      }
    } catch {}
  };
  // "Stay anonymous": the mask while it's off; while anonymous here, a badge in the pin's place (location can't be on)
  const anonOffButton = (cls: string) => (
    <button className={`${cls} anon-chip`} onClick={requestAnon} aria-label="Stay anonymous: no location, no name, cloud only" title="Stay anonymous"><BsIncognito aria-hidden /></button>
  );
  const anonOnButton = (cls: string, withText = false) => (
    <button className={cls} onClick={() => setPanel({ kind: "anon", mode: "status" })} aria-label="Anonymous on. Tap for details" title="Anonymous on">
      <BsIncognito aria-hidden />{withText && <span>Anonymous</span>}
    </button>
  );
  // location: green pin when this device shares it, red when not (a tap asks again)
  const pinButton = (cls: string) => anonNow ? anonOnButton(`${cls} anon-chip on`) : (
    <button
      className={`${cls} geo-pin${gps ? " on" : " off"}`}
      onClick={() => (gps ? toast("Location on: you see what's within your area (about 20 to 40 km) and the areas around it") : shareLocation())}
      aria-label={gps ? "Location on" : "Location off: tap to share it and see what's around you"}
      title={gps ? "Location on" : "Location off: tap to turn it on"}
    >
      {gps ? <LuMapPin aria-hidden /> : <LuMapPinOff aria-hidden />}
    </button>
  );
  // the name sent with what this device posts (never while anonymous: the space gives an alias), and the one it
  // knows itself by on this screen ("for you" toasts, the board's "me")
  const postName = anonNow ? "" : bubbleName() || room?.handle || "";
  const meName = room?.handle || bubbleName() || "";
  const addTaskLine = async (line: string, life: number | undefined) => {
    const by = postName;
    const t = await addTask(line, by, life);
    const at = Date.now() + skew, { text, assignee } = parseTask(line);
    toast(`${taskLabel({ text, num: t.num })} added`);
    setFitAll((n) => n + 1);
    sync({ t: { id: t.id, num: t.num, text, by: by || room?.handle || null, from: t.from, createdAt: iso(at), expiresAt: iso(at + (life ?? 30) * 60_000), doneAt: null, doneBy: null, assignee: assignee || null, route: [], stage: -1, log: [], editedAt: null } });
    refresh();
  };
  carryOn.current = (then) => {
    if (then?.items) return setPanel({ kind: "send", items: then.items });
    if (then?.note) return setPanel({ kind: "bubble" });
    setPanel(null);
    if (then?.task) addTaskLine(then.task.line, then.task.life).catch((e) => toast((e as Error).message));
  };
  const taskBoard = showTasks && (
    <TaskBoard
      tasks={tasks}
      orbs={alive}
      me={meName}
      focus={taskFocus}
      onFocus={setTaskFocus}
      onOpenFile={open}
      onPreviewFile={(o) => preview(o.id)}
      wiring={wiring}
      arranged={laneTasks}
      laneH={laneTasks ? laneH : undefined}
      onArrange={mode === "desk" ? toggleArrange : undefined}
      onAdd={async (line, life) => {
        // anonymous in the public void: a task would carry an area; it goes into an anonymous space instead
        if (isAnon() && !spaceRef.current?.anon) {
          setPanel({ kind: "anon-gate", task: { line, life } });
          throw new Error("anonymous");
        }
        try {
          await addTaskLine(line, life);
        } catch (e) {
          toast((e as Error).message);
          throw e;
        }
      }}
      onTick={(t, done) => {
        const next = { ...t, doneAt: done ? iso(Date.now() + skew) : null, doneBy: done ? postName || room?.handle || null : null };
        applySync({ t: next });
        tickTask(t.id, done, postName).then(() => sync({ t: next })).catch((e) => (marks.current.delete(`t:${t.id}`), toast(e.message), refresh()));
      }}
      onTake={(t, who) => {
        const next = { ...t, assignee: who || null };
        applySync({ t: next });
        assignTask(t.id, who).then(() => (toast(who ? `Task ${t.num} → ${who}` : `Task ${t.num} is open again`), sync({ t: next }))).catch((e) => (marks.current.delete(`t:${t.id}`), toast(e.message), refresh()));
      }}
      onBurn={(t) => {
        burnTask(t.id).then((ok) => ok && (toast(`Task ${t.num} removed`), sync({ tg: [t.id] })));
      }}
      onAttach={(t, what) => (what === "folder" ? pickFolder(t.id) : pickFiles(t.id))}
      onClose={() => (setTaskOpen(false), setComposing(false))}
      composing={composing}
      spots={mapSpots}
      onArchive={() => (setArchived(true), setComposing(false), setArranged(false), toast("Tasks archived with their files · Tasks in the bar brings them back"))}
      onComposed={() => setComposing(false)}
      onGoPrivate={space || anonNow ? undefined : () => setPanel({ kind: "private" })}
      onGrab={(t, x, y) => {
        // the spaces it can go to: every one this device is in, except the one it is already in
        setGrab({ task: t, x, y, spaces: [] });
        savedSpaces().then((list) => setGrab((g) => (g && g.task.id === t.id ? { ...g, spaces: list.filter((x) => x.slug !== spaceRef.current?.slug) } : g))).catch(() => {});
      }}
      onMove={(t, dir) => moveTask(t.id, dir).then(() => (refresh(), broadcast())).catch((e) => toast(e.message))}
      onEdit={async (t, change) => {
        // shown at once; the server (and everyone else's screen) catches up in the background
        const by = postName;
        const next = applyEdit(t, change, by || room?.handle || "");
        applySync({ t: next });
        if (change.stage !== undefined) toast(change.stage < 0 ? `Task ${t.num} is back to not started` : `${taskLabel(t)} → ${stageName((change.route ?? t.route)[change.stage])}`);
        editTask(t.id, change, by)
          .then(() => sync({ t: next }))
          .catch((e) => (marks.current.delete(`t:${t.id}`), toast((e as Error).message), refresh()));
      }}
    />
  );
  // anonymous in the public void: every send or post stops at the gate, which makes (or picks) an anonymous space and
  // carries on with the same files (Send, drop, paste, Bubble, a new task)
  const gate: Then | null =
    panel?.kind === "anon-gate" ? { items: panel.items, note: panel.note, task: panel.task }
      : anonNow && !space?.anon ? (panel?.kind === "send" ? { items: panel.items } : panel?.kind === "bubble" && !panel.edit ? { note: true } : null)
      : null;
  const anonCard: AnonMode | null =
    panel?.kind === "anon" ? panel.mode : panel?.kind === "anon-join" ? "join" : panel?.kind === "anon-link" && space?.anon ? "link" : null;
  const anonPanel = !!gate || !!anonCard;
  useEffect(() => {
    if (anonPanel) loadAnonSaved();
  }, [anonPanel, loadAnonSaved]);
  // anonymous sends: photos lose where and when they were taken before the sheet can launch them (lib/scrub.ts)
  const [hideNames, setHideNames] = useState(true);
  const [scrubbed, setScrubbed] = useState<{ src: Item[]; items: Item[]; asIs: string[] } | null>(null);
  const sendSrc = panel?.kind === "send" ? panel.items : null;
  useEffect(() => {
    if (!sendSrc || !anonNow) return;
    let live = true;
    scrubItems(sendSrc)
      .then((r) => live && setScrubbed({ src: sendSrc, ...r }))
      .catch(() => live && setScrubbed({ src: sendSrc, items: sendSrc, asIs: sendSrc.map((x) => x.name) }));
    return () => {
      live = false;
    };
  }, [sendSrc, anonNow]);
  const sendItems = sendSrc ? (anonNow ? (scrubbed?.src === sendSrc ? scrubbed.items : sendSrc) : sendSrc) : [];
  return (
    <>
      {!work && <Starfield />}
      <LiquidGlass ui={ui} />

      {work ? (
        <>
          <WorkBar
            space={inArchive ? "Archive" : space?.title ?? null}
            isPrivate={inArchive || !!space?.priv}
            online={online}
            scope={scope}
            onScope={setScope}
            nearbyCount={anonNow ? 0 : nearbyCount}
            mineCount={mineCount}
            kind={kind}
            onKind={setKind}
            anon={anonNow}
            anonChip={anonNow ? null : anonOffButton("w-icon")}
            onAnonExit={anonOn ? () => toggleAnon(false) : undefined}
            pin={anonNow ? anonOnButton("w-btn anon-on", true) : pinButton("w-icon geo-chip")}
            onLogo={tapLogo}
            onSpaces={() => setPanel({ kind: "space" })}
            onShare={shareWork}
            onMenu={() => setPanel({ kind: "menu" })}
            area={area ? area.toUpperCase() : ""}
          />
          <WorkRail
            inSpace={!!space}
            onHome={() => (space ? (switchSpace(null), toast("Back in the public workspace")) : setArea(home))}
            onSpaces={() => setPanel({ kind: "space" })}
            onTasks={openTasks}
            taskCount={tasks.filter((t) => !t.doneAt).length}
            onBoard={() => setBoard(null)}
            noteCount={notes.length}
          />
        </>
      ) : (
      <header className={`top lg${compact ? " compact" : ""}`}>
        {/* phones: one slim bar of icons; the rest lives in the menu card */}
        <div className="m-bar">
          <button className="m-brand" onClick={tapLogo} aria-label="Orbi Transfer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/emblem.svg" alt="" width={30} height={30} draggable={false} />
          </button>
          <span className="m-live" aria-label={`${online} ${online > 1 ? "devices" : "device"} ${space ? "in this space" : "in orbit"}`}><i />{online}</span>
          <span className="m-sp" />
          {pinButton("m-ic lg-press")}
          <button className="m-ic lg-press" onClick={() => setPanel({ kind: "menu" })} aria-label={kind === "all" ? "Menu" : "Menu, filter on"}><LuMenu />{kind !== "all" && <i className="m-dot" />}</button>
        </div>
        <div className="top-row">
          <div className="brand" onClick={tapLogo} role="presentation">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/logo.svg" alt="Orbi Transfer" width={194} height={28} draggable={false} />
            <span className="brand-by">Instant transfer</span>
          </div>
          <nav className="nav">
            <a href="#how">How it works</a>
            <button onClick={openTasks}>Tasks{tasks.length ? ` ${tasks.filter((t) => !t.doneAt).length}` : ""}</button>
            <Link href="/about">About</Link>
            {/* in place (lib/view.ts): no reload, uploads and sockets carry on */}
            <button onClick={() => switchView("/work")}>Switch to Work</button>
            <Link href="/upgrade" className="nav-up"><LuRocket aria-hidden />Upgrade</Link>
          </nav>
          <div className="top-right">
            <KindFilter kind={kind} onKind={setKind} scope={{ value: scope, set: setScope, near: space || anonNow ? null : nearbyCount, mine: mineCount }} />
            <span className="live" aria-label={`${online} ${online > 1 ? "devices" : "device"} in orbit`}><span className="dot" /><b>{online}</b><span className="live-txt">{space ? "in this space" : online > 1 ? "devices in orbit" : "device in orbit"}</span></span>
            {anonNow ? <>{anonOnButton("pill lg-press anon-badge", true)}{anonOn && <button className="pill lg-press anon-exit" onClick={() => toggleAnon(false)} title="Turn off Anonymous">Exit</button>}</> : <>{anonOffButton("hd-ic lg-press")}{pinButton("hd-ic lg-press geo-chip")}</>}
            <button className="hd-ic lg-press style-chip" onClick={() => setPanel({ kind: "style" })} aria-label={`Style: ${skinName(skin)}. Change how files look`} title="Style"><LuPalette aria-hidden /></button>
            <button className="hd-ic lg-press" onClick={() => setPanel({ kind: "space", start: ":search" })} aria-label="Search spaces" title="Search spaces"><LuSearch aria-hidden /></button>
            <button className="hd-ic lg-press" onClick={() => setPanel({ kind: "space", start: ":create" })} aria-label="Create a space" title="Create your space"><LuPlus aria-hidden /></button>
            {/* when the links don't fit on one row (tablets, small windows, short landscape) they live in the menu */}
            <button className="hd-ic lg-press nav-menu" onClick={() => setPanel({ kind: "menu" })} aria-label="Menu" title="Menu"><LuMenu aria-hidden /></button>
            <button className="pill solid lg-press send-pill" onClick={openMenu}>Send</button>
          </div>
        </div>
      </header>
      )}

      <main className={menu && !menuOut ? "menu-open" : undefined} data-pal={pal}>
        <section
          className={`void${map ? " map" : ""}${notes.length && !map ? " has-bubbles" : ""}${!map && (new Set(notes.map(senderOf)).size > 1 || (tasks.length && !archived)) ? " bub-two" : ""}${tasks.length && !archived && !map ? " has-tasks" : ""}${taskFocus ? " task-focus" : ""}${grid ? ` arranged${grid.tight ? " tight" : ""}` : ""}${space || inArchive ? " in-space" : ""}${inArchive ? " in-archive" : ""}${flow ? " flow" : ""}${mode !== "desk" && mode !== "tall" && visible.length > 6 ? " many" : ""}`}
          id="void"
          // Work: the big faint wordmark behind the canvas is the place you are in
          data-mark={work ? markText : undefined}
          style={{ ...(flow ? { "--n": rows } : { "--k-auto": grid ? grid.k : map ? 1 : crowdScale(visible.length), ...(grid ? { "--cell": `${grid.cell}px` } : null) }), ...(work ? { "--mark-fs": `${Math.min(15, 112 / Math.max(4, markText.length))}vw` } : null) } as unknown as React.CSSProperties}
        >
          {inArchive && <ArchiveRoom onExit={() => setInArchive(false)} />}
          {/* anonymous: the void goes dark and cold (vignette, grain, scan lines, a big mask), so nobody forgets */}
          {anonNow && !inArchive && (
            <div className="ghost-layer" aria-hidden>
              <div className="ghost-mid">
                <BsIncognito className="ghost-mask" />
                <b className="ghost-title">You&apos;ve gone anonymous</b>
                <span className="ghost-sub">Other users can&apos;t see your location, your name or your device. Files go through the encrypted cloud only.</span>
              </div>
              {/* the sealed container: its edge is a ring of dots that runs down with the session's time */}
              <AnonSeal sess={anonSess} />
            </div>
          )}
          {!work && !inArchive && !space && (anonNow ? (
            <button className="where-badge anon" onClick={() => setPanel({ kind: "anon", mode: "status" })} aria-label="You are anonymous in the public void: you can look and download. Sending opens an anonymous space"><i aria-hidden /><BsIncognito aria-hidden />Anonymous here: look only</button>
          ) : (
            <button className="where-badge" onClick={() => setPanel({ kind: "space" })} aria-label="You are in the public void. Open spaces"><i aria-hidden />You&apos;re in the public void</button>
          ))}
          {(space || anonNow) && !inArchive && (
            <button className={`scroll-tog lg-press${scrollMode ? " on" : ""}`} onClick={() => setScrollMode((m) => !m)}
              aria-pressed={scrollMode} aria-label={scrollMode ? "Scroll mode on: swipes scroll the page. Tap to drag things again" : "Scroll mode: let swipes scroll the page"}>
              <LuArrowUpDown aria-hidden />
            </button>
          )}
          {space?.anon && space.code && space.key && <KnockBell space={space} toast={toast} />}
          {space && !inArchive && <SpaceRoom space={space} info={room} online={live} onKick={kick} onExit={() => {
            switchSpace(null);
            toast("Back in the public void");
          }} />}
          {map ? (
            <MapWorld W={map.W} H={map.H} band={(space || inArchive) && !work ? ROOM_BAND[mode] : MAP_BAND[mode]} fit={fitAll} empty={!map.spots.size} onRect={setRect}
              onMoveItem={(key, dx, dy) => {
                const p = map.spots.get(key);
                if (!p) return;
                pin(key, (p.x + dx) / map.W, (p.y + dy) / map.H);
                setPinTick((n) => n + 1);
              }}
            >
          {taskBoard}
          {notes.length > 0 && (
            <BubbleBoard bubbles={notes} {...bubbleActs} oneSide={tasks.length > 0 && !archived} onOpenBoard={(f) => setBoard(f)} spots={mapSpots} />
          )}
          {inArchive && [...map.spots].filter(([k]) => trash.has(k)).map(([k, p]) => {
            const t = map.size.get(k);
            return <ArchiveRestore key={`r-${k}`} k={k} x={p.x + (t ? t.w / 2 : 90) - 8} y={p.y - (t ? t.h / 2 : 90) - 8} label={trashLabel(k)} />;
          })}
          {visible.filter((o) => !replaced.has(o.id) && onScreen(`o:${alias.current.get(o.id) ?? o.id}`)).map((o, i) => (
            <OrbView
              key={alias.current.get(o.id) ?? o.id}
              orb={o}
              index={i}
              pos={positions.get(o.id)!}
              now={serverNow}
              mine={isGroup(o.id) ? !!groups.get(o.id)?.some((m) => ownerKey(m.id)) : !!ownerKey(o.id) || isPending(o.id)}
              nearby={!!net && o.netHash === net}
              watchers={isGroup(o.id) ? o.watchers ?? 0 : watchers(o.id)}
              onOpen={open}
              onPreview={preview}
              onMemberHint={(id) => (lastOpen.current = { id, at: Date.now() })}
              phase={arriving.has(o.id) ? "arriving" : undefined}
              hue={colors.get(o.id)}
              skin={work ? "work" : o.skin ?? skin}
              launching={upFrac.get(o.id)}
              incoming={isIncoming(o.id)}
              badge={badges.get(o.id)}
              got={gotIds.has(o.id)}
              onDestroy={isGroup(o.id) ? () => destroy((groups.get(o.id) ?? []).map((m) => m.id)) : ownerKey(o.id) ? () => destroy([o.id]) : undefined}
              onDestroyMember={isGroup(o.id) ? (id) => destroy([id]) : undefined}
              group={isGroup(o.id) ? groups.get(o.id)?.map((m) => ({ id: m.id, name: m.name, hue: m.hue, size: m.size, got: hasGot(m.id), fileName: m.fileName, expiresAt: m.expiresAt, life: m.life ?? 30, watchers: watchers(m.id), mine: !!ownerKey(m.id), thumb: !!(m.thumb && m.open) })) : undefined}
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
              skin={work ? "work" : g.orb.skin ?? skin}
            />
          ))}
            </MapWorld>
          ) : (
            <>
          {taskBoard}
            </>
          )}
          {!archived && tasks.length > 0 && (
            <TaskWires
              tasks={tasks}
              orbs={visible}
              focus={taskFocus}
              mine={new Set(visible.filter((o) => !isGroup(o.id) && !isPending(o.id) && ownerKey(o.id)).map((o) => o.id))}
              onWiring={setWiring}
              straight={!!grid}
              onConnect={(orb, task) => {
                const t = tasks.find((x) => x.id === task);
                setOrbs((os) => os.map((o) => (o.id === orb ? { ...o, task } : o)));
                wireObject(orb, task)
                  .then(() => (toast(`Wired to Task ${t?.num ?? ""}`), refresh(), broadcast()))
                  .catch((e) => (toast(e.message), refresh()));
              }}
            />
          )}
          {taskFocus && /^t[a-z0-9]{9}$/.test(taskFocus) && visible.some((o) => o.task === taskFocus) && <style>{`.void.task-focus .orb-anchor:not([data-task="${taskFocus}"]){opacity:.38;transition:opacity .3s}`}</style>}
          {!map && (<>
          {notes.length > 0 && (
            <BubbleBoard bubbles={notes} {...bubbleActs} oneSide={tasks.length > 0 && !archived} onOpenBoard={(f) => setBoard(f)} spots={mapSpots} />
          )}
          </>)}
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

          {earth && !space && !anonNow && (
            <EarthView
              home={home}
              from={area}
              gps={gps}
              picking={picking}
              onEnter={(cell) => {
                setEarth(false);
                if (picking) {
                  setPicking(false);
                  return pickHere(cell);
                }
                setArea(cell);
                if (cell !== home) toast(gps ? "You're looking at another area · what you post still goes to yours" : "You're looking at another area · tap \"I'm here\" to make it yours");
              }}
              onLocate={shareLocation}
              onSpace={() => (setEarth(false), setPanel({ kind: "space" }))}
              onClose={() => (setEarth(false), setPicking(false))}
            />
          )}
          {/* only while looking at another area; "share location" and "create your space" live in the navbar, not mid-screen */}
          {!earth && !space && !inArchive && !anonNow && area !== home && !geoAsk && !pillOff && (
            <div className="area-pill lg" data-no-pan>
              <button className="area-x" onClick={() => setPillOff(true)} aria-label="Hide this" title="Hide"><LuX aria-hidden /></button>
              <span>Another area</span>
              {!gps && <button className="pill solid lg-press" onClick={() => pickHere(area)}><LuMapPin aria-hidden /> I&apos;m here</button>}
              <button className={`pill${gps ? " solid" : ""} lg-press`} onClick={() => setArea(home)}>Back to my area</button>
            </div>
          )}
          {work && loaded && shown.length === 0 && !(map && map.spots.size) && (
            <p className="w-hint">{space ? `${space.title} is empty` : "Drop files anywhere, or press Upload"}</p>
          )}
          {!work && loaded && shown.length === 0 && !(map && map.spots.size) && (
            <div className="empty">
              <p className="mono">
                {space?.anon ? `${space.title} is empty. What you send here is seen only by people with its link` : space ? `${space.title} is empty. Launch something: only people in this space see it` : scope === "near" ? "Nothing from your network yet" : (
                  <>
                    <span className="on-fine">The void is empty. Drop files, folders or text anywhere</span>
                    <span className="on-touch">The void is empty. Tap Send to launch photos, videos, files or text</span>
                  </>
                )}
                <span className="cursor" />
              </p>
              <Uploader onFiles={() => pickFiles()} onFolder={() => pickFolder()} onText={compose} folderSub={touch ? "a folder, or many files at once" : undefined} />
            </div>
          )}

          {!map && (<>
          {visible.filter((o) => !replaced.has(o.id)).map((o, i) => (
            <OrbView
              key={alias.current.get(o.id) ?? o.id}
              orb={o}
              index={i}
              pos={positions.get(o.id)!}
              now={serverNow}
              mine={isGroup(o.id) ? !!groups.get(o.id)?.some((m) => ownerKey(m.id)) : !!ownerKey(o.id) || isPending(o.id)}
              nearby={!!net && o.netHash === net}
              watchers={isGroup(o.id) ? o.watchers ?? 0 : watchers(o.id)}
              onOpen={open}
              onPreview={preview}
              onMemberHint={(id) => (lastOpen.current = { id, at: Date.now() })}
              phase={arriving.has(o.id) ? "arriving" : undefined}
              hue={colors.get(o.id)}
              skin={work ? "work" : o.skin ?? skin}
              launching={upFrac.get(o.id)}
              incoming={isIncoming(o.id)}
              badge={badges.get(o.id)}
              got={gotIds.has(o.id)}
              onDestroy={isGroup(o.id) ? () => destroy((groups.get(o.id) ?? []).map((m) => m.id)) : ownerKey(o.id) ? () => destroy([o.id]) : undefined}
              onDestroyMember={isGroup(o.id) ? (id) => destroy([id]) : undefined}
              group={isGroup(o.id) ? groups.get(o.id)?.map((m) => ({ id: m.id, name: m.name, hue: m.hue, size: m.size, got: hasGot(m.id), fileName: m.fileName, expiresAt: m.expiresAt, life: m.life ?? 30, watchers: watchers(m.id), mine: !!ownerKey(m.id), thumb: !!(m.thumb && m.open) })) : undefined}
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
              skin={work ? "work" : g.orb.skin ?? skin}
            />
          ))}
          </>)}
        </section>

        {!work && <section className="how" id="how">
          <div className="how-top"><span>Protocol</span><span>Objects in orbit right now</span></div>
          <div className="how-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="how-wordmark" src="/brand/wordmark.svg" alt="Orbi Transfer" width={1391} height={124} />
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
            ["Receive", "Beam", "Open Orbi Transfer on the other device. Tap the object, enter the passcode, and it decrypts and lands. Live stats show who is accessing it."],
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
            <span>Files are end-to-end encrypted. Max 20 GB each. 300 uploads per network per hour.</span>
            <span><Link href="/about">About</Link> · <Link href="/about#contact">Contact</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · Abuse? Open the object and tap <span className="glyph"><LuFlag aria-hidden />Report</span></span>
          </div>
        </section>}
      </main>

      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) addTo(files);
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
          if (folder?.entries.length) addTo([folder]);
          // phones ignore webkitdirectory and hand back plain picks: send those as files instead of nothing
          else if (files.length) addTo(files);
          e.target.value = "";
        }}
      />

      <div className={`dropzone${dragging ? " on" : ""}`} aria-hidden>
        <div className="frame" />
        <div className="wide">Release<br />to launch</div>
      </div>

      {panel?.kind === "compose" && (
        <ComposePanel onClose={() => setPanel(null)} onReady={(file) => setPanel({ kind: "send", items: [file] })} />
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
          anon={anonOn}
          onAnonSpace={(min?: number) => void goAnonSpace(undefined, min).catch(() => {})}
          copyAnonLink={copyAnonLink}
        />
      )}
      {zoom && bubbles.some((b) => b.id === zoom.id) && (
        <div data-skin={zoomSkin} data-tone={toneOf(zoomSkin)} data-pal={pal} style={{ display: "contents" }}>
        <BubbleZoom
          bubbles={bubbles}
          id={zoom.id}
          from={zoom.from}
          now={serverNow}
          onSurf={(id) => setZoom((z) => (z ? { ...z, id } : z))}
          onOpen={(o) => {
            lastOpen.current = { id: o.id, at: Date.now() };
            setPanel(ownerKey(o.id) ? { kind: "owner", id: o.id } : { kind: "unlock", id: o.id });
          }}
          onDownloadAll={(id) => setPanel({ kind: "group", id })}
          onDestroy={destroy}
          onClose={() => setZoom(null)}
        />
        </div>
      )}
      {grab && (
        <TaskThrow
          key={grab.task.id}
          grab={grab}
          targets={grab.spaces.map((x) => ({ slug: x.slug, title: x.title }))}
          onCancel={() => setGrab(null)}
          onThrow={async (t, to) => {
            setGrab(null);
            if (!to) return anonNow ? undefined : setPanel({ kind: "private" });
            const sp = grab.spaces.find((x) => x.slug === to.slug);
            if (!sp) return;
            if (sp.anon) return toast("Tasks made outside can't move into an anonymous space: they carry your name");
            const n = await carryTasks([t.id], { slug: sp.slug, token: sp.token, deviceId: deviceId() }).catch(() => 0);
            if (!n) return toast(`Couldn't move Task ${t.num} into ${sp.title}`);
            // it leaves this void (here and on every screen around) and lives in the space now
            sync({ tg: [t.id] });
            toast(`Task ${t.num} is in ${sp.title} now · open Spaces to see it there`);
          }}
        />
      )}
      <TrashZone />
      {geoFail && !panel && !anonNow && (
        <LocationBlocked
          reason={geoFail}
          onPick={() => (setGeoFail(null), setPicking(true), setEarth(true))}
          onRetry={() => (setGeoFail(null), void shareLocation())}
          onClose={() => setGeoFail(null)}
        />
      )}
      {geoAsk && !panel && !anonNow && (
        <LocationAsk
          onAllow={shareLocation}
          onAnon={() => {
            markAsked();
            setGeoAsk(false);
            requestAnon();
          }}
          onLater={() => {
            markAsked();
            setGeoAsk(false);
            toast("You can turn location on anytime with the red pin at the top");
          }}
        />
      )}
      {panel?.kind === "style" && <StylePicker onClose={() => setPanel(null)} toast={toast} />}
      {panel?.kind === "menu" && (
        <MobileMenu
          space={space?.title ?? null}
          kind={kind}
          onKind={setKind}
          onSend={openMenu}
          onSpaces={() => setPanel({ kind: "space" })}
          onStyle={() => setPanel({ kind: "style" })}
          onHow={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
          onTasks={openTasks}
          taskCount={tasks.filter((t) => !t.doneAt).length}
          onClose={() => setPanel((p) => (p?.kind === "menu" ? null : p))}
          work={work ? { onBoard: () => setBoard(null) } : undefined}
          onBoard={() => setBoard(null)}
          scope={{ value: scope, set: setScope, near: space || anonNow ? null : nearbyCount, mine: mineCount }}
          anon={{
            on: anonOn,
            now: anonNow,
            inSpace: !!space?.anon,
            toggle: (v) => (v ? requestAnon() : toggleAnon(false)),
            card: () => setPanel({ kind: "anon", mode: "status" }),
            newSpace: () => void goAnonSpace().catch(() => {}),
            copyLink: space?.anon ? copyAnonLink : undefined,
          }}
        />
      )}
      {panel?.kind === "group" && groups.get(panel.id) && (
        <GroupPanel
          key={panel.id}
          members={groups.get(panel.id)!}
          now={serverNow}
          onOpen={(o) => setPanel(ownerKey(o.id) ? { kind: "owner", id: o.id } : { kind: "unlock", id: o.id })}
          onClose={() => setPanel(null)}
          onDownloaded={() => {
            refresh();
            broadcast();
          }}
        />
      )}
      {gate && (
        <AnonCard
          mode="gate"
          switchOn={anonOn}
          space={null}
          saved={anonSaved}
          onClose={() => setPanel(null)}
          onTurnOn={noop}
          onTurnOff={() => toggleAnon(false)}
          onCreate={() => goAnonSpace(gate)}
          onPick={(s) => intoAnon(s, gate)}
          onCopy={noop}
        />
      )}
      {anonCard && (
        <AnonCard
          mode={anonCard}
          switchOn={anonOn}
          space={space?.anon ? space : null}
          saved={anonSaved}
          onClose={() => setPanel(null)}
          onTurnOn={(m) => toggleAnon(true, true, m)}
          onTurnOff={() => toggleAnon(false)}
          onCreate={() => goAnonSpace()}
          onPick={(s) => (intoAnon(s), setPanel(null))}
          join={panel?.kind === "anon-join" ? {
            title: anonTitle(panel.slug),
            go: async () => {
              const { slug, code, key } = panel;
              try {
                const s = await joinAnonSpace(slug, code, key);
                await remember(s);
                switchSpace(s);
                setPanel(null);
                toast(`You're in ${s.title} as ${s.handle}`);
              } catch (e) {
                toast((e as Error).message);
                throw e;
              }
            },
          } : undefined}
          link={space?.anon ? anonLink(space) : undefined}
          onCopy={copyAnonLink}
        />
      )}
      {panel?.kind === "send" && !gate && (
        <SendPanel
          key={anonNow ? `anon-${space?.slug}` : "send"}
          items={sendItems}
          anon={anonNow && space?.anon ? { space: space.title, hideNames, setHideNames, asIs: scrubbed?.src === panel.items ? scrubbed.asIs : [], cleaning: scrubbed?.src !== panel.items } : undefined}
          onAddFolder={() => {
            adding.current = true;
            folderInput.current?.click();
          }}
          onAddFiles={() => {
            adding.current = true;
            fileInput.current?.click();
          }}
          onRemove={(i) => setPanel((p) => (p?.kind === "send" && p.items.length > 1 ? { kind: "send", items: p.items.filter((_, k) => k !== i) } : p))}
          onClose={() => setPanel(null)}
          onLaunch={startLaunch}
          tasks={tasks}
          task={wireTo}
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
          preview={panel.preview}
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
            applySync({ og: [id] });
            beam("gone", { ids: [id] });
            setPanel(null);
            toast("Object destroyed");
            broadcast();
          }}
        />
      )}

      <div className="toast" aria-live="polite">
        {toasts.map((t) => (
          // a tap or a swipe (any direction) sends it away
          <div
            key={t.id}
            role="status"
            onClick={() => dropToast(t.id)}
            onPointerDown={(e) => (toastSwipe.current = { id: t.id, x: e.clientX, y: e.clientY })}
            onPointerUp={(e) => {
              const sw = toastSwipe.current;
              toastSwipe.current = null;
              if (sw && sw.id === t.id && Math.hypot(e.clientX - sw.x, e.clientY - sw.y) > 24) dropToast(t.id);
            }}
          >
            {taskLine(t)}
          </div>
        ))}
      </div>

      {work && !panel && board === false && !inArchive && (
        <WorkDock onFiles={() => pickFiles()} onFolder={() => pickFolder()} onText={compose} onNote={() => setPanel({ kind: "bubble" })} onTasks={openTasks} onSpaces={() => setPanel({ kind: "space" })} />
      )}
      {!inArchive && !panel && board === false && !(menu && !menuOut) && (
        <button className={`bub-fab lg lg-press${compact && !work ? " mini" : ""}`} onClick={() => setPanel({ kind: "bubble" })} aria-label="Bubble text: post a note everyone sees">
          <LuMessageCircle aria-hidden />
          <span>Bubble</span>
        </button>
      )}
      {board !== false && (
        <BubbleSpace bubbles={notes} focus={board} {...bubbleActs} onClose={() => setBoard(false)} onCompose={() => setPanel({ kind: "bubble" })} />
      )}
      {panel?.kind === "private" && !anonNow && (
        <GoPrivate
          me={bubbleName() || ""}
          tasks={tasks.filter((t) => isMyTask(t.id)).length}
          onClose={() => setPanel(null)}
          onGo={async (title, handle, pass) => {
            try {
              const mine = tasks.filter((t) => isMyTask(t.id)).map((t) => t.id);
              const s = await createSpace(title, handle, true, pass);
              // invite everyone on this Wi-Fi first, on the public channel (sealed for this network)
              if (netRef.current && inviteKeyRef.current)
                say("invite", { slug: s.slug, title: s.title, by: handle, net: netRef.current, seal: await sealInvite(inviteKeyRef.current, pass) }, spaceRef.current?.slug ?? "");
              const moved = mine.length ? await carryTasks(mine, { slug: s.slug, token: s.token, deviceId: deviceId() }) : 0;
              enterSpace(s);
              try {
                await navigator.clipboard.writeText(`${window.location.origin}${homePath()}?space=${s.slug} · code ${pass}`);
              } catch {}
              toast(`Private: ${s.title} · code ${pass}${moved ? ` · ${moved} ${moved > 1 ? "tasks" : "task"} moved` : ""} · invite copied`);
            } catch (e) {
              toast((e as Error).message);
              throw e;
            }
          }}
        />
      )}
      {invite && !space && !anonNow && (
        <InviteCard
          by={invite.by}
          title={invite.title}
          onClose={() => setInvite(null)}
          onJoin={async () => {
            try {
              const s = await joinSpace(invite.slug, bubbleName() || deviceInfo().label || "Guest", invite.pass);
              setInvite(null);
              enterSpace(s);
            } catch (e) {
              toast((e as Error).message);
              throw e;
            }
          }}
        />
      )}
      {panel?.kind === "bubble" && !gate && (
        <BubbleCompose
          key={panel.edit ? `${panel.edit.id}-${panel.edit.mode}` : "new"}
          defaultName={anonNow ? "" : room?.handle ?? ""}
          anon={anonNow}
          inSpace={space?.title ?? null}
          edit={panel.edit ? (() => {
            const b = notes.find((x) => x.id === panel.edit!.id);
            return b ? { bubble: b, mode: panel.edit!.mode } : null;
          })() : null}
          latest={notes.find((b) => isMyBubble(b.id)) ?? null}
          onChange={async (id, text, mode) => {
            try {
              await editBubble(id, text, mode);
              toast(mode === "edit" ? "Bubble edited" : "Added to your bubble");
              const b = notes.find((x) => x.id === id), at = iso(Date.now() + skew), add = text.trim();
              if (b) sync({ b: mode === "edit" ? { ...b, text: add, added: null, editedAt: at, updatedAt: at } : { ...b, text: `${b.text}\n${add}`.slice(0, 2000), added: b.text.length, updatedAt: at } });
              refresh();
            } catch (e) {
              toast((e as Error).message);
              throw e;
            }
          }}
          onClose={() => setPanel(null)}
          onPost={async (text, by) => {
            try {
              const r = await postBubble(text, by);
              toast("Bubble posted");
              setFitAll((n) => n + 1);
              const at = Date.now() + skew;
              sync({ b: { id: r.id, text: text.trim(), by: by.trim() || room?.handle || null, from: r.from, hue: r.hue, createdAt: iso(at), expiresAt: iso(at + 15 * 60_000), added: null, editedAt: null, updatedAt: null } });
              refresh();
            } catch (e) {
              toast((e as Error).message);
              throw e;
            }
          }}
        />
      )}
      {!work && !inArchive && !panel && board === false && (
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
            <button role="menuitem" className="bubble-btn lg lg-press" style={{ "--i": 0 } as React.CSSProperties} onClick={() => pickFiles()}><span>{Icon.file}</span><b>Files</b><small>photos · videos · docs · anything</small></button>
            <button role="menuitem" className="bubble-btn lg lg-press" style={{ "--i": 1 } as React.CSSProperties} onClick={() => pickFolder()}><span>{Icon.folder}</span><b>Folder</b><small>{touch ? "a folder, or many files at once" : "whole folder, structure intact"}</small></button>
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
