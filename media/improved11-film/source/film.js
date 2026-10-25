// Improved Film 11: how your phone knows which way is up (turn it sideways → x-ray: a chip smaller than a grain of rice
// → ×1000: a silicon block on springs, comb fingers → tilt: gravity drags the block, gaps change → charge → the screen turns),
// then the same weight counts steps and feels a shake. Pure general knowledge: no Orbi pitch, plain end card.
import { THREE, stage, lights, person, pose, tree, flat, glow, mesh, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, textTex, xray, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const phoneOn = (p) => { const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); sc.position.z = 0.007; g.add(sc); g.scr = sc; p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };

reseed(1111);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x141018, fog: [0x141018, 40, 200], bloom: 0.7, exposure: 1.1 });
lights(scene, { key: 0xffe2c0, keyI: 1.6, sky: 0x8a90b0, ground: 0x3a2a20, fillI: 1.2, rim: 0x8ab0ff, rimI: 0.6, at: V(6, 12, 8), area: 10 });

// ---------------------------------------------------------------- the living room at night (origin)
{ scene.add(tinted(new THREE.PlaneGeometry(10, 10, 10, 10).rotateX(-Math.PI / 2), 0x8a5a3a, 0.05));
  scene.add(P(mesh(bbox(10, 4, 0.2, 0.02), flat(0xd8c8b0)), V(0, 2, -3.4))); scene.add(P(mesh(bbox(0.2, 4, 8, 0.02), flat(0xcdbba2)), V(-4.2, 2, 0.4)));
  const win0 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), glow(0x1a2a5a)); win0.position.set(-1.8, 2.3, -3.28); scene.add(win0); scene.add(P(new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), glow(0xf0f4ff)), V(-1.4, 2.7, -3.27)));
  scene.add(P(mesh(bbox(2, 0.08, 0.1, 0.02), flat(0xf0e8dc)), V(-1.8, 1.56, -3.25)));
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24).rotateX(-Math.PI / 2), flat(0x6a3a5a)); rug.position.set(0, 0.01, -0.4); scene.add(rug);
  const sofa = new THREE.Group(); sofa.position.set(0.2, 0, -2.5); scene.add(sofa); const sc = flat(0x3f6a8a);
  sofa.add(P(mesh(bbox(3, 0.5, 1, 0.08), sc), V(0, 0.35, 0))); sofa.add(P(mesh(bbox(3, 0.9, 0.3, 0.08), sc), V(0, 0.8, -0.4))); sofa.add(P(mesh(bbox(0.3, 0.7, 1, 0.08), sc), V(-1.5, 0.45, 0))); sofa.add(P(mesh(bbox(0.3, 0.7, 1, 0.08), sc), V(1.5, 0.45, 0)));
  sofa.add(P(mesh(bbox(0.6, 0.4, 0.2, 0.08), flat(0xe9c46a)), V(-0.8, 0.75, -0.15)));
  const lamp = new THREE.Group(); lamp.position.set(2.3, 0, -2.6); scene.add(lamp); lamp.add(P(mesh(bbox(0.06, 1.7, 0.06, 0.02), flat(0x2a2a2a)), V(0, 0.85, 0)));
  lamp.add(P(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.4, 10, 1, true), glow(0xffd8a0, { side: THREE.DoubleSide })), V(0, 1.85, 0)));
  const lp = new THREE.PointLight(0xffc88a, 6, 9, 1.4); lp.position.set(2.3, 1.7, -2.4); scene.add(lp);
  const pl = tree(1.0, "round", 0x4f8a3c); pl.position.set(-3.3, 0, -2.6); scene.add(pl); }
const ME = person({ sex: "f", top: 0xf4a261, bottom: 0x2b3a55, skin: 0xc98b62, hair: 0x1a1210, longHair: true }); ME.position.set(0, 0, 0.4); scene.add(ME); const MPH = phoneOn(ME);

// ---------------------------------------------------------------- the hero phone (x = -300): a big studio phone with an x-ray inside
const HP = V(-300, 0, 0), HS = new THREE.Group(); HS.position.copy(HP); scene.add(HS);
{ HS.add(new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0a0812, side: THREE.BackSide, fog: false })));
  const k = new THREE.PointLight(0xffe0c0, 80, 60, 1.2); k.position.set(6, 12, 14); HS.add(k); const k2 = new THREE.PointLight(0x7aa0ff, 50, 60, 1.2); k2.position.set(-8, 4, 8); HS.add(k2);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 40).rotateX(-Math.PI / 2), flat(0x1a1622)); HS.add(floor); }
