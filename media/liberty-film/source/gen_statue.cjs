// Generates the Statue of Liberty figure as a sculpted mesh: a signed-distance model (robe with falling folds, the palla
// across the chest and hanging on her left, raised right arm with the sleeve bunched at the shoulder, bent left arm, hands,
// neck) polygonised with surface nets at 0.1 m, and the head (classical face, wavy hair, bun) separately at 0.035 m.
// Proportions from NPS "Statue Statistics" (heel to top of head 33.86 m, head 5.26 m, ear to ear 3.05 m, nose 1.48 m,
// mouth 0.91 m, right arm 12.8 m, arm thickness 3.66 m) and the reference photos in ref/. Local frame: y up from the heel
// (pedestal top), she faces +z, her left (tablet side) is +x.  Output: statue.bin (two meshes) — run: node gen_statue.cjs
const fs = require("fs");
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, sm = (t) => t * t * (3 - 2 * t);
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
function ell(px, py, pz, cx, cy, cz, rx, ry, rz) { const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz; const k0 = Math.sqrt(x * x + y * y + z * z), k1 = Math.sqrt(x * x / (rx * rx) + y * y / (ry * ry) + z * z / (rz * rz)); return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1; }
function rcone(px, py, pz, a, b, r1, r2) {           // iq's round cone between points a, b
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2]; const y = pax * bx + pay * by + paz * bz, z = y - l2;
  const xx = (pax * l2 - bx * y) ** 2 + (pay * l2 - by * y) ** 2 + (paz * l2 - bz * y) ** 2, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * xx;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(xx + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(xx + y2) * il2 - r1;
  return (Math.sqrt(xx * a2 * il2) + y * rr) * il2 - r1; }
const chain = (px, py, pz, P, r, k) => { let d = 1e9; for (let i = 0; i + 1 < P.length; i++) d = smin(d, rcone(px, py, pz, P[i], P[i + 1], r[i], r[i + 1]), k); return d; };
const pw = (T, y) => { if (y <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; return lerp(va, vb, sm((y - a) / (b - a))); } return T[T.length - 1][1]; };

// ---------------- body ----------------
const HW = [[0, 5.75], [1.2, 5.45], [4, 5.2], [10, 5.0], [16, 5.05], [20.5, 4.75], [23.5, 4.95], [26.4, 5.15], [27.6, 4.4]];   // half-width
const HD = [[0, 4.7], [1.2, 4.25], [4, 3.85], [10, 3.55], [16, 3.45], [20.5, 3.15], [23.5, 3.45], [26.4, 3.0], [27.6, 2.5]];    // half-depth
const ZC = [[0, 0.55], [4, 0.3], [12, 0.15], [27.6, 0.0]];                                                                        // hem pools forward
// the palla: a diagonal of rolled folds from the left shoulder across the chest to the right hip and round the back,
// each fold centred just under the robe surface (angle round the body in degrees: 0 her left, 90 front, 180 her right)
const onRobe = (deg, y, inset) => { const th = (deg * Math.PI) / 180, a = pw(HW, y), b = pw(HD, y); return [Math.cos(th) * (a - inset), y, pw(ZC, y) + Math.sin(th) * (b - inset)]; };
const PATH = [[52, 27.0], [78, 24.7], [100, 22.0], [124, 19.7], [150, 18.5], [176, 18.6], [205, 19.6], [235, 21.0]];
const band = (dy, inset) => PATH.map(([d, y]) => onRobe(d, y + dy, inset));
const PALLA = band(0, 0.32), PAL1 = band(-1.3, 0.36), PAL2 = band(1.1, 0.34), PAL3 = band(-2.5, 0.42);
const R_SH = [-4.3, 26.9, 0.3], R_EL = [-5.85, 32.2, 0.75], R_WR = [-6.6, 37.7, 1.0];
const L_SH = [4.3, 26.8, 0.2], L_EL = [5.35, 22.2, -0.55], L_WR = [5.65, 21.55, 2.35];
function robe(x, y, z) {
  const yy = clamp(y, 0, 27.6), a = pw(HW, yy), b = pw(HD, yy), zc = pw(ZC, yy);
  const kx = x / a, kz = (z - zc) / b, k0 = Math.hypot(kx, kz), k1 = Math.hypot(kx / a, kz / b) || 1e-6; let d = (k0 * (k0 - 1)) / k1;
  const th = Math.atan2(kz, kx); const amp = lerp(0.46, 0.05, sm(clamp(yy / 21)));
  // falling folds: sharp-crested ridges, irregular spacing, a little sway with height
  const g = 0.5 * (1 - 2 * Math.abs(Math.sin(0.5 * (12 * th + 0.14 * yy + 0.8 * Math.sin(0.21 * yy))))) + 0.32 * Math.sin(21 * th - 0.06 * yy + 1.7) + 0.18 * Math.sin(34 * th + 0.5);
  d -= amp * g * (1 - 0.5 * clamp((kz - 0.2) * 2) * clamp((yy - 15) / 4));                   // the palla covers the upper front
  d -= (y < 0.9 ? 0.35 * Math.sin(th * 9 + 1) * (0.9 - y) : 0);                                // hem breaking on the pedestal
  d = smax(d, y - 27.6, 1.2); d = smax(d, -y, 0.15); return d; }
