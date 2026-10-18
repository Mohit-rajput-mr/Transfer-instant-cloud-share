// "How your phone knows where you are" — GPS: satellites that only shout the time and where they are, the delay is a
// distance, bubbles cross (ring → two points → you), a 4th satellite fixes the cheap phone clock, then Einstein:
// orbit clocks gain ~38 µs a day (≈10 km of drift), so they are tuned slow before launch. Then Orbi: the rough area only.
import { THREE, K } from "./kit/engine.js";
const { V, clamp, ease, out, back, lerp, lerpV, rnd, canvasTex, sh, flat, lowGround, pick, noise, tree, pine, rock, house, cloud, edge, green, envMat, envGeo,
  person, posePerson, people, screen, mk, IM, addWorld, world, look, lookV, orbit, overShoulder, project, at, end, fr, prog, tag, tags, big, counter, redX, timer, flash, frame, ready } = K;

const glow = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, toneMapped: false });
const ring = (pts, col = green, op = 1) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: op < 1, opacity: op, toneMapped: false }));
const circlePts = (c, n, r, seg = 128) => { const a = V(1, 0, 0).cross(n).lengthSq() < 0.01 ? V(0, 1, 0) : V(1, 0, 0); const u = a.clone().cross(n).normalize(), w = n.clone().cross(u).normalize(); return [...Array(seg)].map((_, i) => { const th = (i / seg) * Math.PI * 2; return c.clone().add(u.clone().multiplyScalar(Math.cos(th) * r)).add(w.clone().multiplyScalar(Math.sin(th) * r)); }); };

// a clock face (canvas dial) with one hand that we turn
function clockFace(rim = "#3dff8c", label = "") {
  const g = new THREE.Group();
  const tx = canvasTex(256, 256, (c) => { c.fillStyle = "#f7f4ec"; c.beginPath(); c.arc(128, 128, 122, 0, 7); c.fill(); c.lineWidth = 12; c.strokeStyle = rim; c.stroke();
    c.fillStyle = "#1a1d22"; for (let i = 0; i < 12; i++) { c.save(); c.translate(128, 128); c.rotate((i / 12) * Math.PI * 2); c.fillRect(-3, -108, 6, i % 3 ? 14 : 24); c.restore(); }
    if (label) { c.font = "800 26px M"; c.textAlign = "center"; c.fillText(label, 128, 178); } });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false })); g.add(face);
  const back2 = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.06, 40), flat(0x2a2f38)); back2.rotation.x = Math.PI / 2; back2.position.z = -0.035; g.add(back2);
  const hand = new THREE.Group(); const hm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.38, 0.01), glow(0xe53935)); hm.position.y = 0.17; hand.add(hm); hand.position.z = 0.01; g.add(hand);
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), glow(0x1a1d22)); hub.position.z = 0.02; g.add(hub);
  g.userData.hand = hand; return g;
}
// a GPS satellite: gold body, two blue solar wings, a dish, a green beacon
function satellite() {
  const g = new THREE.Group();
  const body = sh(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.7), flat(0xd9a441, { metalness: 0.4, roughness: 0.45 }))); g.add(body);
  const panelTex = canvasTex(128, 64, (c) => { c.fillStyle = "#1d3c7a"; c.fillRect(0, 0, 128, 64); c.strokeStyle = "#6f9be0"; c.lineWidth = 2; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16, 64); c.stroke(); } for (let j = 0; j <= 4; j++) { c.beginPath(); c.moveTo(0, j * 16); c.lineTo(128, j * 16); c.stroke(); } });
  for (const sd of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), flat(0xb8bec8)); arm.rotation.z = Math.PI / 2; arm.position.x = sd * 0.45; g.add(arm);
    const p = sh(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.55), [flat(0x9aa3b0), flat(0x9aa3b0), new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.3, metalness: 0.3 }), new THREE.MeshStandardMaterial({ map: panelTex }), flat(0x9aa3b0), flat(0x9aa3b0)])); p.position.x = sd * 1.4; g.add(p);
  }
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 10, 1, true), flat(0xeeeeee, { side: THREE.DoubleSide })); dish.rotation.x = Math.PI; dish.position.y = -0.36; g.add(dish);
  const bea = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(0x3dff8c)); bea.position.y = 0.3; g.add(bea);
  const clk = clockFace("#3dff8c"); clk.scale.setScalar(0.42); clk.position.set(0, 0.02, 0.36); g.add(clk); g.userData.clock = clk;
  return g;
}

