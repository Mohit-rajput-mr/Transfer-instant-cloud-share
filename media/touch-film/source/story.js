// "Your screen feels your electricity" — a 3D teardown film in the tyre-film v2 style (owner 2026-11-17 quality bar).
// Facts: capacitive touch screens = cover glass / a transparent conductive grid (often ITO: indium tin oxide) / the display.
// The controller drives rows, senses columns; each crossing has a small electric field (mutual capacitance), scanned many
// times a second. A finger (conductive, mostly salty water) takes part of that field → the signal at nearby crossings drops;
// the chip compares neighbouring dips to find the centre, finer than the grid; several fingers = several dips (pinch to zoom).
// Wool gloves insulate (no change); touch-screen gloves use conductive thread. Water drops conduct → false touches.
// A sausage conducts → works. Old resistive screens: two flexible layers pressed together (hard press, stylus).
import { THREE, K } from "./kit/engine.js";
const { V, clamp, ease, out, back, lerp, lerpV, rnd, sh, flat, makePhone, screen, addWorld, world, look, lookV, orbit, project,
  at, fr, prog, tag, tags, big, counter, redX, flash, timer, frame, ready, scene } = K;
const TAU = Math.PI * 2, D = Math.PI / 180;
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
  body: new THREE.MeshStandardMaterial({ color: 0x23262d, metalness: 0.6, roughness: 0.3, envMap: ENV }),
  frame: new THREE.MeshStandardMaterial({ color: 0xb9c0c9, metalness: 0.9, roughness: 0.25, envMap: ENV }),
  glass: new THREE.MeshStandardMaterial({ color: 0xdff1ff, metalness: 0.1, roughness: 0.05, envMap: ENV, transparent: true, opacity: 0.32, depthWrite: false }),
  glassEdge: new THREE.MeshStandardMaterial({ color: 0x9fd2ff, roughness: 0.1, transparent: true, opacity: 0.6 }),
  row: new THREE.MeshStandardMaterial({ color: 0x4f8bff, emissive: 0x4f8bff, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }),
  col: new THREE.MeshStandardMaterial({ color: 0x2fd39a, emissive: 0x2fd39a, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }),
  film: new THREE.MeshStandardMaterial({ color: 0xeaf6ff, roughness: 0.2, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
  skin: new THREE.MeshStandardMaterial({ color: 0xe9a685, roughness: 0.65 }),
  nail: new THREE.MeshStandardMaterial({ color: 0xf6d2c4, roughness: 0.3 }),
  wool: flat(0x7b4fd6, { roughness: 1 }),
  thread: new THREE.MeshStandardMaterial({ color: 0xd6dbe2, metalness: 0.9, roughness: 0.3, envMap: ENV }),
  sausage: new THREE.MeshStandardMaterial({ color: 0xb8452e, roughness: 0.45 }),
  drop: new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.05, transparent: true, opacity: 0.7 }),
};

// ---------- callouts ----------
document.body.insertAdjacentHTML("beforeend", `<svg class="ov" id="coL" width="1080" height="1920" style="left:0;top:0;z-index:30"></svg>` +
  [...Array(6)].map((_, i) => `<div class="ov" id="co${i}" style="z-index:31;padding:14px 24px;border-radius:14px;background:rgba(255,255,255,.96);color:#111;font:800 40px/1 D;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transform:translate(-50%,-50%)"></div>`).join(""));
let COS = [];
const callout = (t, a, b, v3, lx, ly, text, col = "#ff9a2a") => { const k = win(t, a, b); if (k > 0) COS.push({ k, v3: v3.clone(), lx, ly, text, col, a, t }); };
function drawCallouts() {
  scene.updateMatrixWorld(true); let svg = "";
  COS.slice(0, 6).forEach((c, i) => { const [x, y] = project(c.v3), el = document.getElementById("co" + i), grow = out(clamp((c.t - c.a) / 0.45));
    el.innerHTML = `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${c.col};margin-right:14px;vertical-align:-2px"></span>${c.text}`;
    Object.assign(el.style, { left: c.lx + "px", top: c.ly + "px", opacity: c.k });
    const ex = lerp(c.lx, x, grow), ey = lerp(c.ly, y, grow);
    svg += `<line x1="${c.lx}" y1="${c.ly}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-width="6" opacity="${c.k}"/><line x1="${c.lx}" y1="${c.ly}" x2="${ex}" y2="${ey}" stroke="${c.col}" stroke-width="3" opacity="${c.k}"/>` +
      (grow > 0.95 ? `<circle cx="${x}" cy="${y}" r="13" fill="${c.col}" stroke="#fff" stroke-width="5" opacity="${c.k}"/>` : ""); });
  for (let i = COS.length; i < 6; i++) document.getElementById("co" + i).style.opacity = 0;
  document.getElementById("coL").innerHTML = svg; COS = [];
}

