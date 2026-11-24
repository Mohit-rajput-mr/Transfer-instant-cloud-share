
// =====================================================================================================================
// ORBI: a bench in the gallery, Columbia behind the glass; a phone uploads, the connection drops, the upload resumes and
// sends only the missing parts to storage; the laptop then gets the file
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); MUS.add(OR);
OR.position.set(1.2, 0.0, 7.2); OR.rotation.y = 0.12;
const bench = sh(new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.36, 1.9, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x5a4632, roughness: 0.55, clearcoat: 0.3, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) })));
bench.position.set(0.2, -0.2, 0.3); OR.add(bench);
for (const x of [-2.2, 2.6]) { const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.6), metal(0x2a2d31, 0.4))); leg.position.set(x, -0.62, 0.3); OR.add(leg); }
lap.g.position.set(-1.0, 0, -0.2); lap.g.rotation.y = 0.28; lap.g.scale.setScalar(0.8); ph.g.position.set(1.5, 0.06, 0.5); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.18);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); orbiL.position.set(1.5, 0.6, 0.6); OR.add(orbiL);
const hexTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#06120c"; g.fillRect(0, 0, 256, 256); g.font = "700 30px M"; g.fillStyle = "#3dff8c"; H.reseed(9);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) g.fillText(Math.floor(H.rnd() * 256).toString(16).padStart(2, "0"), 14 + x * 62, 36 + y * 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const NPART = 24, DROP_AT = 15;   // parts 0–14 arrive, then the link drops (62 %), 15–23 go after it resumes
const partMat = new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) });
const lostMat = new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(2.2, 0.4, 0.35), transparent: true });
const PARTS = Array.from({ length: NPART + 2 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 0.14, 2, 0.02), partMat); OR.add(m); return m; });
// storage: a rack across the bench, its screen a grid of stored parts
const RACK = new THREE.Group(); RACK.position.set(2.6, -0.62, -3.4); RACK.rotation.y = -0.35; OR.add(RACK);
{ const body = sh(new THREE.Mesh(new RoundedBoxGeometry(1.0, 2.2, 0.9, 3, 0.04), metal(0x22262b, 0.4))); body.position.y = 1.1; RACK.add(body);
  for (let i = 0; i < 11; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.02), metal(0x30353b, 0.35)); u.position.set(0, 0.3 + i * 0.17, 0.46); RACK.add(u);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), glow(i % 3 ? 0x3dff8c : 0x6fd0ff, 3)); led.position.set(0.38, 0.3 + i * 0.17, 0.475); RACK.add(led); } }
const rackTex = H.canvasTex(512, 320, () => {}); const rackScr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62), new THREE.MeshBasicMaterial({ map: rackTex, toneMapped: false })); rackScr.position.set(0, 2.62, 0.1); RACK.add(rackScr);
const rackDev = { tex: rackTex, ctx: rackTex.userData.g, last: "" };
function grid(g, x0, y0, w, cols, st, cell = 0) { const n = NPART, rows = Math.ceil(n / cols), s = w / cols;
  for (let i = 0; i < n; i++) { const cx = x0 + (i % cols) * s, cy = y0 + Math.floor(i / cols) * s; const ok = i < st.sent; const lost = st.lost && (i === DROP_AT || i === DROP_AT + 1) && !ok;
    g.fillStyle = ok ? green : lost ? "#ff5a4d" : "rgba(255,255,255,.14)"; rr(g, cx + 3, cy + 3, s - 6, s - 6, Math.max(3, s * 0.15)); g.fill(); } return y0 + rows * s; }
function drawRack(g, st) { g.fillStyle = "#06120c"; g.fillRect(0, 0, 512, 320); g.fillStyle = "#cfd6dd"; g.font = "800 30px M"; g.fillText("STORAGE", 24, 44);
  g.fillStyle = st.drop ? "#ff8a7a" : green; g.font = "700 24px M"; g.fillText(st.drop ? "WAITING…" : `${st.sent}/${NPART} PARTS`, 300, 44); grid(g, 24, 70, 464, 8, st); }
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (!st.on) return;
  g.fillStyle = "rgba(8,10,14,.93)"; rr(g, 50, 560, 680, 560, 34); g.fill();
  g.fillStyle = "#fff"; g.font = "800 38px M"; g.fillText("apollo-11-photos.zip", 90, 630); g.fillStyle = "#9aa3ad"; g.font = "700 28px M"; g.fillText("2.4 GB · sent in parts", 90, 675);
  const p = st.sent / NPART; g.fillStyle = "rgba(255,255,255,.12)"; rr(g, 90, 705, 600, 26, 13); g.fill(); g.fillStyle = st.drop ? "#ff5a4d" : green; rr(g, 90, 705, 600 * p, 26, 13); g.fill();
  grid(g, 90, 755, 600, 8, st);
  g.font = "800 34px M"; g.fillStyle = st.drop ? "#ff7a6d" : green;
  g.fillText(st.drop ? `⚠ CONNECTION LOST · ${Math.round(p * 100)}%` : st.resumed ? (p >= 1 ? "✓ UPLOADED" : `RESUMING · ${Math.round(p * 100)}%`) : `UPLOADING · ${Math.round(p * 100)}%`, 90, 1030);
  g.font = "700 26px M"; g.fillStyle = "#cfd6dd"; if (st.resumed && p < 1) g.fillText("only the missing parts are sent", 90, 1075); if (st.drop) g.fillText("the parts already sent are kept", 90, 1075);
  // Wi-Fi glyph, struck through while the link is down
  g.strokeStyle = st.drop ? "#ff5a4d" : green; g.lineWidth = 7; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(650, 655, i * 18, -Math.PI * 0.78, -Math.PI * 0.22); g.stroke(); }
  if (st.drop) { g.beginPath(); g.moveTo(615, 600); g.lineTo(690, 665); g.stroke(); } }
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.got > 0) { g.fillStyle = "rgba(8,10,14,.92)"; rr(g, 60, 650, 900, 210, 26); g.fill(); g.fillStyle = "#fff"; g.font = "700 32px M"; g.fillText("apollo-11-photos.zip  ·  2.4 GB", 96, 705);
    g.fillStyle = green; rr(g, 96, 735, 820 * Math.min(1, st.got), 28, 10); g.fill(); g.font = "700 28px M"; g.fillText(st.got >= 1 ? "✓ ALL 24 PARTS · COMPLETE" : `RECEIVING ${Math.round(st.got * 100)}%`, 96, 815); } }

