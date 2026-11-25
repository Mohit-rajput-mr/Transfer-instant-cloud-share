
// =====================================================================================================================
// THE ORBIT (diagram, far away): the Sun to scale with Mercury's and Venus's orbits and Parker's final orbit (closest
// 9.86 solar radii from the centre = 6.1 million km from the surface; farthest ≈ Venus's distance). 1 solar radius = 0.1.
// =====================================================================================================================
const ORB = new THREE.Group(); scene.add(ORB); ORB.position.set(0, 9000, 0); ORB.visible = false;
const RS = 0.1, PERI = 9.86 * RS, VEN = 155.5 * RS, MER = 83.2 * RS;
const ORBA = (PERI + VEN * 0.98) / 2, ORBE = (VEN * 0.98 - PERI) / (VEN * 0.98 + PERI);
const ellipse = (th) => { const r = ORBA * (1 - ORBE * ORBE) / (1 + ORBE * Math.cos(th)); return V(Math.cos(th) * r, 0, Math.sin(th) * r); };
{ const sun = new THREE.Mesh(new THREE.SphereGeometry(RS, 48, 24), glow(0xffc070, 4)); ORB.add(sun);
  const ring = (r, c, op = 0.8) => { const pts = []; for (let i = 0; i <= 512; i++) { const a = i / 512 * TAU; pts.push(V(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), transparent: true, opacity: op, toneMapped: false })); ORB.add(l); return l; };
  ring(MER, 0xb9a48f); ring(VEN, 0xe8c87a);
  const pts = []; for (let i = 0; i <= 1024; i++) pts.push(ellipse(i / 1024 * TAU));
  ORB.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(0.6, 1.4, 2.0), toneMapped: false })));
  const grid = new THREE.PolarGridHelper(VEN * 1.1, 16, 10, 128, 0x1d3a52, 0x13202c); grid.material.transparent = true; grid.material.opacity = 0.3; ORB.add(grid); }
const PDOT = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 12), glow(0xffffff, 4)); ORB.add(PDOT);
const OW2 = (v) => ORB.localToWorld(v.clone());

// =====================================================================================================================
// NEW YORK → TOKYO on the Earth (1:1,000,000), a great-circle arc drawn at Parker's speed: 10,850 km in ~56 s.
// =====================================================================================================================
const ll = (lat, lon, r = RE * 1.003) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); };
// three's sphere UVs put lon 0 at -x... fix the texture longitude by rotating the ground: measured with the day map (lon = -90 at +z)
const NYC = ll(40.71, -74.0), TYO = ll(35.68, 139.69);
const ARC = (() => { const N = 200, pts = []; const a = NYC.clone().normalize(), b = TYO.clone().normalize(); const om = Math.acos(a.dot(b));
  for (let i = 0; i <= N; i++) { const t = i / N; const p = a.clone().multiplyScalar(Math.sin((1 - t) * om) / Math.sin(om)).add(b.clone().multiplyScalar(Math.sin(t * om) / Math.sin(om))); p.multiplyScalar(RE * (1.004 + 0.03 * Math.sin(t * Math.PI))); pts.push(p); }
  const curve = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 22, 8, false), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 } }, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uK; varying vec2 vU; void main(){ float show = step(vU.x, uK); float head = exp(-pow((vU.x - uK) * 40.0, 2.0)); gl_FragColor = vec4(vec3(1.0, 0.7, 0.3) * (0.7 + 3.0 * head) * show, 1.0); }` }));
  m.userData.curve = curve; EARTH.add(m); return m; })();
const CITYDOT = (p, c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(55, 16, 12), glow(c, 3)); m.position.copy(p); EARTH.add(m); return m; };
CITYDOT(NYC, 0xffffff); CITYDOT(TYO, 0xffffff);
const HEAD = new THREE.Mesh(new THREE.SphereGeometry(70, 16, 12), glow(0xffd080, 5)); EARTH.add(HEAD);
const EW = (v) => EARTH.localToWorld(v.clone());

// =====================================================================================================================
// THE SHIELD, cut open (diagram): carbon-carbon skin · carbon foam core (97% air: drawn as open cells) · carbon-carbon skin,
// 11.4 cm thick, a white coating on the Sun side.
// =====================================================================================================================
const LAB = new THREE.Group(); scene.add(LAB); LAB.position.set(-9000, 0, 0); LAB.visible = false;
const FOAMU = { uT: { value: 0 }, uZoom: { value: 0 } };
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.6; fl.receiveShadow = true; LAB.add(fl);
  const grid = new THREE.GridHelper(30, 60, 0x1d3a52, 0x13202c); grid.position.y = -0.595; grid.material.transparent = true; grid.material.opacity = 0.5; LAB.add(grid); }
const SLAB = new THREE.Group(); LAB.add(SLAB);
const T_SKIN = 0.012, T_FOAM = 0.114, W_SLAB = 1.2, D_SLAB = 0.8, K = 4;   // drawn 4× thicker so the layers read; labelled
const skinM = new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, roughness: 0.55, metalness: 0.2, clearcoat: 0.3 });
const coatM = new THREE.MeshPhysicalMaterial({ color: 0xf2f2ee, roughness: 0.35, clearcoat: 0.6 });
const foamM = new THREE.ShaderMaterial({ uniforms: FOAMU, vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT; varying vec3 vP; varying vec3 vN; ${NOISE}
    float cell(vec3 p){ vec3 i = floor(p), f = fract(p); float d = 1.0; for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 o = vec3(x, y, z); vec3 r = o + vec3(hh(i + o), hh(i + o + 7.1), hh(i + o + 3.3)) - f; d = min(d, dot(r, r)); } return sqrt(d); }
    void main(){ float c = cell(vP * 110.0); float wall = smoothstep(0.62, 0.72, c); vec3 air = vec3(0.02, 0.025, 0.03); vec3 carbon = vec3(0.22, 0.23, 0.25) * (0.8 + 0.4 * fbm(vP * 90.0));
      float l = 0.55 + 0.45 * max(dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.5))), 0.0); gl_FragColor = vec4(mix(air, carbon * l, 1.0 - wall), 1.0); }` });
{ const y0 = 0; let y = y0;
  const lay = (t, m, nm) => { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(W_SLAB, t * K, D_SLAB), m)); b.position.y = y + t * K / 2; y += t * K; b.name = nm; SLAB.add(b); return b; };
  SLAB.userData.back = lay(T_SKIN, skinM, "back"); SLAB.userData.foam = lay(T_FOAM, foamM, "foam"); SLAB.userData.front = lay(T_SKIN, skinM, "front"); SLAB.userData.coat = lay(0.003, coatM, "coat"); SLAB.userData.top = y; }
