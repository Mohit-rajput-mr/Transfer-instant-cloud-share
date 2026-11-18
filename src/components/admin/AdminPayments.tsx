"use client";
import { useEffect, useMemo, useState } from "react";

// HQ "Payments": money in through Paddle (merchant of record) — totals per month and currency, every payment, and every
// account with its plan. Rows come from the Paddle webhook (/api/paddle/webhook → migration 034).

type Pay = { id: string; email: string | null; plan: string | null; billing: string | null; seats: number | null; amount: number | null; currency: string | null; status: string | null; country: string | null; created_at: string };
type Acc = { email: string | null; plan: string; paid: string; billing: string | null; seats: number; status: string; cancelAtEnd: boolean; periodEnd: string | null; since: string };

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" }) : "—");
const money = (n: number, cur: string) => `${n.toFixed(2)} ${cur}`;

export default function AdminPayments({ onClose }: { onClose: () => void }) {
  const [d, setD] = useState<{ payments: Pay[]; accounts: Acc[] } | null>(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState<"payments" | "accounts">("payments");
  useEffect(() => {
    const load = () =>
      fetch("/api/admin/payments", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then(setD)
        .catch((e) => setErr(e.message));
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // completed payments minus refunds, per month and currency
  const months = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const p of d?.payments ?? []) {
      if (p.amount == null || !p.currency || (p.status !== "completed" && p.status !== "refunded")) continue;
      const k = p.created_at.slice(0, 7);
      const row = m.get(k) ?? new Map<string, number>();
      row.set(p.currency, (row.get(p.currency) ?? 0) + (p.status === "refunded" ? 0 : Number(p.amount)));
      m.set(k, row);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [d]);
  const paying = (d?.accounts ?? []).filter((a) => a.plan !== "free");

  return (
    <div className="hq-expand" role="dialog" aria-label="Payments">
      <div className="hq-expand-head">
        <b className="wide">Payments</b>
        <span className="mono dim">
          {d ? `${d.payments.length} payments · ${paying.length} paying accounts · ${d.accounts.length} accounts` : "loading…"}
          {err ? ` · ${err}` : ""}
        </span>
        <div>
          <button className="pill" onClick={onClose}>Close ✕</button>
        </div>
      </div>
      <div className="hq-filters">
        <button className={`pill ${view === "payments" ? "on" : ""}`} onClick={() => setView("payments")}>Payments <b>{d?.payments.length ?? 0}</b></button>
        <button className={`pill ${view === "accounts" ? "on" : ""}`} onClick={() => setView("accounts")}>Accounts <b>{d?.accounts.length ?? 0}</b></button>
      </div>
      <div style={{ padding: "0 16px 24px", overflow: "auto" }}>
        <h3 className="mono dim" style={{ margin: "12px 0 6px" }}>Revenue per month (gross, before Paddle&apos;s fee)</h3>
        {months.length === 0 ? (
          <p className="mono dim">No payments yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {months.map(([k, cur]) => (
              <li key={k} className="mono" style={{ padding: "4px 0" }}>
                <b>{k}</b> · {[...cur.entries()].map(([c, v]) => money(v, c)).join(" · ")}
              </li>
            ))}
          </ul>
        )}
        {view === "payments" ? (
          <table className="mono" style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th>Date</th><th>Email</th><th>Plan</th><th>Amount</th><th>Country</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(d?.payments ?? []).map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #222" }}>
                  <td>{day(p.created_at)}</td>
                  <td>{p.email ?? "—"}</td>
                  <td>{p.plan ?? "—"}{p.billing ? ` · ${p.billing}` : ""}{p.plan === "business" && p.seats ? ` · ${p.seats} seats` : ""}</td>
                  <td>{p.amount != null && p.currency ? money(Number(p.amount), p.currency) : "—"}</td>
                  <td>{p.country ?? "—"}</td>
                  <td>{p.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="mono" style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th>Email</th><th>Plan now</th><th>Billing</th><th>Status</th><th>Renews / ends</th><th>Since</th>
              </tr>
            </thead>
            <tbody>
              {(d?.accounts ?? []).map((a, i) => (
                <tr key={`${a.email}-${i}`} style={{ borderTop: "1px solid #222" }}>
                  <td>{a.email ?? "—"}</td>
                  <td>{a.plan}{a.plan === "business" ? ` · ${a.seats} seats` : ""}</td>
                  <td>{a.billing ?? "—"}</td>
                  <td>{a.status}{a.cancelAtEnd ? " · cancels" : ""}</td>
                  <td>{day(a.periodEnd)}</td>
                  <td>{day(a.since)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
