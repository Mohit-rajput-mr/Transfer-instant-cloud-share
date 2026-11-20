// Do you know why a giant golden ball hangs inside Taipei 101? HD film on kit/hd.js.
// Real-scale world in metres: the tower (508 m, 8 flared modules of 8 floors, notched corners, ruyi coins, spire) stands at the
// origin in a procedural Xinyi city with mountains + a real Poly Haven sky. The tuned mass damper sits at its true height
// inside the tower: a 5.5 m sphere of 41 steel plates on 8 cables, 8 hydraulic dampers below, a viewing deck around it.
// Sway is exaggerated on screen (labelled). Earth (NASA textures) for the typhoon/quake map.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { loadAnatomy, standardLayers } from "./kit/anatomy.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { makePhone, makeLaptop, makeLock, makeEmbers, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, S2 = (el, o) => Object.assign(el.style, o);
const gl = new GLTFLoader(), gltf = (u) => new Promise((ok, no) => gl.load(u, ok, undefined, no));
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const TAU = Math.PI * 2;
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }

// ---------- light, sky, fog ----------
const SUN = V(-0.42, 0.62, 0.66).normalize();
H.key.color.set(0xfff1dc); H.hemi.color.set(0xcfe2ff); H.hemi.groundColor.set(0x3a3a34);
const FOG = { c: new THREE.Color(0x9fb2c4), d: 0.000085 };
scene.fog = new THREE.FogExp2(FOG.c.getHex(), FOG.d);
const skyTex = tex("kit/ph/kloofendal_48d_partly_cloudy_puresky/sky_4k.jpg", true); skyTex.wrapS = THREE.RepeatWrapping; skyTex.repeat.set(1, 1);
const skyU = { uSky: { value: skyTex }, uStorm: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 }, uSun: { value: SUN } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform float uStorm, uTime, uFlash; uniform vec3 uSun; varying vec3 vD;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
    void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
      vec3 c = texture2D(uSky, uv).rgb; if (d.y < 0.0) c = vec3(0.62, 0.68, 0.72);
      c += vec3(1.0, 0.85, 0.6) * pow(max(dot(d, uSun), 0.0), 900.0) * 6.0;
      // storm: low, fast, dark cloud deck
      vec2 q = d.xz / max(d.y + 0.08, 0.04) * 0.35 + vec2(uTime * 0.09, uTime * 0.03);
      float cl = fbm(q * 1.7) * 0.7 + fbm(q * 5.0 - uTime * 0.2) * 0.35;
      vec3 st = mix(vec3(0.025, 0.03, 0.038), vec3(0.11, 0.12, 0.135), smoothstep(0.35, 0.95, cl)) * (0.6 + 0.4 * smoothstep(-0.1, 0.4, d.y));
      st += vec3(0.7, 0.75, 0.95) * uFlash * smoothstep(0.3, 0.9, cl);
      gl_FragColor = vec4(mix(c, st, uStorm), 1.0); }` }));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// ---------- Taipei 101 ----------
const FY = (n) => n * 4.29;                       // floor n elevation (89F deck ≈ 382 m)
const TOP = 508, BY = 377, PIV = BY + 12.2;      // ball centre (between 87F and 92F), pendulum pivot (≈12 m cables → ≈7 s period)
const profile = (d) => { const q = [[1, -1 + 2 * d], [1, 1 - 2 * d], [1 - d, 1 - 2 * d], [1 - d, 1 - d], [1 - 2 * d, 1 - d]], p = [];
  for (let k = 0; k < 4; k++) { const c = Math.cos(k * Math.PI / 2), s = Math.sin(k * Math.PI / 2); for (const [x, z] of q) p.push([x * c - z * s, x * s + z * c]); } return p; };
const PR = profile(0.085);
const TG = { pos: [], nor: [], uv: [], seg: [] };
function quad(a, b, c, d, n, ua, ub, seg) { // a b (bottom) c d (top)
  for (const [p, u, vv] of [[a, ua, 0], [b, ub, 0], [d, ub, 1], [a, ua, 0], [d, ub, 1], [c, ua, 1]]) { TG.pos.push(...p); TG.nor.push(n.x, n.y, n.z); TG.uv.push(u, vv); TG.seg.push(seg[0], seg[1]); } }
function loft(y0, y1, s0, s1) { // half widths s0 (bottom) → s1 (top)
  let u0 = 0;
  for (let i = 0; i < PR.length; i++) { const p = PR[i], q = PR[(i + 1) % PR.length];
    const a = [p[0] * s0, y0, p[1] * s0], b = [q[0] * s0, y0, q[1] * s0], c = [p[0] * s1, y1, p[1] * s1], d = [q[0] * s1, y1, q[1] * s1];
    const n = V(b[0] - a[0], 0, b[2] - a[2]).cross(V(c[0] - a[0], c[1] - a[1], c[2] - a[2])).normalize(); const mid = V((a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2);
    let A = a, B = b, C = c, D = d; if (n.x * mid.x + n.z * mid.z < 0) { n.negate(); [A, B, C, D] = [b, a, d, c]; }
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) * (s0 + s1) / 2; quad(A, B, C, D, n, u0, u0 + len, [y0, y1]); u0 += len; } }
function cap(y, sa, sb, up = 1) { const n = V(0, up, 0);
  for (let i = 0; i < PR.length; i++) { const p = PR[i], q = PR[(i + 1) % PR.length];
    const a = [p[0] * sa, y, p[1] * sa], b = [q[0] * sa, y, q[1] * sa], c = [p[0] * sb, y, p[1] * sb], d = [q[0] * sb, y, q[1] * sb];
    if (up > 0) quad(b, a, d, c, n, 0, 1, [-1, -1]); else quad(a, b, c, d, n, 0, 1, [-1, -1]); } }
// base trunk (1F–25F) tapering in, the coin band, 8 flared modules (27F–90F), stepped crown (91F–101F), roof + spire
loft(0, FY(25), 33, 27.5); cap(FY(25), 27.5, 25.5);
loft(FY(25), FY(26.4), 25.5, 25.5); cap(FY(26.4), 25.5, 22.3);
for (let i = 0; i < 8; i++) { const y0 = FY(26.4 + 8 * i), y1 = FY(34.4 + 8 * i); loft(y0, y1, 22.3, 26.6); cap(y1, 26.6, i < 7 ? 22.3 : 20.5); }
const crown = [[FY(90.4), FY(92), 20.5, 19.8], [FY(92), FY(95), 17.2, 16.6], [FY(95), FY(98), 14.2, 13.6], [FY(98), FY(101.5), 11.2, 10.6], [FY(101.5), 449, 7.6, 7.2]];
crown.forEach(([y0, y1, s0, s1], i) => { loft(y0, y1, s0, s1); cap(y1, s1, i < crown.length - 1 ? crown[i + 1][2] : 0.1); });
const towerGeo = new THREE.BufferGeometry();
towerGeo.setAttribute("position", new THREE.Float32BufferAttribute(TG.pos, 3)); towerGeo.setAttribute("normal", new THREE.Float32BufferAttribute(TG.nor, 3));
towerGeo.setAttribute("uv", new THREE.Float32BufferAttribute(TG.uv, 2)); towerGeo.setAttribute("aSeg", new THREE.Float32BufferAttribute(TG.seg, 2));
const SWAY = (y) => Math.pow(Math.max(0, y) / TOP, 2);  // bending shape (top = 1)
const TU = { uSky: { value: skyTex }, uSun: { value: SUN }, uSway: { value: new THREE.Vector2() }, uCut: { value: 0 }, uCutY: { value: new THREE.Vector2(FY(85.5), FY(93.5)) }, uCutW: { value: 15 },
  uFogC: { value: new THREE.Color() }, uFogD: { value: FOG.d }, uLight: { value: 1 }, uFlash: { value: 0 }, uGhost: { value: 0 }, uStorm: { value: 0 } };
const TOWER_VS = `attribute vec2 aSeg; uniform vec2 uSway; varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec2 vSeg; varying float vY;
  void main(){ vec3 p = position; float k = pow(max(p.y, 0.0) / ${TOP}.0, 2.0); p.xz += uSway * k; vY = position.y; vUv = uv; vSeg = aSeg;
    vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const towerMat = new THREE.ShaderMaterial({ uniforms: TU, side: THREE.DoubleSide, vertexShader: TOWER_VS,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun, uFogC; uniform vec2 uSway, uCutY; uniform float uCut, uCutW, uFogD, uLight, uFlash, uStorm;
    varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec2 vSeg; varying float vY;
    float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 skyAt(vec3 r){ if (r.y < 0.0) return mix(vec3(0.16, 0.18, 0.19), vec3(0.42, 0.47, 0.5), smoothstep(-0.25, 0.0, r.y));
      return texture2D(uSky, vec2(atan(r.z, r.x) / 6.2831853 + 0.5, asin(clamp(r.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb; }
    void main(){
      vec3 N = normalize(vN); float sw = pow(max(vY, 0.0) / 508.0, 2.0);
      if (uCut > 0.0 && vY > uCutY.x && vY < uCutY.y && N.z > 0.25 && abs(vW.x - uSway.x * sw) < uCutW * uCut) discard;
      vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
      vec3 col;
      if (!gl_FrontFacing) { // inside the cut: dark floors, ceiling lights
        float fl = fract(vY / 4.29); col = vec3(0.035, 0.04, 0.045) + vec3(0.5, 0.45, 0.35) * smoothstep(0.93, 0.97, fl) * 0.25 + vec3(0.02) * step(fl, 0.08);
      } else if (abs(N.y) > 0.6) { // ledges / roofs
        col = (N.y > 0.0 ? vec3(0.34, 0.37, 0.36) : vec3(0.06, 0.07, 0.07)) * (0.35 + 0.75 * max(dot(N, uSun), 0.0)) * uLight;
      } else {
        float fh = 4.29, fy = fract(vY / fh), fx = fract(vUv.x / 1.55), fi = floor(vY / fh), ci = floor(vUv.x / 1.55);
        float frameM = max(step(fy, 0.035) * 0.9, max(step(0.98, fx), step(fx, 0.02)) * 0.55) * smoothstep(900.0, 250.0, dist);
        float spand = step(fy, 0.13);                                   // spandrel band at each slab
        float band = vSeg.y > 0.0 ? smoothstep(vSeg.y - 2.4, vSeg.y - 2.2, vY) : 0.0; // module cornice
        vec3 R = reflect(-V, N); vec3 env = mix(skyAt(R), vec3(0.1, 0.11, 0.13) * (0.6 + 0.6 * max(R.y, 0.0)), uStorm);
        float F = 0.07 + 0.93 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        float dif = max(dot(N, uSun), 0.0);
        float pane = h1(vec2(fi, ci)); vec3 inside = vec3(0.025, 0.06, 0.055) * (0.8 + 0.4 * pane) + vec3(0.05, 0.05, 0.04) * step(0.97, pane);
        vec3 glass = inside * (0.6 + 0.4 * dif) * uLight + env * vec3(0.42, 0.8, 0.72) * mix(0.38, 1.0, F) * uLight + vec3(1.0, 0.9, 0.7) * pow(max(dot(R, uSun), 0.0), 350.0) * 5.0 * uLight;
        vec3 spd = mix(vec3(0.05, 0.13, 0.12), env * vec3(0.3, 0.6, 0.55), 0.35 + 0.4 * F) * (0.5 + 0.6 * dif) * uLight;
        vec3 fr = vec3(0.12, 0.2, 0.19) * (0.35 + 0.9 * dif) * uLight + env * 0.12 * uLight;
        col = mix(glass, spd, spand); col = mix(col, fr, frameM * 0.85);
        col = mix(col, vec3(0.1, 0.16, 0.15) * (0.4 + 0.9 * dif) * uLight + env * 0.18 * uLight, band);
      }
      col += vec3(0.6, 0.65, 0.85) * uFlash * 0.35;
      float f = 1.0 - exp(-pow(dist * uFogD, 2.0)); col = mix(col, uFogC, f);
      gl_FragColor = vec4(col, 1.0); }` });
const tower = new THREE.Mesh(towerGeo, towerMat); tower.castShadow = true; tower.frustumCulled = false; scene.add(tower);
// a red "without the damper" ghost (same geometry, its own sway)
const GU = { uSway: { value: new THREE.Vector2() }, uK: { value: 0 } };
const ghost = new THREE.Mesh(towerGeo, new THREE.ShaderMaterial({ uniforms: GU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: TOWER_VS,
  fragmentShader: `uniform float uK; varying vec3 vN; varying vec3 vW; void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(normalize(vN), V)), 1.5); gl_FragColor = vec4(vec3(1.0, 0.16, 0.1) * (0.04 + 1.6 * f * f) * uK, 1.0); }` }));
ghost.frustumCulled = false; ghost.renderOrder = 5; ghost.visible = false; scene.add(ghost);
// spire + crown details (they follow the sway via userData.y)
const SWAYERS = [];
const sway = (o, y) => { o.userData.sy = y; o.userData.base = o.position.clone(); SWAYERS.push(o); return o; };
{ const sp = metal(0x9ea6ab, 0.35);
  const prof = [[7.2, 449], [5.2, 449.5], [5.0, 456], [3.6, 456.5], [3.4, 462], [2.2, 463], [2.0, 480], [1.4, 481], [1.2, 496], [0.7, 497], [0.5, 506], [0.15, 508]].map(([r, y]) => new THREE.Vector2(r, y - 449));
  const spire = sh(new THREE.Mesh(new THREE.LatheGeometry(prof, 24), sp)); spire.position.y = 449; scene.add(sway(spire, 470));
  for (const y of [458, 466, 474, 488]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(y < 462 ? 3.9 : 2.6, 0.18, 8, 32), metal(0xc9cfd2, 0.3)); ring.rotation.x = Math.PI / 2; ring.position.y = y; scene.add(sway(ring, y)); }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), glow(0xff3020, 3)); beacon.position.y = 508.2; scene.add(sway(beacon, 508)); }
// ruyi coins: a big disc with a square hole on each face of the trunk (≈25F)
{ const s = new THREE.Shape(); s.absarc(0, 0, 7.6, 0, TAU, false); const hole = new THREE.Path(); hole.moveTo(-2.6, -2.6); hole.lineTo(2.6, -2.6); hole.lineTo(2.6, 2.6); hole.lineTo(-2.6, 2.6); hole.lineTo(-2.6, -2.6); s.holes.push(hole);
  const cg = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.35, bevelSegments: 3, curveSegments: 48 });
  const cm = new THREE.MeshPhysicalMaterial({ color: 0x9a7b3c, metalness: 0.8, roughness: 0.38, clearcoat: 0.3 });
  for (let k = 0; k < 4; k++) { const c = sh(new THREE.Mesh(cg, cm)); const a = k * Math.PI / 2; c.position.set(Math.sin(a) * 26.6, FY(23.2), Math.cos(a) * 26.6); c.rotation.y = a; scene.add(sway(c, FY(23.2))); } }

// ---------- the city: Xinyi blocks, roads, park, neighbours, mountains ----------
const CITY = new THREE.Group(); scene.add(CITY);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0,
  map: H.canvasTex(4096, 4096, (g, w, h) => { // 16 km: 3.9 m / px; blocks 110 m, roads 22 m
    g.fillStyle = "#6f7270"; g.fillRect(0, 0, w, h); H.reseed(3);
    for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${90 + H.rnd() * 70},${95 + H.rnd() * 60},${88 + H.rnd() * 50},0.35)`; g.fillRect(H.rnd() * w, H.rnd() * h, 2 + H.rnd() * 9, 2 + H.rnd() * 9); }
    const px = (m) => (m + 8000) / 16000 * w;
    g.fillStyle = "#3b3e40"; for (let m = -8000; m < 8000; m += 132) { g.fillRect(px(m), 0, 22 / 3.9, h); g.fillRect(0, px(m), w, 22 / 3.9); }
    g.fillStyle = "#4d5a3b"; g.fillRect(px(-200), px(-120), 160 / 3.9, 110 / 3.9); g.fillStyle = "#56693f"; g.fillRect(px(500), px(-1400), 700 / 3.9, 420 / 3.9); // plaza green + a park
    g.fillStyle = "#3a5530"; g.beginPath(); g.ellipse(px(-2600), px(2600), 900 / 3.9, 600 / 3.9, 0.4, 0, 7); g.fill();
    g.fillStyle = "#3e5a6b"; g.fillRect(0, px(3600), w, 260 / 3.9); // a river
    // outside the basin: fields, villages, forest (no city grid)
    g.save(); g.beginPath(); g.rect(0, 0, w, h); g.arc(px(0), px(0), 5500 / 3.9, 0, 7, true); g.clip();
    g.fillStyle = "#4a5a3c"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const c = ["#5d6b45", "#3f5232", "#6f7253", "#4c5f3a", "#7a7a68"][Math.floor(H.rnd() * 5)]; g.fillStyle = c; g.save(); g.translate(H.rnd() * w, H.rnd() * h); g.rotate(H.rnd() * 3); g.fillRect(0, 0, 6 + H.rnd() * 30, 4 + H.rnd() * 18); g.restore(); }
    g.restore();
  }) }));
