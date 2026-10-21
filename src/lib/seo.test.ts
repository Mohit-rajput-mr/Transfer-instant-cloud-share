import { describe, expect, it } from "vitest";
import { LANGS, SEO, langOf } from "./seo";
import { MAX_LABEL } from "./limits";

// every language's copy must state the real limit (lib/limits.ts): /fr, /ar and /ru once said 2 GB
const all = (l: string) => { const c = SEO[l]; return [c.title, c.description, c.intro, ...c.points, ...c.faq.flatMap((f) => [f.q, f.a])].join("\n"); };
const SIZE = /(\d+)\s?(GB|Go|ГБ|غيغابايت|기가|ギガ)/g;
const max = Number.parseInt(MAX_LABEL, 10);

describe("SEO copy", () => {
  it.each(LANGS)("%s states the real file limit and no other", (l) => {
    const sizes = [...all(l).matchAll(SIZE)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.every((n) => n === max)).toBe(true);
  });
  it("html[lang] follows the address", () => {
    expect(langOf("/fr")).toBe("fr");
    expect(langOf("/ar")).toBe("ar");
    expect(langOf("/")).toBe("en");
    expect(langOf("/work")).toBe("en");
    expect(langOf("/xx")).toBe("en");
  });
});
