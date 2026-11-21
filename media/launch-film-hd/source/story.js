// Orbi Transfer — the launch film (HD, portrait 9:16 and landscape 16:9 from one story: ?ar=land).
// Structure like a paper: the problem (visible + hidden), what people want, then the solution feature by feature, results.
// Real office (Poly Haven CC0 desk, chair, lamp, plant, notebooks), real people (BodyParts3D, CC BY 4.0), monitors whose
// screens show REAL orbitransfer.com captures (shots/: anonymous space flow, workspace tasks, QR, Nearby, Wi-Fi, offline).
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { loadAnatomy, standardLayers } from "./kit/anatomy.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { makePhone, makeLock, makeEmbers, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, S2 = (el, o) => Object.assign(el.style, o), TAU = Math.PI * 2, LAND = H.land, W = H.W, HH = H.HH;
const gl = new GLTFLoader(), gltf = (u) => new Promise((ok, no) => gl.load(u, ok, undefined, no));
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
// a portrait layout point → this frame (landscape keeps the same relative place, a little tighter to the middle)
const PX = (x, y) => (LAND ? [W / 2 + (x - 540) * 1.25, 120 + (y / 1920) * 840] : [x, y]);
const cl = (id, t, a, b, anchor, x, y) => { const [px, py] = PX(x, y); callout(id, t, a, b, anchor, px, py); };
H.floor.visible = false;

