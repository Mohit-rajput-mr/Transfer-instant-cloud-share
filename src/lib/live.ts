"use client";
import { around } from "./area";
import { netLoaded } from "./net";

// Live updates over Orbit's own Cloudflare Worker (live/): one WebSocket per room, a room per region of the public
// void (geohash-3, the regions this device's area and the areas around it touch) or per private space. When
// NEXT_PUBLIC_LIVE_URL is not set, Void falls back to Supabase Realtime.
// Built to never lose what it says: anything said while its own room is down waits in an outbox and goes out the
// moment the room is back; a line that went deaf (sleep, Wi-Fi roam, a phone in the background) is found by its
// missing pong and replaced at once; coming back online / into view reconnects now, not after a backoff.

const URL_ = process.env.NEXT_PUBLIC_LIVE_URL ?? "";
export const liveOn = /^wss:\/\//.test(URL_) || /^ws:\/\/(localhost|127\.0\.0\.1)/.test(URL_);

/** the same shape Void already talks to (Supabase's channel): send a broadcast, say who you are */
export type Chan = {
  send(m: { type: "broadcast"; event: string; payload: unknown }): unknown;
  track(p: { id: string }): Promise<unknown>;
};
export type LiveHandlers = {
  /** a message from someone else (`a`: the area it was sent from, in the public void) */
  on(event: string, payload: Record<string, unknown>, a: string | null): void;
  /** this device's own room is connected (true) or has been unreachable for a while (false) */
  status(up: boolean): void;
  /** spaces: the member ids online right now */
  presence?(ids: string[]): void;
  /** a room came back after a drop: whatever was said there meanwhile was missed (debounced, any room) */
  resync?(): void;
};
export type Live = {
  chan: Chan;
  /** the area moved: same rooms are kept (only the tag and the filter change), new ones open, gone ones close */
  update(rooms: string[], area: string): void;
  close(): void;
};

/** the rooms for a place: a space's own, or the regions around an area (own region first); no area: one for everyone */
export function roomsFor(space: string | null, area: string) {
  if (space) return [`s/${space.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64)}`];
  if (!area) return ["r/void"];
  const own = area.slice(0, 3);
  return [own, ...new Set(around(area).map((c) => c.slice(0, 3)).filter((r) => r !== own))].map((r) => `r/${r}`);
}

// said once and must arrive: never folded into a newer one, never held back when the room says "slow"
const MUST = new Set(["landed", "gone", "sync", "pulse", "invite"]);
// ...and safe to say twice (receivers take them once): said again when the line they went out on proves dead
const AGAIN = new Set(["landed", "gone", "sync", "pulse"]);
const BOX_MAX = 100, BOX_TTL = 60_000;
// pinged this often while looked at (every other tick while hidden); no pong in time: the line is dead
const PING_EVERY = 25_000, PONG_WAIT = 8_000, PROBE_WAIT = 3_000;
// a handshake that hangs this long (a network that changed under it) is left to itself and dialled again
const SHAKE_WAIT = 12_000;

type Slot = { room: string; ws: WebSocket | null; tries: number; lastIn: number; was: boolean; gone: boolean; timer?: ReturnType<typeof setTimeout>; probe?: ReturnType<typeof setTimeout> };
type Out = { e: string; p: unknown; at: number; key: string | null };

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
// 1 s, 2 s, 4 s… up to 30 s (looked at and online: 5 s), jittered below that so a whole city doesn't reconnect in the
// same instant
const backoff = (tries: number) => Math.min(visible() && online() ? 5_000 : 30_000, 1000 * 2 ** tries) * (0.5 + Math.random() * 0.5);
// chatter is folded per launch (k), or per part of a batch of them (ls, b): only the newest is worth sending late
const keyOf = (e: string, p: unknown) => {
  if (MUST.has(e)) return null;
  const x = (p ?? {}) as { k?: unknown; ls?: unknown; b?: unknown };
  return `${e}:${Array.isArray(x.ls) ? `*${Number(x.b) || 0}` : typeof x.k === "string" ? x.k : ""}`;
};

