
// =====================================================================================================================
// BENNU, the real photo (NASA/Goddard/University of Arizona, public domain) as a big billboard in space.
// =====================================================================================================================
const BENNU = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: tex("ref/bennu_mosaic.jpg", true), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xdddddd }));
BENNU.material.map.wrapS = BENNU.material.map.wrapT = THREE.ClampToEdgeWrapping; scene.add(BENNU); BENNU.renderOrder = -5;
function bennuAt(pos, size, faceCam = true) { BENNU.visible = true; BENNU.position.copy(pos); BENNU.scale.setScalar(size / 9); if (faceCam) BENNU.quaternion.copy(H.cam.quaternion); }

// =====================================================================================================================
// THE TOUCH (diagram): a cut through the loose surface — pebbles and rocks barely held together — and the sampler head (a
// simple labelled disk, not the real hardware) pressing in, a puff of gas, sinking ~0.5 m, then backing away.
// 1 unit = 1 m.
// =====================================================================================================================
const CUT = new THREE.Group(); scene.add(CUT); CUT.position.set(-9000, 0, 0); CUT.visible = false;
const NPB = 1400; const PEB = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.95 }), NPB); PEB.castShadow = PEB.receiveShadow = true; CUT.add(PEB);
const PB0 = []; H.reseed(11); for (let i = 0; i < NPB; i++) { const x = (H.rnd() - 0.5) * 3.2, y = -H.rnd() * 1.4, z = (H.rnd() - 0.5) * 0.5; const s = 0.02 + Math.pow(H.rnd(), 3) * 0.12; PB0.push({ p: V(x, y, z), s, r: V(H.rnd() * 6, H.rnd() * 6, H.rnd() * 6), v: V((H.rnd() - 0.5) * 2, H.rnd() * 2.5 + 0.5, (H.rnd() - 0.5) * 2) }); }
{ const back = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 1 })); back.position.set(0, -0.7, -0.3); CUT.add(back);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -1.6; CUT.add(fl); }
const HEAD = new THREE.Group(); CUT.add(HEAD);
{ const disk = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 48), new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, metalness: 0.9, roughness: 0.3 }))); HEAD.add(disk);
  const rod = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 16), new THREE.MeshPhysicalMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.35 }))); rod.position.y = 1.15; HEAD.add(rod); }
const PUFF = Array.from({ length: 60 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.5, depthWrite: false })); CUT.add(m); return m; });
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion();
// head height (m): 0.6 above → 0 contact → −0.48 sunk → back up; burst k: pebbles thrown; fluid push around the head
function touch(t, hy, burst) { HEAD.position.set(0, hy + 0.05, 0);
  PB0.forEach((b, i) => { const p = b.p.clone(); const dx = p.x, dist = Math.abs(dx); const pushD = Math.max(0, -hy) * Math.exp(-dist * 3);
    if (p.y > hy - 0.3 && dist < 0.4) { p.x += Math.sign(dx || 1) * pushD * 0.8; p.y += pushD * 0.6; }
    if (burst > 0 && p.y > -0.4 && dist < 1.2) { const k = burst * (1.2 - dist); p.addScaledVector(b.v, k * 0.5); p.y -= 4.9 * 0.02 * k * k; }
    m4.compose(p, q4.setFromEuler(new THREE.Euler(b.r.x, b.r.y, b.r.z)), V(b.s, b.s * 0.8, b.s)); PEB.setMatrixAt(i, m4); }); PEB.instanceMatrix.needsUpdate = true;
  PUFF.forEach((m, i) => { const u = (t * 1.8 + i / PUFF.length) % 1; const on = hy < 0.02 && hy > -0.5; m.visible = on; m.position.set(Math.cos(i * 2.4) * (0.1 + u * 0.7), hy + 0.05 + u * 0.4, Math.sin(i * 1.3) * 0.2); m.material.opacity = 0.5 * (1 - u); }); }