// ---------- the room ----------
const ROOM = new THREE.Group(); scene.add(ROOM);
const cf = (n, srgb, rx, ry) => tex(`kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_${n}_1k.jpg`, srgb, rx, ry);
{ const floor = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshPhysicalMaterial({ color: 0xb8b2a8, map: cf("diff", true, 5, 4), normalMap: cf("nor_gl", false, 5, 4), roughnessMap: cf("rough", false, 5, 4), roughness: 0.6, clearcoat: 0.25 })), false, true); floor.rotation.x = -Math.PI / 2; ROOM.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.9, map: H.canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#8d8f90"; g.fillRect(0, 0, w, h); H.reseed(2); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${H.rnd() > 0.5 ? 255 : 0},${H.rnd() > 0.5 ? 255 : 0},${H.rnd() > 0.5 ? 255 : 0},0.025)`; g.fillRect(H.rnd() * w, H.rnd() * h, 3, 3); } }) });
  const back = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 4), wallM), false, true); back.position.set(0, 2, -1.6); ROOM.add(back);
  // a big window strip with night-city bokeh behind the desks
  const city = H.canvasTex(1024, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0b1424"); gr.addColorStop(1, "#1c2433"); g.fillStyle = gr; g.fillRect(0, 0, w, h); H.reseed(9);
    for (let i = 0; i < 260; i++) { const x = H.rnd() * w, y = h * 0.35 + H.rnd() * h * 0.65, r = 2 + H.rnd() * 9; const c = ["255,190,120", "255,230,180", "140,190,255", "255,120,90"][Math.floor(H.rnd() * 4)]; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${c},0.9)`); rg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); } });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.5), new THREE.MeshBasicMaterial({ map: city, toneMapped: false, color: 0x9a9a9a })); win.position.set(0, 1.85, -1.59); ROOM.add(win);
  for (let i = 0; i <= 6; i++) { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.06), metal(0x1d1f22, 0.4))); m.position.set(-3.1 + i * 1.033, 1.85, -1.56); ROOM.add(m); }
  for (const y of [1.08, 2.62]) { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.06, 0.08), metal(0x1d1f22, 0.4))); m.position.set(0, y, -1.56); ROOM.add(m); } }
const fit = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return o; };
const [deskG, chairG, plantG, lampG, padsG, binderG, ceilG] = await Promise.all(["metal_office_desk", "modern_arm_chair_01", "potted_plant_04", "desk_lamp_arm_01", "office_notepads", "binder_notebook", "modern_ceiling_lamp_01"].map((a) => gltf(`kit/ph/${a}/${a}_1k.gltf`)));
// two desks side by side: A (you, left) and B (the receiver, right); people sit on +z facing −z
const DESK = { A: V(-1.15, 0, 0), B: V(1.15, 0, 0) };
const DH = 0.79;
const deskA = fit(deskG.scene); deskA.scale.set(0.62, 1, 0.85); deskA.position.copy(DESK.A); ROOM.add(deskA);
const deskB = fit(deskG.scene.clone()); deskB.scale.set(0.62, 1, 0.85); deskB.position.copy(DESK.B); ROOM.add(deskB);
const chairA = fit(chairG.scene); chairA.position.copy(DESK.A).add(V(0, 0, 0.78)); chairA.rotation.y = Math.PI; chairA.scale.setScalar(0.92); ROOM.add(chairA);
const chairB = fit(chairG.scene.clone()); chairB.position.copy(DESK.B).add(V(0, 0, 0.78)); chairB.rotation.y = Math.PI; chairB.scale.setScalar(0.92); ROOM.add(chairB);
{ const p = fit(plantG.scene); p.scale.setScalar(1.6); p.position.copy(DESK.A).add(V(-0.5, DH, -0.22)); ROOM.add(p);
  const l = fit(lampG.scene); l.scale.setScalar(0.85); l.position.copy(DESK.B).add(V(0.48, DH + 0.07, -0.25)); l.rotation.y = -0.6; ROOM.add(l);
  const n = fit(padsG.scene); n.position.copy(DESK.A).add(V(0.42, DH, 0.12)); n.rotation.y = 0.3; ROOM.add(n);
  const b = fit(binderG.scene); b.position.copy(DESK.B).add(V(-0.45, DH, 0.05)); b.rotation.y = -0.2; ROOM.add(b);
  for (const x of [-1.2, 1.2]) { const c = fit(ceilG.scene.clone()); c.position.set(x, 2.6, -0.1); ROOM.add(c); const pl = new THREE.PointLight(0xffe2c0, 9, 7, 1.6); pl.position.set(x, 2.3, 0); ROOM.add(pl); } }
// a monitor: thin bezel, glass, curved back, neck + foot; its screen is a canvas (1440×900) the film draws captures into
function monitor() {
  const g = new THREE.Group(), t = H.canvasTex(1440, 900, () => {});
  const shell = metal(0x26282c, 0.35);
  const body = sh(new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.4, 0.022, 4, 0.01), shell)); body.position.y = 0.43; g.add(body);
  const backB = sh(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.26, 0.05, 4, 0.03), shell)); backB.position.set(0, 0.42, -0.03); g.add(backB);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.615, 0.384), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: 0xb4b4b4 })); scr.position.set(0, 0.43, 0.0115); g.add(scr);
  const gls = new THREE.Mesh(new THREE.PlaneGeometry(0.615, 0.384), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.1, roughness: 0.04, clearcoat: 1 })); gls.position.set(0, 0.43, 0.0121); g.add(gls);
  const neck = sh(new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.3, 0.02, 2, 0.008), metal(0xb8bcc0, 0.25))); neck.position.set(0, 0.17, -0.06); neck.rotation.x = -0.12; g.add(neck);
  const foot = sh(new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.012, 0.17, 3, 0.005), metal(0xb8bcc0, 0.25))); foot.position.set(0, 0.006, -0.04); g.add(foot);
  const light = new THREE.RectAreaLight ? null : null;
  return { g, tex: t, ctx: t.userData.g, last: "", scr };
}
const MA = monitor(), MB = monitor(); MA.g.position.copy(DESK.A).add(V(0, DH, -0.2)); MB.g.position.copy(DESK.B).add(V(0, DH, -0.2)); ROOM.add(MA.g, MB.g);
const scrW = (M, u, v) => M.g.localToWorld(V((u - 0.5) * 0.615, 0.43 + (0.5 - v) * 0.384, 0.013)); // a point on a screen (u,v in 0..1)
for (const D of [DESK.A, DESK.B]) { // keyboard (key-cap texture) + mouse
  const keys = H.canvasTex(512, 160, (g, w, h) => { g.fillStyle = "#1a1b1e"; g.fillRect(0, 0, w, h); for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) { g.fillStyle = "#2c2e33"; rr(g, 8 + c * 33, 8 + r * 30, 29, 25, 5); g.fill(); } g.fillStyle = "#2c2e33"; rr(g, 120, 128, 250, 25, 5); g.fill(); });
  const kb = sh(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.018, 0.13, 3, 0.006), new THREE.MeshStandardMaterial({ map: keys, roughness: 0.6 }))); kb.position.copy(D).add(V(0, DH + 0.009, 0.12)); ROOM.add(kb);
  const ms = sh(new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), paint(0x1d1f22, 0.4))); ms.scale.set(1, 0.45, 1.6); ms.position.copy(D).add(V(0.3, DH + 0.012, 0.14)); ROOM.add(ms); }
const screenLA = new THREE.PointLight(0x9fc8ff, 0.6, 2.5, 2), screenLB = new THREE.PointLight(0x9fc8ff, 0.6, 2.5, 2); screenLA.position.copy(DESK.A).add(V(0, DH + 0.45, 0.2)); screenLB.position.copy(DESK.B).add(V(0, DH + 0.45, 0.2)); ROOM.add(screenLA, screenLB);

// ---------- people: you (desk A) and the receiver (desk B); the anonymous one wears a mask + hood ----------
const A = standardLayers(await loadAnatomy()); scene.add(A.root);
A.mat.shirt.color.set(0x2e3540); A.mat.shorts.color.set(0x23262b); A.mat.shoes.color.set(0xe6e4de);
const B2 = A.root.clone(); scene.add(B2); // a second seated person (same pose)
const SIT = { hipL: [-88, 0, 4], hipR: [-88, 0, -4], knL: [86, 0, 0], knR: [86, 0, 0], shL: [-16, 0, 7], shR: [-16, 0, -7], elL: [-82, 0, 0], elR: [-82, 0, 0], head: [8, 0, 0], chest: [4, 0, 0] };
const seat = (root, D) => { root.position.copy(D).add(V(0, -0.36, 0.86)); root.rotation.set(0, Math.PI, 0); };
// mask: the scanned head (Lee Perry-Smith), porcelain white, over the face; a dark hood
const headG = await gltf("kit/models/head/LeePerrySmith.glb"); const MASK = headG.scene.children[0] || headG.scene;
MASK.material = new THREE.MeshPhysicalMaterial({ color: 0xbdb9b1, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3 }); scene.add(MASK); MASK.visible = false;
{ { const g = MASK.geometry.index ? MASK.geometry.toNonIndexed() : MASK.geometry; g.computeBoundingBox(); const bb = g.boundingBox, cut = bb.min.y + (bb.max.y - bb.min.y) * 0.3, back = bb.min.z + (bb.max.z - bb.min.z) * 0.45; const P = g.attributes.position, keep = [];
    for (let i = 0; i < P.count; i += 3) { let ok = true; for (let j = 0; j < 3; j++) if (P.getY(i + j) < cut || P.getZ(i + j) < back) ok = false; if (ok) keep.push(i); }
    const ng = new THREE.BufferGeometry(); for (const name of Object.keys(g.attributes)) { const A0 = g.attributes[name], n = A0.itemSize, arr = new Float32Array(keep.length * 3 * n); keep.forEach((i, k) => { for (let j = 0; j < 3; j++) for (let c = 0; c < n; c++) arr[(k * 3 + j) * n + c] = A0.array[(i + j) * n + c]; }); ng.setAttribute(name, new THREE.BufferAttribute(arr, n)); } MASK.geometry = ng; }
  MASK.material.side = THREE.DoubleSide; MASK.geometry.center(); MASK.position.set(0, 0, 0); MASK.rotation.set(0, 0, 0); MASK.scale.setScalar(1); MASK.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(MASK); MASK.scale.setScalar(0.215 / bb.getSize(V()).y); MASK.castShadow = true; }
const HOOD = new THREE.Mesh(new THREE.SphereGeometry(0.112, 48, 32, 0, TAU, 0, Math.PI * 0.55), new THREE.MeshPhysicalMaterial({ color: 0x15171a, roughness: 0.9, sheen: 0.6, sheenColor: new THREE.Color(0x40444a), normalMap: tex("kit/ph/denim_fabric/denim_fabric_nor_gl_1k.jpg", false, 4, 4), side: THREE.DoubleSide })); HOOD.castShadow = true; scene.add(HOOD); HOOD.visible = false;
function maskOn(root, k) { MASK.visible = HOOD.visible = k; if (!k) return; const hp = root.localToWorld(A.root.worldToLocal(A.at(V(0, 1.6, 0.02)))); const fwd = V(0, 0, 1).applyQuaternion(root.quaternion);
  MASK.position.copy(hp).addScaledVector(fwd, 0.045); MASK.quaternion.copy(root.quaternion); HOOD.position.copy(hp).addScaledVector(fwd, -0.03).add(V(0, 0.02, 0)); HOOD.quaternion.copy(root.quaternion); HOOD.rotateX(-0.75); }

// ---------- floating glass cards (the problems / what people want) ----------
function card(w, h, draw, pxw = 640) { const t = H.canvasTex(pxw, Math.round(pxw * h / w), (g, cw, ch) => draw(g, cw, ch));
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.01, 3, 0.02), [0, 1, 2, 3].map(() => new THREE.MeshPhysicalMaterial({ color: 0x0e1116, roughness: 0.2, transparent: true, opacity: 0.85 })).concat([new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true }), new THREE.MeshPhysicalMaterial({ color: 0x0e1116, roughness: 0.3, transparent: true, opacity: 0.85 })]));
  m.userData.k = 0; scene.add(m); m.visible = false; return m; }
const font = (g, s, w = 800, f = "D") => (g.font = `${w} ${s}px ${f}`);
const ui = (g, w, h, head, color = "#fff") => { g.fillStyle = "rgba(14,17,22,0.96)"; rr(g, 0, 0, w, h, 34); g.fill(); g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 4; rr(g, 2, 2, w - 4, h - 4, 32); g.stroke(); g.fillStyle = color; font(g, 40); g.fillText(head, 40, 74); };
const field = (g, x, y, w, txt, dim = true) => { g.fillStyle = "#1c2129"; rr(g, x, y, w, 70, 16); g.fill(); g.fillStyle = dim ? "#6d7682" : "#fff"; font(g, 30, 500, "M"); g.fillText(txt, x + 22, y + 46); };
const btn = (g, x, y, w, txt, bg = "#2f86f2") => { g.fillStyle = bg; rr(g, x, y, w, 70, 35); g.fill(); g.fillStyle = "#fff"; font(g, 30, 800); g.textAlign = "center"; g.fillText(txt, x + w / 2, y + 47); g.textAlign = "left"; };
const PROB = [
  card(0.46, 0.34, (g, w, h) => { ui(g, w, h, "Sign in"); field(g, 40, 120, w - 80, "email@address.com"); field(g, 40, 210, w - 80, "••••••••"); btn(g, 40, 310, w - 80, "Continue"); }),
  card(0.46, 0.3, (g, w, h) => { ui(g, w, h, "Verify your number"); for (let i = 0; i < 6; i++) { g.fillStyle = "#1c2129"; rr(g, 40 + i * 95, 130, 80, 100, 16); g.fill(); g.fillStyle = "#fff"; font(g, 54); g.fillText(i < 3 ? "482"[i] : "", 62 + i * 95, 200); } g.fillStyle = "#6d7682"; font(g, 26, 500, "M"); g.fillText("Resend code in 0:59", 40, 290); }),
  card(0.46, 0.26, (g, w, h) => { ui(g, w, h, "Install the app"); g.fillStyle = "#1c2129"; rr(g, 40, 130, w - 80, 28, 14); g.fill(); g.fillStyle = "#2f86f2"; rr(g, 40, 130, (w - 80) * 0.38, 28, 14); g.fill(); g.fillStyle = "#6d7682"; font(g, 26, 500, "M"); g.fillText("Downloading… 148 MB", 40, 210); }),
  card(0.46, 0.34, (g, w, h) => { ui(g, w, h, "Find the contact"); field(g, 40, 110, w - 80, "Search…"); for (let i = 0; i < 3; i++) { g.fillStyle = "#3a4250"; g.beginPath(); g.arc(80, 236 + i * 70, 24, 0, 7); g.fill(); g.fillStyle = "#9aa6b2"; font(g, 28, 500, "M"); g.fillText(["Alex (work)", "Alex 2", "Alex old number"][i], 120, 246 + i * 70); } }),
  card(0.46, 0.26, (g, w, h) => { ui(g, w, h, "Uploading…"); g.fillStyle = "#1c2129"; rr(g, 40, 130, w - 80, 28, 14); g.fill(); g.fillStyle = "#f2c21b"; rr(g, 40, 130, (w - 80) * 0.37, 28, 14); g.fill(); g.fillStyle = "#6d7682"; font(g, 26, 500, "M"); g.fillText("37% · 4 min left", 40, 210); }),
  card(0.46, 0.34, (g, w, h) => { ui(g, w, h, "Video compressed", "#ff9f6b"); for (let y = 0; y < 8; y++) for (let x = 0; x < 14; x++) { g.fillStyle = `hsl(${200 + (x * 9 + y * 13) % 40},30%,${30 + ((x + y) % 4) * 8}%)`; g.fillRect(40 + x * 40, 110 + y * 26, 40, 26); } g.fillStyle = "#ff9f6b"; font(g, 30, 700, "M"); g.fillText("4K → 480p", 40, 350); }),
];
const PROB2 = [
  card(0.5, 0.26, (g, w, h) => { ui(g, w, h, "Message not delivered", "#ff5a4a"); g.fillStyle = "#cfd6dd"; font(g, 28, 500, "M"); g.fillText("Attachment is over 25 MB.", 40, 150); g.fillStyle = "#6d7682"; g.fillText("video_final.mov · 1.2 GB", 40, 205); }),
  card(0.5, 0.26, (g, w, h) => { ui(g, w, h, "Photo quality reduced", "#ff9f6b"); g.fillStyle = "#cfd6dd"; font(g, 28, 500, "M"); g.fillText("12 MP → 1600 px", 40, 150); g.fillStyle = "#6d7682"; g.fillText("Sent in standard quality", 40, 205); }),
  card(0.5, 0.26, (g, w, h) => { ui(g, w, h, "No devices found", "#ff5a4a"); g.fillStyle = "#cfd6dd"; font(g, 28, 500, "M"); g.fillText("Phone → laptop: other brand", 40, 150); g.fillStyle = "#6d7682"; g.fillText("Make sure both are signed in", 40, 205); }),
];
const HIDDEN = [
  card(0.5, 0.3, (g, w, h) => { ui(g, w, h, "Shared link", "#ffd166"); g.fillStyle = "#cfd6dd"; font(g, 28, 500, "M"); g.fillText("drive.example/f/8xk2…", 40, 150); g.fillStyle = "#ff5a4a"; font(g, 34, 800); g.fillText("Still public · 3 years", 40, 230); }),
  card(0.5, 0.36, (g, w, h) => { ui(g, w, h, "IMG_2041.jpg", "#ffd166"); g.fillStyle = "#1d2a22"; rr(g, 40, 110, w - 80, 170, 18); g.fill(); g.strokeStyle = "#2c3e31"; g.lineWidth = 6; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(40, 130 + i * 30); g.lineTo(w - 40, 120 + i * 32); g.stroke(); } g.fillStyle = "#ff5a4a"; g.beginPath(); g.arc(w / 2, 175, 22, 0, 7); g.fill(); g.fillStyle = "#cfd6dd"; font(g, 26, 500, "M"); g.fillText("GPS 40.7128° N, 74.0060° W", 40, 330); }),
  card(0.5, 0.3, (g, w, h) => { ui(g, w, h, "Who opened it?", "#ffd166"); for (let i = 0; i < 4; i++) { g.fillStyle = "#3a4250"; g.beginPath(); g.arc(80 + i * 90, 170, 34, 0, 7); g.fill(); g.fillStyle = "#cfd6dd"; font(g, 40, 800); g.textAlign = "center"; g.fillText("?", 80 + i * 90, 184); g.textAlign = "left"; } g.fillStyle = "#6d7682"; font(g, 26, 500, "M"); g.fillText("Forwarded 14 times", 40, 260); }),
];
const WORKP = [
  card(0.42, 0.42, (g, w, h) => { ui(g, w, h, "Chat"); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? "#2f86f2" : "#2a313b"; rr(g, i % 2 ? 160 : 40, 110 + i * 62, 360, 48, 22); g.fill(); g.fillStyle = "#fff"; font(g, 22, 500, "M"); g.fillText(["final_v3.zip?", "which one", "the one from tue", "sent it again", "can't find it"][i], (i % 2 ? 180 : 60), 141 + i * 62); } }),
  card(0.42, 0.42, (g, w, h) => { ui(g, w, h, "Tasks"); for (let i = 0; i < 4; i++) { g.strokeStyle = "#6d7682"; g.lineWidth = 4; g.strokeRect(40, 120 + i * 70, 34, 34); g.fillStyle = "#cfd6dd"; font(g, 26, 500, "M"); g.fillText(["Logo pack", "Launch video", "Pitch deck", "Website copy"][i], 95, 147 + i * 70); g.fillStyle = "#ff9f6b"; g.fillText("?", w - 70, 147 + i * 70); } }),
  card(0.42, 0.42, (g, w, h) => { ui(g, w, h, "Files"); for (let i = 0; i < 5; i++) { g.fillStyle = "#cfd6dd"; font(g, 24, 500, "M"); g.fillText(["final.zip", "final_v2.zip", "final_REAL.zip", "final_v3 (1).zip", "use this one.zip"][i], 40, 140 + i * 56); } }),
];
const WANT = ["No account", "No app", "Any device", "Private by default", "Gone when done", "Proof it arrived"].map((s, i) =>
  card(0.4, 0.12, (g, w, h) => { g.fillStyle = "rgba(10,14,12,0.95)"; rr(g, 0, 0, w, h, h / 2); g.fill(); g.strokeStyle = green; g.lineWidth = 5; rr(g, 3, 3, w - 6, h - 6, h / 2 - 3); g.stroke(); g.fillStyle = green; g.beginPath(); g.arc(h / 2, h / 2, h * 0.3, 0, 7); g.fill(); g.fillStyle = "#0b0d10"; font(g, h * 0.36, 900, "Arial"); g.textAlign = "center"; g.fillText("✓", h / 2, h * 0.63); g.textAlign = "left"; g.fillStyle = "#fff"; font(g, h * 0.36); g.fillText(s, h * 0.95, h * 0.62); }, 800));
function showCards(list, t, t0, place, stagger = 0.35) { list.forEach((c, i) => { const k = ease(clamp((t - t0 - i * stagger) / 0.5)); c.visible = k > 0.001; if (!c.visible) return; const p = place(i, k); c.position.copy(p.pos); c.lookAt(H.cam.position); c.rotateZ(p.tilt || 0); c.scale.setScalar(lerp(0.6, 1, back(k))); c.material.forEach((m) => (m.opacity = (m.map ? 1 : 0.85) * k)); }); }
const hideCards = () => [...PROB, ...PROB2, ...HIDDEN, ...WORKP, ...WANT].forEach((c) => (c.visible = false));

// ---------- the file ball, beams, locks, embers ----------
const ballTex = (label, hue) => H.canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(90, 80, 10, 128, 128, 140); gr.addColorStop(0, `hsl(${hue},80%,78%)`); gr.addColorStop(0.6, `hsl(${hue},70%,42%)`); gr.addColorStop(1, `hsl(${hue},70%,18%)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; font(g, 64); g.textAlign = "center"; g.fillText(label, 128, 150); });
const BALL = sh(new THREE.Mesh(new THREE.SphereGeometry(0.07, 48, 32), new THREE.MeshPhysicalMaterial({ map: ballTex("MP4", 95), roughness: 0.25, clearcoat: 1 }))); scene.add(BALL); BALL.visible = false;
const NDOT = 60, DOTS = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 10, 8), glow(0x3dff8c, 3), NDOT); DOTS.frustumCulled = false; scene.add(DOTS);
function beam(a, b, t, k, arc = 0.25) { DOTS.visible = k > 0; if (!DOTS.visible) return; const m4 = new THREE.Matrix4(); for (let i = 0; i < NDOT; i++) { const u = ((i / NDOT) + t * 0.6) % 1; const p = a.clone().lerp(b, u); p.y += Math.sin(u * Math.PI) * arc; const s = k * (u < 0.05 || u > 0.95 ? 0.4 : 1); m4.makeScale(s, s, s).setPosition(p); DOTS.setMatrixAt(i, m4); } DOTS.instanceMatrix.needsUpdate = true; }
const LOCK = makeLock(); LOCK.scale.setScalar(0.25); scene.add(LOCK); LOCK.visible = false;
const EMB = makeEmbers(160); scene.add(EMB);
const RINGS = []; for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3dff8c).multiplyScalar(2), transparent: true, toneMapped: false, depthWrite: false })); r.rotation.x = -Math.PI / 2; scene.add(r); RINGS.push(r); }
const ringsAt = (c, t, k, maxR = 4) => RINGS.forEach((r, i) => { const u = ((t * 0.35 + i / RINGS.length) % 1); r.visible = k > 0; r.position.copy(c); r.scale.setScalar(0.2 + u * maxR); r.material.opacity = k * (1 - u) * 0.8; });

