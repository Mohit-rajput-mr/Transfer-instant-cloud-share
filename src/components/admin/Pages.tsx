"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The admin's pages: one switcher in every page's top bar. Each is its own route, loading only its own data, and each
// is gated on the server (lib/admin-page.ts).
const PAGES = [
  { href: "/admin", label: "HQ" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/void", label: "Void" },
  { href: "/admin/analytics", label: "Analytics" },
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