// ---------- studio ----------
const studio = (name, bg) => { const w = addWorld(name, { bg, hemi: 0.95, sun: 2.3, sky: 0xffffff });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(bg).multiplyScalar(0.92), roughness: 0.95 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; w.add(fl);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.9); fill.position.set(-6, 4, 6); w.add(fill); return w; };
const SP = studio("P", 0xe6e3ee);

// ---------- the phone, lying flat: body / display / touch grid / glass ----------
const PW = 4, PL = 7.6;
const rbox = (w, h, d, r) => { const s = new THREE.Shape(), x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 10 }); g.rotateX(-Math.PI / 2); g.translate(0, 0, 0); return g; };
const body = sh(new THREE.Mesh(rbox(PW, 0.32, PL, 0.5), M.body)); SP.add(body);
const rimM = sh(new THREE.Mesh(rbox(PW + 0.06, 0.12, PL + 0.06, 0.52), M.frame)); rimM.position.y = 0.02; SP.add(rimM);
// display (a real picture: wallpaper + apps)
const dispTex = (() => { const c = document.createElement("canvas"); c.width = 400; c.height = 760; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 400, 760); gr.addColorStop(0, "#5b3df5"); gr.addColorStop(0.55, "#2fb6ff"); gr.addColorStop(1, "#3dff8c"); g.fillStyle = gr; g.fillRect(0, 0, 400, 760);
  g.fillStyle = "rgba(255,255,255,.95)"; g.font = "200 92px D"; g.textAlign = "center"; g.fillText("9:41", 200, 150);
  const cols = ["#ff5a5a", "#ffb02e", "#ffd84a", "#3dff8c", "#2fb6ff", "#ffffff", "#ff7ad9", "#7a5cff", "#1fc7a6", "#ff8a2a", "#e9eef5", "#4f8bff", "#ff3b6b", "#9be15d", "#ffd0a1", "#c3a6ff"];
  for (let i = 0; i < 16; i++) { const x = 40 + (i % 4) * 85, y = 250 + Math.floor(i / 4) * 105; g.fillStyle = cols[i]; g.beginPath(); g.roundRect(x, y, 64, 64, 16); g.fill(); }
  g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.roundRect(30, 660, 340, 80, 30); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const DISP = new THREE.Group(); SP.add(DISP);
const dispMat = new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false });
const disp = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.3, PL - 0.3), dispMat); disp.rotation.x = -Math.PI / 2; DISP.add(disp);
const dispBase = sh(new THREE.Mesh(new THREE.BoxGeometry(PW - 0.2, 0.06, PL - 0.2), M.body)); dispBase.position.y = -0.035; DISP.add(dispBase);
const ripple = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 40), glow(0xffffff, 0)); ripple.rotation.x = -Math.PI / 2; ripple.position.y = 0.01; DISP.add(ripple);
// touch grid: columns (along z, sensed) under rows (along x, driven)
const GRID = new THREE.Group(); SP.add(GRID);
const CX = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], RZ = [...Array(15)].map((_, i) => -3.5 + i * 0.5);
const film = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.2, PL - 0.2), M.film); film.rotation.x = -Math.PI / 2; film.position.y = -0.01; GRID.add(film);
for (const x of CX) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, PL - 0.4), M.col); m.position.set(x, 0, 0); GRID.add(m); }
const rowMeshes = RZ.map((z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(PW - 0.4, 0.015, 0.07), M.row.clone()); m.position.set(0, 0.05, z); GRID.add(m); return m; });
// crossings: a node, a field arc, a signal bar
const XS = []; for (const z of RZ) for (const x of CX) XS.push({ x, z });
const arcGeo = new THREE.TorusGeometry(0.2, 0.022, 6, 18, Math.PI), barGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 10); barGeo.translate(0, 0.5, 0);
for (const c of XS) { c.arc = new THREE.Mesh(arcGeo, glow(0x7fe9ff, 0)); c.arc.position.set(c.x, 0.03, c.z); c.arc.rotation.y = Math.PI / 4; GRID.add(c.arc);
  c.bar = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: 0x4fb4ff, emissive: 0x4fb4ff, emissiveIntensity: 0.3 })); c.bar.position.set(c.x, 0.06, c.z); GRID.add(c.bar);
  c.node = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glow(0xffffff, 0.9)); c.node.position.set(c.x, 0.05, c.z); GRID.add(c.node); }
