// "Why the cold locks your charge" — how a lithium battery works, and why cold hides its charge. tyre-film v2 style.
// Facts: a Li-ion cell = graphite anode / metal-oxide cathode / porous separator / liquid electrolyte. Charge is stored as
// lithium ions sitting between graphite layers; discharging, each Li+ moves through the electrolyte to the cathode and an
// electron goes round the external circuit = current. Cold raises the electrolyte's viscosity and the charge-transfer
// resistance at the electrode surface, so ions move slower: less current, the voltage sags under load and the phone hits
// its low-voltage cutoff with charge still inside. Warming restores it. Charging cold causes lithium plating on the anode
// (metallic Li instead of intercalation) — permanent capacity loss. EVs lose winter range for the same reason.
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
  anode: new THREE.MeshStandardMaterial({ color: 0x2a2e36, metalness: 0.5, roughness: 0.5, envMap: ENV }),
  cathode: new THREE.MeshStandardMaterial({ color: 0x8a4a9e, metalness: 0.55, roughness: 0.45, envMap: ENV }),
  sep: new THREE.MeshStandardMaterial({ color: 0xeaf2ff, roughness: 0.3, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  can: new THREE.MeshStandardMaterial({ color: 0xc3c9d2, metalness: 0.9, roughness: 0.25, envMap: ENV, side: THREE.DoubleSide }),
  copper: new THREE.MeshStandardMaterial({ color: 0xd07a3a, metalness: 0.75, roughness: 0.3, envMap: ENV }),
  wire: new THREE.MeshStandardMaterial({ color: 0x3a3f49, roughness: 0.5, metalness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe3ff, metalness: 0.1, roughness: 0.08, envMap: ENV, transparent: true, opacity: 0.3, depthWrite: false }),
  honey: new THREE.MeshStandardMaterial({ color: 0xe6a52a, roughness: 0.25, transparent: true, opacity: 0.92 }),
  carBody: new THREE.MeshStandardMaterial({ color: 0x2f6bff, metalness: 0.5, roughness: 0.3, envMap: ENV }),
  snow: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
  tyre: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.7 }),
  graph: new THREE.MeshStandardMaterial({ color: 0x33373f, metalness: 0.4, roughness: 0.55, envMap: ENV }),
  silver: new THREE.MeshStandardMaterial({ color: 0xcfd6e0, metalness: 0.95, roughness: 0.2, envMap: ENV }),
};
const LI = new THREE.Color(0x3dff8c), ELEC = new THREE.Color(0x4fd0ff), HOT = new THREE.Color(0xff8a2a), COLD = new THREE.Color(0x6cc6ff);

// ---------- callouts ----------
document.body.insertAdjacentHTML("beforeend", `<svg class="ov" id="coL" width="1080" height="1920" style="left:0;top:0;z-index:30"></svg>` +
  [...Array(6)].map((_, i) => `<div class="ov" id="co${i}" style="z-index:31;padding:14px 24px;border-radius:14px;background:rgba(255,255,255,.96);color:#111;font:800 40px/1 D;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transform:translate(-50%,-50%)"></div>`).join("") +
  `<div class="ov" id="therm" style="right:70px;top:150px;width:120px;height:430px;z-index:29;opacity:0"><svg id="thermS" width="120" height="430"></svg></div>`);
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
// thermometer panel (right side): temp in °C, mercury colour hot→cold
let TH = null;
const therm = (t, a, b, degC) => { const k = win(t, a, b); if (k > 0) TH = { k, degC }; };
function drawTherm() { const el = document.getElementById("therm"); if (!TH) { el.style.opacity = 0; return; } el.style.opacity = TH.k;
  const frac = clamp((TH.degC + 20) / 50), col = TH.degC < 5 ? "#6cc6ff" : "#ff8a2a", top = 360 - frac * 300;
  document.getElementById("thermS").innerHTML =
    `<rect x="46" y="40" width="28" height="330" rx="14" fill="rgba(255,255,255,.12)" stroke="#fff" stroke-opacity=".3" stroke-width="3"/>` +
    `<circle cx="60" cy="384" r="30" fill="${col}"/><rect x="50" y="${top}" width="20" height="${384 - top}" rx="10" fill="${col}"/>` +
    `<text x="60" y="26" fill="#fff" font-family="D" font-weight="800" font-size="34" text-anchor="middle">${Math.round(TH.degC)}°C</text>`; TH = null; }

