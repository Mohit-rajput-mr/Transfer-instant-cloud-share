
// =====================================================================================================================
// TRANSIT (diagram): a star, a planet crossing it, and the star's brightness drawn as a line that dips.
// =====================================================================================================================
const TR = new THREE.Group(); scene.add(TR); TR.position.set(0, 9000, 0); TR.visible = false;
const STAR = new THREE.Mesh(new THREE.SphereGeometry(3, 64, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.0, 0.62), toneMapped: false })); TR.add(STAR);
const HALO = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), sunGlow.material); TR.add(HALO); HALO.position.z = -1; HALO.visible = false;
const PLAN = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16), new THREE.MeshBasicMaterial({ color: 0x050608 })); TR.add(PLAN);
const TW = (x, y, z) => TR.localToWorld(V(x, y, z));
hudEl("curve", `<div style="width:1080px;display:flex;justify-content:center"><div style="padding:18px 24px;border-radius:24px;background:rgba(6,8,12,.86);border:1.5px solid rgba(255,255,255,.18)">
  <div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd;margin-bottom:8px">BRIGHTNESS OF THE STAR</div><svg width="820" height="200" viewBox="0 0 820 200"><polyline id="curveL" fill="none" stroke="#ffd166" stroke-width="5" points=""/></svg></div></div>`, { left: "0px", top: "1400px" });
function curve(k) { const pts = []; const N = 120; for (let i = 0; i <= N; i++) { const x = i / N; if (x > k) break; const d = Math.abs(x - 0.5) < 0.12 ? 1 - Math.min(1, (0.12 - Math.abs(x - 0.5)) / 0.03) : 1; const y = 60 + (1 - d) * 90 + Math.sin(i * 7.1) * 2; pts.push(`${(x * 820).toFixed(1)},${y.toFixed(1)}`); } H.$("curveL").setAttribute("points", pts.join(" ")); }

// =====================================================================================================================
// THE WHEELS (diagram): four reaction wheels (generic flywheels, labelled), three needed; two fail.
// =====================================================================================================================
const WH = new THREE.Group(); scene.add(WH); WH.position.set(-9000, 0, 0); WH.visible = false;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.8; fl.receiveShadow = true; WH.add(fl); }
const WHEELS = [[-1.3, 0, 0], [1.3, 0, 0], [0, 0, -1.3], [0, 0, 1.3]].map((p, i) => { const g = new THREE.Group(); g.position.set(...p); WH.add(g);
  const rim = sh(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 24, 64), new THREE.MeshPhysicalMaterial({ color: 0xb8bec6, metalness: 0.9, roughness: 0.3, emissive: new THREE.Color(0) }))); g.add(rim);
  for (let s = 0; s < 4; s++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x8a9096, metalness: 0.8, roughness: 0.35 })); sp.rotation.z = s * Math.PI / 4; g.add(sp); }
  g.rotation.set(i % 2 ? Math.PI / 2 : 0, i * 0.7, i * 0.4); g.userData.rim = rim; return g; });
const WW = (x, y, z) => WH.localToWorld(V(x, y, z));
WHEELS.forEach((w) => (w.userData.spin = new THREE.Group())); WHEELS.forEach((w) => { const kids = [...w.children]; kids.forEach((c) => w.userData.spin.add(c)); w.add(w.userData.spin); });
function wheels(t, dead, tDead = 0) { WHEELS.forEach((w, i) => { const off = dead.includes(i); w.userData.spin.rotation.z = (off ? tDead : t) * 7 + i; w.userData.rim.material.emissive.setRGB(off ? 1.4 : 0, off ? 0.1 : 0.4, off ? 0.08 : 0.25); }); }

// SUNLIGHT ARROWS: photons pushing evenly on both sides of the roof
const RAYS = Array.from({ length: 40 }, (_, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), glow(0xffd166, 2)); m.rotation.z = Math.PI / 2; scene.add(m); m.visible = false; return m; });
function sunlight(t, k) { RAYS.forEach((m, i) => { m.visible = k > 0.01; const u = (t * 0.6 + i / RAYS.length) % 1; const y = -2 + (i % 8) * 0.55, z = -1.2 + Math.floor(i / 8) * 0.6; m.position.copy(KEP.position).add(V(7 - u * 5.6, y, z)); m.material.color.setRGB(1.6 * k, 1.2 * k, 0.4 * k); }); }

