// Improved Film 05: how a lost AirTag finds its way home (a Bluetooth beacon with a changing code, strangers' iPhones
// relay a location locked with the tag's key, only the owner can open it), then Orbi: files on nearby screens, locked.
import { THREE, stage, lights, person, pose, tree, rock, house, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, cloud, textTex, xray, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const label = (txt, col = "#fff", w = 2.4, h = 0.6, font = "800 90px D", bg = null) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, map: textTex((g, cw, ch) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } g.fillStyle = col; g.font = font; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.74); }, 640, Math.round(640 * h / w)) }));
const phoneOn = (p) => { const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); sc.position.z = 0.007; g.add(sc); g.scr = sc; p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };

reseed(505);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0xa8cce8, fog: [0xc4dcef, 50, 260], bloom: 0.45, exposure: 1.05 });
const LT = lights(scene, { key: 0xfff2e0, keyI: 2.4, sky: 0xdfe8ff, ground: 0x5a5048, fillI: 1.15, rim: 0xa9c8ff, rimI: 0.7, at: V(12, 20, 10), area: 22 });
scene.add(sky(0x5a92d6, 0xcfe4f6, 0xe8eef4));

// ---------------------------------------------------------------- the train carriage (origin), the landscape rushing past
const CAR = new THREE.Group(); scene.add(CAR);
{ const fl = tinted(new THREE.PlaneGeometry(3.2, 18, 4, 18).rotateX(-Math.PI / 2), 0x5d6670, 0.05); CAR.add(fl);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 18, 18, 1, true, -Math.PI * 0.62, Math.PI * 1.24), new THREE.MeshStandardMaterial({ color: 0xeef0f2, side: THREE.BackSide, roughness: 0.7, flatShading: true })); shell.rotation.x = Math.PI / 2; shell.rotation.y = Math.PI; shell.position.y = 1.15; CAR.add(shell);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const w0 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), new THREE.MeshStandardMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.25, roughness: 0.05 })); w0.position.set(s * 1.58, 1.65, -7 + i * 2.8); w0.rotation.y = -s * Math.PI / 2; CAR.add(w0); }
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const seat = new THREE.Group(); seat.position.set(s * 0.95, 0, -7 + i * 2.8); CAR.add(seat); const sm = flat(i % 2 ? 0x2f6b8a : 0x2f5a7a); seat.add(P(mesh(bbox(1.0, 0.16, 0.55, 0.06), sm), V(0, 0.5, 0))); seat.add(P(mesh(bbox(1.0, 0.75, 0.14, 0.06), sm), V(0, 0.95, -0.3))); seat.add(P(mesh(bbox(1.0, 0.08, 0.06, 0.02), flat(0xd8b04a)), V(0, 1.35, -0.3))); }
  for (let i = 0; i < 7; i++) CAR.add(P(mesh(limb(0.03, 0.03, 2.3, 6), flat(0xc9ccd2, { metalness: 0.8, roughness: 0.3 })), V(0, 2.3, -8.4 + i * 2.8)));
  for (let i = 0; i < 6; i++) CAR.add(P(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 2.0), glow(0xffffff)), V(0, 2.95, -7 + i * 2.8))); }
