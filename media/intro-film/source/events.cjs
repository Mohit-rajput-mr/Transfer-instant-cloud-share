// dumps the film's sound cues (clicks, taps, beats) to events.json for synth.py
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), path = require("path");
(async () => {
  const srv = await require("./serve.cjs")();
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  const p = await b.newPage();
  await p.goto(srv.url);
  const out = await p.evaluate((m) => { window.setMarks(m); return { events: window.events(), vo: window.VO, duration: window.DURATION }; }, require("./marks.cjs")());
  fs.writeFileSync(path.join(__dirname, "events.json"), JSON.stringify(out, null, 1));
  console.log(out.events.length, "events");
  await b.close();
  srv.close();
})();
