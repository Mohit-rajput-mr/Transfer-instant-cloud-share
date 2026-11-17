// "Your fridge doesn't make cold" — a 3D cutaway film in the tyre-film v2 style (owner 2026-11-17 quality bar).
// Facts: a fridge is a heat pump. Insulated walls (steel / foam / plastic) slow heat leaking in. One sealed loop:
// compressor → condenser (zigzag on the back) → capillary tube (very thin) → evaporator (cold plate inside) → back.
// Refrigerant (often isobutane, R600a, boils at about −12 °C at normal pressure) boils in the evaporator at low pressure,
// taking heat from the food; the compressor squeezes the vapour (squeezed gas gets hot, like a bike pump); the hot vapour
// gives its heat to the room in the condenser and turns liquid (the back is warm); the thin pipe drops the pressure (like a
// spray can gets icy) → cold liquid back to the plate. Thermostat: ~4 °C fridge, −18 °C freezer; compressor on = hum.
// An open door warms the kitchen (the heat removed + the motor's heat go out the back). The door sticks right after closing:
// warm air that got in cools and shrinks → lower pressure; magnetic seal.
import { THREE, K } from "./kit/engine.js";
const { V, clamp, ease, out, back, lerp, lerpV, rnd, sh, flat, makePhone, screen, addWorld, world, look, lookV, orbit, project,
  at, fr, prog, tag, tags, big, counter, flash, timer, frame, ready, scene } = K;
const TAU = Math.PI * 2, D = Math.PI / 180;
const glow = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, toneMapped: false });
const win = (t, a, b, f = 0.3) => clamp((t - a) / f) * clamp((b - t) / f);

// ---------- studio reflections for metal ----------
const ENV = (() => {
  const pm = new THREE.PMREMGenerator(K.r), s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x6d737c, side: THREE.BackSide })));
  const panel = (x, y, z, w, h, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c, c, c), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  panel(0, 12, 0, 16, 10, 4); panel(-12, 3, 4, 6, 12, 2.2); panel(12, 2, -3, 5, 10, 1.6); panel(0, -2, 13, 20, 3, 1.2);
  return pm.fromScene(s, 0.03).texture;
})();
const M = {
  steel: new THREE.MeshStandardMaterial({ color: 0xeef1f4, metalness: 0.35, roughness: 0.32, envMap: ENV }),
  foam: new THREE.MeshStandardMaterial({ color: 0xf2cf5b, roughness: 0.95 }),
  liner: new THREE.MeshStandardMaterial({ color: 0xfafbfd, roughness: 0.5 }),
  gasket: new THREE.MeshStandardMaterial({ color: 0x5b6068, roughness: 0.8, emissive: 0x3dff8c, emissiveIntensity: 0 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
  cu: new THREE.MeshStandardMaterial({ color: 0xc87a45, metalness: 0.85, roughness: 0.3, envMap: ENV, transparent: true, opacity: 1, emissive: 0x000000 }),
  cond: new THREE.MeshStandardMaterial({ color: 0x2b2e35, metalness: 0.6, roughness: 0.45, envMap: ENV, transparent: true, opacity: 1, emissive: 0xff5a1a, emissiveIntensity: 0 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xc9d3dc, metalness: 0.85, roughness: 0.3, envMap: ENV, transparent: true, opacity: 1, emissive: 0x4fb4ff, emissiveIntensity: 0 }),
  comp: new THREE.MeshStandardMaterial({ color: 0x1d2026, metalness: 0.5, roughness: 0.45, envMap: ENV, emissive: 0xff5a1a, emissiveIntensity: 0 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6 }),
  winding: new THREE.MeshStandardMaterial({ color: 0xd07a32, metalness: 0.8, roughness: 0.35, envMap: ENV }),
  shell: new THREE.MeshStandardMaterial({ color: 0x23262d, metalness: 0.5, roughness: 0.4, envMap: ENV, side: THREE.DoubleSide }),
  shellCut: new THREE.MeshStandardMaterial({ color: 0x8d949e, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }),
  bright: new THREE.MeshStandardMaterial({ color: 0xd6dbe2, metalness: 0.9, roughness: 0.25, envMap: ENV }),
};
const pipeMats = [M.cu, M.cond, M.alu];
const hi = (mat, col, kk) => { mat.emissive.setHex(col); mat.emissiveIntensity = kk; };

// ---------- callouts (dot on the part, a line, a label) ----------
document.body.insertAdjacentHTML("beforeend", `<svg class="ov" id="coL" width="1080" height="1920" style="left:0;top:0;z-index:30"></svg>` +
  [...Array(6)].map((_, i) => `<div class="ov" id="co${i}" style="z-index:31;padding:14px 24px;border-radius:14px;background:rgba(255,255,255,.96);color:#111;font:800 40px/1 D;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transform:translate(-50%,-50%)"></div>`).join(""));
let COS = [];
const callout = (t, a, b, v3, lx, ly, text, col = "#ff9a2a") => { const k = win(t, a, b); if (k > 0) COS.push({ k, v3: v3.clone(), lx, ly, text, col, a, t }); };
function drawCallouts() {
  scene.updateMatrixWorld(true);
  let svg = "";
  COS.slice(0, 6).forEach((c, i) => { const [x, y] = project(c.v3), el = document.getElementById("co" + i), grow = out(clamp((c.t - c.a) / 0.45));
    el.innerHTML = `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${c.col};margin-right:14px;vertical-align:-2px"></span>${c.text}`;
    Object.assign(el.style, { left: c.lx + "px", top: c.ly + "px", opacity: c.k });
    const ex = lerp(c.lx, x, grow), ey = lerp(c.ly, y, grow);
    svg += `<line x1="${c.lx}" y1="${c.ly}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-width="6" opacity="${c.k}"/><line x1="${c.lx}" y1="${c.ly}" x2="${ex}" y2="${ey}" stroke="${c.col}" stroke-width="3" opacity="${c.k}"/>` +
      (grow > 0.95 ? `<circle cx="${x}" cy="${y}" r="13" fill="${c.col}" stroke="#fff" stroke-width="5" opacity="${c.k}"/>` : ""); });
  for (let i = COS.length; i < 6; i++) document.getElementById("co" + i).style.opacity = 0;
  document.getElementById("coL").innerHTML = svg; COS = [];
}

// ---------- worlds ----------
const studio = (name, bg) => { const w = addWorld(name, { bg, hemi: 0.95, sun: 2.3, sky: 0xffffff });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(bg).multiplyScalar(0.92), roughness: 0.95 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; w.add(fl);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.9); fill.position.set(-6, 4, 6); w.add(fill);
  const rimL = new THREE.DirectionalLight(0xfff0e0, 1.1); rimL.position.set(-4, 6, -9); w.add(rimL); return w; };
const SF = studio("F", 0xe4e8ee);

// ---------- the fridge: every wall is a sandwich (steel / foam / plastic) ----------
const FR = new THREE.Group(); SF.add(FR);
const box = (parent, mat, x0, x1, y0, y1, z0, z1) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); parent.add(m); return m; };
// wall from a to b along axis ("x"|"y"|"z"), outer side at a (steel), inner at b (plastic); r = the other two ranges
function wall(parent, axis, a, b, r1, r2, outer = M.steel) {
  const g = new THREE.Group(); parent.add(g); const s = Math.sign(b - a), L = [[a, a + s * 0.03, outer], [a + s * 0.03, b - s * 0.03, M.foam], [b - s * 0.03, b, M.liner]];
  for (const [p, q, m] of L) { const lo = Math.min(p, q), hiV = Math.max(p, q);
    if (axis === "x") box(g, m, lo, hiV, r1[0], r1[1], r2[0], r2[1]); else if (axis === "y") box(g, m, r1[0], r1[1], lo, hiV, r2[0], r2[1]); else box(g, m, r1[0], r1[1], r2[0], r2[1], lo, hiV); }
  return g; }
