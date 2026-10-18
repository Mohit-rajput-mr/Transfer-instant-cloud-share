// "Why stolen passwords are useless" — a hacker steals every password; the answer is a one-way blender (hashing),
// salt and slow blending; then Orbi: the code never leaves the phone, 310,000 rounds, a hash of the proof, 12 tries, 30 min.
import { THREE, K } from "./kit/engine.js";
const { V, clamp, ease, out, back, lerp, lerpV, rnd, canvasTex, sh, flat, lowGround, pick, noise, rock, edge, green, lockMat, inst, setI, done,
  person, posePerson, people, screen, mk, IM, addWorld, world, look, orbit, project, at, end, fr, prog, tag, tags, big, counter, redX, timer, flash, frame, ready } = K;

// ---------- small helpers ----------
const word = (text, w = 1.6, h = 0.42, bg = "#f6f2ea", fg = "#14161b") => {
  const tx = canvasTex(512, Math.round((512 * h) / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.font = `800 ${Math.round(ch * 0.55)}px M`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, cw / 2, ch / 2 + 2); });
  return sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [0, 0, 0, 0, 1, 1].map((k) => (k ? new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5 }) : flat(0xd9d2c3)))));
};
const hexOf = (s, n = 16) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); let o = ""; for (let i = 0; i < n; i++) { h = Math.imul(h ^ (h >>> 13), 1274126177); o += "0123456789abcdef"[(h >>> 7) & 15]; } return o; };
const hueOf = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
// a smoothie glass: tall faceted glass, coloured drink, a straw, and a label with the "hash"
function glass(fill, text) {
  const g = new THREE.Group();
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.95, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.28, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); gl.position.y = 0.48; g.add(gl);
  const drink = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.25, 0.78, 10), flat(fill))); drink.position.y = 0.4; g.add(drink);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 10), flat(new THREE.Color(fill).lerp(new THREE.Color(0xffffff), 0.5))); foam.position.y = 0.81; g.add(foam);
  const straw = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), flat(0xff5a7a))); straw.position.set(0.1, 0.95, 0); straw.rotation.z = -0.25; g.add(straw);
  if (text) { const lb = word(text, 1.15, 0.24, "#111", "#3dff8c"); lb.position.set(0, -0.2, 0.32); g.add(lb); g.userData.label = lb; }
  g.userData.drink = drink;
  return g;
}

// ---------- world 1: the server room (the heist) ----------
const room = addWorld("room", { bg: 0x0c1220, fog: [10, 26], hemi: 0.9, sun: 1.0, sky: 0x8fb0ff });
room.add(lowGround(30, 30, 24, (x, y, z) => pick([0x141a28, 0x182033, 0x11161f], x, z), () => 0));
K.reseed(5);
for (let row = -1; row <= 1; row += 2) for (let i = 0; i < 6; i++) {
  const g = new THREE.Group(); g.position.set(-5 + i * 2, 0, row * 2.2); g.rotation.y = row > 0 ? Math.PI : 0;
  const b = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.9), flat(0x1f2735))); b.position.y = 1.3; g.add(b);
  for (let j = 0; j < 9; j++) { const led = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: [0x3dff8c, 0x2a8cff, 0xffcf3a][(i + j) % 3], toneMapped: false })); led.position.set(0, 0.4 + j * 0.24, 0.46); g.add(led); }
  room.add(g);
}
const roomLight = new THREE.PointLight(0x7fa8ff, 22, 14, 1.3); roomLight.position.set(0, 3.2, 1.5); room.add(roomLight);
const rim = new THREE.PointLight(0x3dff8c, 8, 6, 1.5); rim.position.set(1.2, 1.8, 1.6); room.add(rim);
const HACK = person(0.4, 0.4, -0.4, 0x4a5366, { sex: "m", parent: room, phone: false });
const hood = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), flat(0x1c2029))); hood.scale.set(0.15, 0.16, 0.16); room.add(hood);
// the stolen list: a glowing slab of rows, later each row a smoothie
const loot = new THREE.Group(); room.add(loot);
const lootTex = canvasTex(512, 640, (g) => { g.fillStyle = "#06140c"; g.fillRect(0, 0, 512, 640); g.font = "700 26px M"; const names = ["anna", "ben_k", "chloe", "dev99", "eli", "fatima", "gus", "hana", "ivo", "jun", "kai", "lena", "mo", "nia"]; names.forEach((n, i) => { g.fillStyle = "#9fb0c0"; g.fillText(n.padEnd(8, " "), 22, 50 + i * 42); g.fillStyle = "#3dff8c"; g.fillText(hexOf(n + "x", 18), 170, 50 + i * 42); }); });
const lootSlab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.05), new THREE.MeshBasicMaterial({ map: lootTex, toneMapped: false })); loot.add(lootSlab); loot.add(edge(new THREE.BoxGeometry(1.3, 1.6, 0.05)));

