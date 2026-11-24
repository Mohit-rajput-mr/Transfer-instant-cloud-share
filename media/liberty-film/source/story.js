// Do you know the Statue of Liberty's skin is only as thick as two pennies? HD film on kit/hd.js (9:16).
// Real scale (metres, NPS "Statue Statistics"): ground to torch 92.99, pedestal top 46.94, heel to torch 46.05, heel to top
// of head 33.86, head (chin → cranium) 5.26, right arm 12.8, waist 10.67, tablet 7.19 × 4.14 × 0.61, index finger 2.44,
// copper skin 2.4 mm (3/32 in). Inside: Eiffel's iron pylon, a secondary frame and flat armature bars out to the skin.
// Morning over New York Harbor (Gerstner swell), an Atlantic storm (rain, sway ×20 labelled), the patina spreading.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
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
  // trees: Poly Haven "Island Tree 02" (CC0) baked once into an impostor (front view, sun side lit), drawn as crossed quads
  const IMP = await (async () => { const gl = await new GLTFLoader().loadAsync("kit/ph/island_tree_02/island_tree_02_1k.gltf"); const obj = gl.scene;
    const box = new THREE.Box3().setFromObject(obj); const sz = box.getSize(V()), c = box.getCenter(V()); const S = new THREE.Scene(); S.add(obj); S.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 1.2));
    const dl = new THREE.DirectionalLight(0xfff0d8, 2.2); dl.position.set(c.x + sz.x, c.y + sz.y * 1.2, c.z + sz.x * 1.6); dl.target.position.copy(c); S.add(dl, dl.target);
    const half = Math.max(sz.x, sz.z) / 2, size = 640, W = Math.round(size * (2 * half) / sz.y); const cam = new THREE.OrthographicCamera(-half, half, sz.y / 2, -sz.y / 2, 0.1, 1000); cam.position.set(c.x, c.y, c.z + half * 4); cam.lookAt(c);
    const rt = new THREE.WebGLRenderTarget(W, size, { samples: 4 }); rt.texture.colorSpace = THREE.LinearSRGBColorSpace; const r = H.r, pt = r.getRenderTarget(), pc = new THREE.Color(); r.getClearColor(pc); const pa = r.getClearAlpha();
    r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(S, cam); r.setRenderTarget(pt); r.setClearColor(pc, pa); obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    return { tex: rt.texture, w: 2 * half, h: sz.y }; })();
  const tq = (() => { const g1 = new THREE.PlaneGeometry(1, 1); g1.translate(0, 0.5, 0); const g2 = g1.clone(); g2.rotateY(Math.PI / 2); const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...g1.attributes.position.array, ...g2.attributes.position.array], 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute([...g1.attributes.uv.array, ...g2.attributes.uv.array], 2)); g.setIndex([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5]); return g; })();
  const TPOS = []; for (let i = 0; i < 420; i++) { const c = Math.floor(i / 3); const a = hash(c) * TAU, r = 95 + hash(c + 2) * 80; if (Math.abs(Math.sin(a - 1.57)) > 0.9 && Math.sin(a) > 0) continue; { const tx = Math.cos(a) * r, tz = Math.sin(a) * r; if (Math.hypot(tx - 30, tz - 120) < 34 || Math.hypot(tx - 22, tz - 92) < 26) continue; }   // keep the drone's climb clear
    TPOS.push([Math.cos(a) * r + (hash(i + 7) - 0.5) * 6, Math.sin(a) * r + (hash(i + 9) - 0.5) * 6, i]); }
  const trees = new THREE.InstancedMesh(tq, new THREE.MeshBasicMaterial({ map: IMP.tex, alphaTest: 0.42, side: THREE.DoubleSide, fog: true }), TPOS.length); const m4 = new THREE.Matrix4(), col = new THREE.Color();
  TPOS.forEach(([x, z, i], k) => { const hgt = 9 + hash(i) * 6, wdt = hgt * IMP.w / IMP.h; m4.compose(V(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), hash(i + 5) * TAU), V(wdt, hgt, wdt)); trees.setMatrixAt(k, m4);
    trees.setColorAt(k, col.setRGB(0.62 + hash(i + 3) * 0.2, 0.66 + hash(i + 7) * 0.16, 0.6 + hash(i + 9) * 0.14)); });
  trees.frustumCulled = false; WORLD.add(trees);
  const shadowTrees = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), TPOS.length);
  TPOS.forEach(([x, z, i], k) => { const hgt = 9 + hash(i) * 6; m4.makeScale(hgt * 0.8, hgt * 0.7, hgt * 0.8).setPosition(x, hgt * 0.62, z); shadowTrees.setMatrixAt(k, m4); }); shadowTrees.castShadow = true; shadowTrees.frustumCulled = false; WORLD.add(shadowTrees); }


