// Improved Film 07: how an email finds the right inbox (your server → DNS phone book → MX signpost → encrypted hop →
// spam gate with a sniffer dog → the inbox), then Orbi: no address, no inbox, no account; the file pops up nearby.
import { THREE, stage, lights, person, pose, tree, house, flat, glow, mesh, add, facet, limb, bbox, V, camRig, clamp, lerp, ease, out, back, win, rnd, reseed, tinted, sky, cloud, textTex, W, H } from "./kit.js";

const $ = (id) => document.getElementById(id), S = (el, o) => Object.assign(el.style, o);
let res = await fetch("vo/lines.json"); if (!res.ok) res = await fetch("lines.est.json");
const LINES = await res.json(); const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const A = (k) => L[k].at; window.DURATION = LINES.duration;
const wt = (k, word, nth = 0) => { const ln = L[k], ws = ln.text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); const nm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""); let i = -1; for (let n = 0; n <= nth; n++) i = ws.findIndex((w, j) => j > i && nm(w) === nm(word)); if (i < 0) throw new Error(`no word ${word} in ${k}`); let acc = 0; for (let j = 0; j < i; j++) acc += ws[j].length + 2; return ln.at + (acc / tot) * ln.dur; };
const P = (m, v) => (m.position.copy(v), m);
const label = (txt, col = "#fff", w = 2.4, h = 0.6, font = "800 90px D", bg = null) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, map: textTex((g, cw, ch) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } g.fillStyle = col; g.font = font; g.textAlign = "center"; g.fillText(txt, cw / 2, ch * 0.74); }, 640, Math.round(640 * h / w)) }));
const phoneOn = (p) => { const g = new THREE.Group(); g.add(mesh(bbox(0.075, 0.155, 0.012, 0.012), flat(0x1d1f24))); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0x0b0d10, toneMapped: false })); sc.position.z = 0.007; g.add(sc); g.scr = sc; p.rig.rElbow.add(g); g.position.set(0, -0.4, 0.035); g.rotation.set(-0.15, 0, Math.PI); return g; };
const envelope = (col = 0xf4f1e6, txt = "to: sam@bakery.com", tc = "#333") => { const g = new THREE.Group(); g.add(mesh(bbox(1.2, 0.75, 0.06, 0.03), flat(col))); const flap = mesh(new THREE.ConeGeometry(0.62, 0.42, 3), flat(new THREE.Color(col).multiplyScalar(0.9).getHex())); flap.rotation.set(0, 0, Math.PI); flap.scale.z = 0.08; flap.position.set(0, 0.17, 0.04); g.add(flap); g.add(P(label(txt, tc, 1.1, 0.16, "700 70px M"), V(0, -0.2, 0.04))); return g; };

reseed(707);
const { r, scene, cam, comp } = stage($("gl"), { bg: 0x9fc4e8, fog: [0xbcd4ea, 80, 320], bloom: 0.4, exposure: 1.05 });
const LT = lights(scene, { key: 0xfff4e4, keyI: 2.4, sky: 0xdfe8ff, ground: 0x6a6058, fillI: 1.1, rim: 0xa9c8ff, rimI: 0.7, at: V(14, 22, 16), area: 30 });
scene.add(sky(0x5a8fd0, 0xcfe4f6, 0xe8eef4));

