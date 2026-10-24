// Improved follower video: follow Orbi and a little you joins the island party (Instagram / TikTok via ?p=ig|tt).
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


// ---------------------------------------------------------------- the new followers: "you" in four looks, then a stream of new people
const P = new URLSearchParams(location.search).get("p") || "ig";
$("handle").textContent = P === "tt" ? "Follow @orbi.transfer on TikTok" : "Follow @orbitransfer on Instagram";
const YOUSPOT = V(1.6, 0, 4.2);
const LOOKS = [{ sex: "m", top: 0xffffff, bottom: 0x2b2b2b }, { sex: "m", top: 0x4fc3bd, bottom: 0x2b3a55, glasses: true }, { sex: "m", top: 0xf08a5d, bottom: 0x3a4a6a, glasses: true, hat: 0xe8d6a8 }, { sex: "m", top: 0x3dff8c, bottom: 0x1f2d6b, sunglasses: true, hat: 0x2a2a2a, hatBand: 0x3dff8c }]
  .map((o) => { const p = person({ skin: 0xe0a982, hair: 0x5a3a26, shortSleeve: true, ...o }); p.position.copy(YOUSPOT); scene.add(p); return p; });
const BEAM = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 16, 1, true), glow(0x3dff8c, { transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); scene.add(BEAM);
const NEWP = Array.from({ length: 16 }, (_, i) => { const p = extra(i + 60); const a = rnd() * Math.PI * 2, r = 3 + rnd() * 6; p.position.set(Math.cos(a) * r, 0, -2 + Math.sin(a) * r * 0.8); p.userData = { ph: rnd(), at: 0, face: Math.atan2(-p.position.x, -2 - p.position.z) }; scene.add(p); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 10, 1, true), glow(0x3dff8c, { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); b.position.copy(p.position).setY(15); scene.add(b); p.beam = b; return p; });
// the x-ray phone over the fire (the "how tech works" beat) and a big follow button
const XPH = new THREE.Group(); scene.add(XPH); const XB = new THREE.Group(); XPH.add(XB);
XB.add(mesh(bbox(1.2, 2.4, 0.14, 0.16), flat(0x2a2d34, { roughness: 0.3, metalness: 0.4 })));
const CHIPS = []; for (let i = 0; i < 7; i++) { const c = mesh(bbox(0.3 + (i % 2) * 0.2, 0.2 + (i % 3) * 0.12, 0.05, 0.02), flat([0x2f6b4a, 0x3a3f4a, 0xb08a3a][i % 3], { emissive: 0x0a3a1c, emissiveIntensity: 0.5 })); c.position.set(-0.35 + (i % 3) * 0.35, -0.8 + Math.floor(i / 3) * 0.55, 0); XPH.add(c); CHIPS.push(c); }
const XR = xray(XB);
const BTN = new THREE.Group(); scene.add(BTN);
{ const base = mesh(bbox(3.2, 1.0, 0.5, 0.45), flat(0x3dff8c, { emissive: 0x0a5a2a, emissiveIntensity: 0.5, roughness: 0.4 })); BTN.add(base); BTN.base = base;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: textTex((g, w, h) => { g.fillStyle = "#03140a"; g.font = "900 120px D"; g.textAlign = "center"; g.fillText("FOLLOW", w / 2, h * 0.72); }, 512, 128) })); lab.position.z = 0.26; base.add(lab); }

