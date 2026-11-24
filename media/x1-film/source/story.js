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

// =====================================================================================================================
// ORBI: in the gallery under the X-1: a big file split into parts; 3 parts travel up at once, 4 come down at once
// =====================================================================================================================
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); MUS.add(OR); OR.position.set(0.5, 0.8, 12); OR.rotation.y = 0.05;
const bench = sh(new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.36, 1.9, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x5a4632, roughness: 0.55, clearcoat: 0.3, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) }))); bench.position.set(0.2, -0.2, 0.3); OR.add(bench);
for (const x of [-2.6, 2.9]) { const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.6), metal(0x2a2d31, 0.4))); leg.position.set(x, -0.62, 0.3); OR.add(leg); }
ph.g.position.set(1.9, 0.06, 0.5); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.18); lap.g.position.set(-1.3, 0, -0.2); lap.g.rotation.y = 0.22; lap.g.scale.setScalar(0.8);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); orbiL.position.set(1.5, 0.6, 0.6); OR.add(orbiL);
// storage: a glowing slab floating above the bench, lanes of parts going up (3) and down (4)
const STORE = new THREE.Group(); STORE.position.set(0.3, 3.6, -1.2); OR.add(STORE);
{ const slab = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.5, 1.0, 3, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x0e1418, roughness: 0.3, metalness: 0.5, emissive: new THREE.Color(0x0b2a1a) })); STORE.add(slab);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.02, 1.02), glow(0x3dff8c, 1.4)); edge.position.y = -0.25; STORE.add(edge); }
const hexTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g2 = c.getContext("2d"); g2.fillStyle = "#06120c"; g2.fillRect(0, 0, 256, 256); g2.font = "700 30px M"; g2.fillStyle = "#3dff8c"; H.reseed(9);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) g2.fillText(Math.floor(H.rnd() * 256).toString(16).padStart(2, "0"), 14 + x * 62, 36 + y * 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const partM = new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) }), partD = new THREE.MeshBasicMaterial({ map: hexTex, toneMapped: false, color: new THREE.Color(0.8, 1.4, 2.0) });
const UP = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.16, 2, 0.02), partM); OR.add(m); return m; });
const DN = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.16, 2, 0.02), partD); OR.add(m); return m; });
const laneMat = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.2), transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false });
const LANES = []; { const a = ph.g.position.clone().add(V(0, 0.3, 0)), b = lap.g.position.clone().add(V(0.2, 1.0, 0.1));
  for (let i = 0; i < 3; i++) { const s = STORE.position.clone().add(V(0.6 + (i - 1) * 0.35, -0.3, 0)); LANES.push({ from: a.clone().add(V((i - 1) * 0.12, 0, 0)), to: s, up: true }); }
  for (let i = 0; i < 4; i++) { const s = STORE.position.clone().add(V(-0.9 + (i - 1.5) * 0.3, -0.3, 0)); LANES.push({ from: s, to: b.clone().add(V((i - 1.5) * 0.15, 0, 0)), up: false }); }
  LANES.forEach((l) => { const mid = l.from.clone().lerp(l.to, 0.5).add(V(0, 0.4, 0)); const tg = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(l.from, mid, l.to), 40, 0.012, 6, false); const m = new THREE.Mesh(tg, laneMat(l.up ? 0x3dff8c : 0x6fd0ff)); OR.add(m); l.mesh = m; l.curve = new THREE.QuadraticBezierCurve3(l.from, mid, l.to); }); }
function lanes(t, kUp, kDn) { UP.forEach((m, i) => { const lane = LANES[i % 3]; const u = ((t * 0.55 + Math.floor(i / 3) / 3 + (i % 3) * 0.07) % 1); m.visible = kUp > 0; m.position.copy(lane.curve.getPoint(u)); m.rotation.set(t * 2 + i, t * 1.5, 0); m.scale.setScalar(kUp); });
  DN.forEach((m, i) => { const lane = LANES[3 + (i % 4)]; const u = ((t * 0.6 + Math.floor(i / 4) / 3 + (i % 4) * 0.05) % 1); m.visible = kDn > 0; m.position.copy(lane.curve.getPoint(u)); m.rotation.set(t * 2 + i, t * 1.5, 0); m.scale.setScalar(kDn); });
  LANES.forEach((l) => { l.mesh.visible = l.up ? kUp > 0 : kDn > 0; }); }
