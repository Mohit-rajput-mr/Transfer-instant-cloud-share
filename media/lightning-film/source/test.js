import { THREE, H } from "./kit/hd.js";
import { makeBody } from "./kit/body.js";
const B = await makeBody(); H.scene.add(B.root);
H.floor.position.y = 0; H.floor.material.userData.studio = true; H.floor.material.color.set(0x08090b); H.floor.material.clearcoat = 0; H.floor.material.roughness = 0.6;
H.frame("", async (t) => {
  B.clip("idle", t); B.x = t > 2 ? 1 : 0; B.nerves = t > 2 ? 1 : 0; B.vessels = t > 2 ? 1 : 0; B.beat = Math.sin(t * 8); B.hairUp = t > 2 ? 1 : 0.2;
  B.current = t > 2 ? 1 : 0; B.currentPaths = [[0, 1, 0.8, 0], [3, 1, 0.9, 0.3]];
  B.update(t);
  if (t < 4) H.look(H.V(0.6, 1.3, 3.6), H.V(0, 1.0, 0), 34); else H.look(H.V(0.3, 1.55, 1.0), H.V(0, 1.45, 0), 34);
});
await H.ready();
