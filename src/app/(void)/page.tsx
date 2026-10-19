import SeoContent from "@/components/SeoContent";
import { SEO } from "@/lib/seo";

// the void itself lives in (void)/layout.tsx (one <Void> kept across / ↔ /work); this page adds only its guide
export default function Page() {
  return <SeoContent c={SEO.en} />;
}
