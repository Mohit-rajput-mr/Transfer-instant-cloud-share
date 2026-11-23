
// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  h330: ["330 m", "#3dff8c", "to the top of the antenna"], iron: ["Puddled iron", "#ffd166", "an early wrought iron"], grow: ["≈ +15 cm", "#ff8a3d", "on a hot summer day"],
  shrink: ["Shrinks back", "#9fd4ff", "on a freezing night"], hot: ["Sun side", "#ffd166", "heats → grows more"], cold: ["Shade side", "#b18cff", "stays cooler"],
  lean: ["Top leans away", "#ff8a3d", "up to 18 cm"], loop: ["The top's path", "#ffd166", "one curve a day"], rivet: ["Red-hot rivet", "#ff8a3d", "heated in a forge"],
  clamp: ["Shrinks as it cools", "#3dff8c", "pulls the plates tight"], sway: ["The top", "#9fd4ff", "sways ≈ 9 cm"], wind: ["Wind", "#9fd4ff", "passes through"], curve: ["The curve of the legs", "#3dff8c", "from Eiffel's wind calculations"],
  direct: ["Direct path", green, "device to device"], cloud: ["Encrypted cloud copy", "#8fd0ff", "when there's no direct path"],
});
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["BUILT", "1889"], ["IRON", "7,300 t"], ["HEIGHT", "330 m"]].map(([a, b]) => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 60px D;font-stretch:112%;color:#fff;margin-top:6px">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("formula", `<div style="width:1080px;display:flex;justify-content:center"><div style="padding:22px 30px;border-radius:24px;background:rgba(8,10,16,.84);border:1.5px solid #ff8a3d;text-align:center">
  <div style="font:700 24px M;letter-spacing:.18em;color:#9aa6b2">THERMAL EXPANSION</div><div style="font:800 40px D;color:#fff;margin-top:10px">300 m × 0.000012 /°C × 42 °C</div><div style="font:900 72px D;color:#ff8a3d;margin-top:4px">≈ 15 cm</div></div></div>`, { left: "0px", top: "1380px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 180px/0.85 D;font-stretch:112%;color:#ffd166;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 46px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MOTION EXAGGERATED</div>`, { left: "330px", top: "1110px" });
hudEl("season", `<div style="width:1080px;text-align:center"><span id="seaT" style="display:inline-block;padding:16px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #ff8a3d;font:900 50px D;color:#ff8a3d">SUMMER · +32 °C</span></div>`, { left: "0px", top: "260px" });
hudEl("tleg", `<div style="width:1080px;display:flex;justify-content:center"><div style="padding:16px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid rgba(255,255,255,.2)"><div style="font:700 22px M;letter-spacing:.2em;color:#9aa6b2;margin-bottom:10px">THERMAL CAMERA</div><div style="width:560px;height:22px;border-radius:11px;background:linear-gradient(90deg,#0d0526,#5a0d8c,#d9335a,#ff8c1a,#fff299)"></div><div style="display:flex;justify-content:space-between;font:700 22px M;color:#cfd6dd;margin-top:8px"><span>COOL · SHADE</span><span>HOT · SUN</span></div></div></div>`, { left: "0px", top: "1420px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["DIRECT FIRST", "CLOUD IF NOT", "LOCKED"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 36px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ffd166") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };
// the top's daily path, drawn as it goes
const TRAIL_N = 200, trailP = new Float32Array(TRAIL_N * 3);
const TRAIL = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(trailP, 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(1.0, 0.82, 0.4).multiplyScalar(2), toneMapped: false })); TRAIL.frustumCulled = false; scene.add(TRAIL);
const sunHAt = (az) => V(Math.cos(az), 0, Math.sin(az));

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
function sunAt(k) { SUN.copy(SUN_DAWN).lerp(SUN_NOON, k).normalize(); skyU.uMix.value = k; seine.material.uniforms.sunDirection.value.copy(SUN); }
function dayLook() { H.key.intensity = 3.0; H.hemi.intensity = 0.7; H.envK.value = 0.35; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.2; H.rimB.intensity = 0.3; H.key.position.copy(SUN.clone().multiplyScalar(1500)); H.key.target.position.set(0, 0, 0); }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const orb = (a, rad, h, c = V(0, 0, 0)) => V(c.x + Math.sin(a) * rad, c.y + h, c.z + Math.cos(a) * rad);
const sunH = () => V(SUN.x, 0, SUN.z).normalize();
const EX = 33;   // shown motion = real × 33 (18 cm → 6 m), labelled
const RP = (x, y, z) => RV.localToWorld(V(x, y, z));

