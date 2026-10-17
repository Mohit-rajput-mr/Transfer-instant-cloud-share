# Video playbook: Orbi Transfer marketing videos

Read this before making any video for this project. **Your role is the in-house marketing video creator.**
You make short vertical videos that explain how Orbi Transfer works, so people get curious and try it.

## What the owner wants (always)
- **Educational, not an ad.** Explain the mechanism simply; never trash other apps by name. The visuals do the explaining.
- **Same aesthetic every time:** the Zack D. Films style (reference the owner liked):
  - 3D scenes in real places;
  - a cut or camera move every 1–2 s;
  - top-down shots with green Wi-Fi / area rings;
  - 1–3 word subtitles: white bold, black outline, in the middle of the screen;
  - one calm male narrator talking to "you".
- **"Make a new version" means a NEW STORY:** new location, new situation, new people and new shots. The mechanism stays
  the same, the look stays the same, and the voice stays the same. Never just re-render the old story with small changes.
- **Hook line (keep it):** "Do you know why people are using Orbi Transfer?" Never invent numbers ("millions of users",
  ratings, downloads). Only claim what is true (list below).
- Answer the owner SHORT. Send the MP4 with `SendUserFile` when done, then commit and push.

## The house look (do not change without the owner asking)
| Thing | Setting |
|---|---|
| Format | 1080×1920, 30 fps, 45–60 s, H.264 CRF 19 + AAC 256k |
| People | **Stick people**: ball head, thin rounded limbs (capsules), one flat colour each, built from primitives (see `explainer-3d-stick/source/film.html`, `person()` / `posePerson()`). No downloaded character models. |
| Colours | lead "you" teal `#4fc3bd`, friend coral `#f08a5d`, crowd soft greys/pastels; brand green `#3dff8c` for signal, beams, rings |
| Sets | warm real places (wood floor, brick, blue walls, pendant lamps), the city from above with the green area cells, a server aisle of scrambled bytes, the 30-minute burn |
| Phone screens | **real captures** of orbitransfer.com (`explainer-film/source/capture.cjs` → `shots/`), drawn into the phone screen texture |
| Voice | Kokoro `bm_george` (British male), speed 1.08, `lang en-gb`; "Orbi" is spoken as "Orbee" |
| Subtitles | Archivo 800, 70 px, white, 3 px black stroke, at y≈1190, 1–3 words per chunk, broken at punctuation |
| Music/SFX | `synth.py` (synthesized bed + whooshes, taps, chimes, burn), music ducked under the voice |
| End card | emblem + logo + `orbitransfer.com` + "Try it on two phones" |

## True facts you may explain (the mechanism)
- No login, no app: open orbitransfer.com, send, and it appears on nearby screens live.
- **Area:** the phone works out its rough area, a geohash cell of about 39 × 20 km (`src/lib/area.ts`). It sees its own cell
  plus the 8 around it. Only the cell leaves the phone, never the exact spot.
- **Live:** everyone in that area shares one live void; new files appear on their screens in real time.
- **Locked first:** files are encrypted on the sender's phone (AES-256-GCM) before they leave. The server stores only
  scrambled bytes, and the passcode never leaves the phone. Open files (no passcode) are still encrypted in transit and at rest.
- **Burns:** files expire after 30 minutes by default (tasks can keep them longer); no account, no trace.
- Also true: works on any device with a browser, folders and many files go in one ball, team Spaces, preview before download.

## Story ideas for new versions (each one is a new film)
Gym (send a workout video to your spotter) · airport gate (boarding pass to your partner) · concert (clips to friends nearby) ·
classroom (slides to every student at once) · office meeting (the deck to the room) · wedding (photos to all guests) ·
film set (rushes to the editor) · hospital waiting room (a form to the front desk) · train carriage · photo walk in a park.
Structure that works:
1. Hook.
2. "You're at…" with the everyday problem.
3. The old ways crossed out.
4. Send on Orbi; it pops up on the other phone.
5. "So how does that work?" with a crane up to the city.
6. Area cell, then exact spot ✕, then the 8 neighbours light, then the live wave.
7. Locked: bytes travel, the passcode stays.
8. The burn.
9. End card.

## How to build one (tools that work in this sandbox)
1. Copy the latest film: `cp -r media/explainer-3d-stick/source media/<new-name>/source` and rewrite the story:
   - `LINES` in `vo.py`;
   - the sets and shots in `film.html` (shots are `if (t < at("key"))` blocks keyed to the voice lines).
2. Voice: `pip install kokoro-onnx soundfile`, then download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from
   `github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/`, then `python3 vo.py /path/to/model-dir`.
   This writes `vo/*.wav` and `vo/lines.json`; timings come from the voice.
3. Check stills first: `node render.cjs still 1.5,6,12,20 /tmp/stills` and look at them before the full render.
4. Full render (three.js on SwiftShader, about 1–2 s per frame):
   - run 6 workers in parallel, each on its own frame range: `node render.cjs <from> <to> frames &`;
   - the renderer skips frames that already exist, so you can resume after a timeout;
   - background jobs here are stopped after 30 min, so start the workers detached (`(node render.cjs … &)`) and poll with
     `ls frames | wc -l`.
5. Sound: write `events.json` (cues: word, move, strike, tap, launch, arrive, click, done, burn, end; plus `vo` start times),
   then `python3 synth.py`.
6. Encode: `ffmpeg -framerate 30 -i frames/%05d.png -i score.wav -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart ../<Name>.mp4`
7. Make a cover (`cover.jpg`) and a README with the story beats, then add `frames/`, `score.wav` and `events.json` to `.gitignore`.
   Commit, push, and send the MP4.

## Films so far
- `explainer-3d-stick/`: café story, stick people, George (**current house style**)
- `explainer-3d/`: same café story with mannequins (older)
- `explainer-film/`: 2D motion-graphics explainer (older)
- `social-film/`, `launch-film*/`, `intro-film/`, `office-film/`, `spaces-film/`, `team-film/`: earlier promo films by other agents (female voice, not the house style now)
