"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { Overview } from "./types";

export type Layer = "live" | "visitors" | "uploads" | "downloads" | "routes";

interface Dot {
  lat: number;
  lon: number;
  n: number;
  kind: "visitor" | "upload" | "download" | "live";
}

const COLORS: Record<Dot["kind"], string> = {
  visitor: "rgba(255,255,255,0.75)",
  upload: "#59b8ff",
  download: "#ffa045",
  live: "#3dff8c",
};

export default function Earth({ data, layers, spin }: { data: Overview | null; layers: Set<Layer>; spin: boolean }) {
  const ref = useRef<GlobeMethods | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [countries, setCountries] = useState<object[]>([]);

  useEffect(() => {
    fetch("/globe/countries.json").then((r) => r.json()).then((g) => setCountries(g.features)).catch(() => {});
  }, []);

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
  }, [spin, countries]);

  useEffect(() => {
    ref.current?.pointOfView({ lat: 20, lng: 60, altitude: 2.3 }, 0);
  }, []);

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

  const rings = useMemo(() => (data && layers.has("live") ? data.live : []), [data, layers]);
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
        hexPolygonsData={countries}
        hexPolygonResolution={3}
        hexPolygonMargin={0.62}
        hexPolygonUseDots
        hexPolygonColor={() => "rgba(255,255,255,0.28)"}
        pointsData={dots}
        pointLat={(d) => (d as Dot).lat}
        pointLng={(d) => (d as Dot).lon}
        pointColor={(d) => COLORS[(d as Dot).kind]}
        pointAltitude={(d) => 0.01 + Math.min(0.25, Math.log2((d as Dot).n + 1) * 0.03)}
        pointRadius={(d) => ((d as Dot).kind === "live" ? 0.45 : 0.28)}
        pointsMerge={false}
        pointLabel={(d) => {
          const p = d as Dot;
          return `<div class="globe-tip"><b>${p.n}</b> ${p.kind === "visitor" ? "device" + (p.n > 1 ? "s" : "") : p.kind === "live" ? "online now" : p.kind + (p.n > 1 ? "s" : "")}<br/><span>${p.lat.toFixed(1)}, ${p.lon.toFixed(1)}</span></div>`;
        }}
        ringsData={rings}
        ringLat={(d) => (d as Dot).lat}
        ringLng={(d) => (d as Dot).lon}
        ringColor={() => (t: number) => `rgba(61,255,140,${1 - t})`}
        ringMaxRadius={4}
        ringPropagationSpeed={2.2}
        ringRepeatPeriod={1100}
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
