# FLEET SYNC — handover for the next AI agent

Read `CLAUDE.md` first (owner wants SHORT answers, deploy steps, IDs). This file is the live task board.
Last updated: 2026-10-17 (2nd session: A–D done + deployed).
- 2026-10-20: the scope part of session 01DHR116's claim was taken over on the owner's request (that session never pushed): navbar buttons **Open void · Nearby · Wi-Fi** (lib/scope.ts, components/ScopeTabs.tsx). Nearby = only your own area cell (asks for location first; migration 027 puts `area` on each item); Wi-Fi = same netHash. Still open from that claim: worldwide room, ~10 m sound handshake.
- 2026-10-19 (big): Work↔Classic switch is in place (route group src/app/(void)/, VoidShell, lib/view.ts pushState — never Link/router.push/reload). live.ts has outbox + pong watchdog + fast reconnect + resync; landed beams carry the full orb (cleanOrb) and repeat at +2/+6 s; Worker exempts must-messages from the burst limit. lib/net.ts governs upload/serve/peek turns across files; previews only warm small stored copies.
- 2026-10-19: anonymous spaces: 4-letter **knock** (Spaces → Browse; migration 022 applied; invite sealed to the knocker's ECDH key),
  being in an anonymous space always runs a timed session (create: 5–30 min, join: 30), phone ↕ scroll-mode toggle.
- DONE 2026-10-19: `orbit_session_forget` + `orbit_reap_anon` (migration 020) in place (pasted by the owner). The Supabase MCP
  hangs on any SQL containing `delete`: give the owner the SQL to paste in the SQL editor instead.
- 2026-10-19 (superseded by the entry above: the switch is history-only via lib/view.ts, Void never remounts): Work <-> Classic switch in-app.  Realtime (re)subscribe / back online -> refresh + queued beams sent; a landed upload sends a 2nd pulse at 4 s.
  Gentle uploads rest as long as each part took on a busy line. RELEASE bumped (r-2026-10-19-no-reload-switch).
- OPEN: real-device checks (popup on a 2nd device after a Wi-Fi switch, 4-letter knock, big upload on a slow line).
- 2026-10-19: uploads back off when the line chokes (lib/cloud.ts watchNet: RTT probe → 1 lane + pauses), and Work↔Classic asks before reloading during uploads (switchView).
- 2026-10-19: HQ has a **Void** tab (every area: files, notes, tasks; burn any, beamed live to the area; migration 023). Bubble notes default 15 min; tasks default 30 min (options to 8 h); screens drop expired tasks/notes every 5 s.
- 2026-10-18 late: the Vercel connector is read-only (403 on deploy). Vercel project `orbit` is now linked to GitHub, so a push to `claude/festive-keller-rln4jk` should deploy on its own. Work on that branch only.

## ⚠ MANDATORY: docs/ENGINEERING_DIRECTIVE.md (owner, 2026-10-19)
Every agent, every task: root cause, fix the pattern everywhere, verify real behaviour, report honestly, keep this log.

## Defect log (running list — keep it current; newest first)
Severity: C critical · H high · M medium · L low. Status: FIXED (verified how) · OPEN · RISK (to verify).
- 2026-10-27 big pass (owner report: uploads stuck "uploading", other countries never see files, slow, "0%" on
  download, extra "Landed" step, void freezes when a card opens). Commit on claude/focused-newton-dsxsd0 → live branch.
  - FIXED (C) Uploads stuck forever. Evidence: zecsa2 (Mumbai, 20 MB) "uploading" for 1 h in the DB, nothing failed.
    Root cause: the stored copy went up as ONE XHR PUT with no stall timeout (≤32 MB files were a single request) and
    no timeout on /store calls; a half-open connection hung it for good. Fix (lib/cloud.ts): PUT stall watchdog (30 s
    without progress → network error → retried), 25 s timeout on every /store call, 20 s on the CORS probe; parts are
    8 MB now (lib/limits.ts PART_CHUNKS 1, was 4) so a 20 MB file is 3 parallel parts; pages send `pc`, the server
    signs parts for that layout (old tabs without pc keep 4: no corruption across the deploy; resume records keep pc).
    Tests: limits.test.ts. OPEN: real far-away (India) upload not measured from here.
  - FIXED (H) Uploads slow. Desktops ran 1–2 parts with a pause after each whenever the RTT probe rose (it always
    rises under upload). Now (lib/net.ts) 4 lanes, 2 when busy/serving, 1 + pauses only after real part failures in
    the last 2 min (netShaky). Copying the file into IndexedDB (outbox) now runs beside the upload, not before it.
    resumeOutbox skips a copy this page is already uploading (copying()) — "back online" mid-send started a 2nd upload.
  - FIXED (H) "Other countries can't see files": same root cause as above (invisible until stored) + nothing shown
    meanwhile. FLY_TO_OTHERS back on: others see an "arriving NN%" ball at once (not openable; a tap opens it when it
    lands; fades 45 s after its sender goes quiet, so no dead balls). The public list itself is worldwide (checked SQL).
  - FIXED (H) Download "0% for 10 s": progress only moved per decrypted 8 MB chunk and stored ranges were read whole.
    Now ranges stream with byte counts (cloud.ts readAll/onBytes) and decrypt reports arriving bytes (crypto.ts);
    the edge's first range has a 12 s header timeout before falling back to the bucket. Test: progress.test.ts.
  - DONE (owner) One-click download: no "Landed" screen (same card, "✓ Downloaded · in Downloads", Download again);
    a file already fetched in the background is saved INSIDE the tap (measured 180 ms click→download, Chromium), then
    counted. Phones: only iPhone/iPad still get the "Save" step (iOS drops saves outside a tap); Android saves directly.
  - DONE (owner) Passcode-locked files: no preview anywhere (button, double-click, viewer). Verified in Chromium.
  - DONE (owner) Preview picture = button: pointer + lit border on hover, click opens the preview; a tile when there's
    no picture. Verified (border 0.16→0.5 alpha, cursor pointer).
  - DONE (owner) Notepad: notes and bubbles get an expand button → components/Notepad.tsx (full text, links/emails/
    phones/codes detected + clickable, Copy all, Select all, list of what was found). Verified desktop + iPhone size.
  - DONE (owner) Background download for live viewers (lib/peek.ts): open files ≤25 MB (8 MB low devices; spaces 100 MB)
    newest arrivals first, cap 300 MB / 10 min per tab, visible tab + idle line + not data-saver only.
  - FIXED (H) Void freezes with a card open. Measured: 54 fps → 7–9 fps with a card open. Cause: the full-screen
    .scrim backdrop-filter blur re-rendered every frame over the moving void. Removed (darker scrim); now 48 fps.
    Also `.orb:focus-visible` paused the ball, and closing a card hands focus back to it → that ball stopped moving.
  - DONE (owner) HQ: with "From"/1 h the globe routes are exactly those since then (were per-day route_daily). Each
    route/pin shows times: uploaded at + upload took, downloaded at + took, upload→download gap, pins first/last,
    devices registered/last seen, GPS time; object list shows started / in orbit / each download. Migration 032
    (orbit_admin_pins, geo_events.ms, orbit_received p_ms, finalize records ms).
  - DONE (owner) HQ Analytics page /admin/analytics: per UTC day visitors, new devices, uploaders, downloaders, visits,
    uploads, downloads, data, GPS, peak live, median upload/download time; range/custom dates/country/by day-week-month,
    one unit per chart (People/Activity/Data/Live/Speed), sortable table. Per-device counts start with migration 032.
  - DONE Migration 032 fully applied (owner OK'd): trigger sessions_device_day (as CREATE OR REPLACE TRIGGER), pg_cron
    job orbit-live-sample (*/2), orbit_admin_pins with 'uploads'. Checked: device_days and live_samples fill.
  - RISK: incoming "arriving" balls not re-tested with two live devices here (needs the worker; logic unchanged).
- FIXED 2026-10-25 (C, owner: "if it's visible on someone's phone it must be downloadable") — Objects appeared at
  once and were served from the sender's page until the online copy landed; a sender who closed the tab / locked the
  phone left balls nobody could open. Now (lib/transfer.ts launch): the encrypted copy is saved FIRST, then finalize
  makes it visible (status ready). Other screens no longer get the in-flight "launch" stand-in (FLY_TO_OTHERS=false).
  The file waits in this browser's IndexedDB (lib/outbox.ts, ≤500 MB): page closed mid-upload → the next visit uploads
  it again by itself (resumeOutbox on Void mount / back online) and then shows it (+ pulse). No online storage at all
  (501/507/bucket unreachable) → old direct-only way while the page is open. Anonymous already worked this way.
- DONE 2026-10-25 (H, owner: "make sending work when the sender closes or switches") — Web pages can't upload while a
  phone has them in the background (browser rule). So: (1) SaveGuard bar on top while a copy saves: "Saving online 37%
  · keep Orbi open until ✓", then "✓ Saved online · safe to close" + buzz; coming back after leaving early says it goes
  on. (2) Phones put the online copy first (lib/net.ts: 4 upload lanes, 2 on a busy line, direct sends 1 at a time
  while it saves). OPEN/next: test Chrome Background Fetch for uploads on a real Android; real background = native app.
- FIXED 2026-10-25 (H) — Downloads counted at "Unlocking" (owner screenshot: Lärm.m4a showed 6 downloads while nobody
  had it). orbit_unlock counted before a byte moved. Now unlock → orbit_unlock_check (passcode only, wrong tries still
  lock) and the page calls POST /api/transfers/<id>/received (orbit_received, needs the same auth proof) once the file
  is complete (receive(), and the pre-fetched hand-over in Panels). Objects with a download limit still count at unlock
  so the limit holds. Migration 031 applied.
- FIXED 2026-10-25 (H) — Barcelona ← Hannover, Lärm.m4a (40 MB from Chrome·Android) couldn't be downloaded. Root cause:
  its stored copy never completed (R2 404; the Android tab was frozen in the background), so only the sender's phone
  had it; when that page sleeps neither path answers, and the receiver gave up after one direct try + 3 min. Now
  firstSource retries the direct path every 15 s and watches the stored copy for 30 min; the card says "Sender's phone
  is away · starts by itself when it's back" (new stage "waiting"). Test added (firstsource.test.ts).
  OPEN: sender side on Android still can't upload while its tab is in the background (browser limit).
- DONE 2026-10-25 (M, owner) — Previews for more types: Word (docx/odt), Excel (xlsx/ods), PowerPoint (pptx/odp) as
  text, CSV/TSV as a table, ZIP/APK/EPUB file lists, svg/ico pictures, mkv/3gp video, opus/amr/m4b audio, more code
  files. Parsed on the device (lib/office.ts, fflate + DOMParser), only text put on the page. Verified in Chromium
  with python-docx/openpyxl/python-pptx files. Old binary .doc/.xls/.ppt: no preview (download).
- FIXED 2026-10-24 (M) — HQ "From" filter (owner: too much live info to track daily traffic). Header: date+time picker,
  1 h / Today / Now / All. With a time set, /api/admin/overview?since= calls orbit_admin_overview_since (migration 030,
  applied): devices, new devices, visits, GPS on vs no GPS, uploads/downloads/bytes/views, countries, cities, browsers,
  hourly, visitor/upload/download dots, arcs, feed, exact pins, objects, anonymous places/sessions all count only from
  then; globe routes = History since then. "Online now" and live dots stay live. Kept per browser (localStorage).
  RPC verified in SQL (3 h window: 34 devices, 36 visits, 16 up, 19 down); tsc, eslint, next build clean.
- FIXED 2026-10-24 (H) — Phone Send + Download cards: parts overlapping (owner screenshots). Root cause: .drawer-body
  is a grid inside a fixed-height card and its .col children had min-height 0, so on phones (one column) both rows were
  squeezed into the card height and each column's content spilled over the next. Mobile: grid-auto-rows max-content,
  .col min-height max-content, children flex-shrink 0 → stacked, card scrolls. Measured with Playwright iPhone 13.
- DONE 2026-10-24 (H, owner: auto-download like WhatsApp) — Found: lib/peek.ts already fetched small no-password
  files in the background (≤1 MB in sight, hover ≤100 MB, card open ≤400 MB), but Download IGNORED it and fetched the
  whole file again. Now UnlockPanel.go: after unlock (still counted), a ready peek file is handed over at once
  (autoDownload on desktop, held on phones). Spaces warm up to 50 MB (10 on low devices; worldwide void stays 1 MB;
  guessCap 160 MB/10 min still applies). A download from the card says sync {od} instead of a "pulse" (which made every
  tab worldwide reload its list). + Download waits for a background copy already on its way; not-stored retries
  5/10/20 s (was 60 s); every file type (non-previewable ≤ 50 MB; canPeek needed viewKind before, so .bin/.zip never
  pre-fetched). Measured prod: 1 MB tap→saved 0.44 s (only the counting unlock), was 1.4–2.3 s.
- DONE 2026-10-24 (H, owner: "fix speed for every corner of the earth, free") — Research: (1) R2 Local Uploads (open
  beta, free, no extra cost): uploads land in storage near the SENDER and copy to WEUR in the background, readable at once
  (fast for readers in the sender's region). Needs the OWNER to switch it on: dashboard → R2 → orbi-storage → Settings →
  Local Uploads → Enable (or `wrangler r2 bucket local-uploads enable orbi-storage`); no code change (presigned PUT /
  UploadPart are covered). (2) Cloudflare Realtime TURN (1,000 GB/month free, anycast nearest city): relays the direct
  device-to-device path on networks that block it (offices, campuses, carriers), which today fall back to waiting for
  the stored copy. Code shipped: /api/turn (credentials/generate-ice-servers, ttl 4 h, cached per instance) + p2p.ts
  ice() adds them to STUN. Dormant until the OWNER adds Vercel env CF_TURN_KEY_ID + CF_TURN_KEY_TOKEN (dashboard →
  Realtime → TURN → Create key) and redeploys.
- DONE 2026-10-24 (H, owner: "yes build for free") — Downloads through Cloudflare's edge. live/ worker now also serves
  GET /f/<id>?t=<token> (Range only) from an R2 binding STORE (orbi-storage) and caches each range at the reader's
  location (Cache API, TTL ≤ 3 h / the ticket's end). Auth: site writes ticket k/<id> (x-amz-meta tok = sha256(token),
  exp) on unlock/peek (lib/edge.ts; token = HMAC(ORBIT_SECRET, id), 32 chars; at most one write per file per ~hour per
  instance); the worker checks the ticket on EVERY request, cached or not; removeBlobs deletes k/<id> with f/ and t/ →
  burnt files are never served. Client (cloud.ts openStored): edge first; the worker's own 404 carries
  X-Edge-Missing: 1 (= not uploaded yet); any other edge trouble (no route, 403, 429 over the free 100k/day, network)
  falls back to the signed R2 link. Free: Workers free plan, R2 Class B reads + Cache API free, egress free.
  v2 (measured v1: unlock +0.3–0.7 s from the ticket write; cold miss 1.4–2.7 s vs direct ~0.8 s; hit 0.6 s, 16 MB
  range 1.2 s): ticket written ONCE at launch (api/transfers POST, next/server after()), unlock only computes the link;
  worker: cache.match first; hit → ticket only (memo 30 s per isolate); miss → ticket HEAD and R2 range GET in parallel.
- FIXED 2026-10-24 (H, owner ask: "even 1 MB takes time, make it faster worldwide") — Measured on prod (2 browsers):
  1 MB click→saved 2.26 s = unlock 0.37 s + a separate "is it stored?" ranged read (R2 TTFB 1.2 s) + the data read
  0.4 s; 20 MB 6.3 s (copy still uploading → direct path). R2 bucket orbi-storage is in WEUR, so every round trip from
  Asia/Americas costs 150–300 ms+. Fixes: cloud.ts openStored — the first data range IS the check (one R2 round trip
  less per download; transfer.ts source + anonymous path use it); layout preconnects to the R2 host on page load
  (DNS+TLS done before the tap); transfer.ts keyFor/warmKey — a no-password object's key is derived when its card
  opens (UnlockPanel), not after Download. Unlock still counts on the tap (it increments downloads). Remaining limit:
  one bucket in Europe; a Worker/edge cache in front of R2 or a second bucket per region is the next step (owner call).
- DONE 2026-10-24 (M, owner ask: "uploads only show after a reload") — Measured on prod first (2 browsers, Playwright):
  a far device's upload DOES arrive live (launch + landed over the worker's r/void in < 2.5 s) and after a 40 s offline
  drop the list catches up < 2.5 s after the line returns. What did NOT move live: downloads and viewers/views (they
  only reached others with the next list, up to 60 s). Now: a finished download says sync {od:[id]}; opening / closing a
  file says {ov}/{ox} (+{vw} on this device's first look); every screen bumps downloads / views / watchers in place
  (applySync), no list reload; the minute list still settles drift. If the owner still sees a stuck screen, get the
  device + browser + whether the tab was in the background (iOS freezes background tabs).
- DONE 2026-10-23 (H, owner ask) — Anonymous mode rebuilt simple (AnonCard = one black "portal" card, readable sans,
  squircle shapes). Home: Burns after 5–30 + three choices: Look around (open void as a ghost) · Create a space (code made
  up: 4 chars, caps + digits; PASSCODE REQUIRED, 6+) · Find a space (type code → "K7QX is live" via /api/anon-find →
  passcode → in). Inside a space: the code as 4 big tiles, Copy code / Share (text with the code, never the key link),
  Leave space, Exit anonymous. Passcode-less anonymous spaces are gone everywhere: card, Spaces → Create (required now),
  mobile menu (opens the card), and the SERVER (/api/spaces anon without a name → 400). RELEASE bumped so old tabs reload.
  Old #j=…&k=… links still join (join mode). Anonymous theme: terminal mono + "> " / "$" marks replaced by the site sans.
- FIXED 2026-10-23 (M) — Anonymous void layout (owner's iPhone: the hat sat on the seal's "ANON-XXXX · BURNS IN" label;
  on others the label hid under the bar). Root cause: AnonSeal measured the bar once, too early (28 px vs 62 px real), and
  the hat block was centred on its own with a tall list. Now AnonSeal re-measures (rAF for 2 s, every size change, lowest
  visible part of the bar) and shares --seal-top; .ghost-mid sits at max(50% − 90px, seal-top + 44px); the explainer list
  is gone (one line). Black portal: no grey tint / 100vmax shadow sliding over the fixed sky when the page scrolls.
  Verified iPhone 13 emulation: label at 76 px under a 62 px bar, hat at 226 px.
- DONE 2026-10-23 (M, owner ask) — Admin page switcher (HQ · Spaces, components/admin/Pages.tsx) and /admin/spaces
  (AdminSpaces.tsx, every 10 s): per space (30 d) live members, members, objects in it now + size, flowed all-time (files,
  bytes up, downloads, bytes out, notes, tasks), made / burnt / last seen; Anonymous tab (each session: alias, live mm:ss
  or how it ended, length, start UTC, the space codes it made + their totals, place); History tab (30-day bars + table).
  DB: migration 029 (space_members.seen_at stamped by /enter, which members call every ~15 s → live = 90 s;
  private.space_stats counted by exception-safe triggers on transfers/bubbles/tasks; orbit_admin_spaces). NOTE: the
  Supabase MCP apply_migration hung on CREATE TRIGGER twice (no locks seen); the triggers and orbit_admin_spaces were
  applied with execute_sql + lock_timeout instead. The file holds all of it.
- DONE 2026-10-23 (L, owner ask) — Phone top bar: the Anonymous (incognito) button now sits beside the location pin
  (Void m-bar, `anonOffButton("m-ic")`; while anonymous the pin's place already shows the on-badge). Verified iPhone 13.
- DONE 2026-10-23 (M, owner ask) — Public void opens FULL SIZE, glass edge only when zoomed out. Before: the world was
  window-sized (vw × max(620,vh)) then shrunk into the free band, so the edge always showed and phones got a small box.
  Now (Void map memo) the public void's base size = the free screen (window minus MAP_BAND), so the opening view is k=1
  and fills it exactly; MapWorld shows the glass (`.world.glass-on`, lenses) only below GLASS_K 0.97: zoomed out by hand
  or because many files grew the world. Spaces/archive keep the old sizing. Verified locally: desk 1440×900 + iPhone 13,
  default k=1 no edge, zoomed out k=0.55 edge shown. (`.glass` is a site-wide class: don't reuse it.)
- DONE 2026-10-23 (H, owner ask: privacy) — Globe removed from the public site. "Pick my area on the map" button gone
  (LocationBlocked now only says how to unblock + Try again); EarthView.tsx and the public `/api/world` route deleted
  (it served every area's live counts worldwide = where other people share). `orbit_world` stays secret-gated in the DB;
  the admin Earth (admin/Earth.tsx) is untouched. Areas picked earlier (lib/where pickArea) still work. Local: /api/world 404.
- DONE 2026-10-23 (L, owner ask) — Public void edge = clear glass pane (owner's reference image), no fill. MapWorld
  `framed` (public void only) renders `GlassEdge` SVG: faint hairline all round; light only on top-right + bottom-left: a
  crisp bright line plus a crescent stacked from 8 faint layers (inner curve wider than the outer), so it fades inward and
  its tips melt into the hairline (no hard edge); 2 rainbow glints on top/bottom edges; `.world.framed::after` = soft inner
  glow masked to the two lit corners. All sizes ÷ zoom. Verified locally (Chromium 2x).
  + Corners bend the background like real glass (owner ask): MapWorld `GlassLenses` = four 110 px patches in screen space
  just behind `.world` (a backdrop-filter INSIDE the scaled world sees nothing: verified), `backdrop-filter: url(#lens)`
  with a displacement map drawn once per corner (lensMap) + slight RGB split. Follows the corners, glides with
  `.world.glide`. Off on low-perf devices and where url() backdrop filters don't exist (Safari/Firefox: plain rim).
  NOTE: SVG filter primitives must be direct children of <filter> (a <g> silently breaks the chain).
- FIXED 2026-10-23 (H) — Downloads slow / stuck on "Unlocking" (owner: 4 MB took ages). Measured live (2 browsers, private
  space, 4 MB): unlock 0.36 s, stored copy not finished at the one check (404) → tied to the direct path → ~4 s handshake
  (new Supabase channel + ICE gather + answer) before bytes; on networks that block direct connections (STUN only, no
  TURN) up to ~35 s, then a 3 s-poll wait. Fixes: transfer.ts firstSource races the direct path and the stored copy
  (polled every 1 s for 30 s, then 3 s) — first ready serves, the loser is hung up; unlock/peek have a 12 s timeout +
  one retry (no endless "Unlocking"); net.ts: a live device-to-device send goes before stored-copy upload parts, which
  drop to 1 at a time while anyone is served (big files: the receiver gets the line). Unit tests: firstsource, net.
  OPEN: P2P signalling still opens a fresh Supabase channel per download (~1–3 s); no TURN relay (blocked networks
  rely on the stored copy). Big files are bound by the sender's upload speed (physics, not code).
- FIXED 2026-10-23 (M) — Open <select> lists were white with white text (HQ: Countries, Objects, Activity…): the page
  never said it was dark, so native controls used the light scheme while inheriting white text. :root color-scheme:
  dark (Work light keeps its own) + dark <option>s. Verified computed styles on all 12 HQ selects, desktop + phone.
- DONE 2026-10-23 (owner ask) — Anonymous spaces with a NAME + PASSCODE: the 4-character name is the slug's own 4
  (anon-NAME+4, unique among live anonymous spaces; knocking still works). The passcode never leaves the browser:
  PBKDF2-SHA256 (310k, salted with the name) gives the join code the server checks (passHash) and, separately, the
  content key (server never gets it). lib/space.ts createAnonPassSpace / joinAnonByName / passKeys (unit-tested);
  POST /api/spaces {anon, name}; GET /api/anon-find?name= (migration 028 orbit_anon_find, applied + grants checked);
  join reuses /api/spaces/[slug]/join and its wrong-passcode limits. UI: passcode field in the anonymous card, the gate
  and Spaces → Create; Spaces → Browse takes name + passcode (empty passcode = knock). Passcode min 6 (the key comes
  from it). Browser-tested with a mocked server (create → name shown; wrong pass refused; right pass → in the space).
  RISK: a weak passcode can be guessed offline by whoever holds the server's hash (same as any passcode).
- DONE 2026-10-23 (owner ask) — Anonymous screens read as a terminal: JetBrains Mono at normal width, sentence case,
  calm buttons, green prompt; every card/drawer while anonymous, the void's words, the space title (html:not(#_) beats
  Work). Plain "what anonymous means" lines under "You've gone anonymous" — only true claims. The owner asked for
  "location shuffles every second / routed through many IPs": NOT written, Orbi doesn't do that (that's Tor).
- FIXED 2026-10-23 (L) — React dev warning "getServerSnapshot should be cached": lib/trash.ts returned a new [] per call.
- **2026-10-23 Space join: a taken name no longer blocks entry (owner ask).** Join used to answer 409 "is taken". Now `uniqueHandle` (src/lib/spaces.ts, tested) adds the next number at the end ("Mohit" → "Mohit 2"); the same device keeps its name. Also removed the card/box behind member avatars in Work (work.css `.room-crew`). Verified: unit test, prod build + Playwright (no background/border), live API after deploy.
- **2026-10-21 Bubble life 30 min default, up to 8 h (owner ask).** Was fixed at 15 min (server fallback 15, allowed 5–30). Now `BUBBLE_LIVES` in `src/lib/limits.ts` (30 min, 1/2/4/8 h) is the one list for the composer picker ("Stays for"), `postBubble`, the API check and the ring. Hidden in a named space (bubble lives with the space). Copy updated (About, Upgrade). Verified: prod build + Playwright 1440/390, picker shows, note text follows the pick, POST sends life=480. DB `orbit_bubble_add` takes any int life (no migration).
- FIXED 2026-10-21 (QA pass, not deployed yet) — (H) /fr /ar /ru SEO said 2 GB → 20 (lib/seo.test.ts checks every
  language against limits.ts). (H) About/privacy/toasts/LocationAsk/AnonCard/WorkBar said the void is local ("the
  eight around it", "around you", geohash chip "⊕ DPHG") → worldwide Open void + Nearby (own area) + Wi-Fi (network);
  About §05 + Fig. 4 redrawn; "another area" pill and the look-elsewhere Earth path removed (meaningless worldwide);
  NEARBY tag on same-network orbs → WI-FI. (H) dialogs: lib/dialog.ts (one stack: focus in, Tab trap, Escape for
  the top card only, focus back to the trigger) used by Pop, Drawer, phone menu, Viewer; Escape closes the New task box
  and the Send menu; the New task box hides under any card (html.card-open). (M) html[lang] follows /fr… (boot script
  + VoidShell); dir=rtl stays on the Arabic guide only (the English app chrome must not mirror). (M) app/not-found.tsx.
  (M) anonymous message lifted above the orbs (slim plate when things float); Classic EXIT pill white. (M) Work phone:
  tabs no wrap, title fits, no stray Bubble FAB, Switch to Classic in ☰ ≤480; touch phones show only the fit button
  (pinch zooms) so the +/− row no longer covers labels. (M) Work light --w-text-3 #6b6b72 (≥4.5:1), k-other file glyph
  grey (was white on white); ghost captions #8a8a8a 10.5px, "30 MIN" caption above the Bubble button. (M) Share
  aria-label, /admin password label, orb :focus-visible ring. (L) lifetime copy true (files 30 min, tasks/spaces 8 h);
  Nearby count only once placed (GPS or picked; lib/scope countArea, tested); "Burns after" kept in Work; Text dialog
  "Send text or a link"/"Text"; Container "groups with what you send"; /admin asks GET /api/admin/login before the
  overview (no 401). Verified: npm run check (56 tests), next build, Playwright on next start with mocked /api at
  1440×900 + 390×844, Classic + Work dark/light (screens in /tmp/claude-0/qa-fix/). RISK: on phones orbs can still sit
  under the top bar at the opening view (OPEN_K zoom floor beats the band); real screen-reader pass not done.
- VERIFIED 2026-10-21 — two-device E2E on production (Playwright, 2–3 contexts, 0 reloads): public file 1.2 s, note 2 s,
  task 1.6 s, deletes 0.7–2.4 s; open + private spaces join from another area (Tokyo GPS vs Ohio IP), live 1–3 s, no leak
  to the public void; Work↔Classic across devices; offline 10 s → appears 30–500 ms after reconnect. Membership code has no
  IP/area/country check (spaces.ts member/search, join route).
- FIXED 2026-10-21 (M) — a new space wasn't findable for up to 60 s (per-instance search cache) → search looks again on a
  miss; a "no such space" is cached 3 s, not 60. (L) wrong-passcode lockout was per network (one VPN exit / office locked
  everyone) → 8 per device + 40 per network.
- FIXED 2026-10-21 (H, scale) — worldwide void load: card views no longer pulse every tab into a full list reload;
  /api/transfers/net asked at most every 30 s; list GET no longer waits on reap(); list s-maxage 2 / swr 20; thumbs
  CDN-cached (s-maxage); previews pre-warm only files ≤ 1 MB; heartbeat every 120 s and only from visible tabs; Worker
  passes on only launch/landed/gone/sync/pulse/invite; HQ Void beamed deletes to the old region rooms → now r/void.
  Verified: npm run check. OPEN (from the perf review): Worker sharding + per-IP socket caps, Supabase Realtime for P2P
  signalling (~200 connections free), Cloudflare Workers Paid before launch, list SQL counters, bundle (supabase-js 184 KB).
- FIXED 2026-10-21 (H) — deployed d60d56d after the owner started the Vercel Pro trial (/api/version = r-2026-10-21-workspace-only-spaces); owner set Vercel Ignored Build Step = "Only build production" for every branch. Was: production stuck on r-2026-10-21-world-void: Vercel refused 209d25a ("Deployment rate limited —
  retry in 24 hours", seen via `gh api .../commits/209d25a/statuses`). Cause: every agent branch + notes commit built
  (Hobby ≈100 builds/day). Fix: vercel.json ignoreCommand → scripts/vercel-ignore.sh (live branch + site code only;
  checked locally for: other branch → skip, code change → build, notes-only → skip). Pending: a push after the limit
  resets (~2026-10-22 10:15 UTC) or the owner starting the Pro trial, then Redeploy.
- DONE 2026-10-21 — Spaces: "Flexible / Workspace only" when creating (SpaceMeta.work, sealed meta, no migration). A
  Workspace-only space always opens in Work; switching to Classic steps out of it (parked) and the bar shows "Switch to
  <space> ▾"; the same control lists every space this browser is still in ("Your spaces"), one tap to enter; a space's
  close time (room.ends) rides on the saved pass and it leaves the list by itself when it closes. Verified: Playwright on a
  prod build (open in Work, step out to Classic, menu lists both, enter a flexible one in Classic, pick the Work-only one →
  Work + inside it). RISK: the parked space isn't remembered across a reload (it shows in "Your spaces" instead).
- FIXED 2026-10-21 (H) — Uploads invisible on the owner's other device: (1) the public void was local, and the devices sat
  in different IP areas (Barcelona vs Hillsboro US, a VPN/company network) → "Open void" is now worldwide (no ?a= list,
  one live room r/void / orbit-void; the area stays on items for the Nearby filter + HQ). (2) a launch could hang at
  "Locking" forever: the preview-picture POST had no timeout and blocked finalize → now fire-and-forget with 15 s timeout.
  Verified: npm run check; production list without ?a= returns items from all areas (curl). RISK: one global room's
  load (Cloudflare DO) as traffic grows; the stashed full design (git stash "WIP world void step1") adds server-sent beams.
- FIXED 2026-10-20 (M) — Anonymous frame (AnonSeal) shrank while scrolling and never came back: its top was the fixed
  navbar's bottom + scrollY, re-measured on every navbar resize (it turns compact on scroll), kept with a running max.
  Now: the bar's bottom as measured while full size (not compact) minus the layer's page offset. Verified: frame top
  70/80 px at start, after scrolling 2000 px and back up (1900 px and 390 px wide). No other code mixes scrollY with
  fixed-element positions (searched).
- FIXED 2026-10-20 (M) — Fixed width breakpoints can't know how wide the bar's contents are (counts, Mine, online
  number): at 1366–1680 the inline Open void/Nearby/Wi-Fi buttons slid under Filter. The Classic bar now measures itself
  (lib/fold.ts, unit-tested; data-fold 0–3 in Void.tsx) and folds only as far as needed: small labels + "How it works"
  → ☰, then the links → ☰, then the buttons to a 2nd row; --scope-h = the measured extra height. The buttons sit inline
  next to the links, each with its own border. Removed dead `.m-scope` rules (old phone toggle) that collided.
  Verified: overlap checker 0 issues at 25 sizes 320–1920 with counts/Mine and without, Classic + Work.
- DONE 2026-10-20 (owner ask) — "Everything" was meaningless: the void's choices are now buttons in the navbar (Classic: a
  row inside the bar; Work: the tabs), not in Filter: Open void (area + 8 around) · Nearby (your own area; asks for
  location, stays on Open void if refused, shows the blocked card) · Wi-Fi (same network) · Mine. Filter keeps file
  types only ("All files"). Migration 027 (applied, verified): private.pub returns `area` (null when anonymous).
  inScope unit-tested; browser-tested with mocked items: Open 3 / Nearby 1 / Wi-Fi 1, deny path, Classic+Work, 1440+390.
  Everything placed under the Classic bar moves down by the row's height (--scope-h, set with :has).
- DONE 2026-10-20 (owner ask) — Upgrade: same as other links, gold glass only on hover, no glow (Classic + Work).
- FIXED 2026-10-20 (M) — Navbar items slid under each other at 721–1480 px (Classic) and 721–1100 px + short landscape
  (Work): both bars were a `1fr auto 1fr` grid whose side columns overflow into the centre. Classic: links centre in the
  free room at 1201–1480, fold into ☰ (MobileMenu) at 721–1200 and short landscape. Work: All/Nearby/Mine float under
  the bar there (as on phones); ≤360 px Switch to Classic lives in ☰. Verified with an overlap checker (every header
  control vs every other + off-screen + sideways scroll) at 20 sizes 320–1920, portrait/landscape, both looks: 0 overlaps.
- DONE 2026-10-20 (owner ask) — Nav links are liquid-glass buttons that lift (translate −2px, scale 1.06, shadow) on
  hover; Upgrade is gold glass with a rocket icon (Classic nav, Work bar, menu card).
- FIXED 2026-10-20 (M) — "N in orbit" chip sat on the Bubble button (dock bottom 24px vs button 40–92px; Work 18 vs
  22–66). The dock now starts above the button at every breakpoint. Verified in browser: desktop, 390px, Work.
- DONE 2026-10-20 (owner ask) — Mid-screen "See what's right around you · Share location · Create your space" strip
  removed (both live in the navbar). The location popup shows once per browser every 2 days (lib/where.ts askedRecently,
  unit-tested; marked when shown). NOTE for session 01DHR116: the GPS Nearby void must call shareLocation() when the
  user opens it without location on (today "Nearby" is the same-network filter and needs no location).
- DONE 2026-10-19 (owner ask) — HQ globe pins drawn at 50% (globals.css .gdot*, Earth.tsx circle layers); invisible
  hit area (.gdot::before, `<layer>-hit` circle layers) keeps them hoverable/tappable. New HQ tab "Pins" (admin/pins.ts,
  unit-tested): every globe pin by layer, filter chips, map link. Verified in Playwright, desktop + 390px.
- FIXED 2026-10-19 (M) — On phones every HQ full-screen panel (Pins, Anonymous, Countries…) started under the wrapped
  header (fixed 96px guess). The header's real height now sets --hq-top; .hq-expand starts there. Verified at 390px.
- FIXED 2026-10-19 (M) — A note title saved as the device's name ("24-51 LITTLE NECK REPLY") showed as the sender on notes,
  tasks and files. lib/bubbles.ts looksLikeName (unit-tested): a saved value that isn't a name is dropped on read on every
  device, never saved again; the note box warns. NOTE for session 01DHR116 (owns Void.tsx now): in a space, prefer the
  member handle over bubbleName() for postName / task "me" (Void.tsx ~2355, ~657, ~1334); server already signs with it.
- FIXED 2026-10-19 (H) — Work↔Classic was a full reload (or a router remount): uploads, P2P holds, sockets and previews
  restarted at once and choked home uplinks (Chrome ERR_NETWORK_CHANGED). Now one mounted Void in the (void) route group,
  history-only switch (lib/view.ts). Verified: Playwright 20/20 on a prod build (0 document/RSC requests, no remount, back/
  forward, phones) + re-run after the merge with the other agent's work.
- FIXED 2026-10-19 (H) — New files sometimes never popped up elsewhere: live messages were fire-and-forget, the Worker
  dropped >40 msgs/10 s (incl. landed), half-open sockets went unnoticed. Now: live.ts outbox + 25 s ping/8 s pong watchdog
  + fast reconnect + resync; landed carries the full record (cleanOrb) and repeats at +2/+6 s; Worker exempts must-messages.
  Verified: 44/44 node tests with a fake socket; production Worker delivered 60/60 rapid landed (was 40).
- FIXED 2026-10-19 (M) — Preview warm-up downloaded every open file ≤100 MB from the sender's own uplink, endlessly after
  trims. Now lib/net.ts turns (up/serve/peek) across files; previews only from small stored copies, with cooldowns.
- RISK (M) — governor/peek limits never run on a real slow line; live outbox never run with two real phones.
- FIXED 2026-10-19 (H) — No tests / no CI. Now: Vitest unit tests (`npm test`, src/lib/*.test.ts: container rows,
  knock sealing, clocks/formats, space life, name tags), `npm run check` = tsc + eslint + tests, and
  .github/workflows/check.yml (typecheck, lint, tests, build) on every push. Add a test with every logic fix.
- FIXED 2026-10-19 (H, security) — Notes/tasks in a space were signed with whatever name the browser sent (any member could
  post as anyone; a wrong saved name showed instead of the member name). Server now signs with the member handle in
  bubbles, tasks, tasks/done, tasks/edit. Root cause of the "24-51 LITTLE NECK REPLY" name: an unlabelled name box saved
  any text as the device's name for good → box labelled, locked to the member name inside spaces, not saved from spaces.
- M RISK — Knock (4-letter code → Let in) never run end to end with two real devices (crypto round-trip unit-checked only).
- M RISK — Nearby across areas (migration 024 + per-network live room) not checked with two devices on one Wi-Fi.
- M RISK — 8-hour named spaces (025/026): spaces older than 8 h closed at deploy; file/note/task extension to the close time
  not yet observed on production data.
- M RISK — "+ New container" (rotating sender key) and sender names on public sends not yet seen with real uploads.
- M RISK — Gentle uploads (rest = part time on a busy line) never run on a real slow line (scripts/slow-net-test.cjs exists).
- L OPEN — sendRetry may re-POST /api/transfers after a timeout that actually succeeded → an unfinalized orphan row
  (never listed; expires). Fix: idempotency key on create.
- L OPEN — Dev console: "getServerSnapshot should be cached" from useAnon (lib/anon.ts useSyncExternalStore).
- L OPEN — Supabase MCP hangs on any SQL with `delete` (tooling, not app): hand the owner the SQL to paste.
- FIXED 2026-10-19 — Work (dark) follows the classic Blackboard theme of /about + /upgrade (site.css): #000, chalk ink,
  Archivo titles, Inter text, Chakra chrome, mono labels, hairlines, pill buttons; windows incl. the anonymous card.
  It's the last layer in app/work/work.css; earlier 'studio'/'liquid glass' Work layers above it are overridden.
- FIXED 2026-10-19 (this session, details in git log): Work↔Classic switch without reload (Playwright: 0 reloads);
  dropped live messages after reconnect (refresh + queued beams); launches stuck at "Locking" (20 s per try);
  Nearby empty across areas; container grid 9=3·3·3 / 10=5·5 (rendered); drop zone aligned with Upload (measured);
  Work fonts = classic (computed font checked); smooth wheel zoom (per-frame scale measured); drag top wall = header.

## ⚠ Branches (2026-10-18)
- Production was deployed from `claude/work`; on 2026-10-18 `claude/festive-keller-rln4jk` merged `claude/work` and deployed
  the task update below. **Before deploying from `claude/work` again, merge `origin/claude/festive-keller-rln4jk`**, or these go away:
  task names ("Name¦line"), Submit task + upload into it, orange Upload per task, double-click → route, per-step colours
  ("Name§colour", 9 colours, `STEP_COLORS` in lib/tasks.ts), highlighted Custom step, /work step colours = classic (red cancel),
  Arrange fixed on /work (MapWorld captures the mouse only once a panel moves), lanes level with the task dot, open notes/links
  show their text at once, file tools hover-only on /work, Exit button while anonymous.

## Marketing videos (taken over from the marketing agent on claude/festive-keller-rln4jk)
- Rules, facts, house style, pipeline: `media/VIDEO_PLAYBOOK.md` (copied here from his branch). "New version"/"next" = next story, don't ask.
- DONE 2026-10-18: `media/airport-film/OrbiTransfer-airport.mp4` (79 s) rendered + encoded from his committed source (he stopped before the render).
  Render tips: 4 workers ~1.1 s/frame each, ~25 min; run synth.py AFTER the frames (CPU-starved otherwise).
- His other films (wedding, gym, explainer-3d…) live on `claude/festive-keller-rln4jk` only; not merged into this branch.
- DONE: concert film (Chatterbox voice with feeling). Next story candidates: classroom, office meeting, film set, hospital, train, park photo walk.

## Marketing videos (owner's channel)
- You are also the marketing video creator. Everything lives in `media/VIDEO_PLAYBOOK.md`:
  - THE GOAL: teach how a file reaches nearby phones with no login;
  - the verified facts;
  - the house style: low-poly people and sets, George voice, subtitles;
  - the tools and pipeline (three.js frames, Kokoro voice, `synth.py`, ffmpeg);
  - the film list.
- Newest source to copy: `media/airport-film/source/`.
- Low-poly people samples: `media/people-samples/`.
- "New version" / "next" from the owner = the next story from the playbook list. Don't ask; make it, send the MP4, then commit.

## How to ship (every time)
1. `npx tsc --noEmit` and `npx eslint src` (0 errors). Production build check: copy repo without `node_modules/.next/.git/media/live`
   to a scratch dir, symlink node_modules, run `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next build`.
2. Commit, `git push -u origin claude/festive-keller-rln4jk`.
3. Vercel deploy via MCP `create_deployment` (see CLAUDE.md). Check `get_deployment` until READY, then `get_runtime_errors`.
4. Bump `RELEASE` in `src/app/api/version/route.ts` only when open tabs must reload.
5. Cloudflare Worker (`live/`) redeploys itself on push (Workers Builds, Worker `transfer-instant-cloud-share`).

## Local test harness (no real backend needed)
- Worker: `cd live && npx wrangler dev --port 8787 --ip 127.0.0.1`
- Site: `NEXT_PUBLIC_LIVE_URL=ws://127.0.0.1:8787 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x ORBIT_SECRET=x npx next dev -p 3100`
- Playwright: `playwright-core` with `executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"`; mock `/api/**` with
  `page.route` (GET /api/transfers → `{items,bubbles,tasks,online,now}`, /api/pulse → `{net, area}`), set
  `localStorage["orbit:geo-asked"]="1"` to skip the location card. Two contexts = two devices (live via the local worker).
- The sandbox cannot reach orbitransfer.com or workers.dev directly; use Vercel MCP `web_fetch_vercel_url` for the site.

## Architecture (what exists now)
- `src/components/Void.tsx` main screen. `MapWorld.tsx` = pan/zoom world (drag, wheel, pinch, keys, culling via onRect,
  panel drag via onMoveItem). `lib/map.ts` = random non-overlapping spots + pins (hand-moved, localStorage `orbit:pins`).
- Live sync: `lib/sync.ts` (records over realtime, overlay vs cached list), `lib/live.ts` (Cloudflare rooms, region =
  geohash-3, filter by `a` area). Fallback Supabase Realtime when `NEXT_PUBLIC_LIVE_URL` unset. P2P file signaling still Supabase (`lib/p2p.ts`).
- Areas: `lib/area.ts` (geohash-4 + neighbours), `lib/where.ts` (GPS or IP area), migrations 014/015/016.
- Earth globe: `EarthView.tsx` (MapLibre + OpenFreeMap), only via the 🌍 button now; `/api/world` counts per area.
- Speed: `lib/perf.ts` (`html[data-perf=low]`), `.map-view.moving`, `.world.far`, culling, cheap cables, still stars.
- Previews: `lib/peek.ts` preloads all open files (≤100 MB, low: 25 MB) smallest first; Viewer shows stored thumb at once.

## DONE but NOT DEPLOYED yet (in the last commit with this file — verify, then deploy)
- Zoom-out no longer switches to Earth; you can zoom out further (orbit just shrinks); fit button = default view. (MapWorld)
- Background preloading of every open file + instant thumbnail in preview. (peek.ts, Viewer, Panels, Void)
- File-shaped balls: round lifetime ring hidden, slim life bar under the shape (`.lifebar`, OrbView `shaped`). Fixes the "red arc".
- Low-perf CSS fix: blur only removed inside `.world`; cards keep glass (owner's phone showed see-through, overlapping
  card + dark SEND pill in low mode — that was caused by the old `html[data-perf=low] *` / `.lg` rules, now removed).
  ⚠ Verify on a 390×844 mobile Playwright context with `localStorage["orbit:perf"]="low"`: open a ball (tap) → card must be readable, SEND pill white.
- Bubble edit blink logic in `BubbleBoard.tsx` (`useEditMarks`, `changedWords`): JS done, **CSS missing** (see task B).

## OPEN TASKS (owner's requests, in priority order)
A. DONE: mobile low-perf card verified (390×844, perf=low): readable, SEND pill white. Deployed.
B. DONE: `.bub-edited` chip + `.bub-chg` blink (white→green ×3 in 5 s). Verified in Playwright. Deployed.
C. DONE: `.bub` border-radius 20px on all sides (variants removed). Deployed.
D. DONE + deployed: admin exact live location. Device with location allowed → `where.ts follow()` (watchPosition)
   → pulse sends lat/lon/acc/precise (early pulse on 100 m+ move, max every 15 s) → migration 017 keeps it 10 min
   → `orbit_admin_overview.exact` → pink "Exact (GPS)" markers on the admin globe (tip: label, coords, ±m, age).
   LocationAsk + privacy page now say the exact spot goes to Orbit's own map; others only see the rough area.
H. DONE + deployed (3rd round): balls are always plain round balls in the sender's colour (no file shape, no
   thumbnail; the picture only shows in preview). Bubbles drag from anywhere (not just the name row); phone drags no
   longer jump (drop uses the last move point, `.bub-stack.on-map` touch-action none); phone world ≥ 1.5× widest panel.
I. DONE + deployed: trash (`lib/trash.ts`, `components/Trash.tsx`): dragging any ball, bubble stack or task panel
   shows a big trash zone at the bottom; dropping on it hides it in THIS browser only (localStorage `orbit:trash`).
   Trash button (with count) in the zoom column lists them, Restore / Restore all.
J. DONE + deployed: location blocked/failed → `LocationBlocked` card with iPhone/Android/in-app steps and
   "Pick my area on the map" (Earth in picking mode; zooming in sets `where.ts` how:"pick", IP no longer overrides).
   Cause seen in data: owner's iPhone on mobile data had IP in Madrid while desktop GPS was Barcelona → different areas.
K. DONE + deployed: admin keeps each device's MOST RECENT exact spot after it goes offline. Migration 018 adds
   `exactSeen` to orbit_admin_overview (every device that ever shared GPS, last exact lat/lon, acc, city, last_seen,
   online). Admin layer "Last GPS seen" (dim pink #a0498f) shows the offline ones; "Exact · live" is the online ones.
   LocationAsk + privacy now say the exact spot is KEPT as the most recent location (not only shown live).
L. DONE + deployed (mobile clean pass): drawer/bottom-sheet is now SOLID on phones (#121216, no backdrop blur,
   no sheen/specular; `.drawer,.drawer.lg {...!important}` in the <=720px block) — Android no longer bleeds the void
   through the glass so content stops reading as "scattered". Columns were never actually overlapping (measured).
M. DONE + deployed: landed sends collapse into one "N in orbit" chip (LaunchDock: active cards stay, done ones fold
   into `.dock-hist`, tap to expand list + Clear all). Globe button removed from client map (MapWorld onEarth unset;
   EarthView still used for pick-my-area). Trash renamed to "Archive space" (slate/violet, LuArchive).
N. DONE + deployed: drag/zoom "disappear then reappear" fixed — cull margin is now a full screen (world px) and the
   visible set is frozen while the map moves, recomputed once on settle (MapWorld pushRect).

O. DONE + deployed: space live-presence — a joiner's NAME now appears instantly on every device (fetch the member
   list the moment an unknown presence id arrives + refresh() when the socket connects; no more reload). Worker
   presence was already correct; the lag was the client only refreshing names every 45 s.
P. DONE + deployed: Exit + member buttons in a space worked on desktop but were DEAD on phones — `.room` (z-index 0)
   sat under `.void.map .map-view` (z-index 2) which ate every tap. Lifted the room's top bar above the map and gave
   `.room-exit` pointer-events back (globals.css near ".room { z-index: 0 }").
Q. DONE + deployed: mobile task board — header no longer overlaps (Arrange hidden on phones, archive by the chevron,
   progress bar dropped on narrow headers); added a drag-to-resize grip on the task list (`.tb-resize`, persists in
   localStorage `orbit:tb-h`); composer says "Name the task". Rename = the pencil on your own tasks (already there).

## STILL OPEN (owner's live feedback, queued — need focused work)
- **Space view layout**: balls still float OUTSIDE the glass container; bound them in. (Exit/scroll now fixed.)
- **Full mobile-first rebuild** (owner wants real mobile components, not shrunk desktop): space screen, send/upload
  sheet, deeper panels. Tasks got a first pass (Q). Next by owner's pick order after tasks.
- **iOS location**: iPhone Safari says blocked; make the flow / pick-my-area fallback work on iOS.
- **Zoom lag on phone**: pinch-zoom still janky; perf pass (the disappear/reappear was fixed in N).
- **Realtime / presence "instant visible, no reload"**: joining a space from Android isn't shown live on iOS/laptop
  until reload; space presence (live names) and first files need a reload. THE BIG ONE. Needs two-device harness,
  investigate lib/sync.ts + lib/live.ts (Cloudflare) + space presence + lib/p2p.ts.
- **Space view**: balls float OUTSIDE the glass container; can't scroll/pan inside a space. Bound balls to the
  container and let the page scroll.
- **Task naming**: NEW TASK card has no name field — let the owner name/rename a task.
- **iOS location**: iPhone says "blocked"; make the flow work (or the pick-my-area fallback obvious) on Safari.
- **Zoom lag on phone**: pinch-zoom janky; needs perf pass.

E. **Files instantly on other devices**: tested OK locally via Cloudflare (stand-in ball appears ~1.3 s, bubbles ~1 s, across
   GPS-area and IP-area devices). Owner's failure was most likely an old tab still on the pre-Cloudflare build. If it
   happens again: check both tabs `/api/version` RELEASE, Cloudflare Requests count, browser console for WebSocket errors.
F. Cloudflare dashboard: owner may set Build watch paths to `live/*` (saves build minutes) — just advice.
G. Earth button: owner rejected zoom-out→Earth; button kept. If owner says remove Earth entirely, delete the 🌍 button in MapWorld.

## Owner preferences learned
- Answer SHORT, main points one line each. Wants things "instant", smooth on low-end phones, free plans.
- Ships straight to production on the live branch; deploy after each verified step.

## /work (Orbi Work) — LIVE in production from branch `claude/work` (commit b5641e3, contains all of `claude/adoring-cray-uq4ool`)
- ⚠ Before deploying production from another branch, merge `claude/work` into it first, or /work disappears from the site.
- Office words on /work: `lib/words.ts` (MutationObserver; user text kept via the KEEP selector list).
- Same Void with `ui="work"` (route group `src/app/(void)/`: one `components/VoidShell.tsx` keeps one Void mounted for /, /[lang], /work; the switch is `lib/view.ts` pushState, no reload): editor look from the owner's n8n / neutral-grey samples. Dark default, light toggle (`lib/theme.ts`, `orbit:work-theme`).
- All styling in `src/app/(void)/work/work.css` (loaded by the group layout), scoped to `html[data-ui="work"]` → main page untouched. Chrome: `components/WorkChrome.tsx` (bar, rail, dock, empty).
- Files = nodes, groups = wide node, bubbles = note cards, tasks = panels, wires grey. Skin forced to "work" (style picker hidden).
- Test: `node shot.mjs /work out.png [desk|phone] [dark|light] "click=<sel>"` (scratch harness, mocks /api).
- Shared (both looks): Filter dropdown (`KindFilter`: scope + file type), archive = room (`ArchiveRoom`, `ArchiveRestore`, `inArchive` in Void), wired files placed beside their task (`near` in lib/map.ts), room band fit, single-click preview on cards, wheel scrolls page when the map is empty.
- Classic header: one row; Public void is a blinking badge on the void; search + plus open Spaces (`start: ":search" | ":create"`); Chakra Petch is the classic sans.
- /upgrade: plans page (Free / Pro / Business, "coming soon", early access by email). /work: glass layer, one Upload button with a fan, Orbit emblem logo.

## Pending deploy (2026-10-18)
- `claude/work` @ `a85ed53` merged into festive-keller and deployed (connector permission restored).
  Deploy it to production first thing (project `orbit`, team `team_8pncmJWWU3ghEdA5XXAqbAIj`).
- It carries: anonymous sessions 5-30 min (migration 021, applied), dot-ring countdown on the sealed edge, admin
  "Anonymous" table + globe popups, incognito buttons / no overlap, last-GPS-seen pins pink with a green ring.
- Still open in Supabase: `orbit_session_forget` and `orbit_reap_anon` from migration 020 (the SQL tool timed out on them).
