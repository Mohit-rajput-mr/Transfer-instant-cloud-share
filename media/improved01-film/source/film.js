// Improved Film 01: one photo reaches forty strangers on an island, with no names and no numbers.
// Sets: the island party (sunset → night), the x-ray phone (lock + pieces), the vault (cutaway), the area map (zoom out).
import { THREE, stage, lights, person, pose, tree, rock, house, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, cloud, sea, extra, campfire, bulbs, textTex, xray, cutaway, rack, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at, E = (k) => L[k].at + L[k].dur; window.DURATION = LINES.duration;
/** when word number i of a line is spoken (the subtitle timing) */
const wt = (k, word) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = typeof word === "number" ? word : ws.findIndex((w) => nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };

reseed(21);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0xf2a46a, fog: [0xf3b48e, 70, 320], bloom: 0.42, exposure: 1.05 });
const SUN = V(14, 7, -20);
const LT = lights(scene, { key: 0xffc896, keyI: 2.5, sky: 0xffdcc4, ground: 0x6a4a3a, fillI: 1.05, rim: 0xa9b8ff, rimI: 0.7, at: SUN, area: 22 });
const SKY = sky(0x34488f, 0xf59660, 0xf9c99a); SKY.u.sun.value.copy(SUN).normalize(); SKY.u.sunSize.value = 0.035; scene.add(SKY);
const fog = scene.fog;

// ---------------------------------------------------------------- the island
const ISL = new THREE.Group(); scene.add(ISL);
{ const sand = tinted(facet(new THREE.CylinderGeometry(24, 28, 1.4, 30, 2), 0.3), 0xf0d29a, 0.08); sand.position.y = -0.7; ISL.add(sand);
  const hill = tinted(facet(new THREE.CylinderGeometry(7, 11, 1.6, 12, 2), 0.45), 0x7fbf4f, 0.1); hill.position.set(-11, -0.2, -12); ISL.add(hill);
  const hill2 = tinted(facet(new THREE.CylinderGeometry(4, 7, 1.0, 10, 1), 0.35), 0x8cc95a, 0.1); hill2.position.set(12, -0.3, -14); ISL.add(hill2);
  const hut = house(3.2, 2.8, 2.1, 0xe9d8b8, 0xb5603a); hut.position.set(-11, 0.6, -12.5); hut.rotation.y = 0.5; ISL.add(hut);
  const palms = [[-15, -4], [-17, 3], [-13, 9], [15, -6], [17, 2], [14, 9], [-6, -16], [5, -17], [-19, -9], [19, -11], [9, 15], [-9, 16], [-3, -19]];
  palms.forEach(([x, z], i) => { const t = tree(3.2 + (i % 3) * 0.5, "palm"); t.position.set(x, x < -8 && z < -6 ? 0.5 : 0, z); t.rotation.y = i * 1.3; ISL.add(t); });
  [[-12, -9, "round"], [-8, -14, "pine"], [-13, -15, "round"], [11, -15, "round"], [13, -12, "pine"]].forEach(([x, z, k]) => { const t = tree(2.8, k); t.position.set(x, 0.5, z); ISL.add(t); });
  for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, rr = 22 + rnd() * 4; const k = rock(0.4 + rnd() * 0.7, 0x8f8a84); k.position.set(Math.cos(a) * rr, -0.1, Math.sin(a) * rr); k.rotation.y = rnd() * 6; ISL.add(k); }
  for (let i = 0; i < 40; i++) { const a = rnd() * Math.PI * 2, rr = 4 + rnd() * 17; const tuft = mesh(facet(new THREE.ConeGeometry(0.12, 0.35, 4), 0.03), flat(0x9bbf5a)); tuft.position.set(Math.cos(a) * rr, 0.12, Math.sin(a) * rr); ISL.add(tuft); }
  // string lights on poles around the party
  const poles = [V(-7.5, 0, -6), V(0, 0, -10), V(7.5, 0, -6), V(8.5, 0, 3), V(-8.5, 0, 3)];
  poles.forEach((p) => { const pl = mesh(limb(0.06, 0.05, 3.2, 6), flat(0x5a4030)); pl.position.set(p.x, 3.2, p.z); ISL.add(pl); });
  for (let i = 0; i < poles.length - 1; i++) ISL.add(bulbs(poles[i].clone().setY(3.1), poles[i + 1].clone().setY(3.1), 12, 0.6));
  // a little boat on the shore and a surfboard: life
  const boat = tinted(facet(new THREE.CylinderGeometry(0.9, 0.5, 4, 8, 1), 0.05), 0xd9573a, 0.06); boat.rotation.set(Math.PI / 2, 0, 0.3); boat.scale.set(1, 1, 0.45); boat.position.set(17, 0.0, 14); ISL.add(boat);
  const board = mesh(bbox(0.55, 2.2, 0.08, 0.2), flat(0x4fc3bd)); board.position.set(-14.5, 1.0, 5.5); board.rotation.set(0.25, 0, 0.3); ISL.add(board);
}
const FIRE = campfire(); FIRE.position.set(0, 0, -2); scene.add(FIRE);
const SEA = sea(170, 80, 0x2f86b8, 0.16); SEA.position.y = -0.35; scene.add(SEA);
const FARSEA = mesh(new THREE.PlaneGeometry(6000, 6000), flat(0x2a7aab, { roughness: 0.35 }), { cast: false }); FARSEA.rotation.x = -Math.PI / 2; FARSEA.position.y = -0.45; scene.add(FARSEA);
for (let i = 0; i < 14; i++) { const c = cloud(5 + rnd() * 5, 0xffe8dc); const a = -Math.PI * 0.85 + rnd() * Math.PI * 0.7; c.position.set(Math.sin(a) * (180 + rnd() * 160), 35 + rnd() * 50, -Math.cos(a) * (180 + rnd() * 160)); scene.add(c); }
const FAR = []; for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, d = 120 + rnd() * 900; const s = 6 + rnd() * 22; const isl = tinted(facet(new THREE.CylinderGeometry(s * 0.7, s, 2 + rnd() * 3, 9, 1), s * 0.15), i % 3 ? 0x7fae58 : 0xe6c98e, 0.1); isl.position.set(Math.cos(a) * d, -0.6, Math.sin(a) * d); scene.add(isl); FAR.push(isl); }
// the mainland coast far to the north (it lights up as a neighbour cell)
{ const coast = tinted(facet(new THREE.BoxGeometry(2600, 6, 700, 30, 1, 8), 30), 0x7fae58, 0.1); coast.position.set(0, -2.5, -1250); scene.add(coast); }

// ---------------------------------------------------------------- people
const phoneOf = (p, screenCol = 0x0b0d10) => { // a small phone in the right hand, with a screen that can glow
  const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24, { roughness: 0.35, metalness: 0.3 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: screenCol, toneMapped: false })); scr.position.z = 0.007; g.add(scr); g.scr = scr;
  p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };
const LENA = person({ sex: "f", top: 0x4fc3bd, bottom: 0x2b3a55, skin: 0xe0a982, hair: 0x2a1d16, longHair: true, shortSleeve: true });
LENA.position.set(0.4, 0, 8.6); LENA.rotation.y = Math.PI + 0.05; scene.add(LENA);
const SAM = person({ sex: "m", top: 0xf08a5d, bottom: 0x3a4a6a, skin: 0xc98b62, hair: 0x111111, shortSleeve: true, glasses: true });
SAM.position.set(-2.6, 0, 2.2); SAM.rotation.y = 0.25; scene.add(SAM);
const CROWD = [];
for (let i = 0; i < 36; i++) {
  let x, z, ok, tries = 0; do { const a = rnd() * Math.PI * 2, rr = 2.4 + Math.sqrt(rnd()) * 6.5; x = Math.cos(a) * rr; z = -2 + Math.sin(a) * rr * 0.9; ok = Math.hypot(x + 2.6, z - 2.2) > 1.1 && z < 6.5 && CROWD.every((c) => Math.hypot(c.position.x - x, c.position.z - z) > 0.85); } while (!ok && ++tries < 60);
  const p = extra(i + 3); p.position.set(x, 0, z); p.userData = { ph: rnd(), face: Math.atan2(0 - x, -2 - z) + (rnd() - 0.5) * 0.6, amp: 0.15 + rnd() * 0.25 }; scene.add(p); CROWD.push(p);
}
const ALL = [SAM, ...CROWD];
const PINGM = glow(0x3dff8c); ALL.forEach((p) => { const pg = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), PINGM); pg.scale.y = 1.4; p.add(pg); pg.position.y = 2.15; p.ping = pg; });
ALL.forEach((p) => (p.phone = phoneOf(p)));
const LPH = phoneOf(LENA);

// ---------------------------------------------------------------- phone screens (Lena's and Sam's, drawn in 2D)
const PHOTO = document.createElement("canvas"); PHOTO.width = 540; PHOTO.height = 720;
const mkScreen = (ph) => { const cv = document.createElement("canvas"); cv.width = 432; cv.height = 930; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; ph.scr.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); return { cv, g: cv.getContext("2d"), tex }; };
const LS = mkScreen(LPH), SS = mkScreen(SAM.phone);
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function lock(g, x, y, s, col = "#3dff8c") { g.strokeStyle = col; g.lineWidth = s * 0.14; g.beginPath(); g.arc(x, y - s * 0.15, s * 0.3, Math.PI, 0); g.stroke(); g.fillStyle = col; rr(g, x - s * 0.45, y - s * 0.15, s * 0.9, s * 0.7, s * 0.1); g.fill(); }
function ui(S0, st, k = 0, k2 = 0) {
  const { g, cv, tex } = S0, w = cv.width, h = cv.height; g.fillStyle = "#0b0d10"; g.fillRect(0, 0, w, h);
  const head = (title) => { g.fillStyle = "#3dff8c"; g.font = "800 44px D"; g.fillText("orbi", 32, 92); g.fillStyle = "#9aa"; g.font = "600 24px M"; g.fillText(title, w - 32 - g.measureText(title).width, 88); };
  if (st === "cam") { g.drawImage(PHOTO, 0, 0, 540, 720, 0, 60, w, w * 720 / 540); g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2; for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(w * f, 60); g.lineTo(w * f, 60 + w * 4 / 3); g.stroke(); g.beginPath(); g.moveTo(0, 60 + w * 4 / 3 * f); g.lineTo(w, 60 + w * 4 / 3 * f); g.stroke(); } g.fillStyle = "#fff"; g.beginPath(); g.arc(w / 2, h - 150, 56 - k * 10, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h - 150, 68, 0, 7); g.stroke(); }
  if (st === "send" || st === "sent") { head(st === "send" ? "SEND" : "SENT"); rr(g, 32, 130, w - 64, 470, 22); g.save(); g.clip(); g.drawImage(PHOTO, 0, 90, 540, 540 * 470 / (w - 64), 32, 130, w - 64, 470); g.restore();
    g.fillStyle = "#9aa"; g.font = "700 24px M"; g.fillText("CODE", 36, 660); rr(g, 32, 676, w - 64, 96, 18); g.fillStyle = "#16191e"; g.fill(); g.strokeStyle = k > 0 && k < 1 ? "#3dff8c" : "#2a2e35"; g.lineWidth = 3; g.stroke();
    const code = "wave".slice(0, Math.floor(k * 4 + 0.001)); g.fillStyle = "#fff"; g.font = "700 50px M"; g.fillText(code, 60, 742); if (k > 0 && k < 1) { g.fillStyle = "#3dff8c"; g.fillRect(60 + g.measureText(code).width + 4, 702, 4, 50); }
    rr(g, 32, 800, w - 64, 100, 50); g.fillStyle = st === "sent" ? "#1d3a2a" : k2 > 0 ? "#2bd673" : "#3dff8c"; g.fill(); g.fillStyle = st === "sent" ? "#3dff8c" : "#03140a"; g.font = "800 44px D"; const lab = st === "sent" ? "✓ SENT NEARBY" : "SEND"; g.fillText(lab, w / 2 - g.measureText(lab).width / 2, 866); }
  if (st === "notif" || st === "code") { head("NEARBY"); for (let i = 0; i < 3; i++) { const y = 140 + i * 150, me = i === 0; rr(g, 32, y, w - 64, 128, 20); g.fillStyle = me ? "#123323" : "#15181d"; g.fill(); if (me) { g.strokeStyle = "#3dff8c"; g.lineWidth = 3 + k * 3; g.stroke(); }
      g.fillStyle = me ? "#1f4a33" : "#22262d"; rr(g, 52, y + 18, 92, 92, 14); g.fill(); if (me) lock(g, 98, y + 72, 52); g.fillStyle = me ? "#fff" : "#667"; g.font = "700 32px M"; g.fillText(me ? "beach.jpg" : i === 1 ? "notes.txt" : "song.mp3", 166, y + 58); g.fillStyle = me ? "#3dff8c" : "#556"; g.font = "600 22px M"; g.fillText(me ? "LOCKED · JUST NOW" : "EARLIER", 166, y + 96); }
    if (st === "code") { g.fillStyle = "#9aa"; g.font = "700 24px M"; g.fillText("ENTER CODE", 36, 650); rr(g, 32, 666, w - 64, 96, 18); g.fillStyle = "#16191e"; g.fill(); g.strokeStyle = "#3dff8c"; g.lineWidth = 3; g.stroke(); const code = "wave".slice(0, Math.floor(k2 * 4 + 0.001)); g.fillStyle = "#fff"; g.font = "700 50px M"; g.fillText(code, 60, 732); } }
  if (st === "photo") { head("UNLOCKED"); const x0 = 32, y0 = 130, pw = w - 64, phh = pw * 4 / 3, cols = 3, rows = 4; // pieces fall into place
    for (let i = 0; i < 12; i++) { const c = i % cols, rw = Math.floor(i / cols), kk = clamp(k * 2.2 - (i / 12) * 1.2); if (kk <= 0) continue; const dy = (1 - out(kk)) * -500; g.globalAlpha = clamp(kk * 3); g.drawImage(PHOTO, c * 180, rw * 180, 180, 180, x0 + c * pw / 3, y0 + rw * phh / 4 + dy, pw / 3 + 1, phh / 4 + 1); g.globalAlpha = 1; }
    if (k2 > 0) { g.strokeStyle = `rgba(61,255,140,${1 - k2})`; g.lineWidth = 10; rr(g, x0, y0, pw, phh, 16); g.stroke(); } }
  if (st === "space") { head("SPACE"); g.fillStyle = "#3dff8c"; g.font = "800 46px D"; g.fillText("Beach crew", 36, 200); g.fillStyle = "#9aa"; g.font = "600 24px M"; g.fillText("PRIVATE · 5 MEMBERS", 36, 244); g.fillText("PASSCODE", 36, 320); g.fillStyle = "#fff"; g.font = "700 60px M"; g.fillText("• • • •", 36, 400); }
  if (st === "empty") { head("NEARBY"); g.fillStyle = "#445"; g.font = "600 30px M"; g.fillText("nothing here", w / 2 - 110, h / 2); }
  tex.needsUpdate = true;
}

