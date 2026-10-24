// Orbi films, improved version (v2): one kit for every film.
// Look: faceted low-poly people and sets (the owner's reference: Blender-style low-poly characters), real lighting
// (soft shadows, ambient occlusion, a little bloom), filmic tone mapping, camera moves with depth. Built from
// primitives only (no downloaded models), deterministic (seeded noise), rendered frame by frame in headless Chromium.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";

export { THREE };
export const W = 1080, H = 1920;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k;
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), out = (x) => 1 - Math.pow(1 - x, 3);
export const back = (x) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const win = (t, a, b, fi = 0.25, fo = 0.25) => clamp((t - a) / fi) * clamp((b - t) / fo);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 11;
export const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
export const reseed = (s) => (seed = s);

// ---------------------------------------------------------------- renderer
export function stage(canvas, { bg = 0x5a6070, fog = null, exposure = 1.0, ao = true, bloom = 0.25 } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  r.setPixelRatio(1); r.setSize(W, H, false);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = exposure; r.outputColorSpace = THREE.SRGBColorSpace;
  r.localClippingEnabled = true;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg); if (fog) scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 3000);
  const comp = new EffectComposer(r);
  comp.addPass(new RenderPass(scene, cam));
  let gtao = null;
  if (ao) { gtao = new GTAOPass(scene, cam, W, H); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 1.0; gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); comp.addPass(gtao); }
  if (bloom) comp.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), bloom, 0.5, 0.86));
  comp.addPass(new OutputPass());
  comp.addPass(new SMAAPass(W, H));
  return { r, scene, cam, comp, gtao };
}

// key (warm, soft shadows) + sky fill + cool rim: the reference's studio light
export function lights(scene, { key = 0xfff1e0, keyI = 2.6, sky = 0xdfe8ff, ground = 0x4a4038, fillI = 1.1, rim = 0x9fc4ff, rimI = 0.8, at = V(6, 14, 8), area = 14 } = {}) {
  scene.add(new THREE.HemisphereLight(sky, ground, fillI));
  const k = new THREE.DirectionalLight(key, keyI); k.position.copy(at); k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); k.shadow.radius = 4; k.shadow.bias = -0.0004; k.shadow.normalBias = 0.02;
  Object.assign(k.shadow.camera, { left: -area, right: area, top: area, bottom: -area, near: 0.5, far: 80 });
  scene.add(k, k.target);
  const rl = new THREE.DirectionalLight(rim, rimI); rl.position.set(-at.x, at.y * 0.6, -at.z); scene.add(rl);
  return { key: k, rim: rl };
}

// ---------------------------------------------------------------- faceted materials + geometry
const mats = new Map();
export const flat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0, flatShading: true, ...o })); return mats.get(k); };
export const glow = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });
/** jitter a geometry's shared vertices a little, so it reads as hand-made facets (like the reference) */
export function facet(g, amt = 0.04, keepY = false) {
  g = g.index ? g : g; const p = g.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(k)) seen.set(k, [(rnd() - 0.5) * amt, keepY ? 0 : (rnd() - 0.5) * amt, (rnd() - 0.5) * amt]);
    const d = seen.get(k); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  g.computeVertexNormals(); return g;
}
export const mesh = (g, m, { cast = true, recv = true } = {}) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = recv; return o; };
export const add = (parent, o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); parent.add(o); return o; };
/** a rounded-ish box with few facets (lathe of a rounded rectangle is overkill: a beveled box from an extrude) */
export function bbox(w, h, d, r = 0.06, seg = 1) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: 2 });
  g.translate(0, 0, -(d - 2 * r) / 2); return g;
}
/** a limb / torso piece: a tapered tube with few sides (the reference's faceted arms and legs) */
export const limb = (r1, r2, len, sides = 7, amt = 0.015) => { const g = new THREE.CylinderGeometry(r2, r1, len, sides, 2); g.translate(0, -len / 2, 0); return facet(g, amt); };

