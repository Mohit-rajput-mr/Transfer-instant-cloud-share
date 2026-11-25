// Dare Mighty Things: NASA's Perseverance rover (NASA's own 3D model, NASA 3D Resources, free and without copyright).
// Facts (NASA/JPL): landed in Jezero Crater on 18 Feb 2021; hit the atmosphere at ~20,000 km/h (12,500 mph); entry, descent and
// landing took about seven minutes; radio signals took about 11 minutes to reach Earth, so the landing was over before Earth heard
// of the entry; Terrain-Relative Navigation: a camera photographed the ground during descent and compared it with an onboard map
// to steer to a safe spot; the 21 m (70 ft) parachute's orange and white gores encoded "DARE MIGHTY THINGS" (each word on its own
// ring; JPL's motto) and, in the outer ring, JPL's coordinates 34°11'58" N 118°10'31" W — binary, each number a letter position;
// designed by systems engineer Ian Clark; space fans decoded it within hours.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "./kit/lib/jsm/loaders/DRACOLoader.js";
import { makePhone, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
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
// JEZERO CRATER (generic Mars ground): rusty regolith, scattered rocks, a far crater rim, butterscotch sky, thin dust
// =====================================================================================================================
const MARS = new THREE.Group(); scene.add(MARS);
const SUN = V(0.45, 0.55, 0.7).normalize();
const skyM = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; varying vec3 vD; void main(){ vec3 d = normalize(vD); float h = max(d.y, 0.0); vec3 hor = vec3(0.86, 0.66, 0.48), zen = vec3(0.55, 0.36, 0.24);
    vec3 c = mix(hor, zen, pow(h, 0.5)); float sd = max(dot(d, uSun), 0.0); c = mix(c, vec3(0.75, 0.82, 0.9), pow(sd, 8.0) * 0.6); c += vec3(1.0, 0.97, 0.9) * pow(sd, 1400.0) * 4.0;
    if (d.y < 0.0) c = hor * 0.8; gl_FragColor = vec4(c, 1.0); }` }));
skyM.renderOrder = -10; skyM.frustumCulled = false; MARS.add(skyM);
const MFOG = new THREE.FogExp2(0xc99a72, 0.0045);
function marsH(x, z) { const r = Math.hypot(x, z); let h = Math.sin(x * 0.07 + 1.1) * Math.cos(z * 0.05) * 0.4 + Math.sin(x * 0.21 - z * 0.13) * 0.12 + Math.sin(x * 0.9 + z * 0.7) * 0.03;
  h *= smooth(clamp((r - 4) / 20)); h += 60 * smooth(clamp((r - 420) / 160)); return h; }
{ const g = new THREE.PlaneGeometry(1600, 1600, 300, 300); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, marsH(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 160, 160), normalMap: tex("kit/ph/brown_mud_dry/brown_mud_dry_nor_gl_1k.jpg", false, 220, 220), normalScale: new THREE.Vector2(0.8, 0.8), color: 0xa86a48, roughness: 0.96 });
  const ground = new THREE.Mesh(g, mat); ground.receiveShadow = true; MARS.add(ground); }
// rocks: Poly Haven boulder, instanced, rust-tinted
const BOUL = await new GLTFLoader().loadAsync("kit/ph/boulder_01/boulder_01_1k.gltf"); let bgeo = null, bmat = null; BOUL.scene.traverse((o) => { if (o.isMesh && !bgeo) { bgeo = o.geometry; bmat = o.material; } });
bmat = bmat.clone(); bmat.color = new THREE.Color(0xc07a52);
{ const N = 1400, IM = new THREE.InstancedMesh(bgeo, bmat, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const bb = new THREE.Box3().setFromBufferAttribute(bgeo.attributes.position); const bs = bb.getSize(V()).length();
  for (let i = 0; i < N; i++) { const a = hash(i) * TAU, r = 2.2 + Math.pow(hash(i + 1), 1.6) * 160; const x = Math.cos(a) * r, z = Math.sin(a) * r; const s = (0.03 + Math.pow(hash(i + 2), 4) * 0.5) / bs * (r < 6 ? 0.5 : 1);
    q.setFromEuler(new THREE.Euler(hash(i + 3) * 3, hash(i + 4) * 6, hash(i + 5) * 3)); m4.compose(V(x, marsH(x, z) - s * bs * 0.25, z), q, V(s, s * 0.7, s)); IM.setMatrixAt(i, m4); }
  IM.castShadow = IM.receiveShadow = true; MARS.add(IM); }

// =====================================================================================================================
// PERSEVERANCE: NASA's own model (metres: 3.1 m long, 2.7 m wide — real 3 m × 2.7 m). Its glass (transmission) materials
// render black here → plain transparent glass. The mast is toward +z (the front).
// =====================================================================================================================
const ROV = new THREE.Group(); scene.add(ROV);
{ const dl = new DRACOLoader(); dl.setDecoderPath("kit/lib/jsm/libs/draco/gltf/"); const gl = await new GLTFLoader().setDRACOLoader(dl).loadAsync("kit/models/perseverance/perseverance-nasa.glb");
  gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
    for (const m of [].concat(o.material)) { if (m.transmission) { m.transmission = 0; m.transparent = true; m.opacity = 0.35; m.roughness = 0.05; m.metalness = 0.2; m.depthWrite = false; }
      if (m.map) m.map.anisotropy = 8; m.envMapIntensity = 0.9; } });
  ROV.add(gl.scene); ROV.userData.bb = new THREE.Box3().setFromObject(gl.scene); }
const RL = (x, y, z) => ROV.localToWorld(V(x, y, z));
const RC = V(0, 0.9, -0.15);
// dust devils / blowing dust over the ground (soft particles)
const DUSTP = (() => { const N = 700, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3); for (let i = 0; i < N; i++) p.set([(hash(i) - 0.5) * 60, hash(i + 9) * 4, (hash(i + 3) - 0.5) * 60], i * 3);
  g.setAttribute("position", new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd9a57c, size: 0.05, transparent: true, opacity: 0.35, depthWrite: false })); MARS.add(m); return m; })();

// =====================================================================================================================
// ENTRY (diagram): a fireball streaking through the Martian sky — the spacecraft hitting the air at ~20,000 km/h
// =====================================================================================================================
const FIRE = (() => { const g = new THREE.Group(); MARS.add(g); g.visible = false;
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), glow(0xfff0d0, 6)); g.add(head);
  const trail = new THREE.Mesh(new THREE.ConeGeometry(1, 30, 24, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vU; void main(){ float a = pow(vU.y, 2.2); gl_FragColor = vec4(vec3(1.6, 0.8, 0.35) * a, 1.0); }` })); trail.rotation.x = Math.PI / 2; trail.position.z = -15; g.add(trail);
  return g; })();

