// Space Shuttle Discovery — model test (Smithsonian scan, CC0), metres.
import { THREE, H } from "./kit/hd.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const { V, look } = H; const scene = H.scene; H.cam.near = 0.1; H.cam.far = 800; H.cam.updateProjectionMatrix();
const g = await new GLTFLoader().loadAsync("kit/models/discovery/discovery-150k-4096.glb"); g.scene.updateMatrixWorld(true);
const S = new THREE.Group(); scene.add(S); const box = new THREE.Box3();
g.scene.traverse((o) => { if (!o.isMesh) return; const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); box.union(geo.boundingBox); const m = new THREE.Mesh(geo, o.material); m.castShadow = m.receiveShadow = true; S.add(m); });
console.log("box", JSON.stringify(box.min), JSON.stringify(box.max)); S.position.y = -box.min.y - 1.11; H.floor.scale.setScalar(2);
H.key.position.set(30, 40, 30); H.key.intensity = 3; Object.assign(H.key.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, far: 150 }); H.key.shadow.camera.updateProjectionMatrix(); H.envK.value = 0.8;
const C = V(0, 3, 0);
const SH = [() => look(V(0, 5, 60), C, 34), () => look(V(40, 14, 40), C, 34), () => look(V(60, 3, 0), C, 34), () => look(V(0, 5, -60), C, 34), () => look(V(0.1, 70, 0.2), C, 34), () => look(V(25, -12, 30), C, 34)];
H.frame("", async (t) => { SH[Math.max(0, Math.min(SH.length - 1, Math.floor(t)))](); });
await H.ready();
