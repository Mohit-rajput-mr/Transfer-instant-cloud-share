// "Two tyres, the same nail" — tube vs tubeless. Tube tyre: a separate inner tube holds the air (the tyre is only the
// shell and is not sealed to the rim), so a puncture pops the tube and the air escapes round it and out through the wheel.
// Tubeless: an airtight liner inside the tyre, beads pressed onto the rim by the air pressure itself; the rubber grips
// the nail, so the leak is slow; repaired with a plug from outside; no tube rubbing (less heat, less weight).
// Tubes remain for most wire-spoke wheels (spoke holes) and because they are cheap. Then Orbi: nothing in the middle
// (no login, no app), sealed on your phone before it leaves, about a second, 30-minute burn.
import { THREE, K } from "./kit/engine.js";
const { V, clamp, ease, out, back, lerp, lerpV, rnd, canvasTex, sh, flat, lowGround, pick, tree, cloud, makePhone,
  person, posePerson, people, screen, addWorld, world, look, lookV, orbit, at, fr, prog, tag, tags, big, redX, timer, flash, frame, ready } = K;
const glow = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, toneMapped: false });
const D2R = Math.PI / 180, DEPTH = 1.5;
const ext = (shape, mat, depth = DEPTH, z = -DEPTH / 2) => { const m = sh(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 20 }), mat)); m.position.z = z; return m; };
const label = (text, w = 1.6, h = 0.5, bg = "#f6f2ea", fg = "#14161b") => {
  const tx = canvasTex(512, Math.round((512 * h) / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.font = `800 ${Math.round(ch * 0.5)}px M`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, cw / 2, ch / 2 + 2); });
  return sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), [0, 0, 0, 0, 1, 1].map((k) => (k ? new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5 }) : flat(0xd9d2c3)))));
};

