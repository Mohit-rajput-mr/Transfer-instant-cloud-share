
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; CAS.visible = sp; SKYG.visible = sp || s === "fin" || s === "photo" || s === "enc"; SAT.visible = s === "fin" || s === "sat"; ENCG.visible = s === "enc" && !ENCPHOTO; FIN.visible = s === "fin"; ORS.visible = s === "orbi";
  SATPHOTO.visible = false; if (ENCPHOTO) ENCPHOTO.visible = false; scene.fog = null; scene.background = s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(900); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.0 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x9a8f7a); H.hemi.groundColor.set(0x2a2622); H.hemi.intensity = 0.45; H.envK.value = 0.8; H.rimA.intensity = 0.6; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(3, 6, 5)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));

H.frame("Gone, when you say so.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.35; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 60000); SATU.uT.value = t;

  if (t < at("this")) { // HOOK: the real backlit Saturn photo
    sets("photo"); look(V(0, 0, 30), V(0, 0, 0), 40); board(SATPHOTO, SAT_AR, V(0, 0.5, 0), lerp(10.5, 12.5, prog(t, 0, at("this")))); skyAt(); sunGlow.visible = false;
    title(t, fr("hook", 0.04), fr("hook", 0.6), "Real photo, taken by Cassini", "Crashed on purpose", 150); hudShow("real", 1);
  } else if (t < at("ocean")) { // THIS: Cassini, Saturn behind
    sets("space"); SAT.visible = true; SAT.position.set(-800, -300, -3200); lightSpace(); skyAt(); sunGlow.visible = true;
    const a = 0.6 + (t - at("this")) * 0.12; move(t, at("this"), at("ocean"), [CC.clone().add(V(Math.cos(a) * 17, 4, Math.sin(a) * 17)), CC, 40], [CC.clone().add(V(Math.cos(a + 0.1) * 15, 3.4, Math.sin(a + 0.1) * 15)), CC, 40], 0.02);
    callout("nasa", t, fr("this", 0.15), at("ocean"), CL(0, -2, 0), 300, 1390); callout("dish", t, fr("this", 0.35), at("ocean"), CL(0, 2.4, 0), 760, 600); hudShow("years", win(t, fr("this", 0.4), at("ocean")));
  } else if (t < at("dives")) { // OCEAN · RISK: Enceladus' jets
    sets("enc"); skyAt(); sunGlow.visible = false;
    if (ENCPHOTO) { look(V(0, 0, 30), V(0, 0, 0), 40); board(ENCPHOTO, ENC_AR, V(0, 0.3, 0), lerp(11, 13, prog(t, at("ocean"), at("dives")))); hudShow("realE", 1); }
    else { ENCG.updateMatrixWorld(true); lightAt(ENCG.position.clone().add(V(0, 0, 0)), 0.15); H.key.position.copy(ENCG.position).add(V(20, 6, 8)); jets(t, smooth(prog(t, at("ocean"), fr("ocean", 0.4))));
      move(t, at("ocean"), at("dives"), [EW(5, -2.5, 15), EW(0, -2.8, 0), 40], [EW(4.4, -2.6, 13.2), EW(0, -3.0, 0), 40], 0.02); hudShow("illus", 1);
      callout("encL", t, fr("ocean", 0.1), at("risk"), EW(0.8, 1.6, 2), 760, 600); callout("jetsL", t, fr("ocean", 0.4), at("risk"), EW(-0.3, -4.2, 0), 300, 1000); }
    hudShow("fuel", win(t, fr("risk", 0.25), at("dives")));
  } else if (t < at("signal")) { // DIVES (diagram) · PLUNGE
    if (t < at("plunge")) { sets("fin"); SAT.position.set(0, 0, 0); H.key.position.copy(SUN).multiplyScalar(8000); H.key.target.position.set(0, 0, 0); H.key.intensity = 2.2; H.hemi.intensity = 0.1; skyAt(); sunGlow.visible = false;
      FIN.rotation.copy(SAT.rotation); const k = prog(t, at("dives"), at("plunge")); const n = Math.min(22, Math.floor(k * 23)); const a = (k * 22 % 1) * TAU; const r = 680 + 2200 * (1 - Math.cos(a)) / 2; CDOT.position.set(Math.cos(a) * r, Math.sin(a) * 900 * 0.3, Math.sin(a) * r * 0.25);
      look(V(800, 1600, 4200), V(300, 0, 0), 40); H.$("dvN").textContent = String(n); hudShow("dives", 1); hudShow("diag", 1); FIN.updateMatrixWorld(true); callout("gapL", t, fr("dives", 0.1), at("plunge"), FIN.localToWorld(V(680, 0, 0)), 760, 1000); }
    else { sets("space"); SAT.visible = true; SAT.position.set(0, -600, -260); lightSpace(); skyAt(); sunGlow.visible = true; const k = smooth(prog(t, at("plunge"), at("signal")));
      CAS.position.set(0, -k * 18, -k * 30); CAS.rotation.set(-0.4 * k, 0, 0.1 * k); move(t, at("plunge"), at("signal"), [V(14, 6, 22), V(0, -3, -6), 42], [V(10, 2, 16), V(0, -12, -24), 42], 0.03);
      hudShow("date", win(t, fr("plunge", 0.1), at("signal"))); }
  } else if (t < at("orbi")) { // SIGNAL: 83 minutes
    sets("photo"); look(V(0, 0, 30), V(0, 0, 0), 40); board(SATPHOTO, SAT_AR, V(0, 0.5, 0), lerp(12.5, 9.5, prog(t, at("signal"), at("orbi")))); skyAt(); sunGlow.visible = false;
    H.$("sgN").textContent = `${Math.round(83 * smooth(prog(t, at("signal"), fr("signal", 0.8))))} min`; hudShow("sig", 1); hudShow("dist", win(t, fr("signal", 0.2), at("orbi"))); hudShow("real", 1);
  } else { // ORBI: destroy, gone for everyone
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const press = t > fr("orbi2", 0.15) && t < fr("orbi2", 0.3); const gone = smooth(prog(t, fr("orbi2", 0.28), fr("orbi2", 0.45))); const toast = t > fr("orbi2", 0.3);
    screen(PA, { press, gone, toast }, drawA); screen(PB, { gone: smooth(prog(t, fr("orbi2", 0.32), fr("orbi2", 0.5))) }, drawB);
    const A0 = [OW(-0.45, 1.3, 2.35), OW(-0.55, 1.25, 0), 36], W0 = [OW(0, 1.45, 4.2), OW(0, 1.25, 0), 36];
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.0, 1.6, 4.8), OW(-0.3, 1.25, 0), 36], A0, 0.02);
    else if (t < fr("orbi2", 0.4)) move(t, at("orbi2"), fr("orbi2", 0.4), A0, A0, 0.01);
    else move(t, fr("orbi2", 0.4), end("end") + 1.5, A0, W0, 0.02);
    hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
