// Improved Film 04: how an eSIM works (a soldered chip, a locked profile fetched over the internet via a QR code,
// several profiles on one chip) and Orbi's same trick: every file has its own QR code and short code.
import { THREE, stage, lights, person, pose, tree, rock, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, cloud, globe, onGlobe, arc, textTex, xray, explode, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const label = (txt, col = "#fff", w = 2.4, h = 0.6, font = "800 90px D", bg = null) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, map: textTex((g, cw, ch) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } g.fillStyle = col; g.font = font; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.74); }, 640, Math.round(640 * h / w)) }));

reseed(404);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x9fc4e8, fog: [0xbcd4ea, 60, 260], bloom: 0.4, exposure: 1.05 });
const LT = lights(scene, { key: 0xfff4e4, keyI: 2.4, sky: 0xdfe8ff, ground: 0x6a6058, fillI: 1.15, rim: 0xa9c8ff, rimI: 0.7, at: V(10, 18, 12), area: 18 });
scene.add(sky(0x5a8fd0, 0xcfe4f6, 0xe8eef4));

// ---------------------------------------------------------------- the arrivals hall (origin)
const HALL = new THREE.Group(); scene.add(HALL);
{ const fl = tinted(new THREE.PlaneGeometry(40, 40, 20, 20).rotateX(-Math.PI / 2), 0xd9d4cc, 0.05, { roughness: 0.35 }); HALL.add(fl);
  for (let i = 0; i < 20; i++) { HALL.add(P(mesh(new THREE.BoxGeometry(40, 0.005, 0.04), flat(0xb8b2a8), { cast: false }), V(0, 0.01, -20 + i * 2))); }
  // the glass wall with the runway and a plane outside
  for (let i = 0; i < 9; i++) HALL.add(P(mesh(new THREE.BoxGeometry(0.15, 7, 0.15), flat(0x3a3f46)), V(-16 + i * 4, 3.5, -9)));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(34, 7), new THREE.MeshStandardMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.18, roughness: 0.05 })); glass.position.set(0, 3.5, -9); HALL.add(glass);
  const tarmac = tinted(new THREE.PlaneGeometry(200, 80, 10, 4).rotateX(-Math.PI / 2), 0x6b6f75, 0.05); tarmac.position.set(0, -0.02, -50); HALL.add(tarmac);
  const PL = new THREE.Group(); PL.position.set(4, 0, -24); PL.rotation.y = -0.4; HALL.add(PL); const wm = flat(0xf4f6f8, { roughness: 0.4 });
  const fus = mesh(new THREE.CylinderGeometry(1.6, 1.6, 22, 14), wm); fus.rotation.z = Math.PI / 2; fus.position.y = 3.2; PL.add(fus);
  const nose = mesh(new THREE.SphereGeometry(1.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), wm); nose.rotation.z = -Math.PI / 2; nose.position.set(11, 3.2, 0); PL.add(nose);
  const wing = mesh(bbox(6, 0.3, 24, 0.1), wm); wing.position.set(0, 2.6, 0); PL.add(wing); const fin = mesh(bbox(3.5, 4.5, 0.3, 0.1), flat(0x3dbf8a)); fin.position.set(-9.5, 6, 0); PL.add(fin);
  for (let i = 0; i < 12; i++) PL.add(P(mesh(new THREE.BoxGeometry(0.5, 0.4, 0.05), flat(0x2a3a4a)), V(-6 + i * 1.3, 3.7, 1.6)));
  for (let i = 0; i < 6; i++) { const t = tree(4, "round", 0x5a9a4a); t.position.set(-60 + i * 22, 0, -70); HALL.add(t); }
  // the arrivals board
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), new THREE.MeshBasicMaterial({ toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#101418"; g.fillRect(0, 0, w, h); g.font = "700 46px M"; g.fillStyle = "#ffd04a"; g.fillText("ARRIVALS", 30, 66); const rows = [["LIS", "LANDED"], ["TYO", "LANDED"], ["NYC", "ON TIME"], ["DXB", "LANDED"]]; rows.forEach(([c, s], i) => { g.fillStyle = "#fff"; g.fillText(c, 30, 140 + i * 66); g.fillStyle = s === "LANDED" ? "#3dff8c" : "#ffd04a"; g.fillText(s, 300, 140 + i * 66); }); }, 768, 300) }));
  board.position.set(-7, 4.6, -8.8); HALL.add(board); HALL.add(P(mesh(bbox(6.3, 2.5, 0.2, 0.05), flat(0x2a2e33)), V(-7, 4.6, -8.95)));
  // benches and a kiosk
  for (let i = 0; i < 3; i++) { const b = new THREE.Group(); b.position.set(-9 + i * 3.4, 0, 2); HALL.add(b); b.add(P(mesh(bbox(2.6, 0.12, 0.6, 0.04), flat(0x3a4a5a)), V(0, 0.48, 0))); b.add(P(mesh(bbox(2.6, 0.6, 0.1, 0.04), flat(0x3a4a5a)), V(0, 0.8, -0.28))); for (const x of [-1.1, 1.1]) b.add(P(mesh(limb(0.04, 0.04, 0.45, 5), flat(0x9aa0a8)), V(x, 0.45, 0))); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 30).rotateX(Math.PI / 2), flat(0xeef0f2)); ceil.position.set(0, 7, 5); HALL.add(ceil); for (let i = 0; i < 6; i++) HALL.add(P(new THREE.Mesh(new THREE.BoxGeometry(20, 0.05, 0.3), glow(0xffffff)), V(0, 6.95, -6 + i * 3))); }
