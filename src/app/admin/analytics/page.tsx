import type { Metadata } from "next";
import AdminLogin from "@/components/admin/AdminLogin";
import { adminIn } from "@/lib/admin-page";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

export const metadata: Metadata = { title: "Analytics · Mission HQ", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

// checked on the server: without an HQ session only the sign-in is sent
export default async function AdminAnalyticsPage() {
  if (!(await adminIn())) return <AdminLogin />;
  return <AdminAnalytics />;
}
