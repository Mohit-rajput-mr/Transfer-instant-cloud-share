# BRIEF — 5 landmark films ("everyone knows it, nobody knows how it works")

You are the marketing video creator for Orbi Transfer. Make the five HD explainer films below, one at a time, each to the
quality of `media/taipei-film/` (the owner's most viral film so far: it went viral). Do not ask questions; follow this brief.
If you run as several agents, take one film each (say which in FLEET_SYNC.md first so two agents don't make the same film).

## FORMAT (owner 2026-11-22, wins over everything): 9:16 vertical (TikTok size, 1080×1920) ONLY.
No landscape / 16:9 renders for any film, now or in future.

## 0. Read first (mandatory, in this order)
1. `CLAUDE.md` (rules: HIGH END ONLY, answer the owner short, live branch, never deploy another branch).
2. `docs/ENGINEERING_DIRECTIVE.md` (verify real behaviour; never claim untested things; log in FLEET_SYNC "Defect log").
3. `FLEET_SYNC.md` (handover) and `media/VIDEO_PLAYBOOK.md` (house style, voice, pipeline, true Orbi facts).
4. The reference film, end to end: `media/taipei-film/OrbiTransfer-taipei-101-golden-ball.mp4` and its source
   `media/taipei-film/source/` (`script.json`, `story.js`, `taipei_sfx.py`, `make_events.py`, README). Copy that structure.

## 1. The five films (each ~110–150 s, 14–18 voice lines)
Every number below must be checked against at least one solid source (official site, engineering paper, Wikipedia with
its citation) BEFORE it goes in the script; list the sources in the film's README. If a number can't be confirmed, drop
or soften it ("about", "up to"). Never invent statistics.

### 1. Burj Khalifa — why the wind can't knock over the world's tallest building  (`media/burj-film/`)
- Hook: "Do you know why the tallest building on Earth is shaped like a desert flower?"
- Mechanism: a tall tower in wind sheds vortices left/right in a steady rhythm → it rocks. Burj Khalifa's Y-shaped plan
  and its setbacks spiralling up the tower change the shape at every level, so the vortices never line up ("confusing the
  wind"). Also: the buttressed core (three wings brace each other), the concrete pumped to record height, the piled raft
  foundation, the spire.
- Must-show shots: a plain cylinder tower vs. Burj in the same wind (vortex streets as glowing smoke; the cylinder rocks,
  Burj stays calm); top-down Y plan with the wings bracing the hexagonal core; setbacks spiralling up (camera orbit, 828 m);
  x-ray to the foundation piles in the ground; concrete pump stages climbing; Dubai skyline + desert + Gulf at golden hour.
- Orbi tie-in (true): a big file is split into parts and sent several at a time, so no single weak point; it resumes after a drop.

### 2. The Eiffel Tower — taller in summer, and it leans away from the sun  (`media/eiffel-film/`)
- Hook: "Do you know the Eiffel Tower is taller in summer?"
- Mechanism: ~7,300 t of puddled iron expands with heat (up to ~15 cm taller); the sunny side expands more, so the top
  leans away from the sun and traces a loop over a day. ~18,000 parts, ~2.5 million rivets, hot-riveted (rivet heated
  red, hammered, shrinks as it cools and clamps the plates). Lattice = strong but light, wind passes through.
- Must-show shots: Paris at dawn → noon (sun arc), thermal-camera colour sweeping across the iron, the summit drawing its
  daily loop (sped up, motion exaggerated + labelled); macro of the lattice; a rivet heated glowing red, hammered, cooling;
  winter vs. summer side by side with a height ruler; the Seine, Champ de Mars, people for scale.
- Orbi tie-in (true): it moves with the conditions — Orbi picks the fastest path: same Wi-Fi first, the encrypted cloud otherwise.

### 3. The Golden Gate Bridge — two cables hold up the whole road  (`media/goldengate-film/`)
- Hook: "Do you know each of the Golden Gate's two main cables is made of 27,572 thin wires?"
- Mechanism: the deck hangs from suspender ropes, the suspenders hang from two main cables, the cables pass over the
  towers (which only push straight down) and are anchored in giant concrete anchorages at each end. The deck moves up
  and down with heat and traffic. The colour is International Orange (visibility in fog).
- Must-show shots: fog rolling through the towers at sunrise (volumetric fog), Pacific swell + tide under the bridge;
  load path animation (truck weight → suspender → cable → tower/anchorage, glowing arrows); cable cutaway zooming from the
  full cable → strands → individual wires; the anchorage block in cross-section; deck sag hot vs. cold (exaggerated, labelled).
- Orbi tie-in (true): many small parts carry the load together — a 20 GB file travels as many parts, 3 at a time.

### 4. The Statue of Liberty — 2.4 mm of copper on a hidden iron skeleton  (`media/liberty-film/`)
- Hook: "Do you know the Statue of Liberty's skin is only about as thick as two coins?"
- Mechanism: ~2.4 mm copper sheets hammered into shape (repoussé), hung on a flexible iron armature designed by Gustave
  Eiffel's engineers, so it can sway in the wind without cracking; the copper turned from shiny brown to green (patina)
  over ~30 years, and the patina protects it.
- Must-show shots: harbour at dawn with waves and gulls; x-ray reveal from the copper skin to the iron skeleton and the
  central pylon; a craftsman hammering copper over a wooden form (repoussé); time-lapse of the copper ageing brown → green
  (real patina shader); the statue + torch swaying in a storm (exaggerated + labelled); visitors on the crown stairs.
- Orbi tie-in (true): thin but protected — every file is locked on your device (AES-256-GCM) before it leaves.

### 5. The Leaning Tower of Pisa — why it hasn't fallen, and how engineers pulled it back  (`media/pisa-film/`)
- Hook: "Do you know engineers saved the Leaning Tower by digging soil out from under it?"
- Mechanism: built on soft clay and sand, it started leaning during construction (12th century); builders even curved
  the upper floors to compensate. In 1990–2001 engineers carefully extracted soil from under the HIGH side (soil
  under-excavation, with temporary steel cables + lead counterweights), and it straightened by roughly 40 cm.
- Must-show shots: Piazza dei Miracoli at sunset with tourists "holding it up"; geological cross-section of the clay
  layers squeezing under the low side; centuries-lapse of the tilt growing; the curved upper storeys; the lead weights
  and cables; slanted drills pulling out soil, the ground settling, the tower easing back (exaggerated + labelled).
- Orbi tie-in (true): careful and controlled — you choose when it burns: 5, 10, 15, 20 or 30 minutes.

Orbi ending for every film: 2–3 lines, real orbitransfer.com captures on a phone + laptop (`media/kit/cap_live.cjs`, or
the shots in `media/launch-film-hd/source/shots/`), then the end card. Only claim things in the playbook's verified facts.
Never say "gone in 30 minutes": the sender picks 5–30 min. Each film ends on a different Orbi feature.

## 2. How it must look (the quality bar = Taipei or better)
- **Real geometry, real scale.** Units in metres. Build each landmark from its real plans and dimensions (heights, floor
  counts, setbacks, lattice members, cable sag, statue proportions, tower tilt). No placeholder boxes, capsules, blobs or
  low-poly stand-ins (CLAUDE.md "HIGH END ONLY"). If a real-looking asset can't be found or built, change the shot.
- **Assets:** procedural geometry from real dimensions + CC0 Poly Haven models/textures/skies (`python3 media/kit/ph_get.py`),
  real 2k/4k PBR textures (concrete, iron, copper, marble, asphalt, water), the BodyParts3D people (`media/kit/anatomy.js`)
  for scale. Record every asset licence in the film's README.
- **Materials & light:** physically based (metalness/roughness/normal maps), a real HDRI-style sky per film, soft shadows,
  sun position that matches the time of day, bloom only on hot/bright things, the film grade (vignette, grain, light CA).
- **Physics, shown correctly:** vortex shedding (particle smoke streets), thermal expansion (colour + measured motion),
  load paths (glowing force arrows), patina (time-driven shader), soil settlement (layered cross-section). Exaggerated
  motion is always labelled "MOTION EXAGGERATED" (as in Taipei).
- **Water & weather:** animated water surfaces with waves, foam at shores/piers, spray, reflections; volumetric-looking fog
  (Golden Gate), rain/wind streaks (storms), drifting clouds, gulls/birds where natural.
- **Camera:** a cut or camera move every 1–2 s, drone orbits, top-down plans, macro close-ups, x-ray/cutaway reveals,
  people for scale. Frame both formats (see §3).
- **HUD:** big numbers with a count-up, callouts with leader lines anchored to real 3D points, 1–3 word subtitles
  (house style), section titles, end card.
- **Sound:** per-film sound design file like `taipei_sfx.py` → `extra.wav`: wind, city/harbour ambience, water, metal
  creaks, rivet hammer, crowd murmur, storm, the mechanism's own sound; mixed by `kit/synth.py` under the voice.
- **Voice:** the house voice (Chatterbox clone, `kit/vo.py`), opening line "Do you know …?", every take checked by
  Whisper (re-record any line with WER > 0.1 or a misheard brand/number).

## 3. Pipeline (copy taipei-film; landscape is built into the kit)
1. `mkdir media/<film>/source && ln -s ../../kit kit`; write `script.json` → `/tmp/cb/bin/python kit/vo.py` → `vo/lines.json`.
2. `story.js` on `kit/hd.js` (`H.frame`, `move`, `callout`, `title`, `hudEl`, `H.land` for landscape framing; use
   `PX(x, y)`-style helpers so HUD/callouts sit right in both formats — see `media/launch-film-hd/source/story.js`).
3. `make_events.py`, `<film>_sfx.py`, `EXTRA_GAIN=1.2 python3 kit/synth.py` → `score.wav`.
4. Preview often: `python3 kit/preview.py out.png key:0.5 …` (portrait) and `AR=land python3 kit/preview.py …` (landscape).
   Look at EVERY section in both formats before rendering; fix glare, empty frames, overlaps, wrong scale.
5. Render with a resumable script (only missing frames, 4 workers, encode to `.part.mp4` then rename) — copy
   `render_lf.sh` logic from FLEET_SYNC / launch-film notes. Portrait `frames_port/` (default), landscape `AR=land` → `frames_land/`.
6. Encode H.264 4500k, AAC 192k: `OrbiTransfer-<film>-9x16.mp4` and `OrbiTransfer-<film>-16x9.mp4` + `cover-9x16.jpg`,
   `cover-16x9.jpg`. Check each with ffprobe (duration = voice), a 10-frame contact sheet, and a Whisper pass on the audio.
7. Delete frames after a verified encode (disk). Commit source + MP4s (< 100 MB each) to your branch, push, update the
   playbook "Films so far" and FLEET_SYNC; send the owner the MP4s with a Reddit title + body (science subs: no promo in
   the title; Orbi only at the end of the body).

## 4. Done means
- Both formats rendered, verified, committed, pushed; README with sources + asset licences; FLEET_SYNC updated.
- Every fact in the voice and on screen is sourced; every Orbi claim is in the playbook's verified list.
- Answer the owner SHORT: one line per film (length, size, where it is).
