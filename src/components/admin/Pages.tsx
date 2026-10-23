"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The admin's pages: one switcher in every page's top bar.
const PAGES = [
  { href: "/admin", label: "HQ" },
  { href: "/admin/spaces", label: "Spaces" },
] as const;

export default function AdminPages() {
  const path = usePathname();
  return (
    <nav className="hq-pages" aria-label="Admin pages">
      {PAGES.map((p) => (
        <Link key={p.href} href={p.href} className={path === p.href ? "on" : ""} aria-current={path === p.href ? "page" : undefined}>{p.label}</Link>
      ))}
    </nav>
  );
}
