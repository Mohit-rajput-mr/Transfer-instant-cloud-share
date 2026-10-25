// Improved Film 12: how wireless charging works (drop it on the pad → x-ray: two copper coils → the pad's current flips
// over 100,000 times a second → a flipping magnetic field through the glass → it shoves the phone coil's electrons: current
// → off center, the field misses → thermal view: some energy becomes heat). Pure general knowledge: plain end card.
import { THREE, stage, lights, person, pose, tree, flat, glow, mesh, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, textTex, xray, thermal, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const E = (t, a, d) => ease(clamp((t - a) / d));

reseed(1212);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x0c0e1a, fog: [0x0c0e1a, 40, 200], bloom: 0.8, exposure: 1.1 });
const LT = lights(scene, { key: 0x8aa0ff, keyI: 0.9, sky: 0x4a5a8a, ground: 0x2a2018, fillI: 1.0, rim: 0xffb070, rimI: 0.4, at: V(-6, 12, 8), area: 10 });
const TH = thermal(comp);

// ---------------------------------------------------------------- the bedroom (origin): night → morning
const WIN = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), glow(0x1a2a5a)); WIN.position.set(-1.2, 2.2, -2.88);
const SUN = new THREE.PointLight(0xffd8a0, 0, 12, 1.2); SUN.position.set(-1.2, 2.2, -2.2);
{ scene.add(tinted(new THREE.PlaneGeometry(10, 10, 10, 10).rotateX(-Math.PI / 2), 0x6a4a3a, 0.05));
  scene.add(P(mesh(bbox(10, 4, 0.2, 0.02), flat(0xc8c0d8)), V(0, 2, -3))); scene.add(WIN, SUN);
  scene.add(P(mesh(bbox(1.8, 0.08, 0.1, 0.02), flat(0xf0e8dc)), V(-1.2, 1.5, -2.86)));
  const bed = new THREE.Group(); bed.position.set(-0.6, 0, -1.6); scene.add(bed);
  bed.add(P(mesh(bbox(2.0, 0.5, 2.4, 0.06), flat(0x5a3a2a)), V(0, 0.25, 0))); bed.add(P(mesh(bbox(1.9, 0.25, 2.3, 0.1), flat(0xf0ece4)), V(0, 0.6, 0)));
  bed.add(P(mesh(bbox(1.95, 0.2, 1.5, 0.1), flat(0x3a6aa0)), V(0, 0.72, 0.4))); bed.add(P(mesh(bbox(0.7, 0.2, 0.45, 0.1), flat(0xffffff)), V(-0.45, 0.82, -0.85))); bed.add(P(mesh(bbox(0.7, 0.2, 0.45, 0.1), flat(0xffffff)), V(0.45, 0.82, -0.85)));
  bed.add(P(mesh(bbox(2.0, 1.1, 0.12, 0.04), flat(0x5a3a2a)), V(0, 0.8, -1.2)));
  scene.add(P(mesh(bbox(0.6, 0.6, 0.5, 0.04), flat(0x8a6a4a)), V(0.9, 0.3, -2.3)));
  const lamp = new THREE.Group(); lamp.position.set(1.05, 0.6, -2.45); scene.add(lamp); lamp.add(P(mesh(bbox(0.05, 0.3, 0.05, 0.02), flat(0x2a2a2a)), V(0, 0.15, 0)));
  lamp.add(P(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.18, 10, 1, true), glow(0xffd8a0, { side: THREE.DoubleSide })), V(0, 0.36, 0)));
  const lp = new THREE.PointLight(0xffc88a, 2.5, 5, 1.4); lp.position.set(1.05, 1.0, -2.3); scene.add(lp); }
