// "A password carved in metal" — how a pin tumbler lock works. 3D cutaway film, tyre-film v2 style (owner 2026-11-17 bar).
// Facts: housing + rotating plug; pin stacks (key pin, driver pin, spring) drilled through both; the shear line is the gap
// between plug and housing. No key: drivers cross it, the plug can't turn. The right key lifts every stack so each key/driver
// gap sits on the shear line → the plug turns, the cam pulls the bolt. A cut too shallow pushes a key pin across the line.
// Depth steps are a fraction of a millimetre. 5 pins × several depths = thousands of keys. Linus Yale Jr.: cylinder lock,
// 1860s, after his father's pin tumbler (1848). Ancient Egypt used wooden pin locks.
import { THREE, K } from "./kit/engine.js";
const { V, clamp, ease, out, back, lerp, lerpV, rnd, sh, flat, makePhone, screen, addWorld, world, look, lookV, orbit, project,
  at, fr, prog, tag, tags, big, counter, redX, flash, timer, frame, ready, scene } = K;
const TAU = Math.PI * 2;
const glow = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
const win = (t, a, b, f = 0.3) => clamp((t - a) / f) * clamp((b - t) / f);

const ENV = (() => {
  const pm = new THREE.PMREMGenerator(K.r), s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x6d737c, side: THREE.BackSide })));
  const panel = (x, y, z, w, h, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c, c, c), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  panel(0, 12, 0, 16, 10, 4); panel(-12, 3, 4, 6, 12, 2.2); panel(12, 2, -3, 5, 10, 1.6); panel(0, -2, 13, 20, 3, 1.2);
  return pm.fromScene(s, 0.03).texture;
})();
const M = {
  shell: new THREE.MeshStandardMaterial({ color: 0x2b2f38, metalness: 0.35, roughness: 0.32, envMap: ENV, side: THREE.DoubleSide }),
  cushion: new THREE.MeshStandardMaterial({ color: 0x3b3f48, roughness: 0.85 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xc3c9d2, metalness: 0.9, roughness: 0.25, envMap: ENV }),
  paper: new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.7, side: THREE.DoubleSide }),
  chip: new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.4, emissive: 0x2fb6ff, emissiveIntensity: 0 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd8a84a, metalness: 0.9, roughness: 0.3, envMap: ENV }),
  copper: new THREE.MeshStandardMaterial({ color: 0xd07a3a, metalness: 0.7, roughness: 0.35, envMap: ENV }),
  skin: new THREE.MeshStandardMaterial({ color: 0xe0a07e, roughness: 0.65, side: THREE.DoubleSide }),
  hair: new THREE.MeshStandardMaterial({ color: 0x2a1d17, roughness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.6 }),
  drum: new THREE.MeshStandardMaterial({ color: 0xf1b9a5, roughness: 0.4, side: THREE.DoubleSide }),
  white: new THREE.MeshStandardMaterial({ color: 0xf4f6fa, metalness: 0.2, roughness: 0.35, envMap: ENV }),
  wing: new THREE.MeshStandardMaterial({ color: 0xd9dee6, metalness: 0.4, roughness: 0.35, envMap: ENV }),
  cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
};

// ---------- callouts ----------
document.body.insertAdjacentHTML("beforeend", `<svg class="ov" id="coL" width="1080" height="1920" style="left:0;top:0;z-index:30"></svg>` +
  [...Array(6)].map((_, i) => `<div class="ov" id="co${i}" style="z-index:31;padding:14px 24px;border-radius:14px;background:rgba(255,255,255,.96);color:#111;font:800 40px/1 D;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transform:translate(-50%,-50%)"></div>`).join("") +
  `<div class="ov" id="scope" style="left:90px;top:110px;width:900px;height:360px;z-index:29;border-radius:28px;background:rgba(10,14,22,.84);box-shadow:0 14px 40px rgba(0,0,0,.35);opacity:0"><svg id="scopeS" width="900" height="360"></svg></div>`);
