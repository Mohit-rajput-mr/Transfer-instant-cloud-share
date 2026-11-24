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

