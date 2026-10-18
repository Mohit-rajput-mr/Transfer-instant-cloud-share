// Orbi film kit: the shared engine every film imports (renderer, low-poly kit, people, phones, camera helpers,
// tags, subtitles, end card, fades). A film only writes its story: story.js (sets, props, shots) + script.json (voice lines).
// Docs: media/kit/README.md
import * as THREE from "three";
export { THREE };
export const K = { root: null };

// ---------- the page (canvas + overlays) ----------
document.body.insertAdjacentHTML("beforeend", `<canvas id="gl" width="1080" height="1920"></canvas>
<div class="ov" id="count" style="left:0;right:0;top:200px;text-align:center;font:800 92px/1 M;color:#fff;-webkit-text-stroke:4px #000;paint-order:stroke fill;opacity:0"></div>
<div class="ov" id="big" style="left:40px;right:40px;top:300px;text-align:center;font:900 120px/1 D;font-stretch:118%;color:#fff;-webkit-text-stroke:5px #000;paint-order:stroke fill;opacity:0"></div>
<svg class="ov redx" id="rx" viewBox="0 0 100 100"><path d="M18 18 L82 82 M82 18 L18 82" stroke="#ff3b3b" stroke-width="16" stroke-linecap="round"/></svg>
<div class="ov" id="timer">30:00</div>
<div class="ov" id="sub"></div>
<div class="ov" id="endc"><img class="em" src="kit/emblem.svg" /><img class="lg" src="kit/logo.svg" /><div class="url">orbitransfer.com</div><div class="try" id="endtry"></div></div>
<div class="ov" id="flash"></div>
<div class="ov" id="fade"></div>`);
const W = 1080, H = 1920;
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const out = (x) => 1 - Math.pow(1 - x, 3);
const back = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.25, fo = 0.25) => clamp((t - a) / fi) * clamp((b - t) / fo);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = (el, o) => Object.assign(el.style, o);
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);


