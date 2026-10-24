"use client";
// Direct, device-to-device transfer. No file byte ever touches a server or a storage bucket:
// the sender's browser keeps the File and streams it, encrypted chunk by chunk (the same AES-GCM
// format as before), over a WebRTC data channel straight to the receiver's browser.
//
// The only thing relayed is the handshake: one "want" (the receiver's offer) and one "answer",
// sent over the realtime channel the site already uses for live presence. Public STUN servers
// tell each browser its own public address; nothing passes through them either.
import { supabase, type RealtimeChannel } from "./realtime";
import { chunkCount, encryptChunk } from "./crypto";
import { stayAwake } from "./wake";
import { isAnon } from "./anon";
import { acquire, netCongested } from "./net";

const ICE: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  { urls: "stun:stun.cloudflare.com:3478" },
];
// + a relay (Cloudflare's TURN, nearest city by anycast) for networks that block a direct line (offices, campuses,
// some mobile carriers): without it such a pair waits for the stored copy. Short-lived credentials from /api/turn,
// fetched once and kept until shortly before they end; none configured (or slow): STUN only, as before
let relay: { at: number; until: number; list: RTCIceServer[] } | null = null;
async function ice(): Promise<RTCIceServer[]> {
  if (relay && relay.until > Date.now()) return [...ICE, ...relay.list];
  if (relay && Date.now() - relay.at < 60_000) return ICE;
  const r = await fetch("/api/turn", { cache: "no-store", signal: AbortSignal.timeout(2500) }).catch(() => null);
  const d = r?.ok ? ((await r.json().catch(() => null)) as { iceServers?: RTCIceServer[]; ttl?: number } | null) : null;
  const list = Array.isArray(d?.iceServers) ? d.iceServers : [];
  relay = { at: Date.now(), until: list.length ? Date.now() + Math.max(60, (d?.ttl ?? 3600) - 300) * 1000 : 0, list };
  return [...ICE, ...list];
}
/** data-channel message size every browser accepts */
const FRAME = 64 * 1024;
/** pause sending above this much queued, resume below LOW */
const HIGH = 8 * 1024 * 1024;
const LOW = 2 * 1024 * 1024;
/** largest data-channel message we use when the connection allows it */
const MAX_FRAME = 256 * 1024;
/** parallel connections per download */
const LANES = 4;
/** bytes per second one connection must beat to stay a single connection */
const FAST = 25 * 1024 * 1024;
/** chunks (8 MB each) a sender may run ahead of what the receiver has written */
const WINDOW = 8;

export const P2P_PREFIX = "p2p:";
export const isP2P = (url: string) => url.startsWith(P2P_PREFIX);

type Held = { file: File; key: CryptoKey; nonce: Uint8Array; chunkSize: number; ch: RealtimeChannel; timer: ReturnType<typeof setTimeout>; peers: Set<RTCPeerConnection> };
const held = new Map<string, Held>();
/** each connection's own wrap-up (its turn on the line given back): pc.close() fires no event to run it */
const enders = new WeakMap<RTCPeerConnection, () => void>();

const chan = (id: string) => supabase.channel(`orbit-p2p-${id}`, { config: { broadcast: { self: false } } });

/** Waits for ICE gathering (no trickle: one message each way), capped so a slow network can't stall. */
function gathered(pc: RTCPeerConnection, ms = 1500) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((res) => {
    const t = setTimeout(res, ms);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        res();
      }
    });
  });
}

/** Encrypts one chunk of the file. */
async function sealChunk(h: Pick<Held, "file" | "key" | "nonce" | "chunkSize">, i: number, total: number) {
  const plain = await h.file.slice(i * h.chunkSize, Math.min(h.file.size, (i + 1) * h.chunkSize)).arrayBuffer();
  return encryptChunk(h.key, h.nonce, i, i === total - 1, plain);
}

