import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanId } from "./plans";

// Paddle Billing (merchant of record) over its REST API. Off until the keys are set in Vercel:
//   PADDLE_API_KEY                    pdl_sdbx_… (sandbox) / pdl_live_… (live)
//   PADDLE_WEBHOOK_SECRET             pdl_ntfset_… (Developer tools → Notifications → the destination)
//   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN   test_… / live_… (Developer tools → Authentication → client-side token)
//   PADDLE_PRICE_PRO_MONTHLY / PADDLE_PRICE_PRO_YEARLY / PADDLE_PRICE_BUSINESS_MONTHLY / PADDLE_PRICE_BUSINESS_YEARLY   pri_…

export type Billing = "monthly" | "yearly";
type Paid = Exclude<PlanId, "free">;

const KEY = () => process.env.PADDLE_API_KEY || "";
export const sandbox = () => KEY().startsWith("pdl_sdbx_") || (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "").startsWith("test_");
const API = () => (sandbox() ? "https://sandbox-api.paddle.com" : "https://api.paddle.com");

export const priceFor = (plan: Paid, billing: Billing) => process.env[`PADDLE_PRICE_${plan.toUpperCase()}_${billing.toUpperCase()}`] || "";

/** price id → plan + billing (only our four prices) */
export function planOfPrice(id: string | undefined): { plan: Paid; billing: Billing } | null {
  if (!id) return null;
  for (const plan of ["pro", "business"] as const)
    for (const billing of ["monthly", "yearly"] as const) if (priceFor(plan, billing) === id) return { plan, billing };
  return null;
}

/** what the Upgrade page may sell right now */
export function paddleConfig() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
  const on = !!token && !!KEY() && !!process.env.PADDLE_WEBHOOK_SECRET;
  const prices = (p: Paid) => (on && priceFor(p, "monthly") && priceFor(p, "yearly") ? { monthly: priceFor(p, "monthly"), yearly: priceFor(p, "yearly") } : null);
  return { token: on ? token : "", sandbox: sandbox(), pro: prices("pro"), business: prices("business") };
}

export async function paddle<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API()}/${path}`, {
    method: init.method || (init.body ? "POST" : "GET"),
    headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as { data?: T; error?: { detail?: string } };
  if (!res.ok) throw new Error(j.error?.detail || `paddle ${path} failed: ${res.status}`);
  return j.data as T;
}

/** Paddle-Signature: ts=…;h1=… — HMAC-SHA256 of "ts:rawBody"; anything older than 5 minutes is refused */
export function verifyPaddle(raw: string, header: string | null, secret: string, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=") as [string, string]));
  const ts = Number(parts.ts);
  if (!parts.h1 || !Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(`${parts.ts}:${raw}`).digest("hex"));
  const got = Buffer.from(parts.h1);
  return want.length === got.length && timingSafeEqual(want, got);
}
