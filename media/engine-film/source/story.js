// How a car engine turns fuel into motion: HD cutaway film (kit/hd.js). Units: 1 = 10 cm.
// A real inline-4: bore/stroke 86 mm, rod 145 mm, slider-crank kinematics, firing order 1-3-4-2, DOHC with cam
// lobes driving the valves (cams at half crank speed), spark plug, injector, ports, manifolds, flywheel, belt.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, cutaway, sh } = H;
const scene = H.scene, D2R = Math.PI / 180;

// ---------- engine geometry ----------
const R = 0.43, ROD = 1.45, DECK = 2.21, dh = DECK - 2.26, Y = (y) => y + dh;
const CX = [1.575, 0.525, -0.525, -1.575];          // cylinder 1 at the timing end (+x), flywheel at −x
const OFF = [0, 540, 180, 360];                      // firing order 1-3-4-2: cycle offsets in crank degrees
const pinY = (th) => R * Math.cos(th) + Math.sqrt(ROD * ROD - R * R * Math.sin(th) ** 2); // wrist-pin height
const CROWN = 0.27;                                  // crown above the wrist pin
const ALPHA = 17 * D2R;                              // valve tilt
const U = { in: V(0, Math.cos(ALPHA), -Math.sin(ALPHA)), ex: V(0, Math.cos(ALPHA), Math.sin(ALPHA)) };
const SEAT = { in: V(0, Y(2.435), -0.205), ex: V(0, Y(2.435), 0.205) };
const CAM = { in: SEAT.in.clone().addScaledVector(U.in, 0.912), ex: SEAT.ex.clone().addScaledVector(U.ex, 0.912) };
const ROOF = Y(2.5);

// clip plane shared by all static parts (block, head, covers, manifolds, belt): keeps the side where n·p + c ≥ 0
const cut = new THREE.Plane(V(-1, 0, 0), 1000);
const CUTS = [cut];
const E = new THREE.Group(); scene.add(E); E.position.y = 0;
H.floor.position.y = -1.42;
H.floor.material.userData.studio = true; H.floor.material.color.set(0x08090b); H.floor.material.clearcoat = 0; H.floor.material.roughness = 0.6;

// materials
const cast = H.castTex(5);
const alu = cutaway(metal(0xa9b0b7, 0.5, { roughnessMap: cast, metalness: 0.8, clippingPlanes: CUTS }), 0xd8432c);
const aluHead = cutaway(metal(0xbcc2c8, 0.42, { roughnessMap: cast, metalness: 0.85, clippingPlanes: CUTS }), 0xe0562e);
const coverMat = cutaway(paint(0xa8231b, 0.38, { clippingPlanes: CUTS }), 0xe0562e);
const panMat = cutaway(paint(0x24272b, 0.5, { clippingPlanes: CUTS }), 0xd8432c);
const plastic = paint(0x17191c, 0.55, { clippingPlanes: CUTS, side: THREE.DoubleSide, clipShadows: true });
const exhMat = metal(0x6a5a50, 0.55, { clippingPlanes: CUTS, side: THREE.DoubleSide, clipShadows: true, emissive: new THREE.Color(0xff3a10), emissiveIntensity: 0 });
const pistonMat = metal(0xd8dbe0, 0.26);
const ringMat = metal(0x3b3e44, 0.3);
const rodMat = metal(0x9097a0, 0.2);
const crankMat = metal(0x787e86, 0.24);
const journalMat = metal(0xd2d5da, 0.1);
const valveMat = metal(0xc0c4ca, 0.18);
const springMat = paint(0x2b6fd6, 0.3);
const camMat = metal(0xb1b5bb, 0.14);
const ceramic = paint(0xf4f2ec, 0.25);
const steel = metal(0xc8ccd1, 0.2);
const beltMat = matte(0x15161a, 0.7, { clippingPlanes: CUTS, side: THREE.DoubleSide, clipShadows: true });
const pulleyMat = metal(0x9aa0a7, 0.25, { clippingPlanes: CUTS, clipShadows: true });

// extrude helpers. side(shape,len): profile in (z, y), extruded along −x from x0. top(shape,h): plan in (x, z), extruded down from y0.
function side(shapes, len, x0, mat, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth: len, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 40 });
  g.rotateY(-Math.PI / 2); g.translate(x0, 0, 0);
  return sh(new THREE.Mesh(g, mat));
}
function shape(pts) { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); s.closePath(); return s; }
const ringHole = (cx, cy, r) => { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, Math.PI * 2, true); return p; };

// ---- block (plan with four bores + coolant passages), crankcase (open U profile), bulkheads, oil pan
{
  const s = new THREE.Shape(); s.moveTo(-2.2, -0.66); s.lineTo(2.2, -0.66); s.lineTo(2.2, 0.66); s.lineTo(-2.2, 0.66); s.closePath();
  for (const x of CX) s.holes.push(ringHole(x, 0, R));
  for (const x of [-2.07, -1.05, 0, 1.05, 2.07]) for (const z of [-0.52, 0.52]) s.holes.push(ringHole(x, z, 0.06));
  for (const x of CX) for (const z of [-0.56, 0.56]) s.holes.push(ringHole(x, z, 0.045));
  const g = new THREE.ExtrudeGeometry(s, { depth: DECK - 0.62, bevelEnabled: false, curveSegments: 56 });
  g.rotateX(Math.PI / 2); g.translate(0, DECK, 0);
  E.add(sh(new THREE.Mesh(g, alu)));
  // ribs on the outside of the block
  for (const x of [-2.07, -1.05, 0, 1.05, 2.07]) for (const z of [-0.69, 0.69]) { const rb = sh(new THREE.Mesh(new THREE.BoxGeometry(0.08, DECK - 0.7, 0.06), alu)); rb.position.set(x, (DECK + 0.62) / 2 - 0.03, z); E.add(rb); }
  const cc = shape([[-0.75, 0.62], [-0.75, -0.05], [-0.55, -0.42], [0.55, -0.42], [0.75, -0.05], [0.75, 0.62], [0.62, 0.62], [0.62, -0.02], [0.48, -0.32], [-0.48, -0.32], [-0.62, -0.02], [-0.62, 0.62]]);
  E.add(side(cc, 4.4, 2.2, alu));
  for (const x of [2.2, 1.05, 0, -1.05, -2.2]) {
    const b = new THREE.Shape(); b.moveTo(-0.62, -0.32); b.lineTo(0.62, -0.32); b.lineTo(0.62, 0.62); b.lineTo(-0.62, 0.62); b.closePath(); b.holes.push(ringHole(0, 0, 0.235));
    const w = Math.abs(x) > 2 ? 0.12 : 0.14; E.add(side(b, w, x + (x > 2 ? 0 : x < -2 ? w : w / 2), alu));
  }
  const pan = shape([[-0.75, -0.42], [0.75, -0.42], [0.66, -1.02], [-0.66, -1.02]]);
  const panG = new THREE.Shape(); panG.moveTo(-0.75, -0.42); panG.lineTo(0.75, -0.42); panG.lineTo(0.66, -1.02); panG.lineTo(-0.66, -1.02); panG.closePath();
  panG.holes.push((() => { const p = new THREE.Path(); p.moveTo(-0.62, -0.47); p.lineTo(-0.56, -0.95); p.lineTo(0.56, -0.95); p.lineTo(0.62, -0.47); p.closePath(); return p; })());
  E.add(side(panG, 4.36, 2.18, panMat, 0.02));
  for (let i = 0; i < 9; i++) { const f = sh(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 1.3), panMat)); f.position.set(-1.9 + i * 0.475, -0.86, 0); E.add(f); }
}
// oil: a dark glossy pool in the pan
const oil = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.18, 1.1), new THREE.MeshPhysicalMaterial({ color: 0x1d1206, roughness: 0.08, clearcoat: 1, clippingPlanes: CUTS }));
oil.position.y = -0.85; E.add(oil);

// ---- head: three pieces of the cross-section (below intake port, below exhaust port, roof + body), extruded along x
{
  const A = new THREE.Shape(); A.moveTo(-0.75, Y(2.26)); A.lineTo(-0.43, Y(2.26)); A.lineTo(-0.37, Y(2.33)); A.lineTo(-0.325, Y(2.398)); A.quadraticCurveTo(-0.52, Y(2.43), -0.75, Y(2.5)); A.closePath();
  const B = new THREE.Shape(); B.moveTo(0.75, Y(2.26)); B.lineTo(0.75, Y(2.5)); B.quadraticCurveTo(0.52, Y(2.43), 0.325, Y(2.398)); B.lineTo(0.37, Y(2.33)); B.lineTo(0.43, Y(2.26)); B.closePath();
  const C = new THREE.Shape(); C.moveTo(-0.75, Y(2.76)); C.quadraticCurveTo(-0.3, Y(2.66), -0.088, Y(2.472)); C.lineTo(-0.035, Y(2.5)); C.lineTo(0.035, Y(2.5)); C.lineTo(0.088, Y(2.472)); C.quadraticCurveTo(0.3, Y(2.66), 0.75, Y(2.76)); C.lineTo(0.75, Y(2.88)); C.lineTo(-0.75, Y(2.88)); C.closePath();
  E.add(side([A, B, C], 4.4, 2.2, aluHead));
  // gasket line
  const gk = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.012, 1.34), new THREE.MeshStandardMaterial({ color: 0x2a2c2f, roughness: 0.6, clippingPlanes: CUTS })); gk.position.y = DECK + 0.006; E.add(gk);
  // valve cover (a shell, so the cams show when it is cut)
  const vc = new THREE.Shape(); vc.moveTo(-0.72, Y(2.88)); vc.lineTo(0.72, Y(2.88)); vc.lineTo(0.72, Y(3.42)); vc.quadraticCurveTo(0.7, Y(3.62), 0.5, Y(3.64)); vc.lineTo(-0.5, Y(3.64)); vc.quadraticCurveTo(-0.7, Y(3.62), -0.72, Y(3.42)); vc.closePath();
  const inner = new THREE.Path(); inner.moveTo(-0.64, Y(2.885)); inner.lineTo(-0.64, Y(3.4)); inner.quadraticCurveTo(-0.62, Y(3.56), -0.46, Y(3.57)); inner.lineTo(0.46, Y(3.57)); inner.quadraticCurveTo(0.62, Y(3.56), 0.64, Y(3.4)); inner.lineTo(0.64, Y(2.885)); inner.closePath();
  vc.holes.push(inner);
  E.add(side(vc, 4.36, 2.18, coverMat, 0.02));
  const capS = new THREE.Shape(vc.getPoints()); const capB = side(capS, 0.04, -2.16, coverMat); E.add(capB);
  const capF = side(capS, 0.04, 2.2, coverMat); E.add(capF);
  // ribs on the cover
  for (let i = 0; i < 7; i++) { const rb = sh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 1.0), coverMat)); rb.position.set(-1.8 + i * 0.6, Y(3.655), 0); E.add(rb); }
}

// ---- intake manifold (runners to a plenum + throttle body) and exhaust manifold (runners to a collector + pipe)
const runnersIn = [], runnersEx = [];
for (const x of CX) {
  const ci = new THREE.CatmullRomCurve3([V(x, Y(2.63), -0.74), V(x, Y(2.72), -1.02), V(x, Y(3.0), -1.32), V(x, Y(3.45), -1.42), V(x, Y(3.7), -1.38)]);
  runnersIn.push(ci); E.add(sh(new THREE.Mesh(new THREE.TubeGeometry(ci, 40, 0.115, 20, false), plastic)));
  const ce = new THREE.CatmullRomCurve3([V(x, Y(2.63), 0.74), V(x, Y(2.58), 1.02), V(x, Y(2.2), 1.22), V(x * 0.7 - 0.25, 1.15, 1.3), V(-0.6, 0.55, 1.3)]);
  runnersEx.push(ce); E.add(sh(new THREE.Mesh(new THREE.TubeGeometry(ce, 40, 0.105, 20, false), exhMat)));
}
{
  const pl = sh(new THREE.Mesh(new RoundedBoxGeometry(4.3, 0.42, 0.62, 4, 0.16), plastic)); pl.position.set(0, Y(3.86), -1.4); E.add(pl);
  const tb = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.35, 32, 1, true), steel)); tb.rotation.z = Math.PI / 2; tb.position.set(2.32, Y(3.86), -1.4); E.add(tb);
  const pipe = new THREE.CatmullRomCurve3([V(-0.6, 0.55, 1.3), V(-1.8, 0.35, 1.3), V(-3.2, -0.2, 1.2), V(-7, -0.5, 1.1)]);
  E.add(sh(new THREE.Mesh(new THREE.TubeGeometry(pipe, 60, 0.14, 20, false), exhMat)));
  for (let i = 0; i < 4; i++) { const fl = sh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.34), exhMat)); fl.position.set(CX[i], Y(2.63), 0.78); E.add(fl); }
  for (let i = 0; i < 4; i++) { const fl = sh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.36), plastic)); fl.position.set(CX[i], Y(2.63), -0.78); E.add(fl); }
}

