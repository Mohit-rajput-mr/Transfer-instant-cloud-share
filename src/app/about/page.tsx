import type { Metadata } from "next";
import Link from "next/link";
import { SKINS } from "@/lib/skin-list";
import CopyMail from "./CopyMail";
import "./about.css";

export const metadata: Metadata = {
  title: "About",
  description: "Orbi Transfer was made anonymously, for fun. No company, no accounts, no names. Just a void that moves your files.",
};

const MAIL = "transferorbi@gmail.com";

const FACTS: [string, string, string][] = [
  ["0", "accounts", "Nobody has ever signed up. Nobody can."],
  ["30", "minutes, max", "Then everything burns. No archive, no trash bin."],
  ["20", "GB per file", "Dropped Wi-Fi? It picks up where it stopped."],
  [String(SKINS.length), "styles", "From brushed steel to Minecraft blocks."],
  ["1", "developer", "Name withheld. Mostly works at night."],
  ["0", "bytes we can read", "Files are locked on your device before they leave it."],
];
const UNKNOWN = ["your name", "your email", "your phone number", "what's in your files", "who you are"];

/** The portal: a black sphere with a gold rim, a slow triangle, and files in orbit. Pure SVG + CSS. */
function Portal({ big = false }: { big?: boolean }) {
  return (
    <div className={`ab-portal${big ? " big" : ""}`} aria-hidden>
      <svg viewBox="0 0 600 600">
        <defs>
          <radialGradient id="abRim" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.78" stopColor="#000" stopOpacity="0" />
            <stop offset="0.93" stopColor="#c9a45c" stopOpacity="0.55" />
            <stop offset="1" stopColor="#c9a45c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="abCore" cx="0.38" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#2a2a2c" />
            <stop offset="0.45" stopColor="#0d0d0e" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <linearGradient id="abGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3d99a" />
            <stop offset="0.5" stopColor="#c9a45c" />
            <stop offset="1" stopColor="#7d5d24" />
          </linearGradient>
        </defs>
        <g className="ab-rings">
          {[290, 250, 214].map((r, i) => (
            <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="url(#abGold)" strokeOpacity={0.14 + i * 0.08} strokeWidth={i === 2 ? 1.6 : 1} strokeDasharray={i === 1 ? "2 10" : undefined} />
          ))}
        </g>
        <polygon className="ab-tri" points="300,40 545,470 55,470" fill="none" stroke="url(#abGold)" strokeWidth="3" />
        <circle cx="300" cy="300" r="190" fill="url(#abRim)" />
        <circle cx="300" cy="300" r="170" fill="url(#abCore)" />
        <ellipse cx="248" cy="232" rx="58" ry="30" fill="#fff" opacity="0.05" transform="rotate(-30 248 232)" />
        <g className="ab-orbit">
          <circle cx="300" cy="62" r="7" fill="#c9a45c" />
          <circle cx="510" cy="380" r="4.5" fill="#f3d99a" />
          <circle cx="110" cy="420" r="5.5" fill="#3dff8c" />
        </g>
      </svg>
    </div>
  );
}

export default function About() {
  return (
    <main className="ab">
      <div className="ab-grid" aria-hidden><i /><i /><i /><i /></div>

      <header className="ab-top">
        <Link href="/" aria-label="Orbi Transfer home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/lockup.svg" alt="Orbi Transfer" width={190} height={28} />
        </Link>
        <nav>
          <Link href="/">Void</Link>
          <a className="on" href="#top">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="ab-hero" id="top">
        <div className="ab-hero-text">
          <span className="ab-idx"><b>01</b><i /><span>02</span><span>03</span></span>
          <h1>Made by<br /><em>nobody.</em></h1>
          <p>Orbi Transfer was built by one anonymous developer, for fun. No company, no investors, no name on the door. Just a void that moves your files, and then forgets them.</p>
          <a className="ab-cta" href="#contact">Send a signal <span aria-hidden>→</span></a>
        </div>
        <Portal />
      </section>

      <section className="ab-why">
        <span className="ab-num mono">01 · why</span>
        <h2>Because the person next to you shouldn&apos;t need your <em>email</em>.</h2>
        <p>Emailing yourself. Hunting for a cable. Asking a stranger for their phone number to send one photo. One night that felt silly enough to fix, so it became a void instead: drop something in, it floats, someone grabs it, it burns.</p>
      </section>

      <section className="ab-facts">
        <span className="ab-num mono">02 · odd facts</span>
        <div className="ab-cards">
          {FACTS.map(([n, unit, line]) => (
            <article key={unit}>
              <b>{n}</b>
              <span className="mono">{unit}</span>
              <p>{line}</p>
            </article>
          ))}
        </div>
        <div className="ab-unknown">
          <h3>Things we don&apos;t know about you</h3>
          <ul>{UNKNOWN.map((u) => <li key={u}>{u}</li>)}</ul>
          <p className="mono">and we like it that way</p>
        </div>
      </section>

      <section className="ab-rules">
        <span className="ab-num mono">03 · rules of the void</span>
        <ol>
          <li><b>Everything burns.</b> Thirty minutes, at most.</li>
          <li><b>Nothing is read.</b> Locked on your device, opened on theirs.</li>
          <li><b>Nobody signs up.</b> There is nothing to sign up for.</li>
          <li><b>It stays free.</b> It was made for fun. It still is.</li>
        </ol>
      </section>

      <section className="ab-contact" id="contact">
        <div className="ab-ghost" aria-hidden>CONTACT</div>
        <Portal big />
        <div className="ab-contact-in">
          <span className="mono">Open a channel</span>
          <h2>Send a signal<br />into the <em>void.</em></h2>
          <a className="ab-mail" href={`mailto:${MAIL}?subject=Hello%20from%20the%20void`}>{MAIL}</a>
          <CopyMail mail={MAIL} />
          <p className="mono">Ideas · bugs · abuse reports · kind words. Someone reads every one, anonymously.</p>
        </div>
      </section>

      <footer className="ab-foot">
        <span className="mono">Orbi Transfer · made anonymously, for fun</span>
        <span className="mono"><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/">Back to the void</Link></span>
      </footer>
    </main>
  );
}
