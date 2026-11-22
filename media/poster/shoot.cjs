// node shoot.cjs → orbi-poster-16x9.png (1920×1080 @2x) + orbi-poster-4x5.png (1080×1350 @2x)
const { chromium } = require("/opt/node22/lib/node_modules/playwright"); const path = require("path");
(async () => { const b = await chromium.launch();
  for (const [name, vp, hash] of [["orbi-poster-16x9.png", { width: 1920, height: 1080 }, ""], ["orbi-poster-4x5.png", { width: 1080, height: 1350 }, "#port"]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 }); await p.goto("file://" + path.join(__dirname, "poster.html") + hash); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
    await p.screenshot({ path: name }); await p.close(); }
  await b.close(); })();