/** Encrypts the file chunk by chunk and hands out frames, respecting the receiver's pace. */
async function pump(h: Pick<Held, "file" | "key" | "nonce" | "chunkSize">, send: (frame: Uint8Array) => Promise<void>, frame = FRAME) {
  const total = chunkCount(h.file.size, h.chunkSize);
  for (let i = 0; i < total; i++) {
    const enc = await sealChunk(h, i, total);
    for (let off = 0; off < enc.length; off += frame) await send(enc.subarray(off, off + frame));
  }
}

function sendOver(dc: RTCDataChannel) {
  dc.bufferedAmountLowThreshold = LOW;
  return async (frame: Uint8Array | string) => {
    if (dc.readyState !== "open") throw new Error("closed");
    if (dc.bufferedAmount > HIGH)
      await new Promise<void>((res, rej) => {
        dc.onbufferedamountlow = () => res();
        dc.addEventListener("close", () => rej(new Error("closed")), { once: true });
      });
    if (dc.readyState !== "open") throw new Error("closed");
    dc.send(frame as Uint8Array<ArrayBuffer>);
  };
}

/** Biggest message both ends take: Chrome 256 KB, Firefox more; 64 KB when unknown. */
const frameFor = (pc: RTCPeerConnection) => Math.max(16 * 1024, Math.min(MAX_FRAME, pc.sctp?.maxMessageSize || FRAME));

// an address only reachable on this network. A '.local' name (or none shown) is an mDNS host candidate, which only
// resolves on the same link; a public IPv6 literal could be anywhere, so it counts as the internet
const LOCAL = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|127\.|fe[89ab][0-9a-f]:|f[cd][0-9a-f]{2}:|::1$)/i;
/** Both ends talk over local addresses (same Wi-Fi / LAN): the bytes never cross this device's internet line. */
async function nearby(pc: RTCPeerConnection) {
  try {
    const stats = await pc.getStats();
    let pair: { localCandidateId?: string; remoteCandidateId?: string } | undefined;
    stats.forEach((r) => {
      if (r.type === "transport" && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId);
    });
    // (Firefox has no transport entry: the pair itself says it is the one in use)
    if (!pair)
      stats.forEach((r) => {
        if (r.type === "candidate-pair" && r.selected) pair = r;
      });
    const loc = pair?.localCandidateId ? stats.get(pair.localCandidateId) : undefined;
    const rem = pair?.remoteCandidateId ? stats.get(pair.remoteCandidateId) : undefined;
    const addr = String(rem?.address ?? rem?.ip ?? "");
    return loc?.candidateType === "host" && rem?.candidateType === "host" && (!addr || addr.endsWith(".local") || LOCAL.test(addr));
  } catch {
    return false;
  }
}
/** A send to someone over the internet waits for a turn on this device's line (lib/net.ts: 2 at once, 1 when it is
 *  busy), so several receivers can't choke it together; same Wi-Fi goes straight away. The receiver just sees an open
 *  connection that starts a little later (nothing new on the wire, older pages included). */
async function serveTurn(pc: RTCPeerConnection, signal: AbortSignal) {
  if (await nearby(pc)) return { far: false, release: () => {} };
  const release = await acquire("serve", signal).catch(() => () => {});
  return { far: true, release };
}

/**
 * Lanes (v2): one download runs over several peer connections at once. A single connection over the
 * internet tops out far below what both ends' lines can carry (one congestion window, one path); the
 * same file striped over LANES connections moves several times faster. Chunks go to whichever lane is
 * free, each preceded by a small header with its index; the receiver puts them back in order. The
 * receiver grants credit as it writes chunks to disk, so neither side ever buffers more than WINDOW
 * chunks; a chunk lost with a dropped lane is asked for again on another one.
 */