// ---------- studio ----------
const studio = (name, bg) => { const w = addWorld(name, { bg, hemi: 0.95, sun: 2.3, sky: 0xffffff });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(bg).multiplyScalar(0.92), roughness: 0.95 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; w.add(fl);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.9); fill.position.set(-6, 4, 6); w.add(fill); return w; };
const _M = new THREE.Matrix4(), _Z = new THREE.Matrix4().makeScale(0, 0, 0);

// ================= world B: the cell, cut open =================
const SB = studio("B", 0xe7e9ef);
const CELL = new THREE.Group(); SB.add(CELL);
const AX = -2.4, CX = 2.4; // anode face x, cathode face x
// electrodes: tall thin slabs; the anode (graphite) is layered
const anode = sh(new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 3.2), M.anode)); anode.position.set(AX - 0.5, 2.6, 0); CELL.add(anode);
const cathode = sh(new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 3.2), M.cathode)); cathode.position.set(CX + 0.5, 2.6, 0); CELL.add(cathode);
// graphite layer lines (visual "tucked between layers")
const layers = []; for (let i = 0; i < 8; i++) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.05, 3.24), M.graph)); l.position.set(AX - 0.5, 0.7 + i * 0.52, 0); CELL.add(l); layers.push(l); }
// current collectors + tabs
const aCol = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 5, 3.2), M.copper)); aCol.position.set(AX - 0.86, 2.6, 0); CELL.add(aCol);
const cCol = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 5, 3.2), M.can)); cCol.position.set(CX + 0.86, 2.6, 0); CELL.add(cCol);
// separator in the middle
const sep = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5), M.sep); sep.rotation.y = Math.PI / 2; sep.position.set(0, 2.6, 0); CELL.add(sep);
// electrolyte haze (thickness): instanced dots that jitter a lot warm, barely cold
const HN = 260, haze = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshStandardMaterial({ color: 0xbfe0ff, roughness: 0.5, transparent: true, opacity: 0.5 }), HN);
haze.frustumCulled = false; CELL.add(haze);
const hazeP = [...Array(HN)].map(() => ({ x: AX + rnd() * (CX - AX), y: 0.5 + rnd() * 4.2, z: (rnd() - 0.5) * 2.8, ph: rnd() * TAU }));
// lithium ions: stream anode → cathode, speed = flow
const IN = 150, ions = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshStandardMaterial({ color: 0x3dff8c, emissive: 0x1f7a44, emissiveIntensity: 0.6, roughness: 0.3 }), IN);
ions.frustumCulled = false; CELL.add(ions);
const ionP = [...Array(IN)].map(() => ({ y: 0.7 + rnd() * 4.0, z: (rnd() - 0.5) * 2.6, ph: rnd(), lane: rnd() }));
// external circuit: wire from anode tab, up and over to a phone, back to cathode
const wirePts = [V(AX - 0.86, 5.3, 0), V(AX - 0.86, 7.2, 0), V(0, 8.4, 0), V(CX + 0.86, 7.2, 0), V(CX + 0.86, 5.3, 0)];
const wireCurve = new THREE.CatmullRomCurve3(wirePts);
CELL.add(new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 60, 0.07, 8), M.wire));
// electrons along the wire (anode → phone → cathode)
const EN2 = 60, elec = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), glow(0x4fd0ff), EN2); elec.frustumCulled = false; CELL.add(elec);
// the phone (the load) at the top
const LOAD = new THREE.Group(); LOAD.position.set(0, 8.9, 0); CELL.add(LOAD);
const phoneTex = (() => { const c = document.createElement("canvas"); c.width = 200; c.height = 400; const g = c.getContext("2d");
  g.fillStyle = "#0a0c10"; g.fillRect(0, 0, 200, 400); return { c, g, tex: new THREE.CanvasTexture(c) }; })();
