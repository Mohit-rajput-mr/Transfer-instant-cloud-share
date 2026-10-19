import type { Metadata } from "next";
import Link from "next/link";
import "../../site.css";
import "./thanks.css";
import SiteChrome, { VoidLink } from "@/components/SiteChrome";
import { stripe } from "@/lib/stripe";

export const metadata: Metadata = { title: "Thank you", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Session = {
  status?: string;
  payment_status?: string;
  customer_details?: { email?: string | null };
  metadata?: { plan?: string; billing?: string };
  subscription?: { status?: string; trial_end?: number | null; items?: { data: { quantity?: number }[] } } | string | null;
};

// After Stripe Checkout: what was bought, read back from Stripe (nothing here trusts the URL alone).
export default async function Thanks({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let s: Session | null = null;
  if (session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id) && process.env.STRIPE_SECRET_KEY) {
    s = await stripe<Session>(`checkout/sessions/${session_id}?expand[]=subscription`).catch(() => null);
  }
  const done = s?.status === "complete";
  const sub = s && typeof s.subscription === "object" ? s.subscription : null;
  const plan = s?.metadata?.plan === "pro" ? "Pro" : "Business";
  const seats = sub?.items?.data[0]?.quantity ?? 1;
  const trialEnd = sub?.trial_end ? new Date(sub.trial_end * 1000).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <SiteChrome page="upgrade">
      <section className="ug-thx">
        <span className="sx-label">{done ? "(✓) payment received" : "(—) checkout"}</span>
        <h1 className="ug-thx-h">{done ? <>You&apos;re in.<br /><span className="sx-out">Thank you.</span></> : <>Nothing<br /><span className="sx-out">was charged.</span></>}</h1>
        {done ? (
          <div className="ug-thx-body">
            <p className="sx-lead">
              {plan}{plan === "Business" ? ` · ${seats} ${seats === 1 ? "seat" : "seats"}` : ""} · billed {s?.metadata?.billing === "monthly" ? "monthly" : "yearly"}.
              {trialEnd ? ` Your free trial runs until ${trialEnd}; the first charge comes after it.` : ""} Stripe has sent the receipt to {s?.customer_details?.email || "your email"}.
            </p>
            <ol className="ug-thx-steps">
              <li><b>01</b><span>We set up your {plan === "Business" ? "team workspace" : "account"} and email you within one working day.</span></li>
              <li><b>02</b><span>Features arrive as they ship; each one is listed on the Upgrade page with its status.</span></li>
              <li><b>03</b><span>Change seats or cancel any time: reply to the receipt, or write to transferorbi@gmail.com.</span></li>
            </ol>
          </div>
        ) : (
          <p className="sx-lead ug-thx-body">We couldn&apos;t confirm a completed checkout for this link. If you were charged, write to transferorbi@gmail.com with the receipt and we&apos;ll sort it out.</p>
        )}
        <div className="ug-thx-acts">
          <Link className="sx-pill" href="/upgrade">Back to plans</Link>
          <VoidLink className="sx-link" href="/">Open Orbi</VoidLink>
        </div>
      </section>
    </SiteChrome>
  );
}
