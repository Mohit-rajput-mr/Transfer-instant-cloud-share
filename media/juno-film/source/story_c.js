
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; JNO.visible = sp; JUP.visible = sp || s === "jup"; SKYG.visible = sp || s === "photo" || s === "jup"; VLT.visible = s === "vlt"; ORS.visible = s === "orbi"; if (GRSB) GRSB.visible = false;
  scene.fog = null; scene.background = s === "vlt" ? new THREE.Color(0x05070a) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(SUN, 9000); sunGlow.scale.setScalar(600); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.0 * k; H.key.position.copy(SUN).multiplyScalar(40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x9a8a78); H.hemi.groundColor.set(0x2a2622); H.hemi.intensity = 0.45; H.envK.value = 0.8; H.rimA.intensity = 0.6; H.rimB.intensity = 0.35; }
function lightAt(c, hemi = 0.4) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(3, 6, 5)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const JPOS = V(-400, -900, -2600);

H.frame("Make it together.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 60000); JU.uT.value = t; JNO.rotation.set(0, t * 0.2, 0);

  if (t < at("this")) { // HOOK: the real image made by people at home (or Jupiter illustration as a fallback)
    if (GRSB) { sets("photo"); look(V(0, 0, 30), V(0, 0, 0), 40); board(GRSB, GRS_AR, V(0, 0, 0), lerp(21, 23, prog(t, 0, at("this")))); hudShow("real", 1); skyAt(); sunGlow.visible = false; }
    else { sets("jup"); JUP.position.set(0, 0, 0); look(V(0, 0, 2400), V(0, 0, 0), 40); skyAt(); hudShow("illus", 1); }
    title(t, fr("hook", 0.04), fr("hook", 0.6), "Made by people at home", GRSB ? "Jupiter, real photo" : "Jupiter", 150);
  } else if (t < at("vault")) { // THIS · SOLAR · WEAK: Juno, Jupiter behind
    sets("space"); JUP.position.copy(JPOS); lightSpace(); skyAt();
    if (t < at("solar")) { const a = 0.4 + (t - at("this")) * 0.1; move(t, at("this"), at("solar"), [JC.clone().add(V(Math.cos(a) * 26, 8, Math.sin(a) * 26)), JC, 40], [JC.clone().add(V(Math.cos(a + 0.1) * 22, 6.5, Math.sin(a + 0.1) * 22)), JC, 40], 0.02);
      callout("nasa", t, fr("this", 0.15), at("solar"), JL(0, -1, 0), 300, 1390); hudShow("arrive", win(t, fr("this", 0.45), at("solar"))); }
    else { move(t, at("solar"), at("vault"), [V(6, 12, 18), V(3, 0, 0), 40], [V(5, 10, 15), V(3, 0, 0), 40], 0.02); callout("arm", t, fr("solar", 0.1), fr("solar", 0.8), JL(6, 0, 0), 760, 1000);
      H.$("cN").textContent = Math.round(18698 * smooth(prog(t, fr("solar", 0.3), fr("solar", 0.9)))).toLocaleString("en-US"); hudShow("cells", win(t, fr("solar", 0.25), at("weak"))); hudShow("watts", win(t, fr("weak", 0.2), at("vault"))); }
  } else if (t < at("cam")) { // VAULT (diagram)
    sets("vlt"); VLT.updateMatrixWorld(true); lightAt(VLT.position, 0.4); radiation(t); move(t, at("vault"), at("cam"), [VW(1.6, 1.4, 3.6), VW(0, 0, 0), 38], [VW(1.2, 1.1, 3.0), VW(0, 0, 0), 38], 0.01);
    callout("vaultL", t, fr("vault", 0.2), at("cam"), VW(0.5, 0.3, 0), 760, 1000); callout("elecL", t, fr("vault", 0.45), at("cam"), VW(-0.1, 0, 0.3), 300, 1390); hudShow("diag", 1);
  } else if (t < at("orbi")) { // CAM · PUBLIC: Juno with Jupiter, then the real image again
    if (t < at("public")) { sets("space"); JUP.position.copy(JPOS); lightSpace(); skyAt(); move(t, at("cam"), at("public"), [V(-10, -4, 20), V(0, -1, 0), 40], [V(-8, -3, 16), V(0, -1, 0), 40], 0.02); hudShow("raw", win(t, fr("cam", 0.4), at("public"))); }
    else if (GRSB) { sets("photo"); look(V(0, 0, 30), V(0, 0, 0), 40); board(GRSB, GRS_AR, V(0, 0, 0), lerp(23, 20, prog(t, at("public"), at("orbi")))); hudShow("real", 1); skyAt(); sunGlow.visible = false; }
    else { sets("jup"); JUP.position.set(0, 0, 0); look(V(0, 0, 2400), V(0, 0, 0), 40); skyAt(); hudShow("illus", 1); }
  } else { // ORBI: the bubble board
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const n = t < at("orbi2") ? Math.min(3, 1 + Math.floor(prog(t, fr("orbi", 0.3), at("orbi2")) * 3)) : 4; const edit = t > fr("orbi2", 0.6) ? 1 : 0; const blink = edit ? (t < fr("orbi2", 0.7) ? 1 : 2) : 0;
    screen(PH, { n, edit, blink }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], [OW(-0.15, 1.35, 3.4), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