// ---------- world 1: Earth from space ----------
const space = addWorld("space", { bg: 0x02040a, hemi: 1.15, sun: 2.4, sky: 0xbfd6ff });
K.reseed(21);
const R = 3, RS = 12.5;
{
  const geo = new THREE.IcosahedronGeometry(R, 4); const p = geo.attributes.position, col = [];
  for (let i = 0; i < p.count; i += 3) {
    const c = V(0, 0, 0); for (let j = 0; j < 3; j++) c.add(V(p.getX(i + j), p.getY(i + j), p.getZ(i + j))); c.normalize();
    const n = Math.sin(c.x * 3.1 + 1.2) * Math.cos(c.y * 2.7 - 0.4) + Math.sin(c.z * 4.3 + c.x * 1.7) * 0.6 + Math.sin(c.y * 6.1 + c.z * 2.2) * 0.25;
    const ice = Math.abs(c.y) > 0.86;
    const cc = new THREE.Color(ice ? 0xf2f6fa : n > 0.35 ? pick([0x5fae5a, 0x4f9a4c, 0x8cb85a, 0xc9b27a], c.x * 9, c.z * 9) : pick([0x2f6fb8, 0x2a63a8, 0x3779c4], c.x * 7, c.y * 7));
    for (let j = 0; j < 3; j++) col.push(cc.r, cc.g, cc.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  var globe = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })); space.add(globe);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 48, 32), new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.12, depthWrite: false })); space.add(atm);
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 1600; i++) { const d = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(300); sp.push(d.x, d.y, d.z); }
  sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  space.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false })));
}
// the constellation: 6 tilted orbits, 5 satellites each (about 30)
const PLANES = [...Array(6)].map((_, i) => { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.96, (i / 6) * Math.PI * 2, 0, "YXZ")); return q; });
const constel = [];
PLANES.forEach((q, pi) => {
  space.add(Object.assign(ring(circlePts(V(0, 0, 0), V(0, 1, 0).applyQuaternion(q), RS), 0x6f9be0, 0.22), {}));
  for (let i = 0; i < 5; i++) { const s = satellite(); s.scale.setScalar(0.34); space.add(s); constel.push({ s, q, ph: (i / 5) * Math.PI * 2 + pi * 0.5 }); }
});
const satPos = (q, a) => V(Math.cos(a) * RS, 0, Math.sin(a) * RS).applyQuaternion(q);
// you, on the globe; and four "hero" satellites above you
const DIR = V(0.35, 0.72, 0.6).normalize(), P = DIR.clone().multiplyScalar(R);
const tangent = V(0, 1, 0).cross(DIR).normalize(), bit = DIR.clone().cross(tangent).normalize();
const heroAt = (a, b) => DIR.clone().add(tangent.clone().multiplyScalar(a)).add(bit.clone().multiplyScalar(b)).normalize().multiplyScalar(RS);
const HS = [heroAt(-0.75, 0.3), heroAt(0.7, 0.45), heroAt(0.05, -0.85), heroAt(0.15, 0.15)];
const heroes = HS.map((p) => { const s = satellite(); s.scale.setScalar(0.55); s.position.copy(p); s.lookAt(0, 0, 0); s.rotateX(Math.PI / 2); space.add(s); return s; });
// the bubbles (one per satellite, radius = distance to you), the ring of two, the two points
const bubbles = HS.slice(0, 3).map((c, i) => {
  const g = new THREE.Group(); g.position.copy(c);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: [0x3dff8c, 0x4fc3ff, 0xffcf3a][i], transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: [0x3dff8c, 0x4fc3ff, 0xffcf3a][i], wireframe: true, transparent: true, opacity: 0.16, toneMapped: false })));
  g.userData.r = c.distanceTo(P); space.add(g); return g;
});
const u12 = HS[1].clone().sub(HS[0]).normalize(), C12 = HS[0].clone().add(u12.clone().multiplyScalar(P.clone().sub(HS[0]).dot(u12)));
const ring12 = ring(circlePts(C12, u12, P.distanceTo(C12), 160), 0xffffff, 1); space.add(ring12);
const nPl = HS[1].clone().sub(HS[0]).cross(HS[2].clone().sub(HS[0])).normalize();
const Q = P.clone().sub(nPl.clone().multiplyScalar(2 * P.clone().sub(HS[0]).dot(nPl)));
const dotP = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glow(0xffffff)), dotQ = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), glow(0xffffff));
dotP.position.copy(P); dotQ.position.copy(Q); space.add(dotP, dotQ);
const pinS = new THREE.Group(); { const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), glow(0x4fc3bd)); b.position.y = 0.6; const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 10), glow(0x4fc3bd)); c.rotation.x = Math.PI; c.position.y = 0.3; pinS.add(b, c); }
pinS.position.copy(P); pinS.quaternion.setFromUnitVectors(V(0, 1, 0), DIR); space.add(pinS);
// the measuring tape: satellite → you
const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), glow(0xffcf3a)); space.add(tape);
const setRod = (m, a, b) => { m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); m.scale.set(1, a.distanceTo(b), 1); };
// signal shells around hero 0
const shells = [...Array(3)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x3dff8c, wireframe: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); m.position.copy(HS[0]); space.add(m); return m; });
// the beam from hero 0 to you, with a pulse travelling down it
const beamS = HS.map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), glow(0x3dff8c, 0.7)); space.add(m); return m; });
// two clocks for the Einstein part: one on the ground, one up in orbit
const clkG = clockFace("#4fc3bd", "GROUND"), clkO = clockFace("#ffcf3a", "ORBIT"); clkG.scale.setScalar(2.2); clkO.scale.setScalar(2.2); space.add(clkG, clkO);

