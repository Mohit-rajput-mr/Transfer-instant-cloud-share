"use client";

export interface Orb {
  id: string;
  name: string;
  fileName: string;
  mime: string;
  size: number;
  salt: string;
  iterations: number;
  hue: number;
  status: "ready" | "sealed";
  netHash: string | null;
  maxDownloads: number | null;
  downloads: number;
  devices: number;
  views: number;
  watchers?: number;
  /** inside a space: who launched it (their name in the space) */
  by?: string | null;
  space?: string | null;
  /** minutes from launch to burn-up (5..30) */
  life?: number;
  /** open object: no passcode, anyone downloads it in one tap */
  open?: boolean;
  /** anonymous sender group: everything one device sent shares it */
  from?: string | null;
  /** the name the sender gave their bubble */
  groupName?: string | null;
  /** the sender's style: every device draws the object this way */
  skin?: string | null;
  /** a preview picture is stored (photo, video frame, first page): open objects only */
  thumb?: boolean;
  /** wired to this task (lib/tasks.ts) */
  task?: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface OwnerView extends Orb {
  failed: number;
  events: { kind: "download" | "fail" | "view" | "report"; device: string; deviceId: string; at: string }[];
}

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export function deviceId() {
  return safe(() => {
    let id = localStorage.getItem("orbit:device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("orbit:device", id);
    }
    return id;
  }, "anon-" + Math.random().toString(36).slice(2));
}

/** This device's anonymous sender group: a hash of its random id (not reversible, says nothing about it). */
export async function senderKey() {
  const d = new TextEncoder().encode(`orbi-sender:${deviceId()}`);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", d));
  return Array.from(h.slice(0, 5), (x) => x.toString(16).padStart(2, "0")).join("");
}

export function deviceInfo() {
  const ua = navigator.userAgent;
  const [browser, os] = deviceLabel().split(" · ");
  const form = /iPad|Tablet/.test(ua) ? "tablet" : /Mobi|Android|iPhone/.test(ua) ? "mobile" : "desktop";
  return { label: `${browser} · ${os}`, browser, os, form };
}

export function deviceLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /SamsungBrowser/.test(ua) ? "Samsung" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android"
    : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Device";
  return `${browser} · ${os}`;
}

export const ownerKey = (id: string) => safe(() => localStorage.getItem(`orbit:own:${id}`), null);
export const setOwnerKey = (id: string, key: string) => safe(() => localStorage.setItem(`orbit:own:${id}`, key), undefined);
export const dropOwnerKey = (id: string) => safe(() => localStorage.removeItem(`orbit:own:${id}`), undefined);
/** this device already received the object (saved, shared or read): its sphere is shown dimmed */
export const hasGot = (id: string) => safe(() => localStorage.getItem(`orbit:got:${id}`) === "1", false);
export function markGot(id: string) {
  safe(() => localStorage.setItem(`orbit:got:${id}`, "1"), undefined);
  window.dispatchEvent(new CustomEvent("orbit:got", { detail: id }));
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    n /= 1024;
    i++;
  } while (n >= 1024 && i < u.length - 1);
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
}

export function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ext(name: string) {
  const m = /\.([a-z0-9]{1,6})$/i.exec(name);
  return m ? m[1].toUpperCase() : "FILE";
}

export function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}
