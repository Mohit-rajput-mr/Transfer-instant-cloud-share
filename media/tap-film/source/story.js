// "Your bank card has no battery" — contactless: the reader's flipping magnetic field (13.56 MHz) pushes current round a
// wire loop in the card (induction, like a toothbrush charger), the chip wakes, answers by flickering its load (no
// transmitter), mixes a secret key that never leaves it with amount + counter + random number into a one-time code, the
// bank checks it, a recorded tap is useless. Then Orbi: locked on your phone with a code that never leaves it, near you, 12 tries, burn.
import { THREE, K } from "./kit/engine.js";
const { V, clamp, ease, out, back, lerp, lerpV, rnd, canvasTex, sh, flat, lowGround, pick, edge, green, makePhone,
  person, posePerson, people, screen, IM, addWorld, world, look, lookV, orbit, project, at, end, fr, prog, tag, tags, big, counter, redX, timer, flash, frame, ready } = K;
const glow = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, toneMapped: false });
const label = (text, w = 1.6, h = 0.5, bg = "#f6f2ea", fg = "#14161b") => {
  const tx = canvasTex(512, Math.round((512 * h) / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.font = `800 ${Math.round(ch * 0.5)}px M`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, cw / 2, ch / 2 + 2); });
  return sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), [0, 0, 0, 0, 1, 1].map((k) => (k ? new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5 }) : flat(0xd9d2c3)))));
};
const cardTex = canvasTex(512, 323, (g) => { const gr = g.createLinearGradient(0, 0, 512, 323); gr.addColorStop(0, "#2a3f9a"); gr.addColorStop(1, "#6a3fb8"); g.fillStyle = gr; g.fillRect(0, 0, 512, 323);
  g.fillStyle = "#d9b45a"; g.fillRect(52, 110, 74, 58); g.strokeStyle = "#a8873a"; g.lineWidth = 3; g.strokeRect(60, 118, 58, 42);
  g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 6; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(160, 139, 14 + i * 11, -0.7, 0.7); g.stroke(); }
  g.fillStyle = "#fff"; g.font = "600 34px M"; g.fillText("•••• •••• •••• 4271", 52, 240); g.font = "800 30px D"; g.fillText("ORBI BANK", 52, 64); });
const cardMesh = (s = 1) => sh(new THREE.Mesh(new THREE.BoxGeometry(0.0856 * s, 0.054 * s, 0.002 * s), [0, 0, 0, 0, 1, 0].map((k) => (k ? new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.35 }) : flat(0x3a3f9a)))));

// ---------- world 1: the café checkout ----------
const shop = addWorld("shop", { bg: 0x2a1d16, fog: [9, 22], hemi: 0.85, sun: 1.6, sky: 0xffe2c0 });
shop.add(lowGround(24, 24, 24, (x, y, z) => pick([0x9a6b44, 0x8a5e3b, 0xa47449], x * 2, z * 0.5), () => 0));
{ const wall = sh(new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.3), flat(0xa6533c))); wall.position.set(0, 2.5, -2.6); shop.add(wall);
  for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.02), flat(0x8c4432)); b.position.set(-6 + (i % 13) * 1, 0.4 + Math.floor(i / 13) * 2.2 + (i % 2) * 0.3, -2.44); shop.add(b); }
  const cnt = sh(new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.05, 0.9), flat(0x3b2f2a))); cnt.position.set(0, 0.52, -0.6); shop.add(cnt);
  const top = sh(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 1.0), flat(0xd8c7a8))); top.position.set(0, 1.07, -0.6); shop.add(top);
  for (const x of [-1.4, 0, 1.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.4, 4), flat(0x222222)); c.position.set(x, 3.3, -0.6); const sh2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 10, 1, true), flat(0x2a6b5a, { side: THREE.DoubleSide })); sh2.position.set(x, 2.5, -0.6); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glow(0xffe0a0)); bulb.position.set(x, 2.38, -0.6); shop.add(c, sh2, bulb); const L = new THREE.PointLight(0xffd59a, 4, 5, 1.6); L.position.set(x, 2.3, -0.6); shop.add(L); }
  const mach = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.45), flat(0xb8bec8, { metalness: 0.5 }))); mach.position.set(-1.4, 1.4, -0.75); shop.add(mach);
  for (let i = 0; i < 3; i++) { const cup = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.14, 10), flat(0xf6f2ea))); cup.position.set(1.2 + i * 0.22, 1.17, -0.45); shop.add(cup); } }
