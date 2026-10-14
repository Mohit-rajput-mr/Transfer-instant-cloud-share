import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Void from "@/components/Void";
import SeoContent from "@/components/SeoContent";
import { OTHER_LANGS, SEO, SITE, pathFor } from "@/lib/seo";
import { languageAlternates } from "@/lib/seo-meta";

export const dynamicParams = false;
export const generateStaticParams = () => OTHER_LANGS.map((lang) => ({ lang }));

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const c = SEO[lang];
  if (!c) return {};
  return {
    title: { absolute: c.title },
    description: c.description,
    keywords: c.keywords,
    alternates: { canonical: `${SITE}${pathFor(lang)}`, languages: languageAlternates() },
    openGraph: { title: c.title, description: c.description, url: `${SITE}${pathFor(lang)}`, locale: lang, siteName: "Orbi Transfer", type: "website" },
    twitter: { card: "summary_large_image", title: c.title, description: c.description },
  };
}

export default async function LangPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const c = SEO[lang];
  if (!c) notFound();
  return (
    <>
      <Void />
      <SeoContent c={c} />
    </>
  );
}
