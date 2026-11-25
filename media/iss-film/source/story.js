// The International Space Station: nothing wasted. NASA's ISS 3D model (NASA 3D Resources, "International Space Station (ISS)
// (D) (IGOAL)", free and without copyright). Facts (NASA): crewed without a break since 2 Nov 2000; orbits about every 90 minutes,
// ~27,600 km/h; 16 sunrises a day; truss ~109 m. Water (NASA, June 2023): urine goes to the Urine Processor Assembly (vacuum
// distillation) which leaves a brine; the Brine Processor Assembly (membrane + warm dry air) pulls out the rest; all water goes
// through the Water Processor Assembly (filters, a catalytic reactor, iodine); humidity condensate (crew sweat and breath) joins
// it; total water recovery reached ~98% (before the BPA: 93–94%). 15 countries, 5 space agencies (NASA, Roscosmos, ESA, JAXA, CSA).
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
const SUN = V(0.55, 0.42, -0.72).normalize();
{ const N = 9000, p = new Float32Array(N * 3), c = new Float32Array(N * 3); H.reseed(7);
  for (let i = 0; i < N; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * TAU, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 15000, u * 15000, Math.sin(a) * r * 15000], i * 3);
    const b = Math.pow(H.rnd(), 7) * 1.7 + 0.08, w = H.rnd(); c.set([b * (0.85 + 0.25 * w), b * 0.93, b * (1.12 - 0.25 * w)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const st = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, toneMapped: false, fog: false })); st.renderOrder = -9; st.frustumCulled = false; SKYG.add(st); SKYG.userData.stars = st; }
