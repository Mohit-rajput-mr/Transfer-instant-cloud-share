// Orbi HD film engine (2026-11-19, owner: "high-end graphics, Zack D. Films quality or better").
// Physically based materials lit by a studio environment map, soft shadows, MSAA, bloom on hot things,
// optional depth of field, and a film grade (vignette, grain, slight chromatic fringe, sepia flashback).
// Overlays: labelled callouts with leader lines anchored to 3D points, a top title, HUD slots, subtitles
// (1–3 words, centre band) and the Orbi end card. A film = script.json + story.js (import { THREE, H } from "./kit/hd.js").
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "./lib/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { AfterimagePass } from "./lib/jsm/postprocessing/AfterimagePass.js";
import { RoomEnvironment } from "./lib/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./lib/jsm/geometries/RoundedBoxGeometry.js";
export { THREE, RoundedBoxGeometry };
export const H = {};

// portrait 1080×1920 by default; ?ar=land renders 1920×1080 (the same story, framed for landscape: H.land)
const LAND = new URLSearchParams(location.search).get("ar") === "land";
const W = LAND ? 1920 : 1080, HH = LAND ? 1080 : 1920;
document.documentElement.style.width = document.body.style.width = W + "px"; document.documentElement.style.height = document.body.style.height = HH + "px";
document.body.insertAdjacentHTML("beforeend", `<canvas id="gl" width="${W}" height="${HH}"></canvas>
<svg class="ov" id="lines" width="${W}" height="${HH}" viewBox="0 0 ${W} ${HH}" style="left:0;top:0;z-index:22"></svg>
<div class="ov" id="hud" style="inset:0;z-index:24"></div>
<div class="ov" id="title"><div class="k" id="tk"></div><div class="t" id="tt"></div></div>
<div class="ov" id="sub"></div>
<div class="ov" id="endc"><img class="em" src="kit/emblem.svg" /><img class="lg" src="kit/logo.svg" /><div class="url">orbitransfer.com</div><div class="try" id="endtry"></div></div>
<div class="ov" id="flash"></div>
<div class="ov" id="fade"></div>
<style>
${LAND ? `#endc .em { top: 170px; width: 230px; margin-left: -115px; } #endc .lg { left: 510px; top: 450px; width: 900px; } #endc .url { top: 620px; } #endc .try { top: 760px; } #sub { left: 160px; right: 160px; }` : ""}
#sub { top: ${LAND ? 830 : 1235}px; font-size: ${LAND ? 64 : 74}px; -webkit-text-stroke: 4px #000; text-shadow: 0 6px 18px rgba(0,0,0,0.7); }
#title { left: 0; right: 0; top: ${LAND ? 70 : 150}px; text-align: center; z-index: 30; opacity: 0; }
#title .k { font: 700 30px/1 "M"; letter-spacing: 0.32em; color: #3dff8c; text-transform: uppercase; margin-bottom: 18px; }
#title .t { font: 900 104px/0.95 "D"; font-stretch: 112%; color: #fff; text-transform: uppercase; text-shadow: 0 8px 30px rgba(0,0,0,0.55); }
.cl { position: absolute; padding: 13px 22px 13px 20px; border-radius: 14px; background: rgba(12,14,18,0.78); backdrop-filter: blur(6px);
  border: 1.5px solid rgba(255,255,255,0.22); font: 700 31px/1 "M"; letter-spacing: 0.08em; text-transform: uppercase; color: #f2f5f8;
  white-space: nowrap; opacity: 0; display: flex; align-items: center; gap: 12px; }
.cl i { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
.cl small { display: block; font: 600 22px/1.2 "M"; letter-spacing: 0.06em; color: #9aa6b2; text-transform: none; margin-top: 6px; }
</style>`);
const $ = (id) => document.getElementById(id);
const S = (el, o) => Object.assign(el.style, o);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const smooth = (x) => x * x * (3 - 2 * x);
const out = (x) => 1 - Math.pow(1 - x, 3);
const back = (x) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => clamp((t - a) / fi) * clamp((b - t) / fo);
const prog = (t, a, b) => clamp((t - a) / (b - a));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- renderer + studio light ----------
const r = new THREE.WebGLRenderer({ canvas: $("gl"), antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
// the 3D renders at RS × 1080×1920 and the browser scales the canvas up; the text overlays stay at full resolution
const RS = +(new URLSearchParams(location.search).get("rs") || 0.8), RW = Math.round(W * RS), RH = Math.round(HH * RS);
r.setPixelRatio(1); r.setSize(RW, RH, false); $("gl").style.width = W + "px"; $("gl").style.height = HH + "px";
r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.outputColorSpace = THREE.SRGBColorSpace;
r.localClippingEnabled = true;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(35, W / HH, 0.05, 400);
const pmrem = new THREE.PMREMGenerator(r);
const envTex = pmrem.fromScene(new RoomEnvironment(r), 0.035).texture; // kept for films that want it; too slow on SwiftShader
// a cheap analytic studio environment instead (soft box above, two strip lights, a front fill): real-looking reflections
// on metal without the cost of sampling a prefiltered cube map (6 s → 0.3 s a frame on the CPU renderer)
const envK = { value: 1.0 };
const STUDIO = `uniform float uEnvK;
vec3 studioEnv(vec3 d, float r){
  float w = 0.04 + r * r * 0.9, dim = mix(1.0, 0.38, r);
  vec3 c = mix(vec3(0.012,0.013,0.016), vec3(0.09,0.10,0.12), smoothstep(-0.3, 0.25, d.y)) + vec3(0.05,0.055,0.065) * smoothstep(0.2, 1.0, d.y);
  c += vec3(2.3,2.25,2.15) * smoothstep(0.8 - w, 0.8 + w, d.y) * dim;
  float band = smoothstep(-0.3 - w, -0.3 + w, d.y) * (1.0 - smoothstep(0.55 - w, 0.55 + w, d.y));
  c += vec3(1.15,1.45,2.1) * smoothstep(0.78 - w, 0.78 + w, -d.x) * band * dim;
  c += vec3(2.1,1.55,1.05) * smoothstep(0.78 - w, 0.78 + w, d.x) * band * dim;
  c += vec3(0.55) * smoothstep(0.72 - w, 0.72 + w, d.z) * smoothstep(-0.1 - w, -0.1 + w, d.y) * dim;
  c += vec3(0.35,0.4,0.5) * smoothstep(0.75 - w, 0.75 + w, -d.z) * band * dim;
  return c;
}`;
function studio(mat) {
  if (mat.userData.studio || mat.envMap) return; mat.userData.studio = true;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
  mat.onBeforeCompile = (sh, rr) => {
    prev.call(mat, sh, rr);
    sh.uniforms.uEnvK = envK;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + STUDIO).replace("#include <lights_fragment_maps>", `#include <lights_fragment_maps>
      { vec3 nW = normalize(inverseTransformDirection(geometryNormal, viewMatrix));
        vec3 rW = normalize(inverseTransformDirection(reflect(-geometryViewDir, geometryNormal), viewMatrix));
        iblIrradiance += 3.14159 * studioEnv(nW, 1.0) * 0.35 * uEnvK;
        radiance += studioEnv(rW, material.roughness) * uEnvK;
        #ifdef USE_CLEARCOAT
        clearcoatRadiance += studioEnv(normalize(inverseTransformDirection(reflect(-geometryViewDir, geometryClearcoatNormal), viewMatrix)), material.clearcoatRoughness) * uEnvK;
        #endif
      }`);
  };
  mat.customProgramCacheKey = () => "studio|" + prevKey.call(mat);
  mat.needsUpdate = true;
}

// ---------- post: render (MSAA) → depth of field → bloom → tone map → grade ----------
const rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: 4 });
const comp = new EffectComposer(r, rt);
const renderPass = new RenderPass(scene, cam); comp.addPass(renderPass);
const bokeh = new BokehPass(scene, cam, { focus: 8, aperture: 0.0006, maxblur: 0.008 }); bokeh.enabled = false; comp.addPass(bokeh);
const trail = new AfterimagePass(0.8); trail.enabled = false; comp.addPass(trail);
const bloom = new UnrealBloomPass(new THREE.Vector2(RW / 2, RH / 2), 0.32, 0.55, 0.92); comp.addPass(bloom);
comp.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.32 }, uGrain: { value: 0.045 }, uCA: { value: 0.0012 }, uSepia: { value: 0 }, uLift: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uCA, uSepia, uLift; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*61.7) * 43758.5453); }
  void main(){
    vec2 d = vUv - 0.5; float r2 = dot(d,d);
    vec3 c; c.r = texture2D(tDiffuse, vUv - d*uCA*r2*8.0).r; c.g = texture2D(tDiffuse, vUv).g; c.b = texture2D(tDiffuse, vUv + d*uCA*r2*8.0).b;
    float l = dot(c, vec3(0.299,0.587,0.114));
    c = mix(c, vec3(l*1.07, l*0.9, l*0.66) + vec3(0.03,0.02,0.0), uSepia);
    c = c * (1.0 - uVig * smoothstep(0.12, 0.62, r2*2.2)) + uLift;
    c += (h(vUv*vec2(1080.0,1920.0)) - 0.5) * uGrain;
    gl_FragColor = vec4(c, 1.0);
  }`,
});
comp.addPass(grade);

// ---------- materials ----------
/** cut faces: the back faces of clipped solids are painted as a hatched section (the classic cutaway look) */
function cutaway(mat, cutColor = 0xd8432c) {
  mat.side = THREE.DoubleSide; mat.shadowSide = THREE.FrontSide; mat.clipShadows = true;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCut = { value: new THREE.Color(cutColor) };
    sh.fragmentShader = "uniform vec3 uCut;\n" + sh.fragmentShader.replace("#include <opaque_fragment>", `
        if (!gl_FrontFacing) { float hz = step(0.6, fract((gl_FragCoord.x + gl_FragCoord.y) / 18.0)); outgoingLight = mix(uCut, uCut * 0.74, hz) * 0.85; }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => "cut" + cutColor;
  return mat;
}
const metal = (color, rough = 0.32, o = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, envMapIntensity: 1.0, ...o });
const paint = (color, rough = 0.45, o = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.25, ...o });
const matte = (color, rough = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...o });
const glow = (color, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
/** cast-metal look: a subtle noise texture for roughness so big surfaces are not plastic-smooth */
function castTex(scale = 6) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  const im = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const v = 150 + rnd() * 80 + Math.sin(i * 0.013) * 6; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(scale, scale); return t;
}
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g, draw }; return t;
}
const sh = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };

// ---------- studio set: gradient backdrop, soft floor, key + rims ----------
const backdrop = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color(0x1a1f27) }, bot: { value: new THREE.Color(0x07080a) }, hl: { value: new THREE.Color(0x2a3442) } },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 top, bot, hl; varying vec3 vP; void main(){ float k = smoothstep(-0.25, 0.6, vP.y); vec3 c = mix(bot, top, k); c += hl * pow(max(0.0, 1.0 - abs(vP.y - 0.08) * 3.0), 3.0) * 0.5; gl_FragColor = vec4(c, 1.0); }`,
}));
scene.add(backdrop);
const floor = sh(new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshPhysicalMaterial({ color: 0x0d0f12, roughness: 0.42, metalness: 0, clearcoat: 0.3, envMapIntensity: 0.35 })), false, true);
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x1a1410, 0.35); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff1e2, 2.6); key.position.set(6, 10, 7); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
scene.add(key, key.target);
const rimA = new THREE.DirectionalLight(0x6fa8ff, 1.6); rimA.position.set(-8, 5, -6); scene.add(rimA);
const rimB = new THREE.DirectionalLight(0xffb070, 1.1); rimB.position.set(8, 3, -7); scene.add(rimB);

