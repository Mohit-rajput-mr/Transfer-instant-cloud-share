import { DurableObject } from "cloudflare:workers";

// Orbit's live updates. One Durable Object per room: a region of the public void (a geohash-3 cell, ~156 km;
// a device joins the regions its area and the areas around it touch) or a private space. Each holds every
// phone's WebSocket and passes each message on to all the others. Hibernating sockets cost nothing while
// quiet, messages sent out are free, and only messages coming in count (20 to one request), so one free
// account carries thousands of people online at once.

interface Env {
  ROOM: DurableObjectNamespace<Room>;
  /** the stored copies (R2 orbi-storage): f/<id> the ciphertext, k/<id> its download ticket */
  STORE: R2Bucket;
}

// only Orbit's own pages may connect (another site can't spend this account's free allowance)
const ORIGIN = /^(https:\/\/((www\.)?orbitransfer\.com|[a-z0-9-]+\.vercel\.app)|http:\/\/localhost(:\d+)?)$/;
const ROOM = /^\/(r|s)\/([0-9b-hjkmnp-z]{3}|void|[a-z0-9-]{1,64})$/;
// a socket that talks more than this is ignored until the window passes. Chatter (launch progress) and the messages
// said once that must arrive (a landing, a destroy, a change, an invite, who is here) have separate allowances, so a
// big "Separate" send can never crowd out its own landings
const BURST = 120, MUST_CAP = 300, WINDOW = 10_000;
const MUST = /^(landed|gone|sync|pulse|invite|hello)$/;
const MAX_MSG = 16_000;
// what a page may say to the others (slow and presence are said only by the room itself)
const SAID = /^(launch|landed|gone|sync|pulse|invite)$/;
const MAX_SOCKETS = 30_000;

// k (must count) and s (told to slow down this window) came later: sockets attached before carry only n, t, id
type Tag = { n: number; k?: number; s?: boolean; t: number; id: string | null };

// ---- downloads at the edge: GET /f/<id>?t=<ticket>, with a Range ----
// The stored copy lives in one bucket (Western Europe). Read through here, the bytes come from the Cloudflare location
// nearest the reader: the first read of a range travels Cloudflare's own network to the bucket (an R2 binding, faster
// than the S3 API a signed link uses), and it stays cached at that location for the object's short life, so the next
// reader nearby gets it at once. Only a ticket opens a file: the site writes k/<id> when it lets someone
// download (unlock, src/lib/edge.ts on the site), with its end time; destroying a file deletes its tickets, and every request checks the ticket,
// so a burnt file is never served again, cached or not. What is served is ciphertext; keys never come here.
// The ticket (k/<id>) holds a hash of the file's token and until when it opens it.
const FILE = /^\/f\/([a-z0-9]{4,12})$/;
const TICKET = /^[A-Za-z0-9_-]{32}$/;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Range", "Access-Control-Expose-Headers": "Content-Range, Content-Length, X-Edge, X-Edge-Missing", "Access-Control-Max-Age": "86400" };

