// Improved Film 08: why photos get blurry in chats (8×8 blocks → patterns → the finest ones thrown away → squeezed
// twice → blocky edges), then Orbi: the original file, byte for byte, locked on your phone, full quality on theirs.
import { THREE, stage, lights, person, pose, tree, rock, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, cloud, sea, textTex, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const label = (txt, col = "#fff", w = 2.4, h = 0.6, font = "800 90px D", bg = null) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, map: textTex((g, cw, ch) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } g.fillStyle = col; g.font = font; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.74); }, 640, Math.round(640 * h / w)) }));

reseed(808);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0xf2a46a, fog: [0xf3b48e, 70, 320], bloom: 0.4, exposure: 1.05 });
const SUN = V(-10, 6, -40);
const LT = lights(scene, { key: 0xffc896, keyI: 2.4, sky: 0xffdcc4, ground: 0x6a4a3a, fillI: 1.05, rim: 0xa9b8ff, rimI: 0.7, at: V(-14, 9, -20), area: 16 });
const SKY = sky(0x34488f, 0xf59660, 0xf9c99a); SKY.u.sun.value.copy(SUN).normalize(); SKY.u.sunSize.value = 0.05; scene.add(SKY);

// ---------------------------------------------------------------- the beach at sunset (origin)
const BEACH = new THREE.Group(); scene.add(BEACH);
{ const sand = tinted(facet(new THREE.PlaneGeometry(60, 30, 20, 10).rotateX(-Math.PI / 2), 0.15), 0xf0d29a, 0.08); sand.position.set(0, 0, 8); BEACH.add(sand);
  for (let i = 0; i < 10; i++) { const t = tree(3.4 + (i % 3) * 0.5, "palm"); t.position.set(-14 + i * 3.2, 0, 14 + (i % 2) * 3); t.rotation.y = i; BEACH.add(t); }
  for (let i = 0; i < 12; i++) { const k = rock(0.4 + rnd() * 0.6, 0x8f8a84); k.position.set(-20 + rnd() * 40, 0.05, -4 + rnd() * 2); BEACH.add(k); }
  for (let i = 0; i < 8; i++) { const c = cloud(6 + rnd() * 5, 0xffe2d4); c.position.set(-100 + rnd() * 200, 20 + rnd() * 25, -150 - rnd() * 60); scene.add(c); } }
const SEA = sea(200, 70, 0x2f86b8, 0.18); SEA.position.set(0, -0.2, -80); scene.add(SEA);
const BOAT = new THREE.Group(); BOAT.position.set(6, 0, -30); scene.add(BOAT); { const hull = tinted(facet(new THREE.CylinderGeometry(1.2, 0.6, 5, 8, 1), 0.05), 0xffffff, 0.04); hull.rotation.set(Math.PI / 2, 0, 0); hull.scale.set(1, 1, 0.45); hull.position.y = 0.3; BOAT.add(hull); BOAT.add(P(mesh(limb(0.06, 0.05, 4.5, 6), flat(0x7a5a3a)), V(0, 4.8, 0))); const sail = mesh(new THREE.ConeGeometry(1.6, 4, 3), flat(0xfff4e8)); sail.scale.z = 0.05; sail.position.set(0.8, 2.8, 0); BOAT.add(sail); }
const ME = person({ sex: "m", top: 0x4fc3bd, bottom: 0xc9b38a, skin: 0xc98b62, hair: 0x111111, shortSleeve: true, shorts: true, sunglasses: true }); ME.position.set(0, 0, 6); ME.rotation.y = Math.PI; scene.add(ME);
const MPH = new THREE.Group(); MPH.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const MSC = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ toneMapped: false })); MSC.position.z = 0.007; MPH.add(MSC); ME.rig.rElbow.add(MPH); MPH.position.set(0, -0.4, 0.035); MPH.rotation.set(-0.15, 0, Math.PI);