// ---------- timing (from the voice) ----------
const LINES = await (await fetch("vo/lines.json")).json();
const L = Object.fromEntries(LINES.lines.map((l) => [l.key, l]));
const at = (k) => L[k].at, end = (k) => L[k].at + L[k].dur, fr = (k, a) => L[k].at + L[k].dur * a;
window.DURATION = LINES.duration;

// ---------- camera: keyframed moves with eased interpolation + a gentle handheld drift ----------
function look(p, tgt, fov = 35) { cam.position.copy(p); cam.lookAt(tgt); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
/** move(t, a, b, [p0, t0, fov0], [p1, t1, fov1], drift) — dolly from one framing to another */
function move(t, a, b, A, B, drift = 1) {
  const k = ease(prog(t, a, b));
  const p = A[0].clone().lerp(B[0], k), tg = A[1].clone().lerp(B[1], k); let fov = lerp(A[2] ?? 35, B[2] ?? 35, k);
  p.sub(tg).multiplyScalar(H.zoom ?? 1).add(tg);
  if (LAND && H.landFov !== false) fov = Math.max(14, fov * 0.62);
  p.x += Math.sin(t * 0.7) * 0.02 * drift; p.y += Math.sin(t * 0.53 + 1) * 0.015 * drift;
  look(p, tg, fov);
}
/** orbit a target: angle (rad), radius, height */
const orbitP = (c, a, rad, h) => V(c.x + Math.sin(a) * rad, c.y + h, c.z + Math.cos(a) * rad);
const project = (v) => { const p = v.clone().project(cam); return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * HH, p.z]; };

