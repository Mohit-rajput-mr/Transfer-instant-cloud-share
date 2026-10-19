// Slow-network check before a big release: uploads a test file through the real page on a throttled line
// (default 10 Mbit/s up, 40 Mbit/s down, 80 ms) and prints what the gentle-upload watch did and how long a small
// page request takes while the upload runs (should stay usable).
//   node scripts/slow-net-test.cjs [url=https://orbitransfer.com] [sizeMB=24] [upMbit=10]
// The test object is named "zz-slow-net-test" and lives 5 minutes; burn it from HQ → Void if needed.
const { chromium } = require(process.env.PW || "/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
(async () => {
  const [url = "https://orbitransfer.com", mb = "24", up = "10"] = process.argv.slice(2);
  const file = path.join(os.tmpdir(), "zz-slow-net-test.bin");
  fs.writeFileSync(file, crypto.randomBytes(+mb * 1024 * 1024));
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 80, uploadThroughput: (+up * 1e6) / 8, downloadThroughput: (40 * 1e6) / 8 });
  p.on("console", (m) => /orbi:/.test(m.text()) && console.log(`[${new Date().toISOString().slice(11, 19)}]`, m.text()));
  await p.goto(url, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  await (await p.$$("input[type=file]"))[0].setInputFiles(file);
  await p.waitForTimeout(2500);
  await p.locator("button", { hasText: /^More options/ }).first().click().catch(() => {});
  await p.locator("button.chip", { hasText: /^5m$/ }).first().click().catch(() => {});
  await p.locator("button", { hasText: /^Send/ }).last().click();
  const t0 = Date.now();
  // while it uploads: how long does a small request take?
  for (let i = 0; i < 20; i++) {
    await p.waitForTimeout(3000);
    const ms = await p.evaluate(async () => { const t = performance.now(); await fetch(`/api/version?x=${Date.now()}`, { cache: "no-store" }); return Math.round(performance.now() - t); });
    const dock = await p.locator(".dock-cloud").first().textContent().catch(() => "");
    console.log(`t+${Math.round((Date.now() - t0) / 1000)}s  page request ${ms} ms  ${dock?.trim() || ""}`);
  }
  await b.close();
})();
