"use client";

// The void as a map: one big world you drag around and zoom (like looking down on a city). Every file, bubble
// stack and task panel is a "house" with its own random spot. The world grows with what is in it and the view
// zooms out to keep everything in sight, so nothing hides behind the edge or needs scrolling to.

/** the live view, read by code that turns pointer moves into world moves (OrbView's drag) */
export const mapView = { on: false, k: 1 };

/** `near`: the key of what it belongs to (a file wired to a task panel): it is put down right beside that */
export type Thing = { key: string; w: number; h: number; born: number; near?: string };
export type Spot = { x: number; y: number };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** a small seeded random stream: the same thing gets the same candidate spots on every screen */
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GAP = 28;
// how much of the world things may cover: low enough that there is always open sky between them
const DENSITY = 0.42;

/** How big the world is for these things: at least the screen, growing (in steps, so it doesn't jitter) as more arrive. */
export function worldSize(things: Thing[], vw: number, vh: number) {
  const area = things.reduce((a, t) => a + (t.w + GAP) * (t.h + GAP), 0);
  const need = area / DENSITY / (vw * vh);
  const f = Math.max(1, Math.ceil(Math.sqrt(need) * 4) / 4);
  // the widest thing must fit too, with room to drag it sideways (a phone screen is barely wider than a panel)
  const minW = Math.max(0, ...things.map((t) => t.w * 1.5 + 2 * GAP));
  const minH = Math.max(0, ...things.map((t) => t.h + 2 * GAP));
  return { W: Math.max(vw * f, minW), H: Math.max(vh * f, minH), f };
}

// where each thing sits, as a fraction of the world (so a growing world spreads everyone out, nobody jumps)
const spots = new Map<string, Spot>();
// things this device moved by hand: they stay exactly there (the rest make room), remembered for the next visit
const PINS = "orbit:pins";
const pins: Map<string, Spot> = (() => {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(PINS) || "{}")) as [string, Spot][]);
  } catch {
    return new Map();
  }
})();
const savePins = () => {
  try {
    localStorage.setItem(PINS, JSON.stringify(Object.fromEntries([...pins].slice(-300))));
  } catch {}
};
/** put a thing down where it was dragged (a fraction of the world) */
export function pin(key: string, x: number, y: number) {
  const s = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  pins.delete(key);
  pins.set(key, s);
  spots.set(key, s);
  savePins();
}

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2) + GAP) *
  Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2) + GAP);

/**
 * A random spot for everything, oldest first: each keeps the spot it got (as a fraction of the world) unless
 * something older now covers it; a new one tries random spots until it finds open sky. Returns centres in px.
 */
export function place(things: Thing[], W: number, H: number) {
  const live = new Set(things.map((t) => t.key));
  for (const k of spots.keys()) if (!live.has(k)) spots.delete(k);
  // what was moved by hand goes down first, exactly where it was put
  // then what others belong to (task panels), then what belongs to them (right beside), then everything else
  const anchors = new Set(things.map((t) => t.near).filter(Boolean));
  const order = (t: Thing) => (pins.has(t.key) ? 0 : anchors.has(t.key) ? 1 : t.near ? 2 : 3);
  const out = new Map<string, Spot>();
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const rects = new Map<string, { x: number; y: number; w: number; h: number }>();
  const free = (r: { x: number; y: number; w: number; h: number }) => placed.reduce((a, p) => a + overlaps(r, p), 0);
  for (const t of [...things].sort((a, b) => order(a) - order(b) || a.born - b.born || a.key.localeCompare(b.key))) {
    const mx = Math.min(0.5, (t.w / 2 + GAP) / W), my = Math.min(0.5, (t.h / 2 + GAP) / H);
    const clampF = (v: number, m: number) => Math.min(1 - m, Math.max(m, v));
    const at = (s: Spot) => ({ x: clampF(s.x, mx) * W, y: clampF(s.y, my) * H, w: t.w, h: t.h });
    let best: Spot | null = null;
    const anchor = t.near ? rects.get(t.near) : undefined;
    // close enough to what it belongs to: a short cable (edge to edge), never across the map
    const near = (s: Spot) => {
      if (!anchor) return true;
      const gx = Math.max(0, Math.abs(s.x * W - anchor.x) - (anchor.w + t.w) / 2), gy = Math.max(0, Math.abs(s.y * H - anchor.y) - (anchor.h + t.h) / 2);
      return Math.hypot(gx, gy) < 150;
    };
    const had = pins.get(t.key) ?? spots.get(t.key);
    if (had && (pins.has(t.key) || (free(at(had)) === 0 && near(had)))) best = had;
    if (!best && anchor) {
      // rings around the anchor, its right side first (where its cables leave), then above/below, then the left
      const angles = [0, -0.5, 0.5, -1, 1, -1.5, 1.5, Math.PI, Math.PI - 0.6, Math.PI + 0.6];
      search: for (let ring = 0; ring < 7; ring++) {
        for (const a of angles) {
          const rx = anchor.w / 2 + t.w / 2 + GAP + 24 + ring * 70, ry = anchor.h / 2 + t.h / 2 + GAP + ring * 60;
          const c = { x: (anchor.x + Math.cos(a) * rx) / W, y: (anchor.y + Math.sin(a) * ry) / H };
          if (c.x < mx || c.x > 1 - mx || c.y < my || c.y > 1 - my) continue;
          if (free(at(c)) === 0) {
            best = c;
            break search;
          }
        }
      }
    }
    if (!best) {
      // the first thing in an empty world takes the middle; the rest try random spots
      const r = rng(hash(t.key));
      let bestCost = Infinity;
      for (let i = 0; i < 80; i++) {
        const c = !placed.length && i === 0 ? { x: 0.5, y: 0.5 } : { x: r(), y: r() };
        const cost = free(at(c));
        if (cost < bestCost) {
          bestCost = cost;
          best = c;
          if (cost === 0) break;
        }
      }
    }
    const s = { x: clampF(best!.x, mx), y: clampF(best!.y, my) };
    spots.set(t.key, s);
    const r = at(s);
    placed.push(r);
    rects.set(t.key, r);
    out.set(t.key, { x: r.x, y: r.y });
  }
  return out;
}
