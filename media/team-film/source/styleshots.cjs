// screenshots of the Style picker and styles (dev aid): node styleshots.cjs <outDir> skin,skin…
const L = require("./lib.cjs");
const OUT = process.argv[2];
const skins = (process.argv[3] || "orbit,file,card,chart").split(",");
const ITEMS = [
  L.mkOrb("pb01", "Pitch deck", "Pitch deck.pdf", "application/pdf", 12.4e6, 32, 18, { views: 2 }),
  L.mkOrb("pb02", "Final mix", "Final mix.wav", "audio/wav", 52e6, 95, 9),
  L.mkOrb("pb03", "Contract", "Contract.docx", "application/msword", 0.3e6, 280, 22, { views: 3 }),
  L.mkOrb("pb07", "Launch video", "Launch video.mp4", "video/mp4", 88e6, 330, 21),
  L.mkOrb("pb04", "Lunch menu", "Lunch menu.pdf", "application/pdf", 0.8e6, 150, 25, { downloads: 2 }),
  L.mkOrb("pb05", "Trip photos", "Trip photos.zip", "application/zip", 148e6, 330, 14),
  L.mkOrb("pb06", "Floor plan", "Floor plan.png", "image/png", 6e6, 190, 27, { watchers: 1 }),
];
(async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  for (const sk of skins) {
    const phone = sk.startsWith("phone:");
    const [id, pal] = sk.replace("phone:", "").replace("picker:", "").split("@");
    const opts = phone ? { ...L.devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
    const { page, ctx } = await L.open(b, opts, { items: [...ITEMS], init: async (p) => p.addInitScript(([s, c]) => { localStorage.setItem("orbit:skin", s); if (c) localStorage.setItem("orbit:pal", c); }, [id, pal]) });
    await L.step(page, 1200, 100);
    if (sk.startsWith("picker:")) {
      await page.click(".style-chip");
      await L.step(page, 900, 100);
    }
    await page.screenshot({ path: `${OUT}/${sk.replace(":", "-").replace("@", "-")}.png` });
    await ctx.close();
  }
  await b.close();
})();