// ---------------------------------------------------------------- the town: two post offices, the DNS library on the hill, the MX signpost
const TOWN = new THREE.Group(); scene.add(TOWN);
{ const gr = tinted(facet(new THREE.PlaneGeometry(240, 240, 30, 30).rotateX(-Math.PI / 2), 0.4), 0x8fbf5a, 0.1); TOWN.add(gr);
  const road = tinted(new THREE.PlaneGeometry(60, 3.4, 30, 2).rotateX(-Math.PI / 2), 0x6a6f75, 0.05); road.position.set(0, 0.03, 4); TOWN.add(road); for (let i = 0; i < 20; i++) TOWN.add(P(mesh(new THREE.BoxGeometry(1.2, 0.01, 0.15), flat(0xffffff), { cast: false }), V(-28 + i * 3, 0.05, 4)));
  const hill = tinted(facet(new THREE.CylinderGeometry(7, 11, 3, 14, 2), 0.6), 0x7fae4f, 0.1); hill.position.set(0, 1.0, -12); TOWN.add(hill);
  for (let i = 0; i < 40; i++) { const a = rnd() * Math.PI * 2, d = 24 + rnd() * 50; const t = tree(3 + rnd() * 2, i % 3 ? "round" : "pine"); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); TOWN.add(t); }
  for (let i = 0; i < 10; i++) { const h = house(3, 2.6, 3, [0xe9d8b8, 0xd8e4ef, 0xf2d6d0][i % 3], [0xb5603a, 0x6a7a8a][i % 2]); h.position.set(-30 + i * 6.5, 0, 14 + (i % 2) * 5); h.rotation.y = Math.PI; TOWN.add(h); }
  for (let i = 0; i < 6; i++) { const c = cloud(5 + rnd() * 4, 0xffffff); c.position.set(-80 + rnd() * 160, 30 + rnd() * 20, -80 - rnd() * 40); scene.add(c); } }
const office = (x, name, col, roof) => { const g = new THREE.Group(); g.position.set(x, 0, 0); TOWN.add(g); g.add(P(mesh(bbox(7, 5, 5, 0.15), flat(col)), V(0, 2.5, 0))); const rf = mesh(facet(new THREE.CylinderGeometry(0.01, 4.6, 2.2, 4, 1), 0.02), flat(roof)); rf.rotation.y = Math.PI / 4; rf.scale.z = 0.75; rf.position.y = 6.1; g.add(rf);
  g.add(P(mesh(bbox(1.6, 2.4, 0.2, 0.05), flat(0x5a3a26)), V(0, 1.2, 2.55))); for (const s of [-1, 1]) g.add(P(mesh(bbox(1.2, 1.0, 0.2, 0.05), flat(0xffe6a0, { emissive: 0x6a5020, emissiveIntensity: 0.3 })), V(s * 2.3, 2.8, 2.55)));
  const sg = label(name, "#ffffff", 5.5, 0.9, "900 100px D", "#1f4a8a"); sg.position.set(0, 4.6, 2.62); g.add(sg); return g; };
const MINE = office(-16, "YOUR MAIL SERVER", 0xe9d8b8, 0x6a7a8a), BAKE = office(16, "bakery.com MAIL", 0xf2d6d0, 0xb5603a);
{ const bun = mesh(facet(new THREE.SphereGeometry(0.8, 8, 6), 0.05), flat(0xd9a05a)); bun.scale.y = 0.6; bun.position.set(3.2, 5.4, 2.4); BAKE.add(bun); }
// the DNS library: a giant open phone book on the hill
const BOOK = new THREE.Group(); BOOK.position.set(0, 2.6, -12); TOWN.add(BOOK);
{ const cover = flat(0x3a5a9a); for (const s of [-1, 1]) { const half = new THREE.Group(); half.rotation.z = s * 0.12; BOOK.add(half); half.add(P(mesh(bbox(3.2, 0.25, 4.2, 0.05), cover), V(s * 1.7, 0, 0))); half.add(P(mesh(bbox(3.0, 0.35, 4.0, 0.03), flat(0xfaf6ea)), V(s * 1.65, 0.28, 0)));
    const page = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.8), new THREE.MeshBasicMaterial({ map: textTex((g, w, h) => { g.fillStyle = "#faf6ea"; g.fillRect(0, 0, w, h); g.fillStyle = "#333"; g.font = "700 30px M"; const rows = s < 0 ? ["apple.com", "bakery.com", "bank.com", "beach.org", "bikes.net", "books.io"] : ["MX → mail.", "  bakery.com", "", "A → 203.0.113.7", "", "TTL 3600"]; rows.forEach((r0, i) => { if (s < 0 && i === 1) { g.fillStyle = "#ffe066"; g.fillRect(10, 40 + i * 70, w - 20, 56); g.fillStyle = "#333"; } g.fillText(r0, 24, 80 + i * 70); }); g.font = "900 44px D"; g.fillStyle = "#1f4a8a"; g.fillText("DNS", w / 2 - 50, h - 40); }, 420, 570) }));
    page.rotation.x = -Math.PI / 2; page.position.set(s * 1.65, 0.47, 0); half.add(page); }
  const lb = label("DNS · the internet's phone book", "#ffffff", 7, 0.7, "800 70px D", "#1f4a8a"); lb.position.set(0, 3.2, -1.5); BOOK.add(lb); }
