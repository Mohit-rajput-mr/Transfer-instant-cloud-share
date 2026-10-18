// The /upgrade questions, shared by the page (FAQPage JSON-LD, plain text) and Plans.tsx (the list).
// Plain module, not "use client", so the server page can read the data itself.

export type Faq = { q: string; a: string; link?: { text: string; href: string } };

export const FAQ: Faq[] = [
  {
    q: "Will sending stay free?",
    a: "Yes. Instant, end-to-end encrypted sharing with no account is the free tier, and it stays. Paid plans add time, storage and team tools on top.",
  },
  {
    q: "When can I pay?",
    a: "Not yet. Paid plans aren't open and there is no card form anywhere on Orbi. Ask for early access and we'll email you when your plan is ready, with an early-access price.",
  },
  {
    q: "Are these prices final?",
    a: "They are the planned prices: Pro at $8 a month, or $6 a month billed yearly ($72 a year); Business at $16 per user a month, or $12 billed yearly ($144 a year). They may change before launch.",
  },
  {
    q: "What does “coming soon” cover?",
    a: "Everything listed under Pro and Business is planned, not live. Free is everything that works today.",
  },
  {
    q: "Can Orbi read my files on a paid plan?",
    a: "No. On every plan, files are encrypted in your browser before they leave it, and a passcode never reaches us. Objects sent open, without a passcode, are still encrypted, but anyone who can see them can open them. That's what open means.",
  },
  {
    q: "Will I need an account?",
    a: "Not for Free, ever. Paid plans will need some way to recognise you, most likely an email address; Business adds Google and Microsoft sign-in.",
  },
  {
    q: "What happens to my files if I stay on Free?",
    a: "Nothing changes. They live for the time you picked, 5 to 30 minutes, and then they burn, as they always have.",
  },
  {
    q: "Do Classic and Work share a plan?",
    a: "Yes. They're two looks of the same Orbi; one plan covers both.",
  },
  {
    q: "Who is behind Orbi?",
    a: "One anonymous developer, building it for fun. No company, no investors. The whole story is on the About page.",
    link: { text: "About page", href: "/about" },
  },
];
