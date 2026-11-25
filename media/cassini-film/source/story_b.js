
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
