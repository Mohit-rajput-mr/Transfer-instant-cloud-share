// What if the Sun vanished? — a text-only cinematic (no narration: captions, live counters, surroundings sound).
// Real physics only: light and gravity both need 8 min 20 s from the Sun (GW170817: gravity moves at c), the Moon goes
// dark 1.3 s after the sky (384,400 km of extra light travel), Jupiter keeps shining ~68–89 min (43 min Sun→Jupiter +
// 33–54 min Jupiter→Earth), Earth leaves on its tangent at 29.8 km/s (107,000 km/h), estimates −18 °C after a week and
// −73 °C after a year, oceans freeze on top but stay liquid below (ice insulates, geothermal heat ~0.09 W/m²),
// chemosynthetic microbes at hydrothermal vents (fluid up to ~400 °C), equilibrium on geothermal heat alone ≈ 35 K
// (−238 °C) so nitrogen (freezes −210 °C) and oxygen (−218 °C) snow out, and a day still lasts 24 h.
import { THREE, H } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import * as SkeletonUtils from "./kit/lib/jsm/utils/SkeletonUtils.js";
const { V, clamp, ease, smooth, out, lerp, win, prog, at, end, fr, callouts, hudEl, hudShow, matte, sh } = H;
const callout = (...a) => { H.cam.updateMatrixWorld(); H.callout(...a); };
const scene = H.scene, cam = H.cam, TAU = Math.PI * 2, W = H.W, HH = H.HH;
const gl = new GLTFLoader(), gltf = (u) => new Promise((ok, no) => gl.load(u, ok, undefined, no));
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const T0 = 19.6;            // the moment we see the Sun go out (8:20 after it vanished)
const MOON_DARK = T0 + 1.3; // its last reflected light arrives 1.3 s later

// ---------- look: no studio set, a real outdoor world ----------
H.backdrop.visible = false; H.floor.visible = false; H.rimA.intensity = 0; H.rimB.intensity = 0; H.envK.value = 0;
cam.far = 20000; cam.updateProjectionMatrix();
H.$("sub").style.display = "none";
document.head.insertAdjacentHTML("beforeend", `<style>
@font-face { font-family: "G"; src: url(fonts/eb-garamond-latin-500-normal.woff2) format("woff2"); font-weight: 500; }
@font-face { font-family: "G"; src: url(fonts/eb-garamond-latin-400-italic.woff2) format("woff2"); font-weight: 400; font-style: italic; }
.cap { position: absolute; left: 80px; right: 80px; top: 1330px; text-align: center; font: italic 400 68px/1.12 "G"; color: #fff; text-shadow: 0 3px 18px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.6); }
.ctr { position: absolute; left: 92px; top: 640px; color: #fff; text-shadow: 0 3px 16px rgba(0,0,0,0.8); }
.ctr .l { font: 600 25px/1 Inter; letter-spacing: 0.34em; text-transform: uppercase; opacity: 0.92; }
.ctr .v { font: 500 112px/1.02 "G"; margin: 10px 0 12px; font-variant-numeric: lining-nums; }
.ctr .s { font: 600 21px/1 Inter; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.78; }
.ttl { position: absolute; left: 60px; right: 60px; top: 380px; text-align: center; font: 500 104px/1.06 "G"; color: #fff; text-shadow: 0 4px 30px rgba(0,0,0,0.7); }
</style>`);
const capEl = hudEl("cap", `<div class="cap" id="capT"></div>`, { inset: "0" });
hudEl("ctr", `<div class="ctr"><div class="l" id="cL"></div><div class="v" id="cV"></div><div class="s" id="cS"></div></div>`, { inset: "0" });
hudEl("ttl", `<div class="ttl">What if the Sun<br>vanished?</div>`, { inset: "0" });
callouts({
  jup: ["Jupiter", "#ffd59a", "still lit by old sunlight"],
  sunwas: ["Where the Sun was", "#ffb24a", "already gone"],
  light: ["Its last light", "#ffd27a", "300,000 km every second"],
  earth: ["Earth", "#7fc8ff", "29.8 km every second"],
  ice: ["Ice", "#cfe9ff", "a blanket against the cold"],
  ocean: ["Liquid ocean", "#4aa3ff", "about +2 °C"],
  vent: ["Hot vent", "#ff8a3d", "water up to 400 °C"],
  life: ["Microbes", "#6dffb0", "live on chemicals, not light"],
});

// ---------- the night sky: real-looking star field with the Milky Way, shared by every outdoor and space shot ----------
const starTex = H.canvasTex(4096, 2048, (g, w, h) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, w, h); H.reseed(11);
  const band = (x) => h * 0.5 + Math.sin((x / w) * TAU + 0.6) * h * 0.28; // the galactic plane across the sphere
  for (let i = 0; i < 2600; i++) { // the Milky Way glow: soft overlapping clouds along the band, with dark dust lanes
    const x = H.rnd() * w, y = band(x) + (H.rnd() + H.rnd() + H.rnd() - 1.5) * h * 0.07, r = 20 + H.rnd() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); const a = 0.035 + H.rnd() * 0.04; const warm = H.rnd() < 0.5;
    gr.addColorStop(0, warm ? `rgba(255,236,210,${a})` : `rgba(205,220,255,${a})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 900; i++) { const x = H.rnd() * w, y = band(x) + (H.rnd() - 0.5) * h * 0.035, r = 10 + H.rnd() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(0,0,0,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 26000; i++) { // stars: many faint, few bright, denser in the band, colour by temperature
    let x = H.rnd() * w, y = H.rnd() * h; if (H.rnd() < 0.45) y = band(x) + (H.rnd() + H.rnd() - 1) * h * 0.1;
    const m = Math.pow(H.rnd(), 7); const r = 0.45 + m * 2.4, a = 0.25 + Math.min(0.75, m * 3 + H.rnd() * 0.3);
    const c = ["255,244,232", "214,226,255", "255,226,190", "255,255,255", "190,210,255"][Math.floor(H.rnd() * 5)];
    g.fillStyle = `rgba(${c},${a})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (m > 0.35) { const gr = g.createRadialGradient(x, y, 0, x, y, r * 5); gr.addColorStop(0, `rgba(${c},0.35)`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r * 5, y - r * 5, r * 10, r * 10); }
  }
});
const STARS = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.MeshBasicMaterial({ map: starTex, side: THREE.BackSide, transparent: true, opacity: 1, depthWrite: false, toneMapped: false, fog: false, color: 0xffffff }));
STARS.renderOrder = -2; STARS.rotation.set(0.5, 0.2, 0.9); scene.add(STARS);