// ---- moving parts, per cylinder
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const pistonG = lathe([[0, 0.05], [0.33, 0.05], [0.35, -0.38], [0.425, -0.38], [0.425, 0.04], [0.4, 0.04], [0.4, 0.07], [0.425, 0.07], [0.425, 0.11], [0.4, 0.11], [0.4, 0.14], [0.425, 0.14], [0.425, 0.17], [0.4, 0.17], [0.4, 0.195], [0.425, 0.195], [0.425, 0.25], [0.405, 0.27], [0.15, 0.262], [0, 0.255]], 64);
const ringG = (y0, h) => lathe([[0.398, y0], [0.428, y0], [0.428, y0 + h], [0.398, y0 + h], [0.398, y0]], 64);
const rodG = (() => {
  const s = new THREE.Shape(); s.moveTo(0.26, 0); s.absarc(0, 0, 0.26, 0, Math.PI, true); s.lineTo(-0.1, ROD - 0.16); s.absarc(0, ROD, 0.13, Math.PI + 0.65, -0.65 + Math.PI * 2 + Math.PI, true); s.lineTo(0.26, 0);
  s.holes.push(ringHole(0, 0, 0.18)); s.holes.push(ringHole(0, ROD, 0.078));
  const pocket = new THREE.Path(); pocket.moveTo(-0.06, 0.34); pocket.lineTo(0.06, 0.34); pocket.lineTo(0.04, ROD - 0.24); pocket.lineTo(-0.04, ROD - 0.24); pocket.closePath(); s.holes.push(pocket);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 40 });
  g.rotateY(-Math.PI / 2); g.translate(0.07, 0, 0); return g;
})();
const webG = (() => {
  const s = new THREE.Shape(); s.moveTo(0.24, R); s.absarc(0, R, 0.24, 0, Math.PI, false); s.lineTo(-0.58 * Math.cos(0.35), -0.58 * Math.sin(0.35)); s.absarc(0, 0, 0.58, Math.PI + 0.35, Math.PI * 2 - 0.35, false); s.lineTo(0.24, R);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 36 });
  g.rotateY(-Math.PI / 2); g.translate(0.05, 0, 0); return g;
})();
const valveG = (r) => lathe([[0, -0.015], [r, -0.015], [r, 0.004], [r * 0.72, 0.03], [0.045, 0.085], [0.028, 0.15], [0.028, 0.8], [0, 0.8]], 40);
const retainerG = lathe([[0.03, 0], [0.078, 0.02], [0.078, 0.04], [0.03, 0.04]], 32);
const springG = (() => { const pts = []; for (let i = 0; i <= 240; i++) { const a = (i / 240) * Math.PI * 2 * 6.5; pts.push(V(Math.cos(a) * 0.072, i / 240, Math.sin(a) * 0.072)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 170, 0.013, 6, false); })();
const lobeG = (() => {
  const s = new THREE.Shape(); const n = 96;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const rr = 0.1 + 0.09 * Math.pow(Math.max(0, Math.cos(a)), 3); const x = Math.sin(a) * rr, y = Math.cos(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }); g.rotateY(-Math.PI / 2); g.translate(0.065, 0, 0); return g;
})();

const CYL = CX.map((x, i) => {
  const c = { x, i };
  c.piston = new THREE.Group(); E.add(c.piston);
  c.piston.add(sh(new THREE.Mesh(pistonG, pistonMat)));
  for (const [y0, h] of [[0.04, 0.03], [0.11, 0.03], [0.17, 0.025]]) c.piston.add(new THREE.Mesh(ringG(y0, h), ringMat));
  const wp = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.62, 24), journalMat)); wp.rotation.z = Math.PI / 2; c.piston.add(wp);
  c.rod = sh(new THREE.Mesh(rodG, rodMat)); E.add(c.rod);
  const cap = sh(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.66), rodMat)); cap.position.y = -0.2; c.rod.add(cap);
  for (const z of [-0.2, 0.2]) { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 12), steel)); b.position.set(0, -0.2, z); c.rod.add(b); }
  // valves, springs, retainers, cam lobes
  c.v = {};
  for (const k of ["in", "ex"]) {
    const g = new THREE.Group(); g.position.set(x, SEAT[k].y, SEAT[k].z); g.rotation.x = Math.atan2(U[k].z, U[k].y); E.add(g);
    const valve = sh(new THREE.Mesh(valveG(k === "in" ? 0.125 : 0.11), valveMat)); g.add(valve);
    const ret = sh(new THREE.Mesh(retainerG, steel)); ret.position.y = 0.74; valve.add(ret);
    const spring = sh(new THREE.Mesh(springG, springMat)); spring.position.y = 0.47; g.add(spring);
    const lobe = sh(new THREE.Mesh(lobeG, camMat)); lobe.position.set(x, CAM[k].y, CAM[k].z); E.add(lobe);
    c.v[k] = { g, valve, spring, lobe, lift: 0 };
  }
  // spark plug (electrode tip at the roof)
  const plug = new THREE.Group(); plug.position.set(x, ROOF - 0.02, 0); E.add(plug);
  plug.add(sh(new THREE.Mesh(lathe([[0, -0.03], [0.018, -0.03], [0.018, 0.04], [0.07, 0.04], [0.07, 0.3], [0, 0.3]], 24), steel)));
  const hex = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 6), steel)); hex.position.y = 0.35; plug.add(hex);
  const ins = []; for (let j = 0; j <= 10; j++) ins.push([j % 2 ? 0.066 : 0.074, 0.4 + j * 0.045]); ins.push([0.03, 0.9], [0, 0.9]);
  plug.add(sh(new THREE.Mesh(lathe([[0, 0.4], ...ins], 32), ceramic)));
  const term = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 12), steel)); term.position.y = 0.95; plug.add(term);
  const ground = sh(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), steel)); ground.position.set(0.04, -0.045, 0); plug.add(ground);
  const coil = sh(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.26, 0.5, 3, 0.05), paint(0x111214, 0.4))); coil.position.set(x, Y(3.82), 0); E.add(coil);
  c.plug = plug;
  // fuel injector in the intake port, aimed at the valve
  const inj = new THREE.Group(); inj.position.set(x, Y(2.72), -0.6); inj.lookAt(V(x, Y(2.46), -0.26)); E.add(inj);
  const body = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.26, 20), paint(0x1a1b1e, 0.3))); body.rotation.x = Math.PI / 2; body.position.z = -0.05; inj.add(body);
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.06, 16), steel); nz.rotation.x = Math.PI / 2; nz.position.z = 0.1; inj.add(nz);
  c.inj = inj;
  // stroke glow disc (used in the four-cylinder view)
  c.glow = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  E.add(c.glow);
  return c;
});
// camshafts (bars along x) + crankshaft (main journals, webs, pins)
for (const k of ["in", "ex"]) { const s = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 24), camMat)); s.rotation.z = Math.PI / 2; s.position.set(0.05, CAM[k].y, CAM[k].z); E.add(s); }
const crank = new THREE.Group(); E.add(crank);
{
  const main = (x0, x1) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, x1 - x0, 40), journalMat)); m.rotation.z = Math.PI / 2; m.position.x = (x0 + x1) / 2; crank.add(m); };
  main(CX[0] + 0.25, 2.62); main(-2.62, CX[3] - 0.25);
  for (let i = 0; i < 3; i++) main(CX[i + 1] + 0.25, CX[i] - 0.25);
  CX.forEach((x, i) => {
    const pinAng = i === 0 || i === 3 ? 0 : Math.PI; // pins 1 & 4 together, 2 & 3 opposite
    const th = new THREE.Group(); th.rotation.x = pinAng; th.position.x = x; crank.add(th);
    for (const dx of [-0.2, 0.2]) { const w = sh(new THREE.Mesh(webG, crankMat)); w.position.x = dx; th.add(w); }
    const pin = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 36), journalMat)); pin.rotation.z = Math.PI / 2; pin.position.y = R; th.add(pin);
  });
}
// flywheel with ring gear + bell housing + gearbox + driveshaft + a wheel
const fly = new THREE.Group(); fly.position.x = -2.7; E.add(fly);
{
  const disc = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.16, 96), metal(0x868c93, 0.28))); disc.rotation.z = Math.PI / 2; fly.add(disc);
  const ringT = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.07, 0.05), metal(0x9aa0a7, 0.25), 96);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; m4.makeRotationX(a).setPosition(0, Math.cos(a) * 1.02, Math.sin(a) * 1.02); ringT.setMatrixAt(i, m4); }
  ringT.castShadow = true; fly.add(ringT);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 12), steel); b.rotation.z = Math.PI / 2; b.position.set(0, Math.cos(a) * 0.3, Math.sin(a) * 0.3); fly.add(b); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 64), metal(0x5f646b, 0.4)); hub.rotation.z = Math.PI / 2; hub.position.x = -0.04; fly.add(hub);
}
const bell = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.18, 0.9, 64, 1, true), cutaway(metal(0xa6acb3, 0.45, { roughnessMap: cast, clippingPlanes: CUTS }), 0xd8432c))); bell.rotation.z = Math.PI / 2; bell.position.set(-3.35, 0, 0); E.add(bell);
const gbox = sh(new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.2, 1.2, 4, 0.18), cutaway(metal(0xa6acb3, 0.45, { roughnessMap: cast, clippingPlanes: CUTS }), 0xd8432c))); gbox.position.set(-4.5, -0.05, 0); E.add(gbox);
const shaft = new THREE.Group(); shaft.position.set(-5.2, -0.05, 0); E.add(shaft);
{ const s = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 24), steel)); s.rotation.z = Math.PI / 2; s.position.x = -2.1; shaft.add(s); for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.2), metal(0x3c4046, 0.3)); st.position.set(-0.4 - i * 0.5, 0.09, 0); shaft.add(st); } }
const wheel = new THREE.Group(); wheel.position.set(-9.9, -0.05, 0); E.add(wheel);
{
  const tyre = sh(new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.36, 32, 96), matte(0x2a2c2f, 0.7))); tyre.rotation.y = Math.PI / 2; wheel.add(tyre);
  const rim = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.5, 64, 1, true), metal(0xcfd3d8, 0.15, { side: THREE.DoubleSide }))); rim.rotation.z = Math.PI / 2; wheel.add(rim);
  for (let i = 0; i < 5; i++) { const sp = sh(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.16), metal(0xcfd3d8, 0.15))); sp.rotation.x = (i / 5) * Math.PI; sp.position.x = 0.12; wheel.add(sp); }
  const hubW = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 32), steel); hubW.rotation.z = Math.PI / 2; hubW.position.x = 0.1; wheel.add(hubW);
}
// timing belt: crank sprocket (r .225) drives two cam sprockets (r .45) → cams turn at half speed
const belt = new THREE.Group(); belt.position.x = 2.42; E.add(belt);
const sprockets = [];
{
  const mk = (y, z, rr, teeth) => {
    const g = new THREE.Group(); g.position.set(0, y, z); belt.add(g);
    const d = sh(new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.12, 64), pulleyMat)); d.rotation.z = Math.PI / 2; g.add(d);
    const tm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.05, 0.04), pulleyMat, teeth); const m4 = new THREE.Matrix4();
    for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; m4.makeRotationX(a).setPosition(0, Math.cos(a) * (rr + 0.02), Math.sin(a) * (rr + 0.02)); tm.setMatrixAt(i, m4); } g.add(tm);
    for (let i = 0; i < 4; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.18, rr * 0.18, 0.14, 16), matte(0x0d0e10)); h.rotation.z = Math.PI / 2; const a = (i / 4) * Math.PI * 2; h.position.set(0, Math.cos(a) * rr * 0.55, Math.sin(a) * rr * 0.55); g.add(h); }
    sprockets.push({ g, rr }); return g;
  };
  mk(0, 0, 0.225, 22); mk(CAM.in.y, CAM.in.z, 0.42, 44); mk(CAM.ex.y, CAM.ex.z, 0.42, 44);
  const pts = []; const circ = [[0, 0, 0.27], [CAM.in.y, CAM.in.z, 0.465], [CAM.ex.y, CAM.ex.z, 0.465]];
  for (const [y, z, rr] of circ) for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push([z + Math.sin(a) * rr, y + Math.cos(a) * rr]); }
  // convex hull (gift wrap) of the three circles = the belt path
  const hull = []; let p0 = pts.reduce((a, b) => (b[0] < a[0] ? b : a)), p = p0;
  do { hull.push(p); let q = pts[0]; for (const s of pts) { const cr = (q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0]); if (q === p || cr < 0) q = s; } p = q; } while (p !== p0 && hull.length < 400);
  const curve = new THREE.CatmullRomCurve3(hull.map(([z, y]) => V(0, y, z)), true);
  const bm = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, 0.035, 6, true), beltMat); bm.scale.set(4, 1, 1); belt.add(bm);
}
// radiator in front of the engine
const rad = new THREE.Group(); rad.position.set(3.4, 1.4, 0); E.add(rad);
{
  const fr0 = sh(new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.0, 2.4), cutaway(paint(0x1b1d20, 0.5, { clippingPlanes: CUTS }), 0x333333))); rad.add(fr0);
  const finTex = H.canvasTex(256, 256, (g) => { g.fillStyle = "#2b2f34"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#596169"; g.lineWidth = 2; for (let i = 0; i < 256; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); } g.strokeStyle = "#1a1d20"; for (let j = 0; j < 256; j += 32) { g.lineWidth = 6; g.beginPath(); g.moveTo(0, j); g.lineTo(256, j); g.stroke(); } });
  finTex.wrapS = finTex.wrapT = THREE.RepeatWrapping; finTex.repeat.set(4, 6);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshStandardMaterial({ map: finTex, metalness: 0.6, roughness: 0.45, clippingPlanes: CUTS, side: THREE.DoubleSide })); core.rotation.y = Math.PI / 2; core.position.x = 0.075; rad.add(core);
  const core2 = core.clone(); core2.position.x = -0.075; core2.rotation.y = -Math.PI / 2; rad.add(core2);
}

