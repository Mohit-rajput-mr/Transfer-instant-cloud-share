// "Silence made of sound" — how noise-cancelling headphones work. 3D cutaway film, tyre-film v2 style (owner 2026-11-17 bar).
// Facts: sound = pressure waves (compressions / rarefactions). Active noise cancelling: a microphone picks up the outside
// noise, a chip inverts it (anti-phase) and the speaker plays it with the music; at the ear the two cancel (destructive
// interference). An inside (feedback) microphone measures what is left and corrects. Works best on steady low-frequency
// sound (engines, trains, fans); sudden sharp sounds change too fast, so the passive cushion blocks those. Idea patented by
// Paul Lueg in the 1930s; Amar Bose started working on it after a 1978 flight where the airline headphones lost to the engine
// hum. Transparency mode uses the microphones to pass outside sound in.
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

// ---------- air particles (instanced, coloured by squeeze / stretch) ----------
const _M = new THREE.Matrix4(), _Z = new THREE.Matrix4().makeScale(0, 0, 0);
const range = (a, b, s) => { const o = []; for (let v = a; v <= b + 1e-6; v += s) o.push(+v.toFixed(3)); return o; };
const CO = new THREE.Color(0xff8a2a), CB = new THREE.Color(0x3f9dff), CW = new THREE.Color(0xe9edf4), CG = new THREE.Color(0x2fd39a);
function makeField(parent, xs, ys, zs, r) { const pts = []; for (const x of xs) for (const y of ys) for (const z of zs) pts.push({ x, y, z });
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 7, 5), new THREE.MeshStandardMaterial({ roughness: 0.45 }), pts.length); m.frustumCulled = false; parent.add(m);
  const c = new THREE.Color(); pts.forEach((_, i) => m.setColorAt(i, c));
  return { m, upd(fn) { pts.forEach((p, i) => { const r = fn(p); if (!r) { m.setMatrixAt(i, _Z); return; }
    _M.makeScale(1, 1, 1).setPosition(p.x + r.dx, p.y, p.z); m.setMatrixAt(i, _M);
    c.copy(r.g ? CG : CW).lerp(r.g ? CW : r.comp > 0 ? CO : CB, r.g ? 0 : Math.min(1, Math.abs(r.comp))); if (r.g) c.lerp(CW, 1 - Math.min(1, Math.abs(r.comp) + 0.4)); m.setColorAt(i, c); });
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; } };
}
// x near `target` where a wave with phase kk*x + sgn*w*t has its squeeze (comp max, phase = PI) or stretch (phase = 0)
const waveX = (target, kk, w, t, sgn, phase) => { const n = Math.round((kk * target + sgn * w * t - phase) / TAU); return (phase + n * TAU - sgn * w * t) / kk; };

// ================= world W: speaker → air → ear =================
const SW = studio("W", 0xe6e8ee);
const cab = sh(new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.6, 3), M.dark)); cab.position.set(-5.4, 2.4, 0); SW.add(cab);
const SPK = new THREE.Group(); SPK.position.set(-4.45, 2.4, 0); SW.add(SPK);
const cone = sh(new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.55, 36, 1, true), M.paper)); cone.rotation.z = Math.PI / 2; SPK.add(cone);
const dust = sh(new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 12), M.paper)); dust.scale.x = 0.45; dust.position.x = 0.2; SPK.add(dust);
const surround = sh(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.09, 10, 40), M.dark)); surround.rotation.y = Math.PI / 2; surround.position.set(-4.2, 2.4, 0); SW.add(surround);
const fieldW = makeField(SW, range(-3.9, 6.0, 0.25), range(0.6, 4.2, 0.4), range(-1.2, 1.2, 0.4), 0.065);
const earW = new THREE.Group(); SW.add(earW);
{ const canal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.8, 28, 1, true), M.skin); canal.rotation.z = Math.PI / 2; canal.position.set(7.2, 2.4, 0); earW.add(canal);
  const lobe = sh(new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.34, 14, 40), M.skin)); lobe.rotation.y = Math.PI / 2; lobe.position.set(6.3, 2.4, 0); lobe.scale.set(1, 1.35, 1); earW.add(lobe); }
