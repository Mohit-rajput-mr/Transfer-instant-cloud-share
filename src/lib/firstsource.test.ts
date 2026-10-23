import { beforeEach, describe, expect, it, vi } from "vitest";

// the two sources, controlled by each test
const ctl = vi.hoisted(() => ({
  pull: null as null | ((id: string) => Promise<ReadableStream<Uint8Array>>),
  stored: null as null | ((stop: () => boolean) => Promise<boolean>),
  cancelled: 0,
}));
vi.mock("./realtime", () => ({ supabase: { channel: () => ({}), removeChannel: async () => {} } }));
vi.mock("./p2p", async (orig) => ({ ...(await orig<object>()), pull: (id: string) => ctl.pull!(id) }));
vi.mock("./cloud", async (orig) => ({
  ...(await orig<object>()),
  waitStored: (_u: string, _ms: number, _s: AbortSignal | undefined, stop: () => boolean) => ctl.stored!(stop),
  fetchStored: () => new ReadableStream({ start: (c) => (c.enqueue(new Uint8Array([2])), c.close()) }),
}));
import { firstSource } from "./transfer";

const direct = () => new ReadableStream<Uint8Array>({ start: (c) => (c.enqueue(new Uint8Array([1])), c.close()), cancel: () => void ctl.cancelled++ });
const later = <T>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const fail = (ms: number, m: string) => new Promise<never>((_, r) => setTimeout(() => r(new Error(m)), ms));

describe("firstSource: direct connection vs stored copy, the first ready wins", () => {
  beforeEach(() => (ctl.cancelled = 0));
  it("the stored copy lands while the handshake is still running: it serves, the late direct stream is hung up", async () => {
    ctl.pull = () => later(80, direct());
    ctl.stored = () => later(10, true);
    const s = await firstSource("x", "u", 1, undefined);
    expect(s.stored).toBe(true);
    await later(120, 0);
    expect(ctl.cancelled).toBe(1);
  });
  it("the direct connection opens first: it serves and the stored copy stops being asked", async () => {
    let stopSeen = false;
    ctl.pull = () => later(10, direct());
    ctl.stored = async (stop) => { await later(60, 0); stopSeen = stop(); return false; };
    const s = await firstSource("x", "u", 1, undefined);
    expect(s.stored).toBe(false);
    await later(80, 0);
    expect(stopSeen).toBe(true);
  });
  it("the direct path fails (network blocks it): the stored copy still serves when it lands", async () => {
    ctl.pull = () => fail(5, "blocked");
    ctl.stored = () => later(40, true);
    expect((await firstSource("x", "u", 1, undefined)).stored).toBe(true);
  });
  it("both give up: the direct path's reason is the one shown", async () => {
    ctl.pull = () => fail(5, "The sender is offline");
    ctl.stored = () => later(20, false);
    await expect(firstSource("x", "u", 1, undefined)).rejects.toThrow("The sender is offline");
  });
});