// ---------- overlays ----------
const CL = {};
/** callouts({ id: ["Label", "#color", "small text"?] }) */
function callouts(defs) {
  for (const id in defs) {
    const [txt, col, small] = defs[id];
    $("hud").insertAdjacentHTML("beforeend", `<div class="cl" id="cl_${id}"><i style="background:${col}"></i><div>${txt}${small ? `<small>${small}</small>` : ""}</div></div>`);
    const ln = document.createElementNS("http://www.w3.org/2000/svg", "g");
    ln.innerHTML = `<path fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/><circle r="9" fill="${col}" stroke="#0b0d10" stroke-width="3"/><circle r="18" fill="none" stroke="${col}" stroke-width="2" opacity="0.5"/>`;
    $("lines").appendChild(ln);
    CL[id] = { el: $(`cl_${id}`), ln, col };
  }
}
/** show a callout: anchor = 3D point, label at screen (x, y); side: label left/right of the elbow */
function callout(id, t, a, b, anchor, x, y) {
  const c = CL[id], k = win(t, a, b, 0.35, 0.3);
  if (k <= 0) return;
  const [ax, ay, az] = project(anchor);
  if (az > 1) return;
  const grow = out(clamp((t - a) / 0.45));
  const rect = c.el.getBoundingClientRect();
  const lw = rect.width || 300, lh = rect.height || 56;
  const left = x < ax;
  const ex = left ? x + lw / 2 : x - lw / 2;
  const ey = y;
  const mx = lerp(ax, ex, grow), my = lerp(ay, ey, grow);
  const midx = lerp(ax, ex, 0.5 * grow);
  c.ln.querySelector("path").setAttribute("d", `M${ax},${ay} L${lerp(ax, midx, 1)},${lerp(ay, my, 1)} L${mx},${my}`);
  c.ln.querySelectorAll("circle").forEach((q, i) => { q.setAttribute("cx", ax); q.setAttribute("cy", ay); if (i === 1) q.setAttribute("r", 14 + 10 * ((t * 1.3) % 1)); });
  c.ln.style.opacity = k;
  S(c.el, { left: `${x - lw / 2}px`, top: `${y - lh / 2}px`, opacity: k * clamp((grow - 0.6) / 0.4), transform: `translateY(${(1 - grow) * 14}px)` });
}
function title(t, a, b, kicker, text, y = 150) {
  const k = win(t, a, b, 0.35, 0.3); if (k <= 0) return;
  $("tk").textContent = kicker; $("tt").innerHTML = text;
  S($("title"), { opacity: k, top: `${y}px`, transform: `translateY(${(1 - out(clamp((t - a) / 0.4))) * -24}px) scale(${lerp(1.08, 1, out(clamp((t - a) / 0.4)))})` });
}
/** HUD: free HTML blocks the film defines once (hudEl(id, html, css)) and shows per frame (hudShow(id, k, css)) */
const HUD = {};
function hudEl(id, html, css = {}) { $("hud").insertAdjacentHTML("beforeend", `<div class="ov" id="h_${id}" style="opacity:0">${html}</div>`); HUD[id] = $(`h_${id}`); S(HUD[id], css); return HUD[id]; }
const hudShow = (id, k, css = {}) => { if (k > 0) S(HUD[id], { opacity: k, ...css }); };
const flash = (t, a, amt = 0.8, w = 5, color = "#fff") => { const v = amt - Math.abs(t - a) * w; if (v > +($("flash").style.opacity || 0)) S($("flash"), { opacity: v, background: color }); };

