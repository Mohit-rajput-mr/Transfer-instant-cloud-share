"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LuHouse, LuLock, LuMapPin, LuX } from "react-icons/lu";
import { areaOf, cellCenter, validArea } from "@/lib/area";
import { isLow } from "@/lib/perf";

// The Earth: everything live in the public void, worldwide, one dot per area (counts merge into bigger dots as you
// zoom out). Drawn by the GPU (MapLibre, free OpenFreeMap tiles), so a million things cost the same as ten: only the
// per-area counts are fetched. Zoom into a place (or tap its dot) and you land in that area's map.
const STYLE = "https://tiles.openfreemap.org/styles/dark";
// this close in, you are looking at one area: open it
const ENTER_ZOOM = 9.4;

type Cell = { a: string; f: number; b: number; t: number };

function features(cells: Cell[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cells.filter((c) => validArea(c.a)).map((c) => {
      const p = cellCenter(c.a);
      return { type: "Feature", geometry: { type: "Point", coordinates: [p.lon, p.lat] }, properties: { a: c.a, n: c.f + c.b + c.t, f: c.f, b: c.b, t: c.t } };
    }),
  };
}

export default function EarthView(props: { home: string; from: string; gps: boolean; onEnter: (cell: string) => void; onLocate: () => void; onSpace: () => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [sum, setSum] = useState({ areas: 0, f: 0, b: 0, t: 0 });
  const [loading, setLoading] = useState(true);
  const act = useRef(props);
  act.current = props;

  useEffect(() => {
    if (!box.current) return;
    const start = validArea(act.current.from) ? cellCenter(act.current.from) : validArea(act.current.home) ? cellCenter(act.current.home) : { lat: 20, lon: 10 };
    const low = isLow();
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: [start.lon, start.lat],
      zoom: 8.6,
      attributionControl: { compact: true },
      fadeDuration: 0,
      maxTileCacheSize: low ? 200 : 600,
      // a low-end device draws at 1x (a quarter of the pixels on a 2x screen)
      pixelRatio: low ? 1 : Math.min(2, window.devicePixelRatio || 1),
      canvasContextAttributes: { antialias: !low },
    });
    map.current = m;
    let entered = false;
    const enter = (cell: string) => {
      if (entered || !validArea(cell)) return;
      entered = true;
      act.current.onEnter(cell);
    };

    const load = async () => {
      const r = await fetch("/api/world").catch(() => null);
      const d = r?.ok ? ((await r.json()) as { cells: Cell[] }) : { cells: [] };
      const cells = d.cells ?? [];
      setSum({ areas: cells.length, f: cells.reduce((a, c) => a + c.f, 0), b: cells.reduce((a, c) => a + c.b, 0), t: cells.reduce((a, c) => a + c.t, 0) });
      (m.getSource("cells") as GeoJSONSource | undefined)?.setData(features(cells));
    };

    m.on("style.load", () => {
      m.setProjection({ type: "globe" });
      m.addSource("cells", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 8,
        clusterProperties: { n: ["+", ["get", "n"]] },
      });
      m.addLayer({
        id: "glow",
        type: "circle",
        source: "cells",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "n"], 1, 14, 50, 26, 1000, 44, 100000, 70],
          "circle-color": "#3dff8c",
          "circle-opacity": 0.12,
          "circle-blur": 0.6,
          "circle-pitch-alignment": "viewport",
        },
      });
      m.addLayer({
        id: "dots",
        type: "circle",
        source: "cells",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "n"], 1, 7, 50, 13, 1000, 22, 100000, 34],
          "circle-color": "#0e2a1a",
          "circle-stroke-color": "#3dff8c",
          "circle-stroke-width": 2,
          "circle-pitch-alignment": "viewport",
        },
      });
      m.addLayer({
        id: "counts",
        type: "symbol",
        source: "cells",
        layout: {
          "text-field": ["case", [">=", ["get", "n"], 1000], ["concat", ["to-string", ["round", ["/", ["get", "n"], 1000]]], "k"], ["to-string", ["get", "n"]]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#eafff2" },
      });
      for (const id of ["dots", "counts"]) {
        m.on("mouseenter", id, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", id, () => (m.getCanvas().style.cursor = ""));
        m.on("click", id, async (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const at = (f.geometry as GeoJSON.Point).coordinates as [number, number];
          const cluster = f.properties?.cluster_id;
          if (cluster != null) {
            const z = await (m.getSource("cells") as GeoJSONSource).getClusterExpansionZoom(cluster).catch(() => m.getZoom() + 2);
            return m.easeTo({ center: at, zoom: Math.min(z + 0.5, ENTER_ZOOM - 0.4), duration: 700 });
          }
          // one area: fly down into it
          m.flyTo({ center: at, zoom: ENTER_ZOOM + 0.3, duration: 1100 });
          m.once("moveend", () => enter(String(f.properties?.a ?? "")));
        });
      }
      load().finally(() => setLoading(false));
      // from your area up into space
      m.easeTo({ zoom: 2, duration: low ? 700 : 1600 });
    });
    // zoomed right into a place: that area opens
    m.on("zoomend", () => {
      if (m.getZoom() < ENTER_ZOOM) return;
      const c = m.getCenter();
      enter(areaOf(c.lat, c.lng));
    });
    const t = setInterval(() => document.visibilityState === "visible" && load(), 30_000);

    // home: a pulsing pin
    let pin: maplibregl.Marker | null = null;
    if (validArea(act.current.home)) {
      const el = document.createElement("div");
      el.className = "earth-home";
      el.title = "Your area";
      const p = cellCenter(act.current.home);
      pin = new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(m);
    }
    const esc = (e: KeyboardEvent) => e.key === "Escape" && act.current.onClose();
    window.addEventListener("keydown", esc);
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", esc);
      pin?.remove();
      m.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="earth-view">
      <div ref={box} className="earth-map" />
      <div className="earth-bar lg" data-no-pan>
        <b className="wide">Earth</b>
        <span className="mono dim">
          {loading ? "Looking around…" : sum.areas ? `${sum.areas} ${sum.areas > 1 ? "places" : "place"} live · ${sum.f} files · ${sum.b} bubbles · ${sum.t} tasks` : "Nothing live anywhere right now"}
        </span>
        {validArea(props.home) && (
          <button className="pill lg-press" onClick={() => props.onEnter(props.home)}><LuHouse aria-hidden /> My area</button>
        )}
        <button className="dock-x lg-press" onClick={props.onClose} aria-label="Back"><LuX /></button>
      </div>
      {!props.gps && (
        <div className="earth-ask lg" data-no-pan>
          <span>See what&apos;s right around you</span>
          <button className="pill solid lg-press" onClick={props.onLocate}><LuMapPin aria-hidden /> Share location</button>
          <button className="pill lg-press" onClick={props.onSpace}><LuLock aria-hidden /> Create your space</button>
        </div>
      )}
      <p className="earth-hint mono">Drag to turn · scroll or pinch to zoom · tap a dot to land there</p>
    </div>
  );
}