ground.material.map.anisotropy = 16; ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; CITY.add(ground);
const cityMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });
cityMat.onBeforeCompile = (s) => {
  s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aKind; varying vec3 vWP; varying vec3 vWN; varying vec2 vKind;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 wp4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wp4 = instanceMatrix * wp4;
      #endif
      vWP = (modelMatrix * wp4).xyz; vWN = normal; vKind = aKind;`);
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying vec2 vKind; float hh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 14375.5); }")
    .replace("#include <color_fragment>", `#include <color_fragment>
      { vec3 n = abs(vWN); float glassB = step(0.5, vKind.x);
        if (n.y > 0.5) { diffuseColor.rgb = vec3(0.42, 0.42, 0.4) * (0.75 + 0.35 * hh(floor(vWP.xz / 3.0))); }
        else { float u = (n.x > 0.5 ? vWP.z : vWP.x); float fh = mix(3.3, 4.0, glassB); float fy = fract(vWP.y / fh), fx = fract(u / mix(2.6, 1.6, glassB));
          float win = step(0.18, fy) * step(fy, 0.82) * step(0.15, fx) * step(fx, 0.85); if (glassB > 0.5) win = step(0.12, fy);
          float lit = hh(floor(vec2(vWP.y / fh, u / 2.6)) + vKind.y);
          int pi = int(floor(vKind.y * 5.0)); vec3 wall = pi == 0 ? vec3(0.74, 0.68, 0.58) : pi == 1 ? vec3(0.6, 0.6, 0.58) : pi == 2 ? vec3(0.55, 0.45, 0.37) : pi == 3 ? vec3(0.82, 0.81, 0.78) : vec3(0.7, 0.6, 0.55);
          wall *= (0.78 + 0.2 * hh(floor(vWP.xy * 0.7 + vWP.zz * 0.7))) * (0.85 + 0.25 * hh(vec2(vKind.y * 91.0, 3.0)));
          float far = smoothstep(500.0, 1600.0, length(cameraPosition - vWP)); win = mix(win, 0.42, far);
          vec3 glassC = mix(vec3(0.13, 0.16, 0.18), vec3(0.32, 0.36, 0.38), lit * 0.5);
          if (glassB > 0.5) glassC = mix(vec3(0.16, 0.24, 0.3), vec3(0.3, 0.42, 0.5), lit * 0.4);
          float balc = (1.0 - glassB) * step(0.86, fy) * step(0.4, hh(vec2(floor(u / 7.0), vKind.y)));
          diffuseColor.rgb = mix(wall, glassC, win * mix(0.85, 1.0, glassB)); diffuseColor.rgb *= 1.0 - balc * 0.45; if (vWP.y < 4.0) diffuseColor.rgb *= 0.5; } }`)
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.25, step(0.5, vKind.x) * step(abs(vWN.y), 0.5));");
};
cityMat.customProgramCacheKey = () => "city";
{ const B = [], TANKS = []; H.reseed(11);
  for (let gx = -40; gx <= 40; gx++) for (let gz = -40; gz <= 40; gz++) {
    const cx = gx * 132 + 66 + 11, cz = gz * 132 + 66 + 11, r = Math.hypot(cx, cz); if (r > 5200) continue;
    if (Math.abs(cx) < 140 && Math.abs(cz) < 140) continue;                         // Taipei 101 + its plaza
    if (cx > 480 && cx < 1220 && cz > -1420 && cz < -980) continue;                   // park
    if (Math.hypot(cx + 2600, cz - 2600) < 900 || (cz > 3560 && cz < 3900)) continue;  // park + river
    const n = 2 + Math.floor(H.rnd() * 4), dens = Math.exp(-r / 1400);
    for (let k = 0; k < n; k++) { const w = 18 + H.rnd() * 30, d = 18 + H.rnd() * 30; const x = cx + (H.rnd() - 0.5) * (110 - w), z = cz + (H.rnd() - 0.5) * (110 - d);
      let hgt = 9 + Math.pow(H.rnd(), 2.4) * (30 + 110 * dens); const glassB = H.rnd() < 0.08 + 0.35 * dens ? 1 : 0, sd = H.rnd(); B.push([x, z, w, d, hgt, glassB, sd, 0]);
      if (hgt > 28 && H.rnd() < 0.55) { const h2 = hgt * (0.12 + H.rnd() * 0.25); B.push([x + (H.rnd() - 0.5) * w * 0.15, z + (H.rnd() - 0.5) * d * 0.15, w * (0.55 + H.rnd() * 0.25), d * (0.55 + H.rnd() * 0.25), h2, glassB, sd, hgt]);
        if (glassB && H.rnd() < 0.5) B.push([x, z, w * 0.4, d * 0.4, h2 * 0.5 + 4, glassB, sd, hgt + h2]); }
      if (!glassB && H.rnd() < 0.6) TANKS.push([x + (H.rnd() - 0.5) * w * 0.5, z + (H.rnd() - 0.5) * d * 0.5, hgt]); } }
  // tall Xinyi neighbours (glass towers 150–272 m) within ~700 m
  for (const [x, z, w, d, hh] of [[190, -40, 52, 46, 272], [-260, 160, 40, 40, 205], [330, 260, 38, 44, 180], [-210, -330, 44, 36, 168], [480, -120, 34, 34, 150], [-450, -60, 36, 36, 140], [120, 420, 30, 40, 130]]) { B.push([x, z, w, d, hh, 1, 0.85, 0]); B.push([x, z, w * 0.72, d * 0.72, hh * 0.08, 1, 0.85, hh]); B.push([x, z, w * 0.35, d * 0.35, hh * 0.05 + 6, 1, 0.85, hh * 1.08]); }
  const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(bg, cityMat, B.length); const kind = new Float32Array(B.length * 2); const m4 = new THREE.Matrix4();
  B.forEach(([x, z, w, d, hh, gb, s, y0], i) => { m4.makeScale(w, hh, d).setPosition(x, y0, z); im.setMatrixAt(i, m4); kind[i * 2] = gb; kind[i * 2 + 1] = s; });
  bg.setAttribute("aKind", new THREE.InstancedBufferAttribute(kind, 2)); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; CITY.add(im);
  // rooftop plant boxes on the bigger ones
  const pg = new RoundedBoxGeometry(1, 1, 1, 2, 0.15); pg.translate(0, 0.5, 0); const rbox = B.filter((b) => b[2] > 26 && b[7] === 0 && b[5] === 1);
  const rim = new THREE.InstancedMesh(pg, matte(0x8c8f8f, 0.7), rbox.length); rbox.forEach(([x, z, w, d, hh], i) => { m4.makeScale(w * 0.35, 3 + (i % 3), d * 0.3).setPosition(x + w * 0.15, hh, z - d * 0.1); rim.setMatrixAt(i, m4); }); rim.castShadow = true; CITY.add(rim);
  // Taipei rooftops: steel water tanks on stands
  const tkG = new THREE.CylinderGeometry(1, 1, 1, 16); tkG.translate(0, 0.5, 0); const tk = new THREE.InstancedMesh(tkG, metal(0xb9bec2, 0.35), TANKS.length);
  TANKS.forEach(([x, z, y], i) => { m4.makeScale(1.4, 2.4, 1.4).setPosition(x, y + 1.0, z); tk.setMatrixAt(i, m4); }); tk.castShadow = true; CITY.add(tk);
  // street trees
  const tg = new THREE.IcosahedronGeometry(1, 1); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 0.85 + 0.3 * Math.sin(v.x * 5 + v.y * 3) * Math.cos(v.z * 4); p.setXYZ(i, v.x * k, v.y * k * 0.85 + 0.6, v.z * k); } tg.computeVertexNormals(); }
  const NT = 7000, trees = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x3f6a32, roughness: 0.9 }), NT); H.reseed(19); const col = new THREE.Color();
  for (let i = 0; i < NT; i++) { const along = H.rnd() < 0.5, line = Math.round((H.rnd() - 0.5) * 70) * 132 + (H.rnd() < 0.5 ? 2 : 20), pos = (H.rnd() - 0.5) * 9000; let x = along ? pos : line, z = along ? line : pos;
    if (Math.hypot(x, z) > 4800) { x *= 0.5; z *= 0.5; } const s = 3 + H.rnd() * 3; m4.makeScale(s, s * 1.1, s).setPosition(x, 0.5, z); trees.setMatrixAt(i, m4); trees.setColorAt(i, col.setHSL(0.27 + H.rnd() * 0.06, 0.38, 0.22 + H.rnd() * 0.1)); }
  trees.castShadow = true; trees.receiveShadow = true; trees.frustumCulled = false; CITY.add(trees);
  // the podium mall at the foot of the tower
  const pod = sh(new THREE.Mesh(new RoundedBoxGeometry(150, 34, 96, 3, 3), new THREE.MeshPhysicalMaterial({ color: 0x8c9895, roughness: 0.3, metalness: 0.3, clearcoat: 0.5 }))); pod.position.set(-18, 17, -58); CITY.add(pod);
  const podTop = sh(new THREE.Mesh(new THREE.BoxGeometry(150, 0.8, 96), matte(0x5d6460))); podTop.position.set(-18, 34.4, -58); CITY.add(podTop); }
// mountains ring (Yangmingshan side higher)
{ const g = new THREE.BufferGeometry(), A = 256, R = 8, pos = [], idx = [];
  for (let j = 0; j <= R; j++) for (let i = 0; i <= A; i++) { const a = i / A * TAU, r = 5800 + j / R * 8000; const n = Math.sin(a * 5 + 1) * 0.5 + Math.sin(a * 13 + j) * 0.25 + Math.sin(a * 31 - j * 2) * 0.12 + 0.6;
    const hgt = Math.max(0, n) * (j / R) * (600 + 700 * Math.max(0, Math.sin(a + 0.6))) * (j === R ? 0.6 : 1); pos.push(Math.cos(a) * r, hgt, Math.sin(a) * r); }
  for (let j = 0; j < R; j++) for (let i = 0; i < A; i++) { const a = j * (A + 1) + i, b = a + 1, c = a + A + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  CITY.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3d5640, roughness: 0.95, flatShading: false }))); }

// ---------- the damper set, at its real height inside the tower ----------
const INT = new THREE.Group(); scene.add(INT); INT.visible = false;
const mp = (n, srgb, rx, ry) => tex(`kit/ph/metal_plate/metal_plate_${n}_1k.jpg`, srgb, rx, ry);
const cf = (n, srgb, rx, ry) => tex(`kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_${n}_1k.jpg`, srgb, rx, ry);
const DECK = BY - 1.7, LOW = BY - 5.2, CEIL = PIV + 0.8, RW = 21;
{ const deckM = new THREE.MeshPhysicalMaterial({ color: 0x8b8a86, map: cf("diff", true, 8, 8), normalMap: cf("nor_gl", false, 8, 8), roughnessMap: cf("rough", false, 8, 8), roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  const deck = sh(new THREE.Mesh(new THREE.RingGeometry(7.6, RW, 96, 2), deckM), false, true); deck.rotation.x = -Math.PI / 2; deck.position.y = DECK; INT.add(deck);
  const edge = sh(new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 0.45, 96, 1, true), matte(0x2a2c2e, 0.6))); edge.position.y = DECK - 0.22; INT.add(edge);
  const low = sh(new THREE.Mesh(new THREE.CircleGeometry(RW, 96), new THREE.MeshStandardMaterial({ color: 0x77736b, map: cf("diff", true, 6, 6), normalMap: cf("nor_gl", false, 6, 6), roughness: 0.8 })), false, true); low.rotation.x = -Math.PI / 2; low.position.y = LOW; INT.add(low);
  const ceilM = matte(0x1a1c1f, 0.7); const ceil = new THREE.Mesh(new THREE.RingGeometry(8.2, RW, 96, 1), ceilM); ceil.rotation.x = Math.PI / 2; ceil.position.y = DECK + 4.3; INT.add(ceil);
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, r = 11 + (i % 3) * 3.2; const dl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), glow(0xfff0d8, 2.4)); dl.rotation.x = Math.PI / 2; dl.position.set(Math.cos(a) * r, DECK + 4.28, Math.sin(a) * r); INT.add(dl); }
  // the shaft above the deck (dark steel panels) up to 92F, and the ceiling grid with I-beams
  const shaftM = new THREE.MeshPhysicalMaterial({ color: 0x3b3e42, map: mp("diff", true, 10, 3), normalMap: mp("nor_gl", false, 10, 3), roughnessMap: mp("rough", false, 10, 3), roughness: 0.6, metalness: 0.6, side: THREE.BackSide });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, CEIL - (DECK + 4.3), 96, 1, true), shaftM); shaft.position.y = (CEIL + DECK + 4.3) / 2; shaft.receiveShadow = true; INT.add(shaft);
  const lid = new THREE.Mesh(new THREE.CircleGeometry(8.3, 64), matte(0x15171a, 0.8)); lid.rotation.x = Math.PI / 2; lid.position.y = CEIL + 0.9; INT.add(lid);
  const ib = new THREE.Shape(); [[-0.35, -0.5], [0.35, -0.5], [0.35, -0.42], [0.06, -0.42], [0.06, 0.42], [0.35, 0.42], [0.35, 0.5], [-0.35, 0.5], [-0.35, 0.42], [-0.06, 0.42], [-0.06, -0.42], [-0.35, -0.42]].forEach(([x, y], i) => (i ? ib.lineTo(x, y) : ib.moveTo(x, y)));
  const beamG = new THREE.ExtrudeGeometry(ib, { depth: 16.4, bevelEnabled: false }); beamG.translate(0, 0, -8.2); const beamM = paint(0x55606a, 0.5);
  for (const x of [-4.2, -1.4, 1.4, 4.2]) { const b = sh(new THREE.Mesh(beamG, beamM)); b.position.set(x, CEIL + 0.3, 0); INT.add(b); const c = sh(new THREE.Mesh(beamG, beamM)); c.rotation.y = Math.PI / 2; c.position.set(0, CEIL - 0.7, x); INT.add(c); }
  // glass railing around the opening + steel handrail
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xcfe8e4, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(7.75, 7.75, 1.1, 96, 1, true), glassM); rail.position.y = DECK + 0.55; INT.add(rail);
  const hr = new THREE.Mesh(new THREE.TorusGeometry(7.8, 0.045, 10, 128), metal(0xc9ccd0, 0.18)); hr.rotation.x = Math.PI / 2; hr.position.y = DECK + 1.12; INT.add(hr);
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), metal(0xb8bcc0, 0.25)); p.position.set(Math.cos(a) * 7.8, DECK + 0.55, Math.sin(a) * 7.8); INT.add(p); }
  // mega columns + the curtain wall (see-through: the real city outside)
  const colM = new THREE.MeshPhysicalMaterial({ color: 0xb9b5ad, map: cf("diff", true, 1, 3), normalMap: cf("nor_gl", false, 1, 3), roughness: 0.55, clearcoat: 0.3 });
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU; const c = sh(new THREE.Mesh(new RoundedBoxGeometry(2.4, 12, 2.4, 2, 0.1), colM)); c.position.set(Math.cos(a) * 17.2, LOW + 6, Math.sin(a) * 17.2); c.rotation.y = -a; INT.add(c); }
  const win = new THREE.MeshPhysicalMaterial({ color: 0xa8d4cc, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const mull = metal(0x3d4a48, 0.4);
  for (let i = 0; i < 20; i++) { const a0 = i / 20 * TAU, a1 = (i + 1) / 20 * TAU, w = 2 * RW * Math.sin(Math.PI / 20);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 4.3), win); const am = (a0 + a1) / 2; p.position.set(Math.cos(am) * RW * Math.cos(Math.PI / 20), DECK + 2.15, Math.sin(am) * RW * Math.cos(Math.PI / 20)); p.lookAt(0, DECK + 2.15, 0); INT.add(p);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.3, 0.2), mull); m.position.set(Math.cos(a0) * RW, DECK + 2.15, Math.sin(a0) * RW); m.lookAt(0, DECK + 2.15, 0); INT.add(m);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 0.6), matte(0x2b2e30, 0.6)); sill.position.copy(p.position).setY(DECK + 0.25); sill.lookAt(0, DECK + 0.25, 0); INT.add(sill); }
}
// the ball: 41 plates, each 12.5 cm, stacked like coins → a 5.5 m sphere; gold paint
const R = 2.75, NPL = 41, PT = 0.125;
const gold = new THREE.MeshPhysicalMaterial({ color: 0xdcae3c, metalness: 0.65, roughness: 0.36, clearcoat: 0.45, clearcoatRoughness: 0.18 });
const PEND = new THREE.Group(); PEND.position.set(0, PIV, 0); INT.add(PEND);      // pivot at 92F
const BALL = new THREE.Group(); BALL.position.y = BY - PIV; PEND.add(BALL);
const PLATES = [];
for (let i = 0; i < NPL; i++) { const y0 = -NPL * PT / 2 + i * PT, y1 = y0 + PT, yc = (y0 + y1) / 2; const r = Math.sqrt(Math.max(0.05, R * R - (Math.abs(yc) + (Math.abs(yc) > 2.3 ? 0.04 : 0)) ** 2)) * (R / 2.75);
  const b = 0.012; const pr = [[0, y0], [r - b, y0], [r, y0 + b], [r, y1 - b], [r - b, y1], [0, y1]].map(([x, y]) => new THREE.Vector2(x, y - yc));
  const m = sh(new THREE.Mesh(new THREE.LatheGeometry(pr, 96), gold)); m.position.y = yc; m.userData.y = yc; BALL.add(m); PLATES.push(m); }
// cradle ring at the equator + 8 lugs (4 pairs), the cables to the 92F frame, the bottom pin
const cradleM = paint(0xc8a23a, 0.35, { metalness: 0.5 });
{ const ringP = [[2.78, -0.35], [3.15, -0.35], [3.15, 0.35], [2.78, 0.35]].map(([x, y]) => new THREE.Vector2(x, y)); const ring = sh(new THREE.Mesh(new THREE.LatheGeometry([...ringP, ringP[0]], 96), cradleM)); BALL.add(ring);
  for (let i = 0; i < 8; i++) { const a = Math.PI / 4 + Math.floor(i / 2) * Math.PI / 2 + (i % 2 ? 0.11 : -0.11); const lug = sh(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.9, 0.25, 2, 0.05), cradleM)); lug.position.set(Math.cos(a) * 3.25, 0.55, Math.sin(a) * 3.25); lug.rotation.y = -a + Math.PI / 2; BALL.add(lug); }
  const pin = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 32), metal(0x8d9399, 0.3))); pin.position.y = -R - 0.6; BALL.add(pin);
  const bot = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.2, 0.35, 48), cradleM)); bot.position.y = -R + 0.25; BALL.add(bot); }
const ropeTex = H.canvasTex(64, 512, (g, w, h) => { g.fillStyle = "#777"; g.fillRect(0, 0, w, h); for (let y = -64; y < h + 64; y += 12) { const gr = g.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, "#555"); gr.addColorStop(0.5, "#ddd"); gr.addColorStop(1, "#555"); g.fillStyle = gr; g.save(); g.translate(0, y); g.transform(1, 0.35, 0, 1, 0, 0); g.fillRect(-20, 0, 120, 12); g.restore(); } });
ropeTex.wrapS = ropeTex.wrapT = THREE.RepeatWrapping; ropeTex.repeat.set(1, 30);
const ropeM = new THREE.MeshPhysicalMaterial({ color: 0xb8bcc0, metalness: 0.9, roughness: 0.35, map: ropeTex, bumpMap: ropeTex, bumpScale: 0.6 });
const CABLES = [];
for (let i = 0; i < 8; i++) { const a = Math.PI / 4 + Math.floor(i / 2) * Math.PI / 2 + (i % 2 ? 0.11 : -0.11); const p0 = V(Math.cos(a) * 3.25, BY - PIV + 1.0, Math.sin(a) * 3.25), p1 = V(Math.cos(a) * 3.4, 0.2, Math.sin(a) * 3.4);
  const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1, 16), ropeM)); c.userData = { p0, p1 }; PEND.add(c); CABLES.push(c);
  c.position.copy(p0).add(p1).multiplyScalar(0.5); c.scale.y = p0.distanceTo(p1); c.quaternion.setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize()); }
// cable anchors (fixed at 92F)
for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; const an = sh(new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.8, 0.8, 2, 0.06), paint(0x55606a, 0.5))); an.position.set(Math.cos(a) * 3.4, PIV + 0.5, Math.sin(a) * 3.4); an.rotation.y = -a; INT.add(an); }
// 8 hydraulic dampers: barrel (fixed to the 87F floor), chrome rod (to the ball's bottom ring), clevis eyes, hoses
const DAMP = [];
{ const barP = [[0, 0], [0.24, 0], [0.26, 0.04], [0.26, 0.18], [0.22, 0.22], [0.22, 1.25], [0.27, 1.28], [0.27, 1.45], [0.12, 1.5], [0.12, 1.55], [0, 1.55]].map(([x, y]) => new THREE.Vector2(x, y));
  const barG = new THREE.LatheGeometry(barP, 48); barG.rotateX(Math.PI / 2); barG.scale(1, 1, 1.6);   // along +z
  const rodG = new THREE.CylinderGeometry(0.075, 0.075, 3.0, 24); rodG.rotateX(Math.PI / 2); rodG.translate(0, 0, -1.5);
  const eyeG = new THREE.TorusGeometry(0.13, 0.06, 12, 24); const lugG = new RoundedBoxGeometry(0.42, 0.5, 0.3, 2, 0.04);
  const barM = paint(0x2b6db0, 0.38, { metalness: 0.3 }), chrome = metal(0xe8ecef, 0.08), steel = metal(0x6c737a, 0.35);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8;
    const floorP = V(Math.cos(a) * 5.6, LOW + 0.6, Math.sin(a) * 5.6), ballLocal = V(Math.cos(a) * 1.45, -R + 0.25, Math.sin(a) * 1.45);
    const bar = sh(new THREE.Mesh(barG, barM)), rod = sh(new THREE.Mesh(rodG, chrome)), e1 = sh(new THREE.Mesh(eyeG, steel)), e2 = sh(new THREE.Mesh(eyeG, steel)), base = sh(new THREE.Mesh(lugG, steel));
    base.position.copy(floorP).setY(LOW + 0.25); INT.add(bar, rod, e1, e2, base);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 24, Math.PI), matte(0x111111, 0.5)); bar.add(hose); hose.position.set(0.2, 0.25, 0.75); hose.rotation.y = Math.PI / 2;
    DAMP.push({ floorP, ballLocal, bar, rod, e1, e2 }); } }
// bumper ring around the pin (8 rubber snubbers)
{ const br = sh(new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.16, 12, 64), metal(0x4d545b, 0.3))); br.rotation.x = Math.PI / 2; br.position.y = LOW + 1.2; INT.add(br);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, s = sh(new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.4, 0.3, 2, 0.06), matte(0x151515, 0.8))); s.position.set(Math.cos(a) * 1.1, LOW + 1.2, Math.sin(a) * 1.1); INT.add(s);
    const leg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 12), metal(0x4d545b, 0.3))); leg.position.set(Math.cos(a) * 1.25, LOW + 0.6, Math.sin(a) * 1.25); INT.add(leg); } }
const spotA = new THREE.SpotLight(0xffe2b0, 900, 60, 0.42, 0.6, 1.6); spotA.position.set(9, DECK + 4.0, 7); spotA.target.position.set(0, BY, 0); spotA.castShadow = true; spotA.shadow.mapSize.set(1024, 1024); spotA.shadow.bias = -0.0005; INT.add(spotA, spotA.target);
const spotB = new THREE.SpotLight(0xd8e8ff, 500, 60, 0.5, 0.7, 1.6); spotB.position.set(-8, DECK + 4.1, -6); spotB.target.position.set(0, BY - 1, 0); INT.add(spotB, spotB.target);
const intFill = new THREE.PointLight(0xffd9a0, 120, 40, 1.6); intFill.position.set(0, LOW + 2, 0); INT.add(intFill);
// a hanging lamp + a water glass for the seasick shot (Poly Haven lamp)
const lampG = (await gltf("kit/ph/caged_hanging_light/caged_hanging_light_1k.gltf")).scene;
const fitTo = (o, size) => { const b = new THREE.Box3().setFromObject(o), s = b.getSize(V()); o.scale.setScalar(size / Math.max(s.x, s.y, s.z)); return o; };
const LAMP = new THREE.Group(); LAMP.position.set(-14.5, DECK + 4.28, 9.5); INT.add(LAMP); { const l = fitTo(lampG, 0.5); l.position.y = -1.3; LAMP.add(l); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.1, 6), matte(0x111111)); cord.position.y = -0.55; LAMP.add(cord); const pl = new THREE.PointLight(0xffe6c0, 6, 6, 2); pl.position.y = -1.45; LAMP.add(pl); }
const GLASS = new THREE.Group(); GLASS.position.set(-16.4, DECK + 1.0, 10.6); INT.add(GLASS);
{ const pr = [[0, 0], [0.032, 0], [0.036, 0.004], [0.042, 0.11], [0.039, 0.11], [0.033, 0.006], [0, 0.006]].map(([x, y]) => new THREE.Vector2(x, y));
  GLASS.add(new THREE.Mesh(new THREE.LatheGeometry(pr, 48), new THREE.MeshPhysicalMaterial({ color: 0xdfeeee, roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.3, side: THREE.DoubleSide, depthWrite: false })));
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.037, 48), new THREE.MeshPhysicalMaterial({ color: 0x6fb4d0, roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.9, clearcoat: 1 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.075; GLASS.add(water); GLASS.userData.water = water;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.034, 0.068, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x9fd4e8, roughness: 0.1, transparent: true, opacity: 0.35 })); body.position.y = 0.041; GLASS.add(body);
  const ledge = sh(new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.06, 0.5, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x3a2a20, roughness: 0.35, clearcoat: 0.6 }))); ledge.position.y = -0.03; GLASS.add(ledge); }

// ---------- the damper cutaway (close-up of one cylinder, its own little set) ----------
const CUT = new THREE.Group(); CUT.position.set(0, BY, -400); scene.add(CUT); CUT.visible = false;
const clipP = new THREE.Plane(V(0, 0, 1), 400);
const oilU = { uT: { value: 0 }, uHeat: { value: 0 } };
const pistonG = new THREE.Group(); CUT.add(pistonG);
{ const cm = (c, r = 0.35, m = 0.4) => { const x = H.cutaway(new THREE.MeshPhysicalMaterial({ color: c, roughness: r, metalness: m, clippingPlanes: [clipP] }), 0xb54a2c); return x; };
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.2, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x2b6db0, roughness: 0.38, metalness: 0.3, clippingPlanes: [clipP], side: THREE.DoubleSide })); tube.rotation.z = Math.PI / 2; CUT.add(tube);
  const tubeIn = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 3.2, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x4a5056, roughness: 0.45, metalness: 0.8, clippingPlanes: [clipP], side: THREE.BackSide })); tubeIn.rotation.z = Math.PI / 2; CUT.add(tubeIn);
  { const hatch = H.canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#c4462c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8e2f1c'; g.lineWidth = 6; for (let x = -h; x < w + h; x += 18) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke(); } }); hatch.wrapS = THREE.RepeatWrapping; hatch.repeat.set(12, 1);
    for (const y of [-0.39, 0.39]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.06), new THREE.MeshBasicMaterial({ map: hatch, side: THREE.DoubleSide })); st.position.set(0, y, 0); CUT.add(st); } }
  for (const s of [-1, 1]) { const capM = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.22, 64), cm(0x23272c, 0.4, 0.6)); capM.rotation.z = Math.PI / 2; capM.position.x = s * 1.7; CUT.add(capM); }
  const oil = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.355, 3.18, 64), new THREE.ShaderMaterial({ uniforms: oilU, transparent: true, depthWrite: false, clippingPlanes: [clipP], clipping: true,
    vertexShader: `#include <clipping_planes_pars_vertex>
      varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vV = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition;
      #include <clipping_planes_vertex>
      }`,
    fragmentShader: `#include <clipping_planes_pars_fragment>
      uniform float uT, uHeat; varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){
      #include <clipping_planes_fragment>
      float f = 0.5 + 0.5 * sin(vP.y * 18.0 - uT * 7.0) * sin(vP.x * 9.0 + uT * 3.0); vec3 c = mix(vec3(0.55, 0.32, 0.05), vec3(0.95, 0.62, 0.12), f * 0.5);
      c = mix(c, vec3(1.6, 0.55, 0.12), uHeat * (0.6 + 0.4 * f)); float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0); gl_FragColor = vec4(c * (0.8 + 0.6 * fr), 0.8); }` }));
  oil.rotation.z = Math.PI / 2; CUT.add(oil); CUT.userData.oil = oil;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 64), cm(0x7d858c, 0.2, 0.95)); head.rotation.z = Math.PI / 2; pistonG.add(head);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 16), new THREE.MeshBasicMaterial({ color: 0x050505, clippingPlanes: [clipP] })); hole.rotation.z = Math.PI / 2; hole.position.set(0, Math.cos(a) * 0.2, Math.sin(a) * 0.2); pistonG.add(hole); }
  const rodC = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 32), new THREE.MeshPhysicalMaterial({ color: 0xeef1f3, metalness: 1, roughness: 0.06, clippingPlanes: [clipP] })); rodC.rotation.z = Math.PI / 2; rodC.position.x = 1.5; pistonG.add(rodC);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.07, 12, 32), metal(0x6c737a, 0.35)); eye.position.x = 3.15; pistonG.add(eye);
  CUT.add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.07, 12, 32), metal(0x6c737a, 0.35)).translateX(-2.0)); }
const NJ = 160, jets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.2, 0.3), toneMapped: false }), NJ); jets.frustumCulled = false; CUT.add(jets);
H.reseed(5); const JP = Array.from({ length: NJ }, () => ({ h: Math.floor(H.rnd() * 6), d: H.rnd(), s: H.rnd() }));
const NHt = 0, heatR = new THREE.InstancedMesh(new THREE.TorusGeometry(0.5, 0.008, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.7, 0.15), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), NHt); heatR.frustumCulled = false; CUT.add(heatR);

// ---------- Earth (typhoon + quake map) ----------
const EARTH = new THREE.Group(); EARTH.position.set(0, 0, 60000); scene.add(EARTH); EARTH.visible = false;
const ER = 6000, geo = (lat, lon, r = ER) => { const th = (90 - lat) * Math.PI / 180, ph = (lon + 180) * Math.PI / 180; return V(-Math.cos(ph) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r); };
const TW = geo(23.7, 121.0).normalize(), TY0 = geo(20.5, 131.0).normalize(), HUA = geo(23.9, 121.6).normalize();
const EU = { day: { value: tex("kit/models/planets/earth_atmos_2048.jpg", true) }, clouds: { value: tex("kit/models/planets/earth_clouds_1024.png", true) }, sun: { value: geo(23.7, 121.0).normalize().add(V(0.35, 0.45, 0.2)).normalize() },
  ty: { value: TY0.clone() }, tyK: { value: 0 }, qu: { value: HUA }, quK: { value: 0 }, t: { value: 0 } };
for (const k of ["day", "clouds"]) { EU[k].value.wrapS = THREE.RepeatWrapping; EU[k].value.repeat.set(1, 1); }
const earth = new THREE.Mesh(new THREE.SphereGeometry(ER, 160, 96), new THREE.ShaderMaterial({ uniforms: EU, fog: false,
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vO; void main(){ vUv = uv; vO = normalize(position); vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D day, clouds; uniform vec3 sun, ty, qu; uniform float tyK, quK, t; varying vec2 vUv; varying vec3 vN; varying vec3 vO;
    void main(){ vec3 n = normalize(vN); float l = 0.25 + 0.85 * max(dot(n, sun), 0.0); vec3 c = texture2D(day, vUv).rgb * l; float cl = texture2D(clouds, vUv).a * dot(texture2D(clouds, vUv).rgb, vec3(0.333));
      c = mix(c, vec3(0.95) * l, smoothstep(0.3, 0.9, cl) * 0.45);
      // typhoon: a spiral of cloud with an eye, around ty
      vec3 o = normalize(vO); float d = acos(clamp(dot(o, ty), -1.0, 1.0)); vec3 e1 = normalize(cross(ty, vec3(0.0, 1.0, 0.0))), e2 = cross(e1, ty);
      float ang = atan(dot(o, e2), dot(o, e1)); float rr = d / 0.065;
      float arms = 0.5 + 0.5 * sin(ang * 2.0 + log(max(rr, 0.02)) * 5.5 + t * 1.5);
      float typ = smoothstep(1.4, 0.2, rr) * mix(0.55, 1.0, arms) * smoothstep(0.08, 0.2, rr);
      typ = max(typ, smoothstep(0.2, 0.1, rr) * smoothstep(0.03, 0.09, rr));
      c = mix(c, vec3(1.0) * (0.35 + 0.75 * l), clamp(typ * tyK, 0.0, 1.0) * 0.92);
      // earthquake: rings from Hualien
      float dq = acos(clamp(dot(o, qu), -1.0, 1.0)) / 0.06; float ring = 0.0; for (int i = 0; i < 3; i++){ float rp = fract(t * 0.6 - float(i) * 0.33) * 2.2; ring += smoothstep(0.07, 0.0, abs(dq - rp)) * (1.0 - rp / 2.2); }
      c += vec3(1.4, 0.25, 0.15) * ring * quK + vec3(1.6, 0.3, 0.2) * smoothstep(0.12, 0.0, dq) * quK;
      float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vec3(0.0, 0.0, 60000.0) - vO * ${ER}.0)), 0.0), 3.0); c += vec3(0.2, 0.4, 0.9) * rim * 0.35;
      gl_FragColor = vec4(c, 1.0); }` }));
