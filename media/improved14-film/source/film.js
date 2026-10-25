// Improved Film 14: how login codes work (TOTP). Phone and website never talk: one QR scan gave both the same secret key;
// each takes the key + the time rounded to 30 s, drops them in the same blender (a hash), keeps six digits → same code.
// A peeked code dies in 30 s. Then Orbi: the passcode never leaves the phone, only locked pieces travel.
import { THREE, stage, lights, person, pose, rack, flat, glow, mesh, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, textTex, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const E = (t, a, d) => ease(clamp((t - a) / d));
const phoneOn = (p) => { const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); sc.position.z = 0.007; g.add(sc); g.scr = sc; p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };
const canvasPlane = (w, h, cw, ch) => { const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, transparent: true })); m.draw = (fn) => { fn(cv.getContext("2d"), cw, ch); tx.needsUpdate = true; }; return m; };
const label = (txt, col = "#fff", w = 2.4, h = 0.5) => { const m = canvasPlane(w, h, 640, Math.round(640 * h / w)); m.draw((g, cw, ch) => { g.fillStyle = "rgba(6,12,10,0.85)"; g.beginPath(); g.roundRect(4, 4, cw - 8, ch - 8, 24); g.fill(); g.fillStyle = col; g.font = "700 64px M"; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.66); }); return m; };

reseed(1414);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x0b0d16, fog: [0x0b0d16, 60, 260], bloom: 0.7, exposure: 1.1 });
lights(scene, { key: 0xfff1e0, keyI: 1.8, sky: 0xb8c8ff, ground: 0x3a3028, fillI: 1.1, rim: 0x9fc4ff, rimI: 0.7, at: V(8, 14, 10), area: 14 });

// ---------------------------------------------------------------- the desk (origin): laptop asks for the code
const CODE1 = "482913", CODE2 = "107552";
{ scene.add(tinted(new THREE.PlaneGeometry(14, 14, 10, 10).rotateX(-Math.PI / 2), 0x5a4a3e, 0.05)); scene.add(P(mesh(bbox(14, 4, 0.2, 0.02), flat(0x2f3a4e)), V(0, 2, -3)));
  scene.add(P(mesh(bbox(2.4, 0.08, 1.1, 0.03), flat(0xc8a070)), V(0, 1.0, 0.2))); for (const sx of [-1.1, 1.1]) for (const sz of [-0.3, 0.7]) scene.add(P(mesh(bbox(0.06, 1.0, 0.06, 0.01), flat(0x2a2a2a)), V(sx, 0.5, sz)));
  scene.add(P(mesh(bbox(0.9, 0.04, 0.6, 0.02), flat(0x9aa0aa, { metalness: 0.5, roughness: 0.3 })), V(0, 1.06, 0.3)));
  const lp = new THREE.PointLight(0xffc88a, 4, 6, 1.4); lp.position.set(-1.2, 2.2, 0.6); scene.add(lp); }
const LAP = canvasPlane(0.88, 0.56, 704, 448); LAP.position.set(0, 1.36, 0.0); LAP.rotation.x = -0.18; LAP.material.color.set(0x9a9a9a); scene.add(LAP); scene.add(P(mesh(bbox(0.92, 0.6, 0.02, 0.02), flat(0x9aa0aa, { metalness: 0.5 })), V(0, 1.36, -0.015))).rotation.x = -0.18;
const ME = person({ sex: "f", top: 0x5a7aff, bottom: 0x2b2b2b, skin: 0x9a6444, hair: 0x111111, longHair: true }); ME.position.set(0.2, 0, 1.3); ME.rotation.y = Math.PI; scene.add(ME); const MPH = phoneOn(ME);

