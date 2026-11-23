
// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  h828: ["828 m", "#3dff8c", "to the tip of the spire"], wings: ["3 wings", "#ffd166", "in a Y"], wind: ["Wind", "#9fd4ff", "the real enemy"],
  peel: ["Swirls peel off", "#ff8a5c", "left, right, left…"], push: ["Each one pushes", "#ff8a5c", "same rhythm → it rocks"],
  plain: ["Plain tower", "#ff8a5c", "swirls in step"], burjL: ["Burj Khalifa", "#7dffc0", "swirls out of step"],
  core: ["Hexagonal core", "#6fd0ff", "concrete, up the middle"], brace: ["3 wings brace it", "#7dffc0", "like a tripod"],
  rec: ["606 m", "#ffd166", "concrete pumped up"], piles: ["192 piles", "#ffd166", "1.5 m wide, 43 m long"], deep: ["> 50 m deep", "#ffd166", "under the desert"],
  raft: ["Raft", "#cfd6dd", "3.7 m of concrete"], spire: ["Spire", "#cfd6dd", "> 4,000 t of steel"], top: ["The top", "#9fd4ff", "moves ≈ 1.5 m"],
  parts: ["Split into parts", green, "several fly at once"],
});
const FLOWER = `<svg viewBox="-100 -100 200 200" width="760" height="760"><g fill="none" stroke="#ffd166" stroke-width="2.2" opacity=".9">
  ${[0, 120, 240].map((a) => `<path transform="rotate(${a - 90})" d="M0 -8 C 10 -30, 14 -70, 0 -96 C -14 -70, -10 -30, 0 -8 Z"/><path transform="rotate(${a - 30})" d="M0 -10 C 4 -40, 8 -70, 0 -88 C -8 -70, -4 -40, 0 -10 Z" opacity=".55"/>`).join("")}
  <circle r="9"/></g></svg>`;
