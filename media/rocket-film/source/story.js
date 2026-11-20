// Do you know how a rocket engine works? HD film on kit/hd.js. A gas-generator kerosene/LOX engine built to real size
// (≈2.9 m tall, 0.92 m nozzle exit): regeneratively cooled chamber + bell nozzle (cooling channels), injector dome, a turbopump
// (LOX pump, fuel pump, turbine on one shaft), the gas generator and its exhaust pipe, feed lines, valves, gimbal mount.
// Flows are particles along the real paths. Then a first stage with nine engines on a pad at dusk.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { makePhone, makeLaptop, makeLock, makeEmbers, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, S2 = (el, o) => Object.assign(el.style, o), TAU = Math.PI * 2;
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function camRange(n, f) { if (H.cam.near !== n || H.cam.far !== f) { H.cam.near = n; H.cam.far = f; H.cam.updateProjectionMatrix(); } }
H.floor.visible = false;

// ---------- materials ----------
const mp = (n, srgb, rx, ry) => tex(`kit/ph/metal_plate/metal_plate_${n}_1k.jpg`, srgb, rx, ry);
const steel = new THREE.MeshPhysicalMaterial({ color: 0xa9aeb3, metalness: 1, roughness: 0.32, roughnessMap: mp("rough", false, 3, 3) });
const darkSteel = new THREE.MeshPhysicalMaterial({ color: 0x4a4f55, metalness: 1, roughness: 0.38 });
const alu = new THREE.MeshPhysicalMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.25 });
const foil = new THREE.MeshPhysicalMaterial({ color: 0xd9b04a, metalness: 1, roughness: 0.22, normalMap: mp("nor_gl", false, 4, 4), normalScale: new THREE.Vector2(0.6, 0.6) });
const frost = new THREE.MeshPhysicalMaterial({ color: 0xe9f1f6, roughness: 0.85, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0xffffff) });
const fuelPipe = new THREE.MeshPhysicalMaterial({ color: 0x8a8f94, metalness: 1, roughness: 0.3 });
const wireM = matte(0x15171a, 0.6);
// the chamber + nozzle: brazed cooling channels (vertical tube ribs), heat tint low on the bell, glow when hot
const NU = { uHeat: { value: 0 }, uCut: { value: 0 } };
const nozzleM = new THREE.MeshPhysicalMaterial({ color: 0x585c62, metalness: 1, roughness: 0.42, side: THREE.DoubleSide });
nozzleM.onBeforeCompile = (s) => {
  s.uniforms.uHeat = NU.uHeat;
  s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvLP = position;");
  s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vLP; uniform float uHeat;")
    .replace("#include <color_fragment>", `#include <color_fragment>
      float a = atan(vLP.z, vLP.x); float rib = 0.5 + 0.5 * cos(a * 150.0); float y = vLP.y;
      diffuseColor.rgb *= 0.8 + 0.3 * rib;
      vec3 tint = mix(vec3(0.42, 0.3, 0.2), vec3(0.25, 0.28, 0.45), smoothstep(0.2, 1.1, y)); diffuseColor.rgb = mix(diffuseColor.rgb, tint, 0.35 * smoothstep(1.6, 0.4, y));
      if (y > 1.85) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.45, 0.3), 0.55);`)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      { float a2 = atan(vLP.z, vLP.x); normal = normalize(normal + vec3(sin(a2 * 150.0) * 0.18, 0.0, 0.0)); }`)
    .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      { float y2 = vLP.y; float hot = uHeat * (smoothstep(0.0, 1.85, y2) * 0.6 + smoothstep(2.3, 1.85, y2) * smoothstep(1.4, 1.9, y2)); totalEmissiveRadiance += vec3(1.6, 0.42, 0.08) * hot * hot * (gl_FrontFacing ? 0.4 : 1.4); }`);
};
nozzleM.customProgramCacheKey = () => "nozzle";

