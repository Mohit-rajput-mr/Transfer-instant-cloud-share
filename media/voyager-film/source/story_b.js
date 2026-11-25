
// =====================================================================================================================
// THE MAP (diagram, far away): the Sun, the planets' orbits to scale (1 AU = 0.1), Voyager 1 at one light-day = 173 AU,
// 35° above the plane of the planets. A light pulse runs Voyager → Earth (24 h) and back (another 24 h).
// =====================================================================================================================
const MAPG = new THREE.Group(); scene.add(MAPG); MAPG.position.set(0, 9000, 0); MAPG.visible = false;
const AU = 0.1, VAU = 173.1, VLAT = 35 * Math.PI / 180, VDIR = V(Math.cos(VLAT) * 0.6, Math.sin(VLAT), -Math.cos(VLAT) * 0.8).normalize();
const VPOS = VDIR.clone().multiplyScalar(VAU * AU);
{ const sun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16), glow(0xffe2a0, 4)); MAPG.add(sun);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), sunGlow.material); halo.userData.bill = true; MAPG.add(halo); MAPG.userData.halo = halo;
  const ORB = [["Earth", 1, 0x5fb0ff], ["Jupiter", 5.2, 0xd9b48a], ["Saturn", 9.58, 0xe8d29a], ["Uranus", 19.2, 0x9fe0e8], ["Neptune", 30.1, 0x6f8cff]];
  MAPG.userData.planets = {};
  for (const [nm, r, c] of ORB) { const pts = []; for (let i = 0; i <= 256; i++) { const a = i / 256 * TAU; pts.push(V(Math.cos(a) * r * AU, 0, Math.sin(a) * r * AU)); }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), transparent: true, opacity: 0.85, toneMapped: false })); MAPG.add(ln);
    const a0 = { Earth: 2.2, Jupiter: 0.8, Saturn: 4.1, Uranus: 5.4, Neptune: 3.0 }[nm]; const p = new THREE.Mesh(new THREE.SphereGeometry(nm === "Earth" ? 0.045 : 0.07, 20, 12), glow(c, 2.2)); p.position.set(Math.cos(a0) * r * AU, 0, Math.sin(a0) * r * AU); MAPG.add(p); MAPG.userData.planets[nm] = p; }
  // the path Voyager flew (dashed), and the craft itself as a bright point
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), VPOS]), new THREE.LineDashedMaterial({ color: 0x9fd4ff, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.55 })); path.computeLineDistances(); MAPG.add(path);
  const vp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 12), glow(0xffffff, 3)); vp.position.copy(VPOS); MAPG.add(vp);
  const grid = new THREE.PolarGridHelper(3.2, 16, 8, 128, 0x1d3a52, 0x13202c); grid.material.transparent = true; grid.material.opacity = 0.35; MAPG.add(grid); }
const PULSE = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 12), glow(0xcfe9ff, 5)); MAPG.add(PULSE);
const TRAIL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8, 1, true), glow(0x9fd4ff, 2.5)); MAPG.add(TRAIL);
const EP = () => MAPG.userData.planets.Earth.position;
// k 0..1 along the way, dir +1 Voyager → Earth, -1 Earth → Voyager
function pulseAt(k, dirn, col) { const a = dirn > 0 ? VPOS : EP(), b = dirn > 0 ? EP() : VPOS; const p = a.clone().lerp(b, k); PULSE.position.copy(p); PULSE.material.color.copy(col);
  const mid = a.clone().lerp(p, 0.5); TRAIL.position.copy(mid); TRAIL.scale.set(1, Math.max(0.001, a.distanceTo(p)), 1); TRAIL.quaternion.setFromUnitVectors(V(0, 1, 0), p.clone().sub(a).normalize()); TRAIL.material.color.copy(col).multiplyScalar(0.6); }
