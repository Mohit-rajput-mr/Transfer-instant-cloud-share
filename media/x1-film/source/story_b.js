
// =====================================================================================================================
// ORBI: in the gallery under the X-1: a big file split into parts; 3 parts travel up at once, 4 come down at once
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); MUS.add(OR); OR.position.set(0.5, 0.8, 12); OR.rotation.y = 0.05;
const bench = sh(new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.36, 1.9, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x5a4632, roughness: 0.55, clearcoat: 0.3, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) }))); bench.position.set(0.2, -0.2, 0.3); OR.add(bench);
for (const x of [-2.6, 2.9]) { const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.6), metal(0x2a2d31, 0.4))); leg.position.set(x, -0.62, 0.3); OR.add(leg); }
ph.g.position.set(1.9, 0.06, 0.5); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.18); lap.g.position.set(-1.3, 0, -0.2); lap.g.rotation.y = 0.22; lap.g.scale.setScalar(0.8);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); orbiL.position.set(1.5, 0.6, 0.6); OR.add(orbiL);
// storage: a glowing slab floating above the bench, lanes of parts going up (3) and down (4)
const STORE = new THREE.Group(); STORE.position.set(0.3, 3.6, -1.2); OR.add(STORE);
{ const slab = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.5, 1.0, 3, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x0e1418, roughness: 0.3, metalness: 0.5, emissive: new THREE.Color(0x0b2a1a) })); STORE.add(slab);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.02, 1.02), glow(0x3dff8c, 1.4)); edge.position.y = -0.25; STORE.add(edge); }
const hexTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g2 = c.getContext("2d"); g2.fillStyle = "#06120c"; g2.fillRect(0, 0, 256, 256); g2.font = "700 30px M"; g2.fillStyle = "#3dff8c"; H.reseed(9);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) g2.fillText(Math.floor(H.rnd() * 256).toString(16).padStart(2, "0"), 14 + x * 62, 36 + y * 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const partM = new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) }), partD = new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(0.8, 1.4, 2.0) });
const UP = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.16, 2, 0.02), partM); OR.add(m); return m; });
const DN = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.16, 2, 0.02), partD); OR.add(m); return m; });
const laneMat = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.2), transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false });
const LANES = []; { const a = ph.g.position.clone().add(V(0, 0.3, 0)), b = lap.g.position.clone().add(V(0.2, 1.0, 0.1));
  for (let i = 0; i < 3; i++) { const s = STORE.position.clone().add(V(0.6 + (i - 1) * 0.35, -0.3, 0)); LANES.push({ from: a.clone().add(V((i - 1) * 0.12, 0, 0)), to: s, up: true }); }
  for (let i = 0; i < 4; i++) { const s = STORE.position.clone().add(V(-0.9 + (i - 1.5) * 0.3, -0.3, 0)); LANES.push({ from: s, to: b.clone().add(V((i - 1.5) * 0.15, 0, 0)), up: false }); }
  LANES.forEach((l) => { const mid = l.from.clone().lerp(l.to, 0.5).add(V(0, 0.4, 0)); const tg = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(l.from, mid, l.to), 40, 0.012, 6, false); const m = new THREE.Mesh(tg, laneMat(l.up ? 0x3dff8c : 0x6fd0ff)); OR.add(m); l.mesh = m; l.curve = new THREE.QuadraticBezierCurve3(l.from, mid, l.to); }); }
function lanes(t, kUp, kDn) { UP.forEach((m, i) => { const lane = LANES[i % 3]; const u = ((t * 0.55 + Math.floor(i / 3) / 3 + (i % 3) * 0.07) % 1); m.visible = kUp > 0; m.position.copy(lane.curve.getPoint(u)); m.rotation.set(t * 2 + i, t * 1.5, 0); m.scale.setScalar(kUp); });
  DN.forEach((m, i) => { const lane = LANES[3 + (i % 4)]; const u = ((t * 0.6 + Math.floor(i / 4) / 3 + (i % 4) * 0.05) % 1); m.visible = kDn > 0; m.position.copy(lane.curve.getPoint(u)); m.rotation.set(t * 2 + i, t * 1.5, 0); m.scale.setScalar(kDn); });
  LANES.forEach((l) => { l.mesh.visible = l.up ? kUp > 0 : kDn > 0; }); }
