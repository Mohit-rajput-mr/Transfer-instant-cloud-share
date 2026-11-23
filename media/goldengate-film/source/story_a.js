// Do you know each Golden Gate main cable is 27,572 steel wires? HD film on kit/hd.js (9:16).
// Real scale (metres, goldengate.org design stats): towers 227 m above water, legs 10 × 16 m at the base, main span 1,280 m,
// side spans 343 m, roadway 67 m above high water, two main cables 0.92 m thick (61 strands, 27,572 wires of 4.9 mm),
// suspender ropes every 15.2 m (50 ft), stiffening truss under the deck, anchorages of 60,000 tons. Deck built to move
// 3.3 m down / 1.8 m up (heat + traffic): shown exaggerated + labelled. Sunrise fog rolling through the towers over
// a Pacific swell (Gerstner waves). Colour: International Orange.
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

// ---------- sunrise sky (Poly Haven "Qwantani sunrise", CC0: sun at u 0.606, 9° up), sea fog ----------
const SUN = (() => { const a = (0.6064 - 0.5) * TAU, e = THREE.MathUtils.degToRad(9.2); return V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).normalize(); })();
H.key.color.set(0xffd9b0); H.hemi.color.set(0xc4d4ea); H.hemi.groundColor.set(0x3a4038);
const FOG = { c: new THREE.Color(0xc9ccd0), d: 0.00028 };
scene.fog = new THREE.FogExp2(FOG.c.getHex(), FOG.d);
const skyTex = tex("kit/ph/qwantani_sunrise_puresky/sky_4k.jpg", true); skyTex.wrapS = THREE.RepeatWrapping; skyTex.repeat.set(1, 1);
const skyU = { uSky: { value: skyTex }, uSun: { value: SUN } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
      vec3 c = texture2D(uSky, uv).rgb; if (d.y < 0.0) c = vec3(0.55, 0.58, 0.6);
      c += vec3(1.0, 0.8, 0.55) * pow(max(dot(d, uSun), 0.0), 1400.0) * 4.0;
      gl_FragColor = vec4(c, 1.0); }` }));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// ---------- the Pacific: ocean shader on a Gerstner-wave mesh (swell from the west) ----------
const waterN = (() => { const N = 256, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N); H.reseed(5);
  const W2 = Array.from({ length: 24 }, () => ({ kx: Math.round((H.rnd() - 0.5) * 14), ky: Math.round((H.rnd() - 0.5) * 14), ph: H.rnd() * TAU, a: 0.4 + H.rnd() })); const hh = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const q of W2) { const k = Math.hypot(q.kx, q.ky) || 1; v += (q.a / k) * Math.sin(((q.kx * x + q.ky * y) / N) * TAU + q.ph); } hh[y * N + x] = v; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = hh[y * N + (x + 1) % N] - hh[y * N + (x + N - 1) % N], dy = hh[((y + 1) % N) * N + x] - hh[((y + N - 1) % N) * N + x]; const n = V(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * N + x) * 4;
    im.data[i] = (n.x * 0.5 + 0.5) * 255; im.data[i + 1] = (n.y * 0.5 + 0.5) * 255; im.data[i + 2] = (n.z * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const WAVES = [[1, 0.15, 85, 0.9], [0.9, -0.35, 52, 0.55], [0.95, 0.4, 31, 0.35], [0.7, -0.7, 19, 0.22], [0.98, 0.1, 11, 0.12], [0.5, 0.85, 7, 0.07]].map(([x, z, L, a]) => { const n = Math.hypot(x, z); return new THREE.Vector4(x / n, z / n, L, a); });
const seaGeo = (() => { const g = new THREE.PlaneGeometry(14000, 14000, 360, 360); return g; })();
const sea = new Water(seaGeo, { textureWidth: 512, textureHeight: 512, waterNormals: waterN, sunDirection: SUN.clone(), sunColor: 0xffe0b8, waterColor: 0x14323c, distortionScale: 3.2, fog: true });
sea.rotation.x = -Math.PI / 2; scene.add(sea); sea.frustumCulled = false;
{ const m = sea.material; m.uniforms.uW = { value: WAVES }; m.uniforms.uWT = { value: 0 };
  m.vertexShader = m.vertexShader.replace("varying vec4 worldPosition;", "varying vec4 worldPosition; uniform vec4 uW[6]; uniform float uWT;")
    .replace(`mirrorCoord = modelMatrix * vec4( position, 1.0 );
					worldPosition = mirrorCoord.xyzw;`, `vec4 wp = modelMatrix * vec4( position, 1.0 ); vec3 b = wp.xyz;
					float fade = 1.0 / (1.0 + length(b.xz - cameraPosition.xz) / 1500.0);
					for (int i = 0; i < 6; i++) { vec2 d = uW[i].xy; float k = 6.2831853 / uW[i].z, a = uW[i].w * fade, c = sqrt(9.81 / k); float f = k * (dot(d, b.xz) - c * uWT); float Q = 0.5 / (k * a * 6.0 + 1e-4);
						wp.x += Q * a * d.x * cos(f); wp.z += Q * a * d.y * cos(f); wp.y += a * sin(f); }
					mirrorCoord = wp; worldPosition = wp;`).replace("vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );", "vec4 mvPosition = viewMatrix * worldPosition;");
  m.needsUpdate = true; }

// ---------- the headlands: Marin to the north, the Presidio to the south ----------
const LAND = new THREE.Group(); scene.add(LAND);
const rockT = (n, srgb, r) => tex(`kit/ph/rock_face/rock_face_${n}_1k.jpg`, srgb, r, r);
const grassT = (n, srgb, r) => tex(`kit/ph/aerial_grass_rock/aerial_grass_rock_${n}_2k.jpg`, srgb, r, r);
function hills(z0, z1, maxH, seed) { const g = new THREE.PlaneGeometry(6000, Math.abs(z1 - z0), 200, 80); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), zl = p.getZ(i), z = (z0 + z1) / 2 + zl; const fromWater = Math.abs(z) - 1000; const n = Math.sin(x * 0.0023 + seed) * 0.5 + Math.sin(x * 0.007 + z * 0.004 + seed * 2) * 0.3 + Math.sin(x * 0.019 - z * 0.011) * 0.12;
    let y = Math.max(0, fromWater) * 0.35 * (0.6 + 0.4 * n) + n * 25; y = Math.min(y, maxH * (0.75 + 0.25 * n)); if (fromWater < 0) y = -8 + fromWater * 0.2; p.setY(i, y); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: grassT("diff", true, 60), normalMap: grassT("nor_gl", false, 60), roughness: 1, color: 0xc2b48e })); m.position.z = (z0 + z1) / 2; m.receiveShadow = true; LAND.add(m); return m; }
hills(900, 3600, 300, 1); hills(-3600, -900, 120, 4);
// a few city blocks on the San Francisco side (Presidio edge, far)
{ const B = []; for (let i = 0; i < 900; i++) { const x = (hash(i) - 0.5) * 5000, z = -1500 - hash(i + 3) * 2500; B.push([x, z, 14 + hash(i + 5) * 20, 14 + hash(i + 7) * 20, 8 + hash(i + 9) * 18]); }
  const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0); const im = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.9 }), B.length); const m4 = new THREE.Matrix4();
  B.forEach(([x, z, w, d, h], i) => { m4.makeScale(w, h, d).setPosition(x, 20 + Math.max(0, (-z - 1000)) * 0.03, z); im.setMatrixAt(i, m4); }); im.castShadow = true; LAND.add(im); }

// =====================================================================================================================
// THE BRIDGE
// =====================================================================================================================
const ZT = 640, ZA = ZT + 343, DECK = 67, TOWER_H = 227, CX = 13.7, SAG = 143;   // towers at z = ±640, anchorages at ±983
const ORANGE = new THREE.Color(0xc0362c);                                         // International Orange
const orangeMat = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.55, metalness: 0.25 });
const BRIDGE = new THREE.Group(); scene.add(BRIDGE);
let sagNow = SAG;                                                                  // main-span sag (changes with heat, shown exaggerated)
const cableY = (z) => { const az = Math.abs(z); if (az <= ZT) { const u = z / ZT; return TOWER_H - 2 - sagNow * (1 - u * u); } const u = (az - ZT) / (ZA - ZT); return lerp(TOWER_H - 2, DECK + 6, u) - 18 * Math.sin(Math.PI * u); };
const deckDrop = (z) => (Math.abs(z) <= ZT ? (sagNow - SAG) * (1 - (z / ZT) ** 2) * 0.6 : 0);  // the deck follows the cable at midspan
// towers: two tapering legs (10 × 16 m → 6 × 9 m), recessed ribs, portal struts
function tower(z) { const g = new THREE.Group(); g.position.z = z; BRIDGE.add(g);
  for (const s of [-1, 1]) { const leg = new THREE.Group(); leg.position.x = s * CX; g.add(leg);
    const tiers = [[0, 60, 10, 16, 9, 14.5], [60, 120, 9, 14.5, 8, 12.5], [120, 170, 8, 12.5, 7, 10.8], [170, 205, 7, 10.8, 6.4, 9.6], [205, TOWER_H, 6.4, 9.6, 6, 9]];
    for (const [y0, y1, w0, d0, w1, d1] of tiers) { const geo = new THREE.CylinderGeometry(1, 1, y1 - y0, 4, 1); geo.rotateY(Math.PI / 4); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const top = p.getY(i) > 0; const w = (top ? w1 : w0) / Math.SQRT2, d = (top ? d1 : d0) / Math.SQRT2; p.setX(i, p.getX(i) * w); p.setZ(i, p.getZ(i) * d); }
      geo.computeVertexNormals(); const m = sh(new THREE.Mesh(geo, orangeMat)); m.position.y = (y0 + y1) / 2; leg.add(m);
      for (const r of [-0.32, 0, 0.32]) { const rib = sh(new THREE.Mesh(new THREE.BoxGeometry(0.5, y1 - y0, 0.5), orangeMat)); rib.position.set(-s * (w0 + w1) / 4 - s * 0.15, (y0 + y1) / 2, r * (d0 + d1) / 2); leg.add(rib); } } }
  for (const [y, hgt] of [[DECK - 9, 6], [DECK + 32, 8], [DECK + 70, 9], [DECK + 108, 10], [TOWER_H - 10, 12]]) { const s2 = sh(new THREE.Mesh(new THREE.BoxGeometry(CX * 2 - 6, hgt, 7), orangeMat)); s2.position.y = y; g.add(s2);
    if (y > DECK) for (const xx of [-6, 0, 6]) { const fin = sh(new THREE.Mesh(new THREE.BoxGeometry(1.2, hgt - 1.5, 7.6), orangeMat)); fin.position.set(xx, y, 0); g.add(fin); } }
  const pier = sh(new THREE.Mesh(new THREE.BoxGeometry(46, 14, 36), new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.9, map: tex("kit/ph/concrete_wall_008/concrete_wall_008_diff_1k.jpg", true, 4, 1) }))); pier.position.y = 0; g.add(pier);
  return g; }
const TOWERS = [tower(-ZT), tower(ZT)];
// main cables (rebuilt when the sag changes), suspender ropes, the deck + stiffening truss
const cableMat = new THREE.MeshStandardMaterial({ color: ORANGE.clone().multiplyScalar(0.95), roughness: 0.5, metalness: 0.3 });
const CABLES = [-1, 1].map((s) => { const m = sh(new THREE.Mesh(new THREE.BufferGeometry(), cableMat)); m.userData.s = s; BRIDGE.add(m); return m; });
const SUSP = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 6), orangeMat, 2 * 2 * Math.floor((2 * ZA) / 15.24) + 8); SUSP.frustumCulled = false; BRIDGE.add(SUSP);
const DECKG = new THREE.Group(); BRIDGE.add(DECKG);
const roadT = H.canvasTex(512, 2048, (g, w, h) => { g.fillStyle = "#3a3c3f"; g.fillRect(0, 0, w, h); H.reseed(3); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${60 + H.rnd() * 40},${60 + H.rnd() * 40},${62 + H.rnd() * 40},0.5)`; g.fillRect(H.rnd() * w, H.rnd() * h, 2, 2); }
  g.fillStyle = "#e8e2c8"; for (let l = 1; l < 6; l++) for (let y = 0; y < h; y += 64) g.fillRect(l * w / 6 - 2, y, 4, 32); g.fillStyle = "#d9c34a"; g.fillRect(w / 2 - 3, 0, 6, h); });
