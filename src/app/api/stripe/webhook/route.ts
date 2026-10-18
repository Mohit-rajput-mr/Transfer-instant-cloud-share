import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/server";
import { stripe, verifyWebhook } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Sub = {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: { data: { quantity?: number; current_period_end?: number; price?: { id: string; recurring?: { interval?: string } } }[] };
};

/** Stripe → Orbi: every subscription change is kept in public.subscriptions (migration 019). */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET || "")) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const ev = JSON.parse(raw) as { type: string; data: { object: Record<string, unknown> } };
  const o = ev.data.object;
  try {
    let sub: Sub | null = null;
    let email: string | null = null;
    if (ev.type === "checkout.session.completed" && o.mode === "subscription" && typeof o.subscription === "string") {
      sub = await stripe<Sub>(`subscriptions/${o.subscription}`);
      email = ((o.customer_details as { email?: string } | undefined)?.email ?? null) || null;
    } else if (ev.type.startsWith("customer.subscription.")) {
      sub = o as unknown as Sub;
    }
    if (sub) {
      const item = sub.items?.data[0];
      const end = sub.current_period_end ?? item?.current_period_end;
      await rpc("orbit_subscription_upsert", {
        p: {
          id: sub.id,
          customer: sub.customer,
          email,
          plan: sub.metadata?.plan || "business",
          billing: sub.metadata?.billing || (item?.price?.recurring?.interval === "month" ? "monthly" : "yearly"),
          seats: item?.quantity ?? 1,
          status: sub.status,
          cancelAtEnd: !!sub.cancel_at_period_end,
          periodEnd: end ? new Date(end * 1000).toISOString() : null,
        },
      });
    }
  } catch (e) {
    // Stripe retries on a non-2xx: say so, so a failed write is tried again
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
