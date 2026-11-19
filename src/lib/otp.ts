import { createHash, randomInt } from "node:crypto";
import { rpc } from "./server";

// Every login is finished by a 6-digit code emailed to the account (owner 2026-11-19): a correct password or a
// Google sign-in only starts it. The code is bound to that one Supabase session (its session_id), so a session is
// "logged in" for Orbi only after its code was entered (lib/account.ts userOf checks it). Migration 039.
// Mail goes out through Resend from the orbitransfer.com domain. Off (logins work without a code) until
// RESEND_API_KEY is set in Vercel, so turning it on never locks anyone out by accident.

export const otpOn = () => !!process.env.RESEND_API_KEY;
const FROM = () => process.env.MAIL_FROM || "Orbi Transfer <login@orbitransfer.com>";

/** the session id inside a Supabase access token (already checked by the auth server before this is read) */
export function sessionOf(token: string): string | null {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { session_id?: string };
    return typeof p.session_id === "string" && /^[0-9a-f-]{36}$/.test(p.session_id) ? p.session_id : null;
  } catch {
    return null;
  }
}

const hashCode = (session: string, code: string) => createHash("sha256").update(`${process.env.ORBIT_SECRET}:otp:${session}:${code}`).digest("hex");

// verified sessions, remembered for a while per server instance (one database read per session, not per request)
const ok = new Map<string, number>();
export async function sessionVerified(session: string, user: string) {
  const k = `${session}:${user}`;
  if ((ok.get(k) ?? 0) > Date.now()) return true;
  const at = await rpc<string | null>("orbit_otp_state", { p_session: session, p_user: user }).catch(() => null);
  if (at) ok.set(k, Date.now() + 5 * 60_000);
  if (ok.size > 5000) ok.clear();
  return !!at;
}

/** a fresh code for this session, emailed; false when asked again too soon */
export async function sendCode(session: string, user: string, email: string, why: "login" | "delete" = "login") {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const issued = await rpc<boolean>("orbit_otp_issue", { p_session: session, p_user: user, p_hash: hashCode(session, code) });
  if (!issued) return false;
  const what = why === "delete" ? "delete your Orbi Transfer account" : "finish logging in to Orbi Transfer";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM(),
      to: [email],
      subject: `${code} is your Orbi Transfer code`,
      text: `Your code: ${code}\n\nEnter it to ${what}. It works for 10 minutes.\nIf this wasn't you, ignore this email and change your password.\n\nOrbi Transfer · orbitransfer.com`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;color:#111"><p style="font-size:14px;color:#555">Orbi Transfer</p><p>Enter this code to ${what}:</p><p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:18px 0">${code}</p><p style="font-size:13px;color:#555">It works for 10 minutes. If this wasn't you, ignore this email and change your password.</p></div>`,
    }),
  });
  if (!res.ok) throw new Error(`mail failed: ${res.status}`);
  return true;
}

export async function checkCode(session: string, user: string, code: string) {
  if (!/^\d{6}$/.test(code)) return "wrong";
  const r = await rpc<string>("orbit_otp_check", { p_session: session, p_user: user, p_hash: hashCode(session, code) });
  if (r === "ok") ok.set(`${session}:${user}`, Date.now() + 5 * 60_000);
  return r as "ok" | "wrong" | "expired" | "locked";
}