const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  vertexShader: `varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ float r = length(vU) * 2.0; float c = exp(-r * 26.0) * 8.0 + exp(-r * 6.0) * 0.5 + exp(-r * 1.8) * 0.08; gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * c, 1.0); }` }));
sunGlow.renderOrder = -7; sunGlow.frustumCulled = false; SKYG.add(sunGlow);
const RE = 6371, ALT = 420;
const EARTH = new THREE.Group(); scene.add(EARTH); EARTH.position.set(0, -(RE + ALT), 0);
const EU = { uSun: { value: SUN }, uT: { value: 0 }, uDay: { value: tex("kit/models/planets/earth_atmos_2048.jpg", true) }, uNight: { value: tex("kit/models/planets/earth_lights_2048.png", true) },
  uSpec: { value: tex("kit/models/planets/earth_specular_2048.jpg") }, uCl: { value: tex("kit/models/planets/earth_clouds_1024.png") }, uNorm: { value: tex("kit/models/planets/earth_normal_2048.jpg") } };
{ const ground = new THREE.Mesh(new THREE.SphereGeometry(RE, 256, 128), new THREE.ShaderMaterial({ uniforms: EU,
    vertexShader: `varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; void main(){ vU = uv; vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uDay, uNight, uSpec, uCl; uniform vec3 uSun; uniform float uT; varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vP; ${NOISE}
      void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float l = dot(n, uSun);
        vec3 day = pow(texture2D(uDay, vU).rgb, vec3(2.2)); float d = fbm(vP * 0.012) * 0.5 + fbm(vP * 0.06) * 0.5; day *= 0.82 + 0.36 * d;
        float sea = texture2D(uSpec, vU).r; vec3 h = normalize(uSun + v); float sp = pow(max(dot(n, h), 0.0), 60.0) * sea * 0.9 + pow(max(dot(n, h), 0.0), 8.0) * sea * 0.05;
        float c = texture2D(uCl, vU + vec2(uT * 0.00002, 0.0)).a; float cd = fbm(vP * 0.035 + vec3(uT * 0.02)); c = clamp(c * (0.6 + 0.8 * cd) * 1.2, 0.0, 1.0);
        float lit = smoothstep(-0.08, 0.25, l); day = mix(vec3(dot(day, vec3(0.33))), day, 1.35); vec3 col = day * max(l, 0.0) * 2.0 + vec3(1.0, 0.92, 0.8) * sp * lit * (1.0 - c);
        col = mix(col, vec3(0.95, 0.97, 1.0) * max(l, 0.0) * 1.7, c * 0.9);
        vec3 night = pow(texture2D(uNight, vU).rgb, vec3(1.6)) * vec3(1.0, 0.75, 0.45) * 1.6 * (1.0 - smoothstep(-0.25, 0.05, l)) * (1.0 - c * 0.7); col += night;
        float f = pow(1.0 - max(dot(n, v), 0.0), 5.0); col = mix(col, vec3(0.3, 0.55, 1.0) * (0.1 + 1.2 * max(l + 0.15, 0.0)), clamp(f * 0.75, 0.0, 0.6)); col *= 0.6;
        gl_FragColor = vec4(col, 1.0); }` }));
  EARTH.add(ground);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(RE + 95, 192, 96), new THREE.ShaderMaterial({ uniforms: EU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float f = pow(clamp(1.0 + dot(n, v) * 1.0, 0.0, 1.0), 4.0) ;
        float r = clamp(dot(-n, uSun) * 0.8 + 0.4, 0.0, 1.0); vec3 c = mix(vec3(0.25, 0.5, 1.2), vec3(1.1, 0.55, 0.3), pow(1.0 - r, 3.0) * 0.4) * r; gl_FragColor = vec4(c * f * 1.3, 1.0); }` }));
  EARTH.add(atm); }

// =====================================================================================================================
// THE STATION: NASA's IGOAL model (1 unit = 10.8 m: its truss is 10.09 units → 109 m). Truss along z, Earth below (−y).
// =====================================================================================================================
const ISS = new THREE.Group(); scene.add(ISS);
{ const gl = await new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("kit/lib/jsm/libs/draco/gltf/")).loadAsync("kit/models/iss/iss-nasa-igoal.glb");
  gl.scene.scale.setScalar(10.8); gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; for (const m of [].concat(o.material)) { if (m.map) m.map.anisotropy = 8; m.envMapIntensity = 0.9; m.side = THREE.DoubleSide; } });
  ISS.add(gl.scene); ISS.userData.gl = gl.scene; }
const SL = (x, y, z) => ISS.localToWorld(V(x, y, z));
const IC = V(0, -6, 0);   // centre of the station (m)
const named = (n) => { let r = null; ISS.userData.gl.traverse((o) => { if (!r && o.name === n) r = o; }); return r; };
const CUPOLA = named("Cupola"); const cupolaPos = () => { const v = V(); if (CUPOLA) new THREE.Box3().setFromObject(CUPOLA).getCenter(v); return v; };

// =====================================================================================================================
// THE WATER LOOP (diagram, a dark studio far away): urine → distiller (UPA) → brine → brine processor (BPA) → water
// processor (WPA, filters · reactor · iodine) → drinking water; the cabin's humidity (sweat, breath) joins at the WPA.
// Boxes are labelled stand-ins, not the real hardware.
// =====================================================================================================================
const LAB = new THREE.Group(); scene.add(LAB); LAB.position.set(6000, 0, 0); LAB.visible = false;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(60, 96), new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.55, metalness: 0.2 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.6; fl.receiveShadow = true; LAB.add(fl);
  const grid = new THREE.GridHelper(40, 80, 0x1d3a52, 0x13202c); grid.position.y = -0.595; grid.material.transparent = true; grid.material.opacity = 0.5; LAB.add(grid); }
const box = (w, h, d, c, x, y, z) => { const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, metalness: 0.3, clearcoat: 0.4, transparent: true, opacity: 0.92 }))); m.position.set(x, y, z); LAB.add(m); return m; };
const UPA = box(1.2, 1.3, 1.0, 0xd9dde2, -3.2, 0.05, 0), BPA = box(1.0, 1.0, 0.9, 0xc9b48a, -3.2, 0.0, 2.6), WPA = box(1.3, 1.6, 1.1, 0x9fb8cc, 0.6, 0.2, 0), TANK = box(0.9, 1.2, 0.9, 0x8ccfff, 3.6, 0.0, 0);
const BAG = box(0.6, 0.8, 0.5, 0xffd34d, -6.0, -0.2, 0);   // the urine supply (diagram)
const AIR = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 16), new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.25, roughness: 0.2, depthWrite: false })); AIR.position.set(0.6, 2.6, -2.2); LAB.add(AIR);
// a drum in the distiller (spins) and a glow for the reactor
const DRUM = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide })); DRUM.rotation.z = Math.PI / 2; DRUM.position.copy(UPA.position).add(V(0, 0, 0.55)); LAB.add(DRUM);
const REACT = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 32), glow(0xff8a3c, 0.2)); REACT.position.copy(WPA.position).add(V(0.35, 0.1, 0.6)); LAB.add(REACT);
// pipes + flowing droplets
const PIPES = []; const pipe = (pts, c0, c1, n = 26) => { const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p))); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.05, 10, false), new THREE.MeshPhysicalMaterial({ color: 0xd8dde3, transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false })); LAB.add(tube);
  const drops = Array.from({ length: n }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(c0, 1.6)); LAB.add(d); return d; }); const P = { curve, drops, c0: new THREE.Color(c0), c1: new THREE.Color(c1), k: 0 }; PIPES.push(P); return P; };
const P_U = pipe([[-6, 0.2, 0], [-4.8, 0.3, 0], [-3.9, 0.3, 0]], 0xffd34d, 0xffd34d);              // urine in
const P_S = pipe([[-3.2, 0.8, 0], [-2.2, 1.3, 0], [-0.4, 0.8, 0]], 0xdbeaff, 0xdbeaff);             // steam / distillate → WPA
const P_B = pipe([[-3.2, -0.4, 0.5], [-3.2, -0.4, 1.6], [-3.2, -0.2, 2.1]], 0xc9a15a, 0xc9a15a);   // brine → BPA
const P_B2 = pipe([[-2.7, 0.2, 2.6], [-1.2, 0.6, 1.8], [-0.2, 0.4, 0.6]], 0xdbeaff, 0xdbeaff);    // water from brine → WPA
const P_H = pipe([[0.6, 2.2, -1.9], [0.6, 1.6, -1.0], [0.6, 0.9, -0.5]], 0xcfe6ff, 0xcfe6ff);     // humidity → WPA
const P_W = pipe([[1.3, 0.2, 0], [2.4, 0.3, 0], [3.1, 0.2, 0]], 0x6fc8ff, 0x6fc8ff);               // clean water → tank
function flow(t, ks) { PIPES.forEach((p, i) => { const k = ks[i] ?? 0; p.drops.forEach((d, j) => { const u = ((t * 0.35 + j / p.drops.length) % 1); d.visible = k > 0.01 && u < k * 1.05; d.position.copy(p.curve.getPointAt(u)); d.scale.setScalar(0.8 + 0.4 * Math.sin(j)); }); }); }
const STEAM = Array.from({ length: 40 }, (_, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })); LAB.add(s); return s; });
function steam(t, k) { STEAM.forEach((s, i) => { const u = (t * 0.5 + i / STEAM.length) % 1; s.visible = k > 0.01; s.position.copy(UPA.position).add(V(Math.sin(i * 2.3) * 0.3, 0.6 + u * 1.2, Math.cos(i * 1.7) * 0.3)); s.material.opacity = 0.45 * k * (1 - u); s.scale.setScalar(1 + u * 2); }); }
const WARM = Array.from({ length: 24 }, (_, i) => { const a = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 12), glow(0xff9a4c, 1.4)); a.rotation.z = -Math.PI / 2; LAB.add(a); return a; });
function warm(t, k) { WARM.forEach((a, i) => { const u = (t * 0.7 + i / WARM.length) % 1; a.visible = k > 0.01; a.position.copy(BPA.position).add(V(-1.4 + u * 1.2, -0.3 + (i % 4) * 0.2, -0.3 + (i % 3) * 0.3)); a.material.opacity = k; }); }
const LW = (x, y, z) => LAB.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: the task board (TaskBoard.tsx): tasks with their step colour (grey not started · orange in progress · blue in
// review · green done), @name, files attached under the task.
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
const STEPC = ["#8d939b", "#ff9f43", "#4ea8ff", "#3dff8c"], STEPN = ["Not started", "In progress", "In review", "Done"];
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "rgba(8,10,14,.96)"; rr(g, 30, 300, 720, 980, 34); g.fill(); g.strokeStyle = "rgba(255,255,255,.15)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#fff"; g.font = "900 46px D"; g.fillText("Tasks", 70, 380);
  // the new-task field
  g.fillStyle = "rgba(255,255,255,.07)"; rr(g, 70, 410, 640, 84, 20); g.fill(); g.font = "600 30px M"; g.fillStyle = st.typed ? "#fff" : "#7d848c"; g.fillText(st.typed || "Name the task… (@name to assign)", 92, 464);
  if (st.typed) { const w = g.measureText(st.typed).width; if (Math.floor(st.t * 2) % 2) { g.fillStyle = green; g.fillRect(94 + w, 432, 3, 42); } }
  st.tasks.forEach((tk, i) => { const y = 530 + i * 170; g.fillStyle = "rgba(255,255,255,.05)"; rr(g, 70, y, 640, 150, 22); g.fill(); g.fillStyle = STEPC[tk.s]; rr(g, 70, y, 12, 150, 6); g.fill();
    g.fillStyle = tk.s === 3 ? "#9aa3ad" : "#fff"; g.font = "800 32px M"; g.fillText(tk.n, 104, y + 50); if (tk.s === 3) { g.fillStyle = "#9aa3ad"; g.fillRect(104, y + 40, g.measureText(tk.n).width, 3); }
    g.fillStyle = "#7d848c"; g.font = "600 26px M"; g.fillText(tk.who ? "@" + tk.who : "nobody yet", 104, y + 92);
    g.fillStyle = STEPC[tk.s]; g.font = "800 26px M"; const sn = STEPN[tk.s]; const sw = g.measureText(sn).width; g.globalAlpha = 0.18; rr(g, 690 - sw - 28, y + 22, sw + 28, 44, 22); g.fill(); g.globalAlpha = 1; g.fillText(sn, 690 - sw - 14, y + 53);
    if (tk.file) { g.fillStyle = "rgba(77,168,255,.15)"; rr(g, 104, y + 106, 300, 34, 17); g.fill(); g.fillStyle = "#9fd4ff"; g.font = "700 22px M"; g.fillText("📎 " + tk.file, 120, y + 130); } });
  if (st.toast) { g.fillStyle = "rgba(20,22,26,.95)"; rr(g, 140, 1320, 500, 80, 40); g.fill(); g.strokeStyle = green; g.lineWidth = 2; g.stroke(); g.fillStyle = green; g.font = "700 28px M"; g.textAlign = "center"; g.fillText(st.toast, 390, 1370); g.textAlign = "left"; } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "about 109 m across"], cupola: ["Cupola", "#cfe6ff", "7 windows"], arrays: ["Solar arrays", "#ffd166", ""],
  urineL: ["Urine", "#ffd34d", ""], upaL: ["Distiller", "#cfd6dd", "boils it at low pressure"], brineL: ["Brine", "#c9a15a", "salty leftovers"], bpaL: ["Brine processor", "#ff9a4c", "warm air dries it"],
  wpaL: ["Water processor", "#9fd4ff", "filters · reactor · iodine"], airL: ["Cabin air", "#cfe6ff", "sweat and breath"], tankL: ["Drinking water", "#6fc8ff", ""],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 160px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("since", row(card("CREWED SINCE", "2 NOV 2000", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("sun", big("sunN", "0", "SUNRISES TODAY", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("min90", row(card("ONE ORBIT", "~90 MIN", "#9fd4ff"), card("SPEED", "~27,600 km/h", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("pct", big("pN", "93%", "OF THE WATER COMES BACK", "#fff", "#6fc8ff"), { left: "0px", top: "190px" });
hudEl("drops", `<div style="width:1080px;display:flex;justify-content:center"><div id="dropsG" style="display:grid;grid-template-columns:repeat(20,30px);gap:8px;padding:22px;border-radius:24px;background:rgba(6,8,12,.86);border:1.5px solid rgba(255,255,255,.18)"></div></div>`, { left: "0px", top: "1400px" });
H.$("dropsG").innerHTML = Array.from({ length: 100 }, (_, i) => `<div id="dr${i}" style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#6fc8ff"></div>`).join("");
hudEl("team", row(card("COUNTRIES", "15", "#ffd166"), card("SPACE AGENCIES", "5", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["TASK BOARD", "@ASSIGN", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; EARTH.visible = ISS.visible = sp; SKYG.visible = sp; LAB.visible = s === "lab"; ORS.visible = s === "orbi";
  scene.fog = null; scene.background = s === "lab" ? new THREE.Color(0x06080b) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(EU.uSun.value, 9000); sunGlow.scale.setScalar(2600); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.3 * k; H.key.position.copy(EU.uSun.value).multiplyScalar(300); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 700 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x7d9ad0); H.hemi.groundColor.set(0x2a4a7a); H.hemi.intensity = 0.5; H.envK.value = 0.85; H.rimA.intensity = 0.5; H.rimB.intensity = 0.3; }
function lightLab(c) { H.key.color.set(0xfff1e0); H.key.intensity = 2.6; H.key.position.copy(c).add(V(4, 9, 6)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = 0.35; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const SUN0 = SUN.clone();
const TASKS = [["Swap water filter", "anna"], ["Brine bag check", "kenji"], ["Upload urine data", "marc"]];

H.frame("Your team's task board. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.5, 30000); EU.uT.value = t; EU.uSun.value.copy(SUN0); EARTH.rotation.set(0.35, 2.3 + t * 0.004, 0);

  if (t < at("water")) { // HOOK · THIS · ORBIT: the station over the Earth
    sets("space"); lightSpace();
    if (t < at("this")) { move(t, 0, at("this"), [V(150, 40, 190), IC, 40], [V(110, 22, 140), IC, 40], 0.03); title(t, fr("hook", 0.04), fr("hook", 0.55), "Nothing wasted", "Drink it again", 150); }
    else if (t < at("orbit")) { const a = 0.7 + (t - at("this")) * 0.07; move(t, at("this"), at("orbit"), [IC.clone().add(V(Math.cos(a) * 150, 45, Math.sin(a) * 150)), IC, 40], [IC.clone().add(V(Math.cos(a + 0.08) * 135, 38, Math.sin(a + 0.08) * 135)), IC, 40], 0.02);
      callout("nasa", t, fr("this", 0.15), at("orbit"), SL(0, 0, 0), 300, 1390); callout("arrays", t, fr("this", 0.35), fr("this", 0.85), SL(0, 0, 38), 760, 700); hudShow("since", win(t, fr("this", 0.5), at("orbit"))); }
    else { const k = prog(t, at("orbit"), at("water")); const ang = k * TAU * 1.2; EU.uSun.value.copy(V(Math.cos(ang) * 0.7, 0.25, Math.sin(ang) * 0.7).normalize()); lightSpace();
      move(t, at("orbit"), at("water"), [V(-60, 140, 520), V(0, -40, 0), 44], [V(-50, 120, 470), V(0, -45, 0), 44], 0.02);
      H.$("sunN").textContent = String(Math.min(16, Math.round(16 * smooth(k)))); hudShow("sun", win(t, fr("orbit", 0.1), at("water"))); hudShow("min90", win(t, fr("orbit", 0.25), at("water"))); }
    skyAt();
  } else if (t < at("team")) { // WATER LOOP (diagram)
    sets("lab"); LAB.updateMatrixWorld(true); lightLab(LAB.position); DRUM.rotation.x = t * 4; steam(t, 0); warm(t, 0); REACT.material.color.setRGB(0.4, 0.2, 0.1);
    const kU = prog(t, at("urine"), fr("urine", 0.5)), kS = prog(t, fr("urine", 0.5), at("brine")), kB = prog(t, fr("urine", 0.7), at("brine")), kB2 = prog(t, fr("brine", 0.4), at("clean")), kH = prog(t, fr("clean", 0.5), at("pct")), kW = prog(t, fr("clean", 0.3), fr("clean", 0.9));
    flow(t, [kU, kS, kB, kB2, kH, kW].map((k, i) => (t >= at("pct") ? 1 : k)));
    if (t < at("urine")) { move(t, at("water"), at("urine"), [LW(-0.6, 13, 18.5), LW(-1.6, 0.4, 0.8), 40], [LW(-0.8, 12, 17), LW(-1.6, 0.4, 0.8), 40], 0.01); hudShow("diag", 1); }
    else if (t < at("brine")) { steam(t, smooth(kS)); move(t, at("urine"), at("brine"), [LW(-4.5, 2.6, 5.2), LW(-3.6, 0.3, 0.3), 38], [LW(-4.2, 2.2, 4.4), LW(-3.4, 0.4, 0.3), 38], 0.01);
      callout("urineL", t, at("urine") + 0.2, at("brine"), LW(-6.0, 0.25, 0), 300, 1000); callout("upaL", t, fr("urine", 0.2), at("brine"), LW(-3.2, 0.75, 0.3), 760, 600); callout("brineL", t, fr("urine", 0.7), at("brine"), LW(-3.2, -0.4, 1.4), 760, 1390); hudShow("diag", 1); }
    else if (t < at("clean")) { warm(t, 1); move(t, at("brine"), at("clean"), [LW(-0.6, 2.4, 6.2), LW(-2.9, 0.1, 2.1), 38], [LW(-1.0, 2.0, 5.4), LW(-2.9, 0.1, 2.1), 38], 0.01);
      callout("bpaL", t, at("brine") + 0.2, at("clean"), LW(-3.2, 0.5, 2.6), 760, 1000); hudShow("diag", 1); }
    else if (t < at("pct")) { REACT.material.color.setRGB(2.2, 0.9, 0.3); move(t, at("clean"), at("pct"), [LW(3.4, 3.0, 5.6), LW(0.8, 0.5, -0.4), 38], [LW(2.8, 2.6, 4.8), LW(0.8, 0.6, -0.6), 38], 0.01);
      callout("wpaL", t, at("clean") + 0.2, at("pct"), LW(0.6, 1.0, 0.4), 300, 1000); callout("airL", t, fr("clean", 0.5), at("pct"), LW(0.6, 2.6, -2.2), 760, 600); callout("tankL", t, fr("clean", 0.35), at("pct"), LW(3.6, 0.6, 0), 760, 1390); hudShow("diag", 1); }
    else { REACT.material.color.setRGB(2.2, 0.9, 0.3); steam(t, 0.6); warm(t, 0.6); move(t, at("pct"), at("team"), [LW(1.5, 10, 12), LW(-0.8, 0, 0.8), 40], [LW(1.2, 11.5, 13.5), LW(-0.8, 0, 0.8), 40], 0.01);
      const kp = smooth(prog(t, fr("pct", 0.1), fr("pct", 0.45))); const pc = Math.round(93 + 5 * kp); H.$("pN").textContent = `${pc}%`; hudShow("pct", win(t, at("pct"), at("team")));
      for (let i = 0; i < 100; i++) { const e = H.$("dr" + i); if (e) e.style.background = i < pc ? "#6fc8ff" : "#30363d"; } hudShow("drops", win(t, fr("pct", 0.2), at("team"))); }
  } else if (t < at("orbi")) { // TEAM: back to the station
    sets("space"); lightSpace(); skyAt(); const a = 2.6 + (t - at("team")) * 0.06; move(t, at("team"), at("orbi"), [IC.clone().add(V(Math.cos(a) * 170, -20, Math.sin(a) * 170)), IC, 40], [IC.clone().add(V(Math.cos(a + 0.06) * 150, -15, Math.sin(a + 0.06) * 150)), IC, 40], 0.02);
    hudShow("team", win(t, fr("team", 0.1), at("orbi"))); callout("cupola", t, fr("team", 0.3), at("orbi"), cupolaPos(), 760, 1000);
  } else { // ORBI: the task board
    sets("orbi"); ORS.updateMatrixWorld(true); lightLab(ORS.position); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const typing = "Swap water filter @anna"; const kt = prog(t, fr("orbi", 0.3), fr("orbi", 0.9)); const typed = t < at("orbi2") ? typing.slice(0, Math.round(typing.length * kt)) : "";
    const added = t >= at("orbi2"); const tasks = []; if (added) { const k2 = prog(t, at("orbi2"), at("orbi3")); const s0 = k2 < 0.3 ? 0 : k2 < 0.55 ? 1 : k2 < 0.8 ? 2 : 3;
      tasks.push({ n: TASKS[0][0], who: TASKS[0][1], s: s0, file: k2 > 0.25 ? "filter-steps.pdf" : "" }); }
    tasks.push({ n: TASKS[1][0], who: TASKS[1][1], s: 1, file: "brine-photo.jpg" }); tasks.push({ n: TASKS[2][0], who: "", s: 0, file: "" });
    screen(PH, { typed, t: Math.round(t * 4) / 4, tasks, toast: t > at("orbi3") ? "Done · Swap water filter" : "" }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], [OW(-0.15, 1.35, 3.4), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
