// Improved Film 06: how your phone turns your voice into a file (air wobbles → mic diaphragm → voltage →
// ~48,000 samples a second → numbers → a squeezed file), then Orbi sends the voice note to a friend nearby.
import { THREE, stage, lights, person, pose, tree, house, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, cloud, textTex, xray, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const label = (txt, col = "#fff", w = 2.4, h = 0.6, font = "800 90px D", bg = null) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, map: textTex((g, cw, ch) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } g.fillStyle = col; g.font = font; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.74); }, 640, Math.round(640 * h / w)) }));
const phoneOn = (p) => { const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); sc.position.z = 0.007; g.add(sc); g.scr = sc; p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };
// a hum: a few notes, so every wave in the film has the same shape
const hum = (x, t) => Math.sin(x * 2.2 - t * 6) * 0.6 + Math.sin(x * 5.1 - t * 9 + 1) * 0.25 + Math.sin(x * 0.9 - t * 3) * 0.2;

reseed(606);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0xf0a070, fog: [0xf2b48e, 60, 300], bloom: 0.45, exposure: 1.05 });
const SUN = V(-20, 8, -30);
const LT = lights(scene, { key: 0xffc896, keyI: 2.4, sky: 0xffdcc4, ground: 0x5a4a40, fillI: 1.1, rim: 0xa9b8ff, rimI: 0.7, at: SUN, area: 14 });
const SKY = sky(0x3d4f9a, 0xf59660, 0xf9c99a); SKY.u.sun.value.copy(SUN).normalize(); scene.add(SKY);

// ---------------------------------------------------------------- the rooftop at sunset (origin), city below
const ROOF = new THREE.Group(); scene.add(ROOF);
{ const deck = tinted(new THREE.PlaneGeometry(14, 14, 14, 14).rotateX(-Math.PI / 2), 0xa8826a, 0.08); ROOF.add(deck);
  for (let i = 0; i < 14; i++) ROOF.add(P(mesh(new THREE.BoxGeometry(14, 0.02, 0.05), flat(0x8a6a50), { cast: false }), V(0, 0.01, -7 + i)));
  for (const [x, z, w, d] of [[0, -7, 14, 0.2], [-7, 0, 0.2, 14], [7, 0, 0.2, 14]]) ROOF.add(P(mesh(bbox(w, 1.0, d, 0.04), flat(0xd8d4cc)), V(x, 0.5, z)));
  ROOF.add(P(mesh(bbox(14, 14, 14, 0.2), flat(0xc9b8a0)), V(0, -7.02, 0)));
  for (let i = 0; i < 4; i++) { const pl = new THREE.Group(); pl.position.set(-5.5 + i * 0.7, 0, -6); ROOF.add(pl); pl.add(P(mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.45, 8), flat(0xc06a3a)), V(0, 0.22, 0))); const t = tree(1.2, "round", 0x4f9a3c); t.scale.setScalar(0.5); t.position.y = 0.3; pl.add(t); }
  const bench = new THREE.Group(); bench.position.set(1.5, 0, -2); ROOF.add(bench); bench.add(P(mesh(bbox(2.4, 0.12, 0.6, 0.04), flat(0x8a5a36)), V(0, 0.48, 0))); for (const x of [-1, 1]) bench.add(P(mesh(limb(0.04, 0.04, 0.45, 5), flat(0x2a2a2a)), V(x, 0.45, 0)));
  // string lights
  const pts = []; for (let i = 0; i <= 20; i++) { const k = i / 20; pts.push(V(-6.8 + k * 13.6, 2.6 - Math.sin(k * Math.PI) * 0.5, -6.8)); } ROOF.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.012, 4), flat(0x222222))); pts.slice(1, -1).forEach((p, i) => ROOF.add(P(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), glow([0xffd27a, 0xff9a6a, 0x9ad7ff][i % 3])), p.clone().add(V(0, -0.07, 0)))));
  // the city below
  for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, d = 14 + rnd() * 70; const hgt = 6 + rnd() * 22, b = new THREE.Group(); b.add(P(mesh(bbox(4 + rnd() * 3, hgt, 4 + rnd() * 3, 0.15), flat([0xe9d8b8, 0xd8e4ef, 0xf2d6d0, 0xcfd8c0, 0xb8c4d0][i % 5])), V(0, hgt / 2, 0))); for (let w = 0; w < Math.floor(hgt / 3); w++) b.add(P(new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.05), glow(w % 3 ? 0xffe0a0 : 0x8a7050)), V(0, 2 + w * 3, 2.6))); b.position.set(Math.cos(a) * d, -14, Math.sin(a) * d); b.lookAt(0, -14, 0); scene.add(b); }
  const gr = tinted(facet(new THREE.PlaneGeometry(300, 300, 20, 20).rotateX(-Math.PI / 2), 0.4), 0x6f8a5a, 0.1); gr.position.y = -14; scene.add(gr);
  for (let i = 0; i < 8; i++) { const c = cloud(6 + rnd() * 5, 0xffe2d4); c.position.set(-150 + rnd() * 300, 30 + rnd() * 30, -150 - rnd() * 80); scene.add(c); } }
