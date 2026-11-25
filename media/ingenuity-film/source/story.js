// Wright Brothers Field: NASA's Ingenuity Mars helicopter (NASA's own 3D model, NASA 3D Resources, free and without copyright).
// Facts (Wikipedia: Ingenuity (helicopter)): 1.8 kg; a small piece of the 1903 Wright Flyer's wing cloth attached under its
// solar panel; Mars air ~1/100 of Earth's sea-level density, like ~87,000 ft (26.5 km), never reached by existing helicopters;
// blades 2,400–2,900 rpm, about 10× what Earth needs; coaxial contra-rotating rotors (~1.2 m); radio delays of minutes →
// autonomous flight plans; first flight 19 April 2021: a ~40 s hover at 3 m — the first powered, controlled flight on another
// world; the airstrip was named Wright Brothers Field; planned 5 flights, flew 72; blades broken on flight 72, 18 Jan 2024;
// it communicated with Earth through the Perseverance rover.
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
// INGENUITY: NASA's model; each rotor re-parented to a pivot on the mast so it can spin (top and bottom counter-rotate)
// =====================================================================================================================
const ING = new THREE.Group(); scene.add(ING);
const dl = new DRACOLoader(); dl.setDecoderPath("kit/lib/jsm/libs/draco/gltf/"); const gld = new GLTFLoader(); gld.setDRACOLoader(dl);
const gi = await gld.loadAsync("kit/models/ingenuity/ingenuity-nasa.glb"); ING.add(gi.scene); gi.scene.position.y = 0.026; gi.scene.updateMatrixWorld(true);
gi.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.side = THREE.DoubleSide; } });
const rotorNode = (n) => { let r = null; gi.scene.traverse((o) => { if (!r && o.name === n) r = o; }); return r; };
const PIV = ["rotors_01", "rotors_02"].map((n, i) => { const node = rotorNode(n); const b = new THREE.Box3().setFromObject(node); const c = b.getCenter(V()); const piv = new THREE.Group(); piv.position.set(-0.0018, c.y, 0.0003); ING.add(piv); ING.updateMatrixWorld(true); piv.attach(node);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 64), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uA: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uK, uA; varying vec2 vP; void main(){ float r = length(vP); float a = atan(vP.y, vP.x) - uA; float b = pow(abs(cos(a)), 30.0); gl_FragColor = vec4(vec3(0.16, 0.16, 0.18), uK * (0.16 + 0.3 * b) * smoothstep(0.6, 0.55, r) * smoothstep(0.03, 0.08, r)); }` }));
  disc.rotation.x = -Math.PI / 2; piv.add(disc); return { piv, node, disc, dir: i ? -1 : 1 }; });
const blades = []; PIV.forEach((p) => p.node.traverse((o) => { if (o.isMesh) blades.push(o); }));
/** rpm: 0 … 2900; blur > ~300 rpm */
function rotors(t, rpm) { const rps = rpm / 60; const fast = clamp((rpm - 200) / 900); PIV.forEach((p) => { const a = (rpm > 1200 ? (t * 7.3) % TAU : t * rps * TAU) * p.dir; p.piv.rotation.y = a; p.disc.material.uniforms.uK.value = fast; p.disc.material.uniforms.uA.value = a; });
  blades.forEach((m) => { m.material.transparent = fast > 0.05; m.material.opacity = 1 - 0.7 * fast; m.material.depthWrite = fast < 0.5; }); }
const IL = (x, y, z) => ING.localToWorld(V(x, y, z));
// the Wright Flyer cloth swatch (stamp-sized) on the cable under the solar panel — a small muslin patch
const CLOTH = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0xe8dfca, roughness: 0.9, side: THREE.DoubleSide })); CLOTH.position.set(0.0, 0.505, 0.06); CLOTH.rotation.x = -Math.PI / 2 + 0.3; ING.add(CLOTH);

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
// dust kicked by the rotor downwash: a ring of soft particles at the ground
const NDU = 900, DUST = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.006, 1), new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 1, transparent: true, opacity: 0.35, depthWrite: false }), NDU); DUST.frustumCulled = false; MARS.add(DUST);
function dust(t, c, k, hgt) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const reach = clamp(1 - hgt / 4); for (let i = 0; i < NDU; i++) { const u = ((hash(i) + t * (0.35 + hash(i + 1) * 0.4)) % 1); const a = hash(i + 2) * TAU + u * 0.8; const r = 0.3 + u * 2.6;
  const s = k * reach * (1 - u) * (0.6 + hash(i + 3) * 1.6); m4.compose(V(c.x + Math.cos(a) * r, marsH(c.x, c.z) + 0.02 + u * 0.35 * hash(i + 4), c.z + Math.sin(a) * r), q, V(s, s, s)); DUST.setMatrixAt(i, m4); } DUST.instanceMatrix.needsUpdate = true; }
// the flight path lines (from above) — 72 flights over ~17 km, drawn as a long wandering polyline
const PATHS = (() => { const pts = []; let x = 0, z = 0, a = 0.4; H.reseed(72); for (let i = 0; i < 72; i++) { const d = 30 + H.rnd() * 420; a += (H.rnd() - 0.45) * 1.3; const nx = x + Math.cos(a) * d * 0.06, nz = z + Math.sin(a) * d * 0.06; pts.push(V(x, 0.3, z), V(nx, 0.3, nz)); x = nx; z = nz; }
  const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(0.24, 1.4, 0.6), toneMapped: false })); MARS.add(l); l.visible = false; return l; })();

// =====================================================================================================================
// THE AIR, compared: two boxes of air molecules — Earth at sea level vs Mars (1/100 as dense)
// =====================================================================================================================
const AIRB = new THREE.Group(); scene.add(AIRB); AIRB.position.set(0, 0, -3000);
const AU = { uT: { value: 0 } };
function airBox(n, col) { const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x9fb8d8, transparent: true, opacity: 0.06, depthWrite: false })); g.add(box);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: col })); g.add(edges);
  const IM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.6), toneMapped: false }), n); IM.frustumCulled = false; g.add(IM); g.userData = { IM, n }; AIRB.add(g); return g; }
const AIR_E = airBox(3000, 0x6fd0ff), AIR_M = airBox(30, 0xff9a5c); AIR_E.position.set(-0.75, 1, 0); AIR_M.position.set(0.75, 1, 0);
function airMove(t) { for (const b of [AIR_E, AIR_M]) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < b.userData.n; i++) { const f = (k) => ((hash(i * 3 + k) + t * (0.05 + hash(i + k + 7) * 0.08)) % 1) - 0.5; m4.compose(V(f(0) * 0.96, f(1) * 0.96, f(2) * 0.96), q, V(1, 1, 1)); b.userData.IM.setMatrixAt(i, m4); } b.userData.IM.instanceMatrix.needsUpdate = true; } }

// =====================================================================================================================
// ORBI: two phones on a table; a direct beam phone → phone (P2P first); when it can't connect, the file goes via storage
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(3000, 0, 0);
const IMG = { ph: await img("shots_live/phone.png") };
const pA = makePhone(), pB = makePhone(0x3a3d42); ORS.add(pA.g, pB.g); pA.g.position.set(-1.05, 1.05, 0); pB.g.position.set(1.05, 1.05, 0); pA.g.rotation.set(-0.25, 0.35, 0); pB.g.rotation.set(-0.25, -0.35, 0);
{ const tb = sh(new THREE.Mesh(new RoundedBoxGeometry(5.4, 0.12, 2.2, 3, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x2a2014, roughness: 0.5, clearcoat: 0.4, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) }))); tb.position.y = 0.16; ORS.add(tb);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.9; ORS.add(fl); }
const STOR = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.5, 0.9, 3, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x0e1418, roughness: 0.3, metalness: 0.5, emissive: new THREE.Color(0x0b2a1a) })); STOR.position.set(0, 3.4, -1.2); ORS.add(STOR);
const storEdge = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.02, 0.92), glow(0x6fd0ff, 1.3)); storEdge.position.set(0, 3.15, -1.2); ORS.add(storEdge);
const beamMat = (c) => new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uK: { value: 0 }, uC: { value: new THREE.Color(c) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT, uK; uniform vec3 uC; varying vec2 vU; void main(){ float p = fract(vU.x * 4.0 - uT * 1.2); float pulse = smoothstep(0.0, 0.2, p) * smoothstep(0.4, 0.2, p); gl_FragColor = vec4(uC * 1.6 * (0.2 + pulse) * uK, 1.0); }` });
const tube = (a, b, mid, c) => { const cv = new THREE.QuadraticBezierCurve3(a, mid, b); const m = new THREE.Mesh(new THREE.TubeGeometry(cv, 60, 0.03, 8, false), beamMat(c)); ORS.add(m); return m; };
const A0 = pA.g.position.clone().add(V(0.2, 0.3, 0.1)), B0 = pB.g.position.clone().add(V(-0.2, 0.3, 0.1));
const DIRECT = tube(A0, B0, V(0, 1.9, 0.2), 0x3dff8c), UPL = tube(A0, STOR.position.clone().add(V(-0.5, -0.25, 0)), V(-1.4, 3.0, -0.4), 0x6fd0ff), DNL = tube(STOR.position.clone().add(V(0.5, -0.25, 0)), B0, V(1.4, 3.0, -0.4), 0x6fd0ff);
const WALL = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.4, 0.3), toneMapped: false, transparent: true })); WALL.position.set(0, 1.85, 0.2); ORS.add(WALL);
function drawA(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "rgba(8,10,14,.94)"; rr(g, 50, 560, 680, 520, 34); g.fill(); g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("mars-flight-72.mp4", 90, 630);
  g.fillStyle = st.mode ? "#6fd0ff" : green; g.font = "800 34px M"; g.fillText(st.mode ? "VIA STORAGE (FALLBACK)" : "PHONE → PHONE (DIRECT)", 90, 700);
  g.fillStyle = "rgba(255,255,255,.12)"; rr(g, 90, 740, 600, 26, 13); g.fill(); g.fillStyle = st.mode ? "#6fd0ff" : green; rr(g, 90, 740, 600 * st.p, 26, 13); g.fill();
  g.fillStyle = "#cfd6dd"; g.font = "700 26px M"; g.fillText(st.mode ? "direct link couldn't connect" : "tried first, peer to peer", 90, 820); }