// ---------- a slice through the bottom of a wheel: rim on top, tread on the road ----------
function makeSlice(parent, tubeless) {
  const g = new THREE.Group(); parent.add(g);
  const A0 = 160 * D2R, A1 = 380 * D2R, RO = 2.0, RI = 1.55;
  const ty = new THREE.Shape(); ty.absarc(0, 0, RO, A0, A1, false); ty.absarc(0, 0, RI, A1, A0, true);
  const tyre = ext(ty, flat(0x23262d)); g.add(tyre);
  for (let i = 0; i < 7; i++) { const a = (228 + i * 14) * D2R, b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, DEPTH * 1.02), flat(0x15171c))); b.position.set(Math.cos(a) * 2.03, Math.sin(a) * 2.03, 0); b.rotation.z = a + Math.PI / 2; g.add(b); }
  const beads = [-1, 1].map((s) => { const c = new THREE.Shape(); c.absarc(s * 1.668, 0.607, 0.27, 0, Math.PI * 2, false); const m = ext(c, new THREE.MeshStandardMaterial({ color: 0x3a3f48, emissive: 0xff9a2a, emissiveIntensity: 0, flatShading: true })); g.add(m); return m; });
  const rimM = flat(0xb9c0cb, { metalness: 0.6, roughness: 0.35 });
  const plate = sh(new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.2, DEPTH * 1.04), rimM)); plate.position.set(0, 1.0, 0); g.add(plate);
  for (const s of [-1, 1]) { const f = sh(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, DEPTH * 1.04), rimM)); f.position.set(s * 2.07, 0.62, 0); g.add(f); }
  const valve = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8), flat(0x8a6a2a, { metalness: 0.6 }))); valve.position.set(0.5, 1.3, 0); g.add(valve);
  const cap = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8), flat(0x15171c))); cap.position.set(0.5, 1.75, 0); g.add(cap);
  // the air: a soft blue body and dots that jitter (pressure)
  const airS = new THREE.Shape(); airS.absellipse(0, 0, 1, 1, 0, Math.PI * 2, false, 0);
  const air = ext(airS, new THREE.MeshBasicMaterial({ color: 0x6fc4ff, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }), DEPTH * 0.9, -DEPTH * 0.45); g.add(air);
  const dots = [...Array(46)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(0xeaf7ff)); g.add(m); m.userData = { a: rnd() * 6.283, r: Math.sqrt(rnd()), p: rnd() * 6.283, z: (rnd() - 0.5) * DEPTH * 0.7, side: rnd() < 0.5 ? -1 : 1, ph: rnd() }; return m; });
  let tube = null, liner = null, heat = null;
  if (!tubeless) {
    const ts = new THREE.Shape(); ts.absellipse(0, 0, 1, 1, 0, Math.PI * 2, false, 0); const hole = new THREE.Path(); hole.absellipse(0, 0, 0.9, 0.9, 0, Math.PI * 2, true, 0); ts.holes.push(hole);
    tube = ext(ts, flat(0xff7f96, { roughness: 0.6 })); g.add(tube);
    const hs = new THREE.Shape(); hs.absarc(0, 0, 1.56, 200 * D2R, 340 * D2R, false); hs.absarc(0, 0, 1.47, 340 * D2R, 200 * D2R, true);
    heat = ext(hs, glow(0xff5a2a, 0.0), DEPTH * 1.02, -DEPTH * 0.51); g.add(heat);
  } else {
    const ls = new THREE.Shape(); ls.absarc(0, 0, 1.56, A0, A1, false); ls.absarc(0, 0, 1.48, A1, A0, true);
    liner = ext(ls, new THREE.MeshStandardMaterial({ color: 0x2ad1b0, emissive: 0x2ad1b0, emissiveIntensity: 0.25, flatShading: true }), DEPTH * 1.02, -DEPTH * 0.51); g.add(liner);
  }
  const arrows = [...Array(6)].map((_, i) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 6), glow(0xffd24a)); g.add(c); c.userData.a = i < 2 ? (i ? 0 : Math.PI) : (215 + (i - 2) * 36) * D2R; return c; });
  // the nail, the grip ring and the repair plug
  const nail = new THREE.Group(); { const m = flat(0x8e96a3, { metalness: 0.6, roughness: 0.3 }); const s = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), m)); const tip = sh(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 8), m)); tip.position.y = 0.68; const hd = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 10), m)); hd.position.y = -0.56; nail.add(s, tip, hd); }
  g.add(nail);
  const grip = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 6, 16), glow(0xff9a2a)); grip.rotation.x = Math.PI / 2; grip.position.set(0, -1.78, 0); g.add(grip);
  const plug = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 8), glow(0xff9a2a))); g.add(plug);
  return { g, tyre, beads, air, dots, tube, liner, heat, arrows, nail, grip, plug, tubeless };
}
/** pose a slice: fill 0..1 (how much air), nailK 0..1 (nail in), leak 0..1 (air escaping), squash 0..1 */
function poseSlice(S, t, { fill = 1, nailK = 0, leak = 0, squash = 0, seal = 0, hot = 0, plugK = -1, gripOn = false } = {}) {
  const sq = 1 - 0.3 * squash; S.g.scale.set(1 + 0.06 * squash, sq, 1); S.g.position.y = -2 * (1 - sq);
  const f = Math.max(0.02, fill);
  if (!S.tubeless) {
    const rx = lerp(0.55, 1.46, f), ry = lerp(0.42, 1.16, f), cy = lerp(-0.95, -0.28, f);
    S.tube.scale.set(rx, ry, 1); S.tube.position.set(0, cy, -DEPTH / 2);
    S.air.scale.set(rx * 0.9, ry * 0.9, 1); S.air.position.set(0, cy, -DEPTH * 0.45); S.air.material.opacity = 0.5 * clamp(f * 1.5);
    S.dots.forEach((d, i) => { const u = d.userData, jx = Math.sin(t * 7 + u.p) * 0.05, jy = Math.cos(t * 6 + u.p * 2) * 0.05;
      const home = V(Math.cos(u.a) * u.r * rx * 0.82 + jx, cy + Math.sin(u.a) * u.r * ry * 0.82 + jy, u.z);
      const q = leak > 0 ? clamp(leak * 1.5 - u.ph * 0.5) : 0;
      if (q <= 0) { d.position.copy(home); d.visible = f > 0.1 && i < 46 * f + 6; return; }
      // out of the hole, round the outside of the tube, past the bead and away through the wheel
      const a = (270 + u.side * lerp(0, 118, clamp((q - 0.2) / 0.5))) * D2R, rr = 1.5, on = V(Math.cos(a) * rr, Math.sin(a) * rr, u.z);
      const p = q < 0.2 ? lerpV(home, V(0, -1.45, u.z), q / 0.2) : q < 0.7 ? on : lerpV(on, V(u.side * 2.6, 3.4, u.z), (q - 0.7) / 0.3);
      d.position.copy(p); d.visible = q < 1; });
    S.heat.material.opacity = hot * (0.45 + 0.3 * Math.sin(t * 14));
  } else {
    S.air.scale.set(1.47, 1.47 * lerp(0.7, 1, f), 1); S.air.position.set(0, 0, -DEPTH * 0.45); S.air.material.opacity = 0.5 * f;
    S.dots.forEach((d, i) => { const u = d.userData, a = lerp(170, 370, u.a / 6.283) * D2R, r = u.r * 1.35;
      const home = V(Math.cos(a) * r + Math.sin(t * 7 + u.p) * 0.05, Math.min(0.8, Math.sin(a) * r) + Math.cos(t * 6 + u.p * 2) * 0.05, u.z);
      const slow = leak > 0 && i < 5 ? (t * 0.35 + u.ph) % 1 : -1;
      if (slow >= 0) { d.position.set(0.09 * (i % 2 ? 1 : -1), lerp(-1.5, -2.9, slow), 0.3); d.visible = true; }
      else { d.position.copy(home); d.visible = i < 46 * f; } });
  }
  S.beads.forEach((b) => (b.material.emissiveIntensity = seal * (0.8 + 0.4 * Math.sin(t * 8))));
  S.arrows.forEach((c) => { const a = c.userData.a, r = lerp(0.7, 1.15, (t * 1.3) % 1); c.visible = seal > 0.05; c.position.set(Math.cos(a) * r, Math.sin(a) * r * (Math.abs(Math.sin(a)) < 0.1 ? 0 : 1) + (Math.abs(Math.sin(a)) < 0.1 ? 0.45 : 0), 0.3); c.rotation.z = a - Math.PI / 2; c.material.opacity = seal; c.material.transparent = true; });
  S.nail.visible = nailK > 0 && plugK < 0.02; S.nail.position.set(0, lerp(-3.6, -2.05, back(clamp(nailK))) - (plugK > 0 ? plugK * 2 : 0), 0);
  S.grip.visible = gripOn && S.nail.visible; S.grip.scale.setScalar(1 + 0.15 * Math.sin(t * 9));
  S.plug.visible = plugK > 0; S.plug.position.set(0, lerp(-3.4, -1.75, ease(clamp(plugK))), 0);
}

