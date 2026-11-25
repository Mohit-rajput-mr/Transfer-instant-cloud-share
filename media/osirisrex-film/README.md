# OSIRIS-REx: the asteroid that almost swallowed it (HD film, 9:16)

"Do you know NASA touched an asteroid, and it almost swallowed the spacecraft?" OSIRIS-REx (NASA's own model) touched asteroid
Bennu on 20 Oct 2020: a puff of gas stirred material into the sampler; the surface was barely held together ("like a plastic ball
pit") and the arm sank almost half a metre; about six seconds after contact it fired its thrusters to back away — still sinking;
without them it would have sunk into Bennu. The capsule landed in Utah in September 2023; two of the 35 fasteners on the sampler
head would not come off with the tools allowed in the sealed glovebox, until new tools freed them in January 2024.
Orbi ending (new for this series): Go private with the team — a private space with its own passcode, a one-tap invite for everyone
on your Wi-Fi, your tasks move with you (`src/components/TeamMove.tsx`, `src/components/TaskBoard.tsx`).

- `OrbiTransfer-osirisrex.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 orx_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` (setsid nohup) → two-pass ffmpeg at 3400k.

## Real image and model
- Bennu: "Bennu mosaic OSIRIS-REx" (NASA/Goddard/University of Arizona, public domain, Wikimedia Commons) — `source/ref/bennu_mosaic.jpg`.
  NASA's own Bennu 3D model ("1999 RQ36") is the smooth pre-arrival radar shape and does not look like the real boulder-covered
  asteroid → not used; the real photo is shown instead. The real SamCam touchdown sequence could not be downloaded here (Wikimedia
  429) → the touch is a labelled diagram.
- The spacecraft: "OSIRIS-REx", NASA 3D Resources, free and without copyright — `media/osirisrex-model/` (×0.18 → metres). Its
  sampler arm is stowed inside one mesh, so it is never shown extended; no arm is built.
- Built in code (generic, labelled DIAGRAM): the cut through the loose surface (pebbles, a simple sampler-head disk — not the real
  hardware — and the gas puff), the ring of 35 fasteners, the phones.

## Facts and sources
| On screen / spoken | Source |
|---|---|
| Touch-And-Go 20 Oct 2020; gas puff; nearly cohesionless surface ("plastic ball pit"); arm sank almost 0.5 m; thrusters ~6 s after contact while still sinking; would have sunk without them | NASA (July 2022), University of Arizona |
| Capsule landed in Utah, Sept 2023 | NASA |
| 2 of 35 TAGSAM-head fasteners couldn't be removed with the glovebox-approved tools; new tools; removed January 2024 | NASA, University of Arizona, Space.com |
| Orbi: Go private with the team (private space + passcode, one-tap invite on your Wi-Fi, tasks move) | `src/components/TeamMove.tsx` |
