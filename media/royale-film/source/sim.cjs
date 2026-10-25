// File battle royale: 10 file balls bounce in a ring that shrinks. Touching the ring costs 1 of 3 hearts; at 0 the file
// is out. Last one standing wins. Deterministic (seeded). Writes sim_<seed>.json: frames [[x,y,alive]...] + ring radius + events.
const fs = require("fs"); const seed0 = +(process.argv[2] || 1); let s = seed0 * 7919 + 3;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const KINDS = ["photo", "video", "song", "pdf", "folder", "note", "zip", "game", "slides", "voice"], CX = 540, CY = 1010, BR = 40, DT = 1 / 240;
const B = KINDS.map((k, i) => { const a = (i / 10) * Math.PI * 2, r = 200 + rnd() * 120, sp = 420 + rnd() * 120, d = rnd() * 6.28; return { k, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, vx: Math.cos(d) * sp, vy: Math.sin(d) * sp, hp: 3, alive: true, cd: 0 }; });
const R = (t) => t < 2 ? 470 : Math.max(170, 470 - (t - 2) * 8);
const ARC = (t) => ({ a: t * 0.7, w: Math.min(1.0, 0.3 + t * 0.018) }); // two red laser arcs (centre angle, half-width), opposite each other
const inArc = (ang, t) => { const { a, w } = ARC(t); for (const c of [a, a + Math.PI]) { let d = ((ang - c) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; if (Math.abs(d) < w) return true; } return false; };
const frames = [], events = []; let t = 0, fi = 0, out = 0;
while (t < 90) {
  const rr = R(t);
  for (const b of B) { if (!b.alive) continue; b.x += b.vx * DT; b.y += b.vy * DT; b.cd = Math.max(0, b.cd - DT);
    const dx = b.x - CX, dy = b.y - CY, d = Math.hypot(dx, dy);
    if (d > rr - BR) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; } b.x = CX + nx * (rr - BR); b.y = CY + ny * (rr - BR);
      if (b.cd <= 0 && inArc(Math.atan2(dy, dx), t)) { b.hp--; b.cd = 0.35; events.push({ t, k: b.hp > 0 ? "hurt" : "out", b: b.k, hp: b.hp, x: b.x, y: b.y }); if (b.hp <= 0) { b.alive = false; out++; } } } }
  const A = B.filter((b) => b.alive);
  for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const a = A[i], c = A[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy); if (d < 2 * BR && d > 0) { const nx = dx / d, ny = dy / d, rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny; if (rv < 0) { a.vx += rv * nx; a.vy += rv * ny; c.vx -= rv * nx; c.vy -= rv * ny; events.push({ t, k: "bump", x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }); } const o = (2 * BR - d) / 2; a.x -= nx * o; a.y -= ny * o; c.x += nx * o; c.y += ny * o; } }
  // keep the energy up as the ring closes
  for (const b of A) { const sp = Math.hypot(b.vx, b.vy), want = 430 + (470 - rr) * 0.5; b.vx *= want / sp; b.vy *= want / sp; }
  t += DT; if (t >= fi / 30) { frames.push({ r: Math.round(rr), b: B.map((b) => [Math.round(b.x), Math.round(b.y), b.alive ? b.hp : 0]) }); fi++; }
  if (A.length <= 1) { events.push({ t, k: "win", b: A[0]?.k }); break; }
}
for (let i = 0; i < 45; i++) frames.push(frames[frames.length - 1]);
fs.writeFileSync(`sim_${seed0}.json`, JSON.stringify({ KINDS, CX, CY, BR, frames, events, len: t, arcs: frames.map((_, i) => { const q = ARC(Math.min(i / 30, t)); return [+q.a.toFixed(3), +q.w.toFixed(3)]; }) }));
const outs = events.filter((e) => e.k === "out").map((e) => e.t.toFixed(1)); console.log(seed0, "win", events.at(-1).b, "len", t.toFixed(1), "outs", outs.join(" "));
