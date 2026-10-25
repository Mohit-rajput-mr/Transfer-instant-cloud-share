// Improved Film 09: how an app names a song in a noisy café (record → a sound map → keep the brightest peaks →
// pairs become fingerprints → library lookup → matches line up in time), then Orbi: a short code finds your file.
import { THREE, stage, lights, person, pose, tree, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, textTex, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const label = (txt, col = "#fff", w = 2.4, h = 0.6, font = "800 90px D", bg = null) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, map: textTex((g, cw, ch) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } g.fillStyle = col; g.font = font; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.74); }, 640, Math.round(640 * h / w)) }));
const phoneOn = (p) => { const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); sc.position.z = 0.007; g.add(sc); g.scr = sc; p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };

reseed(909);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x3a2a24, fog: null, bloom: 0.5, exposure: 1.05 });
const LT = lights(scene, { key: 0xffd8a8, keyI: 2.0, sky: 0xffe4c8, ground: 0x4a3428, fillI: 1.1, rim: 0xa9b8ff, rimI: 0.5, at: V(6, 10, 8), area: 10 });

// ---------------------------------------------------------------- the café (origin)
const CAFE = new THREE.Group(); scene.add(CAFE);
{ const fl = tinted(new THREE.PlaneGeometry(16, 16, 16, 16).rotateX(-Math.PI / 2), 0x8a5a3a, 0.08, { roughness: 0.6 }); CAFE.add(fl);
  const wall = mesh(new THREE.PlaneGeometry(16, 6), flat(0x2f5a4a)); wall.position.set(0, 3, -4); CAFE.add(wall); const wall2 = mesh(new THREE.PlaneGeometry(16, 6), flat(0x2a4f42)); wall2.rotation.y = Math.PI / 2; wall2.position.set(-6, 3, 3); CAFE.add(wall2);
  const brick = textTex((g, w, h) => { g.fillStyle = "#8a4a32"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5a2e1e"; g.lineWidth = 3; for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 24) % 2 ? 0 : 30; x < w; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 24); g.stroke(); } } }, 256, 256); brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(4, 2);
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 })); bw.position.set(1, 4.5, -3.98); CAFE.add(bw);
  // the counter, the espresso machine, cups, a menu board, pendant lamps
  CAFE.add(P(mesh(bbox(6, 1.1, 1.2, 0.05), flat(0x5a3a26)), V(1, 0.55, -2.6))); CAFE.add(P(mesh(bbox(6.2, 0.1, 1.4, 0.03), flat(0xe8e0d0)), V(1, 1.15, -2.6)));
  const em = new THREE.Group(); em.position.set(-0.6, 1.2, -2.8); CAFE.add(em); em.add(P(mesh(bbox(1.2, 0.9, 0.7, 0.08), flat(0xc9ccd2, { metalness: 0.8, roughness: 0.25 })), V(0, 0.45, 0))); for (const x of [-0.3, 0.3]) em.add(P(mesh(limb(0.05, 0.05, 0.2, 6), flat(0x2a2a2a)), V(x, 0.2, 0.3)));
  for (let i = 0; i < 4; i++) CAFE.add(P(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.14, 10), flat(0xffffff)), V(1.2 + i * 0.4, 1.27, -2.4)));
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshBasicMaterial({ map: textTex((g, w, h) => { g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "700 44px M"; ["ESPRESSO  2.5", "LATTE     3.5", "CROISSANT 2.0"].forEach((s0, i) => g.fillText(s0, 30, 70 + i * 60)); }, 512, 260) })); menu.position.set(3, 3.2, -3.97); CAFE.add(menu);
  for (let i = 0; i < 3; i++) { const lp = new THREE.Group(); lp.position.set(-1 + i * 2, 4.6, -1.5); CAFE.add(lp); lp.add(P(mesh(limb(0.01, 0.01, 1.2, 4), flat(0x2a2a2a)), V(0, 1.2, 0))); lp.add(P(mesh(new THREE.ConeGeometry(0.3, 0.35, 10, 1, true), flat(0x2a2a2a, { side: THREE.DoubleSide })), V(0, 0, 0))); lp.add(P(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(0xffd8a0)), V(0, -0.1, 0))); const pl = new THREE.PointLight(0xffc880, 6, 6, 1.6); pl.position.y = -0.3; lp.add(pl); }
  // tables with people chatting
  for (let i = 0; i < 2; i++) { const tb = new THREE.Group(); tb.position.set(-3.5 + i * 7, 0, 1.5); CAFE.add(tb); tb.add(P(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 14), flat(0xe8e0d0)), V(0, 0.75, 0))); tb.add(P(mesh(limb(0.05, 0.05, 0.72, 6), flat(0x2a2a2a)), V(0, 0.72, 0))); }
  const pl2 = tree(1.6, "round", 0x4f9a3c); pl2.position.set(-5, 0, -3); CAFE.add(pl2); }
