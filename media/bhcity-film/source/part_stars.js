const starTex = H.canvasTex(4096, 2048, (g, w, h) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, w, h); H.reseed(11);
  const band = (x) => h * 0.5 + Math.sin((x / w) * TAU + 0.6) * h * 0.28; // the galactic plane across the sphere
  for (let i = 0; i < 2600; i++) { // the Milky Way glow: soft overlapping clouds along the band, with dark dust lanes
    const x = H.rnd() * w, y = band(x) + (H.rnd() + H.rnd() + H.rnd() - 1.5) * h * 0.07, r = 20 + H.rnd() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); const a = 0.035 + H.rnd() * 0.04; const warm = H.rnd() < 0.5;
    gr.addColorStop(0, warm ? `rgba(255,236,210,${a})` : `rgba(205,220,255,${a})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 900; i++) { const x = H.rnd() * w, y = band(x) + (H.rnd() - 0.5) * h * 0.035, r = 10 + H.rnd() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(0,0,0,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 26000; i++) { // stars: many faint, few bright, denser in the band, colour by temperature
    let x = H.rnd() * w, y = H.rnd() * h; if (H.rnd() < 0.45) y = band(x) + (H.rnd() + H.rnd() - 1) * h * 0.1;
    const m = Math.pow(H.rnd(), 7); const r = 0.45 + m * 2.4, a = 0.25 + Math.min(0.75, m * 3 + H.rnd() * 0.3);
    const c = ["255,244,232", "214,226,255", "255,226,190", "255,255,255", "190,210,255"][Math.floor(H.rnd() * 5)];
    g.fillStyle = `rgba(${c},${a})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (m > 0.35) { const gr = g.createRadialGradient(x, y, 0, x, y, r * 5); gr.addColorStop(0, `rgba(${c},0.35)`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r * 5, y - r * 5, r * 10, r * 10); }
  }
});
const STARS = new THREE.Mesh(new THREE.SphereGeometry(9000, 64, 32), new THREE.MeshBasicMaterial({ map: starTex, side: THREE.BackSide, transparent: true, opacity: 1, depthWrite: false, toneMapped: false, fog: false, color: 0xffffff }));
STARS.renderOrder = -2; STARS.rotation.set(0.5, 0.2, 0.9); scene.add(STARS);