// ---------------------------------------------------------------- the two islands (x = -300): phone (left) · website server (right), a gap between
const HP = V(-300, 0, 0), HS = new THREE.Group(); HS.position.copy(HP); scene.add(HS);
HS.add(new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), new THREE.MeshBasicMaterial({ color: 0x070910, side: THREE.BackSide, fog: false })));
{ const k = new THREE.PointLight(0xffe8d0, 160, 80, 1.2); k.position.set(0, 14, 12); HS.add(k); for (const s of [-1, 1]) { const f = new THREE.PointLight(s < 0 ? 0x9affd8 : 0xd8b8ff, 50, 30, 1.2); f.position.set(s * 5 - 3 * s, 7, 6); HS.add(f); } HS.add(new THREE.HemisphereLight(0x8a9ac8, 0x1a1420, 0.8)); }
const SIDES = [-1, 1].map((s) => { const cx = s * 5, G = new THREE.Group(); G.position.x = cx; HS.add(G);
  G.add(P(mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.5, 40), flat(s < 0 ? 0x1f3a3a : 0x2e2440)), V(0, 0.25, 0)));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.05, 6, 64).rotateX(Math.PI / 2), glow(s < 0 ? 0x3dff8c : 0xb48aff)); ring.position.y = 0.5; G.add(ring);
  let dev, scr;
  if (s < 0) { dev = new THREE.Group(); dev.add(mesh(bbox(2.2, 4.4, 0.3, 0.3), flat(0x22252b, { roughness: 0.3, metalness: 0.4 }))); scr = canvasPlane(2.0, 4.1, 400, 820); scr.position.z = 0.16; dev.add(scr); dev.position.set(-1.0, 2.8, -1.2); dev.rotation.y = 0.25; }
  else { dev = new THREE.Group(); const rk = rack(0x2b2f38); rk.scale.setScalar(2.0); rk.position.set(-0.4, 0, 0); dev.add(rk); const rk2 = rack(0x2b2f38); rk2.scale.setScalar(2.0); rk2.position.set(1.5, 0, 0); dev.add(rk2); scr = canvasPlane(2.4, 1.2, 640, 320); scr.position.set(0.55, 4.9, 0.9); dev.add(scr); dev.position.set(0.6, 0.5, -1.6); dev.rotation.y = -0.25; dev.leds = [...rk.leds, ...rk2.leds]; }
  G.add(dev);
  const name = label(s < 0 ? "YOUR PHONE" : "THE WEBSITE", s < 0 ? "#3dff8c" : "#b48aff", 3.2, 0.6); name.position.set(0, 0.9, 3.5); G.add(name);
  // the secret key (gold), the clock, the blender
  const KEY = new THREE.Group(); KEY.add(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 8, 20), flat(0xffc83a, { metalness: 0.7, roughness: 0.25, emissive: 0x2a1a00 }))); KEY.add(P(mesh(bbox(0.9, 0.14, 0.14, 0.03), flat(0xffc83a, { metalness: 0.7, roughness: 0.25, emissive: 0x2a1a00 })), V(0.75, 0, 0)));
  for (const [x, h] of [[0.95, 0.22], [1.12, 0.32]]) KEY.add(P(mesh(bbox(0.08, h, 0.12, 0.01), flat(0xffc83a, { metalness: 0.7, emissive: 0x2a1a00 })), V(x, -h / 2 - 0.05, 0))); G.add(KEY);
  const CLK = new THREE.Group(); CLK.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 32).rotateX(Math.PI / 2), flat(0xb8bcc8))); CLK.add(P(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 32), flat(0x3a3f4a)), V(0, 0, 0)));
  const hm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.03), flat(0x1a1a1e)); hm.geometry.translate(0, 0.2, 0); hm.position.z = 0.08; CLK.add(hm); const hs = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.03), glow(0xff4a4a)); hs.geometry.translate(0, 0.24, 0); hs.position.z = 0.1; CLK.add(hs); CLK.hm = hm; CLK.hs = hs;
  const pie = new THREE.Mesh(new THREE.CircleGeometry(0.56, 32, Math.PI / 2, 0.01), glow(0x5ac8ff, { transparent: true, opacity: 0.55, side: THREE.DoubleSide })); pie.position.z = 0.07; CLK.add(pie); CLK.pie = pie; G.add(CLK);
  const BL = new THREE.Group(); BL.position.set(s < 0 ? 1.4 : -1.4, 0.5, 1.2); G.add(BL); BL.add(P(mesh(bbox(1.2, 0.6, 1.2, 0.1), flat(0x2a2c33)), V(0, 0.3, 0))); BL.add(P(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12), glow(0xff4a4a)), V(0.3, 0.32, 0.6))).rotation.x = Math.PI / 2;
  BL.add(P(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 1.7, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.28, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })), V(0, 1.45, 0)));
  BL.add(P(new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 20), flat(0x2a2c33)), V(0, 2.32, 0)));
  const blade = new THREE.Group(); blade.position.y = 0.75; BL.add(blade); for (let i = 0; i < 4; i++) { const b = mesh(bbox(0.7, 0.03, 0.12, 0.01), flat(0xd8dce4, { metalness: 0.7 })); b.rotation.y = i * Math.PI / 2; b.rotation.z = 0.25; b.position.x = 0; blade.add(b); } BL.blade = blade;
  const swirl = Array.from({ length: 30 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), glow([0xffc83a, 0x5ac8ff, 0xffffff][i % 3])); m.ph = rnd(); BL.add(m); return m; }); BL.swirl = swirl;
  const RIB = canvasPlane(0.7, 2.6, 160, 600); RIB.position.set(0, 3.8, 0); BL.add(RIB); RIB.draw((g, cw, ch) => { g.fillStyle = "rgba(6,12,10,0.9)"; g.fillRect(0, 0, cw, ch); g.font = "700 30px M"; g.textAlign = "center"; let s0 = 99; for (let y = 34; y < ch; y += 36) { let line = ""; for (let k = 0; k < 6; k++) { s0 = (s0 * 1103515245 + 12345) % 2147483648; line += "0123456789abcdef"[s0 % 16]; } g.fillStyle = y > 200 && y < 240 ? "#3dff8c" : "#5a7a6a"; g.fillText(line, cw / 2, y); } }); BL.rib = RIB;
  return { s, G, dev, scr, KEY, CLK, BL, ring }; });