roadT.wrapS = roadT.wrapT = THREE.RepeatWrapping; roadT.repeat.set(1, 40);
const roadMat = new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.85 });
const TRUSS = [];
function buildDeck() { DECKG.clear(); TRUSS.length = 0;
  const N = 220, zs = Array.from({ length: N + 1 }, (_, i) => lerp(-ZA - 120, ZA + 120, i / N));
  const road = new THREE.BufferGeometry(); const pos = [], uv = [], idx = [];
  zs.forEach((z, i) => { const y = DECK + 0.5 - deckDrop(z); pos.push(-13.5, y, z, 13.5, y, z); uv.push(0, i / N * 40, 1, i / N * 40); });
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  road.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); road.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); road.setIndex(idx); road.computeVertexNormals();
  const rm = new THREE.Mesh(road, roadMat); rm.receiveShadow = true; DECKG.add(rm);
  // two 7.6 m stiffening trusses + bottom chords, panel every 7.6 m
  const beams = []; for (const x of [-CX, CX]) for (let z = -ZA - 120; z < ZA + 120; z += 7.62) { const y0 = DECK - deckDrop(z), y1 = DECK - deckDrop(z + 7.62);
    beams.push([V(x, y0, z), V(x, y1, z + 7.62), 0.6], [V(x, y0 - 7.6, z), V(x, y1 - 7.6, z + 7.62), 0.6], [V(x, y0, z), V(x, y0 - 7.6, z), 0.35], [V(x, y0 - 7.6, z), V(x, y1, z + 7.62), 0.3]); }
  for (let z = -ZA - 120; z < ZA + 120; z += 15.24) { const y = DECK - deckDrop(z) - 7.6; beams.push([V(-CX, y, z), V(CX, y, z), 0.35], [V(-CX, y, z), V(CX, y, z + 15.24), 0.25]); }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), orangeMat, beams.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  beams.forEach(([a, b, th], i) => { const d = b.clone().sub(a); q.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); m4.compose(a.clone().add(b).multiplyScalar(0.5), q, V(th, d.length(), th)); im.setMatrixAt(i, m4); });
  im.castShadow = true; im.frustumCulled = false; DECKG.add(im);
  for (const x of [-14.2, 14.2]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 2 * ZA + 240), orangeMat); rail.position.set(x, DECK + 1.2, 0); DECKG.add(rail); } }