const X0 = -1.5, X1 = 1.5, Y0 = 0.6, Y1 = 7.2, Z0 = -1.3, Z1 = 1.3, T = 0.36;
wall(FR, "x", X0, X0 + T, [Y0, Y1], [Z0, Z1]);
const RW = wall(FR, "x", X1, X1 - T, [Y0, Y1], [Z0, Z1]);   // the right wall: it lifts away for the cutaway
wall(FR, "z", Z0, Z0 + T, [X0, X1], [Y0, Y1]);
wall(FR, "y", Y1, Y1 - T, [X0, X1], [Z0, Z1]);
wall(FR, "y", Y0, Y0 + T, [X0, X1], [Z0, Z1]);
const DIV = new THREE.Group(); FR.add(DIV); box(DIV, M.liner, X0 + T, X1 - T, 4.9, 4.93, Z0 + T, Z1); box(DIV, M.foam, X0 + T, X1 - T, 4.93, 5.23, Z0 + T, Z1); box(DIV, M.liner, X0 + T, X1 - T, 5.23, 5.26, Z0 + T, Z1);
// machine corner + kick plate + feet
box(FR, M.dark, X0 + 0.05, X1 - 0.05, 0.0, 0.08, Z1 - 0.25, Z1 - 0.05); for (const [x, z] of [[-1.3, 1.1], [1.3, 1.1], [-1.3, -1.1], [1.3, -1.1]]) box(FR, M.dark, x - 0.08, x + 0.08, 0, Y0, z - 0.08, z + 0.08);
// doors (hinged on the left, front edge): freezer + fridge, with a magnetic gasket and a handle
function makeDoor(y0, y1) { const P = new THREE.Group(); P.position.set(X0, 0, Z1); FR.add(P);
  const g = wall(P, "z", 0.36, 0, [0, X1 - X0], [y0, y1]);
  const gs = new THREE.Group(); P.add(gs); const w = 0.07, ins = 0.08;
  box(gs, M.gasket, ins, X1 - X0 - ins, y0 + ins, y0 + ins + w, -0.05, 0.0); box(gs, M.gasket, ins, X1 - X0 - ins, y1 - ins - w, y1 - ins, -0.05, 0.0);
  box(gs, M.gasket, ins, ins + w, y0 + ins, y1 - ins, -0.05, 0.0); box(gs, M.gasket, X1 - X0 - ins - w, X1 - X0 - ins, y0 + ins, y1 - ins, -0.05, 0.0);
  const hd = box(P, M.bright, 2.72, 2.8, y0 + 0.3, Math.min(y1 - 0.3, y0 + 1.6), 0.46, 0.54); box(P, M.bright, 2.72, 2.8, y0 + 0.3, y0 + 0.38, 0.36, 0.5); box(P, M.bright, 2.72, 2.8, Math.min(y1 - 0.3, y0 + 1.6) - 0.08, Math.min(y1 - 0.3, y0 + 1.6), 0.36, 0.5);
  return P; }
const doorF = makeDoor(Y0, 4.92), doorZ = makeDoor(4.98, Y1);
// inside: glass shelves, food, the lamp, the thermostat dial
for (const y of [2.25, 3.55]) box(FR, M.glass, X0 + T, X1 - T, y, y + 0.04, Z0 + T, Z1 - 0.05);
const food = [];
{ const milk = new THREE.Group(); FR.add(milk); box(milk, flat(0xffffff), -0.25, 0.25, 0, 1.0, -0.22, 0.22); const roof = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.33, 0.3, 4, 1), flat(0x3d7bff))); roof.rotation.y = Math.PI / 4; roof.position.y = 1.15; milk.add(roof); box(milk, flat(0x3d7bff), -0.26, 0.26, 0.45, 0.65, -0.23, 0.23); milk.position.set(-0.6, 0.96, -0.2); food.push(milk);
  for (const [x, z] of [[0.15, 0.2], [0.45, -0.1], [0.65, 0.3]]) { const ap = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), flat(0xe33b3b))); ap.position.set(x, 2.29 + 0.19, z); FR.add(ap); food.push(ap); }
  const bot = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 12), new THREE.MeshStandardMaterial({ color: 0x2fae5a, roughness: 0.2, transparent: true, opacity: 0.8 }))); bot.position.set(-0.7, 3.59 + 0.45, 0.1); FR.add(bot); food.push(bot);
  const ch = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 3), flat(0xffc934))); ch.position.set(0.4, 3.59 + 0.15, -0.2); FR.add(ch); food.push(ch);
  const bowl = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.3, 14), flat(0xff8f5a))); bowl.position.set(0.5, 0.96 + 0.15, 0.3); FR.add(bowl); food.push(bowl);
  for (let i = 0; i < 3; i++) { const ice = sh(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.7), flat(0xdff3ff))); ice.position.set(-0.6 + i * 0.6, 5.26 + 0.09 + (i % 2) * 0.18, 0.3); FR.add(ice); } }
const lamp = new THREE.PointLight(0xfff1d6, 0, 7); lamp.position.set(0, 4.6, 0.4); FR.add(lamp);
const dial = new THREE.Group(); FR.add(dial); { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 20), flat(0xffffff))); b.rotation.x = Math.PI / 2; dial.add(b); const n = sh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), flat(0x3d7bff))); n.position.z = 0.07; dial.add(n); dial.userData.n = n; } dial.position.set(0.9, 4.55, Z0 + T + 0.05);

