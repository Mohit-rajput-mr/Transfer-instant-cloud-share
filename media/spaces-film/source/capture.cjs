// Records the real app for the spaces film: node capture.cjs [shot,shot…|all] → cap/<shot>/…
// (the Studio North shots are shared with the team film: cap/create, room, roomphone, roommon)
const L = require("./lib.cjs");
const OUT = __dirname + "/cap";
const which = (process.argv[2] || "all").split(",");
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 };
const MON = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const PHONE = { ...L.devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };

const space = (slug, title, priv) => {
  const session = (handle, owner) => ({ slug, title, priv, handle, token: "tok", chan: "c-" + slug, ...(owner ? { owner: "own" } : {}) });
  const info = (you, names, owner) => ({ slug, title, priv, handle: you, chan: "c-" + slug, owner, members: names.map((h, i) => ({ id: "m" + i, handle: h, you: h === you })) });
  return { slug, title, priv, session, info };
};
const LEAGUE = space("sunday-league", "Sunday League", false);
const FAMILY = space("lopez-family", "Lopez Family", true);
const inS = (sp, o, by) => ({ ...o, space: sp.slug, by });
const LEAGUE_ITEMS = [
  inS(LEAGUE, L.mkOrb("sl01", "Fixtures", "Fixtures.pdf", "application/pdf", 0.6e6, 130, 27, { views: 6, downloads: 4 }), "Kim"),
  inS(LEAGUE, L.mkOrb("sl02", "Team kit order", "Team kit order.xlsx", "application/vnd.ms-excel", 0.2e6, 40, 21, { views: 3 }), "Emma"),
  inS(LEAGUE, L.mkOrb("sl03", "Match photos", "Match photos.files", "application/x-orbit-folder", 96e6, 205, 30, { watchers: 3 }), "Mateo"),
];
const FAMILY_ITEMS = [
  inS(FAMILY, L.mkOrb("lf01", "Beach day", "Beach day.files", "application/x-orbit-folder", 140e6, 190, 26, { views: 2 }), "Diego"),
  inS(FAMILY, L.mkOrb("lf02", "Paella recipe", "Paella recipe.pdf", "application/pdf", 0.9e6, 30, 28, { views: 1 }), "Rosa"),
  inS(FAMILY, L.mkOrb("lf03", "Birthday video", "Birthday video.mov", "video/quicktime", 320e6, 320, 29, { watchers: 2 }), "Mia"),
];

function api(st, sp, cfg) {
  return async (r, p, m) => {
    const j = (json, status = 200) => (r.fulfill({ status, json, headers: L.CORS }), true);
    if (p === "/api/spaces" && m === "GET") {
      const q = (new URL(r.request().url()).searchParams.get("q") || "").toLowerCase();
      const all = [{ slug: "sunday-league", title: "Sunday League", priv: false }, { slug: "sunset-choir", title: "Sunset Choir", priv: true }, { slug: "sunny-side-cafe", title: "Sunny Side Café", priv: false }];
      return j({ items: q.length >= 2 ? all.filter((x) => x.title.toLowerCase().includes(q)) : [] });
    }
    if (p === `/api/spaces/${sp.slug}/join`) return j(sp.session(cfg.handle, false));
    if (p === `/api/spaces/${sp.slug}/enter`) return j(sp.info(cfg.handle, st.crew, cfg.owner));
    if (p === `/api/spaces/${sp.slug}/transfers`) return j({ items: st.spaceItems ?? [], online: st.crew.length, now: L.NOW });
    return false;
  };
}
const typeInto = async (page, s, text, ms = 70) => { for (const ch of text) { await page.keyboard.type(ch); await L.cap(page, s, ms); } };
const refresh = (page) => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

