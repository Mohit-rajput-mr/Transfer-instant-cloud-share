
// =====================================================================================================================
// THE REAL PHOTO (NASA/JPL-Caltech/University of Arizona, public domain) on a big panel in a dark room; the camera pans over it.
// Image 1280×637 → panel 8.04 × 4.0. Pixel (px, py) → panel point.
// =====================================================================================================================
const PHOTO = new THREE.Group(); scene.add(PHOTO); PHOTO.position.set(-9000, 0, 0); PHOTO.visible = false;
const PW_ = 8.04, PH_ = 4.0;
{ const t = tex("ref/phoenix_descent_hirise.jpg", true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(PW_, PH_), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: 0xe8e8e8 })); PHOTO.add(m);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(PW_ + 0.04, PH_ + 0.04)), new THREE.LineBasicMaterial({ color: 0x3a3f46 })); PHOTO.add(frame); }
const PXL = (px, py, z = 0) => PHOTO.localToWorld(V((px / 1280 - 0.5) * PW_, (0.5 - py / 637) * PH_, z));
const CHUTE_PX = [297, 289], INSET_PX = [92, 548];

// =====================================================================================================================
// THE GEOMETRY (diagram): Mars' surface seen from the side; the crater ~10 km wide, Phoenix ~13 km up and ~20 km in front of
// it; MRO 310 km up, its line of sight 760 km long. Drawn to scale horizontally only around the crater (the orbit is far).
// 1 unit = 1 km.
// =====================================================================================================================
const GEO = new THREE.Group(); scene.add(GEO); GEO.position.set(9000, 0, 0); GEO.visible = false;
{ const g = new THREE.PlaneGeometry(220, 120, 220, 120); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x - 20, z); let h = Math.sin(x * 0.05) * Math.cos(z * 0.07) * 0.4; if (r < 6) h -= 1.4 * (1 - (r / 6) ** 2); if (r > 5 && r < 7) h += 0.6 * Math.sin((r - 5) / 2 * Math.PI); p.setY(i, h); }
  g.computeVertexNormals(); const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 20, 12), color: 0xc08a68, roughness: 0.95 })); ground.receiveShadow = true; GEO.add(ground); }
const GP = V(0, 13, 0);   // Phoenix, 13 km up, 20 km in front of the crater (crater centre at x = 20)
const PHX = new THREE.Group(); GEO.add(PHX); PHX.position.copy(GP);
{ const chute = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 12, 0, TAU, 0, 1.0), new THREE.MeshStandardMaterial({ color: 0xf2efe8, side: THREE.DoubleSide, emissive: new THREE.Color(0x222222) })); chute.position.y = 1.8; PHX.add(chute);
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([V(0.9, 2.3, 0), V(0, 0.3, 0), V(-0.9, 2.3, 0), V(0, 0.3, 0), V(0, 2.3, 0.9), V(0, 0.3, 0), V(0, 2.3, -0.9), V(0, 0.3, 0)]), new THREE.LineBasicMaterial({ color: 0xd8d2c4 })); PHX.add(lines);
  const shell = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0xe0ddd6, roughness: 0.6 })); shell.position.y = 0.05; PHX.add(shell); PHX.scale.setScalar(1.6); }
const SIGHT = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), glow(0x9fd4ff, 3)); GEO.add(SIGHT);
const SIGHT_FROM = V(-160, 140, -40);   // toward MRO (off-frame; the real distance is 760 km)
{ const mid = GP.clone().lerp(SIGHT_FROM, 0.5); SIGHT.position.copy(mid); SIGHT.scale.set(1, GP.distanceTo(SIGHT_FROM), 1); SIGHT.quaternion.setFromUnitVectors(V(0, 1, 0), SIGHT_FROM.clone().sub(GP).normalize()); }
const DIST = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0.4, 0), V(20, 0.4, 0)]), new THREE.LineDashedMaterial({ color: 0xffd166, dashSize: 0.8, gapSize: 0.5 })); DIST.computeLineDistances(); GEO.add(DIST);
const GW = (x, y, z) => GEO.localToWorld(V(x, y, z));

