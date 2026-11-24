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