function bodySDF(x, y, z) {
  if (y > 41.5 || y < -0.6) return 1;
  let d = robe(x, y, z);
  if (y > 19) { d = smin(d, rcone(x, y, z, [-4.2, 26.85, 0.2], [4.2, 26.75, 0.15], 1.65, 1.65), 1.6);          // shoulders
    d = smin(d, ell(x, y, z, 0, 24.4, 0.55, 4.5, 3.4, 3.2), 1.2);                                                 // ribcage
    d = smin(d, ell(x, y, z, -1.9, 24.1, 2.25, 1.65, 1.45, 1.25), 0.8); d = smin(d, ell(x, y, z, 1.9, 24.1, 2.25, 1.65, 1.45, 1.25), 0.8); }
  if (y > 8 && y < 18) d = smin(d, ell(x, y, z, -2.0, 12.6, 2.45, 1.9, 3.0, 1.45), 1.3);                         // right knee (foot back)
  if (y > 14 && y < 30) { d = smin(d, chain(x, y, z, PALLA, [0.8, 0.85, 0.85, 0.82, 0.72, 0.6, 0.48, 0.35], 0.6), 0.55);  // the palla's rolled edge
    d = smin(d, chain(x, y, z, PAL1, [0.62, 0.66, 0.66, 0.62, 0.5, 0.4, 0.32, 0.25], 0.5), 0.5);
    d = smin(d, chain(x, y, z, PAL2, [0.5, 0.55, 0.55, 0.5, 0.42, 0.36, 0.3, 0.25], 0.45), 0.45);
    d = smin(d, chain(x, y, z, PAL3.slice(0, 5), [0.48, 0.52, 0.5, 0.4, 0.28], 0.45), 0.5);
    const kn = onRobe(165, 18.4, 0.9); d = smin(d, ell(x, y, z, kn[0], kn[1], kn[2], 1.25, 1.9, 1.35), 0.9); }   // the folds gathered at her right hip
  if (y > 9 && y < 28 && x > 2) {                                                                                // palla hanging on her left, under the tablet
    let h = rcone(x, y, z, [5.2, 25.0, 0.6], [5.75, 11.2, 0.5], 1.75, 2.45); const th = Math.atan2(z - 0.5, x - 5.5);
    h -= 0.22 * (1 - 2 * Math.abs(Math.sin(0.5 * (9 * th + 0.1 * y)))) + 0.08 * Math.sin(17 * th);
    h = smax(h, -(y - (10.6 + 0.9 * Math.sin((z + 1) * 0.6))), 0.6); d = smin(d, h, 1.1); }
  if (y > 24) { d = smin(d, chain(x, y, z, [R_SH, R_EL, R_WR], [1.62, 1.22, 0.86], 0.4), 0.9);                   // raised right arm
    let sl = rcone(x, y, z, [-4.7, 27.6, 0.35], [-5.55, 30.6, 0.6], 1.95, 1.6); const ax = Math.atan2(z - 0.5, x + 5.1);   // sleeve slid down to the shoulder
    sl -= 0.1 * Math.sin(5 * ax + 1.6 * y) + 0.05 * Math.sin(11 * ax); d = smin(d, sl, 0.6);
    d = smin(d, ell(x, y, z, -6.68, 38.75, 1.0, 1.02, 1.45, 1.08), 0.45);                                       // fist round the torch handle
    d = smin(d, rcone(x, y, z, [-6.05, 38.4, 1.75], [-6.35, 39.4, 2.05], 0.42, 0.36), 0.25); }                  // thumb
  if (y > 18 && y < 29) { d = smin(d, chain(x, y, z, [L_SH, L_EL, L_WR], [1.52, 1.18, 0.95], 0.4), 0.8);       // left arm, bent
    d = smin(d, ell(x, y, z, 5.6, 21.25, 2.85, 0.62, 0.95, 0.78), 0.35);                                         // left palm
    for (let f = 0; f < 4; f++) { const fy = 21.85 - f * 0.42; d = smin(d, chain(x, y, z, [[5.75, fy, 3.35], [6.25, fy - 0.08, 3.6], [6.55, fy - 0.12, 3.25]], [0.2, 0.18, 0.15], 0.1), 0.12); }   // fingers round the edge
    d = smin(d, rcone(x, y, z, [5.4, 21.9, 2.6], [5.9, 22.6, 2.45], 0.24, 0.2), 0.15); }                         // thumb
  if (y > 26) d = smin(d, rcone(x, y, z, [0, 27.3, -0.05], [0, 29.9, 0.3], 1.28, 1.02), 0.8);                     // neck
  return d; }

