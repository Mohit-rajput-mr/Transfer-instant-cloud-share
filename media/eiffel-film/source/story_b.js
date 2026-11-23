
// =====================================================================================================================
// PARIS: the Seine to the north-west, the Champ de Mars to the south-east, Haussmann blocks with zinc mansard roofs
// =====================================================================================================================
const CITY = new THREE.Group(); scene.add(CITY);
const gT = (n, srgb, r) => tex(`kit/ph/grass_ground/grass_ground_${n}_1k.jpg`, srgb, r, r);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.95, map: tex("kit/ph/gravel_floor/gravel_floor_diff_1k.jpg", true, 3000, 3000) }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; CITY.add(ground);
const lawnMat = new THREE.MeshStandardMaterial({ map: gT("diff", true, 18, 90), normalMap: gT("nor_gl", false, 18, 90), roughness: 1, color: 0xb9d19a });
for (const x of [-46, 46]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(84, 900), lawnMat); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.3, 560); l.receiveShadow = true; CITY.add(l); }
// gravel paths of the Champ de Mars and under the tower
const path = new THREE.Mesh(new THREE.PlaneGeometry(320, 1000), new THREE.MeshStandardMaterial({ color: 0xc9b99c, roughness: 1, map: tex("kit/ph/gravel_floor/gravel_floor_diff_1k.jpg", true, 30, 90) }));
path.rotation.x = -Math.PI / 2; path.position.set(0, 0.15, 470); path.receiveShadow = true; CITY.add(path);
// the Seine: a 140 m river with stone quays
const waterN = (() => { const N = 256, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N); H.reseed(5);
  const W2 = Array.from({ length: 24 }, () => ({ kx: Math.round((H.rnd() - 0.5) * 14), ky: Math.round((H.rnd() - 0.5) * 14), ph: H.rnd() * TAU, a: 0.4 + H.rnd() })); const hh = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const q of W2) { const k = Math.hypot(q.kx, q.ky) || 1; v += (q.a / k) * Math.sin(((q.kx * x + q.ky * y) / N) * TAU + q.ph); } hh[y * N + x] = v; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = hh[y * N + (x + 1) % N] - hh[y * N + (x + N - 1) % N], dy = hh[((y + 1) % N) * N + x] - hh[((y + N - 1) % N) * N + x]; const n = V(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * N + x) * 4;
    im.data[i] = (n.x * 0.5 + 0.5) * 255; im.data[i + 1] = (n.y * 0.5 + 0.5) * 255; im.data[i + 2] = (n.z * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const SEINE_Z = -230;
const seine = new Water(new THREE.PlaneGeometry(9000, 140), { textureWidth: 512, textureHeight: 512, waterNormals: waterN, sunDirection: SUN.clone(), sunColor: 0xfff0d8, waterColor: 0x1d3b3a, distortionScale: 1.8, fog: true });
seine.rotation.x = -Math.PI / 2; seine.position.set(0, -3.5, SEINE_Z); CITY.add(seine);
const stone = (rx, ry) => new THREE.MeshStandardMaterial({ color: 0xd8ccb4, roughness: 0.9, map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, rx, ry) });
for (const s of [-1, 1]) { const q = sh(new THREE.Mesh(new THREE.BoxGeometry(9000, 6, 14), stone(300, 1))); q.position.set(0, -2, SEINE_Z + s * 77); CITY.add(q); }
// Pont d'Iéna: five stone arches across the river in line with the tower
{ const br = new THREE.Group(); br.position.set(0, 0, SEINE_Z); CITY.add(br);
  const deck = sh(new THREE.Mesh(new THREE.BoxGeometry(35, 1.6, 160), stone(2, 10))); deck.position.y = 0.6; br.add(deck);
  for (let i = 0; i < 4; i++) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(30, 4, 6), stone(2, 1))); p.position.set(0, -2, -60 + i * 40); br.add(p); } }
