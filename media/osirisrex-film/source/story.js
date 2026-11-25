// OSIRIS-REx: the asteroid that almost swallowed it. NASA's OSIRIS-REx 3D model (NASA 3D Resources, free and without copyright).
// Facts (NASA, Univ. of Arizona): on 20 Oct 2020 it touched asteroid Bennu (Touch-And-Go): a puff of nitrogen stirred up material
// into the sampler head; the surface is nearly cohesionless ("like a plastic ball pit"); the arm sank almost half a metre; about six
// seconds after contact it fired its thrusters to back away while still sinking — without them it would have sunk into Bennu. The
// sample capsule landed in Utah on 24 Sept 2023. Two of the 35 fasteners on the sampler head could not be removed with the tools
// approved for the glovebox; new tools were built; both were removed in January 2024. Real image: "Bennu mosaic OSIRIS-REx"
// (NASA/Goddard/University of Arizona, public domain).
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
// LOW EARTH ORBIT: stars, the Sun, and the Earth below. Earth is built 1:1000 (radius 6,371 m at 540 m below Hubble's
// orbit, scaled with it), so it fills the sky at exactly the angle it does from Hubble's ~540 km orbit.
// =====================================================================================================================
const SKYG = new THREE.Group(); scene.add(SKYG);
const SUN = V(0.7, 0.5, 0.5).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
// =====================================================================================================================
// OSIRIS-REx: NASA's own model (model units ×0.18 → metres: the arrays span 6.2 m). Sample capsule on top (+y); the sampler arm is stowed (one mesh), so it is never shown extended.
// =====================================================================================================================
const OREX = new THREE.Group(); scene.add(OREX);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/osirisrex/osirisrex-nasa.glb");
  gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.side = THREE.DoubleSide; m.envMapIntensity = 0.9; } });
  gl.scene.scale.setScalar(0.18); OREX.add(gl.scene); OREX.userData.bb = new THREE.Box3().setFromObject(gl.scene); }
const OL = (x, y, z) => OREX.localToWorld(V(x, y, z));

// =====================================================================================================================
// BENNU, the real photo (NASA/Goddard/University of Arizona, public domain) as a big billboard in space.
// =====================================================================================================================
const BENNU = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: tex("ref/bennu_mosaic.jpg", true), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xdddddd }));
BENNU.material.map.wrapS = BENNU.material.map.wrapT = THREE.ClampToEdgeWrapping; scene.add(BENNU); BENNU.renderOrder = -5;
function bennuAt(pos, size, faceCam = true) { BENNU.visible = true; BENNU.position.copy(pos); BENNU.scale.setScalar(size / 9); if (faceCam) BENNU.quaternion.copy(H.cam.quaternion); }

// =====================================================================================================================
// THE TOUCH (diagram): a cut through the loose surface — pebbles and rocks barely held together — and the sampler head (a
// simple labelled disk, not the real hardware) pressing in, a puff of gas, sinking ~0.5 m, then backing away.
// 1 unit = 1 m.
// =====================================================================================================================
const CUT = new THREE.Group(); scene.add(CUT); CUT.position.set(-9000, 0, 0); CUT.visible = false;
const NPB = 1400; const PEB = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.95 }), NPB); PEB.castShadow = PEB.receiveShadow = true; CUT.add(PEB);
const PB0 = []; H.reseed(11); for (let i = 0; i < NPB; i++) { const x = (H.rnd() - 0.5) * 3.2, y = -H.rnd() * 1.4, z = (H.rnd() - 0.5) * 0.5; const s = 0.02 + Math.pow(H.rnd(), 3) * 0.12; PB0.push({ p: V(x, y, z), s, r: V(H.rnd() * 6, H.rnd() * 6, H.rnd() * 6), v: V((H.rnd() - 0.5) * 2, H.rnd() * 2.5 + 0.5, (H.rnd() - 0.5) * 2) }); }
{ const back = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 1 })); back.position.set(0, -0.7, -0.3); CUT.add(back);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -1.6; CUT.add(fl); }
const HEAD = new THREE.Group(); CUT.add(HEAD);
{ const disk = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 48), new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, metalness: 0.9, roughness: 0.3 }))); HEAD.add(disk);
  const rod = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 16), new THREE.MeshPhysicalMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.35 }))); rod.position.y = 1.15; HEAD.add(rod); }