// ---------- the sealed loop: one path, built from segments ----------
const ZC = -1.5, ZS = -1.38, ZE = -0.86;
const SEG = [];
const addSeg = (tag, pts, r, mat, curve = "centripetal") => { const c = new THREE.CatmullRomCurve3(pts, false, curve); SEG.push({ tag, c, r, mat }); };
addSeg("dis", [V(0.92, 0.72, -1.62), V(1.05, 0.98, -1.6), V(1.25, 1.1, ZC), V(1.25, 6.6, ZC)], 0.045, M.cu);
{ const pts = []; const rows = 11; for (let i = 0; i < rows; i++) { const y = 6.6 - i * 0.52, xa = i % 2 ? -1.25 : 1.25, xb = -xa; pts.push(V(xa, y, ZC), V(xa * 0.4, y, ZC), V(xb * 0.4, y, ZC), V(xb, y, ZC)); if (i < rows - 1) pts.push(V(xb * 1.06, y - 0.26, ZC)); } addSeg("cond", pts, 0.05, M.cond); }
{ const pts = [V(-1.25, 1.4, ZC), V(-1.33, 1.2, -1.45)]; for (let i = 0; i <= 120; i++) { const a = i / 120 * 16 * TAU; pts.push(V(-0.95 + 0.11 * Math.cos(a), lerp(1.35, 5.0, i / 120), -1.43 + 0.11 * Math.sin(a))); } pts.push(V(-0.95, 5.5, -1.42), V(-1.0, 6.62, -1.2), V(-1.0, 6.62, ZE)); addSeg("cap", pts, 0.017, M.cu); }
{ const pts = []; const ys = [6.62, 6.32, 6.02, 5.72, 5.45]; ys.forEach((y, i) => { const xa = i % 2 ? 1.0 : -1.0; pts.push(V(xa, y, ZE), V(-xa * 0.5, y, ZE), V(-xa, y, ZE)); if (i < ys.length - 1) pts.push(V(-xa * 1.08, y - 0.15, ZE)); }); addSeg("evap", pts, 0.04, M.alu); }
addSeg("suc", [V(1.0, 5.45, ZE), V(1.08, 5.4, -1.0), V(1.0, 5.3, ZS), V(0.95, 3.2, ZS), V(0.9, 1.2, ZS), V(0.62, 0.95, -1.5), V(0.58, 0.72, -1.62)], 0.05, M.cu);
addSeg("comp", [V(0.58, 0.72, -1.62), V(0.75, 0.55, -1.62), V(0.92, 0.72, -1.62)], 0.01, M.cu);
for (const s of SEG) if (s.tag !== "comp") { const m = sh(new THREE.Mesh(new THREE.TubeGeometry(s.c, s.tag === "cap" ? 900 : s.tag === "cond" ? 500 : 160, s.r, 10), s.mat)); s.mesh = m; FR.add(m); }
// condenser wire fins, evaporator plate, compressor
for (let i = 0; i < 23; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 5.6, 5), M.cond); m.position.set(-1.32 + i * 0.12, 3.95, ZC - 0.06); FR.add(m); }
const plate = box(FR, M.alu, -1.12, 1.12, 5.33, 6.76, ZE - 0.05, ZE - 0.03);
const COMP = new THREE.Group(); FR.add(COMP); COMP.position.set(0.75, 0.0, -1.62);
{ const body = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.22, 6, 18), M.comp)); body.position.y = 0.46; body.scale.set(1, 1, 0.85); COMP.add(body); box(COMP, M.dark, -0.42, 0.42, 0.0, 0.08, -0.3, 0.3); }
// one long list of points along the loop: position, segment, and a "time" coordinate (liquid moves slower = denser)
const PL = []; { const speed = { dis: 1.6, cond: 1.0, cap: 0.55, evap: 0.8, suc: 1.7, comp: 2.5 };
  let ct = 0, prev = null; for (const s of SEG) { const n = Math.max(20, Math.round(s.c.getLength() * 30)), pts = s.c.getSpacedPoints(n);
    pts.forEach((p, i) => { if (prev) ct += p.distanceTo(prev) / speed[s.tag] * (s.tag === "cond" ? lerp(1, 2.2, i / n) : 1); PL.push({ p, tag: s.tag, f: i / n, ct }); prev = p; }); } }
const CTOT = PL[PL.length - 1].ct;
const SEGRANGE = {}; PL.forEach((q, i) => { const r = SEGRANGE[q.tag] ??= [i, i]; r[1] = i; });
function atCT(c) { c = ((c % CTOT) + CTOT) % CTOT; let lo = 0, hi2 = PL.length - 1; while (hi2 - lo > 1) { const m = (lo + hi2) >> 1; if (PL[m].ct < c) lo = m; else hi2 = m; } const a = PL[lo], b = PL[hi2], u = (c - a.ct) / Math.max(1e-6, b.ct - a.ct); return { p: a.p.clone().lerp(b.p, u), q: a }; }
const CHOT = new THREE.Color(0xff3b2f), CWARM = new THREE.Color(0xffa23a), CCOLD = new THREE.Color(0x3d9bff), CVAP = new THREE.Color(0xbfe9ff);
function stateOf(q) { // color, liquid 0..1
  const c = new THREE.Color();
  if (q.tag === "dis" || q.tag === "comp") return [c.copy(CHOT), 0];
  if (q.tag === "cond") return [c.copy(CHOT).lerp(CWARM, clamp(q.f / 0.7)), clamp((q.f - 0.3) / 0.5)];
  if (q.tag === "cap") return [c.copy(CWARM).lerp(CCOLD, clamp(q.f / 0.6)), 1];
  if (q.tag === "evap") return [c.copy(CCOLD).lerp(CVAP, clamp(q.f)), 1 - clamp(q.f / 0.9)];
  return [c.copy(CVAP), 0];
}
// refrigerant particles
const RN = 520, refMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), RN);
refMesh.frustumCulled = false; FR.add(refMesh); K.reseed(9);
const RP = [...Array(RN)].map((_, i) => ({ c0: (i / RN) * CTOT, j: V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), ph: rnd() }));
const _M = new THREE.Matrix4(), _Z = new THREE.Matrix4().makeScale(0, 0, 0), _C = new THREE.Color();
/** show the refrigerant; vis(q) → 0..1 per point (which part of the loop is shown); flow = how far it has moved */
function poseRef(t, flow, vis = () => 1, scale = 1) {
  for (let i = 0; i < RN; i++) { const p = RP[i], { p: pos, q } = atCT(p.c0 + flow), v = vis(q);
    if (v <= 0.01 || q.tag === "comp") { refMesh.setMatrixAt(i, _Z); continue; }
    const [col, liq] = stateOf(q), r = q.tag === "cap" ? 0.008 : lerp(0.032, 0.014, liq), boil = q.tag === "evap" ? (1 - liq) * 0.6 : 0;
    const jit = p.j.clone().multiplyScalar(r * (0.6 + 0.4 * Math.sin(t * 9 + p.ph * 20)));
    const s = scale * v * lerp(0.75, 1.05, liq) * (q.tag === "cap" ? 0.55 : 1) * (1 + boil * Math.abs(Math.sin(t * 7 + p.ph * 30)));
    _M.makeScale(s, s, s).setPosition(pos.add(jit)); refMesh.setMatrixAt(i, _M); refMesh.setColorAt(i, col); }
  refMesh.instanceMatrix.needsUpdate = true; if (refMesh.instanceColor) refMesh.instanceColor.needsUpdate = true; }
const hideRef = () => { for (let i = 0; i < RN; i++) refMesh.setMatrixAt(i, _Z); refMesh.instanceMatrix.needsUpdate = true; };
hideRef(); refMesh.setColorAt(0, _C.set(0xffffff));
// heat: little orange glows
const HN = 260, heat = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), glow(0xff8a2a), HN); heat.frustumCulled = false; SF.add(heat);
const HP = [...Array(HN)].map(() => ({ a: rnd(), b: rnd(), c: rnd(), ph: rnd() }));
function poseHeat(n, place) { for (let i = 0; i < HN; i++) { const v = i < n ? place(HP[i], i) : null; if (!v) { heat.setMatrixAt(i, _Z); continue; } const s = v.s ?? 1; _M.makeScale(s, s, s).setPosition(v.x, v.y, v.z); heat.setMatrixAt(i, _M); } heat.instanceMatrix.needsUpdate = true; }
// a tracer that runs round the loop
const tracer = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), glow(0xffffff)); SF.add(tracer);
// hum rings around the compressor
const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 40), glow(0x3dff8c, 0.8)); SF.add(m); return m; });
// pressure arrows (door seal)
function makeArrows(parent, n, col = 0xffd24a) { return [...Array(n)].map(() => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 10), glow(col)); c.position.y = 0.2; const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), glow(col)); g.add(c, s); parent.add(g); g.visible = false; return g; }); }
const arrF = makeArrows(SF, 8);
const arrow = (g, from, dir, k) => { g.visible = k > 0.02; g.position.copy(from); g.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()); g.scale.setScalar(0.6 + 0.6 * k); };
// a sweeping laser for the cut
const sweep = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 12), glow(0xff5a3a)); SF.add(sweep);
// air inside the fridge (door seal: warm air cools and shrinks)
const AN = 160, airIn = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), AN); airIn.frustumCulled = false; SF.add(airIn);
const AP = [...Array(AN)].map(() => ({ x: rnd(), y: rnd(), z: rnd(), ph: rnd() }));

