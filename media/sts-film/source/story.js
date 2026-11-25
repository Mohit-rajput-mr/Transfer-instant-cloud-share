// Discovery: the glider from space. The real Space Shuttle orbiter OV-103 (Smithsonian NASM 3D scan, CC0, 3d.si.edu), metres.
// Facts (Wikipedia: Space Shuttle Discovery; Space Shuttle orbiter; Space Shuttle thermal protection system): 39 launches and
// landings, more spaceflights than any other spacecraft; length 37.237 m, span 23.79 m; landed as a glider; glide ratio 1:1
// hypersonic → 2:1 supersonic → 4.5:1 subsonic on approach; re-entry heat 1,650 °C; aluminium structure limit 175 °C; LI-900
// silica tiles (very pure quartz sand), so fragile one could crush a tile by hand; RCC on the nose cap and wing leading edges
// (above 1,260 °C); black HRSI tiles underneath, white insulation on top; 24,000 tiles, ~18,000 still original at the end;
// new tiles are solid black before their first re-entry. On display at the Udvar-Hazy Center.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { makePhone, makeLaptop, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
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


// ---------- SPACE (from the Apollo film): stars, the Earth backdrop with its limb glow, the Sun ----------
const SPACE = new THREE.Group(); scene.add(SPACE);
const SUN_S = V(-0.55, 0.5, -0.67).normalize();
{ const N = 6000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(3);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 9000, u * 9000, Math.sin(a) * r * 9000], i * 3);
    const b = Math.pow(H.rnd(), 6) * 1.6 + 0.12, w = H.rnd(); c.set([b * (0.85 + 0.2 * w), b * 0.92, b * (1.1 - 0.2 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
  st.renderOrder = -9; st.frustumCulled = false; SPACE.add(st); SPACE.userData.stars = st; }
const ER = 4000;                                            // the Earth's radius in scene units (backdrop, drawn without depth)
const EU = { uDay: { value: tex("kit/models/planets/earth_atmos_2048.jpg", true) }, uNight: { value: tex("kit/models/planets/earth_lights_2048.png", true) }, uCloud: { value: tex("kit/models/planets/earth_clouds_1024.png") },
  uSpec: { value: tex("kit/models/planets/earth_specular_2048.jpg") }, uSun: { value: SUN_S }, uT: { value: 0 }, uDet: { value: 1 }, uGlow: { value: 0 }, uGlowP: { value: V() } };
const earthMat = new THREE.ShaderMaterial({ uniforms: EU, depthTest: false, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vO; varying vec3 vW; varying vec3 vN; void main(){ vO = normalize(position); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D uDay, uNight, uCloud, uSpec; uniform vec3 uSun, uGlowP; uniform float uT, uDet, uGlow; varying vec3 vO; varying vec3 vW; varying vec3 vN; ${NOISE}
    void main(){ vec3 d = normalize(vO); vec2 uv = vec2(fract(atan(d.z, -d.x) / 6.2831853), 1.0 - acos(clamp(d.y, -1.0, 1.0)) / 3.14159265);
      vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float sd = dot(n, uSun);
      vec3 day = texture2D(uDay, uv).rgb; float spec = texture2D(uSpec, uv).r; vec3 night = texture2D(uNight, uv).rgb;
      float cl = texture2D(uCloud, uv + vec2(uT * 0.0004, 0.0)).r;
      float det = fbm(d * 900.0 + vec3(uT * 0.02, 0.0, 0.0)); cl = clamp(smoothstep(0.12, 0.75, cl) * mix(1.0, 0.35 + 1.1 * det, uDet * 0.7), 0.0, 1.0);
      float lit = smoothstep(-0.12, 0.25, sd); float lam = max(sd, 0.0) * 0.85 + 0.15 * lit;
      day = mix(day, day * vec3(0.75, 0.9, 1.15), spec * 0.6);
      vec3 col = day * lam * 1.1;
      vec3 h = normalize(uSun + v); col += spec * pow(max(dot(n, h), 0.0), 60.0) * vec3(1.0, 0.9, 0.75) * 1.6 * lit;
      vec3 term = mix(vec3(1.0, 0.55, 0.3), vec3(1.0), smoothstep(-0.02, 0.15, sd));
      col = mix(col, vec3(0.92) * term * (lam + 0.03), cl * 0.9);
      col += night * (1.0 - lit) * (1.0 - cl) * 1.4;
      float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0); col = mix(col, vec3(0.3, 0.5, 0.95) * (lit + 0.03), rim * 0.55);
      // the re-entry fireball lighting the clouds below
      float gd = length(vW - uGlowP); col += vec3(1.0, 0.45, 0.15) * uGlow * cl * exp(-gd * 0.06) * 2.0;
      gl_FragColor = vec4(col, 1.0); }` });
const EARTH = new THREE.Mesh(new THREE.SphereGeometry(ER, 256, 128), earthMat); EARTH.renderOrder = -8; EARTH.frustumCulled = false; SPACE.add(EARTH);
const AU = { uSun: { value: SUN_S }, uC: { value: V() }, uR: { value: ER } };
const atmo = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.03, 128, 64), new THREE.ShaderMaterial({ uniforms: AU, side: THREE.BackSide, transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uSun, uC; uniform float uR; varying vec3 vW; void main(){
    vec3 d = normalize(vW - cameraPosition), oc = uC - cameraPosition; float tca = dot(oc, d); float d2 = dot(oc, oc) - tca * tca;
    float h = sqrt(max(d2, 0.0)) - uR; vec3 cp = cameraPosition + d * max(tca, 0.0); vec3 up = normalize(cp - uC); float sd = dot(up, uSun);
    float Hs = uR * 0.0035; float g = h > 0.0 ? exp(-h / Hs) : 0.22 * exp(h / (uR * 0.012));
    if (tca < 0.0) g = 0.0;
    vec3 c = mix(vec3(1.0, 0.38, 0.12), vec3(0.32, 0.58, 1.2), smoothstep(-0.05, 0.3, sd)) * smoothstep(-0.25, 0.05, sd);
    gl_FragColor = vec4(c * g * 0.9, 1.0); }` }));
atmo.renderOrder = -7; atmo.frustumCulled = false; SPACE.add(atmo);
const sunDisc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 22.0) * 6.0 + exp(-r * 5.0) * 0.5 + exp(-r * 1.6) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.93, 0.82) * c, 1.0); }` }));
sunDisc.renderOrder = -6; sunDisc.frustumCulled = false; SPACE.add(sunDisc);
/** place the Earth under the camera: the camera is `alt` km up (real km; the backdrop is scaled), looking over lat/lon */
const EQ = new THREE.Quaternion();
function earthAt(altKm, lat = 13, lon = -168, yaw = 0) {
  const s = ER / 6371, p = H.cam.position;
  const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lon);
  const dir = V(-Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo));          // matches the shader's uv mapping
  EQ.setFromUnitVectors(dir, V(0, 1, 0)); const qy = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw); EARTH.quaternion.copy(qy.multiply(EQ));
  EARTH.position.set(p.x, p.y - ER - altKm * s, p.z); atmo.position.copy(EARTH.position); AU.uC.value.copy(EARTH.position);
  SPACE.userData.stars.position.copy(p);
  sunDisc.position.copy(p).addScaledVector(SUN_S, 8000); sunDisc.scale.setScalar(900); sunDisc.lookAt(p);
  EU.uDet.value = clamp(1.6 - altKm / 300, 0.3, 1.2);
}

// =====================================================================================================================
// DISCOVERY: the scan as-is (metres, nose +z, y up), wheels on y = 0. A heat overlay for re-entry (underside glows).
// =====================================================================================================================
const ORB = new THREE.Group(); scene.add(ORB);
const OU = { uHeat: { value: 0 }, uFlow: { value: V(0, 1, 0) }, uT: { value: 0 }, uHi: { value: 0 }, uHiC: { value: new THREE.Color(0x3dff8c) } };
const gs = await new GLTFLoader().loadAsync("kit/models/discovery/discovery-150k-4096.glb"); gs.scene.updateMatrixWorld(true);
gs.scene.traverse((o) => { if (!o.isMesh) return; const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.translate(0, 7.913, 0);
  const mat = o.material; mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (s) => { Object.assign(s.uniforms, OU);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying vec3 vOP;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vOP = transformed;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nuniform float uHeat, uT, uHi; uniform vec3 uFlow, uHiC; varying vec3 vWP; varying vec3 vWN; varying vec3 vOP; ${NOISE}`)
      .replace("#include <opaque_fragment>", `{ float f = dot(normalize(vWN), -uFlow); float hot = smoothstep(0.1, 0.9, f) * uHeat; float n = fbm(vWP * 0.6 + uFlow * uT * 4.0);
          vec3 hc = mix(vec3(0.85, 0.2, 0.05), vec3(1.0, 0.6, 0.25), n); outgoingLight = outgoingLight * (1.0 - 0.6 * hot) + hc * hot * (0.25 + 0.6 * n);
          // highlight: the nose cap and the wing leading edges (RCC)
          float nose = smoothstep(16.2, 17.6, vOP.z); float edge = smoothstep(0.55, 0.85, dot(normalize(vWN), normalize(vec3(sign(vOP.x) * 0.55, 0.0, 0.84)))) * step(2.6, abs(vOP.x)) * smoothstep(2.4, 1.6, vOP.y);
          outgoingLight = mix(outgoingLight, uHiC * (0.6 + 0.4 * sin(uT * 4.0)), clamp(nose + edge, 0.0, 1.0) * uHi * 0.6); }
        #include <opaque_fragment>`); };
  mat.customProgramCacheKey = () => "orb";
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; ORB.add(m); });
const OL = (x, y, z) => ORB.localToWorld(V(x, y, z));
function orbAt(p, pitch = 0, yaw = 0, roll = 0) { ORB.position.copy(p); ORB.rotation.set(pitch, yaw, roll, "YXZ"); ORB.updateMatrixWorld(true); }
// re-entry plasma: a glowing sheath under the belly + a wake + sparks (in ORB space; the flow comes from below/front)
const PU = { uT: { value: 0 }, uI: { value: 0 } };
const pm = (frag) => new THREE.ShaderMaterial({ uniforms: PU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  vertexShader: `varying vec3 vL; varying vec3 vW; varying vec3 vN; void main(){ vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT, uI; varying vec3 vL; varying vec3 vW; varying vec3 vN; ${NOISE} vec3 pc(float k){ return mix(mix(vec3(0.9, 0.25, 0.55), vec3(1.0, 0.45, 0.12), smoothstep(0.0, 0.5, k)), vec3(1.0, 0.9, 0.75), smoothstep(0.6, 1.0, k)); } void main(){ ${frag} }` });
const SHEATH = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), pm(`vec3 v = normalize(cameraPosition - vW); float e = pow(1.0 - abs(dot(normalize(vN), v)), 1.4); float n = fbm(vL * 3.0 + vec3(0.0, 0.0, uT * 3.0));
  gl_FragColor = vec4(pc(0.4 + 0.4 * n) * (0.05 + e * e) * (0.5 + 0.6 * n) * 0.3 * uI, 1.0);`));
