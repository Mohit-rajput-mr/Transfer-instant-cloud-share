// How a container lays out its files (used by components/OrbView.tsx and BubbleZoom.tsx; tested in lib/layout.test.ts).

/** How many files a row of a container holds: full, even rows first (9 → 3·3·3, 10 → 5·5, 8 → 4·4, 12 → 4·4·4), a bit
 *  wider than tall, never more than 6 across; a short last row is centred. */
export function smartCols(n: number) {
  if (n <= 3) return Math.max(1, n);
  let best = 2, score = Infinity;
  for (let c = 2; c <= Math.min(6, n); c++) {
    const r = Math.ceil(n / c), empty = r * c - n;
    if (r > c) continue; // never taller than wide
    const s = empty * 10 + Math.abs(c - r * 1.6);
    if (s < score) (score = s), (best = c);
  }
  return best;
}

export function bubbleLayout(n: number) {
  const d = n <= 2 ? 58 : n <= 3 ? 52 : n <= 4 ? 48 : n <= 6 ? 42 : n <= 9 ? 36 : n <= 12 ? 32 : 28;
  const cols = smartCols(n);
  const rows = Math.ceil(n / cols);
  // Work keeps every container a clean grid; the classic look keeps its loose, hand-placed feel
  const loose = typeof document === "undefined" || document.documentElement.dataset.ui !== "work";
  const cw = d * 2.2, ch = d * 2.15, px = d * 0.5, py = d * 0.45;
  const W = cols * cw + px * 2, H = rows * ch + py * 2;
  const spots: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i - r * cols + (cols - inRow) / 2; // a shorter last row sits in the middle
    // a fixed per-ball nudge (same every render), so the arrangement looks loose, not gridded
    const jx = loose ? Math.sin(i * 12.9898) * 0.16 : 0, jy = loose ? Math.cos(i * 78.233) * 0.12 : 0;
    spots.push([(px + (c + 0.5 + jx) * cw) / W, (py + (r + 0.42 + jy) * ch) / H]);
  }
  return { d, W, H, spots };
}
