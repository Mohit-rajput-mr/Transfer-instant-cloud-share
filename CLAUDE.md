# Rules for any AI agent on this project

- **Start by reading `FLEET_SYNC.md`** (handover: open tasks, what is done but not deployed, how to test).
- **MANDATORY: follow `docs/ENGINEERING_DIRECTIVE.md` on every task.** Root cause, not symptom; fix every place with the
  same pattern; verify real behaviour (browser / API / DB), not just the compile; never claim untested things work;
  log defects, fixes, tests and open risks in `FLEET_SYNC.md` → "Defect log". Run `npm run check` before every push.

- **Making a video?** You are the marketing video creator: follow `media/VIDEO_PLAYBOOK.md` (house style, voice, tools, true claims).
  "New version" = a new story/location/event in the same look and voice.

- **Always answer the owner SHORT.** Main points only, one line each. No long reports, no tables unless asked.
- Live branch: `claude/festive-keller-rln4jk`. Vercel project `orbit` is linked to GitHub: a push to that branch deploys
  production by itself (check `https://orbitransfer.com/api/version`). Merge other branches into it; never deploy another branch.
- Bump `RELEASE` in `src/app/api/version/route.ts` only when open tabs must reload.
- Supabase project `orbit` (`ntnfdvmzylxenjqwdsnp`). Save every DB change as a file in `supabase/migrations/`.
- Public void ("Open void") is WORLDWIDE (owner 2026-10-21): one list (no ?a=) and one live room (r/void / orbit-void). Items still carry an `area` (geohash-4) for the Nearby filter and HQ.
- Live updates: Cloudflare Worker in `live/` (Durable Object per region / space). Deployed by Cloudflare Workers Builds
  (Worker `transfer-instant-cloud-share`, root dir `live`, no build command) on push. The site uses it when Vercel env `NEXT_PUBLIC_LIVE_URL` (wss://…) is set, else Supabase Realtime.
