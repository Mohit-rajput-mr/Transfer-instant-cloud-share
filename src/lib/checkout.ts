"use client";
// Paddle.js overlay checkout. The buyer must be logged in: their user id rides in customData so the webhook
// (/api/paddle/webhook) switches on the plan for exactly this account.
import { auth, otpState } from "./auth";

export type PaddleConfig = { token: string; sandbox: boolean; pro: { monthly: string; yearly: string } | null; business: { monthly: string; yearly: string } | null };

type PaddleJs = {
  Environment: { set: (e: string) => void };
  Initialize: (o: { token: string; eventCallback?: (e: { name?: string }) => void }) => void;
  Checkout: { open: (o: Record<string, unknown>) => void };
};
declare global {
  interface Window { Paddle?: PaddleJs }
}

let cfg: Promise<PaddleConfig> | null = null;
export const paddleConfig = () => (cfg ??= fetch("/api/paddle/config", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ token: "", sandbox: false, pro: null, business: null })));

let ready: Promise<PaddleJs> | null = null;
function load(c: PaddleConfig) {
  return (ready ??= new Promise<PaddleJs>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = () => {
      const P = window.Paddle;
      if (!P) return reject(new Error("Checkout didn't load"));
      if (c.sandbox) P.Environment.set("sandbox");
      P.Initialize({
        token: c.token,
        // paid: the account page waits for the webhook and shows the new plan
        eventCallback: (e) => {
          if (e.name === "checkout.completed") setTimeout(() => location.assign("/account?paid=1"), 1500);
        },
      });
      resolve(P);
    };
    s.onerror = () => {
      ready = null;
      reject(new Error("Checkout didn't load. Check your connection."));
    };
    document.head.appendChild(s);
  }));
}

/** Open the checkout for a plan; sends a signed-out buyer to log in first and brings them back here. */
export async function buy(plan: "pro" | "business", billing: "monthly" | "yearly", seats = 1) {
  const { data } = await auth.getSession();
  const o = data.session ? await otpState() : null;
  if (!data.session || (o?.required && !o.verified)) {
    location.assign(`/login?next=${encodeURIComponent(`/upgrade?buy=${plan}-${billing}#plans`)}`);
    return;
  }
  const c = await paddleConfig();
  const price = c[plan]?.[billing];
  if (!c.token || !price) throw new Error("Payments aren't switched on yet");
  const P = await load(c);
  P.Checkout.open({
    items: [{ priceId: price, quantity: plan === "business" ? Math.max(1, Math.min(500, seats)) : 1 }],
    customer: data.session.user.email ? { email: data.session.user.email } : undefined,
    customData: { uid: data.session.user.id },
    settings: { displayMode: "overlay", theme: "dark", locale: "en", allowLogout: false },
  });
}