SHEATH.scale.set(13.5, 3.2, 21); SHEATH.position.set(0, 1.4, 0.5); SHEATH.frustumCulled = false; ORB.add(SHEATH);
const WAKE = new THREE.Mesh(new THREE.CylinderGeometry(9, 26, 160, 48, 40, true).rotateX(-Math.PI / 2).translate(0, 4, -95), pm(`vec3 v = normalize(cameraPosition - vW); float e = pow(abs(dot(normalize(vN), v)), 0.8); float y = -vL.z - 15.0;
  float n = fbm(vec3(vL.x * 0.15, vL.y * 0.15, vL.z * 0.05 + uT * 4.0)); float k = exp(-y * 0.02) * (0.3 + 0.9 * n) * e; gl_FragColor = vec4(pc(0.3 + 0.5 * exp(-y * 0.03)) * k * 0.35 * uI, 1.0);`));
WAKE.frustumCulled = false; ORB.add(WAKE);
const NSP = 700, SPK = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.01, 1, 4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.8, 0.25), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), NSP);
SPK.frustumCulled = false; ORB.add(SPK);
function sparks(t, k) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < NSP; i++) { const u = ((hash(i) + t * (0.4 + hash(i + 1) * 0.6)) % 1); const x = (hash(i + 2) - 0.5) * 22, y = -0.5 + hash(i + 3) * 3; const z = 16 - u * 120; const s = k * (1 - u);
  m4.compose(V(x * (1 + u * 1.5), y + u * 6, z), q, V(s, s, s * 4)); SPK.setMatrixAt(i, m4); } SPK.instanceMatrix.needsUpdate = true; }
