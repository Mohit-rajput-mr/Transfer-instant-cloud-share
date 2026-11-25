// Hubble: the washer. NASA's Hubble Space Telescope 3D model (NASA 3D Resources, "free and without copyright").
// Facts (Wikipedia: Hubble Space Telescope): launched 24 April 1990 by Space Shuttle Discovery (STS-31); 2.4 m primary mirror,
// polished smooth to about 10 nm; the first images were blurred: the outer edge of the mirror was too flat by about 2,200 nm
// (about 1/450 mm) → spherical aberration (light from the edge focuses at a different point than light from the centre).
// Cause: the reflective null corrector used to test the mirror had a lens out of position by 1.3 mm; the technician had found an
// unexpected gap between its field lens and its support and filled it with an ordinary metal washer. December 1993: STS-61
// (Servicing Mission 1) installed COSTAR corrective optics and WFPC2 (with its own correction). Hubble went on to determine the
// rate of expansion of the universe (Hubble constant). Orbit ~540 km (2026: ~470 km); 13.2 m long, 11,110 kg.
// Real images used (NASA, public domain): "Hubble PSF with flawed optics" (NASA, ESA, COSTAR team) and PIA22913 "M100 through
// 3 cameras" (NASA, ESA, STScI, Judy Schmidt): WFPC1 1993 vs WFPC2 1994.
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
const SUN = V(0.55, 0.42, -0.72).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
const RE = 6371, ALT = 540;
const EARTH = new THREE.Group(); scene.add(EARTH); EARTH.position.set(0, -(RE + ALT), 0);
const EU = { uSun: { value: SUN }, uT: { value: 0 }, uDay: { value: tex("kit/models/planets/earth_atmos_2048.jpg", true) }, uNight: { value: tex("kit/models/planets/earth_lights_2048.png", true) },
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
// HUBBLE: NASA's own model. 525 model units = 13.2 m → ×0.02512. Loaded, its long axis is world +y (aperture door up): it
// stands upright over the Earth, looking out into deep space; the 9:16 frame suits it.
// =====================================================================================================================
const HST = new THREE.Group(); scene.add(HST);
const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/hubble/hubble-nasa-A.glb");
const HS = 13.2 / 525.5; gl.scene.scale.setScalar(HS); HST.add(gl.scene);
const XU = { uK: { value: 0 }, uT: { value: 0 } };    // X-ray (cutaway) blend
const MATS = [];
gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
  const arr = Array.isArray(o.material) ? o.material : [o.material];
  const fixed = arr.map((m) => { const n = m.name || ""; let q;
    if (/hbltel_3/.test(n)) q = new THREE.MeshPhysicalMaterial({ map: m.map, color: 0xffffff, roughness: 0.42, metalness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.25, envMapIntensity: 0.8 });   // solar arrays
    else q = new THREE.MeshPhysicalMaterial({ map: m.map, color: 0xffffff, roughness: 0.34, metalness: 0.55, envMapIntensity: 1.0 });                                                       // aluminised MLI skin
    if (q.map) { q.map.colorSpace = THREE.SRGBColorSpace; q.map.anisotropy = 8; }
    q.side = THREE.DoubleSide; q.name = n; q.transparent = true;
    q.onBeforeCompile = (s) => { Object.assign(s.uniforms, XU); s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vXW; varying vec3 vXN;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vXW = (modelMatrix * vec4(transformed, 1.0)).xyz; vXN = normalize(mat3(modelMatrix) * objectNormal);");
      s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uK, uT; varying vec3 vXW; varying vec3 vXN;").replace("#include <dithering_fragment>", `#include <dithering_fragment>
        if (uK > 0.0) { vec3 vv = normalize(cameraPosition - vXW); float e = pow(1.0 - abs(dot(normalize(vXN), vv)), 2.0); float scan = 0.85 + 0.15 * sin(vXW.z * 14.0 - uT * 3.0);
          vec3 ghost = vec3(0.35, 0.75, 1.3) * (0.06 + 0.9 * e) * scan; gl_FragColor.rgb = mix(gl_FragColor.rgb, ghost, uK); gl_FragColor.a = mix(1.0, 0.08 + 0.55 * e, uK); }`); };
    q.customProgramCacheKey = () => "hst-" + n; MATS.push(q); return q; });
  o.material = Array.isArray(o.material) ? fixed : fixed[0]; });
function xray(k) { XU.uK.value = k; for (const m of MATS) { m.depthWrite = k < 0.5; } INSIDE.visible = k > 0.01; }
const HL = (x, y, z) => HST.localToWorld(V(x, y, z));

// Inside the tube (shown only in the cutaway, labelled as a diagram): the 2.4 m primary mirror with its central hole and the
// small secondary mirror ~4.9 m in front of it; the focal plane ~1.5 m behind the primary, where the instruments sit.
const INSIDE = new THREE.Group(); HST.add(INSIDE); INSIDE.visible = false; INSIDE.rotation.x = -Math.PI / 2;   // inside coords: +z = the long axis (world +y, aperture up)
const IL = (x, y, z) => INSIDE.localToWorld(V(x, y, z));
const PZ = -2.6, SZ = PZ + 4.9, FZ = PZ - 1.5;
const MIRU = { uT: { value: 0 }, uEdge: { value: 0 } };
const PRIM = (() => { const R = 1.2, r0 = 0.3, Rc = 11.04; const pts = []; for (let i = 0; i <= 48; i++) { const r = lerp(r0, R, i / 48); pts.push(new THREE.Vector2(r, r * r / (2 * Rc))); } pts.push(new THREE.Vector2(R, -0.3), new THREE.Vector2(r0, -0.3), new THREE.Vector2(r0, r0 * r0 / (2 * Rc)));
  const g = new THREE.LatheGeometry(pts, 160); g.rotateX(Math.PI / 2);   // axis → z, the mirror faces +z
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xdfe6f0, metalness: 1, roughness: 0.06, envMapIntensity: 1.6, side: THREE.DoubleSide, emissive: new THREE.Color(0x1a2a3a) }));
  m.material.onBeforeCompile = (s) => { Object.assign(s.uniforms, MIRU); s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vMP;").replace("#include <begin_vertex>", "#include <begin_vertex>\n vMP = position;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uT, uEdge; varying vec3 vMP;").replace("#include <dithering_fragment>", `#include <dithering_fragment>
      float rr = length(vMP.xy); float band = smoothstep(0.85, 1.15, rr) * uEdge; gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(2.2, 0.35, 0.25) * (0.7 + 0.3 * sin(uT * 6.0)), band * 0.7);`); };
  m.material.customProgramCacheKey = () => "prim"; m.position.z = PZ; INSIDE.add(m); return m; })();
{ const rim = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.025, 10, 160), glow(0x9fd4ff, 2.2)); rim.position.z = PZ + 0.07; INSIDE.add(rim); PRIM.userData.rim = rim; }
const SECM = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 48), new THREE.MeshPhysicalMaterial({ color: 0xdfe6f0, metalness: 1, roughness: 0.08 })); SECM.rotation.x = Math.PI / 2; SECM.position.z = SZ; INSIDE.add(SECM);
{ for (const a of [0, TAU / 3, 2 * TAU / 3]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.95, 0.02), glow(0x6fd0ff, 0.5)); sp.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, SZ); sp.rotation.z = a + Math.PI / 2; INSIDE.add(sp); } }
const FOCUS = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), glow(0xffffff, 3)); FOCUS.position.z = FZ; INSIDE.add(FOCUS);
// light path: parallel starlight → primary → secondary → back through the hole → focus. Rays carry an "edge" flag so the flawed
// mirror can send the outer ones to a different focus.
const RAYU = { uT: { value: 0 }, uK: { value: 0 } };
const RAYS = new THREE.Group(); INSIDE.add(RAYS);
function rayPath(r, a, flawed) { const Rc = 11.04, hz = PZ + r * r / (2 * Rc); const hit = V(Math.cos(a) * r, Math.sin(a) * r, hz); const sec = V(Math.cos(a) * r * 0.125, Math.sin(a) * r * 0.125, SZ - 0.02);
  const fz = FZ - (flawed ? (r / 1.2) ** 2 * 0.9 : 0); return [hit.clone().setZ(9), hit, sec, V(Math.cos(a) * 0.01, Math.sin(a) * 0.01, fz)]; }
const rayMat = (edge) => new THREE.ShaderMaterial({ uniforms: { ...RAYU, uE: { value: edge } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT, uK, uE; varying vec2 vU; void main(){ float p = fract(vU.x * 4.0 - uT * 0.8); float pulse = smoothstep(0.0, 0.12, p) * smoothstep(0.3, 0.12, p); float show = step(vU.x, uK * 1.02);
    vec3 c = mix(vec3(1.0, 0.92, 0.7), vec3(1.0, 0.4, 0.3), uE); gl_FragColor = vec4(c * (0.3 + 1.2 * pulse) * show, 1.0); }` });
const RAYSET = { good: [], bad: [] };
for (const flawed of [false, true]) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.2, r = i % 2 ? 1.1 : 0.55; const edge = r > 1 && flawed ? 1 : 0;
  const pts = rayPath(r, a, flawed); const path = new THREE.CurvePath(); for (let k = 0; k < 3; k++) path.add(new THREE.LineCurve3(pts[k], pts[k + 1]));
  const m = new THREE.Mesh(new THREE.TubeGeometry(path, 200, 0.012, 5, false), rayMat(edge)); RAYS.add(m); (flawed ? RAYSET.bad : RAYSET.good).push(m); }
