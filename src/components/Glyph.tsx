import { LuArrowRight, LuArrowUpRight, LuCheck, LuDownload } from "react-icons/lu";

// Arrows and ticks drawn as icons, never as text: phones (iOS especially) render ↗ ↓ ✓ as colour emoji.
const ICON = { "↗": LuArrowUpRight, "↓": LuDownload, "→": LuArrowRight, "✓": LuCheck } as const;

/** "Send ↗" → Send + icon. Strings without a trailing arrow / tick come back as they are. */
export function glyph(s: string) {
  const I = ICON[s.slice(-1) as keyof typeof ICON];
  if (!I) return s;
  const t = s.slice(0, -1).trimEnd();
  return (
    <span className="glyph">
      {t}
      <I aria-hidden />
    </span>
  );
}