// ---------------------------------------------------------------- the x-ray phone (lock + pieces), a studio away from the island
const M = V(-400, 0, 0), MAC = new THREE.Group(); MAC.position.copy(M); scene.add(MAC);
{ const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 12), new THREE.MeshBasicMaterial({ color: 0x07111a, side: THREE.BackSide, fog: false })); MAC.add(dome);
  const floor = tinted(new THREE.CircleGeometry(40, 24), 0x0e1c26, 0.08, { roughness: 0.5 }); floor.rotation.x = -Math.PI / 2; MAC.add(floor);
  const k = new THREE.PointLight(0xbfe6ff, 140, 80, 1.2); k.position.set(8, 22, 16); MAC.add(k); const k2 = new THREE.PointLight(0x3dff8c, 60, 30, 1.6); k2.position.set(-8, 4, -4); MAC.add(k2); }
const BIG = new THREE.Group(); BIG.position.set(0, 5, 0); MAC.add(BIG);
const BIGBODY = new THREE.Group(); BIG.add(BIGBODY);
BIGBODY.add(mesh(bbox(4.2, 8.6, 0.5, 0.55), flat(0x2a2d34, { roughness: 0.3, metalness: 0.4 })));
for (let i = 0; i < 6; i++) { const chip = mesh(bbox(0.9 + (i % 2) * 0.5, 0.5 + (i % 3) * 0.3, 0.12, 0.04), flat(i % 2 ? 0x2f6b4a : 0x3a3f4a)); chip.position.set(-1.2 + (i % 3) * 1.2, -2.8 + Math.floor(i / 3) * 0.9, -0.05); BIGBODY.add(chip); }
const BIGSCR = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 8.3), new THREE.MeshBasicMaterial({ map: LS.tex, toneMapped: false, transparent: true })); BIGSCR.position.z = 0.26; BIG.add(BIGSCR);
const XR = xray(BIGBODY);
// the photo card, the lock box, the code letters and the key
const PTEX = new THREE.CanvasTexture(PHOTO); PTEX.colorSpace = THREE.SRGBColorSpace;
const CARD = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshBasicMaterial({ map: PTEX, side: THREE.DoubleSide, toneMapped: false })); BIG.add(CARD);
const BOX = new THREE.Group(); BIG.add(BOX); BOX.position.set(0, -1.6, 0);
const BOXM = flat(0x2f9e8f, { roughness: 0.35, metalness: 0.5 });
BOX.add(mesh(bbox(3.0, 1.8, 1.2, 0.12), BOXM)); BOX.children[0].position.y = -0.1;
const LID = add(BOX, new THREE.Group(), 0, 0.8, -0.6); { const l = mesh(bbox(3.0, 0.3, 1.2, 0.1), BOXM); l.position.set(0, 0.15, 0.6); LID.add(l); }
const KEYHOLE = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 10), flat(0x0b0d10)); KEYHOLE.rotation.x = Math.PI / 2; KEYHOLE.position.set(0, 0, 0.62); BOX.add(KEYHOLE);
const KEY = new THREE.Group(); BIG.add(KEY); { const km = flat(0xffd34a, { roughness: 0.25, metalness: 0.8, emissive: 0x6a4a00, emissiveIntensity: 0.6 }); const ring = mesh(new THREE.TorusGeometry(0.32, 0.1, 6, 12), km); KEY.add(ring); const sh = mesh(new THREE.BoxGeometry(0.14, 1.1, 0.1), km); sh.position.y = -0.85; KEY.add(sh); for (let i = 0; i < 2; i++) { const tth = mesh(new THREE.BoxGeometry(0.22, 0.12, 0.1), km); tth.position.set(0.15, -1.15 + i * 0.25, 0); KEY.add(tth); } }
const LET = "WAVE".split("").map((ch) => { const m = mesh(bbox(0.8, 0.8, 0.25, 0.08), new THREE.MeshStandardMaterial({ map: textTex((g, w, h) => { g.fillStyle = "#0e2a1c"; g.fillRect(0, 0, w, h); g.fillStyle = "#3dff8c"; g.font = "900 190px D"; g.textAlign = "center"; g.fillText(ch, w / 2, h * 0.74); }), roughness: 0.4, emissive: 0x0a3a1c, emissiveIntensity: 0.4 })); BIG.add(m); return m; });
// 12 pieces of the photo (scrambled faces once locked)
const NOISE = textTex((g, w, h) => { const im = g.createImageData(w, h); for (let i = 0; i < im.data.length; i += 4) { const v = rnd(); im.data[i] = 20 + v * 60; im.data[i + 1] = 80 + v * 175; im.data[i + 2] = 60 + v * 90; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }, 64, 64);
NOISE.magFilter = THREE.NearestFilter;
const PIECES = Array.from({ length: 12 }, (_, i) => { const c = i % 3, rw = Math.floor(i / 3); const g = new THREE.Group(); const cube = mesh(bbox(0.78, 0.78, 0.3, 0.06), new THREE.MeshStandardMaterial({ map: NOISE, roughness: 0.4, emissive: 0x0c3a20, emissiveIntensity: 0.6 })); g.add(cube);
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.01, 6, 6, 1, true), glow(0x3dff8c, { transparent: true, opacity: 0.7 })); trail.position.y = -3.2; g.add(trail); g.trail = trail; g.home = V((c - 1) * 0.82, (1.5 - rw) * 0.82 - 1.6, 0); BIG.add(g); return g; });

// ---------------------------------------------------------------- the vault (cutaway building on the mainland at dusk)
const VT = V(400, 0, 0), VAULT = new THREE.Group(); VAULT.position.copy(VT); scene.add(VAULT);
{ const gr = tinted(facet(new THREE.PlaneGeometry(90, 90, 18, 18).rotateX(-Math.PI / 2), 0.3), 0x6f8a5a, 0.1); VAULT.add(gr);
  for (let i = 0; i < 18; i++) { const tr = tree(2.6 + rnd(), i % 2 ? "pine" : "round", 0x4f8a3c); const a = rnd() * Math.PI * 2, d = 14 + rnd() * 20; tr.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); VAULT.add(tr); }
  const k = new THREE.PointLight(0xffe2c0, 160, 50, 1.5); k.position.set(8, 16, 14); VAULT.add(k); }
