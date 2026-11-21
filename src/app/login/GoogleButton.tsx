"use client";
// Google sign-in on orbitransfer.com itself (Google Identity Services): Google's window says "to continue to
// orbitransfer.com" instead of the Supabase address, at no cost. Google hands back an ID token, which Supabase checks
// (signInWithIdToken, with a nonce so it can't be replayed). If Google's script can't load, the old redirect stays.
import { useEffect, useRef, useState } from "react";
import { LuArrowRight } from "react-icons/lu";
import { auth } from "@/lib/auth";

// public by design (it is in every Google sign-in page); the secret stays in Supabase
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "262088274486-lpue2b88trgiitc8qgvac9fp174kdq22.apps.googleusercontent.com";

type Gis = {
  accounts: {
    id: {
      initialize: (o: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};
declare global {
  interface Window { google?: Gis }
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");

export default function GoogleButton({ onError, fallback, disabled }: { onError: (m: string) => void; fallback: () => void; disabled?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let on = true;
    const give = setTimeout(() => on && setState((s) => (s === "loading" ? "fallback" : s)), 6000);
    (async () => {
      const raw = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
      const hashed = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)));
      await new Promise<void>((res, rej) => {
        if (window.google?.accounts?.id) return res();
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.onload = () => res();
        s.onerror = () => rej(new Error("gis"));
        document.head.appendChild(s);
      });
      if (!on || !box.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: hashed,
        ux_mode: "popup",
        callback: async (r: { credential?: string }) => {
          if (!r.credential) return onError("Google sign-in was cancelled");
          const { error } = await auth.signInWithIdToken({ provider: "google", token: r.credential, nonce: raw });
          if (error) onError(error.message);
        },
      });
      // Google's own button (its iframe is what signs in) lies invisible over Orbit's styled one, stretched to cover it
      const w = box.current.clientWidth || 320, h = box.current.clientHeight || 52;
      const gw = Math.max(200, Math.min(400, w));
      window.google.accounts.id.renderButton(box.current, { type: "standard", theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: gw, logo_alignment: "center" });
      box.current.style.setProperty("--gx", String(w / gw));
      box.current.style.setProperty("--gy", String(h / 40));
      setState("ready");
    })().catch(() => on && setState("fallback"));
    return () => {
      on = false;
      clearTimeout(give);
    };
  }, [onError]);

  // (owner 2026-11-21: in the site's own look, with Google's full-colour G). Google's iframe takes the click wherever it
  // lies over the pill; anywhere it doesn't (or before / without it), the pill itself signs in by Google's redirect
  const ready = state === "ready";
  return (
    <div className={`ac-google${ready ? " live" : ""}${disabled ? " off" : ""}`}>
      <button type="button" className="ac-google-btn" onClick={fallback} disabled={disabled || state === "loading"} tabIndex={ready ? -1 : 0} aria-hidden={ready || undefined}>
        <span className="g-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/google.png" alt="" width={20} height={20} draggable={false} />
        </span>
        <span className="g-txt">Continue with Google</span>
        <LuArrowRight className="g-go" aria-hidden />
      </button>
      <div ref={box} className="ac-gis" hidden={state === "fallback"} />
    </div>
  );
}