// Haussmann Paris: irregular perimeter blocks (Voronoi cells cut by straight boulevards radiating from the squares),
// 6-storey cream limestone facades (tall French windows, wrought-iron balconies on the 2nd and 5th floors, shops on the
// ground floor), grey-blue zinc mansard roofs with dormers, chimney stacks; open courtyards inside each block.
const HUBS = [V(0, 0, 1060), V(0, 0, -600), V(1500, 0, 950), V(-1350, 0, 1500), V(1700, 0, -1500), V(-1900, 0, -1300)];
const RAYS = []; HUBS.forEach((h, hi) => { const n = 7; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + hi * 0.37; RAYS.push({ o: h, d: V(Math.cos(a), 0, Math.sin(a)), w: 17 + (i % 2) * 6 }); } });
RAYS.push({ o: V(0, 0, SEINE_Z + 110), d: V(1, 0, 0), w: 14 }, { o: V(0, 0, SEINE_Z - 110), d: V(1, 0, 0), w: 14 });   // quai roads
const ZONES = [[-200, -150, 200, 1000], [-9000, SEINE_Z - 96, 9000, SEINE_Z + 96], [-340, -770, 340, SEINE_Z - 96], [-170, 1000, 170, 1110]];   // Champ de Mars, Seine, Trocadéro, École Militaire
const inZone = (x, z) => ZONES.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
const clipP = (P, nx, nz, c) => { const out2 = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const da = a[0] * nx + a[1] * nz - c, db = b[0] * nx + b[1] * nz - c;
  if (da >= 0) out2.push(a); if ((da >= 0) !== (db >= 0)) { const k = da / (da - db); out2.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); } } return out2; };
const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const cent = (P) => P.reduce((s, p) => [s[0] + p[0] / P.length, s[1] + p[1] / P.length], [0, 0]);
const FAC = [], ROOF = [], CHIM = [];
{ H.reseed(11); const SP = 96, R = 4200, pts = [], grid = new Map(); const key = (i, j) => i + "," + j;
  for (let i = -46; i <= 46; i++) for (let j = -46; j <= 46; j++) { const x = (i + 0.5 + (H.rnd() - 0.5) * 0.7) * SP, z = (j + 0.5 + (H.rnd() - 0.5) * 0.7) * SP; if (Math.hypot(x, z) > R || inZone(x, z)) continue; const p = [x, z, i, j]; pts.push(p); grid.set(key(i, j), p); }
  for (const [x, z, gi, gj] of pts) {
    let P = [[x - 300, z - 300], [x + 300, z - 300], [x + 300, z + 300], [x - 300, z + 300]];
    for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) { const q = grid.get(key(gi + di, gj + dj)); if (!q || (di === 0 && dj === 0)) continue;
      const nx = x - q[0], nz = z - q[1], L = Math.hypot(nx, nz); const mx = (x + q[0]) / 2, mz = (z + q[1]) / 2; P = clipP(P, nx / L, nz / L, (mx * nx + mz * nz) / L + 6); }   // half street (12 m streets)
    for (const r of RAYS) { const px = x - r.o.x, pz = z - r.o.z; const along = px * r.d.x + pz * r.d.z; if (along < 0) continue; const side = px * -r.d.z + pz * r.d.x; const nx = -r.d.z * Math.sign(side), nz = r.d.x * Math.sign(side);
      const c = (r.o.x * nx + r.o.z * nz) + r.w; if (Math.abs(side) < 220) P = clipP(P, nx, nz, c); }
    for (const [x0, z0, x1, z1] of ZONES) { const cx = x, cz = z; if (cx < x0) P = clipP(P, -1, 0, -x0 + 10); else if (cx > x1) P = clipP(P, 1, 0, x1 + 10); else if (cz < z0) P = clipP(P, 0, -1, -z0 + 10); else if (cz > z1) P = clipP(P, 0, 1, z1 + 10); }
    if (P.length < 3 || Math.abs(area(P)) < 400) continue;
    if (area(P) < 0) P.reverse();
    const d0 = Math.hypot(x, z), hgt = 18.5 + H.rnd() * 3.5, sd = H.rnd();
    if (d0 > 2000) { const [cx, cz] = cent(P); let w = 0, dd = 0; const a = Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]); for (const p of P) { const u = (p[0] - cx) * Math.cos(a) + (p[1] - cz) * Math.sin(a), v = -(p[0] - cx) * Math.sin(a) + (p[1] - cz) * Math.cos(a); w = Math.max(w, Math.abs(u)); dd = Math.max(dd, Math.abs(v)); }
      FAC.push([cx, cz, w * 1.6, dd * 1.6, hgt, a, sd]); ROOF.push([cx, cz, w * 1.6, dd * 1.6, hgt, a]); continue; }
    for (let e = 0; e < P.length; e++) { const a = P[e], b = P[(e + 1) % P.length]; const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez); if (L < 9) continue;
      const dx = ex / L, dz = ez / L, nx = -dz, nz = dx; const n = Math.max(1, Math.round(L / (13 + H.rnd() * 7))), seg = L / n, ang = Math.atan2(dz, dx);
      for (let i = 0; i < n; i++) { const h2 = hgt + (H.rnd() - 0.5) * 1.6, depth = 13 + H.rnd() * 3; const cx = a[0] + dx * seg * (i + 0.5) + nx * depth / 2, cz = a[1] + dz * seg * (i + 0.5) + nz * depth / 2;
        FAC.push([cx, cz, seg + 0.4, depth, h2, ang, H.rnd()]); ROOF.push([cx, cz, seg + 0.4, depth, h2, ang]);
        if (H.rnd() < 0.8) CHIM.push([cx + nx * (H.rnd() - 0.5) * depth * 0.3 + dx * (H.rnd() - 0.5) * seg * 0.6, cz + nz * (H.rnd() - 0.5) * depth * 0.3 + dz * (H.rnd() - 0.5) * seg * 0.6, h2 + 5.6, ang]); } } } }
const facMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0, map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, 1, 1) });
const LOCAL_VS = (s) => s.replace("#include <common>", "#include <common>\nattribute vec2 aKind; varying vec3 vLoc; varying vec3 vON; varying vec2 vKind; varying vec3 vWP2;")
  .replace("#include <begin_vertex>", `#include <begin_vertex>
    vec3 scl = vec3(1.0);
    #ifdef USE_INSTANCING
      scl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    #endif
    vLoc = position * scl; vON = normal; vKind = aKind;
    vec4 w4 = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      w4 = instanceMatrix * w4;
    #endif
    vWP2 = (modelMatrix * w4).xyz;`);
facMat.onBeforeCompile = (s) => { s.vertexShader = LOCAL_VS(s.vertexShader);
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vLoc; varying vec3 vON; varying vec2 vKind; varying vec3 vWP2; float hh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 14375.5); }")
    .replace("#include <map_fragment>", `
      vec3 n = abs(vON); float u = n.z > 0.5 ? vLoc.x : vLoc.z; float y = vLoc.y; float top = vKind.x; float sd = vKind.y;
      vec2 suv = vec2(u, y) / 6.0; vec4 stone = texture2D(map, suv);
      float lum = dot(stone.rgb, vec3(0.33));
      vec3 wall = vec3(0.9, 0.84, 0.72) * (0.82 + 0.35 * lum) * (0.92 + 0.12 * sd);
      float dist = length(cameraPosition - vWP2), far = smoothstep(700.0, 2600.0, dist);
      float bay = 3.3, fx = fract(u / bay + 0.5 * sd), col = floor(u / bay);
      float fl; float fy; if (y < 4.4) { fl = 0.0; fy = y / 4.4; } else if (y < 7.0) { fl = 1.0; fy = (y - 4.4) / 2.6; } else { fl = 2.0 + floor((y - 7.0) / 3.05); fy = fract((y - 7.0) / 3.05); }
      vec3 c = wall;
      if (n.y < 0.5 && y < top - 0.6) {
        float winX = step(0.3, fx) * step(fx, 0.7);
        if (fl == 0.0) { float shop = step(0.12, fx) * step(fx, 0.88) * step(0.06, fy) * step(fy, 0.8); vec3 aw = mix(vec3(0.35, 0.08, 0.07), vec3(0.1, 0.18, 0.12), step(0.5, hh(vec2(col, sd * 31.0))));
          c = mix(c * 0.86, vec3(0.06, 0.07, 0.08) + 0.08 * hh(vec2(col, 3.0)), shop); c = mix(c, aw, step(0.12, fx) * step(fx, 0.88) * step(0.8, fy) * step(fy, 0.92)); }
        else { float wy = fl == 1.0 ? step(0.2, fy) * step(fy, 0.78) : step(0.16, fy) * step(fy, 0.86);
          float lit = hh(vec2(col, fl + sd * 17.0)); vec3 glass = mix(vec3(0.07, 0.08, 0.1), vec3(0.18, 0.2, 0.24), lit);
          c = mix(c, vec3(0.97, 0.94, 0.86), winX * wy * 0.0 + (step(0.26, fx) * step(fx, 0.74) * (1.0 - winX)) * wy * 0.25);   // pale stone frames
          c = mix(c, glass, winX * wy);
          float balc = (fl == 3.0 || fl == top * 0.0 + 6.0 || (fl == 2.0 && hh(vec2(col, 9.0)) < 0.0)) ? 1.0 : 0.0; if (fl == 3.0 || fl == 6.0) { float b = step(0.0, fy) * step(fy, 0.16); float rails = step(0.5, fract(u * 6.0)); c = mix(c, vec3(0.05), b * (0.55 + 0.35 * rails)); }
          if (fl > 1.0 && fy > 0.92) c *= 0.86; }                                                       // string course shadows
        if (y > top - 1.4) c = mix(c, vec3(0.95, 0.91, 0.82), 0.6);                                        // cornice
        c = mix(c, wall * 0.9, far * 0.7);
      }
      if (n.y > 0.5) c = vec3(0.4, 0.43, 0.47);
      diffuseColor.rgb *= c;`); };
