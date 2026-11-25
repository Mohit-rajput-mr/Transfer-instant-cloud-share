
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; PSP.visible = sp; SUNG.visible = sp; SKYG.visible = sp || s === "orbit" || s === "earth"; ORB.visible = s === "orbit"; LAB.visible = s === "lab"; ORS.visible = s === "orbi"; EARTH.visible = s === "earth";
  DUST.visible = false; scene.fog = null; scene.background = s === "lab" ? new THREE.Color(0x05070a) : s === "orbi" ? new THREE.Color(0x07080a) : null; sunGlow.visible = false; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); }
function lightSun(k = 1) { H.key.color.set(0xfff0dc); H.key.intensity = 5.5 * k; H.key.position.set(0, 0, -40); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0xffc890); H.hemi.groundColor.set(0x1a2236); H.hemi.intensity = 0.35; H.envK.value = 0.8; H.rimA.intensity = 0.7; H.rimB.intensity = 0.5; }
function lightAt(c, hemi = 0.35) { H.key.color.set(0xfff1e0); H.key.intensity = 2.4; H.key.position.copy(c).add(V(4, 9, 6)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = hemi; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
// solar wind / dust streaks rushing past (speed cue)
const DUST = (() => { const N = 900, p = new Float32Array(N * 6); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.8), transparent: true, opacity: 0.5, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false })); m.frustumCulled = false; scene.add(m); m.visible = false; return m; })();
function dust(t, k, dir = V(1, 0, 0), len = 1.6) { DUST.visible = k > 0.01; if (!DUST.visible) return; const a = DUST.geometry.attributes.position.array; DUST.material.opacity = 0.45 * k;
  for (let i = 0; i < a.length / 6; i++) { const y = (hash(i * 1.7) - 0.5) * 30, z = (hash(i * 2.9) - 0.5) * 40; let x = ((hash(i * 4.1) * 80 - t * 60) % 80 + 80) % 80 - 40;
    const p = V(0, y, z).addScaledVector(dir, x); a.set([p.x, p.y, p.z, p.x + dir.x * len * k, p.y + dir.y * len * k, p.z + dir.z * len * k], i * 6); }
  DUST.geometry.attributes.position.needsUpdate = true; }
const C0 = V(0, 0, 0.6);