const BLD = new THREE.Group(); VAULT.add(BLD);
{ const wall = flat(0xbfc4c9, { side: THREE.DoubleSide }); const shell = mesh(bbox(14, 6, 9, 0.2), wall); shell.position.y = 3; BLD.add(shell);
  const roof = mesh(bbox(14.6, 0.5, 9.6, 0.1), flat(0x6d737a)); roof.position.y = 6.2; BLD.add(roof);
  const door = mesh(bbox(2.2, 3.2, 0.3, 0.06), flat(0x3a3f46, { metalness: 0.6, roughness: 0.3 })); door.position.set(0, 1.6, 4.5); BLD.add(door);
  for (let i = 0; i < 5; i++) { const v = mesh(new THREE.BoxGeometry(1.6, 0.25, 0.1), flat(0x2a2e33)); v.position.set(-5 + i * 2.5, 5, 4.52); BLD.add(v); } }
{ const fl = tinted(new THREE.PlaneGeometry(13.4, 8.4, 14, 9).rotateX(-Math.PI / 2), 0x2a3038, 0.12, { roughness: 0.4 }); fl.position.y = 0.04; VAULT.add(fl);
  for (let i = 0; i < 3; i++) { const lt = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.25), glow(0xcfe8ff)); lt.position.set(0, 5.6, -3 + i * 3); BLD.add(lt); }
  const il = new THREE.PointLight(0xcfe8ff, 40, 16, 1.4); il.position.set(0, 5, 0); VAULT.add(il); }
const CUT = cutaway(BLD, V(0, 0, -1), 6, -1); // slide the front wall away
const RACKS = []; for (let i = 0; i < 8; i++) { const rk = rack(); rk.position.set(-5.2 + (i % 4) * 3.4, 0.05, -2.2 + Math.floor(i / 4) * 3.6); VAULT.add(rk); RACKS.push(rk); }
const VPIECES = Array.from({ length: 12 }, (_, i) => { const m = mesh(bbox(0.5, 0.5, 0.2, 0.05), new THREE.MeshStandardMaterial({ map: NOISE, roughness: 0.4, emissive: 0x0c3a20, emissiveIntensity: 0.8 })); const rk = RACKS[i % 8]; m.slot = rk.position.clone().add(V(0, 0.55 + Math.floor(i / 8) * 0.9 + (i % 2) * 0.4, 0.48)); VAULT.add(m); return m; });
const EMB = Array.from({ length: 70 }, () => { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06 + rnd() * 0.06), glow(rnd() < 0.5 ? 0xffa53a : 0xff5a1a, { transparent: true })); m.o = V(rnd() - 0.5, rnd(), rnd() - 0.5); m.src = Math.floor(rnd() * 12); VAULT.add(m); return m; });
const EYE = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 16, 1, true), glow(0xff4a4a, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); VAULT.add(EYE);

// ---------------------------------------------------------------- area map: cells on the sea (1 unit ≈ 100 m; a cell ≈ 40 × 20 km ≈ 400 × 200)
const MAP = new THREE.Group(); scene.add(MAP); const CW = 400, CH = 200;
const CELLS = []; for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) {
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(CW - 8, CH - 8), glow(0x3dff8c, { transparent: true, opacity: 0, depthWrite: false })); fill.rotation.x = -Math.PI / 2; fill.position.set(gx * CW, 3, gz * CH); MAP.add(fill);
  const edge = new THREE.Group(), em = glow(0x3dff8c, { transparent: true, opacity: 0, depthWrite: false }); edge.material = em; for (const [w, d, x, z] of [[CW - 8, 5, 0, (CH - 8) / 2], [CW - 8, 5, 0, -(CH - 8) / 2], [5, CH - 8, (CW - 8) / 2, 0], [5, CH - 8, -(CW - 8) / 2, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), em); b.position.set(x, 0, z); edge.add(b); } edge.position.copy(fill.position); MAP.add(edge);
  CELLS.push({ fill, edge, c: gx === 0 && gz === 0, d: Math.abs(gx) + Math.abs(gz) + (gx && gz ? 0.5 : 0) }); }
const RING = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), glow(0x3dff8c, { transparent: true, side: THREE.DoubleSide, depthWrite: false })); RING.rotation.x = -Math.PI / 2; RING.position.y = 0.08; scene.add(RING);
const DOME = new THREE.Group(); scene.add(DOME); DOME.position.set(-9, 0.5, -9);
{ const g = new THREE.IcosahedronGeometry(4.2, 1); DOME.add(new THREE.Mesh(g, glow(0x3dff8c, { transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }))); DOME.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x3dff8c, toneMapped: false, transparent: true, opacity: 0.8 }))); }