function drawB(g, st) { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 60, 600, 660, 420, 30); g.fill();
  g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("mars-flight-72.mp4", 100, 680); g.fillStyle = st.p >= 1 ? green : "#9aa3ad"; g.font = "800 34px M"; g.fillText(st.p >= 1 ? "✓ RECEIVED" : `RECEIVING ${Math.round(st.p * 100)}%`, 100, 750);
  g.fillStyle = "rgba(255,255,255,.12)"; rr(g, 100, 790, 580, 26, 13); g.fill(); g.fillStyle = green; rr(g, 100, 790, 580 * st.p, 26, 13); g.fill(); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "every blade and leg"], cloth: ["Wright Flyer wing cloth", "#f2efe8", "from 1903, under the solar panel"], solar: ["Solar panel", "#ffd166", "charges its batteries"],
  earthA: ["Earth air", "#6fd0ff", "at sea level"], marsA: ["Mars air", "#ff9a5c", "about 1/100 as dense"], top: ["Top rotor", "#3dff8c", "spins one way"], bot: ["Bottom rotor", "#ff8a3d", "spins the other"],
  field: ["Wright Brothers Field", "#ffd166", "Jezero Crater"], direct: ["Direct, phone to phone", green, "tried first"], stor: ["Storage", "#6fd0ff", "the fallback"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("WEIGHT", "1.8 kg")}${card("ROTORS", "1.2 m", "#ffd166")}</div>`, { left: "0px", top: "1440px" });
hudEl("rpm", `<div style="width:1080px;text-align:center"><div id="rN" style="font:900 180px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">0</div><div style="font:800 38px D;letter-spacing:.12em;color:#ffd166;margin-top:6px">RPM · ~10× EARTH</div></div>`, { left: "0px", top: "200px" });
hudEl("alt", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("MARS AIR = EARTH AT", "26 km", "#ff9a5c")}${card("HELICOPTERS ON EARTH", "NEVER THAT HIGH", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("delay", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("RADIO DELAY", "MINUTES", "#ff9a5c")}${card("PILOT", "ITSELF", "#3dff8c")}</div>`, { left: "0px", top: "1440px" });
hudEl("first", `<div style="width:1080px;display:flex;justify-content:center;gap:18px"><div style="padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #3dff8c;text-align:center"><div style="font:700 24px M;letter-spacing:.16em;color:#aab3bd">HEIGHT</div><div id="fH" style="font:900 96px/1 D;color:#fff">0.0 m</div></div><div style="padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #3dff8c;text-align:center"><div style="font:700 24px M;letter-spacing:.16em;color:#aab3bd">TIME</div><div id="fT" style="font:900 96px/1 D;color:#3dff8c">0 s</div></div></div>`, { left: "0px", top: "220px" });
hudEl("date", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("FIRST FLIGHT", "19 APR 2021")}${card("WHERE", "MARS", "#ff9a5c")}</div>`, { left: "0px", top: "1440px" });
hudEl("flights", `<div style="width:1080px;text-align:center"><div id="flN" style="font:900 190px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">5</div><div id="flL" style="font:800 38px D;letter-spacing:.12em;color:#3dff8c;margin-top:6px">FLIGHTS PLANNED</div></div>`, { left: "0px", top: "200px" });
hudEl("sped", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">SPED UP · ROTOR BLUR SHOWN</div>`, { left: "300px", top: "1110px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["DIRECT FIRST", "STORAGE FALLBACK", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { MARS.visible = s === "mars"; AIRB.visible = s === "air"; ORS.visible = s === "orbi"; ING.visible = s === "mars"; scene.fog = s === "mars" ? MFOG : null; scene.background = s === "air" || s === "orbi" ? new THREE.Color(0x07080a) : null; }
function lightMars(c, r = 3) { H.key.color.set(0xffe9d0); H.key.intensity = 2.6; H.key.position.copy(c).addScaledVector(SUN, r * 4); H.key.target.position.copy(c); const s = H.key.shadow.camera; Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 0.1, far: r * 10 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0005; H.key.shadow.normalBias = 0.01; H.key.castShadow = true;
  H.hemi.color.set(0xe0b08a); H.hemi.groundColor.set(0x7a4a30); H.hemi.intensity = 0.75; H.envK.value = 0.55; H.rimA.intensity = 0.25; H.rimB.intensity = 0.2; }
function lightStudio() { H.key.color.set(0xffffff); H.key.intensity = 1.6; H.key.position.set(ORS.position.x + 3, 6, 4); H.key.target.position.copy(ORS.position); H.key.castShadow = false; H.hemi.color.set(0x8090b0); H.hemi.groundColor.set(0x181818); H.hemi.intensity = 0.6; H.envK.value = 0.6; }
function ingAt(y, yaw = 0, tilt = 0) { ING.position.set(0, marsH(0, 0) + y, 0); ING.rotation.set(tilt, yaw, 0); ING.updateMatrixWorld(true); }

H.frame("Direct first. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.25; H.grade.uniforms.uVig.value = 0.3; camRange(0.01, 20000); AU.uT.value = t; PATHS.visible = false; DUST.visible = false; rotors(t, 0);

  if (t < at("air")) { // HOOK, THIS, CLOTH: hovering over Jezero; then the machine; then the swatch under the panel
    sets("mars");
    if (t < at("this")) { const y = 3 + Math.sin(t * 1.3) * 0.08; ingAt(y, t * 0.1); rotors(t, 2600); DUST.visible = true; dust(t, ING.position, 1, y); lightMars(ING.position);
      move(t, 0, at("this"), [IL(-2.6, 0.2, 3.6), IL(0, 0.25, 0), 34], [IL(-2.2, 0.15, 3.0), IL(0, 0.25, 0), 34], 0.04); title(t, fr("hook", 0.05), fr("hook", 0.6), "Mars", "A piece of 1903", 150); }
    else if (t < at("cloth")) { ingAt(0, 0.6); lightMars(ING.position); const a = 0.6 + (t - at("this")) * 0.15; move(t, at("this"), at("cloth"), [IL(Math.sin(a) * 3.0, 0.9, Math.cos(a) * 3.0), IL(0, 0.28, 0), 34], [IL(Math.sin(a + 0.1) * 2.7, 0.8, Math.cos(a + 0.1) * 2.7), IL(0, 0.28, 0), 34], 0.01);
      title(t, fr("this", 0.05), fr("this", 0.45), "NASA's Mars helicopter", "Ingenuity", 150); callout("nasa", t, fr("this", 0.4), fr("this", 0.7), IL(0.35, 0.15, 0.3), 760, 1150); hudShow("stats", win(t, fr("this", 0.6), at("cloth"))); }
    else { ingAt(0, 0.6); lightMars(ING.position); move(t, at("cloth"), at("air"), [IL(0.55, 0.42, 0.75), IL(0, 0.5, 0.06), 34], [IL(0.42, 0.44, 0.58), IL(0, 0.5, 0.06), 30], 0.003);
      callout("solar", t, fr("cloth", 0.1), fr("cloth", 0.5), IL(0.05, 0.515, -0.1), 760, 900); callout("cloth", t, fr("cloth", 0.35), at("air"), IL(0, 0.505, 0.06), 300, 1150); }
  } else if (t < at("rpm")) { // THIN AIR: Earth box vs Mars box; then "26 km"
    sets("air"); airMove(t); H.key.intensity = 1; H.hemi.intensity = 0.6; const P = (x, y, z) => AIRB.localToWorld(V(x, y, z));
    move(t, at("air"), at("rpm"), [P(0, 1.5, 8.2), P(0, 1, 0), 34], [P(0, 1.4, 7.6), P(0, 1, 0), 34], 0.01);
    callout("earthA", t, fr("air", 0.2), at("rpm"), P(-0.75, 1.5, 0), 300, 520); callout("marsA", t, fr("air", 0.45), at("rpm"), P(0.75, 1.5, 0), 760, 520); hudShow("alt", win(t, at("high"), at("rpm")));
  } else if (t < at("first")) { // RPM, COAX, ALONE: spin-up close to the rotors; then flying itself
    sets("mars"); ingAt(0, 0.6); lightMars(ING.position);
    if (t < at("coax")) { const rpm = 2900 * smooth(prog(t, at("rpm"), fr("rpm", 0.7))); rotors(t, rpm); DUST.visible = rpm > 800; dust(t, ING.position, rpm / 2900 * 0.7, 0);
      move(t, at("rpm"), at("coax"), [IL(1.4, 0.9, 1.6), IL(0, 0.38, 0), 34], [IL(1.2, 0.8, 1.4), IL(0, 0.38, 0), 34], 0.01); H.$("rN").textContent = Math.round(rpm).toLocaleString("en-US"); hudShow("rpm", win(t, fr("rpm", 0.05), at("coax"))); }
    else if (t < at("alone")) { rotors(t, 900); move(t, at("coax"), at("alone"), [IL(2.4, 0.38, 0.3), IL(0, 0.37, 0), 30], [IL(2.2, 0.4, 0.25), IL(0, 0.37, 0), 30], 0.01);
      callout("top", t, fr("coax", 0.1), at("alone"), IL(0.0, 0.42, 0.5), 760, 800); callout("bot", t, fr("coax", 0.3), at("alone"), IL(0.0, 0.31, -0.5), 300, 1150); }
    else { const y = 1.2 + Math.sin(t) * 0.1; ingAt(y, t * 0.2); rotors(t, 2600); DUST.visible = true; dust(t, ING.position, 1, y); move(t, at("alone"), at("first"), [IL(-4, 1.2, 4.5), IL(0, 0.2, 0), 36], [IL(-3.6, 1.0, 4.0), IL(0, 0.2, 0), 36], 0.05); hudShow("delay", win(t, fr("alone", 0.2), at("first"))); }
  } else if (t < at("orbi")) { // FIRST FLIGHT (rise 3 m, hover ~40 s, land — sped up), the field name, 72 flights
    sets("mars");
    if (t < at("more")) { const L = at("more") - at("first"); const u = prog(t, at("first"), at("more")); const y = u < 0.15 ? 3 * smooth(u / 0.15) : u > 0.85 ? 3 * (1 - smooth((u - 0.85) / 0.15)) : 3; ingAt(y, 0.6); rotors(t, u < 0.98 ? 2550 : 600); DUST.visible = true; dust(t, ING.position, 1, y); lightMars(ING.position);
      move(t, at("first"), at("more"), [V(-7, 1.6, 8), V(0, marsH(0, 0) + 1.4, 0), 36], [V(-6.2, 1.8, 7), V(0, marsH(0, 0) + 1.6, 0), 36], 0.05);
      H.$("fH").textContent = `${y.toFixed(1)} m`; H.$("fT").textContent = `${Math.round(u * 39.1)} s`; hudShow("first", win(t, fr("first", 0.05), fr("field", 0.3))); hudShow("sped", win(t, fr("first", 0.1), fr("field", 0.3))); hudShow("date", win(t, fr("first", 0.02), fr("first", 0.5)));
      callout("field", t, fr("field", 0.3), at("more"), V(0, marsH(0, 0), 0), 760, 1150); }
    else { ingAt(0, 0.6); lightMars(V(0, 0, 0), 60); PATHS.visible = true; scene.fog = null; move(t, at("more"), at("orbi"), [V(-6, 110, 20), V(15, 0, 6), 40], [V(-6, 100, 22), V(15, 0, 6), 40], 0.03);
      const n = t < fr("more", 0.35) ? 5 : Math.round(lerp(5, 72, smooth(prog(t, fr("more", 0.35), fr("more", 0.8))))); H.$("flN").textContent = String(n); H.$("flL").textContent = n <= 5 ? "FLIGHTS PLANNED" : "FLIGHTS FLOWN"; hudShow("flights", win(t, fr("more", 0.02), at("orbi"))); }
  } else { // ORBI: direct first, storage fallback
    sets("orbi"); lightStudio(); ORS.updateMatrixWorld(true); const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
    const tFail = fr("orbi2", 0.45); const mode = t > tFail ? 1 : 0; const p = mode ? clamp(prog(t, tFail + 0.3, fr("orbi3", 0.6))) : clamp(prog(t, fr("orbi", 0.4), tFail)) * 0.35;
    screen(pA, { mode, p: Math.round(p * 30) / 30 }, drawA); screen(pB, { p: Math.round(clamp(mode ? p : p) * 30) / 30 }, drawB);
    [DIRECT, UPL, DNL].forEach((m) => (m.material.uniforms.uT.value = t)); DIRECT.material.uniforms.uK.value = mode ? 0.15 : clamp(prog(t, fr("orbi", 0.3), fr("orbi", 0.5))); UPL.material.uniforms.uK.value = DNL.material.uniforms.uK.value = mode ? 1 : 0;
    WALL.visible = mode === 1; WALL.material.opacity = 0.7 + 0.3 * Math.sin(t * 8);
    if (t < at("orbi3")) move(t, at("orbi"), at("orbi3"), [OW(0, 2.8, 9.2), OW(0, 2.0, -0.4), 44], [OW(0, 2.6, 8.4), OW(0, 2.0, -0.4), 44], 0.1);
    else move(t, at("orbi3"), at("end"), [OW(0, 2.8, 9.0), OW(0, 2.0, -0.4), 44], [OW(0, 2.7, 8.4), OW(0, 2.0, -0.4), 44], 0.1);
    callout("direct", t, fr("orbi", 0.45), tFail, OW(0, 1.9, 0.2), 760, 600); callout("stor", t, tFail + 0.3, at("end"), OW(0, 3.4, -1.2), 760, 500); hudShow("chips", win(t, fr("orbi3", 0.2), at("end")));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
