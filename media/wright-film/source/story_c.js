
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { KH.visible = s === "kh"; WT.visible = s === "wt"; LF.visible = s === "lf"; MUS.visible = s === "mus"; FLY.visible = s === "kh" || s === "mus";
  scene.fog = s === "kh" ? KFOG : null; scene.background = s === "lf" ? new THREE.Color(0x07090c) : null; }
function lightKH(c, r = 14) { H.key.color.set(0xfff1dc); H.key.intensity = 3.1; H.key.position.copy(c).addScaledVector(SUN, r * 3); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 7 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = 0.03;
  H.hemi.color.set(0xc6d6ea); H.hemi.groundColor.set(0x9a8a70); H.hemi.intensity = 0.9; H.envK.value = 0.45; H.rimA.intensity = 0.2; H.rimB.intensity = 0.15; H.key.castShadow = true; }
function lightIn(k = 0.3) { H.key.intensity = k; H.key.castShadow = false; H.hemi.color.set(0xb0a490); H.hemi.groundColor.set(0x302418); H.hemi.intensity = 0.7; H.envK.value = 0.3; H.rimA.intensity = 0.15; H.rimB.intensity = 0.2; }
function flyAt(p, pitch = 0, yaw = 0, roll = 0) { FLY.position.copy(p); FLY.rotation.set(-pitch, yaw, roll); FLY.updateMatrixWorld(true); }
function onRail(z) { flyAt(V(0, 0.22, z)); DOLLY.position.set(0, 0, z); DOLLY.visible = true; }
const linesOff = () => { [L120, L747, ...FLIGHTS].forEach((l) => { l.visible = false; l.scale.x = 1; }); };
const grow = (l, k) => { l.visible = k > 0; l.material.uniforms.uK.value = k; };