// ---------- the globe (Open Void is worldwide) ----------
const EARTH = new THREE.Group(); EARTH.position.set(0, 0, -400); scene.add(EARTH); EARTH.visible = false;
{ const e = new THREE.Mesh(new THREE.SphereGeometry(3, 128, 64), new THREE.MeshStandardMaterial({ map: tex("kit/models/planets/earth_atmos_2048.jpg", true), roughness: 0.8, emissive: new THREE.Color(0x0a1220) })); e.material.map.repeat.set(1, 1); EARTH.add(e); EARTH.userData.e = e;
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(3.08, 64, 32), new THREE.MeshBasicMaterial({ color: 0x4f8cff, transparent: true, opacity: 0.12, side: THREE.BackSide })); EARTH.add(atmo);
  const pins = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), glow(0x3dff8c, 3), 140); H.reseed(61); const m4 = new THREE.Matrix4();
  for (let i = 0; i < 140; i++) { const lat = (H.rnd() * 120 - 50) * Math.PI / 180, lon = H.rnd() * TAU; m4.makeTranslation(Math.cos(lat) * Math.cos(lon) * 3.03, Math.sin(lat) * 3.03, Math.cos(lat) * Math.sin(lon) * 3.03); pins.setMatrixAt(i, m4); } EARTH.add(pins); }

