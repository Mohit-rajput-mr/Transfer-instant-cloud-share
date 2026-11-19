// Real human anatomy for the HD films: BodyParts3D 4.0 adult male (© Database Center for Life Science, CC BY 4.0;
// browser packing from github.com/ashemag/human-atlas, see models/anatomy/ATTRIBUTION.md). 2,234 real meshes: skin, hair,
// eyes, 296 bones, heart, bronchial tree, brain, nerves, arteries, veins, muscles. Metres, Y up, facing +Z, feet at y = 0.
// Posing: a 15-bone skeleton (pelvis, chest, head, arms, legs) placed on the real joints; every vertex of every layer is
// skinned to its two nearest bones (distance / bone radius), so skin, bones, organs and vessels always move together.
//   const A = standardLayers(await loadAnatomy()); scene.add(A.root); A.setPose({ shL: [0, 0, 40] }) (deg, XYZ at the joint)
import { THREE, H } from "./hd.js";
const { V } = H;

async function gunzip(url) {
  const r = await fetch(url); const ds = r.body.pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}

// ---- skeleton on the real joints (rest pose, metres)
const JP = {
  pelvis: V(0, 0.93, -0.02), chest: V(0, 1.18, -0.03), neck: V(0, 1.46, -0.035), top: V(0, 1.72, 0.0),
  shL: V(0.185, 1.395, -0.028), elL: V(0.235, 1.11, -0.022), wrL: V(0.255, 0.875, 0.0), tipL: V(0.27, 0.69, 0.02),
  hipL: V(0.09, 0.9, -0.02), knL: V(0.075, 0.455, -0.012), anL: V(0.08, 0.075, -0.03), toeL: V(0.09, 0.01, 0.15),
};
for (const k of Object.keys(JP)) if (k.endsWith("L")) JP[k.slice(0, -1) + "R"] = JP[k].clone().setX(-JP[k].x);
// [name, from, to, parent, radius]
export const BONES = [
  ["pelvis", "pelvis", "chest", -1, 0.13], ["chest", "chest", "neck", 0, 0.13], ["head", "neck", "top", 1, 0.1],
  ["shL", "shL", "elL", 1, 0.05], ["elL", "elL", "wrL", 3, 0.042], ["wrL", "wrL", "tipL", 4, 0.06],
  ["shR", "shR", "elR", 1, 0.05], ["elR", "elR", "wrR", 6, 0.042], ["wrR", "wrR", "tipR", 7, 0.06],
  ["hipL", "hipL", "knL", 0, 0.075], ["knL", "knL", "anL", 9, 0.055], ["anL", "anL", "toeL", 10, 0.045],
  ["hipR", "hipR", "knR", 0, 0.075], ["knR", "knR", "anR", 12, 0.055], ["anR", "anR", "toeR", 13, 0.045],
];
const NBONE = BONES.length;
const segD = (p, a, b) => { const ab = b.clone().sub(a), t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
/** two nearest bones (normalised by radius) and their blend weights */
function weigh(p) {
  let b0 = 0, s0 = 1e9, b1 = 0, s1 = 1e9;
  for (let i = 0; i < NBONE; i++) {
    const [, f, t, , rad] = BONES[i];
    // keep sides apart: a left bone never takes a vertex on the far right and vice versa
    if ((f.endsWith("L") && p.x < -0.03) || (f.endsWith("R") && p.x > 0.03)) continue;
    const isArm = /^(sh|el|wr)/.test(BONES[i][0]), ax = Math.abs(p.x);
    if (isArm && (ax < 0.13 || (ax < 0.172 && p.y < 1.25))) continue;                         // torso never follows an arm
    if (!isArm && ax > 0.195 && p.y < 1.33 && p.y > 0.6) continue; // the arm never stays with the torso / legs
    const s = segD(p, JP[f], JP[t]) / rad;
    if (s < s0) { b1 = b0; s1 = s0; b0 = i; s0 = s; } else if (s < s1) { b1 = i; s1 = s; }
  }
  // blend only near the boundary between the two
  const k = Math.exp(-(s1 - s0) * 3.0), w1 = 0.5 * k, w0 = 1 - w1;
  return [b0, b1, w0, w1];
}

const SKIN_GLSL = `
uniform mat4 uB[${NBONE}];
attribute vec2 aBi; attribute vec2 aBw;
varying vec3 vRest;
void skinP(inout vec3 p, inout vec3 n){
  mat4 M = uB[int(aBi.x)] * aBw.x + uB[int(aBi.y)] * aBw.y;
  p = (M * vec4(p, 1.0)).xyz; n = normalize(mat3(M) * n);
}`;

export async function loadAnatomy() {
  const atlas = await (await fetch("kit/models/anatomy/atlas.json")).json();
  const bins = await Promise.all(atlas.chunks.map((c, i) => gunzip(`kit/models/anatomy/body-${i}.bin.gz`)));
  const bm = Array.from({ length: NBONE }, () => new THREE.Matrix4());
  const uni = { uB: { value: bm } };
  const extra = { uX: { value: 0 }, uXCol: { value: new THREE.Color(0x7fd4ff) }, uHot: { value: 0 }, uRed: { value: 0 }, uSwell: { value: 0 }, uT: { value: 0 }, uCloth: { value: 1 },
    uPulse: { value: new THREE.Vector4(0, 0, 0, 1) } /* travelling glow front: y (m), width, strength, direction ±1 */,
    uPulse2: { value: new THREE.Vector4(0, 0, 0, 1) },
    uLegP: { value: new THREE.Vector2(-9, 0) } /* current up one leg and down the other: path coord, strength */,
    uBeat: { value: 0 }, uBreath: { value: 0 }, uHairUp: { value: 0 }, uMed: { value: 0 },
    uDecal: { value: null }, uDecalR: { value: new THREE.Vector4(-0.2, 1.0, 0.4, 0.45) }, uDecalK: { value: 0 },
    uShoesOn: { value: 1 }, uShoeL: { value: new THREE.Vector4() }, uShoeR: { value: new THREE.Vector4() } };
  const root = new THREE.Group();

  function geom(parts) {
    let nv = 0, ni = 0; for (const p of parts) { nv += p.vertexCount; ni += p.indexCount; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni), bi = new Float32Array(nv * 2), bw = new Float32Array(nv * 2);
    let ov = 0, oi = 0; const v = V(0, 0, 0);
    for (const p of parts) {
      const b = bins[p.chunk].buffer, off = bins[p.chunk].byteOffset;
      pos.set(new Float32Array(b, off + p.positions, p.vertexCount * 3), ov * 3);
      const n16 = new Int16Array(b, off + p.normals, p.vertexCount * 3); for (let i = 0; i < n16.length; i++) nor[ov * 3 + i] = n16[i] / 32767;
      const ix = new Uint32Array(b, off + p.indices, p.indexCount); for (let i = 0; i < ix.length; i++) idx[oi + i] = ix[i] + ov;
      ov += p.vertexCount; oi += p.indexCount;
    }
    for (let i = 0; i < nv; i++) { v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); const [a, c, wa, wc] = weigh(v); bi[i * 2] = a; bi[i * 2 + 1] = c; bw[i * 2] = wa; bw[i * 2 + 1] = wc; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("aBi", new THREE.BufferAttribute(bi, 2)); g.setAttribute("aBw", new THREE.BufferAttribute(bw, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); return g;
  }

  // clothing regions in the rest pose (t-shirt + shorts); the skin under them is not drawn (the cloth shell is)
  const CLOTH = `float ax = abs(vRest.x);
    float shorts = step(0.62, vRest.y) * (1.0 - step(1.0, vRest.y)) * (1.0 - step(0.19, ax));
    float neckTop = ax < 0.075 ? 1.435 - 0.04 * step(0.0, vRest.z) * (1.0 - smoothstep(0.035, 0.075, ax)) : 1.7; float shirt = step(0.99, vRest.y) * (1.0 - step(neckTop, vRest.y)) * (1.0 - step(0.155, ax) * (1.0 - step(1.215, vRest.y)));`;
  const NOISE = `float hsh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hsh(i), hsh(i + vec3(1,0,0)), f.x), mix(hsh(i + vec3(0,1,0)), hsh(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hsh(i + vec3(0,0,1)), hsh(i + vec3(1,0,1)), f.x), mix(hsh(i + vec3(0,1,1)), hsh(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
  const VERT = (s, offset = "0.0") => SKIN_GLSL + "\nuniform float uSwell, uBeat, uBreath, uHairUp; uniform vec4 uShoeL, uShoeR;\n" + s
    .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n vec3 bp = position; vec3 bn = objectNormal; vRest = position; skinP(bp, bn); objectNormal = bn;")
    .replace("#include <begin_vertex>", `vec3 transformed = bp + objectNormal * (uSwell + ${offset});
    #ifdef SHOES
      { vec4 f = position.x > 0.0 ? uShoeL : uShoeR; vec3 c = vec3(sign(position.x) * 0.085, 0.05, 0.03); float co = cos(f.w), si = sin(f.w);
        vec3 d = transformed - c; d = vec3(d.x, d.y * co - d.z * si, d.y * si + d.z * co); transformed = c + d + f.xyz; }
    #endif`);
  /** patch a material: skinning in the vertex shader + optional fragment code. hooks: { color, rough, normal, post } */
  function patch(m, key, hk = {}) {
    if (hk.defines) m.defines = { ...(m.defines || {}), ...hk.defines };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni, extra);
      sh.vertexShader = VERT(sh.vertexShader, hk.offset || "0.0");
      let f = sh.fragmentShader;
      if (hk.color) f = f.replace("#include <color_fragment>", "#include <color_fragment>\n" + (hk.mask ? CLOTH + (key === "shirt" ? "if (shirt < 0.5) discard;" : "if (shorts < 0.5) discard;") : "") + hk.color);
      if (hk.rough) f = f.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n" + hk.rough);
      if (hk.normal) f = f.replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + hk.normal);
      if (hk.post) f = f.replace("#include <dithering_fragment>", "#include <dithering_fragment>\n" + hk.post);
      sh.fragmentShader = `varying vec3 vRest; uniform float uX, uHot, uRed, uT, uCloth, uDecalK, uMed; uniform vec3 uXCol; uniform vec4 uPulse, uPulse2, uDecalR; uniform vec2 uLegP; uniform sampler2D uDecal; uniform float uShoesOn;\n${NOISE}\n` + f;
    };
    m.customProgramCacheKey = () => "anat|" + key;
    return m;
  }
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, uni, extra);
    sh.vertexShader = SKIN_GLSL + "\n" + sh.vertexShader.replace("#include <begin_vertex>", "vec3 bp = position; vec3 bn = normal; vRest = position; skinP(bp, bn); vec3 transformed = bp;"); };
  depthMat.customProgramCacheKey = () => "anatdepth";

  // a travelling glow (current) along the rest-pose height: used for electricity / oxygen / heat fronts
  const PULSE = `{ float d = (vRest.y - uPulse.x) * uPulse.w; gl_FragColor.rgb += vec3(1.7, 1.9, 3.4) * exp(-d * d / max(1e-5, uPulse.y * uPulse.y)) * uPulse.z;
                   float d2 = (vRest.y - uPulse2.x) * uPulse2.w; gl_FragColor.rgb += vec3(1.7, 1.9, 3.4) * exp(-d2 * d2 / max(1e-5, uPulse2.y * uPulse2.y)) * uPulse2.z;
                   if (vRest.y < 0.95 && abs(vRest.x) < 0.2) { float sc = vRest.x > 0.0 ? vRest.y : 1.9 - vRest.y; float dl = sc - uLegP.x; gl_FragColor.rgb += vec3(1.7, 1.9, 3.4) * exp(-dl * dl / 0.004) * uLegP.y; } }`;
  const skinHooks = {
    color: `${CLOTH}
      if (((shorts + shirt) * uCloth > 0.5 || (vRest.y < 0.1 && uShoesOn > 0.5)) && uX < 0.01) discard;
      float pore = vn(vRest * 1400.0) * 0.5 + vn(vRest * 320.0) * 0.3 + vn(vRest * 60.0) * 0.2;
      diffuseColor.rgb *= 0.9 + pore * 0.16;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 0.86, 0.84), smoothstep(0.5, 0.8, vn(vRest * 18.0)) * 0.35); // blotches
      if (uDecalK > 0.0 && vRest.z > 0.0) { vec2 uv = (vRest.xy - uDecalR.xy) / uDecalR.zw; if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) { vec4 dc = texture2D(uDecal, uv); diffuseColor.rgb = mix(diffuseColor.rgb, dc.rgb, dc.a * uDecalK); } }
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.3, 0.27), smoothstep(1.52, 1.53, vRest.y) * (1.0 - smoothstep(1.535, 1.545, vRest.y)) * step(0.06, vRest.z) * (1.0 - step(0.03, ax)) * 0.4);`,
    normal: `normal = normalize(normal + (vec3(vn(vRest * 1400.0), vn(vRest * 1400.0 + 7.1), vn(vRest * 1400.0 + 3.3)) - 0.5) * 0.12);`,
    post: `{ float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
       gl_FragColor.rgb += vec3(0.3, 0.05, 0.03) * fr * (1.0 - uX);
       gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(1.35, 0.55, 0.45), uRed);
       gl_FragColor.rgb += vec3(1.5, 1.6, 2.6) * fr * uHot;
       ${PULSE}
       gl_FragColor.rgb = mix(gl_FragColor.rgb, uXCol * (0.05 + fr * 1.1), uX);
       gl_FragColor.a = mix(1.0, 0.04 + fr * 0.5, uX); }`,
  };
  const skinBase = { color: 0xbf8a6e, roughness: 0.5, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffb393), clearcoat: 0.1, clearcoatRoughness: 0.55 };
  const skin = patch(new THREE.MeshPhysicalMaterial(skinBase), "skin", skinHooks);
  const xskin = patch(new THREE.MeshPhysicalMaterial({ ...skinBase, transparent: true, depthWrite: false }), "xskin", skinHooks);
  const cloth = (col, key, weave = 2200) => patch(new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.92, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(col).multiplyScalar(1.6) }), key, {
    offset: "0.0",
    color: `float wv = 0.86 + 0.14 * (0.5 + 0.5 * sin(vRest.x * ${weave}.0 + vRest.z * ${weave}.0)) * (0.5 + 0.5 * sin(vRest.y * ${weave}.0)); diffuseColor.rgb *= wv * (0.92 + 0.16 * vn(vRest * 90.0));`,
    normal: `normal = normalize(normal + (vec3(vn(vRest * vec3(60.0, 22.0, 60.0)), vn(vRest * vec3(60.0, 22.0, 60.0) + 5.0), vn(vRest * 40.0 + 2.0)) - 0.5) * 0.35);`,
    post: `gl_FragColor.a = 1.0 - uX; ${PULSE}`,
    mask: true,
  });
  const shirtM = cloth(0x39424d, "shirt"), shortsM = cloth(0x141a24, "shorts", 2600); shirtM.transparent = shortsM.transparent = true;
  const hairM = patch(new THREE.MeshPhysicalMaterial({ color: 0x24170e, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0x7a5535), sheenRoughness: 0.3, transparent: true }), "hair", { offset: "uHairUp * (0.012 + 0.03 * max(0.0, objectNormal.y))",
    color: `diffuseColor.rgb *= 0.7 + 0.6 * vn(vRest * vec3(5000.0, 400.0, 5000.0));`,
    normal: `normal = normalize(normal + (vec3(vn(vRest * vec3(3000.0, 200.0, 3000.0)), 0.5, vn(vRest * vec3(3000.0, 200.0, 3000.0) + 4.0)) - 0.5) * 0.5);`, post: `gl_FragColor.a = 1.0 - uX;` });
  const tissue = (col, key, o = {}, grain = "300.0", offset = "0.0") => patch(new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, ...o }), key, {
    offset, color: `diffuseColor.rgb *= 0.86 + 0.28 * vn(vRest * ${grain});`, post: PULSE });
  const mat = {
    skin, xskin, shirt: shirtM, shorts: shortsM, hair: hairM,
    bone: patch(new THREE.MeshPhysicalMaterial({ color: 0xe6dcc3, roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5 }), "bone", {
      color: `diffuseColor.rgb *= 0.84 + 0.16 * vn(vRest * 220.0) + 0.08 * vn(vRest * 1500.0); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.68, 0.5), smoothstep(0.55, 0.9, vn(vRest * 25.0)) * 0.3);`,
      normal: `normal = normalize(normal + (vec3(vn(vRest * 900.0), vn(vRest * 900.0 + 3.0), vn(vRest * 900.0 + 6.0)) - 0.5) * 0.18);`, post: PULSE }),
    heart: tissue(0x8a1915, "heart", { emissive: new THREE.Color(0x2a0303) }, "vec3(260.0, 900.0, 260.0)", "uBeat * 0.0035"),
    medulla: tissue(0xd6a59c, "medulla", { emissive: new THREE.Color(0xff2010), emissiveIntensity: 0 }, "500.0"),
    shoes: patch(new THREE.MeshPhysicalMaterial({ color: 0x24262b, roughness: 0.55, clearcoat: 0.3, sheen: 0.4, sheenColor: new THREE.Color(0x667080) }), "shoes", {
      defines: { SHOES: 1 }, color: `float sole = 1.0 - smoothstep(0.012, 0.018, vRest.y); diffuseColor.rgb = mix(diffuseColor.rgb * (0.9 + 0.2 * vn(vRest * 700.0)), vec3(0.85, 0.84, 0.8), sole);
        float lace = step(0.0, vRest.z) * smoothstep(0.05, 0.06, vRest.y) * (1.0 - smoothstep(0.085, 0.09, vRest.y)) * step(0.5, fract(vRest.z * 90.0)) * (1.0 - step(0.018, abs(abs(vRest.x) - 0.085)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9), lace);`, post: `gl_FragColor.a = 1.0 - uX;` }),
    artery: tissue(0xb01f19, "art", { emissive: new THREE.Color(0x250000) }),
    vein: tissue(0x283c94, "vein", { emissive: new THREE.Color(0x00040f) }),
    nerve: tissue(0xf0cf72, "nerve", { emissive: new THREE.Color(0x221a00) }, "vec3(80.0, 800.0, 80.0)"),
    brain: tissue(0xd6a59c, "brain", { roughness: 0.5, emissive: new THREE.Color(0x140505) }, "500.0"),
    lung: tissue(0xe8a19c, "lung", {}, "300.0", "uBreath * 0.0025"),
    muscle: tissue(0x8c2a21, "muscle", { roughness: 0.42 }, "vec3(110.0, 1400.0, 110.0)"),
    eye: patch(new THREE.MeshPhysicalMaterial({ color: 0xe9e2d8, roughness: 0.25, clearcoat: 1 }), "eye", { color: `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.45, 0.42), smoothstep(0.6, 0.95, vn(vRest * 2500.0)) * 0.25);` }),
    cornea: patch(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.08, depthWrite: false }), "cornea", {}),
    iris: patch(new THREE.MeshPhysicalMaterial({ color: 0x4a3220, roughness: 0.3, clearcoat: 1 }), "iris", { color: `{ vec2 c = vRest.xy - vec2(sign(vRest.x) * 0.0298, 1.5958); diffuseColor.rgb *= (0.7 + 0.6 * vn(vec3(atan(c.y, c.x) * 20.0, length(c) * 900.0, 0.0))) * smoothstep(0.0019, 0.0027, length(c)); }` }),
    organ: tissue(0xb3645a, "organ"),
  };
  for (const m of Object.values(mat)) H.studio(m);

  const layers = {};
  // bone matrices from a pose: { bone: [x, y, z] deg } rotations at each bone's root joint, parent first
  const local = Array.from({ length: NBONE }, () => new THREE.Matrix4()), tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const A = {
    atlas, parts: atlas.parts, root, extra, mat, layers, JP, BONES, pose: {},
    layer(name, filter, material, build) {
      const ps = atlas.parts.filter(filter); if (!ps.length) { console.log("no parts for", name); return null; }
      let g = geom(ps); if (build) g = build(g);
      const m = new THREE.Mesh(g, material); m.name = name; m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.userData.parts = ps; m.customDepthMaterial = depthMat;
      root.add(m); layers[name] = m; return m;
    },
    setPose(p = {}) {
      A.pose = p; const d = Math.PI / 180;
      BONES.forEach(([n, f, , par], i) => {
        const r = p[n] || [0, 0, 0], j = JP[f];
        e.set(r[0] * d, r[1] * d, r[2] * d); q.setFromEuler(e);
        local[i].makeTranslation(j.x, j.y, j.z).multiply(tmp.makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-j.x, -j.y, -j.z));
        bm[i].copy(par < 0 ? local[i] : bm[par].clone().multiply(local[i]));
      });
    },
    /** a rest-space point carried by the pose (for callouts, particles, sparks), in world space */
    at(v) { const [a, c, wa, wc] = weigh(v); const p = v.clone().applyMatrix4(bm[a]).multiplyScalar(wa).add(v.clone().applyMatrix4(bm[c]).multiplyScalar(wc)); return root.localToWorld(p); },
    find: (name) => atlas.parts.filter((p) => p.name === name),
    center(name) { const ps = A.find(name); if (!ps.length) return V(0, 1, 0); let a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9]; for (const p of ps) for (let i = 0; i < 3; i++) { a[i] = Math.min(a[i], p.bounds[0][i]); b[i] = Math.max(b[i], p.bounds[1][i]); } return V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); },
    /** x-ray: skin + clothes turn to blue glass, the insides show */
    xray(k, inside = ["skeleton", "heart", "lungs", "brain", "medulla", "nerves", "arteries", "veins"]) {
      extra.uX.value = k; const s = layers.skin; if (s) s.material = k > 0.001 ? xskin : skin;
      for (const n of ["hair", "shirt", "shorts", "cornea", "shoes"]) if (layers[n]) layers[n].visible = k < 0.6;
      for (const n of inside) if (layers[n]) layers[n].visible = k > 0.02;
    },
    pulse(y, width, strength, dir = 1, which = 1) { (which === 1 ? extra.uPulse : extra.uPulse2).value.set(y, width, strength, dir); },
  };
  A.setPose({});
  return A;
}

