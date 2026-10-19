"use client";

// /work speaks plain office words: notes, files, workspace, send, expire, delete (instead of bubbles, objects, the
// void, launch, burn, destroy). One pass over what is on screen, kept up by a MutationObserver, so every card and
// toast follows without each component knowing about /work. What people wrote (notes, names, tasks) is never touched.

const RULES: [RegExp, string][] = [
  [/\bbubble board\b/gi, "notes board"],
  [/\bbubble text\b/gi, "note"],
  [/\bbubbles\b/gi, "notes"],
  [/\bbubble\b/gi, "note"],
  [/\bpublic void\b/gi, "public workspace"],
  [/\bvoid\b/gi, "workspace"],
  [/\bobjects\b/gi, "files"],
  [/\bobject\b/gi, "file"],
  [/\bdevices? in orbit\b/gi, "online"],
  [/\bin orbit\b/gi, "online"],
  [/\binto orbit\b/gi, "to the workspace"],
  [/\blaunching\b/gi, "sending"],
  [/\blaunched\b/gi, "sent"],
  [/\blaunches\b/gi, "sends"],
  [/\blaunch\b/gi, "send"],
  [/\bburns? up\b/gi, "expires"],
  [/\bburns in\b/gi, "expires in"],
  [/\bburned\b/gi, "expired"],
  [/\bburns\b/gi, "expires"],
  [/\bburn\b/gi, "expire"],
  [/\bdestroyed\b/gi, "deleted"],
  [/\bdestroy\b/gi, "delete"],
  [/\bspheres?\b/gi, "file"],
  [/\bballs?\b/gi, "file"],
];

/** keep the case of what it replaces: "Bubble" → "Note", "BUBBLE" → "NOTE" */
function cased(src: string, to: string) {
  if (src === src.toUpperCase() && /[A-Z]/.test(src)) return to.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return to[0].toUpperCase() + to.slice(1);
  return to;
}
export function workWords(s: string) {
  if (!s || !/[a-z]/i.test(s)) return s;
  let out = s;
  for (const [re, to] of RULES) out = out.replace(re, (m) => cased(m, to));
  return out;
}

// people's own words, and things they named
const KEEP = "input, textarea, [contenteditable], script, style, .bub p, .bub-quote, .bub-stack header b, .tb-text, .tb-file, .tb-edit, .orb-label, .orb-by, .mname, .zname, .zoom-title b, .d-title, .note-out, .rich, .viewer-body, .viewer-name, .sp-title, .sp-card b, .room-name b, .w-title b, .bs-rail b, .bs-rail small, .dock-main .ellip, .dl-name, .tb-head b, .tw-tag, [data-keep-words]";
const ATTRS = ["placeholder", "aria-label", "title"];

// what the rewrite replaced, per node / attribute: [the page's own words, ours]. Stopping (the switch back to the
// classic look, lib/view.ts) puts the own words back wherever ours are still showing; React only rewrites text whose
// rendered value changed, so without this the classic look would keep saying "workspace" and "file".
type Swap = [own: string, ours: string];
let texts = new Map<Text, Swap>();
let attrs = new Map<Element, Map<string, Swap>>();

function fixText(n: Text) {
  const p = n.parentElement;
  if (!p || p.closest(KEEP)) return;
  const v = n.nodeValue ?? "";
  // our own rewrite coming back through the observer
  if (texts.get(n)?.[1] === v) return;
  const w = workWords(v);
  if (w === v) return void texts.delete(n);
  texts.set(n, [v, w]);
  n.nodeValue = w;
}
function fixEl(el: Element) {
  if (el.closest("script, style")) return;
  const keep = !!el.closest(KEEP) && !el.matches("input, textarea");
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v == null || (keep && a !== "placeholder")) continue;
    const had = attrs.get(el);
    if (had?.get(a)?.[1] === v) continue;
    const w = workWords(v);
    if (w === v) {
      had?.delete(a);
      continue;
    }
    if (had) had.set(a, [v, w]);
    else attrs.set(el, new Map([[a, [v, w]]]));
    el.setAttribute(a, w);
  }
}
function sweep(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return fixText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  fixEl(el);
  el.querySelectorAll("*").forEach(fixEl);
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let t = walk.nextNode(); t; t = walk.nextNode()) fixText(t as Text);
}
// nodes React threw away: forget them now and then (a long session mounts many toasts and cards)
function prune() {
  if (texts.size > 4000) for (const n of texts.keys()) if (!n.isConnected) texts.delete(n);
  if (attrs.size > 2000) for (const el of attrs.keys()) if (!el.isConnected) attrs.delete(el);
}

/** start rewriting the page's words (returns a stop function that puts the page's own words back) */
export function speakWork() {
  texts = new Map();
  attrs = new Map();
  sweep(document.body);
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") fixText(m.target as Text);
      else if (m.type === "attributes") fixEl(m.target as Element);
      else m.addedNodes.forEach(sweep);
    }
    prune();
  });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  return () => {
    // pending records are dropped on purpose: a value React changed since is already its own words
    mo.disconnect();
    const t = texts, a = attrs;
    texts = new Map();
    attrs = new Map();
    for (const [n, [own, ours]] of t) if (n.isConnected && n.nodeValue === ours) n.nodeValue = own;
    for (const [el, m] of a) {
      if (!el.isConnected) continue;
      for (const [k, [own, ours]] of m) if (el.getAttribute(k) === ours) el.setAttribute(k, own);
    }
  };
}