// ---------------- head (local to C) ----------------
const C = [0, 31.2, 0.35];
function headSDF(px, py, pz) {
  const x = px - C[0], y = py - C[1], z = pz - C[2];
  const jaw = y < -0.4 ? 1 - 0.3 * clamp((-0.4 - y) / 2.0) : 1;                                 // jaw narrows to the chin
  const zf = z > 0.95 ? 0.95 + (z - 0.95) * 1.3 : z;                                            // flatter, classical face plane
  let d = ell(x / jaw, y, zf, 0, 0, 0, 1.42, 2.5, 1.66) * Math.min(1, jaw);
  d = smin(d, rcone(x, y, z, [0, 0.62, 1.42], [0, -0.5, 1.98], 0.2, 0.2), 0.3);                 // straight Greek nose from the brow
  d = smin(d, ell(x, y, z, 0, -0.62, 1.74, 0.4, 0.19, 0.27), 0.18);                              // nostrils
  for (const s of [-1, 1]) { d = smin(d, rcone(x, y, z, [s * 0.12, 0.62, 1.5], [s * 0.95, 0.52, 1.18], 0.2, 0.16), 0.28);   // brow ridge
    d = smax(d, -ell(x, y, z, s * 0.52, 0.24, 1.7, 0.42, 0.24, 0.26), 0.16);                     // eye socket
    d = smin(d, ell(x, y, z, s * 0.52, 0.21, 1.5, 0.35, 0.2, 0.3), 0.08);                        // eye under the lids
    d = smin(d, ell(x, y, z, s * 0.8, -0.25, 1.05, 0.55, 0.6, 0.5), 0.5); }                       // cheeks
  d = smin(d, ell(x, y, z, 0, -0.98, 1.3, 0.72, 0.55, 0.52), 0.35);                              // muzzle
  d = smin(d, rcone(x, y, z, [-0.43, -0.9, 1.68], [0.43, -0.9, 1.68], 0.12, 0.12), 0.12);        // upper lip (mouth 0.91 m)
  d = smin(d, rcone(x, y, z, [-0.36, -1.12, 1.62], [0.36, -1.12, 1.62], 0.14, 0.14), 0.12);      // lower lip
  d = smax(d, -rcone(x, y, z, [-0.45, -1.0, 1.85], [0.45, -1.0, 1.85], 0.035, 0.035), 0.04);     // mouth line
  d = smin(d, ell(x, y, z, 0, -1.58, 1.22, 0.56, 0.42, 0.48), 0.3);                              // chin
  // hair: parted waves over the sides and back, drawn back to a bun at the nape (under the crown)
  let h = ell(x, y, z, 0, 0.32, -0.32, 1.52, 2.34, 1.74); const wv = Math.atan2(z + 0.3, Math.abs(x) + 0.001);   // waves swept back from the temples
  h -= (0.045 * Math.sin(10 * wv + 2.2 * y) + 0.02 * Math.sin(23 * wv)) * clamp(1.2 - Math.abs(x) * 0.2);
  h = smax(h, z - (0.42 + 0.55 * clamp((y - 0.75) / 0.9)), 0.2); h = smax(h, -(y + 0.75 + 0.35 * clamp(-z)), 0.3);
  d = smin(d, h, 0.12);
  let bun = ell(x, y, z, 0, -0.62, -1.95, 1.02, 0.9, 0.78); bun -= 0.06 * Math.sin(9 * Math.atan2(y + 0.62, x) + 4 * z); d = smin(d, bun, 0.3);
  d = smin(d, rcone(x, y, z, [0, -3.7, -0.4], [0, -1.7, -0.15], 1.12, 0.98), 0.45);              // neck into the body
  return d; }

