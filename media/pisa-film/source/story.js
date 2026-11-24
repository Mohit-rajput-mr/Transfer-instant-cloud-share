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
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2, D2R = Math.PI / 180;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }

// ---------- sunset sky (Poly Haven "Belfast sunset (pure sky)", CC0: sun at u 0.574, 10.5° up) + drifting clouds ----------
const SKY_ROT = -1.733 + Math.PI;   // turn the sky so the low sunset sun is behind the cameras: warm light on the marble face
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
const MARBU = { uSec: { value: 0 }, uTI: { value: new THREE.Matrix4() } };
marbleMat.side = THREE.DoubleSide;
marbleMat.onBeforeCompile = (s) => { Object.assign(s.uniforms, MARBU); s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWm;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWm = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWm; uniform float uSec; uniform mat4 uTI; vec3 secCap = vec3(-1.0);").replace("#include <dithering_fragment>", "#include <dithering_fragment>\nif (secCap.x >= 0.0) gl_FragColor = vec4(secCap, 1.0);   // the cut stone / the hollow core, unlit").replace("#include <map_fragment>", `#include <map_fragment>
    if (uSec > 0.5 && !gl_FrontFacing) { vec3 C = cameraPosition, D = vWm - C; vec3 X = C + D * (-C.z / D.z); vec3 L = (uTI * vec4(X, 1.0)).xyz;
      float r = length(L.xz); secCap = r < 3.68 ? vec3(0.012, 0.011, 0.01) : vec3(0.33, 0.31, 0.28) * (0.9 + 0.1 * sin(L.y * 7.0)); }
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
// the cathedral and the baptistery are famous buildings and no licensed 3D model of them exists (Printables has none):
// they are NOT built from code (media/MODEL_SOURCING_RULES.md §2.4); the cameras keep them out of frame
const DUOMO = new THREE.Group(), BAPT = new THREE.Group();
// the medieval city walls to the north (-x), brick with merlons
{ const wallM = new THREE.MeshStandardMaterial({ map: tex("kit/ph/clay_roof_tiles/clay_roof_tiles_diff_1k.jpg", true, 60, 2), color: 0xc08a68, roughness: 0.95 });
  const w = sh(new THREE.Mesh(new THREE.BoxGeometry(3.5, 11, 700), wallM)); w.position.set(-130, 5.5, -100); WORLD.add(w);
  const mg = new THREE.InstancedMesh(new THREE.BoxGeometry(3.5, 1.6, 1.4), wallM, 240); const m4 = new THREE.Matrix4(); for (let i = 0; i < 240; i++) mg.setMatrixAt(i, m4.makeTranslation(-130, 11.8, -450 + i * 2.95)); mg.castShadow = true; WORLD.add(mg); }
// trees beyond the walls and along the edge: Poly Haven "Island Tree 02" (CC0) baked once into an impostor, crossed quads
{ const gl = await new GLTFLoader().loadAsync("kit/ph/island_tree_02/island_tree_02_1k.gltf"); const obj = gl.scene; const box = new THREE.Box3().setFromObject(obj); const sz = box.getSize(V()), c = box.getCenter(V());
  const S = new THREE.Scene(); S.add(obj); S.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 1.2)); const dl = new THREE.DirectionalLight(0xfff0d8, 2.2); dl.position.set(c.x + sz.x, c.y + sz.y * 1.2, c.z + sz.x * 1.6); dl.target.position.copy(c); S.add(dl, dl.target);
  const half = Math.max(sz.x, sz.z) / 2, size = 640, W = Math.round(size * (2 * half) / sz.y); const cam = new THREE.OrthographicCamera(-half, half, sz.y / 2, -sz.y / 2, 0.1, 1000); cam.position.set(c.x, c.y, c.z + half * 4); cam.lookAt(c);
  const rt = new THREE.WebGLRenderTarget(W, size, { samples: 4 }); rt.texture.colorSpace = THREE.LinearSRGBColorSpace; const r = H.r, pt = r.getRenderTarget(), pc = new THREE.Color(); r.getClearColor(pc); const pa = r.getClearAlpha();
  r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(S, cam); r.setRenderTarget(pt); r.setClearColor(pc, pa); obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  const g1 = new THREE.PlaneGeometry(1, 1); g1.translate(0, 0.5, 0); const g2 = g1.clone(); g2.rotateY(Math.PI / 2); const tq = new THREE.BufferGeometry();
  tq.setAttribute("position", new THREE.Float32BufferAttribute([...g1.attributes.position.array, ...g2.attributes.position.array], 3)); tq.setAttribute("uv", new THREE.Float32BufferAttribute([...g1.attributes.uv.array, ...g2.attributes.uv.array], 2)); tq.setIndex([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5]);
  const N = 520, im = new THREE.InstancedMesh(tq, new THREE.MeshBasicMaterial({ map: rt.texture, alphaTest: 0.42, side: THREE.DoubleSide, fog: true }), N), m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < N; i++) { const a = hash(i) * TAU, rr = 150 + hash(i + 1) * 420; const x = Math.cos(a) * rr, z = Math.sin(a) * rr, h = 11 + hash(i + 3) * 7, w = h * (2 * half) / sz.y; /* a ring of trees round the square, all directions */ m4.compose(V(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), hash(i + 5) * TAU), V(w, h, w)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setRGB(0.7 + hash(i + 3) * 0.2, 0.72 + hash(i + 7) * 0.16, 0.62 + hash(i + 9) * 0.14)); }
  im.frustumCulled = false; WORLD.add(im); }

