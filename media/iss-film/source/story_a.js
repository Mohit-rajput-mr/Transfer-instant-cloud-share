// The International Space Station: nothing wasted. NASA's ISS 3D model (NASA 3D Resources, "International Space Station (ISS)
// (D) (IGOAL)", free and without copyright). Facts (NASA): crewed without a break since 2 Nov 2000; orbits about every 90 minutes,
// ~27,600 km/h; 16 sunrises a day; truss ~109 m. Water (NASA, June 2023): urine goes to the Urine Processor Assembly (vacuum
// distillation) which leaves a brine; the Brine Processor Assembly (membrane + warm dry air) pulls out the rest; all water goes
// through the Water Processor Assembly (filters, a catalytic reactor, iodine); humidity condensate (crew sweat and breath) joins
// it; total water recovery reached ~98% (before the BPA: 93–94%). 15 countries, 5 space agencies (NASA, Roscosmos, ESA, JAXA, CSA).
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
const RE = 6371, ALT = 420;
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
        float f = pow(1.0 - max(dot(n, v), 0.0), 5.0); col = mix(col, vec3(0.3, 0.55, 1.0) * (0.1 + 1.2 * max(l + 0.15, 0.0)), clamp(f * 0.75, 0.0, 0.6)); col *= 0.6;
        gl_FragColor = vec4(col, 1.0); }` }));
  EARTH.add(ground);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RE + 95, 192, 96), new THREE.ShaderMaterial({ uniforms: EU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float f = pow(clamp(1.0 + dot(n, v) * 1.0, 0.0, 1.0), 4.0) ;
        float r = clamp(dot(-n, uSun) * 0.8 + 0.4, 0.0, 1.0); vec3 c = mix(vec3(0.25, 0.5, 1.2), vec3(1.1, 0.55, 0.3), pow(1.0 - r, 3.0) * 0.4) * r; gl_FragColor = vec4(c * f * 1.3, 1.0); }` }));
  EARTH.add(atm); }

// =====================================================================================================================
// THE STATION: NASA's IGOAL model (1 unit = 10.8 m: its truss is 10.09 units → 109 m). Truss along z, Earth below (−y).
// =====================================================================================================================
const ISS = new THREE.Group(); scene.add(ISS);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/iss/iss-nasa-igoal.glb");
  gl.scene.scale.setScalar(10.8); gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.envMapIntensity = 0.9; m.side = THREE.DoubleSide; } });
  ISS.add(gl.scene); ISS.userData.gl = gl.scene; }
const SL = (x, y, z) => ISS.localToWorld(V(x, y, z));
const IC = V(0, -6, 0);   // centre of the station (m)
const named = (n) => { let r = null; ISS.userData.gl.traverse((o) => { if (!r && o.name === n) r = o; }); return r; };
const CUPOLA = named("Cupola"); const cupolaPos = () => { const v = V(); if (CUPOLA) new THREE.Box3().setFromObject(CUPOLA).getCenter(v); return v; };
