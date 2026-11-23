// Do you know the Eiffel Tower is taller in summer? HD film on kit/hd.js (9:16).
// Real scale (metres): the tower is built as a true lattice from its measured profile — a 125 m square base, four curved
// legs (each a lattice box girder) meeting at the 2nd floor (115.7 m), one tapering shaft to the 3rd floor (276 m) and
// the top + antennas (330 m), 1st floor at 57.6 m, the four decorative arches. ~10,000 beams (instanced).
// Physics: thermal expansion (12 µm per m per °C × 300 m × ~40 °C ≈ 14 cm), the sun-side grows more → the top leans
// away from the sun (up to 18 cm) and draws a daily curve; motion exaggerated + labelled. 18,038 parts, 2.5 million
// rivets (hot riveting: glowing rivet, hammered, shrinks as it cools → clamps the plates). Wind sway up to 9 cm.
// Paris: the Seine (ocean shader), Champ de Mars, Haussmann blocks; real Poly Haven skies from dawn to noon.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import { makePhone, makeLaptop, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }

// ---------- skies: dawn (sun 10° up) blending to noon (50° up); the scene's sun follows ----------
const sunFrom = (u, el) => { const a = (u - 0.5) * TAU, e = THREE.MathUtils.degToRad(el); return V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).normalize(); };
const SUN_DAWN = sunFrom(0.6318, 9.9), SUN_NOON = sunFrom(0.6152, 49.6);
const SUN = SUN_DAWN.clone();
H.key.color.set(0xfff0dc); H.hemi.color.set(0xcfe0ff); H.hemi.groundColor.set(0x4a4436);
const FOG = { c: new THREE.Color(0xa9b9c9), d: 0.000085 };
scene.fog = new THREE.FogExp2(FOG.c.getHex(), FOG.d);
const skyA = tex("kit/ph/qwantani_dawn_puresky/sky_4k.jpg", true), skyB = tex("kit/ph/qwantani_noon_puresky/sky_4k.jpg", true);
for (const s of [skyA, skyB]) { s.wrapS = THREE.RepeatWrapping; s.repeat.set(1, 1); }
const skyU = { uA: { value: skyA }, uB: { value: skyB }, uMix: { value: 0 }, uSun: { value: SUN }, uGrey: { value: 0 }, uT: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uA, uB; uniform float uMix, uGrey, uT; uniform vec3 uSun; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
    void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
      vec3 c = mix(texture2D(uA, uv).rgb, texture2D(uB, uv).rgb, uMix); if (d.y < 0.0) c = vec3(0.55, 0.58, 0.6);
      if (d.y > 0.0) { vec2 q = d.xz / (d.y + 0.1) * 1.4 + vec2(uT * 0.006, uT * 0.002); float w = fbm(q * 0.8); float cl = fbm(q + w * 1.3);
        float cov = smoothstep(0.5, 0.72, cl) * smoothstep(0.0, 0.18, d.y); float sh = smoothstep(0.55, 0.85, fbm(q + w * 1.3 + uSun.xz * 0.08));
        float sd = max(dot(d, uSun), 0.0); vec3 warm = mix(vec3(1.0, 0.78, 0.58), vec3(1.0), uMix);
        vec3 cc = mix(vec3(0.97, 0.97, 0.98) * warm, vec3(0.62, 0.66, 0.73), sh * 0.7) * (0.9 + 0.35 * pow(sd, 6.0));
        c = mix(c, cc, cov * 0.88); }
      float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(c, vec3(l) * vec3(0.82, 0.88, 0.95), uGrey);
      c += vec3(1.0, 0.85, 0.6) * pow(max(dot(d, uSun), 0.0), 1600.0) * 4.0 * (1.0 - uGrey);
      gl_FragColor = vec4(c, 1.0); }` }));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// =====================================================================================================================
// THE EIFFEL TOWER — a real lattice from its profile
// =====================================================================================================================
const F1 = 57.6, F2 = 115.7, F3 = 276.1, TOPY = 300, TIPY = 330;
// half-width of the outer envelope (m) at height y (measured profile: 62.5 at the base → 20.5 at F2 → 5 at F3)
const PROF = [[0, 62.5], [6, 56.5], [14, 52], [25, 48.5], [40, 45.5], [F1, 42.5], [85, 31], [F2, 21.5], [140, 13.2], [170, 9.3], [200, 7.3], [230, 6.3], [F3, 5.6], [TOPY, 3.6]];   // fitted to the front photos (strong flare at the foot)
const halfW = (y) => { for (let i = 1; i < PROF.length; i++) if (y <= PROF[i][0]) { const [a, wa] = PROF[i - 1], [b, wb] = PROF[i]; const k = (y - a) / (b - a); return lerp(wa, wb, k * k * (3 - 2 * k) * 0.35 + k * 0.65); } return 3.4; };
// a leg (below F2) is a square box girder whose outer corner follows the envelope and whose width shrinks 15 → 6 m
const legW = (y) => y < F1 ? lerp(26, 15.5, Math.pow(clamp(y / F1), 0.7)) : lerp(15.5, 17, Math.pow(clamp((y - F1) / (F2 - F1)), 1.4));   // above the 1st floor the legs stay wide while the tower narrows: the opening between them closes to a point at the 2nd floor   // each leg: 26 m wide at its foot
const BEAMS = []; // [x1,y1,z1, x2,y2,z2, thickness, kind]  kind: 0 chord, 1 brace, 2 strut
const beam = (a, b, th, k = 1) => BEAMS.push([a.x, a.y, a.z, b.x, b.y, b.z, th, k]);
/** a lattice face between two chord lines (a0→a1 and b0→b1 sampled at n panels): struts + X bracing (+ a finer inner X) */
function face(A, B, n, thBrace, fine = true) {
  for (let i = 0; i < n; i++) { const a0 = A(i / n), a1 = A((i + 1) / n), b0 = B(i / n), b1 = B((i + 1) / n);
    beam(a0, b1, thBrace, 1); beam(b0, a1, thBrace, 1); beam(a1, b1, thBrace * 0.9, 2);
    if (fine) { const m0 = a0.clone().lerp(b0, 0.5), m1 = a1.clone().lerp(b1, 0.5); beam(a0.clone().lerp(m0, 0.5), m1.clone().lerp(a1, 0.5), thBrace * 0.45, 1); beam(m0.clone().lerp(b0, 0.5), m1.clone().lerp(b1, 0.5), thBrace * 0.45, 1); } } }
// the 4 legs (their 4 corner chords each), y 0 → F2
const LEGS = [];
for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
  const corner = (y, ox, oz) => { const w = halfW(y), lw = legW(y); return V(sx * (w - ox * lw), y, sz * (w - oz * lw)); };
  const chords = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([ox, oz]) => (k) => corner(k * F2, ox, oz));
  const NS = 40; for (const C of chords) for (let i = 0; i < NS; i++) beam(C(i / NS), C((i + 1) / NS), 0.9, 0);
  for (let f = 0; f < 4; f++) face(chords[f], chords[(f + 1) % 4], 30, 0.4);
  LEGS.push(chords);
}
// the shaft above F2: four corner chords on the envelope, four lattice faces
const SHAFT = [];
{ const C = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => (k) => { const y = lerp(F2, TOPY, k); const w = halfW(y); return V(sx * w, y, sz * w); });
  const NS = 60; for (const c of C) for (let i = 0; i < NS; i++) beam(c(i / NS), c((i + 1) / NS), 0.75, 0);
  for (let f = 0; f < 4; f++) face(C[f], C[(f + 1) % 4], 48, 0.28); SHAFT.push(...C); }
// girder rings round the shaft (the horizontal bands the photos show between the 2nd and 3rd floors)
for (const y of [150, 180, 205, 230, 255]) { const w = halfW(y); const P = [V(w, y, w), V(-w, y, w), V(-w, y, -w), V(w, y, -w)]; for (let i = 0; i < 4; i++) face((k) => P[i].clone().lerp(P[(i + 1) % 4], k), (k) => P[i].clone().lerp(P[(i + 1) % 4], k).add(V(0, -2.2, 0)), 8, 0.3, false); }
// horizontal ties between the legs at the 1st-floor girders and the 2nd floor
for (const y of [F1 - 3, F1, F2 - 2, F2]) { const w = halfW(y) - legW(y) * 0.5; const P = [V(w, y, w), V(-w, y, w), V(-w, y, -w), V(w, y, -w)]; for (let i = 0; i < 4; i++) face((k) => P[i].clone().lerp(P[(i + 1) % 4], k), (k) => P[i].clone().lerp(P[(i + 1) % 4], k).add(V(0, -3.5, 0)), 14, 0.3, false); }
// the four decorative arches under the 1st floor: a deep lattice ribbon from the inner foot of one leg to the next, its crown
// just under the 1st-floor frieze, the spandrels above it filled with lattice up to the frieze
const ARCH = [];
for (let f = 0; f < 4; f++) { const a = (f * Math.PI) / 2; const Z0 = halfW(4) - legW(4);
  const arc = (u, dy) => { const y = 4 + (F1 - 10.5 - 4) * Math.pow(Math.sin(u * Math.PI), 0.78) + dy; const z = lerp(-Z0, Z0, u) * lerp(1, 0.985, Math.sin(u * Math.PI)); return V(halfW(y) - legW(y) * 0.12, y, z).applyAxisAngle(V(0, 1, 0), a); };
  const N = 44; for (let i = 0; i < N; i++) { beam(arc(i / N, 0), arc((i + 1) / N, 0), 1.1, 0); beam(arc(i / N, -3.4), arc((i + 1) / N, -3.4), 1.1, 0); }
  face((u) => arc(u, 0), (u) => arc(u, -3.4), N, 0.42, false);
  const top = (u) => { const p = arc(u, 0); const y = F1 - 6.5; return V(halfW(y) - legW(y) * 0.12, y, p.z * 0 + lerp(-1, 1, u) * (halfW(y) - legW(y) * 0.6)).applyAxisAngle(V(0, 1, 0), a); };
  face((u) => arc(0.18 + u * 0.64, 0), (u) => top(0.18 + u * 0.64), 18, 0.3, true); ARCH.push({ arc, a }); }
// the platforms are girder grids (open from below): main girders every ~5 m both ways, 3 m deep under the 1st floor, 2 m under the 2nd
for (const [y, depth, hole] of [[F1 - 1.2, 3.2, halfW(F1) - legW(F1) - 1], [F2 - 1.0, 2.2, 0]]) { const w = halfW(y) + 1.5, n = Math.round(2 * w / 5);
  for (let i = 0; i <= n; i++) { const c = -w + (2 * w * i) / n; for (const [p, q] of [[V(c, y - depth, -w), V(c, y - depth, w)], [V(-w, y - depth, c), V(w, y - depth, c)], [V(c, y, -w), V(c, y, w)], [V(-w, y, c), V(w, y, c)]]) {
      if (hole > 0 && Math.abs(c) < hole) { const s = p.x === q.x ? "z" : "x"; const p2 = q.clone(); p2[s] = -hole; const q2 = p.clone(); q2[s] = hole; beam(p, p2, 0.7, 2); beam(q2, q, 0.7, 2); } else beam(p, q, 0.7, 2); }
    for (let j = 0; j < n; j++) { const c2 = -w + (2 * w * (j + 0.5)) / n; if (hole > 0 && Math.abs(c) < hole && Math.abs(c2) < hole) continue; beam(V(c, y - depth, c2 - 2.5), V(c, y, c2 + 2.5), 0.3, 1); beam(V(c2 - 2.5, y - depth, c), V(c2 + 2.5, y, c), 0.3, 1); } } }
const beamG = new THREE.BoxGeometry(1, 1, 1);
const ironMat = new THREE.MeshStandardMaterial({ color: 0x7c624e, roughness: 0.58, metalness: 0.38 }); // "Eiffel Tower brown" bronze paint
const towerIM = new THREE.InstancedMesh(beamG, ironMat, BEAMS.length);
const BC = []; // beam centres (for colour maps)
{ const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), s = V(), p = V();
  BEAMS.forEach(([x1, y1, z1, x2, y2, z2, th], i) => { const a = V(x1, y1, z1), b = V(x2, y2, z2), d = b.clone().sub(a); const L = d.length(); q.setFromUnitVectors(up, d.normalize());
    p.copy(a).add(b).multiplyScalar(0.5); s.set(th, L + th * 0.6, th); m4.compose(p, q, s); towerIM.setMatrixAt(i, m4); BC.push(p.clone()); towerIM.setColorAt(i, new THREE.Color().setScalar(lerp(0.8, 1.16, clamp(p.y / 300)))); });
  towerIM.castShadow = true; towerIM.receiveShadow = true; towerIM.frustumCulled = false; }
// floors, the top lantern and antennas
const TOWER = new THREE.Group(); scene.add(TOWER); TOWER.add(towerIM);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x7c604a, roughness: 0.62, metalness: 0.35 });
for (const [y, w, hole] of [[F1, halfW(F1) + 2.5, halfW(F1) - legW(F1) - 1], [F2, halfW(F2) + 1.5, 0], [F3, halfW(F3) + 2.5, 0]]) {
  const s = new THREE.Shape([V(-w, -w), V(w, -w), V(w, w), V(-w, w)].map((v) => new THREE.Vector2(v.x, v.y)));
  if (hole > 0) s.holes.push(new THREE.Path([V(-hole, -hole), V(-hole, hole), V(hole, hole), V(hole, -hole)].map((v) => new THREE.Vector2(v.x, v.y))));
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = sh(new THREE.Mesh(g, floorMat)); m.position.y = y - 0.3; TOWER.add(m);
  // railings / glazed pavilions on the 1st floor
  for (let k = 0; k < 4; k++) { const band = sh(new THREE.Mesh(new THREE.BoxGeometry(w * 2 + 0.6, y === F3 ? 2.4 : 4.2, 0.6), floorMat)); band.position.set(0, y + (y === F3 ? 0.8 : -0.2), w + 0.3); band.position.applyAxisAngle(V(0, 1, 0), k * Math.PI / 2); band.rotation.y = k * Math.PI / 2; TOWER.add(band);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 2, 0.08, 0.08), floorMat); rail.position.set(0, y + 2.9, w + 0.3); rail.position.applyAxisAngle(V(0, 1, 0), k * Math.PI / 2); rail.rotation.y = k * Math.PI / 2; TOWER.add(rail); }
  if (y === F1) for (let k = 0; k < 4; k++) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(w * 2 * 0.62, 4.2, 4.2), new THREE.MeshPhysicalMaterial({ color: 0x3c4a54, roughness: 0.08, metalness: 0.5, clearcoat: 1 }))); p.position.set(0, y + 2.4, w - 8.5); p.position.applyAxisAngle(V(0, 1, 0), k * Math.PI / 2); p.rotation.y = k * Math.PI / 2; TOWER.add(p); } }
// fine lattice: alpha-mapped panels on every face of the legs and the shaft (the dense web the photos show, at two scales)
const latTex = H.canvasTex(256, 512, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff";
  g.lineWidth = 15; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();                 // the big X of each panel
  g.lineWidth = 6; for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4 + w, h); g.stroke(); g.beginPath(); g.moveTo(i * w / 4 + w, 0); g.lineTo(i * w / 4, h); g.stroke(); }   // the fine web
  g.lineWidth = 7; g.beginPath(); g.moveTo(0, h - 3); g.lineTo(w, h - 3); g.stroke(); });
latTex.wrapS = latTex.wrapT = THREE.RepeatWrapping; latTex.colorSpace = THREE.NoColorSpace; latTex.anisotropy = 8;
const latMat = new THREE.MeshStandardMaterial({ color: 0x7a604c, roughness: 0.6, metalness: 0.35, alphaMap: latTex, alphaTest: 0.32, side: THREE.DoubleSide });
latMat.onBeforeCompile = ironMat.onBeforeCompile; latMat.customProgramCacheKey = () => "eiffel-lattice";
const LAT = new THREE.Group(); TOWER.add(LAT);
function latStrip(A, B, rows, panels) { const pos = [], uv = [], idx = [];
  for (let i = 0; i <= rows; i++) { const k = i / rows, a = A(k), b = B(k); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, k * panels, 1, k * panels); if (i < rows) { const o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, latMat); m.receiveShadow = true; LAT.add(m); }
for (const ch of LEGS) for (let f = 0; f < 4; f++) latStrip(ch[f], ch[(f + 1) % 4], 90, 30);
for (let f = 0; f < 4; f++) latStrip(SHAFT[f], SHAFT[(f + 1) % 4], 120, 48);
// the friezes: the 1st floor's deep arcaded band (Sauvestre's decoration) and the 2nd floor's band
const arcTex = H.canvasTex(512, 128, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 14, w, 14);
  for (let i = 0; i < 8; i++) { const x = i * w / 8; g.fillRect(x, 0, 7, h); g.beginPath(); g.lineWidth = 7; g.strokeStyle = "#fff"; g.arc(x + w / 16, h * 0.62, w / 16 - 6, Math.PI, 0); g.stroke(); g.fillRect(x + w / 32, 18, 3, h * 0.3); } });
arcTex.wrapS = THREE.RepeatWrapping; arcTex.colorSpace = THREE.NoColorSpace;
const friezeMat = latMat.clone(); friezeMat.alphaMap = arcTex; friezeMat.onBeforeCompile = ironMat.onBeforeCompile; friezeMat.customProgramCacheKey = () => "eiffel-frieze";
for (const [y0, y1, rep] of [[F1 - 6.5, F1 - 1.2, 18], [F2 - 4.2, F2 - 1.0, 10]]) { const w = halfW((y0 + y1) / 2) + 0.4;
  for (let k = 0; k < 4; k++) { const g = new THREE.PlaneGeometry(2 * w, y1 - y0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * rep);
    const m = new THREE.Mesh(g, friezeMat); m.position.set(0, (y0 + y1) / 2, w).applyAxisAngle(V(0, 1, 0), k * Math.PI / 2); m.rotation.y = k * Math.PI / 2; TOWER.add(m); } }
const TOP = new THREE.Group(); TOWER.add(TOP);
{ const cab = sh(new THREE.Mesh(new THREE.BoxGeometry(16.5, 5.5, 16.5), floorMat)); cab.position.y = F3 + 1.2; TOP.add(cab);
  for (let k = 0; k < 4; k++) { const wnd = new THREE.Mesh(new THREE.BoxGeometry(15.6, 2.2, 0.2), new THREE.MeshPhysicalMaterial({ color: 0x2a3640, roughness: 0.08, metalness: 0.5 })); wnd.position.set(0, F3 + 1.6, 8.3).applyAxisAngle(V(0, 1, 0), k * Math.PI / 2); wnd.rotation.y = k * Math.PI / 2; TOP.add(wnd); }
  const deck2 = sh(new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.6, 18.6), floorMat)); deck2.position.y = F3 + 4.2; TOP.add(deck2);
  const lan = sh(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 14, 16), new THREE.MeshPhysicalMaterial({ color: 0x6f5a45, roughness: 0.5, metalness: 0.4 }))); lan.position.y = F3 + 9; TOP.add(lan);
  const cap = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.4, 8, 16), floorMat)); cap.position.y = F3 + 20; TOP.add(cap);
  const ant = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, TIPY - (F3 + 24), 10), metal(0xc9c9c4, 0.4))); ant.position.y = (TIPY + F3 + 24) / 2; TOP.add(ant);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), glow(0xff3020, 3)); beacon.position.y = TIPY; TOP.add(beacon); }
// thermal colour map (iron temperature): sun side hot, shade cool; set per instance when the thermal view is on
const TMAP = [[0.05, 0.02, 0.15], [0.35, 0.05, 0.55], [0.85, 0.2, 0.35], [1.0, 0.55, 0.1], [1.0, 0.95, 0.6]];
const tcol = (k) => { k = clamp(k) * (TMAP.length - 1); const i = Math.min(TMAP.length - 2, Math.floor(k)), f = k - i; return new THREE.Color(...TMAP[i].map((c, j) => lerp(c, TMAP[i + 1][j], f))); };
let thermalOn = -1;
function thermal(k, sunH) { // k: 0 normal, 1 thermal
  BEND.therm.value = k; LAT.visible = k <= 0.01;
  const key = k > 0.01 ? Math.round(k * 20) + "|" + sunH.x.toFixed(2) + sunH.z.toFixed(2) : "off"; if (key === thermalOn) return; thermalOn = key;
  const white = new THREE.Color(1, 1, 1);
  BC.forEach((p, i) => { if (k <= 0.01) { towerIM.setColorAt(i, white.clone().setScalar(lerp(0.8, 1.16, clamp(p.y / 300)))); return; } const w = Math.max(halfW(p.y), 1); const side = (p.x * sunH.x + p.z * sunH.z) / w; // -1 shade … +1 sun
    const c = tcol(0.5 + 0.42 * side + 0.06 * Math.sin(i)); towerIM.setColorAt(i, c); });
  towerIM.instanceColor.needsUpdate = true; }
// tower bend: lean away from the sun and stretch (exaggerated) — applied to the whole lattice by a vertex hook
const BEND = { lean: { value: new THREE.Vector2() }, grow: { value: 0 }, therm: { value: 0 } };
ironMat.onBeforeCompile = (s) => { s.uniforms.uLean = BEND.lean; s.uniforms.uGrow = BEND.grow; s.uniforms.uTherm = BEND.therm;
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uTherm;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor * uTherm * 2.6; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05), uTherm);\n#endif");
  s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nuniform vec2 uLean; uniform float uGrow;").replace("#include <project_vertex>", `
    vec4 mvPosition = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
    #endif
    float hk = clamp(mvPosition.y / ${TIPY}.0, 0.0, 1.2);
    mvPosition.y *= 1.0 + uGrow; mvPosition.xz += uLean * hk * hk;
    mvPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;`); };
ironMat.customProgramCacheKey = () => "eiffel-iron";
latMat.onBeforeCompile = ironMat.onBeforeCompile; friezeMat.onBeforeCompile = ironMat.onBeforeCompile;
function setBend(lean, grow) { BEND.lean.value.set(lean.x, lean.y); BEND.grow.value = grow; const hk = (y) => Math.pow(y / TIPY, 2);
  for (const o of [TOP]) { o.position.set(lean.x * hk(F3), F3 * grow, lean.y * hk(F3)); } }