const PUFF = Array.from({ length: 60 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.5, depthWrite: false })); CUT.add(m); return m; });
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion();
// head height (m): 0.6 above → 0 contact → −0.48 sunk → back up; burst k: pebbles thrown; fluid push around the head
function touch(t, hy, burst) { HEAD.position.set(0, hy + 0.05, 0);
  PB0.forEach((b, i) => { const p = b.p.clone(); const dx = p.x, dist = Math.abs(dx); const pushD = Math.max(0, -hy) * Math.exp(-dist * 3);
    if (p.y > hy - 0.3 && dist < 0.4) { p.x += Math.sign(dx || 1) * pushD * 0.8; p.y += pushD * 0.6; }
    if (burst > 0 && p.y > -0.4 && dist < 1.2) { const k = burst * (1.2 - dist); p.addScaledVector(b.v, k * 0.5); p.y -= 4.9 * 0.02 * k * k; }
    m4.compose(p, q4.setFromEuler(new THREE.Euler(b.r.x, b.r.y, b.r.z)), V(b.s, b.s * 0.8, b.s)); PEB.setMatrixAt(i, m4); }); PEB.instanceMatrix.needsUpdate = true;
  PUFF.forEach((m, i) => { const u = (t * 1.8 + i / PUFF.length) % 1; const on = hy < 0.02 && hy > -0.5; m.visible = on; m.position.set(Math.cos(i * 2.4) * (0.1 + u * 0.7), hy + 0.05 + u * 0.4, Math.sin(i * 1.3) * 0.2); m.material.opacity = 0.5 * (1 - u); }); }
const CW = (x, y, z) => CUT.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE 35 FASTENERS (diagram): a ring of 35 dots; two stuck (red) until the new tools free them (green).
// =====================================================================================================================
const RING = new THREE.Group(); scene.add(RING); RING.position.set(9000, 0, 0); RING.visible = false;
{ const plate = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 96), new THREE.MeshPhysicalMaterial({ color: 0x8a9096, metalness: 0.8, roughness: 0.35 }))); RING.add(plate);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(20, 64), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.07; fl.receiveShadow = true; RING.add(fl); }
const BOLTS = Array.from({ length: 35 }, (_, i) => { const a = i / 35 * TAU; const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 6), new THREE.MeshPhysicalMaterial({ color: 0xd8dde3, metalness: 1, roughness: 0.25, emissive: new THREE.Color(0) }))); b.position.set(Math.cos(a) * 1.05, 0.085, Math.sin(a) * 1.05); RING.add(b); return b; });
const STUCK = [7, 24];
function bolts(kRed, kFix, kOut) { BOLTS.forEach((b, i) => { const st = STUCK.includes(i); b.material.emissive.setRGB(st ? 1.6 * kRed * (1 - kFix) : 0, st ? 1.4 * kFix : 0, st ? 0.5 * kFix : 0); b.position.y = 0.085 + (st ? 0 : kOut * 0.6) + (st ? kFix * 0.4 : 0); b.visible = st || kOut < 0.98; }); }
const RW = (x, y, z) => RING.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: "Go private with the team" (TeamMove.tsx): a private space with its passcode; everyone on your Wi-Fi gets a one-tap
// invite; your tasks move with you. Then a teammate's phone: "<name> is going private · <space> · on your Wi-Fi · Join".
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PA = makePhone(), PB = makePhone(); ORS.add(PA.g, PB.g); PA.g.position.set(-0.55, 1.25, 0); PB.g.position.set(0.55, 1.25, 0); PA.g.scale.setScalar(1.05); PB.g.scale.setScalar(1.05); PA.g.rotation.y = 0.12; PB.g.rotation.y = -0.12;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  for (const x of [-0.55, 0.55]) { const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.set(x, 0.05, 0); ORS.add(ped); } }
const IMG = { ph: await img("shots_live/phone.png") };
function bg(g) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.5)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); } }
function drawA(g, st) { bg(g); g.fillStyle = "rgba(8,10,14,.96)"; rr(g, 40, 380, 700, 860, 36); g.fill(); g.strokeStyle = "rgba(255,255,255,.15)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#fff"; g.font = "900 46px D"; g.fillText("Go private with the team", 76, 460);
  const rows = [["🔒", "A private space, passcode", "482913"], ["👥", "Everyone on your Wi-Fi gets", "a one-tap invite"], ["●", "Your 3 tasks move with you", ""]];
  rows.forEach(([ic, a, b], i) => { const y = 560 + i * 120; g.font = "600 32px M"; g.fillStyle = "#cfd6dd"; g.fillText(ic + "  " + a, 76, y); if (b) { g.fillStyle = i === 0 ? green : "#cfd6dd"; g.font = i === 0 ? "800 36px M" : "600 32px M"; g.fillText("    " + b, 76, y + 46); } });
  g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 76, 920, 628, 76, 18); g.fill(); g.fillStyle = "#fff"; g.font = "600 30px M"; g.fillText("Sample lab", 100, 970);
  g.fillStyle = st.press ? "#2fd877" : green; rr(g, 76, 1030, 628, 110, 26); g.fill(); g.fillStyle = "#05150b"; g.font = "900 44px D"; g.fillText(st.done ? "You're private ✓" : "Go private", st.done ? 220 : 280, 1102); }