const term = new THREE.Group(); { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.24), flat(0x1c1f25))); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.09), glow(0x3dff8c, 0.9)); s.rotation.x = -Math.PI / 2 + 0.3; s.position.set(0, 0.03, 0.03); term.add(b, s); term.userData.scr = s; }
term.position.set(0.35, 1.13, -0.3); term.rotation.y = 0.2; shop.add(term);
const tapRing = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.075, 32), glow(0x3dff8c, 0.8)); tapRing.rotation.x = -Math.PI / 2; tapRing.position.set(0.35, 1.2, -0.3); shop.add(tapRing);
const ME = person(0.45, 0.55, Math.PI, 0x4fc3bd, { sex: "f", parent: shop, phone: false });
const BAR = person(-0.2, -1.5, 0, 0xf08a5d, { sex: "m", parent: shop, phone: false });
const THIEF = person(1.5, 1.4, Math.PI + 0.5, 0x3a3f4a, { sex: "m", parent: shop, phone: false });
const hood = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), flat(0x1c2029))); hood.scale.set(0.15, 0.16, 0.16); shop.add(hood);
const sniffer = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), flat(0x101215))); shop.add(sniffer);
const sniffLed = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), glow(0xff3b3b)); shop.add(sniffLed);
const myCard = cardMesh(1.15); shop.add(myCard);

// ---------- world 2: the X-ray (the card's insides, the reader's field) ----------
const xr = addWorld("xray", { bg: 0x050b18, fog: [14, 34], hemi: 0.7, sun: 1.0, sky: 0x8fb8ff });
{ const g = new THREE.GridHelper(40, 40, 0x1f3a66, 0x14264a); g.position.y = 0; xr.add(g); }
const CW = 4.28, CH = 2.7;
const card = new THREE.Group(); xr.add(card);
card.add(new THREE.Mesh(new THREE.BoxGeometry(CW, CH, 0.06), new THREE.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.16, roughness: 0.1, depthWrite: false })));
card.add(edge(new THREE.BoxGeometry(CW, CH, 0.06), 0x9fd0ff, 0.6));
const loopPath = (inset) => { const w = CW / 2 - inset, h = CH / 2 - inset, r = 0.18; const s = new THREE.Shape(); s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h); return new THREE.CurvePath().add ? s : s; };
const LOOPS = [...Array(5)].map((_, i) => { const pts = loopPath(0.16 + i * 0.09).getSpacedPoints(160).map((p) => V(p.x, p.y, 0.035)); return new THREE.CatmullRomCurve3(pts, true); });
const coils = LOOPS.map((c) => { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 240, 0.022, 5, true), new THREE.MeshStandardMaterial({ color: 0xd98a3a, emissive: 0xff7a1a, emissiveIntensity: 0, metalness: 0.6, roughness: 0.35 })); card.add(m); return m; });
const chip = new THREE.Group(); { const c = sh(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.06), new THREE.MeshStandardMaterial({ color: 0xd9b45a, emissive: 0x3dff8c, emissiveIntensity: 0, metalness: 0.7, roughness: 0.3 }))); chip.add(c); chip.userData.m = c.material; for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.01), flat(0x8a6a2a)); l.position.set(0, -0.12 + i * 0.12, 0.035); chip.add(l); } }
chip.position.set(-1.1, 0.15, 0.04); card.add(chip);
const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.8, 0.15, 0.04), V(-0.2, 0.6, 0.04), V(1.7, 1.0, 0.04)]), 40, 0.018, 5), new THREE.MeshStandardMaterial({ color: 0xd98a3a, metalness: 0.6 })); card.add(wire);
const electrons = [...Array(40)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow(0xfff2a0)); card.add(m); return m; });
// the reader and its field: arcs that breathe and flip colour
const reader = new THREE.Group(); xr.add(reader);
{ const b = sh(new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 3.4), flat(0x1c1f25))); b.position.y = 0.25; reader.add(b); const pad = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.02, 2.2), flat(0x2a2f38)); pad.position.y = 0.51; reader.add(pad);
  const ic = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 24, Math.PI * 0.6), glow(0x3dff8c)); ic.rotation.x = -Math.PI / 2; ic.position.set(0, 0.53, 0); reader.add(ic); }
