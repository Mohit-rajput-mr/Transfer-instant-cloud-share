// Real DESKTOP screen recordings of the Orbi Transfer work layout (/work) for the work-desk film:
// spaces, named tasks, uploading into a task, routes with step colours, moving along a route, Arrange, cancel.
// Serve the app locally first:  next build && next start -p 3170   (every /api/** call is mocked here, statefully)
// node record.cjs [clip ...]  → rec/<clip>/00000.jpg … (1440×900 @1.5x = 2160×1350, 15 fps)
// PROBE=1 node record.cjs  → only screenshots (rec/probe-*.png) while walking through, no frames
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const BASE = process.env.BASE || "http://localhost:3170";
const OUT = path.join(__dirname, "rec");
const W = 1440, H = 900, DSF = 1.5;
const FPS = 15, STEP = 1000 / FPS;
// Slow motion while recording: the page runs at SLOW× speed (CSS animations through CDP, JS timers / rAF /
// performance.now through an init script) and frames are taken every STEP/SLOW ms of wall clock.
const SLOW = Number(process.env.SLOW) || 0.5;
const ONLY = process.argv.slice(2);
const PROBE = !!process.env.PROBE;

// ---------- mocked server state ----------
const S = { spaces: [], tasks: [], items: [], num: 0, inSpace: false };
const SLUG = "studio-nova";
const ME = "Alex";
const rid = (n) => crypto.randomBytes(16).toString("hex").slice(0, n);
const iso = (t) => new Date(t).toISOString();
const members = () => [
  { id: "d0000000000000a1", handle: ME, you: true },
  { id: "d0000000000000b2", handle: "Maya", you: false },
  { id: "d0000000000000c3", handle: "Richard", you: false },
  { id: "d0000000000000d4", handle: "Sam", you: false },
];
const newTask = (b) => {
  const id = "t" + rid(9);
  const num = ++S.num, now = Date.now();
  const t = { id, num, text: b.text, by: b.by || ME, from: b.from || null, createdAt: iso(now), expiresAt: iso(now + (b.life || 30) * 60000), doneAt: null, doneBy: null, assignee: b.assignee || null, route: b.route || [], stage: b.stage ?? -1, log: [], editedAt: null };
  S.tasks.push(t);
  return t;
};
const newItem = (b) => {
  const id = rid(6) + "x1";
  const now = Date.now();
  const o = { id, name: b.name, fileName: b.fileName || b.name, mime: b.mime || "application/octet-stream", size: b.size || 100000, salt: b.salt || "AAAAAAAAAAAAAAAAAAAAAA==", iterations: b.iterations || 100000, hue: b.hue ?? 210, status: "ready", netHash: "n1", maxDownloads: null, downloads: 0, devices: 0, views: 0, watchers: 1, by: b.by || ME, space: SLUG, life: b.life || 30, open: !!b.open, from: b.from || null, groupName: null, skin: null, thumb: false, task: b.task || null, createdAt: iso(now), expiresAt: iso(now + 30 * 60000) };
  S.items.push(o);
  return o;
};

