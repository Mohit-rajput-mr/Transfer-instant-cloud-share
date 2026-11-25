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

// =====================================================================================================================
// THE ORBIT (diagram, far away): the Sun to scale with Mercury's and Venus's orbits and Parker's final orbit (closest
// 9.86 solar radii from the centre = 6.1 million km from the surface; farthest ≈ Venus's distance). 1 solar radius = 0.1.
// =====================================================================================================================
const ORB = new THREE.Group(); scene.add(ORB); ORB.position.set(0, 9000, 0); ORB.visible = false;
const RS = 0.1, PERI = 9.86 * RS, VEN = 155.5 * RS, MER = 83.2 * RS;
const ORBA = (PERI + VEN * 0.98) / 2, ORBE = (VEN * 0.98 - PERI) / (VEN * 0.98 + PERI);
const ellipse = (th) => { const r = ORBA * (1 - ORBE * ORBE) / (1 + ORBE * Math.cos(th)); return V(Math.cos(th) * r, 0, Math.sin(th) * r); };
{ const sun = new THREE.Mesh(new THREE.SphereGeometry(RS, 48, 24), glow(0xffc070, 4)); ORB.add(sun);
  const ring = (r, c, op = 0.8) => { const pts = []; for (let i = 0; i <= 512; i++) { const a = i / 512 * TAU; pts.push(V(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), transparent: true, opacity: op, toneMapped: false })); ORB.add(l); return l; };
  ring(MER, 0xb9a48f); ring(VEN, 0xe8c87a);
  const pts = []; for (let i = 0; i <= 1024; i++) pts.push(ellipse(i / 1024 * TAU));
  ORB.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(0.6, 1.4, 2.0), toneMapped: false })));
  const grid = new THREE.PolarGridHelper(VEN * 1.1, 16, 10, 128, 0x1d3a52, 0x13202c); grid.material.transparent = true; grid.material.opacity = 0.3; ORB.add(grid); }
const PDOT = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 12), glow(0xffffff, 4)); ORB.add(PDOT);
const OW2 = (v) => ORB.localToWorld(v.clone());

