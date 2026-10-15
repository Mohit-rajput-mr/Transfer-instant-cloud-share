import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";

export const metadata: Metadata = { title: "Mission HQ", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <>
      {/* open the map connection while the page boots, so the globe's first tiles arrive sooner */}
      <link rel="preconnect" href="https://tiles.openfreemap.org" crossOrigin="anonymous" />
      <link rel="preload" href="https://tiles.openfreemap.org/styles/dark" as="fetch" crossOrigin="anonymous" />
      <AdminApp />
    </>
  );
}
