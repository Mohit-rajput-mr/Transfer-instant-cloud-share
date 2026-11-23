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
