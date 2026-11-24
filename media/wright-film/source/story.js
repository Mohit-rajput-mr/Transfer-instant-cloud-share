// The first flight: the real 1903 Wright Flyer (Smithsonian NASM 3D scan, CC0, 3d.si.edu) at Kitty Hawk, 17 December 1903.
// Facts (Wikipedia: Wright Flyer; Wright brothers; Boeing 747): span 40 ft 4 in (12.29 m), length 21 ft 1 in, wing area 510 sq ft,
// camber 1-in-20; spruce for straight members, ash for ribs, "Pride of the West" cotton muslin; 605 lb empty; engine by Charlie
// Taylor, 12 hp, 180 lb, cast-aluminium body; chain drive, one chain crossed → counter-rotating hand-made spruce propellers
// (8.5 ft, aluminium paint, canvas tips), 351 rpm; 6 ft wind tunnel, 200 model wings tested Oct–Dec 1901; hip cradle → wing
// warping + rudder; 60 ft launching rail into a >20 mph wind; flight 1: 12 s, 120 ft — shorter than a Boeing 747's wingspan
// (747-100: 59.6 m); flights of 175, 200 and 852 ft (59 s); minutes later a gust tumbled it end over end; it never flew again.
// The scan has shape only (no colour): the materials are the real ones, applied by part (wings/frame, metal, engine).
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
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
// THE FLYER: three scan parts (wings+frame, metal "filler", engine), node transforms baked, cm → m, centred, skids at y = 0.
// Flyer-local: nose +z, span along x, up +y. Props separated from the metal part so they can spin.
// =====================================================================================================================
const FLY = new THREE.Group(); scene.add(FLY);
const OFF = V(8.041, -96.151, -35.226);    // scan bbox centre (x, z) and skid bottom (y), in cm
const FU = { uWarp: { value: 0 }, uRud: { value: 0 }, uElev: { value: 0 }, uSun: { value: V(0, 1, 0) } };
const DEFORM = `
  // wing warping: the rear of each wing tip moves up on one side and down on the other (twist grows toward the tips)
  float inWing = smoothstep(-1.45, -1.25, transformed.z) * (1.0 - smoothstep(1.25, 1.45, transformed.z));
  transformed.y += uWarp * (transformed.x / 6.14) * ((0.9 - transformed.z) / 2.2) * 0.32 * inWing * smoothstep(0.9, 2.0, abs(transformed.x));
  // rudder (twin vertical surfaces at the tail) turns about its front edge
  float rr2 = smoothstep(-2.25, -2.4, transformed.z); vec2 rp = vec2(0.08, -2.45); vec2 d = transformed.xz - rp; float ca = cos(uRud * rr2), sa = sin(uRud * rr2);
  transformed.xz = rp + vec2(ca * d.x - sa * d.y, sa * d.x + ca * d.y);
  // the front elevator pitches about its hinge
  float ee = smoothstep(2.25, 2.4, transformed.z); vec2 ep = vec2(1.1, 2.75); vec2 e2 = transformed.yz - ep; float ce = cos(uElev * ee), se = sin(uElev * ee);
  transformed.yz = ep + vec2(ce * e2.x - se * e2.y, se * e2.x + ce * e2.y);`;
function flyerMat(mat, kind) {
  mat.side = THREE.DoubleSide; mat.roughness = 0.8; mat.metalness = 0; mat.color.set(0xffffff);
  mat.onBeforeCompile = (s) => { Object.assign(s.uniforms, FU);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWarp, uRud, uElev; varying vec3 vOP; varying vec3 vON;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n vOP = transformed; vON = objectNormal; ${kind === "prop" ? "" : DEFORM}`);
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nuniform vec3 uSun; varying vec3 vOP; varying vec3 vON; ${NOISE}`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec3 n0 = normalize(vON); float g = fbm(vec3(vOP.x * 2.0, vOP.y * 40.0, vOP.z * 40.0));
        ${kind === "wings" ? `
        // muslin on the big surfaces (wings, elevator: horizontal; rudder: vertical), spruce/ash for the frame
        float fab = smoothstep(0.62, 0.85, abs(n0.y)) * (1.0 - smoothstep(0.02, 0.0, abs(vOP.y - 0.0)) );
        fab = max(fab, smoothstep(-2.2, -2.35, vOP.z) * smoothstep(0.6, 0.85, abs(n0.x)));
        fab *= 1.0 - smoothstep(0.12, 0.0, vOP.y);                                            // skids are wood
        float weave = 0.94 + 0.06 * sin(vOP.x * 900.0) * sin(vOP.z * 900.0);
        vec3 muslin = vec3(0.93, 0.9, 0.82) * weave * (0.92 + 0.12 * fbm(vOP * 6.0));
        vec3 wood = mix(vec3(0.78, 0.55, 0.26), vec3(0.93, 0.74, 0.42), g);
        diffuseColor.rgb = mix(wood, muslin, fab);` : kind === "engine" ? `
        float cyl = smoothstep(0.85, 1.05, vOP.y);
        diffuseColor.rgb = mix(vec3(0.66, 0.67, 0.68) * (0.85 + 0.3 * g), vec3(0.16, 0.16, 0.17), cyl * 0.7);` : kind === "prop" ? `
        float rr = length(vOP.xy); float tip = smoothstep(1.02, 1.06, rr);
        diffuseColor.rgb = mix(vec3(0.74, 0.76, 0.78) * (0.9 + 0.2 * g), vec3(0.86, 0.82, 0.7), tip);` : `
        diffuseColor.rgb = vec3(0.42, 0.43, 0.45) * (0.85 + 0.3 * g);`}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n roughnessFactor = ${kind === "metal" ? "0.45" : kind === "engine" ? "0.5" : kind === "prop" ? "0.55" : "0.85"};`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\n metalnessFactor = ${kind === "metal" ? "0.85" : kind === "engine" ? "0.7" : kind === "prop" ? "0.35" : "0.0"};`)
      .replace("#include <opaque_fragment>", `${kind === "wings" ? `{ // sunlight through the thin muslin when it is lit from behind
          vec3 nw = normalize(vNormal); float bl = max(0.0, -dot(nw, normalize((viewMatrix * vec4(uSun, 0.0)).xyz))); outgoingLight += vec3(1.0, 0.92, 0.75) * bl * 0.22 * fab * diffuseColor.rgb; }` : ""}
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => "fly" + kind;
  return mat;
}
const PROPS = [];
for (const part of ["wings", "filler", "engine"]) {
  const g = await new GLTFLoader().loadAsync(`kit/models/wright/${part}.glb`); g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => { if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.translate(-OFF.x, -OFF.y, -OFF.z); geo.scale(0.01, 0.01, 0.01);
    if (part === "filler") {   // pull the two propellers out (blades + hubs: thin slab at z ≈ -1.43, x ≈ ±1.6)
      const pos = geo.attributes.position, idx = Array.from(geo.index.array), keep = [], pr = [[], []];
      const inProp = (i) => { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); return z > -1.62 && z < -1.29 && y > 0.1 && Math.abs(Math.abs(x) - 1.58) < 0.34 ? (x > 0 ? 0 : 1) : -1; };
      for (let t = 0; t < idx.length; t += 3) { const a = inProp(idx[t]), b = inProp(idx[t + 1]), c = inProp(idx[t + 2]); if (a >= 0 && a === b && b === c) pr[a].push(idx[t], idx[t + 1], idx[t + 2]); else keep.push(idx[t], idx[t + 1], idx[t + 2]); }
      geo.setIndex(keep);
      const HUBS = [V(1.622, 1.499, -1.442), V(-1.544, 1.467, -1.42)];
      pr.forEach((ix, k) => { const pg = new THREE.BufferGeometry(); for (const nm of ["position", "normal", "uv"]) if (geo.attributes[nm]) pg.setAttribute(nm, geo.attributes[nm].clone()); pg.setIndex(ix);
        pg.translate(-HUBS[k].x, -HUBS[k].y, -HUBS[k].z); const pm = flyerMat(o.material.clone(), "prop"); const m = sh(new THREE.Mesh(pg, pm)); const piv = new THREE.Group(); piv.position.copy(HUBS[k]); piv.add(m); FLY.add(piv);
        // the motion-blur disc for a fast-spinning propeller
        const disc = new THREE.Mesh(new THREE.CircleGeometry(1.3, 64), new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uA: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
          vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `uniform float uK, uA; varying vec2 vP; void main(){ float r = length(vP); float a = atan(vP.y, vP.x) - uA; float b = pow(abs(cos(a)), 40.0);
            float alpha = uK * (0.1 + 0.25 * b) * smoothstep(1.3, 1.2, r) * smoothstep(0.05, 0.2, r); vec3 c = mix(vec3(0.72, 0.74, 0.76), vec3(0.86, 0.82, 0.7), smoothstep(1.0, 1.06, r)); gl_FragColor = vec4(c, alpha); }` }));
        disc.position.z = 0.02; piv.add(disc); PROPS.push({ piv, m, disc, dir: k ? -1 : 1 }); });
    }
    const m = sh(new THREE.Mesh(geo, flyerMat(o.material, part === "wings" ? "wings" : part === "engine" ? "engine" : "metal"))); FLY.add(m); });
}
let propAng = 0;
/** spin the props: rps = revolutions per second (351 rpm ≈ 5.85) */
function props(t, rps) { PROPS.forEach((p) => { const a = t * rps * TAU * p.dir; const fast = clamp((rps - 1.5) / 3); p.m.rotation.z = a; p.m.visible = true;
  p.m.material.transparent = fast > 0.05; p.m.material.opacity = 1 - fast * 0.75; p.m.material.depthWrite = fast < 0.5; p.disc.material.uniforms.uK.value = fast; p.disc.material.uniforms.uA.value = a; }); }
const FL = (x, y, z) => FLY.localToWorld(V(x, y, z));
const ENGINE_C = V(-0.33, 0.9, 0.08), CRADLE = V(0.45, 0.62, -0.05), HUB_R = V(1.622, 1.499, -1.442), HUB_L = V(-1.544, 1.467, -1.42);

// =====================================================================================================================
// KITTY HAWK: winter sky, sand dunes with wind ripples, dune grass, blowing sand, the Atlantic, the 60 ft launching rail
// =====================================================================================================================
const KH = new THREE.Group(); scene.add(KH);
const SUN = V(-0.45, 0.42, 0.79).normalize(); FU.uSun.value.copy(SUN);
const skyU = { uSky: { value: tex("kit/ph/kloofendal_48d_partly_cloudy_puresky/sky_4k.jpg", true) }, uSun: { value: SUN }, uCold: { value: 1 } }; skyU.uSky.value.repeat.set(1, 1);
const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform sampler2D uSky; uniform vec3 uSun; uniform float uCold; varying vec3 vD; void main(){ vec3 d = normalize(vD);
    vec3 c = texture2D(uSky, vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb;
    float l = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(c, vec3(l) * vec3(0.92, 0.97, 1.05), 0.35 * uCold);                       // a pale December sky
    float sd = max(dot(d, uSun), 0.0); c += vec3(1.0, 0.93, 0.8) * pow(sd, 600.0) * 3.0 + vec3(1.0, 0.9, 0.75) * pow(sd, 12.0) * 0.12;
    if (d.y < 0.0) c = vec3(0.62, 0.64, 0.66); gl_FragColor = vec4(c, 1.0); }` }));
