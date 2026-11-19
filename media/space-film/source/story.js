// Do you know what happens to your body in space without a suit? HD film on kit/hd.js: a real human body (BodyParts3D),
// a real scanned head (Lee Perry-Smith), NASA Earth textures, a station module from Poly Haven CC0 scans, a 1966 chamber.
// Units: metres. The module runs along x (hatch at +x); Earth is far below.
import { THREE, H, RoundedBoxGeometry } from "./kit/hd.js";
import { loadAnatomy, standardLayers, shell } from "./kit/anatomy.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { makePhone, makeLaptop, makeLock, makeEmbers, screen, green, rr, img } from "./kit/orbiset.js";
const { V, clamp, ease, smooth, out, back, lerp, win, prog, at, end, fr, move, look, callout, title, hudEl, hudShow, flash, metal, paint, matte, glow, sh } = H;
const scene = H.scene, S2 = (el, o) => Object.assign(el.style, o), mod = (a, n) => ((a % n) + n) % n;
const gl = new GLTFLoader(), gltf = (u) => new Promise((ok, no) => gl.load(u, ok, undefined, no));
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
H.cam.far = 30000; H.cam.updateProjectionMatrix();
H.floor.visible = false; H.envK.value = 0.5;
const studioBack = H.backdrop.material; H.backdrop.visible = false;
scene.background = new THREE.Color(0x000000);

// ---------- space: stars, the Sun, Earth (NASA day/night/clouds/specular + atmosphere) ----------
const SUN = V(-0.55, 0.32, 0.77).normalize();
H.key.position.copy(SUN.clone().multiplyScalar(30)); H.key.intensity = 3.2; H.key.color.set(0xfff4e8);
H.hemi.intensity = 0.06; H.rimA.intensity = 0.35; H.rimA.color.set(0x5a8cff); H.rimB.intensity = 0.0;
Object.assign(H.key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 80 }); H.key.shadow.camera.updateProjectionMatrix(); H.key.shadow.bias = -0.0006; H.key.shadow.normalBias = 0.04;
{ const n = 9000, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), c = new Float32Array(n * 3); H.reseed(4);
  for (let i = 0; i < n; i++) { const u = H.rnd() * 2 - 1, a = H.rnd() * 6.283, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 20000, u * 20000, Math.sin(a) * r * 20000], i * 3); const b = 0.25 + Math.pow(H.rnd(), 6) * 2.5, w = H.rnd(); c.set([b * (0.85 + w * 0.2), b * 0.92, b * (1.1 - w * 0.25)], i * 3); }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, toneMapped: false, fog: false }))); }
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(30, 27, 22), toneMapped: false })); sunDisc.position.copy(SUN.clone().multiplyScalar(18000)); scene.add(sunDisc);
const ER = 6000, EC = V(0, -ER - 520, -400);
const earthMat = new THREE.ShaderMaterial({ uniforms: { day: { value: tex("kit/models/planets/earth_atmos_2048.jpg", true) }, night: { value: tex("kit/models/planets/earth_lights_2048.png", true) }, spec: { value: tex("kit/models/planets/earth_specular_2048.jpg") },
    clouds: { value: tex("kit/models/planets/earth_clouds_1024.png", true) }, sun: { value: SUN }, sep: { value: 0 }, rot: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
  fragmentShader: `uniform sampler2D day, night, spec, clouds; uniform vec3 sun; uniform float sep, rot; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){ vec3 n = normalize(vN); float l = dot(n, sun); vec2 uv = vUv + vec2(rot, 0.0);
      vec3 d = texture2D(day, uv).rgb, ni = texture2D(night, uv).rgb; float cl = texture2D(clouds, uv + vec2(rot * 0.3, 0.0)).r; float sp = texture2D(spec, uv).r;
      vec3 V = normalize(cameraPosition - vW); vec3 h = normalize(sun + V); float spec = pow(max(dot(n, h), 0.0), 60.0) * sp * 0.9;
      float lit = smoothstep(-0.12, 0.25, l);
      vec3 col = d * lit * 0.85 + vec3(1.0, 0.92, 0.8) * spec * lit * 0.6 + ni * vec3(1.0, 0.75, 0.4) * (1.0 - smoothstep(-0.2, 0.05, l)) * 1.6;
      col = mix(col, vec3(0.92, 0.95, 1.0) * (0.05 + 0.75 * lit), smoothstep(0.25, 0.85, cl) * 0.6);
      float rim = pow(1.0 - max(dot(n, V), 0.0), 7.0); col += vec3(0.25, 0.5, 1.2) * rim * (0.1 + 0.6 * smoothstep(-0.25, 0.4, l)); col = mix(col, vec3(0.2, 0.35, 0.7) * lit, pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.35);
      float s = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, vec3(s * 1.07, s * 0.92, s * 0.7), sep);
      gl_FragColor = vec4(col, 1.0); }` });
const earth = new THREE.Mesh(new THREE.SphereGeometry(ER, 160, 96), earthMat); earth.position.copy(EC); earth.rotation.set(0.25, 4.1, 0.05); scene.add(earth);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.018, 128, 64), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { sun: { value: SUN } },
  vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
  fragmentShader: `uniform vec3 sun; varying vec3 vN; varying vec3 vW; void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(max(0.0, 1.0 - abs(dot(normalize(vN), V)) * 1.0), 5.0); float l = smoothstep(-0.3, 0.5, dot(normalize(vN), sun)); gl_FragColor = vec4(vec3(0.3, 0.6, 1.3) * f * (0.15 + 1.8 * l), 1.0); }` }));
atmo.position.copy(EC); scene.add(atmo);