hudEl("flower", `<div style="width:1080px;display:flex;justify-content:center">${FLOWER}</div>`, { left: "0px", top: "560px" });
hudEl("flowerT", `<div style="width:1080px;text-align:center;font:700 28px M;letter-spacing:.22em;color:#ffd166">HYMENOCALLIS · A DESERT FLOWER</div>`, { left: "0px", top: "1340px" });
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["OPENED", "2010"], ["HEIGHT", "828 m"], ["FLOORS", "163"]].map(([a, b], i) => `<div id="st${i}" style="padding:20px 28px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;font-stretch:112%;color:#fff;margin-top:6px">${b}</div></div>`).join("")}</div>
  <div style="width:1080px;text-align:center;margin-top:20px;font:800 40px D;color:#3dff8c;letter-spacing:.06em">TALLEST BUILDING ON EARTH</div>`, { left: "0px", top: "1420px" });
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 200px/0.85 D;font-stretch:112%;color:#ffd166;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 46px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MOTION EXAGGERATED</div>`, { left: "330px", top: "1110px" });
hudEl("cmp", `<div style="width:1080px;display:flex;justify-content:center;gap:20px">${[["PLAIN TOWER", "#ff8a5c", "ROCKS"], ["BURJ KHALIFA", "#7dffc0", "STAYS CALM"]].map(([a, c, b]) => `<div style="padding:16px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:800 34px D;color:${c}">${a}</div><div style="font:700 22px M;letter-spacing:.18em;color:#cfd6dd;margin-top:6px">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1430px" });
hudEl("setc", `<div style="width:1080px;text-align:center"><span style="display:inline-block;padding:16px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #3dff8c;font:700 26px M;letter-spacing:.2em;color:#9aa6b2">SETBACK <span id="setn" style="font:900 60px D;color:#3dff8c;letter-spacing:0">1</span> / 27</span></div>`, { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["NO APP", "NO LOGIN", "RESUMES"].map((s, i) => `<div id="oc${i}" style="padding:18px 26px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 40px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ffd166") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
function setSway(x, z = 0) { BU.uSway.value.set(x, z); for (const o of SWAYERS) { const k = Math.pow(o.userData.sy / TIP, 2); o.position.set(o.userData.base.x + x * k, o.userData.base.y, o.userData.base.z + z * k); } }
function xrayLook(k) { skyU.uDim.value = 1 - 0.85 * k; H.key.intensity = lerp(2.7, 0.35, k); H.hemi.intensity = lerp(0.65, 0.18, k); H.envK.value = lerp(0.38, 0.12, k); scene.fog.color.copy(FOG.c).lerp(new THREE.Color(0x0c1420), k); H.bloom.strength = lerp(0.3, 0.6, k); }
function dayLook() { skyU.uDim.value = 1; H.key.intensity = 2.7; H.hemi.intensity = 0.65; H.envK.value = 0.38; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.25; H.rimB.intensity = 0.4; H.key.position.copy(SUN.clone().multiplyScalar(1500)); H.key.target.position.set(0, 0, 0); }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const orb = (a, rad, h, c = V(0, 0, 0)) => V(c.x + Math.sin(a) * rad, c.y + h, c.z + Math.cos(a) * rad);
function lab(t, both) {
  LAB.visible = true; CITY.visible = false; burj.visible = false; burjShadow.visible = false; for (const o of SWAYERS) o.visible = false; sky.visible = false; scene.fog.density = 0.0008; scene.fog.color.set(0x07080a);
  scene.background = new THREE.Color(0x07080a); H.key.intensity = 0.6; H.hemi.intensity = 0.3; H.bloom.strength = 0.5;
  for (const s of [...SMOKE_C, ...SMOKE_B]) s.U.uT.value = t;
  CYLG.position.set(0, 0, both ? -15 : 0); BURG.position.set(0, 0, 15); BURG.visible = both;
  SMOKE_C.forEach((s) => s.update()); if (both) SMOKE_B.forEach((s) => s.update());
  const T = 4.4 / (0.2 * 6.0);                                   // shedding period of the plain cylinder (s)
  return T;
}
const LP = (x, y, z) => LAB.position.clone().add(V(x, y, z));
{
}

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
H.frame("Big files, no weak point", async (t) => {
  H.cam.up.set(0, 1, 0);
  dayLook(); camRange(1, 70000); sky.visible = true; CITY.visible = true; burj.visible = true; burjShadow.visible = true; for (const o of SWAYERS) o.visible = true;
  LAB.visible = false; XR.visible = false; FND.visible = false; OR.visible = false; streaks.visible = false; scene.background = null; H.zoom = 1; H.bloom.strength = 0.3;
  BU.uX.value = 0; BU.uHiK.value = 0; setSway(0); burj.material.depthWrite = true; ground.visible = true; cityFloor.visible = true;
  gulf.material.uniforms.time.value = t * 0.6; lake.material.uniforms.time.value = t * 0.4; keyShadow(V(0, 200, 0), 500); traffic(t); fountain(t, 0); skyU.uT.value = t;
  const swayNow = (amp) => setSway(amp * Math.sin(t * TAU / 9.6));

  if (t < at("tower")) { // HOOK: over the desert toward the tower, then straight down onto its Y plan → a flower
    const cutA = fr("hook", 0.45);
    if (t < cutA) { fountain(t, 1); move(t, 0, cutA, [V(-150, 14, 470), V(0, 330, 0), 46], [V(-110, 30, 400), V(0, 360, 0), 44], 0.4); title(t, fr("hook", 0.03), fr("hook", 0.42), "Dubai", "The tallest building", 150); }
    else { camRange(10, 70000); move(t, cutA, at("tower"), [V(0.1, 1500, 0.1), V(0, 0, 0), 14], [V(0.1, 1300, 0.1), V(0, 0, 0), 13], 0.1);
      hudShow("flower", win(t, cutA + 0.5, at("tower"), 0.5, 0.3), { transform: `rotate(${(t - cutA) * 4}deg)` }); hudShow("flowerT", win(t, cutA + 0.6, at("tower"), 0.5, 0.3)); }
  } else if (t < at("enemy")) { // the tower: rise up the facade to the tip; the stats
    const k = prog(t, at("tower"), at("enemy"));
    fountain(t, 1); move(t, at("tower"), at("enemy"), [orb(0.6, 640, 230), V(0, 220, 0), 34], [orb(1.3, 760, 780), V(0, 640, 0), 34], 0.4);
    callout("h828", t, fr("tower", 0.25), at("enemy"), V(0, TIP, 0), 760, 360);
    hudShow("stats", win(t, fr("tower", 0.3), at("enemy"), 0.4, 0.3));
    if (k > 0.7) title(t, fr("tower", 0.7), at("enemy") + 0.1, "Burj Khalifa", "828 m", 150);
  } else if (t < at("vortex")) { // wind at the top: blowing sand streaks past the spire
    keyShadow(V(0, 560, 0), 120);
    move(t, at("enemy"), at("vortex"), [V(140, 560, 190), V(0, 590, 0), 40], [V(110, 600, 150), V(0, 620, 0), 38], 1.2);
    wind(t, 160, 10, true, V(1, 0.02, 0.25)); setSway(0.8 * Math.sin(t * 2.2));
    title(t, fr("enemy", 0.45), at("vortex"), "Its biggest enemy", "Wind", 150); callout("wind", t, fr("enemy", 0.3), at("vortex"), V(40, 600, 20), 300, 1180);
  } else if (t < at("rock")) { // the wind lab: one plain tower, the vortex street from above
    lab(t, false);
    move(t, at("vortex"), at("rock"), [LP(-46, 120, 0), LP(42, 0, 0), 40], [LP(-40, 112, 0), LP(44, 0, 0), 40], 0.2);
    title(t, fr("vortex", 0.05), fr("vortex", 0.45), "Wind tunnel", "Vortex shedding", 150);
    callout("peel", t, fr("vortex", 0.4), at("rock"), LAB.localToWorld(V(8, 22, 3)), 760, 1180);
  } else if (t < at("flower")) { // the pushes keep the rhythm → it rocks (exaggerated)
    const T = lab(t, false); const amp = 0.04 + 0.16 * prog(t, at("rock"), at("flower")); cyl.rotation.x = amp * Math.sin((t - at("rock")) * TAU / T);
    move(t, at("rock"), at("flower"), [LP(70, 22, 4), LP(0, 14, 0), 40], [LP(64, 26, 2), LP(0, 14, 0), 40], 0.3);
    hudShow("exag", win(t, at("rock") + 0.3, at("flower"))); callout("push", t, fr("rock", 0.2), at("flower"), LAB.localToWorld(V(0, 24, 0)), 760, 600);
  } else if (t < at("setbacks")) { // a desert flower: the Y plan from above, three wings
    camRange(10, 70000);
    move(t, at("flower"), at("setbacks"), [V(0.1, 1150, 0.1), V(0, 0, 0), 15], [V(0.1, 1000, 0.1), V(0, 0, 0), 15], 0.1);
    hudShow("flower", win(t, at("flower"), fr("flower", 0.6), 0.4, 0.4), { transform: `rotate(${t * 3}deg)` });
    title(t, fr("flower", 0.0), fr("flower", 0.5), "Shaped like", "A desert flower", 150);
    callout("wings", t, fr("flower", 0.5), at("setbacks"), V(Math.cos(WING[0]) * 60, 110, Math.sin(WING[0]) * 60), 760, 1150);
  } else if (t < at("confuse")) { // 27 setbacks spiral up: highlight each in turn while the camera climbs round
    const k = prog(t, at("setbacks"), at("confuse")); const n = Math.min(26, Math.floor(k * 27)); BU.uHi.value = SETS[n]; BU.uHiK.value = 1;
    H.$("setn").textContent = String(n + 1); hudShow("setc", win(t, at("setbacks") + 0.2, at("confuse")));
    move(t, at("setbacks"), at("confuse"), [orb(2.2, 420, 260), V(0, 200, 0), 38], [orb(4.4, 340, 620), V(0, 520, 0), 38], 0.3);
  } else if (t < at("sway")) { // the same wind on both: the plain one rocks, the Burj barely moves
    const T = lab(t, true); cyl.rotation.x = 0.16 * Math.sin((t - at("confuse")) * TAU / T); mini.rotation.x = 0.012 * Math.sin(t * 3.7) * Math.sin(t * 1.3);
    if (t < fr("confuse", 0.5)) move(t, at("confuse"), fr("confuse", 0.5), [LP(-50, 150, 0), LP(40, 0, 0), 46], [LP(-44, 140, 0), LP(42, 0, 0), 46], 0.2);
    else move(t, fr("confuse", 0.5), at("sway"), [LP(80, 26, 0), LP(0, 14, 0), 44], [LP(74, 28, 0), LP(0, 14, 0), 44], 0.3);
    hudShow("cmp", win(t, at("confuse") + 0.3, at("sway"))); title(t, fr("confuse", 0.62), at("sway"), "Engineers call it", "Confusing the wind", 150);
    callout("plain", t, fr("confuse", 0.1), fr("confuse", 0.5), LAB.localToWorld(V(0, 26, -15)), 300, 1180); callout("burjL", t, fr("confuse", 0.15), fr("confuse", 0.5), LAB.localToWorld(V(0, 24, 15)), 760, 1050);
    if (t > fr("confuse", 0.5)) hudShow("exag", win(t, fr("confuse", 0.5), at("sway")));
  } else if (t < at("core")) { // the real top still moves ≈ 1.5 m (shown ×20)
    swayNow(30); keyShadow(V(0, 500, 0), 260);
    move(t, at("sway"), at("core"), [V(820, 380, 900), V(0, 470, 0), 30], [V(760, 420, 820), V(0, 500, 0), 30], 0.3);
    callout("top", t, fr("sway", 0.15), at("core"), V(BU.uSway.value.x, TIP - 20, 0), 760, 420); hudShow("exag", win(t, at("sway") + 0.2, at("core")));
  } else if (t < at("pump")) { // x-ray: the hexagonal core and the three wings bracing it
    XR.visible = true; for (const o of SWAYERS) o.visible = false; BU.uX.value = smooth(prog(t, at("core"), at("core") + 0.8)); burj.material.depthWrite = false; xrayLook(BU.uX.value); coreMat.emissiveIntensity = 0.9; butMat.emissiveIntensity = 0.6 * smooth(prog(t, fr("core", 0.45), fr("core", 0.6)));
    if (t < fr("core", 0.5)) move(t, at("core"), fr("core", 0.5), [orb(0.9, 620, 330), V(0, 300, 0), 42], [orb(1.3, 560, 360), V(0, 300, 0), 42], 0.3);
    else { camRange(5, 70000); move(t, fr("core", 0.5), at("pump"), [V(0.1, 1250, 0.1), V(0, 200, 0), 12], [V(0.1, 1150, 0.1), V(0, 200, 0), 12], 0.1); }
    callout("core", t, fr("core", 0.12), at("pump"), t < fr("core", 0.5) ? V(0, 300, CORE_R) : V(0, TOPC - 40, 0), 300, 1180); callout("brace", t, fr("core", 0.55), at("pump"), V(Math.cos(WING[1]) * 30, TOPC - 60, -Math.sin(WING[1]) * 30), 760, 1250);
  } else if (t < at("piles")) { // concrete pumped up the core: slugs racing up to 606 m
    XR.visible = true; BU.uX.value = 1; burj.material.depthWrite = false; xrayLook(1); butMat.emissiveIntensity = 0.1; coreMat.emissiveIntensity = 0.5; const k = prog(t, at("pump"), at("piles"));
    SLUGS.forEach((m, i) => { const u = ((i / SLUG_N + (t - at("pump")) * 0.35) % 1); m.position.y = u * 606 * Math.min(1, k * 1.6 + 0.05); m.visible = m.position.y < 606; });
    const yC = lerp(40, 606, ease(prog(t, at("pump"), fr("pump", 0.8))));
    move(t, at("pump"), at("piles"), [orb(0.55, 560, 140), V(0, 120, 0), 40], [orb(0.75, 520, 640), V(0, 580, 0), 40], 0.3);
    setBig(`${Math.round(yC)} m`, "CONCRETE PUMPED UP"); hudShow("big", win(t, at("pump") + 0.2, at("piles"))); callout("rec", t, fr("pump", 0.75), at("piles"), V(16, 606, 0), 300, 1200);
  } else if (t < at("spire")) { // under the desert: the raft and its 192 piles in the layered ground
    FND.visible = true; XR.visible = true; BU.uX.value = 0.85; burj.material.depthWrite = false; butMat.emissiveIntensity = 0.2; coreMat.emissiveIntensity = 0.5; ground.visible = false; cityFloor.visible = false; camRange(1, 70000);
    scene.fog.density = 0.004; scene.fog.color.set(0x2a2219); scene.background = new THREE.Color(0x2a2219); sky.visible = false; CITY.visible = false; H.hemi.intensity = 1.4; H.key.intensity = 1.5; keyShadow(V(0, -20, 0), 120);
    move(t, at("piles"), at("spire"), [V(150, 30, 175), V(0, -20, 0), 40], [V(120, -32, 150), V(0, -26, 0), 42], 0.3);
    const n = Math.round(192 * ease(prog(t, at("piles"), fr("piles", 0.5)))); setBig(String(n), "PILES"); hudShow("big", win(t, at("piles") + 0.2, fr("piles", 0.55), 0.3, 0.3));
    callout("piles", t, fr("piles", 0.25), at("spire"), V(30, -30, 20), 760, 1150); callout("deep", t, fr("piles", 0.55), at("spire"), V(-20, -48, 12), 300, 1300); callout("raft", t, fr("piles", 0.7), at("spire"), V(-40, -2, 30), 300, 980);
  } else if (t < at("orbi")) { // the steel spire against the late sun
    keyShadow(V(0, 700, 0), 160); swayNow(4);
    move(t, at("spire"), at("orbi"), [V(70, 640, 110), V(0, 700, 0), 34], [V(55, 700, 80), V(0, 760, 0), 32], 0.5);
    callout("spire", t, fr("spire", 0.15), at("orbi"), V(BU.uSway.value.x * 0.6, 700, 0), 300, 1180); callout("h828", t, fr("spire", 0.45), at("orbi"), V(BU.uSway.value.x, TIP, 0), 760, 300);
  } else { // ORBI: a hotel window over Dubai; the big file goes in parts, pauses with the signal, resumes
    OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); H.envK.value = 0.6; orbiL.intensity = 0.5;
    const L = OR.position; OR.updateMatrixWorld(); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const up = t < at("orbi2") ? 0 : t < fr("orbi3", 0.15) ? 0.62 * prog(t, at("orbi2"), fr("orbi3", 0.15)) : t < fr("orbi3", 0.55) ? 0.62 : lerp(0.62, 1, prog(t, fr("orbi3", 0.55), at("end")));
    const pause = t > fr("orbi3", 0.15) && t < fr("orbi3", 0.55);
    screen(lap, { up: t > at("orbi2") - 0.2 ? Math.round(up * 200) / 200 : -1, pause }, drawLap);
    screen(ph, { land: clamp(up * 1.2), wifi: t > fr("orbi3", 0.15) && t < fr("orbi3", 0.75) ? (pause ? "off" : "on") : "" }, drawPhone);
    const a0 = lap.g.position.clone().add(V(0.2, 1.0, 0.2)), b0 = ph.g.position.clone().add(V(0, 0.2, 0));
    PARTS.forEach((m, i) => { const st = at("orbi2") + Math.floor(i / 3) * 0.9 + (i % 3) * 0.12; const k = pause && i >= 6 ? 0 : clamp((t - st) / 0.8); m.visible = t > at("orbi2") && k > 0 && k < 1 && !(pause && i >= 6);
      m.position.copy(a0).lerp(b0, ease(k)).add(V(0, Math.sin(k * Math.PI) * 0.8, (i % 3 - 1) * 0.25)); m.rotation.set(k * 3, k * 2, 0); });
    lock.position.copy(lap.g.position).add(V(-0.2, 2.4, 0.3)); lock.visible = t < at("orbi2"); lock.rotation.y = t;
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.4, 2.0, 9), OW(0.4, 1.2, 0), 36], [OW(0.3, 1.8, 7.2), OW(0.4, 1.0, 0), 36], 0.3);
    else if (t < at("orbi3")) { move(t, at("orbi2"), at("orbi3"), [OW(-0.6, 3.2, 4.8), OW(0.4, 0.6, 0.3), 34], [OW(-0.2, 3.0, 4.4), OW(0.6, 0.6, 0.4), 34], 0.2);
      callout("parts", t, fr("orbi2", 0.2), at("orbi3"), OR.localToWorld(PARTS[1].position.clone()), 760, 560); }
    else { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, at("orbi3"), at("end"), [OW(...pc.clone().addScaledVector(pn, 3.3).toArray()), OW(...pc.toArray()), 34], [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 34], 0.03);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); hudShow("chips", win(t, fr("orbi3", 0.6), at("end"))); }
  }
  if (window.DBG) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[2] === "solo") { CITY.visible = false; } if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) H.$(id).style.visibility = "hidden"; } }
});
await H.ready();
