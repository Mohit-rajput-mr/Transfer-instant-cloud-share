// 1903 Wright Flyer — model test. Smithsonian NASM scan (3d.si.edu, CC0); already metres, y up.
import { THREE, H } from "./kit/hd.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const { V, look } = H; const scene = H.scene;
H.cam.near = 0.02; H.cam.far = 400; H.cam.updateProjectionMatrix(); H.floor.position.y = -1.11;
const W = new THREE.Group(); scene.add(W); const box = new THREE.Box3();
const COL = { engine: 0xd04020, filler: 0x3070d0, wings: 0xe8dcc0 };
for (const p of ["engine", "filler", "wings"]) { const g = await new GLTFLoader().loadAsync(`kit/models/wright/${p}.glb`); g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => { if (!o.isMesh) return; const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); box.union(geo.boundingBox);
    o.material.color.set(COL[p]); o.material.side = THREE.DoubleSide; const m = new THREE.Mesh(geo, o.material); m.castShadow = m.receiveShadow = true; W.add(m); }); }
console.log("box", JSON.stringify(box.min), JSON.stringify(box.max));
const sz = box.getSize(V()); const k = 12.29 / Math.max(sz.x, sz.z); W.scale.setScalar(k); const c = box.getCenter(V()); W.position.set(-c.x * k, -box.min.y * k - 1.11, -c.z * k); console.log("scale", k, JSON.stringify(sz));
H.key.position.set(8, 12, 9); H.key.intensity = 3.0; H.envK.value = 0.8; Object.assign(H.key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 60 }); H.key.shadow.camera.updateProjectionMatrix();
const C = V(0, 0.3, 0);
const SH = [
  () => look(V(0, 1.5, 22), C, 34), () => look(V(15, 5, 15), C, 34), () => look(V(22, 0.8, 0), C, 34), () => look(V(0, 1.5, -22), C, 34),
  () => look(V(0.1, 24, 0.2), C, 34), () => look(V(3, 1.6, 4), V(0.5, 0.2, -1), 40), () => look(V(-6, 1, -6), V(0, 0.3, -2.4), 34),
];
H.frame("", async (t) => { SH[Math.max(0, Math.min(SH.length - 1, Math.floor(t)))](); });
await H.ready();