facMat.customProgramCacheKey = () => "paris-fac";
const zincT = tex("kit/ph/grey_roof_01/grey_roof_01_diff_1k.jpg", true, 1, 1);
const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.35, map: zincT });
roofMat.onBeforeCompile = (s) => { s.vertexShader = LOCAL_VS(s.vertexShader);
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vLoc; varying vec3 vON; varying vec2 vKind; varying vec3 vWP2;")
    .replace("#include <map_fragment>", `
      vec3 n = vON; float u = abs(n.z) > abs(n.x) ? vLoc.x : vLoc.z; vec4 zt = texture2D(map, vec2(u, vLoc.y) / 5.0);
      vec3 c = vec3(0.46, 0.5, 0.55) * (0.75 + 0.5 * dot(zt.rgb, vec3(0.33)));
      c *= 0.9 + 0.1 * step(0.5, fract(u * 2.0));                                                              // standing seams
      float steep = 1.0 - step(0.55, vLoc.y / 6.0);
      float fx = fract(u / 3.3), dorm = steep * step(0.35, fx) * step(fx, 0.65) * step(0.12, vLoc.y / 6.0) * step(vLoc.y / 6.0, 0.48);
      c = mix(c, vec3(0.9, 0.88, 0.84), dorm * 0.8); c = mix(c, vec3(0.08, 0.09, 0.11), dorm * step(0.4, fx) * step(fx, 0.6) * step(0.18, vLoc.y / 6.0) * step(vLoc.y / 6.0, 0.42));
      diffuseColor.rgb = c;`); };
