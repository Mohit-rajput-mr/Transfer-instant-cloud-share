// screenshots of tasks + wiring (dev aid): node taskshots.cjs <outDir>
const L = require("./lib.cjs");
const OUT = process.argv[2];
const t = (m) => new Date(L.NOW - m * 60e3).toISOString(), e = (m) => new Date(L.NOW + m * 60e3).toISOString();
const TASKS = [
  { id: "t000000001", num: 1, text: "Final logo files (SVG + PNG)", by: "Mohit", from: "aaaaaaaaaa", createdAt: t(12), expiresAt: e(18), doneAt: t(2), doneBy: "Sofia", assignee: "Sofia" },
  { id: "t000000002", num: 2, text: "Product photos for the landing page", by: "Mohit", from: "aaaaaaaaaa", createdAt: t(11), expiresAt: e(19), doneAt: null, doneBy: null, assignee: "Noah", route: ["In progress", "AI reviewing", "Generating zip", "Zip sent to email"], stage: 1, log: [{ i: 0, name: "In progress", by: "Mohit", at: t(8) }, { i: 1, name: "AI reviewing", by: "Mohit", at: t(2) }] },
  { id: "t000000003", num: 3, text: "Signed contract PDF", by: "Mohit", from: "aaaaaaaaaa", createdAt: t(10), expiresAt: e(20), doneAt: null, doneBy: null, assignee: "Mohit" },
  { id: "t000000004", num: 4, text: "Launch video cut, 60 seconds", by: "Mohit", from: "aaaaaaaaaa", createdAt: t(9), expiresAt: e(21), doneAt: null, doneBy: null, assignee: null },
  { id: "t000000005", num: 5, text: "Press kit folder", by: "Sofia", from: "bbbbbbbbbb", createdAt: t(4), expiresAt: e(26), doneAt: null, doneBy: null, assignee: null },
];
for (const x of TASKS) Object.assign(x, { route: x.route ?? [], stage: x.stage ?? -1, log: x.log ?? [], editedAt: null });
const W = (id, name, file, mime, size, from, by, task, extra = {}) => L.mkOrb(id, name, file, mime, size, 0, 20, { from, by, task, ...extra });
const ITEMS = [
  W("sf01", "logo.svg", "logo.svg", "image/svg+xml", 0.2e6, "bbbbbbbbbb", "Sofia", "t000000001"),
  W("sf02", "logo@2x.png", "logo@2x.png", "image/png", 1.4e6, "bbbbbbbbbb", "Sofia", "t000000001"),
  W("sf03", "Press kit", "Press kit.files", "application/x-orbit-folder", 84e6, "bbbbbbbbbb", "Sofia", "t000000005"),
  W("nh01", "hero.jpg", "hero.jpg", "image/jpeg", 4.2e6, "cccccccccc", "Noah", "t000000002"),
  W("nh02", "Launch cut v3", "Launch cut v3.mp4", "video/mp4", 820e6, "cccccccccc", "Noah", "t000000004"),
  W("mh01", "Contract signed", "Contract signed.pdf", "application/pdf", 0.6e6, "dddddddddd", "Lena", "t000000003"),
  L.mkOrb("xx01", "Random notes", "notes.txt", "text/plain", 0.01e6, 120, 25),
];
if (!process.argv[3]) (async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  for (const [name, opts] of [["desk", { viewport: { width: 1440, height: 900 } }], ["phone", { ...L.devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }]]) {
    const { page, ctx } = await L.open(b, opts, {
      items: [...ITEMS],
      init: async (p, st) => {
        await p.addInitScript(() => { localStorage.setItem("orbit:bubble-name", "Mohit"); localStorage.setItem("orbit:pro", "PRO-TEST00-ABCDEFGH"); localStorage.setItem("orbit:tasks", JSON.stringify({ t000000001: "x".repeat(64), t000000002: "x".repeat(64) })); });
        st.custom = async (r, path, m) => {
          if (path === "/api/transfers" && m === "GET") return r.fulfill({ json: { items: st.items, bubbles: [], tasks: TASKS, online: 6, now: L.NOW }, headers: L.CORS }), true;
        };
      },
    });
    await L.step(page, 2500, 100);
    await page.screenshot({ path: `${OUT}/${name}-tasks.png` });
    if (name === "phone") {
      await page.click(".tb-head");
      await L.step(page, 600, 100);
      await page.screenshot({ path: `${OUT}/${name}-tasks-open.png` });
      await page.click(".tb-head");
      await L.step(page, 300, 100);
    }
    if (name === "phone") { await ctx.close(); continue; }
    await page.locator(".tb-main").nth(1).click({ force: true });
    await L.step(page, 800, 100);
    await page.screenshot({ path: `${OUT}/${name}-focus.png` });
    if (name === "desk") {
      await page.locator(".tb-main").nth(1).click({ force: true });
      await page.locator(".tb-row").nth(1).hover();
      await page.locator(".tb-row").nth(1).locator("button[aria-label^='Route']").click({ force: true });
      await L.step(page, 500, 100);
      await page.screenshot({ path: `${OUT}/desk-route.png` });
      await page.locator(".tb-row").nth(1).locator("button[aria-label^='Route']").click({ force: true });
      await page.locator(".tb-private").click({ force: true });
      await L.step(page, 700, 100);
      await page.screenshot({ path: `${OUT}/desk-private.png` });
      await page.keyboard.press("Escape");
    }
    await ctx.close();
  }
  await b.close();
})();
// the send card wired to a task (desktop): node taskshots.cjs <outDir> send
if (process.argv[3] === "send") (async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  const { page } = await L.open(b, { viewport: { width: 1440, height: 900 } }, {
    items: [...ITEMS],
    init: async (p, st) => {
      st.custom = async (r, path, m) => {
        if (path === "/api/transfers" && m === "GET") return r.fulfill({ json: { items: st.items, bubbles: [], tasks: TASKS, online: 6, now: L.NOW }, headers: L.CORS }), true;
      };
    },
  });
  await L.step(page, 2000, 100);
  await page.locator(".tb-row").nth(3).hover();
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.locator(".tb-row").nth(3).locator(".tb-acts button").first().click()]);
  await fc.setFiles({ name: "Launch cut v4.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(4000, 1) });
  await L.step(page, 1200, 100);
  await page.locator(".wire-done input").check().catch(() => {});
  await L.step(page, 200, 100);
  await page.screenshot({ path: `${process.argv[2]}/desk-send.png` });
  await b.close();
})();
// plugging a cable into a task (desktop): node taskshots.cjs <outDir> plug
if (process.argv[3] === "plug") (async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  const mineOrb = L.mkOrb("my01", "Unit 1", "Unit 1.files", "application/x-orbit-folder", 1.2e6, 160, 28);
  const { page } = await L.open(b, { viewport: { width: 1440, height: 900 } }, {
    items: [...ITEMS, mineOrb],
    init: async (p, st) => {
      await p.addInitScript(() => localStorage.setItem("orbit:own:my01", "a".repeat(64)));
      st.custom = async (r, path, m) => {
        if (path === "/api/transfers" && m === "GET") return r.fulfill({ json: { items: st.items, bubbles: [], tasks: TASKS, online: 6, now: L.NOW }, headers: L.CORS }), true;
      };
    },
  });
  await L.step(page, 2000, 100);
  await page.screenshot({ path: `${process.argv[2]}/plug-0.png` });
  const plug = await page.locator(".wire-plug").first().boundingBox();
  await page.mouse.move(plug.x + 13, plug.y + 13);
  await page.mouse.down();
  await page.mouse.move(800, 500, { steps: 8 });
  await L.step(page, 300, 100);
  await page.screenshot({ path: `${process.argv[2]}/plug-1.png` });
  const row = await page.locator(".tb-row").nth(3).boundingBox();
  await page.mouse.move(row.x + row.width + 40, row.y + row.height / 2, { steps: 8 });
  await L.step(page, 300, 100);
  await page.screenshot({ path: `${process.argv[2]}/plug-2.png` });
  await page.mouse.up();
  await L.step(page, 800, 100);
  await page.screenshot({ path: `${process.argv[2]}/plug-3.png` });
  await b.close();
})();
// Arrange (desktop): node taskshots.cjs <outDir> arrange
if (process.argv[3] === "arrange") (async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  const extra = [
    W("nh03", "hero-2.jpg", "hero-2.jpg", "image/jpeg", 3.9e6, "cccccccccc", "Noah", "t000000002"),
    W("sf04", "logo-dark.svg", "logo-dark.svg", "image/svg+xml", 0.2e6, "bbbbbbbbbb", "Sofia", "t000000001"),
    L.mkOrb("xx02", "Notes 2", "notes2.txt", "text/plain", 0.01e6, 60, 25),
  ];
  const { page } = await L.open(b, { viewport: { width: 1440, height: 900 } }, {
    items: [...ITEMS, ...extra],
    init: async (p, st) => {
      st.custom = async (r, path, m) => {
        if (path === "/api/transfers" && m === "GET") return r.fulfill({ json: { items: st.items, bubbles: [], tasks: TASKS, online: 6, now: L.NOW }, headers: L.CORS }), true;
      };
    },
  });
  await L.step(page, 2000, 100);
  await page.screenshot({ path: `${process.argv[2]}/arrange-0.png` });
  await page.click(".tb-arrange");
  await L.step(page, 1500, 100);
  await page.screenshot({ path: `${process.argv[2]}/arrange-1.png` });
  await b.close();
})();
