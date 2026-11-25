// Juno: pictures made by people at home. NASA's Juno 3D model (NASA 3D Resources, "Juno (A)", free and without copyright).
// Facts (NASA/JPL, SwRI): Juno entered orbit around Jupiter on 4 July 2016; it is solar-powered: three ~9 m arrays with 18,698
// cells, giving only ~500 W at Jupiter; in January 2016 it became the most distant solar-powered spacecraft; its core electronics
// sit in a titanium vault with walls ~1 cm thick (~200 kg with the electronics inside); JunoCam's raw images are posted online for
// anyone, and citizen scientists process them. Real image: "Great red spot juno 20170712" (NASA / SwRI / MSSS / Gerald Eichstädt /
// Seán Doran, public domain).
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
const SUN = V(0.85, 0.2, 0.5).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
// JUPITER (illustration: banded sphere at the real radius 69,911 km, 1 unit = 100 km; no specific storms are claimed)
const JUP = new THREE.Group(); scene.add(JUP); JUP.visible = false;
const JU = { uSun: { value: SUN }, uT: { value: 0 } };
{ const g = new THREE.SphereGeometry(699.11, 192, 96); g.scale(1, 0.935, 1);
  JUP.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: JU,
    vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uT; varying vec3 vN; varying vec3 vP; varying vec3 vW; ${NOISE}
      void main(){ vec3 n = normalize(vN); float lat = vP.y / 699.11; float l = max(dot(n, uSun), 0.0);
        float w = fbm(vec3(vP.x * 0.006 + uT * 0.002, lat * 14.0, vP.z * 0.006)); float b = 0.5 + 0.5 * sin(lat * 46.0 + w * 4.0);
        vec3 c = mix(vec3(0.62, 0.45, 0.33), vec3(0.93, 0.88, 0.8), b); c = mix(c, vec3(0.55, 0.52, 0.55), smoothstep(0.7, 0.95, abs(lat)));
        c *= 0.85 + 0.3 * fbm(vP * 0.02); vec3 v = normalize(cameraPosition - vW);
        gl_FragColor = vec4(c * (0.03 + 1.4 * l) * (0.65 + 0.35 * pow(max(dot(n, v), 0.0), 0.4)), 1.0); }` }))); }

// JUNO: NASA's own model (≈ metres: each solar arm ~9 units vs the real ~9 m). Dish on top (+y), arms in the x–z plane.
const JNO = new THREE.Group(); scene.add(JNO);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/juno/juno-nasa-A.glb");
  gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.side = THREE.DoubleSide; m.envMapIntensity = 0.9; } });
  JNO.add(gl.scene); }
const JL = (x, y, z) => JNO.localToWorld(V(x, y, z));
const JC = V(0, 0, 0);
