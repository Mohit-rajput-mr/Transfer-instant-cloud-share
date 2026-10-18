# Orbi Transfer — Product Hunt kit

## Files
- `00-thumbnail-240.png` — the logo thumbnail (240×240, shown at 2× = 480×480).
- `gallery/01…10` — gallery images, 1270×760 layout rendered at 2× (2540×1520). Upload in this order.
- `raw-screens/` — the plain screenshots (desktop 1440×900 @2×, phone 390×844 @3×) if you want your own layouts.

## Name
Orbi Transfer

## Tagline (≤ 60 characters)
Send anything to anyone nearby. Encrypted. No login.

## Description (≤ 260 characters)
Drop a file, folder, note or link and it shows up on screens around you in about a second. Encrypted in your browser,
gone after 30 minutes, no account. Orbi Work adds private spaces and tasks with coloured routes for teams.

## Gallery captions
1. Send anything to anyone nearby — no account, no app.
2. Orbi Work: one calm board for your whole team.
3. Tasks: name it, tag @someone, submit, upload straight in.
4. Routes with your own steps and colours, live for everyone.
5. Arrange: every file lines up with its task.
6. Private spaces: a name and a passcode.
7. Anonymous mode: no location, no name shown to others.
8. Files, folders, text or links — up to 20 GB per file.
9. Encrypted before it leaves: AES-256, 310,000× key stretching, 12 tries, 30-minute burn.
10. The same Orbi on any phone browser.

## Topics
File sharing · Productivity · Privacy · Collaboration · Developer tools (optional)

## Maker's first comment (draft)
Hey Product Hunt! 👋 I built Orbi Transfer because sending a file to the person next to you still means logins, email
limits or chat apps squashing your photos.
With Orbi you open the site, drop anything (files, a whole folder, a note or a link) and it appears on screens around
you within about a second. Everything is encrypted in your browser before it leaves; with a code, only people who know
it can open it. Files burn after 30 minutes. No account, no app.
For teams there's Orbi Work: private spaces with a passcode, tasks you can name and assign with @name, routes with
your own steps and colours, and files wired straight to the task they belong to.
I'd love your feedback — what would make this your default way to share?

## Facts these claims rest on (from the code)
- AES-256-GCM in the browser; PBKDF2-SHA256 with 310,000 iterations turns the code into the key and an auth proof;
  the server stores only a hash of that proof; 12 wrong tries lock a file.
- Files burn after 5–30 minutes (default 30). Max 20 GB per file; big files go in parallel parts and resume.
- No user accounts. Spaces: private ones need a passcode; space files never show in the public area.
- Open files (no code) are still encrypted, but anyone nearby can open them — don't claim otherwise.
