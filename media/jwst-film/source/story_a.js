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