// ---------------------------------------------------------------- world state at film time t
const FREEZE = A("how") + 0.35;
const wtime = (t) => (t < FREEZE ? t : t < A("unlock") ? FREEZE : FREEZE + (t - A("unlock")));
const SPACE = A("space") - 0.3, NIGHT = (t) => clamp((t - A("burn") - 0.2) / 1.6);
const FRIENDS = [CROWD[4], CROWD[9], CROWD[15]];
const popAt = (p) => A("pop") + 0.25 + p.position.distanceTo(LENA.position) * 0.11;
function world(t) {
  const tw = wtime(t);
  SEA.wave(tw); FIRE.tick(tw);
  // night falls in the burn (time-lapse), and stays for the Space
  const n = NIGHT(t); SKY.u.top.value.set(0x34488f).lerp(new THREE.Color(0x0a1030), n); SKY.u.mid.value.set(0xf59660).lerp(new THREE.Color(0x1d2a5a), n); SKY.u.low.value.set(0xf9c99a).lerp(new THREE.Color(0x101830), n);
  SKY.u.sun.value.copy(SUN).normalize().add(V(0, -n * 0.4, 0)).normalize(); LT.key.intensity = lerp(2.5, 0.25, n); LT.key.color.set(0xffc896).lerp(new THREE.Color(0x8aa0ff), n); LT.rim.intensity = lerp(0.7, 0.5, n);
  scene.fog.color.set(0xf3b48e).lerp(new THREE.Color(0x0b1430), n); scene.background.copy(scene.fog.color);
  // the crowd: dance, turn to Lena and point, then raise the phones as they light up
  const want = clamp((t - A("want")) / 0.6) * (1 - clamp((t - A("old") - 1.0) / 0.8));
  ALL.forEach((p, i) => { const u = p.userData; if (p === SAM) { pose(SAM, { walk: tw * 0.8, speed: 0.12, point: want }); }
    else { const shrug = t > A("old") && t < A("send") ? win(t, A("old") + 0.2, A("send"), 0.4, 0.4) : 0;
      pose(p, { walk: tw * 0.9 + u.ph, speed: u.amp * (1 - want * 0.6), cheer: want * (i % 3 === 0 ? 0.9 : 0), point: want * (i % 3 === 1 ? 1 : 0) });
      if (shrug) { p.rig.lArm.rotation.z = -0.9 * shrug; p.rig.rArm.rotation.z = 0.9 * shrug; p.rig.lElbow.rotation.x = p.rig.rElbow.rotation.x = -1.2 * shrug; }
      p.rotation.y = lerp(u.face, Math.atan2(LENA.position.x - p.position.x, LENA.position.z - p.position.z), want); }
    const pk = clamp((t - popAt(p)) / 0.4); const up = t < A("burn") ? pk : 0;
    if (up > 0 && p !== SAM) { pose(p, { walk: tw * 0.9 + (u?.ph ?? 0), speed: 0.05, phone: up }); }
    p.phone.scr.material.color && p !== SAM && p.phone.scr.material.color.set(up > 0 ? 0x3dff8c : 0x0b0d10).multiplyScalar(up > 0 ? 0.5 + 0.5 * up : 1);
    p.ping.visible = up > 0 && t < A("lock"); p.ping.scale.setScalar(back(clamp((t - popAt(p)) / 0.35)) * (1 + 0.15 * Math.sin(tw * 6))); p.ping.scale.y *= 1.4; p.ping.rotation.y = tw * 2;
    p.position.y = 0; });
  // Lena: lift the phone, snap; hold it to send
  const lift = clamp((t - wt("scene", "lifts")) / 0.6), snap = wt("scene", "snaps");
  pose(LENA, { phone: t < A("pop") + 1.5 ? 1 : lerp(1, 0.4, clamp((t - A("pop") - 1.5) / 0.6)), look: 0 });
  if (t < A("want")) { LENA.rig.rArm.rotation.x = lerp(LENA.rig.rArm.rotation.x, -1.35, lift); LENA.rig.rElbow.rotation.x = lerp(-1.5, -0.35, lift); LENA.rig.head.rotation.x = lerp(0.28, 0.05, lift); }
  // Sam: holds his phone up in the unlock, cheers after
  if (t >= A("unlock") - 0.2 && t < A("burn")) { const ch = ease(clamp((t - wt("unlock", "unlock") - 0.3) / 0.3)); pose(SAM, { phone: 1 - ch, cheer: ch }); }
  // the green ring of the live wave on the sand
  const rk = clamp((t - A("pop") - 0.2) / 2.2); RING.visible = rk > 0 && rk < 1 && t < A("how"); RING.scale.setScalar(0.5 + rk * 16); RING.position.set(LENA.position.x, 0.08, LENA.position.z); RING.material.opacity = (1 - rk) * 0.9;
  // the private Space: a dome over five friends at the hut, night
  const sp = clamp((t - SPACE - 0.6) / 0.8); DOME.visible = sp > 0; DOME.scale.setScalar(back(sp) || 0.001); DOME.rotation.y = t * 0.1;
  if (t >= SPACE) { const spots = [V(-10.4, 0.5, -8.2), V(-8.0, 0.5, -8.4), V(-9.2, 0.5, -10.6), V(-7.6, 0.5, -10), V(-10.6, 0.5, -10.2)];
    [LENA, SAM, ...FRIENDS].forEach((p, i) => { p.position.copy(spots[i]); p.rotation.y = Math.atan2(-9 - spots[i].x, -9 - spots[i].z) + Math.PI + (i === 0 ? 0.3 : 0); pose(p, { walk: t * 0.8 + i * 0.3, speed: 0.15, phone: 1 }); });
    [SAM, ...FRIENDS].forEach((p) => p.phone.scr.material.color && p.phone.scr.material.color.set(0x3dff8c)); }
  else { LENA.position.set(0.4, 0, 8.6); SAM.position.set(-2.6, 0, 2.2); FRIENDS.forEach((p) => p.position.set(p.userData.x0 ?? p.position.x, 0, p.userData.z0 ?? p.position.z)); }
}
// the pieces dropping from the sky into Sam's phone (the unlock)
const DROP = Array.from({ length: 12 }, (_, i) => { const m = mesh(bbox(0.16, 0.16, 0.06, 0.02), new THREE.MeshStandardMaterial({ map: NOISE, emissive: 0x1a8a4a, emissiveIntensity: 1.2 })); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.004, 2.5, 5, 1, true), glow(0x3dff8c, { transparent: true, opacity: 0.6 })); tr.position.y = 1.3; m.add(tr); m.o = V((rnd() - 0.5) * 1.6, 6 + rnd() * 5, (rnd() - 0.5) * 1.6); scene.add(m); return m; });
function drops(t) { const a = wt("unlock", "pieces") - 0.2; SAM.phone.updateWorldMatrix(true, false); const tgt = SAM.phone.getWorldPosition(V(0, 0, 0));
  DROP.forEach((m, i) => { const k = clamp((t - a - i * 0.06) / 1.0); m.visible = k > 0 && k < 1 && t < wt("unlock", "click") - 0.05; m.position.copy(tgt).add(m.o.clone().multiplyScalar(1 - ease(k))); m.scale.setScalar(lerp(1, 0.3, k)); m.rotation.set(t * 2 + i, t * 3, 0); }); }
FRIENDS.forEach((p) => { p.userData.x0 = p.position.x; p.userData.z0 = p.position.z; });

// the macro set: x-ray, lock, letters → key, pieces fly
function macro(t) {
  const a = A("lock");
  XR(clamp((t - a - 0.6) / 1.0)); BIGSCR.material.opacity = 1 - clamp((t - a - 0.6) / 0.8); ui(LS, "send", 1, 0);
  const into = ease(clamp((t - wt("lock", "locked")) / 1.0)), shut = ease(clamp((t - wt("lock", "locked") - 0.8) / 0.6));
  CARD.position.set(0, lerp(1.4, -1.2, into), 0); CARD.scale.setScalar(lerp(1, 0.9, into)); CARD.visible = shut < 0.98 && t < A("pieces");
  LID.rotation.x = lerp(-1.9, 0, shut); BOX.visible = t < A("pieces") + 0.3;
  // letters fly in from above the screen and fuse into the key
  const lk = clamp((t - wt("lock", "code")) / 1.2), fuse = ease(clamp((t - wt("lock", "key")) / 0.6));
  LET.forEach((m, i) => { m.visible = lk > 0 && fuse < 1 && t < A("pieces"); const from = V((i - 1.5) * 1.0, 6, 1.5), mid = V((i - 1.5) * 0.95, 2.8, 1.0); m.position.copy(from.lerp(mid, out(clamp(lk * 1.4 - i * 0.12)))).lerp(V(0, 2.2, 1.0), fuse); m.rotation.y = (1 - out(lk)) * 3; m.scale.setScalar(1 - fuse * 0.7); });
  const turn = clamp((t - wt("lock", "never") + 0.3) / 0.5), home = ease(clamp((t - wt("lock", "never") - 0.4) / 0.8));
  KEY.visible = fuse > 0 && t < A("pieces") + 0.2; KEY.scale.setScalar(Math.max(0.01, fuse) * 0.9);
  KEY.position.set(0, lerp(2.2, -0.15, ease(clamp((t - wt("lock", "key") - 0.5) / 0.7))), lerp(1.0, 1.25, fuse)); KEY.position.lerp(V(1.2, -3.3, 0.1), home); KEY.rotation.set(0, 0, -turn * Math.PI / 2 * (1 - home)); KEY.rotation.y = home * t * 1.5;
  // pieces: the box splits (exploded view), then the pieces rise side by side
  const sp = ease(clamp((t - A("pieces") - 0.2) / 0.9)), fly = clamp((t - wt("pieces", "fly") + 0.1) / 2.2);
  PIECES.forEach((g, i) => { g.visible = t >= A("pieces") && t < A("vault"); const ex = g.home.clone().multiplyScalar(1 + sp * 0.9); ex.z = sp * ((i % 2) - 0.5) * 0.8; const lane = V(((i % 6) - 2.5) * 0.95, 0, Math.floor(i / 6) * 0.9 - 0.45); const up = out(clamp(fly * 1.2 - (i % 4) * 0.04)); g.position.copy(ex).lerp(V(lane.x, 3 + up * 16, lane.z), clamp(fly * 3)); g.rotation.set(sp * 0.4 * (1 - fly), sp * (i % 3 - 1) * 0.5 * (1 - fly), 0); g.trail.visible = fly > 0.05; g.trail.scale.y = 0.3 + up * 1.2; });
}
// the vault: pieces land, the wall slides away, a red eye tries to read them
function vault(t) {
  const a = A("vault"), land = clamp((t - a) / 1.6);
  VPIECES.forEach((m, i) => { const k = out(clamp(land * 1.6 - i * 0.05)); m.position.copy(m.slot.clone().add(V(0, (1 - k) * 25, 0))); m.rotation.y = (1 - k) * 4; m.visible = t >= a - 0.1; });
  CUT(ease(clamp((t - a - 1.0) / 1.4)));
  const eye = win(t, wt("vault", "even"), A("area"), 0.3, 0.2); EYE.visible = eye > 0; EYE.position.copy(VPIECES[2].slot).add(V(0, 2.4, 0.4)); EYE.rotation.z = Math.sin(t * 3) * 0.25; EYE.material.opacity = 0.22 * eye;
  RACKS.forEach((rk, i) => rk.leds.forEach((l, j) => (l.visible = Math.sin(t * 9 + i * 3 + j * 1.7) > -0.3)));
  // the burn
  const b = clamp((t - wt("burn", "vault") + 0.2) / 1.4);
  VPIECES.forEach((m) => { if (t >= A("burn")) { m.material.emissive.set(0xff5a1a); m.material.emissiveIntensity = 0.8 + b * 2; m.scale.setScalar(Math.max(0.001, 1 - b)); } else { m.material.emissive.set(0x0c3a20); m.material.emissiveIntensity = 0.8; m.scale.setScalar(1); } });
  EMB.forEach((e, i) => { const k = clamp(b * 1.3 - (i % 10) * 0.03); e.visible = t >= A("burn") && k > 0 && k < 1; e.position.copy(VPIECES[e.src].slot).add(e.o.clone().multiplyScalar(k * 3).add(V(0, k * 3, 0))); e.material.opacity = 1 - k; e.rotation.set(t * 3 + i, t * 2, 0); });
}
// the area map
function area(t) {
  const a = A("area"), k = clamp((t - a - 0.4) / 1.6);
  CELLS.forEach((c) => { const on = c.c ? clamp((t - wt("area", "rough")) / 0.4) : clamp((t - wt("area", "about") - c.d * 0.25) / 0.4); const vis = t >= a && t < wt("area", "never"); c.fill.visible = c.edge.visible = vis; c.fill.material.opacity = on * (c.c ? 0.32 : 0.16); c.edge.material.opacity = Math.max(k * 0.5, on); });
  fog.far = t >= a && t < A("unlock") ? 9000 : 320; fog.near = t >= a && t < A("unlock") ? 3000 : 70;
}