const STEAM = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, emissive: 0x666666 })); m.o = rnd(); scene.add(m); return m; });
const CHAT = [0, 1, 2, 3].map((i) => { const p = person({ sex: i % 2 ? "f" : "m", top: [0xd96c4e, 0x8ab6d6, 0xe9c46a, 0xb48ad6][i], bottom: [0x2b2b2b, 0x1f2d6b][i % 2], shortSleeve: true, glasses: i === 2, longHair: i === 1 }); p.position.set(i < 2 ? -3.5 + (i ? 0.9 : -0.9) : 3.5 + (i === 3 ? 0.9 : -0.9), 0, 1.5); p.rotation.y = (i % 2 ? -1 : 1) * Math.PI / 2; scene.add(p); return p; });
const GIRL = person({ sex: "f", top: 0x4fc3bd, bottom: 0x2b3a55, skin: 0xe0a982, hair: 0x7a3b22, longHair: true, shortSleeve: true, hat: 0x2a2a2a, hatBand: 0x3dff8c }); GIRL.position.set(0.5, 0, 0.8); GIRL.rotation.y = 0.2; scene.add(GIRL);
const GPH = phoneOn(GIRL); const GCV = document.createElement("canvas"); GCV.width = 432; GCV.height = 930; const GTX = new THREE.CanvasTexture(GCV); GTX.colorSpace = THREE.SRGBColorSpace; GPH.scr.material = new THREE.MeshBasicMaterial({ map: GTX, toneMapped: false });
function gscreen(t, found) { const g = GCV.getContext("2d"), w = GCV.width, h = GCV.height; g.fillStyle = found ? "#123323" : "#0e1a2e"; g.fillRect(0, 0, w, h);
  if (!found) { for (let i = 0; i < 4; i++) { const rr = 60 + ((t * 80 + i * 60) % 240); g.strokeStyle = `rgba(90,168,255,${1 - rr / 300})`; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2 - 60, rr, 0, 7); g.stroke(); } g.fillStyle = "#5aa8ff"; g.beginPath(); g.arc(w / 2, h / 2 - 60, 60, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "700 30px M"; g.fillText("Listening…", 130, h - 200); }
  else { g.fillStyle = "#e9c46a"; g.fillRect(66, 160, 300, 300); g.fillStyle = "#0b0d10"; g.font = "900 120px D"; g.fillText("♪", 175, 360); g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("Sunny Side", 100, 540); g.fillStyle = "#9cf"; g.font = "600 28px M"; g.fillText("The Bakers", 140, 590); }
  GTX.needsUpdate = true; }
const NOTES = Array.from({ length: 10 }, (_, i) => { const m = label(["♪", "♫", "☕", "…"][i % 4], ["#ffd04a", "#ffd04a", "#c8a07a", "#9ab"][i % 4], 0.45, 0.45, "900 300px D"); m.o = rnd(); scene.add(m); return m; });
const SPK = new THREE.Group(); SPK.position.set(-4.4, 3.4, -3.8); scene.add(SPK); SPK.add(mesh(bbox(0.7, 1.0, 0.5, 0.06), flat(0x1a1a1a))); for (const y of [-0.2, 0.25]) SPK.add(P(mesh(new THREE.CylinderGeometry(0.2 + (y < 0 ? 0.05 : -0.05), 0.2, 0.05, 14), flat(0x444444)), V(0, y, 0.27))); SPK.children.slice(1).forEach((c) => (c.rotation.x = Math.PI / 2));

