import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// Search engines and AI assistants are welcome on the public pages; HQ and the API are not.
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/api/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot", "Applebot-Extended", "DuckDuckBot", "YandexBot", "Baiduspider"].map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