const drum = new THREE.Mesh(new THREE.CircleGeometry(0.93, 32), M.drum); drum.rotation.y = -Math.PI / 2; SW.add(drum);
// ribbons: a wave, its mirror, their sum
const RN = 72, RX = range(-2.3, 2.3, 4.6 / (RN - 1)).slice(0, RN);
const ribbon = (col) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), glow(col), RN); m.frustumCulled = false; SW.add(m); return m; };
const rN = ribbon(0xff8a2a), rA = ribbon(0x3f9dff), rS = ribbon(0xffffff);
const setRib = (m, f, s = 1) => { RX.forEach((x, i) => { const y = f(x); if (y === null) m.setMatrixAt(i, _Z); else { _M.makeScale(s, s, s).setPosition(x, y, 0); m.setMatrixAt(i, _M); } }); m.instanceMatrix.needsUpdate = true; };

// ================= world H: head + headphone cup, cut open =================
const SH = studio("H", 0xe4e6ec), CY = 4.2;
const HEAD = V(-4.6, CY, 0);
const head = sh(new THREE.Mesh(new THREE.SphereGeometry(4, 48, 32), M.skin)); head.position.copy(HEAD); SH.add(head);
const hair = sh(new THREE.Mesh(new THREE.SphereGeometry(4.06, 48, 20, 0, TAU, 0, Math.PI * 0.4), M.hair)); hair.position.copy(HEAD); SH.add(hair);
{ const ear = sh(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.17, 10, 30), M.skin)); ear.rotation.y = Math.PI / 2; ear.scale.set(1, 1.35, 1); ear.position.set(-0.52, CY, 0); SH.add(ear);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), M.dark); hole.rotation.y = Math.PI / 2; hole.position.set(-0.56, CY, 0); SH.add(hole); }
const CUP = new THREE.Group(); CUP.position.set(0, CY, 0); CUP.rotation.z = -Math.PI / 2; SH.add(CUP); // local +y = world +x (outwards)
const prof = [[1.95, 0.15], [2.05, 0.55], [2.0, 1.0], [1.75, 1.35], [1.2, 1.6], [0.01, 1.68]].map(([r, y]) => new THREE.Vector2(r, y));
const torusHalf = (front) => { const g = new THREE.TorusGeometry(1.75, 0.38, 16, 40, Math.PI); g.rotateX(Math.PI / 2); if (!front) g.rotateY(Math.PI); return g; };
CUP.add(sh(new THREE.Mesh(new THREE.LatheGeometry(prof, 48, Math.PI / 2, Math.PI), M.shell)), sh(new THREE.Mesh(torusHalf(false), M.cushion)));
const FRONT = new THREE.Group(); CUP.add(FRONT);
FRONT.add(sh(new THREE.Mesh(new THREE.LatheGeometry(prof, 48, -Math.PI / 2, Math.PI), M.shell)), sh(new THREE.Mesh(torusHalf(true), M.cushion)));
const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glow(0x555a63)); led.position.set(-0.9, 1.0, 1.78); FRONT.add(led);
// driver: cone, magnet, basket
const DRV = new THREE.Group(); DRV.position.y = 0.55; CUP.add(DRV);
DRV.add(sh(new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.4, 36, 1, true), M.paper)));
const mag = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 28), M.metal)); mag.position.y = 0.42; CUP.add(mag); mag.position.y = 0.95;
const basket = sh(new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.05, 8, 40), M.metal)); basket.rotation.x = Math.PI / 2; basket.position.y = 0.36; CUP.add(basket);
// microphones + chip + wiring
const mic = (x, y) => { const g = new THREE.Group(); g.position.set(x, y, 0); CUP.add(g);
  g.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 18), M.metal))); const gr = new THREE.Mesh(new THREE.CircleGeometry(0.12, 18), M.dark); gr.rotation.x = -Math.PI / 2; gr.position.y = 0.151; g.add(gr); return g; };
