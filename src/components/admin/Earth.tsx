"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { Overview } from "./types";

export type Layer = "live" | "visitors" | "uploads" | "downloads" | "routes";

interface Dot {
  lat: number;
  lon: number;
  n: number;
  city?: string | null;
  cc?: string | null;
  kind: "visitor" | "upload" | "download" | "live";
}

const LABEL: Record<Dot["kind"], [string, string]> = {
  visitor: ["device", "devices"],
  upload: ["upload", "uploads"],
  download: ["download", "downloads"],
  live: ["online now", "online now"],
};

// Markers are plain DOM nodes pinned to lat/lng, so they keep the same pixel size at any zoom
// and sit exactly on their coordinate instead of growing like 3D geometry.
function marker(d: object) {
  const p = d as Dot;
  const el = document.createElement("div");
  el.className = `gdot ${p.kind}`;
  const where = [p.city, p.cc].filter(Boolean).join(", ") || `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`;
  el.dataset.tip = `${p.n} ${LABEL[p.kind][p.n === 1 ? 0 : 1]} · ${where} · ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`;
  return el;
}

export default function Earth({ data, layers, spin }: { data: Overview | null; layers: Set<Layer>; spin: boolean }) {
  const ref = useRef<GlobeMethods | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = spin;
    c.autoRotateSpeed = 0.45;
    c.enableDamping = true;
    c.minDistance = 120;
    c.maxDistance = 600;
  }, [spin]);

  // open centred on the action: newest live user, else the busiest visitor spot
  const centred = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    if (!data) {
      ref.current.pointOfView({ lat: 20, lng: 20, altitude: 2.3 }, 0);
      return;
    }
    if (centred.current) return;
    const focus = data.live[0] ?? data.visitors[0];
    if (focus) {
      centred.current = true;
      ref.current.pointOfView({ lat: focus.lat, lng: focus.lon, altitude: 1.9 }, 1600);
    }
  }, [data]);

  const dots = useMemo<Dot[]>(() => {
    if (!data) return [];
    const out: Dot[] = [];
    if (layers.has("visitors")) for (const p of data.visitors) out.push({ ...p, kind: "visitor" });
    for (const p of data.points) {
      if (p.k === "upload" && layers.has("uploads")) out.push({ ...p, kind: "upload" });
      if (p.k === "download" && layers.has("downloads")) out.push({ ...p, kind: "download" });
    }
    if (layers.has("live")) for (const p of data.live) out.push({ ...p, kind: "live" });
    return out;
  }, [data, layers]);

  const arcs = useMemo(() => (data && layers.has("routes") ? data.arcs : []), [data, layers]);

  return (
    <div ref={box} className="earth">
      <Globe
        ref={ref}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="/globe/earth-night.jpg"
        showAtmosphere
        atmosphereColor="#7fb4ff"
        atmosphereAltitude={0.16}
        htmlElementsData={dots}
        htmlLat={(d) => (d as Dot).lat}
        htmlLng={(d) => (d as Dot).lon}
        htmlAltitude={0.005}
        htmlElement={marker}
        htmlTransitionDuration={0}
        arcsData={arcs}
        arcStartLat={(d) => (d as Overview["arcs"][number]).a}
        arcStartLng={(d) => (d as Overview["arcs"][number]).b}
        arcEndLat={(d) => (d as Overview["arcs"][number]).c}
        arcEndLng={(d) => (d as Overview["arcs"][number]).d}
        arcColor={() => ["rgba(89,184,255,0.9)", "rgba(255,160,69,0.9)"]}
        arcStroke={0.45}
        arcDashLength={0.45}
        arcDashGap={0.25}
        arcDashAnimateTime={1800}
        arcAltitudeAutoScale={0.4}
      />
    </div>
  );
}
