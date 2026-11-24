// How Apollo 11 came home: the real command module "Columbia" (Smithsonian 3D scan, CC0, 3d.si.edu) through re-entry.
// Facts (Wikipedia: Apollo 11; Apollo command and service module; AVCOAT; Communications blackout; Apollo 10):
//   CM 12 ft 10 in (3.91 m) across; Avcoat in a fiberglass honeycomb, 2 in thick at the base; the shield chars and melts away,
//   carrying the heat off; silver Mylar outer coating (Block II); lunar-return entry ≈ 11 km/s (Apollo 10's 11.08 km/s is the
//   record); Apollo radio blackout ≈ 3 min; Apollo 11 peak 6.5 g; 2 drogues (16.5 ft) then 3 ringsail mains (83.5 ft ≈ 25 m);
//   splashdown 22 mph (≈ 35 km/h) in the North Pacific, 24 July 1969, landed upside down, righted by flotation bags.
// The scan shows the capsule as it is today, after the flight (forward heat shield gone, top bay open): in the flight shots
// the camera stays below the cone so the open top is not shown as if it had flown that way.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { makePhone, makeLaptop, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false; H.r.localClippingEnabled = true;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }
const NOISE = `
float hh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float nz(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hh(i), hh(i + vec3(1,0,0)), f.x), mix(hh(i + vec3(0,1,0)), hh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hh(i + vec3(0,0,1)), hh(i + vec3(1,0,1)), f.x), mix(hh(i + vec3(0,1,1)), hh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * nz(p); p = p * 2.03 + 3.1; a *= 0.5; } return s; }`;

// =====================================================================================================================
// THE CAPSULE: the Smithsonian scan (cm, axis along -z) stood upright: y = -z, heat-shield bottom at y = 0, ×0.01 → metres
// =====================================================================================================================
const CAP = new THREE.Group(); scene.add(CAP);          // capsule-local: y up the axis, heat shield at y = 0, apex y ≈ 2.74
const CUT = new THREE.Plane(V(-1, 0, 0), 1e4);           // cut-away plane (world), off by default
const CU = { uCapC: { value: V() }, uSilver: { value: 0 }, uHeat: { value: 0 }, uFlow: { value: V(0, 1, 0) }, uT: { value: 0 }, uSec: { value: 0 }, uWin: { value: 0 } };
const prep = (g) => { g = g.clone(); g.rotateX(Math.PI / 2); g.translate(0, -43.58, 0); g.scale(0.01, 0.01, 0.01); return g; };
function capMat(mat, inner = false) {
  mat.side = THREE.DoubleSide; mat.clippingPlanes = [CUT]; mat.clipShadows = true;
  mat.onBeforeCompile = (s) => { Object.assign(s.uniforms, CU);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vWN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
      uniform float uSilver, uHeat, uT, uSec, uWin; uniform vec3 uFlow, uCapC; varying vec3 vWP; varying vec3 vWN; ${NOISE}`)
      .replace("#include <map_fragment>", `#include <map_fragment>
      ${inner ? "" : `{ float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
        // Block II silver Mylar over the whole shell: bright, slightly crinkled film (scan detail still shows through)
        float cr = fbm(vWP * 9.0) * 0.18; vec3 sil = vec3(0.86, 0.87, 0.9) * (0.78 + 0.35 * l + cr);
        float edge = fbm(vWP * 3.0 + 4.0) * 0.5; float k = smoothstep(edge, edge + 0.08, uSilver);
        diffuseColor.rgb = mix(diffuseColor.rgb, sil, k); }`}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n ${inner ? "" : "roughnessFactor = mix(roughnessFactor, 0.22, uSilver);"}`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\n ${inner ? "" : "metalnessFactor = mix(metalnessFactor, 0.92, uSilver);"}`)
      .replace("#include <opaque_fragment>", `
      ${inner ? "" : `{ // re-entry heat: the face turned into the air glows; brightest at the stagnation point, the rim, and where the char flakes
        float f = dot(normalize(vWN), -uFlow); float hot = smoothstep(0.15, 0.95, f) * uHeat;
        float flick = 0.75 + 0.5 * fbm(vWP * 5.0 + uFlow * uT * 9.0);
        vec3 hc = mix(vec3(1.0, 0.32, 0.06), vec3(1.0, 0.82, 0.55), smoothstep(0.5, 1.0, hot));
        float rr = length(cross(vWP - uCapC, uFlow)); float shoulder = smoothstep(1.2, 1.95, rr); float fl2 = fbm(vWP * 2.5 + uFlow * uT * 6.0);
        vec3 rd = normalize(cross(cross(uFlow, vWP - uCapC), uFlow) + 1e-4); float along = dot(vWP - uCapC, rd);
        float rid = 1.0 - abs(2.0 * fbm(vWP * 3.5 + uFlow * uT * 2.0 + rd * along * 0.0) - 1.0); rid = pow(rid, 5.0);
        vec3 hc2 = mix(vec3(0.55, 0.07, 0.01), vec3(1.0, 0.5, 0.12), clamp(shoulder * 0.7 + rid, 0.0, 1.0));
        outgoingLight = outgoingLight * (1.0 - 0.85 * hot) + hc2 * hot * (0.12 + 0.9 * rid + 0.7 * shoulder) * (0.8 + 0.4 * fl2);
        float side = smoothstep(-0.2, 0.25, f) * (1.0 - smoothstep(0.25, 0.8, f)); outgoingLight += vec3(1.0, 0.4, 0.15) * side * uHeat * 0.25 * flick; }`}
      if (!gl_FrontFacing && uSec > 0.5) outgoingLight *= 0.35;
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => "cap" + (inner ? "i" : "o");
  return mat;
}
const gx = await new GLTFLoader().loadAsync("kit/models/apollo/apollo_exterior-150k-4096.glb");
const EXT = new THREE.Group(), INT = new THREE.Group(); CAP.add(EXT, INT); INT.visible = false;
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x05070a, roughness: 0.04, metalness: 0, clearcoat: 1, clippingPlanes: [CUT], side: THREE.DoubleSide });
const winGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.2, 0.35), toneMapped: false, clippingPlanes: [CUT], side: THREE.DoubleSide, transparent: true, opacity: 0 });
gx.scene.traverse((o) => { if (!o.isMesh) return; const g = prep(o.geometry);
  if (!o.material.map) { const m = new THREE.Mesh(g, glassMat); EXT.add(m); const w = new THREE.Mesh(g, winGlow); w.renderOrder = 2; EXT.add(w); return; }  // the window panes
  const m = sh(new THREE.Mesh(g, capMat(o.material))); EXT.add(m); });
const gi = await new GLTFLoader().loadAsync("kit/models/apollo/apollo_interior-medium.glb");
gi.scene.traverse((o) => { if (!o.isMesh) return; const m = new THREE.Mesh(prep(o.geometry), capMat(o.material, true)); m.receiveShadow = true; INT.add(m); });
const CAP_H = 2.741, CAP_R = 1.955;
const CL = (x, y, z) => CAP.localToWorld(V(x, y, z));     // capsule-local → world
const capLight = new THREE.PointLight(0xffb070, 0, 6, 2); capLight.position.set(0, 1.2, 0); CAP.add(capLight);   // the cabin lit by the window glow
function capReset() { CAP.position.set(0, 0, 0); CAP.quaternion.identity(); CAP.scale.setScalar(1); CU.uSilver.value = 0; CU.uHeat.value = 0; CU.uSec.value = 0; INT.visible = false; CUT.constant = 1e4; winGlow.opacity = 0; capLight.intensity = 0; CAP.visible = true; }

// =====================================================================================================================
// SPACE: stars, the Earth (shader: day, night lights, clouds with fine detail, ocean glint, atmosphere), the Sun
// =====================================================================================================================
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
// RE-ENTRY: the flow frame FLOW (air streams along +y in FLOW-local), the bow shock, the shock layer, the wake, sparks
// =====================================================================================================================
const FLOW = new THREE.Group(); scene.add(FLOW);
const PU = { uT: { value: 0 }, uI: { value: 0 }, uWake: { value: 0 }, uWire: { value: 0 } };
const plasmaMat = (frag, extra = {}) => new THREE.ShaderMaterial({ uniforms: PU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false, ...extra,
  vertexShader: `varying vec3 vL; varying vec3 vW; varying vec3 vN; void main(){ vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT, uI, uWake, uWire; varying vec3 vL; varying vec3 vW; varying vec3 vN; ${NOISE}
    vec3 pcol(float k){ return mix(mix(vec3(0.9, 0.25, 0.55), vec3(1.0, 0.45, 0.12), smoothstep(0.0, 0.45, k)), vec3(1.0, 0.92, 0.75), smoothstep(0.55, 1.0, k)); }
    void main(){ ${frag} }` });
// bow shock: a paraboloid standing ~0.5 m ahead of the shield, opening downstream (+y)
const SHOCK_Y = -0.62, SHOCK_K = 0.2;    // y = SHOCK_Y + SHOCK_K r²
{ const pts = []; for (let i = 0; i <= 60; i++) { const r = (i / 60) ** 1.6 * 7.5; pts.push(new THREE.Vector2(r, SHOCK_Y + SHOCK_K * r * r)); }
  const g = new THREE.LatheGeometry(pts, 96);
  const m = new THREE.Mesh(g, plasmaMat(`
    float r = length(vL.xz), y = vL.y - ${SHOCK_Y.toFixed(2)}; vec3 v = normalize(cameraPosition - vW);
    float edge = pow(1.0 - abs(dot(normalize(vN), v)), 1.5);
    float flow = fbm(vec3(vL.x * 1.6, vL.y * 0.7 - uT * 14.0, vL.z * 1.6));
    float k = exp(-r * 0.42) * (0.55 + 0.45 * flow);
    vec3 c = pcol(k) * (0.08 + 0.9 * edge * edge) * k * 0.55 * uI;
    c += vec3(0.4, 0.8, 1.0) * uWire * edge * exp(-r * 0.15) * 1.2;          // the shock surface outlined (the "blunt" explainer)
    gl_FragColor = vec4(c * (1.0 - smoothstep(4.5, 7.5, r)), 1.0);`));
  m.frustumCulled = false; FLOW.add(m); FLOW.userData.shock = m; }
// shock layer: the white-hot air pressed between the shock and the shield
{ const g = new THREE.SphereGeometry(1, 64, 32); g.scale(2.25, 0.62, 2.25);
  const m = new THREE.Mesh(g, plasmaMat(`vec3 v = normalize(cameraPosition - vW); float e = abs(dot(normalize(vN), v));
    float n = fbm(vL * 3.0 + vec3(0.0, -uT * 10.0, 0.0)); float k = smoothstep(0.0, 0.9, e) * (0.6 + 0.6 * n);
    gl_FragColor = vec4(pcol(0.45 + 0.4 * n) * k * k * 0.42 * uI, 1.0);`));
  m.position.y = -0.1; m.frustumCulled = false; FLOW.add(m); FLOW.userData.layer = m; }
// the wake: a long glowing trail behind the capsule (flowing turbulence)
{ const pts = []; for (let i = 0; i <= 80; i++) { const y = 0.4 + (i / 80) ** 1.3 * 120; pts.push(new THREE.Vector2(2.1 + Math.sqrt(y) * 0.9 + y * 0.03, y)); }
  const g = new THREE.LatheGeometry(pts, 64);
  const m = new THREE.Mesh(g, plasmaMat(`vec3 v = normalize(cameraPosition - vW); float e = pow(abs(dot(normalize(vN), v)), 0.8);
    float y = vL.y; float n = fbm(vec3(vL.x * 0.6, y * 0.12 - uT * 6.0, vL.z * 0.6)); float n2 = fbm(vec3(vL.x * 2.0, y * 0.5 - uT * 20.0, vL.z * 2.0));
    float k = exp(-y * 0.028) * smoothstep(0.3, 3.0, y) * (0.35 + 0.9 * n * n2) * e;
    gl_FragColor = vec4(pcol(0.3 + 0.6 * exp(-y * 0.04)) * k * 0.5 * uWake, 1.0);`));
  m.frustumCulled = false; FLOW.add(m); FLOW.userData.wake = m; }
// sparks: char flakes and hot gas torn off the rim, streaking downstream
const NSP = 900, SPARK = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.004, 1, 4, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.8, 0.25), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), NSP);
SPARK.frustumCulled = false; FLOW.add(SPARK);
const SPD = Array.from({ length: NSP }, (_, i) => ({ a: hash(i) * TAU, r: 0.6 + hash(i + 7) * 1.5, v: 18 + hash(i + 3) * 40, o: hash(i + 11), s: 0.4 + hash(i + 5) }));
function sparks(t, k, len = 1) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  SPD.forEach((p, i) => { const u = ((p.o + t * p.v / 60) % 1 + 1) % 1; const y = u * 60 * (0.5 + p.s * 0.5); const r = p.r + y * 0.12 + Math.sin(t * 3 + i) * 0.1 * y * 0.1;
    const s = k * (1 - u) * p.s; m4.compose(V(Math.cos(p.a + y * 0.02) * (1.6 + r * 0.6), -0.1 + y, Math.sin(p.a + y * 0.02) * (1.6 + r * 0.6)), q, V(s * 1.5, s * (0.6 + p.v * 0.05) * len, s * 1.5)); SPARK.setMatrixAt(i, m4); });
  SPARK.instanceMatrix.needsUpdate = true; }
// streamlines for the "blunt" explainer: air coming up from below, swerving at the shock, sliding around the body
const SL = new THREE.Group(); FLOW.add(SL); SL.visible = false; const SLU = { uT: { value: 0 }, uK: { value: 0 } };
for (let l = 0; l < 14; l++) { const x0 = (l / 13 * 2 - 1) * 3.4; if (Math.abs(x0) < 0.1) continue; const ys = SHOCK_Y + SHOCK_K * x0 * x0; const pts = [];
  for (let i = 0; i <= 80; i++) { const y = -9 + i / 80 * 19; let x = x0; if (y > ys) { const dd = y - ys; x = x0 + Math.sign(x0) * (1 - Math.exp(-dd * 1.6)) * Math.max(0.15, 2.3 - Math.abs(x0) * 0.5); } pts.push(V(x, y, 0)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.028, 6, false);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...SLU, uYs: { value: ys } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vU; varying float vY; void main(){ vU = uv; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT, uK, uYs; varying vec2 vU; varying float vY; void main(){ float p = fract(vU.x * 6.0 - uT * 0.9); float pulse = smoothstep(0.0, 0.25, p) * smoothstep(0.45, 0.25, p);
      float hot = smoothstep(uYs - 0.1, uYs + 0.4, vY); vec3 c = mix(vec3(0.35, 0.75, 1.3), vec3(1.4, 0.6, 0.2), hot);
      gl_FragColor = vec4(c * (0.18 + 1.1 * pulse) * uK * smoothstep(-9.0, -6.0, vY) * (1.0 - smoothstep(6.0, 10.0, vY)), 1.0); }` }));
  m.frustumCulled = false; SL.add(m); }