// =====================================================================================================================
// NEW YORK → TOKYO on the Earth (1:1,000,000), a great-circle arc drawn at Parker's speed: 10,850 km in ~56 s.
// =====================================================================================================================
const ll = (lat, lon, r = RE * 1.003) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); };
// three's sphere UVs put lon 0 at -x... fix the texture longitude by rotating the ground: measured with the day map (lon = -90 at +z)
const NYC = ll(40.71, -74.0), TYO = ll(35.68, 139.69);
const ARC = (() => { const N = 200, pts = []; const a = NYC.clone().normalize(), b = TYO.clone().normalize(); const om = Math.acos(a.dot(b));
  for (let i = 0; i <= N; i++) { const t = i / N; const p = a.clone().multiplyScalar(Math.sin((1 - t) * om) / Math.sin(om)).add(b.clone().multiplyScalar(Math.sin(t * om) / Math.sin(om))); p.multiplyScalar(RE * (1.004 + 0.03 * Math.sin(t * Math.PI))); pts.push(p); }
  const curve = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 22, 8, false), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 } }, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uK; varying vec2 vU; void main(){ float show = step(vU.x, uK); float head = exp(-pow((vU.x - uK) * 40.0, 2.0)); gl_FragColor = vec4(vec3(1.0, 0.7, 0.3) * (0.7 + 3.0 * head) * show, 1.0); }` }));
  m.userData.curve = curve; EARTH.add(m); return m; })();
const CITYDOT = (p, c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(55, 16, 12), glow(c, 3)); m.position.copy(p); EARTH.add(m); return m; };
CITYDOT(NYC, 0xffffff); CITYDOT(TYO, 0xffffff);
const HEAD = new THREE.Mesh(new THREE.SphereGeometry(70, 16, 12), glow(0xffd080, 5)); EARTH.add(HEAD);
const EW = (v) => EARTH.localToWorld(v.clone());

// =====================================================================================================================
// THE SHIELD, cut open (diagram): carbon-carbon skin · carbon foam core (97% air: drawn as open cells) · carbon-carbon skin,
// 11.4 cm thick, a white coating on the Sun side.
// =====================================================================================================================
const LAB = new THREE.Group(); scene.add(LAB); LAB.position.set(-9000, 0, 0); LAB.visible = false;
const FOAMU = { uT: { value: 0 }, uZoom: { value: 0 } };
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.6; fl.receiveShadow = true; LAB.add(fl);
  const grid = new THREE.GridHelper(30, 60, 0x1d3a52, 0x13202c); grid.position.y = -0.595; grid.material.transparent = true; grid.material.opacity = 0.5; LAB.add(grid); }
const SLAB = new THREE.Group(); LAB.add(SLAB);
const T_SKIN = 0.012, T_FOAM = 0.114, W_SLAB = 1.2, D_SLAB = 0.8, K = 4;   // drawn 4× thicker so the layers read; labelled
const skinM = new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, roughness: 0.55, metalness: 0.2, clearcoat: 0.3 });
const coatM = new THREE.MeshPhysicalMaterial({ color: 0xf2f2ee, roughness: 0.35, clearcoat: 0.6 });
const foamM = new THREE.ShaderMaterial({ uniforms: FOAMU, vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT; varying vec3 vP; varying vec3 vN; ${NOISE}
    float cell(vec3 p){ vec3 i = floor(p), f = fract(p); float d = 1.0; for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 o = vec3(x, y, z); vec3 r = o + vec3(hh(i + o), hh(i + o + 7.1), hh(i + o + 3.3)) - f; d = min(d, dot(r, r)); } return sqrt(d); }
    void main(){ float c = cell(vP * 110.0); float wall = smoothstep(0.62, 0.72, c); vec3 air = vec3(0.02, 0.025, 0.03); vec3 carbon = vec3(0.22, 0.23, 0.25) * (0.8 + 0.4 * fbm(vP * 90.0));
      float l = 0.55 + 0.45 * max(dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.5))), 0.0); gl_FragColor = vec4(mix(air, carbon * l, 1.0 - wall), 1.0); }` });
{ const y0 = 0; let y = y0;
  const lay = (t, m, nm) => { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(W_SLAB, t * K, D_SLAB), m)); b.position.y = y + t * K / 2; y += t * K; b.name = nm; SLAB.add(b); return b; };
  SLAB.userData.back = lay(T_SKIN, skinM, "back"); SLAB.userData.foam = lay(T_FOAM, foamM, "foam"); SLAB.userData.front = lay(T_SKIN, skinM, "front"); SLAB.userData.coat = lay(0.003, coatM, "coat"); SLAB.userData.top = y; }
