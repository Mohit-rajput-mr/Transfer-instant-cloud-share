"use client";
import { useState } from "react";
import { LuMapPin } from "react-icons/lu";
import { Pop } from "./Spaces";

/** First visit on a device: why Orbit asks for the location, before the browser does. */
export default function LocationAsk(props: { onAllow: () => Promise<void>; onLater: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Pop label="Location" onClose={props.onLater} className="geo-pop" small>
      <div className="geo-ask">
        <i className="geo-ring" aria-hidden><LuMapPin /></i>
        <h3 className="wide">See what&apos;s around you</h3>
        <p>Orbit shows the bubbles, tasks and files of people near you. Share your location so everyone in the same place sees each other.</p>
        <p className="mono dim">Other people only ever see your rough area (about 20 to 40 km). Your exact spot is shared with Orbit, kept as your most recent location and shown on Orbit&apos;s own live map.</p>
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

/** Location was refused: how to turn it back on, or pick the area by hand so you still land next to the people around you. */
export function LocationBlocked(props: { reason: "denied" | "failed"; onPick: () => void; onRetry: () => void; onClose: () => void }) {
  return (
    <Pop label="Location" onClose={props.onClose} className="geo-pop" small>
      <div className="geo-ask">
        <i className="geo-ring off" aria-hidden><LuMapPin /></i>
        <h3 className="wide">{props.reason === "denied" ? "Location is blocked" : "Couldn't get your location"}</h3>
        <p>Without it this device is placed by its internet connection, which on mobile data can be a city away from where you are, so people next to you don&apos;t see what you send.</p>
        <ol className="geo-steps">{steps().map((s) => <li key={s}>{s}</li>)}</ol>
        <button className="cta lg-press" onClick={props.onPick}><LuMapPin aria-hidden /> Pick my area on the map</button>
        <button className="geo-later mono" onClick={props.onRetry}>Try again</button>
      </div>
    </Pop>
  );
}