SLAB.rotation.x = 0; SLAB.position.set(0, -0.3, 0);
const LW = (x, y, z) => LAB.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: the phone shows a file you shared, as Orbi draws it: a glass bubble with the name, a green dot running round its
// edge for each person who has it open right now, and the live / downloads stats (OrbView.tsx, Void.tsx).
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  const cx = 390, cy = 600, R = 240;
  // the bubble
  const gr = g.createRadialGradient(cx - 80, cy - 90, 20, cx, cy, R); gr.addColorStop(0, "rgba(255,255,255,.22)"); gr.addColorStop(0.7, "rgba(120,170,255,.08)"); gr.addColorStop(1, "rgba(160,200,255,.28)");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#fff"; g.font = "800 46px M"; g.textAlign = "center"; g.fillText("parker-24dec.mp4", cx, cy - 10); g.fillStyle = "#9aa3ad"; g.font = "600 30px M"; g.fillText("1.4 GB · burns in 27 min", cx, cy + 40);
  // live viewers: green dots running round the edge
  for (let k = 0; k < st.live; k++) { const a = st.t * 0.9 + k * TAU / Math.max(1, st.live) ; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    g.fillStyle = "rgba(61,255,140,.25)"; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.fill(); g.fillStyle = green; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
  // stats pill
  g.fillStyle = "rgba(8,10,14,.92)"; rr(g, cx - 200, cy + R + 50, 400, 92, 46); g.fill(); g.strokeStyle = st.live ? green : "rgba(255,255,255,.2)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = green; g.beginPath(); g.arc(cx - 150, cy + R + 96, 12, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.font = "800 40px M"; g.textAlign = "left"; g.fillText(`${st.live} live`, cx - 125, cy + R + 110);
  g.fillStyle = "#cfd6dd"; g.fillText(`↓ ${st.dl}`, cx + 60, cy + R + 110);
  if (st.toast) { g.fillStyle = "rgba(20,22,26,.95)"; rr(g, 150, 1400, 480, 84, 42); g.fill(); g.strokeStyle = green; g.lineWidth = 2; g.stroke(); g.fillStyle = green; g.font = "800 32px M"; g.textAlign = "center"; g.fillText(st.toast, 390, 1454); g.textAlign = "left"; }
  g.textAlign = "left"; }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "named for Eugene Parker"], shieldL: ["Heat shield", "#ffd166", "2.3 m wide, faces the Sun"], arrays: ["Solar arrays", "#9fd4ff", "tucked behind the shield"],
  sunL: ["The Sun", "#ffb340", ""], periL: ["Closest pass", "#ffd166", "24 Dec 2024"], merL: ["Mercury's orbit", "#b9a48f", ""], parkL: ["Parker's orbit", "#9fd4ff", ""],
  nycL: ["New York", "#fff", ""], tyoL: ["Tokyo", "#fff", "10,850 km"], coatL: ["White coating", "#f2f2ee", "faces the Sun"], skinL: ["Carbon-carbon skin", "#cfd6dd", ""],
  foamL: ["Carbon foam · 11.4 cm", "#ffd166", "97% air"], bodyL: ["Spacecraft", "#3dff8c", "~30 °C"], frontL: ["Sun side", "#ffb340", "up to ~1,400 °C"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("fast", row(card("FASTEST OBJECT", "EVER BUILT", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("named", row(card("LAUNCHED", "12 AUG 2018", "#9fd4ff"), card("NAMED FOR", "E. PARKER", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("dist", big("dN", "6.1M km", "FROM THE SUN'S SURFACE", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("date", row(card("CLOSEST PASS", "24 DEC 2024", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("kmh", big("kN", "0", "KM/H", "#fff", "#ffb340"), { left: "0px", top: "190px" });
hudEl("nyt", big("tN", "0 s", "NEW YORK → TOKYO", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("temp", big("cN", "0 °C", "SUN SIDE OF THE SHIELD", "#fff", "#ffb340"), { left: "0px", top: "190px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("thick", row(card("FOAM CORE", "11.4 cm", "#ffd166"), card("OF IT IS", "97% AIR", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("thermal", pill("THERMAL VIEW · DIAGRAM"), { left: "350px", top: "1120px" });
hudEl("two", row(card("SUN SIDE", "~1,400 °C", "#ffb340"), card("BEHIND", "~30 °C", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("auto", row(card("NO ONE STEERING", "IT FLIES ITSELF", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("wait", big("wN", "24 DEC", "WAITING FOR A SIGNAL", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("ok", row(card("26 DEC 2024 · BEACON", "HEALTHY", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("livebig", big("lvN", "0", "OPEN RIGHT NOW", "#fff", green), { left: "0px", top: "170px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["LIVE VIEWERS", "LIVE DOWNLOADS", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
