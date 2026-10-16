// Real recordings of orbitransfer.com (local build, every server answer mocked) for the intro film.
// node capture.cjs [void|bubbles|styles]   → cap/<shot>/00000.png … + marks.json
const L = require("../../team-film/source/lib.cjs");
const fs = require("fs");
const OUT = __dirname + "/cap";
const DESK = { viewport: { width: 1440, height: 900 } };
const THUMB = Object.fromEntries(["photo", "photo2", "video", "pdf"].map((k) => [k, fs.readFileSync(`${__dirname}/thumbs/${k}.jpg`)]));
const near = (o) => ({ ...o, netHash: "n1" });
const far = (o) => ({ ...o, netHash: "n9" });
const ITEMS = [
  near(L.mkOrb("ph01", "Beach day", "Beach day.jpg", "image/jpeg", 4.2e6, 200, 26, { thumb: true, views: 3 })),
  near(L.mkOrb("vd01", "Final cut", "Final cut.mp4", "video/mp4", 1.8e9, 280, 22, { thumb: true, watchers: 1 })),
  far(L.mkOrb("pd01", "Pitch deck", "Pitch deck.pdf", "application/pdf", 12.4e6, 32, 18, { thumb: true, views: 2 })),
  far(L.mkOrb("zp01", "Trip photos", "Trip photos.zip", "application/zip", 148e6, 330, 14)),
  near(L.mkOrb("au01", "Voice memo", "Voice memo.m4a", "audio/mp4", 3.1e6, 150, 27)),
  far(L.mkOrb("ph02", "Sunset", "Sunset.jpg", "image/jpeg", 5.6e6, 20, 24, { thumb: true })),
  far(L.mkOrb("dc01", "Contract", "Contract.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 0.4e6, 100, 12)),
];
const THUMBS = { ph01: "photo", vd01: "video", pd01: "pdf", ph02: "photo2" };
const t = (m) => new Date(L.NOW - m * 60e3).toISOString(), e = (m) => new Date(L.NOW + m * 60e3).toISOString();
const BUBBLES = [
  { id: "b1", text: "Final cut is in the void, check 0:42\nColour grade is updated too", added: 34, by: "Maya", from: "aaaaaaaaaa", hue: 0, createdAt: t(5), updatedAt: t(0.3), expiresAt: e(25) },
  { id: "b2", text: "Guest Wi-Fi: StudioNorth-5G", by: "Maya", from: "aaaaaaaaaa", hue: 0, createdAt: t(2), expiresAt: e(28) },
  { id: "c1", text: "Lunch at 1? Thai place downstairs", by: "Sofia", from: "bbbbbbbbbb", hue: 0, createdAt: t(1), expiresAt: e(29) },
  { id: "c2", text: "Client call moved to 3pm", by: "Leo", from: "cccccccccc", hue: 0, createdAt: t(3), expiresAt: e(27) },
  { id: "c3", text: "Promo code for the launch: NORTH-25", by: "Noah", from: "dddddddddd", hue: 0, createdAt: t(4), expiresAt: e(26) },
  { id: "c4", text: "Logo files are in the space", by: "Yuki", from: "eeeeeeeeee", hue: 0, createdAt: t(6), expiresAt: e(24) },
  { id: "c5", text: "Who has the HDMI adapter?", by: "Emma", from: "ffffffffff", hue: 0, createdAt: t(7), expiresAt: e(23) },
  { id: "c6", text: "Build is green again", by: "Mateo", from: "gggggggggg", hue: 0, createdAt: t(8), expiresAt: e(22) },
  { id: "c7", text: "Room B is free after 4", by: "Amara", from: "hhhhhhhhhh", hue: 0, createdAt: t(9), expiresAt: e(21) },
];

function mocks(withBubbles) {
  return async (p, st) => {
    if (withBubbles) await p.addInitScript(() => localStorage.setItem("orbit:bubbles", JSON.stringify({ b1: "x".repeat(64), b2: "x".repeat(64) })));
    st.custom = async (r, path, m) => {
      let mm;
      if (path === "/api/transfers" && m === "GET") return r.fulfill({ json: { items: st.items, bubbles: withBubbles ? BUBBLES : [], online: 9, now: L.NOW }, headers: L.CORS }), true;
      if ((mm = path.match(/^\/api\/transfers\/(\w+)\/thumb$/)) && THUMBS[mm[1]]) return r.fulfill({ body: THUMB[THUMBS[mm[1]]], headers: { ...L.CORS, "content-type": "image/jpeg" } }), true;
    };
  };
}

const SHOTS = {
  async void(b) {
    const s = L.shot(OUT + "/void");
    const { page, ctx } = await L.open(b, DESK, { items: [...ITEMS], init: mocks(false) });
    await L.step(page, 2500, 100);
    await L.cap(page, s, 2400);
    const nb = page.locator(".kinds-wrap ~ * button, button").filter({ hasText: /^Nearby/ }).first();
    await L.mark(page, s, "near", nb);
    await nb.click();
    await L.cap(page, s, 2600);
    s.save();
    await ctx.close();
  },
  async bubbles(b) {
    const s = L.shot(OUT + "/bubbles");
    const { page, ctx } = await L.open(b, DESK, { items: ITEMS.slice(0, 4), init: mocks(true) });
    await L.step(page, 2500, 100);
    await L.cap(page, s, 1600);
    await L.mark(page, s, "board", ".bub-open");
    await page.click(".bub-open");
    await L.cap(page, s, 1700);
    const sofia = page.locator(".bs-rail li button").filter({ hasText: "Sofia" });
    await L.mark(page, s, "sofia", sofia);
    await sofia.click();
    await L.cap(page, s, 1500);
    const maya = page.locator(".bs-rail li button").first();
    await L.mark(page, s, "maya", maya);
    await maya.click();
    await L.cap(page, s, 1800);
    s.save();
    await ctx.close();
  },
  async styles(b) {
    const s = L.shot(OUT + "/styles");
    const LOOKS = ["orbit", "chrome", "wood", "neon", "pixel", "candy", "gold", "polaroid"];
    for (const look of LOOKS) {
      const { page, ctx } = await L.open(b, DESK, {
        items: ITEMS.slice(0, 6),
        init: async (p, st) => {
          await p.addInitScript((k) => localStorage.setItem("orbit:skin", k), look);
          await mocks(false)(p, st);
        },
      });
      await L.step(page, 2500, 100);
      L.note(s, look);
      await L.cap(page, s, 700);
      await ctx.close();
    }
    s.save();
  },
};

(async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  for (const k of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS)) {
    const t0 = Date.now();
    await SHOTS[k](b);
    console.log(k, ((Date.now() - t0) / 1000).toFixed(0), "s");
  }
  await b.close();
})();
