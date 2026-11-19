import type { NextRequest } from "next/server";
import { rpc } from "./server";
import { codeAt, otpOn, sessionOf } from "./otp";
import type { PlanId } from "./plans";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface User { id: string; email: string | null; name: string | null; hue: number | null; /** shows the bubble name on its files (off unless the user turned it on) */ showName: boolean; session: string | null; /** when this session last entered an emailed code (s), or null */ codeAt: number | null }
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
  /** the unique bubble name (migration 040): the only name this account's files, notes and tasks carry */
  handle: string | null;
}

/** The signed-in user behind the token, only once that session entered an emailed code (lib/otp.ts);
 *  `{ otp: false }` for the code routes themselves. */
export async function userOf(req: NextRequest | Request, opts: { otp?: boolean } = {}): Promise<User | null> {
  const u = await tokenUser(req);
  if (!u) return null;
  if (opts.otp === false || !otpOn()) return u;
  return u.codeAt ? u : null;
}

async function tokenUser(req: NextRequest | Request): Promise<User | null> {
  const h = req.headers.get("authorization") || "";
  const token = /^Bearer\s+(.+)$/i.exec(h)?.[1];
  if (!token || token.length > 4096) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  const u = (await res.json().catch(() => null)) as { id?: string; email?: string; user_metadata?: Record<string, unknown> } | null;
  if (!u?.id) return null;
  const m = u.user_metadata ?? {};
  const name = typeof m.name === "string" ? m.name : typeof m.full_name === "string" ? m.full_name : null;
  const hue = Number(m.hue);
  return { id: u.id, email: u.email ?? null, name: name?.trim() || null, hue: Number.isInteger(hue) && hue >= 0 && hue < 360 ? hue : null, showName: (m.prefs as { showName?: unknown } | undefined)?.showName === true, session: sessionOf(token), codeAt: codeAt(token) };
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
