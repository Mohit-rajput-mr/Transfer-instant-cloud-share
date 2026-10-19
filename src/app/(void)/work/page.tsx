import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work",
  description: "Orbi Transfer for work: the same instant, encrypted transfers, notes and tasks on a calm canvas made for teams.",
  alternates: { canonical: "/work" },
};

// the void (ui "work"), its look, fonts and pre-paint boot live in (void)/layout.tsx, components/VoidShell.tsx and
// the root layout: switching / ↔ /work only flips the look, nothing remounts or reloads
export default function WorkPage() {
  return null;
}
