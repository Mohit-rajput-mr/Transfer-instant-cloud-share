// Zero-knowledge transfer crypto. The passcode never leaves the device:
// PBKDF2(passcode) -> 512 bits: [AES-256-GCM key | auth proof].
// Server only stores sha256(auth proof). Files are encrypted in chunks so any size streams.

export const CHUNK = 8 * 1024 * 1024;
export const ITERATIONS = 310_000;
const TAG = 16;

const enc = new TextEncoder();

export const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
export const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export async function deriveKeys(passcode: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passcode.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, base, 512),
  );
  const key = await crypto.subtle.importKey("raw", bits.slice(0, 32), "AES-GCM", false, ["encrypt", "decrypt"]);
  return { key, auth: toHex(bits.slice(32)) };
}

function iv(nonce: Uint8Array, index: number) {
  const out = new Uint8Array(12);
  out.set(nonce.slice(0, 8));
  new DataView(out.buffer).setUint32(8, index);
  return out;
}

// The final-chunk flag in the AAD stops truncation attacks.
const aad = (last: boolean) => new Uint8Array([last ? 1 : 0]);

export const chunkCount = (size: number, chunk = CHUNK) => Math.max(1, Math.ceil(size / chunk));
export const encryptedSize = (size: number, chunk = CHUNK) => size + chunkCount(size, chunk) * TAG;

export async function encryptChunk(key: CryptoKey, nonce: Uint8Array, index: number, last: boolean, data: ArrayBuffer) {
  return new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv(nonce, index) as BufferSource, additionalData: aad(last) as BufferSource }, key, data),
  );
}

export async function decryptChunk(key: CryptoKey, nonce: Uint8Array, index: number, last: boolean, data: Uint8Array) {
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv(nonce, index) as BufferSource, additionalData: aad(last) as BufferSource }, key, data as BufferSource),
  );
}

export interface DownloadSink {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

// Streams the encrypted blob, decrypting chunk by chunk.
export async function streamDecrypt(opts: {
  url: string;
  /** the ciphertext from elsewhere (a peer connection) instead of fetching `url` */
  body?: ReadableStream<Uint8Array>;
  key: CryptoKey;
  nonce: Uint8Array;
  size: number;
  chunkSize: number;
  sink: DownloadSink;
  onProgress: (done: number) => void;
  signal?: AbortSignal;
}) {
  const { url, body, key, nonce, size, chunkSize, sink, onProgress, signal } = opts;
  const total = chunkCount(size, chunkSize);
  const expected = (i: number) => (i < total - 1 ? chunkSize : size - (total - 1) * chunkSize) + TAG;

  let stream = body;
  if (!stream) {
    const res = await fetch(url, { signal, cache: "no-store" });
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
    stream = res.body;
  }
  const reader = stream.getReader();

  let index = 0;
  let buf = new Uint8Array(expected(0));
  let filled = 0;
  let done = 0;
  // bytes arriving count too (before, nothing moved until a whole 8 MB chunk was in and decrypted: a far or slow
  // line sat at "0%" for many seconds). Said at most every 100 ms
  let told = 0;
  const arriving = () => {
    const t = performance.now();
    if (t - told < 100) return;
    told = t;
    onProgress(Math.min(size, done + Math.max(0, filled - TAG)));
  };

  try {
    while (index < total) {
      const { value, done: eof } = await reader.read();
      if (eof) break;
      let off = 0;
      while (off < value.length && index < total) {
        const take = Math.min(buf.length - filled, value.length - off);
        buf.set(value.subarray(off, off + take), filled);
        filled += take;
        off += take;
        if (filled === buf.length) {
          const plain = await decryptChunk(key, nonce, index, index === total - 1, buf);
          await sink.write(plain);
          done += plain.length;
          onProgress(done);
          index++;
          if (index < total) {
            buf = new Uint8Array(expected(index));
            filled = 0;
          }
        }
      }
      arriving();
    }
  } catch (e) {
    // a bad chunk or a sink that can't write (a full disk): hang up too, or a peer connection stays open and the
    // sender's turn for it (lib/net.ts 'serve') is never given back
    reader.cancel(e).catch(() => {});
    throw e;
  }
  // everything is in: hang up (a peer connection closes here)
  reader.cancel().catch(() => {});
  if (index < total) throw new Error("Transfer was cut short");
  await sink.close();
}
