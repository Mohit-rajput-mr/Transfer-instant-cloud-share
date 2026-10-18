const QR = require("qrcode"), jsQR = require("jsqr");
const q = QR.create("NOW YOU KNOW", { errorCorrectionLevel: "H" });
const n = q.modules.size, data = [...q.modules.data].map(Boolean), res = [...q.modules.reservedBit].map(Boolean);
// reading order: from the bottom-right, two columns at a time, snaking up and down, skipping column 6 and function areas
const order = []; let up = true;
for (let c = n - 1; c > 0; c -= 2) { if (c === 6) c--; for (let k = 0; k < n; k++) { const r = up ? n - 1 - k : k; for (const cc of [c, c - 1]) if (!res[r * n + cc]) order.push(r * n + cc); } up = !up; }
// the coffee stain: a blob over the data area (never the corner squares)
const cx = n * 0.62, cy = n * 0.66, R = n * +(process.argv[3] || 0.26), stain = [];
for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const d = Math.hypot((c - cx) * 1.0, (r - cy) * 1.25) + Math.sin(c * 1.7 + r) * 0.9; if (d < R && !res[r * n + c]) stain.push(r * n + c); }
// can a real decoder still read it with the stain? render to pixels: stained modules become a muddy brown (read as dark or light at random)
function readable(stainSet) { const s = 10, q4 = 4, W = (n + 2 * q4) * s, px = new Uint8ClampedArray(W * W * 4).fill(255);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const i = r * n + c; let dark = data[i]; if (stainSet.has(i)) dark = ((i * 2654435761) >>> 7) % 2 === 0; if (!dark) continue; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const p = (((r + q4) * s + y) * W + (c + q4) * s + x) * 4; px[p] = px[p + 1] = px[p + 2] = 0; } }
  const out = jsQR(px, W, W); return out ? out.data : null; }
const dataMods = data.length - res.filter(Boolean).length;
console.log("size", n, "mask", q.maskPattern, "data modules", dataMods, "stained", stain.length, `(${Math.round(100 * stain.length / dataMods)}% of data)`);
console.log("clean reads:", readable(new Set()), "| stained reads:", readable(new Set(stain)));
require("fs").writeFileSync(process.argv[2], JSON.stringify({ n, data: data.map(Number), res: res.map(Number), mask: q.maskPattern, order, stain }));
