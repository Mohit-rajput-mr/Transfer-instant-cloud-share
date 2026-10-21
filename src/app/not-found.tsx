import { LuArrowLeft } from "react-icons/lu";
import type { Metadata } from "next";
import Link from "next/link";

// Any unknown address: the site's own black chalk page (Next's default 404 was a white card in another type).
export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <main className="doc nf">
      <Link href="/" className="doc-logo" aria-label="Orbi Transfer home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lockup.svg" alt="Orbi Transfer" width={220} height={32} />
      </Link>
      <p className="nf-code wide" aria-hidden>404</p>
      <h1 className="wide">Burnt up.</h1>
      <p>Nothing orbits at this address. It burnt up, or it never existed.</p>
      <Link className="cta nf-home lg-press" href="/"><LuArrowLeft aria-hidden />Back to the void</Link>
    </main>
  );
}