EARTH.add(earth);
const stars = (() => { const n = 5000, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); H.reseed(4); for (let i = 0; i < n; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 25000, u * 25000, Math.sin(a) * r * 25000], i * 3); } g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, color: 0xcfd8ff, fog: false })); })();
EARTH.add(stars);

// ---------- weather: rain + wind streaks (camera-local volume) ----------
const NR = 2600, rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 4), new THREE.MeshBasicMaterial({ color: 0xc9d4e0, transparent: true, opacity: 0.35, depthWrite: false, fog: false }), NR); rain.frustumCulled = false; scene.add(rain);
H.reseed(23); const RP = Array.from({ length: NR }, () => ({ x: H.rnd(), y: H.rnd(), z: H.rnd(), s: 0.6 + H.rnd() * 0.8 }));
function weather(t, vol, wind, len, on) { rain.visible = on; if (!on) return; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = H.cam.position, dir = V(wind, -1, 0.15 * wind).normalize(); q.setFromUnitVectors(V(0, 1, 0), dir);
  RP.forEach((p, i) => { const fall = (p.y - t * 0.55 * p.s) % 1; const y = ((fall + 1) % 1 - 0.5) * vol; const x = ((p.x + t * 0.25 * wind * p.s) % 1 - 0.5) * vol, z = (p.z - 0.5) * vol;
    const pos = V(c.x + x, c.y + y, c.z + z); const near = pos.distanceTo(c) < vol * 0.06 ? 0 : 1; m4.compose(pos, q, V(near, len * p.s * near, near)); rain.setMatrixAt(i, m4); }); rain.instanceMatrix.needsUpdate = true; }