roofMat.customProgramCacheKey = () => "paris-roof";
const mansardG = (() => { const g = new THREE.BufferGeometry(); const L = [[0.5, 0.5, 0], [0.42, 0.42, 0.7], [0.28, 0.3, 1.0]]; const pos = [];
  const ring = (k) => { const [w, d, y] = L[k]; return [[-w, y, -d], [w, y, -d], [w, y, d], [-w, y, d]]; };
  for (let k = 0; k < 2; k++) { const A = ring(k), B = ring(k + 1); for (let i = 0; i < 4; i++) { const a0 = A[i], a1 = A[(i + 1) % 4], b0 = B[i], b1 = B[(i + 1) % 4]; pos.push(...a0, ...b1, ...a1, ...a0, ...b0, ...b1); } }
  const T = ring(2); pos.push(...T[0], ...T[2], ...T[1], ...T[0], ...T[3], ...T[2]);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; })();
{ const fg = new THREE.BoxGeometry(1, 1, 1); fg.translate(0, 0.5, 0);
  const facIM = new THREE.InstancedMesh(fg, facMat, FAC.length), roofIM = new THREE.InstancedMesh(mansardG, roofMat, ROOF.length);
  const kind = new Float32Array(FAC.length * 2), kindR = new Float32Array(ROOF.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  FAC.forEach(([x, z, w, d, h, a, s], i) => { q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(x, 0, z), q, V(w, h, d)); facIM.setMatrixAt(i, m4); kind[i * 2] = h; kind[i * 2 + 1] = s; });
  ROOF.forEach(([x, z, w, d, h, a], i) => { q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(x, h, z), q, V(w, 6, d)); roofIM.setMatrixAt(i, m4); kindR[i * 2] = h; });
  fg.setAttribute("aKind", new THREE.InstancedBufferAttribute(kind, 2)); mansardG.setAttribute("aKind", new THREE.InstancedBufferAttribute(kindR, 2));
  for (const m of [facIM, roofIM]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; CITY.add(m); }
  const cg = new THREE.BoxGeometry(1, 1, 1); cg.translate(0, 0.5, 0); const chIM = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: 0xb59a86, roughness: 0.9 }), CHIM.length);
  CHIM.forEach(([x, z, y, a], i) => { q.setFromAxisAngle(V(0, 1, 0), -a); m4.compose(V(x, y - 1.2, z), q, V(3.2, 2.2, 0.9)); chIM.setMatrixAt(i, m4); }); chIM.castShadow = true; chIM.frustumCulled = false; CITY.add(chIM);
  console.log("paris buildings", FAC.length, "chimneys", CHIM.length);
  // trees: plane trees along the boulevards, chestnuts along the Champ de Mars and the quays
  const tg = new THREE.IcosahedronGeometry(1, 2); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 0.82 + 0.22 * Math.sin(v.x * 5 + v.y * 3) * Math.cos(v.z * 4) + 0.08 * Math.sin(v.x * 13 + v.z * 11); p.setXYZ(i, v.x * k, v.y * k * 0.9 + 0.9, v.z * k); } tg.computeVertexNormals(); }
  const TP = [];
  for (let i = 0; i < 700; i++) { TP.push([(i % 4 < 2 ? -1 : 1) * (i % 2 ? 118 : 172), 140 + Math.floor(i / 4) * 5.2]); }
  for (let i = 0; i < 800; i++) TP.push([-4000 + i * 10, SEINE_Z + ((i % 2) ? 92 : -92)]);
  for (const r of RAYS.slice(0, -2)) for (let s = 40; s < 2600; s += 9) for (const sd of [-1, 1]) { const x = r.o.x + r.d.x * s + -r.d.z * sd * (r.w - 4), z = r.o.z + r.d.z * s + r.d.x * sd * (r.w - 4); if (Math.hypot(x, z) < 3000 && !inZone(x, z)) TP.push([x, z]); }
  const trees = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: gT("diff", true, 2) }), TP.length); const col = new THREE.Color();
  TP.forEach(([x, z], i) => { const s = 3.6 + hash(i) * 1.8; m4.makeScale(s, s * 1.15, s).setPosition(x, 2.5, z); trees.setMatrixAt(i, m4); trees.setColorAt(i, col.setHSL(0.24 + hash(i + 3) * 0.05, 0.42, 0.3 + hash(i + 7) * 0.08)); });
  trees.castShadow = true; trees.frustumCulled = false; CITY.add(trees); }
