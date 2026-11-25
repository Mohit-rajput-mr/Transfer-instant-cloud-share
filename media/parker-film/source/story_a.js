// Parker Solar Probe: touching the Sun. NASA's Parker Solar Probe 3D model (NASA 3D Resources, free and without copyright).
// Facts (NASA, JHU APL, Guinness): first NASA spacecraft named after a living person (Eugene Parker, 2017); on 24 Dec 2024 it
// passed 6.1 million km (3.8 million mi) from the Sun's surface at ~692,000 km/h (430,000 mph) — the fastest human-made object;
// New York–Tokyo ≈ 10,850 km → ~56 s at that speed. Heat shield (Thermal Protection System): two carbon-carbon panels around a
// 4.5 in (11.4 cm) carbon-foam core that is 97% air; built for ~2,500 °F (~1,370 °C) on the Sun side; the spacecraft body behind
// it stays ~85 °F (30 °C). Near the Sun it flies autonomously, keeping the shield pointed at the Sun. After the 24 Dec pass the
// team waited; a beacon received late on 26 Dec 2024 confirmed it was healthy.
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
const SUN = V(0, 0, -1);                       // the Sun is straight ahead of the heat shield (−z)
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
// THE SUN, drawn far away at its true angular size from Parker's closest pass (9.8 solar radii from the centre → ~11.7°
// across): granulation, limb darkening, a corona of streamers. Built in code (a star, not a made object).
// =====================================================================================================================
const SR = 1000, SD = 9800;   // radius, distance (units)
const SUNU = { uT: { value: 0 }, uHeat: { value: 1 } };
const SUNG = new THREE.Group(); scene.add(SUNG);
const SUNB = new THREE.Mesh(new THREE.SphereGeometry(SR, 160, 96), new THREE.ShaderMaterial({ uniforms: SUNU, toneMapped: false, fog: false,
  vertexShader: `varying vec3 vN; varying vec3 vW; varying vec3 vP; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT, uHeat; varying vec3 vN; varying vec3 vW; varying vec3 vP; ${NOISE}
    void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float mu = max(dot(n, v), 0.0);
      float g = fbm(vP * 0.045 + vec3(0.0, uT * 0.05, 0.0)); float gc = fbm(vP * 0.16 + vec3(uT * 0.08)); float cells = smoothstep(0.35, 0.75, gc);
      float spots = smoothstep(0.78, 0.86, fbm(vP * 0.008 + 7.0));
      vec3 hot = vec3(1.0, 0.86, 0.55), mid = vec3(1.0, 0.55, 0.18);
      vec3 c = mix(mid, hot, 0.45 + 0.55 * cells) * (0.75 + 0.5 * g); c *= 1.0 - 0.75 * spots;
      float limb = 0.35 + 0.65 * pow(mu, 0.55); c *= limb; c = mix(c * vec3(1.0, 0.6, 0.35), c, mu);
      gl_FragColor = vec4(c * 1.25 * uHeat, 1.0); }` }));
