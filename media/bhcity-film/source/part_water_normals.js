const waterNormals = (() => {
  const N = 256, hgt = new Float32Array(N * N); H.reseed(5);
  const waves = Array.from({ length: 28 }, () => ({ kx: Math.round((H.rnd() - 0.5) * 16), ky: Math.round((H.rnd() - 0.5) * 16), ph: H.rnd() * TAU, a: 0.4 + H.rnd() }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const q of waves) { const k = Math.hypot(q.kx, q.ky) || 1; v += (q.a / k) * Math.sin(((q.kx * x + q.ky * y) / N) * TAU + q.ph); } hgt[y * N + x] = v; }
  const c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x + N - 1) % N)], dy = hgt[((y + 1) % N) * N + x] - hgt[((y + N - 1) % N) * N + x];
    const n = V(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * N + x) * 4;
    im.data[i] = (n.x * 0.5 + 0.5) * 255; im.data[i + 1] = (n.y * 0.5 + 0.5) * 255; im.data[i + 2] = (n.z * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