function buildCables() {
  for (const c of CABLES) { const pts = []; for (let i = 0; i <= 320; i++) { const z = lerp(-ZA, ZA, i / 320); pts.push(V(c.userData.s * CX, cableY(z), z)); }
    c.geometry.dispose(); c.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 640, 0.46, 12, false); }
  const m4 = new THREE.Matrix4(); let k = 0;
  for (let z = -ZA + 7.62; z < ZA; z += 15.24) for (const s of [-1, 1]) for (const dx of [-0.25, 0.25]) { const top = cableY(z), bot = DECK + 0.5 - deckDrop(z); if (top - bot < 0.6) continue; m4.makeScale(1, top - bot, 1).setPosition(s * CX + dx, (top + bot) / 2, z); SUSP.setMatrixAt(k++, m4); }
  SUSP.count = k; SUSP.instanceMatrix.needsUpdate = true; }
let builtSag = null;
function setSag(s) { sagNow = s; if (builtSag !== null && Math.abs(builtSag - s) < 0.05) return; builtSag = s; buildCables(); buildDeck(); }
setSag(SAG);
// anchorages: massive concrete blocks where the cables dive in
const ANCH = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.z = s * (ZA + 30); BRIDGE.add(g);
  const blk = sh(new THREE.Mesh(new THREE.BoxGeometry(60, 70, 70), new THREE.MeshStandardMaterial({ color: 0xa29d92, roughness: 0.9, map: tex("kit/ph/concrete_wall_008/concrete_wall_008_diff_1k.jpg", true, 4, 4) }))); blk.position.y = 25; g.add(blk); return g; });
