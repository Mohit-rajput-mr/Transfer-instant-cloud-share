
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; KEP.visible = sp; SKYG.visible = sp || s === "tr"; TR.visible = s === "tr"; WH.visible = s === "wh"; ORS.visible = s === "orbi"; RAYS.forEach((m) => (m.visible = false));
  scene.fog = null; scene.background = s === "wh" ? new THREE.Color(0x05070a) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(1800); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.2 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x7d90b0); H.hemi.groundColor.set(0x2a2622); H.hemi.intensity = 0.45; H.envK.value = 0.8; H.rimA.intensity = 0.6; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(3, 6, 5)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));

H.frame("Show only what matters.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.35; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000); KEP.rotation.set(0, 0, 0);

  if (t < at("dip")) { // HOOK · THIS
    sets("space"); lightSpace(); skyAt();
    if (t < at("this")) { const w = 0.05 * Math.sin(t * 1.3); KEP.rotation.set(w, 0, w * 0.6); move(t, 0, at("this"), [V(-6, 2.5, 12), V(0, 0.4, 0), 40], [V(-4.5, 1.8, 9.5), V(0, 0.4, 0), 40], 0.03);
      title(t, fr("hook", 0.04), fr("hook", 0.6), "NASA's planet hunter", "Balanced on sunlight", 150); }
    else { const a = 2.0 + (t - at("this")) * 0.12; move(t, at("this"), at("dip"), [KC.clone().add(V(Math.cos(a) * 10, 3, Math.sin(a) * 10)), KC, 40], [KC.clone().add(V(Math.cos(a + 0.1) * 8.6, 2.6, Math.sin(a + 0.1) * 8.6)), KC, 40], 0.02);
      callout("nasa", t, fr("this", 0.15), at("dip"), KL(0, -1.6, 0), 300, 1390); callout("aperture", t, fr("this", 0.35), at("dip"), KL(0, 2.4, 0), 760, 600); hudShow("stars", win(t, fr("this", 0.5), at("dip"))); }
  } else if (t < at("wheels")) { // DIP: the transit diagram
    sets("tr"); TR.updateMatrixWorld(true); HALO.quaternion.copy(H.cam.quaternion); skyAt(); sunGlow.visible = false;
    const k = prog(t, at("dip"), fr("dip", 0.8)); PLAN.position.set(lerp(-6, 6, k), 0.4, 3.5); look(TW(0, 0.8, 18), TW(0, 1.2, 0), 40); curve(k);
    hudShow("curve", 1); hudShow("diag", 1); H.$("plN").textContent = Math.round(2000 * smooth(prog(t, fr("dip", 0.6), at("wheels")))).toLocaleString("en-US") + "+"; hudShow("planets", win(t, fr("dip", 0.6), at("wheels")));
    callout("planetL", t, fr("dip", 0.1), fr("dip", 0.6), TW(PLAN.position.x, 0.4, 3.5), 760, 600);
  } else if (t < at("idea")) { // WHEELS · FAIL
    sets("wh"); WH.updateMatrixWorld(true); lightAt(WH.position, 0.4); const dead = t > fr("fail", 0.1) ? [1, 3] : t > at("fail") - 1.5 ? [1] : [];
    wheels(t, dead, at("fail")); move(t, at("wheels"), at("idea"), [WW(0, 4.6, 5.6), WW(0, 0, 0), 40], [WW(0, 4.0, 4.8), WW(0, 0, 0), 40], 0.01);
    hudShow("need", win(t, at("wheels"), at("fail"))); hudShow("may", win(t, fr("fail", 0.15), at("idea"))); hudShow("diag", 1);
    if (dead.length) callout("deadL", t, fr("fail", 0.15), at("idea"), WW(1.3, 0.6, 0), 760, 1000);
  } else if (t < at("orbi")) { // IDEA · BALANCE · K2: sunlight pushing evenly
    sets("space"); lightSpace(); skyAt();
    const settle = smooth(prog(t, at("balance"), fr("balance", 0.6))); const w = 0.12 * (1 - settle) * Math.sin(t * 1.7); KEP.rotation.set(0, 0, w);
    sunlight(t, smooth(prog(t, fr("idea", 0.3), fr("idea", 0.8))) * (t < at("k2") ? 1 : 1 - smooth(prog(t, at("k2"), fr("k2", 0.4)))));
    if (t < at("k2")) move(t, at("idea"), at("k2"), [V(0.5, 3.5, 12), V(0, 0, 0), 40], [V(0.3, 3, 10), V(0, 0, 0), 40], 0.01);
    else move(t, at("k2"), at("orbi"), [V(0.3, 3, 10), V(0, 0, 0), 40], [V(-6, 4, 15), V(0, 0.5, 0), 40], 0.02);
    callout("sunL", t, fr("idea", 0.5), at("k2"), KL(1.2, 0.5, 0), 760, 1000); hudShow("third", win(t, fr("balance", 0.55), at("k2"))); hudShow("k2", win(t, fr("k2", 0.2), at("orbi")));
  } else { // ORBI: the Filter
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const open = t > fr("orbi", 0.6) && t < fr("orbi2", 0.35); const hover = t > at("orbi2") && t < fr("orbi2", 0.35) ? 1 : -1; const kind = t > fr("orbi2", 0.3) ? "photo" : "all"; const fade = smooth(prog(t, fr("orbi2", 0.3), fr("orbi2", 0.55)));
    screen(PH, { open, hover, kind, fade: Math.round(fade * 20) / 20 }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], [OW(-0.15, 1.35, 3.4), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