H.frame("Private Spaces. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.25; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 20000);
  FU.uWarp.value = 0; FU.uRud.value = 0; FU.uElev.value = 0; props(t, 0); linesOff(); DOLLY.visible = false; SAND.visible = true; PUFF.visible = false;
  SU.uT.value = t; skyU.uCold.value = 1; WTU.uT.value = t; LU.uT.value = t; sea.material.uniforms.time.value = t * 0.3; OR.visible = false; ROOM.visible = false; OUT.forEach((p) => (p.g.visible = false));

  if (t < at("real")) { // HOOK: the Flyer skimming the dunes; then from above: the whole flight fits inside a jumbo jet's wings
    sets("kh"); const c = fr("hook", 0.55);
    if (t < c) { const u = 0.25 + 0.35 * prog(t, 0, c); const f = flight1(u); flyAt(f.p, f.pitch); FU.uElev.value = -f.pitch * 1.5; props(t, 5.85); lightKH(f.p); sandWind(t, f.p, 1);
      move(t, 0, c, [f.p.clone().add(V(-13, 0.6, -6)), f.p.clone().add(V(0, 1.2, 1)), 34], [f.p.clone().add(V(-11, 0.8, -3)), f.p.clone().add(V(0, 1.2, 1.5)), 34], 0.15);
      title(t, fr("hook", 0.05), c, "17 December 1903", "The first flight", 150); }
    else { const f = flight1(1); flyAt(V(0, 0.02, f.p.z), 0.02); lightKH(V(0, 0, TAKEOFF_Z + 30), 40); sandWind(t, V(0, 0, TAKEOFF_Z + 25), 0.8, 40);
      grow(L120, smooth(prog(t, c, c + 1.0))); grow(L747, smooth(prog(t, c + 0.8, c + 2.0)));
      L120.scale.x = L747.scale.x = 3; move(t, c, at("real"), [V(-3, 100, TAKEOFF_Z + 27), V(1, 0, TAKEOFF_Z + 30), 40], [V(-3, 92, TAKEOFF_Z + 28), V(1, 0, TAKEOFF_Z + 30), 40], 0.05); H.cam.up.set(0, 0, 1); H.cam.lookAt(V(1, 0, TAKEOFF_Z + 30)); H.cam.updateMatrixWorld();
      callout("f1", t, c + 0.4, at("real"), V(0, 0, TAKEOFF_Z + 18), 300, 1150); callout("jet", t, c + 1.3, at("real"), V(2.2, 0, TAKEOFF_Z + 50), 760, 420); }
  } else if (t < at("engine")) { // THE REAL ONE, at the camp: then what it's made of
    sets("kh"); onRail(RAIL_Z0 + 1.0); lightKH(V(0, 1, 0)); sandWind(t, V(0, 0, 0), 0.6);
    if (t < at("build")) { const a = 2.2 + (t - at("real")) * 0.1; move(t, at("real"), at("build"), [V(Math.sin(a) * 19, 4.5, Math.cos(a) * 19), V(0, 1.3, 0), 34], [V(Math.sin(a + 0.12) * 17.5, 4.0, Math.cos(a + 0.12) * 17.5), V(0, 1.3, 0), 34], 0.05);
      title(t, fr("real", 0.05), fr("real", 0.5), "The real 1903 machine", "Wright Flyer", 150); callout("scan", t, fr("real", 0.5), at("build"), FL(-4.5, 2.4, 0.3), 300, 1150); }
    else { const c = fr("build", 0.42);
      if (t < c) { move(t, at("build"), c, [FL(9, 6.5, 15), FL(0, 1.2, 0), 36], [FL(8, 6.0, 13.5), FL(0, 1.2, 0), 36], 0.05); hudShow("stats", win(t, fr("build", 0.05), c)); }
      else { move(t, c, at("engine"), [FL(-6.2, 1.6, 5.2), FL(-3.6, 1.2, 0.1), 38], [FL(-5.8, 1.6, 4.7), FL(-3.6, 1.2, 0.1), 38], 0.02);
        callout("spruce", t, c + 0.2, at("engine"), FL(-3.95, 1.3, 0.55), 300, 1000); callout("ash", t, c + 0.9, at("engine"), FL(-3.3, 2.2, -0.3), 760, 760); callout("muslin", t, c + 1.6, at("engine"), FL(-3.0, 0.48, 0.2), 760, 1200); } }
  } else if (t < at("tunnel")) { // THE ENGINE, then the chain drive and two counter-rotating propellers
    sets("kh"); onRail(RAIL_Z0 + 1.0); lightKH(V(0, 1, 0), 6); sandWind(t, V(0, 0, 0), 0.6);
    if (t < at("props")) { move(t, at("engine"), at("props"), [FL(-0.9, 1.9, 3.3), FL(-0.33, 0.95, 0.05), 34], [FL(-0.8, 1.8, 2.9), FL(-0.33, 0.95, 0.05), 34], 0.02);
      callout("eng", t, fr("engine", 0.15), at("props"), FL(-0.33, 1.05, 0.1), 300, 1150); callout("al", t, fr("engine", 0.55), at("props"), FL(-0.2, 0.8, 0.4), 760, 1250); hudShow("estats", win(t, fr("engine", 0.6), at("props"))); }
    else { const rps = lerp(0.6, 5.85, smooth(prog(t, at("props"), fr("props", 0.6)))); props(t, rps * (t > fr("props", 0.6) ? 1 : 0.4 + 0.6 * prog(t, at("props"), fr("props", 0.6))));
      move(t, at("props"), at("tunnel"), [FL(2.5, 2.6, -11.5), FL(0.05, 1.45, -1.4), 38], [FL(2.2, 2.4, -10.5), FL(0.05, 1.45, -1.4), 38], 0.03);
      callout("chainX", t, fr("props", 0.2), at("tunnel"), FL(-0.4, 0.95, -0.3), 300, 1150); callout("propL", t, fr("props", 0.45), at("tunnel"), FL(HUB_R.x, HUB_R.y + 1.0, HUB_R.z), 760, 700); }
  } else if (t < at("lift")) { // THE WIND TUNNEL (1901): the fan blows; a model wing on its balance; then 200 tested wings
    sets("wt"); lightIn(0.25); const fan = WT.userData.fan; fan.rotation.x = t * 30; tunnelAir(t, 1); WT.updateMatrixWorld(true); const WW = (x, y, z) => WT.localToWorld(V(x, y, z));
    const c = fr("tunnel", 0.55);
    if (t < c) { move(t, at("tunnel"), c, [WW(2.4, 2.2, 3.4), WW(0.0, 1.1, 0), 36], [WW(2.0, 2.0, 2.9), WW(0.05, 1.1, 0), 36], 0.01);
      callout("fan", t, fr("tunnel", 0.08), c, WW(-1.04, 1.13, 0), 300, 1150); callout("model", t, fr("tunnel", 0.25), c, WW(0.15, 1.18, 0), 760, 1000); }
    else { move(t, c, at("lift"), [WW(0.2, 2.0, 1.6), WW(-0.1, 1.9, -2.4), 40], [WW(0.2, 2.1, 1.2), WW(0.0, 2.0, -2.4), 40], 0.01); callout("shelf", t, c + 0.2, at("lift"), WW(0.2, 1.95, -2.4), 760, 1150); }
  } else if (t < at("warp")) { // LIFT: the cambered wing turns the air downward, and the air pushes back up
    sets("lf"); lightIn(1.0); H.key.position.set(LF.position.x + 3, 6, LF.position.z + 5); H.key.target.position.copy(LF.position); H.bloom.strength = 0.45;
    LU.uK.value = smooth(prog(t, at("lift"), fr("lift", 0.2))); const k1 = smooth(prog(t, fr("lift", 0.3), fr("lift", 0.55))), k2 = smooth(prog(t, fr("lift", 0.55), fr("lift", 0.8)));
    LF.userData.dn.scale.setScalar(Math.max(0.001, k1)); LF.userData.up.scale.setScalar(Math.max(0.001, k2)); LF.updateMatrixWorld(true); const LW = (x, y, z) => LF.localToWorld(V(x, y, z));
    move(t, at("lift"), at("warp"), [LW(0.3, 0.3, 6.6), LW(0.2, 0.15, 0), 40], [LW(0.3, 0.25, 5.9), LW(0.2, 0.15, 0), 40], 0.01);
    callout("down", t, fr("lift", 0.32), at("warp"), LW(2.1, -0.75, 0.9), 760, 1250); callout("liftA", t, fr("lift", 0.58), at("warp"), LW(0, 1.4, 0.9), 300, 600); hudShow("cam", win(t, fr("lift", 0.05), at("warp")));
  } else if (t < at("day")) { // WING WARPING: hips → wires → twisted tips + rudder
    sets("kh"); onRail(RAIL_Z0 + 1.0); lightKH(V(0, 1, 0)); sandWind(t, V(0, 0, 0), 0.6);
    const w = Math.sin((t - at("warp")) * 2.2) * smooth(prog(t, fr("warp", 0.1), fr("warp", 0.3))); FU.uWarp.value = w; FU.uRud.value = -w * 0.35;
    const c = fr("warp", 0.45);
    if (t < c) move(t, at("warp"), c, [FL(2.6, 3.2, 5.6), FL(0.45, 0.7, -0.1), 36], [FL(2.4, 3.0, 5.1), FL(0.45, 0.7, -0.1), 36], 0.02);
    else move(t, c, at("day"), [FL(-9, 7.5, -13), FL(0, 1.2, -0.5), 38], [FL(-8.5, 7, -12), FL(0, 1.2, -0.5), 38], 0.03);
    callout("cradle", t, fr("warp", 0.12), c, FL(CRADLE.x, CRADLE.y, CRADLE.z), 760, 1150); callout("tips", t, c + 0.1, at("day"), FL(-6.0, 2.3, -0.8), 300, 1000); callout("rud", t, c + 0.7, at("day"), FL(0.08, 1.6, -2.9), 760, 1250);
  } else if (t < at("twelve")) { // 17 DECEMBER 1903: the dunes, the wind; the run down the rail, and up
    sets("kh"); lightKH(V(0, 1, 8), 20);
    if (t < at("rail")) { onRail(RAIL_Z0 + 1.0); props(t, 5.85); sandWind(t, V(0, 0, 10), 1, 40);
      move(t, at("day"), at("rail"), [V(-60, 24, -55), V(0, 2, 6), 40], [V(-52, 20, -48), V(0, 2, 6), 40], 0.1);
      title(t, fr("day", 0.05), fr("day", 0.6), "17 December 1903", "Kitty Hawk, North Carolina", 150); hudShow("day", win(t, fr("day", 0.4), at("rail"))); callout("wind", t, fr("day", 0.55), at("rail"), V(-3, 1.5, 12), 300, 1150); }
    else { const runEnd = fr("rail", 0.72); const k = prog(t, at("rail"), runEnd); props(t, 5.85); sandWind(t, V(0, 0, 8), 1, 30);
      if (t < runEnd) { const z = RAIL_Z0 + 1.0 + (TAKEOFF_Z - RAIL_Z0 - 1.0) * k * k; onRail(z); }
      else { const u = 0.08 * prog(t, runEnd, at("twelve")); const f = flight1(u); flyAt(f.p, f.pitch); DOLLY.position.set(0, 0, TAKEOFF_Z); DOLLY.visible = true; FU.uElev.value = -0.15; }
      const fp = FLY.position.clone();
      move(t, at("rail"), at("twelve"), [V(-17, 1.6, fp.z - 7), fp.clone().add(V(0, 1.1, 1.5)), 36], [V(-16, 1.8, fp.z - 5), fp.clone().add(V(0, 1.3, 1.5)), 36], 0.08);
      callout("rail", t, fr("rail", 0.08), fr("rail", 0.5), V(0, 0.15, RAIL_Z0 + 13), 300, 1250); }
  } else if (t < at("gust")) { // 12 SECONDS, 37 METRES; then all four flights of the day
    sets("kh"); sandWind(t, V(0, 0, TAKEOFF_Z + 20), 1, 40);
    if (t < at("four")) { const u = clamp(prog(t, at("twelve"), fr("twelve", 0.92))); const f = flight1(u); flyAt(u >= 1 ? V(0, 0.02, f.p.z) : f.p, u >= 1 ? 0.02 : f.pitch); props(t, u < 1 ? 5.85 : 1.2); FU.uElev.value = -f.pitch * 1.5; lightKH(FLY.position, 16);
      grow(L120, u); DOLLY.visible = true; DOLLY.position.set(0, 0, TAKEOFF_Z);
      if (u >= 1) { PUFF.visible = true; puff(t, fr("twelve", 0.92), FLY.position, 0.8, 1.5); }
      const fp = FLY.position.clone(); move(t, at("twelve"), at("four"), [V(-17, 3.2, fp.z - 6), fp.clone().add(V(0, 0.6, 3)), 38], [V(-17, 3.2, fp.z - 4), fp.clone().add(V(0, 0.6, 3)), 38], 0.08);
      H.$("tmT").textContent = `${(u * 12).toFixed(1)} s`; H.$("tmD").textContent = `${Math.round(u * 36.6)} m`; hudShow("timer", win(t, fr("twelve", 0.02), at("four"))); hudShow("sped", win(t, fr("twelve", 0.05), fr("twelve", 0.9)));
      if (u > 0.98) callout("f1", t, fr("twelve", 0.92), at("four"), V(0, 0.05, TAKEOFF_Z + 20), 300, 1150); }
    else { flyAt(V(0, 0.02, TAKEOFF_Z + 259.7), 0.02); lightKH(V(0, 0, TAKEOFF_Z + 130), 150);
      FLIGHTS.forEach((l, i) => grow(l, smooth(prog(t, fr("four", 0.05 + i * 0.14), fr("four", 0.05 + i * 0.14 + (i === 3 ? 0.45 : 0.15))))));
      FLIGHTS.forEach((l) => (l.scale.x = 7)); move(t, at("four"), at("gust"), [V(-20, 360, TAKEOFF_Z + 96), V(0, 0, TAKEOFF_Z + 98), 40], [V(-20, 370, TAKEOFF_Z + 98), V(0, 0, TAKEOFF_Z + 98), 40], 0.05); H.cam.up.set(0, 0, 1); H.cam.lookAt(V(0, 0, TAKEOFF_Z + 98)); H.cam.updateMatrixWorld(); scene.fog = null;
      hudShow("flights", win(t, fr("four", 0.1), at("gust"))); callout("f4", t, fr("four", 0.7), at("gust"), V(2.4, 0, TAKEOFF_Z + 255), 760, 700); }
  } else if (t < at("orbi")) { // THE GUST: it tumbles end over end
    sets("kh"); const g0 = fr("gust", 0.3); const k = smooth(prog(t, g0, g0 + 1.6)); const base = V(3, 0.02, TAKEOFF_Z + 255);
    const tumble = k * Math.PI * 1.15; flyAt(base.clone().add(V(0, Math.sin(k * Math.PI) * 2.6, -k * 9)), tumble); FLY.position.y += Math.abs(Math.sin(tumble)) * 1.3;
    lightKH(base, 16); sandWind(t, base, 1 + 1.5 * clamp(prog(t, g0 - 0.5, g0)), 30); PUFF.visible = t > g0; puff(t, g0, base, 1.6, 3); flash(t, g0, 0.15, 6, "#f4ead8");
    move(t, at("gust"), at("orbi"), [base.clone().add(V(-16, 3.2, -10)), base.clone().add(V(0, 1.2, -3)), 40], [base.clone().add(V(-15, 3.4, -12)), base.clone().add(V(0, 1.4, -5)), 40], 0.25);
    hudShow("never", win(t, fr("gust", 0.6), at("orbi")));
  } else { // ORBI: in the gallery with the Flyer; a private Space
    sets("mus"); lightIn(0.0); flyAt(MUS.position.clone().add(V(0, 0.52, -1.5)), 0, 0); OR.visible = true; OR.updateMatrixWorld(true); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const files = Math.floor(clamp(prog(t, at("orbi"), fr("orbi", 0.8))) * 3.99); const typed = Math.round(clamp(prog(t, fr("orbi2", 0.55), fr("orbi2", 0.8))) * 6); const joined = t > fr("orbi2", 0.85);
    screen(ph, { on: 1, files, members: joined ? 2 : 1 }, drawPhone); screen(lap, { on: t > fr("orbi2", 0.45) ? 1 : 0, typed, joined: joined ? 1 : 0 }, drawLap);
    OUT.forEach((p) => { p.g.visible = true; screen(p, { s: 1 }, drawStranger); });
    ROOM.visible = true; ROOM.material.color.setRGB(0.24 * 1.6, 1.0 * 1.6, 0.55 * 1.6); ROOM.scale.setScalar(0.96 + 0.04 * Math.sin(t * 3)); orbiL.intensity = 0.6;
    lock.visible = true; lock.position.set(0.2, 0.9 + 0.05 * Math.sin(t * 2), 0.2); lock.scale.setScalar(0.5);
    if (t < at("orbi2")) { move(t, at("orbi"), at("orbi2"), [OW(0.3, 4.2, 10.5), OW(0.0, 1.2, -4), 42], [OW(0.4, 3.8, 9.6), OW(0.0, 1.2, -4), 42], 0.2);
      callout("room", t, fr("orbi", 0.25), at("orbi2"), OW(2.7, 0.02, 0.5), 760, 1150); callout("outsiders", t, fr("orbi", 0.55), at("orbi2"), OW(-3.6, 0.4, -2.8), 300, 900); }
    else if (t < at("orbi3")) { const c = fr("orbi2", 0.45);
      if (t < c) { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
        move(t, at("orbi2"), c, [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 36], [OW(...pc.clone().addScaledVector(pn, 2.8).toArray()), OW(...pc.toArray()), 36], 0.02);
        H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); H.cam.updateMatrixWorld(); }
      else move(t, c, at("orbi3"), [OW(-0.4, 2.2, 5.0), OW(-1.25, 0.62, -0.5), 38], [OW(-0.5, 2.1, 4.6), OW(-1.25, 0.62, -0.5), 38], 0.02); }
    else { move(t, at("orbi3"), at("end"), [OW(0.3, 3.2, 8.0), OW(0.2, 0.8, -1.6), 44], [OW(0.4, 2.9, 7.2), OW(0.2, 0.8, -1.6), 44], 0.2); hudShow("chips", win(t, fr("orbi3", 0.2), at("end"))); }
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
