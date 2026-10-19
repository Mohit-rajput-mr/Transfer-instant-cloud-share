import VoidShell from "@/components/VoidShell";
import { LANGS, NAME, SEO, pathFor } from "@/lib/seo";
// fully scoped under html[data-ui="work"], so it is inert on the classic look; loaded here (not on /work only) so the
// switch to Work needs no new stylesheet
import "./work/work.css";

// the <title> each view's metadata gives it (root template "%s · Orbi Transfer"), for the in-place switch
const titles: Record<string, string> = Object.fromEntries([...LANGS.map((l) => [pathFor(l), SEO[l].title]), ["/work", `Work · ${NAME}`]]);

/** /, /work and /[lang] share one layout, so one <Void> stays mounted while the look flips (lib/view.ts). */
export default function VoidLayout({ children }: { children: React.ReactNode }) {
  return <VoidShell titles={titles}>{children}</VoidShell>;
}
