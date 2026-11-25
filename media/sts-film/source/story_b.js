
// =====================================================================================================================
// ORBI: under Discovery's wing; a phone shows the file's QR code; a second phone scans it, types the code, it unlocks
// =====================================================================================================================
const IMG = { ph: await img("shots_live/phone.png") };
const phA = makePhone(), phB = makePhone(0x3a3d42); const OR = new THREE.Group(); OR.add(phA.g, phB.g); HG.add(OR); OR.position.set(14, 1.2, 22); OR.rotation.y = -0.5;
const table = sh(new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.12, 1.8, 3, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x23262b, roughness: 0.4, clearcoat: 0.5 }))); table.position.set(0, -0.12, 0); OR.add(table);
const tleg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 1.1, 24), metal(0x3a3d42, 0.4))); tleg.position.y = -0.7; OR.add(tleg);
phA.g.position.set(-0.6, 0.05, 0.1); phA.g.rotation.set(-Math.PI / 2 + 0.25, 0, 0.1); phB.g.position.set(0.7, 0.55, 0.45); phB.g.rotation.set(-0.35, -0.25, 0);
const scanBeam = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 4, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.2, 0.6), transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); OR.add(scanBeam);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); orbiL.position.set(0, 0.8, 0.3); OR.add(orbiL);
// a QR-like grid (decorative; drawn per frame from a fixed random pattern with the three finder squares)
H.reseed(77); const QR = Array.from({ length: 25 * 25 }, () => H.rnd() > 0.5);
function drawQR(g, x, y, s) { const c = s / 25; g.fillStyle = "#fff"; rr(g, x - 14, y - 14, s + 28, s + 28, 14); g.fill(); g.fillStyle = "#0b0d10";
  for (let i = 0; i < 25; i++) for (let j = 0; j < 25; j++) { const fin = (a, b) => i >= a && i < a + 7 && j >= b && j < b + 7; const inF = fin(0, 0) || fin(18, 0) || fin(0, 18);
    let on = QR[i * 25 + j]; if (inF) { const li = i % 18 % 7, lj = j % 18 % 7; on = li === 0 || li === 6 || lj === 0 || lj === 6 || (li >= 2 && li <= 4 && lj >= 2 && lj <= 4); } if (on) g.fillRect(x + i * c, y + j * c, c + 0.5, c + 0.5); } }
function drawA(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "rgba(8,10,14,.94)"; rr(g, 50, 380, 680, 980, 34); g.fill(); g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("discovery-photos.zip", 90, 450); g.fillStyle = "#9aa3ad"; g.font = "700 28px M"; g.fillText("1.2 GB · locked on this phone", 90, 495);
  drawQR(g, 165, 550, 450); g.fillStyle = "#9aa3ad"; g.font = "700 28px M"; g.fillText("CODE", 90, 1095); g.fillStyle = green; g.font = "900 72px M"; g.fillText("• • • •", 90, 1180);
  g.fillStyle = "#cfd6dd"; g.font = "700 26px M"; g.fillText("the code you chose · share it", 90, 1260); }
function drawB(g, st) { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688);
  if (st.mode === 0) { g.fillStyle = "#14181c"; g.fillRect(0, 0, 780, 1688); drawQR(g, 190, 560, 400); g.strokeStyle = green; g.lineWidth = 8; for (const [x, y, dx, dy] of [[150, 520, 1, 1], [630, 520, -1, 1], [150, 1000, 1, -1], [630, 1000, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * 70); g.lineTo(x, y); g.lineTo(x + dx * 70, y); g.stroke(); }
    g.fillStyle = green; g.font = "800 34px M"; g.fillText("SCANNING…", 270, 1120); }
  else { g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 60, 420, 660, 760, 30); g.fill(); g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("discovery-photos.zip", 100, 500);
    g.fillStyle = "#9aa3ad"; g.font = "700 28px M"; g.fillText("enter the code", 100, 560); for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(255,255,255,.1)"; rr(g, 100 + i * 140, 600, 110, 130, 18); g.fill(); if (i < st.typed) { g.fillStyle = "#fff"; g.font = "900 80px M"; g.fillText("•", 135 + i * 140, 695); } }
    if (st.open) { g.fillStyle = green; g.font = "800 40px M"; g.fillText("🔓 UNLOCKED", 100, 830); g.fillStyle = "#cfd6dd"; g.font = "700 28px M"; g.fillText("on this phone · 1.2 GB", 100, 885);
      g.fillStyle = green; rr(g, 100, 930, 580 * Math.min(1, st.got), 26, 12); g.fill(); } } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  scan: ["Laser scan", "#9fd4ff", "the real OV-103"], len: ["37.2 m long", "#ffd166", "nose to tail"], span: ["23.8 m wings", "#ffd166", "tip to tip"],
  belly: ["The belly", "#ff8a3d", "faces the heat"], tilesL: ["Silica tiles", "#cfd6dd", "almost pure quartz sand"], alu: ["Aluminium skin", "#9fb8c9", "max 175 °C"],
  core: ["White inside", "#f2efe8", "the black is only a coating"], crushL: ["So light", "#ff8a3d", "it crumbles in a hand"], rcc: ["Reinforced carbon-carbon", "#3dff8c", "nose cap + wing edges"],
  black: ["Black tiles", "#cfd6dd", "underneath: the hottest side"], white: ["White on top", "#f2efe8", "cooler side"], newT: ["Replaced tiles", "#9fd4ff", "solid black until first re-entry"],
  path: ["Glide path", "#3dff8c", "no engine"], fwdL: ["4.5 forward", "#6fd0ff", ""], dnL: ["1 down", "#ff8a3d", ""], qr: ["Its own QR code", green, "one per file"], code: ["+ a short code", green, "unlocks it"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("flights", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("SPACEFLIGHTS", "39", "#3dff8c")}${card("YEARS", "27")}${card("MOST OF ANY", "SPACECRAFT", "#ffd166")}</div>`, { left: "0px", top: "1440px" });
hudEl("temps", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("OUTSIDE", "1,650 °C", "#ff8a3d")}${card("ALUMINIUM MAX", "175 °C", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("count", `<div style="width:1080px;text-align:center"><div id="cN" style="font:900 170px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">0</div><div id="cL" style="font:800 40px D;letter-spacing:.12em;color:#cfd6dd;margin-top:6px">TILES</div></div>`, { left: "0px", top: "200px" });
hudEl("ratio", `<div style="width:1080px;text-align:center"><div style="font:900 150px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">4.5 : 1</div><div style="font:800 36px D;letter-spacing:.12em;color:#3dff8c;margin-top:6px">GLIDE RATIO ON APPROACH</div></div>`, { left: "0px", top: "210px" });
hudEl("mag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MAGNIFIED · SECTION</div>`, { left: "370px", top: "1110px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["QR PER FILE", "SHORT CODE", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