// =====================================================================================================================
// THE TOWER: a chain of storeys (each one can be counter-tilted: the upper floors were built taller on the low side)
// =====================================================================================================================
// THE TOWER: "Monuments 01 – Leaning Tower of Pisa – Italy" by André Spilari (Printables #1714900), Public Domain —
// see media/pisa-model/USE_THIS_MODEL.md. Converted by pisa_prep.py: stood upright (the model leans 4.00°), scaled to the
// real size (15.48 m across the base, 56.67 m along the axis), split at the cornices into the 8 storeys (ground storey,
// six galleries, belfry) with the author's shape untouched (including its curve). Each storey is one node in a chain so the
// film can tilt the tower, build it storey by storey and exaggerate the curve; at curveK = 1 it is exactly the model.
const R_IN = 3.68, R_BASE = 7.74;                         // inner well radius, base outer radius (Wikipedia: Ø 7.37 / 15.48 m)
const PISA = await (await fetch("kit/models/pisa/storeys.json")).json(); const PISA_BIN = await (await fetch("kit/models/pisa/storeys.bin")).arrayBuffer();
const SH = PISA.storeys.map((s) => s.h);                  // storey heights (m), from the model
const COUNTER = [0, 0, 0, 0.12, 0.22, 0.32, 0.42, 0.55];  // extra lean-back per storey, used only to exaggerate the curve (curveK > 1)
const annulus = (rIn, rOut, h, seg = 64) => { const pts = [new THREE.Vector2(rIn, 0), new THREE.Vector2(rOut, 0), new THREE.Vector2(rOut, h), new THREE.Vector2(rIn, h), new THREE.Vector2(rIn, 0)]; return new THREE.LatheGeometry(pts, seg); };
const TW = new THREE.Group(); scene.add(TW);           // pivot at the foundation centre; rotation.z = -tilt (leans to +x)
const ST = [];
{ let o = 0, parent = TW; PISA.storeys.forEach((st, k) => { const nv = st.verts, ni = st.tris * 3;
    const pos = new Float32Array(PISA_BIN, o, nv * 3); o += nv * 12; const nor = new Int8Array(PISA_BIN, o, nv * 4); o += nv * 4; const idx = new Uint32Array(PISA_BIN, o, ni); o += ni * 4;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 4, true)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();                            // pisa_prep.py already put each storey's base at y = 0
    const node = new THREE.Group(); node.position.y = k === 0 ? 0 : SH[k - 1]; parent.add(node); ST.push(node); parent = node;
    const m = sh(new THREE.Mesh(g, marbleMat)); node.add(m); }); }
// the hollow core: a spiral stair of 294 steps (seen in the section)
{ const stepG = new THREE.BoxGeometry(1.1, 0.19, 0.45); const N = 294, im = new THREE.InstancedMesh(stepG, marbleMat, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) { const a = i * 0.21, y = i * 0.17 + 0.3; q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(Math.cos(a) * (R_IN + 0.9), y, Math.sin(a) * (R_IN + 0.9)), q, V(1, 1, 1)); im.setMatrixAt(i, m4); }
  im.castShadow = true; TW.add(im); }
const TOWER_H = SH.reduce((a, b) => a + b, 0);
// the foundation: an annular ring 19.6 m across and 3 m deep (Gherardesca's 1838 walkway "catino" around the base)
const FOUND = sh(new THREE.Mesh(annulus(4.5, 9.8, 3.0), new THREE.MeshStandardMaterial({ color: 0x9c9284, roughness: 0.9 }))); FOUND.position.y = -3.0; TW.add(FOUND);
{ const cat = sh(new THREE.Mesh(annulus(10.6, 11.2, 0.7), marbleMat)); WORLD.add(cat); }
/** tilt the tower about the foundation (deg toward +x), with the storeys' counter-tilt scaled by `curveK` (1 = real) and built up to `upto` storeys */
function setTower(tiltDeg, curveK = 1, upto = 8, dropY = 0) { TW.rotation.z = -tiltDeg * D2R; TW.position.y = dropY; TW.updateMatrixWorld(true); MARBU.uTI.value.copy(TW.matrixWorld).invert();
  ST.forEach((g, k) => { g.rotation.z = (COUNTER[k] - (k ? COUNTER[k - 1] : 0)) * (curveK - 1) * D2R; g.visible = k < upto; }); }
/** world position of a point on the tower axis at height y (follows the chain) */
function towerPoint(y, r = 0, a = 0) { TW.updateMatrixWorld(true); let acc = 0; for (let k = 0; k < 8; k++) { if (y <= acc + SH[k] || k === 7) return ST[k].localToWorld(V(Math.cos(a) * r, y - acc, Math.sin(a) * r)); acc += SH[k]; } }
setTower(4);

// =====================================================================================================================
// PEOPLE: two tourists "holding it up" (BodyParts3D, CC BY 4.0, posed), a crowd on the lawn and paths
// =====================================================================================================================
const T1 = standardLayers(await loadAnatomy(), { inside: false }); scene.add(T1.root);
const T2 = standardLayers(await loadAnatomy(), { inside: false }); scene.add(T2.root);
const CROWD = new THREE.Group(); WORLD.add(CROWD);
// (no code-built crowd: people may not be built from code — media/MODEL_SOURCING_RULES.md §1; the piazza is shown at sunset, quiet)