// ---------- a whole wheel (for the road and the workbench) ----------
function makeWheel(parent, hub, spokes = 5, wire = false) {
  const g = new THREE.Group(); parent.add(g);
  const tyre = sh(new THREE.Mesh(new THREE.TorusGeometry(1, 0.33, 10, 28), flat(0x23262d))); g.add(tyre);
  for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.283, b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.5), flat(0x15171c)); b.position.set(Math.cos(a) * 1.33, Math.sin(a) * 1.33, 0); b.rotation.z = a + Math.PI / 2; tyre.add(b); }
  const rim = sh(new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.07, 6, 28), flat(0xc9ced6, { metalness: 0.7, roughness: 0.3 }))); g.add(rim);
  const h = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12), flat(hub))); h.rotation.x = Math.PI / 2; g.add(h);
  const sp = new THREE.Group(); g.add(sp);
  for (let i = 0; i < spokes; i++) { const a = (i / spokes) * 6.283, s = sh(new THREE.Mesh(new THREE.BoxGeometry(wire ? 0.018 : 0.1, 0.62, wire ? 0.018 : 0.08), flat(wire ? 0xe6e9ee : hub, { metalness: 0.5 }))); s.position.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, wire ? (i % 2 ? 0.05 : -0.05) : 0); s.rotation.z = a - Math.PI / 2 + (wire ? (i % 2 ? 0.25 : -0.25) : 0); sp.add(s); }
  return { g, tyre, rim, sp };
}