// ---------- per frame ----------
function frame(endLine, shots) {
  $("endtry").textContent = endLine;
  window.render = async (t) => {
    for (const c of Object.values(CL)) { c.el.style.opacity = 0; c.ln.style.opacity = 0; }
    for (const el of Object.values(HUD)) el.style.opacity = 0;
    S($("title"), { opacity: 0 }); S($("flash"), { opacity: 0 });
    bokeh.enabled = false; trail.enabled = false; grade.uniforms.uSepia.value = 0; grade.uniforms.uTime.value = t;
    seed = 7;
    H.trailSteps = 0;
    await shots(t);
    if (H.trailSteps && trail.enabled) { // motion blur: a few sub-frames just before t fill the afterimage buffer
      const n = H.trailSteps;
      for (let i = n; i > 0; i--) { await shots(t - (i * (H.trailDt || 1 / 150))); comp.render(); }
      await shots(t);
    }
    // subtitles: 1–3 words, broken at punctuation, timed by letters
    let sub = "";
    for (const ln of LINES.lines) {
      if (t < ln.at - 0.05 || t > ln.at + ln.dur + 0.1) continue;
      const words = ln.text.split(" "), total = words.reduce((s, w) => s + w.length + 2, 0);
      let acc = 0; const st = words.map((w) => { const s = ln.at + (acc / total) * ln.dur; acc += w.length + 2; return s; });
      let cur = 0; for (let i = 0; i < words.length; i++) if (t >= st[i]) cur = i;
      const chunks = []; let c = [];
      words.forEach((w, i) => { c.push(i); if (c.length === 3 || /[.,?!]$/.test(w)) { chunks.push(c); c = []; } }); if (c.length) chunks.push(c);
      sub = chunks.find((cc) => cc.includes(cur)).map((i) => words[i]).join(" ");
    }
    $("sub").textContent = sub;
    S($("sub"), { opacity: t > at("end") - 0.1 ? 0 : 1 });
    const e = clamp((t - at("end") + 0.1) / 0.5);
    S($("endc"), { opacity: e });
    document.querySelector("#endc .em").style.transform = `rotate(${(t - at("end")) * 25}deg) scale(${lerp(0.6, 1, back(e))})`;
    S($("fade"), { opacity: Math.max(1 - clamp(t / 0.35), clamp((t - (window.DURATION - 0.5)) / 0.5)) });
    if (e < 1) comp.render();
  };
}
async function ready() {
  scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.isMeshStandardMaterial) studio(m); }); await document.fonts.load("800 20px D"); await document.fonts.load("700 20px M"); await document.fonts.ready; window.ready = true; }

window.H = H;
Object.assign(H, {
  W, HH, land: LAND, $, S, clamp, ease, smooth, out, back, lerp, win, prog, V, rnd, reseed: (s) => (seed = s),
  r, scene, cam, comp, envK, studio, bokeh, trail, bloom, grade, envTex, backdrop, floor, hemi, key, rimA, rimB,
  cutaway, metal, paint, matte, glow, castTex, canvasTex, sh,
  LINES, L, at, end, fr, look, move, orbitP, project,
  callouts, callout, title, hudEl, hudShow, flash, frame, ready,
});