let COS = [];
const callout = (t, a, b, v3, lx, ly, text, col = "#ff9a2a") => { const k = win(t, a, b); if (k > 0) COS.push({ k, v3: v3.clone(), lx, ly, text, col, a, t }); };
function drawCallouts() {
  scene.updateMatrixWorld(true); K.cam.updateMatrixWorld(); let svg = "";
  COS.slice(0, 6).forEach((c, i) => { const [x, y] = project(c.v3), el = document.getElementById("co" + i), grow = out(clamp((c.t - c.a) / 0.45));
    el.innerHTML = `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${c.col};margin-right:14px;vertical-align:-2px"></span>${c.text}`;
    Object.assign(el.style, { left: c.lx + "px", top: c.ly + "px", opacity: c.k });
    const ex = lerp(c.lx, x, grow), ey = lerp(c.ly, y, grow);
    svg += `<line x1="${c.lx}" y1="${c.ly}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-width="6" opacity="${c.k}"/><line x1="${c.lx}" y1="${c.ly}" x2="${ex}" y2="${ey}" stroke="${c.col}" stroke-width="3" opacity="${c.k}"/>` +
      (grow > 0.95 ? `<circle cx="${x}" cy="${y}" r="13" fill="${c.col}" stroke="#fff" stroke-width="5" opacity="${c.k}"/>` : ""); });
  for (let i = COS.length; i < 6; i++) document.getElementById("co" + i).style.opacity = 0;
  document.getElementById("coL").innerHTML = svg; COS = [];
}
// oscilloscope panel: rows of live waveforms
let SC = null;
const scope = (t, a, b, rows) => { const k = win(t, a, b); if (k > 0) SC = { k, rows }; };
function drawScope() { const el = document.getElementById("scope"); if (!SC) { el.style.opacity = 0; return; } el.style.opacity = SC.k;
  const h = 340 / SC.rows.length; let s = "";
  SC.rows.forEach((r, i) => { const mid = 10 + h * i + h / 2; let d = "";
    for (let j = 0; j <= 140; j++) { const x = j / 140; d += (j ? "L" : "M") + (250 + x * 610).toFixed(1) + " " + (mid - r.f(x) * h * 0.34).toFixed(1); }
    s += `<line x1="250" y1="${mid}" x2="860" y2="${mid}" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/><text x="34" y="${mid + 12}" fill="${r.col}" font-family="D" font-weight="800" font-size="32">${r.label}</text>` +
      `<path d="${d}" fill="none" stroke="${r.col}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="${r.op ?? 1}"/>`; });
  document.getElementById("scopeS").innerHTML = s; SC = null; }

// ---------- studio ----------
const studio = (name, bg) => { const w = addWorld(name, { bg, hemi: 0.95, sun: 2.3, sky: 0xffffff });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(bg).multiplyScalar(0.92), roughness: 0.95 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; w.add(fl);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.9); fill.position.set(-6, 4, 6); w.add(fill); return w; };