// =====================================================================================================================
// EARTH ↔ MARS (diagram, far away): a radio pulse needs ~11 minutes; the landing is over in ~7
// =====================================================================================================================
const SPC = new THREE.Group(); scene.add(SPC); SPC.position.set(0, 9000, 0); SPC.visible = false;
{ const N = 5000, p = new Float32Array(N * 3); H.reseed(5); for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 3000, u * 3000, Math.sin(a) * r * 3000], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); const st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, depthWrite: false })); SPC.add(st); }
const PEARTH = new THREE.Mesh(new THREE.SphereGeometry(2.0, 64, 32), new THREE.MeshStandardMaterial({ map: tex("kit/models/planets/earth_atmos_2048.jpg", true), roughness: 0.8, emissive: new THREE.Color(0x0a1424) })); PEARTH.position.set(0, -9, 0); SPC.add(PEARTH);
const PMARS = new THREE.Mesh(new THREE.SphereGeometry(1.4, 64, 32), new THREE.MeshStandardMaterial({ map: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true), color: 0xd0784a, roughness: 0.95, emissive: new THREE.Color(0x1a0a05) })); PMARS.position.set(0, 9, 0); SPC.add(PMARS);
const PULSE = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 12), glow(0x9fd4ff, 5)); SPC.add(PULSE);
const PLINE = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 8.2, 0), V(0, -7.8, 0)]), new THREE.LineDashedMaterial({ color: 0x9fd4ff, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.5 })); PLINE.computeLineDistances(); SPC.add(PLINE);
const SW = (x, y, z) => SPC.localToWorld(V(x, y, z));