const HPG = new THREE.Group(); HPG.position.set(0, 5, 0); HS.add(HPG);
const SHELL = new THREE.Group(); HPG.add(SHELL); SHELL.add(mesh(bbox(3.6, 7.4, 0.4, 0.4), flat(0x2a2c33, { roughness: 0.3, metalness: 0.4 })));
const SCV = document.createElement("canvas"); SCV.width = 360; SCV.height = 740; const SCT = new THREE.CanvasTexture(SCV); SCT.colorSpace = THREE.SRGBColorSpace;
const SCR = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 6.9), new THREE.MeshBasicMaterial({ map: SCT, toneMapped: false })); SCR.position.z = 0.205; SHELL.add(SCR);
const XR = xray(SHELL);
const INT = new THREE.Group(); HPG.add(INT);
INT.add(P(mesh(bbox(3.1, 3.5, 0.06, 0.02), flat(0x1f6a3a)), V(0, 1.6, -0.02)));
INT.add(P(mesh(bbox(3.1, 3.3, 0.16, 0.04), flat(0x3a4a6a)), V(0, -1.95, 0)));
INT.add(P(mesh(bbox(0.9, 0.9, 0.12, 0.03), flat(0x15161a)), V(0.35, 1.9, 0.06)));
for (let i = 0; i < 14; i++) INT.add(P(mesh(bbox(0.2 + rnd() * 0.3, 0.12 + rnd() * 0.2, 0.06, 0.01), flat([0x2a2a2e, 0xb08a3a, 0x8a8f96][i % 3])), V(-1.2 + rnd() * 2.4, 0.3 + rnd() * 2.9, 0.04)));
INT.add(P(new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), flat(0x111111)), V(-1.0, 2.95, -0.06)));
const CHIP = P(mesh(bbox(0.14, 0.14, 0.05, 0.01), flat(0x1a1a1e)), V(-0.75, 1.4, 0.06)); INT.add(CHIP);
const CHIPG = P(new THREE.Mesh(new THREE.RingGeometry(0.11, 0.14, 24), glow(0x3dff8c, { transparent: true })), V(-0.75, 1.4, 0.1)); INT.add(CHIPG);
const RICE = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), flat(0xf4eedc, { roughness: 0.5 })); RICE.scale.set(2.3, 1, 0.9); RICE.position.set(-0.35, 1.4, 0.1); INT.add(RICE);
const CPUL = textTex((g, cw, ch) => { g.fillStyle = "#9aa"; g.font = "700 60px M"; g.textAlign = "center"; g.fillText("CPU", cw / 2, ch * 0.66); }, 256, 128);
INT.add(P(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: CPUL, transparent: true, toneMapped: false })), V(0.35, 1.9, 0.13)));
// gravity arrow (world down), shown beside the phone and over the chip
const arrow = (col) => { const g = new THREE.Group(); g.add(P(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 10), glow(col)), V(0, 0.8, 0))); g.add(P(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 12).rotateX(Math.PI), glow(col)), V(0, -0.3, 0))); return g; };
const GA1 = arrow(0xff5a4a); GA1.position.set(0, 0.9, 1.2); HS.add(GA1);

// ---------------------------------------------------------------- the motion chip ×1000 (x = 300): a silicon block on springs + comb fingers
const MP = V(300, 0, 0), MS = new THREE.Group(); MS.position.copy(MP); scene.add(MS);
{ MS.add(new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), new THREE.MeshBasicMaterial({ color: 0x050812, side: THREE.BackSide, fog: false })));
  const k = new THREE.PointLight(0xc0d8ff, 90, 60, 1.2); k.position.set(5, 12, 10); MS.add(k); const k2 = new THREE.PointLight(0xff9a6a, 40, 50, 1.2); k2.position.set(-10, 6, -4); MS.add(k2); }
