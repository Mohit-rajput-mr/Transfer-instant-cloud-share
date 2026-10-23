import { describe, expect, it } from "vitest";
import { acquire } from "./net";

describe("turns on the line: someone waiting now goes first", () => {
  it("a waiting device-to-device send gets the next turn before a waiting upload part", async () => {
    const order: string[] = [];
    // two uploads take the two upload turns
    const a = await acquire("up"), b = await acquire("up");
    // while they run, an upload part and a send both wait
    const up3 = acquire("up").then((r) => (order.push("up"), r));
    const serve = acquire("serve").then((r) => (order.push("serve"), r));
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual(["serve"]); // serves don't queue behind uploads
    a();
    await new Promise((r) => setTimeout(r, 10));
    // one upload still runs and someone is being served: uploads keep to one at a time
    expect(order).toEqual(["serve"]);
    b();
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual(["serve", "up"]);
    (await serve)();
    (await up3)();
  });
});
