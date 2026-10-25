// Improved Film 10: how your phone takes bright photos in the dark (few photons → a burst of frames, each dark and noisy
// → line them up → average: light adds up, noise cancels → lift the shadows), then Orbi sends the full photo.
import { THREE, stage, lights, person, pose, tree, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, textTex, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const label = (txt, col = "#fff", w = 2.4, h = 0.6, font = "800 90px D", bg = null) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, map: textTex((g, cw, ch) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } g.fillStyle = col; g.font = font; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.74); }, 640, Math.round(640 * h / w)) }));
const phoneOn = (p) => { const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); sc.position.z = 0.007; g.add(sc); g.scr = sc; p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };

reseed(1010);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x0a1030, fog: [0x101838, 60, 260], bloom: 0.75, exposure: 1.1 });
const LT = lights(scene, { key: 0xa8b8ff, keyI: 1.3, sky: 0x5a6aaa, ground: 0x2a2018, fillI: 1.3, rim: 0xffb070, rimI: 0.5, at: V(-10, 14, 8), area: 14 });
const SKY = sky(0x050a24, 0x1a2a5a, 0x0a1030); SKY.u.sun.value.set(0.3, 0.4, -1).normalize(); SKY.u.sunCol.value.set(0xf0f4ff); SKY.u.sunSize.value = 0.02; scene.add(SKY);

// ---------------------------------------------------------------- the rooftop at night, the skyline
const ROOF = new THREE.Group(); scene.add(ROOF);
{ const deck = tinted(new THREE.PlaneGeometry(12, 12, 12, 12).rotateX(-Math.PI / 2), 0x4a4a52, 0.06); ROOF.add(deck); ROOF.add(P(mesh(bbox(12, 1.0, 0.2, 0.04), flat(0x5a5a62)), V(0, 0.5, -6)));
  ROOF.add(P(mesh(bbox(12, 14, 12, 0.2), flat(0x3a3a44)), V(0, -7.02, 0)));
  for (let i = 0; i < 4; i++) { const lp = new THREE.PointLight(0xffd8a0, 3, 6, 1.6); lp.position.set(-4.5 + i * 3, 2.4, -5.6); ROOF.add(lp); ROOF.add(P(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), glow(0xffd8a0)), lp.position)); }
  // skyline: towers with lit windows
  for (let i = 0; i < 90; i++) { const x = -90 + rnd() * 180, z = -30 - rnd() * 90, h = 10 + rnd() * 50, w = 5 + rnd() * 6; const tw = new THREE.Group(); tw.position.set(x, -14, z); scene.add(tw); tw.add(P(mesh(bbox(w, h, w, 0.15), flat(0x1a2030, { roughness: 0.8 })), V(0, h / 2, 0)));
    const wins = textTex((g, cw, ch) => { g.fillStyle = "#121624"; g.fillRect(0, 0, cw, ch); for (let y = 4; y < ch; y += 10) for (let x0 = 3; x0 < cw; x0 += 8) if (Math.random() < 0.45) { g.fillStyle = ["#ffd88a", "#ffe8b8", "#bcd8ff"][Math.floor(Math.random() * 3)]; g.fillRect(x0, y, 4, 5); } }, 64, 256);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.95), new THREE.MeshBasicMaterial({ map: wins, toneMapped: false })); face.position.set(0, h / 2, w / 2 + 0.02); tw.add(face); if (i % 9 === 0) tw.add(P(new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 4), glow(0xff3a3a)), V(0, h + 0.5, 0))); }
  const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), glow(0xf0f4ff)); moon.position.set(40, 60, -200); scene.add(moon); }
const ME = person({ sex: "m", top: 0x2f4a8a, bottom: 0x2b2b2b, skin: 0xc98b62, hair: 0x111111, coat: 0x6a3a2a, beard: true }); ME.position.set(0, 0, 2); ME.rotation.y = Math.PI; scene.add(ME); const MPH = phoneOn(ME);
const F1 = person({ sex: "f", top: 0xf4a6b8, bottom: 0x2b3a55, skin: 0xe0a982, hair: 0x2a1d16, longHair: true, coat: 0x3a5a7a }), F2 = person({ sex: "m", top: 0xe9c46a, bottom: 0x3a3a3a, skin: 0x9a6444, hair: 0x111111, glasses: true });
F1.position.set(-1.6, 0, 2.6); F1.rotation.y = 0.6 + Math.PI; F2.position.set(1.6, 0, 2.7); F2.rotation.y = -0.6 + Math.PI; scene.add(F1, F2); const FP1 = phoneOn(F1), FP2 = phoneOn(F2);