// traffic: cars on the deck (both directions)
const CARS = new THREE.InstancedMesh(new RoundedBoxGeometry(1.8, 1.4, 4.4, 2, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 }), 160); CARS.frustumCulled = false; BRIDGE.add(CARS);
{ const c = new THREE.Color(); for (let i = 0; i < 160; i++) CARS.setColorAt(i, c.setHSL(hash(i), 0.3 + hash(i + 1) * 0.4, 0.25 + hash(i + 2) * 0.45)); }
function traffic(t) { const m4 = new THREE.Matrix4(); for (let i = 0; i < 160; i++) { const dir = i % 2 ? 1 : -1, lane = (i % 6) / 6, sp = 22 + hash(i) * 6; const z = ((hash(i + 4) * 2400 + dir * sp * t) % 2400 + 2400) % 2400 - 1200;
  const x = dir * (2.2 + lane * 9); m4.makeTranslation(x, DECK + 1.2 - deckDrop(z), z); CARS.setMatrixAt(i, m4); } CARS.instanceMatrix.needsUpdate = true; }
// sea fog: soft layers of noise drifting through the towers
const FOGU = { uT: { value: 0 }, uK: { value: 1 } };
const fogMat = new THREE.ShaderMaterial({ uniforms: FOGU, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT, uK; varying vec3 vW;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * n(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){ vec2 p = vW.xz * 0.004 + vec2(uT * 0.02, uT * 0.006); float d = smoothstep(0.5, 0.88, fbm(p + fbm(p * 1.7) * 0.6));
      float edge = smoothstep(0.0, 300.0, 3500.0 - length(vW.xz)); vec3 c = vec3(0.93, 0.91, 0.89);
      vec3 v = vW - cameraPosition; float dist = length(v); float graze = mix(0.3, 1.0, smoothstep(0.03, 0.35, abs(v.y) / dist));
      float nearK = smoothstep(25.0, 220.0, dist);
      gl_FragColor = vec4(c, d * 0.36 * uK * edge * graze * nearK); }` });
const FOGL = [8, 20, 34, 50].map((y, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), fogMat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 5 + i; scene.add(m); return m; });
