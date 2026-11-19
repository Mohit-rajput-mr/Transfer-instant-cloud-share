import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminShell from "@/components/admin/AdminShell";
import AdminPayments from "@/components/admin/AdminPayments";
import { adminIn } from "@/lib/admin-page";

export const metadata: Metadata = { title: "Payments · Mission HQ", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// checked on the server: without an HQ session only the sign-in is sent
export default async function AdminPaymentsPage() {
  if (!(await adminIn())) return <AdminLogin />;
  return (
    <AdminShell>
      <AdminPayments />
    </AdminShell>
  );
}
