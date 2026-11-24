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