// ---------- lock materials ----------
const L = {
  brass: new THREE.MeshStandardMaterial({ color: 0xd8a843, metalness: 0.85, roughness: 0.3, envMap: ENV }),
  plug: new THREE.MeshStandardMaterial({ color: 0xc28a2e, metalness: 0.8, roughness: 0.35, envMap: ENV }),
  keyPin: new THREE.MeshStandardMaterial({ color: 0xf0c45a, metalness: 0.9, roughness: 0.22, envMap: ENV, emissive: 0x000000 }),
  driver: new THREE.MeshStandardMaterial({ color: 0xc8ced8, metalness: 0.9, roughness: 0.22, envMap: ENV }),
  spring: new THREE.MeshStandardMaterial({ color: 0x9aa3b1, metalness: 0.9, roughness: 0.3, envMap: ENV }),
  key: new THREE.MeshStandardMaterial({ color: 0xd9dde4, metalness: 0.9, roughness: 0.2, envMap: ENV }),
  keyW: new THREE.MeshStandardMaterial({ color: 0xb98b4a, metalness: 0.85, roughness: 0.25, envMap: ENV }),
  hole: new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.8 }),
  bolt: new THREE.MeshStandardMaterial({ color: 0xb9c0c9, metalness: 0.9, roughness: 0.25, envMap: ENV }),
};
const WOOD = new THREE.Color(0x9a6a3c), BRASS = new THREE.Color(0xd8a843), PLUGC = new THREE.Color(0xc28a2e), KP = new THREE.Color(0xf0c45a), DRC = new THREE.Color(0xc8ced8);
const SL = studio("L", 0xe8e4dc), PY = 3.0, SHEAR = 4.0, PX = [-2, -1, 0, 1, 2], PL = [0.7, 1.1, 0.5, 0.9, 0.6], REST = 2.8, DL = 0.8, TOPY = 6.3;
const HR = PL.map((l) => SHEAR - l), HW = HR.map((h, i) => (i === 3 ? h + 0.35 : h));
// housing: euro profile, cut in half (back stays, front lifts away)
const halfShape = (s) => { const sh2 = new THREE.Shape(), r = 1.45, c = Math.sqrt(r * r - 0.0625), up = Math.sqrt(r * r - 0.81);
  sh2.moveTo(s * 0.25, PY - c); sh2.absarc(0, PY, r, s > 0 ? -Math.acos(0.25 / r) : Math.PI + Math.acos(0.25 / r), s > 0 ? Math.asin(up / r) : Math.PI - Math.asin(up / r), s < 0);
  sh2.lineTo(s * 0.9, 6.3); sh2.quadraticCurveTo(s * 0.9, 6.5, s * 0.7, 6.5); sh2.lineTo(s * 0.25, 6.5); sh2.lineTo(s * 0.25, PY - c);
  const g = new THREE.ExtrudeGeometry(sh2, { depth: 6.4, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -3.2); g.rotateY(Math.PI / 2); return g; };
const HB = sh(new THREE.Mesh(halfShape(1), L.brass)); SL.add(HB); // rotateY maps shape x → -z, so s=+1 is the back half
const HF = sh(new THREE.Mesh(halfShape(-1), L.brass)); SL.add(HF);
for (const x of PX) { const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.52, TOPY - SHEAR + 0.05), L.hole); ch.position.set(x, (TOPY + SHEAR) / 2, -0.23); SL.add(ch); }
// plug group (rotates about its axis)
const PLUG = new THREE.Group(); PLUG.position.set(0, PY, 0); SL.add(PLUG);
{ const f = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2), L.plug); f.position.set(0, 0, -0.24); PLUG.add(f);
  const kw = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.35), L.hole); kw.position.set(0.1, -0.03, -0.235); PLUG.add(kw);
  for (const x of PX) { const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.4), L.hole); ch.position.set(x, 0.82, -0.235); PLUG.add(ch); }
  const end = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), L.plug); end.rotation.y = Math.PI / 2; end.position.x = 3.22; PLUG.add(end);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.06, 40), L.hole); ring.rotation.y = Math.PI / 2; ring.position.x = 3.225; PLUG.add(ring);
  const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.35), L.hole); slot.rotation.y = Math.PI / 2; slot.position.set(3.23, -0.03, 0); PLUG.add(slot);
  const cam = sh(new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.5), L.bolt)); cam.position.set(-3.35, -0.75, 0); PLUG.add(cam); }
