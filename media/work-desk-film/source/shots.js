// The edit: which recording plays when (frames spread over a time window), where the camera looks
// (a point on the screen 0..1 and a zoom), and the section chip + title over the laptop.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
// camera keys: [time, fx, fy, zoom]; eased between keys
const cam = (t, keys) => {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const [t1, ...b] = keys[i], [t0, ...a] = keys[i - 1];
    if (t <= t1) { const k = ease((t - t0) / (t1 - t0)); return a.map((v, j) => lerp(v, b[j], k)); }
  }
  return keys[keys.length - 1].slice(1);
};

export default function SHOTS(t, { at, end, fr }) {
  const seg = [
    // [from, to, clip, frame k from, frame k to, chip number, chip label, title, camera keys]
    [end("hook") + 0.1, at("space"), "space", 0, 0, "", "Orbi Work", "One board for<br>your <em>whole team</em>", [[at("open"), 0.5, 0.5, 1], [at("space"), 0.5, 0.45, 1.12]]],
    [at("space"), at("task"), "space", 0, 1, "01", "Private space", "A room only<br>your <em>team</em> enters", [[at("space"), 0.5, 0.45, 1.12], [at("space") + 0.9, 0.5, 0.47, 2.0], [at("task") - 0.8, 0.5, 0.47, 2.0], [at("task"), 0.3, 0.12, 1.6]]],
    [at("task"), fr("task", 0.9), "task", 0, 1, "02", "Name the task", "<em>Richard's</em> task", [[at("task"), 0.2, 0.18, 1.9], [at("task") + 0.7, 0.17, 0.17, 2.5], [fr("task", 0.9), 0.17, 0.17, 2.4]]],
    [fr("task", 0.9), at("route"), "upload", 0, 1, "03", "Submit · upload into it", "Files go <em>straight in</em>", [[fr("task", 0.9), 0.15, 0.2, 2.2], [fr("task", 0.9) + 1.0, 0.5, 0.55, 1.7], [at("submit") + 1.6, 0.5, 0.55, 1.7], [at("route"), 0.5, 0.58, 1.35]]],
    [at("route"), at("move"), "route", 0, 1, "04", "Route · your colours", "Every step,<br><em>your colour</em>", [[at("route"), 0.5, 0.58, 1.35], [at("route") + 1.2, 0.47, 0.6, 2.3], [at("color"), 0.47, 0.6, 2.4], [at("move") - 0.4, 0.5, 0.62, 2.5]]],
    [at("move"), at("arrange"), "move", 0.06, 1, "05", "Live for everyone", "Click · it <em>moves</em>", [[at("move"), 0.5, 0.6, 2.4], [at("arrange") - 0.6, 0.5, 0.55, 1.9], [at("arrange"), 0.5, 0.5, 1.2]]],
    [at("arrange"), at("cancel"), "arrange", 0, 1, "06", "Arrange", "Wires <em>dead straight</em>", [[at("arrange"), 0.5, 0.5, 1.15], [at("arrange") + 1.6, 0.5, 0.5, 1.15], [at("arrange") + 3.0, 0.4, 0.3, 1.75], [at("cancel"), 0.4, 0.3, 1.8]]],
    [at("cancel"), at("lock"), "cancel", 0.08, 1, "07", "Cancel", "It turns <em>red</em>", [[at("cancel"), 0.3, 0.45, 1.6], [at("cancel") + 0.8, 0.25, 0.6, 2.2], [at("lock") - 0.6, 0.25, 0.5, 2.1], [at("lock"), 0.3, 0.4, 1.6]]],
    [at("lock"), at("end") + 0.5, "cancel", 1, 1, "08", "Locked · then burns", "Encrypted in<br><em>your browser</em>", [[at("lock"), 0.3, 0.4, 1.6], [at("end"), 0.5, 0.5, 1.0]]],
  ];
  const s = seg.find((x) => t >= x[0] && t < x[1]);
  if (!s) return null;
  const [a, b, clip, k0, k1, n, label, title, keys] = s;
  const k = lerp(k0, k1, clamp((t - a) / Math.max(0.01, b - a - 0.4)));
  const [fx, fy, z] = cam(t, keys);
  const inA = clamp((t - a) / 0.35), outA = clamp((b - t) / 0.3);
  return { clip, k, fx, fy, z, n, label, title, chipA: n ? inA * outA : clamp((t - a) / 0.4) * outA, titleA: inA * outA };
}
