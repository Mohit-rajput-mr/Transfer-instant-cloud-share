// What if a black hole was heading for Earth? — ONE locked camera on a city waterfront at night; text in the Orbi style.
// Physics (10 solar masses, Schwarzschild radius 29.5 km → 59 km wide):
//  · you don't feel its pull (Earth free-falls with you); only the difference across Earth matters: tides ∝ M/d³
//  · equilibrium tide = 0.54 m × (M_bh/M_moon) × (384,400 km / d)³ → ×4.6 at 1 AU, 131 m at 40 M km, ~5 km at 12 M km
//  · the Moon stays bound to Earth only while d > r_moon·(M_bh/3M_earth)^⅓ ≈ 40 million km, then it is pulled away;
//    its tidal disruption radius around the hole ≈ R_moon·(M_bh/M_moon)^⅓ ≈ 1.1 million km → a disk that wide
//  · the near-side tidal acceleration 2GM·R/d³ equals g at d ≈ R_earth·(2M/m)^⅓ ≈ 1.2 million km: things float
//  · inside the event horizon nothing, not even light, gets out
import { THREE, H } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import { ShaderPass } from "./kit/lib/jsm/postprocessing/ShaderPass.js";
import * as SkeletonUtils from "./kit/lib/jsm/utils/SkeletonUtils.js";
const { V, clamp, ease, smooth, out, lerp, win, prog, hudEl, hudShow, matte, sh } = H;
const scene = H.scene, cam = H.cam, TAU = Math.PI * 2, W = H.W, HH = H.HH;
const gl = new GLTFLoader(), gltf = (u) => new Promise((ok, no) => gl.load(u, ok, undefined, no));
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const rand = (s) => { let x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

H.backdrop.visible = false; H.floor.visible = false; H.rimA.intensity = 0; H.rimB.intensity = 0; H.envK.value = 0; H.key.intensity = 0;
cam.far = 20000; cam.near = 0.1; cam.updateProjectionMatrix();
H.$("sub").style.display = "none";

// ---------- the one camera: eye level on the promenade, looking across the bay, a little up ----------
const CAM = V(0, 7.6, 31), PITCH = THREE.MathUtils.degToRad(-1.5), FOV = 56; // eye level on a terrace above the promenade
const AIM = CAM.clone().add(V(-0.04, Math.sin(PITCH), -Math.cos(PITCH)).multiplyScalar(100));
H.look(CAM, AIM, FOV); cam.updateMatrixWorld();
const dirAt = (u, v) => new THREE.Vector3(u * 2 - 1, v * 2 - 1, 0.5).unproject(cam).sub(CAM).normalize();
const BHUV = new THREE.Vector2(0.52, 0.72), MOONUV = new THREE.Vector2(0.76, 0.9);
const BH_DIR = dirAt(BHUV.x, BHUV.y), MOON_DIR = dirAt(MOONUV.x, MOONUV.y);

// ---------- Orbi type: Archivo uppercase + JetBrains Mono labels ----------
document.head.insertAdjacentHTML("beforeend", `<style>
.bcap { position: absolute; left: 70px; right: 70px; top: 1385px; text-align: center; font: 800 58px/1.08 "D"; font-stretch: 112%; text-transform: uppercase; letter-spacing: 0.005em; color: #fff; text-shadow: 0 4px 22px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.8); }
.bcap b { color: #3dff8c; font-weight: 800; }
.bttl { position: absolute; left: 60px; right: 60px; top: 300px; text-align: center; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.85); }
.bttl .k { font: 700 26px/1 "M"; letter-spacing: 0.38em; color: #3dff8c; margin-bottom: 22px; }
.bttl .t { font: 900 92px/0.98 "D"; font-stretch: 115%; text-transform: uppercase; }
.bctr { position: absolute; left: 70px; color: #fff; text-shadow: 0 3px 16px rgba(0,0,0,0.9); }
.bctr .l { font: 700 22px/1 "M"; letter-spacing: 0.3em; text-transform: uppercase; color: #3dff8c; }
.bctr .v { font: 900 84px/1 "D"; font-stretch: 112%; margin: 10px 0 8px; font-variant-numeric: tabular-nums; }
.bctr .s { font: 600 20px/1 "M"; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.8; }
</style>`);
hudEl("cap", `<div class="bcap" id="capT"></div>`, { inset: "0" });
hudEl("ttl", `<div class="bttl"><div class="k">A THOUGHT EXPERIMENT</div><div class="t">What if a black hole was heading for Earth?</div></div>`, { inset: "0" });
hudEl("c1", `<div class="bctr" style="top:120px"><div class="l" id="aL"></div><div class="v" id="aV"></div><div class="s" id="aS"></div></div>`, { inset: "0" });
hudEl("c2", `<div class="bctr" style="top:300px"><div class="l" id="bL"></div><div class="v" id="bV"></div><div class="s" id="bS"></div></div>`, { inset: "0" });

// ---------- physics of the approach (km) ----------
const KEYS = [[0, 1.5e8], [22, 9e7], [34, 4e7], [46, 1.2e7], [58, 2.5e6], [64, 1.2e6], [72, 6e5], [80, 6e4], [86, 30], [93, 1]];
const dist = (t) => { for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) { const [a, da] = KEYS[i - 1], [b, db] = KEYS[i]; return Math.exp(lerp(Math.log(da), Math.log(db), (t - a) / (b - a))); } return 1; };
const tideM = (d) => 0.54 * 2.72e8 * Math.pow(384400 / d, 3);
const weight = (d) => Math.max(0, 1 - Math.pow(1.2e6 / d, 3));
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

