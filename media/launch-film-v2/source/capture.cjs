// Records the real app, shot by shot: node capture.cjs [shot,shot…|all]  → cap/<shot>/00000.png + marks.json
const L = require("./lib.cjs");
const fs = require("fs");
const { subtle } = globalThis.crypto;
const OUT = __dirname + "/cap";
const which = (process.argv[2] || "all").split(",");
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 };
// the full iPhone screen (Playwright's preset is the visible area under Safari's bars; the film draws its own frame)
const PHONE = { ...L.devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
const b64 = (u) => Buffer.from(u).toString("base64");

// the photo that travels through the film: a real JPEG, padded so the download has some size to it
const JPG = fs.readFileSync(__dirname + "/dusk.jpg");
const PHOTO = Buffer.concat([JPG, Buffer.alloc(22 * 1024 * 1024 - JPG.length)]);
const CHUNK = 8 * 1024 * 1024;

/** the app's format: PBKDF2 → AES-GCM chunks, iv = nonce|index, aad = last */
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

// other people's things already floating
const OTHERS = [
  L.mkOrb("deck02", "Pitch deck", "Pitch deck.pdf", "application/pdf", 12.4e6, 32, 18, { views: 2, downloads: 1 }),
  L.mkOrb("mix006", "Final mix", "Final mix.wav", "audio/wav", 52e6, 95, 9, { views: 1 }),
];
const DUSK = (extra = {}) => L.mkOrb("dusk42", "Dusk at the ridge", "Dusk at the ridge.jpg", "image/jpeg", PHOTO.length, 18, 30, extra);

const shots = {
  /** laptop: open Send, pick the photo, name it, send; the ball launches and the copy saves to the cloud */
  async send(b) {
    const s = L.shot(OUT + "/send");
    const { page, st } = await L.open(b, DESK, { items: [...OTHERS] });
    st.nextIds = ["dusk42"];
    st.putDelay = 2600;
    await L.cap(page, s, 900);
    await L.mark(page, s, "fab", ".send-fab");
    await page.click(".send-fab");
    await L.cap(page, s, 800);
    await L.mark(page, s, "files", ".send-menu button");
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click(".send-menu button")]);
    await chooser.setFiles({ name: "Dusk at the ridge.jpg", mimeType: "image/jpeg", buffer: PHOTO });
    await L.cap(page, s, 900);
    await L.mark(page, s, "name", ".drawer .name-input");
    await page.click(".drawer .name-input", { clickCount: 3 });
    for (const ch of "Dusk at the ridge") {
      await page.keyboard.type(ch);
      await L.cap(page, s, 45);
    }
    await L.cap(page, s, 500);
    await L.mark(page, s, "send", ".drawer .cta");
    await page.click(".drawer .cta");
    L.note(s, "sent");
    await L.cap(page, s, 1600);
    L.note(s, "landed");
    await L.mark(page, s, "ball", '[data-orb="dusk42"] .orb-body', "pos");
    for (let i = 0; i < 60 && !(await page.locator(".dock-cloud.ok").count()); i++) await L.cap(page, s, 100);
    L.note(s, "saved");
    await L.mark(page, s, "dock", ".dock-item.done", "pos");
    const dock = await page.locator(".dock-item.done").first().boundingBox();
    s.marks.push({ name: "dockbox", kind: "box", f: s.n, ...dock });
    await L.cap(page, s, 1500);
    s.save();
  },

  /** phone: the ball arrives, a tap opens it, a tap downloads (from the cloud copy), save to Photos */
  async receive(b) {
    const s = L.shot(OUT + "/receive");
    const sealed = await seal(PHOTO);
    const orb = DUSK({ salt: sealed.salt });
    const { page, st } = await L.open(b, PHONE, {
      items: [...OTHERS],
      init: async (page, st) => {
        st.r2.set("dusk42", sealed.body);
        st.gated = true;
        st.custom = async (r, p) => {
          if (p === "/api/transfers/dusk42/unlock")
            return r.fulfill({ json: { ok: true, url: "p2p:dusk42", nonce: sealed.nonce, chunkSize: CHUNK, fileName: orb.fileName, mime: orb.mime, size: orb.size, store: "https://r2.mock/get/dusk42" }, headers: L.CORS }), true;
        };
        await page.addInitScript(() => {
          navigator.canShare = () => true;
          navigator.share = () => new Promise((ok) => (window.__share = ok));
        });
      },
    });
    await L.cap(page, s, 1200);
    // it lands (the realtime beam is replaced by a refresh)
    st.items = [...OTHERS, orb];
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    L.note(s, "arrive");
    await L.cap(page, s, 2400);
    await L.mark(page, s, "ball", '[data-orb="dusk42"] .orb-body', "tap");
    await page.locator('[data-orb="dusk42"] .orb-body').click({ force: true });
    await L.cap(page, s, 1100);
    await L.mark(page, s, "download", ".drawer .cta", "tap");
    await page.click(".drawer .cta");
    L.note(s, "downloading");
    // let a piece of the file through every ~0.6 s of film time, so the progress (and speed) can be seen
    for (let i = 0; i < 120 && !(await page.locator(".cta.lead").count()); i++) {
      await L.cap(page, s, 100);
      if (i % 6 === 5) st.pending.shift()?.();
    }
    L.note(s, "ready");
    await L.cap(page, s, 1400);
    await L.mark(page, s, "save", ".cta.lead", "tap");
    await page.click(".cta.lead");
    await L.cap(page, s, 500);
    await page.evaluate(() => window.__share && window.__share());
    L.note(s, "saved");
    await L.cap(page, s, 1600);
    s.save();
  },

  /** laptop: six files at once, sent as separate balls into one named container; open it, download all */
  async batch(b) {
    const s = L.shot(OUT + "/batch");
    const { page, st } = await L.open(b, DESK, { items: [...OTHERS] });
    st.nextIds = ["bk01", "bk02", "bk03", "bk04", "bk05", "bk06"];
    st.putDelay = 900;
    await page.evaluate(() => localStorage.setItem("orbit:pref:split", "false"));
    await L.cap(page, s, 500);
    const files = ["Logo.svg", "Logo dark.png", "Brand guide.pdf", "Colors.ase", "Fonts.zip", "Hero banner.png"].map((name, i) => ({ name, mimeType: "application/octet-stream", buffer: Buffer.alloc(180_000 * (i + 1), i + 7) }));
    await L.mark(page, s, "fab", ".send-fab");
    await page.click(".send-fab");
    await L.cap(page, s, 700);
    await L.mark(page, s, "files", ".send-menu button");
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click(".send-menu button")]);
    await chooser.setFiles(files);
    await L.cap(page, s, 900);
    await L.mark(page, s, "split", page.locator(".seg button", { hasText: "balls" }).first().boundingBox ? await page.locator(".seg button", { hasText: "balls" }).first().boundingBox() : null);
    await page.locator(".seg button", { hasText: "balls" }).first().click();
    await L.cap(page, s, 500);
    await L.mark(page, s, "name", ".drawer .name-input");
    await page.click(".drawer .name-input", { clickCount: 3 });
    for (const ch of "Brand kit") {
      await page.keyboard.type(ch);
      await L.cap(page, s, 45);
    }
    await L.cap(page, s, 400);
    await L.mark(page, s, "send", ".drawer .cta");
    await page.click(".drawer .cta");
    L.note(s, "sent");
    await L.cap(page, s, 3000);
    await L.mark(page, s, "box", ".orb.group .orb-body");
    await page.locator(".orb.group .orb-body").first().click({ force: true });
    L.note(s, "open");
    await L.cap(page, s, 1600);
    await L.mark(page, s, "all", ".zoom-all");
    await page.click(".zoom-all");
    L.note(s, "all");
    await L.cap(page, s, 2600);
    s.save();
  },

  /** a private space for a team: laptop view, a colleague's file arriving */
  async space(b) {
    for (const [name, opts, handle] of [["space", DESK, "Lucas"], ["spacephone", PHONE, "Sam"]]) {
      const s = L.shot(OUT + "/" + name);
      const members = ["Lucas", "Sofia", "Leo", "Sam"].map((h, i) => ({ id: "m" + i, handle: h, you: h === handle }));
      const space = {
        slug: "design-team",
        session: { slug: "design-team", title: "Design team", priv: true, handle, token: "tok", chan: "chan1" },
        info: { slug: "design-team", title: "Design team", priv: true, handle, chan: "chan1", owner: handle === "Lucas", members },
      };
      const inSpace = (o, by) => ({ ...o, space: "design-team", by });
      const base = [
        inSpace(L.mkOrb("sp01", "Homepage v3", "Homepage v3.fig", "application/octet-stream", 38e6, 265, 24, { views: 3, downloads: 2, watchers: 2 }), "Leo"),
        inSpace(L.mkOrb("sp02", "Client brief", "Client brief.pdf", "application/pdf", 2.1e6, 45, 16, { views: 4, downloads: 3 }), "Sam"),
      ];
      const { page, st } = await L.open(b, opts, { items: [...base], space });
      await L.cap(page, s, 1500);
      st.items = [...base, inSpace(L.mkOrb("sp03", "Moodboard", "Moodboard.png", "image/png", 14e6, 175, 30, { watchers: 1 }), "Sofia")];
      await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      L.note(s, "arrive");
      await L.cap(page, s, 3000);
      s.save();
    }
  },

  /** a ball whose timer runs out: it zooms away */
  async burn(b) {
    const s = L.shot(OUT + "/burn");
    const soon = L.mkOrb("dusk42", "Dusk at the ridge", "Dusk at the ridge.jpg", "image/jpeg", PHOTO.length, 18, 30, { expiresAt: new Date(L.NOW + 3200).toISOString(), createdAt: new Date(L.NOW - 1797e3).toISOString(), downloads: 3, views: 5 });
    const { page } = await L.open(b, DESK, { items: [...OTHERS, soon] });
    await L.mark(page, s, "ball", '[data-orb="dusk42"] .orb-body', "pos");
    await L.cap(page, s, 4200);
    s.save();
  },

  /** the void, busy, for the closing beats */
  async void(b) {
    const s = L.shot(OUT + "/void");
    const many = [
      ...OTHERS,
      L.mkOrb("trip01", "Trip photos", "Trip photos.files", "application/x-orbit-folder", 148e6, 205, 24, { views: 4, downloads: 2, watchers: 1 }),
      L.mkOrb("raw003", "Raw footage", "Raw footage.mov", "video/quicktime", 890e6, 150, 27, { views: 1, watchers: 2 }),
      L.mkOrb("wifi04", "Wifi + address", "note.txt", "text/plain", 120, 280, 12, { views: 3, downloads: 3 }),
      L.mkOrb("cv0005", "My resume", "Resume.pdf", "application/pdf", 0.4e6, 330, 21, { views: 1 }),
    ];
    const { page } = await L.open(b, DESK, { items: many });
    await L.step(page, 2500, 100);
    await L.cap(page, s, 3500);
    s.save();
  },
};

(async () => {
  const b = await L.chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--headless=new"] });
  for (const [k, f] of Object.entries(shots)) {
    if (!which.includes("all") && !which.includes(k)) continue;
    const t = Date.now();
    await f(b).catch((e) => console.log(k, "FAIL", e.message.slice(0, 400)));
    console.log(k, "done", ((Date.now() - t) / 1000).toFixed(0) + "s");
  }
  await b.close();
})();
