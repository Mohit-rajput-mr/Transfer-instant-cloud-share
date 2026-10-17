"use client";
import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Overview, Pt } from "./types";

export type Layer = "live" | "exact" | "visitors" | "uploads" | "downloads" | "routes";

// Vector map on a true 3D globe: roads, borders and labels are drawn by the GPU at every zoom,
// so text stays razor-sharp instead of being a stretched picture. Data: OpenFreeMap (OSM).
const STYLE = "https://tiles.openfreemap.org/styles/dark";

const DOT: Record<Exclude<Layer, "routes" | "live" | "exact">, string> = {
  visitors: "#ffffff",
  uploads: "#59b8ff",
  downloads: "#ffa045",
};

const LABEL: Record<string, [string, string]> = {
  visitors: ["device", "devices"],
  uploads: ["upload", "uploads"],
  downloads: ["download", "downloads"],
  live: ["online now", "online now"],
};

function points(list: Pt[], kind: string): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: list.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { kind, n: p.n, where: [p.city, p.cc].filter(Boolean).join(", "), lat: p.lat, lon: p.lon },
    })),
  };
}

// Great-circle path between two coordinates, densified so arcs bend correctly on the globe.
function arc(a: [number, number], b: [number, number], steps = 64): [number, number][] {
  const r = Math.PI / 180;
  const [l1, p1] = [a[0] * r, a[1] * r];
  const [l2, p2] = [b[0] * r, b[1] * r];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (d < 1e-6) return [a, b];
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    out.push([Math.atan2(y, x) / r, Math.atan2(z, Math.sqrt(x * x + y * y)) / r]);
  }
  return out;
}

/** A route as a visible curve. Between two places: the great circle, bowed to one side so routes read
 *  as arcs (and two directions don't overlap). Within the same place (an office, a home: no precise
 *  location, so both ends land on the same coordinates): a small loop that leaves the spot and comes
 *  back, so local transfers still show. */
export function route(from: [number, number], to: [number, number]): [number, number][] {
  const [ax, ay] = from;
  let bx = to[0];
  const by = to[1];
  if (bx - ax > 180) bx -= 360;
  if (ax - bx > 180) bx += 360;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 0.05) {
    // loop of ~3 km radius, rising north of the spot
    const r = 0.03;
    const out: [number, number][] = [];
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * 2 * Math.PI;
      out.push([ax + (r * Math.sin(t)) / Math.max(0.2, Math.cos((ay * Math.PI) / 180)), ay + r - r * Math.cos(t)]);
    }
    return out;
  }
  if (len > 60) return arc([ax, ay], [bx, by]);
  // short and medium hops: a quadratic curve bowed 22% of its length to the left
  const k = 0.22 * len;
  const cx = (ax + bx) / 2 - (dy / len) * k;
  const cy = (ay + by) / 2 + (dx / len) * k;
  const out: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const f = i / 40;
    const u = 1 - f;
    out.push([u * u * ax + 2 * u * f * cx + f * f * bx, u * u * ay + 2 * u * f * cy + f * f * by]);
  }
  return out;
}

// Turn every colour in the base style into a neutral gray of the same brightness.
const probe = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
function gray(c: unknown, lift = 1): unknown {
  if (typeof c !== "string" || !probe) return c;
  probe.fillStyle = "#000";
  probe.fillStyle = c;
  const v = probe.fillStyle; // normalised to #rrggbb or rgba(...)
  let r: number, g: number, b: number, a = 1;
  if (v.startsWith("#")) [r, g, b] = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  else {
    const m = v.match(/[\d.]+/g);
    if (!m) return c;
    [r, g, b] = m.slice(0, 3).map(Number);
    a = m[3] ? Number(m[3]) : 1;
  }
  const y = Math.min(255, Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * lift));
  return a < 1 ? `rgba(${y},${y},${y},${a})` : `rgb(${y},${y},${y})`;
}
const COLOR_PROPS = ["background-color", "fill-color", "fill-outline-color", "line-color", "text-color", "text-halo-color", "icon-color", "fill-extrusion-color"];

export type RouteLine = { a: number; b: number; c: number; d: number; n?: number; label?: string };

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const same = (r: RouteLine) => Math.abs(r.a - r.c) < 0.05 && Math.abs(r.b - r.d) < 0.05;

