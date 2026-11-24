// Faster than sound: the real Bell X-1 "Glamorous Glennis" (Smithsonian NASM 3D scan, CC0, 3d.si.edu).
// Facts (Wikipedia: Bell X-1, Chuck Yeager, Sound barrier, Sonic boom, Speed of sound): fuselage shaped like a .50-calibre
// (12.7 mm) machine-gun bullet, known to be stable in supersonic flight; thin wings; adjustable horizontal stabilizer — at
// Mach 0.94 the elevator lost authority and the moving stabilizer gave control; drop-launched from a B-29; XLR11 rocket with
// four chambers (1,500 lbf each), ethyl alcohol + liquid oxygen; 14 October 1947, Mach 1.05 at 45,000 ft (13.7 km), first
// piloted plane past the speed of sound in level flight; speed of sound 343 m/s at 20 °C and lower in colder air up high;
// the boom is a cone behind the aircraft — observers hear nothing until it crosses them. Span 28 ft; on display at NASM.
// The scan (mm, nose toward -z) keeps its own paint; the stabilizer is cut out of it so it can tilt.
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
// THE X-1: plane-local = metres, nose toward -z, fuselage axis on (x = 0, y = 0); the stabilizer split off on its own pivot
// =====================================================================================================================
const X1 = new THREE.Group(); scene.add(X1);
const AX = V(-0.155, 0.115, 0);          // fuselage axis in scan metres
const dl = new DRACOLoader(); dl.setDecoderPath("kit/lib/jsm/libs/draco/gltf/"); const gld = new GLTFLoader(); gld.setDRACOLoader(dl);
const g = await gld.loadAsync("kit/models/bellx1/bell_x1-100k-4096.glb"); g.scene.updateMatrixWorld(true);
const STAB = new THREE.Group(); STAB.position.set(0, 0.8 - AX.y, 3.3); X1.add(STAB);
g.scene.traverse((o) => { if (!o.isMesh) return;
  const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.scale(0.001, 0.001, 0.001); geo.translate(-AX.x, -AX.y, 0);
  const mat = o.material; mat.side = THREE.DoubleSide; mat.envMapIntensity = 1;
  const pos = geo.attributes.position, idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i), keep = [], st = [];
  const inStab = (i) => { const x = pos.getX(i), y = pos.getY(i) + AX.y, z = pos.getZ(i); return z > 2.2 && y > 0.55 && y < 1.02 && Math.abs(x) > 0.26; };
  for (let t = 0; t < idx.length; t += 3) (inStab(idx[t]) && inStab(idx[t + 1]) && inStab(idx[t + 2]) ? st : keep).push(idx[t], idx[t + 1], idx[t + 2]);
  geo.setIndex(keep); const m = sh(new THREE.Mesh(geo, mat)); X1.add(m);
  const sg = geo.clone(); sg.setIndex(st); sg.translate(0, -(0.8 - AX.y), -3.3); STAB.add(sh(new THREE.Mesh(sg, mat))); });
const XL = (x, y, z) => X1.localToWorld(V(x, y, z));
const NOZ = [V(0.15, 0, 4.2), V(-0.15, 0, 4.2), V(0, 0.16, 4.2), V(0, -0.16, 4.2)];   // the four chambers, around the tail cone
const NOSE = V(0, 0, -6.19);

// rocket plumes with shock diamonds (Mach diamonds): one cone per chamber, streaming back (+z)
const PL = { uT: { value: 0 }, uK: { value: 0 } };
const plumeMat = new THREE.ShaderMaterial({ uniforms: PL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  vertexShader: `varying vec3 vL; varying vec3 vN; varying vec3 vW; void main(){ vL = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT, uK; varying vec3 vL; varying vec3 vN; varying vec3 vW; ${NOISE} void main(){ float y = vL.z; vec3 v = normalize(cameraPosition - vW); float e = pow(abs(dot(normalize(vN), v)), 1.2);
    float dia = pow(0.5 + 0.5 * cos(y * 9.0), 6.0) * exp(-y * 0.55);                  // the bright diamonds
    float n = fbm(vec3(vL.x * 6.0, y * 2.0 - uT * 30.0, vL.y * 6.0));
    vec3 c = mix(vec3(1.0, 0.55, 0.25), vec3(0.55, 0.65, 1.4), smoothstep(0.0, 0.5, dia)) * (0.25 + 0.5 * n) * exp(-y * 0.35) + vec3(1.2, 1.1, 1.6) * dia * 1.6;
    gl_FragColor = vec4(c * e * uK * smoothstep(0.0, 0.15, y), 1.0); }` });
