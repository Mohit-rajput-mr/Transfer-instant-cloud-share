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
