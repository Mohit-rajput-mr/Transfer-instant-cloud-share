// Voyager 1: one light-day. NASA's Voyager 3D model (NASA 3D Resources, "Voyager Probe (B)", free and without copyright).
// Facts: launched 5 September 1977; on 18 November 2026 NASA marked it reaching one light-day from Earth (~25.9 billion km; a
// command takes a day to arrive and the reply another day) — the first human-made object that far. 3.7 m high-gain dish; radio
// transmitter about 22 W. On 14 November 2023 it began sending unreadable data: a single chip holding about 3% of the memory of
// the flight data subsystem (FDS, the computer that packages data for Earth) had failed. The code could not be moved whole (no
// single location was large enough), so engineers split it into sections stored in different places and rewrote the references
// between them. The first relocated code was sent on 18 April 2024; on 20 April engineering data came back, readable, for the
// first time in five months. In April 2024 Voyager 1 was ~24 billion km away (~22.5 h one way).
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "./kit/lib/jsm/loaders/DRACOLoader.js";
import { makePhone, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }
const NOISE = `
float hh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float nz(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hh(i), hh(i + vec3(1,0,0)), f.x), mix(hh(i + vec3(0,1,0)), hh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hh(i + vec3(0,0,1)), hh(i + vec3(1,0,1)), f.x), mix(hh(i + vec3(0,1,1)), hh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * nz(p); p = p * 2.03 + 3.1; a *= 0.5; } return s; }`;

// =====================================================================================================================
// LOW EARTH ORBIT: stars, the Sun, and the Earth below. Earth is built 1:1000 (radius 6,371 m at 540 m below Hubble's
// orbit, scaled with it), so it fills the sky at exactly the angle it does from Hubble's ~540 km orbit.
// =====================================================================================================================
const SKYG = new THREE.Group(); scene.add(SKYG);
const SUN = V(0.06, 1, 0.14).normalize();              // the Sun (and Earth, ~1° from it at this distance): straight "up", where the dish points
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
const RE = 6371;
const EARTH = new THREE.Group(); scene.add(EARTH); EARTH.position.set(9000, 0, 0); EARTH.scale.setScalar(0.001); EARTH.visible = false;   // Earth, 1:1,000,000 (radius 6.371)
const ESUN = V(0.95, 0.25, -0.2).normalize();
const EU = { uSun: { value: ESUN }, uT: { value: 0 }, uDay: { value: tex("kit/models/planets/earth_atmos_2048.jpg", true) }, uNight: { value: tex("kit/models/planets/earth_lights_2048.png", true) },
  uSpec: { value: tex("kit/models/planets/earth_specular_2048.jpg") }, uCl: { value: tex("kit/models/planets/earth_clouds_1024.png") }, uNorm: { value: tex("kit/models/planets/earth_normal_2048.jpg") } };
{ const ground = new THREE.Mesh(new THREE.SphereGeometry(RE, 256, 128), new THREE.ShaderMaterial({ uniforms: EU,
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; void main(){ vU = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uDay, uNight, uSpec, uCl; uniform vec3 uSun; uniform float uT; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; ${NOISE}
      void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float l = dot(n, uSun);
        vec3 day = pow(texture2D(uDay, vU).rgb, vec3(2.2)); float d = fbm(vP * 0.012) * 0.5 + fbm(vP * 0.06) * 0.5; day *= 0.82 + 0.36 * d;
        float sea = texture2D(uSpec, vU).r; vec3 h = normalize(uSun + v); float sp = pow(max(dot(n, h), 0.0), 60.0) * sea * 0.9 + pow(max(dot(n, h), 0.0), 8.0) * sea * 0.05;
        float c = texture2D(uCl, vU + vec2(uT * 0.00002, 0.0)).a; float cd = fbm(vP * 0.035 + vec3(uT * 0.02)); c = clamp(c * (0.6 + 0.8 * cd) * 1.2, 0.0, 1.0);
        float lit = smoothstep(-0.08, 0.25, l); day = mix(vec3(dot(day, vec3(0.33))), day, 1.35); vec3 col = day * max(l, 0.0) * 2.0 + vec3(1.0, 0.92, 0.8) * sp * lit * (1.0 - c);
        col = mix(col, vec3(0.95, 0.97, 1.0) * max(l, 0.0) * 1.7, c * 0.9);
        vec3 night = pow(texture2D(uNight, vU).rgb, vec3(1.6)) * vec3(1.0, 0.75, 0.45) * 1.6 * (1.0 - smoothstep(-0.25, 0.05, l)) * (1.0 - c * 0.7); col += night;
        float f = pow(1.0 - max(dot(n, v), 0.0), 5.0); col = mix(col, vec3(0.3, 0.55, 1.0) * (0.1 + 1.2 * max(l + 0.15, 0.0)), clamp(f * 0.75, 0.0, 0.6)); col *= 0.8;
        gl_FragColor = vec4(col, 1.0); }` }));
  EARTH.add(ground);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RE + 95, 192, 96), new THREE.ShaderMaterial({ uniforms: EU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float f = pow(clamp(1.0 + dot(n, v) * 1.0, 0.0, 1.0), 4.0) ;
        float r = clamp(dot(-n, uSun) * 0.8 + 0.4, 0.0, 1.0); vec3 c = mix(vec3(0.25, 0.5, 1.2), vec3(1.1, 0.55, 0.3), pow(1.0 - r, 3.0) * 0.4) * r; gl_FragColor = vec4(c * f * 1.3, 1.0); }` }));
  EARTH.add(atm); }