/** connect to these rooms; everything said goes to the first. Reconnects by itself until closed. */
export function joinLive(rooms: string[], area: string, h: LiveHandlers): Live {
  let near = area ? new Set(around(area)) : null;
  let closed = false;
  let me: string | null = null;
  // waiting for the own room; and the must-messages that went out on a line not yet proven alive (re-sent if it was dead)
  const box: Out[] = [];
  let sent: (Out & { sentAt: number })[] = [];
  // the room said "slow": chatter waits until then
  let holdUntil = 0;
  let holdT: ReturnType<typeof setTimeout> | undefined;
  let resyncT: ReturnType<typeof setTimeout> | undefined;
  let ticks = 0;

  const fresh = (room: string): Slot => ({ room, ws: null, tries: 0, lastIn: 0, was: false, gone: false });
  let slots = rooms.map(fresh);
  const own = () => {
    const ws = slots[0]?.ws;
    return ws && ws.readyState === 1 ? ws : null;
  };
  const write = (ws: WebSocket, s: string) => {
    try {
      ws.send(s);
      return true;
    } catch {
      return false;
    }
  };
  const put = (ws: WebSocket, o: Out) => {
    if (!write(ws, JSON.stringify({ e: o.e, p: o.p, a: area || null }))) return false;
    if (AGAIN.has(o.e)) {
      const n = Date.now();
      sent = [...sent.filter((x) => n - x.sentAt < BOX_TTL).slice(-49), { ...o, sentAt: n }];
    }
    return true;
  };
  const queue = (o: Out) => {
    if (o.key) {
      const i = box.findIndex((x) => x.key === o.key);
      if (i >= 0) box.splice(i, 1);
    }
    // landed or cancelled: that launch's own progress is no use to anyone any more
    const k = (o.p as { k?: unknown } | null)?.k;
    if ((o.e === "landed" || o.e === "gone") && typeof k === "string") for (let i = box.length - 1; i >= 0; i--) if (box[i].key === `launch:${k}`) box.splice(i, 1);
    box.push(o);
    // full: the oldest chatter goes first, a must-message only when nothing else is left
    while (box.length > BOX_MAX) {
      const i = box.findIndex((x) => !MUST.has(x.e));
      box.splice(i >= 0 ? i : 0, 1);
    }
  };
  const flush = () => {
    const ws = own();
    if (!ws || !box.length) return;
    const n = Date.now();
    const keep: Out[] = [];
    for (const o of box.splice(0)) {
      if (n - o.at > BOX_TTL) continue;
      if ((!MUST.has(o.e) && n < holdUntil) || !put(ws, o)) keep.push(o);
    }
    box.push(...keep);
  };
  const slow = (p: unknown) => {
    const ms = Number((p as { retry?: unknown } | null)?.retry);
    holdUntil = Date.now() + (Number.isFinite(ms) ? Math.min(10_000, Math.max(1000, ms)) : 5000);
    clearTimeout(holdT);
    holdT = setTimeout(flush, holdUntil - Date.now() + 50);
  };
  const ownOpen = (ws: WebSocket) => {
    h.status(true);
    if (me) write(ws, JSON.stringify({ e: "hello", id: me }));
    flush();
  };
  const resyncSoon = () => {
    clearTimeout(resyncT);
    resyncT = setTimeout(() => !closed && h.resync?.(), 300);
  };
  const retry = (s: Slot) => {
    clearTimeout(s.timer);
    s.timer = setTimeout(() => connect(s), backoff(s.tries++));
  };
  const connect = (s: Slot) => {
    clearTimeout(s.timer);
    s.timer = undefined;
    if (closed || s.gone || s.ws) return;
    // offline: no doomed handshakes (each one is a console error); 'online' wakes it sooner than this
    if (!online()) return void (s.timer = setTimeout(() => connect(s), 15_000));
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${URL_}/${s.room}`);
    } catch {
      return retry(s);
    }
    s.ws = ws;
    s.probe = setTimeout(() => {
      s.probe = undefined;
      if (s.ws !== ws || ws.readyState !== 0) return;
      ws.onmessage = ws.onclose = null;
      ws.onopen = () => ws.close(1000, "bye");
      s.ws = null;
      retry(s);
    }, SHAKE_WAIT);
    ws.onopen = () => {
      clearTimeout(s.probe);
      s.probe = undefined;
      s.tries = 0;
      s.lastIn = Date.now();
      const back = s.was;
      s.was = true;
      if (s === slots[0]) ownOpen(ws);
      if (back) resyncSoon();
    };
    ws.onmessage = (e) => {
      s.lastIn = Date.now();
      if (typeof e.data !== "string" || e.data === "pong") return;
      let m: { e?: unknown; p?: unknown; a?: unknown };
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!m || typeof m !== "object") return;
      if (m.e === "slow") return slow(m.p);
      if (m.e === "presence") return h.presence?.(Array.isArray(m.p) ? m.p.filter((x): x is string => typeof x === "string") : []);
      if (typeof m.e !== "string") return;
      const a = typeof m.a === "string" ? m.a : null;
      // a region carries a wide band: only what was said in this area or the ones around it counts here
      if (near && a && !near.has(a)) return;
      h.on(m.e, (m.p && typeof m.p === "object" ? m.p : {}) as Record<string, unknown>, a);
    };
    ws.onclose = () => {
      if (s.ws !== ws) return;
      clearTimeout(s.probe);
      s.probe = undefined;
      s.ws = null;
      if (closed || s.gone) return;
      if (s === slots[0] && s.tries >= 2) h.status(false);
      retry(s);
    };
  };
  /** a line that stopped answering: dropped and dialled again right away */
  const kill = (s: Slot, ws: WebSocket) => {
    if (s.ws !== ws) return;
    ws.onopen = ws.onmessage = ws.onclose = null;
    try {
      ws.close(4000, "dead");
    } catch {}
    s.ws = null;
    clearTimeout(s.probe);
    s.probe = undefined;
    // what went out on it since it last proved alive may never have left: said again on the new line
    if (s === slots[0]) {
      const lost = sent.filter((x) => x.sentAt >= s.lastIn);
      sent = sent.filter((x) => x.sentAt < s.lastIn);
      for (const x of lost) queue({ e: x.e, p: x.p, at: x.at, key: x.key });
    }
    s.tries = 0;
    connect(s);
  };
  /** answered by the room without waking it (free); nothing back within `wait`: dead */
  const probe = (s: Slot, wait: number) => {
    const ws = s.ws;
    if (!ws || ws.readyState !== 1 || s.probe) return;
    const at = Date.now();
    if (!write(ws, "ping")) return kill(s, ws);
    s.probe = setTimeout(() => {
      s.probe = undefined;
      if (s.lastIn < at) kill(s, ws);
    }, wait);
  };
  const tick = setInterval(() => {
    // hidden: every other tick (keeps phones' networks from dropping the line, costs nothing)
    if (!visible() && ticks++ % 2) return;
    slots.forEach((s) => probe(s, PONG_WAIT));
  }, PING_EVERY);
  // back online, back in view, on another network: reconnect what is down now, and check what looks up. While bulk
  // bytes move here (an upload, a device-to-device send) a healthy line's pong can take seconds (bufferbloat): the
  // patient wait then, or every check would kill a good socket and redial, re-fetch and re-send on the choked line
  const wake = () => {
    if (closed || !online()) return;
    for (const s of slots) {
      if (!s.ws) {
        s.tries = 0;
        connect(s);
      } else if (s.ws.readyState === 1 && Date.now() - s.lastIn > 2000) probe(s, netLoaded() ? PONG_WAIT : PROBE_WAIT);
    }
  };
  const onVis = () => visible() && wake();
  const conn = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { connection?: EventTarget & { type?: string; effectiveType?: string } }).connection;
  // 'change' also fires on every estimate update (rtt, downlink: all the time mid-transfer): only another kind of
  // network is news
  const kindOf = () => `${conn?.type ?? ""}|${conn?.effectiveType ?? ""}`;
  let kind = kindOf();
  const onConn = () => {
    const k = kindOf();
    if (k === kind) return;
    kind = k;
    wake();
  };
  window.addEventListener("online", wake);
  window.addEventListener("focus", wake);
  window.addEventListener("pageshow", wake);
  document.addEventListener("visibilitychange", onVis);
  conn?.addEventListener?.("change", onConn);

  /** a socket no longer wanted; one still connecting is let finish and closed then (no half-open handshake errors) */
  const drop = (s: Slot) => {
    s.gone = true;
    clearTimeout(s.timer);
    clearTimeout(s.probe);
    const ws = s.ws;
    s.ws = null;
    if (!ws) return;
    ws.onmessage = ws.onclose = null;
    if (ws.readyState === 0) ws.onopen = () => ws.close(1000, "bye");
    else {
      ws.onopen = null;
      try {
        ws.close(1000, "bye");
      } catch {}
    }
  };

  slots.forEach(connect);
  const chan: Chan = {
    send(m) {
      const o: Out = { e: m.event, p: m.payload, at: Date.now(), key: keyOf(m.event, m.payload) };
      const ws = own();
      if (ws) {
        flush();
        if ((MUST.has(o.e) || o.at >= holdUntil) && put(ws, o)) return;
      }
      queue(o);
    },
    async track(p) {
      me = p.id;
      const ws = own();
      if (ws) write(ws, JSON.stringify({ e: "hello", id: me }));
    },
  };
  return {
    chan,
    update(next, a) {
      if (closed) return;
      area = a;
      near = a ? new Set(around(a)) : null;
      if (next.join(" ") === slots.map((s) => s.room).join(" ")) return;
      const was0 = slots[0];
      const old = new Map(slots.map((s) => [s.room, s]));
      slots = next.map((room) => {
        const s = old.get(room);
        old.delete(room);
        return s ?? fresh(room);
      });
      old.forEach(drop);
      slots.forEach((s) => !s.ws && !s.timer && connect(s));
      // another own room: who this is belongs to the old one; one already open takes over the outbox now
      if (slots[0] !== was0) {
        me = null;
        const ws = own();
        if (ws) ownOpen(ws);
      }
    },
    close() {
      if (closed) return;
      closed = true;
      slots.forEach(drop);
      clearInterval(tick);
      clearTimeout(holdT);
      clearTimeout(resyncT);
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      document.removeEventListener("visibilitychange", onVis);
      conn?.removeEventListener?.("change", onConn);
    },
  };
}