// ---------------------------------------------------------------- people (the owner's reference)
const SKIN = [0xf1c7a8, 0xe0a982, 0xc98b62, 0x9a6444, 0x6e4630, 0xf6d3bd];
const HAIR = [0x5a3a26, 0x2a1d16, 0x8a5a36, 0xc89a5a, 0x111111, 0x7a3b22];
/**
 * person({ sex, skin, hair, top, bottom, shoes, coat, glasses, sunglasses, hat, beard, skirt, ring })
 * Returns a Group with .rig (joints to pose) and .face. Height ≈ 1.75 units. Feet at y = 0.
 */
export function person(o = {}) {
  const sex = o.sex ?? (rnd() < 0.5 ? "m" : "f");
  const c = {
    skin: o.skin ?? SKIN[Math.floor(rnd() * SKIN.length)], hair: o.hair ?? HAIR[Math.floor(rnd() * HAIR.length)],
    top: o.top ?? 0xf2f2f2, bottom: o.bottom ?? 0x1f2d6b, shoes: o.shoes ?? 0x1c1c1e, coat: o.coat ?? null,
  };
  const G = new THREE.Group(), rig = {};
  const skin = flat(c.skin), top = flat(c.top), bottom = flat(c.bottom), shoe = flat(c.shoes, { roughness: 0.6 });
  const wide = sex === "m" ? 1.08 : 0.94;
  // hips + torso
  const hips = add(G, new THREE.Group(), 0, 0.92, 0); rig.hips = hips;
  const pel = mesh(facet(new THREE.CylinderGeometry(0.17 * wide, 0.15 * wide, 0.18, 8, 1), 0.012), o.skirt ? flat(c.bottom) : bottom); pel.scale.z = 0.72; add(hips, pel, 0, 0.02, 0);
  const chest = add(hips, new THREE.Group(), 0, 0.1, 0); rig.chest = chest;
  const torsoG = facet(new THREE.CylinderGeometry(0.2 * wide * (sex === "m" ? 1.05 : 0.92), 0.16 * wide, 0.5, 9, 3), 0.018); torsoG.translate(0, 0.25, 0);
  const torso = mesh(torsoG, top); torso.scale.z = 0.68; chest.add(torso);
  if (sex === "f") { const bust = mesh(facet(new THREE.SphereGeometry(0.07, 6, 4), 0.006), top); bust.scale.set(2.2, 0.8, 0.9); add(chest, bust, 0, 0.34, 0.07); }
  if (o.coat) { // open jacket: two front panels + back, a lapel collar
    const coat = flat(o.coat);
    const back = mesh(facet(new THREE.CylinderGeometry(0.215 * wide, 0.2 * wide, 0.6, 9, 2, true, Math.PI * 0.35, Math.PI * 1.3), 0.02), coat); back.material.side = THREE.DoubleSide; back.scale.z = 0.75; add(chest, back, 0, 0.22, 0); back.rotation.y = Math.PI;
    for (const s of [-1, 1]) { const pnl = mesh(bbox(0.13, 0.58, 0.04, 0.015), coat); pnl.rotation.y = s * 0.35; add(chest, pnl, s * 0.12 * wide, 0.22, 0.12); }
    const col = mesh(facet(new THREE.TorusGeometry(0.11, 0.04, 4, 8, Math.PI * 1.2), 0.01), coat); col.rotation.x = Math.PI / 2; col.rotation.z = Math.PI * 1.4; add(chest, col, 0, 0.5, 0.01);
  }
  if (o.buttons) for (let i = 0; i < 3; i++) add(chest, mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 6), flat(o.buttons)), 0, 0.12 + i * 0.12, 0.145).rotation.x = Math.PI / 2;
  // neck + head
  const neck = mesh(limb(0.055, 0.06, 0.09, 6), skin); add(chest, neck, 0, 0.58, 0);
  const head = add(chest, new THREE.Group(), 0, 0.62, 0); rig.head = head;
  const skull = mesh(facet(new THREE.IcosahedronGeometry(0.135, 1), 0.012), skin); skull.scale.set(0.92, 1.12, 0.98); add(head, skull, 0, 0.13, 0);
  const jaw = mesh(facet(new THREE.CylinderGeometry(0.1, 0.07, 0.08, 7), 0.01), skin); add(head, jaw, 0, 0.05, 0.015);
  const ear = facet(new THREE.SphereGeometry(0.03, 5, 4), 0.006); for (const s of [-1, 1]) { const e = mesh(ear, skin); e.scale.set(0.5, 1, 0.8); add(head, e, s * 0.125, 0.12, -0.005); }
  const nose = mesh(new THREE.ConeGeometry(0.022, 0.06, 4), skin); nose.rotation.x = Math.PI / 2 + 0.3; add(head, nose, 0, 0.115, 0.135);
  // face: eyes, brows, smile (the reference's simple friendly face)
  const ink = flat(0x1a1416, { roughness: 0.4 }), face = new THREE.Group(); head.add(face); G.face = face;
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.014, 6, 5), ink, { cast: false }); add(face, e, s * 0.048, 0.145, 0.124); const b = mesh(new THREE.BoxGeometry(0.045, 0.009, 0.01), flat(c.hair)); b.rotation.z = s * -0.12; add(face, b, s * 0.05, 0.185, 0.122); }
  const smile = mesh(new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI * 0.8), sex === "f" && o.lips !== false ? flat(0xb3313d) : ink, { cast: false }); smile.rotation.z = Math.PI * 1.1; add(face, smile, 0, 0.075, 0.128); G.smile = smile;
  // hair
  const hm = flat(c.hair);
  if (sex === "f") { const gap = 1.0; const cap = mesh(facet(new THREE.SphereGeometry(0.152, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), 0.018), hm); cap.scale.set(1, 1.08, 1.05); add(head, cap, 0, 0.14, -0.008);
    const fall = mesh(facet(new THREE.SphereGeometry(0.162, 10, 7, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap, Math.PI * 0.3, Math.PI * (o.longHair ? 0.62 : 0.42)), 0.018), hm); fall.material = flat(c.hair, { side: THREE.DoubleSide }); fall.scale.set(1, o.longHair ? 1.6 : 1.15, 1.02); add(head, fall, 0, 0.13, -0.01);
    const fringe = mesh(facet(new THREE.IcosahedronGeometry(0.07, 0), 0.015), hm); fringe.scale.set(1.8, 0.55, 0.8); add(head, fringe, -0.03, 0.25, 0.08); fringe.rotation.z = 0.25; }
  else if (o.bald !== true) { const cap = mesh(facet(new THREE.SphereGeometry(0.148, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.42), 0.025), hm); cap.scale.set(1, 1.05, 1.06); add(head, cap, 0, 0.15, -0.006); const tuft = mesh(facet(new THREE.IcosahedronGeometry(0.07, 0), 0.02), hm); tuft.scale.set(1.6, 0.6, 0.9); add(head, tuft, 0.02, 0.27, 0.06); }
  if (o.beard) { const bd = mesh(facet(new THREE.SphereGeometry(0.115, 8, 5, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), 0.015), hm); bd.scale.set(1, 0.9, 1.08); add(head, bd, 0, 0.1, 0.01); }
  if (o.glasses || o.sunglasses) { const fr = flat(0x111111); for (const s of [-1, 1]) { const ring = mesh(new THREE.TorusGeometry(0.034, 0.006, 4, 8), fr, { cast: false }); add(face, ring, s * 0.05, 0.145, 0.13); if (o.sunglasses) add(face, mesh(new THREE.CircleGeometry(0.032, 8), flat(0x111111, { roughness: 0.2 }), { cast: false }), s * 0.05, 0.145, 0.131); } add(face, mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), fr, { cast: false }), 0, 0.15, 0.13); }
  if (o.hat) { const hc = flat(o.hat), band = flat(o.hatBand ?? 0xd8323a); const brim = mesh(facet(new THREE.CylinderGeometry(0.27, 0.27, 0.018, 10), 0.01), hc); add(head, brim, 0, 0.25, 0); const crown = mesh(facet(new THREE.CylinderGeometry(0.13, 0.15, 0.13, 9), 0.01), hc); add(head, crown, 0, 0.32, 0); add(head, mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.03, 9), band), 0, 0.27, 0); }
  // arms (shoulder → elbow → hand)
  for (const s of [-1, 1]) {
    const sh = add(chest, new THREE.Group(), s * 0.215 * wide, 0.46, 0); const sleeve = o.coat ? flat(o.coat) : o.shortSleeve ? top : top;
    const up = mesh(limb(0.062, 0.05, 0.3, 7), o.bareArms ? skin : sleeve); sh.add(up); add(sh, mesh(facet(new THREE.SphereGeometry(0.075, 7, 5), 0.008), o.bareArms ? skin : sleeve), 0, -0.01, 0);
    const el = add(sh, new THREE.Group(), 0, -0.3, 0); const lo = mesh(limb(0.048, 0.04, 0.27, 7), o.shortSleeve || o.bareArms ? skin : sleeve); el.add(lo); add(el, mesh(new THREE.SphereGeometry(0.05, 6, 4), o.shortSleeve || o.bareArms ? skin : sleeve), 0, 0, 0);
    const hand = mesh(facet(new THREE.SphereGeometry(0.045, 6, 4), 0.008), skin); hand.scale.set(0.8, 1.2, 0.6); add(el, hand, 0, -0.31, 0);
    rig[s < 0 ? "lArm" : "rArm"] = sh; rig[s < 0 ? "lElbow" : "rElbow"] = el; sh.rotation.z = s * 0.08;
  }
  // legs (hip → knee → shoe)
  for (const s of [-1, 1]) {
    const hp = add(hips, new THREE.Group(), s * 0.09 * wide, -0.02, 0);
    const legM = o.skirt ? skin : bottom;
    const th = mesh(limb(0.075, 0.06, 0.44, 7), legM); hp.add(th);
    const kn = add(hp, new THREE.Group(), 0, -0.44, 0); const sh2 = mesh(limb(0.058, 0.045, 0.42, 7), o.shorts ? skin : legM); kn.add(sh2);
    if (o.cuffs) add(kn, mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 7), flat(o.cuffs)), 0, -0.38, 0);
    add(kn, mesh(new THREE.SphereGeometry(0.06, 6, 4), legM), 0, 0, 0); const foot = mesh(bbox(0.11, 0.09, 0.26, 0.035), shoe); add(kn, foot, 0, -0.43, 0.045);
    rig[s < 0 ? "lHip" : "rHip"] = hp; rig[s < 0 ? "lKnee" : "rKnee"] = kn;
  }
  if (o.skirt) { const sk = mesh(facet(new THREE.CylinderGeometry(0.19 * wide, 0.27 * wide, 0.42, 10, 2), 0.02), bottom); sk.scale.z = 0.8; add(hips, sk, 0, -0.2, 0); }
  if (o.ring) { const rg = mesh(facet(new THREE.TorusGeometry(0.22, 0.08, 6, 10), 0.01), flat(o.ring)); rg.rotation.x = Math.PI / 2; add(hips, rg, 0, 0.0, 0); }
  G.traverse((m) => { if (m.isMesh && m.castShadow !== false) { m.castShadow = true; m.receiveShadow = true; } });
  G.rig = rig; G.sex = sex;
  return G;
}

