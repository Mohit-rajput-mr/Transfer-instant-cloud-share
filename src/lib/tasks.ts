"use client";
import { ownerKey, senderKey } from "./client";
import { toHex } from "./crypto";
import { spaceBody } from "./space";
import { bubbleName } from "./bubbles";

// Tasks: one line each, numbered (Task 1, Task 2…). Anyone who can see one ticks it done; files and
// folders are wired to a task when they are sent (their name tag carries the task id). They burn too.

export interface Task {
  id: string;
  num: number;
  text: string;
  by: string | null;
  from: string | null;
  createdAt: string;
  expiresAt: string;
  doneAt: string | null;
  doneBy: string | null;
  /** who it is for */
  assignee: string | null;
  /** the route its writer set (stage names, in order) and where it is now (-1: not started) */
  route: string[];
  stage: number;
  /** every move along the route */
  log: { i: number; name: string; by: string | null; at: string }[];
  editedAt: string | null;
}
/** ready-made stages to build a route from */
export const STAGES = ["In progress", "AI reviewing", "Generating zip", "Zip sent to email", "Waiting on client", "In review", "Approved", "Delivered"];
export const TASK_MAX = 140;

const OWN = "orbit:tasks";
const read = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(OWN) || "{}");
  } catch {
    return {};
  }
};
export const isMyTask = (id: string) => !!read()[id];

const post = async (url: string, body: object) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.error ?? "Something went wrong");
  return d;
};

/** "Send the logo @Sofia" → the line, and Sofia */
export function parseTask(line: string) {
  const m = /\s@([\p{L}\p{N}._-]{1,24})\s*$/u.exec(" " + line.trim());
  return m ? { text: line.trim().slice(0, -m[0].length + 1).trim() || line.trim(), assignee: m[1] } : { text: line.trim(), assignee: "" };
}

// Pro: a code minted in Mission HQ, kept on this device; it lets tasks stay up to 8 hours
const PRO = "orbit:pro";
/** Testing mode: Pro for everyone (keep in step with PRO_FOR_ALL in lib/pro.ts) */
export const PRO_FOR_ALL = true;
export const proCode = () => {
  if (PRO_FOR_ALL) return "ALL";
  try {
    return localStorage.getItem(PRO) || "";
  } catch {
    return "";
  }
};
export async function redeemPro(code: string) {
  const c = code.trim().toUpperCase();
  const d = await post("/api/pro", { code: c });
  if (!d?.ok) throw new Error("That Pro code doesn't work");
  try {
    localStorage.setItem(PRO, c);
  } catch {}
}
export const dropPro = () => {
  try {
    localStorage.removeItem(PRO);
  } catch {}
};
export const TASK_LIVES: [number, string][] = [[30, "30 min"], [60, "1 h"], [120, "2 h"], [240, "4 h"], [480, "8 h"]];

export async function addTask(line: string, by = bubbleName(), life = 30) {
  const owner = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const { text, assignee } = parseTask(line);
  const d = await post("/api/tasks", { text, assignee, by, life, pro: proCode() || undefined, owner, from: await senderKey(), ...spaceBody() });
  const m = read();
  m[d.id] = owner;
  const ids = Object.keys(m);
  if (ids.length > 300) for (const k of ids.slice(0, ids.length - 300)) delete m[k];
  try {
    localStorage.setItem(OWN, JSON.stringify(m));
  } catch {}
  return d as { id: string; num: number };
}

export const tickTask = (id: string, done: boolean, by = bubbleName()) => post("/api/tasks/done", { id, done, by, ...spaceBody() });

export async function burnTask(id: string) {
  const owner = read()[id];
  if (!owner) return false;
  return !!(await post("/api/tasks/burn", { id, owner }).catch(() => null))?.ok;
}

export const assignTask = (id: string, assignee: string) => post("/api/tasks/assign", { id, assignee, ...spaceBody() });
/** is this task for me (by the name I go by here)? */
export const forMe = (t: Task, me: string) => !!me && !!t.assignee && t.assignee.toLowerCase() === me.toLowerCase();

/** the writer changes the line, the route, or moves it to a stage */
export async function editTask(id: string, change: { text?: string; route?: string[]; stage?: number }, by = bubbleName()) {
  const owner = read()[id];
  if (!owner) throw new Error("Only the person who wrote this task can change it");
  return post("/api/tasks/edit", { id, owner, by, ...change });
}

/** the writer moves a task up (-1) or down (+1) the list */
export async function moveTask(id: string, dir: -1 | 1) {
  const owner = read()[id];
  if (!owner) throw new Error("Only the person who wrote this task can move it");
  return post("/api/tasks/order", { id, owner, dir });
}

/** Going private with the team: every task this device wrote here moves into the space just entered. */
export async function carryTasks(ids: string[], to: { slug: string; token: string; deviceId: string }) {
  const own = read();
  let n = 0;
  for (const id of ids) {
    if (!own[id]) continue;
    const r = await post("/api/tasks/move", { id, owner: own[id], space: to.slug, spaceToken: to.token, deviceId: to.deviceId }).catch(() => null);
    if (r?.ok) n++;
  }
  return n;
}

// The invite to a private space travels over the public void's live channel, so its passcode is sealed with a
// key only devices on the same network can make (the server-side network fingerprint, given to each device
// for its own network only). Others on the channel see the invite but cannot open it.
const inviteKey = async (net: string) =>
  crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`orbi-invite:${net}`)), "AES-GCM", false, ["encrypt", "decrypt"]);
export async function sealInvite(net: string, pass: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await inviteKey(net), new TextEncoder().encode(pass)));
  return { iv: toHex(iv), c: toHex(c) };
}
export async function openInvite(net: string, sealed: { iv: string; c: string }) {
  const hex = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));
  try {
    const p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: hex(sealed.iv) }, await inviteKey(net), hex(sealed.c));
    return new TextDecoder().decode(p);
  } catch {
    return null;
  }
}

/** wire one of my objects to a task after sending it (null unwires it) */
export async function wireObject(id: string, task: string | null) {
  const owner = ownerKey(id);
  if (!owner) throw new Error("Only the sender can wire this file");
  return post(`/api/transfers/${id}/wire`, { owner, task });
}