const MPAD = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.02, 24), flat(0xe8e8ee)); MPAD.position.set(0.8, 0.61, -2.2); scene.add(MPAD);
const MRING = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.115, 24).rotateX(-Math.PI / 2), glow(0x3dff8c, { transparent: true })); MRING.position.set(0.8, 0.622, -2.2); scene.add(MRING);
const MPH = new THREE.Group(); MPH.add(mesh(bbox(0.075, 0.012, 0.155, 0.01), flat(0x1d1f24))); const MSC = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); MSC.position.y = 0.007; MPH.add(MSC); scene.add(MPH);
const HAND = new THREE.Group(); scene.add(HAND); HAND.add(mesh(bbox(0.1, 0.05, 0.16, 0.03), flat(0xc98b62))); HAND.add(P(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8).rotateX(Math.PI / 2.4), flat(0x6a4a8a)), V(0.02, 0.12, 0.3)));

// ---------------------------------------------------------------- the hero pad + phone (x = -300), coils inside
const HP = V(-300, 0, 0), HS = new THREE.Group(); HS.position.copy(HP); scene.add(HS);
{ HS.add(new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), new THREE.MeshBasicMaterial({ color: 0x06070e, side: THREE.BackSide, fog: false })));
  const k = new THREE.PointLight(0xffe8d0, 90, 60, 1.2); k.position.set(6, 12, 10); HS.add(k); const k2 = new THREE.PointLight(0x6a8aff, 50, 60, 1.2); k2.position.set(-8, 5, 6); HS.add(k2);
  HS.add(P(mesh(new THREE.CylinderGeometry(4.6, 5, 1.4, 40), flat(0x15141c)), V(0, 0.7, 0))); }
const Y0 = 1.4; // top of the pedestal
const SHELLS = new THREE.Group(); HS.add(SHELLS);
const PAD = mesh(new THREE.CylinderGeometry(3.0, 3.2, 0.5, 48), flat(0xe8e8ee, { roughness: 0.4 })); PAD.position.y = Y0 + 0.25; SHELLS.add(PAD);
const RING = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.05, 6, 64).rotateX(Math.PI / 2), glow(0x3dff8c, { transparent: true })); RING.position.y = Y0 + 0.4; HS.add(RING);
const PHONE = new THREE.Group(); HS.add(PHONE); const PSH = new THREE.Group(); PHONE.add(PSH);
PSH.add(mesh(bbox(3.6, 0.4, 7.4, 0.35), flat(0x2a2c33, { roughness: 0.3, metalness: 0.4 })));
const SCV = document.createElement("canvas"); SCV.width = 360; SCV.height = 740; const SCT = new THREE.CanvasTexture(SCV); SCT.colorSpace = THREE.SRGBColorSpace;
const SCR = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 6.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: SCT, toneMapped: false })); SCR.position.y = 0.205; PSH.add(SCR);
const XR1 = xray(SHELLS), XR2 = xray(PSH);
// flat spiral coils (copper), a ferrite plate under the pad's coil, battery inside the phone
const spiral = (r0, r1, turns, y) => { const pts = []; const n = turns * 40; for (let i = 0; i <= n; i++) { const a = (i / 40) * Math.PI * 2, rr = lerp(r0, r1, i / n); pts.push(V(Math.cos(a) * rr, y, Math.sin(a) * rr)); } return new THREE.CatmullRomCurve3(pts); };
const COPPER = flat(0xd0884a, { roughness: 0.3, metalness: 0.6 });
const C1 = spiral(0.5, 2.5, 9, 0), C2 = spiral(0.4, 1.5, 7, 0);
const COIL1 = new THREE.Mesh(new THREE.TubeGeometry(C1, 720, 0.06, 5), COPPER); COIL1.position.y = Y0 + 0.32; HS.add(COIL1);
HS.add(P(mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.06, 40), flat(0x2a2a30)), V(0, Y0 + 0.22, 0)));
const COIL2 = new THREE.Mesh(new THREE.TubeGeometry(C2, 560, 0.05, 5), COPPER); COIL2.position.y = -0.12; PHONE.add(COIL2);
const BAT = mesh(bbox(3.0, 0.14, 3.6, 0.04), flat(0x3a4a6a)); BAT.position.set(0, 0.02, 1.4); PHONE.add(BAT);
const BATF = new THREE.Mesh(new THREE.PlaneGeometry(1, 3.4).rotateX(-Math.PI / 2), glow(0x3dff8c, { transparent: true, opacity: 0.8 })); BATF.geometry.translate(0.5, 0, 0); BATF.position.set(-1.45, 0.1, 1.4); PHONE.add(BATF);
const HEAT = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32).rotateX(-Math.PI / 2), glow(0xfff0e0, { transparent: true, opacity: 0, depthWrite: false })); HEAT.position.y = 0.23; PHONE.add(HEAT);
// moving charge: pulses in the pad coil (back and forth), electrons in the phone coil
const PULSE = Array.from({ length: 36 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(0xffa040)); m.u = i / 36; HS.add(m); return m; });
const ELEC = Array.from({ length: 26 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glow(0x5ac8ff)); m.u = i / 26; PHONE.add(m); return m; });
// field lines: loops up through the middle, out over the top, down around the outside
const LOOPS = []; for (let i = 0; i < 12; i++) { const th = (i / 12) * Math.PI * 2, g = new THREE.Group(); g.rotation.y = th; g.position.y = Y0 + 0.3; HS.add(g);
  const pts = []; for (let k = 0; k <= 64; k++) { const a = (k / 64) * Math.PI * 2; pts.push(V(1.9 + Math.cos(a + Math.PI) * 1.65, Math.sin(a) * 2.7 + 0.2, 0)); } const cv = new THREE.CatmullRomCurve3(pts, true);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(cv, 96, 0.03, 4, true), glow(0x5affe0, { transparent: true, opacity: 0, depthWrite: false })); g.add(tube);
  const dots = Array.from({ length: 6 }, (_, k) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 8), glow(0xb8fff0, { transparent: true })); m.u = k / 6; g.add(m); return m; }); LOOPS.push({ g, tube, cv, dots }); }

