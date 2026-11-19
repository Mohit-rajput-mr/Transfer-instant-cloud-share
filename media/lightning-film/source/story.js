// Do you know what happens to your body when lightning hits you? HD film on kit/hd.js with a real human body
// (BodyParts3D anatomy: skin, skeleton, heart, bronchi, brain, nerves, vessels), Poly Haven CC0 scans (ground, rocks,
// dead tree, power poles, sky), a real car model. Units: metres. The hiker stands on a hilltop at the origin, facing +z.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { loadAnatomy, standardLayers } from "./kit/anatomy.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "./kit/lib/jsm/loaders/DRACOLoader.js";
import { makePhone, makeLaptop, makeLock, makeEmbers, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, D2R = Math.PI / 180, S2 = (el, o) => Object.assign(el.style, o);
const mod = (a, n) => ((a % n) + n) % n;

// ---------- loaders ----------
const draco = new DRACOLoader(); draco.setDecoderPath("kit/lib/jsm/libs/draco/gltf/");
const gl = new GLTFLoader(); gl.setDRACOLoader(draco);
const gltf = (u) => new Promise((ok, no) => gl.load(u, ok, undefined, no));
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rep = 1) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------- night storm set ----------
H.envK.value = 0.22;
scene.fog = new THREE.FogExp2(0x0b0f16, 0.016);
H.hemi.intensity = 0.3; H.hemi.color.set(0x8aa0c8); H.hemi.groundColor.set(0x0c0d0a);
H.key.color.set(0xa9bcff); H.key.intensity = 0.9; H.key.position.set(-8, 14, 6); H.r.toneMappingExposure = 1.25;
Object.assign(H.key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 60 }); H.key.shadow.camera.updateProjectionMatrix(); H.key.shadow.bias = -0.0008; H.key.shadow.normalBias = 0.045;
H.rimA.intensity = 0.55; H.rimB.intensity = 0.25; H.floor.visible = false;
// sky: a real overcast sky (Poly Haven), pushed to a storm-night grade; flashes light it from inside
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { map: { value: tex("kit/ph/belfast_open_field/sky_4k.jpg", true) }, k: { value: 0 }, dirF: { value: V(0, 1, 0) }, sep: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying vec3 vD; void main(){ vUv = uv; vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform float k, sep; uniform vec3 dirF; varying vec2 vUv; varying vec3 vD;
    void main(){ vec3 c = texture2D(map, vec2(1.0 - vUv.x, vUv.y)).rgb; float l = dot(c, vec3(0.3, 0.59, 0.11));
      vec3 night = mix(vec3(0.010, 0.013, 0.02), vec3(0.11, 0.13, 0.19), pow(l, 1.6)) * (0.55 + 0.45 * smoothstep(-0.05, 0.3, vD.y));
      float g = pow(max(0.0, dot(vD, dirF)), 6.0); vec3 fl = vec3(0.75, 0.78, 1.0) * pow(l, 1.3) * (0.6 + 2.4 * g) * k;
      vec3 col = night + fl; float s = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, vec3(s * 1.07, s * 0.92, s * 0.7), sep);
      gl_FragColor = vec4(col, 1.0); }` });
const studioBack = H.backdrop.material; H.backdrop.material = skyMat; H.backdrop.scale.setScalar(2.0);
// terrain: a gentle hill, flattened where the road and car are
const CAR = V(26, 0, 16);
const hill = (x, z) => { const r2 = x * x + z * z; let y = -0.0026 * r2 + 0.18 * Math.sin(x * 0.37) * Math.cos(z * 0.29) + 0.06 * Math.sin(x * 1.3 + z * 0.7);
  const dc = Math.hypot(x - CAR.x, z - CAR.z), yc = -0.0026 * (CAR.x * CAR.x + CAR.z * CAR.z); const w = 1 - smooth(clamp((dc - 7) / 6)); return lerp(y, yc, w); };
CAR.y = hill(CAR.x, CAR.z);
const ground = (() => {
  const g = new THREE.PlaneGeometry(420, 420, 300, 300); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hill(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const R = 105, m = new THREE.MeshPhysicalMaterial({ map: tex("kit/ph/aerial_grass_rock/aerial_grass_rock_diff_2k.jpg", true, R), normalMap: tex("kit/ph/aerial_grass_rock/aerial_grass_rock_nor_gl_2k.jpg", false, R),
    roughnessMap: tex("kit/ph/aerial_grass_rock/aerial_grass_rock_rough_2k.jpg", false, R), roughness: 0.8, clearcoat: 0.12, clearcoatRoughness: 0.4, color: 0x7d7d78, normalScale: new THREE.Vector2(1.4, 1.4) });
  m.onBeforeCompile = (s) => { s.uniforms.uRing = ringU; s.fragmentShader = "uniform vec4 uRing; varying vec3 vWp;\n" + s.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>
    { float r = length(vWp.xz - uRing.xy); float w = sin(r * 4.0 - uRing.z * 26.0) * 0.5 + 0.5; gl_FragColor.rgb += vec3(0.7, 0.85, 1.6) * pow(w, 6.0) * exp(-r * 0.32) * smoothstep(uRing.z * 9.0 + 0.5, uRing.z * 9.0 - 1.0, r) * uRing.w; }`);
    s.vertexShader = "varying vec3 vWp;\n" + s.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;"); };
  m.customProgramCacheKey = () => "ground";
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; scene.add(mesh); return mesh;
})();
var ringU = { value: new THREE.Vector4(0, 0, 0, 0) };
// road to the car: a dark wet asphalt strip
{ const g = new THREE.PlaneGeometry(7, 90, 6, 120); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + CAR.x, z = p.getZ(i) + CAR.z; p.setX(i, x); p.setY(i, hill(x, z) + 0.03); p.setZ(i, z); } g.computeVertexNormals();
  const m = new THREE.MeshPhysicalMaterial({ color: 0x15171a, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.12 }); const r = new THREE.Mesh(g, m); r.receiveShadow = true; scene.add(r); }

// Poly Haven scans
window.dbg = {}; const place = (o, x, z, s = 1, ry = 0) => { o.position.set(x, hill(x, z), z); o.scale.setScalar(s); o.rotation.y = ry; o.traverse((c) => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } }); scene.add(o); return o; };
const [treeG, rocksG, polesG, boulderG, logG] = await Promise.all(["fir_sapling", "rock_moss_set_01", "modular_electricity_poles", "boulder_01", "dead_tree_trunk_02"].map((a) => gltf(`kit/ph/${a}/${a}_1k.gltf`)));
const tree = place(treeG.scene, -4.6, -3.2, 1.0, 0.6); place(logG.scene, -10, -11, 1.0, 1.9);
{ const b = new THREE.Box3().setFromObject(tree); const hgt = b.max.y - b.min.y; tree.scale.setScalar(6.5 / hgt); tree.position.y = hill(-4.6, -3.2) - 0.05; }
const treeTop = (() => { const b = new THREE.Box3().setFromObject(tree); return V((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2); })();
for (const [x, z, s, r] of [[-2.6, -1.4, 0.35, 0.3], [-3.4, 5.4, 0.4, 2.1], [3.6, -3.6, 0.5, 1.2], [-7.5, 1.0, 0.55, 0.4], [9.5, -4.5, 0.6, 2.5]]) place(rocksG.scene.clone(), x, z, s, r);
place(boulderG.scene.clone(), 6.5, -8.5, 1.0, 0.4); place(boulderG.scene.clone(), -11.5, -6.0, 0.9, 2.0);
const poles = [];
{ const b = new THREE.Box3().setFromObject(polesG.scene); console.log("poles size", b.getSize(V()).toArray().map((v) => v.toFixed(1)).join(" "));
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2; for (let i = -2; i <= 2; i++) { const x = i * 16 + 6, z = -34 - i * 2; const o = new THREE.Group(); const c = polesG.scene.clone(); c.position.set(-cx, -b.min.y, -cz); o.add(c); place(o, x, z, 1, 0.1); poles.push(o); } }
const poleTop = (() => { const b = new THREE.Box3().setFromObject(poles[3]); return V((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2); })();
// grass: thousands of thin real-coloured blades around the hiker (wet, wind-blown)
const NG = 16000;
const grass = new THREE.InstancedMesh((() => { const g = new THREE.PlaneGeometry(0.009, 1, 1, 4); g.translate(0, 0.5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.9)); p.setZ(i, y * y * 0.12); } g.computeVertexNormals(); return g; })(),
  new THREE.MeshStandardMaterial({ color: 0x4a5a2a, roughness: 0.55, side: THREE.DoubleSide }), NG);
grass.receiveShadow = true; scene.add(grass);
H.reseed(11); const GR = Array.from({ length: NG }, () => { const a = H.rnd() * Math.PI * 2, r = Math.sqrt(H.rnd()) * 7; const x = Math.cos(a) * r, z = Math.sin(a) * r; return { x, z, y: hill(x, z), h: 0.05 + H.rnd() * 0.12, ry: H.rnd() * 6.28, c: H.rnd() }; });
{ const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); GR.forEach((g, i) => { if (Math.hypot(g.x, g.z) < 0.35) g.h = 0.02; q.setFromEuler(new THREE.Euler(0.15 * (g.c - 0.5), g.ry, 0)); m4.compose(V(g.x, g.y, g.z), q, V(1, g.h, 1)); grass.setMatrixAt(i, m4); grass.setColorAt(i, c.setHSL(0.2 + g.c * 0.06, 0.4, 0.3 + g.c * 0.2)); }); }
// rain: streaks around the camera's subject
const NR = 3600, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.42, 0.004), new THREE.MeshBasicMaterial({ color: 0x9fb2cc, transparent: true, opacity: 0.32, depthWrite: false }), NR);
rain.frustumCulled = false; scene.add(rain);
H.reseed(5); const RN = Array.from({ length: NR }, () => ({ x: H.rnd() - 0.5, y: H.rnd(), z: H.rnd() - 0.5 }));
function rainAt(t, c, size = 16, hgt = 12) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, 0.08)); for (let i = 0; i < NR; i++) { const r = RN[i]; const y = c.y - 2 + mod(r.y * hgt - t * 9.5, hgt); const p = V(c.x + r.x * size, y, c.z + r.z * size); const dc = p.distanceTo(H.cam.position); m4.compose(p, q, V(1, 1, 1).multiplyScalar(dc < 2.2 ? 0 : 1)); rain.setMatrixAt(i, m4); } rain.instanceMatrix.needsUpdate = true; }

