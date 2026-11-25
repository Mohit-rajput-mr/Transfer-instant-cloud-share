// The orbiter that photographed a landing. NASA's Mars Reconnaissance Orbiter 3D model (NASA 3D Resources, "MRO (C)", free and
// without copyright). Facts (NASA/JPL, HiRISE team, Univ. of Arizona): on 25 May 2008 HiRISE photographed the Phoenix lander hanging
// under its parachute, ~13 km above the surface, seconds after the chute opened; MRO was at 310 km altitude, 760 km from Phoenix,
// moving at 3.4 km/s; the crater behind (Heimdal, ~10 km wide) only appears to be under Phoenix — it is ~20 km behind it; JPL: the
// first time a spacecraft imaged the final descent of another spacecraft onto a planetary body. HiRISE: 0.5 m telescope mirror,
// ~30 cm per pixel from ~300 km. Real image: "Descent of Phoenix with a crater in the background" (NASA/JPL-Caltech/Univ. of
// Arizona, public domain).
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
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
const SUN = V(0.6, 0.45, -0.66).normalize();
// MARS below (generic: rusty terrain from noise + a sand texture; no named features are shown). 1:1000 like the Hubble film.
const RM = 3390, ALT = 300;
const MARSG = new THREE.Group(); scene.add(MARSG); MARSG.position.set(0, -(RM + ALT), 0); MARSG.rotation.z = Math.PI / 2 - 0.4;   // a mid-latitude below, not the pole
const MU = { uSun: { value: SUN }, uT: { value: 0 }, uTex: { value: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 40, 20) } };
{ const ground = new THREE.Mesh(new THREE.SphereGeometry(RM, 256, 128), new THREE.ShaderMaterial({ uniforms: MU,
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; void main(){ vU = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uSun; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; ${NOISE}
      void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float l = dot(n, uSun);
        float a = fbm(vP * 0.004), b = fbm(vP * 0.02 + 3.0), c = fbm(vP * 0.1 + 7.0);
        vec3 rust = mix(vec3(0.55, 0.26, 0.14), vec3(0.78, 0.48, 0.3), a); rust = mix(rust, vec3(0.32, 0.18, 0.12), smoothstep(0.55, 0.75, b) * 0.6);
        rust *= 0.75 + 0.5 * c; rust *= 0.8 + 0.4 * texture2D(uTex, vU).r;
        float cap = smoothstep(0.9, 0.96, abs(normalize(vP).y)); rust = mix(rust, vec3(0.92, 0.9, 0.88), cap);
        vec3 col = rust * max(l, 0.0) * 1.6 + rust * 0.02;
        float f = pow(1.0 - max(dot(n, v), 0.0), 4.0); col = mix(col, vec3(0.85, 0.6, 0.45) * max(l + 0.2, 0.0), clamp(f * 0.5, 0.0, 0.45));
        gl_FragColor = vec4(col, 1.0); }` }));
  MARSG.add(ground);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RM + 40, 128, 64), new THREE.ShaderMaterial({ uniforms: MU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float f = pow(clamp(1.0 + dot(n, v), 0.0, 1.0), 4.0); float r = clamp(dot(-n, uSun) * 0.8 + 0.4, 0.0, 1.0); gl_FragColor = vec4(vec3(0.9, 0.55, 0.35) * r * f * 0.8, 1.0); }` }));
  MARSG.add(atm); }

// =====================================================================================================================
// MRO: NASA's own model (≈ metres: 13.2 units tip to tip of the arrays — real 13.6 m). Arrays along x, the dish on +z side.
// =====================================================================================================================
const MRO = new THREE.Group(); scene.add(MRO);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/mro/mro-nasa-C.glb");
  gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) { m.map.anisotropy = 8; } m.side = THREE.DoubleSide; m.envMapIntensity = 1.0; } });
  MRO.add(gl.scene); }
const ML = (x, y, z) => MRO.localToWorld(V(x, y, z));
const MC = V(0, 0, 0.3);