function streamlines(t, k) { SLU.uT.value = t; SLU.uK.value = k; }
const TRIM = THREE.MathUtils.degToRad(-25);   // the capsule flew tilted: the offset centre of mass gives a little lift
function flowSet(pos, travel, roll = 0) {     // FLOW at pos, air streaming opposite to `travel`
  FLOW.position.copy(pos); FLOW.quaternion.setFromUnitVectors(V(0, -1, 0), travel.clone().normalize());
  FLOW.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), roll));
  // the capsule: heat shield into the flow, tilted by the trim angle, its bottom centre ~ at the FLOW origin
  CAP.quaternion.copy(FLOW.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), TRIM));
  CAP.position.copy(pos).add(V(0, 0.15, 0).applyQuaternion(FLOW.quaternion));
  CU.uFlow.value.copy(V(0, 1, 0).applyQuaternion(FLOW.quaternion)); CU.uCapC.value.copy(CAP.position);
  FLOW.updateMatrixWorld(true); CAP.updateMatrixWorld(true);
}
const FW = (x, y, z) => FLOW.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE HEAT SHIELD, magnified: Avcoat gunned into a fiberglass honeycomb on the steel structure; the char front eats in
// =====================================================================================================================
const HC = new THREE.Group(); scene.add(HC); HC.visible = false;
const HU = { uChar: { value: 0 }, uRecede: { value: 0 }, uT: { value: 0 }, uHot: { value: 0 } };
const CELL = 0.1, NX = 22, NZ = 22, DEPTH = 0.5;   // cell size (scene units; magnified), shield depth
const HR = CELL * 0.57735, cellPos = []; for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) cellPos.push(V((i - NX / 2 + (j % 2) * 0.5) * CELL, 0, (j - NZ / 2) * 1.5 * HR));
const hexFill = new THREE.CylinderGeometry(CELL * 0.55, CELL * 0.55, 1, 6, 1).translate(0, -0.5, 0);
const HCUT = new THREE.Plane(V(-1, 0, 0), 0.025);
const fillMat = new THREE.MeshStandardMaterial({ color: 0x8d8478, roughness: 0.85, side: THREE.DoubleSide, clippingPlanes: [HCUT] });
fillMat.onBeforeCompile = (s) => { Object.assign(s.uniforms, HU);
  s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;");
  s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nuniform float uChar, uRecede, uT, uHot; varying vec3 vWP; ${NOISE}`)
    .replace("#include <map_fragment>", `#include <map_fragment>
      float dpt = -vWP.y;                                              // depth below the original surface
      float front = uChar * ${(DEPTH * 0.55).toFixed(3)};              // the char front
      float n = fbm(vWP * 30.0);
      float charK = smoothstep(front + 0.012, front - 0.012, dpt + (n - 0.5) * 0.02);
      float pyro = exp(-abs(dpt - front) * 60.0) * step(0.001, uChar);
      diffuseColor.rgb = mix(diffuseColor.rgb * (0.85 + 0.3 * n), vec3(0.05, 0.045, 0.04) * (0.7 + 0.6 * n), charK);`)
    .replace("#include <opaque_fragment>", `if (!gl_FrontFacing) outgoingLight = diffuseColor.rgb * 0.55;
      outgoingLight += vec3(1.0, 0.35, 0.08) * pyro * 2.5 * uHot + vec3(1.0, 0.4, 0.1) * charK * smoothstep(-0.01, 0.0, -dpt - uRecede + 0.02) * uHot * (0.6 + n);
      #include <opaque_fragment>`); };
const FILL = sh(new THREE.InstancedMesh(hexFill, fillMat, cellPos.length)); HC.add(FILL);
const wallGeo = new THREE.BoxGeometry(HR * 1.02, 1, 0.004).translate(0, -0.5, CELL * 0.5);
const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6d6a8, roughness: 0.6, side: THREE.DoubleSide, clippingPlanes: [HCUT] }); wallMat.onBeforeCompile = fillMat.onBeforeCompile;
const WALL = sh(new THREE.InstancedMesh(wallGeo, wallMat, cellPos.length * 6)); HC.add(WALL);
const steel = sh(new THREE.Mesh(new THREE.BoxGeometry(NX * CELL * 1.1, 0.06, NZ * CELL * 1.1), matte(0x3a3d42, 0.6))); steel.position.y = -DEPTH - 0.03; HC.add(steel);
const hcHeat = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShaderMaterial({ uniforms: HU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT, uHot; varying vec2 vU; ${NOISE} void main(){ float n = fbm(vec3(vU * 6.0, uT * 2.0)) ; float k = uHot * (0.3 + 0.7 * n) * smoothstep(0.5, 0.1, length(vU - 0.5)); gl_FragColor = vec4(vec3(1.0, 0.45, 0.15) * k * 0.9, 1.0); }` }));
hcHeat.rotation.x = -Math.PI / 2; hcHeat.position.y = 1.4; HC.add(hcHeat); hcHeat.visible = false;
const hcLight = new THREE.PointLight(0xff7a30, 0, 6, 1.5); hcLight.position.set(0, 0.8, 0); HC.add(hcLight);
const NFL = 400, FLAKE = new THREE.InstancedMesh(new THREE.BoxGeometry(0.011, 0.003, 0.011), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.6, 0.15), toneMapped: false }), NFL); FLAKE.frustumCulled = false; HC.add(FLAKE);
function shieldCells(char, recede, crossCut) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let w = 0;
  cellPos.forEach((p, i) => { const cut = false;                     // the cut: cells in front of the section are removed
    const top = -recede; const h = DEPTH + top;
    m4.compose(V(p.x, cut ? -100 : top, p.z), q, V(1, h, 1)); FILL.setMatrixAt(i, m4);
    for (let k = 0; k < 6; k++) { q.setFromAxisAngle(V(0, 1, 0), k * TAU / 6 + Math.PI / 6); m4.compose(V(p.x, cut ? -100 : top, p.z), q, V(1, h, 1)); WALL.setMatrixAt(w++, m4); } q.identity(); });
  FILL.instanceMatrix.needsUpdate = WALL.instanceMatrix.needsUpdate = true; HU.uChar.value = char; HU.uRecede.value = recede;
}
function flakes(t, k) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < NFL; i++) { const u = ((hash(i) + t * (0.3 + hash(i + 1) * 0.5)) % 1); const x = (hash(i + 2) - 0.5) * 2.2 + u * 1.6, z = (hash(i + 3) - 0.5) * 2.2;
    q.setFromEuler(new THREE.Euler(t * 3 + i, t * 2 + i * 0.3, 0)); const s = k * (1 - u) * (0.5 + hash(i + 4)); m4.compose(V(x, -HU.uRecede.value + u * 0.9, z), q, V(s, s, s)); FLAKE.setMatrixAt(i, m4); }
  FLAKE.instanceMatrix.needsUpdate = true; }

// =====================================================================================================================
// THE PACIFIC AT DAWN: sky, Gerstner ocean, spray; parachutes (2 conical-ribbon drogues, 3 orange-and-white ringsail mains)
// =====================================================================================================================
const SKYS = (() => { const a = (0.5977 - 0.5) * TAU, e = THREE.MathUtils.degToRad(9.5); return V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).normalize(); })();
const OCEAN = new THREE.Group(); scene.add(OCEAN);
const skyU = { uSky: { value: tex("kit/ph/qwantani_sunrise_puresky/sky_4k.jpg", true) }, uSun: { value: SKYS } }; skyU.uSky.value.wrapS = THREE.RepeatWrapping; skyU.uSky.value.repeat.set(1, 1);
const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun; varying vec3 vD; void main(){ vec3 d = normalize(vD);
    vec3 c = texture2D(uSky, vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb;
    if (d.y < 0.0) c = vec3(0.24, 0.3, 0.36); gl_FragColor = vec4(c, 1.0); }` }));