const readerScr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), glow(0x0d2a1a)); readerScr.position.set(0, 0.42, 1.71); reader.add(readerScr);
const fieldArcs = [];
for (let a = 0; a < 6; a++) for (let j = 0; j < 4; j++) {
  const rx = 0.7 + j * 0.6, ry = 1.0 + j * 0.9, pts = [...Array(48)].map((_, i) => { const th = (i / 47) * Math.PI; return V(Math.cos(th) * rx, 0.5 + Math.sin(th) * ry, 0); });
  const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0.6, toneMapped: false })); ln.rotation.y = (a / 6) * Math.PI; reader.add(ln); fieldArcs.push(ln);
}
const torch = new THREE.Group(); { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 10), flat(0x2a2f38))); b.rotation.z = Math.PI / 2; const h = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.25, 10), flat(0x3a3f48)); h.rotation.z = Math.PI / 2; h.position.x = 0.55; const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), glow(0xfff2a0)); lens.rotation.y = Math.PI / 2; lens.position.x = 0.68; const beam = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 18, 1, true), glow(0xfff2a0, 0.25)); beam.rotation.z = Math.PI / 2; beam.position.x = 2.4; torch.add(b, h, lens, beam); torch.userData.lens = lens; torch.userData.beam = beam; }
torch.position.set(-6, 3.6, 0.5); xr.add(torch);
// inside the chip: the vault (secret key), the ingredients, the mixer and the one-time code
const vault = new THREE.Group(); vault.position.set(0, 0, -14); xr.add(vault);
{ const base = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.4, 8), flat(0x2a2f38))); base.position.y = 0.2; vault.add(base);
  const cage = edge(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 8), 0x3dff8c, 0.7); cage.position.y = 2; vault.add(cage); }
const keyG = new THREE.Group(); { const m = flat(0xf2c21b, { metalness: 0.7, roughness: 0.3 }); const bow = sh(new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 8, 16), m)); bow.position.x = -0.6; const shaft = sh(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.12), m)); shaft.position.x = 0.15; const t1 = sh(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.12), m)); t1.position.set(0.55, -0.18, 0); const t2 = t1.clone(); t2.position.x = 0.3; keyG.add(bow, shaft, t1, t2); }
keyG.position.set(0, 2, 0); vault.add(keyG);
const ING = [label("€4.50", 1.5, 0.55), label("#0117", 1.5, 0.55, "#1c1f25", "#3dff8c"), label("RANDOM 83", 1.9, 0.55, "#4fc3ff", "#08131f")];
ING.forEach((m) => vault.add(m));
const mixer = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x3a1f80, flatShading: true, roughness: 0.4 })); mixer.position.set(0, 5.3, 0); vault.add(mixer);
const CODE = label("8F3A·21C7", 2.6, 0.7, "#06140c", "#3dff8c"); vault.add(CODE);

// ---------- world 3: the bathroom (the toothbrush on its charger) ----------
const bath = addWorld("bath", { bg: 0xdfeef3, fog: [6, 16], hemi: 1.1, sun: 1.6, sky: 0xffffff });
bath.add(lowGround(16, 16, 16, (x, y, z) => ((Math.floor(x * 2) + Math.floor(z * 2)) % 2 ? 0xe9eef2 : 0xcfd9e0), () => 0));
{ const sink = sh(new THREE.Mesh(new THREE.BoxGeometry(3, 0.9, 1.2), flat(0xf4f6f8))); sink.position.set(0, 0.45, -0.6); bath.add(sink); const wall = sh(new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.2), flat(0x9fd3c7))); wall.position.set(0, 2, -1.3); bath.add(wall);
  const mir = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.04), new THREE.MeshStandardMaterial({ color: 0xcfe6f0, metalness: 0.9, roughness: 0.05 })); mir.position.set(0, 2.3, -1.18); bath.add(mir); }
