// Improved Film 02: how an AI data center keeps from melting (and how Orbi keeps its own server cool).
// Sets: the campus at dusk (towers on the roof), the hot aisle, one AI rack (cutaway) next to a hundred homes,
// the exploded compute tray (chip + cold plate, x-ray channels), the two loops, the roof tower, the Orbi ticket.
import { THREE, stage, lights, person, pose, tree, rock, house, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, cloud, rack, textTex, xray, cutaway, explode, thermal, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); const i = ws.findIndex((w) => nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };

reseed(42);
const P = (m, v) => (m.position.copy(v), m);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x2a3050, fog: [0x3a3a5a, 90, 420], bloom: 0.5, exposure: 1.0 });
const SUN = V(-30, 9, -40);
const LT = lights(scene, { key: 0xffb27a, keyI: 2.0, sky: 0x9aa8ff, ground: 0x3a3030, fillI: 1.0, rim: 0x8fb0ff, rimI: 0.9, at: SUN, area: 45 });
const SKY = sky(0x1b2350, 0xe8845a, 0x2a2440); SKY.u.sun.value.copy(SUN).normalize(); scene.add(SKY);
const TH = thermal(comp);

// ---------------------------------------------------------------- the campus (origin)
const CAMPUS = new THREE.Group(); scene.add(CAMPUS);
{ const gr = tinted(facet(new THREE.PlaneGeometry(400, 400, 40, 40).rotateX(-Math.PI / 2), 0.4), 0x4f6a42, 0.12); CAMPUS.add(gr);
  const lot = tinted(new THREE.PlaneGeometry(70, 46, 8, 6).rotateX(-Math.PI / 2), 0x5d636b, 0.06); lot.position.y = 0.03; CAMPUS.add(lot);
  for (let i = 0; i < 14; i++) { const ln = mesh(new THREE.PlaneGeometry(0.2, 4).rotateX(-Math.PI / 2), flat(0xe8e8e8), { cast: false }); ln.position.set(-28 + i * 4.3, 0.05, 20); CAMPUS.add(ln); }
  for (let i = 0; i < 60; i++) { const a = rnd() * Math.PI * 2, d = 50 + rnd() * 120; const t = tree(3 + rnd() * 2, i % 3 ? "round" : "pine", 0x3f7a35); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); CAMPUS.add(t); }
  for (let i = 0; i < 8; i++) { const c = cloud(8 + rnd() * 6, 0xffd6c4); c.position.set(-200 + rnd() * 400, 60 + rnd() * 40, -250 - rnd() * 100); scene.add(c); } }
const HALLS = []; for (const [x, z] of [[-17, -6], [17, -6]]) { const h = new THREE.Group(); h.position.set(x, 0, z); CAMPUS.add(h); HALLS.push(h);
  h.add(P(mesh(bbox(30, 9, 22, 0.3), flat(0xc9ccd2)), V(0, 4.5, 0)));
  for (let i = 0; i < 6; i++) { const strip = mesh(new THREE.BoxGeometry(28, 0.3, 0.1), flat(0x8a9099)); strip.position.set(0, 1.5 + i * 1.2, 11.05); h.add(strip); }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const tw = new THREE.Group(); tw.position.set(-10 + i * 10, 9, -5 + j * 10); h.add(tw); // a cooling tower on the roof
    tw.add(P(mesh(bbox(6, 3.4, 6, 0.2), flat(0x9aa4ae)), V(0, 1.7, 0)));
    const shroud = mesh(new THREE.CylinderGeometry(2.2, 2.4, 1.1, 14, 1, true), flat(0x6f7a85, { side: THREE.DoubleSide, emissive: 0x7a2a10, emissiveIntensity: 0.6 })); shroud.position.y = 3.9; tw.add(shroud);
    const fan = new THREE.Group(); fan.position.y = 3.7; tw.add(fan); for (let b = 0; b < 5; b++) { const bl = mesh(new THREE.BoxGeometry(1.9, 0.05, 0.5), flat(0x2b2f36)); bl.position.x = 0.95; const piv = new THREE.Group(); piv.rotation.y = (b / 5) * Math.PI * 2; piv.add(bl); bl.rotation.x = 0.3; fan.add(piv); }
    tw.fan = fan; h.towers = (h.towers ?? []).concat(tw); } }
const TOWERS = HALLS.flatMap((h) => h.towers);
const STEAMM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8a8a96, emissiveIntensity: 0.5, transparent: true, roughness: 1, flatShading: true, depthWrite: false });
const STEAM = Array.from({ length: 72 }, (_, i) => { const m = mesh(facet(new THREE.IcosahedronGeometry(0.55, 1), 0.08), STEAMM.clone(), { cast: false, recv: false }); m.tw = TOWERS[i % TOWERS.length]; m.o = rnd(); scene.add(m); return m; });
// power: a substation and pylons
{ for (let i = 0; i < 6; i++) { const py = new THREE.Group(); py.position.set(-90 + i * 25, 0, 40); CAMPUS.add(py); const m = flat(0x8d949c); for (const s of [-1, 1]) { const leg = mesh(new THREE.CylinderGeometry(0.15, 0.3, 14, 4), m); leg.position.set(s * 1.2, 7, 0); leg.rotation.z = s * -0.08; py.add(leg); } const arm = mesh(new THREE.BoxGeometry(7, 0.3, 0.3), m); arm.position.y = 12.5; py.add(arm); } }

// ---------------------------------------------------------------- the hot aisle (x = 300)
const AI = V(300, 0, 0), AISLE = new THREE.Group(); AISLE.position.copy(AI); scene.add(AISLE);
{ const fl = tinted(new THREE.PlaneGeometry(30, 60, 15, 30).rotateX(-Math.PI / 2), 0x7d848e, 0.05, { roughness: 0.6 }); AISLE.add(fl);
  const room = new THREE.Mesh(new THREE.BoxGeometry(14, 6.2, 60), new THREE.MeshStandardMaterial({ color: 0x23272e, side: THREE.BackSide, roughness: 0.9 })); room.position.y = 3.05; AISLE.add(room);
  for (let i = 0; i < 30; i++) { const tl = mesh(new THREE.BoxGeometry(14, 0.1, 0.06), flat(0x9aa0a8)); tl.position.set(0, 0.03, -29 + i * 2); AISLE.add(tl); }
  const ceil = mesh(new THREE.PlaneGeometry(30, 60).rotateX(Math.PI / 2), flat(0x2a2e35)); ceil.position.y = 6; AISLE.add(ceil);
  for (let i = 0; i < 8; i++) { const lt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 6), glow(0xdff0ff)); lt.position.set(0, 5.95, -24 + i * 7); AISLE.add(lt); }
  const il = new THREE.PointLight(0xdff0ff, 22, 30, 1.4); il.position.set(0, 5, 0); AISLE.add(il); const il2 = il.clone(); il2.position.z = -20; AISLE.add(il2); }
const AR = []; for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const rk = rack(0x22262e); rk.position.set(s * 2.4, 0, -20 + i * 2.6); rk.rotation.y = s * -Math.PI / 2; rk.scale.set(1.25, 1.1, 1.0); AISLE.add(rk); AR.push(rk);
  const fans = []; for (let f = 0; f < 3; f++) { const fg = new THREE.Group(); fg.position.set(0, 0.6 + f * 0.7, 0.46); rk.add(fg); for (let b = 0; b < 4; b++) { const bl = mesh(new THREE.BoxGeometry(0.32, 0.06, 0.02), flat(0x55606b)); bl.position.x = 0.16; const pv = new THREE.Group(); pv.rotation.z = (b / 4) * Math.PI * 2; pv.add(bl); fg.add(pv); } fans.push(fg); } rk.fans = fans; }
const AIR = Array.from({ length: 140 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), glow(0x6ad0ff, { transparent: true })); m.o = V((rnd() - 0.5) * 3.6, 0.3 + rnd() * 3.4, -22 + rnd() * 26); m.ph = rnd(); AISLE.add(m); return m; });
const TECH = person({ sex: "f", top: 0x2f4a8a, bottom: 0x2b2b2b, skin: 0xc98b62, hair: 0x111111, glasses: true, longHair: false }); TECH.position.set(0.3, 0, 2); TECH.rotation.y = Math.PI; AISLE.add(TECH);

// ---------------------------------------------------------------- one AI rack (cutaway) and a hundred homes (x = -300)
const RK = V(-300, 0, 0), RKSET = new THREE.Group(); RKSET.position.copy(RK); scene.add(RKSET);
{ const gr = tinted(facet(new THREE.PlaneGeometry(260, 260, 26, 26).rotateX(-Math.PI / 2), 0.3), 0x5b7a4a, 0.1); RKSET.add(gr); const k = new THREE.PointLight(0xfff0dd, 200, 60, 1.3); k.position.set(4, 10, 10); RKSET.add(k); }
const HERO = new THREE.Group(); RKSET.add(HERO);
const HSHELL = new THREE.Group(); HERO.add(HSHELL); HSHELL.add(P(mesh(bbox(1.6, 4.4, 1.6, 0.06), flat(0x1e2229, { roughness: 0.45, metalness: 0.3 })), V(0, 2.2, 0)));
const HCUT = cutaway(HSHELL, V(0, 0, -1), 1.2, 0.2);
const TRAYS = []; for (let i = 0; i < 18; i++) { const t = new THREE.Group(); t.position.set(0, 0.35 + i * 0.21, 0); HERO.add(t); t.add(mesh(bbox(1.4, 0.12, 1.4, 0.02), flat(0x3a3f48)));
  for (let c = 0; c < 2; c++) { const chip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), glow(0xff6a2a)); chip.position.set(-0.35 + c * 0.7, 0.08, 0.1); t.add(chip); t.chips = (t.chips ?? []).concat(chip); } TRAYS.push(t); }
const KW = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#ffb03a"; g.font = "900 150px D"; g.textAlign = "center"; g.fillText("120 kW", w / 2, h * 0.78); }, 640, 180) })); KW.position.set(0, 5.4, 0.2); HERO.add(KW);
const HOMES = Array.from({ length: 100 }, (_, i) => { const hs = house(1.6, 1.4, 1.1, [0xe9d8b8, 0xd8e4ef, 0xf2d6d0, 0xe3efd6][i % 4], [0xc0643c, 0x6a7a8a, 0xa84a3a, 0x5a7a4a][i % 4]); const c = i % 10, rw = Math.floor(i / 10); hs.position.set(4 + c * 2.3, 0, -2 - rw * 2.3); hs.rotation.y = (rnd() - 0.5) * 0.3; RKSET.add(hs); return hs; });
const WIRE = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), glow(0xffd04a)); WIRE.rotation.z = Math.PI / 2; RKSET.add(WIRE);

// ---------------------------------------------------------------- the compute tray, exploded (x = -600), and the two loops
const TR = V(-600, 0, 0), TRSET = new THREE.Group(); TRSET.position.copy(TR); scene.add(TRSET);
{ const dome = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0a0f18, side: THREE.BackSide, fog: false })); TRSET.add(dome);
  const fl = tinted(new THREE.CircleGeometry(50, 24).rotateX(-Math.PI / 2), 0x121a24, 0.08); TRSET.add(fl);
  const k = new THREE.PointLight(0xcfe6ff, 160, 70, 1.3); k.position.set(6, 16, 12); TRSET.add(k); const k2 = new THREE.PointLight(0xff8a4a, 10, 30, 1.5); k2.position.set(-6, 3, 4); TRSET.add(k2); }
const BOARD = mesh(bbox(8, 0.3, 5, 0.08), flat(0x1f5a3a)); BOARD.position.y = 1.2; TRSET.add(BOARD);
for (let i = 0; i < 24; i++) { const tr = mesh(new THREE.BoxGeometry(0.05, 0.02, 2 + rnd() * 2), flat(0xd8b04a, { metalness: 0.8, roughness: 0.3 })); tr.position.set(-3.6 + i * 0.32, 1.37, (rnd() - 0.5) * 1.5); TRSET.add(tr); }
const CHIP = new THREE.Group(); CHIP.position.set(0, 1.5, 0); TRSET.add(CHIP); { CHIP.add(mesh(bbox(2.2, 0.2, 2.2, 0.05), flat(0x2a2d33))); const die = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.4), glow(0xff5a1a)); die.position.y = 0.13; CHIP.add(die); CHIP.die = die; }
const PLATE = new THREE.Group(); TRSET.add(PLATE); const PBODY = new THREE.Group(); PLATE.add(PBODY);
PBODY.add(mesh(bbox(2.5, 0.5, 2.5, 0.08), flat(0xb8c2cc, { metalness: 0.85, roughness: 0.25 })));
const PXR = xray(PBODY);
const CH = []; { const pts = []; for (let i = 0; i < 7; i++) { const z = -0.9 + i * 0.3; pts.push(V(i % 2 ? 0.95 : -0.95, 0, z), V(i % 2 ? -0.95 : 0.95, 0, z)); } const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.07, 6), glow(0x2a8aff, { transparent: true, opacity: 0.85 })); PLATE.add(tube); PLATE.curve = curve;
  for (let i = 0; i < 40; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), glow(0x9fdcff)); PLATE.add(d); CH.push(d); } }
// pipes out to the CDU, and the second (facility) loop
const P1 = new THREE.CatmullRomCurve3([V(1.25, 2.1, -0.6), V(3, 3.2, -0.6), V(6, 3.2, -1), V(8.5, 2.2, -1.5)]), P1b = new THREE.CatmullRomCurve3([V(8.5, 1.6, -0.6), V(6, 2.6, 0.2), V(3, 2.6, 0.4), V(1.25, 2.1, 0.6)]);
const P2 = new THREE.CatmullRomCurve3([V(10.6, 2.6, -1.0), V(13, 4.5, -1.5), V(15, 8, -2), V(15.5, 11, -2)]), P2b = new THREE.CatmullRomCurve3([V(15.8, 11, -0.5), V(15.2, 8, -0.2), V(13.2, 4.2, 0.2), V(10.6, 1.8, 0.2)]);
const PIPES = [P1, P1b, P2, P2b].map((c, i) => { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.16, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x2a6acc : 0xcc4a2a, roughness: 0.3, metalness: 0.4, transparent: true })); TRSET.add(m); return m; });
const CDU = mesh(bbox(2.2, 2.6, 2.2, 0.1), flat(0x3a4250, { metalness: 0.4, roughness: 0.4 })); CDU.position.set(9.6, 1.4, -0.6); TRSET.add(CDU);
const CDUL = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#9fdcff"; g.font = "800 90px M"; g.textAlign = "center"; g.fillText("HEAT SWAP", w / 2, h * 0.75); }, 640, 120) })); CDUL.position.set(9.6, 2.2, 0.52); TRSET.add(CDUL);
const DROPS = Array.from({ length: 80 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), glow(0xffffff)); d.k = i / 80; d.c = [P1, P1b, P2, P2b][i % 4]; TRSET.add(d); return d; });

// ---------------------------------------------------------------- Orbi: the phone, the server that only signs, the vault (x = 600)
const OB = V(600, 0, 0), OBSET = new THREE.Group(); OBSET.position.copy(OB); scene.add(OBSET);
{ const gr = tinted(facet(new THREE.PlaneGeometry(120, 120, 14, 14).rotateX(-Math.PI / 2), 0.3), 0x55704a, 0.1); OBSET.add(gr); const k = new THREE.PointLight(0xfff0dd, 220, 70, 1.3); k.position.set(2, 14, 12); OBSET.add(k);
  for (let i = 0; i < 16; i++) { const t = tree(2.6, i % 2 ? "round" : "pine"); const a = rnd() * 6.28, d = 16 + rnd() * 20; t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); OBSET.add(t); } }
