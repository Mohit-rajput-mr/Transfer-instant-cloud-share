import * as THREE from "three";
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
// rotate `bone` (in world space) so that its child points at `target` (world)
export function aim(bone, child, target) {
  bone.updateWorldMatrix(true, true);
  const p = bone.getWorldPosition(v1), c = child.getWorldPosition(v2);
  const from = c.sub(p).normalize(), to = v3.copy(target).sub(p).normalize();
  q1.setFromUnitVectors(from, to);
  const wq = bone.getWorldQuaternion(q2);
  const nw = q1.multiply(wq); // new world rotation
  const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  bone.quaternion.copy(parentQ.multiply(nw));
  bone.updateWorldMatrix(false, true);
}
// pose a person holding a phone at `hand` (local to the person, metres), looking at it
export function holdPhone(o, side = "Right", hand = [0.05, 1.18, 0.32], elbow = [0.2, 1.05, 0.05], look = 0.5) {
  const B = (n) => o.getObjectByName("mixamorig" + n);
  const toW = (p) => o.localToWorld(new THREE.Vector3(...p));
  const sx = side === "Right" ? -1 : 1;
  aim(B(side + "Arm"), B(side + "ForeArm"), toW([sx * elbow[0], elbow[1], elbow[2]]));
  aim(B(side + "ForeArm"), B(side + "Hand"), toW([sx * hand[0], hand[1], hand[2]]));
  B("Head").rotation.x += look * 0.6; B("Neck").rotation.x += look * 0.35;
}
