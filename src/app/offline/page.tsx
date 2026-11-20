import type { Metadata } from "next";
import OfflineView from "./OfflineView";
import "./offline.css";

export const metadata: Metadata = {
  title: "Offline send",
  description: "Send files between two phones or laptops on the same Wi-Fi or hotspot with no internet: scan two QR codes and the files go straight across.",
  alternates: { canonical: "/offline" },
};

export default function OfflinePage() {
  return <OfflineView />;
}