const PLUMES = NOZ.map((p) => { const geo = new THREE.CylinderGeometry(0.06, 0.2, 5.5, 24, 30, true); geo.translate(0, 2.75, 0); geo.rotateX(Math.PI / 2); const m = new THREE.Mesh(geo, plumeMat); m.position.copy(p); m.frustumCulled = false; X1.add(m); return m; });
const plumeLight = new THREE.PointLight(0xffb080, 0, 18, 2); plumeLight.position.set(0, 0, 5.2); X1.add(plumeLight);

// =====================================================================================================================
// THE SKY at 13.7 km: dark blue zenith, a bright haze at the horizon, a cloud deck and the Mojave far below (backdrop)
// =====================================================================================================================
const HIGH = new THREE.Group(); scene.add(HIGH);
const SUN = V(0.55, 0.42, 0.72).normalize();
const SKY = { uSun: { value: SUN }, uAlt: { value: 1 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, uniforms: SKY,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; uniform float uAlt; varying vec3 vD; void main(){ vec3 d = normalize(vD); float h = d.y;
    vec3 zen = mix(vec3(0.16, 0.33, 0.72), vec3(0.04, 0.1, 0.3), uAlt), hor = mix(vec3(0.78, 0.86, 0.95), vec3(0.62, 0.74, 0.9), uAlt);
    vec3 c = mix(hor, zen, pow(clamp(h, 0.0, 1.0), 0.45)); float sd = max(dot(d, uSun), 0.0); c += vec3(1.0, 0.95, 0.85) * (pow(sd, 900.0) * 8.0 + pow(sd, 10.0) * 0.25);
    if (h < 0.0) c = hor * 0.95; gl_FragColor = vec4(c, 1.0); }` }));
sky.renderOrder = -10; sky.frustumCulled = false; HIGH.add(sky);
// the ground far below: Mojave desert + dry lake + broken cloud deck, drawn as a backdrop disc under the camera
const GND = { uT: { value: 0 }, uSun: { value: SUN }, uCloud: { value: 0.35 }, uDesert: { value: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true) }, uCamY: { value: 13700 } };
const ground = new THREE.Mesh(new THREE.CircleGeometry(400000, 96), new THREE.ShaderMaterial({ uniforms: GND, depthTest: false, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT, uCloud, uCamY; uniform vec3 uSun; uniform sampler2D uDesert; varying vec3 vW; ${NOISE}
    void main(){ vec2 p = vW.xz; float dist = length(vW - cameraPosition);
      vec3 des = texture2D(uDesert, p / 900.0).rgb * 0.6 + texture2D(uDesert, p / 7000.0).rgb * 0.5; des *= vec3(1.05, 0.95, 0.82);
      float lake = smoothstep(0.62, 0.66, fbm(vec3(p / 9000.0, 1.0))); des = mix(des, vec3(0.86, 0.84, 0.8), lake * 0.85);
      float c = fbm(vec3(p / 2600.0, uT * 0.002)) * 0.7 + fbm(vec3(p / 600.0, 3.0)) * 0.3; float cl = smoothstep(0.55 - 0.25 * uCloud, 0.75 - 0.2 * uCloud, c);
      vec3 col = mix(des, vec3(1.0) * (0.85 + 0.2 * fbm(vec3(p / 300.0, 1.0))), cl * uCloud);
      float haze = 1.0 - exp(-dist / (uCamY * 22.0)); col = mix(col * vec3(0.9, 0.95, 1.05), vec3(0.62, 0.74, 0.9), clamp(haze, 0.0, 0.85));
      gl_FragColor = vec4(col, 1.0); }` }));
