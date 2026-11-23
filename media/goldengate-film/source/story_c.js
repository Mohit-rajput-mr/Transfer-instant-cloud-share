
// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  tower: ["227 m", "#3dff8c", "tower above the water"], span: ["1,280 m", "#3dff8c", "of road between the towers"], deck: ["The deck", "#ffd166", "hangs, it doesn't rest"],
  truck: ["Truck", "#ffd166", "its weight goes into the deck"], susp: ["Suspender ropes", "#ffd166", "every 15 m"], cable: ["Main cable", "#ff8a3d", "carries it all"],
  push: ["Towers push down", "#3dff8c", "into the sea floor"], anch: ["Anchorage", "#6fd0ff", "60,000 tons each"], wrap: ["0.92 m thick", "#ff8a3d", "one main cable"],
  strand: ["61 strands", "#cfd6dd", "bundles of wire"], wire: ["Wire", "#cfd6dd", "4.9 mm thick"], sag: ["Midspan", "#ff8a3d", "moves with heat"],
});
hudEl("big", `<div style="width:1080px;text-align:center"><div id="bigN" style="font:900 170px/0.85 D;font-stretch:112%;color:#ff8a3d;text-shadow:0 12px 50px rgba(0,0,0,.65)">0</div><div id="bigL" style="font:800 44px D;color:#fff;letter-spacing:.12em;margin-top:8px"></div></div>`, { left: "0px", top: "230px" });
hudEl("exag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">MOTION EXAGGERATED</div>`, { left: "330px", top: "1110px" });
hudEl("therm", `<div style="width:1080px;text-align:center"><span id="thT" style="display:inline-block;padding:16px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #ff8a3d;font:900 50px D;color:#ff8a3d">HOT · CABLES STRETCH</span></div>`, { left: "0px", top: "1430px" });
hudEl("range", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${[["DOWN", "3.3 m", "#ff8a3d"], ["UP", "1.8 m", "#6fd0ff"]].map(([a, b, c]) => `<div style="padding:18px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;color:${c}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1420px" });
hudEl("orange", `<div style="width:1080px;text-align:center"><span style="display:inline-block;padding:18px 34px;border-radius:24px;background:rgba(8,10,16,.82);border:1.5px solid #c0362c;font:900 54px D;color:#ff6a4d">INTERNATIONAL ORANGE</span></div>`, { left: "0px", top: "1430px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["WHOLE FOLDERS", "ONE BUNDLE", "NO LOGIN"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
const setBig = (n, l, col = "#ff8a3d") => { H.$("bigN").textContent = n; H.$("bigN").style.color = col; H.$("bigL").textContent = l; };

// =====================================================================================================================
// HELPERS
// =====================================================================================================================
function dayLook() { H.key.intensity = 2.6; H.hemi.intensity = 0.85; H.envK.value = 0.3; scene.fog.color.copy(FOG.c); scene.fog.density = FOG.d; H.rimA.intensity = 0.2; H.rimB.intensity = 0.4; }
function keyShadow(c, r) { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(SUN.clone().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = r * 0.002; }
const CP = (x, y, z) => CC.position.clone().add(V(x, y, z));

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
H.frame("Whole folders, sent as one.", async (t) => {
  H.cam.up.set(0, 1, 0);
  dayLook(); camRange(0.5, 70000); sky.visible = true; sea.visible = true; LAND.visible = true; BRIDGE.visible = true; CC.visible = false; OR.visible = false; for (const f of FOGL) f.visible = true;
  scene.background = null; H.zoom = 1; H.bloom.strength = 0.3; flows(0); TRUCK.visible = false; setSag(SAG); keyShadow(V(0, 100, 0), 700);
  sea.material.uniforms.time.value = t * 0.5; sea.material.uniforms.uWT.value = t; FOGU.uT.value = t; FOGU.uK.value = 1; traffic(t);

  if (t < at("bridge")) { // HOOK: sunrise, fog rolling through the south tower; the cable fills the frame
    const c = fr("hook", 0.55);
    if (t < c) { move(t, 0, c, [V(-700, 40, -1500), V(0, 140, -ZT), 30], [V(-520, 70, -1200), V(0, 160, -ZT), 30], 0.5); title(t, fr("hook", 0.03), c, "San Francisco", "Two cables", 150); }
    else { keyShadow(V(-CX, cableY(-300), -300), 90); move(t, c, at("bridge"), [V(-CX - 7, cableY(-250) - 1, -250), V(-CX, cableY(-420), -420), 44], [V(-CX - 5, cableY(-270) + 1, -270), V(-CX, cableY(-460), -460), 40], 0.4);
      setBig(Math.round(27572 * ease(prog(t, c, at("bridge") - 0.3))).toLocaleString("en-US"), "WIRES IN ONE CABLE"); hudShow("big", win(t, c + 0.2, at("bridge"))); }
  } else if (t < at("hang")) { // the whole bridge, drone rising past a tower
    move(t, at("bridge"), at("hang"), [V(-620, 170, -1500), V(0, 120, -100), 38], [V(-480, 290, -1350), V(0, 110, -100), 38], 0.4);
    callout("tower", t, fr("bridge", 0.1), fr("bridge", 0.55), V(0, TOWER_H, -ZT), 300, 420); callout("span", t, fr("bridge", 0.5), at("hang"), V(0, DECK + 2, 0), 760, 1150);
  } else if (t < at("load")) { // under the deck: it hangs
    keyShadow(V(0, DECK, 0), 80); move(t, at("hang"), at("load"), [V(-60, DECK - 30, -40), V(0, DECK, 20), 40], [V(-45, DECK - 22, -20), V(0, DECK + 4, 30), 40], 0.4);
    callout("deck", t, fr("hang", 0.3), at("load"), V(0, DECK - 4, 15), 760, 1150);
  } else if (t < at("anchor")) { // the load path: truck → deck → suspenders → cable → towers
    TRUCK.visible = true; const k = t < at("towers") ? 0.5 * prog(t, at("load"), at("towers")) : 0.5 + 0.25 * prog(t, at("towers"), at("anchor")); flows(k); H.bloom.strength = 0.45;
    if (t < at("towers")) { keyShadow(V(0, DECK, 0), 80); move(t, at("load"), at("towers"), [V(-70, DECK + 30, -60), V(-8, DECK + 6, 0), 40], [V(-95, DECK + 60, -110), V(-8, DECK + 30, 0), 42], 0.3);
      callout("truck", t, fr("load", 0.05), fr("load", 0.35), V(-5, DECK + 3, 0), 760, 1050); callout("susp", t, fr("load", 0.35), fr("load", 0.7), V(-CX, DECK + 12, 0), 300, 900); callout("cable", t, fr("load", 0.7), at("towers"), V(-CX, cableY(0), 0), 760, 700); }
    else { move(t, at("towers"), at("anchor"), [V(-520, 90, ZT - 380), V(0, 110, ZT), 40], [V(-470, 70, ZT - 300), V(0, 100, ZT), 40], 0.3); callout("push", t, fr("towers", 0.4), at("anchor"), V(-CX, 40, ZT), 760, 1200); }
  } else if (t < at("cable")) { // anchorage: the cables dive into 60,000 tons of concrete (cross-section)
    flows(0.75 + 0.25 * prog(t, at("anchor"), fr("anchor", 0.6))); keyShadow(V(0, 30, ZA), 120);
    move(t, at("anchor"), at("cable"), [V(260, 150, ZA - 260), V(0, 50, ZA), 40], [V(220, 125, ZA - 200), V(0, 45, ZA + 10), 40], 0.3);
    callout("anch", t, fr("anchor", 0.3), at("cable"), V(0, 40, ZA + 30), 760, 1180);
  } else if (t < at("move")) { // INSIDE THE CABLE: cut, strands, wires; spun across, compacted
    CC.visible = true; BRIDGE.visible = false; LAND.visible = false; sea.visible = false; sky.visible = false; for (const f of FOGL) f.visible = false; scene.background = new THREE.Color(0x0c0e12); scene.fog.density = 0; camRange(0.002, 200);
    H.key.intensity = 0.6; H.hemi.intensity = 0.6; H.envK.value = 0.8; H.bloom.strength = 0.2;
    if (t < at("strands")) { move(t, at("cable"), at("strands"), [CP(1.5, 0.8, 2.2), CP(0, 0, -0.6), 36], [CP(0.9, 0.5, 1.7), CP(0, 0, -0.3), 34], 0.05); callout("wrap", t, fr("cable", 0.3), at("strands"), CP(R_CABLE, 0, -1.5), 760, 1150); }
    else if (t < at("wires")) { move(t, at("strands"), at("wires"), [CP(0.55, 0.35, 1.0), CP(0, 0, 0), 34], [CP(0.35, 0.22, 0.7), CP(0, 0, 0), 32], 0.03);
      setBig("61", "STRANDS"); hudShow("big", win(t, at("strands") + 0.2, at("wires"))); callout("strand", t, fr("strands", 0.2), at("wires"), CP(strandCentres[20][0], strandCentres[20][1], 0.2), 760, 1150); }
    else if (t < at("spin")) { const s0 = strandCentres[3]; move(t, at("wires"), at("spin"), [CP(s0[0] + 0.12, s0[1] + 0.08, 0.45), CP(s0[0], s0[1], 0.2), 30], [CP(s0[0] + 0.05, s0[1] + 0.035, 0.32), CP(s0[0], s0[1], 0.22), 26], 0.01);
      setBig(Math.round(27572 * ease(prog(t, at("wires"), fr("wires", 0.8)))).toLocaleString("en-US"), "WIRES"); hudShow("big", win(t, at("wires") + 0.1, at("spin"))); callout("wire", t, fr("wires", 0.6), at("spin"), CP(s0[0] + wirePos[30][0], s0[1] + wirePos[30][1], 0.3), 760, 1150); }
    else { setStrands(0.25 * (1 - ease(prog(t, at("spin"), fr("spin", 0.8))))); move(t, at("spin"), at("move"), [CP(-0.9, 0.5, 1.6), CP(0, 0, -0.3), 36], [CP(-1.2, 0.7, 2.2), CP(0, 0, -0.6), 36], 0.05); }
  } else if (t < at("orange")) { // heat stretches the cables → the deck sinks; cold → it rises (×1.0 visual metres ×8)
    const ph2 = prog(t, at("move"), at("orange")); const hot = t < fr("move", 0.55); const s = SAG + (hot ? 3.3 : -1.8) * 8 * smooth(clamp(hot ? prog(t, fr("move", 0.1), fr("move", 0.5)) : prog(t, fr("move", 0.6), fr("move", 0.95))));
    setSag(t < at("range") ? s : SAG + (Math.sin((t - at("range")) * 1.6) > 0 ? 3.3 : -1.8) * 8 * Math.abs(Math.sin((t - at("range")) * 1.6)));
    move(t, at("move"), at("orange"), [V(-330, 120, -260), V(0, 95, 60), 40], [V(-310, 118, -230), V(0, 95, 60), 40], 0.2);
    H.$("thT").textContent = hot ? "HOT · CABLES STRETCH" : "COLD · CABLES SHORTEN"; H.$("thT").style.color = hot ? "#ff8a3d" : "#6fd0ff";
    if (t < at("range")) hudShow("therm", win(t, at("move") + 0.2, at("range"))); else hudShow("range", win(t, at("range") + 0.2, at("orange")));
    hudShow("exag", win(t, at("move") + 0.3, at("orange"))); callout("sag", t, fr("move", 0.2), at("orange"), V(0, DECK - deckDrop(0), 0), 760, 1000);
  } else if (t < at("orbi")) { // International Orange in the fog
    FOGU.uK.value = 1.6; move(t, at("orange"), at("orbi"), [V(-300, 75, -900), V(0, 150, -ZT), 30], [V(-260, 82, -820), V(0, 160, -ZT), 30], 0.4);
    hudShow("orange", win(t, fr("orange", 0.15), at("orbi")));
  } else { // ORBI at the Battery Spencer overlook
    OR.visible = true; camRange(0.05, 70000); keyShadow(OR.position.clone(), 6); orbiL.intensity = 0.5; OR.updateMatrixWorld(); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const bk = t < at("orbi2") ? -1 : clamp(prog(t, fr("orbi2", 0.1), fr("orbi2", 0.8))); const got = t < at("orbi3") ? 0 : clamp(prog(t, at("orbi3"), fr("orbi3", 0.6)));
    screen(lap, { k: bk < 0 ? (t > fr("orbi", 0.4) ? 0 : -1) : Math.round(bk * 50) / 50 }, drawLap); screen(ph, { got: Math.round(got * 40) / 40 }, drawPhone);
    const a0 = lap.g.position.clone().add(V(0.3, 1.0, 0.25)), hub = lap.g.position.clone().add(V(0.6, 2.1, 0.4)), b0 = ph.g.position.clone().add(V(0, 0.25, 0));
    FILES.forEach((m, i) => { const st = fr("orbi2", 0.1) + i * 0.035, k = clamp((t - st) / 0.8); m.visible = t > at("orbi2") && k > 0 && k < 1 && t < at("orbi3");
      const sp = V(Math.cos(i * 2.4) * 0.9, Math.sin(i * 1.7) * 0.5, Math.sin(i * 2.4) * 0.4); m.position.copy(a0).add(sp).lerp(hub, ease(k)); m.rotation.set(k * 4, i, 0); });
    const fk = clamp(prog(t, fr("orbi2", 0.85), fr("orbi3", 0.25))); BUNDLE.visible = t > fr("orbi2", 0.2) && fk < 1; BUNDLE.position.copy(hub).lerp(b0, ease(fk)).add(V(0, Math.sin(fk * Math.PI) * 0.8, 0)); BUNDLE.scale.setScalar(clamp(prog(t, fr("orbi2", 0.2), fr("orbi2", 0.8)), 0.2, 1)); BUNDLE.rotation.y = t;
    lock.visible = false;
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.5, 2.2, 10.5), OW(0.5, 0.9, 0), 40], [OW(0.4, 2.0, 8.6), OW(0.5, 0.8, 0), 40], 0.3);
    else if (t < at("orbi3")) move(t, at("orbi2"), at("orbi3"), [OW(0.2, 3.4, 7.0), OW(0.5, 0.5, 0), 38], [OW(0.4, 3.2, 6.4), OW(0.6, 0.5, 0), 38], 0.2);
    else if (t < fr("orbi3", 0.3)) move(t, at("orbi3"), fr("orbi3", 0.3), [OW(-0.4, 2.6, 6.2), OW(1.4, 0.7, 0.4), 38], [OW(-0.3, 2.4, 5.6), OW(1.6, 0.6, 0.5), 38], 0.2);
    else { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
      move(t, fr("orbi3", 0.3), at("end"), [OW(...pc.clone().addScaledVector(pn, 3.3).toArray()), OW(...pc.toArray()), 34], [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 34], 0.03);
      H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); hudShow("chips", win(t, fr("orbi3", 0.5), at("end"))); }
  }
});
await H.ready();
