// Improved Film 13: how your phone finds you indoors (a mall: satellite signals stop at the concrete → the phone hears
// every Wi-Fi name + loudness → mapping cars already logged where routers sit → loud = close, circles cross = you → cell
// towers, rougher), then Orbi goes the other way: others only ever see your rough area, never your spot.
import { THREE, stage, lights, person, pose, tree, flat, glow, mesh, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, textTex, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const E = (t, a, d) => ease(clamp((t - a) / d));
const phoneOn = (p) => { const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); sc.position.z = 0.007; g.add(sc); g.scr = sc; p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };
const sprite = (txt, col = "#e6fff0", w = 3.2, h = 0.8, bg = "rgba(6,12,10,0.85)") => { const tx = textTex((g, cw, ch) => { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, cw - 8, ch - 8, 26); g.fill(); g.fillStyle = col; g.font = "700 64px M"; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.66); }, 640, Math.round(640 * h / w)); const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false })); BB.push(s); return s; };
const BB = [];

reseed(1313);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x9ab0c8, fog: [0x9ab0c8, 80, 400], bloom: 0.55, exposure: 1.05 });
lights(scene, { key: 0xfff1e0, keyI: 2.0, sky: 0xdfe8ff, ground: 0x6a5a48, fillI: 1.2, rim: 0x9fc4ff, rimI: 0.6, at: V(10, 20, 10), area: 30 });

// ---------------------------------------------------------------- the mall (origin): two floors, shops, a concrete roof, satellites above
const SHOPS = [0xff6a5a, 0x3dff8c, 0x5ac8ff, 0xffd04a, 0xd07aff, 0xff9a3c];
{ scene.add(tinted(new THREE.PlaneGeometry(30, 30, 15, 15).rotateX(-Math.PI / 2), 0xe8e0d4, 0.04));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 9, z = Math.sin(a) * 9; for (const fl of [0, 4]) { const sh = new THREE.Group(); sh.position.set(x, fl, z); sh.rotation.y = -a - Math.PI / 2; scene.add(sh);
      sh.add(P(mesh(bbox(5, 3.6, 0.3, 0.04), flat(0xf4efe8)), V(0, 1.8, -0.5))); sh.add(P(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshStandardMaterial({ color: 0x9ac8e8, transparent: true, opacity: 0.5, roughness: 0.1 })), V(0, 1.3, -0.3)));
      sh.add(P(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), glow(SHOPS[(i + fl) % 6])), V(0, 3.15, -0.33))); } }
  const bal = new THREE.Mesh(new THREE.RingGeometry(6.2, 8.2, 32).rotateX(-Math.PI / 2), flat(0xd8d0c4, { side: THREE.DoubleSide })); bal.position.y = 4; scene.add(bal);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.05, 6, 48).rotateX(Math.PI / 2), flat(0x8a8f96)); rail.position.y = 5; scene.add(rail);
  scene.add(P(mesh(new THREE.CylinderGeometry(11, 11, 0.6, 32, 1, true), flat(0xb8b0a4, { side: THREE.DoubleSide })), V(0, 8.3, 0)));
  const roof = mesh(new THREE.CylinderGeometry(11.5, 11.5, 0.8, 32), flat(0x9a948c)); roof.position.y = 8.8; scene.add(roof);
  for (let i = 0; i < 6; i++) { const pl = tree(1.2, "round", 0x4f9a3c); pl.position.set(Math.cos(i) * 4.6, 0, Math.sin(i) * 4.6); scene.add(pl); }
  for (let i = 0; i < 10; i++) { const lp = new THREE.PointLight(0xfff0d8, 3, 10, 1.6); lp.position.set(Math.cos(i * 0.63) * 7, 7.4, Math.sin(i * 0.63) * 7); scene.add(lp); } }
