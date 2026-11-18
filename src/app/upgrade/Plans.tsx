"use client";

// /upgrade on the blackboard. Free, Pro and Business are all open: paid plans are bought through Paddle (merchant of
// record) after logging in (lib/checkout.ts). Every line listed under a plan is built and enforced (lib/plans.ts);
// ideas that aren't built live only in the roadmap. The `yearly` toggle drives every price on the page. Styles: ./upgrade.css (ug-*) on top of ../site.css (sx-*).

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { Arrow, Check, Ghost, VoidLink, SecHead, Ticker } from "@/components/SiteChrome";
import { FAQ } from "./faq";
import { buy } from "@/lib/checkout";
import { useSession } from "@/lib/auth";

const MAIL = "transferorbi@gmail.com";
// one developer, no team: "Hi Orbi,"
const idea = (name: string) => `mailto:${MAIL}?subject=${encodeURIComponent(`Orbi idea: ${name}`)}&body=${encodeURIComponent(`Hi Orbi,\n\nI'd use ${name} for:\n`)}`;

const TOTAL = "09";
const v = (o: Record<string, string | number>) => o as CSSProperties;

/* ------------------------------------------------------------------ data ------------------------------------------------------------------ */

type PlanId = "free" | "pro" | "business";
type Plan = { id: PlanId; n: string; name: string; now: boolean; month: number; year: number; blurb: string; lead: string; points: string[] };

// spaces themselves already stay (only what is inside them burns), so the paid line is "nothing burns"
const BUSINESS_POINTS = [
  "Files up to 250 GB each",
  "Keep files up to 30 days (delete any time)",
  "1 TB of storage shared by the whole team",
  "Add your team by email: each seat gets Business",
  "Team history: every send by every member, for 1 year",
  "Download counts kept in the history after a file burns",
  "One bill for the team: add or remove seats any time",
  "Priority email support",
]

const PLANS: Plan[] = [
  {
    id: "free", n: "01", name: "Free", now: true, month: 0, year: 0,
    blurb: "Instant, encrypted sharing for anyone. Open the page and send.",
    lead: "What you get today",
    points: [
      "Files up to 20 GB, any format, folders too",
      "End-to-end encrypted in the browser",
      "Lives 5 to 30 minutes, then burns",
      "Download limit: 1 to 10, or unlimited",
      "Live log: every open and download, with device and time",
      "Bubble notes, tasks and wiring up to 8 h (in testing)",
      "Spaces, public or locked with a code",
      "Nearby, live viewers, previews",
      "Archive on this device",
    ],
  },
  {
    id: "pro", n: "02", name: "Pro", now: true, month: 8, year: 6,
    blurb: "For people who send every day and want things to stay a little longer.",
    lead: "Everything in Free, plus",
    points: [
      "Files up to 100 GB each",
      "Keep files up to 7 days: 1 hour, 6 hours, 1, 3 or 7 days",
      "200 GB stored at the same time",
      "Send history for 30 days: what, when, how many downloads",
      "Your plan on every device: log in with email or Google",
      "Cancel any time · 14-day refund",
      "Email support",
    ],
  },
  {
    id: "business", n: "03", name: "Business", now: true, month: 16, year: 12,
    blurb: "A shared workspace for teams that move files, notes and tasks together.",
    lead: "Everything in Pro, plus",
    points: BUSINESS_POINTS,
  },
];

type Val = string | boolean;
type Row = [string, Val, Val, Val];
const TABLE: { n: string; group: string; rows: Row[] }[] = [
  { n: "5.1", group: "Sending", rows: [
    ["Largest file", "20 GB", "100 GB", "250 GB"],
    ["End-to-end encryption in the browser", true, true, true],
    ["Direct device to device, encrypted copy as fallback", true, true, true],
    ["Resume after a dropped connection", true, true, true],
    ["Open link or passcode", true, true, true],
    ["Download limit (1 to 10)", true, true, true],
  ] },
  { n: "5.2", group: "Time and storage", rows: [
    ["How long a file stays", "5 to 30 min", "up to 7 days", "up to 30 days"],
    ["Stored at the same time", "—", "200 GB", "1 TB per team"],
    ["Send history", false, "30 days", "1 year, whole team"],
    ["Download counts kept after it burns", false, true, true],
  ] },
  { n: "5.3", group: "Spaces and teams", rows: [
    ["Public void, Nearby and Wi-Fi", true, true, true],
    ["Spaces, public or locked with a code", true, true, true],
    ["Bubble notes and tasks", true, true, true],
    ["Team members by email (seats)", false, false, true],
    ["One bill, seats added or removed any time", false, false, true],
  ] },
  { n: "5.4", group: "Account and support", rows: [
    ["Account needed", "no", "email or Google", "email or Google"],
    ["Live viewers and downloads while it floats", true, true, true],
    ["Any browser, Classic and Work looks", true, true, true],
    ["Cancel any time, 14-day refund", "—", true, true],
    ["Support", "best effort", "email", "priority"],
  ] },
];

