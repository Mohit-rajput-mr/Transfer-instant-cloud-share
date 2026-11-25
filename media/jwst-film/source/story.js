// Webb: the folded telescope. James Webb Space Telescope, NASA's own 3D model (NASA 3D Resources, "free and without copyright").
// Facts (Wikipedia: James Webb Space Telescope): largest telescope in space; 6.5 m primary mirror of 18 hexagonal gold-plated
// beryllium segments (gold for infrared reflectivity); observes infrared, aims at the first galaxies; must stay below 50 K
// (−223 °C); sunshield of five layers of Kapton E, each ~0.1 mm, folded twelve times to fit the Ariane 5 fairing; launched
// 25 December 2021 on an Ariane 5 from Kourou; 344 single-point failures in launch and deployment; works near Sun–Earth L2,
// ~1.5 million km from Earth; not serviceable by a crewed mission; segments aligned to within 50 nm.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "./kit/lib/jsm/loaders/DRACOLoader.js";
import { makePhone, makeLaptop, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }
const NOISE = `
float hh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float nz(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hh(i), hh(i + vec3(1,0,0)), f.x), mix(hh(i + vec3(0,1,0)), hh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hh(i + vec3(0,0,1)), hh(i + vec3(1,0,1)), f.x), mix(hh(i + vec3(0,1,1)), hh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * nz(p); p = p * 2.03 + 3.1; a *= 0.5; } return s; }`;


