import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";
import { adminIn } from "@/lib/admin-page";
import AdminApp from "@/components/admin/AdminApp";

export const metadata: Metadata = { title: "Mission HQ", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

// checked on the server: without an HQ session only the sign-in is sent
export default async function AdminPage() {
  if (!(await adminIn())) return <AdminLogin />;
  return (
    <>
      {/* open the map connection while the page boots, so the globe's first tiles arrive sooner */}
      <link rel="preconnect" href="https://tiles.openfreemap.org" crossOrigin="anonymous" />
      <link rel="preload" href="https://tiles.openfreemap.org/styles/dark" as="fetch" crossOrigin="anonymous" />
      <AdminApp />
    </>
  );
}
