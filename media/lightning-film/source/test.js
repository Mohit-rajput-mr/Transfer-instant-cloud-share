import { THREE, H } from "./kit/hd.js";
import { loadAnatomy, standardLayers } from "./kit/anatomy.js";
const A = standardLayers(await loadAnatomy()); H.scene.add(A.root);
H.floor.position.y = 0; H.floor.material.userData.studio = true; H.floor.material.color.set(0x08090b); H.floor.material.clearcoat = 0; H.floor.material.roughness = 0.6;
H.frame("", async (t) => {
  A.xray(t > 4 && t < 6 ? 1 : 0);
  A.root.position.y = 0;
  if (t < 2) A.setPose({});
  else if (t < 4) A.setPose({ shL: [0, 0, 40], shR: [0, 0, -40], elL: [-35, 0, 0], elR: [-35, 0, 0], head: [-15, 0, 0] });
  else if (t < 6) A.setPose({ hipL: [-25, 0, 0], knL: [35, 0, 0], hipR: [12, 0, 0], shL: [20, 0, 8], shR: [-25, 0, -8], elL: [-30, 0, 0], elR: [-20, 0, 0] });
  else { A.setPose({ hipL: [-90, 0, 0], knL: [90, 0, 0], hipR: [-90, 0, 0], knR: [90, 0, 0], elL: [-60, 0, 0], elR: [-60, 0, 0] }); A.root.position.y = 0.0; }
  H.look(H.V(1.8, 1.25, 2.6), H.V(0, 0.9, 0), 38);
  if (t > 8) H.look(H.V(0.35, 1.55, 0.6), H.V(0, 1.58, 0), 30);
});
await H.ready();
