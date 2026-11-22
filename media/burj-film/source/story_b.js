
// =====================================================================================================================
// DOWNTOWN DUBAI, THE DESERT, BURJ LAKE AND THE GULF
// =====================================================================================================================
const CITY = new THREE.Group(); scene.add(CITY);
const sandT = (n, srgb, r) => tex(`kit/ph/aerial_sand/aerial_sand_${n}_2k.jpg`, srgb, r, r);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ map: sandT("diff", true, 900), normalMap: sandT("nor_gl", false, 900), roughness: 1, color: 0xe2cfae }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; CITY.add(ground);
// the city floor: blocks, roads and parks painted over the sand within ~3.5 km
const cityFloor = new THREE.Mesh(new THREE.CircleGeometry(3600, 96), new THREE.MeshStandardMaterial({ roughness: 0.92, transparent: true,
  map: H.canvasTex(4096, 4096, (g, w, h) => { const px = (m) => (m + 3600) / 7200 * w, s = w / 7200;
    const rg = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w / 2); rg.addColorStop(0, "rgba(140,136,128,1)"); rg.addColorStop(1, "rgba(140,136,128,0)"); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    H.reseed(4); for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(${110 + H.rnd() * 60},${105 + H.rnd() * 55},${95 + H.rnd() * 45},0.35)`; g.fillRect(H.rnd() * w, H.rnd() * h, 2 + H.rnd() * 8, 2 + H.rnd() * 8); }
    g.fillStyle = "rgba(55,58,62,0.9)"; for (let m = -3600; m < 3600; m += 150) { g.fillRect(px(m), 0, 18 * s, h); g.fillRect(0, px(m), w, 18 * s); }
    g.fillStyle = "rgba(48,50,54,1)"; g.fillRect(px(-3600), px(-620), 7200 * s, 46 * s);                       // Sheikh Zayed Road
    g.fillStyle = "rgba(92,122,72,0.95)"; for (const [x, z, a, b] of [[-260, 140, 220, 120], [300, -260, 180, 160], [-700, -500, 260, 160]]) { g.beginPath(); g.ellipse(px(x), px(z), a * s, b * s, 0.3, 0, 7); g.fill(); }
    g.fillStyle = "rgba(160,150,135,1)"; g.beginPath(); g.ellipse(px(0), px(150), 360 * s, 210 * s, 0, 0, 7); g.fill(); }) }));
cityFloor.rotation.x = -Math.PI / 2; cityFloor.position.y = 0.05; cityFloor.receiveShadow = true; CITY.add(cityFloor);
// the Gulf to the west-north-west, Burj Lake at the foot of the tower (the Dubai Fountain lake)
const waterN = (() => { const N = 256, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N); H.reseed(5);
  const W2 = Array.from({ length: 24 }, () => ({ kx: Math.round((H.rnd() - 0.5) * 14), ky: Math.round((H.rnd() - 0.5) * 14), ph: H.rnd() * TAU, a: 0.4 + H.rnd() })); const hh = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const q of W2) { const k = Math.hypot(q.kx, q.ky) || 1; v += (q.a / k) * Math.sin(((q.kx * x + q.ky * y) / N) * TAU + q.ph); } hh[y * N + x] = v; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = hh[y * N + (x + 1) % N] - hh[y * N + (x + N - 1) % N], dy = hh[((y + 1) % N) * N + x] - hh[((y + N - 1) % N) * N + x]; const n = V(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * N + x) * 4;
    im.data[i] = (n.x * 0.5 + 0.5) * 255; im.data[i + 1] = (n.y * 0.5 + 0.5) * 255; im.data[i + 2] = (n.z * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const gulf = new Water(new THREE.PlaneGeometry(30000, 30000), { textureWidth: 512, textureHeight: 512, waterNormals: waterN, sunDirection: SUN.clone(), sunColor: 0xffe2b0, waterColor: 0x0f3a48, distortionScale: 3.0, fog: true });
gulf.rotation.x = -Math.PI / 2; gulf.position.set(-19000, 0.4, -6000); CITY.add(gulf);
const lake = new Water(new THREE.CircleGeometry(1, 96), { textureWidth: 256, textureHeight: 256, waterNormals: waterN, sunDirection: SUN.clone(), sunColor: 0xffe2b0, waterColor: 0x0a3340, distortionScale: 1.6, fog: true });
lake.rotation.x = -Math.PI / 2; lake.scale.set(330, 190, 1); lake.position.set(0, 0.3, 150); CITY.add(lake);
// buildings: the Taipei city shader (windows, glass, balconies), recoloured for Dubai: pale stone, sand, glass towers
const cityMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });
cityMat.onBeforeCompile = (s) => {
  s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aKind; varying vec3 vWP; varying vec3 vWN; varying vec2 vKind;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 wp4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wp4 = instanceMatrix * wp4;
      #endif
      vWP = (modelMatrix * wp4).xyz; vWN = normal; vKind = aKind;`);
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying vec2 vKind; float hh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 14375.5); }")
    .replace("#include <color_fragment>", `#include <color_fragment>
      { vec3 n = abs(vWN); float glassB = step(0.5, vKind.x);
        if (n.y > 0.5) { diffuseColor.rgb = vec3(0.7, 0.66, 0.6) * (0.8 + 0.3 * hh(floor(vWP.xz / 3.0))); }
        else { float u = (n.x > 0.5 ? vWP.z : vWP.x); float fh = mix(3.4, 3.8, glassB); float fy = fract(vWP.y / fh), fx = fract(u / mix(2.8, 1.6, glassB));
          float win = step(0.2, fy) * step(fy, 0.8) * step(0.18, fx) * step(fx, 0.82); if (glassB > 0.5) win = step(0.12, fy);
          float lit = hh(floor(vec2(vWP.y / fh, u / 2.6)) + vKind.y);
          int pi = int(floor(vKind.y * 5.0)); vec3 wall = pi == 0 ? vec3(0.88, 0.82, 0.7) : pi == 1 ? vec3(0.8, 0.76, 0.68) : pi == 2 ? vec3(0.72, 0.62, 0.5) : pi == 3 ? vec3(0.92, 0.9, 0.86) : vec3(0.82, 0.72, 0.6);
          wall *= (0.82 + 0.16 * hh(floor(vWP.xy * 0.7 + vWP.zz * 0.7)));
          float far = smoothstep(500.0, 1800.0, length(cameraPosition - vWP)); win = mix(win, 0.42, far);
          vec3 glassC = mix(vec3(0.2, 0.24, 0.28), vec3(0.36, 0.4, 0.44), lit * 0.5);
          if (glassB > 0.5) glassC = mix(vec3(0.22, 0.3, 0.38), vec3(0.42, 0.52, 0.6), lit * 0.4);
          diffuseColor.rgb = mix(wall, glassC, win * mix(0.8, 1.0, glassB)); if (vWP.y < 4.0) diffuseColor.rgb *= 0.6; } }`)
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.2, step(0.5, vKind.x) * step(abs(vWN.y), 0.5));");
};
cityMat.customProgramCacheKey = () => "dubai";
{ const B = []; H.reseed(11);
  for (let gx = -24; gx <= 24; gx++) for (let gz = -24; gz <= 24; gz++) {
    const cx = gx * 150 + 75 + 9, cz = gz * 150 + 75 + 9, r = Math.hypot(cx, cz); if (r > 3400) continue;
    if (Math.hypot(cx / 1.0, (cz - 150) / 0.62) < 400 || Math.hypot(cx, cz) < 120) continue;   // the lake and the tower plaza
    if (cz > -680 && cz < -560) continue;                                                          // the highway
    const n = 2 + Math.floor(H.rnd() * 3), dens = Math.exp(-r / 1500);
    for (let k = 0; k < n; k++) { const w = 22 + H.rnd() * 30, d = 22 + H.rnd() * 30; const x = cx + (H.rnd() - 0.5) * (120 - w), z = cz + (H.rnd() - 0.5) * (120 - d);
      const tall = (cz < -540 && cz > -820) ? 1 : 0;                                                // the Sheikh Zayed Road towers
      let hgt = 10 + Math.pow(H.rnd(), 2.2) * (26 + 180 * dens + 220 * tall); const glassB = H.rnd() < 0.15 + 0.45 * dens + 0.3 * tall ? 1 : 0, sd = H.rnd(); B.push([x, z, w, d, hgt, glassB, sd, 0]);
      if (hgt > 60 && H.rnd() < 0.5) B.push([x, z, w * 0.6, d * 0.6, hgt * 0.18, glassB, sd, hgt]); } }
  const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(bg, cityMat, B.length); const kind = new Float32Array(B.length * 2); const m4 = new THREE.Matrix4();
  B.forEach(([x, z, w, d, hh, gb, s, y0], i) => { m4.makeScale(w, hh, d).setPosition(x, y0, z); im.setMatrixAt(i, m4); kind[i * 2] = gb; kind[i * 2 + 1] = s; });
  bg.setAttribute("aKind", new THREE.InstancedBufferAttribute(kind, 2)); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; CITY.add(im);
  // palms along the boulevards and the lake
  const pg = new THREE.Group(); CITY.add(pg); const trunkG = new THREE.CylinderGeometry(0.25, 0.35, 9, 6); trunkG.translate(0, 4.5, 0); const leafG = new THREE.ConeGeometry(3.6, 2.2, 7, 1, true); leafG.translate(0, 9.2, 0);
  const NT = 900, tr = new THREE.InstancedMesh(trunkG, matte(0x7a6650, 0.9), NT), lf = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: 0x4f6b35, roughness: 0.85, side: THREE.DoubleSide }), NT);
  for (let i = 0; i < NT; i++) { const a = H.rnd() * TAU; const onLake = i < 260; const x = onLake ? Math.cos(a) * 345 : (Math.round((H.rnd() - 0.5) * 40) * 150 + 9 + (H.rnd() < 0.5 ? -4 : 22)), z = onLake ? 150 + Math.sin(a) * 205 : (H.rnd() - 0.5) * 5000;
    const s = 0.8 + H.rnd() * 0.4; m4.makeScale(s, s, s).setPosition(x, 0, z); tr.setMatrixAt(i, m4); lf.setMatrixAt(i, m4); }
  tr.castShadow = lf.castShadow = true; pg.add(tr, lf);
  // the Dubai Mall podium next to the lake
  const mall = sh(new THREE.Mesh(new RoundedBoxGeometry(420, 28, 170, 3, 4), new THREE.MeshPhysicalMaterial({ color: 0xcfc4b0, roughness: 0.5, metalness: 0.1, clearcoat: 0.3 }))); mall.position.set(120, 14, 440); CITY.add(mall); }