// ---------------------------------------------------------------- the photo itself: rendered once from Lena's phone
{ world(wt("scene", "snaps")); const pc = new THREE.PerspectiveCamera(46, W / H, 0.05, 3000); pc.position.set(0.3, 1.75, 7.3); pc.lookAt(-0.5, 1.0, -2.0); pc.fov = 52; pc.updateProjectionMatrix(); comp.passes[0].camera = pc; if (comp.passes[1].camera) comp.passes[1].camera = pc; comp.render(); const g = PHOTO.getContext("2d"); g.drawImage($("gl"), 0, (H - W * 4 / 3) / 2 + 60, W, W * 4 / 3, 0, 0, 540, 720); comp.passes[0].camera = cam; if (comp.passes[1].camera) comp.passes[1].camera = cam; PTEX.needsUpdate = true; }

// ---------------------------------------------------------------- shots (a cut or move every ~1–2 s)
const lp = () => LENA.position, sp = () => SAM.position;
const SH = [];
const shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
function buildShots() {
  // hook
  shot(0, 2.0, V(46, 40, 70), V(0, 0, -3), 42, V(16, 9, 30), V(0, 1, -3), 40);
  shot(wt("hook", "reaches") - 0.1, 1.5, V(-6, 0.6, 5), V(0, 1.6, -3), 48, V(-2.5, 0.8, 4.0), V(1, 1.8, -4), 46);
  shot(wt("hook", "forty"), 1.4, V(2.5, 1.7, 0.8), V(1.6, 1.55, -1.5), 34, V(1.4, 1.7, 1.2), V(0.6, 1.6, -1.5), 32);
  shot(wt("hook", "with"), 2.2, V(0.5, 26, 3.5), V(0, 0, -1.5), 44, V(0.1, 19, 2.5), V(0, 0, -1.5), 46, 0.02);
  // scene: the island at sunset from the water, then Lena
  shot(A("scene"), 2.0, V(26, 1.2, 36), V(0, 2, -4), 42, V(19, 2.0, 27), V(0, 2, -3), 40);
  shot(wt("scene", "lena") - 0.05, 1.6, V(2.0, 1.4, 12.2), V(0.3, 1.45, 8.6), 34, V(1.4, 1.5, 11.0), V(0.4, 1.5, 8.6), 32);
  SH.push({ at: wt("scene", "snaps") - 0.7, dur: 2.4, track: LPH, d0: 0.5, d1: 0.36, side: 0.15, lift: 0.3, fov: 40 });
  // want: the crowd shouts
  shot(A("want"), 1.0, V(-1, 1.5, 3.6), V(-1.5, 1.5, -1), 40, V(-0.5, 1.5, 3.2), V(-1.5, 1.5, -1), 38);
  shot(wt("want", "same"), 0.9, V(3.5, 1.4, 2.6), V(2.5, 1.6, -0.5), 36, V(3.0, 1.5, 2.2), V(2.4, 1.6, -0.5), 34);
  shot(wt("want", "send") - 0.1, 1.4, V(0.4, 1.0, 6.8), V(-0.6, 1.7, 1.0), 50, V(0.4, 0.8, 7.4), V(-0.6, 1.8, 1.0), 54);
  // old ways
  shot(A("old"), 3.0, V(-7, 2.2, 7), V(-1, 1.4, 0), 40, V(5, 2.6, 7), V(1, 1.4, 0), 40);
  shot(wt("old", "and"), 2.4, V(4, 9, 11), V(0, 0.8, -1), 44, V(-4, 8, 11), V(0, 0.8, -1), 44);
  // send: tight on Lena's phone
  SH.push({ at: A("send"), dur: 1.4, track: LPH, d0: 0.9, d1: 0.45, side: -0.5, lift: 0.4, fov: 34 });
  SH.push({ at: wt("send", "sets") - 0.1, dur: 3, track: LPH, d0: 0.34, d1: 0.3, side: 0.05, lift: 0.1, fov: 34 });
  // pop: drone down over the beach, then the line of phones
  shot(A("pop"), 2.0, V(0.5, 30, 13), V(0, 0, 0), 46, V(0.5, 22, 11), V(0, 0, 0), 46, 0.01);
  shot(wt("pop", "all") - 0.2, 2.2, V(-7.5, 0.9, 5.5), V(4, 1.2, -4), 40, V(-6.5, 1.0, 4.5), V(4, 1.2, -4), 38);
  // how: freeze time, bullet-time orbit, push into her phone
  for (let i = 0; i < 1; i++) SH.push({ at: A("how"), dur: L.how.dur + 0.3, orbit: { c: V(-0.5, 1.4, 0.5), r0: 7.5, r1: 6, a0: 0.5, a1: -0.9, h: 1.1 }, fov: 40 });
  SH.push({ at: wt("how", "look") - 0.1, dur: 1.2, track: LPH, d0: 1.6, d1: 0.12, side: 0.3, lift: 0.2, fov: 36 });
  // lock: the x-ray studio
  const m = (x, y, z) => V(M.x + x, M.y + y, M.z + z);
  shot(A("lock"), 1.6, m(0, 5, 16), m(0, 5, 0), 40, m(4, 6, 14), m(0, 5, 0), 40);
  shot(wt("lock", "locked") - 0.1, 1.6, m(-4, 4.5, 9), m(0, 4.2, 0), 38, m(-3, 4.2, 8), m(0, 3.8, 0), 36);
  shot(wt("lock", "code") - 0.1, 2.0, m(2.5, 8.5, 9), m(0, 7, 0), 40, m(1.5, 8, 8), m(0, 6.5, 0.5), 38);
  shot(wt("lock", "key") - 0.15, 1.8, m(3.5, 6, 6), m(0, 4.5, 1), 36, m(2.5, 4.8, 5.5), m(0, 3.6, 1), 34);
  shot(wt("lock", "never") - 0.1, 2.4, m(6, 4, 10), m(0.5, 2.5, 0), 40, m(4, 3, 12), m(0.6, 2.0, 0), 42);
  // pieces
  shot(A("pieces"), 1.6, m(0, 4.5, 12), m(0, 3.6, 0), 44, m(-3, 5, 11), m(0, 4, 0), 44);
  shot(wt("pieces", "fly") - 0.2, 2.6, m(0, 5, 22), m(0, 8, 0), 50, m(0, 9, 24), m(0, 13, 0), 50);
  shot(wt("pieces", "that's"), 1.6, m(-9, 14, 14), m(0, 17, 0), 46, m(-7, 18, 12), m(0, 19, 0), 46);
  // vault
  const v = (x, y, z) => V(VT.x + x, VT.y + y, VT.z + z);
  shot(A("vault"), 1.6, v(14, 18, 24), v(0, 6, 0), 44, v(10, 12, 20), v(0, 4, 0), 44);
  shot(wt("vault", "still") - 0.2, 2.2, v(-4, 4, 14), v(-1, 2.2, 0), 46, v(-1, 3.5, 9), v(-1, 1.8, -1), 44);
  shot(wt("vault", "even") - 0.1, 2.4, v(-1.5, 3.0, 5.5), VPIECES[2].slot.clone().add(VT), 40, v(-1.2, 2.8, 4.6), VPIECES[2].slot.clone().add(VT), 38);
  // area: crane up from the island to the map
  shot(A("area"), 3.2, V(0.5, 22, 14), V(0, 0, 0), 46, V(0, 1400, 600), V(0, 0, 0), 50, 0);
  shot(wt("area", "about"), 2.6, V(0, 1500, 650), V(0, 0, -40), 50, V(0, 1650, 700), V(0, 0, -40), 52, 0);
  shot(wt("area", "never"), 1.8, V(2, 14, 13), V(0.4, 0, 8.6), 40, V(1.0, 5, 11), V(0.4, 1, 8.6), 40, 0.01);
  // unlock: Sam
  SH.push({ at: A("unlock"), dur: 1.3, track: SAM.phone, d0: 0.7, d1: 0.4, side: 0.4, lift: 0.3, fov: 36 });
  SH.push({ at: wt("unlock", "types") - 0.1, dur: 1.3, track: SAM.phone, d0: 0.34, d1: 0.3, side: 0.05, lift: 0.1, fov: 34 });
  shot(wt("unlock", "pieces") - 0.1, 1.6, V(-0.5, 0.6, 6.5), V(-2.6, 2.6, 2.2), 52, V(-0.8, 0.8, 6.2), V(-2.6, 2.2, 2.2), 50);
  SH.push({ at: wt("unlock", "click") - 0.05, dur: 1.4, track: SAM.phone, d0: 0.36, d1: 0.3, side: -0.05, lift: 0.1, fov: 34 });
  shot(wt("unlock", "his") - 0.1, 1.6, V(-1.0, 1.4, 4.8), V(-2.6, 1.4, 2.2), 36, V(-1.3, 1.5, 4.5), V(-2.6, 1.6, 2.2), 34);
  // burn: time-lapse wide, then the vault burns, then nothing
  shot(A("burn"), 1.9, V(24, 7, 30), V(0, 1, -4), 42, V(20, 6, 26), V(0, 1, -4), 42);
  shot(wt("burn", "vault") - 0.25, 2.0, v(-1.5, 4.2, 8.5), v(-1.6, 1.4, -0.6), 44, v(-1.2, 3.8, 7.4), v(-1.6, 1.4, -0.6), 42);
  shot(wt("burn", "no"), 2.0, v(0, 5, 11), v(0, 2, -1), 46, v(0, 6, 13), v(0, 2, -1), 46);
  // space: night, the dome over five friends, strangers outside
  shot(A("space"), 2.0, V(-1, 3, 4), V(-9, 1.5, -9), 44, V(-3, 3.5, 2), V(-9, 1.5, -9), 44);
  shot(wt("space", "private") - 0.1, 1.8, V(-4.6, 2.2, -4.2), V(-9, 1.3, -9.2), 36, V(-5.0, 2.0, -4.8), V(-9, 1.3, -9.2), 32);
  shot(wt("space", "strangers") - 0.1, 2.0, V(-2.0, 1.7, -2.2), V(-5.8, 1.4, -5.6), 44, V(-2.4, 1.8, -2.8), V(-6.2, 1.4, -6.2), 42);
  shot(A("end") - 0.5, 1, V(-1, 6, 3), V(-9, 1, -9), 46);
}
buildShots();
const camAt = camRig(cam);
const _p = V(0, 0, 0), _n = V(0, 0, 0), _q = new THREE.Quaternion();
function camera(t) {
  let s = SH[0]; for (const x of SH) if (t >= x.at) s = x;
  if (s.track) { const k = ease(clamp((t - s.at) / s.dur)); s.track.updateWorldMatrix(true, false); s.track.getWorldPosition(_p); s.track.getWorldQuaternion(_q); _n.set(s.side ?? 0, s.lift ?? 0.25, 1).normalize().applyQuaternion(_q);
    cam.position.copy(_p).addScaledVector(_n, lerp(s.d0, s.d1, k)); cam.position.y += Math.sin(t * 1.7) * 0.002; cam.up.set(0, 1, 0).applyQuaternion(_q).lerp(V(0, 1, 0), 0.25).normalize(); cam.lookAt(_p); if (cam.fov !== s.fov) { cam.fov = s.fov; cam.updateProjectionMatrix(); } return; }
  cam.up.set(0, 1, 0);
  if (s.orbit) { const o = s.orbit, k = ease(clamp((t - s.at) / s.dur)), a = lerp(o.a0, o.a1, k), rr = lerp(o.r0, o.r1, k); cam.position.set(o.c.x + Math.sin(a) * rr, o.c.y + o.h, o.c.z + Math.cos(a) * rr); cam.lookAt(o.c); if (cam.fov !== s.fov) { cam.fov = s.fov; cam.updateProjectionMatrix(); } return; }
  camAt(SH, t);
}

