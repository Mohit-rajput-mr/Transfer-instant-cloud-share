import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy · ORBIT" };

export default function Privacy() {
  return (
    <main className="doc">
      <Link className="back" href="/">← Back to the void</Link>
      <h1 className="wide" style={{ marginTop: 24 }}>Privacy</h1>
      <p>ORBIT is built to know as little as possible about you.</p>
      <h2>Files</h2>
      <ul>
        <li>Files are encrypted in your browser (AES-256-GCM) before upload. The key comes from your passcode and never leaves your device.</li>
        <li>We store only the encrypted bytes, and delete them after 30 minutes, after the download limit, or when the sender destroys them.</li>
      </ul>
      <h2>What we keep, briefly</h2>
      <ul>
        <li>The name you give an object, its file name, size and type. These are visible to anyone on the site while it floats.</li>
        <li>A one-way hash of your network address, used for the Nearby tag and upload limits. Your IP address itself is not stored.</li>
        <li>A random device ID and a browser/OS label (e.g. &quot;Chrome · Android&quot;) in your browser, so senders can see opens and downloads.</li>
        <li>All of this is deleted together with the object.</li>
      </ul>
      <h2>No accounts, no tracking</h2>
      <p>There are no accounts, no ads and no third-party analytics. Hosting is provided by Vercel and Supabase.</p>
      <h2>Tip</h2>
      <p>Don&apos;t put sensitive information in the object name. Only the contents are encrypted.</p>
    </main>
  );
}
