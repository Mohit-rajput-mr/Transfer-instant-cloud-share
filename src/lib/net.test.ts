import { describe, expect, it } from "vitest";
import { acquire } from "./net";

describe("turns on the line: someone waiting now goes first", () => {
  it("a waiting device-to-device send gets the next turn before a waiting upload part", async () => {
    const order: string[] = [];
    // four upload parts take the four upload turns
    const ups = [await acquire("up"), await acquire("up"), await acquire("up"), await acquire("up")];
    // while they run, an upload part and a send both wait
    const up5 = acquire("up").then((r) => (order.push("up"), r));
    const serve = acquire("serve").then((r) => (order.push("serve"), r));
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual(["serve"]); // serves don't queue behind uploads
    ups[0]();
    ups[1]();
    await new Promise((r) => setTimeout(r, 10));
    // two uploads still run and someone is being served: uploads keep to two at a time
    expect(order).toEqual(["serve"]);
    ups[2]();
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual(["serve", "up"]);
    ups[3]();
    (await serve)();
    (await up5)();
  });
});