const SIGN = new THREE.Group(); SIGN.position.set(6, 0, -3); TOWN.add(SIGN); SIGN.add(P(mesh(limb(0.12, 0.12, 4, 6), flat(0x7a5a3a)), V(0, 4, 0)));
const ARROW = new THREE.Group(); ARROW.position.y = 3.4; SIGN.add(ARROW); ARROW.add(P(mesh(bbox(4.2, 0.9, 0.2, 0.05), flat(0xffd04a)), V(2, 0, 0))); const tip = mesh(new THREE.ConeGeometry(0.65, 0.9, 3), flat(0xffd04a)); tip.rotation.z = -Math.PI / 2; tip.position.set(4.5, 0, 0); ARROW.add(tip); ARROW.add(P(label("MX → bakery.com mail", "#2a2a2a", 3.9, 0.5, "800 74px D"), V(2, 0, 0.12)));
// the encrypted hop: a glass tube between the offices, a capsule with a lock
const TUBE = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-12, 4, 0), V(-6, 9, -1), V(6, 9, -1), V(12, 4, 0)]), 80, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false })); TOWN.add(TUBE);
const CAPS = new THREE.Group(); TOWN.add(CAPS); CAPS.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.2, 4, 10), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.45, roughness: 0.1 }))); CAPS.children[0].rotation.z = Math.PI / 2;
const CLOCK = new THREE.Group(); CAPS.add(CLOCK); CLOCK.position.set(0, 0.75, 0); CLOCK.add(mesh(bbox(0.4, 0.32, 0.12, 0.04), flat(0x3dff8c, { emissive: 0x0a5a2a, emissiveIntensity: 0.6 }))); CLOCK.add(P(mesh(new THREE.TorusGeometry(0.13, 0.04, 5, 10, Math.PI), flat(0x3dff8c)), V(0, 0.16, 0)));
// the spam gate at the bakery: a scanner arch, a sniffer dog, a bin for spam
const GATE = new THREE.Group(); GATE.position.set(16, 0, 6.5); TOWN.add(GATE); { const gm = flat(0x3a3f4a, { metalness: 0.4 }); for (const s of [-1, 1]) GATE.add(P(mesh(bbox(0.4, 3.4, 0.4, 0.05), gm), V(s * 1.6, 1.7, 0))); GATE.add(P(mesh(bbox(3.6, 0.4, 0.4, 0.05), gm), V(0, 3.5, 0))); }
const GLIGHT = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 0.15), glow(0x3dff8c)); GLIGHT.position.set(0, 3.25, 0); GATE.add(GLIGHT);
const DOG = new THREE.Group(); DOG.position.set(2.6, 0, 7.4); TOWN.add(DOG); { const fur = flat(0xb5803a), dark = flat(0x5a3a20); const body = mesh(facet(new THREE.IcosahedronGeometry(0.42, 1), 0.04), fur); body.scale.set(1.6, 0.9, 0.85); body.position.y = 0.62; DOG.add(body);
  const head = new THREE.Group(); head.position.set(0.72, 0.95, 0); DOG.add(head); DOG.head = head; head.add(mesh(facet(new THREE.IcosahedronGeometry(0.26, 1), 0.02), fur)); head.add(P(mesh(bbox(0.3, 0.18, 0.2, 0.05), fur), V(0.25, -0.06, 0))); head.add(P(mesh(new THREE.SphereGeometry(0.06, 6, 4), flat(0x111111)), V(0.42, -0.02, 0)));
  for (const s of [-1, 1]) { const ear = mesh(bbox(0.1, 0.26, 0.14, 0.03), dark); ear.position.set(-0.02, 0.05, s * 0.22); ear.rotation.x = s * 0.4; head.add(ear); }
  for (const [x, z] of [[0.45, 0.18], [0.45, -0.18], [-0.45, 0.18], [-0.45, -0.18]]) DOG.add(P(mesh(limb(0.07, 0.06, 0.4, 5), fur), V(x, 0.42, z)));
  const tail = mesh(limb(0.05, 0.03, 0.4, 5), fur); tail.position.set(-0.68, 0.8, 0); tail.rotation.z = 0.8; DOG.add(tail); DOG.tail = tail; }
