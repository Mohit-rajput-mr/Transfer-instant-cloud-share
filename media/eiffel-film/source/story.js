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
const PROF = [[0, 62.5], [20, 54], [F1, 41.5], [85, 30], [F2, 20.5], [150, 15], [200, 10.4], [F3, 5.2], [TOPY, 3.4]];
const halfW = (y) => { for (let i = 1; i < PROF.length; i++) if (y <= PROF[i][0]) { const [a, wa] = PROF[i - 1], [b, wb] = PROF[i]; const k = (y - a) / (b - a); return lerp(wa, wb, k * k * (3 - 2 * k) * 0.35 + k * 0.65); } return 3.4; };
// a leg (below F2) is a square box girder whose outer corner follows the envelope and whose width shrinks 15 → 6 m
const legW = (y) => lerp(15, 6, clamp(y / F2));
const BEAMS = []; // [x1,y1,z1, x2,y2,z2, thickness, kind]  kind: 0 chord, 1 brace, 2 strut
const beam = (a, b, th, k = 1) => BEAMS.push([a.x, a.y, a.z, b.x, b.y, b.z, th, k]);
/** a lattice face between two chord lines (a0→a1 and b0→b1 sampled at n panels): struts + X bracing (+ a finer inner X) */
function face(A, B, n, thBrace, fine = true) {
  for (let i = 0; i < n; i++) { const a0 = A(i / n), a1 = A((i + 1) / n), b0 = B(i / n), b1 = B((i + 1) / n);
    beam(a0, b1, thBrace, 1); beam(b0, a1, thBrace, 1); beam(a1, b1, thBrace * 0.9, 2);
    if (fine) { const m0 = a0.clone().lerp(b0, 0.5), m1 = a1.clone().lerp(b1, 0.5); beam(a0.clone().lerp(m0, 0.5), m1.clone().lerp(a1, 0.5), thBrace * 0.45, 1); beam(m0.clone().lerp(b0, 0.5), m1.clone().lerp(b1, 0.5), thBrace * 0.45, 1); } } }
// the 4 legs (their 4 corner chords each), y 0 → F2
for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
  const corner = (y, ox, oz) => { const w = halfW(y), lw = legW(y); return V(sx * (w - ox * lw), y, sz * (w - oz * lw)); };
  const chords = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([ox, oz]) => (k) => corner(k * F2, ox, oz));
  const NS = 40; for (const C of chords) for (let i = 0; i < NS; i++) beam(C(i / NS), C((i + 1) / NS), 0.9, 0);
  for (let f = 0; f < 4; f++) face(chords[f], chords[(f + 1) % 4], 26, 0.32);
}
// the shaft above F2: four corner chords on the envelope, four lattice faces
{ const C = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => (k) => { const y = lerp(F2, TOPY, k); const w = halfW(y); return V(sx * w, y, sz * w); });
  const NS = 60; for (const c of C) for (let i = 0; i < NS; i++) beam(c(i / NS), c((i + 1) / NS), 0.75, 0);
  for (let f = 0; f < 4; f++) face(C[f], C[(f + 1) % 4], 48, 0.24); }
// horizontal ties between the legs at the 1st-floor girders and the 2nd floor
for (const y of [F1 - 3, F1, F2 - 2, F2]) { const w = halfW(y) - legW(y) * 0.5; const P = [V(w, y, w), V(-w, y, w), V(-w, y, -w), V(w, y, -w)]; for (let i = 0; i < 4; i++) face((k) => P[i].clone().lerp(P[(i + 1) % 4], k), (k) => P[i].clone().lerp(P[(i + 1) % 4], k).add(V(0, -3.5, 0)), 14, 0.3, false); }
// the four decorative arches under the 1st floor (a lattice band along an arc between the legs)
for (let f = 0; f < 4; f++) { const a = (f * Math.PI) / 2; const side = (u, y) => { const w = halfW(y) - legW(y) * 0.5; const p = V(w, y, lerp(-w, w, u)); return p.applyAxisAngle(V(0, 1, 0), a); };
  const arc = (u, dy) => { const y = 39 - 0 + Math.cos((u - 0.5) * Math.PI) * 0 + (1 - Math.pow((u - 0.5) * 2, 2)) * 0 + dy; const y2 = lerp(22, 39, Math.sin(u * Math.PI)) + dy; return side(u, y2); };
  face((u) => arc(u, 0), (u) => arc(u, -2.6), 34, 0.38, false); for (let i = 0; i < 34; i++) { beam(arc(i / 34, 0), arc((i + 1) / 34, 0), 0.75, 0); beam(arc(i / 34, -2.6), arc((i + 1) / 34, -2.6), 0.75, 0); } }
const beamG = new THREE.BoxGeometry(1, 1, 1);
const ironMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4e, roughness: 0.55, metalness: 0.4 }); // "Eiffel Tower brown" bronze paint
const towerIM = new THREE.InstancedMesh(beamG, ironMat, BEAMS.length);
const BC = []; // beam centres (for colour maps)
{ const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), s = V(), p = V();
  BEAMS.forEach(([x1, y1, z1, x2, y2, z2, th], i) => { const a = V(x1, y1, z1), b = V(x2, y2, z2), d = b.clone().sub(a); const L = d.length(); q.setFromUnitVectors(up, d.normalize());
    p.copy(a).add(b).multiplyScalar(0.5); s.set(th, L + th * 0.6, th); m4.compose(p, q, s); towerIM.setMatrixAt(i, m4); BC.push(p.clone()); towerIM.setColorAt(i, new THREE.Color().setScalar(lerp(0.8, 1.16, clamp(p.y / 300)))); });
  towerIM.castShadow = true; towerIM.receiveShadow = true; towerIM.frustumCulled = false; }
// floors, the top lantern and antennas
const TOWER = new THREE.Group(); scene.add(TOWER); TOWER.add(towerIM);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x5c4a3a, roughness: 0.7, metalness: 0.3 });
for (const [y, w, hole] of [[F1, halfW(F1) + 2.5, halfW(F1) - legW(F1) - 1], [F2, halfW(F2) + 1.5, 0], [F3, halfW(F3) + 2.5, 0]]) {
  const s = new THREE.Shape([V(-w, -w), V(w, -w), V(w, w), V(-w, w)].map((v) => new THREE.Vector2(v.x, v.y)));
  if (hole > 0) s.holes.push(new THREE.Path([V(-hole, -hole), V(-hole, hole), V(hole, hole), V(hole, -hole)].map((v) => new THREE.Vector2(v.x, v.y))));
  const g = new THREE.ExtrudeGeometry(s, { depth: 3.2, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = sh(new THREE.Mesh(g, floorMat)); m.position.y = y - 1.6; TOWER.add(m);
  // railings / glazed pavilions on the 1st floor
  for (let k = 0; k < 4; k++) { const band = sh(new THREE.Mesh(new THREE.BoxGeometry(w * 2 + 0.6, y === F3 ? 2.4 : 4.2, 0.6), floorMat)); band.position.set(0, y + (y === F3 ? 0.8 : -0.2), w + 0.3); band.position.applyAxisAngle(V(0, 1, 0), k * Math.PI / 2); band.rotation.y = k * Math.PI / 2; TOWER.add(band);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 2, 0.08, 0.08), floorMat); rail.position.set(0, y + 2.9, w + 0.3); rail.position.applyAxisAngle(V(0, 1, 0), k * Math.PI / 2); rail.rotation.y = k * Math.PI / 2; TOWER.add(rail); }
  if (y === F1) for (let k = 0; k < 4; k++) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(w * 2 * 0.86, 6, 5), new THREE.MeshPhysicalMaterial({ color: 0x8fa2ad, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.8 }))); p.position.set(0, y + 4.6, w - 4.5); p.position.applyAxisAngle(V(0, 1, 0), k * Math.PI / 2); p.rotation.y = k * Math.PI / 2; TOWER.add(p); } }
const TOP = new THREE.Group(); TOWER.add(TOP);
{ const lan = sh(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 14, 16), new THREE.MeshPhysicalMaterial({ color: 0x6f5a45, roughness: 0.5, metalness: 0.4 }))); lan.position.y = F3 + 9; TOP.add(lan);
  const cap = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 4.4, 8, 16), floorMat)); cap.position.y = F3 + 20; TOP.add(cap);
  const ant = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, TIPY - (F3 + 24), 10), metal(0xc9c9c4, 0.4))); ant.position.y = (TIPY + F3 + 24) / 2; TOP.add(ant);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), glow(0xff3020, 3)); beacon.position.y = TIPY; TOP.add(beacon); }
