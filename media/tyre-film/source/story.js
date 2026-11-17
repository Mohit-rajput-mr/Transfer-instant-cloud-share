// "Two tyres, the same nail" v2 — a 3D cutaway film (owner 2026-11-17: more detail, slower, clear mechanism, Zach-style).
// Each wheel is built from real cross-sections revolved round the axle (lathes), with a wedge cut away so the layers show:
// rim (with valve hole / spoke nipples) → tyre (rubber, body ply, steel belts, bead wires) → inner tube (tube type) or
// airtight liner (tubeless). Facts: tube type = the tube holds the air, the tyre is a shell and is not sealed to the rim;
// a puncture lets air out fast, round the tube and out through the rim's holes. Tubeless = liner + sealed rim; air pressure
// pushes the beads outward over the rim's hump onto the bead seat (the "pop"); rubber grips a nail, slow leak; plug from
// outside; no tube friction (cooler, often lighter). Wire-spoke rims have a hole per spoke → most need tubes; tubes cheap.
import { THREE, K } from "./kit/engine.js";
const { V, clamp, ease, out, back, lerp, lerpV, rnd, canvasTex, sh, flat, lowGround, pick, tree, cloud, makePhone,
  screen, addWorld, world, look, lookV, orbit, project, at, fr, prog, tag, tags, big, counter, flash, timer, frame, ready, scene } = K;
const TAU = Math.PI * 2, D = Math.PI / 180;
const glow = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, toneMapped: false });
const win = (t, a, b, f = 0.3) => clamp((t - a) / f) * clamp((b - t) / f);

// ---------- a soft studio reflection for metal ----------
const ENV = (() => {
  const pm = new THREE.PMREMGenerator(K.r), s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x6d737c, side: THREE.BackSide })));
  const panel = (x, y, z, w, h, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c, c, c), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  panel(0, 12, 0, 16, 10, 4); panel(-12, 3, 4, 6, 12, 2.2); panel(12, 2, -3, 5, 10, 1.6); panel(0, -2, 13, 20, 3, 1.2);
  return pm.fromScene(s, 0.03).texture;
})();
const M = {
  rubber: new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.88, side: THREE.DoubleSide }),
  cut: new THREE.MeshStandardMaterial({ color: 0x34373f, roughness: 0.95, side: THREE.DoubleSide }),
  ply: new THREE.MeshStandardMaterial({ color: 0xe0b44a, roughness: 0.6, side: THREE.DoubleSide }),
  belt: new THREE.MeshStandardMaterial({ color: 0xb9c2cc, metalness: 0.8, roughness: 0.3, envMap: ENV, side: THREE.DoubleSide }),
  bead: new THREE.MeshStandardMaterial({ color: 0xd6dbe2, metalness: 0.9, roughness: 0.25, envMap: ENV, emissive: 0xff9a2a, emissiveIntensity: 0 }),
  liner: new THREE.MeshStandardMaterial({ color: 0x1fc7a6, roughness: 0.55, emissive: 0x1fc7a6, emissiveIntensity: 0.15, side: THREE.DoubleSide }),
  rim: new THREE.MeshStandardMaterial({ color: 0xd3d8df, metalness: 0.92, roughness: 0.22, envMap: ENV, envMapIntensity: 1.2, side: THREE.DoubleSide }),
  rimCut: new THREE.MeshStandardMaterial({ color: 0xa9b0ba, metalness: 0.5, roughness: 0.45, envMap: ENV, side: THREE.DoubleSide }),
  tube: new THREE.MeshStandardMaterial({ color: 0xe24a5f, roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 1 }),
  tubeCut: new THREE.MeshStandardMaterial({ color: 0xff7a8c, roughness: 0.6, side: THREE.DoubleSide }),
  air: new THREE.MeshBasicMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3, envMap: ENV }),
  steel: new THREE.MeshStandardMaterial({ color: 0xc4cad2, metalness: 0.9, roughness: 0.25, envMap: ENV }),
  dark: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6 }),
};

// ---------- cross-section helpers (r = distance from the axle, y = across the tyre) ----------
const P = (r, y) => new THREE.Vector2(r, y);
const ell = (cr, a, b, th0, th1, n = 28) => [...Array(n + 1)].map((_, i) => { const th = lerp(th0, th1, i / n) * D; return P(cr + a * Math.cos(th), b * Math.sin(th)); });
const band = (cr, a1, b1, a2, b2, th0, th1, n = 24) => [...ell(cr, a1, b1, th0, th1, n), ...ell(cr, a2, b2, th1, th0, n)];
const shapeOf = (pts, holes = []) => { const s = new THREE.Shape(pts); for (const h of holes) s.holes.push(new THREE.Path(h)); return s; };
// tyre section: seat s 0 = beads dropped in the rim's well (no air), 1 = beads pushed out onto the seats
const TY = { cr: 2.55, a: 0.64, th: 0.15 };
function tyrePts(s = 1) {
  const b = lerp(0.56, 0.76, s), by = lerp(0.3, 0.52, s), br = lerp(1.86, 2.01, s);
  const o = ell(TY.cr, TY.a, b, -138, 138, 36), i = ell(TY.cr, TY.a - TY.th, b - TY.th, 128, -128, 32);
  return [...o, P(br + 0.04, by + 0.02), P(br - 0.02, by - 0.13), ...i, P(br - 0.02, -by + 0.13), P(br + 0.04, -by - 0.02)];
}
const beadPos = (s = 1) => [P(lerp(1.93, 2.07, s), lerp(0.25, 0.45, s)), P(lerp(1.93, 2.07, s), -lerp(0.25, 0.45, s))];
function rimPts(tubeless) {
  const top = [P(2.2, -0.66), P(2.04, -0.63), P(1.99, -0.52), ...(tubeless ? [P(2.03, -0.42), P(1.97, -0.35)] : [P(1.98, -0.36)]), P(1.79, -0.22), P(1.77, 0), P(1.79, 0.22), ...(tubeless ? [P(1.97, 0.35), P(2.03, 0.42)] : [P(1.98, 0.36)]), P(1.99, 0.52), P(2.04, 0.63), P(2.2, 0.66)];
  return [...top, ...top.slice().reverse().map((p) => P(p.x - 0.085, p.y * 0.985))];
}