// =====================================================================================================================
// THE CROSS-SECTION (cut at z = 0): the soil layers under the piazza (Burland et al.: horizon A sandy/clayey silts to
// ~10 m, horizon B soft marine clays to ~40 m, horizon C dense sand), the 3 m foundation ring, the hollow tower
// =====================================================================================================================
H.r.localClippingEnabled = true;
const SECU = { uSquash: { value: 0 }, uCav: { value: 0 }, uCavP: { value: new THREE.Vector2(-7, -5) }, uSettleN: { value: 0 } };
const secMat = new THREE.ShaderMaterial({ uniforms: SECU, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uSquash, uCav, uSettleN; uniform vec2 uCavP; varying vec2 vP;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    void main(){ float x = vP.x, y = vP.y;
      // settlement bowl under the tower: deeper on the low (+x) side; the layers sag with it
      float bowl = uSquash * (2.2 * exp(-pow((x - 3.0) / 11.0, 2.0)) + 1.2 * exp(-pow((x - 9.0) / 6.0, 2.0))) * exp(y / 25.0);
      bowl -= uSettleN * 1.4 * exp(-pow((x + 7.0) / 7.0, 2.0)) * exp(y / 12.0);
      float yy = y + bowl;
      vec3 c;
      if (yy > -0.7) c = vec3(0.32, 0.25, 0.18);
      else if (yy > -10.0) c = mix(vec3(0.62, 0.52, 0.36), vec3(0.5, 0.42, 0.3), step(0.5, fract(yy * 1.3 + 0.3 * n(vec2(x * 0.2, yy)))));
      else if (yy > -22.0) c = vec3(0.52, 0.62, 0.7);
      else if (yy > -24.5) c = vec3(0.6, 0.55, 0.42);
      else if (yy > -40.0) c = vec3(0.46, 0.56, 0.64);
      else c = vec3(0.66, 0.56, 0.38);
      c *= 0.88 + 0.2 * n(vec2(x * 1.7, yy * 3.0)) + 0.06 * n(vec2(x * 9.0, yy * 9.0));
      float line = 1.0 - smoothstep(0.0, 0.08, abs(fract(yy / 2.0) - 0.5) - 0.42); c *= 1.0 - 0.08 * line;
      // boundaries between horizons
      for (int i = 0; i < 4; i++) { float b = i == 0 ? -10.0 : i == 1 ? -22.0 : i == 2 ? -24.5 : -40.0; c = mix(c, c * 0.6, 1.0 - smoothstep(0.0, 0.12, abs(yy - b))); }
      // the cavity left by a drill, closing as the soil squeezes in
      float cav = uCav * (1.0 - smoothstep(0.0, 0.5, length((vP - uCavP) * vec2(0.8, 1.5))));
      c = mix(c, vec3(0.03), cav);
      gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0); }` });
const SECTION = new THREE.Group(); scene.add(SECTION); SECTION.visible = false;
const secFace = new THREE.Mesh(new THREE.PlaneGeometry(400, 60, 1, 1), secMat); secFace.position.set(0, -30, -0.02); SECTION.add(secFace);
const secTop = new THREE.Mesh(new THREE.BoxGeometry(400, 0.4, 0.6), matte(0x5f4a32, 0.9)); secTop.position.set(0, -0.2, 0); SECTION.add(secTop);
// cut caps on the tower walls and the foundation (drawn in each storey's own frame so they tilt with it)
const capMat = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.8, map: mbT("diff", true, 1, 1), side: THREE.DoubleSide });
const CAPS = [];
const cap = (g, x0, x1, y0, y1, m = capMat) => { const c = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), m); c.position.set((x0 + x1) / 2, (y0 + y1) / 2, -0.01); c.material.side = THREE.DoubleSide; g.add(c); CAPS.push(c); const d = c.clone(); d.position.x = -d.position.x; g.add(d); CAPS.push(d); };
// the tower's own cut is drawn by the marble shader (back faces seen through the cut = cut stone, the hollow core dark)
cap(TW, 4.5, 9.8, -3.0, 0, new THREE.MeshStandardMaterial({ color: 0x8d8376, roughness: 0.9 }));
for (const c of CAPS) c.visible = false;
const CLIPMATS = [marbleMat, lawnMat, pathMat, FOUND.material, duomoMat, roofMat, darkMat];
ST[7].traverse((o) => { if (o.material && o.material.isMeshPhysicalMaterial) CLIPMATS.push(o.material); });
let secOn = null;
function section(on) { MARBU.uSec.value = on ? 1 : 0; if (secOn === on) return; secOn = on; for (const m of CLIPMATS) { m.clippingPlanes = on ? [CLIP] : null; m.needsUpdate = true; } SECTION.visible = on; for (const c of CAPS) c.visible = on; CROWD.visible = !on; DUOMO.visible = BAPT.visible = !on; }
// squeeze arrows in the clay (glowing dashes), the weight arrow down the tower
const dashMat = (col) => new THREE.ShaderMaterial({ uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(col).multiplyScalar(2.2) } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uP; uniform vec3 uC; varying float vU; void main(){ float on = step(vU, uP); float dash = 0.6 + 0.4 * sin((vU - uP) * 60.0); gl_FragColor = vec4(uC * on * dash * (0.45 + 0.55 * smoothstep(uP - 0.25, uP, vU)), 1.0); }` });
const ARROWS = [];
const arrow = (pts, col, r = 0.35) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, r, 8), dashMat(col)); m.renderOrder = 40; SECTION.add(m); ARROWS.push(m); return m; };
const aWeight = arrow([V(4, 52, -0.5), V(3, 20, -0.5), V(2.5, -3, -0.5), V(3, -9, -0.5)], 0xffd166, 0.55);
const aSqR = arrow([V(6, -12, -0.5), V(16, -15, -0.5), V(30, -14, -0.5)], 0xff8a3d), aSqL = arrow([V(9, -16, -0.5), V(20, -21, -0.5), V(34, -20, -0.5)], 0xff8a3d), aDown = arrow([V(9, -2, -0.5), V(9, -9, -0.5)], 0xff8a3d, 0.45);

