"use client";
import type { Bubble } from "./bubbles";
import type { Task } from "./tasks";

// Live changes: whatever one screen does (a bubble posted or burned, a task added, ticked or removed, an object
// destroyed) travels over realtime as the record itself, so every other screen shows it at once instead of
// waiting for the shared list. The list is cached at the edge for a few seconds, so for a short while it can
// still show the old state: a change is kept over any list made before it happened (see Void's refresh).

export type SyncMsg = { b?: Bubble; bg?: string[]; t?: Task; tg?: string[]; og?: string[] };

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
  return out;
}