// ---------- renderer ----------
const r = new THREE.WebGLRenderer({ canvas: $("gl"), antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.setSize(W, H, false);
r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(42, W / H, 0.02, 4000);

// ---------- helpers: textures ----------
function canvasTex(w, h, draw, rep) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  t.anisotropy = 4; return t;
}
const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
const IM = {};
for (const k of ["empty", "one", "many", "card"]) IM[k] = await img(`kit/shots/${k}.png`);
const mk = (draw) => { const c = document.createElement("canvas"); c.width = 390; c.height = 844; draw(c.getContext("2d")); return c; };
const lerpV = (a, b, k) => a.clone().lerp(b, k);
await document.fonts.load("800 20px D"); await document.fonts.load("700 20px M"); await document.fonts.load("200 20px D");
// ---------- shared low-poly kit ----------
const sh = (m) => { m.castShadow = m.receiveShadow = true; return m; };
const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...o });
// faceted ground: jittered grid, one colour per triangle
function lowGround(w, d, seg, cols, heightAt) {
  const geo = new THREE.PlaneGeometry(w, d, seg, seg).toNonIndexed(); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = [];
  const key = (x, z) => `${x.toFixed(3)},${z.toFixed(3)}`, memo = {};
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), k = key(x, z); if (!(k in memo)) memo[k] = heightAt(x, z); p.setY(i, memo[k]); }
  for (let i = 0; i < p.count; i += 3) { const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3; const c = new THREE.Color(cols(x, y, z)); for (let j = 0; j < 3; j++) col.push(c.r, c.g, c.b); }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 })); m.receiveShadow = true; return m;
}
const noise = (x, z) => Math.sin(x * 1.3 + 0.4) * Math.cos(z * 1.1 - 0.3) * 0.5 + Math.sin(x * 2.7 - z * 1.9) * 0.25;
const pick = (arr, x, z) => arr[Math.abs(Math.floor((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % arr.length))];
function tree(parent, x, z, s = 1, cols = [0x3f9a5c, 0x58b26a, 0x2f7d4a]) {
  const g = new THREE.Group(); const tr = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.6 * s, 5), flat(0x7a5236))); tr.position.y = 0.3 * s; g.add(tr);
  for (let i = 0; i < 3; i++) { const c = sh(new THREE.Mesh(new THREE.IcosahedronGeometry((0.42 - i * 0.1) * s, 0), flat(cols[i % cols.length]))); c.position.set((rnd() - 0.5) * 0.15 * s, (0.75 + i * 0.32) * s, (rnd() - 0.5) * 0.15 * s); c.rotation.set(rnd() * 3, rnd() * 3, 0); g.add(c); }
  g.position.set(x, 0, z); parent.add(g); return g;
}
function pine(parent, x, z, s = 1, col = 0x2f6f4a) { const g = new THREE.Group(); const tr = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.4 * s, 5), flat(0x6b4a30))); tr.position.y = 0.2 * s; g.add(tr); for (let i = 0; i < 3; i++) { const c = sh(new THREE.Mesh(new THREE.ConeGeometry((0.42 - i * 0.11) * s, 0.55 * s, 6), flat(col))); c.position.y = (0.55 + i * 0.3) * s; g.add(c); } g.position.set(x, 0, z); parent.add(g); return g; }
function rock(parent, x, z, s = 0.3, col = 0x8d939c) { const m = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), flat(col))); m.position.set(x, s * 0.4, z); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); m.scale.y = 0.7; parent.add(m); return m; }
function house(parent, x, z, ry, wallC = 0xf2e6d0, roofC = 0xc0583c, s = 1) {
  const g = new THREE.Group(); const b = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 1.0 * s, 1.1 * s), flat(wallC))); b.position.y = 0.5 * s; g.add(b);
  const roof = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.95 * s, 0.7 * s, 4, 1), flat(roofC))); roof.position.y = 1.35 * s; roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.9); g.add(roof);
  const win = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x2a4a66, flatShading: true });
  for (const wx of [-0.38, 0.38]) { const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 0.26 * s, 0.02), win); w2.position.set(wx * s, 0.6 * s, 0.56 * s); g.add(w2); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.46 * s, 0.02), flat(0x6b4a30)); door.position.set(0, 0.23 * s, 0.56 * s); g.add(door);
  g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); return g;
}
function cloud(parent, x, y, z, s = 1) { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry((0.5 + rnd() * 0.3) * s, 0), flat(0xffffff, { roughness: 1 })); c.position.set((i - 1.5) * 0.55 * s, rnd() * 0.2 * s, rnd() * 0.3 * s); g.add(c); } g.position.set(x, y, z); parent.add(g); return g; }
const green = 0x3dff8c;
const edge = (geo, col = green, op = 1) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: col, transparent: op < 1, opacity: op, toneMapped: false }));
// envelopes (one geometry for all of them)
const envTex = canvasTex(128, 86, (g) => { g.fillStyle = "#f6f2ea"; g.fillRect(0, 0, 128, 86); g.strokeStyle = "#c9bfae"; g.lineWidth = 4; g.beginPath(); g.moveTo(2, 2); g.lineTo(64, 50); g.lineTo(126, 2); g.stroke(); g.fillStyle = "#3dff8c"; g.fillRect(100, 60, 18, 18); });
const envGeo = new THREE.BoxGeometry(0.12, 0.08, 0.008);
const envMat = new THREE.MeshStandardMaterial({ map: envTex, roughness: 0.6 });
const glyphTex = canvasTex(128, 128, (g) => { g.fillStyle = "#06140c"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#3dff8c"; g.font = "700 18px M"; for (let i = 0; i < 6; i++) g.fillText(Array.from({ length: 6 }, (_, j) => "01"[(i * 7 + j * 5) % 2] + "").join("").replace(/(.)/g, "$1"), 8, 24 + i * 19); });
const lockMat = new THREE.MeshStandardMaterial({ map: glyphTex, emissive: green, emissiveMap: glyphTex, emissiveIntensity: 0.9, roughness: 0.4 });
function inst(geo, mat, n, parent) { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; for (let i = 0; i < n; i++) m.setColorAt(i, new THREE.Color(0xffffff)); m.castShadow = true; parent.add(m); return m; }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function setI(mesh, i, p, rx = 0, ry = 0, rz = 0, s = 1) { _e.set(rx, ry, rz); _q.setFromEuler(_e); _m.compose(_p.copy(p), _q, _s.set(s, s, s)); mesh.setMatrixAt(i, _m); }
const done = (...ms) => ms.forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });

// ---------- people: low-poly men and women (faceted, one colour each), rebuilt from joint points every frame ----------
const SCREEN_W = 390, SCREEN_H = 844;
function makePhone() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.25, metalness: 0.5 })));
  const c = document.createElement("canvas"); c.width = SCREEN_W; c.height = SCREEN_H;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.069, 0.149), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.0047; g.add(scr);
  const glow = new THREE.PointLight(0x9fd8ff, 0.25, 0.6, 2); glow.position.z = 0.06; g.add(glow);
  return { g, c, ctx: c.getContext("2d"), tex, scr, state: null };
}
const people = [];
const UP = V(0, 1, 0), tmpQ = new THREE.Quaternion();
const lathe = (prof) => new THREE.LatheGeometry(prof.map(([y, rr]) => new THREE.Vector2(rr, y)), 6);
const SHAPES = {
  m: { torso: [[0, 0.125], [0.12, 0.14], [0.3, 0.125], [0.5, 0.165], [0.7, 0.205], [0.84, 0.215], [0.93, 0.19], [1, 0.075]], depth: 0.6, uArm: [[0, 0.062], [0.35, 0.066], [0.7, 0.055], [1, 0.04]], fArm: [[0, 0.048], [0.25, 0.054], [1, 0.032]], thigh: [[0, 0.085], [0.4, 0.08], [1, 0.05]], shX: 0.215, hipX: 0.1, shJ: 0.072, hipJ: 0.085, head: [0.104, 0.126, 0.112] },
  f: { torso: [[0, 0.15], [0.1, 0.168], [0.22, 0.15], [0.42, 0.105], [0.58, 0.125], [0.68, 0.16], [0.76, 0.162], [0.84, 0.14], [0.93, 0.13], [1, 0.06]], depth: 0.62, uArm: [[0, 0.046], [0.5, 0.042], [1, 0.033]], fArm: [[0, 0.036], [0.3, 0.037], [1, 0.025]], thigh: [[0, 0.098], [0.35, 0.085], [1, 0.048]], shX: 0.165, hipX: 0.115, shJ: 0.052, hipJ: 0.098, head: [0.09, 0.12, 0.105] },
};
const shin = lathe([[0, 0.05], [0.3, 0.052], [1, 0.032]]), neckG = lathe([[0, 0.05], [1, 0.045]]), ico = new THREE.IcosahedronGeometry(1, 1);
function limb(geo, m, depth = 1) { const g = new THREE.Mesh(geo, m); g.castShadow = true; g.receiveShadow = true; g.userData.depth = depth; return g; }
function place(mesh, a, b) { const d = b.clone().sub(a), L = d.length(); mesh.position.copy(a); mesh.quaternion.copy(tmpQ.setFromUnitVectors(UP, d.normalize())); mesh.scale.set(1, Math.max(0.01, L), mesh.userData.depth); }
function person(x, z, ry, tint, opt = {}) {
  const o = new THREE.Group(); o.position.set(x, 0, z); o.rotation.y = ry;
  const sx = opt.sex || "m", SHp = SHAPES[sx];
  const m = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.55, flatShading: true });
  const P = { torso: limb(lathe(SHp.torso), m, SHp.depth), neck: limb(neckG, m) };
  for (const s2 of ["L", "R"]) { P["uArm" + s2] = limb(lathe(SHp.uArm), m); P["fArm" + s2] = limb(lathe(SHp.fArm), m); P["thigh" + s2] = limb(lathe(SHp.thigh), m); P["shin" + s2] = limb(shin, m); }
  for (const k in P) o.add(P[k]);
  const J = {}; for (const n of ["shL", "shR", "elL", "elR", "hipL", "hipR", "knL", "knR"]) { J[n] = limb(ico, m); o.add(J[n]); }
  const head = limb(ico, m); head.scale.set(...SHp.head); o.add(head);
  let hair = null; if (sx === "f") { hair = new THREE.Group(); const cap = limb(ico, m); cap.scale.set(0.102, 0.115, 0.112); cap.position.set(0, 0.015, -0.03); const tail = limb(new THREE.CylinderGeometry(0.035, 0.05, 0.26, 6), m); tail.position.set(0, -0.12, -0.12); tail.rotation.x = 0.25; hair.add(cap, tail); o.add(hair); }
  const hand = new THREE.BoxGeometry(0.06, 0.1, 0.028), lh = limb(hand, m), rh = limb(hand, m); o.add(lh, rh);
  const foot = new THREE.BoxGeometry(0.09, 0.06, 0.25), lf = limb(foot, m), rf = limb(foot, m); o.add(lf, rf);
  (opt.parent || K.root).add(o);
  const nodes = { Head: head, LeftHand: lh, RightHand: rh };
  const p = { o, P, J, SH: SHp, sex: sx, head, hair, lh, rh, lf, rf, phone: makePhone(), look: opt.look ?? 0.55, off: rnd() * 3, phoneOn: opt.phone !== false, hand: opt.hand || 1.17, B: (n) => nodes[n] };
  if (p.phoneOn) (opt.parent || K.root).add(p.phone.g);
  p.screen = opt.screen || "many";
  people.push(p); return p;
}
function posePerson(p, t) {
  const br = Math.sin((t + p.off) * 1.6) * 0.008, sway = Math.sin((t + p.off) * 0.7) * 0.012;
  const P = p.P, J = p.J, SHp = p.SH, mode = p.mode || "phone", h = p.hand;
  const walk = mode === "walk" ? t * 5.5 + p.off : 0, bob = mode === "walk" ? Math.abs(Math.sin(walk)) * 0.025 : 0;
  const hip = V(sway, 0.95 + bob, 0), chest = V(sway * 1.3, 1.47 + br + bob, 0.02);
  const lookK = mode === "phone" || mode === "film" ? p.look : mode === "cheer" ? -0.4 : 0;
  const headC = V(sway * 1.5, 1.66 + br + bob - lookK * 0.03, 0.05 + lookK * 0.06);
  place(P.torso, hip.clone().add(V(0, -0.05, 0)), chest); place(P.neck, V(sway * 1.3, 1.44 + br + bob, 0.02), headC.clone().add(V(0, -0.1, -0.01)));
  p.head.position.copy(headC); p.head.rotation.set(lookK * 0.6, 0, 0);
  if (p.hair) { p.hair.position.copy(headC); p.hair.rotation.set(lookK * 0.6, 0, 0); }
  for (const sd of [-1, 1]) {
    const S2 = sd < 0 ? "R" : "L";
    const sh = V(sd * SHp.shX + sway, 1.41 + br + bob, 0.02);
    let el, hd;
    if (mode === "film") { el = V(sd * (SHp.shX + 0.02), 1.3, 0.22); hd = V(sd * 0.06, 1.5, 0.42); }
    else if (mode === "cheer") { const w = Math.sin((t + p.off) * 9) * 0.04; el = V(sd * (SHp.shX + 0.13), 1.66, 0.02); hd = V(sd * (SHp.shX + 0.08), 1.95 + w, 0.05); }
    else if (mode === "watch" || mode === "walk") { const sw = mode === "walk" ? Math.sin(walk + (sd < 0 ? 0 : Math.PI)) * 0.14 : 0; el = V(sd * (SHp.shX + 0.03), 1.12 + bob, 0.02 - sw * 0.5); hd = V(sd * (SHp.shX + 0.02), 0.86 + bob, 0.08 + sw); }
    else { el = V(sd * (SHp.shX + 0.03), 1.12, 0.1); hd = V(sd * 0.07, h + (sd < 0 ? 0 : -0.01), 0.3); }
    place(P["uArm" + S2], sh, el); place(P["fArm" + S2], el, hd);
    J["sh" + S2].position.copy(sh); J["sh" + S2].scale.setScalar(SHp.shJ); J["el" + S2].position.copy(el); J["el" + S2].scale.setScalar(0.044);
    const hand = sd < 0 ? p.rh : p.lh; hand.position.copy(hd); hand.rotation.set(-1.1, 0, sd * 0.3);
    const hipJ = V(sd * SHp.hipX, 0.93 + bob, 0);
    const stride = mode === "walk" ? Math.sin(walk + (sd < 0 ? Math.PI : 0)) : 0;
    const knee = V(sd * (SHp.hipX + 0.01), 0.5 + bob + Math.max(0, stride) * 0.05, 0.03 + stride * 0.12), ank = V(sd * (SHp.hipX + 0.02), 0.08 + Math.max(0, stride) * 0.08, stride * 0.2);
    place(P["thigh" + S2], hipJ, knee); place(P["shin" + S2], knee, ank);
    J["hip" + S2].position.copy(hipJ); J["hip" + S2].scale.setScalar(SHp.hipJ); J["kn" + S2].position.copy(knee); J["kn" + S2].scale.setScalar(0.052);
    const f = sd < 0 ? p.rf : p.lf; f.position.copy(ank).add(V(0, -0.05, 0.06));
  }
  p.o.updateMatrixWorld(true);
  if (p.phoneOn) {
    const mid = p.rh.getWorldPosition(V()).add(p.lh.getWorldPosition(V())).multiplyScalar(0.5);
    const fwd = V(Math.sin(p.o.rotation.y), 0, Math.cos(p.o.rotation.y));
    p.phone.g.position.copy(mid).add(V(0, 0.07, 0)).add(fwd.multiplyScalar(0.02));
    p.phone.g.visible = mode !== "cheer" && mode !== "watch" && mode !== "walk";
    p.phone.g.lookAt(p.head.getWorldPosition(V()));
  }
}
// what each phone shows: image keys, crossfades and the tap ripple, drawn into its screen texture
function screen(p, draw) {
  const c = p.phone.ctx;
  const key = JSON.stringify(draw);
  if (p.phone.state === key) return;
  p.phone.state = key;
  c.fillStyle = "#000"; c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const put = (im, a = 1) => { c.globalAlpha = a; if (im === IM.photo) { c.fillStyle = "#000"; c.fillRect(0, 0, SCREEN_W, SCREEN_H); c.drawImage(im, 0, 0, SCREEN_W, SCREEN_H);  } else c.drawImage(im, 0, 0, SCREEN_W, SCREEN_H); c.globalAlpha = 1; };
  for (const [k, a] of draw.layers) put(IM[k], a);
  if (draw.tap) { const [x, y, k] = draw.tap; c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 8; c.beginPath(); c.arc(x, y, 20 + 50 * k, 0, 6.283); c.stroke(); c.fillStyle = `rgba(255,255,255,${0.35 * (1 - k)})`; c.beginPath(); c.arc(x, y, 26, 0, 6.283); c.fill(); }
  if (draw.glow) { const g = c.createRadialGradient(195, 370, 10, 195, 370, 260); g.addColorStop(0, `rgba(61,255,140,${0.55 * draw.glow})`); g.addColorStop(1, "rgba(61,255,140,0)"); c.fillStyle = g; c.fillRect(0, 0, SCREEN_W, SCREEN_H); }
  if (draw.lock) { c.fillStyle = `rgba(4,20,10,${0.75 * draw.lock})`; c.fillRect(0, 0, SCREEN_W, SCREEN_H); c.globalAlpha = draw.lock; c.fillStyle = "#3dff8c"; c.font = "700 20px M"; for (let i = 0; i < 26; i++) c.fillText(Array.from({ length: 24 }, (_, j) => "0123456789abcdef"[(i * 7 + j * 13) % 16]).join(""), 18, 120 + i * 26); c.globalAlpha = 1; }
  p.phone.tex.needsUpdate = true;
}

