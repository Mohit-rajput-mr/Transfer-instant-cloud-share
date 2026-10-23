"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { aliasOf, type AnonSession } from "@/lib/anon";

// The sealed container: a closed frame inside the void whose top edge carries the session clock. Green while there is
// time, orange from a third left, red for the last tenth. It always starts below the navbar (so the clock is never
// hidden under it) and, inside a space, it is drawn on the glass card itself, on the card's own edges, so the two are
// one frame instead of two overlapping ones.

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function AnonSeal({ sess }: { sess: AnonSession | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const [glass, setGlass] = useState<HTMLElement | null>(null);
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    if (!sess) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [sess]);

  // the space's glass card comes and goes with spaces
  useEffect(() => {
    const find = () => setGlass((g) => {
      const el = document.querySelector<HTMLElement>(".room-glass");
      return g === el ? g : el;
    });
    find();
    const t = setInterval(find, 500);
    return () => clearInterval(t);
  }, []);

  // outside a space: the frame's top sits just under the navbar. The navbar is fixed and the layer scrolls with the
  // page, so the frame's top is the bar's bottom minus where the layer starts on the page. The bar's bottom is the
  // lowest of its visible parts (the pill can reach below the header box), measured only while the bar is full size
  // (scrolled down it turns into a smaller pill, .compact, which must not move the frame). It is measured again for
  // the first two seconds and on every size change: one early measure (fonts, the scope row still coming in) put the
  // label under the bar on some phones and the frame far below it on others. The result is also shared as
  // --seal-top, so the "you're anonymous" plate is laid out under the label instead of on it.
  useEffect(() => {
    if (glass) return;
    let hdrBottom = 0;
    const place = () => {
      const layer = box.current?.parentElement;
      const hdr = document.querySelector<HTMLElement>(".top");
      if (!layer || !hdr) return;
      if (!hdr.classList.contains("compact")) {
        let bottom = hdr.getBoundingClientRect().bottom;
        hdr.querySelectorAll<HTMLElement>(":scope > *").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.height > 0 && getComputedStyle(el).display !== "none") bottom = Math.max(bottom, r.bottom);
        });
        hdrBottom = bottom;
      }
      if (!hdrBottom) return;
      const next = Math.round(hdrBottom - (layer.getBoundingClientRect().top + window.scrollY) + 16);
      setTop((t) => (t === next ? t : next));
      document.documentElement.style.setProperty("--seal-top", `${next}px`);
    };
    place();
    const t0 = performance.now();
    let raf = 0;
    const settle = () => {
      place();
      if (performance.now() - t0 < 2000) raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    const ro = new ResizeObserver(place);
    const hdr = document.querySelector(".top");
    if (hdr) {
      ro.observe(hdr);
      hdr.querySelectorAll(":scope > *").forEach((el) => ro.observe(el));
    }
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", place);
      document.documentElement.style.removeProperty("--seal-top");
    };
  }, [glass]);

  const total = sess ? sess.ends - sess.start : 1;
  const left = sess ? Math.max(0, sess.ends - now) : total;
  const f = left / total;
  const tone = f > 1 / 3 ? "ok" : f > 0.1 ? "warn" : "end";

  const seal = (
    <div ref={box} className={`ghost-seal tone-${tone}${glass ? " on-glass" : ""}`} style={!glass && top != null ? { top } : undefined}>
      <i className="k tl" /><i className="k tr" /><i className="k bl" /><i className="k br" />
      <span className="e t">{sess ? <><b>{aliasOf(sess.id)}</b> · burns in <b className="seal-clock">{mmss(left)}</b></> : "Sealed · no location · no identity"}</span>
      <span className="e r">Anonymous · cloud only</span>
      <span className="e btm">Sealed · no location · no identity</span>
      <span className="e l">Anonymous · cloud only</span>
    </div>
  );
  return glass ? createPortal(seal, glass) : seal;
}
