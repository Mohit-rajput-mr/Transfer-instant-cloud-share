// Improved Film 03: how an AI reads your message (tokens → numbers → a map of meaning → attention → next-word guesses),
// and the opposite: Orbi locks your file on your phone, so nobody on the way can read it.
import { THREE, stage, lights, person, pose, tree, rock, house, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, textTex, xray, explode, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);

reseed(77);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x101420, fog: null, bloom: 0.55, exposure: 1.0 });
const LT = lights(scene, { key: 0xfff0dc, keyI: 2.2, sky: 0xcfd8ff, ground: 0x3a3040, fillI: 1.0, rim: 0xa0b8ff, rimI: 0.8, at: V(6, 10, 8), area: 10 });

// ---------------------------------------------------------------- the living room (origin)
const ROOM = new THREE.Group(); scene.add(ROOM);
{ const fl = tinted(new THREE.PlaneGeometry(14, 14, 14, 14).rotateX(-Math.PI / 2), 0xb98a5a, 0.08, { roughness: 0.7 }); ROOM.add(fl);
  for (let i = 0; i < 14; i++) ROOM.add(P(mesh(new THREE.BoxGeometry(0.03, 0.01, 14), flat(0x8a6040), { cast: false }), V(-7 + i, 0.01, 0)));
  const wall = mesh(new THREE.PlaneGeometry(14, 6), flat(0x6f9fb8)); wall.position.set(0, 3, -4); ROOM.add(wall); const wall2 = mesh(new THREE.PlaneGeometry(14, 6), flat(0x6a96ad)); wall2.rotation.y = Math.PI / 2; wall2.position.set(-5, 3, 3); ROOM.add(wall2);
  const rug = tinted(new THREE.CircleGeometry(2.4, 18).rotateX(-Math.PI / 2), 0xd9573a, 0.06); rug.position.set(0.5, 0.02, 0.5); ROOM.add(rug);
  // sofa
  const sofa = new THREE.Group(); sofa.position.set(-1.2, 0, -2.6); ROOM.add(sofa); const sm = flat(0x3f5f8a);
  sofa.add(P(mesh(bbox(3.4, 0.5, 1.2, 0.12), sm), V(0, 0.45, 0))); sofa.add(P(mesh(bbox(3.4, 0.9, 0.35, 0.12), sm), V(0, 0.95, -0.45)));
  for (const s of [-1, 1]) sofa.add(P(mesh(bbox(0.35, 0.75, 1.2, 0.12), sm), V(s * 1.7, 0.75, 0)));
  for (let i = 0; i < 2; i++) sofa.add(P(mesh(bbox(1.55, 0.18, 1.0, 0.08), flat(0x4f72a0)), V(-0.8 + i * 1.6, 0.78, 0.05)));
  // coffee table + the sandwich
  const tb = new THREE.Group(); tb.position.set(0.6, 0, -0.6); ROOM.add(tb); tb.add(P(mesh(bbox(1.6, 0.08, 0.9, 0.03), flat(0x8a5a36)), V(0, 0.5, 0))); for (const [x, z] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) tb.add(P(mesh(limb(0.03, 0.03, 0.46, 5), flat(0x6a4428)), V(x, 0.46, z)));
  tb.add(P(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16), flat(0xf4f4f4)), V(0.2, 0.55, 0)));
  // plant, lamp, window, shelf
  const pot = mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 8), flat(0xc06a3a)); pot.position.set(-4.3, 0.2, -3.3); ROOM.add(pot); const pl = tree(1.4, "round", 0x4f9a3c); pl.position.set(-4.3, 0.3, -3.3); pl.scale.setScalar(0.7); ROOM.add(pl);
  const lamp = new THREE.Group(); lamp.position.set(2.6, 0, -3.2); ROOM.add(lamp); lamp.add(P(mesh(limb(0.03, 0.03, 1.7, 5), flat(0x2a2a2a)), V(0, 1.7, 0))); lamp.add(P(mesh(new THREE.ConeGeometry(0.35, 0.4, 10, 1, true), flat(0xffe2a8, { emissive: 0xffc070, emissiveIntensity: 0.8, side: THREE.DoubleSide })), V(0, 1.85, 0)));
  const ll = new THREE.PointLight(0xffc880, 6, 8, 1.5); ll.position.set(2.6, 1.7, -3.0); ROOM.add(ll);
  const win0 = mesh(new THREE.PlaneGeometry(2.2, 1.6), glow(0xa8d8ff)); win0.position.set(-1.0, 3.3, -3.98); ROOM.add(win0); for (const x of [-1, 0, 1]) ROOM.add(P(mesh(new THREE.BoxGeometry(0.06, 1.7, 0.05), flat(0xffffff)), V(-1 + x * 1.1, 3.3, -3.95)));
  const shelf = mesh(bbox(1.6, 0.06, 0.4, 0.02), flat(0x8a5a36)); shelf.position.set(2.2, 2.6, -3.8); ROOM.add(shelf); for (let i = 0; i < 6; i++) ROOM.add(P(mesh(bbox(0.12, 0.35 + (i % 3) * 0.05, 0.28, 0.02), flat([0xd9573a, 0x4fc3bd, 0xe9c46a, 0x3f6fb0][i % 4])), V(1.6 + i * 0.2, 2.82, -3.8))); }