function rays(k, flawed) { RAYU.uK.value = k; RAYSET.good.forEach((m) => (m.visible = !flawed && k > 0)); RAYSET.bad.forEach((m) => (m.visible = flawed && k > 0)); }
// COSTAR (Corrective Optics Space Telescope Axial Replacement): a phone-booth-sized box slid into the aft instrument bay in 1993.
const COSTAR = new THREE.Group(); INSIDE.add(COSTAR);
{ const b = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.9, 2.2, 3, 0.04), new THREE.MeshPhysicalMaterial({ color: 0x3dff8c, transparent: true, opacity: 0.22, roughness: 0.3, depthWrite: false, emissive: new THREE.Color(0x0d4022) }));
  COSTAR.add(b); const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.9, 0.9, 2.2)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.5, 2.2, 1.0), toneMapped: false })); COSTAR.add(e); }
COSTAR.position.set(0, -0.95, FZ - 1.0); COSTAR.visible = false;

// =====================================================================================================================
// THE WASHER: a plain steel washer (hook + the gap scene)
// =====================================================================================================================
function makeWasher() { const pts = []; const r0 = 0.32, r1 = 0.7, h = 0.11, b = 0.02;
  for (const [x, y] of [[r0 + b, -h / 2], [r1 - b, -h / 2], [r1, -h / 2 + b], [r1, h / 2 - b], [r1 - b, h / 2], [r0 + b, h / 2], [r0, h / 2 - b], [r0, -h / 2 + b], [r0 + b, -h / 2]]) pts.push(new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 128); const m = new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.3, envMapIntensity: 1.3, clearcoat: 0.15 });
  m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <begin_vertex>", "#include <begin_vertex>\n vWP = position;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWP; ${NOISE}`).replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      float ang = atan(vWP.z, vWP.x); float brushed = nz(vec3(length(vWP.xz) * 380.0, ang * 2.0, 0.0)); roughnessFactor = clamp(0.18 + 0.22 * brushed + 0.15 * fbm(vWP * 30.0), 0.05, 1.0);`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n diffuseColor.rgb *= 0.85 + 0.2 * fbm(vWP * 12.0);`); };
  m.customProgramCacheKey = () => "washer"; const w = new THREE.Mesh(g, m); w.castShadow = w.receiveShadow = true; return w; }
