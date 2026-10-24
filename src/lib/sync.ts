"use client";
import type { Bubble } from "./bubbles";
import type { Orb } from "./client";
import { MAX_FILE_BYTES } from "./limits";
import { validSkin } from "./skin-list";
import type { Task } from "./tasks";

// Live changes: whatever one screen does (a bubble posted or burned, a task added, ticked or removed, an object
// destroyed) travels over realtime as the record itself, so every other screen shows it at once instead of
// waiting for the shared list. The list is cached at the edge for a few seconds, so for a short while it can
// still show the old state: a change is kept over any list made before it happened (see Void's refresh).

/** od: files someone just downloaded (+1 download each) · ov / ox: files someone started / stopped looking at
 *  (live viewers ±1) · vw: of those, the ones this device opened for the first time (+1 view) */
export type SyncMsg = { b?: Bubble; bg?: string[]; t?: Task; tg?: string[]; og?: string[]; od?: string[]; ov?: string[]; ox?: string[]; vw?: string[] };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").slice(0, max) : null);
const time = (v: unknown) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null);
const ids = (v: unknown, re: RegExp) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && re.test(x)).slice(0, 200) : []);
export const BUBBLE_ID = /^b[a-z0-9]{9}$/;
export const TASK_ID = /^t[a-z0-9]{9}$/;
export const ORB_ID = /^[a-z0-9]{4,12}$/;

/** a bubble someone beamed: only what a real one can hold (no bubble outlives 30 minutes) */
export function cleanBubble(v: unknown, serverNow: number): Bubble | null {
  const b = v as Record<string, unknown> | null;
  if (!b || typeof b !== "object" || typeof b.id !== "string" || !BUBBLE_ID.test(b.id)) return null;
  const text = str(b.text, 2000)?.trim();
  const createdAt = time(b.createdAt), expiresAt = time(b.expiresAt);
  if (!text || !createdAt || !expiresAt) return null;
  if (Date.parse(expiresAt) > serverNow + 31 * 60_000) return null;
  const hue = Number.isInteger(b.hue) && (b.hue as number) >= 0 && (b.hue as number) < 360 ? (b.hue as number) : 0;
  return {
    id: b.id, text, hue, createdAt, expiresAt,
    by: str(b.by, 24) || null,
    from: str(b.from, 64) || null,
    added: Number.isInteger(b.added) && (b.added as number) >= 0 && (b.added as number) <= text.length ? (b.added as number) : null,
    editedAt: time(b.editedAt),
    updatedAt: time(b.updatedAt),
  };
}

/** a task someone beamed (no task outlives 8 hours) */
export function cleanTask(v: unknown, serverNow: number): Task | null {
  const t = v as Record<string, unknown> | null;
  if (!t || typeof t !== "object" || typeof t.id !== "string" || !TASK_ID.test(t.id)) return null;
  const text = str(t.text, 140)?.trim();
  const createdAt = time(t.createdAt), expiresAt = time(t.expiresAt);
  if (!text || !createdAt || !expiresAt || !Number.isInteger(t.num) || (t.num as number) < 1 || (t.num as number) > 99_999) return null;
  if (Date.parse(expiresAt) > serverNow + 8 * 60 * 60_000 + 60_000) return null;
  const route = Array.isArray(t.route) ? t.route.map((s) => str(s, 40)?.trim() || "").filter(Boolean).slice(0, 12) : [];
  const stage = Number.isInteger(t.stage) ? Math.max(-1, Math.min(route.length - 1, t.stage as number)) : -1;
  const log = Array.isArray(t.log)
    ? t.log.slice(-60).flatMap((e) => {
        const x = e as Record<string, unknown> | null;
        const at = time(x?.at);
        return x && Number.isInteger(x.i) && at ? [{ i: x.i as number, name: str(x.name, 40) || "", by: str(x.by, 24) || null, at }] : [];
      })
    : [];
  return {
    id: t.id, num: t.num as number, text, createdAt, expiresAt, route, stage, log,
    by: str(t.by, 24) || null,
    from: str(t.from, 64) || null,
    doneAt: time(t.doneAt),
    doneBy: str(t.doneBy, 24) || null,
    assignee: str(t.assignee, 24) || null,
    editedAt: time(t.editedAt),
  };
}

