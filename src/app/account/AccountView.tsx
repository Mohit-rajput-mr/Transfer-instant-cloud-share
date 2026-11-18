"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { auth, authFetch, useSession } from "@/lib/auth";
import type { Perks, PlanId } from "@/lib/plans";

type Acc = {
  email: string | null;
  plan: PlanId;
  paid: PlanId;
  billing: string | null;
  seats: number;
  status: string;
  cancelAtEnd: boolean;
  periodEnd: string | null;
  customer: string | null;
  teamOwner: string | null;
  owner: boolean;
  perks: Perks;
};
type Sent = { id: string; name: string; fileName: string; size: number; life: number; downloads: number; createdAt: string; expiresAt: string | null; live: boolean; by: string | null };
type Member = { email: string; addedAt: string; joined: boolean };

const bytes = (n: number) => (n >= 1024 ** 4 ? `${(n / 1024 ** 4).toFixed(2)} TB` : n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const when = (iso: string) => new Date(iso).toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const NAME: Record<PlanId, string> = { free: "Free", pro: "Pro", business: "Business" };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" }) : "—");

export default function AccountView() {
  const session = useSession();
  const [acc, setAcc] = useState<Acc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reset = typeof location !== "undefined" && new URLSearchParams(location.search).has("reset");

  useEffect(() => {
    if (session === null) location.replace("/login?next=/account");
    if (!session) return;
    let on = true;
    const load = () =>
      authFetch("/api/account", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load your account"))))
        .then((a: Acc) => on && setAcc(a))
        .catch((e) => on && setErr(e.message));
    load();
    // just paid: the webhook may land a few seconds after the checkout closes
    const paying = new URLSearchParams(location.search).has("paid");
    const t = paying ? setInterval(load, 3000) : null;
    const stop = t ? setTimeout(() => clearInterval(t), 60_000) : null;
    return () => {
      on = false;
      if (t) clearInterval(t);
      if (stop) clearTimeout(stop);
    };
  }, [session]);

  async function portal() {
    setBusy(true);
    try {
      const r = await authFetch("/api/paddle/portal", { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || "Couldn't open billing");
      location.href = j.url;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  if (!session) return <p>Loading…</p>;
  if (reset) return <NewPassword />;
  return (
    <div className="ac-card">
      <dl className="ac-kv">
        <dt>Email</dt>
        <dd>{session.user.email}</dd>
        <dt>Plan</dt>
        <dd>{acc ? <span className={`ac-plan ${acc.plan}`}>{NAME[acc.plan]}</span> : "…"}</dd>
        {acc && acc.plan !== "free" && (
          <>
            <dt>Billing</dt>
            <dd>
              {acc.billing === "monthly" ? "Monthly" : "Yearly"}
              {acc.plan === "business" ? ` · ${acc.seats} ${acc.seats === 1 ? "seat" : "seats"}` : ""}
            </dd>
            <dt>{acc.cancelAtEnd || acc.status === "canceled" ? "Ends" : "Renews"}</dt>
            <dd>{day(acc.periodEnd)}{acc.status === "past_due" ? " · payment failed, update your card" : ""}</dd>
          </>
        )}
        {acc && (
          <>
            <dt>Files</dt>
            <dd>up to {acc.perks.maxFileLabel} each, kept up to {acc.perks.maxLifeLabel}{acc.perks.quota ? `, ${acc.perks.quotaLabel} stored at once` : ""}</dd>
          </>
        )}
      </dl>
      <div className="ac-row">
        {acc?.plan === "free" ? (
          <Link className="ac-btn" href="/upgrade#plans">See Pro and Business</Link>
        ) : acc?.customer ? (
          <button type="button" className="ac-btn" onClick={portal} disabled={busy}>Manage billing · cancel</button>
        ) : null}
        <button type="button" className="ac-btn ghost" onClick={() => auth.signOut().then(() => location.replace("/"))}>Log out</button>
      </div>
      {err && <p className="ac-msg err" role="status">{err}</p>}
      {acc?.teamOwner && <p className="ac-msg">You&apos;re on a Business team: the team owner pays for your seat.</p>}
      {acc?.owner && <Team />}
      {acc && acc.plan !== "free" && <History acc={acc} />}
      <p style={{ marginTop: 18, fontSize: 12, color: "#777" }}>
        Questions or refunds: <a href="mailto:transferorbi@gmail.com">transferorbi@gmail.com</a> · <Link href="/refunds">Refund policy</Link>
      </p>
    </div>
  );
}

function NewPassword() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    const { error } = await auth.updateUser({ password: pw });
    setMsg(error ? { t: error.message, err: true } : { t: "Password saved." });
    if (!error) setTimeout(() => location.replace("/account"), 1200);
  }
  return (
    <form className="ac-card ac-f" onSubmit={save}>
      <label>
        New password
        <input type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      <button className="ac-btn" type="submit">Save password</button>
      {msg && <p className={`ac-msg${msg.err ? " err" : ""}`}>{msg.t}</p>}
    </form>
  );
}

/** what you sent (Pro 30 days, Business a year; the Business owner can switch to the whole team) */
function History({ acc }: { acc: Acc }) {
  const [team, setTeam] = useState(false);
  const [data, setData] = useState<{ items: Sent[]; used: number } | null>(null);
  useEffect(() => {
    let on = true;
    authFetch(`/api/account/history${team ? "?team=1" : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => on && setData(d))
      .catch(() => on && setData({ items: [], used: 0 }));
    return () => {
      on = false;
    };
  }, [team]);
  return (
    <section style={{ marginTop: 28 }}>
      <h2>History · {acc.plan === "business" ? "1 year" : "30 days"}</h2>
      <p style={{ fontSize: 13, color: "#999" }}>
        Stored now: {data ? bytes(data.used) : "…"} of {acc.perks.quotaLabel}
        {acc.owner && (
          <>
            {" · "}
            <button type="button" className="ac-link" onClick={() => setTeam((t) => !t)}>{team ? "Show only mine" : "Show the whole team"}</button>
          </>
        )}
      </p>
      {!data ? (
        <p>Loading…</p>
      ) : data.items.length === 0 ? (
        <p style={{ color: "#888" }}>Nothing yet. Send while logged in and it shows up here.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {data.items.map((x) => (
            <li key={x.id} style={{ borderTop: "1px solid #222", padding: "10px 0", display: "grid", gap: 2 }}>
              <span style={{ color: "#eee" }}>{x.name || x.fileName}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#888" }}>
                {bytes(x.size)} · sent {when(x.createdAt)} · ↓ {x.downloads} · {x.live && x.expiresAt ? `burns ${when(x.expiresAt)}` : "burned"}
                {x.by ? ` · ${x.by}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Business owner: who is on the team (by email, up to the seats paid for) */
function Team() {
  const [t, setT] = useState<{ seats: number; members: Member[] } | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  useEffect(() => {
    authFetch("/api/account/team", { cache: "no-store" }).then((r) => r.json()).then((d) => !d.error && setT(d)).catch(() => {});
  }, []);
  async function act(action: "add" | "remove", e: string) {
    setMsg(null);
    const r = await authFetch("/api/account/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, email: e }) });
    const d = await r.json().catch(() => ({ error: "Try again" }));
    if (d.error) return setMsg({ t: d.error, err: true });
    setT(d);
    if (action === "add") {
      setEmail("");
      setMsg({ t: `${e} is on the team. They get Business when they log in with that email.` });
    }
  }
  const add = (ev: FormEvent) => {
    ev.preventDefault();
    void act("add", email.trim());
  };
  if (!t) return null;
  return (
    <section style={{ marginTop: 28 }}>
      <h2>Team · {t.members.length + 1} of {t.seats} seats</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
        <li style={{ padding: "6px 0", color: "#aaa" }}>You (owner)</li>
        {t.members.map((m) => (
          <li key={m.email} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: "1px solid #222" }}>
            <span>{m.email} <span style={{ color: "#777", fontSize: 12 }}>{m.joined ? "· active" : "· not logged in yet"}</span></span>
            <button type="button" className="ac-link" onClick={() => act("remove", m.email)}>Remove</button>
          </li>
        ))}
      </ul>
      {t.members.length + 1 < t.seats ? (
        <form className="ac-f" onSubmit={add} style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
          <label>
            Add by email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="ac-btn" type="submit">Add</button>
        </form>
      ) : (
        <p style={{ fontSize: 13, color: "#999" }}>All seats are taken. Add seats under Manage billing.</p>
      )}
      {msg && <p className={`ac-msg${msg.err ? " err" : ""}`} role="status">{msg.t}</p>}
    </section>
  );
}