// ---------- combustion: spark, flame front, light, gas particles (cylinder 1) ----------
const sparkM = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 2), glow(0xbfe0ff, 8)); E.add(sparkM);
const sparkL = new THREE.PointLight(0x9fd0ff, 0, 3, 2); E.add(sparkL);
const flameL = new THREE.PointLight(0xff7a2a, 0, 4.5, 2); E.add(flameL);
const flameMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  uniforms: { k: { value: 0 }, t: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform float k, t; varying vec3 vN; varying vec3 vP;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9,78.2,37.7)))*43758.5); }
    void main(){ float f = pow(1.0 - abs(vN.z), 1.6); float n = 0.6 + 0.4*sin(vP.x*40.0 + t*30.0)*sin(vP.y*37.0 - t*24.0);
      vec3 c = mix(vec3(3.2,1.3,0.35), vec3(3.5,3.0,2.2), 1.0 - f); gl_FragColor = vec4(c * (0.03 + f*0.16) * n * k, 1.0); }`,
});
const flame = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), flameMat); E.add(flame);
const NP = 460;
const gas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.015, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), NP);
gas.frustumCulled = false; E.add(gas);
H.reseed(99);
const GP = Array.from({ length: NP }, () => ({ u: Math.sqrt(H.rnd()), a: H.rnd() * Math.PI * 2, h: H.rnd(), d: H.rnd(), fuel: H.rnd() < 0.22, j: H.rnd() * 10 }));
// fuel mist from the injector
const NS = 90, spray = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.012, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.0, 0.25), toneMapped: false }), NS);
spray.frustumCulled = false; E.add(spray);
const SP = Array.from({ length: NS }, () => ({ d: H.rnd(), s: H.rnd() * 2 - 1, q: H.rnd() * 2 - 1 }));
// heat haze particles for the heat shot
const NH = 220, haze = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.6, 0.15), toneMapped: false, transparent: true, opacity: 0.85 }), NH);
haze.frustumCulled = false; E.add(haze);
const HZ = Array.from({ length: NH }, () => ({ x: H.rnd(), y: H.rnd(), z: H.rnd(), s: H.rnd(), src: H.rnd() < 0.55 ? 0 : 1 }));

// laser sweep plane (the cut)
const laser = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 4, 1.6), transparent: true, opacity: 0.12, side: THREE.DoubleSide, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
E.add(laser);
const laserEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.6, 6, 2.4), toneMapped: false }));
E.add(laserEdge);

// ---------- bicycle pedal (the analogy) ----------
const bike = new THREE.Group(); bike.position.set(1.0, -0.2, 3.4); E.add(bike);
const bikeParts = {};
{
  const ring = new THREE.Group(); bike.add(ring); bikeParts.ring = ring;
  const cr = sh(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 12, 96), metal(0x2a2d31, 0.3))); ring.add(cr);
  const tt = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.07, 0.03), metal(0x2a2d31, 0.3), 48); const m4 = new THREE.Matrix4();
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; m4.makeRotationZ(a).setPosition(Math.sin(-a) * 0.67, Math.cos(a) * 0.67, 0); tt.setMatrixAt(i, m4); } ring.add(tt);
  for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.03), metal(0x2a2d31, 0.3)); sp.rotation.z = (i / 5) * Math.PI * 2; sp.position.set(Math.sin(-(i / 5) * Math.PI * 2) * 0.31, Math.cos((i / 5) * Math.PI * 2) * 0.31, 0); ring.add(sp); }
  const arm = sh(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.85, 0.06, 2, 0.03), metal(0xcfd3d8, 0.15))); arm.position.set(0, 0.42, 0.06); ring.add(arm);
  const ped = new THREE.Group(); bike.add(ped); bikeParts.ped = ped;
  const pb = sh(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.06, 0.24, 2, 0.02), paint(0x15161a, 0.5))); ped.add(pb);
  const legMat = paint(0x4fc3bd, 0.5);
  bikeParts.thigh = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 1, 6, 16), legMat)); bike.add(bikeParts.thigh);
  bikeParts.shin = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 1, 6, 16), legMat)); bike.add(bikeParts.shin);
  bikeParts.foot = sh(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.1, 0.16, 2, 0.04), legMat)); bike.add(bikeParts.foot);
}
const placeCap = (m, a, b, r0) => { const d = b.clone().sub(a); const L = d.length(); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(1, (L - 2 * r0) / 1 > 0 ? (L - 2 * r0) : 0.01, 1); };

// ---------- Otto's 1876 engine (sepia flashback) ----------
const OT = new THREE.Group(); OT.visible = false; scene.add(OT);
const otto = {};
{
  const iron = paint(0x2c3a2e, 0.55), brass = metal(0xc9a24a, 0.25), steelO = metal(0x9aa0a6, 0.3);
  const base = sh(new THREE.Mesh(new RoundedBoxGeometry(6.2, 0.8, 1.6, 4, 0.12), iron)); base.position.y = -1.0; OT.add(base);
  const cyl = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.4, 48), iron)); cyl.rotation.z = Math.PI / 2; cyl.position.set(1.4, 0.15, 0); OT.add(cyl);
  for (const x of [0.25, 2.55]) { const f = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.14, 48), iron)); f.rotation.z = Math.PI / 2; f.position.set(x, 0.15, 0); OT.add(f); }
  for (let i = 0; i < 9; i++) { const f = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.04, 48), iron)); f.rotation.z = Math.PI / 2; f.position.set(0.5 + i * 0.24, 0.15, 0); OT.add(f); }
  const pedestal = sh(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.0), iron)); pedestal.position.set(1.4, -0.45, 0); OT.add(pedestal);
  const cup = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 24), brass)); cup.position.set(1.0, 0.95, 0); OT.add(cup);
  const cup2 = cup.clone(); cup2.position.x = 2.0; OT.add(cup2);
  const bearing = sh(new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.5, 0.5), iron)); bearing.position.set(-1.8, -0.15, 0); OT.add(bearing);
  otto.wheel = new THREE.Group(); otto.wheel.position.set(-1.8, 0.6, 0.9); OT.add(otto.wheel);
  const rimO = sh(new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 20, 96), iron)); otto.wheel.add(rimO);
  for (let i = 0; i < 6; i++) { const sp = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.3, 12), iron)); sp.rotation.z = (i / 6) * Math.PI; otto.wheel.add(sp); }
  const hubO = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.35, 24), brass)); hubO.rotation.x = Math.PI / 2; otto.wheel.add(hubO);
  otto.wheel2 = otto.wheel.clone(); otto.wheel2.position.z = -0.9; OT.add(otto.wheel2);
  const axle = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 16), steelO)); axle.rotation.x = Math.PI / 2; axle.position.set(-1.8, 0.6, 0); OT.add(axle);
  otto.rod = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), brass)); OT.add(otto.rod);
  otto.prod = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 12), steelO)); otto.prod.rotation.z = Math.PI / 2; OT.add(otto.prod);
}

// ---------- Orbi set: phone, laptop, the video in parts ----------
const OR = new THREE.Group(); OR.visible = false; scene.add(OR);
const shotImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
const IMG = { phone: await shotImg("shots/phone.png"), laptop: await shotImg("shots/laptop.png") };
const green = "#3dff8c";
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const phoneTex = H.canvasTex(780, 1688, () => {}), lapTex = H.canvasTex(1440, 900, () => {});
const vidTex = H.canvasTex(1024, 576, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#1b2433"); gr.addColorStop(1, "#06080c"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,255,255,0.08)"; g.lineWidth = 2; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  // a little piston drawing
  g.fillStyle = "#c9ced4"; g.fillRect(420, 150, 180, 120); g.fillStyle = "#8d949c"; g.beginPath(); g.moveTo(490, 270); g.lineTo(530, 270); g.lineTo(560, 420); g.lineTo(460, 420); g.closePath(); g.fill();
  g.fillStyle = "#ff8a3d"; g.beginPath(); g.arc(510, 120, 40, 0, 7); g.fill();
  g.fillStyle = "rgba(0,0,0,0.45)"; g.beginPath(); g.arc(w / 2, h / 2, 70, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(w / 2 - 22, h / 2 - 36); g.lineTo(w / 2 + 38, h / 2); g.lineTo(w / 2 - 22, h / 2 + 36); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(0, h - 86, w, 86); g.fillStyle = "#fff"; g.font = "700 40px M"; g.fillText("engine-test.mp4", 32, h - 30); g.fillStyle = green; g.textAlign = "right"; g.fillText("12.4 GB", w - 32, h - 30);
});
const phone = new THREE.Group(); OR.add(phone);
{
  const body = sh(new THREE.Mesh(new RoundedBoxGeometry(0.78, 1.62, 0.085, 6, 0.1), metal(0x2c2f34, 0.25))); phone.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.56), new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false, color: 0xbdbdbd })); scr.position.z = 0.044; phone.add(scr);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.56), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, clearcoat: 1 })); glass.position.z = 0.045; phone.add(glass);
  const isl = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.01, 2, 0.02), matte(0x000000)); isl.position.set(0, 0.72, 0.046); phone.add(isl);
}
const laptop = new THREE.Group(); OR.add(laptop);
const lid = new THREE.Group(); laptop.add(lid);
{
  const base = sh(new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.09, 2.05, 4, 0.04), metal(0xa9afb6, 0.3))); base.position.z = 1.02; laptop.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.95), matte(0x1d1f22, 0.6)); kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.047, 0.72); laptop.add(kb);
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), metal(0x9ba1a8, 0.35)); tp.rotation.x = -Math.PI / 2; tp.position.set(0, 0.047, 1.6); laptop.add(tp);
  const back = sh(new THREE.Mesh(new RoundedBoxGeometry(3.0, 1.95, 0.06, 4, 0.04), metal(0xa9afb6, 0.3))); back.position.y = 0.975; lid.add(back);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.84, 1.775), new THREE.MeshBasicMaterial({ map: lapTex, toneMapped: false, color: 0xbdbdbd })); scr.position.set(0, 0.99, 0.032); lid.add(scr);
  lid.rotation.x = -0.18;
}
const PARTS = [];
{
  const nx = 4, ny = 3, w = 1.6, h = 0.9;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const g = new THREE.BoxGeometry(w / nx - 0.012, h / ny - 0.012, 0.04);
    const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / nx, (ny - 1 - j + uv.getY(k)) / ny);
    const front = new THREE.MeshStandardMaterial({ map: vidTex, roughness: 0.4, emissive: new THREE.Color(0x3dff8c), emissiveIntensity: 0 });
    const m = new THREE.Mesh(g, [matte(0x0d0f12), matte(0x0d0f12), matte(0x0d0f12), matte(0x0d0f12), front, matte(0x0d0f12)]);
    m.castShadow = true;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: new THREE.Color(0.3, 1.6, 0.8), transparent: true, opacity: 0, toneMapped: false })); m.add(edge);
    OR.add(m);
    PARTS.push({ m, edge, front, home: V((i - (nx - 1) / 2) * (w / nx), ((ny - 1) / 2 - j) * (h / ny), 0), n: j * nx + i });
  }
}
const lock = new THREE.Group(); OR.add(lock);
{
  const lm = glow(0x3dff8c, 2.2);
  const bodyL = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.28, 0.1, 3, 0.04), lm); lock.add(bodyL);
  const shk = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 12, 32, Math.PI), lm); shk.position.y = 0.14; lock.add(shk);
  for (const x of [-0.11, 0.11]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 12), lm); s.position.set(x, 0.13, 0); lock.add(s); }
}
const embers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.02, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.1, 0.3), toneMapped: false }), 200);
embers.frustumCulled = false; OR.add(embers);
const EM = Array.from({ length: 200 }, () => ({ x: H.rnd() - 0.5, y: H.rnd() - 0.5, v: H.rnd(), s: H.rnd() }));
const orbiLight = new THREE.PointLight(0x3dff8c, 0, 6, 2); OR.add(orbiLight);

// ---------- overlays ----------
H.callouts({
  block: ["Cylinder block", "#9fb2c4", "cast aluminium"], cyl: ["Cylinder", "#d8432c"], piston: ["Piston", "#e6e9ec"], rings: ["Piston rings", "#ffb347", "seal the gas in"],
  rod: ["Connecting rod", "#9fb2c4"], crank: ["Crankshaft", "#ffd166"], same: ["Same idea", "#4fc3bd", "push down → it turns"],
  head: ["Cylinder head", "#9fb2c4"], vin: ["Intake valve", "#6fb6ff"], vex: ["Exhaust valve", "#c7ccd2"], cam: ["Camshaft", "#ffd166", "½ crank speed"], spring: ["Valve spring", "#2b8cff"], plug: ["Spark plug", "#fff4d6"],
  inj: ["Fuel injector", "#ffb347"], mist: ["Air + fuel mist", "#6fb6ff"], squeeze: ["Squeezed ~10×", "#ffd166", "about a tenth of the space"],
  volts: ["20,000+ volts", "#9fd0ff"], hot: ["2,000 °C+", "#ff8a3d"], tonnes: ["A few tonnes", "#ff5a36", "of force on the piston"], out: ["To the tailpipe", "#aab2ba"],
  flywheel: ["Flywheel", "#ffd166", "heavy: stores spin"], gear: ["Gearbox", "#9fb2c4"], wheels: ["To your wheels", "#4fc3bd"],
  rad: ["Radiator", "#6fb6ff", "dumps heat"], exh: ["Exhaust", "#ff5a36", "hot gas out"],
  locked: ["Locked on your phone", green, "AES-256, before it leaves"], parts3: ["3 parts at once", green],
});
hudEl("stroke", `<div style="width:900px;margin-left:90px;padding:26px 30px;border-radius:28px;background:rgba(10,12,16,0.72);border:1.5px solid rgba(255,255,255,0.18)">
  <div style="display:flex;justify-content:space-between;align-items:center"><div id="sk" style="font:700 30px M;letter-spacing:.24em;color:#9aa6b2">STROKE 1 / 4</div><div id="sdeg" style="font:700 30px M;color:#9aa6b2">0°</div></div>
  <div style="display:flex;gap:12px;margin-top:20px">${["INTAKE", "SQUEEZE", "POWER", "EXHAUST"].map((s, i) => `<div id="seg${i}" style="flex:1;padding:16px 0;border-radius:14px;text-align:center;font:800 28px D;letter-spacing:.06em;background:rgba(255,255,255,0.06);color:#7c8794">${s}</div>`).join("")}</div>
  <div style="margin-top:22px;display:flex;align-items:center;gap:18px"><div style="font:700 24px M;color:#9aa6b2;letter-spacing:.16em">PRESSURE</div><div style="flex:1;height:18px;border-radius:9px;background:rgba(255,255,255,0.08);overflow:hidden"><div id="pbar" style="height:100%;width:10%;border-radius:9px;background:linear-gradient(90deg,#6fb6ff,#ffd166,#ff5a36)"></div></div></div>
