import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import WorkLook from "@/components/WorkLook";
import Plans from "./Plans";
import "../work/work.css";
import "./upgrade.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-work", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-work-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Upgrade",
  description: "Orbi plans: Free instant encrypted sharing, Pro for longer-lasting files and receipts, Business for team workspaces, admin and SSO.",
  alternates: { canonical: "/upgrade" },
};

// a direct load: the work look and theme before the first paint (WorkLook covers arriving from inside the app)
const boot = `(function(){var d=document.documentElement;d.dataset.ui="work";d.classList.add(${JSON.stringify(sans.variable)},${JSON.stringify(mono.variable)});var t="dark";try{if(localStorage.getItem("orbit:work-theme")==="light")t="light"}catch(e){}d.dataset.theme=t})()`;

export default function UpgradePage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <WorkLook fonts={`${sans.variable} ${mono.variable}`} />
      <Plans />
    </>
  );
}
