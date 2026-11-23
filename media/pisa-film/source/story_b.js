
// =====================================================================================================================
// THE CROSS-SECTION (cut at z = 0): the soil layers under the piazza (Burland et al.: horizon A sandy/clayey silts to
// ~10 m, horizon B soft marine clays to ~40 m, horizon C dense sand), the 3 m foundation ring, the hollow tower
// =====================================================================================================================
H.r.localClippingEnabled = true;
const SECU = { uSquash: { value: 0 }, uCav: { value: 0 }, uCavP: { value: new THREE.Vector2(-7, -5) }, uSettleN: { value: 0 } };
const secMat = new THREE.ShaderMaterial({ uniforms: SECU, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uSquash, uCav, uSettleN; uniform vec2 uCavP; varying vec2 vP;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    void main(){ float x = vP.x, y = vP.y;
      // settlement bowl under the tower: deeper on the low (+x) side; the layers sag with it
      float bowl = uSquash * (2.2 * exp(-pow((x - 3.0) / 11.0, 2.0)) + 1.2 * exp(-pow((x - 9.0) / 6.0, 2.0))) * exp(y / 25.0);
      bowl -= uSettleN * 1.4 * exp(-pow((x + 7.0) / 7.0, 2.0)) * exp(y / 12.0);
      float yy = y + bowl;
      vec3 c;
      if (yy > -0.7) c = vec3(0.32, 0.25, 0.18);
      else if (yy > -10.0) c = mix(vec3(0.62, 0.52, 0.36), vec3(0.5, 0.42, 0.3), step(0.5, fract(yy * 1.3 + 0.3 * n(vec2(x * 0.2, yy)))));
      else if (yy > -22.0) c = vec3(0.52, 0.62, 0.7);
      else if (yy > -24.5) c = vec3(0.6, 0.55, 0.42);
      else if (yy > -40.0) c = vec3(0.46, 0.56, 0.64);
      else c = vec3(0.66, 0.56, 0.38);
      c *= 0.88 + 0.2 * n(vec2(x * 1.7, yy * 3.0)) + 0.06 * n(vec2(x * 9.0, yy * 9.0));
      float line = 1.0 - smoothstep(0.0, 0.08, abs(fract(yy / 2.0) - 0.5) - 0.42); c *= 1.0 - 0.08 * line;
      // boundaries between horizons
      for (int i = 0; i < 4; i++) { float b = i == 0 ? -10.0 : i == 1 ? -22.0 : i == 2 ? -24.5 : -40.0; c = mix(c, c * 0.6, 1.0 - smoothstep(0.0, 0.12, abs(yy - b))); }
      // the cavity left by a drill, closing as the soil squeezes in
      float cav = uCav * (1.0 - smoothstep(0.0, 0.5, length((vP - uCavP) * vec2(0.8, 1.5))));
      c = mix(c, vec3(0.03), cav);
      gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0); }` });
const SECTION = new THREE.Group(); scene.add(SECTION); SECTION.visible = false;
const secFace = new THREE.Mesh(new THREE.PlaneGeometry(400, 60, 1, 1), secMat); secFace.position.set(0, -30, -0.02); SECTION.add(secFace);
const secTop = new THREE.Mesh(new THREE.BoxGeometry(400, 0.4, 0.6), matte(0x5f4a32, 0.9)); secTop.position.set(0, -0.2, 0); SECTION.add(secTop);
// cut caps on the tower walls and the foundation (drawn in each storey's own frame so they tilt with it)
const capMat = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.8, map: mbT("diff", true, 1, 1), side: THREE.DoubleSide });
const CAPS = [];
const cap = (g, x0, x1, y0, y1, m = capMat) => { const c = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), m); c.position.set((x0 + x1) / 2, (y0 + y1) / 2, -0.01); c.material.side = THREE.DoubleSide; g.add(c); CAPS.push(c); const d = c.clone(); d.position.x = -d.position.x; g.add(d); CAPS.push(d); };
ST.forEach((g, k) => { const h = SH[k]; if (k === 0) { cap(g, R_IN, R_BASE, 0, h); } else if (k < 7) { cap(g, R_IN, R_GAL, 0, h); cap(g, R_GAL, R_BASE + 0.25, 0, 0.5); cap(g, R_GAL, R_BASE, 5.25, h); } else cap(g, 4.0, 5.4, 0, h - 0.05); });
cap(TW, 4.5, 9.8, -3.0, 0, new THREE.MeshStandardMaterial({ color: 0x8d8376, roughness: 0.9 }));
for (const c of CAPS) c.visible = false;
const CLIPMATS = [marbleMat, lawnMat, pathMat, FOUND.material, duomoMat, roofMat, darkMat];
ST[7].traverse((o) => { if (o.material && o.material.isMeshPhysicalMaterial) CLIPMATS.push(o.material); });
let secOn = null;
function section(on) { if (secOn === on) return; secOn = on; for (const m of CLIPMATS) { m.clippingPlanes = on ? [CLIP] : null; m.needsUpdate = true; } SECTION.visible = on; for (const c of CAPS) c.visible = on; CROWD.visible = !on; DUOMO.visible = BAPT.visible = !on; }
// squeeze arrows in the clay (glowing dashes), the weight arrow down the tower
const dashMat = (col) => new THREE.ShaderMaterial({ uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(col).multiplyScalar(2.2) } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uP; uniform vec3 uC; varying float vU; void main(){ float on = step(vU, uP); float dash = 0.6 + 0.4 * sin((vU - uP) * 60.0); gl_FragColor = vec4(uC * on * dash * (0.45 + 0.55 * smoothstep(uP - 0.25, uP, vU)), 1.0); }` });
const ARROWS = [];
const arrow = (pts, col, r = 0.35) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, r, 8), dashMat(col)); m.renderOrder = 40; SECTION.add(m); ARROWS.push(m); return m; };
const aWeight = arrow([V(4, 52, -0.5), V(3, 20, -0.5), V(2.5, -3, -0.5), V(3, -9, -0.5)], 0xffd166, 0.55);
const aSqR = arrow([V(6, -12, -0.5), V(16, -15, -0.5), V(30, -14, -0.5)], 0xff8a3d), aSqL = arrow([V(9, -16, -0.5), V(20, -21, -0.5), V(34, -20, -0.5)], 0xff8a3d), aDown = arrow([V(9, -2, -0.5), V(9, -9, -0.5)], 0xff8a3d, 0.45);