const SAND = new THREE.Group(); ROOM.add(SAND); { const bread = flat(0xe8c27a), crust = flat(0xb5803a); SAND.add(P(mesh(bbox(0.36, 0.05, 0.36, 0.03), bread), V(0, 0, 0))); SAND.add(P(mesh(bbox(0.38, 0.03, 0.38, 0.01), flat(0x6bbf4a)), V(0, 0.04, 0))); SAND.add(P(mesh(bbox(0.34, 0.03, 0.34, 0.01), flat(0xd94a3a)), V(0, 0.07, 0))); SAND.add(P(mesh(bbox(0.36, 0.05, 0.36, 0.03), crust), V(0, 0.11, 0))); }
// the girl on the sofa, typing
const GIRL = person({ sex: "f", top: 0xf4a6b8, bottom: 0x2b3a55, skin: 0xe0a982, hair: 0x7a3b22, longHair: true, glasses: true, shortSleeve: true }); GIRL.position.set(-1.6, 0.35, -2.4); scene.add(GIRL);
const GPH = new THREE.Group(); GPH.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const GSC = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ toneMapped: false })); GSC.position.z = 0.007; GPH.add(GSC); GIRL.rig.rElbow.add(GPH); GPH.position.set(0, -0.4, 0.035); GPH.rotation.set(-0.15, 0, Math.PI); GPH.scr = GSC;
const GCV = document.createElement("canvas"); GCV.width = 432; GCV.height = 930; const GTX = new THREE.CanvasTexture(GCV); GTX.colorSpace = THREE.SRGBColorSpace; GSC.material.map = GTX;
const MSG = "my cat stole my sandwich";
function chat(n, ans = "") { const g = GCV.getContext("2d"), w = GCV.width, h = GCV.height; g.fillStyle = "#0e1016"; g.fillRect(0, 0, w, h); g.fillStyle = "#9aa"; g.font = "700 26px M"; g.fillText("AI CHAT", 30, 70);
  const txt = MSG.slice(0, n); if (txt) { g.font = "600 34px D"; const tw = Math.min(w - 80, g.measureText(txt).width + 40); g.fillStyle = "#3d7bff"; g.beginPath(); g.roundRect(w - 30 - tw, 120, tw, 70, 22); g.fill(); g.fillStyle = "#fff"; g.fillText(txt, w - 10 - tw, 166); }
  if (ans) { g.font = "600 32px D"; g.fillStyle = "#23262e"; const tw = Math.min(w - 80, g.measureText(ans).width + 40); g.beginPath(); g.roundRect(30, 230, tw, 66, 22); g.fill(); g.fillStyle = "#fff"; g.fillText(ans, 50, 274); }
  g.fillStyle = "#1b1e26"; g.fillRect(0, h - 120, w, 120); g.fillStyle = "#555"; g.font = "500 28px M"; g.fillText(n < MSG.length ? "typing…" : "", 40, h - 50); GTX.needsUpdate = true; }
