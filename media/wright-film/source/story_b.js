
// =====================================================================================================================
// THE MUSEUM + ORBI: the Flyer on display in a dark gallery; a phone shares into a private Space, the laptop joins with
// the passcode and opens the file; the public feed never shows it
// =====================================================================================================================
const MUS = new THREE.Group(); scene.add(MUS); MUS.position.set(4000, 0, 0);
{ const fl = sh(new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshPhysicalMaterial({ color: 0x1b1d21, roughness: 0.35, clearcoat: 0.4, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 12, 12) })), false, true);
  fl.rotation.x = -Math.PI / 2; MUS.add(fl);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 18, 60), new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.9, side: THREE.BackSide })); wall.position.y = 9; MUS.add(wall);
  const dais = sh(new THREE.Mesh(new RoundedBoxGeometry(15, 0.5, 8.5, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.75 }))); dais.position.y = 0.25; MUS.add(dais);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(15.02, 0.02, 8.52), glow(0x9fc4ff, 1.1)); edge.position.y = 0.5; MUS.add(edge); }
const mSpots = [V(8, 9, 7), V(-8, 8.5, 6), V(0, 10, -7)].map((p, i) => { const s = new THREE.SpotLight(i === 2 ? 0x9fb8ff : 0xfff0dd, i === 2 ? 50 : 110, 40, 0.42, 0.6, 1.5); s.position.copy(p); s.target.position.set(0, 1.4, 0); s.castShadow = i === 0; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0002; MUS.add(s, s.target); return s; });
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); MUS.add(OR); OR.position.set(1.0, 0.0, 9.5); OR.rotation.y = 0.1;
const bench = sh(new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.36, 1.9, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x5a4632, roughness: 0.55, clearcoat: 0.3, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) }))); bench.position.set(0.2, -0.2, 0.3); OR.add(bench);
for (const x of [-2.2, 2.6]) { const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.6), metal(0x2a2d31, 0.4))); leg.position.set(x, -0.62, 0.3); OR.add(leg); }
OR.position.y = 0.8; ph.g.position.set(1.5, 0.06, 0.5); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.18); lap.g.position.set(-1.0, 0, -0.2); lap.g.rotation.y = 0.28; lap.g.scale.setScalar(0.8);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); orbiL.position.set(1.5, 0.6, 0.6); OR.add(orbiL);
const lock = makeLock(); OR.add(lock); lock.visible = false;
// a floating "room" around the two devices: the private Space (a glowing ring with a lock), strangers' phones outside it
const ROOM = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.02, 8, 160), glow(0x3dff8c, 1.6)); ROOM.rotation.x = Math.PI / 2; ROOM.position.set(0.2, 0.02, 0.2); OR.add(ROOM);
const OUT = [0, 1, 2].map((i) => { const p = makePhone(0x3a3d42); p.g.scale.setScalar(0.7); p.g.position.set(-3.6 + i * 3.9, 0.1 + (i === 1 ? 0.6 : 0), -2.8 - (i === 1 ? 0.8 : 0)); p.g.rotation.y = (i - 1) * 0.4; OR.add(p.g); return p; });
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (!st.on) return; g.fillStyle = "rgba(8,10,14,.94)"; rr(g, 50, 520, 680, 640, 34); g.fill();
  g.fillStyle = green; g.font = "800 30px M"; g.fillText("🔒 PRIVATE SPACE", 90, 585); g.fillStyle = "#fff"; g.font = "900 46px D"; g.fillText("flyer-workshop", 90, 645);
  g.fillStyle = "#9aa3ad"; g.font = "700 26px M"; g.fillText(`passcode ••••••  ·  ${st.members} member${st.members > 1 ? "s" : ""}`, 90, 690);
  ["wing-tests-1901.pdf", "engine-plans.png", "propeller-notes.txt"].forEach((f, i) => { const y = 740 + i * 110; const vis = st.files > i; g.globalAlpha = vis ? 1 : 0.18;
    g.fillStyle = "rgba(255,255,255,.07)"; rr(g, 90, y, 600, 88, 18); g.fill(); g.fillStyle = "#fff"; g.font = "700 30px M"; g.fillText(f, 120, y + 54); g.fillStyle = green; g.fillText("🔒", 640, y + 54); g.globalAlpha = 1; });
  g.fillStyle = "#cfd6dd"; g.font = "700 26px M"; g.fillText("never shown in public · members only", 90, 1112); }
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (!st.on) return; g.fillStyle = "rgba(8,10,14,.93)"; rr(g, 60, 520, 980, 340, 26); g.fill(); g.fillStyle = "#fff"; g.font = "800 34px M"; g.fillText("Join Space  ·  flyer-workshop", 96, 580);
  g.fillStyle = "rgba(255,255,255,.08)"; rr(g, 96, 610, 560, 70, 14); g.fill(); g.fillStyle = "#fff"; g.font = "800 40px M"; g.fillText("•".repeat(st.typed), 120, 660);
  g.fillStyle = st.joined ? green : "#9aa3ad"; g.font = "800 30px M"; g.fillText(st.joined ? "✓ JOINED · 3 FILES UNLOCKED" : st.typed ? "PASSCODE…" : "ENTER PASSCODE", 96, 740);
  if (st.joined) { g.fillStyle = "#cfd6dd"; g.font = "700 26px M"; g.fillText("wing-tests-1901.pdf · engine-plans.png · propeller-notes.txt", 96, 800); } }