// ---------- phone (QR scan, offline, hotspot) ----------
const PH = makePhone(0x1d1f22); PH.g.scale.setScalar(0.09); scene.add(PH.g); PH.g.visible = false;

// ---------- screens: the real captures + live overlays ----------
const SHOT = {}; for (const k of ["d-nearby", "d-wifi", "d-share", "d-anon-card", "d-anon-create", "d-anon-space", "d-anon-find2", "d-anon-joined-A", "d-anon-joined-B", "d-anon-send-opts", "d-anon-sent-A", "d-anon-arrive-B", "d-anon-pw-B", "d-anon-done-B", "w-space", "w-tasks", "w-arranged", "w-task-detail", "d-off-got"]) SHOT[k] = await img(`shots/${k}.png`);
for (const k of ["p-object", "p-nearby", "p-off-offer", "p-off-sent"]) SHOT[k] = await img(`shots/${k}.png`);
function drawMon(g, st) { const im = SHOT[st.k]; g.fillStyle = "#000"; g.fillRect(0, 0, 1440, 900); if (im) { g.globalAlpha = /^w-|off/.test(st.k) ? 0.78 : 1; g.drawImage(im, 0, 0, 1440, 900); g.globalAlpha = 1; }
  if (st.cursor) { const [x, y] = st.cursor; g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 34); g.lineTo(x + 9, y + 26); g.lineTo(x + 16, y + 40); g.lineTo(x + 22, y + 37); g.lineTo(x + 15, y + 24); g.lineTo(x + 27, y + 24); g.closePath(); g.fill(); g.stroke(); }
  if (st.ring) { const [x, y, r, a] = st.ring; g.strokeStyle = `rgba(61,255,140,${a})`; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
  if (st.beam != null) { // the sender sees the receiver download: dots stream from the file into their ball (the Beam view)
    const x0 = 560, x1 = 860, y = 450; g.fillStyle = "rgba(0,0,0,.72)"; rr(g, 380, 280, 680, 340, 30); g.fill();
    const gr = g.createRadialGradient(x0 - 20, y - 20, 10, x0, y, 90); gr.addColorStop(0, "#c6f07a"); gr.addColorStop(0.7, "#5f9a24"); gr.addColorStop(1, "#2e4d10"); g.fillStyle = gr; g.beginPath(); g.arc(x0, y, 80, 0, 7); g.fill(); g.fillStyle = "#fff"; font(g, 42); g.textAlign = "center"; g.fillText("PDF", x0, y + 15);
    for (let i = 0; i < 9; i++) { const u = ((i / 9) + st.tt * 0.8) % 1; g.fillStyle = `rgba(61,255,140,${0.4 + 0.6 * Math.sin(u * Math.PI)})`; g.beginPath(); g.arc(x0 + 110 + u * (x1 - x0 - 160), y, 5, 0, 7); g.fill(); }
    g.fillStyle = "#15402a"; g.beginPath(); g.arc(x1, y, 40, 0, 7); g.fill(); g.strokeStyle = green; g.lineWidth = 6; g.beginPath(); g.arc(x1, y, 46, -Math.PI / 2, -Math.PI / 2 + TAU * st.beam); g.stroke(); g.fillStyle = "#fff"; font(g, 32); g.fillText("A", x1, y + 11);
    font(g, 22, 700, "M"); g.fillStyle = "#cfd6dd"; g.fillText("ANON-36B", x1, y + 82); g.fillStyle = green; font(g, 30, 800); g.fillText(`${Math.round(st.beam * 100)}%`, x1, y + 120);
    g.fillStyle = "#cfd6dd"; font(g, 24, 700, "M"); g.fillText(st.beam >= 1 ? "DOWNLOADED · 1 / 1" : "DOWNLOADING…", 720, 590); g.textAlign = "left"; }
  if (st.burn) { g.fillStyle = "rgba(0,0,0,.8)"; rr(g, 1080, 820, 330, 64, 32); g.fill(); g.fillStyle = "#ff8a3d"; font(g, 28, 700, "M"); g.fillText(st.burn, 1112, 862); } }
