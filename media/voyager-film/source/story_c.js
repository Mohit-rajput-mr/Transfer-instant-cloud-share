
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; VOY.visible = sp; SKYG.visible = sp || s === "map" || s === "earth"; MAPG.visible = s === "map"; BOARD.visible = s === "board"; ORS.visible = s === "orbi"; EARTH.visible = s === "earth";
  BEAM.visible = false; scene.fog = null; scene.background = s === "board" ? new THREE.Color(0x05070a) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt(sunSize = 900) { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(sunSize); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 2.6 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86b8); H.hemi.groundColor.set(0x1a2a4a); H.hemi.intensity = 0.42; H.envK.value = 0.7; H.rimA.intensity = 0.9; H.rimB.intensity = 0.55; }
function lightAt(c, hemi = 0.35) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(4, 9, 6)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const UP = V(0, 1, 0);

H.frame("Open what you receive. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.35; H.grade.uniforms.uVig.value = 0.32; camRange(0.05, 30000); XU.uT.value = t; BU.uT.value = t; EU.uT.value = t;
  xray(0); chips(0, t); MEM.visible = false; code(0, 0, 0, 0, t); for (const id of ["teleT"]) {}

  if (t < at("far")) { // HOOK · THIS · DISH: Voyager in the dark, its signal leaving for home
    sets("space"); lightSpace(); skyAt(700);
    if (t < at("this")) { beam(BEAM, t, DISH_TOP, UP, { speed: 7, gap: 1.6, len: 70, size: 1.6, grow: 0.06 });
      move(t, 0, at("this"), [V(7, 6.5, 17), V(0, 0.3, 1.5), 40], [V(5, 5, 12.5), V(0, 0.5, 1.5), 40], 0.03);
      title(t, fr("hook", 0.04), fr("hook", 0.55), "18 November 2026", "One light-day", 150); hudShow("lday", win(t, fr("hook", 0.5), at("this"))); }
    else if (t < at("dish")) { const a = 0.6 + (t - at("this")) * 0.16; const C = V(0, 1.2, 3.5); move(t, at("this"), at("dish"), [C.clone().add(V(Math.cos(a) * 17, 4, Math.sin(a) * 17)), C, 40], [C.clone().add(V(Math.cos(a + 0.1) * 15.5, 3.5, Math.sin(a + 0.1) * 15.5)), C, 40], 0.02);
      beam(BEAM, t, DISH_TOP, UP, { speed: 7, gap: 1.6, len: 40, size: 1.4, grow: 0.06, k: 0.6 });
      callout("nasa", t, fr("this", 0.25), at("dish"), V(0, 0.8, 0.9), 300, 1390); callout("boomL", t, fr("this", 0.5), at("dish"), VL(0, 1.2, 9), 760, 1000); hudShow("launch", win(t, fr("this", 0.45), at("dish"))); }
    else { move(t, at("dish"), at("far"), [V(5.5, 4.2, 6.5), DISH_C, 36], [V(4.6, 3.4, 5.4), V(0, 1.6, 0), 36], 0.02);
      beam(BEAM, t, DISH_TOP, UP, { speed: 5, gap: 1.0, len: 22, size: 1.2, grow: 0.08 }); callout("dishL", t, fr("dish", 0.1), at("far"), V(-1.6, 1.9, 0.4), 300, 1000); hudShow("radio", win(t, fr("dish", 0.2), at("far"))); }
  } else if (t < at("gib")) { // FAR: the map, 1 AU = 0.1; a light pulse home and back
    sets("map"); MAPG.updateMatrixWorld(true); H.key.intensity = 0.6; H.hemi.intensity = 0.6; H.envK.value = 0.4; skyAt(0.0001); MAPG.updateMatrixWorld(true);
    const halo = MAPG.userData.halo; halo.lookAt(H.cam.position); halo.quaternion.copy(H.cam.quaternion);
    const k1 = prog(t, fr("far", 0.05), fr("far", 0.55)), k2 = prog(t, fr("far", 0.6), at("gib") - 0.3);
    if (k2 <= 0) pulseAt(smooth(k1), 1, new THREE.Color(0.8, 0.92, 1.3)); else pulseAt(smooth(k2), -1, new THREE.Color(1.3, 0.9, 0.4));
    const hrs = k2 <= 0 ? 24 * smooth(k1) : 24 + 24 * smooth(k2); H.$("hN").textContent = `${Math.round(hrs)} h`; H.$("hN").nextElementSibling.textContent = k2 <= 0 ? "SIGNAL ON ITS WAY HOME" : "AND THE ANSWER BACK";
    const mid = MW(VPOS.x * 0.5, VPOS.y * 0.5, VPOS.z * 0.5).add(V(0, -0.6, 0)); move(t, at("far"), at("gib"), [mid.clone().add(V(3, 4, 27)), mid, 44], [mid.clone().add(V(2, 3, 24.5)), mid, 44], 0.01);
    hudShow("clock", win(t, fr("far", 0.04), at("gib"))); hudShow("ld", win(t, fr("far", 0.2), at("gib"))); hudShow("diag", win(t, fr("far", 0.0), at("gib")));
    callout("youL", t, fr("far", 0.02), at("gib"), MW(VPOS.x, VPOS.y, VPOS.z), 760, 470); callout("nepL", t, fr("far", 0.25), at("gib"), MW(3.01 * Math.cos(1.3), 0, 3.01 * Math.sin(1.3)), 300, 1000);
    callout("earthM", t, fr("far", 0.35), at("gib"), MW(EP().x, EP().y, EP().z), 760, 1000);
  } else if (t < at("cant")) { // GIB · CHIP: nonsense from the dish → X-ray into the bus → the board, one chip dies
    if (t < at("chip")) { sets("space"); lightSpace(); skyAt(700); beam(BEAM, t, DISH_TOP, UP, { speed: 6, gap: 1.3, len: 30, size: 1.3, grow: 0.07, garble: smooth(prog(t, at("gib"), fr("gib", 0.35))) });
      move(t, at("gib"), at("chip"), [V(-9, 1.5, 9), V(0, 2.6, 0), 40], [V(-7.5, 1.8, 7.5), V(0, 3, 0), 40], 0.05); tele(t, t < fr("gib", 0.3) ? "clean" : "junk"); hudShow("tele", win(t, at("gib"), at("chip"))); hudShow("date23", win(t, fr("gib", 0.3), at("chip"))); }
    else if (t < fr("chip", 0.32)) { sets("space"); lightSpace(); skyAt(700); xray(smooth(prog(t, at("chip"), fr("chip", 0.15)))); move(t, at("chip"), fr("chip", 0.32), [V(9, 3.6, 8.2), V(0.3, 1.0, 0.2), 34], [V(6.0, 2.6, 5.6), V(0.35, 0.85, 0.2), 34], 0.01);
      callout("fdsL", t, fr("chip", 0.08), fr("chip", 0.32), VL(0.42, 0.8, 0.22), 760, 1390); hudShow("diag", 1); }
    else { sets("board"); BOARD.updateMatrixWorld(true); lightAt(BOARD.position, 0.3); chips(smooth(prog(t, fr("chip", 0.38), fr("chip", 0.55))), t); const B = CHIPS[BAD].position;
      move(t, fr("chip", 0.32), at("cant"), [BW(3.2, 4.4, 4.6), BW(0, 0, 0), 38], [BW(B.x + 1.6, 2.3, B.z + 2.6), BW(B.x, 0, B.z), 38], 0.01);
      callout("badL", t, fr("chip", 0.5), at("cant"), BW(B.x, 0.15, B.z), 760, 1000); hudShow("pct", win(t, fr("chip", 0.6), at("cant"))); hudShow("diag", 1); }
  } else if (t < at("pieces")) { // CANT: nobody can go there: pull back until Voyager is a speck in the dark
    sets("space"); lightSpace(); skyAt(500); const k = smooth(prog(t, at("cant"), at("pieces")));
    const d = lerp(10, 420, Math.pow(k, 1.6)); look(V(0.4, 0.3, 1).normalize().multiplyScalar(d).add(V(0, 1.5, 0)), V(0, 1.5, 0), 40); hudShow("far24", win(t, fr("cant", 0.15), at("pieces")));
    beam(BEAM, t, DISH_TOP, UP, { speed: 6, gap: 1.3, len: 30, size: 1.3, grow: 0.07, garble: 1, k: 1 - k });
  } else if (t < at("send")) { // PIECES: the memory map; the code won't fit; cut into pieces; linked
    sets("board"); lightAt(BOARD.position, 0.35); chips(1, t); MEM.visible = true;
    const kShow = prog(t, at("pieces"), fr("pieces", 0.1)), kTry = prog(t, fr("pieces", 0.08), fr("pieces", 0.42)), kFly = prog(t, fr("pieces", 0.5), fr("pieces", 0.85)), kLink = prog(t, fr("pieces", 0.82), at("send"));
    MEM.position.y = lerp(0.3, 0.9, smooth(kShow)); BOARD.updateMatrixWorld(true); code(kShow, kTry, kFly, kLink, t);
    move(t, at("pieces"), at("send"), [BW(0.3, 9.6, 6.4), BW(0, 0.8, -0.4), 40], [BW(0.2, 9.0, 5.8), BW(0, 0.8, -0.4), 40], 0.01);
    callout("gapL", t, fr("pieces", 0.15), fr("pieces", 0.48), MEMW(1.5, 0, 0), 300, 1000); hudShow("nofit", win(t, fr("pieces", 0.2), fr("pieces", 0.5)));
    callout("piecesL", t, fr("pieces", 0.62), at("send"), MEMW(14.5, 4, 0.1), 760, 1390); callout("linkL", t, fr("pieces", 0.85), at("send"), MEMW(7.5, 6, 0.4), 300, 1390); hudShow("cut", win(t, fr("pieces", 0.5), at("send"))); hudShow("diag", 1);
  } else if (t < at("back")) { // SEND: from Earth, the first piece; waiting
    sets("earth"); lightAt(EARTH.position, 0.05); H.key.intensity = 0; H.hemi.intensity = 0.05; skyAt(1400); EARTH.updateMatrixWorld(true); EARTH.rotation.y = 2.2 + t * 0.03;
    const E = EARTH.position, dir = V(-0.45, 0.85, 0.2).normalize(); beam(BEAM, t, E.clone().addScaledVector(dir, 6.5), dir, { speed: 5, gap: 2.0, len: 60, size: 2.6, grow: 0.05, ok: 0, k: smooth(prog(t, at("send"), fr("send", 0.15))) });
    BEAM.userData.items.forEach((m) => m.material.uniforms.uC.value.set(1.4, 0.85, 0.3));
    move(t, at("send"), at("back"), [E.clone().add(V(10, -9, 17)), E.clone().add(V(-1, 3, 0)), 40], [E.clone().add(V(8, -6, 14)), E.clone().add(V(-2, 7, -1)), 40], 0.02);
    hudShow("sent", win(t, fr("send", 0.1), fr("send", 0.62))); H.$("wN").textContent = `${Math.round(45 * smooth(prog(t, fr("send", 0.6), at("back") + 1.4)))} h`; hudShow("wait", win(t, fr("send", 0.6), at("back") + 1.4));
  } else if (t < at("orbi")) { // BACK: the answer: readable again
    sets("space"); lightSpace(); skyAt(700); beam(BEAM, t, DISH_TOP, UP, { speed: 6, gap: 1.3, len: 34, size: 1.3, grow: 0.07, ok: smooth(prog(t, fr("back", 0.1), fr("back", 0.3))) });
    if (t < at("back") + 1.4) { H.$("wN").textContent = `${Math.round(45 * smooth(prog(t, fr("send", 0.6), at("back") + 1.4)))} h`; hudShow("wait", win(t, fr("send", 0.6), at("back") + 1.4)); }
    const a = 2.2 + (t - at("back")) * 0.1; const C = V(0, 1.6, 1); move(t, at("back"), at("orbi"), [C.clone().add(V(Math.cos(a) * 12, 2.5, Math.sin(a) * 12)), C, 40], [C.clone().add(V(Math.cos(a + 0.1) * 11, 3, Math.sin(a + 0.1) * 11)), C, 40], 0.02);
    tele(t, "ok"); hudShow("tele", win(t, fr("back", 0.25), at("orbi"))); hudShow("okd", win(t, fr("back", 0.25), at("orbi"))); hudShow("five", win(t, fr("back", 0.45), at("orbi")));
  } else { // ORBI: open what you receive, right away
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const kinds = ["pdf", "image", "video", "doc", "sheet", "slides"]; let kind = "pdf", ki = 0;
    if (t >= at("orbi2")) { const u = clamp((t - at("orbi2")) / (at("orbi3") - at("orbi2"))); ki = Math.min(5, Math.floor(u * 6)); kind = kinds[ki]; }
    const sel = t < at("orbi2") ? Math.min(7, Math.max(0, Math.floor(prog(t, fr("orbi", 0.45), fr("orbi", 0.85)) * 8))) : 0;
    const copied = t > fr("orbi", 0.88) && t < at("orbi2"); const play = kind === "video" ? clamp((t - at("orbi2")) / 3) : 0;
    screen(PH, { kind, sel, copied, play, toast: copied ? "Copied all text" : t > at("orbi3") ? "Opened · nothing downloaded" : "", dl: false }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.35, 3.0), OW(0, 1.25, 0), 36], 0.02);
    else if (t < at("orbi3")) move(t, at("orbi2"), at("orbi3"), [OW(0.25, 1.35, 3.0), OW(0, 1.25, 0), 36], [OW(-0.2, 1.3, 2.9), OW(0, 1.25, 0), 36], 0.02);
    else move(t, at("orbi3"), end("end") + 1.5, [OW(-0.2, 1.3, 2.9), OW(0, 1.25, 0), 36], [OW(0.1, 1.4, 4.2), OW(0, 1.2, 0), 36], 0.02);
    PH.g.rotation.y = 0.12 * Math.sin(t * 0.4);
    for (let i = 0; i < 6; i++) { const e = H.$("kd" + i); if (e) { const on = t >= at("orbi2") && i === ki; e.style.borderColor = on ? green : "rgba(255,255,255,.25)"; e.style.color = on ? green : "#fff"; e.style.transform = on ? "scale(1.08)" : "none"; } }
    hudShow("kinds", win(t, at("orbi2"), at("orbi3") + 0.2)); hudShow("chips", win(t, at("orbi3") + 0.1, at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
