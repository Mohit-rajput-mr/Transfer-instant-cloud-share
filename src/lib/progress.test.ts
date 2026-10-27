import { describe, expect, it } from "vitest";
import { deriveKeys, encryptChunk, randomBytes, streamDecrypt } from "./crypto";

// owner 2026-10-27: a download sat at "0%" until a whole 8 MB chunk was in. Progress now moves as bytes arrive.
describe("download progress", () => {
  it("reports progress before the first chunk is complete, and ends at the full size", async () => {
    const chunk = 1 << 20; // (the server's minimum chunk size)
    const size = chunk + 1000;
    const { key } = await deriveKeys("x", randomBytes(16), 100_000);
    const nonce = randomBytes(8);
    const plain = new Uint8Array(size).map((_, i) => i % 251);
    const c0 = await encryptChunk(key, nonce, 0, false, plain.slice(0, chunk).buffer);
    const c1 = await encryptChunk(key, nonce, 1, true, plain.slice(chunk).buffer);
    const all = new Uint8Array([...new Uint8Array(c0), ...new Uint8Array(c1)]);
    // the network hands it over in 64 KB pieces, slowly
    const body = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        for (let i = 0; i < all.length; i += 65536) {
          ctrl.enqueue(all.slice(i, i + 65536));
          await new Promise((r) => setTimeout(r, 12));
        }
        ctrl.close();
      },
    });
    const seen: number[] = [];
    const out: Uint8Array[] = [];
    await streamDecrypt({
      url: "", body, key, nonce, size, chunkSize: chunk, signal: undefined,
      sink: { write: async (c) => void out.push(c), close: async () => {}, abort: async () => {} },
      onProgress: (d) => seen.push(d),
    });
    expect(seen.some((d) => d > 0 && d < chunk)).toBe(true);
    expect(seen[seen.length - 1]).toBe(size);
    expect(out.reduce((a, c) => a + c.length, 0)).toBe(size);
  });
});
