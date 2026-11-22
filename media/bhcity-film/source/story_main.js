// What if a black hole was heading for Earth? — ONE locked camera on a city waterfront at night; text in the Orbi style.
// Physics (10 solar masses, Schwarzschild radius 29.5 km → 59 km wide):
//  · you don't feel its pull (Earth free-falls with you); only the difference across Earth matters: tides ∝ M/d³
//  · equilibrium tide = 0.54 m × (M_bh/M_moon) × (384,400 km / d)³ → ×4.6 at 1 AU, 131 m at 40 M km, ~5 km at 12 M km
//  · the Moon stays bound to Earth only while d > r_moon·(M_bh/3M_earth)^⅓ ≈ 40 million km, then it is pulled away;
//    its tidal disruption radius around the hole ≈ R_moon·(M_bh/M_moon)^⅓ ≈ 1.1 million km → a disk that wide
//  · the near-side tidal acceleration 2GM·R/d³ equals g at d ≈ R_earth·(2M/m)^⅓ ≈ 1.2 million km: things float
//  · inside the event horizon nothing, not even light, gets out
import { THREE, H } from "./kit/hd.js";
import { GLTFLoader } from "./kit/lib/jsm/loaders/GLTFLoader.js";
import { Water } from "./kit/lib/jsm/objects/Water.js";
import { ShaderPass } from "./kit/lib/jsm/postprocessing/ShaderPass.js";
import * as SkeletonUtils from "./kit/lib/jsm/utils/SkeletonUtils.js";
const { V, clamp, ease, smooth, out, lerp, win, prog, hudEl, hudShow, matte, sh } = H;
const scene = H.scene, cam = H.cam, TAU = Math.PI * 2, W = H.W, HH = H.HH;
const gl = new GLTFLoader(), gltf = (u) => new Promise((ok, no) => gl.load(u, ok, undefined, no));
const texL = new THREE.TextureLoader();
const tex = (u, srgb = false, rx = 1, ry = rx) => { const t = texL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const rand = (s) => { let x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

H.backdrop.visible = false; H.floor.visible = false; H.rimA.intensity = 0; H.rimB.intensity = 0; H.envK.value = 0; H.key.intensity = 0;
cam.far = 20000; cam.near = 0.1; cam.updateProjectionMatrix();
H.$("sub").style.display = "none";

// ---------- the one camera: eye level on the promenade, looking across the bay, a little up ----------
const CAM = V(0, 7.6, 31), PITCH = THREE.MathUtils.degToRad(-1.5), FOV = 56; // eye level on a terrace above the promenade
const AIM = CAM.clone().add(V(-0.04, Math.sin(PITCH), -Math.cos(PITCH)).multiplyScalar(100));
H.look(CAM, AIM, FOV); cam.updateMatrixWorld();
const dirAt = (u, v) => new THREE.Vector3(u * 2 - 1, v * 2 - 1, 0.5).unproject(cam).sub(CAM).normalize();
const BHUV = new THREE.Vector2(0.52, 0.72), MOONUV = new THREE.Vector2(0.76, 0.9);
const BH_DIR = dirAt(BHUV.x, BHUV.y), MOON_DIR = dirAt(MOONUV.x, MOONUV.y);

// ---------- Orbi type: Archivo uppercase + JetBrains Mono labels ----------
document.head.insertAdjacentHTML("beforeend", `<style>
.bcap { position: absolute; left: 70px; right: 70px; top: 1385px; text-align: center; font: 800 58px/1.08 "D"; font-stretch: 112%; text-transform: uppercase; letter-spacing: 0.005em; color: #fff; text-shadow: 0 4px 22px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.8); }
.bcap b { color: #3dff8c; font-weight: 800; }
.bttl { position: absolute; left: 60px; right: 60px; top: 300px; text-align: center; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.85); }
.bttl .k { font: 700 26px/1 "M"; letter-spacing: 0.38em; color: #3dff8c; margin-bottom: 22px; }
.bttl .t { font: 900 92px/0.98 "D"; font-stretch: 115%; text-transform: uppercase; }
.bctr { position: absolute; left: 70px; color: #fff; text-shadow: 0 3px 16px rgba(0,0,0,0.9); }
.bctr .l { font: 700 22px/1 "M"; letter-spacing: 0.3em; text-transform: uppercase; color: #3dff8c; }
.bctr .v { font: 900 84px/1 "D"; font-stretch: 112%; margin: 10px 0 8px; font-variant-numeric: tabular-nums; }
.bctr .s { font: 600 20px/1 "M"; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.8; }
</style>`);
hudEl("cap", `<div class="bcap" id="capT"></div>`, { inset: "0" });
hudEl("ttl", `<div class="bttl"><div class="k">A THOUGHT EXPERIMENT</div><div class="t">What if a black hole was heading for Earth?</div></div>`, { inset: "0" });
hudEl("c1", `<div class="bctr" style="top:120px"><div class="l" id="aL"></div><div class="v" id="aV"></div><div class="s" id="aS"></div></div>`, { inset: "0" });
hudEl("c2", `<div class="bctr" style="top:300px"><div class="l" id="bL"></div><div class="v" id="bV"></div><div class="s" id="bS"></div></div>`, { inset: "0" });

// ---------- physics of the approach (km) ----------
const KEYS = [[0, 1.5e8], [22, 9e7], [34, 4e7], [46, 1.2e7], [58, 2.5e6], [64, 1.2e6], [72, 6e5], [80, 6e4], [86, 30], [93, 1]];
const dist = (t) => { for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) { const [a, da] = KEYS[i - 1], [b, db] = KEYS[i]; return Math.exp(lerp(Math.log(da), Math.log(db), (t - a) / (b - a))); } return 1; };
const tideM = (d) => 0.54 * 2.72e8 * Math.pow(384400 / d, 3);
const weight = (d) => Math.max(0, 1 - Math.pow(1.2e6 / d, 3));