// =====================================================================================================================
// VOYAGER 1: NASA's own model (units ≈ metres: its dish is 3.81 wide → ×0.971 = 3.7 m). Loaded, the dish faces +y; the
// magnetometer boom runs along +z. The dish points "up", at the Sun and Earth (≈1° apart from here).
// =====================================================================================================================
const VOY = new THREE.Group(); scene.add(VOY);
const vg = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/voyager/voyager-nasa-B.glb");
const VS = 3.7 / 3.81; vg.scene.scale.setScalar(VS); VOY.add(vg.scene);
const XU = { uK: { value: 0 }, uT: { value: 0 } };
const VMATS = [];
vg.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
  const arr = Array.isArray(o.material) ? o.material : [o.material];
  const fixed = arr.map((m) => { const n = m.name || "";
    const q = new THREE.MeshPhysicalMaterial({ map: m.map, aoMap: m.aoMap || null, normalMap: m.normalMap || null, color: 0xffffff, roughness: /tex_02_AO$/.test(n) ? 0.55 : 0.4, metalness: /tex_02_AO$/.test(n) ? 0.05 : 0.45,
      envMapIntensity: 0.9, clearcoat: /tex_02_AO$/.test(n) ? 0.3 : 0.1 });
    if (q.map) { q.map.colorSpace = THREE.SRGBColorSpace; q.map.anisotropy = 8; }
    q.side = THREE.DoubleSide; q.name = n; q.transparent = true;
    q.onBeforeCompile = (s) => { Object.assign(s.uniforms, XU); s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vXW; varying vec3 vXN;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vXW = (modelMatrix * vec4(transformed, 1.0)).xyz; vXN = normalize(mat3(modelMatrix) * objectNormal);");
      s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uK, uT; varying vec3 vXW; varying vec3 vXN;").replace("#include <dithering_fragment>", `#include <dithering_fragment>
        if (uK > 0.0) { vec3 vv = normalize(cameraPosition - vXW); float e = pow(1.0 - abs(dot(normalize(vXN), vv)), 2.0); float scan = 0.85 + 0.15 * sin(vXW.y * 18.0 - uT * 3.0);
          vec3 ghost = vec3(0.35, 0.75, 1.3) * (0.06 + 0.9 * e) * scan; gl_FragColor.rgb = mix(gl_FragColor.rgb, ghost, uK); gl_FragColor.a = mix(1.0, 0.08 + 0.55 * e, uK); }`); };
    q.customProgramCacheKey = () => "voy-" + n; VMATS.push(q); return q; });
  o.material = Array.isArray(o.material) ? fixed : fixed[0]; });
function xray(k) { XU.uK.value = k; for (const m of VMATS) m.depthWrite = k < 0.5; FDSBOX.visible = k > 0.01; }
const VL = (x, y, z) => VOY.localToWorld(V(x, y, z));
const DISH_C = V(0, 1.5, 0), DISH_TOP = V(0, 2.25, 0), BUS = V(0, 0.75, 0);
// the FDS (flight data subsystem) sits in the ten-sided bus under the dish: shown in the X-ray as a glowing box (diagram)
const FDSBOX = new THREE.Group(); VOY.add(FDSBOX); FDSBOX.visible = false;
{ const b = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.28, 0.36, 3, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xffb340, transparent: true, opacity: 0.35, depthWrite: false, emissive: new THREE.Color(0x6a3a00), roughness: 0.4 }));
  FDSBOX.add(b); const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 0.28, 0.36)), new THREE.LineBasicMaterial({ color: new THREE.Color(2.4, 1.4, 0.3), toneMapped: false })); FDSBOX.add(e);
  FDSBOX.scale.setScalar(0.7); FDSBOX.position.set(0.42, 0.8, 0.22); }

// =====================================================================================================================
// THE SIGNAL: radio pulses leaving the dish (or Earth) as glowing wave-fronts and packets along a straight line.
// "garble" scrambles the spacing and turns them red; "ok" turns them green.
// =====================================================================================================================
const SIGU = { uT: { value: 0 } };
function makeBeam(N = 40) { const g = new THREE.Group(); const items = [];
  for (let i = 0; i < N; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uC: { value: new THREE.Color(0.6, 0.85, 1.2) }, uA: { value: 1 } },
      vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; varying vec2 vU; void main(){ float r = length(vU) * 2.0; float ring = exp(-pow((r - 0.8) * 9.0, 2.0)) + exp(-r * 7.0) * 0.6; gl_FragColor = vec4(uC * ring * uA, 1.0); }` }));
    m.frustumCulled = false; g.add(m); items.push(m); }
  g.userData.items = items; scene.add(g); g.visible = false; return g; }
const BEAM = makeBeam(44);
// from → dir: packets every `gap` m, moving at `speed` m/s, growing with distance (a widening wave-front), garbled = 0..1
function beam(B, t, from, dir, { speed = 6, gap = 1.4, len = 60, size = 0.9, grow = 0.05, garble = 0, ok = 0, k = 1 } = {}) {
  B.visible = k > 0.01; if (!B.visible) return; const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir.clone().normalize());
  B.userData.items.forEach((m, i) => { let d = ((t * speed + i * gap) % len); const jit = garble * (hash(i * 7.1 + Math.floor(t * 3)) - 0.5) * gap * 1.6; d = Math.max(0, d + jit);
    m.position.copy(from).addScaledVector(dir, d); m.quaternion.copy(q); const s = size * (1 + d * grow) * (1 + garble * (hash(i * 3.3) - 0.5) * 0.8); m.scale.set(s, s, s);
    const fade = clamp(d / 1.5) * clamp((len - d) / (len * 0.3)); const red = new THREE.Color(1.6, 0.35, 0.25), grn = new THREE.Color(0.4, 1.8, 0.8), blu = new THREE.Color(0.6, 0.85, 1.25);
    m.material.uniforms.uC.value.copy(blu).lerp(red, garble).lerp(grn, ok); m.material.uniforms.uA.value = fade * k * (garble > 0.5 ? (hash(i + Math.floor(t * 8)) > 0.3 ? 1 : 0.15) : 1); }); }

