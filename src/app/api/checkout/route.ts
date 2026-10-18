import { NextResponse, type NextRequest } from "next/server";
import { paymentsOn, priceFor, stripe, trialDays, type Billing, type Plan } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** GET: which plans can be bought right now (the Upgrade page shows "Subscribe" only for those). */
export function GET() {
  return NextResponse.json({ ...paymentsOn(), trialDays: trialDays() }, { headers: { "Cache-Control": "no-store" } });
}

/** POST { plan, billing, seats }: a Stripe Checkout page for that subscription; answers { url }. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { plan?: string; billing?: string; seats?: number };
  const plan: Plan | null = body.plan === "business" || body.plan === "pro" ? body.plan : null;
  const billing: Billing = body.billing === "monthly" ? "monthly" : "yearly";
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  if (!paymentsOn()[plan]) return NextResponse.json({ error: "Payments for this plan aren't switched on yet" }, { status: 503 });
  // Business is per seat; Pro is one person
  const seats = plan === "business" ? Math.max(1, Math.min(500, Math.floor(Number(body.seats) || 1))) : 1;
  const origin = req.nextUrl.origin;
  const trial = trialDays();
  try {
    const s = await stripe<{ url: string }>("checkout/sessions", {
      mode: "subscription",
      line_items: [{ price: priceFor(plan, billing), quantity: seats, ...(plan === "business" ? { adjustable_quantity: { enabled: true, minimum: 1, maximum: 500 } } : null) }],
      success_url: `${origin}/upgrade/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade?checkout=cancelled#plans`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      tax_id_collection: { enabled: true },
      subscription_data: { metadata: { plan, billing }, ...(trial ? { trial_period_days: trial } : null) },
      metadata: { plan, billing },
    });
    return NextResponse.json({ url: s.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
