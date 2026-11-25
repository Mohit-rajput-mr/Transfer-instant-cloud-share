
// =====================================================================================================================
// THE REAL JUNOCAM IMAGE (processed by citizen scientists), as a billboard
// =====================================================================================================================
const GRS = await img("ref/great_red_spot_junocam.jpg");
const GRSB = (() => { if (!GRS) return null; const t = tex("ref/great_red_spot_junocam.jpg", true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, depthWrite: false, color: 0xeeeeee })); m.renderOrder = -5; scene.add(m); m.visible = false; return m; })();
const GRS_AR = GRS ? GRS.width / GRS.height : 1;
function board(m, ar, pos, h) { m.visible = true; m.position.copy(pos); m.scale.set(h * ar, h, 1); m.quaternion.copy(H.cam.quaternion); }

// =====================================================================================================================
// THE VAULT (diagram): a titanium box (walls ~1 cm) with the electronics inside; radiation particles bounce off.
// =====================================================================================================================
const VLT = new THREE.Group(); scene.add(VLT); VLT.position.set(-9000, 0, 0); VLT.visible = false;
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.7; fl.receiveShadow = true; VLT.add(fl);
  const ti = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 0.85, roughness: 0.4, clearcoat: 0.2 });
  const W = 1.0, T = 0.06;   // cut-away box: five walls; the front left open to see inside
  [[0, -W / 2, 0, W, T, W], [0, W / 2, 0, W, T, W], [-W / 2, 0, 0, T, W, W], [W / 2, 0, 0, T, W, W], [0, 0, -W / 2, W, W, T]].forEach(([x, y, z, a, b, c]) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(a, b, c), ti)); m.position.set(x, y, z); VLT.add(m); });
  for (let i = 0; i < 6; i++) { const card = sh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.7), new THREE.MeshPhysicalMaterial({ color: 0x1d5a3a, roughness: 0.5, emissive: new THREE.Color(0x0a2a18) }))); card.position.set(-0.32 + i * 0.13, 0, 0.02); VLT.add(card); } }
const RAD = Array.from({ length: 90 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), glow(0xff6b5e, 3)); VLT.add(m); return m; });
function radiation(t) { RAD.forEach((m, i) => { const u = (t * 0.5 + hash(i) ) % 1; const dir = V(hash(i * 3.3) - 0.5, hash(i * 5.1) - 0.5, hash(i * 7.7) - 0.5).normalize(); const d = 2.2 - u * 1.65; const p = dir.clone().multiplyScalar(Math.max(d, 0.62)); if (d < 0.62) p.add(dir.clone().multiplyScalar((0.62 - d) * 1.5)); m.position.copy(p); }); }
const VW = (x, y, z) => VLT.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: the bubble board (BubbleBoard.tsx): one stack per person, one colour each; an edit blinks green and is marked "edited".
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
const PEOPLE = [["Ana", "#ffb340"], ["Kai", "#4ea8ff"], ["Mia", "#3dff8c"]];
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "#fff"; g.font = "900 44px D"; g.fillText("Bubble board", 50, 330);
  const notes = [[0, "Raw set from perijove 7 is up"], [1, "Colour pass done, stretched a bit"], [2, st.edit >= 1 ? "Red Spot crop: final" : "Red Spot crop: draft"], [0, "Adding the south pole next"]];
  notes.slice(0, st.n).forEach(([p, txt], i) => { const [nm, col] = PEOPLE[p]; const y = 390 + i * 190; g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 50, y, 680, 160, 26); g.fill(); g.fillStyle = col; rr(g, 50, y, 12, 160, 6); g.fill();
    g.fillStyle = col; g.font = "800 28px M"; g.fillText(nm, 84, y + 48);
    const edited = i === 2 && st.edit >= 1; g.font = "700 32px M"; if (edited && st.blink) { g.fillStyle = "#cfd6dd"; g.fillText("Red Spot crop: ", 84, y + 104); g.fillStyle = st.blink === 1 ? "#ffffff" : green; g.fillText("final", 84 + g.measureText("Red Spot crop: ").width, y + 104); } else { g.fillStyle = "#e8ecf0"; g.fillText(txt, 84, y + 104); }
    if (edited) { g.fillStyle = "#7d848c"; g.font = "italic 600 24px M"; g.fillText("edited", 600, y + 48); } }); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({ nasa: ["NASA's own 3D model", "#9fd4ff", "arms ~9 m long"], arm: ["Solar arm", "#ffd166", "~9 m"], dish: ["High-gain dish", "#cfe6ff", ""], vaultL: ["Titanium walls", "#cfd6dd", "~1 cm thick"], elecL: ["Electronics", "#3dff8c", "inside"], radL: ["Radiation", "#ff6b5e", ""] });
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 150px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("real", `<div style="width:1080px;text-align:center">${pill("REAL JUNOCAM IMAGE · PROCESSED BY CITIZEN SCIENTISTS")}</div>`, { left: "0px", top: "1120px" });
hudEl("arrive", row(card("REACHED JUPITER", "4 JULY 2016", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("cells", big("cN", "0", "SOLAR CELLS", "#fff", "#ffd166"), { left: "0px", top: "190px" });
hudEl("watts", row(card("AT JUPITER", "~500 W", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("raw", row(card("RAW IMAGES", "ONLINE, FOR ANYONE", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("illus", pill("ILLUSTRATION"), { left: "410px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["BUBBLE BOARD", "YOUR OWN COLOUR", "EDITS SHOWN"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
