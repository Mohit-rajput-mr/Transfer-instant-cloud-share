// Records the real app for the team film, shot by shot: node capture.cjs [shot,shot…|all] → cap/<shot>/…
const L = require("./lib.cjs");
const fs = require("fs");
const { subtle } = globalThis.crypto;
const OUT = __dirname + "/cap";
const which = (process.argv[2] || "all").split(",");
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25, permissions: ["clipboard-read", "clipboard-write"] };
const PHONE = { ...L.devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
const b64 = (u) => Buffer.from(u).toString("base64");
const JPG = fs.readFileSync(__dirname + "/dusk.jpg");
const PHOTO = Buffer.concat([JPG, Buffer.alloc(18 * 1024 * 1024 - JPG.length)]);
const CHUNK = 8 * 1024 * 1024;

async function seal(plain, pass = "orbit:open", iterations = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), nonce = crypto.getRandomValues(new Uint8Array(8));
  const base = await subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 512));
  const key = await subtle.importKey("raw", bits.slice(0, 32), "AES-GCM", false, ["encrypt"]);
  const n = Math.max(1, Math.ceil(plain.length / CHUNK));
  const parts = [];
  for (let i = 0; i < n; i++) {
    const iv = new Uint8Array(12); iv.set(nonce); new DataView(iv.buffer).setUint32(8, i);
    parts.push(new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: new Uint8Array([i === n - 1 ? 1 : 0]) }, key, plain.subarray(i * CHUNK, (i + 1) * CHUNK))));
  }
  return { salt: b64(salt), nonce: b64(nonce), body: Buffer.concat(parts) };
}

const SLUG = "studio-north";
const crew = (you, names) => names.map((h, i) => ({ id: "m" + i, handle: h, you: h === you }));
const session = (handle, owner) => ({ slug: SLUG, title: "Studio North", priv: true, handle, token: "tok", chan: "chan1", ...(owner ? { owner: "own" } : {}) });
const roomInfo = (you, names, owner) => ({ slug: SLUG, title: "Studio North", priv: true, handle: you, chan: "chan1", owner, members: crew(you, names) });
const inRoom = (o, by) => ({ ...o, space: SLUG, by });
const ROOM_ITEMS = [
  inRoom(L.mkOrb("tn01", "Site photos", "Site photos.files", "application/x-orbit-folder", 84e6, 205, 28, { views: 2, watchers: 1 }), "Ana"),
  inRoom(L.mkOrb("tn02", "Invoice March", "Invoice March.pdf", "application/pdf", 1.2e6, 40, 26, { views: 1 }), "Noah"),
  inRoom(L.mkOrb("tn03", "Logo v2", "Logo v2.svg", "image/svg+xml", 3.4e6, 300, 29, { watchers: 2 }), "Leo"),
];
// the public void, some of it from this office's network ("n1" = same Wi-Fi as the viewer)
const PUBLIC = [
  L.mkOrb("pb01", "Pitch deck", "Pitch deck.pdf", "application/pdf", 12.4e6, 32, 18, { netHash: "n2", views: 2 }),
  L.mkOrb("pb02", "Final mix", "Final mix.wav", "audio/wav", 52e6, 95, 9, { netHash: "n3" }),
  L.mkOrb("pb03", "Wifi + guest code", "note.txt", "text/plain", 120, 280, 22, { netHash: "n1", views: 3 }),
  L.mkOrb("pb04", "Lunch menu", "Lunch menu.pdf", "application/pdf", 0.8e6, 150, 25, { netHash: "n1", views: 5, downloads: 2 }),
  L.mkOrb("pb05", "Trip photos", "Trip photos.files", "application/x-orbit-folder", 148e6, 330, 14, { netHash: "n4" }),
  L.mkOrb("pb06", "Floor plan", "Floor plan.png", "image/png", 6e6, 190, 27, { netHash: "n1", watchers: 1 }),
  L.mkOrb("pb07", "Raw footage", "Raw footage.mov", "video/quicktime", 890e6, 10, 20, { netHash: "n5" }),
];

/** answers for the spaces API (create, search, join, enter, kick) */
function spaceApi(st, cfg) {
  return async (r, p, m) => {
    const j = (json, status = 200) => (r.fulfill({ status, json, headers: L.CORS }), true);
    if (p === "/api/spaces" && m === "POST") return j({ ...session(cfg.handle, true) });
    if (p === "/api/spaces" && m === "GET") return j({ items: cfg.findable ? [{ slug: SLUG, title: "Studio North", priv: true }] : [] });
    if (p === `/api/spaces/${SLUG}/join`) return j(session(cfg.handle, false));
    if (p === `/api/spaces/${SLUG}/enter`) return j(roomInfo(cfg.handle, st.crew, cfg.owner));
    if (p === `/api/spaces/${SLUG}/kick`) {
      const bd = r.request().postDataJSON();
      st.crew = st.crew.filter((h, i) => "m" + i !== bd.target);
      return j({ ok: true });
    }
    if (p === `/api/spaces/${SLUG}/transfers`) return j({ items: st.spaceItems ?? [], online: st.crew.length, now: L.NOW });
    if (cfg.extra) return cfg.extra(r, p, m, j);
    return false;
  };
}