const micOut = mic(-0.95, 1.52), micIn = mic(-1.05, 0.25); micIn.rotation.z = Math.PI;
const chip = sh(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.5), M.chip)); chip.position.set(0.75, 1.22, 0); CUP.add(chip);
for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.12), M.gold); p.position.set(0.5 + i * 0.12, 1.2, s * 0.3); CUP.add(p); }
const C1 = new THREE.CatmullRomCurve3([V(-0.95, 1.4, 0), V(-0.4, 1.42, 0.12), V(0.45, 1.3, 0.05), V(0.75, 1.22, 0), V(0.65, 1.02, 0), V(0.3, 0.92, 0)]);
const C2 = new THREE.CatmullRomCurve3([V(-1.05, 0.4, 0), V(-1.35, 0.85, 0.1), V(-0.6, 1.3, 0.15), V(0.5, 1.25, 0.05)]);
CUP.add(new THREE.Mesh(new THREE.TubeGeometry(C1, 60, 0.035, 8), M.copper), new THREE.Mesh(new THREE.TubeGeometry(C2, 50, 0.035, 8), M.copper));
const PN = 18, pul = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), PN * 2); pul.frustumCulled = false; CUP.add(pul);
{ const c = new THREE.Color(); for (let i = 0; i < PN * 2; i++) pul.setColorAt(i, c); }
// headband
SH.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.9, CY + 1.6, 0), V(0.8, CY + 2.9, 0), V(-0.7, CY + 4.1, 0), V(-2.7, CY + 4.55, 0), V(-4.6, CY + 4.6, 0)]), 40, 0.2, 10), M.shell)));
// anti-noise rings from the driver towards the ear
const rings = [...Array(4)].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.36, 36), glow(0x3f9dff, 0)); m.rotation.y = Math.PI / 2; SH.add(m); return m; });
const fieldH = makeField(SH, range(-0.25, 9, 0.25), range(CY - 2.45, CY + 2.45, 0.35), range(-0.8, 0.8, 0.4), 0.06);

// ================= world A: the 1978 flight =================
const SA = addWorld("A", { bg: 0x8cc2ff, fog: [30, 95], hemi: 1.0, sun: 2.2, sky: 0xffffff });
const PLANE = new THREE.Group(); PLANE.position.set(0, 6, 0); SA.add(PLANE);
{ const f = sh(new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 9, 10, 28), M.white)); f.rotation.z = Math.PI / 2; PLANE.add(f);
  const w = sh(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 13), M.wing)); w.position.set(0.4, -0.35, 0); PLANE.add(w);
  const fin = sh(new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 0.16), M.white)); fin.position.set(-4.9, 1.5, 0); fin.rotation.z = 0.35; PLANE.add(fin);
  const st = sh(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 4.6), M.wing)); st.position.set(-5.0, 0.3, 0); PLANE.add(st);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.14, 0.02), flat(0x2f6bff)); for (const s of [-1, 1]) { const m = stripe.clone(); m.position.set(0, -0.15, s * 1.1); PLANE.add(m); }
  for (let i = 0; i < 15; i++) for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.04), M.dark); m.position.set(-3.6 + i * 0.5, 0.28, s * 1.07); PLANE.add(m); } }
const ENG = [-3.1, 3.1].map((z) => { const g = new THREE.Group(); g.position.set(1.0, -1.05, z); PLANE.add(g);
  const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.5, 2.1, 28), M.wing)); c.rotation.z = Math.PI / 2; g.add(c);
  const intake = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), M.dark); intake.rotation.y = Math.PI / 2; intake.position.x = 1.06; g.add(intake); return g; });
const hum = [...Array(12)].map((_, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 56), glow(0xff8a2a, 0)); SA.add(m); return m; });
K.reseed(7); const clouds = [...Array(36)].map(() => { const g = new THREE.Group(); for (let j = 0; j < 4; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1.4 + rnd() * 1.4, 16, 10), M.cloud); s.position.set(j * 1.7 - 2.5, rnd() * 0.6, (rnd() - 0.5) * 2); s.scale.y = 0.55; g.add(s); }
  g.userData = { x: rnd() * 80 - 40, y: -3 + rnd() * 3, z: -30 + rnd() * 36 }; SA.add(g); return g; });