// ---------- the visitor (real anatomy, dressed) ----------
const A = standardLayers(await loadAnatomy()); scene.add(A.root);
A.mat.shirt.color.set(0x2f4f3a); A.mat.shorts.color.set(0x2a2d33); A.mat.shoes.color.set(0xe8e6e0);
const visPhone = makePhone(0x1d1f22); visPhone.g.scale.setScalar(0.09); scene.add(visPhone.g);

// ---------- Orbi: laptop on the deck ledge, a phone scanning its QR; the ball behind ----------
const IMG = { lshare: await img("shots/laptop-share.png"), pobj: await img("shots/phone-object.png"), lhome: await img("shots/laptop.png"), phome: await img("shots/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
const lock = makeLock(); OR.add(lock); const embers = makeEmbers(); OR.add(embers); const orbiL = new THREE.PointLight(0x3dff8c, 0, 6, 2); OR.add(orbiL);
const counter = sh(new THREE.Mesh(new RoundedBoxGeometry(9, 0.25, 4.2, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x2a1f19, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1), normalMap: tex("kit/ph/wood_table_001/wood_table_001_nor_gl_1k.jpg", false, 2, 1) }))); OR.add(counter); counter.position.set(0.6, -0.2, 0.2);
// QR crop of the live share block (laptop capture) for the phone's camera view
const QR = { x: 0, y: 0, s: 0 };
function findQR() { if (!IMG.lshare) return; const c = document.createElement("canvas"); c.width = 1440; c.height = 900; const g = c.getContext("2d"); g.drawImage(IMG.lshare, 0, 0, 1440, 900); const d = g.getImageData(0, 0, 1440, 900).data;
  // the QR is the largest near-square block of pure black/white modules: scan for a dense black/white region
  let best = null; for (let y = 0; y < 900 - 80; y += 6) for (let x = 0; x < 1440 - 80; x += 6) { let bw = 0, n = 0; for (let yy = 0; yy < 80; yy += 8) for (let xx = 0; xx < 80; xx += 8) { const i = ((y + yy) * 1440 + x + xx) * 4; const v = d[i], s = Math.abs(d[i] - d[i + 1]) + Math.abs(d[i] - d[i + 2]); if (s < 12 && (v < 30 || v > 225)) bw++; n++; } if (bw === n && (!best || false)) { best = best || [x, y]; } }
  if (best) { let [x, y] = best; let s = 80; while (x + s < 1440 && y + s < 900) { const i = ((y + s) * 1440 + x + s) * 4; const v = d[i]; if (!(v < 30 || v > 225)) break; s += 4; } Object.assign(QR, { x, y, s }); } }