const int = (v: unknown, lo: number, hi: number) => (Number.isSafeInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : null);
const B64 = /^[A-Za-z0-9+/_=-]{1,128}$/, NET = /^[0-9a-f]{12}$/, FROM = /^[a-f0-9]{10}$/, SLUG = /^[a-z0-9-]{1,64}$/;
const LIVES = [5, 10, 15, 20, 25, 30];
/** an object someone beamed as it landed: the finalize answer, the same public shape the list gives. No object
 * outlives 30 minutes from now, except one wired to a task: that one lives as long as the task (8 hours at most) */
export function cleanOrb(v: unknown, serverNow: number): Orb | null {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o !== "object" || typeof o.id !== "string" || !ORB_ID.test(o.id)) return null;
  const fileName = str(o.fileName, 180)?.trim(), mime = str(o.mime, 120)?.trim();
  const createdAt = time(o.createdAt), expiresAt = time(o.expiresAt);
  const size = int(o.size, 0, MAX_FILE_BYTES), iterations = int(o.iterations, 100_000, 2_000_000), hue = int(o.hue, 0, 359);
  if (!fileName || !mime || !createdAt || !expiresAt || size === null || iterations === null || hue === null) return null;
  if (typeof o.salt !== "string" || !B64.test(o.salt) || (o.status !== "ready" && o.status !== "sealed")) return null;
  const maxDownloads = o.maxDownloads == null ? null : int(o.maxDownloads, 1, 999);
  if (o.maxDownloads != null && maxDownloads === null) return null;
  const task = typeof o.task === "string" && TASK_ID.test(o.task) ? o.task : null;
  const exp = Date.parse(expiresAt);
  if (exp <= serverNow || exp > serverNow + (task ? 8 * 60 * 60_000 : 30 * 60_000) + 60_000) return null;
  if (Date.parse(createdAt) > serverNow + 120_000) return null;
  return {
    id: o.id, fileName, mime, size, salt: o.salt, iterations, hue, status: o.status, maxDownloads, createdAt, expiresAt, task,
    name: str(o.name, 60)?.trim() || "untitled",
    netHash: typeof o.netHash === "string" && NET.test(o.netHash) ? o.netHash : null,
    downloads: int(o.downloads, 0, 1e9) ?? 0,
    devices: int(o.devices, 0, 1e9) ?? 0,
    views: int(o.views, 0, 1e9) ?? 0,
    watchers: int(o.watchers, 0, 1e9) ?? 0,
    by: str(o.by, 24)?.trim() || null,
    space: typeof o.space === "string" && SLUG.test(o.space) ? o.space : null,
    life: LIVES.includes(o.life as number) ? (o.life as number) : 30,
    open: o.open === true,
    from: typeof o.from === "string" && FROM.test(o.from) ? o.from : null,
    groupName: str(o.groupName, 40)?.trim() || null,
    skin: validSkin(o.skin) ? o.skin : null,
    thumb: o.thumb === true,
    anon: o.anon === true,
  };
}

export function readSync(p: unknown, serverNow: number): SyncMsg {
  const m = (p ?? {}) as Record<string, unknown>;
  const out: SyncMsg = {};
  const b = m.b ? cleanBubble(m.b, serverNow) : null;
  const t = m.t ? cleanTask(m.t, serverNow) : null;
  if (b) out.b = b;
  if (t) out.t = t;
  const bg = ids(m.bg, BUBBLE_ID), tg = ids(m.tg, TASK_ID), og = ids(m.og, ORB_ID);
  if (bg.length) out.bg = bg;
  if (tg.length) out.tg = tg;
  if (og.length) out.og = og;
  for (const k of ["od", "ov", "ox", "vw"] as const) {
    const l = ids(m[k], ORB_ID).slice(0, 20);
    if (l.length) out[k] = l;
  }
  return out;
}
