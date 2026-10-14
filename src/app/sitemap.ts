import type { MetadataRoute } from "next";
import { LANGS, SITE, pathFor } from "@/lib/seo";
import { languageAlternates } from "@/lib/seo-meta";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...LANGS.map((l) => ({
      url: `${SITE}${pathFor(l)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: l === "en" ? 1 : 0.9,
      alternates: { languages: languageAlternates() },
    })),
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