const HOOKW = makeWasher(); scene.add(HOOKW); HOOKW.visible = false;

// =====================================================================================================================
// LAB (diagrams, a dark studio far away): the mirror's cross-section, designed vs as-made shape, light rays to the focus,
// and the test tool (reflective null corrector) with its misplaced field lens and the washer.
// =====================================================================================================================
const LAB = new THREE.Group(); scene.add(LAB); LAB.position.set(6000, 0, 0); LAB.visible = false;
const LU = { uT: { value: 0 }, uK: { value: 0 }, uD: { value: 0 } };
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(60, 96), new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.55, metalness: 0.2 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.62; fl.receiveShadow = true; LAB.add(fl);
  const grid = new THREE.GridHelper(40, 80, 0x1d3a52, 0x13202c); grid.position.y = -0.615; grid.material.transparent = true; grid.material.opacity = 0.5; LAB.add(grid); }
const FOC = 5.52, RC = 2 * FOC, EXAG = 25000, DEV = 2.2e-6 * EXAG;           // focal length 5.52 m; the 2,200 nm error drawn 25,000× larger
const sagD = (r) => r * r / (2 * RC);                                             // designed surface (paraxial)
const devF = (r) => { const u = clamp((Math.abs(r) - 0.62) / 0.58); return -DEV * u * u; };   // as made: the outer zone too flat (lower)
// the mirror slab: a slice through the 2.4 m mirror, 0.3 m thick, with the central hole
const SLAB = new THREE.Group(); LAB.add(SLAB);
for (const sgn of [-1, 1]) { const sp = new THREE.Shape(); const N = 60; sp.moveTo(sgn * 0.3, -0.3); sp.lineTo(sgn * 1.2, -0.3);
  for (let i = 0; i <= N; i++) { const r = lerp(1.2, 0.3, i / N); sp.lineTo(sgn * r, sagD(r)); } sp.lineTo(sgn * 0.3, -0.3);
  const g = new THREE.ExtrudeGeometry(sp, { depth: 0.5, bevelEnabled: false, curveSegments: 64 }); g.translate(0, 0, -0.25);
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x7f9fb4, roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.9, envMapIntensity: 1.4, emissive: new THREE.Color(0x0c1a26) }));
  m.castShadow = true; SLAB.add(m); }
// coloured profile lines: designed (green) and as made (red); a 3D tube each
function profTube(fn, col, w) { const pts = []; for (let i = 0; i <= 120; i++) { const r = lerp(-1.2, 1.2, i / 120); if (Math.abs(r) < 0.3) continue; pts.push(V(r, fn(r) + 0.004, 0.26)); }
  const segs = [pts.filter((p) => p.x < 0), pts.filter((p) => p.x > 0)]; const grp = new THREE.Group();
  for (const s of segs) grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s), 120, w, 8, false), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: true }))); LAB.add(grp); return grp; }