// =====================================================================================================================
// THE MAP (diagram, far away): the Sun, the planets' orbits to scale (1 AU = 0.1), Voyager 1 at one light-day = 173 AU,
// 35° above the plane of the planets. A light pulse runs Voyager → Earth (24 h) and back (another 24 h).
// =====================================================================================================================
const MAPG = new THREE.Group(); scene.add(MAPG); MAPG.position.set(0, 9000, 0); MAPG.visible = false;
const AU = 0.1, VAU = 173.1, VLAT = 35 * Math.PI / 180, VDIR = V(Math.cos(VLAT) * 0.6, Math.sin(VLAT), -Math.cos(VLAT) * 0.8).normalize();
const VPOS = VDIR.clone().multiplyScalar(VAU * AU);
{ const sun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16), glow(0xffe2a0, 4)); MAPG.add(sun);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), sunGlow.material); halo.userData.bill = true; MAPG.add(halo); MAPG.userData.halo = halo;
  const ORB = [["Earth", 1, 0x5fb0ff], ["Jupiter", 5.2, 0xd9b48a], ["Saturn", 9.58, 0xe8d29a], ["Uranus", 19.2, 0x9fe0e8], ["Neptune", 30.1, 0x6f8cff]];
  MAPG.userData.planets = {};
  for (const [nm, r, c] of ORB) { const pts = []; for (let i = 0; i <= 256; i++) { const a = i / 256 * TAU; pts.push(V(Math.cos(a) * r * AU, 0, Math.sin(a) * r * AU)); }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), transparent: true, opacity: 0.85, toneMapped: false })); MAPG.add(ln);
    const a0 = { Earth: 2.2, Jupiter: 0.8, Saturn: 4.1, Uranus: 5.4, Neptune: 3.0 }[nm]; const p = new THREE.Mesh(new THREE.SphereGeometry(nm === "Earth" ? 0.045 : 0.07, 20, 12), glow(c, 2.2)); p.position.set(Math.cos(a0) * r * AU, 0, Math.sin(a0) * r * AU); MAPG.add(p); MAPG.userData.planets[nm] = p; }
  // the path Voyager flew (dashed), and the craft itself as a bright point
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), VPOS]), new THREE.LineDashedMaterial({ color: 0x9fd4ff, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.55 })); path.computeLineDistances(); MAPG.add(path);
  const vp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 12), glow(0xffffff, 3)); vp.position.copy(VPOS); MAPG.add(vp);
  const grid = new THREE.PolarGridHelper(3.2, 16, 8, 128, 0x1d3a52, 0x13202c); grid.material.transparent = true; grid.material.opacity = 0.35; MAPG.add(grid); }
const PULSE = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 12), glow(0xcfe9ff, 5)); MAPG.add(PULSE);
const TRAIL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8, 1, true), glow(0x9fd4ff, 2.5)); MAPG.add(TRAIL);
const EP = () => MAPG.userData.planets.Earth.position;
// k 0..1 along the way, dir +1 Voyager → Earth, -1 Earth → Voyager
function pulseAt(k, dirn, col) { const a = dirn > 0 ? VPOS : EP(), b = dirn > 0 ? EP() : VPOS; const p = a.clone().lerp(b, k); PULSE.position.copy(p); PULSE.material.color.copy(col);
  const mid = a.clone().lerp(p, 0.5); TRAIL.position.copy(mid); TRAIL.scale.set(1, Math.max(0.001, a.distanceTo(p)), 1); TRAIL.quaternion.setFromUnitVectors(V(0, 1, 0), p.clone().sub(a).normalize()); TRAIL.material.color.copy(col).multiplyScalar(0.6); }
MAPG.quaternion.setFromUnitVectors(VDIR, V(0.12, 1, 0).normalize());   // turned so the line to Voyager runs up the 9:16 frame
const MW = (x, y, z) => MAPG.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE BOARD (diagram): Voyager's FDS memory as a board of chips; one chip fails. Then the memory as a map of cells: the code
// that lived in the dead chip, too big for any single free gap, is cut into pieces stored in different places, and linked.
// =====================================================================================================================
const BOARD = new THREE.Group(); scene.add(BOARD); BOARD.position.set(-9000, 0, 0); BOARD.visible = false;
const BU = { uT: { value: 0 } };
const pcbTex = H.canvasTex(1024, 1024, (g) => { g.fillStyle = "#06130d"; g.fillRect(0, 0, 1024, 1024); H.reseed(3);
  for (let i = 0; i < 260; i++) { const x = H.rnd() * 1024, y = H.rnd() * 1024, hz = H.rnd() > 0.5; g.strokeStyle = `rgba(200,150,60,${0.25 + H.rnd() * 0.35})`; g.lineWidth = 2 + H.rnd() * 3; g.beginPath(); g.moveTo(x, y);
    const l = 60 + H.rnd() * 260; if (hz) { g.lineTo(x + l, y); g.lineTo(x + l + 30, y + 30); } else { g.lineTo(x, y + l); g.lineTo(x + 30, y + l + 30); } g.stroke(); g.fillStyle = "rgba(220,170,80,.6)"; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); } });
{ const pcb = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 4.6), new THREE.MeshPhysicalMaterial({ map: pcbTex, color: 0xffffff, roughness: 0.45, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.3 })); pcb.receiveShadow = true; BOARD.add(pcb);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.3; fl.receiveShadow = true; BOARD.add(fl); }
const CHIPS = []; const BAD = 13;
const chipMat = new THREE.MeshPhysicalMaterial({ color: 0x15171a, roughness: 0.35, metalness: 0.1, clearcoat: 0.4 });
for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const ch = new THREE.Group(); const body = sh(new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.1, 0.86, 2, 0.02), chipMat.clone())); ch.add(body);
  for (let p = 0; p < 8; p++) for (const sx of [-1, 1]) { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.04), metal(0xc9ccd0, 0.3)); pin.position.set(sx * 0.31, -0.03, -0.35 + p * 0.1); ch.add(pin); }
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), matte(0x3a3d42)); dot.rotation.x = -Math.PI / 2; dot.position.set(-0.17, 0.052, -0.33); ch.add(dot);
  ch.position.set(-2.66 + c * 0.76, 0.09, -1.62 + r * 1.08); BOARD.add(ch); CHIPS.push(ch); }
const BADGLOW = new THREE.PointLight(0xff3a2d, 0, 3, 2); BOARD.add(BADGLOW); BADGLOW.position.copy(CHIPS[BAD].position).add(V(0, 0.4, 0));
function chips(kBad, t) { CHIPS.forEach((ch, i) => { const m = ch.children[0].material; const bad = i === BAD && kBad > 0;
  const fl = bad ? (0.6 + 0.4 * Math.sin(t * 17) * Math.sin(t * 5.3)) * kBad : 0; m.emissive = m.emissive || new THREE.Color(); m.emissive.setRGB(1.4 * fl, 0.12 * fl, 0.08 * fl); }); BADGLOW.intensity = kBad * 6 * (0.7 + 0.3 * Math.sin(t * 17)); }
