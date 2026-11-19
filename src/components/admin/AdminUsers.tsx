"use client";
import { useEffect, useMemo, useState } from "react";

// HQ "Users": who signed up (email or Google), when, when they last logged in, their profile, plan and use.
// Data: /api/admin/users (migration 038). Refreshes every 30 s.

type U = {
  id: string; email: string | null; name: string | null; handle: string | null; dob: string | null; avatar: string | null; providers: string[];
  createdAt: string; lastLogin: string | null; confirmed: boolean; plan: string; team: boolean; synced: string | null; sends: number; paid: number;
};
type D = { total: number; newToday: number; new7: number; new30: number; loginsToday: number; active7: number; google: number; email: number; unconfirmed: number; paying: number; users: U[] };

const at = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const age = (dob: string | null) => {
  if (!dob) return "—";
  const d = new Date(`${dob}T12:00:00`), n = new Date();
  return String(n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0));
};
type Filter = "all" | "today" | "7d" | "paying" | "google" | "email" | "unconfirmed";

export default function AdminUsers({ onClose }: { onClose?: () => void }) {
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState<Filter>("all");
  const [q, setQ] = useState("");
  useEffect(() => {
    const load = () =>
      fetch("/api/admin/users", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(setD)
        .catch((e) => setErr(e.message));
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    const day = new Date(new Date().toDateString()).getTime(), week = Date.now() - 7 * 864e5, s = q.trim().toLowerCase();
    return (d?.users ?? []).filter((u) => {
      const t = Date.parse(u.createdAt);
      const ok =
        f === "all" ||
        (f === "today" && t >= day) ||
        (f === "7d" && t >= week) ||
        (f === "paying" && u.plan !== "free") ||
        (f === "google" && u.providers.includes("google")) ||
        (f === "email" && u.providers.includes("email")) ||
        (f === "unconfirmed" && !u.confirmed);
      return ok && (!s || `${u.email} ${u.name ?? ""} ${u.handle ?? ""}`.toLowerCase().includes(s));
    });
  }, [d, f, q]);

  const chip = (k: Filter, label: string, n?: number) => (
    <button className={`pill ${f === k ? "on" : ""}`} onClick={() => setF(k)}>
      {label} {n != null && <b>{n}</b>}
    </button>
  );

  return (
    <div className="hq-expand" role="dialog" aria-label="Users">
      <div className="hq-expand-head">
        <b className="wide">Users</b>
        <span className="mono dim">
          {d ? `${d.total} accounts · ${d.newToday} new today · ${d.new7} this week · ${d.new30} this month · ${d.loginsToday} logged in today · ${d.active7} active this week · ${d.paying} paying` : "loading…"}
          {err ? ` · ${err}` : ""}
        </span>
        <div>
          {onClose && <button className="pill" onClick={onClose}>Close ✕</button>}
        </div>
      </div>
      <div className="hq-filters">
        {chip("all", "All", d?.total)}
        {chip("today", "New today", d?.newToday)}
        {chip("7d", "New this week", d?.new7)}
        {chip("paying", "Paying", d?.paying)}
        {chip("google", "Google", d?.google)}
        {chip("email", "Email", d?.email)}
        {chip("unconfirmed", "Email not confirmed", d?.unconfirmed)}
        <input className="pill" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 200 }} />
      </div>
      <div style={{ padding: "0 16px 24px", overflow: "auto" }}>
        <table className="mono" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.7 }}>
              <th>Name</th><th>Bubble name</th><th>Email</th><th>Age</th><th>Signs in with</th><th>Joined</th><th>Last login</th><th>Plan</th><th>Sends</th><th>Paid</th><th>Synced</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid #222" }}>
                <td style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a Google avatar, tiny */}
                  {u.avatar ? <img src={u.avatar} alt="" width={22} height={22} style={{ borderRadius: "50%" }} referrerPolicy="no-referrer" /> : <span style={{ width: 22 }} />}
                  {u.name ?? <span className="dim">no profile yet</span>}
                </td>
                <td>{u.handle ?? "—"}</td>
                <td>{u.email ?? "—"}{u.confirmed ? "" : " · unconfirmed"}</td>
                <td>{age(u.dob)}</td>
                <td>{u.providers.join(" + ") || "—"}</td>
                <td>{at(u.createdAt)}</td>
                <td>{at(u.lastLogin)}</td>
                <td>{u.plan}{u.team ? " (team)" : ""}</td>
                <td>{u.sends}</td>
                <td>{u.paid ? Number(u.paid).toFixed(2) : "—"}</td>
                <td>{at(u.synced)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {d && rows.length === 0 && <p className="mono dim">Nobody here.</p>}
      </div>
    </div>
  );
}
