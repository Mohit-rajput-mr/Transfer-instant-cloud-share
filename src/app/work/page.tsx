import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Void from "@/components/Void";
import WorkLook from "@/components/WorkLook";
import "./work.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-work", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-work-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Work",
  description: "Orbi Transfer for work: the same instant, encrypted transfers, notes and tasks on a calm canvas made for teams.",
  alternates: { canonical: "/work" },
};

// before the first paint: the work look, its fonts and the theme this browser picked (dark unless it chose light)
const boot = `(function(){var d=document.documentElement;d.dataset.ui="work";d.classList.add(${JSON.stringify(sans.variable)},${JSON.stringify(mono.variable)});var t="dark";try{if(localStorage.getItem("orbit:work-theme")==="light")t="light"}catch(e){}d.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#f7f7f6":"#1b1b1c")})()`;

export default function WorkPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <WorkLook fonts={`${sans.variable} ${mono.variable}`} />
      <Void ui="work" />
    </>
  );
}