const ROOFX = []; const SATS = [V(-30, 60, -40), V(25, 70, -30), V(40, 55, 20), V(-35, 65, 30)].map((p, i) => { const g = new THREE.Group(); g.position.copy(p); scene.add(g); g.add(mesh(bbox(1.4, 1.4, 1.4, 0.1), flat(0xd8d8e0, { metalness: 0.5, roughness: 0.3 }))); for (const s of [-1, 1]) g.add(P(mesh(bbox(4, 0.06, 1.6, 0.02), flat(0x2a4a9a)), V(s * 2.8, 0, 0)));
  const end = V(p.x * 0.18, 9.3, p.z * 0.18), beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), glow(0xffd04a, { transparent: true })); beam.position.copy(p.clone().add(end).multiplyScalar(0.5)); beam.scale.y = p.distanceTo(end); beam.quaternion.setFromUnitVectors(V(0, 1, 0), p.clone().sub(end).normalize()); scene.add(beam); g.beam = beam;
  const x = new THREE.Group(); x.position.copy(end).add(V(0, 0.4, 0)); for (const a of [0.785, -0.785]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.35), glow(0xff4a4a)); b.rotation.z = a; x.add(b); } scene.add(x); ROOFX.push(x); return g; });
const ME = person({ sex: "m", top: 0x3a7a5a, bottom: 0x2b2b2b, skin: 0xe0a982, hair: 0x5a3a20 }); ME.position.set(0.5, 0, 1.5); ME.rotation.y = 0.3; scene.add(ME); const MPH = phoneOn(ME);
const crowd = []; for (let i = 0; i < 14; i++) { const p = person({}); const a = rnd() * 6.28, rr = 2.5 + rnd() * 3.5; p.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); p.rotation.y = rnd() * 6.28; p.ph = rnd(); scene.add(p); crowd.push(p); }

// ---------------------------------------------------------------- the map (x = 300): the block from above, routers, the car, the towers, the area grid
const MP = V(300, 0, 0), MS = new THREE.Group(); MS.position.copy(MP); scene.add(MS);
MS.add(tinted(new THREE.PlaneGeometry(400, 400, 40, 40).rotateX(-Math.PI / 2), 0x6a7a5a, 0.04));
{ const roads = flat(0x3a3a40); for (let i = -6; i <= 6; i++) { MS.add(P(mesh(new THREE.BoxGeometry(200, 0.04, 1.6), roads), V(0, 0.02, i * 10))); MS.add(P(mesh(new THREE.BoxGeometry(1.6, 0.04, 200), roads), V(i * 10, 0.02, 0))); }
  for (let bx = -6; bx < 6; bx++) for (let bz = -6; bz < 6; bz++) { if (bx === -1 && bz === -1) continue; for (let k = 0; k < 4; k++) { const w = 2.4 + rnd() * 1.6, h = 0.8 + rnd() * 3.2 * (Math.abs(bx) + Math.abs(bz) < 4 ? 1.6 : 0.8);
      MS.add(P(mesh(bbox(w, h, w, 0.08), flat([0xe8dcc8, 0xd0c4b4, 0xc8d0d8, 0xe0c0a8][(bx * 7 + bz * 3 + k) & 3])), V(bx * 10 + 3 + (k % 2) * 4.2, h / 2, bz * 10 + 3 + Math.floor(k / 2) * 4.2))); } }
  const mall = mesh(new THREE.CylinderGeometry(3.6, 3.6, 2.2, 24), flat(0xb8b0a4)); mall.position.set(-5, 1.1, -5); MS.add(mall); }
const YOU = V(-4.2, 2.4, -4.4);
const DOT = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10), glow(0x2a8aff)); DOT.position.copy(YOU); MS.add(DOT);
const DOTR = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.75, 32).rotateX(-Math.PI / 2), glow(0x5ab0ff, { transparent: true, side: THREE.DoubleSide })); DOTR.position.copy(YOU); MS.add(DOTR);
const NAMES = ["CoffeeBar_5G", "Mall-Guest", "Shoe Palace", "NETGEAR-42", "Kiosk_Free", "SkyHub-9F3", "Pizza Wifi", "Bookshop", "TP-Link_A7", "Gym-Members"];
const RT = NAMES.map((n, i) => { const a = (i / NAMES.length) * Math.PI * 2 + 0.3, rr = 4 + (i % 3) * 3.2; const p = V(-5 + Math.cos(a) * rr, 3.2 + (i % 2) * 1.2, -5 + Math.sin(a) * rr);
  const g = new THREE.Group(); g.position.copy(p); MS.add(g); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 6), glow(0x8a8f96)); g.add(body); g.body = body; const lab = sprite(n, "#e6fff0", 4.4, 0.9); lab.position.y = 1.2; g.add(lab); g.lab = lab;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 64).rotateX(Math.PI / 2), glow(0x3dff8c, { transparent: true, depthWrite: false })); ring.position.y = -p.y + YOU.y; g.add(ring); g.ring = ring;
  const circ = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 6, 96).rotateX(Math.PI / 2), glow(0xffd04a, { transparent: true, depthWrite: false })); circ.position.y = -p.y + YOU.y; g.add(circ); g.circ = circ;
  g.d = Math.hypot(p.x - YOU.x, p.z - YOU.z); g.loud = clamp(1.3 - g.d / 12, 0.1, 1); return g; });