// ---------------------------------------------------------------- timing helpers
const land = (t) => E(t, wt("hook", "phone") - 0.2, 0.9);              // phone settles onto the pad
const shift = (t) => 2.4 * E(t, wt("align", "slide"), 1.0) * (1 - E(t, A("heat") + 0.2, 0.9)); // off center, then back
const power = (t) => clamp(1 - shift(t) / 2.4 * 0.75);
const flip = (t) => Math.sin(t * Math.PI * 2 * 0.9);                   // the field direction (slowed down a lot so you can see it)

function screen(t) {
  const g = SCV.getContext("2d"); g.fillStyle = "#07080c"; g.fillRect(0, 0, 360, 740);
  const on = t > wt("induce", "current") - 0.2; const pct = Math.round(lerp(12, 87, clamp((t - A("induce")) / (A("end") - A("induce")))));
  g.fillStyle = "#e8eaf0"; g.font = "300 96px D"; g.textAlign = "center"; g.fillText("6:58", 180, 210); g.font = "500 24px D"; g.fillStyle = "#9aa0b0"; g.fillText("Saturday", 180, 250);
  g.strokeStyle = on ? "#3dff8c" : "#5a5f6a"; g.lineWidth = 6; g.beginPath(); g.arc(180, 470, 90, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct / 100); g.stroke();
  g.fillStyle = on ? "#3dff8c" : "#9aa0b0"; g.font = "700 48px D"; g.fillText(`${pct}%`, 180, 488); if (on) { g.font = "600 24px D"; g.fillText("⚡ charging", 180, 600); }
  SCT.needsUpdate = true;
}

