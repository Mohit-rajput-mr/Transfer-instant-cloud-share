// =====================================================================================================================
// MACRO SET (its own place): a copper sheet edge, 2.4 mm, beside two pennies; the patina cross-section in the rain
// =====================================================================================================================
const MC = new THREE.Group(); MC.position.set(9000, 0, 0); scene.add(MC); MC.visible = false;
const MP = (x, y, z) => MC.position.clone().add(V(x, y, z));
const SKIN_T = 0.0024;
const copperMat = new THREE.MeshPhysicalMaterial({ color: 0xc8764a, metalness: 1, roughness: 0.26, clearcoat: 0.2 });
const patinaMat = new THREE.MeshStandardMaterial({ map: patT("diff", true, 0.4), normalMap: patT("nor_gl", false, 0.4), color: 0x9fd8c0, roughness: 0.8, metalness: 0.05 });
const benchMat = new THREE.MeshStandardMaterial({ map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 1, 1), normalMap: tex("kit/ph/wood_table_001/wood_table_001_nor_gl_1k.jpg", false, 1, 1), roughness: 0.6 });
const bench = sh(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.5), benchMat)); bench.position.y = -0.02; MC.add(bench);
// the sheet: a slightly wavy hammered copper plate, its cut edge to camera; a thin patina layer on top (green after 1900)
const SHEET = new THREE.Group(); MC.add(SHEET); SHEET.position.set(-0.05, 0.004, 0);
{ const g = new THREE.BoxGeometry(0.22, SKIN_T, 0.16, 60, 1, 40); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.0012 * Math.sin(p.getX(i) * 70) * Math.sin(p.getZ(i) * 50)); g.computeVertexNormals();
  SHEET.add(sh(new THREE.Mesh(g, copperMat))); }
const PATL = sh(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.0004, 0.16, 60, 1, 40), patinaMat)); PATL.position.y = SKIN_T / 2 + 0.00032; SHEET.add(PATL);
{ const p = PATL.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.0012 * Math.sin(p.getX(i) * 70) * Math.sin(p.getZ(i) * 50)); PATL.geometry.computeVertexNormals(); }
// two pennies (19.05 mm across), stacked
const PEN = new THREE.Group(); PEN.position.set(0.082, 0, 0.066); MC.add(PEN);
const pennyMat = new THREE.MeshPhysicalMaterial({ color: 0xb0643a, metalness: 1, roughness: 0.35 });
for (let i = 0; i < 2; i++) { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.009525, 0.009525, 0.00152, 64), pennyMat)); c.position.y = 0.00076 + i * 0.00153; c.rotation.y = i * 1.3; PEN.add(c);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0091, 0.0003, 6, 64), pennyMat); rim.rotation.x = Math.PI / 2; rim.position.y = 0.00153 * (i + 1); PEN.add(rim); }
// rain on the patina: drops falling, splashing, beading
const DROPS = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 0.9, thickness: 0.002, ior: 1.33, transparent: true, opacity: 0.85 }), 90); DROPS.frustumCulled = false; MC.add(DROPS);
function drops(t, k) { const m4 = new THREE.Matrix4(); for (let i = 0; i < 90; i++) { const x = (hash(i) - 0.5) * 0.18, z = (hash(i + 3) - 0.5) * 0.12; const ph = ((t * 0.9 + hash(i + 5)) % 1);
    let y, s; if (i < 50) { y = SKIN_T + 0.004 + (1 - ph) * 0.12; s = 0.0014 * k; m4.compose(MP(-0.05 + x, y, z), new THREE.Quaternion(), V(s, s * 1.6, s)); }
    else { s = (0.0018 + hash(i + 7) * 0.002) * k; m4.compose(MP(-0.05 + x, 0.004 + SKIN_T / 2 + 0.0004 + s * 0.35, z), new THREE.Quaternion(), V(s, s * 0.55, s)); }   // beads sitting on the patina
    DROPS.setMatrixAt(i, m4); } DROPS.instanceMatrix.needsUpdate = true; DROPS.visible = k > 0; }
const mcKey = new THREE.DirectionalLight(0xffe6cc, 2.2); mcKey.position.set(0.5, 0.8, 0.6); MC.add(mcKey, mcKey.target);
const mcRim = new THREE.DirectionalLight(0x9fc0ff, 1.4); mcRim.position.set(-0.6, 0.3, -0.5); MC.add(mcRim);