// thermal colour map (iron temperature): sun side hot, shade cool; set per instance when the thermal view is on
const TMAP = [[0.05, 0.02, 0.15], [0.35, 0.05, 0.55], [0.85, 0.2, 0.35], [1.0, 0.55, 0.1], [1.0, 0.95, 0.6]];
const tcol = (k) => { k = clamp(k) * (TMAP.length - 1); const i = Math.min(TMAP.length - 2, Math.floor(k)), f = k - i; return new THREE.Color(...TMAP[i].map((c, j) => lerp(c, TMAP[i + 1][j], f))); };
let thermalOn = -1;
function thermal(k, sunH) { // k: 0 normal, 1 thermal
  BEND.therm.value = k;
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
function setBend(lean, grow) { BEND.lean.value.set(lean.x, lean.y); BEND.grow.value = grow; const hk = (y) => Math.pow(y / TIPY, 2);
  for (const o of [TOP]) { o.position.set(lean.x * hk(F3), F3 * grow, lean.y * hk(F3)); } }

// =====================================================================================================================
// PARIS: the Seine to the north-west, the Champ de Mars to the south-east, Haussmann blocks with zinc mansard roofs
// =====================================================================================================================
const CITY = new THREE.Group(); scene.add(CITY);
const gT = (n, srgb, r) => tex(`kit/ph/grass_ground/grass_ground_${n}_1k.jpg`, srgb, r, r);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.95, map: tex("kit/ph/gravel_floor/gravel_floor_diff_1k.jpg", true, 3000, 3000) }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; CITY.add(ground);
const lawnMat = new THREE.MeshStandardMaterial({ map: gT("diff", true, 18, 90), normalMap: gT("nor_gl", false, 18, 90), roughness: 1, color: 0xb9d19a });
for (const x of [-46, 46]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(84, 900), lawnMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.3, 560); l.receiveShadow = true; CITY.add(l); }
// gravel paths of the Champ de Mars and under the tower
const path = new THREE.Mesh(new THREE.PlaneGeometry(320, 1000), new THREE.MeshStandardMaterial({ color: 0xc9b99c, roughness: 1, map: tex("kit/ph/gravel_floor/gravel_floor_diff_1k.jpg", true, 30, 90) }));
path.rotation.x = -Math.PI / 2; path.position.set(0, 0.15, 470); path.receiveShadow = true; CITY.add(path);
// the Seine: a 140 m river with stone quays
const waterN = (() => { const N = 256, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N); H.reseed(5);
  const W2 = Array.from({ length: 24 }, () => ({ kx: Math.round((H.rnd() - 0.5) * 14), ky: Math.round((H.rnd() - 0.5) * 14), ph: H.rnd() * TAU, a: 0.4 + H.rnd() })); const hh = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const q of W2) { const k = Math.hypot(q.kx, q.ky) || 1; v += (q.a / k) * Math.sin(((q.kx * x + q.ky * y) / N) * TAU + q.ph); } hh[y * N + x] = v; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = hh[y * N + (x + 1) % N] - hh[y * N + (x + N - 1) % N], dy = hh[((y + 1) % N) * N + x] - hh[((y + N - 1) % N) * N + x]; const n = V(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * N + x) * 4;
    im.data[i] = (n.x * 0.5 + 0.5) * 255; im.data[i + 1] = (n.y * 0.5 + 0.5) * 255; im.data[i + 2] = (n.z * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const SEINE_Z = -230;
const seine = new Water(new THREE.PlaneGeometry(9000, 140), { textureWidth: 512, textureHeight: 512, waterNormals: waterN, sunDirection: SUN.clone(), sunColor: 0xfff0d8, waterColor: 0x1d3b3a, distortionScale: 1.8, fog: true });
seine.rotation.x = -Math.PI / 2; seine.position.set(0, -3.5, SEINE_Z); CITY.add(seine);
const stone = (rx, ry) => new THREE.MeshStandardMaterial({ color: 0xd8ccb4, roughness: 0.9, map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, rx, ry) });
for (const s of [-1, 1]) { const q = sh(new THREE.Mesh(new THREE.BoxGeometry(9000, 6, 14), stone(300, 1))); q.position.set(0, -2, SEINE_Z + s * 77); CITY.add(q); }
// Pont d'Iéna: five stone arches across the river in line with the tower
{ const br = new THREE.Group(); br.position.set(0, 0, SEINE_Z); CITY.add(br);
  const deck = sh(new THREE.Mesh(new THREE.BoxGeometry(35, 1.6, 160), stone(2, 10))); deck.position.y = 0.6; br.add(deck);
  for (let i = 0; i < 4; i++) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(30, 4, 6), stone(2, 1))); p.position.set(0, -2, -60 + i * 40); br.add(p); } }
// Haussmann Paris: irregular perimeter blocks (Voronoi cells cut by straight boulevards radiating from the squares),
// 6-storey cream limestone facades (tall French windows, wrought-iron balconies on the 2nd and 5th floors, shops on the
// ground floor), grey-blue zinc mansard roofs with dormers, chimney stacks; open courtyards inside each block.
const HUBS = [V(0, 0, 1060), V(0, 0, -600), V(1500, 0, 950), V(-1350, 0, 1500), V(1700, 0, -1500), V(-1900, 0, -1300)];
const RAYS = []; HUBS.forEach((h, hi) => { const n = 7; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + hi * 0.37; RAYS.push({ o: h, d: V(Math.cos(a), 0, Math.sin(a)), w: 17 + (i % 2) * 6 }); } });
RAYS.push({ o: V(0, 0, SEINE_Z + 110), d: V(1, 0, 0), w: 14 }, { o: V(0, 0, SEINE_Z - 110), d: V(1, 0, 0), w: 14 });   // quai roads
const ZONES = [[-200, -150, 200, 1000], [-9000, SEINE_Z - 96, 9000, SEINE_Z + 96], [-340, -770, 340, SEINE_Z - 96], [-170, 1000, 170, 1110]];   // Champ de Mars, Seine, Trocadéro, École Militaire
const inZone = (x, z) => ZONES.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
const clipP = (P, nx, nz, c) => { const out2 = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const da = a[0] * nx + a[1] * nz - c, db = b[0] * nx + b[1] * nz - c;
  if (da >= 0) out2.push(a); if ((da >= 0) !== (db >= 0)) { const k = da / (da - db); out2.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); } } return out2; };
