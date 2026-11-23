
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
      let hgt = 8 + Math.pow(H.rnd(), 1.6) * (14 + 24 * dens); const glassB = 0, sd = H.rnd(); B.push([x, z, w, d, hgt, glassB, sd, 0]);
      } }
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
// Downtown Dubai: glass towers of many heights, shapes and glass colours round the Burj and along Sheikh Zayed Road;
// the facades reflect the real sky (same equirect as the sky dome), vertical fins, floor spandrels, sun glints.
const glassMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 });
glassMat.onBeforeCompile = (s) => { s.uniforms.uSky = { value: skyTex }; s.uniforms.uSunG = { value: SUN };
  s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aTint; attribute float aSeed; varying vec3 vGW; varying vec3 vGN; varying vec3 vTint; varying float vSeed; varying vec3 vGL;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      mat4 im4 = mat4(1.0);
      #ifdef USE_INSTANCING
        im4 = instanceMatrix;
      #endif
      vec4 gw = modelMatrix * im4 * vec4(transformed, 1.0); vGW = gw.xyz; vGN = normalize(mat3(modelMatrix * im4) * normal);
      vec3 scl = vec3(length(im4[0].xyz), length(im4[1].xyz), length(im4[2].xyz)); vGL = position * scl; vTint = aTint; vSeed = aSeed;`);
  s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
      uniform sampler2D uSky; uniform vec3 uSunG; varying vec3 vGW; varying vec3 vGN; varying vec3 vTint; varying float vSeed; varying vec3 vGL;
      float hg(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 14375.5); }
      vec3 skyG(vec3 r){ if (r.y < 0.0) return mix(vec3(0.42, 0.38, 0.32), vec3(0.75, 0.7, 0.62), smoothstep(-0.25, 0.0, r.y)); return texture2D(uSky, vec2(atan(r.z, r.x) / 6.2831853 + 0.5, asin(clamp(r.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb; }`)
    .replace("#include <dithering_fragment>", `#include <dithering_fragment>
      { vec3 N = normalize(vGN); if (abs(N.y) < 0.5) {
          vec3 Vd = normalize(cameraPosition - vGW); float dist = length(cameraPosition - vGW);
          float u = abs(N.x) > abs(N.z) ? vGL.z : vGL.x; if (abs(N.x) > 0.2 && abs(N.z) > 0.2) u = atan(vGL.z, vGL.x) * 20.0;
          float fh = 3.6, fy = fract(vGW.y / fh), fx = fract(u / 1.5); float far = smoothstep(400.0, 1600.0, dist);
          float fin = (step(fx, 0.07) + step(0.93, fx)) * (1.0 - far), spand = step(fy, 0.16) * (1.0 - far * 0.7);
          vec3 R = reflect(-Vd, N); vec3 env = skyG(R); float F = 0.08 + 0.92 * pow(1.0 - max(dot(N, Vd), 0.0), 5.0);
          float pane = hg(vec2(floor(vGW.y / fh), floor(u / 1.5)) + vSeed * 31.0);
          vec3 inside = vec3(0.04, 0.05, 0.06) * (0.6 + 0.8 * pane);
          vec3 glass = inside + env * vTint * mix(0.45, 1.0, F) * (0.92 + 0.12 * pane) + vec3(1.0, 0.85, 0.6) * pow(max(dot(R, uSunG), 0.0), 300.0) * 5.0;
          vec3 frame = vTint * 0.5 + 0.25 * env;
          vec3 c = mix(glass, frame, max(fin * 0.8, spand * 0.65));
          if (vGW.y < 12.0) c = mix(c, vec3(0.62, 0.58, 0.52) * (0.5 + 0.5 * max(dot(N, uSunG), 0.0)), 0.8);   // podium stone
          gl_FragColor.rgb = mix(c, fogColor, fogDepthMix(dist)); } }`)
    .replace("#include <fog_fragment>", "#include <fog_fragment>");
  s.fragmentShader = s.fragmentShader.replace("uniform sampler2D uSky;", "float fogDepthMix(float d){ return 1.0 - exp(-pow(d * " + FOG.d.toFixed(6) + ", 2.0)); }\nuniform sampler2D uSky;"); };