const OUTSIDE = new THREE.Group(); scene.add(OUTSIDE);
const SCEN = []; for (let i = 0; i < 70; i++) { const s = rnd() < 0.5 ? -1 : 1; const t = i % 5 === 0 ? house(2.2, 1.8, 1.6, 0xe9d8b8, 0xb5603a) : tree(2.4 + rnd() * 1.6, i % 3 ? "round" : "pine"); t.userData = { s, d: 5 + rnd() * 30, z0: rnd() * 160 }; OUTSIDE.add(t); SCEN.push(t); }
const GROUND = tinted(facet(new THREE.PlaneGeometry(120, 200, 12, 20).rotateX(-Math.PI / 2), 0.4), 0x7fae58, 0.1); GROUND.position.y = -0.6; OUTSIDE.add(GROUND);
// the bag and the tag
const BAG = new THREE.Group(); BAG.position.set(-0.95, 0.58, 1.4); scene.add(BAG); const BB = new THREE.Group(); BAG.add(BB);
BB.add(P(mesh(facet(new THREE.IcosahedronGeometry(0.3, 1), 0.02), flat(0xd9573a)), V(0, 0.22, 0))); BB.children[0].scale.set(1.15, 1.2, 0.75);
BB.add(P(mesh(bbox(0.4, 0.22, 0.14, 0.05), flat(0xb5452c)), V(0, 0.12, 0.2))); for (const x of [-0.14, 0.14]) BB.add(P(mesh(new THREE.TorusGeometry(0.16, 0.025, 4, 10, Math.PI), flat(0x2a2a2a)), V(x, 0.42, -0.18)));
const BXR = xray(BB);
const TAG = new THREE.Group(); TAG.position.set(0, 0.25, 0); BAG.add(TAG); TAG.add(P(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 20), flat(0xf4f4f6, { roughness: 0.3 })), V(0, 0, 0))); TAG.add(P(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 20), flat(0xc9ccd2, { metalness: 0.9, roughness: 0.2 })), V(0, -0.012, 0))); TAG.rotation.x = Math.PI / 2;
const PINGS = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), glow(0x5aa8ff, { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, wireframe: true })); scene.add(m); return m; });
const CODE = label("a91f", "#5aa8ff", 1.0, 0.3, "800 120px M"); scene.add(CODE);
// the owner (walking off the train, then at home with the map)
const OWN = person({ sex: "m", top: 0x4fc3bd, bottom: 0x2b3a55, skin: 0xc98b62, hair: 0x111111, shortSleeve: true, glasses: true }); OWN.position.set(-0.95, 0, 0.3); scene.add(OWN);
const OPH = phoneOn(OWN); const OCV = document.createElement("canvas"); OCV.width = 432; OCV.height = 930; const OTX = new THREE.CanvasTexture(OCV); OTX.colorSpace = THREE.SRGBColorSpace; OPH.scr.material = new THREE.MeshBasicMaterial({ map: OTX, toneMapped: false });
function mapScreen(k) { const g = OCV.getContext("2d"), w = OCV.width, h = OCV.height; g.fillStyle = "#a9b8a0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 18; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 120 + i * 150); g.lineTo(w, 60 + i * 160); g.stroke(); } g.strokeStyle = "#e0452f"; g.lineWidth = 12; g.beginPath(); g.moveTo(40, 820); g.bezierCurveTo(140, 600, 300, 520, 390, 160); g.stroke();
  [[60, 780], [160, 610], [280, 470], [370, 220]].forEach(([x, y], i) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); g.strokeStyle = "#333"; g.lineWidth = 4; g.stroke(); });
  if (k > 0) { const s = 1 + Math.sin(k * 12) * 0.15; g.fillStyle = "rgba(61,140,255,0.25)"; g.beginPath(); g.arc(370, 220, 60 * s, 0, 7); g.fill(); g.fillStyle = "#3d8cff"; g.beginPath(); g.arc(370, 220, 26, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "800 30px D"; g.fillText("Bag", 300, 160); }
  g.fillStyle = "#fff"; g.fillRect(0, 0, w, 90); g.fillStyle = "#222"; g.font = "800 34px D"; g.fillText("Find", 30, 60); OTX.needsUpdate = true; }

// ---------------------------------------------------------------- the platform at the next stops: strangers with phones (x = 300)
const PF = V(300, 0, 0), PLAT = new THREE.Group(); PLAT.position.copy(PF); scene.add(PLAT);
{ const pl = tinted(new THREE.PlaneGeometry(14, 40, 7, 20).rotateX(-Math.PI / 2), 0xc9c4ba, 0.05); pl.position.y = 0.8; PLAT.add(pl); PLAT.add(P(mesh(bbox(14, 0.8, 40, 0.05), flat(0x9a948a)), V(0, 0.4, 0)));
  PLAT.add(P(mesh(new THREE.BoxGeometry(0.4, 0.02, 40), flat(0xffd04a)), V(-6.6, 0.82, 0)));
  const track = tinted(new THREE.PlaneGeometry(6, 200, 2, 40).rotateX(-Math.PI / 2), 0x6a5a4a, 0.08); track.position.set(-10, 0.01, 0); PLAT.add(track); for (const x of [-11, -9]) PLAT.add(P(mesh(new THREE.BoxGeometry(0.12, 0.15, 200), flat(0x9aa0a8, { metalness: 0.8 })), V(x, 0.1, 0)));
  for (let i = 0; i < 5; i++) { PLAT.add(P(mesh(limb(0.1, 0.1, 3.8, 6), flat(0x3a4a5a)), V(4.5, 4.6, -16 + i * 8))); } PLAT.add(P(mesh(bbox(6, 0.3, 40, 0.1), flat(0x3a4a5a)), V(3.5, 4.75, 0)));
  const sign = label("CENTRAL", "#ffffff", 3, 0.7, "900 120px D", "#1f4a8a"); sign.position.set(0, 3.4, -6); PLAT.add(sign); PLAT.add(P(mesh(limb(0.04, 0.04, 2.6, 5), flat(0x2a2a2a)), V(0, 3.0, -6.05)));
  const gr = tinted(facet(new THREE.PlaneGeometry(200, 200, 20, 20).rotateX(-Math.PI / 2), 0.4), 0x7fae58, 0.1); gr.position.set(0, -0.05, 0); PLAT.add(gr);
  for (let i = 0; i < 14; i++) { const b = house(4 + rnd() * 3, 4, 3 + rnd() * 6, [0xe9d8b8, 0xd8e4ef, 0xf2d6d0][i % 3], [0x6a7a8a, 0xb5603a][i % 2]); b.scale.y = 1.5 + rnd() * 2; b.position.set(12 + rnd() * 30, 0, -40 + i * 6); PLAT.add(b); } }