// ---------- world 2: the town (you, the map, the area cells) ----------
const town = addWorld("town", { bg: 0x9cd2ff, fog: [60, 190], hemi: 1.0, sun: 2.3 });
K.reseed(8);
town.add(lowGround(240, 240, 80, (x, y, z) => (Math.abs(x) < 1.6 || Math.abs(z) < 1.6 || Math.abs(x - 46) < 1.4 || Math.abs(z + 52) < 1.4 ? 0x8b8f96 : pick([0x7fbf5f, 0x6fb257, 0x8cc865, 0x9cc96a, 0xb9c77a], x * 0.3, z * 0.3)), (x, z) => (Math.hypot(x, z) < 20 ? 0 : noise(x * 0.05, z * 0.05) * 1.6)));
const homes = [];
for (let i = 0; i < 110; i++) {
  const cx = [0, 46, -50, 40, -36, 8][i % 6], cz = [0, -52, 30, 48, -40, 60][i % 6];
  const x = cx + (rnd() - 0.5) * 34, z = cz + (rnd() - 0.5) * 34;
  if (Math.abs(x) < 3 || Math.abs(z) < 3 || Math.hypot(x, z) < 6) continue;
  homes.push(house(town, x, z, Math.round(rnd() * 4) * (Math.PI / 2), pick([0xf2e6d0, 0xe8d8c4, 0xf6efe2, 0xdfe7ef], x, z), pick([0xc0583c, 0x9a4a3a, 0x5a6b8a, 0x6f8a5a], z, x), 1 + rnd() * 0.6));
}
for (let i = 0; i < 150; i++) { const x = (rnd() - 0.5) * 220, z = (rnd() - 0.5) * 220; if (Math.abs(x) < 3 || Math.abs(z) < 3 || Math.hypot(x, z) < 5) continue; (i % 3 ? tree : pine)(town, x, z, 1 + rnd() * 1.2); }
const clouds = new THREE.Group(); town.add(clouds);
for (let i = 0; i < 8; i++) cloud(clouds, (rnd() - 0.5) * 160, 32 + rnd() * 10, (rnd() - 0.5) * 160, 3 + rnd() * 2);
const ME = person(0, 0, 0.3, 0x4fc3bd, { sex: "m", parent: town, look: 0.6 });
const FOLK = [[30, 8, 0xf08a5d, "f"], [-28, -24, 0xb39ddb, "m"], [6, 34, 0xffd166, "f"], [-34, 26, 0x90caf9, "m"], [34, -30, 0xef9a9a, "f"], [-6, -36, 0xa5d6a7, "m"], [120, 10, 0xcfd8dc, "f"]]
  .map(([x, z, c, s]) => person(x, z, rnd() * 6, c, { sex: s, parent: town }));