// ---------- world 2: the kitchen (the blender) ----------
const kit2 = addWorld("kitchen", { bg: 0xfbe3c8, hemi: 1.15, sun: 2.0 });
kit2.add(lowGround(30, 30, 20, (x, y, z) => pick([0xe8d9c2, 0xe2d1b6, 0xeddfc9], x, z), () => 0));
const tiles = canvasTex(256, 256, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#4fc3bd" : "#e9f6f4"; g.fillRect(x * 32, y * 32, 31, 31); } }, [6, 2]);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.6 })); wall.position.set(0, 3, -2.6); kit2.add(wall);
const counterTop = sh(new THREE.Mesh(new THREE.BoxGeometry(14, 0.16, 2.4), flat(0xf4f1ea))); counterTop.position.set(0, 0.9, -1.2); kit2.add(counterTop);
const counterBody = sh(new THREE.Mesh(new THREE.BoxGeometry(14, 0.9, 2.3), flat(0x2c6fb8))); counterBody.position.set(0, 0.45, -1.2); kit2.add(counterBody);
for (let i = -6; i <= 6; i += 1.5) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), flat(0xd8d2c4)); h.position.set(i, 0.75, -0.04); kit2.add(h); }
K.reseed(9);
for (let i = 0; i < 5; i++) { const f = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + rnd() * 0.06, 0), flat([0xff6f4a, 0xffd75e, 0x7fd38a, 0xff8fb1, 0xb59cff][i]))); f.position.set(-3.6 + i * 0.35, 1.15, -1.6 + rnd() * 0.3); kit2.add(f); }
// the blender
const BL = V(0, 0.98, -1.0);
const blender = new THREE.Group(); blender.position.copy(BL); kit2.add(blender);
const base = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.55, 8), flat(0x2a2f3a))); base.position.y = 0.27; blender.add(base);
const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8), flat(0xff5a3a)); knob.rotation.x = Math.PI / 2; knob.position.set(0, 0.3, 0.6); blender.add(knob);
const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 1.5, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfefff, transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); jar.position.y = 1.3; blender.add(jar);
{ const e = edge(new THREE.CylinderGeometry(0.62, 0.42, 1.5, 8, 1, true), 0xffffff, 0.5); e.position.y = 1.3; blender.add(e); }
const lid = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 8), flat(0x2a2f3a))); lid.position.y = 2.08; blender.add(lid);
const blades = new THREE.Group(); blades.position.y = 0.66; blender.add(blades);
for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.1), flat(0xc8ced5)); bl.rotation.y = (i * Math.PI) / 3; blades.add(bl); }
const swirl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.9, 8), flat(0xff8f5c, { transparent: true, opacity: 0.85 })); swirl.position.y = 1.05; blender.add(swirl);
const salt = new THREE.Group(); { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.42, 8), flat(0xffffff))); salt.add(b); const cap = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8), flat(0xc8ced5))); cap.position.y = 0.25; salt.add(cap); } kit2.add(salt);
const crystals = inst(new THREE.BoxGeometry(0.035, 0.035, 0.035), flat(0xffffff, { emissive: 0x666666 }), 60, kit2);
// the words that go in, the glasses that come out
const W1 = word("sunflower7"), W2 = word("sunflower8"), W3 = word("password123", 1.8);
[W1, W2].forEach((w) => kit2.add(w));
const G1 = glass("#8b5cf6", hexOf("sunflower7", 12)), G2 = glass("#7fd38a", hexOf("sunflower8", 12));
const G3 = glass("#8b5cf6", hexOf("sunflower7", 12)), GS = glass("#ffcf3a", hexOf("salt+sun", 12));
[G1, G2, G3, GS].forEach((g) => kit2.add(g));
// the login gate: two glasses on a scale, a door behind
const gate = new THREE.Group(); gate.position.set(4.2, 0.98, -1.2); kit2.add(gate);
{ const frame = sh(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.6, 0.2), flat(0x2a2f3a))); frame.position.set(0, 1.3, -0.4); gate.add(frame); }
const door = sh(new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.1), flat(0x3dff8c, { emissive: 0x0b3a1f }))); door.position.set(-0.6, 1.17, -0.3); door.geometry.translate(0.6, 0, 0); gate.add(door);
const check = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 6, 20), new THREE.MeshBasicMaterial({ color: green, toneMapped: false })); check.position.set(0, 2.9, -0.3); gate.add(check);
// the hacker's guessing machine: a row of small blenders spitting glasses
const rack = new THREE.Group(); rack.position.set(-4.2, 0.98, -1.2); kit2.add(rack);
const minis = [...Array(5)].map((_, i) => { const m = blender.clone(); m.scale.setScalar(0.42); m.position.set(-1.1 + i * 0.55, 0, 0); rack.add(m); return m; });
const GUESS = ["qwerty", "123456", "iloveyou", "letmein", "password123"];
const gWords = GUESS.map((s) => { const w = word(s, 1.2, 0.3); kit2.add(w); return w; });
const HACK2 = person(-4.2, 0.6, 0.0, 0x2b2f3a, { sex: "m", parent: kit2, phone: false });
const ME = person(2.2, 0.8, -0.1, 0x4fc3bd, { sex: "m", parent: kit2 });
const FR = person(-1.9, 0.8, 0.1, 0xf08a5d, { sex: "f", parent: kit2 });

