// Kepler: balanced on sunlight. NASA's Kepler 3D model (NASA 3D Resources, "Kepler (A)", free and without copyright).
// Facts (NASA): it watched ~150,000 stars at once for the tiny dimming when a planet crosses its star (transit); it found more
// than 2,000 planets; it needed three of its four reaction wheels to point precisely; the second wheel failed in May 2013; in the
// K2 mission (2014–2018) the pressure of sunlight, balanced evenly across the spacecraft, acted as the third wheel; NASA retired it
// in October 2018 when its fuel ran out.
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
const SUN = V(1, 0.05, 0.25).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
// KEPLER: NASA's own model (≈ metres; 5.0 units tall vs the real 4.7 m → ×0.94). Aperture up (+y); the solar-array "roof" faces +x.
const KEP = new THREE.Group(); scene.add(KEP);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/kepler/kepler-nasa-A.glb");
  gl.scene.scale.setScalar(0.94); gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.side = THREE.DoubleSide; m.envMapIntensity = 0.9; } });
  KEP.add(gl.scene); }
const KL = (x, y, z) => KEP.localToWorld(V(x, y, z));
const KC = V(0, 0, 0);

// =====================================================================================================================
// TRANSIT (diagram): a star, a planet crossing it, and the star's brightness drawn as a line that dips.
// =====================================================================================================================
const TR = new THREE.Group(); scene.add(TR); TR.position.set(0, 9000, 0); TR.visible = false;
const STAR = new THREE.Mesh(new THREE.SphereGeometry(3, 64, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.0, 0.62), toneMapped: false })); TR.add(STAR);
const HALO = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), sunGlow.material); TR.add(HALO); HALO.position.z = -1; HALO.visible = false;
const PLAN = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16), new THREE.MeshBasicMaterial({ color: 0x050608 })); TR.add(PLAN);
const TW = (x, y, z) => TR.localToWorld(V(x, y, z));
hudEl("curve", `<div style="width:1080px;display:flex;justify-content:center"><div style="padding:18px 24px;border-radius:24px;background:rgba(6,8,12,.86);border:1.5px solid rgba(255,255,255,.18)">
  <div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd;margin-bottom:8px">BRIGHTNESS OF THE STAR</div><svg width="820" height="200" viewBox="0 0 820 200"><polyline id="curveL" fill="none" stroke="#ffd166" stroke-width="5" points=""/></svg></div></div>`, { left: "0px", top: "1400px" });
function curve(k) { const pts = []; const N = 120; for (let i = 0; i <= N; i++) { const x = i / N; if (x > k) break; const d = Math.abs(x - 0.5) < 0.12 ? 1 - Math.min(1, (0.12 - Math.abs(x - 0.5)) / 0.03) : 1; const y = 60 + (1 - d) * 90 + Math.sin(i * 7.1) * 2; pts.push(`${(x * 820).toFixed(1)},${y.toFixed(1)}`); } H.$("curveL").setAttribute("points", pts.join(" ")); }

// =====================================================================================================================
// THE WHEELS (diagram): four reaction wheels (generic flywheels, labelled), three needed; two fail.
// =====================================================================================================================
const WH = new THREE.Group(); scene.add(WH); WH.position.set(-9000, 0, 0); WH.visible = false;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.8; fl.receiveShadow = true; WH.add(fl); }
const WHEELS = [[-1.3, 0, 0], [1.3, 0, 0], [0, 0, -1.3], [0, 0, 1.3]].map((p, i) => { const g = new THREE.Group(); g.position.set(...p); WH.add(g);
  const rim = sh(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 24, 64), new THREE.MeshPhysicalMaterial({ color: 0xb8bec6, metalness: 0.9, roughness: 0.3, emissive: new THREE.Color(0) }))); g.add(rim);
  for (let s = 0; s < 4; s++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x8a9096, metalness: 0.8, roughness: 0.35 })); sp.rotation.z = s * Math.PI / 4; g.add(sp); }
  g.rotation.set(i % 2 ? Math.PI / 2 : 0, i * 0.7, i * 0.4); g.userData.rim = rim; return g; });
const WW = (x, y, z) => WH.localToWorld(V(x, y, z));
WHEELS.forEach((w) => (w.userData.spin = new THREE.Group())); WHEELS.forEach((w) => { const kids = [...w.children]; kids.forEach((c) => w.userData.spin.add(c)); w.add(w.userData.spin); });
function wheels(t, dead, tDead = 0) { WHEELS.forEach((w, i) => { const off = dead.includes(i); w.userData.spin.rotation.z = (off ? tDead : t) * 7 + i; w.userData.rim.material.emissive.setRGB(off ? 1.4 : 0, off ? 0.1 : 0.4, off ? 0.08 : 0.25); }); }

