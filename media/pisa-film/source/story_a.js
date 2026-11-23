// Do you know engineers saved the Leaning Tower of Pisa by digging soil out from under it? HD film on kit/hd.js (9:16).
// Real scale (metres, Wikipedia): 55.86 m on the low side / 56.67 m on the high side, outer diameter 15.48 m and inner
// diameter 7.37 m at the base, 8 storeys, 294/296 steps; a ground storey of blind arcades, six open galleries
// (30 columns each), the belfry. Foundation: a 3 m deep ring on soft ground (sandy/clayey silts over soft marine clay).
// Story: begun 1173, sinking by 1178 (2nd floor), a century's pause let the soil settle, upper floors built taller
// on one side (the tower is curved), lean growing until it closed in 1990, 870 t of lead on the high side (1993), cables
// round the 3rd level, slanted drills removing 38 m³ of soil under the high side, back 45 cm to its 1838 position.
// Piazza dei Miracoli at sunset (Poly Haven "Belfast sunset" sky, CC0): the cathedral's apse, the baptistery, the walls.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { makePhone, makeLaptop, makeLock, makeEmbers, screen, green, rr, img } from "./kit/orbiset.js";
import { loadAnatomy, standardLayers } from "./kit/anatomy.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2, D2R = Math.PI / 180;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }

// ---------- sunset sky (Poly Haven "Belfast sunset (pure sky)", CC0: sun at u 0.574, 10.5° up) + drifting clouds ----------
const SKY_ROT = -1.733;   // turn the sky so the sun sets in the west-south-west (behind the cathedral side)
const SUN = (() => { const a = (0.5745 - 0.5) * TAU + SKY_ROT, e = 10.5 * D2R; return V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).normalize(); })();
H.key.color.set(0xffc890); H.hemi.color.set(0xb9c8e6); H.hemi.groundColor.set(0x4a4232);
const FOG = { c: new THREE.Color(0xc9b8a6), d: 0.0004 };
scene.fog = new THREE.FogExp2(FOG.c.getHex(), FOG.d);
const skyTex = tex("kit/ph/belfast_sunset_puresky/sky_4k.jpg", true); skyTex.repeat.set(1, 1);
const skyU = { uSky: { value: skyTex }, uSun: { value: SUN }, uT: { value: 0 }, uDim: { value: 1 }, uRot: { value: SKY_ROT } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun; uniform float uT, uDim, uRot; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
    void main(){ vec3 d = normalize(vD); vec2 uv = vec2(fract((atan(d.z, d.x) - uRot) / 6.2831853 + 0.5), asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
      vec3 c = texture2D(uSky, uv).rgb; if (d.y < 0.0) c = vec3(0.5, 0.45, 0.4);
      if (d.y > 0.0) { vec2 q = d.xz / (d.y + 0.1) * 1.4 + vec2(uT * 0.006, uT * 0.002); float w = fbm(q * 0.8); float cl = fbm(q + w * 1.3);
        float cov = smoothstep(0.6, 0.82, cl) * smoothstep(0.0, 0.2, d.y); float sh = smoothstep(0.55, 0.85, fbm(q + w * 1.3 + uSun.xz * 0.08));
        float sd = max(dot(d, uSun), 0.0); vec3 cc = mix(vec3(1.0, 0.8, 0.62), vec3(0.78, 0.64, 0.66), sh * 0.6) * (0.85 + 0.6 * pow(sd, 4.0));
        c = mix(c, cc, cov * 0.8); }
      c += vec3(1.0, 0.75, 0.45) * pow(max(dot(d, uSun), 0.0), 1400.0) * 4.0;
      gl_FragColor = vec4(c * uDim, 1.0); }` }));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// =====================================================================================================================
// PIAZZA DEI MIRACOLI: the lawn, marble paths, the cathedral (apse towards the tower), the baptistery, the city walls
// tower at the origin; it leans to +x (south); the cathedral lies to the west (-z here), the walls to the north (+x … no: -x)
// =====================================================================================================================
const WORLD = new THREE.Group(); scene.add(WORLD);
const gT = (n, srgb, r) => tex(`kit/ph/grass_ground/grass_ground_${n}_1k.jpg`, srgb, r, r);
const lawnMat = new THREE.MeshStandardMaterial({ map: gT("diff", true, 120), normalMap: gT("nor_gl", false, 120), roughness: 1, color: 0x9fbf78 });
const lawn = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), lawnMat); lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; WORLD.add(lawn);
const mbT = (n, srgb, r1, r2 = r1) => tex(`kit/ph/marble_01/marble_01_${n}_1k.jpg`, srgb, r1, r2);
const pathMat = new THREE.MeshStandardMaterial({ map: mbT("diff", true, 40, 4), roughness: 0.6, color: 0xe2dccf });
for (const [x, z, w, d] of [[0, -150, 14, 420], [-60, -30, 120, 10], [0, 40, 60, 16]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.04, z); p.receiveShadow = true; WORLD.add(p); }
// marble: Poly Haven "marble_01" (CC0), weathered: darker at the base, grime under every ledge
const marbleMat = new THREE.MeshStandardMaterial({ map: mbT("diff", true, 2, 2), normalMap: mbT("nor_gl", false, 2, 2), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.55, color: 0xf2ece0 });
const CLIP = new THREE.Plane(V(0, 0, 1), 0);   // keeps z ≥ 0: the camera looks at the cut from the west, the sun behind it const CLIPS = [];   // the section cut (z = 0), on only in the cross-section shots
marbleMat.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWm;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWm = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWm;").replace("#include <map_fragment>", `#include <map_fragment>
    { float y = vWm.y; diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(0.0, 6.0, y)); float st = fract(y / 6.25 + 0.15); diffuseColor.rgb *= 1.0 - 0.12 * smoothstep(0.8, 1.0, st) * (0.6 + 0.4 * sin(vWm.x * 3.1 + vWm.z * 2.3)); }`); };
marbleMat.customProgramCacheKey = () => "pisa-marble";
const darkMat = matte(0x15120f, 0.95);

// ---------- the cathedral (Duomo): nave + aisles + transept + elliptical dome on a drum, apse to the east (towards the tower)
// Pisan Romanesque: white marble with grey bands, blind arcades; lead-grey roofs
const duomoMat = new THREE.MeshStandardMaterial({ map: mbT("diff", true, 6, 3), roughness: 0.6, color: 0xf1eadc });
duomoMat.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWd;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWd = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWd;").replace("#include <map_fragment>", `#include <map_fragment>
    { float b = step(0.82, fract(vWd.y / 1.1)); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.64, 0.66), b * 0.8);
      float u = abs(vWd.x) > abs(vWd.z) ? vWd.z : vWd.x; float ar = fract(u / 4.2); float yy = fract(vWd.y / 9.0);
      float blind = step(0.18, ar) * step(ar, 0.82) * step(0.12, yy) * step(yy, 0.88 - 0.25 * pow(abs(ar - 0.5) * 2.0, 2.0));
      diffuseColor.rgb *= 1.0 - 0.18 * blind; }`); };
duomoMat.customProgramCacheKey = () => "pisa-duomo";
const roofMat = new THREE.MeshStandardMaterial({ color: 0x8c9096, roughness: 0.45, metalness: 0.35 });
const gable = (L, W, Hh) => { const s = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, Hh)]); const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); g.translate(0, 0, -L / 2); return g; };
const DUOMO = new THREE.Group(); DUOMO.position.set(0, 0, -62); WORLD.add(DUOMO);   // east end (apse) 62 m west of the tower
{ const B = (w, h, d, x, y, z, m = duomoMat) => { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); b.position.set(x, y + h / 2, z); DUOMO.add(b); return b; };
  B(15, 32, 96, 0, 0, -56); B(9, 20, 96, -12, 0, -56); B(9, 20, 96, 12, 0, -56); B(9, 13, 96, -21, 0, -56); B(9, 13, 96, 21, 0, -56);   // nave, double aisles
  B(72, 30, 14, 0, 0, -38);                                                                                                         // transept
  const r1 = sh(new THREE.Mesh(gable(96, 16, 5), roofMat)); r1.position.set(0, 32, -56); DUOMO.add(r1);
  const r2 = sh(new THREE.Mesh(gable(14, 72, 4), roofMat)); r2.rotation.y = Math.PI / 2; r2.position.set(0, 30, -38); DUOMO.add(r2);
  for (const s of [-1, 1]) { const r = sh(new THREE.Mesh(gable(96, 18, 2.5), roofMat)); r.position.set(s * 14, 20, -56); r.scale.x = 1; DUOMO.add(r); }
  const drum = sh(new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 8, 32), duomoMat)); drum.position.set(0, 36, -38); drum.scale.z = 1.25; DUOMO.add(drum);
  const dome = sh(new THREE.Mesh(new THREE.SphereGeometry(9.6, 32, 16, 0, TAU, 0, Math.PI / 2), roofMat)); dome.position.set(0, 40, -38); dome.scale.set(1, 1.05, 1.25); DUOMO.add(dome);
  const apse = sh(new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 30, 32, 1, false, 0, Math.PI), duomoMat)); apse.position.set(0, 15, -8); apse.rotation.y = -Math.PI / 2; DUOMO.add(apse);
  const apR = sh(new THREE.Mesh(new THREE.SphereGeometry(8.6, 32, 12, 0, Math.PI, 0, Math.PI / 2), roofMat)); apR.position.set(0, 30, -8); apR.rotation.y = -Math.PI / 2; apR.scale.y = 0.45; DUOMO.add(apR); }
// the baptistery (round, 107 m around, dome to ~55 m), far to the west
const BAPT = new THREE.Group(); { const bp = BAPT; bp.position.set(0, 0, -260); WORLD.add(bp);
  const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(17.5, 17.8, 30, 64), duomoMat)); c.position.y = 15; bp.add(c);
  const c2 = sh(new THREE.Mesh(new THREE.CylinderGeometry(15.5, 17, 10, 64), duomoMat)); c2.position.y = 35; bp.add(c2);
  const d = sh(new THREE.Mesh(new THREE.SphereGeometry(15.5, 48, 16, 0, TAU, 0, Math.PI / 2), roofMat)); d.position.y = 40; d.scale.y = 0.85; bp.add(d);
  const cone = sh(new THREE.Mesh(new THREE.ConeGeometry(7, 9, 32), new THREE.MeshStandardMaterial({ color: 0xb55c3c, roughness: 0.8 }))); cone.position.y = 52; bp.add(cone); }
// the medieval city walls to the north (-x), brick with merlons
{ const wallM = new THREE.MeshStandardMaterial({ map: tex("kit/ph/clay_roof_tiles/clay_roof_tiles_diff_1k.jpg", true, 60, 2), color: 0xc08a68, roughness: 0.95 });
  const w = sh(new THREE.Mesh(new THREE.BoxGeometry(3.5, 11, 700), wallM)); w.position.set(-130, 5.5, -100); WORLD.add(w);
  const mg = new THREE.InstancedMesh(new THREE.BoxGeometry(3.5, 1.6, 1.4), wallM, 240); const m4 = new THREE.Matrix4(); for (let i = 0; i < 240; i++) mg.setMatrixAt(i, m4.makeTranslation(-130, 11.8, -450 + i * 2.95)); mg.castShadow = true; WORLD.add(mg); }
// umbrella pines and cypresses, beyond the walls and along the edge
{ const pg = new THREE.SphereGeometry(1, 16, 10); pg.scale(1, 0.45, 1); const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.12 * Math.sin(v.x * 9 + v.z * 7); p.setXYZ(i, v.x * k, v.y, v.z * k); } pg.computeVertexNormals();
  const N = 120, im = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0x3f5530, roughness: 1, map: gT("diff", true, 2) }), N), tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.5, 1, 8), matte(0x4a3828, 0.9), N); const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { const x = -150 - hash(i) * 400, z = -500 + hash(i + 1) * 900, s = 7 + hash(i + 2) * 5, h = 10 + hash(i + 3) * 6; im.setMatrixAt(i, m4.makeScale(s, s, s).setPosition(x, h, z)); tr.setMatrixAt(i, m4.makeScale(1, h, 1).setPosition(x, h / 2, z)); }
  im.castShadow = true; WORLD.add(im, tr); }

// =====================================================================================================================
// THE TOWER: a chain of storeys (each one can be counter-tilted: the upper floors were built taller on the low side)
// =====================================================================================================================
const R_IN = 3.68, R_BASE = 7.74, R_GAL = 6.1, R_COL = 7.45;
const SH = [11.4, 6.25, 6.25, 6.25, 6.25, 6.25, 6.25, 7.0];   // storey heights: ground, six galleries, belfry → 55.9 m
const COUNTER = [0, 0, 0, 0.12, 0.22, 0.32, 0.42, 0.55];      // degrees: each upper storey leaned back a little (the "banana")
const annulus = (rIn, rOut, h, seg = 64) => { const pts = [new THREE.Vector2(rIn, 0), new THREE.Vector2(rOut, 0), new THREE.Vector2(rOut, h), new THREE.Vector2(rIn, h), new THREE.Vector2(rIn, 0)]; return new THREE.LatheGeometry(pts, seg); };
const TW = new THREE.Group(); scene.add(TW);           // pivot at the foundation centre; rotation.z = -tilt (leans to +x)
const ST = [];
function addRing(g, rIn, rOut, y, h) { const m = sh(new THREE.Mesh(annulus(rIn, rOut, h), marbleMat)); m.position.y = y; g.add(m); return m; }
function colonnade(g, n, r, y0, hCol, rc, archR) {
  const col = new THREE.InstancedMesh(new THREE.CylinderGeometry(rc * 0.9, rc, hCol, 14), marbleMat, n), cap = new THREE.InstancedMesh(new THREE.BoxGeometry(rc * 2.6, 0.32, rc * 2.6), marbleMat, n), base = new THREE.InstancedMesh(new THREE.CylinderGeometry(rc * 1.3, rc * 1.4, 0.25, 14), marbleMat, n);
  const arch = new THREE.InstancedMesh(new THREE.TorusGeometry(archR, 0.2, 8, 20, Math.PI), marbleMat, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r; col.setMatrixAt(i, m4.makeTranslation(x, y0 + hCol / 2, z)); cap.setMatrixAt(i, m4.makeTranslation(x, y0 + hCol + 0.16, z)); base.setMatrixAt(i, m4.makeTranslation(x, y0 + 0.12, z));
    const am = (i + 0.5) / n * TAU; q.setFromAxisAngle(V(0, 1, 0), -am + Math.PI / 2); m4.compose(V(Math.cos(am) * r, y0 + hCol + 0.32, Math.sin(am) * r), q, V(1, 1, 1)); arch.setMatrixAt(i, m4); }
  for (const m of [col, cap, base, arch]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; g.add(m); } }
let parent = TW, y0 = 0;
for (let k = 0; k < 8; k++) {
  const g = new THREE.Group(); g.position.y = k === 0 ? 0 : SH[k - 1]; g.rotation.z = (COUNTER[k] - (k ? COUNTER[k - 1] : 0)) * D2R; parent.add(g); ST.push(g); parent = g; const h = SH[k];
  if (k === 0) { addRing(g, R_IN, R_BASE + 0.5, 0, 0.5); addRing(g, R_IN, R_BASE + 0.25, 0.5, 0.45); addRing(g, R_IN, R_BASE, 0.95, h - 1.6);   // plinth steps + the 4 m wall
    colonnade(g, 15, R_BASE + 0.12, 0.95, 7.6, 0.36, (TAU * R_BASE / 15) / 2 - 0.25);
    addRing(g, R_IN, R_BASE + 0.12, 0.95 + 7.6 + 0.32, h - 1.6 - 7.92);                                                        // band above the blind arches
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 0.4), darkMat); door.position.set(0, 3.1, R_BASE + 0.05); g.add(door);
    addRing(g, R_IN, R_BASE + 0.55, h - 0.65, 0.65); }                                                                           // first cornice
  else if (k < 7) { addRing(g, R_IN, R_GAL, 0, h); addRing(g, R_IN, R_BASE + 0.25, 0, 0.5);                                     // inner wall + gallery floor
    colonnade(g, 30, R_COL, 0.5, 4.0, 0.26, (TAU * R_COL / 30) / 2 - 0.1);
    addRing(g, R_IN, R_BASE, 5.25, h - 5.25 - 0.5); addRing(g, R_IN, R_BASE + 0.4, h - 0.5, 0.5);                               // band over the arches + cornice
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + k; const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.3), darkMat); w.position.set(Math.cos(a) * (R_GAL + 0.02), 2.6, Math.sin(a) * (R_GAL + 0.02)); w.rotation.y = -a + Math.PI / 2; g.add(w); } }
  else { addRing(g, 4.0, 5.4, 0, h - 0.6); addRing(g, 4.0, 6.0, 0, 0.45); addRing(g, 4.0, 5.7, h - 0.6, 0.6);                    // belfry
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const o = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.6, 0.6), darkMat); o.position.set(Math.cos(a) * 5.3, 3.1, Math.sin(a) * 5.3); o.rotation.y = -a + Math.PI / 2; g.add(o);
      const ar = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.18, 8, 16, Math.PI), marbleMat); ar.position.set(Math.cos(a) * 5.45, 4.9, Math.sin(a) * 5.45); ar.rotation.y = -a + Math.PI / 2; g.add(ar); }
    colonnade(g, 12, 5.7, 0.45, 4.2, 0.2, (TAU * 5.7 / 12) / 2 - 0.1);
    const bell = sh(new THREE.Mesh(new THREE.LatheGeometry([[0, 2.4], [0.5, 2.3], [0.8, 1.6], [1.0, 0.6], [1.25, 0.1], [1.2, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 32), metal(0x7a5a32, 0.45))); bell.position.y = 1.4; g.add(bell); }
  y0 += h; }
// the hollow core: a spiral stair of 294 steps (seen in the section)
{ const stepG = new THREE.BoxGeometry(1.1, 0.19, 0.45); const N = 294, im = new THREE.InstancedMesh(stepG, marbleMat, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) { const a = i * 0.21, y = i * 0.17 + 0.3; q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(Math.cos(a) * (R_IN + 0.9), y, Math.sin(a) * (R_IN + 0.9)), q, V(1, 1, 1)); im.setMatrixAt(i, m4); }
  im.castShadow = true; TW.add(im); }
const TOWER_H = SH.reduce((a, b) => a + b, 0);
// the foundation: an annular ring 19.6 m across and 3 m deep (Gherardesca's 1838 walkway "catino" around the base)
const FOUND = sh(new THREE.Mesh(annulus(4.5, 9.8, 3.0), new THREE.MeshStandardMaterial({ color: 0x9c9284, roughness: 0.9 }))); FOUND.position.y = -3.0; TW.add(FOUND);
{ const cat = sh(new THREE.Mesh(annulus(10.6, 11.2, 0.7), marbleMat)); WORLD.add(cat); }
/** tilt the tower about the foundation (deg toward +x), with the storeys' counter-tilt scaled by `curveK` (1 = real) and built up to `upto` storeys */
function setTower(tiltDeg, curveK = 1, upto = 8, dropY = 0) { TW.rotation.z = -tiltDeg * D2R; TW.position.y = dropY;
  ST.forEach((g, k) => { g.rotation.z = (COUNTER[k] - (k ? COUNTER[k - 1] : 0)) * curveK * D2R; g.visible = k < upto; }); }
/** world position of a point on the tower axis at height y (follows the chain) */
function towerPoint(y, r = 0, a = 0) { TW.updateMatrixWorld(true); let acc = 0; for (let k = 0; k < 8; k++) { if (y <= acc + SH[k] || k === 7) return ST[k].localToWorld(V(Math.cos(a) * r, y - acc, Math.sin(a) * r)); acc += SH[k]; } }
setTower(4);

// =====================================================================================================================
// PEOPLE: two tourists "holding it up" (BodyParts3D, CC BY 4.0, posed), a crowd on the lawn and paths
// =====================================================================================================================
const T1 = standardLayers(await loadAnatomy(), { inside: false }); scene.add(T1.root);
const T2 = standardLayers(await loadAnatomy(), { inside: false }); scene.add(T2.root);
const CROWD = new THREE.Group(); WORLD.add(CROWD);
{ const N = 260, body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 1.05, 4, 10), new THREE.MeshStandardMaterial({ roughness: 0.8 }), N), head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.7 }), N);
  const legs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.075, 0.7, 3, 6), new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.8 }), N * 2); const m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < N; i++) { let x, z, j = 0; do { x = (hash(i + j * 101) - 0.5) * 150 + 10; z = (hash(i + 3 + j * 57) - 0.5) * 150 + 30; j++; } while ((Math.hypot(x, z) < 14 || (z < -55 && Math.abs(x) < 30) || (z < -18 && Math.abs(x) < 16)) && j < 50);
    const s = 0.9 + hash(i + 5) * 0.2; body.setMatrixAt(i, m4.makeScale(s, s, s).setPosition(x, 1.15 * s, z)); head.setMatrixAt(i, m4.makeScale(s, s, s).setPosition(x, 1.78 * s, z));
    legs.setMatrixAt(i * 2, m4.makeScale(s, s, s).setPosition(x - 0.1, 0.42 * s, z)); legs.setMatrixAt(i * 2 + 1, m4.makeScale(s, s, s).setPosition(x + 0.1, 0.42 * s, z));
    body.setColorAt(i, c.setHSL(hash(i + 7), 0.22, 0.22 + hash(i + 9) * 0.22)); }
  for (const m of [body, head, legs]) { m.castShadow = true; CROWD.add(m); } }
