import { LuArrowLeft } from "react-icons/lu";
import type { Metadata } from "next";
import Link from "next/link";
import { AnonFacts, AnonStillList } from "@/components/AnonCard";

export const metadata: Metadata = { title: "Privacy", description: "How Orbi Transfer keeps your files private: encrypted in the browser, deleted after 5–30 minutes, no accounts." };

export default function Privacy() {
  return (
    <main className="doc">
      <Link href="/" className="doc-logo" aria-label="Orbi Transfer home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/lockup.svg" alt="Orbi Transfer" width={220} height={32} />
      </Link>
      <Link className="back glyph" href="/"><LuArrowLeft aria-hidden />Back to the void</Link>
      <h1 className="wide" style={{ marginTop: 24 }}>Privacy</h1>
      <p>Orbi Transfer is built to know as little as possible about you.</p>
      <h2>Files</h2>
      <ul>
        <li>Files are encrypted in your browser (AES-256-GCM) before upload. With a passcode, the key comes from it and never leaves your device.</li>
        <li><b>Open objects</b> (sent without a passcode) are still encrypted in transit and at rest, but anyone who can see them can open them. Only send something open if you are happy for anyone to take it.</li>
        <li>We store only the encrypted bytes (with Cloudflare R2), and remove them when the lifetime the sender picked runs out (5 to 30 minutes; inside a named space, when the space closes, 8 hours at most), after the download limit, or when the sender destroys them.</li>
        <li>While the sender&apos;s page is open, receivers may also get the encrypted bytes straight from the sender&apos;s device (peer to peer, WebRTC). Public STUN servers (Google, Cloudflare) help the two devices find each other; no file data passes through them.</li>
      </ul>
      <h2>What we keep, briefly</h2>
      <ul>
        <li>The name you give an object, its file name, size and type. These are visible to anyone on the site while it floats.</li>
        <li>A one-way hash of your network address, used for the Wi-Fi filter and upload limits. Your IP address itself is not stored, except in anonymous mode (below).</li>
        <li>A random device ID and a browser/OS label (e.g. &quot;Chrome · Android&quot;) in your browser, so senders can see opens and downloads.</li>
        <li>Object data is deleted together with the object.</li>
        <li><b>Spaces</b>: a space&apos;s name, whether it is private, a keyed hash of its passcode, the names members chose and a keyed hash of each member&apos;s device ID, kept encrypted until the space is removed. Your saved spaces live in your own browser (IndexedDB).</li>
      </ul>
      <h2>Usage statistics</h2>
      <p>To keep the service running we keep anonymous usage stats: your approximate location (country, city, coordinates rounded to about 1 km, derived by our host from your connection; if you share your location in the browser, your exact position instead, kept as your most recent location and shown only on Orbi&apos;s own internal live map, never to other people), browser, OS, device type, and when you visit, upload or download. Detailed events are kept for 30 days; daily totals per country, city, device type and route (city to city) are kept longer. This is never linked to your name, never sold and never shared.</p>
      <h2>Anonymous mode</h2>
      <p>Turn on <b>Stay anonymous</b> (the mask at the top) to become a ghost: no location and no identity shown to other users. Sending never needs an account, a name, a phone or an email. While anonymous, Orbi keeps your IP address and its rough area (city), for abuse and legal requests; other users never see it. Anonymous sends go into an anonymous space: a private space with a random title, shared with one link. Its code and its key ride after the # in that link, which browsers never send to a server.</p>
      <AnonFacts />
      <p><b>What still happens</b></p>
      <AnonStillList />
      <h2>Accounts (Pro and Business only)</h2>
      <p>Sending needs no account. If you buy Pro or Business you create one, with your email and a password, an email link, or Google sign-in (Google then shares your name, email and picture with us). We keep your email, your plan and its billing status, and, for your send history, the names, sizes and download counts of what you sent while logged in (30 days on Pro, 1 year on Business; Business team owners see their members&apos; history). Logged in, what your browser keeps for itself (the keys to manage what you sent, your notes, tasks, spaces, trash and name; never anonymous spaces) is also kept with your account, sealed by our server before it is stored, so your other devices can show and manage the same things. Delete your account any time by emailing <a href="mailto:transferorbi@gmail.com">transferorbi@gmail.com</a>.</p>
      <h2>Payments</h2>
      <p>Payments are processed by Paddle.com, our reseller and merchant of record. Your card or PayPal details go to Paddle, never to us. Paddle tells us the plan, the amount, the country and the status of each payment. See Paddle&apos;s privacy policy at paddle.com/legal/privacy.</p>
      <h2>No ads</h2>
      <p>There are no ads and no third-party trackers. Hosting is provided by Vercel, Supabase and Cloudflare.</p>
      <h2>Tip</h2>
      <p>Don&apos;t put sensitive information in the object name. Only the contents are encrypted.</p>
    </main>
  );
}
