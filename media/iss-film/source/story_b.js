
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