// =====================================================================================================================
// THE RESCUE (1993–2001): 870 t of lead ingots on a concrete ring at the north (high) side; steel cables round the
// 3rd level; slanted drills extracting soil under the high side
// =====================================================================================================================
const RESCUE = new THREE.Group(); scene.add(RESCUE);
const ringC = sh(new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1.2, 48, 1, true, -Math.PI / 2 - 0.75, 1.5), new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 0.9, side: THREE.DoubleSide }))); ringC.position.y = 0.6; RESCUE.add(ringC);
{ const s = new THREE.Shape(); s.absarc(0, 0, 15, Math.PI - 0.75, Math.PI + 0.75, false); s.absarc(0, 0, 11.4, Math.PI + 0.75, Math.PI - 0.75, true); const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = sh(new THREE.Mesh(g, ringC.material)); RESCUE.add(m); }
const LEAD = []; { for (let l = 0; l < 8; l++) for (let r = 0; r < 10; r++) for (let i = 0; i < 30; i++) { const a = Math.PI - 0.7 + (i + 0.5) / 30 * 1.4, rad = 11.8 + r * 0.31; LEAD.push([Math.cos(a) * rad, 1.3 + l * 0.21, Math.sin(a) * rad, a, l]); } }
const leadIM = new THREE.InstancedMesh(new RoundedBoxGeometry(0.58, 0.2, 0.29, 1, 0.02), new THREE.MeshStandardMaterial({ color: 0x5d6166, roughness: 0.45, metalness: 0.75 }), LEAD.length); leadIM.castShadow = true; leadIM.frustumCulled = false; RESCUE.add(leadIM);
function leadUpTo(k) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const n = Math.floor(k * LEAD.length); LEAD.forEach(([x, y, z, a], i) => { q.setFromAxisAngle(V(0, 1, 0), -a + Math.PI / 2); m4.compose(V(x, i < n ? y : -50, z), q, V(1, 1, 1)); leadIM.setMatrixAt(i, m4); }); leadIM.instanceMatrix.needsUpdate = true; }
leadUpTo(0);
// cables: a collar round the 3rd level, two steel cables running north to anchors beyond the walls
const steel = metal(0x8a9098, 0.35);
const collar = sh(new THREE.Mesh(new THREE.TorusGeometry(R_BASE + 0.35, 0.18, 10, 64), steel)); collar.rotation.x = Math.PI / 2; ST[3].add(collar); collar.position.y = 0.3;
const CAB = [0, 1].map(() => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 10), steel)); RESCUE.add(m); return m; });
const ANCH = [V(-300, 0, -14), V(-300, 0, 14)];
for (const a of ANCH) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.9 }))); b.position.copy(a).setY(1.5); RESCUE.add(b); }
function cables(on) { CAB.forEach((m, i) => { m.visible = on; collar.visible = on; if (!on) return; const p = ST[3].localToWorld(V(-(R_BASE + 0.35), 0.3, (i ? 1 : -1) * 2.5)), q = ANCH[i].clone().setY(3); const d = q.clone().sub(p); m.position.copy(p).add(q).multiplyScalar(0.5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }); }
// drill rigs on the north side: a tracked base, an inclined mast, the auger going under the foundation
const DRILLS = []; { const N = 5; for (let i = 0; i < N; i++) { const a = Math.PI + (i - (N - 1) / 2) * 0.22; const base = V(Math.cos(a) * 24, 0, Math.sin(a) * 24); const tip = V(Math.cos(a) * 7.5, -5.2, Math.sin(a) * 7.5);
    const g = new THREE.Group(); RESCUE.add(g); const body = sh(new THREE.Mesh(new RoundedBoxGeometry(3.2, 1.3, 2.0, 2, 0.2), paint(0xd9a21b, 0.4))); body.position.copy(base).add(V(0, 1.25, 0)); body.rotation.y = -a; g.add(body);
    for (const s of [-1, 1]) { const tr = sh(new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.7, 0.55, 3, 0.3), matte(0x1d1f22, 0.7))); tr.position.copy(base).add(V(-Math.sin(a) * s * 1.05, 0.35, Math.cos(a) * s * 1.05)); tr.rotation.y = -a; g.add(tr); }
    const cab = sh(new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.1, 1.3, 2, 0.15), new THREE.MeshPhysicalMaterial({ color: 0x1a2a33, roughness: 0.1, metalness: 0.4 }))); cab.position.copy(base).add(V(Math.cos(a) * 1.0, 2.2, Math.sin(a) * 1.0)); cab.rotation.y = -a; g.add(cab);
    const mastDir = base.clone().sub(tip).normalize(); const mastTop = base.clone().addScaledVector(mastDir, 7).add(V(0, 0.8, 0));
    const mast = sh(new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), paint(0xd9a21b, 0.4))); mast.position.copy(base).add(mastTop).multiplyScalar(0.5); mast.scale.y = base.distanceTo(mastTop); mast.quaternion.setFromUnitVectors(V(0, 1, 0), mastDir); g.add(mast);
    const aug = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 12), metal(0x9aa0a6, 0.35))); g.add(aug);
    const spoil = sh(new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 1 }))); spoil.position.copy(base).add(V(-mastDir.x * 0 + 2.4 * Math.cos(a + 1.57), 0.4, 2.4 * Math.sin(a + 1.57))); g.add(spoil);
    DRILLS.push({ g, base: base.clone().add(V(0, 0.3, 0)), tip, aug, spoil }); } }