// ---------- world C: the compressor, cut open and blown up ----------
const SC = studio("C", 0xe9e3d8);
const CC = new THREE.Group(); SC.add(CC); CC.position.y = 0.0;
{ const P = (r, y) => new THREE.Vector2(r, y);
  const prof = (r0, h) => [P(0.001, 0), ...[...Array(10)].map((_, i) => { const a = (i / 9) * Math.PI / 2; return P(r0 * Math.sin(a) + 0.001, 0.9 - 0.9 * Math.cos(a)); }), P(r0, h - 1.1), ...[...Array(12)].map((_, i) => { const a = (i / 11) * Math.PI / 2; return P(r0 * Math.cos(a) + 0.001, h - 1.1 + 1.1 * Math.sin(a)); })];
  const o = prof(1.75, 4.2), inn = prof(1.65, 4.1).map((p) => P(p.x, p.y + 0.05)).reverse(), band = [...o, ...inn];
  const ph0 = -60 * D, len = 240 * D;
  const shell = sh(new THREE.Mesh(new THREE.LatheGeometry(band, 64, ph0 + 120 * D, len), M.shell)); CC.add(shell);
  for (const ph of [ph0 + 120 * D, ph0 + 120 * D + len]) { const f = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(band), 24), M.shellCut); f.rotation.y = ph - Math.PI / 2; CC.add(f); }
  // motor: stator + copper windings + shaft
  const st = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.2, 32), M.bright)); st.position.y = 1.2; CC.add(st);
  for (const y of [0.55, 1.85]) { const w = sh(new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.2, 10, 36), M.winding)); w.rotation.x = Math.PI / 2; w.position.y = y; CC.add(w); }
  const shaft = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 16), M.bright)); shaft.position.y = 1.7; CC.add(shaft);
  // cylinder block (glass, so the gas shows) + head
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.5, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.28, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  cyl.rotation.z = Math.PI / 2; cyl.position.set(0.85, 3.05, 0.3); CC.add(cyl);
  const head = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 28), M.bright)); head.rotation.z = Math.PI / 2; head.position.set(1.67, 3.05, 0.3); CC.add(head);
  for (const dy of [-0.18, 0.18]) { const tb = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 12), M.cu)); tb.position.set(2.2, 3.05 + dy + (dy > 0 ? 0.6 : -0.6), 0.3); CC.add(tb); }
}
const piston = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.4, 24), M.bright)); piston.rotation.z = Math.PI / 2; CC.add(piston);
const crank = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 20), M.dark)); crank.position.set(0, 3.05, 0.3); crank.rotation.x = Math.PI / 2; CC.add(crank);
const rod = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 10), M.bright)); CC.add(rod);
const GN = 90, gas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), GN); gas.frustumCulled = false; CC.add(gas);
const GP = [...Array(GN)].map(() => ({ x: rnd(), r: Math.sqrt(rnd()) * 0.34, a: rnd() * TAU, ph: rnd() }));

// ---------- world S: sweat on skin ----------
const SS = studio("S", 0xf0e2d6);
const skin = new THREE.Group(); SS.add(skin);
{ const g = new THREE.BoxGeometry(7, 1.2, 4.5, 28, 1, 18), p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 1.3) * 0.06 + Math.cos(p.getZ(i) * 1.7) * 0.05); g.computeVertexNormals();
  const m = sh(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xe8a987, roughness: 0.7 }))); m.position.y = 0.6; skin.add(m);
  const layer = box(skin, new THREE.MeshStandardMaterial({ color: 0xc9765a, roughness: 0.8 }), -3.5, 3.5, -0.4, 0.0, -2.25, 2.25); }
const drops = [...Array(9)].map((_, i) => { const m = sh(new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75 }))); m.position.set(-2.4 + (i % 3) * 2.2 + (i > 2 ? 0.5 : 0), 1.22, -1.4 + Math.floor(i / 3) * 1.4); m.scale.set(1, 0.8, 1); SS.add(m); return m; });
const vap = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0xd8f1ff), 180); vap.frustumCulled = false; SS.add(vap);
const vapH = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0xff8a2a), 90); vapH.frustumCulled = false; SS.add(vapH);
const VP = [...Array(180)].map(() => ({ d: Math.floor(rnd() * 9), ph: rnd(), a: rnd() * TAU, r: rnd() }));

// ---------- world K: a spray can ----------
const SK = studio("K", 0xdfe8ef);
const can = new THREE.Group(); SK.add(can);
{ const body = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.0, 36), new THREE.MeshStandardMaterial({ color: 0xe2533f, metalness: 0.4, roughness: 0.35, envMap: ENV }))); body.position.y = 1.5; can.add(body);
  const top = sh(new THREE.Mesh(new THREE.SphereGeometry(0.8, 36, 12, 0, TAU, 0, Math.PI / 2), M.bright)); top.position.y = 3.0; top.scale.y = 0.5; can.add(top);
  const cap = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.4, 16), flat(0xffffff))); cap.position.y = 3.55; can.add(cap);
  const nz = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), M.dark)); nz.rotation.z = Math.PI / 2; nz.position.set(0.25, 3.62, 0); can.add(nz);
  const band = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.81, 0.81, 0.9, 36), flat(0xffffff))); band.position.y = 1.6; can.add(band); }
can.position.set(-0.8, 0, 0); // mist goes +x
const mist = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), glow(0xeaf6ff, 0.8), 200); mist.frustumCulled = false; SK.add(mist);
const frost = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 0), glow(0xffffff), 260); frost.frustumCulled = false; SK.add(frost);
const FP = [...Array(260)].map(() => ({ a: rnd() * TAU, y: 0.2 + rnd() * 2.7, k: rnd() }));
const MP = [...Array(200)].map(() => ({ ph: rnd(), a: rnd() * TAU, r: rnd() }));

// ---------- world: Orbi ----------
const orb = addWorld("orbi", { bg: 0x07090f, fog: [10, 30], hemi: 0.8, sun: 1.4, sky: 0x9fb8ff });
orb.add(new THREE.GridHelper(40, 40, 0x173a2a, 0x10241a));
const PH = { phone: makePhone() }; PH.phone.g.scale.setScalar(22); PH.phone.g.position.set(0, 2.2, 0); orb.add(PH.phone.g);
const PH2 = { phone: makePhone() }; PH2.phone.g.scale.setScalar(14); PH2.phone.g.position.set(2.6, 1.6, -2.5); PH2.phone.g.rotation.y = -0.5; orb.add(PH2.phone.g);
const beam = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0x3dff8c)); orb.add(beam);
K.reseed(3); const EN = 220, emberGeo = new THREE.BufferGeometry(), emberPos = new Float32Array(EN * 3), emberDir = [...Array(EN)].map(() => [(rnd() - 0.5) * 3.4, rnd() * 3 + 0.5, (rnd() - 0.5) * 2.4]);
emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffa04a, size: 0.09, transparent: true, opacity: 0, toneMapped: false })); orb.add(embers);
tags({ tR: "Locked <b>on your phone</b>", tS: "No login · <b>no app</b>", tT: "Other phone · <b>about a second</b>" });

// handy points
const IN = V(0, 2.8, 0), FREEZ = V(0, 6.0, -0.4), BACKC = V(0, 3.9, ZC), COMPP = V(0.75, 0.46, -1.62);
const segPt = (tag, f) => { const r = SEGRANGE[tag]; return PL[Math.round(lerp(r[0], r[1], f))].p.clone(); };