const STR = []; for (let i = 0; i < 10; i++) { const p = person({ sex: i % 2 ? "f" : "m", top: [0xf2f2f2, 0xe9c46a, 0x8ab6d6, 0xd96c4e, 0x6c9a5b, 0xb48ad6][i % 6], bottom: [0x1f2d6b, 0x3a3a3a, 0xc9b38a][i % 3], shortSleeve: i % 2 === 0, hat: i % 4 === 2 ? 0xe8d6a8 : undefined, glasses: i % 3 === 1, longHair: i % 4 === 1 });
  p.position.set(-4 + (i % 5) * 1.9 + rnd() * 0.5, 0.8, -6 + Math.floor(i / 5) * 4 + rnd()); p.userData = { ph: rnd(), dir: i % 2 ? 1 : -1 }; PLAT.add(p); p.phone = phoneOn(p); STR.push(p); }
const PBAG = BAG.clone(true); PBAG.position.set(-3, 0.85, -1); PLAT.add(PBAG); // the bag, now on a bench at the platform (the train left it here)
const PPINGS = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), glow(0x5aa8ff, { transparent: true, opacity: 0, wireframe: true, depthWrite: false })); PLAT.add(m); return m; });
const PKTS = STR.map((p, i) => { const g = new THREE.Group(); g.add(mesh(bbox(0.35, 0.35, 0.35, 0.05), flat(0xe9c46a))); g.add(P(mesh(bbox(0.16, 0.12, 0.05, 0.02), flat(0x3dff8c, { emissive: 0x0a5a2a, emissiveIntensity: 0.6 })), V(0, 0, 0.19))); g.i = i; PLAT.add(g); return g; });
const CLOUD = cloud(4, 0xffffff); CLOUD.position.set(2, 16, -8); PLAT.add(CLOUD); const QM = label("???", "#ff6a5a", 2.4, 1.0, "900 200px D"); QM.position.set(2, 19, -7); PLAT.add(QM);
const KEYM = label("🔑 only you", "#3dff8c", 2.6, 0.7, "800 110px D"); scene.add(KEYM);

// ---------------------------------------------------------------- the rail map from above (x = -300): three stops down
const MP = V(-300, 0, 0), MAP = new THREE.Group(); MAP.position.copy(MP); scene.add(MAP);
{ const gr = tinted(facet(new THREE.PlaneGeometry(160, 160, 24, 24).rotateX(-Math.PI / 2), 0.5), 0x8fbf6a, 0.1); MAP.add(gr);
  const curve = new THREE.CatmullRomCurve3([V(-40, 0.3, 30), V(-15, 0.3, 12), V(5, 0.3, 0), V(22, 0.3, -18), V(40, 0.3, -35)]); MAP.curve = curve;
  MAP.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.6, 6), flat(0x6a5a4a)));
  [0.08, 0.33, 0.58, 0.83].forEach((k, i) => { const p = curve.getPointAt(k); const st = mesh(bbox(4, 1.2, 2.5, 0.1), flat(0xc9c4ba)); st.position.copy(p).add(V(2.5, 0.6, 0)); MAP.add(st); const lb = label(["START", "STOP 1", "STOP 2", "STOP 3"][i], "#ffffff", 5, 1.2, "900 120px D", "#1f4a8a"); lb.position.copy(p).add(V(2.5, 3, 0)); lb.rotation.x = -0.6; MAP.add(lb); });
  for (let i = 0; i < 70; i++) { const t = rnd() < 0.3 ? house(3, 2.4, 2.6, [0xe9d8b8, 0xd8e4ef, 0xf2d6d0][i % 3], [0x6a7a8a, 0xb5603a][i % 2]) : tree(3 + rnd() * 2, i % 2 ? "round" : "pine"); t.position.set((rnd() - 0.5) * 120, 0, (rnd() - 0.5) * 120); if (Math.abs(t.position.x - t.position.z * -1.1) < 8) t.position.x += 20; MAP.add(t); } }
