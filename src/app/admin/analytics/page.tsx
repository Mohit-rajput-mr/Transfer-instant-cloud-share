import type { Metadata } from "next";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

export const metadata: Metadata = { title: "Analytics · Mission HQ", robots: { index: false, follow: false } };

export default function AdminAnalyticsPage() {
  return <AdminAnalytics />;
}
