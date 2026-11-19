// Orbi ad set for the HD films: phones and a laptop whose screens are canvas textures (draw the real orbitransfer.com
// captures + the film's overlay on them), a glowing lock, embers for the burn. Shared by lightning-film and space-film.
import { THREE, H, RoundedBoxGeometry } from "./hd.js";
const { V, metal, matte, glow, sh } = H;
export const green = "#3dff8c";
export const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
export const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

export function makePhone(color = 0x2c2f34) {
  const tex = H.canvasTex(780, 1688, () => {});
  const g = new THREE.Group();
  const body = sh(new THREE.Mesh(new RoundedBoxGeometry(0.78, 1.62, 0.085, 6, 0.1), metal(color, 0.25))); g.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.56), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xbdbdbd })); scr.position.z = 0.044; g.add(scr);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.56), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, clearcoat: 1 })); glass.position.z = 0.045; g.add(glass);
  const isl = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.01, 2, 0.02), matte(0x000000)); isl.position.set(0, 0.72, 0.046); g.add(isl);
  return { g, tex, ctx: tex.userData.g, last: "" };
}
export function makeLaptop() {
  const tex = H.canvasTex(1440, 900, () => {});
  const g = new THREE.Group(), lid = new THREE.Group(); g.add(lid);
  const base = sh(new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.09, 2.05, 4, 0.04), metal(0xa9afb6, 0.3))); base.position.z = 1.02; g.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.95), matte(0x1d1f22, 0.6)); kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.047, 0.72); g.add(kb);
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), metal(0x9ba1a8, 0.35)); tp.rotation.x = -Math.PI / 2; tp.position.set(0, 0.047, 1.6); g.add(tp);
  const back = sh(new THREE.Mesh(new RoundedBoxGeometry(3.0, 1.95, 0.06, 4, 0.04), metal(0xa9afb6, 0.3))); back.position.y = 0.975; lid.add(back);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.84, 1.775), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xbdbdbd })); scr.position.set(0, 0.99, 0.032); lid.add(scr);
  lid.rotation.x = -0.12;
  return { g, lid, tex, ctx: tex.userData.g, last: "" };
}
export function makeLock(col = 0x3dff8c) {
  const lock = new THREE.Group(), lm = glow(col, 2.2);
  lock.add(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.28, 0.1, 3, 0.04), lm));
  const shk = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 12, 32, Math.PI), lm); shk.position.y = 0.14; lock.add(shk);
  for (const x of [-0.11, 0.11]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 12), lm); s.position.set(x, 0.13, 0); lock.add(s); }
  return lock;
}
export function makeEmbers(n = 200) {
  const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.02, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.1, 0.3), toneMapped: false }), n);
  m.frustumCulled = false; m.userData.E = Array.from({ length: n }, () => ({ x: H.rnd() - 0.5, y: H.rnd() - 0.5, v: H.rnd(), s: H.rnd() }));
  /** burn(k, t, at(x,y)→Vector3) */
  m.userData.burn = (k, t, place) => { const m4 = new THREE.Matrix4(); m.userData.E.forEach((e, i) => { const p = place(e.x, e.y); const u = (((e.v + t * 0.6) % 1) + 1) % 1; p.y += u * 0.8 * k; const s = k * (1 - u) * (0.6 + e.s); m4.makeScale(s, s, s).setPosition(p); m.setMatrixAt(i, m4); }); m.instanceMatrix.needsUpdate = true; m.visible = k > 0.001; };
  return m;
}
/** redraw a screen only when its state changed */
export function screen(dev, st, draw) { const k = JSON.stringify(st); if (k === dev.last) return; dev.last = k; draw(dev.ctx, st); dev.tex.needsUpdate = true; }
