
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { SPACE.visible = s === "space"; FLOW.visible = s === "space"; OCEAN.visible = s === "ocean"; CHUTES.visible = s === "ocean"; MUS.visible = s === "museum"; HC.visible = s === "shield";
  scene.fog = s === "ocean" ? OFOG : null; scene.background = s === "shield" ? new THREE.Color(0x07080a) : s === "museum" ? new THREE.Color(0x050607) : null;
  CAP.visible = s !== "shield"; }
function plasma(i, wake = i, spark = i) { PU.uI.value = i; PU.uWake.value = wake; SPARK.visible = spark > 0.01; FLOW.userData.shock.visible = FLOW.userData.layer.visible = i > 0.001; FLOW.userData.wake.visible = wake > 0.001; }
function lightSpace(heat) { H.key.color.set(0xfff4e6); H.key.intensity = 3.4; H.key.position.copy(CAP.position).addScaledVector(SUN_S, 30); H.key.target.position.copy(CAP.position);
  const s = H.key.shadow.camera; Object.assign(s, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 80 }); s.updateProjectionMatrix();
  H.hemi.color.set(0x4a6a9a); H.hemi.groundColor.set(0x6a8ab0); H.hemi.intensity = 0.35; H.envK.value = 0.35 + 0.6 * CU.uSilver.value; H.rimA.intensity = 0.25; H.rimB.intensity = 0;
  capLight.intensity = 0; H.key.intensity *= 1 - heat * 0.5; }
function lightMuseum() { H.key.intensity = 0.0; H.hemi.color.set(0x6a7890); H.hemi.groundColor.set(0x101012); H.hemi.intensity = 0.25; H.envK.value = 0.5; H.rimA.intensity = 0.35; H.rimB.intensity = 0.25; }
function lightOcean() { H.key.color.set(0xffcf9e); H.key.intensity = 3.0; H.key.position.copy(CAP.position).addScaledVector(SKYS, 40); H.key.target.position.copy(CAP.position);
  const s = H.key.shadow.camera; Object.assign(s, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 120 }); s.updateProjectionMatrix();
  H.hemi.color.set(0xa9c2e6); H.hemi.groundColor.set(0x2a3a44); H.hemi.intensity = 0.8; H.envK.value = 0.45; H.rimA.intensity = 0.3; H.rimB.intensity = 0.2; }
const shake = (t, a) => { H.cam.position.x += Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6; H.cam.position.y += Math.sin(t * 53 + 1) * a; };
const TRAVEL = V(0, -0.12, -1).normalize();
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