// =====================================================================================================================
// SHORE: a grassy headland above the sea, a lighthouse, a few people watching the afternoon Sun
// =====================================================================================================================
const SHORE = new THREE.Group(); scene.add(SHORE);
// the day sky is a real photograph (Poly Haven "Kloofendal 48d partly cloudy", CC0), its sun found at u 0.6436, v 0.326
const skyPhoto = tex("kit/ph/kloofendal_48d_partly_cloudy_puresky/sky_4k.jpg", true); skyPhoto.wrapS = THREE.ClampToEdgeWrapping; skyPhoto.repeat.set(1, 1);
const skyGeo = new THREE.SphereGeometry(8500, 96, 48); skyGeo.scale(-1, 1, 1);
const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyPhoto, toneMapped: false, fog: false, depthWrite: false, color: 0xffffff }));
sky.renderOrder = -3; SHORE.add(sky);
const sunLocal = (() => { const phi = 0.6436 * TAU, th = 0.326 * Math.PI; return V(Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)); })();
const want = V(0.12, 0, -1); sky.rotation.y = Math.atan2(want.x, want.z) - Math.atan2(sunLocal.x, sunLocal.z);
const SUN_DIR = sunLocal.clone().applyAxisAngle(V(0, 1, 0), sky.rotation.y).normalize();
const skyU = { uniforms: {} };

// water: three.js ocean shader (planar reflection + scrolling normals); the normals are generated here, tileable
const waterNormals = (() => {
  const N = 256, hgt = new Float32Array(N * N); H.reseed(5);
  const waves = Array.from({ length: 28 }, () => ({ kx: Math.round((H.rnd() - 0.5) * 16), ky: Math.round((H.rnd() - 0.5) * 16), ph: H.rnd() * TAU, a: 0.4 + H.rnd() }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const q of waves) { const k = Math.hypot(q.kx, q.ky) || 1; v += (q.a / k) * Math.sin(((q.kx * x + q.ky * y) / N) * TAU + q.ph); } hgt[y * N + x] = v; }
  const c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x + N - 1) % N)], dy = hgt[((y + 1) % N) * N + x] - hgt[((y + N - 1) % N) * N + x];
    const n = V(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * N + x) * 4;
    im.data[i] = (n.x * 0.5 + 0.5) * 255; im.data[i + 1] = (n.y * 0.5 + 0.5) * 255; im.data[i + 2] = (n.z * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
const water = new Water(new THREE.PlaneGeometry(12000, 12000), { textureWidth: 512, textureHeight: 512, waterNormals, sunDirection: SUN_DIR.clone(), sunColor: 0xfff2dc, waterColor: 0x0a2a3a, distortionScale: 3.2, fog: false });
water.rotation.x = -Math.PI / 2; SHORE.add(water);
// the Sun's glare: a soft additive halo over the photo's sun (the photo carries the disc itself)
const glareTex = H.canvasTex(256, 256, (g, w) => { const q = g.createRadialGradient(128, 128, 0, 128, 128, 128); q.addColorStop(0, "rgba(255,250,236,0.9)"); q.addColorStop(0.12, "rgba(255,240,210,0.45)"); q.addColorStop(0.4, "rgba(255,225,180,0.08)"); q.addColorStop(1, "rgba(255,220,170,0)"); g.fillStyle = q; g.fillRect(0, 0, w, w); });
const GLARE = new THREE.Sprite(new THREE.SpriteMaterial({ map: glareTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, fog: false, color: new THREE.Color(1.3, 1.25, 1.15) }));
GLARE.position.copy(SUN_DIR).multiplyScalar(7000); GLARE.scale.setScalar(2600); SHORE.add(GLARE);
// sea ice (fades in over the freeze): blue-white plates with pressure cracks and wind-packed snow
const iceTex = H.canvasTex(2048, 2048, (g, w, h) => {
  g.fillStyle = "#b9cfdc"; g.fillRect(0, 0, w, h); H.reseed(21);
  for (let i = 0; i < 1400; i++) { const x = H.rnd() * w, y = H.rnd() * h, r = 30 + H.rnd() * 160; const gr = g.createRadialGradient(x, y, 0, x, y, r); const v = H.rnd() < 0.5 ? "232,242,250" : "150,180,200"; gr.addColorStop(0, `rgba(${v},0.22)`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.lineCap = "round";
  for (let i = 0; i < 140; i++) { let x = H.rnd() * w, y = H.rnd() * h, a = H.rnd() * TAU; g.strokeStyle = `rgba(70,100,120,${0.25 + H.rnd() * 0.4})`; g.lineWidth = 1 + H.rnd() * 2.5; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 18; s++) { a += (H.rnd() - 0.5) * 0.9; x += Math.cos(a) * 22; y += Math.sin(a) * 22; g.lineTo(x, y); } g.stroke(); }
});
iceTex.wrapS = iceTex.wrapT = THREE.RepeatWrapping; iceTex.repeat.set(90, 90);
const ICE = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({ map: iceTex, color: 0xffffff, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0 }));
ICE.rotation.x = -Math.PI / 2; ICE.position.y = 0.05; ICE.receiveShadow = true; SHORE.add(ICE);

// the headland: displaced grass terrain (Poly Haven aerial grass), a dark rock cliff face, scanned rocks along the edge
const gr = (n, srgb) => tex(`kit/ph/aerial_grass_rock/aerial_grass_rock_${n}_2k.jpg`, srgb, 14, 7);
const GRASS = new THREE.MeshStandardMaterial({ map: gr("diff", true), normalMap: gr("nor_gl"), roughnessMap: gr("rough"), color: 0xffffff, roughness: 1 });
const GRASS_DAY = new THREE.Color(0.95, 1.12, 0.8);
const TOP = 6;
const land = (() => {
  const geo = new THREE.PlaneGeometry(160, 70, 200, 90); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) + 39; // z from 4 to 74
    const edge = 6.5 + Math.sin(x * 0.11) * 1.6 + Math.sin(x * 0.37 + 1) * 0.5;
    let y = TOP + Math.sin(x * 0.09) * 0.5 + Math.sin(z * 0.13 + x * 0.05) * 0.6 + (z > 30 ? (z - 30) * 0.08 : 0);
    if (z < edge) y = lerp(TOP - 7, y, smooth(clamp((z - (edge - 2.4)) / 2.4)));
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals(); const m = sh(new THREE.Mesh(geo, GRASS), false, true); SHORE.add(m); return m;
})();
// frost: the same ground, a crystalline white layer that grows over it
const frostTex = H.canvasTex(1024, 1024, (g, w, h) => { g.clearRect(0, 0, w, h); H.reseed(31);
  for (let i = 0; i < 9000; i++) { const x = H.rnd() * w, y = H.rnd() * h, l = 2 + H.rnd() * 9, a = H.rnd() * TAU; g.strokeStyle = `rgba(240,248,255,${0.35 + H.rnd() * 0.6})`; g.lineWidth = 0.6 + H.rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 1600; i++) { const x = H.rnd() * w, y = H.rnd() * h, r = 4 + H.rnd() * 18; const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, "rgba(235,245,255,0.5)"); q.addColorStop(1, "rgba(235,245,255,0)"); g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });
frostTex.wrapS = frostTex.wrapT = THREE.RepeatWrapping; frostTex.repeat.set(80, 35);
const FROST = new THREE.Mesh(land.geometry, new THREE.MeshStandardMaterial({ map: frostTex, color: 0xe8f2ff, roughness: 0.5, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
SHORE.add(FROST);
const SNOWG = new THREE.Mesh(land.geometry, new THREE.MeshStandardMaterial({ color: 0xf2f6ff, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, map: frostTex }));
SHORE.add(SNOWG);
const cliff = new THREE.Mesh(new THREE.PlaneGeometry(160, 9, 160, 12), new THREE.MeshStandardMaterial({ color: 0x3b3833, roughness: 0.95, map: tex("kit/ph/aerial_grass_rock/aerial_grass_rock_diff_2k.jpg", true, 20, 1.2) }));
{ const p = cliff.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 0.7) * 0.4 + Math.sin(x * 2.3 + y) * 0.25 + Math.sin(y * 1.7) * 0.3); } cliff.geometry.computeVertexNormals(); }
cliff.position.set(0, 1.6, 4.1); cliff.rotation.x = -0.12; SHORE.add(cliff);
const fit = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; };
const [rockG, boulderG, firG, treeG, soldierG] = await Promise.all([
  gltf("kit/ph/rock_moss_set_01/rock_moss_set_01_1k.gltf"), gltf("kit/ph/boulder_01/boulder_01_1k.gltf"), gltf("kit/ph/fir_sapling/fir_sapling_1k.gltf"),
  gltf("kit/ph/quiver_tree_02/quiver_tree_02_1k.gltf"), gltf("kit/models/Soldier.glb"),
]);
H.reseed(41);
for (let i = 0; i < 26; i++) { const r = fit((i % 3 ? rockG : boulderG).scene.clone()); const x = -70 + i * 5.6 + H.rnd() * 3; r.scale.setScalar(2.2 + H.rnd() * 3.5); r.position.set(x, -0.6 + H.rnd() * 2.5, 2.8 + H.rnd() * 2.6); r.rotation.y = H.rnd() * TAU; SHORE.add(r); }
for (let i = 0; i < 8; i++) { const r = fit(boulderG.scene.clone()); r.scale.setScalar(5 + H.rnd() * 5); r.position.set(-24 + (H.rnd() - 0.5) * 16, -1.5 + H.rnd() * 1.5, -150 + (H.rnd() - 0.5) * 12); r.rotation.y = H.rnd() * TAU; SHORE.add(r); }
for (let i = 0; i < 9; i++) { const r = fit(rockG.scene.clone()); r.scale.setScalar(1.2 + H.rnd() * 1.6); r.position.set(-40 + H.rnd() * 80, -0.4, -6 - H.rnd() * 30); r.rotation.y = H.rnd() * TAU; SHORE.add(r); } // rocks out in the water
const PLANTS = [];
for (let i = 0; i < 14; i++) { const f = fit(firG.scene.clone()); f.scale.setScalar(0.7 + H.rnd() * 0.9); const x = H.rnd() < 0.5 ? -10 + H.rnd() * 7 : 4.5 + H.rnd() * 8, z = 10.5 + H.rnd() * 9; f.position.set(x, TOP + 0.05 + Math.sin(x * 0.09) * 0.5 + Math.sin(z * 0.13 + x * 0.05) * 0.6, z); SHORE.add(f); PLANTS.push(f); }
{ const t = fit(treeG.scene.clone()); t.scale.setScalar(2.6); t.position.set(14, TOP + 0.4, 15); SHORE.add(t); PLANTS.push(t); }
// plants go dark green → brown-grey once photosynthesis stops (colour multiplied in per frame)
const plantMats = []; for (const p of PLANTS) p.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); plantMats.push(m.material); } });
// people: three watchers on the edge (rigged, idling)
const PEOPLE = [];
for (const [x, z, ry, s] of [[-1.6, 9.0, 0.12, 1.0], [0.6, 8.6, -0.05, 0.94], [2.6, 9.4, -0.25, 1.03]]) {
  const p = fit(SkeletonUtils.clone(soldierG.scene)); p.position.set(x, TOP + 0.02 + Math.sin(x * 0.09) * 0.5 + Math.sin(z * 0.13 + x * 0.05) * 0.6, z); p.rotation.y = ry; p.scale.setScalar(s); SHORE.add(p);
  p.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color = new THREE.Color(0.16, 0.16, 0.17); m.material.roughness = 0.9; m.material.metalness = 0; } });
  const mx = new THREE.AnimationMixer(p); mx.clipAction(soldierG.animations.find((a) => a.name === "Idle")).play(); PEOPLE.push({ p, mx, off: x * 1.7 + 3 });
}
// the lighthouse: lathe tower with painted bands, gallery, lantern, cap; a lamp and a rotating beam
const LH = new THREE.Group(); LH.position.set(-24, 3.2, -150); LH.scale.setScalar(1.6); SHORE.add(LH); // on a rock islet out at sea
{ const prof = []; for (let i = 0; i <= 20; i++) { const y = (i / 20) * 13; prof.push(new THREE.Vector2(lerp(1.75, 1.05, i / 20) + (i === 0 ? 0.25 : 0), y)); }
  const bands = H.canvasTex(64, 512, (g, w, h) => { g.fillStyle = "#f2efe8"; g.fillRect(0, 0, w, h); g.fillStyle = "#b8231d"; for (const [a, b] of [[0.18, 0.34], [0.52, 0.68]]) g.fillRect(0, h * a, w, h * (b - a)); });
  const tower = sh(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ map: bands, roughness: 0.6 }))); LH.add(tower);
  const gal = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.18, 48), matte(0x1c1d20, 0.5))); gal.position.y = 13.1; LH.add(gal);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7), matte(0x1c1d20)); post.position.set(Math.cos(a) * 1.5, 13.55, Math.sin(a) * 1.5); LH.add(post); }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 6, 48), matte(0x1c1d20)); rail.rotation.x = Math.PI / 2; rail.position.y = 13.9; LH.add(rail);
  const cap = sh(new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 16, 0, TAU, 0, Math.PI / 2), matte(0x2a1210, 0.45))); cap.position.y = 14.95; LH.add(cap);
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.5), matte(0x1c1d20)); vent.position.y = 16.0; LH.add(vent); }
const LAMP = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.1, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.86, 0.55), toneMapped: false })); LAMP.position.y = 14.35; LH.add(LAMP);
const lampLight = new THREE.PointLight(0xffd9a0, 0, 60, 1.6); lampLight.position.y = 14.35; LH.add(lampLight);
const BEAM = new THREE.Group(); BEAM.position.y = 14.35; LH.add(BEAM);
{ const bt = H.canvasTex(32, 256, (g, w, h) => { const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, "rgba(255,225,170,0.5)"); q.addColorStop(1, "rgba(255,225,170,0)"); g.fillStyle = q; g.fillRect(0, 0, w, h); });
  for (const s of [1, -1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.6, 90, 32, 1, true), new THREE.MeshBasicMaterial({ map: bt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    c.geometry.translate(0, -45, 0); c.rotation.z = (s * Math.PI) / 2; BEAM.add(c); } }
const beamMats = BEAM.children.map((c) => c.material);
// the far coast: a dark ridge on the horizon with a town's lights (they stay on after the Sun goes out)
const RIDGE = new THREE.Mesh((() => { const sh2 = new THREE.Shape(); sh2.moveTo(-3200, 0); for (let i = 0; i <= 60; i++) { const x = -3200 + i * 50; sh2.lineTo(x, (60 + Math.sin(i * 0.45) * 40 + Math.sin(i * 1.3) * 18 + (i > 40 ? (i - 40) * 6 : 0)) * Math.min(1, (60 - i) / 8 + 0.05)); } sh2.lineTo(-200, 0); return new THREE.ShapeGeometry(sh2); })(), new THREE.MeshBasicMaterial({ color: 0x8d969e, fog: false }));
RIDGE.position.set(0, -2, -2600); SHORE.add(RIDGE);
const TOWN = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(Array.from({ length: 420 }, (_, i) => { H.reseed(100 + i); return [-3100 + H.rnd() * 2600, 2 + Math.pow(H.rnd(), 2) * 50, -2590 + H.rnd() * 10]; }).flat(), 3)),
  new THREE.PointsMaterial({ color: new THREE.Color(1, 0.75, 0.45).multiplyScalar(3), size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, fog: false }));