</div>`, { left: "0px", top: "1440px" });
hudEl("dial", `<svg width="420" height="420" viewBox="-210 -210 420 420"><circle r="170" fill="rgba(10,12,16,0.7)" stroke="rgba(255,255,255,0.15)" stroke-width="3"/>
  <g id="dsegs"></g><line id="dneedle" x1="0" y1="0" x2="0" y2="-150" stroke="#fff" stroke-width="8" stroke-linecap="round"/><circle r="14" fill="#fff"/>
  <text id="dturn" y="70" text-anchor="middle" style="font:800 46px D;fill:#fff">TURN 1</text><text y="112" text-anchor="middle" style="font:700 22px M;fill:#9aa6b2;letter-spacing:4px">OF 2</text></svg>`, { left: "330px", top: "380px" });
{
  const segs = [["#ff5a36", 0], ["#aab2ba", 1], ["#6fb6ff", 2], ["#ffd166", 3]]; // power, exhaust, intake, compression around 720°
  const g = document.getElementById("dsegs"); let html = "";
  for (const [col, i] of segs) { const a0 = (i * 180 - 90) * D2R / 2 * 2 / 2, a1 = ((i + 1) * 180 - 90) * D2R / 2 * 2 / 2; }
  // the dial shows one crank turn; two rings (inner = turn 1, outer = turn 2)
  for (let turn = 0; turn < 2; turn++) for (let h = 0; h < 2; h++) {
    const idx = turn * 2 + h, col = segs[idx][0], rad0 = 150 - turn * 34;
    const a0 = (h * 180 - 90) * D2R, a1 = ((h + 1) * 180 - 90) * D2R;
    html += `<path d="M${Math.cos(a0) * rad0},${Math.sin(a0) * rad0} A${rad0},${rad0} 0 0 1 ${Math.cos(a1) * rad0},${Math.sin(a1) * rad0}" fill="none" stroke="${col}" stroke-width="22" id="ds${idx}" opacity="0.25"/>`;
  }
  g.innerHTML = html;
}
hudEl("legend", `<div style="display:flex;gap:14px;justify-content:center;width:1080px">${[["INTAKE", "#6fb6ff"], ["SQUEEZE", "#ffd166"], ["POWER", "#ff5a36"], ["EXHAUST", "#aab2ba"]].map(([s, c]) => `<div style="padding:14px 20px;border-radius:999px;background:rgba(10,12,16,0.75);border:1.5px solid ${c};font:700 26px M;letter-spacing:.1em;color:${c}">${s}</div>`).join("")}</div>`, { left: "0px", top: "1460px" });
hudEl("order", `<div id="ordr" style="display:flex;gap:40px;justify-content:center;width:1080px;font:900 150px D;color:#fff">${[1, 3, 4, 2].map((n, i) => `<span id="ord${i}" style="opacity:.25;text-shadow:0 8px 30px rgba(0,0,0,.6)">${n}</span>`).join("")}</div>`, { left: "0px", top: "170px" });
hudEl("rpm", `<div style="width:1080px;text-align:center"><div id="rpmv" style="font:900 170px/1 D;font-stretch:112%;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)">0</div><div style="font:700 34px M;letter-spacing:.3em;color:#3dff8c;margin-top:10px">REVS PER MINUTE</div></div>`, { left: "0px", top: "300px" });
hudEl("facts", `<div style="width:1080px;display:flex;flex-direction:column;align-items:center;gap:18px">
  <div id="f1" style="padding:20px 34px;border-radius:20px;background:rgba(10,12,16,0.8);border:1.5px solid rgba(255,255,255,.2);font:800 44px D;color:#fff"><span style="color:#ffd166">100×</span> a second: stop + reverse</div>
  <div id="f2" style="padding:20px 34px;border-radius:20px;background:rgba(10,12,16,0.8);border:1.5px solid rgba(255,255,255,.2);font:800 44px D;color:#fff"><span style="color:#ff5a36">25</span> sparks a second, each cylinder</div></div>`, { left: "0px", top: "1440px" });
hudEl("energy", `<div style="width:920px;margin-left:80px;padding:28px 30px;border-radius:26px;background:rgba(10,12,16,0.78);border:1.5px solid rgba(255,255,255,.18)">
  <div style="font:700 26px M;letter-spacing:.2em;color:#9aa6b2;margin-bottom:18px">WHERE THE FUEL'S ENERGY GOES</div>
  <div style="display:flex;height:84px;border-radius:16px;overflow:hidden"><div id="e1" style="width:33%;background:#3dff8c;display:grid;place-items:center;font:900 34px D;color:#06110a">≈⅓ MOVES YOU</div><div id="e2" style="flex:1;background:linear-gradient(90deg,#ff5a36,#b3200f);display:grid;place-items:center;font:900 34px D;color:#fff">≈⅔ HEAT</div></div></div>`, { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["LOGIN", 0], ["APP", 0], ["BROWSER", 1]].map(([s, ok], i) => `<div id="ch${i}" style="position:relative;padding:22px 30px;border-radius:22px;background:${ok ? "#3dff8c" : "rgba(255,255,255,.95)"};color:#0b0d10;font:900 44px D;letter-spacing:.04em">${s}<span style="position:absolute;right:-18px;top:-18px;width:52px;height:52px;border-radius:50%;background:${ok ? "#0b0d10" : "#ff3b3b"};color:${ok ? "#3dff8c" : "#fff"};display:grid;place-items:center;font:900 32px Arial">${ok ? "✓" : "✕"}</span></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("timer", `<div id="tmr" style="width:1080px;text-align:center;font:800 130px M;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)">30:00</div>`, { left: "0px", top: "1440px" });
hudEl("prog", `<div style="width:900px;margin-left:90px;padding:24px 28px;border-radius:24px;background:rgba(10,12,16,0.8);border:1.5px solid rgba(255,255,255,.18)">
  <div style="display:flex;justify-content:space-between;font:700 28px M;color:#cfd6dd"><span>engine-test.mp4</span><span id="pgt" style="color:#3dff8c">0 / 12 parts</span></div>
  <div style="display:flex;gap:6px;margin-top:18px">${Array.from({ length: 12 }, (_, i) => `<div id="pg${i}" style="flex:1;height:26px;border-radius:6px;background:rgba(255,255,255,.08)"></div>`).join("")}</div>
  <div id="pgs" style="margin-top:16px;font:700 26px M;color:#9aa6b2;letter-spacing:.08em">3 PARTS IN FLIGHT</div></div>`, { left: "0px", top: "1440px" });
