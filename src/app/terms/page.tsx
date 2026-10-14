import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms", description: "Terms of use for Orbi Transfer, the free no-login file transfer." };

export default function Terms() {
  return (
    <main className="doc">
      <Link href="/" className="doc-logo" aria-label="Orbi Transfer home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lockup.svg" alt="Orbi Transfer" width={220} height={32} />
      </Link>
      <Link className="back" href="/">← Back to the void</Link>
      <h1 className="wide" style={{ marginTop: 24 }}>Terms</h1>
      <p>Orbi Transfer is a free, no-account tool for moving files between devices. By using it you agree to these terms.</p>
      <h2>Fair use</h2>
      <ul>
        <li>Only upload files you have the right to share.</li>
        <li>No malware, illegal content, harassment, or material that infringes anyone&apos;s rights.</li>
        <li>Limits: 2 GB per file, 30 uploads per network per hour. Every object burns after the lifetime its sender picked, 30 minutes at most.</li>
        <li>Objects sent without a passcode are open: anyone who can see them can download them.</li>
        <li>Space creators can remove anyone from their space. Do not use spaces to harass or exclude people unlawfully.</li>
      </ul>
      <h2>Your responsibility</h2>
      <p>Files are encrypted on your device before upload, so Orbi Transfer cannot see or check their contents. You are fully responsible for what you upload, whether you send it open or with a passcode, and who you share the passcode with.</p>
      <h2>Reports and removal</h2>
      <p>Anyone can flag an object with the ⚑ Report button. Objects reported by several devices are removed immediately. We may remove any object or block abusive traffic at any time.</p>
      <h2>No warranty</h2>
      <p>Orbi Transfer is provided as-is, for free, with no guarantee of availability or delivery. Keep your own copies of anything important. We are not liable for lost, delayed or intercepted files.</p>
      <h2>Changes</h2>
      <p>These terms may change as the service evolves. Continued use means you accept the current version.</p>
    </main>
  );
}