async function api(route) {
  const req = route.request();
  const u = new URL(req.url());
  const p = u.pathname, m = req.method();
  let b = null;
  try { b = req.postDataJSON(); } catch {}
  const json = (j, status = 200) => route.fulfill({ status, json: j, headers: { "Cache-Control": "no-store" } });
  const list = () => json({ items: S.items.filter((o) => !o._pending), bubbles: [], tasks: S.tasks, online: 4, now: Date.now() });

  if (p === "/api/version") return json({ v: "r-2026-10-17-cloudflare-live", build: "dev" });
  if (p === "/api/transfers" && m === "GET") return json({ items: [], bubbles: [], tasks: [], online: 9, now: Date.now() });
  if (p === "/api/spaces" && m === "GET") {
    const q = (u.searchParams.get("q") || "").toLowerCase();
    return json({ items: S.spaces.filter((s) => s.slug.includes(q.replace(/\s+/g, "-"))).map(({ slug, title, priv }) => ({ slug, title, priv })) });
  }
  if (p === "/api/spaces" && m === "POST") {
    const s = { slug: SLUG, title: b.title, priv: !!b.priv, handle: b.handle, token: "tok" + rid(28), chan: rid(20), owner: "own" + rid(30) };
    S.spaces.push(s);
    return json(s);
  }
  if (/^\/api\/spaces\/[^/]+\/enter$/.test(p)) return json({ slug: SLUG, title: "Studio Nova", priv: true, handle: ME, chan: "c" + "0".repeat(19), owner: true, members: members() });
  if (/^\/api\/spaces\/[^/]+\/transfers$/.test(p)) return list();
  if (/^\/api\/spaces\/[^/]+\/(join|leave|kick)$/.test(p)) return json({ ok: true });

  if (p === "/api/tasks" && m === "POST") {
    const t = newTask(b);
    return json({ id: t.id, num: t.num });
  }
  if (p.startsWith("/api/tasks/")) {
    const t = S.tasks.find((x) => x.id === b?.id);
    if (!t) return json({ ok: true });
    if (p.endsWith("/edit")) {
      if (b.text) (t.text = b.text), (t.editedAt = iso(Date.now()));
      if (Array.isArray(b.route)) t.route = b.route;
      if (Number.isInteger(b.stage)) {
        const moved = b.stage !== t.stage;
        t.stage = b.stage;
        if (moved && b.stage >= 0) t.log.push({ i: b.stage, name: (t.route[b.stage] || "").split("§")[0], by: b.by || ME, at: iso(Date.now()) });
      }
    }
    if (p.endsWith("/done")) (t.doneAt = b.done !== false ? iso(Date.now()) : null), (t.doneBy = b.done !== false ? b.by || ME : null);
    if (p.endsWith("/assign")) t.assignee = b.assignee || null;
    return json({ ok: true });
  }

  if (p === "/api/transfers" && m === "POST") {
    const o = newItem(b);
    o._pending = true;
    return json({ id: o.id });
  }
  const fin = /^\/api\/transfers\/([^/]+)\/finalize$/.exec(p);
  if (fin) {
    const o = S.items.find((x) => x.id === fin[1]);
    if (o) delete o._pending;
    const { _pending, ...rest } = o || {};
    return json(rest);
  }
  // the encrypted cloud copy: "no storage here" (the direct path serves it), so no R2 PUT is needed
  if (/\/store$/.test(p)) return json({ error: "no storage" }, 501);
  const wire = /^\/api\/transfers\/([^/]+)\/wire$/.exec(p);
  if (wire) {
    const o = S.items.find((x) => x.id === wire[1]);
    if (o) o.task = b?.task ?? null;
    return json({ ok: true });
  }
  const one = /^\/api\/transfers\/([^/]+)$/.exec(p);
  if (one && m === "GET") return json(S.items.find((x) => x.id === one[1]) ?? {}, 200);
  if (p.endsWith("/thumb") && m === "GET") return route.fulfill({ status: 404, body: "" });
  return json({ ok: true });
}

