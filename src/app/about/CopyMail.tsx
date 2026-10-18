"use client";
import { useState } from "react";
import { LuCheck, LuCopy } from "react-icons/lu";

/** Copies the address; the label flips to "Copied" for 1.6 s and a polite live region says so. */
export default function CopyMail({ mail, className = "sx-pill sm" }: { mail: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(mail);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {}
      }}
    >
      {done ? <LuCheck aria-hidden size={14} /> : <LuCopy aria-hidden size={14} />}
      {done ? "Copied" : "Copy address"}
      <span className="sx-sr" aria-live="polite">
        {done ? "Address copied" : ""}
      </span>
    </button>
  );
}
