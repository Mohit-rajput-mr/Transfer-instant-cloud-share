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
