// dumps the film's sound cues (clicks, taps, beats) to events.json for synth.py
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const marks = Object.fromEntries(fs.readdirSync(path.join(DIR, "cap")).filter((d) => fs.existsSync(path.join(DIR, "cap", d, "marks.json"))).map((d) => [d, JSON.parse(fs.readFileSync(path.join(DIR, "cap", d, "marks.json"), "utf8"))]));
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  const p = await b.newPage();
  await p.goto("file://" + path.join(DIR, "video.html"));
  const out = await p.evaluate((m) => { window.setMarks(m); return { events: window.events(), vo: window.VO, duration: window.DURATION }; }, marks);
  fs.writeFileSync(path.join(DIR, "events.json"), JSON.stringify(out, null, 1));
  console.log(out.events.length, "events");
  await b.close();
})();