// =====================================================================================================================
// RADIO: rings leaving the capsule die in the plasma sheath (blackout)
// =====================================================================================================================
const RINGS = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 1.0), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.frustumCulled = false; FLOW.add(m); return m; });
function radio(t, k, blocked) { RINGS.forEach((m, i) => { const u = ((t * 0.7 + i / RINGS.length) % 1); const rmax = blocked ? 5.5 : 30; const r = 0.5 + u * rmax;
  m.visible = k > 0; m.position.set(0, 1.4, 0); m.rotation.x = Math.PI / 2; m.scale.setScalar(r);
  m.material.opacity = k * (blocked ? (1 - u) * (u < 0.75 ? 1 : (1 - u) * 4) : 1 - u); m.material.color.setRGB(blocked && u > 0.55 ? 2.2 : 0.4, blocked && u > 0.55 ? 0.5 : 2.2, blocked && u > 0.55 ? 0.3 : 1.0); }); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  scan: ["Laser scan", "#9fd4ff", "every rivet and scorch mark"], seats: ["Three seats", "#ffd166", "for three astronauts"], win: ["Windows", "#9fd4ff", "five in all"],
  plasma: ["Plasma", "#ff8a3d", "squeezed, glowing air"], shock: ["Shock wave", "#6fd0ff", "pushed out in front"], layer: ["Hot layer", "#ff8a3d", "most heat stays here"], hs: ["Heat shield", "#ffd166", "blunt on purpose"],
  honey: ["Fiberglass honeycomb", "#ffd166", "thousands of cells"], avc: ["Avcoat", "#cfd6dd", "resin gunned into each cell"], steel: ["Steel structure", "#9fb8c9", "the capsule's shell"],
  char: ["Char layer", "#ff6a3d", "burns, then melts away"], away: ["Heat carried away", "#ff8a3d", "with every flake"],
  ant: ["Radio", "#3dff8c", "can't get through"], drg: ["2 drogue chutes", "#ffd166", "slow and steady it"], mn: ["3 main chutes", "#ff8a3d", "25 m across each"],
  bag: ["Flotation bags", "#9fd4ff", "inflated by the crew"], srv: ["Storage", "#8fd0ff", "keeps the parts already sent"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("WIDE", "3.9 m")}${card("CREW", "3")}${card("FLOWN", "JUL 1969")}</div>`, { left: "0px", top: "1440px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 190px/0.85 D;font-stretch:112%;color:#ff9a5c;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 44px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("thick", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">UP TO 5 CM THICK · MAGNIFIED</div>`, { left: "250px", top: "240px" });
hudEl("nosig", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:22px 36px;border-radius:26px;background:rgba(30,6,6,.82);border:2px solid #ff5a4d">
  <div style="font:800 34px M;letter-spacing:.18em;color:#ff7a6d">● NO SIGNAL</div><div id="nsT" style="font:900 120px/1 D;font-stretch:112%;color:#fff;margin-top:8px">0:00</div><div style="font:700 26px M;letter-spacing:.12em;color:#cfd6dd;margin-top:6px">RADIO BLACKOUT</div></div></div>`, { left: "0px", top: "230px" });
hudEl("silver", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("LEFT", "SILVER", "#e6ecf2")}<div style="font:900 70px D;color:#fff;align-self:center">→</div>${card("CAME HOME", "SCORCHED", "#ff9a5c")}</div>`, { left: "0px", top: "1440px" });
hudEl("date", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("SPLASHDOWN", "24 JUL 1969")}${card("SPEED", "35 km/h", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("flip", `<div style="width:1080px;text-align:center"><div id="flT" style="display:inline-block;padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.25);font:900 54px D;font-stretch:112%;color:#fff">UPSIDE DOWN</div></div>`, { left: "0px", top: "260px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["RESUMES", "ONLY MISSING PARTS", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("hot", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.12em;color:#cfd6dd">HEAT THAT WOULD MELT MOST METALS</div>`, { left: "215px", top: "240px" });
const setBig = (n, l, col = "#ff9a5c") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };
