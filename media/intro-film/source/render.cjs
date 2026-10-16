// Renders video.html frame by frame: node render.cjs <from> <to> <outDir>   (or: node render.cjs still 12.5,30 <outDir>)
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const path = require("path");
const FPS = 30;
(async () => {
  const [, , a = "0", b = "", outDir = path.join(__dirname, "frames")] = process.argv;
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await require("./serve.cjs")();
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(srv.url);
  await page.evaluate(async (m) => { window.setMarks(m); await window.ready; }, require("./marks.cjs")());
  const dur = await page.evaluate(() => window.DURATION);
  const times = a === "still" ? b.split(",").map(Number) : null;
  const frames = times ? times.map((t) => Math.round(t * FPS)) : Array.from({ length: Math.min(Math.round(dur * FPS), +b || Infinity) - +a }, (_, i) => +a + i);
  const t0 = Date.now();
  for (const f of frames) {
    await page.evaluate((t) => window.render(t), f / FPS);
    await page.screenshot({ path: path.join(outDir, `${String(f).padStart(5, "0")}.png`) });
  }
  console.log("frames", frames.length, "in", ((Date.now() - t0) / 1000).toFixed(0), "s");
  await browser.close();
  srv.close();
})();
