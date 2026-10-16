// screenshots of bubble text v2 (dev aid): node bubshots2.cjs <outDir>
const L = require("./lib.cjs");
const OUT = process.argv[2];
const t = (m) => new Date(L.NOW - m * 60e3).toISOString(), e = (m) => new Date(L.NOW + m * 60e3).toISOString();
const NAMES = ["Sofia", "Noah", "Amaya", "Jackson", "Lena", "Mateo", "Yuki", "Omar", "Chloe", "Lucas", "Aria", "Felix", "Nina"];
const LINES = ["Lunch at 1? Thai place downstairs", "Promo code for the client: NORTH-25", "Slides are in the container", "Can someone send the logo in SVG?", "Standup moved to 10:15", "Build is green again", "Room B is free after 3", "Wi-Fi password changed, ask me", "Coffee run, anyone?", "Shipping the release notes now", "Who has the HDMI adapter?", "Client call in 5", "Remember the deadline is Friday"];
const BUBBLES = [
  { id: "b1", text: "Final deck is in the container, check slide 4\nThe numbers on slide 7 are updated too", added: 46, by: "Mohit", from: "aaaaaaaaaa", hue: 0, createdAt: t(5), updatedAt: t(0.5), expiresAt: e(25) },
  { id: "b2", text: "Wi-Fi for guests: StudioNorth-5G · password orbit2026", editedAt: t(1), updatedAt: t(1), by: "Mohit", from: "aaaaaaaaaa", hue: 0, createdAt: t(2), expiresAt: e(28) },
  ...NAMES.flatMap((n, i) => Array.from({ length: 1 + (i % 3) }, (_, k) => ({ id: `c${i}x${k}`, text: LINES[(i + k * 5) % LINES.length], by: n, from: `f${String(i).padStart(9, "0")}`, hue: 0, createdAt: t(1 + i * 0.7 + k), expiresAt: e(20 - i) }))),
];
const ITEMS = [
  L.mkOrb("pb01", "Pitch deck", "Pitch deck.pdf", "application/pdf", 12.4e6, 32, 18, { views: 2 }),
  L.mkOrb("pb05", "Trip photos", "Trip photos.zip", "application/zip", 148e6, 330, 14),
  L.mkOrb("pb06", "Floor plan", "Floor plan.png", "image/png", 6e6, 190, 27, { watchers: 1 }),
];
(async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  for (const [name, opts] of [["desk", { viewport: { width: 1440, height: 900 } }], ["phone", { ...L.devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }]]) {
    const { page, ctx } = await L.open(b, opts, {
      items: [...ITEMS],
      init: async (p, st) => {
        await p.addInitScript(() => localStorage.setItem("orbit:bubbles", JSON.stringify({ b1: "x".repeat(64), b2: "x".repeat(64) })));
        st.custom = async (r, path, m) => {
          if (path === "/api/transfers" && m === "GET") return r.fulfill({ json: { items: st.items, bubbles: BUBBLES, online: 14, now: L.NOW }, headers: L.CORS }), true;
        };
      },
    });
    await L.step(page, 1500, 100);
    await page.screenshot({ path: `${OUT}/${name}-void.png` });
    await page.click(".bub-open");
    await L.step(page, 1200, 100);
    await page.screenshot({ path: `${OUT}/${name}-board-all.png` });
    await page.locator(".bs-rail li button").nth(3).click();
    await L.step(page, 1200, 100);
    await page.screenshot({ path: `${OUT}/${name}-board-focus.png` });
    await page.locator(".bs-rail li button").first().click();
    await L.step(page, 1200, 100);
    await page.locator(".bs-card.sel .bub-acts button[aria-label='Add more']").first().click();
    await L.step(page, 900, 100);
    await page.fill(".bub-write textarea", "Also: the client wants the PDF by 4pm");
    await L.step(page, 300, 100);
    await page.screenshot({ path: `${OUT}/${name}-append.png` });
    await ctx.close();
  }
  await b.close();
})();