hudEl("wifi", `<svg width="190" height="190" viewBox="-95 -95 190 190"><circle r="90" fill="rgba(10,12,16,.82)" stroke="rgba(255,255,255,.2)" stroke-width="3"/>
  <g id="wfg" fill="none" stroke="#3dff8c" stroke-width="12" stroke-linecap="round"><path d="M-50,-8 A70,70 0 0 1 50,-8"/><path d="M-30,14 A42,42 0 0 1 30,14"/><circle cx="0" cy="36" r="7" fill="#3dff8c"/></g>
  <path id="wfx" d="M-46,-46 L46,46" stroke="#ff3b3b" stroke-width="14" stroke-linecap="round" opacity="0"/></svg>`, { left: "445px", top: "420px" });
hudEl("big", `<div id="bigt" style="width:1080px;text-align:center;font:900 250px/0.9 D;font-stretch:115%;color:#fff;text-shadow:0 14px 50px rgba(0,0,0,.7)">100</div><div id="bigs" style="width:1080px;text-align:center;font:800 46px D;color:#ffd166;letter-spacing:.06em;margin-top:6px">EXPLOSIONS EVERY SECOND</div>`, { left: "0px", top: "300px" });

// ---------- the engine's crank angle over time (keyframes, synced to the voice) ----------
// G = global crank angle (deg). Cylinder i's cycle angle c = (G − OFF[i]) mod 720: 0 = spark (power stroke starts).
const KF = [];
{
  const s1 = fr("intake", 0.3), sHead = at("block");
  let G = 720 + 360; // cylinder 1 starts intake (c = 360) at s1
  const g0 = G - (s1 - sHead) * 70;          // slow (70°/s) while the parts are named
  KF.push([0, g0 - sHead * 260], [sHead, g0], [s1, G]);
  KF.push([fr("intake", 0.97), G += 180]);
  KF.push([fr("comp", 0.22), G + 4], [fr("comp", 0.97), G += 172]);           // up to 712
  KF.push([fr("power", 0.2), G += 8]);                                          // 720 = spark
  KF.push([fr("power", 0.62), G += 16], [fr("power", 0.98), G += 156]);         // 900 = bottom
  KF.push([fr("exhaust", 0.18), G += 2], [fr("exhaust", 0.9), G += 178]);       // 1080 = top again
  KF.push([at("turns"), G += 20], [end("turns"), G += 720], [end("four"), G += 160 * (end("four") - end("turns"))]);
  KF.push([end("fly"), G += 260 * (end("fly") - end("four"))]);
  // speed: ramp the visible engine up (sub-frame blur does the rest)
  const a = at("speed"), b = end("speed");
  let g = G, prevT = end("fly");
  for (let k = 1; k <= 40; k++) { const t = lerp(prevT, b, k / 40); const w = lerp(260, 2600, smooth(clamp((t - a) / (b - a) * 1.4))); g += w * (t - lerp(prevT, b, (k - 1) / 40)); KF.push([t, g]); }
  G = g; prevT = b;
  const z = window.DURATION + 1; KF.push([z, G + 300 * (z - b)]);
}
function crankG(t) { for (let i = 1; i < KF.length; i++) if (t <= KF[i][0]) { const [t0, g0] = KF[i - 1], [t1, g1] = KF[i]; return lerp(g0, g1, (t - t0) / (t1 - t0)); } return KF[KF.length - 1][1]; }
const mod = (a, n) => ((a % n) + n) % n;
const crownY = (c) => pinY(c * D2R) + CROWN;
function stroke(c) { return c < 180 ? 2 : c < 360 ? 3 : c < 540 ? 0 : 1; } // 0 intake 1 comp 2 power 3 exhaust
const SCOL = [new THREE.Color(0.35, 0.65, 1.6), new THREE.Color(1.6, 1.25, 0.3), new THREE.Color(3.2, 1.0, 0.25), new THREE.Color(0.6, 0.62, 0.66)];

function setEngine(t) {
  const G = crankG(t);
  crank.rotation.x = G * D2R;
  for (const c of CYL) {
    const cy = mod(G - OFF[c.i], 720), th = cy * D2R;
    const py = pinY(th), pz = 0;
    const cpY = R * Math.cos(th), cpZ = R * Math.sin(th);
    c.piston.position.set(c.x, py, pz);
    c.rod.position.set(c.x, cpY, cpZ); c.rod.rotation.x = Math.atan2(pz - cpZ, py - cpY);
    for (const k of ["in", "ex"]) {
      const peak = k === "in" ? 450 : 270;
      const d = mod(cy - peak + 360, 720) - 360, dl = d * D2R / 2;
      const lift = 0.09 * Math.pow(Math.max(0, Math.cos(dl)), 3);
      const v = c.v[k]; v.lift = lift; v.valve.position.y = -lift; v.spring.scale.y = 0.27 - lift;
      const base = Math.atan2(-U[k].z, -U[k].y); v.lobe.rotation.x = -(base + dl) + Math.PI;
    }
    c.cy = cy;
    // glow disc on top of the piston, coloured by stroke
    c.glow.position.set(c.x, crownY(cy) + 0.05, 0);
  }
  for (const s of sprockets) s.g.rotation.x = (s.rr > 0.3 ? G / 2 : G) * D2R;
  fly.rotation.x = G * D2R; shaft.rotation.x = G * D2R * 0.8; wheel.rotation.x = G * D2R * 0.25;
  return G;
}
// cam lobe check: lobe tip direction at peak must point at the valve (−U). rotation.x = β maps +y to (cos β, sin β) in (y,z).
// We want (y,z) ∝ −U  → β = atan2(−U.z, −U.y). Our formula: −(base + dl) + π with base = atan2(−U.z, −U.y) — fixed below.
for (const c of CYL) for (const k of ["in", "ex"]) c.v[k].lobe.userData.k = k;
function fixLobes(G) {
  for (const c of CYL) for (const k of ["in", "ex"]) {
    const peak = k === "in" ? 450 : 270;
    const d = mod(c.cy - peak + 360, 720) - 360, dl = d * D2R / 2;
    c.v[k].lobe.rotation.x = Math.atan2(-U[k].z, -U[k].y) - dl;
  }
}

function gasFrame(t, show) {
  const c = CYL[0], cy = c.cy, x = c.x;
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  const crown = crownY(cy);
  const runner = runnersIn[0], exr = runnersEx[0];
  const volPos = (p, crownNow, jit) => {
    const rad = 0.39 * p.u, top = DECK + 0.2 * (1 - (rad / 0.43)) + 0.06;
    const y = crownNow + 0.02 + p.h * Math.max(0.02, top - crownNow - 0.03);
    const a = p.a + jit;
    return V(x + Math.cos(a) * rad * 0.98, y, Math.sin(a) * rad);
  };
  const IG = V(x, SEAT.in.y - 0.05, SEAT.in.z + 0.02), EG = V(x, SEAT.ex.y - 0.05, SEAT.ex.z - 0.02);
  let fl = 0;
  for (let i = 0; i < NP; i++) {
    const p = GP[i]; let pos = null, sc = 1;
    const swirl = Math.sin(t * 1.3 + p.j) * 0.25;
    if (!show) { m4.makeScale(0, 0, 0); gas.setMatrixAt(i, m4); continue; }
    if (cy >= 360 && cy < 540) {
      const k = (cy - 360) / 180, e = (k * 1.25 - p.d) / 0.28;
      if (e >= 1) pos = volPos(p, crown, swirl);
      else if (e >= 0) { const v = volPos(p, crown, swirl); pos = e < 0.5 ? runner.getPoint(0).lerp(IG, e / 0.5) : IG.clone().lerp(v, (e - 0.5) / 0.5); }
      else { const u = clamp(-e * 0.18); pos = runner.getPoint(clamp(u)); pos.y += Math.sin(p.j * 7) * 0.05; pos.z += Math.cos(p.j * 5) * 0.05; if (u >= 1) sc = 0; }
      col.copy(p.fuel ? new THREE.Color(1.5, 1.0, 0.25) : SCOL[0]);
    } else if (cy >= 540) {
      const k = (cy - 540) / 180; pos = volPos(p, crown, swirl);
      col.copy(p.fuel ? new THREE.Color(1.5, 1.0, 0.25) : SCOL[0]).lerp(new THREE.Color(1.1, 0.85, 0.3), k * k);
    } else if (cy < 180) {
      pos = volPos(p, crown, swirl + cy * 0.01);
      const rf = clamp(cy / 12) * 0.62, dist = pos.distanceTo(V(x, ROOF - 0.04, 0));
      const burnt = dist < rf ? 1 : 0, age = clamp((cy - (dist / 0.62) * 12) / 120);
      col.set(1.1, 0.85, 0.3).lerp(new THREE.Color(1.5, 0.75, 0.25), burnt).lerp(new THREE.Color(1.1, 0.35, 0.12), burnt * age);
      sc = 1 + burnt * (1 - age) * 0.6;
    } else {
      const k = (cy - 180) / 180, e = (k * 1.2 - p.d) / 0.28;
      const v = volPos(p, crown, swirl);
      if (e <= 0) pos = v; else if (e < 0.5) pos = v.lerp(EG, e / 0.5); else { const u = clamp((e - 0.5) * 0.5); pos = exr.getPoint(u); pos.y += Math.sin(p.j * 7) * 0.05; if (u >= 0.98) sc = 0; }
      col.set(0.55, 0.45, 0.4);
    }
    m4.makeScale(sc, sc, sc).setPosition(pos); gas.setMatrixAt(i, m4); gas.setColorAt(i, col);
  }
  gas.instanceMatrix.needsUpdate = true; if (gas.instanceColor) gas.instanceColor.needsUpdate = true;
  // spray: during the intake stroke, a cone of fuel droplets from the injector nozzle toward the valve
  const nozzle = c.inj.localToWorld(V(0, 0, 0.13)), aim = V(x, SEAT.in.y + 0.02, SEAT.in.z + 0.02);
  for (let i = 0; i < NS; i++) {
    const p = SP[i]; const on = show && cy > 375 && cy < 500;
    if (!on) { m4.makeScale(0, 0, 0); spray.setMatrixAt(i, m4); continue; }
    const u = mod(p.d + t * 1.6, 1); const q = nozzle.clone().lerp(aim, u); q.x += p.s * 0.09 * u; q.y += p.q * 0.06 * u; q.z += p.q * 0.05 * u;
    m4.makeScale(1, 1, 1).setPosition(q); spray.setMatrixAt(i, m4);
  }
  spray.instanceMatrix.needsUpdate = true;
  // spark + flame + light
  const sp = show ? Math.max(0, 1 - Math.abs(mod(cy + 4, 720) - 4) / 3.5) : 0;
  sparkM.position.set(x + 0.02, ROOF - 0.05, 0); sparkM.scale.setScalar(0.4 + sp * 1.8); sparkM.visible = sp > 0.01;
  sparkL.position.copy(sparkM.position); sparkL.intensity = sp * 5;
  const fk = show && cy < 160 ? clamp(cy / 3) * (1 - clamp((cy - 25) / 120)) : 0;
  const rf = clamp(cy / 12) * 0.42;
  flame.visible = fk > 0.01; flame.position.set(x, ROOF - 0.06 - rf * 0.35, 0); flame.scale.set(rf * 0.98, Math.max(0.02, Math.min(rf, (ROOF - crown) * 0.62)), rf); flameMat.uniforms.k.value = fk; flameMat.uniforms.t.value = t;
  flameL.position.set(x + 0.15, (crown + ROOF) / 2, 0); flameL.intensity = fk * 7;
  return fl;
}

