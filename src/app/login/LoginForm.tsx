"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { FcGoogle } from "react-icons/fc";
import { auth, useSession } from "@/lib/auth";

type Mode = "in" | "up" | "link" | "reset";

/** where to go after signing in: ?next=/upgrade… (same-site paths only) */
const nextPath = () => {
  const n = new URLSearchParams(location.search).get("next") || "/account";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/account";
};

export default function LoginForm() {
  const session = useSession();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);

  // signed in (also right after a Google or email-link return): go on
  useEffect(() => {
    if (session) location.replace(nextPath());
  }, [session]);

  const back = () => `${location.origin}/login?next=${encodeURIComponent(nextPath())}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else if (mode === "up") {
        const { data, error } = await auth.signUp({ email, password: pw, options: { emailRedirectTo: back() } });
        if (error) throw error;
        if (!data.session) setMsg({ t: `Check ${email}: we sent a link to confirm your email.` });
      } else if (mode === "link") {
        const { error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: back() } });
        if (error) throw error;
        setMsg({ t: `Check ${email}: tap the link in the email to log in.` });
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

  async function google() {
    setBusy(true);
    const { error } = await auth.signInWithOAuth({ provider: "google", options: { redirectTo: back() } });
    if (error) {
      setMsg({ t: error.message, err: true });
      setBusy(false);
    }
  }

  if (session) return <p className="ac-msg">You&apos;re logged in. Taking you on…</p>;
  const pwNeeded = mode === "in" || mode === "up";
  return (
    <div className="ac-card">
      <div className="ac-tabs" role="group" aria-label="Log in or sign up">
        <button type="button" className="ac-tab" aria-pressed={mode === "in"} onClick={() => setMode("in")}>Log in</button>
        <button type="button" className="ac-tab" aria-pressed={mode === "up"} onClick={() => setMode("up")}>Sign up</button>
      </div>
      <button type="button" className="ac-btn ghost" style={{ width: "100%" }} onClick={google} disabled={busy}>
        <FcGoogle aria-hidden size={20} /> Continue with Google
      </button>
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
          {busy ? "One moment…" : mode === "in" ? "Log in" : mode === "up" ? "Create account" : mode === "link" ? "Email me a link" : "Send reset link"}
        </button>
      </form>
      <div className="ac-row" style={{ justifyContent: "space-between" }}>
        {mode !== "link" ? <button type="button" className="ac-link" onClick={() => setMode("link")}>Email me a login link instead</button> : <button type="button" className="ac-link" onClick={() => setMode("in")}>Use a password</button>}
        {mode === "in" && <button type="button" className="ac-link" onClick={() => setMode("reset")}>Forgot password?</button>}
      </div>
      {msg && <p className={`ac-msg${msg.err ? " err" : ""}`} role="status">{msg.t}</p>}
      <p className="sx-small" style={{ marginTop: 18, color: "#777", fontSize: 12 }}>By continuing you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy</Link> note.</p>
    </div>
  );
}
