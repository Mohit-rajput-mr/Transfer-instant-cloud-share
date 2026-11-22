// Do you know why the tallest building on Earth is shaped like a desert flower? Burj Khalifa — HD film on kit/hd.js (9:16).
// Real scale (metres): the tower is lofted from its Y-shaped plan (three wings round a hexagonal core) with 27 setbacks that
// spiral up (one wing at a time) to the core crown at 585 m and the steel spire to 828 m. 163 floors. A procedural Downtown
// Dubai with Burj Lake, the desert (Poly Haven aerial sand), the Gulf (ocean shader), a real Poly Haven sky (late afternoon).
// Physics: vortex shedding drawn as glowing smoke from an analytic vortex street (a plain cylinder: a steady alternating street
// that rocks it; the Burj: shapes change every few floors → incoherent, weak swirls); sway exaggerated + labelled.
// Foundation: 3.7 m raft on 192 piles (1.5 m × 43 m, > 50 m deep). Concrete pumped to 606 m. Spire > 4,000 t of steel.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import { makePhone, makeLaptop, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }

// ---------- sky (Poly Haven "Qwantani late afternoon", CC0): its sun is at u 0.607, 20° up → the scene's sun ----------
const SUN = (() => { const a = (0.6074 - 0.5) * TAU, el = THREE.MathUtils.degToRad(20); return V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).normalize(); })();
H.key.color.set(0xffe0b8); H.hemi.color.set(0xc9d8ea); H.hemi.groundColor.set(0x7a6448);
const FOG = { c: new THREE.Color(0xc9c2b4), d: 0.00011 };
scene.fog = new THREE.FogExp2(FOG.c.getHex(), FOG.d);
const skyTex = tex("kit/ph/qwantani_late_afternoon_puresky/sky_4k.jpg", true); skyTex.wrapS = THREE.RepeatWrapping; skyTex.repeat.set(1, 1);
const skyU = { uSky: { value: skyTex }, uSun: { value: SUN }, uWarm: { value: 0.35 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun; uniform float uWarm; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
      vec3 c = texture2D(uSky, uv).rgb; if (d.y < 0.0) c = vec3(0.78, 0.72, 0.62);
      c *= mix(vec3(1.0), vec3(1.12, 0.98, 0.82), uWarm * (1.0 - smoothstep(0.0, 0.5, d.y)));   // desert dust warms the low sky
      c += vec3(1.0, 0.82, 0.55) * pow(max(dot(d, uSun), 0.0), 1400.0) * 4.0;
      gl_FragColor = vec4(c, 1.0); }` }));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// =====================================================================================================================
// BURJ KHALIFA from its plan
// =====================================================================================================================
const TOPC = 585, TIP = 828;                                  // concrete crown, spire tip
const WING = [Math.PI / 2, Math.PI / 2 + TAU / 3, Math.PI / 2 + 2 * TAU / 3]; // the Y (wing 0 points to +z, toward the lake)
const CORE_R = 12.5;                                          // hexagonal core circumradius
// 27 setbacks spiral up: each one shortens the next wing in turn
const SETS = Array.from({ length: 27 }, (_, i) => Math.round(110 + (575 - 110) * Math.pow(i / 26, 0.78)));
const wingLens = (y) => { const L = [62, 62, 62]; SETS.forEach((h, i) => { if (y >= h) L[i % 3] -= 5.4; }); return L.map((l) => Math.max(l, 14)); };
const halfW = (y) => lerp(15.5, 10.5, clamp(y / TOPC));
/** radius of the plan along direction phi: the union of three capsules (wings) and the hexagonal core */
function planR(phi, L, hw) {
  let best = 0;
  for (let k = 0; k < 3; k++) { const d = phi - WING[k], ca = Math.cos(d), sa = Math.sin(d);
    // ray from the centre: inside the slab |perp| < hw along the wing, then the round tip (a slightly pointed petal)
    let r = 0; if (Math.abs(sa) < 1e-6) r = L[k] + hw; else { const tSlab = hw / Math.abs(sa); const along = tSlab * ca; if (ca > 0 && along <= L[k]) r = tSlab;
      else if (ca > 0) { // hits the tip circle centred at L along the wing
        const b = L[k] * ca, c = L[k] * L[k] - (hw * 1.05) ** 2, disc = b * b - c; if (disc >= 0) r = b + Math.sqrt(disc); } }
    best = Math.max(best, r); }
  const hex = CORE_R * Math.cos(Math.PI / 6) / Math.cos(((phi % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6);
  return Math.max(best, hex);
}
const NP = 240;
const ring = (y) => { const L = wingLens(y), hw = halfW(y), pts = []; for (let i = 0; i < NP; i++) { const a = (i / NP) * TAU; const r = planR(a, L, hw); pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; };
const BG = { pos: [], nor: [], uv: [], kind: [] };
function wall(y0, y1, pts) { let u = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const n = V(q[1] - p[1], 0, -(q[0] - p[0])).normalize(); // outward for CCW points in (x, z=sin)
    const A = [p[0], y0, p[1]], B = [q[0], y0, q[1]], C = [p[0], y1, p[1]], D = [q[0], y1, q[1]];
    for (const [v, uu, vv] of [[A, u, y0], [C, u, y1], [B, u + len, y0], [B, u + len, y0], [C, u, y1], [D, u + len, y1]]) { BG.pos.push(...v); BG.nor.push(n.x, n.y, n.z); BG.uv.push(uu, vv); BG.kind.push(0); }
    u += len; } }
function capTop(y, pts) { for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length];
  for (const v of [[0, y, 0], [q[0], y, q[1]], [p[0], y, p[1]]]) { BG.pos.push(...v); BG.nor.push(0, 1, 0); BG.uv.push(v[0], v[2]); BG.kind.push(1); } } }
// podium + the tiers between setbacks, then the circular crown tiers of the core up to 585 m
{ const levels = [0, ...SETS, TOPC - 40];
  for (let i = 0; i < levels.length - 1; i++) { const pts = ring(levels[i] + 0.1); wall(levels[i], levels[i + 1], pts); capTop(levels[i + 1], pts); }
  const crown = [[TOPC - 40, TOPC - 22, 14], [TOPC - 22, TOPC - 8, 11.5], [TOPC - 8, TOPC, 9.5]];
  for (const [y0, y1, r] of crown) { const pts = Array.from({ length: 96 }, (_, i) => { const a = (i / 96) * TAU; return [Math.cos(a) * r, Math.sin(a) * r]; }); wall(y0, y1, pts); capTop(y1, pts); } }
const burjGeo = new THREE.BufferGeometry();
burjGeo.setAttribute("position", new THREE.Float32BufferAttribute(BG.pos, 3)); burjGeo.setAttribute("normal", new THREE.Float32BufferAttribute(BG.nor, 3));
burjGeo.setAttribute("uv", new THREE.Float32BufferAttribute(BG.uv, 2)); burjGeo.setAttribute("aKind", new THREE.Float32BufferAttribute(BG.kind, 1));
// facade: reflective silver-blue glass, stainless vertical fins every 1.5 m, a spandrel at every floor (163 floors in 585 m),
// light stone terraces; sky reflections, sun glints; sway in the vertex shader (cantilever shape); x-ray mode for the core
const BU = { uSky: { value: skyTex }, uSun: { value: SUN }, uSway: { value: new THREE.Vector2() }, uFogC: { value: FOG.c.clone() }, uFogD: { value: FOG.d }, uX: { value: 0 }, uHi: { value: -1 }, uHiK: { value: 0 } };
const BURJ_VS = `attribute float aKind; uniform vec2 uSway; varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vK, vY;
  void main(){ vec3 p = position; float k = pow(max(p.y, 0.0) / ${TIP}.0, 2.0); p.xz += uSway * k; vY = position.y; vUv = uv; vK = aKind;
    vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const burjMat = new THREE.ShaderMaterial({ uniforms: BU, side: THREE.DoubleSide, transparent: true, vertexShader: BURJ_VS,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun, uFogC; uniform float uFogD, uX, uHi, uHiK; varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vK, vY;
    float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 skyAt(vec3 r){ if (r.y < 0.0) return mix(vec3(0.33, 0.3, 0.26), vec3(0.7, 0.66, 0.6), smoothstep(-0.3, 0.0, r.y));
      return texture2D(uSky, vec2(atan(r.z, r.x) / 6.2831853 + 0.5, asin(clamp(r.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb; }
    void main(){
      vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 Vd = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
      float dif = max(dot(N, uSun), 0.0); vec3 col;
      if (vK > 0.5) { col = vec3(0.72, 0.68, 0.6) * (0.35 + 0.8 * dif); }
      else {
        float fh = 3.59, fy = fract(vY / fh), fx = fract(vUv.x / 1.5), fi = floor(vY / fh), ci = floor(vUv.x / 1.5);
        float far = smoothstep(300.0, 1400.0, dist);
        float fin = (step(fx, 0.09) + step(0.91, fx)) * (1.0 - far);
        float spand = smoothstep(0.0, 0.02, fy) * (1.0 - smoothstep(0.2, 0.22, fy)) * (1.0 - far * 0.6);
        vec3 R = reflect(-Vd, N); vec3 env = skyAt(R);
        float F = 0.06 + 0.94 * pow(1.0 - max(dot(N, Vd), 0.0), 5.0);
        float pane = h1(vec2(fi, ci)); vec3 inside = vec3(0.05, 0.06, 0.075) * (0.7 + 0.6 * pane);
        vec3 glass = inside * (0.5 + 0.5 * dif) + env * vec3(0.78, 0.86, 0.95) * mix(0.42, 1.0, F) * (0.9 + 0.15 * pane) + vec3(1.0, 0.85, 0.6) * pow(max(dot(R, uSun), 0.0), 260.0) * 6.0;
        vec3 steel = vec3(0.62, 0.64, 0.66) * (0.3 + 0.9 * dif) + env * 0.35 + vec3(1.0, 0.9, 0.7) * pow(max(dot(R, uSun), 0.0), 60.0) * 1.5;
        col = mix(glass, steel * 0.85, max(fin * 0.85, spand * 0.75));
      }
      // highlighted setback band
      if (uHiK > 0.0) col += vec3(0.24, 1.0, 0.55) * uHiK * (1.0 - smoothstep(0.0, 3.0, abs(vY - uHi)));
      float f = 1.0 - exp(-pow(dist * uFogD, 2.0)); col = mix(col, uFogC, f);
      // x-ray: the skin goes to a faint glassy shell with bright edges
      float edge = pow(1.0 - abs(dot(N, Vd)), 2.0);
      vec3 xr = vec3(0.35, 0.8, 1.0) * (0.05 + 1.1 * edge);
      float a = mix(1.0, 0.08 + 0.55 * edge, uX);
      gl_FragColor = vec4(mix(col, xr, uX), a); }` });
const burj = new THREE.Mesh(burjGeo, burjMat); burj.frustumCulled = false; scene.add(burj);
const burjShadow = new THREE.Mesh(burjGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); burjShadow.castShadow = true; burjShadow.frustumCulled = false; scene.add(burjShadow);
// the spire: a tapering steel tube (over 4,000 t of steel) with rings and a maintenance stair cage, 585 → 828 m
const SWAYERS = []; const sway = (o, y) => { o.userData.sy = y; o.userData.base = o.position.clone(); SWAYERS.push(o); return o; };
{ const prof = [[9.2, 0], [8.6, 6], [7.6, 30], [6.4, 70], [5.0, 120], [3.6, 170], [2.4, 210], [1.4, 236], [0.5, TIP - TOPC]].map(([r, y]) => new THREE.Vector2(r, y));
  const spire = sh(new THREE.Mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshPhysicalMaterial({ color: 0xb9c0c6, metalness: 0.9, roughness: 0.28, clearcoat: 0.4 })));
  spire.position.y = TOPC; scene.add(sway(spire, TOPC + 100));
  for (let y = 20; y < 230; y += 14) { const r = prof.reduce((a, b, i) => (b.y <= y ? b : a)).x; const g = new THREE.Mesh(new THREE.TorusGeometry(r + 0.35, 0.16, 6, 32), metal(0x8a9096, 0.35)); g.rotation.x = Math.PI / 2; g.position.y = TOPC + y; scene.add(sway(g, TOPC + y)); }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), glow(0xff3020, 3)); beacon.position.y = TIP; scene.add(sway(beacon, TIP)); }
// the hexagonal core and the three buttress walls (seen in x-ray), the concrete pump line inside the core
const XR = new THREE.Group(); scene.add(XR); XR.visible = false;
const coreMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.8, emissive: new THREE.Color(0.1, 0.35, 0.55), emissiveIntensity: 0.6 });
const coreMesh = sh(new THREE.Mesh(new THREE.CylinderGeometry(CORE_R, CORE_R, TOPC + 4, 6, 1, true), coreMat)); coreMesh.position.y = (TOPC + 4) / 2 - 4; coreMesh.rotation.y = Math.PI / 6; XR.add(coreMesh);
const butMat = new THREE.MeshStandardMaterial({ color: 0xb7c2cc, roughness: 0.8, emissive: new THREE.Color(0.12, 0.45, 0.3), emissiveIntensity: 0 });
const BUTS = WING.map((a, k) => { const g = new THREE.Group(); g.rotation.y = -a; XR.add(g);
  const segs = []; let y0 = 0; const hs = [...SETS.filter((_, i) => i % 3 === k), TOPC - 40];
  hs.forEach((y1, j) => { const L = wingLens((y0 + y1) / 2)[k]; for (const dz of [-6.5, 6.5]) { const m = new THREE.Mesh(new THREE.BoxGeometry(L, y1 - y0, 0.8), butMat); m.position.set(CORE_R * 0.7 + L / 2, (y0 + y1) / 2, dz); g.add(m); segs.push(m); } y0 = y1; });
  return g; });
const PUMP = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 606, 12), new THREE.MeshStandardMaterial({ color: 0x5b6168, metalness: 0.7, roughness: 0.35 })); PUMP.position.set(3, 303, 3); XR.add(PUMP);
const SLUG_N = 40; const SLUGS = Array.from({ length: SLUG_N }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 7, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.25, 0.55), toneMapped: false })); m.position.set(3, 0, 3); XR.add(m); return m; });
const mark606 = new THREE.Mesh(new THREE.TorusGeometry(16, 0.5, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.0, 0.9), toneMapped: false })); mark606.rotation.x = Math.PI / 2; mark606.position.y = 606; XR.add(mark606);
// foundation: a 3.7 m raft under the Y footprint on 192 piles, 1.5 m wide and 43 m long, more than 50 m down
const FND = new THREE.Group(); scene.add(FND); FND.visible = false;
{ const pts = ring(0.1).map(([x, z]) => new THREE.Vector2(x * 1.12, z * 1.12)); const shp = new THREE.Shape(pts);
  const raftG = new THREE.ExtrudeGeometry(shp, { depth: 3.7, bevelEnabled: false }); raftG.rotateX(Math.PI / 2); // extrude goes down from y = 0
  const raft = sh(new THREE.Mesh(raftG, new THREE.MeshStandardMaterial({ color: 0xa7a59f, roughness: 0.85, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 0.05, 0.05) })));
  raft.position.y = 0; FND.add(raft); FND.userData.raft = raft;
  const pileG = new THREE.CylinderGeometry(0.75, 0.75, 43, 16); pileG.translate(0, -43 / 2 - 3.7, 0);
  const P = []; const inside = (x, z) => Math.hypot(x, z) < planR(Math.atan2(z, x) < 0 ? Math.atan2(z, x) + TAU : Math.atan2(z, x), wingLens(0), halfW(0)) * 1.05;
  for (let gx = -80; gx <= 80 && P.length < 192; gx += 5.2) for (let gz = -80; gz <= 80 && P.length < 192; gz += 5.2) if (inside(gx, gz)) P.push([gx, gz]);
  while (P.length < 192) P.push([(hash(P.length) - 0.5) * 20, (hash(P.length + 7) - 0.5) * 20]);
  const piles = new THREE.InstancedMesh(pileG, new THREE.MeshStandardMaterial({ color: 0xc7c3b8, roughness: 0.7, emissive: new THREE.Color(0.25, 0.2, 0.1), emissiveIntensity: 0.35 }), 192);
  const m4 = new THREE.Matrix4(); P.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); piles.setMatrixAt(i, m4); }); piles.castShadow = true; FND.add(piles); FND.userData.n = P.length;
  // a cut block of the ground: sand, then calcarenite / sandstone layers
  const layers = [[0, -6, 0xc9a879], [-6, -22, 0xb49a74], [-22, -40, 0x9c8a6c], [-40, -70, 0x7f725c]];
  for (const [y0, y1, c] of layers) { const b = new THREE.Mesh(new THREE.BoxGeometry(260, y0 - y1, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, map: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 3, 0.4) })); b.position.set(0, (y0 + y1) / 2, -95); b.receiveShadow = true; FND.add(b); } }

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

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  h828: ["828 m", "#3dff8c", "to the tip of the spire"], wings: ["3 wings", "#ffd166", "in a Y"], wind: ["Wind", "#9fd4ff", "the real enemy"],
  peel: ["Swirls peel off", "#ff8a5c", "left, right, left…"], push: ["Each one pushes", "#ff8a5c", "same rhythm → it rocks"],
  plain: ["Plain tower", "#ff8a5c", "swirls in step"], burjL: ["Burj Khalifa", "#7dffc0", "swirls out of step"],
  core: ["Hexagonal core", "#6fd0ff", "concrete, up the middle"], brace: ["3 wings brace it", "#7dffc0", "like a tripod"],
  rec: ["606 m", "#ffd166", "concrete pumped up"], piles: ["192 piles", "#ffd166", "1.5 m wide, 43 m long"], deep: ["> 50 m deep", "#ffd166", "under the desert"],
  raft: ["Raft", "#cfd6dd", "3.7 m of concrete"], spire: ["Spire", "#cfd6dd", "> 4,000 t of steel"], top: ["The top", "#9fd4ff", "moves ≈ 1.5 m"],
  parts: ["Split into parts", green, "several fly at once"],
});
const FLOWER = `<svg viewBox="-100 -100 200 200" width="760" height="760"><g fill="none" stroke="#ffd166" stroke-width="2.2" opacity=".9">
  ${[0, 120, 240].map((a) => `<path transform="rotate(${a - 90})" d="M0 -8 C 10 -30, 14 -70, 0 -96 C -14 -70, -10 -30, 0 -8 Z"/><path transform="rotate(${a - 30})" d="M0 -10 C 4 -40, 8 -70, 0 -88 C -8 -70, -4 -40, 0 -10 Z" opacity=".55"/>`).join("")}
  <circle r="9"/></g></svg>`;
hudEl("flower", `<div style="width:1080px;display:flex;justify-content:center">${FLOWER}</div>`, { left: "0px", top: "560px" });
hudEl("flowerT", `<div style="width:1080px;text-align:center;font:700 28px M;letter-spacing:.22em;color:#ffd166">HYMENOCALLIS · A DESERT FLOWER</div>`, { left: "0px", top: "1340px" });
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["OPENED", "2010"], ["HEIGHT", "828 m"], ["FLOORS", "163"]].map(([a, b], i) => `<div id="st${i}" style="padding:20px 28px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;font-stretch:112%;color:#fff;margin-top:6px">${b}</div></div>`).join("")}</div>
  <div style="width:1080px;text-align:center;margin-top:20px;font:800 40px D;color:#3dff8c;letter-spacing:.06em">TALLEST BUILDING ON EARTH</div>`, { left: "0px", top: "1420px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 200px/0.85 D;font-stretch:112%;color:#ffd166;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 46px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MOTION EXAGGERATED</div>`, { left: "330px", top: "1110px" });
hudEl("cmp", `<div style="width:1080px;display:flex;justify-content:center;gap:20px">${[["PLAIN TOWER", "#ff8a5c", "ROCKS"], ["BURJ KHALIFA", "#7dffc0", "STAYS CALM"]].map(([a, c, b]) => `<div style="padding:16px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:800 34px D;color:${c}">${a}</div><div style="font:700 22px M;letter-spacing:.18em;color:#cfd6dd;margin-top:6px">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1430px" });
hudEl("setc", `<div style="width:1080px;text-align:center"><span style="display:inline-block;padding:16px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #3dff8c;font:700 26px M;letter-spacing:.2em;color:#9aa6b2">SETBACK <span id="setn" style="font:900 60px D;color:#3dff8c;letter-spacing:0">1</span> / 27</span></div>`, { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["NO APP", "NO LOGIN", "RESUMES"].map((s, i) => `<div id="oc${i}" style="padding:18px 26px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 40px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ffd166") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
function setSway(x, z = 0) { BU.uSway.value.set(x, z); for (const o of SWAYERS) { const k = Math.pow(o.userData.sy / TIP, 2); o.position.set(o.userData.base.x + x * k, o.userData.base.y, o.userData.base.z + z * k); } }
function dayLook() { H.key.intensity = 3.2; H.hemi.intensity = 0.8; H.envK.value = 0.45; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.25; H.rimB.intensity = 0.4; H.key.position.copy(SUN.clone().multiplyScalar(1500)); H.key.target.position.set(0, 0, 0); }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const orb = (a, rad, h, c = V(0, 0, 0)) => V(c.x + Math.sin(a) * rad, c.y + h, c.z + Math.cos(a) * rad);
function lab(t, both) {
  LAB.visible = true; CITY.visible = false; burj.visible = false; burjShadow.visible = false; for (const o of SWAYERS) o.visible = false; sky.visible = false; scene.fog.density = 0.0008; scene.fog.color.set(0x07080a);
  scene.background = new THREE.Color(0x07080a); H.key.intensity = 0.6; H.hemi.intensity = 0.3; H.bloom.strength = 0.5;
  for (const s of [...SMOKE_C, ...SMOKE_B]) s.U.uT.value = t;
  CYLG.position.set(0, 0, both ? -15 : 0); BURG.position.set(0, 0, 15); BURG.visible = both;
  const T = 4.4 / (0.2 * 6.0);                                   // shedding period of the plain cylinder (s)
  return T;
}
const LP = (x, y, z) => LAB.position.clone().add(V(x, y, z));
{
}

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
H.frame("Big files, no weak point", async (t) => {
  dayLook(); camRange(1, 70000); sky.visible = true; CITY.visible = true; burj.visible = true; burjShadow.visible = true; for (const o of SWAYERS) o.visible = true;
  LAB.visible = false; XR.visible = false; FND.visible = false; OR.visible = false; streaks.visible = false; scene.background = null; H.zoom = 1; H.bloom.strength = 0.3;
  BU.uX.value = 0; BU.uHiK.value = 0; setSway(0); burj.material.depthWrite = true; ground.visible = true; cityFloor.visible = true;
  gulf.material.uniforms.time.value = t * 0.6; lake.material.uniforms.time.value = t * 0.4; keyShadow(V(0, 200, 0), 500);
  const swayNow = (amp) => setSway(amp * Math.sin(t * TAU / 9.6));

  if (t < at("tower")) { // HOOK: over the desert toward the tower, then straight down onto its Y plan → a flower
    const cutA = fr("hook", 0.45);
    if (t < cutA) { move(t, 0, cutA, [V(2600, 190, 2400), V(0, 380, 0), 30], [V(2050, 240, 1850), V(0, 400, 0), 28], 0.6); title(t, fr("hook", 0.03), fr("hook", 0.42), "Dubai", "The tallest building", 150); }
    else { camRange(10, 70000); move(t, cutA, at("tower"), [V(0.1, 1500, 0.1), V(0, 0, 0), 14], [V(0.1, 1300, 0.1), V(0, 0, 0), 13], 0.1);
      hudShow("flower", win(t, cutA + 0.5, at("tower"), 0.5, 0.3), { transform: `rotate(${(t - cutA) * 4}deg)` }); hudShow("flowerT", win(t, cutA + 0.6, at("tower"), 0.5, 0.3)); }
  } else if (t < at("enemy")) { // the tower: rise up the facade to the tip; the stats
    const k = prog(t, at("tower"), at("enemy"));
    move(t, at("tower"), at("enemy"), [orb(0.6, 640, 230), V(0, 220, 0), 34], [orb(1.3, 760, 780), V(0, 640, 0), 34], 0.4);
    callout("h828", t, fr("tower", 0.25), at("enemy"), V(0, TIP, 0), 760, 360);
    hudShow("stats", win(t, fr("tower", 0.3), at("enemy"), 0.4, 0.3));
    if (k > 0.7) title(t, fr("tower", 0.7), at("enemy") + 0.1, "Burj Khalifa", "828 m", 150);
  } else if (t < at("vortex")) { // wind at the top: blowing sand streaks past the spire
    keyShadow(V(0, 560, 0), 120);
    move(t, at("enemy"), at("vortex"), [V(140, 560, 190), V(0, 590, 0), 40], [V(110, 600, 150), V(0, 620, 0), 38], 1.2);
    wind(t, 160, 10, true, V(1, 0.02, 0.25)); setSway(0.8 * Math.sin(t * 2.2));
    title(t, fr("enemy", 0.45), at("vortex"), "Its biggest enemy", "Wind", 150); callout("wind", t, fr("enemy", 0.3), at("vortex"), V(40, 600, 20), 300, 1180);
  } else if (t < at("rock")) { // the wind lab: one plain tower, the vortex street from above
    lab(t, false);
    move(t, at("vortex"), at("rock"), [LP(-46, 120, 0), LP(42, 0, 0), 40], [LP(-40, 112, 0), LP(44, 0, 0), 40], 0.2);
    title(t, fr("vortex", 0.05), fr("vortex", 0.45), "Wind tunnel", "Vortex shedding", 150);
    callout("peel", t, fr("vortex", 0.4), at("rock"), LAB.localToWorld(V(8, 22, 3)), 760, 1180);
  } else if (t < at("flower")) { // the pushes keep the rhythm → it rocks (exaggerated)
    const T = lab(t, false); const amp = 0.04 + 0.16 * prog(t, at("rock"), at("flower")); cyl.rotation.x = amp * Math.sin((t - at("rock")) * TAU / T);
    move(t, at("rock"), at("flower"), [LP(70, 22, 4), LP(0, 14, 0), 40], [LP(64, 26, 2), LP(0, 14, 0), 40], 0.3);
    hudShow("exag", win(t, at("rock") + 0.3, at("flower"))); callout("push", t, fr("rock", 0.2), at("flower"), LAB.localToWorld(V(0, 24, 0)), 760, 600);
  } else if (t < at("setbacks")) { // a desert flower: the Y plan from above, three wings
    camRange(10, 70000);
    move(t, at("flower"), at("setbacks"), [V(0.1, 1150, 0.1), V(0, 0, 0), 15], [V(0.1, 1000, 0.1), V(0, 0, 0), 15], 0.1);
    hudShow("flower", win(t, at("flower"), fr("flower", 0.6), 0.4, 0.4), { transform: `rotate(${t * 3}deg)` });
    title(t, fr("flower", 0.0), fr("flower", 0.5), "Shaped like", "A desert flower", 150);
    callout("wings", t, fr("flower", 0.5), at("setbacks"), V(Math.cos(WING[0]) * 60, 110, Math.sin(WING[0]) * 60), 760, 1150);
  } else if (t < at("confuse")) { // 27 setbacks spiral up: highlight each in turn while the camera climbs round
    const k = prog(t, at("setbacks"), at("confuse")); const n = Math.min(26, Math.floor(k * 27)); BU.uHi.value = SETS[n]; BU.uHiK.value = 1;
    H.$("setn").textContent = String(n + 1); hudShow("setc", win(t, at("setbacks") + 0.2, at("confuse")));
    move(t, at("setbacks"), at("confuse"), [orb(2.2, 420, 260), V(0, 200, 0), 38], [orb(4.4, 340, 620), V(0, 520, 0), 38], 0.3);
  } else if (t < at("sway")) { // the same wind on both: the plain one rocks, the Burj barely moves
    const T = lab(t, true); cyl.rotation.x = 0.16 * Math.sin((t - at("confuse")) * TAU / T); mini.rotation.x = 0.012 * Math.sin(t * 3.7) * Math.sin(t * 1.3);
    if (t < fr("confuse", 0.5)) move(t, at("confuse"), fr("confuse", 0.5), [LP(-50, 150, 0), LP(40, 0, 0), 46], [LP(-44, 140, 0), LP(42, 0, 0), 46], 0.2);
    else move(t, fr("confuse", 0.5), at("sway"), [LP(80, 26, 0), LP(0, 14, 0), 44], [LP(74, 28, 0), LP(0, 14, 0), 44], 0.3);
    hudShow("cmp", win(t, at("confuse") + 0.3, at("sway"))); title(t, fr("confuse", 0.62), at("sway"), "Engineers call it", "Confusing the wind", 150);
    callout("plain", t, fr("confuse", 0.1), fr("confuse", 0.5), LAB.localToWorld(V(0, 26, -15)), 300, 1180); callout("burjL", t, fr("confuse", 0.15), fr("confuse", 0.5), LAB.localToWorld(V(0, 24, 15)), 760, 1050);
    if (t > fr("confuse", 0.5)) hudShow("exag", win(t, fr("confuse", 0.5), at("sway")));
  } else if (t < at("core")) { // the real top still moves ≈ 1.5 m (shown ×20)
    swayNow(30); keyShadow(V(0, 500, 0), 260);
    move(t, at("sway"), at("core"), [V(820, 380, 900), V(0, 470, 0), 30], [V(760, 420, 820), V(0, 500, 0), 30], 0.3);
    callout("top", t, fr("sway", 0.15), at("core"), V(BU.uSway.value.x, TIP - 20, 0), 760, 420); hudShow("exag", win(t, at("sway") + 0.2, at("core")));
  } else if (t < at("pump")) { // x-ray: the hexagonal core and the three wings bracing it
    XR.visible = true; for (const o of SWAYERS) o.visible = false; BU.uX.value = smooth(prog(t, at("core"), at("core") + 0.8)); burj.material.depthWrite = false; butMat.emissiveIntensity = 0.6 * smooth(prog(t, fr("core", 0.45), fr("core", 0.6)));
    if (t < fr("core", 0.5)) move(t, at("core"), fr("core", 0.5), [orb(0.9, 620, 330), V(0, 300, 0), 42], [orb(1.3, 560, 360), V(0, 300, 0), 42], 0.3);
    else { camRange(5, 70000); move(t, fr("core", 0.5), at("pump"), [V(0.1, 1250, 0.1), V(0, 200, 0), 12], [V(0.1, 1150, 0.1), V(0, 200, 0), 12], 0.1); }
    callout("core", t, fr("core", 0.12), at("pump"), t < fr("core", 0.5) ? V(0, 300, CORE_R) : V(0, TOPC - 40, 0), 300, 1180); callout("brace", t, fr("core", 0.55), at("pump"), V(Math.cos(WING[1]) * 30, TOPC - 60, -Math.sin(WING[1]) * 30), 760, 1250);
  } else if (t < at("piles")) { // concrete pumped up the core: slugs racing up to 606 m
    XR.visible = true; BU.uX.value = 1; burj.material.depthWrite = false; const k = prog(t, at("pump"), at("piles"));
    SLUGS.forEach((m, i) => { const u = ((i / SLUG_N + (t - at("pump")) * 0.35) % 1); m.position.y = u * 606 * Math.min(1, k * 1.6 + 0.05); m.visible = m.position.y < 606; });
    const yC = lerp(40, 606, ease(prog(t, at("pump"), fr("pump", 0.8))));
    move(t, at("pump"), at("piles"), [orb(0.8, 430, 120), V(0, 100, 0), 40], [orb(1.0, 400, 640), V(0, 580, 0), 40], 0.3);
    setBig(`${Math.round(yC)} m`, "CONCRETE PUMPED UP"); hudShow("big", win(t, at("pump") + 0.2, at("piles"))); callout("rec", t, fr("pump", 0.75), at("piles"), V(16, 606, 0), 300, 1200);
  } else if (t < at("spire")) { // under the desert: the raft and its 192 piles in the layered ground
    FND.visible = true; XR.visible = true; BU.uX.value = 0.85; burj.material.depthWrite = false; ground.visible = false; cityFloor.visible = false; camRange(1, 70000);
    scene.fog.density = 0.004; scene.fog.color.set(0x2a2219); scene.background = new THREE.Color(0x2a2219); sky.visible = false; CITY.visible = false; H.hemi.intensity = 1.4; H.key.intensity = 1.5; keyShadow(V(0, -20, 0), 120);
    move(t, at("piles"), at("spire"), [V(150, 30, 175), V(0, -20, 0), 40], [V(120, -32, 150), V(0, -26, 0), 42], 0.3);
    const n = Math.round(192 * ease(prog(t, at("piles"), fr("piles", 0.5)))); setBig(String(n), "PILES"); hudShow("big", win(t, at("piles") + 0.2, fr("piles", 0.55), 0.3, 0.3));
    callout("piles", t, fr("piles", 0.25), at("spire"), V(30, -30, 20), 760, 1150); callout("deep", t, fr("piles", 0.55), at("spire"), V(-20, -48, 12), 300, 1300); callout("raft", t, fr("piles", 0.7), at("spire"), V(-40, -2, 30), 300, 980);
  } else if (t < at("orbi")) { // the steel spire against the late sun
    keyShadow(V(0, 700, 0), 160); swayNow(4);
    move(t, at("spire"), at("orbi"), [V(70, 640, 110), V(0, 700, 0), 34], [V(55, 700, 80), V(0, 760, 0), 32], 0.5);
    callout("spire", t, fr("spire", 0.15), at("orbi"), V(BU.uSway.value.x * 0.6, 700, 0), 300, 1180); callout("h828", t, fr("spire", 0.45), at("orbi"), V(BU.uSway.value.x, TIP, 0), 760, 300);
  } else { // ORBI: a hotel window over Dubai; the big file goes in parts, pauses with the signal, resumes
    OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); H.envK.value = 0.6; orbiL.intensity = 4;
    const L = OR.position; OR.updateMatrixWorld(); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const up = t < at("orbi2") ? 0 : t < fr("orbi3", 0.15) ? 0.62 * prog(t, at("orbi2"), fr("orbi3", 0.15)) : t < fr("orbi3", 0.55) ? 0.62 : lerp(0.62, 1, prog(t, fr("orbi3", 0.55), at("end")));
    const pause = t > fr("orbi3", 0.15) && t < fr("orbi3", 0.55);
    screen(lap, { up: t > at("orbi2") - 0.2 ? Math.round(up * 200) / 200 : -1, pause }, drawLap);
    screen(ph, { land: clamp(up * 1.2), wifi: t > fr("orbi3", 0.15) && t < fr("orbi3", 0.75) ? (pause ? "off" : "on") : "" }, drawPhone);
    const a0 = lap.g.position.clone().add(V(0.2, 1.0, 0.2)), b0 = ph.g.position.clone().add(V(0, 0.2, 0));
    PARTS.forEach((m, i) => { const st = at("orbi2") + Math.floor(i / 3) * 0.9 + (i % 3) * 0.12; const k = pause && i >= 6 ? 0 : clamp((t - st) / 0.8); m.visible = t > at("orbi2") && k > 0 && k < 1 && !(pause && i >= 6);
      m.position.copy(a0).lerp(b0, ease(k)).add(V(0, Math.sin(k * Math.PI) * 0.8, (i % 3 - 1) * 0.25)); m.rotation.set(k * 3, k * 2, 0); });
    lock.position.copy(lap.g.position).add(V(-0.2, 2.4, 0.3)); lock.visible = t < at("orbi2"); lock.rotation.y = t;
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.4, 2.0, 9), OW(0.4, 1.2, 0), 36], [OW(0.3, 1.8, 7.2), OW(0.4, 1.0, 0), 36], 0.3);
    else if (t < at("orbi3")) { move(t, at("orbi2"), at("orbi3"), [OW(-0.6, 3.2, 4.8), OW(0.4, 0.6, 0.3), 34], [OW(-0.2, 3.0, 4.4), OW(0.6, 0.6, 0.4), 34], 0.2);
      callout("parts", t, fr("orbi2", 0.2), at("orbi3"), OR.localToWorld(PARTS[1].position.clone()), 760, 560); }
    else { move(t, at("orbi3"), at("end"), [OW(2.0, 1.6, 3.4), OW(2.0, 0.3, 0.5), 34], [OW(1.8, 1.5, 3.0), OW(2.0, 0.3, 0.5), 34], 0.2);
      hudShow("chips", win(t, fr("orbi3", 0.6), at("end"))); }
  }
});
await H.ready();
