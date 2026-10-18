import { createHmac, timingSafeEqual } from "node:crypto";

// Stripe over its REST API (no SDK): Checkout for paid plans, webhooks for what was bought.
// Everything is off until the keys are set in Vercel (see FLEET_SYNC.md, "Payments"):
//   STRIPE_SECRET_KEY                 sk_live_… / sk_test_…
//   STRIPE_WEBHOOK_SECRET             whsec_… (from the webhook endpoint /api/stripe/webhook)
//   STRIPE_PRICE_BUSINESS_MONTHLY     price_… (recurring, per seat, monthly)
//   STRIPE_PRICE_BUSINESS_YEARLY      price_… (recurring, per seat, yearly)
//   STRIPE_PRICE_PRO_MONTHLY / _YEARLY (optional: Pro checkout too)
//   STRIPE_TRIAL_DAYS                 optional: free days before the first charge (e.g. until the features ship)

export type Plan = "business" | "pro";
export type Billing = "monthly" | "yearly";

const KEY = () => process.env.STRIPE_SECRET_KEY || "";

export function priceFor(plan: Plan, billing: Billing) {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${billing.toUpperCase()}`] || "";
}

/** which plans can be bought right now (keys and price set) */
export function paymentsOn() {
  const on = (p: Plan) => !!KEY() && !!priceFor(p, "monthly") && !!priceFor(p, "yearly");
  return { business: on("business"), pro: on("pro") };
}

export function trialDays() {
  const n = Number(process.env.STRIPE_TRIAL_DAYS || 0);
  return Number.isFinite(n) && n > 0 ? Math.min(365, Math.floor(n)) : 0;
}

/** Stripe's form encoding: nested objects and arrays as a[b][0]=c */
function form(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === "object" ? form(x as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    else if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe<T>(path: string, params?: Record<string, unknown>, method: "GET" | "POST" = params ? "POST" : "GET"): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY()}`, ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : null) },
    body: method === "POST" && params ? form(params).toString() : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `stripe ${path} failed: ${res.status}`);
  return data;
}

/** Checks the Stripe-Signature header (t=…,v1=…) against the raw body; rejects anything older than 5 minutes. */
export function verifyWebhook(raw: string, header: string | null, secret: string) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const want = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return sigs.some((s) => s.length === want.length && timingSafeEqual(Buffer.from(s), Buffer.from(want)));
}
