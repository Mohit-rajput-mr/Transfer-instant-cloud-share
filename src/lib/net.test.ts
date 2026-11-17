import { afterEach, describe, expect, it } from "vitest";
import { acquire, upSpeed } from "./net";

const tick = () => new Promise((r) => setTimeout(r, 10));
const store = (v: string | null) => {
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => v, setItem: () => {} };
};
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("turns on the line", () => {
  it("full speed is the default (owner 2026-11-17): 8 upload parts at once, a send never waits behind them", async () => {
    store(null);
    expect(upSpeed()).toBe("full");
    const ups = await Promise.all([...Array(8)].map(() => acquire("up")));
    const order: string[] = [];
    const up9 = acquire("up").then((r) => (order.push("up"), r));
    const serve = acquire("serve").then((r) => (order.push("serve"), r));
    await tick();
    expect(order).toEqual(["serve"]);
    ups[0]();
    await tick();
    expect(order).toEqual(["serve", "up"]);
    ups.slice(1).forEach((r) => r());
    (await serve)();
    (await up9)();
  });

  it("gentle (picked by the person): 6 parts on a calm line, 3 while someone is served directly", async () => {
    store("gentle");
    expect(upSpeed()).toBe("gentle");
    const order: string[] = [];
    const ups = await Promise.all([...Array(6)].map(() => acquire("up")));
    const up7 = acquire("up").then((r) => (order.push("up"), r));
    const serve = acquire("serve").then((r) => (order.push("serve"), r));
    await tick();
    expect(order).toEqual(["serve"]); // serves don't queue behind uploads
    ups.slice(0, 3).forEach((r) => r());
    await tick();
    expect(order).toEqual(["serve"]); // 3 still run and someone is served: uploads keep to 3
    ups[3]();
    await tick();
    expect(order).toEqual(["serve", "up"]);
    ups.slice(4).forEach((r) => r());
    (await serve)();
    (await up7)();
  });
});