// ---------------------------------------------------------------- overlays
const project = (v) => { cam.updateMatrixWorld(); const pp = v.clone().project(cam); return [(pp.x + 1) / 2 * W, (1 - pp.y) / 2 * H, pp.z < 1]; };
const tag = (id, html, t, a, b, y = 170) => { if (t < a || t > b) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a, b, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a) / 0.3))) * 24}px)` }); };
const lbl = (id, pos, t, a, b, html, col = "#3dff8c") => { if (t < a || t > b) return; const [x, y, ok] = project(pos); if (!ok) return; const el = $(id); el.innerHTML = html; S(el, { left: `${x}px`, top: `${y}px`, borderColor: col, color: col, opacity: win(t, a, b, 0.25, 0.25) }); };
const big = (txt, t, a, b, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a || t > b) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a) / 0.12) * clamp((b - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
const card = (id, html, t, a, b, x, y, rot = 0) => { if (t < a || t > b) return; const el = $(id); el.innerHTML = html; const k = clamp((t - a) / 0.3); S(el, { left: `${x}px`, top: `${y}px`, opacity: k * clamp((b - t) / 0.3), transform: `scale(${lerp(0.5, 1, back(k))}) rotate(${rot}deg)` }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  big("40 STRANGERS", t, wt("hook", "forty"), wt("hook", "with") - 0.05, "#ffd04a", 330, 118);
  big("NO NAMES<br>NO NUMBERS", t, wt("hook", "with"), A("scene") - 0.1, "#fff", 300, 104, 0);
  const fl = win(t, wt("scene", "snaps") + 0.15, wt("scene", "snaps") + 0.6, 0.03, 0.4); S($("flash"), { opacity: fl * 0.85 });
  big("SEND IT TO ME!", t, wt("want", "send") - 0.05, A("old") - 0.05, "#ffd04a", 300, 112);
  card("c0", `<h5>Contacts</h5>0 of 40 · <s>no numbers</s>`, t, A("old") + 0.2, wt("old", "and"), 200, 300, -2);
  card("c1", `<h5>New group</h5>40 strangers? <s>no thanks</s>`, t, wt("old", "and") + 0.1, A("send") - 0.05, 230, 300, 2);
  tag("tA", `code · <b>wave</b>`, t, wt("send", "code"), A("pop") - 0.1, 200);
  tag("tA", `no names · <b>no numbers</b> · live`, t, A("pop") + 0.2, A("how") - 0.1, 200);
  big("FREEZE", t, A("how") + 0.05, wt("how", "look") - 0.1, "#bfe6ff", 300, 140, 0);
  tag("tA", `locked on <b>her phone</b> · AES-256`, t, wt("lock", "locked") + 0.4, wt("lock", "code"), 200);
  tag("tA", `the code <b>becomes the key</b>`, t, wt("lock", "code") + 0.2, wt("lock", "never") - 0.1, 200);
  tag("tA", `key <b>never leaves</b> her phone`, t, wt("lock", "never") + 0.1, A("pieces") - 0.05, 200);
  tag("tA", `pieces fly <b>side by side</b>`, t, wt("pieces", "fly"), A("vault") - 0.05, 200);
  tag("tA", `in the vault · <i>still scrambled</i>`, t, wt("vault", "still") - 0.1, wt("vault", "even") - 0.05, 200);
  tag("tA", `vault <i>can't read them</i>`, t, wt("vault", "even") + 0.2, A("area") - 0.05, 200);
  if (t >= A("area") && t < A("unlock")) { tag("tA", `only the <b>rough area</b>`, t, wt("area", "rough") - 0.1, wt("area", "about"), 200); card("c0", `<h5>Rough area</h5><b>≈ 40 × 20 km</b> + the 8 around it`, t, wt("area", "about") + 0.1, wt("area", "never") - 0.1, 190, 300, -2);
    if (t >= wt("area", "never") + 0.2) { const [x, y] = project(V(0.4, 1.0, 8.6)); S($("x"), { left: `${x}px`, top: `${y}px`, opacity: win(t, wt("area", "never") + 0.2, A("unlock"), 0.15, 0.15), transform: `scale(${back(clamp((t - wt("area", "never") - 0.2) / 0.3))})` }); tag("tA", `exact spot · <i>never shown</i>`, t, wt("area", "never") + 0.25, A("unlock") - 0.05, 200); } }
  tag("tA", `code · <b>wave</b> → unlocked <b>on his phone</b>`, t, wt("unlock", "click"), A("burn") - 0.05, 200);
  if (t >= A("burn") && t < wt("burn", "no")) { const k = clamp((t - A("burn")) / 1.7); $("timer").textContent = `${String(Math.floor((1 - k) * 30)).padStart(2, "0")}:${String(Math.floor(((1 - k) * 1800) % 60)).padStart(2, "0")}`; S($("timer"), { opacity: win(t, A("burn"), wt("burn", "no"), 0.2, 0.2), color: k >= 1 ? "#ff5a3a" : "#ffb06a" }); }
  big("NO TRACE", t, wt("burn", "no") + 0.4, A("space") - 0.1, "#ffffff", 320, 140, 0);
  card("c0", `<h5>Private Space</h5>passcode · <b>members only</b>`, t, wt("space", "private"), wt("space", "strangers") - 0.05, 210, 280, -2);
  tag("tA", `strangers · <i>never see it</i>`, t, wt("space", "strangers"), A("end") - 0.1, 200);
  // the freeze grade + letterbox for the "4D" stretch (time stopped)
  const fz = t >= A("how") && t < A("unlock") ? 1 : 0; S($("grade"), { opacity: t >= A("how") && t < A("lock") ? win(t, A("how"), A("lock"), 0.3, 0.2) : 0 }); S($("bars"), { opacity: fz * 0 });
  // subtitles: 1–3 words, broken at punctuation
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}

