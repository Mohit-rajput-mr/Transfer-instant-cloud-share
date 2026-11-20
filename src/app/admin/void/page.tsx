import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminShell from "@/components/admin/AdminShell";
import AdminVoid from "@/components/admin/AdminVoid";
import { adminIn } from "@/lib/admin-page";

export const metadata: Metadata = { title: "Void · Mission HQ", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// checked on the server: without an HQ session only the sign-in is sent
export default async function AdminVoidPage() {
  if (!(await adminIn())) return <AdminLogin />;
  return (
    <AdminShell>
      <AdminVoid />
    </AdminShell>
  );
}
