import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import "../account.css";
import AccountView from "./AccountView";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <main className="doc">
      <Link href="/" className="doc-logo" aria-label="Orbi Transfer home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lockup.svg" alt="Orbi Transfer" width={220} height={32} />
      </Link>
      <Link className="back glyph" href="/"><LuArrowLeft aria-hidden />Back to the void</Link>
      <h1 className="wide" style={{ marginTop: 24 }}>Account</h1>
      <AccountView />
    </main>
  );
}