// the roadmap: codename, plain name, what it does
const IDEAS: [string, string, string][] = [
  ["Inbox", "Drop box", "A link anyone can send files into, straight to your workspace, without seeing anything else."],
  ["Later", "Scheduled send", "Write it now; it lands in the space at 9:00 tomorrow."],
  ["Stamp", "Watermarked previews", "Viewers see the file stamped with their name; downloads can be switched off."],
  ["Mesh", "Offline nearby", "Two devices on the same Wi-Fi send to each other even when the internet is down."],
  ["Seal", "Signed receipts", "Proof of delivery nobody can edit, not even the sender: signed when the file lands, checkable by anyone."],
  ["Relay", "Hand-off", "Copy on your phone, paste on your laptop: your devices share one clipboard."],
  ["Handle", "Your own link", "orbitransfer.com/you: a page people send files to, or pick up what you left them."],
  ["Dock", "Desktop and phone apps", "Drag onto the menu bar or share from your phone's share sheet."],
  ["Brand", "Your logo and domain", "Share pages with your team's logo, on your own domain."],
  ["Hook", "API, Slack and Teams", "Send from scripts, and get a ping when a file lands or is downloaded."],
];

const PROMISES: [string, string][] = [
  ["Sending stays free.", "Instant, encrypted, no account. The free tier is not a trial and it isn't going anywhere."],
  ["Encrypted on every plan.", "Files are locked in your browser on Free, Pro and Business alike. Paying never gives us a key."],
  ["No ads. Nothing sold.", "No ads, no third-party trackers, and what you send is never sold or shared."],
  ["One plan, both looks.", "Classic and Work are two looks of the same Orbi. A plan covers both."],
];

const CONTROLS: [string, string][] = [
  ["Send history", "Every file you sent, in your account: 30 days on Pro, a year on Business."],
  ["Downloads kept", "How many times it was downloaded, still there after it burns."],
  ["Longer lives", "Pick 1 hour, 6 hours, 1, 3 or 7 days (30 on Business) when you send."],
  ["Every device", "Log in with email or Google and the plan is there."],
]

// Fig. 1: 60 minute ticks around the dial (r 150), every fifth one longer and brighter
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i * 6 * Math.PI) / 180;
  const at = (r: number) => [Math.round((180 + r * Math.sin(a)) * 100) / 100, Math.round((180 - r * Math.cos(a)) * 100) / 100];
  const major = i % 5 === 0;
  const [x1, y1] = at(major ? 132 : 141);
  const [x2, y2] = at(150);
  return { x1, y1, x2, y2, major };
});

// Fig. 2: log axis, x = (log10(minutes) − 0.6) / 4.6
const AXIS: { id: string; x: string; t: string }[] = [
  { id: "5m", x: "2.2%", t: "5 min" },
  { id: "30m", x: "19.1%", t: "30 min" },
  { id: "1h", x: "25.6%", t: "1 hour" },
  { id: "1d", x: "55.6%", t: "1 day" },
  { id: "7d", x: "74%", t: "7 days" },
  { id: "30d", x: "87.7%", t: "30 days" },
  { id: "inf", x: "100%", t: "No end" },
];
const LANES: { name: string; live: boolean; to: string; end: string; fill: "f" | "h"; tail?: boolean }[] = [
  { name: "Free", live: true, to: "19.1%", end: "5 to 30 min", fill: "f" },
  { name: "Pro", live: true, to: "74%", end: "up to 7 days", fill: "f" },
  { name: "Business", live: true, to: "87.7%", end: "up to 30 days", fill: "f" },
];

const RECEIPT_DL: [string, string, string, string][] = [
  ["1", "14:06", "maya", "iPhone · Safari"],
  ["2", "14:31", "jon", "Windows · Edge"],
  ["3", "15:10", "maya", "Mac · Chrome"],
];

const MEMBERS: [string, string][] = [["A", "Owner"], ["J", "Admin"], ["M", "Member"], ["R", "Member"], ["S", "Invited"]];
const BOARD: { col: string; add?: boolean; cards: { t: string; m?: string; o: string; done?: boolean }[] }[] = [
  { col: "To do", add: true, cards: [{ t: "Task 4", m: "Due Fri · → J · brief.pdf", o: "J" }, { t: "Task 5", m: "→ M", o: "M" }] },
  { col: "Doing", cards: [{ t: "Task 3", m: "→ R · cut-v3.mov", o: "R" }, { t: "Task 6", m: "Due Mon · → A · deck.pdf", o: "A" }] },
  { col: "Done", cards: [{ t: "Task 1", m: "logo.svg", o: "A", done: true }, { t: "Task 2", o: "R", done: true }] },
];
const LOG: [string, string][] = [
  ["09:12", "A created Task 4"],
  ["09:20", "J sent cut-v3.mov"],
  ["09:21", "M downloaded cut-v3.mov"],
  ["10:02", "A added S to the team"],
  ["10:15", "R sent logo.svg · 7 days"],
  ["11:40", "S downloaded deck.pdf"],
  ["11:41", "deck.pdf · 4 downloads · burned"],
];

