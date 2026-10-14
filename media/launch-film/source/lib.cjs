// Deterministic capture of the real site: JS time is Playwright's fake clock, CSS animations are stepped by hand.
const { chromium, devices } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const path = require("path");
const BASE = "http://localhost:3160";
const T0 = Date.parse("2026-10-14T10:00:00Z");

const T1 = T0 + 60_000; // the paused "now" every capture runs at
function mkOrb(id, name, fileName, mime, size, hue, minsLeft = 22, extra = {}) {
  return { id, name, fileName, mime, size, salt: "AAAAAAAAAAAAAAAAAAAAAA==", iterations: 100000, hue, status: "ready", netHash: "n1", maxDownloads: null,
    downloads: extra.downloads ?? 0, devices: 0, views: extra.views ?? 0, watchers: extra.watchers ?? 0,
    createdAt: new Date(T1 - (30 - minsLeft) * 60e3).toISOString(), expiresAt: new Date(T1 + minsLeft * 60e3).toISOString(), ...extra };
}

async function open(b, opts, { items = [], url = "/", init } = {}) {
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.clock.install({ time: T0 });
  const st = { items };
  await page.route("**/api/transfers", (r) => {
    if (r.request().method() === "POST") return r.fulfill({ json: { id: "nova42", pathname: "o/nova42.bin", token: "vercel_blob_client_store1_x" } });
    r.fulfill({ json: { items: st.items, online: 3, now: T1, net: "n1" } });
  });
  await page.route("**/api/pulse", (r) => r.fulfill({ json: { net: "n1" } }));
  await page.route("**/api/version", (r) => r.fulfill({ json: { v: "x" } }));
  await page.route(/\/view$/, (r) => r.fulfill({ json: {} }));
  if (init) await init(page, st);
  await page.goto(BASE + url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // stop wall-clock time: from here on, JS time only moves when we step it
  await page.clock.pauseAt(T0 + 60_000);
  await step(page, 1500, 100);
  return { ctx, page, st };
}

// advance everything by dt ms: fake JS clock + every CSS animation/transition
async function step(page, dt, sub = dt) {
  for (let done = 0; done < dt; done += sub) {
    const d = Math.min(sub, dt - done);
    await page.clock.runFor(d);
    await page.evaluate((d) => {
      for (const a of document.getAnimations()) {
        if (a.__t === undefined) { a.__t = a.currentTime ?? 0; a.pause(); }
        a.__t += d;
        a.currentTime = a.__t;
      }
    }, d);
  }
}
async function freeze(page) {
  await page.evaluate(() => { for (const a of document.getAnimations()) if (a.__t === undefined) { a.__t = a.currentTime ?? 0; a.pause(); } });
}

// capture `ms` of motion at `fps` into dir/prefix_0000.png
async function capture(page, dir, prefix, ms, fps = 60) {
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.round((ms / 1000) * fps);
  for (let i = 0; i < n; i++) {
    await freeze(page);
    await page.screenshot({ path: path.join(dir, `${prefix}_${String(i).padStart(4, "0")}.png`) });
    await step(page, 1000 / fps);
  }
  return n;
}
module.exports = { chromium, devices, open, step, capture, freeze, mkOrb, T0 };
