import { THREE, H } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
const ld = new GLTFLoader();
const load = (f) => new Promise((ok) => ld.load(`kit/models/${f}.glb`, ok));
const names = ["Xbot", "Michelle", "Soldier"]; const mixers = [];
for (let i = 0; i < 3; i++) {
  const g = await load(names[i]); const m = g.scene; m.position.x = (i - 1) * 1.1; H.scene.add(m);
  m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
  const mx = new THREE.AnimationMixer(m); const clip = g.animations.find((a) => /idle/i.test(a.name)) || g.animations[0]; mx.clipAction(clip).play(); mixers.push(mx);
}
H.floor.position.y = 0;
H.frame("", async (t) => { for (const m of mixers) m.setTime(t); H.look(H.V(0, 1.2, 6.5), H.V(0, 0.95, 0), 30); });
await H.ready();
