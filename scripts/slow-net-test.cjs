// Slow-network check before a big release: uploads a test file through the real page on a throttled line
// (default 10 Mbit/s up, 40 Mbit/s down, 80 ms) and prints what the gentle-upload watch did and how long a small
// page request takes while the upload runs (should stay usable), plus how many uploads were in flight at once.
//   node scripts/slow-net-test.cjs [url=https://orbitransfer.com] [sizeMB=24] [upMbit=10] [files=1]
// files > 1 sends them as separate balls ("N balls"): gently at most 2 uploads may run at once (1 on a busy line),
// whatever N is. Prefer a preview deployment or a local `next start` over production for that one.
// The test objects are named "zz-slow-net-test…" and live 5 minutes; burn them from HQ → Void if needed.
const { chromium } = require(process.env.PW || "/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto");
(async () => {
  const [url = "https://orbitransfer.com", mb = "24", up = "10", n = "1"] = process.argv.slice(2);
  const files = Array.from({ length: Math.max(1, +n) }, (_, i) => {
    const f = path.join(os.tmpdir(), `zz-slow-net-test${+n > 1 ? `-${i + 1}` : ""}.bin`);
    fs.writeFileSync(f, crypto.randomBytes(+mb * 1024 * 1024));
    return f;
  });
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 80, uploadThroughput: (+up * 1e6) / 8, downloadThroughput: (40 * 1e6) / 8 });
  p.on("console", (m) => /orbi:/.test(m.text()) && console.log(`[${new Date().toISOString().slice(11, 19)}]`, m.text()));
  // uploads in flight (signed PUTs straight to the bucket): the most at once since the last line, and overall
  let puts = 0, peak = 0, most = 0;
  const isPut = (r) => r.method() === "PUT" && !r.url().startsWith(url);
  p.on("request", (r) => isPut(r) && (puts++, (peak = Math.max(peak, puts)), (most = Math.max(most, puts))));
  const end = (r) => isPut(r) && puts--;
  p.on("requestfinished", end);
  p.on("requestfailed", end);
  await p.goto(url, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  await (await p.$$("input[type=file]"))[0].setInputFiles(files);
  await p.waitForTimeout(2500);
  if (files.length > 1) await p.locator("button", { hasText: new RegExp(`^${files.length} balls$`) }).first().click().catch(() => {});
  await p.locator("button", { hasText: /^More options/ }).first().click().catch(() => {});
  await p.locator("button.chip", { hasText: /^5m$/ }).first().click().catch(() => {});
  await p.locator("button", { hasText: /^Send/ }).last().click();
  const t0 = Date.now();
  // while it uploads: how long does a small request take?
  for (let i = 0; i < 20; i++) {
    await p.waitForTimeout(3000);
    const ms = await p.evaluate(async () => { const t = performance.now(); await fetch(`/api/version?x=${Date.now()}`, { cache: "no-store" }); return Math.round(performance.now() - t); });
    const dock = await p.locator(".dock-cloud").first().textContent().catch(() => "");
    console.log(`t+${Math.round((Date.now() - t0) / 1000)}s  page request ${ms} ms  uploads at once ${peak}  ${dock?.trim() || ""}`);
    peak = puts;
  }
  console.log(`most uploads at once: ${most}`);
  await b.close();
})();