const MEMS = new THREE.Group(); MS.add(MEMS);
MEMS.add(P(tinted(new THREE.BoxGeometry(17, 0.3, 10.5, 17, 1, 10), 0x24304a, 0.05), V(0, -0.55, 0)));
for (const sx of [-1, 1]) MEMS.add(P(mesh(bbox(1, 1, 1.4, 0.04), flat(0x6a7488)), V(sx * 7.2, 0, 0)));
for (const sz of [-1, 1]) MEMS.add(P(mesh(bbox(14, 0.5, 0.4, 0.04), flat(0x3a6ad0)), V(0, 0, sz * 4.0)));
const MASS = new THREE.Group(); MEMS.add(MASS); const SIL = flat(0xb8c2d2, { roughness: 0.35, metalness: 0.35 });
MASS.add(mesh(bbox(6, 0.5, 2.4, 0.04), SIL));
for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) MASS.add(P(new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24).rotateX(-Math.PI / 2), flat(0x2a3040)), V(-2.5 + i * 0.555, 0.256, -0.6 + j * 0.6)));
const XM = Array.from({ length: 7 }, (_, i) => -2.7 + i * 0.9);
for (const x of XM) for (const sz of [-1, 1]) MASS.add(P(mesh(bbox(0.18, 0.4, 2.5, 0.02), SIL), V(x, 0, sz * 2.45)));
for (let j = 0; j < 8; j++) for (const sz of [-1, 1]) MEMS.add(P(mesh(bbox(0.18, 0.4, 2.3, 0.02), flat(0x3a6ad0)), V(-3.15 + j * 0.9, 0, sz * 2.75)));
// springs: a zigzag of unit length along +x, stretched between anchor and block
const zz = []; for (let i = 0; i <= 12; i++) zz.push(V(i / 12, 0, i === 0 || i === 12 ? 0 : (i % 2 ? 0.55 : -0.55)));
const SPG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zz, false, "catmullrom", 0.05), 120, 0.05, 6);
const SPR = [-1, 1].map((sx) => { const m = new THREE.Mesh(SPG, flat(0xd8e0ea, { roughness: 0.3, metalness: 0.4 })); m.sx = sx; MEMS.add(m); return m; });
// time-stack ghosts of the block, charge sparks + glowing strips in the gaps
const GH = [0.33, 0.66].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 2.4), glow(0x9ad0ff, { transparent: true, opacity: 0.2, depthWrite: false })); MEMS.add(m); return m; });
const GAPS = []; for (const x of XM) for (const sz of [-1, 1]) for (const side of [-1, 1]) { const strip = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.1).rotateX(-Math.PI / 2), glow(0xffd04a, { transparent: true, depthWrite: false })); MEMS.add(strip);
  const sp = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), glow(0xfff0a0)); m.ph = rnd(); MEMS.add(m); return m; }); GAPS.push({ x, sz, side, strip, sp }); }
const GA2 = arrow(0xff5a4a); GA2.scale.setScalar(1.6); GA2.position.set(0, 5.4, 0); MS.add(GA2);
// the scope: what the chip reads, hundreds of times a second
const SCO = document.createElement("canvas"); SCO.width = 768; SCO.height = 320; const SCOT = new THREE.CanvasTexture(SCO); SCOT.colorSpace = THREE.SRGBColorSpace;
const SCOPE = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3), new THREE.MeshBasicMaterial({ map: SCOT, toneMapped: false, transparent: true })); SCOPE.position.set(0, 4.2, -5.2); MS.add(SCOPE);

// ---------------------------------------------------------------- time functions (pure, so the scope can look back)
const E = (t, a, d) => ease(clamp((t - a) / d));
const phoneRot = (t) => -Math.PI / 2 * (E(t, wt("scene", "sideways") - 0.1, 0.8) - E(t, A("xray"), 0.9) + E(t, A("rotate") + 0.1, 1.0));
const snap = (t) => E(t, wt("scene", "spins"), 0.35) - E(t, A("xray") + 0.9, 0.35) + E(t, wt("rotate", "turns"), 0.35);
const tilt = (t) => 0.45 * E(t, wt("tilt", "tilt"), 1.0) * (1 - E(t, A("rotate") - 0.4, 0.4)) + 0.3 * Math.sin((t - A("measure")) * 2 * Math.PI * 0.7) * clamp((t - A("measure")) / 0.6) * (1 - E(t, A("rotate") - 0.4, 0.4));
const off = (t) => { const s = clamp(-0.18 * Math.sin(tilt(t)) / Math.sin(0.45), -0.19, 0.19); const k = t - wt("tilt", "drags"); return s + (k > 0 ? 0.04 * Math.exp(-k * 2.2) * Math.sin(k * 14) : 0); };

