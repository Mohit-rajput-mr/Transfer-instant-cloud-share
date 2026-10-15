// Deterministic capture of the real site for the film. JS time is Playwright's fake clock and every
// CSS / Web animation is stepped by hand, so each captured frame is exactly 1/FPS s after the last.
// Every API call is answered here (no real server state), and the cloud copy (R2) is mocked too.
const { chromium, devices } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "http://localhost:3160";
const FPS = 30;
const T0 = Date.parse("2026-10-15T09:00:00Z");
const NOW = T0 + 60_000; // the paused "now" every capture starts at
const CORS = { "access-control-allow-origin": "*", "access-control-expose-headers": "ETag, Content-Length, Content-Range", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, PUT, HEAD" };

function mkOrb(id, name, fileName, mime, size, hue, minsLeft = 22, extra = {}) {
  return {
    id, name, fileName, mime, size, salt: "AAAAAAAAAAAAAAAAAAAAAA==", iterations: 100000, hue, status: "ready", netHash: "n1", maxDownloads: null,
    downloads: 0, devices: 0, views: 0, watchers: 0, open: true, life: 30, space: null, by: null, from: null, groupName: null,
    createdAt: new Date(NOW - (30 - minsLeft) * 60e3).toISOString(), expiresAt: new Date(NOW + minsLeft * 60e3).toISOString(), ...extra,
  };
}

/** A context + page on the real app with every server answer mocked. `st.items` is what the void shows. */
async function open(b, opts, { items = [], url = "/", init, space } = {}) {
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await ctx.routeWebSocket(/realtime/, () => {});
  await page.clock.install({ time: T0 });
  const st = { items, orbs: new Map(), r2: new Map(), pending: [] };
  const j = (r, json, status = 200) => r.fulfill({ status, json, headers: CORS });
  await page.route("**/api/**", async (r) => {
    const u = new URL(r.request().url());
    const p = u.pathname, m = r.request().method();
    let mm;
    if (st.custom && (await st.custom(r, p, m))) return;
    if (p === "/api/transfers" && m === "GET") return j(r, { items: st.items, online: 3, now: NOW });
    if (p === "/api/transfers" && m === "POST") {
      const bd = r.request().postDataJSON();
      const id = (st.nextIds ?? []).shift() ?? "nova" + Math.floor(Math.random() * 90 + 10);
      st.orbs.set(id, mkOrb(id, bd.name, bd.fileName, bd.mime, bd.size, bd.hue ?? 200, bd.life ?? 30, { open: !!bd.open, from: bd.from ?? null, groupName: bd.group ?? null, salt: bd.salt, nonce: bd.nonce, iterations: bd.iterations }));
      return j(r, { id });
    }
    if ((mm = p.match(/^\/api\/transfers\/(\w+)\/finalize$/))) {
      const o = st.orbs.get(mm[1]);
      if (!st.items.find((x) => x.id === o.id)) st.items = [...st.items, o];
      return j(r, o);
    }
    if ((mm = p.match(/^\/api\/transfers\/(\w+)\/store$/))) {
      const bd = r.request().postDataJSON();
      if (bd.action === "start" && bd.probe) return j(r, { probe: `https://r2.mock/probe/${mm[1]}` });
      if (bd.action === "start") return j(r, { put: `https://r2.mock/put/${mm[1]}` });
      return j(r, { ok: true });
    }
    if (p.endsWith("/view") || p.endsWith("/report")) return j(r, { ok: true });
    if (p === "/api/pulse") return j(r, { net: "n1" });
    if (p === "/api/version") return j(r, { v: "film" });
    if (space && p === `/api/spaces/${space.slug}/enter`) return j(r, space.info);
    if (space && p === `/api/spaces/${space.slug}/transfers`) return j(r, { items: st.items, online: space.info.members.length, now: NOW });
    if ((mm = p.match(/^\/api\/transfers\/(\w+)$/)) && m === "GET") {
      const o = st.items.find((x) => x.id === mm[1]) ?? st.orbs.get(mm[1]);
      return o ? j(r, o) : j(r, { error: "not found" }, 404);
    }
    return j(r, { ok: true });
  });
  // the cloud copy: uploads take a moment so the "saving" state shows; downloads honour Range
  await page.route("https://r2.mock/**", async (r) => {
    const u = new URL(r.request().url());
    const m = r.request().method();
    if (m === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    if (u.pathname.startsWith("/probe/")) return r.fulfill({ status: 404, headers: CORS, body: "" });
    if (u.pathname.startsWith("/put/")) {
      await new Promise((ok) => setTimeout(ok, st.putDelay ?? 1200));
      return r.fulfill({ status: 200, headers: { ...CORS, etag: '"e1"' }, body: "" });
    }
    if (u.pathname.startsWith("/get/")) {
      const body = st.r2.get(u.pathname.slice(5));
      if (!body) return r.fulfill({ status: 404, headers: CORS, body: "" });
      const rg = /bytes=(\d+)-(\d+)/.exec(r.request().headers()["range"] || "");
      const a = rg ? +rg[1] : 0, z = rg ? Math.min(+rg[2], body.length - 1) : body.length - 1;
      // the capture releases each piece when it wants the progress to move (film time, not wall time)
      if (rg && z > 0 && st.gated) await new Promise((ok) => st.pending.push(ok));
      return r.fulfill({ status: rg ? 206 : 200, headers: { ...CORS, "content-range": `bytes ${a}-${z}/${body.length}`, "content-type": "application/octet-stream" }, body: body.subarray(a, z + 1) });
    }
    return r.fulfill({ status: 404, headers: CORS, body: "" });
  });
  if (space) {
    // a saved space in this browser: IndexedDB off, so the app uses its localStorage fallback
    await page.addInitScript((s) => {
      try { Object.defineProperty(window, "indexedDB", { value: undefined }); } catch {}
      localStorage.setItem("orbit:kv:spaces", JSON.stringify([s]));
      localStorage.setItem("orbit:kv:current", JSON.stringify(s.slug));
      localStorage.setItem("orbit:kv:handle", JSON.stringify(s.handle));
    }, space.session);
  }
  if (init) await init(page, st);
  await page.goto(BASE + url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(NOW);
  await step(page, 1500, 100);
  return { ctx, page, st };
}

/** advance everything by dt ms: the fake JS clock and every CSS / Web animation */
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

/** A shot: frames go to dir/00000.png…, and marks (click points, named moments) to dir/marks.json */
function shot(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const s = { dir, n: 0, marks: [] };
  s.save = () => fs.writeFileSync(path.join(dir, "marks.json"), JSON.stringify({ frames: s.n, fps: FPS, marks: s.marks }, null, 1));
  return s;
}
/** capture `ms` of motion */
async function cap(page, s, ms) {
  const n = Math.round((ms / 1000) * FPS);
  for (let i = 0; i < n; i++) {
    await freeze(page);
    await page.screenshot({ path: path.join(s.dir, `${String(s.n).padStart(5, "0")}.png`) });
    s.n++;
    await step(page, 1000 / FPS);
  }
}
/** note where an element is (centre, in CSS px of the viewport) at this frame */
async function mark(page, s, name, sel, kind = "click") {
  const box = typeof sel === "string" ? await page.locator(sel).first().boundingBox() : sel;
  s.marks.push({ name, kind, f: s.n, x: box ? box.x + box.width / 2 : null, y: box ? box.y + box.height / 2 : null });
  return box;
}
const note = (s, name) => s.marks.push({ name, kind: "moment", f: s.n });

module.exports = { chromium, devices, open, step, cap, shot, mark, note, mkOrb, T0, NOW, FPS, CORS };
