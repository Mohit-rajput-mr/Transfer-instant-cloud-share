
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { MARS.visible = s === "mars"; AIRB.visible = s === "air"; ORS.visible = s === "orbi"; ING.visible = s === "mars"; scene.fog = s === "mars" ? MFOG : null; scene.background = s === "air" || s === "orbi" ? new THREE.Color(0x07080a) : null; }
function lightMars(c, r = 3) { H.key.color.set(0xffe9d0); H.key.intensity = 2.6; H.key.position.copy(c).addScaledVector(SUN, r * 4); H.key.target.position.copy(c); const s = H.key.shadow.camera; Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 0.1, far: r * 10 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0005; H.key.shadow.normalBias = 0.01; H.key.castShadow = true;
  H.hemi.color.set(0xe0b08a); H.hemi.groundColor.set(0x7a4a30); H.hemi.intensity = 0.75; H.envK.value = 0.55; H.rimA.intensity = 0.25; H.rimB.intensity = 0.2; }
function lightStudio() { H.key.color.set(0xffffff); H.key.intensity = 1.6; H.key.position.set(ORS.position.x + 3, 6, 4); H.key.target.position.copy(ORS.position); H.key.castShadow = false; H.hemi.color.set(0x8090b0); H.hemi.groundColor.set(0x181818); H.hemi.intensity = 0.6; H.envK.value = 0.6; }
function ingAt(y, yaw = 0, tilt = 0) { ING.position.set(0, marsH(0, 0) + y, 0); ING.rotation.set(tilt, yaw, 0); ING.updateMatrixWorld(true); }