// low desert dunes far out
{ const g = new THREE.BufferGeometry(), A = 256, Rr = 8, pos = [], idx = [];
  for (let j = 0; j <= Rr; j++) for (let i = 0; i <= A; i++) { const a = i / A * TAU, r = 5200 + j / Rr * 9000; const n = Math.sin(a * 7 + j) * 0.4 + Math.sin(a * 19 - j * 2) * 0.25 + 0.5;
    const hgt = Math.max(0, n) * (j / Rr) * 120 * (Math.cos(a) > 0.4 ? 0.1 : 1); pos.push(Math.cos(a) * r, hgt, Math.sin(a) * r); }
  for (let j = 0; j < Rr; j++) for (let i = 0; i < A; i++) { const a = j * (A + 1) + i, b = a + 1, c = a + A + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  CITY.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xd2b48a, roughness: 1 }))); }
// blowing sand / wind streaks (camera-local)
const NR = 1800, streaks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), new THREE.MeshBasicMaterial({ color: 0xf2e6d0, transparent: true, opacity: 0.35, depthWrite: false, fog: false }), NR); streaks.frustumCulled = false; scene.add(streaks);
H.reseed(23); const RP = Array.from({ length: NR }, () => ({ x: H.rnd(), y: H.rnd(), z: H.rnd(), s: 0.6 + H.rnd() * 0.8 }));
function wind(t, vol, len, on, dirW = V(1, 0, 0.2)) { streaks.visible = on; if (!on) return; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = H.cam.position; const d = dirW.clone().normalize(); q.setFromUnitVectors(V(0, 1, 0), d);
  RP.forEach((p, i) => { const s = ((p.x + t * 0.35 * p.s) % 1 - 0.5) * vol; const pos = c.clone().addScaledVector(d, s).add(V(0, (p.y - 0.5) * vol * 0.6, 0)).addScaledVector(V(-d.z, 0, d.x), (p.z - 0.5) * vol);
    const near = pos.distanceTo(c) < vol * 0.08 ? 0 : 1; m4.compose(pos, q, V(near, len * p.s * near, near)); streaks.setMatrixAt(i, m4); }); streaks.instanceMatrix.needsUpdate = true; }