// =====================================================================================================================
// SPACE near L2: stars, the Sun far behind the shield, a tiny Earth and Moon (for the distance shot)
// =====================================================================================================================
const SKYG = new THREE.Group(); scene.add(SKYG);
const SUN = V(-0.9, -0.42, 0.12).normalize();          // the Sun is always on the shield's side (below / -x)
{ const N = 7000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(3);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 9000, u * 9000, Math.sin(a) * r * 9000], i * 3);
    const b = Math.pow(H.rnd(), 6) * 1.8 + 0.1, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.92, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st;
  // a faint band of distant galaxies (the targets): small smudges
  const gal = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vU; void main(){ float r = length(vU * vec2(1.0, 2.2)); float a = exp(-r * 9.0); gl_FragColor = vec4(vec3(1.0, 0.75, 0.55) * a * 0.9, 1.0); }` }), 160);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < 160; i++) { const d = V(1, (H.rnd() - 0.5) * 0.9, (H.rnd() - 0.5) * 0.9).normalize(); q.setFromUnitVectors(V(0, 0, 1), d.clone().negate()); q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), H.rnd() * 3)); const s = 25 + H.rnd() * 60; m4.compose(d.multiplyScalar(8500), q, V(s, s, s)); gal.setMatrixAt(i, m4); }
  gal.renderOrder = -8; gal.frustumCulled = false; SKYG.add(gal); SKYG.userData.gal = gal; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 22.0) * 7.0 + exp(-r * 5.0) * 0.6 + exp(-r * 1.6) * 0.1; gl_FragColor = vec4(vec3(1.0, 0.94, 0.84) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
const EARTHM = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.MeshStandardMaterial({ map: tex("kit/models/planets/earth_atmos_2048.jpg", true), roughness: 0.9 })); SKYG.add(EARTHM); EARTHM.visible = false;
const MOONM = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshStandardMaterial({ map: tex("kit/models/planets/moon_1024.jpg", true), roughness: 1 })); SKYG.add(MOONM); MOONM.visible = false;
function skyAt() { const p = H.cam.position; SKYG.userData.stars.position.copy(p); SKYG.userData.gal.position.copy(p); sunGlow.position.copy(p).addScaledVector(SUN, 8000); sunGlow.scale.setScalar(700); sunGlow.lookAt(p); }

// =====================================================================================================================
// WEBB: NASA's model, with real-looking finishes; batwings (mirror wings) and the sunshield can fold for the deployment
// =====================================================================================================================
const W = new THREE.Group(); scene.add(W);
const dl = new DRACOLoader(); dl.setDecoderPath("kit/lib/jsm/libs/draco/gltf/"); const gld = new GLTFLoader(); gld.setDRACOLoader(dl);
const gw = await gld.loadAsync("kit/models/jwst/jwst-nasa-A.glb"); W.add(gw.scene); gw.scene.updateMatrixWorld(true);
const node = (n) => { let r = null; gw.scene.traverse((o) => { if (!r && o.name === "James_Webb_Space_Telescope" + n) r = o; }); return r; };
const BAT = [node("batwing1"), node("batwing2")], SHIELD = node("shield"), BOOMS = node("mid_booms");
const WU = { uT: { value: 0 }, uHeat: { value: 0 }, uCold: { value: 0 }, uAlign: { value: 0 } };
const fin = (m) => { const n = m.name.replace("James_Webb_Space_Telescope:", "");
  if (/mirror_blinn/.test(n)) { const g = new THREE.MeshPhysicalMaterial({ color: 0xd99a32, metalness: 1, roughness: 0.2, clearcoat: 0.3, clearcoatRoughness: 0.1, envMapIntensity: 0.6 }); g.userData.mirror = true; return g; }
  if (/omnimirror/.test(n)) return new THREE.MeshPhysicalMaterial({ color: 0xffd27a, metalness: 1, roughness: 0.15 });
  if (/pink/.test(n)) return new THREE.MeshPhysicalMaterial({ color: 0xc98fb0, metalness: 0.75, roughness: 0.32, sheen: 0.4, sheenColor: new THREE.Color(0xff9fd0) });   // Kapton-faced MLI
  if (/silver/.test(n)) return new THREE.MeshPhysicalMaterial({ color: 0xd9dbe0, metalness: 0.95, roughness: 0.28 });
  if (/blk|black/.test(n)) return new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7 });
  if (/gold/.test(n)) return new THREE.MeshPhysicalMaterial({ color: 0xe5b35a, metalness: 1, roughness: 0.3 });
  if (/alum|alu/.test(n)) return new THREE.MeshPhysicalMaterial({ color: 0xb9bdc3, metalness: 1, roughness: 0.35 });
  if (/carbon|graphite/.test(n)) return new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.45, metalness: 0.3 });
  return null; };
const cache = new Map();
gw.scene.traverse((o) => { if (!o.isMesh) return; const k = o.material.name; if (!cache.has(k)) cache.set(k, fin(o.material) || o.material); o.material = cache.get(k); o.material.side = THREE.DoubleSide; o.castShadow = o.receiveShadow = true; });
// the sunshield: hot (sun) side tint below, cold side above (shader overlay driven by uHeat / uCold)
SHIELD.traverse((o) => { if (!o.isMesh || o.material.userData.sh) return; const m = o.material.clone(); m.userData.sh = true; o.material = m;
  m.onBeforeCompile = (s) => { Object.assign(s.uniforms, WU); s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWN2;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vWN2 = normalize(mat3(modelMatrix) * objectNormal);");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uHeat, uCold, uT; varying vec3 vWN2;").replace("#include <opaque_fragment>", `{ float dn = -normalize(vWN2).y; float hotSide = smoothstep(-0.2, 0.6, dn);
        outgoingLight = mix(outgoingLight, vec3(1.0, 0.35, 0.08) * (0.8 + 0.2 * sin(uT * 3.0)), hotSide * uHeat * 0.55); outgoingLight = mix(outgoingLight, vec3(0.25, 0.5, 1.2), (1.0 - hotSide) * uCold * 0.45); }
      #include <opaque_fragment>`); }; m.customProgramCacheKey = () => "shield"; });
