import Void from "@/components/Void";
import SeoContent from "@/components/SeoContent";
import { SEO } from "@/lib/seo";

export default function Page() {
  return (
    <>
      <Void />
      <SeoContent c={SEO.en} />
    </>
  );
}
