# Orbi Transfer · launch film (v2)

66 s · 1920×1080 · 30 fps · H.264 + AAC 256k · voiceover · −14.8 LUFS (YouTube-ready)

| File | Use |
| --- | --- |
| `OrbiTransfer-launch.mp4` | The film: YouTube, Product Hunt gallery, X/LinkedIn |
| `thumbnail-team.jpg` | 1280×720 thumbnail (team spaces) |
| `thumbnail-live.jpg` | 1280×720 thumbnail (laptop → phone beam) |
| `source/` | Everything to regenerate or edit it |

## What it shows (real site, real decryption)

| Time | Scene | Voice |
| --- | --- | --- |
| 0:00 | Hook: an account, an app, a cable, struck out | "Sending a file shouldn't need an account, an app, or a cable." |
| 0:04 | Logo, then laptop + phone fly in | "Meet Orbi Transfer. Open it in any browser, and you're ready." |
| 0:08 | 01 · Cursor clicks Send → Files, names it, Send (no password by default) | "Pick your files, give them a name, and hit send." |
| 0:12 | 02 · The ball launches; a beam carries it to the phone, which shows it instantly | "They float into orbit, and show up on every nearby screen. Instantly." |
| 0:17 | 03 · A finger taps the ball → Download → progress → the real photo → Save to Photos | "On your phone, just tap, and it's yours. No password, unless you want one." |
| 0:24 | 04 · Six files as separate balls → one "Brand kit" container → open → All 6 | "Sending a whole batch? It lands as one tidy container, with a single download all." |
| 0:34 | 05 · Office: laptop, desktop and phone in a private "Design team" space; Sofia's file beams to all | "Working with a team? Open a private space…" |
| 0:42 | 06 · "Saved · safe to close", the lid shuts, the cloud hands the file to the phone | "Close your laptop. Your file stays safe in the cloud…" |
| 0:50 | 07 · The ball's timer ends and it vanishes | "Then it's gone. No traces." |
| 0:55 | Free. No login. 5 GB. Any device. | "Free. No login. Up to five gigabytes, on any device." |
| 1:00 | End card: orbitransfer.com · Now live on Product Hunt | "Orbi Transfer. Send it into orbit." |

## YouTube description (paste)

```
Orbi Transfer: send files, folders, photos and links between any two devices, instantly. Free, no login, no app.
End-to-end encrypted, up to 5 GB, and gone after 5–30 minutes.

Try it: https://orbitransfer.com

0:00 Sending shouldn't need an account
0:08 Pick, name, send
0:12 Live on every screen
0:17 One tap on your phone
0:24 A whole batch, one container
0:34 Private spaces for your team
0:42 Close the lid, it's still there
0:50 Then it's gone
```

## How it is made (all code, no editor)

1. `source/vo.py`: the voiceover, synthesized locally with Kokoro (open model, voice `af_heart`) →
   `vo/*.wav` + `vo/lines.json` (durations). Model files: github.com/thewh1teagle/kokoro-onnx releases.
2. `source/capture.cjs` + `lib.cjs`: drive the real app (`next start -p 3160`) in headless Chromium with every
   API call and the cloud storage mocked, frame-exactly (fake clock, CSS animations stepped 1/30 s). Every
   click / tap target is recorded in `cap/<shot>/marks.json`. The phone decrypts a real AES-GCM copy of `dusk.jpg`.
   Shots: `send`, `receive`, `batch`, `space` (+ `spacephone`), `burn`, `void` → `node capture.cjs all`.
3. `source/video.html`: the film. One `render(t)` lays out the device frames, the cursor (moves on eased arcs,
   presses with a ripple exactly on the recorded targets), the finger, beams, captions and end card.
4. `source/events.cjs` writes every click / tap / beat to `events.json`; `source/synth.py` builds the score from
   scratch (100 BPM pad, arpeggio, drums, UI sounds on those events) and mixes the voice with ducking → `score.wav`.
5. `source/render.cjs`: `node render.cjs 0 1980 frames` (split into ranges to run in parallel), then
   ```sh
   ffmpeg -framerate 30 -i source/frames/%05d.png -i source/score.wav -c:v libx264 -preset slow -crf 17 \
     -pix_fmt yuv420p -profile:v high -c:a aac -b:a 256k -shortest -movflags +faststart OrbiTransfer-launch.mp4
   ```
Timings live in `VO`, `MAP` and `LAYOUT` at the top of the script in `video.html`.

## Voice

Kokoro, voice af_heart. "Orbi" is spoken as "Or-bee" (like "orbit" without the t): `vo.py` hands the voice "Orbee", and on-screen text stays "Orbi".