SHORE.add(TOWN);
// the Moon (real angular size: 0.52°) and Jupiter (a steady point), placed in the eastern sky
const MOON_DIR = V(-0.30, 0.42, -1).normalize();
const MOON = new THREE.Mesh(new THREE.SphereGeometry(27.5, 64, 32), new THREE.MeshBasicMaterial({ map: tex("kit/models/planets/moon_1024.jpg", true), toneMapped: false, transparent: true, fog: false }));
MOON.position.copy(MOON_DIR).multiplyScalar(3000); MOON.rotation.y = 1.9; SHORE.add(MOON);
const JUP_DIR = V(-0.55, 0.42, -1).normalize();
const dotTex = H.canvasTex(128, 128, (g, w) => { const q = g.createRadialGradient(64, 64, 0, 64, 64, 64); q.addColorStop(0, "rgba(255,248,230,1)"); q.addColorStop(0.08, "rgba(255,238,205,0.95)"); q.addColorStop(0.25, "rgba(255,220,170,0.25)"); q.addColorStop(1, "rgba(255,220,170,0)"); g.fillStyle = q; g.fillRect(0, 0, w, w); });
const JUP = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, toneMapped: false, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(2, 2, 2) }));
JUP.position.copy(JUP_DIR).multiplyScalar(5000); JUP.scale.setScalar(70); SHORE.add(JUP);
const MSTARS = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute((() => { H.reseed(81); const a = [], up = V(0, 1, 0), sx = new THREE.Vector3().crossVectors(MOON_DIR, up).normalize(), sy = new THREE.Vector3().crossVectors(sx, MOON_DIR).normalize();
  for (let i = 0; i < 260; i++) { const u = (H.rnd() - 0.5) * 0.11, v = (H.rnd() - 0.5) * 0.11; const d = MOON_DIR.clone().add(sx.clone().multiplyScalar(u)).add(sy.clone().multiplyScalar(v)).normalize().multiplyScalar(6000); a.push(d.x, d.y, d.z); } return a; })(), 3)),
  new THREE.PointsMaterial({ map: dotTex, color: new THREE.Color(1.6, 1.6, 1.7), size: 7, sizeAttenuation: false, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
SHORE.add(MSTARS);
// snow (far future: frozen nitrogen and oxygen falling out of the air)
const SNOW_N = 9000, snowP = new Float32Array(SNOW_N * 3), snowSeed = []; H.reseed(51);
for (let i = 0; i < SNOW_N; i++) snowSeed.push([H.rnd() * 60 - 30, H.rnd() * 22, H.rnd() * 40 - 8, H.rnd()]);
const snowTex = H.canvasTex(64, 64, (g, w) => { const q = g.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, "rgba(255,255,255,1)"); q.addColorStop(0.4, "rgba(255,255,255,0.6)"); q.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(0, 0, w, w); });
const SNOW = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(snowP, 3)), new THREE.PointsMaterial({ map: snowTex, size: 0.16, transparent: true, depthWrite: false, color: 0xeef4ff, opacity: 1 }));
SNOW.frustumCulled = false; SHORE.add(SNOW);

// =====================================================================================================================
// SPACE: the dark Earth (only city lights left) and the orbit seen from above
// =====================================================================================================================
const SPACE = new THREE.Group(); SPACE.position.set(30000, 0, 0); scene.add(SPACE);
const pl = (n, srgb = true) => tex(`kit/models/planets/${n}`, srgb);
const EARTH = new THREE.Mesh(new THREE.SphereGeometry(10, 128, 64), new THREE.MeshStandardMaterial({ map: pl("earth_atmos_2048.jpg"), color: 0x0b0d10, roughness: 1, emissiveMap: pl("earth_lights_2048.png"), emissive: new THREE.Color(1.0, 0.72, 0.42), emissiveIntensity: 2.4 }));
EARTH.rotation.z = 0.41; SPACE.add(EARTH); // 23.4° tilt
const rimGlow = new THREE.Mesh(new THREE.SphereGeometry(10.25, 96, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
  uniforms: { k: { value: 0.25 } }, vertexShader: `varying vec3 vN, vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float k; varying vec3 vN, vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(vec3(0.25,0.4,0.7) * f * k, 1.0); }` }));