function drills(on, k = 0, t = 0) { DRILLS.forEach((d, i) => { d.g.visible = on; if (!on) return; const L = d.base.distanceTo(d.tip) * clamp(k * 1.6 - i * 0.08, 0.05, 1); const dir = d.tip.clone().sub(d.base).normalize();
    d.aug.position.copy(d.base).addScaledVector(dir, L / 2); d.aug.scale.y = L; d.aug.quaternion.setFromUnitVectors(V(0, 1, 0), dir); d.aug.rotateY(t * 6); d.spoil.scale.setScalar(0.2 + 0.8 * clamp(k * 1.3 - i * 0.05)); }); }

// =====================================================================================================================
// ORBI: a café table at the edge of the piazza at sunset; the sender picks when the file burns (5–30 min)
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
OR.position.set(26, 0.9, 58); { const d = V(0, 20, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-d.x, -d.z); }
const tableM = new THREE.MeshPhysicalMaterial({ color: 0x3a2a1e, roughness: 0.35, clearcoat: 0.6, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) });
const table = sh(new THREE.Mesh(new RoundedBoxGeometry(7.5, 0.22, 4.2, 3, 0.06), tableM)); table.position.set(0.5, -0.12, 0.3); OR.add(table);
lap.g.position.set(-1.4, 0, 0.2); lap.g.rotation.y = 0.3; ph.g.position.set(1.8, 0.06, 0.9); ph.g.rotation.set(-Math.PI / 2 + 0.5, 0, -0.15);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); OR.add(orbiL);
const EMB = makeEmbers(260); OR.add(EMB);
const LIVES = [5, 10, 15, 20, 25, 30];
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "#0b0d10"; g.fillRect(60, 560, 660, 120);
  g.fillStyle = "rgba(14,18,22,.96)"; g.strokeStyle = green; g.lineWidth = 3; rr(g, 60, 520, 660, 560, 40); g.fill(); g.stroke();
  g.fillStyle = "#fff"; g.font = "800 42px D"; g.fillText("pisa-sunset.jpg", 100, 600); g.fillStyle = "#9aa6b2"; g.font = "600 28px M"; g.fillText("DISAPPEARS IN", 100, 670);
  LIVES.forEach((m, i) => { const x = 100 + (i % 3) * 200, y = 700 + Math.floor(i / 3) * 110; const on = st.sel === m; g.fillStyle = on ? green : "rgba(255,255,255,.08)"; rr(g, x, y, 180, 90, 24); g.fill(); g.fillStyle = on ? "#06140c" : "#cfd6dd"; g.font = "800 40px D"; g.fillText(`${m}m`, x + 50, y + 60); });
  if (st.left !== undefined) { g.fillStyle = st.left <= 0 ? "#ff8a3d" : "#fff"; g.font = "900 64px D"; const s = Math.max(0, st.left); g.fillText(st.left <= 0 ? "BURNED" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`, 100, 1010); } }
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.left !== undefined) { g.fillStyle = "rgba(14,18,22,.95)"; g.strokeStyle = st.left <= 0 ? "#ff8a3d" : green; g.lineWidth = 3; rr(g, 420, 300, 600, 300, 34); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("pisa-sunset.jpg", 470, 380); const s = Math.max(0, st.left);
    g.fillStyle = st.left <= 0 ? "#ff8a3d" : green; g.font = "900 72px D"; g.fillText(st.left <= 0 ? "DELETED" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`, 470, 490);
    g.fillStyle = "#9aa6b2"; g.font = "600 26px M"; g.fillText(st.left <= 0 ? "stored copy deleted" : "burns when the clock hits zero", 470, 550); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  h56: ["56 m", "#3dff8c", "of white marble"], top: ["The top", "#ffd166", "about 3.9 m out of line"], found: ["Foundation", "#cfd6dd", "only 3 m deep"],
  layA: ["Weak, unstable ground", "#ffd166", "soft layers"], layB: ["Soft layers", "#6fd0ff", "squeeze under the load"], low: ["Low side", "#ff8a3d", "sinks"],
  axis: ["Its axis", "#3dff8c", "curved, not straight"], lead: ["870 t of lead", "#cfd6dd", "on the high side"], cab: ["Steel cables", "#9fd4ff", "round the 3rd level"],
  drill: ["Slanted drills", "#ffd166", "under the high side"], cav: ["Soil out", "#ff8a3d", "a little at a time"], high: ["High side", "#3dff8c", "settles"],
});
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["BEGUN", "1173"], ["HEIGHT", "56 m"], ["TOP OFF LINE", "3.9 m"]].map(([a, b]) => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 60px D;font-stretch:112%;color:#fff;margin-top:6px">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("year", `<div style="width:1080px;text-align:center"><div id="yrN" style="font:900 190px/0.85 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.65)">1173</div><div id="yrL" style="font:800 40px D;color:#ffd166;letter-spacing:.12em;margin-top:10px"></div></div>`, { left: "0px", top: "220px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 180px/0.85 D;font-stretch:112%;color:#ff8a3d;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 44px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd" id="exT">MOTION EXAGGERATED</div>`, { left: "300px", top: "1110px" });
hudEl("chip", `<div style="width:1080px;text-align:center"><span id="chT" style="display:inline-block;padding:16px 30px;border-radius:22px;background:rgba(8,10,16,.84);border:1.5px solid #ff8a3d;font:900 48px D;color:#ff8a3d"></span></div>`, { left: "0px", top: "1430px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["YOU PICK 5–30 MIN", "NO ACCOUNT", "NO TRACE"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ff8a3d") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };
const chip = (t, a, b, txt, col = "#ff8a3d") => { H.$("chT").textContent = txt; H.$("chT").style.color = col; H.$("chT").style.borderColor = col; hudShow("chip", win(t, a, b)); };

// the tower's axis drawn as a glowing line (follows the curved chain); a ghost of the 1990 axis
const axisMat = (col) => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.3), toneMapped: false, transparent: true, depthTest: false });
const AXIS = new THREE.Mesh(new THREE.BufferGeometry(), axisMat(0x3dff8c)), GHOST = new THREE.Mesh(new THREE.BufferGeometry(), axisMat(0xff8a3d)); AXIS.renderOrder = GHOST.renderOrder = 50; scene.add(AXIS, GHOST);
function axisTube(m, k = 1) { const pts = []; for (let i = 0; i <= 40; i++) pts.push(towerPoint((i / 40) * TOWER_H * k)); m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.2, 8); }

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
function look_() { H.key.intensity = 3.6; H.hemi.intensity = 0.95; H.envK.value = 0.42; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.25; H.rimB.intensity = 0.35; }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const NOW = 5.0;     // the foundation's tilt today (deg); 1990: 5.5 (Burland); the rescue took back ~0.5° (45 cm at the top)
const yrTilt = (y) => y < 1178 ? lerp(0, 0.25, (y - 1173) / 5) : y < 1272 ? lerp(0.25, 0.6, (y - 1178) / 94) : y < 1372 ? lerp(0.6, 1.6, (y - 1272) / 100) : lerp(1.6, 5.5, Math.pow((y - 1372) / 618, 1.15));
const yrStoreys = (y) => y < 1178 ? 1 + 2 * clamp((y - 1173) / 5) : y < 1272 ? 3 : y < 1278 ? 3 + 4 * clamp((y - 1272) / 6) : y < 1372 ? 7 : 8;
const posePeople = () => { T1.setPose({ shR: [-25, 0, -140], elR: [0, 0, -15], wrR: [0, 0, -60], shL: [0, 0, 30], elL: [-70, 0, 0], head: [-6, 0, 0] }); T2.setPose({ shL: [-60, 0, 10], elL: [-40, 0, 0], shR: [-60, 0, -10], elR: [-40, 0, 0], head: [8, 0, 0] }); };
posePeople();

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
H.frame("You pick when it burns: 5–30 minutes.", async (t) => {
  H.cam.up.set(0, 1, 0); look_(); camRange(0.3, 70000); sky.visible = true; WORLD.visible = true; TW.visible = true; OR.visible = false; section(false); RESCUE.visible = true; leadUpTo(0); cables(false); drills(false); AXIS.visible = GHOST.visible = false;
  setTower(NOW); T1.root.visible = T2.root.visible = false; H.zoom = 1; H.bloom.strength = 0.3; skyU.uT.value = t; SECU.uSquash.value = 0; SECU.uCav.value = 0; SECU.uSettleN.value = 0; keyShadow(V(0, 25, 0), 70);
  for (const a of ARROWS) a.material.uniforms.uP.value = 0; EMB.visible = false;

  if (t < at("tower")) { // HOOK: sunset on the lawn, a tourist "holding it up"; then the leaning galleries
    const c = fr("hook", 0.55);
    if (t < c) { T1.root.visible = true; T1.root.position.set(53.2, 0, -108.4); T1.root.rotation.y = Math.atan2(55 - 53.2, -112 + 108.4); keyShadow(V(54, 1, -108.5), 8);
      move(t, 0, c, [V(55, 1.55, -112), V(3, 24, 0), 40], [V(54.9, 1.6, -111.8), V(3, 25, 0), 40], 0.02); title(t, fr("hook", 0.03), c, "Pisa, Italy", "Why hasn't it fallen?", 150); }
    else move(t, c, at("tower"), [V(-14, 36, -24), towerPoint(42), 40], [V(-12, 42, -22), towerPoint(48), 40], 0.2);
  } else if (t < at("soil")) { // drone round the tower and the cathedral: 56 m, top ≈ 3.9 m out of line
    move(t, at("tower"), at("soil"), [V(60, 24, -70), V(0, 24, -20), 40], [V(25, 50, -105), V(0, 26, -30), 40], 0.3);
    callout("h56", t, fr("tower", 0.15), fr("tower", 0.55), towerPoint(TOWER_H), 300, 420); callout("top", t, fr("tower", 0.55), at("soil"), towerPoint(TOWER_H, 5.4, Math.PI * 0), 760, 520); hudShow("stats", win(t, fr("tower", 0.25), at("soil")));
  } else if (t < at("curve")) { // SECTION: soft ground, 3 m foundation; built to the 2nd floor by 1178, sinking; a century's pause
    section(true); CROWD.visible = false; const yr = t < at("sink") ? 2001 : t < at("pause") ? lerp(1173, 1178, prog(t, at("sink"), fr("sink", 0.8))) : lerp(1178, 1272, prog(t, at("pause"), fr("pause", 0.85)));
    if (t < at("sink")) { setTower(NOW); SECU.uSquash.value = 1; move(t, at("soil"), at("sink"), [V(-14, 8, -190), V(-4, 6, 0), 40], [V(-8, 0, -160), V(-2, -6, 0), 40], 0.2);
      callout("found", t, fr("soil", 0.2), fr("soil", 0.5), V(-7, -1.5, 0), 760, 1050); callout("layA", t, fr("soil", 0.45), at("sink"), V(-30, -5, 0), 760, 1250); callout("layB", t, fr("soil", 0.6), at("sink"), V(25, -16, 0), 300, 1150); }
    else { const tl = yrTilt(yr); setTower(tl, 1, Math.ceil(yrStoreys(yr))); SECU.uSquash.value = tl / 5.5 * 1.6; H.$("yrN").textContent = String(Math.round(yr));
      H.$("yrL").textContent = t < at("pause") ? (yr >= 1177.5 ? "2ND FLOOR · SINKING" : "BUILDING") : "WORK STOPPED · THE SOIL SETTLES"; hudShow("year", win(t, at("sink") + 0.1, at("curve")));
      aSqR.material.uniforms.uP.value = smooth(prog(t, fr("sink", 0.4), fr("sink", 0.9))); aSqL.material.uniforms.uP.value = aSqR.material.uniforms.uP.value; aDown.material.uniforms.uP.value = aSqR.material.uniforms.uP.value;
      move(t, at("sink"), at("curve"), [V(-6, -2, -95), V(-2, -8, 0), 40], [V(-4, 0, -88), V(-2, -6, 0), 40], 0.2); callout("low", t, fr("sink", 0.5), at("pause"), V(9, -2, 0), 300, 1150);
      if (t > at("pause")) chip(t, fr("pause", 0.1), at("curve"), "≈ 100 YEARS", "#ffd166"); }
  } else if (t < at("grow")) { // building resumes; the upper floors made taller on one side → a curved axis (curve ×6, labelled)
    const yr = lerp(1272, 1372, prog(t, at("curve"), fr("curve", 0.6))); const k = smooth(prog(t, fr("curve", 0.45), fr("curve", 0.8)));
    setTower(yrTilt(yr), lerp(1, 6, k), Math.ceil(yrStoreys(yr))); H.$("yrN").textContent = String(Math.round(yr)); H.$("yrL").textContent = "TALLER ON ONE SIDE"; hudShow("year", win(t, at("curve") + 0.1, fr("curve", 0.6)));
    AXIS.visible = k > 0.02; axisTube(AXIS, Math.min(1, yrStoreys(yr) / 8)); AXIS.material.opacity = k;
    move(t, at("curve"), at("grow"), [V(8, 26, 120), V(3, 26, 0), 34], [V(6, 28, 110), V(3, 28, 0), 34], 0.1);
    callout("axis", t, fr("curve", 0.6), at("grow"), towerPoint(42), 760, 700); hudShow("exag", win(t, fr("curve", 0.5), at("grow"))); H.$("exT").textContent = "CURVE EXAGGERATED ×6";
  } else if (t < at("weights")) { // centuries: the lean keeps growing → 1990, top 4.5 m out, closed
    const yr = lerp(1372, 1990, ease(prog(t, at("grow"), fr("grow", 0.75)))); setTower(yrTilt(yr)); H.$("yrN").textContent = String(Math.round(yr)); H.$("yrL").textContent = yr > 1989 ? "CLOSED TO THE PUBLIC" : "STILL LEANING MORE";
    hudShow("year", win(t, at("grow") + 0.1, at("weights"))); skyU.uDim.value = 1; move(t, at("grow"), at("weights"), [V(6, 22, 130), V(4, 26, 0), 36], [V(14, 24, 118), V(4, 26, 0), 36], 0.2);
  } else if (t < at("dig")) { // 1993: 870 t of lead on the north (high) side; steel cables round the 3rd level
    setTower(5.5); CROWD.visible = false; const lk = smooth(prog(t, at("weights"), fr("weights", 0.85))); leadUpTo(t < at("cables") ? lk : 1);
    if (t < at("cables")) { keyShadow(V(-13, 1, 0), 18); move(t, at("weights"), at("cables"), [V(-34, 9, 22), V(-12, 1.5, 0), 40], [V(-30, 7, 18), V(-12, 1.2, 0), 40], 0.1);
      setBig(Math.round(870 * lk) + " t", "OF LEAD", "#cfd6dd"); hudShow("big", win(t, at("weights") + 0.2, at("cables"))); callout("lead", t, fr("weights", 0.3), at("cables"), V(-13, 2.2, 0), 760, 1150); }
    else { cables(true); move(t, at("cables"), at("dig"), [V(-70, 40, 90), V(-40, 18, 0), 40], [V(-60, 34, 80), V(-30, 18, 0), 40], 0.2); callout("cab", t, fr("cables", 0.25), at("dig"), ST[3].localToWorld(V(-(R_BASE + 0.4), 0.3, 0)), 300, 700); }
  } else if (t < at("stable")) { // the drills; in section: soil out under the high side, the cavity closes, the high side settles, it eases back
    leadUpTo(1); cables(true); CROWD.visible = false;
    if (t < at("settle")) { const k = prog(t, at("dig"), at("settle")); setTower(5.5);
      if (t < fr("dig", 0.5)) { drills(true, k, t); move(t, at("dig"), fr("dig", 0.5), [V(-44, 14, 30), V(-14, 0, 0), 40], [V(-40, 11, 26), V(-14, 0, 0), 40], 0.1); callout("drill", t, at("dig") + 0.3, fr("dig", 0.5), DRILLS[2].base.clone().add(V(0, 3, 0)), 760, 1050); }
      else { section(true); drills(true, k, t); SECU.uSquash.value = 1.6; SECU.uCav.value = 1; SECU.uCavP.value.set(-7.5, -4.8); move(t, fr("dig", 0.5), at("settle"), [V(-10, 0, -62), V(-9, -4, 0), 36], [V(-10, -1, -54), V(-9, -4, 0), 36], 0.1);
        callout("cav", t, fr("dig", 0.6), at("settle"), V(-7.5, -4.8, 0), 760, 1150); } }
    else { section(true); drills(true, 1, t); const k = smooth(prog(t, at("settle"), fr("back", 0.8))); SECU.uSquash.value = 1.6; SECU.uCav.value = 1 - smooth(prog(t, at("settle"), fr("settle", 0.5))); SECU.uSettleN.value = k;
      setTower(5.5 - 0.5 * 4 * k); GHOST.visible = t > at("back"); if (GHOST.visible) { const cur = TW.rotation.z; setTower(5.5); axisTube(GHOST); setTower(5.5 - 2 * k); } AXIS.visible = t > at("back"); if (AXIS.visible) { axisTube(AXIS); AXIS.material.opacity = 1; }
      move(t, at("settle"), at("stable"), [V(0, 6, -140), V(0, 10, 0), 40], [V(0, 8, -150), V(0, 12, 0), 40], 0.1);
      if (t < at("back")) { setBig("38 m³", "OF SOIL REMOVED", "#ffd166"); hudShow("big", win(t, at("settle") + 0.2, at("back"))); callout("high", t, fr("settle", 0.4), at("back"), V(-9, -2, 0), 760, 1150); }
      else { setBig("−45 cm", "BACK TO WHERE IT STOOD IN 1838", "#3dff8c"); hudShow("big", win(t, at("back") + 0.2, at("stable"))); }
      hudShow("exag", win(t, fr("settle", 0.3), at("stable"))); H.$("exT").textContent = "MOTION EXAGGERATED ×4"; }
  } else if (t < at("orbi")) { // 2001: reopened; stable for at least 300 years — sunset beauty
    T2.root.visible = true; T2.root.position.set(-6, 0, 30); T2.root.rotation.y = Math.PI + 0.2; move(t, at("stable"), at("orbi"), [V(30, 3, 70), V(0, 24, 0), 38], [V(42, 6, 64), V(0, 26, 0), 38], 0.2);
    chip(t, fr("stable", 0.2), at("orbi"), "STABLE FOR 300+ YEARS", "#3dff8c");
  } else { // ORBI: the café table, the tower behind; you pick when it burns; the clock hits zero; deleted
    OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); orbiL.intensity = 0.4; OR.updateMatrixWorld(); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const pick = t < at("orbi2") ? 15 : LIVES[Math.min(5, Math.floor(prog(t, fr("orbi2", 0.28), fr("orbi2", 0.92)) * 6))];
    const left = t < at("orbi3") ? undefined : Math.round(lerp(14, 0, prog(t, at("orbi3"), fr("orbi3", 0.45))));
    screen(ph, { sel: t < at("orbi3") ? pick : 15, left: t < at("orbi3") ? undefined : (left <= 0 ? 0 : left) }, drawPhone); screen(lap, { left }, drawLap);
    if (t > fr("orbi3", 0.45)) { EMB.userData.burn(clamp(1 - prog(t, fr("orbi3", 0.5), at("end"))), t, (x, y) => lap.g.localToWorld(V(x * 2.4, 1.0 + y * 1.2, 0.1)).applyMatrix4(OR.matrixWorld.clone().invert())); }
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.6, 2.4, 10.5), OW(0.4, 3.2, 0), 42], [OW(0.5, 2.2, 9.0), OW(0.4, 3.0, 0), 42], 0.2);
    else if (t < at("orbi3")) { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, at("orbi2"), at("orbi3"), [OW(...pc.clone().addScaledVector(pn, 3.3).toArray()), OW(...pc.toArray()), 34], [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 34], 0.03);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); }
    else { const sc = lap.g.localToWorld(V(0, 1.0, 0.1)); OR.worldToLocal(sc); move(t, at("orbi3"), at("end"), [OW(sc.x + 0.9, sc.y + 0.4, sc.z + 4.6), OW(sc.x, sc.y, sc.z), 36], [OW(sc.x + 0.8, sc.y + 0.35, sc.z + 4.2), OW(sc.x, sc.y, sc.z), 36], 0.03); hudShow("chips", win(t, fr("orbi3", 0.5), at("end"))); }
  }
});
await H.ready();
