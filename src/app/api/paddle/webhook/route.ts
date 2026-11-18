import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/server";
import { paddle, planOfPrice, verifyPaddle } from "@/lib/paddle";

export const dynamic = "force-dynamic";

type Item = { quantity?: number; price?: { id?: string; billing_cycle?: { interval?: string } } };
type Sub = {
  id: string;
  status: string;
  customer_id?: string;
  custom_data?: { uid?: string } | null;
  items?: Item[];
  billing_cycle?: { interval?: string };
  current_billing_period?: { ends_at?: string } | null;
  scheduled_change?: { action?: string; effective_at?: string } | null;
  canceled_at?: string | null;
};
type Txn = {
  id: string;
  status: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  address_id?: string | null;
  custom_data?: { uid?: string } | null;
  items?: Item[];
  currency_code?: string;
  billed_at?: string | null;
  details?: { totals?: { grand_total?: string } };
};
type Adj = { action?: string; status?: string; transaction_id?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uidOf = (c: { uid?: string } | null | undefined) => (c?.uid && UUID.test(c.uid) ? c.uid : "");
// currencies Paddle bills without minor units
const ZERO_DECIMAL = new Set(["JPY", "KRW"]);

/** Paddle → Orbi: subscriptions switch a plan on/off; completed transactions become payment rows (HQ → Payments). */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyPaddle(raw, req.headers.get("paddle-signature"), process.env.PADDLE_WEBHOOK_SECRET || "")) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const ev = JSON.parse(raw) as { event_type: string; data: Record<string, unknown> };
  try {
    if (ev.event_type.startsWith("subscription.")) {
      const s = ev.data as unknown as Sub;
      const item = s.items?.[0];
      const p = planOfPrice(item?.price?.id);
      const cancelling = s.scheduled_change?.action === "cancel";
      await rpc("orbit_paddle_sub", {
        p: {
          userId: uidOf(s.custom_data),
          sub: s.id,
          customer: s.customer_id ?? "",
          plan: p?.plan ?? "",
          billing: p?.billing ?? (s.billing_cycle?.interval === "month" ? "monthly" : s.billing_cycle?.interval === "year" ? "yearly" : ""),
          seats: item?.quantity ?? 1,
          status: s.status,
          cancelAtEnd: cancelling,
          periodEnd: (cancelling && s.scheduled_change?.effective_at) || s.current_billing_period?.ends_at || "",
        },
      });
    } else if (ev.event_type === "transaction.completed" || ev.event_type === "transaction.payment_failed") {
      const t = ev.data as unknown as Txn;
      const item = t.items?.[0];
      const p = planOfPrice(item?.price?.id);
      const cur = (t.currency_code || "").toUpperCase();
      const total = Number(t.details?.totals?.grand_total ?? NaN);
      // email and country: best effort (the payment row lands either way)
      const [email, country] = await Promise.all([
        t.customer_id ? paddle<{ email?: string }>(`customers/${t.customer_id}`).then((c) => c.email ?? "").catch(() => "") : "",
        t.customer_id && t.address_id ? paddle<{ country_code?: string }>(`customers/${t.customer_id}/addresses/${t.address_id}`).then((a) => a.country_code ?? "").catch(() => "") : "",
      ]);
      await rpc("orbit_paddle_payment", {
        p: {
          id: t.id,
          userId: uidOf(t.custom_data),
          email,
          plan: p?.plan ?? "",
          billing: p?.billing ?? "",
          seats: item?.quantity ?? 1,
          amount: Number.isFinite(total) ? String(ZERO_DECIMAL.has(cur) ? total : total / 100) : "",
          currency: cur,
          status: ev.event_type === "transaction.completed" ? "completed" : "failed",
          country,
          sub: t.subscription_id ?? "",
          customer: t.customer_id ?? "",
          at: t.billed_at ?? "",
        },
      });
    } else if (ev.event_type === "adjustment.created" || ev.event_type === "adjustment.updated") {
      const a = ev.data as unknown as Adj;
      if (a.action === "refund" && a.transaction_id) {
        await rpc("orbit_paddle_payment", { p: { id: a.transaction_id, status: a.status === "approved" ? "refunded" : "refund requested" } });
      }
    }
  } catch (e) {
    // Paddle retries on a non-2xx: say so, so a failed write is tried again
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
