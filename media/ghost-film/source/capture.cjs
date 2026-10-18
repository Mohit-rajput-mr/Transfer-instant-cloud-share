// Real phone screens of orbitransfer.com (served locally with `next start -p 3160`, every API call mocked):
// node capture.cjs  → shots/*.png (390×844 @3x)
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });
const now = Date.now();
const orb = (id, name, fileName, mime, size, hue, ago, extra = {}) => ({ id, name, fileName, mime, size, salt: "AAAAAAAAAAAAAAAAAAAAAA==", iterations: 100000, hue, status: "ready", netHash: "n1", maxDownloads: null, downloads: 0, devices: 0, views: 0, watchers: 1, open: true, life: 30, createdAt: new Date(now - ago * 1000).toISOString(), expiresAt: new Date(now + (1800 - ago) * 1000).toISOString(), ...extra });
const SETS = {
  empty: [],
  one: [orb("lx0001", "Notes", "Notes.zip", "application/zip", 24e6, 30, 4, { open: false })],
  many: [orb("lx0001", "Notes", "Notes.zip", "application/zip", 24e6, 30, 4, { open: false }), orb("pdf001", "Lease", "Lease.pdf", "application/pdf", 1.1e6, 210, 140), orb("mov001", "Clip", "Clip.mov", "video/quicktime", 38e6, 300, 420), orb("zip001", "Shoot", "Shoot.zip", "application/zip", 220e6, 150, 900)],
};
async function shot(b, set, file, act) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  await ctx.routeWebSocket(/realtime|wss/, () => {});
  await ctx.addInitScript(() => { try { localStorage.setItem("orbit:geo-asked", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.route("**/api/**", (r) => {
    const p = new URL(r.request().url()).pathname;
    if (p === "/api/transfers" || p.endsWith("/transfers")) return r.fulfill({ json: { items: SETS[set], bubbles: [], tasks: [], online: 6, now: Date.now() } });
    if (/\/api\/transfers\/\w+$/.test(p)) return r.fulfill({ json: SETS[set].find((o) => p.endsWith(o.id)) ?? {} });
    if (p.endsWith("/thumb")) return r.fulfill({ status: 404, body: "" });
    return r.fulfill({ json: { ok: true } });
  });
  await page.goto("http://localhost:3200/", { waitUntil: "load" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(2600);
  if (file !== "space") await page.locator(".area-x").first().click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(300);
  if (act) await act(page);
  await page.screenshot({ path: path.join(OUT, file + ".png") });
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  await shot(b, "empty", "empty");
  await shot(b, "one", "one");
  const openSpaces = async (p) => { await p.locator("button", { hasText: "Spaces" }).last().click({ force: true }).catch(() => {}); await p.waitForTimeout(1200); };
  await shot(b, "one", "space", async (p) => { await p.getByRole("button", { name: "Create your space" }).first().click({ force: true }); await p.waitForTimeout(1500); await p.locator(".spaces-pop button", { hasText: /^create$/i }).first().click({ force: true }).catch((e) => console.log("tab", e.message)); await p.waitForTimeout(800); const ins = p.locator(".spaces-pop input"); await ins.nth(0).fill("Night crew").catch(() => {}); await p.locator(".spaces-pop button", { hasText: /private/i }).first().click({ force: true }).catch(() => {}); await p.waitForTimeout(400); await ins.nth(1).fill("ghost").catch(() => {}); await p.waitForTimeout(700); });
  await shot(b, "one", "card", async (p) => { await p.locator(`[data-orb="lx0001"] .orb`).first().click({ force: true }); await p.waitForTimeout(1200); });
  await b.close();
  console.log(fs.readdirSync(OUT));
})();