const TRAV = person({ sex: "f", top: 0x4fc3bd, bottom: 0x2b3a55, skin: 0xc98b62, hair: 0x2a1d16, longHair: true, sunglasses: false, glasses: true, shortSleeve: true }); TRAV.position.set(0.5, 0, 2.5); TRAV.rotation.y = 0.3; scene.add(TRAV);
const BAG = new THREE.Group(); BAG.add(P(mesh(bbox(0.45, 0.65, 0.28, 0.06), flat(0xd9573a)), V(0, 0.42, 0))); BAG.add(P(mesh(limb(0.015, 0.015, 0.45, 5), flat(0x2a2a2a)), V(0, 1.2, -0.1))); for (const x of [-0.15, 0.15]) BAG.add(P(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), flat(0x111111)), V(x, 0.06, 0.1))); BAG.position.set(1.0, 0, 2.6); scene.add(BAG);
const CROWD = []; for (let i = 0; i < 12; i++) { const p = person({ sex: i % 2 ? "f" : "m", top: [0xf2f2f2, 0xe9c46a, 0x8ab6d6, 0xd96c4e, 0x6c9a5b, 0xb48ad6][i % 6], bottom: [0x1f2d6b, 0x3a3a3a, 0xc9b38a][i % 3], shortSleeve: i % 2 === 0, hat: i % 5 === 2 ? 0xe8d6a8 : undefined, glasses: i % 4 === 1 }); p.position.set(-10 + (i % 6) * 3.6 + rnd(), 0, -4 + Math.floor(i / 6) * 9 + rnd()); p.userData = { ph: rnd(), dir: rnd() < 0.5 ? 1 : -1 }; scene.add(p); CROWD.push(p); }
// her phone (screen drawn in 2D)
const PH = new THREE.Group(); PH.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24, { roughness: 0.35, metalness: 0.3 }))); const PSC = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ toneMapped: false })); PSC.position.z = 0.007; PH.add(PSC); TRAV.rig.rElbow.add(PH); PH.position.set(0, -0.4, 0.035); PH.rotation.set(-0.15, 0, Math.PI);
const CV = document.createElement("canvas"); CV.width = 432; CV.height = 930; const CTX = CV.getContext("2d"); const TEX = new THREE.CanvasTexture(CV); TEX.colorSpace = THREE.SRGBColorSpace; PSC.material.map = TEX;
function qr(g, x, y, s, seedq = 5) { let sd = seedq; const rr = () => ((sd = (sd * 1664525 + 1013904223) % 4294967296) / 4294967296); const n = 21, c = s / n; g.fillStyle = "#fff"; g.fillRect(x - c, y - c, s + 2 * c, s + 2 * c); g.fillStyle = "#000";
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const f = (i < 7 && j < 7) || (i > 13 && j < 7) || (i < 7 && j > 13); if (f) { const a = i % 14, b = j % 14; const ring = a === 0 || a === 6 || b === 0 || b === 6 || (a > 1 && a < 5 && b > 1 && b < 5); if (ring) g.fillRect(x + i * c, y + j * c, c + 0.5, c + 0.5); } else if (rr() < 0.48) g.fillRect(x + i * c, y + j * c, c + 0.5, c + 0.5); } }
function screen(st, k = 0) { const g = CTX, w = CV.width, h = CV.height; g.fillStyle = "#0b0d10"; g.fillRect(0, 0, w, h); g.fillStyle = "#9aa"; g.font = "700 26px M";
  if (st === "nosvc") { g.fillText("NO SERVICE", 30, 70); g.fillStyle = "#ff6a5a"; g.font = "800 44px D"; g.fillText("No SIM", 30, 200); g.fillStyle = "#666"; g.font = "600 26px M"; g.fillText("insert a SIM card", 30, 250); }
  if (st === "scan") { g.fillText("ADD eSIM", 30, 70); g.strokeStyle = "#3dff8c"; g.lineWidth = 6; g.strokeRect(66, 220, 300, 300); g.fillStyle = "rgba(61,255,140,0.25)"; g.fillRect(66, 220 + 300 * ((k * 2) % 1), 300, 8); g.fillStyle = "#fff"; g.font = "600 28px M"; g.fillText("point at the QR code", 60, 600); }
  if (st === "dl") { g.fillText("eSIM", 30, 70); g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText(k < 1 ? "Downloading…" : "Activated ✓", 30, 200); g.fillStyle = "#23262e"; g.fillRect(30, 240, w - 60, 20); g.fillStyle = "#3dff8c"; g.fillRect(30, 240, (w - 60) * clamp(k), 20); }
  if (st === "multi") { g.fillText("eSIMs", 30, 70); [["Home", "Primary"], ["Travel", "Data"]].forEach(([n, s], i) => { const on = i === (k > 0.5 ? 1 : 0), y = 140 + i * 150; g.fillStyle = on ? "#123323" : "#15181d"; g.fillRect(30, y, w - 60, 120); g.fillStyle = "#fff"; g.font = "800 38px D"; g.fillText(n, 60, y + 55); g.fillStyle = "#889"; g.font = "600 24px M"; g.fillText(s, 60, y + 95); g.fillStyle = on ? "#3dff8c" : "#333"; g.beginPath(); g.roundRect(w - 150, y + 35, 90, 50, 25); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(on ? w - 85 : w - 125, y + 60, 20, 0, 7); g.fill(); }); }
  if (st === "orbi") { g.fillStyle = "#3dff8c"; g.font = "800 44px D"; g.fillText("orbi", 30, 80); g.fillStyle = "#e9c46a"; g.fillRect(30, 120, w - 60, 140); g.fillStyle = "#0b0d10"; g.font = "800 34px M"; g.fillText("boarding.pdf", 60, 205); g.fillStyle = "#fff"; g.font = "800 60px M"; g.fillText("k7f2", 140, 330); g.fillStyle = "#889"; g.font = "600 24px M"; g.fillText("short code", 150, 365); qr(g, 96, 400, 240, 11); }
  TEX.needsUpdate = true; }
