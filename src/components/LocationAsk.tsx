"use client";
import { useState } from "react";
import { LuMapPin } from "react-icons/lu";
import { Pop } from "./Spaces";

/** First visit on a device: why Orbi asks for the location (the Nearby filter), before the browser does. */
export default function LocationAsk(props: { onAllow: () => Promise<void>; onLater: () => void; /** "Stay anonymous" instead (lib/anon.ts) */ onAnon?: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Pop label="Location" onClose={props.onLater} className="geo-pop" small>
      <div className="geo-ask">
        <i className="geo-ring" aria-hidden><LuMapPin /></i>
        <h3 className="wide">Turn on Nearby</h3>
        <p>The Open void is worldwide. Share your location and Nearby shows only the files, notes and tasks sent from your own area (about 20 to 40 km).</p>
        <p className="mono dim">Other people only ever see your rough area. Your exact spot is shared with Orbi, kept as your most recent location and shown on Orbi&apos;s own live map.</p>
        <button
          className="cta lg-press"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await props.onAllow().catch(() => {});
            setBusy(false);
          }}
        >
          <LuMapPin aria-hidden /> {busy ? "Waiting for your browser…" : "Share location"}
        </button>
        <button className="geo-later mono" onClick={props.onLater}>Not now</button>
        {props.onAnon && <button className="geo-later mono" onClick={props.onAnon}>Stay anonymous instead</button>}
      </div>
    </Pop>
  );
}

/** which steps unblock location on this device (a browser can't ask again once it was refused) */
function steps(): string[] {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|GSA\/|; wv\)/.test(ua);
  if (inApp) return ["This app's built-in browser can't share your location.", "Open orbitransfer.com in Safari or Chrome, then tap Share location."];
  if (ios)
    return [
      "Settings → Privacy & Security → Location Services: On.",
      /CriOS/.test(ua) ? "In that list: Chrome → While Using the App." : "In that list: Safari Websites → While Using the App.",
      /CriOS/.test(ua) ? "Back here, reload and tap Share location." : "Back here: tap aA in the address bar → Website Settings → Location → Allow, then reload.",
    ];
  if (/Android/.test(ua)) return ["Tap the icon left of the address → Permissions → Location → Allow.", "Phone settings: Location must be On.", "Reload and tap Share location."];
  return ["Click the icon left of the address → Location → Allow.", "Reload and tap Share location."];
}

/** Location was refused: how to turn it back on. */
export function LocationBlocked(props: { reason: "denied" | "failed"; onRetry: () => void; onClose: () => void }) {
  return (
    <Pop label="Location" onClose={props.onClose} className="geo-pop" small>
      <div className="geo-ask">
        <i className="geo-ring off" aria-hidden><LuMapPin /></i>
        <h3 className="wide">{props.reason === "denied" ? "Location is blocked" : "Couldn't get your location"}</h3>
        <p>Without it Nearby can&apos;t tell where you are: an internet connection&apos;s guess can be a city away. The Open void still shows everything, worldwide.</p>
        <ol className="geo-steps">{steps().map((s) => <li key={s}>{s}</li>)}</ol>
        <button className="cta lg-press" onClick={props.onRetry}><LuMapPin aria-hidden /> Try again</button>
      </div>
    </Pop>
  );
}
