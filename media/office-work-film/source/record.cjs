// Real screen recordings of the Orbi Transfer UI for the office-work film (Spaces + tasks).
// Serve the app locally first:  next build && next start -p 3160   (every /api/** call is mocked here, statefully)
// node record.cjs [clip ...]  → rec/<clip>/00000.png … (390×844 @2x, 15 fps)
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const BASE = process.env.BASE || "http://localhost:3160";
const OUT = path.join(__dirname, "rec");
const FPS = 15, STEP = 1000 / FPS;
// Slow motion while recording: the page runs at SLOW× speed (CSS animations through CDP, JS timers / rAF /
// performance.now through an init script) and frames are taken every STEP/SLOW ms of wall clock, so even on a
// busy CPU the 15 fps come out smooth and in real time.
const SLOW = Number(process.env.SLOW) || 0.5;
const ONLY = process.argv.slice(2);

// ---------- mocked server state ----------
const S = { spaces: [], tasks: [], items: [], num: 0 };
const SLUG = "studio-nova";
const ME = "Alex";
const rid = (n) => crypto.randomBytes(16).toString("hex").replace(/[^a-z0-9]/g, "").slice(0, n);
const iso = (t) => new Date(t).toISOString();
const members = () => [
  { id: "d0000000000000a1", handle: ME, you: true },
  { id: "d0000000000000b2", handle: "Maya", you: false },
  { id: "d0000000000000c3", handle: "Sam", you: false },
  { id: "d0000000000000d4", handle: "Jon", you: false },
];