function plasma(i, t) { PU.uI.value = i; PU.uT.value = t; SHEATH.visible = WAKE.visible = SPK.visible = i > 0.01; if (i > 0.01) sparks(t, i); }

// =====================================================================================================================
// FLORIDA LANDING: morning sky, grass, a long runway, the ocean; the glide-slope diagram (4.5 : 1)
// =====================================================================================================================
const LAND = new THREE.Group(); scene.add(LAND); LAND.position.set(0, 0, 0);
const SUN_L = (() => { const a = (0.5977 - 0.5) * TAU, e = THREE.MathUtils.degToRad(18); return V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).normalize(); })();
{ const skyT = tex("kit/ph/qwantani_sunrise_puresky/sky_4k.jpg", true); skyT.repeat.set(1, 1);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSky: { value: skyT } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform sampler2D uSky; varying vec3 vD; void main(){ vec3 d = normalize(vD); vec3 c = texture2D(uSky, vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb; if (d.y < 0.0) c = vec3(0.5, 0.56, 0.5); gl_FragColor = vec4(c, 1.0); }` }));
  sky.renderOrder = -10; sky.frustumCulled = false; LAND.add(sky);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.MeshStandardMaterial({ map: tex("kit/ph/grass_ground/grass_ground_diff_1k.jpg", true, 1500, 1500), color: 0xa4b48a, roughness: 0.95 }));
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; LAND.add(grass);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(91, 4572), new THREE.MeshStandardMaterial({ map: tex("kit/ph/asphalt_02/asphalt_02_diff_1k.jpg", true, 6, 300), color: 0xc8c6c0, roughness: 0.9 }));
  rw.rotation.x = -Math.PI / 2; rw.position.set(0, 0.03, 1800); rw.receiveShadow = true; LAND.add(rw);
  const lines = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 30), new THREE.MeshBasicMaterial({ color: 0xf2f2ee }), 80); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 80; i++) { m4.compose(V(0, 0.05, -450 + i * 57), q, V(1, 1, 1)); lines.setMatrixAt(i, m4); } LAND.add(lines);
  for (const x of [-44, 44]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4572), new THREE.MeshBasicMaterial({ color: 0xf2f2ee })); e.rotation.x = -Math.PI / 2; e.position.set(x, 0.05, 1800); LAND.add(e); } }
const LFOG = new THREE.FogExp2(0xc8d0d8, 0.00018);
// the glide-slope triangle: 4.5 forward for 1 down, drawn in the air beside the path
const GS = new THREE.Group(); LAND.add(GS); GS.visible = false;
{ const mk = (a, b, c) => { const g = new THREE.BufferGeometry().setFromPoints([a, b]); return new THREE.Line(g, new THREE.LineBasicMaterial({ color: c, linewidth: 2 })); };
  const s = 120; GS.userData.pts = [V(0, s, -4.5 * s), V(0, 0, 0), V(0, s, 0)];
  const tri = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([V(0, s, -4.5 * s), V(0, 0, 0), V(0, 0, -4.5 * s)]), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.2, 0.6), transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  tri.geometry.setIndex([0, 1, 2]); GS.add(tri);
  const path = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, Math.hypot(s, 4.5 * s), 8).rotateX(Math.PI / 2 - Math.atan2(s, 4.5 * s)), glow(0x3dff8c, 1.6)); path.position.set(0, s / 2, -2.25 * s); GS.add(path);
  const down = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, s, 8), glow(0xff8a3d, 1.6)); down.position.set(0, s / 2, -4.5 * s); GS.add(down);
  const fwd = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 4.5 * s, 8).rotateX(Math.PI / 2), glow(0x6fd0ff, 1.6)); fwd.position.set(0, 0.6, -2.25 * s); GS.add(fwd); }

// =====================================================================================================================
// THE TILES, magnified: a patch of black HRSI tiles on the aluminium skin; a section; one tile crumbles
// =====================================================================================================================
const TL = new THREE.Group(); scene.add(TL); TL.position.set(0, 0, -6000);
const TU = { uT: { value: 0 }, uHot: { value: 0 }, uSec: { value: 0 } };
const TS = 0.152, TN = 18;                         // 6 in tiles (typical HRSI ~6 × 6 in)
const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
tileMat.onBeforeCompile = (s) => { Object.assign(s.uniforms, TU);
  s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTP; varying float vId;").replace("#include <begin_vertex>", "#include <begin_vertex>\n vTP = (instanceMatrix * vec4(transformed, 1.0)).xyz; vId = float(gl_InstanceID);");
  s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nuniform float uT, uHot; varying vec3 vTP; varying float vId; ${NOISE}`)
    .replace("#include <map_fragment>", `#include <map_fragment>
      float r = fract(sin(vId * 12.9898) * 43758.5); float isNew = step(0.86, r);                  // a few replaced tiles: solid black
      vec3 used = mix(vec3(0.03, 0.03, 0.035), vec3(0.075, 0.07, 0.065), fbm(vTP * 7.0 + r * 9.0)) * (0.85 + 0.3 * r);
      float depth = clamp(-vTP.y / 0.05, 0.0, 1.0); vec3 core = vec3(0.92, 0.92, 0.9);                       // white silica inside
      diffuseColor.rgb = vTP.y < -0.004 ? core : mix(used, vec3(0.008), isNew);`)
    .replace("#include <opaque_fragment>", `float topK = smoothstep(-0.004, 0.0, vTP.y); float g = exp(vTP.y / 0.03); outgoingLight += vec3(1.0, 0.4, 0.1) * uHot * (topK * 0.06 + (1.0 - topK) * g * 0.9);
      #include <opaque_fragment>`); };
