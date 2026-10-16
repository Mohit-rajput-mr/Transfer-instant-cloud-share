// screenshots of bubble text (dev aid): node bubshots.cjs <outDir>
const L = require("./lib.cjs");
const OUT = process.argv[2];
const t = (m) => new Date(L.NOW - m * 60e3).toISOString(), e = (m) => new Date(L.NOW + m * 60e3).toISOString();
const BUBBLES = [
  { id: "b1", text: "Wi-Fi for guests: StudioNorth-5G · password orbit2026", by: "Mohit", from: "aaaaaaaaaa", hue: 140, createdAt: t(2), expiresAt: e(28) },
  { id: "b2", text: "Final deck is in the container, check slide 4 https://orbitransfer.com/?o=deck42", by: "Mohit", from: "aaaaaaaaaa", hue: 140, createdAt: t(5), expiresAt: e(25) },
  { id: "b3", text: "Lunch at 1? Thai place downstairs", by: "Sofia", from: "bbbbbbbbbb", hue: 330, createdAt: t(1), expiresAt: e(29) },
  { id: "b4", text: "Promo code for the client: NORTH-25", by: "Noah", from: "cccccccccc", hue: 40, createdAt: t(8), expiresAt: e(22) },
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
          if (path === "/api/transfers" && m === "GET") return r.fulfill({ json: { items: st.items, bubbles: BUBBLES, online: 3, now: L.NOW }, headers: L.CORS }), true;
          if (path === "/api/bubbles") return r.fulfill({ json: { id: "b9xxxxxxxx" }, headers: L.CORS }), true;
        };
      },
    });
    await L.step(page, 1500, 100);
    await page.screenshot({ path: `${OUT}/${name}-board.png` });
    await page.click(".bub-fab");
    await L.step(page, 900, 100);
    await page.fill(".bub-write textarea", "Meeting moved to 3pm, room B");
    await L.step(page, 300, 100);
    await page.screenshot({ path: `${OUT}/${name}-compose.png` });
    await ctx.close();
  }
  await b.close();
})();