// the phone's map
IM.map = mk((c) => {
  c.fillStyle = "#e9e4d8"; c.fillRect(0, 0, 390, 844);
  c.fillStyle = "#cfe6c2"; c.fillRect(30, 120, 140, 180); c.fillRect(250, 560, 120, 200);
  c.fillStyle = "#a9d3f2"; c.beginPath(); c.moveTo(0, 640); c.bezierCurveTo(120, 600, 160, 760, 390, 720); c.lineTo(390, 844); c.lineTo(0, 844); c.fill();
  c.strokeStyle = "#ffffff"; c.lineWidth = 16; for (const [a, b, d, e] of [[0, 420, 390, 400], [195, 0, 210, 844], [0, 230, 390, 300], [80, 844, 330, 60]]) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }
  c.fillStyle = "rgba(47,134,242,0.18)"; c.beginPath(); c.arc(200, 410, 70, 0, 7); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(200, 410, 22, 0, 7); c.fill(); c.fillStyle = "#2f86f2"; c.beginPath(); c.arc(200, 410, 15, 0, 7); c.fill();
  c.fillStyle = "rgba(255,255,255,0.92)"; c.fillRect(20, 40, 350, 54); c.fillStyle = "#555"; c.font = "500 22px M"; c.fillText("You are here", 40, 75);
});
const pinT = new THREE.Group(); { const b = sh(new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), glow(0x4fc3bd))); b.position.y = 3.6; const c = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 12), glow(0x4fc3bd)); c.rotation.x = Math.PI; c.position.y = 1.9; pinT.add(b, c); } town.add(pinT);
const errRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), glow(0xe53935, 0.9)); errRing.rotation.x = -Math.PI / 2; errRing.position.y = 0.3; town.add(errRing);
const errDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), glow(0xe53935, 0.12)); errDisc.rotation.x = -Math.PI / 2; errDisc.position.y = 0.25; town.add(errDisc);
// the drift trail
const trailPts = [...Array(60)].map((_, i) => V(i * 2.2, 0.35, -i * 0.9 + Math.sin(i * 0.3) * 3));
const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(trailPts), new THREE.LineDashedMaterial({ color: 0xe53935, dashSize: 1.5, gapSize: 1, toneMapped: false })); trail.computeLineDistances(); town.add(trail);
// signal beams from the sky into the phone
const beamT = [...Array(4)].map((_, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), glow(0x3dff8c, 0.55)); town.add(m); return m; });
const pulses = [...Array(4)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glow(0xd8ffe8)); town.add(m); return m; });
const SKY = [V(-30, 90, -40), V(40, 95, -20), V(10, 100, 50), V(-45, 85, 30)];
// the area cells (about 30 units here), the glow of yours and the 8 around it
const CELL = 30, cells = new THREE.Group(); town.add(cells);
const lineMat = glow(0x3dff8c, 0.9);
for (let i = -3; i <= 3; i++) for (const rot of [0, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 210), lineMat); m.rotation.x = -Math.PI / 2; if (rot) { m.rotation.z = Math.PI / 2; m.position.set(0, 0.45, i * CELL + 15); } else m.position.set(i * CELL + 15, 0.45, 0); cells.add(m); }
const cellGlow = [];
for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 0.6, CELL - 0.6), glow(0x3dff8c, 0.0)); m.rotation.x = -Math.PI / 2; m.position.set(gx * CELL, 0.3, gz * CELL); m.userData.c = gx === 0 && gz === 0; cells.add(m); cellGlow.push(m); }
// files popping up over phones near you (inside the 9 cells), a sealed box each
const pops = FOLK.slice(0, 6).map((p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 0.4), [0, 1, 2, 3, 4, 5].map((k) => (k === 4 || k === 5 ? envMat : flat(0xf6f2ea)))); m.position.copy(p.o.position).add(V(0, 5, 0)); town.add(m); return m; });
const mask = new THREE.Group(); { const f = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.35, 8, 24), flat(0x2a2d33)); f.rotation.x = Math.PI / 2; const hat = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.2, 12), flat(0x2a2d33)); hat.position.y = 0.9; const brim = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.15, 16), flat(0x2a2d33)); brim.position.y = 0.3; mask.add(hat, brim); } mask.position.set(0, 9, 0); town.add(mask);

// ---------- world 3: the clean room (clocks tuned before launch) ----------
const lab = addWorld("lab", { bg: 0xe9eef3, fog: [14, 30], hemi: 1.1, sun: 1.8, sky: 0xffffff });
lab.add(lowGround(30, 30, 20, (x, y, z) => pick([0xdfe5ec, 0xd6dde6, 0xe6ebf1], x, z), () => 0));
{ for (let i = -2; i <= 2; i++) { const w = sh(new THREE.Mesh(new THREE.BoxGeometry(3.2, 5, 0.2), flat(0xc9d3de))); w.position.set(i * 3.3, 2.5, -5); lab.add(w); const l = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.05), glow(0xffffff)); l.position.set(i * 3.3, 4.6, -4.88); lab.add(l); }
  const st = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.2, 8), flat(0x8a929e))); st.position.set(0, 0.6, -1.5); lab.add(st); }
const labSat = satellite(); labSat.scale.setScalar(1.25); labSat.position.set(0, 2.0, -1.5); labSat.rotation.y = 0.35; lab.add(labSat);
const bigClk = clockFace("#3dff8c", "TUNED"); bigClk.scale.setScalar(1.7); bigClk.position.set(2.6, 2.6, -0.6); bigClk.rotation.y = -0.35; lab.add(bigClk);
const ENG = person(-1.9, 0.3, 0.9, 0xf2f2f2, { sex: "f", parent: lab, phone: false });
const ENG2 = person(2.1, 1.1, -0.9, 0xe0e0e0, { sex: "m", parent: lab, phone: false });

