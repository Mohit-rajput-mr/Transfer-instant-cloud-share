// Renders video.html frame by frame: node render.cjs <fromFrame> <toFrame> <outDir>   (or: node render.cjs still 1.5,12 <outDir>)
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), path = require("path");
const FPS = 30, DIR = __dirname;
(async () => {
  const [, , a = "0", b = "", outDir = path.join(DIR, "frames")] = process.argv;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto("file://" + path.join(DIR, "video.html"));
  await page.evaluate(async (l) => { window.setLines(l); await window.ready; }, JSON.parse(fs.readFileSync(path.join(DIR, "vo/lines.json"), "utf8")).lines);
  const dur = await page.evaluate(() => window.DURATION);
  const frames = a === "still" ? b.split(",").map((s) => Math.round(+s * FPS)) : Array.from({ length: Math.min(Math.round(dur * FPS), +b || Infinity) - +a }, (_, i) => +a + i);
  const t0 = Date.now();
  for (const f of frames) {
    await page.evaluate((t) => window.render(t), f / FPS);
    await page.screenshot({ path: path.join(outDir, `${String(f).padStart(5, "0")}.png`) });
  }
  console.log("frames", frames.length, "in", ((Date.now() - t0) / 1000).toFixed(0), "s");
  await browser.close();
})();