// =====================================================================================================================
// TERRAIN-RELATIVE NAVIGATION (diagram): the ground seen from above, hazards marked red; the camera's view squares match
// features on the onboard map (green), and the landing target slides to a safe patch
// =====================================================================================================================
const TRN = new THREE.Group(); scene.add(TRN); TRN.position.set(-9000, 0, 0); TRN.visible = false;
const TRU = { uT: { value: 0 }, uK: { value: 0 } };
{ const g = new THREE.PlaneGeometry(40, 40, 200, 200); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 0.4) * Math.cos(p.getZ(i) * 0.3) * 0.3 + Math.sin(p.getX(i) * 1.3 + p.getZ(i)) * 0.06); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 6, 6), color: 0xb87a55, roughness: 0.95 })); ground.receiveShadow = true; TRN.add(ground); }
const hazard = (x, z, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.2, 0.15), transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.45, z); TRN.add(m);
  const e = new THREE.Mesh(new THREE.RingGeometry(r * 0.97, r, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.3, 0.2), toneMapped: false })); e.rotation.x = -Math.PI / 2; e.position.set(x, 0.46, z); TRN.add(e); return m; };
const HAZ = [hazard(-1.2, -0.6, 2.2), hazard(3.4, 1.8, 1.6), hazard(-3.6, 3.2, 1.8), hazard(1.6, -3.6, 1.4)];
const TARGET = new THREE.Group(); TRN.add(TARGET);
{ const r = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.9), toneMapped: false })); r.rotation.x = -Math.PI / 2; TARGET.add(r);
  const c = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.9), toneMapped: false })); c.rotation.x = -Math.PI / 2; TARGET.add(c); }
const SQUARES = Array.from({ length: 6 }, (_, i) => { const s = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.9), toneMapped: false, transparent: true }));
  s.position.set(Math.cos(i * 1.7) * 4.2, 0.5, Math.sin(i * 2.3) * 4.2); TRN.add(s); return s; });
