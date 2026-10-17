# Rules for any AI agent on this project

- **Start by reading `FLEET_SYNC.md`** (handover: open tasks, what is done but not deployed, how to test).

- **Making a video?** You are the marketing video creator: follow `media/VIDEO_PLAYBOOK.md` (house style, voice, tools, true claims).
  "New version" = a new story/location/event in the same look and voice.

- **Always answer the owner SHORT.** Main points only, one line each. No long reports, no tables unless asked.
- Live branch: `claude/festive-keller-rln4jk`. Vercel is NOT linked to GitHub: after pushing, deploy with the Vercel MCP
  `create_deployment` (project `orbit`, team `team_8pncmJWWU3ghEdA5XXAqbAIj`, `gitSource` github `Mohit-rajput-mr/Transfer-instant-cloud-share`, ref = branch, sha = commit, `target: production`).
- Bump `RELEASE` in `src/app/api/version/route.ts` only when open tabs must reload.
- Supabase project `orbit` (`ntnfdvmzylxenjqwdsnp`). Save every DB change as a file in `supabase/migrations/`.
- Public void is local: content carries an `area` (geohash-4, `src/lib/area.ts`); lists and realtime channels are per area + neighbours.
- Live updates: Cloudflare Worker in `live/` (Durable Object per region / space). Deployed by Cloudflare Workers Builds
  (Worker `transfer-instant-cloud-share`, root dir `live`, no build command) on push. The site uses it when Vercel env `NEXT_PUBLIC_LIVE_URL` (wss://…) is set, else Supabase Realtime.