sky.renderOrder = -10; sky.frustumCulled = false; KH.add(sky);
const KFOG = new THREE.FogExp2(0xc4c8cc, 0.0016);
// dunes: flat camp ground near the rail, rolling dunes beyond, a big dune hill to the south-west, beach + sea to the east
const BIG = V(-170, 0, -240);
function dune(x, z) {
  const r = Math.hypot(x, z); let h = 0;
  h += (Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017) + Math.sin(x * 0.007 - z * 0.011) * 1.6) * 2.2 * smooth(clamp((r - 45) / 120));
  h += Math.sin(x * 0.11 + z * 0.05) * 0.15 + Math.sin(z * 0.13 - x * 0.03) * 0.12;
  const b = Math.hypot(x - BIG.x, z - BIG.z); h += 27 * Math.exp(-Math.pow(b / 95, 2));                    // the big dune (~27 m)
  h -= 6 * smooth(clamp((x - 330) / 60));                                                                 // down to the beach
  return h;
}
{ const g = new THREE.PlaneGeometry(2400, 2400, 360, 360); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const k = Math.max(Math.abs(x), Math.abs(z)) < 120 ? 1 : 1; p.setY(i, dune(x, z) * k); }
  g.computeVertexNormals();
  const sd = (n, s, r) => tex(`kit/ph/coast_sand_05/coast_sand_05_${n}_1k.jpg`, s, r, r);
  const mat = new THREE.MeshStandardMaterial({ map: sd("diff", true, 600), normalMap: sd("nor_gl", false, 600), normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.95, color: 0xfff6e6 });
  mat.onBeforeCompile = (s) => { s.uniforms.uT = SU.uT;
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP2;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vWP2 = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWP2; uniform float uT; ${NOISE}`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        float big = fbm(vWP2 * 0.02); float rip = 0.5 + 0.5 * sin(vWP2.z * 5.5 + vWP2.x * 1.3 + fbm(vWP2 * 0.4) * 6.0);
        diffuseColor.rgb = pow(diffuseColor.rgb, vec3(0.6)) * vec3(1.18, 1.08, 0.92) * mix(0.92, 1.08, big) * (0.95 + 0.07 * rip);
        float wet = smoothstep(318.0, 345.0, vWP2.x); diffuseColor.rgb *= 1.0 - 0.35 * wet;`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { float e = 0.02; float r0 = sin(vWP2.z * 5.5 + vWP2.x * 1.3 + fbm(vWP2 * 0.4) * 6.0); normal = normalize(normal + (viewMatrix * vec4(0.0, 0.0, cos(vWP2.z * 5.5 + vWP2.x * 1.3) * 0.09, 0.0)).xyz); }`); };
  const ground = new THREE.Mesh(g, mat); ground.receiveShadow = true; KH.add(ground); }
const SU = { uT: { value: 0 }, uWind: { value: 1 } };
const sea = new Water(new THREE.PlaneGeometry(6000, 6000, 8, 8), { textureWidth: 512, textureHeight: 512, waterNormals: tex("kit/ph/coast_sand_05/coast_sand_05_nor_gl_1k.jpg"), sunDirection: SUN.clone(), sunColor: 0xfff0dd, waterColor: 0x2c4a55, distortionScale: 2.5, fog: true });
sea.rotation.x = -Math.PI / 2; sea.position.set(3300, -3.2, 0); KH.add(sea);
// dune grass: tufts of thin blades (instanced), swaying in the wind
{ const blade = new THREE.PlaneGeometry(0.025, 0.55, 1, 4); blade.translate(0, 0.275, 0); const parts = [];
  for (let i = 0; i < 9; i++) { const b = blade.clone(); b.rotateZ((hash(i) - 0.5) * 0.7); b.rotateY(hash(i + 3) * TAU); b.scale(1, 0.6 + hash(i + 7) * 0.8, 1); parts.push(b); }
  const merged = (() => { const pos = [], uv = [], idx = []; let o = 0; for (const p of parts) { const a = p.attributes.position, u = p.attributes.uv; for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); uv.push(u.getX(i), u.getY(i)); } for (const i of p.index.array) idx.push(i + o); o += a.count; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
  const gm = new THREE.MeshStandardMaterial({ color: 0xb59a6a, roughness: 0.9, side: THREE.DoubleSide });
  gm.onBeforeCompile = (s) => { s.uniforms.uT = SU.uT; s.uniforms.uWind = SU.uWind; s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT, uWind;").replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float bend = uv.y * uv.y * uWind; transformed.z -= bend * (0.18 + 0.08 * sin(uT * 7.0 + ip.x * 0.7 + ip.z * 0.3)); transformed.y -= bend * 0.05;`);
    s.fragmentShader = s.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb *= 0.6 + 0.55 * vUv.y;").replace("#include <common>", "#include <common>\n"); s.vertexShader = s.vertexShader.replace("#include <uv_pars_vertex>", "#include <uv_pars_vertex>\n"); };
  gm.defines = { USE_UV: "" };
  const N = 5000, G = new THREE.InstancedMesh(merged, gm, N); const m4 = new THREE.Matrix4(); H.reseed(31); let n = 0;
  while (n < N) { const a = H.rnd() * TAU, r = 14 + Math.pow(H.rnd(), 0.7) * 260; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < 6 && z > -12 && z < 70) continue; if (x > 300) continue;
    const s = 0.7 + H.rnd() * 1.1; m4.makeRotationY(H.rnd() * TAU).scale(V(s, s, s)).setPosition(x, dune(x, z) - 0.03, z); G.setMatrixAt(n++, m4); }
  G.castShadow = true; G.receiveShadow = true; KH.add(G); }