sky.renderOrder = -10; sky.frustumCulled = false; OCEAN.add(sky);
const waterN = (() => { const N = 256, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N); H.reseed(5);
  const W2 = Array.from({ length: 24 }, () => ({ kx: Math.round((H.rnd() - 0.5) * 14), ky: Math.round((H.rnd() - 0.5) * 14), ph: H.rnd() * TAU, a: 0.4 + H.rnd() })); const hh = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const q of W2) { const k = Math.hypot(q.kx, q.ky) || 1; v += (q.a / k) * Math.sin(((q.kx * x + q.ky * y) / N) * TAU + q.ph); } hh[y * N + x] = v; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = hh[y * N + (x + 1) % N] - hh[y * N + (x + N - 1) % N], dy = hh[((y + 1) % N) * N + x] - hh[((y + N - 1) % N) * N + x]; const n = V(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * N + x) * 4;
    im.data[i] = (n.x * 0.5 + 0.5) * 255; im.data[i + 1] = (n.y * 0.5 + 0.5) * 255; im.data[i + 2] = (n.z * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
// 6 ft seas, 17 kt wind (the recovery-site report): a long swell plus wind waves
const WAVES = [[1, 0.2, 60, 0.55], [0.8, -0.45, 33, 0.35], [0.95, 0.5, 17, 0.2], [0.6, -0.8, 9, 0.12], [0.98, 0.1, 5.5, 0.06], [0.4, 0.9, 3.4, 0.035]].map(([x, z, L, a]) => { const n = Math.hypot(x, z); return new THREE.Vector4(x / n, z / n, L, a); });
const sea = new Water(new THREE.PlaneGeometry(12000, 12000, 420, 420), { textureWidth: 1024, textureHeight: 1024, waterNormals: waterN, sunDirection: SKYS.clone(), sunColor: 0xffd2a0, waterColor: 0x0e3444, distortionScale: 6.5, fog: true });
sea.rotation.x = -Math.PI / 2; OCEAN.add(sea); sea.frustumCulled = false;
{ const m = sea.material; m.uniforms.uW = { value: WAVES }; m.uniforms.uWT = { value: 0 }; m.uniforms.uAmp = { value: 1 };
  m.vertexShader = m.vertexShader.replace("varying vec4 worldPosition;", "varying vec4 worldPosition; uniform vec4 uW[6]; uniform float uWT, uAmp;")
    .replace(`mirrorCoord = modelMatrix * vec4( position, 1.0 );
					worldPosition = mirrorCoord.xyzw;`, `vec4 wp = modelMatrix * vec4( position, 1.0 ); vec3 b = wp.xyz;
					float fade = 1.0 / (1.0 + length(b.xz - cameraPosition.xz) / 1200.0);
					for (int i = 0; i < 6; i++) { vec2 d = uW[i].xy; float k = 6.2831853 / uW[i].z, a = uW[i].w * fade * uAmp, c = sqrt(9.81 / k); float f = k * (dot(d, b.xz) - c * uWT); float Q = 0.5 / (k * a * 6.0 + 1e-4);
						wp.x += Q * a * d.x * cos(f); wp.z += Q * a * d.y * cos(f); wp.y += a * sin(f); }
					mirrorCoord = wp; worldPosition = wp;`).replace("vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );", "vec4 mvPosition = viewMatrix * worldPosition;");
  m.needsUpdate = true; }
/** the sea height at (x, z) and time (same Gerstner sum, near the camera) */
function seaY(x, z, t, amp = 1) { let y = 0; for (const w of WAVES) { const k = TAU / w.z, c = Math.sqrt(9.81 / k); y += w.w * amp * Math.sin(k * (w.x * x + w.y * z - c * t)); } return y; }
const OFOG = new THREE.FogExp2(0xc9b8a8, 0.00022);
// spray at splashdown
const NSPR = 1800, SPRAY = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshStandardMaterial({ color: 0xf2f7f9, roughness: 0.2, transparent: true, opacity: 0.75 }), NSPR); SPRAY.frustumCulled = false; OCEAN.add(SPRAY);
function spray(t, t0, c) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const dt = t - t0;
  for (let i = 0; i < NSPR; i++) { const a = hash(i) * TAU, sp = 2 + hash(i + 1) * 9, up = 3 + hash(i + 2) * 11; const tt = Math.max(0, dt - hash(i + 3) * 0.15);
    const y = up * tt - 4.9 * tt * tt; const r = CAP_R * 0.9 + sp * tt; const s = dt > 0 && y > -0.3 ? (0.5 + hash(i + 4) * 1.5) * clamp(1 - tt / 2.2) : 0; const vy = up - 9.8 * tt; const st = 1 + Math.min(4, Math.hypot(sp, vy) * 0.35);
    q.setFromUnitVectors(V(0, 1, 0), V(Math.cos(a) * sp, vy, Math.sin(a) * sp).normalize()); m4.compose(V(c.x + Math.cos(a) * r, c.y + Math.max(-0.2, y), c.z + Math.sin(a) * r), q, V(s, s * st, s)); SPRAY.setMatrixAt(i, m4); }
  SPRAY.instanceMatrix.needsUpdate = true; }
