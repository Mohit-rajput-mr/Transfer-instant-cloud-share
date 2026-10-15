// phone screenshots of the mobile layout (dev aid): node phoneshots.cjs <outDir>
const L = require("./lib.cjs");
const OUT = process.argv[2];
const G = (i, n, f, mime, size, hue, w = 0) => L.mkOrb("gm0" + i, n, f, mime, size, hue, 25, { from: "abcdef1234", groupName: "HGBN", skin: "blocky", watchers: w, views: 1 });
const ITEMS = [
  G(1, "3ED2FC33", "3ED2FC33.jpg", "image/jpeg", 1.8e6, 280, 1), G(2, "IMG_4620", "IMG_4620.png", "image/png", 0.57e6, 260), G(3, "Higgsfield", "Higgsfield.mp4", "video/mp4", 15e6, 330),
  G(4, "IMG_4611", "IMG_4611.jpg", "image/jpeg", 2.3e6, 200), G(5, "IMG_4612", "IMG_4612.jpg", "image/jpeg", 0.4e6, 50), G(6, "IMG_4613", "IMG_4613.jpg", "image/jpeg", 2.4e6, 310), G(7, "IMG_4608", "IMG_4608.jpg", "image/jpeg", 1.9e6, 270),
  L.mkOrb("s1", "Pitch deck", "Pitch deck.pdf", "application/pdf", 12e6, 32, 18, { skin: "gold", watchers: 1 }),
  L.mkOrb("s2", "Contract", "Contract.docx", "application/msword", 0.3e6, 210, 22, {}),
];
(async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  const opts = { ...L.devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
  const { page } = await L.open(b, opts, { items: [...ITEMS], init: async (p) => p.addInitScript(() => localStorage.setItem("orbit:skin", "file")) });
  await L.step(page, 1500, 100);
  const shot = async (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  await shot("1-void");
  await page.click(".m-ic[aria-label='Menu']"); await L.step(page, 800, 100); await shot("2-menu");
  await page.keyboard.press("Escape"); await L.step(page, 600, 100);
  await page.locator(".orb.group").first().click({ force: true }); await L.step(page, 1200, 100); await shot("3-zoom");
  await page.locator(".zball").first().click({ force: true }); await L.step(page, 1200, 100); await shot("4-card");
  await page.keyboard.press("Escape"); await L.step(page, 600, 100);
  await page.keyboard.press("Escape"); await L.step(page, 600, 100);
  await page.click(".m-ic[aria-label='Menu']"); await L.step(page, 600, 100);
  await page.locator(".m-tile", { hasText: "Style" }).click(); await L.step(page, 1000, 100); await shot("5-style");
  await b.close();
})();