// ---------- a wheel: lathe group L (axle = L's Y), wedge cut [cut0, cut0 + cutLen] removed ----------
function makeWheel(parent, { tubeless = false, spokes = "wire", tread = true }) {
  const G = new THREE.Group(); parent.add(G);            // G: position + roll (rotation.z)
  const L = new THREE.Group(); L.rotation.x = Math.PI / 2; G.add(L); // lathe space → world: (x, y, z) → (x, -z, y)
  const W = { G, L, tubeless, parts: {}, key: "", s: 1, tubeE: [2.52, 0.48, 0.6], cut: 0, squash: 0, ghost: 0, deflated: 0 };
  // static pieces: hub, spokes, valve, tread
  const hub = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.0, 20), M.steel)); L.add(hub);
  for (const y of [-0.36, 0.36]) { const f = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 24), M.steel)); f.position.y = y; L.add(f); }
  W.spk = [];
  if (spokes === "wire") {
    for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU, side = i % 2 ? 1 : -1, a2 = a + side * 9 * D;
      const p1 = V(0.34 * Math.sin(a), side * 0.36, 0.34 * Math.cos(a)), p2 = V(1.7 * Math.sin(a2), 0, 1.7 * Math.cos(a2));
      const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, p1.distanceTo(p2), 6), M.steel)); m.position.copy(p1).lerp(p2, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), p2.clone().sub(p1).normalize()); L.add(m);
      const n = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 8), M.brass)); n.position.set(1.73 * Math.sin(a2), 0, 1.73 * Math.cos(a2)); n.quaternion.setFromUnitVectors(V(0, 1, 0), V(Math.sin(a2), 0, Math.cos(a2))); L.add(n);
      W.spk.push([a2, m, n]); }
  } else {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; const m = sh(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 1.45), M.rim)); m.position.set(1.02 * Math.sin(a), 0.1, 1.02 * Math.cos(a)); m.rotation.y = a; L.add(m); W.spk.push([a, m]); }
    const cap = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.36, 24), M.rim)); cap.position.y = 0.12; L.add(cap);
  }
  // valve at φ = 200°: tube type = brass stem from the tube through a hole in the rim; tubeless = rubber snap-in in the rim
  W.vphi = 200 * D; const vd = V(Math.sin(W.vphi), 0, Math.cos(W.vphi));
  const valve = new THREE.Group(); L.add(valve); valve.quaternion.setFromUnitVectors(V(0, 1, 0), vd);
  if (!tubeless) { const st = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 10), M.brass)); st.position.y = 1.62; valve.add(st); const base = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.08, 12), M.tube)); base.position.y = 2.03; valve.add(base); }
  else { const st = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 12), M.dark)); st.position.y = 1.55; valve.add(st); const flg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12), M.dark)); flg.position.y = 1.78; valve.add(flg); }
  const capV = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 10), M.dark)); capV.position.y = 1.2; valve.add(capV); W.valve = valve; W.vcap = capV;
  W.tread = [];
  if (tread) { const geo = new THREE.BoxGeometry(0.22, 0.2, 0.08); for (const row of [-0.42, -0.14, 0.14, 0.42]) for (let i = 0; i < 72; i++) {
    const a = ((i + (row > 0 ? 0.5 : 0)) / 72) * TAU, m = sh(new THREE.Mesh(geo, M.rubber)); L.add(m); W.tread.push({ m, a, row }); } }
  return W;
}
const inWedge = (W, a) => { if (W.cut <= 0) return false; const c0 = 185 * D - W.cut, x = ((a - c0) % TAU + TAU) % TAU; return x < W.cut; };
// rebuild the revolved pieces + cut faces when anything changed
function buildWheel(W) {
  const key = [W.cut, W.s, ...W.tubeE, W.squash, W.tubeOn, W.tubeless].map((x) => (typeof x === "number" ? x.toFixed(3) : x)).join("|");
  if (key === W.key) return; W.key = key;
  for (const k in W.parts) { W.L.remove(W.parts[k]); W.parts[k].geometry.dispose(); } W.parts = {};
  const c0 = 185 * D - W.cut, ph0 = 185 * D, len = TAU - W.cut, seg = 140;
  const add = (k, geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; W.L.add(m); W.parts[k] = m; return m; };
  const lathe = (k, pts, mat) => add(k, new THREE.LatheGeometry(pts, seg, ph0, len), mat);
  const faces = (k, shape, mat, cast = false) => { if (W.cut <= 0.001) return; [ph0, c0].forEach((ph, i) => { const m = add(k + i, new THREE.ShapeGeometry(shape, 24), mat, cast); m.rotation.y = ph - Math.PI / 2; }); };
  const tp = tyrePts(W.s);
  lathe("tyre", [...tp, tp[0]], M.rubber);
  faces("tyreF", shapeOf(tp), M.cut);
  const b = lerp(0.56, 0.76, W.s);
  faces("plyF", shapeOf(band(TY.cr, TY.a - 0.07, b - 0.07, TY.a - 0.095, b - 0.095, -128, 128, 30)), M.ply);
  faces("beltF", shapeOf(band(TY.cr, TY.a - 0.03, b - 0.03, TY.a - 0.06, b - 0.06, -42, 42, 16)), M.belt);
  for (const [i, bp] of beadPos(W.s).entries()) { const c = ell(bp.x, 0.045, 0.045, 0, 360, 12).map((p) => P(p.x, p.y + bp.y)); lathe("bead" + i, c, M.bead); faces("beadF" + i, shapeOf(c), M.bead); }
  if (W.tubeless) { lathe("liner", band(TY.cr, TY.a - TY.th + 0.001, b - TY.th + 0.001, TY.a - TY.th - 0.03, b - TY.th - 0.03, -126, 126, 30), M.liner);
    faces("linerF", shapeOf(band(TY.cr, TY.a - TY.th + 0.001, b - TY.th + 0.001, TY.a - TY.th - 0.03, b - TY.th - 0.03, -126, 126, 30)), M.liner); }
  const rp = rimPts(W.tubeless); lathe("rim", [...rp, rp[0]], M.rim); faces("rimF", shapeOf(rp), M.rimCut);
  if (W.tubeOn) { const [cr, a, bb] = W.tubeE, o = ell(cr, a, bb, 0, 360, 40), ii = ell(cr, Math.max(0.01, a - 0.035), Math.max(0.01, bb - 0.035), 0, 360, 40);
    lathe("tube", o, M.tube); faces("tubeF", shapeOf(o, [ii]), M.tubeCut); faces("tubeAir", shapeOf(ii), M.air); }
  else if (W.tubeless) { const cav = [...ell(TY.cr, TY.a - TY.th - 0.03, b - TY.th - 0.03, -124, 124, 30), P(1.99, lerp(0.3, 0.44, W.s)), P(1.8, 0.2), P(1.8, -0.2), P(1.99, -lerp(0.3, 0.44, W.s))];
    faces("cavAir", shapeOf(cav), M.air); }
  // squash (flat tyre): pull the part that faces the ground in towards the axle
  if (W.squash > 0) { const bd = W.bottom ?? 0, dx = Math.sin(bd), dz = Math.cos(bd);
    for (const k of ["tyre", "tyreF0", "tyreF1", "tube", "tubeF0", "tubeF1", "tubeAir0", "tubeAir1", "plyF0", "plyF1", "beltF0", "beltF1"]) { const m = W.parts[k]; if (!m) continue;
      const pos = m.geometry.attributes.position, v = V(), mw = m.matrix; m.updateMatrix();
      const inv = mw.clone().invert();
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mw); const d = v.x * dx + v.z * dz, lim = 3.2 - 0.75 * W.squash;
        if (d > lim - 0.4) { const nd = d > lim ? lim + (d - lim) * 0.12 : d; v.x += dx * (nd - d); v.z += dz * (nd - d); v.y *= 1 + 0.18 * W.squash * clamp((d - lim + 0.4) / 0.6); }
        v.applyMatrix4(inv); pos.setXYZ(i, v.x, v.y, v.z); }
      pos.needsUpdate = true; m.geometry.computeVertexNormals(); }
  }
}
function poseWheel(W) {
  buildWheel(W);
  const b = lerp(0.56, 0.76, W.s);
  for (const tr of W.tread) { const yy = tr.row * lerp(0.85, 1, W.s), rr = TY.cr + TY.a * Math.sqrt(Math.max(0, 1 - (yy / b) ** 2)) + 0.03;
    let r2 = rr; if (W.squash > 0) { const bd = W.bottom ?? 0, d = Math.cos(tr.a - bd) * rr, lim = 3.2 - 0.75 * W.squash; if (d > lim - 0.4) r2 = rr - (d > lim ? (d - lim) * 0.88 : 0) / Math.max(0.3, Math.cos(tr.a - bd)); }
    tr.m.position.set(r2 * Math.sin(tr.a), yy, r2 * Math.cos(tr.a)); tr.m.rotation.y = tr.a; tr.m.visible = !inWedge(W, tr.a) && !(W.cut > 0 && inWedge(W, tr.a - 3 * D)) && !(W.cut > 0 && inWedge(W, tr.a + 3 * D)); }
  for (const s of W.spk) { const v = !inWedge(W, s[0]); s[1].visible = v; if (s[2]) s[2].visible = v; }
  M.tube.opacity = 1 - 0.6 * W.ghost; M.tube.depthWrite = W.ghost < 0.1;
  M.rubber.transparent = W.ghost > 0.01; M.rubber.opacity = 1 - 0.78 * W.ghost; M.rubber.depthWrite = W.ghost < 0.1;
}
// a point in lathe space (r, y at angle φ) → world
const lp = (W, r, y, phi) => W.L.localToWorld(V(r * Math.sin(phi), y, r * Math.cos(phi)));

