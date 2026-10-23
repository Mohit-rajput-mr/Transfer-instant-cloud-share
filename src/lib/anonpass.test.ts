import { describe, expect, it } from "vitest";
import { cleanAnonName, passKeys } from "./space";

describe("anonymous name + passcode", () => {
  it("cleans what people type as the name", () => {
    expect(cleanAnonName("K7QX")).toBe("k7qx");
    expect(cleanAnonName("Anonymous · K7QX")).toBe("k7qx");
    expect(cleanAnonName("anon-k7 qx!")).toBe("k7qx");
  });
  it("turns the same name + passcode into the same join code and key on every device", async () => {
    const a = await passKeys("k7qx", "secret12"), b = await passKeys("K7QX", "secret12");
    expect(a).toEqual(b);
    expect(a.code).toMatch(/^[a-f0-9]{24}$/); // what the server accepts as an anonymous join code
    expect(a.key).toMatch(/^[A-Za-z0-9_-]{22}$/); // same shape as a link's key
  });
  it("gives a different code and key for another passcode or another name, and never the passcode itself", async () => {
    const a = await passKeys("k7qx", "secret12");
    expect(await passKeys("k7qx", "secret13")).not.toEqual(a);
    expect(await passKeys("k7qz", "secret12")).not.toEqual(a);
    expect(a.code).not.toContain("secret");
    expect(a.code.slice(0, 16)).not.toBe(a.key.slice(0, 16));
  });
});
