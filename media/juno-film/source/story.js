// Juno: pictures made by people at home. NASA's Juno 3D model (NASA 3D Resources, "Juno (A)", free and without copyright).
// Facts (NASA/JPL, SwRI): Juno entered orbit around Jupiter on 4 July 2016; it is solar-powered: three ~9 m arrays with 18,698
// cells, giving only ~500 W at Jupiter; in January 2016 it became the most distant solar-powered spacecraft; its core electronics
// sit in a titanium vault with walls ~1 cm thick (~200 kg with the electronics inside); JunoCam's raw images are posted online for
// anyone, and citizen scientists process them. Real image: "Great red spot juno 20170712" (NASA / SwRI / MSSS / Gerald Eichstädt /
// Seán Doran, public domain).
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
const SUN = V(0.85, 0.2, 0.5).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
// JUPITER (illustration: banded sphere at the real radius 69,911 km, 1 unit = 100 km; no specific storms are claimed)
const JUP = new THREE.Group(); scene.add(JUP); JUP.visible = false;
const JU = { uSun: { value: SUN }, uT: { value: 0 } };
{ const g = new THREE.SphereGeometry(699.11, 192, 96); g.scale(1, 0.935, 1);
  JUP.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: JU,
    vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uT; varying vec3 vN; varying vec3 vP; varying vec3 vW; ${NOISE}
      void main(){ vec3 n = normalize(vN); float lat = vP.y / 699.11; float l = max(dot(n, uSun), 0.0);
        float w = fbm(vec3(vP.x * 0.006 + uT * 0.002, lat * 14.0, vP.z * 0.006)); float b = 0.5 + 0.5 * sin(lat * 46.0 + w * 4.0);
        vec3 c = mix(vec3(0.62, 0.45, 0.33), vec3(0.93, 0.88, 0.8), b); c = mix(c, vec3(0.55, 0.52, 0.55), smoothstep(0.7, 0.95, abs(lat)));
        c *= 0.85 + 0.3 * fbm(vP * 0.02); vec3 v = normalize(cameraPosition - vW);
        gl_FragColor = vec4(c * (0.03 + 1.4 * l) * (0.65 + 0.35 * pow(max(dot(n, v), 0.0), 0.4)), 1.0); }` }))); }

// JUNO: NASA's own model (≈ metres: each solar arm ~9 units vs the real ~9 m). Dish on top (+y), arms in the x–z plane.
const JNO = new THREE.Group(); scene.add(JNO);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/juno/juno-nasa-A.glb");
  gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.side = THREE.DoubleSide; m.envMapIntensity = 0.9; } });
  JNO.add(gl.scene); }
const JL = (x, y, z) => JNO.localToWorld(V(x, y, z));
const JC = V(0, 0, 0);

// =====================================================================================================================
// THE REAL JUNOCAM IMAGE (processed by citizen scientists), as a billboard
// =====================================================================================================================
const GRS = await img("ref/great_red_spot_junocam.jpg");
const GRSB = (() => { if (!GRS) return null; const t = tex("ref/great_red_spot_junocam.jpg", true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, depthWrite: false, color: 0xeeeeee })); m.renderOrder = -5; scene.add(m); m.visible = false; return m; })();
const GRS_AR = GRS ? GRS.width / GRS.height : 1;
function board(m, ar, pos, h) { m.visible = true; m.position.copy(pos); m.scale.set(h * ar, h, 1); m.quaternion.copy(H.cam.quaternion); }

// =====================================================================================================================
// THE VAULT (diagram): a titanium box (walls ~1 cm) with the electronics inside; radiation particles bounce off.
// =====================================================================================================================
const VLT = new THREE.Group(); scene.add(VLT); VLT.position.set(-9000, 0, 0); VLT.visible = false;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.7; fl.receiveShadow = true; VLT.add(fl);
  const ti = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 0.85, roughness: 0.4, clearcoat: 0.2 });
  const W = 1.0, T = 0.06;   // cut-away box: five walls; the front left open to see inside
  [[0, -W / 2, 0, W, T, W], [0, W / 2, 0, W, T, W], [-W / 2, 0, 0, T, W, W], [W / 2, 0, 0, T, W, W], [0, 0, -W / 2, W, W, T]].forEach(([x, y, z, a, b, c]) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(a, b, c), ti)); m.position.set(x, y, z); VLT.add(m); });
  for (let i = 0; i < 6; i++) { const card = sh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.7), new THREE.MeshPhysicalMaterial({ color: 0x1d5a3a, roughness: 0.5, emissive: new THREE.Color(0x0a2a18) }))); card.position.set(-0.32 + i * 0.13, 0, 0.02); VLT.add(card); } }
const RAD = Array.from({ length: 90 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), glow(0xff6b5e, 3)); VLT.add(m); return m; });
function radiation(t) { RAD.forEach((m, i) => { const u = (t * 0.5 + hash(i) ) % 1; const dir = V(hash(i * 3.3) - 0.5, hash(i * 5.1) - 0.5, hash(i * 7.7) - 0.5).normalize(); const d = 2.2 - u * 1.65; const p = dir.clone().multiplyScalar(Math.max(d, 0.62)); if (d < 0.62) p.add(dir.clone().multiplyScalar((0.62 - d) * 1.5)); m.position.copy(p); }); }
const VW = (x, y, z) => VLT.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: the bubble board (BubbleBoard.tsx): one stack per person, one colour each; an edit blinks green and is marked "edited".
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
const PEOPLE = [["Ana", "#ffb340"], ["Kai", "#4ea8ff"], ["Mia", "#3dff8c"]];
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "#fff"; g.font = "900 44px D"; g.fillText("Bubble board", 50, 330);
  const notes = [[0, "Raw set from perijove 7 is up"], [1, "Colour pass done, stretched a bit"], [2, st.edit >= 1 ? "Red Spot crop: final" : "Red Spot crop: draft"], [0, "Adding the south pole next"]];
  notes.slice(0, st.n).forEach(([p, txt], i) => { const [nm, col] = PEOPLE[p]; const y = 390 + i * 190; g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 50, y, 680, 160, 26); g.fill(); g.fillStyle = col; rr(g, 50, y, 12, 160, 6); g.fill();
    g.fillStyle = col; g.font = "800 28px M"; g.fillText(nm, 84, y + 48);
    const edited = i === 2 && st.edit >= 1; g.font = "700 32px M"; if (edited && st.blink) { g.fillStyle = "#cfd6dd"; g.fillText("Red Spot crop: ", 84, y + 104); g.fillStyle = st.blink === 1 ? "#ffffff" : green; g.fillText("final", 84 + g.measureText("Red Spot crop: ").width, y + 104); } else { g.fillStyle = "#e8ecf0"; g.fillText(txt, 84, y + 104); }
    if (edited) { g.fillStyle = "#7d848c"; g.font = "italic 600 24px M"; g.fillText("edited", 600, y + 48); } }); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({ nasa: ["NASA's own 3D model", "#9fd4ff", "arms ~9 m long"], arm: ["Solar arm", "#ffd166", "~9 m"], dish: ["High-gain dish", "#cfe6ff", ""], vaultL: ["Titanium walls", "#cfd6dd", "~1 cm thick"], elecL: ["Electronics", "#3dff8c", "inside"], radL: ["Radiation", "#ff6b5e", ""] });
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("real", `<div style="width:1080px;text-align:center">${pill("REAL JUNOCAM IMAGE · PROCESSED BY CITIZEN SCIENTISTS")}</div>`, { left: "0px", top: "1120px" });
hudEl("arrive", row(card("REACHED JUPITER", "4 JULY 2016", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("cells", big("cN", "0", "SOLAR CELLS", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("watts", row(card("AT JUPITER", "~500 W", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("raw", row(card("RAW IMAGES", "ONLINE, FOR ANYONE", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("illus", pill("ILLUSTRATION"), { left: "410px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["BUBBLE BOARD", "YOUR OWN COLOUR", "EDITS SHOWN"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; JNO.visible = sp; JUP.visible = sp || s === "jup"; SKYG.visible = sp || s === "photo" || s === "jup"; VLT.visible = s === "vlt"; ORS.visible = s === "orbi"; if (GRSB) GRSB.visible = false;
  scene.fog = null; scene.background = s === "vlt" ? new THREE.Color(0x05070a) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(600); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.0 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x9a8a78); H.hemi.groundColor.set(0x2a2622); H.hemi.intensity = 0.45; H.envK.value = 0.8; H.rimA.intensity = 0.6; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(3, 6, 5)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const JPOS = V(-400, -900, -2600);

H.frame("Make it together.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 60000); JU.uT.value = t; JNO.rotation.set(0, t * 0.2, 0);

  if (t < at("this")) { // HOOK: the real image made by people at home (or Jupiter illustration as a fallback)
    if (GRSB) { sets("photo"); look(V(0, 0, 30), V(0, 0, 0), 40); board(GRSB, GRS_AR, V(0, 0, 0), lerp(21, 23, prog(t, 0, at("this")))); hudShow("real", 1); skyAt(); sunGlow.visible = false; }
    else { sets("jup"); JUP.position.set(0, 0, 0); look(V(0, 0, 2400), V(0, 0, 0), 40); skyAt(); hudShow("illus", 1); }
    title(t, fr("hook", 0.04), fr("hook", 0.6), "Made by people at home", GRSB ? "Jupiter, real photo" : "Jupiter", 150);
  } else if (t < at("vault")) { // THIS · SOLAR · WEAK: Juno, Jupiter behind
    sets("space"); JUP.position.copy(JPOS); lightSpace(); skyAt();
    if (t < at("solar")) { const a = 0.4 + (t - at("this")) * 0.1; move(t, at("this"), at("solar"), [JC.clone().add(V(Math.cos(a) * 26, 8, Math.sin(a) * 26)), JC, 40], [JC.clone().add(V(Math.cos(a + 0.1) * 22, 6.5, Math.sin(a + 0.1) * 22)), JC, 40], 0.02);
      callout("nasa", t, fr("this", 0.15), at("solar"), JL(0, -1, 0), 300, 1390); hudShow("arrive", win(t, fr("this", 0.45), at("solar"))); }
    else { move(t, at("solar"), at("vault"), [V(6, 12, 18), V(3, 0, 0), 40], [V(5, 10, 15), V(3, 0, 0), 40], 0.02); callout("arm", t, fr("solar", 0.1), fr("solar", 0.8), JL(6, 0, 0), 760, 1000);
      H.$("cN").textContent = Math.round(18698 * smooth(prog(t, fr("solar", 0.3), fr("solar", 0.9)))).toLocaleString("en-US"); hudShow("cells", win(t, fr("solar", 0.25), at("weak"))); hudShow("watts", win(t, fr("weak", 0.2), at("vault"))); }
  } else if (t < at("cam")) { // VAULT (diagram)
    sets("vlt"); VLT.updateMatrixWorld(true); lightAt(VLT.position, 0.4); radiation(t); move(t, at("vault"), at("cam"), [VW(1.6, 1.4, 3.6), VW(0, 0, 0), 38], [VW(1.2, 1.1, 3.0), VW(0, 0, 0), 38], 0.01);
    callout("vaultL", t, fr("vault", 0.2), at("cam"), VW(0.5, 0.3, 0), 760, 1000); callout("elecL", t, fr("vault", 0.45), at("cam"), VW(-0.1, 0, 0.3), 300, 1390); hudShow("diag", 1);
  } else if (t < at("orbi")) { // CAM · PUBLIC: Juno with Jupiter, then the real image again
    if (t < at("public")) { sets("space"); JUP.position.copy(JPOS); lightSpace(); skyAt(); move(t, at("cam"), at("public"), [V(-10, -4, 20), V(0, -1, 0), 40], [V(-8, -3, 16), V(0, -1, 0), 40], 0.02); hudShow("raw", win(t, fr("cam", 0.4), at("public"))); }
    else if (GRSB) { sets("photo"); look(V(0, 0, 30), V(0, 0, 0), 40); board(GRSB, GRS_AR, V(0, 0, 0), lerp(23, 20, prog(t, at("public"), at("orbi")))); hudShow("real", 1); skyAt(); sunGlow.visible = false; }
    else { sets("jup"); JUP.position.set(0, 0, 0); look(V(0, 0, 2400), V(0, 0, 0), 40); skyAt(); hudShow("illus", 1); }
  } else { // ORBI: the bubble board
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const n = t < at("orbi2") ? Math.min(3, 1 + Math.floor(prog(t, fr("orbi", 0.3), at("orbi2")) * 3)) : 4; const edit = t > fr("orbi2", 0.6) ? 1 : 0; const blink = edit ? (t < fr("orbi2", 0.7) ? 1 : 2) : 0;
    screen(PH, { n, edit, blink }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], [OW(-0.15, 1.35, 3.4), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
