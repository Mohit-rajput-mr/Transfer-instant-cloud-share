
// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { const sp = s === "space"; EARTH.visible = ISS.visible = sp; SKYG.visible = sp; LAB.visible = s === "lab"; ORS.visible = s === "orbi";
  scene.fog = null; scene.background = s === "lab" ? new THREE.Color(0x06080b) : s === "orbi" ? new THREE.Color(0x07080a) : null; }
function skyAt() { SKYG.userData.stars.position.copy(H.cam.position); sunGlow.position.copy(H.cam.position).addScaledVector(EU.uSun.value, 9000); sunGlow.scale.setScalar(2600); sunGlow.lookAt(H.cam.position); }
function lightSpace(k = 1) { H.key.color.set(0xfff4e6); H.key.intensity = 3.3 * k; H.key.position.copy(EU.uSun.value).multiplyScalar(300); H.key.target.position.set(0, 0, 0);
  const s = H.key.shadow.camera; Object.assign(s, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 700 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x7d9ad0); H.hemi.groundColor.set(0x2a4a7a); H.hemi.intensity = 0.5; H.envK.value = 0.85; H.rimA.intensity = 0.5; H.rimB.intensity = 0.3; }
function lightLab(c) { H.key.color.set(0xfff1e0); H.key.intensity = 2.6; H.key.position.copy(c).add(V(4, 9, 6)); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x6f86a8); H.hemi.groundColor.set(0x101418); H.hemi.intensity = 0.35; H.envK.value = 0.45; H.rimA.intensity = 0.9; H.rimB.intensity = 0.6; }
const OW = (x, y, z) => ORS.localToWorld(V(x, y, z));
const SUN0 = SUN.clone();
const TASKS = [["Swap water filter", "anna"], ["Brine bag check", "kenji"], ["Upload urine data", "marc"]];