// blowing sand: thin streaks skimming the ground, carried by the wind from +z toward -z
const NSA = 2600, SAND = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.004, 1), new THREE.MeshBasicMaterial({ color: 0xe6d8bd, transparent: true, opacity: 0.55, depthWrite: false }), NSA); SAND.frustumCulled = false; KH.add(SAND);
function sandWind(t, c, k, R = 22) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < NSA; i++) { const sp = 9 + hash(i) * 8; const z = c.z + R - ((hash(i + 1) * 2 * R + t * sp) % (2 * R)); const x = c.x + (hash(i + 2) - 0.5) * 2 * R; const y = dune(x, z) + Math.pow(hash(i + 3), 3) * 1.4 + 0.02;
    const s = k * (0.3 + hash(i + 4)); m4.compose(V(x, y, z), q, V(s * 1.5, s * 1.5, s * (0.08 + sp * 0.03))); SAND.setMatrixAt(i, m4); }
  SAND.instanceMatrix.needsUpdate = true; }
// the launching rail: 60 ft (18.3 m) of 2×4 timbers capped with a metal strip, pointed into the wind; the little wheeled dolly
const RAIL_L = 18.29, RAIL_Z0 = -2.0;
const RAIL = new THREE.Group(); KH.add(RAIL);
{ const wood = new THREE.MeshStandardMaterial({ map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 8, 0.3), color: 0xc8b090, roughness: 0.85 });
  const r = sh(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, RAIL_L), wood)); r.position.set(0, 0.07, RAIL_Z0 + RAIL_L / 2); RAIL.add(r);
  const strip = sh(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, RAIL_L), metal(0x8a8d90, 0.4))); strip.position.set(0, 0.145, RAIL_Z0 + RAIL_L / 2); RAIL.add(strip);
  for (let i = 0; i < 6; i++) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), wood)); b.position.set(0, 0.02, RAIL_Z0 + 0.5 + i * (RAIL_L - 1) / 5); RAIL.add(b); } }
const DOLLY = new THREE.Group(); KH.add(DOLLY);
{ const p = sh(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 1.8), new THREE.MeshStandardMaterial({ color: 0x9b8566, roughness: 0.8 }))); p.position.y = 0.2; DOLLY.add(p);
  for (const z of [-0.6, 0.6]) { const w = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), metal(0x6a6d70, 0.4))); w.rotation.z = Math.PI / 2; w.position.set(0, 0.17, z); DOLLY.add(w); } }
// sand kicked up by the skids / the gust
const NPU = 900, PUFF = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.018, 1), new THREE.MeshStandardMaterial({ color: 0xe6d8bd, roughness: 1, transparent: true, opacity: 0.4, depthWrite: false }), NPU); PUFF.frustumCulled = false; KH.add(PUFF);
function puff(t, t0, c, k = 1, spread = 2) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const dt = t - t0;
  for (let i = 0; i < NPU; i++) { const a = hash(i) * TAU, sp = (0.5 + hash(i + 1) * 2) * spread; const tt = Math.max(0, dt - hash(i + 2) * 0.4); const s = dt > 0 ? k * (0.5 + hash(i + 3)) * (1 + tt * 0.6) * clamp(1 - tt / 2.5) : 0;
    m4.compose(V(c.x + Math.cos(a) * sp * tt - tt * 3, c.y + 0.1 + tt * (0.6 + hash(i + 4)), c.z + Math.sin(a) * sp * tt - tt * 5), q, V(s, s * 0.7, s)); PUFF.setMatrixAt(i, m4); }
  PUFF.instanceMatrix.needsUpdate = true; }
// flight-path lines on the sand: the 1st flight (120 ft), a 747's wingspan (59.6 m), and the day's four flights
function pathLine(len, col, dash = 0.6) { const g = new THREE.PlaneGeometry(0.18, len, 1, Math.ceil(len * 4)); g.rotateX(-Math.PI / 2); g.translate(0, 0, len / 2); const p = g.attributes.position;
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uC: { value: new THREE.Color(col) }, uL: { value: len } }, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: `varying float vZ; void main(){ vZ = position.z; vec3 p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uK, uL; uniform vec3 uC; varying float vZ; void main(){ float vis = step(vZ, uK * uL); float d = step(0.45, fract(vZ / ${dash.toFixed(2)})); gl_FragColor = vec4(uC * 1.6, vis * (0.35 + 0.65 * d)); }` }));
  m.userData.drape = () => { for (let i = 0; i < p.count; i++) { const w = m.localToWorld(V(p.getX(i), 0, p.getZ(i))); p.setY(i, dune(w.x, w.z) + 0.04 - m.position.y); } p.needsUpdate = true; };
  KH.add(m); return m; }
const TAKEOFF_Z = RAIL_Z0 + 12.2;                    // lifted off after ~40 ft of rail
const L120 = pathLine(36.58, 0x3dff8c), L747 = pathLine(59.6, 0xffd166, 1.2);
L120.position.set(0, 0, TAKEOFF_Z); L747.position.set(2.2, 0, TAKEOFF_Z); L120.userData.drape(); L747.userData.drape();
const FLIGHTS = [36.58, 53.3, 61.0, 259.7].map((len, i) => { const l = pathLine(len, [0x3dff8c, 0x6fd0ff, 0xffd166, 0xff8a3d][i], 0.8); l.position.set((i - 1.5) * 1.6, 0, TAKEOFF_Z); l.rotation.y = (i - 1.5) * 0.04; l.updateMatrixWorld(); l.userData.drape(); return l; });
/** the first flight: u = 0..1 over 12 s. Returns position (flyer-local origin) and pitch */
function flight1(u) { const z = TAKEOFF_Z + 36.58 * u; const y = 0.2 + 2.6 * Math.pow(Math.sin(Math.PI * clamp(u)), 0.7) + 0.55 * Math.sin(u * TAU * 2.2) * Math.sin(Math.PI * u); const pitch = -0.12 * Math.cos(u * TAU * 2.2) * Math.sin(Math.PI * u) - 0.05 * Math.cos(Math.PI * u); return { p: V(0, y, z), pitch }; }

