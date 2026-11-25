
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { SPACE.visible = s === "space"; LAND.visible = s === "land"; TL.visible = s === "tiles"; HG.visible = s === "hangar"; ORB.visible = s !== "tiles";
  scene.fog = s === "land" ? LFOG : null; scene.background = s === "tiles" ? new THREE.Color(0x0a0b0d) : null; }
function lightLand(c) { H.key.color.set(0xffe2c0); H.key.intensity = 3.2; H.key.position.copy(c).addScaledVector(SUN_L, 120); H.key.target.position.copy(c); const s = H.key.shadow.camera; Object.assign(s, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0xb8cce6); H.hemi.groundColor.set(0x6a7058); H.hemi.intensity = 0.9; H.envK.value = 0.5; H.rimA.intensity = 0.3; H.rimB.intensity = 0.25; }
function lightSpace() { H.key.color.set(0xfff4e6); H.key.intensity = 2.6; H.key.position.copy(ORB.position).addScaledVector(SUN_S, 100); H.key.target.position.copy(ORB.position); H.key.castShadow = false; H.hemi.color.set(0x4a6a9a); H.hemi.groundColor.set(0x6a8ab0); H.hemi.intensity = 0.4; H.envK.value = 0.4; H.rimA.intensity = 0.2; H.rimB.intensity = 0; }
function lightHangar() { H.key.intensity = 0.0; H.key.castShadow = false; H.hemi.color.set(0xd0d6e0); H.hemi.groundColor.set(0x404040); H.hemi.intensity = 0.7; H.envK.value = 0.7; H.rimA.intensity = 0.3; H.rimB.intensity = 0.3; }
function lightTiles(k) { H.key.color.set(0xffffff); H.key.intensity = 1.4; H.key.position.copy(TL.position).add(V(2, 4, 3)); H.key.target.position.copy(TL.position); H.key.castShadow = false; H.hemi.color.set(0xa0a8b8); H.hemi.groundColor.set(0x202020); H.hemi.intensity = 0.6; H.envK.value = 0.5; hot.intensity = 3 * k; }
const shake = (t, a) => { H.cam.position.x += Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6; H.cam.position.y += Math.sin(t * 53 + 1) * a; };
const HGP = (x, y, z) => HG.localToWorld(V(x, y, z));
function inHangar() { orbAt(HG.position.clone(), 0, 0.5); }
/** the approach: u = 0..1 from ~120 m high to touchdown; glide 4.5:1, flare near the ground */
function approach(u) { const z = lerp(-560, 0, u); let y = Math.max(0, -z / 4.5); const fl = smooth(clamp((40 - y) / 40)); y = y * (1 - 0.65 * fl) + (u > 0.97 ? 0 : 0); const pitch = lerp(-0.2, 0.12, fl); return { p: V(0, y, z), pitch }; }

