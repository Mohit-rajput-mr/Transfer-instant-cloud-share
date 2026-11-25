// OSIRIS-REx: the asteroid that almost swallowed it. NASA's OSIRIS-REx 3D model (NASA 3D Resources, free and without copyright).
// Facts (NASA, Univ. of Arizona): on 20 Oct 2020 it touched asteroid Bennu (Touch-And-Go): a puff of nitrogen stirred up material
// into the sampler head; the surface is nearly cohesionless ("like a plastic ball pit"); the arm sank almost half a metre; about six
// seconds after contact it fired its thrusters to back away while still sinking — without them it would have sunk into Bennu. The
// sample capsule landed in Utah on 24 Sept 2023. Two of the 35 fasteners on the sampler head could not be removed with the tools
// approved for the glovebox; new tools were built; both were removed in January 2024. Real image: "Bennu mosaic OSIRIS-REx"
// (NASA/Goddard/University of Arizona, public domain).
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
const SUN = V(0.7, 0.5, 0.5).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
// =====================================================================================================================
// OSIRIS-REx: NASA's own model (model units ×0.18 → metres: the arrays span 6.2 m). Sample capsule on top (+y); the sampler arm is stowed (one mesh), so it is never shown extended.
// =====================================================================================================================
const OREX = new THREE.Group(); scene.add(OREX);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/osirisrex/osirisrex-nasa.glb");
  gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.side = THREE.DoubleSide; m.envMapIntensity = 0.9; } });
  gl.scene.scale.setScalar(0.18); OREX.add(gl.scene); OREX.userData.bb = new THREE.Box3().setFromObject(gl.scene); }
const OL = (x, y, z) => OREX.localToWorld(V(x, y, z));