// =====================================================================================================================
// THE REAL PHOTO (NASA/JPL-Caltech/University of Arizona, public domain) on a big panel in a dark room; the camera pans over it.
// Image 1280×637 → panel 8.04 × 4.0. Pixel (px, py) → panel point.
// =====================================================================================================================
const PHOTO = new THREE.Group(); scene.add(PHOTO); PHOTO.position.set(-9000, 0, 0); PHOTO.visible = false;
const PW_ = 8.04, PH_ = 4.0;
{ const t = tex("ref/phoenix_descent_hirise.jpg", true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(PW_, PH_), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: 0xe8e8e8 })); PHOTO.add(m);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(PW_ + 0.04, PH_ + 0.04)), new THREE.LineBasicMaterial({ color: 0x3a3f46 })); PHOTO.add(frame); }
const PXL = (px, py, z = 0) => PHOTO.localToWorld(V((px / 1280 - 0.5) * PW_, (0.5 - py / 637) * PH_, z));
const CHUTE_PX = [297, 289], INSET_PX = [92, 548];

// =====================================================================================================================
// THE GEOMETRY (diagram): Mars' surface seen from the side; the crater ~10 km wide, Phoenix ~13 km up and ~20 km in front of
// it; MRO 310 km up, its line of sight 760 km long. Drawn to scale horizontally only around the crater (the orbit is far).
// 1 unit = 1 km.
// =====================================================================================================================
const GEO = new THREE.Group(); scene.add(GEO); GEO.position.set(9000, 0, 0); GEO.visible = false;
{ const g = new THREE.PlaneGeometry(220, 120, 220, 120); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x - 20, z); let h = Math.sin(x * 0.05) * Math.cos(z * 0.07) * 0.4; if (r < 6) h -= 1.4 * (1 - (r / 6) ** 2); if (r > 5 && r < 7) h += 0.6 * Math.sin((r - 5) / 2 * Math.PI); p.setY(i, h); }
  g.computeVertexNormals(); const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 20, 12), color: 0xc08a68, roughness: 0.95 })); ground.receiveShadow = true; GEO.add(ground); }
const GP = V(0, 13, 0);   // Phoenix, 13 km up, 20 km in front of the crater (crater centre at x = 20)
const PHX = new THREE.Group(); GEO.add(PHX); PHX.position.copy(GP);
{ const chute = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 12, 0, TAU, 0, 1.0), new THREE.MeshStandardMaterial({ color: 0xf2efe8, side: THREE.DoubleSide, emissive: new THREE.Color(0x222222) })); chute.position.y = 1.8; PHX.add(chute);
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(0.9, 2.3, 0), V(0, 0.3, 0), V(-0.9, 2.3, 0), V(0, 0.3, 0), V(0, 2.3, 0.9), V(0, 0.3, 0), V(0, 2.3, -0.9), V(0, 0.3, 0)]), new THREE.LineBasicMaterial({ color: 0xd8d2c4 })); PHX.add(lines);
  const shell = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0xe0ddd6, roughness: 0.6 })); shell.position.y = 0.05; PHX.add(shell); PHX.scale.setScalar(1.6); }
