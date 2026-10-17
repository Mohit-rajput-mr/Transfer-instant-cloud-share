// Renders film.html frame by frame (headless Chromium, WebGL on SwiftShader):
//   node render.cjs <fromFrame> <toFrame> <outDir>     or     node render.cjs still 1.5,12 <outDir>
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const FPS = 30, DIR = __dirname;
const TYPES = { ".js": "text/javascript", ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
(async () => {
  const [, , a = "0", b = "", outDir = path.join(DIR, "frames")] = process.argv;
  fs.mkdirSync(outDir, { recursive: true });
  const srv = http.createServer((q, res) => { const f = path.join(DIR, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }).listen(0);
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console", m.text()));
  await page.goto(`http://localhost:${port}/film.html`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  const dur = await page.evaluate(() => window.DURATION);
  const frames = a === "still" ? b.split(",").map((s) => Math.round(+s * FPS)) : Array.from({ length: Math.min(Math.round(dur * FPS), +b || Infinity) - +a }, (_, i) => +a + i);
  const t0 = Date.now();
  for (const f of frames.filter((f) => !fs.existsSync(path.join(outDir, `${String(f).padStart(5, "0")}.png`)))) {
    await page.evaluate((t) => window.render(t), f / FPS);
    await page.screenshot({ path: path.join(outDir, `${String(f).padStart(5, "0")}.png`) });
  }
  console.log("frames", frames.length, "in", ((Date.now() - t0) / 1000).toFixed(0), "s");
  await browser.close(); srv.close();
})();