// rest poses (for folding)
const REST = new Map(); [...BAT, SHIELD, BOOMS].forEach((n) => REST.set(n, { p: n.position.clone(), q: n.quaternion.clone(), s: n.scale.clone() }));
const BAT_HINGE = [V(1.0, 6.3, 1.68), V(1.0, 6.3, -1.68)];
/** deploy k: shield (0..1), booms (0..1), wings (0..1). Folded: shield collapsed into its pallets, wings swung back. */
function deploy(ks, kb, kw) {
  for (const n of [SHIELD, BOOMS]) { const r = REST.get(n); n.position.copy(r.p); n.quaternion.copy(r.q); n.scale.copy(r.s); }
  // shield along x first (pallets drop + tower), then sideways with the mid booms; flattened when stowed
  const sx = lerp(0.1, 1, ease(clamp(ks))), sz = lerp(0.16, 1, ease(clamp(kb))), sy = lerp(0.35, 1, ease(clamp(ks)));
  SHIELD.scale.multiply(V(sx, sy, sz)); BOOMS.scale.multiply(V(1, 1, sz));
  BAT.forEach((b, i) => { const r = REST.get(b); b.position.copy(r.p); b.quaternion.copy(r.q); const a = (1 - ease(clamp(kw))) * (i ? -1 : 1) * 1.9;
    // rotate about a vertical hinge at the wing's inner edge (in W space, the model has no node transform on these)
    const piv = BAT_HINGE[i]; const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a); b.position.sub(piv).applyQuaternion(q).add(piv); b.quaternion.premultiply(q); });
  gw.scene.updateMatrixWorld(true);
}
const WL = (x, y, z) => W.localToWorld(V(x, y, z));
const MIRROR_C = V(1.0, 6.3, 0);
// light rays: from far galaxies → primary → secondary (at ~ x 7.9, y 6.3?) → back into the instruments behind the primary
const RAYS = new THREE.Group(); W.add(RAYS); RAYS.visible = false; const RU = { uT: { value: 0 }, uK: { value: 0 } };
{ const SEC = V(7.6, 6.6, 0), INS = V(-0.6, 5.0, 0);
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, r = 2.0 + (i % 3) * 0.5; const hit = V(1.05, 6.3 + Math.sin(a) * r * 0.9, Math.cos(a) * r);
    const pts = [hit.clone().add(V(40, 0, 0)), hit, SEC, INS]; const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.01);
    const tg = new THREE.TubeGeometry(curve, 160, 0.02, 6, false);
    const m = new THREE.Mesh(tg, new THREE.ShaderMaterial({ uniforms: RU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uT, uK; varying vec2 vU; void main(){ float p = fract(vU.x * 5.0 - uT * 0.9); float pulse = smoothstep(0.0, 0.15, p) * smoothstep(0.35, 0.15, p); float show = step(vU.x, uK * 1.05);
        gl_FragColor = vec4(mix(vec3(1.0, 0.35, 0.2), vec3(1.0, 0.75, 0.45), vU.x) * (0.25 + 1.4 * pulse) * show, 1.0); }` }));
    RAYS.add(m); } }
// the rocket fairing as a ghost outline (a generic cylinder diagram; no rocket is built)
const FAIR = new THREE.Group(); W.add(FAIR); FAIR.visible = false;
{ const R = 2.285, Hh = 12;                                                        // ~4.57 m inside diameter
  const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Hh, 64, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vW; void main(){ float e = pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 2.5); gl_FragColor = vec4(vec3(0.4, 0.8, 1.4) * e * 0.9, 1.0); }` }));
  FAIR.add(m); const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 24, 0, TAU, 0, Math.PI / 2), m.material); cap.scale.y = 1.6; cap.position.y = Hh / 2; FAIR.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 8, 96), glow(0x6fd0ff, 1.4)); ring.rotation.x = Math.PI / 2; ring.position.y = -Hh / 2; FAIR.add(ring); }
// alignment: thin glowing outlines on each mirror segment, locking in one by one
const SEGS = []; gw.scene.traverse((o) => { if (o.isMesh && o.material.userData.mirror) SEGS.push(o); });

// =====================================================================================================================
// NEARBY (Orbi): a dark map from above, the area cell, phones as pins; a share lights up the phones in the area
// =====================================================================================================================
const MAP = new THREE.Group(); scene.add(MAP); MAP.position.set(0, 0, 9000);
const MU = { uT: { value: 0 }, uR: { value: 0 }, uC: { value: V() } };
{ const c = document.createElement("canvas"); c.width = c.height = 2048; const g = c.getContext("2d"); g.fillStyle = "#0b0e12"; g.fillRect(0, 0, 2048, 2048); H.reseed(51);
  for (let i = 0; i < 2600; i++) { const x = H.rnd() * 2048, y = H.rnd() * 2048, w = 6 + H.rnd() * 26, h = 6 + H.rnd() * 26; g.fillStyle = `rgba(${40 + H.rnd() * 20},${46 + H.rnd() * 20},${56 + H.rnd() * 20},1)`; g.fillRect(x, y, w, h); }
  g.strokeStyle = "rgba(120,140,160,.35)"; for (let i = 0; i < 60; i++) { g.lineWidth = H.rnd() < 0.15 ? 6 : 2; g.beginPath(); const v = H.rnd() < 0.5; const p = H.rnd() * 2048; if (v) { g.moveTo(p, 0); g.bezierCurveTo(p + 200, 700, p - 200, 1400, p + 60, 2048); } else { g.moveTo(0, p); g.bezierCurveTo(700, p - 160, 1400, p + 160, 2048, p - 40); } g.stroke(); }
  g.fillStyle = "rgba(40,80,120,.55)"; g.beginPath(); g.ellipse(1650, 300, 520, 260, 0.5, 0, TAU); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ map: t })); fl.rotation.x = -Math.PI / 2; MAP.add(fl);
  const cell = new THREE.Mesh(new THREE.PlaneGeometry(60, 31), new THREE.ShaderMaterial({ uniforms: MU, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT; varying vec2 vU; void main(){ vec2 d = min(vU, 1.0 - vU); float edge = smoothstep(0.012, 0.0, min(d.x * 1.0, d.y * 1.94)); float dash = step(0.5, fract((vU.x + vU.y) * 30.0 - uT * 0.5));
      gl_FragColor = vec4(vec3(0.24, 1.0, 0.55), edge * (0.5 + 0.5 * dash) + 0.06); }` }));
  cell.rotation.x = -Math.PI / 2; cell.position.y = 0.05; MAP.add(cell); MAP.userData.cell = cell;
  const pulse = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.4, 0.6), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.1; MAP.add(pulse); MAP.userData.pulse = pulse;
  const fuzzy = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vP; void main(){ float r = length(vP); gl_FragColor = vec4(vec3(1.0, 0.82, 0.4), (1.0 - r) * 0.28); }` })); fuzzy.rotation.x = -Math.PI / 2; fuzzy.position.y = 0.08; MAP.add(fuzzy); MAP.userData.fuzzy = fuzzy; }
const PINS = Array.from({ length: 16 }, (_, i) => { const g = new THREE.Group(); const inCell = i < 10; H.reseed(100 + i);
  const x = inCell ? (hash(i * 3.7) - 0.5) * 52 : (hash(i * 5.1) < 0.5 ? -1 : 1) * (36 + hash(i * 2.3) * 18), z = inCell ? (hash(i * 7.9) - 0.5) * 26 : (hash(i * 1.3) - 0.5) * 90;
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.8, 0.12, 3, 0.12), new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.4, metalness: 0.4 })); body.position.y = 1.1; g.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.6), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); scr.position.set(0, 1.1, 0.065); g.add(scr);
  body.position.y = 0; scr.position.set(0, 0, 0.065); body.rotation.x = scr.rotation.x = -Math.PI / 2; scr.position.set(0, 0.135, 0); body.position.y = 0.06; g.position.set(x, 0, z); g.scale.setScalar(3.2); g.userData = { inCell, scr }; MAP.add(g); return g; });

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "every panel and strut"], gold: ["Gold-coated beryllium", "#ffd166", "18 hexagons"], sec: ["Secondary mirror", "#cfd6dd", "bounces the light back"],
  ir: ["Infrared light", "#ff8a3d", "the faint heat of the first galaxies"], hot: ["Sun side", "#ff8a3d", "hot"], coldL: ["Telescope side", "#6fd0ff", "below 50 K"],
  layers: ["5 layers", "#c98fb0", "each ~0.1 mm thick"], fairL: ["Rocket fairing", "#6fd0ff", "Webb folded inside"], wings: ["Mirror wings", "#ffd166", "unfold last"],
  shieldL: ["Sunshield", "#c98fb0", "unfolds sideways"], earthL: ["Earth", "#9fd4ff", "~1.5 million km away"], nearby: ["Your area", green, "a rough area, not your exact spot"],
  others: ["Outside the area", "#ff7a6d", "doesn't get it"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("mstats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("MIRROR", "6.5 m", "#ffd166")}${card("SEGMENTS", "18")}${card("COATING", "GOLD", "#ffd166")}</div>`, { left: "0px", top: "1440px" });
hudEl("temps", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("TELESCOPE", "< 50 K", "#6fd0ff")}${card("THAT IS", "−223 °C", "#6fd0ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("launch", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("LAUNCH", "25 DEC 2021")}${card("ROCKET", "ARIANE 5", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("count", `<div style="width:1080px;text-align:center"><div id="cN" style="font:900 190px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">0</div><div id="cL" style="font:800 38px D;letter-spacing:.12em;color:#ff8a3d;margin-top:6px">STEPS WITH NO BACKUP</div></div>`, { left: "0px", top: "200px" });
hudEl("far", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("DISTANCE", "1.5 million km", "#9fd4ff")}${card("REPAIRS", "NONE POSSIBLE", "#ff7a6d")}</div>`, { left: "0px", top: "1440px" });
hudEl("nm", `<div style="width:1080px;text-align:center"><div style="font:900 170px/0.9 D;font-stretch:112%;color:#ffd166;text-shadow:0 12px 50px rgba(0,0,0,.6)">50 nm</div><div style="font:800 36px D;letter-spacing:.12em;color:#fff;margin-top:6px">SEGMENTS LINED UP TO</div></div>`, { left: "0px", top: "210px" });
hudEl("sec", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid ${green};font:900 54px D;color:#fff">≈ 1 SECOND</div></div>`, { left: "0px", top: "250px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["NEARBY", "ROUGH AREA ONLY", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("diag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">DEPLOYMENT SIMPLIFIED · TOOK ~2 WEEKS</div>`, { left: "195px", top: "1110px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { SKYG.visible = s === "space"; MAP.visible = s === "map"; W.visible = s === "space"; scene.fog = null; scene.background = s === "map" ? new THREE.Color(0x05070a) : null; }
function lightSpace(k = 1) { H.key.color.set(0xfff6ea); H.key.intensity = 3.4 * k; H.key.position.copy(W.position).addScaledVector(SUN, 60); H.key.target.position.copy(W.position);
  const s = H.key.shadow.camera; Object.assign(s, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 140 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6a7ea6); H.hemi.groundColor.set(0x3a2e2a); H.hemi.intensity = 0.55; H.envK.value = 0.9; H.rimA.intensity = 0.6; H.rimB.intensity = 0.4; }
const C0 = V(-1, 4.5, 0);
function segGlow(t, k, stagger) { SEGS.forEach((m, i) => { const ph = clamp(k * 1.4 - (i % 18) / 18 * stagger); m.material.emissive = m.material.emissive || new THREE.Color(); });
  const mat = SEGS[0] && SEGS[0].material; if (mat) { mat.emissive.setRGB(0.25 * k, 0.17 * k, 0.04 * k); } }

H.frame("Nearby, live. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 20000); WU.uT.value = t; RU.uT.value = t; MU.uT.value = t;
  WU.uHeat.value = 0; WU.uCold.value = 0; RAYS.visible = false; FAIR.visible = false; EARTHM.visible = MOONM.visible = false; deploy(1, 1, 1); segGlow(t, 0, 0);
  W.position.set(0, 0, 0); W.rotation.set(0, 0, 0); W.updateMatrixWorld(true);

  if (t < at("this")) { // HOOK: folded inside the rocket fairing (diagram), then a hint of the unfolding
    sets("space"); const k = smooth(prog(t, fr("hook", 0.7), at("this") + 0.6)); deploy(k * 0.25, 0, 0); FAIR.visible = true; FAIR.position.set(-1.0, 5.6, 0); lightSpace();
    move(t, 0, at("this"), [V(-14, 9, 20), V(-1, 5, 0), 36], [V(-11, 7, 16), V(-1, 5, 0), 36], 0.04); skyAt();
    title(t, fr("hook", 0.05), fr("hook", 0.6), "Folded to fit", "Like origami", 150); callout("fairL", t, fr("hook", 0.4), at("this"), V(1.3, 8, 0), 760, 1150);
  } else if (t < at("cold")) { // THE TELESCOPE, the gold mirror, infrared light path
    sets("space"); lightSpace();
    if (t < at("mirror")) { const a = 1.0 + (t - at("this")) * 0.1; move(t, at("this"), at("mirror"), [C0.clone().add(V(Math.cos(a) * 34, 9, Math.sin(a) * 34)), C0, 36], [C0.clone().add(V(Math.cos(a + 0.08) * 31, 8, Math.sin(a + 0.08) * 31)), C0, 36], 0.03);
      title(t, fr("this", 0.05), fr("this", 0.5), "The largest telescope in space", "James Webb", 150); callout("nasa", t, fr("this", 0.45), at("mirror"), V(-5, 2.3, 4), 300, 1150); }
    else if (t < at("why")) { H.key.intensity = 1.4; H.envK.value = 0.5; move(t, at("mirror"), at("why"), [V(16, 7, 6), MIRROR_C, 34], [V(14, 6.6, 4.5), MIRROR_C, 34], 0.02); hudShow("mstats", win(t, fr("mirror", 0.15), at("why")));
      callout("gold", t, fr("mirror", 0.4), at("why"), V(1.1, 5.0, 2.3), 760, 1150); }
    else { RAYS.visible = true; RU.uK.value = smooth(prog(t, at("why"), fr("why", 0.6))); move(t, at("why"), at("cold"), [V(14, 13, 16), V(3, 6, 0), 38], [V(12, 12, 14), V(3, 6, 0), 38], 0.02);
      callout("ir", t, fr("why", 0.15), fr("why", 0.6), V(10, 7.5, 1.5), 760, 900); callout("sec", t, fr("why", 0.55), at("cold"), V(7.6, 6.6, 0), 300, 900); }
    skyAt();
  } else if (t < at("launch")) { // COLD: hot side vs cold side; then the five layers
    sets("space"); lightSpace(); WU.uHeat.value = smooth(prog(t, at("cold"), fr("cold", 0.3))); WU.uCold.value = WU.uHeat.value;
    if (t < at("shield")) { move(t, at("cold"), at("shield"), [V(4, -1.5, 30), V(-1, 3, 0), 38], [V(3, -1.0, 27), V(-1, 3, 0), 38], 0.03);
      hudShow("temps", win(t, fr("cold", 0.25), at("shield"))); callout("hot", t, fr("cold", 0.3), at("shield"), V(-4, 0.6, 3), 300, 1250); callout("coldL", t, fr("cold", 0.45), at("shield"), V(1, 6.5, 2), 760, 700); }
    else { move(t, at("shield"), at("launch"), [V(12.5, 2.8, 8.0), V(9.3, 1.6, 4.6), 34], [V(12.0, 2.6, 7.4), V(9.3, 1.6, 4.6), 34], 0.01); callout("layers", t, fr("shield", 0.35), at("launch"), V(9.4, 1.5, 4.0), 300, 1150); }
    skyAt();
  } else if (t < at("risk")) { // LAUNCH (folded, in the fairing diagram), then the deployment
    sets("space"); lightSpace();
    if (t < at("unfold")) { deploy(0, 0, 0); FAIR.visible = true; const rise = smooth(prog(t, fr("launch", 0.2), at("unfold"))) * 6; W.position.y = rise; FAIR.position.set(-1.0, 5.6, 0); W.updateMatrixWorld(true);
      move(t, at("launch"), at("unfold"), [V(-15, 6 + rise, 17), V(-1, 5 + rise, 0), 38], [V(-13, 7 + rise * 1.2, 15), V(-1, 5.5 + rise, 0), 38], 0.08); hudShow("launch", win(t, fr("launch", 0.1), at("unfold"))); }
    else { const ks = prog(t, fr("unfold", 0.05), fr("unfold", 0.45)), kb = prog(t, fr("unfold", 0.35), fr("unfold", 0.7)), kw = prog(t, fr("unfold", 0.7), fr("unfold", 0.98)); deploy(ks, kb, kw);
      move(t, at("unfold"), at("risk"), [V(-22, 18, 26), V(-1, 4, 0), 38], [V(-20, 16, 24), V(-1, 4, 0), 38], 0.03); hudShow("diag", win(t, fr("unfold", 0.05), at("risk")));
      callout("shieldL", t, fr("unfold", 0.15), fr("unfold", 0.6), V(-6, 1.5, 4), 300, 1150); callout("wings", t, fr("unfold", 0.72), at("risk"), V(1.0, 6.3, 2.5), 760, 900); }
    skyAt();
  } else if (t < at("orbi")) { // 344 steps; far from Earth; 50 nm alignment
    sets("space"); lightSpace();
    if (t < at("far")) { const a = 2.2 + (t - at("risk")) * 0.12; move(t, at("risk"), at("far"), [C0.clone().add(V(Math.cos(a) * 30, 12, Math.sin(a) * 30)), C0, 38], [C0.clone().add(V(Math.cos(a + 0.1) * 28, 11, Math.sin(a + 0.1) * 28)), C0, 38], 0.03);
      H.$("cN").textContent = String(Math.round(344 * smooth(prog(t, fr("risk", 0.05), fr("risk", 0.75))))); hudShow("count", win(t, fr("risk", 0.02), at("far"))); }
    else if (t < at("align")) { EARTHM.visible = MOONM.visible = true; const dir = SUN.clone().negate().multiplyScalar(-1); const E = V(-260, -110, 40); EARTHM.position.copy(E); EARTHM.scale.setScalar(5); MOONM.position.copy(E).add(V(-30, 18, 26)); MOONM.scale.setScalar(1.4); EARTHM.rotation.y = t * 0.05;
      move(t, at("far"), at("align"), [V(14, 9, -10), V(-60, -20, 10), 40], [V(12, 8, -9), V(-70, -24, 12), 40], 0.02); hudShow("far", win(t, fr("far", 0.2), at("align"))); callout("earthL", t, fr("far", 0.3), at("align"), E, 760, 1150); }
    else { H.key.intensity = 1.4; H.envK.value = 0.5; const k = smooth(prog(t, at("align"), fr("align", 0.6))); segGlow(t, k, 1); move(t, at("align"), at("orbi"), [V(12, 6.6, 0.5), MIRROR_C, 36], [V(10.5, 6.5, 0.4), MIRROR_C, 36], 0.01); hudShow("nm", win(t, fr("align", 0.1), at("orbi"))); }
    skyAt();
  } else { // ORBI: Nearby, from above
    sets("map"); H.key.intensity = 1.0; H.key.position.copy(MAP.position).add(V(20, 60, 30)); H.key.target.position.copy(MAP.position); H.hemi.intensity = 0.8; H.hemi.color.set(0xb0c0d8); H.envK.value = 0.5; H.key.castShadow = false;
    MAP.updateMatrixWorld(true); const M = (x, y, z) => MAP.localToWorld(V(x, y, z)); const src = PINS[0];
    const tShare = fr("orbi2", 0.1); const pr = clamp((t - tShare) / 1.0); const pulse = MAP.userData.pulse; pulse.visible = t > tShare; pulse.position.set(src.position.x, 0.1, src.position.z); pulse.scale.setScalar(2 + pr * 26); pulse.material.opacity = 1 - pr * 0.8;
    PINS.forEach((p, i) => { const lit = p.userData.inCell && t > tShare + 0.15 + 0.6 * p.position.distanceTo(src.position) / 40; p.userData.scr.material.color.set(i === 0 ? 0x3dff8c : lit ? 0x3dff8c : 0x14181d); p.userData.scr.material.color.multiplyScalar(i === 0 || lit ? 1.6 : 1); p.rotation.y = 0.5 * Math.sin(i * 2.3); });
    const fz = MAP.userData.fuzzy; fz.position.set(src.position.x + 3, 0.08, src.position.z - 2); fz.scale.setScalar(14); fz.visible = t > fr("orbi2", 0.55);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [M(0, 95, 40), M(0, 0, 0), 40], [M(0, 88, 34), M(0, 0, 0), 40], 0.05);
    else move(t, at("orbi2"), at("end"), [M(4, 82, 30), M(0, 0, -2), 40], [M(4, 76, 26), M(0, 0, -2), 40], 0.05);
    callout("nearby", t, fr("orbi", 0.3), at("orbi3"), M(26, 0, 13), 760, 1150); callout("others", t, fr("orbi2", 0.3), at("orbi3"), M(PINS[12].position.x, 1, PINS[12].position.z), 300, 600);
    hudShow("sec", win(t, fr("orbi2", 0.15), fr("orbi2", 0.6))); hudShow("chips", win(t, fr("orbi3", 0.2), at("end")));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
