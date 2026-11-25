
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
