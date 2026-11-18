"use client";
// Orbi accounts (Supabase Auth): email + password, email link, Google. Only Pro and Business need one;
// sending stays free and account-free.
import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { PERKS, type Perks, type PlanId } from "./plans";

type Auth = ReturnType<typeof createClient>["auth"];
let client: Auth | null = null;
// made on first use, not at import: pages (and tests) that never touch an account never build a client
const real = () =>
  (client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce", storageKey: "orbi-auth" },
  }).auth);
export const auth = new Proxy({} as Auth, {
  get(_, k) {
    const a = real();
    const v = (a as unknown as Record<PropertyKey, unknown>)[k];
    return typeof v === "function" ? v.bind(a) : v;
  },
});

/** the current session, live (null when signed out, undefined while loading) */
export function useSession() {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    auth.getSession().then(({ data }) => on && setS(data.session));
    const { data } = auth.onAuthStateChange((_e, session) => setS(session));
    return () => {
      on = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return s;
}

/** fetch with the signed-in user's token */
export async function authFetch(input: string, init: RequestInit = {}) {
  const { data } = await auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers });
}

/** the bearer header for code that builds its own fetch */
export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

// ---- the signed-in user's plan, asked once per page (and again when the session changes) ----
type PlanInfo = { plan: PlanId; perks: Perks };
const FREE: PlanInfo = { plan: "free", perks: PERKS.free };
let cached: { token: string; p: Promise<PlanInfo> } | null = null;
export async function planNow(): Promise<PlanInfo> {
  const { data } = await auth.getSession();
  const token = data.session?.access_token;
  if (!token) return FREE;
  if (cached?.token !== token)
    cached = {
      token,
      p: fetch("/api/account", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((a: { plan?: PlanId } | null) => (a?.plan && a.plan in PERKS ? { plan: a.plan, perks: PERKS[a.plan] } : FREE))
        .catch(() => FREE),
    };
  return cached.p;
}
/** Free until known; the paid perks once the account answers */
export function usePlan(): PlanInfo {
  const session = useSession();
  const [p, setP] = useState<PlanInfo>(FREE);
  useEffect(() => {
    let on = true;
    if (session) planNow().then((x) => on && setP(x));
    else setP(FREE);
    return () => {
      on = false;
    };
  }, [session]);
  return p;
}