// glass
const GLASS = new THREE.Group(); SP.add(GLASS);
const glass = new THREE.Mesh(rbox(PW - 0.04, 0.1, PL - 0.04, 0.48), M.glass); GLASS.add(glass);
// centre marker
const cross = new THREE.Group(); SP.add(cross); { const r = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40), glow(0xffffff)); r.rotation.x = -Math.PI / 2; cross.add(r);
  for (const a of [0, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.8), glow(0xffffff)); b.rotation.x = -Math.PI / 2; b.rotation.z = a * Math.PI / 2; cross.add(b); } }
const cross2 = cross.clone(); SP.add(cross2);
// stolen field: dots from the crossings up to the fingertip
const SN = 220, stolen = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), glow(0x7fe9ff), SN); stolen.frustumCulled = false; SP.add(stolen);
const SPp = [...Array(SN)].map(() => ({ c: Math.floor(rnd() * 9), ph: rnd(), j: rnd() }));
const _M = new THREE.Matrix4(), _Z = new THREE.Matrix4().makeScale(0, 0, 0);

// ---------- fingers, glove, sausage, raindrops ----------
function makeFinger() { const g = new THREE.Group(), axis = new THREE.Group(); g.add(axis); axis.rotation.x = -0.75;
  const shaft = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 3.2, 20), M.skin)); shaft.position.y = 1.6 + 0.3; axis.add(shaft);
  const tip = sh(new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), M.skin)); tip.position.y = 0.3; tip.scale.set(1, 0.9, 0.85); axis.add(tip);
  const nail = sh(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.06), M.nail)); nail.position.set(0, 0.85, 0.33); axis.add(nail);
  const knuckle = sh(new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 6, 20), M.skin)); knuckle.rotation.x = Math.PI / 2; knuckle.position.y = 1.9; axis.add(knuckle);
  const glove = new THREE.Group(); axis.add(glove); const gs = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 3.4, 9, 6), M.wool)); gs.position.y = 1.9; glove.add(gs); const gt = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), M.wool)); gt.position.y = 0.3; glove.add(gt);
  const thr = sh(new THREE.Mesh(new THREE.SphereGeometry(0.47, 16, 10, 0, TAU, Math.PI * 0.55, Math.PI * 0.45), M.thread)); thr.position.y = 0.3; glove.add(thr);
  g.userData = { glove, thr, skin: [shaft, tip, nail, knuckle] }; SP.add(g); return g; }
const F1 = makeFinger(), F2 = makeFinger();
const sausage = new THREE.Group(); SP.add(sausage); { const s = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 3.0, 8, 18), M.sausage)); s.position.y = 1.9; sausage.add(s); const tie = sh(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), flat(0xe8d2a6))); tie.position.y = 3.95; sausage.add(tie); sausage.rotation.x = -0.6; }
const drops = [[-1.1, -2.2], [0.9, -0.6], [-0.4, 1.4], [1.2, 2.5], [-1.3, 0.3]].map(([x, z]) => { const m = sh(new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 10, 0, TAU, 0, Math.PI / 2), M.drop)); m.scale.set(1, 0.45, 1); m.position.set(x, 0, z); m.userData = { x, z }; SP.add(m); return m; });
const ghostRings = drops.map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 32), glow(0xffffff, 0)); m.rotation.x = -Math.PI / 2; DISP.add(m); return m; });