// =====================================================================================================================
// FORT WOOD (11-point star) + FOUNDATION + PEDESTAL (granite): top at 46.94 m
// =====================================================================================================================
const PT = 46.94;
// pedestal: light grey Stony Creek granite (pinkish grey, as in the reference photos); Fort Wood: grey granite and concrete
const stoneT = (n, srgb, r) => tex(`kit/ph/concrete_wall_008/concrete_wall_008_${n}_1k.jpg`, srgb, r, r);
const granite = new THREE.MeshStandardMaterial({ map: stoneT("diff", true, 4), normalMap: stoneT("nor_gl", false, 4), roughness: 0.8, color: 0xf2e6dc });
const fortM = new THREE.MeshStandardMaterial({ map: stoneT("diff", true, 12), normalMap: stoneT("nor_gl", false, 12), roughness: 0.88, color: 0xd6d0c8 });
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
  box(26.4, 1.1, 26.4, 40.9); box(22.8, 3.6, 22.8, 42.0); box(24.0, 1.34, 24.0, 45.6);
  // rusticated corner pilasters on the shaft, a row of shields (discs) round the top parapet, a gallery rail under the loggia
  for (let f = 0; f < 4; f++) for (const sx of [-1, 1]) { const q = sh(new THREE.Mesh(new THREE.BoxGeometry(3.2, 9.2, 0.7), granite)); q.position.set(sx * 11.4, 28.8, 13.3); q.position.applyAxisAngle(V(0, 1, 0), (f * Math.PI) / 2); q.rotation.y = (f * Math.PI) / 2; PED.add(q);
      for (let k = 0; k < 6; k++) { const g = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 0.75), dark); g.position.set(sx * 11.4, 24.6 + k * 1.5, 13.32); g.position.applyAxisAngle(V(0, 1, 0), (f * Math.PI) / 2); g.rotation.y = (f * Math.PI) / 2; PED.add(g); } }
  for (let f = 0; f < 4; f++) for (let i = 0; i < 10; i++) { const d = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.25, 24), granite)); d.rotation.x = Math.PI / 2; d.position.set((i - 4.5) * 2.05, 43.8, 11.5); d.position.applyAxisAngle(V(0, 1, 0), (f * Math.PI) / 2); d.rotation.set(Math.PI / 2, 0, 0); d.rotateOnWorldAxis(V(0, 1, 0), (f * Math.PI) / 2); PED.add(d); }
  for (let f = 0; f < 4; f++) { const r = sh(new THREE.Mesh(new THREE.BoxGeometry(25.6, 0.9, 0.5), granite)); r.position.set(0, 34.0, 13.0); r.position.applyAxisAngle(V(0, 1, 0), (f * Math.PI) / 2); r.rotation.y = (f * Math.PI) / 2; PED.add(r); } }

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
// THE STATUE: the owner's model (media/liberty-model/USE_THIS_MODEL.md) — "Statue of Liberty model by VinceCZ (Printables
// #110125), CC BY 4.0", re-meshed (456k vertices, smooth normals) in media/kit/models/liberty/. Same transform as
// media/liberty-model/source/story.js: rotateX(-90°), centred in x/z, base at y = 0, scaled to 46.05 m heel → torch (NPS).
// Front = +z, her left (tablet) = +x. Landmarks (statue-local m): flame tip (-6.09, 46.05, 3.22), torch cup ≈ (-6.4, 43, 4.4),
// face ≈ (-1.6, 32.2, 1.6), tablet ≈ (5.5, 18, 0.5).
// Skin: the model's verdigris (rain-washed up-facing areas lighter, folds darker, brown streaks, hammered-copper normal
// noise, gilded flame) + this film's ageing from bright copper (1886, uAge 0) to patina (uAge 1), x-ray (uX), sway (uSway).
const patT = (n, srgb, r) => tex(`kit/ph/green_metal_rust/green_metal_rust_${n}_1k.jpg`, srgb, r, r);   // patina texture for the macro sheets (story_b)
SW.uTop = { value: 46.05 }; SW.uFlame = { value: 0.25 };
const skinMat = new THREE.MeshPhysicalMaterial({ color: 0x6fa497, roughness: 0.62, metalness: 0.18, clearcoat: 0.15, clearcoatRoughness: 0.6, transparent: true });
skinMat.onBeforeCompile = (s) => { Object.assign(s.uniforms, SW);
  s.vertexShader = swayVS(s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vOP; varying vec3 vON;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvOP = position; vON = normal;"));
  s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
    varying vec3 vOP; varying vec3 vON; uniform float uTop, uAge, uX, uHot, uFlame; float cover, flame;
    float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y), mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
    float fb(vec3 p){ return n3(p) * 0.5 + n3(p * 2.1) * 0.3 + n3(p * 4.3) * 0.2; }`)
    .replace("#include <color_fragment>", `#include <color_fragment>
      { vec3 n = normalize(vON); float up = n.y;
        float streak = fb(vec3(vOP.x * 3.0, vOP.y * 0.25, vOP.z * 3.0));
        vec3 light = vec3(0.50, 0.74, 0.66), dark = vec3(0.20, 0.36, 0.33), brown = vec3(0.32, 0.27, 0.19);
        vec3 c = mix(dark, light, clamp(0.45 + 0.55 * up + (streak - 0.5) * 0.7, 0.0, 1.0));
        c = mix(c, brown, smoothstep(0.62, 0.9, streak) * 0.35 * (1.0 - max(up, 0.0)));
        c *= 0.9 + 0.2 * fb(vOP * 9.0);
        float nz = n3(vOP * 0.45) * 0.55 + n3(vOP * 1.7) * 0.3 + n3(vOP * 6.0) * 0.15;
        cover = smoothstep(-0.06, 0.06, uAge * 1.35 - 0.2 - nz * 0.8 - 0.25 * (streak - 0.5) + 0.1 * up);
        vec3 copper = vec3(0.74, 0.42, 0.24) * (0.82 + 0.3 * fb(vOP * 7.0)) * (0.88 + 0.16 * max(up, 0.0));
        flame = smoothstep(uTop - 2.9, uTop - 2.6, vOP.y);
        diffuseColor.rgb = mix(mix(copper, c, cover), vec3(0.98, 0.72, 0.28), flame); }`)
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(0.36, roughnessFactor, cover), 0.22, flame);")
    .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(mix(0.62, metalnessFactor, cover), 1.0, flame);")
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      { vec3 q = vOP * 14.0; float e = 0.02; float b0 = fb(q); normal = normalize(normal + vec3(fb(q + vec3(e,0,0)) - b0, fb(q + vec3(0,e,0)) - b0, fb(q + vec3(0,0,e)) - b0) * 3.0); }`)
    .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.62, 0.25) * flame * uFlame;")
    .replace("#include <dithering_fragment>", `#include <dithering_fragment>
      { float edge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.35, 0.8, 1.0) * (0.04 + 1.0 * edge), uX);
        gl_FragColor.a = mix(1.0, 0.07 + 0.7 * edge, uX); }`); };
skinMat.customProgramCacheKey = () => "libskin-model";
const ST = new THREE.Group(); LIB.add(ST);
const lbuf = async (u, T) => new T(await (await fetch(u)).arrayBuffer());
const [LP, LN, LI] = await Promise.all([lbuf("kit/models/liberty/pos.bin", Float32Array), lbuf("kit/models/liberty/nor.bin", Float32Array), lbuf("kit/models/liberty/idx.bin", Uint32Array)]);
const LG = new THREE.BufferGeometry(); LG.setAttribute("position", new THREE.BufferAttribute(LP, 3)); LG.setAttribute("normal", new THREE.BufferAttribute(LN, 3)); LG.setIndex(new THREE.BufferAttribute(LI, 1));
LG.rotateX(-Math.PI / 2); LG.computeBoundingBox(); { const bb = LG.boundingBox; LG.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); }
LG.computeBoundingBox(); { const SC = 46.05 / LG.boundingBox.max.y; LG.scale(SC, SC, SC); } LG.computeBoundingBox(); LG.computeBoundingSphere();
const STATUE = sh(new THREE.Mesh(LG, skinMat)); ST.add(STATUE);
const TORCH_TIP = () => ST.localToWorld(V(-6.09, 46.05, 3.22));
// the skin envelope measured from the model (slices of 0.8 m, 24 sectors round the body, the raised arm and the tablet left
// out): the x-ray's secondary frame and armature bars reach to just inside this
const ENV = (() => { const p = LG.attributes.position.array, NS = 36, NA = 24, dy = 0.8; const cx = new Float32Array(NS), cz = new Float32Array(NS), n = new Float32Array(NS), R = new Float32Array(NS * NA);
  const skip = (x, y) => (x < -3.6 && y > 25.5) || (x > 4.4 && y > 14.5 && y < 26.5);
  for (let i = 0; i < p.length; i += 3) { const k = Math.floor(p[i + 1] / dy); if (k < 0 || k >= NS || skip(p[i], p[i + 1])) continue; cx[k] += p[i]; cz[k] += p[i + 2]; n[k]++; }
  for (let k = 0; k < NS; k++) { cx[k] = n[k] ? cx[k] / n[k] : -0.6; cz[k] = n[k] ? cz[k] / n[k] : 0.4; }
  for (let i = 0; i < p.length; i += 3) { const k = Math.floor(p[i + 1] / dy); if (k < 0 || k >= NS || skip(p[i], p[i + 1])) continue; const dx = p[i] - cx[k], dz = p[i + 2] - cz[k];
    const a = Math.floor(((Math.atan2(dz, dx) / TAU + 1) % 1) * NA) % NA; R[k * NA + a] = Math.max(R[k * NA + a], Math.hypot(dx, dz)); }
  return { NS, NA, dy, cx, cz, R }; })();