// =====================================================================================================================
// THE WIND LAB: smoke shed by a plain cylinder (an orderly vortex street) vs. the Burj (no rhythm), seen from above
// =====================================================================================================================
// A vortex street: vortices shed alternately from each side at the Strouhal rhythm (St ≈ 0.2: f = 0.2·U/D) drift
// downstream at ~0.85 U. The smoke is drawn from their positions: soft cores with a spiral arm. For the Burj, every slice
// of the tower has a different width, so each sheds at its own rhythm and phase: the swirls never line up.
const LAB = new THREE.Group(); LAB.position.set(20000, 0, 0); scene.add(LAB); LAB.visible = false;
const labFloor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.6, metalness: 0.2 })); labFloor.rotation.x = -Math.PI / 2; labFloor.receiveShadow = true; LAB.add(labFloor);
const gridT = H.canvasTex(512, 512, (g, w) => { g.fillStyle = "#0c0e12"; g.fillRect(0, 0, w, w); g.strokeStyle = "rgba(120,160,200,0.18)"; g.lineWidth = 1.5; for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, w); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } });
gridT.wrapS = gridT.wrapT = THREE.RepeatWrapping; gridT.repeat.set(12, 12); labFloor.material.map = gridT;
// the two models: a plain cylinder and the Burj (its real geometry, scaled 1:10 000 → 8.3 cm … drawn at lab scale)
const MS = 0.04;                                              // lab scale: 828 m → 33 units
const cyl = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 26, 48), new THREE.MeshPhysicalMaterial({ color: 0xb9c2ca, metalness: 0.6, roughness: 0.3, clearcoat: 0.5 })));
cyl.geometry.translate(0, 13, 0); LAB.add(cyl);
const mini = new THREE.Mesh(burjGeo, new THREE.MeshPhysicalMaterial({ color: 0xc7d2dc, metalness: 0.7, roughness: 0.25, clearcoat: 0.6 })); mini.scale.setScalar(MS); mini.castShadow = true; LAB.add(mini);
const miniSp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.37, (TIP - TOPC) * MS, 12), metal(0xb9c0c6, 0.3)); miniSp.position.y = (TOPC + (TIP - TOPC) / 2) * MS; LAB.add(miniSp);
const smokeU = (seed, chaotic) => ({ uT: { value: 0 }, uU: { value: 6.0 }, uD: { value: 4.4 }, uK: { value: 1 }, uChaos: { value: chaotic }, uSeed: { value: seed }, uCol: { value: new THREE.Color(chaotic ? 0x7dffc0 : 0xff8a5c) } });
const SMOKE_FS = `uniform float uT, uU, uD, uK, uChaos, uSeed; uniform vec3 uCol; varying vec2 vP;
  float h(float n){ return fract(sin(n * 91.7 + uSeed * 13.1) * 43758.5453); }
  void main(){
    vec2 p = vP; float dens = 0.0, swirl = 0.0;
    // the incoming streaklines, split round the body
    float lane = abs(fract(p.y / 2.2 + 0.5) - 0.5);
    float up = step(p.x, 0.0) * smoothstep(0.05, 0.0, lane) * smoothstep(-60.0, -6.0, p.x) * 0.35;
    float T = uD / (0.2 * uU), hT = T * 0.5;               // Strouhal: one vortex every half period, alternating sides
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      float jitter = uChaos * (h(fi + floor(uT / hT)) - 0.5);
      float tb = (floor(uT / hT) - fi) * hT + jitter * hT;    // when it was shed
      float age = uT - tb; if (age < 0.0) continue;
      float side = mod(floor(uT / hT) - fi, 2.0) * 2.0 - 1.0;
      if (uChaos > 0.5) side = (h(fi * 3.1 + floor(uT / hT)) - 0.5) * 2.0;
      vec2 c = vec2(uD * 0.6 + 0.85 * uU * age, side * uD * 0.42 * (1.0 + 0.15 * age) * mix(1.0, 0.6, uChaos));
      if (uChaos > 0.5) { c.y = (h(fi * 7.3 + floor(uT / hT)) - 0.5) * uD * 1.6 * (1.0 + 0.2 * age); c.x += (h(fi * 2.9 + floor(uT / hT)) - 0.5) * uD * 2.0; }
      float str = mix(1.0, 0.25 + 0.35 * h(fi + 7.0 + floor(uT / hT)), uChaos);
      vec2 d = p - c; float r = length(d), a = atan(d.y, d.x), rad = uD * (0.45 + 0.07 * age) * mix(1.0, 0.6, uChaos);
      float core = exp(-r * r / (rad * rad * 0.18));
      float sp = a * side + log(max(r, 0.05)) * 3.2 - uT * side * 1.6;
      float arm = pow(0.5 + 0.5 * cos(sp * 2.0), 8.0) * exp(-r * r / (rad * rad * 2.2)) * mix(1.0, 0.35 + 0.65 * h(fi * 5.1 + floor(uT * 3.0)), uChaos);
      dens += (core * 0.45 + arm * 0.85) * str * exp(-age * 0.05);
    }
    // the wake right behind the body
    dens += exp(-pow(p.y / (uD * 0.5), 2.0)) * smoothstep(uD * 0.4, uD * 1.2, p.x) * smoothstep(uD * 6.0, uD * 1.5, p.x) * 0.5;
    dens = dens * step(-uD * 0.5, p.x) + up;
    float body = 1.0 - smoothstep(uD * 0.48, uD * 0.52, length(p));
    gl_FragColor = vec4(uCol * dens * uK * (1.0 - body) * 0.95, 1.0);
  }`;