// =====================================================================================================================
// ORBI: a received note (Panels.tsx RichText → Notepad.tsx): links, emails, phone numbers and long codes found and tappable;
// "Open in notepad" → the whole note, "Copy all".
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const IMG = { ph: await img("shots_live/phone.png") };
const NOTE = [["Landing call moved, new link:", ""], ["https://meet.example.com/phx", "link"], ["Questions: ops@example.com", "email"], ["Night line: +1 555 0142 8890", "phone"], ["Room code: K7QX42", "code"]];
function drawPh(g, st) { if (IMG.ph) { g.drawImage(IMG.ph, 0, 0, 780, 1688); g.fillStyle = "rgba(4,5,8,.55)"; g.fillRect(0, 0, 780, 1688); } else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "rgba(8,10,14,.96)"; rr(g, 30, 330, 720, 800, 34); g.fill(); g.strokeStyle = "rgba(255,255,255,.15)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#fff"; g.font = "900 44px D"; g.fillText("Note", 70, 410); g.fillStyle = "#7d848c"; g.font = "600 26px M"; g.fillText("encrypted like any file · nothing downloaded", 70, 452);
  NOTE.forEach(([s, kind], i) => { const y = 540 + i * 110; const on = kind && st.hi > i - 1; g.font = kind ? "700 32px M" : "600 32px M";
    const [lab, val] = kind && kind !== "link" && s.includes(": ") ? [s.slice(0, s.indexOf(": ") + 1), s.slice(s.indexOf(": ") + 2)] : ["", s];
    let x = 70; if (lab) { g.fillStyle = "#cfd6dd"; g.fillText(lab, x, y); x += g.measureText(lab + " ").width; }
    if (kind) { const w = g.measureText(val).width; if (on) { g.fillStyle = "rgba(77,168,255,.16)"; rr(g, x - 8, y - 38, w + 16, 52, 12); g.fill(); } g.fillStyle = on ? "#6fc8ff" : "#cfd6dd"; g.fillText(val, x, y); if (on) { g.fillRect(x, y + 8, w, 3); } }
    else { g.fillStyle = "#cfd6dd"; g.fillText(val, x, y); } });
  g.fillStyle = st.copied ? green : "rgba(255,255,255,.1)"; rr(g, 70, 1010, 300, 84, 42); g.fill(); g.fillStyle = st.copied ? "#05150b" : "#fff"; g.font = "800 32px M"; g.fillText(st.copied ? "Copied" : "Copy all", 120, 1064);
  g.fillStyle = "rgba(255,255,255,.1)"; rr(g, 390, 1010, 320, 84, 42); g.fill(); g.fillStyle = "#fff"; g.fillText("Select all", 450, 1064); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  chuteL: ["Phoenix on its parachute", "#ffd166", "~13 km up"], craterL: ["The crater", "#cfd6dd", "~10 km wide · ~20 km behind"], nasa: ["NASA's own 3D model", "#9fd4ff", "13.6 m across"],
  dishL: ["High-gain dish", "#cfe6ff", "3 m"], phxG: ["Phoenix", "#ffd166", "13 km up"], craterG: ["Crater", "#cfd6dd", "20 km behind"], sightL: ["To MRO", "#9fd4ff", "760 km away"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("real", `<div style="width:1080px;text-align:center">${pill("REAL PHOTO · NASA/JPL-CALTECH/UNIV. OF ARIZONA")}</div>`, { left: "0px", top: "1120px" });
hudEl("date", row(card("TAKEN", "25 MAY 2008", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("illusion", row(card("NOT FALLING IN", "~20 km IN FRONT", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("hirise", row(card("HIRISE MIRROR", "0.5 m", "#cfe6ff"), card("ONE PIXEL", "~30 cm", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("speed", row(card("DISTANCE", "760 km", "#9fd4ff"), card("SPEED", "3.4 km/s", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("first", row(card("A FIRST", "ONE SPACECRAFT, CAUGHT BY ANOTHER", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("tinyc", row(card("CRATER", "~10 km", "#cfd6dd"), card("PARACHUTE", "A FEW PIXELS", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["LINKS · EMAILS · PHONES · CODES", "COPY ALL"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