// =====================================================================================================================
// THE RESCUE (1993–2001): 870 t of lead ingots on a concrete ring at the north (high) side; steel cables round the
// 3rd level; slanted drills extracting soil under the high side
// =====================================================================================================================
const RESCUE = new THREE.Group(); scene.add(RESCUE);
const ringC = sh(new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1.2, 48, 1, true, -Math.PI / 2 - 0.75, 1.5), new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 0.9, side: THREE.DoubleSide }))); ringC.position.y = 0.6; RESCUE.add(ringC);
{ const s = new THREE.Shape(); s.absarc(0, 0, 15, Math.PI - 0.75, Math.PI + 0.75, false); s.absarc(0, 0, 11.4, Math.PI + 0.75, Math.PI - 0.75, true); const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = sh(new THREE.Mesh(g, ringC.material)); RESCUE.add(m); }
const LEAD = []; { for (let l = 0; l < 8; l++) for (let r = 0; r < 10; r++) for (let i = 0; i < 30; i++) { const a = Math.PI - 0.7 + (i + 0.5) / 30 * 1.4, rad = 11.8 + r * 0.31; LEAD.push([Math.cos(a) * rad, 1.3 + l * 0.21, Math.sin(a) * rad, a, l]); } }
const leadIM = new THREE.InstancedMesh(new RoundedBoxGeometry(0.58, 0.2, 0.29, 1, 0.02), new THREE.MeshStandardMaterial({ color: 0x5d6166, roughness: 0.45, metalness: 0.75 }), LEAD.length); leadIM.castShadow = true; leadIM.frustumCulled = false; RESCUE.add(leadIM);
function leadUpTo(k) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const n = Math.floor(k * LEAD.length); LEAD.forEach(([x, y, z, a], i) => { q.setFromAxisAngle(V(0, 1, 0), -a + Math.PI / 2); m4.compose(V(x, i < n ? y : -50, z), q, V(1, 1, 1)); leadIM.setMatrixAt(i, m4); }); leadIM.instanceMatrix.needsUpdate = true; }
leadUpTo(0);
// cables: a collar round the 3rd level, two steel cables running north to anchors beyond the walls
const steel = metal(0x8a9098, 0.35);
const collar = sh(new THREE.Mesh(new THREE.TorusGeometry(R_BASE + 0.35, 0.18, 10, 64), steel)); collar.rotation.x = Math.PI / 2; ST[3].add(collar); collar.position.y = 0.3;
const CAB = [0, 1].map(() => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 10), steel)); RESCUE.add(m); return m; });
const ANCH = [V(-300, 0, -14), V(-300, 0, 14)];
for (const a of ANCH) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.9 }))); b.position.copy(a).setY(1.5); RESCUE.add(b); }
function cables(on) { CAB.forEach((m, i) => { m.visible = on; collar.visible = on; if (!on) return; const p = ST[3].localToWorld(V(-(R_BASE + 0.35), 0.3, (i ? 1 : -1) * 2.5)), q = ANCH[i].clone().setY(3); const d = q.clone().sub(p); m.position.copy(p).add(q).multiplyScalar(0.5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }); }
// drill rigs on the north side: a tracked base, an inclined mast, the auger going under the foundation
const DRILLS = []; { const N = 5; for (let i = 0; i < N; i++) { const a = Math.PI + (i - (N - 1) / 2) * 0.22; const base = V(Math.cos(a) * 24, 0, Math.sin(a) * 24); const tip = V(Math.cos(a) * 7.5, -5.2, Math.sin(a) * 7.5);
    const g = new THREE.Group(); RESCUE.add(g); const body = sh(new THREE.Mesh(new RoundedBoxGeometry(3.2, 1.3, 2.0, 2, 0.2), paint(0xd9a21b, 0.4))); body.position.copy(base).add(V(0, 1.25, 0)); body.rotation.y = -a; g.add(body);
    for (const s of [-1, 1]) { const tr = sh(new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.7, 0.55, 3, 0.3), matte(0x1d1f22, 0.7))); tr.position.copy(base).add(V(-Math.sin(a) * s * 1.05, 0.35, Math.cos(a) * s * 1.05)); tr.rotation.y = -a; g.add(tr); }
    const cab = sh(new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.1, 1.3, 2, 0.15), new THREE.MeshPhysicalMaterial({ color: 0x1a2a33, roughness: 0.1, metalness: 0.4 }))); cab.position.copy(base).add(V(Math.cos(a) * 1.0, 2.2, Math.sin(a) * 1.0)); cab.rotation.y = -a; g.add(cab);
    const mastDir = base.clone().sub(tip).normalize(); const mastTop = base.clone().addScaledVector(mastDir, 7).add(V(0, 0.8, 0));
    const mast = sh(new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), paint(0xd9a21b, 0.4))); mast.position.copy(base).add(mastTop).multiplyScalar(0.5); mast.scale.y = base.distanceTo(mastTop); mast.quaternion.setFromUnitVectors(V(0, 1, 0), mastDir); g.add(mast);
    const aug = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 12), metal(0x9aa0a6, 0.35))); g.add(aug);
    const spoil = sh(new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 1 }))); spoil.position.copy(base).add(V(-mastDir.x * 0 + 2.4 * Math.cos(a + 1.57), 0.4, 2.4 * Math.sin(a + 1.57))); g.add(spoil);
    DRILLS.push({ g, base: base.clone().add(V(0, 0.3, 0)), tip, aug, spoil }); } }