// ---------- the station module: a pressurised cylinder with panels, handrails, hatch, ducts, cables, lights ----------
const MOD = new THREE.Group(); scene.add(MOD);
const RAD = 2.0, HALF = 3.6;
const mp = (n, srgb, rx, ry) => tex(`kit/ph/metal_plate/metal_plate_${n}_1k.jpg`, srgb, rx, ry), mp2 = (n, srgb, rx, ry) => tex(`kit/ph/metal_plate_02/metal_plate_02_${n}_1k.jpg`, srgb, rx, ry);
const hullOut = new THREE.MeshPhysicalMaterial({ color: 0xd9dcdf, map: mp("diff", true, 10, 4), normalMap: mp("nor_gl", false, 10, 4), roughnessMap: mp("rough", false, 10, 4), roughness: 0.7, metalness: 0.35, side: THREE.FrontSide });
const hullIn = new THREE.MeshPhysicalMaterial({ color: 0xeceae4, map: mp2("diff", true, 8, 4), normalMap: mp2("nor_gl", false, 8, 4), roughnessMap: mp2("rough", false, 8, 4), roughness: 0.8, metalness: 0.1, side: THREE.BackSide });
{ const prof = [[RAD - 0.05, -HALF], [RAD, -HALF + 0.1], [RAD, HALF - 0.1], [RAD - 0.05, HALF]].map(([r, y]) => new THREE.Vector2(r, y));
  const outer = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), hullOut); outer.rotation.z = -Math.PI / 2; outer.castShadow = outer.receiveShadow = true; MOD.add(outer);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(RAD - 0.12, RAD - 0.12, HALF * 2, 96, 1, true), hullIn); inner.rotation.z = -Math.PI / 2; inner.receiveShadow = true; MOD.add(inner);
  // ribs + handrails inside (real ISS-style: yellow-white rails on standoffs)
  const railM = new THREE.MeshPhysicalMaterial({ color: 0xd8c25a, roughness: 0.4, clearcoat: 0.6 });
  for (let i = -3; i <= 3; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(RAD - 0.14, 0.035, 10, 96), metal(0xb9bec4, 0.4)); rib.rotation.y = Math.PI / 2; rib.position.x = i * 1.05; MOD.add(rib); }
  for (const a of [0.6, 2.5, 3.8, 5.6]) { const y = Math.cos(a) * (RAD - 0.32), z = Math.sin(a) * (RAD - 0.32); const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 5.6, 4, 12), railM); r.rotation.z = Math.PI / 2; r.position.set(-0.2, y, z); MOD.add(r);
    for (const x of [-2.6, -0.2, 2.2]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), metal(0x9aa0a6, 0.3)); st.position.set(x, Math.cos(a) * (RAD - 0.22), Math.sin(a) * (RAD - 0.22)); st.lookAt(V(x, 0, 0)); st.rotateX(Math.PI / 2); MOD.add(st); } }
  // equipment racks along the walls (panels with screws, labels, cables)
  const rackTex = H.canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#e6e4df"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b9b6ae"; g.lineWidth = 4; for (let y = 0; y < h; y += 128) g.strokeRect(6, y + 6, w - 12, 116);
    for (let y = 0; y < h; y += 128) { for (const x of [20, w - 20]) for (const yy of [20, 108]) { g.fillStyle = "#8f8c86"; g.beginPath(); g.arc(x, y + yy, 6, 0, 7); g.fill(); }
      g.fillStyle = ["#2a5fb8", "#d83a2c", "#2d8a4a", "#1a1a1a"][(y / 128) % 4]; g.fillRect(40, y + 40, 60, 16); g.fillStyle = "#555"; g.font = "700 18px M"; g.fillText(["COMM", "O2 / N2", "ECLSS", "PWR"][(y / 128) % 4] + "  " + (12 + y / 8).toFixed(0) + "-A", 120, y + 54);
      g.fillStyle = "#2b2b2b"; for (let k = 0; k < 6; k++) g.fillRect(40 + k * 70, y + 78, 40, 20); } });
  const rackM = new THREE.MeshPhysicalMaterial({ map: rackTex, roughness: 0.75, normalMap: mp2("nor_gl", false, 2, 2), normalScale: new THREE.Vector2(0.4, 0.4) });
  for (const [a, x] of [[1.57, -1.6], [1.57, 1.2], [4.71, -1.6], [4.71, 1.2], [3.14, -0.2]]) { const r = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.05, 0.22, 3, 0.03), rackM); r.position.set(x, Math.cos(a) * (RAD - 0.3), Math.sin(a) * (RAD - 0.3)); r.lookAt(V(x, 0, 0)); r.castShadow = r.receiveShadow = true; MOD.add(r); }
}
// the outer hatch at +x: frame ring, a round door on a hinge with a hand wheel and latches
const hatchHinge = new THREE.Group(); hatchHinge.position.set(HALF + 0.02, 0, -0.78); MOD.add(hatchHinge);
const hatch = new THREE.Group(); hatch.position.set(0, 0, 0.78); hatchHinge.add(hatch);
{ const plate = new THREE.MeshPhysicalMaterial({ color: 0xc8ccd0, map: mp("diff", true, 1.5, 1.5), normalMap: mp("nor_gl", false, 1.5, 1.5), roughnessMap: mp("rough", false, 1.5, 1.5), roughness: 0.6, metalness: 0.6 });
  const ringFrame = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.09, 20, 96), plate); ringFrame.rotation.y = Math.PI / 2; ringFrame.position.x = HALF; MOD.add(ringFrame);
  const end = new THREE.Mesh(new THREE.RingGeometry(0.85, RAD, 96), new THREE.MeshPhysicalMaterial({ color: 0xd0d3d6, map: mp("diff", true, 3, 3), normalMap: mp("nor_gl", false, 3, 3), roughness: 0.65, metalness: 0.4, side: THREE.DoubleSide })); end.rotation.y = Math.PI / 2; end.position.x = HALF; MOD.add(end);
  const endB = new THREE.Mesh(new THREE.CircleGeometry(RAD, 96), new THREE.MeshPhysicalMaterial({ color: 0xd0d3d6, map: mp("diff", true, 3, 3), roughness: 0.65, metalness: 0.4, side: THREE.DoubleSide })); endB.rotation.y = Math.PI / 2; endB.position.x = -HALF; MOD.add(endB);
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 96), plate); door.rotation.z = Math.PI / 2; hatch.add(door);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 12, 64), metal(0x2a2c30, 0.3)); wheel.rotation.y = Math.PI / 2; wheel.position.x = -0.12; hatch.add(wheel);
  for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.56, 8), metal(0x2a2c30, 0.3)); sp.rotation.x = i * Math.PI / 3; sp.position.x = -0.12; hatch.add(sp); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, l = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.12, 0.06, 2, 0.015), metal(0x9ea3a9, 0.3)); l.position.set(-0.07, Math.cos(a) * 0.72, Math.sin(a) * 0.72); hatch.add(l); }
  const warn = H.canvasTex(512, 128, (g, w, h) => { for (let x = -h; x < w; x += 40) { g.fillStyle = (x / 40) % 2 ? "#111" : "#f2c21b"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, 0); g.lineTo(x + 20 + h, h); g.lineTo(x + h, h); g.fill(); } });
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.03, 6, 96), new THREE.MeshStandardMaterial({ map: warn, roughness: 0.6 })); stripe.rotation.y = Math.PI / 2; stripe.position.x = HALF - 0.01; MOD.add(stripe);
}
// props: real scans (Poly Haven): air duct, cage lights, fire extinguisher, cable bundles
const [ductG, lampG, extG, cableG] = await Promise.all(["modular_airduct_circular_01", "caged_hanging_light", "korean_fire_extinguisher_01", "modular_electric_cables"].map((a) => gltf(`kit/ph/${a}/${a}_1k.gltf`)));
const fitTo = (o, size) => { const b = new THREE.Box3().setFromObject(o), s = b.getSize(V()); o.scale.setScalar(size / Math.max(s.x, s.y, s.z)); return o; };
{ const d = fitTo(ductG.scene, 6.4); d.rotation.y = Math.PI / 2; d.position.set(-0.2, RAD - 0.45, 0.6); MOD.add(d);
  for (const x of [-2.2, 0, 2.2]) { const l = fitTo(lampG.scene.clone(), 0.45); l.position.set(x, RAD - 0.35, -0.5); MOD.add(l); const pl = new THREE.PointLight(0xfff2dd, 2.2, 6, 2); pl.position.set(x, RAD - 0.6, -0.5); MOD.add(pl); }
  const e = fitTo(extG.scene, 0.55); e.position.set(-2.9, -0.9, -1.25); e.rotation.x = 0.7; MOD.add(e);
  const c = fitTo(cableG.scene, 4.5); c.position.set(-0.4, -RAD + 0.55, 0.9); MOD.add(c); }
MOD.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
const cabinL = new THREE.PointLight(0xfff0dc, 1.2, 9, 2); cabinL.position.set(0, 0.6, 0); MOD.add(cabinL);
// solar arrays outside (for the exterior shots): real-looking cells on a gold-foil frame
{ const cells = H.canvasTex(512, 1024, (g, w, h) => { g.fillStyle = "#0b1631"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, y, x + 32, y + 32); gr.addColorStop(0, "#1c3a7a"); gr.addColorStop(1, "#0d1f4a"); g.fillStyle = gr; g.fillRect(x + 1.5, y + 1.5, 29, 29); g.fillStyle = "rgba(200,210,230,.25)"; g.fillRect(x + 15, y + 1.5, 1, 29); } });
  const sm = new THREE.MeshPhysicalMaterial({ map: cells, roughness: 0.25, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7, 12), metal(0xb0b4b8, 0.3)); arm.position.set(-1.5, 0, s * 5.5); arm.rotation.x = Math.PI / 2; MOD.add(arm);
    for (const k of [0, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 11), sm); p.position.set(-1.5 + (k ? 1.4 : -1.4), 0, s * 9.5); MOD.add(p); } } }

// ---------- the man: real anatomy, t-shirt + shorts + socks (no shoes in a station) ----------
const A = standardLayers(await loadAnatomy()); scene.add(A.root);
A.mat.shirt.color.set(0x29466e); A.mat.shorts.color.set(0x1c2026); A.mat.shoes.color.set(0xdcdcd6);
// 1966 suit (for LeBlanc + the "tiny planet" shot): a pressure suit shell over the whole body, white woven fabric
const fab = (n, srgb) => tex(`kit/ph/denim_fabric/denim_fabric_${n}_1k.jpg`, srgb, 14, 14);
const suitM = A.patch(new THREE.MeshPhysicalMaterial({ color: 0xe9e6dc, roughness: 0.85, sheen: 0.8, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6 }), "suit", {
  color: `float seam = smoothstep(0.004, 0.0, abs(fract(vRest.y * 6.0) - 0.5) - 0.49); float ax = abs(vRest.x);
          float glove = step(0.205, ax) * step(vRest.y, 0.93) * step(0.6, vRest.y), boot = step(vRest.y, 0.16); diffuseColor.rgb *= (0.95 + 0.06 * vn(vRest * 160.0)) * (1.0 - seam * 0.35);
          float band = step(abs(vRest.y - 1.02), 0.025) + step(abs(abs(vRest.x) - 0.2) * 0.0 + abs(vRest.y - 1.33), 0.012); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.6, 0.62, 0.65), clamp(band, 0.0, 1.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18, 0.19, 0.21), glove); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.74, 0.7) * 0.6, boot);`,
  normal: `normal = normalize(normal + (vec3(vn(vRest * vec3(90.0, 30.0, 90.0)), vn(vRest * vec3(90.0, 30.0, 90.0) + 5.0), 0.5) - 0.5) * 0.12 + (vec3(vn(vRest * 2400.0), vn(vRest * 2400.0 + 3.0), 0.5) - 0.5) * 0.05);`,
  post: "", offset: "0.0" });
