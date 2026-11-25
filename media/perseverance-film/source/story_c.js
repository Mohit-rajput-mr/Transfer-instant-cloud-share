
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { MARS.visible = s === "mars"; ROV.visible = s === "mars" && true; SPC.visible = s === "space"; TRN.visible = s === "trn"; CHUTE.visible = s === "chute"; ORS.visible = s === "orbi"; FIRE.visible = false;
  scene.fog = s === "mars" ? MFOG : null; scene.background = s === "space" ? new THREE.Color(0x000000) : s === "trn" ? new THREE.Color(0x05070a) : s === "chute" ? new THREE.Color(0xb98a66) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function lightMars(k = 1) { H.key.color.set(0xffe6cc); H.key.intensity = 3.4 * k; H.key.position.copy(SUN).multiplyScalar(30); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 80 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0xe0b090); H.hemi.groundColor.set(0x7a4a30); H.hemi.intensity = 0.55; H.envK.value = 0.75; H.rimA.intensity = 0.5; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.35) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(4, 9, 6)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x8f9ab8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const BITS = [["D", 4], ["A", 1], ["R", 18], ["E", 5]];

H.frame("Knock to enter. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 20000); TRU.uT.value = t;

  if (t < at("fast")) { // HOOK · THIS: Perseverance at Jezero
    sets("mars"); lightMars();
    if (t < at("this")) { move(t, 0, at("this"), [V(-5.5, 1.1, 6.5), RC, 40], [V(-3.8, 1.0, 4.8), RC, 40], 0.03);
      title(t, fr("hook", 0.04), fr("hook", 0.6), "Hidden in plain sight", "A secret on Mars", 150); }
    else { const a = 2.3 + (t - at("this")) * 0.14; move(t, at("this"), at("fast"), [RC.clone().add(V(Math.cos(a) * 6.4, 1.6, Math.sin(a) * 6.4)), RC, 40], [RC.clone().add(V(Math.cos(a + 0.1) * 5.6, 1.3, Math.sin(a + 0.1) * 5.6)), RC, 40], 0.02);
      callout("nasa", t, fr("this", 0.15), at("fast"), RL(0.4, 1.0, -0.2), 300, 1390); hudShow("landed", win(t, fr("this", 0.55), at("fast"))); }
  } else if (t < at("eyes")) { // FAST: the fireball · LATE: 11 minutes to Earth
    if (t < at("late")) { sets("mars"); ROV.visible = false; lightMars(0.8); const k = prog(t, at("fast"), at("late")); FIRE.visible = true;
      const p0 = V(-260, 140, -420), p1 = V(140, 40, -180); FIRE.position.copy(p0).lerp(p1, k); FIRE.lookAt(p1.clone().add(p1.clone().sub(p0))); FIRE.scale.setScalar(7);
      look(V(0, 1.4, 6), FIRE.position.clone().lerp(V(0, 20, -200), 0.3), 44); callout("fireL", t, at("fast") + 0.3, fr("fast", 0.6), FIRE.position.clone(), 760, 700);
      H.$("sN").textContent = Math.round(20000 * (1 - 0.98 * smooth(prog(t, fr("fast", 0.3), at("late"))))).toLocaleString("en-US"); hudShow("speed", win(t, at("fast"), at("late"))); hudShow("seven", win(t, fr("fast", 0.5), at("late"))); hudShow("diag", 1); }
    else { sets("space"); SPC.updateMatrixWorld(true); H.key.intensity = 2.0; H.key.position.copy(SPC.position).add(V(20, 5, 30)); H.key.target.position.copy(SPC.position); H.hemi.intensity = 0.25; H.envK.value = 0.4;
      const k = prog(t, fr("late", 0.05), fr("late", 0.95)); PULSE.position.copy(V(0, 8.2, 0).lerp(V(0, -7.8, 0), k)); PEARTH.rotation.y = t * 0.2; PMARS.rotation.y = t * 0.1;
      move(t, at("late"), at("eyes"), [SW(8, 1, 29), SW(0, 0, 0), 44], [SW(7, 0.8, 27), SW(0, 0, 0), 44], 0.01);
      const mins = 11 * k; H.$("cN").textContent = `${Math.floor(mins)}:${String(Math.floor((mins % 1) * 60)).padStart(2, "0")}`; hudShow("clock", win(t, at("late"), at("eyes"))); hudShow("done", win(t, fr("late", 0.5), at("eyes"))); hudShow("diag", 1);
      callout("marsL", t, at("late"), at("eyes"), SW(1.0, 9.5, 0.6), 760, 560); callout("earthL", t, at("late"), at("eyes"), SW(1.4, -8.4, 1.0), 760, 1390); }
  } else if (t < at("chute")) { // EYES: terrain-relative navigation
    sets("trn"); TRN.updateMatrixWorld(true); lightAt(TRN.position, 0.45); const k = prog(t, at("eyes"), at("chute"));
    const tg = V(-0.4, 0.5, -0.6).lerp(V(1.0, 0.5, 2.4), smooth(clamp((k - 0.35) / 0.5))); TARGET.position.copy(tg);
    SQUARES.forEach((s, i) => { const on = k > 0.1 + i * 0.05; s.visible = on; s.material.opacity = on ? 0.5 + 0.5 * Math.sin(t * 6 + i) : 0; });
    move(t, at("eyes"), at("chute"), [TW(0.5, 16, 7), TW(0.3, 0, 0.6), 40], [TW(0.4, 13, 5.5), TW(0.3, 0, 0.6), 40], 0.01);
    callout("hazL", t, fr("eyes", 0.2), at("chute"), TW(-1.2, 0.45, -0.6), 300, 1000); callout("tgtL", t, fr("eyes", 0.6), at("chute"), TW(tg.x, 0.5, tg.z), 760, 1390); hudShow("trn", win(t, fr("eyes", 0.3), at("chute"))); hudShow("diag", 1);
  } else if (t < at("orbi")) { // CHUTE · BITS · WORDS · CRACKED: the canopy as a diagram
    sets("chute"); CHUTE.updateMatrixWorld(true); lightAt(CHUTE.position.clone().add(V(0, 10, 0)), 0.6); H.key.position.copy(CHUTE.position).add(V(-6, -20, 10));
    const sp = (t - at("chute")) * 0.06; CHUTE.rotation.y = sp; CHUTE.updateMatrixWorld(true);
    if (t < at("bits")) { move(t, at("chute"), at("bits"), [CW(0, -40, 16), CW(0, 4, 0), 40], [CW(0, -30, 12), CW(0, 5, 0), 40], 0.02); hudShow("m21", win(t, fr("chute", 0.2), at("bits"))); }
    else if (t < at("cracked")) { move(t, at("bits"), at("cracked"), [CW(0, -22, 4), CW(0, 8, 0), 44], [CW(0, -18, 3), CW(0, 8, 0), 44], 0.01);
      if (t < at("words")) { const n = Math.min(4, 1 + Math.floor(prog(t, at("bits"), at("words")) * 4)); H.$("bitsT").innerHTML = BITS.slice(0, n).map(([c, v]) => `${c}=${v}=<span style="color:#ff8a4c">${v.toString(2)}</span>`).join("&nbsp; "); hudShow("bits", win(t, fr("bits", 0.1), at("words"))); }
      else { [0, 1, 2, 3].forEach((ri) => callout("r" + ri, t, fr("words", 0.05 + ri * 0.18), at("cracked"), ringAnchor(ri), ri % 2 ? 760 : 300, [520, 760, 1000, 1390][ri])); } }
    else { move(t, at("cracked"), at("orbi"), [CW(0, -18, 3), CW(0, 8, 0), 44], [CW(0, -26, 8), CW(0, 6, 0), 44], 0.02); hudShow("hours", win(t, at("cracked"), at("orbi"))); }
    hudShow("diag2", 1);
  } else { // ORBI: knock with 4 letters; someone inside lets you in
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const n = Math.min(4, Math.max(0, Math.floor((t - fr("orbi", 0.45)) / 0.3) + 1)) * (t > fr("orbi", 0.45) ? 1 : 0);
    const knocking = t > fr("orbi2", 0.15), bell = t > fr("orbi2", 0.3), press = t > fr("orbi2", 0.75), inn = t > fr("orbi2", 0.9);
    screen(PA, { n: Math.max(n, knocking ? 4 : 0), knocking: knocking && !inn, in: inn }, drawA); screen(PB, { bell: bell && !inn, press, toast: inn }, drawB);
    KNOCKLINE.visible = false; KNOCKLINE.material.color.setRGB(0.4 + 1.6 * (0.5 + 0.5 * Math.sin(t * 8)), 2.0, 0.9);
    // one phone at a time: the knocker (left), the member inside (right) as the bell rings, then back to the knocker, in
    const A0 = [OW(-0.45, 1.3, 2.35), OW(-0.55, 1.25, 0), 36], B0 = [OW(0.45, 1.3, 2.35), OW(0.55, 1.25, 0), 36];
    if (t < fr("orbi2", 0.25)) move(t, at("orbi"), fr("orbi2", 0.25), [OW(0.0, 1.6, 4.6), OW(-0.3, 1.25, 0), 36], A0, 0.02);
    else if (t < fr("orbi2", 0.4)) move(t, fr("orbi2", 0.25), fr("orbi2", 0.4), A0, B0, 0.0);
    else if (t < fr("orbi2", 0.85)) move(t, fr("orbi2", 0.4), fr("orbi2", 0.85), B0, B0, 0.01);
    else if (t < at("orbi3")) move(t, fr("orbi2", 0.85), at("orbi3"), B0, A0, 0.0);
    else move(t, at("orbi3"), end("end") + 1.5, A0, [OW(0, 1.4, 4.4), OW(0, 1.25, 0), 36], 0.02);
    hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