function smokePlane(seed, chaotic, y) { const U = smokeU(seed, chaotic);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(140, 46), new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy + vec2(50.0, 0.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: SMOKE_FS }));
  m.geometry.translate(50, 0, 0); m.rotation.x = -Math.PI / 2; m.position.y = y; return { m, U }; }
const SMOKE_C = [smokePlane(2, 0, 14)];
const SMOKE_B = [smokePlane(5, 1, 14)];
const CYLG = new THREE.Group(), BURG = new THREE.Group(); LAB.add(CYLG, BURG);
CYLG.add(cyl); SMOKE_C.forEach((s) => CYLG.add(s.m)); BURG.add(mini, miniSp); SMOKE_B.forEach((s) => BURG.add(s.m));
const labKey = new THREE.DirectionalLight(0xffffff, 1.6); labKey.position.set(20, 60, 40); LAB.add(labKey, labKey.target);

// =====================================================================================================================
// ORBI: laptop + phone on a hotel window ledge, the Burj outside at golden hour; parts of a big file flying across
// =====================================================================================================================
const IMG = { lshare: await img("shots_live/laptop.png"), pobj: await img("shots_live/phone.png") }; // live orbitransfer.com captures (2026-11-22)
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
OR.position.set(-560, 400, 690); // a high hotel terrace ~900 m from the tower, facing it
const OR_D = V(0, 420, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-OR_D.x, -OR_D.z);
const lock = makeLock(); OR.add(lock);
const ledge = sh(new THREE.Mesh(new RoundedBoxGeometry(9, 0.25, 4.2, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x2a1f19, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) }))); OR.add(ledge); ledge.position.set(0.6, -0.2, 0);
lap.g.position.set(-1.2, 0, 0.2); lap.g.rotation.y = 0.35; ph.g.position.set(2.2, 0.06, 0.6); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.25);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 6, 2); OR.add(orbiL);
const PARTS = Array.from({ length: 12 }, (_, i) => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.04, 2, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.0, 0.55).multiplyScalar(1.8), toneMapped: false })); OR.add(m); return m; });
function drawLap(g, st) { if (IMG.lshare) g.drawImage(IMG.lshare, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.up >= 0) { g.fillStyle = "rgba(8,10,14,.88)"; rr(g, 60, 700, 760, 160, 26); g.fill(); g.fillStyle = "#fff"; g.font = "700 34px M"; g.fillText("dubai-drone-4k.mp4  ·  6.8 GB", 96, 752);
    for (let i = 0; i < 12; i++) { const k = clamp(st.up * 12 - i); g.fillStyle = k >= 1 ? green : "rgba(255,255,255,.12)"; rr(g, 96 + i * 58, 782, 50, 46, 8); g.fill(); if (k > 0 && k < 1) { g.fillStyle = green; rr(g, 96 + i * 58, 782, 50 * k, 46, 8); g.fill(); } }
    if (st.pause) { g.fillStyle = "#ff8a3d"; g.font = "700 30px M"; g.fillText("SIGNAL LOST · WAITING", 520, 752); } else if (st.up > 0 && st.up < 1) { g.fillStyle = green; g.font = "700 30px M"; g.fillText(`${Math.round(st.up * 100)}%  ·  3 AT ONCE`, 560, 752); } } }
function drawPhone(g, st) { if (IMG.pobj) g.drawImage(IMG.pobj, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (st.land < 1) { g.fillStyle = `rgba(0,0,0,${1 - st.land})`; g.fillRect(0, 0, 780, 1688); }
  if (st.wifi) { g.fillStyle = "rgba(8,10,14,.85)"; rr(g, 140, 120, 500, 90, 45); g.fill(); g.fillStyle = st.wifi === "off" ? "#ff5a4a" : green; g.font = "700 34px M"; g.fillText(st.wifi === "off" ? "NO SIGNAL" : "BACK ONLINE", 230, 178); } }
