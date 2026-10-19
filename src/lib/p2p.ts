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
import { netCongested } from "./cloud";

const ICE: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  { urls: "stun:stun.cloudflare.com:3478" },
];
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

/**
 * Lanes (v2): one download runs over several peer connections at once. A single connection over the
 * internet tops out far below what both ends' lines can carry (one congestion window, one path); the
 * same file striped over LANES connections moves several times faster. Chunks go to whichever lane is
 * free, each preceded by a small header with its index; the receiver puts them back in order. The
 * receiver grants credit as it writes chunks to disk, so neither side ever buffers more than WINDOW
 * chunks; a chunk lost with a dropped lane is asked for again on another one.
 */
type Session = { total: number; next: number; acked: number; retry: number[]; open: number; done: boolean; waiters: Set<() => void> };
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
    for (;;) {
      cur = await claim(s);
      if (cur < 0) return;
      const enc = await sealChunk(h, cur, s.total);
      await send(JSON.stringify({ c: cur, n: enc.length, t: s.total }));
      for (let off = 0; off < enc.length; off += frame) await send(enc.subarray(off, off + frame));
      cur = -1;
      // the line is choking (cloud upload's probe): leave room between chunks for everything else
      if (netCongested()) await new Promise((r) => setTimeout(r, 300));
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
    const pc = new RTCPeerConnection({ iceServers: ICE });
    peers.add(pc);
    let laneOpen = false;
    const done = () => {
      if (!peers.has(pc)) return;
      peers.delete(pc);
      sending.delete(pc);
      stayAwake(`send-${id}`, sending.size > 0);
      if (sid && laneOpen) {
        const s = sessions.get(sid);
        if (s && --s.open <= 0) {
          s.done = true;
          wakeAll(s);
          sessions.delete(sid);
        }
      }
      setTimeout(() => pc.close(), 1500);
    };
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
          if (!s) sessions.set(sid, (s = { total: chunkCount(h.file.size, h.chunkSize), next: 0, acked: 0, retry: [], open: 0, done: false, waiters: new Set() }));
          s.open++;
          laneOpen = true;
          const sess = s;
          dc.onmessage = (e) => {
            if (typeof e.data !== "string") return;
            try {
              const m = JSON.parse(e.data);
              if (Number.isInteger(m.a) && m.a > sess.acked) sess.acked = m.a;
              if (Number.isInteger(m.r) && m.r >= 0 && m.r < sess.total) sess.retry.push(m.r);
              if (m.fin) sess.done = true;
              wakeAll(sess);
            } catch {}
          };
          dc.addEventListener("close", done);
          serveLane(h, sess, dc, frame);
          return;
        }
        pump(h, sendOver(dc), frame)
          .then(() => {
            // let the last frames drain before closing
            const wait = () => (dc.bufferedAmount > 0 && dc.readyState === "open" ? setTimeout(wait, 100) : (dc.close(), done()));
            wait();
          })
          .catch(() => done());
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
  h.peers.forEach((pc) => pc.close());
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
    const pc = new RTCPeerConnection({ iceServers: ICE });
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
