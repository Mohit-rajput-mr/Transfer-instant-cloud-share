# Reddit: ready-to-post drafts (owner 2026-11-21)

Every claim below is checked against the live code (plans.ts, transfer flow, migration 045). Do not add numbers.

## Post 1 — r/SideProject (also fits r/webdev "Showoff Saturday", r/InternetIsBeautiful rules permitting)

**Title:** I got tired of emailing files to myself, so I built a file drop with no account that burns everything after 30 minutes

Hey r/SideProject,

The dumbest part of my day used to be moving a file from my phone to the laptop right next to it. Email it to myself, wait for a chat app to squash the video, or find out AirDrop doesn't talk to Windows or Android.

So I built **Orbi Transfer**: [orbitransfer.com](https://orbitransfer.com)

**How it works**
- Open it in any browser, on any device. No account, no app.
- Drop a file, a whole folder, a note or a link. It shows up live on the other screen: same Wi-Fi, your area (Nearby), or worldwide in the Open Void. Or scan its QR code.
- It's encrypted in your browser (AES-256-GCM) before it leaves. Add a passcode and the passcode never leaves your device.
- Up to 20 GB on the free plan, the original file, never compressed. Folders keep their structure.
- Everything burns: 30 minutes or less by default.

**Things I added because people asked**
- **Download limit that burns on the spot:** set "max 2 downloads" and the file is destroyed the moment the 2nd person has it. In anonymous mode it vanishes live from every screen, and the same device downloading twice still counts once.
- **Anonymous mode / Ghost World:** no name, no location on your files, a separate room only anonymous people see.
- **Private Spaces:** a passcode room for a team or a group of friends.
- **See who's downloading (anonymous spaces):** the sender watches the receiver's download go 5% → 40% → "got it".
- **Work mode** (orbitransfer.com/work): files, notes and tasks on one board for small teams.

**What I'd love feedback on**
1. Is "files burn" a plus for you or a worry?
2. What's the first thing you'd try to send with it?
3. Anything confusing on the first screen?

Free to use, no sign-up. A Pro plan exists for bigger files (100 GB) and longer life, but everything above works without it.

Thanks for reading. I'll answer every comment.

---

## Post 2 — r/privacy-style discussion (only where self-promotion is allowed; read the sub's rules first)

**Title:** How do you send a file to someone without either of you making an account?

I've been building a tool around this exact question and I'm curious how others handle it. My approach: the file is encrypted in the browser before upload, a passcode (if set) never leaves the sender's device, the server only sees scrambled bytes, and the file is deleted after 30 minutes or after its download limit. No account on either side.

Honest limits, since this sub cares: open files (no passcode) use a public built-in key, so anyone in that room can open them; the server keeps an IP for abuse reports (see the privacy page); and device-to-device isn't guaranteed on every network, so there's a stored encrypted copy as a fallback.

What would you want from a tool like this before you'd trust it? (Mine is orbitransfer.com if anyone wants to poke holes in it.)

---

## Rules
- Check each subreddit's self-promotion rules first (many need 9:1 participation, some ban links in titles).
- One sub per day; never cross-post the same text the same hour.
- Post as the maker ("I built"), reply to every comment within the first 2 hours.
- Never claim user numbers, ratings or "no logs". Only the facts above.
- Attach the launch film (media/launch-film-hd, landscape for desktop subs) where video posts are allowed.
