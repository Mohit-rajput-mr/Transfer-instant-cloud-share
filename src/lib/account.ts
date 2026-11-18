import type { NextRequest } from "next/server";
import { rpc } from "./server";
import type { PlanId } from "./plans";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface User { id: string; email: string | null }
export interface Account {
  plan: PlanId;
  paid: PlanId;
  billing: "monthly" | "yearly" | null;
  seats: number;
  status: string;
  cancelAtEnd: boolean;
  periodEnd: string | null;
  customer: string | null;
  /** a member of someone's Business team: that owner's id */
  teamOwner: string | null;
  /** owns a live Business plan (manages the team) */
  owner: boolean;
  /** whose storage quota and history this user's sends count against */
  pool: string;
}

/** The signed-in user behind `Authorization: Bearer <supabase access token>`, checked with Supabase Auth. */
export async function userOf(req: NextRequest | Request): Promise<User | null> {
  const h = req.headers.get("authorization") || "";
  const token = /^Bearer\s+(.+)$/i.exec(h)?.[1];
  if (!token || token.length > 4096) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  const u = (await res.json().catch(() => null)) as { id?: string; email?: string } | null;
  return u?.id ? { id: u.id, email: u.email ?? null } : null;
}

export const accountOf = (u: User) => rpc<Account>("orbit_account_get", { p_user: u.id, p_email: u.email ?? "" });

/** the plan a request may use: free unless a signed-in user has a live subscription */
export async function planOf(req: NextRequest | Request): Promise<{ user: User | null; plan: PlanId; account: Account | null }> {
  // no token, no lookup: free senders never wait on the auth server
  if (!req.headers.get("authorization")) return { user: null, plan: "free", account: null };
  const user = await userOf(req);
  if (!user) return { user: null, plan: "free", account: null };
  const account = await accountOf(user).catch(() => null);
  return { user, plan: account?.plan ?? "free", account };
}
