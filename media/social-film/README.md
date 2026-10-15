# Orbi Transfer — vertical film for TikTok / Instagram Reels / YouTube Shorts (21 s, 1080×1920)

`OrbiTransfer-vertical.mp4` · cover image `cover.jpg` (pick it as the cover on TikTok / Reels).

Built the way short-form launches work: a "POV" hook in the first second, a cut every 1–2 s, big word-by-word captions
(most people watch muted), real screens, and a "link in bio" ending. Text stays out of the bottom and right edges, where
TikTok and Instagram put their buttons and caption.

| Time | Scene |
|---|---|
| 0:00 | POV: you need this file on your phone. Right now. |
| 0:03 | Email it to yourself? Find a cable? (struck out) |
| 0:05 | Open Orbi Transfer (logo) |
| 0:07 | Laptop: drop it, hit send (cursor clicks) |
| 0:09 | The file drops down to the phone; one tap, saved (finger taps) |
| 0:12 | No app. No login. Free. |
| 0:14 | Works with your whole team too (team space on the phone) |
| 0:17 | orbitransfer.com · link in bio |

## Post text

TikTok / Reels caption:
> Laptop → phone in seconds. No app, no login, free. orbitransfer.com #productivity #techtok #filetransfer #lifehack #wfh

## Rebuild

```
cd source
python3 build.py && python vo.py /path/to/kokoro
node render.cjs 0 630 frames
node events.cjs && python3 synth.py
ffmpeg -framerate 30 -i frames/%05d.png -i score.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest ../OrbiTransfer-vertical.mp4
```
