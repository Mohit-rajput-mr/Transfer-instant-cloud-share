"use client";

// The "blackboard" chrome shared by /about and /upgrade: starfield, chalk grain, the two-row sokolovski header,
// the phone menu, the footer with the wordmark spotlight, and the small shared parts (section head, ghost word,
// ticker, arrow, orbit mark, check). Styles live in src/app/site.css (imported by each page, not here); every
// class is scoped to .sx / sx-* so nothing reaches the void (/) or /work.

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Starfield from "@/components/Starfield";
import { perf } from "@/lib/perf";

export type SitePage = "about" | "upgrade";
export type ArrowDir = "right" | "up-right" | "down" | "up";

const MAIL = "transferorbi@gmail.com";
const HOME = "/"; // the logo: back into the void

type NavItem = { label: string; href: string; page?: SitePage; up?: boolean };
const NAV: NavItem[] = [
  { label: "Void", href: "/" },
  { label: "How it works", href: "/about#how" },
  { label: "About", href: "/about", page: "about" },
  { label: "Work", href: "/work" },
  { label: "Upgrade", href: "/upgrade", page: "upgrade", up: true },
];
const BIG: (NavItem & { n: string })[] = [
  { n: "01", label: "Void", href: "/" },
  { n: "02", label: "Work", href: "/work" },
  { n: "03", label: "About", href: "/about", page: "about" },
  { n: "04", label: "Upgrade", href: "/upgrade", page: "upgrade" },
];
const SMALL = [
  { label: "How it works", href: "/about#how" },
  { label: "Contact", href: "/about#contact" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];
// what the chapter indicator shows before the observer has run (the DOM count replaces the total)
const FIRST: Record<SitePage, { label: string; total: string }> = {
  about: { label: "Intro", total: "12" },
  upgrade: { label: "Upgrade", total: "09" },
};

const vars = (v: Record<string, string | number>) => v as CSSProperties;
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

const isVoid = (href: string) => href === "/" || href === "/work";

/** A nav target: next/link everywhere (/ and /work through VoidLink). */
function Go({ item, className, current, onClick, children }: { item: NavItem; className?: string; current?: boolean; onClick?: () => void; children: ReactNode }) {
  const props = { className, onClick, "aria-current": current ? ("page" as const) : undefined };
  return isVoid(item.href) ? (
    <VoidLink href={item.href as "/" | "/work"} {...props}>
      {children}
    </VoidLink>
  ) : (
    <Link href={item.href} {...props}>
      {children}
    </Link>
  );
}

/** A link back into the void ("/" or "/work"): next/link, no full load. VoidShell (app/(void)/layout.tsx) sets the
 *  look itself, so the work look no longer needs a clean boot, and uploads still running in this tab carry on.
 *  Not prefetched: the void is a big page to fetch in the background just because a link is on screen.
 *  Use it in page files too instead of a literal <a href="/">. */
export function VoidLink({ href, className, children, onClick, "aria-label": label, "aria-current": current }: { href: "/" | "/work"; className?: string; children: ReactNode; onClick?: () => void; "aria-label"?: string; "aria-current"?: "page" }) {
  return (
    <Link href={href} prefetch={false} className={className} onClick={onClick} aria-label={label} aria-current={current}>
      {children}
    </Link>
  );
}

const ARROWS: Record<ArrowDir, string> = {
  right: "M2 8h12M9 3l5 5-5 5",
  "up-right": "M4 12L12 4M5 4h7v7",
  down: "M8 2v12M3 9l5 5 5-5",
  up: "M8 14V2M3 7l5-5 5 5",
};

/** 12px line arrow. Inside a link or button it nudges 3px its own way on hover. Size it with className. */
export function Arrow({ dir = "right", className }: { dir?: ArrowDir; className?: string }) {
  return (
    <svg className={cx("sx-arr", className)} data-dir={dir} viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d={ARROWS[dir]} />
    </svg>
  );
}

/** The 6b27f1a header mark: a planet in a tilted ring. Always filled in ink, even inside outline (.sx-out) text. */
export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg className={cx("sx-om", className)} viewBox="0 0 64 64" aria-hidden focusable="false">
      <circle cx="32" cy="32" r="10" fill="currentColor" />
      <ellipse cx="32" cy="32" rx="27" ry="9" fill="none" stroke="currentColor" strokeWidth="3" transform="rotate(-24 32 32)" />
    </svg>
  );
}