// a kiosk card with the QR code
const CARD = new THREE.Group(); scene.add(CARD); CARD.add(mesh(bbox(0.5, 0.32, 0.01, 0.02), flat(0xffffff))); const CQ = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshBasicMaterial({ map: textTex((g, w, h) => qr(g, 12, 12, w - 24, 3), 256, 256) })); CQ.position.set(0.1, 0, 0.007); CARD.add(CQ); CARD.add(P(label("SCAN FOR eSIM", "#0b0d10", 0.2, 0.08, "800 70px D"), V(-0.13, 0.05, 0.007)));
// the old SIM card (big, for the snap) and the scan beam
const SIMC = new THREE.Group(); scene.add(SIMC); { const sm = flat(0xffffff, { roughness: 0.5 }); const half = (s) => { const g = new THREE.Group(); g.add(mesh(bbox(0.5, 0.7, 0.03, 0.05), sm)); const chip = mesh(bbox(0.24, 0.2, 0.01, 0.02), flat(0xd8b04a, { metalness: 0.9, roughness: 0.25 })); chip.position.set(0, s * 0.1, 0.02); g.add(chip); return g; }; SIMC.a = half(1); SIMC.b = half(-1); SIMC.add(SIMC.a, SIMC.b); }
const BEAM = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 4, 1, true), glow(0x3dff8c, { transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); scene.add(BEAM);

// ---------------------------------------------------------------- the x-ray phone and the chip (x = -300)
const XP = V(-300, 0, 0), XS = new THREE.Group(); XS.position.copy(XP); scene.add(XS);
{ XS.add(new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0a1018, side: THREE.BackSide }))); const fl = tinted(new THREE.CircleGeometry(40, 24).rotateX(-Math.PI / 2), 0x121a24, 0.08); XS.add(fl);
  const k = new THREE.PointLight(0xcfe6ff, 140, 70, 1.3); k.position.set(6, 16, 12); XS.add(k); const k2 = new THREE.PointLight(0x3dff8c, 30, 30, 1.5); k2.position.set(-6, 4, 6); XS.add(k2); }
const XPH = new THREE.Group(); XPH.position.set(0, 5, 0); XS.add(XPH); const XB = new THREE.Group(); XPH.add(XB); XB.add(mesh(bbox(4.2, 8.6, 0.5, 0.55), flat(0x2a2d34, { roughness: 0.3, metalness: 0.4 }))); const XR = xray(XB);
const BOARD = mesh(bbox(3.4, 7.4, 0.1, 0.1), flat(0x1f5a3a)); XPH.add(BOARD);
for (let i = 0; i < 9; i++) { const c = mesh(bbox(0.6 + (i % 3) * 0.3, 0.4 + (i % 2) * 0.3, 0.12, 0.03), flat(i % 2 ? 0x3a3f4a : 0x2a2d33)); c.position.set(-1 + (i % 3) * 1.0, -2.4 + Math.floor(i / 3) * 1.6, 0.1); XPH.add(c); }
const ESIM = new THREE.Group(); ESIM.position.set(0.9, 2.2, 0.12); XPH.add(ESIM); ESIM.add(mesh(bbox(0.7, 0.55, 0.12, 0.03), flat(0x15171c))); ESIM.add(P(label("eSIM", "#3dff8c", 0.6, 0.18, "800 90px M"), V(0, 0, 0.07)));
for (let i = 0; i < 8; i++) ESIM.add(P(mesh(new THREE.SphereGeometry(0.035, 6, 4), flat(0xd8d8e0, { metalness: 0.9, roughness: 0.2 })), V(-0.36 + (i % 4) * 0.24, i < 4 ? -0.3 : 0.3, -0.02)));
const RING = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 32), glow(0x3dff8c, { transparent: true, side: THREE.DoubleSide })); RING.position.set(0.9, 2.2, 0.2); XPH.add(RING);
// profiles stacked on the chip (multi)
const PROF = [["HOME", 0x3d7bff], ["TRAVEL", 0xffb03a], ["WORK", 0xb48ad6]].map(([t, c], i) => { const g = new THREE.Group(); g.add(mesh(bbox(1.6, 0.9, 0.1, 0.08), flat(c, { roughness: 0.4 }))); g.add(P(label(t, "#0b0d10", 1.4, 0.4, "900 100px D"), V(0, 0, 0.06))); XPH.add(g); g.i = i; return g; });

// ---------------------------------------------------------------- the profile's trip over the globe (x = 300)
const GP = V(300, 0, 0), GS = new THREE.Group(); GS.position.copy(GP); scene.add(GS);
{ GS.add(new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12), new THREE.MeshBasicMaterial({ color: 0x05070f, side: THREE.BackSide }))); const k = new THREE.PointLight(0xffffff, 300, 80, 1.2); k.position.set(10, 12, 16); GS.add(k);
  const st = []; for (let i = 0; i < 600; i++) { const v = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(60 + rnd() * 10); st.push(v); } GS.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(st), new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 }))); }
const GL = globe(4, 4); GL.position.set(0, 5, 0); GS.add(GL);
const FROM = onGlobe(4, 51, 0), TO = onGlobe(4, 35, 139); const ARC = arc(4, FROM, TO, 0x3dff8c, 0.55); GL.add(ARC);
const PKG = new THREE.Group(); GL.add(PKG); PKG.add(mesh(bbox(0.7, 0.5, 0.5, 0.06), flat(0xe9c46a, { roughness: 0.5 }))); const PL0 = new THREE.Group(); PKG.add(PL0); PL0.add(P(mesh(bbox(0.3, 0.24, 0.1, 0.03), flat(0x3dff8c, { emissive: 0x0a5a2a, emissiveIntensity: 0.4 })), V(0, 0, 0.27))); PL0.add(P(mesh(new THREE.TorusGeometry(0.09, 0.025, 5, 10, Math.PI), flat(0x3dff8c)), V(0, 0.13, 0.27)));
const INSIDE = [label("+44 7700 …", "#ffffff", 1.6, 0.36, "800 80px M", "#203040"), label("🔑 KEYS", "#3dff8c", 1.2, 0.36, "800 80px M", "#203040"), label("CARRIER", "#ffd04a", 1.2, 0.36, "800 80px M", "#203040")];
INSIDE.forEach((m) => PKG.add(m));
const TOWER = new THREE.Group(); GL.add(TOWER); TOWER.position.copy(FROM.clone().multiplyScalar(1.02)); TOWER.lookAt(FROM.clone().multiplyScalar(2)); { const tm = flat(0xd8dce2); const leg = mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.9, 4), tm); leg.rotation.x = Math.PI / 2; leg.position.z = 0.45; TOWER.add(leg); const top = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(0xff5a4a)); top.position.z = 0.92; TOWER.add(top); }
const PIN = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 8), glow(0x3dff8c)); GL.add(PIN); PIN.position.copy(TO.clone().multiplyScalar(1.08)); PIN.lookAt(TO.clone().multiplyScalar(3)); PIN.rotateX(-Math.PI / 2);

// ---------------------------------------------------------------- Orbi: her phone shows a QR + short code; a friend scans it (back in the hall)
const FRIEND = person({ sex: "m", top: 0xf08a5d, bottom: 0x3a4a6a, skin: 0xe0a982, hair: 0x5a3a26, shortSleeve: true, beard: true }); FRIEND.position.set(1.8, 0, 3.6); FRIEND.rotation.y = -2.2; scene.add(FRIEND);
const FPH = new THREE.Group(); FPH.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const FSC = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), glow(0x0b0d10)); FSC.position.z = 0.007; FPH.add(FSC); FRIEND.rig.rElbow.add(FPH); FPH.position.set(0, -0.4, 0.035); FPH.rotation.set(-0.15, 0, Math.PI);
const FILE = new THREE.Group(); scene.add(FILE); FILE.add(mesh(bbox(0.24, 0.3, 0.02, 0.02), flat(0xe9c46a))); FILE.add(P(label("PDF", "#0b0d10", 0.18, 0.08, "900 90px D"), V(0, 0, 0.012)));