export default function Earth({ data, layers, spin, routes }: { data: Overview | null; layers: Set<Layer>; spin: boolean; /** replaces the live routes (History) */ routes?: RouteLine[] | null }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const liveMarkers = useRef<maplibregl.Marker[]>([]);
  const exactMarkers = useRef<maplibregl.Marker[]>([]);
  const centred = useRef(false);
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const latest = useRef({ data, layers, routes });
  latest.current = { data, layers, routes };

  // build the map once
  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: [10, 25],
      zoom: 2.15,
      attributionControl: { compact: true },
      maxPitch: 70,
      // load faster: no tile fade-in, a big tile cache so spinning back never refetches, and at most 2x
      // pixels on high-density screens (3x phones would fetch and draw far more for no visible gain)
      fadeDuration: 0,
      maxTileCacheSize: 600,
      pixelRatio: Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
    });
    map.current = m;

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "globe-pop", offset: 10 });

    // A tile that fails to load (slow network, a busy tile server) would leave a dark hole in the map
    // for good. Retry: reload that source a moment later, at most every 3 s, up to 20 times.
    let retries = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    m.on("error", (e) => {
      const id = (e as unknown as { sourceId?: string }).sourceId;
      if (!id || retry || retries >= 20) return;
      retry = setTimeout(() => {
        retry = undefined;
        retries++;
        try {
          (m.style as unknown as { _reloadSource?: (id: string) => void })._reloadSource?.(id);
        } catch {}
      }, 3000);
    });

    m.on("style.load", () => {
      m.setProjection({ type: "globe" });
      // neutral gray world
      for (const layer of m.getStyle().layers) {
        for (const p of COLOR_PROPS) {
          let v: unknown;
          try {
            v = m.getPaintProperty(layer.id, p);
          } catch {
            continue;
          }
          // land/park fills a touch lighter than the sea so coastlines read clearly
          const lift = p === "fill-color" && !/water|ocean|sea/.test(layer.id) ? 1.45 : 1;
          if (typeof v === "string") m.setPaintProperty(layer.id, p, gray(v, lift));
        }
      }

      const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      m.addSource("routes", { type: "geojson", data: empty, lineMetrics: true });
      m.addLayer({
        id: "routes",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round" },
        paint: {
          // busier routes are thicker
          "line-width": ["interpolate", ["linear"], ["get", "n"], 1, 2.2, 20, 4, 200, 6.5],
          "line-opacity": 0.9,
          "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, "#59b8ff", 1, "#ffa045"],
        },
      });
      // transfers within one place (same office, same city): a glowing ring sized by how many, so they
      // stay visible from space, where a loop of a few km is smaller than a pixel
      m.addSource("local", { type: "geojson", data: empty });
      m.addLayer({
        id: "local",
        type: "circle",
        source: "local",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "n"], 1, 7, 10, 11, 60, 16, 300, 22],
          "circle-color": "rgba(255,160,69,0.10)",
          "circle-stroke-color": "#ffa045",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.9,
          "circle-pitch-alignment": "viewport",
        },
      });
      const tip = (id: string, html: (p: Record<string, unknown>, e: maplibregl.MapLayerMouseEvent) => [number, number, string]) => {
        m.on("mousemove", id, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          m.getCanvas().style.cursor = "pointer";
          const [lon, lat, h] = html(f.properties as Record<string, unknown>, e);
          popup.setLngLat([lon, lat]).setHTML(h).addTo(m);
        });
        m.on("mouseleave", id, () => {
          m.getCanvas().style.cursor = "";
          popup.remove();
        });
      };
      tip("routes", (p, e) => [e.lngLat.lng, e.lngLat.lat, `<b>${p.n}</b> transfer${p.n === 1 ? "" : "s"}<br/><span>${esc(p.label) || "route"}</span>`]);
      tip("local", (p) => [Number(p.lon), Number(p.lat), `<b>${p.n}</b> transfer${p.n === 1 ? "" : "s"} in the same place<br/><span>${esc(p.label)}</span>`]);
      for (const k of Object.keys(DOT) as (keyof typeof DOT)[]) {
        m.addSource(k, { type: "geojson", data: empty });
        m.addLayer({
          id: k,
          type: "circle",
          source: k,
          paint: {
            "circle-radius": k === "visitors" ? 3.5 : 4.5, // pixels: identical at every zoom
            "circle-color": DOT[k],
            "circle-stroke-color": "#000",
            "circle-stroke-width": 1,
            "circle-pitch-alignment": "viewport", // round from every angle
          },
        });
        m.on("mouseenter", k, (e) => {
          m.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { n: number; where: string; lat: number; lon: number };
          popup
            .setLngLat([p.lon, p.lat])
            .setHTML(`<b>${p.n}</b> ${LABEL[k][p.n === 1 ? 0 : 1]}<br/><span>${esc(p.where)} · ${Number(p.lat).toFixed(2)}, ${Number(p.lon).toFixed(2)}</span>`)
            .addTo(m);
        });
        m.on("mouseleave", k, () => {
          m.getCanvas().style.cursor = "";
          popup.remove();
        });
      }
      ready.current = true;
      sync();
    });

    // slow auto-spin that pauses while you interact
    let raf = 0;
    let busy = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      busy = true;
      clearTimeout(idle);
    };
    const go = () => {
      clearTimeout(idle);
      idle = setTimeout(() => (busy = false), 4000);
    };
    m.on("mousedown", stop);
    m.on("touchstart", stop);
    m.on("wheel", stop);
    m.on("moveend", go);
    const tick = () => {
      if (spinRef.current && !busy && m.getZoom() < 4) {
        const c = m.getCenter();
        m.setCenter([c.lng + 0.04, c.lat]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      ro.disconnect();
      liveMarkers.current.forEach((mk) => mk.remove());
      exactMarkers.current.forEach((mk) => mk.remove());
      m.remove();
      map.current = null;
      ready.current = false;
    };
  }, []);

  // push data + layer visibility into the map
  const sync = () => {
    const m = map.current;
    const { data: d, layers: on, routes: hist } = latest.current;
    if (!m || !ready.current) return;
    const set = (id: string, fc: GeoJSON.FeatureCollection) => (m.getSource(id) as GeoJSONSource | undefined)?.setData(fc);
    set("visitors", points(d?.visitors ?? [], "visitors"));
    set("uploads", points((d?.points ?? []).filter((p) => p.k === "upload"), "uploads"));
    set("downloads", points((d?.points ?? []).filter((p) => p.k === "download"), "downloads"));
    const lines = (hist ?? d?.arcs ?? []) as RouteLine[];
    set("routes", {
      type: "FeatureCollection",
      features: lines.map((a) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: route([a.b, a.a], [a.d, a.c]) },
        properties: { n: a.n ?? 1, label: a.label ?? "" },
      })),
    });
    // one ring per place, adding up every same-place route there
    const rings = new Map<string, { lat: number; lon: number; n: number; label: string }>();
    for (const a of lines.filter(same)) {
      const k = `${a.a.toFixed(2)},${a.b.toFixed(2)}`;
      const r = rings.get(k) ?? { lat: a.a, lon: a.b, n: 0, label: a.label ?? "" };
      r.n += a.n ?? 1;
      rings.set(k, r);
    }
    set("local", {
      type: "FeatureCollection",
      features: [...rings.values()].map((r) => ({ type: "Feature", geometry: { type: "Point", coordinates: [r.lon, r.lat] }, properties: r })),
    });
    for (const id of ["visitors", "uploads", "downloads", "routes"] as Layer[])
      m.setLayoutProperty(id, "visibility", on.has(id) ? "visible" : "none");
    m.setLayoutProperty("local", "visibility", on.has("routes") ? "visible" : "none");

    // live users: DOM markers so they can pulse
    liveMarkers.current.forEach((mk) => mk.remove());
    liveMarkers.current = on.has("live")
      ? (d?.live ?? []).map((p) => {
          const el = document.createElement("div");
          el.className = "gdot live";
          el.dataset.tip = `${p.n} ${LABEL.live[0]} · ${[p.city, p.cc].filter(Boolean).join(", ")} · ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`;
          return new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(m);
        })
      : [];
    // devices that shared their location: their exact spot, with how precise the device says it is
    exactMarkers.current.forEach((mk) => mk.remove());
    exactMarkers.current = on.has("exact")
      ? (d?.exact ?? []).map((p) => {
          const el = document.createElement("div");
          el.className = "gdot exact";
          const ago = Math.max(0, Math.round((Date.now() - Date.parse(p.at)) / 1000));
          el.dataset.tip = [p.label || "device", [p.city, p.cc].filter(Boolean).join(", "), `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`, p.acc != null ? `±${Math.round(p.acc)} m` : "", `${ago}s ago`].filter(Boolean).join(" · ");
          return new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(m);
        })
      : [];

    // first time we have data, fly to where people are
    if (d && !centred.current) {
      const f = d.live[0] ?? d.visitors[0];
      if (f) {
        centred.current = true;
        m.flyTo({ center: [f.lon, f.lat], zoom: 3.2, duration: 1800, essential: true });
      }
    }
  };

  useEffect(sync, [data, layers, routes]);

  return <div ref={box} className="earth" />;
}
