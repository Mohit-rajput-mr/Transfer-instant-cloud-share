# Orbi Transfer — spaces film (54 s, 1080p30, voiceover)

`OrbiTransfer-spaces.mp4` · thumbnails `thumbnail-galaxy.jpg` (every space as a planet), `thumbnail-orbit.jpg` (the team flying into orbit around their space).

The idea: every circle you're part of (your studio, your family, your Sunday league) gets a space of its own, shown as its own planet.
The screens are real recordings of orbitransfer.com; the planets, people and beams are animation.

| Time | Scene |
|---|---|
| 0:00 | Your studio · your family · your league, each sharing files somewhere different (email threads, family chat, group chat, phone numbers: struck out) |
| 0:06 | Meet Orbi Transfer |
| 0:10 | 01 · Make your own space: Lucas creates "Studio North" on his laptop (cursor clicks) and the planet is born |
| 0:16 | 02 · Invite with one link: Ana, Noah, Leo and Yuki fly into orbit · no email, no phone number, no account |
| 0:22 | 03 · Drop once, everyone has it: laptop, office desktop and phone; each drop goes into the planet and out to every screen (Leo's from the train) |
| 0:29 | 04 · Find open spaces by name: Mateo searches "Sunday" on his phone, picks a name, joins (finger taps) |
| 0:34 | 05 · The whole league, instantly: Mateo's match photos land on coach Kim's desktop |
| 0:39 | 06 · Private stays private: the Lopez Family space (Sofia, Rosa, Diego, Mia); a stranger without the passcode bounces off |
| 0:43 | One for every circle: a galaxy of spaces |
| 0:46 | Free. No login. Private by design. |
| 0:50 | End card · Now live on Product Hunt |

People are international on purpose: Lucas, Ana, Noah, Leo, Yuki, Kim, Emma, Mateo, Amara, Sofia, Rosa, Diego, Mia.

## YouTube description

Make your own space. Orbi Transfer gives every circle you're part of (your team, your family, your club) a private space to share files. Invite with one link, no emails or phone numbers. Drop a file once and it lands on everyone's screen, live. Free, no login.

0:00 Every circle shares files somewhere different
0:10 Make your own space
0:16 Invite with one link
0:22 Drop once. Everyone has it.
0:29 Find open spaces by name
0:34 The whole league, instantly
0:39 Private stays private
0:43 One for every circle

Try it free: https://orbitransfer.com

## Voice

Kokoro, voice af_heart. "Orbi" is spoken as "Or-bee" (like "orbit" without the t): `vo.py` hands the voice "Orbee", and on-screen text stays "Orbi".

## Rebuild

```
cd source
node capture.cjs all                  # browse, league, family (app on localhost:3160); Studio North shots link to ../team-film
python3 build.py                      # video.html from video.tpl.html + the launch film's styles
python vo.py /path/to/kokoro          # voiceover → vo/
node render.cjs 0 1640 frames
node events.cjs && python3 synth.py   # sound cues → score.wav
ffmpeg -framerate 30 -i frames/%05d.png -i score.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest ../OrbiTransfer-spaces.mp4
```