// ---------------------------------------------------------------- world at time t
const tmp = V(0, 0, 0);
function world(t) {
  CROWD.forEach((p, i) => { const u = p.userData; pose(p, { walk: t * 0.9 + u.ph, speed: 0.5 }); p.position.x += u.dir * 0.012; if (p.position.x > 14) p.position.x = -14; if (p.position.x < -14) p.position.x = 14; p.rotation.y = u.dir * Math.PI / 2; });
  // the traveller: no service, the snapped SIM, then scanning, then her own QR
  const ph = t < A("old") ? 1 : t < wt("old", "lose") ? 0.6 : 1; pose(TRAV, { phone: ph, look: t > wt("old", "lose") && t < A("chip") ? -0.4 : 0 });
  if (t >= A("old") && t < A("chip")) { const k = clamp((t - wt("old", "snap") + 0.1) / 0.5), drop = clamp((t - wt("old", "lose")) / 0.6);
    SIMC.visible = true; SIMC.position.set(0.72, lerp(1.08, 0.03, out(drop)), 2.85); SIMC.rotation.set(-Math.PI / 2 * drop, 0.3, 0); SIMC.a.position.set(-k * 0.25, k * 0.05, 0); SIMC.a.rotation.z = k * 0.5; SIMC.b.position.set(k * 0.25, -k * 0.08, 0); SIMC.b.rotation.z = -k * 0.6; SIMC.scale.setScalar(0.28); } else SIMC.visible = false;
  CARD.visible = t >= A("qr") - 0.2 && t < A("multi"); CARD.position.set(0.62, 1.15, 3.05); CARD.scale.setScalar(0.6); CARD.rotation.set(0, Math.PI + 0.3, 0);
  const scan = win(t, wt("qr", "scan"), wt("qr", "where"), 0.2, 0.2); BEAM.visible = scan > 0; if (scan > 0) { TRAV.updateMatrixWorld(true); PH.getWorldPosition(tmp); BEAM.position.copy(tmp.clone().lerp(CARD.position, 0.5)); BEAM.lookAt(CARD.position); BEAM.rotateX(Math.PI / 2); BEAM.scale.set(1, tmp.distanceTo(CARD.position) / 0.6, 1); BEAM.material.opacity = 0.3 * scan; }
  // phone screen states
  if (t < wt("old", "lose")) screen("nosvc"); else if (t < A("qr")) screen("nosvc"); else if (t < wt("qr", "where")) screen("scan", t); else if (t < A("multi")) screen("dl", clamp((t - wt("qr", "where")) / 2.2)); else if (t < A("orbi")) screen("multi", clamp((t - wt("multi", "switch")) / 0.4)); else screen("orbi");
  // x-ray phone: the body fades, the chip glows, a ring pings; the profiles slide in and switch
  XR(clamp((t - A("chip") - 0.3) / 0.8)); RING.scale.setScalar(1 + ((t * 1.2) % 1) * 1.5); RING.material.opacity = 1 - ((t * 1.2) % 1);
  PROF.forEach((g) => { const k = clamp((t - A("multi") - 0.2 - g.i * 0.35) / 0.5), sw = clamp((t - wt("multi", "switch")) / 0.5); g.visible = t >= A("multi") && t < A("orbi"); const top = g.i === (sw > 0.5 ? 1 : 0); g.position.set(lerp(4, 0.9, back(k)), 2.2 + 1.2 + g.i * 1.05, 0.5 + (top ? 0.4 : 0)); g.scale.setScalar(top ? 1.1 : 0.9); });
  // globe: the package flies from the carrier to her pin, then opens (exploded) to show what's inside
  GL.rotation.set(0.55, -1.22 + (t - A("profile")) * 0.03, 0); const fly = ease(clamp((t - wt("profile", "little") + 0.2) / 1.8)), open = clamp((t - wt("profile", "number") + 0.2) / 0.7);
  ARC.grow(fly); const pt = ARC.curve.getPointAt(Math.max(0.001, fly)); PKG.position.copy(pt); PKG.lookAt(pt.clone().multiplyScalar(2)); PKG.scale.setScalar(2.2 + open * 0.8);
  INSIDE.forEach((m, i) => { m.visible = open > 0; m.position.set(lerp(0, (i - 1) * 1.1, ease(open)), lerp(0, 0.75 + (i % 2) * 0.3, ease(open)), 0.4); m.scale.setScalar(Math.max(0.01, open)); m.lookAt(cam.position); });
  PL0.position.y = open * 0.5; PL0.visible = true;
  // Orbi: the friend scans her screen and the file pops to his phone
  FRIEND.visible = t >= A("orbi") - 0.3; pose(FRIEND, { phone: 1, look: 0.2 }); FSC.material.color.set(t > wt("orbi", "grab") + 0.6 ? 0x3dff8c : 0x0b0d10);
  const fk = clamp((t - wt("orbi", "grab")) / 0.8); FILE.visible = fk > 0 && fk < 1; if (FILE.visible) { TRAV.updateMatrixWorld(true); FRIEND.updateMatrixWorld(true); const a0 = PH.getWorldPosition(V(0, 0, 0)), b0 = FPH.getWorldPosition(V(0, 0, 0)); FILE.position.copy(a0.lerp(b0, ease(fk))); FILE.position.y += Math.sin(fk * Math.PI) * 0.4; FILE.rotation.y = fk * 6; }
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const o = (b) => (x, y, z) => V(b.x + x, b.y + y, b.z + z), x = o(XP), gl = o(GP);
SH.push({ at: 0, dur: 2.0, track: PH, d0: 0.9, d1: 0.38, side: 0.2, lift: 0.3, fov: 38 });
shot(wt("hook", "no") - 0.1, 2.2, V(7, 3.5, 11), V(0.5, 1.2, 2), 44, V(5, 2.6, 8.5), V(0.5, 1.2, 2.5), 42);
shot(A("old"), 1.8, V(2.6, 1.6, 5.4), V(0.9, 1.1, 3), 38, V(2.2, 1.4, 4.8), V(0.9, 1.0, 3), 36);
shot(wt("old", "lose") - 0.1, 1.8, V(1.8, 0.5, 4.2), V(0.9, 0.2, 3.0), 40, V(1.5, 0.35, 3.8), V(0.9, 0.1, 3.0), 38);
shot(A("chip"), 1.8, x(0, 5, 18), x(0, 5, 0), 44, x(2, 5.5, 14), x(0, 5, 0), 42);
shot(wt("chip", "soldered") - 0.1, 2.2, x(3, 8.5, 6), x(0.9, 7.2, 0), 40, x(2, 7.8, 4), x(0.9, 7.2, 0.1), 38);
shot(wt("chip", "nothing") - 0.1, 1.6, x(-2.5, 7.6, 5), x(0.9, 7.2, 0), 42, x(-2, 7.4, 4.4), x(0.9, 7.2, 0), 40);
shot(A("profile"), 2.2, gl(0.0, 6.9, 30.4), gl(0.0, 5.0, 0.0), 44, gl(5.7, 8.8, 24.7), gl(0.0, 5.0, 0.0), 42);
shot(wt("profile", "little") - 0.1, 2.6, gl(-6, 15, 34), gl(0, 7, 0), 44, gl(4, 16, 32), gl(0, 7.4, 0), 44);
shot(wt("profile", "number") - 0.2, 2.2, gl(0, 14, 26), gl(0, 8.4, 0), 46, gl(-2, 13, 23), gl(0, 8.4, 0), 46);
SH.push({ at: A("qr"), dur: 1.6, track: PH, d0: 1.2, d1: 0.6, side: -0.6, lift: 0.4, fov: 40 });
shot(wt("qr", "scan") - 0.1, 1.6, V(3.2, 1.7, 5.6), V(0.6, 1.2, 2.9), 40, V(2.9, 1.6, 5.2), V(0.6, 1.2, 2.9), 38);
SH.push({ at: wt("qr", "where") - 0.1, dur: 2.8, track: PH, d0: 0.4, d1: 0.32, side: 0.05, lift: 0.1, fov: 36 });
shot(A("multi"), 1.6, x(4, 8, 12), x(0.9, 8, 0), 44, x(3, 8.4, 10), x(0.9, 8.2, 0), 42);
SH.push({ at: wt("multi", "switch") - 0.2, dur: 1.6, track: PH, d0: 0.42, d1: 0.34, side: 0.05, lift: 0.1, fov: 36 });
shot(A("orbi"), 1.8, V(5, 2.6, 8), V(1.1, 1.2, 3), 42, V(4, 2.2, 7), V(1.1, 1.2, 3), 40);
SH.push({ at: wt("orbi", "every") - 0.1, dur: 2.6, track: PH, d0: 0.5, d1: 0.34, side: 0.05, lift: 0.12, fov: 36 });
shot(wt("orbi", "grab") - 0.2, 2.2, V(-1.5, 1.8, 6.5), V(1.2, 1.3, 3.0), 42, V(-1.0, 1.7, 5.8), V(1.2, 1.3, 3.1), 40);
const camAt = camRig(cam); const _p = V(0, 0, 0), _n = V(0, 0, 0), _q = new THREE.Quaternion();
function camera(t) { let s = SH[0]; for (const x of SH) if (t >= x.at) s = x; cam.up.set(0, 1, 0);
  if (s.track) { const k = ease(clamp((t - s.at) / s.dur)); s.track.updateWorldMatrix(true, false); s.track.getWorldPosition(_p); s.track.getWorldQuaternion(_q); _n.set(s.side ?? 0, s.lift ?? 0.25, 1).normalize().applyQuaternion(_q);
    cam.position.copy(_p).addScaledVector(_n, lerp(s.d0, s.d1, k)); cam.up.set(0, 1, 0).applyQuaternion(_q).lerp(V(0, 1, 0), 0.25).normalize(); cam.lookAt(_p); if (cam.fov !== s.fov) { cam.fov = s.fov; cam.updateProjectionMatrix(); } return; }
  camAt(SH.filter((x) => !x.track), t); }

// ---------------------------------------------------------------- overlays
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
const big = (txt, t, a0, b0, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a0 || t > b0) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a0) / 0.12) * clamp((b0 - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a0) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  big("SNAP!", t, wt("old", "snap"), wt("old", "and") - 0.05, "#ff6a5a", 320, 150);
  tag("tA", `soldered <b>on the board</b>`, t, wt("chip", "soldered"), A("profile") - 0.05);
  tag("tA", `profile · <b>locked package</b>`, t, wt("profile", "little"), wt("profile", "downloaded") - 0.05);
  tag("tA", `downloaded <b>over the internet</b>`, t, wt("profile", "downloaded"), A("qr") - 0.05);
  tag("tA", `QR = <b>where to fetch</b> + <b>claim code</b>`, t, wt("qr", "where"), A("multi") - 0.05);
  tag("tA", `one chip · <b>several profiles</b>`, t, A("multi") + 0.3, A("orbi") - 0.05);
  tag("tA", `every file · <b>QR + short code</b>`, t, wt("orbi", "every"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camera(t); world(t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
