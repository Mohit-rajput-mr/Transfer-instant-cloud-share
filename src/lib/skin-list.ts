// The styles a visitor can pick for how dropped objects look (shared by the page and /api/prefs).
export type SkinGroup = "Classic" | "Office" | "Materials" | "Clean" | "Playful" | "Kids" | "Aesthetic" | "Retro" | "Easy to see";
export interface Skin {
  id: string;
  name: string;
  group: SkinGroup;
  /** quieter motion and plain containers: for serious work */
  calm?: boolean;
}

export const SKINS: Skin[] = [
  { id: "orbit", name: "Orbit", group: "Classic" },
  { id: "file", name: "Document", group: "Office", calm: true },
  { id: "folder", name: "Folder", group: "Office", calm: true },
  { id: "card", name: "Card", group: "Office", calm: true },
  { id: "tile", name: "Tile", group: "Office", calm: true },
  { id: "chart", name: "Pie chart", group: "Office", calm: true },
  { id: "badge", name: "Badge", group: "Office", calm: true },
  { id: "envelope", name: "Envelope", group: "Office", calm: true },
  { id: "ring", name: "Ring", group: "Office", calm: true },
  { id: "graphite", name: "Graphite", group: "Office", calm: true },
  { id: "gold", name: "Gold", group: "Materials" },
  { id: "silver", name: "Silver", group: "Materials", calm: true },
  { id: "copper", name: "Copper", group: "Materials" },
  { id: "steel", name: "Brushed steel", group: "Materials", calm: true },
  { id: "wood", name: "Wood", group: "Materials", calm: true },
  { id: "marble", name: "Marble", group: "Materials", calm: true },
  { id: "jade", name: "Jade", group: "Materials" },
  { id: "pearl", name: "Pearl", group: "Materials" },
  { id: "obsidian", name: "Obsidian", group: "Materials", calm: true },
  { id: "ceramic", name: "Ceramic", group: "Materials" },
  { id: "carbon", name: "Carbon", group: "Materials", calm: true },
  { id: "glass", name: "Glass", group: "Materials" },
  { id: "paper", name: "Paper", group: "Clean", calm: true },
  { id: "pebble", name: "Pebble", group: "Clean" },
  { id: "neon", name: "Neon", group: "Playful" },
  { id: "candy", name: "Candy", group: "Playful" },
  { id: "gem", name: "Gem", group: "Playful" },
  { id: "star", name: "Star", group: "Playful" },
  { id: "planet", name: "Planet", group: "Playful" },
  { id: "fire", name: "Fire", group: "Playful" },
  { id: "bubble", name: "Soap bubble", group: "Playful" },
  { id: "buddy", name: "Buddy", group: "Kids" },
  { id: "balloon", name: "Balloon", group: "Kids" },
  { id: "cloud", name: "Cloud", group: "Kids" },
  { id: "blocks", name: "Toy brick", group: "Kids" },
  { id: "heart", name: "Heart", group: "Aesthetic" },
  { id: "flower", name: "Flower", group: "Aesthetic" },
  { id: "clay", name: "Clay", group: "Aesthetic" },
  { id: "moon", name: "Moon", group: "Aesthetic" },
  { id: "polaroid", name: "Polaroid", group: "Aesthetic" },
  { id: "sticky", name: "Sticky note", group: "Aesthetic" },
  { id: "pixel", name: "Pixel", group: "Retro" },
  { id: "blocky", name: "Blocky", group: "Retro" },
  { id: "vinyl", name: "Vinyl", group: "Retro" },
  { id: "sunset", name: "Sunset", group: "Retro" },
  { id: "chrome", name: "Chrome", group: "Retro" },
  { id: "big", name: "Big & clear", group: "Easy to see", calm: true },
];
export const SKIN_GROUPS: SkinGroup[] = ["Classic", "Office", "Materials", "Clean", "Playful", "Kids", "Aesthetic", "Retro", "Easy to see"];
export const DEFAULT_SKIN = "orbit";
const byId = new Map(SKINS.map((s) => [s.id, s]));
export const validSkin = (id: unknown): id is string => typeof id === "string" && byId.has(id);
export const skinName = (id: string) => byId.get(id)?.name ?? "Orbit";
export const toneOf = (id: string) => (byId.get(id)?.calm ? "calm" : "lively");

/** Colour schemes, picked separately from the style. */
export const PALETTES = [
  { id: "vivid", name: "Vivid", note: "Every file its own colour" },
  { id: "type", name: "By file type", note: "PDF red, photos purple, video pink…" },
  { id: "accent", name: "One colour", note: "Everything in one calm blue" },
  { id: "muted", name: "Muted", note: "Soft, professional colours" },
  { id: "mono", name: "Monochrome", note: "Black, white and silver" },
] as const;
export const DEFAULT_PALETTE = "vivid";
export const validPalette = (id: unknown): id is string => typeof id === "string" && PALETTES.some((p) => p.id === id);

const TYPE_HUE: [RegExp, number][] = [
  [/^pdf$/, 2],
  [/^(docx?|odt|rtf|txt|md|pages)$/, 214],
  [/^(xlsx?|csv|ods|numbers)$/, 142],
  [/^(pptx?|key|odp)$/, 24],
  [/^(jpe?g|png|gif|webp|heic|heif|svg|bmp|tiff?|avif|raw)$/, 272],
  [/^(mp4|mov|avi|mkv|webm|m4v|3gp)$/, 328],
  [/^(mp3|wav|flac|m4a|aac|ogg|opus)$/, 172],
  [/^(zip|rar|7z|tar|gz|tgz|bz2|xz|dmg|iso)$/, 44],
  [/^(js|ts|tsx|jsx|py|html|css|json|xml|java|c|cpp|go|rs|sh)$/, 192],
  [/^(files|folder)$/, 205],
];
/** a hue by kind of file, for the "By file type" colour scheme */
export function typeHue(fileName: string, mime = "") {
  const e = (/\.([a-z0-9]{1,6})$/i.exec(fileName)?.[1] ?? "").toLowerCase();
  if (mime === "application/x-orbit-folder") return 205;
  for (const [re, h] of TYPE_HUE) if (re.test(e)) return h;
  return 228;
}