ground.rotation.x = -Math.PI / 2; ground.renderOrder = -9; ground.frustumCulled = false; HIGH.add(ground);
function groundAt(alt) { ground.position.set(H.cam.position.x, H.cam.position.y - alt, H.cam.position.z); GND.uCamY.value = alt; }
// contrails of thin cloud wisps streaming past to show speed
const NWI = 120, WISP = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vU; void main(){ vec2 d = vU - 0.5; float a = exp(-dot(d * vec2(2.0, 6.0), d * vec2(2.0, 6.0)) * 3.0); gl_FragColor = vec4(vec3(1.0), a * 0.18); }` }), NWI);
WISP.frustumCulled = false; HIGH.add(WISP);
function wisps(t, c, speed, k) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < NWI; i++) { const L = 400; const z = c.z - L / 2 + ((hash(i) * L + t * speed) % L); const x = c.x + (hash(i + 1) - 0.5) * 160, y = c.y + (hash(i + 2) - 0.5) * 60 - 25;
    const s = k * (20 + hash(i + 3) * 40); q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); m4.compose(V(x, y, z), q, V(s * 0.6, s * 3, 1)); WISP.setMatrixAt(i, m4); } WISP.instanceMatrix.needsUpdate = true; }

// =====================================================================================================================
// PRESSURE WAVES: rings in the plane's horizontal plane, emitted from the nose; the Mach cone; the shock "wall"
// (diagram speed: sound slowed so the rings can be seen; the ratio — the Mach number — is what matters)
// =====================================================================================================================
const WAVES = new THREE.Group(); X1.add(WAVES);
const NR = 18, RINGS = Array.from({ length: NR }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.4, 2.2), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.frustumCulled = false; WAVES.add(m); return m; });
const SPH = Array.from({ length: NR }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uK; varying vec3 vN; varying vec3 vW; void main(){ float e = pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 3.0); gl_FragColor = vec4(vec3(0.4, 0.9, 1.6) * e * uK * 0.5, 1.0); }` }));
  m.frustumCulled = false; WAVES.add(m); return m; });
const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 96, 1, true), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uT: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `varying vec3 vN; varying vec3 vW; varying float vY; void main(){ vY = position.y; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uK, uT; varying vec3 vN; varying vec3 vW; varying float vY; void main(){ float e = pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 2.0);
    float band = 0.5 + 0.5 * sin((vY * 40.0 + uT * 12.0)); vec3 c = vec3(1.0, 0.7, 0.35) * (0.25 + 0.75 * e) * (0.7 + 0.3 * band) * smoothstep(0.5, 0.35, vY);
    gl_FragColor = vec4(c * uK * 1.6, 1.0); }` }));
cone.frustumCulled = false; WAVES.add(cone);
/** M = Mach number; c = diagram sound speed (m/s); spacing = emission interval (s). Rings centred where the nose was. */
function pressure(t, M, c = 6, spacing = 0.35, k = 1, spheres = 0) {
  const v = M * c; let maxR = 0;
  RINGS.forEach((r, i) => { const age = ((t / spacing) % 1 + i) * spacing; const R = c * age; const back = v * age; const ok = k > 0 && R > 0.05;
    r.visible = ok; r.position.set(0, 0, NOSE.z + back); r.scale.setScalar(R); r.material.opacity = k * clamp(1 - age / (NR * spacing)) * 0.9; maxR = Math.max(maxR, R);
    const s = SPH[i]; s.visible = ok && spheres > 0; s.position.copy(r.position); s.scale.setScalar(R); s.material.uniforms.uK.value = spheres * k * clamp(1 - age / (NR * spacing)); });
  const half = M > 1 ? Math.asin(1 / M) : 0; cone.visible = M > 1.001 && k > 0; if (cone.visible) { const Lc = NR * spacing * v * 0.95; cone.scale.set(Lc * Math.tan(half), Lc, Lc * Math.tan(half)); cone.rotation.set(-Math.PI / 2, 0, 0); cone.position.set(0, 0, NOSE.z + Lc / 2); cone.material.uniforms.uK.value = k * smooth(clamp((M - 1) * 12)); cone.material.uniforms.uT.value = t; }
}

