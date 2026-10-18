"use client";
import { useEffect, useRef, useState } from "react";
import { aliasOf, type AnonSession } from "@/lib/anon";

// The sealed container's edge, drawn as a ring of dots that is the session's clock: every dot is a slice of the time
// picked (5 to 30 minutes), and they go out one after another, running back round to the top, until the identity burns.
// A 5-minute session spends the same ring faster (several dots a second), a 30-minute one slower. Green while there
// is time, orange from a third left, red for the last tenth.

const GAP = 12; // px between dots

function ring(w: number, h: number, r: number): [number, number][] {
  // a rounded rectangle walked clockwise from the top middle, a point every GAP px
  const straightW = Math.max(0, w - 2 * r), straightH = Math.max(0, h - 2 * r), arc = (Math.PI / 2) * r;
  const total = 2 * straightW + 2 * straightH + 4 * arc;
  const n = Math.max(24, Math.floor(total / GAP));
  const at = (d: number): [number, number] => {
    d = (d + w / 2 - r) % total; // start at the top middle
    const seg: [number, (t: number) => [number, number]][] = [
      [straightW, (t) => [r + t, 0]],
      [arc, (t) => { const a = -Math.PI / 2 + (t / r); return [w - r + r * Math.cos(a), r + r * Math.sin(a)]; }],
      [straightH, (t) => [w, r + t]],
      [arc, (t) => { const a = t / r; return [w - r + r * Math.cos(a), h - r + r * Math.sin(a)]; }],
      [straightW, (t) => [w - r - t, h]],
      [arc, (t) => { const a = Math.PI / 2 + t / r; return [r + r * Math.cos(a), h - r + r * Math.sin(a)]; }],
      [straightH, (t) => [0, h - r - t]],
      [arc, (t) => { const a = Math.PI + t / r; return [r + r * Math.cos(a), r + r * Math.sin(a)]; }],
    ];
    for (const [len, f] of seg) {
      if (d <= len) return f(d);
      d -= len;
    }
    return [w / 2, 0];
  };
  return Array.from({ length: n }, (_, i) => at((i * total) / n));
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function AnonSeal({ sess }: { sess: AnonSession | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el);
    setSize([el.clientWidth, el.clientHeight]);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!sess) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [sess]);

  const [w, h] = size;
  const r = w < 500 ? 16 : 22;
  const pts = w && h ? ring(w, h, r) : [];
  const total = sess ? sess.ends - sess.start : 1;
  const left = sess ? Math.max(0, sess.ends - now) : total;
  const f = left / total;
  const lit = f * pts.length; // dots still on (the last one fades as its slice runs out)
  const tone = f > 1 / 3 ? "ok" : f > 0.1 ? "warn" : "end";

  return (
    <div ref={box} className={`ghost-seal tone-${tone}`}>
      <svg className="seal-dots" width={w} height={h} aria-hidden>
        {pts.map(([x, y], i) => {
          const on = i < lit;
          const fade = on && i + 1 > lit ? lit - i : 1;
          return <circle key={i} cx={x} cy={y} r={on ? 2.1 : 1.2} className={on ? "on" : "off"} style={on && fade < 1 ? { opacity: 0.25 + 0.75 * fade } : undefined} />;
        })}
      </svg>
      <i className="k tl" /><i className="k tr" /><i className="k bl" /><i className="k br" />
      <span className="e t">{sess ? <><b>{aliasOf(sess.id)}</b> · burns in <b className="seal-clock">{mmss(left)}</b></> : "Sealed · no location · no identity"}</span>
      <span className="e r">Anonymous · cloud only</span>
      <span className="e btm">Sealed · no location · no identity</span>
      <span className="e l">Anonymous · cloud only</span>
    </div>
  );
}
