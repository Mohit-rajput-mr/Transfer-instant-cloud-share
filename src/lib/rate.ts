// Transfer speed and time left, smoothed over the last few seconds so the numbers don't jump.
import { formatBytes } from "./client";

export class Meter {
  private pts: { t: number; b: number }[] = [];
  constructor(private total: number) {}
  /** Record `done` bytes so far; returns bytes per second (0 until there is enough to say). */
  tick(done: number) {
    const t = performance.now();
    const last = this.pts[this.pts.length - 1];
    if (last && done < last.b) this.pts = [];
    this.pts.push({ t, b: done });
    while (this.pts.length > 2 && t - this.pts[0].t > 5000) this.pts.shift();
    const a = this.pts[0];
    return t - a.t > 700 ? ((done - a.b) * 1000) / (t - a.t) : 0;
  }
  /** "18 MB/s · 0:37 left" (empty while unknown) */
  label(done: number) {
    const bps = this.tick(done);
    if (!bps) return "";
    const s = Math.max(0, Math.round((this.total - done) / bps));
    const left = s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    return `${formatBytes(bps)}/s · ${left} left`;
  }
}
