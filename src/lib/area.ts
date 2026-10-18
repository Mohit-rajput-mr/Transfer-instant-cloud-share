// Areas: the public void is local. Everything belongs to the rough area of whoever posted it — a geohash cell of
// 4 characters, about 39 x 20 km — and people see their own cell and the eight around it (so a border never splits a
// town). Only this cell is used for (and seen by) other people; the exact spot goes only to Orbit's admin map (lib/where.ts). Works on the server and in the browser.

const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export const AREA_LEN = 4;
export const validArea = (s: unknown): s is string => typeof s === "string" && new RegExp(`^[${B32}]{${AREA_LEN}}$`).test(s);

/** the cell a point is in */
export function areaOf(lat: number, lon: number, len = AREA_LEN) {
  const la = [-90, 90], lo = [-180, 180];
  let bit = 0, ch = 0, even = true, out = "";
  while (out.length < len) {
    const r = even ? lo : la, v = even ? lon : lat, mid = (r[0] + r[1]) / 2;
    if (v >= mid) {
      ch = (ch << 1) | 1;
      r[0] = mid;
    } else {
      ch <<= 1;
      r[1] = mid;
    }
    even = !even;
    if (++bit === 5) {
      out += B32[ch];
      bit = ch = 0;
    }
  }
  return out;
}

/** the middle of a cell and its size in degrees */
function box(cell: string) {
  const la = [-90, 90], lo = [-180, 180];
  let even = true;
  for (const c of cell) {
    const n = B32.indexOf(c);
    for (let b = 4; b >= 0; b--) {
      const r = even ? lo : la, mid = (r[0] + r[1]) / 2;
      if ((n >> b) & 1) r[0] = mid;
      else r[1] = mid;
      even = !even;
    }
  }
  return { lat: (la[0] + la[1]) / 2, lon: (lo[0] + lo[1]) / 2, dLat: la[1] - la[0], dLon: lo[1] - lo[0] };
}

/** the middle of a cell, for a map */
export const cellCenter = (cell: string) => {
  const b = box(cell);
  return { lat: b.lat, lon: b.lon };
};

/** a cell and the eight around it, always in the same order (so everyone in a cell asks for the same list) */
export function around(cell: string) {
  const b = box(cell);
  const out = new Set<string>();
  for (const dy of [-1, 0, 1])
    for (const dx of [-1, 0, 1]) {
      const lat = b.lat + dy * b.dLat;
      if (lat <= -90 || lat >= 90) continue;
      const lon = ((b.lon + dx * b.dLon + 540) % 360) - 180;
      out.add(areaOf(lat, lon, cell.length));
    }
  return [...out].sort();
}