// ---------- the engine (one), built at real size; local y up, nozzle exit at y=0 ----------
const clipE = new THREE.Plane(V(0, 0, 1), 0);   // cutaway (enabled per shot by toggling clippingPlanes)
function engine(cut = false) {
  const E = new THREE.Group(), P = {};
  const prof = []; // inner/outer wall profile: exit → bell → throat → chamber → injector face
  for (let i = 0; i <= 40; i++) { const s = i / 40, y = s * 1.85, k = 1 - s; prof.push(new THREE.Vector2(0.12 + 0.34 * (1 - Math.pow(1 - k, 1.8)), y)); }
  prof.reverse(); const pts = [...prof].reverse();
  const shape = [new THREE.Vector2(0.462, 0)]; for (let i = 0; i <= 40; i++) { const s = i / 40, y = s * 1.85; shape.push(new THREE.Vector2(0.12 + 0.34 * Math.pow(1 - s, 1 / 0.55) * 0 + (0.12 + 0.34 * (1 - Math.pow(s, 0.55))) - 0.12, y)); }
  for (let i = 1; i <= 10; i++) { const s = i / 10; shape.push(new THREE.Vector2(0.12 + 0.1 * (1 - Math.cos(s * Math.PI)) / 2, 1.85 + s * 0.25)); }
  shape.push(new THREE.Vector2(0.22, 2.45));
  const wall = sh(new THREE.Mesh(new THREE.LatheGeometry(shape, 128), nozzleM)); E.add(wall); P.wall = wall;
  const lip = sh(new THREE.Mesh(new THREE.TorusGeometry(0.465, 0.012, 8, 128), darkSteel)); lip.rotation.x = Math.PI / 2; E.add(lip);
  // fuel manifold ring half-way down the bell (fuel enters the cooling channels here)
  const man = sh(new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 14, 96), steel)); man.rotation.x = Math.PI / 2; man.position.y = 0.95; E.add(man); P.man = man;
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, b = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), darkSteel)); b.position.set(Math.cos(a) * 0.33, 0.99, Math.sin(a) * 0.33); E.add(b); }
  const band = sh(new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.022, 10, 96), steel)); band.rotation.x = Math.PI / 2; band.position.y = 2.2; E.add(band);
  // injector dome + LOX inlet + gimbal block + thrust frame struts
  const dome = sh(new THREE.Mesh(new THREE.LatheGeometry([[0.24, 2.44], [0.26, 2.5], [0.25, 2.6], [0.2, 2.72], [0.12, 2.8], [0.1, 2.86], [0.0, 2.88]].map(([r, y]) => new THREE.Vector2(r, y)), 64), steel)); E.add(dome);
  const gim = sh(new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.22, 3, 0.03), darkSteel)); gim.position.y = 2.98; E.add(gim);
  for (const a of [0.3, 2.4, 4.4]) { const p0 = V(Math.cos(a) * 0.2, 2.6, Math.sin(a) * 0.2), p1 = V(0, 3.05, 0); const st = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 10), darkSteel)); st.position.copy(p0).add(p1).multiplyScalar(0.5); st.scale.y = p0.distanceTo(p1); st.quaternion.setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize()); E.add(st); }
  // turbopump: shaft along z at x=0.52, y=2.35 — LOX pump (big volute), fuel pump, turbine (hot end)
  const TP = new THREE.Group(); TP.position.set(0.55, 2.3, 0.02); E.add(TP); P.tp = TP;
  const vol = (r, w, m) => { const g = new THREE.Group(); const body = sh(new THREE.Mesh(new THREE.LatheGeometry([[0, -w], [r * 0.6, -w], [r, -w * 0.4], [r * 1.02, 0], [r, w * 0.4], [r * 0.6, w], [0, w]].map(([a, b]) => new THREE.Vector2(a, b)), 48), m)); body.rotation.x = Math.PI / 2; g.add(body);
    const scroll = sh(new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, w * 0.55, 14, 64, Math.PI * 1.7), m)); g.add(scroll); return g; };
  const loxP = vol(0.15, 0.07, alu); loxP.position.z = -0.24; TP.add(loxP);
  const fuelP = vol(0.12, 0.06, alu); fuelP.position.z = 0.02; TP.add(fuelP);
  const turb = vol(0.11, 0.05, foil); turb.position.z = 0.24; TP.add(turb);
  const shaft = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 16), steel)); shaft.rotation.x = Math.PI / 2; TP.add(shaft);
  // impellers / turbine wheel (seen in the cutaway): blades on a hub, spun per frame
  const wheel = (r, n, m, z) => { const w = new THREE.Group(); w.position.z = z; const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.5, 0.05, 32), m); hub.rotation.x = Math.PI / 2; w.add(hub);
    for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(r * 0.7, 0.008, 0.045), m); const a = i / n * TAU; b.position.set(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0); b.rotation.z = a + 0.5; w.add(b); } TP.add(w); return w; };
  P.wheels = [wheel(0.13, 10, steel, -0.24), wheel(0.1, 9, steel, 0.02), wheel(0.095, 28, foil, 0.24)];
  // gas generator (small combustor) feeding the turbine; its exhaust pipe runs down beside the nozzle
  const GG = new THREE.Group(); GG.position.set(0.82, 2.55, 0.28); E.add(GG); P.gg = GG;
  GG.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 24), foil)), sh(new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12, 0, TAU, 0, Math.PI / 2), steel)).translateY(0.1));
  const exhC = new THREE.CatmullRomCurve3([V(0.62, 2.3, 0.3), V(0.72, 2.0, 0.32), V(0.66, 1.4, 0.34), V(0.6, 0.7, 0.36), V(0.6, 0.1, 0.36)]);
  E.add(sh(new THREE.Mesh(new THREE.TubeGeometry(exhC, 64, 0.06, 16), darkSteel))); P.exh = exhC;
  const exit = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.065, 0.12, 24, 1, true), darkSteel)); exit.position.set(0.6, 0.06, 0.36); E.add(exit);
  // feed lines: LOX in (frosted) → LOX pump → injector dome; fuel in → fuel pump → manifold ring; GG feeds
  const tube = (c, r, m) => { const t = sh(new THREE.Mesh(new THREE.TubeGeometry(c, 64, r, 14), m)); E.add(t); return c; };
  P.loxIn = tube(new THREE.CatmullRomCurve3([V(0.55, 3.4, -0.55), V(0.55, 3.0, -0.52), V(0.55, 2.55, -0.46), V(0.55, 2.3, -0.36)]), 0.07, frost);
  P.loxOut = tube(new THREE.CatmullRomCurve3([V(0.55, 2.12, -0.24), V(0.42, 2.3, -0.22), V(0.25, 2.62, -0.12), V(0.1, 2.8, -0.03)]), 0.045, frost);
  P.fuelIn = tube(new THREE.CatmullRomCurve3([V(0.95, 3.4, 0.02), V(0.92, 2.9, 0.02), V(0.85, 2.4, 0.02), V(0.68, 2.3, 0.02)]), 0.055, fuelPipe);
  P.fuelOut = tube(new THREE.CatmullRomCurve3([V(0.55, 2.18, 0.04), V(0.5, 1.8, 0.12), V(0.42, 1.3, 0.2), V(0.34, 0.97, 0.1)]), 0.035, fuelPipe);
  P.ggFeed = tube(new THREE.CatmullRomCurve3([V(0.62, 2.2, 0.1), V(0.78, 2.35, 0.2), V(0.82, 2.45, 0.28)]), 0.012, fuelPipe);
  // valves (main fuel, main oxidiser) with actuators, wire harness
  for (const [p, m] of [[P.loxOut.getPoint(0.55), alu], [P.fuelOut.getPoint(0.3), alu]]) { const v = sh(new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, 0.1, 2, 0.02), m)); v.position.copy(p); E.add(v); const act = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 12), darkSteel)); act.position.copy(p).add(V(0.07, 0.03, 0)); act.rotation.z = Math.PI / 2; E.add(act); }
  E.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.15, 2.95, 0.2), V(0.4, 2.8, 0.3), V(0.7, 2.6, 0.12), V(0.86, 2.62, 0.25)]), 40, 0.009, 6), wireM));
  if (cut) E.traverse((o) => { if (o.isMesh && o.material && o.material !== wireM) { o.material = o.material.clone(); o.material.clippingPlanes = [clipE]; o.material.clipShadows = true; o.material.side = THREE.DoubleSide; } });
  return { E, P };
}
const ENG = engine(true); scene.add(ENG.E);
const EP = ENG.P;

// ---------- flows: particles riding the real paths ----------
const flowM = (c, k = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
function stream(curves, n, size, color) { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), flowM(color), n); m.frustumCulled = false; scene.add(m); H.reseed(n + curves.length); m.userData = { curves, P: Array.from({ length: n }, () => ({ u: H.rnd(), j: V(H.rnd() - 0.5, H.rnd() - 0.5, H.rnd() - 0.5) })) }; return m; }
function runStream(m, t, speed, k, root, col) { const m4 = new THREE.Matrix4(), { curves, P } = m.userData; const L = curves.length; m.visible = k > 0;
  if (!m.visible) return; P.forEach((p, i) => { const u = (p.u + t * speed) % 1, seg = Math.min(L - 1, Math.floor(u * L)), uu = u * L - seg; const pt = curves[seg].getPoint(uu).add(p.j.clone().multiplyScalar(0.02)); root.localToWorld(pt); const s = k; m4.makeScale(s, s, s).setPosition(pt); m.setMatrixAt(i, m4); if (col) m.setColorAt(i, col(u)); });
  m.instanceMatrix.needsUpdate = true; if (col && m.instanceColor) m.instanceColor.needsUpdate = true; }