// =====================================================================================================================
// THE WORLD
// =====================================================================================================================
// city glow on the horizon (light pollution), fading with the power cut
const GLOW = new THREE.Mesh(new THREE.SphereGeometry(8800, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { k: { value: 1 }, col: { value: new THREE.Color(0.3, 0.26, 0.24) } },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform float k; uniform vec3 col; varying vec3 vP; void main(){ float h = max(vP.y, 0.0); gl_FragColor = vec4(col * k * (exp(-h * 9.0) * 0.55 + exp(-h * 3.0) * 0.12), 1.0); }` }));
GLOW.renderOrder = -1; scene.add(GLOW);

// water of the bay: the ocean shader (reflections) on a real moving surface — eight Gerstner waves (deep-water speed
// c = √(g/k)) displace the mesh, tilt its normals and whiten their crests; storm and tides scale them
const WAVES = [[0.35, 1, 47, 0.26], [-0.7, 0.75, 31, 0.2], [0.95, 0.55, 19.7, 0.14], [-0.25, 1, 13.3, 0.1], [0.75, -0.45, 8.9, 0.07], [-0.9, 0.3, 6.1, 0.05], [0.2, -0.95, 4.3, 0.032], [-0.45, -0.85, 2.9, 0.02]]
  .map(([x, z, L, a]) => { const n = Math.hypot(x, z); return new THREE.Vector4(x / n, z / n, L, a); });
const waterGeo = (() => { // dense near the camera, coarse far away (local XY; the mesh is rotated flat, world z = −local y)
  const zs = []; for (let z = 46; z > -4200; z -= 0.22 * (1 + Math.max(0, 31 - z) / 7)) zs.push(z);
  const xs = [0]; for (let x = 0.3; x < 2200; x += 0.3 * (1 + x / 9)) { xs.push(x); xs.unshift(-x); }
  const pos = new Float32Array(zs.length * xs.length * 3), idx = [];
  zs.forEach((z, j) => xs.forEach((x, i) => pos.set([x, -z, 0], (j * xs.length + i) * 3)));
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) { const a = j * xs.length + i, b = a + 1, c = a + xs.length, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3)); g.setIndex(idx); return g;
})();
const water = new Water(waterGeo, { textureWidth: 512, textureHeight: 512, waterNormals, sunDirection: MOON_DIR.clone(), sunColor: 0x9fb3d6, waterColor: 0x04101a, distortionScale: 2.6, fog: false });
water.rotation.x = -Math.PI / 2; scene.add(water); water.frustumCulled = false;
{ const m = water.material;
  m.uniforms.uW = { value: WAVES }; m.uniforms.uAmp = { value: 0.6 }; m.uniforms.uWT = { value: 0 }; m.uniforms.uFoam = { value: 0 };
  m.vertexShader = m.vertexShader.replace("varying vec4 worldPosition;", `varying vec4 worldPosition; varying vec3 vWaveN; varying float vCrest;
    uniform vec4 uW[8]; uniform float uAmp, uWT;`).replace(`mirrorCoord = modelMatrix * vec4( position, 1.0 );
					worldPosition = mirrorCoord.xyzw;
					mirrorCoord = textureMatrix * mirrorCoord;
					vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );`, `vec4 wp = modelMatrix * vec4( position, 1.0 );
					vec3 base = wp.xyz; vec3 dX = vec3(1.0, 0.0, 0.0), dZ = vec3(0.0, 0.0, 1.0); float crest = 0.0;
					float fade = 1.0 / (1.0 + max(0.0, 31.0 - base.z) / 220.0);
					for (int i = 0; i < 8; i++) {
						vec2 d = uW[i].xy; float k = 6.2831853 / uW[i].z, a = uW[i].w * uAmp * fade, c = sqrt(9.81 / k);
						float f = k * (dot(d, base.xz) - c * uWT), Q = 0.55 / (k * max(a, 1e-4) * 8.0);
						Q = min(Q, 1.0 / (k * max(a, 1e-4) * 8.0));
						wp.x += Q * a * d.x * cos(f); wp.z += Q * a * d.y * cos(f); wp.y += a * sin(f);
						dX += vec3(-Q * d.x * d.x * k * a * sin(f), d.x * k * a * cos(f), -Q * d.x * d.y * k * a * sin(f));
						dZ += vec3(-Q * d.x * d.y * k * a * sin(f), d.y * k * a * cos(f), -Q * d.y * d.y * k * a * sin(f));
						crest += max(0.0, sin(f)) * a;
					}
					vWaveN = normalize(cross(dZ, dX)); vCrest = crest / max(uAmp, 0.05);
					mirrorCoord = wp; worldPosition = wp;
					mirrorCoord = textureMatrix * mirrorCoord;
					vec4 mvPosition = viewMatrix * wp;`);
  m.fragmentShader = m.fragmentShader.replace("uniform float distortionScale;", "uniform float distortionScale; uniform float uFoam; varying vec3 vWaveN; varying float vCrest;")
    .replace("vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );", "vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) + vec3(vWaveN.x, 0.0, vWaveN.z) * 2.2 );")
    .replace("vec3 outgoingLight = albedo;", "float foam = smoothstep(0.75, 1.15, vCrest) * uFoam * (0.4 + 0.6 * noise.x) * 0.7; vec3 outgoingLight = mix(albedo, vec3(0.75, 0.78, 0.8) * (0.25 + diffuseLight * 0.6) + reflectionSample * 0.15, clamp(foam, 0.0, 0.85));");
  m.needsUpdate = true; }
// the same waves in JS (spray, floating things)
const waveY = (x, z, amp, tt) => { let y = 0; for (const w of WAVES) { const k = TAU / w.z, c = Math.sqrt(9.81 / k); y += w.w * amp * Math.sin(k * (w.x * x + w.y * z - c * tt)); } return y; };

// ---------- the promenade: worn concrete, a kerb and railing at the water, benches, bins, lamps, young trees ----------
const CITY = new THREE.Group(); scene.add(CITY);
const cf = (n, srgb, rx, ry) => tex(`kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_${n}_1k.jpg`, srgb, rx, ry);
const walkM = new THREE.MeshStandardMaterial({ map: cf("diff", true, 12, 8), normalMap: cf("nor_gl", false, 12, 8), roughnessMap: cf("rough", false, 12, 8), color: 0x9a948c, roughness: 1 });
const walk = sh(new THREE.Mesh(new THREE.PlaneGeometry(90, 40), walkM), false, true); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0, 22); CITY.add(walk);
const quay = sh(new THREE.Mesh(new THREE.BoxGeometry(90, 3.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x55524d, roughness: 0.9, map: cf("diff", true, 20, 1) }))); quay.position.set(0, -1.6, 2.4); CITY.add(quay);
const steel = H.metal(0x9aa3ab, 0.35);
for (let x = -44; x <= 44; x += 1.6) { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 8), steel)); p.position.set(x, 0.52, 2.2); CITY.add(p); }
for (const y of [1.05, 0.6]) { const r = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 88, 8), steel)); r.rotation.z = Math.PI / 2; r.position.set(0, y, 2.2); CITY.add(r); }
const LAMPS = [], PROPS = [];
for (const x of [-20, -10, 0, 10, 20]) {
  const g = new THREE.Group(); g.position.set(x + 3, 0, 3.4); CITY.add(g); PROPS.push(g);
  const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 12), H.metal(0x2a2d31, 0.4))); pole.position.y = 2.3; g.add(pole);
  const arm = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), H.metal(0x2a2d31, 0.4))); arm.rotation.z = Math.PI / 2; arm.position.set(0.4, 4.55, 0); g.add(arm);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.18, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.55).multiplyScalar(4), toneMapped: false })); head.position.set(0.8, 4.45, 0); g.add(head);
  const L = new THREE.PointLight(0xffc98a, 30, 22, 1.5); L.position.set(0.8, 4.2, 0); g.add(L);
  LAMPS.push({ g, head, L, ph: rand(x) * 10 });
}
for (const x of [-15, -5, 5, 15]) { // benches facing the water
  const b = new THREE.Group(); b.position.set(x, 0, 4.4); CITY.add(b); PROPS.push(b);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.7 });
  for (let i = 0; i < 3; i++) { const s = sh(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.12), wood)); s.position.set(0, 0.45, -0.18 + i * 0.16); b.add(s); }
  for (let i = 0; i < 2; i++) { const s = sh(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.04), wood)); s.position.set(0, 0.62 + i * 0.16, 0.22); b.add(s); }
  for (const lx of [-0.8, 0.8]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.5), H.metal(0x26292c, 0.5))); l.position.set(lx, 0.22, 0); b.add(l); }
}
const firG = await gltf("kit/ph/fir_sapling/fir_sapling_1k.gltf");
const fit = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; };
for (const [x, z] of [[-24, 13], [-12.5, 14.5], [12.5, 14.5], [24, 13]]) { const f = fit(firG.scene.clone()); f.scale.setScalar(2.4); f.position.set(x, 0, z); CITY.add(f); PROPS.push(f); }

// ---------- the skyline across the bay: towers with lit windows, red aviation lights; some will fall ----------
const winTex = (seed, warm) => H.canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = "#05070a"; g.fillRect(0, 0, w, h);
  for (let y = 2; y < h; y += 14.2) { const lit = rand(seed + y) < 0.85; for (let x = 1; x < w; x += 12.8) { const r = rand(seed + x * 7.1 + y * 3.3);
    g.fillStyle = "rgba(40,48,60,0.5)"; g.fillRect(x, y + 1, 10.5, 10); if (lit && r < 0.48) { const c = r < 0.1 ? "150,190,255" : warm ? "255,205,140" : "240,230,205"; g.fillStyle = `rgba(${c},${0.45 + rand(r * 99) * 0.55})`; g.fillRect(x, y + 1, 10.5, 10); } } }
});
const WTEX = [winTex(1, true), winTex(2, false), winTex(3, true), winTex(4, false)];
WTEX.forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
const TOWERS = [];
{ let x = -760;
  while (x < 760) {
    const wdt = 18 + rand(x) * 34, hgt = (24 + Math.pow(rand(x + 3), 2.2) * 190) * (1 - Math.abs(x) / 1600), z = -620 - rand(x + 9) * 320;
    const t = WTEX[Math.floor(rand(x + 5) * 4)].clone(); t.needsUpdate = true; t.repeat.set(wdt / 40, hgt / 126);
    const mat = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.6, metalness: 0.2, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.25 });
    const g = new THREE.Group(); g.position.set(x + wdt / 2, -2, z); scene.add(g);
    const fall = rand(x + 11) < 0.35 && hgt > 60;
    const SEG = fall ? 6 : 1, segs = [];
    for (let i = 0; i < SEG; i++) { const sh2 = hgt / SEG; const m = new THREE.Mesh(new THREE.BoxGeometry(wdt, sh2, wdt * 0.8), mat); m.position.y = sh2 * (i + 0.5); g.add(m); segs.push({ m, y0: m.position.y, rx: (rand(x + i) - 0.5) * 0.6, rz: (rand(x + i * 3) - 0.5) * 0.6, dx: (rand(x + i * 5) - 0.5) * 30 }); }
    if (hgt > 70) { const cw = wdt * (0.5 + rand(x + 31) * 0.25), ch = 6 + rand(x + 33) * 18; const crown = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cw * 0.8), mat); crown.position.y = hgt + ch / 2; g.add(crown); segs.push({ m: crown, y0: crown.position.y, rx: 0.2, rz: -0.3, dx: 4 });
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 14 + rand(x) * 20, 6), H.metal(0x3a3d41, 0.5)); ant.position.y = hgt + ch + 8; g.add(ant); segs.push({ m: ant, y0: ant.position.y, rx: 0.5, rz: 0.4, dx: 2 }); }
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.2, 0.1), toneMapped: false })); red.position.y = hgt > 70 ? hgt + 40 : hgt + 1; g.add(red);
    TOWERS.push({ g, mat, segs, fall, hgt, red, tFall: 49 + rand(x + 17) * 8, ph: rand(x) * 6 });
    x += wdt + 4 + rand(x + 21) * 18;
  }
}
// mountains far behind (dark, faintly lit by the disk later)
const HILLS = new THREE.Mesh((() => { const s = new THREE.Shape(); s.moveTo(-4000, 0); for (let i = 0; i <= 80; i++) s.lineTo(-4000 + i * 100, 140 + Math.sin(i * 0.31) * 90 + Math.sin(i * 0.9) * 35); s.lineTo(4000, 0); return new THREE.ShapeGeometry(s); })(), new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 1 }));
HILLS.position.set(0, -2, -2800); scene.add(HILLS);

// ---------- the Moon (real size, 0.52°) ----------
const MOON = new THREE.Mesh(new THREE.SphereGeometry(27.2, 64, 32), new THREE.MeshBasicMaterial({ map: tex("kit/models/planets/moon_1024.jpg", true), toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
const MOON_D = 3000; MOON.position.copy(CAM).add(MOON_DIR.clone().multiplyScalar(MOON_D)); scene.add(MOON);
const moonLight = new THREE.DirectionalLight(0xaec3e8, 0.35); moonLight.position.copy(MOON_DIR).multiplyScalar(100); scene.add(moonLight, moonLight.target);
H.hemi.color.set(0x5d6f96); H.hemi.groundColor.set(0x0c0a08); H.hemi.intensity = 0.25;
// the disk's light (grows from the moment the Moon is shredded)
const diskLight = new THREE.DirectionalLight(0xffb070, 0); diskLight.position.copy(BH_DIR).multiplyScalar(100); diskLight.castShadow = true;
diskLight.shadow.mapSize.set(2048, 2048); Object.assign(diskLight.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 }); diskLight.shadow.bias = -0.0004;
diskLight.target.position.set(0, 0, 8); scene.add(diskLight, diskLight.target);
// the Moon's debris streaming into the hole
const STREAM_N = 1600, streamP = new Float32Array(STREAM_N * 3);
const dotTex = H.canvasTex(64, 64, (g, w) => { const q = g.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, "rgba(255,255,255,1)"); q.addColorStop(0.35, "rgba(255,255,255,0.5)"); q.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(0, 0, w, w); });
const STREAM = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(streamP, 3)), new THREE.PointsMaterial({ map: dotTex, color: new THREE.Color(1.4, 0.8, 0.45), size: 4, sizeAttenuation: false, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: 0 }));
STREAM.frustumCulled = false; scene.add(STREAM);

// ---------- people ----------
const [soldierG, xbotG] = await Promise.all([gltf("kit/models/Soldier.glb"), gltf("kit/models/Xbot.glb")]);
const COATS = [[0.08, 0.09, 0.11], [0.22, 0.12, 0.08], [0.32, 0.3, 0.27], [0.1, 0.14, 0.24], [0.42, 0.08, 0.07], [0.16, 0.2, 0.15], [0.5, 0.42, 0.3], [0.05, 0.05, 0.05]];
const PEOPLE = [];
for (let i = 0; i < 46; i++) {
  const isX = rand(i + 0.5) < 0.55, G = isX ? xbotG : soldierG;
  const p = fit(SkeletonUtils.clone(G.scene)); const c = COATS[Math.floor(rand(i + 1.7) * COATS.length)];
  p.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color = new THREE.Color(...c).multiplyScalar(isX && m.material.name.includes("Joints") ? 0.6 : 1); m.material.roughness = 0.85; m.material.metalness = 0; m.frustumCulled = false; } });
  const s = 0.9 + rand(i + 2.3) * 0.18; p.scale.setScalar(s); CITY.add(p);
  const mx = new THREE.AnimationMixer(p), clip = (n) => G.animations.find((a) => a.name.toLowerCase() === n);
  const acts = { idle: mx.clipAction(clip("idle")), walk: mx.clipAction(clip("walk")), run: mx.clipAction(clip("run")) };
  Object.values(acts).forEach((a) => { a.play(); a.weight = 0; });
  const dir = rand(i + 4.1) < 0.5 ? 1 : -1, still = rand(i + 6.6) < 0.22;
  PEOPLE.push({ p, mx, acts, f0: isX ? 0 : Math.PI, dir, still, z: 4.6 + rand(i + 3.9) * 15, x0: -26 + rand(i + 8.2) * 52, spd: 1.1 + rand(i + 9.4) * 0.5, off: rand(i + 1.1) * 4, react: 36 + rand(i + 5.5) * 5, lift: 60.5 + rand(i + 7.7) * 6, spin: V(rand(i + 1) - 0.5, rand(i + 2) - 0.5, rand(i + 3) - 0.5).multiplyScalar(2.4), mats: [] });
  p.traverse((m) => { if (m.isMesh) PEOPLE[PEOPLE.length - 1].mats.push(m.material); });
}

// ---------- particles: spray, dust of falling towers, floating debris, ash ----------
const mkPts = (n, size, color, add = false, att = true) => { const pos = new Float32Array(n * 3); const P = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ map: dotTex, size, color, transparent: true, depthWrite: false, sizeAttenuation: att, opacity: 0, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); P.frustumCulled = false; scene.add(P); return { P, pos, n }; };
const SPRAY = mkPts(2500, 0.12, 0xcfe0ee);
const DUST = mkPts(3000, 26, 0x6b625a);
const DEBRIS = (() => { const g = new THREE.Group(); scene.add(g); const geo = new THREE.IcosahedronGeometry(0.6, 0); const ms = [0x7a746c, 0x9a9188, 0x8b847c, 0xaca398].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
  const list = []; for (let i = 0; i < 220; i++) { const m = new THREE.Mesh(geo, ms[i % 4]); const s = 0.04 + Math.pow(rand(i + 0.3), 4) * 0.45; m.scale.set(s * (0.5 + rand(i + 1)), s * (0.3 + rand(i + 2)), s * (0.5 + rand(i + 3))); m.castShadow = true; g.add(m);
    list.push({ m, p0: V(-24 + rand(i + 4) * 48, 0.05, 3 + rand(i + 5) * 13), t0: 60 + rand(i + 6) * 9, v: 0.4 + rand(i + 7) * 1.6, spin: V(rand(i + 8), rand(i + 9), rand(i + 10)).multiplyScalar(3) }); }
  return list; })();
const ASH = mkPts(9000, 0.09, 0x8f8a84);
const INFALL_N = 14000, infallP = new Float32Array(INFALL_N * 3), infallC = new Float32Array(INFALL_N * 3);
const INFALL = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(infallP, 3)).setAttribute("color", new THREE.BufferAttribute(infallC, 3)), new THREE.PointsMaterial({ map: dotTex, size: 3.2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: 0 }));
INFALL.frustumCulled = false; scene.add(INFALL);
// lava cracks across the promenade as the crust tears
const crackTex = H.canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.lineCap = "round";
  for (let k = 0; k < 9; k++) { let x = rand(k + 0.1) * w, y = rand(k + 0.2) * h, a = rand(k + 0.3) * TAU; for (let s = 0; s < 70; s++) { const nx = x + Math.cos(a) * 16, ny = y + Math.sin(a) * 16; for (const [lw, c] of [[18, "rgba(255,90,20,0.25)"], [7, "rgba(255,150,50,0.8)"], [2.5, "rgba(255,240,190,1)"]]) { g.strokeStyle = c; g.lineWidth = lw * (1 - s / 90); g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); } x = nx; y = ny; a += (rand(k * 100 + s) - 0.5) * 0.8; } } });
const CRACKS = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0, color: new THREE.Color(2.4, 2.4, 2.4) }));
CRACKS.rotation.x = -Math.PI / 2; CRACKS.position.set(0, 0.02, 14); scene.add(CRACKS);
const lavaLight = new THREE.PointLight(0xff6a20, 0, 40, 1.3); lavaLight.position.set(0, 1.5, 9); scene.add(lavaLight);

// ---------- the black hole, drawn the way general relativity paints it (the Interstellar / Gargantua look) ----------
// S = shadow radius (2.6 Schwarzschild radii). The thin bright PHOTON RING hugs it. The disk's FAR half is bent by gravity
// up over the top and down under the bottom, so it wraps the shadow as a halo; its NEAR half crosses in front of the
// shadow as a flat band (inner edge at the last stable orbit, 6 rs ≈ 2.3 S). The side turning toward us is brighter
// (Doppler beaming). Starlight behind is bent round it (thin-lens: β = θ − θE²/θ).
const BH = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, C: { value: BHUV.clone() }, asp: { value: W / HH }, S: { value: 0 }, rE: { value: 0 }, dB: { value: 0 }, tilt: { value: 0.3 }, rot: { value: 0.26 }, uT: { value: 0 }, white: { value: 0 }, dark: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 C; uniform float asp, S, rE, dB, tilt, rot, uT, white, dark; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.07 + 3.1; a *= 0.5; } return v; }
  vec3 temp(float x){ // hot white-gold at the inner edge → orange → a rose fringe outside
    vec3 c = mix(vec3(1.0, 0.9, 0.7) * 2.4, vec3(1.0, 0.5, 0.15) * 1.8, smoothstep(0.0, 0.45, x));
    return mix(c, vec3(0.85, 0.25, 0.45) * 1.25, smoothstep(0.5, 1.0, x)); }
  void main(){
    vec2 p = (vUv - C) * vec2(asp, 1.0); float r = length(p);
    vec2 src = p - p / max(r, 1e-5) * (rE * rE / max(r, S * 0.95 + 1e-5)) * exp(-pow(r / max(S * 5.0, 1e-4), 2.0)); // bending fades with distance from the hole
    vec3 col = texture2D(tDiffuse, C + src / vec2(asp, 1.0)).rgb * (1.0 - dark);
    float inShadow = 1.0 - smoothstep(S * 0.985, S * 1.004, r);
    col *= 1.0 - inShadow;
    if (dB > 0.0 && S > 0.0) {
      float cr = cos(rot), sr = sin(rot); vec2 q = vec2(cr*p.x + sr*p.y, -sr*p.x + cr*p.y); // disk axes
      float ra = r / S, a = atan(q.y, q.x), up = q.y / max(r, 1e-5);
      float dopL = 1.0 + 0.45 * (-q.x / max(r, 1e-5)); // left side approaches us
      // photon ring
      vec3 ring = vec3(1.0, 0.86, 0.66) * 3.0 * exp(-pow((ra - 1.02) / 0.012, 2.0));
      // lensed far half of the disk: a broad arc over the top, a thinner one under the bottom, banded like the disk
      float tb = fbm(vec2(a * 6.0 - uT * 0.6, ra * 9.0));
      float bandsL = 0.6 + 0.4 * sin(ra * 70.0 + tb * 4.0);
      float over = exp(-pow((ra - 1.3) / 0.24, 2.0)) * smoothstep(-0.2, 0.5, up) * 1.35;
      float under = exp(-pow((ra - 1.1) / 0.07, 2.0)) * smoothstep(0.1, -0.6, up) * 0.75;
      float sides = exp(-pow((ra - 1.08) / 0.06, 2.0)) * 0.45;
      vec3 lensed = temp(clamp((ra - 1.0) / 0.9, 0.0, 1.0)) * (over + under + sides) * bandsL * (0.55 + 0.6 * tb) * dopL;
      // the near half, crossing in front: a flattened ring from the last stable orbit outward
      vec2 e = vec2(q.x, q.y / tilt); float rd = length(e) / S, ad = atan(e.y, e.x);
      float rin = 1.32, rout = 3.7, x = (rd - rin) / (rout - rin);
      vec3 disk = vec3(0.0);
      if (x > -0.05 && x < 1.0) {
        float turb = fbm(vec2(ad * 5.0 - uT * 0.9 + log(rd) * 7.0, rd * 5.0));
        float rings = 0.5 + 0.5 * sin(rd * 46.0 + turb * 6.0);
        float prof = pow(clamp(1.0 - x, 0.0, 1.0), 1.25) * smoothstep(-0.05, 0.07, x) * smoothstep(1.0, 0.78, x) * (0.35 + 0.9 * turb) * (0.45 + 0.55 * rings);
        float dop = 1.0 + 0.55 * (-e.x / max(length(e), 1e-5));
        disk = temp(clamp(x, 0.0, 1.0)) * prof * dop;
        if (e.y > 0.0) disk *= 1.0 - inShadow; // the far half is behind the hole
      }
      // a faint blue rim under the shadow (light from the far side, blue-shifted)
      vec3 rim = vec3(0.25, 0.4, 1.0) * exp(-pow((ra - 1.06) / 0.05, 2.0)) * smoothstep(0.0, -0.8, up) * 0.6;
      col += (ring + lensed + disk + rim) * dB;
    }
    col = mix(col, vec3(1.0, 0.95, 0.88) * 2.2, white);
    gl_FragColor = vec4(col, 1.0);
  }`,
});
H.comp.insertPass(BH, 1);

