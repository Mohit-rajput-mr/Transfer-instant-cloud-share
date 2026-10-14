import type { Metadata, Viewport } from "next";
import { Archivo, Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SEO, SITE } from "@/lib/seo";
import { languageAlternates } from "@/lib/seo-meta";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// only for the small header chips (No login · End-to-end encrypted · All / Nearby)
const chip = Chakra_Petch({ subsets: ["latin"], weight: "500", variable: "--font-chip", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: SEO.en.title, template: "%s · Orbi Transfer" },
  description: SEO.en.description,
  applicationName: "Orbi Transfer",
  keywords: SEO.en.keywords,
  category: "utilities",
  alternates: { canonical: SITE, languages: languageAlternates() },
  openGraph: { type: "website", siteName: "Orbi Transfer", url: SITE, title: SEO.en.title, description: SEO.en.description, locale: "en" },
  twitter: { card: "summary_large_image", title: SEO.en.title, description: SEO.en.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  appleWebApp: { capable: true, title: "Orbi", statusBarStyle: "black-translucent" },
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} ${chip.variable}`}>
      <body>{children}</body>
    </html>
  );
}
