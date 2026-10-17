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
        <p className="mono dim">Other people only ever see your rough area (about 20 to 40 km). Your exact spot is shared with Orbit while the site is open, for Orbit&apos;s own live map.</p>
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
