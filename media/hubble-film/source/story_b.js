
// =====================================================================================================================
// THE WASHER: a plain steel washer (hook + the gap scene)
// =====================================================================================================================
function makeWasher() { const pts = []; const r0 = 0.32, r1 = 0.7, h = 0.11, b = 0.02;
  for (const [x, y] of [[r0 + b, -h / 2], [r1 - b, -h / 2], [r1, -h / 2 + b], [r1, h / 2 - b], [r1 - b, h / 2], [r0 + b, h / 2], [r0, h / 2 - b], [r0, -h / 2 + b], [r0 + b, -h / 2]]) pts.push(new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 128); const m = new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.3, envMapIntensity: 1.3, clearcoat: 0.15 });
  m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <begin_vertex>", "#include <begin_vertex>\n vWP = position;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWP; ${NOISE}`).replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      float ang = atan(vWP.z, vWP.x); float brushed = nz(vec3(length(vWP.xz) * 380.0, ang * 2.0, 0.0)); roughnessFactor = clamp(0.18 + 0.22 * brushed + 0.15 * fbm(vWP * 30.0), 0.05, 1.0);`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n diffuseColor.rgb *= 0.85 + 0.2 * fbm(vWP * 12.0);`); };
  m.customProgramCacheKey = () => "washer"; const w = new THREE.Mesh(g, m); w.castShadow = w.receiveShadow = true; return w; }
const HOOKW = makeWasher(); scene.add(HOOKW); HOOKW.visible = false;

// =====================================================================================================================
// LAB (diagrams, a dark studio far away): the mirror's cross-section, designed vs as-made shape, light rays to the focus,
// and the test tool (reflective null corrector) with its misplaced field lens and the washer.
// =====================================================================================================================
const LAB = new THREE.Group(); scene.add(LAB); LAB.position.set(6000, 0, 0); LAB.visible = false;
const LU = { uT: { value: 0 }, uK: { value: 0 }, uD: { value: 0 } };
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(60, 96), new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.55, metalness: 0.2 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.62; fl.receiveShadow = true; LAB.add(fl);
  const grid = new THREE.GridHelper(40, 80, 0x1d3a52, 0x13202c); grid.position.y = -0.615; grid.material.transparent = true; grid.material.opacity = 0.5; LAB.add(grid); }
const FOC = 5.52, RC = 2 * FOC, EXAG = 25000, DEV = 2.2e-6 * EXAG;           // focal length 5.52 m; the 2,200 nm error drawn 25,000× larger
const sagD = (r) => r * r / (2 * RC);                                             // designed surface (paraxial)
const devF = (r) => { const u = clamp((Math.abs(r) - 0.62) / 0.58); return -DEV * u * u; };   // as made: the outer zone too flat (lower)
// the mirror slab: a slice through the 2.4 m mirror, 0.3 m thick, with the central hole
const SLAB = new THREE.Group(); LAB.add(SLAB);
for (const sgn of [-1, 1]) { const sp = new THREE.Shape(); const N = 60; sp.moveTo(sgn * 0.3, -0.3); sp.lineTo(sgn * 1.2, -0.3);
  for (let i = 0; i <= N; i++) { const r = lerp(1.2, 0.3, i / N); sp.lineTo(sgn * r, sagD(r)); } sp.lineTo(sgn * 0.3, -0.3);
  const g = new THREE.ExtrudeGeometry(sp, { depth: 0.5, bevelEnabled: false, curveSegments: 64 }); g.translate(0, 0, -0.25);
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x7f9fb4, roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.9, envMapIntensity: 1.4, emissive: new THREE.Color(0x0c1a26) }));
  m.castShadow = true; SLAB.add(m); }
// coloured profile lines: designed (green) and as made (red); a 3D tube each
function profTube(fn, col, w) { const pts = []; for (let i = 0; i <= 120; i++) { const r = lerp(-1.2, 1.2, i / 120); if (Math.abs(r) < 0.3) continue; pts.push(V(r, fn(r) + 0.004, 0.26)); }
  const segs = [pts.filter((p) => p.x < 0), pts.filter((p) => p.x > 0)]; const grp = new THREE.Group();
  for (const s of segs) grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s), 120, w, 8, false), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: true }))); LAB.add(grp); return grp; }
