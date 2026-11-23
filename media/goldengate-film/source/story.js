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

// =====================================================================================================================
// THE CABLE CUTAWAY (its own set): 0.92 m cable → 61 strands → 27,572 wires of 4.9 mm, hex-packed and compacted
// =====================================================================================================================
const CC = new THREE.Group(); CC.position.set(20000, 0, 0); scene.add(CC); CC.visible = false;
const R_CABLE = 0.46, R_WIRE = 0.00244;
const strandCentres = (() => { const P = [[0, 0]]; const r1 = 0.1; for (let ring = 1; ring <= 4; ring++) for (let k = 0; k < 6 * ring; k++) { const a = (k / (6 * ring)) * Math.PI * 2 + ring * 0.3; P.push([Math.cos(a) * ring * r1, Math.sin(a) * ring * r1]); } return P; })();   // 1+6+12+18+24 = 61 strands
const R_STRAND = 0.052;
// the outer cable: wrapping + bands, cut open at the end with a clipping plane so the strands show
const ccClip = new THREE.Plane(V(0, 0, -1), 0);
const wrapMat = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.55, metalness: 0.2, clippingPlanes: [ccClip] });
const ccCable = sh(new THREE.Mesh(new THREE.CylinderGeometry(R_CABLE, R_CABLE, 6, 64, 1, true), wrapMat)); ccCable.rotation.x = Math.PI / 2; ccCable.position.z = -3; CC.add(ccCable);
for (let z = -5.5; z < 0; z += 1.2) { const band = sh(new THREE.Mesh(new THREE.CylinderGeometry(R_CABLE + 0.03, R_CABLE + 0.03, 0.35, 64), metal(0x8a2a22, 0.4))); band.rotation.x = Math.PI / 2; band.position.z = z; CC.add(band); }
// strands: 61 bundles that stick out of the cut a little, each a bundle of hex-packed wires
const STR = new THREE.Group(); CC.add(STR);
const wireMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 0.95, roughness: 0.28 });
const strandMat = new THREE.MeshStandardMaterial({ color: 0xaeb3b8, metalness: 0.9, roughness: 0.35 });
const wirePos = (() => { const P = []; const d = R_WIRE * 1.94; for (let r = 0; r < 16; r++) { if (r === 0) { P.push([0, 0]); continue; } for (let k = 0; k < 6; k++) for (let j = 0; j < r; j++) { const a0 = k * Math.PI / 3, a1 = (k + 1) * Math.PI / 3; const u = j / r; P.push([lerp(Math.cos(a0), Math.cos(a1), u) * r * d, lerp(Math.sin(a0), Math.sin(a1), u) * r * d]); } }
  return P.sort((p, q) => Math.hypot(...p) - Math.hypot(...q)).slice(0, 452); })();   // 452 wires per strand, packed round
const WIRES = new THREE.InstancedMesh(new THREE.CylinderGeometry(R_WIRE * 0.95, R_WIRE * 0.95, 1, 10), wireMat, 61 * 452); WIRES.frustumCulled = false; CC.add(WIRES);
// seizing bands that hold each strand together near the cut
const STRANDS = new THREE.InstancedMesh(new THREE.CylinderGeometry(R_STRAND * 1.06, R_STRAND * 1.06, 0.025, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x6a6e73, metalness: 0.85, roughness: 0.45, side: THREE.DoubleSide }), 61); STRANDS.frustumCulled = false; CC.add(STRANDS);
function setStrands(out = 0.25) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2); let k = 0;
  const sp = 1 + out * 0.04;   // strands fan apart a little when cut, then compact
  strandCentres.forEach(([sx0, sy0], i) => { const sx = sx0 * sp, sy = sy0 * sp, ext = out * (0.6 + 0.4 * hash(i)); m4.compose(V(sx, sy, ext - 0.06), q, V(1, 1, 1)); STRANDS.setMatrixAt(i, m4);
    for (const [wx, wy] of wirePos) { const tip = ext + 0.004 + 0.012 * hash(k * 0.37), L = 6 + tip; m4.compose(V(sx + wx, sy + wy, tip - L / 2), q, V(1, L, 1)); WIRES.setMatrixAt(k++, m4); } });
  STRANDS.instanceMatrix.needsUpdate = true; WIRES.instanceMatrix.needsUpdate = true; }