// the cat
const CAT = new THREE.Group(); scene.add(CAT); { const fur = flat(0xe08a3a), dark = flat(0xa85a20), wht = flat(0xfff3e6);
  const body = mesh(facet(new THREE.IcosahedronGeometry(0.28, 1), 0.03), fur); body.scale.set(1.5, 0.95, 0.9); body.position.y = 0.33; CAT.add(body);
  const head = new THREE.Group(); head.position.set(0.42, 0.52, 0); CAT.add(head); CAT.head = head; head.add(mesh(facet(new THREE.IcosahedronGeometry(0.17, 1), 0.02), fur));
  for (const s of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.06, 0.12, 4), dark); ear.position.set(0.0, 0.16, s * 0.09); head.add(ear); const eye = mesh(new THREE.SphereGeometry(0.025, 6, 4), flat(0x1a1416)); eye.position.set(0.14, 0.04, s * 0.06); head.add(eye); }
  head.add(P(mesh(new THREE.SphereGeometry(0.07, 6, 4), wht), V(0.13, -0.05, 0)));
  for (const [x, z] of [[0.25, 0.12], [0.25, -0.12], [-0.25, 0.12], [-0.25, -0.12]]) CAT.add(P(mesh(limb(0.045, 0.04, 0.22, 5), fur), V(x, 0.22, z)));
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.38, 0.35, 0), V(-0.55, 0.5, 0), V(-0.6, 0.75, 0.05), V(-0.5, 0.9, 0.1)]), 20, 0.04, 5), fur); tail.castShadow = true; CAT.add(tail); CAT.tail = tail; }

// ---------------------------------------------------------------- the token line + the meaning map (a dark studio at x = -300)
const MP = V(-300, 0, 0), MAP = new THREE.Group(); MAP.position.copy(MP); scene.add(MAP);
{ MAP.add(new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), new THREE.MeshBasicMaterial({ color: 0x070a14, side: THREE.BackSide })));
  const grid = new THREE.GridHelper(80, 40, 0x1f3a6a, 0x13223a); grid.position.y = -0.01; MAP.add(grid); const k = new THREE.PointLight(0xcfe0ff, 120, 80, 1.2); k.position.set(0, 18, 14); MAP.add(k); }
const TOK = [["my", 0x7fb2ff], ["cat", 0xffb04a], ["st", 0xff6a8a], ["ole", 0xff6a8a], ["my", 0x7fb2ff], ["sand", 0x7fe08a], ["wich", 0x7fe08a]];
const IDS = ["1820", "9837", "301", "4412", "1820", "6521", "16274"];
const tile = (txt, col, w = 1.6) => { const m = new THREE.Group(); m.add(mesh(bbox(w, 0.9, 0.3, 0.1), flat(col, { roughness: 0.4 })));
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, 0.8), new THREE.MeshBasicMaterial({ transparent: true, map: textTex((g, cw, ch) => { g.fillStyle = "#0b0e16"; g.font = `900 ${txt.length > 4 ? 120 : 150}px D`; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.72); }, 512, 256) })); lab.position.z = 0.16; m.add(lab); return m; };
const TILES = TOK.map(([t, c]) => tile(t, c)); TILES.forEach((m) => MAP.add(m));
const NUMS = IDS.map((n) => tile(n, 0xc9d2e0, 1.7)); NUMS.forEach((m) => MAP.add(m));
// clusters: animals and food, plus a galaxy of other words
const LAB = (txt, col, x, y, z, s = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2 * s, 0.6 * s), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, map: textTex((g, w, h) => { g.fillStyle = col; g.font = "800 90px D"; g.textAlign = "center"; g.fillText(txt, w / 2, h * 0.75); }, 600, 140) })); m.position.set(x, y, z); MAP.add(m); return m; };
const STARS = []; for (let i = 0; i < 1400; i++) { const v = V((rnd() - 0.5) * 70, 1 + rnd() * 26, (rnd() - 0.5) * 70); STARS.push(v); }
const SG = new THREE.BufferGeometry().setFromPoints(STARS); const SPTS = new THREE.Points(SG, new THREE.PointsMaterial({ color: 0x8fb0ff, size: 0.18, transparent: true, opacity: 0.8, toneMapped: false })); MAP.add(SPTS);
const ANI = V(-7, 6, -4), FOOD = V(7, 9, -5);
const CL = [["cat", ANI, 0xffb04a], ["dog", ANI.clone().add(V(-1.6, 0.8, 0.5)), 0xffd08a], ["kitten", ANI.clone().add(V(1.1, -1.2, 0.8)), 0xffd08a], ["lion", ANI.clone().add(V(-0.6, -1.9, -0.6)), 0xffd08a],
  ["sandwich", FOOD, 0x7fe08a], ["lunch", FOOD.clone().add(V(1.6, 1.0, 0.4)), 0xb6f2be], ["bread", FOOD.clone().add(V(-1.4, -1.0, 0.6)), 0xb6f2be], ["pizza", FOOD.clone().add(V(1.0, -1.6, -0.4)), 0xb6f2be]];