const PDES = profTube(sagD, new THREE.Color(0.3, 2.0, 0.8), 0.009), PMADE = profTube((r) => sagD(r) + devF(r), new THREE.Color(2.4, 0.35, 0.25), 0.011);
const morph = (k) => { PMADE.children.forEach((m) => (m.material.opacity = k)); };
// rays: straight down onto the mirror, reflected up to the focus. Centre rays → designed focus; edge rays → farther (flaw)
const LRAYS = []; const LRU = { uT: LU.uT, uK: { value: 0 } };
for (let i = 0; i < 16; i++) { const r = (i < 8 ? -1 : 1) * lerp(0.36, 1.16, (i % 8) / 7); const edge = Math.abs(r) > 0.75 ? 1 : 0;
  const hy = sagD(r) + devF(r); const fy = FOC + (edge ? 1.0 * clamp((Math.abs(r) - 0.62) / 0.58) ** 2 + 0.25 : 0);
  const path = new THREE.CurvePath(); path.add(new THREE.LineCurve3(V(r, 8, 0), V(r, hy, 0))); path.add(new THREE.LineCurve3(V(r, hy, 0), V(0, fy, 0)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(path, 160, 0.008, 5, false), new THREE.ShaderMaterial({ uniforms: { ...LRU, uE: { value: edge } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT, uK, uE; varying vec2 vU; void main(){ float p = fract(vU.x * 3.0 - uT * 0.7); float pulse = smoothstep(0.0, 0.1, p) * smoothstep(0.25, 0.1, p); float show = step(vU.x, uK * 1.02);
      vec3 c = mix(vec3(1.0, 0.95, 0.75), vec3(1.0, 0.38, 0.28), uE); gl_FragColor = vec4(c * (0.35 + 1.3 * pulse) * show, 1.0); }` }));
  m.userData.edge = edge; LAB.add(m); LRAYS.push(m); }
const FC1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), glow(0x3dff8c, 3)); FC1.position.set(0, FOC, 0); LAB.add(FC1);
const FC2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), glow(0xff5a4a, 3)); FC2.position.set(0, FOC + 1.25, 0); LAB.add(FC2);
function labRays(k, t) { LRU.uK.value = k; FC1.visible = FC2.visible = k > 0.85; const s = 1 + 0.25 * Math.sin(t * 6); FC1.scale.setScalar(s); FC2.scale.setScalar(s); LRAYS.forEach((m) => (m.visible = k > 0)); }
// the test tool (diagram): a bench, a light at one end, two small mirrors and the field lens in its mount. The lens sat 1.3 mm
// out of place; the gap at its mount was filled with a washer. The 1.3 mm is drawn exaggerated.
const BENCH = new THREE.Group(); LAB.add(BENCH); BENCH.position.set(0, 0, 0); BENCH.visible = false;
const LENS = new THREE.Group(), LENS_GHOST = new THREE.Group(), BW = makeWasher();
{ const steel = new THREE.MeshPhysicalMaterial({ color: 0x8d949c, metalness: 1, roughness: 0.32 }), dark = new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.5, metalness: 0.5 });
  const rail = sh(new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.08, 4.2, 3, 0.02), steel)); rail.position.set(0, -0.5, 0); BENCH.add(rail);
  const post = (z, h) => { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 16), steel)); p.position.set(0, -0.46 + h / 2, z); BENCH.add(p); const f = sh(new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.2, 2, 0.015), dark)); f.position.set(0, -0.44, z); BENCH.add(f); };
  const src = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), glow(0xfff2c8, 4)); src.position.set(0, 0.25, 1.9); BENCH.add(src); post(1.9, 0.7);
  for (const z of [-1.7, -0.3]) { post(z, 0.7); const mm = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 48), new THREE.MeshPhysicalMaterial({ color: 0xdfe6f0, metalness: 1, roughness: 0.05 }))); mm.rotation.x = Math.PI / 2; mm.position.set(0, 0.25, z); BENCH.add(mm);
    const ring = sh(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 10, 48), dark)); ring.position.set(0, 0.25, z); BENCH.add(ring); }
  // field lens + its mount (the support it should sit flush against)
  post(0.9, 0.7); const sup = sh(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 48), dark)); sup.position.set(0, 0.25, 0.9); BENCH.add(sup);
  const lensG = new THREE.SphereGeometry(0.5, 48, 24, 0, TAU, 0, 0.34); lensG.translate(0, -0.5 * Math.cos(0.34), 0); const lensM = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.02, transmission: 1, thickness: 0.06, ior: 1.5, transparent: true });
  for (const s of [1, -1]) { const h = new THREE.Mesh(lensG, lensM); h.rotation.x = s * Math.PI / 2; LENS.add(h); }
  const lr = sh(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 10, 48), steel)); LENS.add(lr); LENS.position.set(0, 0.25, 0.9 - 0.16); BENCH.add(LENS);
  for (const s of [1, -1]) { const h = new THREE.Mesh(lensG, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.8, 0.8), wireframe: true, transparent: true, opacity: 0.35, toneMapped: false })); h.rotation.x = s * Math.PI / 2; LENS_GHOST.add(h); }
  LENS_GHOST.position.set(0, 0.25, 0.9 - 0.04); BENCH.add(LENS_GHOST);
  BW.scale.set(0.27, 0.42, 0.27); BW.rotation.x = Math.PI / 2; BENCH.add(BW);
  // the beam through the tool
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 0.9), transparent: true, opacity: 0.55, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.rotation.x = Math.PI / 2; beam.position.set(0, 0.25, 0.1); BENCH.add(beam); BENCH.userData.beam = beam; }
/** off: lens displacement 0..1 (1 = the 1.3 mm error, exaggerated); w: washer slide-in 0..1 */
function bench(off, w, t) { LENS.position.z = 0.9 - 0.04 - 0.07 * off; LENS_GHOST.visible = off > 0.02; LENS_GHOST.children.forEach((m) => (m.material.opacity = 0.25 + 0.15 * Math.sin(t * 5)));
  BW.visible = w > 0; BW.position.set(0, 0.25 + (1 - ease(clamp(w))) * 0.9, 0.84); BW.rotation.set(Math.PI / 2, 0, (1 - w) * 2.0); }

// =====================================================================================================================
// THE REAL IMAGES (NASA, public domain), on archive cards: a star in 1990 (flawed), M100 in 1993 → 1994 (corrected)
// =====================================================================================================================
const PANELS = new THREE.Group(); scene.add(PANELS); PANELS.position.set(-6000, 0, 0); PANELS.visible = false;
const PU = { uT: { value: 0 }, uW: { value: 0 }, uA: { value: tex("ref/m100_a.jpg", true) }, uB: { value: tex("ref/m100_b.jpg", true) } };
function card3d(w, h, mat, label) { const g = new THREE.Group(); const fr0 = sh(new THREE.Mesh(new RoundedBoxGeometry(w + 0.12, h + 0.32, 0.05, 3, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x15181d, roughness: 0.4, metalness: 0.5, clearcoat: 0.6 }))); fr0.position.set(0, -0.08, -0.03); g.add(fr0);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); g.add(p);
  const lt = H.canvasTex(1024, 64, (c) => { c.fillStyle = "#15181d"; c.fillRect(0, 0, 1024, 64); c.fillStyle = "#aab3bd"; c.font = "700 34px M"; c.fillText(label, 16, 44); });
  const l = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 64 / 1024), new THREE.MeshBasicMaterial({ map: lt, toneMapped: false })); l.position.set(0, -h / 2 - 0.12, 0.001); g.add(l); return g; }
const imgMat = (u) => new THREE.MeshBasicMaterial({ map: tex(u, true), toneMapped: false });
const C_PSF = card3d(1.6, 1.6, imgMat("ref/psf.jpg"), "A STAR, SEEN BY HUBBLE · NASA"); PANELS.add(C_PSF); C_PSF.position.set(0, 1.0, 0);
const C_M1 = card3d(1.6, 1.6, new THREE.MeshBasicMaterial({ map: PU.uA.value, toneMapped: false }), "GALAXY M100 · 1993 · NASA/ESA"); PANELS.add(C_M1); C_M1.position.set(0, -1.0, 0);
const WIPE = card3d(2.2, 2.2, new THREE.ShaderMaterial({ uniforms: PU, toneMapped: false,
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D uA, uB; uniform float uW; varying vec2 vU; void main(){ float x = vU.x - (1.0 - vU.y) * 0.18; float s = step(x, uW * 1.2 - 0.1);
    vec3 a = pow(texture2D(uA, vU).rgb, vec3(2.2)), b = pow(texture2D(uB, vU).rgb, vec3(2.2)); vec3 c = mix(a, b, s); float line = smoothstep(0.006, 0.0, abs(x - (uW * 1.2 - 0.1)));
    c += vec3(0.5, 2.0, 1.0) * line; gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0); }` }), "GALAXY M100 · 1993 → 1994 · NASA/ESA/STScI"); PANELS.add(WIPE); WIPE.position.set(0, 0, -0.01);

// =====================================================================================================================
// ORBI: one phone, its own passcode; twelve wrong tries (pips go red one by one), then the file locks itself
// =====================================================================================================================
const ORS = new THREE.Group(); scene.add(ORS); ORS.position.set(0, 0, -9000); ORS.visible = false;
const IMG = { ph: await img("shots_live/phone.png") };
const PH = makePhone(); ORS.add(PH.g); PH.g.position.set(0, 1.25, 0); PH.g.scale.setScalar(1.25);
{ const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.6, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.position.y = 0; fl.receiveShadow = true; ORS.add(fl);
  const ped = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3, metalness: 0.6, clearcoat: 0.5 }))); ped.position.y = 0.06; ORS.add(ped); }
