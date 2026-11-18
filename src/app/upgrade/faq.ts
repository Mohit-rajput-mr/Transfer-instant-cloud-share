// The /upgrade questions, shared by the page (FAQPage JSON-LD, plain text) and Plans.tsx (the list).
// Plain module, not "use client", so the server page can read the data itself.

export type Faq = { q: string; a: string; link?: { text: string; href: string } };

export const FAQ: Faq[] = [
  {
    q: "Will sending stay free?",
    a: "Yes. Instant, end-to-end encrypted sharing with no account is the free tier, and it stays. Paid plans add time, storage and team tools on top.",
  },
  {
    q: "How do I pay?",
    a: "Pick a plan and log in (email or Google). Checkout opens on this page, run by Paddle, our reseller and merchant of record: card, PayPal, Apple Pay or Google Pay. Your plan switches on within a minute, on every device you log in on.",
  },
  {
    q: "What do the plans cost?",
    a: "Pro is $8 a month, or $6 a month billed yearly ($72 a year). Business is $16 per user a month, or $12 per user billed yearly ($144 a year). Local taxes are added at checkout where they apply.",
  },
  {
    q: "Can I cancel or get a refund?",
    a: "Cancel any time from your account or the link in your receipt; the plan runs to the end of the period you paid for. Changed your mind? Ask within 14 days for a full refund. Details are in the refund policy.",
    link: { text: "refund policy", href: "/refunds" },
  },
  {
    q: "Can Orbi read my files on a paid plan?",
    a: "No. On every plan, files are encrypted in your browser before they leave it, and a passcode never reaches us. Objects sent open, without a passcode, are still encrypted, but anyone who can see them can open them. That's what open means.",
  },
  {
    q: "Will I need an account?",
    a: "Not for Free, ever. Pro and Business need one, so your plan follows you: sign up with your email or with Google.",
  },
  {
    q: "What happens to my files if I stay on Free?",
    a: "Nothing changes. They live for the time you picked, 5 to 30 minutes, and then they burn, as they always have. If a paid plan ends, files you already sent keep the life they were given; new ones go back to 30 minutes.",
  },
  {
    q: "Do Classic and Work share a plan?",
    a: "Yes. They're two looks of the same Orbi; one plan covers both.",
  },
  {
    q: "Who is behind Orbi?",
    a: "One independent developer. No company, no investors. The whole story is on the About page.",
    link: { text: "About page", href: "/about" },
  },
];