// ---------- air: little spheres that fill the tube / the tyre, and escape ----------
const AIRN = 420, airGeo = new THREE.SphereGeometry(0.03, 8, 6), airMat = glow(0xd8f1ff);
function makeAir(parent) { const m = new THREE.InstancedMesh(airGeo, airMat, AIRN); m.frustumCulled = false; parent.add(m); K.reseed(5);
  const P_ = [...Array(AIRN)].map((_, i) => ({ u: i < AIRN * 0.55 ? (rnd() < 0.5 ? 185 * D + rnd() * 16 * D : 95 * D - rnd() * 16 * D) : 185 * D + rnd() * 270 * D, rho: Math.sqrt(rnd()) * 0.85, th: rnd() * TAU, ph: rnd(), side: rnd() < 0.5 ? -1 : 1 }));
  return { m, P: P_ }; }
const _M = new THREE.Matrix4(), _Z = new THREE.Matrix4().makeScale(0, 0, 0);
function hideAir(A) { for (let i = 0; i < AIRN; i++) A.m.setMatrixAt(i, _Z); A.m.instanceMatrix.needsUpdate = true; }
/** fill: share of particles present; place(p, i) returns a world position or null */
function poseAir(A, n, place) { for (let i = 0; i < AIRN; i++) { const v = i < n ? place(A.P[i], i) : null; A.m.setMatrixAt(i, v ? _M.makeTranslation(v.x, v.y, v.z) : _Z); } A.m.instanceMatrix.needsUpdate = true; }
const inside = (W, p, t, cr, a, b) => { const j = 0.06; const r = cr + p.rho * a * Math.cos(p.th + t * 2 * p.side) + Math.sin(t * 9 + p.ph * 20) * j * 0.3, y = p.rho * b * Math.sin(p.th + t * 2 * p.side) + Math.cos(t * 8 + p.ph * 30) * j * 0.3; return [r, y]; };

// ---------- arrows (pressure) ----------
function makeArrows(parent, n, col = 0xffd24a) { return [...Array(n)].map(() => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 10), glow(col)); c.position.y = 0.16; const s = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 6), glow(col)); s.position.y = 0.0; g.add(c, s); parent.add(g); g.visible = false; return g; }); }
function arrow(g, from, dir, k) { g.visible = k > 0.02; g.position.copy(from); g.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()); g.scale.setScalar(0.6 + 0.6 * k); }

// ---------- the nail, plug, patch, pump hose, tyre lever ----------
function makeNail(parent) { const g = new THREE.Group(); const s = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 10), M.steel)); s.position.y = 0.475; const tip = sh(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 10), M.steel)); tip.position.y = 1.0; const hd = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 16), M.steel)); g.add(s, tip, hd); parent.add(g); return g; }

// ---------- callouts: a dot on the part, a line, a label ----------
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
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.9); fill.position.set(-6, 4, 6); w.add(fill); return w; };
const SA = studio("A", 0xe9e3d8), SB = studio("B", 0xdcebe6);
const WA = makeWheel(SA, { tubeless: false, spokes: "wire" }); WA.G.position.y = 3.3; WA.tubeOn = true;
const WB = makeWheel(SB, { tubeless: true, spokes: "alloy" }); WB.G.position.y = 3.3; WB.tubeOn = false;
const AA = makeAir(WA.L), AB = makeAir(WB.L);
const arrA = makeArrows(SA, 14), arrB = makeArrows(SB, 14);
const nailA = makeNail(SA), nailB = makeNail(SB);
const plug = new THREE.Group(); { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.9 }))); p.position.y = 0.35; const tl = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), M.steel)); tl.position.y = -0.55; const hd = sh(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: 0xf2c21b }))); hd.position.y = -1.2; plug.add(p, tl, hd); plug.userData = { tool: [tl, hd] }; SB.add(plug); }
const grip = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 20), glow(0xff9a2a)); SB.add(grip);
const patch = sh(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.03), new THREE.MeshStandardMaterial({ color: 0xf2c21b, roughness: 0.6 }))); SA.add(patch);
const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, 1, 0)]), 2, 0.06, 8), M.dark); SA.add(hose);
const hoseB = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, 1, 0)]), 2, 0.06, 8), M.dark); SB.add(hoseB);
const heatRing = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.62, 16, 80), new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, toneMapped: false })); heatRing.scale.set(1, 1, 0.9); SA.add(heatRing);
const coolRing = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.62, 16, 80), new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, toneMapped: false })); coolRing.scale.set(1, 1, 0.9); SB.add(coolRing);
const popRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 40), glow(0xffd24a, 0.9)); SB.add(popRing);
const sweep = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 9), glow(0xff5a3a)); SA.add(sweep);

// the road (hook + verdict): two wheels with a fork each
const road = addWorld("road", { bg: 0xa9dcff, fog: [22, 60], hemi: 1.05, sun: 2.3 });
road.add(lowGround(90, 50, 40, (x, y, z) => (z > -4 && z < 4 ? pick([0x565b66, 0x4e535d, 0x5c616c], x * 3, z) : pick([0x7fbf5f, 0x6fb257, 0x8cc865], x, z)), (x, z) => (z < -4.4 ? Math.sin(x * 0.4) * 0.3 + (-4.4 - z) * 0.14 : 0)));
const stripes = [...Array(14)].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.18), flat(0xf6f2ea)); m.position.set(0, 0.02, 0); road.add(m); return m; });
const trees = [...Array(12)].map((_, i) => { const g = new THREE.Group(); road.add(g); tree(g, 0, 0, 2 + (i % 3) * 0.6); g.userData.z = -6.5 - (i % 4) * 2; return g; });
K.reseed(7); for (let i = 0; i < 6; i++) cloud(road, -16 + i * 7, 9 + (i % 2) * 2, -18, 2);
const RA = makeWheel(road, { tubeless: false, spokes: "wire" }), RB = makeWheel(road, { tubeless: true, spokes: "alloy" });
RA.tubeOn = true; RB.tubeOn = false;
for (const R of [RA, RB]) { R.G.scale.setScalar(0.62); const fork = new THREE.Group(); const m = flat(R === RA ? 0xe2533f : 0x14a88a); for (const z of [-0.75, 0.75]) { const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 0.12), m)); leg.position.set(0.5, 1.6, z); leg.rotation.z = -0.3; fork.add(leg); } const top = sh(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1.7), m)); top.position.set(1.0, 3.2, 0); fork.add(top); const guard = sh(new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.12, 6, 30, 1.6), m)); guard.position.set(0, 0, 0); guard.rotation.z = 0.7; fork.add(guard); R.fork = fork; road.add(fork); }
const roadNails = [makeNail(road), makeNail(road)];

