# Orbi Transfer — "how it works" explainer (37 s, 1080×1920, vertical, voiceover)

`OrbiTransfer-how-it-works.mp4` · cover `cover.jpg`. For TikTok / Instagram Reels / YouTube Shorts.
An explainer, not an ad: opens on the question, then shows the mechanism. Phone screens are real captures of orbitransfer.com.

- 0:00 Hook: "Do you know why people are using Orbi Transfer?"
- 0:03 No login, no app: send on one phone, it shows up on the phone next to you
- 0:09 "So how does it work?"
- 0:10 Step 1 · the phone finds its rough area (a ~39 × 20 km geohash cell); the exact spot never leaves it
- 0:16 Step 2 · everyone in that cell and the 8 around it shares one live sky; the file appears on their screens in real time
- 0:23 Step 3 · locked (encrypted) on the phone first; only scrambled bytes travel; the passcode never does
- 0:29 Step 4 · after 30 minutes it burns up; no account, no trace
- 0:33 orbitransfer.com · "Try it on two phones"

Caption: Did you know you can send a file to anyone near you with no login and no app? Here's how it works. orbitransfer.com #tech #techtok #howitworks #filesharing #privacy

## Rebuild (in `source/`)
```
node capture.cjs                      # real phone screens → shots/ (needs `next start -p 3160`)
python3 vo.py /path/to/kokoro         # voiceover → vo/
node render.cjs 0 1110 frames         # split into ranges to run in parallel
python3 synth.py                      # score.wav (uses events.json)
ffmpeg -framerate 30 -i frames/%05d.png -i score.wav -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart ../OrbiTransfer-how-it-works.mp4
```
