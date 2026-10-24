// Escape the ring: balls bounce inside a spinning ring with a gap. A ball that gets out falls away and two new
// balls pop out of the centre. Deterministic; writes sim.json (frames + bounce/escape events for the music).
const FPS = 30, SUB = 8, DUR = +process.env.DUR || 48, CX = 540, CY = 900, R = 400, BR = 16, G = 1500, CAP = +process.env.CAP || 240;
let seed = +process.argv[2] || 3; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const GAP = +process.env.GAP || 0.42, SPIN = 1.1; let id = 0; const balls = [], gone = [], events = [], frames = []; let shatter = null;
const spawn = (t, x = CX, y = CY - 120) => { const a = rnd() * Math.PI * 2, v = 520 + rnd() * 260; balls.push({ id: id++, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, born: t, hue: (id * 47) % 360 }); };
spawn(0);
const dt = 1 / FPS / SUB;
for (let f = 0; f < DUR * FPS; f++) {
  const t0 = f / FPS;
  for (let s = 0; s < SUB; s++) {
    const t = t0 + s * dt, rot = t * SPIN;
    for (let i = balls.length - 1; i >= 0; i--) { const b = balls[i]; b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      const dx = b.x - CX, dy = b.y - CY, d = Math.hypot(dx, dy);
      if (b.out) continue;
      if (d + BR > R && !shatter) { let a = Math.atan2(dy, dx) - rot; a = ((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // angle relative to the gap (gap at 0)
        if (Math.abs(a) < GAP / 2) { if (d - BR > R) { b.out = true; events.push({ t: +t.toFixed(3), k: "esc", id: b.id, x: b.x, y: b.y }); if (balls.length - gone.length < CAP) { spawn(t); spawn(t); } } }
        else { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; const sp = Math.hypot(b.vx, b.vy), want = Math.max(sp, 900); b.vx *= want / sp; b.vy *= want / sp; events.push({ t: +t.toFixed(3), k: "hit", id: b.id, x: b.x, y: b.y }); } b.x = CX + nx * (R - BR); b.y = CY + ny * (R - BR); } }
    }
    for (let i = balls.length - 1; i >= 0; i--) if (balls[i].y > 2200) { gone.push(balls[i].id); balls.splice(i, 1); }
    if (!shatter && balls.filter((b) => !b.out).length >= CAP) { shatter = t; events.push({ t: +t.toFixed(3), k: "shatter" }); for (const b of balls) { const a = Math.atan2(b.y - CY, b.x - CX); b.vx += Math.cos(a) * 900; b.vy += Math.sin(a) * 900 - 400; } }
  }
  frames.push({ rot: +(t0 * SPIN).toFixed(4), b: balls.map((b) => [b.id, +b.x.toFixed(1), +b.y.toFixed(1), b.hue, b.out ? 1 : 0]) });
  if (shatter && t0 > shatter + 6) break;
}
require("fs").writeFileSync(__dirname + "/sim.json", JSON.stringify({ fps: FPS, CX, CY, R, BR, GAP, frames, events, shatter }));
console.log("seed", +process.argv[2] || 3, "frames", frames.length, "shatter", shatter && shatter.toFixed(1), "escapes", events.filter((e) => e.k === "esc").length, "hits", events.filter((e) => e.k === "hit").length);
