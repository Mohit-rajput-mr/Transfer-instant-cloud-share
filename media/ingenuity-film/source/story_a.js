// Wright Brothers Field: NASA's Ingenuity Mars helicopter (NASA's own 3D model, NASA 3D Resources, free and without copyright).
// Facts (Wikipedia: Ingenuity (helicopter)): 1.8 kg; a small piece of the 1903 Wright Flyer's wing cloth attached under its
// solar panel; Mars air ~1/100 of Earth's sea-level density, like ~87,000 ft (26.5 km), never reached by existing helicopters;
// blades 2,400–2,900 rpm, about 10× what Earth needs; coaxial contra-rotating rotors (~1.2 m); radio delays of minutes →
// autonomous flight plans; first flight 19 April 2021: a ~40 s hover at 3 m — the first powered, controlled flight on another
// world; the airstrip was named Wright Brothers Field; planned 5 flights, flew 72; blades broken on flight 72, 18 Jan 2024;
// it communicated with Earth through the Perseverance rover.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "./kit/lib/jsm/loaders/DRACOLoader.js";
import { makePhone, makeLaptop, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const hash = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
H.floor.visible = false; H.backdrop.visible = false;
function camRange(near, far) { if (H.cam.near !== near || H.cam.far !== far) { H.cam.near = near; H.cam.far = far; H.cam.updateProjectionMatrix(); } }
const NOISE = `
float hh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float nz(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hh(i), hh(i + vec3(1,0,0)), f.x), mix(hh(i + vec3(0,1,0)), hh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hh(i + vec3(0,0,1)), hh(i + vec3(1,0,1)), f.x), mix(hh(i + vec3(0,1,1)), hh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * nz(p); p = p * 2.03 + 3.1; a *= 0.5; } return s; }`;


// =====================================================================================================================
// INGENUITY: NASA's model; each rotor re-parented to a pivot on the mast so it can spin (top and bottom counter-rotate)
// =====================================================================================================================
const ING = new THREE.Group(); scene.add(ING);
const dl = new DRACOLoader(); dl.setDecoderPath("kit/lib/jsm/libs/draco/gltf/"); const gld = new GLTFLoader(); gld.setDRACOLoader(dl);
const gi = await gld.loadAsync("kit/models/ingenuity/ingenuity-nasa.glb"); ING.add(gi.scene); gi.scene.position.y = 0.026; gi.scene.updateMatrixWorld(true);
gi.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.side = THREE.DoubleSide; } });
const rotorNode = (n) => { let r = null; gi.scene.traverse((o) => { if (!r && o.name === n) r = o; }); return r; };
const PIV = ["rotors_01", "rotors_02"].map((n, i) => { const node = rotorNode(n); const b = new THREE.Box3().setFromObject(node); const c = b.getCenter(V()); const piv = new THREE.Group(); piv.position.set(-0.0018, c.y, 0.0003); ING.add(piv); ING.updateMatrixWorld(true); piv.attach(node);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 64), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uA: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uK, uA; varying vec2 vP; void main(){ float r = length(vP); float a = atan(vP.y, vP.x) - uA; float b = pow(abs(cos(a)), 30.0); gl_FragColor = vec4(vec3(0.16, 0.16, 0.18), uK * (0.16 + 0.3 * b) * smoothstep(0.6, 0.55, r) * smoothstep(0.03, 0.08, r)); }` }));
  disc.rotation.x = -Math.PI / 2; piv.add(disc); return { piv, node, disc, dir: i ? -1 : 1 }; });
const blades = []; PIV.forEach((p) => p.node.traverse((o) => { if (o.isMesh) blades.push(o); }));
/** rpm: 0 … 2900; blur > ~300 rpm */
function rotors(t, rpm) { const rps = rpm / 60; const fast = clamp((rpm - 200) / 900); PIV.forEach((p) => { const a = (rpm > 1200 ? (t * 7.3) % TAU : t * rps * TAU) * p.dir; p.piv.rotation.y = a; p.disc.material.uniforms.uK.value = fast; p.disc.material.uniforms.uA.value = a; });
  blades.forEach((m) => { m.material.transparent = fast > 0.05; m.material.opacity = 1 - 0.7 * fast; m.material.depthWrite = fast < 0.5; }); }
const IL = (x, y, z) => ING.localToWorld(V(x, y, z));
// the Wright Flyer cloth swatch (stamp-sized) on the cable under the solar panel — a small muslin patch
const CLOTH = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0xe8dfca, roughness: 0.9, side: THREE.DoubleSide })); CLOTH.position.set(0.0, 0.505, 0.06); CLOTH.rotation.x = -Math.PI / 2 + 0.3; ING.add(CLOTH);

// =====================================================================================================================
// JEZERO CRATER (generic Mars ground): rusty regolith, scattered rocks, a far crater rim, butterscotch sky, thin dust
// =====================================================================================================================
const MARS = new THREE.Group(); scene.add(MARS);
const SUN = V(0.45, 0.55, 0.7).normalize();
const skyM = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; varying vec3 vD; void main(){ vec3 d = normalize(vD); float h = max(d.y, 0.0); vec3 hor = vec3(0.86, 0.66, 0.48), zen = vec3(0.55, 0.36, 0.24);
    vec3 c = mix(hor, zen, pow(h, 0.5)); float sd = max(dot(d, uSun), 0.0); c = mix(c, vec3(0.75, 0.82, 0.9), pow(sd, 8.0) * 0.6); c += vec3(1.0, 0.97, 0.9) * pow(sd, 1400.0) * 4.0;
    if (d.y < 0.0) c = hor * 0.8; gl_FragColor = vec4(c, 1.0); }` }));
