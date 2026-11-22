
// =====================================================================================================================
// PER FRAME (the camera never moves; only the ground shakes it)
// =====================================================================================================================
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const fmtKm = (d) => `${fmt(d)} km`;
const fmtTide = (m) => (m >= 1000 ? `+${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `+${m >= 10 ? fmt(m) : m.toFixed(1)} m`);
const ALLMATS = []; [CITY, ...TOWERS.map((q) => q.g)].forEach((g) => g.traverse((m) => { if (m.isMesh && m.material.isMeshStandardMaterial && !ALLMATS.includes(m.material)) { ALLMATS.push(m.material); m.material.userData.c0 = m.material.color.clone(); } }));
const GREY = new THREE.Color(0.3, 0.29, 0.28);
const wrap = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));

function quakeAmp(t) { return t < 46 ? 0 : t < 49 ? lerp(0, 0.035, prog(t, 46, 49)) : t < 58 ? 0.05 + 0.04 * Math.max(0, Math.sin(t * 1.7)) : t < 70 ? 0.02 : t < 78 ? lerp(0.05, 0.12, prog(t, 70, 76)) : 0; }
function waterLevel(t) {
  const tide = (a, b, y0, y1, amp, w = 0.8) => lerp(y0, y1, ease(prog(t, a, b))) + amp * Math.sin(t * w);
  if (t < 22) return -2.2 + 0.08 * Math.sin(t * 0.7);
  if (t < 34) return tide(22, 34, -2.2, -0.9, 0.55 * prog(t, 22, 34));
  if (t < 46) return tide(34, 46, -0.9, -0.1, 0.55);
  if (t < 58) return tide(46, 58, -0.1, 0.55, 0.3, 1.3);
  if (t < 70) return tide(58, 70, 0.55, 1.05, 0.25, 1.1);
  return lerp(1.05, -9, ease(prog(t, 70, 78)));
}

function caption(t) {
  for (const ln of H.LINES.lines) { if (!ln.text) continue; const k = win(t, ln.at, ln.at + ln.dur, 0.3, 0.3);
    if (k > 0) { H.$("capT").innerHTML = ln.text.replace(/(\d[\d.,]*\s?(million km|km|°C|degrees)?|event horizon)/gi, "<b>$1</b>"); hudShow("cap", k, { transform: `translateY(${(1 - out(clamp((t - ln.at) / 0.4))) * 12}px)` }); return; } }
}
function counters(t, d) {
  const set = (p, L, V2, S) => { H.$(p + "L").textContent = L; H.$(p + "V").textContent = V2; H.$(p + "S").textContent = S; };
  const st = t < 22 ? "Mass: 10 Suns · 59 km wide" : t < 34 ? "In free fall: you feel no pull" : t < 40 ? "The Moon is lost" : t < 58 ? "Its disk: millions of °C" : t < 70 ? "Its tides now beat gravity" : t < 80 ? "Earth is torn apart" : "Event horizon";
  set("a", "Distance to the black hole", fmtKm(t >= 86.2 ? 0 : d), st); hudShow("c1", win(t, 5.8, 88.4, 0.5, 0.4));
  if (t >= 22 && t < 58) { set("b", "Ocean tide", fmtTide(tideM(d)), "Normal: 0.5 m"); hudShow("c2", win(t, 22.2, 58, 0.5, 0.3)); }
  else if (t >= 58 && t < 78) { set("b", "Weight on this side", `${Math.round(weight(d) * 100)} %`, "of normal"); hudShow("c2", win(t, 58.2, 78, 0.3, 0.4)); }
}

function people(t) {
  const ash = prog(t, 72, 76.5);
  for (const q of PEOPLE) {
    const { p, acts } = q; let mode = "walk", x, z = q.z, y = 0, h;
    const walkX = (s) => wrap(q.x0 + q.dir * q.spd * (s + q.off), -27, 27);
    if (q.still && t < q.react) { mode = "idle"; x = q.x0; h = Math.PI + (q.dir * 0.4); }
    else if (t < q.react) { x = walkX(t); h = q.dir * Math.PI / 2; }
    else if (t < q.react + 3.2) { mode = "idle"; x = q.still ? q.x0 : walkX(q.react); h = lerp(q.still ? Math.PI + q.dir * 0.4 : q.dir * Math.PI / 2, Math.PI - 0.25, out(prog(t, q.react, q.react + 1))); }
    else { const xr = q.still ? q.x0 : walkX(q.react); const rt = Math.min(t, q.lift) - q.react - 3.2; mode = "run";
      x = wrap(xr + q.dir * 3.8 * rt, -27, 27); z = lerp(q.z, 21, out(clamp(rt / 5))); h = Math.atan2(q.dir * 0.85, 0.5); }
    if (t > q.lift) { const s = t - q.lift; mode = "idle"; y = 0.32 * s * s; x += BH_DIR.x * 0.12 * s * s; z -= 0.08 * s * s; }
    p.position.set(x, y, z); p.rotation.set(0, h + q.f0, 0);
    if (t > q.lift) { const s = t - q.lift; p.rotation.x += q.spin.x * s; p.rotation.z += q.spin.z * s; p.rotation.y += q.spin.y * s; }
    acts.walk.weight = mode === "walk" ? 1 : 0; acts.run.weight = mode === "run" ? 1 : 0; acts.idle.weight = mode === "idle" ? 1 : 0;
    acts.run.timeScale = 1.15; q.mx.setTime(t + q.off);
    for (const m of q.mats) m.color.copy(m.userData.c1 || (m.userData.c1 = m.color.clone())).lerp(GREY, ash);
    p.visible = t < 77 && y < 60;
  }
}

function towers(t, power) {
  for (const T of TOWERS) {
    const qa = quakeAmp(t);
    T.g.rotation.z = Math.sin(t * 2.3 + T.ph) * qa * 0.06; T.g.rotation.x = Math.sin(t * 1.9 + T.ph * 2) * qa * 0.03;
    T.mat.emissiveIntensity = 1.25 * power * (0.85 + 0.15 * Math.sin(t * 3 + T.ph * 9) * (t > 46 ? 1 : 0));
    T.red.visible = power > 0.5 && Math.sin(t * 3.4 + T.ph) > 0;
    const lift = t > 64 ? 0.5 * 2.2 * (t - 64) ** 2 : 0;
    T.segs.forEach((s, i) => {
      if (T.fall && t > T.tFall + i * 0.3) { const f = t - T.tFall - i * 0.3; s.m.position.set(s.dx * Math.min(f, 3) * 0.3, s.y0 - 0.5 * 9.8 * f * f * (1 - i * 0.08) + lift, 0); s.m.rotation.set(s.rx * f, 0, s.rz * f); s.m.visible = s.m.position.y > -40; }
      else { s.m.position.set(0, s.y0 + lift * (1 + i * 0.1), 0); s.m.rotation.set(lift > 0 ? s.rx * (t - 64) * 0.4 : 0, 0, lift > 0 ? s.rz * (t - 64) * 0.4 : 0); s.m.visible = true; }
    });
    T.g.visible = t < 78;
  }
  // dust clouds rolling out from the towers that came down
  const falling = TOWERS.filter((T) => T.fall); let k = 0;
  for (let i = 0; i < DUST.n; i++) { const T = falling[i % falling.length]; const f = t - T.tFall - 0.8;
    if (!T || f < 0 || t > 78) { DUST.pos[i * 3 + 1] = -999; continue; }
    const a = rand(i) * TAU, r = (6 + rand(i + 1) * 30) * Math.min(1, f / 4) * (1 + f * 0.08); k++;
    DUST.pos[i * 3] = T.g.position.x + Math.cos(a) * r; DUST.pos[i * 3 + 1] = -2 + rand(i + 2) * T.hgt * 0.45 * Math.min(1, f / 3) + f * 2; DUST.pos[i * 3 + 2] = T.g.position.z + Math.sin(a) * r * 0.6; }
  DUST.P.material.opacity = 0.32; DUST.P.geometry.attributes.position.needsUpdate = true;
}

function moonAndStream(t) {
  const k = prog(t, 34, 38.4);
  if (t < 38.4) { const d = MOON_DIR.clone().lerp(BH_DIR, ease(k) * 0.9).normalize(); MOON.position.copy(CAM).add(d.multiplyScalar(MOON_D)); MOON.visible = true;
    MOON.lookAt(CAM); const pm = MOON.position.clone().project(cam), pb = BH_DIR.clone().add(CAM).project(cam);
    MOON.rotateZ(Math.atan2(pb.y - pm.y, (pb.x - pm.x) * (W / HH)) + Math.PI);
    const st = Math.pow(k, 2); MOON.scale.set(1 + st * 7, 1 - st * 0.6, 1); MOON.material.color.setRGB(1.6 + st * 3, 1.6 + st * 1.4, 1.6 + st * 0.4);
  } else MOON.visible = false;
  const sk = win(t, 36.5, 46, 0.8, 2.5); STREAM.material.opacity = sk;
  if (sk > 0) for (let i = 0; i < STREAM_N; i++) { const u = (rand(i) + (t - 36.5) * 0.25) % 1; const from = MOON.visible ? MOON.position.clone().sub(CAM).normalize() : BH_DIR.clone().lerp(MOON_DIR, 0.1);
    const dd = from.clone().lerp(BH_DIR, u).normalize(); const sw = (1 - u) * 0.02 * Math.sin(u * 9 + rand(i + 1) * 6); dd.x += sw; dd.y += sw * 0.5 + (rand(i + 2) - 0.5) * 0.006 * (1 - u);
    const pp = CAM.clone().add(dd.normalize().multiplyScalar(MOON_D)); streamP.set([pp.x, pp.y, pp.z], i * 3); }
  STREAM.geometry.attributes.position.needsUpdate = true;
}

function particles(t) {
  // spray off the quay once the sea is wild, rising freely once nothing weighs anything
  const sk = t > 46 && t < 76 ? 1 : 0; SPRAY.P.material.opacity = sk * 0.75;
  for (let i = 0; i < SPRAY.n; i++) { const ph = (rand(i) + t * (0.6 + rand(i + 1) * 0.5)) % 1; const x = -26 + rand(i + 2) * 52;
    const float = t > 60 ? (t - 60) * (0.6 + rand(i + 3)) : 0; const y = waterLevel(t) + Math.sin(ph * Math.PI) * (1.2 + rand(i + 4) * 2) + float * float * 0.25;
    SPRAY.pos[i * 3] = x; SPRAY.pos[i * 3 + 1] = y; SPRAY.pos[i * 3 + 2] = 1 + rand(i + 5) * (t > 60 ? 14 : 3) - ph * 1.5; }
  SPRAY.P.geometry.attributes.position.needsUpdate = true;
  for (const D of DEBRIS) { const s = t - D.t0; const m = D.m; m.visible = t > 50 && t < 77;
    if (s < 0) { m.position.copy(D.p0); m.rotation.set(0, D.v, 0); } else { m.position.set(D.p0.x + BH_DIR.x * 0.1 * s * s, D.p0.y + 0.3 * D.v * s * s, D.p0.z - 0.05 * s * s); m.rotation.set(D.spin.x * s, D.spin.y * s, D.spin.z * s); } }
  // ash: everything streaming up into the disk
  const ak = win(t, 72, 82, 1.5, 2); ASH.P.material.opacity = ak;
  if (ak > 0) for (let i = 0; i < ASH.n; i++) { const s = (t - 72) * (0.7 + rand(i) * 0.8) + rand(i + 1) * 2; const base = V(-30 + rand(i + 2) * 60, rand(i + 3) * 6, -10 + rand(i + 4) * 26);
    const p = base.add(BH_DIR.clone().multiplyScalar(s * s * 1.6)).add(V(Math.sin(s * 2 + i) * 0.4, 0, Math.cos(s * 1.7 + i) * 0.4)); ASH.pos.set([p.x, p.y, p.z], i * 3); }
  ASH.P.geometry.attributes.position.needsUpdate = true;
}

H.frame("Some things vanish without a trace", async (t) => {
  const d = dist(t);
  // the fixed camera, shaken only by the ground
  const qa = quakeAmp(t), n = (f, p) => Math.sin(t * f + p) * Math.sin(t * f * 0.37 + p * 2);
  H.look(CAM.clone().add(V(n(31, 1) * qa, n(27, 2) * qa * 0.7, 0)), AIM.clone().add(V(n(23, 3) * qa * 8, n(29, 4) * qa * 6, 0)), FOV);
  STARS.position.copy(cam.position); GLOW.position.copy(cam.position);
  // power: on until the quakes cut it (flicker), then only the disk lights the city
  const power = t < 51.8 ? 1 : t < 53.6 ? (Math.sin(t * 47) > 0.2 ? 0.8 : 0.05) * (1 - prog(t, 51.8, 53.6)) : 0;
  GLOW.material.uniforms.k.value = 0.25 + 0.75 * power;
  for (const Lp of LAMPS) { Lp.L.intensity = 30 * power; Lp.head.material.color.setRGB(1, 0.8, 0.55).multiplyScalar(4 * power + 0.03); Lp.g.rotation.z = Math.sin(t * 2.6 + Lp.ph) * qa * 0.5; }
  // the sea
  const wl = waterLevel(t); water.position.y = wl; water.visible = t < 79;
  water.material.uniforms.time.value = t * (t < 46 ? 0.55 : 1.4); water.material.uniforms.distortionScale.value = t < 46 ? 2.6 : 6.5;
  const disk = t > 38 ? 1 : 0;
  water.material.uniforms.sunDirection.value.copy(disk ? BH_DIR : MOON_DIR); water.material.uniforms.sunColor.value.set(disk ? 0xffb070 : 0x9fb3d6);
  // its size on screen: a dark dot that bends starlight, then the Moon's debris lights it up and it grows as it nears
  const U = BH.uniforms;
  const Sz = t < 38 ? lerp(0.004, 0.012, prog(t, 5, 38)) : t < 66 ? lerp(0.012, 0.055, Math.pow(prog(t, 38, 66), 1.3)) : t < 80 ? lerp(0.055, 0.12, prog(t, 66, 80)) : 0.12 + Math.pow(prog(t, 80, 87), 2.0) * 1.4;
  U.S.value = Sz; U.uT.value = t;
  U.rE.value = t < 8 ? 0 : Math.min(1, prog(t, 8, 14)) * Sz * 1.5;
  U.dB.value = t < 38 ? 0 : t < 40.5 ? smooth(prog(t, 38, 40.5)) * 0.55 : t < 70 ? lerp(0.55, 0.75, prog(t, 40.5, 70)) : t < 82 ? 0.85 : lerp(0.85, 0, prog(t, 82, 87.5)); H.bloom.strength = 0.22;
  U.white.value = t < 74 ? 0 : t < 77 ? smooth(prog(t, 74, 77)) * 0.9 : t < 79.5 ? 0.9 * (1 - smooth(prog(t, 77, 79.5))) : 0;
  U.dark.value = t > 86 ? smooth(prog(t, 86, 88.4)) : 0;
  diskLight.intensity = t < 38 ? 0 : t < 40 ? lerp(0, 0.9, prog(t, 38, 40)) : t < 58 ? lerp(0.9, 2, prog(t, 40, 58)) : t < 72 ? lerp(2, 4, prog(t, 58, 72)) : 4;
  moonLight.intensity = t < 38 ? 0.35 : 0.05; H.hemi.intensity = 0.25 + (t > 38 ? 0.25 : 0);
  H.r.toneMappingExposure = 1.15;
  // the crust tears: glowing fissures across the promenade
  CRACKS.material.opacity = smooth(prog(t, 69.5, 73)) * (t < 77 ? 1 : 0); lavaLight.intensity = 120 * CRACKS.material.opacity;
  // everything turns to ash, lifts and is gone in the glare; then only the hole, its disk and bent starlight
  const ash = prog(t, 72, 76.5);
  for (const m of ALLMATS) { m.color.copy(m.userData.c0).lerp(GREY, ash); if (m.emissive && ash > 0) m.emissiveIntensity *= 1 - ash; }
  const up = t > 74 ? 0.5 * 14 * (t - 74) ** 2 : 0; CITY.position.set(BH_DIR.x * up * 0.3, up, 0); CITY.visible = t < 78.5;
  HILLS.visible = t < 78; GLOW.visible = t < 78;
  people(t); towers(t, power); moonAndStream(t); particles(t);
  if (t < 5.6) hudShow("ttl", win(t, 0.5, 5.6, 0.6, 0.5), { transform: `translateY(${(1 - out(clamp((t - 0.5) / 0.9))) * 18}px)` });
  counters(t, d); caption(t);
});
await H.ready();