const CLM = CL.map(([t, p, c]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), glow(c)); b.position.copy(p); MAP.add(b); const l = LAB(t, `#${new THREE.Color(c).getHexString()}`, p.x, p.y + 0.7, p.z, 0.9); return { b, l }; });
// attention: the token row, beams between all of them, thick ones from "stole"
const ROW = TOK.map((_, i) => V(-3.45 + i * 1.15, 3, 6));
const BEAMS = []; for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) { const strong = (i === 2 || i === 3) && (j === 5 || j === 6) || ((i === 1) && (j === 2 || j === 3));
  const a = ROW[i], b = ROW[j], mid = a.clone().add(b).multiplyScalar(0.5).add(V(0, 1 + (j - i) * 0.8, 0)); const c = new THREE.QuadraticBezierCurve3(a.clone().add(V(0, 0.5, 0)), mid, b.clone().add(V(0, 0.5, 0)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, 40, strong ? 0.09 : 0.025, 6), glow(strong ? 0xffd04a : 0x5a7aff, { transparent: true, opacity: 0 })); m.strong = strong; m.i = i; m.j = j; MAP.add(m); BEAMS.push(m); }
// guessing: probability bars over the row
const CANDS = [["Ha!", 0.46], ["Oh", 0.22], ["Classic", 0.14], ["Wait", 0.1], ["Sorry", 0.08]];
const BARS = CANDS.map(([t, p], i) => { const g = new THREE.Group(); g.position.set(-4 + i * 2, 0, -2); MAP.add(g); const bar = mesh(bbox(1.2, 1, 0.8, 0.08), new THREE.MeshStandardMaterial({ color: i === 0 ? 0x3dff8c : 0x5a7aff, emissive: i === 0 ? 0x0a5a2a : 0x101a4a, emissiveIntensity: 0.8, roughness: 0.4 })); bar.geometry.translate(0, 0.5, 0); g.add(bar); g.bar = bar; g.p = p;
  g.lab = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.5), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: textTex((gg, w, h) => { gg.fillStyle = "#fff"; gg.font = "800 80px D"; gg.textAlign = "center"; gg.fillText(`${t} ${Math.round(p * 100)}%`, w / 2, h * 0.75); }, 560, 130) })); g.add(g.lab); return g; });
const ANSWER = ["Ha!", "Classic", "cat", "move."]; const ANS = ANSWER.map((t) => { const m = tile(t, 0x3dff8c, 1.9); m.scale.setScalar(0.9); MAP.add(m); return m; });

// ---------------------------------------------------------------- Orbi: the file locks on the phone; the path in between only sees noise (x = 300)
const OB = V(300, 0, 0), OBS = new THREE.Group(); OBS.position.copy(OB); scene.add(OBS);
{ const gr = tinted(facet(new THREE.PlaneGeometry(120, 120, 14, 14).rotateX(-Math.PI / 2), 0.3), 0x55704a, 0.1); OBS.add(gr); const k = new THREE.PointLight(0xfff0dd, 220, 70, 1.3); k.position.set(2, 14, 12); OBS.add(k);
  OBS.add(new THREE.Mesh(new THREE.SphereGeometry(140, 24, 12), new THREE.MeshBasicMaterial({ color: 0x8fb8e8, side: THREE.BackSide })));
  for (let i = 0; i < 18; i++) { const t = tree(2.6, i % 2 ? "round" : "pine"); const a = rnd() * 6.28, d = 14 + rnd() * 20; t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); OBS.add(t); } }
