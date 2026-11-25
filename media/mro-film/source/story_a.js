// The orbiter that photographed a landing. NASA's Mars Reconnaissance Orbiter 3D model (NASA 3D Resources, "MRO (C)", free and
// without copyright). Facts (NASA/JPL, HiRISE team, Univ. of Arizona): on 25 May 2008 HiRISE photographed the Phoenix lander hanging
// under its parachute, ~13 km above the surface, seconds after the chute opened; MRO was at 310 km altitude, 760 km from Phoenix,
// moving at 3.4 km/s; the crater behind (Heimdal, ~10 km wide) only appears to be under Phoenix — it is ~20 km behind it; JPL: the
// first time a spacecraft imaged the final descent of another spacecraft onto a planetary body. HiRISE: 0.5 m telescope mirror,
// ~30 cm per pixel from ~300 km. Real image: "Descent of Phoenix with a crater in the background" (NASA/JPL-Caltech/Univ. of
// Arizona, public domain).
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
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
const SUN = V(0.6, 0.45, -0.66).normalize();
// MARS below (generic: rusty terrain from noise + a sand texture; no named features are shown). 1:1000 like the Hubble film.
const RM = 3390, ALT = 300;
const MARSG = new THREE.Group(); scene.add(MARSG); MARSG.position.set(0, -(RM + ALT), 0); MARSG.rotation.z = Math.PI / 2 - 0.4;   // a mid-latitude below, not the pole
const MU = { uSun: { value: SUN }, uT: { value: 0 }, uTex: { value: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 40, 20) } };
{ const ground = new THREE.Mesh(new THREE.SphereGeometry(RM, 256, 128), new THREE.ShaderMaterial({ uniforms: MU,
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; void main(){ vU = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uSun; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; ${NOISE}
      void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float l = dot(n, uSun);
        float a = fbm(vP * 0.004), b = fbm(vP * 0.02 + 3.0), c = fbm(vP * 0.1 + 7.0);
        vec3 rust = mix(vec3(0.55, 0.26, 0.14), vec3(0.78, 0.48, 0.3), a); rust = mix(rust, vec3(0.32, 0.18, 0.12), smoothstep(0.55, 0.75, b) * 0.6);
        rust *= 0.75 + 0.5 * c; rust *= 0.8 + 0.4 * texture2D(uTex, vU).r;
        float cap = smoothstep(0.9, 0.96, abs(normalize(vP).y)); rust = mix(rust, vec3(0.92, 0.9, 0.88), cap);
        vec3 col = rust * max(l, 0.0) * 1.6 + rust * 0.02;
        float f = pow(1.0 - max(dot(n, v), 0.0), 4.0); col = mix(col, vec3(0.85, 0.6, 0.45) * max(l + 0.2, 0.0), clamp(f * 0.5, 0.0, 0.45));
        gl_FragColor = vec4(col, 1.0); }` }));
  MARSG.add(ground);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RM + 40, 128, 64), new THREE.ShaderMaterial({ uniforms: MU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float f = pow(clamp(1.0 + dot(n, v), 0.0, 1.0), 4.0); float r = clamp(dot(-n, uSun) * 0.8 + 0.4, 0.0, 1.0); gl_FragColor = vec4(vec3(0.9, 0.55, 0.35) * r * f * 0.8, 1.0); }` }));
  MARSG.add(atm); }

// =====================================================================================================================
// MRO: NASA's own model (≈ metres: 13.2 units tip to tip of the arrays — real 13.6 m). Arrays along x, the dish on +z side.
// =====================================================================================================================
const MRO = new THREE.Group(); scene.add(MRO);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/mro/mro-nasa-C.glb");
  gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) { m.map.anisotropy = 8; } m.side = THREE.DoubleSide; m.envMapIntensity = 1.0; } });
  MRO.add(gl.scene); }
const ML = (x, y, z) => MRO.localToWorld(V(x, y, z));
const MC = V(0, 0, 0.3);