// ---------- world 3: inside your phone (Orbi) ----------
const orb = addWorld("phone", { bg: 0x0b1020, fog: [12, 30], hemi: 0.6, sun: 1.2 });
orb.add(lowGround(40, 40, 30, (x, y, z) => pick([0x141a2e, 0x18203a, 0x1c2442], x, z), (x, z) => (Math.hypot(x, z) < 6 ? 0 : noise(x * 0.5, z * 0.5) * 0.7 + (Math.hypot(x, z) - 6) * 0.12)));
const holo = new THREE.Group(); holo.position.set(0, 1.7, 0); orb.add(holo);
holo.add(sh(new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.06), new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.2, metalness: 0.6 }))));
holo.add(edge(new THREE.BoxGeometry(1.0, 2.0, 0.06)));
const codeScr = canvasTex(390, 844, (g) => { g.fillStyle = "#0c0e12"; g.fillRect(0, 0, 390, 844); g.fillStyle = "#9aa"; g.font = "600 18px M"; g.fillText("CODE", 40, 360); g.fillStyle = "#0d0f13"; g.strokeStyle = "#3dff8c"; g.lineWidth = 3; g.beginPath(); g.roundRect(40, 380, 310, 70, 16); g.fill(); g.stroke(); g.fillStyle = "#fff"; g.font = "700 40px M"; g.fillText("tram", 64, 428); g.fillStyle = "#fff"; g.beginPath(); g.roundRect(40, 500, 310, 66, 33); g.fill(); g.fillStyle = "#000"; g.font = "900 26px D"; g.textAlign = "center"; g.fillText("LAUNCH ↑", 195, 542); });
const hs = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.92), new THREE.MeshBasicMaterial({ map: codeScr, toneMapped: false })); hs.position.z = 0.032; holo.add(hs);
const mini = blender.clone(); mini.scale.setScalar(0.5); mini.position.set(0, 0.2, 0.9); orb.add(mini);
const keyM = new THREE.MeshStandardMaterial({ color: 0xe0a82a, metalness: 0.4, roughness: 0.45, flatShading: true });
const key = new THREE.Group(); { const ring = sh(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 14), keyM)); key.add(ring); const shaft = sh(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.07), keyM)); shaft.position.x = 0.4; key.add(shaft); for (const x of [0.55, 0.65]) { const tth = sh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), keyM)); tth.position.set(x, -0.08, 0); key.add(tth); } } orb.add(key);
const fileBox = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5), lockMat)); fileBox.position.set(1.6, 1.0, 0.3); orb.add(fileBox); { const e = edge(new THREE.BoxGeometry(0.7, 0.9, 0.5)); fileBox.add(e); }
const server = new THREE.Group(); server.position.set(-1.9, 0, -1.2); orb.add(server);
{ const b = sh(new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.9), flat(0x2a3346))); b.position.y = 1.2; server.add(b); const sTex = canvasTex(256, 96, (g) => { g.fillStyle = "#111"; g.fillRect(0, 0, 256, 96); g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("SERVER", 38, 62); }); const sl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.38), new THREE.MeshBasicMaterial({ map: sTex, toneMapped: false })); sl.position.set(0, 2.1, 0.46); server.add(sl); }
const tiny = glass("#8b5cf6", null); tiny.scale.setScalar(0.45); const tinyIn = glass("#3dff8c", null); tinyIn.scale.setScalar(0.5); tinyIn.position.y = 0.05; tiny.add(tinyIn); tiny.position.set(-1.9, 1.15, -0.7); orb.add(tiny);
const tries = [...Array(12)].map((_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.09, 10), new THREE.MeshBasicMaterial({ color: 0x3a3f4a, toneMapped: false })); m.position.set(-1.1 + (i % 6) * 0.44, 3.35 - Math.floor(i / 6) * 0.4, -0.3); orb.add(m); return m; });
K.reseed(3); const EN = 260, emberGeo = new THREE.BufferGeometry(), emberPos = new Float32Array(EN * 3), emberDir = [...Array(EN)].map(() => [(rnd() - 0.5) * 2.4, rnd() * 2 + 0.5, (rnd() - 0.5) * 2]);
emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffa04a, size: 0.08, transparent: true, opacity: 0, toneMapped: false })); orb.add(embers);