// =====================================================================================================================
// FLEX vs RIGID (its own place): two copper panels on bars from an iron post; wind loads them; the rigid one cracks
// =====================================================================================================================
const FX = new THREE.Group(); FX.position.set(11000, 0, 0); scene.add(FX); FX.visible = false;
const FP = (x, y, z) => FX.position.clone().add(V(x, y, z));
const fxFloor = sh(new THREE.Mesh(new THREE.PlaneGeometry(20, 20), matte(0x16191d, 0.9)), false, true); fxFloor.rotation.x = -Math.PI / 2; FX.add(fxFloor);
const panelU = [{ uStress: { value: 0 }, uCrack: { value: 0 } }, { uStress: { value: 0 }, uCrack: { value: 0 } }];
function panel(U) { const g = new THREE.PlaneGeometry(1.6, 2.2, 40, 50); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.12 * Math.cos(p.getX(i) * 1.6)); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: patT("diff", true, 1), normalMap: patT("nor_gl", false, 1), color: 0x9fd8c0, roughness: 0.75, metalness: 0.15, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => { Object.assign(s.uniforms, U); s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uStress, uCrack;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        { vec2 uvp = vMapUv; vec2 q = uvp - vec2(0.5, 0.62); float r = length(q * vec2(1.0, 1.4));
          totalEmissiveRadiance += vec3(1.0, 0.18, 0.05) * uStress * 1.6 * exp(-r * r * 9.0);
          float x = uvp.x - 0.5 - 0.06 * sin(uvp.y * 40.0) - 0.03 * sin(uvp.y * 97.0); float len = step(0.62 - 0.55 * uCrack, uvp.y) * step(uvp.y, 0.62 + 0.3 * uCrack);
          float crack = (1.0 - smoothstep(0.0, 0.006, abs(x))) * len * step(0.01, uCrack);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), crack); totalEmissiveRadiance += vec3(1.0, 0.45, 0.1) * crack * 2.0 * uStress; }`); };
  m.customProgramCacheKey = () => "panel" + (U === panelU[0] ? 0 : 1);
  return sh(new THREE.Mesh(g, m)); }
const FXP = [];
for (const [i, x] of [[0, -1.3], [1, 1.3]]) { const g = new THREE.Group(); g.position.set(x, 1.6, 0); FX.add(g);
  const post = sh(new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 0.16), metal(0x3a3e44, 0.5))); post.position.set(0, 0.1, -0.9); g.add(post);
  const pn = panel(panelU[i]); g.add(pn);
  const bars = []; for (const y of [-0.7, 0, 0.7]) { const b = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(0, y, -0.85), V(0, y, -0.02)), 8, i ? 0.018 : 0.045, 8), metal(i ? 0x6a6e74 : 0x4a4e54, 0.45)); g.add(b); bars.push({ m: b, y }); }
  FXP.push({ g, pn, bars }); }
// bend a flexible bar: a tube along a curve that bows with the load
function bendBars(f, d) { for (const b of f.bars) { const c = new THREE.QuadraticBezierCurve3(V(0, b.y, -0.85), V(d * 0.9, b.y + d * 0.2, -0.45), V(d, b.y, -0.02 + d * 0.05)); b.m.geometry.dispose(); b.m.geometry = new THREE.TubeGeometry(c, 16, 0.018, 8); } }
const fxKey = new THREE.DirectionalLight(0xfff0dd, 5.0); fxKey.position.set(3, 5, 4); FX.add(fxKey, fxKey.target);
const fxRim = new THREE.DirectionalLight(0x6fa8ff, 1.5); fxRim.position.set(-4, 2, -3); FX.add(fxRim);
const fxBack = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), new THREE.MeshBasicMaterial({ color: 0x0d1014 })); fxBack.position.set(0, 5, -6); FX.add(fxBack);

// =====================================================================================================================
// REPOUSSÉ WORKSHOP (Paris, 1880s): a carved wooden mould, a heated copper sheet hammered over it by a wooden mallet
// =====================================================================================================================
const WS = new THREE.Group(); WS.position.set(13000, 0, 0); scene.add(WS); WS.visible = false;
const WP = (x, y, z) => WS.position.clone().add(V(x, y, z));
const woodM = new THREE.MeshStandardMaterial({ map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 2), normalMap: tex("kit/ph/wood_table_001/wood_table_001_nor_gl_1k.jpg", false, 2, 2), roughness: 0.7, color: 0xd8b48a });
const moldH = (x, z) => 0.14 * Math.sin(x * 2.6 + 0.4) + 0.06 * Math.sin(x * 7.0 + z * 1.5) + 0.05 * Math.cos(z * 3.1) - 0.02 * x * x;   // a fold of her robe, carved in wood
{ const g = new THREE.PlaneGeometry(2.4, 1.6, 120, 80); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, moldH(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const mold = sh(new THREE.Mesh(g, woodM)); mold.position.y = 0.9; WS.add(mold);
  const base = sh(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.6), woodM)); base.position.y = 0.42; WS.add(base); }
const SH_G = new THREE.PlaneGeometry(2.0, 1.3, 100, 65); SH_G.rotateX(-Math.PI / 2); const SH0 = SH_G.attributes.position.array.slice();
const hotCopper = new THREE.MeshPhysicalMaterial({ color: 0xc8764a, metalness: 1, roughness: 0.32, side: THREE.DoubleSide, emissive: 0xff5a10, emissiveIntensity: 0 });
const SHT = sh(new THREE.Mesh(SH_G, hotCopper)); SHT.position.y = 0.9; WS.add(SHT);
const HITS = Array.from({ length: 60 }, (_, i) => ({ x: -0.85 + (i % 10) * 0.19 + (hash(i) - 0.5) * 0.08, z: -0.5 + Math.floor(i / 10) * 0.2 + (hash(i + 1) - 0.5) * 0.06 }));
const HIT_DT = 0.42;
/** form the sheet over the mould: k = how many hits have landed (fractional) */
function hammer(k) { const p = SH_G.attributes.position; const n = Math.min(HITS.length, Math.floor(k));
  for (let i = 0; i < p.count; i++) { const x = SH0[i * 3], z = SH0[i * 3 + 2]; let f = 0; for (let j = 0; j < n; j++) { const h = HITS[j]; f += Math.exp(-((x - h.x) ** 2 + (z - h.z) ** 2) / 0.02); }
    const dent = n ? 0.004 * Math.sin(x * 60) * Math.sin(z * 60) * Math.min(1, f) : 0; const top = 0.32;
    p.setY(i, lerp(top, moldH(x, z) + 0.006 + dent, Math.min(1, f * 0.9))); }
  p.needsUpdate = true; SH_G.computeVertexNormals(); }
// the mallet (wooden, as the repoussé craftsmen used); swings down onto the next spot
const MALLET = new THREE.Group(); WS.add(MALLET);
{ const head = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 24), woodM)); head.rotation.z = Math.PI / 2; MALLET.add(head);
  const handle = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.75, 12), woodM)); handle.position.set(0, 0.38, 0); MALLET.add(handle); }
function mallet(t, t0) { const k = (t - t0) / HIT_DT; const i = Math.max(0, Math.floor(k)), ph = k - i; const h = HITS[Math.min(i, HITS.length - 1)];
  const lift = ph < 0.7 ? Math.sin((ph / 0.7) * Math.PI * 0.5) : Math.cos(((ph - 0.7) / 0.3) * Math.PI * 0.5);
  const y = 0.9 + moldH(h.x, h.z) + 0.09 + lift * 0.45; MALLET.position.copy(WP(h.x + lift * 0.12, y, h.z + lift * 0.25)); MALLET.rotation.set(-lift * 0.9, 0, 0); return k; }
// the workshop: forge glow, giant plaster pieces (her index finger: 2.44 m), timber, dust in the light
const forgeL = new THREE.PointLight(0xff6a20, 0, 9, 2); forgeL.position.copy(V(-2.2, 1.2, -1.5)); WS.add(forgeL);
const forge = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), glow(0xff5a10, 2.2)); forge.position.set(-2.4, 0.9, -1.8); forge.scale.set(1.4, 0.5, 1); WS.add(forge);
const plaster = matte(0xe8e2d6, 0.95);
const finger = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 2.44 - 0.9, 8, 24), plaster)); finger.rotation.z = Math.PI / 2 - 0.1; finger.position.set(1.4, 0.5, -2.3); WS.add(finger);
const nail = sh(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), plaster)); nail.scale.set(1, 0.4, 0.8); nail.position.set(2.55, 0.68, -2.3); WS.add(nail);
const wsFloor = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: tex("kit/ph/concrete_wall_008/concrete_wall_008_diff_1k.jpg", true, 4, 4), color: 0x8a7a68, roughness: 0.95 })), false, true); wsFloor.rotation.x = -Math.PI / 2; WS.add(wsFloor);
const wsWall = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshStandardMaterial({ map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, 4, 2), color: 0x9a8a78, roughness: 0.95 })), false, true); wsWall.position.set(0, 3.5, -3.5); WS.add(wsWall);
for (let i = 0; i < 5; i++) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 14), woodM)); b.position.set(-4 + i * 2, 5, 0); WS.add(b); }
const wsKey = new THREE.SpotLight(0xffe2b8, 140, 16, 0.6, 0.6, 1.5); wsKey.position.set(2.5, 5.5, 2.5); wsKey.target.position.set(0, 0.9, 0); WS.add(wsKey, wsKey.target); wsKey.castShadow = true;
const DUST = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.1), transparent: true, opacity: 0.5, toneMapped: false }), 300); DUST.frustumCulled = false; WS.add(DUST);
function dust(t) { const m4 = new THREE.Matrix4(); for (let i = 0; i < 300; i++) { const s = 0.003 + hash(i) * 0.004; m4.compose(V((hash(i + 1) - 0.5) * 4 + Math.sin(t * 0.2 + i) * 0.1, 0.5 + hash(i + 2) * 3 + Math.sin(t * 0.13 + i * 3) * 0.1, (hash(i + 3) - 0.5) * 3), new THREE.Quaternion(), V(s, s, s)); DUST.setMatrixAt(i, m4); } DUST.instanceMatrix.needsUpdate = true; }

// =====================================================================================================================
// ORBI: a bench on the ferry pier, Liberty across the water; the file is locked on the phone before it leaves,
// scrambled blocks travel to a server that can't read them; unlocked on the laptop
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;

LIB.updateMatrixWorld(true);
{ const p = V(-55, 0, 172).applyAxisAngle(V(0, 1, 0), LIB.rotation.y); OR.position.set(p.x, 1.1, p.z); const d = V(0, 40, 0).sub(OR.position).setY(0).normalize(); OR.rotation.y = Math.atan2(-d.x, -d.z); }
const lock = makeLock(); OR.add(lock);
const ledge = sh(new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.4, 1.8, 3, 0.08), new THREE.MeshStandardMaterial({ map: tex("kit/ph/old_sandstone_02/old_sandstone_02_diff_1k.jpg", true, 2, 1), roughness: 0.85, color: 0xcfc6ba }))); ledge.position.set(0.2, -0.25, 0); OR.add(ledge);
lap.g.position.set(-1.0, 0, 0.1); lap.g.rotation.y = 0.3; ph.g.position.set(1.4, 0.06, 0.4); ph.g.rotation.set(-Math.PI / 2 + 0.5, 0, -0.2);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); OR.add(orbiL);
// scrambled blocks: little cubes with random hex on them
const hexTex = canvasHex(); function canvasHex() { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#06120c"; g.fillRect(0, 0, 256, 256); g.font = "700 30px M"; g.fillStyle = "#3dff8c"; H.reseed(9);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) g.fillText(Math.floor(H.rnd() * 256).toString(16).padStart(2, "0"), 14 + x * 62, 36 + y * 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const PARTS = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.16, 2, 0.02), new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) })); OR.add(m); return m; });
// the server: a rack in the distance (on the ledge's far end) whose screen shows only scrambled bytes
const RACK = new THREE.Group(); RACK.position.set(3.6, -0.05, -1.6); OR.add(RACK);
{ const body = sh(new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.9, 0.8, 3, 0.04), metal(0x22262b, 0.4))); body.position.y = 0.95; RACK.add(body);
  for (let i = 0; i < 10; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.02), metal(0x30353b, 0.35)); u.position.set(0, 0.25 + i * 0.16, 0.41); RACK.add(u);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glow(i % 3 ? 0x3dff8c : 0x6fd0ff, 3)); led.position.set(0.33, 0.25 + i * 0.16, 0.425); RACK.add(led); } }
const rackScr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false })); rackScr.position.set(0, 2.2, 0.1); RACK.add(rackScr);
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (st.got > 0) { g.fillStyle = "rgba(8,10,14,.9)"; rr(g, 60, 690, 860, 170, 26); g.fill(); g.fillStyle = "#fff"; g.font = "700 32px M"; g.fillText("liberty-island.zip  ·  2.4 GB", 96, 742);
    g.fillStyle = green; rr(g, 96, 772, 780 * Math.min(1, st.got), 28, 10); g.fill(); g.font = "700 28px M"; g.fillText(st.got >= 1 ? "✓ UNLOCKED ON THIS DEVICE" : `RECEIVING ${Math.round(st.got * 100)}%`, 96, 846); } }
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (st.lock > 0) { g.fillStyle = "rgba(8,10,14,.9)"; rr(g, 70, 1160, 640, 200, 30); g.fill(); g.fillStyle = green; g.font = "800 40px M"; g.fillText(st.lock >= 1 ? "🔒 LOCKED ON THIS PHONE" : `LOCKING ${Math.round(st.lock * 100)}%`, 110, 1235);
    g.fillStyle = "#cfd6dd"; g.font = "700 30px M"; g.fillText("AES-256 · before it leaves", 110, 1300); } }