function bodyPoint(th, y, out) { const k = clamp(Math.floor(y / ENV.dy), 0, ENV.NS - 1), a = Math.floor(((th / TAU) % 1 + 1) % 1 * ENV.NA) % ENV.NA; const r = Math.max(0.8, (ENV.R[k * ENV.NA + a] || 2) * 0.9 - 0.35);
  return out.set(ENV.cx[k] + Math.cos(th) * r, y, ENV.cz[k] + Math.sin(th) * r); }
const ARM_R = [V(-3.9, 27.4, 0.5), V(-5.0, 30.5, 1.0), V(-5.5, 33.5, 2.0), V(-6.5, 37.0, 4.0)];   // raised right arm axis, measured on the model

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
{ const c = new THREE.CatmullRomCurve3([V(-1.5, 28.5, 0), ...ARM_R.slice(1), V(-6.4, 42.0, 4.4)]); const N = 26; const off = [[0.45, 0.45], [-0.45, 0.45], [-0.45, -0.45], [0.45, -0.45]];
  const P = (k, o) => c.getPointAt(k).add(V(o[0], 0, o[1]));
  for (const o of off) for (let i = 0; i < N; i++) beam(P(i / N, o), P((i + 1) / N, o), 0.14, 3);
  for (let i = 0; i < N; i++) for (let f = 0; f < 4; f++) { beam(P(i / N, off[f]), P((i + 1) / N, off[(f + 1) % 4]), 0.07, 3); beam(P(i / N, off[f]), P(i / N, off[(f + 1) % 4]), 0.07, 3); }
  for (let i = 2; i < N - 2; i += 2) { const p = c.getPointAt(i / N); for (let j = 0; j < 6; j++) { const a = (j / 6) * TAU; beam(p, p.clone().add(V(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0)), 0.05, 2); } } }
// head frame
for (let j = 0; j < 10; j++) { const a = (j / 10) * TAU; beam(V(-1.0, 28.6, -0.2), V(-1.3 + Math.cos(a) * 1.2, 31.6, Math.sin(a) * 1.4 + 0.1), 0.07, 1); }   // head frame (head ≈ x -1.3)
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
// =====================================================================================================================
// MACRO SET (its own place): a copper sheet edge, 2.4 mm, beside two pennies; the patina cross-section in the rain
// =====================================================================================================================
const MC = new THREE.Group(); MC.position.set(9000, 0, 0); scene.add(MC); MC.visible = false;
const MP = (x, y, z) => MC.position.clone().add(V(x, y, z));
const SKIN_T = 0.0024;
const copperMat = new THREE.MeshPhysicalMaterial({ color: 0xc8764a, metalness: 1, roughness: 0.26, clearcoat: 0.2 });
const patinaMat = new THREE.MeshStandardMaterial({ map: patT("diff", true, 0.4), normalMap: patT("nor_gl", false, 0.4), color: 0x9fd8c0, roughness: 0.8, metalness: 0.05 });
const benchMat = new THREE.MeshStandardMaterial({ map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 1, 1), normalMap: tex("kit/ph/wood_table_001/wood_table_001_nor_gl_1k.jpg", false, 1, 1), roughness: 0.6 });
const bench = sh(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.5), benchMat)); bench.position.y = -0.02; MC.add(bench);
// the sheet: a slightly wavy hammered copper plate, its cut edge to camera; a thin patina layer on top (green after 1900)
const SHEET = new THREE.Group(); MC.add(SHEET); SHEET.position.set(-0.05, 0.004, 0);
{ const g = new THREE.BoxGeometry(0.22, SKIN_T, 0.16, 60, 1, 40); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.0012 * Math.sin(p.getX(i) * 70) * Math.sin(p.getZ(i) * 50)); g.computeVertexNormals();
  SHEET.add(sh(new THREE.Mesh(g, copperMat))); }
const PATL = sh(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.0004, 0.16, 60, 1, 40), patinaMat)); PATL.position.y = SKIN_T / 2 + 0.00032; SHEET.add(PATL);
{ const p = PATL.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.0012 * Math.sin(p.getX(i) * 70) * Math.sin(p.getZ(i) * 50)); PATL.geometry.computeVertexNormals(); }
// two pennies (19.05 mm across), stacked
const PEN = new THREE.Group(); PEN.position.set(0.082, 0, 0.066); MC.add(PEN);
const pennyMat = new THREE.MeshPhysicalMaterial({ color: 0xb0643a, metalness: 1, roughness: 0.35 });
for (let i = 0; i < 2; i++) { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.009525, 0.009525, 0.00152, 64), pennyMat)); c.position.y = 0.00076 + i * 0.00153; c.rotation.y = i * 1.3; PEN.add(c);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0091, 0.0003, 6, 64), pennyMat); rim.rotation.x = Math.PI / 2; rim.position.y = 0.00153 * (i + 1); PEN.add(rim); }
// rain on the patina: drops falling, splashing, beading
const DROPS = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 0.9, thickness: 0.002, ior: 1.33, transparent: true, opacity: 0.85 }), 90); DROPS.frustumCulled = false; MC.add(DROPS);
function drops(t, k) { const m4 = new THREE.Matrix4(); for (let i = 0; i < 90; i++) { const x = (hash(i) - 0.5) * 0.18, z = (hash(i + 3) - 0.5) * 0.12; const ph = ((t * 0.9 + hash(i + 5)) % 1);
    let y, s; if (i < 50) { y = SKIN_T + 0.004 + (1 - ph) * 0.12; s = 0.0014 * k; m4.compose(MP(-0.05 + x, y, z), new THREE.Quaternion(), V(s, s * 1.6, s)); }
    else { s = (0.0018 + hash(i + 7) * 0.002) * k; m4.compose(MP(-0.05 + x, 0.004 + SKIN_T / 2 + 0.0004 + s * 0.35, z), new THREE.Quaternion(), V(s, s * 0.55, s)); }   // beads sitting on the patina
    DROPS.setMatrixAt(i, m4); } DROPS.instanceMatrix.needsUpdate = true; DROPS.visible = k > 0; }
