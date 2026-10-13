import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Orbitron, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

// boxy, squared-off type to match the ORBITRANSFER wordmark
const display = Orbitron({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Chakra_Petch({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const mono = Share_Tech_Mono({ subsets: ["latin"], weight: "400", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "ORBITRANSFER — drop. lock. beam. burn.",
  description: "Instant, end-to-end encrypted file transfer between any two browsers. No login. Objects float for 30 minutes, then burn up.",
  appleWebApp: { capable: true, title: "ORBITRANSFER", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
};

// viewport-fit=cover: the page reaches under the notch / home indicator and every floating control
// pads itself with env(safe-area-inset-*). resizes-content: Android's keyboard shrinks the layout
// instead of covering the bottom sheet. No maximum-scale: pinch-zoom stays available; iOS input
// zoom is prevented by 16px fields instead.
export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
