import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";

export const metadata: Metadata = { title: "Mission HQ · ORBITRANSFER", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminApp />;
}