skyM.renderOrder = -10; skyM.frustumCulled = false; MARS.add(skyM);
const MFOG = new THREE.FogExp2(0xc99a72, 0.0045);
function marsH(x, z) { const r = Math.hypot(x, z); let h = Math.sin(x * 0.07 + 1.1) * Math.cos(z * 0.05) * 0.4 + Math.sin(x * 0.21 - z * 0.13) * 0.12 + Math.sin(x * 0.9 + z * 0.7) * 0.03;
  h *= smooth(clamp((r - 4) / 20)); h += 60 * smooth(clamp((r - 420) / 160)); return h; }
{ const g = new THREE.PlaneGeometry(1600, 1600, 300, 300); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, marsH(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 160, 160), normalMap: tex("kit/ph/brown_mud_dry/brown_mud_dry_nor_gl_1k.jpg", false, 220, 220), normalScale: new THREE.Vector2(0.8, 0.8), color: 0xa86a48, roughness: 0.96 });
  const ground = new THREE.Mesh(g, mat); ground.receiveShadow = true; MARS.add(ground); }
// rocks: Poly Haven boulder, instanced, rust-tinted
const BOUL = await new GLTFLoader().loadAsync("kit/ph/boulder_01/boulder_01_1k.gltf"); let bgeo = null, bmat = null; BOUL.scene.traverse((o) => { if (o.isMesh && !bgeo) { bgeo = o.geometry; bmat = o.material; } });
bmat = bmat.clone(); bmat.color = new THREE.Color(0xc07a52);
{ const N = 1400, IM = new THREE.InstancedMesh(bgeo, bmat, N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const bb = new THREE.Box3().setFromBufferAttribute(bgeo.attributes.position); const bs = bb.getSize(V()).length();
  for (let i = 0; i < N; i++) { const a = hash(i) * TAU, r = 2.2 + Math.pow(hash(i + 1), 1.6) * 160; const x = Math.cos(a) * r, z = Math.sin(a) * r; const s = (0.03 + Math.pow(hash(i + 2), 4) * 0.5) / bs * (r < 6 ? 0.5 : 1);
    q.setFromEuler(new THREE.Euler(hash(i + 3) * 3, hash(i + 4) * 6, hash(i + 5) * 3)); m4.compose(V(x, marsH(x, z) - s * bs * 0.25, z), q, V(s, s * 0.7, s)); IM.setMatrixAt(i, m4); }
  IM.castShadow = IM.receiveShadow = true; MARS.add(IM); }
// dust kicked by the rotor downwash: a ring of soft particles at the ground
const NDU = 900, DUST = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.006, 1), new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 1, transparent: true, opacity: 0.35, depthWrite: false }), NDU); DUST.frustumCulled = false; MARS.add(DUST);
function dust(t, c, k, hgt) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const reach = clamp(1 - hgt / 4); for (let i = 0; i < NDU; i++) { const u = ((hash(i) + t * (0.35 + hash(i + 1) * 0.4)) % 1); const a = hash(i + 2) * TAU + u * 0.8; const r = 0.3 + u * 2.6;
  const s = k * reach * (1 - u) * (0.6 + hash(i + 3) * 1.6); m4.compose(V(c.x + Math.cos(a) * r, marsH(c.x, c.z) + 0.02 + u * 0.35 * hash(i + 4), c.z + Math.sin(a) * r), q, V(s, s, s)); DUST.setMatrixAt(i, m4); } DUST.instanceMatrix.needsUpdate = true; }
// the flight path lines (from above) — 72 flights over ~17 km, drawn as a long wandering polyline
const PATHS = (() => { const pts = []; let x = 0, z = 0, a = 0.4; H.reseed(72); for (let i = 0; i < 72; i++) { const d = 30 + H.rnd() * 420; a += (H.rnd() - 0.45) * 1.3; const nx = x + Math.cos(a) * d * 0.06, nz = z + Math.sin(a) * d * 0.06; pts.push(V(x, 0.3, z), V(nx, 0.3, nz)); x = nx; z = nz; }
  const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(0.24, 1.4, 0.6), toneMapped: false })); MARS.add(l); l.visible = false; return l; })();

// =====================================================================================================================
// THE AIR, compared: two boxes of air molecules — Earth at sea level vs Mars (1/100 as dense)
// =====================================================================================================================
const AIRB = new THREE.Group(); scene.add(AIRB); AIRB.position.set(0, 0, -3000);
const AU = { uT: { value: 0 } };
function airBox(n, col) { const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x9fb8d8, transparent: true, opacity: 0.06, depthWrite: false })); g.add(box);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: col })); g.add(edges);
  const IM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.6), toneMapped: false }), n); IM.frustumCulled = false; g.add(IM); g.userData = { IM, n }; AIRB.add(g); return g; }
const AIR_E = airBox(3000, 0x6fd0ff), AIR_M = airBox(30, 0xff9a5c); AIR_E.position.set(-0.75, 1, 0); AIR_M.position.set(0.75, 1, 0);
function airMove(t) { for (const b of [AIR_E, AIR_M]) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < b.userData.n; i++) { const f = (k) => ((hash(i * 3 + k) + t * (0.05 + hash(i + k + 7) * 0.08)) % 1) - 0.5; m4.compose(V(f(0) * 0.96, f(1) * 0.96, f(2) * 0.96), q, V(1, 1, 1)); b.userData.IM.setMatrixAt(i, m4); } b.userData.IM.instanceMatrix.needsUpdate = true; } }
