# Orbi Transfer — intro film (61 s, 1080p30, landscape, voiceover)

`OrbiTransfer-intro.mp4` · thumbnail `thumbnail.jpg`. Made for YouTube and laptop screens (16:9). No launch-platform mentions.

What it is, then where it fits in a normal day, then every feature in one line each.
Screens are real recordings of orbitransfer.com; the office and the Paris café are animation.

| Time | Scene |
|---|---|
| 0:00 | "Email it to yourself? Find a cable? What's your number?" — struck out |
| 0:05 | Meet Orbi Transfer · drop it in, it floats in orbit |
| 0:11 | 01 · At work: Maya drops the new cut, it flies across the office to Leo's phone |
| 0:19 | 02 · Friends in Paris: Emma asks for the trip photos, Sofia sends them from the café table, they land on Emma's phone |
| 0:26 | 03 · The void, or just Nearby (only what's shared on your Wi-Fi) |
| 0:32 | 04 · Your own space: team, family, friends, one invite link |
| 0:39 | 05 · Bubble text: notes on both sides of the void, the board you can zoom, jump to anyone |
| 0:46 | 06 · Up to 20 GB: the Wi-Fi drops at 62%, it picks up again, saved |
| 0:52 | 07 · Make it yours: Orbit, Chrome, Wood, Neon, Pixel, Candy, Gold, Polaroid |
| 0:56 | Free. No sign-up. Encrypted. · orbitransfer.com |

## YouTube

Title: Orbi Transfer — send anything to anyone, no login (1-minute intro)

Description:
Orbi Transfer moves files between any two devices, in the browser. Drop a file in and it floats in orbit until someone grabs it, then it burns. No account, no app, no email, no cables.

0:00 The old way
0:05 Meet Orbi Transfer
0:11 Across the office
0:19 Photos with friends in Paris
0:26 The void, or just Nearby
0:32 Your own private space
0:39 Bubble text and the board
0:46 Up to 20 GB, resumes after a dropped connection
0:52 Styles: every file type has its own look
0:56 Free. No sign-up. Encrypted.

https://orbitransfer.com

## Rebuild

```
cd source
python3 build.py                      # video.html from video.tpl.html + the launch film's styles
python vo.py /path/to/kokoro          # voiceover (Kokoro, af_heart) → vo/
node capture.cjs                      # real recordings of the site (local build on :3160) → cap/
node render.cjs 0 "" frames           # frames; the office and spaces films play inside it (served over a local http server)
node events.cjs && python3 synth.py   # sound cues → score.wav
ffmpeg -framerate 30 -i frames/%05d.png -i score.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest ../OrbiTransfer-intro.mp4
```

## Voice

Kokoro, voice af_heart. "Orbi" is spoken "Or-bee" (like "orbit" without the t): `vo.py` hands the voice "Orbee"; on screen it stays "Orbi".