const KID = person({ sex: "m", top: 0x4fc3bd, bottom: 0x2b3a55, skin: 0xe0a982, hair: 0x5a3a26, shortSleeve: true, hat: 0x2a2a2a, hatBand: 0x3dff8c }); KID.position.set(-6, 0, 2); KID.rotation.y = 0.6; OBSET.add(KID);
const KPH = new THREE.Group(); KPH.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const KSC = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), glow(0x3dff8c)); KSC.position.z = 0.007; KPH.add(KSC); KID.rig.rElbow.add(KPH); KPH.position.set(0, -0.4, 0.035); KPH.rotation.set(-0.15, 0, Math.PI);
const SRV = mesh(bbox(1.6, 2.2, 1.4, 0.1), flat(0x2a2f38, { metalness: 0.3, roughness: 0.45 })); SRV.position.set(0, 1.1, -3); OBSET.add(SRV);
const SRVL = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#3dff8c"; g.font = "800 80px M"; g.textAlign = "center"; g.fillText("ORBI SERVER", w / 2, h * 0.75); }, 640, 120) })); SRVL.position.set(0, 2.45, -2.3); OBSET.add(SRVL);
const VLT = new THREE.Group(); VLT.position.set(8, 0, -6); OBSET.add(VLT); VLT.add(P(mesh(bbox(4.5, 3.6, 3.6, 0.15), flat(0xbfc4c9)), V(0, 1.8, 0)));
{ const dr = mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 16), flat(0x8a9099, { metalness: 0.7, roughness: 0.3 })); dr.rotation.x = Math.PI / 2; dr.position.set(0, 1.7, 1.85); VLT.add(dr); const vl = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.5), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#ffffff"; g.font = "800 80px M"; g.textAlign = "center"; g.fillText("STORAGE", w / 2, h * 0.75); }, 640, 120) })); vl.position.set(0, 3.9, 1.85); VLT.add(vl); }
const TICKET = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#3dff8c"; g.fillRect(0, 0, w, h); g.fillStyle = "#03140a"; g.font = "900 70px D"; g.textAlign = "center"; g.fillText("TICKET ✓", w / 2, h * 0.68); }, 400, 200) })); OBSET.add(TICKET);
const BYTES = Array.from({ length: 16 }, (_, i) => { const m = mesh(bbox(0.35, 0.35, 0.35, 0.05), new THREE.MeshStandardMaterial({ color: 0x3dff8c, emissive: 0x1a8a4a, emissiveIntensity: 1.2 })); m.i = i; OBSET.add(m); return m; });