phoneTex.tex.colorSpace = THREE.SRGBColorSpace;
const loadBody = sh(new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.3, 0.3), flat(0x1b1e24))); LOAD.add(loadBody);
const loadScr = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 3.0), new THREE.MeshBasicMaterial({ map: phoneTex.tex, toneMapped: false })); loadScr.position.z = 0.16; LOAD.add(loadScr);
const drawPhone = (pct, on) => { const g = phoneTex.g; g.fillStyle = on ? "#0b1020" : "#000"; g.fillRect(0, 0, 200, 400);
  if (on) { g.fillStyle = "#101826"; for (let i = 0; i < 12; i++) { const x = 24 + (i % 3) * 56, y = 150 + ((i / 3) | 0) * 56; g.beginPath(); g.roundRect(x, y, 44, 44, 10); g.fill(); g.fillStyle = ["#ff5a5a", "#ffb02e", "#3dff8c", "#2fb6ff", "#ff7ad9", "#7a5cff", "#1fc7a6", "#ff8a2a", "#9be15d", "#4f8bff", "#e9eef5", "#ff3b6b"][i]; g.fillRect(x, y, 44, 44); g.fillStyle = "#101826"; }
    const bw = 120, bx = 40; g.strokeStyle = "#fff"; g.lineWidth = 6; g.strokeRect(bx, 70, bw, 40); g.fillStyle = "#fff"; g.fillRect(bx + bw, 82, 8, 16);
    g.fillStyle = pct < 20 ? "#ff5a5a" : "#3dff8c"; g.fillRect(bx + 5, 75, (bw - 10) * pct / 100, 30); g.fillStyle = "#fff"; g.font = "700 40px D"; g.textAlign = "center"; g.fillText(pct + "%", 100, 300); }
  phoneTex.tex.needsUpdate = true; };
drawPhone(40, true);

// ================= world H: honey analogy =================
const SH = studio("H", 0xf0ecdf);
const HONEY = [[-3, 25, 1], [3, -10, 0]].map(([x, deg, fast], i) => { const g = new THREE.Group(); g.position.set(x, 0, 0); SH.add(g);
  const jar = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.4, 32, 1, true), M.glass)); jar.position.y = 6; g.add(jar);
  const pool = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.6, 32), M.honey)); pool.position.y = 5.0; g.add(pool);
  const stream = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 4.4, 16), M.honey)); stream.position.y = 2.6; g.add(stream);
  const drop = sh(new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), M.honey)); g.add(drop);
  const blob = sh(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M.honey)); blob.scale.set(1, 0.4, 1); blob.position.y = 0.1; g.add(blob);
  g.userData = { stream, drop, blob, fast: !!fast }; return g; });

// ================= world P: plating close-up =================
const SP = studio("P", 0xe9edf2);
const surf = sh(new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 5), M.graph)); surf.position.y = 1.0; SP.add(surf);
for (let i = 0; i < 6; i++) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(8.04, 0.14, 5.04), M.anode)); l.position.y = 0.4 + i * 0.26; SP.add(l); }
const PGN = 90, plate = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: 0xcfd6e0, metalness: 0.95, roughness: 0.2, envMap: ENV }), PGN);
plate.frustumCulled = false; SP.add(plate);
const plateP = [...Array(PGN)].map((_, i) => ({ x: -3.4 + (i % 18) * 0.4, z: -2 + ((i / 18) | 0) * 1.0, drop: 2 + rnd() * 2, ph: rnd() }));
const PIN = 50, pIon = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: 0x3dff8c, emissive: 0x1f7a44, emissiveIntensity: 0.6 }), PIN);
pIon.frustumCulled = false; SP.add(pIon);

// ================= world E: the EV in snow =================
const SE = addWorld("E", { bg: 0xbfe0ff, fog: [26, 80], hemi: 1.05, sun: 2.2, sky: 0xffffff });
{ const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), M.snow); ground.rotation.x = -Math.PI / 2; SE.add(ground);
  K.reseed(5); for (let i = 0; i < 40; i++) { const d = sh(new THREE.Mesh(new THREE.SphereGeometry(0.4 + rnd(), 10, 8), M.snow)); d.scale.y = 0.4; d.position.set((rnd() - 0.5) * 70, 0, -8 - rnd() * 50); SE.add(d); } }
const CAR = new THREE.Group(); CAR.position.set(0, 1.1, 0); SE.add(CAR);
{ const body = sh(new THREE.Mesh(new THREE.BoxGeometry(7, 1.5, 3), M.carBody)); body.position.y = 0.3; CAR.add(body);
  const cabin = sh(new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 2.7), M.carBody)); cabin.position.set(-0.3, 1.3, 0); CAR.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 2.72), M.glass); glass.position.set(-0.3, 1.35, 0); CAR.add(glass);
  for (const [x, z] of [[-2.2, 1.5], [-2.2, -1.5], [2.2, 1.5], [2.2, -1.5]]) { const w = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 20), M.tyre)); w.rotation.x = Math.PI / 2; w.position.set(x, -0.5, z); CAR.add(w); } }