H.studio(suitM);
const suit = A.layer("suit", (p) => p.name === "Skin", suitM, (g) => shell(g, (v) => v.y < 1.47, (v) => 0.034 + 0.008 * Math.max(0, Math.sin(v.y * 9.0)) + (v.y < 0.11 ? 0.012 : 0), (v) => { const w = (1 - Math.min(1, Math.max(0, (Math.abs(v.x) - 0.06) / 0.05))) * Math.min(1, Math.max(0, (v.y - 0.64) / 0.06)) * Math.min(1, Math.max(0, (0.99 - v.y) / 0.06)); if (v.z > 0.06) v.z = v.z - (v.z - 0.06) * 0.92 * w; }));
suit.visible = false;
const helmet = new THREE.Group(); scene.add(helmet); helmet.visible = false;
{ const glass = new THREE.Mesh(new THREE.SphereGeometry(0.19, 64, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false })); glass.position.y = 0.1; helmet.add(glass);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 16, 64), metal(0xb4b8bd, 0.25)); ring.rotation.x = Math.PI / 2 - 0.1; ring.position.y = -0.04; helmet.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.012, 12, 64), new THREE.MeshPhysicalMaterial({ color: 0x2560c8, roughness: 0.3, clearcoat: 1 })); ring2.rotation.x = Math.PI / 2 - 0.1; ring2.position.y = -0.015; helmet.add(ring2); }
// the real scanned head (close-ups of the mouth / saliva)
const headG = await gltf("kit/models/head/LeePerrySmith.glb"); const head = headG.scene.children[0] || headG.scene; scene.add(head);
{ const m = new THREE.MeshPhysicalMaterial({ map: tex("kit/models/head/Map-COL.jpg", true), normalMap: tex("kit/models/head/Infinite-Level_02_Tangent_SmoothUV.jpg"), roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0xffc0a0), clearcoat: 0.25, clearcoatRoughness: 0.4 });
  m.map.wrapS = m.map.wrapT = m.normalMap.wrapS = m.normalMap.wrapT = THREE.ClampToEdgeWrapping; m.map.repeat.set(1, 1); m.normalMap.repeat.set(1, 1);
  head.material = m; head.castShadow = head.receiveShadow = true; head.position.set(200, 0, 0); head.updateMatrixWorld(true); { const b = new THREE.Box3().setFromObject(head); head.scale.multiplyScalar(0.42 / b.getSize(V()).y); } head.visible = false; }
function noseTip() { head.updateMatrixWorld(true); const p = head.geometry.attributes.position, v = V(), best = V(0, 0, -1e9); for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i).applyMatrix4(head.matrixWorld); if (v.z > best.z) best.copy(v); } return best; }
const headBox = new THREE.Box3().setFromObject(head); console.log("head", headBox.getSize(V()).toArray().map((v) => v.toFixed(3)).join(" "));

