# Video playbook: Orbi Transfer marketing videos

Read this before making any video for this project. **Your role is the in-house marketing video creator.**
You make short vertical videos that explain how Orbi Transfer works, so people get curious and try it.

## THE GOAL (owner, latest — read first)
The films are **education, not "upload and download"**. The viewer is the person who just *received* a file and wonders:
"How did this reach my phone with no login, no name, no number? How did they find me?" Every film answers that with a
simple visual explanation of the closed local network: the rough area, the live room, the locked file, the code, and the burn.
Then each film teaches **one more thing**, chosen by you, for example:
- why the server never slows down or crashes (it only signs tickets; the bytes fly straight to storage or phone to phone);
- why storage never fills (everything burns; caps);
- how big files (up to 20 GB) go in parts, several at once, and resume;
- private Spaces (passcode room, members only, invisible to the public area);
- open files (no code: anyone nearby can open them, like a public noticeboard);
- tasks (files wired to a task, step colours);
- end-to-end: the hosting platform never sees a file byte.
Add your own creativity beyond the owner's list, but stay true to the facts below.
**Whole world low-poly:** people in style 5 *and* the sets (faceted ground, low-poly trees, rocks, buildings, `flatShading: true`
everywhere, flat pastel palette). No smooth or realistic props.
When the owner says "new version" / "next", make the next film from the story list, without asking.

## Verified mechanism facts (checked in code 2026-10-17; never claim beyond these)
- **No account.** A device is a random id in localStorage; each file gets a random owner key kept on the sender's device.
- **Area:** geohash-4 cell (about 39 × 20 km) + its 8 neighbours. GPS is turned into the cell on the phone; without GPS the
  server guesses the area from the network (IP location). Safe wording: "others only ever see the rough area". (Do not say
  "your exact location never leaves the phone": FLEET_SYNC task D may change that.)
- **Live room:** Cloudflare Worker, one Durable Object room per region (geohash-3, about 156 km) or per private Space. Every open
  Orbi tab joins its region's room; a new file sends a small note, not the file, and screens in the 9 cells show it within
  about a second. Quiet rooms sleep. (Fallback: Supabase Realtime.)
- **Locked on the sender's phone:** PBKDF2-SHA256 (310,000 rounds) turns the code into an AES-256-GCM key plus an "auth proof".
  Encrypted in 8 MB chunks. The server keeps only a hash of the proof; 12 wrong tries lock the file.
- **Open files** (no code) are still encrypted, with a public built-in code, so anyone nearby can open them. Never claim nobody
  can open an open file.
- **Unlock:** the receiver's phone derives the key from the code and sends the proof; the server returns a signed link that
  lasts 3 hours; the bytes stream in and unlock chunk by chunk on the receiver's phone.
- **Bytes never touch the website server:** the browser uploads straight to Cloudflare R2 using signed URLs. Parts are about
  32 MB, 3 at a time; downloads use 4 ranges at once. Uploads resume after a drop (only the missing parts are sent).
  Phone-to-phone (WebRTC P2P) is tried first; storage is the fallback. There is no TURN server, so P2P is not guaranteed.
- **Max file size:** 20 GB. Folders and many files go as one bundle.
- **Burn:** 5 to 30 minutes (default 30); after the download limit, within 10 minutes. The reaper deletes the stored objects.
  Fair-use caps: 300 uploads/hour per network, 300 GB alive at once (past that it still sends P2P, it just isn't stored).
- **Spaces:** a named room; private ones need a passcode (4+ characters). Joining gives the device its own pass. Space files
  never appear in the public area, and only members can unlock them. The owner can remove members.
- **Tasks:** files can be wired to a task with coloured steps; tasks burn too (Pro: up to 8 h).

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
| People | **Low-poly colour men and women** (owner's pick, style 5 in `people-samples/`): faceted lathe limbs, one flat colour each, men muscular, women with hair and a feminine build, built from primitives (see `airport-film/source/film.html`, `person(x,z,ry,tint,{sex})` / `posePerson()`). Mix both sexes in every crowd. No downloaded character models. |
| Colours | lead "you" teal `#4fc3bd`, friend coral `#f08a5d`, crowd soft greys/pastels; brand green `#3dff8c` for signal, beams, rings |
| Sets | warm real places (wood floor, brick, blue walls, pendant lamps), the city from above with the green area cells, a server aisle of scrambled bytes, the 30-minute burn |
| Phone screens | **real captures** of orbitransfer.com (`explainer-film/source/capture.cjs` → `shots/`), drawn into the phone screen texture |
| Voice | **Chatterbox** cloned from George (`concert-film/source/ref_george.wav`, made from Kokoro `bm_george`), emotion 0.75–1.2 per line (above ~1.4 it strains), every take checked by faster-whisper; "Orbi" spoken as "Orbee". Owner: Kokoro alone sounded robotic. |
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

## Owner feedback (latest, wins over older notes)
- **The voice must have feeling, not robotic** (2026-10-18). Use `concert-film/source/vo.py` (Chatterbox + George reference,
  emotion per line, auto-checked takes). Write lines to be *spoken*: reactions, short punchy sentences, real exclamations.
  Setup: venv, `pip install --extra-index-url https://download.pytorch.org/whl/cpu chatterbox-tts faster-whisper jiwer soundfile "setuptools<81"`.
  About 7× slower than real time on CPU (≈20 min for 80 s). Don't clone a real person's voice.
- **Never reuse wording.** Every film gets a fresh script: new lines, new jokes, new metaphors. Only the hook line stays.
- **Explain it like to a simple person, in layers:** follow the file's whole journey with everyday pictures, not tech words:
  1. sealed in a locked box (the passcode is the key and never leaves your phone);
  2. cut into pieces, several flying at once (that's why it's quick);
  3. the pieces wait in a vault, still locked;
  4. Orbi rings the phones in your part of the city (the area, never the exact spot);
  5. a guest taps and types the passcode; the pieces drop, click together and unlock;
  6. after 30 minutes the vault burns every piece.
- **New look for the mechanism each time** (same feel, never the same city blocks): e.g. the hex-tile toy town, the vault,
  the holographic phone of `wedding-film/`. Invent a new visual for the next one.

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
1. Copy the latest film: `cp -r media/airport-film/source media/<new-name>/source` and rewrite the story:
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
- `concert-film/`: arena encore, code "rock", the clip as a song (guitar case → notes flying at once → backstage door → stadium light wave → song plays → stage goes dark), Chatterbox voice with feeling (**latest**)
- `airport-film/`: arrivals gate, code "tram", a whole folder as luggage (suitcase → bags on belts → baggage hold → radar → carousel → shredder), low-poly men and women (MP4 rendered 2026-10-18, 79 s)
- `wedding-film/`: wedding, passcode "cake", the photo's full journey (locked box → pieces → vault → ring → unlock → burn)
- `gym-film/`: the gym, bench-press video (house style)
- `explainer-3d-stick/`: café story, stick people, George (house style)
- `explainer-3d/`: same café story with mannequins (older)
- `explainer-film/`: 2D motion-graphics explainer (older)
- `social-film/`, `launch-film*/`, `intro-film/`, `office-film/`, `spaces-film/`, `team-film/`: earlier promo films by other agents (female voice, not the house style now)