const TILE = new THREE.InstancedMesh(new RoundedBoxGeometry(TS - 0.004, 0.05, TS - 0.004, 2, 0.006).translate(0, -0.025, 0), tileMat, TN * TN); TILE.castShadow = TILE.receiveShadow = true; TL.add(TILE);
const SKIN = new THREE.Mesh(new THREE.BoxGeometry(TN * TS + 0.1, 0.012, TN * TS + 0.1), metal(0xb8bcc2, 0.35)); SKIN.position.y = -0.062; TL.add(SKIN);
const felt = new THREE.Mesh(new THREE.BoxGeometry(TN * TS + 0.1, 0.004, TN * TS + 0.1), matte(0xe8e2d0, 0.9)); felt.position.y = -0.054; TL.add(felt);
const hot = new THREE.PointLight(0xff7a30, 0, 3, 1.5); hot.position.set(0, 0.6, 0); TL.add(hot);
const CRUMB = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.006, 0), new THREE.MeshStandardMaterial({ color: 0xf0efea, roughness: 0.9 }), 500); CRUMB.frustumCulled = false; TL.add(CRUMB);
const CRUSH_I = Math.floor(TN / 2) * TN + Math.floor(TN / 2) + 3;
function tiles(cut, crush, t) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let i = 0;
  for (let a = 0; a < TN; a++) for (let b = 0; b < TN; b++) { const x = (a - TN / 2 + 0.5) * TS, z = (b - TN / 2 + 0.5) * TS; let sy = 1, y = 0; const id = a * TN + b;
    if (cut && x > 0.0) y = -100;                                         // the section: half the patch removed
    if (id === CRUSH_I) { sy = 1 - 0.85 * crush; y += 0; } m4.compose(V(x, y, z), q, V(1 - 0.15 * crush * (id === CRUSH_I ? 1 : 0), sy, 1)); TILE.setMatrixAt(i++, m4); }
  TILE.instanceMatrix.needsUpdate = true;
  const c = (() => { const a = Math.floor(CRUSH_I / TN), b = CRUSH_I % TN; return V((a - TN / 2 + 0.5) * TS, 0, (b - TN / 2 + 0.5) * TS); })();
  for (let k = 0; k < 500; k++) { const u = crush; const s = u > 0.05 ? 0.6 + hash(k) * 1.4 : 0; const ang = hash(k + 1) * TAU, r = u * (0.04 + hash(k + 2) * 0.12); m4.compose(V(c.x + Math.cos(ang) * r, -0.05 + 0.05 * (1 - u) + hash(k + 3) * 0.01 * (1 - u), c.z + Math.sin(ang) * r), q, V(s, s, s)); CRUMB.setMatrixAt(k, m4); }
  CRUMB.instanceMatrix.needsUpdate = true; }
// the press (generic jaws) that squeezes one tile
const PRESS = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.03, 0.16, 2, 0.006), metal(0x6a6e74, 0.3)); TL.add(PRESS); PRESS.visible = false;

// =====================================================================================================================
// THE HANGAR (a big arched museum hangar, generic): Discovery on its wheels
// =====================================================================================================================
const HG = new THREE.Group(); scene.add(HG); HG.position.set(6000, 0, 0);
{ const fl = sh(new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshPhysicalMaterial({ color: 0x8a8c90, roughness: 0.35, clearcoat: 0.6, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 24, 24) })), false, true); fl.rotation.x = -Math.PI / 2; HG.add(fl);
  for (let i = 0; i < 14; i++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(48, 0.6, 8, 64, Math.PI), metal(0x9aa0a8, 0.4)); arch.position.set(0, 0, -70 + i * 11); HG.add(arch); }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(48.5, 48.5, 160, 64, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3a3e46, roughness: 0.9, side: THREE.BackSide })); roof.rotation.x = Math.PI / 2; roof.rotation.z = Math.PI / 2; HG.add(roof);
  const back = new THREE.Mesh(new THREE.CircleGeometry(48, 64, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.9, side: THREE.DoubleSide })); back.position.z = -75; HG.add(back); }