const shots = {
  /** phone: Spaces → Browse → search "Sunday" → the public league → pick a name → in */
  async browse(b) {
    const s = L.shot(OUT + "/browse");
    const { page, st } = await L.open(b, PHONE, {
      items: [],
      init: async (page, st) => {
        st.crew = ["Kim", "Emma", "Yuki", "Amara", "Mateo"];
        st.spaceItems = LEAGUE_ITEMS.slice(0, 2);
        st.custom = api(st, LEAGUE, { handle: "Mateo", owner: false });
      },
    });
    await L.cap(page, s, 900);
    await L.mark(page, s, "chip", ".space-chip", "tap");
    await page.click(".space-chip");
    await L.cap(page, s, 900);
    const tab = page.locator(".sp-tabs button", { hasText: "Browse" }).first();
    await L.mark(page, s, "browse", await tab.boundingBox(), "tap");
    await tab.click();
    await L.cap(page, s, 600);
    await L.mark(page, s, "search", ".sp-search input", "tap");
    await page.click(".sp-search input");
    await typeInto(page, s, "Sunday", 110);
    await L.cap(page, s, 900);
    const card = page.locator(".sp-card", { hasText: "Sunday League" }).first();
    await L.mark(page, s, "card", await card.boundingBox(), "tap");
    await card.click();
    await L.cap(page, s, 800);
    await L.mark(page, s, "name", ".join-input", "tap");
    await page.locator(".join-input").first().click();
    await typeInto(page, s, "Mateo", 90);
    await L.cap(page, s, 300);
    await L.mark(page, s, "go", ".join-go", "tap");
    await page.locator(".join-go").first().click();
    L.note(s, "in");
    await L.cap(page, s, 2000);
    st.spaceItems = LEAGUE_ITEMS;
    await refresh(page);
    L.note(s, "dropped");
    await L.cap(page, s, 2200);
    s.save();
  },

  /** the coach's desktop in Sunday League: Mateo's match photos land */
  async league(b) {
    const s = L.shot(OUT + "/league");
    const names = ["Kim", "Emma", "Yuki", "Amara", "Mateo"];
    const { page, st } = await L.open(b, MON, {
      items: [],
      space: { slug: LEAGUE.slug, session: LEAGUE.session("Kim", true), info: LEAGUE.info("Kim", names, true) },
      init: async (page, st) => { st.crew = [...names]; st.spaceItems = LEAGUE_ITEMS.slice(0, 2); st.custom = api(st, LEAGUE, { handle: "Kim", owner: true }); },
    });
    await L.cap(page, s, 1600);
    st.spaceItems = LEAGUE_ITEMS;
    await refresh(page);
    L.note(s, "arrive");
    await L.cap(page, s, 3000);
    s.save();
  },

  /** a private family space on a laptop: things keep arriving from everyone */
  async family(b) {
    const s = L.shot(OUT + "/family");
    const names = ["Sofia", "Rosa", "Diego", "Mia"];
    const { page, st } = await L.open(b, DESK, {
      items: [],
      space: { slug: FAMILY.slug, session: FAMILY.session("Sofia", true), info: FAMILY.info("Sofia", names, true) },
      init: async (page, st) => { st.crew = [...names]; st.spaceItems = []; st.custom = api(st, FAMILY, { handle: "Sofia", owner: true }); },
    });
    await L.cap(page, s, 900);
    for (let i = 0; i < FAMILY_ITEMS.length; i++) {
      st.spaceItems = FAMILY_ITEMS.slice(0, i + 1);
      await refresh(page);
      L.note(s, "arrive" + i);
      await L.cap(page, s, 1400);
    }
    await L.cap(page, s, 1000);
    s.save();
  },
};

(async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  for (const [k, f] of Object.entries(shots)) {
    if (!which.includes("all") && !which.includes(k)) continue;
    const t = Date.now();
    await f(b).catch((e) => console.log(k, "FAIL", e.message.slice(0, 500)));
    console.log(k, "done", ((Date.now() - t) / 1000).toFixed(0) + "s");
  }
  await b.close();
})();
