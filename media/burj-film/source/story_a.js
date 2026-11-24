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
const FOG = { c: new THREE.Color(0xc8c0b0), d: 0.00007 };
scene.fog = new THREE.FogExp2(FOG.c.getHex(), FOG.d);
const skyTex = tex("kit/ph/qwantani_late_afternoon_puresky/sky_4k.jpg", true); skyTex.wrapS = THREE.RepeatWrapping; skyTex.repeat.set(1, 1);
const skyU = { uSky: { value: skyTex }, uSun: { value: SUN }, uWarm: { value: 0.12 }, uT: { value: 0 }, uDim: { value: 1 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun; uniform float uWarm, uT, uDim; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
    void main(){ vec3 d = normalize(vD); vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
      vec3 c = texture2D(uSky, uv).rgb; { float l = dot(c, vec3(0.3, 0.59, 0.11)); c = pow(max(mix(vec3(l), c, 1.35), 0.0), vec3(1.25)) * 1.1; } if (d.y < 0.0) c = vec3(0.78, 0.72, 0.62);
      if (d.y > 0.0) { vec2 q = d.xz / (d.y + 0.1) * 1.3 + vec2(uT * 0.006, uT * 0.002); float w = fbm(q * 0.8); float cl = fbm(q + w * 1.3);
        float cov = smoothstep(0.62, 0.84, cl) * smoothstep(0.02, 0.22, d.y); float sh = smoothstep(0.55, 0.85, fbm(q + w * 1.3 + uSun.xz * 0.08));
        float sd = max(dot(d, uSun), 0.0); vec3 cc = mix(vec3(1.0, 0.9, 0.76), vec3(0.74, 0.7, 0.68), sh * 0.6) * (0.9 + 0.4 * pow(sd, 6.0)); c = mix(c, cc, cov * 0.75); }
      c *= mix(vec3(1.0), vec3(1.12, 0.98, 0.82), uWarm * (1.0 - smoothstep(0.0, 0.5, d.y)));   // desert dust warms the low sky
      c += vec3(1.0, 0.82, 0.55) * pow(max(dot(d, uSun), 0.0), 1400.0) * 4.0;
      c = mix(c * vec3(0.18, 0.24, 0.36), c, uDim);
      gl_FragColor = vec4(c, 1.0); }` }));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// =====================================================================================================================
// BURJ KHALIFA — built from its plan as the photos show it: three wings in a Y round a hexagonal core, each wing a chain of
// rounded glass "tubes" (convex bays with V-notches between them, smaller towards the rounded tip). The 27 setbacks take
// the outermost tube of one wing at a time, wing after wing, so the tower spirals in as it climbs; the last tubes and the
// core carry the crown to 585 m, then the steel spire to 828 m.
// =====================================================================================================================
const TOPC = 585, TIP = 828;                                  // top of the occupied tower, spire tip
const WING = [Math.PI / 2, Math.PI / 2 + TAU / 3, Math.PI / 2 + 2 * TAU / 3]; // the Y (wing 0 points to +z, toward the lake)
const CORE_R = 12.5;                                          // hexagonal core circumradius
// 27 setbacks (110 m → 575 m), closer together higher up; wing 0, 1, 2, 0, 1, 2 … (the spiral)
const SETS = Array.from({ length: 27 }, (_, i) => Math.round(78 + (598 - 78) * Math.pow(i / 26, 0.8)));
const BODY_TOP = 652;                                         // the last tiers (trefoil, then the core) carry on above the top floor to here
// each wing, as the photos show it: a rounded tip, then convex glass bays down both sides, one bay per 5.15 m, each bay
// about 1 m wider than the one outside it (V-notches between them). A setback removes the tip bay: the tip moves in and
// the wing gets a little slimmer, so the floor plate shrinks as it spirals up.
const NT = 10, RS = 4.0, BAY = 5.15;
const TIP_N = [64, 56, 48.6, 43.5, 38.5, 36.5, 33.5, 25.5, 23.5, 22];   // wing tip distance after n setbacks (fitted to photos)
const wingTip = (n) => TIP_N[Math.min(n, 9)], wingTipW = (n) => 9.2 - n * 0.32;
const tubesLeft = (y, k) => { let n = 0; SETS.forEach((h, i) => { if (i % 3 === k && y >= h) n++; }); return n; };   // removed so far
const wingLens = (y) => [0, 1, 2].map((k) => wingTip(Math.min(NT - 1, tubesLeft(y, k))));
const halfW = (y) => wingTipW(Math.min(NT - 1, Math.round((tubesLeft(y, 0) + tubesLeft(y, 1) + tubesLeft(y, 2)) / 3))) + 4;
const TUBES = Array.from({ length: NT }, (_, n) => ({ tip: wingTip(n), w: wingTipW(n) }));
const hexR = (phi) => CORE_R * Math.cos(Math.PI / 6) / Math.cos(((phi % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6);
// far intersection of a ray from the origin (ux, uz) with a circle (cx, cz, r) / an oriented box (centre, axis a, half-sizes)
const rayCircle = (ux, uz, cx, cz, r) => { const b = ux * cx + uz * cz, disc = b * b - (cx * cx + cz * cz - r * r); return disc >= 0 ? b + Math.sqrt(disc) : 0; };
const rayBox = (ux, uz, cx, cz, ax, az, hl, hw) => { // local frame: along a, across n
  const nx = -az, nz = ax; const du = ux * ax + uz * az, dv = ux * nx + uz * nz, ou = -(cx * ax + cz * az), ov = -(cx * nx + cz * nz);
  let t0 = -1e9, t1 = 1e9; for (const [o, d, h] of [[ou, du, hl], [ov, dv, hw]]) { if (Math.abs(d) < 1e-9) { if (Math.abs(o) > h) return 0; continue; } let a1 = (-h - o) / d, a2 = (h - o) / d; if (a1 > a2) [a1, a2] = [a2, a1]; t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); }
  return t1 >= Math.max(t0, 0) ? t1 : 0; };
/** plan radius along direction phi, for wing tip distances L (array): far edge of the union of the wings and the core */
function planR(phi, L) { const ux = Math.cos(phi), uz = Math.sin(phi); let best = hexR(phi);
  for (let k = 0; k < 3; k++) { const ax = Math.cos(WING[k]), az = Math.sin(WING[k]), nx = -az, nz = ax; let n = 0; while (n < NT - 1 && wingTip(n) > L[k] + 0.01) n++;
    const tip = wingTip(n), tw = wingTipW(n);
    best = Math.max(best, rayCircle(ux, uz, ax * (tip - tw), az * (tip - tw), tw));                                // the rounded tip
    for (let b = 0; ; b++) { const x = tip - tw - BAY * (b + 0.5); if (x < 2) break; const W = tw + 1.0 * (b + 1), off = W - RS;   // side bays
      for (const s of [-1, 1]) best = Math.max(best, rayCircle(ux, uz, ax * x + nx * s * off, az * x + nz * s * off, RS));
      best = Math.max(best, rayBox(ux, uz, ax * (x / 2 + BAY / 4), az * (x / 2 + BAY / 4), ax, az, x / 2 + BAY / 4, off)); }
    best = Math.max(best, rayBox(ux, uz, ax * (tip - tw) / 2, az * (tip - tw) / 2, ax, az, (tip - tw) / 2, tw * 0.98)); }   // filler under the tip
  return best; }
const NP = 900;
const ring = (y) => { const L = wingLens(y), pts = []; for (let i = 0; i < NP; i++) { const a = (i / NP) * TAU; const r = planR(a, L); pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; };
// THE TOWER: "Burj Khalifa" by Thomas Lagler / MiniWorld3D (Printables #1659229), public domain — a real, person-made model
// (media/MODEL_SOURCING_RULES.md), converted by landmark_prep.py to metres (base y = 0, spire tip 828 m) in
// media/kit/models/burj/. Turned so wing 0 points to +z like the scene's plan (its wings were at −10°, 120°, −130°).
// The plan functions above (ring, planR, wingLens) remain only for the x-ray core/buttress diagram and the foundation raft.
const BURJ_ROT = THREE.MathUtils.degToRad(-100);
const burjGeo = new THREE.BufferGeometry();
{ const [PB, NB, IB] = await Promise.all(["pos", "nor", "idx"].map((n) => fetch(`kit/models/burj/${n}.bin`).then((r) => r.arrayBuffer())));
  const p = new Float32Array(PB), n8 = new Int8Array(NB), nv = p.length / 3, cb = Math.cos(BURJ_ROT), sb = Math.sin(BURJ_ROT);
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), kind = new Float32Array(nv), end = new Float32Array(nv);
  for (let i = 0; i < nv; i++) { const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]; const X = x * cb + z * sb, Z = -x * sb + z * cb; pos.set([X, y, Z], i * 3);
    const nx = n8[i * 4] / 127, ny = n8[i * 4 + 1] / 127, nz = n8[i * 4 + 2] / 127; const NX = nx * cb + nz * sb, NZ = -nx * sb + nz * cb; nor.set([NX, ny, NZ], i * 3);
    const hl = Math.hypot(NX, NZ); kind[i] = ny > 0.6 ? 1 : 0;                       // up-facing: terraces / roofs
    uv[i * 2] = Math.atan2(Z, X) * Math.max(8, Math.hypot(X, Z)); uv[i * 2 + 1] = y; }   // round the tower (mullions every ≈1.5 m, always vertical)
  burjGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); burjGeo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); burjGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  burjGeo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1)); burjGeo.setAttribute("aEnd", new THREE.BufferAttribute(end, 1)); burjGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(IB), 1)); burjGeo.computeBoundingSphere(); }
// facade (from the photos): blue-grey reflective glass, a pale silver spandrel band at every floor (163 floors in 585 m),
// stainless mullions/fins every 1.5 m catching the sun, bronze-silver louvre bands at the mechanical floors and at the top
// of every tube where it ends; sky reflections and sun glints; sway in the vertex shader; x-ray mode for the core
const MECH = [64, 150, 270, 400, 495, 560];
const BU = { uSky: { value: skyTex }, uSun: { value: SUN }, uSway: { value: new THREE.Vector2() }, uFogC: { value: FOG.c.clone() }, uFogD: { value: FOG.d }, uX: { value: 0 }, uHi: { value: -1 }, uHiK: { value: 0 } };
const BURJ_VS = `attribute float aKind, aEnd; uniform vec2 uSway; varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vK, vY, vE;
  void main(){ vec3 p = position; float k = pow(max(p.y, 0.0) / ${TIP}.0, 2.0); p.xz += uSway * k; vY = position.y; vUv = uv; vK = aKind; vE = aEnd;
    vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const burjMat = new THREE.ShaderMaterial({ uniforms: BU, side: THREE.DoubleSide, transparent: true, vertexShader: BURJ_VS,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun, uFogC; uniform float uFogD, uX, uHi, uHiK; varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vK, vY, vE;
    float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 skyAt(vec3 r){ if (r.y < 0.0) return mix(vec3(0.36, 0.33, 0.28), vec3(0.72, 0.67, 0.6), smoothstep(-0.3, 0.0, r.y));
      vec3 c = texture2D(uSky, vec2(atan(r.z, r.x) / 6.2831853 + 0.5, asin(clamp(r.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb;
      float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(vec3(l), c, 1.35); return pow(max(c, 0.0), vec3(1.25)) * 1.1; }
    float mechBand(float y){ float m = 0.0; ${MECH.map((y) => `m = max(m, step(${y.toFixed(1)}, y) * step(y, ${(y + 7.2).toFixed(1)}));`).join(" ")} return m; }
    void main(){
      vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N; vec3 Vd = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
      float dif = max(dot(N, uSun), 0.0); vec3 col;
      float px = dist * 0.0004;                                    // ~ size of a pixel in metres (fov ≈ 40°, 1920 px), to fade details smoothly
      if (vK > 0.5) { col = vec3(0.7, 0.68, 0.64) * (0.3 + 0.8 * dif); }
      else {
        float fh = 3.59, fy = fract(vY / fh), fi = floor(vY / fh), fx = fract(vUv.x / 1.5), ci = floor(vUv.x / 1.5);
        float dF = smoothstep(0.35, 1.2, px);                    // far fade (stripes are filtered below)
        vec3 R = reflect(-Vd, N); vec3 env = skyAt(R); float cosv = max(dot(N, Vd), 0.0);
        // reflective low-e glass: dark blue-grey, mirror of the sky at grazing angles
        float F = 0.1 + 0.9 * pow(1.0 - cosv, 5.0);
        float pane = h1(vec2(fi, ci)); vec3 inside = vec3(0.018, 0.026, 0.04) * (0.88 + 0.24 * pane);
        vec3 glass = inside + env * vec3(0.5, 0.62, 0.8) * F * (0.97 + 0.06 * pane) + vec3(1.0, 0.86, 0.62) * pow(max(dot(R, uSun), 0.0), 400.0) * 9.0 * (0.6 + 0.4 * pane);
        // the pale silver band at every floor (spandrel + slab edge) and the stainless fins on every mullion
        // anti-aliased stripes: fade each pattern to its average as soon as it gets close to a pixel
        float wY = fwidth(vY / fh), wX = fwidth(vUv.x / 1.5);
        float spand = smoothstep(0.0, 0.01 + wY, fy) * (1.0 - smoothstep(0.17, 0.185 + wY, fy)); spand = mix(spand, 0.18, smoothstep(0.15, 0.6, wY));
        float fin = 1.0 - smoothstep(0.018, 0.034 + wX, min(fx, 1.0 - fx)); fin = mix(fin, 0.05, smoothstep(0.08, 0.35, wX));
        float finSide = fx < 0.5 ? 1.0 : -1.0; vec3 T = normalize(vec3(-N.z, 0.0, N.x)); vec3 Nf = normalize(N + T * finSide * 1.2);
        vec3 Rf = reflect(-Vd, Nf); float difF = max(dot(Nf, uSun), 0.0);
        vec3 steel = vec3(0.8, 0.82, 0.85) * (0.18 + 1.0 * difF) + skyAt(Rf) * 0.55 + vec3(1.0, 0.9, 0.72) * pow(max(dot(Rf, uSun), 0.0), 30.0) * 3.0;
        vec3 silver = vec3(0.5, 0.52, 0.55) * (0.16 + 0.55 * dif) + env * 0.28 + vec3(1.0, 0.9, 0.75) * pow(max(dot(R, uSun), 0.0), 24.0) * 1.6;
        col = mix(glass, silver, spand);
        col = mix(col, steel, fin * 0.45);
        // far away the stripes average out: silver bands + fins over the dark glass, still mirror-like
        vec3 farC = glass * 0.7 + silver * 0.24 + steel * 0.06; col = mix(col, farC, dF * 0.9);
        // louvre bands: the mechanical floors, and the top two floors of each tube where it stops
        float lv = max(mechBand(vY), vE);
        if (lv > 0.5) { float s = fract(vY / 0.45); float slat = smoothstep(0.0, 0.12, s) * (1.0 - smoothstep(0.5, 0.65, s)); slat = mix(slat, 0.55, smoothstep(0.2, 0.6, fwidth(vY / 0.45)));
          vec3 bronze = vec3(0.4, 0.36, 0.3) * (0.16 + 0.7 * dif) + env * 0.18 + vec3(1.0, 0.85, 0.6) * pow(max(dot(R, uSun), 0.0), 16.0) * 1.0;
          col = mix(bronze * 0.25, bronze, slat); }
      }
      // highlighted setback band
      if (uHiK > 0.0) col += vec3(0.24, 1.0, 0.55) * uHiK * (1.0 - smoothstep(0.0, 3.0, abs(vY - uHi)));
      float f = 1.0 - exp(-pow(dist * uFogD, 2.0)); col = mix(col, uFogC, f);
      float edge = pow(1.0 - abs(dot(N, Vd)), 2.0);
      vec3 xr = vec3(0.35, 0.8, 1.0) * (0.05 + 1.1 * edge);
      float a = mix(1.0, 0.08 + 0.55 * edge, uX);
      gl_FragColor = vec4(mix(col, xr, uX), a); }` });
const burj = new THREE.Mesh(burjGeo, burjMat); burj.frustumCulled = false; scene.add(burj);
const burjShadow = new THREE.Mesh(burjGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); burjShadow.castShadow = true; burjShadow.frustumCulled = false; scene.add(burjShadow);
// the spire is part of the model; nothing else sways separately
const SWAYERS = []; const sway = (o, y) => { o.userData.sy = y; o.userData.base = o.position.clone(); SWAYERS.push(o); return o; };
// the hexagonal core and the three buttress walls (seen in x-ray), the concrete pump line inside the core
const XR = new THREE.Group(); scene.add(XR); XR.visible = false;
const coreMat = new THREE.MeshStandardMaterial({ color: 0x3a4652, roughness: 0.7, emissive: new THREE.Color(0.15, 0.55, 0.9), emissiveIntensity: 0.9 });
const coreMesh = sh(new THREE.Mesh(new THREE.CylinderGeometry(CORE_R, CORE_R, TOPC + 4, 6, 1, true), coreMat)); coreMesh.position.y = (TOPC + 4) / 2 - 4; coreMesh.rotation.y = Math.PI / 6; XR.add(coreMesh);
const butMat = new THREE.MeshStandardMaterial({ color: 0x2c3a44, roughness: 0.7, emissive: new THREE.Color(0.2, 0.9, 0.5), emissiveIntensity: 0, transparent: true, opacity: 0.9 });
const BUTS = WING.map((a, k) => { const g = new THREE.Group(); g.rotation.y = -a; XR.add(g);
  const segs = []; let y0 = 0; const hs = [...SETS.filter((_, i) => i % 3 === k), TOPC - 40];
  hs.forEach((y1, j) => { const L = wingLens((y0 + y1) / 2)[k]; for (const dz of [-6.5, 6.5]) { const m = new THREE.Mesh(new THREE.BoxGeometry(L - CORE_R * 0.7 - 6, y1 - y0, 0.6), butMat); m.position.set(CORE_R * 0.7 + (L - CORE_R * 0.7 - 6) / 2, (y0 + y1) / 2, dz); g.add(m); segs.push(m); } y0 = y1; });
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
