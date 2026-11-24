
// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  h56: ["56 m", "#3dff8c", "of white marble"], top: ["The top", "#ffd166", "about 3.9 m out of line"], found: ["Foundation", "#cfd6dd", "only 3 m deep"],
  layA: ["Weak, unstable ground", "#ffd166", "soft layers"], layB: ["Soft layers", "#6fd0ff", "squeeze under the load"], low: ["Low side", "#ff8a3d", "sinks"],
  axis: ["Its axis", "#3dff8c", "curved, not straight"], lead: ["870 t of lead", "#cfd6dd", "on the high side"], cab: ["Steel cables", "#9fd4ff", "round the 3rd level"],
  drill: ["Slanted drills", "#ffd166", "under the high side"], cav: ["Soil out", "#ff8a3d", "a little at a time"], high: ["High side", "#3dff8c", "settles"],
});
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["BEGUN", "1173"], ["HEIGHT", "56 m"], ["TOP OFF LINE", "3.9 m"]].map(([a, b]) => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 60px D;font-stretch:112%;color:#fff;margin-top:6px">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("year", `<div style="width:1080px;text-align:center"><div id="yrN" style="font:900 190px/0.85 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.65)">1173</div><div id="yrL" style="font:800 40px D;color:#ffd166;letter-spacing:.12em;margin-top:10px"></div></div>`, { left: "0px", top: "220px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 180px/0.85 D;font-stretch:112%;color:#ff8a3d;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 44px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd" id="exT">MOTION EXAGGERATED</div>`, { left: "300px", top: "1110px" });
hudEl("chip", `<div style="width:1080px;text-align:center"><span id="chT" style="display:inline-block;padding:16px 30px;border-radius:22px;background:rgba(8,10,16,.84);border:1.5px solid #ff8a3d;font:900 48px D;color:#ff8a3d"></span></div>`, { left: "0px", top: "1430px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["YOU PICK 5–30 MIN", "NO ACCOUNT", "NO TRACE"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ff8a3d") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };
const chip = (t, a, b, txt, col = "#ff8a3d") => { H.$("chT").textContent = txt; H.$("chT").style.color = col; H.$("chT").style.borderColor = col; hudShow("chip", win(t, a, b)); };

// the tower's axis drawn as a glowing line (follows the curved chain); a ghost of the 1990 axis
const axisMat = (col) => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.3), toneMapped: false, transparent: true, depthTest: false });
const AXIS = new THREE.Mesh(new THREE.BufferGeometry(), axisMat(0x3dff8c)), GHOST = new THREE.Mesh(new THREE.BufferGeometry(), axisMat(0xff8a3d)); AXIS.renderOrder = GHOST.renderOrder = 50; scene.add(AXIS, GHOST);
function axisTube(m, k = 1) { const pts = []; for (let i = 0; i <= 40; i++) pts.push(towerPoint((i / 40) * TOWER_H * k)); m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.2, 8); }

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
function look_() { H.key.intensity = 3.6; H.hemi.intensity = 0.95; H.envK.value = 0.42; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.25; H.rimB.intensity = 0.35; }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const NOW = 5.0;     // the foundation's tilt today (deg); 1990: 5.5 (Burland); the rescue took back ~0.5° (45 cm at the top)
const yrTilt = (y) => y < 1178 ? lerp(0, 0.25, (y - 1173) / 5) : y < 1272 ? lerp(0.25, 0.6, (y - 1178) / 94) : y < 1372 ? lerp(0.6, 1.6, (y - 1272) / 100) : lerp(1.6, 5.5, Math.pow((y - 1372) / 618, 1.15));
const yrStoreys = (y) => y < 1178 ? 1 + 2 * clamp((y - 1173) / 5) : y < 1272 ? 3 : y < 1278 ? 3 + 4 * clamp((y - 1272) / 6) : y < 1372 ? 7 : 8;
const posePeople = () => { T1.setPose({ shR: [-25, 0, -140], elR: [0, 0, -15], wrR: [0, 0, -60], shL: [0, 0, 30], elL: [-70, 0, 0], head: [-6, 0, 0] }); T2.setPose({ shL: [-60, 0, 10], elL: [-40, 0, 0], shR: [-60, 0, -10], elR: [-40, 0, 0], head: [8, 0, 0] }); };
posePeople();

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
H.frame("You pick when it burns: 5–30 minutes.", async (t) => {
  H.cam.up.set(0, 1, 0); look_(); camRange(0.3, 70000); sky.visible = true; WORLD.visible = true; TW.visible = true; OR.visible = false; section(false); RESCUE.visible = true; leadUpTo(0); cables(false); drills(false); AXIS.visible = GHOST.visible = false;
  setTower(NOW); T1.root.visible = T2.root.visible = false; H.zoom = 1; H.bloom.strength = 0.3; skyU.uT.value = t; SECU.uSquash.value = 0; SECU.uCav.value = 0; SECU.uSettleN.value = 0; keyShadow(V(0, 25, 0), 70);
  for (const a of ARROWS) a.material.uniforms.uP.value = 0; EMB.visible = false;

  if (t < at("tower")) { // HOOK: sunset on the lawn, a tourist "holding it up"; then the leaning galleries
    const c = fr("hook", 0.55);
    if (t < c) { T1.root.visible = true; T1.root.position.set(53.2, 0, -108.4); T1.root.rotation.y = Math.atan2(55 - 53.2, -112 + 108.4); keyShadow(V(54, 1, -108.5), 8);
      move(t, 0, c, [V(55, 1.55, -112), V(3, 24, 0), 40], [V(54.9, 1.6, -111.8), V(3, 25, 0), 40], 0.02); title(t, fr("hook", 0.03), c, "Pisa, Italy", "Why hasn't it fallen?", 150); }
    else move(t, c, at("tower"), [V(-14, 36, -24), towerPoint(42), 40], [V(-12, 42, -22), towerPoint(48), 40], 0.2);
  } else if (t < at("soil")) { // drone round the tower and the cathedral: 56 m, top ≈ 3.9 m out of line
    move(t, at("tower"), at("soil"), [V(60, 24, -70), V(0, 24, -20), 40], [V(25, 50, -105), V(0, 26, -30), 40], 0.3);
    callout("h56", t, fr("tower", 0.15), fr("tower", 0.55), towerPoint(TOWER_H), 300, 420); callout("top", t, fr("tower", 0.55), at("soil"), towerPoint(TOWER_H, 5.4, Math.PI * 0), 760, 520); hudShow("stats", win(t, fr("tower", 0.25), at("soil")));
  } else if (t < at("curve")) { // SECTION: soft ground, 3 m foundation; built to the 2nd floor by 1178, sinking; a century's pause
    section(true); CROWD.visible = false; const yr = t < at("sink") ? 2001 : t < at("pause") ? lerp(1173, 1178, prog(t, at("sink"), fr("sink", 0.8))) : lerp(1178, 1272, prog(t, at("pause"), fr("pause", 0.85)));
    if (t < at("sink")) { setTower(NOW); SECU.uSquash.value = 1; move(t, at("soil"), at("sink"), [V(-14, 8, -190), V(-4, 6, 0), 40], [V(-8, 0, -160), V(-2, -6, 0), 40], 0.2);
      callout("found", t, fr("soil", 0.2), fr("soil", 0.5), V(-7, -1.5, 0), 760, 1050); callout("layA", t, fr("soil", 0.45), at("sink"), V(-30, -5, 0), 760, 1250); callout("layB", t, fr("soil", 0.6), at("sink"), V(25, -16, 0), 300, 1150); }
    else { const tl = yrTilt(yr); setTower(tl, 1, Math.ceil(yrStoreys(yr))); SECU.uSquash.value = tl / 5.5 * 1.6; H.$("yrN").textContent = String(Math.round(yr));
      H.$("yrL").textContent = t < at("pause") ? (yr >= 1177.5 ? "2ND FLOOR · SINKING" : "BUILDING") : "WORK STOPPED · THE SOIL SETTLES"; hudShow("year", win(t, at("sink") + 0.1, at("curve")));
      aSqR.material.uniforms.uP.value = smooth(prog(t, fr("sink", 0.4), fr("sink", 0.9))); aSqL.material.uniforms.uP.value = aSqR.material.uniforms.uP.value; aDown.material.uniforms.uP.value = aSqR.material.uniforms.uP.value;
      move(t, at("sink"), at("curve"), [V(-6, -2, -95), V(-2, -8, 0), 40], [V(-4, 0, -88), V(-2, -6, 0), 40], 0.2); callout("low", t, fr("sink", 0.5), at("pause"), V(9, -2, 0), 300, 1150);
      if (t > at("pause")) chip(t, fr("pause", 0.1), at("curve"), "≈ 100 YEARS", "#ffd166"); }
  } else if (t < at("grow")) { // building resumes; the upper floors made taller on one side → a curved axis (curve ×6, labelled)
    const yr = lerp(1272, 1372, prog(t, at("curve"), fr("curve", 0.6))); const k = smooth(prog(t, fr("curve", 0.45), fr("curve", 0.8)));
    setTower(yrTilt(yr), lerp(1, 6, k), Math.ceil(yrStoreys(yr))); H.$("yrN").textContent = String(Math.round(yr)); H.$("yrL").textContent = "TALLER ON ONE SIDE"; hudShow("year", win(t, at("curve") + 0.1, fr("curve", 0.6)));
    AXIS.visible = k > 0.02; axisTube(AXIS, Math.min(1, yrStoreys(yr) / 8)); AXIS.material.opacity = k;
    move(t, at("curve"), at("grow"), [V(8, 26, 120), V(3, 26, 0), 34], [V(6, 28, 110), V(3, 28, 0), 34], 0.1);
    callout("axis", t, fr("curve", 0.6), at("grow"), towerPoint(42), 760, 700); hudShow("exag", win(t, fr("curve", 0.5), at("grow"))); H.$("exT").textContent = "CURVE EXAGGERATED ×6";
  } else if (t < at("weights")) { // centuries: the lean keeps growing → 1990, top 4.5 m out, closed
    const yr = lerp(1372, 1990, ease(prog(t, at("grow"), fr("grow", 0.75)))); setTower(yrTilt(yr)); H.$("yrN").textContent = String(Math.round(yr)); H.$("yrL").textContent = yr > 1989 ? "CLOSED TO THE PUBLIC" : "STILL LEANING MORE";
    hudShow("year", win(t, at("grow") + 0.1, at("weights"))); skyU.uDim.value = 1; move(t, at("grow"), at("weights"), [V(6, 22, 130), V(4, 26, 0), 36], [V(14, 24, 118), V(4, 26, 0), 36], 0.2);
  } else if (t < at("dig")) { // 1993: 870 t of lead on the north (high) side; steel cables round the 3rd level
    setTower(5.5); CROWD.visible = false; const lk = smooth(prog(t, at("weights"), fr("weights", 0.85))); leadUpTo(t < at("cables") ? lk : 1);
    if (t < at("cables")) { keyShadow(V(-13, 1, 0), 18); move(t, at("weights"), at("cables"), [V(-34, 9, 22), V(-12, 1.5, 0), 40], [V(-30, 7, 18), V(-12, 1.2, 0), 40], 0.1);
      setBig(Math.round(870 * lk) + " t", "OF LEAD", "#cfd6dd"); hudShow("big", win(t, at("weights") + 0.2, at("cables"))); callout("lead", t, fr("weights", 0.3), at("cables"), V(-13, 2.2, 0), 760, 1150); }
    else { cables(true); move(t, at("cables"), at("dig"), [V(-70, 40, 90), V(-40, 18, 0), 40], [V(-60, 34, 80), V(-30, 18, 0), 40], 0.2); callout("cab", t, fr("cables", 0.25), at("dig"), ST[3].localToWorld(V(-(R_BASE + 0.4), 0.3, 0)), 300, 700); }
  } else if (t < at("stable")) { // the drills; in section: soil out under the high side, the cavity closes, the high side settles, it eases back
    leadUpTo(1); cables(true); CROWD.visible = false;
    if (t < at("settle")) { const k = prog(t, at("dig"), at("settle")); setTower(5.5);
      if (t < fr("dig", 0.5)) { drills(true, k, t); move(t, at("dig"), fr("dig", 0.5), [V(-44, 14, 30), V(-14, 0, 0), 40], [V(-40, 11, 26), V(-14, 0, 0), 40], 0.1); callout("drill", t, at("dig") + 0.3, fr("dig", 0.5), DRILLS[2].base.clone().add(V(0, 3, 0)), 760, 1050); }
      else { section(true); drills(true, k, t); SECU.uSquash.value = 1.6; SECU.uCav.value = 1; SECU.uCavP.value.set(-7.5, -4.8); move(t, fr("dig", 0.5), at("settle"), [V(-10, 0, -62), V(-9, -4, 0), 36], [V(-10, -1, -54), V(-9, -4, 0), 36], 0.1);
        callout("cav", t, fr("dig", 0.6), at("settle"), V(-7.5, -4.8, 0), 760, 1150); } }
    else { section(true); drills(true, 1, t); const k = smooth(prog(t, at("settle"), fr("back", 0.8))); SECU.uSquash.value = 1.6; SECU.uCav.value = 1 - smooth(prog(t, at("settle"), fr("settle", 0.5))); SECU.uSettleN.value = k;
      setTower(5.5 - 0.5 * 4 * k); GHOST.visible = t > at("back"); if (GHOST.visible) { const cur = TW.rotation.z; setTower(5.5); axisTube(GHOST); setTower(5.5 - 2 * k); } AXIS.visible = t > at("back"); if (AXIS.visible) { axisTube(AXIS); AXIS.material.opacity = 1; }
      move(t, at("settle"), at("stable"), [V(0, 6, -140), V(0, 10, 0), 40], [V(0, 8, -150), V(0, 12, 0), 40], 0.1);
      if (t < at("back")) { setBig("38 m³", "OF SOIL REMOVED", "#ffd166"); hudShow("big", win(t, at("settle") + 0.2, at("back"))); callout("high", t, fr("settle", 0.4), at("back"), V(-9, -2, 0), 760, 1150); }
      else { setBig("−45 cm", "BACK TO WHERE IT STOOD IN 1838", "#3dff8c"); hudShow("big", win(t, at("back") + 0.2, at("stable"))); }
      hudShow("exag", win(t, fr("settle", 0.3), at("stable"))); H.$("exT").textContent = "MOTION EXAGGERATED ×4"; }
  } else if (t < at("orbi")) { // 2001: reopened; stable for at least 300 years — sunset beauty
    T2.root.visible = true; T2.root.position.set(-6, 0, 30); T2.root.rotation.y = Math.PI + 0.2; move(t, at("stable"), at("orbi"), [V(30, 3, 70), V(0, 24, 0), 38], [V(42, 6, 64), V(0, 26, 0), 38], 0.2);
    chip(t, fr("stable", 0.2), at("orbi"), "STABLE FOR 300+ YEARS", "#3dff8c");
  } else { // ORBI: the café table, the tower behind; you pick when it burns; the clock hits zero; deleted
    OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); orbiL.intensity = 0.4; OR.updateMatrixWorld(); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const pick = t < at("orbi2") ? 15 : LIVES[Math.min(5, Math.floor(prog(t, fr("orbi2", 0.28), fr("orbi2", 0.92)) * 6))];
    const left = t < at("orbi3") ? undefined : Math.round(lerp(14, 0, prog(t, at("orbi3"), fr("orbi3", 0.45))));
    screen(ph, { sel: t < at("orbi3") ? pick : 15, left: t < at("orbi3") ? undefined : (left <= 0 ? 0 : left) }, drawPhone); screen(lap, { left }, drawLap);
    if (t > fr("orbi3", 0.45)) { EMB.userData.burn(clamp(1 - prog(t, fr("orbi3", 0.5), at("end"))), t, (x, y) => lap.g.localToWorld(V(x * 2.4, 1.0 + y * 1.2, 0.1)).applyMatrix4(OR.matrixWorld.clone().invert())); }
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.6, 2.4, 10.5), OW(0.4, 3.2, 0), 42], [OW(0.5, 2.2, 9.0), OW(0.4, 3.0, 0), 42], 0.2);
    else if (t < at("orbi3")) { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, at("orbi2"), at("orbi3"), [OW(...pc.clone().addScaledVector(pn, 3.3).toArray()), OW(...pc.toArray()), 34], [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 34], 0.03);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); }
    else { const sc = lap.g.localToWorld(V(0, 1.0, 0.1)); OR.worldToLocal(sc); move(t, at("orbi3"), at("end"), [OW(sc.x + 0.9, sc.y + 0.4, sc.z + 4.6), OW(sc.x, sc.y, sc.z), 36], [OW(sc.x + 0.8, sc.y + 0.35, sc.z + 4.2), OW(sc.x, sc.y, sc.z), 36], 0.03); hudShow("chips", win(t, fr("orbi3", 0.5), at("end"))); }
  }
});
await H.ready();