glassMat.customProgramCacheKey = () => "dubai-glass";
const TOWERS = [];   // [x, z, w, d, h, shape(0 box,1 round,2 stepped), tint r,g,b, seed, rot]
{ H.reseed(41); const TINTS = [[0.62, 0.78, 0.95], [0.55, 0.82, 0.8], [0.82, 0.86, 0.9], [0.95, 0.8, 0.58], [0.7, 0.78, 0.86], [0.5, 0.66, 0.82]];
  const add = (x, z, h) => { const tn = TINTS[Math.floor(H.rnd() * TINTS.length)], shp = H.rnd() < 0.18 ? 1 : H.rnd() < 0.3 ? 2 : 0, w = 28 + H.rnd() * 22, d = shp === 1 ? w : 26 + H.rnd() * 24;
    if (TOWERS.some((T) => Math.hypot(T[0] - x, T[1] - z) < (T[2] + w) * 0.62)) return; TOWERS.push([x, z, w, d, h, shp, ...tn, H.rnd(), H.rnd() * 0.6 - 0.3]); };
  for (let i = 0; i < 420; i++) { const a = H.rnd() * TAU, r = 380 + Math.pow(H.rnd(), 0.8) * 900; const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8 + 100; if (Math.hypot(x / 1.0, (z - 150) / 0.62) < 430 || (z > -680 && z < -560)) continue; add(x, z, 90 + Math.pow(H.rnd(), 1.5) * 240 * Math.exp(-(r - 380) / 900)); }
  for (let x = -3200; x < 2400; x += 55 + H.rnd() * 40) for (const s of [-1, 1]) if (H.rnd() < 0.85) add(x, -620 + s * (70 + H.rnd() * 60), 110 + Math.pow(H.rnd(), 1.3) * 230);   // Sheikh Zayed Road
  for (let i = 0; i < 160; i++) add(900 + H.rnd() * 1100, -350 + H.rnd() * 650, 90 + Math.pow(H.rnd(), 1.4) * 180);                                                      // Business Bay
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0); const cylG = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); cylG.translate(0, 0.5, 0);
  const sets = [[0, box], [1, cylG], [2, box]];
  for (const [shp, g0] of sets) { const L = TOWERS.filter((T) => T[5] === shp); const g = g0.clone(); const n = L.length * (shp === 2 ? 2 : 1); const im = new THREE.InstancedMesh(g, glassMat, n);
    const tint = new Float32Array(n * 3), seed = new Float32Array(n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let k = 0;
    for (const [x, z, w, d, h, , r, gg, b, sd, rot] of L) { q.setFromAxisAngle(V(0, 1, 0), rot);
      if (shp === 2) { m4.compose(V(x, 0, z), q, V(w, h * 0.72, d)); im.setMatrixAt(k, m4); tint.set([r, gg, b], k * 3); seed[k++] = sd; m4.compose(V(x, h * 0.72, z), q, V(w * 0.7, h * 0.28, d * 0.7)); im.setMatrixAt(k, m4); tint.set([r, gg, b], k * 3); seed[k++] = sd; }
      else { m4.compose(V(x, 0, z), q, V(w, h, d)); im.setMatrixAt(k, m4); tint.set([r, gg, b], k * 3); seed[k++] = sd; } }
    g.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3)); g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1)); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; CITY.add(im); }
  // crowns: thin lit spires on some of the tallest
  const tall = TOWERS.filter((T) => T[4] > 220); const sp = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 1.4, 1, 8), metal(0xc9ced4, 0.3), tall.length); const m4 = new THREE.Matrix4();
  tall.forEach((T, i) => { const hh = 20 + T[9] * 30; m4.makeScale(1, hh, 1).setPosition(T[0], T[4] * (T[5] === 2 ? 1 : 1) + hh / 2, T[1]); sp.setMatrixAt(i, m4); }); CITY.add(sp); }
