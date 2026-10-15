// The styles a visitor can pick for how dropped objects look (shared by the page and /api/prefs).
export type SkinGroup = "Classic" | "Office" | "Clean" | "Playful" | "Kids" | "Aesthetic" | "Retro" | "Easy to see";
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
  { id: "minimal", name: "Outline", group: "Office", calm: true },
  { id: "graphite", name: "Graphite", group: "Office", calm: true },
  { id: "glass", name: "Glass", group: "Clean" },
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
  { id: "blocks", name: "Toy block", group: "Kids" },
  { id: "heart", name: "Heart", group: "Aesthetic" },
  { id: "flower", name: "Flower", group: "Aesthetic" },
  { id: "marble", name: "Marble", group: "Aesthetic" },
  { id: "pastel", name: "Pastel", group: "Aesthetic" },
  { id: "moon", name: "Moon", group: "Aesthetic" },
  { id: "polaroid", name: "Polaroid", group: "Aesthetic" },
  { id: "sticky", name: "Sticky note", group: "Aesthetic" },
  { id: "pixel", name: "Pixel", group: "Retro" },
  { id: "vinyl", name: "Vinyl", group: "Retro" },
  { id: "sunset", name: "Sunset", group: "Retro" },
  { id: "chrome", name: "Chrome", group: "Retro" },
  { id: "big", name: "Big & clear", group: "Easy to see", calm: true },
];
export const SKIN_GROUPS: SkinGroup[] = ["Classic", "Office", "Clean", "Playful", "Kids", "Aesthetic", "Retro", "Easy to see"];
export const DEFAULT_SKIN = "orbit";
const byId = new Map(SKINS.map((s) => [s.id, s]));
export const validSkin = (id: unknown): id is string => typeof id === "string" && byId.has(id);
export const skinName = (id: string) => byId.get(id)?.name ?? "Orbit";
export const toneOf = (id: string) => (byId.get(id)?.calm ? "calm" : "lively");