// ---------------------------------------------------------------- the photo, rendered once from his phone
const PHOTO = document.createElement("canvas"); PHOTO.width = 768; PHOTO.height = 576;
const PTEX = new THREE.CanvasTexture(PHOTO); PTEX.colorSpace = THREE.SRGBColorSpace;
// a squeezed copy (blocky): draw small, then big with no smoothing; plus 8×8 block seams
function blocky(src, level) { const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; const g = c.getContext("2d"); const s = document.createElement("canvas"); const f = level === 1 ? 6 : 14; s.width = Math.round(src.width / f); s.height = Math.round(src.height / f); const sg = s.getContext("2d"); sg.drawImage(src, 0, 0, s.width, s.height); g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, c.width, c.height);
  // a little banding: posterize
  const im = g.getImageData(0, 0, c.width, c.height), q = level === 1 ? 24 : 48; for (let i = 0; i < im.data.length; i += 4) for (let k = 0; k < 3; k++) im.data[i + k] = Math.round(im.data[i + k] / q) * q; g.putImageData(im, 0, 0); return c; }
let B1, B2, T1, T2;
// phone screens (his phone: camera then gallery; the two receiving phones)
const scr = (w = 432, h = 930) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, g: c.getContext("2d"), t }; };
const MS = scr(); MSC.material.map = MS.t;
function drawPhone(S0, img, title, col, extra) { const { g, c, t } = S0; g.fillStyle = "#0e1016"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = col; g.font = "800 40px D"; g.fillText(title, 30, 80); if (img) { const w = c.width - 40, h = w * 3 / 4; g.drawImage(img, 20, 160, w, h); } if (extra) extra(g, c); t.needsUpdate = true; }