H.frame("See it live. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.45; H.grade.uniforms.uVig.value = 0.34; camRange(0.05, 30000); SUNU.uT.value = t; TU.uT.value = t; FOAMU.uT.value = t; EU.uT.value = t;
  TU.uK.value = 0; TU.uGlow.value = 0.25; PSP.rotation.set(0, 0, 0); PSP.position.set(0, 0, 0); pspMat();

  if (t < at("close")) { // HOOK · THIS: Parker, shield to the Sun, the corona filling the sky
    sets("space"); lightSun(); skyAt();
    if (t < at("this")) { dust(t, 1, V(1, 0.1, 0.2).normalize());
      move(t, 0, at("this"), [V(2.6, 1.4, 10.5), V(0, 2.6, -6), 44], [V(1.9, 1.0, 8.0), V(0, 2.3, -6), 44], 0.04); sunAt(V(0, 0, -1));
      title(t, fr("hook", 0.05), fr("hook", 0.6), "Fastest object ever built", "Touching the Sun", 150); hudShow("fast", win(t, fr("hook", 0.5), at("this"))); }
    else { const a = 0.9 + (t - at("this")) * 0.12; move(t, at("this"), at("close"), [C0.clone().add(V(Math.cos(a) * 9.5, 2.4, Math.sin(a) * 9.5)), C0, 40], [C0.clone().add(V(Math.cos(a + 0.1) * 8.6, 2.0, Math.sin(a + 0.1) * 8.6)), C0, 40], 0.02); sunAt(V(0, 0, -1));
      dust(t, 0.4, V(1, 0.1, 0.2).normalize()); callout("nasa", t, fr("this", 0.2), at("close"), PL(0.3, 0.6, 0.4), 300, 1390); callout("shieldL", t, fr("this", 0.45), at("close"), PL(0.6, 0.6, -1.65), 760, 1000); hudShow("named", win(t, fr("this", 0.5), at("close"))); }
  } else if (t < at("speed")) { // CLOSE: the orbit, to scale
    sets("orbit"); ORB.updateMatrixWorld(true); H.key.intensity = 0.6; H.hemi.intensity = 0.6; skyAt();
    const k = smooth(prog(t, at("close"), fr("close", 0.85))); const th = lerp(-2.2, 0, k); PDOT.position.copy(ellipse(th));
    const far = [OW2(V(4, 15, 22)), OW2(V(4, 0, 0)), 44], near = [OW2(V(0.6, 1.2, 2.4)), OW2(V(0.4, 0, 0)), 44]; move(t, at("close"), at("speed"), far, near, 0.0);
    H.$("dN").textContent = "6.1M km"; hudShow("dist", win(t, fr("close", 0.55), at("speed"))); hudShow("date", win(t, fr("close", 0.1), at("speed"))); hudShow("diag", 1);
    callout("merL", t, fr("close", 0.05), fr("close", 0.5), OW2(V(0, 0, MER)), 760, 700); callout("parkL", t, fr("close", 0.1), fr("close", 0.5), OW2(ellipse(-1.2)), 300, 1000);
    callout("periL", t, fr("close", 0.65), at("speed"), OW2(V(PERI, 0, 0)), 760, 1000);
  } else if (t < at("hot")) { // SPEED: streaking past · New York → Tokyo
    if (t < fr("speed", 0.45)) { sets("space"); lightSun(); skyAt(); dust(t, 1.6, V(1, 0, 0.15).normalize(), 3.0); sunAt(V(0, 0, -1));
      move(t, at("speed"), fr("speed", 0.45), [V(-4, 1.5, 7), C0, 40], [V(-2.5, 0.8, 5.5), C0, 40], 0.08); const kk = smooth(prog(t, at("speed"), fr("speed", 0.4)));
      H.$("kN").textContent = Math.round(692000 * kk).toLocaleString("en-US"); hudShow("kmh", win(t, at("speed"), fr("speed", 0.45))); }
    else { sets("earth"); lightAt(EARTH.position, 0.05); H.key.intensity = 0; skyAt(); EARTH.rotation.set(0.35, 1.9, 0); EARTH.updateMatrixWorld(true);
      const k = smooth(prog(t, fr("speed", 0.5), fr("speed", 0.9))); ARC.material.uniforms.uK.value = k; HEAD.position.copy(ARC.userData.curve.getPointAt(Math.min(0.999, k)));
      const mid = EW(ARC.userData.curve.getPointAt(0.5)); const E = EARTH.position; const out = mid.clone().sub(E).normalize();
      move(t, fr("speed", 0.45), at("hot"), [E.clone().addScaledVector(out, 27).add(V(0, -3, 0)), E.clone().addScaledVector(out, 1.5), 40], [E.clone().addScaledVector(out, 24.5).add(V(0, -3, 0)), E.clone().addScaledVector(out, 1.5), 40], 0.02);
      H.$("tN").textContent = `${Math.round(56 * k)} s`; hudShow("nyt", win(t, fr("speed", 0.5), at("hot")));
      callout("nycL", t, fr("speed", 0.5), at("hot"), EW(NYC), 300, 1390); callout("tyoL", t, fr("speed", 0.6), at("hot"), EW(TYO), 760, 1390); }
  } else if (t < at("cool")) { // HOT · SHIELD: the glowing face, then the cut-open sandwich
    if (t < at("shield")) { sets("space"); lightSun(0.35); H.envK.value = 0.4; skyAt(); TU.uGlow.value = 0.2 + 0.7 * smooth(prog(t, at("hot"), fr("hot", 0.7))); sunAt(V(-0.3, -0.12, -1).normalize());
      move(t, at("hot"), at("shield"), [V(4.2, 2.0, -9.8), V(0, 0, -1.2), 40], [V(3.0, 1.4, -7.8), V(0, 0, -1.2), 40], 0.02);
      H.$("cN").textContent = `${(Math.round(1400 * smooth(prog(t, at("hot"), fr("hot", 0.75))) / 10) * 10).toLocaleString("en-US")} °C`; hudShow("temp", win(t, at("hot"), at("shield"))); callout("frontL", t, fr("hot", 0.4), at("shield"), PL(-0.4, 0.3, -1.68), 300, 1390); }
    else { sets("lab"); lightAt(LAB.position, 0.35); LAB.updateMatrixWorld(true); const a = -0.5 + (t - at("shield")) * 0.08; const Cc = LW(0, -0.0, 0);
      move(t, at("shield"), at("cool"), [Cc.clone().add(V(Math.sin(a) * 3.2, 0.9, Math.cos(a) * 3.2)), Cc, 34], [Cc.clone().add(V(Math.sin(a + 0.08) * 2.7, 0.7, Math.cos(a + 0.08) * 2.7)), Cc, 34], 0.01);
      const top = SLAB.userData.top; callout("coatL", t, fr("shield", 0.05), at("cool"), LW(-0.4, -0.3 + top, 0.3), 760, 600); callout("skinL", t, fr("shield", 0.1), at("cool"), LW(0.5, -0.3 + 0.024, 0.4), 760, 1000);
      callout("foamL", t, fr("shield", 0.3), at("cool"), LW(-0.55, -0.3 + 0.048 + 0.23, 0.4), 300, 760); hudShow("thick", win(t, fr("shield", 0.4), at("cool"))); hudShow("diag", 1); }
  } else if (t < at("wait")) { // COOL (thermal view) · ALONE (it steers itself)
    sets("space"); lightSun(); skyAt(); sunAt(V(0, 0, -1));
    if (t < at("alone")) { TU.uK.value = smooth(prog(t, at("cool"), fr("cool", 0.2))); TU.uGlow.value = 0; const a = 0.15 + (t - at("cool")) * 0.1;
      const C1 = V(0, 0, -0.4); move(t, at("cool"), at("alone"), [C1.clone().add(V(Math.cos(a) * 10.5, 2.4, Math.sin(a) * 10.5)), C1, 40], [C1.clone().add(V(Math.cos(a + 0.08) * 9.6, 2.0, Math.sin(a + 0.08) * 9.6)), C1, 40], 0.02);
      hudShow("two", win(t, fr("cool", 0.2), at("alone"))); hudShow("thermal", 1); callout("bodyL", t, fr("cool", 0.25), at("alone"), PL(0.5, 0.2, 0.8), 760, 1390); callout("frontL", t, fr("cool", 0.35), at("alone"), PL(-0.5, 0.4, -1.68), 300, 1000); }
    else { const w = 0.08 * Math.sin((t - at("alone")) * 1.6) * Math.exp(-((t - at("alone")) % 3) * 0.6); PSP.rotation.set(w * 0.5, w, 0); pspMat(); dust(t, 0.6, V(1, 0.1, 0.2).normalize());
      const s = V(Math.sin((t - at("alone")) * 0.15) * 0.15, 0, -1).normalize(); sunAt(s);
      move(t, at("alone"), at("wait"), [V(6.5, 3.5, 5), C0, 40], [V(5.4, 2.8, 4), C0, 40], 0.03); hudShow("auto", win(t, fr("alone", 0.15), at("wait"))); }
  } else if (t < at("orbi")) { // WAIT: Earth, two days; then the beacon
    sets("earth"); lightAt(EARTH.position, 0.05); H.key.intensity = 0; skyAt(); EARTH.rotation.set(0.2, 2.4 + (t - at("wait")) * 0.25, 0); EARTH.updateMatrixWorld(true); ARC.visible = false; HEAD.visible = false;
    const E = EARTH.position; move(t, at("wait"), at("orbi"), [E.clone().add(V(4, 3, 19)), E.clone().add(V(0, 1.5, 0)), 40], [E.clone().add(V(3, 2.5, 16.5)), E.clone().add(V(0, 1.5, 0)), 40], 0.02);
    const kd = prog(t, at("wait"), fr("wait", 0.62)); H.$("wN").textContent = kd < 0.34 ? "24 DEC" : kd < 0.67 ? "25 DEC" : "26 DEC"; hudShow("wait", win(t, at("wait"), fr("wait", 0.8)));
    hudShow("ok", win(t, fr("wait", 0.7), at("orbi")));
  } else { // ORBI: live viewers
    sets("orbi"); ORS.updateMatrixWorld(true); lightAt(ORS.position, 0.45); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const live = t < fr("orbi", 0.5) ? 0 : t < at("orbi2") ? 1 : Math.min(4, 1 + Math.floor((t - at("orbi2")) / 1.1)); const dl = t < at("orbi2") ? 0 : Math.min(9, Math.floor((t - fr("orbi2", 0.55)) / 0.35) + 1) * (t > fr("orbi2", 0.55) ? 1 : 0);
    screen(PH, { live, dl, t: Math.round(t * 30) / 30, toast: t > at("orbi3") ? "Someone just opened it" : "" }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.35, 3.1), OW(0, 1.25, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.35, 3.1), OW(0, 1.25, 0), 36], [OW(-0.15, 1.3, 2.9), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); H.$("lvN").textContent = String(live); hudShow("livebig", win(t, fr("orbi", 0.45), at("orbi3"))); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
