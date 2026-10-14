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

const ICE: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  { urls: "stun:stun.cloudflare.com:3478" },
];
/** data-channel message size every browser accepts */
const FRAME = 64 * 1024;
/** pause sending above this much queued, resume below LOW */
const HIGH = 8 * 1024 * 1024;
const LOW = 2 * 1024 * 1024;

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

/** Encrypts the file chunk by chunk and hands out frames, respecting the receiver's pace. */
async function pump(h: Pick<Held, "file" | "key" | "nonce" | "chunkSize">, send: (frame: Uint8Array) => Promise<void>) {
  const total = chunkCount(h.file.size, h.chunkSize);
  for (let i = 0; i < total; i++) {
    const plain = await h.file.slice(i * h.chunkSize, Math.min(h.file.size, (i + 1) * h.chunkSize)).arrayBuffer();
    const enc = await encryptChunk(h.key, h.nonce, i, i === total - 1, plain);
    for (let off = 0; off < enc.length; off += FRAME) await send(enc.subarray(off, off + FRAME));
  }
}

function sendOver(dc: RTCDataChannel) {
  dc.bufferedAmountLowThreshold = LOW;
  return async (frame: Uint8Array) => {
    if (dc.readyState !== "open") throw new Error("closed");
    if (dc.bufferedAmount > HIGH)
      await new Promise<void>((res, rej) => {
        dc.onbufferedamountlow = () => res();
        dc.onclose = () => rej(new Error("closed"));
      });
    dc.send(frame as Uint8Array<ArrayBuffer>);
  };
}

/** Sender: keep this file and answer anyone who asks for it until it burns (`ms` from now). */
export function hold(id: string, file: File, key: CryptoKey, nonce: Uint8Array, chunkSize: number, ms: number) {
  release(id);
  const ch = chan(id);
  const peers = new Set<RTCPeerConnection>();
  ch.on("broadcast", { event: "want" }, async ({ payload }) => {
    const peer = typeof payload?.peer === "string" ? payload.peer : null;
    if (!peer || !payload?.sdp) return;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    peers.add(pc);
    const done = () => {
      peers.delete(pc);
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
        pump(h, sendOver(dc))
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
      await ch.send({ type: "broadcast", event: "answer", payload: { peer, sdp: pc.localDescription } });
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
  h.peers.forEach((pc) => pc.close());
  supabase.removeChannel(h.ch).catch(() => {});
}

export class OfflineError extends Error {}

/**
 * Receiver: the encrypted bytes, straight from the sender's device. The stream ends when the
 * sender has sent everything (or errors if the connection drops); cancelling it hangs up.
 */
export async function pull(id: string, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
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

  const peer = crypto.randomUUID();
  const ch = chan(id);
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const dc = pc.createDataChannel("f", { ordered: true });
  dc.binaryType = "arraybuffer";
  let closed = false;
  const hangUp = () => {
    if (closed) return;
    closed = true;
    try {
      dc.close();
    } catch {}
    pc.close();
    supabase.removeChannel(ch).catch(() => {});
  };

  try {
    const answer = new Promise<RTCSessionDescriptionInit>((res) => {
      ch.on("broadcast", { event: "answer" }, ({ payload }) => {
        if (payload?.peer === peer && payload.sdp) res(payload.sdp);
      });
    });
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error("Can't reach the live network. Check your connection and try again.")), 10_000);
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          clearTimeout(t);
          res();
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
          clearTimeout(t);
          rej(new Error("Can't reach the live network. Check your connection and try again."));
        }
      });
    });
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    await ch.send({ type: "broadcast", event: "want", payload: { peer, sdp: pc.localDescription } });
    const sdp = await Promise.race([
      answer,
      new Promise<never>((_, rej) => setTimeout(() => rej(new OfflineError("The sender is offline. Their Orbi page has to stay open until you have the file.")), 9_000)),
    ]);
    await pc.setRemoteDescription(sdp);
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error("Couldn't connect to the sender's device. One of the networks blocks direct connections; try another Wi-Fi or mobile data.")), 15_000);
      dc.onopen = () => {
        clearTimeout(t);
        res();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          clearTimeout(t);
          rej(new Error("Couldn't connect to the sender's device. One of the networks blocks direct connections; try another Wi-Fi or mobile data."));
        }
      };
    });
  } catch (e) {
    hangUp();
    throw e;
  }

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