setStrands();
const ccKey = new THREE.DirectionalLight(0xffe8cc, 2.4); ccKey.position.set(2, 3, 4); CC.add(ccKey, ccKey.target); const ccRim = new THREE.DirectionalLight(0x9fc0ff, 1.2); ccRim.position.set(-3, 1, -2); CC.add(ccRim);

// =====================================================================================================================
// LOAD PATH: glowing arrows from a truck at midspan → deck → suspenders → cable → towers → sea floor, and → anchorages
// =====================================================================================================================
const TRUCK = new THREE.Group(); BRIDGE.add(TRUCK);
{ const cab = sh(new THREE.Mesh(new RoundedBoxGeometry(2.5, 3.0, 2.6, 2, 0.3), paint(0xe8e6e0, 0.4))); cab.position.set(0, 1.9, 6.4); TRUCK.add(cab);
  const box = sh(new THREE.Mesh(new RoundedBoxGeometry(2.6, 3.4, 11, 2, 0.2), paint(0xcfd3d8, 0.5))); box.position.set(0, 2.1, 0); TRUCK.add(box);
  for (const z of [-4, 0, 5.8]) for (const x of [-1.25, 1.25]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), matte(0x111111, 0.8)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); TRUCK.add(w); } }
TRUCK.position.set(-5, DECK + 0.5, 0);
const flowMat = (col) => new THREE.ShaderMaterial({ uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(col).multiplyScalar(2.2) } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uP; uniform vec3 uC; varying float vU; void main(){ float on = step(vU, uP); float dash = 0.55 + 0.45 * sin((vU - uP) * 160.0); gl_FragColor = vec4(uC * on * dash * (0.4 + 0.6 * smoothstep(uP - 0.15, uP, vU)), 1.0); }` });
const FLOWS = [];
function flow(pts, col, r = 0.9) { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, r, 8), flowMat(col)); m.renderOrder = 20; BRIDGE.add(m); FLOWS.push(m); return m; }
const fDown = flow([V(-5, DECK + 4, 0), V(-5, DECK + 0.6, 0), V(-CX, DECK + 0.6, 0)], 0xffd166, 0.7);
const fSusp = flow([V(-CX, DECK + 0.6, 0), V(-CX, cableY(0), 0)], 0xffd166, 0.7);
const cablePath = (z0, z1, n = 60) => Array.from({ length: n + 1 }, (_, i) => { const z = lerp(z0, z1, i / n); return V(-CX, cableY(z) + 1.2, z); });
const fCableN = flow(cablePath(0, ZT), 0xff8a3d, 1.0), fCableS = flow(cablePath(0, -ZT), 0xff8a3d, 1.0);
const fTowerN = flow([V(-CX, TOWER_H, ZT), V(-CX, 0, ZT), V(-CX, -34, ZT)], 0x3dff8c, 1.4), fTowerS = flow([V(-CX, TOWER_H, -ZT), V(-CX, 0, -ZT), V(-CX, -34, -ZT)], 0x3dff8c, 1.4);
const fAnchN = flow(cablePath(ZT, ZA + 20), 0x6fd0ff, 1.0), fAnchS = flow(cablePath(-ZT, -ZA - 20), 0x6fd0ff, 1.0);
function flows(k) { const set = (m, a, b) => (m.material.uniforms.uP.value = clamp((k - a) / (b - a))); set(fDown, 0, 0.12); set(fSusp, 0.12, 0.25); set(fCableN, 0.25, 0.5); set(fCableS, 0.25, 0.5); set(fTowerN, 0.5, 0.75); set(fTowerS, 0.5, 0.75); set(fAnchN, 0.7, 0.95); set(fAnchS, 0.7, 0.95); for (const m of FLOWS) m.visible = k > 0; }

// =====================================================================================================================
// ORBI: Battery Spencer overlook (north side), the bridge below in the fog
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
OR.position.set(-420, 150, 1250);
const OR_D = V(0, 120, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-OR_D.x, -OR_D.z);
const lock = makeLock(); OR.add(lock);
const wall = sh(new THREE.Mesh(new RoundedBoxGeometry(9, 0.5, 4.2, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x9c968a, roughness: 0.9, map: tex("kit/ph/concrete_wall_008/concrete_wall_008_diff_1k.jpg", true, 2, 1) }))); OR.add(wall); wall.position.set(0.6, -0.35, 0);
lap.g.position.set(-1.2, 0, 0.2); lap.g.rotation.y = 0.35; ph.g.position.set(2.2, 0.06, 0.6); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.25);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); OR.add(orbiL);
const PARTS = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.085, 0.025, 2, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.0, 0.55).multiplyScalar(1.1), toneMapped: false })); OR.add(m); return m; });
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.up >= 0) { g.fillStyle = "rgba(8,10,14,.88)"; rr(g, 60, 690, 860, 170, 26); g.fill(); g.fillStyle = "#fff"; g.font = "700 32px M"; g.fillText("golden-gate-timelapse.mov  ·  20 GB", 96, 742);
    for (let i = 0; i < 16; i++) { const k = clamp(st.up * 16 - i); g.fillStyle = st.retry === i ? "#ff8a3d" : k >= 1 ? green : "rgba(255,255,255,.12)"; rr(g, 96 + i * 50, 772, 42, 46, 8); g.fill(); if (k > 0 && k < 1 && st.retry !== i) { g.fillStyle = green; rr(g, 96 + i * 50, 772, 42 * k, 46, 8); g.fill(); } }
    g.fillStyle = st.retry >= 0 ? "#ff8a3d" : green; g.font = "700 28px M"; g.fillText(st.retry >= 0 ? "1 PART RE-SENT · THE REST KEEP GOING" : `${Math.round(st.up * 100)}%  ·  UP TO 8 AT ONCE`, 96, 846); } }
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (st.got > 0) { g.fillStyle = "rgba(8,10,14,.88)"; rr(g, 90, 1220, 600, 120, 30); g.fill(); g.fillStyle = green; g.font = "700 34px M"; g.fillText(st.got >= 1 ? "✓ RECEIVED · 20 GB" : `RECEIVING ${Math.round(st.got * 100)}%`, 130, 1295); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  tower: ["227 m", "#3dff8c", "tower above the water"], span: ["1,280 m", "#3dff8c", "of road between the towers"], deck: ["The deck", "#ffd166", "hangs, it doesn't rest"],
  truck: ["Truck", "#ffd166", "its weight goes into the deck"], susp: ["Suspender ropes", "#ffd166", "every 15 m"], cable: ["Main cable", "#ff8a3d", "carries it all"],
  push: ["Towers push down", "#3dff8c", "into the sea floor"], anch: ["Anchorage", "#6fd0ff", "60,000 tons each"], wrap: ["0.92 m thick", "#ff8a3d", "one main cable"],
  strand: ["61 strands", "#cfd6dd", "bundles of wire"], wire: ["Wire", "#cfd6dd", "4.9 mm thick"], sag: ["Midspan", "#ff8a3d", "moves with heat"],
});
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 170px/0.85 D;font-stretch:112%;color:#ff8a3d;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 44px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MOTION EXAGGERATED</div>`, { left: "330px", top: "1110px" });
hudEl("therm", `<div style="width:1080px;text-align:center"><span id="thT" style="display:inline-block;padding:16px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #ff8a3d;font:900 50px D;color:#ff8a3d">HOT · CABLES STRETCH</span></div>`, { left: "0px", top: "1430px" });
hudEl("range", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["DOWN", "3.3 m", "#ff8a3d"], ["UP", "1.8 m", "#6fd0ff"]].map(([a, b, c]) => `<div style="padding:18px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;color:${c}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("orange", `<div style="width:1080px;text-align:center"><span style="display:inline-block;padding:18px 34px;border-radius:24px;background:rgba(8,10,16,.82);border:1.5px solid #c0362c;font:900 54px D;color:#ff6a4d">INTERNATIONAL ORANGE</span></div>`, { left: "0px", top: "1430px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["MANY PARTS", "UP TO 8 AT ONCE", "NO LOGIN"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ff8a3d") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
function dayLook() { H.key.intensity = 2.6; H.hemi.intensity = 0.85; H.envK.value = 0.3; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.2; H.rimB.intensity = 0.4; }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const CP = (x, y, z) => CC.position.clone().add(V(x, y, z));

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
H.frame("Many parts, carrying it together", async (t) => {
  dayLook(); camRange(0.5, 70000); sky.visible = true; sea.visible = true; LAND.visible = true; BRIDGE.visible = true; CC.visible = false; OR.visible = false; for (const f of FOGL) f.visible = true;
  scene.background = null; H.zoom = 1; H.bloom.strength = 0.3; flows(0); TRUCK.visible = false; setSag(SAG); keyShadow(V(0, 100, 0), 700);
  sea.material.uniforms.time.value = t * 0.5; sea.material.uniforms.uWT.value = t; FOGU.uT.value = t; FOGU.uK.value = 1; traffic(t);

  if (t < at("bridge")) { // HOOK: sunrise, fog rolling through the south tower; the cable fills the frame
    const c = fr("hook", 0.55);
    if (t < c) { move(t, 0, c, [V(-700, 40, -1500), V(0, 140, -ZT), 30], [V(-520, 70, -1200), V(0, 160, -ZT), 30], 0.5); title(t, fr("hook", 0.03), c, "San Francisco", "Two cables", 150); }
    else { keyShadow(V(-CX, cableY(-300), -300), 90); move(t, c, at("bridge"), [V(-CX - 7, cableY(-250) - 1, -250), V(-CX, cableY(-420), -420), 44], [V(-CX - 5, cableY(-270) + 1, -270), V(-CX, cableY(-460), -460), 40], 0.4);
      setBig(Math.round(27572 * ease(prog(t, c, at("bridge") - 0.3))).toLocaleString("en-US"), "WIRES IN ONE CABLE"); hudShow("big", win(t, c + 0.2, at("bridge"))); }
  } else if (t < at("hang")) { // the whole bridge, drone rising past a tower
    move(t, at("bridge"), at("hang"), [V(-620, 170, -1500), V(0, 120, -100), 38], [V(-480, 290, -1350), V(0, 110, -100), 38], 0.4);
    callout("tower", t, fr("bridge", 0.1), fr("bridge", 0.55), V(0, TOWER_H, -ZT), 300, 420); callout("span", t, fr("bridge", 0.5), at("hang"), V(0, DECK + 2, 0), 760, 1150);
  } else if (t < at("load")) { // under the deck: it hangs
    keyShadow(V(0, DECK, 0), 80); move(t, at("hang"), at("load"), [V(-60, DECK - 30, -40), V(0, DECK, 20), 40], [V(-45, DECK - 22, -20), V(0, DECK + 4, 30), 40], 0.4);
    callout("deck", t, fr("hang", 0.3), at("load"), V(0, DECK - 4, 15), 760, 1150);
  } else if (t < at("anchor")) { // the load path: truck → deck → suspenders → cable → towers
    TRUCK.visible = true; const k = t < at("towers") ? 0.5 * prog(t, at("load"), at("towers")) : 0.5 + 0.25 * prog(t, at("towers"), at("anchor")); flows(k); H.bloom.strength = 0.45;
    if (t < at("towers")) { keyShadow(V(0, DECK, 0), 80); move(t, at("load"), at("towers"), [V(-70, DECK + 30, -60), V(-8, DECK + 6, 0), 40], [V(-95, DECK + 60, -110), V(-8, DECK + 30, 0), 42], 0.3);
      callout("truck", t, fr("load", 0.05), fr("load", 0.35), V(-5, DECK + 3, 0), 760, 1050); callout("susp", t, fr("load", 0.35), fr("load", 0.7), V(-CX, DECK + 12, 0), 300, 900); callout("cable", t, fr("load", 0.7), at("towers"), V(-CX, cableY(0), 0), 760, 700); }
    else { move(t, at("towers"), at("anchor"), [V(-520, 90, ZT - 380), V(0, 110, ZT), 40], [V(-470, 70, ZT - 300), V(0, 100, ZT), 40], 0.3); callout("push", t, fr("towers", 0.4), at("anchor"), V(-CX, 40, ZT), 760, 1200); }
  } else if (t < at("cable")) { // anchorage: the cables dive into 60,000 tons of concrete (cross-section)
    flows(0.75 + 0.25 * prog(t, at("anchor"), fr("anchor", 0.6))); keyShadow(V(0, 30, ZA), 120);
    move(t, at("anchor"), at("cable"), [V(260, 150, ZA - 260), V(0, 50, ZA), 40], [V(220, 125, ZA - 200), V(0, 45, ZA + 10), 40], 0.3);
    callout("anch", t, fr("anchor", 0.3), at("cable"), V(0, 40, ZA + 30), 760, 1180);
  } else if (t < at("move")) { // INSIDE THE CABLE: cut, strands, wires; spun across, compacted
    CC.visible = true; BRIDGE.visible = false; LAND.visible = false; sea.visible = false; sky.visible = false; for (const f of FOGL) f.visible = false; scene.background = new THREE.Color(0x0c0e12); scene.fog.density = 0; camRange(0.002, 200);
    H.key.intensity = 0.6; H.hemi.intensity = 0.6; H.envK.value = 0.8; H.bloom.strength = 0.2;
    if (t < at("strands")) { move(t, at("cable"), at("strands"), [CP(1.5, 0.8, 2.2), CP(0, 0, -0.6), 36], [CP(0.9, 0.5, 1.7), CP(0, 0, -0.3), 34], 0.05); callout("wrap", t, fr("cable", 0.3), at("strands"), CP(R_CABLE, 0, -1.5), 760, 1150); }
    else if (t < at("wires")) { move(t, at("strands"), at("wires"), [CP(0.55, 0.35, 1.0), CP(0, 0, 0), 34], [CP(0.35, 0.22, 0.7), CP(0, 0, 0), 32], 0.03);
      setBig("61", "STRANDS"); hudShow("big", win(t, at("strands") + 0.2, at("wires"))); callout("strand", t, fr("strands", 0.2), at("wires"), CP(strandCentres[20][0], strandCentres[20][1], 0.2), 760, 1150); }
    else if (t < at("spin")) { const s0 = strandCentres[3]; move(t, at("wires"), at("spin"), [CP(s0[0] + 0.12, s0[1] + 0.08, 0.45), CP(s0[0], s0[1], 0.2), 30], [CP(s0[0] + 0.05, s0[1] + 0.035, 0.32), CP(s0[0], s0[1], 0.22), 26], 0.01);
      setBig(Math.round(27572 * ease(prog(t, at("wires"), fr("wires", 0.8)))).toLocaleString("en-US"), "WIRES"); hudShow("big", win(t, at("wires") + 0.1, at("spin"))); callout("wire", t, fr("wires", 0.6), at("spin"), CP(s0[0] + wirePos[30][0], s0[1] + wirePos[30][1], 0.3), 760, 1150); }
    else { setStrands(0.25 * (1 - ease(prog(t, at("spin"), fr("spin", 0.8))))); move(t, at("spin"), at("move"), [CP(-0.9, 0.5, 1.6), CP(0, 0, -0.3), 36], [CP(-1.2, 0.7, 2.2), CP(0, 0, -0.6), 36], 0.05); }
  } else if (t < at("orange")) { // heat stretches the cables → the deck sinks; cold → it rises (×1.0 visual metres ×8)
    const ph2 = prog(t, at("move"), at("orange")); const hot = t < fr("move", 0.55); const s = SAG + (hot ? 3.3 : -1.8) * 8 * smooth(clamp(hot ? prog(t, fr("move", 0.1), fr("move", 0.5)) : prog(t, fr("move", 0.6), fr("move", 0.95))));
    setSag(t < at("range") ? s : SAG + (Math.sin((t - at("range")) * 1.6) > 0 ? 3.3 : -1.8) * 8 * Math.abs(Math.sin((t - at("range")) * 1.6)));
    move(t, at("move"), at("orange"), [V(-330, 120, -260), V(0, 95, 60), 40], [V(-310, 118, -230), V(0, 95, 60), 40], 0.2);
    H.$("thT").textContent = hot ? "HOT · CABLES STRETCH" : "COLD · CABLES SHORTEN"; H.$("thT").style.color = hot ? "#ff8a3d" : "#6fd0ff";
    if (t < at("range")) hudShow("therm", win(t, at("move") + 0.2, at("range"))); else hudShow("range", win(t, at("range") + 0.2, at("orange")));
    hudShow("exag", win(t, at("move") + 0.3, at("orange"))); callout("sag", t, fr("move", 0.2), at("orange"), V(0, DECK - deckDrop(0), 0), 760, 1000);
  } else if (t < at("orbi")) { // International Orange in the fog
    FOGU.uK.value = 1.6; move(t, at("orange"), at("orbi"), [V(-300, 75, -900), V(0, 150, -ZT), 30], [V(-260, 82, -820), V(0, 160, -ZT), 30], 0.4);
    hudShow("orange", win(t, fr("orange", 0.15), at("orbi")));
  } else { // ORBI at the Battery Spencer overlook
    OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); orbiL.intensity = 0.5; OR.updateMatrixWorld(); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const up = t < at("orbi2") ? -1 : t < at("orbi3") ? 0.7 * prog(t, at("orbi2"), at("orbi3")) : lerp(0.7, 1, prog(t, fr("orbi3", 0.45), at("end")));
    const retry = t > at("orbi3") && t < fr("orbi3", 0.45) ? 11 : -1;
    screen(lap, { up: up < 0 ? -1 : Math.round(up * 200) / 200, retry }, drawLap); screen(ph, { got: up > 0 ? Math.round(up * 40) / 40 : 0 }, drawPhone);
    const a0 = lap.g.position.clone().add(V(0.2, 1.0, 0.2)), b0 = ph.g.position.clone().add(V(0, 0.2, 0));
    PARTS.forEach((m, i) => { const st = at("orbi2") + Math.floor(i / 8) * 1.1 + (i % 8) * 0.09; const k = clamp((t - st) / 0.9); m.visible = t > at("orbi2") && k > 0 && k < 1;
      m.position.copy(a0).lerp(b0, ease(k)).add(V(0, Math.sin(k * Math.PI) * 0.9, ((i % 8) - 3.5) * 0.09)); m.rotation.set(k * 3, k * 2, 0); });
    lock.visible = false;
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.5, 2.2, 10.5), OW(0.5, 0.9, 0), 40], [OW(0.4, 2.0, 8.6), OW(0.5, 0.8, 0), 40], 0.3);
    else if (t < at("orbi3")) move(t, at("orbi2"), at("orbi3"), [OW(0.2, 3.4, 7.0), OW(0.5, 0.5, 0), 38], [OW(0.4, 3.2, 6.4), OW(0.6, 0.5, 0), 38], 0.2);
    else { move(t, at("orbi3"), at("end"), [OW(-0.4, 2.6, 6.2), OW(0.2, 0.7, 0), 38], [OW(-0.3, 2.4, 5.6), OW(0.2, 0.7, 0), 38], 0.2); hudShow("chips", win(t, fr("orbi3", 0.5), at("end"))); }
  }
});
await H.ready();
