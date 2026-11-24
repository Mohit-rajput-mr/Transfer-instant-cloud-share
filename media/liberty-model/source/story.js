// Statue of Liberty — hero model test (kit/hd.js). The statue is a detailed sculpt (Printables #110125, CC BY, see README),
// re-meshed with welded smooth normals, in verdigris copper with a gilded flame, on a procedural Hunt pedestal and the
// 11-point star of Fort Wood, on Liberty Island in New York Harbor at golden hour. Real scale in metres.
// Shots by time (s): 0 hero ¾ from the water · 1 low front · 2 face · 3 torch · 4 tablet · 5 back ¾ · 6 aerial · 7 side profile
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
const { V, move, look } = H;
const scene = H.scene, TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
H.floor.visible = false; H.backdrop.visible = false; H.cam.near = 0.1; H.cam.far = 20000; H.cam.updateProjectionMatrix();

// ---------- sky + light (golden hour from the south-west) ----------
const SUN = V(-0.55, 0.32, 0.77).normalize();
const skyTex = tex("kit/ph/kloofendal_48d_partly_cloudy_puresky/sky_4k.jpg", true); skyTex.repeat.set(1, 1);
const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSky: { value: skyTex }, uSun: { value: SUN } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun; varying vec3 vD; void main(){ vec3 d = normalize(vD);
    vec3 c = texture2D(uSky, vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb;
    float sd = max(dot(d, uSun), 0.0); c = mix(c, c * vec3(1.25, 1.0, 0.78), 0.55); c += vec3(1.0, 0.72, 0.4) * pow(sd, 18.0) * 0.6 + vec3(1.2, 0.95, 0.7) * pow(sd, 900.0) * 6.0;
    if (d.y < 0.0) c = vec3(0.55, 0.6, 0.62); gl_FragColor = vec4(c, 1.0); }` }));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
scene.fog = new THREE.FogExp2(0xc7c2b8, 0.00028);
H.key.color.set(0xffd9a8); H.key.intensity = 4.2; H.hemi.color.set(0xbfd6ff); H.hemi.groundColor.set(0x6b5f4f); H.hemi.intensity = 0.8; H.envK.value = 0.55;
H.rimA.color.set(0x8fb4ff); H.rimA.intensity = 0.7; H.rimB.intensity = 0.0;
function keyAt(c, r) { H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 3))); const s = H.key.shadow.camera; Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 7 }); s.updateProjectionMatrix(); H.key.shadow.mapSize.set(4096, 4096); H.key.shadow.bias = -0.0003; H.key.shadow.normalBias = r * 0.0008; }

// ---------- Liberty Island: the 11-point star of Fort Wood + the Hunt pedestal ----------
const ISL = new THREE.Group(); scene.add(ISL);
const gr = (n, srgb, rx, ry) => tex(`kit/ph/granite_tile/granite_tile_${n}_1k.jpg`, srgb, rx, ry);
const rw = (n, srgb, rx, ry) => tex(`kit/ph/rock_wall_08/rock_wall_08_${n}_1k.jpg`, srgb, rx, ry);
const granite = new THREE.MeshPhysicalMaterial({ color: 0xd8c9b4, normalMap: gr("nor_gl", false, 2, 2), normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.7 });
const fortStone = new THREE.MeshPhysicalMaterial({ color: 0xcbbca4, normalMap: rw("nor_gl", false, 6, 1.2), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.9 });
const concrete = new THREE.MeshStandardMaterial({ color: 0xd7d0c2, roughness: 0.85, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 6, 6) });
// the star fort (Fort Wood, 1811): 11 points, ~ 6.5 m walls, the pedestal rises from its middle
const FORT_H = 6.5;
{ const s = new THREE.Shape(); const N = 11, R1 = 68, R0 = 46;
  for (let i = 0; i < N * 2; i++) { const a = i / (N * 2) * TAU + Math.PI / 2, r = i % 2 ? R0 : R1; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: FORT_H, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 1 }); g.rotateX(-Math.PI / 2);
  const fort = new THREE.Mesh(g, fortStone); fort.castShadow = fort.receiveShadow = true; ISL.add(fort);
  const top = new THREE.Mesh(new THREE.ShapeGeometry(s), concrete); top.rotation.x = -Math.PI / 2; top.position.y = FORT_H + 0.42; top.receiveShadow = true; ISL.add(top); }
// Hunt's pedestal (1886): ~ 27 m granite, a stepped base, the shaft with Doric pilasters + loggia openings, the balcony, the top
const PED_TOP = FORT_H + 27 + 20 * 0.0; // the 20 m concrete foundation is inside the fort here
const pedestal = new THREE.Group(); pedestal.position.y = FORT_H; ISL.add(pedestal);
{ const box = (w, h, d, y, m = granite) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.15), m); b.position.y = y + h / 2; b.castShadow = b.receiveShadow = true; pedestal.add(b); return b; };
  box(28, 2.2, 28, 0); box(25.5, 2.0, 25.5, 2.2); box(23.5, 1.4, 23.5, 4.2);
  box(19.5, 10.5, 19.5, 5.6);                                     // the main shaft
  // pilasters (4 per face) + dark loggia openings with small balconies
  for (let f = 0; f < 4; f++) { const a = f * Math.PI / 2, dir = V(Math.sin(a), 0, Math.cos(a)), side = V(Math.cos(a), 0, -Math.sin(a));
    for (const k of [-1.5, -0.5, 0.5, 1.5]) { const p = new THREE.Mesh(new RoundedBoxGeometry(1.1, 9.8, 0.7, 2, 0.1), granite); p.position.copy(dir.clone().multiplyScalar(9.95).add(side.clone().multiplyScalar(k * 4.2))); p.position.y = 5.6 + 4.9; p.rotation.y = a; p.castShadow = true; pedestal.add(p); }
    for (const k of [-1, 0, 1]) { const o = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.2), new THREE.MeshStandardMaterial({ color: 0x1b1a18, roughness: 1 })); o.position.copy(dir.clone().multiplyScalar(9.78).add(side.clone().multiplyScalar(k * 4.2))); o.position.y = 5.6 + 4.6; o.rotation.y = a; pedestal.add(o);
      const sh = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.35, 0.9, 2, 0.1), granite); sh.position.copy(dir.clone().multiplyScalar(10.1).add(side.clone().multiplyScalar(k * 4.2))); sh.position.y = 5.6 + 1.8; sh.rotation.y = a; pedestal.add(sh); }
    // the round shields band
    for (const k of [-1.5, -0.5, 0.5, 1.5]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 24), granite); d.rotation.x = Math.PI / 2; d.rotation.y = a; d.position.copy(dir.clone().multiplyScalar(10.0).add(side.clone().multiplyScalar(k * 4.2))); d.position.y = 17.4; d.lookAt(d.position.clone().add(dir)); pedestal.add(d); } }
  box(21, 1.2, 21, 16.1); box(18.5, 3.4, 18.5, 17.3); box(20, 0.9, 20, 20.7);   // cornice, the shield band, the balcony
  box(17.5, 4.6, 17.5, 21.6); box(16.5, 0.8, 16.5, 26.2);                       // the top, the parapet
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; const r = 9.8 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); if (r > 13.5) continue; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 8), granite); b.position.set(Math.sin(a) * Math.min(r, 9.9), 21.15, Math.cos(a) * Math.min(r, 9.9)); pedestal.add(b); } }
const STATUE_BASE = FORT_H + 27;

// ---------- the statue ----------
const buf = async (u, T) => new T(await (await fetch(u)).arrayBuffer());
const [P, N, I] = await Promise.all([buf("kit/models/liberty/pos.bin", Float32Array), buf("kit/models/liberty/nor.bin", Float32Array), buf("kit/models/liberty/idx.bin", Uint32Array)]);
const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3)); g.setIndex(new THREE.BufferAttribute(I, 1));
g.rotateX(-Math.PI / 2); g.computeBoundingBox();
{ const bb = g.boundingBox; g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); }
// model units → metres: base of the sculpt to the tip of the flame = 46.05 m (NPS: heel to top of torch 46.05 m; this sculpt has a thin plinth)
g.computeBoundingBox(); const SC = 46.05 / g.boundingBox.max.y; g.scale(SC, SC, SC); g.computeBoundingBox();
const TOP = g.boundingBox.max.y;
// verdigris: lighter blue-green on up-facing / rain-washed areas, darker teal + brown streaks in folds and under overhangs,
// fine hammered-copper texture (repoussé) as normal noise; the flame (top ~6%) is gilded
const patina = new THREE.MeshPhysicalMaterial({ color: 0x6fa497, roughness: 0.62, metalness: 0.18, clearcoat: 0.15, clearcoatRoughness: 0.6 });
patina.onBeforeCompile = (s) => {
  s.uniforms.uTop = { value: TOP };
  s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vOP; varying vec3 vON;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvOP = position; vON = normal;");
  s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
    varying vec3 vOP; varying vec3 vON; uniform float uTop;
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
        float flame = smoothstep(uTop - 2.9, uTop - 2.6, vOP.y);
        diffuseColor.rgb = mix(c, vec3(0.98, 0.72, 0.28), flame); }`)
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      { float flame = smoothstep(uTop - 2.9, uTop - 2.6, vOP.y); roughnessFactor = mix(roughnessFactor, 0.22, flame); }`)
    .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
      { float flame = smoothstep(uTop - 2.9, uTop - 2.6, vOP.y); metalnessFactor = mix(metalnessFactor, 1.0, flame); }`)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      { vec3 q = vOP * 14.0; float e = 0.02; float b0 = fb(q); normal = normalize(normal + vec3(fb(q + vec3(e,0,0)) - b0, fb(q + vec3(0,e,0)) - b0, fb(q + vec3(0,0,e)) - b0) * 3.0); }`);
};
patina.customProgramCacheKey = () => "patina";
const statue = new THREE.Mesh(g, patina); statue.castShadow = statue.receiveShadow = true; statue.position.y = STATUE_BASE; scene.add(statue);

// ---------- the harbour: water, the island lawn, Manhattan on the horizon ----------
const WU = { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uT: { value: 0 }, uSky: { value: skyTex }, uSun: { value: SUN } };
const water = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000, 1, 1), new THREE.ShaderMaterial({ uniforms: WU, fog: true,
  vertexShader: `varying vec3 vW; #include <fog_pars_vertex>
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
    }`.replace("varying vec3 vW; #include <fog_pars_vertex>", "varying vec3 vW;\n#include <fog_pars_vertex>"),
  fragmentShader: `uniform float uT; uniform sampler2D uSky; uniform vec3 uSun; varying vec3 vW;
    #include <fog_pars_fragment>
    vec2 wv(vec2 p, float t){ return vec2(sin(p.x * 0.11 + t * 0.9) + sin(p.x * 0.23 - p.y * 0.17 + t * 1.3) * 0.6 + sin(p.y * 0.41 + t * 1.7) * 0.3,
      cos(p.y * 0.13 + t * 1.1) + cos(p.y * 0.29 + p.x * 0.19 + t * 1.5) * 0.6 + cos(p.x * 0.47 + t * 2.1) * 0.3); }
    void main(){ vec2 d = wv(vW.xz, uT) * 0.07 + wv(vW.xz * 3.1, uT * 1.6) * 0.03; vec3 n = normalize(vec3(d.x, 1.0, d.y));
      vec3 V = normalize(cameraPosition - vW); vec3 R = reflect(-V, n); R.y = abs(R.y);
      vec3 sk = texture2D(uSky, vec2(atan(R.z, R.x) / 6.2831853 + 0.5, asin(clamp(R.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb * vec3(1.15, 1.0, 0.85);
      float F = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
      vec3 deep = vec3(0.07, 0.14, 0.16); vec3 c = mix(deep, sk, F) + vec3(1.0, 0.75, 0.45) * pow(max(dot(R, uSun), 0.0), 220.0) * 3.0;
      gl_FragColor = vec4(c, 1.0);
      #include <fog_fragment>
    }` }));
water.rotation.x = -Math.PI / 2; water.position.y = -0.4; scene.add(water);
{ // the island: lawn + paths + trees around the fort
  const isl = new THREE.Mesh(new THREE.CircleGeometry(180, 96), new THREE.MeshStandardMaterial({ color: 0x9cbf73, roughness: 0.95, map: tex("kit/ph/aerial_grass_rock/aerial_grass_rock_diff_2k.jpg", true, 14, 14) })); isl.rotation.x = -Math.PI / 2; isl.position.y = 0.05; isl.receiveShadow = true; ISL.add(isl);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(84, 64), concrete); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.08; plaza.receiveShadow = true; ISL.add(plaza);
  const sea = new THREE.Mesh(new THREE.CylinderGeometry(181, 184, 3, 96, 1, true), fortStone); sea.position.y = -1.3; ISL.add(sea);
  const tg = new THREE.IcosahedronGeometry(1, 2); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 0.82 + 0.3 * Math.sin(v.x * 5.1 + v.y * 3.3) * Math.cos(v.z * 4.7); p.setXYZ(i, v.x * k, v.y * k * 0.9 + 0.75, v.z * k); } tg.computeVertexNormals(); }
  const N2 = 160, trees = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x4d6b35, roughness: 0.9 }), N2); const m4 = new THREE.Matrix4(); H.reseed(8); const col = new THREE.Color();
  for (let i = 0; i < N2; i++) { const a = H.rnd() * TAU, r = 95 + H.rnd() * 75, s = 3.5 + H.rnd() * 3; m4.makeScale(s, s * 1.15, s).setPosition(Math.cos(a) * r, 0, Math.sin(a) * r); trees.setMatrixAt(i, m4); trees.setColorAt(i, col.setHSL(0.24 + H.rnd() * 0.06, 0.4, 0.2 + H.rnd() * 0.1)); }
  trees.castShadow = true; trees.visible = false;
  // Manhattan skyline on the horizon (north-east, ~ 3–4 km): silhouettes in haze
  const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0); const NB = 420, sky2 = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: 0x5d6873, roughness: 0.5, metalness: 0.4 }), NB); H.reseed(21);
  for (let i = 0; i < NB; i++) { const x = 2400 + (H.rnd() - 0.5) * 1800, z = -3100 - H.rnd() * 900 + (H.rnd() - 0.5) * 600; const fd = Math.abs(x - 2400) < 350 ? 1 : 0; const h = 25 + Math.pow(H.rnd(), 3) * (fd ? 420 : 200); m4.makeScale(30 + H.rnd() * 50, h, 30 + H.rnd() * 50).setPosition(x, 0, z); sky2.setMatrixAt(i, m4); }
  m4.makeScale(60, 541, 60).setPosition(2250, 0, -3700); sky2.setMatrixAt(0, m4); sky2.visible = false; scene.add(sky2); }

// ---------- shots (one per second of "time") ----------
const C = (y) => V(0, STATUE_BASE + y, 0);
const SH = [
  () => { keyAt(V(0, 40, 0), 90); look(V(-125, 62, 150), C(14), 30); },                                   // hero ¾ from the water
  () => { keyAt(V(0, 40, 0), 90); look(V(-30, 9, 66), C(22), 40); },                                       // low front from the plaza
  () => { keyAt(C(32), 16); const F = C(32.2).add(V(-1.6, 0, 1.6)); look(F.clone().add(V(4.2, 0.4, 8.5)), F, 28); },   // the face, ¾
  () => { keyAt(C(43), 14); const T = C(43.6).add(V(-6.0, 0, 3.0)); look(T.clone().add(V(4.5, 0.5, 10.5)), T, 26); },   // the torch
  () => { keyAt(C(18), 18); const B = C(18).add(V(5.5, 0, 0.5)); look(B.clone().add(V(14, 3, 16)), B.clone().add(V(-1.5, 2, 0)), 34); },   // the tablet
  () => { keyAt(V(0, 40, 0), 90); look(V(-95, 52, -105), C(20), 32); },                                   // back ¾
  () => { keyAt(V(0, 30, 0), 220); look(V(260, 230, 260), V(0, 20, 0), 34); },                           // aerial over the star fort
  () => { keyAt(V(0, 40, 0), 90); look(V(-135, 34, 8), C(22), 30); },                                    // side profile
];
H.frame("", async (t) => {
  WU.uT.value = t * 3; H.bloom.strength = 0.18; H.grade.uniforms.uVig.value = 0.22;
  SH[Math.max(0, Math.min(SH.length - 1, Math.floor(t)))]();
});
await H.ready();
