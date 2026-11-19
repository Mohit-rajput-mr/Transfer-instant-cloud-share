"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { LuBadgeCheck } from "react-icons/lu";
import { auth, authFetch, useLogin } from "@/lib/auth";
import { HUES, applyProfile, profileOf } from "@/lib/profile";
import { SKINS } from "@/lib/skin-list";
import { CodeStep } from "../login/LoginForm";
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
  // logged in = the password or Google sign-in AND its emailed code (lib/otp.ts); otherwise back to /login to finish
  const { session: raw, verified } = useLogin();
  const session = verified ? raw : verified === false ? null : undefined;
  const [acc, setAcc] = useState<Acc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
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
  const prof = profileOf(session.user);
  // email sign-ups have no name until they fill in the profile (Google gives one)
  const named = typeof session.user.user_metadata?.name === "string" && session.user.user_metadata.name.trim();
  // a profile needs a name AND a unique bubble name (accounts from before bubble names are asked once)
  const hasHandle = typeof session.user.user_metadata?.handle === "string" && !!session.user.user_metadata.handle;
  if (!named || !hasHandle || editing) return <Profile user={session.user} onDone={() => setEditing(false)} first={!named || !hasHandle} />;
  const avatar = typeof session.user.user_metadata?.avatar_url === "string" ? session.user.user_metadata.avatar_url : "";
  return (
    <>
      {/* who you are: what everyone sees on your files */}
      <section className="ac-card ac-head">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- the Google picture, tiny
          <img className="ac-av" src={avatar} alt="" width={56} height={56} referrerPolicy="no-referrer" />
        ) : (
          <span className="ac-av" style={{ background: `hsl(${prof.hue ?? 140} 60% 35%)` }}>{prof.name.slice(0, 1).toUpperCase()}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <b className="ac-name" style={{ color: `hsl(${prof.hue ?? 140} 85% 72%)` }}>{prof.handle} <LuBadgeCheck aria-label="your bubble name" /></b>
          <div className="ac-sub">{prof.name} · {session.user.email}{acc ? <> · <span className={`ac-plan ${acc.plan}`}>{NAME[acc.plan]}</span></> : null}</div>
        </div>
        <button type="button" className="ac-btn ghost" onClick={() => setEditing(true)}>Edit profile</button>
      </section>

      <Defaults user={session.user} />

      <section className="ac-card">
        <h2>Plan</h2>
        <dl className="ac-kv">
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
        </div>
        {err && <p className="ac-msg err" role="status">{err}</p>}
        {acc?.teamOwner && <p className="ac-msg">You&apos;re on a Business team: the team owner pays for your seat.</p>}
      </section>

      {acc?.owner && <Team />}
      {acc && acc.plan !== "free" && <History acc={acc} />}
      <Security email={session.user.email ?? ""} />

      <p style={{ marginTop: 18, fontSize: 12, color: "#777" }}>
        Questions or refunds: <a href="mailto:transferorbi@gmail.com">transferorbi@gmail.com</a> · <Link href="/refunds">Refund policy</Link>
      </p>
    </>
  );
}