// cooling channels: fuel climbs from the manifold to the injector inside the wall (a few channels drawn)
const chanC = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI - Math.PI / 2 - 0.2; const pts = []; for (let k = 0; k <= 16; k++) { const y = 0.97 + k / 16 * 1.45; const r = y < 1.85 ? 0.12 + 0.34 * (1 - Math.pow(y / 1.85, 0.55)) : y < 2.1 ? 0.12 + 0.1 * (1 - Math.cos((y - 1.85) / 0.25 * Math.PI)) / 2 : 0.22; pts.push(V(Math.cos(a) * (r + 0.008), y, Math.sin(a) * (r + 0.008))); } chanC.push(new THREE.CatmullRomCurve3(pts)); }
const loxS = stream([EP.loxIn, EP.loxOut], 260, 0.012, 0x7fc8ff), fuelS = stream([EP.fuelIn, EP.fuelOut], 220, 0.011, 0xffb347);
const chanS = stream(chanC, 360, 0.008, 0xffffff); chanS.material.color.setRGB(1, 1, 1);
const ggS = stream([EP.ggFeed], 60, 0.009, 0xffd27a), smokeS = (() => { const n = 220, m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }), n); m.frustumCulled = false; scene.add(m); H.reseed(77); m.userData.P = Array.from({ length: n }, () => ({ u: H.rnd(), j: V(H.rnd() - 0.5, H.rnd() - 0.5, H.rnd() - 0.5) })); return m; })();
// combustion: hot gas from the injector, through the throat, out of the bell (accelerating)
const NG = 700, gas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), NG); gas.frustumCulled = false; scene.add(gas);
H.reseed(9); const GP = Array.from({ length: NG }, () => ({ u: H.rnd(), a: H.rnd() * TAU, r: Math.sqrt(H.rnd()) }));
const rAt = (y) => (y < 1.85 ? 0.12 + 0.34 * (1 - Math.pow(y / 1.85, 0.55)) : y < 2.1 ? 0.12 + 0.1 * (1 - Math.cos((y - 1.85) / 0.25 * Math.PI)) / 2 : 0.22);
function runGas(t, k, colorK = 0) { gas.visible = k > 0; if (!gas.visible) return; const m4 = new THREE.Matrix4(), c = new THREE.Color();
  GP.forEach((p, i) => { const u = (p.u + t * 0.9) % 1; const y = 2.43 - Math.pow(u, 1.8) * 2.6; const rr0 = rAt(Math.max(0, y)) * 0.92 * p.r * (y < 0 ? 1 + (-y) * 0.6 : 1); const pt = V(Math.cos(p.a) * rr0, y, Math.sin(p.a) * rr0); ENG.E.localToWorld(pt);
    const s = k * (0.7 + (1 - u) * 0.8); m4.makeScale(s, s * (1 + u * 3), s).setPosition(pt); gas.setMatrixAt(i, m4);
    const hot = 1 - u * 0.7; c.setRGB(1.6 * hot + 0.4, (0.9 * hot + 0.1) * (1 - colorK) + colorK * 1.6, (0.4 * hot) * (1 - colorK) + colorK * 0.5); gas.setColorAt(i, c); });
  gas.instanceMatrix.needsUpdate = true; gas.instanceColor.needsUpdate = true; }
// plume: an additive bell of fire with shock diamonds, attached under a nozzle
const plumeU = () => ({ uT: { value: 0 }, uK: { value: 0 }, uVac: { value: 0 }, uGreen: { value: 0 } });
const PLUME_FS = `uniform float uT, uK, uVac, uGreen; varying vec3 vP; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); } float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  void main(){ float y = vUv.y; float along = 1.0 - y; float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.5);
    float dia = mix(0.55 + 0.45 * pow(max(0.0, cos(along * 26.0)), 6.0) * smoothstep(0.75, 0.0, along), 1.0, uVac);
    float fl = 0.75 + 0.25 * n2(vec2(vUv.x * 18.0, along * 9.0 - uT * 22.0));
    float fade = smoothstep(1.0, 0.05, along) * smoothstep(0.0, 0.02, along);
    vec3 core = mix(vec3(2.6, 2.2, 1.5), vec3(2.4, 0.9, 0.25), smoothstep(0.0, 0.5, along)); core = mix(core, vec3(0.6, 2.6, 0.8), uGreen);
    vec3 c = core * dia * fl * fade * (0.35 + 0.9 * edge) * uK; gl_FragColor = vec4(c, 1.0); }`;
