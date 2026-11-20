// Offline send / receive: two browsers on the same Wi-Fi (or one phone's hotspot) with NO internet.
// The page itself comes from the service worker cache (public/offline-sw.js). The WebRTC handshake, which normally travels
// over the site's realtime channel (lib/p2p.ts), is carried by the people instead: the sender shows a QR code (its offer),
// the receiver scans it and shows its own (the answer), the sender scans that. Then the files stream straight across the
// local network over a data channel (DTLS-encrypted by WebRTC itself). No server, no STUN, no TURN is involved.
import { deflateSync, inflateSync, strToU8, strFromU8 } from "fflate";

export type Role = "offer" | "answer";
const PREFIX: Record<Role, string> = { offer: "ORBI-O1:", answer: "ORBI-A1:" };

// only the SDP lines a data-channel-only connection needs (keeps the QR small enough to scan off a phone screen)
const KEEP = /^(v=|o=|s=|t=|c=|m=|a=group:|a=msid-semantic|a=ice-ufrag:|a=ice-pwd:|a=ice-options:|a=fingerprint:|a=setup:|a=mid:|a=sctp-port:|a=max-message-size:|a=candidate:)/;
export function slimSdp(sdp: string): string {
  return sdp.split(/\r?\n/).filter((l) => KEEP.test(l)).join("\r\n") + "\r\n";
}

const b64u = (u: Uint8Array) => { let s = ""; for (const b of u) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64u = (s: string) => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

/** offer/answer SDP → a short text code (QR or copy/paste) */
export function encodeSignal(role: Role, sdp: string): string {
  return PREFIX[role] + b64u(deflateSync(strToU8(slimSdp(sdp)), { level: 9 }));
}
/** a scanned/pasted code → SDP; throws a readable error when it is the wrong kind or damaged */
export function decodeSignal(role: Role, code: string): string {
  const c = code.trim();
  const other: Role = role === "offer" ? "answer" : "offer";
  if (c.startsWith(PREFIX[other])) throw new Error(role === "offer" ? "That's a reply code. Scan the sender's code here." : "That's a sender's code. Scan the receiver's reply here.");
  if (!c.startsWith(PREFIX[role])) throw new Error("That isn't an Orbi offline code.");
  try { const sdp = strFromU8(inflateSync(unb64u(c.slice(PREFIX[role].length)))); if (!sdp.startsWith("v=")) throw 0; return sdp; }
  catch { throw new Error("The code is damaged. Scan it again."); }
}

// ---- wire format on the data channel: JSON control messages (strings) + raw binary chunks
export type Meta = { name: string; size: number; type: string };
export type Msg = { k: "hello"; files: Meta[] } | { k: "file"; i: number } | { k: "end"; i: number } | { k: "done" };
export const CHUNK = 64 * 1024;
const HIGH = 4 * 1024 * 1024, LOW = 1024 * 1024;

/** wait for ICE gathering (local candidates only: no servers) so the code carries every candidate */
export function gathered(pc: RTCPeerConnection, ms = 4000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((ok) => { const t = setTimeout(ok, ms); pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); ok(); } }); });
}
export const newPeer = () => new RTCPeerConnection({ iceServers: [] });
/** Browsers hide this device's local address behind a random "….local" name (mDNS) unless the page is using the camera
 *  or microphone. Those names often don't resolve between two phones (hotspots, some routers), so keep the camera on
 *  (needed anyway to scan the other code) while the code is made: it then carries the real local address.
 *  Returns a function that turns the camera off again. Never throws (no camera / refused: the .local name is used). */
export async function revealLocalAddress(): Promise<() => void> {
  try { const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); return () => s.getTracks().forEach((t) => t.stop()); } catch { return () => {}; }
}

/** sender: stream the files over an open channel, with back-pressure; progress(bytesSent) */
export async function sendFiles(dc: RTCDataChannel, files: File[], progress: (sent: number) => void): Promise<void> {
  dc.bufferedAmountLowThreshold = LOW;
  const drain = () => (dc.bufferedAmount < HIGH ? Promise.resolve() : new Promise<void>((ok) => dc.addEventListener("bufferedamountlow", () => ok(), { once: true })));
  dc.send(JSON.stringify({ k: "hello", files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })) } satisfies Msg));
  let sent = 0;
  for (let i = 0; i < files.length; i++) {
    dc.send(JSON.stringify({ k: "file", i } satisfies Msg));
    for (let off = 0; off < files[i].size; off += CHUNK) {
      if (dc.readyState !== "open") throw new Error("The connection dropped.");
      await drain();
      const buf = await files[i].slice(off, off + CHUNK).arrayBuffer();
      dc.send(buf); sent += buf.byteLength; progress(sent);
    }
    dc.send(JSON.stringify({ k: "end", i } satisfies Msg));
  }
  dc.send(JSON.stringify({ k: "done" } satisfies Msg));
  await drain();
}

/** receiver: collect the stream into Blobs; onMeta when the list arrives, progress(bytes), resolves with the files */
export function receiveFiles(dc: RTCDataChannel, onMeta: (m: Meta[]) => void, progress: (got: number) => void): Promise<File[]> {
  dc.binaryType = "arraybuffer";
  return new Promise((ok, fail) => {
    let meta: Meta[] = [], cur = -1, parts: ArrayBuffer[] = [], got = 0; const out: File[] = [];
    dc.onmessage = (e) => {
      if (typeof e.data === "string") {
        let m: Msg; try { m = JSON.parse(e.data); } catch { return; }
        if (m.k === "hello") { meta = m.files; onMeta(meta); }
        else if (m.k === "file") { cur = m.i; parts = []; }
        else if (m.k === "end" && meta[m.i]) { const f = meta[m.i]; out.push(new File(parts, f.name, { type: f.type || "application/octet-stream" })); parts = []; }
        else if (m.k === "done") ok(out);
      } else if (cur >= 0) { parts.push(e.data as ArrayBuffer); got += (e.data as ArrayBuffer).byteLength; progress(got); }
    };
    dc.onclose = () => fail(new Error("The connection closed before everything arrived."));
  });
}