function drawPhone(g2, st) { if (IMG.ph) g2.drawImage(IMG.ph, 0, 0, 780, 1688); else { g2.fillStyle = "#0b0d10"; g2.fillRect(0, 0, 780, 1688); }
  if (!st.on) return; g2.fillStyle = "rgba(8,10,14,.94)"; rr(g2, 50, 540, 680, 600, 34); g2.fill();
  g2.fillStyle = "#fff"; g2.font = "800 38px M"; g2.fillText("x1-flight-film.mov", 90, 610); g2.fillStyle = "#9aa3ad"; g2.font = "700 28px M"; g2.fillText("18.4 GB · split into parts", 90, 655);
  for (let i = 0; i < 40; i++) { const x = 90 + (i % 8) * 76, y = 690 + Math.floor(i / 8) * 64; const done = i < st.sent, fly = !done && i < st.sent + 3; g2.fillStyle = done ? green : fly ? "#b8ffd6" : "rgba(255,255,255,.12)"; rr(g2, x, y, 64, 52, 10); g2.fill(); }
  g2.fillStyle = green; g2.font = "800 32px M"; g2.fillText(st.sent >= 40 ? "✓ UPLOADED" : `UPLOADING · 3 PARTS AT ONCE`, 90, 1050); g2.fillStyle = "#cfd6dd"; g2.font = "700 26px M"; g2.fillText("max file size 20 GB", 90, 1095); }
