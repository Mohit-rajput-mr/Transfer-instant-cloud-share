
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; EARTH.visible = HST.visible = sp; SKYG.visible = sp || s === "panels"; LAB.visible = s === "lab"; PANELS.visible = s === "panels"; ORS.visible = s === "orbi";
  HOOKW.visible = false; scene.fog = null; scene.background = s === "lab" ? new THREE.Color(0x06080b) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(2600); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.3 * k; H.key.position.copy(SUN).multiplyScalar(60); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 140 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x7d9ad0); H.hemi.groundColor.set(0x2a4a7a); H.hemi.intensity = 0.5; H.envK.value = 0.85; H.rimA.intensity = 0.5; H.rimB.intensity = 0.3; }
function lightLab(at0) { H.hemi.intensity = 0.3; H.key.color.set(0xfff1e0); H.key.intensity = 2.6; H.key.position.copy(at0).add(V(4, 9, 6)); H.key.target.position.copy(at0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = 0.3; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const LW = (x, y, z) => LAB.localToWorld(V(x, y, z)), PW = (x, y, z) => PANELS.localToWorld(V(x, y, z)), OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const HC = V(0, 0, 0);

H.frame("Twelve wrong tries, and the file locks itself.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.28; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000);
  EU.uT.value = t; XU.uT.value = t; RAYU.uT.value = t; MIRU.uT.value = t; LU.uT.value = t; PU.uT.value = t;
  xray(0); rays(0, false); COSTAR.visible = false; MIRU.uEdge.value = 0; BENCH.visible = false; SLAB.visible = true; PDES.visible = PMADE.visible = true; labRays(0, t); morph(0);
  C_PSF.visible = C_M1.visible = WIPE.visible = false; LOCK.visible = false; HST.rotation.set(0, 0, 0); HST.updateMatrixWorld(true);

  if (t < at("this")) { // HOOK: a plain washer, spinning; we fly through its hole to Hubble above the Earth
    sets("space"); lightSpace(); HOOKW.visible = true; const k = prog(t, 0, at("this"));
    HOOKW.position.set(0, 2.2, 30); HOOKW.rotation.set(Math.PI / 2 + 0.12 * Math.sin(t * 0.9), 0, t * 0.6); HOOKW.scale.setScalar(1.0);
    move(t, 0, at("this"), [V(0.9, 2.6, 33.4), V(0, 2.2, 30), 38], [V(0, 2.2, 27.5), V(0, 0.5, 0), 40], 0.02);
    if (t > fr("hook", 0.78)) HOOKW.visible = false;
    title(t, fr("hook", 0.04), fr("hook", 0.55), "One ordinary washer", "Half blind", 150); skyAt();
  } else if (t < at("blur")) { // HUBBLE over the Earth; then the cutaway: the mirror, starlight to focus
    sets("space"); lightSpace();
    if (t < at("mirror")) { const a = 0.6 + (t - at("this")) * 0.07; move(t, at("this"), at("mirror"), [V(Math.sin(a) * 24, 7.5, Math.cos(a) * 24), V(0, -0.6, 0), 40], [V(Math.sin(a + 0.05) * 21, 6.8, Math.cos(a + 0.05) * 21), V(0, -1.0, 0), 40], 0.03);
      hudShow("launch", win(t, fr("this", 0.45), at("mirror"))); callout("nasa", t, fr("this", 0.1), fr("this", 0.55), HL(1.6, 3.5, 1.6), 760, 1150); callout("arrays", t, fr("this", 0.5), at("mirror"), HL(-4.5, -3.3, 0), 300, 1150);
      title(t, fr("this", 0.03), fr("this", 0.4), "Hubble Space Telescope", "Since 1990", 150); }
    else { const k = smooth(prog(t, at("mirror"), fr("mirror", 0.3))); xray(k); rays(smooth(prog(t, fr("mirror", 0.35), fr("mirror", 0.95))), false);
      move(t, at("mirror"), at("blur"), [V(10, 2.5, 9), V(0, -0.8, 0), 40], [V(8.5, 1.5, 7.5), V(0, -1.4, 0), 40], 0.02);
      hudShow("mstats", win(t, fr("mirror", 0.2), at("blur"))); hudShow("diag", win(t, fr("mirror", 0.15), at("blur")));
      callout("prim", t, fr("mirror", 0.3), at("blur"), IL(0, 1.0, PZ), 760, 1390); callout("secm", t, fr("mirror", 0.55), at("blur"), IL(0, 0.1, SZ), 300, 700); }
    skyAt();
  } else if (t < at("edge")) { // THE FIRST IMAGES (real, NASA): a star and galaxy M100, blurred
    sets("panels"); C_PSF.visible = C_M1.visible = true; H.key.castShadow = false; H.hemi.intensity = 0.8; H.key.intensity = 1.2; H.key.position.copy(PW(3, 5, 8)); H.key.target.position.copy(PW(0, 0, 0));
    move(t, at("blur"), at("edge"), [PW(0.6, 0.2, 6.4), PW(0, 0, 0), 40], [PW(0.25, 0.05, 5.6), PW(0, 0, 0), 40], 0.02); hudShow("first", win(t, fr("blur", 0.1), at("edge"))); skyAt();
  } else if (t < at("washer")) { // LAB: designed vs as made; then the light: two different focus points
    sets("lab"); lightLab(LW(0, 0.5, 0));
    if (t < at("why")) { morph(smooth(prog(t, fr("edge", 0.1), fr("edge", 0.4)))); move(t, at("edge"), at("why"), [LW(0.95, 0.45, 2.6), LW(0.8, -0.05, 0.2), 34], [LW(0.9, 0.3, 2.1), LW(0.85, -0.05, 0.2), 34], 0.01);
      H.$("nN").textContent = `${Math.round(2200 * smooth(prog(t, fr("edge", 0.1), fr("edge", 0.5)))).toLocaleString("en-US")} nm`; hudShow("nmN", win(t, fr("edge", 0.05), at("why"))); hudShow("frac", win(t, fr("edge", 0.6), at("why"))); hudShow("exag", win(t, fr("edge", 0.15), at("why")));
      callout("designL", t, fr("edge", 0.15), at("why"), LW(0.5, sagD(0.5) + 0.01, 0.26), 300, 1390); callout("madeL", t, fr("edge", 0.4), at("why"), LW(1.12, sagD(1.12) + devF(1.12), 0.26), 760, 1390); }
    else { labRays(smooth(prog(t, at("why"), fr("why", 0.55))), t); morph(1); move(t, at("why"), at("washer"), [LW(3.0, 3.8, 10.6), LW(0, 3.3, 0), 40], [LW(2.4, 3.6, 9.6), LW(0, 3.3, 0), 40], 0.01);
      callout("c1", t, fr("why", 0.45), at("washer"), FC1.getWorldPosition(V()), 760, 900); callout("c2", t, fr("why", 0.55), at("washer"), FC2.getWorldPosition(V()), 760, 520); hudShow("sph", win(t, fr("why", 0.6), at("washer"))); hudShow("exag", win(t, at("why"), fr("why", 0.4))); }
  } else if (t < at("fix")) { // LAB: the test tool, its misplaced lens; the washer in the gap
    sets("lab"); lightLab(LW(0, 0.3, 0.6)); SLAB.visible = false; PDES.visible = PMADE.visible = false; BENCH.visible = true;
    if (t < at("gap")) { bench(smooth(prog(t, fr("washer", 0.3), fr("washer", 0.6))), 0, t); move(t, at("washer"), at("gap"), [LW(2.6, 1.1, 2.6), LW(0, 0.15, 0.5), 36], [LW(2.1, 0.9, 2.2), LW(0, 0.2, 0.6), 36], 0.01);
      hudShow("tool", win(t, fr("washer", 0.05), fr("washer", 0.5))); hudShow("mm", win(t, fr("washer", 0.5), at("gap"))); hudShow("diag", win(t, fr("washer", 0.05), at("gap")));
      callout("lensL", t, fr("washer", 0.55), at("gap"), LENS.getWorldPosition(V()), 760, 1390); callout("ghostL", t, fr("washer", 0.65), at("gap"), LENS_GHOST.getWorldPosition(V()).add(V(0, 0.18, 0)), 300, 760); }
    else { bench(1, smooth(prog(t, fr("gap", 0.25), fr("gap", 0.75))), t); move(t, at("gap"), at("fix"), [LW(1.2, 0.75, 2.2), LW(0, 0.3, 0.84), 30], [LW(0.95, 0.62, 1.9), LW(0, 0.3, 0.84), 30], 0.01);
      callout("washL", t, fr("gap", 0.72), at("fix"), BW.getWorldPosition(V()), 760, 1390); hudShow("diag", win(t, at("gap"), at("fix"))); }
  } else if (t < at("orbi")) { // FIX (1993): COSTAR into the aft bay, the light comes to one focus again; then the real before/after
    if (t < fr("sharp", 0.5)) {
      if (t < at("sharp")) { sets("space"); lightSpace(); xray(1); COSTAR.visible = true; const k = smooth(prog(t, fr("fix", 0.2), fr("fix", 0.6))); COSTAR.position.set(0, -0.95 - (1 - k) * 4.5, FZ - 1.0);
        rays(1, t < fr("fix", 0.62)); move(t, at("fix"), at("sharp"), [V(8.5, -2.0, 8.5), V(0, -3.6, 0), 40], [V(7.2, -2.6, 7.0), V(0, -4.0, 0), 40], 0.02);
        hudShow("fix", win(t, fr("fix", 0.05), at("sharp"))); hudShow("diag", win(t, fr("fix", 0.1), at("sharp"))); callout("costarL", t, fr("fix", 0.55), at("sharp"), COSTAR.getWorldPosition(V()), 760, 1390); callout("sharpL", t, fr("fix", 0.7), at("sharp"), IL(0, 0, FZ), 300, 700); skyAt(); }
      else { sets("panels"); WIPE.visible = true; H.key.castShadow = false; H.hemi.intensity = 0.8; PU.uW.value = smooth(prog(t, fr("sharp", 0.04), fr("sharp", 0.4)));
        move(t, at("sharp"), fr("sharp", 0.5), [PW(0.3, 0.1, 4.6), PW(0, 0, 0), 40], [PW(0.1, 0, 4.2), PW(0, 0, 0), 40], 0.01); hudShow("ba", win(t, at("sharp"), fr("sharp", 0.5))); skyAt(); } }
    else { sets("space"); lightSpace(); const a = 2.4 + (t - at("sharp")) * 0.05; move(t, fr("sharp", 0.5), at("orbi"), [V(Math.sin(a) * 30, 12, Math.cos(a) * 30), V(0, -6, 0), 42], [V(Math.sin(a + 0.04) * 34, 13, Math.cos(a + 0.04) * 34), V(0, -7, 0), 42], 0.02);
      hudShow("hconst", win(t, fr("sharp", 0.55), at("orbi"))); skyAt(); }
  } else { // ORBI: its own passcode; twelve wrong tries, then locked
    sets("orbi"); H.key.color.set(0xfff1e0); H.key.intensity = 2.2; H.key.position.copy(OW(3, 8, 6)); H.key.target.position.copy(OW(0, 1, 0)); H.key.castShadow = true; H.hemi.intensity = 0.5; H.hemi.color.set(0x8090a8); H.envK.value = 0.8; H.rimA.intensity = 0.8;
    const tries = t < at("orbi2") ? Math.floor(4 * smooth(prog(t, fr("orbi", 0.25), at("orbi2")))) : Math.min(12, 4 + Math.floor(8.999 * prog(t, at("orbi2"), fr("orbi2", 0.78))));
    const locked = tries >= 12 && t > fr("orbi2", 0.8); const cyc = ((t * 2.6) % 1); const n = locked ? 0 : tries < 12 ? Math.min(4, Math.floor(cyc * 5)) : 4;
    screen(PH, { n, tries, bad: !locked && cyc > 0.8 && tries > 0, locked }, drawPh);
    PIPS.forEach((p, i) => { const on = i < tries; p.material.color.setRGB(on ? 2.4 : 0.25, on ? 0.35 : 0.3, on ? 0.28 : 0.35); p.scale.setScalar(on ? 1.25 : 1); });
    LOCK.visible = locked; if (locked) { const k = back(clamp(prog(t, fr("orbi2", 0.8), fr("orbi2", 0.95)))); LOCK.scale.setScalar(0.9 * k); LOCK.rotation.y = 0.3 * Math.sin(t * 1.5); }
    H.$("tN").textContent = String(tries); hudShow("tries", win(t, fr("orbi", 0.25), at("orbi3")));
    if (t < at("orbi3")) move(t, at("orbi"), at("orbi3"), [OW(0.6, 1.5, 5.8), OW(0, 1.25, 0), 40], [OW(0.2, 1.4, 5.1), OW(0, 1.25, 0), 40], 0.05);
    else move(t, at("orbi3"), at("end"), [OW(0.2, 1.4, 5.1), OW(0, 1.25, 0), 40], [OW(0.1, 1.35, 4.8), OW(0, 1.25, 0), 40], 0.05);
    hudShow("chips", win(t, fr("orbi3", 0.1), at("end")));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