// ---------- world: Orbi ----------
const orb = addWorld("orbi", { bg: 0x07090f, fog: [10, 30], hemi: 0.8, sun: 1.4, sky: 0x9fb8ff });
orb.add(new THREE.GridHelper(40, 40, 0x173a2a, 0x10241a));
const PH = { phone: makePhone() }; PH.phone.g.scale.setScalar(22); PH.phone.g.position.set(0, 2.2, 0); orb.add(PH.phone.g);
const PH2 = { phone: makePhone() }; PH2.phone.g.scale.setScalar(14); PH2.phone.g.position.set(2.6, 1.6, -2.5); PH2.phone.g.rotation.y = -0.5; orb.add(PH2.phone.g);
const beam = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0x3dff8c)); orb.add(beam);
K.reseed(3); const EN = 220, emberGeo = new THREE.BufferGeometry(), emberPos = new Float32Array(EN * 3), emberDir = [...Array(EN)].map(() => [(rnd() - 0.5) * 3.4, rnd() * 3 + 0.5, (rnd() - 0.5) * 2.4]);
emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffa04a, size: 0.09, transparent: true, opacity: 0, toneMapped: false })); orb.add(embers);

tags({ tR: "No login · <b>no app</b>", tS: "Sealed <b>on your phone</b>", tT: "Other screen · <b>about a second</b>" });

