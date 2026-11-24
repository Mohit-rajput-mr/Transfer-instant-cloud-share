
// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  h93: ["93 m", "#3dff8c", "ground to torch"], skin: ["Copper skin", "#ff9a5c", "2.4 mm thick"], pen: ["Two pennies", "#ffd166", "stacked"],
  pylon: ["Iron pylon", "#3dff8c", "Eiffel's tower inside"], sec: ["Secondary frame", "#ffd166", "follows her shape"], bars: ["Flat iron bars", "#6fd0ff", "out to the skin"],
  arm: ["Arm truss", "#ff8a3d", "carries the torch"], rigid: ["Rigid", "#ff6a4d", "stress piles up"], flexi: ["Flexible", "#3dff8c", "bends, then springs back"],
  torch: ["Torch", "#9fd4ff", "sways up to 6 in"], mold: ["Wooden mould", "#ffd166", "carved to her shape"], sheet: ["Copper sheet", "#ff9a5c", "heated, then hammered"],
  finger: ["Her index finger", "#cfd6dd", "2.44 m long"], pat: ["Green patina", "#7dffc0", "protects"], cu: ["Copper", "#ff9a5c", "beneath"],
  lockL: ["Locked here", green, "before it leaves"], stair: ["Stairs to the crown", "#ffd166", "visitors climb inside her"], srv: ["Server", "#8fd0ff", "sees scrambled bytes"],
});
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["UNVEILED", "1886"], ["TO THE TORCH", "93 m"], ["SKIN", "2.4 mm"]].map(([a, b]) => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 60px D;font-stretch:112%;color:#fff;margin-top:6px">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 190px/0.85 D;font-stretch:112%;color:#ff9a5c;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 44px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd" id="exT">MOTION EXAGGERATED</div>`, { left: "300px", top: "1110px" });
hudEl("sway", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["BODY", "≈ 3 in", "#9fd4ff"], ["TORCH", "≈ 6 in", "#ff8a3d"]].map(([a, b, c]) => `<div style="padding:18px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;color:${c}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("year", `<div style="width:1080px;text-align:center"><div id="yrN" style="font:900 200px/0.85 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.65)">1886</div><div id="yrL" style="font:800 40px D;color:#ff9a5c;letter-spacing:.14em;margin-top:10px">SHINY COPPER</div></div>`, { left: "0px", top: "220px" });
hudEl("lexag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">LAYER THICKNESS EXAGGERATED</div>`, { left: "250px", top: "1110px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["AES-256", "NO ACCOUNT", "NO APP"].map((s) => `<div style="padding:18px 26px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 38px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ff9a5c") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
LIB.updateMatrixWorld(true);
const SL = (x, y, z) => LIB.localToWorld(V(x, y, z));             // statue-local → world (y = 0 at her heel)
const LW = (x, y, z) => SL(x, y, z);
const MPv = MP, FPv = FP, WPv = WP;
function look_(storm) { const s = storm; H.key.intensity = lerp(3.0, 0.7, s); H.hemi.intensity = lerp(0.85, 0.55, s); H.envK.value = lerp(0.4, 0.25, s); SKYU.uStorm.value = s;
  scene.fog.color.copy(FOG.c).lerp(new THREE.Color(0x5a6168), s); scene.fog.density = lerp(FOG.d, 0.0009, s); sea.material.uniforms.uAmp.value = lerp(1, 2.6, s); H.rimA.intensity = 0.2; H.rimB.intensity = 0.35;
  sea.material.uniforms.sunColor.value.set(0xffe0b8).multiplyScalar(1 - s * 0.9); }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
function outdoor(on) { sky.visible = on; sea.visible = on; WORLD.visible = on; PED.visible = on; LIB.visible = on; scene.background = on ? null : new THREE.Color(0x0b0d10); }
const EX = 20;   // sway shown ×20

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
H.frame("Locked on your device. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0);
  outdoor(true); MC.visible = FX.visible = WS.visible = OR.visible = false; RAIN.visible = false; camRange(0.5, 70000); look_(0); H.zoom = 1; H.bloom.strength = 0.3;
  SW.uX.value = 0; SW.uAge.value = 1; SW.uSway.value.set(0, 0); skelGlow([0, 0, 0, 0]); SKEL.visible = false; STAIR.visible = false; GULLS.visible = true; gulls(t, SL(0, 0, 0)); keyShadow(SL(0, 10, 0), 70);
  sea.material.uniforms.time.value = t * 0.5; sea.material.uniforms.uWT.value = t; SKYU.uT.value = t; flameMat.emissiveIntensity = 0.25;

  if (t < at("statue")) { // HOOK: dawn from the water, low over the swell; then the torch against the sunrise
    const c = fr("hook", 0.55);
    if (t < c) { move(t, 0, c, [SL(-40, -45, 230), SL(0, 20, 0), 34], [SL(-30, -38, 190), SL(0, 26, 0), 34], 0.5); title(t, fr("hook", 0.03), c, "New York Harbor", "Two pennies thin", 150); }
    else move(t, c, at("statue"), [SL(-30, 34, 26), SL(-6.7, 42, 1), 36], [SL(-24, 38, 22), SL(-6.7, 44, 1), 36], 0.3);
  } else if (t < at("skin")) { // drone rising from the fort to the torch: 93 m
    keyShadow(SL(0, -10, 0), 80); move(t, at("statue"), at("skin"), [SL(30, -42, 120), SL(0, -25, 0), 38], [SL(18, 30, 70), SL(-3, 30, 0), 38], 0.3);
    callout("h93", t, fr("statue", 0.45), at("skin"), TORCH_TIP(), 300, 420); hudShow("stats", win(t, fr("statue", 0.2), at("skin")));
  } else if (t < at("hollow")) { // macro: the sheet edge, 2.4 mm, beside two pennies
    outdoor(false); MC.visible = true; camRange(0.002, 50); H.key.intensity = 0.4; H.hemi.intensity = 0.4; H.envK.value = 0.9; drops(t, 0); H.bloom.strength = 0.2;
    move(t, at("skin"), at("hollow"), [MP(0.075, 0.016, 0.2), MP(0.062, 0.003, 0.066), 28], [MP(0.07, 0.013, 0.18), MP(0.064, 0.003, 0.066), 26], 0.01);
    setBig("2.4 mm", "COPPER SKIN"); hudShow("big", win(t, fr("skin", 0.1), at("hollow")));
    callout("skin", t, fr("skin", 0.2), fr("skin", 0.6), MP(0.05, 0.004, 0.08), 300, 1150); callout("pen", t, fr("skin", 0.55), at("hollow"), MP(0.082, 0.003, 0.066), 760, 1150);
  } else if (t < at("pylon")) { // storm rolls in; "look inside": she turns to x-ray, Eiffel's skeleton appears
    const s = smooth(prog(t, at("hollow"), fr("hollow", 0.5))); look_(s); rain(t, s, H.cam.position, 50); SKEL.visible = true; STAIR.visible = t > at("frame"); GULLS.visible = false;
    const x = t < at("frame") ? smooth(prog(t, fr("hollow", 0.7), at("frame"))) : 1; SW.uX.value = x; skelGlow([t > at("frame") ? smooth(prog(t, at("frame"), fr("frame", 0.4))) : 0, 0, 0, 0]);
    if (t < at("frame")) move(t, at("hollow"), at("frame"), [SL(70, -20, 120), SL(0, 10, 0), 38], [SL(55, -12, 95), SL(0, 14, 0), 38], 0.3);
    else { move(t, at("frame"), at("pylon"), [SL(40, 5, 55), SL(0, 14, 0), 40], [SL(30, 14, 44), SL(0, 18, 0), 40], 0.2); callout("pylon", t, fr("frame", 0.35), fr("frame", 0.7), SL(1.5, 12, 1.2), 760, 1150); callout("stair", t, fr("frame", 0.7), at("pylon"), SL(-2.6, 20, 1.5), 300, 1100); }
  } else if (t < at("flex")) { // the pylon, the secondary frame, the flat bars to the skin, the arm truss
    look_(1); rain(t, 1, H.cam.position, 50); SKEL.visible = true; STAIR.visible = true; GULLS.visible = false; SW.uX.value = 1;
    skelGlow([0.5, smooth(prog(t, at("pylon"), fr("pylon", 0.3))), smooth(prog(t, fr("pylon", 0.45), fr("pylon", 0.7))), smooth(prog(t, fr("pylon", 0.7), fr("pylon", 0.9)))]);
    move(t, at("pylon"), at("flex"), [SL(-16, 6, 26), SL(0, 16, 0), 40], [SL(-20, 22, 24), SL(-3, 26, 0), 40], 0.2);
    callout("sec", t, fr("pylon", 0.1), fr("pylon", 0.45), SL(RINGS[6][18][0].x, RINGS[6][18][0].y, RINGS[6][18][0].z), 300, 1150);
    callout("bars", t, fr("pylon", 0.45), fr("pylon", 0.75), SL(RINGS[10][12][1].x, RINGS[10][12][1].y, RINGS[10][12][1].z), 760, 1100);
    callout("arm", t, fr("pylon", 0.75), at("flex"), SL(-6.2, 35, 0.7), 300, 520);
  } else if (t < at("sway")) { // RIGID vs FLEXIBLE: wind loads both panels; the rigid one piles up stress and cracks
    outdoor(false); FX.visible = true; camRange(0.05, 200); H.bloom.strength = 0.45; H.key.intensity = 0.3; H.hemi.intensity = 0.9;
    const load = 0.5 + 0.5 * Math.sin((t - at("flex")) * 3.2); const k = prog(t, at("flex"), fr("flex", 0.85));
    panelU[0].uStress.value = smooth(k) * (0.6 + 0.4 * load); panelU[0].uCrack.value = smooth(prog(t, fr("flex", 0.55), fr("flex", 0.9)));
    FXP[0].pn.position.z = 0.01 * load; FXP[1].pn.position.z = 0.16 * load; bendBars(FXP[1], 0.16 * load); FXP[1].pn.rotation.y = 0.05 * load;
    move(t, at("flex"), at("sway"), [FP(3.4, 5.0, 8.4), FP(0, 1.5, -0.3), 40], [FP(3.0, 4.7, 7.8), FP(0, 1.5, -0.3), 40], 0.05);
    callout("rigid", t, fr("flex", 0.15), at("sway"), FP(-1.3, 2.6, 0.1), 140, 520); callout("flexi", t, fr("flex", 0.3), at("sway"), FP(1.3, 2.6, 0.1), 600, 520);
  } else if (t < at("hammer")) { // the storm: she sways (×20), the torch twice as much
    GULLS.visible = false; look_(1); rain(t, 1, H.cam.position, 50); const sw = 0.152 * EX * Math.sin((t - at("sway")) * 1.3); SW.uSway.value.set(sw, 0); flash(t, fr("sway", 0.3), 0.5, 6, "#dfe8ff");
    move(t, at("sway"), at("hammer"), [SL(0, -30, 150), SL(0, 14, 0), 36], [SL(8, -26, 140), SL(0, 16, 0), 36], 0.2);
    hudShow("exag", win(t, fr("sway", 0.15), at("hammer"))); H.$("exT").textContent = "MOTION EXAGGERATED ×20"; hudShow("sway", win(t, fr("sway", 0.3), at("hammer")));
    const tip = TORCH_TIP(); tip.add(V(sw, 0, 0).applyAxisAngle(V(0, 1, 0), LIB.rotation.y)); callout("torch", t, fr("sway", 0.45), at("hammer"), tip, 760, 420);
  } else if (t < at("brown")) { // repoussé: a heated sheet hammered over a wooden mould
    outdoor(false); WS.visible = true; camRange(0.02, 100); scene.background = new THREE.Color(0x120c08); H.key.intensity = 0.2; H.hemi.intensity = 0.9; H.envK.value = 0.5; H.bloom.strength = 0.35;
    forgeL.intensity = 3 + Math.sin(t * 9) * 0.4; dust(t); const k = mallet(t, at("hammer")); hammer(k); hotCopper.emissiveIntensity = 0.45 * Math.exp(-(t - at("hammer")) * 0.35);
    const c = fr("hammer", 0.6);
    if (t < c) move(t, at("hammer"), c, [WP(1.6, 2.4, 2.8), WP(0, 0.95, 0), 38], [WP(1.3, 2.2, 2.4), WP(-0.1, 0.95, 0), 36], 0.03);
    else move(t, c, at("brown"), [WP(-1.6, 1.8, 2.2), WP(0.6, 0.9, -1.0), 40], [WP(-1.3, 1.7, 2.0), WP(0.8, 0.9, -1.2), 40], 0.03);
    callout("sheet", t, fr("hammer", 0.1), fr("hammer", 0.4), WP(0.5, 1.05, 0.4), 760, 1150); callout("mold", t, fr("hammer", 0.3), c, WP(-1.1, 0.7, 0.81), 300, 1150);
    callout("finger", t, c + 0.3, at("brown"), WP(1.4, 0.95, -2.3), 760, 1050);
  } else if (t < at("protect")) { // 1886: shiny copper brown → after 1900 the green patina spreads
    keyShadow(SL(0, 25, 0), 30); const yr = t < at("green") ? 1886 : Math.round(lerp(1886, 1920, smooth(prog(t, at("green"), fr("green", 0.9)))));
    SW.uAge.value = t < at("green") ? 0 : smooth(prog(t, fr("green", 0.2), fr("green", 0.95))); flameMat.emissiveIntensity = 0.1;
    H.$("yrN").textContent = String(yr); H.$("yrL").textContent = yr < 1900 ? "SHINY COPPER" : yr < 1906 ? "TURNING" : "GREEN PATINA"; H.$("yrL").style.color = yr < 1900 ? "#ff9a5c" : "#7dffc0";
    hudShow("year", win(t, at("brown") + 0.2, at("protect")));
    if (t < at("green")) move(t, at("brown"), at("green"), [SL(46, 8, 100), SL(-1, 23, 0), 34], [SL(40, 10, 92), SL(-1, 24, 0), 34], 0.2);
    else move(t, at("green"), at("protect"), [SL(26, 16, 60), SL(0, 24, 0), 36], [SL(34, 12, 76), SL(0, 22, 0), 38], 0.2);
  } else if (t < at("orbi")) { // macro: the green layer protects the copper beneath, rain beads on it
    outdoor(false); MC.visible = true; camRange(0.002, 50); H.key.intensity = 0.35; H.hemi.intensity = 0.4; H.envK.value = 0.9; drops(t, 1); H.bloom.strength = 0.2;
    move(t, at("protect"), at("orbi"), [MP(-0.02, 0.012, 0.17), MP(-0.04, 0.004, 0.08), 24], [MP(-0.025, 0.01, 0.155), MP(-0.04, 0.004, 0.08), 22], 0.01);
    callout("pat", t, fr("protect", 0.3), at("orbi"), MP(-0.08, 0.0045, 0.08), 300, 1100); callout("cu", t, fr("protect", 0.5), at("orbi"), MP(-0.02, 0.002, 0.08), 760, 1250); hudShow("lexag", win(t, fr("protect", 0.3), at("orbi")));
  } else { // ORBI: on the pier, Liberty across the lawn; locked on the phone → scrambled → unlocked on the laptop
    OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); orbiL.intensity = 0.6; OR.updateMatrixWorld(); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const lk = clamp(prog(t, fr("orbi", 0.3), fr("orbi2", 0.6))); const got = clamp(prog(t, fr("orbi3", 0.3), fr("orbi3", 0.9)));
    screen(ph, { lock: Math.round(lk * 40) / 40 }, drawPhone); screen(lap, { got: Math.round(got * 40) / 40 }, drawLap);
    lock.visible = t > at("orbi3"); lock.position.copy(ph.g.position).add(V(0, 0.32 + 0.02 * Math.sin(t * 2), 0)); lock.scale.setScalar(0.45);
    const a0 = ph.g.position.clone().add(V(0, 0.3, 0)), s0 = RACK.position.clone().add(V(0, 1.4, 0.5)), b0 = lap.g.position.clone().add(V(0.2, 0.9, 0.2));
    PARTS.forEach((m, i) => { const st = fr("orbi2", 0.5) + i * 0.22, k = clamp((t - st) / 1.3), k2 = clamp((t - fr("orbi3", 0.2) - i * 0.12) / 1.0);
      m.visible = k > 0 && k2 < 1; if (k2 > 0) m.position.copy(s0).lerp(b0, ease(k2)).add(V(0, Math.sin(k2 * Math.PI) * 0.6, 0)); else m.position.copy(a0).lerp(s0, ease(k)).add(V(0, Math.sin(k * Math.PI) * 0.8, ((i % 4) - 1.5) * 0.12)); m.rotation.set(t * 2 + i, t * 1.5, 0); });
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.4, 1.7, 9.5), OW(0.3, 3.6, 0), 46], [OW(0.4, 1.6, 8.2), OW(0.3, 3.4, 0), 46], 0.3);
    else if (t < at("orbi3")) { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, at("orbi2"), at("orbi3"), [OW(...pc.clone().addScaledVector(pn, 3.4).toArray()), OW(...pc.toArray()), 34], [OW(...pc.clone().addScaledVector(pn, 3.1).toArray()), OW(...pc.toArray()), 34], 0.03);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); }
    else { move(t, at("orbi3"), at("end"), [OW(1.0, 2.0, 7.8), OW(1.6, 2.4, -0.6), 44], [OW(0.8, 1.9, 7.0), OW(1.6, 2.4, -0.6), 44], 0.2); callout("srv", t, fr("orbi3", 0.05), fr("orbi3", 0.6), OW(3.6, 2.15, -1.5), 760, 900); hudShow("chips", win(t, fr("orbi3", 0.5), at("end"))); }
  }
  if (window.DBG) { const d = window.DBG[0].split(",").map(Number); look(SL(d[0], d[1], d[2]), SL(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
