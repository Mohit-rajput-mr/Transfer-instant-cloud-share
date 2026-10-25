// Pong, PHOTO (bottom) vs VIDEO (top), first to 3. Deterministic: AI paddles predict the ball with a seeded error that
// grows with speed. Writes sim_<seed>.json: frames [ball x,y, top paddle x, bottom paddle x] at 30 fps + events.
const fs = require("fs"); const seed0 = +(process.argv[2] || 1); let s = seed0 * 9973 + 17;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const X0 = 90, X1 = 990, YT = 380, YB = 1640, PW = 230, BR = 34, DT = 1 / 240;
let bx, by, vx, vy, sp, px = { top: 540, bot: 540 }, err = { top: 0, bot: 0 }, score = { top: 0, bot: 0 }, t = 0, wait = 1.0, hits = 0;
const frames = [], events = [];
function serve(to) { bx = 540; by = 1010; sp = 820; const a = (rnd() - 0.5) * 0.9; vx = Math.sin(a) * sp; vy = Math.cos(a) * sp * (to === "bot" ? 1 : -1); hits = 0; }
function predict(yTarget) { let x = bx, y = by, ux = vx, uy = vy; const tt = (yTarget - y) / uy; x += ux * tt; const w = X1 - X0 - 2 * BR; let k = ((x - X0 - BR) % (2 * w) + 2 * w) % (2 * w); return X0 + BR + (k > w ? 2 * w - k : k); }
serve(rnd() < 0.5 ? "top" : "bot"); let fi = 0;
while (score.top < 3 && score.bot < 3 && t < 120) {
  if (wait > 0) { wait -= DT; } else {
    bx += vx * DT; by += vy * DT;
    if (bx < X0 + BR) { bx = X0 + BR; vx = Math.abs(vx); events.push({ t, k: "wall" }); } if (bx > X1 - BR) { bx = X1 - BR; vx = -Math.abs(vx); events.push({ t, k: "wall" }); }
    for (const side of ["top", "bot"]) { const py = side === "top" ? YT : YB, dir = side === "top" ? -1 : 1;
      if (Math.sign(vy) === dir && Math.abs(by - py) < BR + 14 && Math.abs(bx - px[side]) < PW / 2 + BR * 0.6) { const off = (bx - px[side]) / (PW / 2); sp = Math.min(2300, sp * 1.08); hits++; const a = off * 0.85; vx = Math.sin(a) * sp; vy = -dir * Math.cos(a) * sp; by = py - dir * (BR + 14); events.push({ t, k: "hit", side, sp, hits }); err[side === "top" ? "bot" : "top"] = (rnd() - 0.5) * (sp / 2300) * 640; }
      if ((dir === 1 && by > YB + 90) || (dir === -1 && by < YT - 90)) { const win = side === "top" ? "bot" : "top"; score[win]++; events.push({ t, k: "score", win, top: score.top, bot: score.bot, x: bx }); wait = 1.6; serve(side); } }
  }
  // AI: move toward where the ball will cross, plus the miss error; back to centre when it goes away
  for (const side of ["top", "bot"]) { const py = side === "top" ? YT : YB, coming = wait <= 0 && (side === "top" ? vy < 0 : vy > 0); const target = coming ? predict(py) + err[side] : 540; const d = target - px[side], mv = 1250 * DT; px[side] += Math.max(-mv, Math.min(mv, d)); px[side] = Math.max(X0 + PW / 2, Math.min(X1 - PW / 2, px[side])); }
  t += DT; if (t >= fi / 30) { frames.push([Math.round(bx), Math.round(by), Math.round(px.top), Math.round(px.bot), wait > 0 ? 1 : 0]); fi++; }
}
fs.writeFileSync(`sim_${seed0}.json`, JSON.stringify({ X0, X1, YT, YB, PW, BR, frames, events, score, len: t }));
console.log(seed0, "score", score.top, score.bot, "len", t.toFixed(1), "hits", events.filter((e) => e.k === "hit").length, events.filter((e) => e.k === "score").map((e) => e.win[0]).join(""));