// the photo of the skyline (rendered once), its noisy dark frames, the stacked result, the toned result
const PW = 640, PH = 480, PHOTO = document.createElement("canvas"); PHOTO.width = PW; PHOTO.height = PH;
const mkc = () => { const c = document.createElement("canvas"); c.width = PW; c.height = PH; return c; };
function noisy(src, seedN, gain = 0.25, amt = 70, dx = 0, dy = 0) { const c = mkc(), g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, PW, PH); g.drawImage(src, dx, dy); const im = g.getImageData(0, 0, PW, PH), d = im.data; let s0 = seedN; const rr = () => ((s0 = (s0 * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let i = 0; i < d.length; i += 4) { const n = (rr() - 0.5) * amt; for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, d[i + k] * gain + n + (k === 2 ? 4 : 0))); } g.putImageData(im, 0, 0); return c; }
function toned(src, lift) { const c = mkc(), g = c.getContext("2d"); g.drawImage(src, 0, 0); const im = g.getImageData(0, 0, PW, PH), d = im.data; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) { const v = d[i + k] / 255; d[i + k] = 255 * Math.min(1, Math.pow(v, 1 / (1 + lift * 1.4)) * (1 + lift * 0.1)); } g.putImageData(im, 0, 0); return c; }
const FR = [], OFF = []; let STACKED, TONED;
const ftex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

// ---------------------------------------------------------------- the sensor (x = -300): pixel wells, a few photons dropping in
const SP = V(-300, 0, 0), SEN = new THREE.Group(); SEN.position.copy(SP); scene.add(SEN);
{ SEN.add(new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), new THREE.MeshBasicMaterial({ color: 0x03050c, side: THREE.BackSide, fog: false }))); const k = new THREE.PointLight(0x8aa0ff, 60, 60, 1.2); k.position.set(0, 12, 10); SEN.add(k); }
const WELLS = []; for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { const w = new THREE.Group(); w.position.set(-5.5 + i, 0, -5.5 + j); SEN.add(w); w.add(mesh(bbox(0.9, 0.6, 0.9, 0.05), flat([0x5a1a1a, 0x1a4a1a, 0x1a1a5a][(i + j) % 3]))); const fill = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.7), glow(0x8a7020, { transparent: true, opacity: 0.6 })); fill.geometry.translate(0, 0.5, 0); fill.position.y = 0.31; fill.scale.y = 0.001; w.add(fill); w.fill = fill; w.n = 0; WELLS.push(w); }
const PHOTONS = Array.from({ length: 40 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(0xfff4c0)); m.w = WELLS[Math.floor(rnd() * WELLS.length)]; m.t0 = rnd() * 4; SEN.add(m); return m; });
// ---------------------------------------------------------------- the time stack (x = 300): 12 frames in depth
const TP = V(300, 0, 0), TS = new THREE.Group(); TS.position.copy(TP); scene.add(TS);
{ TS.add(new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), new THREE.MeshBasicMaterial({ color: 0x05070f, side: THREE.BackSide, fog: false }))); }
const PLANES = []; const RESULT = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true })); RESULT.position.set(0, 6, 0); TS.add(RESULT);
const CURVE = new THREE.Group(); CURVE.position.set(0, 1.4, 0.5); TS.add(CURVE); CURVE.add(P(new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshBasicMaterial({ color: 0x0b1424, transparent: true, opacity: 0.85 })), V(0, 0, -0.02)));
let CURVEL = null; const curveLine = (k) => { if (CURVEL) { CURVE.remove(CURVEL); CURVEL.geometry.dispose(); } const pts = []; for (let i = 0; i <= 30; i++) { const x = i / 30; const y = Math.pow(x, 1 / (1 + k * 1.4)); pts.push(V(-1.5 + x * 3, -1 + y * 2, 0)); } CURVEL = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.04, 6), glow(0xffd04a)); CURVE.add(CURVEL); };
curveLine(0); const CLAB = label("shadows ↑", "#ffd04a", 2.4, 0.4, "800 90px D"); CLAB.position.set(0, 1.4, 0); CURVE.add(CLAB);