Object.assign(QR, { x: 1091, y: 522, s: 85 }); // the QR in the live capture (1440×900 space)
function drawLap(g, st) {
  if (IMG.lshare) g.drawImage(IMG.lshare, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.hl > 0 && QR.s) { g.strokeStyle = green; g.lineWidth = 6; g.globalAlpha = st.hl; rr(g, QR.x - 14, QR.y - 14, QR.s + 28, QR.s + 28, 16); g.stroke(); g.globalAlpha = 1; }
  if (st.burn) { g.fillStyle = "rgba(0,0,0,.8)"; rr(g, 1080, 30, 330, 70, 35); g.fill(); g.fillStyle = "#ff8a3d"; g.font = "700 30px M"; g.fillText(st.burn, 1110, 76); } }
function drawPhone(g, st) {
  if (st.mode === "cam") { // camera viewfinder pointed at the laptop: the QR big in frame, brackets, the link pill
    g.fillStyle = "#111"; g.fillRect(0, 0, 780, 1688);
    if (IMG.lshare && QR.s) { const z = 2.2 + st.zoom * 1.2, cx = QR.x + QR.s / 2, cy = QR.y + QR.s / 2; g.save(); g.filter = "blur(1.5px) brightness(0.9)"; g.translate(390, 760); g.rotate(-0.05 + st.wob * 0.03); g.scale(z, z); g.drawImage(IMG.lshare, -cx, -cy, 1440, 900); g.restore(); g.filter = "none"; }
    const s = 430 - st.lockK * 40; g.strokeStyle = st.lockK > 0.5 ? green : "#fff"; g.lineWidth = 10; const x0 = 390 - s / 2, y0 = 760 - s / 2, L = 70;
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x0 + s, y0, -1, 1], [x0, y0 + s, 1, -1], [x0 + s, y0 + s, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * L); g.lineTo(x, y); g.lineTo(x + dx * L, y); g.stroke(); }
    g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, 0, 780, 150); g.fillStyle = "#ffd60a"; g.font = "700 30px M"; g.textAlign = "center"; g.fillText("PHOTO", 390, 1560); g.textAlign = "left";
    g.fillStyle = "#fff"; g.beginPath(); g.arc(390, 1470, 62, 0, 7); g.fill(); g.strokeStyle = "#111"; g.lineWidth = 6; g.beginPath(); g.arc(390, 1470, 52, 0, 7); g.stroke();
    if (st.pill > 0) { g.globalAlpha = st.pill; g.fillStyle = "#ffd60a"; rr(g, 110, 1080, 560, 96, 48); g.fill(); g.fillStyle = "#111"; g.font = "700 34px M"; g.fillText("orbitransfer.com", 200, 1142); g.globalAlpha = 1; }
  } else { if (IMG.pobj) g.drawImage(IMG.pobj, 0, 0, 780, 1688); else if (IMG.phome) g.drawImage(IMG.phome, 0, 0, 780, 1688);
    if (st.land < 1) { g.fillStyle = `rgba(0,0,0,${1 - st.land})`; g.fillRect(0, 0, 780, 1688); } }
  if (st.burn) { g.fillStyle = "rgba(0,0,0,.8)"; rr(g, 160, 150, 460, 80, 40); g.fill(); g.fillStyle = "#ff8a3d"; g.font = "700 34px M"; g.fillText(st.burn, 205, 202); } }

