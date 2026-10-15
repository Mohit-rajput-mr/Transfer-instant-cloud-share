# Orbi Transfer · "for teams" film

63 s · 1920×1080 · 30 fps · H.264 + AAC 256k · voiceover · −15.3 LUFS (YouTube-ready). No size limits mentioned.

| File | Use |
| --- | --- |
| `OrbiTransfer-teams.mp4` | The film |
| `thumbnail-team.jpg` | 1280×720 thumbnail (laptop, desktop and phone in one space) |
| `thumbnail-scan.jpg` | 1280×720 thumbnail (phone scanning the QR on the laptop) |
| `source/` | Everything to regenerate or edit it (same pipeline as `../launch-film-v2`) |

## What it shows (the real site)

| Time | Scene | Voice |
| --- | --- | --- |
| 0:00 | "Send it to my personal email?" / "Just WhatsApp me…" bubbles, struck out | "Sharing a file with your team usually means handing out your email, or your personal WhatsApp." |
| 0:07 | Logo | "Not anymore. Meet Orbi Transfer." |
| 0:10 | 01 · Cursor: Spaces → Create → "Studio North" → Private → passcode → name → Create | "Create your own space in seconds. Name it, and lock it with a passcode." |
| 0:16 | 02 · Copy invite link; the link flies to a teammate's phone; email / phone number / account struck out | "Then share one invite link. No emails. No phone numbers. No accounts." |
| 0:21 | 03 · Finger: the invite opens, "Ana", passcode, enter | "Your teammates just pick a name, and they're in." |
| 0:26 | 04 · Laptop, office desktop and phone in the space; Ana's, Ravi's and Leo's files beam to everyone | "Everything you drop inside stays inside…" |
| 0:33 | 05 · Wi-Fi rings; cursor taps Nearby; only this network's files stay | "In the office? Tap Nearby, and see only what's shared on your Wi-Fi." |
| 0:39 | 06 · Send a file, open its card, Copy link; a phone scans the QR, opens it, downloads | "Sending something to a client? Share a link, or let them scan the code…" |
| 0:48 | 07 · The creator taps Guest → "Remove?" → removed; Exit | "And you stay in control…" |
| 0:54 | Free. No login. Private by design. | |
| 0:58 | End card · Now live on Product Hunt | "Orbi Transfer. Your team, in orbit." |

## YouTube description (paste)

```
Share files with your team without giving out your email or WhatsApp.
Orbi Transfer: create a private space, invite with one link, see what's shared on your office Wi-Fi,
and send anyone a link or QR code. Free, no login, end-to-end encrypted.

https://orbitransfer.com

0:00 No more personal email or WhatsApp
0:10 Create your own space
0:16 One invite link
0:21 Teammates join with just a name
0:26 Only your team sees it
0:33 Nearby on your Wi-Fi
0:39 Share a link or scan a QR code
0:48 You stay in control
```

## Rebuild
`node capture.cjs all` (app on :3160) → `python3 build.py` → `node events.cjs` → `python3 synth.py` →
`node render.cjs 0 1890 frames` (in parallel ranges) → ffmpeg as in `../launch-film-v2/README.md`.
Voice: `vo.py` (Kokoro, `af_heart`).