// ---------------- surface nets ----------------
function mesh(sdf, x0, x1, y0, y1, z0, z1, h) {
  const nx = Math.round((x1 - x0) / h) + 1, ny = Math.round((y1 - y0) / h) + 1, nz = Math.round((z1 - z0) / h) + 1;
  const F = new Float32Array(nx * ny * nz); const I = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[I(i, j, k)] = sdf(x0 + i * h, y0 + j * h, z0 + k * h);
  const cx = nx - 1, cy = ny - 1, cz = nz - 1, CI = new Int32Array(cx * cy * cz).fill(-1); const C3 = (i, j, k) => i + cx * (j + cy * k);
  const pos = []; const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const co = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]]; const v = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0; for (let c = 0; c < 8; c++) { v[c] = F[I(i + co[c][0], j + co[c][1], k + co[c][2])]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue; let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) { if ((v[a] < 0) === (v[b] < 0)) continue; const t = v[a] / (v[a] - v[b]); sx += co[a][0] + (co[b][0] - co[a][0]) * t; sy += co[a][1] + (co[b][1] - co[a][1]) * t; sz += co[a][2] + (co[b][2] - co[a][2]) * t; n++; }
    CI[C3(i, j, k)] = pos.length / 3; pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h); }
  const idx = []; const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 0; i < cx; i++) { const f0 = F[I(i, j, k)], f1 = F[I(i + 1, j, k)]; if ((f0 < 0) === (f1 < 0)) continue;   // x edges
    quad(CI[C3(i, j - 1, k - 1)], CI[C3(i, j, k - 1)], CI[C3(i, j, k)], CI[C3(i, j - 1, k)], f0 >= 0); }
  for (let k = 1; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 1; i < cx; i++) { const f0 = F[I(i, j, k)], f1 = F[I(i, j + 1, k)]; if ((f0 < 0) === (f1 < 0)) continue;   // y edges
    quad(CI[C3(i - 1, j, k - 1)], CI[C3(i - 1, j, k)], CI[C3(i, j, k)], CI[C3(i, j, k - 1)], f0 >= 0); }
  for (let k = 0; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) { const f0 = F[I(i, j, k)], f1 = F[I(i, j, k + 1)]; if ((f0 < 0) === (f1 < 0)) continue;   // z edges
    quad(CI[C3(i - 1, j - 1, k)], CI[C3(i, j - 1, k)], CI[C3(i, j, k)], CI[C3(i - 1, j, k)], f0 >= 0); }
  const nor = new Float32Array(pos.length); const e = h * 0.5;
  for (let q = 0; q < pos.length; q += 3) { const x = pos[q], y = pos[q + 1], z = pos[q + 2];
    const gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1;
    nor[q] = gx / l; nor[q + 1] = gy / l; nor[q + 2] = gz / l; }
  return { pos: new Float32Array(pos), nor, idx: new Uint32Array(idx) }; }

const t0 = Date.now();
const body = mesh(bodySDF, -9.2, 9.6, -0.5, 41.2, -6.2, 6.6, 0.1);
console.log("body", body.pos.length / 3, "verts", body.idx.length / 3, "tris", ((Date.now() - t0) / 1000).toFixed(1) + " s");
const head = mesh(headSDF, C[0] - 2.2, C[0] + 2.2, C[1] - 3.3, C[1] + 2.95, C[2] - 3.1, C[2] + 2.55, 0.035);
console.log("head", head.pos.length / 3, "verts", head.idx.length / 3, "tris", ((Date.now() - t0) / 1000).toFixed(1) + " s");
// statue.bin: header (uint32 counts) then pos, nor, idx for body and head
const parts = [body, head], hdr = new Uint32Array(parts.flatMap((m) => [m.pos.length, m.idx.length]));
const bufs = [Buffer.from(hdr.buffer)]; for (const m of parts) bufs.push(Buffer.from(m.pos.buffer), Buffer.from(m.nor.buffer), Buffer.from(m.idx.buffer));
fs.writeFileSync("statue.bin", Buffer.concat(bufs)); console.log("statue.bin", (Buffer.concat(bufs).length / 1e6).toFixed(1), "MB");