const snowFall = (() => { const g = new THREE.BufferGeometry(), N = 300, p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) p.set([(rnd() - 0.5) * 50, rnd() * 24, -2 - rnd() * 40], i * 3);
  g.setAttribute("position", new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9 })); SE.add(pts); return { g, p, N: 300 }; })();

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
  const k = (a, b) => prog(t, a, b), A = (key) => at(key), F = fr, seg = (a, b) => t >= A(a) && t < A(b), wp = (o) => o.getWorldPosition(new THREE.Vector3());
  const c = new THREE.Color();

  // ===== world B: flow = how fast ions move (1 warm, ~0.12 cold); dead = phone cut off =====
  let flow = 1, dead = 0, revive = 0, loadPct = 92, loadOn = 1;
  if (t < A("warm")) flow = 1;
  if (seg("cold", "sag")) flow = lerp(1, 0.14, ease(k(F("cold", 0.25), F("cold", 0.85))));
  if (seg("sag", "stuck")) { flow = 0.14; const q = k(A("sag"), A("sag") + 0.001); dead = ease(k(F("sag", 0.5), F("sag", 0.82))); loadPct = 40; }
  if (seg("stuck", "plating")) { flow = lerp(0.14, 1, ease(k(F("stuck", 0.5), F("stuck", 0.85)))); dead = 1 - ease(k(F("stuck", 0.5), F("stuck", 0.85))); revive = ease(k(F("stuck", 0.55), F("stuck", 0.9))); loadPct = 40; }
  if (t >= A("plating")) flow = 0.6;
  if (seg("hook", "parts")) { flow = t < F("hook", 0.4) ? 1 : 0.1; dead = t > F("hook", 0.45) ? ease(k(F("hook", 0.4), F("hook", 0.6))) : 0; loadPct = 40; }
  loadOn = dead > 0.5 ? 0 : 1; drawPhone(Math.round(loadPct), loadOn);
  // electrolyte colour warm↔cold and thickness jitter
  haze.material.color.copy(HOT).lerp(COLD, 1 - clamp((flow - 0.14) / 0.86)); haze.material.opacity = lerp(0.3, 0.62, 1 - flow);
  for (let i = 0; i < HN; i++) { const p = hazeP[i], j = flow * 0.18; _M.makeTranslation(p.x + Math.sin(t * flow * 2 + p.ph) * j, p.y + Math.cos(t * flow * 1.7 + p.ph) * j, p.z); haze.setMatrixAt(i, _M); }
  haze.instanceMatrix.needsUpdate = true;
  // ions crossing anode→cathode (hidden in plating/ev/orbi)
  const ionsShow = t >= A("ions") && t < A("plating");
  for (let i = 0; i < IN; i++) { const p = ionP[i];
    if (!ionsShow) { ions.setMatrixAt(i, _Z); continue; }
    const speed = flow * 0.16 * (0.7 + p.lane * 0.6), prog2 = (p.ph + t * speed) % 1;
    const x = lerp(AX - 0.1, CX + 0.1, prog2), wob = Math.sin(prog2 * 10 + p.ph * TAU) * 0.12 * flow;
    const s = t < A("flow") ? (x < AX + 0.3 ? 1 : 0) : 1; // before "flow": ions sit in the graphite
    const xx = t < A("flow") ? AX - 0.5 : x;
    _M.makeScale(s, s, s).setPosition(xx, p.y + wob, p.z); ions.setMatrixAt(i, _M); }
  ions.instanceMatrix.needsUpdate = true;
  // electrons round the wire — only while current flows and the phone is on
  const current = ionsShow && t >= A("flow") && loadOn ? flow : 0;
  for (let i = 0; i < EN2; i++) { if (!current) { elec.setMatrixAt(i, _Z); continue; }
    const u = (t * current * 0.22 + i / EN2) % 1, v = wireCurve.getPoint(u); _M.makeTranslation(v.x, v.y, v.z); elec.setMatrixAt(i, _M); }
  elec.instanceMatrix.needsUpdate = true;
  loadScr.material.opacity = 1;

  // ===== world H: honey warm (fast drip) vs cold (slow) =====
  HONEY.forEach((g, i) => { const warm = i === 0, speed = warm ? 1 : 0.18, u = (t * speed * 0.5) % 1;
    g.userData.drop.visible = true; g.userData.drop.position.y = lerp(4.6, 0.3, u); g.userData.drop.scale.setScalar(lerp(1, 0.6, u));
    g.userData.stream.scale.y = warm ? 1 : 0.5 + 0.5 * Math.sin(t * 2); g.userData.blob.scale.x = 1 + u * (warm ? 3 : 1); });

  // ===== world P: plating — ions land and pile as metal =====
  const plShow = seg("plating", "ev");
  const pq = plShow ? ease(k(F("plating", 0.4), F("plating", 0.95))) : 0;
  for (let i = 0; i < PGN; i++) { const p = plateP[i]; if (!plShow || p.ph > pq) { plate.setMatrixAt(i, _Z); continue; }
    const land = clamp((pq - p.ph) / 0.2), y = lerp(p.drop + 2, 1.7 + (i % 3) * 0.18, ease(land));
    _M.makeTranslation(p.x, y, p.z); plate.setMatrixAt(i, _M); }
  plate.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < PIN; i++) { if (!plShow) { pIon.setMatrixAt(i, _Z); continue; }
    const u = (t * 0.5 + i / PIN) % 1; _M.makeTranslation(-3.4 + (i % 25) * 0.28, lerp(6, 2.0, u), -2 + ((i / 25) | 0) * 1.2); pIon.setMatrixAt(i, _M); }
  pIon.instanceMatrix.needsUpdate = true;

  // ===== world E: snow falls, range bar =====
  for (let i = 0; i < snowFall.N; i++) { snowFall.p[i * 3 + 1] -= 0.08 + (i % 5) * 0.01; if (snowFall.p[i * 3 + 1] < 0) snowFall.p[i * 3 + 1] += 24; }
  snowFall.g.attributes.position.needsUpdate = true;

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
  const wide = (q) => lookV(V(lerp(7.5, 6.2, q), lerp(5.2, 4.6, q), lerp(12, 10.5, q)), V(0, 3.4, 0), 42);
  const mid = (q) => lookV(V(lerp(4.6, 3.8, q), lerp(4.0, 3.6, q), lerp(8.4, 7.2, q)), V(0, 2.6, 0), 42);
  const gap = (q) => lookV(V(lerp(2.6, 2.0, q), lerp(3.2, 2.9, q), lerp(6.0, 5.0, q)), V(0, 2.6, 0), 44);
  if (t < A("parts")) { world("B"); const q = k(0, A("parts")); wide(q);
    therm(t, F("hook", 0.4), A("parts"), lerp(22, -8, ease(k(F("hook", 0.38), F("hook", 0.62)))));
    callout(t, F("hook", 0.05), F("hook", 0.34), wp(LOAD), 540, 300, "SAYS 40%", "#ff5a5a");
    big(t, F("hook", 0.44), F("hook", 0.64), "THEN DIES", 1000); big(t, F("hook", 0.68), A("parts"), "THE CHARGE IS STILL IN THERE", 1000); }
  else if (t < A("ions")) { world("B"); const q = k(A("parts"), A("ions")); mid(q); therm(t, A("parts"), A("ions"), 22);
    callout(t, F("parts", 0.28), A("ions"), V(AX - 0.5, 3.4, 1.4), 260, 330, "GRAPHITE", "#2a2e36");
    callout(t, F("parts", 0.46), A("ions"), V(CX + 0.5, 3.4, 1.4), 820, 330, "METAL OXIDE", "#8a4a9e");
    callout(t, F("parts", 0.62), A("ions"), V(0, 1.6, 1.6), 260, 1000, "SEPARATOR", "#9fb8d8");
    callout(t, F("parts", 0.78), A("ions"), V(1.2, 4.3, 0.6), 820, 1000, "ELECTROLYTE", "#4fd0ff"); }
  else if (t < A("flow")) { world("B"); const q = k(A("ions"), A("flow")); gap(q); therm(t, A("ions"), A("flow"), 22);
    callout(t, F("ions", 0.1), A("flow"), V(AX - 0.5, 2.8, 0.6), 260, 330, "LITHIUM IONS", "#3dff8c"); }
  else if (t < A("warm")) { world("B"); const q = k(A("flow"), A("warm")); mid(q); therm(t, A("flow"), A("warm"), 22);
    callout(t, F("flow", 0.08), F("flow", 0.5), V(0, 2.6, 0.8), 260, 330, "IONS CROSS", "#3dff8c");
    callout(t, F("flow", 0.45), A("warm"), V(0, 8.2, 0.4), 820, 300, "ELECTRONS = CURRENT", "#4fd0ff"); }
  else if (t < A("cold")) { world("B"); const q = k(A("warm"), A("cold")); mid(q); therm(t, A("warm"), A("cold"), 22);
    counter(t, F("warm", 0.1), A("cold"), "WARM · IONS SWIM"); big(t, F("warm", 0.3), F("warm", 0.6), "BRIGHT", 420); }
  else if (t < A("sag")) { world("B"); const q = k(A("cold"), A("sag")); mid(q); therm(t, A("cold"), A("sag"), lerp(22, -10, ease(k(F("cold", 0.25), F("cold", 0.85)))));
    big(t, F("cold", 0.25), F("cold", 0.55), "COLD", 420); callout(t, F("cold", 0.45), A("sag"), V(0.6, 3.2, 0.9), 820, 1000, "IONS CRAWL", "#6cc6ff"); }
  else if (t < A("stuck")) { world("B"); const q = k(A("sag"), A("stuck")); wide(q); therm(t, A("sag"), A("stuck"), -10);
    callout(t, F("sag", 0.05), F("sag", 0.5), wp(LOAD), 540, 300, "VOLTAGE SAGS", "#ff8a2a");
    big(t, F("sag", 0.6), A("stuck"), "PHONE SHUTS OFF", 1000); }
  else if (t < A("plating")) { world("B"); const q = k(A("stuck"), A("plating")); mid(q); therm(t, A("stuck"), A("plating"), lerp(-10, 20, ease(k(F("stuck", 0.5), F("stuck", 0.85)))));
    big(t, F("stuck", 0.05), F("stuck", 0.4), "THE CHARGE NEVER LEFT", 1000); counter(t, F("stuck", 0.55), A("plating"), "WARM IT · IT WAKES"); }
  else if (t < A("ev")) { world("P"); const q = k(A("plating"), A("ev")); lookV(V(lerp(0.5, 0, q), lerp(6.5, 5.6, q), lerp(9, 7.6, q)), V(0, 2.2, 0), 42);
    callout(t, F("plating", 0.08), F("plating", 0.5), V(0, 2.4, 2.2), 260, 330, "CAN'T TUCK IN", "#3dff8c");
    big(t, F("plating", 0.5), F("plating", 0.78), "PILES UP AS METAL", 1000); counter(t, F("plating", 0.8), A("ev"), "PERMANENT DAMAGE"); }
  else if (t < A("orbi")) { world("E"); const q = k(A("ev"), A("orbi")); orbit(V(0, 1.4, 0), lerp(0.5, 0.0, q), lerp(13, 11, q), 3.5, 42);
    counter(t, F("ev", 0.05), A("orbi"), "WINTER · LESS RANGE"); big(t, F("ev", 0.5), A("orbi"), "WARM POCKET REVIVES IT", 1000); }
  else if (t < O2) { world("orbi"); const q = k(O, O2); look(lerp(1.5, 0.6, q), lerp(2.6, 2.4, q), lerp(6.5, 5.2, q), 0, 2.2, 0, 44);
    flash(t, F("orbi", 0.2), 0.6, 3); tag("tR", t, F("orbi", 0.5), O2, 540, 190); }
  else { world("orbi"); const q = k(O2, A("end")); orbit(V(1, 1.9, -1), lerp(0.1, -0.4, q), lerp(9, 7.5, q), 2.5, 46);
    tag("tT", t, F("orbi2", 0.02), F("orbi2", 0.3), 540, 190); tag("tS", t, F("orbi2", 0.3), F("orbi2", 0.58), 540, 190); timer(t, F("orbi2", 0.6), F("orbi2", 0.95)); }
  drawCallouts(); drawTherm();
});
await ready();