// ---------------------------------------------------------------- the sound map (x = -300): a glowing landscape, peaks become stars, pairs, the library
const MP = V(-300, 0, 0), MAP = new THREE.Group(); MAP.position.copy(MP); scene.add(MAP);
{ MAP.add(new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), new THREE.MeshBasicMaterial({ color: 0x050812, side: THREE.BackSide }))); const k = new THREE.PointLight(0xcfe0ff, 80, 80, 1.2); k.position.set(0, 14, 14); MAP.add(k); }
const NX = 64, NY = 32, MW = 20, MH = 10; const field = (x, y) => { // music partials + noise
  let v = 0; for (const [f, a, ph] of [[0.18, 1.0, 0], [0.32, 0.8, 1.5], [0.47, 0.6, 3], [0.71, 0.5, 2]]) v += a * Math.exp(-Math.pow((y / NY - f) * 14, 2)) * (0.6 + 0.4 * Math.sin(x * 0.45 + ph) * Math.sin(x * 0.13 + ph * 2)); return v + 0.12 * Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1); };
const SGEO = new THREE.PlaneGeometry(MW, MH, NX - 1, NY - 1); { const p = SGEO.attributes.position, cols = []; for (let i = 0; i < p.count; i++) { const ix = i % NX, iy = Math.floor(i / NX); const v = field(ix, NY - 1 - iy); p.setZ(i, v * 1.6); const c = new THREE.Color().setHSL(0.66 - Math.min(0.66, v * 0.55), 1, 0.12 + Math.min(0.5, v * 0.42)); cols.push(c.r, c.g, c.b); } SGEO.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); SGEO.computeVertexNormals(); }
const SPEC = new THREE.Mesh(SGEO, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); SPEC.rotation.x = -Math.PI / 2; SPEC.position.set(0, 0, 0); MAP.add(SPEC);
const AX = [label("time →", "#9ab", 3, 0.6, "800 110px M"), label("pitch ↑", "#9ab", 3, 0.6, "800 110px M")]; AX[0].position.set(0, 0.2, 6.2); AX[0].rotation.x = -Math.PI / 2; AX[1].position.set(-11.5, 0.2, 0); AX[1].rotation.set(-Math.PI / 2, 0, Math.PI / 2); AX.forEach((m) => MAP.add(m));
// peaks: local maxima of the field
const PK = []; for (let x = 2; x < NX - 2; x += 1) for (let y = 2; y < NY - 2; y++) { const v = field(x, y); let max = true; for (let dx = -2; dx <= 2 && max; dx++) for (let dy = -2; dy <= 2; dy++) if ((dx || dy) && field(x + dx, y + dy) > v) { max = false; break; } if (max && v > 0.55) PK.push({ x, y, v }); }
const STARS = PK.map((p) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glow(0xfff4c0)); m.base = V(-MW / 2 + (p.x / (NX - 1)) * MW, p.v * 1.6 + 0.2, MH / 2 - (p.y / (NY - 1)) * MH); MAP.add(m); return m; });
const PAIRS = []; STARS.forEach((a, i) => { const b = STARS.slice(i + 1).find((s0) => s0.base.x > a.base.x + 0.4 && s0.base.x < a.base.x + 3); if (b && PAIRS.length < 26) { const geo = new THREE.BufferGeometry().setFromPoints([a.base, b.base]); const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x3dff8c, transparent: true, toneMapped: false })); MAP.add(ln); PAIRS.push({ ln, a, b }); } });
const FPS = PAIRS.slice(0, 10).map((p, i) => { const m = new THREE.Group(); m.add(mesh(bbox(0.9, 0.5, 0.1, 0.04), flat(0x3dff8c, { emissive: 0x0a5a2a, emissiveIntensity: 0.6 }))); m.add(P(label(["a3f9", "71c2", "e05b", "9d14", "42aa", "c7e1", "18fd", "b260", "5e9c", "f03d"][i], "#0b0d10", 0.8, 0.3, "900 110px M"), V(0, 0, 0.06))); m.i = i; m.from = p.a.base.clone().add(p.b.base).multiplyScalar(0.5); MAP.add(m); return m; });
// the library of songs: tall shelves of records
const LIB = new THREE.Group(); LIB.position.set(0, 0, -16); MAP.add(LIB); const RECS = [];
for (let sx = 0; sx < 7; sx++) { const sh = new THREE.Group(); sh.position.set(-9 + sx * 3, 0, 0); LIB.add(sh); sh.add(P(mesh(bbox(2.6, 9, 0.8, 0.05), flat(0x3a2a20)), V(0, 4.5, -0.2))); for (let r0 = 0; r0 < 7; r0++) for (let c = 0; c < 8; c++) { const rec = mesh(bbox(0.24, 1.0, 0.7, 0.03), flat(new THREE.Color().setHSL(rnd(), 0.6, 0.5).getHex())); rec.position.set(-1.05 + c * 0.3, 0.75 + r0 * 1.25, 0.1); sh.add(rec); RECS.push(rec); } }
const HIT = RECS[3 * 56 + 3 * 8 + 4]; const HITG = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.9), glow(0x3dff8c, { transparent: true, opacity: 0 })); HIT.add(HITG);
// the match: a scatter plot where hits line up on a diagonal
const PLOT = new THREE.Group(); PLOT.position.set(0, 6, -6); MAP.add(PLOT); PLOT.add(P(new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color: 0x0b1424, transparent: true, opacity: 0.9 })), V(0, 0, -0.05)));
const DOTS = Array.from({ length: 90 }, (_, i) => { const on = i < 46; const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), glow(on ? 0x3dff8c : 0x5a6a8a)); const x = on ? -4 + (i / 46) * 8 : -4 + rnd() * 8; const y = on ? x * 0.9 + (rnd() - 0.5) * 0.25 : -4 + rnd() * 8; m.position.set(x, y, 0); m.on = on; m.k = rnd(); PLOT.add(m); return m; });
PLOT.add(P(label("time in your clip →", "#9ab", 4, 0.4, "700 80px M"), V(0, -4.3, 0.05))); const PL2 = label("time in the song →", "#9ab", 5, 0.5, "700 80px M"); PL2.rotation.z = Math.PI / 2; PL2.position.set(-4.9, 0, 0); PLOT.add(PL2);
const SONG = new THREE.Group(); SONG.position.set(0, 6, -5.5); MAP.add(SONG); SONG.add(mesh(bbox(5, 6, 0.4, 0.3), flat(0xe9c46a))); SONG.add(P(label("♪", "#0b0d10", 3, 3, "900 300px D"), V(0, 0.9, 0.21))); SONG.add(P(label("Sunny Side", "#0b0d10", 4.4, 0.8, "900 110px D"), V(0, -1.6, 0.21)));
// Orbi (back in the café): a code card, a locked file over the table
const CODE = label("k7f2", "#3dff8c", 2.2, 0.8, "900 150px M", "#0b1a12"); scene.add(CODE); const OFILE = new THREE.Group(); scene.add(OFILE); OFILE.add(mesh(bbox(0.5, 0.62, 0.05, 0.05), flat(0xe9c46a))); const OLOCK = mesh(bbox(0.26, 0.2, 0.08, 0.03), flat(0x3dff8c, { emissive: 0x0a5a2a, emissiveIntensity: 0.6 })); OLOCK.position.z = 0.05; OFILE.add(OLOCK);