const brush = new THREE.Group(); { const st = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 12), flat(0xffffff))); st.position.y = 0.09; const h = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.85, 10), flat(0x4fc3bd))); h.position.y = 0.6; const n = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.35, 8), flat(0xffffff))); n.position.y = 1.2; const br = sh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), flat(0xbfe9ff))); br.position.set(0, 1.42, 0.04); const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), glow(0x3dff8c)); led.position.set(0, 0.3, 0.085); brush.add(st, h, n, br, led); brush.userData.led = led; }
brush.position.set(0.6, 0.9, -0.5); bath.add(brush);
const bathArcs = [...Array(6)].map((_, i) => { const r = 0.12 + i * 0.05; const ln = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([...Array(40)].map((_, k) => V(Math.cos((k / 40) * 6.283) * r, 0, Math.sin((k / 40) * 6.283) * r))), new THREE.LineBasicMaterial({ color: 0x2f86f2, transparent: true, opacity: 0.6, toneMapped: false })); ln.position.set(0.6, 0.95 + i * 0.03, -0.5); bath.add(ln); return ln; });

// ---------- world 4: the bank ----------
const bankW = addWorld("bank", { bg: 0x9cd2ff, fog: [18, 50], hemi: 1.0, sun: 2.3 });
bankW.add(lowGround(60, 60, 30, (x, y, z) => (Math.abs(z - 4) < 1.5 ? 0x8b8f96 : pick([0x7fbf5f, 0x6fb257, 0x8cc865], x, z)), () => 0));
const bank = new THREE.Group(); bankW.add(bank);
{ const m = flat(0xf2ede2); const base = sh(new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 4), m)); base.position.y = 0.3; bank.add(base); const roof = sh(new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.5, 4.4), m)); roof.position.y = 4.1; bank.add(roof);
  const tri = new THREE.Shape(); tri.moveTo(-3.7, 0); tri.lineTo(3.7, 0); tri.lineTo(0, 1.3); tri.lineTo(-3.7, 0);
  const ped = sh(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 4.4, bevelEnabled: false }), m)); ped.position.set(0, 4.35, -2.2); bank.add(ped);
  for (let i = 0; i < 5; i++) { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.3, 10), m)); c.position.set(-2.8 + i * 1.4, 2.25, 1.6); bank.add(c); }
  const wall = sh(new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.3, 3), flat(0xdcd3c2))); wall.position.set(0, 2.25, -0.2); bank.add(wall);
  const sign = label("BANK", 2.2, 0.6, "#1c1f25", "#f2c21b"); sign.position.set(0, 4.1, 2.25); bank.add(sign); }
const check = new THREE.Group(); { const a = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.3), glow(0x3dff8c)); a.position.set(-0.5, -0.1, 0); a.rotation.z = 0.7; const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 0.3), glow(0x3dff8c)); b.position.set(0.45, 0.4, 0); b.rotation.z = -0.6; check.add(a, b); } check.position.set(0, 7.5, 2); bankW.add(check);
const bCode = label("8F3A·21C7", 2.6, 0.7, "#06140c", "#3dff8c"); bankW.add(bCode);
const ghost = label("8F3A·21C7", 2.6, 0.7, "#2a2f38", "#8a9199"); bankW.add(ghost);

// ---------- world 5: Orbi (the file locked on your phone) ----------
const orb = addWorld("orbi", { bg: 0x07090f, fog: [10, 30], hemi: 0.8, sun: 1.4, sky: 0x9fb8ff });
{ const g = new THREE.GridHelper(40, 40, 0x173a2a, 0x10241a); orb.add(g); }
const PH = { phone: makePhone() }; PH.phone.g.scale.setScalar(22); PH.phone.g.position.set(0, 2.2, 0); orb.add(PH.phone.g);
const area = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.8, 64), glow(0x3dff8c, 0.8)); area.rotation.x = -Math.PI / 2; area.position.y = 0.02; orb.add(area);
const nearby = [...Array(5)].map((_, i) => { const p = { phone: makePhone() }; p.phone.g.scale.setScalar(7); const a = (i / 5) * Math.PI * 2 + 0.3; p.phone.g.position.set(Math.cos(a) * 3.0, 0.7, Math.sin(a) * 3.0); p.phone.g.lookAt(0, 0.7, 0); orb.add(p.phone.g); return p; });
const tries = [...Array(12)].map((_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), glow(0x3a3f4a)); m.position.set(-1.65 + (i % 6) * 0.66, 4.55 - Math.floor(i / 6) * 0.38, 0.3); orb.add(m); return m; });
K.reseed(3); const EN = 220, emberGeo = new THREE.BufferGeometry(), emberPos = new Float32Array(EN * 3), emberDir = [...Array(EN)].map(() => [(rnd() - 0.5) * 3.4, rnd() * 3 + 0.5, (rnd() - 0.5) * 2.4]);
emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffa04a, size: 0.09, transparent: true, opacity: 0, toneMapped: false })); orb.add(embers);

