import { LANGS, SITE, pathFor } from "./seo";

/** hreflang map: every language version of the page, plus x-default. */
export function languageAlternates() {
  return { ...Object.fromEntries(LANGS.map((l) => [l, `${SITE}${pathFor(l)}`])), "x-default": SITE };
}