const PIPS = Array.from({ length: 12 }, (_, i) => { const a = Math.PI / 2 - i / 12 * TAU; const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.3, 0.35), toneMapped: false }));
  m.position.set(Math.cos(a) * 1.45, 1.25 + Math.sin(a) * 1.45, -0.05); ORS.add(m); return m; });
const LOCK = makeLock(0xff3a2d); LOCK.scale.setScalar(0.9); LOCK.position.set(0, 1.55, 0.3); ORS.add(LOCK); LOCK.visible = false;
const GUESS = ["4821", "1990", "0000", "1234", "7777", "2400", "1993", "5150", "9999", "3141", "2718", "8642"];
function drawPh(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "rgba(8,10,14,.95)"; rr(g, 40, 470, 700, 760, 36); g.fill(); g.strokeStyle = st.locked ? "#ff4a3d" : "rgba(255,255,255,.15)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#fff"; g.font = "800 50px M"; g.fillText("hubble-1990.jpg", 84, 556); g.fillStyle = "#9aa3ad"; g.font = "700 38px M"; g.fillText("Enter passcode", 84, 612);
  for (let i = 0; i < 4; i++) { const x = 84 + i * 158; g.fillStyle = "rgba(255,255,255,.07)"; rr(g, x, 640, 136, 150, 22); g.fill(); g.strokeStyle = st.bad ? "#ff4a3d" : "rgba(255,255,255,.25)"; g.lineWidth = 3; g.stroke();
    if (st.n > i) { g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 68, 715, 16, 0, TAU); g.fill(); } }
  g.font = "800 40px M"; if (st.locked) { g.fillStyle = "#ff4a3d"; g.fillText("Locked: too many", 84, 880); g.fillText("wrong attempts", 84, 926); }
  else if (st.tries > 0) { g.fillStyle = "#ff6b5e"; g.fillText("Wrong passcode", 84, 870); g.fillText(`${Math.max(0, 12 - st.tries)} tries left`, 84, 920); }
  g.fillStyle = st.locked ? "rgba(255,74,61,.18)" : "rgba(61,255,140,.16)"; rr(g, 84, 1000, 612, 120, 26); g.fill(); g.fillStyle = st.locked ? "#ff4a3d" : green; g.font = "900 44px D"; g.fillText(st.locked ? "LOCKED" : "UNLOCK", 300, 1076); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  nasa: ["NASA's own 3D model", "#9fd4ff", "13.2 m long"], arrays: ["Solar arrays", "#ffd166", "power from the Sun"], prim: ["Primary mirror", "#cfe6ff", "2.4 m wide"],
  secm: ["Secondary mirror", "#cfd6dd", "bounces light back"], focusL: ["Focus", "#3dff8c", "where the cameras sit"], edgeL: ["The edge", "#ff6b5e", "too flat"],
  designL: ["Designed shape", "#3dff8c", ""], madeL: ["As made", "#ff6b5e", "edge too flat"], c1: ["Light from the centre", "#3dff8c", "focuses here"], c2: ["Light from the edge", "#ff6b5e", "focuses farther away"],
  lensL: ["Field lens", "#ff6b5e", "1.3 mm out of place"], ghostL: ["Where it belonged", "#3dff8c", ""], washL: ["An ordinary metal washer", "#e6e9ee", "filling the gap"],
  costarL: ["COSTAR", "#3dff8c", "corrective optics · 1993"], sharpL: ["One sharp focus", "#3dff8c", "again"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
const pill = (s) => `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">${s}</div>`;
const big = (id, n, sub, c = "#fff", sc = "#ffd166") => `<div style="width:1080px;text-align:center"><div id="${id}" style="font:900 170px/0.9 D;font-stretch:112%;color:${c};text-shadow:0 12px 50px rgba(0,0,0,.6)">${n}</div><div style="font:800 36px D;letter-spacing:.12em;color:${sc};margin-top:8px">${sub}</div></div>`;
hudEl("launch", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("LAUNCHED", "24 APR 1990")}${card("CARRIED BY", "DISCOVERY", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("mstats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("MIRROR", "2.4 m", "#cfe6ff")}${card("SMOOTH TO", "~10 nm", "#3dff8c")}</div>`, { left: "0px", top: "1440px" });
hudEl("nmN", big("nN", "0 nm", "TOO FLAT AT THE EDGE", "#ff6b5e", "#fff"), { left: "0px", top: "200px" });
hudEl("frac", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("THAT IS ABOUT", "1/450 mm", "#ff6b5e")}</div>`, { left: "0px", top: "1440px" });
hudEl("exag", pill("SHAPE ERROR DRAWN 25,000× LARGER"), { left: "250px", top: "1120px" });
hudEl("diag", pill("DIAGRAM"), { left: "445px", top: "1120px" });
hudEl("sph", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #ff6b5e;font:900 50px D;color:#fff">SPHERICAL ABERRATION</div></div>`, { left: "0px", top: "230px" });
hudEl("mm", big("mmN", "1.3 mm", "ONE LENS, OUT OF PLACE", "#ff6b5e", "#fff"), { left: "0px", top: "200px" });
hudEl("tool", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("THE TEST TOOL", "NULL CORRECTOR", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("first", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("FIRST IMAGES", "BLURRED", "#ff6b5e")}</div>`, { left: "0px", top: "1660px" });
hudEl("fix", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("DECEMBER", "1993", "#3dff8c")}${card("MISSION", "STS-61", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("ba", `<div style="width:1080px;display:flex;justify-content:space-between;padding:0 120px;box-sizing:border-box">${card("BEFORE", "1993", "#ff6b5e")}${card("AFTER", "1994", "#3dff8c")}</div>`, { left: "0px", top: "1500px" });
hudEl("hconst", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("HUBBLE MEASURED", "HOW FAST THE UNIVERSE EXPANDS", "#ffd166")}</div>`, { left: "0px", top: "1440px" });
hudEl("tries", big("tN", "0", "WRONG TRIES", "#fff", "#ff6b5e"), { left: "0px", top: "190px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["OWN PASSCODE", "12 TRIES", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