/** Chalk check (16px) with a screen-reader word. */
export function Check({ label = "Included" }: { label?: string }) {
  return (
    <>
      <svg className="sx-check" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden focusable="false">
        <path d="M2.5 8.5L6.5 12L13.5 3.5" stroke="#f2f2f2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sx-sr">{label}</span>
    </>
  );
}

/** `(03)  Lifetime  Burn  03 — 12` over a 1px rule. Put it first inside each .sx-sec. */
export function SecHead({ n, label, kicker, total }: { n: string; label: string; kicker?: string; total: string }) {
  return (
    <div className="sx-sh" data-reveal>
      <span className="sx-label" aria-hidden>
        ({n})
      </span>
      <span className="sx-label l">{label}</span>
      <span className="sx-label k" aria-hidden>
        {kicker}
      </span>
      <span className="sx-label c" aria-hidden>
        {n} — {total}
      </span>
    </div>
  );
}

/** A half-erased chalk word behind a section. Must be a DIRECT child of .sx-sec; size and place it with
 *  className or style (font-size, left/right/top/bottom). "\n" in text starts a new line. */
export function Ghost({ text, outline, className, style }: { text: string; outline?: boolean; className?: string; style?: CSSProperties }) {
  const lines = text.split("\n");
  return (
    <span className={cx("sx-ghost", outline && "o", className)} style={style} aria-hidden>
      {lines.length > 1 ? lines.map((l, i) => <span key={i} className="ln">{l}</span>) : text}
    </span>
  );
}

/** The marquee under each hero. Every second item is chalk-outlined. Decorative (aria-hidden). */
export function Ticker({ items }: { items: string[] }) {
  const set = (k: string) =>
    items.map((t, i) => (
      <span key={`${k}${i}`} className={cx("sx-tick-item", i % 2 === 1 && "sx-out")}>
        {t}
        <OrbitMark />
      </span>
    ));
  return (
    <div className="sx-tick" aria-hidden data-anim>
      <div className="sx-tick-track">
        {set("a")}
        {set("b")}
      </div>
    </div>
  );
}

/** `03 / 12 — Lifetime` on the right of header row 2, driven by [data-chapter="NN|Label"] sections. */
function Where({ page }: { page: SitePage }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [st, setSt] = useState({ n: "00", label: FIRST[page].label, total: FIRST[page].total });

  useEffect(() => {
    const root = ref.current?.closest(".sx");
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-chapter]")];
    if (!els.length) return;
    const read = (el: Element) => {
      const [n = "", label = ""] = ((el as HTMLElement).dataset.chapter ?? "").split("|");
      return { n, label };
    };
    const total = String(Math.max(...els.map((el) => parseInt(read(el).n, 10) || 0))).padStart(2, "0");
    setSt({ ...read(els[0]), total });
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).pop();
        if (hit) setSt({ ...read(hit.target), total });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className="sx-where sx-label" aria-hidden>
      <span key={st.n + st.label} className="sx-where-in">
        {st.n}
        <span className="tt"> / {st.total}</span> — <b>{st.label}</b>
      </span>
    </span>
  );
}

const stillNow = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || perf() === "low";

export default function SiteChrome({ page, children }: { page: SitePage; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLAnchorElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // reveal, chalk / bar triggers, off-screen pause, SMIL, wordmark spotlight
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const still = stillNow();
    const off: (() => void)[] = [];

    // 2. reveal: attributes, never classes, so React never wipes them
    const triggers = root.querySelectorAll<HTMLElement>("[data-reveal], [data-chalk], [data-grow]");
    if (still) {
      triggers.forEach((el) => el.setAttribute("data-in", ""));
    } else {
      root.setAttribute("data-io", "");
      const vh = window.innerHeight;
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (el.getBoundingClientRect().top > vh) el.setAttribute("data-pre", "");
      });
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target as HTMLElement;
            if (el.hasAttribute("data-pre")) {
              el.removeAttribute("data-pre");
              el.setAttribute("data-rise", "");
            }
            el.setAttribute("data-in", "");
            io.unobserve(el);
          }
        },
        { rootMargin: "0px 0px -10% 0px" },
      );
      triggers.forEach((el) => io.observe(el));
      off.push(() => io.disconnect());
    }

    // 4. loops pause off-screen; SMIL figures pause with them (and stay paused when motion is off)
    const smil = (el: Element): SVGSVGElement[] => [
      ...(el.matches("svg[data-smil]") ? [el as SVGSVGElement] : []),
      ...el.querySelectorAll<SVGSVGElement>("svg[data-smil]"),
    ];
    if (still) root.querySelectorAll<SVGSVGElement>("svg[data-smil]").forEach((s) => s.pauseAnimations?.());
    const anims = root.querySelectorAll<HTMLElement>("[data-anim]");
    if (anims.length) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.removeAttribute("data-off");
              if (!still) smil(e.target).forEach((s) => s.unpauseAnimations?.());
            } else {
              e.target.setAttribute("data-off", "");
              smil(e.target).forEach((s) => s.pauseAnimations?.());
            }
          }
        },
        { rootMargin: "120px 0px" },
      );
      anims.forEach((el) => io.observe(el));
      off.push(() => io.disconnect());
    }

    // 5. the wordmark spotlight follows a mouse across the footer
    const foot = footRef.current;
    const word = wordRef.current;
    if (foot && word && !still && window.matchMedia("(hover: hover)").matches) {
      let raf = 0, x = 0, y = 0;
      const paint = () => {
        raf = 0;
        const r = word.getBoundingClientRect();
        word.style.setProperty("--mx", `${Math.round(x - r.left)}px`);
        word.style.setProperty("--my", `${Math.round(y - r.top)}px`);
      };
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        x = e.clientX;
        y = e.clientY;
        if (!raf) raf = requestAnimationFrame(paint);
      };
      const leave = () => {
        cancelAnimationFrame(raf);
        raf = 0;
        word.style.removeProperty("--mx");
        word.style.removeProperty("--my");
      };
      foot.addEventListener("pointermove", move, { passive: true });
      foot.addEventListener("pointerleave", leave);
      off.push(() => {
        cancelAnimationFrame(raf);
        foot.removeEventListener("pointermove", move);
        foot.removeEventListener("pointerleave", leave);
      });
    }

    return () => off.forEach((f) => f());
  }, []);

  // the phone menu: focus in, Tab trapped, Esc closes, page scroll locked, force-closed at ≥960, focus back out
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        btnRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    wasOpen.current = true;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !menuRef.current) return;
      const f = [...menuRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")].filter((el) => el.getClientRects().length > 0);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || !menuRef.current.contains(at))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (at === last || !menuRef.current.contains(at))) {
        e.preventDefault();
        first.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 960px)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      html.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: stillNow() ? "instant" : "smooth" });
    homeRef.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={rootRef} className="sx" data-page={page}>
      <a className="sx-skip" href="#main">
        Skip to content
      </a>
      <Starfield />
      <div className="sx-grain" aria-hidden />

      <header className="sx-top" inert={open || undefined}>
        <div className="sx-r1">
          <div className="sx-r1-l">
            <Link ref={homeRef} href={HOME} prefetch={false} className="sx-home" aria-label="Orbi Transfer, home">
              {/* eslint-disable-next-line @next/next/no-img-element -- an SVG lockup, nothing to optimise */}
              <img className="sx-logo" src="/logo.svg" alt="" width={152} height={22} draggable={false} />
            </Link>
            <span className="sx-chipf sx-by">Instant transfer</span>
          </div>
          <nav className="sx-nav sx-chipf" aria-label="Site">
            {NAV.map((it) => (
              <Go key={it.label} item={it} className={cx(it.up && "up")} current={it.page === page}>
                {it.label}
              </Go>
            ))}
          </nav>
          <div className="sx-r1-r">
            <span className="sx-live">
              <i className="sx-dot" aria-hidden />
              <span className="sx-chipf">Live · free to send</span>
            </span>
            <VoidLink href="/" className="sx-pill sm solid">
              Send
            </VoidLink>
            <button ref={btnRef} type="button" className="sx-pill sm sx-mbtn" aria-expanded={open} aria-controls="sx-menu" onClick={() => setOpen(true)}>
              <i className="sx-bars" aria-hidden />
              Menu
            </button>
          </div>
        </div>
        <div className="sx-r2">
          <ul className="sx-facts sx-chipf">
            <li className="d">No login</li>
            <li className="d">End-to-end encrypted</li>
            <li className="d">Up to 20 GB</li>
            <li className="d">Burns in 30 min</li>
            <li className="m">No login · Encrypted</li>
          </ul>
          <Where page={page} />
          <i className="sx-progress" aria-hidden />
        </div>
      </header>

      <div id="sx-menu" ref={menuRef} className={cx("sx-menu", open && "open")} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open} inert={!open || undefined}>
        <div className="sx-menu-bar">
          <Link href={HOME} prefetch={false} className="sx-home" aria-label="Orbi Transfer, home" onClick={close}>
            {/* eslint-disable-next-line @next/next/no-img-element -- an SVG lockup, nothing to optimise */}
            <img className="sx-logo" src="/logo.svg" alt="" width={124} height={18} draggable={false} />
          </Link>
          <button ref={closeRef} type="button" className="sx-pill sm" onClick={close}>
            Close
          </button>
        </div>
        <ol className="sx-menu-big">
          {BIG.map((it, i) => (
            <li key={it.n} className="sx-mi" style={vars({ "--i": i })}>
              <span className="sx-label" aria-hidden>
                {it.n}
              </span>
              <Go item={it} className={cx("sx-mega", it.page === page && "sx-out")} current={it.page === page} onClick={close}>
                {it.label}
              </Go>
            </li>
          ))}
        </ol>
        <ul className="sx-menu-sm">
          {SMALL.map((it, i) => (
            <li key={it.label} className="sx-mi" style={vars({ "--i": BIG.length + i })}>
              <Link href={it.href} onClick={close}>
                {it.label}
                <Arrow dir="right" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="sx-menu-foot sx-mi" style={vars({ "--i": BIG.length + SMALL.length })}>
          <span className="sx-chipf">No login · End-to-end encrypted · Up to 20 GB · Burns in 30 min</span>
          <span className="sx-label">Made anonymously, for fun.</span>
        </div>
      </div>

      <main id="main" className="sx-main" tabIndex={-1} inert={open || undefined}>
        {children}
      </main>

      <footer ref={footRef} className="sx-foot" inert={open || undefined}>
        <div className="sx-foot-in">
          <div className="sx-foot-cols">
            <div>
              <h2 className="sx-label sx-foot-h">Orbi</h2>
              <ul>
                <li><VoidLink href="/">Void</VoidLink></li>
                <li><VoidLink href="/work">Work</VoidLink></li>
                <li><Link href="/about#how">How it works</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="sx-label sx-foot-h">Read</h2>
              <ul>
                <li><Link href="/about">About</Link></li>
                <li><Link href="/upgrade">Upgrade</Link></li>
                <li><Link href="/terms">Terms</Link></li>
                <li><Link href="/privacy">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="sx-label sx-foot-h">Contact</h2>
              <a className="sx-foot-mail" href={`mailto:${MAIL}`}>
                {MAIL}
              </a>
              <p className="sx-small sx-foot-note">Abuse? Open the object and tap Report.</p>
            </div>
            <div>
              <h2 className="sx-label sx-foot-h">Status</h2>
              <ul className="sx-foot-st sx-chipf" data-anim>{/* the live dot pauses off-screen */}
                <li><i className="sx-dot" aria-hidden />Free — live today</li>
                <li><i className="sx-ring" aria-hidden />Pro — coming soon</li>
                <li><i className="sx-ring" aria-hidden />Business — coming soon</li>
              </ul>
            </div>
          </div>
          <div ref={wordRef} className="sx-word" role="img" aria-label="Orbi Transfer" />
          <div className="sx-foot-bar">
            <span className="sx-label" suppressHydrationWarning>
              © {new Date().getFullYear()} Orbi Transfer
            </span>
            <span className="sx-label">Made anonymously, for fun. Sending stays free.</span>
            <button type="button" className="sx-link" onClick={toTop}>
              Back to top <Arrow dir="up" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