const hSpots = [V(30, 40, 40), V(-30, 38, 20), V(0, 42, -40)].map((p, i) => { const s = new THREE.SpotLight(0xfff2e2, 1400, 160, 0.5, 0.7, 1.6); s.position.copy(p); s.target.position.set(0, 6, 0); s.castShadow = i === 0; s.shadow.mapSize.set(2048, 2048); HG.add(s, s.target); return s; });

// =====================================================================================================================
// ORBI: under Discovery's wing; a phone shows the file's QR code; a second phone scans it, types the code, it unlocks
// =====================================================================================================================
const IMG = { ph: await img("shots_live/phone.png") };
const phA = makePhone(), phB = makePhone(0x3a3d42); const OR = new THREE.Group(); OR.add(phA.g, phB.g); HG.add(OR); OR.position.set(14, 1.2, 22); OR.rotation.y = -0.5;
const table = sh(new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.12, 1.8, 3, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x23262b, roughness: 0.4, clearcoat: 0.5 }))); table.position.set(0, -0.12, 0); OR.add(table);
const tleg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 1.1, 24), metal(0x3a3d42, 0.4))); tleg.position.y = -0.7; OR.add(tleg);
phA.g.position.set(-0.6, 0.05, 0.1); phA.g.rotation.set(-Math.PI / 2 + 0.25, 0, 0.1); phB.g.position.set(0.7, 0.55, 0.45); phB.g.rotation.set(-0.35, -0.25, 0);
const scanBeam = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 4, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.2, 0.6), transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); OR.add(scanBeam);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); orbiL.position.set(0, 0.8, 0.3); OR.add(orbiL);
// a QR-like grid (decorative; drawn per frame from a fixed random pattern with the three finder squares)
H.reseed(77); const QR = Array.from({ length: 25 * 25 }, () => H.rnd() > 0.5);
function drawQR(g, x, y, s) { const c = s / 25; g.fillStyle = "#fff"; rr(g, x - 14, y - 14, s + 28, s + 28, 14); g.fill(); g.fillStyle = "#0b0d10";
  for (let i = 0; i < 25; i++) for (let j = 0; j < 25; j++) { const fin = (a, b) => i >= a && i < a + 7 && j >= b && j < b + 7; const inF = fin(0, 0) || fin(18, 0) || fin(0, 18);
    let on = QR[i * 25 + j]; if (inF) { const li = i % 18 % 7, lj = j % 18 % 7; on = li === 0 || li === 6 || lj === 0 || lj === 6 || (li >= 2 && li <= 4 && lj >= 2 && lj <= 4); } if (on) g.fillRect(x + i * c, y + j * c, c + 0.5, c + 0.5); } }
function drawA(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "rgba(8,10,14,.94)"; rr(g, 50, 380, 680, 980, 34); g.fill(); g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("discovery-photos.zip", 90, 450); g.fillStyle = "#9aa3ad"; g.font = "700 28px M"; g.fillText("1.2 GB · locked on this phone", 90, 495);
  drawQR(g, 165, 550, 450); g.fillStyle = "#9aa3ad"; g.font = "700 28px M"; g.fillText("CODE", 90, 1095); g.fillStyle = green; g.font = "900 72px M"; g.fillText("• • • •", 90, 1180);
  g.fillStyle = "#cfd6dd"; g.font = "700 26px M"; g.fillText("the code you chose · share it", 90, 1260); }
