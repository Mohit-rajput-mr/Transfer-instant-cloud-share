
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; MARSG.visible = MRO.visible = sp; SKYG.visible = sp; PHOTO.visible = s === "photo"; GEO.visible = s === "geo"; ORS.visible = s === "orbi";
  scene.fog = null; scene.background = s === "photo" ? new THREE.Color(0x050608) : s === "geo" ? new THREE.Color(0xc79a78) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(1800); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.0 * k; H.key.position.copy(SUN).multiplyScalar(60); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 140 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x9a8a7a); H.hemi.groundColor.set(0x5a3020); H.hemi.intensity = 0.5; H.envK.value = 0.8; H.rimA.intensity = 0.5; H.rimB.intensity = 0.3; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(30, 60, 40)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0xe0b090); H.hemi.groundColor.set(0x7a4a30); H.hemi.intensity = hemi; H.envK.value = 0.5; H.rimA.intensity = 0.6; H.rimB.intensity = 0.4; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const camOn = (px, py, d) => { const p = PXL(px, py); return [p.clone().add(V(0, 0, d)), p, 40]; };

H.frame("Every detail, ready to tap.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000); MU.uT.value = t;

  if (t < at("this")) { // HOOK · WHAT: the real photo; the parachute; the crater behind
    if (t < at("what")) { sets("photo"); PHOTO.updateMatrixWorld(true); move(t, 0, at("what"), camOn(640, 318, 17), camOn(560, 318, 13), 0.0);
      title(t, fr("hook", 0.04), fr("hook", 0.6), "Real photo from Mars orbit", "Falling in?", 150); hudShow("real", 1); hudShow("date", win(t, fr("hook", 0.5), at("what"))); }
    else if (t < fr("what", 0.55)) { sets("photo"); PHOTO.updateMatrixWorld(true); move(t, at("what"), fr("what", 0.55), camOn(560, 318, 13), camOn(INSET_PX[0] + 20, INSET_PX[1] - 20, 2.4), 0.0); hudShow("real", 1);
      callout("chuteL", t, at("what") + 0.4, fr("what", 0.55), PXL(80, 528), 760, 600); }
    else { sets("geo"); GEO.updateMatrixWorld(true); lightAt(GEO.position); move(t, fr("what", 0.55), at("this"), [GW(8, 16, 50), GW(7, 8, 0), 40], [GW(7, 14, 44), GW(7, 8, 0), 40], 0.01);
      callout("phxG", t, fr("what", 0.6), at("this"), GW(0, 15, 0), 300, 600); callout("craterG", t, fr("what", 0.7), at("this"), GW(20, 0.5, 0), 760, 1000); hudShow("illusion", win(t, fr("what", 0.65), at("this"))); hudShow("diag", 1); }
  } else if (t < at("first")) { // THIS · CAM · SHOT: the orbiter over Mars
    sets("space"); lightSpace(); skyAt();
    if (t < at("cam")) { const a = 0.6 + (t - at("this")) * 0.12; move(t, at("this"), at("cam"), [MC.clone().add(V(Math.cos(a) * 26, 7, Math.sin(a) * 26)), MC, 40], [MC.clone().add(V(Math.cos(a + 0.1) * 23, 6, Math.sin(a + 0.1) * 23)), MC, 40], 0.02);
      callout("nasa", t, fr("this", 0.25), at("cam"), ML(0, 0.5, 0.5), 300, 1390); }
    else if (t < at("shot")) { move(t, at("cam"), at("shot"), [V(9, -6, 13), V(0, -1, 0.5), 40], [V(7, -5, 10.5), V(0, -1.2, 0.5), 40], 0.02); hudShow("hirise", win(t, fr("cam", 0.2), at("shot")));
      callout("dishL", t, fr("cam", 0.1), fr("cam", 0.5), ML(0, -0.5, 1.4), 760, 700); }
    else { const k = prog(t, at("shot"), at("first")); MRO.rotation.set(0, 0, -0.35 * smooth(clamp(k * 1.4))); move(t, at("shot"), at("first"), [V(-14, 4, 22), V(0, -3, 0), 42], [V(-12, 2, 18), V(0, -4, 0), 42], 0.04); hudShow("speed", win(t, fr("shot", 0.2), at("first"))); }
  } else if (t < at("orbi")) { // FIRST · TINY: back to the real photo — from the whole crater down to the few pixels
    sets("photo"); PHOTO.updateMatrixWorld(true); hudShow("real", 1);
    if (t < at("tiny")) { move(t, at("first"), at("tiny"), camOn(640, 318, 17), camOn(600, 318, 15), 0.0); hudShow("first", win(t, fr("first", 0.15), at("tiny"))); }
    else { if (t < fr("tiny", 0.5)) move(t, at("tiny"), fr("tiny", 0.5), camOn(600, 318, 15), camOn(CHUTE_PX[0], CHUTE_PX[1], 1.6), 0.0);
      else move(t, fr("tiny", 0.5), at("orbi"), camOn(CHUTE_PX[0], CHUTE_PX[1], 1.6), camOn(INSET_PX[0] + 20, INSET_PX[1] - 20, 2.0), 0.0);
      hudShow("tinyc", win(t, fr("tiny", 0.1), at("orbi"))); callout("craterL", t, at("tiny") + 0.2, fr("tiny", 0.4), PXL(640, 318), 760, 600); }
  } else { // ORBI: a note, every detail tappable
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const hi = t < at("orbi2") ? -1 : Math.floor(prog(t, at("orbi2"), fr("orbi2", 0.75)) * 5); const copied = t > fr("orbi2", 0.85);
    screen(PH, { hi, copied }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], [OW(-0.15, 1.35, 3.4), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