// ---------------------------------------------------------------- the photo studio (x = -300): zoom into pixels, 8×8 blocks lift, patterns
const ST = V(-300, 0, 0), STU = new THREE.Group(); STU.position.copy(ST); scene.add(STU);
{ STU.add(new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), new THREE.MeshBasicMaterial({ color: 0x0a0f18, side: THREE.BackSide, fog: false }))); const k = new THREE.PointLight(0xffffff, 110, 120, 1.0); k.position.set(0, 10, 30); STU.add(k); }
const BIG = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshBasicMaterial({ map: PTEX, toneMapped: false })); BIG.position.set(0, 8, 0); STU.add(BIG);
// the pixel grid that appears as you zoom in
const GRID = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, map: textTex((g, w, h) => { g.strokeStyle = "rgba(0,0,0,0.55)"; g.lineWidth = 1; for (let x = 0; x <= w; x += 8) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); } for (let y = 0; y <= h; y += 8) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); } g.strokeStyle = "#3dff8c"; g.lineWidth = 3; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, 2048, 1536) }));
GRID.material.map.repeat.set(1, 1); GRID.position.set(0, 8, 0.02); STU.add(GRID);
// blocks: a 6 × 4 patch of the photo lifts out as cubes (each shows its own piece of the photo)
const BLK = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const geo = new THREE.BoxGeometry(1, 1, 0.3); const uv = geo.attributes.uv; const u0 = (6 + i) / 16, v0 = (5 + j) / 12; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 16, v0 + uv.getY(k) / 12);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: PTEX, toneMapped: false })); m.home = V(-8 + 6.5 + i, 8 - 6 + 5.5 + j, 0.2); m.i = i; m.j = j; STU.add(m); BLK.push(m); }
// the 64 patterns of one block (smooth top-left → super fine bottom-right)
const PAT = []; for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) { const t = textTex((g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * w)) * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * h)); const k = (y * w + x) * 4, val = 128 + c * 120; im.data[k] = val * 0.9; im.data[k + 1] = val; im.data[k + 2] = val * 1.05; im.data[k + 3] = 255; } g.putImageData(im, 0, 0); }, 32, 32); t.magFilter = THREE.NearestFilter;
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.12), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.u = u; m.v = v; m.home = V(-3.5 + u, 13 - v, 0.5); m.fine = u + v >= 7; STU.add(m); PAT.push(m); }
const BIN = new THREE.Group(); BIN.position.set(7, 2.2, 2); STU.add(BIN); BIN.add(P(mesh(new THREE.CylinderGeometry(1.6, 1.3, 3.2, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a6a7a, side: THREE.DoubleSide, roughness: 0.6 })), V(0, 0, 0))); BIN.add(P(label("THROWN AWAY", "#ffffff", 3, 0.5, "900 90px D", "#c03a2a"), V(0, 0.4, 1.62)));
const SQ = new THREE.Group(); STU.add(SQ); SQ.add(mesh(bbox(3.2, 4, 0.5, 0.2), flat(0xb08a2a, { roughness: 0.7 }))); SQ.add(P(label("sunset.jpg", "#0b0d10", 2.8, 0.6, "900 120px M"), V(0, -1.0, 0.27)));
// ---------------------------------------------------------------- chat vs Orbi (x = 300): two phones side by side, bytes flying, a twin check
const CP = V(300, 0, 0), CMP = new THREE.Group(); CMP.position.copy(CP); scene.add(CMP);
{ CMP.add(new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), new THREE.MeshBasicMaterial({ color: 0x101420, side: THREE.BackSide, fog: false }))); const fl = tinted(new THREE.CircleGeometry(40, 24).rotateX(-Math.PI / 2), 0x1a2030, 0.06); CMP.add(fl); const k = new THREE.PointLight(0xffffff, 260, 80, 1.1); k.position.set(0, 12, 16); CMP.add(k); }
const bigPhone = (x) => { const g = new THREE.Group(); g.position.set(x, 5, 0); CMP.add(g); g.add(mesh(bbox(3.6, 7.6, 0.4, 0.5), flat(0x22252b, { roughness: 0.35, metalness: 0.3 }))); const sc = scr(); const p = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 7.1), new THREE.MeshBasicMaterial({ map: sc.t, toneMapped: false })); p.position.z = 0.21; g.add(p); g.S = sc; return g; };
const CHAT = bigPhone(-2.4), ORB = bigPhone(2.4);
const BYTES = Array.from({ length: 14 }, (_, i) => { const m = mesh(bbox(0.4, 0.4, 0.4, 0.06), new THREE.MeshStandardMaterial({ color: 0x3dff8c, emissive: 0x0a5a2a, emissiveIntensity: 0.9 })); m.i = i; CMP.add(m); return m; });
const EQ = label("= original", "#3dff8c", 4, 0.8, "900 120px D"); EQ.position.set(2.4, 10, 0.5); CMP.add(EQ);

