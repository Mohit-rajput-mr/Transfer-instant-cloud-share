// Do you know the Statue of Liberty's skin is only as thick as two pennies? HD film on kit/hd.js (9:16).
// Real scale (metres, NPS "Statue Statistics"): ground to torch 92.99, pedestal top 46.94, heel to torch 46.05, heel to top
// of head 33.86, head (chin → cranium) 5.26, right arm 12.8, waist 10.67, tablet 7.19 × 4.14 × 0.61, index finger 2.44,
// copper skin 2.4 mm (3/32 in). Inside: Eiffel's iron pylon, a secondary frame and flat armature bars out to the skin.
// Morning over New York Harbor (Gerstner swell), an Atlantic storm (rain, sway ×20 labelled), the patina spreading.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import { makePhone, makeLaptop, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }

// ---------- dawn sky (Poly Haven "Qwantani dawn", CC0: sun at u 0.596, 13° up) ----------
const SUN = (() => { const a = (0.5957 - 0.5) * TAU, e = THREE.MathUtils.degToRad(13.2); return V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).normalize(); })();
H.key.color.set(0xffdcb8); H.hemi.color.set(0xc4d4ea); H.hemi.groundColor.set(0x3a4038);
const FOG = { c: new THREE.Color(0xc4c8cc), d: 0.00022 };
scene.fog = new THREE.FogExp2(FOG.c.getHex(), FOG.d);
const skyTex = tex("kit/ph/qwantani_dawn_puresky/sky_4k.jpg", true); skyTex.repeat.set(1, 1);
const SKYU = { uSky: { value: skyTex }, uSun: { value: SUN }, uStorm: { value: 0 }, uT: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: SKYU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun; uniform float uStorm, uT; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * n(p); p *= 2.1; a *= 0.5; } return v; }
    void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
      vec3 c = texture2D(uSky, uv).rgb; if (d.y < 0.0) c = vec3(0.55, 0.58, 0.6);
      c += vec3(1.0, 0.8, 0.55) * pow(max(dot(d, uSun), 0.0), 1400.0) * 4.0 * (1.0 - uStorm);
      // storm: a low, heavy cloud deck rolling in
      vec2 q = d.xz / max(d.y + 0.08, 0.04) * 0.6 + vec2(uT * 0.05, uT * 0.02); float cl = fbm(q) * 0.7 + fbm(q * 3.1 + 4.0) * 0.3;
      vec3 storm = mix(vec3(0.16, 0.18, 0.2), vec3(0.42, 0.45, 0.48), smoothstep(0.3, 0.8, cl)) * (0.7 + 0.5 * smoothstep(-0.1, 0.4, d.y));
      gl_FragColor = vec4(mix(c, storm, uStorm), 1.0); }` }));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// ---------- New York Harbor: ocean shader on a Gerstner-wave mesh ----------
const waterN = (() => { const N = 256, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N); H.reseed(5);
  const W2 = Array.from({ length: 24 }, () => ({ kx: Math.round((H.rnd() - 0.5) * 14), ky: Math.round((H.rnd() - 0.5) * 14), ph: H.rnd() * TAU, a: 0.4 + H.rnd() })); const hh = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const q of W2) { const k = Math.hypot(q.kx, q.ky) || 1; v += (q.a / k) * Math.sin(((q.kx * x + q.ky * y) / N) * TAU + q.ph); } hh[y * N + x] = v; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = hh[y * N + (x + 1) % N] - hh[y * N + (x + N - 1) % N], dy = hh[((y + 1) % N) * N + x] - hh[((y + N - 1) % N) * N + x]; const n = V(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * N + x) * 4;
    im.data[i] = (n.x * 0.5 + 0.5) * 255; im.data[i + 1] = (n.y * 0.5 + 0.5) * 255; im.data[i + 2] = (n.z * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const WAVES = [[1, 0.2, 42, 0.45], [0.8, -0.45, 27, 0.3], [0.95, 0.5, 16, 0.2], [0.6, -0.8, 9, 0.12], [0.98, 0.1, 5.5, 0.06], [0.4, 0.9, 3.4, 0.035]].map(([x, z, L, a]) => { const n = Math.hypot(x, z); return new THREE.Vector4(x / n, z / n, L, a); });
const sea = new Water(new THREE.PlaneGeometry(12000, 12000, 380, 380), { textureWidth: 512, textureHeight: 512, waterNormals: waterN, sunDirection: SUN.clone(), sunColor: 0xffe0b8, waterColor: 0x16343a, distortionScale: 3.0, fog: true });
sea.rotation.x = -Math.PI / 2; sea.position.y = -2.5; scene.add(sea); sea.frustumCulled = false;
{ const m = sea.material; m.uniforms.uW = { value: WAVES }; m.uniforms.uWT = { value: 0 }; m.uniforms.uAmp = { value: 1 };
  m.vertexShader = m.vertexShader.replace("varying vec4 worldPosition;", "varying vec4 worldPosition; uniform vec4 uW[6]; uniform float uWT, uAmp;")
    .replace(`mirrorCoord = modelMatrix * vec4( position, 1.0 );
					worldPosition = mirrorCoord.xyzw;`, `vec4 wp = modelMatrix * vec4( position, 1.0 ); vec3 b = wp.xyz;
					float fade = 1.0 / (1.0 + length(b.xz - cameraPosition.xz) / 1200.0);
					for (int i = 0; i < 6; i++) { vec2 d = uW[i].xy; float k = 6.2831853 / uW[i].z, a = uW[i].w * fade * uAmp, c = sqrt(9.81 / k); float f = k * (dot(d, b.xz) - c * uWT); float Q = 0.5 / (k * a * 6.0 + 1e-4);
						wp.x += Q * a * d.x * cos(f); wp.z += Q * a * d.y * cos(f); wp.y += a * sin(f); }
					mirrorCoord = wp; worldPosition = wp;`).replace("vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );", "vec4 mvPosition = viewMatrix * worldPosition;");
  m.needsUpdate = true; }

// ---------- Liberty Island: lawn, sea wall, trees; the Manhattan skyline across the harbour ----------
const WORLD = new THREE.Group(); scene.add(WORLD);
const grassT = (n, srgb, r) => tex(`kit/ph/grass_ground/grass_ground_${n}_1k.jpg`, srgb, r, r);
{ const lawn = sh(new THREE.Mesh(new THREE.CircleGeometry(190, 96), new THREE.MeshStandardMaterial({ map: grassT("diff", true, 40), normalMap: grassT("nor_gl", false, 40), roughness: 1, color: 0xb6c29a })), false, true);
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = -0.05; WORLD.add(lawn);
  const wall = sh(new THREE.Mesh(new THREE.CylinderGeometry(191, 193, 4.5, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0x8d8a82, roughness: 0.9, map: tex("kit/ph/concrete_wall_008/concrete_wall_008_diff_1k.jpg", true, 60, 1) }))); wall.position.y = -2.3; WORLD.add(wall);
  const path = sh(new THREE.Mesh(new THREE.RingGeometry(80, 88, 96), matte(0xb9b2a4, 0.9)), false, true); path.rotation.x = -Math.PI / 2; path.position.y = 0.02; WORLD.add(path);
  const treeG = (() => { const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const n = 1 + 0.18 * Math.sin(v.x * 7 + v.y * 5) * Math.sin(v.z * 6 - v.y * 4) + 0.08 * Math.sin(v.x * 17 + v.z * 13); p.setXYZ(i, v.x * n, v.y * n, v.z * n); } g.computeVertexNormals(); return g; })();
  const treeM = new THREE.MeshStandardMaterial({ color: 0x46603a, roughness: 1, map: grassT("diff", true, 3) }); const N = 420; const trees = new THREE.InstancedMesh(treeG, treeM, N); const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { const c = Math.floor(i / 3); const a = hash(c) * TAU, r = 95 + hash(c + 2) * 80; if (Math.abs(Math.sin(a - 1.57)) > 0.9 && Math.cos(a) * 0 + Math.sin(a) > 0) { m4.makeScale(0, 0, 0); trees.setMatrixAt(i, m4); continue; }
    const s = 1.8 + hash(i + 4) * 1.6; const ox = (hash(i + 7) - 0.5) * 4, oz = (hash(i + 9) - 0.5) * 4; m4.makeScale(s, s * 0.9, s).setPosition(Math.cos(a) * r + ox, 2.2 + s * 0.7 + hash(i + 11) * 1.5, Math.sin(a) * r + oz); trees.setMatrixAt(i, m4); }
  trees.castShadow = true; WORLD.add(trees); }

// =====================================================================================================================
// FORT WOOD (11-point star) + FOUNDATION + PEDESTAL (granite): top at 46.94 m
// =====================================================================================================================
const PT = 46.94;
const stoneT = (n, srgb, r) => tex(`kit/ph/old_sandstone_02/old_sandstone_02_${n}_1k.jpg`, srgb, r, r);
const granite = new THREE.MeshStandardMaterial({ map: stoneT("diff", true, 6), normalMap: stoneT("nor_gl", false, 6), roughness: 0.85, color: 0xb9c2cc });
const fortM = new THREE.MeshStandardMaterial({ map: stoneT("diff", true, 14), normalMap: stoneT("nor_gl", false, 14), roughness: 0.9, color: 0x9aa2aa });
const PED = new THREE.Group(); scene.add(PED);
{ const s = new THREE.Shape(); for (let i = 0; i <= 22; i++) { const a = (i / 22) * TAU + Math.PI / 2, r = i % 2 ? 44 : 64; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 7.5, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const fort = sh(new THREE.Mesh(g, fortM)); PED.add(fort);
  const box = (w, h, d, y, m = granite) => { const b = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.25, h * 0.1)), m)); b.position.y = y + h / 2; PED.add(b); return b; };
  // foundation: a stepped, battered block (19.8 m to the pedestal)
  for (let i = 0; i < 5; i++) box(58 - i * 6, 2.6, 58 - i * 6, 7.5 + i * 2.46, fortM);
  // pedestal (Hunt): base, dado with Greek-revival loggias, cornice
  box(30, 3.6, 30, 19.8); box(28.5, 0.8, 28.5, 23.4); box(26, 9.2, 26, 24.2); box(27.4, 0.9, 27.4, 33.4);
  box(24.6, 6.6, 24.6, 34.3); // loggia band
  const dark = matte(0x1a1c1f, 0.9);
  for (let f = 0; f < 4; f++) for (let i = 0; i < 3; i++) { const o = sh(new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.8, 0.6), dark), false, false); o.position.set((i - 1) * 6.2, 36.6, 12.05); o.position.applyAxisAngle(V(0, 1, 0), (f * Math.PI) / 2); o.rotation.y = (f * Math.PI) / 2; PED.add(o);
    for (const dx of [-1.7, 1.7]) { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 5.2, 16), granite)); c.position.set((i - 1) * 6.2 + dx, 36.8, 12.5); c.position.applyAxisAngle(V(0, 1, 0), (f * Math.PI) / 2); PED.add(c); } }
  box(26.4, 1.1, 26.4, 40.9); box(22.8, 3.6, 22.8, 42.0); box(24.0, 1.34, 24.0, 45.6); }

// =====================================================================================================================
// THE STATUE: robed figure lofted from a profile with drapery folds, raised right arm + torch, tablet, crown of 7 rays
// built facing +z in its own group (y = 0 at the heel = pedestal top)
// =====================================================================================================================
const SKY_F = V(SUN.x, 0, SUN.z).normalize().applyAxisAngle(V(0, 1, 0), THREE.MathUtils.degToRad(-38));   // she faces the morning sun at 3/4
const LIB = new THREE.Group(); LIB.position.y = PT; LIB.rotation.y = Math.atan2(SKY_F.x, SKY_F.z); scene.add(LIB);
PED.rotation.y = LIB.rotation.y; WORLD.rotation.y = LIB.rotation.y;
const SW = { uSway: { value: new THREE.Vector2() }, uAge: { value: 1 }, uX: { value: 0 }, uHot: { value: 0 } };
const swayVS = (s) => s.replace("#include <common>", "#include <common>\nuniform vec2 uSway;").replace("#include <project_vertex>", `
    vec4 mvPosition = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
    #endif
    float hk = clamp(mvPosition.y / 46.05, 0.0, 1.3); mvPosition.xz += uSway * hk * hk;
    mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`);
// copper skin: bright copper (1886) → green patina (uAge), with streaks; x-ray mode (uX)
const patT = (n, srgb, r) => tex(`kit/ph/green_metal_rust/green_metal_rust_${n}_1k.jpg`, srgb, r, r);
const skinMat = new THREE.MeshStandardMaterial({ map: patT("diff", true, 3), normalMap: patT("nor_gl", false, 3), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.7, metalness: 0.3, transparent: true });
skinMat.onBeforeCompile = (s) => { Object.assign(s.uniforms, SW);
  s.vertexShader = swayVS(s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvLP = position;"));
  s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
    uniform float uAge, uX, uHot; varying vec3 vLP; float cover;
    float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y), mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
    .replace("#include <map_fragment>", `#include <map_fragment>
      { float nz = n3(vLP * 0.45) * 0.55 + n3(vLP * 1.7) * 0.3 + n3(vLP * 6.0) * 0.15;
        float streak = 0.25 * n3(vec3(vLP.x * 3.0, vLP.y * 0.12, vLP.z * 3.0));
        cover = smoothstep(-0.06, 0.06, uAge * 1.35 - 0.2 - nz * 0.8 - streak + 0.15);
        float lum = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
        vec3 copper = vec3(0.78, 0.4, 0.22) * (0.75 + 0.9 * lum) + vec3(0.1, 0.03, 0.0) * n3(vLP * 9.0);
        vec3 pat = mix(vec3(0.36, 0.62, 0.52), diffuseColor.rgb * vec3(0.9, 1.25, 1.15), 0.35) * (0.85 + 0.3 * nz);
        diffuseColor.rgb = mix(copper, pat, cover); }`)
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.3, 0.78, cover);")
    .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.92, 0.12, cover);")
    .replace("#include <dithering_fragment>", `#include <dithering_fragment>
      { float edge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.35, 0.8, 1.0) * (0.04 + 1.0 * edge), uX);
        gl_FragColor.rgb += vec3(1.0, 0.3, 0.1) * uHot * 0.0;
        gl_FragColor.a = mix(1.0, 0.05 + 0.5 * edge, uX); }`); };
skinMat.customProgramCacheKey = () => "libskin";
const ST = new THREE.Group(); LIB.add(ST);
// --- body: radius profile (half-width, m) and front-back depth; folds + the diagonal palla across the chest
const PROF = [[0, 5.7], [2, 5.5], [6, 5.2], [11, 5.0], [15, 5.1], [17.5, 5.33], [21, 5.05], [24.5, 5.3], [26.6, 5.6], [27.6, 5.0], [28.3, 2.6], [28.9, 1.35], [30.2, 1.3]];
const profR = (y) => { for (let i = 1; i < PROF.length; i++) if (y <= PROF[i][0]) { const [a, ra] = PROF[i - 1], [b, rb] = PROF[i]; const k = (y - a) / (b - a); return lerp(ra, rb, k * k * (3 - 2 * k)); } return 1.3; };
const depth = (y) => lerp(0.74, 0.6, clamp(y / 26)) * (y > 27.6 ? lerp(1, 1.6, clamp((y - 27.6) / 1.3)) : 1);
function bodyPoint(th, y, out) { const r = profR(y), cx = Math.cos(th), sz = Math.sin(th); const front = Math.max(0, sz);
  const A = 0.38 * (1 - smooth(clamp(y / 24))) + 0.07; const folds = A * (0.6 * Math.sin(14 * th + 0.22 * y) + 0.4 * Math.sin(23 * th - 0.09 * y + 1.3)) * (y < 27 ? 1 : 0.2);
  const x = r * cx; const yl = 19.5 + 1.6 * x; const palla = y < 27.5 ? 0.5 * Math.exp(-Math.pow((y - yl) / 1.3, 2)) * (0.4 + 0.6 * front) + (y > yl && y < 27.5 ? 0.18 : 0) * front : 0;
  const hem = y < 1.2 ? 0.25 * Math.sin(th * 9) * (1.2 - y) : 0;
  const rr2 = r + folds + palla + hem; out.set(rr2 * cx, y, rr2 * depth(y) * sz); return out; }
{ const NU = 220, NV = 200, pos = [], uv = [], idx = [], p = V();
  for (let j = 0; j <= NV; j++) { const y = (j / NV) * 30.2; for (let i = 0; i <= NU; i++) { const th = (i / NU) * TAU; bodyPoint(th, y, p); pos.push(p.x, p.y, p.z); uv.push((i / NU) * 9, y / 3.4); } }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  ST.add(sh(new THREE.Mesh(g, skinMat))); }
// a tube with a varying radius along a curve (arms, sleeves)
function limb(pts, radii, segs = 60, rad = 28) { const c = new THREE.CatmullRomCurve3(pts); const fr2 = c.computeFrenetFrames(segs, false); const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) { const u = i / segs, P = c.getPointAt(u); const r = (() => { const k = u * (radii.length - 1), a = Math.floor(k), b = Math.min(a + 1, radii.length - 1); return lerp(radii[a], radii[b], smooth(k - a)); })();
    for (let j = 0; j <= rad; j++) { const a = (j / rad) * TAU; const fold = 1 + 0.06 * Math.sin(a * 7 + u * 9); const n = fr2.normals[i].clone().multiplyScalar(Math.cos(a)).add(fr2.binormals[i].clone().multiplyScalar(Math.sin(a)));
      const q = P.clone().addScaledVector(n, r * fold); pos.push(q.x, q.y, q.z); uv.push((j / rad) * 2, u * 4); } }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + 1, c2 = a + rad + 1, d = c2 + 1; idx.push(a, b, c2, b, d, c2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = sh(new THREE.Mesh(g, skinMat)); ST.add(m); return m; }
const ARM_R = [V(-4.7, 26.6, 0.1), V(-5.9, 30.5, 0.5), V(-6.5, 34.5, 0.8), V(-6.7, 38.6, 1.0)];
limb(ARM_R, [1.9, 1.75, 1.35, 1.05, 0.85]);                                      // raised right arm (12.8 m)
limb([V(-4.6, 27.2, 0.2), V(-5.8, 29.2, 0.4), V(-6.5, 30.2, 0.6), V(-6.6, 29.0, 0.5)], [1.4, 1.6, 1.2, 0.5], 40);   // falling sleeve at the elbow
limb([V(4.6, 26.8, 0.2), V(5.9, 23.8, 0.6), V(6.3, 21.0, 1.4), V(5.4, 20.4, 3.0)], [1.7, 1.4, 1.1, 0.8]);          // left arm, bent, holding the tablet
// hand round the torch handle + hand under the tablet
for (const [p, s] of [[V(-6.7, 39.2, 1.0), V(1.0, 1.3, 1.0)], [V(5.3, 20.2, 3.1), V(0.9, 0.7, 1.1)]]) { const m = sh(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), skinMat)); m.position.copy(p); m.scale.copy(s); ST.add(m); }
// head (chin → cranium 5.26 m, ear to ear 3.05 m): an ellipsoid shaped into a face; hair, bun
{ const g = new THREE.SphereGeometry(1, 96, 64); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (z > 0) { z *= 1 - 0.18 * Math.max(0, z - 0.5);                                   // flatter face
      z += 0.22 * Math.exp(-(x * x) / 0.012) * Math.exp(-Math.pow((y + 0.05) / 0.22, 2)) * (y < 0.15 ? 1 : 0.3);   // nose
      z -= 0.07 * Math.exp(-Math.pow(Math.abs(x) - 0.33, 2) / 0.012) * Math.exp(-Math.pow((y - 0.18) / 0.1, 2));  // eye sockets
      z += 0.05 * Math.exp(-Math.pow((y - 0.33) / 0.08, 2)) * (1 - x * x);                                        // brow
      z += 0.04 * Math.exp(-(x * x) / 0.05) * Math.exp(-Math.pow((y + 0.42) / 0.07, 2)); }                           // lips
    if (y < -0.55) { x *= 1 - (-0.55 - y) * 0.55; }                                                                // chin
    p.setXYZ(i, x * 1.52, y * 2.63, z * 1.75); }
  g.computeVertexNormals(); const head = sh(new THREE.Mesh(g, skinMat)); head.position.set(0, 31.2, 0.35); ST.add(head);
  const bun = sh(new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 20), skinMat)); bun.position.set(0, 31.6, -1.7); bun.scale.set(1.1, 0.9, 0.8); ST.add(bun);
  for (let i = 0; i < 7; i++) { const w = sh(new THREE.Mesh(new THREE.TorusGeometry(1.62 - i * 0.02, 0.16, 10, 40, Math.PI * 1.2), skinMat)); w.position.set(0, 30.3 + i * 0.32, -0.1); w.rotation.set(Math.PI / 2 + 0.15, 0, Math.PI * 1.4 + 0.0); ST.add(w); } }
// crown: diadem with 25 windows and 7 rays (up to 2.74 m)
{ const band = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.75, 1.0, 64, 1, true), skinMat)); band.position.set(0, 33.0, 0.25); band.material.side; ST.add(band);
  const winM = matte(0x0c0e10, 0.9); for (let i = 0; i < 25; i++) { const a = (i / 24 - 0.5) * 2.2 + Math.PI / 2; const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.08), winM); w.position.set(Math.cos(a) * 1.86, 33.0, Math.sin(a) * 1.86 + 0.25); w.rotation.y = -a + Math.PI / 2; ST.add(w); }
  for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + (i - 3) * 0.42; const L = 2.74; const r = sh(new THREE.Mesh(new THREE.ConeGeometry(0.3, L, 4), skinMat)); const dir = V(Math.cos(a), 0.42 - Math.abs(i - 3) * 0.03, Math.sin(a)).normalize();
    r.position.set(Math.cos(a) * 1.9, 33.35, Math.sin(a) * 1.9 + 0.25).addScaledVector(dir, L / 2); r.quaternion.setFromUnitVectors(V(0, 1, 0), dir); ST.add(r); } }
// tablet (7.19 × 4.14 × 0.61 m), JULY IV MDCCLXXVI
const TAB = new THREE.Group(); TAB.position.set(6.4, 21.6, 2.3); TAB.rotation.set(0.12, -0.5, -0.22); ST.add(TAB);
{ const t = sh(new THREE.Mesh(new RoundedBoxGeometry(4.14, 7.19, 0.61, 3, 0.12), skinMat)); TAB.add(t);
  const c = document.createElement("canvas"); c.width = 256; c.height = 448; const g = c.getContext("2d"); g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 448); g.fillStyle = "#3a3a3a"; g.font = "bold 40px serif"; g.textAlign = "center"; g.fillText("JULY IV", 128, 190); g.fillText("MDCCLXXVI", 128, 250);
  const bump = new THREE.CanvasTexture(c); const face = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.4), new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })); face.position.z = 0.31; TAB.add(face);
  const ins = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.3), new THREE.MeshBasicMaterial({ map: bump, transparent: true, opacity: 0.35, blending: THREE.MultiplyBlending, premultipliedAlpha: true })); ins.position.z = 0.312; TAB.add(ins); }
// torch: handle, cup, balcony with railing, gold-leaf flame (tip at 46.05 m)
const TORCH = new THREE.Group(); TORCH.position.set(-6.7, 38.2, 1.0); ST.add(TORCH);
const flameMat = new THREE.MeshPhysicalMaterial({ color: 0xffc35a, metalness: 1, roughness: 0.22, emissive: 0xff9a2a, emissiveIntensity: 0.25 });
{ const h = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 4.2, 24), skinMat)); h.position.y = 2.1; TORCH.add(h);
  for (const y of [1.2, 2.6, 3.7]) { const r = sh(new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.1, 10, 28), skinMat)); r.rotation.x = Math.PI / 2; r.position.y = y; TORCH.add(r); }
  const cup = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.45, 0.55, 1.0, 32), skinMat)); cup.position.y = 4.7; TORCH.add(cup);
  const deck = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.16, 48), skinMat)); deck.position.y = 5.05; TORCH.add(deck);
  const rail = sh(new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.05, 8, 64), skinMat)); rail.rotation.x = Math.PI / 2; rail.position.y = 6.05; TORCH.add(rail);
  for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6), skinMat)); p.position.set(Math.cos(a) * 2.1, 5.55, Math.sin(a) * 2.1); TORCH.add(p); }
  const prof = [[0, 0.95], [0.4, 1.15], [1.0, 1.05], [1.6, 0.78], [2.2, 0.45], [2.6, 0.18], [2.75, 0.0]].map(([y, r]) => new THREE.Vector2(r, y));
  const fg = new THREE.LatheGeometry(prof, 40); const pp = fg.attributes.position; for (let i = 0; i < pp.count; i++) { const y = pp.getY(i), a = Math.atan2(pp.getZ(i), pp.getX(i)); const k = 1 + 0.18 * Math.sin(a * 5 + y * 2.2) * clamp(y / 1.5); pp.setX(i, pp.getX(i) * k); pp.setZ(i, pp.getZ(i) * k); }
  fg.computeVertexNormals(); const fl = sh(new THREE.Mesh(fg, flameMat)); fl.position.y = 5.13; TORCH.add(fl); }
const TORCH_TIP = () => ST.localToWorld(TORCH.position.clone().add(V(0, 7.85, 0)));

// =====================================================================================================================
// THE SKELETON (x-ray): Eiffel's iron pylon, a secondary frame that follows the skin, flat armature bars out to the skin
// =====================================================================================================================
const BEAMS = []; const beam = (a, b, th, k) => BEAMS.push([a, b, th, k]);   // k: 0 pylon, 1 secondary, 2 armature, 3 arm
const hw = (y) => lerp(2.9, 1.5, clamp((y + 8) / 37));
{ const C = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => (k) => { const y = lerp(-8, 29, k); return V(sx * hw(y), y, sz * hw(y) * 0.8); });
  const N = 20; for (const c of C) for (let i = 0; i < N; i++) beam(c(i / N), c((i + 1) / N), 0.32, 0);
  for (let f = 0; f < 4; f++) for (let i = 0; i < N; i++) { const a0 = C[f](i / N), a1 = C[f]((i + 1) / N), b0 = C[(f + 1) % 4](i / N), b1 = C[(f + 1) % 4]((i + 1) / N); beam(a0, b1, 0.14, 0); beam(b0, a1, 0.14, 0); beam(a1, b1, 0.16, 0); } }
const RINGS = []; const P2 = V();
for (let y = 0.8; y < 28; y += 1.6) { const ring = []; const n = 24; for (let i = 0; i < n; i++) { const th = (i / n) * TAU; bodyPoint(th, y, P2); const skin = P2.clone(); const inner = V(skin.x * 0.62, y, skin.z * 0.62); ring.push([inner, skin]); }
  RINGS.push(ring); for (let i = 0; i < n; i++) { const [a, sa] = ring[i], [b] = ring[(i + 1) % n]; beam(a, b, 0.12, 1); beam(a, sa.clone().lerp(a, 0.04), 0.06, 2); }
  for (let i = 0; i < n; i += 3) { const [a] = ring[i]; const c = V(Math.sign(a.x) * hw(y), y, Math.sign(a.z) * hw(y) * 0.8); beam(a, c, 0.12, 1); } }
for (let r = 0; r + 1 < RINGS.length; r++) for (let i = 0; i < 24; i += 2) beam(RINGS[r][i][0], RINGS[r + 1][(i + 1) % 24][0], 0.08, 1);
// right-arm truss to the torch, and bars to the sleeve
{ const c = new THREE.CatmullRomCurve3([V(-1.5, 28.5, 0), ...ARM_R.slice(1), V(-6.7, 42.5, 1.0)]); const N = 26; const off = [[0.45, 0.45], [-0.45, 0.45], [-0.45, -0.45], [0.45, -0.45]];
  const P = (k, o) => c.getPointAt(k).add(V(o[0], 0, o[1]));
  for (const o of off) for (let i = 0; i < N; i++) beam(P(i / N, o), P((i + 1) / N, o), 0.14, 3);
  for (let i = 0; i < N; i++) for (let f = 0; f < 4; f++) { beam(P(i / N, off[f]), P((i + 1) / N, off[(f + 1) % 4]), 0.07, 3); beam(P(i / N, off[f]), P(i / N, off[(f + 1) % 4]), 0.07, 3); }
  for (let i = 2; i < N - 2; i += 2) { const p = c.getPointAt(i / N); for (let j = 0; j < 6; j++) { const a = (j / 6) * TAU; beam(p, p.clone().add(V(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0)), 0.05, 2); } } }
// head frame
for (let j = 0; j < 10; j++) { const a = (j / 10) * TAU; beam(V(0, 28.8, 0), V(Math.cos(a) * 1.3, 31.5, Math.sin(a) * 1.5 + 0.3), 0.07, 1); }
const beamMat = new THREE.MeshStandardMaterial({ color: 0x4a4e54, roughness: 0.5, metalness: 0.6 });
const HIK = { uGlow: { value: 0 } };
beamMat.onBeforeCompile = (s) => { Object.assign(s.uniforms, SW, HIK); s.vertexShader = swayVS(s.vertexShader);
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uGlow;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor * uGlow;\n#endif"); };
beamMat.customProgramCacheKey = () => "libbeam";
const SKEL = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), beamMat, BEAMS.length); SKEL.frustumCulled = false; SKEL.castShadow = true; LIB.add(SKEL);
{ const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(), p = V(); BEAMS.forEach(([a, b, th, k], i) => { const d = b.clone().sub(a), L = d.length(); q.setFromUnitVectors(V(0, 1, 0), d.normalize());
    p.copy(a).add(b).multiplyScalar(0.5); s.set(k === 2 ? th * 1.6 : th, L + th * 0.5, th); m4.compose(p, q, s); SKEL.setMatrixAt(i, m4); SKEL.setColorAt(i, new THREE.Color(0, 0, 0)); }); }
const KIND_C = [new THREE.Color(0.24, 1.0, 0.55), new THREE.Color(1.0, 0.82, 0.4), new THREE.Color(0.42, 0.82, 1.0), new THREE.Color(1.0, 0.55, 0.25)];
/** light up the skeleton by kind: ks = [pylon, secondary, armature, arm] 0..1 */
function skelGlow(ks) { const c = new THREE.Color(); BEAMS.forEach(([, , , k], i) => SKEL.setColorAt(i, c.copy(KIND_C[k]).multiplyScalar(ks[k] || 0))); SKEL.instanceColor.needsUpdate = true; HIK.uGlow.value = 1.6; }
skelGlow([0, 0, 0, 0]);

// the double-helix stair to the crown (162 steps) round the pylon, with visitors climbing (seen in the x-ray)
const STAIR = new THREE.Group(); LIB.add(STAIR);
{ const N = 162, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.08, 0.32), new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.5, metalness: 0.6 }), N * 2); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let h = 0; h < 2; h++) for (let i = 0; i < N; i++) { const a = i * 0.24 + h * Math.PI, y = 1 + i * 0.185, r = 3.4 - y * 0.05; q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(Math.cos(a) * r, y, Math.sin(a) * r * 0.8), q, V(1, 1, 1)); im.setMatrixAt(h * N + i, m4); }
  STAIR.add(im);
  const pm = new THREE.MeshStandardMaterial({ color: 0xd9b48c, roughness: 0.7, emissive: 0xffc890, emissiveIntensity: 0.25 }); const body = new THREE.CapsuleGeometry(0.2, 0.9, 3, 8), head = new THREE.SphereGeometry(0.13, 10, 8);
  for (let k = 0; k < 14; k++) { const i = 8 + k * 11, hh = k % 2, a = i * 0.24 + hh * Math.PI, y = 1 + i * 0.185, r = 3.4 - y * 0.05; const g = new THREE.Group(); g.position.set(Math.cos(a) * r, y + 0.6, Math.sin(a) * r * 0.8);
    const b = new THREE.Mesh(body, pm); g.add(b); const hd = new THREE.Mesh(head, pm); hd.position.y = 0.72; g.add(hd); STAIR.add(g); } }
STAIR.visible = false;
// gulls over the harbour
const GULLS = new THREE.Group(); scene.add(GULLS);
const gullMat = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.8, side: THREE.DoubleSide });
const GL = Array.from({ length: 14 }, (_, i) => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 3, 6), gullMat); body.rotation.z = Math.PI / 2; g.add(body);
  const wing = (s) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.22), gullMat); w.geometry.translate(0.37 * s, 0, 0); g.add(w); return w; }; g.userData = { L: wing(-1), R: wing(1), i }; GULLS.add(g); return g; });
function gulls(t, center) { GL.forEach((g, i) => { const a = t * (0.12 + hash(i) * 0.08) + hash(i + 3) * TAU, r = 30 + hash(i + 5) * 60; g.position.set(center.x + Math.cos(a) * r, center.y + 10 + hash(i + 7) * 40 + Math.sin(t * 0.7 + i) * 3, center.z + Math.sin(a) * r);
  g.rotation.y = -a; const f = Math.sin(t * 9 + i * 1.7) * 0.6; g.userData.L.rotation.x = 0; g.userData.L.rotation.z = f; g.userData.R.rotation.z = -f; g.scale.setScalar(2.2); }); }

// =====================================================================================================================
// THE STORM: rain streaks around the camera, wind-blown spray
// =====================================================================================================================
const RAIN = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 1, 0.012), new THREE.MeshBasicMaterial({ color: 0xcfd8e0, transparent: true, opacity: 0.35, depthWrite: false }), 2600); RAIN.frustumCulled = false; scene.add(RAIN); RAIN.visible = false;
function rain(t, k, center, size = 60) { RAIN.visible = k > 0; if (!RAIN.visible) return; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), 0.28); RAIN.material.opacity = 0.35 * k;
  for (let i = 0; i < 2600; i++) { const x = (hash(i) - 0.5) * size, z = (hash(i + 0.3) - 0.5) * size, y = (((hash(i + 0.7) * size - t * 22) % size) + size) % size - size / 2; const L = 0.9 + hash(i + 0.9) * 1.2;
    m4.compose(V(center.x + x + y * 0.28, center.y + y, center.z + z), q, V(1, L, 1)); RAIN.setMatrixAt(i, m4); } RAIN.instanceMatrix.needsUpdate = true; }

// Manhattan across the harbour (behind her, ~3 km), hazy
{ const N = 700, g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x9ea6ae, roughness: 0.6, metalness: 0.3 }), N); const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { const x = (hash(i) - 0.5) * 2600, z = -2700 - hash(i + 1) * 900; const core = Math.exp(-Math.pow(x / 700, 2)); const h = 20 + Math.pow(hash(i + 2), 2.4) * 260 * (0.4 + core) + (i === 7 ? 380 : 0);
    m4.makeScale(18 + hash(i + 3) * 30, h, 18 + hash(i + 4) * 30).setPosition(i === 7 ? 120 : x, -2.5, z); im.setMatrixAt(i, m4); }
  WORLD.add(im); }