// =====================================================================================================================
// THE WIND TUNNEL (1901): a 6 ft wooden box, a fan at one end, a glass window on top, model wings on a balance inside
// =====================================================================================================================
const WT = new THREE.Group(); scene.add(WT); WT.position.set(0, 0, -4000);
const WTU = { uT: { value: 0 } };
{ const wood = new THREE.MeshStandardMaterial({ map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1), roughness: 0.8, color: 0xd9c4a4 });
  const floorM = new THREE.MeshStandardMaterial({ map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 6, 6), roughness: 0.7, color: 0x8a7258 });
  const fl = sh(new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorM), false, true); fl.rotation.x = -Math.PI / 2; WT.add(fl);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 14), new THREE.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 0.95, side: THREE.BackSide })); wall.position.y = 3; WT.add(wall);
  const bench = sh(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.9), wood)); bench.position.set(0, 0.86, 0); WT.add(bench);
  for (const x of [-1.2, 1.2]) for (const z of [-0.38, 0.38]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.86, 0.07), wood)); l.position.set(x, 0.43, z); WT.add(l); }
  // the tunnel: 6 ft long, 16 in square inside, along x
  const L = 1.83, S = 0.41, T = 0.025, y0 = 0.9 + S / 2 + T;
  for (const [w, h, d, x, y, z] of [[L, T, S + 2 * T, 0, y0 - S / 2 - T / 2, 0], [L, S, T, 0, y0, -S / 2 - T / 2]]) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood)); b.position.set(x, y, z); WT.add(b); }
  { const gl2 = new THREE.Mesh(new THREE.BoxGeometry(L, S, 0.006), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.03, clearcoat: 1, depthWrite: false })); gl2.position.set(0, y0, S / 2 + 0.01); WT.add(gl2);
    for (const yy of [y0 - S / 2, y0 + S / 2]) { const f = sh(new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, 0.03), wood)); f.position.set(0, yy, S / 2 + 0.015); WT.add(f); } }  // near side: glass, so the inside shows
  const glassTop = new THREE.Mesh(new THREE.BoxGeometry(L * 0.5, 0.01, S), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1 })); glassTop.position.set(0.15, y0 + S / 2 + 0.005, 0); WT.add(glassTop);
  for (const x of [-L / 2, -0.11, 0.4, L / 2]) { if (Math.abs(x) < 0.5 && x !== -0.11 && x !== 0.4) continue; const b = sh(new THREE.Mesh(new THREE.BoxGeometry(x === -0.11 || x === 0.4 ? 0.04 : 0.5 + 0.0, T, S + 2 * T), wood)); b.position.set(x === -L / 2 ? -L / 2 + 0.25 : x === L / 2 ? L / 2 - 0.25 : x, y0 + S / 2 + T / 2, 0); WT.add(b); }
  // fan at the upstream end (x < 0): hub + 2 blades
  const fan = new THREE.Group(); fan.position.set(-L / 2 - 0.12, y0, 0); WT.add(fan); WT.userData.fan = fan;
  for (let i = 0; i < 2; i++) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.42, 0.07), metal(0x6a6e72, 0.4))); b.rotation.x = i * Math.PI; b.rotation.y = 0.35; fan.add(b); }
  fan.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), metal(0x3a3d40, 0.4))).rotateZ(Math.PI / 2));
  // the balance + a model wing (thin cambered plate) mid-tunnel
  const bal = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 8), metal(0x9a8a60, 0.35))); bal.position.set(0.15, y0 - 0.06, 0); WT.add(bal);
  const mw = new THREE.Shape(); mw.moveTo(-0.075, 0); mw.quadraticCurveTo(0, 0.015, 0.075, 0); mw.lineTo(0.075, -0.002); mw.quadraticCurveTo(0, 0.013, -0.075, -0.002); mw.closePath();
  const mwg = new THREE.ExtrudeGeometry(mw, { depth: 0.15, bevelEnabled: false }); mwg.translate(0, 0, -0.075);
  const model = sh(new THREE.Mesh(mwg, metal(0xb9b3a6, 0.3))); model.position.set(0.15, y0 + 0.06, 0); model.rotation.z = 0.08; WT.add(model); WT.userData.model = model;
  // shelf of tested model wings on the wall: 200 little plates
  const plate = new THREE.BoxGeometry(0.07, 0.002, 0.05); const IM = new THREE.InstancedMesh(plate, metal(0xa9a397, 0.35), 200); const m4 = new THREE.Matrix4();
  for (let i = 0; i < 200; i++) { const r = Math.floor(i / 25), c = i % 25; m4.makeRotationZ((hash(i) - 0.5) * 0.3).setPosition(-1.5 + c * 0.12, 1.5 + r * 0.16, -2.4); IM.setMatrixAt(i, m4); }
  WT.add(IM);
  for (let r = 0; r < 8; r++) { const s = sh(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.02, 0.15), wood)); s.position.set(-0.04, 1.49 + r * 0.16, -2.43); WT.add(s); }
  WT.userData.y0 = y0; }
const lampWT = new THREE.PointLight(0xffd7a0, 45, 10, 1.5); lampWT.position.set(0.4, 2.4, 1.0); WT.add(lampWT);
// air streaks through the tunnel (bending over the model wing)
const NWS = 260, WSTREAK = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.003, 0.003), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.8), transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }), NWS); WSTREAK.frustumCulled = false; WT.add(WSTREAK);
function tunnelAir(t, k) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const y0 = WT.userData.y0;
  for (let i = 0; i < NWS; i++) { const u = (hash(i) + t * (0.8 + hash(i + 1) * 0.5)) % 1; const x = -0.9 + u * 1.8; const zz = (hash(i + 2) - 0.5) * 0.36; let y = y0 + (hash(i + 3) - 0.5) * 0.36;
    const dx = x - 0.15; const near = Math.exp(-dx * dx / 0.01) * Math.exp(-Math.pow((y - y0 - 0.06) / 0.08, 2)); y += near * 0.03 * Math.sign(y - y0 - 0.06 + 0.001) + (dx > 0 ? -0.04 * Math.exp(-Math.pow((y - y0 - 0.06) / 0.1, 2)) * clamp(dx / 0.3) : 0);
    m4.compose(V(x, y, zz), q, V(0.08 * k, k, k)); WSTREAK.setMatrixAt(i, m4); }
  WSTREAK.instanceMatrix.needsUpdate = true; }

// =====================================================================================================================
// LIFT, explained: a section through the wing (1-in-20 camber), air flowing past and turned downward; pressure tint
// =====================================================================================================================
const LF = new THREE.Group(); scene.add(LF); LF.position.set(0, 0, 4000);
const LU = { uT: { value: 0 }, uK: { value: 0 } };
{ const C = 2.0, cam = C / 20;   // chord 2 m, camber 1:20
  const s = new THREE.Shape(); const N = 40; for (let i = 0; i <= N; i++) { const x = i / N; const yc = 4 * cam * x * (1 - x); const tk = 0.012 * Math.sin(Math.PI * Math.min(1, x * 1.4)); i ? s.lineTo(x * C - C / 2, yc + tk) : s.moveTo(x * C - C / 2, yc + tk); }
  for (let i = N; i >= 0; i--) { const x = i / N; const yc = 4 * cam * x * (1 - x); s.lineTo(x * C - C / 2, yc - 0.006); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: false }); g.translate(0, 0, -0.8);
  const w = sh(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 0.8 }))); w.rotation.z = -0.1; LF.add(w); LF.userData.wing = w;
  // pressure field: a plane behind the section, low (blue) above, high (warm) below
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.ShaderMaterial({ uniforms: LU, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uK, uT; varying vec2 vP; void main(){ vec2 p = vP; float d = length((p - vec2(0.0, 0.25)) * vec2(0.55, 1.4)); float above = smoothstep(0.0, 0.25, p.y - 0.06) * exp(-d * d * 1.4);
      float below = smoothstep(0.0, 0.2, -p.y - 0.02) * exp(-dot((p - vec2(0.0, -0.2)) * vec2(0.6, 1.5), (p - vec2(0.0, -0.2)) * vec2(0.6, 1.5)) * 1.6);
      vec3 c = vec3(0.25, 0.55, 1.2) * above + vec3(1.2, 0.45, 0.2) * below; gl_FragColor = vec4(c, (above + below) * 0.55 * uK); }` }));
  pf.position.z = -0.85; LF.add(pf);
  // flow streamlines: tubes whose pulses travel; they rise ahead of the wing, follow it, and leave angled down (downwash)
  const SLG = new THREE.Group(); LF.add(SLG); LF.userData.sl = SLG;
  for (let l = 0; l < 13; l++) { const y0 = (l - 6) * 0.22; const pts = [];
    for (let i = 0; i <= 90; i++) { const x = -4 + i / 90 * 8; const infl = Math.exp(-Math.pow(y0 / 0.9, 2)); let y = y0 + infl * (0.22 * Math.exp(-Math.pow((x + 0.6) / 0.9, 2)) - 0.45 * smooth(clamp((x - 0.2) / 2.6)) * (x > 0.2 ? 1 : 0) + 0.08);
      if (Math.abs(x) < 1.05 && Math.abs(y0) < 0.25) y = y0 > 0 ? Math.max(y, 0.13 + y0 * 0.6) : Math.min(y, -0.04 + y0 * 0.6); pts.push(V(x, y, 0.82)); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.012, 5, false);
    const m = new THREE.Mesh(tg, new THREE.ShaderMaterial({ uniforms: LU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uT, uK; varying vec2 vU; void main(){ float p = fract(vU.x * 7.0 - uT * 0.8); float pulse = smoothstep(0.0, 0.2, p) * smoothstep(0.4, 0.2, p); gl_FragColor = vec4(vec3(0.6, 1.2, 1.9) * (0.15 + pulse) * uK, 1.0); }` }));
    SLG.add(m); }
  // arrows: lift (up, green) and air pushed down (orange)
  const arrow = (col, len) => { const g2 = new THREE.Group(); const sh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 16), glow(col, 1.6)); sh2.position.y = len / 2; const hd = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 20), glow(col, 1.6)); hd.position.y = len + 0.12; g2.add(sh2, hd); return g2; };
  const up = arrow(0x3dff8c, 1.2); up.position.set(0, 0.25, 0.9); LF.add(up); LF.userData.up = up;
  const dn = arrow(0xff8a3d, 0.9); dn.rotation.z = Math.PI + 0.5; dn.position.set(1.4, -0.35, 0.9); LF.add(dn); LF.userData.dn = dn; }

