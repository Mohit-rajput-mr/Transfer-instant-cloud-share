// Marble race: six file-type balls drop through pegs, spinning bars and zigzag ramps to a finish line.
// Deterministic; writes sim.json (frames, hit events for notes, finish order).
const FPS = 30, SUB = 10, DUR = 60, X0 = 70, X1 = 1010, BR = 30, G = 1500, FIN = 1800;
let seed = +process.argv[2] || 1; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pegs = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { const x = 130 + c * 105 + (r % 2) * 52, y = 420 + r * 70; if (x < X1 - 40) pegs.push([x, y, 10]); }
const spinners = [{ x: 330, y: 1060, len: 180, w: 2.2 }, { x: 750, y: 1060, len: 180, w: -2.2 }, { x: 540, y: 1225, len: 190, w: 1.6 }];
const ramps = [[[X0, 1370], [700, 1480]], [[X1, 1530], [380, 1640]], [[X0, 1680], [700, 1770]]]; // static zigzag segments
const walls = [[[X0, 850], [455, 960]], [[X1, 850], [625, 960]]]; // a funnel under the pegs
const balls = ["photo", "video", "song", "pdf", "folder", "note"].map((k, i) => ({ k, x: 200 + i * 136 + (rnd() - 0.5) * 30, y: 250 - rnd() * 40, vx: (rnd() - 0.5) * 60, vy: 0, a: 0, done: null }));
const frames = [], events = [], order = [];
function segHit(b, A, B, vx = 0, vy = 0) { const ax = B[0] - A[0], ay = B[1] - A[1], L2 = ax * ax + ay * ay; let t = ((b.x - A[0]) * ax + (b.y - A[1]) * ay) / L2; t = Math.max(0, Math.min(1, t)); const px = A[0] + ax * t, py = A[1] + ay * t, dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy);
  if (d < BR + 6 && d > 0) { const nx = dx / d, ny = dy / d; b.x = px + nx * (BR + 6); b.y = py + ny * (BR + 6); const rvx = b.vx - vx, rvy = b.vy - vy, vn = rvx * nx + rvy * ny; if (vn < 0) { b.vx -= 1.5 * vn * nx; b.vy -= 1.5 * vn * ny; b.vx *= 0.995; return Math.abs(vn); } } return 0; }
const dt = 1 / FPS / SUB; let last = {};
for (let f = 0; f < DUR * FPS; f++) { const t0 = f / FPS;
  for (let s = 0; s < SUB; s++) { const t = t0 + s * dt;
    for (const b of balls) { if (b.done) continue; b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.vx * dt / BR;
      if (b.x < X0 + BR) { b.x = X0 + BR; b.vx = Math.abs(b.vx) * 0.6; } if (b.x > X1 - BR) { b.x = X1 - BR; b.vx = -Math.abs(b.vx) * 0.6; }
      let hit = 0;
      for (const [px, py, pr] of pegs) { const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy); if (d < BR + pr) { const nx = dx / d, ny = dy / d; b.x = px + nx * (BR + pr); b.y = py + ny * (BR + pr); const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; b.vx += (rnd() - 0.5) * 30; hit = Math.max(hit, -vn); } } }
      for (const sp of spinners) { const an = t * sp.w, cx = Math.cos(an) * sp.len / 2, cy = Math.sin(an) * sp.len / 2; const rx = b.x - sp.x, ry = b.y - sp.y; hit = Math.max(hit, segHit(b, [sp.x - cx, sp.y - cy], [sp.x + cx, sp.y + cy], -ry * sp.w, rx * sp.w)); }
      for (const [A, B] of [...ramps, ...walls]) hit = Math.max(hit, segHit(b, A, B));
      if (hit > 150 && (t - (last[b.k] ?? -1)) > 0.12) { events.push({ t: +t.toFixed(3), k: "hit", b: b.k, v: Math.round(hit) }); last[b.k] = t; }
      if (b.y > FIN && !b.done) { b.done = t; order.push(b.k); events.push({ t: +t.toFixed(3), k: "fin", b: b.k, place: order.length }); b.vy = 0; b.vx = 0; }
    }
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) { const a = balls[i], b = balls[j]; if (a.done || b.done) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 2 * BR && d > 0) { const nx = dx / d, ny = dy / d, o = (2 * BR - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { a.vx += rv * nx; a.vy += rv * ny; b.vx -= rv * nx; b.vy -= rv * ny; } } }
  }
  frames.push(balls.map((b) => [+b.x.toFixed(1), +b.y.toFixed(1), +b.a.toFixed(2)]));
  if (order.length === balls.length && t0 > balls.reduce((m, b) => Math.max(m, b.done), 0) + 5) break;
}
require("fs").writeFileSync(__dirname + `/sim_${+process.argv[2] || 1}.json`, JSON.stringify({ fps: FPS, BR, X0, X1, FIN, pegs, spinners, ramps, walls, kinds: balls.map((b) => b.k), frames, events, order, finish: balls.map((b) => b.done) }));
const fin = balls.map((b) => b.done).filter(Boolean).sort((a, b) => a - b);
console.log("seed", +process.argv[2] || 1, "order", order.join(","), "times", fin.map((x) => x.toFixed(1)).join(" "), "frames", frames.length);