// =====================================================================================================================
// ORBI: the Filter (KindFilter.tsx): Show — Open void / Wi-Fi / Mine; File type — All files, Photos, Videos, Documents, Audio,
// Archives. The bubbles on the screen thin down to the chosen kind.
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
const ITEMS = [["photo", "📷", "jezero.jpg"], ["video", "🎬", "launch.mp4"], ["doc", "📄", "plan.pdf"], ["audio", "🎵", "beep.mp3"], ["photo", "📷", "ring.png"], ["archive", "🗜", "data.zip"], ["doc", "📄", "notes.docx"], ["photo", "📷", "moon.jpg"], ["video", "🎬", "dock.mov"]];
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  // the bubbles
  ITEMS.forEach(([kind, ic, nm], i) => { const show = st.kind === "all" || st.kind === kind; const a = show ? 1 : Math.max(0, 1 - st.fade); if (a <= 0.02) return; g.globalAlpha = a;
    const x = 140 + (i % 3) * 250, y = 420 + Math.floor(i / 3) * 240 + (i % 2) * 30, r = 92; g.fillStyle = "rgba(160,200,255,.12)"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 2; g.stroke();
    g.font = "56px sans-serif"; g.textAlign = "center"; g.fillStyle = "#fff"; g.fillText(ic, x, y + 4); g.font = "700 22px M"; g.fillStyle = "#cfd6dd"; g.fillText(nm, x, y + 50); g.textAlign = "left"; g.globalAlpha = 1; });
  // the Filter button + dropdown
  g.fillStyle = st.kind !== "all" ? "rgba(61,255,140,.2)" : "rgba(255,255,255,.1)"; rr(g, 40, 230, 260, 70, 35); g.fill(); g.strokeStyle = st.kind !== "all" ? green : "rgba(255,255,255,.25)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = st.kind !== "all" ? green : "#fff"; g.font = "800 30px M"; g.fillText(st.kind === "all" ? "≡ Filter ▾" : "📷 Photos ▾", 66, 276);
  if (st.open) { g.fillStyle = "rgba(14,16,20,.98)"; rr(g, 40, 310, 420, 760, 28); g.fill(); g.strokeStyle = "rgba(255,255,255,.18)"; g.stroke();
    g.fillStyle = "#7d848c"; g.font = "700 24px M"; g.fillText("SHOW", 70, 360); ["Open void", "Wi-Fi", "Mine"].forEach((s, i) => { g.fillStyle = i === 0 ? green : "#fff"; g.font = "700 30px M"; g.fillText((i === 0 ? "✓ " : "   ") + s, 70, 410 + i * 56); });
    g.fillStyle = "#7d848c"; g.font = "700 24px M"; g.fillText("FILE TYPE", 70, 600); ["All files", "Photos", "Videos", "Documents", "Audio", "Archives"].forEach((s, i) => { const on = (st.kind === "all" && i === 0) || (st.kind === "photo" && i === 1); const hov = st.hover === i; if (hov) { g.fillStyle = "rgba(61,255,140,.14)"; rr(g, 56, 620 + i * 66, 388, 56, 14); g.fill(); } g.fillStyle = on ? green : "#fff"; g.font = "700 30px M"; g.fillText((on ? "✓ " : "   ") + s, 70, 660 + i * 66); }); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "4.7 m tall"], aperture: ["Telescope", "#cfe6ff", "watching one patch of sky"], roof: ["Solar panels", "#ffd166", "the 'roof'"],
  planetL: ["A planet crossing", "#cfd6dd", ""], deadL: ["Failed", "#ff6b5e", ""], sunL: ["Sunlight pushes", "#ffd166", "evenly on both sides"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("stars", row(card("WATCHING", "~150,000 STARS", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("planets", big("plN", "0", "PLANETS FOUND", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("need", big("ndN", "3 of 4", "WHEELS NEEDED", "#fff", "#9fd4ff"), { left: "0px", top: "190px" });
hudEl("may", row(card("MAY 2013", "2 WHEELS LEFT", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("third", row(card("SUNLIGHT =", "THE THIRD WHEEL", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("k2", row(card("MISSION K2", "2014–2018", "#9fd4ff"), card("RETIRED", "OUT OF FUEL", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["BY FILE TYPE", "WI-FI", "ONLY MINE"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