const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const cent = (P) => P.reduce((s, p) => [s[0] + p[0] / P.length, s[1] + p[1] / P.length], [0, 0]);
const FAC = [], ROOF = [], CHIM = [];
{ H.reseed(11); const SP = 96, R = 4200, pts = [], grid = new Map(); const key = (i, j) => i + "," + j;
  for (let i = -46; i <= 46; i++) for (let j = -46; j <= 46; j++) { const x = (i + 0.5 + (H.rnd() - 0.5) * 0.7) * SP, z = (j + 0.5 + (H.rnd() - 0.5) * 0.7) * SP; if (Math.hypot(x, z) > R || inZone(x, z)) continue; const p = [x, z, i, j]; pts.push(p); grid.set(key(i, j), p); }
  for (const [x, z, gi, gj] of pts) {
    let P = [[x - 300, z - 300], [x + 300, z - 300], [x + 300, z + 300], [x - 300, z + 300]];
    for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) { const q = grid.get(key(gi + di, gj + dj)); if (!q || (di === 0 && dj === 0)) continue;
      const nx = x - q[0], nz = z - q[1], L = Math.hypot(nx, nz); const mx = (x + q[0]) / 2, mz = (z + q[1]) / 2; P = clipP(P, nx / L, nz / L, (mx * nx + mz * nz) / L + 6); }   // half street (12 m streets)
    for (const r of RAYS) { const px = x - r.o.x, pz = z - r.o.z; const along = px * r.d.x + pz * r.d.z; if (along < 0) continue; const side = px * -r.d.z + pz * r.d.x; const nx = -r.d.z * Math.sign(side), nz = r.d.x * Math.sign(side);
      const c = (r.o.x * nx + r.o.z * nz) + r.w; if (Math.abs(side) < 220) P = clipP(P, nx, nz, c); }
    for (const [x0, z0, x1, z1] of ZONES) { const cx = x, cz = z; if (cx < x0) P = clipP(P, -1, 0, -x0 + 10); else if (cx > x1) P = clipP(P, 1, 0, x1 + 10); else if (cz < z0) P = clipP(P, 0, -1, -z0 + 10); else if (cz > z1) P = clipP(P, 0, 1, z1 + 10); }
    if (P.length < 3 || Math.abs(area(P)) < 400) continue;
    if (area(P) < 0) P.reverse();
    const d0 = Math.hypot(x, z), hgt = 18.5 + H.rnd() * 3.5, sd = H.rnd();
    if (d0 > 2000) { const [cx, cz] = cent(P); let w = 0, dd = 0; const a = Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]); for (const p of P) { const u = (p[0] - cx) * Math.cos(a) + (p[1] - cz) * Math.sin(a), v = -(p[0] - cx) * Math.sin(a) + (p[1] - cz) * Math.cos(a); w = Math.max(w, Math.abs(u)); dd = Math.max(dd, Math.abs(v)); }
      FAC.push([cx, cz, w * 1.6, dd * 1.6, hgt, a, sd]); ROOF.push([cx, cz, w * 1.6, dd * 1.6, hgt, a]); continue; }
    for (let e = 0; e < P.length; e++) { const a = P[e], b = P[(e + 1) % P.length]; const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez); if (L < 9) continue;
      const dx = ex / L, dz = ez / L, nx = -dz, nz = dx; const n = Math.max(1, Math.round(L / (13 + H.rnd() * 7))), seg = L / n, ang = Math.atan2(dz, dx);
      for (let i = 0; i < n; i++) { const h2 = hgt + (H.rnd() - 0.5) * 1.6, depth = 13 + H.rnd() * 3; const cx = a[0] + dx * seg * (i + 0.5) + nx * depth / 2, cz = a[1] + dz * seg * (i + 0.5) + nz * depth / 2;
        FAC.push([cx, cz, seg + 0.4, depth, h2, ang, H.rnd()]); ROOF.push([cx, cz, seg + 0.4, depth, h2, ang]);
        if (H.rnd() < 0.8) CHIM.push([cx + nx * (H.rnd() - 0.5) * depth * 0.3 + dx * (H.rnd() - 0.5) * seg * 0.6, cz + nz * (H.rnd() - 0.5) * depth * 0.3 + dz * (H.rnd() - 0.5) * seg * 0.6, h2 + 5.6, ang]); } } } }
const facMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0, map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, 1, 1) });
const LOCAL_VS = (s) => s.replace("#include <common>", "#include <common>\nattribute vec2 aKind; varying vec3 vLoc; varying vec3 vON; varying vec2 vKind; varying vec3 vWP2;")
  .replace("#include <begin_vertex>", `#include <begin_vertex>
    vec3 scl = vec3(1.0);
    #ifdef USE_INSTANCING
      scl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    #endif
    vLoc = position * scl; vON = normal; vKind = aKind;
    vec4 w4 = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      w4 = instanceMatrix * w4;
    #endif
    vWP2 = (modelMatrix * w4).xyz;`);
facMat.onBeforeCompile = (s) => { s.vertexShader = LOCAL_VS(s.vertexShader);
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vLoc; varying vec3 vON; varying vec2 vKind; varying vec3 vWP2; float hh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 14375.5); }")
    .replace("#include <map_fragment>", `
      vec3 n = abs(vON); float u = n.z > 0.5 ? vLoc.x : vLoc.z; float y = vLoc.y; float top = vKind.x; float sd = vKind.y;
      vec2 suv = vec2(u, y) / 6.0; vec4 stone = texture2D(map, suv);
      float lum = dot(stone.rgb, vec3(0.33));
      vec3 wall = vec3(0.9, 0.84, 0.72) * (0.82 + 0.35 * lum) * (0.92 + 0.12 * sd);
      float dist = length(cameraPosition - vWP2), far = smoothstep(700.0, 2600.0, dist);
      float bay = 3.3, fx = fract(u / bay + 0.5 * sd), col = floor(u / bay);
      float fl; float fy; if (y < 4.4) { fl = 0.0; fy = y / 4.4; } else if (y < 7.0) { fl = 1.0; fy = (y - 4.4) / 2.6; } else { fl = 2.0 + floor((y - 7.0) / 3.05); fy = fract((y - 7.0) / 3.05); }
      vec3 c = wall;
      if (n.y < 0.5 && y < top - 0.6) {
        float winX = step(0.3, fx) * step(fx, 0.7);
        if (fl == 0.0) { float shop = step(0.12, fx) * step(fx, 0.88) * step(0.06, fy) * step(fy, 0.8); vec3 aw = mix(vec3(0.35, 0.08, 0.07), vec3(0.1, 0.18, 0.12), step(0.5, hh(vec2(col, sd * 31.0))));
          c = mix(c * 0.86, vec3(0.06, 0.07, 0.08) + 0.08 * hh(vec2(col, 3.0)), shop); c = mix(c, aw, step(0.12, fx) * step(fx, 0.88) * step(0.8, fy) * step(fy, 0.92)); }
        else { float wy = fl == 1.0 ? step(0.2, fy) * step(fy, 0.78) : step(0.16, fy) * step(fy, 0.86);
          float lit = hh(vec2(col, fl + sd * 17.0)); vec3 glass = mix(vec3(0.07, 0.08, 0.1), vec3(0.18, 0.2, 0.24), lit);
          c = mix(c, vec3(0.97, 0.94, 0.86), winX * wy * 0.0 + (step(0.26, fx) * step(fx, 0.74) * (1.0 - winX)) * wy * 0.25);   // pale stone frames
          c = mix(c, glass, winX * wy);
          float balc = (fl == 3.0 || fl == top * 0.0 + 6.0 || (fl == 2.0 && hh(vec2(col, 9.0)) < 0.0)) ? 1.0 : 0.0; if (fl == 3.0 || fl == 6.0) { float b = step(0.0, fy) * step(fy, 0.16); float rails = step(0.5, fract(u * 6.0)); c = mix(c, vec3(0.05), b * (0.55 + 0.35 * rails)); }
          if (fl > 1.0 && fy > 0.92) c *= 0.86; }                                                       // string course shadows
        if (y > top - 1.4) c = mix(c, vec3(0.95, 0.91, 0.82), 0.6);                                        // cornice
        c = mix(c, wall * 0.9, far * 0.7);
      }
      if (n.y > 0.5) c = vec3(0.4, 0.43, 0.47);
      diffuseColor.rgb *= c;`); };
facMat.customProgramCacheKey = () => "paris-fac";
const zincT = tex("kit/ph/grey_roof_01/grey_roof_01_diff_1k.jpg", true, 1, 1);
const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.35, map: zincT });
roofMat.onBeforeCompile = (s) => { s.vertexShader = LOCAL_VS(s.vertexShader);
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vLoc; varying vec3 vON; varying vec2 vKind; varying vec3 vWP2;")
    .replace("#include <map_fragment>", `
      vec3 n = vON; float u = abs(n.z) > abs(n.x) ? vLoc.x : vLoc.z; vec4 zt = texture2D(map, vec2(u, vLoc.y) / 5.0);
      vec3 c = vec3(0.46, 0.5, 0.55) * (0.75 + 0.5 * dot(zt.rgb, vec3(0.33)));
      c *= 0.9 + 0.1 * step(0.5, fract(u * 2.0));                                                              // standing seams
      float steep = 1.0 - step(0.55, vLoc.y / 6.0);
      float fx = fract(u / 3.3), dorm = steep * step(0.35, fx) * step(fx, 0.65) * step(0.12, vLoc.y / 6.0) * step(vLoc.y / 6.0, 0.48);
      c = mix(c, vec3(0.9, 0.88, 0.84), dorm * 0.8); c = mix(c, vec3(0.08, 0.09, 0.11), dorm * step(0.4, fx) * step(fx, 0.6) * step(0.18, vLoc.y / 6.0) * step(vLoc.y / 6.0, 0.42));
      diffuseColor.rgb = c;`); };
roofMat.customProgramCacheKey = () => "paris-roof";
const mansardG = (() => { const g = new THREE.BufferGeometry(); const L = [[0.5, 0.5, 0], [0.42, 0.42, 0.7], [0.28, 0.3, 1.0]]; const pos = [];
  const ring = (k) => { const [w, d, y] = L[k]; return [[-w, y, -d], [w, y, -d], [w, y, d], [-w, y, d]]; };
  for (let k = 0; k < 2; k++) { const A = ring(k), B = ring(k + 1); for (let i = 0; i < 4; i++) { const a0 = A[i], a1 = A[(i + 1) % 4], b0 = B[i], b1 = B[(i + 1) % 4]; pos.push(...a0, ...b1, ...a1, ...a0, ...b0, ...b1); } }
  const T = ring(2); pos.push(...T[0], ...T[2], ...T[1], ...T[0], ...T[3], ...T[2]);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; })();
{ const fg = new THREE.BoxGeometry(1, 1, 1); fg.translate(0, 0.5, 0);
  const facIM = new THREE.InstancedMesh(fg, facMat, FAC.length), roofIM = new THREE.InstancedMesh(mansardG, roofMat, ROOF.length);
  const kind = new Float32Array(FAC.length * 2), kindR = new Float32Array(ROOF.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  FAC.forEach(([x, z, w, d, h, a, s], i) => { q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(x, 0, z), q, V(w, h, d)); facIM.setMatrixAt(i, m4); kind[i * 2] = h; kind[i * 2 + 1] = s; });
  ROOF.forEach(([x, z, w, d, h, a], i) => { q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(x, h, z), q, V(w, 6, d)); roofIM.setMatrixAt(i, m4); kindR[i * 2] = h; });
  fg.setAttribute("aKind", new THREE.InstancedBufferAttribute(kind, 2)); mansardG.setAttribute("aKind", new THREE.InstancedBufferAttribute(kindR, 2));
  for (const m of [facIM, roofIM]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; CITY.add(m); }
  const cg = new THREE.BoxGeometry(1, 1, 1); cg.translate(0, 0.5, 0); const chIM = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: 0xb59a86, roughness: 0.9 }), CHIM.length);
  CHIM.forEach(([x, z, y, a], i) => { q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(x, y - 1.2, z), q, V(3.2, 2.2, 0.9)); chIM.setMatrixAt(i, m4); }); chIM.castShadow = true; chIM.frustumCulled = false; CITY.add(chIM);
  console.log("paris buildings", FAC.length, "chimneys", CHIM.length);
  // trees: plane trees along the boulevards, chestnuts along the Champ de Mars and the quays
  const tg = new THREE.IcosahedronGeometry(1, 2); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 0.82 + 0.22 * Math.sin(v.x * 5 + v.y * 3) * Math.cos(v.z * 4) + 0.08 * Math.sin(v.x * 13 + v.z * 11); p.setXYZ(i, v.x * k, v.y * k * 0.9 + 0.9, v.z * k); } tg.computeVertexNormals(); }
  const TP = [];
  for (let i = 0; i < 700; i++) { TP.push([(i % 4 < 2 ? -1 : 1) * (i % 2 ? 118 : 172), 140 + Math.floor(i / 4) * 5.2]); }
  for (let i = 0; i < 800; i++) TP.push([-4000 + i * 10, SEINE_Z + ((i % 2) ? 92 : -92)]);
  for (const r of RAYS.slice(0, -2)) for (let s = 40; s < 2600; s += 9) for (const sd of [-1, 1]) { const x = r.o.x + r.d.x * s + -r.d.z * sd * (r.w - 4), z = r.o.z + r.d.z * s + r.d.x * sd * (r.w - 4); if (Math.hypot(x, z) < 3000 && !inZone(x, z)) TP.push([x, z]); }
  const trees = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: gT("diff", true, 2) }), TP.length); const col = new THREE.Color();
  TP.forEach(([x, z], i) => { const s = 3.6 + hash(i) * 1.8; m4.makeScale(s, s * 1.15, s).setPosition(x, 2.5, z); trees.setMatrixAt(i, m4); trees.setColorAt(i, col.setHSL(0.24 + hash(i + 3) * 0.05, 0.42, 0.3 + hash(i + 7) * 0.08)); });
  trees.castShadow = true; trees.frustumCulled = false; CITY.add(trees); }
// city ground: asphalt streets
ground.material.map = tex("kit/ph/asphalt_02/asphalt_02_diff_1k.jpg", true, 2400, 2400); ground.material.color.set(0x9a958c); ground.material.needsUpdate = true;
// Palais de Chaillot (Trocadéro): two curved wings and the pavilions, the gardens and the long fountain basin down to the Seine
{ const stoneC = new THREE.MeshStandardMaterial({ color: 0xe6dcc8, roughness: 0.85, map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, 4, 1) }); const C0 = V(0, 0, -780), R0 = 230;
  for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 18; i++) { const a = s * (0.32 + i * 0.065); const b = sh(new THREE.Mesh(new THREE.BoxGeometry(19, 20, 16), stoneC)); b.position.set(C0.x + Math.sin(a) * R0, 10, C0.z + Math.cos(a) * R0); b.rotation.y = a; CITY.add(b);
    const r = sh(new THREE.Mesh(new THREE.BoxGeometry(19.5, 1.2, 16.5), matte(0xcfc6b4, 0.9))); r.position.copy(b.position).setY(20.6); r.rotation.y = a; CITY.add(r); }
  for (const s of [-1, 1]) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(46, 28, 40), stoneC)); p.position.set(s * 70, 14, C0.z + R0 - 10); CITY.add(p); }
  const lawn2 = new THREE.Mesh(new THREE.PlaneGeometry(560, 330), lawnMat); lawn2.rotation.x = -Math.PI / 2; lawn2.position.set(0, 0.3, -500); lawn2.receiveShadow = true; CITY.add(lawn2);
  const basin = new THREE.Mesh(new THREE.PlaneGeometry(60, 230), new THREE.MeshPhysicalMaterial({ color: 0x5f8aa0, roughness: 0.05, metalness: 0.2 })); basin.rotation.x = -Math.PI / 2; basin.position.set(0, 0.12, -470); CITY.add(basin);
  // École Militaire closing the Champ de Mars
  const em = sh(new THREE.Mesh(new THREE.BoxGeometry(320, 22, 40), stoneC)); em.position.set(0, 11, 1080); CITY.add(em);
  const emR = sh(new THREE.Mesh(new THREE.BoxGeometry(321, 6, 41), new THREE.MeshStandardMaterial({ color: 0x6b7480, roughness: 0.5, metalness: 0.3 }))); emR.position.set(0, 25, 1080); CITY.add(emR);
  const dome = sh(new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6b7480, roughness: 0.4, metalness: 0.4 }))); dome.position.set(0, 30, 1062); dome.scale.y = 1.3; CITY.add(dome);
  const portico = sh(new THREE.Mesh(new THREE.BoxGeometry(60, 30, 12), stoneC)); portico.position.set(0, 15, 1056); CITY.add(portico); }
// bateaux-mouches on the Seine
const BOATS = []; for (let i = 0; i < 5; i++) { const b = new THREE.Group(); const hull = sh(new THREE.Mesh(new RoundedBoxGeometry(32, 2.4, 7, 2, 0.6), matte(0xeeeeea, 0.5))); hull.position.y = 0.2; b.add(hull);
  const glass = sh(new THREE.Mesh(new RoundedBoxGeometry(26, 2.2, 6.2, 2, 0.8), new THREE.MeshPhysicalMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.3, clearcoat: 1 }))); glass.position.y = 2.4; b.add(glass);
  b.position.set(-1500 + i * 700, -3.2, SEINE_Z + (i % 2 ? 30 : -30)); b.userData.dir = i % 2 ? 1 : -1; CITY.add(b); BOATS.push(b); }
function boats(t) { BOATS.forEach((b, i) => { b.position.x = ((-1500 + i * 700 + b.userData.dir * t * 3.5) % 4000 + 4000) % 4000 - 2000; b.rotation.y = b.userData.dir > 0 ? 0 : Math.PI; }); }
// people under the tower for scale (simple walkers seen from afar)
const PEOPLE = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.25, 1.2, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 300);
{ const m4 = new THREE.Matrix4(), c = new THREE.Color(); for (let i = 0; i < 300; i++) { const x = (hash(i) - 0.5) * 140, z = (hash(i + 9) - 0.5) * 160 + 30; m4.makeTranslation(x, 0.85, z); PEOPLE.setMatrixAt(i, m4); PEOPLE.setColorAt(i, c.setHSL(hash(i + 4), 0.4, 0.3 + hash(i + 2) * 0.3)); } PEOPLE.castShadow = true; CITY.add(PEOPLE); }

// =====================================================================================================================
// THE RIVETED JOINT, in place on the tower (west face of the shaft, 150 m up, Paris behind): a gusset plate joining two
// L-angle chords and the lattice bars, rows of domed rivet heads; one hole still open for the red-hot rivet
// (local: x right, y up, +z toward the camera inside the tower)
// =====================================================================================================================
const RV = new THREE.Group(); RV.position.set(-halfW(150) - 1.4, 150, 0); RV.rotation.y = Math.PI / 2; scene.add(RV); RV.visible = false;
const rustN = tex("kit/ph/green_metal_rust/green_metal_rust_nor_gl_1k.jpg", false, 4, 4);
const ironJ = new THREE.MeshStandardMaterial({ color: 0x7a6658, roughness: 0.62, metalness: 0.4, normalMap: rustN, normalScale: new THREE.Vector2(0.35, 0.35) });
const box = (w, h, d, x, y, z, rz = 0) => { const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.003, d / 3)), ironJ)); m.position.set(x, y, z); m.rotation.z = rz; RV.add(m); return m; };
for (const s of [-1, 1]) { box(0.12, 2.6, 0.012, s * 0.4, 0, 0); box(0.012, 2.6, 0.12, s * 0.4 - s * 0.054, 0, -0.06); }      // the two L-angle chords
box(0.64, 0.44, 0.012, 0, 0, 0.012);                                                                                        // gusset plate
const BARS = [[-0.4, -0.75], [0.4, -0.75], [-0.4, 0.75], [0.4, 0.75]];
for (const [x, y] of BARS) { const L = Math.hypot(x, y), a = Math.atan2(y, x); box(0.09, L, 0.01, x / 2, y / 2, 0.024, a - Math.PI / 2); }
box(0.8, 0.09, 0.01, 0, -0.95, 0.012); box(0.8, 0.09, 0.01, 0, 0.95, 0.012);                                                // struts
const HOLE = V(0.12, 0, 0.018);
const RH = [];
for (const s of [-1, 1]) for (let y = -1.25; y <= 1.25; y += 0.075) if (Math.abs(y) > 0.24 || true) RH.push([s * 0.4, y, 0.006 + (Math.abs(y) < 0.23 ? 0.012 : 0) + (Math.abs(Math.abs(y) - 0.95) < 0.05 ? 0.01 : 0)]);
for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) { const x = i * 0.12, y = j * 0.15; if (Math.abs(x - HOLE.x) < 0.01 && Math.abs(y - HOLE.y) < 0.01) continue; RH.push([x, y, 0.018 + (Math.abs(x) > 0.2 && Math.abs(y) > 0.1 ? 0.01 : 0)]); }
for (const [x, y] of BARS) for (const k of [0.62, 0.74]) RH.push([x * k, y * k, 0.029]);
const headG = new THREE.SphereGeometry(0.014, 20, 10, 0, TAU, 0, Math.PI / 2); headG.scale(1, 0.62, 1); headG.rotateX(Math.PI / 2);
const RIVS = new THREE.InstancedMesh(headG, ironJ, RH.length); { const m4 = new THREE.Matrix4(); RH.forEach(([x, y, z], i) => RIVS.setMatrixAt(i, m4.makeTranslation(x, y, z))); RIVS.castShadow = true; RV.add(RIVS); }
const holeM = new THREE.Mesh(new THREE.CircleGeometry(0.0115, 24), new THREE.MeshBasicMaterial({ color: 0x050403 })); holeM.position.copy(HOLE).add(V(0, 0, 0.0005)); RV.add(holeM);
// the hot rivet: shank + head, glowing (heated in the portable forge), then hammered into a dome
const rivetMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.5, metalness: 0.6, emissive: new THREE.Color(1.0, 0.28, 0.05), emissiveIntensity: 0 });
const rivet = new THREE.Group(); RV.add(rivet);
const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.06, 20), rivetMat); shank.rotation.x = Math.PI / 2; shank.position.z = -0.026; rivet.add(shank);
const headTop = sh(new THREE.Mesh(headG, rivetMat)); headTop.position.z = 0.003; rivet.add(headTop);
// tongs, hammer (a snap + sledge), sparks, the forge glow
const tongs = new THREE.Group(); RV.add(tongs);
for (const s of [-1, 1]) { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 8), metal(0x2a2826, 0.5))); b.rotation.z = Math.PI / 2 - s * 0.06; b.position.set(0.26, s * 0.012, 0); tongs.add(b); }
const hammer = new THREE.Group(); RV.add(hammer);
{ const hd = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 24), metal(0x5d5a56, 0.4))); hd.rotation.x = Math.PI / 2; hd.position.z = 0.065; hammer.add(hd);
  const hl = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.7 }))); hl.position.set(0, -0.3, 0.065); hammer.add(hl); }
const sparks = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(120 * 3), 3)), new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.0, 0.3), size: 0.0025, transparent: true, toneMapped: false })); sparks.frustumCulled = false; RV.add(sparks);
const forgeL = new THREE.PointLight(0xff6a20, 0, 0.12, 2); forgeL.position.copy(HOLE).add(V(0, 0, 0.08)); RV.add(forgeL);
RV.updateMatrixWorld(true);