SLAB.rotation.x = 0; SLAB.position.set(0, -0.3, 0);
const LW = (x, y, z) => LAB.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: the phone shows a file you shared, as Orbi draws it: a glass bubble with the name, a green dot running round its
// edge for each person who has it open right now, and the live / downloads stats (OrbView.tsx, Void.tsx).
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  const cx = 390, cy = 600, R = 240;
  // the bubble
  const gr = g.createRadialGradient(cx - 80, cy - 90, 20, cx, cy, R); gr.addColorStop(0, "rgba(255,255,255,.22)"); gr.addColorStop(0.7, "rgba(120,170,255,.08)"); gr.addColorStop(1, "rgba(160,200,255,.28)");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#fff"; g.font = "800 46px M"; g.textAlign = "center"; g.fillText("parker-24dec.mp4", cx, cy - 10); g.fillStyle = "#9aa3ad"; g.font = "600 30px M"; g.fillText("1.4 GB · burns in 27 min", cx, cy + 40);
  // live viewers: green dots running round the edge
  for (let k = 0; k < st.live; k++) { const a = st.t * 0.9 + k * TAU / Math.max(1, st.live) ; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    g.fillStyle = "rgba(61,255,140,.25)"; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.fill(); g.fillStyle = green; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
  // stats pill
  g.fillStyle = "rgba(8,10,14,.92)"; rr(g, cx - 200, cy + R + 50, 400, 92, 46); g.fill(); g.strokeStyle = st.live ? green : "rgba(255,255,255,.2)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = green; g.beginPath(); g.arc(cx - 150, cy + R + 96, 12, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.font = "800 40px M"; g.textAlign = "left"; g.fillText(`${st.live} live`, cx - 125, cy + R + 110);
  g.fillStyle = "#cfd6dd"; g.fillText(`↓ ${st.dl}`, cx + 60, cy + R + 110);
  if (st.toast) { g.fillStyle = "rgba(20,22,26,.95)"; rr(g, 150, 1400, 480, 84, 42); g.fill(); g.strokeStyle = green; g.lineWidth = 2; g.stroke(); g.fillStyle = green; g.font = "800 32px M"; g.textAlign = "center"; g.fillText(st.toast, 390, 1454); g.textAlign = "left"; }
  g.textAlign = "left"; }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "named for Eugene Parker"], shieldL: ["Heat shield", "#ffd166", "2.3 m wide, faces the Sun"], arrays: ["Solar arrays", "#9fd4ff", "tucked behind the shield"],
  sunL: ["The Sun", "#ffb340", ""], periL: ["Closest pass", "#ffd166", "24 Dec 2024"], merL: ["Mercury's orbit", "#b9a48f", ""], parkL: ["Parker's orbit", "#9fd4ff", ""],
  nycL: ["New York", "#fff", ""], tyoL: ["Tokyo", "#fff", "10,850 km"], coatL: ["White coating", "#f2f2ee", "faces the Sun"], skinL: ["Carbon-carbon skin", "#cfd6dd", ""],
  foamL: ["Carbon foam · 11.4 cm", "#ffd166", "97% air"], bodyL: ["Spacecraft", "#3dff8c", "~30 °C"], frontL: ["Sun side", "#ffb340", "up to ~1,400 °C"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("fast", row(card("FASTEST OBJECT", "EVER BUILT", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("named", row(card("LAUNCHED", "12 AUG 2018", "#9fd4ff"), card("NAMED FOR", "E. PARKER", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("dist", big("dN", "6.1M km", "FROM THE SUN'S SURFACE", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("date", row(card("CLOSEST PASS", "24 DEC 2024", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("kmh", big("kN", "0", "KM/H", "#fff", "#ffb340"), { left: "0px", top: "190px" });
hudEl("nyt", big("tN", "0 s", "NEW YORK → TOKYO", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("temp", big("cN", "0 °C", "SUN SIDE OF THE SHIELD", "#fff", "#ffb340"), { left: "0px", top: "190px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("thick", row(card("FOAM CORE", "11.4 cm", "#ffd166"), card("OF IT IS", "97% AIR", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("thermal", pill("THERMAL VIEW · DIAGRAM"), { left: "350px", top: "1120px" });
hudEl("two", row(card("SUN SIDE", "~1,400 °C", "#ffb340"), card("BEHIND", "~30 °C", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("auto", row(card("NO ONE STEERING", "IT FLIES ITSELF", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("wait", big("wN", "24 DEC", "WAITING FOR A SIGNAL", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("ok", row(card("26 DEC 2024 · BEACON", "HEALTHY", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("livebig", big("lvN", "0", "OPEN RIGHT NOW", "#fff", green), { left: "0px", top: "170px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["LIVE VIEWERS", "LIVE DOWNLOADS", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; PSP.visible = sp; SUNG.visible = sp; SKYG.visible = sp || s === "orbit" || s === "earth"; ORB.visible = s === "orbit"; LAB.visible = s === "lab"; ORS.visible = s === "orbi"; EARTH.visible = s === "earth";
  DUST.visible = false; scene.fog = null; scene.background = s === "lab" ? new THREE.Color(0x05070a) : s === "orbi" ? new THREE.Color(0x07080a) : null; sunGlow.visible = false; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); }
function lightSun(k = 1) { H.key.color.set(0xfff0dc); H.key.intensity = 5.5 * k; H.key.position.set(0, 0, -40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0xffc890); H.hemi.groundColor.set(0x1a2236); H.hemi.intensity = 0.35; H.envK.value = 0.8; H.rimA.intensity = 0.7; H.rimB.intensity = 0.5; }
function lightAt(c, hemi = 0.35) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(4, 9, 6)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
// solar wind / dust streaks rushing past (speed cue)
const DUST = (() => { const N = 900, p = new Float32Array(N * 6); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.8), transparent: true, opacity: 0.5, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false })); m.frustumCulled = false; scene.add(m); m.visible = false; return m; })();
function dust(t, k, dir = V(1, 0, 0), len = 1.6) { DUST.visible = k > 0.01; if (!DUST.visible) return; const a = DUST.geometry.attributes.position.array; DUST.material.opacity = 0.45 * k;
  for (let i = 0; i < a.length / 6; i++) { const y = (hash(i * 1.7) - 0.5) * 30, z = (hash(i * 2.9) - 0.5) * 40; let x = ((hash(i * 4.1) * 80 - t * 60) % 80 + 80) % 80 - 40;
    const p = V(0, y, z).addScaledVector(dir, x); a.set([p.x, p.y, p.z, p.x + dir.x * len * k, p.y + dir.y * len * k, p.z + dir.z * len * k], i * 6); }
  DUST.geometry.attributes.position.needsUpdate = true; }
const C0 = V(0, 0, 0.6);

H.frame("See it live. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.45; H.grade.uniforms.uVig.value = 0.34; camRange(0.05, 30000); SUNU.uT.value = t; TU.uT.value = t; FOAMU.uT.value = t; EU.uT.value = t;
  TU.uK.value = 0; TU.uGlow.value = 0.25; PSP.rotation.set(0, 0, 0); PSP.position.set(0, 0, 0); pspMat();

  if (t < at("close")) { // HOOK · THIS: Parker, shield to the Sun, the corona filling the sky
    sets("space"); lightSun(); skyAt();
    if (t < at("this")) { dust(t, 1, V(1, 0.1, 0.2).normalize());
      move(t, 0, at("this"), [V(2.6, 1.4, 10.5), V(0, 2.6, -6), 44], [V(1.9, 1.0, 8.0), V(0, 2.3, -6), 44], 0.04); sunAt(V(0, 0, -1));
      title(t, fr("hook", 0.05), fr("hook", 0.6), "Fastest object ever built", "Touching the Sun", 150); hudShow("fast", win(t, fr("hook", 0.5), at("this"))); }
    else { const a = 0.9 + (t - at("this")) * 0.12; move(t, at("this"), at("close"), [C0.clone().add(V(Math.cos(a) * 9.5, 2.4, Math.sin(a) * 9.5)), C0, 40], [C0.clone().add(V(Math.cos(a + 0.1) * 8.6, 2.0, Math.sin(a + 0.1) * 8.6)), C0, 40], 0.02); sunAt(V(0, 0, -1));
      dust(t, 0.4, V(1, 0.1, 0.2).normalize()); callout("nasa", t, fr("this", 0.2), at("close"), PL(0.3, 0.6, 0.4), 300, 1390); callout("shieldL", t, fr("this", 0.45), at("close"), PL(0.6, 0.6, -1.65), 760, 1000); hudShow("named", win(t, fr("this", 0.5), at("close"))); }
  } else if (t < at("speed")) { // CLOSE: the orbit, to scale
    sets("orbit"); ORB.updateMatrixWorld(true); H.key.intensity = 0.6; H.hemi.intensity = 0.6; skyAt();
    const k = smooth(prog(t, at("close"), fr("close", 0.85))); const th = lerp(-2.2, 0, k); PDOT.position.copy(ellipse(th));
    const far = [OW2(V(4, 15, 22)), OW2(V(4, 0, 0)), 44], near = [OW2(V(0.6, 1.2, 2.4)), OW2(V(0.4, 0, 0)), 44]; move(t, at("close"), at("speed"), far, near, 0.0);
    H.$("dN").textContent = "6.1M km"; hudShow("dist", win(t, fr("close", 0.55), at("speed"))); hudShow("date", win(t, fr("close", 0.1), at("speed"))); hudShow("diag", 1);
    callout("merL", t, fr("close", 0.05), fr("close", 0.5), OW2(V(0, 0, MER)), 760, 700); callout("parkL", t, fr("close", 0.1), fr("close", 0.5), OW2(ellipse(-1.2)), 300, 1000);
    callout("periL", t, fr("close", 0.65), at("speed"), OW2(V(PERI, 0, 0)), 760, 1000);
  } else if (t < at("hot")) { // SPEED: streaking past · New York → Tokyo
    if (t < fr("speed", 0.45)) { sets("space"); lightSun(); skyAt(); dust(t, 1.6, V(1, 0, 0.15).normalize(), 3.0); sunAt(V(0, 0, -1));
      move(t, at("speed"), fr("speed", 0.45), [V(-4, 1.5, 7), C0, 40], [V(-2.5, 0.8, 5.5), C0, 40], 0.08); const kk = smooth(prog(t, at("speed"), fr("speed", 0.4)));
      H.$("kN").textContent = Math.round(692000 * kk).toLocaleString("en-US"); hudShow("kmh", win(t, at("speed"), fr("speed", 0.45))); }
    else { sets("earth"); lightAt(EARTH.position, 0.05); H.key.intensity = 0; skyAt(); EARTH.rotation.set(0.35, 1.9, 0); EARTH.updateMatrixWorld(true);
      const k = smooth(prog(t, fr("speed", 0.5), fr("speed", 0.9))); ARC.material.uniforms.uK.value = k; HEAD.position.copy(ARC.userData.curve.getPointAt(Math.min(0.999, k)));
      const mid = EW(ARC.userData.curve.getPointAt(0.5)); const E = EARTH.position; const out = mid.clone().sub(E).normalize();
      move(t, fr("speed", 0.45), at("hot"), [E.clone().addScaledVector(out, 27).add(V(0, -3, 0)), E.clone().addScaledVector(out, 1.5), 40], [E.clone().addScaledVector(out, 24.5).add(V(0, -3, 0)), E.clone().addScaledVector(out, 1.5), 40], 0.02);
      H.$("tN").textContent = `${Math.round(56 * k)} s`; hudShow("nyt", win(t, fr("speed", 0.5), at("hot")));
      callout("nycL", t, fr("speed", 0.5), at("hot"), EW(NYC), 300, 1390); callout("tyoL", t, fr("speed", 0.6), at("hot"), EW(TYO), 760, 1390); }
  } else if (t < at("cool")) { // HOT · SHIELD: the glowing face, then the cut-open sandwich
    if (t < at("shield")) { sets("space"); lightSun(0.35); H.envK.value = 0.4; skyAt(); TU.uGlow.value = 0.2 + 0.7 * smooth(prog(t, at("hot"), fr("hot", 0.7))); sunAt(V(-0.3, -0.12, -1).normalize());
      move(t, at("hot"), at("shield"), [V(4.2, 2.0, -9.8), V(0, 0, -1.2), 40], [V(3.0, 1.4, -7.8), V(0, 0, -1.2), 40], 0.02);
      H.$("cN").textContent = `${(Math.round(1400 * smooth(prog(t, at("hot"), fr("hot", 0.75))) / 10) * 10).toLocaleString("en-US")} °C`; hudShow("temp", win(t, at("hot"), at("shield"))); callout("frontL", t, fr("hot", 0.4), at("shield"), PL(-0.4, 0.3, -1.68), 300, 1390); }
    else { sets("lab"); lightAt(LAB.position, 0.35); LAB.updateMatrixWorld(true); const a = -0.5 + (t - at("shield")) * 0.08; const Cc = LW(0, -0.0, 0);
      move(t, at("shield"), at("cool"), [Cc.clone().add(V(Math.sin(a) * 3.2, 0.9, Math.cos(a) * 3.2)), Cc, 34], [Cc.clone().add(V(Math.sin(a + 0.08) * 2.7, 0.7, Math.cos(a + 0.08) * 2.7)), Cc, 34], 0.01);
      const top = SLAB.userData.top; callout("coatL", t, fr("shield", 0.05), at("cool"), LW(-0.4, -0.3 + top, 0.3), 760, 600); callout("skinL", t, fr("shield", 0.1), at("cool"), LW(0.5, -0.3 + 0.024, 0.4), 760, 1000);
      callout("foamL", t, fr("shield", 0.3), at("cool"), LW(-0.55, -0.3 + 0.048 + 0.23, 0.4), 300, 760); hudShow("thick", win(t, fr("shield", 0.4), at("cool"))); hudShow("diag", 1); }
  } else if (t < at("wait")) { // COOL (thermal view) · ALONE (it steers itself)
    sets("space"); lightSun(); skyAt(); sunAt(V(0, 0, -1));
    if (t < at("alone")) { TU.uK.value = smooth(prog(t, at("cool"), fr("cool", 0.2))); TU.uGlow.value = 0; const a = 0.15 + (t - at("cool")) * 0.1;
      const C1 = V(0, 0, -0.4); move(t, at("cool"), at("alone"), [C1.clone().add(V(Math.cos(a) * 10.5, 2.4, Math.sin(a) * 10.5)), C1, 40], [C1.clone().add(V(Math.cos(a + 0.08) * 9.6, 2.0, Math.sin(a + 0.08) * 9.6)), C1, 40], 0.02);
      hudShow("two", win(t, fr("cool", 0.2), at("alone"))); hudShow("thermal", 1); callout("bodyL", t, fr("cool", 0.25), at("alone"), PL(0.5, 0.2, 0.8), 760, 1390); callout("frontL", t, fr("cool", 0.35), at("alone"), PL(-0.5, 0.4, -1.68), 300, 1000); }
    else { const w = 0.08 * Math.sin((t - at("alone")) * 1.6) * Math.exp(-((t - at("alone")) % 3) * 0.6); PSP.rotation.set(w * 0.5, w, 0); pspMat(); dust(t, 0.6, V(1, 0.1, 0.2).normalize());
      const s = V(Math.sin((t - at("alone")) * 0.15) * 0.15, 0, -1).normalize(); sunAt(s);
      move(t, at("alone"), at("wait"), [V(6.5, 3.5, 5), C0, 40], [V(5.4, 2.8, 4), C0, 40], 0.03); hudShow("auto", win(t, fr("alone", 0.15), at("wait"))); }
  } else if (t < at("orbi")) { // WAIT: Earth, two days; then the beacon
    sets("earth"); lightAt(EARTH.position, 0.05); H.key.intensity = 0; skyAt(); EARTH.rotation.set(0.2, 2.4 + (t - at("wait")) * 0.25, 0); EARTH.updateMatrixWorld(true); ARC.visible = false; HEAD.visible = false;
    const E = EARTH.position; move(t, at("wait"), at("orbi"), [E.clone().add(V(4, 3, 19)), E.clone().add(V(0, 1.5, 0)), 40], [E.clone().add(V(3, 2.5, 16.5)), E.clone().add(V(0, 1.5, 0)), 40], 0.02);
    const kd = prog(t, at("wait"), fr("wait", 0.62)); H.$("wN").textContent = kd < 0.34 ? "24 DEC" : kd < 0.67 ? "25 DEC" : "26 DEC"; hudShow("wait", win(t, at("wait"), fr("wait", 0.8)));
    hudShow("ok", win(t, fr("wait", 0.7), at("orbi")));
  } else { // ORBI: live viewers
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const live = t < fr("orbi", 0.5) ? 0 : t < at("orbi2") ? 1 : Math.min(4, 1 + Math.floor((t - at("orbi2")) / 1.1)); const dl = t < at("orbi2") ? 0 : Math.min(9, Math.floor((t - fr("orbi2", 0.55)) / 0.35) + 1) * (t > fr("orbi2", 0.55) ? 1 : 0);
    screen(PH, { live, dl, t: Math.round(t * 30) / 30, toast: t > at("orbi3") ? "Someone just opened it" : "" }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.35, 3.1), OW(0, 1.25, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.35, 3.1), OW(0, 1.25, 0), 36], [OW(-0.15, 1.3, 2.9), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); H.$("lvN").textContent = String(live); hudShow("livebig", win(t, fr("orbi", 0.45), at("orbi3"))); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