function cutTo(mode, k) {
  // mode "x": slice through cylinder 1's centre (k: 0 closed → 1 cut). "z": front half removed.
  if (mode === "none") { cut.normal.set(-1, 0, 0); cut.constant = 1000; laser.visible = laserEdge.visible = false; return; }
  if (mode === "x") {
    const pos = lerp(3.8, CX[0], k); cut.normal.set(-1, 0, 0); cut.constant = pos;
    laser.visible = laserEdge.visible = k > 0 && k < 1; laser.position.set(pos, 1.3, 0); laser.rotation.set(0, Math.PI / 2, 0); laser.scale.set(3.6, 5.6, 1);
    laserEdge.position.copy(laser.position); laserEdge.rotation.copy(laser.rotation); laserEdge.scale.copy(laser.scale);
  } else {
    const pos = lerp(2.2, 0, k); cut.normal.set(0, 0, -1); cut.constant = pos;
    laser.visible = laserEdge.visible = k > 0 && k < 1; laser.position.set(0, 1.3, pos); laser.rotation.set(0, 0, 0); laser.scale.set(5.2, 5.6, 1);
    laserEdge.position.copy(laser.position); laserEdge.rotation.copy(laser.rotation); laserEdge.scale.copy(laser.scale);
  }
}

// ---------- phone + laptop screens (real orbitransfer.com captures + the transfer drawn on top) ----------
function drawPhone(st) {
  const g = phoneTex.userData.g; g.drawImage(IMG.phone, 0, 0, 780, 1688);
  if (st.sheet > 0) {
    g.globalAlpha = st.sheet; g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(0, 0, 780, 1688);
    const y = 1688 - 640 * out(st.sheet);
    g.fillStyle = "#101317"; rr(g, 24, y, 732, 600, 44); g.fill(); g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 3; g.stroke();
    g.drawImage(vidTex.userData.c, 64, y + 80, 652, 367);
    g.fillStyle = "#fff"; g.font = "800 38px D"; g.fillText(st.label || "Sending…", 64, y + 500);
    g.fillStyle = "rgba(255,255,255,.1)"; rr(g, 64, y + 530, 652, 26, 13); g.fill();
    g.fillStyle = green; rr(g, 64, y + 530, Math.max(26, 652 * st.p), 26, 13); g.fill();
    if (st.lock > 0) { g.globalAlpha = st.lock * st.sheet; g.fillStyle = green; g.font = "700 28px M"; g.fillText("● LOCKED ON THIS PHONE", 64, y + 58); }
    g.globalAlpha = 1;
  }
  if (st.tap > 0 && st.tap < 1) { g.strokeStyle = `rgba(255,255,255,${1 - st.tap})`; g.lineWidth = 8; g.beginPath(); g.arc(220, 1590, 30 + 60 * st.tap, 0, 7); g.stroke(); }
  phoneTex.needsUpdate = true;
}
function drawLaptop(st) {
  const g = lapTex.userData.g; g.drawImage(IMG.laptop, 0, 0, 1440, 900);
  if (st.card > 0) {
    g.globalAlpha = st.card; const x = 470, y = 230 + (1 - out(st.card)) * 40;
    g.fillStyle = "#0f1216"; rr(g, x, y, 500, 400, 28); g.fill(); g.strokeStyle = st.done ? green : "rgba(255,255,255,.2)"; g.lineWidth = 3; g.stroke();
    g.drawImage(vidTex.userData.c, x + 24, y + 24, 452, 254);
    g.fillStyle = "#fff"; g.font = "800 28px D"; g.fillText(st.done ? "engine-test.mp4" : "Arriving…", x + 24, y + 318);
    g.fillStyle = "rgba(255,255,255,.1)"; rr(g, x + 24, y + 340, 452, 16, 8); g.fill(); g.fillStyle = green; rr(g, x + 24, y + 340, Math.max(16, 452 * st.p), 16, 8); g.fill();
    if (st.done) { g.fillStyle = green; g.font = "700 20px M"; g.textAlign = "right"; g.fillText(st.burn || "UNLOCKED · OPEN", x + 476, y + 318); g.textAlign = "left"; }
    g.globalAlpha = 1;
  }
  lapTex.needsUpdate = true;
}