const CIRC3 = [...RT].sort((a, b) => a.d - b.d).slice(0, 3);
// the mapping car with its roof antenna, driving the street and logging routers
const CAR = new THREE.Group(); MS.add(CAR); CAR.add(P(mesh(bbox(2.2, 0.7, 1.1, 0.12), flat(0xffffff)), V(0, 0.5, 0))); CAR.add(P(mesh(bbox(1.2, 0.5, 1.0, 0.12), flat(0x8ab8e8)), V(-0.1, 1.05, 0)));
CAR.add(P(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), flat(0x2a2a2a)), V(0.2, 1.7, 0))); CAR.add(P(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glow(0x3dff8c)), V(0.2, 2.2, 0)));
for (const sx of [-0.7, 0.7]) for (const sz of [-0.55, 0.55]) CAR.add(P(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 10).rotateX(Math.PI / 2), flat(0x1a1a1a)), V(sx, 0.22, sz)));
// cell towers, far out, with wide fuzzy bands
const TOW = [V(22, 0, -18), V(-26, 0, -12), V(-4, 0, 26)].map((p) => { const g = new THREE.Group(); g.position.copy(p); MS.add(g); g.add(P(mesh(new THREE.CylinderGeometry(0.15, 0.6, 12, 4, 1), flat(0xb8bcc4)), V(0, 6, 0))); for (let k = 0; k < 3; k++) g.add(P(mesh(bbox(0.3, 1.2, 0.2, 0.04), flat(0xe8e8ee)), V(Math.cos(k * 2.1) * 0.5, 11.2, Math.sin(k * 2.1) * 0.5)));
  const d = Math.hypot(p.x - YOU.x, p.z - YOU.z), band = new THREE.Mesh(new THREE.RingGeometry(d - 3, d + 3, 96).rotateX(-Math.PI / 2), glow(0xff9a3c, { transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); band.position.set(0, 0.3 - p.y, 0); g.add(band); g.band = band; return g; });
const FUZZ = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32).rotateX(-Math.PI / 2), glow(0xff9a3c, { transparent: true, depthWrite: false })); FUZZ.position.set(YOU.x, 0.5, YOU.z); MS.add(FUZZ);
// the rough area: a big grid; your whole cell lights, the exact dot is crossed out
const CELL = 60; const GRID = new THREE.Group(); MS.add(GRID); for (let i = -3; i <= 3; i++) { GRID.add(P(new THREE.Mesh(new THREE.BoxGeometry(400, 0.3, 0.5), glow(0x3dff8c, { transparent: true })), V(0, 0.6, i * CELL + 25))); GRID.add(P(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 400), glow(0x3dff8c, { transparent: true })), V(i * CELL + 25, 0.6, 0))); }
const AREA = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL).rotateX(-Math.PI / 2), glow(0x3dff8c, { transparent: true, depthWrite: false })); AREA.position.set(-5, 0.5, -5); MS.add(AREA);
const NB = []; for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 2, CELL - 2).rotateX(-Math.PI / 2), glow(0x3dff8c, { transparent: true, depthWrite: false })); m.position.set(-5 + dx * CELL, 0.45, -5 + dz * CELL); MS.add(m); NB.push(m); }
const XX = new THREE.Group(); XX.position.copy(YOU).add(V(0, 1.2, 0)); MS.add(XX); for (const a of [0.785, -0.785]) { const b = new THREE.Mesh(new THREE.BoxGeometry(5, 0.9, 0.9), glow(0xff4a4a)); b.rotation.y = a; XX.add(b); }
const ALAB = sprite("others see: this area", "#3dff8c", 30, 5); ALAB.position.set(-5, 14, -5); MS.add(ALAB);