const mcKey = new THREE.DirectionalLight(0xffe6cc, 2.2); mcKey.position.set(0.5, 0.8, 0.6); MC.add(mcKey, mcKey.target);
const mcRim = new THREE.DirectionalLight(0x9fc0ff, 1.4); mcRim.position.set(-0.6, 0.3, -0.5); MC.add(mcRim);

// =====================================================================================================================
// FLEX vs RIGID (its own place): two copper panels on bars from an iron post; wind loads them; the rigid one cracks
// =====================================================================================================================
const FX = new THREE.Group(); FX.position.set(11000, 0, 0); scene.add(FX); FX.visible = false;
const FP = (x, y, z) => FX.position.clone().add(V(x, y, z));
const fxFloor = sh(new THREE.Mesh(new THREE.PlaneGeometry(20, 20), matte(0x16191d, 0.9)), false, true); fxFloor.rotation.x = -Math.PI / 2; FX.add(fxFloor);
const panelU = [{ uStress: { value: 0 }, uCrack: { value: 0 } }, { uStress: { value: 0 }, uCrack: { value: 0 } }];
function panel(U) { const g = new THREE.PlaneGeometry(1.6, 2.2, 40, 50); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.12 * Math.cos(p.getX(i) * 1.6)); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: patT("diff", true, 1), normalMap: patT("nor_gl", false, 1), color: 0x9fd8c0, roughness: 0.75, metalness: 0.15, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => { Object.assign(s.uniforms, U); s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uStress, uCrack;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        { vec2 uvp = vMapUv; vec2 q = uvp - vec2(0.5, 0.62); float r = length(q * vec2(1.0, 1.4));
          totalEmissiveRadiance += vec3(1.0, 0.18, 0.05) * uStress * 1.6 * exp(-r * r * 9.0);
          float x = uvp.x - 0.5 - 0.06 * sin(uvp.y * 40.0) - 0.03 * sin(uvp.y * 97.0); float len = step(0.62 - 0.55 * uCrack, uvp.y) * step(uvp.y, 0.62 + 0.3 * uCrack);
          float crack = (1.0 - smoothstep(0.0, 0.006, abs(x))) * len * step(0.01, uCrack);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), crack); totalEmissiveRadiance += vec3(1.0, 0.45, 0.1) * crack * 2.0 * uStress; }`); };
  m.customProgramCacheKey = () => "panel" + (U === panelU[0] ? 0 : 1);
  return sh(new THREE.Mesh(g, m)); }
const FXP = [];
for (const [i, x] of [[0, -1.3], [1, 1.3]]) { const g = new THREE.Group(); g.position.set(x, 1.6, 0); FX.add(g);
  const post = sh(new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 0.16), metal(0x3a3e44, 0.5))); post.position.set(0, 0.1, -0.9); g.add(post);
  const pn = panel(panelU[i]); g.add(pn);
  const bars = []; for (const y of [-0.7, 0, 0.7]) { const b = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(0, y, -0.85), V(0, y, -0.02)), 8, i ? 0.018 : 0.045, 8), metal(i ? 0x6a6e74 : 0x4a4e54, 0.45)); g.add(b); bars.push({ m: b, y }); }
  FXP.push({ g, pn, bars }); }
// bend a flexible bar: a tube along a curve that bows with the load
function bendBars(f, d) { for (const b of f.bars) { const c = new THREE.QuadraticBezierCurve3(V(0, b.y, -0.85), V(d * 0.9, b.y + d * 0.2, -0.45), V(d, b.y, -0.02 + d * 0.05)); b.m.geometry.dispose(); b.m.geometry = new THREE.TubeGeometry(c, 16, 0.018, 8); } }
const fxKey = new THREE.DirectionalLight(0xfff0dd, 5.0); fxKey.position.set(3, 5, 4); FX.add(fxKey, fxKey.target);
const fxRim = new THREE.DirectionalLight(0x6fa8ff, 1.5); fxRim.position.set(-4, 2, -3); FX.add(fxRim);
const fxBack = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), new THREE.MeshBasicMaterial({ color: 0x0d1014 })); fxBack.position.set(0, 5, -6); FX.add(fxBack);

// =====================================================================================================================
// REPOUSSÉ WORKSHOP (Paris, 1880s): a carved wooden mould, a heated copper sheet hammered over it by a wooden mallet
// =====================================================================================================================
const WS = new THREE.Group(); WS.position.set(13000, 0, 0); scene.add(WS); WS.visible = false;
const WP = (x, y, z) => WS.position.clone().add(V(x, y, z));
const woodM = new THREE.MeshStandardMaterial({ map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 2), normalMap: tex("kit/ph/wood_table_001/wood_table_001_nor_gl_1k.jpg", false, 2, 2), roughness: 0.7, color: 0xd8b48a });
const moldH = (x, z) => 0.14 * Math.sin(x * 2.6 + 0.4) + 0.06 * Math.sin(x * 7.0 + z * 1.5) + 0.05 * Math.cos(z * 3.1) - 0.02 * x * x;   // a fold of her robe, carved in wood
{ const g = new THREE.PlaneGeometry(2.4, 1.6, 120, 80); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, moldH(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const mold = sh(new THREE.Mesh(g, woodM)); mold.position.y = 0.9; WS.add(mold);
  const base = sh(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.6), woodM)); base.position.y = 0.42; WS.add(base); }
const SH_G = new THREE.PlaneGeometry(2.0, 1.3, 100, 65); SH_G.rotateX(-Math.PI / 2); const SH0 = SH_G.attributes.position.array.slice();
const hotCopper = new THREE.MeshPhysicalMaterial({ color: 0xc8764a, metalness: 1, roughness: 0.32, side: THREE.DoubleSide, emissive: 0xff5a10, emissiveIntensity: 0 });
const SHT = sh(new THREE.Mesh(SH_G, hotCopper)); SHT.position.y = 0.9; WS.add(SHT);
const HITS = Array.from({ length: 60 }, (_, i) => ({ x: -0.85 + (i % 10) * 0.19 + (hash(i) - 0.5) * 0.08, z: -0.5 + Math.floor(i / 10) * 0.2 + (hash(i + 1) - 0.5) * 0.06 }));
const HIT_DT = 0.42;
/** form the sheet over the mould: k = how many hits have landed (fractional) */
function hammer(k) { const p = SH_G.attributes.position; const n = Math.min(HITS.length, Math.floor(k));
  for (let i = 0; i < p.count; i++) { const x = SH0[i * 3], z = SH0[i * 3 + 2]; let f = 0; for (let j = 0; j < n; j++) { const h = HITS[j]; f += Math.exp(-((x - h.x) ** 2 + (z - h.z) ** 2) / 0.02); }
    const dent = n ? 0.004 * Math.sin(x * 60) * Math.sin(z * 60) * Math.min(1, f) : 0; const top = 0.32;
    p.setY(i, lerp(top, moldH(x, z) + 0.006 + dent, Math.min(1, f * 0.9))); }
  p.needsUpdate = true; SH_G.computeVertexNormals(); }
// the mallet (wooden, as the repoussé craftsmen used); swings down onto the next spot
const MALLET = new THREE.Group(); WS.add(MALLET);
{ const head = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 24), woodM)); head.rotation.z = Math.PI / 2; MALLET.add(head);
  const handle = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.75, 12), woodM)); handle.position.set(0, 0.38, 0); MALLET.add(handle); }
function mallet(t, t0) { const k = (t - t0) / HIT_DT; const i = Math.max(0, Math.floor(k)), ph = k - i; const h = HITS[Math.min(i, HITS.length - 1)];
  const lift = ph < 0.7 ? Math.sin((ph / 0.7) * Math.PI * 0.5) : Math.cos(((ph - 0.7) / 0.3) * Math.PI * 0.5);
  const y = 0.9 + moldH(h.x, h.z) + 0.09 + lift * 0.45; MALLET.position.copy(WP(h.x + lift * 0.12, y, h.z + lift * 0.25)); MALLET.rotation.set(-lift * 0.9, 0, 0); return k; }
// the workshop: forge glow, giant plaster pieces (her index finger: 2.44 m), timber, dust in the light
const forgeL = new THREE.PointLight(0xff6a20, 0, 9, 2); forgeL.position.copy(V(-2.2, 1.2, -1.5)); WS.add(forgeL);
const forge = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), glow(0xff5a10, 2.2)); forge.position.set(-2.4, 0.9, -1.8); forge.scale.set(1.4, 0.5, 1); WS.add(forge);
const plaster = matte(0xe8e2d6, 0.95);
const finger = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 2.44 - 0.9, 8, 24), plaster)); finger.rotation.z = Math.PI / 2 - 0.1; finger.position.set(1.4, 0.5, -2.3); WS.add(finger);
const nail = sh(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), plaster)); nail.scale.set(1, 0.4, 0.8); nail.position.set(2.55, 0.68, -2.3); WS.add(nail);
const wsFloor = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: tex("kit/ph/concrete_wall_008/concrete_wall_008_diff_1k.jpg", true, 4, 4), color: 0x8a7a68, roughness: 0.95 })), false, true); wsFloor.rotation.x = -Math.PI / 2; WS.add(wsFloor);
const wsWall = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshStandardMaterial({ map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, 4, 2), color: 0x9a8a78, roughness: 0.95 })), false, true); wsWall.position.set(0, 3.5, -3.5); WS.add(wsWall);
for (let i = 0; i < 5; i++) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 14), woodM)); b.position.set(-4 + i * 2, 5, 0); WS.add(b); }
const wsKey = new THREE.SpotLight(0xffe2b8, 140, 16, 0.6, 0.6, 1.5); wsKey.position.set(2.5, 5.5, 2.5); wsKey.target.position.set(0, 0.9, 0); WS.add(wsKey, wsKey.target); wsKey.castShadow = true;
const DUST = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.1), transparent: true, opacity: 0.5, toneMapped: false }), 300); DUST.frustumCulled = false; WS.add(DUST);
function dust(t) { const m4 = new THREE.Matrix4(); for (let i = 0; i < 300; i++) { const s = 0.003 + hash(i) * 0.004; m4.compose(V((hash(i + 1) - 0.5) * 4 + Math.sin(t * 0.2 + i) * 0.1, 0.5 + hash(i + 2) * 3 + Math.sin(t * 0.13 + i * 3) * 0.1, (hash(i + 3) - 0.5) * 3), new THREE.Quaternion(), V(s, s, s)); DUST.setMatrixAt(i, m4); } DUST.instanceMatrix.needsUpdate = true; }

// =====================================================================================================================
// ORBI: a bench on the ferry pier, Liberty across the water; the file is locked on the phone before it leaves,
// scrambled blocks travel to a server that can't read them; unlocked on the laptop
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;

LIB.updateMatrixWorld(true);
{ const p = V(-55, 0, 172).applyAxisAngle(V(0, 1, 0), LIB.rotation.y); OR.position.set(p.x, 1.1, p.z); const d = V(0, 40, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-d.x, -d.z); }
const lock = makeLock(); OR.add(lock);
const ledge = sh(new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.4, 1.8, 3, 0.08), new THREE.MeshStandardMaterial({ map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, 2, 1), roughness: 0.85, color: 0xcfc6ba }))); ledge.position.set(0.2, -0.25, 0); OR.add(ledge);
lap.g.position.set(-1.0, 0, 0.1); lap.g.rotation.y = 0.3; ph.g.position.set(1.4, 0.06, 0.4); ph.g.rotation.set(-Math.PI / 2 + 0.5, 0, -0.2);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); OR.add(orbiL);
// scrambled blocks: little cubes with random hex on them
const hexTex = canvasHex(); function canvasHex() { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#06120c"; g.fillRect(0, 0, 256, 256); g.font = "700 30px M"; g.fillStyle = "#3dff8c"; H.reseed(9);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) g.fillText(Math.floor(H.rnd() * 256).toString(16).padStart(2, "0"), 14 + x * 62, 36 + y * 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const PARTS = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.16, 2, 0.02), new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) })); OR.add(m); return m; });
// the server: a rack in the distance (on the ledge's far end) whose screen shows only scrambled bytes
const RACK = new THREE.Group(); RACK.position.set(3.6, -0.05, -1.6); OR.add(RACK);
{ const body = sh(new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.9, 0.8, 3, 0.04), metal(0x22262b, 0.4))); body.position.y = 0.95; RACK.add(body);
  for (let i = 0; i < 10; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.02), metal(0x30353b, 0.35)); u.position.set(0, 0.25 + i * 0.16, 0.41); RACK.add(u);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glow(i % 3 ? 0x3dff8c : 0x6fd0ff, 3)); led.position.set(0.33, 0.25 + i * 0.16, 0.425); RACK.add(led); } }
const rackScr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false })); rackScr.position.set(0, 2.2, 0.1); RACK.add(rackScr);
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.got > 0) { g.fillStyle = "rgba(8,10,14,.9)"; rr(g, 60, 690, 860, 170, 26); g.fill(); g.fillStyle = "#fff"; g.font = "700 32px M"; g.fillText("liberty-island.zip  ·  2.4 GB", 96, 742);
    g.fillStyle = green; rr(g, 96, 772, 780 * Math.min(1, st.got), 28, 10); g.fill(); g.font = "700 28px M"; g.fillText(st.got >= 1 ? "✓ UNLOCKED ON THIS DEVICE" : `RECEIVING ${Math.round(st.got * 100)}%`, 96, 846); } }
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (st.lock > 0) { g.fillStyle = "rgba(8,10,14,.9)"; rr(g, 70, 1160, 640, 200, 30); g.fill(); g.fillStyle = green; g.font = "800 40px M"; g.fillText(st.lock >= 1 ? "🔒 LOCKED ON THIS PHONE" : `LOCKING ${Math.round(st.lock * 100)}%`, 110, 1235);
    g.fillStyle = "#cfd6dd"; g.font = "700 30px M"; g.fillText("AES-256 · before it leaves", 110, 1300); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  h93: ["93 m", "#3dff8c", "ground to torch"], skin: ["Copper skin", "#ff9a5c", "2.4 mm thick"], pen: ["Two pennies", "#ffd166", "stacked"],
  pylon: ["Iron pylon", "#3dff8c", "Eiffel's tower inside"], sec: ["Secondary frame", "#ffd166", "follows her shape"], bars: ["Flat iron bars", "#6fd0ff", "out to the skin"],
  arm: ["Arm truss", "#ff8a3d", "carries the torch"], rigid: ["Rigid", "#ff6a4d", "stress piles up"], flexi: ["Flexible", "#3dff8c", "bends, then springs back"],
  torch: ["Torch", "#9fd4ff", "sways up to 6 in"], mold: ["Wooden mould", "#ffd166", "carved to her shape"], sheet: ["Copper sheet", "#ff9a5c", "heated, then hammered"],
  finger: ["Her index finger", "#cfd6dd", "2.44 m long"], pat: ["Green patina", "#7dffc0", "protects"], cu: ["Copper", "#ff9a5c", "beneath"],
  lockL: ["Locked here", green, "before it leaves"], stair: ["Stairs to the crown", "#ffd166", "visitors climb inside her"], srv: ["Server", "#8fd0ff", "sees scrambled bytes"],
});
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["UNVEILED", "1886"], ["TO THE TORCH", "93 m"], ["SKIN", "2.4 mm"]].map(([a, b]) => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 60px D;font-stretch:112%;color:#fff;margin-top:6px">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 190px/0.85 D;font-stretch:112%;color:#ff9a5c;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 44px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd" id="exT">MOTION EXAGGERATED</div>`, { left: "300px", top: "1110px" });
hudEl("sway", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["BODY", "≈ 3 in", "#9fd4ff"], ["TORCH", "≈ 6 in", "#ff8a3d"]].map(([a, b, c]) => `<div style="padding:18px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;color:${c}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("year", `<div style="width:1080px;text-align:center"><div id="yrN" style="font:900 200px/0.85 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.65)">1886</div><div id="yrL" style="font:800 40px D;color:#ff9a5c;letter-spacing:.14em;margin-top:10px">SHINY COPPER</div></div>`, { left: "0px", top: "220px" });
hudEl("lexag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">LAYER THICKNESS EXAGGERATED</div>`, { left: "250px", top: "1110px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["AES-256", "NO ACCOUNT", "NO APP"].map((s) => `<div style="padding:18px 26px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 38px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ff9a5c") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
LIB.updateMatrixWorld(true);
const SL = (x, y, z) => LIB.localToWorld(V(x, y, z));             // statue-local → world (y = 0 at her heel)
const LW = (x, y, z) => SL(x, y, z);
const MPv = MP, FPv = FP, WPv = WP;
function look_(storm) { const s = storm; H.key.intensity = lerp(3.0, 0.7, s); H.hemi.intensity = lerp(0.85, 0.55, s); H.envK.value = lerp(0.4, 0.25, s); SKYU.uStorm.value = s;
  scene.fog.color.copy(FOG.c).lerp(new THREE.Color(0x5a6168), s); scene.fog.density = lerp(FOG.d, 0.0009, s); sea.material.uniforms.uAmp.value = lerp(1, 2.6, s); H.rimA.intensity = 0.2; H.rimB.intensity = 0.35;
  sea.material.uniforms.sunColor.value.set(0xffe0b8).multiplyScalar(1 - s * 0.9); }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
function outdoor(on) { sky.visible = on; sea.visible = on; WORLD.visible = on; PED.visible = on; LIB.visible = on; scene.background = on ? null : new THREE.Color(0x0b0d10); }
const EX = 20;   // sway shown ×20

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
H.frame("Locked on your device. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0);
  outdoor(true); MC.visible = FX.visible = WS.visible = OR.visible = false; RAIN.visible = false; camRange(0.5, 70000); look_(0); H.zoom = 1; H.bloom.strength = 0.3;
  SW.uX.value = 0; SW.uAge.value = 1; SW.uSway.value.set(0, 0); skelGlow([0, 0, 0, 0]); SKEL.visible = false; STAIR.visible = false; GULLS.visible = true; gulls(t, SL(0, 0, 0)); keyShadow(SL(0, 10, 0), 70);
  sea.material.uniforms.time.value = t * 0.5; sea.material.uniforms.uWT.value = t; SKYU.uT.value = t; SW.uFlame.value = 0.25;

  if (t < at("statue")) { // HOOK: dawn from the water, low over the swell; then the torch against the sunrise
    const c = fr("hook", 0.55);
    if (t < c) { move(t, 0, c, [SL(-40, -45, 230), SL(0, 20, 0), 34], [SL(-30, -38, 190), SL(0, 26, 0), 34], 0.5); title(t, fr("hook", 0.03), c, "New York Harbor", "Two pennies thin", 150); }
    else move(t, c, at("statue"), [SL(-30, 34, 30), SL(-6.3, 42.5, 4.2), 36], [SL(-24, 38, 26), SL(-6.2, 44.5, 4.0), 36], 0.3);
  } else if (t < at("skin")) { // drone rising from the fort to the torch: 93 m
    keyShadow(SL(0, -10, 0), 80); move(t, at("statue"), at("skin"), [SL(30, -42, 120), SL(0, -25, 0), 38], [SL(18, 30, 70), SL(-3, 30, 0), 38], 0.3);
    callout("h93", t, fr("statue", 0.45), at("skin"), TORCH_TIP(), 300, 420); hudShow("stats", win(t, fr("statue", 0.2), at("skin")));
  } else if (t < at("hollow")) { // macro: the sheet edge, 2.4 mm, beside two pennies
    outdoor(false); MC.visible = true; camRange(0.002, 50); H.key.intensity = 0.4; H.hemi.intensity = 0.4; H.envK.value = 0.9; drops(t, 0); H.bloom.strength = 0.2;
    move(t, at("skin"), at("hollow"), [MP(0.075, 0.016, 0.2), MP(0.062, 0.003, 0.066), 28], [MP(0.07, 0.013, 0.18), MP(0.064, 0.003, 0.066), 26], 0.01);
    setBig("2.4 mm", "COPPER SKIN"); hudShow("big", win(t, fr("skin", 0.1), at("hollow")));
    callout("skin", t, fr("skin", 0.2), fr("skin", 0.6), MP(0.05, 0.004, 0.08), 300, 1150); callout("pen", t, fr("skin", 0.55), at("hollow"), MP(0.082, 0.003, 0.066), 760, 1150);
  } else if (t < at("pylon")) { // storm rolls in; "look inside": she turns to x-ray, Eiffel's skeleton appears
    const s = smooth(prog(t, at("hollow"), fr("hollow", 0.5))); look_(s); rain(t, s, H.cam.position, 50); SKEL.visible = true; STAIR.visible = t > at("frame"); GULLS.visible = false;
    const x = t < at("frame") ? smooth(prog(t, fr("hollow", 0.7), at("frame"))) : 1; SW.uX.value = x; skelGlow([t > at("frame") ? smooth(prog(t, at("frame"), fr("frame", 0.4))) : 0, 0, 0, 0]);
    if (t < at("frame")) move(t, at("hollow"), at("frame"), [SL(70, -20, 120), SL(0, 10, 0), 38], [SL(55, -12, 95), SL(0, 14, 0), 38], 0.3);
    else { move(t, at("frame"), at("pylon"), [SL(40, 5, 55), SL(0, 14, 0), 40], [SL(30, 14, 44), SL(0, 18, 0), 40], 0.2); callout("pylon", t, fr("frame", 0.35), fr("frame", 0.7), SL(1.5, 12, 1.2), 760, 1150); callout("stair", t, fr("frame", 0.7), at("pylon"), SL(-2.6, 20, 1.5), 300, 1100); }
  } else if (t < at("flex")) { // the pylon, the secondary frame, the flat bars to the skin, the arm truss
    look_(1); rain(t, 1, H.cam.position, 50); SKEL.visible = true; STAIR.visible = true; GULLS.visible = false; SW.uX.value = 1;
    skelGlow([0.5, smooth(prog(t, at("pylon"), fr("pylon", 0.3))), smooth(prog(t, fr("pylon", 0.45), fr("pylon", 0.7))), smooth(prog(t, fr("pylon", 0.7), fr("pylon", 0.9)))]);
    move(t, at("pylon"), at("flex"), [SL(-16, 6, 26), SL(0, 16, 0), 40], [SL(-20, 22, 24), SL(-3, 26, 0), 40], 0.2);
    callout("sec", t, fr("pylon", 0.1), fr("pylon", 0.45), SL(RINGS[6][18][0].x, RINGS[6][18][0].y, RINGS[6][18][0].z), 300, 1150);
    callout("bars", t, fr("pylon", 0.45), fr("pylon", 0.75), SL(RINGS[10][12][1].x, RINGS[10][12][1].y, RINGS[10][12][1].z), 760, 1100);
    callout("arm", t, fr("pylon", 0.75), at("flex"), SL(-6.0, 35.5, 3.0), 300, 520);
  } else if (t < at("sway")) { // RIGID vs FLEXIBLE: wind loads both panels; the rigid one piles up stress and cracks
    outdoor(false); FX.visible = true; camRange(0.05, 200); H.bloom.strength = 0.45; H.key.intensity = 0.3; H.hemi.intensity = 0.9;
    const load = 0.5 + 0.5 * Math.sin((t - at("flex")) * 3.2); const k = prog(t, at("flex"), fr("flex", 0.85));
    panelU[0].uStress.value = smooth(k) * (0.6 + 0.4 * load); panelU[0].uCrack.value = smooth(prog(t, fr("flex", 0.55), fr("flex", 0.9)));
    FXP[0].pn.position.z = 0.01 * load; FXP[1].pn.position.z = 0.16 * load; bendBars(FXP[1], 0.16 * load); FXP[1].pn.rotation.y = 0.05 * load;
    move(t, at("flex"), at("sway"), [FP(3.4, 5.0, 8.4), FP(0, 1.5, -0.3), 40], [FP(3.0, 4.7, 7.8), FP(0, 1.5, -0.3), 40], 0.05);
    callout("rigid", t, fr("flex", 0.15), at("sway"), FP(-1.3, 2.6, 0.1), 140, 520); callout("flexi", t, fr("flex", 0.3), at("sway"), FP(1.3, 2.6, 0.1), 600, 520);
  } else if (t < at("hammer")) { // the storm: she sways (×20), the torch twice as much
    GULLS.visible = false; look_(1); rain(t, 1, H.cam.position, 50); const sw = 0.152 * EX * Math.sin((t - at("sway")) * 1.3); SW.uSway.value.set(sw, 0); flash(t, fr("sway", 0.3), 0.5, 6, "#dfe8ff");
    move(t, at("sway"), at("hammer"), [SL(0, -30, 150), SL(0, 14, 0), 36], [SL(8, -26, 140), SL(0, 16, 0), 36], 0.2);
    hudShow("exag", win(t, fr("sway", 0.15), at("hammer"))); H.$("exT").textContent = "MOTION EXAGGERATED ×20"; hudShow("sway", win(t, fr("sway", 0.3), at("hammer")));
    const tip = TORCH_TIP(); tip.add(V(sw, 0, 0).applyAxisAngle(V(0, 1, 0), LIB.rotation.y)); callout("torch", t, fr("sway", 0.45), at("hammer"), tip, 760, 420);
  } else if (t < at("brown")) { // repoussé: a heated sheet hammered over a wooden mould
    outdoor(false); WS.visible = true; camRange(0.02, 100); scene.background = new THREE.Color(0x120c08); H.key.intensity = 0.2; H.hemi.intensity = 0.9; H.envK.value = 0.5; H.bloom.strength = 0.35;
    forgeL.intensity = 3 + Math.sin(t * 9) * 0.4; dust(t); const k = mallet(t, at("hammer")); hammer(k); hotCopper.emissiveIntensity = 0.45 * Math.exp(-(t - at("hammer")) * 0.35);
    const c = fr("hammer", 0.6);
    if (t < c) move(t, at("hammer"), c, [WP(1.6, 2.4, 2.8), WP(0, 0.95, 0), 38], [WP(1.3, 2.2, 2.4), WP(-0.1, 0.95, 0), 36], 0.03);
    else move(t, c, at("brown"), [WP(-1.6, 1.8, 2.2), WP(0.6, 0.9, -1.0), 40], [WP(-1.3, 1.7, 2.0), WP(0.8, 0.9, -1.2), 40], 0.03);
    callout("sheet", t, fr("hammer", 0.1), fr("hammer", 0.4), WP(0.5, 1.05, 0.4), 760, 1150); callout("mold", t, fr("hammer", 0.3), c, WP(-1.1, 0.7, 0.81), 300, 1150);
    callout("finger", t, c + 0.3, at("brown"), WP(1.4, 0.95, -2.3), 760, 1050);
  } else if (t < at("protect")) { // 1886: shiny copper brown → after 1900 the green patina spreads
    keyShadow(SL(0, 25, 0), 30); const yr = t < at("green") ? 1886 : Math.round(lerp(1886, 1920, smooth(prog(t, at("green"), fr("green", 0.9)))));
    SW.uAge.value = t < at("green") ? 0 : smooth(prog(t, fr("green", 0.2), fr("green", 0.95))); SW.uFlame.value = 0.1;
    H.$("yrN").textContent = String(yr); H.$("yrL").textContent = yr < 1900 ? "SHINY COPPER" : yr < 1906 ? "TURNING" : "GREEN PATINA"; H.$("yrL").style.color = yr < 1900 ? "#ff9a5c" : "#7dffc0";
    hudShow("year", win(t, at("brown") + 0.2, at("protect")));
    if (t < at("green")) move(t, at("brown"), at("green"), [SL(46, 8, 100), SL(-1, 23, 0), 34], [SL(40, 10, 92), SL(-1, 24, 0), 34], 0.2);
    else move(t, at("green"), at("protect"), [SL(26, 16, 60), SL(0, 24, 0), 36], [SL(34, 12, 76), SL(0, 22, 0), 38], 0.2);
  } else if (t < at("orbi")) { // macro: the green layer protects the copper beneath, rain beads on it
    outdoor(false); MC.visible = true; camRange(0.002, 50); H.key.intensity = 0.35; H.hemi.intensity = 0.4; H.envK.value = 0.9; drops(t, 1); H.bloom.strength = 0.2;
    move(t, at("protect"), at("orbi"), [MP(-0.02, 0.012, 0.17), MP(-0.04, 0.004, 0.08), 24], [MP(-0.025, 0.01, 0.155), MP(-0.04, 0.004, 0.08), 22], 0.01);
    callout("pat", t, fr("protect", 0.3), at("orbi"), MP(-0.08, 0.0045, 0.08), 300, 1100); callout("cu", t, fr("protect", 0.5), at("orbi"), MP(-0.02, 0.002, 0.08), 760, 1250); hudShow("lexag", win(t, fr("protect", 0.3), at("orbi")));
  } else { // ORBI: on the pier, Liberty across the lawn; locked on the phone → scrambled → unlocked on the laptop
    OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); orbiL.intensity = 0.6; OR.updateMatrixWorld(); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const lk = clamp(prog(t, fr("orbi", 0.3), fr("orbi2", 0.6))); const got = clamp(prog(t, fr("orbi3", 0.3), fr("orbi3", 0.9)));
    screen(ph, { lock: Math.round(lk * 40) / 40 }, drawPhone); screen(lap, { got: Math.round(got * 40) / 40 }, drawLap);
    lock.visible = t > at("orbi3"); lock.position.copy(ph.g.position).add(V(0, 0.32 + 0.02 * Math.sin(t * 2), 0)); lock.scale.setScalar(0.45);
    const a0 = ph.g.position.clone().add(V(0, 0.3, 0)), s0 = RACK.position.clone().add(V(0, 1.4, 0.5)), b0 = lap.g.position.clone().add(V(0.2, 0.9, 0.2));
    PARTS.forEach((m, i) => { const st = fr("orbi2", 0.5) + i * 0.22, k = clamp((t - st) / 1.3), k2 = clamp((t - fr("orbi3", 0.2) - i * 0.12) / 1.0);
      m.visible = k > 0 && k2 < 1; if (k2 > 0) m.position.copy(s0).lerp(b0, ease(k2)).add(V(0, Math.sin(k2 * Math.PI) * 0.6, 0)); else m.position.copy(a0).lerp(s0, ease(k)).add(V(0, Math.sin(k * Math.PI) * 0.8, ((i % 4) - 1.5) * 0.12)); m.rotation.set(t * 2 + i, t * 1.5, 0); });
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.4, 1.7, 9.5), OW(0.3, 3.6, 0), 46], [OW(0.4, 1.6, 8.2), OW(0.3, 3.4, 0), 46], 0.3);
    else if (t < at("orbi3")) { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, at("orbi2"), at("orbi3"), [OW(...pc.clone().addScaledVector(pn, 3.4).toArray()), OW(...pc.toArray()), 34], [OW(...pc.clone().addScaledVector(pn, 3.1).toArray()), OW(...pc.toArray()), 34], 0.03);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); }
    else { move(t, at("orbi3"), at("end"), [OW(1.0, 2.0, 7.8), OW(1.6, 2.4, -0.6), 44], [OW(0.8, 1.9, 7.0), OW(1.6, 2.4, -0.6), 44], 0.2); callout("srv", t, fr("orbi3", 0.05), fr("orbi3", 0.6), OW(3.6, 2.15, -1.5), 760, 900); hudShow("chips", win(t, fr("orbi3", 0.5), at("end"))); }
  }
  if (window.DBG) { const d = window.DBG[0].split(",").map(Number); look(SL(d[0], d[1], d[2]), SL(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