// Sheikh Zayed Road traffic (12 lanes) and the Dubai Fountain jets in the lake
const CARS = new THREE.InstancedMesh(new RoundedBoxGeometry(1.9, 1.4, 4.6, 2, 0.35), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 }), 600); CARS.frustumCulled = false; CITY.add(CARS);
{ const c = new THREE.Color(); for (let i = 0; i < 600; i++) CARS.setColorAt(i, c.setHSL(hash(i), 0.2 + hash(i + 1) * 0.3, 0.2 + hash(i + 2) * 0.6)); }
function traffic(t) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2); for (let i = 0; i < 600; i++) { const dir = i % 2 ? 1 : -1, lane = (i % 12) >> 1, sp = 22 + hash(i) * 8;
  const x = ((hash(i + 4) * 6000 + dir * sp * t) % 6000 + 6000) % 6000 - 3600; m4.compose(V(x, 0.7, -620 + dir * (4 + lane * 3.4)), q, V(1, 1, 1)); CARS.setMatrixAt(i, m4); } CARS.instanceMatrix.needsUpdate = true; }
const JETS = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.45, 1.5), transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }), 2400); JETS.frustumCulled = false; CITY.add(JETS);
function fountain(t, k) { JETS.visible = k > 0; if (!k) return; const m4 = new THREE.Matrix4(); for (let i = 0; i < 2400; i++) { const j = i % 60, p = ((i / 60) | 0) / 40; const a = (j / 59 - 0.5) * 2.2; const bx = Math.sin(a) * 250, bz = 150 + Math.cos(a) * 120 - 120;
  const hgt = (40 + 60 * (0.5 + 0.5 * Math.sin(t * 1.3 + j * 0.4))) * k; const ph = (p + t * 0.6) % 1; const y = hgt * 4 * ph * (1 - ph), sway = Math.sin(t * 0.8 + j * 0.3) * 6 * ph;
  const s = (1.6 + 2.2 * ph) * k; m4.makeScale(s, s * 1.6, s).setPosition(bx + sway, y, bz); JETS.setMatrixAt(i, m4); } JETS.instanceMatrix.needsUpdate = true; }

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
// smoke: thousands of particles released from a rake of nozzles upstream and carried by the flow (potential flow round the
// body + the shed vortices, Lamb–Oseen cores), lit by a green laser sheet at mid-height. Each frame integrates every
// particle from its release time, so any frame renders on its own (the film renders in parallel).
const smokeSprite = H.canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.4, "rgba(255,255,255,0.45)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, w); });
const SM_U = 6.0, SM_D = 4.4, SM_R = 2.2, SM_LIFE = 13, SM_N = 9000, SM_X0 = -34;
const hs = (n) => { const x = Math.sin(n * 91.7 + 7.13) * 43758.5453; return x - Math.floor(x); };
/** the shed vortices alive at time t: [x, z, Γ, core] — orderly street for the plain cylinder, incoherent for the Burj */
function vortices(t, chaotic) { const T = SM_D / (0.2 * SM_U), hT = T / 2, out = []; const k0 = Math.floor(t / hT);
  for (let i = 0; i < 16; i++) { const k = k0 - i; const tb = k * hT + (chaotic ? (hs(k * 1.7) - 0.5) * hT : 0), age = t - tb; if (age < 0) continue;
    let side = (k & 1) ? 1 : -1, str = 1, x = SM_D * 0.7 + 0.85 * SM_U * age, z = side * SM_D * 0.4 * (1 + 0.12 * age);
    if (chaotic) { side = hs(k * 3.1) < 0.5 ? -1 : 1; str = 0.22 + 0.3 * hs(k * 5.3); z = (hs(k * 7.3) - 0.5) * SM_D * 1.4; x += (hs(k * 2.9) - 0.5) * SM_D * 1.2; }
    const gam = -side * 2.2 * SM_U * SM_D * 0.42 * str * Math.min(1, age / 0.6);
    out.push([x, z, gam, 0.7 + 0.25 * age]); }
  return out; }
function velAt(x, z, V2, RB = SM_R) { const r2 = x * x + z * z, R2 = RB * RB; let u = SM_U, w = 0;
  if (r2 > 0.01) { const r4 = r2 * r2; u -= SM_U * R2 * (x * x - z * z) / r4; w -= SM_U * R2 * 2 * x * z / r4; }
  for (const [vx, vz, g, c] of V2) { const dx = x - vx, dz = z - vz, d2 = dx * dx + dz * dz + c * c; const f = g / (2 * Math.PI * d2); u += -dz * f; w += dx * f; }
  if (r2 < R2 * 1.05) { const r = Math.sqrt(r2) || 1; u += (x / r) * 4; w += (z / r) * 4; }    // keep particles off the body
  return [u, w]; }
