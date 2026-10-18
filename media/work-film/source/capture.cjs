// Real screens of orbitransfer.com/work (the live claude/work build served locally on :3200, every API call mocked):
// node capture.cjs  → shots/*.png
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "shots"); fs.mkdirSync(OUT, { recursive: true });
const now = Date.now(), iso = (s) => new Date(now + s * 1000).toISOString();
const orb = (id, name, fileName, mime, size, hue, ago, from = "d1") => ({ id, name, fileName, mime, size, salt: "AAAAAAAAAAAAAAAAAAAAAA==", iterations: 100000, hue, status: "ready", netHash: "n1", from, maxDownloads: null, downloads: 0, devices: 0, views: 0, watchers: 1, open: true, life: 30, createdAt: iso(-ago), expiresAt: iso(1800 - ago) });
const bub = (id, text, by, hue, ago) => ({ id, text, by, from: by, hue, createdAt: iso(-ago), expiresAt: iso(1800 - ago) });
const task = (id, num, text, by, assignee, route, stage, ago, done) => ({ id, num, text, by, from: by, createdAt: iso(-ago), expiresAt: iso(1800 - ago), doneAt: done ? iso(-5) : null, doneBy: done ? assignee : null, assignee, route, stage, log: [], editedAt: null });
const R = ["Doing", "Review", "Done"];
const SETS = {
  empty: { items: [], bubbles: [], tasks: [] },
  files: { items: [orb("pdf001", "Q3 deck", "Q3-deck.pdf", "application/pdf", 8.4e6, 210, 40), orb("xls001", "Budget", "Budget.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 1.2e6, 140, 90, "d2"), orb("mov001", "Demo cut", "Demo.mp4", "video/mp4", 640e6, 300, 200, "d3"), orb("zip001", "Logos", "Logos.zip", "application/zip", 52e6, 30, 300, "d2")], bubbles: [], tasks: [] },
  chat: { items: [orb("pdf001", "Q3 deck", "Q3-deck.pdf", "application/pdf", 8.4e6, 210, 40)], bubbles: [bub("b1", "Deck is up, check slide 4", "Maya", 300, 30), bub("b2", "Looks great! Fixing the chart", "Leo", 150, 20), bub("b3", "Pizza at 1? 🍕", "Sam", 40, 8)], tasks: [] },
  notes: { items: [orb("pdf001", "Q3 deck", "Q3-deck.pdf", "application/pdf", 8.4e6, 210, 40), orb("xls001", "Budget", "Budget.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 1.2e6, 140, 90, "d2")], bubbles: [bub("b1", "Deck is up, check slide 4", "Maya", 300, 50), bub("b2", "On it! Fixing the chart", "Leo", 150, 35), bub("b3", "Budget’s in, take a look", "Sam", 40, 20), bub("b4", "Pizza at 1? 🍕", "Priya", 200, 6)], tasks: [] },
  deck: { items: [orb("pdf001", "Q3 deck", "Q3-deck.pdf", "application/pdf", 8.4e6, 210, 1)], bubbles: [], tasks: [] },
  done: { items: [orb("pdf001", "Q3 deck", "Q3-deck.pdf", "application/pdf", 8.4e6, 210, 40)], bubbles: [bub("b2", "Chart fixed ✅", "Leo", 150, 4)],
    tasks: [task("t1", 1, "Fix the chart on slide 4", "Maya", "Leo", R, 2, 60, true), task("t2", 2, "Send budget to finance", "Maya", "Sam", R, 2, 120, true), task("t3", 3, "Book the client call", "Leo", "Maya", R, 2, 200, true)] },
  tasks: { items: [orb("pdf001", "Q3 deck", "Q3-deck.pdf", "application/pdf", 8.4e6, 210, 40)], bubbles: [bub("b1", "Deck is up, check slide 4", "Maya", 300, 30), bub("b2", "Looks great! Fixing the chart", "Leo", 150, 20)],
    tasks: [task("t1", 1, "Fix the chart on slide 4", "Maya", "Leo", R, 0, 60), task("t2", 2, "Send budget to finance", "Maya", "Sam", R, 1, 120), task("t3", 3, "Book the client call", "Leo", "Maya", R, -1, 200), task("t4", 4, "Print the handouts", "Sam", "Priya", R, -1, 30)] },
};
async function shot(b, set, file, view, act) {
  const phone = view === "phone";
  const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.routeWebSocket(/realtime|wss|8787/, () => {});
  await ctx.addInitScript(() => { try { localStorage.setItem("orbit:geo-asked", "1"); localStorage.setItem("orbit:bubble-name", "Maya"); localStorage.setItem("orbit:work-theme", "light"); } catch {} });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.route("**/api/**", (r) => {
    const p = new URL(r.request().url()).pathname;
    if (p === "/api/transfers") return r.fulfill({ json: { ...SETS[set], online: 6, now: Date.now() } });
    if (/\/api\/transfers\/\w+$/.test(p)) return r.fulfill({ json: SETS[set].items.find((o) => p.endsWith(o.id)) ?? {} });
    if (p.endsWith("/thumb")) return r.fulfill({ status: 404, body: "" });
    if (p === "/api/version") return r.fulfill({ json: { release: 0 } });
    return r.fulfill({ json: { ok: true } });
  });
  await page.goto("http://localhost:3200/work", { waitUntil: "load" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(3500);
  await page.locator(".area-x").first().click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(400);
  if (!phone) { await page.getByRole("button", { name: /^Zoom in/ }).first().click({ force: true }).catch(() => {}); await page.waitForTimeout(900); }
  if (act) await act(page);
  await page.screenshot({ path: path.join(OUT, file + ".png") });
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  const only = process.argv[2];
  const openTasks = async (p) => { await p.getByRole("button", { name: "Tasks" }).last().click({ force: true }); await p.waitForTimeout(1200); };
  const nearby = async (p) => { await p.getByRole("button", { name: "Nearby" }).first().click({ force: true }).catch(() => {}); await p.waitForTimeout(1200); };
  const jobs = [["empty", "desk-empty", "desk"], ["deck", "desk-deck", "desk"], ["deck", "phone-deck", "phone"], ["notes", "desk-notes", "desk"], ["tasks", "desk-tasks", "desk"], ["done", "desk-done", "desk"],
    ["empty", "phone-empty", "phone"], ["files", "phone-files", "phone"], ["files", "phone-nearby", "phone", nearby], ["notes", "phone-notes", "phone"], ["tasks", "phone-tasks", "phone", openTasks], ["done", "phone-done", "phone", openTasks],
    ["files", "phone-compose", "phone", async (p) => { await openTasks(p); await p.keyboard.type("Fix the chart on slide 4 @Leo", { delay: 20 }); await p.waitForTimeout(500); }],
    ["notes", "phone-notewrite", "phone", async (p) => { await p.getByRole("button", { name: "Note" }).last().click({ force: true }); await p.waitForTimeout(900); await p.keyboard.type("Pizza at 1? 🍕", { delay: 20 }); await p.waitForTimeout(500); }]];
  for (const [s, f, v, a] of jobs) if (!only || f.includes(only)) await shot(b, s, f, v, a);
  await b.close(); console.log(fs.readdirSync(OUT));
})();