function world(t) {
  SEA.wave(t); FIRE.tick(t);
  ALL.forEach((p) => { const u = p.userData; if (p === SAM) pose(SAM, { walk: t * 0.8, speed: 0.15 }); else { pose(p, { walk: t * 0.9 + u.ph, speed: u.amp }); p.rotation.y = u.face; } p.ping.visible = false; p.phone.scr.material.color.set(0x0b0d10); });
  pose(LENA, { walk: t * 0.7, speed: 0.15 });
  // you drop in on a green beam, then change looks on the beat, then dance
  const drop = clamp((t - wt("spot", "you") + 0.3) / 0.7), look = t < wt("style", "glasses") ? 0 : t < wt("style", "hat") ? 1 : t < wt("style", "your") ? 2 : 3;
  LOOKS.forEach((p, i) => { p.visible = i === look && drop > 0; p.position.set(YOUSPOT.x, (1 - out(drop)) * 9, YOUSPOT.z); p.rotation.y = t < A("style") ? 0.2 : Math.sin(t * 2) * 0.4 + 0.2;
    pose(p, { walk: t * 1.6, speed: t > wt("style", "dancing") ? 0.5 : 0.1, wave: t > A("cta") ? win(t, A("cta"), A("end"), 0.3, 0.3) : 0, cheer: t > wt("style", "dancing") && t < A("grow") ? 0.6 + 0.3 * Math.sin(t * 6) : 0 }); });
  BEAM.position.set(YOUSPOT.x, 15, YOUSPOT.z); BEAM.visible = drop > 0 && drop < 1 || win(t, wt("spot", "you") - 0.3, wt("spot", "you") + 1.2, 0.1, 0.4) > 0; BEAM.material.opacity = 0.3 * win(t, wt("spot", "you") - 0.3, wt("spot", "you") + 1.2, 0.1, 0.4);
  // the party grows: one new person after another
  NEWP.forEach((p, i) => { const at = A("grow") + 0.2 + i * (L.grow.dur / 16), k = clamp((t - at) / 0.5); p.visible = k > 0; p.position.y = (1 - out(k)) * 8; pose(p, { walk: t * 1.2 + p.userData.ph, speed: 0.4, cheer: k < 1 ? 1 : 0 }); p.rotation.y = p.userData.face; p.beam.material.opacity = 0.35 * win(t, at - 0.15, at + 0.8, 0.1, 0.3); p.beam.visible = p.beam.material.opacity > 0.01; });
  // x-ray phone over the fire
  const xk = win(t, A("learn"), A("cta"), 0.4, 0.3); XPH.visible = xk > 0; XPH.position.set(0, 3.4 + Math.sin(t * 1.5) * 0.1, -2); XPH.rotation.y = (t - A("learn")) * 0.7; XPH.scale.setScalar(back(clamp((t - A("learn")) / 0.5)) || 0.001); XR(clamp((t - wt("learn", "tech")) / 0.6));
  CHIPS.forEach((c, i) => { c.position.z = clamp((t - wt("learn", "really") - i * 0.05) / 0.5) * (0.4 + (i % 3) * 0.25); c.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(t * 8 + i); });
  // the follow button
  const bk = clamp((t - A("cta")) / 0.5); BTN.visible = t >= A("cta") && t < A("end"); BTN.position.set(-0.6, 3.1, 3.6); BTN.scale.setScalar((back(bk) || 0.001) * 0.7); BTN.lookAt(cam.position); const press = win(t, wt("cta", "follow"), wt("cta", "follow") + 0.35, 0.05, 0.2); BTN.base.position.z = -press * 0.2; BTN.base.material.emissiveIntensity = 0.5 + press * 2;
}