const PDES = profTube(sagD, new THREE.Color(0.3, 2.0, 0.8), 0.009), PMADE = profTube((r) => sagD(r) + devF(r), new THREE.Color(2.4, 0.35, 0.25), 0.011);
const morph = (k) => { PMADE.children.forEach((m) => (m.material.opacity = k)); };
// rays: straight down onto the mirror, reflected up to the focus. Centre rays → designed focus; edge rays → farther (flaw)
const LRAYS = []; const LRU = { uT: LU.uT, uK: { value: 0 } };
for (let i = 0; i < 16; i++) { const r = (i < 8 ? -1 : 1) * lerp(0.36, 1.16, (i % 8) / 7); const edge = Math.abs(r) > 0.75 ? 1 : 0;
  const hy = sagD(r) + devF(r); const fy = FOC + (edge ? 1.0 * clamp((Math.abs(r) - 0.62) / 0.58) ** 2 + 0.25 : 0);
  const path = new THREE.CurvePath(); path.add(new THREE.LineCurve3(V(r, 8, 0), V(r, hy, 0))); path.add(new THREE.LineCurve3(V(r, hy, 0), V(0, fy, 0)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(path, 160, 0.008, 5, false), new THREE.ShaderMaterial({ uniforms: { ...LRU, uE: { value: edge } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT, uK, uE; varying vec2 vU; void main(){ float p = fract(vU.x * 3.0 - uT * 0.7); float pulse = smoothstep(0.0, 0.1, p) * smoothstep(0.25, 0.1, p); float show = step(vU.x, uK * 1.02);
      vec3 c = mix(vec3(1.0, 0.95, 0.75), vec3(1.0, 0.38, 0.28), uE); gl_FragColor = vec4(c * (0.35 + 1.3 * pulse) * show, 1.0); }` }));
  m.userData.edge = edge; LAB.add(m); LRAYS.push(m); }
const FC1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), glow(0x3dff8c, 3)); FC1.position.set(0, FOC, 0); LAB.add(FC1);
const FC2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), glow(0xff5a4a, 3)); FC2.position.set(0, FOC + 1.25, 0); LAB.add(FC2);
function labRays(k, t) { LRU.uK.value = k; FC1.visible = FC2.visible = k > 0.85; const s = 1 + 0.25 * Math.sin(t * 6); FC1.scale.setScalar(s); FC2.scale.setScalar(s); LRAYS.forEach((m) => (m.visible = k > 0)); }
// the test tool (diagram): a bench, a light at one end, two small mirrors and the field lens in its mount. The lens sat 1.3 mm
// out of place; the gap at its mount was filled with a washer. The 1.3 mm is drawn exaggerated.
const BENCH = new THREE.Group(); LAB.add(BENCH); BENCH.position.set(0, 0, 0); BENCH.visible = false;
const LENS = new THREE.Group(), LENS_GHOST = new THREE.Group(), BW = makeWasher();
{ const steel = new THREE.MeshPhysicalMaterial({ color: 0x8d949c, metalness: 1, roughness: 0.32 }), dark = new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.5, metalness: 0.5 });
  const rail = sh(new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.08, 4.2, 3, 0.02), steel)); rail.position.set(0, -0.5, 0); BENCH.add(rail);
  const post = (z, h) => { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 16), steel)); p.position.set(0, -0.46 + h / 2, z); BENCH.add(p); const f = sh(new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.2, 2, 0.015), dark)); f.position.set(0, -0.44, z); BENCH.add(f); };
  const src = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), glow(0xfff2c8, 4)); src.position.set(0, 0.25, 1.9); BENCH.add(src); post(1.9, 0.7);
  for (const z of [-1.7, -0.3]) { post(z, 0.7); const mm = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 48), new THREE.MeshPhysicalMaterial({ color: 0xdfe6f0, metalness: 1, roughness: 0.05 }))); mm.rotation.x = Math.PI / 2; mm.position.set(0, 0.25, z); BENCH.add(mm);
    const ring = sh(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 10, 48), dark)); ring.position.set(0, 0.25, z); BENCH.add(ring); }
  // field lens + its mount (the support it should sit flush against)
  post(0.9, 0.7); const sup = sh(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 48), dark)); sup.position.set(0, 0.25, 0.9); BENCH.add(sup);
  const lensG = new THREE.SphereGeometry(0.5, 48, 24, 0, TAU, 0, 0.34); lensG.translate(0, -0.5 * Math.cos(0.34), 0); const lensM = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.02, transmission: 1, thickness: 0.06, ior: 1.5, transparent: true });
  for (const s of [1, -1]) { const h = new THREE.Mesh(lensG, lensM); h.rotation.x = s * Math.PI / 2; LENS.add(h); }
  const lr = sh(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 10, 48), steel)); LENS.add(lr); LENS.position.set(0, 0.25, 0.9 - 0.16); BENCH.add(LENS);
  for (const s of [1, -1]) { const h = new THREE.Mesh(lensG, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.8, 0.8), wireframe: true, transparent: true, opacity: 0.35, toneMapped: false })); h.rotation.x = s * Math.PI / 2; LENS_GHOST.add(h); }
  LENS_GHOST.position.set(0, 0.25, 0.9 - 0.04); BENCH.add(LENS_GHOST);
  BW.scale.set(0.27, 0.42, 0.27); BW.rotation.x = Math.PI / 2; BENCH.add(BW);
  // the beam through the tool
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 0.9), transparent: true, opacity: 0.55, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.rotation.x = Math.PI / 2; beam.position.set(0, 0.25, 0.1); BENCH.add(beam); BENCH.userData.beam = beam; }
/** off: lens displacement 0..1 (1 = the 1.3 mm error, exaggerated); w: washer slide-in 0..1 */
function bench(off, w, t) { LENS.position.z = 0.9 - 0.04 - 0.07 * off; LENS_GHOST.visible = off > 0.02; LENS_GHOST.children.forEach((m) => (m.material.opacity = 0.25 + 0.15 * Math.sin(t * 5)));
  BW.visible = w > 0; BW.position.set(0, 0.25 + (1 - ease(clamp(w))) * 0.9, 0.84); BW.rotation.set(Math.PI / 2, 0, (1 - w) * 2.0); }

// =====================================================================================================================
// THE REAL IMAGES (NASA, public domain), on archive cards: a star in 1990 (flawed), M100 in 1993 → 1994 (corrected)
// =====================================================================================================================
const PANELS = new THREE.Group(); scene.add(PANELS); PANELS.position.set(-6000, 0, 0); PANELS.visible = false;
const PU = { uT: { value: 0 }, uW: { value: 0 }, uA: { value: tex("ref/m100_a.jpg", true) }, uB: { value: tex("ref/m100_b.jpg", true) } };
function card3d(w, h, mat, label) { const g = new THREE.Group(); const fr0 = sh(new THREE.Mesh(new RoundedBoxGeometry(w + 0.12, h + 0.32, 0.05, 3, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x15181d, roughness: 0.4, metalness: 0.5, clearcoat: 0.6 }))); fr0.position.set(0, -0.08, -0.03); g.add(fr0);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); g.add(p);
  const lt = H.canvasTex(1024, 64, (c) => { c.fillStyle = "#15181d"; c.fillRect(0, 0, 1024, 64); c.fillStyle = "#aab3bd"; c.font = "700 34px M"; c.fillText(label, 16, 44); });
  const l = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 64 / 1024), new THREE.MeshBasicMaterial({ map: lt, toneMapped: false })); l.position.set(0, -h / 2 - 0.12, 0.001); g.add(l); return g; }
const imgMat = (u) => new THREE.MeshBasicMaterial({ map: tex(u, true), toneMapped: false });
const C_PSF = card3d(1.6, 1.6, imgMat("ref/psf.jpg"), "A STAR, SEEN BY HUBBLE · NASA"); PANELS.add(C_PSF); C_PSF.position.set(0, 1.0, 0);
const C_M1 = card3d(1.6, 1.6, new THREE.MeshBasicMaterial({ map: PU.uA.value, toneMapped: false }), "GALAXY M100 · 1993 · NASA/ESA"); PANELS.add(C_M1); C_M1.position.set(0, -1.0, 0);
const WIPE = card3d(2.2, 2.2, new THREE.ShaderMaterial({ uniforms: PU, toneMapped: false,
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D uA, uB; uniform float uW; varying vec2 vU; void main(){ float x = vU.x - (1.0 - vU.y) * 0.18; float s = step(x, uW * 1.2 - 0.1);
    vec3 a = pow(texture2D(uA, vU).rgb, vec3(2.2)), b = pow(texture2D(uB, vU).rgb, vec3(2.2)); vec3 c = mix(a, b, s); float line = smoothstep(0.006, 0.0, abs(x - (uW * 1.2 - 0.1)));
    c += vec3(0.5, 2.0, 1.0) * line; gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0); }` }), "GALAXY M100 · 1993 → 1994 · NASA/ESA/STScI"); PANELS.add(WIPE); WIPE.position.set(0, 0, -0.01);

// =====================================================================================================================
// ORBI: one phone, its own passcode; twelve wrong tries (pips go red one by one), then the file locks itself
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const IMG = { ph: await img("shots_live/phone.png") };
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.position.y = 0; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const PIPS = Array.from({ length: 12 }, (_, i) => { const a = Math.PI / 2 - i / 12 * TAU; const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.3, 0.35), toneMapped: false }));
  m.position.set(Math.cos(a) * 1.45, 1.25 + Math.sin(a) * 1.45, -0.05); ORS.add(m); return m; });