const CW = (x, y, z) => CUT.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE 35 FASTENERS (diagram): a ring of 35 dots; two stuck (red) until the new tools free them (green).
// =====================================================================================================================
const RING = new THREE.Group(); scene.add(RING); RING.position.set(9000, 0, 0); RING.visible = false;
{ const plate = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 96), new THREE.MeshPhysicalMaterial({ color: 0x8a9096, metalness: 0.8, roughness: 0.35 }))); RING.add(plate);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(20, 64), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.07; fl.receiveShadow = true; RING.add(fl); }
const BOLTS = Array.from({ length: 35 }, (_, i) => { const a = i / 35 * TAU; const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 6), new THREE.MeshPhysicalMaterial({ color: 0xd8dde3, metalness: 1, roughness: 0.25, emissive: new THREE.Color(0) }))); b.position.set(Math.cos(a) * 1.05, 0.085, Math.sin(a) * 1.05); RING.add(b); return b; });
const STUCK = [7, 24];
function bolts(kRed, kFix, kOut) { BOLTS.forEach((b, i) => { const st = STUCK.includes(i); b.material.emissive.setRGB(st ? 1.6 * kRed * (1 - kFix) : 0, st ? 1.4 * kFix : 0, st ? 0.5 * kFix : 0); b.position.y = 0.085 + (st ? 0 : kOut * 0.6) + (st ? kFix * 0.4 : 0); b.visible = st || kOut < 0.98; }); }
const RW = (x, y, z) => RING.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: "Go private with the team" (TeamMove.tsx): a private space with its passcode; everyone on your Wi-Fi gets a one-tap
// invite; your tasks move with you. Then a teammate's phone: "<name> is going private · <space> · on your Wi-Fi · Join".
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PA = makePhone(), PB = makePhone(); ORS.add(PA.g, PB.g); PA.g.position.set(-0.55, 1.25, 0); PB.g.position.set(0.55, 1.25, 0); PA.g.scale.setScalar(1.05); PB.g.scale.setScalar(1.05); PA.g.rotation.y = 0.12; PB.g.rotation.y = -0.12;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  for (const x of [-0.55, 0.55]) { const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.set(x, 0.05, 0); ORS.add(ped); } }
const IMG = { ph: await img("shots_live/phone.png") };
function bg(g) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.5)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); } }
function drawA(g, st) { bg(g); g.fillStyle = "rgba(8,10,14,.96)"; rr(g, 40, 380, 700, 860, 36); g.fill(); g.strokeStyle = "rgba(255,255,255,.15)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#fff"; g.font = "900 46px D"; g.fillText("Go private with the team", 76, 460);
  const rows = [["🔒", "A private space, passcode", "482913"], ["👥", "Everyone on your Wi-Fi gets", "a one-tap invite"], ["●", "Your 3 tasks move with you", ""]];
  rows.forEach(([ic, a, b], i) => { const y = 560 + i * 120; g.font = "600 32px M"; g.fillStyle = "#cfd6dd"; g.fillText(ic + "  " + a, 76, y); if (b) { g.fillStyle = i === 0 ? green : "#cfd6dd"; g.font = i === 0 ? "800 36px M" : "600 32px M"; g.fillText("    " + b, 76, y + 46); } });
  g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 76, 920, 628, 76, 18); g.fill(); g.fillStyle = "#fff"; g.font = "600 30px M"; g.fillText("Sample lab", 100, 970);
  g.fillStyle = st.press ? "#2fd877" : green; rr(g, 76, 1030, 628, 110, 26); g.fill(); g.fillStyle = "#05150b"; g.font = "900 44px D"; g.fillText(st.done ? "You're private ✓" : "Go private", st.done ? 220 : 280, 1102); }
function drawB(g, st) { bg(g); if (st.invite) { g.fillStyle = "rgba(14,16,20,.98)"; rr(g, 40, 600, 700, 330, 36); g.fill(); g.strokeStyle = green; g.lineWidth = 3; g.stroke();
    g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("🔒 Anna is going private", 80, 690); g.fillStyle = "#9aa3ad"; g.font = "600 30px M"; g.fillText("Sample lab · on your Wi-Fi", 80, 744);
    g.fillStyle = st.join ? "#2fd877" : green; rr(g, 80, 790, 300, 100, 26); g.fill(); g.fillStyle = "#05150b"; g.font = "900 42px D"; g.fillText(st.joined ? "Joined" : "Join", st.joined ? 150 : 180, 856); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "arrays 6.2 m across"], capsule: ["Sample capsule", "#ffd166", "came home in 2023"], headL: ["Sampler head", "#cfd6dd", "diagram"],
  gasL: ["A puff of gas", "#cfe6ff", "stirs up pebbles"], sinkL: ["Sank almost 0.5 m", "#ff6b5e", ""], stuckL: ["2 of 35 fasteners", "#ff6b5e", "wouldn't come off"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("real", `<div style="width:1080px;text-align:center">${pill("REAL PHOTO · NASA/GODDARD/UNIV. OF ARIZONA")}</div>`, { left: "0px", top: "1120px" });
hudEl("tag", row(card("TOUCHED BENNU", "20 OCT 2020", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("depth", big("dN", "0 cm", "INTO THE SURFACE", "#fff", "#ff6b5e"), { left: "0px", top: "190px" });
hudEl("sec", big("sN", "0 s", "AFTER CONTACT", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("utah", row(card("CAPSULE LANDED", "UTAH · SEPT 2023", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("fixed", row(card("NEW TOOLS", "JAN 2024", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("illus", pill("ILLUSTRATION"), { left: "410px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["PRIVATE SPACE", "ONE-TAP INVITE", "TASKS MOVE"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