// city ground: asphalt streets
ground.material.map = tex("kit/ph/asphalt_02/asphalt_02_diff_1k.jpg", true, 2400, 2400); ground.material.color.set(0x9a958c); ground.material.needsUpdate = true;
// Palais de Chaillot (Trocadéro): two curved wings and the pavilions, the gardens and the long fountain basin down to the Seine
{ const stoneC = new THREE.MeshStandardMaterial({ color: 0xe6dcc8, roughness: 0.85, map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, 4, 1) }); const C0 = V(0, 0, -780), R0 = 230;
  for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 18; i++) { const a = s * (0.32 + i * 0.065); const b = sh(new THREE.Mesh(new THREE.BoxGeometry(19, 20, 16), stoneC)); b.position.set(C0.x + Math.sin(a) * R0, 10, C0.z + Math.cos(a) * R0); b.rotation.y = a; CITY.add(b);
    const r = sh(new THREE.Mesh(new THREE.BoxGeometry(19.5, 1.2, 16.5), matte(0xcfc6b4, 0.9))); r.position.copy(b.position).setY(20.6); r.rotation.y = a; CITY.add(r); }
  for (const s of [-1, 1]) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(46, 28, 40), stoneC)); p.position.set(s * 70, 14, C0.z + R0 - 10); CITY.add(p); }
  const lawn2 = new THREE.Mesh(new THREE.PlaneGeometry(560, 330), lawnMat); lawn2.rotation.x = -Math.PI / 2; lawn2.position.set(0, 0.3, -500); lawn2.receiveShadow = true; CITY.add(lawn2);
  const basin = new THREE.Mesh(new THREE.PlaneGeometry(60, 230), new THREE.MeshPhysicalMaterial({ color: 0x5f8aa0, roughness: 0.05, metalness: 0.2 })); basin.rotation.x = -Math.PI / 2; basin.position.set(0, 0.12, -470); CITY.add(basin);
  // École Militaire closing the Champ de Mars
  const em = sh(new THREE.Mesh(new THREE.BoxGeometry(320, 22, 40), stoneC)); em.position.set(0, 11, 1080); CITY.add(em);
  const emR = sh(new THREE.Mesh(new THREE.BoxGeometry(321, 6, 41), new THREE.MeshStandardMaterial({ color: 0x6b7480, roughness: 0.5, metalness: 0.3 }))); emR.position.set(0, 25, 1080); CITY.add(emR);
  const dome = sh(new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6b7480, roughness: 0.4, metalness: 0.4 }))); dome.position.set(0, 30, 1062); dome.scale.y = 1.3; CITY.add(dome);
  const portico = sh(new THREE.Mesh(new THREE.BoxGeometry(60, 30, 12), stoneC)); portico.position.set(0, 15, 1056); CITY.add(portico); }
// bateaux-mouches on the Seine
const BOATS = []; for (let i = 0; i < 5; i++) { const b = new THREE.Group(); const hull = sh(new THREE.Mesh(new RoundedBoxGeometry(32, 2.4, 7, 2, 0.6), matte(0xeeeeea, 0.5))); hull.position.y = 0.2; b.add(hull);
  const glass = sh(new THREE.Mesh(new RoundedBoxGeometry(26, 2.2, 6.2, 2, 0.8), new THREE.MeshPhysicalMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.3, clearcoat: 1 }))); glass.position.y = 2.4; b.add(glass);
  b.position.set(-1500 + i * 700, -3.2, SEINE_Z + (i % 2 ? 30 : -30)); b.userData.dir = i % 2 ? 1 : -1; CITY.add(b); BOATS.push(b); }
function boats(t) { BOATS.forEach((b, i) => { b.position.x = ((-1500 + i * 700 + b.userData.dir * t * 3.5) % 4000 + 4000) % 4000 - 2000; b.rotation.y = b.userData.dir > 0 ? 0 : Math.PI; }); }
// people under the tower for scale (simple walkers seen from afar)
const PEOPLE = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.25, 1.2, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 300);
{ const m4 = new THREE.Matrix4(), c = new THREE.Color(); for (let i = 0; i < 300; i++) { const x = (hash(i) - 0.5) * 140, z = (hash(i + 9) - 0.5) * 160 + 30; m4.makeTranslation(x, 0.85, z); PEOPLE.setMatrixAt(i, m4); PEOPLE.setColorAt(i, c.setHSL(hash(i + 4), 0.4, 0.3 + hash(i + 2) * 0.3)); } PEOPLE.castShadow = true; CITY.add(PEOPLE); }

