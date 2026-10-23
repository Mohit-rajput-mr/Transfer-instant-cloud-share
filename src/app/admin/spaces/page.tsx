import type { Metadata } from "next";
import AdminSpaces from "@/components/admin/AdminSpaces";

export const metadata: Metadata = { title: "Spaces · Mission HQ", robots: { index: false, follow: false } };

export default function AdminSpacesPage() {
  return <AdminSpaces />;
}