// ---------------------------------------------------------------- screen: a sunset surf video that turns with the phone
const VID = document.createElement("canvas"); VID.width = 640; VID.height = 360;
function screen(t) {
  const v = VID.getContext("2d"), sk = v.createLinearGradient(0, 0, 0, 220); sk.addColorStop(0, "#3a2a6a"); sk.addColorStop(0.6, "#ff7a4a"); sk.addColorStop(1, "#ffd08a"); v.fillStyle = sk; v.fillRect(0, 0, 640, 360);
  v.fillStyle = "#fff2c0"; v.beginPath(); v.arc(420, 200, 46, 0, 7); v.fill(); v.fillStyle = "#1e4a7a"; v.fillRect(0, 210, 640, 150);
  for (let i = 0; i < 7; i++) { v.strokeStyle = `rgba(255,220,180,${0.5 - i * 0.05})`; v.lineWidth = 3; v.beginPath(); for (let x = 0; x <= 640; x += 16) v.lineTo(x, 226 + i * 20 + Math.sin(x / 40 + t * 3 + i) * 4); v.stroke(); }
  const sx = 120 + ((t * 60) % 420), sy = 240 + Math.sin(t * 2) * 8; v.fillStyle = "#111"; v.beginPath(); v.moveTo(sx - 40, sy + 14); v.lineTo(sx + 40, sy + 10); v.lineTo(sx + 30, sy + 18); v.closePath(); v.fill(); v.fillRect(sx - 4, sy - 34, 10, 40); v.beginPath(); v.arc(sx + 1, sy - 42, 9, 0, 7); v.fill();
  const g = SCV.getContext("2d"), s = snap(t); g.fillStyle = "#08090c"; g.fillRect(0, 0, 360, 740);
  g.save(); g.translate(180, 370); g.rotate(-s * Math.PI / 2); const k = lerp(0.5625, 1.16, s); g.scale(k, k); g.drawImage(VID, -320, -180); g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(-300, 160, 600 * ((t / 40) % 1), 6); g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(-300 + 600 * ((t / 40) % 1), 160, 600 * (1 - (t / 40) % 1), 6); g.restore();
  if (s < 0.5) { g.fillStyle = "#e8e8ee"; g.font = "700 26px D"; g.fillText("Sunset session 🌊", 22, 610); g.fillStyle = "#8a8a96"; g.font = "500 20px D"; g.fillText("2.4M views", 22, 642); }
  SCT.needsUpdate = true;
}
function scope(t) {
  const g = SCO.getContext("2d"); g.fillStyle = "rgba(6,12,10,0.92)"; g.fillRect(0, 0, 768, 320); g.strokeStyle = "rgba(61,255,140,0.18)"; g.lineWidth = 1; for (let x = 0; x < 768; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 320); g.stroke(); } for (let y = 0; y < 320; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(768, y); g.stroke(); }
  g.strokeStyle = "#3dff8c"; g.lineWidth = 4; g.beginPath(); const n = 120; for (let i = 0; i <= n; i++) { const tau = t - 3 + (i / n) * 3, y = 160 - off(tau) * 700; i ? g.lineTo((i / n) * 768, y) : g.moveTo(0, y); } g.stroke();
  g.fillStyle = "#fff"; for (let i = 0; i <= 60; i++) { const tau = t - 3 + (i / 60) * 3; g.fillRect((i / 60) * 768 - 3, 160 - off(tau) * 700 - 3, 6, 6); }
  g.fillStyle = "#3dff8c"; g.font = "700 30px M"; g.fillText("CHARGE  ·  LIVE", 20, 40); SCOT.needsUpdate = true;
}