const TW = (x, y, z) => TRN.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE PARACHUTE (diagram): a disk-gap-band canopy, 21 m across, its gores in orange and white. The stripes drawn here show
// the IDEA (each word on its own ring, letters as binary numbers); they are not a copy of the real pattern — labelled.
// =====================================================================================================================
const CHUTE = new THREE.Group(); scene.add(CHUTE); CHUTE.position.set(6000, 0, 0); CHUTE.visible = false;
const RINGS = [["DARE", 0.0, 0.28], ["MIGHTY", 0.3, 0.52], ["THINGS", 0.54, 0.76], ["COORDS", 0.8, 1.0]];
const GORES = 80, CHR = 10.5;   // 80 gores, 21 m across
const bitsFor = (word, n) => { const out = []; for (const ch of word) { const v = ch.charCodeAt(0) - 64; for (let b = 9; b >= 0; b--) out.push((v >> b) & 1); } while (out.length < n) out.push(1); return out.slice(0, n); };
const CU = { uLit: { value: 0 }, uRing: { value: -1 }, uT: { value: 0 } };
{ const W = 2048, cv = document.createElement("canvas"); cv.width = W; cv.height = W; const g = cv.getContext("2d"); const C = W / 2;
  g.fillStyle = "#000"; g.fillRect(0, 0, W, W);
  RINGS.forEach(([word, r0, r1], ri) => { const bits = word === "COORDS" ? Array.from({ length: GORES }, (_, i) => (hash(i * 3.7 + 11) > 0.5 ? 1 : 0)) : bitsFor(word, GORES);
    for (let i = 0; i < GORES; i++) { const a0 = i / GORES * TAU - Math.PI / 2, a1 = (i + 1) / GORES * TAU - Math.PI / 2; g.beginPath(); g.moveTo(C + Math.cos(a0) * r0 * C * 0.98, C + Math.sin(a0) * r0 * C * 0.98);
      g.arc(C, C, r1 * C * 0.98, a0, a1); g.arc(C, C, r0 * C * 0.98, a1, a0, true); g.closePath(); g.fillStyle = bits[i] ? "#ff5a1f" : "#f4f1ea"; g.fill(); g.strokeStyle = "rgba(60,40,30,.5)"; g.lineWidth = 2; g.stroke(); } });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  // canopy: a shallow dome (disk) + a gap + a band (the band drawn as a ring skirt)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(CHR, 128, 32, 0, TAU, 0, 0.55), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 }));
  // map the texture top-down onto the dome
  const pa = dome.geometry.attributes.position, uv = dome.geometry.attributes.uv; for (let i = 0; i < pa.count; i++) { uv.setXY(i, 0.5 + pa.getX(i) / (2 * CHR * Math.sin(0.55)), 0.5 - pa.getZ(i) / (2 * CHR * Math.sin(0.55))); } uv.needsUpdate = true;
  dome.castShadow = true; CHUTE.add(dome); CHUTE.userData.dome = dome; }
// suspension lines down to a point
{ const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; pts.push(V(Math.cos(a) * CHR * Math.sin(0.55), CHR * Math.cos(0.55), Math.sin(a) * CHR * Math.sin(0.55)), V(0, -14, 0)); }
  CHUTE.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xd8d2c4, transparent: true, opacity: 0.6 }))); }
const CW = (x, y, z) => CHUTE.localToWorld(V(x, y, z));
const ringAnchor = (ri) => { const [, r0, r1] = RINGS[ri]; const r = (r0 + r1) / 2 * CHR * Math.sin(0.55) * 0.98; const a = -0.7 + ri * 0.45; const x = Math.cos(a) * r, z = Math.sin(a) * r; const y = Math.sqrt(Math.max(0, CHR * CHR - x * x - z * z)); return CW(x, y, z); };