// the memory map (rises above the board): 16 × 8 cells. "used" grey, "free" outlined, the dead chip's cells red.
const MEM = new THREE.Group(); BOARD.add(MEM); MEM.position.set(0, 0.9, 0); MEM.rotation.y = Math.PI / 2; MEM.visible = false;   // long side runs into the frame
const COLS = 16, ROWS = 8, CW = 0.34, CG = 0.04;
const cellAt = (c, r) => V(-((COLS - 1) / 2) * (CW + CG) + c * (CW + CG), 0, -((ROWS - 1) / 2) * (CW + CG) + r * (CW + CG));
// free gaps (each ≤ 2 cells) and the dead region (row 3, cols 5–10)
const FREE = [[1, 0], [2, 0], [12, 1], [7, 6], [8, 6], [14, 4], [3, 5], [10, 2], [11, 7], [4, 7], [15, 6]];
const DEAD = [[5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]];
const key = (c, r) => c + "," + r; const FS = new Set(FREE.map((a) => key(...a))), DS = new Set(DEAD.map((a) => key(...a)));
const usedM = new THREE.MeshPhysicalMaterial({ color: 0x3a4048, roughness: 0.4, metalness: 0.3, emissive: new THREE.Color(0x0a0d12) });
const freeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.5, 0.25), transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false });
const deadM = new THREE.MeshPhysicalMaterial({ color: 0x3a1210, roughness: 0.5, emissive: new THREE.Color(0.9, 0.08, 0.05) });
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const k = key(c, r); const fr0 = FS.has(k), de = DS.has(k);
  const m = new THREE.Mesh(fr0 ? new THREE.BoxGeometry(CW, 0.02, CW) : new RoundedBoxGeometry(CW, 0.1, CW, 2, 0.02), fr0 ? freeM : de ? deadM : usedM); m.position.copy(cellAt(c, r)); m.position.y = fr0 ? -0.04 : 0; m.castShadow = !fr0; MEM.add(m);
  if (fr0) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, 0.02, CW)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.9), toneMapped: false })); e.position.copy(m.position); MEM.add(e); } }