const LOCK = makeLock(0xff3a2d); LOCK.scale.setScalar(0.9); LOCK.position.set(0, 1.55, 0.3); ORS.add(LOCK); LOCK.visible = false;
const GUESS = ["4821", "1990", "0000", "1234", "7777", "2400", "1993", "5150", "9999", "3141", "2718", "8642"];
function drawPh(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "rgba(8,10,14,.95)"; rr(g, 40, 470, 700, 760, 36); g.fill(); g.strokeStyle = st.locked ? "#ff4a3d" : "rgba(255,255,255,.15)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#fff"; g.font = "800 50px M"; g.fillText("hubble-1990.jpg", 84, 556); g.fillStyle = "#9aa3ad"; g.font = "700 38px M"; g.fillText("Enter passcode", 84, 612);
  for (let i = 0; i < 4; i++) { const x = 84 + i * 158; g.fillStyle = "rgba(255,255,255,.07)"; rr(g, x, 640, 136, 150, 22); g.fill(); g.strokeStyle = st.bad ? "#ff4a3d" : "rgba(255,255,255,.25)"; g.lineWidth = 3; g.stroke();
    if (st.n > i) { g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 68, 715, 16, 0, TAU); g.fill(); } }
  g.font = "800 40px M"; if (st.locked) { g.fillStyle = "#ff4a3d"; g.fillText("Locked: too many", 84, 880); g.fillText("wrong attempts", 84, 926); }
  else if (st.tries > 0) { g.fillStyle = "#ff6b5e"; g.fillText("Wrong passcode", 84, 870); g.fillText(`${Math.max(0, 12 - st.tries)} tries left`, 84, 920); }
  g.fillStyle = st.locked ? "rgba(255,74,61,.18)" : "rgba(61,255,140,.16)"; rr(g, 84, 1000, 612, 120, 26); g.fill(); g.fillStyle = st.locked ? "#ff4a3d" : green; g.font = "900 44px D"; g.fillText(st.locked ? "LOCKED" : "UNLOCK", 300, 1076); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "13.2 m long"], arrays: ["Solar arrays", "#ffd166", "power from the Sun"], prim: ["Primary mirror", "#cfe6ff", "2.4 m wide"],
  secm: ["Secondary mirror", "#cfd6dd", "bounces light back"], focusL: ["Focus", "#3dff8c", "where the cameras sit"], edgeL: ["The edge", "#ff6b5e", "too flat"],
  designL: ["Designed shape", "#3dff8c", ""], madeL: ["As made", "#ff6b5e", "edge too flat"], c1: ["Light from the centre", "#3dff8c", "focuses here"], c2: ["Light from the edge", "#ff6b5e", "focuses farther away"],
  lensL: ["Field lens", "#ff6b5e", "1.3 mm out of place"], ghostL: ["Where it belonged", "#3dff8c", ""], washL: ["An ordinary metal washer", "#e6e9ee", "filling the gap"],
  costarL: ["COSTAR", "#3dff8c", "corrective optics · 1993"], sharpL: ["One sharp focus", "#3dff8c", "again"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 170px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
hudEl("launch", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("LAUNCHED", "24 APR 1990")}${card("CARRIED BY", "DISCOVERY", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("mstats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("MIRROR", "2.4 m", "#cfe6ff")}${card("SMOOTH TO", "~10 nm", "#3dff8c")}</div>`, { left: "0px", top: "1440px" });
hudEl("nmN", big("nN", "0 nm", "TOO FLAT AT THE EDGE", "#ff6b5e", "#fff"), { left: "0px", top: "200px" });
hudEl("frac", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("THAT IS ABOUT", "1/450 mm", "#ff6b5e")}</div>`, { left: "0px", top: "1440px" });
hudEl("exag", pill("SHAPE ERROR DRAWN 25,000× LARGER"), { left: "250px", top: "1120px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("sph", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #ff6b5e;font:900 50px D;color:#fff">SPHERICAL ABERRATION</div></div>`, { left: "0px", top: "230px" });
hudEl("mm", big("mmN", "1.3 mm", "ONE LENS, OUT OF PLACE", "#ff6b5e", "#fff"), { left: "0px", top: "200px" });
hudEl("tool", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("THE TEST TOOL", "NULL CORRECTOR", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("first", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("FIRST IMAGES", "BLURRED", "#ff6b5e")}</div>`, { left: "0px", top: "1660px" });
hudEl("fix", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("DECEMBER", "1993", "#3dff8c")}${card("MISSION", "STS-61", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("ba", `<div style="width:1080px;display:flex;justify-content:space-between;padding:0 120px;box-sizing:border-box">${card("BEFORE", "1993", "#ff6b5e")}${card("AFTER", "1994", "#3dff8c")}</div>`, { left: "0px", top: "1500px" });
hudEl("hconst", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("HUBBLE MEASURED", "HOW FAST THE UNIVERSE EXPANDS", "#ffd166")}</div>`, { left: "0px", top: "1440px" });
hudEl("tries", big("tN", "0", "WRONG TRIES", "#fff", "#ff6b5e"), { left: "0px", top: "190px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["OWN PASSCODE", "12 TRIES", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; EARTH.visible = HST.visible = sp; SKYG.visible = sp || s === "panels"; LAB.visible = s === "lab"; PANELS.visible = s === "panels"; ORS.visible = s === "orbi";
  HOOKW.visible = false; scene.fog = null; scene.background = s === "lab" ? new THREE.Color(0x06080b) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(2600); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.3 * k; H.key.position.copy(SUN).multiplyScalar(60); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 140 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x7d9ad0); H.hemi.groundColor.set(0x2a4a7a); H.hemi.intensity = 0.5; H.envK.value = 0.85; H.rimA.intensity = 0.5; H.rimB.intensity = 0.3; }
function lightLab(at0) { H.hemi.intensity = 0.3; H.key.color.set(0xfff1e0); H.key.intensity = 2.6; H.key.position.copy(at0).add(V(4, 9, 6)); H.key.target.position.copy(at0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = 0.3; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const LW = (x, y, z) => LAB.localToWorld(V(x, y, z)), PW = (x, y, z) => PANELS.localToWorld(V(x, y, z)), OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const HC = V(0, 0, 0);

H.frame("Twelve wrong tries, and the file locks itself.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.28; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000);
  EU.uT.value = t; XU.uT.value = t; RAYU.uT.value = t; MIRU.uT.value = t; LU.uT.value = t; PU.uT.value = t;
  xray(0); rays(0, false); COSTAR.visible = false; MIRU.uEdge.value = 0; BENCH.visible = false; SLAB.visible = true; PDES.visible = PMADE.visible = true; labRays(0, t); morph(0);
  C_PSF.visible = C_M1.visible = WIPE.visible = false; LOCK.visible = false; HST.rotation.set(0, 0, 0); HST.updateMatrixWorld(true);

  if (t < at("this")) { // HOOK: a plain washer, spinning; we fly through its hole to Hubble above the Earth
    sets("space"); lightSpace(); HOOKW.visible = true; const k = prog(t, 0, at("this"));
    HOOKW.position.set(0, 2.2, 30); HOOKW.rotation.set(Math.PI / 2 + 0.12 * Math.sin(t * 0.9), 0, t * 0.6); HOOKW.scale.setScalar(1.0);
    move(t, 0, at("this"), [V(0.9, 2.6, 33.4), V(0, 2.2, 30), 38], [V(0, 2.2, 27.5), V(0, 0.5, 0), 40], 0.02);
    if (t > fr("hook", 0.78)) HOOKW.visible = false;
    title(t, fr("hook", 0.04), fr("hook", 0.55), "One ordinary washer", "Half blind", 150); skyAt();
  } else if (t < at("blur")) { // HUBBLE over the Earth; then the cutaway: the mirror, starlight to focus
    sets("space"); lightSpace();
    if (t < at("mirror")) { const a = 0.6 + (t - at("this")) * 0.07; move(t, at("this"), at("mirror"), [V(Math.sin(a) * 24, 7.5, Math.cos(a) * 24), V(0, -0.6, 0), 40], [V(Math.sin(a + 0.05) * 21, 6.8, Math.cos(a + 0.05) * 21), V(0, -1.0, 0), 40], 0.03);
      hudShow("launch", win(t, fr("this", 0.45), at("mirror"))); callout("nasa", t, fr("this", 0.1), fr("this", 0.55), HL(1.6, 3.5, 1.6), 760, 1150); callout("arrays", t, fr("this", 0.5), at("mirror"), HL(-4.5, -3.3, 0), 300, 1150);
      title(t, fr("this", 0.03), fr("this", 0.4), "Hubble Space Telescope", "Since 1990", 150); }
    else { const k = smooth(prog(t, at("mirror"), fr("mirror", 0.3))); xray(k); rays(smooth(prog(t, fr("mirror", 0.35), fr("mirror", 0.95))), false);
      move(t, at("mirror"), at("blur"), [V(10, 2.5, 9), V(0, -0.8, 0), 40], [V(8.5, 1.5, 7.5), V(0, -1.4, 0), 40], 0.02);
      hudShow("mstats", win(t, fr("mirror", 0.2), at("blur"))); hudShow("diag", win(t, fr("mirror", 0.15), at("blur")));
      callout("prim", t, fr("mirror", 0.3), at("blur"), IL(0, 1.0, PZ), 760, 1390); callout("secm", t, fr("mirror", 0.55), at("blur"), IL(0, 0.1, SZ), 300, 700); }
    skyAt();
  } else if (t < at("edge")) { // THE FIRST IMAGES (real, NASA): a star and galaxy M100, blurred
    sets("panels"); C_PSF.visible = C_M1.visible = true; H.key.castShadow = false; H.hemi.intensity = 0.8; H.key.intensity = 1.2; H.key.position.copy(PW(3, 5, 8)); H.key.target.position.copy(PW(0, 0, 0));
    move(t, at("blur"), at("edge"), [PW(0.6, 0.2, 6.4), PW(0, 0, 0), 40], [PW(0.25, 0.05, 5.6), PW(0, 0, 0), 40], 0.02); hudShow("first", win(t, fr("blur", 0.1), at("edge"))); skyAt();
  } else if (t < at("washer")) { // LAB: designed vs as made; then the light: two different focus points
    sets("lab"); lightLab(LW(0, 0.5, 0));
    if (t < at("why")) { morph(smooth(prog(t, fr("edge", 0.1), fr("edge", 0.4)))); move(t, at("edge"), at("why"), [LW(0.95, 0.45, 2.6), LW(0.8, -0.05, 0.2), 34], [LW(0.9, 0.3, 2.1), LW(0.85, -0.05, 0.2), 34], 0.01);
      H.$("nN").textContent = `${Math.round(2200 * smooth(prog(t, fr("edge", 0.1), fr("edge", 0.5)))).toLocaleString("en-US")} nm`; hudShow("nmN", win(t, fr("edge", 0.05), at("why"))); hudShow("frac", win(t, fr("edge", 0.6), at("why"))); hudShow("exag", win(t, fr("edge", 0.15), at("why")));
      callout("designL", t, fr("edge", 0.15), at("why"), LW(0.5, sagD(0.5) + 0.01, 0.26), 300, 1390); callout("madeL", t, fr("edge", 0.4), at("why"), LW(1.12, sagD(1.12) + devF(1.12), 0.26), 760, 1390); }
    else { labRays(smooth(prog(t, at("why"), fr("why", 0.55))), t); morph(1); move(t, at("why"), at("washer"), [LW(3.0, 3.8, 10.6), LW(0, 3.3, 0), 40], [LW(2.4, 3.6, 9.6), LW(0, 3.3, 0), 40], 0.01);
      callout("c1", t, fr("why", 0.45), at("washer"), FC1.getWorldPosition(V()), 760, 900); callout("c2", t, fr("why", 0.55), at("washer"), FC2.getWorldPosition(V()), 760, 520); hudShow("sph", win(t, fr("why", 0.6), at("washer"))); hudShow("exag", win(t, at("why"), fr("why", 0.4))); }
  } else if (t < at("fix")) { // LAB: the test tool, its misplaced lens; the washer in the gap
    sets("lab"); lightLab(LW(0, 0.3, 0.6)); SLAB.visible = false; PDES.visible = PMADE.visible = false; BENCH.visible = true;
    if (t < at("gap")) { bench(smooth(prog(t, fr("washer", 0.3), fr("washer", 0.6))), 0, t); move(t, at("washer"), at("gap"), [LW(2.6, 1.1, 2.6), LW(0, 0.15, 0.5), 36], [LW(2.1, 0.9, 2.2), LW(0, 0.2, 0.6), 36], 0.01);
      hudShow("tool", win(t, fr("washer", 0.05), fr("washer", 0.5))); hudShow("mm", win(t, fr("washer", 0.5), at("gap"))); hudShow("diag", win(t, fr("washer", 0.05), at("gap")));
      callout("lensL", t, fr("washer", 0.55), at("gap"), LENS.getWorldPosition(V()), 760, 1390); callout("ghostL", t, fr("washer", 0.65), at("gap"), LENS_GHOST.getWorldPosition(V()).add(V(0, 0.18, 0)), 300, 760); }
    else { bench(1, smooth(prog(t, fr("gap", 0.25), fr("gap", 0.75))), t); move(t, at("gap"), at("fix"), [LW(1.2, 0.75, 2.2), LW(0, 0.3, 0.84), 30], [LW(0.95, 0.62, 1.9), LW(0, 0.3, 0.84), 30], 0.01);
      callout("washL", t, fr("gap", 0.72), at("fix"), BW.getWorldPosition(V()), 760, 1390); hudShow("diag", win(t, at("gap"), at("fix"))); }
  } else if (t < at("orbi")) { // FIX (1993): COSTAR into the aft bay, the light comes to one focus again; then the real before/after
    if (t < fr("sharp", 0.5)) {
      if (t < at("sharp")) { sets("space"); lightSpace(); xray(1); COSTAR.visible = true; const k = smooth(prog(t, fr("fix", 0.2), fr("fix", 0.6))); COSTAR.position.set(0, -0.95 - (1 - k) * 4.5, FZ - 1.0);
        rays(1, t < fr("fix", 0.62)); move(t, at("fix"), at("sharp"), [V(8.5, -2.0, 8.5), V(0, -3.6, 0), 40], [V(7.2, -2.6, 7.0), V(0, -4.0, 0), 40], 0.02);
        hudShow("fix", win(t, fr("fix", 0.05), at("sharp"))); hudShow("diag", win(t, fr("fix", 0.1), at("sharp"))); callout("costarL", t, fr("fix", 0.55), at("sharp"), COSTAR.getWorldPosition(V()), 760, 1390); callout("sharpL", t, fr("fix", 0.7), at("sharp"), IL(0, 0, FZ), 300, 700); skyAt(); }
      else { sets("panels"); WIPE.visible = true; H.key.castShadow = false; H.hemi.intensity = 0.8; PU.uW.value = smooth(prog(t, fr("sharp", 0.04), fr("sharp", 0.4)));
        move(t, at("sharp"), fr("sharp", 0.5), [PW(0.3, 0.1, 4.6), PW(0, 0, 0), 40], [PW(0.1, 0, 4.2), PW(0, 0, 0), 40], 0.01); hudShow("ba", win(t, at("sharp"), fr("sharp", 0.5))); skyAt(); } }
    else { sets("space"); lightSpace(); const a = 2.4 + (t - at("sharp")) * 0.05; move(t, fr("sharp", 0.5), at("orbi"), [V(Math.sin(a) * 30, 12, Math.cos(a) * 30), V(0, -6, 0), 42], [V(Math.sin(a + 0.04) * 34, 13, Math.cos(a + 0.04) * 34), V(0, -7, 0), 42], 0.02);
      hudShow("hconst", win(t, fr("sharp", 0.55), at("orbi"))); skyAt(); }
  } else { // ORBI: its own passcode; twelve wrong tries, then locked
    sets("orbi"); H.key.color.set(0xfff1e0); H.key.intensity = 2.2; H.key.position.copy(OW(3, 8, 6)); H.key.target.position.copy(OW(0, 1, 0)); H.key.castShadow = true; H.hemi.intensity = 0.5; H.hemi.color.set(0x8090a8); H.envK.value = 0.8; H.rimA.intensity = 0.8;
    const tries = t < at("orbi2") ? Math.floor(4 * smooth(prog(t, fr("orbi", 0.25), at("orbi2")))) : Math.min(12, 4 + Math.floor(8.999 * prog(t, at("orbi2"), fr("orbi2", 0.78))));
    const locked = tries >= 12 && t > fr("orbi2", 0.8); const cyc = ((t * 2.6) % 1); const n = locked ? 0 : tries < 12 ? Math.min(4, Math.floor(cyc * 5)) : 4;
    screen(PH, { n, tries, bad: !locked && cyc > 0.8 && tries > 0, locked }, drawPh);
    PIPS.forEach((p, i) => { const on = i < tries; p.material.color.setRGB(on ? 2.4 : 0.25, on ? 0.35 : 0.3, on ? 0.28 : 0.35); p.scale.setScalar(on ? 1.25 : 1); });
    LOCK.visible = locked; if (locked) { const k = back(clamp(prog(t, fr("orbi2", 0.8), fr("orbi2", 0.95)))); LOCK.scale.setScalar(0.9 * k); LOCK.rotation.y = 0.3 * Math.sin(t * 1.5); }
    H.$("tN").textContent = String(tries); hudShow("tries", win(t, fr("orbi", 0.25), at("orbi3")));
    if (t < at("orbi3")) move(t, at("orbi"), at("orbi3"), [OW(0.6, 1.5, 5.8), OW(0, 1.25, 0), 40], [OW(0.2, 1.4, 5.1), OW(0, 1.25, 0), 40], 0.05);
    else move(t, at("orbi3"), at("end"), [OW(0.2, 1.4, 5.1), OW(0, 1.25, 0), 40], [OW(0.1, 1.35, 4.8), OW(0, 1.25, 0), 40], 0.05);
    hudShow("chips", win(t, fr("orbi3", 0.1), at("end")));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