const GIRL = person({ sex: "f", top: 0xffd04a, bottom: 0x2b3a55, skin: 0xe0a982, hair: 0x2a1d16, longHair: true, shortSleeve: true }); GIRL.position.set(-1.2, 0, 1.2); GIRL.rotation.y = 0.35; scene.add(GIRL);
const GPH = phoneOn(GIRL); const GCV = document.createElement("canvas"); GCV.width = 432; GCV.height = 930; const GTX = new THREE.CanvasTexture(GCV); GTX.colorSpace = THREE.SRGBColorSpace; GPH.scr.material = new THREE.MeshBasicMaterial({ map: GTX, toneMapped: false });
function rec(t, st) { const g = GCV.getContext("2d"), w = GCV.width, h = GCV.height; g.fillStyle = "#0e1016"; g.fillRect(0, 0, w, h); g.fillStyle = "#ff4a4a"; g.beginPath(); g.arc(w / 2, h - 160, 60, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "700 40px M"; g.fillText(st === "orbi" ? "hum.m4a" : "0:0" + Math.min(9, Math.floor(t % 10)), 130, 120);
  g.strokeStyle = "#ffd04a"; g.lineWidth = 6; g.beginPath(); for (let x = 0; x < w; x += 6) { const y = h / 2 + hum(x / 40, t) * 120 * (st === "rec" ? 1 : 0.4); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  if (st === "orbi") { g.fillStyle = "#3dff8c"; g.font = "800 44px D"; g.fillText("✓ sent nearby", 70, h - 300); } GTX.needsUpdate = true; }
const NOTES = Array.from({ length: 8 }, (_, i) => { const m = label(i % 2 ? "♪" : "♫", "#ffd04a", 0.5, 0.5, "900 300px D"); m.o = rnd(); scene.add(m); return m; });
// the friend on the next roof
const FR = person({ sex: "m", top: 0x4fc3bd, bottom: 0x3a4a6a, skin: 0xc98b62, hair: 0x111111, shortSleeve: true, glasses: true }); FR.position.set(2.2, 0, 2.6); FR.rotation.y = -1.96; scene.add(FR);
const FPH = phoneOn(FR); const FILE = new THREE.Group(); scene.add(FILE); FILE.add(mesh(bbox(0.3, 0.38, 0.04, 0.04), flat(0xffd04a))); FILE.add(P(label("♪ hum", "#0b0d10", 0.26, 0.1, "900 90px D"), V(0, 0, 0.03)));

// ---------------------------------------------------------------- slow-motion air (x = -300): molecules squeezing in waves
const AIRP = V(-300, 0, 0), AIRS = new THREE.Group(); AIRS.position.copy(AIRP); scene.add(AIRS);
{ AIRS.add(new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0b1020, side: THREE.BackSide }))); const k = new THREE.PointLight(0xcfe0ff, 160, 60, 1.2); k.position.set(4, 12, 12); AIRS.add(k); }
const MOLS = []; const MM = new THREE.MeshStandardMaterial({ color: 0x8fd0ff, emissive: 0x1a3a6a, emissiveIntensity: 0.6, roughness: 0.3 });
for (let i = 0; i < 520; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), MM); m.base = V(-6 + rnd() * 14, 2 + rnd() * 4, -2 + rnd() * 4); AIRS.add(m); MOLS.push(m); }
const MOUTH = person({ sex: "f", top: 0xffd04a, bottom: 0x2b3a55, skin: 0xe0a982, hair: 0x2a1d16, longHair: true, shortSleeve: true }); MOUTH.position.set(-7.4, 2.4, 0); MOUTH.rotation.y = Math.PI / 2; MOUTH.scale.setScalar(2.2); AIRS.add(MOUTH);
const APH = new THREE.Group(); APH.add(mesh(bbox(0.9, 1.8, 0.14, 0.12), flat(0x1d1f24))); APH.position.set(8.6, 4.2, 0); APH.rotation.y = -Math.PI / 2; AIRS.add(APH);