// ---------- old resistive screen (world R) ----------
const SR = studio("R", 0xe9e3d8);
const topSheet = new THREE.Mesh(new THREE.PlaneGeometry(6, 6, 60, 60), new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.3, transparent: true, opacity: 0.75, side: THREE.DoubleSide })); topSheet.rotation.x = -Math.PI / 2; topSheet.position.y = 1.6; SR.add(topSheet);
const botSheet = sh(new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x8fb8e8, roughness: 0.4 }))); botSheet.position.y = 1.0; SR.add(botSheet);
const coatT = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0xffc94a, emissiveIntensity: 0.2, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); coatT.rotation.x = -Math.PI / 2; coatT.position.y = 1.07; SR.add(coatT);
for (let i = 0; i < 64; i++) { const d = sh(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), flat(0xffffff))); d.position.set(-2.6 + (i % 8) * 0.75, 1.1, -2.6 + Math.floor(i / 8) * 0.75); SR.add(d); }
const stylus = new THREE.Group(); SR.add(stylus); { const s = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 14), flat(0x333840))); s.position.y = 2.1; stylus.add(s); const tp = sh(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 14), flat(0x333840))); tp.rotation.x = Math.PI; tp.position.y = 0.0; stylus.add(tp); stylus.rotation.z = 0.35; }
const spark = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.18, 30), glow(0xffd24a, 0)); spark.rotation.x = -Math.PI / 2; spark.position.y = 1.15; SR.add(spark);

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

// ---------- the film ----------
frame("Try it on two phones", async (t) => {
  const k = (a, b) => prog(t, a, b), A = (key) => at(key), F = fr;
  // explode: from "layers" until "orbi" (closes for the hook, the glove/sausage taps stay exploded)
  const ex = t < A("layers") ? 0 : ease(k(F("layers", 0.05), F("layers", 0.35)));
  const yDisp = 0.36, yGrid = 0.39 + 1.5 * ex, yGlass = 0.42 + 3.0 * ex, yTop = yGlass + 0.13;
  DISP.position.y = yDisp; GRID.position.y = yGrid; GLASS.position.y = yGlass;
  M.film.opacity = 0.18 * ex; const wireOp = 0.9 * clamp((t - F("layers", 0.6)) / 0.6) * (t < A("layers") ? 0 : 1); M.col.opacity = wireOp; rowMeshes.forEach((m) => { m.material.opacity = wireOp; m.visible = wireOp > 0.01; }); GRID.visible = t >= A("layers");
  M.glass.opacity = 0.32;
  // fingers / objects: tip position (x, z) and height above the glass (0 = touching)
  F1.visible = F2.visible = sausage.visible = false; drops.forEach((d) => (d.visible = false)); cross.visible = cross2.visible = false;
  F1.userData.glove.visible = false; F1.userData.thr.visible = false; F1.userData.skin.forEach((m) => (m.visible = true));
  const touches = []; // {x, z, s}: strength of the field taken
  const place = (G, x, z, h) => { G.visible = true; G.position.set(x, yTop + h, z); };
  const tapH = (a, b) => { const q = k(a, b); return q <= 0 ? 2.5 : q >= 1 ? 2.5 : 2.5 * (1 - Math.sin(Math.min(1, q * 1.6) * Math.PI / 2)) + (q > 0.62 ? (q - 0.62) * 6 : 0); };
  let rippleK = 0, ripXZ = [0, 0];
  if (t < A("layers")) { // hook: glove → nothing; sausage → works
    if (t < F("hook", 0.3)) { place(F1, 0.3, 0.8, Math.max(0, tapH(F("hook", 0.0), F("hook", 0.28)))); F1.userData.glove.visible = true; F1.userData.skin.forEach((m) => (m.visible = false)); }
    else if (t < F("hook", 0.6)) { const h = Math.max(0, tapH(F("hook", 0.3), F("hook", 0.58))); sausage.visible = true; sausage.position.set(0.3, yTop + h, 0.8); if (h < 0.05) { rippleK = k(F("hook", 0.4), F("hook", 0.55)); ripXZ = [0.3, 0.8]; } }
  }
  const finger1 = (x, z, h, s = 1) => { place(F1, x, z, h); const near = clamp(1 - h / 1.4); if (near > 0) touches.push({ x, z, s: near * s }); };
  if (t >= A("finger") && t < A("multi")) { const h = t < A("dip") ? lerp(2.4, 0.0, ease(k(F("finger", 0.15), F("finger", 0.8)))) : 0; finger1(0.25, 0.25, h); }
  if (t >= A("multi") && t < A("glove")) { const sp = ease(k(F("multi", 0.2), F("multi", 0.75))) * 1.1, h = lerp(2, 0, ease(k(A("multi"), F("multi", 0.18))));
    finger1(-0.35 - sp * 0.5, 0.6 + sp, h); place(F2, 0.35 + sp * 0.5, -0.6 - sp, h); F2.userData.glove.visible = false; F2.userData.thr.visible = false; if (h < 1.4) touches.push({ x: 0.35 + sp * 0.5, z: -0.6 - sp, s: clamp(1 - h / 1.4) }); }
  if (t >= A("glove") && t < A("rain")) { const thread = t > F("glove", 0.62); F1.userData.glove.visible = true; F1.userData.thr.visible = thread; F1.userData.skin.forEach((m) => (m.visible = false));
    const h = thread ? Math.max(0, tapH(F("glove", 0.62), F("glove", 0.98))) : Math.max(0, tapH(F("glove", 0.05), F("glove", 0.45))); place(F1, 0.25, 0.25, h); if (thread && h < 1.4) touches.push({ x: 0.25, z: 0.25, s: clamp(1 - h / 1.4) }); }
  if (t >= A("rain") && t < A("sausage")) { drops.forEach((d, i) => { const q = ease(k(F("rain", 0.05 + i * 0.06), F("rain", 0.15 + i * 0.06))); d.visible = q > 0; d.position.set(d.userData.x, yTop - 0.08 + (1 - q) * 3, d.userData.z); if (q >= 1) touches.push({ x: d.userData.x, z: d.userData.z, s: 0.7 }); }); }
  if (t >= A("sausage") && t < A("old")) { const h = lerp(2.4, 0, ease(k(F("sausage", 0.02), F("sausage", 0.3)))); sausage.visible = true; sausage.position.set(0.25, yTop + h, 0.25); if (h < 1.4) touches.push({ x: 0.25, z: 0.25, s: clamp(1 - h / 1.4) }); }

  // signal at every crossing
  const scanRow = Math.floor((t * 22) % RZ.length);
  let sw = 0, sx = 0, sz = 0; const show = t >= A("field") && t < A("old");
  for (const c of XS) { let dip = 0; for (const f of touches) dip += 0.75 * f.s * Math.exp(-((c.x - f.x) ** 2 + (c.z - f.z) ** 2) / 0.28); dip = Math.min(0.9, dip); c.s = 1 - dip;
    const ri = RZ.indexOf(c.z), scan = ri === scanRow ? 1 : 0;
    c.arc.material.opacity = show ? (0.45 + 0.55 * scan) * c.s * clamp((t - A("field")) / 0.8) : 0;
    const bars = t >= A("dip") && t < A("old") ? ease(k(A("dip"), F("dip", 0.2))) : 0;
    c.bar.visible = bars > 0.01 && (c.x - 0.25) ** 2 + (c.z - 0.25) ** 2 < 3.2; c.bar.scale.set(1, Math.max(0.01, bars * 0.6 * (0.1 + 0.9 * c.s)), 1); c.bar.material.color.setHex(c.s < 0.75 ? 0xff8a2a : 0x4fb4ff); c.bar.material.emissive.setHex(c.s < 0.75 ? 0xff8a2a : 0x4fb4ff);
    c.node.material.opacity = t >= A("grid") && t < A("old") ? 0.9 : 0; }
  rowMeshes.forEach((m, i) => (m.material.emissiveIntensity = show && i === scanRow ? 1.4 : 0.5));
  // centre(s) from the dips
  const centres = touches.map((f) => { let w = 0, x = 0, z = 0; for (const c of XS) { const d = 1 - c.s; if (d > 0.05 && (c.x - f.x) ** 2 + (c.z - f.z) ** 2 < 0.8) { w += d; x += c.x * d; z += c.z * d; } } return w > 0 ? [x / w, z / w, w] : null; }).filter(Boolean);
  if (t >= F("centre", 0.55) && t < A("glove") && centres[0]) { cross.visible = true; cross.position.set(centres[0][0], yGrid + 0.08, centres[0][1]); cross.scale.setScalar(back(k(F("centre", 0.55), F("centre", 0.7)))); }
  if (t >= A("multi") && t < A("glove") && centres[1]) { cross2.visible = true; cross2.position.set(centres[1][0], yGrid + 0.08, centres[1][1]); cross.visible = !!centres[0]; if (centres[0]) cross.position.set(centres[0][0], yGrid + 0.08, centres[0][1]); }
  // stolen field dots: from the crossings near each touch up to it
  for (let i = 0; i < SN; i++) { const p = SPp[i], f = touches[i % Math.max(1, touches.length)];
    if (!show || !f || f.s < 0.15 || t < A("finger")) { stolen.setMatrixAt(i, _Z); continue; }
    const near = XS.filter((c) => (c.x - f.x) ** 2 + (c.z - f.z) ** 2 < 0.6); const c = near[p.c % Math.max(1, near.length)]; if (!c) { stolen.setMatrixAt(i, _Z); continue; }
    const q = (t * 0.7 + p.ph) % 1, a = V(c.x, yGrid + 0.1, c.z), b = V(f.x + (p.j - 0.5) * 0.3, yTop + 0.05, f.z + (p.j - 0.5) * 0.2), v = a.lerp(b, q); v.y += Math.sin(q * Math.PI) * 0.25;
    _M.makeScale(f.s, f.s, f.s).setPosition(v); stolen.setMatrixAt(i, _M); }
  stolen.instanceMatrix.needsUpdate = true;
  // display reacts: a ripple under touches when assembled (hook / end of sausage)
  if (t >= F("sausage", 0.55) && t < A("old")) { rippleK = (t * 1.2) % 1; ripXZ = [0.25, 0.25]; }
  ripple.material.opacity = rippleK > 0 && rippleK < 1 ? 0.9 * (1 - rippleK) : 0; ripple.scale.setScalar(1 + rippleK * 4); ripple.position.set(ripXZ[0], 0.01, ripXZ[1]);
  ghostRings.forEach((m, i) => { const on = t >= F("rain", 0.5) && t < A("sausage"); const q = (t * 0.9 + i * 0.27) % 1; m.material.opacity = on ? 0.85 * (1 - q) : 0; m.scale.setScalar(1 + q * 3); m.position.set(drops[i].userData.x, 0.012, drops[i].userData.z); });
  // pinch zoom: the picture grows
  const zoom = t >= A("multi") && t < A("glove") ? 1 + 0.35 * ease(k(F("multi", 0.2), F("multi", 0.75))) : 1; dispTex.repeat.set(1 / zoom, 1 / zoom); dispTex.offset.set((1 - 1 / zoom) / 2, (1 - 1 / zoom) / 2);

  // ===== old resistive (world R) =====
  { const q = k(F("old", 0.25), F("old", 0.55)), press = Math.sin(clamp(q) * Math.PI) > 0 ? Math.min(1, clamp(q * 2.2)) * (q < 0.85 ? 1 : 1 - (q - 0.85) / 0.15) : 0;
    const pos = topSheet.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), d2 = (x - 0.4) ** 2 + (y + 0.4) ** 2; pos.setZ(i, -0.55 * press * Math.exp(-d2 / 0.5)); } pos.needsUpdate = true; topSheet.geometry.computeVertexNormals();
    stylus.position.set(0.4 + Math.sin(0.35) * 0, 1.6 - 0.55 * press + 0.02, 0.4); spark.position.set(0.4, 1.12, 0.4); spark.material.opacity = press > 0.95 ? 0.9 : 0; spark.scale.setScalar(1 + (t * 3 % 1) * 2); }

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
  const top = (q) => look(lerp(0.6, 0, q), lerp(11, 10, q), lerp(8.0, 7.2, q), 0, 0.6, 0.3, 42);
  const side = (q, d = 1) => look(lerp(7.2, 6.4, q) * d, lerp(6.4, 6.0, q), lerp(8.6, 7.6, q), 0, 1.7, 0, 42);
  const close = (q, x = 0.25, z = 0.25) => lookV(V(x + lerp(3.4, 2.8, q), yGrid + lerp(3.3, 2.8, q), z + lerp(4.4, 3.6, q)), V(x, yGrid + 0.6, z), 42);
  if (t < F("hook", 0.3)) { world("P"); top(k(0, F("hook", 0.3))); callout(t, F("hook", 0.03), F("hook", 0.3), F1.position.clone().add(V(0, 1.1, -1.0)), 780, 330, "WOOL GLOVE", "#7b4fd6"); if (t > F("hook", 0.14)) redX(t, F("hook", 0.14), V(0.3, yTop, 0.8)); }
  else if (t < F("hook", 0.6)) { world("P"); top(0.5 + 0.5 * k(F("hook", 0.3), F("hook", 0.6))); callout(t, F("hook", 0.32), F("hook", 0.6), sausage.position.clone().add(V(0, 1.24, -0.85)), 780, 330, "A SAUSAGE", "#b8452e"); big(t, F("hook", 0.44), F("hook", 0.6), "IT WORKS!", 1000); }
  else if (t < A("layers")) { world("P"); const q = k(F("hook", 0.6), A("layers")); orbit(V(0, 0.6, 0), lerp(0.2, 0.7, q), lerp(11, 10, q), lerp(8, 5.5, q), 42); big(t, F("hook", 0.62), F("hook", 0.84), "IT FEELS YOU", 420); counter(t, F("hook", 0.66), A("layers"), "⚡ ELECTRICITY"); }
  else if (t < A("grid")) { world("P"); const q = k(A("layers"), A("grid")); side(q);
    callout(t, F("layers", 0.3), A("grid"), V(-1.6, yGlass + 0.1, 2.8), 260, 330, "GLASS", "#4fb4ff"); callout(t, F("layers", 0.45), A("grid"), V(-1.6, yDisp, 3.2), 260, 1000, "DISPLAY", "#7a5cff");
    callout(t, F("layers", 0.7), A("grid"), V(1.5, yGrid, 2.0), 820, 600, "INVISIBLE LAYER", "#2fd39a"); }
  else if (t < A("field")) { world("P"); const q = k(A("grid"), A("field")); lookV(V(lerp(4.5, 3.6, q), yGrid + lerp(4.8, 4.0, q), lerp(5.6, 4.6, q)), V(0, yGrid, 0.2), 42);
    callout(t, F("grid", 0.05), A("field"), V(1.0, yGrid + 0.02, -1.3), 820, 330, "SEE-THROUGH WIRES", "#2fd39a"); callout(t, F("grid", 0.25), F("grid", 0.6), V(0.0, yGrid, 1.5), 260, 1000, "INDIUM TIN OXIDE", "#ffd24a");
    callout(t, F("grid", 0.7), A("field"), V(-1.2, yGrid + 0.05, 1.0), 260, 330, "ROWS", "#4f8bff"); callout(t, F("grid", 0.82), A("field"), V(-1.0, yGrid, -2.6), 260, 1000, "COLUMNS", "#2fd39a"); }
  else if (t < A("finger")) { world("P"); const q = k(A("field"), A("finger")); close(q, 0, 0);
    callout(t, F("field", 0.05), F("field", 0.4), V(-1.2, yGrid + 0.05, RZ[scanRow]), 820, 330, "PULSE", "#4f8bff"); callout(t, F("field", 0.3), A("finger"), V(0.0, yGrid + 0.18, 0.0), 260, 330, "A TINY FIELD", "#7fe9ff");
    counter(t, F("field", 0.65), A("finger"), "SCANNED NONSTOP"); }
  else if (t < A("dip")) { world("P"); const q = k(A("finger"), A("dip")); close(q);
    callout(t, F("finger", 0.08), F("finger", 0.5), F1.position.clone().add(V(0, 1.1, -1.0)), 820, 330, "SALTY WATER", "#e9a685"); callout(t, F("finger", 0.55), A("dip"), V(0.25, yGrid + 0.6, 0.25), 260, 1000, "IT STEALS FIELD", "#7fe9ff"); }
  else if (t < A("centre")) { world("P"); const q = k(A("dip"), A("centre")); close(q);
    callout(t, F("dip", 0.1), A("centre"), V(0.5, yGrid + 0.4, 0.5), 260, 1000, "SIGNAL DROPS", "#ff8a2a"); big(t, F("dip", 0.65), A("centre"), "RIGHT HERE", 420); counter(t, F("dip", 0.2), A("centre"), `SIGNAL ${Math.round(100 * Math.min(...XS.map((c) => c.s)))}%`); }
  else if (t < A("multi")) { world("P"); const q = k(A("centre"), A("multi")); lookV(V(0.25 + lerp(1.2, 0.6, q), yGrid + lerp(6.2, 5.6, q), 0.25 + lerp(2.6, 2.0, q)), V(0.25, yGrid, 0.25), 42);
    callout(t, F("centre", 0.1), F("centre", 0.5), V(0.5, yGrid + 0.3, 0.5), 820, 330, "A FEW AT ONCE", "#ff8a2a"); callout(t, F("centre", 0.6), A("multi"), cross.position, 820, 330, "THE CENTRE", "#ffffff"); }
  else if (t < A("glove")) { world("P"); const q = k(A("multi"), A("glove")); look(lerp(3.6, 3.0, q), yGrid + lerp(8.4, 7.8, q), lerp(6.4, 5.6, q), 0, yGrid, 0, 42); big(t, F("multi", 0.05), F("multi", 0.3), "TWO DIPS", 420); big(t, F("multi", 0.72), A("glove"), "PINCH TO ZOOM", 420); }
  else if (t < A("rain")) { world("P"); const q = k(A("glove"), A("rain")); close(q * 0.6);
    callout(t, F("glove", 0.05), F("glove", 0.55), F1.position.clone().add(V(0, 1.1, -1.0)), 820, 330, "WOOL: INSULATOR", "#7b4fd6"); if (t > F("glove", 0.2) && t < F("glove", 0.58)) redX(t, F("glove", 0.2), V(0.25, yTop, 0.25));
    callout(t, F("glove", 0.65), A("rain"), F1.position.clone().add(V(0, 0.15, 0.2)), 820, 330, "CONDUCTIVE THREAD", "#d6dbe2"); }
  else if (t < A("sausage")) { world("P"); const q = k(A("rain"), A("sausage")); side(q, 0.8); callout(t, F("rain", 0.4), A("sausage"), drops[1].position, 820, 330, "WATER CONDUCTS", "#4fb4ff"); callout(t, F("rain", 0.6), A("sausage"), V(drops[2].userData.x, yDisp, drops[2].userData.z), 260, 1000, "GHOST TAPS", "#ffffff"); }
  else if (t < A("old")) { world("P"); const q = k(A("sausage"), A("old")); if (q < 0.55) close(q); else side((q - 0.55) / 0.45);
    callout(t, F("sausage", 0.08), F("sausage", 0.55), sausage.position.clone().add(V(0, 1.24, -0.85)), 820, 330, "SALTY + WET", "#b8452e"); big(t, F("sausage", 0.62), A("old"), "IT'S A FINGER", 420); }
  else if (t < A("orbi")) { world("R"); const q = k(A("old"), A("orbi")); look(lerp(5.6, 4.8, q), lerp(5.0, 4.2, q), lerp(7.4, 6.4, q), 0, 1.2, 0, 42);
    callout(t, F("old", 0.1), F("old", 0.45), V(-2.0, 1.6, 2.0), 260, 330, "FLEXIBLE LAYER", "#4fb4ff"); callout(t, F("old", 0.2), F("old", 0.5), V(-2.0, 1.07, 2.4), 260, 1000, "SECOND LAYER", "#ffc94a");
    callout(t, F("old", 0.5), A("orbi"), V(0.4, 1.12, 0.4), 820, 330, "PRESS = CONTACT", "#ffd24a"); big(t, F("old", 0.72), A("orbi"), "PRESS HARD", 420); }
  else if (t < O2) { world("orbi"); const q = k(O, O2); look(lerp(1.5, 0.6, q), lerp(2.6, 2.4, q), lerp(6.5, 5.2, q), 0, 2.2, 0, 44);
    flash(t, F("orbi", 0.2), 0.6, 3); tag("tR", t, F("orbi", 0.5), O2, 540, 190); }
  else { world("orbi"); const q = k(O2, A("end")); orbit(V(1, 1.9, -1), lerp(0.1, -0.4, q), lerp(9, 7.5, q), 2.5, 46);
    tag("tT", t, F("orbi2", 0.02), F("orbi2", 0.3), 540, 190); tag("tS", t, F("orbi2", 0.3), F("orbi2", 0.58), 540, 190); timer(t, F("orbi2", 0.6), F("orbi2", 0.95)); }
  drawCallouts();
});
await ready();