// the code: six amber cells. Whole, it can't fit the 2-cell gap; cut into 3 pieces of 2, they go to three gaps.
const codeM = new THREE.MeshPhysicalMaterial({ color: 0xffb340, roughness: 0.3, emissive: new THREE.Color(1.3, 0.6, 0.05), clearcoat: 0.5 });
const CODE = DEAD.map(() => { const m = sh(new THREE.Mesh(new RoundedBoxGeometry(CW * 0.92, 0.12, CW * 0.92, 2, 0.025), codeM)); MEM.add(m); m.visible = false; return m; });
const DEST = [[1, 0], [2, 0], [7, 6], [8, 6], [14, 4], [15, 4]];   // gaps: (1–2,0), (7–8,6), (14,4)+(15,4)... see FREE
FS.add(key(15, 4)); { const m = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.02, CW), freeM); m.position.copy(cellAt(15, 4)); m.position.y = -0.04; MEM.add(m);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, 0.02, CW)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.9), toneMapped: false })); e.position.copy(m.position); MEM.add(e); }
// links between the pieces (the rewritten references): glowing arcs
const LINKS = [[1, 2], [3, 4]].map(([a, b]) => { const p0 = cellAt(...DEST[a]), p1 = cellAt(...DEST[b]); const mid = p0.clone().lerp(p1, 0.5).add(V(0, 0.9, 0));
  const g = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0.clone().add(V(0, 0.07, 0)), mid, p1.clone().add(V(0, 0.07, 0))), 64, 0.018, 6, false);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uT: BU.uT, uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT, uK; varying vec2 vU; void main(){ float show = step(vU.x, uK); float p = fract(vU.x * 3.0 - uT * 1.2); float pulse = smoothstep(0.0, 0.1, p) * smoothstep(0.25, 0.1, p);
      gl_FragColor = vec4(vec3(1.0, 0.75, 0.25) * (0.5 + 1.5 * pulse) * show, 1.0); }` })); MEM.add(m); return m; });
const BW = (x, y, z) => BOARD.localToWorld(V(x, y, z)), MEMW = (c, r, y = 0) => MEM.localToWorld(cellAt(c, r).add(V(0, y, 0)));
// phase: 0 hidden · 1 sitting in the dead row · whole block tries the gap (kTry) · split + fly (kFly) · links (kLink)
function code(kShow, kTry, kFly, kLink, t) { CODE.forEach((m, i) => { m.visible = kShow > 0.01; const home = cellAt(...DEAD[i]).add(V(0, 0.14, 0));
    // try: the whole block lifts and slides over gap (1–2, 0) — six cells over two: it doesn't fit (shakes red)
    const tryP = cellAt(1 + i, 0).add(V(0, 0.55, 0)); let p = home.clone().lerp(tryP, smooth(clamp(kTry * 1.6)));
    if (kTry > 0.6 && kFly <= 0) { const sh0 = Math.sin(t * 40) * 0.04 * clamp((kTry - 0.6) * 4); p.x += sh0; }
    if (kFly > 0) { const d = cellAt(...DEST[i]).add(V(0, 0.07, 0)); const piece = Math.floor(i / 2); const kk = smooth(clamp(kFly * 1.5 - piece * 0.25)); const arc = Math.sin(kk * Math.PI) * 0.9;
      const from = tryP.clone().add(V((piece - 1) * 0.25, 0, 0)); p = from.lerp(d, kk); p.y += arc; }
    m.position.copy(p); m.scale.setScalar(lerp(0.4, 1, smooth(kShow))); m.material.emissive.setRGB(kTry > 0.6 && kFly <= 0 ? 1.6 : 1.3, kTry > 0.6 && kFly <= 0 ? 0.25 : 0.6, 0.05); });
  LINKS.forEach((l) => (l.material.uniforms.uK.value = kLink)); }

// =====================================================================================================================
// ORBI: a phone on a pedestal; Orbi's file viewer (Viewer.tsx) with a received PDF, then a photo, video, Word, Excel, slides.
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const IMG = { m100: await img("ref/m100_b.jpg") };
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const FILES = { pdf: ["voyager-fds-report.pdf", "2.4 MB · select text to copy"], image: ["galaxy-m100.jpg", "1.1 MB"], video: ["launch-1977.mp4", "48 MB"], doc: ["mission-notes.docx", "86 KB"], sheet: ["telemetry.xlsx", "312 KB"], slides: ["briefing.pptx", "5.2 MB"] };
const DOCL = ["Voyager 1 · Flight data subsystem", "On 14 November 2023 the FDS began", "sending unreadable data. One chip,", "about 3% of its memory, had failed.", "The code was split into sections", "stored in different places.", "18 April 2024: first section sent.", "20 April 2024: engineering data back."];
function drawPh(g, st) { g.fillStyle = "#050507"; g.fillRect(0, 0, 780, 1688);
  // top bar (viewer-top): name + size, Copy all text, Download ↓, ×
  g.fillStyle = "#0b0b0e"; g.fillRect(0, 0, 780, 250); g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(0, 249, 780, 2);
  const [nm, sz] = FILES[st.kind]; g.fillStyle = "#fff"; g.font = "800 40px M"; g.fillText(nm.length > 22 ? nm.slice(0, 21) + "…" : nm, 40, 120); g.fillStyle = "#8d8d8d"; g.font = "600 26px M"; g.fillText(sz, 40, 168);
  const pill = (x, w, s, hi) => { g.fillStyle = hi ? "rgba(61,255,140,.22)" : "rgba(255,255,255,.08)"; rr(g, x, 186, w, 50, 25); g.fill(); g.strokeStyle = hi ? green : "rgba(255,255,255,.2)"; g.lineWidth = 2; g.stroke(); g.fillStyle = hi ? green : "#fff"; g.font = "700 24px M"; g.fillText(s, x + 20, 220); };
  if (st.kind !== "image" && st.kind !== "video") pill(40, 250, st.copied ? "Copied ✓" : "Copy all text", st.copied); pill(st.kind !== "image" && st.kind !== "video" ? 310 : 40, 200, "Download ↓", st.dl);
  g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 2; g.beginPath(); g.arc(720, 120, 30, 0, TAU); g.stroke(); g.fillStyle = "#fff"; g.font = "400 40px M"; g.fillText("×", 708, 133);
  const B = 290; // body
  if (st.kind === "pdf" || st.kind === "doc") { g.fillStyle = "#f4f3ef"; rr(g, 50, B, 680, 960, 10); g.fill(); g.fillStyle = "#111"; g.font = "800 30px M";
    DOCL.forEach((l, i) => { const y = B + 90 + i * 70; if (i === 0) { g.font = "900 30px M"; } else g.font = "500 26px M";
      if (st.sel && i >= 1 && i <= st.sel) { g.fillStyle = "rgba(61,160,255,.35)"; g.fillRect(80, y - 30, 620, 42); } g.fillStyle = "#111"; g.fillText(l, 90, y); });
    for (let i = 0; i < 6; i++) { g.fillStyle = "#c9c7c0"; g.fillRect(90, B + 700 + i * 40, i === 5 ? 340 : 600, 14); }
    if (st.kind === "doc") { g.fillStyle = "#2b579a"; rr(g, 560, B + 900, 140, 40, 8); g.fill(); g.fillStyle = "#fff"; g.font = "800 22px M"; g.fillText("WORD", 594, B + 928); } }
  else if (st.kind === "image") { if (IMG.m100) g.drawImage(IMG.m100, 0, B + 120, 780, 780); g.fillStyle = "rgba(0,0,0,.6)"; rr(g, 280, B + 940, 220, 56, 28); g.fill(); g.fillStyle = "#fff"; g.font = "700 26px M"; g.fillText("pinch to zoom", 302, B + 976); }
  else if (st.kind === "video") { g.fillStyle = "#000"; g.fillRect(0, B + 220, 780, 440); const gr = g.createLinearGradient(0, B + 220, 0, B + 660); gr.addColorStop(0, "#1b2a44"); gr.addColorStop(1, "#d9822b"); g.fillStyle = gr; g.fillRect(0, B + 220, 780, 440);
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(350, B + 390); g.lineTo(350, B + 490); g.lineTo(440, B + 440); g.fill(); g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(40, B + 700, 700, 8); g.fillStyle = green; g.fillRect(40, B + 700, 700 * st.play, 8); g.font = "600 24px M"; g.fillStyle = "#ccc"; g.fillText("0:" + String(Math.floor(st.play * 40)).padStart(2, "0") + " / 0:40", 40, B + 750); }
  else if (st.kind === "sheet") { g.fillStyle = "#fff"; g.fillRect(30, B, 720, 900); g.strokeStyle = "#d0d4da"; g.lineWidth = 1.5; for (let r = 0; r <= 16; r++) { g.beginPath(); g.moveTo(30, B + r * 56); g.lineTo(750, B + r * 56); g.stroke(); } for (let c = 0; c <= 4; c++) { g.beginPath(); g.moveTo(30 + c * 180, B); g.lineTo(30 + c * 180, B + 896); g.stroke(); }
    g.fillStyle = "#1e7145"; g.fillRect(30, B, 720, 56); g.fillStyle = "#fff"; g.font = "800 24px M"; ["DATE", "SIGNAL", "FDS", "STATUS"].forEach((s, i) => g.fillText(s, 46 + i * 180, B + 38));
    const rows = [["11-13", "OK", "OK", "readable"], ["11-14", "OK", "FAULT", "garbled"], ["03-01", "OK", "FAULT", "garbled"], ["04-18", "OK", "PATCH", "sent"], ["04-20", "OK", "OK", "readable"]];
    rows.forEach((r, i) => r.forEach((s, j) => { g.fillStyle = s === "FAULT" || s === "garbled" ? "#c0392b" : s === "readable" ? "#1e7145" : "#222"; g.font = "600 24px M"; g.fillText(s, 46 + j * 180, B + 94 + i * 56); })); }
  else if (st.kind === "slides") { g.fillStyle = "#0e1420"; rr(g, 30, B + 200, 720, 405, 12); g.fill(); g.fillStyle = "#ffb340"; g.font = "900 44px D"; g.fillText("ONE LIGHT-DAY", 70, B + 300); g.fillStyle = "#cfd6dd"; g.font = "600 28px M"; g.fillText("Voyager 1 · 18 Nov 2026", 70, B + 350);
    for (let i = 0; i < 4; i++) { g.fillStyle = i === 0 ? "#ffb340" : "rgba(255,255,255,.15)"; rr(g, 30 + i * 186, B + 640, 162, 92, 8); g.fill(); } g.fillStyle = "#c55a11"; rr(g, 560, B + 780, 160, 40, 8); g.fill(); g.fillStyle = "#fff"; g.font = "800 22px M"; g.fillText("SLIDES", 592, B + 808); }
  if (st.toast) { g.fillStyle = "rgba(20,22,26,.95)"; rr(g, 190, 1380, 400, 80, 40); g.fill(); g.strokeStyle = green; g.lineWidth = 2; g.stroke(); g.fillStyle = green; g.font = "800 30px M"; g.fillText(st.toast, 230, 1432); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "launched 1977"], dishL: ["High-gain dish", "#cfe6ff", "3.7 m wide"], boomL: ["Magnetometer boom", "#ffd166", ""],
  youL: ["Voyager 1", "#fff", "one light-day out"], earthM: ["Earth", "#5fb0ff", ""], nepL: ["Neptune's orbit", "#6f8cff", "30 × Earth–Sun"],
  fdsL: ["Flight data computer", "#ffb340", "packs data for Earth"], badL: ["One memory chip", "#ff6b5e", "failed"], gapL: ["Free gap", "#3dff8c", "too small"],
  piecesL: ["Pieces", "#ffb340", "in different places"], linkL: ["Rewritten links", "#ffd166", "work as one program"], earthL: ["Earth", "#5fb0ff", "the first piece"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 170px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("lday", row(card("18 NOV 2026", "1 LIGHT-DAY", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("launch", row(card("LAUNCHED", "5 SEP 1977", "#9fd4ff"), card("STILL", "TALKING", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("radio", row(card("DISH", "3.7 m", "#cfe6ff"), card("RADIO", "~22 W", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("clock", big("hN", "0 h", "SIGNAL ON ITS WAY HOME", "#fff", "#9fd4ff"), { left: "0px", top: "190px" });
hudEl("ld", row(card("1 LIGHT-DAY", "25.9 BILLION KM", "#ffd166")), { left: "0px", top: "1660px" });
hudEl("date23", row(card("14 NOV 2023", "NONSENSE", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("pct", row(card("ONE CHIP", "~3% OF THE MEMORY", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("far24", row(card("APRIL 2024", "24 BILLION KM AWAY", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("nofit", row(card("NO SINGLE SPOT", "BIG ENOUGH", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("cut", row(card("SO", "CUT INTO PIECES", "#ffb340")), { left: "0px", top: "1440px" });
hudEl("sent", row(card("18 APR 2024", "FIRST PIECE SENT", "#ffb340")), { left: "0px", top: "1440px" });
hudEl("wait", big("wN", "0 h", "WAITING FOR THE ANSWER", "#fff", "#ffb340"), { left: "0px", top: "190px" });
hudEl("okd", row(card("20 APR 2024", "READABLE AGAIN", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("five", pill("FIRST TIME IN 5 MONTHS"), { left: "330px", top: "1660px" });
hudEl("kinds", `<div style="width:1080px;display:flex;justify-content:center;flex-wrap:wrap;gap:12px;padding:0 60px;box-sizing:border-box">${["PDF", "PHOTO", "VIDEO", "WORD", "EXCEL", "SLIDES"].map((s, i) => `<div id="kd${i}" style="padding:14px 22px;border-radius:18px;background:rgba(8,10,16,.82);border:1.5px solid rgba(255,255,255,.25);font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["OPENS IN THE BROWSER", "NO DOWNLOAD", "NO APP"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
// telemetry panel: rows of the data stream as it reaches Earth — clean hex, scrambled symbols, or clean again in green
hudEl("tele", `<div style="width:1080px;display:flex;justify-content:center"><div style="width:860px;padding:22px 30px;border-radius:24px;background:rgba(6,8,12,.86);border:1.5px solid rgba(255,255,255,.18)">
  <div id="teleH" style="font:800 26px M;letter-spacing:.14em;color:#9fd4ff;margin-bottom:10px">DATA FROM VOYAGER 1</div><div id="teleT" style="font:600 30px/1.32 M;color:#cfe6ff;white-space:pre"></div></div></div>`, { left: "0px", top: "200px" });
function tele(t, mode) { const rows = []; const f = Math.floor(t * 6); const HEX = "0123456789ABCDEF", JUNK = "#%&@$?!*~^<>{}[]|/\\▒░▓";
  for (let r = 0; r < 5; r++) { let s = ""; for (let i = 0; i < 28; i++) { if (i % 5 === 4) { s += " "; continue; } const hsh = hash(r * 97 + i * 13 + f * 7);
      s += mode === "junk" ? (hsh > 0.35 ? JUNK[Math.floor(hsh * JUNK.length * 7) % JUNK.length] : HEX[Math.floor(hsh * 16 * 5) % 16]) : HEX[Math.floor(hsh * 16 * 5) % 16]; } rows.push(s); }
  H.$("teleT").textContent = rows.join("\n"); H.$("teleT").style.color = mode === "junk" ? "#ff6b5e" : mode === "ok" ? "#3dff8c" : "#cfe6ff";
  H.$("teleH").textContent = mode === "junk" ? "DATA FROM VOYAGER 1 · UNREADABLE" : mode === "ok" ? "DATA FROM VOYAGER 1 · ENGINEERING DATA OK" : "DATA FROM VOYAGER 1"; H.$("teleH").style.color = mode === "junk" ? "#ff6b5e" : mode === "ok" ? "#3dff8c" : "#9fd4ff"; }

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; VOY.visible = sp; SKYG.visible = sp || s === "map" || s === "earth"; MAPG.visible = s === "map"; BOARD.visible = s === "board"; ORS.visible = s === "orbi"; EARTH.visible = s === "earth";
  BEAM.visible = false; scene.fog = null; scene.background = s === "board" ? new THREE.Color(0x05070a) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt(sunSize = 900) { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(sunSize); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 2.6 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86b8); H.hemi.groundColor.set(0x1a2a4a); H.hemi.intensity = 0.42; H.envK.value = 0.7; H.rimA.intensity = 0.9; H.rimB.intensity = 0.55; }
function lightAt(c, hemi = 0.35) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(4, 9, 6)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const UP = V(0, 1, 0);

H.frame("Open what you receive. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.35; H.grade.uniforms.uVig.value = 0.32; camRange(0.05, 30000); XU.uT.value = t; BU.uT.value = t; EU.uT.value = t;
  xray(0); chips(0, t); MEM.visible = false; code(0, 0, 0, 0, t); for (const id of ["teleT"]) {}

  if (t < at("far")) { // HOOK · THIS · DISH: Voyager in the dark, its signal leaving for home
    sets("space"); lightSpace(); skyAt(700);
    if (t < at("this")) { beam(BEAM, t, DISH_TOP, UP, { speed: 7, gap: 1.6, len: 70, size: 1.6, grow: 0.06 });
      move(t, 0, at("this"), [V(7, 6.5, 17), V(0, 0.3, 1.5), 40], [V(5, 5, 12.5), V(0, 0.5, 1.5), 40], 0.03);
      title(t, fr("hook", 0.04), fr("hook", 0.55), "18 November 2026", "One light-day", 150); hudShow("lday", win(t, fr("hook", 0.5), at("this"))); }
    else if (t < at("dish")) { const a = 0.6 + (t - at("this")) * 0.16; const C = V(0, 1.2, 3.5); move(t, at("this"), at("dish"), [C.clone().add(V(Math.cos(a) * 17, 4, Math.sin(a) * 17)), C, 40], [C.clone().add(V(Math.cos(a + 0.1) * 15.5, 3.5, Math.sin(a + 0.1) * 15.5)), C, 40], 0.02);
      beam(BEAM, t, DISH_TOP, UP, { speed: 7, gap: 1.6, len: 40, size: 1.4, grow: 0.06, k: 0.6 });
      callout("nasa", t, fr("this", 0.25), at("dish"), V(0, 0.8, 0.9), 300, 1390); callout("boomL", t, fr("this", 0.5), at("dish"), VL(0, 1.2, 9), 760, 1000); hudShow("launch", win(t, fr("this", 0.45), at("dish"))); }
    else { move(t, at("dish"), at("far"), [V(5.5, 4.2, 6.5), DISH_C, 36], [V(4.6, 3.4, 5.4), V(0, 1.6, 0), 36], 0.02);
      beam(BEAM, t, DISH_TOP, UP, { speed: 5, gap: 1.0, len: 22, size: 1.2, grow: 0.08 }); callout("dishL", t, fr("dish", 0.1), at("far"), V(-1.6, 1.9, 0.4), 300, 1000); hudShow("radio", win(t, fr("dish", 0.2), at("far"))); }
  } else if (t < at("gib")) { // FAR: the map, 1 AU = 0.1; a light pulse home and back
    sets("map"); MAPG.updateMatrixWorld(true); H.key.intensity = 0.6; H.hemi.intensity = 0.6; H.envK.value = 0.4; skyAt(0.0001); MAPG.updateMatrixWorld(true);
    const halo = MAPG.userData.halo; halo.lookAt(H.cam.position); halo.quaternion.copy(H.cam.quaternion);
    const k1 = prog(t, fr("far", 0.05), fr("far", 0.55)), k2 = prog(t, fr("far", 0.6), at("gib") - 0.3);
    if (k2 <= 0) pulseAt(smooth(k1), 1, new THREE.Color(0.8, 0.92, 1.3)); else pulseAt(smooth(k2), -1, new THREE.Color(1.3, 0.9, 0.4));
    const hrs = k2 <= 0 ? 24 * smooth(k1) : 24 + 24 * smooth(k2); H.$("hN").textContent = `${Math.round(hrs)} h`; H.$("hN").nextElementSibling.textContent = k2 <= 0 ? "SIGNAL ON ITS WAY HOME" : "AND THE ANSWER BACK";
    const mid = MW(VPOS.x * 0.5, VPOS.y * 0.5, VPOS.z * 0.5).add(V(0, -0.6, 0)); move(t, at("far"), at("gib"), [mid.clone().add(V(3, 4, 27)), mid, 44], [mid.clone().add(V(2, 3, 24.5)), mid, 44], 0.01);
    hudShow("clock", win(t, fr("far", 0.04), at("gib"))); hudShow("ld", win(t, fr("far", 0.2), at("gib"))); hudShow("diag", win(t, fr("far", 0.0), at("gib")));
    callout("youL", t, fr("far", 0.02), at("gib"), MW(VPOS.x, VPOS.y, VPOS.z), 760, 470); callout("nepL", t, fr("far", 0.25), at("gib"), MW(3.01 * Math.cos(1.3), 0, 3.01 * Math.sin(1.3)), 300, 1000);
    callout("earthM", t, fr("far", 0.35), at("gib"), MW(EP().x, EP().y, EP().z), 760, 1000);
  } else if (t < at("cant")) { // GIB · CHIP: nonsense from the dish → X-ray into the bus → the board, one chip dies
    if (t < at("chip")) { sets("space"); lightSpace(); skyAt(700); beam(BEAM, t, DISH_TOP, UP, { speed: 6, gap: 1.3, len: 30, size: 1.3, grow: 0.07, garble: smooth(prog(t, at("gib"), fr("gib", 0.35))) });
      move(t, at("gib"), at("chip"), [V(-9, 1.5, 9), V(0, 2.6, 0), 40], [V(-7.5, 1.8, 7.5), V(0, 3, 0), 40], 0.05); tele(t, t < fr("gib", 0.3) ? "clean" : "junk"); hudShow("tele", win(t, at("gib"), at("chip"))); hudShow("date23", win(t, fr("gib", 0.3), at("chip"))); }
    else if (t < fr("chip", 0.32)) { sets("space"); lightSpace(); skyAt(700); xray(smooth(prog(t, at("chip"), fr("chip", 0.15)))); move(t, at("chip"), fr("chip", 0.32), [V(9, 3.6, 8.2), V(0.3, 1.0, 0.2), 34], [V(6.0, 2.6, 5.6), V(0.35, 0.85, 0.2), 34], 0.01);
      callout("fdsL", t, fr("chip", 0.08), fr("chip", 0.32), VL(0.42, 0.8, 0.22), 760, 1390); hudShow("diag", 1); }
    else { sets("board"); BOARD.updateMatrixWorld(true); lightAt(BOARD.position, 0.3); chips(smooth(prog(t, fr("chip", 0.38), fr("chip", 0.55))), t); const B = CHIPS[BAD].position;
      move(t, fr("chip", 0.32), at("cant"), [BW(3.2, 4.4, 4.6), BW(0, 0, 0), 38], [BW(B.x + 1.6, 2.3, B.z + 2.6), BW(B.x, 0, B.z), 38], 0.01);
      callout("badL", t, fr("chip", 0.5), at("cant"), BW(B.x, 0.15, B.z), 760, 1000); hudShow("pct", win(t, fr("chip", 0.6), at("cant"))); hudShow("diag", 1); }
  } else if (t < at("pieces")) { // CANT: nobody can go there: pull back until Voyager is a speck in the dark
    sets("space"); lightSpace(); skyAt(500); const k = smooth(prog(t, at("cant"), at("pieces")));
    const d = lerp(10, 420, Math.pow(k, 1.6)); look(V(0.4, 0.3, 1).normalize().multiplyScalar(d).add(V(0, 1.5, 0)), V(0, 1.5, 0), 40); hudShow("far24", win(t, fr("cant", 0.15), at("pieces")));
    beam(BEAM, t, DISH_TOP, UP, { speed: 6, gap: 1.3, len: 30, size: 1.3, grow: 0.07, garble: 1, k: 1 - k });
  } else if (t < at("send")) { // PIECES: the memory map; the code won't fit; cut into pieces; linked
    sets("board"); lightAt(BOARD.position, 0.35); chips(1, t); MEM.visible = true;
    const kShow = prog(t, at("pieces"), fr("pieces", 0.1)), kTry = prog(t, fr("pieces", 0.08), fr("pieces", 0.42)), kFly = prog(t, fr("pieces", 0.5), fr("pieces", 0.85)), kLink = prog(t, fr("pieces", 0.82), at("send"));
    MEM.position.y = lerp(0.3, 0.9, smooth(kShow)); BOARD.updateMatrixWorld(true); code(kShow, kTry, kFly, kLink, t);
    move(t, at("pieces"), at("send"), [BW(0.3, 9.6, 6.4), BW(0, 0.8, -0.4), 40], [BW(0.2, 9.0, 5.8), BW(0, 0.8, -0.4), 40], 0.01);
    callout("gapL", t, fr("pieces", 0.15), fr("pieces", 0.48), MEMW(1.5, 0, 0), 300, 1000); hudShow("nofit", win(t, fr("pieces", 0.2), fr("pieces", 0.5)));
    callout("piecesL", t, fr("pieces", 0.62), at("send"), MEMW(14.5, 4, 0.1), 760, 1390); callout("linkL", t, fr("pieces", 0.85), at("send"), MEMW(7.5, 6, 0.4), 300, 1390); hudShow("cut", win(t, fr("pieces", 0.5), at("send"))); hudShow("diag", 1);
  } else if (t < at("back")) { // SEND: from Earth, the first piece; waiting
    sets("earth"); lightAt(EARTH.position, 0.05); H.key.intensity = 0; H.hemi.intensity = 0.05; skyAt(1400); EARTH.updateMatrixWorld(true); EARTH.rotation.y = 2.2 + t * 0.03;
    const E = EARTH.position, dir = V(-0.45, 0.85, 0.2).normalize(); beam(BEAM, t, E.clone().addScaledVector(dir, 6.5), dir, { speed: 5, gap: 2.0, len: 60, size: 2.6, grow: 0.05, ok: 0, k: smooth(prog(t, at("send"), fr("send", 0.15))) });
    BEAM.userData.items.forEach((m) => m.material.uniforms.uC.value.set(1.4, 0.85, 0.3));
    move(t, at("send"), at("back"), [E.clone().add(V(10, -9, 17)), E.clone().add(V(-1, 3, 0)), 40], [E.clone().add(V(8, -6, 14)), E.clone().add(V(-2, 7, -1)), 40], 0.02);
    hudShow("sent", win(t, fr("send", 0.1), fr("send", 0.62))); H.$("wN").textContent = `${Math.round(45 * smooth(prog(t, fr("send", 0.6), at("back") + 1.4)))} h`; hudShow("wait", win(t, fr("send", 0.6), at("back") + 1.4));
  } else if (t < at("orbi")) { // BACK: the answer: readable again
    sets("space"); lightSpace(); skyAt(700); beam(BEAM, t, DISH_TOP, UP, { speed: 6, gap: 1.3, len: 34, size: 1.3, grow: 0.07, ok: smooth(prog(t, fr("back", 0.1), fr("back", 0.3))) });
    if (t < at("back") + 1.4) { H.$("wN").textContent = `${Math.round(45 * smooth(prog(t, fr("send", 0.6), at("back") + 1.4)))} h`; hudShow("wait", win(t, fr("send", 0.6), at("back") + 1.4)); }
    const a = 2.2 + (t - at("back")) * 0.1; const C = V(0, 1.6, 1); move(t, at("back"), at("orbi"), [C.clone().add(V(Math.cos(a) * 12, 2.5, Math.sin(a) * 12)), C, 40], [C.clone().add(V(Math.cos(a + 0.1) * 11, 3, Math.sin(a + 0.1) * 11)), C, 40], 0.02);
    tele(t, "ok"); hudShow("tele", win(t, fr("back", 0.25), at("orbi"))); hudShow("okd", win(t, fr("back", 0.25), at("orbi"))); hudShow("five", win(t, fr("back", 0.45), at("orbi")));
  } else { // ORBI: open what you receive, right away
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const kinds = ["pdf", "image", "video", "doc", "sheet", "slides"]; let kind = "pdf", ki = 0;
    if (t >= at("orbi2")) { const u = clamp((t - at("orbi2")) / (at("orbi3") - at("orbi2"))); ki = Math.min(5, Math.floor(u * 6)); kind = kinds[ki]; }
    const sel = t < at("orbi2") ? Math.min(7, Math.max(0, Math.floor(prog(t, fr("orbi", 0.45), fr("orbi", 0.85)) * 8))) : 0;
    const copied = t > fr("orbi", 0.88) && t < at("orbi2"); const play = kind === "video" ? clamp((t - at("orbi2")) / 3) : 0;
    screen(PH, { kind, sel, copied, play, toast: copied ? "Copied all text" : t > at("orbi3") ? "Opened · nothing downloaded" : "", dl: false }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.35, 3.0), OW(0, 1.25, 0), 36], 0.02);
    else if (t < at("orbi3")) move(t, at("orbi2"), at("orbi3"), [OW(0.25, 1.35, 3.0), OW(0, 1.25, 0), 36], [OW(-0.2, 1.3, 2.9), OW(0, 1.25, 0), 36], 0.02);
    else move(t, at("orbi3"), end("end") + 1.5, [OW(-0.2, 1.3, 2.9), OW(0, 1.25, 0), 36], [OW(0.1, 1.4, 4.2), OW(0, 1.2, 0), 36], 0.02);
    PH.g.rotation.y = 0.12 * Math.sin(t * 0.4);
    for (let i = 0; i < 6; i++) { const e = H.$("kd" + i); if (e) { const on = t >= at("orbi2") && i === ki; e.style.borderColor = on ? green : "rgba(255,255,255,.25)"; e.style.color = on ? green : "#fff"; e.style.transform = on ? "scale(1.08)" : "none"; } }
    hudShow("kinds", win(t, at("orbi2"), at("orbi3") + 0.2)); hudShow("chips", win(t, at("orbi3") + 0.1, at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
