"use client";
// The profile a logged-in user keeps on their account (Supabase Auth user metadata), applied on every device they
// log in on: the name and colour their files and notes carry, and how their sends start (life, download limit,
// passcode, style). Sending still works the same signed out.
import type { User } from "@supabase/supabase-js";
import { looksLikeName } from "./bubbles";
import { setSkin } from "./skins";
import { validSkin } from "./skin-list";

export type Prefs = { life?: number; max?: number | null; locked?: boolean; skin?: string };
export interface Profile { name: string; hue: number | null; dob: string; prefs: Prefs }

export const HUES = [0, 25, 45, 90, 140, 175, 200, 225, 265, 300, 330] as const;
const LIVES = [5, 10, 15, 20, 25, 30];
const MAXES = [1, 2, 3, 5, 10];

export function profileOf(u: User | null | undefined): Profile {
  const m = (u?.user_metadata ?? {}) as Record<string, unknown>;
  const name = (typeof m.name === "string" && m.name) || (typeof m.full_name === "string" && m.full_name) || "";
  const hue = Number(m.hue);
  const p = (m.prefs && typeof m.prefs === "object" ? m.prefs : {}) as Record<string, unknown>;
  const prefs: Prefs = {};
  if (LIVES.includes(Number(p.life))) prefs.life = Number(p.life);
  if (p.max === null || MAXES.includes(Number(p.max))) prefs.max = p.max === null ? null : Number(p.max);
  if (typeof p.locked === "boolean") prefs.locked = p.locked;
  if (validSkin(p.skin)) prefs.skin = p.skin as string;
  return { name: name.trim(), hue: Number.isInteger(hue) && hue >= 0 && hue < 360 ? hue : null, dob: typeof m.dob === "string" ? m.dob : "", prefs };
}

const put = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
  } catch {}
};

/** this device takes the account's profile: the name notes are signed with, and the send defaults */
export function applyProfile(u: User | null | undefined) {
  if (!u) return;
  const p = profileOf(u);
  // notes and tasks are signed with the first name (≤ 24 letters, a name); uploads get the full account name on the server
  const short = p.name.split(/\s+/).slice(0, 3).join(" ").slice(0, 24);
  if (short && looksLikeName(short)) put("orbit:bubble-name", short);
  if (p.prefs.life != null) put("orbit:pref:life", p.prefs.life);
  if (p.prefs.max !== undefined) put("orbit:pref:max", p.prefs.max);
  if (p.prefs.locked !== undefined) put("orbit:pref:locked", p.prefs.locked);
  if (p.prefs.skin) setSkin(p.prefs.skin);
}