// =====================================================================================================================
// THE RIVETED JOINT, in place on the tower (west face of the shaft, 150 m up, Paris behind): a gusset plate joining two
// L-angle chords and the lattice bars, rows of domed rivet heads; one hole still open for the red-hot rivet
// (local: x right, y up, +z toward the camera inside the tower)
// =====================================================================================================================
const RV = new THREE.Group(); RV.position.set(-halfW(150) - 1.4, 150, 0); RV.rotation.y = Math.PI / 2; scene.add(RV); RV.visible = false;
const rustN = tex("kit/ph/green_metal_rust/green_metal_rust_nor_gl_1k.jpg", false, 4, 4);
const ironJ = new THREE.MeshStandardMaterial({ color: 0x7a6658, roughness: 0.62, metalness: 0.4, normalMap: rustN, normalScale: new THREE.Vector2(0.35, 0.35) });
const box = (w, h, d, x, y, z, rz = 0) => { const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.003, d / 3)), ironJ)); m.position.set(x, y, z); m.rotation.z = rz; RV.add(m); return m; };
for (const s of [-1, 1]) { box(0.12, 2.6, 0.012, s * 0.4, 0, 0); box(0.012, 2.6, 0.12, s * 0.4 - s * 0.054, 0, -0.06); }      // the two L-angle chords
box(0.64, 0.44, 0.012, 0, 0, 0.012);                                                                                        // gusset plate
const BARS = [[-0.4, -0.75], [0.4, -0.75], [-0.4, 0.75], [0.4, 0.75]];
for (const [x, y] of BARS) { const L = Math.hypot(x, y), a = Math.atan2(y, x); box(0.09, L, 0.01, x / 2, y / 2, 0.024, a - Math.PI / 2); }
box(0.8, 0.09, 0.01, 0, -0.95, 0.012); box(0.8, 0.09, 0.01, 0, 0.95, 0.012);                                                // struts
const HOLE = V(0.12, 0, 0.018);
const RH = [];
for (const s of [-1, 1]) for (let y = -1.25; y <= 1.25; y += 0.075) if (Math.abs(y) > 0.24 || true) RH.push([s * 0.4, y, 0.006 + (Math.abs(y) < 0.23 ? 0.012 : 0) + (Math.abs(Math.abs(y) - 0.95) < 0.05 ? 0.01 : 0)]);
for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) { const x = i * 0.12, y = j * 0.15; if (Math.abs(x - HOLE.x) < 0.01 && Math.abs(y - HOLE.y) < 0.01) continue; RH.push([x, y, 0.018 + (Math.abs(x) > 0.2 && Math.abs(y) > 0.1 ? 0.01 : 0)]); }
for (const [x, y] of BARS) for (const k of [0.62, 0.74]) RH.push([x * k, y * k, 0.029]);
const headG = new THREE.SphereGeometry(0.014, 20, 10, 0, TAU, 0, Math.PI / 2); headG.scale(1, 0.62, 1); headG.rotateX(Math.PI / 2);
const RIVS = new THREE.InstancedMesh(headG, ironJ, RH.length); { const m4 = new THREE.Matrix4(); RH.forEach(([x, y, z], i) => RIVS.setMatrixAt(i, m4.makeTranslation(x, y, z))); RIVS.castShadow = true; RV.add(RIVS); }
const holeM = new THREE.Mesh(new THREE.CircleGeometry(0.0115, 24), new THREE.MeshBasicMaterial({ color: 0x050403 })); holeM.position.copy(HOLE).add(V(0, 0, 0.0005)); RV.add(holeM);
// the hot rivet: shank + head, glowing (heated in the portable forge), then hammered into a dome
const rivetMat = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.5, metalness: 0.6, emissive: new THREE.Color(1.0, 0.28, 0.05), emissiveIntensity: 0 });
const rivet = new THREE.Group(); RV.add(rivet);
const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.06, 20), rivetMat); shank.rotation.x = Math.PI / 2; shank.position.z = -0.026; rivet.add(shank);
const headTop = sh(new THREE.Mesh(headG, rivetMat)); headTop.position.z = 0.003; rivet.add(headTop);
// tongs, hammer (a snap + sledge), sparks, the forge glow
const tongs = new THREE.Group(); RV.add(tongs);
for (const s of [-1, 1]) { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 8), metal(0x2a2826, 0.5))); b.rotation.z = Math.PI / 2 - s * 0.06; b.position.set(0.26, s * 0.012, 0); tongs.add(b); }
const hammer = new THREE.Group(); RV.add(hammer);
{ const hd = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.1, 24), metal(0x5d5a56, 0.4))); hd.rotation.x = Math.PI / 2; hd.position.z = 0.065; hammer.add(hd);
  const hl = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.7 }))); hl.position.set(0, -0.3, 0.065); hammer.add(hl); }
const sparks = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(120 * 3), 3)), new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.0, 0.3), size: 0.0025, transparent: true, toneMapped: false })); sparks.frustumCulled = false; RV.add(sparks);
const forgeL = new THREE.PointLight(0xff6a20, 0, 0.12, 2); forgeL.position.copy(HOLE).add(V(0, 0, 0.08)); RV.add(forgeL);
RV.updateMatrixWorld(true);