const bolt = sh(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 3.0), L.bolt)); SL.add(bolt);
// pins + springs
const helix = (() => { const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * TAU * 8; pts.push(V(Math.cos(a) * 0.17, i / 160, Math.sin(a) * 0.17)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.028, 6); })();
const KPm = PL.map((l) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, l, 22), L.keyPin.clone())); m.geometry.translate(0, l / 2, 0); PLUG.add(m); return m; });
const KPtip = KPm.map((m) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.16, 22), m.material); c.rotation.x = Math.PI; c.position.y = -0.08; m.add(c); return c; });
const DRm = PX.map(() => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, DL, 22), L.driver.clone())); m.geometry.translate(0, DL / 2, 0); SL.add(m); return m; });
const SPm = PX.map(() => { const m = new THREE.Mesh(helix, L.spring); SL.add(m); return m; });
const gapM = PX.map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24), glow(0xffffff, 0)); SL.add(m); return m; });
const shear = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.045, 0.02), glow(0xffd24a, 0)); shear.position.set(0, SHEAR, 0.26); SL.add(shear);
// keys: blade profile = V-cuts at each pin
const prof = (H) => (xl) => { let v = 3.65; H.forEach((h, i) => (v = Math.min(v, h + 1.0 * Math.max(0, Math.abs(xl - PX[i]) - 0.12)))); return Math.min(v, 2.5 + (xl + 3.1) * 1.4); };
function makeKey(H, mat) { const g = new THREE.Group(), p = prof(H), s = new THREE.Shape(); s.moveTo(3.5, 2.4); s.lineTo(-2.95, 2.4);
  for (let x = -3.1; x <= 3.5001; x += 0.04) s.lineTo(x, Math.max(2.4, p(x))); s.lineTo(3.5, 3.9); s.lineTo(3.5, 2.4);
  const bl = new THREE.ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: false }); bl.translate(0, -PY, -0.12); g.add(sh(new THREE.Mesh(bl, mat)));
  const bow = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.26, 40), mat)); bow.rotation.x = Math.PI / 2; bow.position.set(4.6, 0.15, 0); g.add(bow);
  const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 24), L.hole); hl.rotation.x = Math.PI / 2; hl.position.set(5.2, 0.15, 0); g.add(hl);
  g.userData.p = p; return g; }
const KR = makeKey(HR, L.key), KWk = makeKey(HW, L.keyW); PLUG.add(KR, KWk);
// world K: a row of different keys
const SK = studio("K", 0xe6e3ee); K.reseed(11);
const KEYS = [...Array(6)].map((_, i) => { const H = PX.map(() => 2.9 + Math.floor(rnd() * 5) * 0.15), w = new THREE.Group(); w.position.set(-3.1 + i * 1.24, 5.0, (i % 2) * -0.5); w.rotation.z = -Math.PI / 2; w.scale.setScalar(0.62); SK.add(w);
  const kk = makeKey(H, i % 2 ? L.key : L.keyW); kk.position.set(-1.3, -0.15, 0); w.add(kk); return w; });

// ---------- Orbi ----------
const orb = addWorld("orbi", { bg: 0x07090f, fog: [10, 30], hemi: 0.8, sun: 1.4, sky: 0x9fb8ff });
orb.add(new THREE.GridHelper(40, 40, 0x173a2a, 0x10241a));
const PH = { phone: makePhone() }; PH.phone.g.scale.setScalar(22); PH.phone.g.position.set(0, 2.2, 0); orb.add(PH.phone.g);
const PH2 = { phone: makePhone() }; PH2.phone.g.scale.setScalar(14); PH2.phone.g.position.set(2.6, 1.6, -2.5); PH2.phone.g.rotation.y = -0.5; orb.add(PH2.phone.g);
const beam = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0x3dff8c)); orb.add(beam);
K.reseed(3); const EN = 220, emberGeo = new THREE.BufferGeometry(), emberPos = new Float32Array(EN * 3), emberDir = [...Array(EN)].map(() => [(rnd() - 0.5) * 3.4, rnd() * 3 + 0.5, (rnd() - 0.5) * 2.4]);
emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffa04a, size: 0.09, transparent: true, opacity: 0, toneMapped: false })); orb.add(embers);
tags({ tR: "Locked <b>on your phone</b>", tS: "No login · <b>no app</b>", tT: "Other phone · <b>about a second</b>" });

