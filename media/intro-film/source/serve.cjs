// a tiny static server over media/, so the film and the films inside it share one origin
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const TYPES = { ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
module.exports = () =>
  new Promise((res) => {
    const s = http.createServer((q, r) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(q.url, "http://x").pathname));
      if (!p.startsWith(ROOT)) return r.writeHead(403).end();
      fs.readFile(p, (e, b) => (e ? r.writeHead(404).end() : r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }).end(b)));
    });
    s.listen(0, () => res({ url: `http://localhost:${s.address().port}/intro-film/source/video.html`, close: () => s.close() }));
  });