// ---------- the hiker: real anatomy, clothed (t-shirt, shorts, shoes) ----------
const A = standardLayers(await loadAnatomy()); scene.add(A.root);
const groundY = hill(0, 0); A.root.position.y = groundY;
// the rescuer (skin + clothes only)
const R2 = standardLayers(await loadAnatomy(), { inside: false }); scene.add(R2.root); R2.root.visible = false;
R2.mat.shirt.color.set(0x7a2d22); R2.mat.shorts.color.set(0x2d3340);

// ---------- lightning: branching channels (midpoint displacement), grown step by step ----------
function boltPts(a, b, seed, jag = 0.12, lev = 7) {
  H.reseed(seed); let pts = [a.clone(), b.clone()];
  for (let l = 0; l < lev; l++) { const np = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], d = q.clone().sub(p), L = d.length();
      const m = p.clone().lerp(q, 0.4 + H.rnd() * 0.2); const n1 = V(H.rnd() - 0.5, (H.rnd() - 0.5) * 0.3, H.rnd() - 0.5).normalize(); m.addScaledVector(n1, L * jag * (0.6 + H.rnd() * 0.8)); np.push(m, q); } pts = np; }
  return pts;
}
const boltMat = (k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4 * k, 2.6 * k, 4.2 * k), toneMapped: false, fog: false, transparent: true });
const haloMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.35, 0.9), toneMapped: false, fog: false, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
function tubeOf(pts, r) { const cp = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) cp.add(new THREE.LineCurve3(pts[i], pts[i + 1])); return new THREE.TubeGeometry(cp, pts.length - 1, r, 5, false); }
/** a lightning bolt: main channel a→b + branches; grow(k) reveals from a; glow(v) = brightness; width(w) */
function makeBolt(a, b, seed, { jag = 0.2, branches = 9, r = 0.03, lev = 8 } = {}) {
  const g = new THREE.Group(); scene.add(g);
  const main = boltPts(a, b, seed, jag, lev); const parts = [{ pts: main, s0: 0, r }];
  H.reseed(seed + 1);
  for (let i = 0; i < branches; i++) {
    const s0 = 0.08 + H.rnd() * 0.75, idx = Math.floor(s0 * (main.length - 1)), p = main[idx];
    const len = a.distanceTo(b) * (0.08 + H.rnd() * 0.22), dir = b.clone().sub(a).normalize().add(V((H.rnd() - 0.5) * 1.8, 0.2, (H.rnd() - 0.5) * 1.8)).normalize();
    parts.push({ pts: boltPts(p, p.clone().addScaledVector(dir, len), seed + 7 * i + 3, 0.24, 6), s0, r: r * 0.5 });
  }
  for (const pt of parts) { pt.core = new THREE.Mesh(tubeOf(pt.pts, pt.r), boltMat()); pt.halo = new THREE.Mesh(tubeOf(pt.pts, pt.r * 3.2), haloMat()); pt.core.frustumCulled = pt.halo.frustumCulled = false; g.add(pt.core, pt.halo); pt.n = pt.core.geometry.index.count; pt.nh = pt.halo.geometry.index.count; }
  const B = { g, parts, main,
    grow(k) { for (const pt of parts) { const kk = pt.s0 === 0 ? k : clamp((k - pt.s0) / 0.25); pt.core.geometry.setDrawRange(0, Math.floor(pt.n * kk / 30) * 30); pt.halo.geometry.setDrawRange(0, Math.floor(pt.nh * kk / 30) * 30); pt.core.visible = pt.halo.visible = kk > 0.001; } },
    glow(v, mainBoost = 1) { for (const pt of parts) { const m = pt.s0 === 0 ? mainBoost : 1; pt.core.material.color.setRGB(2.4 * v * m, 2.6 * v * m, 4.2 * v * m); pt.core.material.opacity = clamp(v * 1.5); pt.halo.material.opacity = 0.22 * clamp(v) * Math.min(m, 1.4); } },
    width(w) { for (const pt of parts) { const s = pt.s0 === 0 ? w : 1; pt.core.scale.setScalar(1); pt.halo.material.opacity *= 1; } },
    show(v) { g.visible = v; } };
  B.grow(0); B.show(false); return B;
}
// the strike on the hiker: from the cloud base to the top of the head
const HEAD = () => A.at(V(0, 1.72, 0));
const CLOUD = V(-6, 58, -24);
const bMain = makeBolt(CLOUD, V(0, groundY + 1.74, 0.02), 101, { branches: 14, r: 0.035 });
const bFar = makeBolt(V(-70, 60, -140), V(-58, hill(-58, -120), -120), 33, { branches: 8, r: 0.3 });
const bFar2 = makeBolt(V(60, 62, -150), V(48, hill(48, -130), -130), 77, { branches: 6, r: 0.28 });
// upward streamers: from the head, the dead tree, the pole top
const stHead = makeBolt(V(0, groundY + 1.75, 0.02), V(0.3, groundY + 4.2, -0.6), 211, { branches: 2, r: 0.005, lev: 6, jag: 0.22 });
const stTree = makeBolt(treeTop, treeTop.clone().add(V(0.5, 3.4, 0.2)), 223, { branches: 2, r: 0.02, lev: 5, jag: 0.2 });
const stPole = makeBolt(poleTop, poleTop.clone().add(V(-0.6, 4.5, 0.3)), 227, { branches: 2, r: 0.025, lev: 5, jag: 0.2 });
// ground strike (later shot) + the car strike + Roy's seven
const GS = V(7.5, 0, 3.2); GS.y = hill(GS.x, GS.z);
const bGround = makeBolt(V(10, 60, -20), GS, 404, { branches: 12, r: 0.035 });
const groundArcs = [0, 1, 2, 3, 4, 5, 6].map((i) => { const a = i / 7 * Math.PI * 2 + 0.4; const e = GS.clone().add(V(Math.cos(a) * (3 + i % 3), 0, Math.sin(a) * (3 + (i * 7) % 4))); e.y = hill(e.x, e.z) + 0.03; const s = GS.clone(); s.y += 0.03;
  const pts = boltPts(s, e, 500 + i, 0.14, 5).map((p) => (p.y = hill(p.x, p.z) + 0.03, p)); const m = new THREE.Mesh(tubeOf(pts, 0.02), boltMat(0.8)); m.frustumCulled = false; scene.add(m); return m; });
// the arc towards the hiker's feet
const toFeet = (() => { const s = GS.clone(), e = V(0.3, 0, 0.4); e.y = hill(e.x, e.z); const pts = boltPts(s, e, 611, 0.12, 6).map((p) => (p.y = hill(p.x, p.z) + 0.035, p)); const m = new THREE.Mesh(tubeOf(pts, 0.025), boltMat(1)); m.frustumCulled = false; scene.add(m); m.userData.n = m.geometry.index.count; return m; })();
const flashL = new THREE.PointLight(0xc8d4ff, 0, 120, 1.6); scene.add(flashL);
const boltL = new THREE.PointLight(0xbfcfff, 0, 25, 2); scene.add(boltL);

// ---------- inside the storm cloud (a separate set high up): ice crystals rise, hail falls, charge separates ----------
const CS = new THREE.Group(); CS.position.set(0, 250, 0); scene.add(CS); CS.visible = false;
const puffTex = H.canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const a = Math.random() * 6.28, r = Math.random() * 110; g.fillStyle = `rgba(255,255,255,${0.04 * Math.random()})`; g.beginPath(); g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 6 + Math.random() * 20, 0, 7); g.fill(); } });
const puffs = []; H.reseed(71);
for (let i = 0; i < 140; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0x39404c, transparent: true, opacity: 0.85, depthWrite: false, fog: false })); s.position.set((H.rnd() - 0.5) * 26, (H.rnd() - 0.5) * 16, -4 - H.rnd() * 16); s.scale.setScalar(5 + H.rnd() * 9); s.material.rotation = H.rnd() * 6; CS.add(s); puffs.push(s); }
const hexG = (() => { const g = new THREE.CylinderGeometry(0.06, 0.06, 0.012, 6); return g; })();
const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.75, emissive: new THREE.Color(0x203040), iridescence: 0.6 });
const NI = 220, ice = new THREE.InstancedMesh(hexG, iceMat, NI); CS.add(ice);
const hailG = (() => { const g = new THREE.IcosahedronGeometry(0.11, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); v.multiplyScalar(1 + 0.12 * Math.sin(v.x * 60) * Math.sin(v.y * 53) * Math.sin(v.z * 47)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; })();
const hailMat = new THREE.MeshPhysicalMaterial({ color: 0xe8eef4, roughness: 0.7, clearcoat: 0.3, emissive: new THREE.Color(0x1c2028) });
const NHAIL = 70, hail = new THREE.InstancedMesh(hailG, hailMat, NHAIL); CS.add(hail);
const NQ = 260, qNeg = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 1), glow(0x5aa8ff, 3.2), NQ), qPos = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 1), glow(0xff7a3a, 3.2), NQ);
qNeg.frustumCulled = qPos.frustumCulled = false; CS.add(qNeg, qPos);
const sparkC = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 1), glow(0xdfefff, 5), 40); sparkC.frustumCulled = false; CS.add(sparkC);
H.reseed(91); const IC = Array.from({ length: NI }, () => ({ x: (H.rnd() - 0.5) * 9, y: H.rnd(), z: (H.rnd() - 0.5) * 4 - 1, r: H.rnd() * 6, s: 0.6 + H.rnd() * 0.8 }));
const HL = Array.from({ length: NHAIL }, () => ({ x: (H.rnd() - 0.5) * 9, y: H.rnd(), z: (H.rnd() - 0.5) * 4 - 1, s: 0.6 + H.rnd() * 0.7 }));
const QC = Array.from({ length: NQ }, () => ({ x: (H.rnd() - 0.5) * 10, y: H.rnd(), z: (H.rnd() - 0.5) * 4 - 1, d: H.rnd() }));
const cloudFlash = new THREE.PointLight(0xbfd0ff, 0, 30, 1.5); CS.add(cloudFlash);