function drawB(g, st) { bg(g); if (st.invite) { g.fillStyle = "rgba(14,16,20,.98)"; rr(g, 40, 600, 700, 330, 36); g.fill(); g.strokeStyle = green; g.lineWidth = 3; g.stroke();
    g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("🔒 Anna is going private", 80, 690); g.fillStyle = "#9aa3ad"; g.font = "600 30px M"; g.fillText("Sample lab · on your Wi-Fi", 80, 744);
    g.fillStyle = st.join ? "#2fd877" : green; rr(g, 80, 790, 300, 100, 26); g.fill(); g.fillStyle = "#05150b"; g.font = "900 42px D"; g.fillText(st.joined ? "Joined" : "Join", st.joined ? 150 : 180, 856); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "arrays 6.2 m across"], capsule: ["Sample capsule", "#ffd166", "came home in 2023"], headL: ["Sampler head", "#cfd6dd", "diagram"],
  gasL: ["A puff of gas", "#cfe6ff", "stirs up pebbles"], sinkL: ["Sank almost 0.5 m", "#ff6b5e", ""], stuckL: ["2 of 35 fasteners", "#ff6b5e", "wouldn't come off"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("real", `<div style="width:1080px;text-align:center">${pill("REAL PHOTO · NASA/GODDARD/UNIV. OF ARIZONA")}</div>`, { left: "0px", top: "1120px" });
hudEl("tag", row(card("TOUCHED BENNU", "20 OCT 2020", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("depth", big("dN", "0 cm", "INTO THE SURFACE", "#fff", "#ff6b5e"), { left: "0px", top: "190px" });
hudEl("sec", big("sN", "0 s", "AFTER CONTACT", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("utah", row(card("CAPSULE LANDED", "UTAH · SEPT 2023", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("fixed", row(card("NEW TOOLS", "JAN 2024", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("illus", pill("ILLUSTRATION"), { left: "410px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["PRIVATE SPACE", "ONE-TAP INVITE", "TASKS MOVE"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; OREX.visible = sp; SKYG.visible = sp; CUT.visible = s === "cut"; RING.visible = s === "ring"; ORS.visible = s === "orbi"; BENNU.visible = false;
  scene.fog = null; scene.background = sp ? null : s === "orbi" ? new THREE.Color(0x07080a) : new THREE.Color(0x05070a); }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(1500); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.0 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x8090a8); H.hemi.groundColor.set(0x2a2a2a); H.hemi.intensity = 0.45; H.envK.value = 0.8; H.rimA.intensity = 0.6; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.6; H.key.position.copy(c).add(V(3, 7, 5)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const C0 = V(0, 0.3, 0);

H.frame("Take your team private.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000);

  if (t < at("touch")) { // HOOK (Bennu, real photo) · THIS (the probe near Bennu)
    sets("space"); lightSpace(); skyAt();
    if (t < at("this")) { OREX.visible = false; look(V(0, 0, 30 - 6 * smooth(prog(t, 0, at("this")))), V(0, 0, 0), 40); bennuAt(V(0, -1, -2), lerp(13, 15, prog(t, 0, at("this"))));
      title(t, fr("hook", 0.04), fr("hook", 0.6), "Real photo: asteroid Bennu", "It almost swallowed it", 150); hudShow("real", 1); }
    else { const a = 0.8 + (t - at("this")) * 0.12; move(t, at("this"), at("touch"), [C0.clone().add(V(Math.cos(a) * 12, 3.0, Math.sin(a) * 12)), C0, 40], [C0.clone().add(V(Math.cos(a + 0.1) * 10, 2.4, Math.sin(a + 0.1) * 10)), C0, 40], 0.02);
      bennuAt(H.cam.position.clone().add(V(0, -0.6, -1).normalize().multiplyScalar(400)).add(V(0, -90, 0)), 260);
      callout("nasa", t, fr("this", 0.15), at("touch"), OL(0, 0.2, 0.4), 300, 1390); callout("capsule", t, fr("this", 0.4), at("touch"), OL(0, 1.1, 0), 760, 600); hudShow("tag", win(t, fr("this", 0.5), at("touch"))); }
  } else if (t < at("home")) { // TOUCH · SINK · THRUST (diagram)
    sets("cut"); CUT.updateMatrixWorld(true); lightAt(CUT.position, 0.45);
    const tc = fr("touch", 0.35);                    // contact moment
    let hy, burst = 0;
    if (t < tc) hy = lerp(0.6, 0, smooth(prog(t, at("touch"), tc)));
    else if (t < fr("thrust", 0.4)) hy = -0.48 * smooth(prog(t, tc, fr("sink", 0.9)));
    else { hy = -0.48 + 1.2 * smooth(prog(t, fr("thrust", 0.4), at("home"))); burst = smooth(prog(t, fr("thrust", 0.4), at("home"))); }
    touch(t, hy, burst);
    move(t, at("touch"), at("home"), [CW(0.4, 0.3, 4.2), CW(0, -0.2, 0), 36], [CW(0.2, 0.1, 3.4), CW(0, -0.3, 0), 36], 0.01);
    if (t < at("sink")) { callout("headL", t, at("touch") + 0.2, at("sink"), CW(0.12, hy + 0.05, 0.1), 760, 600); callout("gasL", t, fr("touch", 0.45), at("sink"), CW(-0.35, hy + 0.25, 0), 300, 1000); }
    else if (t < at("thrust")) { H.$("dN").textContent = `${Math.round(Math.max(0, -hy) * 100)} cm`; hudShow("depth", 1); callout("sinkL", t, fr("sink", 0.4), at("thrust"), CW(0, hy, 0.1), 760, 1000); }
    else { H.$("sN").textContent = `${Math.min(6, Math.round(6 * prog(t, at("thrust"), fr("thrust", 0.4))))} s`; hudShow("sec", win(t, at("thrust"), at("home"))); }
    hudShow("diag", 1);
  } else if (t < at("orbi")) { // HOME · STUCK · TOOLS
    if (t < at("stuck")) { sets("space"); lightSpace(); skyAt(); OREX.visible = false; look(V(0, 0, 26), V(0, 0, 0), 40); bennuAt(V(0, -1, -2), 14); hudShow("real", 1); hudShow("utah", win(t, fr("home", 0.1), at("stuck"))); }
    else { sets("ring"); RING.updateMatrixWorld(true); lightAt(RING.position, 0.4); const kOut = smooth(prog(t, fr("stuck", 0.3), fr("stuck", 0.6))), kRed = smooth(prog(t, fr("stuck", 0.5), fr("stuck", 0.7))), kFix = smooth(prog(t, fr("tools", 0.4), at("orbi") - 0.3)); bolts(kRed, kFix, kOut);
      move(t, at("stuck"), at("orbi"), [RW(0, 5.2, 4.4), RW(0, 0, 0.2), 38], [RW(0, 4.4, 3.7), RW(0, 0, 0.2), 38], 0.01);
      if (t < at("tools")) callout("stuckL", t, fr("stuck", 0.6), at("tools"), RW(Math.cos(7 / 35 * TAU) * 1.05, 0.12, Math.sin(7 / 35 * TAU) * 1.05), 760, 1000); else hudShow("fixed", win(t, fr("tools", 0.3), at("orbi")));
      hudShow("diag", 1); }
  } else { // ORBI: go private with the team
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const press = t > fr("orbi2", 0.1) && t < fr("orbi2", 0.25), done = t > fr("orbi2", 0.25), invite = t > fr("orbi2", 0.3), join = t > fr("orbi2", 0.75), joined = t > fr("orbi2", 0.85);
    screen(PA, { press, done }, drawA); screen(PB, { invite, join, joined }, drawB);
    const A0 = [OW(-0.45, 1.3, 2.35), OW(-0.55, 1.25, 0), 36], B0 = [OW(0.45, 1.3, 2.35), OW(0.55, 1.25, 0), 36];
    if (t < fr("orbi2", 0.28)) move(t, at("orbi"), fr("orbi2", 0.28), [OW(0.0, 1.6, 4.6), OW(-0.3, 1.25, 0), 36], A0, 0.02);
    else if (t < fr("orbi2", 0.4)) move(t, fr("orbi2", 0.28), fr("orbi2", 0.4), A0, B0, 0.0);
    else if (t < at("orbi3")) move(t, fr("orbi2", 0.4), at("orbi3"), B0, B0, 0.01);
    else move(t, at("orbi3"), end("end") + 1.5, B0, [OW(0, 1.4, 4.4), OW(0, 1.25, 0), 36], 0.02);
    hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