// ================= the film =================
frame("Try it on two phones", async (t) => {
  const k = (a, b) => prog(t, a, b), A = (key) => at(key), F = fr, seg = (a, b) => t >= A(a) && t < A(b);
  // ===== the lock =====
  { let u = 99, which = KR, rot = 0, wood = 0, gapOn = 0, shearOn = 0;
    const ins = (a, b) => lerp(7.5, 0, ease(k(a, b))), outK = (a, b) => lerp(0, 7.5, ease(k(a, b)));
    if (t < A("parts")) { const q = k(A("hook"), A("parts"));
      if (q > 0.24 && q < 0.53) { which = KWk; u = q < 0.38 ? ins(F("hook", 0.24), F("hook", 0.36)) : q < 0.49 ? 0 : outK(F("hook", 0.49), F("hook", 0.53)); if (q > 0.38 && q < 0.49) rot = 0.05 * Math.sin(t * 40); }
      if (q >= 0.53) { u = q < 0.82 ? ins(F("hook", 0.53), F("hook", 0.61)) : outK(F("hook", 0.84), F("hook", 0.95)); rot = 1.3 * ease(k(F("hook", 0.62), F("hook", 0.7))) * (1 - ease(k(F("hook", 0.76), F("hook", 0.83)))); } }
    if (seg("block", "key")) { if (t > F("block", 0.62) && t < F("block", 0.9)) rot = 0.05 * Math.sin(t * 40); shearOn = clamp((t - F("block", 0.15)) / 0.5); }
    if (seg("key", "align")) { u = lerp(7.5, 0, k(F("key", 0.12), F("key", 0.9))); shearOn = 1; }
    if (seg("align", "turn")) { u = 0; shearOn = 1; gapOn = ease(k(F("align", 0.4), F("align", 0.6))); }
    if (seg("turn", "wrong")) { u = 0; shearOn = 1 - clamp((t - F("turn", 0.2)) / 0.5); gapOn = 1 - shearOn; rot = (Math.PI / 2) * ease(k(F("turn", 0.15), F("turn", 0.6))); }
    if (seg("wrong", "combos")) { shearOn = 1; if (t < F("wrong", 0.1)) { u = outK(A("wrong"), F("wrong", 0.1)); } else { which = KWk; u = ins(F("wrong", 0.12), F("wrong", 0.38)); gapOn = ease(k(F("wrong", 0.38), F("wrong", 0.48))); }
      if (t > F("wrong", 0.48) && t < F("wrong", 0.75)) rot = 0.05 * Math.sin(t * 40); }
    if (seg("history", "orbi")) { u = 0; wood = ease(k(F("history", 0.6), F("history", 0.72))); rot = 0.6 * Math.sin(Math.max(0, t - F("history", 0.75)) * 1.2) * (t > F("history", 0.75) ? 1 : 0); }
    if (t < A("history")) { /* unlocked turn above uses KR */ }
    KR.visible = which === KR && u < 9; KWk.visible = which === KWk && u < 9; which.position.x = u;
    PLUG.rotation.x = -rot; bolt.position.set(-3.35, PY - 1.9, lerp(0.5, -0.9, Math.sin(clamp(rot / (Math.PI / 2)) * Math.PI / 2)));
    const p = which.userData.p, aligned = rot > 0.3;
    PX.forEach((x, i) => { const xl = x - u, under = u < 9 && xl > -3.1 && xl < 3.5, kb = Math.max(REST, under ? p(xl) : REST), top = kb + PL[i];
      KPm[i].position.set(x, kb - PY, 0);
      const db = aligned ? Math.max(SHEAR, top) : top; DRm[i].position.set(x, db, 0);
      SPm[i].position.set(x, db + DL, 0); SPm[i].scale.y = Math.max(0.05, TOPY - db - DL);
      const bad = Math.abs(top - SHEAR) > 0.06, crossK = top > SHEAR + 0.06;
      gapM[i].position.set(x, top, 0); gapM[i].material.opacity = gapOn * 0.95; gapM[i].material.color.setHex(bad ? 0xff3b3b : 0x3dff8c);
      KPm[i].material.emissive.setHex(gapOn > 0.5 && crossK ? 0x8a0000 : 0x000000);
      KPm[i].material.color.copy(KP).lerp(WOOD, wood); DRm[i].material.color.copy(DRC).lerp(WOOD, wood); });
    shear.material.opacity = 0.95 * shearOn; L.brass.color.copy(BRASS).lerp(WOOD, wood); L.plug.color.copy(PLUGC).lerp(WOOD.clone().multiplyScalar(0.85), wood);
    L.brass.metalness = L.plug.metalness = lerp(0.85, 0.05, wood); L.brass.roughness = L.plug.roughness = lerp(0.3, 0.8, wood);
    const cutE = t < A("parts") ? 0 : ease(k(F("parts", 0.04), F("parts", 0.3))); HF.position.set(0, 3.5 * cutE, 3.0 * cutE); HF.visible = cutE < 0.97;
    KEYS.forEach((w, i) => { const q = ease(k(F("combos", 0.05 + i * 0.07), F("combos", 0.2 + i * 0.07))); w.position.y = lerp(13, 5.0, q); w.rotation.y = Math.sin(t * 0.8 + i) * 0.25; }); }

  // ===== Orbi =====
  const O = A("orbi"), O2 = A("orbi2");
  screen(PH, { layers: [["one", 1]], tap: t > F("orbi", 0.1) && t < F("orbi", 0.3) ? [195, 700, k(F("orbi", 0.1), F("orbi", 0.3))] : null, lock: ease(k(F("orbi", 0.45), F("orbi", 0.75))) });
  const arr = k(F("orbi2", 0.02), F("orbi2", 0.22)); screen(PH2, { layers: [["many", 1]], glow: arr >= 1 ? 1 : 0 });
  beam.visible = t > F("orbi2", 0.02) && arr < 1; beam.position.copy(lerpV(V(0, 2.2, 0.3), V(2.6, 1.6, -2.3), ease(arr))).add(V(0, Math.sin(arr * Math.PI) * 1.2, 0));
  const burn = k(F("orbi2", 0.62), F("orbi2", 0.95));
  PH.phone.g.scale.setScalar(22 * (1 - burn * 0.95)); PH.phone.g.visible = burn < 1;
  for (let i = 0; i < EN; i++) { const d = emberDir[i]; emberPos.set([d[0] * out(burn), 2.2 + d[1] * out(burn) - burn * burn, d[2] * out(burn)], i * 3); }
  emberGeo.attributes.position.needsUpdate = true; embers.material.opacity = burn > 0 && burn < 1 ? 1 - burn * 0.6 : 0;

  // ================= shots =================
  const endV = (q) => lookV(V(lerp(12.5, 11.0, q), lerp(7.0, 6.2, q), lerp(8.0, 8.6, q)), V(1.4, PY + 0.9, 0), 40);
  const side = (q) => lookV(V(lerp(5.2, 4.2, q), lerp(6.6, 6.0, q), lerp(10.5, 9.4, q)), V(0, 4.0, 0), 42);
  const pinC = (q, x = 0) => lookV(V(x + lerp(3.0, 2.4, q), lerp(5.4, 5.0, q), lerp(8.4, 7.4, q)), V(x, 4.1, 0), 42);
  if (t < A("parts")) { world("L"); const q = k(0, A("parts")); endV(q);
    big(t, F("hook", 0.02), F("hook", 0.22), "A PASSWORD IN METAL", 420);
    if (t > F("hook", 0.4) && t < F("hook", 0.5)) redX(t, F("hook", 0.4), V(3.3, PY + 0.4, 0)); callout(t, F("hook", 0.26), F("hook", 0.5), V(6, PY + 0.2, 0), 820, 1000, "WRONG KEY", "#ff5a5a");
    callout(t, F("hook", 0.55), F("hook", 0.8), V(6, PY + 0.2, 0), 820, 1000, "RIGHT KEY", "#3dff8c"); big(t, F("hook", 0.66), F("hook", 0.84), "IT TURNS", 420); }
  else if (t < A("pins")) { world("L"); const q = k(A("parts"), A("pins")); side(q);
    callout(t, F("parts", 0.3), A("pins"), V(-2.6, 5.6, -0.2), 260, 330, "HOUSING", "#d8a843"); callout(t, F("parts", 0.45), A("pins"), V(-2.4, PY - 0.6, -0.2), 260, 1000, "PLUG", "#c28a2e");
    callout(t, F("parts", 0.7), A("pins"), V(3.3, PY + 0.5, 0.6), 820, 1000, "THIS HAS TO TURN", "#ffffff"); }
  else if (t < A("block")) { world("L"); const q = k(A("pins"), A("block")); pinC(q, 0);
    callout(t, F("pins", 0.3), A("block"), V(0, REST + 0.3, 0.2), 260, 1000, "KEY PIN", "#f0c45a"); callout(t, F("pins", 0.5), A("block"), V(0, REST + PL[2] + 0.4, 0.2), 820, 1000, "DRIVER PIN", "#c8ced8");
    callout(t, F("pins", 0.7), A("block"), V(0, 5.9, 0.2), 820, 330, "SPRING", "#9aa3b1"); }
  else if (t < A("key")) { world("L"); const q = k(A("block"), A("key")); pinC(q, -0.5);
    callout(t, F("block", 0.15), A("key"), V(-2.6, SHEAR, 0.3), 260, 330, "SHEAR LINE", "#ffd24a"); callout(t, F("block", 0.42), A("key"), V(-1, SHEAR, 0.25), 820, 1000, "DRIVER CROSSES IT", "#ff5a5a");
    big(t, F("block", 0.75), A("key"), "CAN'T TURN", 420); }
  else if (t < A("align")) { world("L"); const q = k(A("key"), A("align")); side(0.5 + q * 0.5); callout(t, F("key", 0.1), F("key", 0.6), V(KR.position.x + 1, PY - 0.7, 0.2), 820, 1000, "THE CUTS", "#d9dde4"); }
  else if (t < A("turn")) { world("L"); const q = k(A("align"), A("turn")); pinC(q, 0); big(t, F("align", 0.55), A("turn"), "ALL ON THE LINE", 420); }
  else if (t < A("wrong")) { world("L"); const q = k(A("turn"), A("wrong")); q < 0.5 ? endV(q * 2) : side(q);
    callout(t, F("turn", 0.55), A("wrong"), V(-3.35, PY - 1.9, 0), 260, 1000, "BOLT", "#b9c0c9"); big(t, F("turn", 0.7), A("wrong"), "UNLOCKED", 420); }
  else if (t < A("combos")) { world("L"); const q = k(A("wrong"), A("combos")); pinC(q, 0.6);
    callout(t, F("wrong", 0.42), A("combos"), V(1, SHEAR + 0.2, 0.2), 820, 330, "TOO HIGH", "#ff5a5a"); if (t > F("wrong", 0.5) && t < F("wrong", 0.75)) redX(t, F("wrong", 0.5), V(1, SHEAR, 0.4));
    counter(t, F("wrong", 0.75), A("combos"), "OFF BY < 1 MM"); }
  else if (t < A("history")) { world("K"); const q = k(A("combos"), A("history")); look(0, lerp(5.6, 5.2, q), lerp(15.5, 14, q), 0, 5.0, 0, 42);
    counter(t, F("combos", 0.05), A("history"), "5 PINS × SEVERAL HEIGHTS"); big(t, F("combos", 0.55), A("history"), "THOUSANDS OF KEYS", 420); }
  else if (t < A("orbi")) { world("L"); const q = k(A("history"), A("orbi")); orbit(V(0.4, 4.0, 0), lerp(0.9, 0.2, q), 10.5, 2.0, 42);
    big(t, F("history", 0.03), F("history", 0.5), "1860s · LINUS YALE JR.", 420); big(t, F("history", 0.62), A("orbi"), "ANCIENT EGYPT: WOOD", 420); }
  else if (t < O2) { world("orbi"); const q = k(O, O2); look(lerp(1.5, 0.6, q), lerp(2.6, 2.4, q), lerp(6.5, 5.2, q), 0, 2.2, 0, 44);
    flash(t, F("orbi", 0.2), 0.6, 3); tag("tR", t, F("orbi", 0.5), O2, 540, 190); }
  else { world("orbi"); const q = k(O2, A("end")); orbit(V(1, 1.9, -1), lerp(0.1, -0.4, q), lerp(9, 7.5, q), 2.5, 46);
    tag("tT", t, F("orbi2", 0.02), F("orbi2", 0.3), 540, 190); tag("tS", t, F("orbi2", 0.3), F("orbi2", 0.58), 540, 190); timer(t, F("orbi2", 0.6), F("orbi2", 0.95)); }
  drawCallouts(); drawScope();
});
await ready();
