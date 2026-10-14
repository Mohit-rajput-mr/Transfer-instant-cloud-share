"use client";
import { useEffect, useId, useRef } from "react";

/**
 * The front wall of a space: a thick, curved glass jar laid over its objects.
 *  - Chromium: a real lens. A displacement map is computed for the jar's exact size and shape
 *    (a rounded slab whose surface curves down at the rim like a sphere), and the backdrop
 *    (stars, spheres, labels) is bent through it with SVG feDisplacementMap. Red, green and blue
 *    bend by slightly different amounts, so the rim splits light into a faint rainbow like real glass.
 *  - Everywhere: the light painted on the glass (rim, window reflection, caustic, the sky bent
 *    round the bottom) gives it depth even where browsers can't refract (Safari, Firefox).
 */
export default function GlassJar() {
  const ref = useRef<HTMLDivElement>(null);
  const img = useRef<SVGFEImageElement>(null);
  const filt = useRef<SVGFilterElement>(null);
  const id = `jar${useId().replace(/[^a-z0-9]/gi, "")}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ua = navigator.userAgent;
    const chromium = /Chrome\/|Edg\//.test(ua) && !/Firefox\//.test(ua);
    const calm = !matchMedia("(prefers-reduced-transparency: reduce)").matches;
    if (!chromium || !calm || (navigator.hardwareConcurrency ?? 4) < 4) return;

    let w = 0, h = 0, t = 0;
    const draw = () => {
      const r = el.getBoundingClientRect();
      const W = Math.round(r.width), H = Math.round(r.height);
      if (W < 40 || H < 40 || (W === w && H === h)) return;
      w = W;
      h = H;
      const rad = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 30, W / 2, H / 2);
      // a narrow phone card gets a thinner wall and a gentler bend than a wide desktop one
      const m = Math.min(W, H);
      const scale = Math.round(Math.max(36, Math.min(SCALE, m * 0.13)));
      const bezel = Math.max(30, Math.min(110, m * 0.16));
      img.current?.setAttribute("href", lensMap(W, H, rad, scale, bezel));
      filt.current?.querySelectorAll("feDisplacementMap").forEach((d, i) => d.setAttribute("scale", String(scale * [1, 0.965, 0.93][i])));
      for (const node of [filt.current, img.current]) {
        node?.setAttribute("width", String(W));
        node?.setAttribute("height", String(H));
      }
      el.classList.add("refract");
    };
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(draw, 120);
    });
    ro.observe(el);
    draw();
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <div ref={ref} className="room-glass jar-front" style={{ "--jar": `url(#${id})` } as React.CSSProperties} aria-hidden>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter ref={filt} id={id} x="0" y="0" width="1" height="1" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage ref={img} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" />
          {/* three passes, one per colour, each bent a little less: chromatic dispersion at the rim */}
          <feDisplacementMap in="SourceGraphic" in2="map" scale={SCALE} xChannelSelector="R" yChannelSelector="G" result="dr" />
          <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={SCALE * 0.965} xChannelSelector="R" yChannelSelector="G" result="dg" />
          <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={SCALE * 0.93} xChannelSelector="R" yChannelSelector="G" result="db" />
          <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" result="lens" />
          <feGaussianBlur in="lens" stdDeviation="0.35" />
        </filter>
      </svg>
      <i className="jar-env" />
      <i className="jar-rim" />
      <i className="jar-window" />
      <i className="jar-caustic" />
    </div>
  );
}

/** Largest bend (feDisplacementMap scale, px) on a big card. The map stores ±scale/2 around mid-grey. */
const SCALE = 90;

/**
 * Displacement map for a rounded slab of glass, w×h with corner radius rad. Near the rim the surface
 * falls away like the side of a sphere: steepest at the edge, flat by the time it is `bezel` deep.
 * Light through a steep surface is bent hardest, so each pixel samples the backdrop from further
 * inside the jar the closer it sits to the rim (things near the wall look stretched round it),
 * plus a gentle bulge over the whole face so it reads as one curved body, not a flat pane.
 */
function lensMap(w: number, h: number, rad: number, scale: number, bezel: number) {
  // computed at half size and stretched by feImage: the field is smooth, so nothing is lost
  const k = 0.5;
  const W = Math.max(2, Math.round(w * k)), H = Math.max(2, Math.round(h * k));
  const cvs = document.createElement("canvas");
  cvs.width = W;
  cvs.height = H;
  const ctx = cvs.getContext("2d")!;
  const data = ctx.createImageData(W, H);
  const hx = w / 2, hy = h / 2;
  const max = scale / 2;
  // signed distance to the rounded rectangle (negative inside)
  const sd = (x: number, y: number) => {
    const qx = Math.abs(x - hx) - (hx - rad), qy = Math.abs(y - hy) - (hy - rad);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
  };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = (i + 0.5) / k, y = (j + 0.5) / k;
      const d = sd(x, y);
      const depth = -d;
      let ox = 0, oy = 0;
      if (depth < bezel) {
        // outward normal from the distance field's gradient
        const e = 1;
        let nx = sd(x + e, y) - sd(x - e, y), ny = sd(x, y + e) - sd(x, y - e);
        const n = Math.hypot(nx, ny) || 1;
        nx /= n;
        ny /= n;
        const t = Math.max(0, depth) / bezel;
        // slope of a quarter-circle profile, eased so the bend dies out smoothly
        const bend = Math.pow(1 - t, 2.6);
        ox -= nx * bend * max;
        oy -= ny * bend * max;
      }
      // whole-face bulge: sample a touch towards the centre (a mild magnifier)
      const ux = (x - hx) / hx, uy = (y - hy) / hy;
      const bulge = Math.min(7, scale * 0.08) * Math.min(1, ux * ux + uy * uy);
      ox -= ux * bulge;
      oy -= uy * bulge;
      const p = (j * W + i) * 4;
      data.data[p] = clamp255(128 + (ox / max) * 127);
      data.data[p + 1] = clamp255(128 + (oy / max) * 127);
      data.data[p + 2] = 128;
      data.data[p + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  return cvs.toDataURL("image/png");
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