const MPIN = new THREE.Group(); MAP.add(MPIN); MPIN.add(P(new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 12), glow(0x3d8cff)), V(0, 2, 0))); MPIN.children[0].rotation.x = Math.PI; MPIN.add(P(new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 10), glow(0x3d8cff)), V(0, 3.6, 0)));
MPIN.position.copy(MAP.curve.getPointAt(0.83)).add(V(-2, 0, 0));
const MRING = new THREE.Mesh(new THREE.RingGeometry(2, 2.4, 40), glow(0x3d8cff, { transparent: true, side: THREE.DoubleSide })); MRING.rotation.x = -Math.PI / 2; MRING.position.copy(MPIN.position).add(V(0, 0.4, 0)); MAP.add(MRING);

// ---------------------------------------------------------------- Orbi: nearby screens light up with a locked file (back on the platform)
const OBF = STR.slice(0, 6).map((p) => { const l = new THREE.Group(); l.add(mesh(bbox(0.34, 0.42, 0.04, 0.04), flat(0xe9c46a))); const lk = mesh(bbox(0.18, 0.14, 0.06, 0.02), flat(0x3dff8c, { emissive: 0x0a5a2a, emissiveIntensity: 0.6 })); lk.position.z = 0.04; l.add(lk); p.add(l); l.position.set(0, 2.25, 0); return l; });