// ---------------------------------------------------------------- world
function world(t) {
  pose(ME, { phone: 1 }); ME.rig.rArm.rotation.x -= 0.6; ME.rig.rElbow.rotation.x = -0.6; MPH.scr.material.color.set(t > A("scene") ? 0x8a9ab8 : 0x0b0d10);
  pose(F1, { phone: t > A("orbi") ? 1 : 0, look: 0.2 }); pose(F2, { phone: t > A("orbi") ? 1 : 0, look: -0.2 }); const got = t > wt("orbi", "pixel"); FP1.scr.material.color.set(got ? 0xffe8b8 : 0x0b0d10); FP2.scr.material.color.set(got ? 0xffe8b8 : 0x0b0d10);
  // sensor: photons drop one by one; wells fill only a little
  PHOTONS.forEach((p, i) => { const k = ((t - A("scene") - p.t0) % 4) / 1.2; const on = t >= A("scene") && t < A("burst") + 0.5; p.visible = on && k >= 0 && k < 1; if (p.visible) { const wp = p.w.position; p.position.set(wp.x, 6 - k * 5.7, wp.z); } });
  WELLS.forEach((w, i) => { const v = clamp((t - A("scene") - 1) / 6) * (0.1 + ((i * 37) % 10) / 40); w.fill.scale.y = Math.max(0.001, v); w.fill.visible = v > 0.02; });
  // the stack: frames appear one by one in depth, jittered (hand shake); align; collapse into the result; tone
  const show = t >= A("burst") - 0.2 && t < A("orbi"); const al = ease(clamp((t - wt("align", "lines") + 0.1) / 1.2)), col = ease(clamp((t - wt("stack", "averages") + 0.1) / 1.2));
  PLANES.forEach((p, i) => { const k = clamp((t - wt("burst", "grabs") - i * 0.12) / 0.3); p.visible = show && k > 0 && col < 0.98; p.position.set(OFF[i][0] * 0.02 * (1 - al), 6 + OFF[i][1] * 0.02 * (1 - al), lerp(-i * 0.9, 0, col)); p.rotation.z = OFF[i][2] * (1 - al); p.material.opacity = lerp(0.9, 0.15, col) * k; p.scale.setScalar(back(k) || 0.001); });
  RESULT.visible = show && col > 0.3; const tn = clamp((t - A("tone") - 0.2) / 1.2); RESULT.material.map = tn > 0.05 ? TT[Math.min(TT.length - 1, Math.floor(tn * (TT.length - 1) + 0.0001))] : STX; RESULT.material.opacity = clamp((col - 0.3) / 0.5); RESULT.position.z = 0.1;
  CURVE.visible = t >= A("tone") - 0.1 && t < A("orbi"); if (CURVE.visible) curveLine(tn);
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const sp = (x, y, z) => V(SP.x + x, SP.y + y, SP.z + z), tp = (x, y, z) => V(TP.x + x, TP.y + y, TP.z + z);
shot(0, 2.6, V(2, 2.2, 9), V(0, 1.6, -10), 50, V(1, 1.9, 6), V(0, 1.7, -14), 48);
shot(wt("hook", "bright") - 0.1, 2.0, V(0.8, 1.8, 0.4), V(0, 1.4, 1.6), 44, V(0.5, 1.75, 0.6), V(0, 1.45, 1.6), 40);
shot(A("scene"), 2.0, V(0, 2.2, 4.5), V(0, 4, -40), 50, V(0, 2.4, 3.5), V(0, 6, -60), 50);
shot(wt("scene", "hardly") - 0.1, 2.6, sp(0, 9, 12), sp(0, 1, 0), 46, sp(2, 6, 9), sp(0, 1, 0), 44);
shot(A("burst"), 2.2, V(0.8, 1.8, 0.2), V(0, 1.6, 1.6), 44, V(0.6, 1.8, 0.5), V(0, 1.6, 1.6), 42);
shot(wt("burst", "burst") - 0.1, 2.6, tp(-7, 9, 7), tp(0, 6, -5), 50, tp(-5, 10, 4), tp(0, 6, -5), 50);
shot(A("noise"), 2.0, tp(0, 6, 4.6), tp(0, 6, 0), 50, tp(0.3, 6.1, 3.8), tp(0, 6, 0), 46);
shot(wt("noise", "random") - 0.1, 2.0, tp(1.2, 6.6, 2.2), tp(1.0, 6.4, 0), 40, tp(1.0, 6.6, 1.8), tp(0.8, 6.4, 0), 36);
shot(A("align"), 2.6, tp(-7, 6.5, 4), tp(0, 6, -5), 50, tp(-3, 6.5, 9), tp(0, 6, -3), 50);
shot(A("stack"), 2.4, tp(6, 7, 5), tp(0, 6, -4), 50, tp(0, 6, 11), tp(0, 6, 0), 50);
shot(wt("stack", "noise") - 0.1, 1.8, tp(0, 6, 9), tp(0, 6, 0), 48, tp(0, 6, 8), tp(0, 6, 0), 46);
shot(A("tone"), 2.6, tp(0, 5, 11), tp(0, 4.8, 0), 50, tp(0, 5, 9.5), tp(0, 4.8, 0), 50);
shot(A("orbi"), 2.4, V(0, 2.8, -4.5), V(0, 1.4, 2.3), 48, V(0, 2.6, -3.5), V(0, 1.4, 2.3), 46);
shot(wt("orbi", "friends") - 0.2, 2.2, V(-2.6, 1.9, -0.6), V(-1.6, 1.4, 2.6), 42, V(-2.3, 1.85, -0.2), V(-1.6, 1.4, 2.6), 40);
const camAt = camRig(cam);
// ---------------------------------------------------------------- overlays
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
const big = (txt, t, a0, b0, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a0 || t > b0) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a0) / 0.12) * clamp((b0 - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a0) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  tag("tA", `very few <b>photons</b> reach the sensor`, t, wt("scene", "hardly"), A("burst") - 0.05);
  tag("tA", `a burst · <b>frames through time</b>`, t, wt("burst", "grabs"), A("noise") - 0.05);
  tag("tA", `each frame · <i>dark + noisy</i>`, t, A("noise") + 0.2, A("align") - 0.05);
  tag("tA", `line them up · <b>shake removed</b>`, t, A("align") + 0.2, A("stack") - 0.05);
  tag("tA", `average · light adds up · <b>noise cancels</b>`, t, wt("stack", "averages"), A("tone") - 0.05);
  tag("tA", `lift the shadows · <b>tame the lights</b>`, t, A("tone") + 0.2, A("orbi") - 0.05);
  tag("tA", `the full photo · <b>every pixel</b>`, t, wt("orbi", "full"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
// render the skyline photo once from his phone, then build the frames
let STX, TT = [];
{ world(0); const pc = new THREE.PerspectiveCamera(46, W / H, 0.05, 3000); pc.position.set(0, 1.8, 1.4); pc.lookAt(0, 6, -60); comp.passes[0].camera = pc; if (comp.passes[1].camera) comp.passes[1].camera = pc; comp.render();
  PHOTO.getContext("2d").drawImage($("gl"), 0, (H - W * 3 / 4) / 2, W, W * 3 / 4, 0, 0, PW, PH); comp.passes[0].camera = cam; if (comp.passes[1].camera) comp.passes[1].camera = cam;
  for (let i = 0; i < 12; i++) { const o = [(rnd() - 0.5) * 40, (rnd() - 0.5) * 30, (rnd() - 0.5) * 0.08]; OFF.push(o); const c = noisy(PHOTO, 100 + i, 0.3, 80); FR.push(c); const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ map: ftex(c), transparent: true, toneMapped: false, depthWrite: false })); TS.add(m); PLANES.push(m); }
  STACKED = noisy(PHOTO, 999, 0.55, 12); STX = ftex(STACKED); for (let k = 0; k <= 5; k++) TT.push(ftex(toned(STACKED, k / 5))); }
window.render = async function (t) { world(t); camAt(SH, t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
