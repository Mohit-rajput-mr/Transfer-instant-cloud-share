import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import "../account.css";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in", description: "Log in or sign up to Orbi Transfer for Pro and Business.", robots: { index: false, follow: true } };

export default function Login() {
  return (
    <main className="doc">
      <Link href="/" className="doc-logo" aria-label="Orbi Transfer home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lockup.svg" alt="Orbi Transfer" width={220} height={32} />
      </Link>
      <Link className="back glyph" href="/"><LuArrowLeft aria-hidden />Back to the void</Link>
      <h1 className="wide" style={{ marginTop: 24 }}>Account</h1>
      <p>Sending stays free and needs no account. An account is only for Pro and Business: your plan follows you to every device.</p>
      <LoginForm />
    </main>
  );
}
