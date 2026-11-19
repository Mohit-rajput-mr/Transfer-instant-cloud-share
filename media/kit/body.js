// A human body for the HD films (kit/hd.js): the three.js "Xbot" mannequin (Mixamo rig) with a skin material, an x-ray
// mode (fresnel glass skin), an x-ray skeleton, organs (brain, heart, lungs) and nerve / vessel paths that follow the
// bones every frame, plus pose helpers (degrees, added on top of the bind pose or an animation clip).
//   const B = await makeBody(); scene.add(B.root); … every frame: B.update(t)
import { THREE, H, RoundedBoxGeometry } from "./hd.js";
import { GLTFLoader } from "./lib/jsm/loaders/GLTFLoader.js";
const { V } = H;
const D2R = Math.PI / 180;

export async function makeBody({ skin = 0xc98f6c, xcol = 0x7fd4ff } = {}) {
  const gl = await new Promise((ok) => new GLTFLoader().load("kit/models/Xbot.glb", ok));
  const root = new THREE.Group(); const fig = gl.scene; root.add(fig);
  const bones = {}; fig.traverse((o) => { if (o.isBone) bones[o.name.replace("mixamorig", "")] = o; });
  const bind = {}; for (const k in bones) bind[k] = bones[k].quaternion.clone();
  const mixer = new THREE.AnimationMixer(fig); const clips = Object.fromEntries(gl.animations.map((a) => [a.name, a]));
  // ---- skin: a warm, slightly waxy physical material; x-ray: the same surface turned to blue glass by fresnel
  const U = { uX: { value: 0 }, uXCol: { value: new THREE.Color(xcol) }, uHot: { value: 0 }, uRed: { value: 0 }, uSwell: { value: 0 } };
  const mk = (transparent) => {
    const m = new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.48, metalness: 0, sheen: 0.7, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffc9a8), clearcoat: 0.15, clearcoatRoughness: 0.5, transparent, depthWrite: !transparent, side: transparent ? THREE.FrontSide : THREE.FrontSide });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = "uniform float uSwell;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += objectNormal * uSwell;");
      sh.fragmentShader = "uniform float uX, uHot, uRed; uniform vec3 uXCol;\n" + sh.fragmentShader.replace("#include <dithering_fragment>", `#include <dithering_fragment>
        { float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(1.25, 0.55, 0.45), uRed);
          gl_FragColor.rgb += vec3(1.6, 1.4, 0.6) * fr * uHot;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uXCol * (0.06 + fr * 1.25), uX);
          gl_FragColor.a = mix(1.0, 0.05 + fr * 0.55, uX); }`);
    };
    m.customProgramCacheKey = () => "body" + transparent;
    H.studio(m); return m;
  };
  const skinMat = mk(false), xrayMat = mk(true);
  const meshes = []; fig.traverse((o) => { if (o.isSkinnedMesh) { o.material = skinMat; o.castShadow = o.receiveShadow = true; o.frustumCulled = false; meshes.push(o); } });

  // ---- inside: a group per organ, re-placed on its bone every frame
  const inner = new THREE.Group(); root.add(inner);
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8f3ff, roughness: 0.4, emissive: new THREE.Color(0x6fb6ff), emissiveIntensity: 0.25, transparent: true, opacity: 0.9 });
  const SEG = [["Hips", "Spine"], ["Spine", "Spine1"], ["Spine1", "Spine2"], ["Spine2", "Neck"], ["Neck", "Head"],
    ...["Left", "Right"].flatMap((s) => [[`${s}Shoulder`, `${s}Arm`], [`${s}Arm`, `${s}ForeArm`], [`${s}ForeArm`, `${s}Hand`], [`${s}Hand`, `${s}HandMiddle1`], [`${s}HandMiddle1`, `${s}HandMiddle3`], [`${s}Hand`, `${s}HandIndex1`], [`${s}HandIndex1`, `${s}HandIndex3`], [`${s}Hand`, `${s}HandPinky1`], [`${s}HandPinky1`, `${s}HandPinky3`], [`${s}HandThumb1`, `${s}HandThumb3`],
      ["Hips", `${s}UpLeg`], [`${s}UpLeg`, `${s}Leg`], [`${s}Leg`, `${s}Foot`], [`${s}Foot`, `${s}ToeBase`], [`${s}ToeBase`, `${s}Toe_End`], ["Spine2", `${s}Shoulder`]])];
  const skel = new THREE.InstancedMesh(new THREE.CapsuleGeometry(1, 1, 4, 10), boneMat, SEG.length); skel.frustumCulled = false; inner.add(skel);
  const skullMat = boneMat.clone(); skullMat.depthWrite = false; skullMat.opacity = 0.28; const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 20), skullMat); skull.scale.set(0.9, 1.05, 1.08); inner.add(skull);
  const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24, Math.PI), boneMat); inner.add(jaw);
  const ribs = new THREE.Group(); inner.add(ribs);
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.11 - Math.abs(i - 2.5) * 0.008, 0.005, 6, 32), boneMat); r.rotation.x = Math.PI / 2 + 0.35; r.position.y = 0.12 - i * 0.032; r.scale.set(1.1, 0.8, 1); ribs.add(r); }
  const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 32), boneMat); pelvis.scale.set(1.15, 0.7, 1); inner.add(pelvis);
  // organs
  const heartG = (() => { const g = new THREE.SphereGeometry(1, 48, 32), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y < 0) { const k = 1 + y * 0.55; x *= k; z *= k; y *= 1.35; }
      y += 0.28 * Math.exp(-((Math.abs(x) - 0.45) ** 2) / 0.09) * Math.max(0, y + 0.2); z *= 0.8; p.setXYZ(i, x, y, z); }
    g.computeVertexNormals(); return g; })();
  const heart = new THREE.Mesh(heartG, new THREE.MeshPhysicalMaterial({ color: 0xa3201c, roughness: 0.32, clearcoat: 0.7, emissive: new THREE.Color(0xff2a1a), emissiveIntensity: 0.15 }));
  const lungMat = new THREE.MeshPhysicalMaterial({ color: 0xf08a8a, roughness: 0.6, transparent: true, opacity: 0.55, emissive: new THREE.Color(0xff6a6a), emissiveIntensity: 0.12, depthWrite: false });
  const lungs = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), lungMat); m.userData.s = s; return m; });
  const brainG = (() => { const g = new THREE.SphereGeometry(1, 96, 64), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const f = 1 + 0.035 * Math.sin(v.x * 23 + Math.sin(v.y * 9) * 3) * Math.sin(v.z * 19 + v.y * 7) - (Math.abs(v.x) < 0.05 && v.y > 0 ? 0.08 : 0);
      p.setXYZ(i, v.x * f, v.y * f * 0.82, v.z * f * 1.18); } g.computeVertexNormals(); return g; })();
  const brain = new THREE.Mesh(brainG, new THREE.MeshPhysicalMaterial({ color: 0xe8a3a0, roughness: 0.45, clearcoat: 0.4, emissive: new THREE.Color(0xff8080), emissiveIntensity: 0.1 }));
  const organs = new THREE.Group(); organs.add(heart, ...lungs, brain); inner.add(organs);
  for (const m of [heart, brain]) H.studio(m.material); H.studio(lungMat); H.studio(boneMat); H.studio(skullMat);
  // nerves / vessels: dense glowing beads along paths through the bones (rebuilt every frame from the pose)
  const PATHS = [["HeadTop_End", "Head", "Neck", "Spine2", "Spine1", "Spine", "Hips"],
    ...["Left", "Right"].flatMap((s) => [["Spine2", `${s}Shoulder`, `${s}Arm`, `${s}ForeArm`, `${s}Hand`, `${s}HandMiddle3`], ["Hips", `${s}UpLeg`, `${s}Leg`, `${s}Foot`, `${s}ToeBase`]])];
  const NB = 900, beadsN = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.35), toneMapped: false }), NB);
  const beadsV = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.12, 0.1), toneMapped: false }), NB);
  beadsN.frustumCulled = beadsV.frustumCulled = false; inner.add(beadsN, beadsV);
  const pulses = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 6), toneMapped: false }), 160); pulses.frustumCulled = false; inner.add(pulses);
  // hair that stands up (static charge): thin strands on the scalp
  const NHAIR = 160, hair = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0012, 0.0025, 1, 4), new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.6 }), NHAIR); hair.frustumCulled = false; root.add(hair);
  H.reseed(321); const HD = Array.from({ length: NHAIR }, () => ({ a: H.rnd() * Math.PI * 2, b: Math.acos(1 - H.rnd() * 0.85), l: 0.04 + H.rnd() * 0.03 }));

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), wp = (n) => bones[n].getWorldPosition(new THREE.Vector3()), wq = (n) => bones[n].getWorldQuaternion(new THREE.Quaternion());
  const B = {
    root, fig, bones, mixer, clips, skinMat, xrayMat, meshes, inner, heart, lungs, brain, U, hair,
    pose: {}, breath: 0, beat: 0, swell: 0, hairUp: 0, x: 0, nerves: 0, vessels: 0, current: 0, currentPaths: null,
    /** play a clip at time t (or pass null to hold the bind pose) */
    clip(name, t) { if (!name) { for (const k in bones) bones[k].quaternion.copy(bind[k]); return; } mixer.stopAllAction(); mixer.clipAction(clips[name]).play(); mixer.setTime(t); },
    /** add rotations (deg, XYZ) on top of whatever the clip set */
    add(p, k = 1) { for (const n in p) { const [x, y, z] = p[n]; e.set(x * D2R * k, y * D2R * k, z * D2R * k); bones[n].quaternion.multiply(q.setFromEuler(e)); } },
    /** set rotations (deg) relative to the bind pose */
    set(p, k = 1) { for (const n in p) { const [x, y, z] = p[n]; e.set(x * D2R * k, y * D2R * k, z * D2R * k); bones[n].quaternion.copy(bind[n]).multiply(q.setFromEuler(e)); } },
    wp, wq,
    /** path points (world) for nerve path i */
    path(i) { return PATHS[i].map(wp); },
    PATHS,
    update(t) {
      fig.updateMatrixWorld(true);
      const xr = B.x; U.uX.value = xr; U.uSwell.value = B.swell;
      for (const m of meshes) m.material = xr > 0.001 ? xrayMat : skinMat;
      inner.visible = xr > 0.02;
      if (inner.visible) {
        boneMat.opacity = 0.85 * xr; boneMat.transparent = true; skullMat.opacity = 0.22 * xr;
        SEG.forEach(([a, b], i) => { const pa = wp(a), pb = wp(b), d = pb.clone().sub(pa), L = d.length(); const r = /Hand|Toe|Thumb|Index|Pinky|Middle/.test(b) ? 0.008 : /Spine|Neck|Hips/.test(a) ? 0.022 : 0.016;
          q.setFromUnitVectors(V(0, 1, 0), d.normalize()); m4.compose(pa.clone().lerp(pb, 0.5), q, V(r * 0.8, Math.max(0.001, L / 3), r * 0.8)); skel.setMatrixAt(i, m4); });
        skel.instanceMatrix.needsUpdate = true;
        const hq = wq("Head"), hp = wp("Head"), s2 = wp("Spine2"), s2q = wq("Spine2"), hip = wp("Hips"), hipq = wq("Hips");
        skull.position.copy(hp).add(V(0, 0.09, 0.01).applyQuaternion(hq)); skull.quaternion.copy(hq);
        jaw.position.copy(hp).add(V(0, 0.03, 0.05).applyQuaternion(hq)); jaw.quaternion.copy(hq).multiply(q.setFromEuler(e.set(Math.PI / 2 + 0.3, 0, Math.PI)));
        ribs.position.copy(s2).add(V(0, 0.0, 0.0).applyQuaternion(s2q)); ribs.quaternion.copy(s2q);
        pelvis.position.copy(hip).add(V(0, 0.02, 0).applyQuaternion(hipq)); pelvis.quaternion.copy(hipq).multiply(q.setFromEuler(e.set(Math.PI / 2 - 0.4, 0, 0)));
        const beat = 1 + 0.07 * B.beat;
        heart.position.copy(s2).add(V(0.025, -0.03, 0.06).applyQuaternion(s2q)); heart.quaternion.copy(s2q).multiply(q.setFromEuler(e.set(0.3, 0, -0.45))); heart.scale.setScalar(0.048 * beat);
        for (const l of lungs) { l.position.copy(s2).add(V(l.userData.s * 0.075, 0.01, 0.02).applyQuaternion(s2q)); l.quaternion.copy(s2q); const br = 1 + 0.12 * B.breath; l.scale.set(0.062 * br, 0.12 * (1 + 0.06 * B.breath), 0.07 * br); }
        brain.position.copy(hp).add(V(0, 0.105, 0.005).applyQuaternion(hq)); brain.quaternion.copy(hq); brain.scale.setScalar(0.078);
        // beads
        const put = (mesh, on, off) => {
          let n = 0;
          if (on > 0.01) for (let pi = 0; pi < PATHS.length; pi++) { const pts = PATHS[pi].map(wp); const cv = new THREE.CatmullRomCurve3(pts); const len = cv.getLength(); const cnt = Math.min(NB - n, Math.round(len * 120));
            for (let k = 0; k < cnt; k++) { const u = k / Math.max(1, cnt - 1); const p = cv.getPointAt(u); p.add(V(off, off * 0.3, off * 0.6)); const s = 0.0035 * on; m4.makeScale(s, s, s).setPosition(p); mesh.setMatrixAt(n++, m4); } }
          for (; n < NB; n++) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(n, m4); }
          mesh.instanceMatrix.needsUpdate = true;
        };
        put(beadsN, B.nerves, 0.012); put(beadsV, B.vessels, -0.012);
      }
      // current pulses travelling along chosen paths (indices into PATHS), each as a train of bright beads
      let n = 0;
      if (B.current > 0.01 && B.currentPaths) for (const [pi, dir, speed, phase] of B.currentPaths) {
        const pts = (typeof pi === "number" ? PATHS[pi].map(wp) : pi.map(wp)); if (dir < 0) pts.reverse(); const cv = new THREE.CatmullRomCurve3(pts);
        for (let k = 0; k < 10 && n < 160; k++) { const u = ((t * speed + phase + k * 0.1) % 1 + 1) % 1; const p = cv.getPointAt(u); const s = 0.007 * B.current * (0.6 + 0.4 * Math.sin(k * 2.1 + t * 40)); m4.makeScale(s, s, s).setPosition(p); pulses.setMatrixAt(n++, m4); }
      }
      for (; n < 160; n++) { m4.makeScale(0, 0, 0); pulses.setMatrixAt(n, m4); }
      pulses.instanceMatrix.needsUpdate = true; pulses.visible = B.current > 0.01;
      // hair
      hair.visible = B.hairUp > 0.05;
      if (hair.visible) { const hp = wp("Head"), hq = wq("Head"); const c = hp.clone().add(V(0, 0.1, 0.0).applyQuaternion(hq));
        HD.forEach((h, i) => { const dir = V(Math.sin(h.b) * Math.cos(h.a), Math.cos(h.b), Math.sin(h.b) * Math.sin(h.a) * 1.1).applyQuaternion(hq); const base = c.clone().addScaledVector(dir, 0.092);
          const up = dir.clone().lerp(V(0, 1, 0).add(dir.clone().multiplyScalar(0.6)).normalize(), B.hairUp).normalize(); const L = h.l * (0.35 + 0.65 * B.hairUp);
          q.setFromUnitVectors(V(0, 1, 0), up); m4.compose(base.addScaledVector(up, L / 2), q, V(1, L, 1)); hair.setMatrixAt(i, m4); });
        hair.instanceMatrix.needsUpdate = true; }
    },
  };
  return B;
}