// =====================================================================================================================
// THE MUSEUM + ORBI: the Flyer on display in a dark gallery; a phone shares into a private Space, the laptop joins with
// the passcode and opens the file; the public feed never shows it
// =====================================================================================================================
const MUS = new THREE.Group(); scene.add(MUS); MUS.position.set(4000, 0, 0);
{ const fl = sh(new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshPhysicalMaterial({ color: 0x1b1d21, roughness: 0.35, clearcoat: 0.4, map: tex("kit/ph/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg", true, 12, 12) })), false, true);
  fl.rotation.x = -Math.PI / 2; MUS.add(fl);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 18, 60), new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.9, side: THREE.BackSide })); wall.position.y = 9; MUS.add(wall);
  const dais = sh(new THREE.Mesh(new RoundedBoxGeometry(15, 0.5, 8.5, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.75 }))); dais.position.y = 0.25; MUS.add(dais);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(15.02, 0.02, 8.52), glow(0x9fc4ff, 1.1)); edge.position.y = 0.5; MUS.add(edge); }
const mSpots = [V(8, 9, 7), V(-8, 8.5, 6), V(0, 10, -7)].map((p, i) => { const s = new THREE.SpotLight(i === 2 ? 0x9fb8ff : 0xfff0dd, i === 2 ? 50 : 110, 40, 0.42, 0.6, 1.5); s.position.copy(p); s.target.position.set(0, 1.4, 0); s.castShadow = i === 0; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0002; MUS.add(s, s.target); return s; });
const IMG = { lap: await img("shots_live/laptop.png"), ph: await img("shots_live/phone.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); MUS.add(OR); OR.position.set(1.0, 0.0, 9.5); OR.rotation.y = 0.1;
const bench = sh(new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.36, 1.9, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x5a4632, roughness: 0.55, clearcoat: 0.3, map: tex("kit/ph/wood_table_001/wood_table_001_diff_1k.jpg", true, 2, 1) }))); bench.position.set(0.2, -0.2, 0.3); OR.add(bench);
for (const x of [-2.2, 2.6]) { const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.6), metal(0x2a2d31, 0.4))); leg.position.set(x, -0.62, 0.3); OR.add(leg); }
OR.position.y = 0.8; ph.g.position.set(1.5, 0.06, 0.5); ph.g.rotation.set(-Math.PI / 2 + 0.55, 0, -0.18); lap.g.position.set(-1.0, 0, -0.2); lap.g.rotation.y = 0.28; lap.g.scale.setScalar(0.8);
const orbiL = new THREE.PointLight(0x3dff8c, 0, 4, 2); orbiL.position.set(1.5, 0.6, 0.6); OR.add(orbiL);
const lock = makeLock(); OR.add(lock); lock.visible = false;
// a floating "room" around the two devices: the private Space (a glowing ring with a lock), strangers' phones outside it
const ROOM = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.02, 8, 160), glow(0x3dff8c, 1.6)); ROOM.rotation.x = Math.PI / 2; ROOM.position.set(0.2, 0.02, 0.2); OR.add(ROOM);
const OUT = [0, 1, 2].map((i) => { const p = makePhone(0x3a3d42); p.g.scale.setScalar(0.7); p.g.position.set(-3.6 + i * 3.9, 0.1 + (i === 1 ? 0.6 : 0), -2.8 - (i === 1 ? 0.8 : 0)); p.g.rotation.y = (i - 1) * 0.4; OR.add(p.g); return p; });
const card = (a, b, c = "#fff") => `<div style="padding:20px 26px;border-radius:22px;background:rgba(8,10,16,.8);border:1.5px solid rgba(255,255,255,.2);text-align:center"><div style="font:700 24px M;letter-spacing:.14em;color:#aab3bd">${a}</div><div style="font:900 56px D;font-stretch:112%;color:${c};margin-top:6px">${b}</div></div>`;
function drawPhone(g, st) { if (IMG.ph) g.drawImage(IMG.ph, 0, 0, 780, 1688); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); }
  if (!st.on) return; g.fillStyle = "rgba(8,10,14,.94)"; rr(g, 50, 520, 680, 640, 34); g.fill();
  g.fillStyle = green; g.font = "800 30px M"; g.fillText("🔒 PRIVATE SPACE", 90, 585); g.fillStyle = "#fff"; g.font = "900 46px D"; g.fillText("flyer-workshop", 90, 645);
  g.fillStyle = "#9aa3ad"; g.font = "700 26px M"; g.fillText(`passcode ••••••  ·  ${st.members} member${st.members > 1 ? "s" : ""}`, 90, 690);
  ["wing-tests-1901.pdf", "engine-plans.png", "propeller-notes.txt"].forEach((f, i) => { const y = 740 + i * 110; const vis = st.files > i; g.globalAlpha = vis ? 1 : 0.18;
    g.fillStyle = "rgba(255,255,255,.07)"; rr(g, 90, y, 600, 88, 18); g.fill(); g.fillStyle = "#fff"; g.font = "700 30px M"; g.fillText(f, 120, y + 54); g.fillStyle = green; g.fillText("🔒", 640, y + 54); g.globalAlpha = 1; });
  g.fillStyle = "#cfd6dd"; g.font = "700 26px M"; g.fillText("never shown in public · members only", 90, 1112); }
function drawLap(g, st) { if (IMG.lap) g.drawImage(IMG.lap, 0, 0, 1440, 900); else { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 1440, 900); }
  if (!st.on) return; g.fillStyle = "rgba(8,10,14,.93)"; rr(g, 60, 520, 980, 340, 26); g.fill(); g.fillStyle = "#fff"; g.font = "800 34px M"; g.fillText("Join Space  ·  flyer-workshop", 96, 580);
  g.fillStyle = "rgba(255,255,255,.08)"; rr(g, 96, 610, 560, 70, 14); g.fill(); g.fillStyle = "#fff"; g.font = "800 40px M"; g.fillText("•".repeat(st.typed), 120, 660);
  g.fillStyle = st.joined ? green : "#9aa3ad"; g.font = "800 30px M"; g.fillText(st.joined ? "✓ JOINED · 3 FILES UNLOCKED" : st.typed ? "PASSCODE…" : "ENTER PASSCODE", 96, 740);
  if (st.joined) { g.fillStyle = "#cfd6dd"; g.font = "700 26px M"; g.fillText("wing-tests-1901.pdf · engine-plans.png · propeller-notes.txt", 96, 800); } }
function drawStranger(g, st) { g.fillStyle = "#0b0d10"; g.fillRect(0, 0, 780, 1688); g.fillStyle = "rgba(255,255,255,.06)"; rr(g, 60, 600, 660, 300, 30); g.fill();
  g.fillStyle = "#9aa3ad"; g.font = "800 34px M"; g.fillText("OPEN VOID · NEARBY", 100, 680); g.fillStyle = "#fff"; g.font = "700 30px M"; g.fillText("nothing from that Space", 100, 760); g.fillStyle = "#ff7a6d"; g.fillText("🔒 members only", 100, 830); }

