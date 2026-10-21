import type { Metadata, Viewport } from "next";
import { Archivo, Chakra_Petch, Geist, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { OTHER_LANGS, SEO, SITE } from "@/lib/seo";
import { languageAlternates } from "@/lib/seo-meta";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// the squared, spaced type voice of the classic look (header, cards, body text)
const chip = Chakra_Petch({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-chip", display: "swap" });
// the work look's type (app/(void)/work/work.css): declared on every page so the in-place switch to /work has it, but
// not preloaded, so the classic look never downloads it (VoidShell warms it when the browser is idle)
const workSans = Geist({ subsets: ["latin"], variable: "--font-work", display: "swap", preload: false });
const workMono = Geist_Mono({ subsets: ["latin"], variable: "--font-work-mono", display: "swap", preload: false });

// a language page (/fr): html[lang] before the first paint (VoidShell keeps it after). A direct load of /work: the work look and the theme this browser picked (dark unless it chose light) before the
// first paint. After that VoidShell owns html[data-ui] / [data-theme] and the theme-color (the switch never reloads).
const boot = `(function(){var L=${JSON.stringify(OTHER_LANGS)},l=location.pathname.split("/")[1];if(L.indexOf(l)>=0)document.documentElement.lang=l;if(!/^\\/work(\\/|$)/.test(location.pathname))return;var d=document.documentElement;d.dataset.ui="work";var t="dark";try{if(localStorage.getItem("orbit:work-theme")==="light")t="light"}catch(e){}d.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#f7f7f6":"#1b1b1c")})()`;

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
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable} ${chip.variable} ${workSans.variable} ${workMono.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        {children}
      </body>
    </html>
  );
}