// ---------------------------------------------------------------- world at time t
const tmp = V(0, 0, 0);
function world(t) {
  // the train moves: the outside rushes past until the bag is left
  SCEN.forEach((s) => { const u = s.userData; const z = ((u.z0 - t * 22) % 160 + 160) % 160 - 80; s.position.set(u.s * (2.4 + u.d), -0.6, z); });
  const off = clamp((t - wt("scene", "leave") - 0.3) / 1.5); pose(OWN, { walk: t * 0.9, speed: off > 0 && off < 1 ? 0.5 : 0, phone: t > A("find") - 0.3 ? 1 : 0 });
  if (t < A("lock") - 0.2) { OWN.position.set(0.2, 0, lerp(1.6, -6, off)); OWN.rotation.y = Math.PI; OWN.visible = off < 1; if (off === 0) { OWN.rig.hips.position.y = 0.55; OWN.rig.lHip.rotation.x = OWN.rig.rHip.rotation.x = -1.45; OWN.rig.lKnee.rotation.x = OWN.rig.rKnee.rotation.x = 1.45; OWN.position.set(0.95, 0, 1.55); OWN.rotation.y = 0; } }
  else { OWN.visible = true; pose(OWN, { phone: 1 }); OWN.position.copy(MP).add(MAP.curve.getPointAt(0.08)).add(V(-3, -0.3, 3)); OWN.rotation.y = 0.6; } mapScreen(clamp((t - wt("find", "dot")) / 2));
  // the beacon: pings expand from the tag; the code changes
  BXR(clamp((t - A("beacon") + 0.2) / 0.6) * (t < A("relay") ? 1 : 0)); const bag = BAG.getWorldPosition(tmp).clone().add(V(0, 0.25, 0));
  PINGS.forEach((m, i) => { const k = ((t * 0.7 + i / PINGS.length) % 1); m.position.copy(bag); m.scale.setScalar(0.1 + k * 3); m.material.opacity = (1 - k) * 0.6 * (t > wt("scene", "whispering") && t < A("relay") ? 1 : 0); });
  CODE.visible = t > wt("beacon", "code") && t < A("relay"); CODE.position.copy(bag).add(V(0.3, 0.45, 0.3)); CODE.scale.setScalar(0.35); CODE.lookAt(cam.position); const ci = Math.floor((t - wt("beacon", "code")) / 0.7); CODE.material.map = CODES[((ci % 4) + 4) % 4];
  // the platform: strangers walk, the bag pings, each phone the ping reaches sends a locked packet up
  STR.forEach((p, i) => { const u = p.userData; pose(p, { walk: t * 0.9 + u.ph, speed: 0.45, phone: i % 2 ? 0.0 : 0.8 }); p.position.z += u.dir * 0.006; if (p.position.z > 10) p.position.z = -10; if (p.position.z < -10) p.position.z = 10; p.rotation.y = u.dir > 0 ? 0 : Math.PI; });
  const pb = PBAG.position.clone().add(V(0, 0.25, 0)); PPINGS.forEach((m, i) => { const k = ((t * 0.7 + i / 3) % 1); m.position.copy(pb); m.scale.setScalar(0.1 + k * 6); m.material.opacity = (1 - k) * 0.5 * (t >= A("relay") - 0.3 && t < A("find") ? 1 : 0); });
  PKTS.forEach((g, i) => { const p = STR[i], k = clamp((t - wt("relay", "adds") - i * 0.18) / 1.6); g.visible = k > 0 && t < A("find"); const a = p.position.clone().add(V(0, 1.6, 0)); g.position.copy(a.lerp(CLOUD.position.clone().add(V((i - 5) * 0.3, -1, 0)), ease(k))); g.rotation.y = t * 2 + i; g.scale.setScalar(k < 0.95 ? 1 : 1 - (k - 0.95) * 20);
    p.phone.scr.material.color.set(k > 0 && k < 0.4 ? 0x3dff8c : 0x0b0d10); });
  const q = win(t, wt("lock", "apple"), A("find"), 0.2, 0.2); QM.visible = q > 0; QM.scale.setScalar((back(clamp((t - wt("lock", "apple")) / 0.3)) || 0.001)); QM.lookAt(cam.position);
  KEYM.visible = t > A("lock") && t < wt("lock", "apple"); OWN.updateMatrixWorld(true); OPH.getWorldPosition(tmp); KEYM.position.copy(tmp).add(V(0, 0.35, 0.2)); KEYM.scale.setScalar(0.25); KEYM.lookAt(cam.position);
  // map: the pin drops, the ring pulses
  const pk = clamp((t - wt("find", "dot")) / 0.5); MPIN.position.y = lerp(12, 0.3, out(pk)); MRING.scale.setScalar(1 + ((t * 0.8) % 1) * 2); MRING.material.opacity = 1 - ((t * 0.8) % 1);
  // Orbi: files appear over nearby heads, locked
  OBF.forEach((l, i) => { const k = clamp((t - wt("orbi", "pop") - i * 0.12) / 0.4); l.visible = k > 0; l.scale.setScalar(back(k) || 0.001); l.rotation.y = t * 1.5 + i; });
}
const CODES = ["a91f", "7c2e", "e40b", "3d5a"].map((c) => textTex((g, w, h) => { g.fillStyle = "#5aa8ff"; g.font = "800 120px M"; g.textAlign = "center"; g.fillText(c, w / 2, h * 0.74); }, 640, 192));

// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const o = (b) => (x, y, z) => V(b.x + x, b.y + y, b.z + z), pf = o(PF), mp = o(MP);
// hook: the carriage, the bag on the seat
shot(0, 2.4, V(0.6, 2.0, 7.5), V(-0.5, 1.0, 0), 50, V(0.4, 1.7, 5.5), V(-0.7, 0.9, 0.6), 48);
shot(wt("hook", "no") - 0.1, 2.2, V(0.6, 1.5, 5.4), V(-0.5, 0.8, 1.4), 42, V(0.4, 1.4, 4.8), V(-0.6, 0.8, 1.4), 40);
// scene: he leaves, the bag stays; the whisper
shot(A("scene"), 2.0, V(0.2, 2.0, 7.5), V(0.2, 0.9, 0.5), 50, V(0.1, 1.9, 6.8), V(0.1, 0.9, 0), 48);
shot(wt("scene", "inside") - 0.1, 2.4, V(0.2, 1.5, 4.2), V(-0.95, 0.75, 1.4), 40, V(0.0, 1.4, 3.7), V(-0.95, 0.75, 1.4), 38);
// beacon: x-ray bag, rings, the changing code
shot(A("beacon"), 2.0, V(0.4, 1.7, 4.4), V(-0.95, 0.85, 1.4), 40, V(0.2, 1.6, 3.9), V(-0.95, 0.85, 1.4), 38);
shot(wt("beacon", "short") - 0.1, 2.0, V(1.2, 2.6, 4.8), V(-0.6, 1.0, 1.0), 50, V(1.0, 2.8, 5.4), V(-0.6, 1.0, 1.0), 52);
shot(wt("beacon", "code") - 0.1, 1.8, V(0.2, 1.6, 3.8), V(-0.75, 1.05, 1.4), 40, V(0.0, 1.5, 3.4), V(-0.75, 1.05, 1.4), 38);
// relay: the platform, packets rise
shot(A("relay"), 2.0, pf(6, 4, 14), pf(-1, 1.6, -2), 46, pf(4, 3.5, 12), pf(-1, 1.6, -2), 46);
shot(wt("relay", "adds") - 0.1, 2.2, pf(2, 2.4, 6), pf(-1, 2.2, -3), 46, pf(1.5, 2.8, 5), pf(-1, 3.0, -3), 46);
shot(wt("relay", "sends") - 0.2, 2.0, pf(6, 6, 24), pf(0, 7, -4), 50, pf(7, 7, 27), pf(0, 8.5, -5), 50);
// lock: only the owner's phone has the key; the cloud and the stranger see "???"
SH.push({ at: A("lock") - 0.05, dur: 1.8, track: OPH, d0: 1.2, d1: 0.6, side: 0.4, lift: 0.4, fov: 40 });
shot(wt("lock", "apple") - 0.1, 2.0, pf(10, 14, 22), pf(2, 18.2, -7), 48, pf(9, 15, 20), pf(2, 18.4, -7), 46);
shot(wt("lock", "stranger") - 0.1, 1.8, pf(3, 2.4, 3), pf(0, 2.0, -3), 44, pf(2.5, 2.3, 2.5), pf(0, 2.0, -3), 42);
// find: the map on his phone, then the 3D rail map from above
SH.push({ at: A("find") - 0.05, dur: 2.0, track: OPH, d0: 0.7, d1: 0.36, side: 0.1, lift: 0.2, fov: 38 });
shot(wt("find", "bag") - 0.2, 3.2, mp(0, 70, 40), mp(10, 0, -5), 46, mp(28, 30, -8), MPIN.position.clone().add(MP), 44);
// orbi: nearby screens with locked files
shot(A("orbi"), 2.2, pf(5, 5, 14), pf(-1, 2, -2), 48, pf(3, 4, 11), pf(-1, 2, -2), 46);
shot(wt("orbi", "pop") - 0.1, 2.4, pf(1, 3.4, 7), pf(-1, 2.6, -3), 46, pf(0, 3.6, 6), pf(-1, 2.8, -3), 44);
shot(wt("orbi", "only") - 0.1, 2.0, pf(-2, 2.6, 4), pf(-2.2, 2.9, -3), 40, pf(-2.2, 2.8, 3), pf(-2.2, 3.0, -3), 38);
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
  tag("tA", `no GPS · <i>no SIM</i>`, t, wt("hook", "no"), A("scene") - 0.05);
  big("I'M HERE", t, wt("scene", "i'm"), A("beacon") - 0.05, "#5aa8ff", 320, 130, 0);
  tag("tA", `Bluetooth ping · <b>code keeps changing</b>`, t, wt("beacon", "short"), A("relay") - 0.05);
  tag("tA", `strangers' phones · <b>add a location, locked</b>`, t, wt("relay", "adds"), A("lock") - 0.05);
  tag("tA", `only <b>your phone</b> can open it`, t, A("lock") + 0.1, wt("lock", "apple") - 0.05);
  tag("tA", `the cloud · <i>can't read it</i>`, t, wt("lock", "apple"), wt("lock", "stranger") - 0.05);
  tag("tA", `passers-by · <i>can't read it</i>`, t, wt("lock", "stranger"), A("find") - 0.05);
  big("3 STOPS DOWN", t, wt("find", "three") - 0.1, A("orbi") - 0.05, "#3d8cff", 300, 110);
  tag("tA", `nearby screens · <b>locked files</b>`, t, wt("orbi", "pop"), wt("orbi", "only") - 0.05);
  tag("tA", `the right code · <b>opens it</b>`, t, wt("orbi", "only"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camera(t); world(t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
