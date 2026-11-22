
// =====================================================================================================================
// THE WORLD
// =====================================================================================================================
// city glow on the horizon (light pollution), fading with the power cut
const GLOW = new THREE.Mesh(new THREE.SphereGeometry(8800, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { k: { value: 1 }, col: { value: new THREE.Color(0.3, 0.26, 0.24) } },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform float k; uniform vec3 col; varying vec3 vP; void main(){ float h = max(vP.y, 0.0); gl_FragColor = vec4(col * k * (exp(-h * 9.0) * 0.55 + exp(-h * 3.0) * 0.12), 1.0); }` }));
GLOW.renderOrder = -1; scene.add(GLOW);

// water of the bay: ocean shader (reflections of the skyline, lamps, Moon and later the disk)
const water = new Water(new THREE.PlaneGeometry(12000, 12000), { textureWidth: 512, textureHeight: 512, waterNormals, sunDirection: MOON_DIR.clone(), sunColor: 0x9fb3d6, waterColor: 0x04101a, distortionScale: 2.6, fog: false });
water.rotation.x = -Math.PI / 2; scene.add(water);

// ---------- the promenade: worn concrete, a kerb and railing at the water, benches, bins, lamps, young trees ----------
const CITY = new THREE.Group(); scene.add(CITY);
const cf = (n, srgb, rx, ry) => tex(`kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_${n}_1k.jpg`, srgb, rx, ry);
const walkM = new THREE.MeshStandardMaterial({ map: cf("diff", true, 12, 8), normalMap: cf("nor_gl", false, 12, 8), roughnessMap: cf("rough", false, 12, 8), color: 0x9a948c, roughness: 1 });
const walk = sh(new THREE.Mesh(new THREE.PlaneGeometry(90, 40), walkM), false, true); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0, 22); CITY.add(walk);
const quay = sh(new THREE.Mesh(new THREE.BoxGeometry(90, 3.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x55524d, roughness: 0.9, map: cf("diff", true, 20, 1) }))); quay.position.set(0, -1.6, 2.4); CITY.add(quay);
const steel = H.metal(0x9aa3ab, 0.35);
for (let x = -44; x <= 44; x += 1.6) { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 8), steel)); p.position.set(x, 0.52, 2.2); CITY.add(p); }
for (const y of [1.05, 0.6]) { const r = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 88, 8), steel)); r.rotation.z = Math.PI / 2; r.position.set(0, y, 2.2); CITY.add(r); }
const LAMPS = [];
for (const x of [-20, -10, 0, 10, 20]) {
  const g = new THREE.Group(); g.position.set(x + 3, 0, 3.4); CITY.add(g);
  const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 12), H.metal(0x2a2d31, 0.4))); pole.position.y = 2.3; g.add(pole);
  const arm = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), H.metal(0x2a2d31, 0.4))); arm.rotation.z = Math.PI / 2; arm.position.set(0.4, 4.55, 0); g.add(arm);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.18, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.55).multiplyScalar(4), toneMapped: false })); head.position.set(0.8, 4.45, 0); g.add(head);
  const L = new THREE.PointLight(0xffc98a, 30, 22, 1.5); L.position.set(0.8, 4.2, 0); g.add(L);
  LAMPS.push({ g, head, L, ph: rand(x) * 10 });
}
for (const x of [-15, -5, 5, 15]) { // benches facing the water
  const b = new THREE.Group(); b.position.set(x, 0, 4.4); CITY.add(b);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.7 });
  for (let i = 0; i < 3; i++) { const s = sh(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.12), wood)); s.position.set(0, 0.45, -0.18 + i * 0.16); b.add(s); }
  for (let i = 0; i < 2; i++) { const s = sh(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.04), wood)); s.position.set(0, 0.62 + i * 0.16, 0.22); b.add(s); }
  for (const lx of [-0.8, 0.8]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.5), H.metal(0x26292c, 0.5))); l.position.set(lx, 0.22, 0); b.add(l); }
}
const firG = await gltf("kit/ph/fir_sapling/fir_sapling_1k.gltf");
const fit = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; };
for (const [x, z] of [[-24, 13], [-12.5, 14.5], [12.5, 14.5], [24, 13]]) { const f = fit(firG.scene.clone()); f.scale.setScalar(2.4); f.position.set(x, 0, z); CITY.add(f); }

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
const STREAM = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(streamP, 3)), new THREE.PointsMaterial({ map: dotTex, color: new THREE.Color(2.2, 1.4, 0.8), size: 9, sizeAttenuation: false, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: 0 }));
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
const DEBRIS = (() => { const g = new THREE.Group(); scene.add(g); const geo = new THREE.IcosahedronGeometry(0.6, 0); const ms = [0x5a554f, 0x8a8178, 0x6b6560, 0x9c948a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
  const list = []; for (let i = 0; i < 220; i++) { const m = new THREE.Mesh(geo, ms[i % 4]); const s = 0.04 + Math.pow(rand(i + 0.3), 4) * 0.45; m.scale.set(s * (0.5 + rand(i + 1)), s * (0.3 + rand(i + 2)), s * (0.5 + rand(i + 3))); m.castShadow = true; g.add(m);
    list.push({ m, p0: V(-24 + rand(i + 4) * 48, 0.05, 3 + rand(i + 5) * 13), t0: 60 + rand(i + 6) * 9, v: 0.4 + rand(i + 7) * 1.6, spin: V(rand(i + 8), rand(i + 9), rand(i + 10)).multiplyScalar(3) }); }
  return list; })();
const ASH = mkPts(9000, 0.09, 0x8f8a84);
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