tags({
  tA: "No battery · <b>no switch</b>", tB: "A wire loop · <b>round the edge</b>", tC: "Flips <b>13 million times a second</b>",
  tD: "Field → <b>electricity</b>", tE: "Works <b>a few cm away</b>", tF: "Answers by <b>flickering</b>", tG: "· — · · — ·",
  tH: "Secret key · <b>never leaves the chip</b>", tI: "Key + amount + counter + random", tJ: "= <b>a one-time code</b>",
  tK: "Recorded tap · <b>already used</b>", tL: "Locked <b>on your phone</b>", tM: "Code <b>never leaves it</b>", tN: "Only <b>near you</b>", tO: "12 wrong · <b>locked</b>",
});

// ---------- the film ----------
frame("Try it on two phones", async (t) => {
  const k = (a, b) => prog(t, a, b);
  // people in the café
  ME.mode = t > fr("bank", 0.6) && t < at("thief") ? "cheer" : "watch"; BAR.mode = "watch"; THIEF.mode = "watch";
  for (const p of people) posePerson(p, t);
  hood.position.copy(K.headWorld(THIEF)).add(V(0, 0.03, -0.03));
  const th = THIEF.rh.getWorldPosition(V()); sniffer.position.copy(th).add(V(0, 0.06, -0.05)); sniffLed.position.copy(sniffer.position).add(V(0, 0.05, 0)); sniffLed.visible = Math.sin(t * 12) > 0;
  // the card: in her hand, then a tap on the terminal (hook and bank), back again
  const hand = ME.rh.getWorldPosition(V());
  const tapK = Math.max(win2(t, fr("hook", 0.35), fr("hook", 0.6)), win2(t, at("bank") - 0.2, fr("bank", 0.5)), win2(t, at("thief"), fr("thief", 0.3)));
  myCard.position.copy(lerpV(hand.clone().add(V(0, 0.05, -0.05)), V(0.35, 1.2, -0.3), ease(tapK))); myCard.rotation.set(-Math.PI / 2 * ease(tapK) - 0.3 * (1 - tapK), 0.2, 0);
  tapRing.scale.setScalar(1 + ((t * 1.5) % 1) * 2); tapRing.material.opacity = 0.8 * (1 - ((t * 1.5) % 1));
  term.userData.scr.material.color.setHex(tapK > 0.9 ? 0x3dff8c : 0x2f86f2);

  // X-ray: the card comes down onto the reader; field breathes and flips; current flows; chip wakes and flickers
  const down = ease(k(at("induce"), fr("induce", 0.35)));
  card.position.set(0, lerp(4.6, 1.5, t > at("induce") ? down : 0), 0); card.rotation.x = -Math.PI / 2 + lerp(0.5, 0.05, t > at("induce") ? down : 0);
  if (t < at("field")) { card.position.set(0, 2.4, 0); card.rotation.x = 0; }
  const flip = Math.sin(t * 7) > 0;
  fieldArcs.forEach((ln, i) => { ln.visible = t > at("field") && t < at("key"); ln.material.color.setHex(flip ? 0x4fc3ff : 0x8b5cf6); ln.scale.setScalar(0.92 + 0.08 * Math.sin(t * 7 + i * 0.3)); ln.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(t * 7)); });
  const powered = t > fr("induce", 0.3) && t < at("key");
  coils.forEach((c) => (c.material.emissiveIntensity = powered ? 0.6 + 0.3 * Math.sin(t * 9) : t > at("coil") && t < at("field") ? 0.25 + 0.35 * k(at("coil"), fr("coil", 0.4)) : 0.2));
  electrons.forEach((e, i) => { e.visible = powered; const c = LOOPS[i % 5]; e.position.copy(c.getPointAt((((i / 8) + t * 0.35 * (flip ? 1 : -1)) % 1 + 1) % 1)).add(V(0, 0, 0.02)); });
  const flick = t > at("talk") && t < at("key") ? (Math.sin(t * 22) > 0.2 ? 1 : 0.15) : 1;
  chip.userData.m.emissiveIntensity = t > fr("wake", 0.1) && t < at("key") ? 1.2 * ease(k(fr("wake", 0.1), fr("wake", 0.3))) * flick : 0;
  readerScr.material.color.setHex(t > at("talk") && t < at("key") && flick > 0.5 ? 0x3dff8c : 0x0d2a1a);
  torch.visible = t > fr("talk", 0.6) && t < at("key"); torch.userData.lens.visible = torch.userData.beam.visible = Math.sin(t * 9) > 0;
  // the vault: key glows, ingredients fall into the mixer, out comes the code
  vault.visible = t > at("key") - 0.5 && t < at("bank");
  keyG.rotation.y = t * 0.8; keyG.position.y = 2 + Math.sin(t * 2) * 0.1;
  const M = at("mix");
  ING.forEach((m, i) => { const a = (i / 3) * Math.PI * 2 + 0.4, from = V(Math.cos(a) * 3.2, 1.6 + i * 0.4, Math.sin(a) * 1.5 + 1); const kk = k(fr("mix", 0.12 + i * 0.12), fr("mix", 0.3 + i * 0.12)); m.visible = t > at("mix") - 0.2 && kk < 1; m.position.copy(lerpV(from, mixer.position, ease(kk))); m.rotation.set(0, kk * 4, kk * 2); });
  const keyIn = k(fr("mix", 0.05), fr("mix", 0.25)); if (t > M) { keyG.position.copy(lerpV(V(0, 2, 0), mixer.position, ease(keyIn))); keyG.visible = keyIn < 1 || t > fr("mix", 0.75); if (t > fr("mix", 0.75)) keyG.position.set(0, 2, 0); }
  mixer.rotation.set(t * 3, t * 4, 0); mixer.scale.setScalar(t > M && t < fr("mix", 0.7) ? 1 + 0.1 * Math.sin(t * 30) : 1);
  const cOut = k(fr("mix", 0.62), fr("mix", 0.8)); CODE.visible = t > fr("mix", 0.62) && t < at("bank"); CODE.position.copy(lerpV(mixer.position, V(0, 7.2, 1.2), back(cOut))); CODE.scale.setScalar(lerp(0.2, 1, out(cOut)));
  // toothbrush charger rings
  bathArcs.forEach((ln, i) => { ln.scale.setScalar(1 + ((t * 0.9 + i / 6) % 1) * 1.5); ln.material.opacity = 0.7 * (1 - ((t * 0.9 + i / 6) % 1)); });
  brush.userData.led.visible = Math.sin(t * 4) > -0.3;
  // the bank: the code flies in, the check; then the thief's copy bounces
  const bk = k(fr("bank", 0.05), fr("bank", 0.4)); bCode.visible = t > at("bank") && t < fr("bank", 0.5); bCode.position.copy(lerpV(V(-9, 6, 8), V(0, 2.5, 2.6), ease(bk))); bCode.rotation.y = (1 - bk) * 3;
  check.visible = t > fr("bank", 0.45) && t < at("thief"); check.scale.setScalar(back(k(fr("bank", 0.45), fr("bank", 0.6)))); check.rotation.y = Math.sin(t * 2) * 0.3;
  const gk = k(fr("thief", 0.5), fr("thief", 0.75)); ghost.visible = t > fr("thief", 0.45) && t < at("reveal"); ghost.position.copy(lerpV(V(9, 6, 8), V(0, 2.5, 2.6), ease(Math.min(gk, 0.85)))).add(V(t > fr("thief", 0.75) ? Math.sin(t * 40) * 0.08 : 0, 0, 0));
  // Orbi
  const O = at("orbi"), O2 = at("orbi2");
  screen(PH, { layers: [["one", 1]], lock: ease(k(fr("orbi", 0.3), fr("orbi", 0.55))) });
  nearby.forEach((p, i) => screen(p, { layers: [["many", 1]], glow: t > fr("orbi2", 0.05 + i * 0.03) ? 1 : 0 }));
  area.visible = t > O2 - 0.1; area.scale.setScalar(out(k(O2 - 0.1, fr("orbi2", 0.2))));
  nearby.forEach((p) => (p.phone.g.visible = t > O2));
  tries.forEach((m, i) => { m.visible = t > fr("orbi2", 0.3); m.material.color.setHex(t > fr("orbi2", 0.32) + i * 0.09 ? 0xff3b3b : 0x3a3f4a); });
  const burn = k(fr("orbi2", 0.75), fr("orbi2", 0.95));
  PH.phone.g.scale.setScalar(22 * (1 - burn * 0.95)); PH.phone.g.visible = burn < 1;
  for (let i = 0; i < EN; i++) { const d = emberDir[i]; emberPos.set([d[0] * out(burn), 2.2 + d[1] * out(burn) - burn * burn, d[2] * out(burn)], i * 3); }
  emberGeo.attributes.position.needsUpdate = true; embers.material.opacity = burn > 0 && burn < 1 ? 1 - burn * 0.6 : 0;

  // ---- shots ----
  if (t < fr("hook", 0.3)) {
    world("shop"); const q = k(0, fr("hook", 0.3)); look(lerp(2.6, 1.6, q), lerp(2.2, 1.9, q), lerp(3.2, 2.4, q), 0.3, 1.3, -0.2, 44);
    tag("tA", t, fr("hook", 0.05), fr("hook", 0.3), 540, 300);
  } else if (t < fr("hook", 0.7)) {
    world("shop"); const q = k(fr("hook", 0.3), fr("hook", 0.7)); look(lerp(0.9, 0.7, q), lerp(1.55, 1.45, q), lerp(0.5, 0.35, q), 0.35, 1.15, -0.3, 40);
  } else if (t < at("why")) {
    world("xray"); orbit(V(0, 2.4, 0), lerp(-0.5, 0.3, k(fr("hook", 0.7), at("why"))), 11, 0.6, 44);
    big(t, fr("hook", 0.8), at("why") + 0.1, "HOW?!", 260);
  } else if (t < at("coil")) {
    if (t < fr("why", 0.45)) { world("shop"); look(1.2, 1.6, 1.4, 0.4, 1.2, -0.2, 40); }
    else { world("bath"); const q = k(fr("why", 0.45), at("coil")); look(lerp(2.8, 2.3, q), 2.0, lerp(3.0, 2.5, q), 0.5, 1.3, -0.5, 40); }
  } else if (t < at("field")) {
    world("xray"); const q = k(at("coil"), at("field")); look(lerp(-3.5, 2.5, q), lerp(3.6, 3.0, q), 9.5, 0, 2.4, 0, 42);
    tag("tB", t, fr("coil", 0.2), at("field"), 540, 280);
  } else if (t < at("induce")) {
    world("xray"); const q = k(at("field"), at("induce")); orbit(V(0, 1.6, 0), lerp(0.8, 0.2, q), lerp(11, 9, q), 3.2, 46);
    tag("tC", t, fr("field", 0.35), at("induce"), 540, 280);
  } else if (t < fr("induce", 0.72)) {
    world("xray"); const q = k(at("induce"), fr("induce", 0.72)); orbit(V(0, 1.4, 0), lerp(0.1, -0.5, q), lerp(9, 7, q), lerp(3.5, 4.5, q), 44);
    tag("tD", t, fr("induce", 0.35), fr("induce", 0.72), 540, 280);
  } else if (t < at("wake")) {
    world("bath"); const q = k(fr("induce", 0.72), at("wake")); look(lerp(2.2, 1.8, q), 1.7, 2.2, 0.6, 1.2, -0.5, 38);
  } else if (t < at("talk")) {
    world("xray"); const q = k(at("wake"), at("talk")); const c = V(-1.1, 1.6, 0.1); lookV(c.clone().add(V(lerp(1.4, 0.6, q), lerp(1.8, 1.2, q), lerp(1.8, 1.2, q))), c, 42);
    tag("tE", t, fr("wake", 0.45), at("talk"), 540, 280);
  } else if (t < at("key")) {
    world("xray"); const q = k(at("talk"), at("key"));
    if (q < 0.55) { look(lerp(4, 2.5, q), 2.2, 6.5, 0, 1.0, 1.0, 44); tag("tF", t, fr("talk", 0.1), fr("talk", 0.55), 540, 280); }
    else { look(-3.5, 4.2, 6, -2.5, 3.2, 0, 46); tag("tG", t, fr("talk", 0.6), at("key"), 540, 280); }
  } else if (t < at("mix")) {
    world("xray"); const q = k(at("key"), at("mix")); const c = vault.position.clone().add(V(0, 2, 0)); lookV(c.clone().add(V(lerp(3, 1.8, q), lerp(1.2, 0.6, q), lerp(5, 3.4, q))), c, 42);
    flash(t, at("key"), 0.6, 3); tag("tH", t, fr("key", 0.3), at("mix"), 540, 280);
  } else if (t < at("bank")) {
    world("xray"); const q = k(at("mix"), at("bank")); const c = vault.position.clone().add(V(0, 4, 0)); orbit(c, lerp(-0.3, 0.4, q), 10, 1.5, 46);
    tag("tI", t, fr("mix", 0.1), fr("mix", 0.6), 540, 260); tag("tJ", t, fr("mix", 0.65), at("bank"), 540, 260);
  } else if (t < fr("bank", 0.3)) {
    world("shop"); look(0.9, 1.6, 0.5, 0.35, 1.15, -0.3, 40);
  } else if (t < at("thief")) {
    world("bank"); const q = k(fr("bank", 0.3), at("thief")); look(lerp(-6, -3, q), lerp(4, 5, q), lerp(16, 13, q), 0, 4, 0, 46);
    big(t, fr("bank", 0.6), at("thief"), "PAID.", 280);
  } else if (t < fr("thief", 0.45)) {
    world("shop"); const q = k(at("thief"), fr("thief", 0.45)); look(lerp(3.8, 3.3, q), 2.0, lerp(3.6, 3.1, q), 0.9, 1.25, 0.3, 42);
    tag("tK", t, fr("thief", 0.2), fr("thief", 0.45), 540, 280);
  } else if (t < at("reveal")) {
    world("bank"); const q = k(fr("thief", 0.45), at("reveal")); look(lerp(5, 3, q), 4.5, 14, 0, 3.5, 0, 46);
    if (t > fr("thief", 0.75)) { redX(t, fr("thief", 0.75), ghost.position.clone(), 1.2); big(t, fr("thief", 0.8), at("reveal"), "DENIED.", 280); }
  } else if (t < at("orbi")) {
    world("xray"); const q = k(at("reveal"), at("orbi")); orbit(V(0, 1.6, 0), 0.6 + q * 1.2, 10, 3.5, 46);
    big(t, fr("reveal", 0.7), at("orbi"), "ONE TIME.", 280);
  } else if (t < O2) {
    world("orbi"); const q = k(O, O2); look(lerp(1.5, 0.6, q), lerp(2.6, 2.4, q), lerp(6.5, 5.2, q), 0, 2.2, 0, 44);
    flash(t, O, 0.8, 3); tag("tL", t, fr("orbi", 0.2), fr("orbi", 0.55), 540, 280); tag("tM", t, fr("orbi", 0.58), O2, 540, 280);
  } else {
    world("orbi"); const q = k(O2, at("end")); orbit(V(0, 1.8, 0), lerp(0.2, -0.3, q), lerp(9, 7.5, q), 4.5, 46);
    tag("tN", t, fr("orbi2", 0.03), fr("orbi2", 0.28), 540, 280); tag("tO", t, fr("orbi2", 0.32), fr("orbi2", 0.72), 540, 280);
    timer(t, fr("orbi2", 0.75), fr("orbi2", 0.95));
  }
});
function win2(t, a, b) { return clamp((t - a) / 0.3) * clamp((b - t) / 0.3); }
await ready();