const typeInto = async (page, s, text, ms = 45) => {
  for (const ch of text) {
    await page.keyboard.type(ch);
    await L.cap(page, s, ms);
  }
};

const shots = {
  /** laptop: open Spaces → Create → name, private, passcode, your name → Create; then copy the invite link */
  async create(b) {
    const s = L.shot(OUT + "/create");
    const { page, st } = await L.open(b, DESK, {
      items: PUBLIC.slice(0, 4),
      init: async (page, st) => {
        st.crew = ["Lucas"];
        st.custom = spaceApi(st, { handle: "Lucas", owner: true });
      },
    });
    await L.cap(page, s, 700);
    await L.mark(page, s, "chip", ".space-chip");
    await page.click(".space-chip");
    await L.cap(page, s, 900);
    await L.mark(page, s, "createTab", page.locator(".sp-tabs button", { hasText: "Create" }).first().boundingBox ? await page.locator(".sp-tabs button", { hasText: "Create" }).first().boundingBox() : null);
    await page.locator(".sp-tabs button", { hasText: "Create" }).first().click();
    await L.cap(page, s, 600);
    await L.mark(page, s, "name", ".sp-pane .name-input");
    await page.click(".sp-pane .name-input");
    await typeInto(page, s, "Studio North");
    await L.cap(page, s, 300);
    const priv = page.locator(".sp-pane .seg button", { hasText: "Private" }).first();
    await L.mark(page, s, "private", await priv.boundingBox());
    await priv.click();
    await L.cap(page, s, 500);
    const passInput = page.locator(".sp-pane input").nth(1);
    await L.mark(page, s, "pass", await passInput.boundingBox());
    await passInput.click();
    await typeInto(page, s, "NORTH7");
    await L.cap(page, s, 250);
    const handleInput = page.locator(".sp-pane input").nth(2);
    await L.mark(page, s, "handle", await handleInput.boundingBox());
    await handleInput.click();
    await typeInto(page, s, "Lucas");
    await L.cap(page, s, 350);
    await L.mark(page, s, "create", ".sp-pane .cta");
    await page.click(".sp-pane .cta");
    L.note(s, "created");
    await L.cap(page, s, 2200);
    await L.mark(page, s, "chip2", ".space-chip");
    await page.click(".space-chip");
    await L.cap(page, s, 900);
    const inv = page.locator(".sp-acts button", { hasText: "Copy invite link" }).first();
    await L.mark(page, s, "invite", await inv.boundingBox());
    await inv.click();
    L.note(s, "copied");
    await L.cap(page, s, 1800);
    s.save();
  },

  /** phone: the invite link opens the space, she names herself, types the passcode, and is in */
  async join(b) {
    const s = L.shot(OUT + "/join");
    const { page, st } = await L.open(b, PHONE, {
      url: `/?space=${SLUG}`,
      items: [],
      init: async (page, st) => {
        st.crew = ["Lucas", "Ana"];
        st.custom = spaceApi(st, { handle: "Ana", owner: false, findable: true });
      },
    });
    await L.cap(page, s, 1200);
    await L.mark(page, s, "card", ".sp-card", "tap");
    await page.locator(".sp-card").first().click();
    await L.cap(page, s, 900);
    await L.mark(page, s, "name", ".join-input", "tap");
    await page.locator(".join-input").first().click();
    await typeInto(page, s, "Ana", 90);
    await L.cap(page, s, 300);
    const pass = page.locator(".join-input").nth(1);
    await L.mark(page, s, "pass", await pass.boundingBox(), "tap");
    await pass.click();
    await typeInto(page, s, "NORTH7", 70);
    await L.cap(page, s, 300);
    await L.mark(page, s, "go", ".join-go", "tap");
    await page.locator(".join-go").first().click();
    L.note(s, "in");
    st.spaceItems = [ROOM_ITEMS[0]];
    await L.cap(page, s, 2600);
    s.save();
  },

  /** the team room on three devices: things arrive from Ana, Noah and Leo; the owner removes a guest */
  async room(b) {
    for (const [name, opts, you, owner] of [["room", DESK, "Lucas", true], ["roomphone", PHONE, "Ana", false], ["roommon", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, "Noah", false]]) {
      const s = L.shot(OUT + "/" + name);
      const names = ["Lucas", "Ana", "Noah", "Leo", "Guest"];
      const { page, st } = await L.open(b, opts, {
        items: [],
        space: { slug: SLUG, session: session(you, owner), info: roomInfo(you, names, owner) },
        init: async (page, st) => {
          st.crew = [...names];
          st.custom = spaceApi(st, { handle: you, owner });
        },
      });
      const refresh = () => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await L.cap(page, s, 900);
      for (let i = 0; i < ROOM_ITEMS.length; i++) {
        st.spaceItems = ROOM_ITEMS.slice(0, i + 1);
        await refresh();
        L.note(s, "arrive" + i);
        await L.cap(page, s, 1500);
      }
      if (owner) {
        // tap the guest once (it asks "Remove?"), then again
        const guest = page.locator(".room-crew .crew").nth(4);
        await L.mark(page, s, "guest", await guest.boundingBox());
        await guest.click();
        await L.cap(page, s, 900);
        await L.mark(page, s, "remove", await guest.boundingBox());
        await guest.click();
        L.note(s, "removed");
        await L.cap(page, s, 1400);
        await L.mark(page, s, "exit", ".room-exit", "pos");
      }
      await L.cap(page, s, 1200);
      s.save();
    }
  },

  /** the public void on the office network: tap Nearby, only this Wi-Fi's things stay */
  async nearby(b) {
    const s = L.shot(OUT + "/nearby");
    const { page } = await L.open(b, DESK, { items: [...PUBLIC] });
    await L.step(page, 1500, 100);
    await L.cap(page, s, 1200);
    const near = page.locator(".scope button", { hasText: "Nearby" }).first();
    let box = await near.boundingBox().catch(() => null);
    if (!box) box = await page.locator("button", { hasText: "Nearby" }).first().boundingBox();
    await L.mark(page, s, "near", box);
    await page.locator("button", { hasText: "Nearby" }).first().click();
    L.note(s, "filtered");
    await L.cap(page, s, 2600);
    s.save();
  },

  /** laptop: send a file, open its share card, copy the link (the QR is right there too) */
  async share(b) {
    const s = L.shot(OUT + "/share");
    const { page, st } = await L.open(b, DESK, { items: PUBLIC.slice(0, 3) });
    st.nextIds = ["site42"];
    st.putDelay = 1500;
    await L.cap(page, s, 500);
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click(".send-fab").then(() => L.step(page, 600, 100)).then(() => page.click(".send-menu button"))]);
    await chooser.setFiles({ name: "Site survey.jpg", mimeType: "image/jpeg", buffer: PHOTO });
    await L.step(page, 700, 100);
    await page.fill(".drawer .name-input", "Site survey");
    await L.step(page, 300, 100);
    await L.cap(page, s, 400);
    await L.mark(page, s, "send", ".drawer .cta");
    await page.click(".drawer .cta");
    await L.cap(page, s, 2400);
    const exp = page.locator('.dock-item.done button[aria-label="Expand"]').first();
    await L.mark(page, s, "expand", await exp.boundingBox());
    await exp.click();
    L.note(s, "card");
    await L.cap(page, s, 900);
    await L.mark(page, s, "qr", ".share-mini img", "pos");
    const qrBox = await page.locator(".share-mini img").first().boundingBox();
    s.marks.push({ name: "qrbox", kind: "box", f: s.n, ...qrBox });
    const copy = page.locator(".share-mini .pill", { hasText: "Copy link" }).first();
    await L.mark(page, s, "copy", await copy.boundingBox());
    await copy.click();
    L.note(s, "copied");
    await L.cap(page, s, 2600);
    s.save();
  },

  /** phone: the link (or QR) opens straight on the file; tap download; the photo is there */
  async open(b) {
    const s = L.shot(OUT + "/open");
    const sealed = await seal(PHOTO);
    const orb = L.mkOrb("site42", "Site survey", "Site survey.jpg", "image/jpeg", PHOTO.length, 18, 29, { salt: sealed.salt, netHash: "n9" });
    const { page, st } = await L.open(b, PHONE, {
      url: "/?o=site42",
      items: [orb],
      init: async (page, st) => {
        st.r2.set("site42", sealed.body);
        st.gated = true;
        st.custom = async (r, p) => {
          if (p === "/api/transfers/site42/unlock")
            return r.fulfill({ json: { ok: true, url: "p2p:site42", nonce: sealed.nonce, chunkSize: CHUNK, fileName: orb.fileName, mime: orb.mime, size: orb.size, store: "https://r2.mock/get/site42" }, headers: L.CORS }), true;
        };
        await page.addInitScript(() => {
          navigator.canShare = () => true;
          navigator.share = () => new Promise((ok) => (window.__share = ok));
        });
      },
    });
    await L.cap(page, s, 1000);
    // the link lands on the file: tap it if its card isn't already open
    if (!(await page.locator(".drawer .cta").count())) {
      await L.mark(page, s, "ball", '[data-orb="site42"] .orb-body', "tap");
      await page.locator('[data-orb="site42"] .orb-body').click({ force: true });
      await L.cap(page, s, 1000);
    }
    await L.mark(page, s, "download", ".drawer .cta", "tap");
    await page.click(".drawer .cta");
    for (let i = 0; i < 120 && !(await page.locator(".cta.lead").count()); i++) {
      await L.cap(page, s, 100);
      if (i % 5 === 4) st.pending.shift()?.();
    }
    L.note(s, "ready");
    await L.cap(page, s, 1800);
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