function drawPh(g, st) { const im = SHOT[st.k]; g.fillStyle = "#000"; g.fillRect(0, 0, 780, 1688); if (im) g.drawImage(im, 0, 0, 780, 1688);
  if (st.hot) { g.fillStyle = "rgba(0,0,0,.85)"; rr(g, 60, 40, 660, 90, 45); g.fill(); g.fillStyle = "#ffd166"; font(g, 32, 700, "M"); g.fillText("Personal hotspot · no internet", 100, 98); } }

// ---------- HUD (positions in % so they work in both formats) ----------
const hb = (top, html) => hudEl(...html, { left: "0px", top: `${top}px`, width: `${W}px` });
// landscape: HUD in the upper 120–760 band so it never meets the subtitles (top 830)
const Y = (yp) => (LAND ? Math.round(120 + yp / 1920 * 640) : yp);
H.callouts({
  lockC: ["Locked on your device", green, "AES-256-GCM"], pwC: ["Password", green, "never leaves your browser"], burnC: ["Burns", "#ff8a3d", "in 30 minutes or less"],
  wifiC: ["Same Wi-Fi", green, "appears live"], qrC: ["Its own QR code", green], codeC: ["4-letter code", green, "+ a passcode"], joinC: ["They joined", green, "you see who's inside"],
  oneC: ["Its own password", green, "+ 1 download"], dlC: ["They're downloading", green, "you watch it go"], taskC: ["Tasks", "#f08a24", "@assign anyone"], routeC: ["Route of steps", "#2f86f2", "who's doing what"], wireC: ["Files wired to tasks", "#27c463"],
  offC: ["No internet", "#ffd166", "same Wi-Fi or a hotspot"],
});
hudEl("steps", `<div style="width:${W}px;text-align:center"><div id="stepn" style="font:900 ${LAND ? 170 : 230}px/0.85 D;font-stretch:112%;color:#ff5a4a;text-shadow:0 12px 50px rgba(0,0,0,.6)">0</div><div style="font:800 ${LAND ? 38 : 46}px D;color:#fff;letter-spacing:.12em;margin-top:8px">STEPS · ONE FILE</div></div>`, { left: "0px", top: `${Y(1380)}px` });
hudEl("big20", `<div style="width:${W}px;text-align:center"><div style="font:900 ${LAND ? 150 : 200}px/0.85 D;font-stretch:112%;color:${green};text-shadow:0 12px 50px rgba(0,0,0,.6)">20 GB</div><div style="font:800 ${LAND ? 36 : 44}px D;color:#fff;letter-spacing:.1em;margin-top:8px">ORIGINAL QUALITY · FOLDERS INTACT</div></div>`, { left: "0px", top: `${Y(1380)}px` });
hudEl("modes", `<div style="width:${W}px;display:flex;justify-content:center;gap:16px">${[["WI-FI", "same network"], ["NEARBY", "your area"], ["OPEN VOID", "worldwide"], ["QR", "scan it"]].map(([a, b], i) => `<div id="md${i}" style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid rgba(61,255,140,.5);text-align:center"><div style="font:900 ${LAND ? 34 : 38}px D;color:#fff">${a}</div><div style="font:700 20px M;color:#9aa6b2;letter-spacing:.1em">${b}</div></div>`).join("")}</div>`, { left: "0px", top: `${Y(1450)}px` });
hudEl("cmp", `<div style="width:${LAND ? 1400 : 960}px;margin-left:${LAND ? 260 : 60}px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
  <div id="cmp0" style="padding:26px 30px;border-radius:26px;background:rgba(40,12,12,.85);border:1.5px solid #ff5a4a"><div style="font:700 24px M;letter-spacing:.2em;color:#ff8f8f">BEFORE</div>${["6+ steps", "an account + an app", "a compressed copy", "lives online for years", "who opened it? no idea"].map((s) => `<div style="font:800 ${LAND ? 34 : 38}px D;color:#fff;margin-top:12px">✕ ${s}</div>`).join("")}</div>
  <div id="cmp1" style="padding:26px 30px;border-radius:26px;background:rgba(10,36,20,.85);border:1.5px solid ${green}"><div style="font:700 24px M;letter-spacing:.2em;color:${green}">ORBI TRANSFER</div>${["1 step: drop it", "no account, no app", "the original file", "burns in 30 min", "you see the download"].map((s) => `<div style="font:800 ${LAND ? 34 : 38}px D;color:#fff;margin-top:12px">✓ ${s}</div>`).join("")}</div></div>`, { left: "0px", top: `${Y(LAND ? 300 : 520)}px` });
hudEl("timer", `<div id="tmr" style="width:${W}px;text-align:center;font:800 ${LAND ? 110 : 130}px M;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)">30:00</div>`, { left: "0px", top: `${Y(1440)}px` });
hudEl("paper", `<div style="width:${W}px;text-align:center;font:700 ${LAND ? 26 : 30}px M;letter-spacing:.3em;color:#9aa6b2" id="papt">1 · THE PROBLEM</div>`, { left: "0px", top: `${LAND ? 30 : 90}px` });

// ---------- helpers ----------
const Aface = (root) => root.localToWorld(A.root.worldToLocal(A.at(V(0, 1.55, 0.05))));
function look2(t, a, b, P0, T0, F0, P1, T1, F1) { move(t, a, b, [P0, T0, F0], [P1, T1, F1]); }
const OV = (D) => D.clone().add(V(0, DH + 0.42, -0.2)); // monitor centre
function dayLight() { H.envK.value = 0.7; H.key.intensity = 2.6; H.key.color.set(0xfff1e0); H.key.position.set(3, 6, 4); H.key.target.position.set(0, 0.6, 0); H.hemi.intensity = 0.6; H.rimA.intensity = 0.8; H.rimB.intensity = 0.6; H.bloom.strength = 0.3; scene.background = new THREE.Color(0x0a0c10); }
function nightLight() { H.envK.value = 0.35; H.key.intensity = 0.6; H.key.color.set(0x9fb8ff); H.hemi.intensity = 0.12; H.rimA.intensity = 1.6; H.rimA.color.set(0x3dff8c); H.rimB.intensity = 0.4; H.bloom.strength = 0.45; scene.background = new THREE.Color(0x030405); }
{ const s = H.key.shadow.camera; Object.assign(s, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = 0.02; }
const paper = (t, txt, a, b) => { hudShow("paper", win(t, a, b, 0.3, 0.3)); H.$("papt").textContent = txt; };

H.frame("Try it on two devices", async (t) => {
  // defaults
  hideCards(); BALL.visible = false; DOTS.visible = false; LOCK.visible = false; EMB.visible = false; RINGS.forEach((r) => (r.visible = false)); EARTH.visible = false; PH.g.visible = false; ROOM.visible = true;
  A.root.visible = true; B2.visible = false; maskOn(null, false); A.setPose(SIT); seat(A.root, DESK.A); seat(B2, DESK.B); dayLight(); H.zoom = 1; H.grade.uniforms.uSepia.value = 0; H.backdrop.visible = false;
  const tt = t * 1.0;
  // ---- HOOK: how many steps to send one file to the person next to you? (wide on both desks; a counter)
  if (t < at("p1")) {
    B2.visible = true; screen(MA, { k: "d-nearby" }, drawMon); screen(MB, { k: "d-nearby" }, drawMon);
    { const F = Aface(A.root); move(t, 0, at("p1"), [F.clone().add(V(1.5, 0.25, 1.7)), F.clone().add(V(0.4, -0.15, -0.4)), 42], [F.clone().add(V(1.1, 0.15, 1.3)), F.clone().add(V(0.3, -0.12, -0.4)), 40]); }
    title(t, 0.3, end("hook"), "A question", "How many steps?");
  }
  // ---- P1: the steps pile up around you (sign in, verify, install, find, upload, compressed) + counter
  else if (t < at("p2")) {
    paper(t, "1 · THE PROBLEM", at("p1"), at("q"));
    screen(MA, { k: "d-nearby" }, drawMon); const C = Aface(A.root).add(V(0, 0.1, 0));
    move(t, at("p1"), at("p2"), [C.clone().add(V(1.6, 0.3, 2.4)), C.clone().add(V(-0.3, 0, -0.4)), 44], [C.clone().add(V(1.1, 0.2, 1.8)), C.clone().add(V(-0.3, 0, -0.4)), 42]);
    showCards(PROB, t, at("p1") + 0.1, (i, k) => ({ pos: C.clone().add(V((i % 3 - 1) * 0.55 - 0.3, 0.42 - Math.floor(i / 3) * 0.42, -0.5 - (i % 2) * 0.1)), tilt: (i % 2 ? 0.04 : -0.05) }), (end("p1") - at("p1") - 0.6) / 6);
    hudShow("steps", win(t, at("p1") + 0.2, end("p1") + 0.3)); H.$("stepn").textContent = String(Math.min(6, Math.floor((t - at("p1")) / ((end("p1") - at("p1")) / 6)) + 1));
  }
  // ---- P2: email bounces, chat apps shrink, brand lock-in
  else if (t < at("p3")) {
    paper(t, "1 · THE PROBLEM", at("p1"), at("q")); screen(MA, { k: "d-nearby" }, drawMon); B2.visible = true;
    const C = DESK.A.clone().lerp(DESK.B, 0.5).add(V(0, 1.25, 0.3));
    move(t, at("p2"), at("p3"), [C.clone().add(V(0, 0.4, 3.2)), C, 40], [C.clone().add(V(0.4, 0.3, 2.6)), C, 38]);
    showCards(PROB2, t, at("p2") + 0.1, (i, k) => ({ pos: C.clone().add(LAND ? V((i - 1) * 0.62, 0.1 + (i % 2) * 0.12, 0) : V(0, 0.5 - i * 0.36, 0)), tilt: 0 }), (end("p2") - at("p2") - 0.6) / 3);
  }
  // ---- P3: the hidden problems: links that live forever, GPS inside photos, who opened it?
  else if (t < at("p4")) {
    paper(t, "1b · THE HIDDEN PROBLEMS", at("p3"), at("q")); nightLight(); screen(MA, { k: "d-nearby" }, drawMon);
    const C = Aface(A.root).add(V(0, 0.15, -0.4));
    move(t, at("p3"), at("p4"), [C.clone().add(V(-1.2, 0.2, 2.4)), C, 42], [C.clone().add(V(-0.8, 0.1, 1.9)), C, 40]);
    showCards(HIDDEN, t, fr("p3", 0.18), (i, k) => ({ pos: C.clone().add(LAND ? V((i - 1) * 0.62, 0.05, 0) : V(0, 0.45 - i * 0.42, 0)), tilt: (i - 1) * 0.04 }), (end("p3") - fr("p3", 0.18)) / 3.2);
  }
  // ---- P4: work: files in one app, tasks in another, nobody knows what's done
  else if (t < at("q")) {
    paper(t, "1c · AT WORK", at("p4"), at("q")); B2.visible = true; screen(MA, { k: "d-nearby" }, drawMon); screen(MB, { k: "d-nearby" }, drawMon);
    const C = DESK.A.clone().lerp(DESK.B, 0.5).add(V(0, 1.45, 0));
    move(t, at("p4"), at("q"), [C.clone().add(V(0, 0.6, 3.6)), C, 42], [C.clone().add(V(0, 0.4, 3.0)), C, 40]);
    showCards(WORKP, t, at("p4") + 0.2, (i, k) => ({ pos: C.clone().add(V((i - 1) * (LAND ? 0.55 : 0.36), (i === 1 ? 0.1 : -0.05) + (LAND ? 0 : (i - 1) * -0.25), (i === 1 ? -0.1 : 0))), tilt: (i - 1) * 0.08 }), 0.45);
  }
  // ---- Q: what people actually want: six chips around you
  else if (t < at("s1")) {
    paper(t, "2 · WHAT PEOPLE WANT", at("q"), at("s1"));
    const C = Aface(A.root).add(V(0, 0.05, 0));
    move(t, at("q"), at("s1"), [C.clone().add(V(0.6, 0.4, 2.6)), C.clone().add(V(0, 0.05, 0)), 42], [C.clone().add(V(0.4, 0.3, 2.0)), C.clone().add(V(0, 0.05, 0)), 40]);
    showCards(WANT, t, fr("q", 0.12), (i, k) => { const a = (i / 6) * TAU + (t - at("q")) * 0.12; return { pos: C.clone().add(V(Math.cos(a) * (LAND ? 0.75 : 0.42), Math.sin(a) * (LAND ? 0.32 : 0.5), 0.15)) }; }, (end("q") - fr("q", 0.12)) / 6.5);
  }
  // ---- S1: that's Orbi: open it in any browser, drop a file → the ball flies from your screen to theirs
  else if (t < at("s2")) {
    paper(t, "3 · THE SOLUTION · ORBI TRANSFER", at("s1"), fr("s1", 0.5)); B2.visible = true; screen(MA, { k: "d-share" }, drawMon); screen(MB, { k: "d-nearby" }, drawMon);
    const k = ease(prog(t, fr("s1", 0.55), fr("s1", 0.95))); const a = scrW(MA, 0.5, 0.5).add(V(0, 0, 0.06)), b = scrW(MB, 0.5, 0.5).add(V(0, 0, 0.06));
    BALL.visible = t > fr("s1", 0.5); BALL.position.copy(a.clone().lerp(b, k)); BALL.position.y += Math.sin(k * Math.PI) * 0.35; BALL.rotation.y = t * 2;
    beam(a, BALL.position, t, t > fr("s1", 0.5) ? 1 : 0, 0.1);
    const C = DESK.A.clone().lerp(DESK.B, 0.5).add(V(0, 1.25, -0.1));
    move(t, at("s1"), at("s2"), [C.clone().add(V(0, 0.7, 3.6)), C, 40], [C.clone().add(V(0, 0.45, 2.8)), C, 38]);
    title(t, at("s1") + 0.1, fr("s1", 0.5), "No account · no app", "Orbi Transfer");
  }
  // ---- S2: locked on your device (AES-256), password stays in the browser, burns in ≤30 min
  else if (t < at("s3")) {
    screen(MA, { k: "d-anon-send-opts" }, drawMon);
    const P = scrW(MA, 0.5, 0.5).add(V(0, 0.02, 0.18)); BALL.visible = true; BALL.position.copy(P); BALL.rotation.y = t * 1.5;
    const lk = ease(prog(t, fr("s2", 0.05), fr("s2", 0.25))); LOCK.visible = lk > 0; LOCK.position.copy(P).add(V(0, 0.1 * (1 - lk) + 0.0, 0.06)); LOCK.scale.setScalar(0.18 * lerp(1.4, 1, lk));
    const bk = prog(t, fr("s2", 0.72), end("s2")); EMB.userData.burn(bk > 0 ? Math.sin(bk * Math.PI) : 0, t, (x, y) => P.clone().add(V(x * 0.12, y * 0.12, 0))); BALL.scale.setScalar(Math.max(0.001, 1 - ease(clamp((bk - 0.4) / 0.6))));
    move(t, at("s2"), at("s3"), [P.clone().add(V(0.35, 0.12, 0.85)), P, 38], [P.clone().add(V(0.22, 0.08, 0.62)), P, 36]);
    cl("lockC", t, fr("s2", 0.12), fr("s2", 0.45), P, 790, 520); cl("pwC", t, fr("s2", 0.42), fr("s2", 0.7), scrW(MA, 0.78, 0.38), 300, 520); cl("burnC", t, fr("s2", 0.72), end("s2"), P, 790, 1050);
    hudShow("timer", win(t, fr("s2", 0.7), end("s2"))); const left = Math.round(1800 * (1 - ease(prog(t, fr("s2", 0.72), end("s2") - 0.2)))); H.$("tmr").textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  }
  // ---- S3: up to 20 GB, original quality, folders intact
  else if (t < at("s4")) {
    screen(MA, { k: "d-share" }, drawMon); const P = scrW(MA, 0.5, 0.5).add(V(0, 0.05, 0.2)); BALL.visible = true; BALL.scale.setScalar(lerp(1, 1.5, ease(prog(t, at("s3"), fr("s3", 0.4))))); BALL.position.copy(P); BALL.rotation.y = t;
    BALL.material.map = BALL.material.map; move(t, at("s3"), at("s4"), [P.clone().add(V(-0.4, 0.15, 1.1)), P, 40], [P.clone().add(V(-0.25, 0.1, 0.85)), P, 38]);
    hudShow("big20", win(t, at("s3") + 0.2, end("s3") + 0.2), { transform: `scale(${lerp(1.2, 1, out(prog(t, at("s3") + 0.2, at("s3") + 0.6)))})` });
  }
  // ---- S4: Wi-Fi rings, Nearby, Open Void (globe), QR
  else if (t < at("a1")) {
    const t1 = fr("s4", 0.3), t2 = fr("s4", 0.55), t3 = fr("s4", 0.78);
    hudShow("modes", win(t, at("s4") + 0.2, end("s4") + 0.2)); for (let i = 0; i < 4; i++) S2(H.$("md" + i), { opacity: win(t, at("s4") + [0.2, t1 - at("s4"), t2 - at("s4"), t3 - at("s4")][i], 999), borderColor: (t >= [at("s4"), t1, t2, t3][i] && t < [t1, t2, t3, 999][i]) ? green : "rgba(61,255,140,.25)" });
    if (t < t2) { B2.visible = true; screen(MA, { k: t < t1 ? "d-wifi" : "d-nearby" }, drawMon); screen(MB, { k: t < t1 ? "d-wifi" : "d-nearby" }, drawMon);
      const C = V(0, 0.8, 0.3); ringsAt(C.clone().setY(0.02), t, 1, t < t1 ? 3.5 : 6); move(t, at("s4"), t2, [V(0, 6.5, 2.4), C, 48], [V(0, 7.5, 1.8), C, 52]); cl("wifiC", t, at("s4") + 0.3, t1, C, 790, 520); }
    else if (t < t3) { ROOM.visible = false; A.root.visible = false; EARTH.visible = true; scene.background = new THREE.Color(0x000000); EARTH.rotation.y = t * 0.15; move(t, t2, t3, [EARTH.position.clone().add(V(0, 1.5, 10)), EARTH.position, 40], [EARTH.position.clone().add(V(0, 0.8, 8.5)), EARTH.position, 40]); }
    else { screen(MA, { k: "d-share" }, drawMon); PH.g.visible = true; const S = scrW(MA, 0.78, 0.65); PH.g.position.copy(S).add(V(-0.05, 0.02, 0.3)); PH.g.lookAt(S); PH.g.rotateY(Math.PI); screen(PH, { k: "p-object" }, drawPh);
      move(t, t3, at("a1"), [S.clone().add(V(-0.45, 0.15, 0.75)), S.clone().add(V(0, 0, 0.12)), 38], [S.clone().add(V(-0.3, 0.1, 0.6)), S.clone().add(V(0, 0, 0.14)), 36]); cl("qrC", t, t3 + 0.2, end("s4"), scrW(MA, 0.79, 0.64), 790, 520); }
  }
  // ---- A1: go anonymous: masked, no name; create a space: 4-letter code + passcode
  else if (t < at("a2")) {
    paper(t, "4 · ANONYMOUS MODE", at("a1"), fr("a1", 0.4)); nightLight(); A.root.visible = false; B2.visible = true; maskOn(B2, true);
    const tA = fr("a1", 0.5); screen(MB, { k: t < tA ? "d-anon-card" : "d-anon-space" }, drawMon); screenLB.intensity = 1.2;
    const F = Aface(B2);
    if (t < tA) move(t, at("a1"), tA, [F.clone().add(V(0.75, 0.05, -0.55)), F.clone().add(V(0, -0.02, 0)), 36], [F.clone().add(V(0.55, 0.02, -0.42)), F.clone().add(V(0, -0.02, 0)), 34]);
    else move(t, tA, at("a2"), [F.clone().add(V(-0.25, 0.08, 0.35)), OV(DESK.B), 40], [F.clone().add(V(-0.15, 0.04, 0.22)), OV(DESK.B), 38]);
    cl("codeC", t, fr("a1", 0.62), end("a1"), scrW(MB, 0.5, 0.56), 790, 1050);
  }
  // ---- A2: the receiver joins; the sender sees them appear in the space
  else if (t < at("a3")) {
    nightLight(); B2.visible = true; maskOn(B2, true); const tJ = fr("a2", 0.35);
    screen(MA, { k: "d-anon-find2" }, drawMon); screen(MB, { k: t < tJ ? "d-anon-space" : "d-anon-joined-A", ring: t > tJ ? [1355, 85, 34 + 10 * Math.sin(t * 6), 0.9] : null }, drawMon);
    const C = DESK.A.clone().lerp(DESK.B, 0.5).add(V(0, 1.25, -0.1));
    if (t < tJ) { const F = Aface(B2); move(t, at("a2"), tJ, [F.clone().add(V(-0.7, 0.25, 0.9)), OV(DESK.B).add(V(0.1, -0.1, 0)), 40], [F.clone().add(V(-0.55, 0.2, 0.7)), OV(DESK.B).add(V(0.1, -0.1, 0)), 38]); }
    else move(t, tJ, at("a3"), [OV(DESK.B).add(V(0.25, 0.1, 0.6)), scrW(MB, 0.85, 0.12), 34], [OV(DESK.B).add(V(0.2, 0.06, 0.45)), scrW(MB, 0.9, 0.1), 32]);
    cl("joinC", t, tJ + 0.3, end("a2"), scrW(MB, 0.94, 0.09), 300, 1050);
  }
  // ---- A3: its own password + one download; the sender watches it go (Beam); 1/1 → burns
  else if (t < at("w1")) {
    nightLight(); B2.visible = true; maskOn(B2, true); const tS = fr("a3", 0.3), tD = fr("a3", 0.45), tE = fr("a3", 0.85);
    const pct = clamp((t - tD) / (tE - tD - 0.6));
    screen(MB, t < tS ? { k: "d-anon-send-opts" } : { k: "d-anon-sent-A", beam: t > tD ? pct : null, tt: t }, drawMon);
    screen(MA, { k: t < tD ? "d-anon-arrive-B" : t < tE ? "d-anon-pw-B" : "d-anon-done-B" }, drawMon);
    const a = scrW(MB, 0.5, 0.5).add(V(0, 0, 0.05)), b = scrW(MA, 0.5, 0.5).add(V(0, 0, 0.05));
    beam(a, b, t, t > tD && pct < 1 ? 1 : 0, 0.25);
    const C = DESK.A.clone().lerp(DESK.B, 0.5).add(V(0, 1.2, -0.1));
    if (t < tS) move(t, at("a3"), tS, [OV(DESK.B).add(V(0.1, 0.05, 0.6)), scrW(MB, 0.75, 0.4), 34], [OV(DESK.B).add(V(0.08, 0.04, 0.5)), scrW(MB, 0.75, 0.42), 32]);
    else { const F = Aface(B2).add(V(-0.3, -0.1, -0.3)); move(t, tS, at("w1"), [F.clone().add(V(-0.9, 0.4, 1.6)), F, 44], [F.clone().add(V(-0.7, 0.3, 1.3)), F, 42]); }
    cl("oneC", t, at("a3") + 0.2, tS, scrW(MB, 0.78, 0.6), 790, 1050); cl("dlC", t, tD + 0.3, tE, a, 790, 470);
    const bk = prog(t, tE, end("a3")); EMB.userData.burn(bk > 0 ? Math.sin(bk * Math.PI) : 0, t, (x, y) => b.clone().add(V(x * 0.4, y * 0.25, 0)));
  }
  // ---- W1: work mode: private space, tasks, @assign
  else if (t < at("w2")) {
    paper(t, "5 · WORKSPACE MODE", at("w1"), fr("w1", 0.4)); B2.visible = true; screen(MA, { k: "w-tasks" }, drawMon); screen(MB, { k: "w-task-detail" }, drawMon);
    const P = scrW(MA, 0.2, 0.62); move(t, at("w1"), at("w2"), [OV(DESK.A).add(V(0.15, 0.08, 0.7)), P, 32], [OV(DESK.A).add(V(0.05, 0.04, 0.5)), P, 30]);
    cl("taskC", t, fr("w1", 0.4), end("w1"), scrW(MA, 0.25, 0.62), 790, 1050);
  }
  // ---- W2: routes of coloured steps, files wired to tasks; one look shows who's doing what
  else if (t < at("off")) {
    B2.visible = true; screen(MA, { k: "w-arranged" }, drawMon); screen(MB, { k: "w-tasks" }, drawMon);
    const P = scrW(MA, 0.5, 0.6); move(t, at("w2"), at("off"), [OV(DESK.A).add(V(-0.1, 0.1, 0.9)), P, 34], [OV(DESK.A).add(V(0.05, 0.05, 0.62)), P, 30]);
    cl("routeC", t, at("w2") + 0.2, fr("w2", 0.5), scrW(MA, 0.48, 0.58), 790, 470); cl("wireC", t, fr("w2", 0.45), end("w2"), scrW(MA, 0.62, 0.7), 300, 1050);
  }
  // ---- OFF: no internet: a phone hotspot, two QR codes, files straight across
  else if (t < at("r1")) {
    paper(t, "6 · OFFLINE", at("off"), fr("off", 0.4)); nightLight(); screen(MA, { k: "d-off-got" }, drawMon);
    PH.g.visible = true; const S = OV(DESK.A).add(V(0.45, -0.25, 0.25)); PH.g.position.copy(S); PH.g.rotation.set(-0.5, -0.3, 0); screen(PH, { k: t < fr("off", 0.6) ? "p-off-offer" : "p-off-sent", hot: true }, drawPh);
    ringsAt(S.clone().setY(DH + 0.01), t, 1, 1.5);
    move(t, at("off"), at("r1"), [S.clone().add(V(0.1, 0.35, 0.9)), S.clone().add(V(-0.25, 0.05, -0.1)), 40], [S.clone().add(V(0.05, 0.25, 0.7)), S.clone().add(V(-0.25, 0.08, -0.1)), 38]);
    cl("offC", t, fr("off", 0.1), end("off"), PH.g.localToWorld(V(0, 0.6, 0.05)), 790, 470);
  }
  // ---- R1: results: before / after
  else {
    paper(t, "7 · RESULTS", at("r1"), at("end")); B2.visible = true; screen(MA, { k: "d-share" }, drawMon); screen(MB, { k: "d-anon-done-B" }, drawMon);
    const C = DESK.A.clone().lerp(DESK.B, 0.5).add(V(0, 1.1, 0));
    move(t, at("r1"), at("end") + 2, [C.clone().add(V(0, 0.9, 4.2)), C, 40], [C.clone().add(V(0, 1.2, 4.8)), C, 42]);
    H.grade.uniforms.uVig.value = 0.5;
    hudShow("cmp", win(t, at("r1") + 0.2, at("end"))); S2(H.$("cmp0"), { opacity: win(t, at("r1") + 0.2, 999) }); S2(H.$("cmp1"), { opacity: win(t, fr("r1", 0.45), 999) });
  }
});
await H.ready();