/** how your sends start, on every device you log in on (lib/profile.ts) */
function Defaults({ user }: { user: User }) {
  const p = profileOf(user);
  const [life, setLife] = useState(p.prefs.life ?? 30);
  const [max, setMax] = useState<number | null>(p.prefs.max ?? null);
  const [locked, setLocked] = useState(p.prefs.locked ?? false);
  const [skin, setSkinS] = useState(p.prefs.skin ?? "");
  const [msg, setMsg] = useState("");
  async function save() {
    const prefs = { life, max, locked, ...(skin ? { skin } : {}), ...(p.prefs.pal ? { pal: p.prefs.pal } : {}) };
    const { data, error } = await auth.updateUser({ data: { prefs } });
    if (error) return setMsg(error.message);
    applyProfile(data.user);
    setMsg("Saved. Your devices use these from now on.");
  }
  const chip = (on: boolean, label: string, f: () => void) => (
    <button type="button" key={label} className={`ac-chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => (f(), setMsg(""))}>{label}</button>
  );
  return (
    <section className="ac-card">
      <h2>How your files go out</h2>
      <p className="ac-sub">The starting choices for every send, on every device you log in on. You can still change them per send.</p>
      <div className="ac-opt"><span>Disappears in</span><div>{[5, 10, 15, 20, 25, 30].map((m) => chip(life === m, `${m}m`, () => setLife(m)))}</div></div>
      <div className="ac-opt"><span>Download limit</span><div>{[null, 1, 2, 3, 5, 10].map((m) => chip(max === m, m == null ? "∞" : String(m), () => setMax(m)))}</div></div>
      <div className="ac-opt"><span>Password</span><div>{chip(!locked, "Open", () => setLocked(false))}{chip(locked, "Ask for one", () => setLocked(true))}</div></div>
      <div className="ac-opt">
        <span>Style</span>
        <select className="ac-sel" value={skin} onChange={(e) => (setSkinS(e.target.value), setMsg(""))}>
          <option value="">Keep each device&apos;s own</option>
          {SKINS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      </div>
      <div className="ac-row"><button type="button" className="ac-btn" onClick={save}>Save defaults</button></div>
      {msg && <p className="ac-msg" role="status">{msg}</p>}
    </section>
  );
}

/** password, other devices, the account itself */
function Security({ email }: { email: string }) {
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [pw, setPw] = useState("");
  const [open, setOpen] = useState<"" | "pw" | "del">("");
  async function changePw(e: FormEvent) {
    e.preventDefault();
    const { error } = await auth.updateUser({ password: pw });
    setMsg(error ? { t: error.message, err: true } : { t: "Password changed." });
    if (!error) {
      setPw("");
      setOpen("");
    }
  }
  async function everywhere() {
    await auth.signOut({ scope: "global" });
    location.replace("/login");
  }
  // deleting needs a fresh emailed code (the server checks it was entered in the last 15 minutes)
  const [confirming, setConfirming] = useState(false);
  async function del() {
    const r = await authFetch("/api/account/delete", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403 && d.code) return setConfirming(true);
    if (!r.ok) return setMsg({ t: d.error || "Couldn't delete the account", err: true });
    await auth.signOut().catch(() => {});
    location.replace("/?deleted=1");
  }
  return (
    <section className="ac-card">
      <h2>Security</h2>
      <div className="ac-row">
        <button type="button" className="ac-btn ghost" onClick={() => setOpen(open === "pw" ? "" : "pw")}>Change password</button>
        <button type="button" className="ac-btn ghost" onClick={everywhere}>Log out on every device</button>
        <button type="button" className="ac-btn ghost" onClick={() => auth.signOut().then(() => location.replace("/"))}>Log out here</button>
      </div>
      {open === "pw" && (
        <form className="ac-f" onSubmit={changePw} style={{ marginTop: 14 }}>
          <label>
            New password
            <input type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <button className="ac-btn" type="submit">Save password</button>
        </form>
      )}
      <div className="ac-row" style={{ marginTop: 18 }}>
        {open === "del" ? (
          <>
            <span className="ac-sub">Delete {email} and everything it keeps (profile, history, synced data)? Files already sent burn on their own clock. Cancel a paid plan first.</span>
            <button type="button" className="ac-btn danger" onClick={del}>Yes, delete my account</button>
            <button type="button" className="ac-btn ghost" onClick={() => setOpen("")}>Cancel</button>
          </>
        ) : (
          <button type="button" className="ac-link" onClick={() => setOpen("del")}>Delete my account</button>
        )}
      </div>
      {confirming && <CodeStep email={email} why="delete your account" onBack={() => setConfirming(false)} onDone={() => (setConfirming(false), void del())} />}
      {msg && <p className={`ac-msg${msg.err ? " err" : ""}`} role="status">{msg.t}</p>}
    </section>
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
    <section className="ac-card">
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
    <section className="ac-card">
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

/** today minus `years`, as yyyy-mm-dd (the date input's max) */
const yearsAgo = (years: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

/** the profile: name and date of birth, kept on the account (Supabase Auth user metadata), editable any time.
 *  Shown right after a first sign-up; then the user goes on to where they were heading (?next=). */
function Profile({ user, onDone, first }: { user: User; onDone: () => void; first: boolean }) {
  const meta = user.user_metadata ?? {};
  const [name, setName] = useState<string>((typeof meta.name === "string" && meta.name) || (typeof meta.full_name === "string" && meta.full_name) || "");
  const [dob, setDob] = useState<string>((typeof meta.dob === "string" && meta.dob) || "");
  const [hue, setHue] = useState<number>(Number.isInteger(Number(meta.hue)) ? Number(meta.hue) : 140);
  // the bubble name: unique, required, checked as you type, with 3 free ones offered (migration 040)
  const [handle, setHandle] = useState<string>(typeof meta.handle === "string" ? meta.handle : "");
  const [check, setCheck] = useState<{ handle: string; available: boolean; suggestions: string[] } | null>(null);
  useEffect(() => {
    let on = true;
    const t = setTimeout(() => {
      authFetch(`/api/account/handle?h=${encodeURIComponent(handle)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => on && !d.error && setCheck(d))
        .catch(() => {});
    }, 350);
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, [handle]);
  const mine = typeof meta.handle === "string" && meta.handle === handle;
  const valid = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/.test(handle) && !/\.\.|__|\._|_\./.test(handle);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    const n = name.replace(/\s+/g, " ").trim().slice(0, 60);
    if (n.length < 2) return setMsg({ t: "Please enter your name", err: true });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || dob > yearsAgo(13) || dob < "1900-01-01") return setMsg({ t: "Please enter a real date of birth (you must be 13 or older)", err: true });
    if (!valid) return setMsg({ t: "Pick a bubble name: 3 to 20 letters, numbers, dots or underscores", err: true });
    setBusy(true);
    const c = await authFetch("/api/account/handle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle }) });
    if (!c.ok) {
      setBusy(false);
      const d = await c.json().catch(() => ({}));
      setCheck((x) => (x ? { ...x, available: false } : x));
      return setMsg({ t: `${d.error || "That bubble name is taken"}. Pick one of the free ones below.`, err: true });
    }
    const { data, error } = await auth.updateUser({ data: { name: n, dob, hue, handle } });
    if (!error) applyProfile(data.user);
    setBusy(false);
    if (error) return setMsg({ t: error.message, err: true });
    const next = new URLSearchParams(location.search).get("next");
    if (first && next && next.startsWith("/") && !next.startsWith("//") && next !== "/account") return location.replace(next);
    history.replaceState(null, "", "/account");
    onDone();
  }
  return (
    <form className="ac-card ac-f" onSubmit={save}>
      <h2 style={{ margin: "0 0 4px" }}>{first ? "Welcome. Your profile" : "Edit profile"}</h2>
      {first && <p style={{ margin: 0, fontSize: 13, color: "#999" }}>One step: tell us who you are. You can change it later.</p>}
      <label>
        Name
        <input required autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Bubble name · unique, everyone sees it on what you send
        <input required autoComplete="username" maxLength={20} placeholder="e.g. mohit123" value={handle} onChange={(e) => (setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")), setMsg(null))} />
      </label>
      {handle && (
        <p className={`ac-msg${!valid || (check?.handle === handle && !check.available && !mine) ? " err" : ""}`} style={{ margin: 0 }}>
          {!valid
            ? "3 to 20 letters, numbers, dots or underscores; starts and ends with a letter or number"
            : mine
              ? "This is your bubble name"
              : check?.handle !== handle
                ? "Checking…"
                : check.available
                  ? `${handle} is free`
                  : `${handle} is taken`}
        </p>
      )}
      {check && check.suggestions.length > 0 && (!handle || (check.handle === handle && !check.available && !mine)) && (
        <div className="ac-opt">
          <span>Free names</span>
          <div>
            {check.suggestions.map((x) => (
              <button type="button" key={x} className="ac-chip" onClick={() => setHandle(x)}>{x}</button>
            ))}
          </div>
        </div>
      )}
      <label>
        Date of birth
        <input type="date" required min="1900-01-01" max={yearsAgo(13)} autoComplete="bday" value={dob} onChange={(e) => setDob(e.target.value)} />
      </label>
      <div className="ac-opt">
        <span>Name colour</span>
        <div>
          {HUES.map((h) => (
            <button type="button" key={h} className={`ac-sw${hue === h ? " on" : ""}`} style={{ background: `hsl(${h} 85% 62%)` }} aria-label={`colour ${h}`} aria-pressed={hue === h} onClick={() => setHue(h)} />
          ))}
        </div>
      </div>
      <p className="ac-sub" style={{ margin: 0 }}>
        On your files: <b style={{ color: `hsl(${hue} 85% 72%)` }}>{handle || "yourname"} ✓</b> · your profile name stays private to your account
      </p>
      <label>
        Email
        <input value={user.email ?? ""} disabled readOnly />
      </label>
      <button className="ac-btn" type="submit" disabled={busy}>{busy ? "Saving…" : first ? "Save and continue" : "Save"}</button>
      {!first && <button type="button" className="ac-btn ghost" onClick={onDone}>Cancel</button>}
      {msg && <p className={`ac-msg${msg.err ? " err" : ""}`} role="status">{msg.t}</p>}
    </form>
  );
}