// ---------------------------------------------------------------- world at time t
const PHONEP = () => { KID.updateMatrixWorld(true); return KPH.getWorldPosition(V(0, 0, 0)); };
function world(t) {
  TOWERS.forEach((tw, i) => (tw.fan.rotation.y = t * 6 + i));
  STEAM.forEach((m) => { const k = (t * 0.25 + m.o) % 1; const p = m.tw.getWorldPosition(V(0, 0, 0)); m.position.set(p.x + Math.sin(m.o * 20 + k * 3) * 1.4 + k * 4, p.y + 4.5 + k * 14, p.z + Math.cos(m.o * 17) * 1.4); m.scale.setScalar(0.5 + k * 1.6); m.material.opacity = (1 - k) * 0.35; });
  // the aisle: fans spin, cold air goes in blue and comes out hot
  AR.forEach((rk, i) => { rk.fans.forEach((f, j) => (f.rotation.z = t * (18 + (i % 3) * 3) + j)); rk.leds.forEach((l, j) => (l.visible = Math.sin(t * 9 + i * 2 + j) > -0.2)); });
  const hot = clamp((t - wt("air", "at")) / 1.4);
  AIR.forEach((m) => { const k = (t * 0.6 + m.ph) % 1; const side = m.o.x > 0 ? 1 : -1; m.position.set(m.o.x * (1 - k) + side * k * 2.6, m.o.y + Math.sin(k * 6 + m.ph * 9) * 0.1, m.o.z + k * 1.5); m.material.color.set(0x6ad0ff).lerp(new THREE.Color(0xff5a2a), clamp(k * 1.4 * (0.3 + hot))); m.material.opacity = Math.sin(k * Math.PI); });
  pose(TECH, { walk: t * 0.9, speed: t > A("air") ? 0.35 : 0.0, look: Math.sin(t) * 0.4 }); TECH.position.z = 2 - clamp((t - A("air")) / 4) * 5;
  // the rack: trays glow, the side comes off, homes pop in
  TRAYS.forEach((tr, i) => tr.chips.forEach((c) => c.material.color.setHSL(0.05 + 0.03 * Math.sin(t * 3 + i), 1, 0.5 + 0.1 * Math.sin(t * 5 + i))));
  HCUT(ease(clamp((t - A("rack") - 0.4) / 1.0))); KW.scale.setScalar(back(clamp((t - wt("rack", "hundred") + 0.2) / 0.4)) || 0.001); KW.lookAt(cam.position);
  HOMES.forEach((h, i) => { const k = clamp((t - wt("rack", "roughly") - i * 0.012) / 0.35); h.visible = k > 0; h.scale.setScalar(back(k) || 0.001); });
  WIRE.visible = t > wt("rack", "roughly"); WIRE.scale.set(1, 26 * clamp((t - wt("rack", "roughly")) / 0.8), 1); WIRE.position.set(1 + 13 * clamp((t - wt("rack", "roughly")) / 0.8), 4.6, -0.5);
  // the tray: the cold plate drops on, x-ray shows the channels, liquid flows blue → red
  const drop = ease(clamp((t - wt("plate", "bolt") + 0.2) / 0.9)); PLATE.position.set(0, lerp(6, 1.95, drop), 0); PXR(clamp((t - wt("plate", "liquid")) / 0.6));
  const cool = clamp((t - wt("plate", "liquid") - 0.3) / 1.5); CHIP.die.material.color.set(0xff5a1a).lerp(new THREE.Color(0xff9a5a), cool * 0.6);
  CH.forEach((d, i) => { const k = (i / CH.length + t * 0.18) % 1; d.position.copy(PLATE.curve.getPointAt(k)); d.material.color.set(0x7fd0ff).lerp(new THREE.Color(0xff6a3a), k); d.visible = t > wt("plate", "liquid"); });
  const loops = clamp((t - A("loop")) / 0.8), two = clamp((t - wt("loop", "second")) / 0.8);
  PIPES.forEach((p, i) => { p.visible = i < 2 ? t > A("loop") - 0.2 : t > wt("loop", "second") - 0.3; p.material.opacity = i < 2 ? loops : two; });
  CDU.visible = CDUL.visible = t > A("loop") - 0.2;
  DROPS.forEach((d) => { const ii = [P1, P1b, P2, P2b].indexOf(d.c), on = ii < 2 ? loops : two; d.visible = on > 0.5; const k = (d.k * 4 + t * 0.35) % 1; d.position.copy(d.c.getPointAt(k)); d.material.color.set(ii % 2 ? 0x6ab8ff : 0xff6a3a); });
  // Orbi: a ticket, then the bytes fly straight from the phone to storage, past the server
  pose(KID, { phone: 1, look: 0.2 }); const tk = clamp((t - wt("orbi", "signs") + 0.1) / 0.8);
  const pp = PHONEP().sub(OB); TICKET.visible = tk > 0 && tk < 1.2 && t < A("end"); TICKET.position.copy(V(0, 2.6, -2.3).lerp(pp.clone().add(V(0, 0.4, 0)), ease(tk))); TICKET.position.y += Math.sin(tk * Math.PI) * 1.4; TICKET.rotation.set(0, tk * 6, 0.2);
  BYTES.forEach((b) => { const k = clamp((t - wt("orbi", "bytes") - b.i * 0.07) / 1.3); b.visible = k > 0 && k < 1; const a = pp.clone(), z = V(8, 1.8, -4.2); b.position.copy(a.lerp(z, ease(k))); b.position.y += Math.sin(k * Math.PI) * 3.2; b.rotation.set(t * 3 + b.i, t * 2, 0); });
}

// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const o = (b) => (x, y, z) => V(b.x + x, b.y + y, b.z + z), a = o(AI), k = o(RK), tr = o(TR), ob = o(OB);
// hook: the campus at dusk, then the thermal camera
shot(0, 2.4, V(90, 60, 110), V(0, 6, -6), 40, V(55, 30, 70), V(0, 6, -6), 40);
shot(wt("hook", "data"), 1.6, V(30, 22, 34), V(-17, 10, -6), 38, V(22, 18, 26), V(-17, 11, -6), 36);
shot(wt("hook", "melting"), 1.8, V(-6, 30, 26), V(-17, 11, -4), 40, V(-10, 26, 20), V(-17, 11, -4), 38);
// scene: in the aisle, chips glowing
shot(A("scene"), 1.6, a(0, 1.7, 8), a(0, 1.8, -12), 44, a(0, 1.6, 4), a(0, 1.8, -12), 44);
shot(wt("scene", "chip"), 1.5, a(-1.0, 1.5, -2), a(-2.4, 1.5, -6), 40, a(-1.2, 1.4, -3.5), a(-2.4, 1.4, -6.5), 36);
shot(wt("scene", "really"), 1.6, a(1.4, 1.1, -10), a(2.4, 1.6, -10), 50, a(1.2, 1.1, -10.5), a(2.4, 1.7, -10.5), 46);
// rack: cutaway, 120 kW, then the hundred homes
shot(A("rack"), 2.0, k(6, 4, 10), k(0, 2.6, 0), 40, k(4.5, 3.4, 8), k(0, 2.6, 0), 40);
shot(wt("rack", "hundred") - 0.2, 1.8, k(1.5, 4.0, 8.5), k(0, 3.6, 0), 42, k(1.0, 4.2, 7.2), k(0, 3.8, 0), 42);
shot(wt("rack", "roughly") - 0.1, 3.0, k(-6, 6, 10), k(10, 0.5, -8), 46, k(-3, 16, 18), k(12, 0, -10), 50);
// air: old way, fans
shot(A("air"), 2.0, a(0, 4.6, 10), a(0, 1.5, -10), 50, a(0, 3.6, 6), a(0, 1.5, -10), 48);
shot(wt("air", "at") - 0.1, 1.4, a(-1.4, 1.5, -6.6), a(-2.1, 1.3, -6.6), 40, a(-1.5, 1.4, -7.4), a(-2.1, 1.3, -7.4), 36);
shot(wt("air", "can't") - 0.2, 1.6, a(1.2, 3.4, 0.5), a(0, 1.2, -6), 46, a(0.8, 3, -0.5), a(0, 1.2, -7), 44);
// plate: the exploded tray
shot(A("plate"), 1.6, tr(14.4, 11.0, 19.8), tr(0.0, 2.0, 0.0), 40, tr(10.8, 9.0, 17.1), tr(0.0, 2.2, 0.0), 40);
shot(wt("plate", "bolt") - 0.2, 1.8, tr(8.1, 5.2, 13.5), tr(0.0, 3.0, 0.0), 42, tr(6.8, 4.9, 11.7), tr(0.0, 2.4, 0.0), 40);
shot(wt("plate", "liquid") - 0.1, 2.4, tr(1.1, 12.0, 8.1), tr(0.0, 1.9, 0.0), 40, tr(-0.7, 10.2, 6.5), tr(0.0, 1.9, 0.0), 40);
// loop: follow the pipes out to the heat swap and up
shot(A("loop"), 2.0, tr(1.4, 8.9, 23.8), tr(5.0, 2.4, -0.5), 46, tr(5.2, 10.5, 25.8), tr(7.0, 2.6, -0.8), 46);
shot(wt("loop", "hands"), 2.2, tr(5.6, 6.2, 22.1), tr(11.0, 3.5, -0.6), 46, tr(11.2, 9.6, 30.0), tr(13.0, 6.0, -1.5), 48);
// tower: on the roof, the fan, the steam
shot(A("tower"), 2.0, V(0, 20, 18), V(-17, 12, -11), 42, V(-4, 18, 12), V(-17, 13, -11), 40);
shot(wt("tower", "dumps"), 1.6, V(-11, 15, -4), V(-17, 15, -11), 46, V(-12, 14.6, -5), V(-17, 17, -11), 48);
shot(wt("tower", "comes"), 2.4, V(40, 40, 50), V(0, 8, -6), 40, V(52, 46, 62), V(0, 8, -6), 40);
// orbi
shot(A("orbi"), 1.8, ob(2, 3.2, 10), ob(-3, 1.2, -1), 44, ob(0.5, 3, 8.5), ob(-3, 1.2, -1), 42);
shot(wt("orbi", "never") - 0.1, 1.6, ob(3.5, 2.8, 3.5), ob(0, 1.4, -3), 42, ob(3, 2.6, 3), ob(0, 1.4, -3), 40);
shot(wt("orbi", "signs") - 0.1, 1.8, ob(-4, 2.6, 4), ob(-3, 1.8, -1), 44, ob(-3.5, 2.4, 3.5), ob(-3.5, 1.6, 0), 42);
shot(wt("orbi", "bytes") - 0.1, 2.6, ob(-2, 6, 10), ob(2, 1.6, -3), 46, ob(1, 8, 12), ob(4, 1.6, -4), 48);
const camAt = camRig(cam);