// ---------- the film ----------
frame("Try it on two phones", async (t) => {
  const k = (a, b) => prog(t, a, b);
  const A = (key) => at(key), F = fr;
  for (const g of [...arrA, ...arrB]) g.visible = false;
  hideAir(AA); hideAir(AB);
  nailA.visible = nailB.visible = plug.visible = grip.visible = patch.visible = hose.visible = hoseB.visible = sweep.visible = popRing.visible = false;
  heatRing.material.opacity = coolRing.material.opacity = 0; M.bead.emissiveIntensity = 0; M.liner.emissiveIntensity = 0.15; M.tube.emissive?.setHex(0); M.rubber.emissive?.setHex(0); M.rim.emissive?.setHex(0);
  const hi = (mat, col, kk) => { mat.emissive.setHex(col); mat.emissiveIntensity = kk; };

  // ===== studio A: the tube wheel =====
  // cut opens during "cut"; stays open; closes for "fix"? (no: stays) ; tube deflated until "inflate"
  WA.cut = 90 * D * ease(k(F("cut", 0.0), F("cut", 0.22))); WA.ghost = 0; WA.squash = 0; WA.bottom = 0; WA.tubeOn = true;
  let roll = 0, tubeFill = t < A("inflate") ? 0 : ease(k(F("inflate", 0.12), F("inflate", 0.7)));
  const nT0 = A("nailT"), fT = A("flatT");
  if (t >= nT0 && t < A("nailL")) { roll = -lerp(40, 92, ease(k(nT0, F("nailT", 0.25)))) * D; }
  if (t >= fT && t < A("nailL")) { roll = -92 * D; tubeFill = 1 - ease(k(F("flatT", 0.05), F("flatT", 0.55))); WA.squash = ease(k(F("flatT", 0.55), F("flatT", 0.85))); WA.bottom = 92 * D; }
  if (t >= A("nailL")) tubeFill = 1;
  // fix: tyre comes off, tube lifted out, patch
  const fixK = t >= A("fix") && t < A("plug") ? 1 : 0;
  // but: no tube, air leaks through the spoke holes, then the tube goes back in
  const butK = t >= A("but") && t < A("verdict");
  if (butK) WA.tubeOn = t > F("but", 0.55);
  if (butK && t > F("but", 0.55)) tubeFill = ease(k(F("but", 0.55), F("but", 0.7)));
  WA.tubeE = [lerp(2.17, 2.52, tubeFill), lerp(0.2, 0.48, tubeFill), lerp(0.42, 0.6, tubeFill)];
  WA.G.rotation.z = roll + (t < A("cut") ? -0.3 + t * 0.03 : 0) + (t > A("armour") && t < A("less") ? (t - A("armour")) * 0.08 : 0) + (t > A("heat") && t < F("heat", 0.5) ? (t - A("heat")) * 2.5 : 0);
  WA.L.position.set(0, 0, 0); WA.G.position.x = 0;
  if (t > A("armour") - 0.1 && t < A("less")) WA.ghost = 0;
  if (t > F("inflate", 0.35) && t < A("armour")) WA.ghost = ease(k(F("inflate", 0.35), F("inflate", 0.5))) * (1 - ease(k(F("inflate", 0.9), A("armour"))));
  // tyre slides off for the fix
  const off = fixK ? ease(k(F("fix", 0.15), F("fix", 0.45))) : 0, lift = fixK ? ease(k(F("fix", 0.4), F("fix", 0.62))) : 0;
  poseWheel(WA);
  for (const kk of ["tyre", "tyreF0", "tyreF1", "plyF0", "plyF1", "beltF0", "beltF1", "bead0", "bead1", "beadF00", "beadF01", "beadF10", "beadF11"]) if (WA.parts[kk]) WA.parts[kk].position.y = off * 1.9;
  for (const kk of ["tube", "tubeF0", "tubeF1", "tubeAir0", "tubeAir1"]) if (WA.parts[kk]) { WA.parts[kk].position.y = off * 0.9; WA.parts[kk].position.z = 0; WA.parts[kk].position.x = 0; WA.parts[kk].scale.setScalar(1); if (lift) { WA.parts[kk].position.z = -lift * 1.2; } }
  WA.tread.forEach((tr) => (tr.m.position.y += off * 1.9));
  // valve follows the tube when it lifts
  WA.valve.position.set(0, off * 0.9, -lift * 1.2); WA.vcap.visible = !(t > F("inflate", 0.0) && t < A("armour"));
  if (fixK && t > F("fix", 0.62)) { patch.visible = true; const p = lp(WA, 3.0, off * 0.9 + 0.0, 150 * D).add(V(0, 0, 0)); patch.position.copy(p).add(V(0, lift * 0, 0.0)); patch.position.copy(WA.L.localToWorld(V(2.95 * Math.sin(150 * D), off * 0.9, 2.95 * Math.cos(150 * D) - lift * 1.2))); patch.lookAt(patch.position.clone().add(V(Math.sin(150 * D), 0.5, 1))); patch.scale.setScalar(back(k(F("fix", 0.62), F("fix", 0.75)))); }
  // highlights
  if (t > A("cut") && t < A("tube")) { const q = (t - A("cut")) / (A("tube") - A("cut"));
    if (q > 0.36 && q < 0.5) hi(M.rim, 0x4fc3ff, 0.5 + 0.3 * Math.sin(t * 8));  if (q > 0.68) hi(M.tube, 0xff3a5a, 0.4 + 0.25 * Math.sin(t * 8)); }
  if (t > A("armour") && t < A("less")) { const q = (t - A("armour")) / (A("less") - A("armour")); if (q >= 0.55) hi(M.tube, 0xff3a5a, 0.4 + 0.25 * Math.sin(t * 8)); }
  // pump hose + air in the tube
  const pumping = t > A("inflate") && t < A("armour");
  if (pumping) { hose.visible = true; const tip = WA.L.localToWorld(V(1.12 * Math.sin(WA.vphi), 0, 1.12 * Math.cos(WA.vphi))), dir = tip.clone().sub(WA.G.position).setZ(0).normalize();
    const c = new THREE.CatmullRomCurve3([tip, tip.clone().add(dir.clone().multiplyScalar(-0.3)).add(V(0, 0, 0.6)), tip.clone().add(V(-1.4, -1.8, 2.6)), V(-3.5, 0.05, 4)]); hose.geometry.dispose(); hose.geometry = new THREE.TubeGeometry(c, 40, 0.07, 8); hose.visible = t > F("inflate", 0.02); }
  const airA = (n, mode) => poseAir(AA, n, (p, i) => {
    const [cr, a, b] = WA.tubeE;
    if (mode === "in") { // in through the valve, then round the ring
      const born = p.ph * 0.7, age = (tubeFill - born) / 0.3; if (age < 0) return null;
      const [r, y] = inside(WA, p, t, cr, a, b), home = V(r * Math.sin(p.u), y, r * Math.cos(p.u)), v0 = V(1.15 * Math.sin(WA.vphi), 0, 1.15 * Math.cos(WA.vphi)), v1 = V(cr * Math.sin(WA.vphi), 0, cr * Math.cos(WA.vphi));
      const q = clamp(age); let v; if (q < 0.4) v = v0.clone().lerp(v1, q / 0.4); else { const qq = (q - 0.4) / 0.6, u = lerp(WA.vphi, p.u, qq); const rr = lerp(cr, r, qq), yy = lerp(0, y, qq); v = V(rr * Math.sin(u), yy, rr * Math.cos(u)); }
      if (inWedge(WA, Math.atan2(v.x, v.z))) return null; return WA.L.localToWorld(v); }
    if (mode === "out") { // out of the hole at the bottom, round the tube, out through the spoke holes
      const q = clamp((k(F("nailT", 0.6), F("flatT", 0.6)) * 1.4 - p.ph * 0.4)); const hole = 92 * D;
      if (q <= 0) { const [r, y] = inside(WA, p, t, cr, a, b); if (Math.abs(p.u - hole) > 40 * D && !inWedge(WA, p.u)) {} const v = V(r * Math.sin(p.u), y, r * Math.cos(p.u)); return inWedge(WA, p.u) ? null : WA.L.localToWorld(v); }
      const side = p.side, u = hole + side * p.ph * 0.5 * D * 20;
      let r, y; if (q < 0.3) { r = lerp(cr, 3.0, q / 0.3); y = 0; } else if (q < 0.7) { const qq = (q - 0.3) / 0.4, th = lerp(0, 180, qq) * D; r = cr + (a + 0.05) * Math.cos(th); y = side * (b + 0.05) * Math.sin(th); } else { const qq = (q - 0.7) / 0.3; r = lerp(cr - a - 0.05, 0.7, qq); y = lerp(0, side * 0.2, qq); }
      if (q >= 1) return null; return WA.L.localToWorld(V(r * Math.sin(u), y, r * Math.cos(u))); }
    if (mode === "spokes") { const q = (t * 0.8 + p.ph) % 1, sp = WA.spk[i % WA.spk.length][0]; if (inWedge(WA, sp)) return null; const r = lerp(2.2, 0.6, q); return WA.L.localToWorld(V(r * Math.sin(sp), (p.ph - 0.5) * 0.2 * q, r * Math.cos(sp))); }
    const [r, y] = inside(WA, p, t, cr, a, b); if (inWedge(WA, p.u)) return null; return WA.L.localToWorld(V(r * Math.sin(p.u), y, r * Math.cos(p.u)));
  });
  if (pumping) airA(AIRN, "in");
  else if (t >= A("armour") && t < A("less")) airA(AIRN * 0.7, "rest");
  else if (t >= nT0 && t < A("nailL")) airA(AIRN * 0.8, t > F("nailT", 0.6) ? "out" : "rest");
  else if (butK && t > F("but", 0.12) && t < F("but", 0.55)) airA(AIRN * 0.7, "spokes");
  // pressure arrows from the tube onto the tyre
  if (t > F("inflate", 0.68) && t < A("armour")) arrA.forEach((g, i) => { const ph = i < 7 ? 185 * D + 2 * D : 95 * D - 2 * D, th = (-150 + (i % 7) * 50) * D, [cr, a, b] = WA.tubeE; arrow(g, lp(WA, cr + a * 0.55 * Math.cos(th), b * 0.55 * Math.sin(th), ph), lp(WA, cr + Math.cos(th), Math.sin(th), ph).sub(lp(WA, cr, 0, ph)), 0.6 + 0.4 * Math.sin(t * 6 + i)); });
  // nail into the tube wheel at the bottom
  if (t >= nT0 && t < A("nailL")) { nailA.visible = true; const pen = ease(k(F("nailT", 0.22), F("nailT", 0.4))); nailA.position.set(WA.G.position.x + 0.0, lerp(-0.9, 0.05, pen) - 0.0, 0.08); nailA.rotation.set(0, 0, 0); }

  // ===== studio B: the tubeless wheel =====
  WB.cut = 90 * D * ease(k(F("less", 0.05), F("less", 0.3))); WB.ghost = 0; WB.squash = 0; WB.tubeOn = false;
  // bead: deflate (beads drop into the well), then air in → beads slide out and pop onto the seats
  let seat = 1; const Bd = A("bead");
  if (t >= Bd && t < A("seal")) seat = 1 - ease(k(F("bead", 0.12), F("bead", 0.3))) + ease(k(F("bead", 0.55), F("bead", 0.86)));
  WB.s = clamp(seat);
  let rollB = (t < A("less") ? 0 : -0.2) + (t > A("seal") && t < A("nailT") ? (t - A("seal")) * 0.04 : 0);
  const nL = A("nailL");
  if (t >= nL && t < A("fix")) rollB = -lerp(40, 92, ease(k(nL, F("nailL", 0.22)))) * D;
  if (t >= A("plug") && t < A("heat")) rollB = -92 * D;
  if (t >= A("heat") && t < A("but")) rollB = (t - A("heat")) * 2.5;
  WB.G.rotation.z = rollB; poseWheel(WB);
  if (t > A("liner") && t < A("bead")) { const q = (t - A("liner")) / (A("bead") - A("liner")); M.liner.emissiveIntensity = q < 0.6 ? 0.6 + 0.5 * Math.sin(t * 8) : 0.15; if (q > 0.6) hi(M.rim, 0x4fc3ff, 0.4 + 0.3 * Math.sin(t * 8)); }
  if (t > F("bead", 0.3) && t < F("bead", 0.9)) M.bead.emissiveIntensity = 0.8 + 0.4 * Math.sin(t * 10);
  // air in the tyre (directly) + pump while seating
  const airInB = t < Bd ? 1 : t < A("seal") ? (t < F("bead", 0.3) ? 1 - k(F("bead", 0.1), F("bead", 0.3)) : k(F("bead", 0.5), F("bead", 0.85))) : 1;
  if (t >= A("less") && t < A("fix")) poseAir(AB, Math.round(AIRN * 0.75 * airInB), (p) => { const b = lerp(0.56, 0.76, WB.s); const [r, y] = inside(WB, p, t, TY.cr + 0.02, (TY.a - TY.th - 0.08), (b - TY.th - 0.08)); if (inWedge(WB, p.u)) return null;
    if (t > nL && t < A("fix") && p.ph < 0.05) { const q = (t * 0.25 + p.ph * 20) % 1; return WB.L.localToWorld(V((2.9 + q * 0.6) * Math.sin(92 * D + 1 * D), 0.03, (2.9 + q * 0.6) * Math.cos(92 * D + 1 * D))); }
    return WB.L.localToWorld(V(r * Math.sin(p.u), y, r * Math.cos(p.u))); });
  if (t > F("bead", 0.45) && t < A("seal")) { hoseB.visible = true; const tip = WB.L.localToWorld(V(1.25 * Math.sin(WB.vphi), 0, 1.25 * Math.cos(WB.vphi))); const c = new THREE.CatmullRomCurve3([tip, tip.clone().add(V(0.3, 0.3, 0.6)), tip.clone().add(V(-1.4, -1.8, 2.6)), V(-3.5, 0.05, 4)]); hoseB.geometry.dispose(); hoseB.geometry = new THREE.TubeGeometry(c, 40, 0.07, 8); }
  // bead arrows (axial, outward) + the pop
  const beadArrows = (kk, n0 = 0) => arrB.slice(n0, n0 + 4).forEach((g, i) => { const ph = i < 2 ? 185 * D + 2 * D : 95 * D - 2 * D, sd = i % 2 ? 1 : -1, bp = beadPos(WB.s)[i % 2]; arrow(g, lp(WB, bp.x + 0.12, bp.y - sd * 0.25, ph), lp(WB, 0, sd, ph).sub(lp(WB, 0, 0, ph)), kk); });
  if (t > F("bead", 0.5) && t < F("bead", 0.86)) beadArrows(0.7 + 0.3 * Math.sin(t * 8));
  if (t > F("bead", 0.84) && t < F("bead", 0.98)) { popRing.visible = true; const q = k(F("bead", 0.84), F("bead", 0.98)); popRing.position.copy(lp(WB, 2.05, 0.46, 187 * D)); popRing.lookAt(cam().position); popRing.scale.setScalar(1 + q * 4); popRing.material.opacity = 0.9 * (1 - q); }
  if (t > A("seal") && t < A("nailT")) { const kk = 0.5 + 0.5 * ease(k(A("seal"), F("seal", 0.7))); beadArrows(kk * (0.8 + 0.2 * Math.sin(t * 7)));
    arrB.slice(4).forEach((g, i) => { const ph = i < 5 ? 185 * D + 2 * D : 95 * D - 2 * D, th = (-120 + (i % 5) * 60) * D; arrow(g, lp(WB, TY.cr + 0.2 * Math.cos(th), 0.25 * Math.sin(th), ph), lp(WB, TY.cr + Math.cos(th), Math.sin(th), ph).sub(lp(WB, TY.cr, 0, ph)), kk); });
    hi(M.rim, 0x3dff8c, 0.25 * kk); M.liner.emissiveIntensity = 0.3 + 0.5 * kk; }
  // the nail into the tubeless tyre, the grip, the plug
  if (t >= nL && t < A("fix")) { nailB.visible = true; const pen = ease(k(F("nailL", 0.2), F("nailL", 0.36))); nailB.position.set(0, lerp(-0.9, 0.05, pen), 0.08);
    if (t > F("nailL", 0.45)) { grip.visible = true; grip.position.set(0, 0.2, 0.08); grip.rotation.x = Math.PI / 2; grip.scale.setScalar(1.25 - 0.25 * ease(k(F("nailL", 0.45), F("nailL", 0.7))) + 0.06 * Math.sin(t * 9)); } }
  if (t >= A("plug") && t < A("heat")) { const pull = ease(k(F("plug", 0.12), F("plug", 0.3))); nailB.visible = pull < 1; nailB.position.set(0, lerp(0.05, -1.4, pull), 0.08);
    const push = ease(k(F("plug", 0.38), F("plug", 0.62))), back2 = ease(k(F("plug", 0.68), F("plug", 0.85))); plug.visible = t > F("plug", 0.32); plug.position.set(0, lerp(-1.5, -0.25, push) - back2 * 1.2 * 0, 0.08);
    plug.userData.tool.forEach((m) => { m.visible = back2 < 1; m.position.y = (m.geometry.type === "BoxGeometry" ? -1.2 : -0.55) - back2 * 1.5; }); }
  // heat
  if (t > A("heat") && t < F("heat", 0.5)) { hi(M.tube, 0xff5a1a, 0.7 + 0.3 * Math.sin(t * 12)); }
  heatRing.position.copy(WA.G.position); coolRing.position.copy(WB.G.position);
  if (t > F("heat", 0.5) && t < A("but")) M.liner.emissiveIntensity = 0.7;

  // ===== the road =====
  const roadOn = t < A("cut") || (t >= A("verdict") && t < A("orbi"));
  const dist = t * 4.5, hit = F("hook", 0.32);
  stripes.forEach((m, i) => m.position.set(((((i * 3 - dist) % 42) + 42) % 42) - 21, 0.02, 0));
  trees.forEach((g, i) => g.position.set(((((i * 5.3 - dist * 0.8) % 64) + 64) % 64) - 32, 0, g.userData.z));
  const flatK = t < A("cut") ? ease(k(hit, hit + 1.2)) : 1;
  RA.squash = flatK * 0.9; RA.bottom = 0; RA.cut = 0; RB.cut = 0; RB.squash = 0;
  const lagA = t < A("cut") ? Math.max(0, t - hit - 0.6) * 3.2 : 9;
  RA.G.position.set(-lagA + (t < A("cut") ? 0 : -6), 2.0 - flatK * 0.45 + (flatK > 0.2 && t < A("cut") ? Math.abs(Math.sin(t * 18)) * 0.03 : 0), 1.6); RA.G.rotation.z = t < hit ? -dist / 2 : -hit * 4.5 / 2 - (t - hit) * 0.4;
  RB.G.position.set(t < A("cut") ? 0.6 : 0, 2.0, -1.6); RB.G.rotation.z = -dist / 2;
  if (roadOn) { poseWheel(RA); poseWheel(RB); }
  RA.fork.position.copy(RA.G.position); RB.fork.position.copy(RB.G.position); RA.fork.position.y -= 0; RA.fork.scale.setScalar(0.62); RB.fork.scale.setScalar(0.62);
  roadNails[0].position.set(-(t - hit) * 4.5 + (RA.G.position.x), 0, 1.6); roadNails[1].position.set(-(t - hit) * 4.5 + 0.6, 0, -1.6);
  roadNails.forEach((n) => (n.visible = t < hit + 0.05 && t < A("cut")));
  if (!RB.stuck) { RB.stuck = makeNail(RB.L); RB.stuck.scale.setScalar(1.1); }
  RB.stuck.visible = t >= A("verdict"); RB.stuck.position.set(3.15 * Math.sin(0.5), 0, 3.15 * Math.cos(0.5)); RB.stuck.quaternion.setFromUnitVectors(V(0, -1, 0), V(Math.sin(0.5), 0, Math.cos(0.5)));

  // ===== Orbi =====
  const O = A("orbi"), O2 = A("orbi2");
  screen(PH, { layers: [["one", 1]], lock: ease(k(F("orbi", 0.68), F("orbi", 0.85))) });
  const arr = k(F("orbi2", 0.05), F("orbi2", 0.3)); screen(PH2, { layers: [["many", 1]], glow: arr >= 1 ? 1 : 0 });
  beam.visible = t > F("orbi2", 0.05) && arr < 1; beam.position.copy(lerpV(V(0, 2.2, 0.3), V(2.6, 1.6, -2.3), ease(arr))).add(V(0, Math.sin(arr * Math.PI) * 1.2, 0));
  const burn = k(F("orbi2", 0.6), F("orbi2", 0.95));
  PH.phone.g.scale.setScalar(22 * (1 - burn * 0.95)); PH.phone.g.visible = burn < 1;
  for (let i = 0; i < EN; i++) { const d = emberDir[i]; emberPos.set([d[0] * out(burn), 2.2 + d[1] * out(burn) - burn * burn, d[2] * out(burn)], i * 3); }
  emberGeo.attributes.position.needsUpdate = true; embers.material.opacity = burn > 0 && burn < 1 ? 1 - burn * 0.6 : 0;

  // ================= shots =================
  const C = WA.G.position, CB = WB.G.position;
  const wA = (key) => lp(WA, ...key), wB = (key) => lp(WB, ...key);
  if (t < F("hook", 0.3)) {
    world("road"); const q = k(0, F("hook", 0.3)); look(lerp(-2, 0.5, q), 3.2, lerp(15, 12.5, q), 0, 1.6, 0, 42);
  } else if (t < F("hook", 0.58)) {
    world("road"); const q = k(F("hook", 0.3), F("hook", 0.58)); look(lerp(-4.5, -5.5, q), 1.6, 6.5, -2.5, 1.2, 1.6, 44); flash(t, hit, 0.7, 4); big(t, F("hook", 0.36), F("hook", 0.58), "FLAT.", 420); counter(t, hit, F("hook", 0.58), `${Math.max(0, 2.4 - (t - hit) * 2.4).toFixed(1)} BAR`);
  } else if (t < F("hook", 0.8)) {
    world("road"); const q = k(F("hook", 0.58), F("hook", 0.8)); look(lerp(4.5, 3.5, q), 2.0, 5.2, 0.4, 1.4, -1.6, 44); big(t, F("hook", 0.6), F("hook", 0.8), "STILL ROLLING", 420); counter(t, F("hook", 0.6), F("hook", 0.8), "2.4 BAR");
  } else if (t < A("cut")) {
    world("A"); const q = k(F("hook", 0.8), A("cut")); look(lerp(9, 8, q), 5.0, lerp(17, 16, q), 0, 2.0, 0, 42);
    sweep.visible = true; sweep.position.set(lerp(-5, 5, q), 3.3, 0.9); sweep.rotation.z = 0.5;
  } else if (t < A("tube")) {
    world("A"); const q = k(A("cut"), A("tube")); if (q < 0.3) look(lerp(8, 7, q / 0.3), 5.0, lerp(16, 14, q / 0.3), 0, 2.0, 0, 42); else { const qq = (q - 0.3) / 0.7; lookV(V(lerp(5.2, 3.9, qq), lerp(6.6, 6.2, qq), lerp(6.0, 4.6, qq)), V(-0.15, lerp(5.2, 5.35, qq), 0.1), 42); }
    callout(t, F("cut", 0.36), A("tube"), wA([1.72, 0.1, 186 * D]), 260, 260, "RIM", "#4fc3ff");
    callout(t, F("cut", 0.5), A("tube"), wA([3.08, 0.0, 186 * D]), 800, 300, "TYRE", "#ff9a2a");
    callout(t, F("cut", 0.68), A("tube"), wA([2.17 + 0.05, 0.42, 186 * D]), 820, 980, "INNER TUBE", "#ff3a5a");
  } else if (t < A("inflate")) {
    world("A"); const q = k(A("tube"), A("inflate")); const vp = wA([1.5, 0, WA.vphi]); lookV(vp.clone().add(V(lerp(2.2, 1.4, q), lerp(1.4, 1.0, q), lerp(4.2, 3.2, q))), vp.clone().add(V(0, 0.3, 0)), 42);
    callout(t, F("tube", 0.15), A("inflate"), wA([2.2, 0.3, 188 * D]), 820, 330, "A RUBBER RING", "#ff3a5a");
    callout(t, F("tube", 0.48), A("inflate"), wA([1.2, 0, WA.vphi]), 250, 980, "VALVE", "#c9a24a");
    callout(t, F("tube", 0.62), A("inflate"), wA([1.8, 0, WA.vphi]), 820, 900, "HOLE IN THE RIM", "#4fc3ff");
  } else if (t < A("armour")) {
    world("A"); const q = k(A("inflate"), A("armour"));
    if (q < 0.35) { const vp = wA([2.0, 0, 192 * D]); lookV(vp.clone().add(V(2.4, 1.5, 4.4)), vp, 42); callout(t, F("inflate", 0.1), F("inflate", 0.35), wA([1.15, 0, WA.vphi]), 260, 300, "AIR IN", "#8fd3ff"); }
    else { orbit(V(0, 1.9, 0), lerp(0.6, 0.35, (q - 0.35) / 0.65), lerp(14.5, 13.5, q), 3.0, 42); callout(t, F("inflate", 0.72), A("armour"), wA([3.0, 0.2, 188 * D]), 800, 300, "PRESSES ON THE TYRE", "#ffd24a"); }
    counter(t, F("inflate", 0.12), A("armour"), `${(2.4 * tubeFill).toFixed(1)} BAR`);
  } else if (t < A("less")) {
    world("A"); const q = k(A("armour"), A("less")); orbit(V(0, 1.9, 0), lerp(0.4, 0.7, q), lerp(14, 13, q), 3.0, 42);
    callout(t, F("armour", 0.1), F("armour", 0.55), wA([3.1, 0.1, 188 * D]), 800, 290, "TYRE: HOLDS NO AIR", "#ff9a2a");
    callout(t, F("armour", 0.55), A("less"), wA([2.5, 0.35, 188 * D]), 790, 330, "TUBE: HOLDS THE AIR", "#ff3a5a");
  } else if (t < A("liner")) {
    world("B"); const q = k(A("less"), A("liner")); if (q < 0.35) look(lerp(8, 7, q / 0.35), 5.0, lerp(16, 14, q / 0.35), 0, 2.0, 0, 42); else { const qq = (q - 0.35) / 0.65; lookV(V(lerp(5.2, 3.9, qq), lerp(6.6, 6.2, qq), lerp(6.0, 4.6, qq)), V(-0.15, lerp(5.2, 5.35, qq), 0.1), 42); }
    callout(t, F("less", 0.25), A("liner"), wB([1.72, 0.1, 186 * D]), 260, 260, "RIM", "#4fc3ff");
    callout(t, F("less", 0.35), A("liner"), wB([3.08, 0, 186 * D]), 820, 290, "TYRE", "#ff9a2a");
    big(t, F("less", 0.5), F("less", 0.75), "NO TUBE!", 1000); callout(t, F("less", 0.75), A("liner"), wB([2.45, 0.1, 188 * D]), 790, 1000, "AIR INSIDE THE TYRE", "#8fd3ff");
  } else if (t < A("bead")) {
    world("B"); const q = k(A("liner"), A("bead"));
    if (q < 0.6) { const p = wB([2.45, 0.6, 188 * D]); lookV(p.clone().add(V(2.0, 1.4, 3.4)), p, 42); callout(t, F("liner", 0.1), F("liner", 0.6), wB([2.72, 0.56, 186 * D]), 800, 300, "AIRTIGHT LINING", "#1fc7a6"); }
    else { const p = wB([1.8, 0, 170 * D]); lookV(p.clone().add(V(-0.5, 3.4, 6.0)), p.clone().add(V(0, -0.6, 0)), 42); callout(t, F("liner", 0.62), A("bead"), wB([1.72, 0, 150 * D]), 300, 300, "NO SPOKE HOLES", "#4fc3ff"); }
  } else if (t < A("seal")) {
    world("B"); const q = k(A("bead"), A("seal")); const p = wB([2.0, 0.2, 186 * D]); lookV(p.clone().add(V(lerp(1.9, 1.5, q), lerp(1.2, 1.0, q), lerp(3.4, 2.9, q))), p, 40);
    callout(t, F("bead", 0.05), F("bead", 0.3), wB([2.07, 0.45, 186 * D]), 820, 300, "BEAD (STEEL WIRE)", "#d6dbe2");
    callout(t, F("bead", 0.3), F("bead", 0.5), wB([1.95, 0.27, 186 * D]), 820, 300, "NO AIR: LOOSE", "#ff9a2a");
    if (t > F("bead", 0.84)) big(t, F("bead", 0.86), A("seal"), "POP!", 420);
    counter(t, F("bead", 0.5), A("seal"), `${(2.4 * k(F("bead", 0.5), F("bead", 0.95))).toFixed(1)} BAR`);
  } else if (t < A("nailT")) {
    world("B"); const q = k(A("seal"), A("nailT")); orbit(V(0.3, 1.9, 0), lerp(0.55, 0.35, q), lerp(13, 14, q), 3.0, 42);
    callout(t, F("seal", 0.1), A("nailT"), wB([2.45, 0, 188 * D]), 800, 300, "ONE SEALED CHAMBER", "#3dff8c");
    callout(t, F("seal", 0.5), A("nailT"), wB([2.07, 0.45, 187 * D]), 260, 1000, "MORE AIR = TIGHTER", "#ffd24a");
  } else if (t < fT) {
    world("A"); const q = k(nT0, fT); const p = V(0, 0.35, 0.1);
    if (q < 0.28) look(lerp(-7, -5, q / 0.28), 2.5, 9, 0, 1.6, 0, 42); else lookV(p.clone().add(V(lerp(1.5, 1.2, q), lerp(0.9, 0.7, q), lerp(3.4, 2.6, q))), p, 40);
    if (t > F("nailT", 0.4)) flash(t, F("nailT", 0.4), 0.5, 4);
    callout(t, F("nailT", 0.42), fT, V(0, 0.42, 0.1), 820, 320, "THE TUBE TEARS", "#ff3a5a");
    counter(t, F("nailT", 0.6), fT, `${(2.4 * (1 - 0.3 * k(F("nailT", 0.6), fT))).toFixed(1)} BAR`);
  } else if (t < nL) {
    world("A"); const q = k(fT, nL);
    if (q < 0.55) { const p = V(0.2, 0.9, 0); lookV(p.clone().add(V(lerp(2.6, 2.2, q), 1.6, lerp(5.2, 4.4, q))), p, 42); callout(t, F("flatT", 0.15), F("flatT", 0.55), V(-0.6, 0.8, 0.3), 260, 300, "AIR ESCAPES", "#8fd3ff"); }
    else { look(6.5, 4.8, 14, 0, 1.9, 0, 42); big(t, F("flatT", 0.8), nL, "FLAT.", 420); }
    counter(t, fT, nL, `${Math.max(0, 1.7 * (1 - k(F("flatT", 0.05), F("flatT", 0.6)))).toFixed(1)} BAR`);
  } else if (t < A("slow")) {
    world("B"); const q = k(nL, A("slow")); const p = V(0, 0.35, 0.1);
    if (q < 0.25) look(lerp(-7, -5, q / 0.25), 2.5, 9, 0, 1.6, 0, 42); else lookV(p.clone().add(V(lerp(1.5, 1.1, q), 0.8, lerp(3.2, 2.5, q))), p, 40);
    callout(t, F("nailL", 0.5), A("slow"), V(0, 0.2, 0.1), 820, 320, "RUBBER GRIPS IT", "#ff9a2a");
  } else if (t < A("fix")) {
    world("B"); const q = k(A("slow"), A("fix")); const p = V(0, 0.6, 0.1); lookV(p.clone().add(V(lerp(2.2, 2.6, q), 1.0, lerp(3.8, 4.4, q))), p, 42);
    callout(t, F("slow", 0.1), A("fix"), V(0.0, 0.0, 0.1), 820, 320, "A SLOW HISS", "#8fd3ff");
    counter(t, A("slow"), A("fix"), `${(2.4 - 0.1 * k(A("slow"), A("fix"))).toFixed(1)} BAR`);
  } else if (t < A("plug")) {
    world("A"); const q = k(A("fix"), A("plug")); orbit(V(0, 2.1, 0.8), lerp(0.9, 0.6, q), lerp(15, 14, q), 3.2, 42);
    callout(t, F("fix", 0.2), F("fix", 0.6), wA([3.1, 1.9, 200 * D]), 820, 300, "TYRE OFF", "#ff9a2a");
    callout(t, F("fix", 0.66), A("plug"), patch.position, 820, 300, "PATCH", "#f2c21b");
  } else if (t < A("heat")) {
    world("B"); const q = k(A("plug"), A("heat")); const p = V(0, 0.2, 0.1); lookV(p.clone().add(V(lerp(2.0, 1.6, q), 0.9, lerp(3.8, 3.2, q))), p, 40);
    callout(t, F("plug", 0.4), A("heat"), V(0, 0.15, 0.1), 820, 320, "RUBBER PLUG", "#c98a4a");
    big(t, F("plug", 0.8), A("heat"), "MINUTES.", 420);
  } else if (t < A("but")) {
    const q = k(A("heat"), A("but"));
    if (q < 0.5) { world("A"); orbit(V(0, 1.9, 0), 0.55, 13.8, 3.0, 42); callout(t, F("heat", 0.1), F("heat", 0.5), wA([2.95, 0.3, 188 * D]), 800, 300, "TUBE RUBS: HEAT", "#ff5a1a"); }
    else { world("B"); orbit(V(0, 1.9, 0), 0.55, 13.8, 3.0, 42); callout(t, F("heat", 0.52), A("but"), wB([2.95, 0.3, 188 * D]), 800, 300, "NO TUBE: COOLER", "#4fc3ff"); }
  } else if (t < A("verdict")) {
    world("A"); const q = k(A("but"), A("verdict"));
    if (q < 0.55) { const p = V(0, 3.3, 0); lookV(V(lerp(3.5, 2.5, q), lerp(5.5, 5.0, q), lerp(12, 10.5, q)), p.clone().add(V(0, -1.2, 0)), 42); callout(t, F("but", 0.15), F("but", 0.55), wA([1.72, 0, WA.spk[3][0]]), 820, 300, "A HOLE PER SPOKE", "#4fc3ff"); }
    else { orbit(V(0, 1.9, 0), lerp(0.6, 0.4, q), 13.8, 3.0, 42); callout(t, F("but", 0.58), F("but", 0.78), wA([2.3, 0.3, 188 * D]), 800, 300, "SO: A TUBE", "#ff3a5a"); callout(t, F("but", 0.8), A("verdict"), wA([2.3, 0.3, 188 * D]), 800, 300, "CHEAP & EASY TO SWAP", "#ff3a5a"); }
  } else if (t < A("orbi")) {
    world("road"); const q = k(A("verdict"), A("orbi")); look(lerp(-1.5, 1.5, q), 2.6, lerp(9.5, 8, q), 0, 1.5, 0, 42);
    big(t, F("verdict", 0.12), F("verdict", 0.4), "TUBELESS", 420); big(t, F("verdict", 0.72), A("orbi"), "SLOW = SAFE", 420);
  } else if (t < O2) {
    world("orbi"); const q = k(O, O2); look(lerp(1.5, 0.6, q), lerp(2.6, 2.4, q), lerp(6.5, 5.2, q), 0, 2.2, 0, 44);
    flash(t, O, 0.8, 3); tag("tR", t, F("orbi", 0.3), F("orbi", 0.62), 540, 190); tag("tS", t, F("orbi", 0.66), O2, 540, 190);
  } else {
    world("orbi"); const q = k(O2, A("end")); orbit(V(1, 1.9, -1), lerp(0.1, -0.4, q), lerp(9, 7.5, q), 2.5, 46);
    tag("tT", t, F("orbi2", 0.05), F("orbi2", 0.5), 540, 190); timer(t, F("orbi2", 0.6), F("orbi2", 0.95));
  }
  drawCallouts();
});
function cam() { return K.cam; }
await ready();
