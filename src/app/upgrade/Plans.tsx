"use client";
import { useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuBriefcase, LuCheck, LuMinus, LuRocket, LuSparkles, LuZap } from "react-icons/lu";

// Orbi plans. Free is everything that works today; Pro and Business are what is planned next (early access, no
// payments yet), so every paid line is marked "soon" until it ships.

const MAIL = "transferorbi@gmail.com";
const ask = (plan: string) => `mailto:${MAIL}?subject=${encodeURIComponent(`Orbi ${plan}: early access`)}&body=${encodeURIComponent(`Hi Orbi team,\n\nI'd like early access to ${plan}.\nTeam size:\nWhat we'd use it for:\n`)}`;

type Plan = { id: string; name: string; icon: typeof LuZap; tag: string; month: number | null; year: number | null; per?: string; blurb: string; cta: string; href: string; best?: boolean; lead?: string; points: string[] };

const PLANS: Plan[] = [
  {
    id: "free", name: "Free", icon: LuZap, tag: "Today", month: 0, year: 0, blurb: "Instant, encrypted sharing for anyone. No account, no install.",
    cta: "Open Orbi", href: "/work",
    points: ["Files up to 20 GB, any format", "End-to-end encrypted in the browser", "Lives 5 to 30 minutes, then burns", "Notes, tasks and wiring (30 min)", "Private spaces with a code", "Nearby: see who's on your Wi-Fi", "Live viewers, previews, archive"],
  },
  {
    id: "pro", name: "Pro", icon: LuRocket, tag: "Soon", month: 8, year: 6, per: "per month", blurb: "For people who send every day and want things to stay a little longer.",
    cta: "Get early access", href: ask("Pro"), best: true, lead: "Everything in Free, plus",
    points: ["Keep files up to 7 days, or until you delete", "Pinned notes and tasks with no timer", "Files up to 100 GB", "Your own link: orbitransfer.com/you", "Download receipts (who, when, which device)", "Download limits, expiry date, burn after read", "Send history for 30 days", "Desktop and phone apps (drag to the menu bar)"],
  },
  {
    id: "business", name: "Business", icon: LuBriefcase, tag: "Soon", month: 16, year: 12, per: "per user / month", blurb: "A shared workspace for teams that move files, notes and tasks together.",
    cta: "Talk to us", href: ask("Business"), lead: "Everything in Pro, plus",
    points: ["Team workspaces that never expire", "Members, roles and invites by email", "Task boards with due dates, routes and owners", "Pooled storage: 1 TB per user", "Admin console: devices, sessions, revoke", "Audit log of every send and download", "Your logo and domain on share pages", "Google / Microsoft sign-in (SSO)", "Slack and Teams alerts, API and webhooks", "Priority support"],
  },
];

type Row = [string, string | boolean, string | boolean, string | boolean];
const TABLE: { group: string; rows: Row[] }[] = [
  { group: "Sending", rows: [
    ["Largest file", "20 GB", "100 GB", "250 GB"],
    ["End-to-end encryption", true, true, true],
    ["Direct device-to-device transfer", true, true, true],
    ["Open link or passcode", true, true, true],
    ["Download limit and expiry date", false, true, true],
    ["Burn after the first download", false, true, true],
  ] },
  { group: "Time", rows: [
    ["How long a file stays", "5 to 30 min", "up to 7 days", "until deleted"],
    ["Notes and tasks", "30 min", "no timer", "no timer"],
    ["Send history", false, "30 days", "1 year"],
  ] },
  { group: "Spaces and teams", rows: [
    ["Public workspace and Nearby", true, true, true],
    ["Private spaces with a code", true, true, true],
    ["Spaces that never expire", false, "3", "unlimited"],
    ["Members, roles, email invites", false, false, true],
    ["Task boards: due dates, owners, routes", "basic", "basic", true],
  ] },
  { group: "Control and security", rows: [
    ["Download receipts", false, true, true],
    ["Your own link and branding", false, "link", "logo + domain"],
    ["Admin console and audit log", false, false, true],
    ["SSO (Google, Microsoft)", false, false, true],
    ["Data region choice", false, false, true],
  ] },
  { group: "Apps and integrations", rows: [
    ["Works in any browser", true, true, true],
    ["Desktop and phone apps", false, true, true],
    ["Slack / Teams alerts", false, false, true],
    ["API and webhooks", false, false, true],
    ["Support", "community", "email", "priority"],
  ] },
];

