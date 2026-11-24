// Bell X-1 — model test. Smithsonian NASM scan (3d.si.edu, CC0), draco-compressed web glb, units mm.
import { THREE, H } from "./kit/hd.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
const { V, look } = H; const scene = H.scene;
H.cam.near = 0.02; H.cam.far = 400; H.cam.updateProjectionMatrix();
const dl = new DRACOLoader(); dl.setDecoderPath("kit/lib/jsm/libs/draco/gltf/"); const ld = new GLTFLoader(); ld.setDRACOLoader(dl);
const g = await ld.loadAsync("kit/models/bellx1/bell_x1-100k-4096.glb"); g.scene.updateMatrixWorld(true);
const X = new THREE.Group(); scene.add(X); const box = new THREE.Box3();
g.scene.traverse((o) => { if (!o.isMesh) return; const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.scale(0.001, 0.001, 0.001); geo.computeBoundingBox(); box.union(geo.boundingBox); const m = new THREE.Mesh(geo, o.material); m.castShadow = m.receiveShadow = true; X.add(m); });
console.log("box", JSON.stringify(box.min), JSON.stringify(box.max));
{ let n = 0, mx = 0, mz = 0, sxx = 0, szz = 0, sxz = 0; const pts = []; X.children.forEach((m) => { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 7) pts.push([p.getX(i), p.getY(i), p.getZ(i)]); });
  for (const p of pts) { mx += p[0]; mz += p[2]; n++; } mx /= n; mz /= n; for (const p of pts) { const dx = p[0] - mx, dz = p[2] - mz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz); console.log("pca angle deg", ang * 180 / Math.PI, "mean", mx, mz);
  // extremes along the principal axis: nose vs tail
  const ux = Math.cos(ang), uz = Math.sin(ang); let lo = 1e9, hi = -1e9, ylo = 0, yhi = 0; for (const p of pts) { const s2 = (p[0] - mx) * ux + (p[2] - mz) * uz; if (s2 < lo) { lo = s2; ylo = p[1]; } if (s2 > hi) { hi = s2; yhi = p[1]; } } console.log("axis extent", lo, hi, "y at ends", ylo, yhi);
  let wlo = 1e9, whi = -1e9; for (const p of pts) { const s2 = -(p[0] - mx) * uz + (p[2] - mz) * ux; wlo = Math.min(wlo, s2); whi = Math.max(whi, s2); } console.log("cross extent", wlo, whi);
  const bins = {}; for (const p of pts) { const k = Math.floor(p[2]); bins[k] = bins[k] || [0, 1e9, -1e9, 1e9, -1e9]; const b = bins[k]; b[0]++; b[1] = Math.min(b[1], p[0]); b[2] = Math.max(b[2], p[0]); b[3] = Math.min(b[3], p[1]); b[4] = Math.max(b[4], p[1]); }
  const tail = pts.filter((p) => p[2] > 2.2); const tb = {}; for (const p of tail) { const k = (p[1] * 5 | 0) / 5; tb[k] = tb[k] || [0, 1e9, -1e9, 1e9, -1e9]; const b = tb[k]; b[0]++; b[1] = Math.min(b[1], p[0]); b[2] = Math.max(b[2], p[0]); b[3] = Math.min(b[3], p[2]); b[4] = Math.max(b[4], p[2]); }
  console.log("tail y-bins", JSON.stringify(Object.entries(tb).sort((a, b) => a[0] - b[0]).map(([k, b]) => [k, b[0], b[1].toFixed(2), b[2].toFixed(2), b[3].toFixed(2), b[4].toFixed(2)])));
  const aft = pts.filter((p) => p[2] > 3.95 && p[1] < 0.5); console.log("aft", aft.length, JSON.stringify(aft.slice(0, 1)), Math.min(...aft.map(p=>p[0])), Math.max(...aft.map(p=>p[0])), Math.min(...aft.map(p=>p[1])), Math.max(...aft.map(p=>p[1])), Math.max(...aft.map(p=>p[2])));
  console.log("zbins", JSON.stringify(Object.entries(bins).sort((a, b) => a[0] - b[0]).map(([k, b]) => [k, b[0], b[1].toFixed(2), b[2].toFixed(2), b[3].toFixed(2), b[4].toFixed(2)]))); }
X.position.y = -box.min.y - 1.11;
H.key.position.set(8, 12, 9); H.key.intensity = 3.0; H.envK.value = 0.8;
const C = V(0, 0.4, 0);
const SH = [() => look(V(0, 1.5, 22), C, 34), () => look(V(15, 5, 15), C, 34), () => look(V(22, 0.8, 0), C, 34), () => look(V(0, 1.5, -22), C, 34), () => look(V(0.1, 24, 0.2), C, 34), () => look(V(-12, 3, 10), C, 34)];
H.frame("", async (t) => { SH[Math.max(0, Math.min(SH.length - 1, Math.floor(t)))](); });
await H.ready();