// =====================================================================================================================
// THE FILM
// =====================================================================================================================

// the curve of the legs (Eiffel: "wind resistance" set the curvature of the four edges): glowing edges + wind arrows flowing down them
const dashMat = (col) => new THREE.ShaderMaterial({ uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(col).multiplyScalar(2.4) } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uP; uniform vec3 uC; varying float vU; void main(){ float on = step(vU, uP); float dash = 0.6 + 0.4 * sin((vU - uP) * 90.0); gl_FragColor = vec4(uC * on * dash * (0.45 + 0.55 * smoothstep(uP - 0.2, uP, vU)), 1.0); }` });
const CURVE = new THREE.Group(); scene.add(CURVE); CURVE.visible = false; const EDGES = [], GUSTS = [];
for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 80; i++) { const y = (i / 80) * TOPY; pts.push(V(s * halfW(y), y, halfW(y) + 1.5)); } pts.reverse();
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 1.3, 8), dashMat(0x3dff8c)); m.renderOrder = 30; CURVE.add(m); EDGES.push(m); }
for (const y0 of [70, 140, 205, 262]) { const pts = [V(-260, y0, halfW(y0) + 1.5), V(-halfW(y0) - 6, y0, halfW(y0) + 1.5)]; for (let i = 1; i <= 30; i++) { const y = y0 * (1 - i / 30); pts.push(V(-halfW(y) - 3, y, halfW(y) + 1.5)); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 1.6, 8), dashMat(0x9fd4ff)); m.renderOrder = 31; CURVE.add(m); GUSTS.push(m); }
H.frame("Direct first, cloud if not", async (t) => {
  sunAt(0.15); skyU.uGrey.value = 0; dayLook(); camRange(0.5, 70000); sky.visible = true; CITY.visible = true; TOWER.visible = true; RV.visible = false; OR.visible = false; TRAIL.visible = false; CURVE.visible = false; boats(t); skyU.uT.value = t; H.cam.up.set(0, 1, 0); cloudIcon.visible = true;
  scene.background = null; H.zoom = 1; H.bloom.strength = 0.3; thermal(0, sunH()); setBend(V(0, 0), 0); seine.material.uniforms.time.value = t * 0.5; keyShadow(V(0, 120, 0), 260);
  directBeam.material.opacity = 0; cloudMat.opacity = 0; cloudIcon.children.forEach((c) => (c.material.opacity = 0)); blockX.visible = false; lock.visible = false;

  if (t < at("tower")) { // HOOK: from the Champ de Mars lawns, morning sun
    sunAt(0.55); dayLook();
    move(t, 0, at("tower"), [V(30, 1.8, 640), V(0, 150, 0), 40], [V(18, 2.4, 560), V(0, 155, 0), 40], 0.3);
    title(t, fr("hook", 0.05), at("tower"), "Paris", "Taller in summer?", 150);
  } else if (t < at("iron")) { // the tower: rise round it; stats
    sunAt(0.5); dayLook();
    move(t, at("tower"), at("iron"), [orb(2.4, 260, 20), V(0, 60, 0), 36], [orb(3.2, 330, 300), V(0, 250, 0), 36], 0.4);
    hudShow("stats", win(t, fr("tower", 0.25), at("iron"))); callout("h330", t, fr("tower", 0.6), at("iron"), V(0, TIPY, 0), 760, 360);
  } else if (t < at("summer")) { // the iron, close: lattice, rivets, the painted puddled iron
    sunAt(0.3); dayLook(); keyShadow(V(halfW(70), 70, 0), 40);
    move(t, at("iron"), at("summer"), [V(halfW(66) + 14, 64, 26), V(halfW(70), 72, 0), 40], [V(halfW(66) + 8, 70, 16), V(halfW(72), 74, 0), 38], 0.3);
    callout("iron", t, fr("iron", 0.15), at("summer"), V(halfW(72) - 3, 74, 3), 760, 1180);
  } else if (t < at("winter")) { // summer noon: the tower grows (×100) with the formula
    sunAt(1.0); dayLook(); const g = ease(prog(t, fr("summer", 0.4), fr("summer", 0.9))) * 0.15 * 100 / 300; setBend(V(0, 0), g);
    move(t, at("summer"), at("winter"), [V(380, 110, 640), V(0, 160, 0), 34], [V(340, 120, 560), V(0, 170, 0), 34], 0.3);
    hudShow("season", win(t, at("summer"), at("winter"))); H.$("seaT").textContent = "SUMMER · +32 °C"; H.$("seaT").style.color = "#ff8a3d";
    hudShow("formula", win(t, fr("summer", 0.15), at("winter"))); callout("grow", t, fr("summer", 0.55), at("winter"), V(0, TIPY * (1 + g), 0), 760, 560); hudShow("exag", win(t, fr("summer", 0.45), at("winter")));
  } else if (t < at("sun")) { // winter: grey, cold, it shrinks back
    sunAt(0.3); skyU.uGrey.value = 1; H.key.intensity = 1.2; H.hemi.intensity = 0.9; scene.fog.color.set(0xc6cdd4); scene.fog.density = FOG.d * 1.8;
    const g = lerp(0.15, -0.05, ease(prog(t, at("winter"), fr("winter", 0.8)))) * 100 / 300; setBend(V(0, 0), g);
    move(t, at("winter"), at("sun"), [V(340, 120, 560), V(0, 170, 0), 34], [V(320, 115, 520), V(0, 165, 0), 34], 0.3);
    hudShow("season", win(t, at("winter"), at("sun"))); H.$("seaT").textContent = "WINTER · −10 °C"; H.$("seaT").style.color = "#9fd4ff";
    callout("shrink", t, fr("winter", 0.3), at("sun"), V(0, TIPY * (1 + g), 0), 760, 560); hudShow("exag", win(t, at("winter"), at("sun")));
  } else if (t < at("lean")) { // the thermal camera: the sun side glows hot, the shade side stays cool
    sunAt(0.55); dayLook(); const k = smooth(prog(t, at("sun"), fr("sun", 0.35))); thermal(k, sunH()); H.bloom.strength = 0.35;
    const sh2 = sunH(); const side = V(-sh2.z, 0, sh2.x);
    move(t, at("sun"), at("lean"), [side.clone().multiplyScalar(420).add(V(0, 140, 0)), V(0, 140, 0), 36], [side.clone().multiplyScalar(380).add(sh2.clone().multiplyScalar(-120)).add(V(0, 150, 0)), V(0, 150, 0), 36], 0.3);
    hudShow("tleg", win(t, fr("sun", 0.2), at("lean"))); callout("hot", t, fr("sun", 0.35), at("lean"), sh2.clone().multiplyScalar(halfW(120)).add(V(0, 120, 0)), 760, 700); callout("cold", t, fr("sun", 0.55), at("lean"), sh2.clone().multiplyScalar(-halfW(120)).add(V(0, 120, 0)), 300, 900);
  } else if (t < at("loop")) { // so the top bends away from the sun (×33)
    sunAt(0.55); dayLook(); thermal(1, sunH()); const sh2 = sunH(); const L = sh2.clone().multiplyScalar(-0.18 * EX * ease(prog(t, at("lean"), fr("lean", 0.7))));
    setBend(V(L.x, L.z), 0); const side = V(-sh2.z, 0, sh2.x);
    move(t, at("lean"), at("loop"), [side.clone().multiplyScalar(460).add(V(0, 170, 0)), V(0, 170, 0), 34], [side.clone().multiplyScalar(430).add(V(0, 180, 0)), V(0, 190, 0), 34], 0.2);
    callout("lean", t, fr("lean", 0.3), at("loop"), V(L.x, TIPY, L.z), 760, 420); hudShow("exag", win(t, at("lean"), at("loop")));
  } else if (t < at("parts")) { // from above the summit: the sun crosses the sky, the top draws its curve
    camRange(5, 70000); const k = prog(t, at("loop"), at("parts")); const az = lerp(-0.4, Math.PI + 0.4, k) + Math.atan2(SUN_NOON.z, SUN_NOON.x) - Math.PI / 2;
    const el = Math.sin(k * Math.PI); SUN.set(Math.cos(az) * Math.cos(el * 0.9), 0.25 + 0.6 * el, Math.sin(az) * Math.cos(el * 0.9)).normalize(); skyU.uMix.value = el; dayLook();
    const lean = (s) => { const a2 = lerp(-0.4, Math.PI + 0.4, s) + Math.atan2(SUN_NOON.z, SUN_NOON.x) - Math.PI / 2, e2 = Math.sin(s * Math.PI); return V(-Math.cos(a2), 0, -Math.sin(a2)).multiplyScalar(0.18 * EX * (0.3 + 0.7 * e2)); };
    const L = lean(k); setBend(V(L.x, L.z), 0); TRAIL.visible = true;
    for (let i = 0; i < TRAIL_N; i++) { const s = Math.min(k, (i / (TRAIL_N - 1)) * k); const p = lean(s); trailP.set([p.x, TIPY + 1, p.z], i * 3); } TRAIL.geometry.attributes.position.needsUpdate = true;
    move(t, at("loop"), at("parts"), [V(40, TIPY + 70, 60), V(0, TIPY - 20, 0), 34], [V(30, TIPY + 60, 45), V(0, TIPY - 20, 0), 34], 0.2);
    callout("loop", t, fr("loop", 0.4), at("parts"), V(L.x, TIPY + 1, L.z), 760, 1150); hudShow("exag", win(t, at("loop"), at("parts")));
  } else if (t < at("rivets")) { // 18,038 parts: fly through the lattice
    sunAt(0.6); dayLook(); keyShadow(V(0, 160, 0), 60);
    move(t, at("parts"), at("rivets"), [V(halfW(150) + 30, 120, 30), V(0, 175, 0), 40], [V(halfW(170) + 6, 172, 8), V(0, 200, 0), 44], 0.4);
    setBig(Math.round(18038 * ease(prog(t, at("parts") + 0.1, fr("parts", 0.45)))).toLocaleString("en-US"), "IRON PARTS"); hudShow("big", win(t, at("parts") + 0.2, at("rivets")));
  } else if (t < at("cool")) { // 2.5 million rivets: a real joint up on the tower, Paris below; then one, red-hot, set and hammered
    RV.visible = true; sunAt(0.6); dayLook(); keyShadow(RV.position.clone(), 2); camRange(0.01, 70000); H.bloom.strength = 0.18;
    H.bokeh.enabled = true; H.bokeh.uniforms.aperture.value = 0.0012; H.bokeh.uniforms.maxblur.value = 0.006;
    const inHot = t >= at("hot"); rivet.visible = inHot; holeM.visible = !inHot || prog(t, at("hot"), at("cool")) < 0.3;
    if (!inHot) { setBig((2.5 * ease(prog(t, at("rivets") + 0.1, fr("rivets", 0.35)))).toFixed(1) + " million", "RIVETS"); hudShow("big", win(t, at("rivets") + 0.1, at("hot")));
      tongs.visible = false; hammer.visible = false; sparks.visible = false; forgeL.intensity = 0;
      move(t, at("rivets"), at("hot"), [RP(0.75, -0.6, 0.85), RP(0.1, -0.2, 0), 34], [RP(0.55, 0.3, 0.8), RP(0.05, 0.1, 0), 34], 0.02); H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(RP(0.1, 0, 0)); }
    else { const k = prog(t, at("hot"), at("cool")); const ins = ease(clamp(k / 0.3));
      rivet.position.copy(HOLE).add(V(0.25 * (1 - ins), 0.04 * (1 - ins), 0.12 * (1 - ins))); rivetMat.emissiveIntensity = 1.1; forgeL.intensity = 0.15;
      tongs.visible = k < 0.4; tongs.position.copy(rivet.position).add(V(0, 0, 0.05)); tongs.rotation.y = 0.0;
      const hk = clamp((k - 0.42) / 0.5), strike = k > 0.42 ? Math.max(0, Math.sin((k - 0.42) * 38)) : 0; hammer.visible = k > 0.38;
      hammer.position.copy(HOLE).add(V(0, 0, 0.05 + 0.12 * (1 - strike))); headTop.scale.set(1 + 0.22 * hk, 1 + 0.22 * hk, 1 - 0.3 * hk);
      const sp = sparks.geometry.attributes.position; for (let i = 0; i < 120; i++) { const a = hash(i) * TAU, s = ((k * 6 + hash(i + 1)) % 1) * 0.07; sp.setXYZ(i, HOLE.x + Math.cos(a) * s, HOLE.y + Math.sin(a) * s * 0.6 - s * s * 3, HOLE.z + 0.07 + s * 0.3); } sp.needsUpdate = true; sparks.visible = strike > 0.6;
      move(t, at("hot"), at("cool"), [RP(0.78, 0.3, 0.62), RP(0.1, 0, 0.02), 30], [RP(0.68, 0.26, 0.56), RP(0.11, 0, 0.02), 30], 0.01); H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(RP(0.12, 0, 0.02));
      callout("rivet", t, fr("hot", 0.2), at("cool"), RP(HOLE.x, HOLE.y, HOLE.z + 0.06), 760, 1150); }
  } else if (t < at("wind")) { // it cools, shrinks, and clamps the plates together
    RV.visible = true; sunAt(0.65); dayLook(); keyShadow(RV.position.clone(), 2); camRange(0.01, 70000); H.bloom.strength = 0.18;
    H.bokeh.enabled = true; H.bokeh.uniforms.aperture.value = 0.0012; H.bokeh.uniforms.maxblur.value = 0.006;
    rivet.visible = true; holeM.visible = false; tongs.visible = false; hammer.visible = false; sparks.visible = false; rivet.position.copy(HOLE); headTop.scale.set(1.22, 1.22, 0.7);
    const k = prog(t, at("cool"), at("wind")); rivetMat.emissiveIntensity = 1.1 * Math.pow(1 - k, 2.2); forgeL.intensity = 0.15 * (1 - k);
    move(t, at("cool"), at("wind"), [RP(-0.42, 0.28, 0.6), RP(0.1, 0, 0.02), 30], [RP(-0.36, 0.24, 0.54), RP(0.1, 0, 0.02), 30], 0.01); H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(RP(0.12, 0, 0.02));
    callout("clamp", t, fr("cool", 0.3), at("wind"), RP(HOLE.x, HOLE.y, HOLE.z + 0.03), 760, 1150);
  } else if (t < at("curve")) { // the open lattice: the wind passes through; the top sways ≈ 9 cm (×33)
    sunAt(0.8); dayLook(); const sw = 0.09 * EX * Math.sin(t * 1.6); setBend(V(sw, 0), 0);
    move(t, at("wind"), at("curve"), [V(240, 90, 300), V(0, 150, 0), 38], [V(210, 100, 260), V(0, 170, 0), 38], 0.3);
    callout("wind", t, fr("wind", 0.1), fr("wind", 0.55), V(-30, 90, 10), 300, 1150); callout("sway", t, fr("wind", 0.55), at("curve"), V(sw, TIPY, 0), 760, 420); hudShow("exag", win(t, fr("wind", 0.5), at("curve")));
  } else if (t < at("orbi")) { // the curve of the four legs: wind arrows hit the tower and flow down the curved edges into the ground
    sunAt(0.82); dayLook(); setBend(V(0, 0), 0); CURVE.visible = true; H.bloom.strength = 0.5;
    GUSTS.forEach((m, i) => (m.material.uniforms.uP.value = smooth(prog(t, at("curve") + i * 0.35, fr("curve", 0.6) + i * 0.35))));
    EDGES.forEach((m) => (m.material.uniforms.uP.value = smooth(prog(t, fr("curve", 0.4), fr("curve", 0.85)))));
    move(t, at("curve"), at("orbi"), [V(0, 140, 560), V(0, 150, 0), 40], [V(0, 150, 500), V(0, 155, 0), 40], 0.25);
    callout("curve", t, fr("curve", 0.45), at("orbi"), V(halfW(F1), F1, halfW(F1)), 760, 1150);
  } else { // ORBI on a Paris balcony
    sunAt(0.9); dayLook(); OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); orbiL.intensity = 0.4; OR.updateMatrixWorld();
    const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const dk = t > at("orbi2") && t < at("orbi3") ? smooth(prog(t, at("orbi2"), fr("orbi2", 0.4))) : 0;
    const ck = t > at("orbi3") ? smooth(prog(t, fr("orbi3", 0.25), fr("orbi3", 0.55))) : 0;
    directBeam.material.opacity = dk; blockX.visible = t > at("orbi3") && t < fr("orbi3", 0.5); cloudMat.opacity = ck; cloudIcon.children.forEach((c) => (c.material.opacity = ck));
    lock.visible = t > fr("orbi3", 0.5); lock.position.copy(cloudIcon.position).add(V(0, 0.6, 0)); lock.rotation.y = t;
    screen(lap, { msg: dk > 0 ? "SAME WI-FI · SENDING DIRECT" : ck > 0 ? "ENCRYPTED · VIA THE CLOUD" : "", col: dk > 0 ? green : "#8fd0ff" }, drawLap);
    screen(ph, { got: dk > 0 ? Math.round(clamp(prog(t, at("orbi2"), at("orbi3"))) * 20) / 20 : ck > 0 ? Math.round(clamp(prog(t, fr("orbi3", 0.5), at("end"))) * 20) / 20 : 0 }, drawPhone);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.4, 2.0, 9), OW(0.4, 1.2, 0), 36], [OW(0.3, 1.8, 7.2), OW(0.4, 1.0, 0), 36], 0.3);
    else if (t < at("orbi3")) { move(t, at("orbi2"), at("orbi3"), [OW(0.6, 2.6, 6.2), OW(0.6, 1.0, 0.4), 36], [OW(0.6, 2.5, 5.6), OW(0.6, 1.0, 0.4), 36], 0.2); callout("direct", t, fr("orbi2", 0.3), at("orbi3"), OW(0.6, 2.0, 0.6), 760, 560); }
    else if (t < fr("orbi3", 0.6)) { move(t, at("orbi3"), fr("orbi3", 0.6), [OW(0.7, 3.4, 7.6), OW(0.7, 2.2, 0.4), 38], [OW(0.7, 3.3, 7.0), OW(0.7, 2.2, 0.4), 38], 0.2); callout("cloud", t, fr("orbi3", 0.3), fr("orbi3", 0.6), OW(0.7, 4.3, 0.45), 760, 560); }
    else { // the phone's screen, readable: received
      const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, fr("orbi3", 0.6), at("end"), [OW(...pc.clone().addScaledVector(pn, 3.3).addScaledVector(up2, -0.15).toArray()), OW(...pc.toArray()), 34], [OW(...pc.clone().addScaledVector(pn, 2.9).addScaledVector(up2, -0.12).toArray()), OW(...pc.toArray()), 34], 0.03);
      directBeam.material.opacity = 0; cloudMat.opacity = 0; cloudIcon.visible = false; lock.visible = false; blockX.visible = false;
      H.cam.up.copy(up2.clone().transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); hudShow("chips", win(t, fr("orbi3", 0.65), at("end"))); }
  }
});
await H.ready();