/** pose: walk (phase in cycles), wave, phone (hold a phone up), point; all angles small and natural */
export function pose(p, { walk = 0, speed = 0, wave = 0, phone = 0, point = 0, look = 0, nod = 0, cheer = 0 } = {}) {
  const r = p.rig, w = Math.sin(walk * Math.PI * 2) * speed, w2 = Math.sin(walk * Math.PI * 4) * speed;
  r.lHip.rotation.x = w * 0.55; r.rHip.rotation.x = -w * 0.55;
  r.lKnee.rotation.x = Math.max(0, -w) * 0.8 + 0.05; r.rKnee.rotation.x = Math.max(0, w) * 0.8 + 0.05;
  r.hips.position.y = 0.92 + Math.abs(w2) * 0.03; r.chest.rotation.y = w * 0.08; r.chest.rotation.x = 0.03;
  r.lArm.rotation.set(-w * 0.5, 0, -0.08); r.rArm.rotation.set(w * 0.5, 0, 0.08); r.lElbow.rotation.x = -0.25; r.rElbow.rotation.x = -0.25;
  if (phone) { r.rArm.rotation.x = lerp(r.rArm.rotation.x, -0.55, phone); r.rArm.rotation.z = lerp(0.08, -0.25, phone); r.rElbow.rotation.x = lerp(-0.25, -1.5, phone); r.head.rotation.x = 0.28 * phone; }
  if (wave) { r.lArm.rotation.z = lerp(-0.08, -2.6, wave); r.lElbow.rotation.z = Math.sin(wave * 9) * 0.3 * wave; r.lElbow.rotation.x = -0.3 * wave; }
  if (point) { r.lArm.rotation.x = lerp(r.lArm.rotation.x, -1.45, point); r.lElbow.rotation.x = lerp(-0.25, -0.05, point); }
  if (cheer) { r.lArm.rotation.z = -2.7 * cheer; r.rArm.rotation.z = 2.7 * cheer; r.lElbow.rotation.x = r.rElbow.rotation.x = -0.4 * cheer; }
  r.head.rotation.y = look; r.head.rotation.x += nod;
}

