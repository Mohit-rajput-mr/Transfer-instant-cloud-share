
// =====================================================================================================================
// THE CABLE CUTAWAY (its own set): 0.92 m cable → 61 strands → 27,572 wires of 4.9 mm, hex-packed and compacted
// =====================================================================================================================
const CC = new THREE.Group(); CC.position.set(20000, 0, 0); scene.add(CC); CC.visible = false;
const R_CABLE = 0.46, R_WIRE = 0.00244;
const strandCentres = (() => { const P = [[0, 0]]; const r1 = 0.1; for (let ring = 1; ring <= 4; ring++) for (let k = 0; k < 6 * ring; k++) { const a = (k / (6 * ring)) * Math.PI * 2 + ring * 0.3; P.push([Math.cos(a) * ring * r1, Math.sin(a) * ring * r1]); } return P; })();   // 1+6+12+18+24 = 61 strands
const R_STRAND = 0.052;
// the outer cable: wrapping + bands, cut open at the end with a clipping plane so the strands show
const ccClip = new THREE.Plane(V(0, 0, -1), 0);
const wrapMat = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.55, metalness: 0.2, clippingPlanes: [ccClip] });
const ccCable = sh(new THREE.Mesh(new THREE.CylinderGeometry(R_CABLE, R_CABLE, 6, 64, 1, true), wrapMat)); ccCable.rotation.x = Math.PI / 2; ccCable.position.z = -3; CC.add(ccCable);
for (let z = -5.5; z < 0; z += 1.2) { const band = sh(new THREE.Mesh(new THREE.CylinderGeometry(R_CABLE + 0.03, R_CABLE + 0.03, 0.35, 64), metal(0x8a2a22, 0.4))); band.rotation.x = Math.PI / 2; band.position.z = z; CC.add(band); }
// strands: 61 bundles that stick out of the cut a little, each a bundle of hex-packed wires
const STR = new THREE.Group(); CC.add(STR);
const wireMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 0.95, roughness: 0.28 });
const strandMat = new THREE.MeshStandardMaterial({ color: 0xaeb3b8, metalness: 0.9, roughness: 0.35 });
const wirePos = (() => { const P = []; const d = R_WIRE * 1.94; for (let r = 0; r < 16; r++) { if (r === 0) { P.push([0, 0]); continue; } for (let k = 0; k < 6; k++) for (let j = 0; j < r; j++) { const a0 = k * Math.PI / 3, a1 = (k + 1) * Math.PI / 3; const u = j / r; P.push([lerp(Math.cos(a0), Math.cos(a1), u) * r * d, lerp(Math.sin(a0), Math.sin(a1), u) * r * d]); } }
  return P.sort((p, q) => Math.hypot(...p) - Math.hypot(...q)).slice(0, 452); })();   // 452 wires per strand, packed round
const WIRES = new THREE.InstancedMesh(new THREE.CylinderGeometry(R_WIRE * 0.95, R_WIRE * 0.95, 1, 10), wireMat, 61 * 452); WIRES.frustumCulled = false; CC.add(WIRES);
// seizing bands that hold each strand together near the cut
const STRANDS = new THREE.InstancedMesh(new THREE.CylinderGeometry(R_STRAND * 1.06, R_STRAND * 1.06, 0.025, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x6a6e73, metalness: 0.85, roughness: 0.45, side: THREE.DoubleSide }), 61); STRANDS.frustumCulled = false; CC.add(STRANDS);
function setStrands(out = 0.25) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2); let k = 0;
  const sp = 1 + out * 0.04;   // strands fan apart a little when cut, then compact
  strandCentres.forEach(([sx0, sy0], i) => { const sx = sx0 * sp, sy = sy0 * sp, ext = out * (0.6 + 0.4 * hash(i)); m4.compose(V(sx, sy, ext - 0.06), q, V(1, 1, 1)); STRANDS.setMatrixAt(i, m4);
    for (const [wx, wy] of wirePos) { const tip = ext + 0.004 + 0.012 * hash(k * 0.37), L = 6 + tip; m4.compose(V(sx + wx, sy + wy, tip - L / 2), q, V(1, L, 1)); WIRES.setMatrixAt(k++, m4); } });
  STRANDS.instanceMatrix.needsUpdate = true; WIRES.instanceMatrix.needsUpdate = true; }