const PLUME_VS = `varying vec3 vP; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
function makePlume(len = 6, r0 = 0.44, r1 = 0.9) { const u = plumeU(); const g = new THREE.CylinderGeometry(r0, r1, len, 48, 40, true); g.translate(0, -len / 2, 0);
  { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = -p.getY(i) / len; const bulge = 1 + Math.sin(Math.min(1, y * 3) * Math.PI) * 0.08; p.setX(i, p.getX(i) * bulge); p.setZ(i, p.getZ(i) * bulge); } g.computeVertexNormals(); }
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: PLUME_VS, fragmentShader: PLUME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.userData.u = u; m.frustumCulled = false; return m; }
const plume = makePlume(); ENG.E.add(plume);
const nozzleLight = new THREE.PointLight(0xffa040, 0, 12, 1.6); nozzleLight.position.y = -0.8; ENG.E.add(nozzleLight);

// ---------- the test stand (dark hangar, steel frame) ----------
const STAND = new THREE.Group(); scene.add(STAND);
{ const fl = sh(new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a1c1f, roughness: 0.45, clearcoat: 0.4, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 10, 10), normalMap: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_nor_gl_1k.jpg", false, 10, 10) })), false, true); fl.rotation.x = -Math.PI / 2; fl.position.y = -3.2; STAND.add(fl);
  const beam = (a, b, r = 0.08) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(r, 1, r), paint(0x2f3a44, 0.5))); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.y = a.distanceTo(b); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); STAND.add(m); };
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) { beam(V(x, -3.2, z), V(x * 0.9, 4.2, z * 0.9), 0.12); }
  for (const y of [3.1, 4.0]) { beam(V(-1.1, y, -1.1), V(1.1, y, -1.1)); beam(V(-1.1, y, 1.1), V(1.1, y, 1.1)); beam(V(-1.1, y, -1.1), V(-1.1, y, 1.1)); beam(V(1.1, y, -1.1), V(1.1, y, 1.1)); }
  beam(V(-1.1, 3.1, 0), V(1.1, 3.1, 0), 0.14); beam(V(0, 3.1, -1.1), V(0, 3.1, 1.1), 0.14);
  const tankL = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.6, 8, 32), frost)); tankL.position.set(0.55, 5.1, -0.55); STAND.add(tankL);
  const tankF = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.4, 8, 32), paint(0x9ba3aa, 0.4))); tankF.position.set(1.0, 5.0, 0.4); STAND.add(tankF); }

// ---------- the tank cutaway (a stage section: LOX above, kerosene below) ----------
const TANK = new THREE.Group(); TANK.position.set(60, 0, 0); scene.add(TANK); TANK.visible = false;
const LU = { uT: { value: 0 } };
{ const clipT = new THREE.Plane(V(0, 0, -1), 0); const R = 1.85;
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 18, 96, 1, true), H.cutaway(new THREE.MeshPhysicalMaterial({ color: 0xf2f2f0, roughness: 0.4, clippingPlanes: [clipT] }), 0x9aa3ab)); skin.position.y = 9; TANK.add(skin);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 18, 96, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x9da4ab, metalness: 0.9, roughness: 0.35, side: THREE.BackSide, clippingPlanes: [clipT], map: tex("kit/ph/metal_plate_02/metal_plate_02_diff_1k.jpg", true, 6, 8) })); inner.position.y = 9; TANK.add(inner);
  for (const y of [7.6, 0.4, 17.6]) { const dome = new THREE.Mesh(new THREE.SphereGeometry(R - 0.03, 64, 24, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xb6bcc2, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide, clippingPlanes: [clipT] })); dome.scale.y = 0.45; dome.position.y = y; if (y === 0.4) dome.rotation.x = Math.PI; TANK.add(dome); }
  const liq = (c, y0, y1, ior) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, y1 - y0, 96), new THREE.ShaderMaterial({ uniforms: { ...LU, uC: { value: new THREE.Color(c) } }, transparent: true, clipping: true, clippingPlanes: [clipT], side: THREE.DoubleSide,
      vertexShader: `#include <clipping_planes_pars_vertex>
        varying vec3 vP; void main(){ vP = position; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
        }`,
      fragmentShader: `#include <clipping_planes_pars_fragment>
        uniform vec3 uC; uniform float uT; varying vec3 vP; void main(){
        #include <clipping_planes_fragment>
        float w = 0.5 + 0.5 * sin(vP.y * 3.0 + uT * 0.8 + sin(vP.x * 2.0)); gl_FragColor = vec4(uC * (0.75 + 0.35 * w), 0.82); }` })); m.position.y = (y0 + y1) / 2; TANK.add(m); return m; };
  TANK.userData.lox = liq(0x5aa8e8, 7.8, 15.8); TANK.userData.rp = liq(0xc9862c, 0.6, 6.9);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 8.2, 24), frost); line.position.set(0.6, 3.9, 0.3); TANK.add(line); }
const NBub = 300, bubT = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.7 }), NBub); bubT.frustumCulled = false; TANK.add(bubT);
H.reseed(41); const BT = Array.from({ length: NBub }, () => ({ x: H.rnd() * 2 - 1, z: H.rnd() * 2 - 1, u: H.rnd(), s: 0.5 + H.rnd() }));

// ---------- fire needs oxygen (a kerosene drop, O2 molecules) ----------
const FIRE = new THREE.Group(); FIRE.position.set(-60, 0, 0); scene.add(FIRE); FIRE.visible = false;
const drop = sh(new THREE.Mesh(new THREE.SphereGeometry(0.25, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xc98a2c, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.92, clearcoat: 1 }))); FIRE.add(drop);
const flameF = makePlume(1.4, 0.32, 0.02); flameF.rotation.x = Math.PI; flameF.position.y = 0.05; FIRE.add(flameF);
const NO = 90, oxA = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xe8443a, roughness: 0.3, clearcoat: 1 }), NO * 2); oxA.frustumCulled = false; FIRE.add(oxA);
H.reseed(17); const OX = Array.from({ length: NO }, () => ({ p: V(H.rnd() * 4 - 2, H.rnd() * 3 - 1, H.rnd() * 3 - 1.5), v: V(H.rnd() - 0.5, H.rnd() - 0.5, H.rnd() - 0.5).normalize(), a: H.rnd() * TAU }));

// ---------- launch pad at dusk: first stage, 9 engines, tower, steam ----------
const PAD = new THREE.Group(); PAD.position.set(0, 0, -600); scene.add(PAD); PAD.visible = false;
const skyTex = tex("kit/ph/kloofendal_48d_partly_cloudy_puresky/sky_4k.jpg", true); skyTex.repeat.set(1, 1);
const dusk = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSky: { value: skyTex } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D uSky; varying vec3 vD; void main(){ vec3 d = normalize(vD); vec3 c = texture2D(uSky, vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159 + 0.5)).rgb;
    float l = dot(c, vec3(0.3, 0.59, 0.11)); vec3 dk = mix(vec3(0.95, 0.5, 0.28), vec3(0.18, 0.22, 0.42), smoothstep(-0.02, 0.45, d.y)); c = mix(dk, dk * (0.6 + l * 0.9), 0.6) * 0.75; if (d.y < 0.0) c = vec3(0.05, 0.05, 0.06); gl_FragColor = vec4(c, 1.0); }` }));
PAD.add(dusk);
const ROCKET = new THREE.Group(); PAD.add(ROCKET);
const PLUMES = [];
{ const R = 1.83; const white = new THREE.MeshPhysicalMaterial({ color: 0xeeeeec, roughness: 0.38, clearcoat: 0.4 }), black = new THREE.MeshPhysicalMaterial({ color: 0x16171a, roughness: 0.5 });
  const body = sh(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 40, 96), white)); body.position.y = 23; ROCKET.add(body);
  const inter = sh(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 5, 96), black)); inter.position.y = 45.5; ROCKET.add(inter);
  const upper = sh(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 10, 96), white)); upper.position.y = 53; ROCKET.add(upper);
  const fair = sh(new THREE.Mesh(new THREE.LatheGeometry([[2.6, 0], [2.6, 7], [2.3, 10], [1.4, 12.5], [0.4, 13.6], [0, 13.8]].map(([r, y]) => new THREE.Vector2(r, y)), 64), white)); fair.position.y = 58; ROCKET.add(fair);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.35), black)); leg.position.set(Math.cos(a) * (R + 0.1), 7.5, Math.sin(a) * (R + 0.1)); leg.rotation.y = -a; ROCKET.add(leg);
    const fin = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.08), darkSteel)); fin.position.set(Math.cos(a) * (R + 0.7), 41.5, Math.sin(a) * (R + 0.7)); fin.rotation.y = -a + Math.PI / 2; ROCKET.add(fin); }
  const skirt = sh(new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.05, 0.6, 96), darkSteel)); skirt.position.y = 2.7; ROCKET.add(skirt);
  const heat = sh(new THREE.Mesh(new THREE.CircleGeometry(R, 64), matte(0x222326, 0.8))); heat.rotation.x = Math.PI / 2; heat.position.y = 2.4; ROCKET.add(heat);
  // nine engines (octaweb: 8 around + 1 centre), the real engine model scaled to fit
  const spots = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i / 8 * TAU) * 1.25, Math.sin(i / 8 * TAU) * 1.25])];
  for (const [x, z] of spots) { const e = engine(false).E; e.scale.setScalar(0.86); e.position.set(x, -0.15, z); ROCKET.add(e); const p = makePlume(30, 0.42, 3.5); p.position.set(x, -0.15, z); ROCKET.add(p); PLUMES.push(p); } }
const padL = new THREE.PointLight(0xff9a3c, 0, 220, 1.4); padL.position.set(0, -4, 0); ROCKET.add(padL);
{ const pad = sh(new THREE.Mesh(new THREE.CylinderGeometry(40, 42, 2, 64), new THREE.MeshStandardMaterial({ color: 0x5b5a56, roughness: 0.9, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 12, 12) })), false, true); pad.position.y = -6; PAD.add(pad);
  const trench = new THREE.Mesh(new THREE.BoxGeometry(10, 2.2, 40), matte(0x101011)); trench.position.set(0, -5.9, 18); PAD.add(trench);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2500, 64), new THREE.MeshStandardMaterial({ color: 0x24291f, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -7; ground.receiveShadow = true; PAD.add(ground);
  // the service tower: a lattice of steel members (instanced)
  const TW = []; const add = (a, b) => TW.push([a, b]);
  for (let y = -6; y < 66; y += 4) { const c = [V(-12, y, -2), V(-6, y, -2), V(-6, y, 4), V(-12, y, 4)]; for (let i = 0; i < 4; i++) { add(c[i], c[(i + 1) % 4]); add(c[i], c[i].clone().setY(y + 4)); add(c[i], c[(i + 1) % 4].clone().setY(y + 4)); } }
  add(V(-6, 52, 1), V(-1.9, 52, 1)); add(V(-6, 50, 1), V(-1.9, 52, 1));
  const bg = new THREE.BoxGeometry(1, 1, 1); const im = new THREE.InstancedMesh(bg, paint(0x9a3a24, 0.6), TW.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  TW.forEach(([a, b], i) => { q.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); m4.compose(a.clone().add(b).multiplyScalar(0.5), q, V(0.35, a.distanceTo(b), 0.35)); im.setMatrixAt(i, m4); }); im.castShadow = true; PAD.add(im);
  for (const [x, z] of [[-60, -40], [55, -30], [-40, 60]]) { const lt = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 30, 12), metal(0x8a8f94, 0.4)); lt.position.set(x, 8, z); PAD.add(lt); const bulb = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.6), glow(0xfff1d0, 2.5)); bulb.position.set(x, 23.5, z); bulb.lookAt(0, 20, 0); PAD.add(bulb); } }
