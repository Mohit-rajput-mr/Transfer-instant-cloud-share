"use client";
import Link from "next/link";
import { useState } from "react";

// The only thing an /admin page shows without a valid HQ session (lib/admin-page.ts decides on the server).
export default function Login({ onIn = () => location.reload() }: { onIn?: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!pw || busy) return;
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) return onIn();
    setErr((await r?.json().catch(() => null))?.error ?? "Could not reach HQ");
    setPw("");
  };
  return (
    <div className="hq-login">
      <div className="drawer hq-card" role="dialog" aria-label="Admin login">
        <div className="drawer-head">
          <span className="mono dim">Mission HQ · restricted</span>
          <Link href="/" className="x" aria-label="Close: back to the void">×</Link>
        </div>
        <div className="drawer-body" style={{ gridTemplateColumns: "1fr" }}>
          <div className="col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hq-emblem" src="/brand/emblem.svg" alt="" width={606} height={561} />
            <div className="wide d-title">Identify.</div>
            <div className="field">
              <label htmlFor="hq-pw"><span className="mono">Password</span></label>
              <input id="hq-pw" className="line-input code-input" type="password" autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
            {err && <p className="err">{err}</p>}
            <div className="grow" />
            <button className="cta" disabled={!pw || busy} onClick={submit}>{busy ? "Verifying…" : "Enter HQ →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

