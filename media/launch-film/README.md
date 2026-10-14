# ORBITRANSFER launch film

32.5 s · 1920×1080 · 60 fps · H.264 (CRF 16) + AAC 256k

| File | What it is |
| --- | --- |
| `ORBITRANSFER-film.mp4` | Final film with the synthesized sound bed |
| `ORBITRANSFER-film-silent.mp4` | Same picture, no audio (for re-scoring) |
| `source/` | Everything needed to regenerate or edit it |

## Storyboard

| Time | Scene |
| --- | --- |
| 0.0–3.4 | Emblem pops in → hands over to the wordmark (left-to-right reveal) + tagline |
| 3.4–6.5 | Kinetic type: DROP. LOCK. BEAM. BURN. (0.75 s apart, 80 BPM) |
| 6.5–14.5 | Real site in a browser frame: Upload splits → Send card, passcode typed → Launch, ball pops, In-orbit dock. Captions 01/02/03 |
| 14.5–20.3 | iPhone (iOS status bar + Safari bar): receive → decrypt → Ready preview → Save to Photos or Files → Saved ✓ |
| 20.3–25.9 | Feature beats over metallic spheres: encrypted · no login · files/folders/links · gone in 30 min |
| 25.9–29.0 | The live void with six objects |
| 29.0–32.5 | End card: wordmark, orbitransfer.com, made with ♥ by Mohit |

## How it is made (all code, no editor)

1. **`source/capture.cjs` + `source/lib.cjs`** drive the real app (`next start -p 3160`) in headless
   Chromium with every API call mocked, and capture it frame-exactly: Playwright's clock is paused, JS time
   and every CSS animation are stepped 1/60 s per frame. Output: PNG sequences in `cap2/` (not committed;
   regenerate with `node capture.cjs all`). The phone shot decrypts a real AES-GCM payload of `dusk.jpg`.
2. **`source/video.html`** is the film: one `render(t)` function positions every layer (stars, logo,
   kinetic type, browser + phone frames showing the captured sequences, captions, spheres, end card).
   Fully deterministic, no CSS animations.
3. **`source/render.cjs`** screenshots `render(t)` for every frame: `node render.cjs 0 1950 ./frames`
   (split into ranges to run in parallel).
4. **`source/synth.py`** synthesizes `score.wav` (pad, pulse, word hits, whooshes, UI pops) with numpy.
5. Encode:
   ```sh
   ffmpeg -framerate 60 -i frames/%05d.png -i score.wav -c:v libx264 -preset slow -crf 16 \
     -pix_fmt yuv420p -profile:v high -c:a aac -b:a 256k -shortest -movflags +faststart ORBITRANSFER-film.mp4
   ```

To re-score with real music: replace `score.wav` (cuts land on 3.45 + n × 0.75 s) and re-run step 5.
Timeline constants live in `T` inside `video.html`.
