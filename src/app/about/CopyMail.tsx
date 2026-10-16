"use client";
import { useState } from "react";
import { LuCheck, LuCopy } from "react-icons/lu";

export default function CopyMail({ mail }: { mail: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="ab-copy mono"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(mail);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {}
      }}
    >
      {done ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />} {done ? "Copied" : "Copy address"}
    </button>
  );
}
