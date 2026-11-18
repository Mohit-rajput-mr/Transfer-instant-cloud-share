import { describe, expect, it } from "vitest";
import { EMPTY, cleanVault, mergeVault, missing, type Vault } from "./vault-merge";

const sp = (slug: string, dev = "d1") => ({ slug, title: slug, priv: false, handle: "me", token: "t", chan: "c", dev });

describe("vault merge", () => {
  it("adds what the other device knows and keeps what this one knows", () => {
    const here: Vault = { ...EMPTY, own: { a: "1" }, tasks: { t1: "x" }, name: "", spaces: [sp("one")] };
    const there: Vault = { ...EMPTY, own: { b: "2" }, bubbles: { n1: "y" }, name: "Mohit", spaces: [sp("two", "d2")], trash: [{ key: "o:z", label: "z", at: 5 }] };
    const m = mergeVault(here, there);
    expect(m.own).toEqual({ b: "2", a: "1" });
    expect(m.name).toBe("Mohit");
    expect(m.spaces.map((s) => s.slug).sort()).toEqual(["one", "two"]);
    const need = missing(here, m);
    expect(need.own).toEqual({ b: "2" });
    expect(need.bubbles).toEqual({ n1: "y" });
    expect(need.spaces.map((s) => s.slug)).toEqual(["two"]);
    expect(need.trash.map((t) => t.key)).toEqual(["o:z"]);
    expect(need.name).toBe("Mohit");
  });
  it("this device wins on the same key", () => {
    const m = mergeVault({ ...EMPTY, own: { a: "mine" }, spaces: [sp("s", "here")] }, { ...EMPTY, own: { a: "theirs" }, spaces: [sp("s", "there")] });
    expect(m.own.a).toBe("mine");
    expect(m.spaces[0].dev).toBe("here");
  });
  it("drops junk from the server", () => {
    const v = cleanVault({ own: { a: 1, b: "ok" }, trash: [{ key: 1 }], spaces: [{ slug: "x" }], name: 7 });
    expect(v).toEqual({ ...EMPTY, own: { b: "ok" } });
  });
});