type Session = {
  total: number; next: number; acked: number; retry: number[]; open: number; done: boolean; waiters: Set<() => void>;
  /** its turn on the line (taken by the first lane, shared by all of them), and the stop for one still waiting */
  turn: Promise<{ far: boolean; release: () => void }> | null; quit: AbortController;
};
const sessions = new Map<string, Session>();
const wakeAll = (s: Session) => {
  const w = [...s.waiters];
  s.waiters.clear();
  w.forEach((f) => f());
};

/** Next chunk for a lane: a re-request first, then the next new one within the receiver's credit. -1 when finished. */
async function claim(s: Session): Promise<number> {
  for (;;) {
    if (s.done) return -1;
    if (s.retry.length) return s.retry.shift()!;
    if (s.next < s.total && s.next < s.acked + WINDOW) return s.next++;
    await new Promise<void>((res) => s.waiters.add(res));
  }
}

async function serveLane(h: Held, s: Session, dc: RTCDataChannel, frame: number) {
  const send = sendOver(dc);
  let cur = -1;
  try {
    const { far } = await s.turn!;
    for (;;) {
      cur = await claim(s);
      if (cur < 0) return;
      const t = performance.now();
      const enc = await sealChunk(h, cur, s.total);
      await send(JSON.stringify({ c: cur, n: enc.length, t: s.total }));
      for (let off = 0; off < enc.length; off += frame) await send(enc.subarray(off, off + frame));
      cur = -1;
      // the line is choking (the upload watch, lib/net.ts): over the internet, leave room after each chunk for
      // everything else, in proportion to how long it took to go out
      if (far && netCongested()) await new Promise((r) => setTimeout(r, Math.min(5000, Math.max(300, (performance.now() - t) / 2))));
    }
  } catch {
    // the lane dropped mid-chunk: another lane sends it
    if (cur >= 0 && !s.done) {
      s.retry.push(cur);
      wakeAll(s);
    }
  }
}

/** Sender: keep this file and answer anyone who asks for it until it burns (`ms` from now). */
export function hold(id: string, file: File, key: CryptoKey, nonce: Uint8Array, chunkSize: number, ms: number) {
  // anonymous: never device to device (the other side would see this IP)
  if (isAnon()) return;
  release(id);
  const ch = chan(id);
  const peers = new Set<RTCPeerConnection>();
  const sending = new Set<RTCPeerConnection>();
  ch.on("broadcast", { event: "want" }, async ({ payload }) => {
    const peer = typeof payload?.peer === "string" ? payload.peer : null;
    if (!peer || !payload?.sdp) return;
    // a v2 receiver names its download session; older receivers get the whole file on one connection
    const sid = payload.v === 2 && typeof payload.sid === "string" ? payload.sid.slice(0, 64) : null;
    const pc = new RTCPeerConnection({ iceServers: await ice() });
    peers.add(pc);
    let laneOpen = false;
    // (an older receiver's single connection: its own turn, given back when it ends)
    const quit = new AbortController();
    const done = () => {
      if (!peers.has(pc)) return;
      peers.delete(pc);
      sending.delete(pc);
      stayAwake(`send-${id}`, sending.size > 0);
      quit.abort();
      if (sid && laneOpen) {
        const s = sessions.get(sid);
        if (s && --s.open <= 0) {
          s.done = true;
          wakeAll(s);
          sessions.delete(sid);
          s.quit.abort();
          s.turn?.then((t) => t.release());
        }
      }
      setTimeout(() => pc.close(), 1500);
    };
    enders.set(pc, done);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") done();
    };
    pc.ondatachannel = (ev) => {
      const dc = ev.channel;
      dc.binaryType = "arraybuffer";
      dc.onopen = () => {
        const h = held.get(id);
        if (!h) return dc.close();
        // someone is downloading from this device right now: keep the screen on until they're done
        sending.add(pc);
        stayAwake(`send-${id}`, true);
        const frame = frameFor(pc);
        if (sid) {
          let s = sessions.get(sid);
          if (!s) sessions.set(sid, (s = { total: chunkCount(h.file.size, h.chunkSize), next: 0, acked: 0, retry: [], open: 0, done: false, waiters: new Set(), turn: null, quit: new AbortController() }));
          s.open++;
          laneOpen = true;
          const sess = s;
          sess.turn ??= serveTurn(pc, sess.quit.signal);
          dc.onmessage = (e) => {
            if (typeof e.data !== "string") return;
            try {
              const m = JSON.parse(e.data);
              if (Number.isInteger(m.a) && m.a > sess.acked) sess.acked = m.a;
              // (only a chunk that went out already: one never sent comes in order anyway, and while this send waits
              // for its turn the receiver keeps asking for chunk 0, which must not queue it up many times)
              if (Number.isInteger(m.r) && m.r >= 0 && m.r < sess.next && !sess.retry.includes(m.r)) sess.retry.push(m.r);
              if (m.fin) sess.done = true;
              wakeAll(sess);
            } catch {}
          };
          dc.addEventListener("close", done);
          serveLane(h, sess, dc, frame);
          return;
        }
        let release = () => {};
        // (hung up while it waits for its turn: the turn goes to the next one)
        dc.addEventListener("close", done);
        serveTurn(pc, quit.signal)
          .then((t) => ((release = t.release), quit.signal.aborted ? Promise.reject(new Error("gone")) : pump(h, sendOver(dc), frame)))
          .then(() => {
            // let the last frames drain before closing
            const wait = () => (dc.bufferedAmount > 0 && dc.readyState === "open" ? setTimeout(wait, 100) : (dc.close(), done()));
            wait();
          })
          .catch(() => done())
          .finally(() => release());
      };
    };
    try {
      await pc.setRemoteDescription(payload.sdp);
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
      await ch.send({ type: "broadcast", event: "answer", payload: { peer, sdp: pc.localDescription, v: 2 } });
    } catch {
      done();
    }
  });
  ch.subscribe();
  held.set(id, { file, key, nonce, chunkSize, ch, peers, timer: setTimeout(() => release(id), ms) });
}