tags({
  tA: "Stored: <b>never your password</b>", tB: "One way · <b>no way back</b>", tC: "1 letter → <b>a new smoothie</b>",
  tD: "Common passwords · <b>cracked fast</b>", tE: "Salt · <b>same password, new smoothie</b>", tF: "Blended <b>thousands of times</b>",
  tG: "Your code <b>never leaves your phone</b>", tH: "Server keeps <b>a hash of a hash</b>", tI: "12 wrong · <b>locked</b>",
});

// ---------- the film ----------
const drop = (m, from, to, k, spin = 2) => { m.visible = k > 0 && k < 1; m.position.copy(lerpV(from, to, ease(k))).add(V(0, Math.sin(k * Math.PI) * 0.5, 0)); m.rotation.set(k * spin, k * spin * 0.6, 0); m.scale.setScalar(lerp(1, 0.3, clamp((k - 0.7) / 0.3))); };
const pour = (g, k, to) => { g.visible = k > 0; g.position.copy(lerpV(BL.clone().add(V(0.9, 0, 0.3)), to, ease(clamp(k)))); g.scale.setScalar(lerp(0.2, 1, out(clamp(k * 1.5)))); };
const IN = BL.clone().add(V(0, 2.4, 0)), TOP = V(-1.2, 2.6, 0.4);

