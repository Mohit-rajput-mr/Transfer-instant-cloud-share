const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const path = require("path");
const V = __dirname, C = V + "/cap2";
const [, , from = "0", to = "", outDir = V + "/frames", step = "1"] = process.argv;
const ls = (dir) => (fs.existsSync(path.join(C, dir)) ? fs.readdirSync(path.join(C, dir)) : []);
const list = (dir, prefixes) => prefixes.flatMap((p) => ls(dir).filter((f) => f.startsWith(p + "_")).sort().map((f) => `cap2/${dir}/${f}`));
const TYPE = ["typeN", "typeO", "typeV", "typeA", "type4", "type2"];
const decs = [...new Set(ls("phone").filter((f) => f.startsWith("dec")).map((f) => f.split("_")[0]))].sort();
const SEQ = {
  idle: list("desk", ["idle"]),
  split: list("desk", ["split"]),
  send: list("send", ["open", ...TYPE, "hold", "launch"]),
  phone: list("phone", ["sheet", ...TYPE, ...decs, "ready", "sharing", "saved"]),
  void: list("void", ["drift"]),
};
const pre = list("phone", ["sheet", ...TYPE]).length;
const PHONE_MARKS = { decryptAt: pre, saveAt: pre + list("phone", [...decs, "ready"]).length };
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto("file://" + V + "/video.html");
  await page.evaluate(async ([seq, marks]) => { window.PHONE_MARKS = marks; await window.ready; }, [SEQ, PHONE_MARKS]);
  await page.evaluate((seq) => { SEQ = seq; }, SEQ);
  const dur = await page.evaluate(() => window.DURATION);
  const N = Math.round(dur * 60);
  const end = to ? Math.min(N, +to) : N;
  const t0 = Date.now();
  for (let f = +from; f < end; f += +step) {
    await page.evaluate(([t, f]) => window.render(t, f), [f / 60, f]);
    await page.screenshot({ path: `${outDir}/${String(f).padStart(5, "0")}.png` });
  }
  console.log("frames", end - from, "in", ((Date.now() - t0) / 1000).toFixed(0), "s", JSON.stringify(PHONE_MARKS), Object.fromEntries(Object.entries(SEQ).map(([k, v]) => [k, v.length])));
  await b.close();
})();