function drawLap(g2, st) { if (IMG.lap) g2.drawImage(IMG.lap, 0, 0, 1440, 900); else { g2.fillStyle = "#0b0d10"; g2.fillRect(0, 0, 1440, 900); }
  if (!st.on) return; g2.fillStyle = "rgba(8,10,14,.92)"; rr(g2, 60, 600, 980, 260, 26); g2.fill(); g2.fillStyle = "#fff"; g2.font = "700 32px M"; g2.fillText("x1-flight-film.mov  ·  18.4 GB", 96, 655);
  for (let r = 0; r < 4; r++) { g2.fillStyle = "rgba(255,255,255,.1)"; rr(g2, 96, 680 + r * 34, 860, 24, 8); g2.fill(); g2.fillStyle = "#6fd0ff"; rr(g2, 96, 680 + r * 34, 860 * Math.min(1, st.got * (1 + r * 0.03)), 24, 8); g2.fill(); }
  g2.fillStyle = "#6fd0ff"; g2.font = "800 28px M"; g2.fillText(st.got >= 1 ? "✓ DOWNLOADED" : "DOWNLOADING · 4 AT ONCE", 96, 840); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  scan: ["Laser scan", "#9fd4ff", "the real paint, the real 46-062"], body: ["Bullet-shaped body", "#ffd166", "like a .50-calibre round"], wing: ["Thin wings", "#9fd4ff", "for high speed"],
  stab: ["Whole tail tilts", "#3dff8c", "adjustable stabilizer"], shock: ["Shock wave", "#ff8a3d", "on the wing"], ch: ["4 rocket chambers", "#ff8a3d", "alcohol + liquid oxygen"],
  wave: ["Pressure waves", "#6fd0ff", "sound, spreading out"], pile: ["Waves pile up", "#ff8a3d", "the shock wave"], cone: ["Mach cone", "#ffd166", "the shock sweeps back"],
  boomL: ["The boom", "#ffd166", "where the cone meets the ground"], quiet: ["Quiet here", "#9fd4ff", "the cone hasn't arrived"],
  up3: ["3 parts up at once", "#3dff8c", "to storage"], dn4: ["4 parts down at once", "#6fd0ff", "to the laptop"],
});
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
hudEl("mach", `<div style="width:1080px;text-align:center"><div style="font:700 30px M;letter-spacing:.2em;color:#aab3bd">MACH</div><div id="mN" style="font:900 190px/0.9 D;font-stretch:112%;color:#fff;text-shadow:0 12px 50px rgba(0,0,0,.6)">0.80</div><div id="mL" style="font:800 40px D;letter-spacing:.12em;color:#ffd166;margin-top:6px"></div></div>`, { left: "0px", top: "200px" });
hudEl("sos", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("SPEED OF SOUND", "343 m/s", "#6fd0ff")}${card("AT 20 °C", "1,234 km/h")}</div>`, { left: "0px", top: "1440px" });
hudEl("date", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("DATE", "14 OCT 1947")}${card("ALTITUDE", "13.7 km", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("WINGSPAN", "8.5 m")}${card("ROCKET", "4 × 1,500 lbf", "#ff8a3d")}</div>`, { left: "0px", top: "1440px" });
hudEl("diag", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">SOUND SLOWED DOWN TO BE SEEN</div>`, { left: "270px", top: "1110px" });
hudEl("nwave", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:18px 26px;border-radius:24px;background:rgba(8,10,16,.84);border:1.5px solid rgba(255,255,255,.22)"><div style="font:700 22px M;letter-spacing:.16em;color:#aab3bd;text-align:left">AIR PRESSURE HERE</div><svg width="620" height="150" viewBox="0 0 620 150"><line x1="0" y1="75" x2="620" y2="75" stroke="rgba(255,255,255,.25)" stroke-width="2"/><path id="nwP" d="M0 75 L620 75" fill="none" stroke="#ffd166" stroke-width="6" stroke-linejoin="round"/></svg></div></div>`, { left: "0px", top: "230px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["3 UP AT ONCE", "4 DOWN AT ONCE", "20 GB"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("b29", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">RELEASED FROM A B-29 BOMB BAY</div>`, { left: "265px", top: "1110px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
const STUDIO = new THREE.Color(0x07090c);
function sets(s) { HIGH.visible = s === "high"; DES.visible = s === "des"; MUS.visible = s === "mus"; BUL.visible = false; X1.visible = s !== "des";
  scene.fog = null; scene.background = s === "studio" ? STUDIO : null; }
function lightHigh() { H.key.color.set(0xfff6ea); H.key.intensity = 3.6; H.key.position.copy(X1.position).addScaledVector(SUN, 40); H.key.target.position.copy(X1.position);
  const s = H.key.shadow.camera; Object.assign(s, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 100 }); s.updateProjectionMatrix(); H.key.castShadow = true;
  H.hemi.color.set(0x8fb0e0); H.hemi.groundColor.set(0xb0a890); H.hemi.intensity = 0.8; H.envK.value = 0.6; H.rimA.intensity = 0.3; H.rimB.intensity = 0.2; }
function lightStudio() { H.key.color.set(0xffffff); H.key.intensity = 3; H.key.position.copy(X1.position).add(V(8, 12, 6)); H.key.target.position.copy(X1.position); H.key.castShadow = false;
  H.hemi.color.set(0x6070a0); H.hemi.groundColor.set(0x101010); H.hemi.intensity = 0.4; H.envK.value = 0.9; H.rimA.intensity = 1.2; H.rimB.intensity = 0.8; }
function lightMuseum() { H.key.intensity = 0.2; H.key.castShadow = false; H.hemi.color.set(0x8090b0); H.hemi.groundColor.set(0x202020); H.hemi.intensity = 0.5; H.envK.value = 0.6; H.rimA.intensity = 0.4; H.rimB.intensity = 0.3; }
function x1At(p, pitch = 0, yaw = 0, roll = 0) { X1.position.copy(p); X1.rotation.set(pitch, yaw, roll); X1.updateMatrixWorld(true); }
const shake = (t, a) => { H.cam.position.x += Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6; H.cam.position.y += Math.sin(t * 53 + 1) * a; };
const setMach = (m, label, col = "#fff") => { H.$("mN").textContent = m.toFixed(2); H.$("mN").style.color = col; H.$("mL").textContent = label; };
const ORIGIN = V(0, 0, 0);

H.frame("3 up, 4 down, at once. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.3; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 900000);
  pressure(t, 0, 6, 0.35, 0); PL.uK.value = 0; PL.uT.value = t; plumeLight.intensity = 0; STAB.rotation.x = 0; WISP.visible = false; GND.uT.value = t; SKY.uAlt.value = 1; OR.visible = false; lanes(t, 0, 0);
  WAVES.visible = true; PLUMES.forEach((p) => (p.visible = true));

  if (t < at("real")) { // HOOK: the X-1 at Mach 1.05, rocket burning, its shock cone trailing
    sets("high"); x1At(ORIGIN, 0.03); lightHigh(); PL.uK.value = 1; plumeLight.intensity = 30; pressure(t, 1.05, 9, 0.3, 1); WISP.visible = true; wisps(t, ORIGIN, 420, 1);
    move(t, 0, at("real"), [V(-14, 4.5, -18), V(0, 0, 2), 34], [V(-12.5, 3.6, -15), V(0, 0, 3), 34], 0.04); groundAt(13700); shake(t, 0.015);
    title(t, fr("hook", 0.05), fr("hook", 0.7), "14 October 1947", "Faster than sound", 150);
  } else if (t < at("sound")) { // THE REAL ONE (museum), then the bullet it copies
    if (t < at("why")) { sets("mus"); lightMuseum(); WAVES.visible = false; x1At(MUS.position.clone().add(V(0, 9, 0)), 0.08, 0.5, -0.12);
      const p0 = XL(0, 0.3, 0); const cp = [p0.x, p0.y, p0.z, ...XL(-1.6, 2.4, -2.6).toArray(), ...XL(1.6, 2.4, 1.0).toArray(), ...MUS.localToWorld(V(-3, 26, -6)).toArray(), ...MUS.localToWorld(V(3, 26, 4)).toArray()];
      cables.geometry.setAttribute("position", new THREE.Float32BufferAttribute([...XL(-1.6, 1.0, -2.6).toArray(), ...MUS.localToWorld(V(-1.0, 26, -9)).toArray(), ...XL(1.2, 1.0, 1.4).toArray(), ...MUS.localToWorld(V(1.0, 26, 6)).toArray()], 3));
      const a = 0.6 + (t - at("real")) * 0.12; const c = X1.position.clone();
      move(t, at("real"), at("why"), [c.clone().add(V(Math.sin(a) * 17, -6.5, Math.cos(a) * 17)), c.clone().add(V(0, -0.5, 0)), 34], [c.clone().add(V(Math.sin(a + 0.1) * 15.5, -5.8, Math.cos(a + 0.1) * 15.5)), c.clone().add(V(0, -0.5, 0)), 34], 0.03);
      title(t, fr("real", 0.05), fr("real", 0.45), "The real 46-062", "Bell X-1", 150); callout("scan", t, fr("real", 0.25), fr("real", 0.6), XL(0, 0.6, 1.0), 300, 1150); callout("body", t, fr("real", 0.62), at("why"), XL(0, 0.2, -4.5), 760, 1150); }
    else { sets("studio"); lightStudio(); WAVES.visible = false; x1At(ORIGIN); BUL.visible = true; const k = smooth(prog(t, at("why"), fr("why", 0.55)));
      BUL.position.set(0, lerp(-6, -3.4, k), -6.19); BUL.scale.setScalar(10.4); BUL.rotation.z = t * 3;
      move(t, at("why"), at("sound"), [V(-40, 0.5, -1.0), V(0, -1.6, -1.0), 34], [V(-37, 0.2, -1.0), V(0, -1.6, -1.0), 34], 0.02);
      callout("body", t, fr("why", 0.6), at("sound"), XL(0, 0.4, -4.0), 760, 1100); }
  } else if (t < at("tail")) { // PRESSURE WAVES: subsonic rings → they pile up into a shock at Mach 1
    sets("high"); x1At(ORIGIN); lightHigh(); groundAt(13700);
    if (t < at("pile")) { pressure(t, 0.5, 6, 0.35, 1, 0.6); move(t, at("sound"), at("pile"), [V(-2, 26, 18), V(0, 0, 2), 40], [V(-2, 24, 15), V(0, 0, 2), 40], 0.02);
      hudShow("sos", win(t, fr("sound", 0.3), at("pile"))); hudShow("diag", win(t, fr("sound", 0.1), at("pile"))); callout("wave", t, fr("sound", 0.15), at("pile"), V(0, 0, NOSE.z - 6), 760, 1150); }
    else { const M = lerp(0.6, 1.0, smooth(prog(t, at("pile"), fr("pile", 0.8)))); pressure(t, M, 6, 0.35, 1, 0.4); PL.uK.value = 0.8; plumeLight.intensity = 20;
      move(t, at("pile"), at("tail"), [V(-3, 20, -8), V(0, 0, -3), 40], [V(-2.5, 16, -10), V(0, 0, -4), 40], 0.02); shake(t, 0.01 * M);
      setMach(M, M > 0.98 ? "THE SOUND BARRIER" : "", M > 0.98 ? "#ff8a3d" : "#fff"); hudShow("mach", win(t, fr("pile", 0.05), at("tail"))); callout("pile", t, fr("pile", 0.6), at("tail"), V(0, 0, NOSE.z - 0.3), 760, 1150); hudShow("diag", win(t, at("pile"), fr("pile", 0.4))); }
  } else if (t < at("rocket")) { // THE TAIL that tilts; then the drop from the bomber
    sets("high"); lightHigh(); groundAt(t < at("drop") ? 13700 : 7600);
    if (t < at("drop")) { x1At(ORIGIN); STAB.rotation.x = Math.sin((t - at("tail")) * 2.4) * 0.12 * smooth(prog(t, fr("tail", 0.2), fr("tail", 0.4)));
      move(t, at("tail"), at("drop"), [XL(5.2, 2.6, 8.8), XL(0, 0.5, 3.3), 34], [XL(4.6, 2.3, 8.0), XL(0, 0.5, 3.3), 34], 0.02);
      callout("stab", t, fr("tail", 0.3), at("drop"), XL(1.3, 0.7, 3.4), 760, 1150); }
    else { const k = prog(t, at("drop"), at("rocket")); x1At(V(0, 30 - 9.8 * Math.pow(k * 3.2, 2) * 0.5 * 0.5, k * 30), 0.06 + k * 0.05, 0, Math.sin(k * 6) * 0.04);
      WISP.visible = true; wisps(t, X1.position, 120, 0.8);
      move(t, at("drop"), at("rocket"), [V(-14, 24, -6), X1.position.clone(), 40], [V(-14, 16, 10), X1.position.clone(), 40], 0.05); hudShow("b29", win(t, fr("drop", 0.4), at("rocket"))); }
  } else if (t < at("mach")) { // ROCKET IGNITION (4 chambers) → the date / altitude
    sets("high"); lightHigh();
    if (t < at("date")) { x1At(ORIGIN, 0.04); groundAt(8000); const k = prog(t, at("rocket"), fr("rocket", 0.6)); PLUMES.forEach((p, i) => (p.visible = k > i * 0.22)); PL.uK.value = 1; plumeLight.intensity = 30 * k;
      move(t, at("rocket"), at("date"), [XL(2.5, 1.2, 14), XL(0, 0, 3.5), 34], [XL(2.0, 1.0, 12.5), XL(0, 0, 3.5), 34], 0.03); shake(t, 0.02 * k); WISP.visible = true; wisps(t, ORIGIN, 300, 1);
      callout("ch", t, fr("rocket", 0.35), at("date"), XL(0.15, 0.1, 4.25), 300, 1150); hudShow("stats", win(t, fr("rocket", 0.6), at("date"))); }
    else { PLUMES.forEach((p) => (p.visible = true)); x1At(ORIGIN, 0.02); groundAt(13700); PL.uK.value = 1; plumeLight.intensity = 25; WISP.visible = true; wisps(t, ORIGIN, 380, 0.6);
      move(t, at("date"), at("mach"), [V(-40, 14, 60), V(0, -2, 0), 30], [V(-34, 12, 52), V(0, -2, 0), 30], 0.05);
      title(t, fr("date", 0.05), fr("date", 0.5), "Over the Mojave Desert", "14 October 1947", 150); hudShow("date", win(t, fr("date", 0.3), at("mach"))); }
  } else if (t < at("today")) { // MACH 1.05: the cone; then on the ground: silence … boom
    if (t < at("boom")) { sets("high"); PLUMES.forEach((p) => (p.visible = true)); x1At(ORIGIN, 0.02); lightHigh(); groundAt(13700); PL.uK.value = 1; plumeLight.intensity = 30; WISP.visible = true; wisps(t, ORIGIN, 420, 1);
      const M = lerp(0.94, 1.05, smooth(prog(t, at("mach"), fr("mach", 0.5)))); pressure(t, M, 9, 0.3, 1, 0.2); shake(t, 0.02);
      move(t, at("mach"), at("boom"), [V(-5, 30, -6), V(-1, 0, 5), 44], [V(-6, 33, -5), V(-1, 0, 6.5), 44], 0.03);
      setMach(M, M >= 1.0 ? "SUPERSONIC" : "", M >= 1.0 ? "#ffd166" : "#fff"); hudShow("mach", win(t, fr("mach", 0.02), at("boom"))); callout("cone", t, fr("mach", 0.55), at("boom"), V(6, 0, 20), 760, 1150); }
    else { sets("des"); DES.updateMatrixWorld(true); H.key.color.set(0xfff2e0); H.key.intensity = 3.2; H.key.position.copy(DES.position).add(V(40, 60, 30)); H.key.target.position.copy(DES.position); H.hemi.intensity = 0.9; H.hemi.color.set(0xc0d4ee); H.envK.value = 0.5; scene.background = new THREE.Color(0x9cc0e8);
      const hit = fr("boom", 0.72); DU.uK.value = 1; DU.uX.value = lerp(-700, 160, prog(t, at("boom"), hit + 0.4)); DES.userData.sock.rotation.y = Math.sin(t * 1.3) * 0.2;
      const D = (x, y, z) => DES.localToWorld(V(x, y, z));
      move(t, at("boom"), at("today"), [D(-8, 2.0, 14), D(-20, 4, -40), 50], [D(-7, 2.0, 12), D(-20, 4, -40), 50], 0.04); if (t > hit) shake(t, 0.12 * Math.exp(-(t - hit) * 3)); flash(t, hit, 0.35, 5, "#fff4e0");
      // the N-wave: flat (silence) until the cone arrives, then the sharp rise, the slow fall below zero, the sharp return
      const k = clamp((t - hit + 0.15) / 0.9); const pts = []; for (let i = 0; i <= 62; i++) { const x = i * 10; const u = x / 620 - (1 - k) * 0.6; let y = 75; if (u > 0.3 && u < 0.7) y = 75 - 60 + (u - 0.3) / 0.4 * 120; if (Math.abs(u - 0.3) < 0.005) y = 15; pts.push(`${x} ${y.toFixed(1)}`); }
      H.$("nwP").setAttribute("d", "M" + pts.join(" L")); hudShow("nwave", win(t, fr("boom", 0.05), at("today")));
      callout("quiet", t, fr("boom", 0.1), hit - 0.3, D(-6, 0.5, 4), 300, 1150); callout("boomL", t, hit - 0.2, at("today"), D(-16, 0.2, -10), 760, 1150); }
  } else if (t < at("orbi")) { // TODAY: in the Smithsonian
    sets("mus"); lightMuseum(); WAVES.visible = false; x1At(MUS.position.clone().add(V(0, 9, 0)), 0.08, 0.5, -0.12);
    const c = X1.position.clone(); const a = 2.4 + (t - at("today")) * 0.1;
    move(t, at("today"), at("orbi"), [c.clone().add(V(Math.sin(a) * 19, -7.8, Math.cos(a) * 19)), c.clone().add(V(0, -1.0, 0)), 34], [c.clone().add(V(Math.sin(a + 0.1) * 18, -7.5, Math.cos(a + 0.1) * 18)), c.clone().add(V(0, -1.0, 0)), 34], 0.03);
  } else { // ORBI: parts in parallel
    sets("mus"); lightMuseum(); WAVES.visible = false; x1At(MUS.position.clone().add(V(0, 9, 0)), 0.08, 0.5, -0.12); OR.visible = true; OR.updateMatrixWorld(true); const OW = (x, y, z) => OR.localToWorld(V(x, y, z)); orbiL.intensity = 0.6;
    const sent = Math.floor(clamp(prog(t, at("orbi"), fr("orbi2", 0.6))) * 40); const got = clamp(prog(t, fr("orbi2", 0.35), fr("orbi3", 0.6)));
    screen(ph, { on: 1, sent }, drawPhone); screen(lap, { on: t > fr("orbi2", 0.3) ? 1 : 0, got: Math.round(got * 40) / 40 }, drawLap);
    lanes(t, t > fr("orbi", 0.3) ? 1 : 0, t > fr("orbi2", 0.35) ? 1 : 0);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [OW(0.3, 3.2, 8.4), OW(0.3, 1.8, -1.2), 44], [OW(0.4, 3.0, 7.6), OW(0.3, 1.8, -1.2), 44], 0.2);
    else if (t < at("orbi3")) move(t, at("orbi2"), at("orbi3"), [OW(1.8, 2.4, 5.0), OW(0.6, 1.9, -0.8), 44], [OW(1.4, 2.6, 4.6), OW(0.2, 2.0, -0.8), 44], 0.1);
    else { move(t, at("orbi3"), at("end"), [OW(0.3, 3.2, 8.6), OW(0.3, 2.0, -1.2), 44], [OW(0.4, 3.0, 8.0), OW(0.3, 2.0, -1.2), 44], 0.2); hudShow("chips", win(t, fr("orbi3", 0.2), at("end"))); }
    callout("up3", t, fr("orbi", 0.4), fr("orbi2", 0.6), OW(1.4, 2.0, -0.4), 760, 900); callout("dn4", t, fr("orbi2", 0.4), at("orbi3"), OW(-0.9, 2.0, -0.6), 300, 1150);
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