// ---------------------------------------------------------------- props
export function tree(h = 2.4, kind = "round", col = 0x4f9a3c) {
  const g = new THREE.Group(); const trunk = mesh(limb(0.09 * h / 2.4, 0.06 * h / 2.4, h * 0.5, 6), flat(0x7a4f32)); trunk.position.y = h * 0.5; g.add(trunk);
  if (kind === "palm") { trunk.rotation.z = 0.12; for (let i = 0; i < 7; i++) { const lf = mesh(facet(new THREE.ConeGeometry(0.16, 1.3, 4, 1), 0.03), flat(i % 2 ? 0x3e8f3a : 0x5aa844)); lf.rotation.set(Math.PI / 2 - 0.5, (i / 7) * Math.PI * 2, 0); lf.position.set(0.12, h * 0.98, 0); lf.translateY(0.55); g.add(lf); } return g; }
  const n = kind === "pine" ? 3 : 3;
  for (let i = 0; i < n; i++) {
    const cg = kind === "pine" ? facet(new THREE.ConeGeometry(0.75 - i * 0.18, 0.9, 7), 0.05) : facet(new THREE.IcosahedronGeometry(0.62 - i * 0.12, 0), 0.08);
    const c = mesh(cg, flat(new THREE.Color(col).offsetHSL(0, 0, (i - 1) * 0.04).getHex())); c.position.set((rnd() - 0.5) * 0.25, h * 0.55 + i * (kind === "pine" ? 0.45 : 0.32), (rnd() - 0.5) * 0.25); g.add(c);
  }
  return g;
}
export const rock = (s = 0.4, col = 0x8b8f96) => { const m = mesh(facet(new THREE.DodecahedronGeometry(s, 0), s * 0.25), flat(col)); m.scale.y = 0.65; return m; };
export function ground(size = 60, col = 0x8fbf5a, seg = 30, amp = 0.12) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); p.setY(i, (rnd() - 0.5) * amp * clamp(d / 6)); }
  g.computeVertexNormals(); return mesh(g, flat(col), { cast: false });
}
/** a phone: rounded body, black glass, a screen texture you can redraw (CanvasTexture) */
export function phone(col = 0x22252b, drawScreen) {
  const g = new THREE.Group(); const body = mesh(bbox(0.36, 0.74, 0.04, 0.05), flat(col, { roughness: 0.35, metalness: 0.3 })); g.add(body);
  const cv = document.createElement("canvas"); cv.width = 360; cv.height = 740; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = mesh(new THREE.PlaneGeometry(0.33, 0.69), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), { cast: false }); scr.position.z = 0.021; g.add(scr);
  g.draw = (fn) => { fn(cv.getContext("2d"), cv.width, cv.height); tex.needsUpdate = true; }; if (drawScreen) g.draw(drawScreen);
  return g;
}
export function house(w = 3, d = 2.6, h = 2, wall = 0xe9d8b8, roof = 0xc0643c) {
  const g = new THREE.Group(); const b = mesh(bbox(w, h, d, 0.04), flat(wall)); b.position.y = h / 2; g.add(b);
  const rf = mesh(facet(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.7, 4), 0.02), flat(roof)); rf.rotation.y = Math.PI / 4; rf.position.y = h + h * 0.35; rf.scale.z = d / w; g.add(rf);
  const door = mesh(bbox(0.55, 1.0, 0.06, 0.02), flat(0x6b4630)); door.position.set(0, 0.5, d / 2 + 0.01); g.add(door);
  for (const s of [-1, 1]) { const wdw = mesh(bbox(0.55, 0.5, 0.06, 0.02), flat(0xffe6a0, { emissive: 0x6a5020, emissiveIntensity: 0.4 })); wdw.position.set(s * w * 0.3, h * 0.6, d / 2 + 0.01); g.add(wdw); }
  return g;
}
/** the low-poly Earth: an icosphere, land by seeded noise, ocean, a thin atmosphere */
export function globe(R = 3, det = 4) {
  const g = new THREE.Group(); const geo = new THREE.IcosahedronGeometry(R, det).toNonIndexed(); const p = geo.attributes.position, col = [];
  const land = (v) => Math.sin(v.x * 1.7) * Math.cos(v.y * 2.3) + Math.sin(v.z * 2.1 + v.x) * 0.8 + Math.sin(v.y * 4.1 + v.z * 3.3) * 0.35;
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const v = V(cx, cy, cz).normalize(), l = land(v.clone().multiplyScalar(2));
    const c = new THREE.Color(l > 0.55 ? (Math.abs(v.y) > 0.82 ? 0xf2f4f6 : l > 1.1 ? 0x8a7a5a : 0x5c9a46) : 0x2e6fb5);
    if (l > 0.55) for (let k = 0; k < 3; k++) { const vv = V(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); vv.multiplyScalar(1.02); p.setXYZ(i + k, vv.x, vv.y, vv.z); }
    for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  g.add(mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 32, 24), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.12, side: THREE.BackSide })));
  return g;
}
/** the point on a globe of radius R at lat/lon (degrees) */
export const onGlobe = (R, lat, lon) => { const a = (lat * Math.PI) / 180, b = (lon * Math.PI) / 180; return V(R * Math.cos(a) * Math.sin(b), R * Math.sin(a), R * Math.cos(a) * Math.cos(b)); };
/** a glowing arc between two points on a globe (a beam that grows with k) */
export function arc(R, p1, p2, col = 0x3dff8c, lift = 0.5) {
  const mid = p1.clone().add(p2).multiplyScalar(0.5).normalize().multiplyScalar(R * (1 + lift));
  const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2); const geo = new THREE.TubeGeometry(curve, 64, 0.03, 6, false);
  const m = new THREE.Mesh(geo, glow(col)); m.curve = curve; m.grow = (k) => geo.setDrawRange(0, Math.floor(geo.index.count * clamp(k) / 3) * 3); m.grow(0); return m;
}
/** a server rack, low-poly, with blinking lights you can drive */
export function rack(col = 0x2b2f38) {
  const g = new THREE.Group(); const b = mesh(bbox(0.9, 2.1, 0.8, 0.04), flat(col, { roughness: 0.5, metalness: 0.2 })); b.position.y = 1.05; g.add(b); g.leds = [];
  for (let i = 0; i < 8; i++) { const u = mesh(bbox(0.8, 0.16, 0.05, 0.01), flat(0x3a3f4a)); u.position.set(0, 0.3 + i * 0.22, 0.41); g.add(u); const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), glow(0x3dff8c)); led.position.set(0.3, 0.3 + i * 0.22, 0.44); g.add(led); g.leds.push(led); }
  return g;
}