setStrands();
const ccKey = new THREE.DirectionalLight(0xffe8cc, 2.4); ccKey.position.set(2, 3, 4); CC.add(ccKey, ccKey.target); const ccRim = new THREE.DirectionalLight(0x9fc0ff, 1.2); ccRim.position.set(-3, 1, -2); CC.add(ccRim);

// =====================================================================================================================
// LOAD PATH: glowing arrows from a truck at midspan → deck → suspenders → cable → towers → sea floor, and → anchorages
// =====================================================================================================================
const TRUCK = new THREE.Group(); BRIDGE.add(TRUCK);
{ const cab = sh(new THREE.Mesh(new RoundedBoxGeometry(2.5, 3.0, 2.6, 2, 0.3), paint(0xe8e6e0, 0.4))); cab.position.set(0, 1.9, 6.4); TRUCK.add(cab);
  const box = sh(new THREE.Mesh(new RoundedBoxGeometry(2.6, 3.4, 11, 2, 0.2), paint(0xcfd3d8, 0.5))); box.position.set(0, 2.1, 0); TRUCK.add(box);
  for (const z of [-4, 0, 5.8]) for (const x of [-1.25, 1.25]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), matte(0x111111, 0.8)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); TRUCK.add(w); } }
TRUCK.position.set(-5, DECK + 0.5, 0);
const flowMat = (col) => new THREE.ShaderMaterial({ uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(col).multiplyScalar(2.2) } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uP; uniform vec3 uC; varying float vU; void main(){ float on = step(vU, uP); float dash = 0.55 + 0.45 * sin((vU - uP) * 160.0); gl_FragColor = vec4(uC * on * dash * (0.4 + 0.6 * smoothstep(uP - 0.15, uP, vU)), 1.0); }` });
const FLOWS = [];
function flow(pts, col, r = 0.9) { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, r, 8), flowMat(col)); m.renderOrder = 20; BRIDGE.add(m); FLOWS.push(m); return m; }
const fDown = flow([V(-5, DECK + 4, 0), V(-5, DECK + 0.6, 0), V(-CX, DECK + 0.6, 0)], 0xffd166, 0.7);
const fSusp = flow([V(-CX, DECK + 0.6, 0), V(-CX, cableY(0), 0)], 0xffd166, 0.7);
const cablePath = (z0, z1, n = 60) => Array.from({ length: n + 1 }, (_, i) => { const z = lerp(z0, z1, i / n); return V(-CX, cableY(z) + 1.2, z); });
const fCableN = flow(cablePath(0, ZT), 0xff8a3d, 1.0), fCableS = flow(cablePath(0, -ZT), 0xff8a3d, 1.0);
const fTowerN = flow([V(-CX, TOWER_H, ZT), V(-CX, 0, ZT), V(-CX, -34, ZT)], 0x3dff8c, 1.4), fTowerS = flow([V(-CX, TOWER_H, -ZT), V(-CX, 0, -ZT), V(-CX, -34, -ZT)], 0x3dff8c, 1.4);
const fAnchN = flow(cablePath(ZT, ZA + 20), 0x6fd0ff, 1.0), fAnchS = flow(cablePath(-ZT, -ZA - 20), 0x6fd0ff, 1.0);
function flows(k) { const set = (m, a, b) => (m.material.uniforms.uP.value = clamp((k - a) / (b - a))); set(fDown, 0, 0.12); set(fSusp, 0.12, 0.25); set(fCableN, 0.25, 0.5); set(fCableS, 0.25, 0.5); set(fTowerN, 0.5, 0.75); set(fTowerS, 0.5, 0.75); set(fAnchN, 0.7, 0.95); set(fAnchS, 0.7, 0.95); for (const m of FLOWS) m.visible = k > 0; }

// =====================================================================================================================
// ORBI: Battery Spencer overlook (north side), the bridge below in the fog
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
OR.position.set(-420, 150, 1250);
const OR_D = V(0, 120, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-OR_D.x, -OR_D.z);
const lock = makeLock(); OR.add(lock);
const wall = sh(new THREE.Mesh(new RoundedBoxGeometry(9, 0.5, 4.2, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x9c968a, roughness: 0.9, map: tex("kit/ph/concrete_wall_008/concrete_wall_008_diff_1k.jpg", true, 2, 1) }))); OR.add(wall); wall.position.set(0.6, -0.35, 0);
lap.g.position.set(-1.2, 0, 0.2); lap.g.rotation.y = 0.35; ph.g.position.set(2.2, 0.06, 0.6); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.25);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); OR.add(orbiL);
// a folder of many files → one bundle → unpacked into a folder on the phone
const fileMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.15, 1.2), toneMapped: false });
const FILES = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.13, 0.008, 2, 0.01), fileMat); OR.add(m); return m; });
const BUNDLE = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.26, 0.12, 3, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 1.0, 0.55).multiplyScalar(1.3), toneMapped: false })); OR.add(BUNDLE);
const N_FILES = 412;
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.k >= 0) { g.fillStyle = "rgba(10,12,16,.94)"; rr(g, 120, 230, 1200, 600, 30); g.fill(); g.fillStyle = "#fff"; g.font = "800 44px D"; g.fillText("golden-gate-photos", 170, 310);
    g.fillStyle = "#9aa6b2"; g.font = "600 28px M"; g.fillText(`${N_FILES} FILES · 18.6 GB`, 170, 356);
    const shown = Math.round(48 * (1 - st.k)); for (let i = 0; i < 48; i++) { const x = 170 + (i % 12) * 92, y = 390 + Math.floor(i / 12) * 92; g.fillStyle = i < shown ? "rgba(255,255,255,.14)" : "rgba(61,255,140,.18)"; rr(g, x, y, 76, 76, 12); g.fill(); }
    g.fillStyle = green; g.font = "800 34px D"; g.fillText(st.k <= 0 ? "DROP THE WHOLE FOLDER" : st.k < 1 ? `ONE BUNDLE · ${Math.round(st.k * 100)}%` : "SENT AS ONE BUNDLE ✓", 170, 790); } }
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (st.got > 0) { g.fillStyle = "#0b0d10"; g.fillRect(60, 560, 660, 120); g.fillStyle = "rgba(14,18,22,.96)"; g.strokeStyle = green; g.lineWidth = 3; rr(g, 60, 520, 660, 520, 40); g.fill(); g.stroke();
    g.fillStyle = "#1c2a22"; rr(g, 100, 560, 140, 110, 18); g.fill(); g.fillStyle = green; rr(g, 100, 545, 70, 30, 10); g.fill();
    g.fillStyle = "#fff"; g.font = "800 38px D"; g.fillText("golden-gate-photos", 262, 610); g.fillStyle = "#9aa6b2"; g.font = "600 28px M"; g.fillText(`${N_FILES} files`, 262, 655);
    const n = Math.round(12 * Math.min(1, st.got)); for (let i = 0; i < 12; i++) { const x = 100 + (i % 4) * 150, y = 700 + Math.floor(i / 4) * 80; g.fillStyle = i < n ? "rgba(61,255,140,.22)" : "rgba(255,255,255,.06)"; rr(g, x, y, 130, 64, 12); g.fill(); }
    g.fillStyle = green; g.font = "800 38px D"; g.fillText(st.got >= 1 ? "✓ UNPACKED INTO A FOLDER" : `RECEIVING ${Math.round(st.got * 100)}%`, 100, 990); } }
