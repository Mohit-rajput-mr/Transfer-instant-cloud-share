// Cassini's Grand Finale. NASA's Cassini-Huygens 3D model (NASA 3D Resources, "(A)", free and without copyright).
// Facts (NASA/JPL): at Saturn from 2004 to 2017 (13 years); found that Enceladus sprays water into space from an ocean under its
// ice; low on fuel, it was sent into Saturn so it could never hit and contaminate a moon like Enceladus; its Grand Finale: 22
// weekly dives between Saturn and its rings, never done before; on 15 Sept 2017 it plunged into Saturn, sending data to the end;
// the last signal reached Earth 83 minutes later (~1.4 billion km). Real image: "Backlit Saturn from Cassini Orbiter 2007 May 9"
// (NASA/JPL/Space Science Institute, public domain).
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
const SUN = V(0.8, 0.25, 0.55).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
// SATURN (illustration at real proportions: equatorial radius 60,268 km; rings C 74,658–92,000 km, B 92,000–117,580 km,
// Cassini Division to 122,170 km, A to 136,775 km; 1 unit = 100 km): banded sphere + ring disk with the real radii.
const SAT = new THREE.Group(); scene.add(SAT); SAT.visible = false;
const SR_ = 602.68;
const SATU = { uSun: { value: SUN }, uT: { value: 0 } };
{ const g = new THREE.SphereGeometry(SR_, 192, 96); g.scale(1, 0.902, 1);   // Saturn is ~10% flattened
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: SATU,
    vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uT; varying vec3 vN; varying vec3 vP; varying vec3 vW; ${NOISE}
      void main(){ vec3 n = normalize(vN); float lat = vP.y / ${"602.68"}; float l = max(dot(n, uSun), 0.0);
        float bands = 0.5 + 0.5 * sin(lat * 38.0 + fbm(vec3(vP.x * 0.004, lat * 6.0, vP.z * 0.004)) * 3.0);
        vec3 c = mix(vec3(0.83, 0.72, 0.52), vec3(0.93, 0.86, 0.68), bands); c = mix(c, vec3(0.62, 0.66, 0.72), smoothstep(0.75, 0.95, abs(lat)));
        vec3 v = normalize(cameraPosition - vW); float limb = pow(max(dot(n, v), 0.0), 0.35);
        gl_FragColor = vec4(c * (0.04 + 1.35 * l) * (0.6 + 0.4 * limb), 1.0); }` }));
  SAT.add(m);
  const R0 = 746.58, R1 = 1367.75, rg = new THREE.RingGeometry(R0, R1, 360, 4); const pos = rg.attributes.position, uv = rg.attributes.uv; for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - R0) / (R1 - R0), 0.5); }
  const ring = new THREE.Mesh(rg, new THREE.ShaderMaterial({ uniforms: SATU, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: `varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec2 vU; varying vec3 vW; ${NOISE}
      void main(){ float r = 746.58 + vU.x * (1367.75 - 746.58);
        float a = 0.0; if (r < 920.0) a = 0.25; else if (r < 1175.8) a = 0.85; else if (r < 1221.7) a = 0.06; else a = 0.6;
        a *= 0.75 + 0.25 * nz(vec3(r * 0.35, 0.0, 0.0)); vec3 c = mix(vec3(0.7, 0.64, 0.55), vec3(0.95, 0.9, 0.8), smoothstep(900.0, 1175.0, r));
        gl_FragColor = vec4(c * 1.1, a); }` }));
  ring.rotation.x = -Math.PI / 2; SAT.add(ring); SAT.rotation.z = 0.47; }   // Saturn's 26.7° tilt

// =====================================================================================================================
// CASSINI: NASA's own model (×0.58 → metres: 6.8 m tall). Dish on top (+y), magnetometer boom along −z.
// =====================================================================================================================
const CAS = new THREE.Group(); scene.add(CAS);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/cassini/cassini-nasa-A.glb");
  gl.scene.scale.setScalar(0.58); gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.side = THREE.DoubleSide; m.envMapIntensity = 1.0; } });
  CAS.add(gl.scene); }
const CL = (x, y, z) => CAS.localToWorld(V(x, y, z));
const CC = V(0, -1.4, -1);

// =====================================================================================================================
// REAL PHOTOS as billboards (Saturn backlit by the Sun, NASA/JPL/SSI, public domain; Enceladus if downloaded)
// =====================================================================================================================
function photoBoard(url) { const t = tex(url, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, depthWrite: false, color: 0xe6e6e6 }));
  m.renderOrder = -5; scene.add(m); m.visible = false; m.userData.t = t; return m; }
const SATPHOTO = photoBoard("ref/saturn_backlit_cassini.jpg");
const IMGA = await img("ref/saturn_backlit_cassini.jpg"); const SAT_AR = IMGA ? IMGA.width / IMGA.height : 1.5;
const ENC = await img("ref/enceladus_plumes.jpg"); const ENCPHOTO = ENC ? photoBoard("ref/enceladus_plumes.jpg") : null; const ENC_AR = ENC ? ENC.width / ENC.height : 1;
function board(m, ar, pos, h) { m.visible = true; m.position.copy(pos); m.scale.set(h * ar, h, 1); m.quaternion.copy(H.cam.quaternion); }

// =====================================================================================================================
// ENCELADUS (illustration, if no real image): an icy moon with jets of water rising from its south pole
// =====================================================================================================================
const ENCG = new THREE.Group(); scene.add(ENCG); ENCG.position.set(-9000, 0, 0); ENCG.visible = false;
{ const moon = new THREE.Mesh(new THREE.SphereGeometry(2.52, 96, 48), new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 0.75, metalness: 0 })); ENCG.add(moon); }
const JETS = Array.from({ length: 900 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0xdfefff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })); ENCG.add(m); return m; });
function jets(t, k) { JETS.forEach((m, i) => { const u = (t * 0.18 + hash(i * 3.1)) % 1; const j = i % 4; const base = V(-0.9 + j * 0.6, -2.4, (hash(i) - 0.5) * 0.6); const dir = V((hash(i * 1.7) - 0.5) * 0.22, -1, (hash(i * 2.9) - 0.5) * 0.22).normalize();
  m.position.copy(base).addScaledVector(dir, u * 4.5); m.visible = k > 0.01; m.material.opacity = 0.35 * k * (1 - u); m.scale.setScalar(1 + u * 1.2); }); }
const EW = (x, y, z) => ENCG.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE FINALE (diagram): Saturn and its rings from above the ring plane; Cassini's last orbits threaded the gap between the
// planet and the innermost rings (drawn), 22 times; then the final plunge.
// =====================================================================================================================
const FIN = new THREE.Group(); scene.add(FIN); FIN.visible = false;
const ORBITS = (() => { const g = new THREE.Group(); for (let i = 0; i < 1; i++) { const pts = []; for (let k = 0; k <= 400; k++) { const a = k / 400 * TAU; const r = 680 + 2200 * (1 - Math.cos(a)) / 2; pts.push(V(Math.cos(a) * r, Math.sin(a) * 900 * 0.3, Math.sin(a) * r * 0.25)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x9fd4ff, dashSize: 20, gapSize: 14, transparent: true, opacity: 0.8 }))); g.children[0].computeLineDistances(); } FIN.add(g); return g; })();
const CDOT = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12), glow(0xffd166, 4)); FIN.add(CDOT);

// =====================================================================================================================
// ORBI: two phones. Left: the sender's file with its red Destroy ×; tap → "Object destroyed". Right: a viewer's screen — the
// file is gone. (Void.tsx destroy: deleted on the server, gone for everyone at once; only the sender holds the key.)
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PA = makePhone(), PB = makePhone(); ORS.add(PA.g, PB.g); PA.g.position.set(-0.55, 1.25, 0); PB.g.position.set(0.55, 1.25, 0); PA.g.scale.setScalar(1.05); PB.g.scale.setScalar(1.05); PA.g.rotation.y = 0.12; PB.g.rotation.y = -0.12;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  for (const x of [-0.55, 0.55]) { const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.set(x, 0.05, 0); ORS.add(ped); } }
const IMG = { ph: await img("shots_live/phone.png") };
function bg(g) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.5)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); } }
function bubble(g, st, mine) { const cx = 390, cy = 700, R = 230; const k = st.gone;
  if (k >= 1) return; g.globalAlpha = 1 - k; const s = 1 - 0.6 * k;
  const gr = g.createRadialGradient(cx - 70, cy - 80, 20, cx, cy, R * s); gr.addColorStop(0, "rgba(255,255,255,.22)"); gr.addColorStop(0.7, "rgba(120,170,255,.08)"); gr.addColorStop(1, "rgba(160,200,255,.28)");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * s, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#fff"; g.font = "800 44px M"; g.textAlign = "center"; g.fillText("finale-plan.pdf", cx, cy - 6); g.fillStyle = "#9aa3ad"; g.font = "600 28px M"; g.fillText("3.2 MB", cx, cy + 40);
  if (mine) { g.fillStyle = st.press ? "#ff2d1f" : "#ff4a3d"; g.beginPath(); g.arc(cx + R * 0.72 * s, cy - R * 0.72 * s, 42 * s, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.font = "900 52px D"; g.fillText("×", cx + R * 0.72 * s, cy - R * 0.72 * s + 18); }
  g.textAlign = "left"; g.globalAlpha = 1; }
function drawA(g, st) { bg(g); g.fillStyle = "#cfd6dd"; g.font = "800 34px M"; g.fillText("You sent", 60, 420); bubble(g, st, true);
  if (st.toast) { g.fillStyle = "rgba(20,22,26,.95)"; rr(g, 160, 980, 460, 84, 42); g.fill(); g.strokeStyle = "#ff4a3d"; g.lineWidth = 2; g.stroke(); g.fillStyle = "#ff6b5e"; g.font = "800 32px M"; g.textAlign = "center"; g.fillText("Object destroyed", 390, 1034); g.textAlign = "left"; } }
function drawB(g, st) { bg(g); g.fillStyle = "#cfd6dd"; g.font = "800 34px M"; g.fillText("Someone else", 60, 420); bubble(g, st, false);
  if (st.gone >= 1) { g.fillStyle = "#7d848c"; g.font = "700 32px M"; g.textAlign = "center"; g.fillText("gone", 390, 710); g.textAlign = "left"; } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "6.8 m tall"], dish: ["High-gain dish", "#cfe6ff", "4 m"], encL: ["Enceladus", "#cfe6ff", "504 km wide"], jetsL: ["Water jets", "#9fd4ff", "from an ocean under the ice"],
  gapL: ["The gap", "#ffd166", "between planet and rings"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("real", `<div style="width:1080px;text-align:center">${pill("REAL PHOTO · NASA/JPL/SPACE SCIENCE INSTITUTE")}</div>`, { left: "0px", top: "1120px" });
hudEl("realE", `<div style="width:1080px;text-align:center">${pill("REAL CASSINI DATA · PROCESSED BY KEVIN M. GILL · CC BY")}</div>`, { left: "0px", top: "1120px" });
hudEl("years", row(card("AT SATURN", "2004–2017", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("fuel", row(card("FUEL", "RUNNING LOW", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("dives", big("dvN", "0", "DIVES THROUGH THE GAP", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("date", row(card("THE PLUNGE", "15 SEPT 2017", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("sig", big("sgN", "0 min", "LAST SIGNAL ON ITS WAY", "#fff", "#9fd4ff"), { left: "0px", top: "190px" });
hudEl("dist", row(card("DISTANCE", "~1.4 BILLION km", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("illus", pill("ILLUSTRATION"), { left: "410px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["DESTROY ANY TIME", "GONE FOR EVERYONE", "ONLY THE SENDER"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; CAS.visible = sp; SKYG.visible = sp || s === "fin" || s === "photo" || s === "enc"; SAT.visible = s === "fin" || s === "sat"; ENCG.visible = s === "enc" && !ENCPHOTO; FIN.visible = s === "fin"; ORS.visible = s === "orbi";
  SATPHOTO.visible = false; if (ENCPHOTO) ENCPHOTO.visible = false; scene.fog = null; scene.background = s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(900); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.0 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x9a8f7a); H.hemi.groundColor.set(0x2a2622); H.hemi.intensity = 0.45; H.envK.value = 0.8; H.rimA.intensity = 0.6; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(3, 6, 5)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));

H.frame("Gone, when you say so.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.35; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 60000); SATU.uT.value = t;

  if (t < at("this")) { // HOOK: the real backlit Saturn photo
    sets("photo"); look(V(0, 0, 30), V(0, 0, 0), 40); board(SATPHOTO, SAT_AR, V(0, 0.5, 0), lerp(10.5, 12.5, prog(t, 0, at("this")))); skyAt(); sunGlow.visible = false;
    title(t, fr("hook", 0.04), fr("hook", 0.6), "Real photo, taken by Cassini", "Crashed on purpose", 150); hudShow("real", 1);
  } else if (t < at("ocean")) { // THIS: Cassini, Saturn behind
    sets("space"); SAT.visible = true; SAT.position.set(-800, -300, -3200); lightSpace(); skyAt(); sunGlow.visible = true;
    const a = 0.6 + (t - at("this")) * 0.12; move(t, at("this"), at("ocean"), [CC.clone().add(V(Math.cos(a) * 17, 4, Math.sin(a) * 17)), CC, 40], [CC.clone().add(V(Math.cos(a + 0.1) * 15, 3.4, Math.sin(a + 0.1) * 15)), CC, 40], 0.02);
    callout("nasa", t, fr("this", 0.15), at("ocean"), CL(0, -2, 0), 300, 1390); callout("dish", t, fr("this", 0.35), at("ocean"), CL(0, 2.4, 0), 760, 600); hudShow("years", win(t, fr("this", 0.4), at("ocean")));
  } else if (t < at("dives")) { // OCEAN · RISK: Enceladus' jets
    sets("enc"); skyAt(); sunGlow.visible = false;
    if (ENCPHOTO) { look(V(0, 0, 30), V(0, 0, 0), 40); board(ENCPHOTO, ENC_AR, V(0, 0.3, 0), lerp(11, 13, prog(t, at("ocean"), at("dives")))); hudShow("realE", 1); }
    else { ENCG.updateMatrixWorld(true); lightAt(ENCG.position.clone().add(V(0, 0, 0)), 0.15); H.key.position.copy(ENCG.position).add(V(20, 6, 8)); jets(t, smooth(prog(t, at("ocean"), fr("ocean", 0.4))));
      move(t, at("ocean"), at("dives"), [EW(5, -2.5, 15), EW(0, -2.8, 0), 40], [EW(4.4, -2.6, 13.2), EW(0, -3.0, 0), 40], 0.02); hudShow("illus", 1);
      callout("encL", t, fr("ocean", 0.1), at("risk"), EW(0.8, 1.6, 2), 760, 600); callout("jetsL", t, fr("ocean", 0.4), at("risk"), EW(-0.3, -4.2, 0), 300, 1000); }
    hudShow("fuel", win(t, fr("risk", 0.25), at("dives")));
  } else if (t < at("signal")) { // DIVES (diagram) · PLUNGE
    if (t < at("plunge")) { sets("fin"); SAT.position.set(0, 0, 0); H.key.position.copy(SUN).multiplyScalar(8000); H.key.target.position.set(0, 0, 0); H.key.intensity = 2.2; H.hemi.intensity = 0.1; skyAt(); sunGlow.visible = false;
      FIN.rotation.copy(SAT.rotation); const k = prog(t, at("dives"), at("plunge")); const n = Math.min(22, Math.floor(k * 23)); const a = (k * 22 % 1) * TAU; const r = 680 + 2200 * (1 - Math.cos(a)) / 2; CDOT.position.set(Math.cos(a) * r, Math.sin(a) * 900 * 0.3, Math.sin(a) * r * 0.25);
      look(V(800, 1600, 4200), V(300, 0, 0), 40); H.$("dvN").textContent = String(n); hudShow("dives", 1); hudShow("diag", 1); FIN.updateMatrixWorld(true); callout("gapL", t, fr("dives", 0.1), at("plunge"), FIN.localToWorld(V(680, 0, 0)), 760, 1000); }
    else { sets("space"); SAT.visible = true; SAT.position.set(0, -600, -260); lightSpace(); skyAt(); sunGlow.visible = true; const k = smooth(prog(t, at("plunge"), at("signal")));
      CAS.position.set(0, -k * 18, -k * 30); CAS.rotation.set(-0.4 * k, 0, 0.1 * k); move(t, at("plunge"), at("signal"), [V(14, 6, 22), V(0, -3, -6), 42], [V(10, 2, 16), V(0, -12, -24), 42], 0.03);
      hudShow("date", win(t, fr("plunge", 0.1), at("signal"))); }
  } else if (t < at("orbi")) { // SIGNAL: 83 minutes
    sets("photo"); look(V(0, 0, 30), V(0, 0, 0), 40); board(SATPHOTO, SAT_AR, V(0, 0.5, 0), lerp(12.5, 9.5, prog(t, at("signal"), at("orbi")))); skyAt(); sunGlow.visible = false;
    H.$("sgN").textContent = `${Math.round(83 * smooth(prog(t, at("signal"), fr("signal", 0.8))))} min`; hudShow("sig", 1); hudShow("dist", win(t, fr("signal", 0.2), at("orbi"))); hudShow("real", 1);
  } else { // ORBI: destroy, gone for everyone
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const press = t > fr("orbi2", 0.15) && t < fr("orbi2", 0.3); const gone = smooth(prog(t, fr("orbi2", 0.28), fr("orbi2", 0.45))); const toast = t > fr("orbi2", 0.3);
    screen(PA, { press, gone, toast }, drawA); screen(PB, { gone: smooth(prog(t, fr("orbi2", 0.32), fr("orbi2", 0.5))) }, drawB);
    const A0 = [OW(-0.45, 1.3, 2.35), OW(-0.55, 1.25, 0), 36], W0 = [OW(0, 1.45, 4.2), OW(0, 1.25, 0), 36];
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.0, 1.6, 4.8), OW(-0.3, 1.25, 0), 36], A0, 0.02);
    else if (t < fr("orbi2", 0.4)) move(t, at("orbi2"), fr("orbi2", 0.4), A0, A0, 0.01);
    else move(t, fr("orbi2", 0.4), end("end") + 1.5, A0, W0, 0.02);
    hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