// =====================================================================================================================
// THE BULLET: a .50-calibre (12.7 mm) machine-gun bullet, ogive nose + boat tail, copper jacket (magnified to X-1 size)
// =====================================================================================================================
const BUL = new THREE.Group(); scene.add(BUL); BUL.visible = false;
{ const pts = []; const L = 1, R = 0.11; for (let i = 0; i <= 40; i++) { const u = i / 40; let r; if (u < 0.45) r = R * Math.sqrt(1 - Math.pow(1 - u / 0.45, 2)) ; else if (u < 0.85) r = R; else r = R * (1 - (u - 0.85) / 0.15 * 0.25); pts.push(new THREE.Vector2(Math.max(0.0005, r), -u * L)); }
  const g2 = new THREE.LatheGeometry(pts, 64); g2.rotateX(-Math.PI / 2); g2.translate(0, 0, -0.0);
  const m = sh(new THREE.Mesh(g2, new THREE.MeshPhysicalMaterial({ color: 0xc98a52, metalness: 1, roughness: 0.28, clearcoat: 0.4 }))); BUL.add(m);
  const groove = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.004, 8, 64), metal(0x7a5232, 0.4)); groove.position.z = 0.72; BUL.add(groove); }
// the fuselage outline glow for the comparison: a soft silhouette line hugging the X-1 profile
const PROF = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ visible: false })); X1.add(PROF);

// =====================================================================================================================
// THE DESERT FLOOR (for the boom): a dry lake bed, the cone's footprint sweeping across, a wind sock
// =====================================================================================================================
const DES = new THREE.Group(); scene.add(DES); DES.position.set(0, 0, 30000);
const DU = { uT: { value: 0 }, uX: { value: -1000 }, uK: { value: 0 } };
{ const fl = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ map: tex("kit/ph/aerial_sand/aerial_sand_diff_2k.jpg", true, 300, 300), color: 0xf2e6d2, roughness: 0.95 }));
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; DES.add(fl);
  // the boom footprint: a hyperbola-like bright band moving across (in DES-local x)
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShaderMaterial({ uniforms: DU, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT, uX, uK; varying vec2 vP; void main(){ float x = vP.x - uX; float h = x + sqrt(vP.y * vP.y * 0.35 + 400.0) - 20.0; float band = exp(-h * h / 600.0);
      gl_FragColor = vec4(vec3(1.0, 0.7, 0.35) * 1.4, band * 0.7 * uK); }` }));
  fp.rotation.x = -Math.PI / 2; fp.position.y = 0.05; DES.add(fp);
  const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 5, 12), metal(0x8a8d90, 0.5))); pole.position.set(6, 2.5, -8); DES.add(pole);
  const sock = sh(new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.8, 20, 1, true).rotateZ(Math.PI / 2).translate(0.9, 0, 0), new THREE.MeshStandardMaterial({ color: 0xff7a2a, roughness: 0.8, side: THREE.DoubleSide }))); sock.position.set(6, 4.8, -8); DES.add(sock); DES.userData.sock = sock;
  for (let i = 0; i < 40; i++) { const r = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + hash(i) * 0.5, 0), matte(0x9c8a72, 0.95))); r.position.set((hash(i + 1) - 0.5) * 80, 0.1, (hash(i + 2) - 0.5) * 80 - 20); r.scale.y = 0.5; DES.add(r); } }

// =====================================================================================================================
// THE MUSEUM: the X-1 hanging in a gallery
// =====================================================================================================================
const MUS = new THREE.Group(); scene.add(MUS); MUS.position.set(-30000, 0, 0);
{ const fl = sh(new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, roughness: 0.3, clearcoat: 0.5, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 14, 14) })), false, true); fl.rotation.x = -Math.PI / 2; MUS.add(fl);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(80, 26, 80), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.9, side: THREE.BackSide })); hall.position.y = 13; MUS.add(hall);
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(80, 0.4, 0.4), metal(0x3a3d42, 0.5)); b.position.set(0, 25.5, -36 + i * 9); MUS.add(b); }
  const sky2 = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0x9fb8d8 })); sky2.rotation.x = Math.PI / 2; sky2.position.y = 25.9; MUS.add(sky2); }
const mSpots = [V(10, 18, 10), V(-10, 16, 8)].map((p) => { const s = new THREE.SpotLight(0xfff0dd, 900, 60, 0.35, 0.6, 1.5); s.position.copy(p); s.target.position.set(0, 9, 0); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); MUS.add(s, s.target); return s; });
const cables = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x9aa0a6 })); MUS.add(cables); cables.frustumCulled = false;
