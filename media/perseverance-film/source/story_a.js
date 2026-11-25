// Dare Mighty Things: NASA's Perseverance rover (NASA's own 3D model, NASA 3D Resources, free and without copyright).
// Facts (NASA/JPL): landed in Jezero Crater on 18 Feb 2021; hit the atmosphere at ~20,000 km/h (12,500 mph); entry, descent and
// landing took about seven minutes; radio signals took about 11 minutes to reach Earth, so the landing was over before Earth heard
// of the entry; Terrain-Relative Navigation: a camera photographed the ground during descent and compared it with an onboard map
// to steer to a safe spot; the 21 m (70 ft) parachute's orange and white gores encoded "DARE MIGHTY THINGS" (each word on its own
// ring; JPL's motto) and, in the outer ring, JPL's coordinates 34°11'58" N 118°10'31" W — binary, each number a letter position;
// designed by systems engineer Ian Clark; space fans decoded it within hours.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "./kit/lib/jsm/loaders/DRACOLoader.js";
import { makePhone, makeLock, screen, green, rr, img } from "./kit/orbiset.js";
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

// =====================================================================================================================
// PERSEVERANCE: NASA's own model (metres: 3.1 m long, 2.7 m wide — real 3 m × 2.7 m). Its glass (transmission) materials
// render black here → plain transparent glass. The mast is toward +z (the front).
// =====================================================================================================================
const ROV = new THREE.Group(); scene.add(ROV);
{ const dl = new DRACOLoader(); dl.setDecoderPath("kit/lib/jsm/libs/draco/gltf/"); const gl = await new GLTFLoader().setDRACOLoader(dl).loadAsync("kit/models/perseverance/perseverance-nasa.glb");
  gl.scene.traverse((o) => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
    for (const m of [].concat(o.material)) { if (m.transmission) { m.transmission = 0; m.transparent = true; m.opacity = 0.35; m.roughness = 0.05; m.metalness = 0.2; m.depthWrite = false; }
      if (m.map) m.map.anisotropy = 8; m.envMapIntensity = 0.9; } });
  ROV.add(gl.scene); ROV.userData.bb = new THREE.Box3().setFromObject(gl.scene); }
const RL = (x, y, z) => ROV.localToWorld(V(x, y, z));
const RC = V(0, 0.9, -0.15);
// dust devils / blowing dust over the ground (soft particles)
const DUSTP = (() => { const N = 700, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3); for (let i = 0; i < N; i++) p.set([(hash(i) - 0.5) * 60, hash(i + 9) * 4, (hash(i + 3) - 0.5) * 60], i * 3);
  g.setAttribute("position", new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd9a57c, size: 0.05, transparent: true, opacity: 0.35, depthWrite: false })); MARS.add(m); return m; })();