EARTH.add(rimGlow);
// the orbit diagram (a separate spot in space, seen from above): the empty place where the Sun was, the dashed orbit,
// Earth's path bending round it, then a straight line off its tangent
const ORB = new THREE.Group(); ORB.position.set(0, 0, -4000); SPACE.add(ORB);
const R = 50;
const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 256 }, (_, i) => V(Math.cos((i / 256) * TAU) * R, 0, Math.sin((i / 256) * TAU) * R))), new THREE.LineDashedMaterial({ color: 0x7fa6c8, dashSize: 1.6, gapSize: 1.4, transparent: true, opacity: 0.55 }));
ring.computeLineDistances(); ORB.add(ring);
const sunGhost = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => V(Math.cos((i / 96) * TAU) * 4, 0, Math.sin((i / 96) * TAU) * 4))), new THREE.LineDashedMaterial({ color: 0xffb24a, dashSize: 0.6, gapSize: 0.5, transparent: true, opacity: 0.8 }));
sunGhost.computeLineDistances(); ORB.add(sunGhost);
const SUNBALL = new THREE.Mesh(new THREE.SphereGeometry(4, 48, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.35).multiplyScalar(4), toneMapped: false, transparent: true })); ORB.add(SUNBALL);
const MINI = new THREE.Mesh(new THREE.SphereGeometry(1.4, 48, 24), new THREE.MeshStandardMaterial({ map: pl("earth_atmos_2048.jpg"), roughness: 1, emissive: new THREE.Color(0.12, 0.2, 0.35), emissiveIntensity: 1 })); ORB.add(MINI);
const PATH_N = 400, pathP = new Float32Array(PATH_N * 3);
const PATH = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pathP, 3)), new THREE.LineBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.95 }));
PATH.frustumCulled = false; ORB.add(PATH);
const orbLight = new THREE.PointLight(0xffc070, 0, 400, 0); ORB.add(orbLight);
const SHELL = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 256 }, (_, i) => V(Math.cos((i / 256) * TAU), 0, Math.sin((i / 256) * TAU)))), new THREE.LineBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.45).multiplyScalar(3), transparent: true, opacity: 0, toneMapped: false }));
const SHELLF = new THREE.Mesh(new THREE.RingGeometry(0.0, 1.0, 128), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { opacity: { value: 0 } },
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform float opacity; varying vec2 vU; void main(){ float r = length(vU - 0.5) * 2.0; float a = smoothstep(0.86, 0.995, r) * (1.0 - smoothstep(0.995, 1.0, r)); gl_FragColor = vec4(vec3(1.0,0.78,0.42) * a * opacity, 1.0); }` }));
SHELLF.rotation.x = -Math.PI / 2; ORB.add(SHELL, SHELLF);
Object.defineProperty(SHELLF.material, "opacity", { set(v) { this.uniforms && (this.uniforms.opacity.value = v); }, get() { return this.uniforms ? this.uniforms.opacity.value : 0; } });

// =====================================================================================================================
// UNDER THE ICE: a side view, the ice ceiling above, black water, a hydrothermal chimney and its plume on the sea floor
// =====================================================================================================================
const DEEP = new THREE.Group(); DEEP.position.set(-30000, 0, 0); scene.add(DEEP);
const iceCeil = new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 120, 120), new THREE.MeshStandardMaterial({ color: 0xd8ecf8, roughness: 0.25, emissive: new THREE.Color(0.22, 0.34, 0.45), emissiveMap: iceTex, map: iceTex.clone(), side: THREE.DoubleSide, fog: false }));
{ const p = iceCeil.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 0.3) * 0.8 + Math.sin(y * 0.4 + x * 0.1) * 0.7 + Math.sin(x * 1.3 + y * 0.9) * 0.2); } iceCeil.geometry.computeVertexNormals(); }
iceCeil.rotation.x = Math.PI / 2; iceCeil.position.y = 30; iceCeil.material.map.repeat.set(6, 6); DEEP.add(iceCeil);
const seabed = sh(new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 160, 160), new THREE.MeshStandardMaterial({ color: 0x2b2824, roughness: 0.95, map: tex("kit/ph/aerial_grass_rock/aerial_grass_rock_diff_2k.jpg", true, 10, 10) })), false, true);
{ const p = seabed.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 0.2) * 1.2 + Math.sin(y * 0.15 + x * 0.07) * 1.4 + Math.sin(x * 0.9 + y * 1.1) * 0.25); } seabed.geometry.computeVertexNormals(); }
seabed.rotation.x = -Math.PI / 2; seabed.position.y = -12; DEEP.add(seabed);
const CHIM = new THREE.Group(); CHIM.position.set(0, -12, 0); DEEP.add(CHIM);
{ H.reseed(61); let y = 0, r = 2.6;
  const rockM = new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.9, emissive: new THREE.Color(0.9, 0.3, 0.05), emissiveIntensity: 0, emissiveMap: H.canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.strokeStyle = "#ff8a3d"; for (let i = 0; i < 40; i++) { g.lineWidth = 1 + H.rnd() * 2; g.beginPath(); let x = H.rnd() * w, yy = H.rnd() * h; g.moveTo(x, yy); for (let s = 0; s < 6; s++) { x += (H.rnd() - 0.5) * 30; yy += (H.rnd() - 0.5) * 30; g.lineTo(x, yy); } g.stroke(); } }) });
  for (let i = 0; i < 9; i++) { const h = 1.4 + H.rnd() * 1.2; const geo = new THREE.CylinderGeometry(r * 0.82, r, h, 20, 4); const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const a = Math.atan2(p.getZ(k), p.getX(k)); const n = 1 + Math.sin(a * 5 + i) * 0.08 + Math.sin(a * 11 + i * 2) * 0.05 + (H.rnd() - 0.5) * 0.08; p.setX(k, p.getX(k) * n); p.setZ(k, p.getZ(k) * n); }
    geo.computeVertexNormals(); const m = sh(new THREE.Mesh(geo, rockM)); m.position.set((H.rnd() - 0.5) * 0.4, y + h / 2, (H.rnd() - 0.5) * 0.4); CHIM.add(m); y += h * 0.92; r *= 0.86; }
  CHIM.userData.top = y; CHIM.userData.mat = rockM;
  for (let i = 0; i < 7; i++) { const b = fit(boulderG.scene.clone()); b.scale.setScalar(1.5 + H.rnd() * 3); b.position.set((H.rnd() - 0.5) * 26, -0.5, (H.rnd() - 0.5) * 18 - 4); b.rotation.y = H.rnd() * TAU; CHIM.add(b); } }
const ventLight = new THREE.PointLight(0xff7a2a, 0, 40, 1.4); ventLight.position.set(0, -10, 2); DEEP.add(ventLight);
const deepFill = new THREE.HemisphereLight(0x3b6a8a, 0x05080a, 0); DEEP.add(deepFill);
// plume: hot mineral-black fluid rising and spreading, lit orange at the mouth
const PL_N = 2200, plP = new Float32Array(PL_N * 3), plC = new Float32Array(PL_N * 3), plS = []; H.reseed(71);
for (let i = 0; i < PL_N; i++) plS.push([H.rnd(), H.rnd() * TAU, H.rnd()]);
const smokeTex = H.canvasTex(128, 128, (g, w) => { const q = g.createRadialGradient(64, 64, 0, 64, 64, 64); q.addColorStop(0, "rgba(255,255,255,0.55)"); q.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(0, 0, w, w); });
const PLUME = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(plP, 3)).setAttribute("color", new THREE.BufferAttribute(plC, 3)), new THREE.PointsMaterial({ map: smokeTex, size: 2.4, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.85 }));
PLUME.frustumCulled = false; DEEP.add(PLUME);
// microbial mats + drifting particles (marine snow) in the light
const MATS = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(Array.from({ length: 900 }, () => { const a = H.rnd() * TAU, r = 2.4 + Math.pow(H.rnd(), 0.6) * 7; return [Math.cos(a) * r, -11.6 + H.rnd() * 0.5, Math.sin(a) * r]; }).flat(), 3)),
  new THREE.PointsMaterial({ map: dotTex, color: new THREE.Color(0.4, 1.6, 0.9), size: 0.5, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
DEEP.add(MATS);
const FLOATS = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(Array.from({ length: 1500 }, () => [(H.rnd() - 0.5) * 60, -12 + H.rnd() * 42, (H.rnd() - 0.5) * 40]).flat(), 3)),
  new THREE.PointsMaterial({ map: snowTex, color: 0x9ab8c8, size: 0.12, transparent: true, depthWrite: false, opacity: 0.5 }));
DEEP.add(FLOATS);

// =====================================================================================================================
// lighting per world
// =====================================================================================================================
const sunL = H.key; sunL.color.set(0xfff0dc); sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 220 }); sunL.shadow.camera.updateProjectionMatrix();
const hemi = H.hemi;
scene.fog = null;
const fogDeep = new THREE.FogExp2(0x03101a, 0.011);

// ---------- counters ----------
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function counter(t) {
  let L = "", Vv = "", Sx = "", k = 0;
  if (t < T0 + 1.6) { // the clock since it vanished: fast for 8 minutes, then real time
    const s = t < 4 ? 0 : t < T0 ? 500 * Math.pow(prog(t, 4, T0), 1.35) : 500 + (t - T0);
    L = "Time since the Sun vanished"; Vv = mmss(Math.min(s, 500 + (t - T0)));
    Sx = t < T0 ? "Sunlight needs 8 min 20 s to get here" : "The light stops arriving"; k = win(t, 4.3, T0 + 1.6, 0.5, 0.4);
  } else if (t < 28.8) { L = "Time since the Sun vanished"; Vv = mmss(500 + (t - T0)); Sx = t < MOON_DARK + 0.4 ? "The light stops arriving" : "The Moon goes dark"; k = win(t, T0 + 1.6, 28.8, 0.01, 0.4); }
  else if (t < 35.2) { L = "Jupiter stays lit for"; Vv = "68–89 min"; Sx = "Its light is 33–54 min away"; k = win(t, 29.2, 35.2, 0.5, 0.4); }
  else if (t < 45.6) { L = "Earth's speed"; Vv = `${fmt(107200)} km/h`; Sx = t < 42.6 ? "Still curving, for now" : "Nothing left to curve around"; k = win(t, 35.8, 45.6, 0.5, 0.4); }
  else if (t < 57.4) {
    const c = t < 49 ? lerp(15, 12, prog(t, 45.6, 49)) : t < 51.6 ? lerp(12, -18, ease(prog(t, 49, 51.4))) : lerp(-18, -73, ease(prog(t, 52, 54.6)));
    L = "Average surface temperature"; Vv = `${c < 0 ? "−" : "+"}${Math.abs(Math.round(c))} °C`; Sx = t < 49 ? "Today: +15 °C" : t < 52 ? "After one week · estimate" : "After one year · estimate"; k = win(t, 46.0, 57.4, 0.5, 0.4);
  } else if (t < 69.4) { L = "Deep ocean"; Vv = "+2 °C"; Sx = "Still liquid"; k = win(t, 60.4, 69.4, 0.5, 0.4); }
  else if (t < 76.4) { L = "Surface temperature"; Vv = `−${Math.round(lerp(73, 238, ease(prog(t, 69.7, 72.4))))} °C`; Sx = t < 73 ? "Millions of years later" : "Air freezes below −210 °C"; k = win(t, 69.9, 76.4, 0.5, 0.4); }
  else if (t < 82.8) { L = "Length of a day"; Vv = "24 h"; Sx = "Earth still spins"; k = win(t, 77.0, 82.8, 0.5, 0.4); }
  else { L = "Time since the Sun vanished"; Vv = "08:20"; Sx = "No one would know"; k = win(t, 83.2, 86.9, 0.5, 0.5); }
  if (k <= 0) return; H.$("cL").textContent = L; H.$("cV").textContent = Vv; H.$("cS").textContent = Sx; hudShow("ctr", k);
}
function caption(t) {
  for (const ln of H.LINES.lines) { if (!ln.text) continue; const k = win(t, ln.at, ln.at + ln.dur, 0.35, 0.35); if (k > 0) { H.$("capT").textContent = ln.text; hudShow("cap", k, { transform: `translateY(${(1 - out(clamp((t - ln.at) / 0.5))) * 10}px)` }); return; } }
}

// ---------- shots ----------
const show = (g) => { SHORE.visible = g === SHORE; SPACE.visible = g === SPACE; DEEP.visible = g === DEEP; };
function cut(t, shots) { for (const s of shots) if (t < s[0]) return s[1](t); }
const P = (x, y, z) => V(x, y, z);
const dolly = (t, a, b, p0, q0, f0, p1, q1, f1, drift = 1) => H.move(t, a, b, [p0, q0, f0], [p1, q1, f1], drift);

function shore(t) {
  show(SHORE);
  const day = t < T0, coldK = prog(t, 46.0, 51.0), freeze = smooth(prog(t, 51.8, 56.2)), future = t >= 69.6 && t < 76.6;
  // sky: the Sun's light on until T0, then nothing but stars (no twilight: there is no Sun to scatter)
  sky.visible = day; GLARE.visible = day; STARS.position.copy(cam.position); STARS.material.opacity = day ? 0 : 1;
  water.material.uniforms.time.value = t * (freeze > 0 ? lerp(0.55, 0.0, freeze) : 0.55);
  water.material.uniforms.sunColor.value.set(day ? 0xfff2dc : 0x000000);
  water.material.uniforms.waterColor.value.set(day ? 0x103a55 : 0x02070c);
  water.material.uniforms.distortionScale.value = lerp(3.2, 0.6, freeze);
  water.visible = freeze < 1 && !future; ICE.material.opacity = future ? 1 : freeze;
  ICE.material.color.set(future ? 0xf2f6ff : 0xffffff);
  sunL.intensity = day ? 3.4 : 0; sunL.position.copy(SUN_DIR).multiplyScalar(120).add(V(0, 0, 10)); sunL.target.position.set(0, TOP, 10);
  hemi.color.set(day ? 0xbcd6ff : 0x7d93c0); hemi.groundColor.set(day ? 0x4a3e2c : 0x0b0e14); hemi.intensity = day ? 1.3 : future ? 0.9 : t > 45.8 ? 0.55 : 0.32;
  H.r.toneMappingExposure = day ? 0.95 : future ? 2.4 : t > 45.8 ? 2.6 : 1.75; H.bloom.strength = day ? 0.22 : 0.32; STARS.position.copy(cam.position); sky.position.copy(cam.position);
  // the Moon: pale by day, brilliant against the black for 1.3 s, then a dark disc that hides the stars behind it
  const mb = day ? 0.42 : t < MOON_DARK ? 1.15 : 0.012;
  MOON.material.color.setScalar(mb); MOON.material.blending = day ? THREE.AdditiveBlending : THREE.NormalBlending; MOON.material.opacity = 1;
  RIDGE.material.color.set(day ? 0x8e9fb4 : 0x07090c); JUP.visible = !day; TOWN.material.opacity = day ? 0 : 1; MSTARS.visible = !day && t < 21.6;
  // lighthouse lamp (it runs on the grid, not the Sun) until the far future
  const lampOn = !future ? 1 : 0; LAMP.material.color.setRGB(1, 0.86, 0.55).multiplyScalar(day ? 1.2 : 3.2 * lampOn + 0.02);
  lampLight.intensity = 0; BEAM.rotation.y = t * 0.9; beamMats.forEach((m) => (m.opacity = day ? 0.0 : 0.38 * lampOn));
  // people watch until the cold sends them in
  for (const q of PEOPLE) { q.p.visible = t < 45.8; q.mx.setTime(t + q.off); }
  // frost and dying plants
  FROST.material.opacity = future ? 1 : clamp(coldK * 1.1) * 0.95;
  GRASS.color.copy(GRASS_DAY).lerp(new THREE.Color(0.82, 0.86, 0.95), future ? 1 : coldK * 0.7);
  const brown = future ? 1 : prog(t, 46.0, 50.0); for (const m of plantMats) { m.color.setRGB(1, 1, 1).lerp(new THREE.Color(0.62, 0.55, 0.47), brown); }
  // snow in the far future
  SNOW.visible = future;
  if (future) for (let i = 0; i < SNOW_N; i++) { const s = snowSeed[i]; const y = ((s[1] - (t - 69.6) * (0.9 + s[3] * 0.8)) % 22 + 22) % 22; snowP[i * 3] = s[0] + Math.sin(t * 0.7 + s[3] * 9) * 0.4 + (t - 69.6) * 0.6 % 60 - 2; snowP[i * 3 + 1] = TOP - 2 + y; snowP[i * 3 + 2] = s[2]; }
  SNOW.geometry.attributes.position.needsUpdate = true;
  SNOWG.material.opacity = future ? smooth(prog(t, 69.6, 72.5)) * 0.85 + 0.1 : 0;
}

function space(t) {
  show(SPACE); STARS.position.copy(cam.position); STARS.material.opacity = 1;
  H.r.toneMappingExposure = 1.2; H.bloom.strength = 0.32; hemi.intensity = 0.0; sunL.intensity = 0;
  EARTH.rotation.y = t * 0.35; // a sped-up day
}

function orbit(t) {
  space(t);
  // Earth goes round the (already empty) centre until the change in gravity arrives at 42.6, then straight on
  const cutT = 42.6, w = 0.32, a0 = -0.9;
  const ang = (s) => a0 + w * (s - 38.8);
  const posAt = (s) => { if (s <= cutT) { const a = ang(s); return V(Math.cos(a) * R, 0, Math.sin(a) * R); } const a = ang(cutT); const p = V(Math.cos(a) * R, 0, Math.sin(a) * R), v = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(R * w); return p.add(v.multiplyScalar(s - cutT)); };
  const e = posAt(t); MINI.position.copy(e); MINI.rotation.y = t * 2; PATH.visible = true; SHELL.material.opacity = 0; SHELLF.material.opacity = 0;
  for (let i = 0; i < PATH_N; i++) { const s = lerp(38.8, t, i / (PATH_N - 1)); const p = posAt(s); pathP[i * 3] = p.x; pathP[i * 3 + 1] = 0.05; pathP[i * 3 + 2] = p.z; }
  PATH.geometry.attributes.position.needsUpdate = true;
  // the Sun drawn faintly at first (where it was), already gone: only its dashed outline remains
  SUNBALL.material.opacity = 0.0; sunGhost.material.opacity = 0.8;
  ring.material.opacity = lerp(0.55, 0.25, prog(t, cutT, cutT + 2));
  const c = ORB.getWorldPosition(V(0, 0, 0));
  const tgt = c.clone().add(e.clone().multiplyScalar(0.45));
  H.move(t, 38.8, 45.8, [c.clone().add(V(10, 120, 95)), c.clone(), 42], [c.clone().add(e.clone().multiplyScalar(0.5)).add(V(18, 105, 100)), tgt, 40], 0.3);
  callout("sunwas", t, 39.3, 45.6, c.clone(), 300, 980);
  callout("earth", t, 40.0, 45.6, ORB.localToWorld(e.clone()), 760, 1120);
}

function lastLight(t) {
  space(t);
  const sec = 500 * Math.pow(prog(t, 4, T0), 1.35); // the same clock as the counter
  const rr = Math.max(4, R * sec / 499);
  SHELL.scale.setScalar(rr); SHELL.material.opacity = 0.9; SHELLF.scale.setScalar(rr); SHELLF.material.opacity = 0.18;
  const a = -1.3; MINI.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); MINI.rotation.y = t;
  PATH.visible = false; ring.material.opacity = 0.4; sunGhost.material.opacity = 0.8; SUNBALL.material.opacity = 0;
  const c = ORB.getWorldPosition(V(0, 0, 0));
  H.move(t, 9.5, 12.9, [c.clone().add(V(0, 150, 80)), c.clone().add(V(10, 0, -8)), 40], [c.clone().add(V(4, 132, 72)), c.clone().add(V(12, 0, -10)), 40], 0.2);
  callout("sunwas", t, 9.8, 12.8, c.clone(), 300, 1040);
  callout("light", t, 10.2, 12.8, ORB.localToWorld(V(Math.cos(-0.4) * rr, 0, Math.sin(-0.4) * rr)), 760, 860);
  callout("earth", t, 10.6, 12.8, ORB.localToWorld(MINI.position.clone()), 790, 470);
}

function deep(t) {
  show(DEEP); scene.fog = fogDeep; STARS.material.opacity = 0;
  H.r.toneMappingExposure = 1.6; H.bloom.strength = 0.32; hemi.intensity = 0; sunL.intensity = 0;
  deepFill.intensity = 0.35; ventLight.intensity = 260 + Math.sin(t * 9) * 25; CHIM.userData.mat.emissiveIntensity = 1.4 + Math.sin(t * 5) * 0.3;
  MATS.material.opacity = smooth(prog(t, 64.5, 66.5));
  const top = CHIM.userData.top - 12;
  for (let i = 0; i < PL_N; i++) { const s = plS[i]; const age = (s[0] + t * 0.11) % 1; const y = top + age * 34; const r = 0.3 + age * age * 9 + age * 1.2;
    plP[i * 3] = Math.cos(s[1] + age * 3) * r * s[2] + Math.sin(t * 0.4 + s[1]) * age * 2; plP[i * 3 + 1] = y; plP[i * 3 + 2] = Math.sin(s[1] + age * 3) * r * s[2];
    const hot = Math.max(0, 1 - age * 5); plC[i * 3] = 0.16 + hot * 1.6; plC[i * 3 + 1] = 0.13 + hot * 0.6; plC[i * 3 + 2] = 0.12 + hot * 0.1; }
  PLUME.geometry.attributes.position.needsUpdate = true; PLUME.geometry.attributes.color.needsUpdate = true;
  const c = DEEP.position;
  if (t < 60.2) H.move(t, 57.6, 60.2, [c.clone().add(V(0, 14, 34)), c.clone().add(V(0, 30, -10)), 46], [c.clone().add(V(4, 12, 32)), c.clone().add(V(0, 26, -8)), 46], 0.4);
  else if (t < 66.0) H.move(t, 60.2, 66.0, [c.clone().add(V(4, 12, 32)), c.clone().add(V(0, 22, -8)), 46], [c.clone().add(V(8, 0, 30)), c.clone().add(V(0, -2, 0)), 44], 0.4);
  else H.move(t, 66.0, 69.6, [c.clone().add(V(8, 0, 30)), c.clone().add(V(0, -2, 0)), 44], [c.clone().add(V(6, -6, 16)), c.clone().add(V(0, -9, 0)), 42], 0.4);
  callout("ice", t, 58.0, 62.2, c.clone().add(V(-6, 29.5, -4)), 300, 520);
  callout("ocean", t, 60.6, 65.6, c.clone().add(V(5, 10, 4)), 780, 900);
  callout("vent", t, 63.6, 69.4, c.clone().add(V(0, CHIM.userData.top - 13, 0)), 300, 980);
  callout("life", t, 66.3, 69.4, c.clone().add(V(4.5, -11.4, 2)), 760, 1180);
}

H.frame("Files that vanish on time · try it on two devices", async (t) => {
  scene.fog = null; deepFill.intensity = 0; ventLight.intensity = 0; orbLight.intensity = 0;
  cut(t, [
    // day on the headland
    [7.0, (t) => { shore(t); dolly(t, 0, 7.0, P(2.2, 10.2, 24), P(-3, 4, -150), 40, P(1.8, 9.6, 21.5), P(-3, 4.5, -150), 38, 0.6); }],
    [9.6, (t) => { shore(t); dolly(t, 7.0, 9.6, P(-0.6, 7.9, 17.5), P(8, 4.5, -150), 32, P(-0.1, 7.9, 16.9), P(9, 5.2, -150), 31, 0.5); }],
    [12.9, lastLight],
    [17.4, (t) => { shore(t); const s0 = SUN_DIR.clone().multiplyScalar(400); dolly(t, 12.9, 17.4, P(5, 11.5, 28), P(-6, 3, -150), 44, P(4.4, 11.6, 26.4), P(4.4, 11.6, 26.4).add(SUN_DIR.clone().multiplyScalar(400)).add(V(0, -95, 0)), 46, 0.5); }],
    // the daytime Moon, telephoto: the blue goes black behind it, and 1.3 s later the Moon itself goes dark
    [21.6, (t) => { shore(t); const p = P(0.2, 7.8, 12); H.look(p, p.clone().add(MOON_DIR.clone().multiplyScalar(100)).add(V(0.0015 * (t - 17.4), 0, 0)), 3.0); }],
    // night on the headland: people under a sky full of stars, the lighthouse sweeping
    [29.0, (t) => { shore(t); dolly(t, 21.6, 29.0, P(4.5, 10.4, 25), P(-8, 4, -150), 46, P(3.8, 10.0, 23.5), P(-8, 22, -150), 50, 0.5); }],
    [35.3, (t) => { shore(t); const p = P(-6, 7.4, 23); const tg = p.clone().add(JUP_DIR.clone().multiplyScalar(60)); dolly(t, 29.0, 35.3, p, tg.clone().add(V(4, -14, 0)), 46, p.clone().add(V(0.6, 0.2, -1)), tg.clone().add(V(2, -8, 0)), 42, 0.4);
      callout("jup", t, 29.6, 35.1, JUP.getWorldPosition(V()), 760, 470); }],
    // space: the dark Earth, only city lights left
    [38.8, (t) => { space(t); const c = SPACE.position; dolly(t, 35.3, 38.8, c.clone().add(V(-10, 6, 30)), c.clone(), 34, c.clone().add(V(-4, 4, 27)), c.clone(), 33, 0.2); }],
    [45.8, orbit],
    // the cold: frost on the grass, plants browning, then the sea freezes over
    [51.6, (t) => { shore(t); H.bokeh.enabled = true; H.bokeh.uniforms.focus.value = 6.0; H.bokeh.uniforms.aperture.value = 0.0012; H.bokeh.uniforms.maxblur.value = 0.006; dolly(t, 45.8, 51.6, P(1.6, 7.4, 17.5), P(0.6, 5.8, 11.5), 38, P(1.1, 7.1, 16.6), P(0.6, 5.8, 11.8), 36, 0.4); }],
    [57.6, (t) => { shore(t); dolly(t, 51.6, 57.6, P(5, 12, 27), P(-8, 2, -150), 46, P(4.2, 14, 25), P(-8, 0, -150), 48, 0.4); }],
    [69.6, deep],
    // the far future: the air snows out onto a frozen world
    [76.6, (t) => { shore(t); dolly(t, 69.6, 76.6, P(4.5, 9.4, 23), P(-8, 4, -150), 44, P(3.4, 8.8, 20.6), P(-8, 5, -150), 42, 0.5); }],
    // Earth drifting through the stars, still turning
    [99, (t) => { space(t); const c = SPACE.position; const k = ease(prog(t, 76.6, 87.2)); H.look(c.clone().add(V(lerp(-3, -40, k), lerp(3, 20, k), lerp(26, 140, k))), c.clone().add(V(lerp(0, -6, k), 0, 0)), lerp(34, 30, k)); }],
  ]);
  sky.position.copy(cam.position); STARS.position.copy(cam.position); // the sky domes follow this frame's camera
  if (t < 4.6) hudShow("ttl", win(t, 0.4, 4.6, 0.8, 0.6), { transform: `translateY(${(1 - out(clamp((t - 0.4) / 1.2))) * 16}px)` });
  counter(t); caption(t);
  if (t > T0 - 0.02 && t < T0 + 0.25) H.flash(t, T0 + 0.02, 0.35, 3, "#000");
});
await H.ready();