// =====================================================================================================================
// ORBI: two phones. Left: someone knocks on an anonymous space with its 4 letters. Right: a member inside sees "Someone typed
// this space's code and is knocking" → No / Let in. Then the left phone is in. (Spaces.tsx KnockForm, KnockBell.tsx)
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PA = makePhone(), PB = makePhone(); ORS.add(PA.g, PB.g); PA.g.position.set(-0.55, 1.25, 0); PB.g.position.set(0.55, 1.25, 0); PA.g.scale.setScalar(1.05); PB.g.scale.setScalar(1.05); PA.g.rotation.y = 0.12; PB.g.rotation.y = -0.12;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  for (const x of [-0.55, 0.55]) { const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.set(x, 0.05, 0); ORS.add(ped); } }
const KNOCKLINE = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 8), glow(0x3dff8c, 3)); KNOCKLINE.rotation.z = Math.PI / 2; KNOCKLINE.position.set(0, 1.45, 0.1); ORS.add(KNOCKLINE);
const IMG = { ph: await img("shots_live/phone.png") };
function bg(g) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.5)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); } }
function drawA(g, st) { bg(g); g.fillStyle = "rgba(8,10,14,.95)"; rr(g, 40, 420, 700, 820, 36); g.fill(); g.strokeStyle = st.in ? green : "rgba(255,255,255,.15)"; g.lineWidth = 3; g.stroke();
  if (!st.in) { g.fillStyle = "#9aa3ad"; g.font = "700 34px M"; g.fillText("Anonymous space:", 84, 500); g.fillText("its 4-letter name", 84, 546);
    for (let i = 0; i < 4; i++) { const x = 84 + i * 158; g.fillStyle = "rgba(255,255,255,.07)"; rr(g, x, 590, 136, 160, 22); g.fill(); g.strokeStyle = i < st.n ? green : "rgba(255,255,255,.25)"; g.lineWidth = 3; g.stroke();
      if (i < st.n) { g.fillStyle = "#fff"; g.font = "900 84px D"; g.fillText("K7QX"[i], x + 40, 700); } }
    if (st.knocking) { g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("Knocking on", 84, 840); g.fillStyle = green; g.fillText("Anonymous · K7QX", 84, 890); g.fillStyle = "#9aa3ad"; g.font = "600 30px M"; g.fillText("Waiting for someone inside", 84, 960); g.fillText("to let you in…", 84, 1002); }
    else { g.fillStyle = st.n >= 4 ? "rgba(61,255,140,.18)" : "rgba(255,255,255,.06)"; rr(g, 84, 1060, 612, 120, 26); g.fill(); g.fillStyle = st.n >= 4 ? green : "#777"; g.font = "900 46px D"; g.fillText("KNOCK", 316, 1136); } }
  else { g.fillStyle = green; g.font = "900 60px D"; g.fillText("You're in", 84, 540); g.fillStyle = "#fff"; g.font = "800 40px M"; g.fillText("Anonymous · K7QX", 84, 610); g.fillStyle = "#9aa3ad"; g.font = "600 30px M"; g.fillText("never listed · members only", 84, 664);
    for (let i = 0; i < 3; i++) { g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 84, 720 + i * 150, 612, 120, 22); g.fill(); g.fillStyle = "#cfd6dd"; g.font = "700 32px M"; g.fillText(["rover-test.mp4", "landing-plan.pdf", "jezero-map.png"][i], 120, 792 + i * 150); } } }
