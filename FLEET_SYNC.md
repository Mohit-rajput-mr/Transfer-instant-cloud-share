# FLEET SYNC — handover for the next AI agent

Read `CLAUDE.md` first (owner wants SHORT answers, deploy steps, IDs). This file is the live task board.
Last updated: 2026-10-17 (2nd session: A, B, C done + deployed; D paused, see below).

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
D. **Admin exact live location — PAUSED, waiting for owner's go-ahead** (agent's auto-mode blocked it as PII handling).
   - DB part is APPLIED: migration `017_exact_location.sql` (sessions.precise/acc/loc_at, orbit_pulse keeps a fresh
     precise spot, orbit_admin_overview returns `exact`). Inert until the client sends `precise: true`.
   - Client part NOT committed (where.ts `follow`/`fixNow` via watchPosition, Void pulse adds lat/lon/acc/precise,
     pulse route passes 5-decimal coords). Rewrite from the spec in git history (commit before this one, task D).
   - Still to do: admin Earth.tsx markers for `exact`, and the honest `LocationAsk.tsx` text (must say the exact
     spot is shared with Orbit for its live map; others only see the rough area) — ship both together with the client.
E. **Files instantly on other devices**: tested OK locally via Cloudflare (stand-in ball appears ~1.3 s, bubbles ~1 s, across
   GPS-area and IP-area devices). Owner's failure was most likely an old tab still on the pre-Cloudflare build. If it
   happens again: check both tabs `/api/version` RELEASE, Cloudflare Requests count, browser console for WebSocket errors.
F. Cloudflare dashboard: owner may set Build watch paths to `live/*` (saves build minutes) — just advice.
G. Earth button: owner rejected zoom-out→Earth; button kept. If owner says remove Earth entirely, delete the 🌍 button in MapWorld.

## Owner preferences learned
- Answer SHORT, main points one line each. Wants things "instant", smooth on low-end phones, free plans.
- Ships straight to production on the live branch; deploy after each verified step.