// steam / smoke billboards (soft sprites)
const puffTex = H.canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(235,235,235,0.45)"); gr.addColorStop(1, "rgba(220,220,220,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const NS = 320, steam = []; const steamG = new THREE.Group(); PAD.add(steamG); H.reseed(55);
for (let i = 0; i < NS; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xd9d4ce, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { a: H.rnd() * TAU, v: 0.5 + H.rnd(), d: H.rnd(), up: H.rnd() }; steamG.add(s); steam.push(s); }

// ---------- Orbi: a phone + laptop at a launch viewing spot (the rocket climbing behind) ----------
const IMG = { pnear: await img("shots/phone-nearby.png"), pobj: await img("shots/phone-object.png"), lnear: await img("shots/laptop-nearby.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); PAD.add(OR); OR.visible = false;
const lock = makeLock(); OR.add(lock); const embers = makeEmbers(); OR.add(embers);
const rail = sh(new THREE.Mesh(new RoundedBoxGeometry(14, 0.4, 5, 3, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x2a1f19, roughness: 0.35, clearcoat: 0.7, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 3, 1) }))); OR.add(rail); rail.position.set(0.5, -0.25, 0.5);
function drawPhone(g, st) { if (st.obj && IMG.pobj) g.drawImage(IMG.pobj, 0, 0, 780, 1688); else if (IMG.pnear) g.drawImage(IMG.pnear, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (st.tap > 0) { g.fillStyle = `rgba(61,255,140,${0.5 * st.tap})`; g.beginPath(); g.arc(st.tx, st.ty, 40 + 60 * (1 - st.tap), 0, 7); g.fill(); }
  if (st.burn) { g.fillStyle = "rgba(0,0,0,.8)"; rr(g, 160, 150, 460, 80, 40); g.fill(); g.fillStyle = "#ff8a3d"; g.font = "700 34px M"; g.fillText(st.burn, 205, 202); } }
function drawLap(g, st) { if (IMG.lnear) g.drawImage(IMG.lnear, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); } }

// ---------- overlays ----------
H.callouts({
  noz: ["Bell nozzle", "#ffb347", "cooled by its own fuel"], cham: ["Combustion chamber", "#ff7a3d"], inj: ["Injector", "#cfd6dd", "sprays fuel + oxygen"],
  tp: ["Turbopump", "#9fd4ff", "two pumps, one turbine"], gg: ["Gas generator", "#ffd27a", "a tiny rocket engine"], exh: ["Turbine exhaust", "#bdb4aa", "the smoky pipe"],
  loxl: ["Liquid oxygen", "#7fc8ff"], fuell: ["Kerosene", "#ffb347"], chan: ["Cooling channels", "#ffffff", "fuel soaks up the heat"],
  loxT: ["Liquid oxygen", "#7fc8ff", "−183 °C, boiling"], rpT: ["Kerosene", "#ffb347", "like jet fuel"], throat: ["Throat", "#ffffff", "squeezed"], exitV: ["Exit", "#ffd166", "≈3 km every second"],
});
hudEl("tub", `<div style="width:1080px;text-align:center"><div style="font:900 190px/0.85 D;font-stretch:112%;color:#ffd166;text-shadow:0 12px 50px rgba(0,0,0,.6)" id="tubn">300</div><div style="font:800 46px D;color:#fff;letter-spacing:.1em;margin-top:8px">LITRES EVERY SECOND</div><div style="font:700 28px M;color:#9aa6b2;letter-spacing:.14em;margin-top:10px">≈ A FULL BATHTUB · PER ENGINE</div></div>`, { left: "0px", top: "1380px" });
hudEl("temp", `<div style="width:1080px;text-align:center"><div id="tmpn" style="font:900 170px/0.85 D;font-stretch:112%;color:#ff7a3d;text-shadow:0 12px 50px rgba(0,0,0,.6)">3,300 °C</div><div style="font:800 40px D;color:#fff;letter-spacing:.1em;margin-top:8px">STEEL MELTS AT ≈1,500 °C</div></div>`, { left: "0px", top: "1400px" });
hudEl("cold", `<div style="width:1080px;text-align:center"><div style="font:900 190px/0.85 D;font-stretch:112%;color:#7fc8ff;text-shadow:0 12px 50px rgba(0,0,0,.6)">−183 °C</div><div style="font:800 40px D;color:#fff;letter-spacing:.1em;margin-top:8px">LIQUID OXYGEN BOILS</div></div>`, { left: "0px", top: "1400px" });
hudEl("rpm", `<div style="width:1080px;text-align:center"><span style="display:inline-block;padding:20px 32px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid #9fd4ff;font:800 46px D;color:#fff">TENS OF THOUSANDS <span style="color:#9fd4ff">RPM</span></span></div>`, { left: "0px", top: "1440px" });
hudEl("speed", `<div style="width:920px;margin-left:80px;padding:22px 30px;border-radius:24px;background:rgba(8,10,16,.84);border:1.5px solid rgba(255,209,102,.4)"><div style="display:flex;justify-content:space-between;font:700 26px M;letter-spacing:.16em;color:#9aa6b2"><span>GAS SPEED</span><span id="spv" style="color:#ffd166;font:900 54px D">0 m/s</span></div>
  <div style="margin-top:16px;height:30px;border-radius:15px;background:rgba(255,255,255,.08);overflow:hidden"><div id="spb" style="height:100%;width:0;border-radius:15px;background:linear-gradient(90deg,#ff7a3d,#ffd166,#ffffff)"></div></div></div>`, { left: "0px", top: "1420px" });
hudEl("o2", `<div style="width:1080px;display:flex;justify-content:center;gap:20px">${[["AIR", "21% OXYGEN", "#ff8f8f"], ["SPACE", "NONE", "#9aa6b2"], ["ROCKET", "BRINGS ITS OWN", "#3dff8c"]].map(([a, b, c], i) => `<div id="ox${i}" style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:700 22px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 40px D;color:${c}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("thrust", `<div style="width:1080px;display:flex;justify-content:center;gap:20px">${[["GAS", "↓ DOWN", "#ff9f4a"], ["ENGINE", "↑ UP", "#3dff8c"]].map(([a, b, c], i) => `<div id="th${i}" style="padding:18px 30px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:700 22px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 56px D;color:${c}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["NO ACCOUNT", "NO APP", "NEARBY"].map((s, i) => `<div id="oc${i}" style="padding:18px 26px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 40px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("timer", `<div id="tmr" style="width:1080px;text-align:center;font:800 130px M;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)">30:00</div>`, { left: "0px", top: "1440px" });

// ---------- helpers ----------
const EW = (x, y, z) => ENG.E.localToWorld(V(x, y, z));
function cutOn(k) { clipE.constant = k > 0 ? 0 : 1e6; }   // plane z = 0 through the engine (camera on −z sees inside)
function spin(t, k) { EP.wheels.forEach((w, i) => (w.rotation.z = t * (i === 2 ? 60 : 45) * k)); }
function smoke(t, k, root = ENG.E) { const m4 = new THREE.Matrix4(); smokeS.visible = k > 0; if (!smokeS.visible) return; smokeS.userData.P.forEach((p, i) => { const u = (p.u + t * 0.35) % 1; const pt = u < 0.6 ? EP.exh.getPoint(u / 0.6) : V(0.6 + p.j.x * (u - 0.6) * 2.5, 0.1 - (u - 0.6) * 5, 0.36 + p.j.z * (u - 0.6) * 2.5); root.localToWorld(pt); const s = (u < 0.6 ? 0.025 : 0.025 + (u - 0.6) * 0.35) * k; m4.makeScale(s, s, s).setPosition(pt); smokeS.setMatrixAt(i, m4); }); smokeS.instanceMatrix.needsUpdate = true; }
const fuelCol = (u) => new THREE.Color().setRGB(lerp(0.6, 2.4, u), lerp(1.2, 0.9, u), lerp(2.4, 0.3, u)); // cold blue-white → hot orange as it climbs

H.frame("Nearby · it burns", async (t) => {
  // defaults
  camRange(0.02, 6000); STAND.visible = true; ENG.E.visible = true; TANK.visible = false; FIRE.visible = false; PAD.visible = false; OR.visible = false;
  scene.background = new THREE.Color(0x07080a); H.backdrop.visible = true; scene.fog = null; H.zoom = 1; H.bloom.strength = 0.35; H.envK.value = 0.9; H.key.intensity = 2.4; H.hemi.intensity = 0.35;
  cutOn(0); NU.uHeat.value = 0; plume.userData.u.uK.value = 0; plume.userData.u.uGreen.value = 0; plume.userData.u.uVac.value = 0; plume.userData.u.uT.value = t; nozzleLight.intensity = 0;
  for (const s of [loxS, fuelS, chanS, ggS]) s.visible = false; smokeS.visible = false; gas.visible = false; spin(t, 0);
  ENG.E.position.set(0, 0, 0); ENG.E.rotation.set(0, 0, 0);
  const keyAt = (c, r) => { const s = H.key.shadow.camera; H.key.target.position.copy(c); H.key.position.copy(c.clone().add(V(6, 10, 7).normalize().multiplyScalar(r * 2))); Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 0.5, far: r * 5 }); s.updateProjectionMatrix(); };
  keyAt(V(0, 1.5, 0), 4);
  const fire = (k, hot = 1) => { plume.userData.u.uK.value = k; NU.uHeat.value = hot * k; nozzleLight.intensity = 30 * k; runGas(t, 0); smoke(t, k * 0.8); spin(t, k); H.bloom.strength = 0.35 + 0.35 * k; };

  // ---- HOOK: on the test stand, the engine fires: a bathtub a second; the bell glows
  if (t < at("tanks")) {
    const ign = ease(prog(t, fr("hook", 0.1), fr("hook", 0.25))); fire(ign, 1); ENG.E.position.x = Math.sin(t * 60) * 0.002 * ign;
    move(t, 0, at("tanks"), [V(3.2, 0.4, 4.4), V(0, 1.2, 0), 40], [V(2.4, 1.9, 3.2), V(0.1, 1.5, 0), 38]);
    flash(t, fr("hook", 0.12), 0.35, 3, "#ffd9a0");
    hudShow("tub", win(t, fr("hook", 0.4), fr("hook", 0.72)), { transform: `scale(${lerp(1.2, 1, out(prog(t, fr("hook", 0.4), fr("hook", 0.5))))})` }); H.$("tubn").textContent = String(Math.round(300 * ease(prog(t, fr("hook", 0.4), fr("hook", 0.55)))));
    callout("noz", t, fr("hook", 0.75), end("hook"), EW(0.36, 0.7, 0.2), 790, 520);
  }
  // ---- TANKS: a cutaway of the stage: liquid oxygen (boiling, −183 °C) over kerosene
  else if (t < at("why")) {
    STAND.visible = false; ENG.E.visible = false; TANK.visible = true; LU.uT.value = t;
    const m4 = new THREE.Matrix4(); BT.forEach((b, i) => { const u = (b.u + t * 0.25 * b.s) % 1; m4.makeScale(b.s, b.s, b.s).setPosition(b.x * 1.4, 8.0 + u * 7.6, b.z * 1.4 * 0.5 + 0.5); bubT.setMatrixAt(i, m4); }); bubT.instanceMatrix.needsUpdate = true;
    const C = TANK.position.clone().add(V(0, 8, 0)); keyAt(C, 14);
    move(t, at("tanks"), at("why"), [C.clone().add(V(4, 6, -16)), C.clone().add(V(0, 3, 0)), 50], [C.clone().add(V(2, 3, -12)), C.clone().add(V(0, 1, 0)), 48]);
    callout("rpT", t, fr("tanks", 0.15), end("tanks"), TANK.localToWorld(V(-0.6, 3.6, -0.4)), 300, 1050);
    callout("loxT", t, fr("tanks", 0.42), end("tanks"), TANK.localToWorld(V(0.5, 12, -0.4)), 790, 520);
    hudShow("cold", win(t, fr("tanks", 0.62), end("tanks") + 0.2));
  }
  // ---- WHY: fire needs oxygen: a drop of kerosene burns in air; in space (no oxygen) it can't; the rocket brings its own
  else if (t < at("pumps")) {
    STAND.visible = false; ENG.E.visible = false; FIRE.visible = true; scene.background = new THREE.Color(0x050608);
    const tSp = fr("why", 0.45), tOwn = fr("why", 0.72); const air = 1 - ease(prog(t, tSp, tSp + 0.8)) + ease(prog(t, tOwn, tOwn + 0.6)) * 1.4;
    flameF.userData.u.uK.value = clamp(air) * 0.9; flameF.userData.u.uT.value = t; flameF.scale.setScalar(0.6 + 0.4 * clamp(air));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const C = FIRE.position;
    OX.forEach((o, i) => { const p = o.p.clone().addScaledVector(o.v, Math.sin(t * 0.6 + i) * 0.3); const pull = clamp(air) * ((t * 0.3 + i / NO) % 1); p.lerp(V(0, 0.1, 0), pull * 0.6); const s = clamp(air * 1.2 - (i / NO) * 0.2); q.setFromAxisAngle(o.v, t + o.a);
      const d = V(0.05, 0, 0).applyQuaternion(q); m4.compose(p.clone().add(d), q, V(s, s, s)); oxA.setMatrixAt(i * 2, m4); m4.compose(p.clone().sub(d), q, V(s, s, s)); oxA.setMatrixAt(i * 2 + 1, m4); }); oxA.instanceMatrix.needsUpdate = true;
    keyAt(C, 3); move(t, at("why"), at("pumps"), [C.clone().add(V(0.5, 0.5, 4.2)), C.clone().add(V(0, 0.2, 0)), 40], [C.clone().add(V(-0.3, 0.4, 3.4)), C.clone().add(V(0, 0.2, 0)), 38]);
    hudShow("o2", win(t, fr("why", 0.1), end("why") + 0.2)); S2(H.$("ox0"), { opacity: win(t, fr("why", 0.1), 999) }); S2(H.$("ox1"), { opacity: win(t, tSp, 999) }); S2(H.$("ox2"), { opacity: win(t, tOwn, 999) });
  }
  // ---- PUMPS: cutaway turbopump: impellers spin, liquids rush in
  else if (t < at("gg")) {
    cutOn(1); spin(t, 1); runStream(loxS, t, 0.5, 1, ENG.E); runStream(fuelS, t, 0.5, 1, ENG.E);
    const C = EW(0.55, 2.3, 0); move(t, at("pumps"), at("gg"), [C.clone().add(V(-0.4, 0.35, -1.6)), C.clone().add(V(0, -0.05, 0)), 40], [C.clone().add(V(-0.1, 0.2, -1.2)), C.clone().add(V(0, -0.05, 0)), 38]);
    callout("loxl", t, fr("pumps", 0.2), fr("pumps", 0.6), EP.loxIn.getPoint(0.5), 300, 420); callout("fuell", t, fr("pumps", 0.25), fr("pumps", 0.6), EP.fuelIn.getPoint(0.5), 790, 420);
    callout("tp", t, fr("pumps", 0.55), end("pumps") + 0.2, C, 790, 1060); hudShow("rpm", win(t, fr("pumps", 0.6), end("pumps") + 0.2));
  }
  // ---- GG: the gas generator: a little fuel + oxygen burn, the turbine spins, smoke pours out of the side pipe
  else if (t < at("cool")) {
    cutOn(0); spin(t, 1); runStream(ggS, t, 0.8, 1, ENG.E); smoke(t, 1); runStream(loxS, t, 0.5, 0.7, ENG.E); runStream(fuelS, t, 0.5, 0.7, ENG.E);
    const G = EW(0.82, 2.5, 0.28); const k = prog(t, at("gg"), at("cool"));
    if (t < fr("gg", 0.6)) move(t, at("gg"), fr("gg", 0.6), [G.clone().add(V(0.9, 0.25, 1.1)), G.clone().add(V(-0.1, -0.1, 0)), 36], [G.clone().add(V(0.6, 0.1, 0.8)), G.clone().add(V(-0.15, -0.15, 0)), 34]);
    else move(t, fr("gg", 0.6), at("cool"), [V(2.6, 1.0, 2.8), V(0.4, 0.9, 0.2), 40], [V(2.2, 0.6, 2.4), V(0.4, 0.6, 0.2), 40]);
    callout("gg", t, fr("gg", 0.1), fr("gg", 0.45), G, 790, 520); callout("tp", t, fr("gg", 0.3), fr("gg", 0.6), EW(0.55, 2.3, 0.24), 300, 520);
    callout("exh", t, fr("gg", 0.65), end("gg") + 0.2, EW(0.6, 0.6, 0.36), 820, 1060);
  }
  // ---- COOL: chamber cutaway: 3,300 °C flame; cold fuel climbs the wall channels and warms up before it burns
  else if (t < at("spark")) {
    cutOn(1); NU.uHeat.value = 0.8; runGas(t, 1); runStream(chanS, t, 0.35, 1, ENG.E, fuelCol); nozzleLight.intensity = 10; H.bloom.strength = 0.55;
    const C = EW(0, 1.9, 0); move(t, at("cool"), at("spark"), [C.clone().add(V(0.5, 0.3, -2.4)), C.clone().add(V(0, -0.2, 0)), 40], [C.clone().add(V(0.2, 0.15, -1.6)), C.clone().add(V(0, -0.1, 0)), 36]);
    hudShow("temp", win(t, fr("cool", 0.05), fr("cool", 0.45)));
    callout("cham", t, fr("cool", 0.05), fr("cool", 0.45), EW(0, 2.25, 0), 790, 460); callout("chan", t, fr("cool", 0.48), end("cool") + 0.2, chanC[5].getPoint(0.6), 300, 520);
  }
  // ---- SPARK: TEA-TEB squirt → a green flash in the chamber, then the main flame lights
  else if (t < at("nozzle")) {
    const g0 = fr("spark", 0.22), g1 = fr("spark", 0.6); const gk = win(t, g0, g1, 0.12, 0.4), main = ease(prog(t, fr("spark", 0.55), fr("spark", 0.75)));
    plume.userData.u.uK.value = Math.max(gk, main); plume.userData.u.uGreen.value = clamp(gk - main * 0.8); NU.uHeat.value = main; nozzleLight.intensity = 30 * Math.max(gk, main); nozzleLight.color.setRGB(1 - gk * 0.6 + main * 0.6, 1, 0.4 + 0.2 * gk); spin(t, 1); H.bloom.strength = 0.6;
    move(t, at("spark"), at("nozzle"), [V(1.8, -1.2, 3.4), V(0, 0.4, 0), 42], [V(1.2, -1.6, 2.6), V(0, 0.2, 0), 40]);
    flash(t, g0, 0.3, 3, "#7dff9a"); callout("inj", t, at("spark") + 0.1, g0, EW(0, 2.6, 0.2), 790, 460);
  }
  // ---- NOZZLE: gas squeezed at the throat, then expanding in the bell; speed climbs to ≈3 km/s
  else if (t < at("push")) {
    cutOn(1); runGas(t, 1); NU.uHeat.value = 0.9; plume.userData.u.uK.value = 0.9; nozzleLight.intensity = 20; H.bloom.strength = 0.55;
    const C = EW(0, 1.2, 0); move(t, at("nozzle"), at("push"), [C.clone().add(V(0.3, 0.6, -3.6)), C.clone().add(V(0, 0.4, 0)), 40], [C.clone().add(V(0.1, -0.2, -3.4)), C.clone().add(V(0, -0.4, 0)), 42]);
    callout("throat", t, fr("nozzle", 0.2), fr("nozzle", 0.55), EW(0.12, 1.85, 0), 790, 520); callout("exitV", t, fr("nozzle", 0.6), end("nozzle") + 0.2, EW(0.3, 0.05, 0), 790, 1060);
    hudShow("speed", win(t, fr("nozzle", 0.25), end("nozzle") + 0.2)); const v = 2800 * ease(prog(t, fr("nozzle", 0.3), fr("nozzle", 0.95))); H.$("spv").textContent = `${Math.round(v).toLocaleString("en")} m/s`; S2(H.$("spb"), { width: `${v / 2800 * 100}%` });
  }
  // ---- PUSH: gas down, engine up (thrust); then in space the plume opens wide
  else if (t < at("nine")) {
    const tv = fr("push", 0.62); const vac = ease(prog(t, tv, tv + 1));
    fire(1); plume.userData.u.uVac.value = vac; plume.scale.set(1 + vac * 2.2, 1 + vac * 0.4, 1 + vac * 2.2);
    STAND.visible = vac < 0.5; if (vac > 0.5) { scene.background = new THREE.Color(0x000000); H.backdrop.visible = false; }
    ENG.E.position.y = 0.04 * Math.sin(t * 40) * (1 - vac) + vac * 0.2 * (t - tv);
    move(t, at("push"), at("nine"), [V(4.2, 0.2, 5.5), V(0, -0.5, 0), 44], [V(5.2, -0.6, 6.5), V(0, -1.4, 0), 46]);
    hudShow("thrust", win(t, fr("push", 0.08), tv)); S2(H.$("th0"), { opacity: win(t, fr("push", 0.08), 999) }); S2(H.$("th1"), { opacity: win(t, fr("push", 0.25), 999) });
    title(t, tv, end("push") + 0.2, "In a vacuum", "Even better");
  }
  // ---- NINE: the pad at dusk; nine engines light; steam; lift-off
  else if (t < at("orbi")) {
    STAND.visible = false; ENG.E.visible = false; PAD.visible = true; H.backdrop.visible = false; scene.background = null; scene.fog = new THREE.FogExp2(0x4a4558, 0.0018); camRange(0.3, 6000);
    H.envK.value = 0.5; H.key.intensity = 0.8; H.key.color.set(0xffc49a); H.hemi.intensity = 0.25; keyAt(PAD.position.clone().add(V(0, 20, 0)), 70);
    const ign = ease(prog(t, fr("nine", 0.15), fr("nine", 0.4))), lift = Math.max(0, t - fr("nine", 0.55)); ROCKET.position.y = 0.6 * lift * lift;
    PLUMES.forEach((p, i) => { p.userData.u.uK.value = ign * clamp((t - fr("nine", 0.15) - (i ? 0.08 : 0)) * 6); p.userData.u.uT.value = t + i; }); padL.intensity = 3000 * ign;
    steam.forEach((s, i) => { const u = clamp(((t - fr("nine", 0.18)) * (0.18 + s.userData.v * 0.1) + s.userData.d * 0.15)); const r = 4 + u * 70 * s.userData.v; s.position.set(Math.cos(s.userData.a) * r, -4 + u * (8 + 30 * s.userData.up), Math.sin(s.userData.a) * r * 0.6 + 6); s.scale.setScalar(4 + u * 28); s.material.opacity = ign * clamp(u * 4) * (1 - u * 0.6) * 0.75; s.material.color.setRGB(0.85 + 0.15 * ign, 0.78 + 0.1 * ign, 0.7); });
    const P = PAD.position; move(t, at("nine"), at("orbi"), [P.clone().add(V(38, 4, 110)), P.clone().add(V(0, 18, 0)), 36], [P.clone().add(V(30, 2, 95)), P.clone().add(V(0, 26 + ROCKET.position.y * 0.6, 0)), 38]);
    H.cam.position.x += Math.sin(t * 50) * 0.08 * ign; H.cam.position.y += Math.cos(t * 43) * 0.06 * ign;
    title(t, fr("nine", 0.55), end("nine") + 0.3, "Nine engines", "Lift-off");
  }
  // ---- ORBI: at the viewing spot, the rocket climbing behind: Nearby tab on the phone, tap a file, it opens; locked; burns
  else {
    PAD.visible = true; H.backdrop.visible = false; scene.background = null; scene.fog = new THREE.FogExp2(0x4a4558, 0.0016); STAND.visible = false; ENG.E.visible = false; camRange(0.02, 6000);
    H.envK.value = 0.55; H.key.intensity = 0.9; H.key.color.set(0xffc49a); H.hemi.intensity = 0.3;
    const lift = t - fr("nine", 0.55); ROCKET.position.y = 0.6 * lift * lift; PLUMES.forEach((p, i) => { p.userData.u.uK.value = 1; p.userData.u.uT.value = t + i; }); padL.intensity = 3000;
    steam.forEach((s) => (s.material.opacity *= 0.995));
    OR.visible = true; OR.position.set(14, 1.2, 160); OR.rotation.y = 0.35; OR.scale.setScalar(0.11); OR.updateMatrixWorld(true); const W = (x, y, z) => OR.localToWorld(V(x, y, z)); keyAt(W(0, 0, 0), 3);
    lap.g.position.set(1.6, -0.05, -0.2); lap.g.rotation.set(0, -0.35, 0); lap.lid.rotation.x = -0.2;
    ph.g.position.set(-0.6, 0.55, 0.8); ph.g.rotation.set(-0.35, 0.2, 0);
    const tTap = fr("orbi2", 0.55), tLock = fr("orbi3", 0.1), tBurn = fr("orbi3", 0.62);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [W(-0.4, 3.0, 9.0), W(0.4, 6.0, -30), 40], [W(-0.6, 2.4, 7.0), W(0.2, 2.0, -10), 38]);
    else move(t, at("orbi2"), at("end"), [W(-1.6, 2.6, 4.2), W(-0.5, 0.5, 0.6), 36], [W(-1.2, 2.2, 3.4), W(-0.55, 0.55, 0.7), 34]);
    const burnLeft = t > tBurn ? Math.round(1800 * (1 - ease(prog(t, tBurn, tBurn + 1.4)))) : 1800; const bt = `${String(Math.floor(burnLeft / 60)).padStart(2, "0")}:${String(burnLeft % 60).padStart(2, "0")}`; const burnK = prog(t, tBurn + 0.6, tBurn + 1.8);
    screen(ph, { obj: t > tTap + 0.3, tap: win(t, tTap, tTap + 0.5, 0.05, 0.3), tx: 390, ty: 900, burn: t > tLock ? `BURNS IN ${bt}` : null }, drawPhone); screen(lap, {}, drawLap);
    lock.position.copy(OR.worldToLocal(ph.g.localToWorld(V(0, 0.15, 0.3)))); const lk = win(t, tLock - 0.2, tBurn); lock.scale.setScalar(Math.max(0.001, lk * 0.45));
    embers.userData.burn(burnK > 0 ? clamp(burnK * 2) * (1 - clamp((burnK - 0.6) / 0.4)) : 0, t, (x, y) => OR.worldToLocal(ph.g.localToWorld(V(x * 0.7, y * 1.5, 0.1))));
    title(t, at("orbi") + 0.1, at("orbi2"), "Orbi Transfer", "Doesn't wait around");
    hudShow("chips", win(t, fr("orbi2", 0.1), tBurn)); for (let i = 0; i < 3; i++) S2(H.$("oc" + i), { opacity: win(t, fr("orbi2", 0.1) + i * 0.3, 999) });
    hudShow("timer", win(t, tBurn, at("end") - 0.1)); H.$("tmr").textContent = bt; S2(H.$("tmr"), { color: burnLeft < 300 ? "#ff5a36" : "#fff" });
    title(t, tLock - 0.1, tBurn, "Locked before it leaves", "Then it burns up", 150);
  }
});
await H.ready();