const BIGP = new THREE.Group(); BIGP.position.set(-4, 3, 0); OBS.add(BIGP); BIGP.add(mesh(bbox(2.0, 4.0, 0.25, 0.3), flat(0x22252b, { roughness: 0.35, metalness: 0.3 })));
const BPS = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.7), new THREE.MeshBasicMaterial({ toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, w, h); g.fillStyle = "#3dff8c"; g.font = "800 60px D"; g.fillText("orbi", 30, 80); g.fillStyle = "#e9c46a"; g.fillRect(40, 160, w - 80, 300); g.fillStyle = "#0b0d10"; g.font = "800 50px M"; g.fillText("diary.pdf", 70, 330); }, 400, 820) })); BPS.position.z = 0.13; BIGP.add(BPS);
const LOCK = new THREE.Group(); BIGP.add(LOCK); LOCK.position.set(0, 0.2, 0.5); { const lm = flat(0x2fcf72, { emissive: 0x0a3a1a, emissiveIntensity: 0.3, roughness: 0.3 }); LOCK.add(P(mesh(bbox(1.0, 0.8, 0.3, 0.08), lm), V(0, -0.2, 0))); const sh = mesh(new THREE.TorusGeometry(0.32, 0.08, 6, 14, Math.PI), lm); sh.position.y = 0.2; LOCK.add(sh); LOCK.sh = sh; }
const NZ = textTex((g, w, h) => { const im = g.createImageData(w, h); for (let i = 0; i < im.data.length; i += 4) { const v = rnd(); im.data[i] = 30 + v * 80; im.data[i + 1] = 90 + v * 160; im.data[i + 2] = 70 + v * 90; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }, 48, 48); NZ.magFilter = THREE.NearestFilter;
const PKT = Array.from({ length: 10 }, (_, i) => { const m = mesh(bbox(0.5, 0.5, 0.5, 0.06), new THREE.MeshStandardMaterial({ map: NZ, emissive: 0x0c3a20, emissiveIntensity: 0.6 })); m.i = i; OBS.add(m); return m; });
const PEEK = person({ sex: "m", top: 0x2a2a2a, bottom: 0x2a2a2a, skin: 0xc98b62, hair: 0x111111, sunglasses: true, hat: 0x1a1a1a, hatBand: 0x1a1a1a }); PEEK.position.set(1.5, 0, 3); PEEK.rotation.y = -2.4; OBS.add(PEEK);
const MAG = new THREE.Group(); { MAG.add(P(mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 16), flat(0x2a2a2a)), V(0, 0, 0))); const gl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.35, roughness: 0.1 })); MAG.add(gl); MAG.add(P(mesh(limb(0.03, 0.03, 0.35, 5), flat(0x6a4428)), V(0, -0.22, 0))); } PEEK.rig.lElbow.add(MAG); MAG.position.set(0, -0.5, 0.08);
const QM = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#ff6a5a"; g.font = "900 220px D"; g.textAlign = "center"; g.fillText("???", w / 2, h * 0.8); }, 400, 300) })); OBS.add(QM);