const pad = new THREE.Group(); SA.add(pad);
{ const c = document.createElement("canvas"); c.width = 600; c.height = 760; const g = c.getContext("2d");
  g.fillStyle = "#fbf6e6"; g.fillRect(0, 0, 600, 760); g.strokeStyle = "#a9c6ef"; g.lineWidth = 2; for (let y = 120; y < 760; y += 44) { g.beginPath(); g.moveTo(0, y); g.lineTo(600, y); g.stroke(); }
  g.strokeStyle = "#ef8f8f"; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, 760); g.stroke();
  g.fillStyle = "#1d2a5a"; g.font = "700 54px D"; g.fillText("1978", 96, 84);
  const wave = (y0, a, dash) => { g.setLineDash(dash ? [16, 12] : []); g.lineWidth = 6; g.strokeStyle = "#1d2a5a"; g.beginPath(); for (let x = 0; x <= 440; x += 4) { const y = y0 + a * Math.sin(x / 440 * 4 * Math.PI); x ? g.lineTo(110 + x, y) : g.moveTo(110 + x, y); } g.stroke(); g.setLineDash([]); };
  g.font = "600 38px D"; wave(220, 50, false); g.fillText("noise", 110, 320); wave(420, -50, true); g.fillText("anti-noise", 110, 520);
  g.font = "800 56px D"; g.fillText("+", 300, 590); wave(660, 0, false); g.font = "600 38px D"; g.fillText("= quiet!", 380, 730);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const p = sh(new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.8, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }))); pad.add(p);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.8), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); face.position.z = 0.03; pad.add(face); }

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
  const k = (a, b) => prog(t, a, b), A = (key) => at(key), F = fr, wp = (o) => o.getWorldPosition(new THREE.Vector3());
  const seg = (a, b) => t >= A(a) && t < A(b);

  // ===== world W: the air =====
  { let a = 0.22, kk = 1.6, w = 6, a2 = 0, kk2 = 1, w2 = 1, mix = 0, clap = null, calm = 1;
    if (seg("ear", "flight")) { const q = k(A("ear"), A("flight")); // loud → high → low hum
      if (q < 0.33) { a = lerp(0.16, 0.32, ease(clamp(q / 0.12))); }
      else if (q < 0.6) { a = 0.32; a2 = 0.17; kk2 = 3.4; w2 = 13; mix = ease(clamp((q - 0.33) / 0.08)); }
      else { a = 0.33; kk = 0.9; w = 3.4; a2 = 0.17; kk2 = 3.4; w2 = 13; mix = 1 - ease(clamp((q - 0.6) / 0.08)); } }
    if (seg("limits", "trans")) { const q = k(A("limits"), A("trans")); a = 0.3; kk = 0.9; w = 3.4; calm = 1 - 0.9 * ease(clamp((q - 0.08) / 0.2));
      if (q > 0.48) { calm = 0.1; const p = clamp((q - 0.5) / 0.28); clap = -4 + p * 12; } }
    const disp = (x) => { let dx = (1 - mix) * a * calm * Math.sin(kk * x - w * t), comp = -(1 - mix) * calm * Math.cos(kk * x - w * t) * a / 0.22;
      if (mix > 0) { dx += mix * a2 * Math.sin(kk2 * x - w2 * t); comp += -mix * Math.cos(kk2 * x - w2 * t); }
      if (clap !== null) { const d = x - clap; dx += 0.5 * Math.exp(-d * d / 0.18); comp += -4 * d * Math.exp(-d * d / 0.18) / 0.6; }
      return { dx, comp: comp * 0.9 }; };
    const showF = !seg("idea", "cut");
    fieldW.m.visible = showF; fieldW.upd((p) => showF ? disp(p.x) : null);
    const s0 = disp(-4.0); SPK.position.x = -4.45 + s0.dx * 0.8; drum.position.set(7.95 + disp(6.0).dx * 0.7, 2.4, 0);
    // ribbons (idea)
    const on = seg("idea", "cut"), q = k(A("idea"), A("cut")), RK = 2.73, RW = 3.2;
    const m = ease(clamp((q - 0.48) / 0.24)), aN = ease(clamp((q - 0.04) / 0.12)), aA = ease(clamp((q - 0.22) / 0.12));
    setRib(rN, (x) => on && aN > 0 ? lerp(4.1, 2.6, m) + 0.75 * (1 - m) * Math.sin(RK * x - RW * t) : null, aN);
    setRib(rA, (x) => on && aA > 0 ? lerp(1.1, 2.6, m) - 0.75 * (1 - m) * Math.sin(RK * x - RW * t) : null, aA);
    setRib(rS, (x) => on && m >= 1 ? 2.6 : null, 1.15);
    cab.visible = surround.visible = SPK.visible = earW.visible = drum.visible = showF; }

  // ===== world H: the cup =====
  { const cutE = t < A("cut") ? 0 : ease(k(F("cut", 0.05), F("cut", 0.32)));
    FRONT.position.set(-3.5 * cutE, 0, 3.2 * cutE); FRONT.visible = cutE < 0.97;
    let anc = 0, trans = 0, pulseOn = 0, inner = 0, ringOn = 0;
    if (t < A("wave")) anc = ease(k(F("hook", 0.35), F("hook", 0.45)));
    if (seg("mic", "cancel")) pulseOn = clamp((t - F("mic", 0.25)) / 0.6);
    if (seg("mix", "cancel")) ringOn = ease(k(F("mix", 0.3), F("mix", 0.5)));
    if (seg("cancel", "trans")) { anc = ease(k(F("cancel", 0.15), F("cancel", 0.55))); pulseOn = 1; ringOn = 1; }
    if (seg("fast", "trans")) inner = 1;
    if (seg("trans", "orbi")) { trans = ease(k(F("trans", 0.15), F("trans", 0.35))); pulseOn = 1; }
    if (seg("limits", "trans")) ringOn = 1;
    led.material.color.setHex(trans > 0.5 ? 0x2fd39a : anc > 0.5 ? 0x3f9dff : 0x555a63);
    const kk = 1.5, w = 5;
    fieldH.upd((p) => { const ph = kk * p.x + w * t, dy = Math.abs(p.y - CY), pocket = p.x <= 0.3 && dy < 1.25 && Math.abs(p.z) < 1.3;
      if (pocket) { if (cutE < 0.5) return null; const g = trans > 0.5, amp = g ? 1 : 1 - 0.93 * anc;
        return { dx: 0.2 * amp * Math.sin(ph), comp: -amp * Math.cos(ph), g }; }
      if (p.x < 2.05) return null;
      return { dx: 0.2 * Math.sin(ph), comp: -Math.cos(ph) }; });
    DRV.position.y = 0.55 + (ringOn + trans) * 0.035 * Math.sin(w * t * 1.3);
    rings.forEach((r, i) => { const q = (t * 0.9 + i / 4) % 1; r.position.set(lerp(0.35, -0.3, q), CY, 0); r.scale.setScalar(1 + q * 2.2); r.material.opacity = ringOn * cutE * 0.8 * Math.sin(q * Math.PI); r.material.color.setHex(trans > 0.5 ? 0x2fd39a : 0x3f9dff); });
    M.chip.emissiveIntensity = pulseOn * (0.6 + 0.4 * Math.sin(t * 9));
    const c = new THREE.Color();
    for (let i = 0; i < PN * 2; i++) { const second = i >= PN, j = i % PN, u = (t * 0.55 + j / PN) % 1;
      if (pulseOn <= 0 || (second && !inner) || u > pulseOn) { pul.setMatrixAt(i, _Z); continue; }
      const v = (second ? C2 : C1).getPoint(u); _M.makeTranslation(v.x, v.y, v.z); pul.setMatrixAt(i, _M);
      pul.setColorAt(i, c.setHex(trans > 0.5 ? 0x2fd39a : second ? 0xffffff : u < 0.55 ? 0xff8a2a : 0x3f9dff)); }
    pul.instanceMatrix.needsUpdate = true; pul.instanceColor.needsUpdate = true; }

  // ===== world A: the flight =====
  { clouds.forEach((g) => { const u = g.userData; g.position.set(((u.x - t * 5) % 80 + 120) % 80 - 40, u.y, u.z); });
    hum.forEach((m, i) => { const e = ENG[i % 2], q = (t * 0.6 + Math.floor(i / 2) / 6) % 1; m.position.copy(wp(e)); m.quaternion.copy(K.cam.quaternion); m.scale.setScalar(1 + q * 7); m.material.opacity = 0.55 * (1 - q); });
    PLANE.position.y = 6 + Math.sin(t * 0.7) * 0.15; PLANE.rotation.x = Math.sin(t * 0.5) * 0.02; }

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
  const sinR = (f, ph = 0, sg = 1) => (x) => sg * Math.sin(TAU * f * x - t * 5 + ph);
  const NOISE = (op = 1) => ({ label: "NOISE", col: "#ff8a2a", f: sinR(2), op }), ANTI = (op = 1, lab = "ANTI") => ({ label: lab, col: "#3f9dff", f: sinR(2, 0, -1), op });
  const flatR = (label, col, amt = 0) => ({ label, col, f: (x) => amt * Math.sin(TAU * 2 * x - t * 5) });
  const cupWide = (q) => lookV(V(lerp(5.2, 4.2, q), CY + lerp(2.4, 1.8, q), lerp(10.5, 9.2, q)), V(1.6, CY - 0.1, 0), 42);
  const cupClose = (q) => lookV(V(lerp(2.9, 2.3, q), CY + lerp(1.6, 1.1, q), lerp(6.6, 5.7, q)), V(0.45, CY - 0.1, 0), 42);
  const H = (o) => wp(o);
  if (t < F("hook", 0.86)) { world("H"); const q = k(0, F("hook", 0.86)); cupWide(q);
    callout(t, F("hook", 0.02), F("hook", 0.3), V(4.5, CY + 2.0, 0), 820, 1000, "NOISE", "#ff8a2a");
    scope(t, F("hook", 0.2), F("hook", 0.84), [NOISE(), ANTI(clamp((t - F("hook", 0.3)) / 0.5)), flatR("SUM", "#ffffff", 1 - clamp((t - F("hook", 0.45)) / 0.8))]);
    big(t, F("hook", 0.58), F("hook", 0.84), "SILENCE, MADE OF SOUND", 1000); }
  else if (t < A("ear")) { world("W"); const q = k(F("hook", 0.86), A("ear")); lookV(V(lerp(9.5, 7.2, q), lerp(5.5, 4.6, q), lerp(11, 9.4, q)), V(0.6, 2.2, 0), 42);
    callout(t, F("wave", 0.05), F("wave", 0.45), V(-4.1, 2.9, 0.4), 260, 330, "SPEAKER", "#9aa3b1");
    const kk = 1.6, w = 6;
    callout(t, F("wave", 0.25), A("ear"), V(waveX(1.2, kk, w, t, -1, Math.PI), 4.2, 1.2), 820, 330, "SQUEEZE", "#ff8a2a");
    callout(t, F("wave", 0.42), A("ear"), V(waveX(2.4, kk, w, t, -1, 0), 0.6, 1.2), 820, 1000, "STRETCH", "#3f9dff");
    big(t, F("wave", 0.8), A("ear"), "A WAVE", 420); }
  else if (t < A("flight")) { world("W"); const q = k(A("ear"), A("flight")); lookV(V(lerp(10.5, 11.2, q), lerp(4.8, 4.4, q), lerp(6.6, 5.6, q)), V(5.2, 2.4, 0), 42);
    callout(t, F("ear", 0.03), F("ear", 0.4), V(7.95, 2.6, 0), 260, 330, "EARDRUM", "#f1b9a5");
    big(t, F("ear", 0.06), F("ear", 0.32), "BIG = LOUD", 420); big(t, F("ear", 0.36), F("ear", 0.58), "FAST = HIGH", 420); big(t, F("ear", 0.64), A("flight"), "SLOW = LOW HUM", 420); }
  else if (t < A("idea")) { world("A"); const q = k(A("flight"), A("idea")); const cp = V(lerp(10, 7.5, q), lerp(9.5, 7.6, q), lerp(11, 12.5, q)); lookV(cp, V(lerp(0, 1.4, q), 5.6, lerp(0, 3, q)), 40);
    big(t, F("flight", 0.03), F("flight", 0.32), "1978", 420); callout(t, F("flight", 0.3), F("flight", 0.66), wp(ENG[1]).add(V(1.0, 0, 0)), 820, 1000, "ENGINE HUM", "#ff8a2a");
    const pq = back(k(F("flight", 0.66), F("flight", 0.8))); pad.visible = pq > 0.01; pad.scale.setScalar(Math.max(0.01, pq * 0.8)); pad.position.copy(lerpV(cp, V(1.4, 5.6, 3), 0.62)); pad.lookAt(cp); pad.rotateZ((1 - pq) * 0.5 - 0.06); }
  else if (t < A("cut")) { world("W"); const q = k(A("idea"), A("cut")); look(0, 2.6, lerp(12.5, 12, q), 0, 2.6, 0, 42);
    counter(t, F("idea", 0.04), F("idea", 0.36), "IDEA FROM THE 1930s");
    callout(t, F("idea", 0.1), F("idea", 0.48), V(-1.6, 4.1 + 0.75 * Math.sin(2.73 * -1.6 - 3.2 * t), 0), 260, 330, "SQUEEZE + STRETCH", "#ff8a2a");
    callout(t, F("idea", 0.26), F("idea", 0.48), V(1.4, 1.1 - 0.75 * Math.sin(2.73 * 1.4 - 3.2 * t), 0), 820, 1000, "ITS MIRROR", "#3f9dff");
    big(t, F("idea", 0.62), A("cut"), "= NOTHING", 1000); }
  else if (t < A("mic")) { world("H"); const q = k(A("cut"), A("mic")); q < 0.35 ? cupWide(0.6 + q) : cupClose((q - 0.35) / 0.65);
    callout(t, F("cut", 0.3), A("mic"), V(-0.1, CY - 1.75, 0.2), 260, 1000, "CUSHION", "#8a90a0"); callout(t, F("cut", 0.45), A("mic"), H(DRV).add(V(0, 0.5, 0.4)), 820, 1000, "SPEAKER", "#9aa3b1");
    callout(t, F("cut", 0.62), A("mic"), H(micOut), 820, 330, "MIC: OUTSIDE", "#ff8a2a"); callout(t, F("cut", 0.78), A("mic"), H(micIn), 260, 330, "MIC: INSIDE", "#ffffff"); }
  else if (t < A("flip")) { world("H"); const q = k(A("mic"), A("flip")); lookV(V(lerp(3.4, 2.8, q), CY + lerp(1.7, 1.2, q), lerp(5.6, 4.8, q)), V(1.1, CY - 0.3, 0), 42);
    callout(t, F("mic", 0.03), F("mic", 0.5), H(micOut), 260, 1000, "HEARS THE HUM", "#ff8a2a"); callout(t, F("mic", 0.55), A("flip"), H(chip), 820, 1000, "CHIP", "#2fb6ff");
    scope(t, F("mic", 0.3), A("flip") + 0.3, [NOISE()]); }
  else if (t < A("mix")) { world("H"); const q = k(A("flip"), A("mix")); lookV(V(lerp(2.6, 2.2, q), CY + lerp(0.6, 0.2, q), lerp(4.2, 3.6, q)), V(1.15, CY - 0.75, 0), 42);
    const fl = ease(k(F("flip", 0.1), F("flip", 0.6)));
    scope(t, A("flip") - 0.3, A("mix") + 0.3, [{ label: "IN", col: "#ff8a2a", f: sinR(2) }, { label: "OUT", col: "#3f9dff", f: (x) => lerp(1, -1, fl) * Math.sin(TAU * 2 * x - t * 5) }]);
    callout(t, F("flip", 0.05), A("mix"), H(chip), 820, 1000, "FLIPS IT", "#2fb6ff"); big(t, F("flip", 0.68), A("mix"), "ANTI-NOISE", 1000); }
  else if (t < A("cancel")) { world("H"); const q = k(A("mix"), A("cancel")); cupClose(q);
    scope(t, A("mix") - 0.3, A("cancel") + 0.3, [{ label: "MUSIC", col: "#2fd39a", f: (x) => 0.55 * Math.sin(TAU * 5 * x - t * 9) }, ANTI(), { label: "SPEAKER", col: "#ffffff", f: (x) => 0.55 * Math.sin(TAU * 5 * x - t * 9) - Math.sin(TAU * 2 * x - t * 5) }]);
    callout(t, F("mix", 0.2), A("cancel"), H(DRV).add(V(-0.3, 0.6, 0.4)), 260, 1000, "MUSIC + ANTI-NOISE", "#3f9dff"); }
  else if (t < A("fast")) { world("H"); const q = k(A("cancel"), A("fast")); cupWide(q * 0.8);
    const g = 1 - ease(k(F("cancel", 0.15), F("cancel", 0.55)));
    scope(t, A("cancel") - 0.3, F("cancel", 0.95), [NOISE(), ANTI(), { label: "AT EAR", col: "#2fd39a", f: (x) => 0.55 * Math.sin(TAU * 5 * x - t * 9) + g * Math.sin(TAU * 2 * x - t * 5) }]);
    callout(t, F("cancel", 0.05), A("fast"), V(-0.5, CY + 0.2, 0.3), 260, 1000, "YOUR EAR", "#e0a07e"); big(t, F("cancel", 0.6), A("fast"), "THE HUM FADES", 420); }
  else if (t < A("limits")) { world("H"); const q = k(A("fast"), A("limits")); orbit(V(0.6, CY - 0.2, 0), lerp(0.55, 0.15, q), 6.4, 1.6, 42);
    counter(t, F("fast", 0.1), A("limits"), "THOUSANDS × A SECOND"); callout(t, F("fast", 0.45), A("limits"), H(micIn), 260, 1000, "CHECKS WHAT'S LEFT", "#ffffff"); }
  else if (t < F("limits", 0.8)) { world("W"); const q = k(A("limits"), F("limits", 0.8)); lookV(V(lerp(9.5, 8.8, q), lerp(5.5, 5.0, q), lerp(11, 10.2, q)), V(0.6, 2.2, 0), 42);
    callout(t, F("limits", 0.06), F("limits", 0.46), V(1.0, 4.3, 0.4), 600, 330, "STEADY HUM: CANCELLED", "#3f9dff");
    big(t, F("limits", 0.5), F("limits", 0.8), "CLAP!", 420); callout(t, F("limits", 0.56), F("limits", 0.8), V(-4 + clamp((t - F("limits", 0.5)) / (F("limits", 0.78) - F("limits", 0.5))) * 12, 2.4, 1.2), 820, 1000, "TOO FAST TO FLIP", "#ff8a2a"); }
  else if (t < A("trans")) { world("H"); const q = k(F("limits", 0.8), A("trans")); cupClose(q);
    callout(t, F("limits", 0.82), A("trans"), V(-0.15, CY + 1.75, 0.3), 260, 330, "CUSHION BLOCKS IT", "#8a90a0"); }
  else if (t < O) { world("H"); const q = k(A("trans"), O); cupWide(0.5 + q * 0.5);
    callout(t, F("trans", 0.12), O, V(0.2, CY + 0.6, 0.3), 260, 330, "TRANSPARENCY MODE", "#2fd39a"); big(t, F("trans", 0.55), O, "HEAR THE WORLD", 1000); }
  else if (t < O2) { world("orbi"); const q = k(O, O2); look(lerp(1.5, 0.6, q), lerp(2.6, 2.4, q), lerp(6.5, 5.2, q), 0, 2.2, 0, 44);
    flash(t, F("orbi", 0.2), 0.6, 3); tag("tR", t, F("orbi", 0.5), O2, 540, 190); }
  else { world("orbi"); const q = k(O2, A("end")); orbit(V(1, 1.9, -1), lerp(0.1, -0.4, q), lerp(9, 7.5, q), 2.5, 46);
    tag("tT", t, F("orbi2", 0.02), F("orbi2", 0.3), 540, 190); tag("tS", t, F("orbi2", 0.3), F("orbi2", 0.58), 540, 190); timer(t, F("orbi2", 0.6), F("orbi2", 0.95)); }
  drawCallouts(); drawScope();
});
await ready();