H.frame("Direct first. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.25; H.grade.uniforms.uVig.value = 0.3; camRange(0.01, 20000); AU.uT.value = t; PATHS.visible = false; DUST.visible = false; rotors(t, 0);

  if (t < at("air")) { // HOOK, THIS, CLOTH: hovering over Jezero; then the machine; then the swatch under the panel
    sets("mars");
    if (t < at("this")) { const y = 3 + Math.sin(t * 1.3) * 0.08; ingAt(y, t * 0.1); rotors(t, 2600); DUST.visible = true; dust(t, ING.position, 1, y); lightMars(ING.position);
      move(t, 0, at("this"), [IL(-2.6, 0.2, 3.6), IL(0, 0.25, 0), 34], [IL(-2.2, 0.15, 3.0), IL(0, 0.25, 0), 34], 0.04); title(t, fr("hook", 0.05), fr("hook", 0.6), "Mars", "A piece of 1903", 150); }
    else if (t < at("cloth")) { ingAt(0, 0.6); lightMars(ING.position); const a = 0.6 + (t - at("this")) * 0.15; move(t, at("this"), at("cloth"), [IL(Math.sin(a) * 3.0, 0.9, Math.cos(a) * 3.0), IL(0, 0.28, 0), 34], [IL(Math.sin(a + 0.1) * 2.7, 0.8, Math.cos(a + 0.1) * 2.7), IL(0, 0.28, 0), 34], 0.01);
      title(t, fr("this", 0.05), fr("this", 0.45), "NASA's Mars helicopter", "Ingenuity", 150); callout("nasa", t, fr("this", 0.4), fr("this", 0.7), IL(0.35, 0.15, 0.3), 760, 1150); hudShow("stats", win(t, fr("this", 0.6), at("cloth"))); }
    else { ingAt(0, 0.6); lightMars(ING.position); move(t, at("cloth"), at("air"), [IL(0.55, 0.42, 0.75), IL(0, 0.5, 0.06), 34], [IL(0.42, 0.44, 0.58), IL(0, 0.5, 0.06), 30], 0.003);
      callout("solar", t, fr("cloth", 0.1), fr("cloth", 0.5), IL(0.05, 0.515, -0.1), 760, 900); callout("cloth", t, fr("cloth", 0.35), at("air"), IL(0, 0.505, 0.06), 300, 1150); }
  } else if (t < at("rpm")) { // THIN AIR: Earth box vs Mars box; then "26 km"
    sets("air"); airMove(t); H.key.intensity = 1; H.hemi.intensity = 0.6; const P = (x, y, z) => AIRB.localToWorld(V(x, y, z));
    move(t, at("air"), at("rpm"), [P(0, 1.5, 8.2), P(0, 1, 0), 34], [P(0, 1.4, 7.6), P(0, 1, 0), 34], 0.01);
    callout("earthA", t, fr("air", 0.2), at("rpm"), P(-0.75, 1.5, 0), 300, 520); callout("marsA", t, fr("air", 0.45), at("rpm"), P(0.75, 1.5, 0), 760, 520); hudShow("alt", win(t, at("high"), at("rpm")));
  } else if (t < at("first")) { // RPM, COAX, ALONE: spin-up close to the rotors; then flying itself
    sets("mars"); ingAt(0, 0.6); lightMars(ING.position);
    if (t < at("coax")) { const rpm = 2900 * smooth(prog(t, at("rpm"), fr("rpm", 0.7))); rotors(t, rpm); DUST.visible = rpm > 800; dust(t, ING.position, rpm / 2900 * 0.7, 0);
      move(t, at("rpm"), at("coax"), [IL(1.4, 0.9, 1.6), IL(0, 0.38, 0), 34], [IL(1.2, 0.8, 1.4), IL(0, 0.38, 0), 34], 0.01); H.$("rN").textContent = Math.round(rpm).toLocaleString("en-US"); hudShow("rpm", win(t, fr("rpm", 0.05), at("coax"))); }
    else if (t < at("alone")) { rotors(t, 900); move(t, at("coax"), at("alone"), [IL(2.4, 0.38, 0.3), IL(0, 0.37, 0), 30], [IL(2.2, 0.4, 0.25), IL(0, 0.37, 0), 30], 0.01);
      callout("top", t, fr("coax", 0.1), at("alone"), IL(0.0, 0.42, 0.5), 760, 800); callout("bot", t, fr("coax", 0.3), at("alone"), IL(0.0, 0.31, -0.5), 300, 1150); }
    else { const y = 1.2 + Math.sin(t) * 0.1; ingAt(y, t * 0.2); rotors(t, 2600); DUST.visible = true; dust(t, ING.position, 1, y); move(t, at("alone"), at("first"), [IL(-4, 1.2, 4.5), IL(0, 0.2, 0), 36], [IL(-3.6, 1.0, 4.0), IL(0, 0.2, 0), 36], 0.05); hudShow("delay", win(t, fr("alone", 0.2), at("first"))); }
  } else if (t < at("orbi")) { // FIRST FLIGHT (rise 3 m, hover ~40 s, land — sped up), the field name, 72 flights
    sets("mars");
    if (t < at("more")) { const L = at("more") - at("first"); const u = prog(t, at("first"), at("more")); const y = u < 0.15 ? 3 * smooth(u / 0.15) : u > 0.85 ? 3 * (1 - smooth((u - 0.85) / 0.15)) : 3; ingAt(y, 0.6); rotors(t, u < 0.98 ? 2550 : 600); DUST.visible = true; dust(t, ING.position, 1, y); lightMars(ING.position);
      move(t, at("first"), at("more"), [V(-7, 1.6, 8), V(0, marsH(0, 0) + 1.4, 0), 36], [V(-6.2, 1.8, 7), V(0, marsH(0, 0) + 1.6, 0), 36], 0.05);
      H.$("fH").textContent = `${y.toFixed(1)} m`; H.$("fT").textContent = `${Math.round(u * 39.1)} s`; hudShow("first", win(t, fr("first", 0.05), fr("field", 0.3))); hudShow("sped", win(t, fr("first", 0.1), fr("field", 0.3))); hudShow("date", win(t, fr("first", 0.02), fr("first", 0.5)));
      callout("field", t, fr("field", 0.3), at("more"), V(0, marsH(0, 0), 0), 760, 1150); }
    else { ingAt(0, 0.6); lightMars(V(0, 0, 0), 60); PATHS.visible = true; scene.fog = null; move(t, at("more"), at("orbi"), [V(-6, 110, 20), V(15, 0, 6), 40], [V(-6, 100, 22), V(15, 0, 6), 40], 0.03);
      const n = t < fr("more", 0.35) ? 5 : Math.round(lerp(5, 72, smooth(prog(t, fr("more", 0.35), fr("more", 0.8))))); H.$("flN").textContent = String(n); H.$("flL").textContent = n <= 5 ? "FLIGHTS PLANNED" : "FLIGHTS FLOWN"; hudShow("flights", win(t, fr("more", 0.02), at("orbi"))); }
  } else { // ORBI: direct first, storage fallback
    sets("orbi"); lightStudio(); ORS.updateMatrixWorld(true); const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
    const tFail = fr("orbi2", 0.45); const mode = t > tFail ? 1 : 0; const p = mode ? clamp(prog(t, tFail + 0.3, fr("orbi3", 0.6))) : clamp(prog(t, fr("orbi", 0.4), tFail)) * 0.35;
    screen(pA, { mode, p: Math.round(p * 30) / 30 }, drawA); screen(pB, { p: Math.round(clamp(mode ? p : p) * 30) / 30 }, drawB);
    [DIRECT, UPL, DNL].forEach((m) => (m.material.uniforms.uT.value = t)); DIRECT.material.uniforms.uK.value = mode ? 0.15 : clamp(prog(t, fr("orbi", 0.3), fr("orbi", 0.5))); UPL.material.uniforms.uK.value = DNL.material.uniforms.uK.value = mode ? 1 : 0;
    WALL.visible = mode === 1; WALL.material.opacity = 0.7 + 0.3 * Math.sin(t * 8);
    if (t < at("orbi3")) move(t, at("orbi"), at("orbi3"), [OW(0, 2.8, 9.2), OW(0, 2.0, -0.4), 44], [OW(0, 2.6, 8.4), OW(0, 2.0, -0.4), 44], 0.1);
    else move(t, at("orbi3"), at("end"), [OW(0, 2.8, 9.0), OW(0, 2.0, -0.4), 44], [OW(0, 2.7, 8.4), OW(0, 2.0, -0.4), 44], 0.1);
    callout("direct", t, fr("orbi", 0.45), tFail, OW(0, 1.9, 0.2), 760, 600); callout("stor", t, tFail + 0.3, at("end"), OW(0, 3.4, -1.2), 760, 500); hudShow("chips", win(t, fr("orbi3", 0.2), at("end")));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
