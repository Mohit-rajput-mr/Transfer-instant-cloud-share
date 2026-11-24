// Apollo 11 Command Module "Columbia" — model test. Smithsonian NASM laser scan (3d.si.edu, CC0), real size in metres.
// The scan is in cm with the capsule axis along -z (apex at z = -317.7, heat shield at z = -43.6).
// We drop the museum display tilt and stand it upright: rotateX(+90°) → y = -z, heat-shield bottom at y = 0, ×0.01.
// Shots by time (s): 0.5 front · 1.5 ¾ · 2.5 side · 3.5 back · 4.5 heat shield from below · 5.5 window close-up · 6.5 top
import { THREE, H } from "./kit/hd.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const { V, look } = H;
const scene = H.scene;
H.cam.near = 0.02; H.cam.far = 400; H.cam.updateProjectionMatrix();
const CM = new THREE.Group(); scene.add(CM);
const gl = await new GLTFLoader().loadAsync("kit/models/apollo/apollo_exterior-150k-4096.glb");
const box = new THREE.Box3();
const CUT = new THREE.Plane(V(-1, 0, 0), 0); H.r.localClippingEnabled = true;
const gi = await new GLTFLoader().loadAsync("kit/models/apollo/apollo_interior-medium.glb");
const IN = new THREE.Group(); scene.add(IN);
gi.scene.traverse((o) => { if (!o.isMesh) return; const g = o.geometry.clone(); g.rotateX(Math.PI / 2); g.translate(0, -43.58, 0); g.scale(0.01, 0.01, 0.01);
  o.material.side = THREE.DoubleSide; o.material.clippingPlanes = [CUT]; const m = new THREE.Mesh(g, o.material); IN.add(m); });
gl.scene.traverse((o) => { if (!o.isMesh) return;
  const g = o.geometry.clone(); g.rotateX(Math.PI / 2); g.translate(0, -43.58, 0); g.scale(0.01, 0.01, 0.01); g.computeBoundingBox(); box.union(g.boundingBox);
  const mat = o.material; mat.clippingPlanes = [CUT]; mat.side = THREE.DoubleSide;
  if (!mat.map) { mat.color.set(0x07090c); mat.roughness = 0.05; mat.metalness = 0.0; }
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; CM.add(m); });
console.log("bounds", JSON.stringify(box.min), JSON.stringify(box.max));
H.key.position.set(5, 7, 6); H.key.intensity = 3.0; H.envK.value = 0.8;
const C = V(0, 1.4, 0);
const SH = [
  () => look(V(0, 1.6, 9), C, 32),
  () => look(V(6.4, 2.6, 6.4), C, 32),
  () => look(V(9, 1.6, 0), C, 32),
  () => look(V(0, 1.8, -9), C, 32),
  () => look(V(0.5, -6, 3.2), V(0, 0.3, 0), 40),
  () => look(V(1.2, 1.9, 4.5), V(0.3, 1.6, 1.3), 30),
  () => look(V(0.1, 9, 0.2), C, 32),
  () => look(V(7, 2.4, 1.5), V(0, 1.5, 0), 34),
  () => look(V(4.5, 3.2, -2.5), V(0, 1.4, 0), 36),
  () => look(V(3.2, 1.6, 0.3), V(0, 1.3, 0), 50),
];
H.frame("", async (t) => { CUT.constant = t > 7 ? 0 : 100; SH[Math.max(0, Math.min(SH.length - 1, Math.floor(t)))](); });
await H.ready();