const [PH, SV] = SIDES;
// the gap: no wire, no signal
const GAP = new THREE.Group(); HS.add(GAP); for (let i = 0; i < 6; i++) GAP.add(P(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.08), glow(0x8a8f96)), V(-1.4 + i * 0.56, 2.4, 0)));
const GX = new THREE.Group(); GX.position.set(0, 2.4, 0.1); GAP.add(GX); for (const a of [0.785, -0.785]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.24, 0.24), glow(0xff4a4a)); b.rotation.z = a; GX.add(b); }
// the QR you scanned once, beaming the key to both sides
const QR = canvasPlane(2.2, 2.2, 330, 330); QR.position.set(0, 6.2, 0); HS.add(QR); QR.draw((g, cw, ch) => { g.fillStyle = "#fff"; g.fillRect(0, 0, cw, ch); g.fillStyle = "#000"; const n = 25, c = cw / (n + 4); let s0 = 7; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { s0 = (s0 * 1103515245 + 12345) % 2147483648; const fin = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17); const on = fin ? (x % 6 === 0 || y % 6 === 0 || (x % 18 > 1 && x % 18 < 5 && y % 18 > 1 && y % 18 < 5) || ((x > 17) && (x - 18) % 6 === 0) || ((y > 17) && (y - 18) % 6 === 0) || (x > 19 && x < 23 && y > 1 && y < 5) || (x > 1 && x < 5 && y > 19 && y < 23)) : (s0 >> 8) % 2; if (on) g.fillRect((x + 2) * c, (y + 2) * c, c + 0.5, c + 0.5); } });
const BEAMS = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), glow(0xffd04a, { transparent: true })); HS.add(m); m.s = s; return m; });
// the thief, and the locked pieces that fly at the end
const THIEF = person({ sex: "m", top: 0x1a1a1e, bottom: 0x1a1a1e, skin: 0xc98b62, hair: 0x111111, glasses: true }); THIEF.position.set(-1.6, 0, 3.6); THIEF.rotation.y = -0.9 + Math.PI; THIEF.scale.setScalar(1.25); HS.add(THIEF);
const PEEK = canvasPlane(2.6, 1.1, 520, 220); PEEK.position.set(0, 4.6, 3.2); HS.add(PEEK);
const PIECES = Array.from({ length: 10 }, (_, i) => { const g = new THREE.Group(); g.add(mesh(bbox(0.5, 0.5, 0.5, 0.06), flat(0x3dff8c))); g.add(P(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12, Math.PI), flat(0xd8dce4, { metalness: 0.6 })), V(0, 0.3, 0.26))); g.d = i * 0.12; HS.add(g); return g; });
const CHAIN = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), flat(0xd8dce4, { metalness: 0.7 })); m.rotation.y = (i % 2) * Math.PI / 2; HS.add(m); return m; });