DOG.position.set(15, 0, 8.2);
const BIN = new THREE.Group(); BIN.position.set(19.6, 0, 7.5); TOWN.add(BIN); BIN.add(P(mesh(new THREE.CylinderGeometry(0.6, 0.5, 1.2, 10), flat(0x5a6a5a)), V(0, 0.6, 0))); BIN.add(P(label("SPAM", "#ffffff", 1.1, 0.3, "900 100px D", "#c03a2a"), V(0, 0.7, 0.62)));
// the inbox wall inside the bakery: little doors, one for sam
const BOXES = new THREE.Group(); BOXES.position.set(11.5, 0, 9); TOWN.add(BOXES); const DOORS = [];
for (let i = 0; i < 12; i++) { const c = i % 4, r0 = Math.floor(i / 4); const bx = new THREE.Group(); bx.position.set(-1.5 + c * 1.0, 0.8 + r0 * 0.9, 0); BOXES.add(bx); bx.add(mesh(bbox(0.9, 0.8, 0.6, 0.04), flat(0xb08a5a))); const dr = new THREE.Group(); dr.position.set(-0.42, 0, 0.31); bx.add(dr); dr.add(P(mesh(bbox(0.84, 0.74, 0.05, 0.03), flat(i === 6 ? 0x3dff8c : 0xd8b07a)), V(0.42, 0, 0))); dr.add(P(label(i === 6 ? "sam" : ["ana", "bo", "cy", "di", "ed", "fe", "", "gil", "hu", "ivy", "jo", "kai"][i], "#2a2a2a", 0.7, 0.22, "800 90px D"), V(0.42, 0.18, 0.03))); DOORS.push(dr); }
const SCV = document.createElement("canvas"); SCV.width = 432; SCV.height = 930; { const g = SCV.getContext("2d"); g.fillStyle = "#c4cad3"; g.fillRect(0, 0, 432, 930); g.fillStyle = "#1f4a8a"; g.fillRect(0, 0, 432, 100); g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("New mail", 30, 66); g.fillStyle = "#555"; g.font = "600 28px M"; g.fillText("To:", 30, 170); g.fillStyle = "#111"; g.font = "800 30px M"; g.fillText("sam@bakery.com", 90, 170); g.fillStyle = "#555"; g.font = "600 28px M"; g.fillText("Hi Sam! Order for", 30, 260); g.fillText("12 croissants :)", 30, 300); g.fillStyle = "#3d7bff"; g.beginPath(); g.roundRect(90, 760, 250, 90, 45); g.fill(); g.fillStyle = "#fff"; g.font = "800 40px D"; g.fillText("Send", 170, 818); }
const STX = new THREE.CanvasTexture(SCV); STX.colorSpace = THREE.SRGBColorSpace;
const SENDER = person({ sex: "f", top: 0x4fc3bd, bottom: 0x2b3a55, skin: 0xc98b62, hair: 0x2a1d16, longHair: true, shortSleeve: true, glasses: true }); SENDER.position.set(-17, 0, 6.2); SENDER.rotation.y = 0.5; TOWN.add(SENDER); const SPH = phoneOn(SENDER); SPH.scr.material = new THREE.MeshBasicMaterial({ map: STX, toneMapped: false });
const SAM = person({ sex: "m", top: 0xffffff, bottom: 0x3a4a6a, skin: 0xe0a982, hair: 0x5a3a26, shortSleeve: true, hat: 0xffffff, hatBand: 0xffffff }); SAM.position.set(13.6, 0, 11.4); SAM.rotation.y = -2.6; TOWN.add(SAM); const SAMPH = phoneOn(SAM);
const ENV = envelope(); scene.add(ENV); const SPAM = envelope(0xff6a5a, "WIN $$$ NOW!!!", "#fff"); scene.add(SPAM);
// the Orbi park (x = 300): people, phones, a locked file popping up overhead
const OB = V(300, 0, 0), PARK = new THREE.Group(); PARK.position.copy(OB); scene.add(PARK);
{ const gr = tinted(facet(new THREE.PlaneGeometry(120, 120, 14, 14).rotateX(-Math.PI / 2), 0.3), 0x8fbf5a, 0.1); PARK.add(gr); for (let i = 0; i < 18; i++) { const t = tree(3, i % 2 ? "round" : "pine"); const a = rnd() * 6.28, d = 10 + rnd() * 20; t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); PARK.add(t); } }
const PPL = Array.from({ length: 7 }, (_, i) => { const p = person({ sex: i % 2 ? "f" : "m", top: [0xf2f2f2, 0xe9c46a, 0x8ab6d6, 0xd96c4e, 0x6c9a5b, 0xb48ad6, 0x4fc3bd][i], bottom: [0x1f2d6b, 0x3a3a3a, 0xc9b38a][i % 3], shortSleeve: true, glasses: i % 3 === 1, longHair: i % 4 === 1 }); const a = (i / 7) * Math.PI * 2; p.position.set(Math.cos(a) * 3.2, 0, Math.sin(a) * 2.2); p.rotation.y = Math.atan2(-p.position.x, -p.position.z); PARK.add(p); p.phone = phoneOn(p); const f = new THREE.Group(); f.add(mesh(bbox(0.36, 0.44, 0.04, 0.04), flat(0xe9c46a))); f.add(P(mesh(bbox(0.18, 0.14, 0.06, 0.02), flat(0x3dff8c, { emissive: 0x0a5a2a, emissiveIntensity: 0.6 })), V(0, 0, 0.04))); p.add(f); f.position.y = 2.25; p.file = f; return p; });
const NOS = ["@ address", "inbox", "account"].map((t) => { const m = label(t, "#ff6a5a", 2.2, 0.55, "900 90px D"); PARK.add(m); return m; });

