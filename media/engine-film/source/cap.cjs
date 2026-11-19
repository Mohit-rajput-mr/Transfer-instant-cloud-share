const { chromium } = require("/opt/node22/lib/node_modules/playwright");
(async () => {
  const b = await chromium.launch();
  for (const [name, url, vp, mobile] of [["phone", "https://orbitransfer.com/", { width: 390, height: 844 }, true], ["laptop", "https://orbitransfer.com/", { width: 1440, height: 900 }, false], ["work", "https://orbitransfer.com/work", { width: 1440, height: 900 }, false], ["phonework", "https://orbitransfer.com/work", { width: 390, height: 844 }, true]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    await p.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(e => console.log(name, e.message));
    await p.waitForTimeout(3000); await p.getByText(/^not now$/i).first().click({ timeout: 5000 }).catch(() => console.log("no modal")); await p.waitForTimeout(2500);
    await p.screenshot({ path: `shots/${name}.png` }); console.log(name); await p.close();
  }
  await b.close();
})();