// =====================================================================================================================
// ORBI: a Paris balcony with the tower behind; direct path first, the encrypted cloud copy when it can't
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
OR.position.set(520, 31, 700);
const OR_D = V(0, 120, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-OR_D.x, -OR_D.z);
const lock = makeLock(); OR.add(lock);
const table = sh(new THREE.Mesh(new RoundedBoxGeometry(9, 0.25, 4.2, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x2a1f19, roughness: 0.3, clearcoat: 0.8, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) }))); OR.add(table); table.position.set(0.6, -0.2, 0);
for (let i = 0; i < 9; i++) { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), metal(0x1d1f22, 0.4))); b.position.set(-3.6 + i * 1.0, -0.8, -1.6); OR.add(b); }
const rail = sh(new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.12), metal(0x1d1f22, 0.4))); rail.position.set(0.4, -0.25, -1.6); OR.add(rail);
lap.g.position.set(-1.2, 0, 0.2); lap.g.rotation.y = 0.35; ph.g.position.set(2.2, 0.06, 0.6); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.25);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 6, 2); OR.add(orbiL);
const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.0, 0.55).multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0 });
const directBeam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(-1.0, 1.2, 0.3), V(0.6, 2.0, 0.6), V(2.2, 0.3, 0.6)), 48, 0.04, 8), beamMat); OR.add(directBeam);
const cloudMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.85, 1.0).multiplyScalar(1.8), toneMapped: false, transparent: true, opacity: 0 });
const cloudBeam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(V(-1.0, 1.2, 0.3), V(-0.6, 4.5, 0.3), V(2.0, 4.5, 0.6), V(2.2, 0.3, 0.6)), 64, 0.04, 8), cloudMat); OR.add(cloudBeam);
const cloudIcon = new THREE.Group(); OR.add(cloudIcon); cloudIcon.position.set(0.7, 4.3, 0.45);
for (const [x, y, r] of [[-0.35, 0, 0.32], [0, 0.15, 0.42], [0.38, 0, 0.3], [0.05, -0.1, 0.36]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.9, 1.0).multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0 })); s.position.set(x, y, 0); cloudIcon.add(s); }
const blockX = new THREE.Group(); OR.add(blockX); blockX.position.set(0.6, 1.7, 0.6);
for (const r of [0.6, -0.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.3, 0.2), toneMapped: false })); b.rotation.z = r + Math.PI / 4 * 0; b.rotation.z = r; blockX.add(b); }
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.msg) { g.fillStyle = "rgba(8,10,14,.88)"; rr(g, 60, 720, 820, 130, 26); g.fill(); g.fillStyle = st.col; g.font = "700 34px M"; g.fillText(st.msg, 96, 778); g.fillStyle = "#cfd6dd"; g.font = "600 26px M"; g.fillText("paris-sunset.mov  ·  1.2 GB", 96, 822); } }
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (st.got > 0) { g.fillStyle = "#0b0d10"; g.fillRect(60, 560, 660, 120); // cover the empty-void hint
    g.fillStyle = "rgba(14,18,22,.96)"; g.strokeStyle = green; g.lineWidth = 3; rr(g, 70, 600, 640, 380, 40); g.fill(); g.stroke();
    g.fillStyle = "#1c2a22"; rr(g, 110, 640, 150, 150, 26); g.fill(); g.fillStyle = green; g.font = "800 56px D"; g.fillText("▶", 160, 738);
    g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("paris-sunset.mov", 290, 700); g.fillStyle = "#9aa6b2"; g.font = "600 30px M"; g.fillText("1.2 GB · video", 290, 750);
    g.fillStyle = "rgba(255,255,255,.12)"; rr(g, 110, 830, 560, 26, 13); g.fill(); g.fillStyle = green; rr(g, 110, 830, 560 * Math.min(1, st.got), 26, 13); g.fill();
    g.font = "800 40px D"; g.fillText(st.got >= 1 ? "✓ RECEIVED" : `RECEIVING ${Math.round(st.got * 100)}%`, 110, 930); } }