function drawStranger(g, st) { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 60, 600, 660, 300, 30); g.fill();
  g.fillStyle = "#9aa3ad"; g.font = "800 34px M"; g.fillText("OPEN VOID · NEARBY", 100, 680); g.fillStyle = "#fff"; g.font = "700 30px M"; g.fillText("nothing from that Space", 100, 760); g.fillStyle = "#ff7a6d"; g.fillText("🔒 members only", 100, 830); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  scan: ["Laser scan", "#9fd4ff", "every wire, every rib"], spruce: ["Spruce", "#ffd166", "straight parts: spars, struts"], ash: ["Ash", "#ff9a5c", "curved parts: the ribs"], muslin: ["Cotton muslin", "#f2efe8", "\"Pride of the West\""],
  eng: ["The engine", "#cfd6dd", "built from scratch"], al: ["Aluminium body", "#9fd4ff", "to save weight"], chainX: ["One chain crossed", "#ff8a3d", "so the props spin opposite"],
  propL: ["Propeller", "#cfd6dd", "spruce, carved by hand"], fan: ["Fan", "#cfd6dd", "makes the wind"], model: ["Model wing", "#ffd166", "on a balance"], shelf: ["200 test wings", "#ff9a5c", "Oct – Dec 1901"],
  liftA: ["Lift", "#3dff8c", "air pushes the wing up"], down: ["Air pushed down", "#ff8a3d", "the wing's reaction"], cradle: ["Hip cradle", "#ffd166", "the pilot's hips steer"], tips: ["Wing tips twist", "#3dff8c", "\"wing warping\""],
  rud: ["Rudder turns too", "#9fd4ff", "linked by wires"], rail: ["Launching rail", "#ffd166", "60 ft of wood"], wind: ["Wind", "#9fd4ff", "over 30 km/h"],
  f1: ["Flight 1 · 37 m", "#3dff8c", "12 seconds"], jet: ["Jumbo jet wingspan", "#ffd166", "59.6 m (747-100)"], f4: ["Flight 4 · 260 m", "#ff8a3d", "59 seconds"],
  room: ["Private Space", "#3dff8c", "a named room + passcode"], outsiders: ["Everyone else", "#ff7a6d", "sees nothing"],
});
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("WINGSPAN", "12.3 m")}${card("EMPTY", "274 kg")}${card("WING AREA", "47 m²")}</div>`, { left: "0px", top: "1440px" });
hudEl("estats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("POWER", "12 hp")}${card("ENGINE", "82 kg")}${card("PROPS", "351 rpm")}</div>`, { left: "0px", top: "1440px" });
hudEl("timer", `<div style="width:1080px;display:flex;justify-content:center;gap:18px"><div style="padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #3dff8c;text-align:center"><div style="font:700 24px M;letter-spacing:.16em;color:#aab3bd">TIME</div><div id="tmT" style="font:900 96px/1 D;font-stretch:112%;color:#fff">0.0 s</div></div><div style="padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #3dff8c;text-align:center"><div style="font:700 24px M;letter-spacing:.16em;color:#aab3bd">DISTANCE</div><div id="tmD" style="font:900 96px/1 D;font-stretch:112%;color:#3dff8c">0 m</div></div></div>`, { left: "0px", top: "230px" });
hudEl("day", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("DATE", "17 DEC 1903")}${card("WIND", "30+ km/h", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("sped", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">SPED UP ×2</div>`, { left: "395px", top: "1110px" });
hudEl("flights", `<div style="width:1080px;display:flex;justify-content:center;gap:12px">${[["1", "37 m", "#3dff8c"], ["2", "53 m", "#6fd0ff"], ["3", "61 m", "#ffd166"], ["4", "260 m", "#ff8a3d"]].map(([n, d, c]) => `<div style="padding:14px 18px;border-radius:18px;background:rgba(8,10,16,.82);border:2px solid ${c};text-align:center"><div style="font:700 22px M;color:#aab3bd">FLIGHT ${n}</div><div style="font:900 50px D;color:${c}">${d}</div></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("never", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:18px 34px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #ff7a6d;font:900 60px D;font-stretch:112%;color:#fff">NEVER FLEW AGAIN</div></div>`, { left: "0px", top: "250px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["PRIVATE SPACES", "PASSCODE", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("cam", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">CAMBER 1 : 20 · AIRFLOW SHOWN</div>`, { left: "270px", top: "240px" });