// foam ring on the water
const foam = new THREE.Mesh(new THREE.RingGeometry(1.6, 7, 64, 1), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uT: { value: 0 } }, transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uK, uT; varying vec2 vP; ${NOISE} void main(){ float r = length(vP); float n = fbm(vec3(vP * 1.4, uT * 0.3)); float a = smoothstep(7.0, 2.0, r) * smoothstep(1.5, 2.3, r) * smoothstep(0.35, 0.65, n) * uK; gl_FragColor = vec4(vec3(0.92, 0.95, 0.96), a * 0.85); }` }));
foam.rotation.x = -Math.PI / 2; OCEAN.add(foam);
// parachutes: lathe canopies with gores (orange/white) and ring gaps, suspension lines down to the apex
function canopy(D, H_, gores, ringsail) {
  const pts = []; const R = D / 2; for (let i = 0; i <= 24; i++) { const u = i / 24; const r = R * Math.sin(u * Math.PI / 2) ** 0.9; pts.push(new THREE.Vector2(Math.max(0.02, r), H_ * Math.cos(u * Math.PI / 2) ** 1.2)); }
  const g = new THREE.LatheGeometry(pts, gores * 6);
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const x = c.getContext("2d");
  for (let i = 0; i < gores; i++) { x.fillStyle = i % 2 ? "#f2efe8" : "#e8691e"; x.fillRect(i / gores * 1024, 0, 1024 / gores + 1, 512); }
  if (ringsail) for (let k = 0; k < 9; k++) { const y = 90 + k * 46; x.clearRect(0, y, 1024, 7); }            // ringsail gaps
  else for (let k = 0; k < 14; k++) { const y = 40 + k * 33; x.clearRect(0, y, 1024, 12); }                    // ribbon drogue: open slots
  x.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 0; i < gores; i++) x.fillRect(i / gores * 1024 - 1, 0, 3, 512);   // radial tapes
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 });
  m.onBeforeCompile = (s) => { s.uniforms.uT = CHU.uT; s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT;").replace("#include <begin_vertex>", `#include <begin_vertex>
      float ang = atan(transformed.z, transformed.x); float bil = 0.04 * sin(ang * ${gores.toFixed(1)}) ; transformed.xz *= 1.0 + bil * (1.0 - transformed.y / ${H_.toFixed(2)}) + 0.025 * sin(uT * 2.3 + transformed.y);`); };
  const mesh = sh(new THREE.Mesh(g, m)); const grp = new THREE.Group(); grp.add(mesh);
  // suspension lines: from the skirt to a confluence point L below
  const L = D * 1.0, lp = []; for (let i = 0; i < gores; i++) { const a = i / gores * TAU; lp.push(Math.cos(a) * R, 0, Math.sin(a) * R, 0, -L, 0); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3)); grp.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xd9d4c8, transparent: true, opacity: 0.8 })));
  grp.userData = { L, D, H: H_ }; return grp;
}
const CHU = { uT: { value: 0 } };
const MAINS = [0, 1, 2].map(() => canopy(25.4, 9.5, 24, true)), DROG = [0, 1].map(() => canopy(5.0, 2.4, 12, false));
const CHUTES = new THREE.Group(); scene.add(CHUTES); [...MAINS, ...DROG].forEach((c) => CHUTES.add(c));
const riserMat = new THREE.LineBasicMaterial({ color: 0xcfc8b8 }); const RIS = new THREE.LineSegments(new THREE.BufferGeometry(), riserMat); RIS.frustumCulled = false; CHUTES.add(RIS);
/** hang the canopies over the capsule's apex: mode "drogue" or "main"; k = 0..1 inflation */
function chutes(mode, k, t) {
  const apex = CL(0, CAP_H + 0.05, 0); const list = mode === "main" ? MAINS : DROG; const other = mode === "main" ? DROG : MAINS; other.forEach((c) => (c.visible = false));
  const rp = [];
  list.forEach((c, i) => { c.visible = k > 0; const n = list.length; const a = i / n * TAU + 0.6; const tilt = mode === "main" ? 0.42 : 0.22;
    const riser = mode === "main" ? 6 : 14; const dir = V(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a));
    const conf = apex.clone().addScaledVector(dir, riser * (0.3 + 0.7 * k)); const pos = conf.clone().addScaledVector(dir, c.userData.L);
    c.position.copy(pos); c.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    c.rotateY(t * 0.15 + i);
    const inf = mode === "main" ? 0.08 + 0.92 * ease(k) : 0.3 + 0.7 * ease(k); c.scale.set(inf, 1 / Math.max(0.5, inf) * (0.6 + 0.4 * inf), inf);
    rp.push(apex.x, apex.y, apex.z, conf.x, conf.y, conf.z); });
  RIS.geometry.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
  CHU.uT.value = t;
}
// flotation bags (three uprighting bags at the apex)
const BAGS = new THREE.Group(); CAP.add(BAGS);
const bagMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: 0.45, clearcoat: 0.5, sheen: 0.3 });
[0, 1, 2].forEach((i) => { const b = sh(new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), bagMat)); const a = i / 3 * TAU; b.position.set(Math.cos(a) * 0.38, CAP_H + 0.45, Math.sin(a) * 0.38); BAGS.add(b); });
BAGS.visible = false;
function bags(k) { BAGS.visible = k > 0; BAGS.children.forEach((b, i) => { const s = clamp(k * 1.2 - i * 0.1); b.scale.set(0.2 + 0.8 * s, 0.25 + 1.1 * s, 0.2 + 0.8 * s); }); }

// =====================================================================================================================
// THE MUSEUM: a dark gallery, a low plinth, glass barrier, spotlights (generic; the capsule is the real scan)
// =====================================================================================================================
const MUS = new THREE.Group(); scene.add(MUS);
{ const fl = sh(new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshPhysicalMaterial({ color: 0x1b1d21, roughness: 0.35, clearcoat: 0.4, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 10, 10) })), false, true);
  fl.rotation.x = -Math.PI / 2; fl.position.y = -0.62; MUS.add(fl);
  const pl = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.55, 0.6, 96), new THREE.MeshPhysicalMaterial({ color: 0x0d0e10, roughness: 0.3, clearcoat: 0.6 }))); pl.position.y = -0.31; MUS.add(pl);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.47, 0.012, 8, 128), glow(0x9fc4ff, 1.4)); ring.rotation.x = Math.PI / 2; ring.position.y = -0.01; MUS.add(ring);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 18, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.9, side: THREE.BackSide })); wall.position.y = 8; MUS.add(wall); }
const spots = [V(5, 7, 4), V(-5, 6.5, 3), V(0, 7.5, -5)].map((p, i) => { const s = new THREE.SpotLight(i === 2 ? 0x9fb8ff : 0xfff0dd, i === 2 ? 60 : 120, 30, 0.38, 0.6, 1.5); s.position.copy(p); s.target.position.set(0, 1.2, 0); s.castShadow = i === 0; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0002; MUS.add(s, s.target); return s; });
// dust in the spot beams
const NDU = 500, DUST = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 5, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.85, 0.8), transparent: true, opacity: 0.35 }), NDU); DUST.frustumCulled = false; MUS.add(DUST);
function dust(t) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < NDU; i++) { const s = 0.4 + hash(i) * 0.6; m4.compose(V((hash(i + 1) - 0.5) * 10 + Math.sin(t * 0.2 + i) * 0.2, hash(i + 2) * 6 + Math.sin(t * 0.13 + i * 3) * 0.2, (hash(i + 3) - 0.5) * 10), q, V(s, s, s)); DUST.setMatrixAt(i, m4); } DUST.instanceMatrix.needsUpdate = true; }

// =====================================================================================================================
// ORBI: a bench in the gallery, Columbia behind the glass; a phone uploads, the connection drops, the upload resumes and
// sends only the missing parts to storage; the laptop then gets the file
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); MUS.add(OR);
OR.position.set(1.2, 0.0, 7.2); OR.rotation.y = 0.12;
const bench = sh(new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.36, 1.9, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x5a4632, roughness: 0.55, clearcoat: 0.3, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) })));
bench.position.set(0.2, -0.2, 0.3); OR.add(bench);
for (const x of [-2.2, 2.6]) { const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.6), metal(0x2a2d31, 0.4))); leg.position.set(x, -0.62, 0.3); OR.add(leg); }
lap.g.position.set(-1.0, 0, -0.2); lap.g.rotation.y = 0.28; lap.g.scale.setScalar(0.8); ph.g.position.set(1.5, 0.06, 0.5); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.18);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); orbiL.position.set(1.5, 0.6, 0.6); OR.add(orbiL);
const hexTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#06120c"; g.fillRect(0, 0, 256, 256); g.font = "700 30px M"; g.fillStyle = "#3dff8c"; H.reseed(9);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) g.fillText(Math.floor(H.rnd() * 256).toString(16).padStart(2, "0"), 14 + x * 62, 36 + y * 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const NPART = 24, DROP_AT = 15;   // parts 0–14 arrive, then the link drops (62 %), 15–23 go after it resumes
const partMat = new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) });
const lostMat = new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(2.2, 0.4, 0.35), transparent: true });
const PARTS = Array.from({ length: NPART + 2 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 0.14, 2, 0.02), partMat); OR.add(m); return m; });
// storage: a rack across the bench, its screen a grid of stored parts
const RACK = new THREE.Group(); RACK.position.set(2.6, -0.62, -3.4); RACK.rotation.y = -0.35; OR.add(RACK);
{ const body = sh(new THREE.Mesh(new RoundedBoxGeometry(1.0, 2.2, 0.9, 3, 0.04), metal(0x22262b, 0.4))); body.position.y = 1.1; RACK.add(body);
  for (let i = 0; i < 11; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.02), metal(0x30353b, 0.35)); u.position.set(0, 0.3 + i * 0.17, 0.46); RACK.add(u);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), glow(i % 3 ? 0x3dff8c : 0x6fd0ff, 3)); led.position.set(0.38, 0.3 + i * 0.17, 0.475); RACK.add(led); } }
const rackTex = H.canvasTex(512, 320, () => {}); const rackScr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62), new THREE.MeshBasicMaterial({ map: rackTex, toneMapped: false })); rackScr.position.set(0, 2.62, 0.1); RACK.add(rackScr);
const rackDev = { tex: rackTex, ctx: rackTex.userData.g, last: "" };
function grid(g, x0, y0, w, cols, st, cell = 0) { const n = NPART, rows = Math.ceil(n / cols), s = w / cols;
  for (let i = 0; i < n; i++) { const cx = x0 + (i % cols) * s, cy = y0 + Math.floor(i / cols) * s; const ok = i < st.sent; const lost = st.lost && (i === DROP_AT || i === DROP_AT + 1) && !ok;
    g.fillStyle = ok ? green : lost ? "#ff5a4d" : "rgba(255,255,255,.14)"; rr(g, cx + 3, cy + 3, s - 6, s - 6, Math.max(3, s * 0.15)); g.fill(); } return y0 + rows * s; }
function drawRack(g, st) { g.fillStyle = "#06120c"; g.fillRect(0, 0, 512, 320); g.fillStyle = "#cfd6dd"; g.font = "800 30px M"; g.fillText("STORAGE", 24, 44);
  g.fillStyle = st.drop ? "#ff8a7a" : green; g.font = "700 24px M"; g.fillText(st.drop ? "WAITING…" : `${st.sent}/${NPART} PARTS`, 300, 44); grid(g, 24, 70, 464, 8, st); }
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (!st.on) return;
  g.fillStyle = "rgba(8,10,14,.93)"; rr(g, 50, 560, 680, 560, 34); g.fill();
  g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("apollo-11-photos.zip", 90, 630); g.fillStyle = "#9aa3ad"; g.font = "700 28px M"; g.fillText("2.4 GB · sent in parts", 90, 675);
  const p = st.sent / NPART; g.fillStyle = "rgba(255,255,255,.12)"; rr(g, 90, 705, 600, 26, 13); g.fill(); g.fillStyle = st.drop ? "#ff5a4d" : green; rr(g, 90, 705, 600 * p, 26, 13); g.fill();
  grid(g, 90, 755, 600, 8, st);
  g.font = "800 34px M"; g.fillStyle = st.drop ? "#ff7a6d" : green;
  g.fillText(st.drop ? `⚠ CONNECTION LOST · ${Math.round(p * 100)}%` : st.resumed ? (p >= 1 ? "✓ UPLOADED" : `RESUMING · ${Math.round(p * 100)}%`) : `UPLOADING · ${Math.round(p * 100)}%`, 90, 1030);
  g.font = "700 26px M"; g.fillStyle = "#cfd6dd"; if (st.resumed && p < 1) g.fillText("only the missing parts are sent", 90, 1075); if (st.drop) g.fillText("the parts already sent are kept", 90, 1075);
  // Wi-Fi glyph, struck through while the link is down
  g.strokeStyle = st.drop ? "#ff5a4d" : green; g.lineWidth = 7; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(650, 655, i * 18, -Math.PI * 0.78, -Math.PI * 0.22); g.stroke(); }
  if (st.drop) { g.beginPath(); g.moveTo(615, 600); g.lineTo(690, 665); g.stroke(); } }
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.got > 0) { g.fillStyle = "rgba(8,10,14,.92)"; rr(g, 60, 650, 900, 210, 26); g.fill(); g.fillStyle = "#fff"; g.font = "700 32px M"; g.fillText("apollo-11-photos.zip  ·  2.4 GB", 96, 705);
    g.fillStyle = green; rr(g, 96, 735, 820 * Math.min(1, st.got), 28, 10); g.fill(); g.font = "700 28px M"; g.fillText(st.got >= 1 ? "✓ ALL 24 PARTS · COMPLETE" : `RECEIVING ${Math.round(st.got * 100)}%`, 96, 815); } }

// =====================================================================================================================
// RADIO: rings leaving the capsule die in the plasma sheath (blackout)
// =====================================================================================================================
const RINGS = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 1.0), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.frustumCulled = false; FLOW.add(m); return m; });
function radio(t, k, blocked) { RINGS.forEach((m, i) => { const u = ((t * 0.7 + i / RINGS.length) % 1); const rmax = blocked ? 5.5 : 30; const r = 0.5 + u * rmax;
  m.visible = k > 0; m.position.set(0, 1.4, 0); m.rotation.x = Math.PI / 2; m.scale.setScalar(r);
  m.material.opacity = k * (blocked ? (1 - u) * (u < 0.75 ? 1 : (1 - u) * 4) : 1 - u); m.material.color.setRGB(blocked && u > 0.55 ? 2.2 : 0.4, blocked && u > 0.55 ? 0.5 : 2.2, blocked && u > 0.55 ? 0.3 : 1.0); }); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  scan: ["Laser scan", "#9fd4ff", "every rivet and scorch mark"], seats: ["Three seats", "#ffd166", "for three astronauts"], win: ["Windows", "#9fd4ff", "five in all"],
  plasma: ["Plasma", "#ff8a3d", "squeezed, glowing air"], shock: ["Shock wave", "#6fd0ff", "pushed out in front"], layer: ["Hot layer", "#ff8a3d", "most heat stays here"], hs: ["Heat shield", "#ffd166", "blunt on purpose"],
  honey: ["Fiberglass honeycomb", "#ffd166", "thousands of cells"], avc: ["Avcoat", "#cfd6dd", "resin gunned into each cell"], steel: ["Steel structure", "#9fb8c9", "the capsule's shell"],
  char: ["Char layer", "#ff6a3d", "burns, then melts away"], away: ["Heat carried away", "#ff8a3d", "with every flake"],
  ant: ["Radio", "#3dff8c", "can't get through"], drg: ["2 drogue chutes", "#ffd166", "slow and steady it"], mn: ["3 main chutes", "#ff8a3d", "25 m across each"],
  bag: ["Flotation bags", "#9fd4ff", "inflated by the crew"], srv: ["Storage", "#8fd0ff", "keeps the parts already sent"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("WIDE", "3.9 m")}${card("CREW", "3")}${card("FLOWN", "JUL 1969")}</div>`, { left: "0px", top: "1440px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 190px/0.85 D;font-stretch:112%;color:#ff9a5c;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 44px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("thick", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">UP TO 5 CM THICK · MAGNIFIED</div>`, { left: "250px", top: "240px" });
hudEl("nosig", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:22px 36px;border-radius:26px;background:rgba(30,6,6,.82);border:2px solid #ff5a4d">
  <div style="font:800 34px M;letter-spacing:.18em;color:#ff7a6d">● NO SIGNAL</div><div id="nsT" style="font:900 120px/1 D;font-stretch:112%;color:#fff;margin-top:8px">0:00</div><div style="font:700 26px M;letter-spacing:.12em;color:#cfd6dd;margin-top:6px">RADIO BLACKOUT</div></div></div>`, { left: "0px", top: "230px" });