// ---------------------------------------------------------------- world at time t
function world(t) {
  // the girl types; the cat sneaks up and takes the sandwich
  pose(GIRL, { phone: 1, look: -0.1 }); GIRL.rig.hips.position.y = 0.6; GIRL.rig.lHip.rotation.x = GIRL.rig.rHip.rotation.x = -1.45; GIRL.rig.lKnee.rotation.x = GIRL.rig.rKnee.rotation.x = 1.45; GIRL.rig.chest.rotation.x = -0.08;
  const look = win(t, wt("type", "stole") - 0.4, A("tokens"), 0.3, 0.4); GIRL.rig.head.rotation.y = look * 0.9; GIRL.rig.head.rotation.x = 0.28 * (1 - look);
  const typed = Math.floor(clamp((t - A("type") - 0.3) / 1.6) * MSG.length); const ansN = Math.floor(clamp((t - wt("guess", "again")) / 1.5) * 4);
  chat(typed, t > wt("guess", "answer") ? "Ha! Classic cat move." : ANSWER.slice(0, ansN).join(" "));
  const sneak = clamp((t - A("type")) / 2.4), grab = clamp((t - wt("type", "stole") + 0.3) / 0.4), run = clamp((t - wt("type", "stole") - 0.2) / 1.6);
  CAT.position.set(lerp(3.2, 1.25, ease(sneak)) - run * 4, 0, lerp(1.8, -0.55, ease(sneak)) + run * 3.5); CAT.rotation.y = run > 0 ? -2.4 : lerp(2.6, 2.5, sneak);
  CAT.head.position.y = 0.52 + (grab * (1 - run) * 0.12); CAT.tail.rotation.x = Math.sin(t * 6) * 0.2; CAT.position.y = Math.abs(Math.sin(t * 14)) * 0.04 * (run > 0 && run < 1 ? 1 : sneak > 0 && sneak < 1 ? 0.5 : 0);
  if (grab > 0.5) { CAT.updateMatrixWorld(true); const m = CAT.head.localToWorld(V(0.2, -0.08, 0)); SAND.position.copy(m); SAND.rotation.set(0.3, CAT.rotation.y, 0); } else { SAND.position.set(0.8, 0.56, -0.6); SAND.rotation.set(0, 0.4, 0); }
  // tokens: the sentence row splits, each chunk flips to its number
  const split = ease(clamp((t - wt("tokens", "chopped")) / 0.8)), toNum = clamp((t - wt("tokens", "number") + 0.2) / 0.6);
  TILES.forEach((m, i) => { const base = ROW[i].clone(), tight = V(-2.9 + i * 0.95, 3, 6); m.position.copy(tight.lerp(base, split)); m.position.y += Math.sin(t * 2 + i) * 0.05; m.rotation.set(0, 0, 0); m.scale.setScalar(0.62 * (1 - toNum) + 0.001); m.visible = t >= A("tokens") - 0.2 && t < A("map") + 0.2; });
  NUMS.forEach((m, i) => { m.position.copy(ROW[i]); m.position.y += Math.sin(t * 2 + i) * 0.05; m.scale.setScalar(0.62 * back(clamp(toNum * 1.3 - i * 0.05)) + 0.001); m.visible = TILES[i].visible && toNum > 0; });
  // the map: tokens fly to their spots; clusters light up; the galaxy turns
  const fly = ease(clamp((t - wt("map", "cat") + 0.2) / 1.0)), fly2 = ease(clamp((t - wt("map", "sandwich") + 0.2) / 1.0));
  SPTS.rotation.y = t * 0.03; SPTS.visible = t >= A("map") - 0.2 && t < A("attend") + 0.3;
  CLM.forEach(({ b, l }, i) => { const on = i < 4 ? fly : fly2; b.visible = l.visible = SPTS.visible; b.scale.setScalar(0.6 + on * 0.8 + 0.1 * Math.sin(t * 4 + i)); l.material.opacity = 0.35 + on * 0.65; l.lookAt(cam.position); });
  // attention: the row again, beams grow, the strong ones last
  const at = clamp((t - A("attend") - 0.2) / 1.2), st = clamp((t - wt("attend", "stole") + 0.1) / 0.6);
  if (t >= A("attend") - 0.2 && t < A("guess") + 0.2) TILES.forEach((m, i) => { m.visible = true; m.position.copy(ROW[i]); m.scale.setScalar(0.62); });
  BEAMS.forEach((m) => { const vis = t >= A("attend") && t < A("orbi"); m.visible = vis; m.material.opacity = m.strong ? Math.max(at * 0.35, st) : at * (1 - st * 0.7) * 0.5; });
  // guessing: bars rise, the winner is picked, words pile up into the answer
  BARS.forEach((g, i) => { const k = clamp((t - wt("guess", "guesses") - i * 0.08) / 0.6); g.visible = t >= A("guess") && t < A("orbi"); g.bar.scale.y = Math.max(0.01, g.p * 7 * ease(k)) * (1 + (i === 0 ? 0.05 * Math.sin(t * 8) : 0)); g.lab.position.set(0, g.p * 7 * ease(k) + 0.5, 0.5); g.lab.lookAt(cam.position); });
  ANS.forEach((m, i) => { const k = clamp((t - wt("guess", "again") - i * 0.45) / 0.4); m.visible = k > 0 && t < A("orbi"); m.position.set(-3.6 + i * 2.4, lerp(10, 9, back(k)), -2); m.scale.setScalar(0.9 * back(k)); });
  // Orbi: lock snaps on, scrambled pieces fly past the peeker, who sees only "???"
  const lk = clamp((t - wt("orbi", "locked") + 0.1) / 0.5); LOCK.visible = lk > 0; LOCK.scale.setScalar(back(lk) || 0.001); LOCK.sh.position.y = 0.2 + (1 - clamp((t - wt("orbi", "locked") - 0.4) / 0.3)) * 0.25;
  PKT.forEach((p) => { const k = clamp((t - wt("orbi", "before") - p.i * 0.1) / 1.6); p.visible = k > 0 && k < 1; p.position.set(lerp(-3, 14, k), 3 + Math.sin(k * Math.PI) * 2.2 + (p.i % 3) * 0.3, lerp(0.4, -2, k) + (p.i % 2) * 0.6); p.rotation.set(t * 2 + p.i, t * 3, 0); });
  pose(PEEK, { point: 0.0 }); PEEK.rig.lArm.rotation.x = -1.4; PEEK.rig.lElbow.rotation.x = -0.5; PEEK.rig.head.rotation.x = -0.2;
  const q = win(t, wt("orbi", "nobody") - 0.1, A("end"), 0.2, 0.2); QM.visible = q > 0; QM.position.set(1.2, 2.9 + Math.sin(t * 3) * 0.08, 3.1); QM.scale.setScalar(back(clamp((t - wt("orbi", "nobody")) / 0.3)) || 0.001); QM.lookAt(cam.position);
}

// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const o = (b) => (x, y, z) => V(b.x + x, b.y + y, b.z + z), m = o(MP), ob = o(OB);
// hook: the room, push in on the girl and her phone
shot(0, 2.4, V(5, 3.4, 7), V(-0.8, 1.0, -1.8), 44, V(3, 2.4, 4.5), V(-1.2, 1.1, -2.0), 40);
shot(wt("hook", "reads") - 0.1, 2.0, V(-0.6, 1.7, 0.4), V(-1.55, 1.3, -2.2), 40, V(-0.8, 1.65, -0.2), V(-1.55, 1.3, -2.2), 36);
// type: the message, and the cat sneaking in for the sandwich
shot(A("type"), 1.6, V(-1.2, 2.2, -0.9), V(-1.5, 1.2, -2.15), 40, V(-1.25, 2.0, -1.2), V(-1.5, 1.2, -2.15), 36);
shot(wt("type", "cat") - 0.1, 1.6, V(4.5, 1.0, 4.5), V(1.6, 0.4, -0.2), 44, V(4.0, 0.9, 4.0), V(1.3, 0.45, -0.4), 42);
shot(wt("type", "stole") - 0.15, 1.4, V(2.6, 1.3, 2.6), V(0.9, 0.55, -0.5), 42, V(2.3, 1.2, 2.2), V(0.7, 0.5, -0.3), 40);
shot(wt("type", "to", 1) - 0.1, 2.6, V(4, 2.5, 6), V(-0.5, 0.8, -1), 46, V(2.5, 2.0, 5), V(-0.5, 0.8, -0.5), 46);
// tokens: the sentence breaks into chunks, then numbers
shot(A("tokens"), 1.8, m(0, 3.4, 18), m(0, 3, 6), 46, m(0, 3.3, 16), m(0, 3, 6), 46);
shot(wt("tokens", "little") - 0.1, 1.6, m(-2.5, 3.5, 12), m(-1.2, 3, 6), 40, m(-1, 3.4, 12), m(0, 3, 6), 40);
shot(wt("tokens", "number") - 0.2, 2.0, m(2.5, 4.2, 16), m(0, 3, 6), 44, m(3.2, 3.8, 15), m(0, 3, 6), 44);
// map: zoom out into the galaxy of meaning, then the two clusters
shot(A("map"), 2.4, m(0, 4, 13), m(0, 6, 0), 50, m(0, 22, 40), m(0, 8, -2), 55);
shot(wt("map", "cat") - 0.1, 1.8, m(-4, 7, 6), ANI.clone().add(MP), 40, m(-5, 6.5, 4), ANI.clone().add(MP), 38);
shot(wt("map", "sandwich") - 0.1, 1.8, m(4, 10, 5), FOOD.clone().add(MP), 40, m(5, 9.5, 3), FOOD.clone().add(MP), 38);
// attend: the row of words, the web of beams, the strong links
shot(A("attend"), 2.0, m(0, 7, 18), m(0, 4.2, 6), 46, m(0, 6, 16), m(0, 4.2, 6), 46);
shot(wt("attend", "stole") - 0.2, 2.4, m(-2, 4.6, 14), m(0.6, 4.2, 6), 44, m(1.5, 4.6, 14), m(1.2, 4.2, 6), 44);
// guess: bars rise, the answer stacks up
shot(A("guess"), 2.2, m(0, 5, 14), m(0, 2.5, -2), 50, m(-2, 4, 11), m(-1, 2.5, -2), 48);
shot(wt("guess", "next") - 0.1, 2.0, m(-3, 2, 6), m(-4, 2.6, -2), 44, m(-2.5, 2.4, 5), m(-4, 3, -2), 42);
shot(wt("guess", "again") - 0.1, 2.4, m(0, 9, 10), m(0, 9, -2), 46, m(0, 9.5, 9), m(0, 9.2, -2), 46);
shot(wt("guess", "answer") - 0.2, 1.4, V(-1.2, 2.2, -0.9), V(-1.5, 1.2, -2.15), 40, V(-1.25, 2.0, -1.2), V(-1.5, 1.2, -2.15), 36);
// orbi
shot(A("orbi"), 1.8, ob(2, 4, 12), ob(-3, 3, 0), 46, ob(0, 3.5, 10), ob(-3, 3, 0), 44);
shot(wt("orbi", "locked") - 0.1, 1.6, ob(-2.5, 3.6, 5), ob(-4, 3, 0), 40, ob(-3, 3.4, 4.2), ob(-4, 3, 0), 38);
shot(wt("orbi", "before") - 0.1, 2.0, ob(4, 5, 12), ob(4, 3, 0), 50, ob(6, 5, 12), ob(6, 3, 0), 50);
shot(wt("orbi", "nobody") - 0.15, 2.4, ob(3.5, 2.6, 7.5), ob(1.4, 2.4, 3), 42, ob(3.0, 2.5, 6.6), ob(1.3, 2.5, 3), 40);
const camAt = camRig(cam);