H.frame("A QR code per file. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.28; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 30000); EU.uT.value = t;
  OU.uHeat.value = 0; OU.uHi.value = 0; OU.uT.value = t; plasma(0, t); GS.visible = false; OR.visible = false; PRESS.visible = false; scanBeam.visible = false;

  if (t < at("real")) { // HOOK: Discovery on final approach, steep and silent, the runway ahead
    sets("land"); const u = lerp(0.35, 0.62, prog(t, 0, at("real"))); const a = approach(u); orbAt(a.p, a.pitch); lightLand(a.p);
    move(t, 0, at("real"), [a.p.clone().add(V(-46, 6, 18)), a.p.clone().add(V(0, 3, 8)), 34], [a.p.clone().add(V(-40, 4, 26)), a.p.clone().add(V(0, 3, 10)), 34], 0.08);
    title(t, fr("hook", 0.05), fr("hook", 0.6), "Space Shuttle", "Engines off", 150);
  } else if (t < at("heat")) { // THE REAL ONE in the hangar; then its size from above
    sets("hangar"); lightHangar(); inHangar(); const c = HGP(0, 6, 0);
    if (t < at("size")) { const a = 2.6 + (t - at("real")) * 0.08; move(t, at("real"), at("size"), [c.clone().add(V(Math.sin(a) * 58, 6, Math.cos(a) * 58)), c, 36], [c.clone().add(V(Math.sin(a + 0.08) * 54, 5, Math.cos(a + 0.08) * 54)), c, 36], 0.05);
      title(t, fr("real", 0.05), fr("real", 0.4), "The real OV-103", "Discovery", 150); callout("scan", t, fr("real", 0.2), fr("real", 0.5), OL(0, 6, 8), 300, 1150); hudShow("flights", win(t, fr("real", 0.5), at("size"))); }
    else { move(t, at("size"), at("heat"), [c.clone().add(V(0.1, 92, 0.5)), c, 34], [c.clone().add(V(0.1, 86, 0.5)), c, 34], 0.03); H.cam.up.copy(V(Math.sin(0.5), 0, Math.cos(0.5))); H.cam.lookAt(c); H.cam.updateMatrixWorld();
      callout("len", t, fr("size", 0.1), at("heat"), OL(0, 4, 18.6), 760, 520); callout("span", t, fr("size", 0.45), at("heat"), OL(11.8, 2, -12), 300, 1150); }
  } else if (t < at("alu")) { // RE-ENTRY: nose high, belly first, 1,650 °C outside
    sets("space"); const p = V(0, 0, 0); orbAt(p, -0.7, 0.2, 0.15); OU.uFlow.value.copy(V(0, 1, 0.4).normalize().applyQuaternion(ORB.quaternion).negate().negate()); OU.uFlow.value.set(0, 1, 0).applyAxisAngle(V(1, 0, 0), 0); OU.uFlow.value.copy(V(0.0, 1.0, -0.6).normalize());
    OU.uHeat.value = smooth(prog(t, at("heat"), fr("heat", 0.4))); plasma(OU.uHeat.value, t); lightSpace(); earthAt(80, 28, -80, 0.3); H.bloom.strength = 0.5;
    move(t, at("heat"), at("alu"), [V(-55, -20, 48), V(0, 0, 0), 36], [V(-50, -17, 42), V(0, 0, 0), 36], 0.06); shake(t, 0.03);
    callout("belly", t, fr("heat", 0.4), at("alu"), OL(4, 0.5, 2), 760, 1150); hudShow("temps", win(t, fr("heat", 0.3), at("alu")));
  } else if (t < at("rcc")) { // THE TILES: section on the aluminium; count; crush one
    if (t < at("tiles")) { sets("tiles"); lightTiles(1); tiles(true, 0, t); TU.uHot.value = 1;
      move(t, at("alu"), at("tiles"), [TL.position.clone().add(V(0.75, 0.45, 0.6)), TL.position.clone().add(V(-0.1, -0.04, 0)), 36], [TL.position.clone().add(V(0.65, 0.38, 0.5)), TL.position.clone().add(V(-0.1, -0.04, 0)), 36], 0.005);
      callout("tilesL", t, fr("alu", 0.1), at("tiles"), TL.position.clone().add(V(-0.02, -0.01, 0.1)), 300, 1000); callout("alu", t, fr("alu", 0.4), at("tiles"), TL.position.clone().add(V(-0.05, -0.062, 0.2)), 760, 1250);
      hudShow("temps", win(t, at("alu"), at("tiles"))); hudShow("mag", win(t, fr("alu", 0.1), at("tiles"))); }
    else if (t < at("crush")) { sets("hangar"); lightHangar(); inHangar(); H.hemi.groundColor.set(0xb0b4ba); H.hemi.intensity = 1.3; const c = HGP(0, 0.8, 0);
      move(t, at("tiles"), at("crush"), [OL(6, -0.2, -6), OL(0, 0.9, 6), 50], [OL(5, -0.2, -2), OL(0, 0.9, 9), 50], 0.02);
      H.$("cN").textContent = Math.round(24000 * smooth(prog(t, fr("tiles", 0.05), fr("tiles", 0.7)))).toLocaleString("en-US"); H.$("cL").textContent = "TILES"; hudShow("count", win(t, fr("tiles", 0.02), at("crush"))); }
    else { sets("tiles"); lightTiles(0); TU.uHot.value = 0; const k = smooth(prog(t, fr("crush", 0.25), fr("crush", 0.7))); tiles(false, k, t); hot.intensity = 0; H.key.intensity = 2.2;
      const a = Math.floor(CRUSH_I / TN), b = CRUSH_I % TN; const cp = TL.position.clone().add(V((a - TN / 2 + 0.5) * TS, 0, (b - TN / 2 + 0.5) * TS));
      PRESS.visible = false; PRESS.position.copy(cp).sub(TL.position).add(V(0, lerp(0.25, 0.04 - 0.042 * k, smooth(prog(t, at("crush"), fr("crush", 0.3)))), 0));
      move(t, at("crush"), at("rcc"), [cp.clone().add(V(0.38, 0.32, 0.3)), cp.clone().add(V(0, -0.01, 0)), 34], [cp.clone().add(V(0.33, 0.28, 0.26)), cp.clone().add(V(0, -0.01, 0)), 34], 0.004);
      callout("core", t, fr("crush", 0.15), fr("crush", 0.5), cp.clone().add(V(0.05, -0.02, 0.07)), 300, 1150); callout("crushL", t, fr("crush", 0.55), at("rcc"), cp.clone().add(V(0, 0.0, 0)), 760, 1150); }
  } else if (t < at("glide")) { // RCC on the nose and wing edges; black below, white on top
    sets("hangar"); lightHangar(); inHangar();
    if (t < at("colour")) { OU.uHi.value = smooth(prog(t, at("rcc"), fr("rcc", 0.3))); move(t, at("rcc"), at("colour"), [OL(-22, 3, 38), OL(0, 3, 6), 36], [OL(-19, 2.5, 34), OL(0, 3, 6), 36], 0.03); callout("rcc", t, fr("rcc", 0.3), at("colour"), OL(0, 3.2, 17.4), 760, 1150); }
    else { const k = smooth(prog(t, at("colour"), fr("colour", 0.9))); const y = lerp(22, -2.0, k); move(t, at("colour"), at("glide"), [OL(-30, y, 10), OL(0, 3, 0), 40], [OL(-30, y, 10), OL(0, 3, 0), 40], 0.02);
      callout("white", t, fr("colour", 0.05), fr("colour", 0.45), OL(-5, 5.0, 2), 300, 1000); callout("black", t, fr("colour", 0.55), at("glide"), OL(-5, 1.2, 2), 760, 1250); }
  } else if (t < at("orbi")) { // THE GLIDE: 4.5 forward for 1 down; the steep dive; the flare and touchdown; then tiles still original
    if (t < at("orig")) { sets("land"); GS.visible = t < at("steep");
      const u = t < at("steep") ? lerp(0.05, 0.4, prog(t, at("glide"), at("steep"))) : lerp(0.4, 1.0, prog(t, at("steep"), at("orig"))); const a = approach(u); orbAt(a.p, a.pitch); lightLand(a.p);
      if (t < at("steep")) { move(t, at("glide"), at("steep"), [a.p.clone().add(V(-115, 4, 0)), a.p.clone().add(V(0, -12, 28)), 40], [a.p.clone().add(V(-105, 2, 6)), a.p.clone().add(V(0, -12, 28)), 40], 0.1); hudShow("ratio", win(t, fr("glide", 0.15), at("steep")));
        callout("path", t, fr("glide", 0.2), at("steep"), V(0, 70, -315), 760, 1150); callout("fwdL", t, fr("glide", 0.5), at("steep"), V(0, 0, -270), 300, 1350); callout("dnL", t, fr("glide", 0.65), at("steep"), V(0, 60, -540), 300, 900); }
      else { move(t, at("steep"), at("orig"), [a.p.clone().add(V(-34, 2, 30)), a.p.clone().add(V(0, 3, 6)), 36], [a.p.clone().add(V(-30, 1.5, 24)), a.p.clone().add(V(0, 3, 6)), 36], 0.1); } }
    else { sets("hangar"); lightHangar(); inHangar(); H.hemi.groundColor.set(0xb0b4ba); H.hemi.intensity = 1.3; move(t, at("orig"), at("orbi"), [OL(-8, -0.3, -4), OL(0, 1.0, 4), 46], [OL(-7, -0.3, 0), OL(0, 1.0, 8), 46], 0.02);
      H.$("cN").textContent = Math.round(lerp(24000, 18000, smooth(prog(t, fr("orig", 0.2), fr("orig", 0.7))))).toLocaleString("en-US"); H.$("cL").textContent = "STILL ORIGINAL"; hudShow("count", win(t, fr("orig", 0.05), at("orbi")));
      callout("newT", t, fr("orig", 0.5), at("orbi"), OL(2, 0.9, 6), 760, 1150); }
  } else { // ORBI: a QR code and a code
    sets("hangar"); lightHangar(); inHangar(); OR.visible = true; OR.updateMatrixWorld(true); const OW = (x, y, z) => OR.localToWorld(V(x, y, z)); orbiL.intensity = 0.6;
    const mode = t < fr("orbi2", 0.4) ? 0 : 1, typed = Math.round(clamp(prog(t, fr("orbi2", 0.45), fr("orbi2", 0.7))) * 4), open = t > fr("orbi2", 0.75);
    screen(phA, { a: 1 }, drawA); screen(phB, { mode, typed, open: open ? 1 : 0, got: Math.round(clamp(prog(t, fr("orbi2", 0.75), fr("orbi3", 0.5))) * 30) / 30 }, drawB);
    scanBeam.visible = mode === 0 && t > fr("orbi2", 0.05); scanBeam.position.copy(phB.g.position).add(phA.g.position).multiplyScalar(0.5); scanBeam.lookAt(OW(...phA.g.position.toArray())); scanBeam.rotateX(Math.PI / 2);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.2, 3.2, 6.0), OW(0, 0.6, -2), 44], [OW(0.3, 2.8, 5.2), OW(0, 0.6, -2), 44], 0.2);
    else if (t < at("orbi3")) { const pn = V(0, 0, 1).applyEuler(phB.g.rotation), pc = phB.g.position.clone(), up2 = V(0, 1, 0).applyEuler(phB.g.rotation);
      move(t, at("orbi2"), at("orbi3"), [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 36], [OW(...pc.clone().addScaledVector(pn, 2.8).toArray()), OW(...pc.toArray()), 36], 0.02);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); H.cam.updateMatrixWorld(); }
    else { move(t, at("orbi3"), at("end"), [OW(0.2, 3.0, 5.8), OW(0, 0.8, -2), 44], [OW(0.3, 2.7, 5.0), OW(0, 0.8, -2), 44], 0.2); hudShow("chips", win(t, fr("orbi3", 0.2), at("end"))); }
    callout("qr", t, fr("orbi", 0.3), fr("orbi2", 0.1), OW(...phA.g.position.clone().add(V(0, 0.15, -0.2)).toArray()), 300, 900); callout("code", t, fr("orbi", 0.6), fr("orbi2", 0.1), OW(...phA.g.position.clone().add(V(0, 0.05, 0.45)).toArray()), 760, 1150);
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