// ---------------------------------------------------------------- camera: shots with eases, a little handheld life
/** shots: [{ at, dur, from:{p,t,fov}, to:{p,t,fov}, shake }] — the active shot is the last one whose `at` ≤ t */
export function camRig(cam) {
  return (shots, t) => {
    let s = shots[0]; for (const x of shots) if (t >= x.at) s = x;
    const k = ease(clamp((t - s.at) / (s.dur ?? 2))), to = s.to ?? s.from;
    const p = s.from.p.clone().lerp(to.p, k), q = s.from.t.clone().lerp(to.t, k), fov = lerp(s.from.fov ?? 40, to.fov ?? s.from.fov ?? 40, k);
    const sh = s.shake ?? 0.012; p.x += Math.sin(t * 1.3) * sh; p.y += Math.sin(t * 1.7 + 1) * sh; q.x += Math.sin(t * 0.9 + 2) * sh * 0.5;
    cam.position.copy(p); cam.lookAt(q); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  };
}
/** orbit around a point: angle a (rad), radius r, height h */
export const orbit = (c, a, r, h) => V(c.x + Math.sin(a) * r, c.y + h, c.z + Math.cos(a) * r);

// ---------------------------------------------------------------- "4D" views: cutaway, x-ray, exploded, time trail
/** cutaway: a clipping plane through a group (show the inside); returns set(k) that slides it */
export function cutaway(group, normal = V(-1, 0, 0), from = 2, to = -2) {
  const plane = new THREE.Plane(normal.clone().normalize(), from);
  group.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.clippingPlanes = [plane]; m.material.clipShadows = true; m.material.side = THREE.DoubleSide; } });
  return (k) => (plane.constant = lerp(from, to, clamp(k)));
}
/** x-ray: fade a group's materials to see through (k 0 solid → 1 ghost) */
export function xray(group) {
  const list = []; group.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; list.push(m); } });
  return (k) => list.forEach((m) => { m.material.opacity = lerp(1, 0.14, clamp(k)); m.material.depthWrite = k < 0.5; m.castShadow = k < 0.5; });
}
/** exploded view: parts drift out along their own direction from the center (k 0 together → 1 apart) */
export function explode(parts, center = V(0, 0, 0), dist = 1) {
  const base = parts.map((p) => p.position.clone()); return (k) => parts.forEach((p, i) => { const d = base[i].clone().sub(center); if (d.lengthSq() < 1e-6) d.set(0, 1, 0); p.position.copy(base[i]).add(d.normalize().multiplyScalar(dist * ease(clamp(k)))); });
}

