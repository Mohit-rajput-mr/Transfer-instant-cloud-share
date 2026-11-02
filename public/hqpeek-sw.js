/* HQ preview streamer (components/admin/AdminPeek.tsx). Registered only by the admin page, scoped to /admin.
 * It serves GET /hqpeek/<id> by decrypting the stored (AES-256-GCM, chunked) copy on the fly and streaming the
 * plaintext to the <video>/<audio>/<img>/<iframe>, honouring Range so a big file plays and seeks as it loads
 * instead of being fully decrypted first. The key stays in this browser; nothing is sent anywhere new.
 * Encryption scheme mirrors src/lib/crypto.ts: per-chunk AES-GCM, iv = nonce[0..8) || uint32(index),
 * additionalData = [lastChunk ? 1 : 0], 16-byte tag appended to every chunk. */
const TAG = 16;
const jobs = new Map(); // id -> { key, nonce, storeUrl, size, chunkSize, n, mime }

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "peek" && d.id && d.job) {
    const j = d.job;
    j.n = Math.max(1, Math.ceil(j.size / j.chunkSize));
    jobs.set(d.id, j);
  } else if (d.type === "drop") {
    jobs.delete(d.id);
  }
  if (e.ports && e.ports[0]) e.ports[0].postMessage("ok");
});

function ivFor(nonce, i) {
  const iv = new Uint8Array(12);
  iv.set(nonce.subarray(0, 8));
  new DataView(iv.buffer).setUint32(8, i);
  return iv;
}
// plaintext length of chunk i
function plen(j, i) {
  return i < j.n - 1 ? j.chunkSize : j.size - (j.n - 1) * j.chunkSize;
}
// byte offset of cipher chunk i in the stored blob (every earlier chunk is chunkSize + TAG)
function cOff(j, i) {
  return i * (j.chunkSize + TAG);
}

async function plainChunk(j, i, signal) {
  const len = plen(j, i) + TAG;
  const off = cOff(j, i);
  const res = await fetch(j.storeUrl, { headers: { Range: `bytes=${off}-${off + len - 1}` }, signal });
  if (res.status !== 206 && res.status !== 200) throw new Error("store " + res.status);
  let cipher = new Uint8Array(await res.arrayBuffer());
  if (res.status === 200) cipher = cipher.subarray(off, off + len); // server ignored Range: slice it out
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivFor(j.nonce, i), additionalData: new Uint8Array([i === j.n - 1 ? 1 : 0]) },
    j.key,
    cipher,
  );
  return new Uint8Array(plain);
}

// a readable stream of plaintext bytes [start, end] inclusive, chunk by chunk so playback starts at once
function body(j, start, end) {
  let i = Math.floor(start / j.chunkSize);
  const ac = new AbortController();
  return new ReadableStream({
    async pull(ctrl) {
      try {
        if (i * j.chunkSize > end) return ctrl.close();
        const base = i * j.chunkSize;
        const pc = await plainChunk(j, i, ac.signal);
        const from = Math.max(0, start - base);
        const to = Math.min(pc.length, end - base + 1);
        if (to > from) ctrl.enqueue(pc.subarray(from, to));
        i++;
        if (i >= j.n || i * j.chunkSize > end) ctrl.close();
      } catch (err) {
        ctrl.error(err);
      }
    },
    cancel() {
      ac.abort();
    },
  });
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const m = url.pathname.match(/^\/hqpeek\/([\w-]+)$/);
  if (!m) return; // every other request passes straight through to the network
  const j = jobs.get(m[1]);
  if (!j) return void e.respondWith(new Response("gone", { status: 404 }));
  e.respondWith(serve(e.request, j));
});

function serve(req, j) {
  const range = req.headers.get("range");
  const common = {
    "Content-Type": j.mime || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (range) {
    const mm = /bytes=(\d+)-(\d*)/.exec(range);
    const start = mm ? parseInt(mm[1], 10) : 0;
    const end = mm && mm[2] ? Math.min(parseInt(mm[2], 10), j.size - 1) : j.size - 1;
    if (!(start >= 0 && start <= end && end < j.size)) {
      return new Response(null, { status: 416, headers: { ...common, "Content-Range": `bytes */${j.size}` } });
    }
    return new Response(body(j, start, end), {
      status: 206,
      headers: { ...common, "Content-Range": `bytes ${start}-${end}/${j.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(body(j, 0, j.size - 1), { status: 200, headers: { ...common, "Content-Length": String(j.size) } });
}