hudEl("silver", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("LEFT", "SILVER", "#e6ecf2")}<div style="font:900 70px D;color:#fff;align-self:center">→</div>${card("CAME HOME", "SCORCHED", "#ff9a5c")}</div>`, { left: "0px", top: "1440px" });
hudEl("date", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("SPLASHDOWN", "24 JUL 1969")}${card("SPEED", "35 km/h", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("flip", `<div style="width:1080px;text-align:center"><div id="flT" style="display:inline-block;padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.25);font:900 54px D;font-stretch:112%;color:#fff">UPSIDE DOWN</div></div>`, { left: "0px", top: "260px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["RESUMES", "ONLY MISSING PARTS", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("hot", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.12em;color:#cfd6dd">HEAT THAT WOULD MELT MOST METALS</div>`, { left: "215px", top: "240px" });
const setBig = (n, l, col = "#ff9a5c") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { SPACE.visible = s === "space"; FLOW.visible = s === "space"; OCEAN.visible = s === "ocean"; CHUTES.visible = s === "ocean"; MUS.visible = s === "museum"; HC.visible = s === "shield";
  scene.fog = s === "ocean" ? OFOG : null; scene.background = s === "shield" ? new THREE.Color(0x07080a) : s === "museum" ? new THREE.Color(0x050607) : null;
  CAP.visible = s !== "shield"; }