// ---------- world 1: the road ----------
const road = addWorld("road", { bg: 0xa9dcff, fog: [16, 46], hemi: 1.05, sun: 2.3 });
road.add(lowGround(70, 40, 34, (x, y, z) => (z > -3.4 && z < 2.6 ? pick([0x565b66, 0x4e535d, 0x5c616c], x * 3, z) : pick([0x7fbf5f, 0x6fb257, 0x8cc865], x, z)), (x, z) => (z < -3.6 ? Math.sin(x * 0.4) * 0.25 + (-3.6 - z) * 0.12 : 0)));
const stripes = [...Array(12)].map((_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.14), flat(0xf6f2ea)); m.position.set(0, 0.02, -0.4); road.add(m); return m; });
const scenery = [...Array(10)].map((_, i) => { const g = new THREE.Group(); road.add(g); tree(g, 0, 0, 1.6 + (i % 3) * 0.5); g.userData.z = -5 - (i % 4) * 1.6; return g; });
K.reseed(7); for (let i = 0; i < 5; i++) cloud(road, -12 + i * 6, 7 + (i % 2) * 1.5, -14, 1.6);
const WA = makeWheel(road, 0xff5a4a), WB = makeWheel(road, 0x2ad1b0);
const roadNail = new THREE.Group(); { const m = flat(0xdfe3ea, { metalness: 0.8, roughness: 0.2 }); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), m); s.position.y = 0.25; const tp = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), m); tp.position.y = 0.56; roadNail.add(s, tp); } road.add(roadNail);
const roadNail2 = roadNail.clone(); road.add(roadNail2);
const stuck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 6), flat(0xdfe3ea, { metalness: 0.8 })); stuck.position.set(0, -1.36, 0.1); WB.tyre.add(stuck);

// ---------- worlds 2 + 3: the two slices ----------
const cutA = addWorld("cutA", { bg: 0xf6e7cf, hemi: 1.15, sun: 2.0, sky: 0xffffff });
const cutB = addWorld("cutB", { bg: 0xd9f1e6, hemi: 1.15, sun: 2.0, sky: 0xffffff });
for (const w of [cutA, cutB]) { const slab = sh(new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), flat(0x565b66))); slab.position.set(0, -2.3, 0); w.add(slab);
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.16), flat(0xf6f2ea)); s.position.set(-5 + i * 2.5, -2.04, 1.7); w.add(s); } }
K.reseed(11); const SA = makeSlice(cutA, false); K.reseed(12); const SB = makeSlice(cutB, true);
const nameA = label("TUBE", 2.0, 0.6, "#ff5a4a", "#fff"); nameA.position.set(0, 2.6, 0); cutA.add(nameA);
const nameB = label("TUBELESS", 2.6, 0.6, "#12a88a", "#fff"); nameB.position.set(0, 2.6, 0); cutB.add(nameB);

// ---------- world 4: the workbench (whole wheels: tyre off, tube out; the wire-spoke wheel) ----------
const bench = addWorld("bench", { bg: 0x2b3340, fog: [12, 30], hemi: 0.95, sun: 1.9, sky: 0xdfe9ff });
bench.add(lowGround(24, 24, 20, (x, y, z) => pick([0x6c7480, 0x646c78, 0x747c88], x * 2, z * 2), () => 0));
{ const wall = sh(new THREE.Mesh(new THREE.BoxGeometry(16, 7, 0.3), flat(0x3d4756))); wall.position.set(0, 3.5, -3); bench.add(wall);
  for (let i = 0; i < 6; i++) { const t2 = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9 + (i % 3) * 0.3, 0.06), flat([0xff5a4a, 0xf2c21b, 0x2ad1b0][i % 3]))); t2.position.set(-3.6 + i * 0.5, 4.6, -2.8); bench.add(t2); }
  const tb = sh(new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.2, 2), flat(0x8a6a4a))); tb.position.set(0, 0.9, -1.6); bench.add(tb); }
const WC = makeWheel(bench, 0xff5a4a); WC.g.position.set(0, 2.6, 0);
const pinkTube = sh(new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 8, 28), flat(0xff7f96, { roughness: 0.6 }))); bench.add(pinkTube);
const WS = makeWheel(bench, 0x8a9199, 24, true); WS.g.position.set(0, 2.6, 0);
const holes = [...Array(24)].map((_, i) => { const a = (i / 24) * 6.283, m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), glow(0xffd24a)); m.position.set(Math.cos(a) * 0.66, Math.sin(a) * 0.66, 0.08); WS.g.add(m); return m; });
const leaks = [...Array(48)].map((_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), glow(0xeaf7ff)); WS.g.add(m); m.userData = { a: ((i % 24) / 24) * 6.283, ph: rnd() }; return m; });
const MECH = person(-2.3, 1.2, 0.9, 0xf08a5d, { sex: "m", parent: bench, phone: false });