// ---------- particles ----------
const molG = new THREE.IcosahedronGeometry(0.018, 1);
const NM = 700, mols = new THREE.InstancedMesh(molG, new THREE.MeshPhysicalMaterial({ color: 0x9fd4ff, roughness: 0.25, clearcoat: 1, emissive: new THREE.Color(0x1d4a7a) }), NM); mols.frustumCulled = false; scene.add(mols);
H.reseed(8); const MP = Array.from({ length: NM }, () => ({ x: (H.rnd() - 0.5) * 2 * HALF, a: H.rnd() * 6.283, r: Math.sqrt(H.rnd()) * (RAD - 0.3), v: V(H.rnd() - 0.5, H.rnd() - 0.5, H.rnd() - 0.5).normalize(), s: 0.6 + H.rnd() * 0.8, d: H.rnd() }));
const NB = 260, bub = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1, emissive: new THREE.Color(0x335577) }), NB); bub.frustumCulled = false; scene.add(bub);
const vesselPos = []; for (const n of ["arteries", "veins"]) { const p = A.layers[n].geometry.attributes.position; H.reseed(n.length); for (let i = 0; i < 2000; i++) { const j = Math.floor(H.rnd() * p.count); vesselPos.push(V(p.getX(j), p.getY(j), p.getZ(j))); } }
const NO2 = 180, o2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.008, 1), glow(0x6fd0ff, 2.6), NO2); o2.frustumCulled = false; scene.add(o2);
const NBR = 200, breath = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.01, 1), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.55, depthWrite: false }), NBR); breath.frustumCulled = false; scene.add(breath);
H.reseed(31); const BRP = Array.from({ length: NBR }, () => ({ v: V(H.rnd() - 0.5, H.rnd() - 0.5, 0.6 + H.rnd()).normalize(), s: H.rnd(), d: H.rnd() }));
const NUV = 60, uv = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0025, 0.0025, 1, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.35, 1.8), toneMapped: false, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }), NUV); uv.frustumCulled = false; scene.add(uv);
const NHW = 90, heatW = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.01, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.8, 0.2), toneMapped: false, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), NHW); heatW.frustumCulled = false; scene.add(heatW);
// tiny planet: an atmosphere bubble around a suited astronaut
const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 96, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 0 }, t: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float k, t; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5); float c = 0.5 + 0.5 * sin(vP.x * 9.0 + t) * sin(vP.y * 7.0 - t * 0.7) * sin(vP.z * 8.0 + t * 0.4);
    gl_FragColor = vec4(vec3(0.25, 0.55, 1.2) * f * k + vec3(0.9) * pow(c, 6.0) * f * k * 0.4, 1.0); }` }));
scene.add(bubble); bubble.visible = false;

// ---------- 1966: the vacuum chamber (sepia) ----------
const CH = new THREE.Group(); CH.position.set(0, 0, 300); scene.add(CH); CH.visible = false;
{ const steel = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a6, map: mp("diff", true, 6, 3), normalMap: mp("nor_gl", false, 6, 3), roughnessMap: mp("rough", false, 6, 3), roughness: 0.5, metalness: 0.8, side: THREE.BackSide });
  const shellC = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 7, 96, 1, true), steel); shellC.position.y = 2.6; CH.add(shellC);
  const floorC = new THREE.Mesh(new THREE.CircleGeometry(3.2, 96), new THREE.MeshPhysicalMaterial({ map: tex("kit/ph/rubber_tiles/rubber_tiles_diff_1k.jpg", true, 4, 4), normalMap: tex("kit/ph/rubber_tiles/rubber_tiles_nor_gl_1k.jpg", false, 4, 4), roughness: 0.8 })); floorC.rotation.x = -Math.PI / 2; CH.add(floorC);
  for (let i = 0; i < 6; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.06, 10, 96), metal(0x80868c, 0.4)); rib.rotation.x = Math.PI / 2; rib.position.y = 0.4 + i * 1.1; CH.add(rib); }
  const port = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 16, 64), metal(0x6b7077, 0.3)); port.position.set(0, 2.2, -3.15); CH.add(port);
  const lampC = new THREE.PointLight(0xfff0d0, 3, 12, 2); lampC.position.set(1.2, 5, 1); CH.add(lampC); }
const gauge = new THREE.Group(); CH.add(gauge); gauge.position.set(1.6, 1.7, -2.6);
{ const face = H.canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#efe8d6"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill(); g.strokeStyle = "#222"; g.lineWidth = 10; g.stroke();
    g.fillStyle = "#222"; g.font = "700 34px M"; g.textAlign = "center"; for (let i = 0; i <= 5; i++) { const a = Math.PI * 0.75 + i / 5 * Math.PI * 1.5; g.fillText(String(i * 3), 256 + Math.cos(a) * 180, 268 + Math.sin(a) * 180); g.save(); g.translate(256, 256); g.rotate(a); g.fillRect(205, -4, 36, 8); g.restore(); }
    g.font = "700 30px M"; g.fillText("PSI", 256, 360); });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 64), metal(0x5d6268, 0.3)); body.rotation.x = Math.PI / 2; gauge.add(body);
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.32, 64), new THREE.MeshStandardMaterial({ map: face, roughness: 0.4 })); f.position.z = 0.045; gauge.add(f);
  gauge.userData.needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.25, 0.01), new THREE.MeshStandardMaterial({ color: 0xb01010 })); gauge.userData.needle.geometry.translate(0, 0.11, 0); gauge.userData.needle.position.z = 0.055; gauge.add(gauge.userData.needle); }
const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-2.8, 1.2, -1.5), V(-1.8, 0.6, -0.5), V(-0.8, 0.9, 0), V(-0.18, 1.05, 0.05)]), 60, 0.03, 10), new THREE.MeshPhysicalMaterial({ color: 0x3b3b36, roughness: 0.6 })); CH.add(hose);

// ---------- Orbi: phone + laptop floating in the module (zero g), anonymous mode on screen ----------
const IMG = { panon: await img("shots/phone-anon.png"), pcreate: await img("shots/phone-anoncreate.png"), lanon: await img("shots/laptop-anon.png") };
const ph = makePhone(), lap = makeLaptop(); const OR = new THREE.Group(); OR.add(ph.g, lap.g); scene.add(OR); OR.visible = false;
const lock = makeLock(); OR.add(lock); const embers = makeEmbers(); OR.add(embers); const orbiL = new THREE.PointLight(0x3dff8c, 0, 5, 2); OR.add(orbiL);
const server = new THREE.Group(); OR.add(server);
{ const rk = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.1, 0.5, 3, 0.04), metal(0x3a3e44, 0.35)); server.add(rk); for (let i = 0; i < 6; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.02), metal(0x23262a, 0.4)); u.position.set(0, -0.4 + i * 0.16, 0.255); server.add(u); const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glow(0x3dff8c, 3)); led.position.set(0.24, -0.4 + i * 0.16, 0.27); server.add(led); } }
const hashChip = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.12, 0.02, 2, 0.02), new THREE.MeshBasicMaterial({ map: H.canvasTex(256, 96, (g, w, h) => { g.fillStyle = "#0f1a14"; g.fillRect(0, 0, w, h); g.fillStyle = green; g.font = "700 30px M"; g.fillText("#9f3a…c1", 22, 60); }), toneMapped: false })); OR.add(hashChip);
function drawPhone(g, st) {
  g.drawImage(st.create ? IMG.pcreate : IMG.panon, 0, 0, 780, 1688);
  if (st.code > 0) { g.globalAlpha = st.code; g.fillStyle = "rgba(0,0,0,.8)"; rr(g, 70, 1180, 640, 230, 30); g.fill(); g.strokeStyle = green; g.lineWidth = 3; g.stroke();
    "K7QX".split("").forEach((c, i) => { g.fillStyle = "#121a15"; rr(g, 100 + i * 150, 1210, 120, 140, 18); g.fill(); g.fillStyle = "#fff"; g.font = "800 92px D"; g.textAlign = "center"; g.fillText(c, 160 + i * 150, 1315); g.textAlign = "left"; }); g.globalAlpha = 1; }
  if (st.pass > 0) { g.fillStyle = green; for (let i = 0; i < Math.round(st.pass * 12); i++) { g.beginPath(); g.arc(120 + i * 44, 1460, 12, 0, 7); g.fill(); } }
  if (st.burn) { g.fillStyle = "rgba(0,0,0,.75)"; rr(g, 160, 120, 460, 80, 40); g.fill(); g.fillStyle = "#ff8a3d"; g.font = "700 34px M"; g.fillText(st.burn, 200, 172); }
}
function drawLap(g, st) { g.drawImage(IMG.lanon, 0, 0, 1440, 900); if (st.code > 0) { g.globalAlpha = st.code; g.fillStyle = "rgba(0,0,0,.85)"; rr(g, 1110, 520, 300, 110, 18); g.fill(); g.fillStyle = "#fff"; g.font = "800 60px D"; g.fillText("K7QX", 1180, 597); g.globalAlpha = 1; }
  if (st.files > 0) { for (let i = 0; i < 3; i++) { const k = clamp(st.files * 3 - i); if (k <= 0) continue; g.globalAlpha = k; g.fillStyle = "#101418"; rr(g, 120 + i * 260, 560, 220, 150, 16); g.fill(); g.strokeStyle = green; g.lineWidth = 2; g.stroke(); g.fillStyle = "#fff"; g.font = "700 22px M"; g.fillText(["mission.pdf", "notes.txt", "orbit.mp4"][i], 140 + i * 260, 690); g.globalAlpha = 1; } }
  if (st.burn) { g.fillStyle = "#ff8a3d"; g.font = "700 26px M"; g.fillText(st.burn, 1130, 660); } }

// ---------- overlays ----------
H.callouts({
  press: ["Air pressure", "#9fd4ff", "≈1 kg on every cm²"], lungs: ["Lungs", "#ff8f8f", "air expands as pressure drops"], bubbles: ["Gas bubbles", "#cfe6ff", "in veins + joints"],
  saliva: ["Saliva boils", "#cfe6ff", "at body temperature"], skin: ["Skin holds", "#ffb38a", "swells, doesn't burst"], heart: ["Heart", "#ff5a4a", "keeps blood under pressure"],
  brain: ["Brain", "#ffb3a0", "runs out of oxygen"], o2: ["Oxygen leaves", "#6fd0ff", "lungs pull it OUT of the blood"],
  heat: ["Heat", "#ff8a3d", "only radiates away: slow"], uvc: ["Unfiltered UV", "#c79bff", "burns in seconds-minutes"],
  gauge: ["Chamber pressure", "#ffd9a0", "falling"], hose: ["Suit hose", "#ffd9a0", "came loose"],
  air: ["Air", "#9fd4ff"], pr: ["Pressure", "#ffd166"], warm: ["Warmth", "#ff8a3d"],
  code: ["4-letter code", green, "+ your passcode"], browser: ["Passcode", green, "never leaves your browser"], srv: ["Server", "#9aa6b2", "only sees a lock check"],
});
hudEl("big", `<div id="bigt" style="width:1080px;text-align:center;font:900 250px/0.85 D;font-stretch:112%;color:#fff;text-shadow:0 14px 50px rgba(0,0,0,.7)">15</div><div id="bigs" style="width:1080px;text-align:center;font:800 48px D;color:#9fd4ff;letter-spacing:.12em;margin-top:10px">SECONDS</div>`, { left: "0px", top: "300px" });
hudEl("press", `<div style="width:920px;margin-left:80px;padding:24px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:1.5px solid rgba(160,200,255,.3)">
  <div style="display:flex;justify-content:space-between;font:700 28px M;letter-spacing:.16em;color:#9aa6b2"><span>CABIN PRESSURE</span><span id="pv" style="color:#9fd4ff">101 kPa</span></div>
  <div style="margin-top:18px;height:26px;border-radius:13px;background:rgba(255,255,255,.08);overflow:hidden"><div id="pb" style="height:100%;width:100%;border-radius:13px;background:linear-gradient(90deg,#ff5a4a,#ffd166,#6fd0ff)"></div></div></div>`, { left: "0px", top: "1440px" });
hudEl("rules", `<div style="width:1080px;display:flex;justify-content:center;gap:22px">${[["HOLD YOUR BREATH", 0], ["BREATHE OUT", 1]].map(([s, ok], i) => `<div id="rl${i}" style="position:relative;padding:22px 28px;border-radius:22px;background:${ok ? "#3dff8c" : "rgba(255,255,255,.95)"};color:#0b0d10;font:900 40px D">${s}<span style="position:absolute;right:-18px;top:-18px;width:52px;height:52px;border-radius:50%;background:${ok ? "#0b0d10" : "#ff3b3b"};color:${ok ? "#3dff8c" : "#fff"};display:grid;place-items:center;font:900 30px Arial">${ok ? "✓" : "✕"}</span></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("boil", `<div style="width:920px;margin-left:80px;padding:24px 30px;border-radius:24px;background:rgba(8,10,16,.82);border:1.5px solid rgba(255,255,255,.18)">
  <div style="font:700 26px M;letter-spacing:.18em;color:#9aa6b2;margin-bottom:14px">WATER BOILS AT…</div>
  ${[["Sea level · 101 kPa", "100 °C", 1], ["Everest · 34 kPa", "≈71 °C", 0.71], ["Above 19 km · 6.3 kPa", "37 °C = YOU", 0.37], ["Space · ~0 kPa", "below 37 °C", 0.1]].map(([a, b, v], i) => `<div id="bl${i}" style="display:flex;align-items:center;gap:16px;margin-top:10px"><div style="width:400px;font:700 28px M;color:#cfd6dd">${a}</div><div style="flex:1;height:26px;border-radius:13px;background:rgba(255,255,255,.08);overflow:hidden"><div style="height:100%;width:${v * 100}%;background:${i >= 2 ? "#ff5a4a" : "#6fd0ff"};border-radius:13px"></div></div><div style="width:200px;text-align:right;font:800 30px D;color:${i >= 2 ? "#ff8a6a" : "#fff"}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1400px" });
hudEl("ring", `<svg width="440" height="440" viewBox="-220 -220 440 440"><circle r="180" fill="rgba(8,10,16,.75)" stroke="rgba(255,255,255,.15)" stroke-width="22"/><circle id="rg" r="180" fill="none" stroke="#3dff8c" stroke-width="22" stroke-linecap="round" stroke-dasharray="1131" stroke-dashoffset="0" transform="rotate(-90)"/>
  <text id="rgt" y="30" text-anchor="middle" style="font:900 120px D;fill:#fff">90</text><text y="88" text-anchor="middle" style="font:700 26px M;fill:#9aa6b2;letter-spacing:4px">SECONDS</text></svg>`, { left: "320px", top: "330px" });
hudEl("temp", `<div style="width:1080px;display:flex;justify-content:center;gap:20px">${[["SPACE", "−270 °C", "#6fd0ff"], ["BUT", "EMPTY", "#fff"]].map(([a, b, c], i) => `<div id="tp${i}" style="padding:20px 30px;border-radius:22px;background:rgba(8,10,16,.82);border:1.5px solid ${c};text-align:center"><div style="font:700 24px M;letter-spacing:.2em;color:#9aa6b2">${a}</div><div style="font:900 64px D;color:${c}">${b}</div></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("chips", `<div style="width:1080px;display:flex;justify-content:center;gap:14px">${[5, 10, 15, 20, 30].map((m, i) => `<div id="ch${i}" style="padding:18px 22px;border-radius:18px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.2);font:900 44px D;color:#fff">${m}<span style="font:700 20px M;color:#9aa6b2"> MIN</span></div>`).join("")}</div>`, { left: "0px", top: "1440px" });
hudEl("timer", `<div id="tmr" style="width:1080px;text-align:center;font:800 130px M;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)">30:00</div>`, { left: "0px", top: "1440px" });
hudEl("tunnel", `<div style="width:1080px;height:1920px;background:radial-gradient(circle at 50% 42%, rgba(0,0,0,0) var(--r), rgba(0,0,0,1) calc(var(--r) + 18%))"></div>`, { left: "0px", top: "0px" });

// ---------- helpers ----------
const MOUTH = () => A.at(V(0, 1.535, 0.085));
function inside(t, pos, open) { // air molecules: bounce around the cabin; when open → rush out of the hatch
  const m4 = new THREE.Matrix4();
  MP.forEach((p, i) => { let x = p.x + Math.sin(t * p.s * 2 + p.a) * 0.4, y = Math.cos(p.a + t * 0.3 * p.s) * p.r, z = Math.sin(p.a + t * 0.3 * p.s) * p.r;
    let s = 1; if (open > 0) { const u = clamp(open * 1.6 - p.d * 0.6); x = lerp(x, HALF + 6 + p.d * 12, u * u); y *= 1 - u * 0.7; z *= 1 - u * 0.7; s = 1 - u * 0.6; }
    if (H.cam.position.distanceTo(V(x, y, z)) < 0.7) s = 0; m4.makeScale(s, s, s).setPosition(x, y, z); mols.setMatrixAt(i, m4); }); mols.instanceMatrix.needsUpdate = true; }
function personAt(p, ry = 0, rx = 0, rz = 0) { A.root.position.copy(p); A.root.rotation.set(rx, ry, rz); }
const floatPose = (t, k = 1) => ({ shL: [8 * Math.sin(t * 0.6) * k - 10, 0, 32 * k], shR: [-8 * Math.sin(t * 0.6) * k - 10, 0, -32 * k], elL: [-35 * k, 0, 0], elR: [-30 * k, 0, 0], hipL: [-18 * k, 0, 4], hipR: [-6 * k, 0, -4], knL: [32 * k, 0, 0], knR: [20 * k, 0, 0], head: [-6, 0, 0] });

let lastP = "", lastL = "";
H.frame("Go anonymous · it burns", async (t) => {
  // defaults
  A.root.visible = true; A.xray(0); A.extra.uSwell.value = 0; A.extra.uRed.value = 0; A.extra.uThermal.value = 0; A.extra.uBeat.value = 0; A.extra.uBreath.value = 0; A.pulse(0, 0, 0);
  A.layers.hair.visible = true; suit.visible = false; helmet.visible = false; bubble.visible = false; head.visible = false; CH.visible = false; OR.visible = false; MOD.visible = true;
  mols.visible = false; bub.visible = false; o2.visible = false; breath.visible = false; uv.visible = false; heatW.visible = false; earth.visible = atmo.visible = true;
  earthMat.uniforms.sep.value = 0; H.grade.uniforms.uSepia.value = 0; earthMat.uniforms.rot.value = t * 0.0006; hatchHinge.rotation.y = 0; H.zoom = 1; H.bloom.strength = 0.4; H.key.intensity = 3.2; cabinL.intensity = 1.2;
  A.setPose(floatPose(t)); A.mat.bone.transparent = false; A.mat.bone.opacity = 1; A.mat.bone.depthWrite = true;
  // ---- HOOK: outside, a man in a t-shirt floats beside the station, Earth below. 15 seconds.
  if (t < at("airlock")) {
    hatchHinge.rotation.y = -1.6;
    personAt(V(HALF + 2.6 + t * 0.05, -0.6, 0.8), 0.9 + t * 0.03, 0.15, 0.1);
    move(t, 0, at("airlock"), [V(HALF + 6.5, 1.6, 5.2), V(HALF + 2.4, -0.9, 0.6), 40], [V(HALF + 5.0, 1.0, 3.6), V(HALF + 2.6, -0.4, 0.8), 34]);
    hudShow("big", win(t, fr("hook", 0.72), end("hook") + 0.2), { transform: `scale(${lerp(1.2, 1, out(prog(t, fr("hook", 0.72), fr("hook", 0.8))))})` });
    title(t, fr("hook", 0.36), fr("hook", 0.52), "Without a suit", "You won't explode");
    title(t, fr("hook", 0.52), fr("hook", 0.7), "And you won't", "Freeze solid");
  }
  // ---- AIRLOCK: inside, air presses on every part of you. Then the door opens.
  else if (t < at("lungs")) {
    const open = prog(t, fr("airlock", 0.82), fr("airlock", 0.95));
    hatchHinge.rotation.y = -1.6 * ease(open); mols.visible = true;
    const pull = ease(prog(t, fr("airlock", 0.86), end("airlock") + 0.6));
    personAt(V(lerp(0.6, HALF + 1.4, pull), lerp(-0.2, -0.3, pull), 0), 1.57 - 0.8 * pull, 0, 0.2 * pull);
    A.setPose(floatPose(t, 0.6 + 0.4 * pull));
    if (t < fr("airlock", 0.8)) move(t, at("airlock"), fr("airlock", 0.8), [V(-2.6, 0.4, 1.0), V(0.6, 0.3, 0), 40], [V(-1.6, 0.6, 0.9), V(0.6, 0.55, 0), 36]);
    else move(t, fr("airlock", 0.8), at("lungs"), [V(-1.6, 0.6, 0.9), V(1.6, 0.4, 0), 36], [V(-0.2, 0.5, 1.2), V(HALF + 1, 0.0, 0), 42]);
    inside(t, null, open); const shake = open > 0 && open < 1 ? 1 : 0; H.cam.position.x += Math.sin(t * 77) * 0.03 * shake; H.cam.position.y += Math.cos(t * 61) * 0.03 * shake;
    hudShow("press", win(t, fr("airlock", 0.08), end("airlock") + 0.3)); const kp = 101 * (1 - ease(open)); H.$("pv").textContent = `${Math.round(kp)} kPa`; S2(H.$("pb"), { width: `${kp / 101 * 100}%` }); S2(H.$("pv"), { color: kp < 20 ? "#ff5a4a" : "#9fd4ff" });
    callout("press", t, fr("airlock", 0.15), fr("airlock", 0.75), A.at(V(0.15, 1.3, 0.12)), 790, 470);
    flash(t, fr("airlock", 0.86), 0.5, 2, "#fff6e8");
  }
  // ---- LUNGS: x-ray chest outside; the lungs balloon if you hold your breath → breathe out
  else if (t < at("fizz")) {
    personAt(V(HALF + 2.0, -0.4, 0.2), 1.0, 0.1, 0.15); A.xray(1);
    const hold = ease(prog(t, fr("lungs", 0.1), fr("lungs", 0.5))), ex = ease(prog(t, fr("lungs", 0.68), fr("lungs", 0.9)));
    A.extra.uBreath.value = 6 * hold * (1 - ex) - 1.5 * ex;
    const C = A.at(V(0, 1.3, 0.0));
    move(t, at("lungs"), at("fizz"), [C.clone().add(V(0.4, 0.15, 1.15)), C, 32], [C.clone().add(V(0.25, 0.08, 0.8)), C.clone().add(V(0, 0.05, 0)), 30]);
    breath.visible = ex > 0; { const m4 = new THREE.Matrix4(), M = MOUTH(); BRP.forEach((p, i) => { const u = mod(p.d + (t - fr("lungs", 0.68)) * 0.9, 1); const s = ex > 0 && t > fr("lungs", 0.68) ? (1 - u) * (0.6 + p.s) : 0; m4.makeScale(s, s, s).setPosition(M.clone().addScaledVector(p.v.clone().applyEuler(A.root.rotation), u * 1.2)); breath.setMatrixAt(i, m4); }); breath.instanceMatrix.needsUpdate = true; }
    A.mat.lung.emissive.setRGB(0.6 * hold * (1 - ex), 0.05, 0.02);
    hudShow("rules", win(t, fr("lungs", 0.12), end("lungs") + 0.2)); S2(H.$("rl0"), { opacity: win(t, fr("lungs", 0.12), 999) }); S2(H.$("rl1"), { opacity: win(t, fr("lungs", 0.68), 999) });
    callout("lungs", t, fr("lungs", 0.3), fr("lungs", 0.66), A.at(V(-0.08, 1.3, 0.02)), 300, 460);
  }
  // ---- FIZZ: gas comes out of the blood: bubbles in the vessels
  else if (t < at("boil")) {
    personAt(V(HALF + 2.0, -0.4, 0.2), 1.0, 0.1, 0.15); A.xray(1);
    const C = A.at(V(0.12, 1.15, 0.0));
    move(t, at("fizz"), at("boil"), [C.clone().add(V(0.9, 0.25, 1.3)), C, 36], [C.clone().add(V(0.6, 0.15, 0.95)), C, 34]);
    bub.visible = true; const k = ease(prog(t, fr("fizz", 0.15), fr("fizz", 0.8))); const m4 = new THREE.Matrix4();
    for (let i = 0; i < NB; i++) { const v = vesselPos[(i * 13) % vesselPos.length]; const g = clamp(k * 1.6 - (i / NB) * 0.8); const s = 0.011 * g * (0.6 + 0.6 * ((i * 7) % 5) / 5) * (1 + 0.08 * Math.sin(t * 9 + i)); m4.makeScale(s, s, s).setPosition(A.at(v)); bub.setMatrixAt(i, m4); }
    bub.instanceMatrix.needsUpdate = true;
    title(t, fr("fizz", 0.08), fr("fizz", 0.45), "Like opening", "A fizzy drink");
    callout("bubbles", t, fr("fizz", 0.45), end("fizz"), A.at(vesselPos[13 * 5]), 760, 520);
  }
  // ---- BOIL: the scanned head, close: saliva fizzing on the lips; boiling point vs pressure
  else if (t < at("swell")) {
    A.root.visible = false; MOD.visible = false; head.visible = true; head.position.set(HALF + 30, 0, 0);
    head.updateMatrixWorld(true); const hb = new THREE.Box3().setFromObject(head), hc = hb.getCenter(V()), hs = hb.getSize(V());
    if (!window._nose) window._nose = noseTip(); const nose = window._nose; const lips = nose.clone().add(V(0, -0.045, -0.014)); const fwd = V(0.45, 0, 0.9).normalize();
    move(t, at("boil"), at("swell"), [lips.clone().addScaledVector(fwd, 0.42).add(V(0.05, 0.08, 0)), lips.clone().add(V(0, 0.03, 0)), 30], [lips.clone().addScaledVector(fwd, 0.26).add(V(0.08, 0.03, 0.02)), lips, 28]);
    bub.visible = true; const k = prog(t, fr("boil", 0.55), end("boil")); const m4 = new THREE.Matrix4();
    for (let i = 0; i < NB; i++) { const ph = mod(i * 0.137 + t * (0.8 + (i % 5) * 0.2), 1); const a = (i / NB) * Math.PI * 2; const r1 = ((i * 7919) % 1000) / 1000, r2 = ((i * 104729) % 1000) / 1000; const p = lips.clone().add(V((r1 - 0.5) * 0.05, (r2 - 0.5) * 0.012 + ph * 0.003, 0.002 + Math.cos((r1 - 0.5) * 2.2) * 0.003));
      const s = i > 90 ? 0 : (0.0008 + 0.0022 * r2) * (k > 0 ? clamp(k * 3 - (i / NB)) : 0) * Math.sin(ph * Math.PI); m4.makeScale(s, s, s).setPosition(p); bub.setMatrixAt(i, m4); }
    bub.instanceMatrix.needsUpdate = true;
    H.key.position.copy(hc).add(SUN.clone().multiplyScalar(10)); H.key.target.position.copy(hc); H.bokeh.enabled = true; H.bokeh.uniforms.focus.value = H.cam.position.distanceTo(lips); H.bokeh.uniforms.aperture.value = 0.003;
    hudShow("boil", win(t, fr("boil", 0.05), fr("boil", 0.55) + 0.3)); for (let i = 0; i < 4; i++) S2(H.$("bl" + i), { opacity: win(t, fr("boil", 0.06 + i * 0.1), 999) });
    callout("saliva", t, fr("boil", 0.65), end("boil"), lips, 760, 560);
  }
  // ---- SWELL: the body puffs up, the skin holds; the heart keeps the blood under pressure
  else if (t < at("brain")) {
    H.key.target.position.set(0, 0, 0); H.key.position.copy(SUN.clone().multiplyScalar(30));
    personAt(V(HALF + 2.4, -0.4, 0.4), 0.7 + (t - at("swell")) * 0.05, 0.1, 0.12);
    const sw = ease(prog(t, fr("swell", 0.05), fr("swell", 0.4))); A.extra.uSwell.value = 0.014 * sw;
    const xk = prog(t, fr("swell", 0.58), fr("swell", 0.7)); A.xray(xk); A.extra.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 7.5)), 6);
    const B = A.root.position.clone().add(V(0, 1.0, 0));
    if (t < fr("swell", 0.58)) move(t, at("swell"), fr("swell", 0.58), [B.clone().add(V(1.2, 0.5, 3.2)), B, 38], [B.clone().add(V(0.6, 0.4, 2.6)), B, 36]);
    else { const C = A.at(V(0.03, 1.29, 0.04)); move(t, fr("swell", 0.58), at("brain"), [C.clone().add(V(0.45, 0.15, 1.0)), C, 32], [C.clone().add(V(0.28, 0.1, 0.62)), C, 28]); }
    callout("skin", t, fr("swell", 0.2), fr("swell", 0.58), A.at(V(0.22, 1.0, 0.04)), 790, 520);
    callout("heart", t, fr("swell", 0.72), end("swell"), A.at(V(0.03, 1.29, 0.04)), 300, 520);
  }
  // ---- BRAIN: oxygen pulled OUT of the blood; 15 seconds; tunnel → blackout
  else if (t < at("cold")) {
    personAt(V(HALF + 2.4, -0.4, 0.4), 0.85, 0.1, 0.12); A.extra.uSwell.value = 0.012; A.xray(1);
    const Hd = A.at(V(0, 1.62, 0)); move(t, at("brain"), at("cold"), [Hd.clone().add(V(0.5, 0.05, 0.9)), Hd.clone().add(V(0, -0.15, 0)), 34], [Hd.clone().add(V(0.25, 0.04, 0.55)), Hd, 30]);
    o2.visible = true; const m4 = new THREE.Matrix4(), M = MOUTH(); for (let i = 0; i < NO2; i++) { const u = mod(i / NO2 + t * 0.35, 1); const from = A.at(V(((i % 7) - 3) * 0.03, 1.28 + ((i % 5) - 2) * 0.03, 0.02)); const p = u < 0.5 ? from.clone().lerp(M, u * 2) : M.clone().add(V(0, 0, 1).applyEuler(A.root.rotation).multiplyScalar((u - 0.5) * 1.6)); m4.makeScale(1, 1, 1).multiplyScalar(H.cam.position.distanceTo(p) < 0.6 ? 0 : 0.7).setPosition(p); o2.setMatrixAt(i, m4); } o2.instanceMatrix.needsUpdate = true;
    A.mat.bone.transparent = true; A.mat.bone.opacity = 0.22; A.mat.bone.depthWrite = false;
    const dim = prog(t, fr("brain", 0.35), fr("brain", 0.95)); A.mat.brain.color.setRGB(lerp(0.84, 0.35, dim), lerp(0.65, 0.3, dim), lerp(0.61, 0.38, dim)); A.mat.brain.emissive.setRGB(0.08 * (1 - dim), 0.02, 0.02);
    hudShow("big", win(t, fr("brain", 0.55), end("brain"))); H.$("bigt").textContent = String(Math.max(0, Math.ceil(15 * (1 - prog(t, fr("brain", 0.55), end("brain")))))); H.$("bigs").textContent = "SECONDS OF CONSCIOUSNESS";
    const r = lerp(60, 0, ease(prog(t, fr("brain", 0.8), end("brain") + 0.3))); hudShow("tunnel", t > fr("brain", 0.75) ? 1 : 0); H.$("h_tunnel").firstChild.style.setProperty("--r", `${r}%`);
    callout("o2", t, fr("brain", 0.08), fr("brain", 0.5), M, 790, 520);
    callout("brain", t, fr("brain", 0.2), fr("brain", 0.55), A.at(V(0.03, 1.66, 0.0)), 300, 760);
  }
  // ---- COLD: thermal view: space is cold but empty: heat leaves only by radiating, slowly
  else if (t < at("sun")) {
    personAt(V(HALF + 2.4, -0.4, 0.4), 0.85 + (t - at("cold")) * 0.04, 0.1, 0.12); A.extra.uSwell.value = 0.012;
    A.extra.uThermal.value = 0.75 * ease(prog(t, at("cold"), at("cold") + 0.6)); H.bloom.strength = 0.25; A.layers.hair.visible = false;
    const B = A.root.position.clone().add(V(0, 0.95, 0)); move(t, at("cold"), at("sun"), [B.clone().add(V(1.0, 0.4, 3.4)), B, 38], [B.clone().add(V(0.6, 0.3, 2.9)), B, 36]);
    heatW.visible = true; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < NHW; i++) { const u = mod(i / NHW + t * 0.08, 1); const s = 0.35 + u * 1.4; m4.compose(B.clone().add(V(0, ((i % 9) - 4) * 0.18, 0)), q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V(s, s, s)); heatW.setMatrixAt(i, m4); } heatW.instanceMatrix.needsUpdate = true; heatW.material.opacity = 0.25;
    hudShow("temp", win(t, fr("cold", 0.15), end("cold") + 0.2)); S2(H.$("tp1"), { opacity: win(t, fr("cold", 0.4), 999) });
    callout("heat", t, fr("cold", 0.55), end("cold"), A.at(V(0.18, 1.3, 0.1)), 790, 520);
  }
  // ---- SUN: unfiltered UV burns the skin
  else if (t < at("ninety")) {
    personAt(V(HALF + 2.4, -0.4, 0.4), 0.7, 0.1, 0.12); A.extra.uSwell.value = 0.012;
    A.extra.uRed.value = 0.6 * ease(prog(t, fr("sun", 0.3), end("sun")));
    const C = A.at(V(0.12, 1.4, 0.1)); move(t, at("sun"), at("ninety"), [C.clone().add(V(-0.9, 0.3, 1.6)), C, 34], [C.clone().add(V(-0.6, 0.2, 1.1)), C, 32]);
    uv.visible = true; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), SUN.clone().negate()); for (let i = 0; i < NUV; i++) { const u = mod(i * 0.173 + t * 1.3, 1); const target = A.at(V(((i % 6) - 2.5) * 0.06, 1.0 + (i % 9) * 0.07, 0.12)); m4.compose(target.clone().addScaledVector(SUN, (1 - u) * 1.6 + 0.4), q, V(1, 0.8, 1)); uv.setMatrixAt(i, m4); } uv.instanceMatrix.needsUpdate = true;
    H.bloom.strength = 0.35;
    callout("uvc", t, fr("sun", 0.25), end("sun"), A.at(V(0.1, 1.35, 0.11)), 790, 470);
  }
  // ---- NINETY: back to air within ~90 s: pulled back into the airlock, hatch shuts, pressure returns
  else if (t < at("leblanc")) {
    const k = ease(prog(t, fr("ninety", 0.1), fr("ninety", 0.75)));
    personAt(V(lerp(HALF + 2.2, 0.6, k), lerp(-0.4, -0.2, k), lerp(0.4, 0, k)), lerp(0.7, 1.57, k), 0.1 * (1 - k), 0.12 * (1 - k)); A.extra.uSwell.value = 0.012 * (1 - k); A.extra.uRed.value = 0.3 * (1 - k);
    hatchHinge.rotation.y = -1.6 * (1 - ease(prog(t, fr("ninety", 0.7), fr("ninety", 0.9))));
    move(t, at("ninety"), at("leblanc"), [V(HALF + 6, 1.2, 4.2), V(HALF, 0, 0), 42], [V(-1.8, 0.6, 1.1), V(1.0, 0.0, 0), 40]);
    hudShow("ring", win(t, fr("ninety", 0.05), end("ninety") + 0.2)); const left = 90 * (1 - prog(t, fr("ninety", 0.05), fr("ninety", 0.8)) * 0.35); H.$("rgt").textContent = String(Math.round(left)); H.$("rg").setAttribute("stroke-dashoffset", String(1131 * (1 - left / 90)));
  }
  // ---- LEBLANC 1966: vacuum chamber, a suited test subject; the hose comes loose; air pumped back in
  else if (t < at("suit")) {
    MOD.visible = false; earth.visible = atmo.visible = false; CH.visible = true; H.grade.uniforms.uSepia.value = 0.88; scene.background.set(0x000000);
    suit.visible = true; A.layers.hair.visible = false; helmet.visible = true; A.setPose({ shL: [0, 0, 14], shR: [0, 0, -14], elL: [-12, 0, 0], elR: [-12, 0, 0] });
    personAt(CH.localToWorld(V(0, 0.03, 0)), 0.3);
    const drop = ease(prog(t, fr("leblanc", 0.28), fr("leblanc", 0.42))), back = ease(prog(t, fr("leblanc", 0.72), fr("leblanc", 0.92)));
    const sag = drop * (1 - back); A.setPose({ shL: [0, 0, 14 - 10 * sag], shR: [0, 0, -14 + 10 * sag], head: [20 * sag, 0, 0], chest: [12 * sag, 0, 0], knL: [25 * sag, 0, 0], knR: [25 * sag, 0, 0], hipL: [-10 * sag, 0, 0], hipR: [-10 * sag, 0, 0] });
    const nk = A.at(V(0, 1.5, -0.02)); helmet.position.copy(nk); helmet.quaternion.copy(A.root.quaternion);
    const gp = CH.localToWorld(gauge.position.clone()); gauge.userData.needle.rotation.z = -(lerp(lerp(-2.0, 2.0, 0.95), -2.0, drop) * (1 - back) + 2.0 * 0.95 * back * 1 - (back > 0 ? 0 : 0));
    hose.position.set(0, -0.6 * drop * (1 - back * 0), 0); hose.rotation.z = -0.25 * drop;
    const B = CH.localToWorld(V(0, 1.1, 0));
    if (t < fr("leblanc", 0.55)) move(t, at("leblanc"), fr("leblanc", 0.55), [CH.localToWorld(V(2.2, 1.6, 2.4)), B, 40], [CH.localToWorld(V(1.3, 1.5, 1.6)), CH.localToWorld(V(0.3, 1.3, -0.5)), 38]);
    else move(t, fr("leblanc", 0.55), at("suit"), [CH.localToWorld(V(1.3, 1.5, 1.6)), CH.localToWorld(V(0.3, 1.3, -0.5)), 38], [CH.localToWorld(V(-1.6, 1.6, 2.2)), B, 40]);
    title(t, fr("leblanc", 0.02), fr("leblanc", 0.25), "NASA · 1966", "Jim LeBlanc");
    callout("hose", t, fr("leblanc", 0.3), fr("leblanc", 0.5), CH.localToWorld(V(-0.2, 1.05, 0.05)).add(hose.position), 300, 560);
    callout("gauge", t, fr("leblanc", 0.36), fr("leblanc", 0.6), gp, 790, 520);
    title(t, fr("leblanc", 0.8), end("leblanc") + 0.1, "He woke up", "Fine", 1450);
  }
  // ---- SUIT: a spacesuit is a tiny planet: air, pressure, warmth for one person
  else if (t < at("orbi")) {
    suit.visible = true; helmet.visible = true; A.layers.hair.visible = true; bubble.visible = true;
    personAt(V(HALF + 2.6, -0.5, 0.6), 0.6 + (t - at("suit")) * 0.06, 0.12, 0.1); A.setPose(floatPose(t, 0.6));
    const nk = A.at(V(0, 1.5, -0.02)); helmet.position.copy(nk); helmet.quaternion.copy(A.root.quaternion);
    const C = A.root.localToWorld(V(0, 0.95, 0)); bubble.position.copy(C); bubble.scale.set(0.8, 1.15, 0.8); bubble.material.uniforms.k.value = ease(prog(t, fr("suit", 0.1), fr("suit", 0.4))); bubble.material.uniforms.t.value = t;
    move(t, at("suit"), at("orbi"), [C.clone().add(V(2.2, 0.5, 4.2)), C, 40], [C.clone().add(V(1.4, 0.3, 3.0)), C, 36]);
    callout("air", t, fr("suit", 0.35), end("suit") + 0.2, C.clone().add(V(-0.5, 0.6, 0.3)), 260, 520);
    callout("pr", t, fr("suit", 0.5), end("suit") + 0.2, C.clone().add(V(0.6, 0.1, 0.3)), 820, 700);
    callout("warm", t, fr("suit", 0.65), end("suit") + 0.2, C.clone().add(V(-0.3, -0.6, 0.4)), 300, 980);
    title(t, fr("suit", 0.05), fr("suit", 0.45), "A spacesuit is", "A tiny planet");
  }
  // ---- ORBI: anonymous spaces: code + passcode (never leaves your browser), a timer, then it burns
  else {
    A.root.visible = false; OR.visible = true;
    OR.position.set(0.6, 0.05, 0); OR.scale.setScalar(0.12); OR.updateMatrixWorld(true); const W = (x, y, z) => OR.localToWorld(V(x, y, z));
    const fl = (t - at("orbi"));
    ph.g.position.set(-0.4, 0.15 + Math.sin(fl * 0.8) * 0.04, 0.6); ph.g.rotation.set(0.1 * Math.sin(fl * 0.5), 0.35 + 0.05 * Math.sin(fl * 0.4), 0.05);
    lap.g.position.set(0.9, -0.85 + Math.sin(fl * 0.6 + 1) * 0.04, -0.7); lap.g.rotation.set(0.25, -0.35 + 0.04 * Math.sin(fl * 0.3), 0.06 * Math.sin(fl * 0.5)); lap.lid.rotation.x = -0.15;
    server.position.set(-1.6, 0.1, -1.4); server.rotation.y = 0.5;
    const tCode = fr("orbi2", 0.45), tPass = fr("orbi2", 0.72), tFiles = fr("orbi3", 0.05), tTimer = fr("orbi3", 0.48), tBurn = fr("orbi3", 0.8);
    OR.updateMatrixWorld(true);
    if (t < at("orbi2")) move(t, at("orbi"), at("orbi2"), [W(-3.2, 1.2, 6.5), W(0.0, -0.2, 0), 40], [W(-2.6, 1.0, 5.6), W(0.0, -0.2, 0), 38]);
    else if (t < at("orbi3")) move(t, at("orbi2"), at("orbi3"), [W(-1.8, 0.8, 4.4), W(-0.4, 0.15, 0.6), 34], [W(-1.4, 0.6, 3.8), W(-0.45, 0.15, 0.5), 32]);
    else move(t, at("orbi3"), at("end"), [W(-1.4, 1.4, 6.2), W(0.3, -0.3, -0.3), 40], [W(-0.9, 1.2, 5.4), W(0.4, -0.35, -0.4), 38]);
    // the passcode stays on the phone: a green lock sits on it; only a check (hash chip) travels to the server
    lock.position.copy(OR.worldToLocal(ph.g.localToWorld(V(0, 0.2, 0.25)))); const lk = win(t, tPass, tFiles + 0.5); lock.scale.setScalar(Math.max(0.001, lk * lerp(1.3, 1, out(prog(t, tPass, tPass + 0.4))))); orbiL.position.copy(lock.position); orbiL.intensity = lk * 1.5;
    const hk = prog(t, tPass + 0.4, tPass + 1.6); hashChip.visible = hk > 0 && hk < 1; hashChip.position.copy(OR.worldToLocal(ph.g.localToWorld(V(0, -0.2, 0.2))).lerp(server.position.clone().add(V(0.3, 0.3, 0.3)), ease(hk))); hashChip.lookAt(H.cam.position);
    const burnLeft = t > tBurn ? Math.round(1800 * (1 - ease(prog(t, tBurn, tBurn + 1.4)))) : 1800; const bt = `${String(Math.floor(burnLeft / 60)).padStart(2, "0")}:${String(burnLeft % 60).padStart(2, "0")}`;
    const burnK = prog(t, tBurn + 0.6, tBurn + 1.8);
    screen(ph, { create: t > fr("orbi2", 0.3) ? 1 : 0, code: clamp((t - tCode) / 0.4) * (1 - burnK), pass: clamp((t - tPass) / 0.8) * (1 - burnK), burn: t > tTimer ? `BURNS IN ${bt}` : null }, drawPhone);
    screen(lap, { code: clamp((t - tCode) / 0.4) * (1 - burnK), files: clamp((t - tFiles) / 1.2) * (1 - burnK), burn: t > tTimer ? `BURNS IN ${bt}` : null }, drawLap);
    embers.userData.burn(burnK > 0 ? clamp(burnK * 2) * (1 - clamp((burnK - 0.6) / 0.4)) : 0, t, (x, y) => OR.worldToLocal(lap.lid.localToWorld(V(x * 1.0, 1.0 + y * 0.7, 0.12))));
    title(t, at("orbi") + 0.1, at("orbi2"), "Orbi Transfer has spaces too", "The safe kind");
    title(t, at("orbi2") + 0.05, fr("orbi2", 0.4), "No account · no name", "Go anonymous");
    callout("code", t, tCode, fr("orbi2", 0.95), ph.g.localToWorld(V(0, -0.15, 0.05)), 790, 470);
    callout("browser", t, tPass + 0.1, fr("orbi3", 0.2), OR.localToWorld(lock.position.clone()), 300, 470);
    callout("srv", t, tPass + 0.9, fr("orbi3", 0.3), W(-1.6, 0.6, -1.4), 300, 860);
    hudShow("chips", win(t, tTimer, tBurn)); for (let i = 0; i < 5; i++) S2(H.$("ch" + i), { opacity: win(t, tTimer + i * 0.12, 999), background: i === 4 ? "#3dff8c" : "rgba(255,255,255,.08)", color: i === 4 ? "#0b0d10" : "#fff" });
    hudShow("timer", win(t, tBurn, at("end") - 0.1)); H.$("tmr").textContent = bt; S2(H.$("tmr"), { color: burnLeft < 300 ? "#ff5a36" : "#fff" });
    title(t, tBurn + 0.1, at("end"), "When time's up", "It burns");
  }
});
await H.ready();