SUNG.add(SUNB);
const CORONA = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: SUNU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT; varying vec2 vU; ${NOISE}
    void main(){ float r = length(vU) * 2.0; float a = atan(vU.y, vU.x); float R0 = 0.333;
      float str = 0.55 + 0.45 * fbm(vec3(a * 3.0, r * 0.6 - uT * 0.04, 1.0)); str *= 0.7 + 0.3 * sin(a * 7.0 + 1.3) * sin(a * 3.0);
      float c = smoothstep(R0 * 0.98, R0 * 1.02, r) * pow(R0 / max(r, 0.001), 3.2) * str * 1.6 + exp(-pow((r - R0) * 40.0, 2.0)) * 0.6;
      c *= smoothstep(1.0, 0.7, r); gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * c, 1.0); }` }));
CORONA.renderOrder = -6; CORONA.frustumCulled = false; SUNG.add(CORONA);
function sunAt(dir = SUN, dist = SD, r = SR) { SUNG.position.copy(H.cam.position).addScaledVector(dir, dist); SUNB.scale.setScalar(r / SR); CORONA.scale.setScalar(r * 6); CORONA.quaternion.copy(H.cam.quaternion); }

// =====================================================================================================================
// PARKER: NASA's own model (≈ metres; shield mount 2.0 m across → ×1.15 to the real 2.3 m shield). The shield faces −z.
// Thermal view (diagram): the model coloured by temperature, hot white-orange at the shield, cool green-blue behind it.
// =====================================================================================================================
const PSP = new THREE.Group(); scene.add(PSP);
const pg = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/parker/parker-nasa.glb");
pg.scene.scale.setScalar(1.15); PSP.add(pg.scene);
const TU = { uK: { value: 0 }, uT: { value: 0 }, uGlow: { value: 0 }, uInv: { value: new THREE.Matrix4() } };   // uK thermal view, uGlow: shield front glowing
const PMATS = [];
pg.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
  const arr = Array.isArray(o.material) ? o.material : [o.material];
  const fixed = arr.map((m) => { const n = m.name || "";
    const q = new THREE.MeshPhysicalMaterial({ map: m.map, color: m.color ? m.color.clone() : new THREE.Color(0xffffff), roughness: /foil/.test(n) ? 0.32 : /black/.test(n) ? 0.7 : 0.45,
      metalness: /foil|metal/.test(n) ? 0.6 : 0.1, envMapIntensity: 0.9, clearcoat: /foil/.test(n) ? 0.3 : 0 });
    if (q.map) { q.map.colorSpace = THREE.SRGBColorSpace; q.map.anisotropy = 8; }
    q.side = THREE.DoubleSide; q.name = n;
    q.onBeforeCompile = (s) => { Object.assign(s.uniforms, TU); s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTL;").replace("#include <begin_vertex>", "#include <begin_vertex>\n vTL = (modelMatrix * vec4(position, 1.0)).xyz;");
      s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uK, uT, uGlow; uniform mat4 uInv; varying vec3 vTL;").replace("#include <dithering_fragment>", `#include <dithering_fragment>
        vec3 lp = (uInv * vec4(vTL, 1.0)).xyz;   // probe-local metres: shield front at z ≈ −1.6
        float front = smoothstep(-1.5, -1.68, lp.z);                       // the Sun-facing skin of the shield
        if (uGlow > 0.0) { float rr0 = length(lp.xy) / 1.3; float shim = 0.9 + 0.1 * sin(lp.x * 9.0 + uT * 2.3) * sin(lp.y * 7.0 - uT * 1.7); vec3 gcol = mix(vec3(1.5, 1.05, 0.5), vec3(1.0, 0.28, 0.04), smoothstep(0.1, 1.0, rr0)) * shim;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gcol * 1.3, front * clamp(uGlow, 0.0, 1.0)) + vec3(0.6, 0.15, 0.02) * front * max(uGlow - 1.0, 0.0) * (0.85 + 0.15 * sin(uT * 3.0 + lp.x * 4.0)); }
        if (uK > 0.0) { float h = clamp((-lp.z - 1.3) / 0.4, 0.0, 1.0);    // 0 = 30 °C body … 1 = 1,400 °C front
          vec3 th = h > 0.0 ? mix(vec3(1.0, 0.35, 0.05), vec3(1.6, 1.4, 1.1), h) : mix(vec3(0.05, 0.45, 0.95), vec3(0.15, 0.9, 0.55), clamp(0.5 + lp.z * 0.1, 0.0, 1.0));
          float stripe = 0.9 + 0.1 * sin(vTL.z * 30.0 - uT * 4.0); gl_FragColor.rgb = mix(gl_FragColor.rgb, th * stripe, uK * 0.85); }`); };
    q.customProgramCacheKey = () => "psp-" + n; PMATS.push(q); return q; });
  o.material = Array.isArray(o.material) ? fixed : fixed[0]; });
const PL = (x, y, z) => PSP.localToWorld(V(x, y, z));
const SHIELD = V(0, 0, -1.65), BODY = V(0, 0, 0.4), BOOMEND = V(0, 0, 5.9);
function pspMat() { PSP.updateMatrixWorld(true); TU.uInv.value.copy(PSP.matrixWorld).invert(); }
