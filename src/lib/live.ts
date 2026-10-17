"use client";
import { around } from "./area";

// Live updates over Orbit's own Cloudflare Worker (live/): one WebSocket per room, a room per region of the public
// void (geohash-3, the regions this device's area and the areas around it touch) or per private space. When
// NEXT_PUBLIC_LIVE_URL is not set, Void falls back to Supabase Realtime.

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
};

/** the rooms for a place: a space's own, or the regions around an area (own region first); no area: one for everyone */
export function roomsFor(space: string | null, area: string) {
  if (space) return [`s/${space.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64)}`];
  if (!area) return ["r/void"];
  const own = area.slice(0, 3);
  return [own, ...new Set(around(area).map((c) => c.slice(0, 3)).filter((r) => r !== own))].map((r) => `r/${r}`);
}

/** connect to these rooms; everything said goes to the first. Reconnects by itself until closed. */
export function joinLive(rooms: string[], area: string, h: LiveHandlers): { chan: Chan; close(): void } {
  const near = area ? new Set(around(area)) : null;
  let closed = false;
  let me: string | null = null;
  const socks: (WebSocket | null)[] = rooms.map(() => null);
  const timers: ReturnType<typeof setTimeout>[] = [];
  const connect = (i: number, tries = 0) => {
    if (closed) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${URL_}/${rooms[i]}`);
    } catch {
      return void (timers[i] = setTimeout(() => connect(i, tries + 1), backoff(tries)));
    }
    socks[i] = ws;
    let ping: ReturnType<typeof setInterval> | undefined;
    ws.onopen = () => {
      tries = 0;
      // answered by the room without waking it (free): keeps phones' networks from dropping the line
      ping = setInterval(() => ws.readyState === 1 && ws.send("ping"), 45_000);
      if (i === 0) {
        h.status(true);
        if (me) ws.send(JSON.stringify({ e: "hello", id: me }));
      }
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== "string" || e.data === "pong") return;
      let m: { e?: unknown; p?: unknown; a?: unknown };
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.e === "presence") return h.presence?.(Array.isArray(m.p) ? m.p.filter((x): x is string => typeof x === "string") : []);
      if (typeof m.e !== "string") return;
      const a = typeof m.a === "string" ? m.a : null;
      // a region carries a wide band: only what was said in this area or the ones around it counts here
      if (near && a && !near.has(a)) return;
      h.on(m.e, (m.p && typeof m.p === "object" ? m.p : {}) as Record<string, unknown>, a);
    };
    ws.onclose = () => {
      clearInterval(ping);
      if (socks[i] === ws) socks[i] = null;
      if (closed) return;
      if (i === 0 && tries >= 2) h.status(false);
      timers[i] = setTimeout(() => connect(i, tries + 1), backoff(tries));
    };
  };
  rooms.forEach((_, i) => connect(i));
  const chan: Chan = {
    send(m) {
      const ws = socks[0];
      if (ws?.readyState === 1) ws.send(JSON.stringify({ e: m.event, p: m.payload, a: area || null }));
    },
    async track(p) {
      me = p.id;
      const ws = socks[0];
      if (ws?.readyState === 1) ws.send(JSON.stringify({ e: "hello", id: me }));
    },
  };
  return {
    chan,
    close() {
      closed = true;
      timers.forEach(clearTimeout);
      socks.forEach((ws) => ws?.close(1000, "bye"));
    },
  };
}

// 1 s, 2 s, 4 s… up to 30 s, with jitter so a whole city doesn't reconnect in the same instant
const backoff = (tries: number) => Math.min(30_000, 1000 * 2 ** tries) * (0.6 + Math.random() * 0.8);
