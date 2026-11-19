// node kit/cap_live.cjs <outDir> : live orbitransfer.com captures for the Orbi ads (phone 390×844 @2x, laptop 1440×900 @2x)
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const out = process.argv[2] || "shots";
(async () => {
  const b = await chromium.launch();
  for (const [dev, vp, mobile] of [["phone", { width: 390, height: 844 }, true], ["laptop", { width: 1440, height: 900 }, false]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    await p.goto("https://orbitransfer.com/", { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log(dev, e.message));
    await p.waitForTimeout(3000); await p.getByText(/^not now$/i).first().click({ timeout: 5000 }).catch(() => console.log("no modal")); await p.waitForTimeout(2000);
    await p.screenshot({ path: `${out}/${dev}.png` });
    await p.getByRole("button", { name: /wi-?fi/i }).first().click({ timeout: 5000 }).catch((e) => console.log("no wifi tab", e.message.slice(0, 80)));
    await p.waitForTimeout(2500); await p.screenshot({ path: `${out}/${dev}-wifi.png` });
    await p.goto("https://orbitransfer.com/", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(2500); await p.getByText(/^not now$/i).first().click({ timeout: 4000 }).catch(() => {});
    await p.locator(".anon-chip").first().click({ timeout: 5000 }).catch((e) => console.log("no anon chip", e.message.slice(0, 80)));
    await p.waitForTimeout(2000); await p.screenshot({ path: `${out}/${dev}-anon.png` });
    await p.getByText(/^create a space$/i).first().click({ timeout: 5000 }).catch((e) => console.log("no create", e.message.slice(0, 80)));
    await p.waitForTimeout(1200); await p.keyboard.type("orbit-safe-42"); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${dev}-anoncreate.png` });
    console.log(dev, "ok"); await p.close();
  }
  await b.close();
})();