// ---------------------------------------------------------------- world
function world(t) {
  pose(GIRL, { phone: 1, look: 0.1 }); GIRL.rig.rArm.rotation.x -= 0.4; gscreen(t, t > wt("match", "boom"));
  CHAT.forEach((p, i) => { pose(p, { walk: t * 0.5 + i, speed: 0.05, look: Math.sin(t * 2 + i) * 0.3 }); p.rig.hips.position.y = 0.55; p.rig.lHip.rotation.x = p.rig.rHip.rotation.x = -1.45; p.rig.lKnee.rotation.x = p.rig.rKnee.rotation.x = 1.45; p.rig.rArm.rotation.x = -0.6 + Math.sin(t * 3 + i) * 0.3; });
  STEAM.forEach((m) => { const k = (t * 0.5 + m.o) % 1; m.position.set(-0.6 + Math.sin(k * 8 + m.o * 9) * 0.15, 2.3 + k * 1.6, -2.6); m.scale.setScalar(0.6 + k * 2); m.material.opacity = (1 - k) * 0.5; });
  NOTES.forEach((n, i) => { const k = (t * 0.35 + n.o) % 1; const src = i % 4 < 2 ? V(-4.4, 3.4, -3.4) : i % 4 === 2 ? V(-0.6, 2.4, -2.4) : CHAT[i % 4].position.clone().add(V(0, 1.6, 0)); const to = GPH.getWorldPosition(V(0, 0, 0)); n.position.copy(src.lerp(to, k)); n.position.y += Math.sin(k * Math.PI) * 0.8; n.material.opacity = Math.sin(k * Math.PI); n.lookAt(cam.position); n.visible = t < A("map") || (t > A("orbi") - 0.2 && t < A("orbi") + 0.1); });
  // map: the landscape rises; peaks light; pairs link; fingerprints fly to the library; dots line up
  const rise = ease(clamp((t - A("map") - 0.2) / 1.2)); SPEC.scale.set(1, 1, Math.max(0.01, rise)); const dim = clamp((t - wt("peaks", "brightest") + 0.2) / 0.8);
  SPEC.material.color.setScalar(lerp(1, 0.25, dim)); AX.forEach((m) => (m.visible = t >= A("map") && t < A("peaks")));
  STARS.forEach((s0, i) => { const k = clamp((t - wt("peaks", "brightest") - i * 0.01) / 0.4); s0.visible = k > 0 && t < A("match"); s0.position.copy(s0.base); s0.position.y = lerp(s0.base.y * rise, 3.2, ease(clamp((t - wt("peaks", "stars") + 0.1) / 0.8))); s0.scale.setScalar(back(k) * (1 + 0.2 * Math.sin(t * 6 + i))); s0.rotation.y = t * 2; });
  PAIRS.forEach((p, i) => { const k = clamp((t - A("hash") - 0.2 - i * 0.04) / 0.4); p.ln.visible = k > 0 && t < A("match"); p.ln.material.opacity = k; const pa = p.a.position, pb = p.b.position; const arr = p.ln.geometry.attributes.position; arr.setXYZ(0, pa.x, pa.y, pa.z); arr.setXYZ(1, pb.x, pb.y, pb.z); arr.needsUpdate = true; });
  FPS.forEach((f) => { const k = clamp((t - wt("hash", "looks") - f.i * 0.12) / 1.4); f.visible = k > 0 && k < 1 && t < A("match"); const a = f.from.clone().setY(3.2), b = HIT.getWorldPosition(V(0, 0, 0)).sub(MP); f.position.copy(a.lerp(b, ease(k))); f.position.y += Math.sin(k * Math.PI) * 3; f.rotation.y = k * 4; });
  LIB.visible = t >= wt("hash", "library") - 0.6 && t < A("match") + 0.5; HITG.material.opacity = win(t, wt("hash", "library"), A("match") + 0.3, 0.3, 0.2) * 0.6;
  PLOT.visible = t >= A("match") - 0.1 && t < wt("match", "boom") + 0.6; DOTS.forEach((d) => { const k = clamp((t - A("match") - d.k * 1.4) / 0.25); d.scale.setScalar(back(k) || 0.001); d.material.color.set(d.on && t > wt("match", "line") ? 0x3dff8c : d.on ? 0x9fb0d0 : 0x3a4a6a); });
  const sg = clamp((t - wt("match", "boom")) / 0.4); SONG.visible = sg > 0 && t < A("orbi"); SONG.scale.setScalar(back(sg) || 0.001); SONG.rotation.y = Math.sin(t * 2) * 0.2;
  // Orbi: a short code over her head finds the locked file on the table
  const ck = clamp((t - wt("orbi", "short") + 0.1) / 0.4), fk = clamp((t - wt("orbi", "unlocks") + 0.1) / 0.5); CODE.visible = ck > 0 && t < A("end"); CODE.position.set(0.5, 2.6, 0.8); CODE.scale.setScalar(back(ck) || 0.001); CODE.lookAt(cam.position);
  OFILE.visible = t >= wt("orbi", "finds") - 0.1 && t < A("end"); OFILE.position.set(-3.5, 1.3 + Math.sin(t * 2) * 0.05, 1.5); OFILE.rotation.y = t; OLOCK.position.y = fk * 0.25; OLOCK.material.color.set(fk > 0.5 ? 0x9fffc0 : 0x3dff8c);
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const mp = (x, y, z) => V(MP.x + x, MP.y + y, MP.z + z);
shot(0, 2.4, V(3, 3.2, 9), V(0, 1.4, -1), 48, V(2, 2.6, 7), V(0.3, 1.4, -1), 46);
shot(wt("hook", "seconds") - 0.1, 2.0, V(-4.4, 2.6, 2), V(-4.4, 3.2, -3.8), 44, V(-3.6, 2.8, 1), V(-4.2, 3.4, -3.8), 42);
SH.push({ at: A("listen"), dur: 1.8, track: GPH, d0: 0.9, d1: 0.42, side: 0.2, lift: 0.25, fov: 38 });
shot(wt("listen", "coffee") - 0.1, 1.4, V(0.6, 2.2, -0.6), V(-0.6, 2.0, -2.8), 44, V(0.3, 2.3, -1.0), V(-0.6, 2.1, -2.8), 42);
shot(wt("listen", "chatter") - 0.1, 1.6, V(-1, 1.6, 4.5), V(-3.5, 1.2, 1.5), 44, V(-1.4, 1.5, 4), V(-3.5, 1.2, 1.5), 42);
shot(A("map"), 2.6, mp(0, 3, 18), mp(0, 1, 0), 50, mp(0, 9, 16), mp(0, 0.5, 0), 50);
shot(wt("map", "loudness") - 0.1, 2.0, mp(-6, 3, 7), mp(-2, 1, 0), 44, mp(-3, 2.6, 6), mp(1, 1, 0), 44);
shot(A("peaks"), 2.4, mp(0, 6, 16), mp(0, 1.6, 0), 50, mp(0, 7, 14), mp(0, 2.6, 0), 50);
shot(wt("peaks", "stars") - 0.1, 2.2, mp(-2, 2.4, 10), mp(0, 3.4, 0), 50, mp(2, 2.2, 10), mp(0, 3.4, 0), 50);
shot(A("hash"), 2.0, mp(3, 6, 10), mp(0, 3.2, 0), 46, mp(1, 6.5, 9), mp(0, 3.2, 0), 46);
shot(wt("hash", "looks") - 0.2, 2.6, mp(0, 9, 14), mp(0, 5, -10), 52, mp(0, 8, 2), mp(0, 5, -16), 50);
shot(A("match"), 2.2, mp(0, 6, 8), mp(0, 6, -6), 48, mp(0, 6, 6), mp(0, 6, -6), 46);
shot(wt("match", "boom") - 0.1, 1.8, mp(0, 6, 4), mp(0, 6, -5.5), 48, mp(0.5, 6.2, 3.4), mp(0, 6, -5.5), 46);
SH.push({ at: wt("match", "song") - 0.3, dur: 1.2, track: GPH, d0: 0.7, d1: 0.4, side: 0.15, lift: 0.2, fov: 38 });
shot(A("orbi"), 2.2, V(-1, 2.8, 8), V(-1.5, 1.8, 1), 48, V(-0.5, 2.6, 7), V(-1.5, 1.8, 1), 46);
shot(wt("orbi", "finds") - 0.1, 2.2, V(-1.6, 2.0, 4.5), V(-3.5, 1.3, 1.5), 40, V(-2, 1.9, 4), V(-3.5, 1.3, 1.5), 38);
const camAt = camRig(cam); const _p = V(0, 0, 0), _n = V(0, 0, 0), _q = new THREE.Quaternion();
function camera(t) { let s = SH[0]; for (const x of SH) if (t >= x.at) s = x; cam.up.set(0, 1, 0);
  if (s.track) { const k = ease(clamp((t - s.at) / s.dur)); s.track.updateWorldMatrix(true, false); s.track.getWorldPosition(_p); s.track.getWorldQuaternion(_q); _n.set(s.side ?? 0, s.lift ?? 0.25, 1).normalize().applyQuaternion(_q);
    cam.position.copy(_p).addScaledVector(_n, lerp(s.d0, s.d1, k)); cam.up.set(0, 1, 0).applyQuaternion(_q).lerp(V(0, 1, 0), 0.25).normalize(); cam.lookAt(_p); if (cam.fov !== s.fov) { cam.fov = s.fov; cam.updateProjectionMatrix(); } return; }
  camAt(SH.filter((x) => !x.track), t); }
// ---------------------------------------------------------------- overlays
const tag = (id, html, t, a0, b0, y = 200) => { if (t < a0 || t > b0) return; const el = $(id); el.innerHTML = html; S(el, { opacity: win(t, a0, b0, 0.25, 0.25), left: "540px", top: `${y}px`, transform: `translate(-50%, ${(1 - out(clamp((t - a0) / 0.3))) * 24}px)` }); };
const big = (txt, t, a0, b0, col = "#fff", top = 300, size = 120, rot = -3) => { if (t < a0 || t > b0) return; const el = $("big"); el.innerHTML = txt; S(el, { opacity: clamp((t - a0) / 0.12) * clamp((b0 - t) / 0.2), transform: `scale(${lerp(1.5, 1, back(clamp((t - a0) / 0.25)))}) rotate(${rot}deg)`, top: `${top}px`, fontSize: `${size}px`, color: col }); };
function overlays(t) {
  for (const id of ["tA", "tB", "l0", "l1", "l2", "l3", "c0", "c1", "big", "timer", "x", "flash"]) S($(id), { opacity: 0 });
  tag("tA", `music + coffee + <i>chatter</i>`, t, wt("listen", "music"), A("map") - 0.05);
  tag("tA", `time → · pitch ↑ · <b>loudness glows</b>`, t, A("map") + 0.3, A("peaks") - 0.05);
  tag("tA", `keep only <b>the brightest peaks</b>`, t, wt("peaks", "brightest"), A("hash") - 0.05);
  tag("tA", `pairs of stars → <b>fingerprints</b>`, t, A("hash") + 0.2, wt("hash", "looks") - 0.05);
  tag("tA", `look up · <b>a giant library</b>`, t, wt("hash", "looks"), A("match") - 0.05);
  tag("tA", `matches <b>line up in time</b>`, t, wt("match", "line") - 0.1, wt("match", "boom") - 0.05);
  big("BOOM!", t, wt("match", "boom"), wt("match", "song") + 0.2, "#3dff8c", 300, 150);
  tag("tA", `a short code · <b>finds your file</b>`, t, wt("orbi", "short"), wt("orbi", "unlocks") - 0.05);
  tag("tA", `only the right code · <b>unlocks it</b>`, t, wt("orbi", "unlocks"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camera(t); world(t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