// =====================================================================================================================
// OVERLAYS
// =====================================================================================================================
H.callouts({
  scan: ["Laser scan", "#9fd4ff", "every wire, every rib"], spruce: ["Spruce", "#ffd166", "straight parts: spars, struts"], ash: ["Ash", "#ff9a5c", "curved parts: the ribs"], muslin: ["Cotton muslin", "#f2efe8", "\"Pride of the West\""],
  eng: ["The engine", "#cfd6dd", "built from scratch"], al: ["Aluminium body", "#9fd4ff", "to save weight"], chainX: ["One chain crossed", "#ff8a3d", "so the props spin opposite"],
  propL: ["Propeller", "#cfd6dd", "spruce, carved by hand"], fan: ["Fan", "#cfd6dd", "makes the wind"], model: ["Model wing", "#ffd166", "on a balance"], shelf: ["200 test wings", "#ff9a5c", "Oct – Dec 1901"],
  liftA: ["Lift", "#3dff8c", "air pushes the wing up"], down: ["Air pushed down", "#ff8a3d", "the wing's reaction"], cradle: ["Hip cradle", "#ffd166", "the pilot's hips steer"], tips: ["Wing tips twist", "#3dff8c", "\"wing warping\""],
  rud: ["Rudder turns too", "#9fd4ff", "linked by wires"], rail: ["Launching rail", "#ffd166", "60 ft of wood"], wind: ["Wind", "#9fd4ff", "over 30 km/h"],
  f1: ["Flight 1 · 37 m", "#3dff8c", "12 seconds"], jet: ["Jumbo jet wingspan", "#ffd166", "59.6 m (747-100)"], f4: ["Flight 4 · 260 m", "#ff8a3d", "59 seconds"],
  room: ["Private Space", "#3dff8c", "a named room + passcode"], outsiders: ["Everyone else", "#ff7a6d", "sees nothing"],
});
hudEl("stats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("WINGSPAN", "12.3 m")}${card("EMPTY", "274 kg")}${card("WING AREA", "47 m²")}</div>`, { left: "0px", top: "1440px" });
hudEl("estats", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("POWER", "12 hp")}${card("ENGINE", "82 kg")}${card("PROPS", "351 rpm")}</div>`, { left: "0px", top: "1440px" });
hudEl("timer", `<div style="width:1080px;display:flex;justify-content:center;gap:18px"><div style="padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #3dff8c;text-align:center"><div style="font:700 24px M;letter-spacing:.16em;color:#aab3bd">TIME</div><div id="tmT" style="font:900 96px/1 D;font-stretch:112%;color:#fff">0.0 s</div></div><div style="padding:16px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #3dff8c;text-align:center"><div style="font:700 24px M;letter-spacing:.16em;color:#aab3bd">DISTANCE</div><div id="tmD" style="font:900 96px/1 D;font-stretch:112%;color:#3dff8c">0 m</div></div></div>`, { left: "0px", top: "230px" });
hudEl("day", `<div style="width:1080px;display:flex;justify-content:center;gap:18px">${card("DATE", "17 DEC 1903")}${card("WIND", "30+ km/h", "#9fd4ff")}</div>`, { left: "0px", top: "1440px" });
hudEl("sped", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">SPED UP ×2</div>`, { left: "395px", top: "1110px" });
hudEl("flights", `<div style="width:1080px;display:flex;justify-content:center;gap:12px">${[["1", "37 m", "#3dff8c"], ["2", "53 m", "#6fd0ff"], ["3", "61 m", "#ffd166"], ["4", "260 m", "#ff8a3d"]].map(([n, d, c]) => `<div style="padding:14px 18px;border-radius:18px;background:rgba(8,10,16,.82);border:2px solid ${c};text-align:center"><div style="font:700 22px M;color:#aab3bd">FLIGHT ${n}</div><div style="font:900 50px D;color:${c}">${d}</div></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("never", `<div style="width:1080px;text-align:center"><div style="display:inline-block;padding:18px 34px;border-radius:24px;background:rgba(8,10,16,.82);border:2px solid #ff7a6d;font:900 60px D;font-stretch:112%;color:#fff">NEVER FLEW AGAIN</div></div>`, { left: "0px", top: "250px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:16px">${["PRIVATE SPACES", "PASSCODE", "NO ACCOUNT"].map((s) => `<div style="padding:18px 24px;border-radius:20px;background:rgba(8,10,16,.82);border:1.5px solid ${green};font:800 34px D;color:#fff">${s}</div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("cam", `<div style="padding:12px 22px;border-radius:30px;background:rgba(8,10,16,.75);border:1.5px solid rgba(255,255,255,.25);font:700 26px M;letter-spacing:.14em;color:#cfd6dd">CAMBER 1 : 20 · AIRFLOW SHOWN</div>`, { left: "270px", top: "240px" });

// =====================================================================================================================
// THE FILM
// =====================================================================================================================
function sets(s) { KH.visible = s === "kh"; WT.visible = s === "wt"; LF.visible = s === "lf"; MUS.visible = s === "mus"; FLY.visible = s === "kh" || s === "mus";
  scene.fog = s === "kh" ? KFOG : null; scene.background = s === "lf" ? new THREE.Color(0x07090c) : null; }
function lightKH(c, r = 14) { H.key.color.set(0xfff1dc); H.key.intensity = 3.1; H.key.position.copy(c).addScaledVector(SUN, r * 3); H.key.target.position.copy(c);
  const s = H.key.shadow.camera; Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 7 }); s.updateProjectionMatrix(); H.key.shadow.bias = -0.0004; H.key.shadow.normalBias = 0.03;
  H.hemi.color.set(0xc6d6ea); H.hemi.groundColor.set(0x9a8a70); H.hemi.intensity = 0.9; H.envK.value = 0.45; H.rimA.intensity = 0.2; H.rimB.intensity = 0.15; H.key.castShadow = true; }
function lightIn(k = 0.3) { H.key.intensity = k; H.key.castShadow = false; H.hemi.color.set(0xb0a490); H.hemi.groundColor.set(0x302418); H.hemi.intensity = 0.7; H.envK.value = 0.3; H.rimA.intensity = 0.15; H.rimB.intensity = 0.2; }
function flyAt(p, pitch = 0, yaw = 0, roll = 0) { FLY.position.copy(p); FLY.rotation.set(-pitch, yaw, roll); FLY.updateMatrixWorld(true); }
function onRail(z) { flyAt(V(0, 0.22, z)); DOLLY.position.set(0, 0, z); DOLLY.visible = true; }
const linesOff = () => { [L120, L747, ...FLIGHTS].forEach((l) => { l.visible = false; l.scale.x = 1; }); };
const grow = (l, k) => { l.visible = k > 0; l.material.uniforms.uK.value = k; };

H.frame("Private Spaces. No account, no app.", async (t) => {
  H.cam.up.set(0, 1, 0); H.zoom = 1; H.bloom.strength = 0.25; H.grade.uniforms.uVig.value = 0.3; camRange(0.05, 20000);
  FU.uWarp.value = 0; FU.uRud.value = 0; FU.uElev.value = 0; props(t, 0); linesOff(); DOLLY.visible = false; SAND.visible = true; PUFF.visible = false;
  SU.uT.value = t; skyU.uCold.value = 1; WTU.uT.value = t; LU.uT.value = t; sea.material.uniforms.time.value = t * 0.3; OR.visible = false; ROOM.visible = false; OUT.forEach((p) => (p.g.visible = false));

  if (t < at("real")) { // HOOK: the Flyer skimming the dunes; then from above: the whole flight fits inside a jumbo jet's wings
    sets("kh"); const c = fr("hook", 0.55);
    if (t < c) { const u = 0.25 + 0.35 * prog(t, 0, c); const f = flight1(u); flyAt(f.p, f.pitch); FU.uElev.value = -f.pitch * 1.5; props(t, 5.85); lightKH(f.p); sandWind(t, f.p, 1);
      move(t, 0, c, [f.p.clone().add(V(-13, 0.6, -6)), f.p.clone().add(V(0, 1.2, 1)), 34], [f.p.clone().add(V(-11, 0.8, -3)), f.p.clone().add(V(0, 1.2, 1.5)), 34], 0.15);
      title(t, fr("hook", 0.05), c, "17 December 1903", "The first flight", 150); }
    else { const f = flight1(1); flyAt(V(0, 0.02, f.p.z), 0.02); lightKH(V(0, 0, TAKEOFF_Z + 30), 40); sandWind(t, V(0, 0, TAKEOFF_Z + 25), 0.8, 40);
      grow(L120, smooth(prog(t, c, c + 1.0))); grow(L747, smooth(prog(t, c + 0.8, c + 2.0)));
      L120.scale.x = L747.scale.x = 3; move(t, c, at("real"), [V(-3, 100, TAKEOFF_Z + 27), V(1, 0, TAKEOFF_Z + 30), 40], [V(-3, 92, TAKEOFF_Z + 28), V(1, 0, TAKEOFF_Z + 30), 40], 0.05); H.cam.up.set(0, 0, 1); H.cam.lookAt(V(1, 0, TAKEOFF_Z + 30)); H.cam.updateMatrixWorld();
      callout("f1", t, c + 0.4, at("real"), V(0, 0, TAKEOFF_Z + 18), 300, 1150); callout("jet", t, c + 1.3, at("real"), V(2.2, 0, TAKEOFF_Z + 50), 760, 420); }
  } else if (t < at("engine")) { // THE REAL ONE, at the camp: then what it's made of
    sets("kh"); onRail(RAIL_Z0 + 1.0); lightKH(V(0, 1, 0)); sandWind(t, V(0, 0, 0), 0.6);
    if (t < at("build")) { const a = 2.2 + (t - at("real")) * 0.1; move(t, at("real"), at("build"), [V(Math.sin(a) * 19, 4.5, Math.cos(a) * 19), V(0, 1.3, 0), 34], [V(Math.sin(a + 0.12) * 17.5, 4.0, Math.cos(a + 0.12) * 17.5), V(0, 1.3, 0), 34], 0.05);
      title(t, fr("real", 0.05), fr("real", 0.5), "The real 1903 machine", "Wright Flyer", 150); callout("scan", t, fr("real", 0.5), at("build"), FL(-4.5, 2.4, 0.3), 300, 1150); }
    else { const c = fr("build", 0.42);
      if (t < c) { move(t, at("build"), c, [FL(9, 6.5, 15), FL(0, 1.2, 0), 36], [FL(8, 6.0, 13.5), FL(0, 1.2, 0), 36], 0.05); hudShow("stats", win(t, fr("build", 0.05), c)); }
      else { move(t, c, at("engine"), [FL(-6.2, 1.6, 5.2), FL(-3.6, 1.2, 0.1), 38], [FL(-5.8, 1.6, 4.7), FL(-3.6, 1.2, 0.1), 38], 0.02);
        callout("spruce", t, c + 0.2, at("engine"), FL(-3.95, 1.3, 0.55), 300, 1000); callout("ash", t, c + 0.9, at("engine"), FL(-3.3, 2.2, -0.3), 760, 760); callout("muslin", t, c + 1.6, at("engine"), FL(-3.0, 0.48, 0.2), 760, 1200); } }
  } else if (t < at("tunnel")) { // THE ENGINE, then the chain drive and two counter-rotating propellers
    sets("kh"); onRail(RAIL_Z0 + 1.0); lightKH(V(0, 1, 0), 6); sandWind(t, V(0, 0, 0), 0.6);
    if (t < at("props")) { move(t, at("engine"), at("props"), [FL(-0.9, 1.9, 3.3), FL(-0.33, 0.95, 0.05), 34], [FL(-0.8, 1.8, 2.9), FL(-0.33, 0.95, 0.05), 34], 0.02);
      callout("eng", t, fr("engine", 0.15), at("props"), FL(-0.33, 1.05, 0.1), 300, 1150); callout("al", t, fr("engine", 0.55), at("props"), FL(-0.2, 0.8, 0.4), 760, 1250); hudShow("estats", win(t, fr("engine", 0.6), at("props"))); }
    else { const rps = lerp(0.6, 5.85, smooth(prog(t, at("props"), fr("props", 0.6)))); props(t, rps * (t > fr("props", 0.6) ? 1 : 0.4 + 0.6 * prog(t, at("props"), fr("props", 0.6))));
      move(t, at("props"), at("tunnel"), [FL(2.5, 2.6, -11.5), FL(0.05, 1.45, -1.4), 38], [FL(2.2, 2.4, -10.5), FL(0.05, 1.45, -1.4), 38], 0.03);
      callout("chainX", t, fr("props", 0.2), at("tunnel"), FL(-0.4, 0.95, -0.3), 300, 1150); callout("propL", t, fr("props", 0.45), at("tunnel"), FL(HUB_R.x, HUB_R.y + 1.0, HUB_R.z), 760, 700); }
  } else if (t < at("lift")) { // THE WIND TUNNEL (1901): the fan blows; a model wing on its balance; then 200 tested wings
    sets("wt"); lightIn(0.25); const fan = WT.userData.fan; fan.rotation.x = t * 30; tunnelAir(t, 1); WT.updateMatrixWorld(true); const WW = (x, y, z) => WT.localToWorld(V(x, y, z));
    const c = fr("tunnel", 0.55);
    if (t < c) { move(t, at("tunnel"), c, [WW(2.4, 2.2, 3.4), WW(0.0, 1.1, 0), 36], [WW(2.0, 2.0, 2.9), WW(0.05, 1.1, 0), 36], 0.01);
      callout("fan", t, fr("tunnel", 0.08), c, WW(-1.04, 1.13, 0), 300, 1150); callout("model", t, fr("tunnel", 0.25), c, WW(0.15, 1.18, 0), 760, 1000); }
    else { move(t, c, at("lift"), [WW(0.2, 2.0, 1.6), WW(-0.1, 1.9, -2.4), 40], [WW(0.2, 2.1, 1.2), WW(0.0, 2.0, -2.4), 40], 0.01); callout("shelf", t, c + 0.2, at("lift"), WW(0.2, 1.95, -2.4), 760, 1150); }
  } else if (t < at("warp")) { // LIFT: the cambered wing turns the air downward, and the air pushes back up
    sets("lf"); lightIn(1.0); H.key.position.set(LF.position.x + 3, 6, LF.position.z + 5); H.key.target.position.copy(LF.position); H.bloom.strength = 0.45;
    LU.uK.value = smooth(prog(t, at("lift"), fr("lift", 0.2))); const k1 = smooth(prog(t, fr("lift", 0.3), fr("lift", 0.55))), k2 = smooth(prog(t, fr("lift", 0.55), fr("lift", 0.8)));
    LF.userData.dn.scale.setScalar(Math.max(0.001, k1)); LF.userData.up.scale.setScalar(Math.max(0.001, k2)); LF.updateMatrixWorld(true); const LW = (x, y, z) => LF.localToWorld(V(x, y, z));
    move(t, at("lift"), at("warp"), [LW(0.3, 0.3, 6.6), LW(0.2, 0.15, 0), 40], [LW(0.3, 0.25, 5.9), LW(0.2, 0.15, 0), 40], 0.01);
    callout("down", t, fr("lift", 0.32), at("warp"), LW(2.1, -0.75, 0.9), 760, 1250); callout("liftA", t, fr("lift", 0.58), at("warp"), LW(0, 1.4, 0.9), 300, 600); hudShow("cam", win(t, fr("lift", 0.05), at("warp")));
  } else if (t < at("day")) { // WING WARPING: hips → wires → twisted tips + rudder
    sets("kh"); onRail(RAIL_Z0 + 1.0); lightKH(V(0, 1, 0)); sandWind(t, V(0, 0, 0), 0.6);
    const w = Math.sin((t - at("warp")) * 2.2) * smooth(prog(t, fr("warp", 0.1), fr("warp", 0.3))); FU.uWarp.value = w; FU.uRud.value = -w * 0.35;
    const c = fr("warp", 0.45);
    if (t < c) move(t, at("warp"), c, [FL(2.6, 3.2, 5.6), FL(0.45, 0.7, -0.1), 36], [FL(2.4, 3.0, 5.1), FL(0.45, 0.7, -0.1), 36], 0.02);
    else move(t, c, at("day"), [FL(-9, 7.5, -13), FL(0, 1.2, -0.5), 38], [FL(-8.5, 7, -12), FL(0, 1.2, -0.5), 38], 0.03);
    callout("cradle", t, fr("warp", 0.12), c, FL(CRADLE.x, CRADLE.y, CRADLE.z), 760, 1150); callout("tips", t, c + 0.1, at("day"), FL(-6.0, 2.3, -0.8), 300, 1000); callout("rud", t, c + 0.7, at("day"), FL(0.08, 1.6, -2.9), 760, 1250);
  } else if (t < at("twelve")) { // 17 DECEMBER 1903: the dunes, the wind; the run down the rail, and up
    sets("kh"); lightKH(V(0, 1, 8), 20);
    if (t < at("rail")) { onRail(RAIL_Z0 + 1.0); props(t, 5.85); sandWind(t, V(0, 0, 10), 1, 40);
      move(t, at("day"), at("rail"), [V(-60, 24, -55), V(0, 2, 6), 40], [V(-52, 20, -48), V(0, 2, 6), 40], 0.1);
      title(t, fr("day", 0.05), fr("day", 0.6), "17 December 1903", "Kitty Hawk, North Carolina", 150); hudShow("day", win(t, fr("day", 0.4), at("rail"))); callout("wind", t, fr("day", 0.55), at("rail"), V(-3, 1.5, 12), 300, 1150); }
    else { const runEnd = fr("rail", 0.72); const k = prog(t, at("rail"), runEnd); props(t, 5.85); sandWind(t, V(0, 0, 8), 1, 30);
      if (t < runEnd) { const z = RAIL_Z0 + 1.0 + (TAKEOFF_Z - RAIL_Z0 - 1.0) * k * k; onRail(z); }
      else { const u = 0.08 * prog(t, runEnd, at("twelve")); const f = flight1(u); flyAt(f.p, f.pitch); DOLLY.position.set(0, 0, TAKEOFF_Z); DOLLY.visible = true; FU.uElev.value = -0.15; }
      const fp = FLY.position.clone();
      move(t, at("rail"), at("twelve"), [V(-17, 1.6, fp.z - 7), fp.clone().add(V(0, 1.1, 1.5)), 36], [V(-16, 1.8, fp.z - 5), fp.clone().add(V(0, 1.3, 1.5)), 36], 0.08);
      callout("rail", t, fr("rail", 0.08), fr("rail", 0.5), V(0, 0.15, RAIL_Z0 + 13), 300, 1250); }
  } else if (t < at("gust")) { // 12 SECONDS, 37 METRES; then all four flights of the day
    sets("kh"); sandWind(t, V(0, 0, TAKEOFF_Z + 20), 1, 40);
    if (t < at("four")) { const u = clamp(prog(t, at("twelve"), fr("twelve", 0.92))); const f = flight1(u); flyAt(u >= 1 ? V(0, 0.02, f.p.z) : f.p, u >= 1 ? 0.02 : f.pitch); props(t, u < 1 ? 5.85 : 1.2); FU.uElev.value = -f.pitch * 1.5; lightKH(FLY.position, 16);
      grow(L120, u); DOLLY.visible = true; DOLLY.position.set(0, 0, TAKEOFF_Z);
      if (u >= 1) { PUFF.visible = true; puff(t, fr("twelve", 0.92), FLY.position, 0.8, 1.5); }
      const fp = FLY.position.clone(); move(t, at("twelve"), at("four"), [V(-17, 3.2, fp.z - 6), fp.clone().add(V(0, 0.6, 3)), 38], [V(-17, 3.2, fp.z - 4), fp.clone().add(V(0, 0.6, 3)), 38], 0.08);
      H.$("tmT").textContent = `${(u * 12).toFixed(1)} s`; H.$("tmD").textContent = `${Math.round(u * 36.6)} m`; hudShow("timer", win(t, fr("twelve", 0.02), at("four"))); hudShow("sped", win(t, fr("twelve", 0.05), fr("twelve", 0.9)));
      if (u > 0.98) callout("f1", t, fr("twelve", 0.92), at("four"), V(0, 0.05, TAKEOFF_Z + 20), 300, 1150); }
    else { flyAt(V(0, 0.02, TAKEOFF_Z + 259.7), 0.02); lightKH(V(0, 0, TAKEOFF_Z + 130), 150);
      FLIGHTS.forEach((l, i) => grow(l, smooth(prog(t, fr("four", 0.05 + i * 0.14), fr("four", 0.05 + i * 0.14 + (i === 3 ? 0.45 : 0.15))))));
      FLIGHTS.forEach((l) => (l.scale.x = 7)); move(t, at("four"), at("gust"), [V(-20, 360, TAKEOFF_Z + 96), V(0, 0, TAKEOFF_Z + 98), 40], [V(-20, 370, TAKEOFF_Z + 98), V(0, 0, TAKEOFF_Z + 98), 40], 0.05); H.cam.up.set(0, 0, 1); H.cam.lookAt(V(0, 0, TAKEOFF_Z + 98)); H.cam.updateMatrixWorld(); scene.fog = null;
      hudShow("flights", win(t, fr("four", 0.1), at("gust"))); callout("f4", t, fr("four", 0.7), at("gust"), V(2.4, 0, TAKEOFF_Z + 255), 760, 700); }
  } else if (t < at("orbi")) { // THE GUST: it tumbles end over end
    sets("kh"); const g0 = fr("gust", 0.3); const k = smooth(prog(t, g0, g0 + 1.6)); const base = V(3, 0.02, TAKEOFF_Z + 255);
    const tumble = k * Math.PI * 1.15; flyAt(base.clone().add(V(0, Math.sin(k * Math.PI) * 2.6, -k * 9)), tumble); FLY.position.y += Math.abs(Math.sin(tumble)) * 1.3;
    lightKH(base, 16); sandWind(t, base, 1 + 1.5 * clamp(prog(t, g0 - 0.5, g0)), 30); PUFF.visible = t > g0; puff(t, g0, base, 1.6, 3); flash(t, g0, 0.15, 6, "#f4ead8");
    move(t, at("gust"), at("orbi"), [base.clone().add(V(-16, 3.2, -10)), base.clone().add(V(0, 1.2, -3)), 40], [base.clone().add(V(-15, 3.4, -12)), base.clone().add(V(0, 1.4, -5)), 40], 0.25);
    hudShow("never", win(t, fr("gust", 0.6), at("orbi")));
  } else { // ORBI: in the gallery with the Flyer; a private Space
    sets("mus"); lightIn(0.0); flyAt(MUS.position.clone().add(V(0, 0.52, -1.5)), 0, 0); OR.visible = true; OR.updateMatrixWorld(true); const OW = (x, y, z) => OR.localToWorld(V(x, y, z));
    const files = Math.floor(clamp(prog(t, at("orbi"), fr("orbi", 0.8))) * 3.99); const typed = Math.round(clamp(prog(t, fr("orbi2", 0.55), fr("orbi2", 0.8))) * 6); const joined = t > fr("orbi2", 0.85);
    screen(ph, { on: 1, files, members: joined ? 2 : 1 }, drawPhone); screen(lap, { on: t > fr("orbi2", 0.45) ? 1 : 0, typed, joined: joined ? 1 : 0 }, drawLap);
    OUT.forEach((p) => { p.g.visible = true; screen(p, { s: 1 }, drawStranger); });
    ROOM.visible = true; ROOM.material.color.setRGB(0.24 * 1.6, 1.0 * 1.6, 0.55 * 1.6); ROOM.scale.setScalar(0.96 + 0.04 * Math.sin(t * 3)); orbiL.intensity = 0.6;
    lock.visible = true; lock.position.set(0.2, 0.9 + 0.05 * Math.sin(t * 2), 0.2); lock.scale.setScalar(0.5);
    if (t < at("orbi2")) { move(t, at("orbi"), at("orbi2"), [OW(0.3, 4.2, 10.5), OW(0.0, 1.2, -4), 42], [OW(0.4, 3.8, 9.6), OW(0.0, 1.2, -4), 42], 0.2);
      callout("room", t, fr("orbi", 0.25), at("orbi2"), OW(2.7, 0.02, 0.5), 760, 1150); callout("outsiders", t, fr("orbi", 0.55), at("orbi2"), OW(-3.6, 0.4, -2.8), 300, 900); }
    else if (t < at("orbi3")) { const c = fr("orbi2", 0.45);
      if (t < c) { const pn = V(0, 0, 1).applyEuler(ph.g.rotation), pc = ph.g.position.clone(), up2 = V(0, 1, 0).applyEuler(ph.g.rotation);
        move(t, at("orbi2"), c, [OW(...pc.clone().addScaledVector(pn, 3.0).toArray()), OW(...pc.toArray()), 36], [OW(...pc.clone().addScaledVector(pn, 2.8).toArray()), OW(...pc.toArray()), 36], 0.02);
        H.cam.up.copy(up2.transformDirection(OR.matrixWorld)); H.cam.lookAt(OW(...pc.toArray())); H.cam.updateMatrixWorld(); }
      else move(t, c, at("orbi3"), [OW(-0.4, 2.2, 5.0), OW(-1.25, 0.62, -0.5), 38], [OW(-0.5, 2.1, 4.6), OW(-1.25, 0.62, -0.5), 38], 0.02); }
    else { move(t, at("orbi3"), at("end"), [OW(0.3, 3.2, 8.0), OW(0.2, 0.8, -1.6), 44], [OW(0.4, 2.9, 7.2), OW(0.2, 0.8, -1.6), 44], 0.2); hudShow("chips", win(t, fr("orbi3", 0.2), at("end"))); }
  }
  if (window.DBG && window.DBG[0]) { const d = window.DBG[0].split(",").map(Number); look(V(d[0], d[1], d[2]), V(d[3], d[4], d[5]), d[6]); if (window.DBG[1] === "clean") { for (const id of ["hud", "lines", "title", "sub"]) { const e = H.$(id); if (e) e.style.visibility = "hidden"; } } }
});
await H.ready();
