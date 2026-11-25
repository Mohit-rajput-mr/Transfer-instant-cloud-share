// Cassini's Grand Finale. NASA's Cassini-Huygens 3D model (NASA 3D Resources, "(A)", free and without copyright).
// Facts (NASA/JPL): at Saturn from 2004 to 2017 (13 years); found that Enceladus sprays water into space from an ocean under its
// ice; low on fuel, it was sent into Saturn so it could never hit and contaminate a moon like Enceladus; its Grand Finale: 22
// weekly dives between Saturn and its rings, never done before; on 15 Sept 2017 it plunged into Saturn, sending data to the end;
// the last signal reached Earth 83 minutes later (~1.4 billion km). Real image: "Backlit Saturn from Cassini Orbiter 2007 May 9"
// (NASA/JPL/Space Science Institute, public domain).
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
const SUN = V(0.8, 0.25, 0.55).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
// SATURN (illustration at real proportions: equatorial radius 60,268 km; rings C 74,658–92,000 km, B 92,000–117,580 km,
// Cassini Division to 122,170 km, A to 136,775 km; 1 unit = 100 km): banded sphere + ring disk with the real radii.
const SAT = new THREE.Group(); scene.add(SAT); SAT.visible = false;
const SR_ = 602.68;
const SATU = { uSun: { value: SUN }, uT: { value: 0 } };
{ const g = new THREE.SphereGeometry(SR_, 192, 96); g.scale(1, 0.902, 1);   // Saturn is ~10% flattened
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: SATU,
    vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uT; varying vec3 vN; varying vec3 vP; varying vec3 vW; ${NOISE}
      void main(){ vec3 n = normalize(vN); float lat = vP.y / ${"602.68"}; float l = max(dot(n, uSun), 0.0);
        float bands = 0.5 + 0.5 * sin(lat * 38.0 + fbm(vec3(vP.x * 0.004, lat * 6.0, vP.z * 0.004)) * 3.0);
        vec3 c = mix(vec3(0.83, 0.72, 0.52), vec3(0.93, 0.86, 0.68), bands); c = mix(c, vec3(0.62, 0.66, 0.72), smoothstep(0.75, 0.95, abs(lat)));
        vec3 v = normalize(cameraPosition - vW); float limb = pow(max(dot(n, v), 0.0), 0.35);
        gl_FragColor = vec4(c * (0.04 + 1.35 * l) * (0.6 + 0.4 * limb), 1.0); }` }));
  SAT.add(m);
  const R0 = 746.58, R1 = 1367.75, rg = new THREE.RingGeometry(R0, R1, 360, 4); const pos = rg.attributes.position, uv = rg.attributes.uv; for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - R0) / (R1 - R0), 0.5); }
  const ring = new THREE.Mesh(rg, new THREE.ShaderMaterial({ uniforms: SATU, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: `varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec2 vU; varying vec3 vW; ${NOISE}
      void main(){ float r = 746.58 + vU.x * (1367.75 - 746.58);
        float a = 0.0; if (r < 920.0) a = 0.25; else if (r < 1175.8) a = 0.85; else if (r < 1221.7) a = 0.06; else a = 0.6;
        a *= 0.75 + 0.25 * nz(vec3(r * 0.35, 0.0, 0.0)); vec3 c = mix(vec3(0.7, 0.64, 0.55), vec3(0.95, 0.9, 0.8), smoothstep(900.0, 1175.0, r));
        gl_FragColor = vec4(c * 1.1, a); }` }));
  ring.rotation.x = -Math.PI / 2; SAT.add(ring); SAT.rotation.z = 0.47; }   // Saturn's 26.7° tilt

// =====================================================================================================================
// CASSINI: NASA's own model (×0.58 → metres: 6.8 m tall). Dish on top (+y), magnetometer boom along −z.
// =====================================================================================================================
const CAS = new THREE.Group(); scene.add(CAS);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/cassini/cassini-nasa-A.glb");
  gl.scene.scale.setScalar(0.58); gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.side = THREE.DoubleSide; m.envMapIntensity = 1.0; } });
  CAS.add(gl.scene); }
const CL = (x, y, z) => CAS.localToWorld(V(x, y, z));
const CC = V(0, -1.4, -1);
