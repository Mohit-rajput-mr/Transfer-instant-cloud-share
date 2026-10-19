"use client";
import { isAnon } from "./anon";
import { senderKey } from "./client";
import { toHex } from "./crypto";
import { spaceBody } from "./space";

// Bubble text: short plain notes that float in the void as they are (no passcode, nothing to unlock),
// grouped by who sent them. Inside a space only its members see them. They burn like objects.

export interface Bubble {
  id: string;
  text: string;
  by: string | null;
  /** the sender's device group (same as their objects'): one sender's bubbles stack together */
  from: string | null;
  hue: number;
  createdAt: string;
  expiresAt: string;
  /** length of the text before the latest addition (the rest shows as new) */
  added?: number | null;
  editedAt?: string | null;
  updatedAt?: string | null;
}
/** One colour per person, every time: worked out from who they are, never random per bubble. */
export function hueFor(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 360 + 360) % 360;
}
export const senderOf = (b: Pick<Bubble, "from" | "by" | "id">) => b.from || (b.by ? `n:${b.by.toLowerCase()}` : b.id);
export const BUBBLE_MAX = 500;

const OWN = "orbit:bubbles";
const NAME = "orbit:bubble-name";
const read = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(OWN) || "{}");
  } catch {
    return {};
  }
};
const write = (m: Record<string, string>) => {
  try {
    localStorage.setItem(OWN, JSON.stringify(m));
  } catch {}
};
export const isMine = (id: string) => !!read()[id];
/** Is this a person's name, or something else typed into the name box (a note title, an address, a code)?
 *  A name: 1-24 characters, letters (any language) with spaces, dots, apostrophes or hyphens, at most 3 words, no digits.
 *  "Mohit", "Mary-Jane O'Neil", "Rajput M." pass; "24-51 LITTLE NECK REPLY", "comp 1", "a.b@c.com" don't. */
export function looksLikeName(s: string) {
  const t = s.trim();
  return t.length >= 1 && t.length <= 24 && /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(t) && t.split(/\s+/).length <= 3;
}
/** the name this device signs with (never while anonymous: the space gives an alias). A saved value that isn't a
 *  name (e.g. a note title typed into the old unlabelled box) is dropped for good, so it never shows as you. */
export const bubbleName = () => {
  if (isAnon()) return "";
  try {
    const v = localStorage.getItem(NAME) || "";
    if (v && !looksLikeName(v)) {
      localStorage.removeItem(NAME);
      return "";
    }
    return v.trim();
  } catch {
    return "";
  }
};

export async function postBubble(text: string, by: string, life = 15) {
  const owner = toHex(crypto.getRandomValues(new Uint8Array(32)));
  // the name you typed is kept for next time; inside a space you post as your member name, which is not kept as yours
  if (!isAnon() && !spaceBody().space && looksLikeName(by))
    try {
      localStorage.setItem(NAME, by.trim());
    } catch {}
  const from = await senderKey();
  const hue = hueFor(from || `n:${by.toLowerCase()}`);
  const r = await fetch("/api/bubbles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, by, life, owner, from, hue, ...spaceBody() }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.id) throw new Error(d?.error ?? "Could not post the bubble");
  const m = read();
  m[d.id] = owner;
  // forget bubbles that burned long ago
  const ids = Object.keys(m);
  if (ids.length > 200) for (const k of ids.slice(0, ids.length - 200)) delete m[k];
  write(m);
  return { id: d.id as string, from: from || null, hue };
}

export async function burnBubble(id: string) {
  const owner = read()[id];
  if (!owner) return false;
  const r = await fetch("/api/bubbles/burn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, owner }) }).catch(() => null);
  return !!r?.ok;
}

/** Add to your bubble (append) or rewrite it (edit). */
export async function editBubble(id: string, text: string, mode: "append" | "edit") {
  const owner = read()[id];
  if (!owner) throw new Error("Only the sender can change this bubble");
  const r = await fetch("/api/bubbles/edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, owner, text, mode }) });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.error ?? "Could not change the bubble");
}

/** links in a bubble become tappable; everything else stays plain text */
export function splitLinks(text: string): { t: string; href?: string }[] {
  const out: { t: string; href?: string }[] = [];
  const re = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/gi;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ t: text.slice(last, m.index) });
    out.push({ t: m[0], href: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