function drills(on, k = 0, t = 0) { DRILLS.forEach((d, i) => { d.g.visible = on; if (!on) return; const L = d.base.distanceTo(d.tip) * clamp(k * 1.6 - i * 0.08, 0.05, 1); const dir = d.tip.clone().sub(d.base).normalize();
    d.aug.position.copy(d.base).addScaledVector(dir, L / 2); d.aug.scale.y = L; d.aug.quaternion.setFromUnitVectors(V(0, 1, 0), dir); d.aug.rotateY(t * 6); d.spoil.scale.setScalar(0.2 + 0.8 * clamp(k * 1.3 - i * 0.05)); }); }

// =====================================================================================================================
// ORBI: a café table at the edge of the piazza at sunset; the sender picks when the file burns (5–30 min)
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
OR.position.set(26, 0.9, 58); { const d = V(0, 20, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-d.x, -d.z); }
const tableM = new THREE.MeshPhysicalMaterial({ color: 0x3a2a1e, roughness: 0.35, clearcoat: 0.6, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) });
const table = sh(new THREE.Mesh(new RoundedBoxGeometry(7.5, 0.22, 4.2, 3, 0.06), tableM)); table.position.set(0.5, -0.12, 0.3); OR.add(table);
lap.g.position.set(-1.4, 0, 0.2); lap.g.rotation.y = 0.3; ph.g.position.set(1.8, 0.06, 0.9); ph.g.rotation.set(-Math.PI / 2 + 0.5, 0, -0.15);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); OR.add(orbiL);
const EMB = makeEmbers(260); OR.add(EMB);
const LIVES = [5, 10, 15, 20, 25, 30];
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  g.fillStyle = "#0b0d10"; g.fillRect(60, 560, 660, 120);
  g.fillStyle = "rgba(14,18,22,.96)"; g.strokeStyle = green; g.lineWidth = 3; rr(g, 60, 520, 660, 560, 40); g.fill(); g.stroke();
  g.fillStyle = "#fff"; g.font = "800 42px D"; g.fillText("pisa-sunset.jpg", 100, 600); g.fillStyle = "#9aa6b2"; g.font = "600 28px M"; g.fillText("DISAPPEARS IN", 100, 670);
  LIVES.forEach((m, i) => { const x = 100 + (i % 3) * 200, y = 700 + Math.floor(i / 3) * 110; const on = st.sel === m; g.fillStyle = on ? green : "rgba(255,255,255,.08)"; rr(g, x, y, 180, 90, 24); g.fill(); g.fillStyle = on ? "#06140c" : "#cfd6dd"; g.font = "800 40px D"; g.fillText(`${m}m`, x + 50, y + 60); });
  if (st.left !== undefined) { g.fillStyle = st.left <= 0 ? "#ff8a3d" : "#fff"; g.font = "900 64px D"; const s = Math.max(0, st.left); g.fillText(st.left <= 0 ? "BURNED" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`, 100, 1010); } }
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.left !== undefined) { g.fillStyle = "rgba(14,18,22,.95)"; g.strokeStyle = st.left <= 0 ? "#ff8a3d" : green; g.lineWidth = 3; rr(g, 420, 300, 600, 300, 34); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("pisa-sunset.jpg", 470, 380); const s = Math.max(0, st.left);
    g.fillStyle = st.left <= 0 ? "#ff8a3d" : green; g.font = "900 72px D"; g.fillText(st.left <= 0 ? "DELETED" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`, 470, 490);
    g.fillStyle = "#9aa6b2"; g.font = "600 26px M"; g.fillText(st.left <= 0 ? "stored copy deleted" : "burns when the clock hits zero", 470, 550); } }