frame("Now you know where your password goes", async (t) => {
  // people
  HACK.mode = t < fr("hook", 0.5) ? "walk" : t > at("reveal") ? "watch" : "phone";
  HACK.o.position.set(lerp(-2.5, 0.4, ease(prog(t, 0, fr("hook", 0.5)))), 0, 0.4);
  HACK2.mode = t > fr("slow", 0.6) ? "watch" : "phone";
  ME.mode = t > fr("login", 0.75) && t < at("guess") ? "cheer" : "phone";
  FR.mode = "phone";
  for (const p of people) posePerson(p, t);
  hood.position.copy(K.headWorld(HACK)).add(V(0, 0.03, -0.03));
  // the loot slab floats up from the rack into his hands
  const lk = prog(t, fr("hook", 0.35), fr("hook", 0.7));
  loot.position.copy(lerpV(V(1.5, 1.4, -1.9), V(0.4, 1.35, 0.85), ease(lk))); loot.rotation.y = -0.4 + (1 - lk) * 1.2;
  if (t > at("reveal")) { const d = prog(t, fr("reveal", 0.35), fr("reveal", 0.7)); loot.position.y = 1.35 - d * 1.3; loot.rotation.x = d * 1.4; }

  // the blender spins while something is in it
  const spinning = (t > fr("blender", 0.35) && t < fr("blender", 0.75)) || (t > fr("tiny", 0.2) && t < fr("tiny", 0.6)) || (t > fr("login", 0.2) && t < fr("login", 0.5)) || (t > fr("salt", 0.35) && t < at("reveal"));
  blades.rotation.y = spinning ? t * 40 : 0; swirl.visible = spinning; swirl.rotation.y = t * 6; swirl.scale.y = 0.8 + 0.2 * Math.sin(t * 20);
  swirl.material.color.setHex(t > at("salt") ? 0xffcf3a : t > at("tiny") && t < at("login") ? 0x7fd38a : 0x8b5cf6);
  blender.position.x = BL.x + (spinning ? Math.sin(t * 60) * 0.01 : 0);
  // words in, glasses out
  drop(W1, TOP, IN, prog(t, fr("blender", 0.1), fr("blender", 0.35)));
  pour(G1, prog(t, fr("blender", 0.75), end("blender")), V(1.4, 0.98, -0.6));
  drop(W2, TOP, IN, prog(t, at("tiny"), fr("tiny", 0.2)));
  pour(G2, prog(t, fr("tiny", 0.6), fr("tiny", 0.85)), V(2.3, 0.98, -0.6));
  if (t < at("tiny")) G2.visible = false;
  if (t > at("login")) { G1.visible = true; G1.position.copy(lerpV(V(1.4, 0.98, -0.6), V(3.75, 0.98, -0.8), ease(prog(t, at("login"), fr("login", 0.2))))); G2.visible = false; }
  pour(G3, prog(t, fr("login", 0.5), fr("login", 0.65)), V(4.65, 0.98, -0.8));
  if (t < fr("login", 0.5)) G3.visible = false;
  door.rotation.y = -1.3 * ease(prog(t, fr("login", 0.7), fr("login", 0.85)));
  check.visible = t > fr("login", 0.7) && t < at("guess"); check.scale.setScalar(back(prog(t, fr("login", 0.7), fr("login", 0.8))));
  // one-way: the smoothie tries to go back in
  if (t > at("oneway") && t < at("tiny")) { const k = prog(t, fr("oneway", 0.45), fr("oneway", 0.7)); G1.visible = true; G1.position.copy(lerpV(V(1.4, 0.98, -0.6), BL.clone().add(V(0.4, 2.3, 0.4)), ease(k))); G1.rotation.z = -k * 1.8; }
  else G1.rotation.z = 0;
  // the guessing machine
  gWords.forEach((w, i) => { const k = ((t - at("guess") - i * 0.25) * 0.8) % 1; w.visible = t > at("guess") && t < at("salt") && k > 0; w.position.set(-4.2 - 1.1 + i * 0.55, 2.4 - k * 1.2, -1.2); w.scale.setScalar(0.5 * (1 - k * 0.5)); w.rotation.y = k * 4; });
  minis.forEach((m, i) => (m.children[5] && (m.children[5].rotation.y = t > at("guess") && t < at("salt") ? t * 30 + i : 0)));
  // salt: shaker over the blender, crystals fall; the salted glass is a new colour
  const sk = prog(t, fr("salt", 0.15), fr("salt", 0.35));
  salt.visible = t > at("salt") && t < at("slow"); salt.position.copy(BL).add(V(0.2, 3.2 - sk * 0.3, 0.1)); salt.rotation.z = Math.PI * 0.8 * ease(sk) + (sk >= 1 ? Math.sin(t * 18) * 0.15 : 0);
  for (let i = 0; i < 60; i++) { const ph = ((t * 0.9 + i / 60) % 1); setI(crystals, i, t > fr("salt", 0.3) && t < fr("salt", 0.8) ? BL.clone().add(V(0.05 + Math.sin(i) * 0.1, 3.0 - ph * 1.4, Math.cos(i * 1.3) * 0.1)) : V(0, -50, 0), i, i, 0, 1); }
  done(crystals);
  pour(GS, prog(t, fr("salt", 0.7), fr("salt", 0.9)), V(1.4, 0.98, -0.6)); if (t < fr("salt", 0.7) || t > at("reveal")) GS.visible = false;

  // Orbi: the code blends into the key, the key locks the file, the server keeps a hash of a hash, 12 tries, burn
  const O = at("orbi"), O2 = at("orbi2");
  key.visible = t > fr("orbi", 0.55); key.position.copy(lerpV(V(0, 0.9, 1.2), V(1.0, 1.0, 0.6), ease(prog(t, fr("orbi", 0.7), fr("orbi", 0.9))))); key.rotation.set(0, t, 0);
  mini.children[5] && (mini.children[5].rotation.y = t > fr("orbi", 0.3) && t < fr("orbi", 0.7) ? t * 50 : 0);
  tries.forEach((m, i) => m.material.color.setHex(t > fr("orbi2", 0.35) + i * 0.12 ? 0xff3b3b : 0x3a3f4a));
  const burn = prog(t, fr("orbi2", 0.78), fr("orbi2", 0.98));
  fileBox.visible = burn < 1; fileBox.scale.setScalar(1 - burn * 0.9);
  for (let i = 0; i < EN; i++) { const d = emberDir[i]; emberPos.set([1.6 + d[0] * out(burn), 1.0 + d[1] * out(burn) - burn * burn, 0.3 + d[2] * out(burn)], i * 3); }
  emberGeo.attributes.position.needsUpdate = true; embers.material.opacity = burn > 0 && burn < 1 ? 1 - burn * 0.6 : 0;

  // ---- shots ----
  if (t < at("why")) {
    // the heist: a hacker walks into a dark server room and grabs the list
    world("room"); const k = prog(t, 0, at("why"));
    if (k < 0.55) look(lerp(5.2, 4.2, k), 1.8, 0.6, lerp(-1.5, 0.3, k), 1.2, 0.4, 46);
    else look(3.2, 1.9, 2.6, 0.4, 1.3, 0.7, 40);
    big(t, fr("hook", 0.8), at("why") + 0.2, "USELESS?", 260);
  } else if (t < at("stored")) {
    world("room"); const k = prog(t, at("why"), at("stored"));
    look(lerp(0.7, 0.55, k), 1.45, lerp(1.7, 1.3, k), 0.4, 1.35, 0.85, 34);
    big(t, fr("why", 0.6), at("stored"), "WHY?", 280);
  } else if (t < at("blender")) {
    world("kitchen"); orbit(BL.clone().add(V(0, 1.2, 0)), lerp(-0.5, -0.2, prog(t, at("stored"), at("blender"))), 7.5, 1.8, 46);
    tag("tA", t, fr("stored", 0.3), at("blender"));
  } else if (t < at("oneway")) {
    world("kitchen"); const k = prog(t, at("blender"), at("oneway"));
    look(lerp(-1.0, 1.4, k), lerp(3.0, 2.4, k), lerp(5.8, 5.2, k), lerp(0, 0.7, k), lerp(2.3, 1.7, k), -0.9, 44);
  } else if (t < at("tiny")) {
    world("kitchen"); const k = prog(t, at("oneway"), at("tiny"));
    look(lerp(3.2, 2.6, k), 2.6, 5.4, 0.5, 2.1, -0.9, 44);
    tag("tB", t, fr("oneway", 0.5), at("tiny"));
    if (t > fr("oneway", 0.72)) redX(t, fr("oneway", 0.72), BL.clone().add(V(0.3, 2.4, 0.4)));
  } else if (t < at("login")) {
    world("kitchen"); const k = prog(t, at("tiny"), at("login"));
    look(lerp(1.2, 2.0, k), 2.2, 4.6, lerp(0.8, 1.9, k), 1.5, -0.7, 42);
    tag("tC", t, fr("tiny", 0.7), at("login"));
  } else if (t < at("guess")) {
    world("kitchen"); const k = prog(t, at("login"), at("guess"));
    look(lerp(3.0, 4.6, k), 2.6, lerp(5.6, 6.2, k), 4.2, 1.7, -1.0, 46);
  } else if (t < at("salt")) {
    world("kitchen"); const k = prog(t, at("guess"), at("salt"));
    look(lerp(-2.6, -3.8, k), 2.8, 5.6, -4.2, 1.6, -1.0, 48);
    tag("tD", t, fr("guess", 0.4), at("salt"));
    big(t, fr("guess", 0.78), at("salt"), "CRACKED", 260);
  } else if (t < at("slow")) {
    world("kitchen"); const k = prog(t, at("salt"), at("slow"));
    look(lerp(0.2, 0.9, k), 3.4, 5.8, 0.2, 2.6, -1.0, 46);
    tag("tE", t, fr("salt", 0.55), at("slow"));
  } else if (t < at("reveal")) {
    world("kitchen"); const k = prog(t, at("slow"), at("reveal"));
    look(lerp(-1.6, -3.0, k), 2.4, lerp(5.4, 5.8, k), lerp(0, -3.6, k), 1.8, -1.0, 46);
    counter(t, fr("slow", 0.15), fr("slow", 0.6), `× ${Math.round(lerp(1, 10000, ease(prog(t, fr("slow", 0.15), fr("slow", 0.55))))).toLocaleString("en-US")}`);
    tag("tF", t, fr("slow", 0.2), at("reveal"));
  } else if (t < at("orbi")) {
    world("room"); const k = prog(t, at("reveal"), at("orbi"));
    look(lerp(2.6, 3.6, k), lerp(1.6, 2.1, k), lerp(0.9, 0.5, k), 0.4, 0.9, 0.6, 42);
    big(t, fr("reveal", 0.4), at("orbi"), "USELESS.", 260);
  } else if (t < at("orbi2")) {
    world("phone"); const k = prog(t, O, O2);
    look(lerp(0.2, 1.2, k), lerp(2.0, 1.8, k), lerp(5.2, 4.8, k), lerp(0, 0.6, k), 1.4, 0.3, 44);
    flash(t, O, 0.9, 3);
    tag("tG", t, fr("orbi", 0.15), fr("orbi", 0.6));
    counter(t, fr("orbi", 0.55), O2, `× ${Math.round(310000 * ease(prog(t, fr("orbi", 0.5), fr("orbi", 0.8)))).toLocaleString("en-US")}`);
  } else {
    world("phone"); const k = prog(t, O2, at("end"));
    look(lerp(-0.4, 0.6, k), 2.3, lerp(4.6, 4.2, k), lerp(-1.2, 0.6, k), 1.8, -0.5, 46);
    tag("tH", t, fr("orbi2", 0.05), fr("orbi2", 0.35));
    tag("tI", t, fr("orbi2", 0.4), fr("orbi2", 0.75));
    timer(t, fr("orbi2", 0.75), fr("orbi2", 0.95));
  }
});
await ready();