// ---------------------------------------------------------------- overlays
const project = (v) => { cam.updateMatrixWorld(); const pp = v.clone().project(cam); return [(pp.x + 1) / 2 * W, (1 - pp.y) / 2 * H, pp.z < 1]; };
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
const big = (txt, t, a0, b0, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a0 || t > b0) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a0) / 0.12) * clamp((b0 - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a0) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
const card = (id, html, t, a0, b0, x, y, rot = 0) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; const kk = clamp((t - a0) / 0.3); S(el, { left: `${x}px`, top: `${y}px`, opacity: kk * clamp((b0 - t) / 0.3), transform: `scale(${lerp(0.5, 1, back(kk))}) rotate(${rot}deg)` }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  tag("tA", `thermal camera · <i>hot</i>`, t, wt("hook", "melting"), A("scene") - 0.05);
  big("≈ 100 HOMES", t, wt("rack", "roughly") + 0.3, A("air") - 0.1, "#fff", 300, 112);
  card("c0", `<h5>Old way</h5>cold air · <s>can't keep up</s>`, t, wt("air", "fans"), A("plate") - 0.05, 200, 300, -2);
  tag("tA", `cold plate · <b>liquid inside</b>`, t, wt("plate", "liquid"), A("loop") - 0.05);
  tag("tA", `loop 1 → <b>heat swap</b> → loop 2`, t, wt("loop", "hands"), A("tower") - 0.05);
  tag("tA", `hot water in · <b>cold water back</b>`, t, wt("tower", "dumps"), A("orbi") - 0.05);
  tag("tA", `server <b>never carries</b> your file`, t, wt("orbi", "never"), wt("orbi", "signs") - 0.05);
  tag("tA", `it signs a <b>ticket</b>`, t, wt("orbi", "signs"), wt("orbi", "bytes") - 0.05);
  tag("tA", `bytes → <b>straight to storage</b>`, t, wt("orbi", "bytes"), A("end") - 0.05);
  // subtitles
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) {
  world(t); camAt(SH, t);
  // the thermal "4D" view: the hook's heat reveal, and the Orbi server staying cool
  const th = Math.max(win(t, wt("hook", "melting"), A("scene") - 0.1, 0.3, 0.2), win(t, wt("scene", "really"), A("rack") - 0.1, 0.2, 0.2), win(t, wt("orbi", "bytes") + 1.4, A("end") - 0.1, 0.3, 0.2));
  TH.set(th, t); overlays(t); comp.render();
};
await document.fonts.ready;
window.ready = true;