tags({
  tA: "~30 satellites · <b>20,000 km up</b>", tB: "Each one: <b>atomic clocks</b>", tC: "<b>12:00:00.000000</b>", tD: "<b>I'm right here</b>",
  tE: "Speed of light · <b>still late</b>", tF: "1 satellite → <b>a bubble</b>", tG: "2 → <b>a ring</b>", tH: "3 → <b>two points</b>",
  tI: "Cheap phone clock", tJ: "1 millionth s → <b>300 m off</b>", tK: "4th satellite · <b>fixes the clock</b>",
  tL: "Weaker gravity · <b style='text-transform:none'>+45 µs A DAY</b>", tM: "Fast orbit · <b style='text-transform:none'>−7 µs A DAY</b>", tN: "Tuned to tick <b>slow</b>",
  tO: "Your rough area · <b>tens of km</b>", tP: "Others see <b>only the area</b>", tQ: "Anonymous · <b>no location shown</b>",
});

// ---------- the film ----------
frame("Try it on two phones", async (t) => {
  // satellites drift along their orbits
  for (const c of constel) { c.s.position.copy(satPos(c.q, c.ph + t * 0.05)); c.s.lookAt(0, 0, 0); c.s.rotateX(Math.PI / 2); }
  const tick = (clk, rate) => (clk.userData.hand.rotation.z = -t * rate);
  for (const s of [...constel.map((c) => c.s), ...heroes, labSat]) tick(s.userData.clock, 2);
  // the Einstein clocks: the orbit clock runs a touch faster, then visibly faster
  const fast = t > at("crazy") ? 1 + 2.2 * ease(prog(t, at("crazy"), fr("crazy", 0.7))) : 1;
  clkG.userData.hand.rotation.z = -t * 1.6; clkO.userData.hand.rotation.z = -t * 1.6 * fast - (t > at("crazy") ? (t - at("crazy")) * 0.0 : 0);
  // tuned before launch: the engineer turns the big clock back
  bigClk.userData.hand.rotation.z = -t * 1.6 + (t > at("fix") ? ease(prog(t, fr("fix", 0.1), fr("fix", 0.45))) * 2.4 : 0);

  // people
  ME.mode = t > at("reveal") && t < fr("reveal", 0.6) ? "cheer" : "phone";
  ME.o.position.set(0, 0, 0);
  FOLK.forEach((p) => (p.mode = "phone"));
  ENG.mode = "watch"; ENG2.mode = t > fr("fix", 0.5) ? "cheer" : "watch";
  for (const p of people) posePerson(p, t);
  screen(ME, { layers: [["map", 1]], glow: t > at("orbi") ? 0.4 : 0 });
  FOLK.forEach((p) => screen(p, { layers: [["many", 1]] }));

  // space props
  const B = at("bubble");
  bubbles.forEach((b, i) => { const k = prog(t, fr("bubble", [0.02, 0.3, 0.62][i]), fr("bubble", [0.22, 0.48, 0.8][i])); b.visible = t > B && t < at("catch") && k > 0; b.scale.setScalar(Math.max(0.01, b.userData.r * out(k))); });
  ring12.visible = t > fr("bubble", 0.45) && t < at("catch"); ring12.material.opacity = 0.5 + 0.5 * Math.sin(t * 6);
  dotP.visible = dotQ.visible = t > fr("bubble", 0.8) && t < at("catch"); dotP.scale.setScalar(1 + 0.3 * Math.sin(t * 8)); dotQ.scale.copy(dotP.scale);
  if (t > at("space")) { dotQ.visible = t < fr("space", 0.6); dotP.visible = t < fr("space", 0.4); }
  pinS.visible = t > fr("space", 0.4) && t < at("crazy"); pinS.scale.setScalar(back(prog(t, fr("space", 0.4), fr("space", 0.6))) * 1.4);
  tape.visible = t > at("dist") && t < at("bubble"); setRod(tape, HS[0], lerpV(HS[0], P, ease(prog(t, fr("dist", 0.1), fr("dist", 0.55)))));
  shells.forEach((m, i) => { const ph = ((t - at("shout")) * 0.5 + i / 3) % 1; m.visible = t > at("shout") && t < at("dist"); m.scale.setScalar(0.5 + ph * 4.5); m.material.opacity = 0.55 * (1 - ph); });
  beamS.forEach((m, i) => { const on = (t > at("listen") && t < at("dist")) || (i === 3 && t > at("fourth") && t < at("crazy")); m.visible = on; setRod(m, HS[i], P); m.material.color.setHex(i === 3 ? 0xffcf3a : 0x3dff8c); });
  heroes.forEach((s, i) => (s.visible = i < 3 || t > fr("catch", 0.9)));
  heroes[3].scale.setScalar(t > at("fourth") ? 0.55 * back(prog(t, at("fourth"), fr("fourth", 0.3))) : 0.55);
  clkG.visible = clkO.visible = t > at("crazy") && t < at("drift");
  clkG.position.copy(DIR.clone().multiplyScalar(R + 1.6)); clkO.position.copy(DIR.clone().multiplyScalar(R + 7.4));

  // town props
  pinT.visible = (t > at("catch") && t < at("crazy")) || (t > at("drift") && t < at("fix")) || (t > at("orbi") && t < fr("orbi", 0.45));
  pinT.rotation.y = t * 1.5;
  let pinPos = V(0, 0, 0), err = 0;
  if (t > at("catch") && t < at("crazy")) {
    const jit = t < at("fourth") ? 1 : 1 - ease(prog(t, fr("fourth", 0.2), fr("fourth", 0.7)));
    err = 30 * jit * ease(prog(t, fr("catch", 0.45), fr("catch", 0.7))); const a = Math.floor(t * 3) * 2.4;
    pinPos = V(Math.cos(a) * err * 0.8, 0, Math.sin(a) * err * 0.8);
  }
  if (t > at("drift") && t < at("fix")) { const k = ease(prog(t, fr("drift", 0.25), fr("drift", 0.95))); const i = Math.min(59, k * 59); pinPos = trailPts[Math.floor(i)].clone(); pinPos.y = 0; }
  pinT.position.copy(pinPos).add(V(0, 2.2, 0)); pinT.scale.setScalar(t > at("orbi") ? 1.6 : 1);
  errRing.visible = errDisc.visible = err > 0.5; errRing.scale.setScalar(err); errDisc.scale.setScalar(err);
  trail.visible = t > at("drift") && t < at("fix"); trail.geometry.setDrawRange(0, Math.floor(60 * ease(prog(t, fr("drift", 0.25), fr("drift", 0.95)))));
  const ph = phoneWorldOf(ME);
  beamT.forEach((m, i) => { m.visible = t > at("listen") && t < at("dist"); setRod(m, SKY[i], ph); });
  pulses.forEach((m, i) => { const k = ((t - at("listen")) * 0.7 + i * 0.27) % 1; m.visible = t > at("listen") && t < at("dist"); m.position.copy(lerpV(SKY[i], ph, k)); });
  const O = at("orbi"), O2 = at("orbi2");
  cells.visible = t > fr("orbi", 0.3);
  cellGlow.forEach((m) => (m.material.opacity = t < O2 ? (m.userData.c ? 0.35 * prog(t, fr("orbi", 0.35), fr("orbi", 0.55)) : 0) : 0.28 * prog(t, O2, fr("orbi2", 0.12)) * (1 - prog(t, fr("orbi2", 0.42), fr("orbi2", 0.55)) * (m.userData.c ? 0.4 : 1))));
  lineMat.opacity = 0.9 * (1 - prog(t, fr("orbi2", 0.45), fr("orbi2", 0.6)));
  const burn = prog(t, fr("orbi2", 0.75), fr("orbi2", 0.95));
  pops.forEach((m, i) => { const k = prog(t, fr("orbi2", 0.1 + i * 0.03), fr("orbi2", 0.2 + i * 0.03)); m.visible = k > 0 && burn < 1; m.scale.setScalar(back(k) * (1 - burn)); m.rotation.y = t * 1.2 + i; m.position.y = 5 + Math.sin(t * 3 + i) * 0.4; });
  mask.visible = t > fr("orbi2", 0.45) && t < fr("orbi2", 0.75); mask.scale.setScalar(back(prog(t, fr("orbi2", 0.45), fr("orbi2", 0.55))) * 1.6); mask.rotation.y = t;

  // ---- shots ----
  const k = (a, b) => prog(t, a, b);
  if (t < fr("hook", 0.45)) {
    world("town"); const q = k(0, fr("hook", 0.45));
    look(lerp(14, 3.2, ease(q)), lerp(70, 6, ease(q)), lerp(18, 6, ease(q)), 0, 1.2, 0, 44);
  } else if (t < at("why")) {
    world("town"); overShoulder(ME, k(fr("hook", 0.45), at("why")), 0.62, 0.08, 0.05, 36);
    big(t, fr("hook", 0.75), at("why") + 0.1, "SILENT.", 260);
  } else if (t < fr("why", 0.55)) {
    world("town"); const q = k(at("why"), fr("why", 0.55));
    look(2, lerp(4, 9, ease(q)), 6, 0, lerp(3, 90, ease(q)), -30, 50);
  } else if (t < at("sats")) {
    world("space"); const q = k(fr("why", 0.55), at("sats"));
    lookV(P.clone().multiplyScalar(lerp(2.6, 4.2, ease(q))).add(tangent.clone().multiplyScalar(2.5)), P, 50);
    big(t, fr("why", 0.7), at("sats") + 0.1, "EINSTEIN?", 280);
  } else if (t < fr("sats", 0.55)) {
    world("space"); orbit(V(0, 0, 0), 0.6 + t * 0.06, lerp(44, 36, k(at("sats"), fr("sats", 0.55))), 8, 42);
    tag("tA", t, fr("sats", 0.1), fr("sats", 0.55));
  } else if (t < at("shout")) {
    world("space"); const q = k(fr("sats", 0.55), at("shout"));
    const s = heroes[0].position; lookV(s.clone().add(V(1.6, 0.4, 2.2).multiplyScalar(lerp(1.4, 1.0, q))), s, 40);
    tag("tB", t, fr("sats", 0.6), at("shout"), 540, 300);
  } else if (t < at("listen")) {
    world("space"); const q = k(at("shout"), at("listen"));
    const s = heroes[0].position; lookV(s.clone().add(V(lerp(9, 11, q), 2.5, 10)), s.clone().lerp(P, 0.15), 46);
    tag("tC", t, fr("shout", 0.4), fr("shout", 0.7), 540, 280); tag("tD", t, fr("shout", 0.7), at("listen"), 540, 280);
  } else if (t < fr("listen", 0.5)) {
    world("space"); const q = k(at("listen"), fr("listen", 0.5));
    lookV(P.clone().multiplyScalar(lerp(3.6, 2.6, q)).add(bit.clone().multiplyScalar(-3)), P.clone().multiplyScalar(1.6), 52);
  } else if (t < at("dist")) {
    world("town"); const q = k(fr("listen", 0.5), at("dist"));
    look(lerp(6, 4, q), lerp(2.2, 3.4, q), lerp(5, 4, q), 0, lerp(1.6, 6, q), 0, 48);
    tag("tE", t, fr("listen", 0.55), at("dist"), 540, 300);
  } else if (t < at("bubble")) {
    world("space"); const q = k(at("dist"), at("bubble"));
    const mid = HS[0].clone().lerp(P, 0.5); lookV(mid.clone().add(nPl.clone().multiplyScalar(lerp(16, 13, q))).add(V(0, 2, 0)), mid, 44);
    counter(t, fr("dist", 0.15), fr("dist", 0.5), `${(0.067 * ease(k(fr("dist", 0.15), fr("dist", 0.45)))).toFixed(3)} s late`);
    counter(t, fr("dist", 0.5), at("bubble"), `= ${Math.round(20200 * ease(k(fr("dist", 0.5), fr("dist", 0.8)))).toLocaleString("en-US")} km`);
  } else if (t < at("space")) {
    world("space"); const q = k(at("bubble"), at("space"));
    const c = HS[0].clone().add(HS[1]).add(HS[2]).multiplyScalar(1 / 3).lerp(P, 0.4);
    lookV(c.clone().add(nPl.clone().multiplyScalar(lerp(34, 30, q))).add(tangent.clone().multiplyScalar(lerp(-10, 8, q))), c, 46);
    tag("tF", t, fr("bubble", 0.04), fr("bubble", 0.28), 540, 260); tag("tG", t, fr("bubble", 0.32), fr("bubble", 0.6), 540, 260); tag("tH", t, fr("bubble", 0.64), at("space"), 540, 260);
  } else if (t < at("catch")) {
    world("space"); const q = k(at("space"), at("catch"));
    const z = ease(k(fr("space", 0.35), fr("space", 0.8))), tgt = lerpV(Q.clone().lerp(P, 0.5), P, z);
    lookV(tgt.clone().add(tangent.clone().multiplyScalar(lerp(30, 8, z))).add(DIR.clone().multiplyScalar(lerp(1, 3, z))), tgt, 44);
    if (t > fr("space", 0.15) && t < fr("space", 0.6)) redX(t, fr("space", 0.15), Q, 0.8);
    big(t, fr("space", 0.62), at("catch"), "YOU.", 300);
  } else if (t < at("fourth")) {
    world("town"); const q = k(at("catch"), at("fourth"));
    if (q < 0.35) { overShoulder(ME, q, 0.55, 0.07, 0.05, 34); tag("tI", t, at("catch"), fr("catch", 0.35), 540, 300); }
    else { look(0, lerp(70, 85, q), 18, 0, 0, 0, 46); tag("tJ", t, fr("catch", 0.45), at("fourth"), 540, 300); }
  } else if (t < fr("fourth", 0.45)) {
    world("space"); const q = k(at("fourth"), fr("fourth", 0.45));
    lookV(P.clone().add(DIR.clone().multiplyScalar(lerp(16, 20, q))).add(tangent.clone().multiplyScalar(6)), HS[3].clone().lerp(P, 0.5), 50);
    tag("tK", t, fr("fourth", 0.05), fr("fourth", 0.45), 540, 300);
  } else if (t < at("crazy")) {
    world("town"); look(0, 80, 14, 0, 0, 0, 46); tag("tK", t, fr("fourth", 0.45), at("crazy"), 540, 300);
  } else if (t < at("gain")) {
    world("space"); const q = k(at("crazy"), at("gain"));
    const mid = DIR.clone().multiplyScalar(R + 4.3); lookV(mid.clone().add(tangent.clone().multiplyScalar(lerp(19, 16, q))), mid, 44);
    flash(t, at("crazy"), 0.7, 3); big(t, fr("crazy", 0.55), at("gain"), "TIME<br>SPEEDS UP", 240);
  } else if (t < at("drift")) {
    world("space"); const q = k(at("gain"), at("drift"));
    const mid = DIR.clone().multiplyScalar(R + 4.3); lookV(mid.clone().add(tangent.clone().multiplyScalar(16)).add(bit.clone().multiplyScalar(lerp(-3, 3, q))), mid, 44);
    tag("tL", t, fr("gain", 0.02), fr("gain", 0.36), 540, 260); tag("tM", t, fr("gain", 0.36), fr("gain", 0.62), 540, 260);
    counter(t, fr("gain", 0.66), at("drift"), `+38 µs / day`);
  } else if (t < at("fix")) {
    world("town"); const q = k(at("drift"), at("fix"));
    const pp = pinT.position; look(lerp(-10, pp.x - 20, ease(q)), lerp(55, 90, q), lerp(40, 60, q), lerp(0, pp.x, ease(q)) * 0.7, 0, lerp(0, pp.z, ease(q)) * 0.7, 48);
    counter(t, fr("drift", 0.25), at("fix"), `${(10 * ease(k(fr("drift", 0.25), fr("drift", 0.95)))).toFixed(1)} km off`);
  } else if (t < at("reveal")) {
    world("lab"); const q = k(at("fix"), at("reveal"));
    if (q < 0.5) look(lerp(-2.8, -1.2, q * 2), 3.3, 5.8, 0.6, 2.0, -1.2, 44); else orbit(V(0.4, 2.1, -1.2), lerp(-0.4, 0.5, (q - 0.5) * 2), 6.5, 1.4, 46);
    tag("tN", t, fr("fix", 0.1), fr("fix", 0.55), 540, 300);
  } else if (t < at("orbi")) {
    world("town"); const q = k(at("reveal"), at("orbi"));
    if (q < 0.5) look(lerp(3.5, 2.6, q * 2), 1.9, lerp(4.5, 3.6, q * 2), 0, 1.4, 0, 42); else overShoulder(ME, q, 0.6, 0.08, 0.05, 36);
    big(t, fr("reveal", 0.55), at("orbi"), "JUST CLOCKS.", 270);
  } else if (t < O2) {
    world("town"); const q = k(O, O2);
    look(lerp(6, 10, q), lerp(14, 120, ease(q)), lerp(10, 40, ease(q)), 0, 0, 0, 46);
    flash(t, O, 0.8, 3); tag("tO", t, fr("orbi", 0.4), O2, 540, 300);
  } else {
    world("town"); const q = k(O2, at("end"));
    look(lerp(10, 0, q), lerp(120, 110, q), lerp(40, 30, q), 0, 0, 0, 46);
    tag("tP", t, fr("orbi2", 0.08), fr("orbi2", 0.42), 540, 300); tag("tQ", t, fr("orbi2", 0.45), fr("orbi2", 0.74), 540, 300);
    timer(t, fr("orbi2", 0.75), fr("orbi2", 0.95));
  }
  clkG.lookAt(cam.position); clkO.lookAt(cam.position);
  clouds.visible = !(t > at("why") && t < fr("why", 0.55));
});
function phoneWorldOf(p) { return p.phone.g.getWorldPosition(V()); }
const cam = K.cam;
await ready();