// ---------- the film ----------
frame("Try it on two phones", async (t) => {
  const k = (a, b) => prog(t, a, b), A = (key) => at(key), F = fr;
  hideRef(); poseHeat(0); tracer.visible = sweep.visible = false; rings.forEach((r) => (r.visible = false)); arrF.forEach((g) => (g.visible = false));
  for (let i = 0; i < AN; i++) airIn.setMatrixAt(i, _Z); airIn.instanceMatrix.needsUpdate = true;
  for (const m of pipeMats) { m.opacity = 1; m.depthWrite = true; }
  M.cu.emissive.setHex(0); M.cond.emissiveIntensity = 0; M.alu.emissiveIntensity = 0; M.comp.emissiveIntensity = 0; M.gasket.emissiveIntensity = 0; M.foam.emissive?.setHex(0);
  lamp.intensity = 0;

  // the right wall lifts away during "cut" and stays off
  const off = ease(k(F("cut", 0.02), F("cut", 0.2)));
  RW.position.set(off * 2.5, off * 9, 0); RW.visible = off < 0.999;
  lamp.intensity = off * 5;
  // xray pipes from "fluid" on (the refrigerant shows)
  const xray = t >= A("fluid") && t < A("orbi") ? ease(k(A("fluid"), F("fluid", 0.15))) : 0;
  for (const m of pipeMats) { m.opacity = 1 - 0.62 * xray; m.depthWrite = xray < 0.1; }
  // compressor running? (on from "stuck" through "thermo" 0.7, and "door")
  const flowSpeed = 0.55;
  const flow = t * flowSpeed;
  // doors
  const openK = t >= A("door") && t < A("seal") ? ease(k(F("door", 0.08), F("door", 0.25))) * (1 - ease(k(F("door", 0.88), A("seal")))) : 0;
  doorF.rotation.y = -openK * 105 * D; doorZ.rotation.y = 0;
  dial.userData.n.rotation.z = t > A("thermo") ? Math.sin(t * 0.8) * 0.4 : 0;

  // ===== the hook: heat flows out of the box, into the room =====
  if (t < A("cut")) {
    poseHeat(140, (p, i) => { const q = (t * 0.22 + p.a) % 1; if (q < 0.35) return null; const qq = (q - 0.35) / 0.65; const from = V(lerp(-1.2, 1.2, p.b), lerp(1.3, 6.6, p.c), ZC - 0.1); return from.add(V(Math.sin(t * 2 + p.ph * 9) * 0.15, qq * 2.2, -qq * 1.6)); });
  }

  // ===== cut: heat crawls in through the foam =====
  if (t >= A("cut") && t < A("loop")) {
    poseHeat(40, (p) => { const q = (t * 0.1 + p.a) % 1, x = lerp(1.75, 1.14, ease(Math.min(1, q * 1.4))) - (q > 0.7 ? (q - 0.7) * 0.1 : 0); return F("cut", 0.5) < t ? V(x, lerp(1.4, 6.6, p.b), lerp(-1.0, 0.9, p.c)) : null; });
  }
  // ===== loop: a tracer runs round once, parts light up =====
  if (t >= A("loop") && t < A("fluid")) { const q = k(F("loop", 0.02), F("loop", 0.25)); if (q > 0 && q < 1) { tracer.visible = true; tracer.position.copy(atCT(q * CTOT).p); }
    const qq = (t - A("loop")) / (A("fluid") - A("loop"));
    if (qq > 0.28 && qq < 0.48) hi(M.comp, 0x3dff8c, 0.4 + 0.3 * Math.sin(t * 8));
    if (qq > 0.45 && qq < 0.66) hi(M.cond, 0xffd24a, 0.35 + 0.25 * Math.sin(t * 8));
    if (qq > 0.62 && qq < 0.8) hi(M.cu, 0x3dff8c, 0.35 + 0.25 * Math.sin(t * 8));
    if (qq > 0.78) hi(M.alu, 0x4fb4ff, 0.5 + 0.3 * Math.sin(t * 8)); }
  // refrigerant visible from "fluid"
  const refOn = t >= A("fluid") && t < A("orbi") && !(t >= A("boil") && t < A("evap")) && !(t >= A("comp") && t < A("hot"));
  if (refOn) poseRef(t, flow, () => clamp((t - A("fluid")) / 0.6));
  // evap: heat from the food into the plate
  if (t >= A("evap") && t < A("stuck")) { const kk = ease(k(F("evap", 0.15), F("evap", 0.35)));
    poseHeat(Math.round(160 * kk), (p, i) => { const f = food[i % food.length].getWorldPosition(V()); const q = (t * 0.3 + p.a) % 1, to = V(lerp(-1, 1, p.b), lerp(5.45, 6.6, p.c), ZE + 0.05); return f.clone().add(V((p.b - 0.5) * 0.4, 0.3, (p.c - 0.5) * 0.4)).lerp(to, ease(q)).add(V(0, Math.sin(q * Math.PI) * 0.5, 0)); });
    hi(M.alu, 0x4fb4ff, 0.3 + 0.2 * Math.sin(t * 6)); }
  // stuck: heat rides with the vapour down the suction line
  if (t >= A("stuck") && t < A("comp")) poseHeat(70, (p) => { const r = SEGRANGE.suc, idx = Math.round(lerp(r[0], r[1], (p.a + t * 0.25) % 1)); const v = PL[idx].p.clone(); return v.add(V(Math.sin(p.ph * 30) * 0.06, 0, Math.cos(p.ph * 30) * 0.06 + 0.02)); });
  // hot + cond: the discharge line glows; heat leaves the condenser into the room
  if (t >= A("hot") && t < A("cap")) { const kk = t < A("cond") ? ease(k(A("hot"), F("hot", 0.4))) : 1; hi(M.cu, 0xff3b2f, 0.0); M.cond.emissiveIntensity = 0.25 * kk + 0.08 * Math.sin(t * 6);
    const n = t < A("cond") ? 40 : 200;
    poseHeat(n, (p) => { const q = (t * 0.28 + p.a) % 1; const from = t < A("cond") ? segPt("dis", 0.4 + 0.6 * p.b) : segPt("cond", p.b * 0.85); from.add(V(Math.sin(t * 2 + p.ph * 9) * 0.12, q * 2.2, -q * 0.7)); from.s = 0.6; return from; }); }
  // again + sum: heat in at the plate, out at the back, continuously
  const bothWays = (n) => poseHeat(n, (p, i) => { const q = (t * 0.25 + p.a) % 1;
    if (i % 2) { const f = food[i % food.length].getWorldPosition(V()); return f.clone().lerp(V(lerp(-1, 1, p.b), lerp(5.45, 6.6, p.c), ZE + 0.05), ease(q)); }
    const from = segPt("cond", p.b * 0.85); return from.add(V(Math.sin(t * 2 + p.ph * 9) * 0.12, q * 1.8, -q * 1.4)); });
  if ((t >= A("again") && t < A("thermo")) || (t >= A("sum") && t < A("orbi"))) bothWays(220);
  // thermo: compressor on → hum rings; the dial
  const humOn = (t >= A("thermo") && t > F("thermo", 0.55) && t < A("door")) || (t >= A("door") && t < A("seal"));
  if (humOn) { M.comp.emissiveIntensity = 0.25 + 0.1 * Math.sin(t * 30); rings.forEach((r, i) => { const q = (t * 0.9 + i / 3) % 1; r.visible = true; r.position.copy(COMPP).add(V(0, 0.1, 0)); r.lookAt(cam().position); r.scale.setScalar(0.6 + q * 2.2); r.material.opacity = 0.8 * (1 - q); }); }
  // door: the fridge works harder → more heat out the back + the motor's own heat
  if (t >= A("door") && t < A("seal")) { M.cond.emissiveIntensity = 0.3 + 0.1 * Math.sin(t * 6);
    poseHeat(250, (p, i) => { const q = (t * 0.32 + p.a) % 1; const from = i % 4 === 0 ? COMPP.clone().add(V((p.b - 0.5) * 0.5, 0.3, -0.2)) : segPt("cond", p.b * 0.9); return from.add(V(Math.sin(t * 2 + p.ph * 9) * 0.15, q * 2.4, -q * 1.8)); }); }
  // seal: warm air that got in cools and shrinks; air outside pushes the door shut
  if (t >= A("seal") && t < A("sum")) { const cool = ease(k(F("seal", 0.15), F("seal", 0.6))), sz = lerp(1, 0.62, cool);
    for (let i = 0; i < AN; i++) { const p = AP[i]; const x = lerp(X0 + T + 0.1, X1 - T - 0.1, p.x), y = lerp(1.0, 4.8, p.y), z = lerp(Z0 + T + 0.1, Z1 - 0.1, p.z);
      const c = V(0, 2.9, 0); const v = V(x, y, z).sub(c).multiplyScalar(sz).add(c).add(V(Math.sin(t * 3 + p.ph * 20) * 0.04, Math.cos(t * 3 + p.ph * 15) * 0.04, 0));
      _M.makeScale(1, 1, 1).setPosition(v); airIn.setMatrixAt(i, _M); airIn.setColorAt(i, _C.copy(CWARM).lerp(CCOLD, cool)); }
    airIn.instanceMatrix.needsUpdate = true; if (airIn.instanceColor) airIn.instanceColor.needsUpdate = true;
    if (t > F("seal", 0.5)) arrF.forEach((g, i) => arrow(g, V(lerp(-1.1, 1.1, (i % 4) / 3), i < 4 ? 1.6 : 3.6, Z1 + 1.1), V(0, 0, -1), 0.6 + 0.4 * Math.sin(t * 7 + i)));
    if (t > F("seal", 0.65)) M.gasket.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 8); }

  // ===== compressor close-up (world C) =====
  const w = t * 5.5, cx = Math.cos(w), sx = Math.sin(w);
  const pinX = 0.0 + 0.28 * cx, pinY = 3.05 + 0.28 * sx; const pistX = pinX + Math.sqrt(1.0 - (pinY - 3.05) ** 2) * 0.62 + 0.28;
  piston.position.set(pistX, 3.05, 0.3); crank.rotation.z = w;
  rod.position.set((pinX + pistX - 0.2) / 2, (pinY + 3.05) / 2, 0.3); rod.quaternion.setFromUnitVectors(V(0, 1, 0), V(pistX - 0.2 - pinX, 3.05 - pinY, 0).normalize()); rod.scale.y = V(pistX - 0.2 - pinX, 3.05 - pinY, 0).length();
  { const face = pistX + 0.2, hd = 1.6, squeeze = clamp((1.42 - face) / 0.72); // 0 open → 1 squeezed
    for (let i = 0; i < GN; i++) { const p = GP[i]; const x = lerp(face + 0.04, hd - 0.04, p.x), r = p.r * 0.9, a = p.a + t * 3;
      _M.makeScale(1, 1, 1).setPosition(x + Math.sin(t * 20 + p.ph * 40) * 0.02, 3.05 + r * Math.cos(a), 0.3 + r * Math.sin(a)); gas.setMatrixAt(i, _M); gas.setColorAt(i, _C.copy(CVAP).lerp(CHOT, squeeze)); }
    gas.instanceMatrix.needsUpdate = true; if (gas.instanceColor) gas.instanceColor.needsUpdate = true; }

  // ===== sweat (world S) =====
  { const q = k(F("boil", 0.2), F("boil", 0.95)); drops.forEach((d, i) => { const s = Math.max(0.001, 1 - ease(clamp(q * 1.3 - (i % 3) * 0.1))); d.scale.set(s, 0.8 * s, s); });
    for (let i = 0; i < 180; i++) { const p = VP[i], d = drops[p.d].position, qq = (t * 0.35 + p.ph) % 1; const v = q > 0.02 ? V(d.x + Math.cos(p.a) * (0.2 + qq * 0.6), 1.3 + qq * 3.2, d.z + Math.sin(p.a) * (0.2 + qq * 0.6)) : null;
      vap.setMatrixAt(i, v ? _M.makeScale(1, 1, 1).setPosition(v) : _Z); if (i < 90) vapH.setMatrixAt(i, v && t > F("boil", 0.35) ? _M.makeScale(1, 1, 1).setPosition(v.x + 0.08, v.y - 0.05, v.z) : _Z); }
    vap.instanceMatrix.needsUpdate = vapH.instanceMatrix.needsUpdate = true; }
  // ===== spray can (world K) =====
  { const q = k(F("cap", 0.52), A("again")); for (let i = 0; i < 200; i++) { const p = MP[i], qq = (t * 1.2 + p.ph) % 1; const v = q > 0 ? V(-0.8 + 0.4 + qq * 4.5, 3.62 + Math.cos(p.a) * p.r * qq * 0.9, Math.sin(p.a) * p.r * qq * 0.9) : null; mist.setMatrixAt(i, v ? _M.makeScale(1 + qq * 2, 1 + qq * 2, 1 + qq * 2).setPosition(v) : _Z); }
    for (let i = 0; i < 260; i++) { const p = FP[i], on = q > p.k * 0.8; frost.setMatrixAt(i, on ? _M.makeScale(1, 1, 1).setPosition(-0.8 + 0.82 * Math.cos(p.a), p.y, 0.82 * Math.sin(p.a)) : _Z); }
    mist.instanceMatrix.needsUpdate = frost.instanceMatrix.needsUpdate = true; }

  // ===== Orbi =====
  const O = A("orbi"), O2 = A("orbi2");
  screen(PH, { layers: [["one", 1]], lock: ease(k(F("orbi", 0.55), F("orbi", 0.8))) });
  const arr = k(F("orbi2", 0.02), F("orbi2", 0.22)); screen(PH2, { layers: [["many", 1]], glow: arr >= 1 ? 1 : 0 });
  beam.visible = t > F("orbi2", 0.02) && arr < 1; beam.position.copy(lerpV(V(0, 2.2, 0.3), V(2.6, 1.6, -2.3), ease(arr))).add(V(0, Math.sin(arr * Math.PI) * 1.2, 0));
  const burn = k(F("orbi2", 0.62), F("orbi2", 0.95));
  PH.phone.g.scale.setScalar(22 * (1 - burn * 0.95)); PH.phone.g.visible = burn < 1;
  for (let i = 0; i < EN; i++) { const d = emberDir[i]; emberPos.set([d[0] * out(burn), 2.2 + d[1] * out(burn) - burn * burn, d[2] * out(burn)], i * 3); }
  emberGeo.attributes.position.needsUpdate = true; embers.material.opacity = burn > 0 && burn < 1 ? 1 - burn * 0.6 : 0;

  // ================= shots =================
  const C0 = V(0, 3.7, 0);
  if (t < F("hook", 0.3)) { world("F"); const q = k(0, F("hook", 0.3)); orbit(C0, lerp(0.15, 0.45, q), lerp(15, 13, q), 1.6, 42); counter(t, F("hook", 0.05), F("hook", 0.3), "INSIDE: 4 °C");
    big(t, F("hook", 0.08), F("hook", 0.3), "NOT COLD?", 420); }
  else if (t < F("hook", 0.62)) { world("F"); const q = k(F("hook", 0.3), F("hook", 0.62)); orbit(V(0, 3.7, -0.6), lerp(2.6, 3.0, q), lerp(12.5, 11, q), 1.2, 42);
    callout(t, F("hook", 0.36), F("hook", 0.62), V(0.3, 4.2, ZC), 300, 330, "THE BACK: WARM", "#ff5a1a"); big(t, F("hook", 0.4), F("hook", 0.62), "WARM!", 1000);
    M.cond.emissiveIntensity = 0.25 + 0.08 * Math.sin(t * 6); }
  else if (t < A("cut")) { world("F"); const q = k(F("hook", 0.62), A("cut")); orbit(C0, lerp(1.6, 0.9, q), 13.5, 1.8, 42); big(t, F("hook", 0.66), F("hook", 0.86), "IT MOVES HEAT", 420);
    if (q > 0.6) { sweep.visible = true; sweep.position.set(1.6, 3.9, lerp(-2, 2, (q - 0.6) / 0.4)); sweep.rotation.set(0, Math.PI / 2, 0.15); } }
  else if (t < A("loop")) { world("F"); const q = k(A("cut"), A("loop"));
    if (q < 0.28) orbit(C0, lerp(0.9, 0.75, q / 0.28), 13, 2.2, 42);
    else { const qq = (q - 0.28) / 0.72; lookV(V(lerp(3.6, 3.0, qq), lerp(8.0, 7.7, qq), lerp(3.4, 2.8, qq)), V(1.25, 7.0, 0.6), 42);
      callout(t, F("cut", 0.36), A("loop"), V(1.32, 7.185, 0.3), 280, 330, "STEEL", "#9aa3ad"); callout(t, F("cut", 0.45), A("loop"), V(1.42, 7.02, 0.6), 820, 330, "FOAM", "#f2b71b"); callout(t, F("cut", 0.42), A("loop"), V(1.45, 6.855, 0.95), 280, 1000, "PLASTIC", "#3d7bff");
      if (t > F("cut", 0.62)) callout(t, F("cut", 0.62), A("loop"), V(1.42, 7.02, 0.0), 820, 1000, "HEAT CRAWLS IN", "#ff5a1a"); } }
  else if (t < A("fluid")) { world("F"); const q = k(A("loop"), A("fluid"));
    if (q < 0.28) orbit(C0, lerp(1.2, 2.4, q / 0.28), 13, 1.8, 42);
    else if (q < 0.48) { lookV(V(4.6, 2.6, -5.6), V(0.6, 0.8, -1.5), 40); callout(t, F("loop", 0.3), F("loop", 0.48), COMPP, 760, 330, "THE PUMP", "#3dff8c"); }
    else if (q < 0.64) { orbit(V(0, 3.9, -1.4), lerp(2.9, 3.2, (q - 0.48) / 0.16), 9.5, 0.8, 42); callout(t, F("loop", 0.48), F("loop", 0.64), segPt("cond", 0.32), 760, 330, "THE ZIGZAG", "#ffd24a"); }
    else if (q < 0.8) { lookV(V(-3.0, 3.4, -4.4), V(-0.95, 3.2, -1.43), 40); callout(t, F("loop", 0.64), F("loop", 0.8), segPt("cap", 0.5), 760, 330, "THIN AS A NOODLE", "#3dff8c"); }
    else { lookV(V(3.9, 6.4, 1.8), V(0, 6.0, -0.7), 42); callout(t, F("loop", 0.8), A("fluid"), V(0.2, 6.3, ZE + 0.02), 760, 1000, "COLD PLATE", "#4fb4ff"); } }
  else if (t < A("boil")) { world("F"); const q = k(A("fluid"), A("boil")); lookV(V(lerp(-2.6, -2.2, q), lerp(4.8, 4.6, q), lerp(-3.6, -3.0, q)), V(0.2, 4.5, ZC + 0.02), 40);
    callout(t, F("fluid", 0.12), A("boil"), segPt("cond", 0.25), 780, 330, "REFRIGERANT", "#ff3b2f"); if (t > F("fluid", 0.45)) callout(t, F("fluid", 0.45), A("boil"), segPt("cond", 0.35), 300, 1000, "OFTEN ISOBUTANE", "#ffa23a");
    big(t, F("fluid", 0.78), A("boil"), "BOILS AT −12 °C", 420); }
  else if (t < A("evap")) { world("S"); const q = k(A("boil"), A("evap")); look(lerp(3.0, 2.0, q), lerp(7.5, 6.5, q), lerp(9.0, 8.0, q), 0, 1.6, 0, 42);
    callout(t, F("boil", 0.15), F("boil", 0.5), drops[4].position.clone().add(V(0, 0.2, 0)), 780, 330, "SWEAT", "#4fb4ff"); callout(t, F("boil", 0.5), A("evap"), V(0.6, 3.2, 0), 300, 330, "VAPOUR TAKES HEAT", "#ff8a2a");
    counter(t, F("boil", 0.6), A("evap"), "YOU FEEL COLD"); }
  else if (t < A("stuck")) { world("F"); const q = k(A("evap"), A("stuck"));
    if (q < 0.45) { lookV(V(lerp(4.4, 3.8, q / 0.45), 6.4, lerp(2.0, 1.6, q / 0.45)), V(0, 6.0, -0.7), 42); callout(t, F("evap", 0.1), F("evap", 0.45), V(0.2, 6.02, ZE + 0.02), 760, 1000, "IT BOILS HERE", "#4fb4ff"); }
    else { lookV(V(lerp(5.4, 5.0, q), lerp(4.6, 4.2, q), lerp(4.2, 3.4, q)), V(0, 3.8, -0.3), 42); callout(t, F("evap", 0.5), A("stuck"), food[1].getWorldPosition(V()), 760, 1000, "HEAT LEAVES THE FOOD", "#ff8a2a"); }
    counter(t, F("evap", 0.2), A("stuck"), `INSIDE: ${Math.round(lerp(9, 4, k(F("evap", 0.2), F("evap", 0.95))))} °C`); }
  else if (t < A("comp")) { world("F"); const q = k(A("stuck"), A("comp")); lookV(V(lerp(3.6, 3.2, q), lerp(4.2, 2.6, q), lerp(-5.0, -4.4, q)), V(0.9, lerp(4.0, 1.8, q), -1.3), 42);
    callout(t, F("stuck", 0.1), A("comp"), segPt("suc", lerp(0.35, 0.75, q)), 300, 330, "VAPOUR FULL OF HEAT", "#ff8a2a"); }
  else if (t < A("hot")) { world("C"); const q = k(A("comp"), A("hot")); look(lerp(3.4, 2.6, q), lerp(5.6, 5.0, q), lerp(11.5, 9.5, q), 0.7, lerp(2.2, 2.6, q), 0, 42);
    callout(t, F("comp", 0.06), F("comp", 0.4), V(0.0, 1.2, 1.1), 300, 1000, "MOTOR", "#d07a32"); callout(t, F("comp", 0.2), F("comp", 0.7), piston.position.clone(), 780, 330, "PISTON", "#d6dbe2");
    callout(t, F("comp", 0.45), A("hot"), V(1.45, 3.05, 0.3), 300, 330, "SQUEEZED VAPOUR", "#ff3b2f"); big(t, F("comp", 0.62), F("comp", 0.82), "SQUEEZE = HOT", 1000); big(t, F("comp", 0.83), A("hot"), "LIKE A BIKE PUMP", 1000); }
  else if (t < A("cond")) { world("F"); const q = k(A("hot"), A("cond")); lookV(V(lerp(4.0, 3.4, q), lerp(2.2, 2.6, q), lerp(-4.6, -4.0, q)), V(1.1, 1.6, -1.4), 40);
    callout(t, F("hot", 0.1), A("cond"), segPt("dis", 0.6), 300, 330, "PIPE: HOT", "#ff3b2f"); callout(t, F("hot", 0.3), A("cond"), V(2.6, 2.4, -2.8), 760, 1000, "KITCHEN: COOLER", "#4fb4ff"); big(t, F("hot", 0.6), A("cond"), "HOT → COLD", 420); }
  else if (t < A("cap")) { world("F"); const q = k(A("cond"), A("cap"));
    if (q < 0.5) { lookV(V(lerp(1.6, 1.2, q / 0.5), 5.9, -4.6), V(0.2, 5.3, ZC), 40); callout(t, F("cond", 0.1), F("cond", 0.5), segPt("cond", 0.15), 760, 330, "HEAT OUT", "#ff8a2a"); }
    else { orbit(V(0, 3.9, -1.4), lerp(2.8, 3.3, (q - 0.5) / 0.5), 10.5, 0.8, 42); callout(t, F("cond", 0.5), F("cond", 0.78), segPt("cond", 0.75), 300, 330, "GAS → LIQUID", "#ffa23a"); big(t, F("cond", 0.8), A("cap"), "WARM BACK", 420); } }
  else if (t < F("cap", 0.52)) { world("F"); const q = k(A("cap"), F("cap", 0.52)); lookV(V(-2.8, lerp(3.4, 4.6, q), -3.4), V(-0.95, lerp(2.6, 4.4, q), -1.43), 38);
    callout(t, F("cap", 0.05), F("cap", 0.52), segPt("cap", lerp(0.4, 0.75, q)), 760, 330, "SQUEEZE THROUGH", "#3dff8c"); counter(t, F("cap", 0.2), F("cap", 0.52), "PRESSURE DROPS"); }
  else if (t < A("again")) { world("K"); const q = k(F("cap", 0.52), A("again")); look(lerp(4.2, 3.4, q), 4.4, lerp(9.0, 8.2, q), 0.9, 2.4, 0, 42);
    callout(t, F("cap", 0.6), A("again"), V(-0.8 + 0.6, 1.4, 0.6), 300, 1000, "ICY CAN", "#4fb4ff"); big(t, F("cap", 0.62), A("again"), "PSSSHH", 420); }
  else if (t < A("thermo")) { world("F"); const q = k(A("again"), A("thermo")); orbit(V(0, 3.7, -0.3), lerp(1.4, 3.4, q), 13.5, 1.8, 42);
    callout(t, F("again", 0.05), F("again", 0.4), V(0, 6.0, ZE + 0.02), 760, 330, "COLD LIQUID IN", "#3d9bff"); callout(t, F("again", 0.45), A("thermo"), segPt("cond", 0.4), 300, 330, "HEAT OUT", "#ff8a2a");
    big(t, F("again", 0.72), A("thermo"), "ROUND & ROUND", 1000); }
  else if (t < A("door")) { world("F"); const q = k(A("thermo"), A("door"));
    if (q < 0.55) { lookV(V(lerp(4.6, 4.0, q / 0.55), 4.6, lerp(2.4, 1.8, q / 0.55)), V(0.6, 4.2, -0.5), 42); callout(t, F("thermo", 0.05), F("thermo", 0.55), dial.position.clone(), 760, 330, "THERMOSTAT", "#3d7bff");
      counter(t, F("thermo", 0.15), F("thermo", 0.33), "FRIDGE: 4 °C"); counter(t, F("thermo", 0.33), F("thermo", 0.55), "FREEZER: −18 °C"); }
    else { lookV(V(4.6, 2.6, -5.6), V(0.6, 0.8, -1.5), 40); callout(t, F("thermo", 0.6), A("door"), COMPP, 760, 330, "ON = THE HUM", "#3dff8c"); } }
  else if (t < A("seal")) { world("F"); const q = k(A("door"), A("seal"));
    if (q < 0.45) { orbit(C0, lerp(0.5, 0.8, q / 0.45), 14, 2.0, 42); big(t, F("door", 0.3), F("door", 0.45), "COOL THE KITCHEN?", 420); }
    else { orbit(V(0, 3.7, -0.6), lerp(2.2, 2.7, (q - 0.45) / 0.55), 14, 1.4, 42); big(t, F("door", 0.48), F("door", 0.66), "OPPOSITE!", 420);
      callout(t, F("door", 0.66), A("seal"), segPt("cond", 0.4), 300, 1000, "HEAT OUT THE BACK", "#ff8a2a"); callout(t, F("door", 0.78), A("seal"), COMPP, 760, 1000, "+ MOTOR HEAT", "#ff5a1a"); counter(t, F("door", 0.6), A("seal"), "KITCHEN: WARMER"); } }
  else if (t < A("sum")) { world("F"); const q = k(A("seal"), A("sum")); lookV(V(lerp(7.4, 6.6, q), lerp(4.6, 4.2, q), lerp(8.6, 7.8, q)), V(0, 3.0, 0.4), 42);
    callout(t, F("seal", 0.18), F("seal", 0.6), V(0.5, 3.4, 0.3), 760, 330, "AIR COOLS, SHRINKS", "#3d9bff"); callout(t, F("seal", 0.62), A("sum"), V(1.4, 2.6, Z1 - 0.02), 760, 1000, "MAGNETIC SEAL", "#3dff8c");
    counter(t, F("seal", 0.3), A("sum"), "PRESSURE INSIDE ↓"); }
  else if (t < A("orbi")) { world("F"); const q = k(A("sum"), A("orbi")); orbit(V(0, 3.7, -0.3), lerp(0.8, 2.6, q), lerp(14, 13, q), 2.0, 42);
    callout(t, F("sum", 0.35), A("orbi"), V(0, 6.0, ZE + 0.02), 760, 330, "HEAT IN", "#3d9bff"); callout(t, F("sum", 0.48), A("orbi"), segPt("cond", 0.4), 300, 1000, "HEAT OUT", "#ff8a2a");
    big(t, F("sum", 0.08), F("sum", 0.3), "IT MOVES HEAT", 420); big(t, F("sum", 0.7), A("orbi"), "NOTHING STORED", 420); }
  else if (t < O2) { world("orbi"); const q = k(O, O2); look(lerp(1.5, 0.6, q), lerp(2.6, 2.4, q), lerp(6.5, 5.2, q), 0, 2.2, 0, 44);
    flash(t, O, 0.8, 3); tag("tR", t, F("orbi", 0.55), O2, 540, 190); }
  else { world("orbi"); const q = k(O2, A("end")); orbit(V(1, 1.9, -1), lerp(0.1, -0.4, q), lerp(9, 7.5, q), 2.5, 46);
    tag("tT", t, F("orbi2", 0.02), F("orbi2", 0.3), 540, 190); tag("tS", t, F("orbi2", 0.3), F("orbi2", 0.58), 540, 190); timer(t, F("orbi2", 0.6), F("orbi2", 0.95)); }
  drawCallouts();
});
function cam() { return K.cam; }
await ready();
