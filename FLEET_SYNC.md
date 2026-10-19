# FLEET SYNC — handover for the next AI agent

Read `CLAUDE.md` first (owner wants SHORT answers, deploy steps, IDs). This file is the live task board.
Last updated: 2026-10-17 (2nd session: A–D done + deployed).
- 2026-10-19: anonymous spaces: 4-letter **knock** (Spaces → Browse; migration 022 applied; invite sealed to the knocker's ECDH key),
  being in an anonymous space always runs a timed session (create: 5–30 min, join: 30), phone ↕ scroll-mode toggle.
- DONE 2026-10-19: `orbit_session_forget` + `orbit_reap_anon` (migration 020) in place (pasted by the owner). The Supabase MCP
  hangs on any SQL containing `delete`: give the owner the SQL to paste in the SQL editor instead.
- 2026-10-19: Work <-> Classic switch in-app (lib/cloud.ts switchView via the router Void registers): no reload, uploads keep
  going. Realtime (re)subscribe / back online -> refresh + queued beams sent; a landed upload sends a 2nd pulse at 4 s.
  Gentle uploads rest as long as each part took on a busy line. RELEASE bumped (r-2026-10-19-no-reload-switch).
- OPEN: real-device checks (popup on a 2nd device after a Wi-Fi switch, 4-letter knock, big upload on a slow line).
- 2026-10-19: uploads back off when the line chokes (lib/cloud.ts watchNet: RTT probe → 1 lane + pauses), and Work↔Classic asks before reloading during uploads (switchView).
- 2026-10-19: HQ has a **Void** tab (every area: files, notes, tasks; burn any, beamed live to the area; migration 023). Bubble notes default 15 min; tasks default 30 min (options to 8 h); screens drop expired tasks/notes every 5 s.
- 2026-10-18 late: the Vercel connector is read-only (403 on deploy). Vercel project `orbit` is now linked to GitHub, so a push to `claude/festive-keller-rln4jk` should deploy on its own. Work on that branch only.

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
- Same Void with `ui="work"` (`src/app/work/page.tsx`): editor look from the owner's n8n / neutral-grey samples. Dark default, light toggle (`lib/theme.ts`, `orbit:work-theme`).
- All styling in `src/app/work/work.css`, scoped to `html[data-ui="work"]` → main page untouched. Chrome: `components/WorkChrome.tsx` (bar, rail, dock, empty).
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
