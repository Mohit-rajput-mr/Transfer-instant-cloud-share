
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { SKYG.visible = s === "space"; MAP.visible = s === "map"; W.visible = s === "space"; scene.fog = null; scene.background = s === "map" ? new THREE.Color(0x05070a) : null; }
function lightSpace(k = 1) { H.key.color.set(0xfff6ea); H.key.intensity = 3.4 * k; H.key.position.copy(W.position).addScaledVector(SUN, 60); H.key.target.position.copy(W.position);
  const s = H.key.shadow.camera; Object.assign(s, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 140 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6a7ea6); H.hemi.groundColor.set(0x3a2e2a); H.hemi.intensity = 0.55; H.envK.value = 0.9; H.rimA.intensity = 0.6; H.rimB.intensity = 0.4; }
const C0 = V(-1, 4.5, 0);
function segGlow(t, k, stagger) { SEGS.forEach((m, i) => { const ph = clamp(k * 1.4 - (i % 18) / 18 * stagger); m.material.emissive = m.material.emissive || new THREE.Color(); });
  const mat = SEGS[0] && SEGS[0].material; if (mat) { mat.emissive.setRGB(0.25 * k, 0.17 * k, 0.04 * k); } }

H.frame("Nearby, live. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 20000); WU.uT.value = t; RU.uT.value = t; MU.uT.value = t;
  WU.uHeat.value = 0; WU.uCold.value = 0; RAYS.visible = false; FAIR.visible = false; EARTHM.visible = MOONM.visible = false; deploy(1, 1, 1); segGlow(t, 0, 0);
  W.position.set(0, 0, 0); W.rotation.set(0, 0, 0); W.updateMatrixWorld(true);

  if (t < at("this")) { // HOOK: folded inside the rocket fairing (diagram), then a hint of the unfolding
    sets("space"); const k = smooth(prog(t, fr("hook", 0.7), at("this") + 0.6)); deploy(k * 0.25, 0, 0); FAIR.visible = true; FAIR.position.set(-1.0, 5.6, 0); lightSpace();
    move(t, 0, at("this"), [V(-14, 9, 20), V(-1, 5, 0), 36], [V(-11, 7, 16), V(-1, 5, 0), 36], 0.04); skyAt();
    title(t, fr("hook", 0.05), fr("hook", 0.6), "Folded to fit", "Like origami", 150); callout("fairL", t, fr("hook", 0.4), at("this"), V(1.3, 8, 0), 760, 1150);
  } else if (t < at("cold")) { // THE TELESCOPE, the gold mirror, infrared light path
    sets("space"); lightSpace();
    if (t < at("mirror")) { const a = 1.0 + (t - at("this")) * 0.1; move(t, at("this"), at("mirror"), [C0.clone().add(V(Math.cos(a) * 34, 9, Math.sin(a) * 34)), C0, 36], [C0.clone().add(V(Math.cos(a + 0.08) * 31, 8, Math.sin(a + 0.08) * 31)), C0, 36], 0.03);
      title(t, fr("this", 0.05), fr("this", 0.5), "The largest telescope in space", "James Webb", 150); callout("nasa", t, fr("this", 0.45), at("mirror"), V(-5, 2.3, 4), 300, 1150); }
    else if (t < at("why")) { H.key.intensity = 1.4; H.envK.value = 0.5; move(t, at("mirror"), at("why"), [V(16, 7, 6), MIRROR_C, 34], [V(14, 6.6, 4.5), MIRROR_C, 34], 0.02); hudShow("mstats", win(t, fr("mirror", 0.15), at("why")));
      callout("gold", t, fr("mirror", 0.4), at("why"), V(1.1, 5.0, 2.3), 760, 1150); }
    else { RAYS.visible = true; RU.uK.value = smooth(prog(t, at("why"), fr("why", 0.6))); move(t, at("why"), at("cold"), [V(14, 13, 16), V(3, 6, 0), 38], [V(12, 12, 14), V(3, 6, 0), 38], 0.02);
      callout("ir", t, fr("why", 0.15), fr("why", 0.6), V(10, 7.5, 1.5), 760, 900); callout("sec", t, fr("why", 0.55), at("cold"), V(7.6, 6.6, 0), 300, 900); }
    skyAt();
  } else if (t < at("launch")) { // COLD: hot side vs cold side; then the five layers
    sets("space"); lightSpace(); WU.uHeat.value = smooth(prog(t, at("cold"), fr("cold", 0.3))); WU.uCold.value = WU.uHeat.value;
    if (t < at("shield")) { move(t, at("cold"), at("shield"), [V(4, -1.5, 30), V(-1, 3, 0), 38], [V(3, -1.0, 27), V(-1, 3, 0), 38], 0.03);
      hudShow("temps", win(t, fr("cold", 0.25), at("shield"))); callout("hot", t, fr("cold", 0.3), at("shield"), V(-4, 0.6, 3), 300, 1250); callout("coldL", t, fr("cold", 0.45), at("shield"), V(1, 6.5, 2), 760, 700); }
    else { move(t, at("shield"), at("launch"), [V(12.5, 2.8, 8.0), V(9.3, 1.6, 4.6), 34], [V(12.0, 2.6, 7.4), V(9.3, 1.6, 4.6), 34], 0.01); callout("layers", t, fr("shield", 0.35), at("launch"), V(9.4, 1.5, 4.0), 300, 1150); }
    skyAt();
  } else if (t < at("risk")) { // LAUNCH (folded, in the fairing diagram), then the deployment
    sets("space"); lightSpace();
    if (t < at("unfold")) { deploy(0, 0, 0); FAIR.visible = true; const rise = smooth(prog(t, fr("launch", 0.2), at("unfold"))) * 6; W.position.y = rise; FAIR.position.set(-1.0, 5.6, 0); W.updateMatrixWorld(true);
      move(t, at("launch"), at("unfold"), [V(-15, 6 + rise, 17), V(-1, 5 + rise, 0), 38], [V(-13, 7 + rise * 1.2, 15), V(-1, 5.5 + rise, 0), 38], 0.08); hudShow("launch", win(t, fr("launch", 0.1), at("unfold"))); }
    else { const ks = prog(t, fr("unfold", 0.05), fr("unfold", 0.45)), kb = prog(t, fr("unfold", 0.35), fr("unfold", 0.7)), kw = prog(t, fr("unfold", 0.7), fr("unfold", 0.98)); deploy(ks, kb, kw);
      move(t, at("unfold"), at("risk"), [V(-22, 18, 26), V(-1, 4, 0), 38], [V(-20, 16, 24), V(-1, 4, 0), 38], 0.03); hudShow("diag", win(t, fr("unfold", 0.05), at("risk")));
      callout("shieldL", t, fr("unfold", 0.15), fr("unfold", 0.6), V(-6, 1.5, 4), 300, 1150); callout("wings", t, fr("unfold", 0.72), at("risk"), V(1.0, 6.3, 2.5), 760, 900); }
    skyAt();
  } else if (t < at("orbi")) { // 344 steps; far from Earth; 50 nm alignment
    sets("space"); lightSpace();
    if (t < at("far")) { const a = 2.2 + (t - at("risk")) * 0.12; move(t, at("risk"), at("far"), [C0.clone().add(V(Math.cos(a) * 30, 12, Math.sin(a) * 30)), C0, 38], [C0.clone().add(V(Math.cos(a + 0.1) * 28, 11, Math.sin(a + 0.1) * 28)), C0, 38], 0.03);
      H.$("cN").textContent = String(Math.round(344 * smooth(prog(t, fr("risk", 0.05), fr("risk", 0.75))))); hudShow("count", win(t, fr("risk", 0.02), at("far"))); }
    else if (t < at("align")) { EARTHM.visible = MOONM.visible = true; const dir = SUN.clone().negate().multiplyScalar(-1); const E = V(-260, -110, 40); EARTHM.position.copy(E); EARTHM.scale.setScalar(5); MOONM.position.copy(E).add(V(-30, 18, 26)); MOONM.scale.setScalar(1.4); EARTHM.rotation.y = t * 0.05;
      move(t, at("far"), at("align"), [V(14, 9, -10), V(-60, -20, 10), 40], [V(12, 8, -9), V(-70, -24, 12), 40], 0.02); hudShow("far", win(t, fr("far", 0.2), at("align"))); callout("earthL", t, fr("far", 0.3), at("align"), E, 760, 1150); }
    else { H.key.intensity = 1.4; H.envK.value = 0.5; const k = smooth(prog(t, at("align"), fr("align", 0.6))); segGlow(t, k, 1); move(t, at("align"), at("orbi"), [V(12, 6.6, 0.5), MIRROR_C, 36], [V(10.5, 6.5, 0.4), MIRROR_C, 36], 0.01); hudShow("nm", win(t, fr("align", 0.1), at("orbi"))); }
    skyAt();
  } else { // ORBI: Nearby, from above
    sets("map"); H.key.intensity = 1.0; H.key.position.copy(MAP.position).add(V(20, 60, 30)); H.key.target.position.copy(MAP.position); H.hemi.intensity = 0.8; H.hemi.color.set(0xb0c0d8); H.envK.value = 0.5; H.key.castShadow = false;
    MAP.updateMatrixWorld(true); const M = (x, y, z) => MAP.localToWorld(V(x, y, z)); const src = PINS[0];
    const tShare = fr("orbi2", 0.1); const pr = clamp((t - tShare) / 1.0); const pulse = MAP.userData.pulse; pulse.visible = t > tShare; pulse.position.set(src.position.x, 0.1, src.position.z); pulse.scale.setScalar(2 + pr * 26); pulse.material.opacity = 1 - pr * 0.8;
    PINS.forEach((p, i) => { const lit = p.userData.inCell && t > tShare + 0.15 + 0.6 * p.position.distanceTo(src.position) / 40; p.userData.scr.material.color.set(i === 0 ? 0x3dff8c : lit ? 0x3dff8c : 0x14181d); p.userData.scr.material.color.multiplyScalar(i === 0 || lit ? 1.6 : 1); p.rotation.y = 0.5 * Math.sin(i * 2.3); });
    const fz = MAP.userData.fuzzy; fz.position.set(src.position.x + 3, 0.08, src.position.z - 2); fz.scale.setScalar(14); fz.visible = t > fr("orbi2", 0.55);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [M(0, 95, 40), M(0, 0, 0), 40], [M(0, 88, 34), M(0, 0, 0), 40], 0.05);
    else move(t, at("orbi2"), at("end"), [M(4, 82, 30), M(0, 0, -2), 40], [M(4, 76, 26), M(0, 0, -2), 40], 0.05);
    callout("nearby", t, fr("orbi", 0.3), at("orbi3"), M(26, 0, 13), 760, 1150); callout("others", t, fr("orbi2", 0.3), at("orbi3"), M(PINS[12].position.x, 1, PINS[12].position.z), 300, 600);
    hudShow("sec", win(t, fr("orbi2", 0.15), fr("orbi2", 0.6))); hudShow("chips", win(t, fr("orbi3", 0.2), at("end")));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