async function api(route) {
  const req = route.request();
  const u = new URL(req.url());
  const p = u.pathname, m = req.method();
  let b = null;
  try { b = req.postDataJSON(); } catch {}
  const json = (j, status = 200) => route.fulfill({ status, json: j, headers: { "Cache-Control": "no-store" } });
  const list = () => json({ items: S.items, bubbles: [], tasks: S.tasks, online: 4, now: Date.now() });

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
    const id = "t" + rid(9).padEnd(9, "0");
    const num = ++S.num, now = Date.now();
    S.tasks.push({ id, num, text: b.text, by: b.by || ME, from: b.from || null, createdAt: iso(now), expiresAt: iso(now + (b.life || 30) * 60000), doneAt: null, doneBy: null, assignee: b.assignee || null, route: [], stage: -1, log: [], editedAt: null });
    return json({ id, num });
  }
  if (p.startsWith("/api/tasks/")) {
    const t = S.tasks.find((x) => x.id === b?.id);
    if (!t) return json({ ok: true });
    if (p.endsWith("/edit")) {
      if (b.text) (t.text = b.text), (t.editedAt = iso(Date.now()));
      if (Array.isArray(b.route)) t.route = b.route;
      if (Number.isInteger(b.stage)) {
        t.stage = b.stage;
        if (b.stage >= 0) t.log.push({ i: b.stage, name: t.route[b.stage], by: b.by || ME, at: iso(Date.now()) });
      }
    }
    if (p.endsWith("/done")) (t.doneAt = b.done !== false ? iso(Date.now()) : null), (t.doneBy = b.done !== false ? b.by || ME : null);
    if (p.endsWith("/assign")) t.assignee = b.assignee || null;
    return json({ ok: true });
  }

  if (p === "/api/transfers" && m === "POST") {
    const id = rid(6).padEnd(6, "0") + "x1";
    const now = Date.now();
    S.items.push({ _pending: true, id, name: b.name, fileName: b.fileName, mime: b.mime, size: b.size, salt: b.salt, iterations: b.iterations, hue: b.hue ?? 210, status: "ready", netHash: "n1", maxDownloads: null, downloads: 0, devices: 0, views: 0, watchers: 1, by: ME, space: SLUG, life: b.life || 30, open: !!b.open, from: b.from || null, groupName: null, skin: null, thumb: false, task: b.task || null, createdAt: iso(now), expiresAt: iso(now + 30 * 60000) });
    return json({ id });
  }
  const fin = /^\/api\/transfers\/([^/]+)\/finalize$/.exec(p);
  if (fin) {
    const o = S.items.find((x) => x.id === fin[1]);
    if (o) delete o._pending;
    return json(o ?? {});
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
  const folder = path.join(files, "Logo pack");
  fs.mkdirSync(folder, { recursive: true });
  for (const [n, kb] of [["logo-final.svg", 24], ["logo-dark.png", 180], ["logo-light.png", 176], ["brand-guide.pdf", 640]])
    fs.writeFileSync(path.join(folder, n), crypto.randomBytes(kb * 1024));

  // a real 2× surface: the screencast then streams 780×1688 frames
  const b = await chromium.launch({ args: ["--force-device-scale-factor=2"] });
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  await ctx.routeWebSocket(/realtime|wss|ws:/, () => {});
  await ctx.addInitScript((R) => {
    try { localStorage.setItem("orbit:geo-asked", "1"); } catch {}
    const rn = performance.now.bind(performance), t0 = rn();
    performance.now = () => t0 + (rn() - t0) * R;
    const st = window.setTimeout, si = window.setInterval, raf = window.requestAnimationFrame;
    window.setTimeout = (f, ms, ...a) => st(f, (Number(ms) || 0) / R, ...a);
    window.setInterval = (f, ms, ...a) => si(f, (Number(ms) || 0) / R, ...a);
    window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()));
  }, SLOW);
  await ctx.route(/\/api\//, api);
  // nothing else from outside (fonts, analytics…) may hang the page
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: SLOW });
  // frames stream from the compositor; the recorder writes the newest one into each 1/15 s slot
  let latest = null;
  cdp.on("Page.screencastFrame", (f) => {
    latest = f.data;
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "png", maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(BASE + "/", { waitUntil: "load" });
  const css = `nextjs-portal{display:none!important}
    #fx-finger{position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;z-index:2147483647;
      background:rgba(255,255,255,.34);border:2px solid rgba(255,255,255,.85);box-shadow:0 0 18px rgba(255,255,255,.35);opacity:0;transform:scale(.6);
      transition:opacity .16s ease, transform .16s ease, left .32s cubic-bezier(.3,.7,.3,1), top .32s cubic-bezier(.3,.7,.3,1)}
    #fx-finger.on{opacity:1;transform:scale(1)} #fx-finger.press{transform:scale(.78);background:rgba(255,255,255,.55)}
    .fx-ripple{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;z-index:2147483646;border:2px solid rgba(255,255,255,.8);animation:fxr .5s ease-out forwards}
    @keyframes fxr{from{transform:scale(.7);opacity:.9}to{transform:scale(2.1);opacity:0}}`;
  await page.addStyleTag({ content: css });
  await page.evaluate(() => {
    const f = document.createElement("div");
    f.id = "fx-finger";
    document.body.appendChild(f);
    // building a route raises "Task N is back to not started" on every step added: keep those off screen
    new MutationObserver(() => document.querySelectorAll(".toast > div").forEach((d) => /back to not started/.test(d.textContent) && (d.style.display = "none")))
      .observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  await page.waitForTimeout(3000 / SLOW);

  // --- recorder: a frame every 1/15 s of wall clock; a slow screenshot is repeated so timing stays real
  let rec = null;
  const startRec = (clip) => {
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
        fs.writeFileSync(path.join(r.dir, String(r.n++).padStart(5, "0") + ".png"), r.last);
      }
    })();
  };
  const stopRec = async (hold = 600) => {
    await wait(hold);
    rec.stop = true;
    await rec.loop;
    console.log(path.basename(rec.dir), rec.n, "frames");
  };
  const wait = (ms) => page.waitForTimeout(ms / SLOW);
  const finger = async (x, y) => {
    await page.evaluate(([x, y]) => {
      const f = document.getElementById("fx-finger");
      f.style.left = x + "px";
      f.style.top = y + "px";
      f.classList.add("on");
    }, [x, y]);
    await wait(260);
  };
  const tap = async (loc, { pause = 170 } = {}) => {
    await loc.waitFor({ state: "visible", timeout: 10000 });
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const bx = await loc.boundingBox();
    const x = bx.x + bx.width / 2, y = bx.y + bx.height / 2;
    await finger(x, y);
    await page.evaluate(([x, y]) => {
      const f = document.getElementById("fx-finger");
      f.classList.add("press");
      const r = document.createElement("div");
      r.className = "fx-ripple";
      r.style.left = x + "px";
      r.style.top = y + "px";
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }, [x, y]);
    await loc.click({ force: true });
    await wait(110);
    await page.evaluate(() => document.getElementById("fx-finger").classList.remove("press"));
    await wait(pause);
  };
  const tapXY = async (x, y) => {
    await finger(x, y);
    await page.evaluate(([x, y]) => {
      const r = document.createElement("div");
      r.className = "fx-ripple";
      r.style.left = x + "px";
      r.style.top = y + "px";
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }, [x, y]);
    await page.mouse.click(x, y);
    await wait(200);
  };
  // a finger (or, off camera, the mouse alone) drags the sky to pan the map
  const drag = async (x0, y0, x1, y1, show = true) => {
    if (show) await finger(x0, y0);
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    const n = 14;
    for (let i = 1; i <= n; i++) {
      const k = i / n, e = k * k * (3 - 2 * k), x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e;
      await page.mouse.move(x, y);
      if (show) await page.evaluate(([x, y]) => { const f = document.getElementById("fx-finger"); f.style.transition = "opacity .16s, transform .16s"; f.style.left = x + "px"; f.style.top = y + "px"; }, [x, y]);
      await wait(28);
    }
    await page.mouse.up();
    if (show) await page.evaluate(() => (document.getElementById("fx-finger").style.transition = ""));
    await wait(250);
  };
  // the task panel, big enough to read and centred: one zoom in (if small), then a pan
  const frameBoard = async (top, show = true) => {
    const board = page.locator("aside.task-board").first();
    let bx = await board.boundingBox();
    if (bx.width < 260) {
      if (show) await tap(page.getByRole("button", { name: "Zoom in (+)" }));
      else await page.getByRole("button", { name: "Zoom in (+)" }).click();
      await wait(700);
      bx = await board.boundingBox();
    }
    const dx = (390 - bx.width) / 2 - bx.x, dy = top - bx.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) await drag(28, 330, 28 + dx, 330 + dy, show);
    await wait(300);
  };
  // with a route open (a press outside would close it) the map glides by two-finger scroll so the panel fits
  const fitOpen = async () => {
    const bx = await page.locator("aside.task-board").first().boundingBox();
    let dx = 0, dy = 0;
    if (bx.x + bx.width > 384) dx = 384 - (bx.x + bx.width);
    if (bx.x + dx < 6) dx = 6 - bx.x;
    if (bx.y + bx.height > 735) dy = 735 - (bx.y + bx.height);
    if (bx.y + dy < 222) dy = 222 - bx.y;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    await page.mouse.move(14, 640);
    const n = 10;
    for (let i = 0; i < n; i++) {
      await page.mouse.wheel(-dx / n + 0.01, -dy / n + 0.01);
      await wait(30);
    }
    await wait(250);
  };
  const lift = () => page.evaluate(() => document.getElementById("fx-finger").classList.remove("on"));
  const type = async (loc, text, delay = 55) => {
    await tap(loc, { pause: 120 });
    await lift();
    await loc.pressSequentially(text, { delay: delay / SLOW });
    await wait(200);
  };
  const want = (c) => !ONLY.length || ONLY.includes(c);
  const routeBtn = (n) => page.getByRole("button", { name: `Route of task ${n}`, exact: true });
  const openRoute = async (n) => {
    await tap(routeBtn(n));
    const panel = page.locator(".tb-route");
    if (!(await panel.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false))) await tap(routeBtn(n));
    await panel.waitFor({ state: "visible", timeout: 5000 });
    await wait(250);
    await fitOpen();
  };

  // ===== 1. space: create a private space "Studio Nova" with a passcode
  if (want("space")) startRec("space");
  await wait(500);
  await tap(page.locator(".m-bar").getByRole("button", { name: "Spaces", exact: true }));
  await wait(400);
  await tap(page.getByRole("tab", { name: "Create" }));
  await type(page.getByPlaceholder("Studio, Family, Team…"), "Studio Nova");
  await tap(page.getByRole("radio", { name: "Private" }));
  await type(page.getByPlaceholder("4+ characters"), "nova-2026", 70);
  await type(page.getByPlaceholder("How others see your objects"), ME);
  await tap(page.getByRole("button", { name: /Create private space/ }));
  await lift();
  await wait(1500);
  if (want("space")) await stopRec(600);

  // ===== 2. task: "New logo" for Maya, route In progress → In review → Approved → Delivered
  if (want("task")) startRec("task");
  await wait(300);
  await tap(page.locator(".m-bar").getByRole("button", { name: /^Menu/ }));
  await wait(250);
  await tap(page.locator(".m-tile", { hasText: "Tasks" }));
  await wait(400);
  await type(page.getByPlaceholder("Write the task… (@name to assign)"), "New logo @Maya");
  await wait(300);
  await page.keyboard.press("Enter");
  await wait(1100);
  // phones start the board folded: open it
  const head = page.locator(".task-board .tb-head").first();
  if ((await head.getAttribute("aria-expanded")) === "false") await tap(head);
  await wait(300);
  await frameBoard(250);
  await openRoute(1);
  await wait(250);
  for (const s of ["In progress", "In review", "Approved", "Delivered"]) {
    await tap(page.locator(".tr-presets button", { hasText: s }), { pause: 250 });
    await fitOpen();
  }
  await lift();
  await wait(500);
  if (want("task")) await stopRec(600);
  // close the route panel (no frames)
  await page.keyboard.press("Escape");
  await wait(400);

  // ===== 3. attach: a folder wired to Task 1
  if (want("attach")) startRec("attach");
  await wait(300);
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser", { timeout: 8000 }),
    tap(page.getByRole("button", { name: "Attach a folder to task 1" })),
  ]);
  await chooser.setFiles(folder).catch(async (e) => {
    console.log("folder pick failed, sending files:", e.message);
    await chooser.setFiles(fs.readdirSync(folder).map((f) => path.join(folder, f)));
  });
  await lift();
  await wait(1100);
  // the send card: Task 1 is already picked; scroll its button in and send
  const send = page.locator(".cta", { hasText: "Send" }).last();
  await tap(send);
  await lift();
  await wait(3200);
  if (want("attach")) await stopRec(600);
  // off camera: dismiss the "in orbit" notice so it does not cover the void
  await page.getByRole("button", { name: "Close", exact: true }).last().click().catch(() => {});
  await wait(400);

  // ===== 4. move: walk Task 1 along its route (orange → blue → green)
  await frameBoard(Number(process.env.MOVE_TOP) || 300, false);
  if (process.env.SHOT) await page.screenshot({ path: path.join(OUT, "framing.png") });
  if (want("move")) startRec("move");
  await wait(300);
  await openRoute(1);
  await wait(300);
  for (const s of ["In progress", "In review", "Approved", "Delivered"]) {
    await tap(page.getByRole("button", { name: `Move to ${s}`, exact: true }), { pause: 700 });
  }
  await lift();
  await wait(300);
  await page.keyboard.press("Escape"); // closes the route: the row with its green dot
  await lift();
  await wait(600);
  if (want("move")) await stopRec(600);

  // ===== 5. cancel: "Poster" for Sam, started, then cancelled (red)
  if (want("cancel")) startRec("cancel");
  await wait(300);
  await tap(page.locator(".m-bar").getByRole("button", { name: /^Menu/ }));
  await wait(250);
  await tap(page.locator(".m-tile", { hasText: "Tasks" }));
  await wait(400);
  await type(page.getByPlaceholder("Write the task… (@name to assign)"), "Poster @Sam");
  await page.keyboard.press("Enter");
  await wait(1100);
  await frameBoard(Number(process.env.MOVE_TOP) || 300);
  await openRoute(2);
  await wait(300);
  for (const s of ["In progress", "In review"]) {
    await tap(page.locator(".tr-presets button", { hasText: s }), { pause: 250 });
    await fitOpen();
  }
  await tap(page.getByRole("button", { name: "Move to In progress", exact: true }), { pause: 600 });
  await tap(page.locator(".tr-cancel"), { pause: 700 });
  await page.keyboard.press("Escape");
  await lift();
  await wait(600);
  if (want("cancel")) await stopRec(600);

  await b.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
