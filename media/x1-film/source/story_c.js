
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
const STUDIO = new THREE.Color(0x07090c);
function sets(s) { HIGH.visible = s === "high"; DES.visible = s === "des"; MUS.visible = s === "mus"; BUL.visible = false; X1.visible = s !== "des";
  scene.fog = null; scene.background = s === "studio" ? STUDIO : null; }
function lightHigh() { H.key.color.set(0xfff6ea); H.key.intensity = 3.6; H.key.position.copy(X1.position).addScaledVector(SUN, 40); H.key.target.position.copy(X1.position);
  const s = H.key.shadow.camera; Object.assign(s, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x8fb0e0); H.hemi.groundColor.set(0xb0a890); H.hemi.intensity = 0.8; H.envK.value = 0.6; H.rimA.intensity = 0.3; H.rimB.intensity = 0.2; }
function lightStudio() { H.key.color.set(0xffffff); H.key.intensity = 3; H.key.position.copy(X1.position).add(V(8, 12, 6)); H.key.target.position.copy(X1.position); H.key.castShadow = false;
  H.hemi.color.set(0x6070a0); H.hemi.groundColor.set(0x101010); H.hemi.intensity = 0.4; H.envK.value = 0.9; H.rimA.intensity = 1.2; H.rimB.intensity = 0.8; }
function lightMuseum() { H.key.intensity = 0.2; H.key.castShadow = false; H.hemi.color.set(0x8090b0); H.hemi.groundColor.set(0x202020); H.hemi.intensity = 0.5; H.envK.value = 0.6; H.rimA.intensity = 0.4; H.rimB.intensity = 0.3; }
function x1At(p, pitch = 0, yaw = 0, roll = 0) { X1.position.copy(p); X1.rotation.set(pitch, yaw, roll); X1.updateMatrixWorld(true); }
const shake = (t, a) => { H.cam.position.x += Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6; H.cam.position.y += Math.sin(t * 53 + 1) * a; };
const setMach = (m, label, col = "#fff") => { H.$("mN").textContent = m.toFixed(2); H.$("mN").style.color = col; H.$("mL").textContent = label; };
const ORIGIN = V(0, 0, 0);