// ---------- world 5: Orbi ----------
const orb = addWorld("orbi", { bg: 0x07090f, fog: [10, 30], hemi: 0.8, sun: 1.4, sky: 0x9fb8ff });
orb.add(new THREE.GridHelper(40, 40, 0x173a2a, 0x10241a));
const PH = { phone: makePhone() }; PH.phone.g.scale.setScalar(22); PH.phone.g.position.set(0, 2.2, 0); orb.add(PH.phone.g);
const PH2 = { phone: makePhone() }; PH2.phone.g.scale.setScalar(14); PH2.phone.g.position.set(2.6, 1.6, -2.5); PH2.phone.g.rotation.y = -0.5; orb.add(PH2.phone.g);
const beam = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0x3dff8c)); orb.add(beam);
K.reseed(3); const EN = 220, emberGeo = new THREE.BufferGeometry(), emberPos = new Float32Array(EN * 3), emberDir = [...Array(EN)].map(() => [(rnd() - 0.5) * 3.4, rnd() * 3 + 0.5, (rnd() - 0.5) * 2.4]);
emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffa04a, size: 0.09, transparent: true, opacity: 0, toneMapped: false })); orb.add(embers);

tags({
  tA: "Same nail · <b>two endings</b>", tB: "The inner tube · <b>a rubber doughnut</b>", tC: "Air goes <b>into the tube</b>", tD: "The tyre · <b>just armour</b>",
  tE: "No tube · <b>at all</b>", tF: "Airtight <b>inner skin</b>", tG: "Pressure <b>seals the edges</b>", tH: "The balloon <b>pops</b>", tI: "Air escapes <b>through the wheel</b>",
  tJ: "Rubber <b>grips the nail</b>", tK: "A <b>slow</b> leak", tL: "Tube · <b>tyre comes off</b>", tM: "Tubeless · <b>plug from outside</b>",
  tN: "Tube rubs · <b>heat</b>", tO: "No tube · <b>cooler, lighter</b>", tP: "Spoke holes · <b>leak air</b>", tQ: "Fails slowly · <b>safe</b>",
  tR: "No login · <b>no app</b>", tS: "Sealed <b>on your phone</b>", tT: "On the other screen · <b>about a second</b>",
});