// SUNLIGHT ARROWS: photons pushing evenly on both sides of the roof
const RAYS = Array.from({ length: 40 }, (_, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), glow(0xffd166, 2)); m.rotation.z = Math.PI / 2; scene.add(m); m.visible = false; return m; });
function sunlight(t, k) { RAYS.forEach((m, i) => { m.visible = k > 0.01; const u = (t * 0.6 + i / RAYS.length) % 1; const y = -2 + (i % 8) * 0.55, z = -1.2 + Math.floor(i / 8) * 0.6; m.position.copy(KEP.position).add(V(7 - u * 5.6, y, z)); m.material.color.setRGB(1.6 * k, 1.2 * k, 0.4 * k); }); }

// =====================================================================================================================
// ORBI: the Filter (KindFilter.tsx): Show — Open void / Wi-Fi / Mine; File type — All files, Photos, Videos, Documents, Audio,
// Archives. The bubbles on the screen thin down to the chosen kind.
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
const ITEMS = [["photo", "📷", "jezero.jpg"], ["video", "🎬", "launch.mp4"], ["doc", "📄", "plan.pdf"], ["audio", "🎵", "beep.mp3"], ["photo", "📷", "ring.png"], ["archive", "🗜", "data.zip"], ["doc", "📄", "notes.docx"], ["photo", "📷", "moon.jpg"], ["video", "🎬", "dock.mov"]];
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  // the bubbles
  ITEMS.forEach(([kind, ic, nm], i) => { const show = st.kind === "all" || st.kind === kind; const a = show ? 1 : Math.max(0, 1 - st.fade); if (a <= 0.02) return; g.globalAlpha = a;
    const x = 140 + (i % 3) * 250, y = 420 + Math.floor(i / 3) * 240 + (i % 2) * 30, r = 92; g.fillStyle = "rgba(160,200,255,.12)"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 2; g.stroke();
    g.font = "56px sans-serif"; g.textAlign = "center"; g.fillStyle = "#fff"; g.fillText(ic, x, y + 4); g.font = "700 22px M"; g.fillStyle = "#cfd6dd"; g.fillText(nm, x, y + 50); g.textAlign = "left"; g.globalAlpha = 1; });
  // the Filter button + dropdown
  g.fillStyle = st.kind !== "all" ? "rgba(61,255,140,.2)" : "rgba(255,255,255,.1)"; rr(g, 40, 230, 260, 70, 35); g.fill(); g.strokeStyle = st.kind !== "all" ? green : "rgba(255,255,255,.25)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = st.kind !== "all" ? green : "#fff"; g.font = "800 30px M"; g.fillText(st.kind === "all" ? "≡ Filter ▾" : "📷 Photos ▾", 66, 276);
  if (st.open) { g.fillStyle = "rgba(14,16,20,.98)"; rr(g, 40, 310, 420, 760, 28); g.fill(); g.strokeStyle = "rgba(255,255,255,.18)"; g.stroke();
    g.fillStyle = "#7d848c"; g.font = "700 24px M"; g.fillText("SHOW", 70, 360); ["Open void", "Wi-Fi", "Mine"].forEach((s, i) => { g.fillStyle = i === 0 ? green : "#fff"; g.font = "700 30px M"; g.fillText((i === 0 ? "✓ " : "   ") + s, 70, 410 + i * 56); });
    g.fillStyle = "#7d848c"; g.font = "700 24px M"; g.fillText("FILE TYPE", 70, 600); ["All files", "Photos", "Videos", "Documents", "Audio", "Archives"].forEach((s, i) => { const on = (st.kind === "all" && i === 0) || (st.kind === "photo" && i === 1); const hov = st.hover === i; if (hov) { g.fillStyle = "rgba(61,255,140,.14)"; rr(g, 56, 620 + i * 66, 388, 56, 14); g.fill(); } g.fillStyle = on ? green : "#fff"; g.font = "700 30px M"; g.fillText((on ? "✓ " : "   ") + s, 70, 660 + i * 66); }); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "4.7 m tall"], aperture: ["Telescope", "#cfe6ff", "watching one patch of sky"], roof: ["Solar panels", "#ffd166", "the 'roof'"],
  planetL: ["A planet crossing", "#cfd6dd", ""], deadL: ["Failed", "#ff6b5e", ""], sunL: ["Sunlight pushes", "#ffd166", "evenly on both sides"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("stars", row(card("WATCHING", "~150,000 STARS", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("planets", big("plN", "0", "PLANETS FOUND", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("need", big("ndN", "3 of 4", "WHEELS NEEDED", "#fff", "#9fd4ff"), { left: "0px", top: "190px" });
hudEl("may", row(card("MAY 2013", "2 WHEELS LEFT", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("third", row(card("SUNLIGHT =", "THE THIRD WHEEL", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("k2", row(card("MISSION K2", "2014–2018", "#9fd4ff"), card("RETIRED", "OUT OF FUEL", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["BY FILE TYPE", "WI-FI", "ONLY MINE"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; KEP.visible = sp; SKYG.visible = sp || s === "tr"; TR.visible = s === "tr"; WH.visible = s === "wh"; ORS.visible = s === "orbi"; RAYS.forEach((m) => (m.visible = false));
  scene.fog = null; scene.background = s === "wh" ? new THREE.Color(0x05070a) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(1800); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.2 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x7d90b0); H.hemi.groundColor.set(0x2a2622); H.hemi.intensity = 0.45; H.envK.value = 0.8; H.rimA.intensity = 0.6; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(3, 6, 5)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));

H.frame("Show only what matters.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.35; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000); KEP.rotation.set(0, 0, 0);

  if (t < at("dip")) { // HOOK · THIS
    sets("space"); lightSpace(); skyAt();
    if (t < at("this")) { const w = 0.05 * Math.sin(t * 1.3); KEP.rotation.set(w, 0, w * 0.6); move(t, 0, at("this"), [V(-6, 2.5, 12), V(0, 0.4, 0), 40], [V(-4.5, 1.8, 9.5), V(0, 0.4, 0), 40], 0.03);
      title(t, fr("hook", 0.04), fr("hook", 0.6), "NASA's planet hunter", "Balanced on sunlight", 150); }
    else { const a = 2.0 + (t - at("this")) * 0.12; move(t, at("this"), at("dip"), [KC.clone().add(V(Math.cos(a) * 10, 3, Math.sin(a) * 10)), KC, 40], [KC.clone().add(V(Math.cos(a + 0.1) * 8.6, 2.6, Math.sin(a + 0.1) * 8.6)), KC, 40], 0.02);
      callout("nasa", t, fr("this", 0.15), at("dip"), KL(0, -1.6, 0), 300, 1390); callout("aperture", t, fr("this", 0.35), at("dip"), KL(0, 2.4, 0), 760, 600); hudShow("stars", win(t, fr("this", 0.5), at("dip"))); }
  } else if (t < at("wheels")) { // DIP: the transit diagram
    sets("tr"); TR.updateMatrixWorld(true); HALO.quaternion.copy(H.cam.quaternion); skyAt(); sunGlow.visible = false;
    const k = prog(t, at("dip"), fr("dip", 0.8)); PLAN.position.set(lerp(-6, 6, k), 0.4, 3.5); look(TW(0, 0.8, 18), TW(0, 1.2, 0), 40); curve(k);
    hudShow("curve", 1); hudShow("diag", 1); H.$("plN").textContent = Math.round(2000 * smooth(prog(t, fr("dip", 0.6), at("wheels")))).toLocaleString("en-US") + "+"; hudShow("planets", win(t, fr("dip", 0.6), at("wheels")));
    callout("planetL", t, fr("dip", 0.1), fr("dip", 0.6), TW(PLAN.position.x, 0.4, 3.5), 760, 600);
  } else if (t < at("idea")) { // WHEELS · FAIL
    sets("wh"); WH.updateMatrixWorld(true); lightAt(WH.position, 0.4); const dead = t > fr("fail", 0.1) ? [1, 3] : t > at("fail") - 1.5 ? [1] : [];
    wheels(t, dead, at("fail")); move(t, at("wheels"), at("idea"), [WW(0, 4.6, 5.6), WW(0, 0, 0), 40], [WW(0, 4.0, 4.8), WW(0, 0, 0), 40], 0.01);
    hudShow("need", win(t, at("wheels"), at("fail"))); hudShow("may", win(t, fr("fail", 0.15), at("idea"))); hudShow("diag", 1);
    if (dead.length) callout("deadL", t, fr("fail", 0.15), at("idea"), WW(1.3, 0.6, 0), 760, 1000);
  } else if (t < at("orbi")) { // IDEA · BALANCE · K2: sunlight pushing evenly
    sets("space"); lightSpace(); skyAt();
    const settle = smooth(prog(t, at("balance"), fr("balance", 0.6))); const w = 0.12 * (1 - settle) * Math.sin(t * 1.7); KEP.rotation.set(0, 0, w);
    sunlight(t, smooth(prog(t, fr("idea", 0.3), fr("idea", 0.8))) * (t < at("k2") ? 1 : 1 - smooth(prog(t, at("k2"), fr("k2", 0.4)))));
    if (t < at("k2")) move(t, at("idea"), at("k2"), [V(0.5, 3.5, 12), V(0, 0, 0), 40], [V(0.3, 3, 10), V(0, 0, 0), 40], 0.01);
    else move(t, at("k2"), at("orbi"), [V(0.3, 3, 10), V(0, 0, 0), 40], [V(-6, 4, 15), V(0, 0.5, 0), 40], 0.02);
    callout("sunL", t, fr("idea", 0.5), at("k2"), KL(1.2, 0.5, 0), 760, 1000); hudShow("third", win(t, fr("balance", 0.55), at("k2"))); hudShow("k2", win(t, fr("k2", 0.2), at("orbi")));
  } else { // ORBI: the Filter
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const open = t > fr("orbi", 0.6) && t < fr("orbi2", 0.35); const hover = t > at("orbi2") && t < fr("orbi2", 0.35) ? 1 : -1; const kind = t > fr("orbi2", 0.3) ? "photo" : "all"; const fade = smooth(prog(t, fr("orbi2", 0.3), fr("orbi2", 0.55)));
    screen(PH, { open, hover, kind, fade: Math.round(fade * 20) / 20 }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], [OW(-0.15, 1.35, 3.4), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
