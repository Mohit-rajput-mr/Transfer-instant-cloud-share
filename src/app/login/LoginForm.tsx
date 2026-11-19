"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { auth, otpDone, otpState, useSession } from "@/lib/auth";
import GoogleButton from "./GoogleButton";

type Mode = "code" | "in" | "up" | "reset";

/** where to go after signing in: ?next=/upgrade… (same-site paths only) */
const nextPath = () => {
  const n = new URLSearchParams(location.search).get("next") || "/account";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/account";
};

export default function LoginForm() {
  const session = useSession();
  const [mode, setMode] = useState<Mode>("code");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);

  // signed in (password or Google): first the emailed code (lib/otp.ts), then a new account (no name yet) fills in its
  // profile, then on to where they were going
  const [otp, setOtp] = useState<"" | "need" | "done">("");
  useEffect(() => {
    if (!session) return setOtp("");
    let on = true;
    otpState(true).then((o) => on && setOtp(!o.required || o.verified ? "done" : "need"));
    return () => {
      on = false;
    };
  }, [session]);
  useEffect(() => {
    if (!session || otp !== "done") return;
    const m = session.user.user_metadata ?? {};
    const named = typeof m.name === "string" && m.name.trim() && typeof m.handle === "string" && m.handle;
    location.replace(named ? nextPath() : `/account?setup=1&next=${encodeURIComponent(nextPath())}`);
  }, [session, otp]);

  const back = () => `${location.origin}/login?next=${encodeURIComponent(nextPath())}`;

  // "Email code": no password; a 6-digit code to the email logs in (and makes the account on first use), like Claude
  const [codeFor, setCodeFor] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "code") return setCodeFor(email.trim().toLowerCase());
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await auth.signInWithPassword({ email, password: pw });
        if (error) throw new Error(/invalid login credentials/i.test(error.message) ? "Incorrect email or password." : /not confirmed/i.test(error.message) ? "Confirm your email first: open the link we sent when you signed up." : error.message);
      } else if (mode === "up") {
        const { data, error } = await auth.signUp({ email, password: pw, options: { emailRedirectTo: back() } });
        if (error) throw error;
        if (!data.session) setMsg({ t: `Check ${email}: we sent a link to confirm your email.` });
      } else {
        const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/account?reset=1` });
        if (error) throw error;
        setMsg({ t: `Check ${email}: we sent a link to set a new password.` });
      }
    } catch (err) {
      setMsg({ t: (err as Error).message || "Something went wrong. Try again.", err: true });
    } finally {
      setBusy(false);
    }
  }

  const googleErr = useCallback((t: string) => setMsg({ t, err: true }), []);
  async function google() {
    setBusy(true);
    const { error } = await auth.signInWithOAuth({ provider: "google", options: { redirectTo: back() } });
    if (error) {
      setMsg({ t: error.message, err: true });
      setBusy(false);
    }
  }

  if (session && otp === "need") return <CodeStep email={session.user.email ?? ""} onDone={() => (otpDone(), setOtp("done"))} onBack={() => auth.signOut().then(() => location.reload())} />;
  if (session) return <p className="ac-msg">{otp === "done" ? "You're logged in. Taking you on…" : "One moment…"}</p>;
  if (codeFor) return <CodeStep email={codeFor} create onDone={() => otpDone()} onBack={() => setCodeFor("")} />;
  const pwNeeded = mode === "in" || mode === "up";
  return (
    <div className="ac-card">
      <div className="ac-tabs" role="group" aria-label="Log in or sign up">
        <button type="button" className="ac-tab" aria-pressed={mode === "code"} onClick={() => setMode("code")}>Email code</button>
        <button type="button" className="ac-tab" aria-pressed={mode === "in" || mode === "reset"} onClick={() => setMode("in")}>Password</button>
        <button type="button" className="ac-tab" aria-pressed={mode === "up"} onClick={() => setMode("up")}>Sign up</button>
      </div>
      <GoogleButton onError={googleErr} fallback={google} disabled={busy} />
      <div className="ac-or">or with email</div>
      <form className="ac-f" onSubmit={submit}>
        <label>
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {pwNeeded && (
          <label>
            Password
            <input type="password" required minLength={8} autoComplete={mode === "up" ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
        )}
        <button className="ac-btn" type="submit" disabled={busy}>
          {busy ? "One moment…" : mode === "code" ? "Email me a code" : mode === "in" ? "Log in" : mode === "up" ? "Create account" : "Send reset link"}
        </button>
      </form>
      <div className="ac-row" style={{ justifyContent: "space-between" }}>
        {mode === "reset" ? <button type="button" className="ac-link" onClick={() => setMode("in")}>Back to log in</button> : <span />}
        {mode === "in" && <button type="button" className="ac-link" onClick={() => setMode("reset")}>Forgot password?</button>}
      </div>
      {msg && <p className={`ac-msg${msg.err ? " err" : ""}`} role="status">{msg.t}</p>}
      <p className="sx-small" style={{ marginTop: 18, color: "#777", fontSize: 12 }}>By continuing you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy</Link> note.</p>
    </div>
  );
}

const sentAt = new Map<string, number>();

/** The 6-digit code Supabase emails (signInWithOtp → verifyOtp). After a password or Google login it is step 2;
 *  on its own ("Email code") it is the whole login. `create`: a new email becomes an account. */
export function CodeStep({ email, onDone, onBack, create = false, why = "log in" }: { email: string; onDone: () => void; onBack: () => void; create?: boolean; why?: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  // one email per address per minute (Supabase's own limit): the screen re-opening never asks twice
  const send = useCallback(async (again = false) => {
    const last = sentAt.get(email) ?? 0;
    if (!again && Date.now() - last < 60_000) return setMsg({ t: `We sent a 6-digit code to ${email}. Check your inbox (and spam).` });
    setMsg(null);
    const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: create } });
    if (!error) sentAt.set(email, Date.now());
    const wait = Math.max(5, 60 - Math.round((Date.now() - last) / 1000));
    setMsg(
      !error
        ? { t: `We sent a 6-digit code to ${email}. Check your inbox (and spam).` }
        : /rate|seconds|security purposes/i.test(error.message)
          ? { t: `A code is already on its way to ${email}. You can ask for a new one in about ${wait} seconds.` }
          : /signups not allowed|not found/i.test(error.message)
            ? { t: "No account with this email.", err: true }
            : { t: error.message, err: true },
    );
  }, [email, create]);
  useEffect(() => {
    void send();
  }, [send]);
  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await auth.verifyOtp({ email, token: code, type: "email" });
    setBusy(false);
    if (!error) return onDone();
    setMsg({ t: /expired|invalid/i.test(error.message) ? "Wrong or expired code. Check the email, or send a new one." : error.message, err: true });
    setCode("");
  }
  return (
    <form className="ac-card ac-f" onSubmit={verify}>
      <h2 style={{ margin: 0 }}>Check your email</h2>
      <p className="ac-sub" style={{ margin: 0 }}>Enter the code we sent to <b>{email}</b> to {why}.</p>
      <label>
        6-digit code
        <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} style={{ letterSpacing: 8, fontSize: 22, textAlign: "center" }} />
      </label>
      <button className="ac-btn" type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Verify and continue"}</button>
      <div className="ac-row" style={{ justifyContent: "space-between" }}>
        <button type="button" className="ac-link" onClick={() => void send(true)}>Send a new code</button>
        <button type="button" className="ac-link" onClick={onBack}>Use another email</button>
      </div>
      {msg && <p className={`ac-msg${msg.err ? " err" : ""}`} role="status">{msg.t}</p>}
    </form>
  );
}