// which set is on screen decides which phone UI to draw
function screens(t) {
  if (t < wt("scene", "snaps") + 0.3) ui(LS, "cam", win(t, wt("scene", "snaps"), wt("scene", "snaps") + 0.3, 0.05, 0.1));
  else if (t < A("pop")) ui(LS, "send", clamp((t - wt("send", "code")) / 0.9), t > wt("send", "send") ? 1 : 0);
  else if (t < A("space")) ui(LS, "sent");
  else ui(LS, "space");
  if (t < A("unlock")) ui(SS, t > A("pop") ? "notif" : "empty");
  else if (t < wt("unlock", "pieces")) ui(SS, "code", clamp((t - A("unlock") - 0.3) / 0.4), clamp((t - wt("unlock", "types")) / 0.8));
  else if (t < A("space")) ui(SS, "photo", clamp((t - wt("unlock", "click") + 0.2) / 1.2), clamp((t - wt("unlock", "unlock")) / 0.8));
  else ui(SS, "space");
}

window.dbg = () => ({ p: PIECES.map((g) => { const v = g.getWorldPosition(V(0,0,0)); return [g.visible, v.x.toFixed(1), v.y.toFixed(1), v.z.toFixed(1)]; }).slice(0, 3), cam: cam.position.toArray().map((x) => x.toFixed(1)), big: BIG.visible, A: A("pieces") });
window.render = async function (t) {
  world(t); drops(t); macro(t); vault(t); area(t); screens(t); camera(t);
  // the falling pieces into Sam's phone (the unlock)
  overlays(t);
  comp.render();
};
await document.fonts.ready;
window.ready = true;