/* --------------------------------------------------------------- small parts --------------------------------------------------------------- */

const price = (p: Plan, yearly: boolean) => (yearly ? p.year : p.month);
const headPrice = (p: Plan, yearly: boolean) =>
  p.id === "free" ? "$0" : p.id === "pro" ? `$${price(p, yearly)}/mo` : `$${price(p, yearly)}/user/mo`;

function Cell({ v: val }: { v: Val }) {
  if (val === true) return <Check />;
  if (val === false)
    return (
      <span className="ug-no">
        <span className="sx-sr">Not included</span>
      </span>
    );
  return <>{val}</>;
}

/** Fig. 1 — the chalk clock: one hour on the dial, Free drawn on the first half. The viewBox is cropped to the
 *  drawing (the r 150 ring left and right, the burn tick at the bottom), so the dial registers to the figure edges. */
function Clock() {
  return (
    <svg className="ug-dial" viewBox="28 28 304 316" aria-hidden focusable="false" data-anim>
      <circle cx="180" cy="180" r="150" fill="none" stroke="#2a2a2a" />
      {TICKS.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.major ? "#4a4a4a" : "#2a2a2a"} />
      ))}
      <path d="M180 330A150 150 0 0 1 180 30" fill="none" stroke="#4a4a4a" strokeDasharray="2 6" />
      <path className="ug-arc" pathLength={1} d="M180 30A150 150 0 0 1 180 330" fill="none" stroke="#f2f2f2" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M180 322v20" stroke="#ff3b30" strokeWidth="2" />
      <text x="180" y="66">0</text>
      <text x="298" y="184">15</text>
      <text x="180" y="302" className="on">30</text>
      <text x="62" y="184">45</text>
      <g className="ug-hand">
        <line x1="180" y1="180" x2="180" y2="80" stroke="#f2f2f2" strokeWidth="1.25" />
        <circle cx="180" cy="180" r="4" fill="#f2f2f2" />
      </g>
    </svg>
  );
}

/** Monthly / Yearly, a radiogroup with roving focus (arrow keys switch and move focus). */
function Billing({ yearly, set }: { yearly: boolean; set: (y: boolean) => void }) {
  const mRef = useRef<HTMLButtonElement>(null);
  const yRef = useRef<HTMLButtonElement>(null);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const k = e.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(k)) return;
    e.preventDefault();
    const next = k === "Home" ? false : k === "End" ? true : !yearly;
    set(next);
    (next ? yRef : mRef).current?.focus();
  };
  return (
    <div className="ug-billw">
      <div className="ug-bill" role="radiogroup" aria-label="Billing">
        <button ref={mRef} type="button" role="radio" aria-checked={!yearly} tabIndex={yearly ? -1 : 0} className="sx-chipf" onClick={() => set(false)} onKeyDown={onKey}>
          Monthly
        </button>
        <button ref={yRef} type="button" role="radio" aria-checked={yearly} tabIndex={yearly ? 0 : -1} className="sx-chipf" onClick={() => set(true)} onKeyDown={onKey}>
          Yearly
          <em className="ug-save">
            <span aria-hidden>−25%</span>
            <span className="sx-sr">, 25% less</span>
          </em>
        </button>
      </div>
      <span className="sx-label ug-bill-note">USD · cancel any time · 14-day refund</span>
      <span className="sx-sr" aria-live="polite">
        {yearly ? "Yearly prices shown, billed yearly, 25% less." : "Monthly prices shown."}
      </span>
    </div>
  );
}

function Period({ p, yearly }: { p: Plan; yearly: boolean }) {
  if (p.id === "free") return <>No account · No card</>;
  if (p.id === "pro")
    return yearly ? (
      <>
        <s><span className="sx-sr">instead of </span>$8</s> per month · billed yearly · $72/yr
      </>
    ) : (
      <>per month</>
    );
  return yearly ? (
    <>
      <s><span className="sx-sr">instead of </span>$16</s> per user / month · billed yearly · $144/yr
    </>
  ) : (
    <>per user / month</>
  );
}