// ---------------------------------------------------------------- world
function world(t) {
  SEA.wave(t); pose(ME, { phone: 1 }); ME.rig.rArm.rotation.x = lerp(ME.rig.rArm.rotation.x, -1.35, clamp((t - A("scene")) / 0.6)); ME.rig.rElbow.rotation.x = lerp(-1.5, -0.35, clamp((t - A("scene")) / 0.6));
  drawPhone(MS, PHOTO, t < wt("scene", "twelve") ? "" : "12 MP", "#fff");
  // studio: zoom grid fades in; blocks lift; patterns appear; fine ones fly to the bin; the file squeezes
  GRID.material.opacity = clamp((t - A("blocks") - 0.2) / 0.6) * (t < A("waves") ? 1 : 0);
  const lift = ease(clamp((t - wt("blocks", "chopped") + 0.1) / 1.0));
  BLK.forEach((b) => { b.visible = t >= A("blocks") && t < A("waves") + 0.2; const ex = b.home.clone(); ex.z += lift * (1.5 + (b.i + b.j) * 0.15); ex.x += (b.i - 2.5) * 0.35 * lift; ex.y += (b.j - 1.5) * 0.35 * lift; b.position.copy(ex); b.rotation.y = lift * 0.25 * Math.sin(b.i + b.j); });
  PAT.forEach((p) => { const k = clamp((t - A("waves") - 0.2 - (p.u + p.v) * 0.05) / 0.35), toss = clamp((t - wt("toss", "thrown") + 0.3 - (p.u + p.v - 7) * 0.08) / 0.9); p.visible = k > 0 && t < A("chat") && (!p.fine || toss < 1);
    const pos = p.home.clone(); if (p.fine && toss > 0) { const bin = BIN.position.clone().add(V(0, 0.6, 0)); pos.lerp(bin, ease(toss)); pos.y += Math.sin(toss * Math.PI) * 3; } p.position.copy(pos); p.scale.setScalar(back(k) || 0.001); p.rotation.z = p.fine ? toss * 4 : 0;
    p.material.color.setScalar(t > wt("toss", "finest") - 0.1 && t < wt("toss", "thrown") && p.fine ? 0.5 + 0.5 * Math.abs(Math.sin(t * 10)) : 1); });
  BIN.visible = t >= A("toss") - 0.2 && t < A("chat"); const sq = clamp((t - wt("toss", "squeeze") + 0.1) / 0.6); SQ.visible = t >= wt("toss", "squeeze") - 0.2 && t < A("chat"); SQ.position.set(-6.5, 4, 2); SQ.scale.set(lerp(1, 0.7, back(sq)), lerp(1, 0.45, back(sq)), 1);
  BIG.visible = GRID.visible = t < A("waves");
  // chat vs Orbi: the chat phone shows the photo squeezed once, then twice; the Orbi phone shows the original
  const twice = t > wt("chat", "twice") - 0.1;
  drawPhone(CHAT.S, t < A("chat") + 0.5 ? PHOTO : twice ? B2 : B1, "chat", "#9aa", (g) => { g.fillStyle = twice ? "#ff6a5a" : "#ffb03a"; g.font = "800 30px M"; g.fillText(twice ? "squeezed twice" : "squeezed", 30, 860); });
  drawPhone(ORB.S, t > wt("orbi", "byte") ? PHOTO : null, "orbi", "#3dff8c", (g) => { if (t > wt("orbi", "byte")) { g.fillStyle = "#3dff8c"; g.font = "800 30px M"; g.fillText("original · full quality", 30, 860); } });
  ORB.visible = t >= A("orbi") - 0.3; CHAT.position.x = t >= A("orbi") - 0.3 ? -2.4 : 0; CHAT.rotation.y = Math.sin(t * 0.8) * 0.08; ORB.rotation.y = -Math.sin(t * 0.8) * 0.08;
  BYTES.forEach((b) => { const k = clamp((t - A("orbi") - 0.3 - b.i * 0.08) / 1.0); b.visible = k > 0 && k < 1; b.position.set(lerp(-9, 2.4, ease(k)), 5 + Math.sin(k * Math.PI) * 4 + (b.i % 3) * 0.4, 1 + (b.i % 2) * 0.5); b.rotation.set(t * 2 + b.i, t * 3, 0); });
  EQ.visible = t > wt("orbi", "byte") + 0.2 && t < A("end"); EQ.scale.setScalar(back(clamp((t - wt("orbi", "byte") - 0.2) / 0.3)) || 0.001);
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const o = (b) => (x, y, z) => V(b.x + x, b.y + y, b.z + z), st = o(ST), cp = o(CP);
shot(0, 2.6, V(4, 2.4, 12), V(0, 1.6, 2), 46, V(2.5, 2.0, 9.5), V(0, 1.6, 2), 44);
SH.push({ at: wt("hook", "blurry") - 0.1, dur: 2.2, track: MPH, d0: 1.0, d1: 0.45, side: 0.15, lift: 0.25, fov: 38 });
shot(A("scene"), 1.8, V(1.4, 1.8, 7.8), V(0, 1.5, -10), 50, V(0.9, 1.75, 7.2), V(0, 1.4, -12), 48);
SH.push({ at: wt("scene", "twelve") - 0.1, dur: 2.0, track: MPH, d0: 0.5, d1: 0.36, side: 0.05, lift: 0.1, fov: 36 });
shot(A("blocks"), 2.2, st(0, 8, 34), st(0, 8, 0), 46, st(0.5, 7.8, 16), st(0.5, 7.6, 0), 44);
shot(wt("blocks", "chopped") - 0.1, 2.4, st(-5, 9, 14), st(0.5, 7.6, 1), 44, st(-3, 8.5, 13), st(0.5, 7.6, 1.2), 44);
shot(A("waves"), 2.4, st(0, 9.5, 24), st(0, 9.5, 0), 46, st(1.5, 9.5, 21), st(0, 9.5, 0), 46);
shot(wt("waves", "smooth") - 0.1, 2.0, st(-2, 11.5, 10), st(-2, 11.5, 0), 40, st(2, 7.5, 10), st(2, 7.5, 0), 40);
shot(A("toss"), 2.0, st(3, 8, 20), st(2, 8, 0), 46, st(4, 8, 21), st(3, 7, 0), 46);
shot(wt("toss", "thrown") - 0.3, 2.0, st(9, 6, 19), st(5, 5, 2), 48, st(10, 6, 18), st(6.5, 4, 2), 46);
shot(wt("toss", "squeeze") - 0.2, 1.6, st(-6.5, 4.5, 13), st(-6.5, 4, 2), 42, st(-6.5, 4.4, 12), st(-6.5, 4, 2), 40);
shot(A("chat"), 2.2, cp(0, 5.5, 14), cp(0, 5, 0), 44, cp(0, 5.2, 11), cp(0, 5, 0), 42);
shot(wt("chat", "twice") - 0.2, 2.6, cp(0.3, 5.6, 7), cp(0, 5.4, 0), 40, cp(0.2, 5.8, 6), cp(0, 5.6, 0), 38);
shot(A("orbi"), 2.2, cp(0, 6, 18), cp(0, 5.5, 0), 48, cp(0, 6, 15), cp(0, 5.5, 0), 48);
shot(wt("orbi", "byte") - 0.1, 2.6, cp(3, 6, 8.5), cp(2.4, 6, 0), 42, cp(2.6, 6.2, 7.5), cp(2.4, 6.2, 0), 40);
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
  const fl = win(t, wt("scene", "snap") + 0.1, wt("scene", "snap") + 0.5, 0.03, 0.35); S($("flash"), { opacity: fl * 0.8 });
  tag("tA", `8 × 8 <b>pixel blocks</b>`, t, wt("blocks", "chopped"), A("waves") - 0.05);
  tag("tA", `smooth ↖ · ↘ <b>super fine</b>`, t, A("waves") + 0.3, A("toss") - 0.05);
  tag("tA", `finest detail · <i>thrown away</i>`, t, wt("toss", "thrown") - 0.2, wt("toss", "squeeze") - 0.05);
  big("SQUEEZE", t, wt("toss", "squeeze"), A("chat") - 0.05, "#ffb03a", 320, 130);
  tag("tA", `squeezed <i>again</i> → blocky edges`, t, wt("chat", "twice") - 0.1, A("orbi") - 0.05);
  tag("tA", `the original · <b>byte for byte</b>`, t, wt("orbi", "byte"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st0 = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st0[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
// the photo: rendered once from his phone's view of the sunset, then the two squeezed copies
{ world(0); const pc = new THREE.PerspectiveCamera(50, W / H, 0.05, 3000); pc.position.set(0, 1.7, 5.5); pc.lookAt(2, 1.6, -30); comp.passes[0].camera = pc; if (comp.passes[1].camera) comp.passes[1].camera = pc; comp.render();
  const g = PHOTO.getContext("2d"); g.drawImage($("gl"), 0, (H - W * 3 / 4) / 2, W, W * 3 / 4, 0, 0, 768, 576); comp.passes[0].camera = cam; if (comp.passes[1].camera) comp.passes[1].camera = cam; PTEX.needsUpdate = true; B1 = blocky(PHOTO, 1); B2 = blocky(PHOTO, 2); }
window.render = async function (t) { world(t); camera(t); world(t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
