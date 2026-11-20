import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminShell from "@/components/admin/AdminShell";
import AdminUsers from "@/components/admin/AdminUsers";
import { adminIn } from "@/lib/admin-page";

export const metadata: Metadata = { title: "Users · Mission HQ", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// checked on the server: without an HQ session only the sign-in is sent
export default async function AdminUsersPage() {
  if (!(await adminIn())) return <AdminLogin />;
  return (
    <AdminShell>
      <AdminUsers />
    </AdminShell>
  );
}