H.frame("Your team's task board. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.5, 30000); EU.uT.value = t; EU.uSun.value.copy(SUN0); EARTH.rotation.set(0.35, 2.3 + t * 0.004, 0);

  if (t < at("water")) { // HOOK · THIS · ORBIT: the station over the Earth
    sets("space"); lightSpace();
    if (t < at("this")) { move(t, 0, at("this"), [V(150, 40, 190), IC, 40], [V(110, 22, 140), IC, 40], 0.03); title(t, fr("hook", 0.04), fr("hook", 0.55), "Nothing wasted", "Drink it again", 150); }
    else if (t < at("orbit")) { const a = 0.7 + (t - at("this")) * 0.07; move(t, at("this"), at("orbit"), [IC.clone().add(V(Math.cos(a) * 150, 45, Math.sin(a) * 150)), IC, 40], [IC.clone().add(V(Math.cos(a + 0.08) * 135, 38, Math.sin(a + 0.08) * 135)), IC, 40], 0.02);
      callout("nasa", t, fr("this", 0.15), at("orbit"), SL(0, 0, 0), 300, 1390); callout("arrays", t, fr("this", 0.35), fr("this", 0.85), SL(0, 0, 38), 760, 700); hudShow("since", win(t, fr("this", 0.5), at("orbit"))); }
    else { const k = prog(t, at("orbit"), at("water")); const ang = k * TAU * 1.2; EU.uSun.value.copy(V(Math.cos(ang) * 0.7, 0.25, Math.sin(ang) * 0.7).normalize()); lightSpace();
      move(t, at("orbit"), at("water"), [V(-60, 140, 520), V(0, -40, 0), 44], [V(-50, 120, 470), V(0, -45, 0), 44], 0.02);
      H.$("sunN").textContent = String(Math.min(16, Math.round(16 * smooth(k)))); hudShow("sun", win(t, fr("orbit", 0.1), at("water"))); hudShow("min90", win(t, fr("orbit", 0.25), at("water"))); }
    skyAt();
  } else if (t < at("team")) { // WATER LOOP (diagram)
    sets("lab"); LAB.updateMatrixWorld(true); lightLab(LAB.position); DRUM.rotation.x = t * 4; steam(t, 0); warm(t, 0); REACT.material.color.setRGB(0.4, 0.2, 0.1);
    const kU = prog(t, at("urine"), fr("urine", 0.5)), kS = prog(t, fr("urine", 0.5), at("brine")), kB = prog(t, fr("urine", 0.7), at("brine")), kB2 = prog(t, fr("brine", 0.4), at("clean")), kH = prog(t, fr("clean", 0.5), at("pct")), kW = prog(t, fr("clean", 0.3), fr("clean", 0.9));
    flow(t, [kU, kS, kB, kB2, kH, kW].map((k, i) => (t >= at("pct") ? 1 : k)));
    if (t < at("urine")) { move(t, at("water"), at("urine"), [LW(-0.6, 13, 18.5), LW(-1.6, 0.4, 0.8), 40], [LW(-0.8, 12, 17), LW(-1.6, 0.4, 0.8), 40], 0.01); hudShow("diag", 1); }
    else if (t < at("brine")) { steam(t, smooth(kS)); move(t, at("urine"), at("brine"), [LW(-4.5, 2.6, 5.2), LW(-3.6, 0.3, 0.3), 38], [LW(-4.2, 2.2, 4.4), LW(-3.4, 0.4, 0.3), 38], 0.01);
      callout("urineL", t, at("urine") + 0.2, at("brine"), LW(-6.0, 0.25, 0), 300, 1000); callout("upaL", t, fr("urine", 0.2), at("brine"), LW(-3.2, 0.75, 0.3), 760, 600); callout("brineL", t, fr("urine", 0.7), at("brine"), LW(-3.2, -0.4, 1.4), 760, 1390); hudShow("diag", 1); }
    else if (t < at("clean")) { warm(t, 1); move(t, at("brine"), at("clean"), [LW(-0.6, 2.4, 6.2), LW(-2.9, 0.1, 2.1), 38], [LW(-1.0, 2.0, 5.4), LW(-2.9, 0.1, 2.1), 38], 0.01);
      callout("bpaL", t, at("brine") + 0.2, at("clean"), LW(-3.2, 0.5, 2.6), 760, 1000); hudShow("diag", 1); }
    else if (t < at("pct")) { REACT.material.color.setRGB(2.2, 0.9, 0.3); move(t, at("clean"), at("pct"), [LW(3.4, 3.0, 5.6), LW(0.8, 0.5, -0.4), 38], [LW(2.8, 2.6, 4.8), LW(0.8, 0.6, -0.6), 38], 0.01);
      callout("wpaL", t, at("clean") + 0.2, at("pct"), LW(0.6, 1.0, 0.4), 300, 1000); callout("airL", t, fr("clean", 0.5), at("pct"), LW(0.6, 2.6, -2.2), 760, 600); callout("tankL", t, fr("clean", 0.35), at("pct"), LW(3.6, 0.6, 0), 760, 1390); hudShow("diag", 1); }
    else { REACT.material.color.setRGB(2.2, 0.9, 0.3); steam(t, 0.6); warm(t, 0.6); move(t, at("pct"), at("team"), [LW(1.5, 10, 12), LW(-0.8, 0, 0.8), 40], [LW(1.2, 11.5, 13.5), LW(-0.8, 0, 0.8), 40], 0.01);
      const kp = smooth(prog(t, fr("pct", 0.1), fr("pct", 0.45))); const pc = Math.round(93 + 5 * kp); H.$("pN").textContent = `${pc}%`; hudShow("pct", win(t, at("pct"), at("team")));
      for (let i = 0; i < 100; i++) { const e = H.$("dr" + i); if (e) e.style.background = i < pc ? "#6fc8ff" : "#30363d"; } hudShow("drops", win(t, fr("pct", 0.2), at("team"))); }
  } else if (t < at("orbi")) { // TEAM: back to the station
    sets("space"); lightSpace(); skyAt(); const a = 2.6 + (t - at("team")) * 0.06; move(t, at("team"), at("orbi"), [IC.clone().add(V(Math.cos(a) * 170, -20, Math.sin(a) * 170)), IC, 40], [IC.clone().add(V(Math.cos(a + 0.06) * 150, -15, Math.sin(a + 0.06) * 150)), IC, 40], 0.02);
    hudShow("team", win(t, fr("team", 0.1), at("orbi"))); callout("cupola", t, fr("team", 0.3), at("orbi"), cupolaPos(), 760, 1000);
  } else { // ORBI: the task board
    sets("orbi"); ORS.updateMatrixWorld(true); lightLab(ORS.position); H.key.position.copy(ORS.position).add(V(3, 6, 5));
    const typing = "Swap water filter @anna"; const kt = prog(t, fr("orbi", 0.3), fr("orbi", 0.9)); const typed = t < at("orbi2") ? typing.slice(0, Math.round(typing.length * kt)) : "";
    const added = t >= at("orbi2"); const tasks = []; if (added) { const k2 = prog(t, at("orbi2"), at("orbi3")); const s0 = k2 < 0.3 ? 0 : k2 < 0.55 ? 1 : k2 < 0.8 ? 2 : 3;
      tasks.push({ n: TASKS[0][0], who: TASKS[0][1], s: s0, file: k2 > 0.25 ? "filter-steps.pdf" : "" }); }
    tasks.push({ n: TASKS[1][0], who: TASKS[1][1], s: 1, file: "brine-photo.jpg" }); tasks.push({ n: TASKS[2][0], who: "", s: 0, file: "" });
    screen(PH, { typed, t: Math.round(t * 4) / 4, tasks, toast: t > at("orbi3") ? "Done · Swap water filter" : "" }, drawPh);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.9, 1.6, 4.6), OW(0, 1.3, 0), 36], [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], 0.02);
    else move(t, at("orbi2"), end("end") + 1.5, [OW(0.25, 1.4, 3.0), OW(0, 1.28, 0), 36], [OW(-0.15, 1.35, 3.4), OW(0, 1.25, 0), 36], 0.02);
    PH.g.rotation.y = 0.1 * Math.sin(t * 0.4); hudShow("chips", win(t, at("orbi3"), at("end") + 0.2));
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