// ---------- shots ----------
const P = (x, y, z) => V(x, y, z);
const C1 = () => V(CX[0], 1.75, 0);
let lastPhone = "", lastLap = "";
H.frame("Send a big video, phone to laptop", async (t) => {
  const G = setEngine(t); fixLobes(G);
  const engineOn = t < at("orbi") + 3.2 && !(t >= at("otto") && t < end("otto") + 0.1);
  E.visible = engineOn; OT.visible = t >= at("otto") && t < end("otto") + 0.1; OR.visible = t >= at("orbi") + 3.2;
  H.backdrop.material.uniforms.top.value.set(0x1a1f27); H.bloom.strength = 0.32;
  for (const c of CYL) c.glow.material.opacity = 0;
  exhMat.emissiveIntensity = 0; haze.visible = false; bike.visible = false; bell.visible = gbox.visible = true;
  let gasOn = false;
  H.zoom = t < at("block") ? 1.35 : t < at("crank") ? 1.95 : t < at("head") ? 1.9 : t < at("intake") ? 1.85 : t < at("turns") ? 2.15 : t < at("four") ? 1.35 : t < at("fly") ? 1.0 : t < at("speed") ? 1.15 : t < at("otto") ? 1.25 : t < end("otto") + 0.1 ? 1.3 : t < at("orbi") + 3.2 ? 1.3 : 1.0;
  const cyl1 = C1();

  // ---- HOOK: closed engine, hero orbit, a flash at every firing, then the laser cut
  if (t < at("block")) {
    const cutA = fr("hook", 0.74), cutB = end("hook") + 0.3;
    cutTo("x", ease(prog(t, cutA, cutB)));
    const a = lerp(0.95, 0.35, ease(prog(t, 0, cutA)));
    const c = V(0, 1.2, 0);
    if (t < cutA) move(t, 0, cutA, [H.orbitP(c, 1.25, 11.5, 1.4), c, 34], [H.orbitP(c, 0.75, 9.5, 2.4), V(0, 1.5, 0), 34]);
    else move(t, cutA, at("block"), [H.orbitP(c, 0.75, 9.5, 2.4), V(0, 1.5, 0), 34], [V(7.2, 2.6, 4.2), V(1.0, 1.5, 0), 32]);
    // firings: exhaust glows on each power pulse
    let pulse = 0; for (const cc of CYL) if (cc.cy < 40) pulse = Math.max(pulse, 1 - cc.cy / 40);
    exhMat.emissiveIntensity = pulse * 0.9; H.bloom.strength = 0.45;
    hudShow("big", win(t, fr("hook", 0.05), fr("hook", 0.5)), { transform: `scale(${lerp(1.25, 1, out(prog(t, fr("hook", 0.05), fr("hook", 0.15))))})` });
    H.$("bigt").textContent = String(Math.round(lerp(0, 100, ease(prog(t, fr("hook", 0.08), fr("hook", 0.3))))));
    title(t, fr("hook", 0.5), fr("hook", 0.72), "4 cylinders · 3,000 rpm", "You feel<br>none of them");
    if (t > cutA - 0.2) flash(t, cutA + 0.05, 0.25, 4, "#3dff8c");
  }
  // ---- BLOCK: the cut engine, name the block, cylinder, piston, rings
  else if (t < at("crank")) {
    cutTo("x", 1);
    const a = at("block"), b = at("crank");
    if (t < fr("block", 0.55)) move(t, a, fr("block", 0.55), [V(7.2, 2.6, 4.2), V(1.0, 1.5, 0), 32], [V(6.4, 1.9, 2.0), V(1.2, 1.6, 0), 30]);
    else { move(t, fr("block", 0.55), b, [V(6.4, 1.9, 2.0), V(1.2, 1.6, 0), 30], [V(3.6, 2.3, 0.9), V(CX[0], 2.0, 0), 24]); H.bokeh.enabled = true; H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(V(CX[0], 2.0, 0)); H.bokeh.uniforms.aperture.value = 0.0012; }
    callout("block", t, fr("block", 0.02), fr("block", 0.5), V(CX[0], 1.0, -0.6), 300, 520);
    callout("cyl", t, fr("block", 0.2), fr("block", 0.55), V(CX[0], 1.4, -0.42), 780, 430);
    callout("piston", t, fr("block", 0.4), fr("block", 0.9), CYL[0].piston.position.clone().add(V(0, 0.1, 0.3)), 290, 860);
    callout("rings", t, fr("block", 0.68), b, CYL[0].piston.position.clone().add(V(0.02, 0.15, 0.42)), 760, 560);
  }
  // ---- CRANK: low angle on the rod + crank, then the bicycle pedal beside it
  else if (t < at("head")) {
    cutTo("x", 1); bike.visible = true;
    const a = at("crank"), m = fr("crank", 0.62), b = at("head");
    if (t < m) move(t, a, m, [V(5.4, 0.2, 2.3), V(CX[0], 0.6, 0), 30], [V(5.6, -0.4, 3.2), V(CX[0], 0.4, 0.4), 30]);
    else move(t, m, b, [V(5.6, -0.4, 3.2), V(CX[0], 0.4, 0.4), 30], [V(5.0, 0.6, 6.4), V(1.3, 0.2, 2.2), 34]);
    callout("rod", t, fr("crank", 0.08), fr("crank", 0.55), CYL[0].rod.localToWorld(V(0, 0.8, 0)), 790, 470);
    callout("crank", t, fr("crank", 0.3), fr("crank", 0.75), V(CX[0] + 0.2, -0.1, 0.4), 300, 960);
    callout("same", t, fr("crank", 0.72), b, bike.localToWorld(V(0, 0.6, 0.2)), 760, 520);
  }
  // ---- HEAD: tilt up to the valves, cams, springs, plug
  else if (t < at("intake")) {
    cutTo("x", 1);
    const a = at("head"), m = fr("head", 0.55), b = at("intake");
    if (t < m) move(t, a, m, [V(5.0, 2.6, 2.4), V(CX[0], 2.6, 0), 30], [V(4.4, 3.3, 1.3), V(CX[0], 2.9, 0), 26]);
    else move(t, m, b, [V(4.4, 3.3, 1.3), V(CX[0], 2.9, 0), 26], [V(4.8, 2.8, 0.6), V(CX[0], 2.6, 0), 24]);
    H.bokeh.enabled = true; H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(V(CX[0], 2.7, 0)); H.bokeh.uniforms.aperture.value = 0.0008;
    callout("head", t, fr("head", 0.02), fr("head", 0.2), V(CX[0], Y(2.75), 0.62), 760, 380);
    callout("vin", t, fr("head", 0.18), fr("head", 0.62), V(CX[0], SEAT.in.y + 0.1, SEAT.in.z - 0.06), 250, 820);
    callout("vex", t, fr("head", 0.3), fr("head", 0.62), V(CX[0], SEAT.ex.y + 0.1, SEAT.ex.z + 0.06), 830, 820);
    callout("cam", t, fr("head", 0.5), fr("head", 0.82), CAM.in.clone().setX(CX[0] + 0.07), 270, 420);
    callout("spring", t, fr("head", 0.62), fr("head", 0.86), V(CX[0], SEAT.ex.y + 0.6, SEAT.ex.z + 0.18), 820, 470);
    callout("plug", t, fr("head", 0.82), b, V(CX[0], ROOF + 0.55, 0.05), 790, 440);
  }
  // ---- THE FOUR STROKES, close on cylinder 1 with gas, spark and flame
  else if (t < at("turns")) {
    cutTo("x", 1); gasOn = true;
    const cy = CYL[0].cy, s = stroke(cy);
    const base = [V(5.4, 1.95, 1.1), V(CX[0], 1.85, 0), 28];
    if (t < at("comp")) move(t, at("intake"), at("comp"), [V(4.8, 2.8, 0.6), V(CX[0], 2.6, 0), 24], base);
    else if (t < at("power")) move(t, at("comp"), at("power"), base, [V(5.0, 2.1, -0.9), V(CX[0], 1.95, 0), 27]);
    else if (t < at("exhaust")) {
      const s1 = fr("power", 0.12), s2 = fr("power", 0.24), s3 = fr("power", 0.62);
      if (t < s2) move(t, at("power"), s2, [V(5.0, 2.1, -0.9), V(CX[0], 1.95, 0), 27], [V(3.3, 2.35, -0.25), V(CX[0], 2.22, 0), 22]);
      else if (t < s3) move(t, s2, s3, [V(3.3, 2.35, -0.25), V(CX[0], 2.22, 0), 22], [V(3.6, 2.2, 0.3), V(CX[0], 2.1, 0), 24]);
      else move(t, s3, at("exhaust"), [V(3.6, 2.2, 0.3), V(CX[0], 2.1, 0), 24], [V(5.6, 1.6, 0.9), V(CX[0], 1.6, 0), 28]);
      // the slam: a small camera kick
      const kick = Math.max(0, 1 - Math.abs(t - fr("power", 0.78)) * 6);
      H.cam.position.y += Math.sin(t * 90) * 0.02 * kick; H.cam.position.z += Math.cos(t * 77) * 0.02 * kick;
      flash(t, fr("power", 0.2), 0.22, 6, "#cfe6ff");
    } else move(t, at("exhaust"), at("turns"), [V(5.6, 1.6, 0.9), V(CX[0], 1.6, 0), 28], [V(5.2, 2.2, 1.9), V(CX[0], 1.7, 0.3), 28]);
    // HUD: stroke panel
    const names = ["INTAKE", "SQUEEZE", "POWER", "EXHAUST"], keys = ["intake", "comp", "power", "exhaust"];
    const li = keys.findIndex((k, i) => t >= at(k) && (i === 3 || t < at(keys[i + 1])));
    hudShow("stroke", 1);
    H.$("sk").textContent = `STROKE ${li + 1} / 4`; H.$("sdeg").textContent = `${Math.round(mod(cy - 360, 720))}°`;
    for (let i = 0; i < 4; i++) S2(H.$("seg" + i), i === li ? { background: ["#6fb6ff", "#ffd166", "#ff5a36", "#aab2ba"][i], color: "#0b0d10" } : { background: "rgba(255,255,255,0.06)", color: "#7c8794" });
    const vol = (DECK + 0.2 - crownY(cy)) / (DECK + 0.2 - crownY(180));
    let pres = s === 1 ? Math.pow(1 / vol, 1.3) / 12 : s === 2 ? (cy < 15 ? lerp(0.6, 1, cy / 15) : Math.pow(1 / vol, 1.3) / 5) : 0.05;
    S2(H.$("pbar"), { width: `${clamp(pres) * 100}%` });
    title(t, at("intake") + 0.2, fr("intake", 0.4), "Stroke 1", "Intake");
    title(t, at("comp") + 0.1, fr("comp", 0.35), "Stroke 2", "Compression");
    title(t, at("power") + 0.1, fr("power", 0.2), "Stroke 3", "Power");
    title(t, at("exhaust") + 0.1, fr("exhaust", 0.35), "Stroke 4", "Exhaust");
    callout("inj", t, fr("intake", 0.45), fr("intake", 0.75), CYL[0].inj.localToWorld(V(0, 0, 0.08)), 260, 560);
    callout("mist", t, fr("intake", 0.72), end("intake"), V(CX[0], 1.6, -0.15), 290, 880);
    callout("vin", t, fr("intake", 0.4), fr("intake", 0.98), V(CX[0], SEAT.in.y - 0.04, SEAT.in.z), 800, 520);
    callout("squeeze", t, fr("comp", 0.55), end("comp"), V(CX[0], crownY(cy) + 0.08, 0.2), 760, 520);
    callout("volts", t, fr("power", 0.22), fr("power", 0.48), V(CX[0], ROOF - 0.04, 0.02), 760, 470);
    callout("hot", t, fr("power", 0.45), fr("power", 0.7), V(CX[0], ROOF - 0.15, -0.15), 290, 560);
    callout("tonnes", t, fr("power", 0.72), end("power"), CYL[0].piston.position.clone().add(V(0.1, 0.27, 0.2)), 760, 900);
    callout("vex", t, fr("exhaust", 0.3), fr("exhaust", 0.7), V(CX[0], SEAT.ex.y - 0.04, SEAT.ex.z), 800, 520);
    callout("out", t, fr("exhaust", 0.55), end("exhaust"), runnersEx[0].getPoint(0.45), 760, 860);
  }
  // ---- TURNS: pull back; a dial shows 2 crank turns, only 1 of 4 strokes pushes
  else if (t < at("four")) {
    cutTo("x", 1); gasOn = true;
    move(t, at("turns"), at("four"), [V(5.2, 2.2, 1.9), V(CX[0], 1.7, 0.3), 28], [V(8.6, 1.6, 4.0), V(0.6, 1.2, 0), 34]);
    const k = prog(t, fr("turns", 0.08), fr("turns", 0.7));
    hudShow("dial", win(t, at("turns"), at("four") + 0.2));
    const ang = k * 720;
    S2(H.$("dneedle"), { transform: `rotate(${ang}deg)` });
    H.$("dturn").textContent = ang < 360 ? "TURN 1" : "TURN 2";
    for (let i = 0; i < 4; i++) H.$("ds" + i).setAttribute("opacity", ang > i * 180 ? (i === 0 && t > fr("turns", 0.72) ? 1 : 0.85) : 0.18);
    const only = win(t, fr("turns", 0.62), at("four") + 0.2);
    if (only > 0) for (let i = 1; i < 4; i++) H.$("ds" + i).setAttribute("opacity", 0.15);
    title(t, fr("turns", 0.62), at("four") + 0.1, "1 of 4 strokes", "Pushes");
  }
  // ---- FOUR: cut the front off instead: four cylinders taking turns, firing order 1-3-4-2
  else if (t < at("fly")) {
    const k = prog(t, at("four"), fr("four", 0.12));
    if (k < 0.5) cutTo("x", 1 - ease(k * 2) * 0.0); else cutTo("z", ease((k - 0.5) * 2));
    if (k < 0.5) { cut.normal.set(-1, 0, 0); cut.constant = lerp(CX[0], 3.8, ease(k * 2)); }
    move(t, at("four"), at("fly"), [V(1.6, 3.4, 13.5), V(0, 1.0, 0), 38], [V(-1.2, 3.0, 12.6), V(0, 1.0, 0), 38]);
    for (const c of CYL) { const s = stroke(c.cy); c.glow.material.color.copy(SCOL[s]); c.glow.material.opacity = 0.5 + (s === 2 ? 0.5 * (1 - c.cy / 180) : 0); }
    hudShow("legend", win(t, fr("four", 0.12), at("fly")));
    hudShow("order", win(t, fr("four", 0.12), fr("four", 0.62)));
    const steps = [fr("four", 0.18), fr("four", 0.25), fr("four", 0.31), fr("four", 0.38)];
    for (let i = 0; i < 4; i++) S2(H.$("ord" + i), { opacity: t > steps[i] ? 1 : 0.25, color: t > steps[i] && t < steps[i] + 0.5 ? "#ff5a36" : "#fff" });
    title(t, fr("four", 0.66), at("fly"), "Always", "One pushing");
    let pulse = 0; for (const cc of CYL) if (cc.cy < 30) pulse = Math.max(pulse, 1 - cc.cy / 30);
    exhMat.emissiveIntensity = pulse * 0.5;
  }
  // ---- FLY: along to the flywheel, gearbox, driveshaft, wheel
  else if (t < at("speed")) {
    cutTo("z", 1);
    const a = at("fly"), m = fr("fly", 0.45), b = at("speed");
    if (t < m) move(t, a, m, [V(-1.2, 3.0, 12.6), V(0, 1.0, 0), 38], [V(-0.6, 1.8, 5.4), V(-3.0, 0.3, 0), 34]);
    else move(t, m, b, [V(-0.6, 1.8, 5.4), V(-3.0, 0.3, 0), 34], [V(-4.6, 2.8, 9.5), V(-8.4, 0, 0), 40]);
    callout("flywheel", t, fr("fly", 0.05), fr("fly", 0.5), V(-2.7, 0.75, 0.6), 300, 520);
    callout("gear", t, fr("fly", 0.55), fr("fly", 0.85), V(-4.5, 0.45, 0.6), 760, 520);
    callout("wheels", t, fr("fly", 0.72), b, V(-9.9, 1.2, 0.3), 300, 470);
  }
  // ---- SPEED: back to the four cylinders and spin it up (sub-frame motion blur), rpm + facts
  else if (t < at("heat")) {
    cutTo("z", 1);
    move(t, at("speed"), at("heat"), [V(1.6, 1.0, 7.0), V(0, 1.2, 0), 34], [V(0.4, 1.6, 6.2), V(0, 1.4, 0), 32]);
    const k = smooth(clamp(prog(t, at("speed"), end("speed")) * 1.4));
    H.trail.enabled = k > 0.08; H.trail.uniforms.damp.value = lerp(0.6, 0.86, k); H.trailSteps = H.trail.enabled ? 5 : 0; H.trailDt = 1 / 160;
    for (const c of CYL) { const s = stroke(c.cy); c.glow.material.color.copy(SCOL[s]); c.glow.material.opacity = s === 2 ? 0.9 : 0.25; }
    hudShow("rpm", win(t, at("speed") + 0.2, at("heat")));
    H.$("rpmv").textContent = (Math.round(lerp(300, 3000, ease(prog(t, fr("speed", 0.1), fr("speed", 0.35)))) / 10) * 10).toLocaleString("en");
    hudShow("facts", win(t, fr("speed", 0.4), at("heat")));
    S2(H.$("f1"), { opacity: win(t, fr("speed", 0.4), 999) }); S2(H.$("f2"), { opacity: win(t, fr("speed", 0.72), 999) });
    let pulse = 0; for (const cc of CYL) if (cc.cy < 40) pulse = Math.max(pulse, 1 - cc.cy / 40); exhMat.emissiveIntensity = 0.3 + pulse * 0.4;
  }
  // ---- HEAT: whole engine; exhaust glows red hot, heat pours off; energy bar
  else if (t < at("otto")) {
    cutTo("z", lerp(1, 0, ease(prog(t, at("heat"), fr("heat", 0.15)))));
    const a = at("heat");
    move(t, a, at("otto"), [V(6.0, 3.0, 8.8), V(0.4, 1.0, 0), 38], [V(8.4, 2.8, 5.8), V(0.9, 1.0, 0.4), 38]);
    const hk = ease(prog(t, fr("heat", 0.3), fr("heat", 0.7)));
    exhMat.emissiveIntensity = 0.2 + hk * 1.1; haze.visible = true; H.bloom.strength = 0.42;
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < NH; i++) {
      const p = HZ[i], u = mod(p.s + t * 0.35, 1);
      const src = p.src === 0 ? runnersEx[Math.floor(p.x * 4)].getPoint(0.4 + p.z * 0.5) : V(3.4, -0.1 + p.y * 3.0, (p.z - 0.5) * 2.2);
      const pos = src.clone().add(V((p.x - 0.5) * 0.2 + (p.src ? 0.25 + u * 1.2 : 0), u * 2.2, (p.y - 0.5) * 0.2 + (p.src ? 0 : u * 0.4)));
      const sc = hk * (1 - u) * (0.6 + p.s); m4.makeScale(sc, sc, sc).setPosition(pos); haze.setMatrixAt(i, m4);
    }
    haze.instanceMatrix.needsUpdate = true;
    hudShow("energy", win(t, fr("heat", 0.35), at("otto")));
    callout("exh", t, fr("heat", 0.62), at("otto"), runnersEx[1].getPoint(0.6), 300, 520);
    callout("rad", t, fr("heat", 0.78), at("otto"), V(3.4, 2.6, 0.6), 780, 430);
  }
  // ---- OTTO 1876: sepia flashback of a single horizontal cylinder with big flywheels
  else if (t < end("otto") + 0.1) {
    H.grade.uniforms.uSepia.value = clamp(1 - prog(t, fr("otto", 0.62), fr("otto", 0.85)) * 0.0);
    const a = at("otto");
    move(t, a, end("otto"), [V(2.4, 1.2, 7.2), V(-0.4, 0.2, 0), 34], [V(-4.6, 2.2, 6.4), V(-0.6, 0.3, 0), 34]);
    const ang = t * 3.2; otto.wheel.rotation.z = -ang; otto.wheel2.rotation.z = -ang;
    const cp = V(-1.8 + Math.cos(ang) * 0.55, 0.6 + Math.sin(ang) * 0.55, 0);
    const xh = cp.x + Math.sqrt(1.6 * 1.6 - (cp.y - 0.4) ** 2);
    otto.prod.position.set(xh + 0.6, 0.4, 0);
    const d = V(xh, 0.4, 0).sub(cp); otto.rod.position.copy(cp).addScaledVector(d, 0.5); otto.rod.scale.y = d.length(); otto.rod.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    title(t, fr("otto", 0.02), fr("otto", 0.55), "Nikolaus Otto", "1876");
    title(t, fr("otto", 0.6), end("otto") + 0.1, "Still the idea in", "Most petrol cars");
    H.backdrop.material.uniforms.top.value.set(0x2a241c);
  }
  // ---- ORBI 1: the engine fires in turns → it becomes the video's parts
  else {
    const o1 = at("orbi") + 3.2;
    if (t < o1) {
      cutTo("z", 1);
      move(t, at("orbi"), o1, [V(0.4, 1.6, 7.2), V(0, 1.4, 0), 34], [V(0.2, 1.4, 5.6), V(0, 1.4, 0), 30]);
      for (const c of CYL) { const s = stroke(c.cy); c.glow.material.color.copy(SCOL[s]); c.glow.material.opacity = s === 2 ? 1 : 0.15; }
      title(t, at("orbi") + 0.2, o1, "Never one giant bang", "It fires in turns");
      flash(t, o1, 0.9, 3, "#3dff8c");
    } else {
      // Orbi set: phone left-front, laptop right-back; the video above the phone splits into 12 parts that fly 3 at a time
      H.backdrop.material.uniforms.top.value.set(0x0f1a16); H.bloom.strength = 0.3;
      phone.position.set(-0.6, 0.62, 1.5); phone.rotation.set(-0.08, 0.2, 0.02);
      laptop.position.set(0.25, 0, -1.4); laptop.rotation.y = -0.12; lid.rotation.x = -0.12;
      H.floor.position.y = 0;
      const sDrop = at("orbi2"), sCut = fr("orbi2", 0.32), sFly = fr("orbi2", 0.48), sDrop2 = fr("orbi2", 0.7), sRes = fr("orbi2", 0.86);
      const sLap = at("orbi3"), sChips = fr("orbi3", 0.3), sLock = fr("orbi3", 0.52), sBurn = fr("orbi3", 0.78);
      // camera
      if (t < sDrop) move(t, o1, sDrop, [V(0.0, 2.6, 6.8), V(-0.2, 1.0, 0.3), 34], [V(-0.3, 2.1, 5.4), V(-0.4, 0.9, 0.6), 34]);
      else if (t < sLap) move(t, sDrop, sLap, [V(-0.3, 2.1, 5.4), V(-0.4, 0.9, 0.6), 34], [V(0.2, 2.7, 7.0), V(0, 1.0, 0), 36]);
      else if (t < sLock) move(t, sLap, sLock, [V(0.2, 2.7, 7.0), V(0, 1.0, 0), 36], [V(0.6, 1.9, 4.2), V(0.25, 1.0, -1.2), 34]);
      else if (t < sBurn) move(t, sLock, sBurn, [V(0.6, 1.9, 4.2), V(0.25, 1.0, -1.2), 34], [V(-0.4, 1.3, 4.6), V(-0.55, 0.62, 1.5), 32]);
      else move(t, sBurn, at("end"), [V(-0.4, 1.3, 4.6), V(-0.55, 0.62, 1.5), 32], [V(0.3, 2.4, 6.4), V(0.2, 1.0, -1.0), 36]);
      // video tile drops in, then splits
      const tileHome = phone.localToWorld(V(0, 0.15, 0.3));
      const lapScreen = (n) => lid.localToWorld(V((n % 4 - 1.5) * 0.36, 1.25 - Math.floor(n / 4) * 0.22, 0.12));
      const dropK = out(prog(t, sDrop, sDrop + 0.7)), split = ease(prog(t, sCut, sCut + 0.6));
      let landed = 0, inFlight = 0;
      const paused = t > sDrop2 && t < sRes;
      for (const p of PARTS) {
        const wave = Math.floor(p.n / 3);           // 4 waves of 3
        const t0 = sFly + wave * ((sDrop2 - sFly) / 2.2) + (wave >= 2 ? (sRes - sDrop2) : 0);
        let fk = prog(t, t0, t0 + 0.9);
        if (paused && t >= t0 && t < t0 + 0.9 && wave >= 2) fk = prog(sDrop2, t0, t0 + 0.9);
        const start = tileHome.clone().add(p.home.clone().multiplyScalar(0.45 * lerp(1, 1.3, split)).applyEuler(phone.rotation));
        start.y += (1 - dropK) * 2.5;
        const endP = lapScreen(p.n);
        const mid = start.clone().lerp(endP, 0.5).add(V(0, 0.8, 0.3));
        const k = ease(fk);
        const pos = start.clone().lerp(mid, k).lerp(mid.clone().lerp(endP, k), k);
        p.m.position.copy(pos); p.m.rotation.set(-0.1 * (1 - k), 0.38 - 0.8 * k, 0); p.m.scale.setScalar(lerp(0.45, 0.3, k));
        p.m.visible = t > sDrop - 0.1 && !(t > sBurn + 0.2);
        const lockedGlow = t > sCut ? 1 : 0;
        p.front.emissiveIntensity = lockedGlow * (fk > 0 && fk < 1 ? 0.18 : 0.05);
        p.edge.material.opacity = lockedGlow * (paused && fk > 0 && fk < 1 ? 0.25 : 1);
        if (fk >= 1) landed++; else if (fk > 0) inFlight++;
      }
      // burn: parts on the laptop fall to embers
      if (t > sBurn) {
        const bk = prog(t, sBurn + 0.5, sBurn + 1.6); const m4 = new THREE.Matrix4();
        for (let i = 0; i < 200; i++) { const e = EM[i]; const base = lid.localToWorld(V(e.x * 1.6, 1.0 + e.y * 0.8, 0.15)); const u = mod(e.v + (t - sBurn) * 0.6, 1); base.y += u * 0.8 * bk; const s = bk * (1 - u) * (0.6 + e.s); m4.makeScale(s, s, s).setPosition(base); embers.setMatrixAt(i, m4); }
        embers.instanceMatrix.needsUpdate = true; embers.visible = true;
        for (const p of PARTS) { p.m.visible = bk < 0.6; p.m.scale.multiplyScalar(1 - bk); }
      } else embers.visible = false;
      // lock over the phone
      lock.position.copy(phone.localToWorld(V(0, 0.15, 0.2))); lock.rotation.copy(phone.rotation);
      const lk = Math.max(win(t, sCut - 0.1, sFly + 0.3), win(t, sLock, sBurn));
      lock.scale.setScalar(Math.max(0.001, lk * lerp(1.3, 1, out(prog(t, sLock, sLock + 0.4)))));
      orbiLight.position.copy(phone.localToWorld(V(0, 0, 0.6))); orbiLight.intensity = lk * 2;
      // screens
      const ps = { sheet: win(t, sDrop + 0.3, sLap + 0.4, 0.3, 0.4), p: clamp((landed + inFlight * 0.5) / 12), label: paused ? "Signal lost · paused" : landed >= 12 ? "Sent" : "Sending · 3 parts at once", lock: t > sCut ? 1 : 0, tap: prog(t, sDrop + 0.2, sDrop + 0.6) };
      const key = JSON.stringify(ps); if (key !== lastPhone) { drawPhone(ps); lastPhone = key; }
      const burnLeft = Math.round(1800 * (1 - ease(prog(t, sBurn, sBurn + 1.4))));
      const ls = { card: clamp((t - sFly) / 0.4), p: landed / 12, done: landed >= 12, burn: t > sBurn ? `BURNS IN ${String(Math.floor(burnLeft / 60)).padStart(2, "0")}:${String(burnLeft % 60).padStart(2, "0")}` : null };
      const lkey = JSON.stringify(ls); if (lkey !== lastLap) { drawLaptop(ls); lastLap = lkey; }
      // overlays
      title(t, o1 + 0.1, sDrop, "Orbi Transfer", "Big videos,<br>in parts");
      title(t, sDrop, sCut + 0.2, "Up to", "20 GB");
      hudShow("prog", win(t, sFly - 0.2, sLap + 0.3));
      H.$("pgt").textContent = `${landed} / 12 parts`; H.$("pgs").textContent = paused ? "SIGNAL DROPPED · WAITING" : landed >= 12 ? "ALL PARTS ARRIVED" : t > sRes ? "RESUMED WHERE IT STOPPED" : "3 PARTS IN FLIGHT";
      for (let i = 0; i < 12; i++) { const p = PARTS[i]; const wave = Math.floor(i / 3); const t0 = sFly + wave * ((sDrop2 - sFly) / 2.2) + (wave >= 2 ? (sRes - sDrop2) : 0); const fk = paused && wave >= 2 ? prog(sDrop2, t0, t0 + 0.9) : prog(t, t0, t0 + 0.9); S2(H.$("pg" + i), { background: fk >= 1 ? "#3dff8c" : fk > 0 ? `linear-gradient(90deg,#3dff8c ${fk * 100}%,rgba(255,255,255,.12) ${fk * 100}%)` : "rgba(255,255,255,.08)" }); }
      callout("parts3", t, sFly + 0.1, sDrop2, PARTS[1].m.position.clone(), 760, 420);
      hudShow("wifi", win(t, sDrop2 - 0.15, sRes + 0.6));
      S2(H.$("wfx"), { opacity: paused ? 1 : 0 }); H.$("wfg").setAttribute("stroke", paused ? "#ff3b3b" : "#3dff8c");
      title(t, sLap + 0.1, sChips, "Phone → laptop", "Just a browser");
      hudShow("chips", win(t, sChips, sLock));
      callout("locked", t, sLock, sBurn, lock.position.clone(), 330, 460);
      hudShow("timer", win(t, sBurn, at("end") - 0.1));
      H.$("tmr").textContent = `${String(Math.floor(burnLeft / 60)).padStart(2, "0")}:${String(burnLeft % 60).padStart(2, "0")}`;
      S2(H.$("tmr"), { color: burnLeft < 300 ? "#ff5a36" : "#fff" });
      title(t, sBurn + 0.1, at("end"), "After 30 minutes", "It burns");
    }
  }
  if (!(t >= at("orbi") + 3.2)) H.floor.position.y = -1.42;
  gasFrame(t, gasOn && E.visible);
  if (!gasOn) { gas.visible = false; spray.visible = false; sparkM.visible = false; sparkL.intensity = 0; flame.visible = false; flameL.intensity = 0; } else { gas.visible = spray.visible = true; }
  // the bicycle pedal: crank arm synced with cylinder 1's crank, a leg pushing it
  if (bike.visible) {
    const th = CYL[0].cy * D2R;
    bikeParts.ring.rotation.z = -th;
    const pedal = V(Math.sin(th) * 0.85, Math.cos(th) * 0.85, 0.12);
    bikeParts.ped.position.copy(pedal);
    const hip = V(-0.35, 2.15, 0.12), L1 = 1.2, L2 = 1.15;
    const d = pedal.clone().sub(hip), dl = Math.min(d.length(), L1 + L2 - 0.01);
    const aa = Math.acos(clamp((L1 * L1 + dl * dl - L2 * L2) / (2 * L1 * dl), -1, 1));
    const dir = d.clone().normalize(); const perp = V(dir.y, -dir.x, 0);
    const knee = hip.clone().addScaledVector(dir, Math.cos(aa) * L1).addScaledVector(perp, -Math.sin(aa) * L1);
    placeCap(bikeParts.thigh, hip, knee, 0.11); placeCap(bikeParts.shin, knee, pedal.clone().add(V(0, 0.08, 0)), 0.085);
    bikeParts.foot.position.copy(pedal).add(V(0.05, 0.1, 0));
  }
});
window.crankG = crankG;
function S2(el, o) { Object.assign(el.style, o); }
await H.ready();