export const holding = (id: string) => held.has(id);
export const heldIds = () => [...held.keys()];

/** Sender: stop offering it (burnt, deleted, or the page is going away). */
export function release(id: string) {
  const h = held.get(id);
  if (!h) return;
  held.delete(id);
  clearTimeout(h.timer);
  stayAwake(`send-${id}`, false);
  [...h.peers].forEach((pc) => (enders.get(pc)?.(), pc.close()));
  supabase.removeChannel(h.ch).catch(() => {});
}

export class OfflineError extends Error {}

/**
 * Receiver: the encrypted bytes, straight from the sender's device. The stream ends when the
 * sender has sent everything (or errors if the connection drops); cancelling it hangs up.
 */
export async function pull(id: string, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  if (isAnon()) throw new OfflineError("anonymous: cloud only");
  // sent from this very tab: no network at all
  const mine = held.get(id);
  if (mine) {
    let stop = false;
    return new ReadableStream<Uint8Array>({
      start(ctrl) {
        pump(mine, async (f) => {
          if (stop) throw new Error("cancelled");
          ctrl.enqueue(f.slice());
        })
          .then(() => ctrl.close())
          .catch((e) => !stop && ctrl.error(e));
      },
      cancel() {
        stop = true;
      },
    });
  }

  const ch = chan(id);
  const sid = crypto.randomUUID();
  const answers = new Map<string, (p: { sdp: RTCSessionDescriptionInit; v?: number }) => void>();
  ch.on("broadcast", { event: "answer" }, ({ payload }) => {
    if (typeof payload?.peer === "string" && payload.sdp) answers.get(payload.peer)?.(payload);
  });
  const conns = new Set<RTCPeerConnection>();
  let closed = false;
  const hangUp = () => {
    if (closed) return;
    closed = true;
    conns.forEach((pc) => pc.close());
    supabase.removeChannel(ch).catch(() => {});
  };

  /** One peer connection to the sender, opened. */
  const dial = async (first: boolean) => {
    const peer = crypto.randomUUID();
    const pc = new RTCPeerConnection({ iceServers: await ice() });
    conns.add(pc);
    const dc = pc.createDataChannel("f", { ordered: true });
    dc.binaryType = "arraybuffer";
    try {
      const answer = new Promise<{ sdp: RTCSessionDescriptionInit; v?: number }>((res) => answers.set(peer, res));
      await pc.setLocalDescription(await pc.createOffer());
      await gathered(pc);
      await ch.send({ type: "broadcast", event: "want", payload: { peer, sdp: pc.localDescription, v: 2, sid } });
      const a = await Promise.race([
        answer,
        new Promise<never>((_, rej) => setTimeout(() => rej(first ? new OfflineError("The sender is offline. Their Orbi page has to stay open until you have the file.") : new Error("lane")), 9_000)),
      ]);
      await pc.setRemoteDescription(a.sdp);
      await new Promise<void>((res, rej) => {
        const fail = () => rej(new Error("Couldn't connect to the sender's device. One of the networks blocks direct connections; try another Wi-Fi or mobile data."));
        const t = setTimeout(fail, 15_000);
        dc.onopen = () => {
          clearTimeout(t);
          res();
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed") {
            clearTimeout(t);
            fail();
          }
        };
      });
      return { pc, dc, v: a.v };
    } catch (e) {
      conns.delete(pc);
      pc.close();
      throw e;
    } finally {
      answers.delete(peer);
    }
  };

  let first: Awaited<ReturnType<typeof dial>>;
  try {
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error("Can't reach the live network. Check your connection and try again.")), 10_000);
      ch.subscribe((st) => {
        if (st === "SUBSCRIBED") {
          clearTimeout(t);
          res();
        } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
          clearTimeout(t);
          rej(new Error("Can't reach the live network. Check your connection and try again."));
        }
      });
    });
    first = await dial(true);
  } catch (e) {
    hangUp();
    throw e;
  }

  // a sender still running the older page sends the whole file down the one connection
  if (first.v !== 2) return single(first.pc, first.dc, hangUp, signal);
  return striped(first, dial, hangUp, signal);
}

