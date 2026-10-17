import type { Metadata } from "next";
import Starfield from "@/components/Starfield";
import LiquidGlass from "@/components/LiquidGlass";
import Plans from "./Plans";
import "./upgrade.css";

export const metadata: Metadata = {
  title: "Upgrade",
  description: "Orbi plans: Free instant encrypted sharing, Pro for longer-lasting files and receipts, Business for team workspaces, admin and SSO.",
  alternates: { canonical: "/upgrade" },
};

// the classic look: the same sky and liquid glass as the void
export default function UpgradePage() {
  return (
    <>
      <Starfield />
      <LiquidGlass />
      <Plans />
    </>
  );
}