// ---------- steam (flashover) ----------
const steamTex = H.canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const NST = 120, steam = Array.from({ length: NST }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xdfe6ee, transparent: true, opacity: 0, depthWrite: false })); scene.add(s); return s; });
H.reseed(17); const STP = Array.from({ length: NST }, () => ({ y: 0.1 + H.rnd() * 1.55, a: H.rnd() * 6.28, d: H.rnd(), v: V(H.rnd() - 0.5, 0.4 + H.rnd(), H.rnd() - 0.5) }));
// surface sparks racing over the skin (flashover): beads on the body surface
const NSK = 220, skinSpark = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), glow(0xcfe0ff, 5), NSK); skinSpark.frustumCulled = false; scene.add(skinSpark);
// sample real skin vertices as the surface the current runs over
const skinPos = A.layers.skin.geometry.attributes.position; H.reseed(23);
const SKV = Array.from({ length: 1400 }, () => { const i = Math.floor(H.rnd() * skinPos.count); return V(skinPos.getX(i), skinPos.getY(i), skinPos.getZ(i)); }).sort((a, b) => b.y - a.y);

// ---------- Lichtenberg figure: a fern of burst capillaries, grown on a canvas and printed on the chest skin ----------
const fern = []; H.reseed(1234);
{ // a feathered fern: a trunk from the shoulder across the chest; side branches alternate and branch again (like the real burns)
  const Q = [[800, 50, 2.2, 760, 13, 0, 0]];
  while (Q.length && fern.length < 7000) {
    const [x0, y0, a0, len, w, d0, depth] = Q.shift(); let x = x0, y = y0, a = a0, side = H.rnd() < 0.5 ? 1 : -1;
    const step = 5, n = Math.floor(len / step);
    for (let i = 0; i < n; i++) {
      a += (H.rnd() - 0.5) * 0.28; const nx = x + Math.cos(a) * step, ny = y + Math.sin(a) * step; const u = i / n;
      fern.push([x, y, nx, ny, Math.max(0.8, w * (1 - u * 0.75)), d0 + i * step]); x = nx; y = ny;
      if (depth < 4 && i > 2 && i % (depth === 0 ? 4 : 3) === 0 && H.rnd() < 0.85) { side = -side; Q.push([x, y, a + side * (0.55 + H.rnd() * 0.5), (len - i * step) * (0.38 + H.rnd() * 0.22) * (depth === 0 ? 1 : 0.8), w * 0.55, d0 + i * step, depth + 1]); }
    }
  }
}
const maxD = fern.reduce((m, f) => Math.max(m, f[5]), 0); console.log('fern', fern.length);
const fernTex = H.canvasTex(1024, 1024, () => {}); fernTex.flipY = true;
let fernK = -1;
function drawFern(k) { if (Math.abs(k - fernK) < 0.004) return; fernK = k; const g = fernTex.userData.g; g.clearRect(0, 0, 1024, 1024);
  g.lineCap = "round"; for (const pass of [0, 1]) for (const [x0, y0, x1, y1, w, d] of fern) { if (d > k * maxD) continue; const e = clamp((k * maxD - d) / 40);
    g.strokeStyle = pass ? `rgba(150,30,34,${0.85 * e})` : `rgba(200,80,80,${0.22 * e})`; g.lineWidth = pass ? Math.max(1.2, w * 0.55) : w * 2.4 + 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  fernTex.needsUpdate = true; }
A.extra.uDecal.value = fernTex; A.extra.uDecalR.value.set(-0.22, 1.0, 0.44, 0.47);

// ---------- shockwave (thunder) ----------
const shock = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.0); gl_FragColor = vec4(vec3(0.8, 0.9, 1.3) * f * k * 2.5, 1.0); }` }));
scene.add(shock); shock.visible = false;

// ---------- the car (real model) ----------
const carG = await gltf("kit/models/car/carconcept.glb"); const car = carG.scene; scene.add(car);
const paintM = new THREE.MeshPhysicalMaterial({ color: 0x7c0f12, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04, emissive: new THREE.Color(0x6f8cff), emissiveIntensity: 0 });
const glassM = new THREE.MeshPhysicalMaterial({ color: 0x0a0c0f, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.38, clearcoat: 1, depthWrite: false });
car.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; const n = o.material?.name || "";
  if (/^Paint/.test(n)) o.material = paintM; else if (/^Glass/.test(n)) o.material = glassM; else if (o.material?.transmission) { o.material.transmission = 0; o.material.transparent = true; o.material.opacity = 0.5; }
  if (/License|Emblem/i.test(o.name) || n === "License") o.visible = false; });
{ const b0 = new THREE.Box3().setFromObject(car), s0 = b0.getSize(V()); car.scale.setScalar(4.6 / Math.max(s0.x, s0.z)); }
car.position.copy(CAR); car.rotation.y = -0.35; car.updateMatrixWorld(true);
{ const b1 = new THREE.Box3().setFromObject(car); car.position.y += CAR.y - b1.min.y; car.updateMatrixWorld(true); }
car.visible = false;
// the hiker in the driver's seat
const seatO = car.getObjectByName("InteriorSeatsColor1") || car.getObjectByName("InteriorSeatsFrame1");
const seatB = new THREE.Box3().setFromObject(seatO), seatC = seatB.getCenter(V());
const hoodC = new THREE.Box3().setFromObject(car.getObjectByName("BodyHood")).getCenter(V()), carC0 = new THREE.Box3().setFromObject(car).getCenter(V());
const carFwd = hoodC.clone().sub(carC0).setY(0).normalize(); console.log("seat", seatB.getSize(V()).toArray().map((v) => v.toFixed(2)).join(" "), "fwd", carFwd.toArray().map((v) => v.toFixed(2)).join(" "));
const carBox = new THREE.Box3().setFromObject(car); console.log("car size", carBox.getSize(V()).toArray().map((v) => v.toFixed(2)).join(" "));
const carTop = V((carBox.min.x + carBox.max.x) / 2, carBox.max.y, (carBox.min.z + carBox.max.z) / 2);
const bCar = makeBolt(carTop.clone().add(V(-12, 58, -30)), carTop.clone().add(V(0, -0.02, 0.1)), 707, { branches: 10, r: 0.035 });
// current paths over the shell: roof → pillars → sills → arcs to the wet road (beside, not through, the tyres)
const carLocal = (x, y, z) => car.localToWorld(V(x, y, z));
const shellPaths = [];
{ const side = V(-carFwd.z, 0, carFwd.x), g0 = CAR.y, top = carTop.y; const P = (sd, fw, h) => carTop.clone().setY(g0 + h).addScaledVector(side, sd).addScaledVector(carFwd, fw);
  for (const s of [-1, 1]) for (const f of [-1, 1]) shellPaths.push([carTop.clone().setY(top + 0.01), P(s * 0.45, f * 0.45, top - g0), P(s * 0.72, f * 0.95, top - g0 - 0.35), P(s * 0.9, f * 1.35, 0.6), P(s * 0.93, f * 1.6, 0.28), P(s * 1.02, f * 1.7, 0.0)]); }
const NCS = 240, carSpark = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), glow(0xcfe0ff, 5), NCS); carSpark.frustumCulled = false; scene.add(carSpark);
const carArcs = shellPaths.map((p, i) => { const a = p[p.length - 2].clone(), b = p[p.length - 1].clone(); b.y = CAR.y + 0.02; const m = new THREE.Mesh(tubeOf(boltPts(a, b, 800 + i, 0.2, 4), 0.012), boltMat(1)); m.frustumCulled = false; scene.add(m); return m; });

// ---------- Orbi set: phone, laptop, a friend's phone on a wooden table; green arcs = the fastest path ----------
const OR = new THREE.Group(); OR.position.set(0, -200, 0); scene.add(OR); OR.visible = false;
// a solid oak tabletop (scanned wood texture, Poly Haven CC0)
const wt = (n, srgb) => { const t = tex(`kit/ph/wood_table_001/wood_table_001_${n}_1k.jpg`, srgb, 1); t.repeat.set(2, 1.2); return t; };
const table = new THREE.Mesh(new RoundedBoxGeometry(8, 0.14, 4.6, 4, 0.04), new THREE.MeshPhysicalMaterial({ map: wt("diff", true), normalMap: wt("nor_gl"), roughnessMap: wt("rough"), roughness: 0.9, clearcoat: 0.35, clearcoatRoughness: 0.3 }));
table.position.y = -0.07; table.receiveShadow = true; OR.add(table);
const IMG = { phone: await img("shots/phone-wifi.png"), laptop: await img("shots/laptop-wifi.png") };
const ph1 = makePhone(0x2c2f34), ph2 = makePhone(0xd8d2c6), lap = makeLaptop();
OR.add(ph1.g, ph2.g, lap.g);
ph1.g.position.set(-1.25, 0.045, 0.9); ph1.g.rotation.set(-Math.PI / 2 + 0.05, 0, 0.25);
ph2.g.position.set(1.35, 0.045, 0.75); ph2.g.rotation.set(-Math.PI / 2 + 0.05, 0, -0.35);
lap.g.position.set(0.1, 0, -0.9); lap.lid.rotation.x = -0.12;
const lockO = makeLock(); OR.add(lockO); const embers = makeEmbers(); OR.add(embers);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 6, 2); OR.add(orbiL);
const fileTex = H.canvasTex(512, 640, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1b2536"); gr.addColorStop(1, "#05070b"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#cfe0ff"; g.lineWidth = 6; g.shadowColor = "#7fa8ff"; g.shadowBlur = 24; g.beginPath(); g.moveTo(300, 0); g.lineTo(250, 160); g.lineTo(300, 190); g.lineTo(220, 380); g.lineTo(270, 400); g.lineTo(200, 560); g.stroke(); g.shadowBlur = 0;
  g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, h - 90, w, 90); g.fillStyle = "#fff"; g.font = "700 34px M"; g.fillText("storm.jpg", 24, h - 34); g.fillStyle = green; g.textAlign = "right"; g.fillText("4.8 MB", w - 24, h - 34); });
const card = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.62, 0.02, 3, 0.03), [matte(0x0d0f12), matte(0x0d0f12), matte(0x0d0f12), matte(0x0d0f12), new THREE.MeshBasicMaterial({ map: fileTex, toneMapped: false, color: 0xd0d0d0 }), matte(0x0d0f12)]);
OR.add(card);
const arcMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 4, 1.8), toneMapped: false, transparent: true });
const arcTo = (a, b, seed) => { const pts = boltPts(a, b, seed, 0.1, 5); const m = new THREE.Mesh(tubeOf(pts, 0.012), arcMat.clone()); m.frustumCulled = false; OR.add(m); m.userData.n = m.geometry.index.count; return m; };
const P1 = () => ph1.g.localToWorld(V(0, 0.2, 0.06)).sub(OR.position), PL = () => lap.lid.localToWorld(V(0, 1.0, 0.06)).sub(OR.position), P2 = () => ph2.g.localToWorld(V(0, 0.2, 0.06)).sub(OR.position);
OR.updateMatrixWorld(true);
const arcL = arcTo(P1(), PL(), 901), arcF = arcTo(P1(), P2(), 902);
const wifiRings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.6, 1.2), toneMapped: false, transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; OR.add(m); return m; });
function drawPhoneScr(g, st) {
  g.drawImage(IMG.phone, 0, 0, 780, 1688);
  g.fillStyle = "#000"; g.fillRect(60, 440, 660, 80); // the empty-state line gives way to the file
  if (st.file > 0) { g.globalAlpha = st.file; const y = 560 - 40 * (1 - out(st.file)); g.fillStyle = "#0f1216"; rr(g, 190, y, 400, 520, 34); g.fill(); g.strokeStyle = st.mine ? "rgba(255,255,255,.25)" : green; g.lineWidth = 4; g.stroke();
    g.drawImage(fileTex.userData.c, 214, y + 24, 352, 420); g.fillStyle = green; g.font = "700 26px M"; g.fillText(st.mine ? "SENT · WI-FI" : "NEW · SAME WI-FI", 214, y + 488); g.globalAlpha = 1; }
  if (st.tap > 0 && st.tap < 1) { g.strokeStyle = `rgba(255,255,255,${1 - st.tap})`; g.lineWidth = 8; g.beginPath(); g.arc(160, 1590, 30 + 60 * st.tap, 0, 7); g.stroke(); }
  if (st.lock > 0) { g.globalAlpha = st.lock; g.fillStyle = green; g.font = "700 28px M"; g.fillText("● LOCKED ON THIS PHONE", 200, 1500); g.globalAlpha = 1; }
}
function drawLapScr(g, st) {
  g.drawImage(IMG.laptop, 0, 0, 1440, 900); g.fillStyle = "#000"; g.fillRect(520, 395, 420, 30);
  if (st.file > 0) { g.globalAlpha = st.file; const x = 560, y = 210 + 30 * (1 - out(st.file)); g.fillStyle = "#0f1216"; rr(g, x, y, 320, 400, 24); g.fill(); g.strokeStyle = green; g.lineWidth = 3; g.stroke();
    g.drawImage(fileTex.userData.c, x + 18, y + 18, 284, 330); g.fillStyle = green; g.font = "700 20px M"; g.fillText(st.burn || "NEW · SAME WI-FI", x + 18, y + 376); g.globalAlpha = 1; }
}

// ---------- overlays ----------
H.callouts({
  ice: ["Ice crystals", "#bfe6ff", "light · carried up"], hail: ["Soft hail", "#e8eef4", "heavy · falling"], neg: ["− charge", "#5aa8ff", "sinks to the bottom"], pos: ["+ charge", "#ff8a4a", "rises to the top"],
  leader: ["Stepped leader", "#cfe0ff", "~50 m per jump"], stream: ["Streamer", "#cfe0ff", "rises to meet it"], hairUp: ["Hair stands up", "#ffd166", "= get inside, now"],
  flashover: ["Flashover", "#9fd0ff", "over the skin, not through"], steam: ["Rain + sweat → steam", "#e6ecf2"],
  heart: ["Heart", "#ff5a4a", "can stop"], brainstem: ["Breathing centre", "#ffb347", "brainstem · can switch off"], nerves: ["Nerves + vessels", "#ffd166", "the current's path inside"],
  marks: ["Lichtenberg figure", "#ff8f8f", "fades in days"], ears: ["Eardrums", "#ffd166", "can burst"],
  legs: ["Up one leg,", "#9fd0ff", "down the other"], gcurrent: ["Ground current", "#9fd0ff", "spreads out from the strike"],
  shell: ["Metal shell", green, "carries it around you"], tyres: ["Rubber tyres", "#ff5a4a", "not why you're safe"],
  wifi: ["Same Wi-Fi", green, "Orbi's Wi-Fi tab"],
});
hudEl("big", `<div id="bigt" style="width:1080px;text-align:center;font:900 128px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 14px 50px rgba(0,0,0,.7)">0</div><div id="bigs" style="width:1080px;text-align:center;font:800 50px D;color:#cfe0ff;letter-spacing:.14em;margin-top:14px">VOLTS</div>`, { left: "0px", top: "330px" });
hudEl("stats", `<div style="width:1080px;display:flex;flex-direction:column;align-items:center;gap:18px">${[["30,000", "AMPS"], ["≈30,000 °C", "IN THE CHANNEL"], ["5×", "HOTTER THAN THE SUN'S SURFACE"]].map(([a, b], i) => `<div id="st${i}" style="padding:20px 34px;border-radius:22px;background:rgba(8,10,16,0.82);border:1.5px solid rgba(160,190,255,.35);font:900 56px D;color:#fff;display:flex;gap:22px;align-items:baseline"><span style="color:#cfe0ff">${a}</span><span style="font:700 26px M;letter-spacing:.16em;color:#9aa6b2">${b}</span></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("ecg", `<div style="width:920px;margin-left:80px;padding:22px 26px;border-radius:24px;background:rgba(6,10,8,0.85);border:1.5px solid rgba(61,255,140,.3)">
  <div style="display:flex;justify-content:space-between;font:700 26px M;letter-spacing:.16em"><span style="color:#3dff8c">HEART</span><span id="ecgbpm" style="color:#3dff8c">72 BPM</span></div>
  <svg width="868" height="170" viewBox="0 0 868 170"><polyline id="ecgl" fill="none" stroke="#3dff8c" stroke-width="5" stroke-linejoin="round" points=""/></svg>
  <div style="display:flex;justify-content:space-between;font:700 26px M;letter-spacing:.16em"><span style="color:#9aa6b2">BREATHING</span><span id="ecgbr" style="color:#3dff8c">YES</span></div></div>`, { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;flex-direction:column;align-items:center;gap:16px">${[["Heart can restart on its own", "#3dff8c", "✓"], ["Breathing may not → CPR", "#ffb347", "!"], ["No charge left · safe to touch", "#3dff8c", "✓"]].map(([s, c, m], i) => `<div id="cp${i}" style="padding:18px 30px;border-radius:20px;background:rgba(8,10,16,.85);border:1.5px solid ${c};font:800 40px D;color:#fff;display:flex;gap:18px;align-items:center"><span style="width:46px;height:46px;border-radius:50%;background:${c};color:#0b0d10;display:grid;place-items:center;font:900 28px Arial">${m}</span>${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("cpr", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:16px 30px;border-radius:999px;background:rgba(8,10,16,.85);border:1.5px solid #ffb347;font:800 34px M;color:#ffb347;letter-spacing:.08em">CPR · PUSH HARD · 100–120 A MINUTE</div></div>`, { left: "0px", top: "1340px" });
hudEl("injury", `<div style="width:920px;margin-left:80px;padding:26px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:1.5px solid rgba(255,255,255,.18)">
  <div style="font:700 26px M;letter-spacing:.2em;color:#9aa6b2;margin-bottom:16px">HOW LIGHTNING HURTS PEOPLE</div>
  ${[["Ground current", 52, "#9fd0ff"], ["Side flash", 33, "#cfe0ff"], ["Direct strike", 4, "#ffd166"]].map(([s, v, c], i) => `<div style="display:flex;align-items:center;gap:18px;margin-top:12px"><div style="width:270px;font:800 32px D;color:#fff">${s}</div><div style="flex:1;height:30px;border-radius:15px;background:rgba(255,255,255,.08);overflow:hidden"><div id="ij${i}" style="height:100%;width:0%;background:${c};border-radius:15px"></div></div></div>`).join("")}
  <div style="font:600 22px M;color:#7c8794;margin-top:16px">US National Weather Service, share of injuries</div></div>`, { left: "0px", top: "1440px" });
hudEl("carchips", `<div style="width:1080px;display:flex;justify-content:center;gap:22px">${[["RUBBER TYRES", 0], ["METAL SHELL", 1]].map(([s, ok], i) => `<div id="cc${i}" style="position:relative;padding:22px 30px;border-radius:22px;background:${ok ? "#3dff8c" : "rgba(255,255,255,.95)"};color:#0b0d10;font:900 44px D">${s}<span style="position:absolute;right:-18px;top:-18px;width:54px;height:54px;border-radius:50%;background:${ok ? "#0b0d10" : "#ff3b3b"};color:${ok ? "#3dff8c" : "#fff"};display:grid;place-items:center;font:900 32px Arial">${ok ? "✓" : "✕"}</span></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("roy", `<div style="width:1080px;text-align:center"><div id="royn" style="font:900 300px/0.85 D;color:#fff;text-shadow:0 14px 50px rgba(0,0,0,.6)">0</div><div style="font:800 46px D;color:#ffd9a0;letter-spacing:.08em;margin-top:8px">TIMES STRUCK</div><div id="royy" style="font:700 34px M;color:#cdbb9a;letter-spacing:.12em;margin-top:18px"></div></div>`, { left: "0px", top: "300px" });
hudEl("ochips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${[["CABLES", 0], ["LOGIN", 0], ["APP", 0], ["BROWSER", 1]].map(([s, ok], i) => `<div id="oc${i}" style="position:relative;padding:20px 24px;border-radius:20px;background:${ok ? "#3dff8c" : "rgba(255,255,255,.95)"};color:#0b0d10;font:900 38px D">${s}<span style="position:absolute;right:-16px;top:-16px;width:46px;height:46px;border-radius:50%;background:${ok ? "#0b0d10" : "#ff3b3b"};color:${ok ? "#3dff8c" : "#fff"};display:grid;place-items:center;font:900 28px Arial">${ok ? "✓" : "✕"}</span></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("timer", `<div id="tmr" style="width:1080px;text-align:center;font:800 130px M;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)">30:00</div>`, { left: "0px", top: "1440px" });
hudEl("secs", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:18px 34px;border-radius:999px;background:rgba(8,14,10,.85);border:1.5px solid #3dff8c;font:800 40px M;color:#3dff8c;letter-spacing:.08em" id="secst">PHONE → 2 SCREENS · SECONDS</div></div>`, { left: "0px", top: "1440px" });

// ---------- ECG trace ----------
const ecgY = (ph) => { const p = mod(ph, 1); return p < 0.1 ? Math.sin(p / 0.1 * Math.PI) * 8 : p < 0.18 ? 0 : p < 0.2 ? -12 : p < 0.23 ? 70 : p < 0.26 ? -22 : p < 0.4 ? 0 : p < 0.55 ? Math.sin((p - 0.4) / 0.15 * Math.PI) * 18 : 0; };
function ecg(t, alive) { // alive(t) → 0..1 amplitude
  const pts = []; for (let i = 0; i <= 216; i++) { const tt = t - (216 - i) / 216 * 3.0; const a = alive(tt); pts.push(`${i * 4},${85 - ecgY(tt * 1.2) * a + Math.sin(tt * 40) * 0.8}`); }
  H.$("ecgl").setAttribute("points", pts.join(" "));
}

// ---------- flash brightness over time (every strike) ----------
function strikeFlash(t, t0, dur = 0.5) { if (t < t0 - 0.02 || t > t0 + dur + 0.6) return 0; const x = t - t0; const flick = [0, 0.06, 0.13, 0.24]; let v = 0; for (const f of flick) v = Math.max(v, Math.exp(-Math.max(0, x - f) * 18) * (x >= f ? 1 : 0)); return v; }

// ---------- per frame ----------
let lastP1 = "", lastP2 = "", lastL = "";
const restPose = {}, jolt = (k) => ({ shL: [0, 0, 28 * k], shR: [0, 0, -28 * k], elL: [-25 * k, 0, 0], elR: [-25 * k, 0, 0], head: [-14 * k, 0, 0], chest: [-6 * k, 0, 0] });
const walk = (ph) => { const s = Math.sin(ph), c = Math.cos(ph); return { hipL: [-22 * s, 0, 0], hipR: [22 * s, 0, 0], knL: [Math.max(0, 35 * c), 0, 0], knR: [Math.max(0, -35 * c), 0, 0], shL: [14 * s, 0, 4], shR: [-14 * s, 0, -4], elL: [-18, 0, 0], elR: [-18, 0, 0] }; };
const seated = { hipL: [-88, 0, 0], hipR: [-88, 0, 0], knL: [80, 0, 0], knR: [80, 0, 0], shL: [-35, 0, 6], shR: [-35, 0, -6], elL: [-55, 0, 0], elR: [-55, 0, 0] };
function lieDown(Ab, k) { Ab.root.rotation.set(-Math.PI / 2 * k, 0, 0); Ab.root.position.set(0, groundY + 0.16 * k, 0); }

H.frame("Drop a file on your Wi-Fi", async (t) => {
  // defaults
  const all = [bMain, bFar, bFar2, stHead, stTree, stPole, bGround, bCar]; for (const b of all) b.show(false);
  for (const m of [...groundArcs, toFeet, ...carArcs]) m.visible = false;
  CS.visible = false; OR.visible = false; car.visible = false; shock.visible = false; R2.root.visible = false;
  skinSpark.visible = false; carSpark.visible = false; for (const s of steam) s.material.opacity = 0;
  A.root.visible = true; A.root.rotation.set(0, 0, 0); A.root.position.set(0, groundY, 0); A.xray(0); A.layers.shirt.visible = true;
  A.extra.uHot.value = 0; A.extra.uRed.value = 0; A.extra.uHairUp.value = 0; A.extra.uDecalK.value = 0; A.extra.uBeat.value = 0; A.extra.uBreath.value = 0; A.extra.uLegP.value.set(-9, 0);
  A.extra.uShoeL.value.set(0, 0, 0, 0); A.extra.uShoeR.value.set(0, 0, 0, 0); A.extra.uShoesOn.value = 1; A.pulse(0, 0, 0); A.pulse(0, 0, 0, 1, 2); A.mat.medulla.emissiveIntensity = 0;
  A.layers.shoes.visible = true;
  skyMat.uniforms.k.value = 0; skyMat.uniforms.sep.value = 0; H.grade.uniforms.uSepia.value = 0;
  H.key.intensity = 0.9; H.key.color.set(0xa9bcff); flashL.intensity = 0; boltL.intensity = 0; H.bloom.strength = 0.45; ringU.value.w = 0;
  rain.visible = true; grass.visible = true; H.zoom = 1; H.rimB.intensity = 0.25; A.extra.uCloth.value = 1; H.backdrop.material = skyMat; H.backdrop.scale.setScalar(2.0); H.hemi.intensity = 0.3; H.key.target.position.set(0, 0, 0); H.key.position.set(-8, 14, 6); paintM.emissiveIntensity = 0; scene.fog.density = 0.016;
  let F = 0; // scene flash level
  const lightAt = (p, f, dir) => { F = Math.max(F, f); flashL.position.copy(p); flashL.intensity = Math.max(flashL.intensity, f * 900); skyMat.uniforms.dirF.value.copy(dir || p.clone().normalize()); };
  const pose = A.setPose.bind(A); pose({});

  // ---- HOOK: night storm on a hilltop; distant strikes; 300,000,000 volts; 9 in 10 survive
  if (t < at("storm")) {
    pose({ head: [-8, 12, 0] });
    const a = 0, b = at("storm");
    move(t, a, b, [V(3.6, groundY + 0.55, 6.2), V(0, groundY + 1.25, 0), 30], [V(1.7, groundY + 0.85, 3.6), V(0, groundY + 1.45, 0), 28]);
    const f1 = strikeFlash(t, fr("hook", 0.16)), f2 = strikeFlash(t, fr("hook", 0.47)), f3 = strikeFlash(t, fr("hook", 0.8));
    if (f1 > 0.01) { bFar.show(true); bFar.grow(1); bFar.glow(0.4 + f1 * 1.4); lightAt(V(-58, 40, -120), f1 * 0.8); }
    if (f2 > 0.01) { bFar2.show(true); bFar2.grow(1); bFar2.glow(0.4 + f2 * 1.4); lightAt(V(48, 40, -130), f2 * 0.8); }
    if (f3 > 0.01) { bFar.show(true); bFar.grow(1); bFar.glow(0.4 + f3 * 1.6); lightAt(V(-58, 40, -120), f3); }
    hudShow("big", win(t, fr("hook", 0.2), fr("hook", 0.56)), { transform: `scale(${lerp(1.2, 1, out(prog(t, fr("hook", 0.2), fr("hook", 0.3))))})` });
    H.$("bigt").textContent = Math.round(lerp(0, 300, ease(prog(t, fr("hook", 0.22), fr("hook", 0.42))))).toString() + ",000,000";
    title(t, fr("hook", 0.6), end("hook") + 0.2, "Struck by lightning", "9 in 10<br>survive");
  }
  // ---- STORM: inside the cloud
  else if (t < at("leader")) {
    CS.visible = true; rain.visible = false; A.root.visible = false; grass.visible = false; scene.fog.density = 0.0;
    const c = CS.position; const k = prog(t, at("storm"), at("leader"));
    move(t, at("storm"), at("leader"), [V(1.5, 252.5, 9.5), V(0, 250.4, -1), 38], [V(-0.6, 249.6, 6.8), V(0, 250.2, -1), 34]);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    // updraft carries ice up, hail falls; each crossing knocks charge loose
    IC.forEach((p, i) => { const y = -3 + mod(p.y * 7 + t * 0.55 * p.s, 7); q.setFromEuler(e.set(t * p.s + p.r, t * 0.7 + p.r, 0)); m4.compose(V(p.x, y, p.z), q, V(1, 1, 1).multiplyScalar(p.s)); ice.setMatrixAt(i, m4); });
    HL.forEach((p, i) => { const y = 4 - mod(p.y * 7 + t * 0.9 * p.s, 7); q.setFromEuler(e.set(t * 0.4, t * 0.3 + i, 0)); m4.compose(V(p.x, y, p.z), q, V(1, 1, 1).multiplyScalar(p.s)); hail.setMatrixAt(i, m4); });
    ice.instanceMatrix.needsUpdate = hail.instanceMatrix.needsUpdate = true;
    const sep = ease(prog(t, fr("storm", 0.2), fr("storm", 0.85)));
    QC.forEach((p, i) => { const y0 = -3 + p.y * 7; const yN = lerp(y0, -3.2 + p.d * 1.0, sep), yP = lerp(y0, 3.0 + p.d * 1.0, sep); const show = clamp((sep - p.d * 0.5) * 3);
      m4.compose(V(p.x + Math.sin(t * 2 + i) * 0.03, yN, p.z), q.identity(), V(1, 1, 1).multiplyScalar(show)); qNeg.setMatrixAt(i, m4);
      m4.compose(V(p.x + Math.cos(t * 2 + i) * 0.03 + 0.2, yP, p.z), q, V(1, 1, 1).multiplyScalar(show * 0.7)); qPos.setMatrixAt(i, m4); });
    qNeg.instanceMatrix.needsUpdate = qPos.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 40; i++) { const ph = mod(t * 1.7 + i * 0.37, 1); const p = IC[i * 3]; const s = ph < 0.15 ? (1 - ph / 0.15) * 1.2 : 0; m4.compose(V(p.x, -3 + mod(p.y * 7 + t * 0.55 * p.s, 7), p.z + 0.1), q, V(s, s, s)); sparkC.setMatrixAt(i, m4); }
    sparkC.instanceMatrix.needsUpdate = true;
    const fl = Math.max(strikeFlash(t, fr("storm", 0.55), 0.3), strikeFlash(t, fr("storm", 0.9), 0.3)) * 0.8;
    cloudFlash.position.set(2, -1, -3); cloudFlash.intensity = 8 + fl * 260; for (const p of puffs) p.material.color.setRGB(0.05 + fl * 0.5, 0.055 + fl * 0.52, 0.07 + fl * 0.6);
    H.key.intensity = 1.8; H.key.color.set(0xdfe6ff); H.key.position.set(4, 260, 8); H.key.target.position.set(0, 250, 0); H.rimB.intensity = 0;
    callout("ice", t, fr("storm", 0.1), fr("storm", 0.5), CS.localToWorld(IC[5].x !== undefined ? V(IC[11].x, -3 + mod(IC[11].y * 7 + t * 0.55 * IC[11].s, 7), IC[11].z) : V()), 760, 500);
    callout("hail", t, fr("storm", 0.18), fr("storm", 0.55), CS.localToWorld(V(HL[4].x, 4 - mod(HL[4].y * 7 + t * 0.9 * HL[4].s, 7), HL[4].z)), 300, 620);
    callout("neg", t, fr("storm", 0.55), end("storm"), CS.localToWorld(V(-1.5, -3, -1)), 300, 1000);
    callout("pos", t, fr("storm", 0.62), end("storm"), CS.localToWorld(V(1.5, 3.2, -1)), 770, 420);
  }
  // ---- LEADER: from below the cloud, the stepped leader creeps down towards the hill
  else if (t < at("streamer")) {
    move(t, at("leader"), at("streamer"), [V(18, groundY + 4, 26), V(-2, groundY + 18, -8), 42], [V(14, groundY + 2.5, 19), V(-1, groundY + 10, -4), 44]);
    pose({ head: [-10, 10, 0] });
    bMain.show(true);
    const steps = 16, k = prog(t, fr("leader", 0.05), fr("leader", 0.92)); const ks = Math.floor(k * steps) / steps + (k * steps % 1 < 0.25 ? 1 / steps * ((k * steps % 1) / 0.25) : 1 / steps) * 0;
    bMain.grow(ks * 0.93); const flick = 0.35 + 0.65 * Math.exp(-((k * steps) % 1) * 6); bMain.glow(0.5 * flick, 0.8);
    boltL.position.copy(bMain.main[Math.floor(ks * 0.93 * (bMain.main.length - 1))]); boltL.intensity = 30 * flick;
    lightAt(CLOUD, 0.12 * flick);
    hudShow("big", win(t, fr("leader", 0.25), end("leader")), {});
    H.$("bigt").textContent = String(Math.min(steps, Math.floor(k * steps) + 1)); H.$("bigs").textContent = "JUMPS · ~50 M EACH";
    callout("leader", t, fr("leader", 0.45), end("leader"), bMain.main[Math.floor(ks * 0.8 * (bMain.main.length - 1))], 300, 860);
  }
  // ---- STREAMER: the ground answers: sparks rise from the tree, the pole, and the hiker's head; hair stands up
  else if (t < at("strike")) {
    const k = prog(t, at("streamer"), at("strike"));
    pose({ head: [-22, 10, 0], shL: [0, 0, 6], shR: [0, 0, -6] });
    if (t < fr("streamer", 0.55)) move(t, at("streamer"), fr("streamer", 0.55), [V(9, groundY + 1.0, 9), V(-1.5, groundY + 3.4, -1.2), 40], [V(6, groundY + 1.4, 7.5), V(-1.6, groundY + 3.0, -1.0), 38]);
    else move(t, fr("streamer", 0.55), at("strike"), [V(-1.5, groundY + 1.35, -1.6), V(0, groundY + 1.85, 0), 36], [V(-1.15, groundY + 1.45, -1.25), V(0, groundY + 1.95, 0), 34]);
    bMain.show(true); bMain.grow(0.93 + 0.05 * prog(t, at("streamer"), end("streamer"))); bMain.glow(0.45, 0.8);
    for (const [b, a0] of [[stTree, 0.08], [stPole, 0.18], [stHead, 0.3]]) { const g = ease(prog(t, fr("streamer", a0), fr("streamer", a0 + 0.3))); b.show(g > 0.01); b.grow(g); b.glow(0.6 + 0.4 * Math.sin(t * 70 + a0 * 9)); }
    A.extra.uHairUp.value = ease(prog(t, fr("streamer", 0.55), fr("streamer", 0.8))) * (1 + 0.08 * Math.sin(t * 40));
    H.bokeh.enabled = t > fr("streamer", 0.55); H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(HEAD()); H.bokeh.uniforms.aperture.value = 0.0012;
    callout("stream", t, fr("streamer", 0.12), fr("streamer", 0.5), stTree.main[Math.floor(stTree.main.length * 0.6)], 760, 520);
    callout("hairUp", t, fr("streamer", 0.62), end("streamer"), A.at(V(0.05, 1.7, 0.02)), 760, 520);
  }
  // ---- STRIKE: contact → the return stroke, slowed down; stats
  else if (t < at("flash")) {
    const t0 = fr("strike", 0.08);
    const jk = ease(prog(t, t0, t0 + 0.35)); pose(jolt(jk)); A.extra.uHairUp.value = 1;
    if (t < fr("strike", 0.45)) move(t, at("strike"), fr("strike", 0.45), [V(4.2, groundY + 1.0, 5.4), V(0, groundY + 2.6, 0), 40], [V(5.6, groundY + 1.4, 7.2), V(0, groundY + 3.4, 0), 44]);
    else move(t, fr("strike", 0.45), at("flash"), [V(5.6, groundY + 1.4, 7.2), V(0, groundY + 3.4, 0), 44], [V(2.6, groundY + 1.2, 3.4), V(0, groundY + 1.3, 0), 34]);
    bMain.show(true); bMain.grow(1); const sf = strikeFlash(t, t0, 1.2);
    const glowV = t < t0 ? 0.5 : 0.9 + sf * 2.5 + 0.25 * Math.sin(t * 60); bMain.glow(glowV, 2.2);
    if (t >= t0) { stHead.show(false); lightAt(V(0, groundY + 10, 0), 0.25 + sf, V(0.05, 1, 0)); boltL.position.set(0, groundY + 3, 0); boltL.intensity = 60 + sf * 400; H.key.intensity = 0.45 + sf * 6; H.key.color.set(0xdfe6ff); H.bloom.strength = 0.55 + sf * 0.5; A.extra.uHot.value = 0.35 + sf * 0.8; }
    else for (const [b] of [[stTree], [stPole], [stHead]]) { b.show(true); b.grow(1); b.glow(0.8); }
    flash(t, t0, 0.95, 2.2, "#eef3ff");
    hudShow("stats", win(t, fr("strike", 0.3), end("strike") + 0.2));
    for (let i = 0; i < 3; i++) S2(H.$("st" + i), { opacity: win(t, fr("strike", [0.3, 0.5, 0.7][i]), 999), transform: `translateY(${(1 - out(prog(t, fr("strike", [0.3, 0.5, 0.7][i]), fr("strike", [0.3, 0.5, 0.7][i]) + 0.4))) * 30}px)` });
  }
  // ---- FLASH: close on the body: current races OVER the skin; steam bursts; shoes blown off
  else if (t < at("heart")) {
    pose(jolt(1)); A.extra.uHairUp.value = 1;
    const a = at("flash"), m = fr("flash", 0.55);
    if (t < m) move(t, a, m, [V(1.3, groundY + 1.35, 1.9), V(0, groundY + 1.15, 0), 32], [V(-1.2, groundY + 1.0, 1.9), V(0, groundY + 0.95, 0), 34]);
    else move(t, m, at("heart"), [V(0.9, groundY + 0.35, 1.3), V(0, groundY + 0.2, 0), 32], [V(1.4, groundY + 0.5, 1.8), V(0, groundY + 0.3, 0), 36]);
    bMain.show(true); bMain.grow(1); bMain.glow(0.45 + 0.15 * Math.sin(t * 50), 1.1); for (const pt of bMain.parts) pt.halo.visible = false; boltL.position.set(0, groundY + 2.5, 0.5); boltL.intensity = 60; H.key.intensity = 1.2; H.bloom.strength = 0.3; H.key.color.set(0xdfe6ff);
    lightAt(V(0, groundY + 10, 0), 0.35);
    // the glow front over the skin: head → feet, repeating (slow motion)
    const ph = mod((t - a) * 0.55, 1); A.pulse(lerp(1.8, -0.1, ph), 0.06, 1.2, 1); A.pulse(lerp(1.8, -0.1, mod(ph + 0.5, 1)), 0.05, 0.8, 1, 2); A.extra.uHot.value = 0.22;
    skinSpark.visible = true; { const m4 = new THREE.Matrix4(); for (let i = 0; i < NSK; i++) { const v = SKV[(i * 6 + Math.floor(t * 30) * 7) % SKV.length]; const y = v.y, d = Math.abs(y - lerp(1.8, -0.1, ph)); const s = d < 0.18 ? 0.004 + 0.008 * (1 - d / 0.18) : 0; const p = A.at(v).add(V(0, 0, 0)); m4.makeScale(s, s, s).setPosition(p); skinSpark.setMatrixAt(i, m4); } skinSpark.instanceMatrix.needsUpdate = true; }
    // steam bursts off the wet shirt / skin
    const sk = prog(t, fr("flash", 0.5), fr("flash", 0.9));
    steam.forEach((s, i) => { const p = STP[i], u = mod(sk * 1.4 + p.d, 1); const base = A.at(V(Math.cos(p.a) * 0.15, p.y, Math.sin(p.a) * 0.12)); s.position.copy(base).addScaledVector(p.v, u * 0.6); s.scale.setScalar(0.08 + u * 0.32); s.material.opacity = (sk > 0 ? 0.22 : 0) * (1 - u) * clamp(sk * 4); });
    // shoes off: a burst at fr 0.72 → ballistic
    const sb = Math.max(0, t - fr("flash", 0.72));
    if (sb > 0) { A.extra.uShoesOn.value = 0; const g = (vx, vz, sp) => V(vx * sb, 2.2 * sb - 4.9 * sb * sb, vz * sb).setY(Math.max(-0.02, 2.2 * sb - 4.9 * sb * sb)); const l = g(0.9, 0.7), r = g(-0.8, 0.9);
      A.extra.uShoeL.value.set(l.x, l.y, l.z, Math.min(sb * 9, 2.6)); A.extra.uShoeR.value.set(r.x, r.y, r.z, Math.min(sb * 8, 2.2)); }
    callout("flashover", t, fr("flash", 0.15), fr("flash", 0.5), A.at(V(0.12, 1.32, 0.12)), 790, 470);
    callout("steam", t, fr("flash", 0.5), fr("flash", 0.75), A.at(V(-0.1, 1.15, 0.13)), 300, 520);
    title(t, fr("flash", 0.75), end("flash") + 0.1, "It can blow off", "Your shoes");
  }
  // ---- HEART: x-ray; the current inside follows nerves + vessels; the heart stops; the breathing centre switches off
  else if (t < at("restart")) {
    pose(jolt(1)); A.xray(1); rain.visible = true;
    const a = at("heart");
    if (t < fr("heart", 0.5)) move(t, a, fr("heart", 0.5), [V(0.9, groundY + 1.3, 1.6), V(0, groundY + 1.1, 0), 34], [V(0.42, groundY + 1.36, 0.85), V(0.02, groundY + 1.3, 0), 30]);
    else move(t, fr("heart", 0.5), at("restart"), [V(0.42, groundY + 1.36, 0.85), V(0.02, groundY + 1.3, 0), 30], [V(0.3, groundY + 1.6, 0.55), V(0, groundY + 1.56, -0.02), 30]);
    const ph = mod((t - a) * 0.7, 1); A.pulse(lerp(1.75, 0.0, ph), 0.06, 0.8, 1); A.pulse(lerp(1.75, 0.0, mod(ph + 0.45, 1)), 0.05, 0.55, 1, 2); H.bloom.strength = 0.32;
    const stop = prog(t, fr("heart", 0.35), fr("heart", 0.45)); const beat = Math.pow(Math.max(0, Math.sin(t * 7.5)), 6) * (1 - stop); A.extra.uBeat.value = beat;
    A.extra.uBreath.value = Math.sin(t * 1.6) * 0.5 * (1 - prog(t, fr("heart", 0.7), fr("heart", 0.85)));
    const med = win(t, fr("heart", 0.62), end("heart") + 0.3); A.mat.medulla.emissiveIntensity = med * (0.6 + 0.4 * Math.sin(t * 9));
    hudShow("ecg", win(t, at("heart") + 0.2, end("heart") + 0.3)); ecg(t, (tt) => tt < fr("heart", 0.4) ? 1 : 0.02);
    H.$("ecgbpm").textContent = t < fr("heart", 0.42) ? "72 BPM" : "0 BPM"; S2(H.$("ecgbpm"), { color: t < fr("heart", 0.42) ? "#3dff8c" : "#ff5a4a" }); H.$("ecgbr").textContent = t < fr("heart", 0.8) ? "YES" : "NO"; S2(H.$("ecgbr"), { color: t < fr("heart", 0.8) ? "#3dff8c" : "#ff5a4a" });
    H.bokeh.enabled = true; H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(A.at(V(0.03, 1.3, 0.03))); H.bokeh.uniforms.aperture.value = 0.002;
    callout("nerves", t, fr("heart", 0.05), fr("heart", 0.35), A.at(V(0.22, 1.2, 0.0)), 790, 420);
    callout("heart", t, fr("heart", 0.32), fr("heart", 0.6), A.at(V(0.03, 1.29, 0.04)), 300, 520);
    callout("brainstem", t, fr("heart", 0.62), end("heart"), A.at(V(0.005, 1.565, -0.03)), 300, 460);
  }
  // ---- RESTART: on the ground; the heart restarts by itself, breathing doesn't: CPR. Safe to touch.
  else if (t < at("marks")) {
    lieDown(A, 1); pose({ shL: [0, 0, 6], shR: [0, 0, -6], head: [0, 10, 0] }); A.xray(0.55); A.layers.shirt.visible = false;
    R2.root.visible = true; const cpr = Math.max(0, Math.sin((t - at("restart")) * 2 * Math.PI * 1.85));
    R2.root.rotation.set(0, Math.PI / 2, 0);
    R2.setPose({ hipL: [-12, 0, 0], hipR: [-12, 0, 0], knL: [100, 0, 0], knR: [100, 0, 0], pelvis: [14, 0, 0], chest: [30 + cpr * 5, 0, 0], head: [18, 0, 0], shL: [-38, 0, -14], shR: [-38, 0, 14], elL: [-4, 0, 0], elR: [-4, 0, 0] });
    R2.root.position.set(-0.5, groundY - 0.42, -1.22);
    move(t, at("restart"), at("marks"), [V(-1.6, groundY + 2.3, 2.4), V(0, groundY + 0.2, -1.0), 38], [V(-1.0, groundY + 1.8, 1.6), V(0, groundY + 0.2, -1.1), 36]);
    const rs = fr("restart", 0.12); A.extra.uBeat.value = t > rs ? Math.pow(Math.max(0, Math.sin(t * 7.0)), 6) : 0; A.extra.uBreath.value = 0;
    hudShow("ecg", win(t, at("restart"), fr("restart", 0.35))); ecg(t, (tt) => tt < rs ? 0.02 : 0.85); H.$("ecgbpm").textContent = t > rs ? "BEATING" : "0 BPM"; S2(H.$("ecgbpm"), { color: t > rs ? "#3dff8c" : "#ff5a4a" }); H.$("ecgbr").textContent = "NO"; S2(H.$("ecgbr"), { color: "#ff5a4a" });
    hudShow("chips", win(t, fr("restart", 0.35), end("restart") + 0.2));
    for (let i = 0; i < 3; i++) S2(H.$("cp" + i), { opacity: win(t, fr("restart", [0.0, 0.25, 0.65][i] + 0.35 * (i === 0 ? 1 : 0)), 999) });
    hudShow("cpr", win(t, fr("restart", 0.4), fr("restart", 0.7)));
  }
  // ---- MARKS: macro on the chest: a Lichtenberg figure blooms across the skin
  else if (t < at("thunder")) {
    lieDown(A, 1); pose({ shL: [0, 0, 6], shR: [0, 0, -6] }); A.layers.shirt.visible = false; A.extra.uCloth.value = 0; rain.visible = false;
    const k = ease(prog(t, fr("marks", 0.1), fr("marks", 0.7))); drawFern(k); A.extra.uDecalK.value = 1 - 0.55 * prog(t, fr("marks", 0.85), end("marks"));
    const C = A.at(V(0.05, 1.25, 0.1));
    move(t, at("marks"), at("thunder"), [C.clone().add(V(0.25, 0.55, 0.25)), C.clone().add(V(0.02, 0, -0.02)), 30], [C.clone().add(V(-0.12, 0.36, 0.18)), C.clone().add(V(-0.02, 0, -0.04)), 26]);
    H.key.intensity = 1.2; H.key.position.set(3, 8, 2);
    H.bokeh.enabled = true; H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(C); H.bokeh.uniforms.aperture.value = 0.004;
    callout("marks", t, fr("marks", 0.3), end("marks"), A.at(V(0.0, 1.3, 0.12)), 760, 460);
  }
  // ---- THUNDER: the channel's air explodes outward: a shockwave
  else if (t < at("ground")) {
    A.extra.uCloth.value = 1;
    const t0 = at("thunder") + 0.2;
    move(t, at("thunder"), at("ground"), [V(7, groundY + 1.6, 11), V(0, groundY + 3.5, 0), 44], [V(8.5, groundY + 2.2, 13.5), V(0, groundY + 4.5, 0), 46]);
    pose(jolt(0.4)); bMain.show(true); bMain.grow(1); const sf = strikeFlash(t, t0, 0.6); bMain.glow(0.3 + sf * 2.5, 2); lightAt(V(0, groundY + 12, 0), sf * 1.2, V(0, 1, 0));
    shock.visible = true; const sk = prog(t, t0, t0 + 2.4); shock.position.set(0, groundY + 6, 0); shock.scale.set(0.2 + sk * 14, 0.2 + sk * 18, 0.2 + sk * 14); shock.material.uniforms.k.value = (1 - sk) * 1.6;
    const shake = Math.max(0, 1 - Math.abs(t - (t0 + 0.35)) * 2.5); H.cam.position.x += Math.sin(t * 83) * 0.08 * shake; H.cam.position.y += Math.cos(t * 71) * 0.06 * shake;
    flash(t, t0, 0.6, 3, "#eef3ff");
    callout("ears", t, fr("thunder", 0.5), end("thunder"), A.at(V(0.075, 1.6, -0.01)), 790, 520);
    title(t, fr("thunder", 0.1), fr("thunder", 0.5), "Thunder is", "A shockwave");
  }
  // ---- GROUND: it lands nearby and spreads through the ground: up one leg, down the other
  else if (t < at("car")) {
    const t0 = fr("ground", 0.22);
    const wp = (t - at("ground")) * 4.2; pose(walk(t < t0 ? wp : t0 * 4.2 - at("ground") * 4.2));
    A.root.position.z = -1.2 + Math.min(t, t0) * 0 + (Math.min(t, t0) - at("ground")) * 0.55;
    if (t < fr("ground", 0.55)) move(t, at("ground"), fr("ground", 0.55), [V(3.5, groundY + 13, 9), V(3.4, groundY, 1.0), 40], [V(3.0, groundY + 10.5, 7.5), V(3.4, groundY, 1.4), 40]);
    else move(t, fr("ground", 0.55), at("car"), [V(1.6, groundY + 1.0, 2.0), V(0, groundY + 0.5, -0.2), 34], [V(1.3, groundY + 0.7, 1.6), V(0, groundY + 0.45, -0.2), 32]);
    bGround.show(true); bGround.grow(clamp(prog(t, t0 - 0.35, t0) * 1.0)); const sf = strikeFlash(t, t0, 0.8); bGround.glow(0.5 + sf * 2.5, 2);
    if (t > t0) { lightAt(V(GS.x, groundY + 10, GS.z), 0.2 + sf, V(0.1, 1, 0)); boltL.position.copy(GS).add(V(0, 1, 0)); boltL.intensity = 80 + sf * 300; ringU.value.set(GS.x, GS.z, prog(t, t0, t0 + 2.5), 0.9 * (1 - prog(t, t0 + 1.6, t0 + 3.2)));
      for (const m of groundArcs) { m.visible = sf > 0.05 || t < t0 + 1.5; m.material.opacity = clamp(1 - (t - t0) / 1.6); }
      toFeet.visible = true; toFeet.geometry.setDrawRange(0, Math.floor(toFeet.userData.n * clamp((t - t0) / 0.5) / 30) * 30); toFeet.material.opacity = clamp(1.8 - (t - t0) * 0.5);
      const lp = prog(t, t0 + 0.4, t0 + 3.4); if (t > fr("ground", 0.55)) A.xray(clamp((t - fr("ground", 0.55)) / 0.4)); A.extra.uLegP.value.set(mod(lp * 2.2, 1.1) * 1.9 / 1.1 * 1.0, 2.6 * clamp(lp * 5));
    }
    flash(t, t0, 0.5, 3, "#eef3ff");
    hudShow("injury", win(t, fr("ground", 0.05), fr("ground", 0.5)));
    for (let i = 0; i < 3; i++) S2(H.$("ij" + i), { width: `${[52, 33, 4][i] * ease(prog(t, fr("ground", 0.1 + i * 0.06), fr("ground", 0.3 + i * 0.06)))}%` });
    callout("gcurrent", t, t0 + 0.3, fr("ground", 0.55), GS.clone().add(V(-2.4, 0.05, 1.5)), 300, 1000);
    callout("legs", t, fr("ground", 0.62), end("ground"), A.at(V(0.08, 0.5, 0.05)), 790, 600);
  }
  // ---- CAR: inside a car: the metal shell carries the current around you (not the tyres)
  else if (t < at("roy")) {
    car.visible = true; A.layers.shoes.visible = true;
    // seated in the driver's seat (the seat mesh spans both front seats: take the half on the driver's side)
    const side = V(-carFwd.z, 0, carFwd.x); const dseat = carC0.clone().addScaledVector(side, 0.38).addScaledVector(carFwd, -0.25);
    A.root.rotation.set(0, Math.atan2(carFwd.x, carFwd.z), 0); A.setPose(seated);
    A.root.position.set(dseat.x, CAR.y + 0.4 - 0.9, dseat.z);
    const t0 = fr("car", 0.25);
    const cx = carTop;
    if (t < fr("car", 0.45)) move(t, at("car"), fr("car", 0.45), [cx.clone().add(V(6.5, 0.6, 7)), cx.clone().add(V(0, -0.2, 0)), 38], [cx.clone().add(V(5.0, 0.8, 5.5)), cx.clone().add(V(0, -0.1, 0)), 36]);
    else move(t, fr("car", 0.45), at("roy"), [cx.clone().add(V(4.2, 0.2, 4.4)), cx.clone().add(V(0, -0.6, 0)), 34], [cx.clone().add(V(3.4, 0.1, 3.6)), cx.clone().add(V(0, -0.65, 0)), 34]);
    bCar.show(true); bCar.grow(clamp(prog(t, t0 - 0.3, t0))); const sf = strikeFlash(t, t0, 0.9); bCar.glow(0.4 + sf * 2.6, 2.2);
    if (t > t0) { lightAt(cx.clone().add(V(0, 10, 0)), 0.2 + sf, V(0.3, 1, 0.3)); boltL.position.copy(cx).add(V(0, 1.2, 0)); boltL.intensity = 50 + sf * 250; paintM.emissiveIntensity = 0.05 + sf * 0.3;
      carSpark.visible = true; const m4 = new THREE.Matrix4(); let n = 0; for (const path of shellPaths) { const cv = new THREE.CatmullRomCurve3(path); for (let k = 0; k < NCS / shellPaths.length; k++) { const u = mod((t - t0) * 0.9 + k / (NCS / shellPaths.length), 1); const s = 0.012 * (0.5 + 0.5 * Math.sin(k * 3 + t * 40)); m4.makeScale(s, s, s).setPosition(cv.getPointAt(u)); carSpark.setMatrixAt(n++, m4); } } carSpark.instanceMatrix.needsUpdate = true;
      for (const m of carArcs) { m.visible = Math.sin(t * 37 + m.id) > -0.2; m.material.opacity = 0.7 + 0.3 * Math.sin(t * 50); } }
    flash(t, t0, 0.5, 3, "#eef3ff");
    hudShow("carchips", win(t, fr("car", 0.42), end("car") + 0.2));
    S2(H.$("cc0"), { opacity: win(t, fr("car", 0.42), 999) }); S2(H.$("cc1"), { opacity: win(t, fr("car", 0.62), 999) });
    callout("shell", t, fr("car", 0.62), end("car"), shellPaths[0][2], 300, 520);
  }
  // ---- ROY SULLIVAN: seven strikes, sepia
  else if (t < at("orbi")) {
    H.grade.uniforms.uSepia.value = 0.85; skyMat.uniforms.sep.value = 0.9; A.root.position.set(1.5, hill(1.5, 2), 2); A.root.rotation.y = -0.4;
    pose({ head: [-15, 0, 0] });
    move(t, at("roy"), at("orbi"), [V(9, groundY + 2.2, 13), V(1, groundY + 3.5, 0), 44], [V(7.5, groundY + 1.8, 11), V(1, groundY + 3.0, 0), 44]);
    const per = (end("roy") - fr("roy", 0.1)) / 7; let n = 0;
    for (let i = 0; i < 7; i++) { const ti = fr("roy", 0.1) + i * per; if (t >= ti) n = i + 1; const sf = strikeFlash(t, ti, 0.25); if (sf > 0.02) { const b = [bMain, bFar, bGround, bFar2, bMain, bGround, bFar][i]; b.show(true); b.grow(1); b.glow(0.4 + sf * 2); lightAt(b.main[b.main.length - 1].clone().add(V(0, 10, 0)), sf * 0.9); } }
    hudShow("roy", win(t, fr("roy", 0.05), end("roy") + 0.3)); H.$("royn").textContent = String(n);
    H.$("royy").textContent = [1942, 1969, 1970, 1972, 1973, 1976, 1977].slice(0, n).join(" · ");
    title(t, fr("roy", 0.0), fr("roy", 0.45), "Park ranger", "Roy Sullivan", 1500);
  }
  // ---- ORBI: the fastest path → a file reaches every screen on the same Wi-Fi
  else {
    OR.visible = true; A.root.visible = false; H.zoom = 2.1; rain.visible = false; grass.visible = false; scene.fog.density = 0; H.envK.value = 0.6;
    H.key.intensity = 1.6; H.key.color.set(0xfff1e2); H.key.position.set(6, -190, 7); H.key.target.position.set(0, -200, 0); H.hemi.intensity = 0.35;
    H.backdrop.material = studioBack; H.backdrop.scale.setScalar(1);
    const o = OR.position; const W = (x, y, z) => V(x, y, z).add(o);
    const t1 = at("orbi2"), tSend = fr("orbi2", 0.12), tArr = fr("orbi2", 0.42), t3 = at("orbi3"), tLock = fr("orbi3", 0.55), tBurn = fr("orbi3", 0.78);
    if (t < t1) move(t, at("orbi"), t1, [W(0.4, 4.2, 5.2), W(0, 0, 0), 36], [W(-0.4, 3.0, 3.6), W(-0.4, 0.1, 0.2), 34]);
    else if (t < t3) move(t, t1, t3, [W(-0.4, 3.0, 3.6), W(-0.4, 0.1, 0.2), 34], [W(0.2, 3.4, 4.4), W(0.1, 0.3, -0.2), 36]);
    else if (t < tBurn) move(t, t3, tBurn, [W(0.2, 3.4, 4.4), W(0.1, 0.3, -0.2), 36], [W(0.4, 2.0, 2.8), W(0.1, 0.8, -0.9), 34]);
    else move(t, tBurn, at("end"), [W(0.4, 2.0, 2.8), W(0.1, 0.8, -0.9), 34], [W(0.2, 2.6, 3.8), W(0.1, 0.6, -0.6), 36]);
    // the file: lifts off the phone, arcs race to the laptop and the friend's phone
    const lift = out(prog(t, tSend, tSend + 0.5));
    const c0 = P1().add(V(0, 0.4 * lift, 0)); card.position.copy(c0); card.rotation.set(-0.9 + 0.6 * lift, 0.2, 0); card.scale.setScalar(lerp(0.4, 0.75, lift)); card.visible = t > tSend && t < tArr + 0.2;
    const ak = prog(t, tSend + 0.35, tArr);
    for (const m of [arcL, arcF]) { m.visible = ak > 0 && t < tArr + 1.2; m.geometry.setDrawRange(0, Math.floor(m.userData.n * ak / 30) * 30); m.material.opacity = clamp(1.6 - (t - tArr) * 1.4); }
    wifiRings.forEach((m, i) => { const u = mod((t - at("orbi")) * 0.45 + i / 3, 1); m.position.copy(P1()).setY(0.02); m.scale.setScalar(0.3 + u * 3.2); m.material.opacity = (1 - u) * 0.6 * win(t, at("orbi") + 0.4, tArr + 2); });
    lockO.position.copy(P1()).add(V(0, 0.5, 0)); const lk = win(t, tLock - 0.1, tBurn); lockO.scale.setScalar(Math.max(0.001, lk * lerp(1.3, 1, out(prog(t, tLock, tLock + 0.4))))); orbiL.position.copy(lockO.position); orbiL.intensity = lk * 2;
    const burnLeft = Math.round(1800 * (1 - ease(prog(t, tBurn, tBurn + 1.4)))); const bt = `${String(Math.floor(burnLeft / 60)).padStart(2, "0")}:${String(burnLeft % 60).padStart(2, "0")}`;
    const arrived = clamp((t - tArr) / 0.35), burnK = prog(t, tBurn + 0.6, tBurn + 1.8);
    screen(ph1, { file: clamp((t - tSend + 0.6) / 0.3) * (1 - burnK), mine: 1, tap: prog(t, tSend - 0.5, tSend - 0.1), lock: t > tLock ? 1 : 0 }, (g, st) => drawPhoneScr(g, st));
    screen(ph2, { file: arrived * (1 - burnK), mine: 0, tap: 0, lock: 0 }, (g, st) => drawPhoneScr(g, st));
    screen(lap, { file: arrived * (1 - burnK), burn: t > tBurn ? `BURNS IN ${bt}` : null }, (g, st) => drawLapScr(g, st));
    embers.userData.burn(burnK > 0 ? clamp(burnK * 2) * (1 - clamp((burnK - 0.6) / 0.4)) : 0, t, (x, y) => lap.lid.localToWorld(V(x * 1.0, 1.0 + y * 0.7, 0.12)).sub(o).add(o).sub(OR.position));
    title(t, at("orbi") + 0.2, fr("orbi", 0.55), "Lightning takes", "The fastest path");
    title(t, fr("orbi", 0.55), t1 + 0.1, "Orbi Transfer", "Fastest path<br>to the people near you");
    callout("wifi", t, tSend + 0.3, t3, P2().add(o).add(V(0, 0.15, 0)), 790, 520);
    hudShow("secs", win(t, tArr - 0.1, t3));
    hudShow("ochips", win(t, t3 + 0.1, tLock)); for (let i = 0; i < 4; i++) S2(H.$("oc" + i), { opacity: win(t, t3 + 0.1 + i * 0.35, 999) });
    title(t, tLock, tBurn, "Locked on your phone", "Before it leaves");
    hudShow("timer", win(t, tBurn, at("end") - 0.1)); H.$("tmr").textContent = bt; S2(H.$("tmr"), { color: burnLeft < 300 ? "#ff5a36" : "#fff" });
    title(t, tBurn + 0.1, at("end"), "After 30 minutes", "It burns");
  }
  if (!OR.visible) { H.envK.value = 0.3; }
  // flash → scene light
  skyMat.uniforms.k.value = Math.max(skyMat.uniforms.k.value, F);
  if (F > 0.01 && !OR.visible) { H.key.intensity = Math.max(H.key.intensity, 0.45 + F * 4); }
  if (window.DBG) for (const k of window.DBG) eval(k);
  if (rain.visible) rainAt(t, H.cam.position.clone().lerp(V(0, groundY + 1, 0), 0.4));
});
await H.ready();