// ---------------------------------------------------------------- world
function world(t) {
  pose(ME, { phone: 1, look: Math.sin(t * 0.4) * 0.15 }); MPH.scr.material.color.set(0x5ab0ff);
  crowd.forEach((p, i) => { const a = t * 0.12 * (i % 2 ? 1 : -1) + p.ph * 6.28, rr = 2.6 + (i % 4) * 1.1; p.position.set(Math.cos(a) * rr + 0.5, 0, Math.sin(a) * rr); p.rotation.y = -a + (i % 2 ? 0 : Math.PI); pose(p, { walk: t * 1.2 + p.ph, speed: 0.8 }); });
  const blocked = t > wt("scene", "concrete") - 0.2; SATS.forEach((s, i) => { s.beam.visible = t < A("listen"); s.beam.material.opacity = 0.7; s.beam.scale.y = s.position.distanceTo(V(s.position.x * 0.18, 9.3, s.position.z * 0.18)) * (blocked ? 1 : E(t, 0.6 + i * 0.2, 0.8)); });
  ROOFX.forEach((x, i) => { const k = clamp((t - wt("scene", "concrete") - i * 0.12) / 0.25); x.visible = k > 0 && t < A("listen"); x.scale.setScalar(back(k) || 0.001); });
  // map: names pop in with their loudness; car logs them; rings → circles → the dot
  const hear = t > A("listen") - 0.2, logged = (g) => t > A("map") && CAR.position.x > g.position.x - 2;
  const cx = lerp(-60, 40, clamp((t - A("map") + 0.2) / 5.2)); CAR.position.set(cx, 0, -10 + 0.6); CAR.visible = t > A("map") - 0.3 && t < A("circles") + 0.5;
  RT.forEach((g, i) => { const k = clamp((t - wt("listen", "listens") - i * 0.14) / 0.3); g.visible = hear && k > 0; g.scale.setScalar(back(k) || 0.001); g.lab.material.opacity = t < A("cell") ? 1 : 0.2;
    g.body.material.color.set(t > A("map") ? (logged(g) ? 0x3dff8c : 0x8a8f96) : 0x5ac8ff);
    const rk = ((t * 0.6 + i * 0.13) % 1); g.ring.visible = hear && t < A("circles") + 0.4; g.ring.scale.setScalar(0.5 + rk * 6 * g.loud); g.ring.material.opacity = (1 - rk) * g.loud;
    const ci = CIRC3.indexOf(g), ck = ci < 0 ? 0 : E(t, wt("circles", "draw") + ci * 0.35, 0.7); g.circ.visible = ck > 0.01 && t < A("cell") + 0.3; g.circ.scale.setScalar(Math.max(0.01, g.d * ck)); g.circ.material.opacity = 0.95; });
  const dk = clamp((t - wt("circles", "that's") + 0.1) / 0.3); DOT.visible = t < A("scene") || (dk > 0 && t < A("end")); DOT.scale.setScalar(t < A("scene") ? 1 : back(dk) || 0.001); DOTR.visible = DOT.visible; DOTR.scale.setScalar(1 + ((t * 1.2) % 1) * 2); DOTR.material.opacity = 1 - ((t * 1.2) % 1);
  TOW.forEach((g, i) => { g.visible = t > A("cell") - 0.2; g.band.material.opacity = 0.35 * E(t, wt("cell", "towers") + i * 0.25, 0.6) * (1 - E(t, A("orbi"), 0.4)); });
  FUZZ.visible = t > wt("cell", "rougher") - 0.1 && t < A("orbi") + 0.4; FUZZ.material.opacity = 0.45 * (0.8 + 0.2 * Math.sin(t * 5));
  const ok = E(t, A("orbi") + 0.3, 0.8); GRID.visible = ok > 0.01; GRID.children.forEach((m) => (m.material.opacity = ok * 0.8)); AREA.material.opacity = 0.4 * E(t, wt("orbi", "rough") - 0.1, 0.5) * (0.85 + 0.15 * Math.sin(t * 3)); AREA.visible = AREA.material.opacity > 0.01;
  NB.forEach((m, i) => { m.material.opacity = 0.14 * E(t, wt("orbi", "patch") + i * 0.05, 0.4); m.visible = m.material.opacity > 0.01; });
  const xk = clamp((t - wt("orbi", "never") + 0.05) / 0.25); XX.visible = xk > 0 && t < A("end") + 2; XX.scale.setScalar(back(xk) || 0.001); ALAB.visible = t > wt("orbi", "rough"); ALAB.material.opacity = clamp((t - wt("orbi", "rough")) / 0.4);
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const mp = (x, y, z) => V(MP.x + x, MP.y + y, MP.z + z);
shot(0, 3.0, mp(-5, 20, 10), mp(-4.2, 2, -4.4), 46, mp(-4.4, 9, 2), mp(-4.2, 2, -4.4), 44);
shot(wt("hook", "where") - 0.1, 2.2, V(2.6, 2.0, 6.5), V(0.5, 1.4, 1.5), 46, V(2.0, 1.8, 5.2), V(0.5, 1.45, 1.5), 44);
shot(A("scene"), 2.6, V(-3, 3.2, 10), V(0, 3.6, 0), 50, V(-1.5, 2.6, 8), V(0, 4.2, 0), 50);
shot(wt("scene", "signals") - 0.1, 2.8, V(14, 30, 34), V(0, 9, 0), 46, V(10, 24, 26), V(0, 9, 0), 46);
shot(wt("scene", "blue") - 0.1, 2.2, V(1.2, 2.0, 3.3), V(0.6, 1.3, 1.6), 40, V(1.0, 1.9, 2.9), V(0.6, 1.35, 1.6), 38);
shot(A("listen"), 3.0, mp(-5, 26, 14), mp(-5, 2, -5), 50, mp(-5, 22, 10), mp(-5, 2, -5), 50);
shot(wt("listen", "names") - 0.1, 2.6, mp(2, 9, 6), mp(-4, 3, -5), 48, mp(0, 8, 4), mp(-4, 3, -5), 46);
shot(A("map"), 3.2, mp(-20, 10, 4), mp(-10, 1, -10), 48, mp(-4, 9, 4), mp(0, 1, -10), 48);
shot(A("circles"), 2.6, mp(-5, 34, 10), mp(-5, 0, -5), 48, mp(-5, 30, 6), mp(-5, 0, -5), 48);
shot(wt("circles", "draw") - 0.1, 3.4, mp(-5, 36, 4), mp(-5, 0, -5), 48, mp(-5, 30, 1), mp(-5, 0, -5), 46);
shot(wt("circles", "that's") - 0.2, 1.6, mp(-4, 9, 2), mp(-4.2, 2, -4.4), 44, mp(-4.2, 8, 0.4), mp(-4.2, 2, -4.4), 42);
shot(A("cell"), 3.2, mp(-5, 70, 30), mp(-5, 0, -2), 48, mp(-5, 64, 20), mp(-5, 0, -4), 48);
shot(A("orbi"), 3.0, mp(-5, 90, 60), mp(-5, 0, -5), 50, mp(-5, 140, 90), mp(-5, 0, -5), 50);
shot(wt("orbi", "never") - 0.2, 2.6, mp(-5, 30, 18), mp(-4.2, 2, -4.4), 46, mp(-5, 24, 14), mp(-4.2, 2, -4.4), 46);
shot(A("end") - 0.05, 2.2, V(16, 34, 30), V(0, 6, 0), 46, V(30, 60, 50), V(0, 6, 0), 46);
const camAt = camRig(cam);
// ---------------------------------------------------------------- overlays
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  tag("tA", `GPS · <i>blocked by the roof</i>`, t, wt("scene", "concrete"), wt("scene", "blue") - 0.1);
  tag("tA", `still · <b>the blue dot</b>`, t, wt("scene", "blue"), A("listen") - 0.05);
  tag("tA", `Wi-Fi names · <b>+ how loud</b>`, t, wt("listen", "names") - 0.4, A("map") - 0.05);
  tag("tA", `mapping car · <b>logs each router</b>`, t, A("map") + 0.3, A("circles") - 0.05);
  tag("tA", `loud = <b>close</b> · quiet = <i>far</i>`, t, A("circles") + 0.1, wt("circles", "that's") - 0.15);
  tag("tA", `circles cross · <b>you are here</b>`, t, wt("circles", "that's"), A("cell") - 0.05);
  tag("tA", `cell towers · <i>rougher</i>`, t, wt("cell", "towers"), A("orbi") - 0.05);
  tag("tA", `Orbi · <b>rough area only</b>`, t, wt("orbi", "rough"), wt("orbi", "never") - 0.1);
  tag("tA", `your exact spot · <i>never shown</i>`, t, wt("orbi", "never"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camAt(SH, t); BB.forEach((b) => b.quaternion.copy(cam.quaternion)); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