function drawB(g, st) { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688);
  if (st.mode === 0) { g.fillStyle = "#14181c"; g.fillRect(0, 0, 780, 1688); drawQR(g, 190, 560, 400); g.strokeStyle = green; g.lineWidth = 8; for (const [x, y, dx, dy] of [[150, 520, 1, 1], [630, 520, -1, 1], [150, 1000, 1, -1], [630, 1000, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * 70); g.lineTo(x, y); g.lineTo(x + dx * 70, y); g.stroke(); }
    g.fillStyle = green; g.font = "800 34px M"; g.fillText("SCANNING…", 270, 1120); }
  else { g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 60, 420, 660, 760, 30); g.fill(); g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("discovery-photos.zip", 100, 500);
    g.fillStyle = "#9aa3ad"; g.font = "700 28px M"; g.fillText("enter the code", 100, 560); for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(255,255,255,.1)"; rr(g, 100 + i * 140, 600, 110, 130, 18); g.fill(); if (i < st.typed) { g.fillStyle = "#fff"; g.font = "900 80px M"; g.fillText("•", 135 + i * 140, 695); } }
    if (st.open) { g.fillStyle = green; g.font = "800 40px M"; g.fillText("🔓 UNLOCKED", 100, 830); g.fillStyle = "#cfd6dd"; g.font = "700 28px M"; g.fillText("on this phone · 1.2 GB", 100, 885);
      g.fillStyle = green; rr(g, 100, 930, 580 * Math.min(1, st.got), 26, 12); g.fill(); } } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  scan: ["Laser scan", "#9fd4ff", "the real OV-103"], len: ["37.2 m long", "#ffd166", "nose to tail"], span: ["23.8 m wings", "#ffd166", "tip to tip"],
  belly: ["The belly", "#ff8a3d", "faces the heat"], tilesL: ["Silica tiles", "#cfd6dd", "almost pure quartz sand"], alu: ["Aluminium skin", "#9fb8c9", "max 175 °C"],
  core: ["White inside", "#f2efe8", "the black is only a coating"], crushL: ["So light", "#ff8a3d", "it crumbles in a hand"], rcc: ["Reinforced carbon-carbon", "#3dff8c", "nose cap + wing edges"],
  black: ["Black tiles", "#cfd6dd", "underneath: the hottest side"], white: ["White on top", "#f2efe8", "cooler side"], newT: ["Replaced tiles", "#9fd4ff", "solid black until first re-entry"],
  path: ["Glide path", "#3dff8c", "no engine"], fwdL: ["4.5 forward", "#6fd0ff", ""], dnL: ["1 down", "#ff8a3d", ""], qr: ["Its own QR code", green, "one per file"], code: ["+ a short code", green, "unlocks it"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("flights", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("SPACEFLIGHTS", "39", "#3dff8c")}${card("YEARS", "27")}${card("MOST OF ANY", "SPACECRAFT", "#ffd166")}</div>`, { left: "0px", top: "1440px" });
hudEl("temps", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("OUTSIDE", "1,650 °C", "#ff8a3d")}${card("ALUMINIUM MAX", "175 °C", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("count", `<div style="width:1080px;text-align:center"><div id="cN" style="font:900 170px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">0</div><div id="cL" style="font:800 40px D;letter-spacing:.12em;color:#cfd6dd;margin-top:6px">TILES</div></div>`, { left: "0px", top: "200px" });
hudEl("ratio", `<div style="width:1080px;text-align:center"><div style="font:900 150px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">4.5 : 1</div><div style="font:800 36px D;letter-spacing:.12em;color:#3dff8c;margin-top:6px">GLIDE RATIO ON APPROACH</div></div>`, { left: "0px", top: "210px" });
hudEl("mag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MAGNIFIED · SECTION</div>`, { left: "370px", top: "1110px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["QR PER FILE", "SHORT CODE", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { SPACE.visible = s === "space"; LAND.visible = s === "land"; TL.visible = s === "tiles"; HG.visible = s === "hangar"; ORB.visible = s !== "tiles";
  scene.fog = s === "land" ? LFOG : null; scene.background = s === "tiles" ? new THREE.Color(0x0a0b0d) : null; }
function lightLand(c) { H.key.color.set(0xffe2c0); H.key.intensity = 3.2; H.key.position.copy(c).addScaledVector(SUN_L, 120); H.key.target.position.copy(c); const s = H.key.shadow.camera; Object.assign(s, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0xb8cce6); H.hemi.groundColor.set(0x6a7058); H.hemi.intensity = 0.9; H.envK.value = 0.5; H.rimA.intensity = 0.3; H.rimB.intensity = 0.25; }
function lightSpace() { H.key.color.set(0xfff4e6); H.key.intensity = 2.6; H.key.position.copy(ORB.position).addScaledVector(SUN_S, 100); H.key.target.position.copy(ORB.position); H.key.castShadow = false; H.hemi.color.set(0x4a6a9a); H.hemi.groundColor.set(0x6a8ab0); H.hemi.intensity = 0.4; H.envK.value = 0.4; H.rimA.intensity = 0.2; H.rimB.intensity = 0; }
function lightHangar() { H.key.intensity = 0.0; H.key.castShadow = false; H.hemi.color.set(0xd0d6e0); H.hemi.groundColor.set(0x404040); H.hemi.intensity = 0.7; H.envK.value = 0.7; H.rimA.intensity = 0.3; H.rimB.intensity = 0.3; }
function lightTiles(k) { H.key.color.set(0xffffff); H.key.intensity = 1.4; H.key.position.copy(TL.position).add(V(2, 4, 3)); H.key.target.position.copy(TL.position); H.key.castShadow = false; H.hemi.color.set(0xa0a8b8); H.hemi.groundColor.set(0x202020); H.hemi.intensity = 0.6; H.envK.value = 0.5; hot.intensity = 3 * k; }
const shake = (t, a) => { H.cam.position.x += Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6; H.cam.position.y += Math.sin(t * 53 + 1) * a; };
const HGP = (x, y, z) => HG.localToWorld(V(x, y, z));
function inHangar() { orbAt(HG.position.clone(), 0, 0.5); }
/** the approach: u = 0..1 from ~120 m high to touchdown; glide 4.5:1, flare near the ground */
function approach(u) { const z = lerp(-560, 0, u); let y = Math.max(0, -z / 4.5); const fl = smooth(clamp((40 - y) / 40)); y = y * (1 - 0.65 * fl) + (u > 0.97 ? 0 : 0); const pitch = lerp(-0.2, 0.12, fl); return { p: V(0, y, z), pitch }; }

H.frame("A QR code per file. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.28; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000); EU.uT.value = t;
  OU.uHeat.value = 0; OU.uHi.value = 0; OU.uT.value = t; plasma(0, t); GS.visible = false; OR.visible = false; PRESS.visible = false; scanBeam.visible = false;

  if (t < at("real")) { // HOOK: Discovery on final approach, steep and silent, the runway ahead
    sets("land"); const u = lerp(0.35, 0.62, prog(t, 0, at("real"))); const a = approach(u); orbAt(a.p, a.pitch); lightLand(a.p);
    move(t, 0, at("real"), [a.p.clone().add(V(-46, 6, 18)), a.p.clone().add(V(0, 3, 8)), 34], [a.p.clone().add(V(-40, 4, 26)), a.p.clone().add(V(0, 3, 10)), 34], 0.08);
    title(t, fr("hook", 0.05), fr("hook", 0.6), "Space Shuttle", "Engines off", 150);
  } else if (t < at("heat")) { // THE REAL ONE in the hangar; then its size from above
    sets("hangar"); lightHangar(); inHangar(); const c = HGP(0, 6, 0);
    if (t < at("size")) { const a = 2.6 + (t - at("real")) * 0.08; move(t, at("real"), at("size"), [c.clone().add(V(Math.sin(a) * 58, 6, Math.cos(a) * 58)), c, 36], [c.clone().add(V(Math.sin(a + 0.08) * 54, 5, Math.cos(a + 0.08) * 54)), c, 36], 0.05);
      title(t, fr("real", 0.05), fr("real", 0.4), "The real OV-103", "Discovery", 150); callout("scan", t, fr("real", 0.2), fr("real", 0.5), OL(0, 6, 8), 300, 1150); hudShow("flights", win(t, fr("real", 0.5), at("size"))); }
    else { move(t, at("size"), at("heat"), [c.clone().add(V(0.1, 92, 0.5)), c, 34], [c.clone().add(V(0.1, 86, 0.5)), c, 34], 0.03); H.cam.up.copy(V(Math.sin(0.5), 0, Math.cos(0.5))); H.cam.lookAt(c); H.cam.updateMatrixWorld();
      callout("len", t, fr("size", 0.1), at("heat"), OL(0, 4, 18.6), 760, 520); callout("span", t, fr("size", 0.45), at("heat"), OL(11.8, 2, -12), 300, 1150); }
  } else if (t < at("alu")) { // RE-ENTRY: nose high, belly first, 1,650 °C outside
    sets("space"); const p = V(0, 0, 0); orbAt(p, -0.7, 0.2, 0.15); OU.uFlow.value.copy(V(0, 1, 0.4).normalize().applyQuaternion(ORB.quaternion).negate().negate()); OU.uFlow.value.set(0, 1, 0).applyAxisAngle(V(1, 0, 0), 0); OU.uFlow.value.copy(V(0.0, 1.0, -0.6).normalize());
    OU.uHeat.value = smooth(prog(t, at("heat"), fr("heat", 0.4))); plasma(OU.uHeat.value, t); lightSpace(); earthAt(80, 28, -80, 0.3); H.bloom.strength = 0.5;
    move(t, at("heat"), at("alu"), [V(-55, -20, 48), V(0, 0, 0), 36], [V(-50, -17, 42), V(0, 0, 0), 36], 0.06); shake(t, 0.03);
    callout("belly", t, fr("heat", 0.4), at("alu"), OL(4, 0.5, 2), 760, 1150); hudShow("temps", win(t, fr("heat", 0.3), at("alu")));
  } else if (t < at("rcc")) { // THE TILES: section on the aluminium; count; crush one
    if (t < at("tiles")) { sets("tiles"); lightTiles(1); tiles(true, 0, t); TU.uHot.value = 1;
      move(t, at("alu"), at("tiles"), [TL.position.clone().add(V(0.75, 0.45, 0.6)), TL.position.clone().add(V(-0.1, -0.04, 0)), 36], [TL.position.clone().add(V(0.65, 0.38, 0.5)), TL.position.clone().add(V(-0.1, -0.04, 0)), 36], 0.005);
      callout("tilesL", t, fr("alu", 0.1), at("tiles"), TL.position.clone().add(V(-0.02, -0.01, 0.1)), 300, 1000); callout("alu", t, fr("alu", 0.4), at("tiles"), TL.position.clone().add(V(-0.05, -0.062, 0.2)), 760, 1250);
      hudShow("temps", win(t, at("alu"), at("tiles"))); hudShow("mag", win(t, fr("alu", 0.1), at("tiles"))); }
    else if (t < at("crush")) { sets("hangar"); lightHangar(); inHangar(); H.hemi.groundColor.set(0xb0b4ba); H.hemi.intensity = 1.3; const c = HGP(0, 0.8, 0);
      move(t, at("tiles"), at("crush"), [OL(6, -0.2, -6), OL(0, 0.9, 6), 50], [OL(5, -0.2, -2), OL(0, 0.9, 9), 50], 0.02);
      H.$("cN").textContent = Math.round(24000 * smooth(prog(t, fr("tiles", 0.05), fr("tiles", 0.7)))).toLocaleString("en-US"); H.$("cL").textContent = "TILES"; hudShow("count", win(t, fr("tiles", 0.02), at("crush"))); }
    else { sets("tiles"); lightTiles(0); TU.uHot.value = 0; const k = smooth(prog(t, fr("crush", 0.25), fr("crush", 0.7))); tiles(false, k, t); hot.intensity = 0; H.key.intensity = 2.2;
      const a = Math.floor(CRUSH_I / TN), b = CRUSH_I % TN; const cp = TL.position.clone().add(V((a - TN / 2 + 0.5) * TS, 0, (b - TN / 2 + 0.5) * TS));
      PRESS.visible = false; PRESS.position.copy(cp).sub(TL.position).add(V(0, lerp(0.25, 0.04 - 0.042 * k, smooth(prog(t, at("crush"), fr("crush", 0.3)))), 0));
      move(t, at("crush"), at("rcc"), [cp.clone().add(V(0.38, 0.32, 0.3)), cp.clone().add(V(0, -0.01, 0)), 34], [cp.clone().add(V(0.33, 0.28, 0.26)), cp.clone().add(V(0, -0.01, 0)), 34], 0.004);
      callout("core", t, fr("crush", 0.15), fr("crush", 0.5), cp.clone().add(V(0.05, -0.02, 0.07)), 300, 1150); callout("crushL", t, fr("crush", 0.55), at("rcc"), cp.clone().add(V(0, 0.0, 0)), 760, 1150); }
  } else if (t < at("glide")) { // RCC on the nose and wing edges; black below, white on top
    sets("hangar"); lightHangar(); inHangar();
    if (t < at("colour")) { OU.uHi.value = smooth(prog(t, at("rcc"), fr("rcc", 0.3))); move(t, at("rcc"), at("colour"), [OL(-22, 3, 38), OL(0, 3, 6), 36], [OL(-19, 2.5, 34), OL(0, 3, 6), 36], 0.03); callout("rcc", t, fr("rcc", 0.3), at("colour"), OL(0, 3.2, 17.4), 760, 1150); }
    else { const k = smooth(prog(t, at("colour"), fr("colour", 0.9))); const y = lerp(22, -2.0, k); move(t, at("colour"), at("glide"), [OL(-30, y, 10), OL(0, 3, 0), 40], [OL(-30, y, 10), OL(0, 3, 0), 40], 0.02);
      callout("white", t, fr("colour", 0.05), fr("colour", 0.45), OL(-5, 5.0, 2), 300, 1000); callout("black", t, fr("colour", 0.55), at("glide"), OL(-5, 1.2, 2), 760, 1250); }
  } else if (t < at("orbi")) { // THE GLIDE: 4.5 forward for 1 down; the steep dive; the flare and touchdown; then tiles still original
    if (t < at("orig")) { sets("land"); GS.visible = t < at("steep");
      const u = t < at("steep") ? lerp(0.05, 0.4, prog(t, at("glide"), at("steep"))) : lerp(0.4, 1.0, prog(t, at("steep"), at("orig"))); const a = approach(u); orbAt(a.p, a.pitch); lightLand(a.p);
      if (t < at("steep")) { move(t, at("glide"), at("steep"), [a.p.clone().add(V(-115, 4, 0)), a.p.clone().add(V(0, -12, 28)), 40], [a.p.clone().add(V(-105, 2, 6)), a.p.clone().add(V(0, -12, 28)), 40], 0.1); hudShow("ratio", win(t, fr("glide", 0.15), at("steep")));
        callout("path", t, fr("glide", 0.2), at("steep"), V(0, 70, -315), 760, 1150); callout("fwdL", t, fr("glide", 0.5), at("steep"), V(0, 0, -270), 300, 1350); callout("dnL", t, fr("glide", 0.65), at("steep"), V(0, 60, -540), 300, 900); }
      else { move(t, at("steep"), at("orig"), [a.p.clone().add(V(-34, 2, 30)), a.p.clone().add(V(0, 3, 6)), 36], [a.p.clone().add(V(-30, 1.5, 24)), a.p.clone().add(V(0, 3, 6)), 36], 0.1); } }
    else { sets("hangar"); lightHangar(); inHangar(); H.hemi.groundColor.set(0xb0b4ba); H.hemi.intensity = 1.3; move(t, at("orig"), at("orbi"), [OL(-8, -0.3, -4), OL(0, 1.0, 4), 46], [OL(-7, -0.3, 0), OL(0, 1.0, 8), 46], 0.02);
      H.$("cN").textContent = Math.round(lerp(24000, 18000, smooth(prog(t, fr("orig", 0.2), fr("orig", 0.7))))).toLocaleString("en-US"); H.$("cL").textContent = "STILL ORIGINAL"; hudShow("count", win(t, fr("orig", 0.05), at("orbi")));
      callout("newT", t, fr("orig", 0.5), at("orbi"), OL(2, 0.9, 6), 760, 1150); }
  } else { // ORBI: a QR code and a code
    sets("hangar"); lightHangar(); inHangar(); OR.visible = true; OR.updateMatrixWorld(true); const OW = (x, y, z) => OR.localToWorld(V(x, y, z)); orbiL.intensity = 0.6;
    const mode = t < fr("orbi2", 0.4) ? 0 : 1, typed = Math.round(clamp(prog(t, fr("orbi2", 0.45), fr("orbi2", 0.7))) * 4), open = t > fr("orbi2", 0.75);
    screen(phA, { a: 1 }, drawA); screen(phB, { mode, typed, open: open ? 1 : 0, got: Math.round(clamp(prog(t, fr("orbi2", 0.75), fr("orbi3", 0.5))) * 30) / 30 }, drawB);
    scanBeam.visible = mode === 0 && t > fr("orbi2", 0.05); scanBeam.position.copy(phB.g.position).add(phA.g.position).multiplyScalar(0.5); scanBeam.lookAt(OW(...phA.g.position.toArray())); scanBeam.rotateX(Math.PI / 2);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.2, 3.2, 6.0), OW(0, 0.6, -2), 44], [OW(0.3, 2.8, 5.2), OW(0, 0.6, -2), 44], 0.2);
    else if (t < at("orbi3")) { const pn = V(0, 0, 1).applyEuler(phB.g.rotation), pc = phB.g.position.clone(), up2 = V(0, 1, 0).applyEuler(phB.g.rotation);
      move(t, at("orbi2"), at("orbi3"), [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 36], [OW(...pc.clone().addScaledVector(pn, 2.8).toArray()), OW(...pc.toArray()), 36], 0.02);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); H.cam.updateMatrixWorld(); }
    else { move(t, at("orbi3"), at("end"), [OW(0.2, 3.0, 5.8), OW(0, 0.8, -2), 44], [OW(0.3, 2.7, 5.0), OW(0, 0.8, -2), 44], 0.2); hudShow("chips", win(t, fr("orbi3", 0.2), at("end"))); }
    callout("qr", t, fr("orbi", 0.3), fr("orbi2", 0.1), OW(...phA.g.position.clone().add(V(0, 0.15, -0.2)).toArray()), 300, 900); callout("code", t, fr("orbi", 0.6), fr("orbi2", 0.1), OW(...phA.g.position.clone().add(V(0, 0.05, 0.45)).toArray()), 760, 1150);
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