// ---------- overlays ----------
H.callouts({
  h508: ["508 m", "#3dff8c", "to the tip of the spire"], tw: ["Taiwan", "#3dff8c"], tyc: ["Typhoon", "#cfe6ff"], f92: ["Floor 92", "#ffd166", "where it hangs from"], f87: ["Floor 87", "#ffd166", "where the pistons sit"],
  wide: ["5.5 m wide", "#ffd166"], plates: ["41 steel plates", "#ffd166", "12.5 cm each, stacked"], cables: ["8 steel cables", "#cfd6dd", "the whole ball hangs on them"],
  wind: ["Wind", "#9fd4ff", "pushes the tower"], lag: ["The ball lags behind", "#ffd166", "swings the other way"], pull: ["Pulls the tower back", "#3dff8c"],
  piston: ["Hydraulic piston", "#6fb0ff", "8 of them"], oil: ["Oil squeezed through holes", "#ffb03d", "motion → heat"],
  qr: ["Its own QR code", green, "every file you send"], scan: ["Point your phone", green, "the camera reads it"],
});
const elephant = `<svg viewBox="0 0 40 30" width="74" height="56"><g fill="currentColor"><ellipse cx="22" cy="14" rx="13" ry="9"/><circle cx="9" cy="11" r="7"/><path d="M4 13 C1 18 2 25 6 27 L8 26 C5 23 5 18 7 15 Z"/><rect x="12" y="19" width="4.5" height="9" rx="1.5"/><rect x="18" y="19" width="4.5" height="9" rx="1.5"/><rect x="25" y="19" width="4.5" height="9" rx="1.5"/><rect x="30" y="18" width="4.5" height="10" rx="1.5"/><path d="M34 10 q5 1 4 8" stroke="currentColor" stroke-width="1.5" fill="none"/></g><ellipse cx="12" cy="10" rx="4" ry="5.5" fill="rgba(0,0,0,.25)"/><circle cx="6.5" cy="9" r="1" fill="#0b0d10"/></svg>`;
hudEl("tons", `<div style="width:1080px;text-align:center"><div id="tnum" style="font:900 210px/0.85 D;font-stretch:112%;color:#ffd166;text-shadow:0 12px 50px rgba(0,0,0,.65)">660</div><div style="font:800 52px D;color:#fff;letter-spacing:.14em;margin-top:6px">TONNES</div></div>`, { left: "0px", top: "240px" });
hudEl("eleph", `<div style="width:900px;margin-left:90px;display:grid;grid-template-columns:repeat(10,1fr);gap:4px 6px;padding:22px;border-radius:26px;background:rgba(8,10,16,.72);border:1.5px solid rgba(255,209,102,.35)">${Array.from({ length: 100 }, (_, i) => `<div id="el${i}" style="color:#ffd166;opacity:.12">${elephant}</div>`).join("")}</div><div style="width:1080px;text-align:center;margin-top:14px;font:800 44px D;color:#fff">= 100 ELEPHANTS</div>`, { left: "0px", top: "1330px" });
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["OPENED", "2004"], ["HEIGHT", "508 m"], ["FLOORS", "101"]].map(([a, b], i) => `<div id="st${i}" style="padding:20px 28px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;color:#fff">${b}</div></div>`).join("")}</div>
  <div id="st3" style="width:1080px;text-align:center;margin-top:20px;font:800 40px D;color:#3dff8c;letter-spacing:.06em">TALLEST ON EARTH · 2004–2010</div>`, { left: "0px", top: "1420px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MOTION EXAGGERATED</div>`, { left: "330px", top: "1090px" });