MAPG.quaternion.setFromUnitVectors(VDIR, V(0.12, 1, 0).normalize());   // turned so the line to Voyager runs up the 9:16 frame
const MW = (x, y, z) => MAPG.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE BOARD (diagram): Voyager's FDS memory as a board of chips; one chip fails. Then the memory as a map of cells: the code
// that lived in the dead chip, too big for any single free gap, is cut into pieces stored in different places, and linked.
// =====================================================================================================================
const BOARD = new THREE.Group(); scene.add(BOARD); BOARD.position.set(-9000, 0, 0); BOARD.visible = false;
const BU = { uT: { value: 0 } };
const pcbTex = H.canvasTex(1024, 1024, (g) => { g.fillStyle = "#06130d"; g.fillRect(0, 0, 1024, 1024); H.reseed(3);
  for (let i = 0; i < 260; i++) { const x = H.rnd() * 1024, y = H.rnd() * 1024, hz = H.rnd() > 0.5; g.strokeStyle = `rgba(200,150,60,${0.25 + H.rnd() * 0.35})`; g.lineWidth = 2 + H.rnd() * 3; g.beginPath(); g.moveTo(x, y);
    const l = 60 + H.rnd() * 260; if (hz) { g.lineTo(x + l, y); g.lineTo(x + l + 30, y + 30); } else { g.lineTo(x, y + l); g.lineTo(x + 30, y + l + 30); } g.stroke(); g.fillStyle = "rgba(220,170,80,.6)"; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); } });
{ const pcb = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 4.6), new THREE.MeshPhysicalMaterial({ map: pcbTex, color: 0xffffff, roughness: 0.45, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.3 })); pcb.receiveShadow = true; BOARD.add(pcb);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.3; fl.receiveShadow = true; BOARD.add(fl); }
const CHIPS = []; const BAD = 13;
const chipMat = new THREE.MeshPhysicalMaterial({ color: 0x15171a, roughness: 0.35, metalness: 0.1, clearcoat: 0.4 });
for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const ch = new THREE.Group(); const body = sh(new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.1, 0.86, 2, 0.02), chipMat.clone())); ch.add(body);
  for (let p = 0; p < 8; p++) for (const sx of [-1, 1]) { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.04), metal(0xc9ccd0, 0.3)); pin.position.set(sx * 0.31, -0.03, -0.35 + p * 0.1); ch.add(pin); }
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), matte(0x3a3d42)); dot.rotation.x = -Math.PI / 2; dot.position.set(-0.17, 0.052, -0.33); ch.add(dot);
  ch.position.set(-2.66 + c * 0.76, 0.09, -1.62 + r * 1.08); BOARD.add(ch); CHIPS.push(ch); }
const BADGLOW = new THREE.PointLight(0xff3a2d, 0, 3, 2); BOARD.add(BADGLOW); BADGLOW.position.copy(CHIPS[BAD].position).add(V(0, 0.4, 0));
function chips(kBad, t) { CHIPS.forEach((ch, i) => { const m = ch.children[0].material; const bad = i === BAD && kBad > 0;
  const fl = bad ? (0.6 + 0.4 * Math.sin(t * 17) * Math.sin(t * 5.3)) * kBad : 0; m.emissive = m.emissive || new THREE.Color(); m.emissive.setRGB(1.4 * fl, 0.12 * fl, 0.08 * fl); }); BADGLOW.intensity = kBad * 6 * (0.7 + 0.3 * Math.sin(t * 17)); }
// the memory map (rises above the board): 16 × 8 cells. "used" grey, "free" outlined, the dead chip's cells red.
const MEM = new THREE.Group(); BOARD.add(MEM); MEM.position.set(0, 0.9, 0); MEM.rotation.y = Math.PI / 2; MEM.visible = false;   // long side runs into the frame
const COLS = 16, ROWS = 8, CW = 0.34, CG = 0.04;
const cellAt = (c, r) => V(-((COLS - 1) / 2) * (CW + CG) + c * (CW + CG), 0, -((ROWS - 1) / 2) * (CW + CG) + r * (CW + CG));
// free gaps (each ≤ 2 cells) and the dead region (row 3, cols 5–10)
const FREE = [[1, 0], [2, 0], [12, 1], [7, 6], [8, 6], [14, 4], [3, 5], [10, 2], [11, 7], [4, 7], [15, 6]];
const DEAD = [[5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]];
const key = (c, r) => c + "," + r; const FS = new Set(FREE.map((a) => key(...a))), DS = new Set(DEAD.map((a) => key(...a)));
const usedM = new THREE.MeshPhysicalMaterial({ color: 0x3a4048, roughness: 0.4, metalness: 0.3, emissive: new THREE.Color(0x0a0d12) });
const freeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.5, 0.25), transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false });
const deadM = new THREE.MeshPhysicalMaterial({ color: 0x3a1210, roughness: 0.5, emissive: new THREE.Color(0.9, 0.08, 0.05) });
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const k = key(c, r); const fr0 = FS.has(k), de = DS.has(k);
  const m = new THREE.Mesh(fr0 ? new THREE.BoxGeometry(CW, 0.02, CW) : new RoundedBoxGeometry(CW, 0.1, CW, 2, 0.02), fr0 ? freeM : de ? deadM : usedM); m.position.copy(cellAt(c, r)); m.position.y = fr0 ? -0.04 : 0; m.castShadow = !fr0; MEM.add(m);
  if (fr0) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, 0.02, CW)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.9), toneMapped: false })); e.position.copy(m.position); MEM.add(e); } }
