import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import SiteChrome, { Arrow, Ghost, HardLink, OrbitMark, SecHead, Ticker } from "@/components/SiteChrome";
import { DEFAULT_SKIN, SKIN_GROUPS, SKINS } from "@/lib/skin-list";
import CopyMail from "./CopyMail";
import "../site.css";
import "./about.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Orbi Transfer is instant, end-to-end encrypted sharing in the browser: no accounts, files up to 20 GB, gone in 5 to 30 minutes. Made anonymously by one developer, for fun.",
  alternates: { canonical: "/about" },
};

const MAIL = "transferorbi@gmail.com";
const N = SKINS.length;
const T = "12";
const v = (o: Record<string, string | number>) => o as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");

/* ---------------------------------------------------------------- figures (all code-drawn) */

/** Fig. 1: three objects orbit the void at three speeds; one is being taken right now (green). SMIL, paused off-screen. */
function Orbits() {
  return (
    <svg className="ab-orbits" viewBox="-40 0 640 560" aria-hidden focusable="false" data-smil data-anim>
      <defs>
        <path id="abO1" d="M405 244.2A130 48 -16 1 1 155 315.8A130 48 -16 1 1 405 244.2Z" />
        <path id="abO2" d="M453 230.4A180 66 -16 1 1 107 329.6A180 66 -16 1 1 453 230.4Z" />
        <path id="abO3" d="M520.3 211.1A250 92 -16 1 1 39.7 348.9A250 92 -16 1 1 520.3 211.1Z" />
        <radialGradient id="abSph" cx=".32" cy=".28" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset=".22" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#1c1c1c" />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
      </defs>
      <path d="M0 280H560M280 20V540" stroke="#161616" />
      <use href="#abO1" fill="none" stroke="#2a2a2a" />
      <use href="#abO2" fill="none" stroke="#2a2a2a" strokeDasharray="2 7" />
      <use href="#abO3" fill="none" stroke="#3a3a3a" />
      <circle cx="280" cy="280" r="66" fill="none" stroke="#f2f2f2" strokeOpacity=".18" strokeDasharray="1 5" />
      <image href="/brand/emblem.svg" x="232" y="235.5" width="96" height="89" />
      <text x="280" y="372" textAnchor="middle">THE VOID</text>
      <path d="M520.3 203v16" stroke="#f2f2f2" />
      <text x="532" y="198">T = 0</text>
      <path d="M79.6 378.9l10 10M89.6 378.9l-10 10" stroke="#ff3b30" strokeWidth="1.5" />
      <text x="84.6" y="418" textAnchor="middle">BURN · T+30 MIN</text>
      <g>
        <circle r="5" fill="#f2f2f2" />
        <text y="24" textAnchor="middle">NOTES.TXT</text>
        <animateMotion dur="20s" begin="-19.4s" repeatCount="indefinite">
          <mpath href="#abO1" />
        </animateMotion>
      </g>
      <g>
        <circle r="11" fill="url(#abSph)" />
        <circle r="17" fill="none" stroke="#f2f2f2" strokeOpacity=".25" />
        <text y="40" textAnchor="middle">PHOTO.JPG</text>
        <animateMotion dur="36s" begin="-2.8s" repeatCount="indefinite">
          <mpath href="#abO2" />
        </animateMotion>
      </g>
      <g>
        <circle r="4" fill="#3dff8c" />
        <circle r="10" fill="none" stroke="#3dff8c" strokeOpacity=".35" />
        <text y="28" textAnchor="middle">BUILD.ZIP</text>
        <animateMotion dur="58s" begin="-31s" repeatCount="indefinite">
          <mpath href="#abO3" />
        </animateMotion>
      </g>
    </svg>
  );
}