// ---------------------------------------------------------------- world
function world(t) {
  // bedroom: a hand lowers the phone onto the pad; night turns into morning
  const dk = E(t, A("scene") + 0.3, 1.1); MPH.position.set(0.8, lerp(0.95, 0.628, dk), -2.2); MPH.rotation.y = 0.3; MSC.material.color.set(dk > 0.98 ? 0x3dff8c : 0x0b0d10);
  HAND.position.set(0.8, lerp(0.99, 0.66, dk) + E(t, A("scene") + 1.5, 0.6) * 0.5, -2.2 + E(t, A("scene") + 1.5, 0.6) * 0.6); HAND.visible = t < A("scene") + 2.2; MRING.material.opacity = dk > 0.98 ? 0.6 + 0.4 * Math.sin(t * 3) : 0.15;
  const mo = E(t, wt("scene", "morning") - 0.2, 1.2); WIN.material.color.lerpColors(new THREE.Color(0x1a2a5a), new THREE.Color(0xffe0b0), mo); SUN.intensity = mo * 14; LT.key.intensity = lerp(0.9, 2.2, mo); LT.key.color.lerpColors(new THREE.Color(0x8aa0ff), new THREE.Color(0xffe2c0), mo);
  // hero
  const lk = land(t); PHONE.position.set(shift(t), lerp(Y0 + 4, Y0 + 0.75, lk), 0); PHONE.rotation.y = lerp(0.5, 0, lk); screen(t);
  RING.material.opacity = lk > 0.98 ? 0.5 + 0.5 * Math.sin(t * 4) : 0.1;
  const xk = E(t, A("xray") + 0.2, 1.0) * (1 - E(t, A("end") - 0.3, 0.3)); XR1(xk); XR2(xk); COIL1.visible = COIL2.visible = BAT.visible = BATF.visible = xk > 0.05;
  BATF.scale.x = lerp(0.12, 0.87, clamp((t - A("induce")) / (A("end") - A("induce"))));
  // pad current: pulses slosh back and forth along the coil
  const cur = t > A("field") - 0.1 && t < A("end") - 0.3, f = flip(t);
  PULSE.forEach((m) => { m.visible = cur && xk > 0.5; if (m.visible) { const u = (m.u + f * 0.012 + 1) % 1; m.position.copy(C1.getPointAt(u)); m.position.y += Y0 + 0.32; m.material.color.set(f > 0 ? 0xffa040 : 0x40a0ff); } });
  // field lines
  const fv = clamp((t - A("magnet") + 0.2) / 0.6) * (t < A("end") - 0.3 ? 1 : 0), pw = power(t);
  LOOPS.forEach((Lp, i) => { const ang = Lp.g.rotation.y, side = Math.cos(ang); const miss = shift(t) > 0.1 && side < 0.2 - shift(t) / 3; const a = fv * (0.25 + 0.55 * Math.abs(f)) * (miss ? 0.25 : 1);
    Lp.tube.material.opacity = a; Lp.tube.material.color.set(miss ? 0x3a6a8a : 0x5affe0); Lp.g.visible = a > 0.01;
    Lp.dots.forEach((d) => { const u = (((d.u + t * 0.25 * Math.sign(f)) % 1) + 1) % 1; d.position.copy(Lp.cv.getPointAt(u)); const tg = Lp.cv.getTangentAt(u).multiplyScalar(Math.sign(f) || 1); d.quaternion.setFromUnitVectors(V(0, 1, 0), tg); d.material.opacity = a; }); });
  // electrons: they move only once the field sweeps through, and less when off center
  const ek = clamp((t - wt("induce", "sweeps") + 0.1) / 0.5) * pw * (t < A("end") - 0.3 ? 1 : 0);
  ELEC.forEach((m) => { m.visible = ek > 0.02 && xk > 0.5; if (m.visible) { const u = (m.u + f * 0.02 * ek + 1) % 1; m.position.copy(C2.getPointAt(u)); m.position.y -= 0.12; } });
  // heat
  const hk = E(t, wt("heat", "heat") - 0.2, 0.8) * (1 - E(t, A("end") - 0.3, 0.3)); HEAT.material.opacity = hk * 0.85 * (0.9 + 0.1 * Math.sin(t * 6)); TH.set(hk * 0.95, t);
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const hp = (x, y, z) => V(HP.x + x, HP.y + y, HP.z + z);
shot(0, 3.2, hp(4, 9, 12), hp(0, 2.6, 0), 48, hp(1.5, 7.5, 11), hp(0, 2.2, 0), 46);
shot(A("scene"), 2.2, V(1.6, 1.4, -0.6), V(0.8, 0.65, -2.2), 44, V(1.3, 1.25, -1.0), V(0.8, 0.62, -2.2), 40);
shot(wt("scene", "yet") - 0.1, 2.6, V(1.8, 2.2, 3.6), V(-0.2, 0.9, -1.8), 50, V(1.2, 2.0, 3.0), V(-0.2, 0.9, -1.8), 50);
shot(A("xray"), 2.4, hp(7, 4.2, 9), hp(0, 2.2, 0), 48, hp(5, 4.6, 8), hp(0, 2.2, 0), 46);
shot(wt("xray", "another") - 0.1, 2.0, hp(-4, 3.4, 6), hp(0, 2.2, 0), 44, hp(-3.2, 3.2, 5.4), hp(0, 2.1, 0), 42);
shot(A("field"), 2.6, hp(3, 4.4, 4.2), hp(0, 1.8, 0), 46, hp(2, 3.8, 3.6), hp(0, 1.8, 0), 44);
shot(wt("field", "hundred") - 0.1, 2.2, hp(0, 9, 3), hp(0, 1.7, 0), 46, hp(0, 8, 2.4), hp(0, 1.7, 0), 44);
shot(A("magnet"), 3.0, hp(0, 3.2, 17), hp(0, 3.0, 0), 48, hp(-3, 3.6, 15), hp(0, 3.0, 0), 48);
shot(wt("magnet", "reaching") - 0.1, 2.2, hp(4, 2.4, 7), hp(0, 3.0, 0), 46, hp(3.4, 2.6, 6.2), hp(0, 3.0, 0), 44);
shot(A("induce"), 2.6, hp(-4.5, 6.5, 8), hp(0, 2.4, 0), 46, hp(-3.5, 5.8, 7), hp(0, 2.3, 0), 44);
shot(wt("induce", "current") - 0.1, 2.0, hp(2, 9, 8), hp(0, 2.2, 0), 46, hp(1.4, 8, 7), hp(0, 2.2, 0), 46);
shot(A("align"), 3.2, hp(1, 12, 11), hp(1, 2.2, 0), 48, hp(2.4, 11, 10), hp(1.2, 2.2, 0), 48);
shot(wt("align", "most") - 0.1, 2.2, hp(-1, 4, 15), hp(1, 3, 0), 48, hp(0, 4, 14), hp(1.2, 3, 0), 48);
shot(A("heat"), 3.6, hp(4, 9, 10), hp(0, 2.2, 0), 48, hp(2, 8, 9), hp(0, 2.2, 0), 46);
shot(A("end") - 0.1, 2.6, V(1.6, 1.4, -0.4), V(0.8, 0.65, -2.2), 44, V(2.2, 1.9, 1.4), V(0, 0.9, -2), 50);
const camAt = camRig(cam);
// ---------------------------------------------------------------- overlays
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
const big = (txt, t, a0, b0, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a0 || t > b0) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a0) / 0.12) * clamp((b0 - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a0) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  tag("tA", `no plug · <b>no pins</b>`, t, wt("scene", "plug"), wt("scene", "morning") - 0.1);
  tag("tA", `battery · <b>full by morning</b>`, t, wt("scene", "morning"), A("xray") - 0.05);
  tag("tA", `x-ray · <b>two copper coils</b>`, t, wt("xray", "coil"), A("field") - 0.05);
  tag("tA", `current · <b>flips direction</b>`, t, A("field") + 0.2, wt("field", "hundred") - 0.15);
  big("100,000+ / s", t, wt("field", "hundred"), A("magnet") - 0.1, "#ffa040", 300, 110);
  tag("tA", `magnetic field · <b>through the glass</b>`, t, wt("magnet", "invisible"), A("induce") - 0.05);
  tag("tA", `field → <b>electrons move</b>`, t, wt("induce", "sweeps"), wt("induce", "current") - 0.1);
  big("CURRENT!", t, wt("induce", "current"), A("align") - 0.1, "#5ac8ff", 300, 130);
  tag("tA", `off center · power <i>${Math.round(power(t) * 100)}%</i>`, t, wt("align", "slide"), A("heat") - 0.05);
  tag("tA", `thermal view · <i>lost as heat</i>`, t, wt("heat", "heat"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") + L.end.dur - 0.6 ? 0 : 1 });
  const e = clamp((t - A("end") - L.end.dur + 0.5) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camAt(SH, t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