const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const Y = () => YOUSPOT;
shot(0, 2.4, V(40, 34, 60), V(0, 0, -3), 42, V(14, 8, 24), V(0, 1, -2), 40);
shot(wt("hook", "follow") - 0.1, 1.6, V(-5, 1.0, 7), V(0, 1.6, -2), 46, V(-4, 1.2, 6), V(0, 1.7, -2), 44);
shot(A("spot"), 1.8, V(8, 4, 13), V(1.6, 2, 4.2), 40, V(6, 3, 11), V(1.6, 1.5, 4.2), 38);
shot(wt("spot", "tiny") - 0.1, 2.4, V(2.2, 1.7, 8.4), V(1.6, 1.3, 4.2), 36, V(2.0, 1.65, 7.4), V(1.6, 1.35, 4.2), 34);
shot(A("style"), 0.9, V(1.75, 1.75, 6.0), V(1.6, 1.68, 4.2), 34, V(1.72, 1.74, 5.7), V(1.6, 1.68, 4.2), 32);
shot(wt("style", "hat"), 0.9, V(2.6, 2.3, 6.2), V(1.6, 1.75, 4.2), 36, V(2.4, 2.2, 5.9), V(1.6, 1.75, 4.2), 34);
shot(wt("style", "your"), 1.0, V(0.4, 1.2, 8.0), V(1.6, 1.0, 4.2), 42, V(0.7, 1.1, 7.4), V(1.6, 1.0, 4.2), 40);
shot(wt("style", "dancing"), 1.6, V(4.5, 2.2, 7), V(1, 1, 2), 44, V(3.5, 2.4, 6.5), V(0.8, 1, 1.5), 44);
shot(A("grow"), 3.6, V(0.5, 24, 12), V(0, 0, -1), 46, V(0.5, 17, 9), V(0, 0, -1), 50, 0.01);
shot(A("learn"), 1.6, V(5, 4.2, 10), V(0, 3.2, -2), 42, V(4, 4.0, 9), V(0, 3.2, -2), 40);
shot(wt("learn", "tech"), 2.0, V(-2.2, 4.0, 5.5), V(0, 3.3, -2), 40, V(-1.6, 3.8, 4.6), V(0, 3.3, -2), 38);
shot(wt("learn", "really") - 0.1, 1.4, V(2.6, 3.8, 4.4), V(0, 3.3, -2), 40, V(2.0, 3.6, 3.8), V(0, 3.3, -2), 38);
shot(A("cta"), 1.4, V(0.4, 2.4, 12.5), V(-0.3, 2.2, 3.6), 40, V(0.3, 2.6, 11), V(-0.3, 2.4, 3.6), 40);
shot(wt("cta", "save") - 0.1, 2.0, V(4, 2.0, 8), V(1.6, 1.3, 4.2), 40, V(3.2, 1.8, 7), V(1.6, 1.4, 4.2), 36);
const camAt = camRig(cam);

// ---------------------------------------------------------------- overlays
const project = (v) => { cam.updateMatrixWorld(); const pp = v.clone().project(cam); return [(pp.x + 1) / 2 * W, (1 - pp.y) / 2 * H, pp.z < 1]; };
const tag = (id, html, t, a, b, y = 170) => { if (t < a || t > b) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a, b, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a) / 0.3))) * 24}px)` }); };
const lbl = (id, pos, t, a, b, html, col = "#3dff8c") => { if (t < a || t > b) return; const [x, y, ok] = project(pos); if (!ok) return; const el = $(id); el.innerHTML = html; S(el, { left: `${x}px`, top: `${y}px`, borderColor: col, color: col, opacity: win(t, a, b, 0.25, 0.25) }); };
const big = (txt, t, a, b, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a || t > b) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a) / 0.12) * clamp((b - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
const card = (id, html, t, a, b, x, y, rot = 0) => { if (t < a || t > b) return; const el = $(id); el.innerHTML = html; const k = clamp((t - a) / 0.3); S(el, { left: `${x}px`, top: `${y}px`, opacity: k * clamp((b - t) / 0.3), transform: `scale(${lerp(0.5, 1, back(k))}) rotate(${rot}deg)` }); };
function overlays(t) {
  for (const id of ["tA", "tB", "c0", "c1", "big", "you", "flash"]) S($(id), { opacity: 0 });
  big("FOLLOW = ?", t, wt("hook", "follow"), A("spot") - 0.05, "#3dff8c", 320, 130);
  if (t > wt("spot", "you") + 0.2 && t < A("grow") + 0.5) { const p = LOOKS[0]; const [x, y, ok] = project(V(YOUSPOT.x, p.position.y + 2.2, YOUSPOT.z)); if (ok) S($("you"), { left: `${x}px`, top: `${y}px`, opacity: win(t, wt("spot", "you") + 0.2, A("grow") + 0.5, 0.2, 0.3) }); }
  tag("tA", `glasses · <b>hat</b> · your colour`, t, A("style"), A("grow") - 0.05, 200);
  if (t >= A("grow") && t < A("learn")) { const n = Math.min(16, Math.floor((t - A("grow") - 0.2) / (L.grow.dur / 16)) + 1); big(`+${Math.max(1, n)}`, t, A("grow") + 0.2, A("learn") - 0.05, "#3dff8c", 300, 150, 0); }
  tag("tA", `how the tech <b>really works</b>`, t, wt("learn", "tech"), A("cta") - 0.05, 200);
  $("sub").textContent = ""; let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camAt(SH, t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
