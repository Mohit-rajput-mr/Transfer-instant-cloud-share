// Merge simulation: files drop down a tube into a ring; two of the same kind touch → they fuse into the next kind.
// Pure JS, deterministic (seeded), precomputed once → sim.json (every frame's balls + the merge events for sound).
//   node sim.cjs [seed]
const FPS = 30, SUB = 10, DUR = +process.env.DUR || 62, W = 1080;
const C = { x: 540, y: 1060, r: 470 }, TUBE = 62; // ring and the half-width of the drop tube
const R = [30, 40, 52, 66, 82, 100, 122, 148, 196]; // radius per tier (8 = the final form)
let seed = +process.argv[2] || 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const balls = []; let id = 0; const events = [], frames = [];
const G = 2600, dt = 1 / FPS / SUB;
function spawn(t, tier) { balls.push({ id: id++, tier, x: 540 + (rnd() - 0.5) * 30, y: 60, vx: (rnd() - 0.5) * 40, vy: 300, born: t, a: rnd() * 6, va: 0 }); }
let next = 0.6, top = 0, final = null;
function pick(t) {
  // mostly small files; a lone bigger one sometimes gets a twin dropped, so the chain keeps climbing
  const have = {}; for (const b of balls) have[b.tier] = (have[b.tier] || 0) + 1;
  const lone = Object.keys(have).map(Number).filter((k) => k <= 5 && have[k] === 1 && k >= 2);
  if (t > 6 && lone.length && rnd() < 0.18 + t * 0.006) return lone[Math.floor(rnd() * lone.length)];
  const u = rnd(); return u < 0.45 ? 0 : u < 0.75 ? 1 : u < 0.92 ? 2 : 3;
}
for (let f = 0; f < DUR * FPS; f++) {
  const t0 = f / FPS;
  if (!final && t0 >= next) { spawn(t0, pick(t0)); next = t0 + Math.max(0.22, 0.42 - t0 * 0.003); }
  for (let s = 0; s < SUB; s++) {
    const t = t0 + s * dt;
    for (const b of balls) { b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt; b.va *= 0.999; }
    for (let it = 0; it < 2; it++) {
      // pairs: merge the same kind, push apart the rest
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j]; if (a.dead || b.dead) continue;
        const ra = R[a.tier], rb = R[b.tier], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3, o = ra + rb - d;
        if (o <= 0) continue;
        if (a.tier === b.tier && a.tier < 8 && t - a.born > 0.12 && t - b.born > 0.12) {
          a.dead = b.dead = true; const n = { id: id++, tier: a.tier + 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: (a.vx + b.vx) / 2, vy: Math.min(0, (a.vy + b.vy) / 2) - 250, born: t, a: (a.a + b.a) / 2, va: (rnd() - 0.5) * 4, from: [a.id, b.id] };
          balls.push(n); events.push({ t: +t.toFixed(3), tier: n.tier, x: n.x, y: n.y, id: n.id }); top = Math.max(top, n.tier); if (n.tier === 8) final = t; continue;
        }
        const nx = dx / d, ny = dy / d, ma = ra * ra, mb = rb * rb, k = o / (ma + mb);
        a.x -= nx * k * mb; a.y -= ny * k * mb; b.x += nx * k * ma; b.y += ny * k * ma;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { const jimp = -(1.25) * rv / (1 / ma + 1 / mb); a.vx -= jimp * nx / ma; a.vy -= jimp * ny / ma; b.vx += jimp * nx / mb; b.vy += jimp * ny / mb;
          const tv = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx; a.va += tv * 0.002; b.va -= tv * 0.002; }
      }
      for (let i = balls.length - 1; i >= 0; i--) if (balls[i].dead) balls.splice(i, 1);
      // walls: the ring (open at the top where the tube joins) and the tube
      for (const b of balls) { const r = R[b.tier], dx = b.x - C.x, dy = b.y - C.y, d = Math.hypot(dx, dy);
        const inTube = Math.abs(b.x - 540) < TUBE && b.y < C.y - C.r + 40;
        if (b.y < C.y - C.r + 10) { if (b.x - r < 540 - TUBE) { b.x = 540 - TUBE + r; b.vx = Math.abs(b.vx) * 0.3; } if (b.x + r > 540 + TUBE) { b.x = 540 + TUBE - r; b.vx = -Math.abs(b.vx) * 0.3; } }
        else if (!inTube && d + r > C.r) { const nx = dx / d, ny = dy / d; b.x = C.x + nx * (C.r - r); b.y = C.y + ny * (C.r - r); const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= 1.3 * vn * nx; b.vy -= 1.3 * vn * ny; } b.vx *= 0.995; b.vy *= 0.995; b.va += (b.vx * -ny + b.vy * nx) * 0.0008; } }
    }
  }
  frames.push(balls.map((b) => [b.id, b.tier, +b.x.toFixed(1), +b.y.toFixed(1), +b.a.toFixed(2), +(t0 - b.born).toFixed(2)]));
}
require("fs").writeFileSync(__dirname + "/sim.json", JSON.stringify({ fps: FPS, R, C, TUBE, frames, events, final }));
const firsts = {}; for (const e of events) if (!(e.tier in firsts)) firsts[e.tier] = e.t;
console.log("seed", +process.argv[2] || 7, "top", top, "final", final && final.toFixed(1), "firsts", JSON.stringify(firsts), "balls end", balls.length);