function PlanCta({ p, yearly }: { p: Plan; yearly: boolean }) {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [seats, setSeats] = useState(1);
  const billing = yearly ? "yearly" : "monthly";
  // back from logging in with ?buy=pro-yearly: open that checkout once
  useEffect(() => {
    if (p.id === "free" || !session) return;
    const want = new URLSearchParams(location.search).get("buy");
    if (want !== `${p.id}-yearly` && want !== `${p.id}-monthly`) return;
    history.replaceState(null, "", location.pathname + location.hash);
    void go(want.endsWith("yearly") ? "yearly" : "monthly");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, p.id]);
  if (p.id === "free")
    return (
      <>
        <VoidLink href="/" className="sx-pill solid">
          Open Orbi
        </VoidLink>
        <VoidLink href="/work" className="sx-link">
          or the Work look <Arrow dir="right" />
        </VoidLink>
      </>
    );
  async function go(b: "monthly" | "yearly" = billing) {
    setBusy(true);
    setErr("");
    try {
      await buy(p.id as "pro" | "business", b, seats);
    } catch (e) {
      setErr((e as Error).message || "Checkout is unavailable right now");
    }
    setBusy(false);
  }
  const name = p.id === "pro" ? "Pro" : "Business";
  return (
    <>
      {p.id === "business" && (
        <label className="sx-label ug-seats">
          Seats
          <input type="number" min={1} max={500} value={seats} onChange={(e) => setSeats(Math.max(1, Math.min(500, Math.floor(Number(e.target.value) || 1))))} />
        </label>
      )}
      <button type="button" className={`sx-pill${p.id === "pro" ? " solid" : ""}`} onClick={() => go()} disabled={busy}>
        {busy ? "Opening checkout…" : session ? `Get ${name}` : `Get ${name}`} <Arrow dir="up-right" />
      </button>
      <Link href="/refunds" className="sx-link ug-refund">
        14-day refund <Arrow dir="right" />
      </Link>
      {err && (
        <span className="sx-label ug-err" role="alert">
          {err}
        </span>
      )}
    </>
  );
}

/** The page's one hand-drawn stroke: a chalk loop around Free's $0, two passes, drawn once when the price enters.
 *  The viewBox is the price box in thousandths of an em (1.038em × 0.8em), so the loop scales with the price at every
 *  width. It is fitted to the real ink of "$0" (≥ 7px clear of both glyphs) and leaves the box by only 0.08em on the
 *  left, so on a phone it still stays inside the 16px gutter. It overshoots its start at the top, as chalk does. */
const LOOP = "M430 -128C800 -150 1175 60 1169 353C1166 630 890 846 544 842C200 838 -78 630 -81 353C-84 80 190 -140 560 -138C700 -136 820 -112 900 -80";
function ChalkCircle() {
  return (
    <svg className="ug-chalk" viewBox="0 0 1038 800" preserveAspectRatio="none" aria-hidden focusable="false" data-chalk>
      <path className="c" pathLength={1} d={LOOP} fill="none" stroke="#f2f2f2" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
      <path className="c" pathLength={1} d={LOOP} transform="translate(10 16) rotate(-1.5 544 353)" fill="none" stroke="#f2f2f2" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" opacity=".35" />
    </svg>
  );
}

function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`sx-lead ${className}`} data-reveal>
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ page ------------------------------------------------------------------ */