// the code: six amber cells. Whole, it can't fit the 2-cell gap; cut into 3 pieces of 2, they go to three gaps.
const codeM = new THREE.MeshPhysicalMaterial({ color: 0xffb340, roughness: 0.3, emissive: new THREE.Color(1.3, 0.6, 0.05), clearcoat: 0.5 });
const CODE = DEAD.map(() => { const m = sh(new THREE.Mesh(new RoundedBoxGeometry(CW * 0.92, 0.12, CW * 0.92, 2, 0.025), codeM)); MEM.add(m); m.visible = false; return m; });
const DEST = [[1, 0], [2, 0], [7, 6], [8, 6], [14, 4], [15, 4]];   // gaps: (1–2,0), (7–8,6), (14,4)+(15,4)... see FREE
FS.add(key(15, 4)); { const m = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.02, CW), freeM); m.position.copy(cellAt(15, 4)); m.position.y = -0.04; MEM.add(m);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, 0.02, CW)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.9), toneMapped: false })); e.position.copy(m.position); MEM.add(e); }
// links between the pieces (the rewritten references): glowing arcs
const LINKS = [[1, 2], [3, 4]].map(([a, b]) => { const p0 = cellAt(...DEST[a]), p1 = cellAt(...DEST[b]); const mid = p0.clone().lerp(p1, 0.5).add(V(0, 0.9, 0));
  const g = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0.clone().add(V(0, 0.07, 0)), mid, p1.clone().add(V(0, 0.07, 0))), 64, 0.018, 6, false);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uT: BU.uT, uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT, uK; varying vec2 vU; void main(){ float show = step(vU.x, uK); float p = fract(vU.x * 3.0 - uT * 1.2); float pulse = smoothstep(0.0, 0.1, p) * smoothstep(0.25, 0.1, p);
      gl_FragColor = vec4(vec3(1.0, 0.75, 0.25) * (0.5 + 1.5 * pulse) * show, 1.0); }` })); MEM.add(m); return m; });
const BW = (x, y, z) => BOARD.localToWorld(V(x, y, z)), MEMW = (c, r, y = 0) => MEM.localToWorld(cellAt(c, r).add(V(0, y, 0)));
// phase: 0 hidden · 1 sitting in the dead row · whole block tries the gap (kTry) · split + fly (kFly) · links (kLink)
function code(kShow, kTry, kFly, kLink, t) { CODE.forEach((m, i) => { m.visible = kShow > 0.01; const home = cellAt(...DEAD[i]).add(V(0, 0.14, 0));
    // try: the whole block lifts and slides over gap (1–2, 0) — six cells over two: it doesn't fit (shakes red)
    const tryP = cellAt(1 + i, 0).add(V(0, 0.55, 0)); let p = home.clone().lerp(tryP, smooth(clamp(kTry * 1.6)));
    if (kTry > 0.6 && kFly <= 0) { const sh0 = Math.sin(t * 40) * 0.04 * clamp((kTry - 0.6) * 4); p.x += sh0; }
    if (kFly > 0) { const d = cellAt(...DEST[i]).add(V(0, 0.07, 0)); const piece = Math.floor(i / 2); const kk = smooth(clamp(kFly * 1.5 - piece * 0.25)); const arc = Math.sin(kk * Math.PI) * 0.9;
      const from = tryP.clone().add(V((piece - 1) * 0.25, 0, 0)); p = from.lerp(d, kk); p.y += arc; }
    m.position.copy(p); m.scale.setScalar(lerp(0.4, 1, smooth(kShow))); m.material.emissive.setRGB(kTry > 0.6 && kFly <= 0 ? 1.6 : 1.3, kTry > 0.6 && kFly <= 0 ? 0.25 : 0.6, 0.05); });
  LINKS.forEach((l) => (l.material.uniforms.uK.value = kLink)); }

// =====================================================================================================================
// ORBI: a phone on a pedestal; Orbi's file viewer (Viewer.tsx) with a received PDF, then a photo, video, Word, Excel, slides.
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const IMG = { m100: await img("ref/m100_b.jpg") };
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const FILES = { pdf: ["voyager-fds-report.pdf", "2.4 MB · select text to copy"], image: ["galaxy-m100.jpg", "1.1 MB"], video: ["launch-1977.mp4", "48 MB"], doc: ["mission-notes.docx", "86 KB"], sheet: ["telemetry.xlsx", "312 KB"], slides: ["briefing.pptx", "5.2 MB"] };
const DOCL = ["Voyager 1 · Flight data subsystem", "On 14 November 2023 the FDS began", "sending unreadable data. One chip,", "about 3% of its memory, had failed.", "The code was split into sections", "stored in different places.", "18 April 2024: first section sent.", "20 April 2024: engineering data back."];
function drawPh(g, st) { g.fillStyle = "#050507"; g.fillRect(0, 0, 780, 1688);
  // top bar (viewer-top): name + size, Copy all text, Download ↓, ×
  g.fillStyle = "#0b0b0e"; g.fillRect(0, 0, 780, 250); g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(0, 249, 780, 2);
  const [nm, sz] = FILES[st.kind]; g.fillStyle = "#fff"; g.font = "800 40px M"; g.fillText(nm.length > 22 ? nm.slice(0, 21) + "…" : nm, 40, 120); g.fillStyle = "#8d8d8d"; g.font = "600 26px M"; g.fillText(sz, 40, 168);
  const pill = (x, w, s, hi) => { g.fillStyle = hi ? "rgba(61,255,140,.22)" : "rgba(255,255,255,.08)"; rr(g, x, 186, w, 50, 25); g.fill(); g.strokeStyle = hi ? green : "rgba(255,255,255,.2)"; g.lineWidth = 2; g.stroke(); g.fillStyle = hi ? green : "#fff"; g.font = "700 24px M"; g.fillText(s, x + 20, 220); };
  if (st.kind !== "image" && st.kind !== "video") pill(40, 250, st.copied ? "Copied ✓" : "Copy all text", st.copied); pill(st.kind !== "image" && st.kind !== "video" ? 310 : 40, 200, "Download ↓", st.dl);
  g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 2; g.beginPath(); g.arc(720, 120, 30, 0, TAU); g.stroke(); g.fillStyle = "#fff"; g.font = "400 40px M"; g.fillText("×", 708, 133);
  const B = 290; // body
  if (st.kind === "pdf" || st.kind === "doc") { g.fillStyle = "#f4f3ef"; rr(g, 50, B, 680, 960, 10); g.fill(); g.fillStyle = "#111"; g.font = "800 30px M";
    DOCL.forEach((l, i) => { const y = B + 90 + i * 70; if (i === 0) { g.font = "900 30px M"; } else g.font = "500 26px M";
      if (st.sel && i >= 1 && i <= st.sel) { g.fillStyle = "rgba(61,160,255,.35)"; g.fillRect(80, y - 30, 620, 42); } g.fillStyle = "#111"; g.fillText(l, 90, y); });
    for (let i = 0; i < 6; i++) { g.fillStyle = "#c9c7c0"; g.fillRect(90, B + 700 + i * 40, i === 5 ? 340 : 600, 14); }
    if (st.kind === "doc") { g.fillStyle = "#2b579a"; rr(g, 560, B + 900, 140, 40, 8); g.fill(); g.fillStyle = "#fff"; g.font = "800 22px M"; g.fillText("WORD", 594, B + 928); } }
  else if (st.kind === "image") { if (IMG.m100) g.drawImage(IMG.m100, 0, B + 120, 780, 780); g.fillStyle = "rgba(0,0,0,.6)"; rr(g, 280, B + 940, 220, 56, 28); g.fill(); g.fillStyle = "#fff"; g.font = "700 26px M"; g.fillText("pinch to zoom", 302, B + 976); }
  else if (st.kind === "video") { g.fillStyle = "#000"; g.fillRect(0, B + 220, 780, 440); const gr = g.createLinearGradient(0, B + 220, 0, B + 660); gr.addColorStop(0, "#1b2a44"); gr.addColorStop(1, "#d9822b"); g.fillStyle = gr; g.fillRect(0, B + 220, 780, 440);
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(350, B + 390); g.lineTo(350, B + 490); g.lineTo(440, B + 440); g.fill(); g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(40, B + 700, 700, 8); g.fillStyle = green; g.fillRect(40, B + 700, 700 * st.play, 8); g.font = "600 24px M"; g.fillStyle = "#ccc"; g.fillText("0:" + String(Math.floor(st.play * 40)).padStart(2, "0") + " / 0:40", 40, B + 750); }
  else if (st.kind === "sheet") { g.fillStyle = "#fff"; g.fillRect(30, B, 720, 900); g.strokeStyle = "#d0d4da"; g.lineWidth = 1.5; for (let r = 0; r <= 16; r++) { g.beginPath(); g.moveTo(30, B + r * 56); g.lineTo(750, B + r * 56); g.stroke(); } for (let c = 0; c <= 4; c++) { g.beginPath(); g.moveTo(30 + c * 180, B); g.lineTo(30 + c * 180, B + 896); g.stroke(); }
    g.fillStyle = "#1e7145"; g.fillRect(30, B, 720, 56); g.fillStyle = "#fff"; g.font = "800 24px M"; ["DATE", "SIGNAL", "FDS", "STATUS"].forEach((s, i) => g.fillText(s, 46 + i * 180, B + 38));
    const rows = [["11-13", "OK", "OK", "readable"], ["11-14", "OK", "FAULT", "garbled"], ["03-01", "OK", "FAULT", "garbled"], ["04-18", "OK", "PATCH", "sent"], ["04-20", "OK", "OK", "readable"]];
    rows.forEach((r, i) => r.forEach((s, j) => { g.fillStyle = s === "FAULT" || s === "garbled" ? "#c0392b" : s === "readable" ? "#1e7145" : "#222"; g.font = "600 24px M"; g.fillText(s, 46 + j * 180, B + 94 + i * 56); })); }
  else if (st.kind === "slides") { g.fillStyle = "#0e1420"; rr(g, 30, B + 200, 720, 405, 12); g.fill(); g.fillStyle = "#ffb340"; g.font = "900 44px D"; g.fillText("ONE LIGHT-DAY", 70, B + 300); g.fillStyle = "#cfd6dd"; g.font = "600 28px M"; g.fillText("Voyager 1 · 18 Nov 2026", 70, B + 350);
    for (let i = 0; i < 4; i++) { g.fillStyle = i === 0 ? "#ffb340" : "rgba(255,255,255,.15)"; rr(g, 30 + i * 186, B + 640, 162, 92, 8); g.fill(); } g.fillStyle = "#c55a11"; rr(g, 560, B + 780, 160, 40, 8); g.fill(); g.fillStyle = "#fff"; g.font = "800 22px M"; g.fillText("SLIDES", 592, B + 808); }
  if (st.toast) { g.fillStyle = "rgba(20,22,26,.95)"; rr(g, 190, 1380, 400, 80, 40); g.fill(); g.strokeStyle = green; g.lineWidth = 2; g.stroke(); g.fillStyle = green; g.font = "800 30px M"; g.fillText(st.toast, 230, 1432); } }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "launched 1977"], dishL: ["High-gain dish", "#cfe6ff", "3.7 m wide"], boomL: ["Magnetometer boom", "#ffd166", ""],
  youL: ["Voyager 1", "#fff", "one light-day out"], earthM: ["Earth", "#5fb0ff", ""], nepL: ["Neptune's orbit", "#6f8cff", "30 × Earth–Sun"],
  fdsL: ["Flight data computer", "#ffb340", "packs data for Earth"], badL: ["One memory chip", "#ff6b5e", "failed"], gapL: ["Free gap", "#3dff8c", "too small"],
  piecesL: ["Pieces", "#ffb340", "in different places"], linkL: ["Rewritten links", "#ffd166", "work as one program"], earthL: ["Earth", "#5fb0ff", "the first piece"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 170px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
const row = (...c) => `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${c.join("")}</div>`;
hudEl("lday", row(card("18 NOV 2026", "1 LIGHT-DAY", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("launch", row(card("LAUNCHED", "5 SEP 1977", "#9fd4ff"), card("STILL", "TALKING", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("radio", row(card("DISH", "3.7 m", "#cfe6ff"), card("RADIO", "~22 W", "#ffd166")), { left: "0px", top: "1440px" });
hudEl("clock", big("hN", "0 h", "SIGNAL ON ITS WAY HOME", "#fff", "#9fd4ff"), { left: "0px", top: "190px" });
hudEl("ld", row(card("1 LIGHT-DAY", "25.9 BILLION KM", "#ffd166")), { left: "0px", top: "1660px" });
hudEl("date23", row(card("14 NOV 2023", "NONSENSE", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("pct", row(card("ONE CHIP", "~3% OF THE MEMORY", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("far24", row(card("APRIL 2024", "24 BILLION KM AWAY", "#9fd4ff")), { left: "0px", top: "1440px" });
hudEl("nofit", row(card("NO SINGLE SPOT", "BIG ENOUGH", "#ff6b5e")), { left: "0px", top: "1440px" });
hudEl("cut", row(card("SO", "CUT INTO PIECES", "#ffb340")), { left: "0px", top: "1440px" });
hudEl("sent", row(card("18 APR 2024", "FIRST PIECE SENT", "#ffb340")), { left: "0px", top: "1440px" });
hudEl("wait", big("wN", "0 h", "WAITING FOR THE ANSWER", "#fff", "#ffb340"), { left: "0px", top: "190px" });
hudEl("okd", row(card("20 APR 2024", "READABLE AGAIN", "#3dff8c")), { left: "0px", top: "1440px" });
hudEl("five", pill("FIRST TIME IN 5 MONTHS"), { left: "330px", top: "1660px" });
hudEl("kinds", `<div style="width:1080px;display:flex;justify-content:center;flex-wrap:wrap;gap:12px;padding:0 60px;box-sizing:border-box">${["PDF", "PHOTO", "VIDEO", "WORD", "EXCEL", "SLIDES"].map((s, i) => `<div id="kd${i}" style="padding:14px 22px;border-radius:18px;background:rgba(8,10,16,.82);border:1.5px solid rgba(255,255,255,.25);font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["OPENS IN THE BROWSER", "NO DOWNLOAD", "NO APP"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 32px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
// telemetry panel: rows of the data stream as it reaches Earth — clean hex, scrambled symbols, or clean again in green
hudEl("tele", `<div style="width:1080px;display:flex;justify-content:center"><div style="width:860px;padding:22px 30px;border-radius:24px;background:rgba(6,8,12,.86);border:1.5px solid rgba(255,255,255,.18)">
  <div id="teleH" style="font:800 26px M;letter-spacing:.14em;color:#9fd4ff;margin-bottom:10px">DATA FROM VOYAGER 1</div><div id="teleT" style="font:600 30px/1.32 M;color:#cfe6ff;white-space:pre"></div></div></div>`, { left: "0px", top: "200px" });
function tele(t, mode) { const rows = []; const f = Math.floor(t * 6); const HEX = "0123456789ABCDEF", JUNK = "#%&@$?!*~^<>{}[]|/\\▒░▓";
  for (let r = 0; r < 5; r++) { let s = ""; for (let i = 0; i < 28; i++) { if (i % 5 === 4) { s += " "; continue; } const hsh = hash(r * 97 + i * 13 + f * 7);
      s += mode === "junk" ? (hsh > 0.35 ? JUNK[Math.floor(hsh * JUNK.length * 7) % JUNK.length] : HEX[Math.floor(hsh * 16 * 5) % 16]) : HEX[Math.floor(hsh * 16 * 5) % 16]; } rows.push(s); }
  H.$("teleT").textContent = rows.join("\n"); H.$("teleT").style.color = mode === "junk" ? "#ff6b5e" : mode === "ok" ? "#3dff8c" : "#cfe6ff";
  H.$("teleH").textContent = mode === "junk" ? "DATA FROM VOYAGER 1 · UNREADABLE" : mode === "ok" ? "DATA FROM VOYAGER 1 · ENGINEERING DATA OK" : "DATA FROM VOYAGER 1"; H.$("teleH").style.color = mode === "junk" ? "#ff6b5e" : mode === "ok" ? "#3dff8c" : "#9fd4ff"; }