function plasma(i, wake = i, spark = i) { PU.uI.value = i; PU.uWake.value = wake; SPARK.visible = spark > 0.01; FLOW.userData.shock.visible = FLOW.userData.layer.visible = i > 0.001; FLOW.userData.wake.visible = wake > 0.001; }
function lightSpace(heat) { H.key.color.set(0xfff4e6); H.key.intensity = 3.4; H.key.position.copy(CAP.position).addScaledVector(SUN_S, 30); H.key.target.position.copy(CAP.position);
  const s = H.key.shadow.camera; Object.assign(s, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 80 }); s.updateProjectionMatrix();
  H.hemi.color.set(0x4a6a9a); H.hemi.groundColor.set(0x6a8ab0); H.hemi.intensity = 0.35; H.envK.value = 0.35 + 0.6 * CU.uSilver.value; H.rimA.intensity = 0.25; H.rimB.intensity = 0;
  capLight.intensity = 0; H.key.intensity *= 1 - heat * 0.5; }
function lightMuseum() { H.key.intensity = 0.0; H.hemi.color.set(0x6a7890); H.hemi.groundColor.set(0x101012); H.hemi.intensity = 0.25; H.envK.value = 0.5; H.rimA.intensity = 0.35; H.rimB.intensity = 0.25; }
function lightOcean() { H.key.color.set(0xffcf9e); H.key.intensity = 3.0; H.key.position.copy(CAP.position).addScaledVector(SKYS, 40); H.key.target.position.copy(CAP.position);
  const s = H.key.shadow.camera; Object.assign(s, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 120 }); s.updateProjectionMatrix();
  H.hemi.color.set(0xa9c2e6); H.hemi.groundColor.set(0x2a3a44); H.hemi.intensity = 0.8; H.envK.value = 0.45; H.rimA.intensity = 0.3; H.rimB.intensity = 0.2; }
const shake = (t, a) => { H.cam.position.x += Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6; H.cam.position.y += Math.sin(t * 53 + 1) * a; };
const TRAVEL = V(0, -0.12, -1).normalize();
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