hudEl("sick", `<div style="width:1080px;display:flex;justify-content:center;gap:20px">${[["TOWER", "SAFE", "#3dff8c"], ["TOP FLOORS", "SEASICK", "#ff9f6b"]].map(([a, b, c], i) => `<div id="sk${i}" style="padding:20px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;color:${c}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("wave", `<div style="width:920px;margin-left:80px;padding:22px 26px;border-radius:24px;background:rgba(8,10,16,.82);border:1.5px solid rgba(255,255,255,.18)">
  <div style="display:flex;gap:30px;font:700 26px M;letter-spacing:.14em"><span style="color:#5fd0c0">━ TOWER</span><span style="color:#ffd166">━ BALL</span><span id="wv_t" style="margin-left:auto;color:#9aa6b2">SAME RHYTHM</span></div>
  <svg width="868" height="220" viewBox="0 0 868 220" style="margin-top:10px"><line x1="0" y1="110" x2="868" y2="110" stroke="rgba(255,255,255,.15)" stroke-width="2"/><path id="wv_a" fill="none" stroke="#5fd0c0" stroke-width="7" stroke-linecap="round"/><path id="wv_b" fill="none" stroke="#ffd166" stroke-width="7" stroke-linecap="round"/></svg></div>`, { left: "0px", top: "1400px" });
hudEl("shock", `<div style="width:1080px;text-align:center"><span style="display:inline-block;padding:20px 32px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #6fb0ff;font:800 44px D;color:#fff">LIKE A CAR'S <span style="color:#6fb0ff">SHOCK ABSORBER</span></span></div>`, { left: "0px", top: "1440px" });
hudEl("heat", `<div style="width:1080px;text-align:center"><span style="display:inline-block;padding:20px 32px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #ffb03d;font:900 56px D;color:#fff">MOTION <span style="color:#ffb03d">→ HEAT</span></span></div>`, { left: "0px", top: "1440px" });
hudEl("forty", `<div style="width:1080px;text-align:center"><div id="ftn" style="font:900 230px/0.85 D;font-stretch:112%;color:#3dff8c;text-shadow:0 12px 50px rgba(0,0,0,.6)">−40%</div><div style="font:800 46px D;color:#fff;letter-spacing:.1em;margin-top:8px">SWAY AT THE TOP</div></div>`, { left: "0px", top: "260px" });
hudEl("cmp", `<div style="width:1080px;display:flex;justify-content:center;gap:20px">${[["WITHOUT", "#ff5a4a"], ["WITH THE BALL", "#3dff8c"]].map(([a, c], i) => `<div style="padding:18px 26px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${c};font:800 36px D;color:${c}">${a}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("ruler", `<div style="width:920px;margin-left:80px;padding:22px 30px;border-radius:24px;background:rgba(8,10,16,.84);border:1.5px solid rgba(255,209,102,.4)">
  <div style="display:flex;justify-content:space-between;font:700 26px M;letter-spacing:.16em;color:#9aa6b2"><span>BALL SWING</span><span id="rv" style="color:#ffd166;font:900 54px D">0 cm</span></div>
  <div style="position:relative;margin-top:16px;height:40px;border-radius:20px;background:rgba(255,255,255,.08)"><div id="rb" style="position:absolute;left:50%;top:0;height:100%;width:0;border-radius:20px;background:#ffd166"></div>${[0, 25, 50, 75, 100].map((v) => `<div style="position:absolute;left:${50 + v * 0.45}%;top:44px;font:700 20px M;color:#9aa6b2;transform:translateX(-50%)">${v}</div>`).join("")}</div><div style="height:26px"></div></div>`, { left: "0px", top: "1420px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["NO APP", "NO LOGIN", "NO CABLE"].map((s, i) => `<div id="oc${i}" style="padding:18px 26px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 40px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("timer", `<div id="tmr" style="width:1080px;text-align:center;font:800 130px M;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)">30:00</div>`, { left: "0px", top: "1440px" });

// ---------- motion helpers ----------
let swayNow = V(); // current tower top offset (x, z) in metres (visual)
function setSway(x, z = 0) { swayNow.set(x, 0, z); TU.uSway.value.set(x, z); INT.position.set(x * SWAY(BY), 0, z * SWAY(BY)); for (const o of SWAYERS) { const k = SWAY(o.userData.sy); o.position.set(o.userData.base.x + x * k, o.userData.base.y, o.userData.base.z + z * k); } }
let ballOff = V();
function setBall(dx, dz = 0, sinkWithTower = true) { // ball offset relative to the tower at its height (m); pendulum geometry
  const L = PIV - BY; ballOff.set(dx, 0, dz); INT.updateMatrixWorld(true);
  PEND.position.set(0, PIV, 0); PEND.rotation.set(Math.asin(clamp(dz / L, -0.5, 0.5)), 0, -Math.asin(clamp(dx / L, -0.5, 0.5)));
  PEND.updateMatrixWorld(true);
  for (const d of DAMP) { const bw = BALL.localToWorld(d.ballLocal.clone()), bp = INT.worldToLocal(bw.clone()), fp = d.floorP.clone(), fw = INT.localToWorld(fp.clone()); const dir = bp.clone().sub(fp).normalize(), side = V(-dir.z, 0, dir.x);
    d.bar.position.copy(fp); d.bar.lookAt(bw); d.rod.position.copy(bp); d.rod.lookAt(fw); d.rod.rotateY(Math.PI);
    d.e1.position.copy(fp); d.e1.lookAt(INT.localToWorld(fp.clone().add(side))); d.e2.position.copy(bp); d.e2.lookAt(INT.localToWorld(bp.clone().add(side))); } }
function plates(k) { PLATES.forEach((m, i) => { m.position.y = m.userData.y + (i - (NPL - 1) / 2) * 0.09 * k; }); }
const ballW = () => BALL.localToWorld(V(0, 0, 0));
function dayLook() { skyU.uStorm.value = 0; TU.uLight.value = 1; H.key.intensity = 3.0; H.hemi.intensity = 0.55; H.envK.value = 0.6; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.6; H.rimB.intensity = 0.3;
  H.key.position.copy(SUN.clone().multiplyScalar(1200)); H.key.target.position.set(0, 0, 0); }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const wiggle = (t, w = 1) => V(Math.sin(t * 1.1) * 0.03 * w, Math.sin(t * 0.83 + 1) * 0.02 * w, 0);
// tower sway in the wind (visual metres at the top, exaggerated ×20): period ≈ 7 s
const PER = 7.0, OM = TAU / PER;

let lastBg = null;
H.frame("Every file has its own QR", async (t) => {
  // ---- defaults
  dayLook(); camRange(1, 70000); skyU.uTime.value = t; skyU.uFlash.value = 0; TU.uFlash.value = 0; TU.uCut.value = 0; sky.visible = true; CITY.visible = true; tower.visible = true; ghost.visible = false; GU.uK.value = 0;
  for (const o of SWAYERS) o.visible = true; INT.visible = false; CUT.visible = false; EARTH.visible = false; OR.visible = false; A.root.visible = false; visPhone.g.visible = false; rain.visible = false;
  scene.background = null; H.zoom = 1; H.bloom.strength = 0.35; setSway(0); setBall(0); plates(0); H.grade.uniforms.uVig.value = 0.32; A.xray(0); A.setPose({});
  spotA.intensity = 140; spotB.intensity = 70; intFill.intensity = 18; LAMP.rotation.set(0, 0, 0);
  const inside = (open = true) => { INT.visible = true; tower.visible = false; for (const o of SWAYERS) o.visible = false; camRange(0.05, 70000); keyShadow(V(0, BY, 0), 30); H.envK.value = 0.32; H.bloom.strength = 0.18; H.key.intensity = 2.2; scene.fog.density = FOG.d * 0.6; };

  // ---- HOOK: fly in on the tower; the glass opens around 87F–92F and the golden ball glints inside → 660 t = 100 elephants
  if (t < at("tower")) {
    const tIn = fr("hook", 0.52);
    if (t < tIn) {
      keyShadow(V(0, 250, 0), 400); const k = prog(t, 0, tIn);
      TU.uCut.value = ease(prog(t, fr("hook", 0.12), fr("hook", 0.4))); setSway(0); setBall(0.4 * Math.sin(t * OM));
      move(t, 0, tIn, [V(260, 470, 820), V(0, 380, 0), 34], [V(18, 386, 62), V(0, BY, 0), 36], 0.5);
      title(t, fr("hook", 0.05), fr("hook", 0.35), "Taipei 101", "A golden ball", 150);
    } else {
      inside(); setBall(0.25 * Math.sin((t - tIn) * OM)); const B = ballW();
      move(t, tIn, at("tower"), [B.clone().add(V(13.5, -1.0, 9.5)), B.clone().add(V(0, 0.6, 0)), 44], [B.clone().add(V(10.5, -1.9, 7.2)), B.clone().add(V(0, 1.0, 0)), 40]);
      const tn = fr("hook", 0.6), te = fr("hook", 0.78);
      hudShow("tons", win(t, tn, end("hook") + 0.2), { transform: `scale(${lerp(1.25, 1, out(prog(t, tn, tn + 0.35)))})` }); H.$("tnum").textContent = String(Math.round(660 * ease(prog(t, tn, tn + 0.9))));
      hudShow("eleph", win(t, te, end("hook") + 0.2)); const ne = Math.round(100 * ease(prog(t, te, end("hook") - 0.2))); for (let i = 0; i < 100; i++) H.$("el" + i).style.opacity = i < ne ? 1 : 0.12;
    }
  }
  // ---- TOWER: the whole tower; 508 m, 2004, tallest on Earth
  else if (t < at("storms")) {
    keyShadow(V(0, 200, 0), 500); const k = prog(t, at("tower"), at("storms"));
    const a = 0.55 + k * 0.5; H.cam.up.set(0, 1, 0);
    move(t, at("tower"), at("storms"), [V(Math.sin(0.55) * 1150, 160, Math.cos(0.55) * 1150), V(0, 250, 0), 40], [V(Math.sin(1.05) * 980, 230, Math.cos(1.05) * 980), V(0, 265, 0), 40], 0.3);
    title(t, at("tower") + 0.1, fr("tower", 0.4), "Taiwan", "Taipei 101");
    callout("h508", t, fr("tower", 0.25), end("tower") + 0.2, V(0, 508, 0), 790, 430);
    hudShow("stats", win(t, fr("tower", 0.35), end("tower") + 0.2)); for (let i = 0; i < 4; i++) S2(H.$("st" + i), { opacity: win(t, fr("tower", 0.35 + i * 0.12), 999) });
  }
  // ---- STORMS: Earth: a typhoon spirals in on Taiwan, an earthquake rings out → the tower bends in the wind, like a tree
  else if (t < at("sick")) {
    const tT = fr("storms", 0.45);
    if (t < tT) {
      EARTH.visible = true; sky.visible = false; CITY.visible = false; tower.visible = false; for (const o of SWAYERS) o.visible = false; scene.background = new THREE.Color(0x000000); scene.fog.density = 0;
      const k = prog(t, at("storms"), tT); EU.t.value = t; EU.tyK.value = ease(prog(t, at("storms"), at("storms") + 0.8)); EU.ty.value.copy(TY0.clone().lerp(TW, ease(k) * 0.8).normalize());
      EU.quK.value = win(t, fr("storms", 0.24), tT + 0.2, 0.2, 0.2);
      const c = EARTH.position.clone(), p = TW.clone().multiplyScalar(ER);
      const up = V(0, 1, 0); H.cam.up.copy(up);
      move(t, at("storms"), tT, [c.clone().add(p.clone().multiplyScalar(4.2)), c.clone().add(p), 30], [c.clone().add(p.clone().multiplyScalar(3.3)), c.clone().add(p), 30], 0);
      title(t, fr("storms", 0.02), fr("storms", 0.22), "Every year", "Typhoons");
      callout("tw", t, at("storms") + 0.2, tT, c.clone().add(p), 800, 640); callout("tyc", t, at("storms") + 0.5, fr("storms", 0.26), c.clone().add(EU.ty.value.clone().multiplyScalar(ER)), 280, 1050);
      title(t, fr("storms", 0.24), tT, "And", "Earthquakes");
    } else {
      keyShadow(V(0, 200, 0), 500); const k = prog(t, tT, at("sick"));
      const amp = 14 * ease(prog(t, tT, tT + 1.5)); setSway(amp * Math.sin((t - tT) * OM * 1.6) , 0);
      move(t, tT, at("sick"), [V(-520, 40, 760), V(0, 300, 0), 42], [V(-640, 90, 640), V(0, 300, 0), 42], 0.3);
      weather(t, 160, 1.8, 6, false);
      hudShow("exag", win(t, tT + 0.3, end("storms") + 0.2));
      title(t, tT + 0.1, fr("storms", 0.75), "Tall towers", "Are built to bend");
    }
  }
  // ---- SICK: top floor, by the window: the lamp swings, the water tilts; you'd feel it → so they hung a pendulum
  else if (t < at("ball")) {
    inside(); const tP = fr("sick", 0.72), s = Math.sin((t - at("sick")) * OM);
    if (t < tP) {
      A.root.visible = true; A.root.position.set(-17.2, DECK, 8.9); A.root.rotation.y = -1.09; A.setPose({ elR: [-70, 0, 0], shR: [10, 0, -8], head: [8, 0, 6 * s], chest: [3, 0, 2 * s] });
      LAMP.rotation.set(0.06 * s, 0, 0.1 * s); GLASS.userData.water.rotation.set(-Math.PI / 2 + 0.12 * s, 0.08 * s, 0);
      const G0 = GLASS.position.clone().add(V(0, 0.07, 0)), tG = fr("sick", 0.36); if (t < tG) move(t, at("sick"), tG, [G0.clone().add(V(0.95, 0.35, 0.9)), G0.clone().add(V(-0.2, 0.25, -0.2)), 40], [G0.clone().add(V(0.8, 0.3, 0.75)), G0.clone().add(V(-0.25, 0.25, -0.25)), 38]); else { const C = V(-16.6, DECK + 1.3, 10.2); move(t, tG, tP, [C.clone().add(V(3.2, 0.5, 2.6)), C.clone().add(V(-0.8, 0.2, -0.6)), 40], [C.clone().add(V(2.6, 0.4, 2.0)), C.clone().add(V(-1.0, 0.1, -0.7)), 38]); }
      H.cam.rotation.z += 0.02 * s; // the room itself sways
      hudShow("sick", win(t, fr("sick", 0.05), tP)); S2(H.$("sk0"), { opacity: win(t, fr("sick", 0.05), 999) }); S2(H.$("sk1"), { opacity: win(t, fr("sick", 0.3), 999) });
    } else {
      setBall(0.2 * Math.sin(t * OM)); const B = ballW();
      move(t, tP, at("ball"), [B.clone().add(V(14, -1.2, 10)), B.clone().add(V(0, 1.2, 0)), 52], [B.clone().add(V(11, -1.6, 7.5)), B.clone().add(V(0, 1.6, 0)), 48]);
      title(t, tP + 0.05, end("sick") + 0.3, "So they hung", "A pendulum");
    }
  }
  // ---- BALL: 87F → 92F, 5.5 m, 41 plates (they fan apart like a coin stack, then close), 8 cables
  else if (t < at("trick")) {
    inside(); setBall(0.15 * Math.sin(t * OM)); const B = ballW();
    const ex = win(t, fr("ball", 0.42), fr("ball", 0.74), 0.7, 0.6); plates(ease(ex));
    if (t < fr("ball", 0.38)) move(t, at("ball"), fr("ball", 0.38), [B.clone().add(V(13, -3.8, 9)), B.clone().add(V(0, 2.5, 0)), 56], [B.clone().add(V(11, -2.6, 8)), B.clone().add(V(0, 2.0, 0)), 52]);
    else if (t < fr("ball", 0.76)) move(t, fr("ball", 0.38), fr("ball", 0.76), [B.clone().add(V(12.5, 0.6, 8.0)), B.clone().add(V(0, 0, 0)), 42], [B.clone().add(V(11, 1.0, 7.0)), B.clone().add(V(0, 0.1, 0)), 40]);
    else move(t, fr("ball", 0.76), at("trick"), [B.clone().add(V(4.8, 3.2, 4.2)), B.clone().add(V(0, 7, 0)), 44], [B.clone().add(V(4.2, 1.2, 4.6)), B.clone().add(V(0, 7.5, 0)), 46]);
    callout("f92", t, fr("ball", 0.02), fr("ball", 0.36), V(0, PIV + 0.4, 0), 760, 300);
    callout("f87", t, fr("ball", 0.08), fr("ball", 0.36), V(5.6 * Math.cos(Math.PI / 8), LOW + 0.5, 5.6 * Math.sin(Math.PI / 8)), 300, 1100);
    callout("wide", t, fr("ball", 0.24), fr("ball", 0.4), B.clone().add(V(2.75, 0, 0)), 820, 560);
    callout("plates", t, fr("ball", 0.46), fr("ball", 0.74), BALL.localToWorld(V(1.8, 1.0, 1.6)), 300, 520);
    callout("cables", t, fr("ball", 0.8), end("ball") + 0.2, PEND.localToWorld(V(Math.cos(Math.PI / 4) * 3.3, -4, Math.sin(Math.PI / 4) * 3.3)), 800, 460);
  }
  // ---- TRICK: x-ray tower; wind pushes it one way, the ball lags and swings the other way, pulling it back
  else if (t < at("tuned")) {
    keyShadow(V(0, 300, 0), 400); TU.uCut.value = 1; TU.uCutW.value = 15;
    const p1 = ease(prog(t, fr("trick", 0.2), fr("trick", 0.45))), p2 = ease(prog(t, fr("trick", 0.45), fr("trick", 0.7))), p3 = ease(prog(t, fr("trick", 0.68), fr("trick", 0.95)));
    const sx = 13 * p1 * (1 - p3 * 0.85); setSway(sx); setBall(-3.2 * p2 * (1 - p3 * 0.6));
    move(t, at("trick"), at("tuned"), [V(-40, 320, 300), V(0, BY - 6, 0), 36], [V(-20, 350, 220), V(6, BY - 2, 0), 34], 0.2);
    hudShow("exag", win(t, at("trick") + 0.2, end("trick")));
    const bw = ballW();
    callout("wind", t, fr("trick", 0.12), fr("trick", 0.5), V(-26 + sx * SWAY(BY + 20), BY + 20, 18), 260, 380);
    callout("lag", t, fr("trick", 0.45), fr("trick", 0.78), bw, 300, 1080);
    callout("pull", t, fr("trick", 0.7), end("trick") + 0.2, PEND.localToWorld(V(0, -4, 0)), 790, 420);
    if (t < fr("trick", 0.45)) { // wind streaks hitting the left face
      weather(t, 120, 6, 9, true); rain.material.opacity = 0.22 * win(t, fr("trick", 0.1), fr("trick", 0.5)); }
  }
  // ---- TUNED: same rhythm: tower and ball in step, every push answered by a pull (scope trace)
  else if (t < at("pistons")) {
    inside(); const tt = t - at("tuned"), sw = Math.sin(tt * OM * 1.4); setBall(-0.7 * sw); const B = ballW();
    move(t, at("tuned"), at("pistons"), [B.clone().add(V(0.5, -1.6, 11.5)), B.clone().add(V(0, 0.4, 0)), 44], [B.clone().add(V(-2.8, -1.2, 9.8)), B.clone().add(V(0, 0.6, 0)), 42]);
    hudShow("wave", win(t, at("tuned") + 0.2, end("tuned") + 0.2));
    const pts = (ph, amp) => { let d = ""; for (let x = 0; x <= 868; x += 8) { const u = x / 868 * 3.2 * Math.PI + tt * OM * 1.4 + ph; d += `${x ? "L" : "M"}${x},${(110 - Math.sin(u) * amp).toFixed(1)}`; } return d; };
    H.$("wv_a").setAttribute("d", pts(0, 80)); H.$("wv_b").setAttribute("d", pts(Math.PI, 80 * ease(prog(t, at("tuned"), fr("tuned", 0.4)))));
    title(t, at("tuned") + 0.1, fr("tuned", 0.5), "Tuned", "To the tower");
  }
  // ---- PISTONS: the 8 dampers under the ball → cutaway: oil forced through holes in the piston gets hot; the sway fades
  else if (t < at("forty")) {
    const tC = fr("pistons", 0.32);
    if (t < tC) {
      inside(); const tt = t - at("pistons"); setBall(-0.9 * Math.sin(tt * OM * 1.4)); const B = ballW();
      move(t, at("pistons"), tC, [V(7.2, LOW + 1.6, 6.2), V(0, LOW + 1.4, 0), 50], [V(6.0, LOW + 1.2, 4.8), V(0.5, LOW + 1.2, 0.5), 46]);
      callout("piston", t, at("pistons") + 0.2, tC, DAMP[0].bar.position.clone().lerp(DAMP[0].rod.position, 0.4), 790, 520);
      hudShow("shock", win(t, fr("pistons", 0.12), tC + 0.2));
    } else {
      CITY.visible = false; tower.visible = false; for (const o of SWAYERS) o.visible = false; sky.visible = false; scene.background = new THREE.Color(0x0b0d10); CUT.visible = true; camRange(0.02, 3000);
      H.envK.value = 1.0; keyShadow(CUT.position, 6); scene.fog.density = 0;
      const tt = t - tC, decay = Math.exp(-tt * 0.22), x = 0.6 * Math.sin(tt * 2.2) * decay; pistonG.position.x = x;
      oilU.uT.value = t; oilU.uHeat.value = clamp(prog(t, tC + 0.5, end("pistons")) * 1.2);
      const m4 = new THREE.Matrix4(), vx = Math.cos(tt * 2.2) * decay;
      JP.forEach((p, i) => { const a = p.h / 6 * TAU, u = (p.d + tt * 1.8) % 1; const s = Math.abs(vx) > 0.08 ? 1 : 0; m4.makeScale(s, s, s).setPosition(x - Math.sign(vx) * (u * 0.9 - 0.1), Math.cos(a) * 0.2 + (p.s - 0.5) * 0.06 * u, Math.sin(a) * 0.2 + (p.s - 0.5) * 0.06 * u); jets.setMatrixAt(i, m4); }); jets.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < NHt; i++) { const u = ((i / NHt) + tt * 0.25) % 1, hk = oilU.uHeat.value; m4.makeScale(1 + u * 0.8, 1 + u * 0.8, 1 + u * 0.8).setPosition((i % 7 - 3) * 0.45, u * 1.2, 0); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); m4.compose(V((i % 7 - 3) * 0.45, 0.42 + u * 1.0, 0), q, V(hk * (0.6 + u), hk * (0.6 + u), hk * (0.6 + u))); heatR.setMatrixAt(i, m4); } heatR.instanceMatrix.needsUpdate = true;
      const C = CUT.position.clone(); move(t, tC, at("forty"), [C.clone().add(V(-1.4, 1.5, -4.6)), C.clone().add(V(0.4, -0.1, 0)), 36], [C.clone().add(V(-0.6, 1.2, -3.9)), C.clone().add(V(0.3, -0.05, 0)), 34], 0);
      callout("oil", t, tC + 0.4, fr("pistons", 0.75), CUT.localToWorld(V(-0.6, 0.15, 0)), 300, 1080);
      hudShow("heat", win(t, fr("pistons", 0.62), end("pistons") + 0.2));
    }
  }
  // ---- FORTY: the tower with a red ghost of itself (without the damper): up to 40% less sway at the top
  else if (t < at("soudelor")) {
    keyShadow(V(0, 250, 0), 450); const tt = t - at("forty"), s = Math.sin(tt * OM * 1.4);
    const amp = 16; setSway(amp * 0.6 * s); ghost.visible = true; GU.uSway.value.set(amp * s, 0); GU.uK.value = win(t, at("forty") + 0.2, end("forty") + 0.3);
    move(t, at("forty"), at("soudelor"), [V(0, 170, 980), V(0, 300, 0), 40], [V(120, 200, 860), V(0, 310, 0), 40], 0.2);
    hudShow("forty", win(t, fr("forty", 0.15), end("forty") + 0.3), { transform: `scale(${lerp(1.3, 1, out(prog(t, fr("forty", 0.15), fr("forty", 0.4))))})` });
    hudShow("cmp", win(t, at("forty") + 0.2, end("forty") + 0.3)); hudShow("exag", win(t, at("forty") + 0.2, end("forty")), { top: "1560px" });
  }
  // ---- SOUDELOR 2015: a typhoon at night; rain, wind, lightning; inside, the ball swings a full metre; the tower held
  else if (t < at("visit")) {
    const tI = fr("soudelor", 0.42), fl = Math.max(0, 1 - Math.abs(t - fr("soudelor", 0.2)) * 6, 1 - Math.abs(t - fr("soudelor", 0.33)) * 7);
    skyU.uStorm.value = 1; skyU.uFlash.value = fl; TU.uLight.value = 0.32 + fl * 0.8; TU.uFlash.value = fl; H.key.intensity = 0.4 + fl * 3; H.hemi.intensity = 0.15; scene.fog.color.set(0x2a2f36); scene.fog.density = 0.00042; H.envK.value = 0.25;
    if (t < tI) {
      keyShadow(V(0, 250, 0), 500); const tt = t - at("soudelor"); setSway(16 * Math.sin(tt * OM * 1.5) * ease(prog(t, at("soudelor"), at("soudelor") + 1)));
      move(t, at("soudelor"), tI, [V(-380, 140, 560), V(0, 320, 0), 40], [V(-300, 220, 440), V(0, 360, 0), 40], 0.6);
      weather(t, 90, 1.6, 6, true); rain.material.opacity = 0.07;
      title(t, at("soudelor") + 0.1, fr("soudelor", 0.38), "August 2015", "Typhoon Soudelor");
      flash(t, fr("soudelor", 0.2), 0.35, 4, "#dfe8ff");
    } else {
      inside(); spotA.intensity = 90; spotB.intensity = 40; intFill.intensity = 10; scene.fog.density = 0.0006; const tt = t - tI, sw = Math.sin(tt * OM * 1.5); const amp = ease(prog(t, tI, tI + 2.5));
      setBall(1.0 * amp * sw); const B = ballW();
      move(t, tI, at("visit"), [V(0, DECK + 1.6, 16), V(0, BY - 0.5, 0), 48], [V(1.5, DECK + 1.2, 13.5), V(0, BY - 0.3, 0), 46], 0.4);
      hudShow("ruler", win(t, tI + 0.3, end("soudelor") + 0.2)); const cm = Math.round(Math.abs(100 * amp * sw)); H.$("rv").textContent = `${cm} cm`;
      S2(H.$("rb"), { width: `${Math.abs(45 * amp * sw)}%`, left: sw >= 0 ? "50%" : `${50 - Math.abs(45 * amp * sw)}%` });
      title(t, fr("soudelor", 0.86), end("soudelor") + 0.3, "And the tower", "Held");
    }
  }
  // ---- VISIT: daylight, the deck: a visitor films it swinging gently
  else if (t < at("orbi")) {
    inside(); const tt = t - at("visit"); setBall(0.35 * Math.sin(tt * OM));
    A.root.visible = true; const a = 0.9; A.root.position.set(Math.cos(a) * 8.5, DECK, Math.sin(a) * 8.5); A.root.rotation.y = -a - Math.PI / 2 + Math.PI; A.root.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    A.setPose({ shR: [-55, 0, -12], elR: [-75, 0, 0], shL: [0, 0, 6], head: [-6, 0, 0] });
    visPhone.g.visible = false; visPhone.g.position.copy(A.at(V(-0.2, 1.42, 0.32))); visPhone.g.lookAt(ballW()); visPhone.g.rotateY(Math.PI);
    const B = ballW(), P = A.root.position.clone(), oc = V(Math.cos(a), 0, Math.sin(a)), sd = V(-Math.sin(a), 0, Math.cos(a));
    move(t, at("visit"), at("orbi"), [P.clone().addScaledVector(oc, 2.4).addScaledVector(sd, -0.7).add(V(0, 2.2, 0)), B.clone().add(V(0, -1.4, 0)), 50], [P.clone().addScaledVector(oc, 1.9).addScaledVector(sd, -0.5).add(V(0, 2.05, 0)), B.clone().add(V(0, -1.2, 0)), 48]);
    title(t, at("visit") + 0.1, end("visit"), "Open to visitors", "Go see it");
  }
  // ---- ORBI: on the deck ledge, the ball behind: a laptop shows a file's QR; the phone points at it; the file lands; locked; burns
  else {
    inside(); setBall(0.25 * Math.sin(t * OM)); OR.visible = true; OR.position.set(-10.5, DECK + 1.0, 7.2); OR.rotation.y = 2.4 + Math.PI; OR.scale.setScalar(0.105); OR.updateMatrixWorld(true);
    const W = (x, y, z) => OR.localToWorld(V(x, y, z));
    lap.g.position.set(0.6, -0.08, 0.4); lap.g.rotation.set(0, 0, 0); lap.lid.rotation.x = -0.25;
    const tQR = fr("orbi2", 0.05), tAim = fr("orbi2", 0.38), tLand = fr("orbi2", 0.72), tLock = fr("orbi3", 0.35), tBurn = fr("orbi3", 0.78);
    const aim = ease(prog(t, tAim - 0.6, tAim + 0.3));
    ph.g.position.set(lerp(-2.6, -0.4, aim), lerp(0.6, 1.6, aim) + Math.sin(t * 1.3) * 0.02, lerp(1.6, 3.6, aim)); ph.g.rotation.set(lerp(-1.2, -0.12, aim), lerp(0.4, 0.15, aim), Math.sin(t * 0.9) * 0.02);
    if (t > tLand) { const k = ease(prog(t, tLand, tLand + 0.8)); ph.g.position.set(lerp(-0.4, -1.6, k), lerp(1.6, 1.7, k), lerp(3.6, 4.3, k)); ph.g.rotation.set(lerp(-0.12, 0.05, k), lerp(0.15, -0.55, k), 0); }
    // the camera (ours): over the shoulder of the phone, the laptop + the golden ball behind
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [W(-3.6, 2.4, 8.5), W(0.6, 0.8, 0), 40], [W(-2.8, 2.0, 7.2), W(0.6, 0.8, 0), 38]);
    else if (t < tLand) move(t, at("orbi2"), tLand, [W(-1.8, 2.6, 7.4), W(0.4, 1.0, 1.5), 36], [W(-1.2, 2.3, 6.6), W(0.1, 1.0, 2.6), 34]);
    else move(t, tLand, at("end"), [W(-3.4, 2.6, 6.8), W(-1.0, 1.4, 2.6), 34], [W(-3.0, 2.4, 6.0), W(-1.2, 1.4, 2.6), 32]);
    const burnLeft = t > tBurn ? Math.round(1800 * (1 - ease(prog(t, tBurn, tBurn + 1.4)))) : 1800; const bt = `${String(Math.floor(burnLeft / 60)).padStart(2, "0")}:${String(burnLeft % 60).padStart(2, "0")}`;
    const burnK = prog(t, tBurn + 0.6, tBurn + 1.8);
    screen(lap, { share: t > tQR, hl: win(t, tQR + 0.3, tLand, 0.3, 0.4), burn: t > tLock ? `BURNS IN ${bt}` : null }, drawLap);
    screen(ph, t < tLand + 0.2 ? { mode: "cam", zoom: aim, wob: Math.sin(t * 2), lockK: clamp((t - tAim - 0.3) / 0.3), pill: clamp((t - tAim - 0.6) / 0.3) } : { mode: "obj", land: clamp((t - tLand - 0.2) / 0.5) * (1 - burnK), burn: t > tLock ? `BURNS IN ${bt}` : null }, drawPhone);
    lock.position.copy(OR.worldToLocal(ph.g.localToWorld(V(0, 0.15, 0.3)))); const lk = win(t, tLock - 0.3, tBurn); lock.scale.setScalar(Math.max(0.001, lk * 0.45 * lerp(1.3, 1, out(prog(t, tLock - 0.3, tLock + 0.2))))); orbiL.position.copy(lock.position); orbiL.intensity = lk * 2;
    embers.userData.burn(burnK > 0 ? clamp(burnK * 2) * (1 - clamp((burnK - 0.6) / 0.4)) : 0, t, (x, y) => OR.worldToLocal(ph.g.localToWorld(V(x * 0.7, y * 1.5, 0.1))));
    title(t, at("orbi") + 0.1, at("orbi2"), "Orbi Transfer", "Big things, made simple");
    callout("qr", t, tQR + 0.3, tAim, lap.lid.localToWorld(V(-0.5, 1.0, 0.05)), 790, 420);
    callout("scan", t, tAim, tLand, ph.g.localToWorld(V(0, 0, 0.05)), 300, 470);
    hudShow("chips", win(t, at("orbi3"), tBurn)); for (let i = 0; i < 3; i++) S2(H.$("oc" + i), { opacity: win(t, at("orbi3") + i * 0.35, 999) });
    hudShow("timer", win(t, tBurn, at("end") - 0.1)); H.$("tmr").textContent = bt; S2(H.$("tmr"), { color: burnLeft < 300 ? "#ff5a36" : "#fff" });
    title(t, tLock - 0.2, tBurn, "Locked before it leaves", "Then it burns", 150);
  }
  TU.uFogC.value.copy(scene.fog.color); TU.uFogD.value = scene.fog.density; TU.uStorm.value = skyU.uStorm.value;
  if (TU.uCut.value > 0 && tower.visible) { INT.visible = true; spotA.intensity = 600; intFill.intensity = 80; }
});
await H.ready();