// ---------- the film ----------
frame("Try it on two phones", async (t) => {
  const k = (a, b) => prog(t, a, b);
  MECH.mode = "watch"; for (const p of people) posePerson(p, t);

  // the road: both roll, the nail, A goes flat and falls behind, B rolls on (hook and verdict)
  const inV = t > at("verdict") - 0.5, hit = inV ? -99 : fr("hook", 0.3), dist = t * 5.5;
  const flatK = inV ? 0 : ease(k(hit, hit + 1.4));
  stripes.forEach((m, i) => (m.position.x = ((((i * 2.6 - dist) % 31.2) + 31.2) % 31.2) - 15.6));
  scenery.forEach((g, i) => g.position.set(((((i * 4.7 - dist * 0.8) % 47) + 47) % 47) - 23.5, 0, g.userData.z));
  const sqA = 1 - 0.22 * flatK;
  WA.g.position.set(-1.0 - flatK * 0.2 - Math.max(0, t - hit - 1.2) * (inV ? 0 : 3.2), 1.33 * sqA + (flatK > 0.3 ? Math.abs(Math.sin(t * 16)) * 0.04 : 0), 1.0); WA.g.scale.set(1, sqA, 1);
  WA.tyre.rotation.z = WA.sp.rotation.z = -dist * (1 - flatK * 0.6); WA.g.visible = !inV;
  WB.g.position.set(inV ? 0 : 1.0, 1.33, inV ? 0 : -1.4); WB.tyre.rotation.z = WB.sp.rotation.z = -dist; stuck.visible = inV;
  const nx = (hit - t) * 5.5; roadNail.position.set(-1.0 + nx, 0, 1.0); roadNail2.position.set(1.0 + nx, 0, -1.4); roadNail.visible = roadNail2.visible = !inV && t < hit;

  // slice A (tube)
  const nT = at("nailT");
  const inflate = t < at("tube2") ? 0.12 : ease(k(fr("tube2", 0.1), fr("tube2", 0.6)));
  const leakA = t > fr("nailT", 0.3) && t < at("nailL") ? k(fr("nailT", 0.3), fr("nailT", 0.88)) : 0;
  const heatT = t > at("heat") && t < fr("heat", 0.55);
  poseSlice(SA, t, {
    fill: t >= nT && t < at("nailL") ? 1 - ease(leakA) : t > at("nailL") ? 1 : lerp(0.12, 1, inflate),
    nailK: t >= nT && t < at("nailL") ? k(fr("nailT", 0.1), fr("nailT", 0.24)) : 0, leak: leakA,
    squash: t >= nT && t < at("nailL") ? ease(k(fr("nailT", 0.5), fr("nailT", 0.9))) : t < at("tube2") ? 0.25 : 0.25 * (1 - inflate), hot: heatT ? 1 : 0 });
  SA.tyre.material.color.setHex(t > at("tube3") && t < at("less1") && Math.sin(t * 6) > 0 ? 0x3a4250 : 0x23262d);
  // slice B (tubeless)
  const nL = at("nailL"), F = at("fix");
  const fillB = t < at("less3") ? 0.12 : t < nL ? lerp(0.12, 1, ease(k(fr("less3", 0.05), fr("less3", 0.45)))) : 1;
  poseSlice(SB, t, {
    fill: fillB, seal: t > fr("less3", 0.3) && t < nL ? k(fr("less3", 0.3), fr("less3", 0.5)) : 0,
    nailK: t >= nL && t < at("heat") ? k(fr("nailL", 0.05), fr("nailL", 0.16)) : 0, gripOn: t > fr("nailL", 0.3) && t < F,
    leak: t > fr("nailL", 0.55) && t < fr("fix", 0.6) ? 1 : 0, squash: t < at("less3") ? 0.25 : 0.25 * (1 - (fillB - 0.12) / 0.88),
    plugK: t > fr("fix", 0.55) && t < at("heat") ? k(fr("fix", 0.55), fr("fix", 0.8)) : -1 });
  SB.liner.material.emissiveIntensity = t > at("less2") && t < at("less3") ? 0.6 + 0.6 * Math.sin(t * 8) : 0.25;
  SB.beads.forEach((b) => { if (t > fr("less2", 0.55) && t < at("less3")) b.material.emissiveIntensity = 0.9; });

  // the workbench: the tyre slides off and the tube comes out; then the wire-spoke wheel leaking through its holes
  const inBut = t > at("but") - 0.3 && t < at("verdict");
  WC.g.visible = pinkTube.visible = !inBut; WS.g.visible = inBut;
  const off = t > F ? ease(k(fr("fix", 0.12), fr("fix", 0.4))) : t > at("tube1") ? ease(k(fr("tube1", 0.15), fr("tube1", 0.5))) : 0;
  WC.tyre.position.z = off * 1.6; WC.tyre.rotation.y = off * 0.5; WC.sp.rotation.z = WC.tyre.rotation.z = t * 0.3;
  pinkTube.position.set(off * -0.2, 2.6 + off * 0.1, off * 0.2 + 0.0); pinkTube.scale.setScalar(lerp(0.93, 1, off)); pinkTube.rotation.y = -off * 0.45;
  WS.g.rotation.z = t * 0.25; holes.forEach((h, i) => h.scale.setScalar(1 + 0.6 * Math.sin(t * 6 + i)));
  leaks.forEach((m) => { const u = m.userData, q = (t * 0.7 + u.ph) % 1, r = lerp(0.66, 0.2, q); m.visible = inBut && t > fr("but", 0.3); m.position.set(Math.cos(u.a) * r, Math.sin(u.a) * r, 0.1 + q * 0.5); m.scale.setScalar(1 - q * 0.6); });

  // Orbi
  const O = at("orbi"), O2 = at("orbi2");
  screen(PH, { layers: [["one", 1]], lock: ease(k(fr("orbi", 0.62), fr("orbi", 0.8))) });
  const arr = k(fr("orbi2", 0.05), fr("orbi2", 0.3)); screen(PH2, { layers: [["many", 1]], glow: arr >= 1 ? 1 : 0 });
  beam.visible = t > fr("orbi2", 0.05) && arr < 1; beam.position.copy(lerpV(V(0, 2.2, 0.3), V(2.6, 1.6, -2.3), ease(arr))).add(V(0, Math.sin(arr * Math.PI) * 1.2, 0));
  const burn = k(fr("orbi2", 0.62), fr("orbi2", 0.95));
  PH.phone.g.scale.setScalar(22 * (1 - burn * 0.95)); PH.phone.g.visible = burn < 1;
  for (let i = 0; i < EN; i++) { const d = emberDir[i]; emberPos.set([d[0] * out(burn), 2.2 + d[1] * out(burn) - burn * burn, d[2] * out(burn)], i * 3); }
  emberGeo.attributes.position.needsUpdate = true; embers.material.opacity = burn > 0 && burn < 1 ? 1 - burn * 0.6 : 0;

  // ---- shots ----
  const sliceCam = (w, q, x0 = 2.5, x1 = -1.5, dz = 11.5, ty = -0.2) => { world(w); look(lerp(x0, x1, q), 0.6, dz, 0, ty, 0, 42); };
  const closeCam = (w, q, d0 = 6.5, d1 = 5) => { world(w); look(lerp(1.6, 0.6, q), -1.2, lerp(d0, d1, q), 0, -1.5, 0, 42); };
  if (t < fr("hook", 0.3)) {
    world("road"); const q = k(0, fr("hook", 0.3)); look(lerp(-3, -1, q), 2.8, lerp(14, 12, q), 0, 1.4, 0, 44);
    tag("tA", t, fr("hook", 0.05), fr("hook", 0.3), 540, 190);
  } else if (t < fr("hook", 0.52)) {
    world("road"); look(-2.2, 1.0, 4.2, -1.2, 1.0, 1.0, 44); flash(t, hit, 0.7, 4); big(t, fr("hook", 0.36), fr("hook", 0.52), "FLAT.", 300);
  } else if (t < fr("hook", 0.8)) {
    world("road"); const q = k(fr("hook", 0.52), fr("hook", 0.8)); look(lerp(3.4, 2.6, q), 1.7, 3.2, 1.0, 1.2, -1.4, 44); big(t, fr("hook", 0.58), fr("hook", 0.8), "STILL ROLLING", 300);
  } else if (t < at("tube1")) {
    sliceCam("cutA", k(fr("hook", 0.8), at("tube1")), 3, 2, 13); big(t, fr("hook", 0.84), at("tube1"), "WHY?!", 260);
  } else if (t < fr("tube1", 0.55)) {
    world("bench"); const q = k(at("tube1"), fr("tube1", 0.55)); orbit(V(0, 2.6, 0.4), lerp(0.9, 0.3, q), lerp(7.5, 6, q), 0.5, 44);
  } else if (t < at("tube2")) {
    sliceCam("cutA", k(fr("tube1", 0.55), at("tube2")), 2.5, 1.0); tag("tB", t, fr("tube1", 0.6), at("tube2"), 540, 190);
  } else if (t < at("tube3")) {
    sliceCam("cutA", k(at("tube2"), at("tube3")), 1.0, -1.5, 10.5); tag("tC", t, fr("tube2", 0.05), fr("tube2", 0.5), 540, 190);
  } else if (t < at("less1")) {
    const q = k(at("tube3"), at("less1")); world("cutA"); look(lerp(-3, -4.5, q), lerp(-0.6, 0.2, q), 7.5, -0.6, -0.9, 0, 42); tag("tD", t, fr("tube3", 0.1), at("less1"), 540, 190);
  } else if (t < at("less2")) {
    sliceCam("cutB", k(at("less1"), at("less2")), -2.5, 0.5, 12); flash(t, at("less1"), 0.6, 3); tag("tE", t, fr("less1", 0.5), at("less2"), 540, 190);
  } else if (t < fr("less2", 0.5)) {
    closeCam("cutB", k(at("less2"), fr("less2", 0.5)), 7.5, 6); tag("tF", t, fr("less2", 0.12), fr("less2", 0.5), 540, 190);
  } else if (t < at("less3")) {
    const q = k(fr("less2", 0.5), at("less3")); world("cutB"); look(lerp(3.2, 2.6, q), 1.2, lerp(6.5, 5.5, q), 1.7, 0.6, 0, 42);
  } else if (t < nT) {
    sliceCam("cutB", k(at("less3"), nT), 1.5, -1.5, 11); tag("tG", t, fr("less3", 0.3), nT, 540, 190);
  } else if (t < fr("nailT", 0.3)) {
    closeCam("cutA", k(nT, fr("nailT", 0.3)), 9.5, 7.5); flash(t, fr("nailT", 0.24), 0.6, 4); tag("tH", t, fr("nailT", 0.18), fr("nailT", 0.3), 540, 190);
  } else if (t < nL) {
    sliceCam("cutA", k(fr("nailT", 0.3), nL), -2, 1.5, 12.5, 0.2); tag("tI", t, fr("nailT", 0.4), fr("nailT", 0.78), 540, 190); big(t, fr("nailT", 0.82), nL, "FLAT.", 300);
  } else if (t < fr("nailL", 0.55)) {
    closeCam("cutB", k(nL, fr("nailL", 0.55)), 9, 5.5); tag("tJ", t, fr("nailL", 0.22), fr("nailL", 0.55), 540, 190);
  } else if (t < F) {
    sliceCam("cutB", k(fr("nailL", 0.55), F), 2, -1, 12); tag("tK", t, fr("nailL", 0.58), F, 540, 190);
  } else if (t < fr("fix", 0.48)) {
    world("bench"); const q = k(F, fr("fix", 0.48)); orbit(V(0, 2.6, 0.5), lerp(-0.2, 0.7, q), 6.8, 0.6, 44); tag("tL", t, fr("fix", 0.14), fr("fix", 0.48), 540, 190);
  } else if (t < at("heat")) {
    closeCam("cutB", k(fr("fix", 0.48), at("heat")), 6.5, 5.2); tag("tM", t, fr("fix", 0.55), fr("fix", 0.9), 540, 190); big(t, fr("fix", 0.9), at("heat"), "MINUTES.", 300);
  } else if (t < fr("heat", 0.55)) {
    closeCam("cutA", k(at("heat"), fr("heat", 0.55)), 9, 7.5); tag("tN", t, fr("heat", 0.15), fr("heat", 0.55), 540, 190);
  } else if (t < at("but")) {
    sliceCam("cutB", k(fr("heat", 0.55), at("but")), -1.5, 1, 11.5); tag("tO", t, fr("heat", 0.6), at("but"), 540, 190);
  } else if (t < at("verdict")) {
    world("bench"); const q = k(at("but"), at("verdict")); orbit(V(0, 2.6, 0), lerp(0.6, -0.3, q), lerp(7.5, 5.2, q), 0.3, 44); tag("tP", t, fr("but", 0.32), fr("but", 0.75), 540, 190);
  } else if (t < O) {
    world("road"); const q = k(at("verdict"), O); orbit(V(0, 1.3, 0), lerp(-0.5, 0.4, q), lerp(7, 5.5, q), 0.6, 44);
    big(t, fr("verdict", 0.3), fr("verdict", 0.55), "TUBELESS.", 300); tag("tQ", t, fr("verdict", 0.58), O, 540, 190);
  } else if (t < O2) {
    world("orbi"); const q = k(O, O2); look(lerp(1.5, 0.6, q), lerp(2.6, 2.4, q), lerp(6.5, 5.2, q), 0, 2.2, 0, 44);
    flash(t, O, 0.8, 3); tag("tR", t, fr("orbi", 0.35), fr("orbi", 0.6), 540, 190); tag("tS", t, fr("orbi", 0.64), O2, 540, 190);
  } else {
    world("orbi"); const q = k(O2, at("end")); orbit(V(1, 1.9, -1), lerp(0.1, -0.4, q), lerp(9, 7.5, q), 2.5, 46);
    tag("tT", t, fr("orbi2", 0.05), fr("orbi2", 0.5), 540, 190); timer(t, fr("orbi2", 0.62), fr("orbi2", 0.95));
  }
});
await ready();