// =====================================================================================================================
// ORBI: a Paris balcony with the tower behind; direct path first, the encrypted cloud copy when it can't
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
OR.position.set(520, 31, 700);
const OR_D = V(0, 120, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-OR_D.x, -OR_D.z);
const lock = makeLock(); OR.add(lock);
const table = sh(new THREE.Mesh(new RoundedBoxGeometry(9, 0.25, 4.2, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x2a1f19, roughness: 0.3, clearcoat: 0.8, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) }))); OR.add(table); table.position.set(0.6, -0.2, 0);
for (let i = 0; i < 9; i++) { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), metal(0x1d1f22, 0.4))); b.position.set(-3.6 + i * 1.0, -0.8, -1.6); OR.add(b); }
const rail = sh(new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.12), metal(0x1d1f22, 0.4))); rail.position.set(0.4, -0.25, -1.6); OR.add(rail);
lap.g.position.set(-1.2, 0, 0.2); lap.g.rotation.y = 0.35; ph.g.position.set(2.2, 0.06, 0.6); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.25);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 6, 2); OR.add(orbiL);
const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.0, 0.55).multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0 });
const directBeam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(-1.0, 1.2, 0.3), V(0.6, 2.0, 0.6), V(2.2, 0.3, 0.6)), 48, 0.04, 8), beamMat); OR.add(directBeam);
const cloudMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.85, 1.0).multiplyScalar(1.8), toneMapped: false, transparent: true, opacity: 0 });
const cloudBeam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(V(-1.0, 1.2, 0.3), V(-0.6, 4.5, 0.3), V(2.0, 4.5, 0.6), V(2.2, 0.3, 0.6)), 64, 0.04, 8), cloudMat); OR.add(cloudBeam);
const cloudIcon = new THREE.Group(); OR.add(cloudIcon); cloudIcon.position.set(0.7, 4.3, 0.45);
for (const [x, y, r] of [[-0.35, 0, 0.32], [0, 0.15, 0.42], [0.38, 0, 0.3], [0.05, -0.1, 0.36]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.9, 1.0).multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0 })); s.position.set(x, y, 0); cloudIcon.add(s); }
const blockX = new THREE.Group(); OR.add(blockX); blockX.position.set(0.6, 1.7, 0.6);
for (const r of [0.6, -0.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.3, 0.2), toneMapped: false })); b.rotation.z = r + Math.PI / 4 * 0; b.rotation.z = r; blockX.add(b); }
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.msg) { g.fillStyle = "rgba(8,10,14,.88)"; rr(g, 60, 720, 820, 130, 26); g.fill(); g.fillStyle = st.col; g.font = "700 34px M"; g.fillText(st.msg, 96, 778); g.fillStyle = "#cfd6dd"; g.font = "600 26px M"; g.fillText("paris-sunset.mov  ·  1.2 GB", 96, 822); } }
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (st.got > 0) { g.fillStyle = "#0b0d10"; g.fillRect(60, 560, 660, 120); // cover the empty-void hint
    g.fillStyle = "rgba(14,18,22,.96)"; g.strokeStyle = green; g.lineWidth = 3; rr(g, 70, 600, 640, 380, 40); g.fill(); g.stroke();
    g.fillStyle = "#1c2a22"; rr(g, 110, 640, 150, 150, 26); g.fill(); g.fillStyle = green; g.font = "800 56px D"; g.fillText("▶", 160, 738);
    g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("paris-sunset.mov", 290, 700); g.fillStyle = "#9aa6b2"; g.font = "600 30px M"; g.fillText("1.2 GB · video", 290, 750);
    g.fillStyle = "rgba(255,255,255,.12)"; rr(g, 110, 830, 560, 26, 13); g.fill(); g.fillStyle = green; rr(g, 110, 830, 560 * Math.min(1, st.got), 26, 13); g.fill();
    g.font = "800 40px D"; g.fillText(st.got >= 1 ? "✓ RECEIVED" : `RECEIVING ${Math.round(st.got * 100)}%`, 110, 930); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  h330: ["330 m", "#3dff8c", "to the top of the antenna"], iron: ["Puddled iron", "#ffd166", "an early wrought iron"], grow: ["≈ +15 cm", "#ff8a3d", "on a hot summer day"],
  shrink: ["Shrinks back", "#9fd4ff", "on a freezing night"], hot: ["Sun side", "#ffd166", "heats → grows more"], cold: ["Shade side", "#b18cff", "stays cooler"],
  lean: ["Top leans away", "#ff8a3d", "up to 18 cm"], loop: ["The top's path", "#ffd166", "one curve a day"], rivet: ["Red-hot rivet", "#ff8a3d", "heated in a forge"],
  clamp: ["Shrinks as it cools", "#3dff8c", "pulls the plates tight"], sway: ["The top", "#9fd4ff", "sways ≈ 9 cm"], wind: ["Wind", "#9fd4ff", "passes through"], curve: ["The curve of the legs", "#3dff8c", "from Eiffel's wind calculations"],
  direct: ["Direct path", green, "device to device"], cloud: ["Encrypted cloud copy", "#8fd0ff", "when there's no direct path"],
});
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["BUILT", "1889"], ["IRON", "7,300 t"], ["HEIGHT", "330 m"]].map(([a, b]) => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 60px D;font-stretch:112%;color:#fff;margin-top:6px">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("formula", `<div style="width:1080px;display:flex;justify-content:center"><div style="padding:22px 30px;border-radius:24px;background:rgba(8,10,16,.84);border:1.5px solid #ff8a3d;text-align:center">
  <div style="font:700 24px M;letter-spacing:.18em;color:#9aa6b2">THERMAL EXPANSION</div><div style="font:800 40px D;color:#fff;margin-top:10px">300 m × 0.000012 /°C × 42 °C</div><div style="font:900 72px D;color:#ff8a3d;margin-top:4px">≈ 15 cm</div></div></div>`, { left: "0px", top: "1380px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 180px/0.85 D;font-stretch:112%;color:#ffd166;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 46px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MOTION EXAGGERATED</div>`, { left: "330px", top: "1110px" });
hudEl("season", `<div style="width:1080px;text-align:center"><span id="seaT" style="display:inline-block;padding:16px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #ff8a3d;font:900 50px D;color:#ff8a3d">SUMMER · +32 °C</span></div>`, { left: "0px", top: "260px" });
hudEl("tleg", `<div style="width:1080px;display:flex;justify-content:center"><div style="padding:16px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid rgba(255,255,255,.2)"><div style="font:700 22px M;letter-spacing:.2em;color:#9aa6b2;margin-bottom:10px">THERMAL CAMERA</div><div style="width:560px;height:22px;border-radius:11px;background:linear-gradient(90deg,#0d0526,#5a0d8c,#d9335a,#ff8c1a,#fff299)"></div><div style="display:flex;justify-content:space-between;font:700 22px M;color:#cfd6dd;margin-top:8px"><span>COOL · SHADE</span><span>HOT · SUN</span></div></div></div>`, { left: "0px", top: "1420px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["DIRECT FIRST", "CLOUD IF NOT", "LOCKED"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 36px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ffd166") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };
// the top's daily path, drawn as it goes
const TRAIL_N = 200, trailP = new Float32Array(TRAIL_N * 3);
const TRAIL = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(trailP, 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.4).multiplyScalar(2), toneMapped: false })); TRAIL.frustumCulled = false; scene.add(TRAIL);
const sunHAt = (az) => V(Math.cos(az), 0, Math.sin(az));

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
function sunAt(k) { SUN.copy(SUN_DAWN).lerp(SUN_NOON, k).normalize(); skyU.uMix.value = k; seine.material.uniforms.sunDirection.value.copy(SUN); }
function dayLook() { H.key.intensity = 3.0; H.hemi.intensity = 0.7; H.envK.value = 0.35; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.2; H.rimB.intensity = 0.3; H.key.position.copy(SUN.clone().multiplyScalar(1500)); H.key.target.position.set(0, 0, 0); }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const orb = (a, rad, h, c = V(0, 0, 0)) => V(c.x + Math.sin(a) * rad, c.y + h, c.z + Math.cos(a) * rad);
const sunH = () => V(SUN.x, 0, SUN.z).normalize();
const EX = 33;   // shown motion = real × 33 (18 cm → 6 m), labelled
const RP = (x, y, z) => RV.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE FILM
// =====================================================================================================================

