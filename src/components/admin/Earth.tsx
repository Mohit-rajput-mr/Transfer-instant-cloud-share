"use client";
import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Overview, Pt } from "./types";

export type Layer = "live" | "visitors" | "uploads" | "downloads" | "routes";

// Vector map on a true 3D globe: roads, borders and labels are drawn by the GPU at every zoom,
// so text stays razor-sharp instead of being a stretched picture. Data: OpenFreeMap (OSM).
const STYLE = "https://tiles.openfreemap.org/styles/dark";

const DOT: Record<Exclude<Layer, "routes" | "live">, string> = {
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

export default function Earth({ data, layers, spin }: { data: Overview | null; layers: Set<Layer>; spin: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const liveMarkers = useRef<maplibregl.Marker[]>([]);
  const centred = useRef(false);
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const latest = useRef({ data, layers });
  latest.current = { data, layers };

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
    });
    map.current = m;

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "globe-pop", offset: 10 });

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
          "line-width": 1.6,
          "line-opacity": 0.9,
          "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, "#59b8ff", 1, "#ffa045"],
        },
      });
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
            "circle-pitch-alignment": "map",
          },
        });
        m.on("mouseenter", k, (e) => {
          m.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { n: number; where: string; lat: number; lon: number };
          popup
            .setLngLat([p.lon, p.lat])
            .setHTML(`<b>${p.n}</b> ${LABEL[k][p.n === 1 ? 0 : 1]}<br/><span>${p.where || ""} · ${Number(p.lat).toFixed(2)}, ${Number(p.lon).toFixed(2)}</span>`)
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
      m.remove();
      map.current = null;
      ready.current = false;
    };
  }, []);

  // push data + layer visibility into the map
  const sync = () => {
    const m = map.current;
    const { data: d, layers: on } = latest.current;
    if (!m || !ready.current) return;
    const set = (id: string, fc: GeoJSON.FeatureCollection) => (m.getSource(id) as GeoJSONSource | undefined)?.setData(fc);
    set("visitors", points(d?.visitors ?? [], "visitors"));
    set("uploads", points((d?.points ?? []).filter((p) => p.k === "upload"), "uploads"));
    set("downloads", points((d?.points ?? []).filter((p) => p.k === "download"), "downloads"));
    set("routes", {
      type: "FeatureCollection",
      features: (d?.arcs ?? []).map((a) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: arc([a.b, a.a], [a.d, a.c]) },
        properties: {},
      })),
    });
    for (const id of ["visitors", "uploads", "downloads", "routes"] as Layer[])
      m.setLayoutProperty(id, "visibility", on.has(id) ? "visible" : "none");

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

    // first time we have data, fly to where people are
    if (d && !centred.current) {
      const f = d.live[0] ?? d.visitors[0];
      if (f) {
        centred.current = true;
        m.flyTo({ center: [f.lon, f.lat], zoom: 3.2, duration: 2200, essential: true });
      }
    }
  };

  useEffect(sync, [data, layers]);

  return <div ref={box} className="earth" />;
}
