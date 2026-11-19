import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";
import { adminIn } from "@/lib/admin-page";
import AdminSpaces from "@/components/admin/AdminSpaces";

export const metadata: Metadata = { title: "Spaces · Mission HQ", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

// checked on the server: without an HQ session only the sign-in is sent
export default async function AdminSpacesPage() {
  if (!(await adminIn())) return <AdminLogin />;
  return <AdminSpaces />;
}
