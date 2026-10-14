import Link from "next/link";
import { SEO, jsonLd, pathFor, type SeoCopy } from "@/lib/seo";

/** The plain-language guide under the void: one h1, what it does, an FAQ, and links to every language. */
export default function SeoContent({ c }: { c: SeoCopy }) {
  return (
    <section className="seo" lang={c.lang} dir={c.lang === "ar" ? "rtl" : "ltr"} aria-labelledby="seo-h1">
      <h1 id="seo-h1" className="wide">{c.h1}</h1>
      <p className="seo-intro">{c.intro}</p>
      <ul className="seo-points">
        {c.points.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <div className="seo-faq">
        {c.faq.map((f) => (
          <details key={f.q}>
            <summary><h2>{f.q}</h2></summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
      <nav className="seo-langs" aria-label="Languages">
        {Object.values(SEO).map((l) => (
          <Link key={l.lang} href={pathFor(l.lang)} hrefLang={l.lang} lang={l.lang} className={l.lang === c.lang ? "on" : undefined}>{l.label}</Link>
        ))}
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(c)).replace(/</g, "\\u003c") }} />
    </section>
  );
}
