import type { Metadata } from "next";
import "../site.css";
import "./upgrade.css";
import SiteChrome from "@/components/SiteChrome";
import Plans from "./Plans";
import { FAQ } from "./faq";

export const metadata: Metadata = {
  title: "Upgrade",
  description:
    "Orbi Transfer plans. Sending stays free: instant, end-to-end encrypted, no account. Pro and Business, coming soon, add time, receipts and team workspaces.",
  alternates: { canonical: "/upgrade" },
};

// the nine questions as a FAQPage, plain text (the list itself is rendered by Plans)
const LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
}).replace(/</g, "\\u003c");

// the blackboard: the shared chrome (starfield, two-row header, menu, footer) around the plans
export default function UpgradePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LD }} />
      <SiteChrome page="upgrade">
        <Plans />
      </SiteChrome>
    </>
  );
}
