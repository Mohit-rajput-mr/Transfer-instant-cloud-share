# Orbi Transfer — "At work" (85 s, 1080×1920, house style, expressive George voice)

`OrbiTransfer-at-work.mp4` · cover `cover.jpg`. Work mode for an office team: a studio, a 5 PM deadline, files lost in
chats → you open a private Space "Studio Nova" (a glass dome grows over your team's desks), everyone joins with the
passcode and a name (no accounts), files only reach the team (the team next door sees nothing) → a task "New logo @Maya"
with a route (in progress → in review → approved → delivered) as lights on a rail, Maya's drafts wired to it on cables,
the card rides the route live, a printed log of who/when, "Poster @Sam" cancelled in red → files locked, members only →
dusk: files burn after 30 min, tasks after up to 8 h with Pro.
**Site simulation:** real UI recordings of the app (Space create, task + route, attach folder, move steps, cancel) play as
full-screen phone inserts. Re-record: `npx next build` + `npx next start -p 3160`, then `node record.cjs [clip…]`
(stateful API mocks; frames go to `rec/`, not committed — convert to JPG as film.html expects `rec/<clip>/00000.jpg`).