// ---------------------------------------------------------------- screens
function codeScreen(g, cw, ch, code, k, col, sub) { g.fillStyle = "#07080c"; g.fillRect(0, 0, cw, ch); g.textAlign = "center"; g.fillStyle = "#8a90a0"; g.font = `600 ${cw * 0.07}px D`; g.fillText(sub, cw / 2, ch * 0.22);
  g.fillStyle = col; g.font = `800 ${cw * 0.16}px M`; g.fillText(code.slice(0, 3) + " " + code.slice(3), cw / 2, ch * 0.42);
  if (k !== null) { g.strokeStyle = "#2a2f3a"; g.lineWidth = cw * 0.03; g.beginPath(); g.arc(cw / 2, ch * 0.62, cw * 0.14, 0, 7); g.stroke(); g.strokeStyle = k < 0.2 ? "#ff4a4a" : col; g.beginPath(); g.arc(cw / 2, ch * 0.62, cw * 0.14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.stroke(); g.fillStyle = "#e8eaf0"; g.font = `700 ${cw * 0.08}px M`; g.fillText(String(Math.ceil(k * 30)), cw / 2, ch * 0.64); } }
function world(t) {
  // which code is current: CODE1 until "later", then CODE2
  const turned = t > wt("steal", "later"), code = turned ? CODE2 : CODE1;
  const k = turned ? clamp(1 - (t - wt("steal", "later")) / 30) : clamp(1 - (t - 0) / Math.max(1, wt("steal", "later")));
  // desk
  pose(ME, { phone: 1, look: 0.1 }); MPH.scr.material.color.set(0x3dff8c);
  LAP.draw((g, cw, ch) => { g.fillStyle = "#f4f5f8"; g.fillRect(0, 0, cw, ch); g.fillStyle = "#1a1d24"; g.font = "800 40px D"; g.textAlign = "center"; g.fillText("Sign in", cw / 2, 80); g.font = "500 26px D"; g.fillStyle = "#5a6070"; g.fillText("Enter the 6-digit code from your app", cw / 2, 130);
    const typed = Math.floor(clamp((t - wt("scene", "website") + 0.2) / 1.2) * 6); for (let i = 0; i < 6; i++) { g.strokeStyle = i === typed ? "#2f6aff" : "#c8ccd6"; g.lineWidth = 4; g.strokeRect(92 + i * 88, 190, 72, 92); if (i < typed) { g.fillStyle = "#1a1d24"; g.font = "800 56px M"; g.fillText(CODE1[i], 128 + i * 88, 256); } }
    if (typed >= 6) { g.fillStyle = "#18a058"; g.font = "800 34px D"; g.fillText("✓ Welcome back", cw / 2, 360); } });
  // phone + server screens
  PH.scr.draw((g, cw, ch) => codeScreen(g, cw, ch, code, k, "#3dff8c", "Authenticator"));
  const svShow = t > wt("match", "same", 3) - 0.1 || t > A("steal"); SV.scr.draw((g, cw, ch) => { g.fillStyle = "#0a0812"; g.fillRect(0, 0, cw, ch); g.textAlign = "center"; g.fillStyle = "#8a80a0"; g.font = "600 34px D"; g.fillText("expected code", cw / 2, 60);
    g.fillStyle = svShow ? "#b48aff" : "#4a4458"; g.font = "800 96px M"; g.fillText(svShow ? code.slice(0, 3) + " " + code.slice(3) : "??? ???", cw / 2, 190); if (svShow && t < A("orbi")) { g.fillStyle = "#3dff8c"; g.font = "800 40px D"; g.fillText("✓ match", cw / 2, 270); } });
  SV.dev.leds?.forEach((l, i) => (l.visible = Math.sin(t * 7 + i * 1.7) > -0.2));
  // gap ✕
  GX.visible = t > wt("scene", "never") - 0.1; GX.scale.setScalar(back(clamp((t - wt("scene", "never") + 0.1) / 0.3)) || 0.001); GAP.visible = t > A("scene") && t < A("orbi");
  // QR beams the key, once
  const qk = E(t, A("secret") + 0.1, 0.4) * (1 - E(t, wt("secret", "once") + 0.3, 0.4)); QR.visible = qk > 0.01; QR.scale.setScalar(qk || 0.001); QR.rotation.y = Math.sin(t) * 0.2;
  BEAMS.forEach((b) => { const bk = clamp((t - wt("secret", "same") + 0.1) / 0.5) * (1 - E(t, wt("secret", "once") + 0.3, 0.3)); b.visible = bk > 0.01; const a = V(0, 6.2, 0), z = V(b.s * 5, 4.6, 0.6), e = a.clone().lerp(z, bk); b.position.copy(a.clone().add(e).multiplyScalar(0.5)); b.scale.y = Math.max(0.01, a.distanceTo(e)); b.quaternion.setFromUnitVectors(V(0, 1, 0), e.clone().sub(a).normalize()); });
  // per side: key appears, clock appears, both drop into the blender, digits come out
  const keyIn = clamp((t - wt("secret", "secret") + 0.1) / 0.4), clkIn = clamp((t - wt("clock", "time") + 0.1) / 0.4), drop = E(t, wt("blend", "drop"), 0.7), spin = t > wt("blend", "blender") - 0.2 && t < A("match") + 0.5, rib = clamp((t - wt("blend", "six") + 0.2) / 0.5);
  SIDES.forEach((Sd) => { const jar = V(Sd.BL.position.x, 2.6, 1.2);
    Sd.KEY.visible = keyIn > 0 && drop < 0.98 && t < A("orbi"); Sd.KEY.position.copy(V(-0.8, 4.6, 0.6).lerp(jar, drop)); Sd.KEY.scale.setScalar((back(keyIn) || 0.001) * lerp(1, 0.4, drop)); Sd.KEY.rotation.set(0, t * 1.2, 0.3);
    Sd.CLK.visible = clkIn > 0 && drop < 0.98 && t < A("orbi"); Sd.CLK.position.copy(V(0.9, 4.6, 0.6).lerp(jar, drop)); Sd.CLK.scale.setScalar((back(clkIn) || 0.001) * lerp(1, 0.4, drop));
    const ts = (t - wt("clock", "time")) * 2; Sd.CLK.hs.rotation.z = -ts; Sd.CLK.hm.rotation.z = -ts / 12; const pr = clamp((t - wt("clock", "rounded")) / 0.8); Sd.CLK.pie.geometry.dispose(); Sd.CLK.pie.geometry = new THREE.CircleGeometry(0.56, 32, Math.PI / 2 - Math.PI * 2 * 0.5 * pr, Math.max(0.01, Math.PI * 2 * 0.5 * pr));
    Sd.BL.blade.rotation.y = spin ? t * 40 : 0; Sd.BL.swirl.forEach((m, i) => { m.visible = spin && drop > 0.9; const a = t * 9 + m.ph * 6.28, rr = 0.15 + m.ph * 0.3; m.position.set(Math.cos(a) * rr, 1.0 + ((m.ph * 1.3 + t * 0.6) % 1) * 1.1, Math.sin(a) * rr); });
    Sd.BL.rib.visible = rib > 0 && t < A("steal"); Sd.BL.rib.scale.y = rib || 0.001; Sd.BL.rib.position.y = 2.4 + 1.3 * rib; });
  // thief peeks; the stolen code dies at the turn of the window
  const tk = clamp((t - A("steal") + 0.2) / 0.4); THIEF.visible = tk > 0 && t < A("orbi"); THIEF.position.y = lerp(-3, 0, out(tk)); pose(THIEF, { look: 0.3, point: clamp((t - wt("steal", "peeks")) / 0.3) });
  const dead = t > wt("steal", "later"); PEEK.visible = t > wt("steal", "peeks") - 0.1 && t < A("orbi"); PEEK.draw((g, cw, ch) => { g.fillStyle = dead ? "rgba(40,10,10,0.92)" : "rgba(6,12,10,0.92)"; g.beginPath(); g.roundRect(4, 4, cw - 8, ch - 8, 26); g.fill(); g.textAlign = "center"; g.font = "800 84px M"; g.fillStyle = dead ? "#6a4a4a" : "#ffd04a"; g.fillText("482 913", cw / 2, 110); g.font = "700 40px D"; g.fillStyle = dead ? "#ff4a4a" : "#c8ccd6"; g.fillText(dead ? "✕ expired" : "copied…", cw / 2, 180); if (dead) { g.strokeStyle = "#ff4a4a"; g.lineWidth = 8; g.beginPath(); g.moveTo(60, 90); g.lineTo(cw - 60, 90); g.stroke(); } });
  // Orbi: the passcode key stays chained to the phone; locked pieces fly across
  const ok = t > A("orbi") - 0.1; PH.KEY.visible = PH.KEY.visible || ok; if (ok) { PH.KEY.position.set(-0.6, 3.4, 0.6); PH.KEY.scale.setScalar(1.3); PH.KEY.rotation.set(0, Math.sin(t * 2) * 0.4, 0.2); }
  CHAIN.forEach((c, i) => { c.visible = ok && t > wt("orbi", "never") - 0.2; c.position.set(-5 - 0.6 + 0.3 + i * -0.22, 3.3 - i * 0.12, 0.6 - i * 0.18); });
  PIECES.forEach((p, i) => { const pk = clamp((t - wt("orbi", "pieces") - p.d + 0.3) / 1.6); p.visible = ok && pk > 0 && pk < 1; p.position.set(lerp(-4, 9, pk), 2.6 + Math.sin(pk * Math.PI) * 2 + (i % 3) * 0.4, 0.6 + (i % 2) * 0.8); p.rotation.set(t * 2 + i, t + i, 0); });
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const hp = (x, y, z) => V(HP.x + x, HP.y + y, HP.z + z), phS = hp(-6.0, 2.8, -1.2);
shot(0, 2.6, hp(-5.3, 3.0, 2.2), phS, 40, hp(-4.6, 3.2, 5.2), hp(-5.6, 2.9, -1.2), 46);
shot(A("scene"), 2.4, V(1.4, 1.9, 3.4), V(0, 1.2, 0.2), 46, V(1.0, 1.85, 2.8), V(0, 1.25, 0.2), 44);
shot(wt("scene", "website") - 0.1, 2.0, V(0.85, 1.55, 0.85), V(0, 1.34, 0), 44, V(0.75, 1.52, 0.75), V(0, 1.35, 0), 42);
shot(wt("scene", "never") - 0.15, 2.4, hp(-13, 10.5, 24), hp(-1.6, 3, 0), 46, hp(-11.5, 9.5, 21.5), hp(-1.6, 3, 0), 46);
shot(A("secret"), 3.4, hp(-12.5, 9.5, 22.5), hp(-1.6, 4.2, 0), 48, hp(-11.5, 9, 21), hp(-1.6, 4.4, 0), 48);
shot(wt("secret", "once") - 0.1, 1.6, hp(-3.4, 5.4, 5.6), hp(-5.8, 4.6, 0.6), 42, hp(-3.8, 5.2, 5), hp(-5.8, 4.6, 0.6), 40);
shot(A("clock"), 2.6, hp(-2.8, 5.2, 6.6), hp(-5, 4.6, 0.6), 44, hp(-3.6, 5, 6), hp(-5, 4.6, 0.6), 42);
shot(wt("clock", "rounded") - 0.1, 2.0, hp(4.9, 4.9, 3.6), hp(5.9, 4.6, 0.6), 40, hp(5.3, 4.8, 3.0), hp(5.9, 4.6, 0.6), 38);
shot(A("blend"), 2.4, hp(-1.0, 5.6, 7.2), hp(-3.6, 2.6, 1.2), 46, hp(-1.6, 5.0, 6.4), hp(-3.6, 2.6, 1.2), 44);
shot(wt("blend", "six") - 0.2, 2.4, hp(-2.4, 4.4, 5.8), hp(-3.6, 3.6, 1.2), 42, hp(-2.8, 4.2, 5.2), hp(-3.6, 3.8, 1.2), 40);
shot(A("match"), 3.0, hp(-13, 8.5, 23.5), hp(-1.6, 3.4, 0), 46, hp(-11.5, 8, 21.5), hp(-1.6, 3.4, 0), 46);
shot(wt("match", "nothing") - 0.1, 2.0, hp(0, 4.5, 9), hp(0, 2.6, 0), 46, hp(0, 4.2, 8), hp(0, 2.6, 0), 46);
shot(A("steal"), 2.4, hp(1.8, 2.8, 10), hp(-0.8, 2.8, 3), 46, hp(1.4, 3.0, 9), hp(-0.6, 3.0, 3), 44);
shot(wt("steal", "later") - 0.2, 2.0, hp(0, 4.8, 7.2), hp(0, 4.6, 3.2), 40, hp(0, 4.7, 6.6), hp(0, 4.6, 3.2), 38);
shot(A("orbi"), 2.8, hp(-1.0, 5.2, 9), hp(-5, 3.2, 0), 46, hp(-2.2, 4.8, 8), hp(-5, 3.2, 0), 44);
shot(wt("orbi", "pieces") - 0.4, 2.6, hp(2, 6, 16), hp(1, 3.4, 0), 48, hp(3, 6, 14), hp(2, 3.4, 0), 48);
shot(A("end") - 0.05, 2.0, hp(-11.5, 9.5, 21.5), hp(-1.6, 3, 0), 46, hp(-13, 10.5, 24), hp(-1.6, 3, 0), 46);
const camAt = camRig(cam);
// ---------------------------------------------------------------- overlays
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
const big = (txt, t, a0, b0, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a0 || t > b0) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a0) / 0.12) * clamp((b0 - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a0) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  tag("tA", `new code · <b>every 30 s</b>`, t, wt("scene", "new"), wt("scene", "never") - 0.15);
  tag("tA", `phone ✕ website · <i>never talk</i>`, t, wt("scene", "never"), A("secret") - 0.05);
  tag("tA", `one scan · <b>same secret key</b>`, t, wt("secret", "same"), A("clock") - 0.05);
  tag("tA", `secret + <b>time ÷ 30 s</b>`, t, wt("clock", "time"), A("blend") - 0.05);
  tag("tA", `the blender · <b>a hash</b>`, t, wt("blend", "blender"), wt("blend", "six") - 0.1);
  tag("tA", `keep · <b>6 digits</b>`, t, wt("blend", "six"), A("match") - 0.05);
  big("SAME CODE ✓", t, wt("match", "same", 3), wt("match", "nothing") - 0.05, "#3dff8c", 300, 110);
  tag("tA", `nothing sent · <b>nothing to catch</b>`, t, wt("match", "nothing"), A("steal") - 0.05);
  tag("tA", `peeked code · <i>dead in 30 s</i>`, t, wt("steal", "later"), A("orbi") - 0.05);
  tag("tA", `Orbi · <b>passcode stays on your phone</b>`, t, wt("orbi", "passcode"), wt("orbi", "pieces") - 0.2);
  tag("tA", `only <b>locked pieces</b> travel`, t, wt("orbi", "pieces") - 0.2, A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camAt(SH, t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