// ---------------------------------------------------------------- the mic, x-rayed (x = 300): diaphragm, a hair for scale, the voltage wave
const MP = V(300, 0, 0), MIC = new THREE.Group(); MIC.position.copy(MP); scene.add(MIC);
{ MIC.add(new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0a0f18, side: THREE.BackSide }))); MIC.add(P(tinted(new THREE.CircleGeometry(40, 24).rotateX(-Math.PI / 2), 0x121a24, 0.08), V(0, 0, 0)));
  const k = new THREE.PointLight(0xcfe6ff, 160, 60, 1.3); k.position.set(5, 14, 12); MIC.add(k); const k2 = new THREE.PointLight(0xffd04a, 30, 25, 1.5); k2.position.set(-5, 4, 6); MIC.add(k2); }
const CASE = new THREE.Group(); CASE.position.set(0, 4, 0); MIC.add(CASE); const CB = new THREE.Group(); CASE.add(CB); CB.add(mesh(bbox(5, 3.2, 3.4, 0.25), flat(0x9aa4ae, { metalness: 0.7, roughness: 0.3 }))); const CX = xray(CB);
const PORT = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16), flat(0x111111)); PORT.position.set(0, -1.6, 0); CASE.add(PORT);
const DIA = mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.04, 40, 1), new THREE.MeshStandardMaterial({ color: 0xffd04a, metalness: 0.6, roughness: 0.25, emissive: 0x4a3a00, emissiveIntensity: 0.4 })); DIA.position.set(0, -0.5, 0); CASE.add(DIA);
{ const g = DIA.geometry, p = g.attributes.position; DIA.base = p.array.slice(); }
const BACKPLATE = mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.12, 40), flat(0x3a3f4a)); BACKPLATE.position.set(0, 0.2, 0); CASE.add(BACKPLATE); for (let i = 0; i < 12; i++) { const h = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8), flat(0x111111)); const a = i / 12 * Math.PI * 2; h.position.set(Math.cos(a) * 0.8, 0.2, Math.sin(a) * 0.8); CASE.add(h); }
const HAIR = mesh(new THREE.CylinderGeometry(0.9, 0.9, 9, 16), flat(0x5a3a26, { roughness: 0.5 })); HAIR.rotation.z = Math.PI / 2; HAIR.position.set(0, 1.0, 4.5); MIC.add(HAIR);
const HLAB = label("a hair", "#ffb070", 1.6, 0.45, "800 100px D"); HLAB.position.set(-3, 2.4, 4.5); MIC.add(HLAB); const DLAB = label("diaphragm", "#ffd04a", 2.4, 0.5, "800 100px D"); DLAB.position.set(3.2, 3.6, 1.5); MIC.add(DLAB);
// the voltage wave and the samples (a strip in front of the mic)
const WAVEN = 220, WX0 = -9, WX1 = 9; const wavePts = Array.from({ length: WAVEN }, (_, i) => V(lerp(WX0, WX1, i / (WAVEN - 1)), 8, 0));
let WAVE = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wavePts), 400, 0.06, 6), glow(0xffd04a)); MIC.add(WAVE);
const GRID = new THREE.Group(); MIC.add(GRID); for (let i = 0; i <= 18; i++) GRID.add(P(new THREE.Mesh(new THREE.BoxGeometry(0.02, 4, 0.02), glow(0x1f3a2a)), V(-9 + i, 8, -0.2))); for (let j = 0; j <= 4; j++) GRID.add(P(new THREE.Mesh(new THREE.BoxGeometry(18, 0.02, 0.02), glow(0x1f3a2a)), V(0, 6 + j, -0.2)));
const BARS = Array.from({ length: 36 }, (_, i) => { const x = lerp(-8.5, 8.5, i / 35); const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1, 0.22), new THREE.MeshStandardMaterial({ color: 0x3dff8c, emissive: 0x0a5a2a, emissiveIntensity: 0.8 })); b.geometry.translate(0, 0.5, 0); b.position.set(x, 8, 0.1); b.x = x; MIC.add(b); const n = label("0", "#ffffff", 0.9, 0.3, "800 110px M"); n.position.set(x, 10.6, 0.1); MIC.add(n); b.n = n; return b; });
const NUMTEX = new Map(); const numTex = (v) => { if (!NUMTEX.has(v)) NUMTEX.set(v, textTex((g, w, h) => { g.fillStyle = v < 0 ? "#ff8a7a" : "#ffffff"; g.font = "800 110px M"; g.textAlign = "center"; g.fillText(String(v), w / 2, h * 0.74); }, 640, 213)); return NUMTEX.get(v); };
const FILEBIG = new THREE.Group(); MIC.add(FILEBIG); FILEBIG.add(mesh(bbox(3, 3.8, 0.5, 0.2), flat(0xc99a2e, { roughness: 0.6 }))); FILEBIG.add(P(label("hum.m4a", "#0b0d10", 2.6, 0.6, "900 120px M"), V(0, -0.8, 0.27))); FILEBIG.add(P(label("♪", "#0b0d10", 1.4, 1.4, "900 300px D"), V(0, 0.6, 0.27)));