function drawB(g, st) { bg(g); g.fillStyle = "rgba(8,10,14,.95)"; rr(g, 40, 420, 700, 300, 36); g.fill(); g.fillStyle = "#fff"; g.font = "800 40px M"; g.fillText("Anonymous · K7QX", 84, 500); g.fillStyle = "#9aa3ad"; g.font = "600 30px M"; g.fillText("3 members inside", 84, 552);
  if (st.bell) { g.fillStyle = "rgba(14,16,20,.98)"; rr(g, 40, 600, 700, 400, 36); g.fill(); g.strokeStyle = "#ffd166"; g.lineWidth = 3; g.stroke(); g.fillStyle = "#ffd166"; g.font = "800 36px M"; g.fillText("Someone typed this", 84, 680); g.fillText("space's code and", 84, 726); g.fillText("is knocking", 84, 772);
    g.fillStyle = "rgba(255,255,255,.08)"; rr(g, 84, 850, 270, 110, 26); g.fill(); g.fillStyle = "#cfd6dd"; g.font = "900 44px D"; g.fillText("No", 190, 922);
    g.fillStyle = st.press ? green : "rgba(61,255,140,.22)"; rr(g, 386, 850, 310, 110, 26); g.fill(); g.fillStyle = st.press ? "#05150b" : green; g.font = "900 44px D"; g.fillText("Let in", 470, 922); }
  if (st.toast) { g.fillStyle = "rgba(20,22,26,.95)"; rr(g, 60, 1260, 660, 84, 42); g.fill(); g.strokeStyle = green; g.lineWidth = 2; g.stroke(); g.fillStyle = green; g.font = "700 28px M"; g.fillText("Let in: they're stepping into the space", 92, 1312); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "3 m long, 1,025 kg"], mast: ["Mast cameras", "#cfd6dd", ""], arm: ["Robotic arm", "#ffd166", ""],
  fireL: ["Entry", "#ffb340", "~20,000 km/h"], earthL: ["Earth", "#5fb0ff", ""], marsL: ["Mars", "#ff8a5c", ""], hazL: ["Danger", "#ff6b5e", "rocks, slopes"], tgtL: ["Safe spot", "#3dff8c", "it chose itself"],
  r0: ["DARE", "#ff8a4c", "inner ring"], r1: ["MIGHTY", "#ff8a4c", ""], r2: ["THINGS", "#ff8a4c", ""], r3: ["34°11'58\" N 118°10'31\" W", "#ffd166", "JPL, Pasadena"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("landed", row(card("LANDED", "18 FEB 2021", "#ff8a5c"), card("WHERE", "JEZERO CRATER", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("speed", big("sN", "20,000", "KM/H", "#fff", "#ffb340"), { left: "0px", top: "190px" });
hudEl("seven", row(card("ENTRY TO LANDING", "~7 MIN", "#ffb340")), { left: "0px", top: "1440px" });
hudEl("clock", big("cN", "0:00", "SIGNAL ON ITS WAY TO EARTH", "#fff", "#9fd4ff"), { left: "0px", top: "190px" });
hudEl("done", row(card("LANDING OVER AT", "~7 MIN", "#3dff8c"), card("EARTH HEARS AT", "~11 MIN", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("diag2", pill("DIAGRAM · THE IDEA, NOT THE REAL PATTERN"), { left: "180px", top: "1120px" });
hudEl("trn", row(card("CAMERA + MAP", "IT STEERED ITSELF", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("m21", row(card("PARACHUTE", "21 m ACROSS", "#ff8a4c")), { left: "0px", top: "1440px" });
hudEl("bits", `<div style="width:1080px;display:flex;justify-content:center"><div style="padding:22px 30px;border-radius:24px;background:rgba(6,8,12,.86);border:1.5px solid rgba(255,255,255,.18);text-align:center">
  <div style="font:700 26px M;letter-spacing:.14em;color:#aab3bd">ORANGE = 1 · WHITE = 0</div><div id="bitsT" style="font:900 50px M;color:#fff;margin-top:10px;white-space:nowrap"></div></div></div>`, { left: "0px", top: "1440px" });
hudEl("hours", row(card("CRACKED BY FANS", "IN HOURS", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["NEVER LISTED", "KNOCK TO ENTER", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { MARS.visible = s === "mars"; ROV.visible = s === "mars" && true; SPC.visible = s === "space"; TRN.visible = s === "trn"; CHUTE.visible = s === "chute"; ORS.visible = s === "orbi"; FIRE.visible = false;
  scene.fog = s === "mars" ? MFOG : null; scene.background = s === "space" ? new THREE.Color(0x000000) : s === "trn" ? new THREE.Color(0x05070a) : s === "chute" ? new THREE.Color(0xb98a66) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function lightMars(k = 1) { H.key.color.set(0xffe6cc); H.key.intensity = 3.4 * k; H.key.position.copy(SUN).multiplyScalar(30); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 80 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0xe0b090); H.hemi.groundColor.set(0x7a4a30); H.hemi.intensity = 0.55; H.envK.value = 0.75; H.rimA.intensity = 0.5; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.35) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(4, 9, 6)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x8f9ab8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const BITS = [["D", 4], ["A", 1], ["R", 18], ["E", 5]];

H.frame("Knock to enter. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 20000); TRU.uT.value = t;

  if (t < at("fast")) { // HOOK · THIS: Perseverance at Jezero
    sets("mars"); lightMars();
    if (t < at("this")) { move(t, 0, at("this"), [V(-5.5, 1.1, 6.5), RC, 40], [V(-3.8, 1.0, 4.8), RC, 40], 0.03);
      title(t, fr("hook", 0.04), fr("hook", 0.6), "Hidden in plain sight", "A secret on Mars", 150); }
    else { const a = 2.3 + (t - at("this")) * 0.14; move(t, at("this"), at("fast"), [RC.clone().add(V(Math.cos(a) * 6.4, 1.6, Math.sin(a) * 6.4)), RC, 40], [RC.clone().add(V(Math.cos(a + 0.1) * 5.6, 1.3, Math.sin(a + 0.1) * 5.6)), RC, 40], 0.02);
      callout("nasa", t, fr("this", 0.15), at("fast"), RL(0.4, 1.0, -0.2), 300, 1390); hudShow("landed", win(t, fr("this", 0.55), at("fast"))); }
  } else if (t < at("eyes")) { // FAST: the fireball · LATE: 11 minutes to Earth
    if (t < at("late")) { sets("mars"); ROV.visible = false; lightMars(0.8); const k = prog(t, at("fast"), at("late")); FIRE.visible = true;
      const p0 = V(-260, 140, -420), p1 = V(140, 40, -180); FIRE.position.copy(p0).lerp(p1, k); FIRE.lookAt(p1.clone().add(p1.clone().sub(p0))); FIRE.scale.setScalar(7);
      look(V(0, 1.4, 6), FIRE.position.clone().lerp(V(0, 20, -200), 0.3), 44); callout("fireL", t, at("fast") + 0.3, fr("fast", 0.6), FIRE.position.clone(), 760, 700);
      H.$("sN").textContent = Math.round(20000 * (1 - 0.98 * smooth(prog(t, fr("fast", 0.3), at("late"))))).toLocaleString("en-US"); hudShow("speed", win(t, at("fast"), at("late"))); hudShow("seven", win(t, fr("fast", 0.5), at("late"))); hudShow("diag", 1); }
    else { sets("space"); SPC.updateMatrixWorld(true); H.key.intensity = 2.0; H.key.position.copy(SPC.position).add(V(20, 5, 30)); H.key.target.position.copy(SPC.position); H.hemi.intensity = 0.25; H.envK.value = 0.4;
      const k = prog(t, fr("late", 0.05), fr("late", 0.95)); PULSE.position.copy(V(0, 8.2, 0).lerp(V(0, -7.8, 0), k)); PEARTH.rotation.y = t * 0.2; PMARS.rotation.y = t * 0.1;
      move(t, at("late"), at("eyes"), [SW(8, 1, 29), SW(0, 0, 0), 44], [SW(7, 0.8, 27), SW(0, 0, 0), 44], 0.01);
      const mins = 11 * k; H.$("cN").textContent = `${Math.floor(mins)}:${String(Math.floor((mins % 1) * 60)).padStart(2, "0")}`; hudShow("clock", win(t, at("late"), at("eyes"))); hudShow("done", win(t, fr("late", 0.5), at("eyes"))); hudShow("diag", 1);
      callout("marsL", t, at("late"), at("eyes"), SW(1.0, 9.5, 0.6), 760, 560); callout("earthL", t, at("late"), at("eyes"), SW(1.4, -8.4, 1.0), 760, 1390); }
  } else if (t < at("chute")) { // EYES: terrain-relative navigation
    sets("trn"); TRN.updateMatrixWorld(true); lightAt(TRN.position, 0.45); const k = prog(t, at("eyes"), at("chute"));
    const tg = V(-0.4, 0.5, -0.6).lerp(V(1.0, 0.5, 2.4), smooth(clamp((k - 0.35) / 0.5))); TARGET.position.copy(tg);
    SQUARES.forEach((s, i) => { const on = k > 0.1 + i * 0.05; s.visible = on; s.material.opacity = on ? 0.5 + 0.5 * Math.sin(t * 6 + i) : 0; });
    move(t, at("eyes"), at("chute"), [TW(0.5, 16, 7), TW(0.3, 0, 0.6), 40], [TW(0.4, 13, 5.5), TW(0.3, 0, 0.6), 40], 0.01);
    callout("hazL", t, fr("eyes", 0.2), at("chute"), TW(-1.2, 0.45, -0.6), 300, 1000); callout("tgtL", t, fr("eyes", 0.6), at("chute"), TW(tg.x, 0.5, tg.z), 760, 1390); hudShow("trn", win(t, fr("eyes", 0.3), at("chute"))); hudShow("diag", 1);
  } else if (t < at("orbi")) { // CHUTE · BITS · WORDS · CRACKED: the canopy as a diagram
    sets("chute"); CHUTE.updateMatrixWorld(true); lightAt(CHUTE.position.clone().add(V(0, 10, 0)), 0.6); H.key.position.copy(CHUTE.position).add(V(-6, -20, 10));
    const sp = (t - at("chute")) * 0.06; CHUTE.rotation.y = sp; CHUTE.updateMatrixWorld(true);
    if (t < at("bits")) { move(t, at("chute"), at("bits"), [CW(0, -40, 16), CW(0, 4, 0), 40], [CW(0, -30, 12), CW(0, 5, 0), 40], 0.02); hudShow("m21", win(t, fr("chute", 0.2), at("bits"))); }
    else if (t < at("cracked")) { move(t, at("bits"), at("cracked"), [CW(0, -22, 4), CW(0, 8, 0), 44], [CW(0, -18, 3), CW(0, 8, 0), 44], 0.01);
      if (t < at("words")) { const n = Math.min(4, 1 + Math.floor(prog(t, at("bits"), at("words")) * 4)); H.$("bitsT").innerHTML = BITS.slice(0, n).map(([c, v]) => `${c}=${v}=<span style="color:#ff8a4c">${v.toString(2)}</span>`).join("&nbsp; "); hudShow("bits", win(t, fr("bits", 0.1), at("words"))); }
      else { [0, 1, 2, 3].forEach((ri) => callout("r" + ri, t, fr("words", 0.05 + ri * 0.18), at("cracked"), ringAnchor(ri), ri % 2 ? 760 : 300, [520, 760, 1000, 1390][ri])); } }
    else { move(t, at("cracked"), at("orbi"), [CW(0, -18, 3), CW(0, 8, 0), 44], [CW(0, -26, 8), CW(0, 6, 0), 44], 0.02); hudShow("hours", win(t, at("cracked"), at("orbi"))); }
    hudShow("diag2", 1);
  } else { // ORBI: knock with 4 letters; someone inside lets you in
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const n = Math.min(4, Math.max(0, Math.floor((t - fr("orbi", 0.45)) / 0.3) + 1)) * (t > fr("orbi", 0.45) ? 1 : 0);
    const knocking = t > fr("orbi2", 0.15), bell = t > fr("orbi2", 0.3), press = t > fr("orbi2", 0.75), inn = t > fr("orbi2", 0.9);
    screen(PA, { n: Math.max(n, knocking ? 4 : 0), knocking: knocking && !inn, in: inn }, drawA); screen(PB, { bell: bell && !inn, press, toast: inn }, drawB);
    KNOCKLINE.visible = false; KNOCKLINE.material.color.setRGB(0.4 + 1.6 * (0.5 + 0.5 * Math.sin(t * 8)), 2.0, 0.9);
    // one phone at a time: the knocker (left), the member inside (right) as the bell rings, then back to the knocker, in
    const A0 = [OW(-0.45, 1.3, 2.35), OW(-0.55, 1.25, 0), 36], B0 = [OW(0.45, 1.3, 2.35), OW(0.55, 1.25, 0), 36];
    if (t < fr("orbi2", 0.25)) move(t, at("orbi"), fr("orbi2", 0.25), [OW(0.0, 1.6, 4.6), OW(-0.3, 1.25, 0), 36], A0, 0.02);
    else if (t < fr("orbi2", 0.4)) move(t, fr("orbi2", 0.25), fr("orbi2", 0.4), A0, B0, 0.0);
    else if (t < fr("orbi2", 0.85)) move(t, fr("orbi2", 0.4), fr("orbi2", 0.85), B0, B0, 0.01);
    else if (t < at("orbi3")) move(t, fr("orbi2", 0.85), at("orbi3"), B0, A0, 0.0);
    else move(t, at("orbi3"), end("end") + 1.5, A0, [OW(0, 1.4, 4.4), OW(0, 1.25, 0), 36], 0.02);
    hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
