# Orbi Transfer — office film (50 s, 1080p30, voiceover)

`OrbiTransfer-office.mp4` · thumbnails `thumbnail-office.jpg` (the file flying across the office), `thumbnail-wide.jpg` (the office).

An animated office at dusk: people working at their desks, a meeting room, a Wi-Fi router, someone walking by with a coffee.
Every screen in the office (desk monitors, the meeting-room TV, Leo's phone) plays a real recording of orbitransfer.com.

| Time | Scene |
|---|---|
| 0:00 | Studio North, a busy morning: design, video, sales on one project |
| 0:07 | "Can you email it?" · "WhatsApp it to my number?" · "Anyone got a USB stick?" — struck out |
| 0:11 | Meet Orbi Transfer |
| 0:14 | Maya (design) drops a photo and hits Send — cursor clicks on her real screen |
| 0:19 | The file flies across the office to Leo on the sofa |
| 0:22 | Leo's phone: taps it, downloads, saved — no app, no account |
| 0:29 | Wi-Fi rings from the router; Noah taps Nearby — only files shared on this network |
| 0:34 | Meeting room TV: the team's own space, invite link `orbitransfer.com/?space=studio-north` |
| 0:40 | Free. No sign-up. Every device. |
| 0:44 | End card · Now live on Product Hunt |

## YouTube description

Your whole office, in orbit.
Orbi Transfer sends files across the room in seconds — from any laptop to any phone, in the browser. No email, no WhatsApp numbers, no USB sticks, no account.

0:00 A busy studio
0:07 The old way: emails, chats, cables
0:14 Drop it. Hit Send.
0:19 Across the room, instantly
0:22 One tap. Saved.
0:29 Same Wi-Fi? Tap Nearby
0:34 Your team's own space
0:40 Free. No sign-up. Every device.

Try it free: https://orbitransfer.com

## Rebuild

```
cd source
python3 build.py                      # video.html from video.tpl.html + the launch film's styles
python vo.py /path/to/kokoro          # voiceover (Kokoro, af_heart) → vo/
node render.cjs 0 1490 frames         # frames (cap/ links to the launch-film-v2 and team-film recordings)
node events.cjs && python3 synth.py   # sound cues → score.wav
ffmpeg -framerate 30 -i frames/%05d.png -i score.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest ../OrbiTransfer-office.mp4
```

## Voice

Kokoro, voice af_heart. "Orbi" is spoken as "Or-bee" (like "orbit" without the t): `vo.py` hands the voice "Orbee", and on-screen text stays "Orbi".
