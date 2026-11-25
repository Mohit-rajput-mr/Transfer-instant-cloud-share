
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