H.frame("Resumes where it stopped. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); capReset(); BAGS.visible = false; SL.visible = false; RINGS.forEach((r) => (r.visible = false)); PU.uWire.value = 0; PU.uT.value = t; CU.uT.value = t; EU.uT.value = t; EU.uGlow.value = 0;
  H.zoom = 1; H.bloom.strength = 0.35; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 20000); OR.visible = false; SPRAY.visible = false; foam.visible = false; EARTH.visible = atmo.visible = true;
  H.key.castShadow = true;

  if (t < at("real")) { // HOOK: silver Columbia falling towards the Pacific; then the fireball
    sets("space"); const c = fr("hook", 0.5);
    if (t < c) { flowSet(V(0, 0, 0), TRAVEL); CU.uSilver.value = 1; plasma(0); lightSpace(0);
      move(t, 0, c, [FW(-8, -15, -7), FW(0, 0.8, 0.6), 30], [FW(-7, -13.5, -6), FW(0, 0.9, 0.5), 30], 0.05); earthAt(250, 12, -160, 0.3);
      title(t, fr("hook", 0.05), c, "July 1969", "Coming home from the Moon", 150); }
    else { flowSet(V(0, 0, 0), TRAVEL); CU.uSilver.value = 0; CU.uHeat.value = 1; plasma(1, 1, 1); sparks(t, 1); lightSpace(1); winGlow.opacity = 0.5; H.bloom.strength = 0.7;
      move(t, c, at("real"), [FW(-13, -30, -11), FW(0, 9, 0), 40], [FW(-11, -26, -9.5), FW(0, 9, 0), 40], 0.1); shake(t, 0.03); earthAt(70, 12, -165, 0.3); EU.uGlow.value = 1; EU.uGlowP.value.copy(CAP.position); }
  } else if (t < at("speed")) { // THE REAL ONE: the Smithsonian scan in a dark gallery; then cut open: three seats
    sets("museum"); lightMuseum(); dust(t); H.key.castShadow = false;
    if (t < at("small")) { const a = -0.6 + (t - at("real")) * 0.12; move(t, at("real"), at("small"), [V(Math.sin(a) * 12.5, 2.6, Math.cos(a) * 12.5), V(0, 1.2, 0), 34], [V(Math.sin(a + 0.1) * 11.5, 2.3, Math.cos(a + 0.1) * 11.5), V(0, 1.2, 0), 34], 0);
      title(t, fr("real", 0.05), fr("real", 0.55), "The real Apollo 11 capsule", "Columbia", 150); callout("scan", t, fr("real", 0.5), at("small"), CL(-1.2, 1.6, 1.0), 300, 1150); }
    else { const op = smooth(prog(t, fr("small", 0.35), fr("small", 0.6))); INT.visible = op > 0; CU.uSec.value = 1; CUT.normal.set(-1, 0, 0); CUT.constant = lerp(2.4, 0.05, op);
      const k = fr("small", 0.4);
      if (t < k) move(t, at("small"), k, [V(7.5, 1.6, 4.5), V(0, 1.1, 0), 34], [V(7.0, 1.7, 3.8), V(0, 1.1, 0), 34], 0);
      else move(t, k, at("speed"), [V(5.8, 2.2, 1.8), V(0, 1.15, 0), 40], [V(4.4, 2.4, 1.1), V(0, 1.2, 0), 44], 0);
      hudShow("stats", win(t, fr("small", 0.05), fr("small", 0.45))); callout("seats", t, fr("small", 0.62), at("speed"), CL(0, 1.25, 0.25), 300, 1150); }
  } else if (t < at("blunt")) { // RE-ENTRY: 11 km/s; the air can't get out of the way → plasma
    sets("space"); flowSet(V(0, 0, 0), TRAVEL); lightSpace(0.5); earthAt(110, 11, -166, 0.3);
    if (t < at("air")) { const k = smooth(prog(t, at("speed"), end("speed"))); CU.uHeat.value = k * 0.7; plasma(k * 0.7, k * 0.6, k * 0.5); sparks(t, k * 0.5); winGlow.opacity = k * 0.3; EU.uGlow.value = k; EU.uGlowP.value.copy(CAP.position);
      move(t, at("speed"), at("air"), [FW(-10, -17, -5), FW(0, 1.5, 0), 36], [FW(-9, -15, -4.5), FW(0, 1.3, 0), 36], 0.05); shake(t, 0.01 * k);
      setBig("11 km/s", "≈ 40,000 KM/H"); hudShow("big", win(t, fr("speed", 0.15), at("air"))); }
    else { CU.uHeat.value = 1; plasma(1, 1, 1); sparks(t, 1); winGlow.opacity = 0.5; H.bloom.strength = 0.65; EU.uGlow.value = 1; EU.uGlowP.value.copy(CAP.position);
      move(t, at("air"), at("blunt"), [FW(-5.5, -10, -3.5), FW(0, 0.2, 0), 38], [FW(-4.8, -8.8, -3.1), FW(0, 0.2, 0), 38], 0.05); shake(t, 0.02);
      callout("plasma", t, fr("air", 0.45), at("blunt"), FW(-0.4, -0.45, 0.6), 760, 1150); }
  } else if (t < at("shield")) { // BLUNT: the shock stands off the shield; the hot layer keeps most heat in the air
    sets("space"); flowSet(V(0, 0, 0), TRAVEL); lightSpace(0.6); earthAt(95, 11, -166, 0.3); EARTH.visible = atmo.visible = false;
    CU.uHeat.value = 0.7; plasma(0.55, 0.35, 0.2); sparks(t, 0.2); SL.visible = true; streamlines(t, smooth(prog(t, at("blunt"), fr("blunt", 0.2)))); PU.uWire.value = smooth(prog(t, fr("blunt", 0.15), fr("blunt", 0.4)));
    move(t, at("blunt"), at("shield"), [FW(0, 1.8, -17), FW(0, 1.8, 0), 40], [FW(0, 1.6, -15.5), FW(0, 1.6, 0), 40], 0.03); H.cam.up.copy(V(0, 1, 0).applyQuaternion(FLOW.quaternion)); H.cam.lookAt(FW(0, 1.7, 0));
    callout("hs", t, fr("blunt", 0.05), fr("blunt", 0.4), FW(0.9, -0.05, 0), 300, 1030); callout("shock", t, fr("blunt", 0.3), at("shield"), FW(2.4, SHOCK_Y + SHOCK_K * 5.76, 0), 760, 900); callout("layer", t, fr("blunt", 0.6), at("shield"), FW(-0.8, -0.38, 0), 300, 1150);
  } else if (t < at("silver")) { // THE HEAT SHIELD, magnified: honeycomb + Avcoat; then it chars and melts away
    sets("shield"); H.key.intensity = 1.2; H.key.position.set(4, 6, 1); H.key.target.position.set(0, 0, 0); H.hemi.intensity = 0.5; H.hemi.color.set(0xd8d0c8); H.hemi.groundColor.set(0x302820); H.envK.value = 0.15; H.rimA.intensity = 0; H.rimB.intensity = 0.3; H.key.castShadow = false;
    if (t < at("burn")) { shieldCells(0, 0, true); HU.uHot.value = 0; hcLight.intensity = 0; flakes(t, 0);
      move(t, at("shield"), at("burn"), [V(1.05, 0.14, 0.3), V(-0.2, -0.25, 0.0), 40], [V(0.95, 0.1, 0.26), V(-0.2, -0.25, 0.0), 40], 0.01);
      callout("honey", t, fr("shield", 0.2), at("burn"), V(0.05, 0.0, 0.25), 300, 1150); callout("avc", t, fr("shield", 0.5), at("burn"), V(0.0, -0.2, 0.0), 760, 1240); callout("steel", t, fr("shield", 0.65), at("burn"), V(0.05, -0.53, 0.3), 300, 1330); hudShow("thick", win(t, fr("shield", 0.3), at("burn"))); }
    else { const k = prog(t, at("burn"), at("silver")); shieldCells(0.15 + k * 0.85, k * 0.12, true); HU.uHot.value = 1; HU.uT.value = t; hcLight.intensity = 2.5; flakes(t, 1); H.bloom.strength = 0.6;
      move(t, at("burn"), at("silver"), [V(1.0, 0.16, 0.28), V(-0.2, -0.22, 0.0), 40], [V(0.9, 0.12, 0.24), V(-0.2, -0.22, 0.0), 40], 0.02);
      callout("char", t, fr("burn", 0.25), at("silver"), V(0.05, -0.08, 0.1), 300, 1150); callout("away", t, fr("burn", 0.55), at("silver"), V(0.3, 0.3, 0.0), 760, 1000); hudShow("hot", win(t, fr("burn", 0.1), fr("burn", 0.5))); }
  } else if (t < at("blackout")) { // SILVER → SCORCHED: the heat sweeps over the Mylar
    sets("space"); EARTH.visible = atmo.visible = true; flowSet(V(0, 0, 0), TRAVEL); lightSpace(0); earthAt(300, 12, -160, 0.3);
    const k = smooth(prog(t, fr("silver", 0.3), fr("silver", 0.75))); CU.uSilver.value = 1 - k; const pk = Math.sin(Math.PI * clamp(k * 1.05)); CU.uHeat.value = pk; plasma(pk * 0.8, pk * 0.5, pk * 0.5); sparks(t, pk * 0.5);
    move(t, at("silver"), at("blackout"), [FW(-9, -13, -6), FW(0, 1.0, 0), 32], [FW(-8.2, -12, -5.4), FW(0, 1.1, 0), 32], 0.02);
    hudShow("silver", win(t, fr("silver", 0.05), at("blackout")));
  } else if (t < at("g")) { // BLACKOUT: radio rings die in the sheath; the clock runs ~3 minutes
    sets("space"); flowSet(V(0, 0, 0), TRAVEL); lightSpace(0.8); earthAt(85, 12, -167, 0.3); CU.uHeat.value = 1; plasma(1, 1, 1); sparks(t, 1); winGlow.opacity = 0.5; H.bloom.strength = 0.6; EU.uGlow.value = 1; EU.uGlowP.value.copy(CAP.position);
    radio(t, 1, true);
    const c = fr("blackout", 0.55);
    if (t < c) move(t, at("blackout"), c, [FW(-12, -22, -6), FW(0, 3, 0), 38], [FW(-11, -20, -5.5), FW(0, 3, 0), 38], 0.05);
    else move(t, c, at("g"), [FW(-30, -45, -22), FW(0, 12, 0), 40], [FW(-34, -50, -25), FW(0, 14, 0), 40], 0.05);
    callout("ant", t, fr("blackout", 0.15), fr("blackout", 0.5), FW(-3.6, 1.4, 0), 300, 1150);
    H.$("nsT").textContent = fmt(lerp(0, 180, clamp(prog(t, fr("blackout", 0.1), fr("blackout", 0.95))))); hudShow("nosig", win(t, fr("blackout", 0.05), at("g")));
  } else if (t < at("chutes")) { // 6.5 g: the cabin cut open in flight, lit through the windows by the fireball
    sets("space"); flowSet(V(0, 0, 0), TRAVEL); lightSpace(0.9); earthAt(60, 12, -168, 0.3); CU.uHeat.value = 1; plasma(1, 1, 1); sparks(t, 1); H.bloom.strength = 0.55;
    INT.visible = true; CU.uSec.value = 1; const nrm = V(1, 0, 0).applyQuaternion(CAP.quaternion).negate(); CUT.setFromNormalAndCoplanarPoint(nrm, CAP.position.clone()); winGlow.opacity = 0.6; capLight.intensity = 2.5; PU.uI.value = 0.5; PU.uWake.value = 0.3; sparks(t, 0.3);
    move(t, at("g"), at("chutes"), [CL(6.2, 1.6, 1.4), CL(0, 1.2, 0), 44], [CL(5.2, 1.5, 1.1), CL(0, 1.25, 0), 44], 0.02); H.cam.up.copy(V(0, 1, 0).applyQuaternion(CAP.quaternion)); H.cam.lookAt(CL(0, 1.22, 0)); shake(t, 0.012 + 0.02 * smooth(prog(t, at("g"), fr("g", 0.6))));
    setBig(`${lerp(1, 6.5, smooth(prog(t, fr("g", 0.1), fr("g", 0.75)))).toFixed(1)} g`, "PRESSED INTO THE SEATS", "#ff7a5c"); hudShow("big", win(t, fr("g", 0.05), at("chutes")));
  } else if (t < at("splash")) { // PARACHUTES over the Pacific at dawn: 2 drogues, then 3 mains
    sets("ocean"); const dro = t < fr("chutes", 0.42); const alt = dro ? 2600 : 900;
    CAP.position.set(0, alt - (t - at("chutes")) * (dro ? 50 : 10), 0); CAP.rotation.set(Math.sin(t * 0.9) * 0.06, t * 0.1, Math.sin(t * 0.7) * 0.05); CAP.updateMatrixWorld(true); lightOcean();
    chutes(dro ? "drogue" : "main", dro ? smooth(prog(t, at("chutes"), fr("chutes", 0.15))) : smooth(prog(t, fr("chutes", 0.43), fr("chutes", 0.62))), t); sea.material.uniforms.time.value = t * 0.5; sea.material.uniforms.uWT.value = t;
    camRange(0.1, 20000);
    if (dro) move(t, at("chutes"), fr("chutes", 0.42), [CL(9, -7, 10), CL(0, 6, 0), 44], [CL(8, -6, 9), CL(0, 7, 0), 44], 0.1);
    else move(t, fr("chutes", 0.42), at("splash"), [CL(14, -22, 26), CL(0, 16, 0), 50], [CL(13, -18, 24), CL(0, 18, 0), 50], 0.1);
    callout("drg", t, fr("chutes", 0.12), fr("chutes", 0.42), CL(0, 2.74 + 14 + 5, 0), 760, 700); callout("mn", t, fr("chutes", 0.6), at("splash"), MAINS[0].position, 760, 600);
  } else if (t < at("orbi")) { // SPLASHDOWN at ~35 km/h, upside down, righted by three bags
    sets("ocean"); lightOcean(); sea.material.uniforms.time.value = t * 0.5; sea.material.uniforms.uWT.value = t; const sx = 0, sz = 0; const wy = seaY(sx, sz, t);
    const hit = fr("splash", 0.55); camRange(0.1, 20000);
    if (t < at("flip")) {
      const y = t < hit ? wy - 0.9 + (hit - t) * 9.7 : wy - 0.9 + Math.sin((t - hit) * 6) * Math.exp(-(t - hit) * 2.5) * 0.4;
      CAP.position.set(sx, y, sz); CAP.rotation.set(t < hit ? Math.sin(t) * 0.05 : 0.08 + (t - hit) * 0.1, 0.6, 0); CAP.updateMatrixWorld(true);
      chutes("main", t < hit + 0.3 ? 1 : clamp(1 - (t - hit - 0.3) * 0.6), t); CHUTES.visible = t < hit + 2; SPRAY.visible = t > hit; spray(t, hit, V(sx, wy, sz)); foam.visible = t > hit; foam.position.set(sx, wy + 0.05, sz); foam.material.uniforms.uK.value = clamp((t - hit) * 2); foam.material.uniforms.uT.value = t;
      if (t < hit) move(t, at("splash"), hit, [V(12, 3, 18), V(0, 8, 0), 44], [V(11, 2.5, 16), V(0, 3, 0), 44], 0.1);
      else move(t, hit, at("flip"), [V(9, 1.6, 13), V(0, 0.6, 0), 42], [V(8.4, 1.6, 12.2), V(0, 0.6, 0), 42], 0.15);
      hudShow("date", win(t, fr("splash", 0.05), at("flip"))); }
    else { CHUTES.visible = false; const up = smooth(prog(t, fr("flip", 0.4), fr("flip", 0.95))); bags(smooth(prog(t, fr("flip", 0.15), fr("flip", 0.5))));
      // Stable 2 (apex down) → Stable 1 (apex up), floating with ~1 m of the shield under water
      const ang = lerp(Math.PI * 0.94, 0.06, up); CAP.rotation.set(ang + Math.sin(t * 1.1) * 0.03, 0.6, Math.sin(t * 0.8) * 0.03); CAP.position.set(sx, wy + lerp(-0.9, 1.05, (1 - Math.cos(ang)) / 2) - Math.sin(ang) * 0.5, sz); CAP.updateMatrixWorld(true);
      foam.visible = true; foam.position.set(sx, wy + 0.05, sz); foam.material.uniforms.uK.value = 0.5; foam.material.uniforms.uT.value = t;
      move(t, at("flip"), at("orbi"), [V(7.5, 2.4, 10.5), V(0, 0.5, 0), 38], [V(7.0, 2.3, 9.8), V(0, 0.7, 0), 38], 0.15);
      H.$("flT").textContent = up > 0.6 ? "UPRIGHT" : "UPSIDE DOWN"; H.$("flT").style.color = up > 0.6 ? "#3dff8c" : "#ff9a5c"; hudShow("flip", win(t, fr("flip", 0.05), at("orbi")));
      callout("bag", t, fr("flip", 0.8), at("orbi"), CL(0, CAP_H + 0.6, 0), 760, 1150); }
  } else { // ORBI: in the gallery; upload → drop at 62 % → resumes with only the missing parts → the laptop gets it
    sets("museum"); lightMuseum(); dust(t); OR.visible = true; H.key.castShadow = false; orbiL.intensity = 0.5; OR.updateMatrixWorld(true); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const tDrop = fr("orbi2", 0.28), tRes = fr("orbi2", 0.55), tEnd = fr("orbi3", 0.2);
    const sentA = Math.floor(lerp(4, DROP_AT, clamp(prog(t, at("orbi"), tDrop)))); const sentB = Math.floor(lerp(DROP_AT, NPART, clamp(prog(t, tRes, tEnd))));
    const drop = t >= tDrop && t < tRes, resumed = t >= tRes; const sent = t < tDrop ? sentA : drop ? DROP_AT : sentB;
    const st = { on: 1, sent, drop: drop ? 1 : 0, resumed: resumed ? 1 : 0, lost: drop ? 1 : 0 };
    screen(ph, st, drawPhone); screen(rackDev, st, drawRack); screen(lap, { got: Math.round(clamp(prog(t, fr("orbi3", 0.15), fr("orbi3", 0.9))) * 40) / 40 }, drawLap);
    const a0 = ph.g.position.clone().add(V(0, 0.35, 0)), s0 = RACK.position.clone().add(V(0, 2.4, 0.4));
    PARTS.forEach((m, i) => { m.visible = false; m.material = partMat;
      if (i < NPART) { const st0 = i < DROP_AT ? lerp(at("orbi"), tDrop, (i - 4) / (DROP_AT - 4)) - 0.6 : lerp(tRes, tEnd, (i - DROP_AT) / (NPART - DROP_AT)) - 0.6; const k = clamp((t - st0) / 0.6);
        if (i >= 4 && k > 0 && k < 1) { m.visible = true; m.position.copy(a0).lerp(s0, ease(k)).add(V(0, Math.sin(k * Math.PI) * 0.9, 0)); m.rotation.set(t * 2 + i, t * 1.5, 0); } }
      else if (drop) { const j = i - NPART; const k = clamp((t - tDrop) / 0.9); m.visible = k < 1; m.material = lostMat; lostMat.opacity = 1 - k; m.position.copy(a0).lerp(s0, 0.4 + j * 0.15).add(V(0, 0.7 - k * k * 1.2, 0)); m.rotation.set(t * 4 + i, t * 3, 0); } });
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.3, 2.3, 7.8), OW(0.2, 1.0, -2.5), 44], [OW(0.4, 2.1, 7.0), OW(0.2, 1.0, -2.5), 44], 0.2);
    else if (t < at("orbi3")) { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, at("orbi2"), at("orbi3"), [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 36], [OW(...pc.clone().addScaledVector(pn, 2.8).toArray()), OW(...pc.toArray()), 36], 0.02);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); }
    else { move(t, at("orbi3"), at("end"), [OW(0.3, 2.2, 7.4), OW(0.2, 1.0, -2.0), 44], [OW(0.4, 2.0, 6.8), OW(0.2, 1.0, -2.0), 44], 0.2); callout("srv", t, fr("orbi3", 0.05), fr("orbi3", 0.7), RACK.localToWorld(V(0, 2.6, 0.2)), 760, 900); hudShow("chips", win(t, fr("orbi3", 0.3), at("end"))); }
  }
  if (window.DBG && window.DBG[2]) { const off = window.DBG[2].split(","); const M = { earth: EARTH, atmo, shock: FLOW.userData.shock, layer: FLOW.userData.layer, wake: FLOW.userData.wake, spark: SPARK, cap: CAP, win: null };
    for (const k of off) { if (M[k]) M[k].visible = false; if (k === "bloom") H.bloom.strength = 0; if (k === "win") winGlow.opacity = 0; if (k === "heat") CU.uHeat.value = 0; } }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