// ---------- the story's timing (from the voice) ----------
const LINES = await (await fetch("vo/lines.json")).json();
const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const at = (k) => L[k].at, end = (k) => L[k].at + L[k].dur;
/** a point inside a line, as a fraction of it */
const fr = (k, a) => L[k].at + L[k].dur * a;
const prog = (t, a, b) => clamp((t - a) / (b - a));
window.DURATION = LINES.duration;

// ---------- lights + worlds (each world a group; world(name) shows one, sets sky, fog and light) ----------
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a3a28, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffeedd, 2.3); sun.position.set(4, 8, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sun.shadow.bias = -0.0004; scene.add(sun);
const WORLDS = {};
/** addWorld("lab", { bg: 0x0b1020, fog: [12, 34], hemi: 0.55, sun: 1.2 }) → a group in the scene */
function addWorld(name, o = {}) { const g = new THREE.Group(); scene.add(g); WORLDS[name] = { g, o }; if (!K.root) K.root = g; return g; }
function world(name) {
  for (const k in WORLDS) WORLDS[k].g.visible = k === name;
  const o = WORLDS[name].o;
  scene.background = new THREE.Color(o.bg ?? 0x9cd2ff);
  scene.fog = o.fog ? new THREE.Fog(o.bg ?? 0x9cd2ff, o.fog[0], o.fog[1]) : null;
  hemi.intensity = o.hemi ?? 1.0; sun.intensity = o.sun ?? 2.2; hemi.color.setHex(o.sky ?? 0xcfe3ff);
}

// ---------- camera ----------
function look(px, py, pz, tx, ty, tz, fov = 42) { cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
const lookV = (p, tgt, fov) => look(p.x, p.y, p.z, tgt.x, tgt.y, tgt.z, fov);
const project = (v) => { const p = v.clone().project(cam); return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H]; };
const phoneWorld = (p) => p.phone.g.getWorldPosition(V());
const headWorld = (p) => p.B("Head").getWorldPosition(V());
/** over a person's shoulder onto their phone (frac: 0 = at the phone, 1 = at the head) */
function overShoulder(p, k, frac = 0.55, side = 0.06, up = 0.03, fov = 34) {
  const ph = phoneWorld(p), hd = headWorld(p);
  const dir = ph.clone().sub(hd).normalize(), right = V(0, 1, 0).cross(dir).normalize();
  lookV(ph.clone().lerp(hd, frac - k * 0.08).add(right.multiplyScalar(side)).add(V(0, up, 0)), ph, fov);
}
/** orbit a point: angle a (radians), radius, height */
const orbit = (c, a, rad, h, fov = 42) => look(c.x + Math.sin(a) * rad, c.y + h, c.z + Math.cos(a) * rad, c.x, c.y, c.z, fov);

// ---------- overlays: tags (one-line labels), big words, counters, the red ✕, the 30-minute timer ----------
const TAGS = {};
/** tags({ tA: "Code: <b>TRAM</b>", … }) */
function tags(defs) { for (const id in defs) { document.body.insertAdjacentHTML("beforeend", `<div class="ov tag" id="${id}">${defs[id]}</div>`); TAGS[id] = $(id); } }
const tag = (id, t, a, b, x = 540, y = 330) => { const k = win(t, a, b, 0.3, 0.3); S(TAGS[id], { opacity: k, left: `${x}px`, top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a) / 0.3))) * 20}px)` }); };
/** a huge word that slams in (a - b) */
const big = (t, a, b, html, y = 300) => { const k = clamp((t - a) / 0.2); if (t < a || t > b) return; $("big").innerHTML = html; S($("big"), { opacity: k * clamp((b - t) / 0.15), top: `${y}px`, transform: `scale(${lerp(1.6, 1, back(k))}) rotate(-3deg)` }); };
const counter = (t, a, b, text) => { if (t < a || t > b) return; $("count").textContent = text; S($("count"), { opacity: clamp((t - a) / 0.2) * clamp((b - t) / 0.2) }); };
const redX = (t, a, v3, scale = 1) => { if (t < a) return; const [x, y] = project(v3); S($("rx"), { left: `${x}px`, top: `${y}px`, opacity: 1, transform: `scale(${back(clamp((t - a) / 0.3)) * scale})` }); };
function timer(t, a, b) { const k = clamp((t - a) / (b - a)), s = Math.round(1800 * (1 - ease(k))); $("timer").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; S($("timer"), { opacity: win(t, a - 0.2, b + 0.6, 0.2, 0.3), color: k > 0.8 ? "#ff6a4a" : "#fff" }); }
const flash = (t, a, amt = 0.8, w = 4) => S($("flash"), { opacity: Math.max(+$("flash").style.opacity || 0, amt - Math.abs(t - a) * w) });

// ---------- one frame: the film's shots, then subtitles, end card and fades ----------
/** frame(endLine, (t) => { …props + shots… }) installs window.render */
function frame(endLine, shots) {
  $("endtry").textContent = endLine;
  window.render = async (t) => {
    for (const el of [...Object.values(TAGS), $("count"), $("big"), $("rx"), $("timer"), $("flash")]) el.style.opacity = 0;
    await shots(t);
    let sub = "";
    for (const ln of LINES.lines) {
      if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue;
      const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0);
      let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; });
      let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i;
      const chunks = []; let c = [];
      words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!]$/.test(w)) { chunks.push(c); c = []; } }); if (c.length) chunks.push(c);
      sub = chunks.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" ");
    }
    $("sub").textContent = sub;
    S($("sub"), { opacity: t > at("end") - 0.1 ? 0 : 1 });
    const e = clamp((t - at("end") + 0.1) / 0.45);
    S($("endc"), { opacity: e });
    document.querySelector("#endc .em").style.transform = `rotate(${(t - at("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
    S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
    r.render(scene, cam);
  };
}
async function ready() { await document.fonts.ready; window.ready = true; }

Object.assign(K, {
  W, H, $, clamp, ease, out, back, lerp, win, V, S, rnd, reseed: (s) => (seed = s), lerpV, r, scene, cam, canvasTex, img, IM, mk,
  sh, flat, lowGround, noise, pick, tree, pine, rock, house, cloud, green, edge, envTex, envGeo, envMat, glyphTex, lockMat, inst, setI, done,
  people, person, posePerson, makePhone, screen, SCREEN_W, SCREEN_H,
  LINES, L, at, end, fr, prog, hemi, sun, addWorld, world, look, lookV, project, phoneWorld, headWorld, overShoulder, orbit,
  tags, tag, big, counter, redX, timer, flash, frame, ready,
});