/** The whole file down one connection (senders on the older page). */
function single(pc: RTCPeerConnection, dc: RTCDataChannel, hangUp: () => void, signal?: AbortSignal) {
  return new ReadableStream<Uint8Array>({
    start(ctrl) {
      dc.onmessage = (e) => ctrl.enqueue(new Uint8Array(e.data as ArrayBuffer));
      dc.onclose = () => {
        try {
          ctrl.close();
        } catch {}
        hangUp();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          try {
            ctrl.error(new Error("The connection to the sender dropped. Try again."));
          } catch {}
          hangUp();
        }
      };
      signal?.addEventListener("abort", () => {
        try {
          ctrl.error(new DOMException("Aborted", "AbortError"));
        } catch {}
        hangUp();
      });
    },
    cancel: hangUp,
  });
}

/** The file striped over LANES connections, reassembled in order (see `Session`). */
function striped(
  first: { pc: RTCPeerConnection; dc: RTCDataChannel },
  dial: (first: boolean) => Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel }>,
  hangUp: () => void,
  signal?: AbortSignal,
) {
  type Lane = { pc: RTCPeerConnection; dc: RTCDataChannel; cur: { i: number; buf: Uint8Array; filled: number } | null };
  const lanes = new Set<Lane>();
  const chunks = new Map<number, Uint8Array>();
  let total = -1;
  let emitted = 0;
  let finished = false;
  let failed: Error | null = null;
  let lastData = Date.now();
  let firstData = 0;
  let got = 0;
  let wake: (() => void) | null = null;
  const poke = () => {
    const w = wake;
    wake = null;
    w?.();
  };
  const control = (m: object) => {
    const msg = JSON.stringify(m);
    for (const l of lanes)
      if (l.dc.readyState === "open") {
        try {
          l.dc.send(msg);
          return;
        } catch {}
      }
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(watchdog);
    control({ fin: 1 });
    // let the goodbye reach the sender before hanging up
    setTimeout(hangUp, 300);
  };
  const attach = (l: Lane) => {
    lanes.add(l);
    l.dc.onmessage = (e) => {
      lastData = Date.now();
      if (!firstData) firstData = lastData;
      if (typeof e.data !== "string") got += (e.data as ArrayBuffer).byteLength;
      if (typeof e.data === "string") {
        try {
          const m = JSON.parse(e.data);
          if (Number.isInteger(m.c) && Number.isInteger(m.n) && m.n > 0 && m.n < 1 << 28) {
            if (Number.isInteger(m.t)) total = m.t;
            l.cur = { i: m.c, buf: new Uint8Array(m.n), filled: 0 };
          }
        } catch {}
        return;
      }
      const c = l.cur;
      if (!c) return;
      const d = new Uint8Array(e.data as ArrayBuffer);
      const take = Math.min(d.length, c.buf.length - c.filled);
      c.buf.set(take === d.length ? d : d.subarray(0, take), c.filled);
      c.filled += take;
      if (c.filled === c.buf.length) {
        if (c.i >= emitted && !chunks.has(c.i)) chunks.set(c.i, c.buf);
        l.cur = null;
        poke();
      }
    };
    const lost = () => {
      if (!lanes.has(l)) return;
      lanes.delete(l);
      // the chunk this lane was carrying comes again on another one
      if (l.cur && !finished) control({ r: l.cur.i });
      l.cur = null;
      try {
        l.pc.close();
      } catch {}
      if (!lanes.size && !finished) {
        failed = new Error("The connection to the sender dropped. Try again.");
        poke();
      }
    };
    l.dc.addEventListener("close", lost);
    l.pc.addEventListener("connectionstatechange", () => {
      if (l.pc.connectionState === "failed") lost();
    });
  };
  attach({ ...first, cur: null });
  // Fast path (same Wi-Fi, nearby): one connection already fills the line and more only cost CPU.
  // Slower than FAST after a short sample: open the other lanes; one that can't connect is simply not used.
  let widened = false;
  const widen = () => {
    if (widened || finished) return;
    widened = true;
    for (let k = 1; k < LANES; k++)
      dial(false)
        .then((c) => (finished ? c.pc.close() : attach({ ...c, cur: null })))
        .catch(() => {});
  };
  // a chunk lost without a trace (its lane died before its header arrived): ask again
  const watchdog = setInterval(() => {
    if (!widened && firstData && Date.now() - firstData > 1500 && got / ((Date.now() - firstData) / 1000) < FAST) widen();
    if (finished || chunks.has(emitted) || Date.now() - lastData < 5000) return;
    if (![...lanes].some((l) => l.cur?.i === emitted)) control({ r: emitted });
    lastData = Date.now();
  }, 1000);
  signal?.addEventListener("abort", () => {
    failed = new DOMException("Aborted", "AbortError") as unknown as Error;
    poke();
  });

  return new ReadableStream<Uint8Array>(
    {
      async pull(ctrl) {
        for (;;) {
          if (failed) {
            finish();
            ctrl.error(failed);
            return;
          }
          if (total >= 0 && emitted >= total) {
            finish();
            ctrl.close();
            return;
          }
          const c = chunks.get(emitted);
          if (c) {
            chunks.delete(emitted);
            emitted++;
            ctrl.enqueue(c);
            // credit: the sender may run WINDOW chunks past what has been written
            control({ a: emitted });
            return;
          }
          await new Promise<void>((res) => (wake = res));
        }
      },
      cancel: finish,
    },
    { highWaterMark: 0 },
  );
}