const SIGHT = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), glow(0x9fd4ff, 3)); GEO.add(SIGHT);
const SIGHT_FROM = V(-160, 140, -40);   // toward MRO (off-frame; the real distance is 760 km)
{ const mid = GP.clone().lerp(SIGHT_FROM, 0.5); SIGHT.position.copy(mid); SIGHT.scale.set(1, GP.distanceTo(SIGHT_FROM), 1); SIGHT.quaternion.setFromUnitVectors(V(0, 1, 0), SIGHT_FROM.clone().sub(GP).normalize()); }
const DIST = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0.4, 0), V(20, 0.4, 0)]), new THREE.LineDashedMaterial({ color: 0xffd166, dashSize: 0.8, gapSize: 0.5 })); DIST.computeLineDistances(); GEO.add(DIST);
const GW = (x, y, z) => GEO.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: a received note (Panels.tsx RichText → Notepad.tsx): links, emails, phone numbers and long codes found and tappable;
// "Open in notepad" → the whole note, "Copy all".
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
const NOTE = [["Landing call moved, new link:", ""], ["https://meet.example.com/phx", "link"], ["Questions: ops@example.com", "email"], ["Night line: +1 555 0142 8890", "phone"], ["Room code: K7QX42", "code"]];
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "rgba(8,10,14,.96)"; rr(g, 30, 330, 720, 800, 34); g.fill(); g.strokeStyle = "rgba(255,255,255,.15)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#fff"; g.font = "900 44px D"; g.fillText("Note", 70, 410); g.fillStyle = "#7d848c"; g.font = "600 26px M"; g.fillText("encrypted like any file · nothing downloaded", 70, 452);
  NOTE.forEach(([s, kind], i) => { const y = 540 + i * 110; const on = kind && st.hi > i - 1; g.font = kind ? "700 32px M" : "600 32px M";
    const [lab, val] = kind && kind !== "link" && s.includes(": ") ? [s.slice(0, s.indexOf(": ") + 1), s.slice(s.indexOf(": ") + 2)] : ["", s];
    let x = 70; if (lab) { g.fillStyle = "#cfd6dd"; g.fillText(lab, x, y); x += g.measureText(lab + " ").width; }
    if (kind) { const w = g.measureText(val).width; if (on) { g.fillStyle = "rgba(77,168,255,.16)"; rr(g, x - 8, y - 38, w + 16, 52, 12); g.fill(); } g.fillStyle = on ? "#6fc8ff" : "#cfd6dd"; g.fillText(val, x, y); if (on) { g.fillRect(x, y + 8, w, 3); } }
    else { g.fillStyle = "#cfd6dd"; g.fillText(val, x, y); } });
  g.fillStyle = st.copied ? green : "rgba(255,255,255,.1)"; rr(g, 70, 1010, 300, 84, 42); g.fill(); g.fillStyle = st.copied ? "#05150b" : "#fff"; g.font = "800 32px M"; g.fillText(st.copied ? "Copied" : "Copy all", 120, 1064);
  g.fillStyle = "rgba(255,255,255,.1)"; rr(g, 390, 1010, 320, 84, 42); g.fill(); g.fillStyle = "#fff"; g.fillText("Select all", 450, 1064); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  chuteL: ["Phoenix on its parachute", "#ffd166", "~13 km up"], craterL: ["The crater", "#cfd6dd", "~10 km wide · ~20 km behind"], nasa: ["NASA's own 3D model", "#9fd4ff", "13.6 m across"],
  dishL: ["High-gain dish", "#cfe6ff", "3 m"], phxG: ["Phoenix", "#ffd166", "13 km up"], craterG: ["Crater", "#cfd6dd", "20 km behind"], sightL: ["To MRO", "#9fd4ff", "760 km away"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("real", `<div style="width:1080px;text-align:center">${pill("REAL PHOTO · NASA/JPL-CALTECH/UNIV. OF ARIZONA")}</div>`, { left: "0px", top: "1120px" });
hudEl("date", row(card("TAKEN", "25 MAY 2008", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("illusion", row(card("NOT FALLING IN", "~20 km IN FRONT", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("hirise", row(card("HIRISE MIRROR", "0.5 m", "#cfe6ff"), card("ONE PIXEL", "~30 cm", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("speed", row(card("DISTANCE", "760 km", "#9fd4ff"), card("SPEED", "3.4 km/s", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("first", row(card("A FIRST", "ONE SPACECRAFT, CAUGHT BY ANOTHER", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("tinyc", row(card("CRATER", "~10 km", "#cfd6dd"), card("PARACHUTE", "A FEW PIXELS", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["LINKS · EMAILS · PHONES · CODES", "COPY ALL"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; MARSG.visible = MRO.visible = sp; SKYG.visible = sp; PHOTO.visible = s === "photo"; GEO.visible = s === "geo"; ORS.visible = s === "orbi";
  scene.fog = null; scene.background = s === "photo" ? new THREE.Color(0x050608) : s === "geo" ? new THREE.Color(0xc79a78) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(1800); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.0 * k; H.key.position.copy(SUN).multiplyScalar(60); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 140 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x9a8a7a); H.hemi.groundColor.set(0x5a3020); H.hemi.intensity = 0.5; H.envK.value = 0.8; H.rimA.intensity = 0.5; H.rimB.intensity = 0.3; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(30, 60, 40)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0xe0b090); H.hemi.groundColor.set(0x7a4a30); H.hemi.intensity = hemi; H.envK.value = 0.5; H.rimA.intensity = 0.6; H.rimB.intensity = 0.4; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const camOn = (px, py, d) => { const p = PXL(px, py); return [p.clone().add(V(0, 0, d)), p, 40]; };

H.frame("Every detail, ready to tap.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000); MU.uT.value = t;

  if (t < at("this")) { // HOOK · WHAT: the real photo; the parachute; the crater behind
    if (t < at("what")) { sets("photo"); PHOTO.updateMatrixWorld(true); move(t, 0, at("what"), camOn(640, 318, 17), camOn(560, 318, 13), 0.0);
      title(t, fr("hook", 0.04), fr("hook", 0.6), "Real photo from Mars orbit", "Falling in?", 150); hudShow("real", 1); hudShow("date", win(t, fr("hook", 0.5), at("what"))); }
    else if (t < fr("what", 0.55)) { sets("photo"); PHOTO.updateMatrixWorld(true); move(t, at("what"), fr("what", 0.55), camOn(560, 318, 13), camOn(INSET_PX[0] + 20, INSET_PX[1] - 20, 2.4), 0.0); hudShow("real", 1);
      callout("chuteL", t, at("what") + 0.4, fr("what", 0.55), PXL(80, 528), 760, 600); }
    else { sets("geo"); GEO.updateMatrixWorld(true); lightAt(GEO.position); move(t, fr("what", 0.55), at("this"), [GW(8, 16, 50), GW(7, 8, 0), 40], [GW(7, 14, 44), GW(7, 8, 0), 40], 0.01);
      callout("phxG", t, fr("what", 0.6), at("this"), GW(0, 15, 0), 300, 600); callout("craterG", t, fr("what", 0.7), at("this"), GW(20, 0.5, 0), 760, 1000); hudShow("illusion", win(t, fr("what", 0.65), at("this"))); hudShow("diag", 1); }
  } else if (t < at("first")) { // THIS · CAM · SHOT: the orbiter over Mars
    sets("space"); lightSpace(); skyAt();
    if (t < at("cam")) { const a = 0.6 + (t - at("this")) * 0.12; move(t, at("this"), at("cam"), [MC.clone().add(V(Math.cos(a) * 26, 7, Math.sin(a) * 26)), MC, 40], [MC.clone().add(V(Math.cos(a + 0.1) * 23, 6, Math.sin(a + 0.1) * 23)), MC, 40], 0.02);
      callout("nasa", t, fr("this", 0.25), at("cam"), ML(0, 0.5, 0.5), 300, 1390); }
    else if (t < at("shot")) { move(t, at("cam"), at("shot"), [V(9, -6, 13), V(0, -1, 0.5), 40], [V(7, -5, 10.5), V(0, -1.2, 0.5), 40], 0.02); hudShow("hirise", win(t, fr("cam", 0.2), at("shot")));
      callout("dishL", t, fr("cam", 0.1), fr("cam", 0.5), ML(0, -0.5, 1.4), 760, 700); }
    else { const k = prog(t, at("shot"), at("first")); MRO.rotation.set(0, 0, -0.35 * smooth(clamp(k * 1.4))); move(t, at("shot"), at("first"), [V(-14, 4, 22), V(0, -3, 0), 42], [V(-12, 2, 18), V(0, -4, 0), 42], 0.04); hudShow("speed", win(t, fr("shot", 0.2), at("first"))); }
  } else if (t < at("orbi")) { // FIRST · TINY: back to the real photo — from the whole crater down to the few pixels
    sets("photo"); PHOTO.updateMatrixWorld(true); hudShow("real", 1);
    if (t < at("tiny")) { move(t, at("first"), at("tiny"), camOn(640, 318, 17), camOn(600, 318, 15), 0.0); hudShow("first", win(t, fr("first", 0.15), at("tiny"))); }
    else { if (t < fr("tiny", 0.5)) move(t, at("tiny"), fr("tiny", 0.5), camOn(600, 318, 15), camOn(CHUTE_PX[0], CHUTE_PX[1], 1.6), 0.0);
      else move(t, fr("tiny", 0.5), at("orbi"), camOn(CHUTE_PX[0], CHUTE_PX[1], 1.6), camOn(INSET_PX[0] + 20, INSET_PX[1] - 20, 2.0), 0.0);
      hudShow("tinyc", win(t, fr("tiny", 0.1), at("orbi"))); callout("craterL", t, at("tiny") + 0.2, fr("tiny", 0.4), PXL(640, 318), 760, 600); }
  } else { // ORBI: a note, every detail tappable
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const hi = t < at("orbi2") ? -1 : Math.floor(prog(t, at("orbi2"), fr("orbi2", 0.75)) * 5); const copied = t > fr("orbi2", 0.85);
    screen(PH, { hi, copied }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], [OW(-0.15, 1.35, 3.4), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