function makeSmoke(chaotic, y) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(SM_N * 3), col = new Float32Array(SM_N * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.4, map: smokeSprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
  m.frustumCulled = false; m.position.y = y;
  const U = { uT: { value: 0 } }; let last = -1;
  const RB = chaotic ? SM_R * 0.55 : SM_R;
  const update = () => { const t = U.uT.value; if (t === last) return; last = t; const dt = 0.07; const cache = new Map(); const fieldAt = (tt) => { const key = Math.round(tt / dt); if (!cache.has(key)) cache.set(key, vortices(key * dt, chaotic)); return cache.get(key); };
    const base = chaotic ? new THREE.Color(0.55, 1.0, 0.7) : new THREE.Color(0.75, 1.0, 0.8);
    for (let i = 0; i < SM_N; i++) { const lane = i % 22, ph = hs(i * 0.37 + chaotic) * SM_LIFE; const age = ((t + ph) % SM_LIFE); const t0 = t - age;
      const shoulder = i % 10 < 7; let x = shoulder ? -0.6 + hs(i * 1.3) * 0.5 : SM_X0 + hs(i * 1.3) * 0.8, z = shoulder ? ((i % 2) ? 1 : -1) * (RB + 0.12 + hs(i * 3.3) * 0.25) : ((i % 8) - 3.5) * 3.2 + (hs(i) - 0.5) * 0.2; const steps = Math.floor(age / dt); const dif = (hs(i * 5.7) - 0.5) * 0.09, dif2 = (hs(i * 8.1) - 0.5) * 0.06;
      for (let s = 0; s < steps; s++) { const tt = t0 + s * dt; const [u, w] = velAt(x, z, fieldAt(tt), RB); x += u * dt + dif2 * Math.sqrt(s * dt); z += w * dt + dif * Math.sqrt(s * dt) * (x > 0 ? 1.6 : 0.4); if (x > 70) break; }
      const yv = (hs(i * 2.1) - 0.5) * 0.8 * (1 + age * 0.15);   // smoke thickens slowly off the sheet
      pos[i * 3] = x; pos[i * 3 + 1] = yv; pos[i * 3 + 2] = -z;
      const fade = (shoulder ? 1 : 0.35) * Math.min(1, age / 0.4) * Math.max(0, 1 - Math.max(0, (x - 40) / 30)) * (1 - Math.abs(yv) / 1.6) * (0.55 + 0.45 * hs(i * 4.7));
      col[i * 3] = base.r * fade * 0.22; col[i * 3 + 1] = base.g * fade * 0.22; col[i * 3 + 2] = base.b * fade * 0.22; }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; };
  return { m, U, update }; }
const SMOKE_C = [makeSmoke(0, 14)];
const SMOKE_B = [makeSmoke(1, 14)];
// the tunnel itself: steel walls with panel seams, a honeycomb flow straightener at the inlet, the fan at the outlet, the laser
const steelT = H.canvasTex(512, 512, (g, w) => { g.fillStyle = "#1a1d21"; g.fillRect(0, 0, w, w); g.strokeStyle = "rgba(255,255,255,0.08)"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.strokeRect(i * 128, 0, 128, w); }
  g.fillStyle = "rgba(255,255,255,0.12)"; for (let i = 0; i <= 4; i++) for (let j = 0; j < 16; j++) { g.beginPath(); g.arc(i * 128 + 6, j * 32 + 16, 2.2, 0, 7); g.fill(); g.beginPath(); g.arc(i * 128 + 122, j * 32 + 16, 2.2, 0, 7); g.fill(); } });