// ---------------------------------------------------------------- v2 additions: per-face colour, sky, sea, crowd, fire, lights
/** a mesh whose every facet gets a slightly different shade (the low-poly reference look) */
export function tinted(geo, col, v = 0.06, o = {}) {
  geo = geo.index ? geo.toNonIndexed() : geo; const p = geo.attributes.position, c = new THREE.Color(col), arr = [];
  for (let i = 0; i < p.count; i += 3) { const k = c.clone().offsetHSL((rnd() - 0.5) * v * 0.15, (rnd() - 0.5) * v * 0.6, (rnd() - 0.5) * v); for (let j = 0; j < 3; j++) arr.push(k.r, k.g, k.b); }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(arr, 3)); geo.computeVertexNormals();
  return mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, ...o }), o.shadow ?? {});
}
/** a gradient sky dome (top → horizon → below), with an optional sun disc; set(top, mid, low) recolours it */
export function sky(top = 0x3a5aa0, mid = 0xf2a46a, low = 0xf6d0a0, R = 900) {
  const u = { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, low: { value: new THREE.Color(low) }, sun: { value: V(0, 0.1, -1).normalize() }, sunCol: { value: new THREE.Color(0xfff0c0) }, sunSize: { value: 0.03 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top, mid, low, sun, sunCol; uniform float sunSize; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h*1.6,0.0,1.0), 0.7)) : mix(mid, low, clamp(-h*4.0,0.0,1.0)); float d = distance(normalize(vP), normalize(sun)); c += sunCol * (smoothstep(sunSize, sunSize*0.7, d) * 1.6 + exp(-d*7.0) * 0.35); gl_FragColor = vec4(c, 1.0); }" });
  const s = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16), m); s.renderOrder = -1; s.u = u; return s;
}
/** a puffy low-poly cloud */
export function cloud(s = 1, col = 0xfff4ec) { const g = new THREE.Group(); const n = 6 + Math.floor(rnd() * 4), m = flat(col, { roughness: 1, emissive: 0x6a4030, emissiveIntensity: 0.35 }); for (let i = 0; i < n; i++) { const r = s * (0.55 + rnd() * 0.6) * (1 - Math.abs(i - n / 2) / n); const b = mesh(facet(new THREE.IcosahedronGeometry(r, 1), r * 0.1), m, { cast: false, recv: false }); b.position.set((i - n / 2) * s * 0.62, Math.abs(Math.sin(i * 1.7)) * s * 0.35, (rnd() - 0.5) * s * 0.5); b.scale.y = 0.75; g.add(b); } return g; }
/** a faceted sea: call .wave(t) each frame */
export function sea(size = 400, seg = 90, col = 0x2f86b8, amp = 0.18) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); const base = g.attributes.position.array.slice();
  const m = mesh(g, new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.05, flatShading: true }), { cast: false });
  m.wave = (t) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; p.setY(i, (Math.sin(x * 0.35 + t * 1.3) + Math.sin(z * 0.43 - t * 1.1) + Math.sin((x + z) * 0.9 + t * 2.1) * 0.4) * amp); } p.needsUpdate = true; g.computeVertexNormals(); };
  m.wave(0); return m;
}
const OUTFIT = [[0xf2f2f2, 0x1f2d6b], [0xe9c46a, 0x3a3a3a], [0x8ab6d6, 0xc9b38a], [0xf4a6b8, 0xffffff], [0x6c9a5b, 0x2b2b2b], [0xffffff, 0x5b7fa6], [0xd96c4e, 0x2f3e5c], [0xb48ad6, 0x2a2a2a], [0xf7e3c4, 0x7a5a3a], [0x3f6fb0, 0xe8e0d0]];
/** a random but deterministic person for crowds */
export function extra(i) {
  const [top, bottom] = OUTFIT[i % OUTFIT.length], sex = i % 2 ? "f" : "m";
  return person({ sex, top, bottom, skirt: sex === "f" && i % 4 === 1, shorts: sex === "m" && i % 3 === 0, shortSleeve: i % 3 !== 2, glasses: i % 7 === 3, sunglasses: i % 5 === 2, hat: i % 6 === 4 ? 0xe8d6a8 : undefined, beard: sex === "m" && i % 4 === 2, longHair: sex === "f" && i % 3 === 0 });
}
/** a campfire: logs, stones, flickering flame cones and a warm light. .tick(t) */
export function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) { const st = rock(0.18, 0x77716a); const a = (i / 9) * Math.PI * 2; st.position.set(Math.cos(a) * 0.6, 0.06, Math.sin(a) * 0.6); g.add(st); }
  for (let i = 0; i < 4; i++) { const lg = mesh(limb(0.07, 0.07, 1.0, 6), flat(0x6b4630)); lg.rotation.set(Math.PI / 2 - 0.5, (i / 4) * Math.PI * 2, 0); lg.position.set(0, 0.35, 0); g.add(lg); }
  const fl = []; for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.16 + (i % 3) * 0.05, 0.7, 5), glow(i % 2 ? 0xffa53a : 0xff6a1a)); f.position.set((rnd() - 0.5) * 0.3, 0.45, (rnd() - 0.5) * 0.3); g.add(f); fl.push(f); }
  const L = new THREE.PointLight(0xff8a3a, 12, 14, 1.6); L.position.y = 1.0; g.add(L);
  g.tick = (t) => { fl.forEach((f, i) => { f.scale.set(1, 0.8 + 0.35 * Math.sin(t * 11 + i * 1.7) + 0.15 * Math.sin(t * 23 + i), 1); f.rotation.y = t * 2 + i; }); L.intensity = 11 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7.3) * 1; };
  return g;
}
/** a string of glowing bulbs hanging between two points (catenary sag) */
export function bulbs(a, b, n = 14, sag = 0.6, cols = [0xffd27a, 0xff9a6a, 0x9ad7ff, 0xb7ff9a]) {
  const g = new THREE.Group(); const pts = [];
  for (let i = 0; i <= n; i++) { const k = i / n; const p = a.clone().lerp(b, k); p.y -= Math.sin(k * Math.PI) * sag; pts.push(p); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 3, 0.012, 4), flat(0x222222)));
  pts.slice(1, -1).forEach((p, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), glow(cols[i % cols.length])); s.position.copy(p).add(V(0, -0.07, 0)); g.add(s); });
  return g;
}
/** text/emoji texture on a plane (labels in 3D, letters on tiles) */
export function textTex(draw, w = 256, h = 256) { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