// ---------------------------------------------------------------- world
function world(t) {
  // room: she holds the phone up, turns it sideways; later walks, then shakes it
  const walking = t >= A("steps") && t < wt("steps", "shake") - 0.1, wk = clamp((t - A("steps")) / (wt("steps", "shake") - 0.1 - A("steps")));
  if (t >= A("steps")) { ME.position.set(lerp(-1.6, 1.0, wk), 0, 0.6); ME.rotation.y = lerp(Math.PI / 2, 0.3, E(t, wt("steps", "shake") - 0.3, 0.4)); } else { ME.position.set(0, 0, 0.4); ME.rotation.y = 0; }
  pose(ME, { phone: 1, walk: walking ? (t - A("steps")) * 1.7 : 0, speed: walking ? 1 : 0 }); ME.rig.rArm.rotation.x -= 0.5; ME.rig.rElbow.rotation.x = -0.7;
  const shake = t > wt("steps", "shake") && t < A("end") ? Math.sin(t * 38) * 0.3 * clamp((A("end") - t) / 0.3) : 0; ME.rig.rElbow.rotation.z = shake;
  MPH.rotation.z = Math.PI + phoneRot(t) * (t < A("xray") ? 1 : 0); MPH.scr.material.color.set(0xff9a6a);
  // hero phone
  HPG.rotation.z = phoneRot(t); HPG.rotation.y = Math.sin(t * 0.6) * 0.08; screen(t);
  const xk = E(t, A("xray") + 0.6, 0.9) * (1 - E(t, A("zoom") + 0.3, 0.3)); XR(xk); INT.visible = xk > 0.05;
  const hl = clamp((t - wt("xray", "chip") + 0.2) / 0.3); CHIPG.material.opacity = hl * (0.6 + 0.4 * Math.sin(t * 8)); CHIPG.scale.setScalar(1 + 0.2 * Math.sin(t * 8)); RICE.visible = t > wt("xray", "smaller") - 0.1;
  GA1.visible = t > A("rotate") && t < A("steps"); GA1.position.y = 0.9 + Math.sin(t * 4) * 0.08; GA1.scale.setScalar(back(clamp((t - A("rotate")) / 0.4)) || 0.001);
  // chip ×1000
  MEMS.rotation.z = tilt(t); const o = off(t); MASS.position.x = o;
  SPR.forEach((m) => { const a = m.sx * 6.7, b = m.sx * 3 + o; m.position.set(Math.min(a, b), 0, 0); m.scale.x = Math.abs(b - a); });
  const gk = clamp((t - wt("tilt", "drags")) / 0.3) * (1 - clamp((t - A("measure")) / 0.3)); GH.forEach((m, i) => { m.visible = gk > 0.02; m.position.x = o * [0.33, 0.66][i]; m.material.opacity = 0.22 * gk; });
  const gapsOn = t > wt("tilt", "gaps") - 0.1, chg = t > A("measure") - 0.2;
  for (const G of GAPS) { const gap = 0.27 - G.side * o, cx = G.x + o + G.side * (0.09 + gap / 2); G.strip.visible = gapsOn; G.strip.position.set(cx, 0.21, G.sz * 2.5); G.strip.scale.x = gap; G.strip.material.opacity = clamp(0.05 / gap) * 0.9;
    const n = Math.round(clamp(0.075 / gap) * 6); G.sp.forEach((m, i) => { m.visible = chg && i < n; if (m.visible) m.position.set(cx + Math.sin(t * 9 + i * 2.1 + m.ph * 6) * gap * 0.3, 0.26 + Math.abs(Math.sin(t * 5 + i)) * 0.15, G.sz * (1.6 + ((i / 6 + m.ph * 0.2 + t * 0.4) % 1) * 1.8)); }); }
  GA2.visible = t > wt("tilt", "gravity") - 0.1 && t < A("rotate"); GA2.position.y = 5.4 + Math.sin(t * 4) * 0.1;
  SCOPE.visible = t > A("measure") - 0.1 && t < A("rotate"); if (SCOPE.visible) scope(t);
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const hp = (x, y, z) => V(HP.x + x, HP.y + y, HP.z + z), mp = (x, y, z) => V(MP.x + x, MP.y + y, MP.z + z);
shot(0, 2.4, hp(-5, 7, 13), hp(0, 5, 0), 48, hp(-1.5, 5.6, 12), hp(0, 5, 0), 46);
shot(A("scene") - 0.1, 2.4, V(1.2, 1.6, 4.2), V(0, 1.2, 0), 46, V(0.7, 1.55, 3.4), V(0, 1.25, 0), 44);
shot(wt("scene", "video") + 0.1, 2.6, hp(3, 6, 17), hp(0, 5, 0), 48, hp(0, 5, 15), hp(0, 5, 0), 50);
shot(wt("scene", "nobody") - 0.1, 2.0, hp(0, 5.2, 11), hp(0, 5, 0), 50, hp(0.6, 5.1, 10), hp(0, 5, 0), 48);
shot(A("xray"), 2.0, hp(5, 7, 13), hp(0, 5, 0), 50, hp(2, 6, 11), hp(0, 5.4, 0), 48);
shot(wt("xray", "chip") - 0.2, 2.6, hp(-0.3, 6.6, 3.2), hp(-0.6, 6.4, 0.1), 40, hp(-0.5, 6.45, 1.5), hp(-0.55, 6.4, 0.1), 36);
shot(A("zoom"), 2.2, mp(0, 30, 10), mp(0, 0, 0), 50, mp(0, 11, 10), mp(0, 0, 0), 50);
shot(wt("zoom", "springs") - 0.2, 2.2, mp(-4, 2.6, 5), mp(-5, 0, 0), 46, mp(-5.5, 2.2, 4), mp(-5, 0, 0), 44);
shot(A("combs"), 2.2, mp(-1.5, 3.2, 7.5), mp(-0.5, 0, 2.4), 46, mp(1, 2.6, 6.2), mp(0, 0, 2.4), 44);
shot(wt("combs", "two") - 0.1, 2.0, mp(0, 9, 4), mp(0, 0, 2.4), 46, mp(0, 8, 3.4), mp(0, 0, 2.4), 44);
shot(A("tilt"), 2.4, mp(0, 16, 22), mp(0, 1, 0), 46, mp(0, 13, 19), mp(0, 1, 0), 46);
shot(wt("tilt", "gaps") - 0.1, 2.2, mp(0, 6.5, 5), mp(0, 0, 2.4), 40, mp(0.4, 6, 4.4), mp(0, 0, 2.4), 38);
shot(A("measure"), 2.2, mp(1.6, 3.6, 7), mp(0, 0, 2.4), 42, mp(1, 2.8, 5.4), mp(0, 0, 2.4), 40);
shot(wt("measure", "hundreds") - 0.1, 2.4, mp(0, 6, 9), mp(0, 3.4, -5), 44, mp(0, 5.4, 7), mp(0, 3.6, -5), 42);
shot(A("rotate"), 2.6, hp(-4, 6, 17), hp(0, 4, 0), 50, hp(0, 4.5, 15), hp(0, 4, 0), 50);
shot(A("steps"), 2.6, V(0, 1.9, 6.5), V(0, 1.1, 0), 50, V(-0.4, 1.8, 5.6), V(-0.2, 1.1, 0), 50);
shot(wt("steps", "shake") - 0.2, 2.2, V(1.6, 1.6, 3.4), V(0.9, 1.3, 0.6), 44, V(1.4, 1.55, 2.8), V(0.95, 1.35, 0.6), 42);
shot(A("end") - 0.05, 2.0, V(0, 2.2, 6), V(0, 1.2, 0), 50, V(0, 2.5, 7), V(0, 1.2, 0), 50);
const camAt = camRig(cam);
// ---------------------------------------------------------------- overlays
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
const big = (txt, t, a0, b0, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a0 || t > b0) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a0) / 0.12) * clamp((b0 - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a0) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  tag("tA", `turned sideways · <b>screen follows</b>`, t, wt("scene", "spins"), A("xray") - 0.05);
  tag("tA", `x-ray · <b>motion chip</b>`, t, A("xray") + 0.6, wt("xray", "chip") - 0.25);
  tag("tA", `motion chip <i>&lt;</i> <b>grain of rice</b>`, t, wt("xray", "smaller"), A("zoom") - 0.05);
  big("×1000", t, A("zoom"), A("zoom") + 1.1, "#3dff8c", 320, 170);
  tag("tA", `silicon block · <b>on springs</b>`, t, wt("zoom", "springs"), A("combs") - 0.05);
  tag("tA", `<b>moving</b> fingers · <i>fixed</i> fingers`, t, A("combs") + 0.2, A("tilt") - 0.05);
  tag("tA", `tilt · <b>gravity drags the block</b>`, t, wt("tilt", "gravity"), wt("tilt", "gaps") - 0.1);
  tag("tA", `frozen · <b>3 moments</b> of the slide`, t, wt("tilt", "gaps"), A("measure") - 0.05);
  tag("tA", `smaller gap → <b>more charge</b>`, t, A("measure") + 0.1, wt("measure", "hundreds") - 0.15);
  tag("tA", `read <b>hundreds of times</b> a second`, t, wt("measure", "hundreds"), A("rotate") - 0.05);
  tag("tA", `down found → <b>screen turns</b>`, t, wt("rotate", "down"), A("steps") - 0.05);
  const st = 4812 + Math.floor(Math.max(0, Math.min(t, wt("steps", "shake")) - A("steps")) * 3.4);
  tag("tA", `steps · <b>${st.toLocaleString("en-US")}</b>`, t, wt("steps", "steps"), wt("steps", "shake") - 0.05);
  tag("tA", `shake · <b>felt</b>`, t, wt("steps", "shake"), A("end") - 0.05);
  if (t > A("zoom") - 0.05 && t < A("zoom") + 0.3) S($("flash"), { opacity: 1 - clamp((t - A("zoom") + 0.05) / 0.35) });
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") + L.end.dur - 0.6 ? 0 : 1 });
  const e = clamp((t - A("end") - L.end.dur + 0.5) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camAt(SH, t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