// ---------------------------------------------------------------- world at time t
const tmp = V(0, 0, 0);
function world(t) {
  // the hum: she lifts the phone, notes float out; the screen shows the recording
  pose(GIRL, { phone: 1, look: 0.15 }); GIRL.rig.head.rotation.z = Math.sin(t * 2) * 0.08; GIRL.rig.chest.rotation.y = Math.sin(t * 1.5) * 0.06;
  rec(t, t > A("orbi") ? "orbi" : "rec"); GIRL.updateMatrixWorld(true); const head = GIRL.rig.head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.15, 0));
  NOTES.forEach((n, i) => { const k = (t * 0.4 + n.o) % 1; n.visible = t < A("mic") || t > A("orbi"); n.position.copy(head).add(V(0.3 + k * 1.2, k * 1.4, 0.3 + Math.sin(k * 6 + i) * 0.3)); n.material.opacity = Math.sin(k * Math.PI); n.lookAt(cam.position); n.scale.setScalar(0.4 + k * 0.4); });
  // slow-motion air: molecules bunch up and spread out along x (a sound wave), the phone at the end
  const sp = t < A("mic") ? 1 : 0.3; MOLS.forEach((m) => { const x = m.base.x, d = Math.sin(x * 1.6 - t * 4 * sp) * 0.35 * (x > -6.5 ? 1 : 0); m.position.set(x + d, m.base.y, m.base.z); m.scale.setScalar(1 + Math.cos(x * 1.6 - t * 4 * sp) * 0.25); });
  pose(MOUTH, { look: 0 }); MOUTH.rig.head.rotation.x = Math.sin(t * 6) * 0.04;
  // the mic: x-ray, the diaphragm shakes with the hum (dome-shaped wobble)
  CX(clamp((t - A("mic") - 0.2) / 0.8)); const amp = t >= A("mic") ? 0.22 : 0; { const g = DIA.geometry, p = g.attributes.position, b = DIA.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], z = b[i * 3 + 2], rr = Math.hypot(x, z) / 1.4; p.setY(i, b[i * 3 + 1] + (1 - rr * rr) * hum(0, t) * amp); } p.needsUpdate = true; g.computeVertexNormals(); }
  HAIR.visible = HLAB.visible = t >= wt("mic", "thinner") - 0.2 && t < A("volts"); DLAB.visible = t >= wt("mic", "diaphragm") && t < A("volts"); [HLAB, DLAB].forEach((l) => l.lookAt(cam.position));
  // the voltage wave grows across the screen, then freezes for the samples
  const wk = clamp((t - wt("volts", "wave") + 0.3) / 1.6), frz = t >= A("samples") ? A("samples") : t; const show = t >= A("volts") - 0.2 && t < A("orbi");
  WAVE.visible = GRID.visible = show; if (show) { const n = Math.max(2, Math.floor(WAVEN * Math.max(0.02, wk))); const pts = []; for (let i = 0; i < n; i++) pts.push(V(lerp(WX0, WX1, i / (WAVEN - 1)), 8 + hum(i / 12, frz) * 1.6, 0)); WAVE.geometry.dispose(); WAVE.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, n * 2), 0.06, 6); }
  BARS.forEach((b, i) => { const k = clamp((t - wt("samples", "measures") - i * 0.03) / 0.25); const v = hum(((b.x - WX0) / (WX1 - WX0)) * (WAVEN - 1) / 12, A("samples")); b.visible = k > 0 && t < A("orbi"); const hgt = v * 1.6; b.scale.y = Math.max(0.01, Math.abs(hgt)) * k; b.position.y = 8 + Math.min(0, hgt) * k; b.material.color.set(v < 0 ? 0xff7a6a : 0x3dff8c);
    const num = Math.round(v * 1000); b.n.visible = b.visible && t > wt("samples", "number") - 0.2 && i % 2 === 0; b.n.material.map = numTex(num); b.n.position.y = 10.6; });
  // the file: the bars squeeze into a file box
  const fk = clamp((t - wt("file", "line") + 0.1) / 1.2), sq = clamp((t - wt("file", "squeeze") + 0.1) / 0.6);
  if (t >= A("file")) BARS.forEach((b, i) => { b.visible = fk < 1; b.position.x = lerp(b.x, 0, ease(fk)); b.position.y = lerp(b.position.y, 8, ease(fk)); });
  FILEBIG.visible = t >= wt("file", "squeeze") - 0.2 && t < A("orbi"); FILEBIG.position.set(0, 8, 0.5); FILEBIG.scale.set(lerp(2.2, 1, back(sq)), lerp(0.4, 1, back(sq)), 1); FILEBIG.rotation.y = Math.sin(t * 1.5) * 0.25;
  // Orbi: the file flies to the friend's phone; he bobs his head
  pose(FR, { phone: 1, look: -0.3 }); const fl = clamp((t - wt("orbi", "pops") + 0.2) / 1.0); FILE.visible = fl > 0 && fl < 1; FR.rig.head.rotation.x = t > wt("orbi", "hear") ? Math.sin(t * 6) * 0.12 : 0.28;
  FPH.scr.material.color.set(fl >= 1 ? 0x3dff8c : 0x0b0d10);
  if (FILE.visible) { GIRL.updateMatrixWorld(true); FR.updateMatrixWorld(true); const a0 = GPH.getWorldPosition(V(0, 0, 0)), b0 = FPH.getWorldPosition(V(0, 0, 0)); FILE.position.copy(a0.lerp(b0, ease(fl))); FILE.position.y += Math.sin(fl * Math.PI) * 1.2; FILE.rotation.y = fl * 6; }
}

// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const o = (b) => (x, y, z) => V(b.x + x, b.y + y, b.z + z), ai = o(AIRP), mc = o(MP);
shot(0, 2.4, V(6, 4, 12), V(-1, 1.2, 0.5), 46, V(3.5, 2.6, 8), V(-1.1, 1.4, 1), 42);
shot(wt("hook", "voice") - 0.1, 2.0, V(-0.4, 1.75, 3.6), V(-1.15, 1.55, 1.2), 36, V(-0.6, 1.7, 3.0), V(-1.15, 1.55, 1.2), 34);
SH.push({ at: A("scene"), dur: 2.0, track: GPH, d0: 0.9, d1: 0.4, side: 0.2, lift: 0.2, fov: 38 });
shot(wt("scene", "to"), 1.6, V(-6, 2.2, 6), V(-1.2, 1.5, 1.2), 44, V(-5, 2.0, 5), V(-1.2, 1.5, 1.2), 42);
shot(wt("scene", "just") - 0.1, 2.6, ai(-2, 4.5, 12), ai(0, 4, 0), 48, ai(2, 4.2, 9), ai(1, 4, 0), 44);
shot(A("mic"), 1.6, mc(4, 8, 14), mc(0, 4, 0), 44, mc(3, 6.5, 11), mc(0, 3.8, 0), 42);
shot(wt("mic", "diaphragm") - 0.1, 1.8, mc(0.5, 3.6, 7), mc(0, 3.5, 0), 40, mc(0.3, 3.4, 6), mc(0, 3.5, 0), 38);
shot(wt("mic", "thinner") - 0.1, 2.4, mc(0, 4.2, 15), mc(0, 2.6, 2), 44, mc(0, 4, 13), mc(0, 2.6, 2), 44);
shot(A("volts"), 2.0, mc(0, 6, 9), mc(0, 4, 0), 44, mc(0, 8, 12), mc(0, 7, 0), 46);
shot(wt("volts", "wave") - 0.1, 3.0, mc(-4, 8.5, 16), mc(-3, 8, 0), 50, mc(4, 8.5, 16), mc(3, 8, 0), 50);
shot(A("samples"), 2.0, mc(0, 8.5, 22), mc(0, 8.5, 0), 50, mc(0, 9, 19), mc(0, 8.6, 0), 50);
shot(wt("samples", "number") - 0.2, 2.2, mc(-3, 9.6, 9), mc(-3, 9.5, 0), 44, mc(3, 9.6, 9), mc(3, 9.5, 0), 44);
shot(A("file"), 3.0, mc(0, 8.5, 18), mc(0, 8.2, 0), 46, mc(1, 8.5, 12), mc(0, 8.2, 0), 46);
shot(A("orbi"), 1.8, V(0.5, 3.4, 14), V(0.5, 1.3, 1.8), 50, V(0.5, 3.2, 12.5), V(0.5, 1.3, 1.8), 48);
shot(wt("orbi", "pops") - 0.2, 2.4, V(0.6, 3.0, 12.5), V(0.5, 1.6, 2), 50, V(0.7, 2.8, 11.5), V(0.6, 1.6, 2.1), 48);
shot(wt("orbi", "hear") - 0.2, 2.0, V(4.0, 1.9, 4.8), V(2.2, 1.55, 2.6), 40, V(3.6, 1.85, 4.3), V(2.2, 1.55, 2.6), 38);
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
  tag("tA", `slow motion · <b>air squeezing</b>`, t, wt("scene", "just"), A("mic") - 0.05);
  tag("tA", `diaphragm · <b>thinner than a hair</b>`, t, wt("mic", "thinner"), A("volts") - 0.05);
  tag("tA", `shake → <b>voltage</b>`, t, A("volts") + 0.2, A("samples") - 0.05);
  big("48,000×<br><small style='font-size:60px'>A SECOND</small>", t, wt("samples", "thousand") - 0.1, wt("samples", "number") - 0.1, "#3dff8c", 300, 120, 0);
  tag("tA", `each sample · <b>a number</b>`, t, wt("samples", "number"), A("file") - 0.05);
  tag("tA", `numbers → <b>squeezed</b> → a file`, t, wt("file", "squeeze"), A("orbi") - 0.05);
  tag("tA", `locked · <b>pops up nearby</b>`, t, wt("orbi", "pops"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camera(t); world(t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