H.frame("3 up, 4 down, at once. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 900000);
  pressure(t, 0, 6, 0.35, 0); PL.uK.value = 0; PL.uT.value = t; plumeLight.intensity = 0; STAB.rotation.x = 0; WISP.visible = false; GND.uT.value = t; SKY.uAlt.value = 1; OR.visible = false; lanes(t, 0, 0);
  WAVES.visible = true; PLUMES.forEach((p) => (p.visible = true));

  if (t < at("real")) { // HOOK: the X-1 at Mach 1.05, rocket burning, its shock cone trailing
    sets("high"); x1At(ORIGIN, 0.03); lightHigh(); PL.uK.value = 1; plumeLight.intensity = 30; pressure(t, 1.05, 9, 0.3, 1); WISP.visible = true; wisps(t, ORIGIN, 420, 1);
    move(t, 0, at("real"), [V(-14, 4.5, -18), V(0, 0, 2), 34], [V(-12.5, 3.6, -15), V(0, 0, 3), 34], 0.04); groundAt(13700); shake(t, 0.015);
    title(t, fr("hook", 0.05), fr("hook", 0.7), "14 October 1947", "Faster than sound", 150);
  } else if (t < at("sound")) { // THE REAL ONE (museum), then the bullet it copies
    if (t < at("why")) { sets("mus"); lightMuseum(); WAVES.visible = false; x1At(MUS.position.clone().add(V(0, 9, 0)), 0.08, 0.5, -0.12);
      const p0 = XL(0, 0.3, 0); const cp = [p0.x, p0.y, p0.z, ...XL(-1.6, 2.4, -2.6).toArray(), ...XL(1.6, 2.4, 1.0).toArray(), ...MUS.localToWorld(V(-3, 26, -6)).toArray(), ...MUS.localToWorld(V(3, 26, 4)).toArray()];
      cables.geometry.setAttribute("position", new THREE.Float32BufferAttribute([...XL(-1.6, 1.0, -2.6).toArray(), ...MUS.localToWorld(V(-1.0, 26, -9)).toArray(), ...XL(1.2, 1.0, 1.4).toArray(), ...MUS.localToWorld(V(1.0, 26, 6)).toArray()], 3));
      const a = 0.6 + (t - at("real")) * 0.12; const c = X1.position.clone();
      move(t, at("real"), at("why"), [c.clone().add(V(Math.sin(a) * 17, -6.5, Math.cos(a) * 17)), c.clone().add(V(0, -0.5, 0)), 34], [c.clone().add(V(Math.sin(a + 0.1) * 15.5, -5.8, Math.cos(a + 0.1) * 15.5)), c.clone().add(V(0, -0.5, 0)), 34], 0.03);
      title(t, fr("real", 0.05), fr("real", 0.45), "The real 46-062", "Bell X-1", 150); callout("scan", t, fr("real", 0.25), fr("real", 0.6), XL(0, 0.6, 1.0), 300, 1150); callout("body", t, fr("real", 0.62), at("why"), XL(0, 0.2, -4.5), 760, 1150); }
    else { sets("studio"); lightStudio(); WAVES.visible = false; x1At(ORIGIN); BUL.visible = true; const k = smooth(prog(t, at("why"), fr("why", 0.55)));
      BUL.position.set(0, lerp(-6, -3.4, k), -6.19); BUL.scale.setScalar(10.4); BUL.rotation.z = t * 3;
      move(t, at("why"), at("sound"), [V(-40, 0.5, -1.0), V(0, -1.6, -1.0), 34], [V(-37, 0.2, -1.0), V(0, -1.6, -1.0), 34], 0.02);
      callout("body", t, fr("why", 0.6), at("sound"), XL(0, 0.4, -4.0), 760, 1100); }
  } else if (t < at("tail")) { // PRESSURE WAVES: subsonic rings → they pile up into a shock at Mach 1
    sets("high"); x1At(ORIGIN); lightHigh(); groundAt(13700);
    if (t < at("pile")) { pressure(t, 0.5, 6, 0.35, 1, 0.6); move(t, at("sound"), at("pile"), [V(-2, 26, 18), V(0, 0, 2), 40], [V(-2, 24, 15), V(0, 0, 2), 40], 0.02);
      hudShow("sos", win(t, fr("sound", 0.3), at("pile"))); hudShow("diag", win(t, fr("sound", 0.1), at("pile"))); callout("wave", t, fr("sound", 0.15), at("pile"), V(0, 0, NOSE.z - 6), 760, 1150); }
    else { const M = lerp(0.6, 1.0, smooth(prog(t, at("pile"), fr("pile", 0.8)))); pressure(t, M, 6, 0.35, 1, 0.4); PL.uK.value = 0.8; plumeLight.intensity = 20;
      move(t, at("pile"), at("tail"), [V(-3, 20, -8), V(0, 0, -3), 40], [V(-2.5, 16, -10), V(0, 0, -4), 40], 0.02); shake(t, 0.01 * M);
      setMach(M, M > 0.98 ? "THE SOUND BARRIER" : "", M > 0.98 ? "#ff8a3d" : "#fff"); hudShow("mach", win(t, fr("pile", 0.05), at("tail"))); callout("pile", t, fr("pile", 0.6), at("tail"), V(0, 0, NOSE.z - 0.3), 760, 1150); hudShow("diag", win(t, at("pile"), fr("pile", 0.4))); }
  } else if (t < at("rocket")) { // THE TAIL that tilts; then the drop from the bomber
    sets("high"); lightHigh(); groundAt(t < at("drop") ? 13700 : 7600);
    if (t < at("drop")) { x1At(ORIGIN); STAB.rotation.x = Math.sin((t - at("tail")) * 2.4) * 0.12 * smooth(prog(t, fr("tail", 0.2), fr("tail", 0.4)));
      move(t, at("tail"), at("drop"), [XL(5.2, 2.6, 8.8), XL(0, 0.5, 3.3), 34], [XL(4.6, 2.3, 8.0), XL(0, 0.5, 3.3), 34], 0.02);
      callout("stab", t, fr("tail", 0.3), at("drop"), XL(1.3, 0.7, 3.4), 760, 1150); }
    else { const k = prog(t, at("drop"), at("rocket")); x1At(V(0, 30 - 9.8 * Math.pow(k * 3.2, 2) * 0.5 * 0.5, k * 30), 0.06 + k * 0.05, 0, Math.sin(k * 6) * 0.04);
      WISP.visible = true; wisps(t, X1.position, 120, 0.8);
      move(t, at("drop"), at("rocket"), [V(-14, 24, -6), X1.position.clone(), 40], [V(-14, 16, 10), X1.position.clone(), 40], 0.05); hudShow("b29", win(t, fr("drop", 0.4), at("rocket"))); }
  } else if (t < at("mach")) { // ROCKET IGNITION (4 chambers) → the date / altitude
    sets("high"); lightHigh();
    if (t < at("date")) { x1At(ORIGIN, 0.04); groundAt(8000); const k = prog(t, at("rocket"), fr("rocket", 0.6)); PLUMES.forEach((p, i) => (p.visible = k > i * 0.22)); PL.uK.value = 1; plumeLight.intensity = 30 * k;
      move(t, at("rocket"), at("date"), [XL(2.5, 1.2, 14), XL(0, 0, 3.5), 34], [XL(2.0, 1.0, 12.5), XL(0, 0, 3.5), 34], 0.03); shake(t, 0.02 * k); WISP.visible = true; wisps(t, ORIGIN, 300, 1);
      callout("ch", t, fr("rocket", 0.35), at("date"), XL(0.15, 0.1, 4.25), 300, 1150); hudShow("stats", win(t, fr("rocket", 0.6), at("date"))); }
    else { PLUMES.forEach((p) => (p.visible = true)); x1At(ORIGIN, 0.02); groundAt(13700); PL.uK.value = 1; plumeLight.intensity = 25; WISP.visible = true; wisps(t, ORIGIN, 380, 0.6);
      move(t, at("date"), at("mach"), [V(-40, 14, 60), V(0, -2, 0), 30], [V(-34, 12, 52), V(0, -2, 0), 30], 0.05);
      title(t, fr("date", 0.05), fr("date", 0.5), "Over the Mojave Desert", "14 October 1947", 150); hudShow("date", win(t, fr("date", 0.3), at("mach"))); }
  } else if (t < at("today")) { // MACH 1.05: the cone; then on the ground: silence … boom
    if (t < at("boom")) { sets("high"); PLUMES.forEach((p) => (p.visible = true)); x1At(ORIGIN, 0.02); lightHigh(); groundAt(13700); PL.uK.value = 1; plumeLight.intensity = 30; WISP.visible = true; wisps(t, ORIGIN, 420, 1);
      const M = lerp(0.94, 1.05, smooth(prog(t, at("mach"), fr("mach", 0.5)))); pressure(t, M, 9, 0.3, 1, 0.2); shake(t, 0.02);
      move(t, at("mach"), at("boom"), [V(-5, 30, -6), V(-1, 0, 5), 44], [V(-6, 33, -5), V(-1, 0, 6.5), 44], 0.03);
      setMach(M, M >= 1.0 ? "SUPERSONIC" : "", M >= 1.0 ? "#ffd166" : "#fff"); hudShow("mach", win(t, fr("mach", 0.02), at("boom"))); callout("cone", t, fr("mach", 0.55), at("boom"), V(6, 0, 20), 760, 1150); }
    else { sets("des"); DES.updateMatrixWorld(true); H.key.color.set(0xfff2e0); H.key.intensity = 3.2; H.key.position.copy(DES.position).add(V(40, 60, 30)); H.key.target.position.copy(DES.position); H.hemi.intensity = 0.9; H.hemi.color.set(0xc0d4ee); H.envK.value = 0.5; scene.background = new THREE.Color(0x9cc0e8);
      const hit = fr("boom", 0.72); DU.uK.value = 1; DU.uX.value = lerp(-700, 160, prog(t, at("boom"), hit + 0.4)); DES.userData.sock.rotation.y = Math.sin(t * 1.3) * 0.2;
      const D = (x, y, z) => DES.localToWorld(V(x, y, z));
      move(t, at("boom"), at("today"), [D(-8, 2.0, 14), D(-20, 4, -40), 50], [D(-7, 2.0, 12), D(-20, 4, -40), 50], 0.04); if (t > hit) shake(t, 0.12 * Math.exp(-(t - hit) * 3)); flash(t, hit, 0.35, 5, "#fff4e0");
      // the N-wave: flat (silence) until the cone arrives, then the sharp rise, the slow fall below zero, the sharp return
      const k = clamp((t - hit + 0.15) / 0.9); const pts = []; for (let i = 0; i <= 62; i++) { const x = i * 10; const u = x / 620 - (1 - k) * 0.6; let y = 75; if (u > 0.3 && u < 0.7) y = 75 - 60 + (u - 0.3) / 0.4 * 120; if (Math.abs(u - 0.3) < 0.005) y = 15; pts.push(`${x} ${y.toFixed(1)}`); }
      H.$("nwP").setAttribute("d", "M" + pts.join(" L")); hudShow("nwave", win(t, fr("boom", 0.05), at("today")));
      callout("quiet", t, fr("boom", 0.1), hit - 0.3, D(-6, 0.5, 4), 300, 1150); callout("boomL", t, hit - 0.2, at("today"), D(-16, 0.2, -10), 760, 1150); }
  } else if (t < at("orbi")) { // TODAY: in the Smithsonian
    sets("mus"); lightMuseum(); WAVES.visible = false; x1At(MUS.position.clone().add(V(0, 9, 0)), 0.08, 0.5, -0.12);
    const c = X1.position.clone(); const a = 2.4 + (t - at("today")) * 0.1;
    move(t, at("today"), at("orbi"), [c.clone().add(V(Math.sin(a) * 19, -7.8, Math.cos(a) * 19)), c.clone().add(V(0, -1.0, 0)), 34], [c.clone().add(V(Math.sin(a + 0.1) * 18, -7.5, Math.cos(a + 0.1) * 18)), c.clone().add(V(0, -1.0, 0)), 34], 0.03);
  } else { // ORBI: parts in parallel
    sets("mus"); lightMuseum(); WAVES.visible = false; x1At(MUS.position.clone().add(V(0, 9, 0)), 0.08, 0.5, -0.12); OR.visible = true; OR.updateMatrixWorld(true); const OW = (x, y, z) => OR.localToWorld(V(x, y, z)); orbiL.intensity = 0.6;
    const sent = Math.floor(clamp(prog(t, at("orbi"), fr("orbi2", 0.6))) * 40); const got = clamp(prog(t, fr("orbi2", 0.35), fr("orbi3", 0.6)));
    screen(ph, { on: 1, sent }, drawPhone); screen(lap, { on: t > fr("orbi2", 0.3) ? 1 : 0, got: Math.round(got * 40) / 40 }, drawLap);
    lanes(t, t > fr("orbi", 0.3) ? 1 : 0, t > fr("orbi2", 0.35) ? 1 : 0);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.3, 3.2, 8.4), OW(0.3, 1.8, -1.2), 44], [OW(0.4, 3.0, 7.6), OW(0.3, 1.8, -1.2), 44], 0.2);
    else if (t < at("orbi3")) move(t, at("orbi2"), at("orbi3"), [OW(1.8, 2.4, 5.0), OW(0.6, 1.9, -0.8), 44], [OW(1.4, 2.6, 4.6), OW(0.2, 2.0, -0.8), 44], 0.1);
    else { move(t, at("orbi3"), at("end"), [OW(0.3, 3.2, 8.6), OW(0.3, 2.0, -1.2), 44], [OW(0.4, 3.0, 8.0), OW(0.3, 2.0, -1.2), 44], 0.2); hudShow("chips", win(t, fr("orbi3", 0.2), at("end"))); }
    callout("up3", t, fr("orbi", 0.4), fr("orbi2", 0.6), OW(1.4, 2.0, -0.4), 760, 900); callout("dn4", t, fr("orbi2", 0.4), at("orbi3"), OW(-0.9, 2.0, -0.6), 300, 1150);
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
