const L = require("./lib.cjs");
const fs = require("fs");
const OUT = __dirname + "/cap2";
const { subtle } = globalThis.crypto;
const which = process.argv[2] || "all";
const DESK = { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 };
const PHONE = { ...L.devices["iPhone 13"] };
const b64 = (u) => Buffer.from(u).toString("base64");
const CODE = "NOVA42";
async function encrypt(plain, iterations = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), nonce = crypto.getRandomValues(new Uint8Array(8));
  const base = await subtle.importKey("raw", new TextEncoder().encode(CODE), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 512));
  const key = await subtle.importKey("raw", bits.slice(0, 32), "AES-GCM", false, ["encrypt"]);
  const iv = new Uint8Array(12); iv.set(nonce); new DataView(iv.buffer).setUint32(8, 0);
  return { salt: b64(salt), nonce: b64(nonce), ct: new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: new Uint8Array([1]) }, key, plain)) };
}
const VOID = [
  L.mkOrb("trip01", "Trip photos", "Trip photos.files", "application/x-orbit-folder", 148e6, 205, 24, { views: 4, downloads: 2, watchers: 1 }),
  L.mkOrb("deck02", "Pitch deck", "Pitch deck.pdf", "application/pdf", 12.4e6, 32, 18, { views: 2, downloads: 1 }),
  L.mkOrb("raw003", "Raw footage", "Raw footage.mov", "video/quicktime", 890e6, 150, 27, { views: 1 }),
  L.mkOrb("wifi04", "Wifi + address", "note.txt", "text/plain", 120, 280, 12, { views: 3, downloads: 3 }),
  L.mkOrb("brand5", "Brand assets", "Brand assets.folder", "application/x-orbit-folder", 64e6, 330, 21, { views: 1, watchers: 2 }),
  L.mkOrb("track6", "Final mix", "Final mix.wav", "audio/wav", 52e6, 95, 8, { downloads: 1 }),
];
const shots = {
  async desk(b) {
    const { page } = await L.open(b, DESK);
    await L.capture(page, OUT + "/desk", "idle", 1200);
    await page.click(".up-pill");
    await L.capture(page, OUT + "/desk", "split", 1300);
  },
  async send(b) {
    const { page } = await L.open(b, DESK, {
      init: async (page, st) => {
        await page.route("https://vercel.com/api/blob/**", async (r) => { await new Promise((ok) => setTimeout(ok, 2500)); r.fulfill({ json: { url: "https://s.public.blob.vercel-storage.com/o/nova42.bin", downloadUrl: "https://s.public.blob.vercel-storage.com/o/nova42.bin?download=1", pathname: "o/nova42.bin", contentType: "application/octet-stream", contentDisposition: "inline" } }); });
        await page.route(/\/finalize$/, (r) => { const o = L.mkOrb("nova42", "Trip photos", "Trip photos.files", "application/x-orbit-folder", 3 * 41000, st.hue ?? 205, 30); st.items = [o]; r.fulfill({ json: o }); });
        page.on("request", (q) => { if (q.url().endsWith("/api/transfers") && q.method() === "POST") st.hue = q.postDataJSON().hue; });
      },
    });
    const files = ["Beach.jpg", "Sunset.jpg", "Night city.jpg"].map((name, i) => ({ name, mimeType: "image/jpeg", buffer: Buffer.alloc(41000, i + 1) }));
    await page.locator('input[type="file"]').first().setInputFiles(files);
    await L.capture(page, OUT + "/send", "open", 800);
    await page.fill(".drawer .line-input:not(.code-input)", "Trip photos");
    await page.focus(".code-input");
    for (const ch of CODE) { await page.keyboard.type(ch); await L.capture(page, OUT + "/send", `type${ch}`, 130); }
    await L.capture(page, OUT + "/send", "hold", 350);
    await page.click(".drawer .cta");
    await L.capture(page, OUT + "/send", "launch", 3200);
  },
  async void(b) {
    const { page } = await L.open(b, DESK, { items: VOID });
    await L.step(page, 2500, 100);
    await L.capture(page, OUT + "/void", "drift", 3000);
  },
  async phone(b) {
    const img = fs.readFileSync(__dirname + "/dusk.jpg");
    const enc = await encrypt(img);
    const orb = L.mkOrb("dusk77", "Dusk over the ridge", "Dusk.jpg", "image/jpeg", img.length, 18, 26, { salt: enc.salt, views: 1 });
    const { page } = await L.open(b, PHONE, {
      items: [orb], url: "/?o=dusk77",
      init: async (page) => {
        await page.route(/\/api\/transfers\/dusk77$/, (r) => r.fulfill({ json: orb }));
        await page.route(/\/unlock$/, (r) => r.fulfill({ json: { ok: true, url: "https://mock-blob.example/d.bin", nonce: enc.nonce, chunkSize: 8 * 1024 * 1024, fileName: "Dusk.jpg", mime: "image/jpeg", size: img.length } }));
        await page.route("https://mock-blob.example/**", (r) => r.fulfill({ body: Buffer.from(enc.ct), headers: { "access-control-allow-origin": "*" } }));
        await page.addInitScript(() => {
          navigator.canShare = () => true;
          navigator.share = () => new Promise((ok) => (window.__share = ok));
        });
      },
    });
    await L.capture(page, OUT + "/phone", "sheet", 900);
    await page.focus(".code-input");
    for (const ch of CODE) { await page.keyboard.type(ch); await L.capture(page, OUT + "/phone", `type${ch}`, 120); }
    await page.click(".drawer .cta");
    for (let i = 0; i < 40 && !(await page.locator(".cta.lead").count()); i++) { await L.capture(page, OUT + "/phone", `dec${String(i).padStart(2, "0")}`, 50); }
    await L.capture(page, OUT + "/phone", "ready", 1600);
    await page.click(".cta.lead");
    await L.capture(page, OUT + "/phone", "sharing", 400);
    await page.evaluate(() => window.__share && window.__share());
    await L.capture(page, OUT + "/phone", "saved", 1400);
  },
  async menu(b) {
    const { page } = await L.open(b, PHONE, { items: VOID.slice(0, 3) });
    await L.step(page, 2000, 100);
    await L.capture(page, OUT + "/pmenu", "idle", 500);
    await page.click(".send-fab");
    await L.capture(page, OUT + "/pmenu", "open", 1200);
  },
};
(async () => {
  const b = await L.chromium.launch();
  for (const [k, f] of Object.entries(shots)) {
    if (which !== "all" && !which.split(",").includes(k)) continue;
    const t = Date.now();
    await f(b).catch((e) => console.log(k, "FAIL", e.message.slice(0, 300)));
    console.log(k, "done", ((Date.now() - t) / 1000).toFixed(0) + "s");
  }
  await b.close();
})();