const IDEAS = [
  ["Drop box", "A link anyone can send files into, straight to your workspace, without seeing anything else."],
  ["Scheduled send", "Write it now, it lands in the space at 9:00 tomorrow."],
  ["Watermarked previews", "Viewers see the file stamped with their name; downloads can be switched off."],
  ["Offline nearby", "Two devices on the same Wi-Fi send to each other even when the internet is down."],
  ["Proof of delivery", "A signed receipt when the other side has the file: who, when, on what."],
  ["Hand-off", "Copy on your phone, paste on your laptop: your devices share one clipboard."],
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <LuCheck className="pl-yes" aria-label="Included" />;
  if (v === false) return <LuMinus className="pl-no" aria-label="Not included" />;
  return <span>{v}</span>;
}

export default function Plans() {
  const [yearly, setYearly] = useState(true);
  return (
    <main className="pl">
      <header className="pl-bar">
        <button className="pl-back pill lg-press" onClick={() => (history.length > 1 ? history.back() : location.assign("/"))}><LuArrowLeft aria-hidden /> Back to Orbi</button>
      </header>

      <section className="pl-hero">
        <span className="pl-kicker lg"><LuSparkles aria-hidden /> Plans</span>
        <h1 className="wide">Send it now.<br />Keep it as long as you need.</h1>
        <p>Orbi stays free for instant, encrypted sharing. Pro and Business add time, control and a real home for your team. Paid plans open soon: ask for early access and we&apos;ll set you up first.</p>
        <div className="pl-bill lg" role="radiogroup" aria-label="Billing">
          <button role="radio" aria-checked={!yearly} className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
          <button role="radio" aria-checked={yearly} className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly <em>save 25%</em></button>
        </div>
      </section>

      <section className="pl-cards">
        {PLANS.map((p) => {
          const price = yearly ? p.year : p.month;
          return (
            <article key={p.id} className={`pl-card lg${p.best ? " best" : ""}`}>
              {p.best && <span className="pl-pop">Most popular</span>}
              <div className="pl-head">
                <span className="pl-ic"><p.icon aria-hidden /></span>
                <b className="wide">{p.name}</b>
                <span className={`pl-tag${p.tag === "Today" ? " now" : ""}`}>{p.tag === "Today" ? "Available now" : "Coming soon"}</span>
              </div>
              <div className="pl-price">
                <strong className="wide">${price}</strong>
                <span>{p.per ? `${p.per}${yearly && price ? ", billed yearly" : ""}` : "forever"}</span>
              </div>
              <p className="pl-blurb">{p.blurb}</p>
              {p.href.startsWith("/") ? <Link className={`pl-cta lg-press${p.best ? " cta" : " lg"}`} href={p.href}>{p.cta}</Link> : <a className={`pl-cta lg-press${p.best ? " cta" : " lg"}`} href={p.href}>{p.cta}</a>}
              {p.lead && <span className="pl-lead">{p.lead}</span>}
              <ul>{p.points.map((x) => <li key={x}><LuCheck aria-hidden />{x}</li>)}</ul>
            </article>
          );
        })}
      </section>

      <section className="pl-table" aria-label="Compare plans">
        <h2 className="wide">Compare every feature</h2>
        <div className="pl-grid lg">
          <div className="pl-row pl-th"><span /><span>Free</span><span>Pro</span><span>Business</span></div>
          {TABLE.map((g) => (
            <div key={g.group} className="pl-group">
              <div className="pl-gname">{g.group}</div>
              {g.rows.map((r) => (
                <div key={r[0]} className="pl-row"><span>{r[0]}</span><Cell v={r[1]} /><Cell v={r[2]} /><Cell v={r[3]} /></div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="pl-ideas">
        <h2 className="wide">On the way</h2>
        <p>Ideas we are building next for Pro and Business. Tell us which one you want first.</p>
        <div className="pl-idea-grid">
          {IDEAS.map(([t, d]) => (
            <div key={t} className="pl-idea lg"><b>{t}</b><span>{d}</span></div>
          ))}
        </div>
      </section>

      <section className="pl-faq">
        <h2 className="wide">Questions</h2>
        <details><summary>Will the free plan stay free?</summary><p>Yes. Instant, encrypted sharing with no account stays free. Paid plans add time, storage and team tools on top.</p></details>
        <details><summary>Can Orbi read my files on a paid plan?</summary><p>No. Files are encrypted in your browser on every plan; the keys never reach our servers.</p></details>
        <details><summary>When can I pay?</summary><p>Paid plans are not open yet. Ask for early access and we&apos;ll contact you when your plan is ready, with an early-access price.</p></details>
        <details><summary>Do Classic and Work have the same plans?</summary><p>Yes. Classic and Work are two looks of the same Orbi: a plan covers both.</p></details>
      </section>

      <footer className="pl-foot">
        <span>Questions? <a href={`mailto:${MAIL}`}>{MAIL}</a></span>
        <span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></span>
      </footer>
    </main>
  );
}