export default function Plans() {
  const [yearly, setYearly] = useState(true);

  return (
    <>
      {/* 00 ─ hero */}
      <section id="void" className="sx-sec sx-sky sx-hero sx-hero-in ug-hero" data-chapter="00|Upgrade" aria-labelledby="ug-h1">
        <div className="sx-in">
          <div className="sx-meta" data-anim>
            <span>(00) Upgrade</span>
            <span>Plans &amp; pricing</span>
            <span>
              <i className="sx-dot" aria-hidden />
              Free is live today
            </span>
            <span>Pro &amp; Business: open</span>
          </div>

          <div className="sx-fit ug-fit-h1">
            <h1 id="ug-h1" className="sx-mega ug-h1">
              <span className="ln">
                Time is <span className="brk">the</span>
              </span>{" "}
              <span className="ln sx-out">upgrade.</span>
            </h1>
          </div>

          <div className="sx-grid ug-hero-row">
            <div className="ug-hero-l">
              <p className="sx-lead sx-h-late">
                Sending stays free: instant, end-to-end encrypted, no account. Pro and Business are for what thirty minutes can&apos;t hold: files that stay for days, files up to 250 GB, a history of what you sent, and storage your team shares.
              </p>
              <div className="ug-ctas sx-h-late">
                <a href="#plans" className="sx-pill solid">
                  See the plans <Arrow dir="down" />
                </a>
                <Link href="/account" className="sx-link">
                  Log in or sign up <Arrow dir="right" />
                </Link>
              </div>
            </div>
            <figure className="sx-figure ug-clock sx-h-fig">
              <Clock />
              <ul className="ug-legend sx-label">
                <li>
                  <i aria-hidden />
                  Free · 5 to 30 min, then it burns
                </li>
                <li>
                  <i className="d" aria-hidden />
                  Pro · up to 7 days
                </li>
                <li>
                  <i className="d" aria-hidden />
                  Business · up to 30 days
                </li>
              </ul>
              <figcaption className="sx-cap">Fig. 1 — One hour on the dial. Free lives on half of it.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <Ticker items={["Free forever", "Pro · 7 days · 100 GB", "Business · 30 days · 250 GB", "Sending stays free", "Encrypted on every plan", "14-day refund"]} />

      {/* 01 ─ the plans */}
      <section id="plans" className="sx-sec ug-plans-sec" data-chapter="01|Plans" aria-labelledby="ug-plans-h">
        <div className="sx-in">
          <SecHead n="01" label="The plans" kicker="Pricing" total={TOTAL} />
          <div className="ug-top">
            <h2 id="ug-plans-h" className="sx-h2 ug-pick" data-reveal>
              <span className="ln">Pick your</span>{" "}
              <span className="ln">orbit.</span>
            </h2>
            <Billing yearly={yearly} set={setYearly} />
          </div>

          <div className="ug-plans">
            {PLANS.map((p, i) => (
              <article key={p.id} className={`ug-plan ${p.id}`} aria-labelledby={`ug-p-${p.id}`} data-reveal style={v({ "--i": i })}>
                <div className="ug-pmeta" data-anim={p.now || undefined}>
                  <span className="sx-label">{p.n}</span>
                  <span className="sx-st now">Available now</span>
                </div>
                <h3 id={`ug-p-${p.id}`} className="ug-name">
                  {p.name}
                </h3>
                <div className="ug-pc">
                  <div className="ug-price sx-num">
                    <span className="cur">$</span>
                    <b key={price(p, yearly)} className="ug-amt">
                      {price(p, yearly)}
                    </b>
                    {p.id === "free" && <ChalkCircle />}
                  </div>
                  {p.id === "free" && (
                    <>
                      <svg className="ug-arrow" viewBox="0 0 40 30" fill="none" stroke="#f2f2f2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
                        <path d="M38 4C28 8 18 16 6 24" />
                        <path d="M6 24l9-1.5M6 24l2.5-8.5" />
                      </svg>
                      <span className="ug-note sx-label" aria-hidden>
                        sending stays free
                      </span>
                    </>
                  )}
                </div>
                <p className="sx-label ug-per">
                  <Period p={p} yearly={yearly} />
                </p>
                <p className="sx-body ug-blurb">{p.blurb}</p>
                <div className="ug-pcta">
                  <PlanCta p={p} yearly={yearly} />
                </div>
                <p className="sx-label ug-lead">{p.lead}</p>
                <ul className="ug-list">
                  {p.points.map((x) => (
                    <li key={x}>
                      <i className="sx-sq t" aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="sx-label ug-foot">
            Prices in USD; local taxes added at checkout where they apply. Payments are handled by Paddle.com, our reseller and merchant of record. Cancel any time ·{" "}
            <Link href="/refunds">14-day refund</Link> · <Link href="/terms">Terms</Link>
          </p>
        </div>
      </section>

      {/* 02 ─ time and size */}
      <section id="time" className="sx-sec ug-time" data-chapter="02|Time" aria-labelledby="ug-time-h">
        <Ghost text="30 MIN" className="ug-g-time" />
        <div className="sx-in">
          <SecHead n="02" label="What the plans buy" kicker="Time" total={TOTAL} />
          <h2 id="ug-time-h" className="sx-h2" data-reveal>
            <span className="ln">Thirty minutes</span>{" "}
            <span className="ln">is a feature.</span>
          </h2>
          <div className="sx-grid">
            <p className="sx-body ug-time-b" data-reveal>
              Free is built to forget: the shorter something lives, the less there is to leak. Pro and Business are for the things you still need tomorrow, and for bigger things.
            </p>
          </div>

          <figure className="sx-figure ug-chart" data-grow>
            <div className="ug-plot" aria-hidden>
              <div className="ug-gl">
                {AXIS.map((a) => (
                  <span key={a.id} data-tick={a.id} style={v({ "--x": a.x })} />
                ))}
              </div>
              {LANES.map((l, i) => (
                <div key={l.name} className="ug-lane" style={v({ "--i": i })} data-anim={l.live || undefined}>
                  <div className="ug-lane-h">
                    <div className="ug-lane-n">
                      <b>{l.name}</b>
                      <span className={`sx-label ug-lane-st${l.live ? " ug-on" : ""}`}>
                        <i className="sx-dot" />
                        Live
                      </span>
                    </div>
                    <span className="sx-label ug-end m">{l.end}</span>
                  </div>
                  <div className="ug-track">
                    <i className={`ug-bar ${l.fill}${l.tail ? " ug-tail" : ""}`} style={v({ "--from": "2.2%", "--to": l.to })} />
                    <span className={`sx-label ug-end d${l.tail ? " r" : ""}`} style={v({ "--to": l.to })}>
                      {l.end}
                    </span>
                  </div>
                </div>
              ))}
              <div className="ug-ticks">
                {AXIS.map((a) => (
                  <span key={a.id} className="sx-label" data-tick={a.id} style={v({ "--x": a.x })}>
                    {a.t}
                  </span>
                ))}
              </div>
            </div>
            <p className="sx-sr">Free: 5 to 30 minutes. Pro: up to 7 days. Business: up to 30 days.</p>
            <figcaption className="sx-cap">Fig. 2 — How long a file can stay, per plan, on a log scale.</figcaption>
          </figure>

          <div className="sx-grid ug-size-row">
            <figure className="sx-figure ug-size">
              <div className="ug-sq-box" data-grow>
                <svg viewBox="0 0 400 400" aria-hidden focusable="false">
                  <rect className="b" x=".75" y=".75" width="398.5" height="398.5" fill="none" stroke="#f2f2f2" strokeWidth="1.25" style={v({ "--i": 2 })} />
                  <rect className="p" x=".75" y="147.02" width="252.23" height="252.23" fill="#0b0b0b" stroke="#f2f2f2" strokeWidth="1.25" strokeDasharray="4 4" style={v({ "--i": 1 })} />
                  <rect className="f" x=".75" y="286.86" width="112.39" height="112.39" fill="#f2f2f2" style={v({ "--i": 0 })} />
                </svg>
                <span className="ug-sz b" aria-hidden style={v({ "--i": 2 })}>
                  <b>250 GB</b>
                  <span className="sx-label">Business</span>
                </span>
                <span className="ug-sz p" aria-hidden style={v({ "--i": 1 })}>
                  <b>100 GB</b>
                  <span className="sx-label">Pro</span>
                </span>
                <span className="ug-sz f" aria-hidden style={v({ "--i": 0 })}>
                  <b>20 GB</b>
                  <span className="sx-label">Free</span>
                </span>
              </div>
              <p className="sx-sr">Largest single file: Free 20 GB, Pro 100 GB, Business 250 GB.</p>
              <figcaption className="sx-cap">Fig. 3 — Largest single file. Area to scale.</figcaption>
            </figure>
            <div className="ug-size-r" data-reveal>
              <h3 className="sx-h3">How big it gets</h3>
              <p className="sx-body ug-size-b">
                Free already takes files up to 20 GB, any format, folders included. Pro raises the ceiling to 100 GB, Business to 250 GB. Every size travels the same way: sealed 8 MB chunks, and a dropped connection resumes where it stopped.
              </p>
              <div className="ug-pool">
                <span className="sx-label">Business · storage pool</span>
                <div className="ug-pool-sq" data-grow aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} style={v({ "--i": i })} />
                  ))}
                </div>
                <p className="sx-small">1 TB shared by the whole team, whatever its size. Pro keeps 200 GB at once.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 ─ proof (Pro) */}
      <section id="proof" className="sx-sec ug-proof" data-chapter="03|Proof" aria-labelledby="ug-proof-h">
        <div className="sx-in">
          <SecHead n="03" label="History · Pro" kicker="Receipts" total={TOTAL} />
          <h2 id="ug-proof-h" className="sx-h2" data-reveal>
            <span className="ln">Who got it.</span>{" "}
            <span className="ln">When.</span>
          </h2>
          <div className="sx-grid">
            <Lead className="ug-proof-l">
              Free already shows every open and download while an object floats, lets you cap downloads, and destroys it whenever you say. Pro adds a history in your account: every file you sent, its size, when it burns, and how many times it was downloaded, kept after it burns.
            </Lead>
          </div>

          <div className="sx-grid ug-proof-row">
            <figure className="sx-figure ug-receipt" data-reveal>
              <div className="ug-rc">
                <div className="ug-rc-h">
                  <span>Orbi · receipt</span>
                  <span>Example</span>
                </div>
                <i className="ug-rc-sep" aria-hidden />
                <dl className="ug-rc-kv">
                  <div><dt>Object</dt><dd>site-plans.pdf</dd></div>
                  <div><dt>Size</dt><dd>48.2 MB</dd></div>
                  <div><dt>Sent</dt><dd>Tue 14:02 · passcode</dd></div>
                  <div><dt>Limit</dt><dd>3 downloads</dd></div>
                </dl>
                <i className="ug-rc-sep" aria-hidden />
                <ol className="ug-rc-dl">
                  {RECEIPT_DL.map(([n, t, who, dev], i) => (
                    <li key={n} style={v({ "--i": i })}>
                      <span>↓ {n}</span>
                      <span>{t}</span>
                      <span>{who}</span>
                      <span>{dev}</span>
                    </li>
                  ))}
                </ol>
                <i className="ug-rc-sep" aria-hidden />
                <div className="ug-rc-f">
                  <span>Sealed</span>
                  <span>limit reached · burned 15:10</span>
                </div>
              </div>
              <figcaption className="sx-cap">Fig. 4 — A send, as your history keeps it. Example data.</figcaption>
            </figure>

            <div className="ug-proof-r" data-reveal>
              <ul className="ug-ctl">
                {CONTROLS.map(([t, d]) => (
                  <li key={t}>
                    <div className="ug-ctl-t">
                      <h3 className="sx-chipf">{t}</h3>
                      <span className="sx-st now">Live</span>
                    </div>
                    <p className="sx-small">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 04 ─ teams (Business) */}
      <section id="teams" className="sx-sec ug-teams" data-chapter="04|Teams" aria-labelledby="ug-teams-h">
        <Ghost text="TEAM" className="ug-g-team" />
        <div className="sx-in">
          <SecHead n="04" label="Teams · Business" kicker="Workspace" total={TOTAL} />
          <h2 id="ug-teams-h" className="sx-h2" data-reveal>
            <span className="ln">A home</span>{" "}
            <span className="ln">for teams.</span>
          </h2>
          <div className="sx-grid">
            <Lead className="ug-teams-l">
              Business puts your team on one bill: add people by email and each seat gets Business on every device. Files stay up to 30 days, the team shares 1 TB, and the owner sees every send by every member for a year. Spaces, task boards and bubble notes work the same as on Free.
            </Lead>
          </div>

          <figure className="sx-figure ug-ws" data-reveal>
            <div className="ug-ws-f" aria-hidden>
              <div className="ug-ws-top">
                <span className="sx-label">Team · Business</span>
              </div>
              <div className="ug-ws-body">
                <div className="ug-ws-mem">
                  <span className="sx-label">Members · 5</span>
                  <ul>
                    {MEMBERS.map(([a, r]) => (
                      <li key={a}>
                        <span className={`ug-av${r === "Invited" ? " inv" : ""}`}>{a}</span>
                        <span className="sx-label">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="ug-ws-board">
                  {BOARD.map((c) => (
                    <div key={c.col} className="ug-ws-col">
                      <span className="sx-label">
                        {c.col} · {c.cards.length}
                      </span>
                      {c.cards.map((k) => (
                        <div key={k.t} className="ug-card">
                          <b className={k.done ? "done" : undefined}>{k.t}</b>
                          <span className="ug-card-o">{k.o}</span>
                          {k.m && <span className="sx-label ug-card-m">{k.m}</span>}
                        </div>
                      ))}
                      {c.add && <div className="ug-card add sx-label">+ New task</div>}
                    </div>
                  ))}
                </div>
                <div className="ug-ws-log">
                  <span className="sx-label">Team history</span>
                  <ol data-grow>
                    {LOG.map(([t, e], i) => (
                      <li key={t} style={v({ "--i": i })}>
                        <span className="t">{t}</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
            <p className="sx-sr">Example workspace: five members with roles, a task board with three columns, and an audit log.</p>
            <figcaption className="sx-cap">Fig. 5 — A team at work: members, a task board in a space, and the team history. Example data.</figcaption>
          </figure>

          <ul className="ug-list ug-feat">
            {BUSINESS_POINTS.map((x) => (
              <li key={x}>
                <i className="sx-sq t" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 05 ─ compare */}
      <section id="compare" className="sx-sec ug-compare" data-chapter="05|Compare" aria-labelledby="ug-cmp-h">
        <div className="sx-in">
          <SecHead n="05" label="Every line" kicker="Compare" total={TOTAL} />
          <h2 id="ug-cmp-h" className="sx-h2" data-reveal>
            <span className="ln">Compare</span>{" "}
            <span className="ln">everything.</span>
          </h2>
          <table className="ug-cmp">
            <caption className="sx-sr">Compare Free, Pro and Business</caption>
            <colgroup>
              <col className="l" />
              <col className="v" />
              <col className="v" />
              <col className="v" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="ug-cmp-0">
                  <span className="sx-label">{yearly ? "Billed yearly" : "Billed monthly"} · USD</span>
                </th>
                {PLANS.map((p) => (
                  <th key={p.id} scope="col" className={p.id === "pro" ? "pro" : undefined}>
                    <span className="ug-cmp-n">{p.name}</span>
                    <span className="sx-label ug-cmp-p">{headPrice(p, yearly)}</span>
                    {/* phones: the price drops, the status stays (visible and read aloud) */}
                    <span className="sx-label ug-cmp-s">{headPrice(p, yearly)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            {TABLE.map((g) => (
              <tbody key={g.n}>
                <tr className="ug-grp">
                  <th colSpan={4} scope="rowgroup" className="sx-label">
                    <b>{g.n}</b> — {g.group}
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r[0]}>
                    <th scope="row">{r[0]}</th>
                    <td>
                      <Cell v={r[1]} />
                    </td>
                    <td className="pro">
                      <Cell v={r[2]} />
                    </td>
                    <td>
                      <Cell v={r[3]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          <p className="sx-label ug-cmp-note">Everything in this table is live. Ideas we haven&apos;t built yet are in the roadmap below, never in a plan.</p>
        </div>
      </section>

      {/* 06 ─ roadmap */}
      <section id="roadmap" className="sx-sec ug-road-sec" data-chapter="06|Roadmap" aria-labelledby="ug-road-h">
        <Ghost text="NEXT" className="ug-g-next" />
        <div className="sx-in">
          <SecHead n="06" label="On the way" kicker="Roadmap" total={TOTAL} />
          <div className="sx-grid ug-road-top">
            <h2 id="ug-road-h" className="sx-h2" data-reveal>
              <span className="ln">On the</span>{" "}
              <span className="ln">way.</span>
            </h2>
            <p className="sx-body ug-road-b" data-reveal>
              Ideas we want to build next for Pro and Business. Tell us which one you want first: the emails decide the order.
            </p>
          </div>
          <div className="sx-aw ug-road">
            <div className="sx-aw-head" aria-hidden>
              <span>No.</span>
              <span>Codename</span>
              <span>What it does</span>
              <span />
            </div>
            <ol>
              {IDEAS.map(([code, name, text], i) => (
                <li key={code} className="sx-aw-row" data-reveal style={v({ "--i": i })}>
                  <span className="n" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="cn">
                    <h3 className="big">{code}</h3>
                    <span className="sx-label nm">{name}</span>
                  </div>
                  <p>{text}</p>
                  <a className="sx-link go" href={idea(name)}>
                    I want this<span className="sx-sr"> ({name})</span> <Arrow dir="up-right" />
                  </a>
                </li>
              ))}
            </ol>
          </div>
          <p className="sx-label ug-road-note">Ideas, not promises.</p>
        </div>
      </section>

      {/* 07 ─ promises */}
      <section id="promises" className="sx-sec ug-prom-sec" data-chapter="07|Promises" aria-labelledby="ug-prom-h">
        <div className="sx-in">
          <SecHead n="07" label="What stays the same" kicker="Promises" total={TOTAL} />
          <h2 id="ug-prom-h" className="sx-h2" data-reveal>
            <span className="ln">What stays</span>{" "}
            <span className="ln">the same.</span>
          </h2>
          <ul className="ug-prom">
            {PROMISES.map(([t, d], i) => (
              <li key={t} data-reveal style={v({ "--i": i })}>
                <span className="sx-label">{String(i + 1).padStart(2, "0")}</span>
                <h3>{t}</h3>
                <p className="sx-body">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 08 ─ faq */}
      <section id="faq" className="sx-sec ug-faq" data-chapter="08|FAQ" aria-labelledby="ug-faq-h">
        <div className="sx-in">
          <SecHead n="08" label="Fair questions" kicker="FAQ" total={TOTAL} />
          <div className="sx-grid">
            <div className="ug-faq-h">
              <h2 id="ug-faq-h" className="sx-h2" data-reveal>
                <span className="ln">Fair</span>{" "}
                <span className="ln">questions.</span>
              </h2>
              <p className="ug-faq-mail">
                <span className="sx-label">Anything else:</span>
                <a href={`mailto:${MAIL}`}>{MAIL}</a>
              </p>
            </div>
            <div className="ug-faq-l">
              {FAQ.map((f, i) => {
                const [before, after] = f.link ? f.a.split(f.link.text) : [f.a, ""];
                return (
                  <details key={f.q}>
                    <summary>
                      <span className="sx-label">Q.{String(i + 1).padStart(2, "0")}</span>
                      <h3>{f.q}</h3>
                      <i className="ug-plus" aria-hidden />
                    </summary>
                    <p className="ug-ans">
                      {before}
                      {f.link && (
                        <>
                          <Link href={f.link.href} className="ug-inl">
                            {f.link.text}
                          </Link>
                          {after}
                        </>
                      )}
                    </p>
                  </details>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 09 ─ early access */}
      <section id="early" className="sx-sec sx-sky ug-early" data-chapter="09|Start" aria-labelledby="ug-fin">
        {/* solid, and low behind the rows: an outline ghost never sits under the outlined "in line." */}
        <Ghost text="GO" className="ug-g-soon" />
        <div className="sx-in">
          <SecHead n="09" label="Start" kicker="Get a plan" total={TOTAL} />
          <div className="sx-fit ug-fit-fin">
            <h2 id="ug-fin" className="sx-mega ug-fin" data-reveal>
              <span className="ln">
                Make it <span className="brk">last</span>
              </span>{" "}
              <span className="ln sx-out">longer.</span>
            </h2>
          </div>
          <Lead className="ug-early-l">Log in with email or Google, pick a plan, pay through Paddle. It switches on within a minute. Cancel any time; 14-day refund.</Lead>
          <div className="ug-gos">
            <a className="ug-go" href="#plans">
              <span className="ug-go-n">Pro</span>
              <span className="sx-label ug-go-d">7 days · 100 GB · {yearly ? "$6/mo billed yearly" : "$8/mo"}</span>
              <Arrow dir="up-right" className="ug-go-arr" />
            </a>
            <a className="ug-go" href="#plans">
              <span className="ug-go-n">Business</span>
              <span className="sx-label ug-go-d">30 days · 250 GB · {yearly ? "$12/user/mo billed yearly" : "$16/user/mo"}</span>
              <Arrow dir="up-right" className="ug-go-arr" />
            </a>
          </div>
          <p className="sx-label ug-last">
            <span>
              or write to <a href={`mailto:${MAIL}`}>{MAIL}</a>
            </span>
            <VoidLink href="/" className="sx-link">
              Or keep sending, free <Arrow dir="right" />
            </VoidLink>
          </p>
        </div>
      </section>
    </>
  );
}
