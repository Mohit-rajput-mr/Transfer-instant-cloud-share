"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import AdminPages from "./Pages";

/** the top bar every single-purpose /admin page shares (logo, page switcher, log out) */
export default function AdminShell({ children }: { children: ReactNode }) {
  const out = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    location.reload();
  };
  return (
    <div className="hq hqs">
      <header className="hq-top">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.svg" alt="Orbi Transfer" width={194} height={28} />
          <span className="brand-by">Mission HQ</span>
        </Link>
        <AdminPages />
        <button className="pill" onClick={out} style={{ marginLeft: "auto" }}>Lock</button>
      </header>
      {children}
    </div>
  );
}