H.frame("Resumes where it stopped. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); capReset(); BAGS.visible = false; SL.visible = false; RINGS.forEach((r) => (r.visible = false)); PU.uWire.value = 0; PU.uT.value = t; CU.uT.value = t; EU.uT.value = t; EU.uGlow.value = 0;
  H.zoom = 1; H.bloom.strength = 0.35; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 20000); OR.visible = false; SPRAY.visible = false; foam.visible = false; EARTH.visible = atmo.visible = true;
  H.key.castShadow = true;

  if (t < at("real")) { // HOOK: silver Columbia falling towards the Pacific; then the fireball
    sets("space"); const c = fr("hook", 0.5);
    if (t < c) { flowSet(V(0, 0, 0), TRAVEL); CU.uSilver.value = 1; plasma(0); lightSpace(0);
      move(t, 0, c, [FW(-8, -15, -7), FW(0, 0.8, 0.6), 30], [FW(-7, -13.5, -6), FW(0, 0.9, 0.5), 30], 0.05); earthAt(250, 12, -160, 0.3);
      title(t, fr("hook", 0.05), c, "July 1969", "Coming home from the Moon", 150); }
    else { flowSet(V(0, 0, 0), TRAVEL); CU.uSilver.value = 0; CU.uHeat.value = 1; plasma(1, 1, 1); sparks(t, 1); lightSpace(1); winGlow.opacity = 0.5; H.bloom.strength = 0.7;
      move(t, c, at("real"), [FW(-13, -30, -11), FW(0, 9, 0), 40], [FW(-11, -26, -9.5), FW(0, 9, 0), 40], 0.1); shake(t, 0.03); earthAt(70, 12, -165, 0.3); EU.uGlow.value = 1; EU.uGlowP.value.copy(CAP.position); }
  } else if (t < at("speed")) { // THE REAL ONE: the Smithsonian scan in a dark gallery; then cut open: three seats
    sets("museum"); lightMuseum(); dust(t); H.key.castShadow = false;
    if (t < at("small")) { const a = -0.6 + (t - at("real")) * 0.12; move(t, at("real"), at("small"), [V(Math.sin(a) * 12.5, 2.6, Math.cos(a) * 12.5), V(0, 1.2, 0), 34], [V(Math.sin(a + 0.1) * 11.5, 2.3, Math.cos(a + 0.1) * 11.5), V(0, 1.2, 0), 34], 0);
      title(t, fr("real", 0.05), fr("real", 0.55), "The real Apollo 11 capsule", "Columbia", 150); callout("scan", t, fr("real", 0.5), at("small"), CL(-1.2, 1.6, 1.0), 300, 1150); }
    else { const op = smooth(prog(t, fr("small", 0.35), fr("small", 0.6))); INT.visible = op > 0; CU.uSec.value = 1; CUT.normal.set(-1, 0, 0); CUT.constant = lerp(2.4, 0.05, op);
      const k = fr("small", 0.4);
      if (t < k) move(t, at("small"), k, [V(7.5, 1.6, 4.5), V(0, 1.1, 0), 34], [V(7.0, 1.7, 3.8), V(0, 1.1, 0), 34], 0);
      else move(t, k, at("speed"), [V(5.8, 2.2, 1.8), V(0, 1.15, 0), 40], [V(4.4, 2.4, 1.1), V(0, 1.2, 0), 44], 0);
      hudShow("stats", win(t, fr("small", 0.05), fr("small", 0.45))); callout("seats", t, fr("small", 0.62), at("speed"), CL(0, 1.25, 0.25), 300, 1150); }
  } else if (t < at("blunt")) { // RE-ENTRY: 11 km/s; the air can't get out of the way → plasma
    sets("space"); flowSet(V(0, 0, 0), TRAVEL); lightSpace(0.5); earthAt(110, 11, -166, 0.3);
    if (t < at("air")) { const k = smooth(prog(t, at("speed"), end("speed"))); CU.uHeat.value = k * 0.7; plasma(k * 0.7, k * 0.6, k * 0.5); sparks(t, k * 0.5); winGlow.opacity = k * 0.3; EU.uGlow.value = k; EU.uGlowP.value.copy(CAP.position);
      move(t, at("speed"), at("air"), [FW(-10, -17, -5), FW(0, 1.5, 0), 36], [FW(-9, -15, -4.5), FW(0, 1.3, 0), 36], 0.05); shake(t, 0.01 * k);
      setBig("11 km/s", "≈ 40,000 KM/H"); hudShow("big", win(t, fr("speed", 0.15), at("air"))); }
    else { CU.uHeat.value = 1; plasma(1, 1, 1); sparks(t, 1); winGlow.opacity = 0.5; H.bloom.strength = 0.65; EU.uGlow.value = 1; EU.uGlowP.value.copy(CAP.position);
      move(t, at("air"), at("blunt"), [FW(-5.5, -10, -3.5), FW(0, 0.2, 0), 38], [FW(-4.8, -8.8, -3.1), FW(0, 0.2, 0), 38], 0.05); shake(t, 0.02);
      callout("plasma", t, fr("air", 0.45), at("blunt"), FW(-0.4, -0.45, 0.6), 760, 1150); }
  } else if (t < at("shield")) { // BLUNT: the shock stands off the shield; the hot layer keeps most heat in the air
    sets("space"); flowSet(V(0, 0, 0), TRAVEL); lightSpace(0.6); earthAt(95, 11, -166, 0.3); EARTH.visible = atmo.visible = false;
    CU.uHeat.value = 0.7; plasma(0.55, 0.35, 0.2); sparks(t, 0.2); SL.visible = true; streamlines(t, smooth(prog(t, at("blunt"), fr("blunt", 0.2)))); PU.uWire.value = smooth(prog(t, fr("blunt", 0.15), fr("blunt", 0.4)));
    move(t, at("blunt"), at("shield"), [FW(0, 1.8, -17), FW(0, 1.8, 0), 40], [FW(0, 1.6, -15.5), FW(0, 1.6, 0), 40], 0.03); H.cam.up.copy(V(0, 1, 0).applyQuaternion(FLOW.quaternion)); H.cam.lookAt(FW(0, 1.7, 0));
    callout("hs", t, fr("blunt", 0.05), fr("blunt", 0.4), FW(0.9, -0.05, 0), 300, 1030); callout("shock", t, fr("blunt", 0.3), at("shield"), FW(2.4, SHOCK_Y + SHOCK_K * 5.76, 0), 760, 900); callout("layer", t, fr("blunt", 0.6), at("shield"), FW(-0.8, -0.38, 0), 300, 1150);
  } else if (t < at("silver")) { // THE HEAT SHIELD, magnified: honeycomb + Avcoat; then it chars and melts away
    sets("shield"); H.key.intensity = 1.2; H.key.position.set(4, 6, 1); H.key.target.position.set(0, 0, 0); H.hemi.intensity = 0.5; H.hemi.color.set(0xd8d0c8); H.hemi.groundColor.set(0x302820); H.envK.value = 0.15; H.rimA.intensity = 0; H.rimB.intensity = 0.3; H.key.castShadow = false;
    if (t < at("burn")) { shieldCells(0, 0, true); HU.uHot.value = 0; hcLight.intensity = 0; flakes(t, 0);
      move(t, at("shield"), at("burn"), [V(1.05, 0.14, 0.3), V(-0.2, -0.25, 0.0), 40], [V(0.95, 0.1, 0.26), V(-0.2, -0.25, 0.0), 40], 0.01);
      callout("honey", t, fr("shield", 0.2), at("burn"), V(0.05, 0.0, 0.25), 300, 1150); callout("avc", t, fr("shield", 0.5), at("burn"), V(0.0, -0.2, 0.0), 760, 1240); callout("steel", t, fr("shield", 0.65), at("burn"), V(0.05, -0.53, 0.3), 300, 1330); hudShow("thick", win(t, fr("shield", 0.3), at("burn"))); }
    else { const k = prog(t, at("burn"), at("silver")); shieldCells(0.15 + k * 0.85, k * 0.12, true); HU.uHot.value = 1; HU.uT.value = t; hcLight.intensity = 2.5; flakes(t, 1); H.bloom.strength = 0.6;
      move(t, at("burn"), at("silver"), [V(1.0, 0.16, 0.28), V(-0.2, -0.22, 0.0), 40], [V(0.9, 0.12, 0.24), V(-0.2, -0.22, 0.0), 40], 0.02);
      callout("char", t, fr("burn", 0.25), at("silver"), V(0.05, -0.08, 0.1), 300, 1150); callout("away", t, fr("burn", 0.55), at("silver"), V(0.3, 0.3, 0.0), 760, 1000); hudShow("hot", win(t, fr("burn", 0.1), fr("burn", 0.5))); }
  } else if (t < at("blackout")) { // SILVER → SCORCHED: the heat sweeps over the Mylar
    sets("space"); EARTH.visible = atmo.visible = true; flowSet(V(0, 0, 0), TRAVEL); lightSpace(0); earthAt(300, 12, -160, 0.3);
    const k = smooth(prog(t, fr("silver", 0.3), fr("silver", 0.75))); CU.uSilver.value = 1 - k; const pk = Math.sin(Math.PI * clamp(k * 1.05)); CU.uHeat.value = pk; plasma(pk * 0.8, pk * 0.5, pk * 0.5); sparks(t, pk * 0.5);
    move(t, at("silver"), at("blackout"), [FW(-9, -13, -6), FW(0, 1.0, 0), 32], [FW(-8.2, -12, -5.4), FW(0, 1.1, 0), 32], 0.02);
    hudShow("silver", win(t, fr("silver", 0.05), at("blackout")));
  } else if (t < at("g")) { // BLACKOUT: radio rings die in the sheath; the clock runs ~3 minutes
    sets("space"); flowSet(V(0, 0, 0), TRAVEL); lightSpace(0.8); earthAt(85, 12, -167, 0.3); CU.uHeat.value = 1; plasma(1, 1, 1); sparks(t, 1); winGlow.opacity = 0.5; H.bloom.strength = 0.6; EU.uGlow.value = 1; EU.uGlowP.value.copy(CAP.position);
    radio(t, 1, true);
    const c = fr("blackout", 0.55);
    if (t < c) move(t, at("blackout"), c, [FW(-12, -22, -6), FW(0, 3, 0), 38], [FW(-11, -20, -5.5), FW(0, 3, 0), 38], 0.05);
    else move(t, c, at("g"), [FW(-30, -45, -22), FW(0, 12, 0), 40], [FW(-34, -50, -25), FW(0, 14, 0), 40], 0.05);
    callout("ant", t, fr("blackout", 0.15), fr("blackout", 0.5), FW(-3.6, 1.4, 0), 300, 1150);
    H.$("nsT").textContent = fmt(lerp(0, 180, clamp(prog(t, fr("blackout", 0.1), fr("blackout", 0.95))))); hudShow("nosig", win(t, fr("blackout", 0.05), at("g")));
  } else if (t < at("chutes")) { // 6.5 g: the cabin cut open in flight, lit through the windows by the fireball
    sets("space"); flowSet(V(0, 0, 0), TRAVEL); lightSpace(0.9); earthAt(60, 12, -168, 0.3); CU.uHeat.value = 1; plasma(1, 1, 1); sparks(t, 1); H.bloom.strength = 0.55;
    INT.visible = true; CU.uSec.value = 1; const nrm = V(1, 0, 0).applyQuaternion(CAP.quaternion).negate(); CUT.setFromNormalAndCoplanarPoint(nrm, CAP.position.clone()); winGlow.opacity = 0.6; capLight.intensity = 2.5; PU.uI.value = 0.5; PU.uWake.value = 0.3; sparks(t, 0.3);
    move(t, at("g"), at("chutes"), [CL(6.2, 1.6, 1.4), CL(0, 1.2, 0), 44], [CL(5.2, 1.5, 1.1), CL(0, 1.25, 0), 44], 0.02); H.cam.up.copy(V(0, 1, 0).applyQuaternion(CAP.quaternion)); H.cam.lookAt(CL(0, 1.22, 0)); shake(t, 0.012 + 0.02 * smooth(prog(t, at("g"), fr("g", 0.6))));
    setBig(`${lerp(1, 6.5, smooth(prog(t, fr("g", 0.1), fr("g", 0.75)))).toFixed(1)} g`, "PRESSED INTO THE SEATS", "#ff7a5c"); hudShow("big", win(t, fr("g", 0.05), at("chutes")));
  } else if (t < at("splash")) { // PARACHUTES over the Pacific at dawn: 2 drogues, then 3 mains
    sets("ocean"); const dro = t < fr("chutes", 0.42); const alt = dro ? 2600 : 900;
    CAP.position.set(0, alt - (t - at("chutes")) * (dro ? 50 : 10), 0); CAP.rotation.set(Math.sin(t * 0.9) * 0.06, t * 0.1, Math.sin(t * 0.7) * 0.05); CAP.updateMatrixWorld(true); lightOcean();
    chutes(dro ? "drogue" : "main", dro ? smooth(prog(t, at("chutes"), fr("chutes", 0.15))) : smooth(prog(t, fr("chutes", 0.43), fr("chutes", 0.62))), t); sea.material.uniforms.time.value = t * 0.5; sea.material.uniforms.uWT.value = t;
    camRange(0.1, 20000);
    if (dro) move(t, at("chutes"), fr("chutes", 0.42), [CL(9, -7, 10), CL(0, 6, 0), 44], [CL(8, -6, 9), CL(0, 7, 0), 44], 0.1);
    else move(t, fr("chutes", 0.42), at("splash"), [CL(14, -22, 26), CL(0, 16, 0), 50], [CL(13, -18, 24), CL(0, 18, 0), 50], 0.1);
    callout("drg", t, fr("chutes", 0.12), fr("chutes", 0.42), CL(0, 2.74 + 14 + 5, 0), 760, 700); callout("mn", t, fr("chutes", 0.6), at("splash"), MAINS[0].position, 760, 600);
  } else if (t < at("orbi")) { // SPLASHDOWN at ~35 km/h, upside down, righted by three bags
    sets("ocean"); lightOcean(); sea.material.uniforms.time.value = t * 0.5; sea.material.uniforms.uWT.value = t; const sx = 0, sz = 0; const wy = seaY(sx, sz, t);
    const hit = fr("splash", 0.55); camRange(0.1, 20000);
    if (t < at("flip")) {
      const y = t < hit ? wy - 0.9 + (hit - t) * 9.7 : wy - 0.9 + Math.sin((t - hit) * 6) * Math.exp(-(t - hit) * 2.5) * 0.4;
      CAP.position.set(sx, y, sz); CAP.rotation.set(t < hit ? Math.sin(t) * 0.05 : 0.08 + (t - hit) * 0.1, 0.6, 0); CAP.updateMatrixWorld(true);
      chutes("main", t < hit + 0.3 ? 1 : clamp(1 - (t - hit - 0.3) * 0.6), t); CHUTES.visible = t < hit + 2; SPRAY.visible = t > hit; spray(t, hit, V(sx, wy, sz)); foam.visible = t > hit; foam.position.set(sx, wy + 0.05, sz); foam.material.uniforms.uK.value = clamp((t - hit) * 2); foam.material.uniforms.uT.value = t;
      if (t < hit) move(t, at("splash"), hit, [V(12, 3, 18), V(0, 8, 0), 44], [V(11, 2.5, 16), V(0, 3, 0), 44], 0.1);
      else move(t, hit, at("flip"), [V(9, 1.6, 13), V(0, 0.6, 0), 42], [V(8.4, 1.6, 12.2), V(0, 0.6, 0), 42], 0.15);
      hudShow("date", win(t, fr("splash", 0.05), at("flip"))); }
    else { CHUTES.visible = false; const up = smooth(prog(t, fr("flip", 0.4), fr("flip", 0.95))); bags(smooth(prog(t, fr("flip", 0.15), fr("flip", 0.5))));
      // Stable 2 (apex down) → Stable 1 (apex up), floating with ~1 m of the shield under water
      const ang = lerp(Math.PI * 0.94, 0.06, up); CAP.rotation.set(ang + Math.sin(t * 1.1) * 0.03, 0.6, Math.sin(t * 0.8) * 0.03); CAP.position.set(sx, wy + lerp(-0.9, 1.05, (1 - Math.cos(ang)) / 2) - Math.sin(ang) * 0.5, sz); CAP.updateMatrixWorld(true);
      foam.visible = true; foam.position.set(sx, wy + 0.05, sz); foam.material.uniforms.uK.value = 0.5; foam.material.uniforms.uT.value = t;
      move(t, at("flip"), at("orbi"), [V(7.5, 2.4, 10.5), V(0, 0.5, 0), 38], [V(7.0, 2.3, 9.8), V(0, 0.7, 0), 38], 0.15);
      H.$("flT").textContent = up > 0.6 ? "UPRIGHT" : "UPSIDE DOWN"; H.$("flT").style.color = up > 0.6 ? "#3dff8c" : "#ff9a5c"; hudShow("flip", win(t, fr("flip", 0.05), at("orbi")));
      callout("bag", t, fr("flip", 0.8), at("orbi"), CL(0, CAP_H + 0.6, 0), 760, 1150); }
  } else { // ORBI: in the gallery; upload → drop at 62 % → resumes with only the missing parts → the laptop gets it
    sets("museum"); lightMuseum(); dust(t); OR.visible = true; H.key.castShadow = false; orbiL.intensity = 0.5; OR.updateMatrixWorld(true); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const tDrop = fr("orbi2", 0.28), tRes = fr("orbi2", 0.55), tEnd = fr("orbi3", 0.2);
    const sentA = Math.floor(lerp(4, DROP_AT, clamp(prog(t, at("orbi"), tDrop)))); const sentB = Math.floor(lerp(DROP_AT, NPART, clamp(prog(t, tRes, tEnd))));
    const drop = t >= tDrop && t < tRes, resumed = t >= tRes; const sent = t < tDrop ? sentA : drop ? DROP_AT : sentB;
    const st = { on: 1, sent, drop: drop ? 1 : 0, resumed: resumed ? 1 : 0, lost: drop ? 1 : 0 };
    screen(ph, st, drawPhone); screen(rackDev, st, drawRack); screen(lap, { got: Math.round(clamp(prog(t, fr("orbi3", 0.15), fr("orbi3", 0.9))) * 40) / 40 }, drawLap);
    const a0 = ph.g.position.clone().add(V(0, 0.35, 0)), s0 = RACK.position.clone().add(V(0, 2.4, 0.4));
    PARTS.forEach((m, i) => { m.visible = false; m.material = partMat;
      if (i < NPART) { const st0 = i < DROP_AT ? lerp(at("orbi"), tDrop, (i - 4) / (DROP_AT - 4)) - 0.6 : lerp(tRes, tEnd, (i - DROP_AT) / (NPART - DROP_AT)) - 0.6; const k = clamp((t - st0) / 0.6);
        if (i >= 4 && k > 0 && k < 1) { m.visible = true; m.position.copy(a0).lerp(s0, ease(k)).add(V(0, Math.sin(k * Math.PI) * 0.9, 0)); m.rotation.set(t * 2 + i, t * 1.5, 0); } }
      else if (drop) { const j = i - NPART; const k = clamp((t - tDrop) / 0.9); m.visible = k < 1; m.material = lostMat; lostMat.opacity = 1 - k; m.position.copy(a0).lerp(s0, 0.4 + j * 0.15).add(V(0, 0.7 - k * k * 1.2, 0)); m.rotation.set(t * 4 + i, t * 3, 0); } });
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.3, 2.3, 7.8), OW(0.2, 1.0, -2.5), 44], [OW(0.4, 2.1, 7.0), OW(0.2, 1.0, -2.5), 44], 0.2);
    else if (t < at("orbi3")) { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, at("orbi2"), at("orbi3"), [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 36], [OW(...pc.clone().addScaledVector(pn, 2.8).toArray()), OW(...pc.toArray()), 36], 0.02);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); }
    else { move(t, at("orbi3"), at("end"), [OW(0.3, 2.2, 7.4), OW(0.2, 1.0, -2.0), 44], [OW(0.4, 2.0, 6.8), OW(0.2, 1.0, -2.0), 44], 0.2); callout("srv", t, fr("orbi3", 0.05), fr("orbi3", 0.7), RACK.localToWorld(V(0, 2.6, 0.2)), 760, 900); hudShow("chips", win(t, fr("orbi3", 0.3), at("end"))); }
  }
  if (window.DBG && window.DBG[2]) { const off = window.DBG[2].split(","); const M = { earth: EARTH, atmo, shock: FLOW.userData.shock, layer: FLOW.userData.layer, wake: FLOW.userData.wake, spark: SPARK, cap: CAP, win: null };
    for (const k of off) { if (M[k]) M[k].visible = false; if (k === "bloom") H.bloom.strength = 0; if (k === "win") winGlow.opacity = 0; if (k === "heat") CU.uHeat.value = 0; } }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
