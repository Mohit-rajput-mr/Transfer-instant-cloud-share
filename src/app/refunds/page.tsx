import { LuArrowLeft } from "react-icons/lu";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Refunds", description: "Refund policy for Orbi Transfer paid plans: 14-day money-back on Pro and Business." };

const MAIL = "transferorbi@gmail.com";

export default function Refunds() {
  return (
    <main className="doc">
      <Link href="/" className="doc-logo" aria-label="Orbi Transfer home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lockup.svg" alt="Orbi Transfer" width={220} height={32} />
      </Link>
      <Link className="back glyph" href="/"><LuArrowLeft aria-hidden />Back to the void</Link>
      <h1 className="wide" style={{ marginTop: 24 }}>Refunds</h1>
      <p>Sending files on Orbi Transfer is free. This policy covers the paid plans (Pro and Business), monthly or yearly.</p>
      <h2>14-day refund</h2>
      <ul>
        <li>Not happy? Ask within 14 days of your first payment and you get a full refund. No questions asked.</li>
        <li>The same applies within 14 days of a yearly renewal.</li>
        <li>Monthly renewals after the first month are not refunded, but you can cancel at any time.</li>
      </ul>
      <h2>Cancelling</h2>
      <p>Cancel any time from the link in your receipt email. Your plan stays active until the end of the period you paid for, and you are not charged again.</p>
      <h2>How to ask for a refund</h2>
      <p>Email <a href={`mailto:${MAIL}`}>{MAIL}</a> with the email address you paid with (or your receipt number). We reply within 2 working days. The money goes back to the card or account you paid with, usually within 5–10 days depending on your bank.</p>
      <h2>Who processes payments</h2>
      <p>Our order process is handled by our online reseller Paddle.com, which is the merchant of record for all orders. Paddle provides all customer service inquiries and handles returns. You can also ask Paddle for a refund directly at <a href="https://paddle.net" rel="noopener noreferrer" target="_blank">paddle.net</a>.</p>
      <p>See also our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy</Link>.</p>
    </main>
  );
}
