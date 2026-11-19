// Every login is finished with a 6-digit code emailed to the account (owner 2026-11-19), the way Claude does it:
// a correct password or a Google sign-in only starts it. The code is Supabase Auth's own email code
// (signInWithOtp → verifyOtp in the browser), sent through the project's SMTP (the owner's Gmail), so a session that
// entered one carries "otp" in its token's `amr` claim. The server treats only those sessions as logged in.
// The same code is also a way in on its own ("Email me a code"), e.g. a device without the Google account.
// Turn it off with LOGIN_CODE=off in Vercel (e.g. while the email sender is being set up).

export const otpOn = () => process.env.LOGIN_CODE !== "off";

type Claims = { session_id?: string; amr?: { method?: string; timestamp?: number }[] };
const claims = (token: string): Claims | null => {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as Claims;
  } catch {
    return null;
  }
};

/** the session id inside a Supabase access token (already checked by the auth server before this is read) */
export function sessionOf(token: string): string | null {
  const s = claims(token)?.session_id;
  return typeof s === "string" && /^[0-9a-f-]{36}$/.test(s) ? s : null;
}

/** when this session last proved the email with a code (seconds), or null */
export function codeAt(token: string): number | null {
  const a = claims(token)?.amr ?? [];
  const hit = a.filter((x) => x.method === "otp" || x.method === "magiclink").map((x) => Number(x.timestamp) || 0);
  return hit.length ? Math.max(...hit) : null;
}
