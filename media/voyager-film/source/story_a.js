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