// ---------------------------------------------------------------- world
const curveOver = (a, b, h) => new THREE.QuadraticBezierCurve3(a, a.clone().add(b).multiplyScalar(0.5).add(V(0, h, 0)), b);
const C1 = curveOver(V(-16.6, 1.6, 6.4), V(-16, 3, 2.8), 2), C2 = curveOver(V(-16, 5, 0), V(0, 4.2, -11), 6), C3 = curveOver(V(0, 4.2, -11), V(6, 4.6, -3), 2), C4 = curveOver(V(10.4, 4.6, -3), V(14, 2.6, 6.5), 2);
function world(t) {
  pose(SENDER, { phone: 1 }); pose(SAM, { phone: t > wt("inbox", "ding") ? 1 : 0.0, walk: t * 0.8, speed: 0.15 }); SAMPH.scr.material.color.set(t > wt("inbox", "ding") ? 0x3dff8c : 0x0b0d10);
  // the envelope's trip: phone → your server → the book → the signpost → the tube → the gate → sam's box
  let p = null, rot = 0; const send = clamp((t - A("send") - 0.5) / 1.2), ask = clamp((t - wt("dns", "asks") + 0.2) / 1.5), toMx = clamp((t - A("mx") - 0.2) / 1.2), hop = clamp((t - A("hop") - 0.1) / 2.6), gate = clamp((t - A("spam") - 0.1) / 1.0), inbox = clamp((t - A("inbox") - 0.1) / 1.4);
  if (t < A("send")) p = null; else if (t < A("dns")) p = C1.getPointAt(ease(send)); else if (t < A("mx")) p = ask > 0 ? C2.getPointAt(ease(ask)) : V(-16, 5, 0); else if (t < A("hop")) p = C3.getPointAt(ease(toMx)); else if (t < A("spam")) p = null; else if (t < A("inbox")) p = V(16, 1.6, lerp(4.5, 7.0, gate)); else p = V(lerp(16, 12, ease(inbox)), lerp(1.6, 1.7, inbox) + Math.sin(inbox * Math.PI) * 1.2, lerp(7.0, 9.7, ease(inbox)));
  ENV.visible = !!p && t < A("orbi"); if (p) { ENV.position.copy(p); ENV.rotation.set(0, Math.sin(t * 2) * 0.3, Math.sin(t * 3) * 0.1); ENV.scale.setScalar(t > A("inbox") ? lerp(1, 0.55, inbox) : 1); }
  CAPS.visible = t >= A("hop") - 0.1 && t < A("spam"); CAPS.position.copy(new THREE.CatmullRomCurve3([V(-12, 4, 0), V(-6, 9, -1), V(6, 9, -1), V(12, 4, 0)]).getPointAt(ease(hop)));
  // the book glows on the bakery line, the arrow swings to point at the bakery
  ARROW.rotation.y = lerp(1.2, 0, back(clamp((t - A("mx") - 0.1) / 0.8)));
  // spam gate: the green light passes ours; the dog sniffs; the spam letter goes in the bin
  const sniff = win(t, A("spam"), A("inbox"), 0.2, 0.2); DOG.head.rotation.z = Math.sin(t * 14) * 0.08 * sniff; DOG.head.position.y = 0.95 - sniff * 0.15; DOG.tail.rotation.x = Math.sin(t * 12) * 0.5;
  GLIGHT.material.color.set(t > wt("spam", "really") && t < wt("spam", "sniff") ? 0x3dff8c : t >= wt("spam", "sniff") && t < A("inbox") ? 0xff5a4a : 0x3dff8c);
  const sk = clamp((t - wt("spam", "spam") + 0.2) / 1.2); SPAM.visible = t >= wt("spam", "sniff") - 0.4 && sk < 1 && t < A("inbox"); SPAM.position.set(lerp(15.2, 19.6, ease(sk)), 1.6 + Math.sin(sk * Math.PI) * 1.5 - sk * 0.9, lerp(6.0, 7.5, sk)); SPAM.rotation.z = sk * 5;
  DOORS.forEach((d, i) => (d.rotation.y = i === 6 ? -lerp(0, 1.8, clamp((t - A("inbox")) / 0.4)) * (1 - clamp((t - wt("inbox", "ding")) / 0.3)) : 0));
  // Orbi: no address, no inbox, no account — crossed out; files pop over the people
  PPL.forEach((q, i) => { pose(q, { phone: 1, walk: t * 0.7 + i, speed: 0.1 }); const k = clamp((t - wt("orbi", "pops") - i * 0.1) / 0.4); q.file.visible = k > 0; q.file.scale.setScalar(back(k) || 0.001); q.file.rotation.y = t * 1.5 + i; q.phone.scr.material.color.set(k > 0 ? 0x3dff8c : 0x0b0d10); });
  NOS.forEach((m, i) => { const a = wt("orbi", ["address", "inbox", "account"][i]); m.visible = t > a - 0.1 && t < wt("orbi", "pops"); m.position.set(-1.5 + i * 1.5, 3.4 - (i % 2) * 0.5, 1); m.scale.setScalar((back(clamp((t - a) / 0.3)) || 0.001) * 0.95); m.lookAt(cam.position); });
}
// ---------------------------------------------------------------- shots
const SH = [], shot = (at, dur, p0, t0, f0, p1, t1, f1, shake) => SH.push({ at, dur, from: { p: p0, t: t0, fov: f0 }, to: { p: p1 ?? p0, t: t1 ?? t0, fov: f1 ?? f0 }, shake });
const ob = (x, y, z) => V(OB.x + x, OB.y + y, OB.z + z);
shot(0, 2.6, V(0, 34, 46), V(0, 2, -2), 46, V(0, 22, 32), V(0, 2, -2), 46);
shot(wt("hook", "out") - 0.1, 2.0, V(10, 8, 26), V(0, 3, -4), 48, V(6, 6, 22), V(0, 3, -5), 48);
SH.push({ at: A("send"), dur: 1.6, track: SPH, d0: 0.8, d1: 0.4, side: 0.2, lift: 0.25, fov: 38 });
shot(wt("send", "your", 0) - 0.1, 2.2, V(-12, 3, 16), V(-16, 2.6, 3), 46, V(-13, 4, 14), V(-16, 3.2, 2), 44);
shot(A("dns"), 2.0, V(-10, 9, 12), V(-8, 5, -6), 50, V(-6, 10, 8), V(-3, 5, -8), 48);
shot(wt("dns", "phone") - 0.1, 2.4, V(5, 9, -3), V(0, 3, -12), 46, V(4, 8.5, -4), V(-0.8, 3, -12), 44);
shot(wt("dns", "who") - 0.1, 2.2, V(-1.8, 6, -7), V(-1.7, 3, -12), 40, V(-1.8, 5.5, -8), V(-1.7, 3, -12), 38);
shot(A("mx"), 2.2, V(8, 5, 8), V(7, 3.4, -3), 46, V(6, 4.6, 6), V(8, 3.4, -3), 44);
shot(wt("mx", "address") - 0.1, 2.0, V(14, 7, 18), V(12, 3, 0), 48, V(12, 6, 16), V(14, 3.4, 0), 46);
shot(A("hop"), 3.0, V(-6, 13, 14), V(-4, 8, -1), 50, V(6, 13, 14), V(6, 8, -1), 50);
shot(wt("hop", "encrypted") - 0.4, 1.6, V(5, 10, 4), V(6, 8.8, -1), 42, V(7, 10, 3.5), V(8, 8, -1), 40);
shot(A("spam"), 1.8, V(12, 3, 16), V(16, 1.8, 6.5), 46, V(13, 2.6, 14), V(16, 1.8, 6.5), 44);
shot(wt("spam", "sniff") - 0.2, 2.0, V(14.2, 1.4, 11.2), V(15.6, 1.0, 7.8), 44, V(14.6, 1.2, 10.6), V(15.6, 0.9, 7.8), 42);
shot(wt("spam", "spam") - 0.2, 1.6, V(19, 3, 14), V(18.5, 1.2, 7.5), 46, V(19.4, 2.6, 13), V(19.4, 1.0, 7.5), 44);
shot(A("inbox"), 2.0, V(14, 3.2, 17), V(13, 1.8, 8.6), 44, V(13.4, 2.8, 15.5), V(12.3, 1.8, 9.4), 42);
SH.push({ at: wt("inbox", "ding") - 0.15, dur: 1.4, track: SAMPH, d0: 0.9, d1: 0.45, side: 0.3, lift: 0.3, fov: 38 });
shot(A("orbi"), 2.4, ob(0, 6, 13), ob(0, 2.6, 0), 48, ob(0, 5, 11), ob(0, 2.6, 0), 48);
shot(wt("orbi", "pops") - 0.1, 2.6, ob(4, 3.4, 8), ob(0, 1.8, 0), 46, ob(2, 3.8, 9), ob(0, 2, 0), 46);
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
  tag("tA", `to: <b>sam</b>@<b>bakery.com</b>`, t, A("send") + 0.2, A("dns") - 0.05);
  tag("tA", `DNS · <b>who handles bakery.com?</b>`, t, wt("dns", "dns"), A("mx") - 0.05);
  tag("tA", `MX record → <b>the bakery's mail server</b>`, t, A("mx") + 0.2, A("hop") - 0.05);
  tag("tA", `server → server · <b>usually encrypted</b>`, t, wt("hop", "encrypted") - 0.3, A("spam") - 0.05);
  tag("tA", `really from you? <b>✓</b> · spam? <i>sniff</i>`, t, A("spam") + 0.2, A("inbox") - 0.05);
  big("DING!", t, wt("inbox", "ding"), A("orbi") - 0.05, "#3dff8c", 300, 150);
  tag("tA", `no address · no inbox · <b>no account</b>`, t, wt("orbi", "address"), wt("orbi", "pops") - 0.05);
  tag("tA", `pops up nearby · <b>locked</b>`, t, wt("orbi", "pops"), A("end") - 0.05);
  let sub = ""; for (const ln of LINES.lines) { if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue; const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0); let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; }); let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i; const ch = []; let c = []; words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!:]$/.test(w)) { ch.push(c); c = []; } }); if (c.length) ch.push(c); sub = ch.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" "); }
  $("sub").textContent = sub; S($("sub"), { opacity: t > A("end") - 0.1 ? 0 : 1 });
  const e = clamp((t - A("end") + 0.1) / 0.45); S($("endc"), { opacity: e }); document.querySelector("#endc .em").style.transform = `rotate(${(t - A("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
  S($("fade"), { opacity: Math.max(1 - clamp(t / 0.3), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
}
window.render = async function (t) { world(t); camera(t); world(t); overlays(t); comp.render(); };
await document.fonts.ready;
window.ready = true;