/** clothes: skin triangles inside a region, pushed out along the normal (shorts: the front bulge smoothed flat) */
function shell(g, region, push, flatten) {
  const pos = g.attributes.position.array, nor = g.attributes.normal.array, idx = g.index.array;
  const keep = []; const v = V(0, 0, 0);
  for (let i = 0; i < idx.length; i += 3) { let ok = false; for (let k = 0; k < 3; k++) { const j = idx[i + k]; v.set(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]); if (region(v)) { ok = true; break; } } if (ok) keep.push(idx[i], idx[i + 1], idx[i + 2]); }
  const p2 = new Float32Array(pos.length);
  for (let j = 0; j < pos.length / 3; j++) { v.set(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]); const n = V(nor[j * 3], nor[j * 3 + 1], nor[j * 3 + 2]); v.addScaledVector(n, push(v)); if (flatten) flatten(v); p2[j * 3] = v.x; p2[j * 3 + 1] = v.y; p2[j * 3 + 2] = v.z; }
  const o = g.clone(); o.setAttribute("position", new THREE.BufferAttribute(p2, 3)); o.setIndex(keep); o.computeVertexNormals();
  // the cloth keeps rest coordinates for its pattern: use the original positions for vRest via skinning attributes (same)
  return o;
}

/** the standard layers a film uses */
export function standardLayers(A, { clothes = true, inside = true } = {}) {
  const P = (s) => (p) => p.system === s;
  A.layer("skin", (p) => p.name === "Skin" || p.name === "Lip", A.mat.skin);
  if (clothes) {
    const ax = (v) => Math.abs(v.x);
    A.layer("shorts", (p) => p.name === "Skin", A.mat.shorts, (g) => shell(g, (v) => v.y > 0.615 && v.y < 1.005 && ax(v) < 0.195, (v) => 0.012 + (v.y < 0.66 ? 0.006 : 0),
      (v) => { if (ax(v) < 0.075 && v.y > 0.7 && v.y < 0.93 && v.z > 0.035) v.z = 0.035 + (v.z - 0.035) * 0.22; }));
    A.layer("shirt", (p) => p.name === "Skin", A.mat.shirt, (g) => shell(g, (v) => v.y > 0.985 && (ax(v) > 0.075 || v.y < 1.44) && v.y < 1.6 && !(ax(v) > 0.155 && v.y < 1.21), (v) => 0.01 + 0.006 * Math.max(0, 1.2 - v.y) * 4));
  }
 if (clothes) A.layer("shoes", (p) => p.name === "Skin", A.mat.shoes, (g) => shell(g, (v) => v.y < 0.105, (v) => 0.009 + Math.max(0, 0.02 - v.y) * 0.4, (v) => { if (v.y < 0.012) v.y = Math.max(v.y - 0.012, -0.002); }));
  A.layer("hair", (p) => p.name === "Hair of head" || p.name === "Eyebrow", A.mat.hair);
  A.layer("eyes", (p) => /sclera/i.test(p.name), A.mat.eye);
  A.layer("cornea", (p) => /cornea/i.test(p.name), A.mat.cornea);
  A.layer("iris", (p) => /iris/i.test(p.name), A.mat.iris);
  if (inside) {
  A.layer("skeleton", (p) => p.system === "skeletal" && !/gingiva/i.test(p.name), A.mat.bone);
  A.layer("heart", (p) => p.system === "cardiac" && /wall|valve|leaflet|cusp/i.test(p.name), A.mat.heart);
  A.layer("lungs", (p) => p.system === "respiratory" && /bronch|trachea/i.test(p.name), A.mat.lung);
  A.layer("brain", (p) => p.system === "nervous" && !/nerve|ganglion|branch/i.test(p.name) && !/^(Medulla oblongata|Pons)$/.test(p.name), A.mat.brain);
  A.layer("medulla", (p) => /^(Medulla oblongata|Pons)$/.test(p.name), A.mat.medulla);
  A.layer("nerves", (p) => p.system === "nervous" && /nerve|ganglion|branch/i.test(p.name), A.mat.nerve);
  A.layer("arteries", P("arterial"), A.mat.artery);
  A.layer("veins", P("venous"), A.mat.vein);
  }
  A.xray(0);
  return A;
}