/** 48×48 line glyphs for the pipeline stations and the feature index (stroke = currentColor). */
const GLYPH: Record<string, ReactNode> = {
  file: <path d="M14 8h14l8 8v26H14z M28 8v8h8 M10 13v33h22" />,
  split: (
    <>
      {[9, 18, 27, 36].map((y) => (
        <rect key={y} x="8" y={y} width="32" height="6" rx="1" />
      ))}
    </>
  ),
  lock: (
    <>
      <rect x="12" y="22" width="24" height="18" rx="3" />
      <path d="M17 22v-5a7 7 0 0 1 14 0v5" />
      <circle cx="24" cy="31" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  beam: (
    <>
      <path d="M6 24h12 M18 24c8 0 10-10 24-10" />
      <path d="M18 24c8 0 10 10 24 10" strokeDasharray="2 3" />
    </>
  ),
  land: (
    <>
      <rect x="14" y="4" width="20" height="40" rx="4" />
      <path d="M21 39h6" />
    </>
  ),
  resume: (
    <>
      <path d="M8 30h16" />
      <path d="M24 30h16" strokeDasharray="2 3" />
      <path d="M24 22v16" />
    </>
  ),
  burn: (
    <>
      <circle cx="24" cy="24" r="14" opacity=".35" />
      <path d="M24 10A14 14 0 0 1 38 24" />
    </>
  ),
  live: (
    <>
      <circle cx="24" cy="24" r="3" fill="#3dff8c" stroke="none" />
      <path d="M17 17a10 10 0 0 0 0 14 M31 17a10 10 0 0 1 0 14 M12 12a17 17 0 0 0 0 24 M36 12a17 17 0 0 1 0 24" />
    </>
  ),
  nearby: (
    <>
      <circle cx="24" cy="24" r="4" />
      <circle cx="24" cy="24" r="10" />
      <circle cx="24" cy="24" r="17" strokeDasharray="2 4" />
      <circle cx="35" cy="15" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  spaces: (
    <>
      <rect x="9" y="9" width="30" height="30" rx="8" />
      <circle cx="24" cy="22" r="3.5" />
      <path d="M24 25.5v6" />
    </>
  ),
  bubbles: (
    <>
      <circle cx="21" cy="22" r="11" />
      <circle cx="34" cy="32" r="6" />
    </>
  ),
  tasks: (
    <>
      <circle cx="12" cy="36" r="3.5" />
      <circle cx="36" cy="12" r="3.5" />
      <path d="M15 34C26 34 22 14 33 14" />
    </>
  ),
  archive: (
    <>
      <rect x="9" y="14" width="30" height="8" />
      <path d="M11 22v14h26V22 M20 28h8" />
    </>
  ),
  styles: (
    <>
      <circle cx="24" cy="24" r="13" />
      <ellipse cx="24" cy="24" rx="13" ry="5" />
      <circle cx="19" cy="18" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  looks: (
    <>
      <rect x="8" y="12" width="32" height="24" rx="2" />
      <path d="M24 12v24" />
      <circle cx="14" cy="21" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="28" r="2.5" fill="currentColor" stroke="none" />
      <path d="M28 19h8 M28 24h8 M28 29h5" />
    </>
  ),
};

function Glyph({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {GLYPH[name]}
    </svg>
  );
}

/** Fig. 4: the public void is one ~39 × 20 km cell plus its eight neighbours. Illustration. */
const ORBS: [number, number, number, number, number][] = [
  [190, 115, 9, 55, 7],
  [455, 165, 11, 30, 9], // spec had (300,105); moved so the "≈ 39 km" label never sits on it
  [450, 110, 8, 80, 6],
  [205, 175, 6, 45, 8],
  [230, 232, 7, 65, 10],
  [470, 225, 10, 20, 7],
];
const FAR: [number, number, number][] = [
  [50, 40, 4], [100, 300, 5], [40, 170, 3], [250, 48, 3], [420, 40, 4], [590, 60, 5],
  [600, 290, 4], [540, 300, 3], [300, 300, 5], [75, 240, 3], [580, 180, 4], [170, 290, 3],
];
function AreaMap() {
  const corner = (x: number, y: number, dx: number, dy: number) => `M${x} ${y}h${dx * 16}M${x} ${y}v${dy * 16}`;
  return (
    <svg className="ab-map" viewBox="20 20 600 300" aria-hidden focusable="false" data-anim>
      <g stroke="#1e1e1e">
        {[20, 140, 260, 380, 500, 620].map((x) => (
          <path key={`v${x}`} d={`M${x} 20V320`} />
        ))}
        {[20, 80, 140, 200, 260, 320].map((y) => (
          <path key={`h${y}`} d={`M20 ${y}H620`} />
        ))}
      </g>
      {FAR.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#2a2a2a" />
      ))}
      <rect x="140" y="80" width="360" height="180" fill="none" stroke="#f2f2f2" />
      <path d={[corner(140, 80, -1, -1), corner(500, 80, 1, -1), corner(140, 260, -1, 1), corner(500, 260, 1, 1)].join("")} stroke="#f2f2f2" />
      <rect x="260" y="140" width="120" height="60" fill="#0b0b0b" stroke="#f2f2f2" />
      {ORBS.map(([cx, cy, r, life, t]) => (
        <g key={`${cx}-${cy}`} className="ab-drift" style={v({ "--t": `${t}s` })}>
          <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#8a8a8a" pathLength={100} strokeDasharray={`${life} 100`} transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="#000" stroke="#f2f2f2" />
        </g>
      ))}
      <g stroke="#8a8a8a" fill="none">
        <path d="M262 128H378M262 125v6M378 125v6" />
        <path d="M392 142V198M389 142h6M389 198h6" />
      </g>
      <rect x="268" y="104" width="104" height="22" fill="#000" />
      <text x="320" y="121" textAnchor="middle">≈ 39 KM</text>
      <text x="414" y="170" textAnchor="middle" transform="rotate(-90 414 170)" dominantBaseline="middle">≈ 20 KM</text>
      <circle className="ab-halo" cx="320" cy="170" r="14" fill="none" stroke="#3dff8c" opacity=".35" />
      <circle cx="320" cy="170" r="5" fill="#3dff8c" />
      {[
        [1, 260, 200],
        [2, 140, 80],
        [3, 560, 40],
      ].map(([n, x, y]) => (
        <g key={n} className="ab-mk">
          <circle cx={x} cy={y} r="12" fill="#000" stroke="#f2f2f2" />
          <text x={x} y={y} textAnchor="middle" dominantBaseline="central">
            {n}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Fig. 5a: the classic look, drawn in CSS (sizes in cqi so it scales with the frame). */
const CLASSIC: { x: string; y: string; s: number; life: number; name: string; meta: string; sat?: boolean }[] = [
  { x: "58%", y: "46%", s: 20, life: 0.7, name: "PHOTO.JPG", meta: "12 MB · 24 MIN", sat: true },
  { x: "27%", y: "66%", s: 13, life: 0.35, name: "NOTES", meta: "8 MIN" },
  { x: "79%", y: "72%", s: 10, life: 0.9, name: "DECK.PDF", meta: "3 MB · 12 MIN" },
];
function ClassicMock() {
  return (
    <div className="ab-frame ab-cm" aria-hidden>
      <i className="ab-cm-stars" />
      <div className="ab-cm-bar">
        {/* eslint-disable-next-line @next/next/no-img-element -- an SVG lockup inside a drawing */}
        <img src="/logo.svg" alt="" width={152} height={22} />
        <span>Send</span>
      </div>
      <div className="ab-cm-ghost">
        <span>Drop</span>
        <span>Lock</span>
      </div>
      {CLASSIC.map((o) => (
        <div key={o.name} className="ab-cm-orb" style={v({ "--x": o.x, "--y": o.y, "--s": o.s })}>
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="#1f1f1f" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="48" fill="none" stroke="#e6e6e6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${(301.6 * o.life).toFixed(1)} 301.6`} transform="rotate(-90 50 50)" />
          </svg>
          <i className="ab-cm-ball" />
          {o.sat && <i className="ab-cm-sat" />}
          <span className="ab-cm-l">
            <b>{o.name}</b>
            <span>{o.meta}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Fig. 5b: the work look (dark), drawn in CSS with its real palette. */
function WorkMock() {
  return (
    <div className="ab-frame ab-wm" aria-hidden>
      <div className="ab-wm-bar">
        <span className="ab-wm-nav">
          <i />
          <b>Files</b>
          <span>Notes</span>
          <span>Tasks</span>
        </span>
        <span className="ab-wm-up">Upload</span>
      </div>
      <div className="ab-wm-cards">
        {[
          ["PDF", 0.6],
          ["JPG", 0.35],
          ["ZIP", 0.8],
        ].map(([t, f]) => (
          <div key={t} className="ab-wm-card">
            <span className="ab-wm-tile">{t}</span>
            <i className="ab-wm-sk" style={v({ "--w": "70%" })} />
            <i className="ab-wm-sk" style={v({ "--w": "45%" })} />
            <i className="ab-wm-exp" style={v({ "--f": f })} />
          </div>
        ))}
      </div>
      <div className="ab-wm-task">
        <b>Tasks</b>
        {[true, false, false].map((done, i) => (
          <span key={i} className="ab-wm-row">
            <i className={done ? "on" : undefined} />
            <i className="ab-wm-sk" style={v({ "--w": ["72%", "56%", "64%"][i] })} />
          </span>
        ))}
      </div>
      <svg className="ab-wm-wire" viewBox="0 0 100 75" preserveAspectRatio="none">
        <path d="M45 60C60 60 50 30 63 30" fill="none" stroke="#77777e" strokeWidth=".35" />
        <circle cx="45" cy="60" r=".8" fill="#8a8a91" />
        <circle cx="63" cy="30" r=".8" fill="#8a8a91" />
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------- copy */

const VS: [string, string][] = [
  ["Email it to yourself, then dig it out again.", "Drop it on one screen, tap it on the other."],
  ["Sign up, verify, pick a plan.", "Open the page. That is the whole setup."],
  ["A link that sits in a chat for years.", "Pick 5 to 30 minutes. Then it is gone."],
  ["Trust a server with what is inside.", "Locked in your browser before it leaves."],
  ["Hunt for a cable, or the right app.", "Any browser: phone, laptop, office PC."],
];

const PHASES: [string, string, string][] = [
  ["Upload", "Drop", "Drag any file or whole folder onto the page, paste it, or pick it. Name it whatever you like. It becomes an object drifting in the void."],
  ["Encrypt", "Lock", "Send it open (one tap for anyone who sees it) or with a passcode. Either way your browser cuts it into 8 MB chunks and seals each one with AES-256-GCM before a single byte leaves."],
  ["Receive", "Beam", "Open Orbi on the other device and tap the object. It streams straight from the sender's browser when it can, from the encrypted copy when it can't, and decrypts on arrival. Live stats show who is viewing and downloading."],
  ["Destroy", "Burn", "When the life the sender picked runs out (5 to 30 minutes), after the last allowed download, or the moment the sender hits destroy, it is erased for good."],
];

const LIVES = [5, 10, 15, 20, 25, 30];
const ENDS: [string, string, string][] = [
  ["E.01", "Time runs out", "The life the sender picked hits zero. Everyone sees the clock while it runs."],
  ["E.02", "The limit is reached", "Set 1, 2, 3, 5 or 10 downloads. After the last one, it burns."],
  ["E.03", "The sender destroys it", "One tap, any time. It's gone for everyone at once."],
  ["E.04", "Reports", "Three reports from different devices take it down early."],
];

const STATIONS: { g: string; n: string; t: string; fork?: boolean }[] = [
  { g: "file", n: "01 — File", t: "photo.raw · 4.2 GB" },
  { g: "split", n: "02 — Split", t: "Cut into 8 MB chunks" },
  { g: "lock", n: "03 — Lock", t: "AES-256-GCM, key made on your device" },
  { g: "beam", n: "04 — Beam", t: "Direct, or the encrypted copy", fork: true },
  { g: "land", n: "05 — Land", t: "Decrypted on theirs. Then it burns." },
];

const SPEC: [string, string][] = [
  ["Cipher", "AES-256-GCM, run in your browser with Web Crypto."],
  ["Chunks", "8 MB each. Every chunk is sealed and checked on its own, so any size streams."],
  ["Key", "With a passcode, the key is derived from it on your device (PBKDF2-SHA-256, 310,000 rounds) and never sent."],
  ["Open objects", "Encrypted too, with a public key phrase, so anyone who can see them can open them in one tap."],
  ["Route", "Straight from device to device while the sender's page is open; an encrypted stored copy otherwise. Public STUN servers help the two devices find each other; no file data passes through them."],
  ["Resume", "Files up to 20 GB. A dropped connection picks up where it stopped."],
  ["Lifetime", "5 to 30 minutes (the sender picks), or a download limit, or the destroy button. Then erased for good."],
  ["Names", "The object name, file name, size and type are visible while it floats. Keep secrets out of names."],
];

const LEGEND: [string, string][] = [
  ["Your cell", "About 39 × 20 km. Found from your shared location, roughly from your connection, or picked by you on the map. The green dot is you."],
  ["The eight around it", "Together they make your public void. A border never splits a town."],
  ["Everywhere else", "It exists, just not in your sky. Spaces work differently: everyone with the name and code sees the same room, wherever they are."],
];

const FEATURES: [string, string, string][] = [
  ["Files", "Files and whole folders, any format, up to 20 GB each. Drop, paste or pick.", "file"],
  ["Resume", "A dropped connection picks up where it stopped. Big files don't start over.", "resume"],
  ["Burn", "The sender picks 5 to 30 minutes, a download limit, or destroys it any time.", "burn"],
  ["Lock", "Open for anyone in one tap, or a passcode only the two of you know.", "lock"],
  ["Live", "See who is viewing and downloading your object as it happens, and destroy it from the same place.", "live"],
  ["Nearby", "One switch shows only what's close: things sent from your network and your area. Location is optional.", "nearby"],
  ["Spaces", "Rooms with a name, public or locked with a code. Everyone inside sees the same things, wherever they are.", "spaces"],
  ["Bubbles", "Notes that float next to the files, grouped by who sent them. Links, emails and codes become tappable.", "bubbles"],
  ["Tasks", "Numbered tasks with a route: who it's for. Wire a file to a task as you send it, and it travels with it.", "tasks"],
  ["Archive", "Drag anything aside to hide it on this device only. One tap brings it back. Nobody else's view changes.", "archive"],
  ["Styles", `${N} looks for dropped files, from brushed steel and marble to toy bricks and soap bubbles.`, "styles"],
  ["Two looks", "Classic, the orbit. Work, a calm editor. One Orbi underneath.", "looks"],
];

const NUMS: [string, string, string][] = [
  ["0", "accounts", "Nobody has ever signed up. Nobody can."],
  ["30", "minutes, max", "Then it burns. No trash bin on our side."],
  ["20", "GB per file", "Dropped Wi-Fi? It picks up where it stopped."],
  ["256", "bit keys", "AES-256-GCM, sealed in your browser."],
  ["8", "MB chunks", "Each one sealed and checked on its own."],
  ["300", "uploads per hour", "Per network. Plenty for people, too few for spam."],
  ["3", "reports", "From three different devices, and an object is gone."],
  ["1", "developer", "Name withheld. Mostly works at night."],
];

const NEVER = ["Your name", "Your email", "Your phone number", "A password (there isn't one)", "Your passcode", "What's inside a passcode-locked file", "Your IP address"];
const KEEP: [string, string][] = [
  ["The object name, file name, size and type. Visible to anyone while it floats.", "while it floats"],
  ["Encrypted bytes (Cloudflare R2), nothing readable.", "until it burns"],
  ["A one-way hash of your network, for Nearby and the upload limit. Never your IP.", "hash only"],
  ["A random device ID and a label like “Chrome · Android”, so senders see opens.", "for opens"],
  ["Anonymous usage stats: approximate location, browser, OS, device type, visit times. Never sold.", "30 days in detail"],
  ["Your exact position, only if you share it: kept as your latest location on Orbi's own internal map, never shown to other people.", "latest only"],
];

const RULES: [string, string, string][] = [
  ["R.01", "Everything burns.", "Thirty minutes at most. Sooner if the sender says so. No archive on our side."],
  ["R.02", "Locked means locked.", "With a passcode, the key is made on your device and never sent. Not even we can open it."],
  ["R.03", "Nobody signs up.", "There is nothing to sign up for. No accounts, no login, no profile."],
  ["R.04", "Sending stays free.", "Instant, encrypted, no account, no card. Paid plans, when they come, add time and team tools on top."],
  ["R.05", "Abuse burns early.", "Three reports from different devices and an object is taken down."],
];

const FILE: [string, ReactNode][] = [
  ["Subject", "The developer"],
  ["Name", <Redact key="n" w="10ch" />],
  ["Location", <Redact key="l" w="7ch" />],
  ["Company", "None"],
  ["Investors", "None"],
  ["Team", "One person"],
  ["Hours", "Mostly at night"],
  ["Motive", "For fun"],
  [
    "Contact",
    <a key="c" className="ab-file-mail" href={`mailto:${MAIL}`}>
      {MAIL}
    </a>,
  ],
];
function Redact({ w }: { w: string }) {
  return (
    <span className="ab-redact" style={v({ "--w": w })}>
      <span className="sx-sr">withheld</span>
    </span>
  );
}

const CHANNELS: [string, string, string, string][] = [
  ["C.01", "Ideas", "What should the void do next?", "Orbi: idea"],
  ["C.02", "Bugs", "What broke, on which browser and device?", "Orbi: bug report"],
  ["C.03", "Abuse", "Open the object and tap Report, or tell us what you saw.", "Orbi: abuse report"],
  ["C.04", "Kind words", "Rare, and always read.", "Orbi: kind words"],
];

/* ---------------------------------------------------------------- page */

export default function About() {
  return (
    <SiteChrome page="about">
      {/* 00 — hero */}
      <section id="void" className="sx-sec sx-sky sx-hero ab-hero sx-hero-in" data-chapter="00|Intro">
        <div className="sx-in">
          <div className="sx-meta">
            <span>(00) About</span>
            <span>Orbi Transfer</span>
            <span>
              <span>
                Made anonymously<span className="ab-dt-m">, for fun</span>
              </span>
            </span>
            <span>
              Scroll <Arrow dir="down" />
            </span>
          </div>
          <div className="sx-fit ab-h1-fit">
            <h1 className="sx-mega ab-h1">
              <span className="ln">Made by</span>
              <span className="ln">
                <span className="sx-out ab-nb">
                  nobody.
                  {/* the spec's 300 × 24 strokes, flattened to the box's real ~30:1 shape so the chalk scales evenly */}
                  <svg className="ab-under" viewBox="0 0 300 10" aria-hidden focusable="false" data-chalk>
                    <path className="c c1" pathLength={1} d="M4 6.7C60 2.5 140 1.7 210 3.75S290 7.5 296 3.3" fill="none" stroke="#f2f2f2" strokeLinecap="round" strokeLinejoin="round" />
                    <path className="c c2" pathLength={1} d="M24 8.75C90 5.4 170 5 250 6.7" fill="none" stroke="#f2f2f2" strokeLinecap="round" strokeLinejoin="round" opacity=".5" />
                  </svg>
                </span>
              </span>
            </h1>
          </div>
          <div className="sx-grid ab-hero-row">
            <div className="ab-hero-l">
              <p className="sx-lead sx-h-late">
                Orbi Transfer is instant, end-to-end encrypted sharing in your browser. No accounts, no login, no install. It was built by one anonymous developer, for fun: no company, no investors, no name on the door. Just a void that moves your files, and then forgets them.
              </p>
              <div className="ab-ctas sx-h-late">
                <HardLink href="/" className="sx-pill solid">
                  Open the void <Arrow dir="up-right" />
                </HardLink>
                <Link href="#how" className="sx-link">
                  How it works <Arrow dir="down" />
                </Link>
              </div>
            </div>
            <figure className="sx-figure ab-fig sx-h-fig">
              <Orbits />
              <figcaption className="sx-cap">Fig. 1 — Every object orbits for 5 to 30 minutes, then burns. Green: someone is taking it right now.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <Ticker items={["Made by nobody", "No login", "End-to-end encrypted", "Up to 20 GB", "Burns in 30 min", "For fun"]} />

      {/* 01 — why */}
      <section id="why" className="sx-sec ab-why" data-chapter="01|Why">
        <Ghost text="WHY?" className="ab-g-why" />
        <div className="sx-in">
          <SecHead n="01" label="Why it exists" kicker="Manifesto" total={T} />
          <div className="sx-grid">
            <h2 className="sx-h2 ab-why-h" data-reveal>
              The person next to you shouldn&apos;t need your email.
            </h2>
            <p className="sx-body ab-why-b" data-reveal>
              Emailing yourself. Hunting for a cable. Asking a stranger for their phone number to send one photo. One night that felt silly enough to fix. So it became a void instead: drop something in, it floats, someone grabs it, it burns.
            </p>
          </div>
          <div className="ab-vs">
            <div className="ab-vs-head" aria-hidden>
              <span className="sx-label">Before</span>
              <span className="sx-label">
                <OrbitMark className="ab-vs-om" />
                With Orbi
              </span>
            </div>
            <ol>
              {VS.map(([a, b], i) => (
                <li key={a} data-reveal style={v({ "--i": i })}>
                  <p className="ab-vs-a">
                    <span className="sx-label ab-vs-k">Before — </span>
                    {a}
                  </p>
                  <p className="ab-vs-b">
                    <span className="sx-sr">With Orbi: </span>
                    {b}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 02 — how it works (the classic signature piece, enlarged) */}
      <section id="how" className="sx-sec ab-how" data-chapter="02|How it works">
        <div className="sx-in">
          <SecHead n="02" label="How it works" kicker="Protocol" total={T} />
          <h2 className="sx-sr">How Orbi works</h2>
          <div className="ab-how-top sx-label">
            <span>Protocol</span>
            <span>Four phases, every time</span>
          </div>
          <div className="ab-how-hero">
            {/* eslint-disable-next-line @next/next/no-img-element -- the brand wordmark, an SVG */}
            <img className="ab-how-word" src="/brand/wordmark.svg" alt="Orbi Transfer" width={1391} height={124} />
            <div className="ab-how-count">
              <span className="sx-num" aria-hidden>
                4
              </span>
              <span className="sx-label" aria-hidden>
                Phases
              </span>
              <span className="sx-sr">Four phases.</span>
            </div>
          </div>
          <div className="ab-how-cols">
            <div>
              <h3 className="sx-label">What is it</h3>
              <p>A shared void between your devices. Open orbitransfer.com anywhere, in any browser, and whatever you launch floats there, end-to-end encrypted, until it burns.</p>
            </div>
            <div>
              <h3 className="sx-label">Works between</h3>
              <ul>
                <li>Chrome, Safari, Edge, Firefox</li>
                <li>Phone to laptop</li>
                <li>Office PC to home</li>
                <li>Any format, up to 20 GB</li>
              </ul>
            </div>
            <div>
              <h3 className="sx-label">Sends</h3>
              <ul>
                <li>Files and whole folders</li>
                <li>Notes, as bubbles</li>
                <li>Tasks, with files wired in</li>
              </ul>
            </div>
            <HardLink href="/" className="sx-link ab-how-go">
              Launch something into orbit <Arrow />
            </HardLink>
          </div>
          <p className="ab-how-sub">The four phases</p>
          <div className="sx-aw ab-phases">
            <div className="sx-aw-head" aria-hidden>
              <span>Phase</span>
              <span>Codename</span>
              <span>What happens</span>
              <span className="r">Step</span>
            </div>
            <ol>
              {PHASES.map(([phase, code, text], i) => (
                <li key={code} className="sx-aw-row" data-reveal style={v({ "--i": i })}>
                  <span className="sx-chipf ab-ph">{phase}</span>
                  <h3 className="big">{code}</h3>
                  <p>{text}</p>
                  <span className="n" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="sx-sr">Step {i + 1}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="sx-label ab-legal">Max 20 GB per file · 300 uploads per network per hour · 3 reports from different devices remove an object</p>
        </div>
      </section>

      {/* 03 — lifetime */}
      <section id="life" className="sx-sec ab-lifesec" data-chapter="03|Lifetime">
        <Ghost text="30 MIN" className="ab-g-life" />
        <div className="sx-in">
          <SecHead n="03" label="Lifetime" kicker="Burn" total={T} />
          <div className="sx-grid">
            <h2 className="sx-h2 ab-life-h" data-reveal>
              <span className="ln">Everything</span>
              <span className="ln">burns.</span>
            </h2>
            <p className="sx-body ab-big ab-life-b" data-reveal>
              Nothing in Orbi is meant to last. The sender picks a life of 5, 10, 15, 20, 25 or 30 minutes. Everyone sees the clock, and when it hits zero the object is erased: the stored copy is deleted and it leaves every screen. There is no trash bin on our side.
            </p>
          </div>

          <figure className="sx-figure ab-life">
            <div className="sx-grid ab-pickrow">
              <fieldset className="ab-pick">
                <legend className="sx-label">
                  Pick a life <span className="sx-sr">in minutes; the ruler shows when it burns</span>
                </legend>
                <div className="ab-chips">
                  {LIVES.map((n) => (
                    <span key={n} className="ab-chip">
                      <input type="radio" name="life" id={`life-${n}`} value={n} defaultChecked={n === 30} />
                      <label htmlFor={`life-${n}`} className="sx-chipf">
                        {pad(n)}
                      </label>
                    </span>
                  ))}
                </div>
              </fieldset>
              <div className="ab-read" aria-hidden>
                <span className="sx-label">Burns at</span>
                <b className="sx-num ab-out">
                  T+
                  {LIVES.map((n) => (
                    <span key={n} data-l={n}>
                      {pad(n)}
                    </span>
                  ))}
                  :00
                </b>
              </div>
            </div>
            <div className="ab-ruler" aria-hidden data-anim>
              <span className="ab-brk">
                <span className="sx-label">Sender&apos;s choice · 5 to 30 min</span>
              </span>
              <span className="ab-trk" />
              <span className="ab-rem" />
              <span className="ab-alive" />
              <span className="ab-drop">
                <i className="sx-dot" />
                <span className="sx-label">Drop + lock · T+0</span>
              </span>
              <span className="ab-burnwrap">
                <span className="ab-burn">
                  <i className="x" />
                  <span className="sx-label">Burn</span>
                </span>
              </span>
              <span className="ab-axis">
                {[0, 5, 10, 15, 20, 25, 30].map((m) => (
                  <span key={m} className="sx-label" style={v({ "--x": `${(m / 30) * 100}%` })}>
                    {m}
                    {m === 30 && <span className="ab-dt"> min</span>}
                  </span>
                ))}
              </span>
            </div>
            <figcaption className="sx-cap">Fig. 2 — Try it. The sender picks one life; the object burns when it ends.</figcaption>
          </figure>

          <div className="sx-grid ab-ends">
            {ENDS.map(([k, t, d], i) => (
              <div key={k} className="ab-end" data-reveal style={v({ "--i": i })}>
                <span className="sx-label">{k}</span>
                <h3 className="sx-chipf">{t}</h3>
                <p className="sx-small">{d}</p>
              </div>
            ))}
          </div>
          <p className="sx-label ab-first">Whichever comes first.</p>
        </div>
      </section>

      {/* 04 — security */}
      <section id="security" className="sx-sec ab-sec" data-chapter="04|Security">
        <Ghost text="AES-256" className="ab-g-aes" />
        <div className="sx-in">
          <SecHead n="04" label="The lock" kicker="Security" total={T} />
          <div className="sx-grid">
            <h2 className="sx-h2 ab-sec-h" data-reveal>
              <span className="ln">Locked here.</span>
              <span className="ln">Opened there.</span>
            </h2>
            <p className="sx-lead ab-sec-l" data-reveal>
              Encryption happens in your browser, not on a server. Your file is cut into 8 MB chunks and each one is sealed with AES-256-GCM before it leaves. The other device opens it. In between, everything is noise.
            </p>
          </div>

          <figure className="sx-figure ab-pipefig">
            <ol className="ab-pipe" aria-label="How a file travels" data-anim>
              {STATIONS.map((s, i) => (
                <li key={s.g} className={`ab-st${s.fork ? " fork" : ""}`}>
                  <span className="ab-box">
                    <Glyph name={s.g} className="ab-glyph" />
                  </span>
                  <span className="ab-st-t">
                    <b className="sx-chipf">{s.n}</b>
                    <span className="sx-small">{s.t}</span>
                    {s.fork && (
                      <span className="ab-fork-k" aria-hidden>
                        <span className="sx-label d">Direct · device to device</span>
                        <span className="sx-label s">Stored · encrypted copy</span>
                      </span>
                    )}
                  </span>
                  {i < STATIONS.length - 1 && (
                    <span className={`ab-wire${i >= 2 ? " sealed" : ""}${s.fork ? " fork" : ""}`} aria-hidden>
                      <span className="ab-ln">
                        <i />
                        <i />
                      </span>
                      {s.fork && <span className="ab-ln st" />}
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <figcaption className="sx-cap">Fig. 3 — A file&apos;s road. Filled squares: readable. Hollow: sealed.</figcaption>
          </figure>

          <div className="ab-modes">
            <div data-reveal>
              <h3 className="sx-h3">Open</h3>
              <span className="sx-label">One tap</span>
              <p className="sx-body">Anyone who can see it can open it, with nothing to type. It still travels and rests encrypted, but the key phrase is public by design, so treat it like something you&apos;d hand to the room. Previews appear for open objects only.</p>
            </div>
            <div data-reveal style={v({ "--i": 1 })}>
              <h3 className="sx-h3">Passcode</h3>
              <span className="sx-label">Only people you tell</span>
              <p className="sx-body">Only someone with the code can open it. Pass it on however you like: out loud, in a message, chalked on a board. Our server keeps a hash of a proof, never the code, and a wrong guess only costs a try.</p>
            </div>
          </div>

          <div className="ab-specwrap">
            <span className="sx-label ab-spec-t">Spec sheet</span>
            <dl className="ab-spec">
              {SPEC.map(([k, d]) => (
                <div key={k} className="sx-grid">
                  <dt className="sx-label">{k}</dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 05 — the void is local */}
      <section id="local" className="sx-sec ab-local" data-chapter="05|Local">
        <Ghost text="LOCAL" className="ab-g-local" />
        <div className="sx-in">
          <SecHead n="05" label="The void is local" kicker="Area" total={T} />
          <div className="sx-grid">
            <h2 className="sx-h2 ab-local-h" data-reveal>
              <span className="ln">The void</span>
              <span className="ln">is local.</span>
            </h2>
            <p className="sx-lead ab-local-l" data-reveal>
              The public void isn&apos;t the whole internet. Everything belongs to the rough area of whoever sent it, a cell about 39 × 20 km. You see your cell and the eight around it, so a border never splits a town. Share your location for the right cell, or Orbi uses your connection&apos;s rough guess, or you pick your area on the map.
            </p>
          </div>
          <div className="sx-grid ab-maprow">
            <figure className="sx-figure ab-mapfig">
              <AreaMap />
              <figcaption className="sx-cap">Fig. 4 — Your sky. One cell ≈ 39 × 20 km. Illustration.</figcaption>
            </figure>
            <div className="ab-legend">
              <ol>
                {LEGEND.map(([t, d], i) => (
                  <li key={t} data-reveal style={v({ "--i": i })}>
                    <span className="ab-mkr" aria-hidden>
                      {i + 1}
                    </span>
                    <h3 className="sx-chipf">{t}</h3>
                    <p className="sx-small">{d}</p>
                  </li>
                ))}
              </ol>
              <p className="sx-label ab-legend-n">Other people only ever see your cell, never your spot.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 06 — features */}
      <section id="features" className="sx-sec ab-feat" data-chapter="06|Features">
        <div className="sx-in">
          <SecHead n="06" label="Everything inside" kicker="Features" total={T} />
          <div className="sx-grid ab-top">
            <h2 className="sx-h2 ab-feat-h" data-reveal>
              <span className="ln">What&apos;s</span>
              <span className="ln">inside.</span>
            </h2>
            <p className="sx-body ab-top-b" data-reveal>
              It started as one drop zone. It grew at night into spaces, notes, tasks and a second look for work. Everything below works today, free, with no account.
            </p>
          </div>
          <div className="sx-aw ab-index">
            <div className="sx-aw-head" aria-hidden>
              <span>No.</span>
              <span>Feature</span>
              <span>What it does</span>
              <span />
            </div>
            <ol>
              {FEATURES.map(([name, text, g], i) => (
                <li key={name} className="sx-aw-row" data-reveal style={v({ "--i": i % 4 })}>
                  <span className="sx-label ab-ix-n">{pad(i + 1)}</span>
                  <h3 className="big">{name}</h3>
                  <p>{text}</p>
                  <Glyph name={g} className="ab-picto" />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 07 — two looks + styles */}
      <section id="looks" className="sx-sec ab-lookssec" data-chapter="07|Looks">
        <div className="sx-in">
          <SecHead n="07" label="Two looks" kicker="Classic / Work" total={T} />
          <h2 className="sx-h2" data-reveal>
            <span className="ln">One void.</span>
            <span className="ln">Two looks.</span>
          </h2>
          <div className="ab-looks">
            <figure className="ab-look" data-reveal>
              <div className="ab-fw">
                <ClassicMock />
                <i className="ab-crop tl" />
                <i className="ab-crop tr" />
                <i className="ab-crop bl" />
                <i className="ab-crop br" />
              </div>
              <figcaption>
                <span className="sx-label">Fig. 5a</span>
                <h3 className="sx-h3">Classic</h3>
                <span className="sx-label ab-route">/ — the original</span>
                <p className="sx-body">The orbit. Files float as planets in a starfield, each with a ring that burns down. Loud, playful, made for showing someone across the table.</p>
                <HardLink href="/" className="sx-link">
                  Open Classic <Arrow dir="up-right" />
                </HardLink>
              </figcaption>
            </figure>
            <figure className="ab-look" data-reveal style={v({ "--i": 1 })}>
              <div className="ab-fw">
                <WorkMock />
                <i className="ab-crop tl" />
                <i className="ab-crop tr" />
                <i className="ab-crop bl" />
                <i className="ab-crop br" />
              </div>
              <figcaption>
                <span className="sx-label">Fig. 5b</span>
                <h3 className="sx-h3">Work</h3>
                <span className="sx-label ab-route">/work — the calm editor</span>
                <p className="sx-body">The same void as a quiet canvas: office words, cards in a grid, wires in grey. Dark by default, light if you like. Made for a desk and a long day.</p>
                <HardLink href="/work" className="sx-link">
                  Open Work <Arrow dir="up-right" />
                </HardLink>
              </figcaption>
            </figure>
          </div>
          <p className="sx-label ab-switch">Switch any time. Both look at the same files, spaces and tasks.</p>

          <div className="sx-grid ab-styles">
            <div className="ab-styles-nw" aria-hidden>
              <span className="sx-num ab-styles-n">{N}</span>
            </div>
            <div className="ab-styles-t" data-reveal>
              <h3 className="sx-h3">
                Styles<span className="sx-sr">: {N} styles</span>
              </h3>
              <p className="sx-body">How dropped files look on your screen, from brushed steel and marble to pixel, vinyl and toy bricks. Pick one from Style in the classic look; Work keeps one quiet style.</p>
            </div>
            <div className="ab-wall">
              {SKIN_GROUPS.map((g) => {
                const list = SKINS.filter((s) => s.group === g);
                return (
                  <div key={g} className="ab-wall-row">
                    <span className="sx-label">
                      {g} · {list.length}
                    </span>
                    <ul>
                      {list.map((s) => (
                        <li key={s.id} className={s.id === DEFAULT_SKIN ? "on" : undefined}>
                          {s.name}
                          {s.id === DEFAULT_SKIN && <span className="sx-label">default</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 08 — numbers */}
      <section id="numbers" className="sx-sec ab-numsec" data-chapter="08|Numbers">
        <div className="sx-in">
          <SecHead n="08" label="Odd facts" kicker="Numbers" total={T} />
          <div className="sx-grid ab-top">
            <h2 className="sx-h2 ab-num-h" data-reveal>
              <span className="ln">By the</span>
              <span className="ln">numbers.</span>
            </h2>
            <p className="sx-small ab-top-b" data-reveal>
              No numbers about users or traffic here. Just the ones that decide how Orbi behaves.
            </p>
          </div>
          <div className="ab-nums">
            {NUMS.map(([n, unit, line], i) => (
              <article key={unit} data-reveal style={v({ "--i": i % 4 })}>
                <b className="sx-num">{n}</b>
                <span className="sx-label ab-unit">{unit}</span>
                <p className="sx-small">{line}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 09 — the ledger */}
      <section id="privacy" className="sx-sec ab-ledger" data-chapter="09|Privacy">
        <div className="sx-in">
          <SecHead n="09" label="The ledger" kicker="Privacy" total={T} />
          <h2 className="sx-h2" data-reveal>
            <span className="ln">What we</span>
            <span className="ln">don&apos;t know.</span>
          </h2>
          <div className="sx-grid ab-ledger-cols">
            <div className="ab-led-l">
              <h3 className="sx-h3">Never</h3>
              <span className="sx-label ab-led-k">Things we don&apos;t know about you</span>
              <ul className="ab-never" data-grow>
                {NEVER.map((t, i) => (
                  <li key={t} style={v({ "--i": i })}>
                    <span className="s">{t}</span>
                    <span className="sx-sr"> (not known)</span>
                  </li>
                ))}
              </ul>
              <p className="sx-label ab-like">and we like it that way</p>
            </div>
            <div className="ab-led-r">
              <h3 className="sx-h3">Briefly</h3>
              <span className="sx-label ab-led-k">What we keep, and for how long</span>
              <ul className="ab-keep">
                {KEEP.map(([t, tag]) => (
                  <li key={tag}>
                    <span>{t}</span>
                    <span className="sx-label ab-tag">{tag}</span>
                  </li>
                ))}
              </ul>
              <div className="ab-led-foot">
                <p className="sx-small">No ads. No third-party trackers. Hosting by Vercel, Supabase and Cloudflare.</p>
                <Link href="/privacy" className="sx-link">
                  Read the full privacy note <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10 — rules */}
      <section id="rules" className="sx-sec ab-rulesec" data-chapter="10|Rules">
        <Ghost text="BURN." className="ab-g-burn" />
        <div className="sx-in">
          <SecHead n="10" label="Rules of the void" kicker="Rules" total={T} />
          <h2 className="sx-h2" data-reveal>
            <span className="ln">Rules of</span>
            <span className="ln">the void.</span>
          </h2>
          <ol className="ab-rules">
            {RULES.map(([n, s, d], i) => (
              <li key={n} data-reveal style={v({ "--i": i })}>
                <span className="sx-label ab-rule-n">{n}</span>
                <h3 className="ab-rule-s">{s}</h3>
                <p className="sx-body">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 11 — the maker */}
      <section id="maker" className="sx-sec ab-maker" data-chapter="11|Maker">
        <div className="sx-in">
          <SecHead n="11" label="The maker" kicker="Who" total={T} />
          <div className="sx-grid">
            <div className="ab-maker-t">
              <h2 className="sx-h2" data-reveal>
                <span className="ln">Nobody</span>
                <span className="ln">you know.</span>
              </h2>
              <p className="sx-body ab-big ab-maker-p1" data-reveal>
                One developer, name withheld, mostly working at night. Orbi Transfer started as a fix for one silly problem and kept growing: spaces, notes, tasks, {N} styles, a second look for work. There is no company behind it, no investors and nobody to pitch to.
              </p>
              <p className="sx-body ab-maker-p2" data-reveal>
                Sending stays free. Pro and Business are planned so that the storage and time they use pay for themselves, never by selling what you send. Until then, it runs on curiosity.
              </p>
              <Link href="/upgrade" className="sx-link ab-maker-go">
                See the plans <Arrow />
              </Link>
            </div>
            <div className="ab-file" data-reveal>
              <div className="ab-file-h sx-label">
                <span>File no. 0001</span>
                <span>Status: anonymous</span>
              </div>
              <dl>
                {FILE.map(([k, d]) => (
                  <div key={k}>
                    <dt className="sx-label">{k}</dt>
                    <dd>{d}</dd>
                  </div>
                ))}
              </dl>
              <span className="ab-stamp" aria-hidden>
                Made by nobody
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 12 — contact */}
      <section id="contact" className="sx-sec sx-sky ab-contact" data-chapter="12|Contact">
        <Ghost text="SIGNAL" outline className="ab-g-signal" />
        <div className="sx-in ab-contact-in">
          <SecHead n="12" label="Open a channel" kicker="Contact" total={T} />
          <div className="ab-ct">
            <div className="sx-fit ab-ct-fit">
              <h2 className="sx-mega ab-ct-h" data-reveal>
                <span className="ln">
                  Send a <span className="brk">signal</span>
                </span>
                <span className="ln">
                  <span className="sx-out">
                    into the <span className="brk">void.</span>
                  </span>
                </span>
              </h2>
            </div>
            <a className="ab-mail" href={`mailto:${MAIL}?subject=Hello%20from%20the%20void`}>
              {MAIL}
            </a>
            <div className="ab-ct-btns">
              <a className="sx-pill solid" href={`mailto:${MAIL}?subject=Hello%20from%20the%20void`}>
                Write an email <Arrow dir="up-right" />
              </a>
              <CopyMail mail={MAIL} className="sx-pill" />
            </div>
          </div>
          <div className="sx-grid ab-chan">
            {CHANNELS.map(([k, t, d, subj], i) => (
              <a key={k} className="ab-ch" href={`mailto:${MAIL}?subject=${encodeURIComponent(subj)}`} data-reveal style={v({ "--i": i })}>
                <span className="sx-label">{k}</span>
                <span className="sx-chipf ab-ch-t">{t}</span>
                <span className="sx-small">{d}</span>
                <span className="sx-label ab-ch-w">
                  Write <Arrow />
                </span>
              </a>
            ))}
          </div>
          <p className="sx-label ab-print">Someone reads every one. Anonymously, of course.</p>
        </div>
      </section>
    </SiteChrome>
  );
}
