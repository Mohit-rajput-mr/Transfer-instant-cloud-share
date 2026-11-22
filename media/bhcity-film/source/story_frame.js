
// =====================================================================================================================
// PER FRAME (the camera never moves; only the ground shakes it)
// =====================================================================================================================
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const fmtKm = (d) => `${fmt(d)} km`;
const fmtTide = (m) => (m >= 1000 ? `+${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `+${m >= 10 ? fmt(m) : m.toFixed(1)} m`);
const ALLMATS = []; [CITY, ...TOWERS.map((q) => q.g)].forEach((g) => g.traverse((m) => { if (m.isMesh && m.material.isMeshStandardMaterial && !ALLMATS.includes(m.material)) { ALLMATS.push(m.material); m.material.userData.c0 = m.material.color.clone(); } }));
const GREY = new THREE.Color(0.3, 0.29, 0.28);
const PBH = CAM.clone().add(BH_DIR.clone().multiplyScalar(420));
const AX_U = new THREE.Vector3().crossVectors(BH_DIR, V(0, 1, 0)).normalize(), AX_V = new THREE.Vector3().crossVectors(AX_U, BH_DIR).normalize();
/** a thing at p0 let go at t0 falls into the hole over dur seconds: accelerating, spiralling, gone at the centre */
function infall(p0, t0, dur, t, seed, out) {
  const s = clamp((t - t0) / dur), e = Math.pow(s, 2.3);
  const a = seed * 6.3 + e * 7.5, rad = (6 + seed * 30) * Math.sin(Math.PI * Math.min(1, e * 1.1)) * (1 - e);
  out.copy(p0).lerp(PBH, e).addScaledVector(AX_U, Math.cos(a) * rad).addScaledVector(AX_V, Math.sin(a) * rad);
  return e;
}
const _v = new THREE.Vector3();
const wrap = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));

function quakeAmp(t) { return t < 46 ? 0 : t < 49 ? lerp(0, 0.035, prog(t, 46, 49)) : t < 58 ? 0.05 + 0.04 * Math.max(0, Math.sin(t * 1.7)) : t < 70 ? 0.02 : t < 78 ? lerp(0.05, 0.12, prog(t, 70, 76)) : 0; }
const ampAt = (t) => t < 22 ? 0.6 : t < 34 ? lerp(0.6, 1.4, prog(t, 22, 34)) : t < 46 ? lerp(1.4, 2.4, prog(t, 34, 46)) : t < 58 ? lerp(2.4, 5, prog(t, 46, 58)) : t < 70 ? lerp(5, 7, prog(t, 58, 70)) : 7;
function waterLevel(t) {
  const tide = (a, b, y0, y1, amp, w = 0.8) => lerp(y0, y1, ease(prog(t, a, b))) + amp * Math.sin(t * w);
  if (t < 22) return -2.2 + 0.08 * Math.sin(t * 0.7);
  if (t < 34) return tide(22, 34, -2.2, -0.9, 0.55 * prog(t, 22, 34));
  if (t < 46) return tide(34, 46, -0.9, -0.1, 0.55);
  if (t < 58) return tide(46, 58, -0.1, 0.55, 0.3, 1.3);
  if (t < 70) return tide(58, 70, 0.55, 1.05, 0.25, 1.1);
  return lerp(1.05, 3.5, ease(prog(t, 70, 86)));
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
  const ash = prog(t, 70, 80) * 0.5;
  for (const q of PEOPLE) {
    const { p, acts } = q; let mode = "walk", x, z = q.z, y = 0, h;
    const walkX = (s) => wrap(q.x0 + q.dir * q.spd * (s + q.off), -27, 27);
    if (q.still && t < q.react) { mode = "idle"; x = q.x0; h = Math.PI + (q.dir * 0.4); }
    else if (t < q.react) { x = walkX(t); h = q.dir * Math.PI / 2; }
    else if (t < q.react + 3.2) { mode = "idle"; x = q.still ? q.x0 : walkX(q.react); h = lerp(q.still ? Math.PI + q.dir * 0.4 : q.dir * Math.PI / 2, Math.PI - 0.25, out(prog(t, q.react, q.react + 1))); }
    else { const xr = q.still ? q.x0 : walkX(q.react); const rt = Math.min(t, q.lift) - q.react - 3.2; mode = "run";
      x = wrap(xr + q.dir * 3.8 * rt, -27, 27); z = lerp(q.z, Math.min(q.z + 3, 13), out(clamp(rt / 5))); h = Math.atan2(q.dir * 0.85, 0.5); }
    let gone = false;
    if (t > q.lift) { const s = t - q.lift; mode = "idle"; y = 0.32 * s * Math.min(s, 3); _v.set(x, y, z); const e = infall(_v.clone(), q.lift + 3, 12 + q.off * 2, t, q.off / 4, _v); x = _v.x; y = _v.y; z = _v.z; gone = e > 0.96; }
    p.position.set(x, y, z); p.rotation.set(0, h + q.f0, 0);
    if (t > q.lift) { const s = t - q.lift; p.rotation.x += q.spin.x * s; p.rotation.z += q.spin.z * s; p.rotation.y += q.spin.y * s; }
    acts.walk.weight = mode === "walk" ? 1 : 0; acts.run.weight = mode === "run" ? 1 : 0; acts.idle.weight = mode === "idle" ? 1 : 0;
    acts.run.timeScale = 1.15; q.mx.setTime(t + q.off);
    for (const m of q.mats) m.color.copy(m.userData.c1 || (m.userData.c1 = m.color.clone())).lerp(GREY, ash);
    p.visible = !gone;
  }
}

function towers(t, power) {
  for (const T of TOWERS) {
    const qa = quakeAmp(t);
    T.g.rotation.z = Math.sin(t * 2.3 + T.ph) * qa * 0.06; T.g.rotation.x = Math.sin(t * 1.9 + T.ph * 2) * qa * 0.03;
    T.mat.emissiveIntensity = 1.25 * power * (0.85 + 0.15 * Math.sin(t * 3 + T.ph * 9) * (t > 46 ? 1 : 0));
    T.red.visible = power > 0.5 && Math.sin(t * 3.4 + T.ph) > 0;
    T.segs.forEach((s, i) => {
      const tIn = 64 + T.ph * 2.2 + (T.segs.length - i) * 0.5;
      if (T.fall && t > T.tFall + i * 0.3 && t < tIn) { const f = t - T.tFall - i * 0.3; s.m.position.set(s.dx * Math.min(f, 3) * 0.3, Math.max(-30, s.y0 - 0.5 * 9.8 * f * f * (1 - i * 0.08)), 0); s.m.rotation.set(s.rx * Math.min(f, 4), 0, s.rz * Math.min(f, 4)); s.m.visible = s.m.position.y > -29; }
      else { s.m.position.set(0, s.y0, 0); s.m.rotation.set(0, 0, 0); s.m.visible = !(T.fall && t > T.tFall + i * 0.3 && t < tIn); }
      if (t > tIn) { const w0 = T.g.localToWorld(V(0, s.y0, 0)); const e = infall(w0, tIn, 14, t, T.ph / 6, _v); s.m.visible = e < 0.97; s.m.position.copy(T.g.worldToLocal(_v.clone())); s.m.rotation.set(s.rx * (t - tIn), s.rz * (t - tIn) * 0.5, s.rz * (t - tIn)); }
    });
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
    const st = Math.pow(k, 2); MOON.scale.set(1 + st * 7, 1 - st * 0.6, 1); MOON.material.color.setRGB(1.6 + st * 1.2, 1.5 + st * 0.5, 1.4 + st * 0.1);
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
    const float = t > 60 ? (t - 60) * (0.6 + rand(i + 3)) : 0; const zz = 1 + rand(i + 5) * 3; const crest = Math.max(0, waveY(x, zz, ampAt(t), t)); const y = waterLevel(t) + crest + Math.sin(ph * Math.PI) * crest * 1.5 + float * float * 0.25;
    SPRAY.pos[i * 3] = x; SPRAY.pos[i * 3 + 1] = y; SPRAY.pos[i * 3 + 2] = 1 + rand(i + 5) * (t > 60 ? 14 : 3) - ph * 1.5; }
  SPRAY.P.geometry.attributes.position.needsUpdate = true;
  for (const D of DEBRIS) { const s = t - D.t0; const m = D.m; m.visible = t > 50 && t < 77;
    if (s < 0) { m.position.copy(D.p0); m.rotation.set(0, D.v, 0); } else { const e = infall(D.p0, D.t0, 9 + D.v * 3, t, D.v, m.position); m.rotation.set(D.spin.x * s, D.spin.y * s, D.spin.z * s); m.visible = e < 0.97; } }
  // the promenade itself comes loose: lamps, benches, trees
  PROPS.forEach((g, i) => { if (!g.userData.p0) g.userData.p0 = g.position.clone(); const t0 = 71 + rand(i + 0.4) * 9; if (t < t0) { g.position.copy(g.userData.p0); g.rotation.set(0, 0, 0); g.visible = true; return; }
    const e = infall(g.userData.p0, t0, 8, t, rand(i + 0.9), g.position); g.rotation.set((t - t0) * 0.9, (t - t0) * 0.4, (t - t0) * 0.7); g.visible = e < 0.97; });
  // a river of everything — water, dust, glass, light — spiralling in, heating as it goes
  const ik = t < 60 ? 0 : smooth(prog(t, 60, 66)); INFALL.material.opacity = ik;
  if (ik > 0) for (let i = 0; i < INFALL_N; i++) { const t0 = 60 + rand(i * 1.3) * 26, life = 5 + rand(i * 2.1) * 6;
    const p0 = _v.set(-70 + rand(i * 3.7) * 140, rand(i * 4.1) * 40 - 2, -60 - rand(i * 5.3) * 800); const st = p0.clone();
    if (t < t0) { infallP.set([0, -999, 0], i * 3); continue; }
    const e = infall(st, t0, life, t, rand(i * 6.1), _v); infallP.set([_v.x, _v.y, _v.z], i * 3);
    const h = Math.pow(e, 2); infallC.set([0.35 + h * 2.2, 0.33 + h * 1.1, 0.32 + h * 0.25].map((c) => c * (e > 0.985 ? 0 : 1)), i * 3); }
  INFALL.geometry.attributes.position.needsUpdate = true; INFALL.geometry.attributes.color.needsUpdate = true;
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
  water.material.uniforms.time.value = t * 0.5; water.material.uniforms.distortionScale.value = 2.2; water.material.uniforms.uWT.value = t; water.material.uniforms.uAmp.value = ampAt(t); water.material.uniforms.uFoam.value = clamp((ampAt(t) - 1.2) / 2); water.visible = true;
  const disk = t > 38 ? 1 : 0;
  water.material.uniforms.sunDirection.value.copy(disk ? BH_DIR : MOON_DIR); water.material.uniforms.sunColor.value.set(disk ? 0xffb070 : 0x9fb3d6);
  // its size on screen: a dark dot that bends starlight, then the Moon's debris lights it up and it grows as it nears
  const U = BH.uniforms;
  // from the same place in the sky it only ever grows: from nothing to past the edges of the frame
  const SK = [[1.5, 0.0004], [10, 0.0028], [22, 0.0055], [34, 0.0095], [46, 0.017], [58, 0.03], [66, 0.046], [74, 0.075], [80, 0.12], [85, 0.24], [88.5, 0.65], [93, 3]];
  let Sz = 0; for (let i = 1; i < SK.length; i++) if (t <= SK[i][0]) { const [a0, s0] = SK[i - 1], [a1, s1] = SK[i]; Sz = t < a0 ? 0 : Math.exp(lerp(Math.log(s0), Math.log(s1), (t - a0) / (a1 - a0))); break; }
  if (t > 93) Sz = 3;
  U.S.value = Sz; U.uT.value = t;
  U.rE.value = Sz * 1.6;
  U.dB.value = smooth(prog(t, 1.5, 6)) * (t < 38 ? 0.42 : lerp(0.42, 0.8, smooth(prog(t, 38, 42))));
  U.white.value = 0;
  U.dark.value = 0;
  diskLight.intensity = t < 38 ? 0 : t < 40 ? lerp(0, 0.9, prog(t, 38, 40)) : t < 58 ? lerp(0.9, 2, prog(t, 40, 58)) : t < 72 ? lerp(2, 4, prog(t, 58, 72)) : 4;
  moonLight.intensity = t < 38 ? 0.35 : 0.05; H.hemi.intensity = 0.25 + (t > 38 ? 0.25 : 0);
  H.r.toneMappingExposure = 1.15;
  // the crust tears: glowing fissures across the promenade
  CRACKS.material.opacity = smooth(prog(t, 69.5, 73)); lavaLight.intensity = 120 * CRACKS.material.opacity;
  // everything turns to ash, lifts and is gone in the glare; then only the hole, its disk and bent starlight
  const ash = prog(t, 70, 82) * 0.55;
  for (const m of ALLMATS) { m.color.copy(m.userData.c0).lerp(GREY, ash); if (m.emissive && ash > 0) m.emissiveIntensity *= 1 - ash; }

  people(t); towers(t, power); moonAndStream(t); particles(t);
  if (t < 5.6) hudShow("ttl", win(t, 0.5, 5.6, 0.6, 0.5), { transform: `translateY(${(1 - out(clamp((t - 0.5) / 0.9))) * 18}px)` });
  counters(t, d); caption(t);
});
await H.ready();