function drawPhone(g2, st) { if (IMG.ph) g2.drawImage(IMG.ph, 0, 0, 780, 1688); else { g2.fillStyle = "#0b0d10"; g2.fillRect(0, 0, 780, 1688); }
  if (!st.on) return; g2.fillStyle = "rgba(8,10,14,.94)"; rr(g2, 50, 540, 680, 600, 34); g2.fill();
  g2.fillStyle = "#fff"; g2.font = "800 38px M"; g2.fillText("x1-flight-film.mov", 90, 610); g2.fillStyle = "#9aa3ad"; g2.font = "700 28px M"; g2.fillText("18.4 GB · split into parts", 90, 655);
  for (let i = 0; i < 40; i++) { const x = 90 + (i % 8) * 76, y = 690 + Math.floor(i / 8) * 64; const done = i < st.sent, fly = !done && i < st.sent + 3; g2.fillStyle = done ? green : fly ? "#b8ffd6" : "rgba(255,255,255,.12)"; rr(g2, x, y, 64, 52, 10); g2.fill(); }
  g2.fillStyle = green; g2.font = "800 32px M"; g2.fillText(st.sent >= 40 ? "✓ UPLOADED" : `UPLOADING · 3 PARTS AT ONCE`, 90, 1050); g2.fillStyle = "#cfd6dd"; g2.font = "700 26px M"; g2.fillText("max file size 20 GB", 90, 1095); }
function drawLap(g2, st) { if (IMG.lap) g2.drawImage(IMG.lap, 0, 0, 1440, 900); else { g2.fillStyle = "#0b0d10"; g2.fillRect(0, 0, 1440, 900); }
  if (!st.on) return; g2.fillStyle = "rgba(8,10,14,.92)"; rr(g2, 60, 600, 980, 260, 26); g2.fill(); g2.fillStyle = "#fff"; g2.font = "700 32px M"; g2.fillText("x1-flight-film.mov  ·  18.4 GB", 96, 655);
  for (let r = 0; r < 4; r++) { g2.fillStyle = "rgba(255,255,255,.1)"; rr(g2, 96, 680 + r * 34, 860, 24, 8); g2.fill(); g2.fillStyle = "#6fd0ff"; rr(g2, 96, 680 + r * 34, 860 * Math.min(1, st.got * (1 + r * 0.03)), 24, 8); g2.fill(); }
  g2.fillStyle = "#6fd0ff"; g2.font = "800 28px M"; g2.fillText(st.got >= 1 ? "✓ DOWNLOADED" : "DOWNLOADING · 4 AT ONCE", 96, 840); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  scan: ["Laser scan", "#9fd4ff", "the real paint, the real 46-062"], body: ["Bullet-shaped body", "#ffd166", "like a .50-calibre round"], wing: ["Thin wings", "#9fd4ff", "for high speed"],
  stab: ["Whole tail tilts", "#3dff8c", "adjustable stabilizer"], shock: ["Shock wave", "#ff8a3d", "on the wing"], ch: ["4 rocket chambers", "#ff8a3d", "alcohol + liquid oxygen"],
  wave: ["Pressure waves", "#6fd0ff", "sound, spreading out"], pile: ["Waves pile up", "#ff8a3d", "the shock wave"], cone: ["Mach cone", "#ffd166", "the shock sweeps back"],
  boomL: ["The boom", "#ffd166", "where the cone meets the ground"], quiet: ["Quiet here", "#9fd4ff", "the cone hasn't arrived"],
  up3: ["3 parts up at once", "#3dff8c", "to storage"], dn4: ["4 parts down at once", "#6fd0ff", "to the laptop"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("mach", `<div style="width:1080px;text-align:center"><div style="font:700 30px M;letter-spacing:.2em;color:#aab3bd">MACH</div><div id="mN" style="font:900 190px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">0.80</div><div id="mL" style="font:800 40px D;letter-spacing:.12em;color:#ffd166;margin-top:6px"></div></div>`, { left: "0px", top: "200px" });
hudEl("sos", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("SPEED OF SOUND", "343 m/s", "#6fd0ff")}${card("AT 20 °C", "1,234 km/h")}</div>`, { left: "0px", top: "1440px" });
hudEl("date", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("DATE", "14 OCT 1947")}${card("ALTITUDE", "13.7 km", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("WINGSPAN", "8.5 m")}${card("ROCKET", "4 × 1,500 lbf", "#ff8a3d")}</div>`, { left: "0px", top: "1440px" });
hudEl("diag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">SOUND SLOWED DOWN TO BE SEEN</div>`, { left: "270px", top: "1110px" });
hudEl("nwave", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:18px 26px;border-radius:24px;background:rgba(8,10,16,.84);border:1.5px solid rgba(255,255,255,.22)"><div style="font:700 22px M;letter-spacing:.16em;color:#aab3bd;text-align:left">AIR PRESSURE HERE</div><svg width="620" height="150" viewBox="0 0 620 150"><line x1="0" y1="75" x2="620" y2="75" stroke="rgba(255,255,255,.25)" stroke-width="2"/><path id="nwP" d="M0 75 L620 75" fill="none" stroke="#ffd166" stroke-width="6" stroke-linejoin="round"/></svg></div></div>`, { left: "0px", top: "230px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["3 UP AT ONCE", "4 DOWN AT ONCE", "20 GB"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("b29", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">RELEASED FROM A B-29 BOMB BAY</div>`, { left: "265px", top: "1110px" });