// ---------------------------------------------------------------- overlays
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
const big = (txt, t, a0, b0, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a0 || t > b0) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a0) / 0.12) * clamp((b0 - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a0) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  big("THE CAT!", t, wt("type", "stole") + 0.1, wt("type", "to", 1) - 0.1, "#ffb04a", 300, 130);
  tag("tA", `words → <b>tokens</b>`, t, wt("tokens", "chopped"), wt("tokens", "number") - 0.05);
  tag("tA", `each token → <b>a number</b> <i>(example ids)</i>`, t, wt("tokens", "number"), A("map") - 0.05);
  tag("tA", `a map of <b>meaning</b>`, t, A("map") + 0.3, A("attend") - 0.05);
  tag("tA", `every word <b>looks at</b> every word`, t, A("attend") + 0.2, wt("attend", "stole") - 0.05);
  tag("tA", `stole → <b>cat</b> · <b>sandwich</b>`, t, wt("attend", "stole"), A("guess") - 0.05);
  tag("tA", `most likely <b>next piece</b>`, t, wt("guess", "next") - 0.1, wt("guess", "again") - 0.05);
  tag("tA", `one piece <b>at a time</b>`, t, wt("guess", "again"), A("orbi") - 0.05);
  tag("tA", `locked <b>on your phone</b>`, t, wt("orbi", "locked"), wt("orbi", "nobody") - 0.05);
  tag("tA", `on the way · <i>only scrambled bytes</i>`, t, wt("orbi", "nobody"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camAt(SH, t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
