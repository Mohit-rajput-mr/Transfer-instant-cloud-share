
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; OREX.visible = sp; SKYG.visible = sp; CUT.visible = s === "cut"; RING.visible = s === "ring"; ORS.visible = s === "orbi"; BENNU.visible = false;
  scene.fog = null; scene.background = sp ? null : s === "orbi" ? new THREE.Color(0x07080a) : new THREE.Color(0x05070a); }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(1500); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.0 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x8090a8); H.hemi.groundColor.set(0x2a2a2a); H.hemi.intensity = 0.45; H.envK.value = 0.8; H.rimA.intensity = 0.6; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.6; H.key.position.copy(c).add(V(3, 7, 5)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const C0 = V(0, 0.3, 0);

H.frame("Take your team private.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000);

  if (t < at("touch")) { // HOOK (Bennu, real photo) · THIS (the probe near Bennu)
    sets("space"); lightSpace(); skyAt();
    if (t < at("this")) { OREX.visible = false; look(V(0, 0, 30 - 6 * smooth(prog(t, 0, at("this")))), V(0, 0, 0), 40); bennuAt(V(0, -1, -2), lerp(13, 15, prog(t, 0, at("this"))));
      title(t, fr("hook", 0.04), fr("hook", 0.6), "Real photo: asteroid Bennu", "It almost swallowed it", 150); hudShow("real", 1); }
    else { const a = 0.8 + (t - at("this")) * 0.12; move(t, at("this"), at("touch"), [C0.clone().add(V(Math.cos(a) * 12, 3.0, Math.sin(a) * 12)), C0, 40], [C0.clone().add(V(Math.cos(a + 0.1) * 10, 2.4, Math.sin(a + 0.1) * 10)), C0, 40], 0.02);
      bennuAt(H.cam.position.clone().add(V(0, -0.6, -1).normalize().multiplyScalar(400)).add(V(0, -90, 0)), 260);
      callout("nasa", t, fr("this", 0.15), at("touch"), OL(0, 0.2, 0.4), 300, 1390); callout("capsule", t, fr("this", 0.4), at("touch"), OL(0, 1.1, 0), 760, 600); hudShow("tag", win(t, fr("this", 0.5), at("touch"))); }
  } else if (t < at("home")) { // TOUCH · SINK · THRUST (diagram)
    sets("cut"); CUT.updateMatrixWorld(true); lightAt(CUT.position, 0.45);
    const tc = fr("touch", 0.35);                    // contact moment
    let hy, burst = 0;
    if (t < tc) hy = lerp(0.6, 0, smooth(prog(t, at("touch"), tc)));
    else if (t < fr("thrust", 0.4)) hy = -0.48 * smooth(prog(t, tc, fr("sink", 0.9)));
    else { hy = -0.48 + 1.2 * smooth(prog(t, fr("thrust", 0.4), at("home"))); burst = smooth(prog(t, fr("thrust", 0.4), at("home"))); }
    touch(t, hy, burst);
    move(t, at("touch"), at("home"), [CW(0.4, 0.3, 4.2), CW(0, -0.2, 0), 36], [CW(0.2, 0.1, 3.4), CW(0, -0.3, 0), 36], 0.01);
    if (t < at("sink")) { callout("headL", t, at("touch") + 0.2, at("sink"), CW(0.12, hy + 0.05, 0.1), 760, 600); callout("gasL", t, fr("touch", 0.45), at("sink"), CW(-0.35, hy + 0.25, 0), 300, 1000); }
    else if (t < at("thrust")) { H.$("dN").textContent = `${Math.round(Math.max(0, -hy) * 100)} cm`; hudShow("depth", 1); callout("sinkL", t, fr("sink", 0.4), at("thrust"), CW(0, hy, 0.1), 760, 1000); }
    else { H.$("sN").textContent = `${Math.min(6, Math.round(6 * prog(t, at("thrust"), fr("thrust", 0.4))))} s`; hudShow("sec", win(t, at("thrust"), at("home"))); }
    hudShow("diag", 1);
  } else if (t < at("orbi")) { // HOME · STUCK · TOOLS
    if (t < at("stuck")) { sets("space"); lightSpace(); skyAt(); OREX.visible = false; look(V(0, 0, 26), V(0, 0, 0), 40); bennuAt(V(0, -1, -2), 14); hudShow("real", 1); hudShow("utah", win(t, fr("home", 0.1), at("stuck"))); }
    else { sets("ring"); RING.updateMatrixWorld(true); lightAt(RING.position, 0.4); const kOut = smooth(prog(t, fr("stuck", 0.3), fr("stuck", 0.6))), kRed = smooth(prog(t, fr("stuck", 0.5), fr("stuck", 0.7))), kFix = smooth(prog(t, fr("tools", 0.4), at("orbi") - 0.3)); bolts(kRed, kFix, kOut);
      move(t, at("stuck"), at("orbi"), [RW(0, 5.2, 4.4), RW(0, 0, 0.2), 38], [RW(0, 4.4, 3.7), RW(0, 0, 0.2), 38], 0.01);
      if (t < at("tools")) callout("stuckL", t, fr("stuck", 0.6), at("tools"), RW(Math.cos(7 / 35 * TAU) * 1.05, 0.12, Math.sin(7 / 35 * TAU) * 1.05), 760, 1000); else hudShow("fixed", win(t, fr("tools", 0.3), at("orbi")));
      hudShow("diag", 1); }
  } else { // ORBI: go private with the team
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const press = t > fr("orbi2", 0.1) && t < fr("orbi2", 0.25), done = t > fr("orbi2", 0.25), invite = t > fr("orbi2", 0.3), join = t > fr("orbi2", 0.75), joined = t > fr("orbi2", 0.85);
    screen(PA, { press, done }, drawA); screen(PB, { invite, join, joined }, drawB);
    const A0 = [OW(-0.45, 1.3, 2.35), OW(-0.55, 1.25, 0), 36], B0 = [OW(0.45, 1.3, 2.35), OW(0.55, 1.25, 0), 36];
    if (t < fr("orbi2", 0.28)) move(t, at("orbi"), fr("orbi2", 0.28), [OW(0.0, 1.6, 4.6), OW(-0.3, 1.25, 0), 36], A0, 0.02);
    else if (t < fr("orbi2", 0.4)) move(t, fr("orbi2", 0.28), fr("orbi2", 0.4), A0, B0, 0.0);
    else if (t < at("orbi3")) move(t, fr("orbi2", 0.4), at("orbi3"), B0, B0, 0.01);
    else move(t, at("orbi3"), end("end") + 1.5, B0, [OW(0, 1.4, 4.4), OW(0, 1.25, 0), 36], 0.02);
    hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