async function file(req: Request, env: Env, ctx: ExecutionContext, id: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
  if (req.method !== "GET") return new Response("method", { status: 405, headers: CORS });
  const url = new URL(req.url);
  const t = url.searchParams.get("t") ?? "";
  if (!TICKET.test(t)) return new Response("forbidden", { status: 403, headers: CORS });
  const ticket = await env.STORE.head(`k/${id}`);
  const until = Number(ticket?.customMetadata?.exp ?? 0);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((x) => x.toString(16).padStart(2, "0")).join("");
  if (!ticket || ticket.customMetadata?.tok !== hash || !(until > Date.now())) return new Response("forbidden", { status: 403, headers: CORS });
  const m = /^bytes=(\d+)-(\d+)$/.exec(req.headers.get("Range") ?? "");
  if (!m) return new Response("range required", { status: 416, headers: CORS });
  const from = Number(m[1]), to = Number(m[2]);
  if (to < from || to - from > 64 * 1024 * 1024) return new Response("range", { status: 416, headers: CORS });
  // the cache knows a range by the object and its bytes, never by the ticket (every reader shares it)
  const key = new Request(`https://orbit-edge.cache/f/${id}/${from}-${to}`);
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, { status: 206, headers: { ...Object.fromEntries(hit.headers), ...CORS, "X-Edge": "hit" } });
  const obj = await env.STORE.get(`f/${id}`, { range: { offset: from, length: to - from + 1 } });
  // (marked, so the site can tell "not uploaded yet" from a worker that doesn't serve files at all)
  if (!obj || !("body" in obj)) return new Response("not stored", { status: 404, headers: { ...CORS, "Cache-Control": "no-store", "X-Edge-Missing": "1" } });
  const end = Math.min(to, obj.size - 1);
  const headers = { "Content-Type": "application/octet-stream", "Content-Range": `bytes ${from}-${end}/${obj.size}`, "Content-Length": String(end - from + 1) };
  const [a, b] = obj.body.tee();
  // kept at this location while the file can live (at most its ticket's end, 3 hours), then gone by itself
  const ttl = Math.max(60, Math.min(3 * 3600, Math.floor((until - Date.now()) / 1000)));
  ctx.waitUntil(cache.put(key, new Response(b, { status: 200, headers: { ...headers, "Cache-Control": `public, max-age=${ttl}` } })).catch(() => {}));
  return new Response(a, { status: 206, headers: { ...headers, ...CORS, "Cache-Control": "private, no-store", "X-Edge": "miss" } });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response("orbit live", { headers: { "Cache-Control": "no-store" } });
    const f = FILE.exec(url.pathname);
    if (f) return file(req, env, ctx, f[1]);
    const m = ROOM.exec(url.pathname);
    if (!m) return new Response("not found", { status: 404 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected a websocket", { status: 426 });
    if (!ORIGIN.test(req.headers.get("Origin") ?? "")) return new Response("forbidden", { status: 403 });
    // space rooms are named by their channel id, region rooms by their cell
    if (m[1] === "r" && !/^([0-9b-hjkmnp-z]{3}|void)$/.test(m[2])) return new Response("bad room", { status: 400 });
    return env.ROOM.getByName(`${m[1]}:${m[2]}`).fetch(req);
  },
} satisfies ExportedHandler<Env>;

export class Room extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // keep-alive pings are answered without waking the room (and without counting)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(): Promise<Response> {
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS) return new Response("full", { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ n: 0, t: Date.now(), id: null } satisfies Tag);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string" || raw.length > MAX_MSG) return;
    // read first: which allowance it counts against depends on what it is
    let m: { e?: unknown; p?: unknown; a?: unknown; id?: unknown };
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (!m || typeof m !== "object") return;
    const tag = (ws.deserializeAttachment() as Tag | null) ?? { n: 0, t: 0, id: null };
    const now = Date.now();
    if (now - tag.t > WINDOW) (tag.t = now), (tag.n = 0), (tag.k = 0), (tag.s = false);
    const must = typeof m.e === "string" && MUST.test(m.e);
    if (must ? (tag.k = (tag.k ?? 0) + 1) > MUST_CAP : ++tag.n > BURST) {
      // chatter over its allowance: the sender is told once per window, so it holds its progress until then
      // (pages from before this ignore an event they don't know)
      if (!must && !tag.s) {
        tag.s = true;
        try {
          ws.send(JSON.stringify({ e: "slow", p: { retry: Math.max(0, tag.t + WINDOW - now) }, a: null }));
        } catch {}
      }
      return ws.serializeAttachment(tag);
    }
    // who is here (spaces): a device says its member id once, everyone gets the list of ids online
    if (m.e === "hello") {
      tag.id = typeof m.id === "string" ? m.id.slice(0, 64) : null;
      ws.serializeAttachment(tag);
      return this.presence();
    }
    ws.serializeAttachment(tag);
    // (slow and presence are said only by the room itself: a page can't pass them off to the others)
    // only what pages really say: one room now carries the whole worldwide void, so nothing else is passed on to everyone
    if (typeof m.e !== "string" || !SAID.test(m.e)) return;
    const out = JSON.stringify({ e: m.e, p: m.p ?? null, a: typeof m.a === "string" ? m.a.slice(0, 8) : null });
    for (const c of this.ctx.getWebSockets()) {
      if (c === ws) continue;
      try {
        c.send(out);
      } catch {}
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    const had = (ws.deserializeAttachment() as Tag | null)?.id;
    try {
      ws.close(code === 1005 ? 1000 : code, "bye");
    } catch {}
    if (had) this.presence(ws);
  }

  async webSocketError(ws: WebSocket) {
    const had = (ws.deserializeAttachment() as Tag | null)?.id;
    if (had) this.presence(ws);
  }

  private presence(gone?: WebSocket) {
    const socks = this.ctx.getWebSockets().filter((c) => c !== gone);
    const ids = [...new Set(socks.map((c) => (c.deserializeAttachment() as Tag | null)?.id).filter((x): x is string => !!x))];
    const out = JSON.stringify({ e: "presence", p: ids, a: null });
    for (const c of socks) {
      try {
        c.send(out);
      } catch {}
    }
  }
}
