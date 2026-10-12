import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms · ORBIT" };

export default function Terms() {
  return (
    <main className="doc">
      <Link className="back" href="/">← Back to the void</Link>
      <h1 className="wide" style={{ marginTop: 24 }}>Terms</h1>
      <p>ORBIT is a free, no-account tool for moving files between devices. By using it you agree to these terms.</p>
      <h2>Fair use</h2>
      <ul>
        <li>Only upload files you have the right to share.</li>
        <li>No malware, illegal content, harassment, or material that infringes anyone&apos;s rights.</li>
        <li>Limits: 2 GB per file, 30 uploads per network per hour. Every object is deleted after 30 minutes.</li>
      </ul>
      <h2>Your responsibility</h2>
      <p>Files are encrypted on your device with your passcode, so ORBIT cannot see or check their contents. You are fully responsible for what you upload and who you share the passcode with.</p>
      <h2>Reports and removal</h2>
      <p>Anyone can flag an object with the ⚑ Report button. Objects reported by several devices are removed immediately. We may remove any object or block abusive traffic at any time.</p>
      <h2>No warranty</h2>
      <p>ORBIT is provided as-is, for free, with no guarantee of availability or delivery. Keep your own copies of anything important. We are not liable for lost, delayed or intercepted files.</p>
      <h2>Changes</h2>
      <p>These terms may change as the service evolves. Continued use means you accept the current version.</p>
    </main>
  );
}