steelT.wrapS = steelT.wrapT = THREE.RepeatWrapping; steelT.repeat.set(8, 2);
const wallM = new THREE.MeshStandardMaterial({ map: steelT, roughness: 0.55, metalness: 0.6, color: 0x9aa2aa });
for (const s of [-1, 1]) { const w = sh(new THREE.Mesh(new THREE.BoxGeometry(170, 36, 0.8), wallM), false, true); w.position.set(15, 18, s * 26); LAB.add(w); }
const hex = H.canvasTex(512, 512, (g, w) => { g.fillStyle = "#06080a"; g.fillRect(0, 0, w, w); g.strokeStyle = "#8a9299"; g.lineWidth = 3; const r = 16;
  for (let y = 0; y < w + r; y += r * 1.5) for (let x = 0; x < w + r; x += r * Math.sqrt(3)) { const ox = x + ((y / (r * 1.5)) % 2) * r * Math.sqrt(3) / 2; g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; g.lineTo(ox + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke(); } });
hex.wrapS = hex.wrapT = THREE.RepeatWrapping; hex.repeat.set(4, 3);
const honey = new THREE.Mesh(new THREE.PlaneGeometry(52, 36), new THREE.MeshStandardMaterial({ map: hex, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide })); honey.rotation.y = Math.PI / 2; honey.position.set(-62, 18, 0); LAB.add(honey);
const FAN = new THREE.Group(); FAN.position.set(98, 18, 0); FAN.rotation.y = Math.PI / 2; LAB.add(FAN);
{ const duct = sh(new THREE.Mesh(new THREE.TorusGeometry(16, 1.2, 12, 64), metal(0x3a3f45, 0.4))); FAN.add(duct); const hub = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 3, 24), metal(0x2a2e33, 0.4))); hub.rotation.x = Math.PI / 2; FAN.add(hub);
  for (let i = 0; i < 7; i++) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(2.6, 13, 0.4), metal(0x50565c, 0.35))); b.position.y = 8; const p = new THREE.Group(); p.add(b); p.rotation.z = i / 7 * TAU; b.rotation.y = 0.5; FAN.add(p); } }
const laserSheet = new THREE.Mesh(new THREE.PlaneGeometry(150, 50), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.5, 0.2), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
laserSheet.rotation.x = -Math.PI / 2; laserSheet.position.set(10, 14, 0); LAB.add(laserSheet);
const laserBox = sh(new THREE.Mesh(new RoundedBoxGeometry(3, 2, 2, 2, 0.3), metal(0x22262a, 0.4))); laserBox.position.set(-20, 14, -25); LAB.add(laserBox);
const laserDot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), glow(0x3dff8c, 4)); laserDot.position.set(-20, 14, -23.9); LAB.add(laserDot);
const rake = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 27), metal(0x6a7076, 0.3)); rake.position.set(SM_X0 - 0.5, 14, 0); LAB.add(rake);
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
  if (st.land > 0) { g.fillStyle = "#0b0d10"; g.fillRect(60, 560, 660, 120); g.fillStyle = "rgba(14,18,22,.96)"; g.strokeStyle = green; g.lineWidth = 3; rr(g, 60, 560, 660, 380, 40); g.fill(); g.stroke();
    g.fillStyle = "#1c2a22"; rr(g, 100, 600, 150, 150, 26); g.fill(); g.fillStyle = green; g.font = "800 56px D"; g.fillText("▶", 150, 698);
    g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("dubai-skyline.mov", 280, 660); g.fillStyle = "#9aa6b2"; g.font = "600 30px M"; g.fillText("20 GB · video", 280, 710);
    g.fillStyle = "rgba(255,255,255,.12)"; rr(g, 100, 790, 580, 26, 13); g.fill(); g.fillStyle = green; rr(g, 100, 790, 580 * Math.min(1, st.land), 26, 13); g.fill();
    g.font = "800 40px D"; g.fillText(st.land >= 1 ? "✓ RECEIVED" : `RECEIVING ${Math.round(st.land * 100)}%`, 100, 890); }
  if (st.wifi) { g.fillStyle = "rgba(8,10,14,.85)"; rr(g, 140, 120, 500, 90, 45); g.fill(); g.fillStyle = st.wifi === "off" ? "#ff5a4a" : green; g.font = "700 34px M"; g.fillText(st.wifi === "off" ? "NO SIGNAL" : "BACK ONLINE", 230, 178); } }