// =====================================================================================================================
// PER FRAME (the camera never moves; only the ground shakes it)
// =====================================================================================================================
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const fmtKm = (d) => `${fmt(d)} km`;
const fmtTide = (m) => (m >= 1000 ? `+${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `+${m >= 10 ? fmt(m) : m.toFixed(1)} m`);
const ALLMATS = []; [CITY, ...TOWERS.map((q) => q.g)].forEach((g) => g.traverse((m) => { if (m.isMesh && m.material.isMeshStandardMaterial && !ALLMATS.includes(m.material)) { ALLMATS.push(m.material); m.material.userData.c0 = m.material.color.clone(); } }));
const GREY = new THREE.Color(0.3, 0.29, 0.28);
const PBH = CAM.clone().add(BH_DIR.clone().multiplyScalar(420));
const AX_U = new THREE.Vector3().crossVectors(BH_DIR, V(0, 1, 0)).normalize(), AX_V = new THREE.Vector3().crossVectors(AX_U, BH_DIR).normalize();
/** a thing at p0 let go at t0 falls into the hole over dur seconds: accelerating, spiralling, gone at the centre */
function infall(p0, t0, dur, t, seed, out) {
  const s = clamp((t - t0) / dur), e = Math.pow(s, 2.3);
  const a = seed * 6.3 + e * 7.5, rad = (6 + seed * 30) * Math.sin(Math.PI * Math.min(1, e * 1.1)) * (1 - e);
  out.copy(p0).lerp(PBH, e).addScaledVector(AX_U, Math.cos(a) * rad).addScaledVector(AX_V, Math.sin(a) * rad);
  return e;
}
const _v = new THREE.Vector3();
const wrap = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));

function quakeAmp(t) { return t < 46 ? 0 : t < 49 ? lerp(0, 0.035, prog(t, 46, 49)) : t < 58 ? 0.05 + 0.04 * Math.max(0, Math.sin(t * 1.7)) : t < 70 ? 0.02 : t < 78 ? lerp(0.05, 0.12, prog(t, 70, 76)) : 0; }
const ampAt = (t) => t < 22 ? 0.6 : t < 34 ? lerp(0.6, 1.4, prog(t, 22, 34)) : t < 46 ? lerp(1.4, 2.4, prog(t, 34, 46)) : t < 58 ? lerp(2.4, 5, prog(t, 46, 58)) : t < 70 ? lerp(5, 7, prog(t, 58, 70)) : 7;
function waterLevel(t) {
  const tide = (a, b, y0, y1, amp, w = 0.8) => lerp(y0, y1, ease(prog(t, a, b))) + amp * Math.sin(t * w);
  if (t < 22) return -2.2 + 0.08 * Math.sin(t * 0.7);
  if (t < 34) return tide(22, 34, -2.2, -0.9, 0.55 * prog(t, 22, 34));
  if (t < 46) return tide(34, 46, -0.9, -0.1, 0.55);
  if (t < 58) return tide(46, 58, -0.1, 0.55, 0.3, 1.3);
  if (t < 70) return tide(58, 70, 0.55, 1.05, 0.25, 1.1);
  return lerp(1.05, 3.5, ease(prog(t, 70, 86)));
}

function caption(t) {
  for (const ln of H.LINES.lines) { if (!ln.text) continue; const k = win(t, ln.at, ln.at + ln.dur, 0.3, 0.3);
    if (k > 0) { H.$("capT").innerHTML = ln.text.replace(/(\d[\d.,]*\s?(million km|km|°C|degrees)?|event horizon)/gi, "<b>$1</b>"); hudShow("cap", k, { transform: `translateY(${(1 - out(clamp((t - ln.at) / 0.4))) * 12}px)` }); return; } }
}
function counters(t, d) {
  const set = (p, L, V2, S) => { H.$(p + "L").textContent = L; H.$(p + "V").textContent = V2; H.$(p + "S").textContent = S; };
  const st = t < 22 ? "Mass: 10 Suns · 59 km wide" : t < 34 ? "In free fall: you feel no pull" : t < 40 ? "The Moon is lost" : t < 58 ? "Its disk: millions of °C" : t < 70 ? "Its tides now beat gravity" : t < 80 ? "Earth is torn apart" : "Event horizon";
  set("a", "Distance to the black hole", fmtKm(t >= 86.2 ? 0 : d), st); hudShow("c1", win(t, 5.8, 88.4, 0.5, 0.4));
  if (t >= 22 && t < 58) { set("b", "Ocean tide", fmtTide(tideM(d)), "Normal: 0.5 m"); hudShow("c2", win(t, 22.2, 58, 0.5, 0.3)); }
  else if (t >= 58 && t < 78) { set("b", "Weight on this side", `${Math.round(weight(d) * 100)} %`, "of normal"); hudShow("c2", win(t, 58.2, 78, 0.3, 0.4)); }
}

function people(t) {
  const ash = prog(t, 70, 80) * 0.5;
  for (const q of PEOPLE) {
    const { p, acts } = q; let mode = "walk", x, z = q.z, y = 0, h;
    const walkX = (s) => wrap(q.x0 + q.dir * q.spd * (s + q.off), -27, 27);
    if (q.still && t < q.react) { mode = "idle"; x = q.x0; h = Math.PI + (q.dir * 0.4); }
    else if (t < q.react) { x = walkX(t); h = q.dir * Math.PI / 2; }
    else if (t < q.react + 3.2) { mode = "idle"; x = q.still ? q.x0 : walkX(q.react); h = lerp(q.still ? Math.PI + q.dir * 0.4 : q.dir * Math.PI / 2, Math.PI - 0.25, out(prog(t, q.react, q.react + 1))); }
    else { const xr = q.still ? q.x0 : walkX(q.react); const rt = Math.min(t, q.lift) - q.react - 3.2; mode = "run";
      x = wrap(xr + q.dir * 3.8 * rt, -27, 27); z = lerp(q.z, Math.min(q.z + 3, 13), out(clamp(rt / 5))); h = Math.atan2(q.dir * 0.85, 0.5); }
    let gone = false;
    if (t > q.lift) { const s = t - q.lift; mode = "idle"; y = 0.32 * s * Math.min(s, 3); _v.set(x, y, z); const e = infall(_v.clone(), q.lift + 3, 12 + q.off * 2, t, q.off / 4, _v); x = _v.x; y = _v.y; z = _v.z; gone = e > 0.96; }
    p.position.set(x, y, z); p.rotation.set(0, h + q.f0, 0);
    if (t > q.lift) { const s = t - q.lift; p.rotation.x += q.spin.x * s; p.rotation.z += q.spin.z * s; p.rotation.y += q.spin.y * s; }
    acts.walk.weight = mode === "walk" ? 1 : 0; acts.run.weight = mode === "run" ? 1 : 0; acts.idle.weight = mode === "idle" ? 1 : 0;
    acts.run.timeScale = 1.15; q.mx.setTime(t + q.off);
    for (const m of q.mats) m.color.copy(m.userData.c1 || (m.userData.c1 = m.color.clone())).lerp(GREY, ash);
    p.visible = !gone;
  }
}

function towers(t, power) {
  for (const T of TOWERS) {
    const qa = quakeAmp(t);
    T.g.rotation.z = Math.sin(t * 2.3 + T.ph) * qa * 0.06; T.g.rotation.x = Math.sin(t * 1.9 + T.ph * 2) * qa * 0.03;
    T.mat.emissiveIntensity = 1.25 * power * (0.85 + 0.15 * Math.sin(t * 3 + T.ph * 9) * (t > 46 ? 1 : 0));
    T.red.visible = power > 0.5 && Math.sin(t * 3.4 + T.ph) > 0;
    T.segs.forEach((s, i) => {
      const tIn = 64 + T.ph * 2.2 + (T.segs.length - i) * 0.5;
      if (T.fall && t > T.tFall + i * 0.3 && t < tIn) { const f = t - T.tFall - i * 0.3; s.m.position.set(s.dx * Math.min(f, 3) * 0.3, Math.max(-30, s.y0 - 0.5 * 9.8 * f * f * (1 - i * 0.08)), 0); s.m.rotation.set(s.rx * Math.min(f, 4), 0, s.rz * Math.min(f, 4)); s.m.visible = s.m.position.y > -29; }
      else { s.m.position.set(0, s.y0, 0); s.m.rotation.set(0, 0, 0); s.m.visible = !(T.fall && t > T.tFall + i * 0.3 && t < tIn); }
      if (t > tIn) { const w0 = T.g.localToWorld(V(0, s.y0, 0)); const e = infall(w0, tIn, 14, t, T.ph / 6, _v); s.m.visible = e < 0.97; s.m.position.copy(T.g.worldToLocal(_v.clone())); s.m.rotation.set(s.rx * (t - tIn), s.rz * (t - tIn) * 0.5, s.rz * (t - tIn)); }
    });
  }
  // dust clouds rolling out from the towers that came down
  const falling = TOWERS.filter((T) => T.fall); let k = 0;
  for (let i = 0; i < DUST.n; i++) { const T = falling[i % falling.length]; const f = t - T.tFall - 0.8;
    if (!T || f < 0 || t > 78) { DUST.pos[i * 3 + 1] = -999; continue; }
    const a = rand(i) * TAU, r = (6 + rand(i + 1) * 30) * Math.min(1, f / 4) * (1 + f * 0.08); k++;
    DUST.pos[i * 3] = T.g.position.x + Math.cos(a) * r; DUST.pos[i * 3 + 1] = -2 + rand(i + 2) * T.hgt * 0.45 * Math.min(1, f / 3) + f * 2; DUST.pos[i * 3 + 2] = T.g.position.z + Math.sin(a) * r * 0.6; }
  DUST.P.material.opacity = 0.32; DUST.P.geometry.attributes.position.needsUpdate = true;
}

function moonAndStream(t) {
  const k = prog(t, 34, 38.4);
  if (t < 38.4) { const d = MOON_DIR.clone().lerp(BH_DIR, ease(k) * 0.9).normalize(); MOON.position.copy(CAM).add(d.multiplyScalar(MOON_D)); MOON.visible = true;
    MOON.lookAt(CAM); const pm = MOON.position.clone().project(cam), pb = BH_DIR.clone().add(CAM).project(cam);
    MOON.rotateZ(Math.atan2(pb.y - pm.y, (pb.x - pm.x) * (W / HH)) + Math.PI);
    const st = Math.pow(k, 2); MOON.scale.set(1 + st * 7, 1 - st * 0.6, 1); MOON.material.color.setRGB(1.6 + st * 1.2, 1.5 + st * 0.5, 1.4 + st * 0.1);
  } else MOON.visible = false;
  const sk = win(t, 36.5, 46, 0.8, 2.5); STREAM.material.opacity = sk;
  if (sk > 0) for (let i = 0; i < STREAM_N; i++) { const u = (rand(i) + (t - 36.5) * 0.25) % 1; const from = MOON.visible ? MOON.position.clone().sub(CAM).normalize() : BH_DIR.clone().lerp(MOON_DIR, 0.1);
    const dd = from.clone().lerp(BH_DIR, u).normalize(); const sw = (1 - u) * 0.02 * Math.sin(u * 9 + rand(i + 1) * 6); dd.x += sw; dd.y += sw * 0.5 + (rand(i + 2) - 0.5) * 0.006 * (1 - u);
    const pp = CAM.clone().add(dd.normalize().multiplyScalar(MOON_D)); streamP.set([pp.x, pp.y, pp.z], i * 3); }
  STREAM.geometry.attributes.position.needsUpdate = true;
}

function particles(t) {
  // spray off the quay once the sea is wild, rising freely once nothing weighs anything
  const sk = t > 46 && t < 76 ? 1 : 0; SPRAY.P.material.opacity = sk * 0.75;
  for (let i = 0; i < SPRAY.n; i++) { const ph = (rand(i) + t * (0.6 + rand(i + 1) * 0.5)) % 1; const x = -26 + rand(i + 2) * 52;
    const float = t > 60 ? (t - 60) * (0.6 + rand(i + 3)) : 0; const zz = 1 + rand(i + 5) * 3; const crest = Math.max(0, waveY(x, zz, ampAt(t), t)); const y = waterLevel(t) + crest + Math.sin(ph * Math.PI) * crest * 1.5 + float * float * 0.25;
    SPRAY.pos[i * 3] = x; SPRAY.pos[i * 3 + 1] = y; SPRAY.pos[i * 3 + 2] = 1 + rand(i + 5) * (t > 60 ? 14 : 3) - ph * 1.5; }
  SPRAY.P.geometry.attributes.position.needsUpdate = true;
  for (const D of DEBRIS) { const s = t - D.t0; const m = D.m; m.visible = t > 50 && t < 77;
    if (s < 0) { m.position.copy(D.p0); m.rotation.set(0, D.v, 0); } else { const e = infall(D.p0, D.t0, 9 + D.v * 3, t, D.v, m.position); m.rotation.set(D.spin.x * s, D.spin.y * s, D.spin.z * s); m.visible = e < 0.97; } }
  // the promenade itself comes loose: lamps, benches, trees
  PROPS.forEach((g, i) => { if (!g.userData.p0) g.userData.p0 = g.position.clone(); const t0 = 71 + rand(i + 0.4) * 9; if (t < t0) { g.position.copy(g.userData.p0); g.rotation.set(0, 0, 0); g.visible = true; return; }
    const e = infall(g.userData.p0, t0, 8, t, rand(i + 0.9), g.position); g.rotation.set((t - t0) * 0.9, (t - t0) * 0.4, (t - t0) * 0.7); g.visible = e < 0.97; });
  // a river of everything — water, dust, glass, light — spiralling in, heating as it goes
  const ik = t < 60 ? 0 : smooth(prog(t, 60, 66)); INFALL.material.opacity = ik;
  if (ik > 0) for (let i = 0; i < INFALL_N; i++) { const t0 = 60 + rand(i * 1.3) * 26, life = 5 + rand(i * 2.1) * 6;
    const p0 = _v.set(-70 + rand(i * 3.7) * 140, rand(i * 4.1) * 40 - 2, -60 - rand(i * 5.3) * 800); const st = p0.clone();
    if (t < t0) { infallP.set([0, -999, 0], i * 3); continue; }
    const e = infall(st, t0, life, t, rand(i * 6.1), _v); infallP.set([_v.x, _v.y, _v.z], i * 3);
    const h = Math.pow(e, 2); infallC.set([0.35 + h * 2.2, 0.33 + h * 1.1, 0.32 + h * 0.25].map((c) => c * (e > 0.985 ? 0 : 1)), i * 3); }
  INFALL.geometry.attributes.position.needsUpdate = true; INFALL.geometry.attributes.color.needsUpdate = true;
  // ash: everything streaming up into the disk
  const ak = win(t, 72, 82, 1.5, 2); ASH.P.material.opacity = ak;
  if (ak > 0) for (let i = 0; i < ASH.n; i++) { const s = (t - 72) * (0.7 + rand(i) * 0.8) + rand(i + 1) * 2; const base = V(-30 + rand(i + 2) * 60, rand(i + 3) * 6, -10 + rand(i + 4) * 26);
    const p = base.add(BH_DIR.clone().multiplyScalar(s * s * 1.6)).add(V(Math.sin(s * 2 + i) * 0.4, 0, Math.cos(s * 1.7 + i) * 0.4)); ASH.pos.set([p.x, p.y, p.z], i * 3); }
  ASH.P.geometry.attributes.position.needsUpdate = true;
}

H.frame("Some things vanish without a trace", async (t) => {
  const d = dist(t);
  // the fixed camera, shaken only by the ground
  const qa = quakeAmp(t), n = (f, p) => Math.sin(t * f + p) * Math.sin(t * f * 0.37 + p * 2);
  H.look(CAM.clone().add(V(n(31, 1) * qa, n(27, 2) * qa * 0.7, 0)), AIM.clone().add(V(n(23, 3) * qa * 8, n(29, 4) * qa * 6, 0)), FOV);
  STARS.position.copy(cam.position); GLOW.position.copy(cam.position);
  // power: on until the quakes cut it (flicker), then only the disk lights the city
  const power = t < 51.8 ? 1 : t < 53.6 ? (Math.sin(t * 47) > 0.2 ? 0.8 : 0.05) * (1 - prog(t, 51.8, 53.6)) : 0;
  GLOW.material.uniforms.k.value = 0.25 + 0.75 * power;
  for (const Lp of LAMPS) { Lp.L.intensity = 30 * power; Lp.head.material.color.setRGB(1, 0.8, 0.55).multiplyScalar(4 * power + 0.03); Lp.g.rotation.z = Math.sin(t * 2.6 + Lp.ph) * qa * 0.5; }
  // the sea
  const wl = waterLevel(t); water.position.y = wl; water.visible = t < 79;
  water.material.uniforms.time.value = t * 0.5; water.material.uniforms.distortionScale.value = 2.2; water.material.uniforms.uWT.value = t; water.material.uniforms.uAmp.value = ampAt(t); water.material.uniforms.uFoam.value = clamp((ampAt(t) - 1.2) / 2); water.visible = true;
  const disk = t > 38 ? 1 : 0;
  water.material.uniforms.sunDirection.value.copy(disk ? BH_DIR : MOON_DIR); water.material.uniforms.sunColor.value.set(disk ? 0xffb070 : 0x9fb3d6);
  // its size on screen: a dark dot that bends starlight, then the Moon's debris lights it up and it grows as it nears
  const U = BH.uniforms;
  // from the same place in the sky it only ever grows: from nothing to past the edges of the frame
  const SK = [[1.5, 0.0004], [10, 0.0028], [22, 0.0055], [34, 0.0095], [46, 0.017], [58, 0.03], [66, 0.046], [74, 0.075], [80, 0.12], [85, 0.24], [88.5, 0.65], [93, 3]];
  let Sz = 0; for (let i = 1; i < SK.length; i++) if (t <= SK[i][0]) { const [a0, s0] = SK[i - 1], [a1, s1] = SK[i]; Sz = t < a0 ? 0 : Math.exp(lerp(Math.log(s0), Math.log(s1), (t - a0) / (a1 - a0))); break; }
  if (t > 93) Sz = 3;
  U.S.value = Sz; U.uT.value = t;
  U.rE.value = Sz * 1.6;
  U.dB.value = smooth(prog(t, 1.5, 6)) * (t < 38 ? 0.42 : lerp(0.42, 0.8, smooth(prog(t, 38, 42))));
  U.white.value = 0;
  U.dark.value = 0;
  diskLight.intensity = t < 38 ? 0 : t < 40 ? lerp(0, 0.9, prog(t, 38, 40)) : t < 58 ? lerp(0.9, 2, prog(t, 40, 58)) : t < 72 ? lerp(2, 4, prog(t, 58, 72)) : 4;
  moonLight.intensity = t < 38 ? 0.35 : 0.05; H.hemi.intensity = 0.25 + (t > 38 ? 0.25 : 0);
  H.r.toneMappingExposure = 1.15;
  // the crust tears: glowing fissures across the promenade
  CRACKS.material.opacity = smooth(prog(t, 69.5, 73)); lavaLight.intensity = 120 * CRACKS.material.opacity;
  // everything turns to ash, lifts and is gone in the glare; then only the hole, its disk and bent starlight
  const ash = prog(t, 70, 82) * 0.55;
  for (const m of ALLMATS) { m.color.copy(m.userData.c0).lerp(GREY, ash); if (m.emissive && ash > 0) m.emissiveIntensity *= 1 - ash; }

  people(t); towers(t, power); moonAndStream(t); particles(t);
  if (t < 5.6) hudShow("ttl", win(t, 0.5, 5.6, 0.6, 0.5), { transform: `translateY(${(1 - out(clamp((t - 0.5) / 0.9))) * 18}px)` });
  counters(t, d); caption(t);
});
await H.ready();