// ---------- capture ----------
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const files = path.join(__dirname, "rec_files");
  fs.mkdirSync(files, { recursive: true });
  const pick = [];
  for (const [n, kb] of [["deck.pdf", 820], ["logo.svg", 24], ["moodboard.png", 410]]) {
    const f = path.join(files, n);
    fs.writeFileSync(f, crypto.randomBytes(kb * 1024));
    pick.push(f);
  }

  const b = await chromium.launch({ args: [`--force-device-scale-factor=${DSF}`] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  await ctx.routeWebSocket(/realtime|wss|ws:/, () => {});
  await ctx.addInitScript((R) => {
    try {
      localStorage.setItem("orbit:geo-asked", "1");
      localStorage.setItem("orbit:work-theme", "dark");
      localStorage.setItem("orbit:bubble-name", "Alex");
      sessionStorage.setItem("orbit:pill-off", "1");
    } catch {}
    const rn = performance.now.bind(performance), t0 = rn();
    performance.now = () => t0 + (rn() - t0) * R;
    const st = window.setTimeout, si = window.setInterval, raf = window.requestAnimationFrame;
    window.setTimeout = (f, ms, ...a) => st(f, (Number(ms) || 0) / R, ...a);
    window.setInterval = (f, ms, ...a) => si(f, (Number(ms) || 0) / R, ...a);
    window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()));
  }, SLOW);
  await ctx.route(/\/api\//, api);
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: SLOW });
  let latest = null;
  cdp.on("Page.screencastFrame", (f) => {
    latest = f.data;
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  if (!PROBE) await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: W * DSF, maxHeight: H * DSF, everyNthFrame: 1 });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console", m.text().slice(0, 200)));
  await page.goto(BASE + "/work", { waitUntil: "load" });
  const arrow = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34"><path d="M3 2 L3 27 L9.5 21 L14 31.5 L18.5 29.5 L14 19.5 L23 19.5 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>`);
  const css = `nextjs-portal{display:none!important}
    #fx-cur{position:fixed;left:0;top:0;width:28px;height:34px;margin:-2px 0 0 -3px;pointer-events:none;z-index:2147483647;
      background:url("data:image/svg+xml,${arrow}") no-repeat;filter:drop-shadow(0 2px 3px rgba(0,0,0,.28));opacity:0;
      transform-origin:3px 2px;transition:opacity .2s ease, transform .12s ease, left .5s cubic-bezier(.45,.05,.25,1), top .5s cubic-bezier(.45,.05,.25,1)}
    #fx-cur.on{opacity:1} #fx-cur.press{transform:scale(.86)}
    .fx-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;pointer-events:none;z-index:2147483646;
      background:rgba(240,138,36,.22);border:2px solid rgba(240,138,36,.85);animation:fxr .55s ease-out forwards}
    @keyframes fxr{from{transform:scale(.4);opacity:1}to{transform:scale(1.9);opacity:0}}
    /* the route panel has no light-theme colours yet (src/app/globals.css paints its inputs white on white):
       the same panel, readable on the light work canvas */
    html[data-ui="work"][data-theme="light"] .tb-route :is(.tr-title-in, .tr-line input){color:var(--w-text)!important;background:var(--w-canvas)!important;border-color:var(--w-border-2)!important}
    html[data-ui="work"][data-theme="light"] .tb-route .tr-title-in{font-family:var(--w-font)}
    html[data-ui="work"][data-theme="light"] .tb-route .tr-line input:focus{border-color:var(--w-accent)!important}
    html[data-ui="work"][data-theme="light"] .tb-route .tr-line li:not(.now):not(.past) > button > i{background:var(--w-surface);border-color:var(--w-border-2)}
    html[data-ui="work"][data-theme="light"] .tb-route .tr-line li::before{background:var(--w-border-2)}
    html[data-ui="work"][data-theme="light"] .tb-route .tr-presets button:not(.tr-custom){color:var(--w-text-2);border-color:var(--w-border-2)}
    html[data-ui="work"][data-theme="light"] .tb-route :is(.tr-head .mono, .tr-hint, .tr-presets > .mono.dim){color:var(--w-text-3)}
    html[data-ui="work"][data-theme="light"] .tb-route .tr-go button{color:var(--w-text-2)}
    html[data-ui="work"][data-theme="light"] .tb-route .tr-go .tr-cancel{color:#e53935}`;
  const decorate = async () => {
    await page.addStyleTag({ content: css });
    await page.evaluate(() => {
      if (document.getElementById("fx-cur")) return;
      const f = document.createElement("div");
      f.id = "fx-cur";
      document.body.appendChild(f);
      new MutationObserver(() => document.querySelectorAll(".toast > div").forEach((d) => /back to not started/.test(d.textContent) && (d.style.display = "none")))
        .observe(document.body, { subtree: true, childList: true, characterData: true });
    });
  };
  await decorate();
  await page.waitForTimeout(3000 / SLOW);

  let shotN = 0;
  const shot = async (name) => PROBE && page.screenshot({ path: path.join(OUT, `probe-${String(shotN++).padStart(2, "0")}-${name}.png`) });

  // --- recorder: a frame every 1/15 s of wall clock; the newest compositor frame fills each slot
  let rec = null;
  const startRec = (clip) => {
    if (PROBE) return;
    const dir = path.join(OUT, clip);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    rec = { dir, n: 0, t0: Date.now(), stop: false, last: null };
    rec.loop = (async () => {
      const r = rec;
      while (!r.stop) {
        const wait = r.t0 + r.n * (STEP / SLOW) - Date.now();
        if (wait > 0) await new Promise((res) => setTimeout(res, wait));
        if (!latest) continue;
        if (latest !== r.lastData) (r.lastData = latest), (r.last = Buffer.from(latest, "base64"));
        fs.writeFileSync(path.join(r.dir, String(r.n++).padStart(5, "0") + ".jpg"), r.last);
      }
    })();
  };
  const stopRec = async (hold = 600) => {
    await wait(hold);
    if (PROBE) return;
    rec.stop = true;
    await rec.loop;
    console.log(path.basename(rec.dir), rec.n, "frames");
  };
  const wait = (ms) => page.waitForTimeout(ms / SLOW);
  // the pointer: the drawn arrow glides (CSS) while the real mouse follows the same path (hover states)
  let cur = { x: W * 0.62, y: H * 0.7 };
  const point = async (x, y) => {
    const d = Math.hypot(x - cur.x, y - cur.y);
    const dur = Math.round(Math.min(460, Math.max(220, 170 + d * 0.4)));
    await page.evaluate(([x, y, dur]) => {
      const f = document.getElementById("fx-cur");
      f.style.transitionDuration = `.2s, .12s, ${dur}ms, ${dur}ms`;
      f.style.left = x + "px";
      f.style.top = y + "px";
      f.classList.add("on");
    }, [x, y, dur]);
    const n = 4, x0 = cur.x, y0 = cur.y;
    for (let i = 1; i <= n; i++) {
      const k = i / n, e = k * k * (3 - 2 * k);
      await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    }
    cur = { x, y };
    await wait(dur + 20);
  };
  const ripple = (x, y) =>
    page.evaluate(([x, y]) => {
      const f = document.getElementById("fx-cur");
      f.classList.add("press");
      const r = document.createElement("div");
      r.className = "fx-ripple";
      r.style.left = x + "px";
      r.style.top = y + "px";
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 700);
    }, [x, y]);
  const release = () => page.evaluate(() => document.getElementById("fx-cur").classList.remove("press"));
  const centre = async (loc) => {
    await loc.waitFor({ state: "visible", timeout: 10000 });
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const bx = await loc.boundingBox();
    return { x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 };
  };
  const hoverOn = async (loc) => {
    const c = await centre(loc);
    await point(c.x, c.y);
  };
  const click = async (loc, { pause = 130, dbl = false } = {}) => {
    const { x, y } = await centre(loc);
    await point(x, y);
    await ripple(x, y);
    if (dbl) await page.mouse.dblclick(x, y);
    else await page.mouse.click(x, y);
    await wait(90);
    await release();
    await wait(pause);
  };
  const type = async (loc, text, delay = 42) => {
    await click(loc, { pause: 60 });
    await loc.pressSequentially(text, { delay: delay / SLOW });
    await wait(120);
  };
  const want = (c) => !ONLY.length || ONLY.includes(c);
  const rail = (name) => page.locator("nav.w-rail").getByRole("button", { name });
  const myTasks = (ids) => page.evaluate((ids) => {
    const m = JSON.parse(localStorage.getItem("orbit:tasks") || "{}");
    for (const id of ids) m[id] = m[id] || "f".repeat(64);
    localStorage.setItem("orbit:tasks", JSON.stringify(m));
  }, ids);
  const rowOf = (label) => page.locator(".tb-row", { has: page.locator(".tb-num", { hasText: label }) }).first();

  await shot("start");

  // ===== 1. space: create a private space "Studio Nova" with a passcode
  if (want("space")) startRec("space");
  await wait(200);
  await click(rail("Spaces"));
  await wait(400);
  await shot("spaces");
  await click(page.getByRole("tab", { name: "Create" }));
  await type(page.getByPlaceholder("Studio, Family, Team…"), "Studio Nova");
  await click(page.getByRole("radio", { name: "Private" }));
  await type(page.getByPlaceholder("4+ characters"), "nova-2026", 45);
  const handle = page.getByPlaceholder(/How others see your/);
  await handle.fill("");
  await type(handle, ME);
  await shot("space-form");
  await click(page.getByRole("button", { name: /Create private space/ }));
  await wait(1000);
  await shot("space-in");
  if (want("space")) await stopRec(600);

  // ===== 2. task: "Richard's task" · "Brand refresh deck @Richard" · Submit task
  if (want("task")) startRec("task");
  await wait(300);
  await click(rail(/^Tasks/));
  await wait(500);
  await shot("tasks-open");
  await type(page.getByLabel("Task name"), "Richard's task");
  await type(page.getByLabel("New task", { exact: true }), "Brand refresh deck @Richard");
  await wait(300);
  await click(page.locator(".tb-submit", { hasText: "Submit task" }));
  await wait(1300);
  await shot("task-added");
  if (want("task")) await stopRec(600);

  // ===== 3. upload: "Upload files" in the added box → pick 3 files → send → balls wired to the task
  if (want("upload")) startRec("upload");
  await wait(300);
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser", { timeout: 8000 }),
    click(page.locator(".tb-added .tb-submit", { hasText: "Upload files" })),
  ]);
  await chooser.setFiles(pick);
  await wait(1100);
  await shot("send-card");
  await click(page.getByRole("button", { name: /^3 files?$/ }).or(page.getByRole("radio", { name: /^3 files?$/ })).first());
  await wait(300);
  await click(page.locator(".cta", { hasText: "Send" }).last());
  await wait(3200);
  await shot("sent");
  if (want("upload")) await stopRec(600);
  // off camera: the composer away, one step closer so the task panel reads
  await page.locator(".tb-added button", { hasText: "Done" }).click().catch(() => {});
  await wait(400);
  await page.getByRole("button", { name: "Zoom in (+)" }).click();
  await wait(1200);
  await page.mouse.move(W * 0.62, H * 0.75);
  await shot("zoomed");

  // ===== 4. route: double-click the row → In progress, In review, custom "Client sign-off", Delivered; colours
  const rich = rowOf("Richard's task");
  if (want("route")) startRec("route");
  await wait(300);
  await click(rich.locator(".tb-main"), { dbl: true, pause: 150 });
  const panel = page.locator(".tb-route");
  await panel.waitFor({ state: "visible", timeout: 5000 });
  await shot("route-open");
  for (const st of ["In progress", "In review"]) await click(panel.locator(".tr-presets button", { hasText: st }), { pause: 180 });
  await click(panel.locator(".tr-custom"), { pause: 150 });
  const custom = panel.locator(".tr-line li input").last();
  await custom.waitFor({ state: "visible" });
  await custom.pressSequentially("Client sign-off", { delay: 40 / SLOW });
  await page.keyboard.press("Enter");
  await wait(250);
  await click(panel.locator(".tr-presets button", { hasText: "Delivered" }), { pause: 250 });
  await shot("route-steps");
  const pickColour = async (i, colour) => {
    const sw = await centre(panel.locator(".tr-line li").nth(i).locator(".tr-swatch"));
    await point(sw.x, sw.y);
    await wait(220);
    // down into the palette first (it hangs under the swatch), then along it: the pointer never leaves
    const pal = await panel.locator(".tr-line li").nth(i).locator(".tr-palette").boundingBox();
    await point(sw.x, pal.y + pal.height / 2);
    await click(panel.locator(".tr-line li").nth(i).locator(".tr-palette").getByRole("radio", { name: colour }), { pause: 220 });
  };
  await pickColour(1, "Purple");
  await pickColour(3, "Green");
  await shot("route-colours");
  if (want("route")) await stopRec(600);

  // ===== 5. move: click the steps one after another (orange → purple → green), then close
  if (want("move")) startRec("move");
  await wait(300);
  for (const st of ["In progress", "In review", "Client sign-off", "Delivered"]) {
    await click(page.getByRole("button", { name: `Move to ${st}`, exact: true }), { pause: 700 });
    await shot("move-" + st);
  }
  await click(panel.locator(".tr-close"), { pause: 500 });
  await shot("moved");
  if (want("move")) await stopRec(600);

  // off camera: a second task "Poster" @Sam (started), and more files wired to both, scattered on the board
  const poster = newTask({ text: "Poster", assignee: "Sam", by: ME, route: ["In progress", "In review§purple", "Delivered§green"], stage: 0 });
  poster.log.push({ i: 0, name: "In progress", by: ME, at: iso(Date.now()) });
  await myTasks([poster.id]);
  const richId = S.tasks[0].id;
  for (const [name, mime, size, task, hue] of [["poster-a3", "application/pdf", 2400000, poster.id, 28], ["photos", "image/jpeg", 5100000, poster.id, 160], ["brand-fonts", "application/zip", 880000, richId, 280]])
    newItem({ name, fileName: name, mime, size, task, hue, by: ME });
  await wait(4000);
  await shot("seeded");
  // toasts gone, pointer off the rows
  await page.mouse.move(W * 0.3, H * 0.55);
  cur = { x: W * 0.3, y: H * 0.55 };
  await wait(3000);
  await page.waitForFunction(() => ![...document.querySelectorAll(".toast > div")].some((d) => /New file online/.test(d.textContent) && d.offsetParent), null, { timeout: 20000 }).catch(() => {});
  await wait(600);
  await shot("pre-arrange");

  // ===== 6. arrange: every wired file lines up in its task's lane, dead-straight wires
  if (want("arrange")) startRec("arrange");
  await wait(400);
  await click(page.locator(".tb-arrange").first(), { pause: 400 });
  await point(W * 0.82, H * 0.86);
  await wait(1800);
  await shot("arranged");
  if (want("arrange")) await stopRec(1200);

  // ===== 7. cancel: open Poster's route, Cancel order → red
  if (want("cancel")) startRec("cancel");
  await wait(300);
  const post = page.locator(".tb-row", { has: page.locator(".tb-text", { hasText: "Poster" }) }).first();
  await click(post.locator(".tb-main"), { dbl: true, pause: 600 });
  await panel.waitFor({ state: "visible", timeout: 5000 });
  await shot("cancel-open");
  await click(panel.locator(".tr-cancel"), { pause: 900 });
  await shot("cancelled-panel");
  await click(panel.locator(".tr-close"), { pause: 400 });
  await point(W * 0.82, H * 0.86);
  await wait(500);
  await shot("cancelled");
  if (want("cancel")) await stopRec(600);

  if (PROBE) {
    await b.close();
    return;
  }
  await b.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