// the curve of the legs (Eiffel: "wind resistance" set the curvature of the four edges): glowing edges + wind arrows flowing down them
const dashMat = (col) => new THREE.ShaderMaterial({ uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(col).multiplyScalar(2.4) } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uP; uniform vec3 uC; varying float vU; void main(){ float on = step(vU, uP); float dash = 0.6 + 0.4 * sin((vU - uP) * 90.0); gl_FragColor = vec4(uC * on * dash * (0.45 + 0.55 * smoothstep(uP - 0.2, uP, vU)), 1.0); }` });
const CURVE = new THREE.Group(); scene.add(CURVE); CURVE.visible = false; const EDGES = [], GUSTS = [];
for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 80; i++) { const y = (i / 80) * TOPY; pts.push(V(s * halfW(y), y, halfW(y) + 1.5)); } pts.reverse();
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 1.3, 8), dashMat(0x3dff8c)); m.renderOrder = 30; CURVE.add(m); EDGES.push(m); }
for (const y0 of [70, 140, 205, 262]) { const pts = [V(-260, y0, halfW(y0) + 1.5), V(-halfW(y0) - 6, y0, halfW(y0) + 1.5)]; for (let i = 1; i <= 30; i++) { const y = y0 * (1 - i / 30); pts.push(V(-halfW(y) - 3, y, halfW(y) + 1.5)); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 1.6, 8), dashMat(0x9fd4ff)); m.renderOrder = 31; CURVE.add(m); GUSTS.push(m); }
H.frame("Direct first, cloud if not", async (t) => {
  sunAt(0.15); skyU.uGrey.value = 0; dayLook(); camRange(0.5, 70000); sky.visible = true; CITY.visible = true; TOWER.visible = true; RV.visible = false; OR.visible = false; TRAIL.visible = false; CURVE.visible = false; boats(t); skyU.uT.value = t; H.cam.up.set(0, 1, 0); cloudIcon.visible = true;
  scene.background = null; H.zoom = 1; H.bloom.strength = 0.3; thermal(0, sunH()); setBend(V(0, 0), 0); seine.material.uniforms.time.value = t * 0.5; keyShadow(V(0, 120, 0), 260);
  directBeam.material.opacity = 0; cloudMat.opacity = 0; cloudIcon.children.forEach((c) => (c.material.opacity = 0)); blockX.visible = false; lock.visible = false;

  if (t < at("tower")) { // HOOK: from the Champ de Mars lawns, morning sun
    sunAt(0.55); dayLook();
    move(t, 0, at("tower"), [V(30, 1.8, 640), V(0, 150, 0), 40], [V(18, 2.4, 560), V(0, 155, 0), 40], 0.3);
    title(t, fr("hook", 0.05), at("tower"), "Paris", "Taller in summer?", 150);
  } else if (t < at("iron")) { // the tower: rise round it; stats
    sunAt(0.5); dayLook();
    move(t, at("tower"), at("iron"), [orb(2.4, 260, 20), V(0, 60, 0), 36], [orb(3.2, 330, 300), V(0, 250, 0), 36], 0.4);
    hudShow("stats", win(t, fr("tower", 0.25), at("iron"))); callout("h330", t, fr("tower", 0.6), at("iron"), V(0, TIPY, 0), 760, 360);
  } else if (t < at("summer")) { // the iron, close: lattice, rivets, the painted puddled iron
    sunAt(0.3); dayLook(); keyShadow(V(halfW(70), 70, 0), 40);
    move(t, at("iron"), at("summer"), [V(halfW(66) + 14, 64, 26), V(halfW(70), 72, 0), 40], [V(halfW(66) + 8, 70, 16), V(halfW(72), 74, 0), 38], 0.3);
    callout("iron", t, fr("iron", 0.15), at("summer"), V(halfW(72) - 3, 74, 3), 760, 1180);
  } else if (t < at("winter")) { // summer noon: the tower grows (×100) with the formula
    sunAt(1.0); dayLook(); const g = ease(prog(t, fr("summer", 0.4), fr("summer", 0.9))) * 0.15 * 100 / 300; setBend(V(0, 0), g);
    move(t, at("summer"), at("winter"), [V(380, 110, 640), V(0, 160, 0), 34], [V(340, 120, 560), V(0, 170, 0), 34], 0.3);
    hudShow("season", win(t, at("summer"), at("winter"))); H.$("seaT").textContent = "SUMMER · +32 °C"; H.$("seaT").style.color = "#ff8a3d";
    hudShow("formula", win(t, fr("summer", 0.15), at("winter"))); callout("grow", t, fr("summer", 0.55), at("winter"), V(0, TIPY * (1 + g), 0), 760, 560); hudShow("exag", win(t, fr("summer", 0.45), at("winter")));
  } else if (t < at("sun")) { // winter: grey, cold, it shrinks back
    sunAt(0.3); skyU.uGrey.value = 1; H.key.intensity = 1.2; H.hemi.intensity = 0.9; scene.fog.color.set(0xc6cdd4); scene.fog.density = FOG.d * 1.8;
    const g = lerp(0.15, -0.05, ease(prog(t, at("winter"), fr("winter", 0.8)))) * 100 / 300; setBend(V(0, 0), g);
    move(t, at("winter"), at("sun"), [V(340, 120, 560), V(0, 170, 0), 34], [V(320, 115, 520), V(0, 165, 0), 34], 0.3);
    hudShow("season", win(t, at("winter"), at("sun"))); H.$("seaT").textContent = "WINTER · −10 °C"; H.$("seaT").style.color = "#9fd4ff";
    callout("shrink", t, fr("winter", 0.3), at("sun"), V(0, TIPY * (1 + g), 0), 760, 560); hudShow("exag", win(t, at("winter"), at("sun")));
  } else if (t < at("lean")) { // the thermal camera: the sun side glows hot, the shade side stays cool
    sunAt(0.55); dayLook(); const k = smooth(prog(t, at("sun"), fr("sun", 0.35))); thermal(k, sunH()); H.bloom.strength = 0.35;
    const sh2 = sunH(); const side = V(-sh2.z, 0, sh2.x);
    move(t, at("sun"), at("lean"), [side.clone().multiplyScalar(420).add(V(0, 140, 0)), V(0, 140, 0), 36], [side.clone().multiplyScalar(380).add(sh2.clone().multiplyScalar(-120)).add(V(0, 150, 0)), V(0, 150, 0), 36], 0.3);
    hudShow("tleg", win(t, fr("sun", 0.2), at("lean"))); callout("hot", t, fr("sun", 0.35), at("lean"), sh2.clone().multiplyScalar(halfW(120)).add(V(0, 120, 0)), 760, 700); callout("cold", t, fr("sun", 0.55), at("lean"), sh2.clone().multiplyScalar(-halfW(120)).add(V(0, 120, 0)), 300, 900);
  } else if (t < at("loop")) { // so the top bends away from the sun (×33)
    sunAt(0.55); dayLook(); thermal(1, sunH()); const sh2 = sunH(); const L = sh2.clone().multiplyScalar(-0.18 * EX * ease(prog(t, at("lean"), fr("lean", 0.7))));
    setBend(V(L.x, L.z), 0); const side = V(-sh2.z, 0, sh2.x);
    move(t, at("lean"), at("loop"), [side.clone().multiplyScalar(460).add(V(0, 170, 0)), V(0, 170, 0), 34], [side.clone().multiplyScalar(430).add(V(0, 180, 0)), V(0, 190, 0), 34], 0.2);
    callout("lean", t, fr("lean", 0.3), at("loop"), V(L.x, TIPY, L.z), 760, 420); hudShow("exag", win(t, at("lean"), at("loop")));
  } else if (t < at("parts")) { // from above the summit: the sun crosses the sky, the top draws its curve
    camRange(5, 70000); const k = prog(t, at("loop"), at("parts")); const az = lerp(-0.4, Math.PI + 0.4, k) + Math.atan2(SUN_NOON.z, SUN_NOON.x) - Math.PI / 2;
    const el = Math.sin(k * Math.PI); SUN.set(Math.cos(az) * Math.cos(el * 0.9), 0.25 + 0.6 * el, Math.sin(az) * Math.cos(el * 0.9)).normalize(); skyU.uMix.value = el; dayLook();
    const lean = (s) => { const a2 = lerp(-0.4, Math.PI + 0.4, s) + Math.atan2(SUN_NOON.z, SUN_NOON.x) - Math.PI / 2, e2 = Math.sin(s * Math.PI); return V(-Math.cos(a2), 0, -Math.sin(a2)).multiplyScalar(0.18 * EX * (0.3 + 0.7 * e2)); };
    const L = lean(k); setBend(V(L.x, L.z), 0); TRAIL.visible = true;
    for (let i = 0; i < TRAIL_N; i++) { const s = Math.min(k, (i / (TRAIL_N - 1)) * k); const p = lean(s); trailP.set([p.x, TIPY + 1, p.z], i * 3); } TRAIL.geometry.attributes.position.needsUpdate = true;
    move(t, at("loop"), at("parts"), [V(40, TIPY + 70, 60), V(0, TIPY - 20, 0), 34], [V(30, TIPY + 60, 45), V(0, TIPY - 20, 0), 34], 0.2);
    callout("loop", t, fr("loop", 0.4), at("parts"), V(L.x, TIPY + 1, L.z), 760, 1150); hudShow("exag", win(t, at("loop"), at("parts")));
  } else if (t < at("rivets")) { // 18,038 parts: fly through the lattice
    sunAt(0.6); dayLook(); keyShadow(V(0, 160, 0), 60);
    move(t, at("parts"), at("rivets"), [V(halfW(150) + 30, 120, 30), V(0, 175, 0), 40], [V(halfW(170) + 6, 172, 8), V(0, 200, 0), 44], 0.4);
    setBig(Math.round(18038 * ease(prog(t, at("parts") + 0.1, fr("parts", 0.45)))).toLocaleString("en-US"), "IRON PARTS"); hudShow("big", win(t, at("parts") + 0.2, at("rivets")));
  } else if (t < at("cool")) { // 2.5 million rivets: a real joint up on the tower, Paris below; then one, red-hot, set and hammered
    RV.visible = true; sunAt(0.6); dayLook(); keyShadow(RV.position.clone(), 2); camRange(0.01, 70000); H.bloom.strength = 0.18;
    H.bokeh.enabled = true; H.bokeh.uniforms.aperture.value = 0.0012; H.bokeh.uniforms.maxblur.value = 0.006;
    const inHot = t >= at("hot"); rivet.visible = inHot; holeM.visible = !inHot || prog(t, at("hot"), at("cool")) < 0.3;
    if (!inHot) { setBig((2.5 * ease(prog(t, at("rivets") + 0.1, fr("rivets", 0.35)))).toFixed(1) + " million", "RIVETS"); hudShow("big", win(t, at("rivets") + 0.1, at("hot")));
      tongs.visible = false; hammer.visible = false; sparks.visible = false; forgeL.intensity = 0;
      move(t, at("rivets"), at("hot"), [RP(0.75, -0.6, 0.85), RP(0.1, -0.2, 0), 34], [RP(0.55, 0.3, 0.8), RP(0.05, 0.1, 0), 34], 0.02); H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(RP(0.1, 0, 0)); }
    else { const k = prog(t, at("hot"), at("cool")); const ins = ease(clamp(k / 0.3));
      rivet.position.copy(HOLE).add(V(0.25 * (1 - ins), 0.04 * (1 - ins), 0.12 * (1 - ins))); rivetMat.emissiveIntensity = 1.1; forgeL.intensity = 0.15;
      tongs.visible = k < 0.4; tongs.position.copy(rivet.position).add(V(0, 0, 0.05)); tongs.rotation.y = 0.0;
      const hk = clamp((k - 0.42) / 0.5), strike = k > 0.42 ? Math.max(0, Math.sin((k - 0.42) * 38)) : 0; hammer.visible = k > 0.38;
      hammer.position.copy(HOLE).add(V(0, 0, 0.05 + 0.12 * (1 - strike))); headTop.scale.set(1 + 0.22 * hk, 1 + 0.22 * hk, 1 - 0.3 * hk);
      const sp = sparks.geometry.attributes.position; for (let i = 0; i < 120; i++) { const a = hash(i) * TAU, s = ((k * 6 + hash(i + 1)) % 1) * 0.07; sp.setXYZ(i, HOLE.x + Math.cos(a) * s, HOLE.y + Math.sin(a) * s * 0.6 - s * s * 3, HOLE.z + 0.07 + s * 0.3); } sp.needsUpdate = true; sparks.visible = strike > 0.6;
      move(t, at("hot"), at("cool"), [RP(0.78, 0.3, 0.62), RP(0.1, 0, 0.02), 30], [RP(0.68, 0.26, 0.56), RP(0.11, 0, 0.02), 30], 0.01); H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(RP(0.12, 0, 0.02));
      callout("rivet", t, fr("hot", 0.2), at("cool"), RP(HOLE.x, HOLE.y, HOLE.z + 0.06), 760, 1150); }
  } else if (t < at("wind")) { // it cools, shrinks, and clamps the plates together
    RV.visible = true; sunAt(0.65); dayLook(); keyShadow(RV.position.clone(), 2); camRange(0.01, 70000); H.bloom.strength = 0.18;
    H.bokeh.enabled = true; H.bokeh.uniforms.aperture.value = 0.0012; H.bokeh.uniforms.maxblur.value = 0.006;
    rivet.visible = true; holeM.visible = false; tongs.visible = false; hammer.visible = false; sparks.visible = false; rivet.position.copy(HOLE); headTop.scale.set(1.22, 1.22, 0.7);
    const k = prog(t, at("cool"), at("wind")); rivetMat.emissiveIntensity = 1.1 * Math.pow(1 - k, 2.2); forgeL.intensity = 0.15 * (1 - k);
    move(t, at("cool"), at("wind"), [RP(-0.42, 0.28, 0.6), RP(0.1, 0, 0.02), 30], [RP(-0.36, 0.24, 0.54), RP(0.1, 0, 0.02), 30], 0.01); H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(RP(0.12, 0, 0.02));
    callout("clamp", t, fr("cool", 0.3), at("wind"), RP(HOLE.x, HOLE.y, HOLE.z + 0.03), 760, 1150);
  } else if (t < at("curve")) { // the open lattice: the wind passes through; the top sways ≈ 9 cm (×33)
    sunAt(0.8); dayLook(); const sw = 0.09 * EX * Math.sin(t * 1.6); setBend(V(sw, 0), 0);
    move(t, at("wind"), at("curve"), [V(240, 90, 300), V(0, 150, 0), 38], [V(210, 100, 260), V(0, 170, 0), 38], 0.3);
    callout("wind", t, fr("wind", 0.1), fr("wind", 0.55), V(-30, 90, 10), 300, 1150); callout("sway", t, fr("wind", 0.55), at("curve"), V(sw, TIPY, 0), 760, 420); hudShow("exag", win(t, fr("wind", 0.5), at("curve")));
  } else if (t < at("orbi")) { // the curve of the four legs: wind arrows hit the tower and flow down the curved edges into the ground
    sunAt(0.82); dayLook(); setBend(V(0, 0), 0); CURVE.visible = true; H.bloom.strength = 0.5;
    GUSTS.forEach((m, i) => (m.material.uniforms.uP.value = smooth(prog(t, at("curve") + i * 0.35, fr("curve", 0.6) + i * 0.35))));
    EDGES.forEach((m) => (m.material.uniforms.uP.value = smooth(prog(t, fr("curve", 0.4), fr("curve", 0.85)))));
    move(t, at("curve"), at("orbi"), [V(0, 140, 560), V(0, 150, 0), 40], [V(0, 150, 500), V(0, 155, 0), 40], 0.25);
    callout("curve", t, fr("curve", 0.45), at("orbi"), V(halfW(F1), F1, halfW(F1)), 760, 1150);
  } else { // ORBI on a Paris balcony
    sunAt(0.9); dayLook(); OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); orbiL.intensity = 0.4; OR.updateMatrixWorld();
    const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const dk = t > at("orbi2") && t < at("orbi3") ? smooth(prog(t, at("orbi2"), fr("orbi2", 0.4))) : 0;
    const ck = t > at("orbi3") ? smooth(prog(t, fr("orbi3", 0.25), fr("orbi3", 0.55))) : 0;
    directBeam.material.opacity = dk; blockX.visible = t > at("orbi3") && t < fr("orbi3", 0.5); cloudMat.opacity = ck; cloudIcon.children.forEach((c) => (c.material.opacity = ck));
    lock.visible = t > fr("orbi3", 0.5); lock.position.copy(cloudIcon.position).add(V(0, 0.6, 0)); lock.rotation.y = t;
    screen(lap, { msg: dk > 0 ? "SAME WI-FI · SENDING DIRECT" : ck > 0 ? "ENCRYPTED · VIA THE CLOUD" : "", col: dk > 0 ? green : "#8fd0ff" }, drawLap);
    screen(ph, { got: dk > 0 ? Math.round(clamp(prog(t, at("orbi2"), at("orbi3"))) * 20) / 20 : ck > 0 ? Math.round(clamp(prog(t, fr("orbi3", 0.5), at("end"))) * 20) / 20 : 0 }, drawPhone);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.4, 2.0, 9), OW(0.4, 1.2, 0), 36], [OW(0.3, 1.8, 7.2), OW(0.4, 1.0, 0), 36], 0.3);
    else if (t < at("orbi3")) { move(t, at("orbi2"), at("orbi3"), [OW(0.6, 2.6, 6.2), OW(0.6, 1.0, 0.4), 36], [OW(0.6, 2.5, 5.6), OW(0.6, 1.0, 0.4), 36], 0.2); callout("direct", t, fr("orbi2", 0.3), at("orbi3"), OW(0.6, 2.0, 0.6), 760, 560); }
    else if (t < fr("orbi3", 0.6)) { move(t, at("orbi3"), fr("orbi3", 0.6), [OW(0.7, 3.4, 7.6), OW(0.7, 2.2, 0.4), 38], [OW(0.7, 3.3, 7.0), OW(0.7, 2.2, 0.4), 38], 0.2); callout("cloud", t, fr("orbi3", 0.3), fr("orbi3", 0.6), OW(0.7, 4.3, 0.45), 760, 560); }
    else { // the phone's screen, readable: received
      const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, fr("orbi3", 0.6), at("end"), [OW(...pc.clone().addScaledVector(pn, 3.3).addScaledVector(up2, -0.15).toArray()), OW(...pc.toArray()), 34], [OW(...pc.clone().addScaledVector(pn, 2.9).addScaledVector(up2, -0.12).toArray()), OW(...pc.toArray()), 34], 0.03);
      directBeam.material.opacity = 0; cloudMat.opacity = 0; cloudIcon.visible = false; lock.visible = false; blockX.visible = false;
      H.cam.up.copy(up2.clone().transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); hudShow("chips", win(t, fr("orbi3", 0.65), at("end"))); }
  }
});
await H.ready();
