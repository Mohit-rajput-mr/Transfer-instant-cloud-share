# Juno: pictures made by people at home (HD film, 9:16)

"Do you know some of the best pictures of Jupiter were made by people at home?" Juno (NASA's own model) reached Jupiter on 4 July
2016. It runs on sunlight — three ~9 m arms with 18,698 solar cells, only ~500 W at Jupiter (the most distant solar-powered craft
from January 2016); its electronics sit in a titanium vault with ~1 cm walls. JunoCam's raw images are posted online for anyone, and
people around the world turn them into the pictures you've seen — like the Great Red Spot image in this film.
Orbi ending (new for this series): the bubble board — everyone posts notes, each person in their own colour; an edit is marked
"edited" for everyone, the changed words blink green (`src/components/BubbleBoard.tsx`).

- `OrbiTransfer-juno.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 juno_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` (setsid nohup) → two-pass ffmpeg at 3400k.

## Real image and model
- "Great red spot juno 20170712" — NASA / SwRI / MSSS / Gerald Eichstädt / Seán Doran (citizen scientists), public domain
  (Wikimedia Commons) — `source/ref/great_red_spot_junocam.jpg`, shown as is.
- The spacecraft: "Juno (A)", NASA 3D Resources, free and without copyright — `media/juno-model/` (≈ metres).
- Built in code (labelled ILLUSTRATION / DIAGRAM): Jupiter as a banded sphere at its real radius (no specific storm claimed), the
  titanium vault cut-away with radiation particles, the phone. The bubble-board names are generic (Ana, Kai, Mia).

## Facts and sources
| On screen / spoken | Source |
|---|---|
| Orbit around Jupiter on 4 July 2016 | NASA/JPL, SwRI |
| Three ~9 m (30 ft) arrays, 18,698 cells, ~500 W at Jupiter; most distant solar-powered craft (Jan 2016) | NASA/JPL |
| Titanium vault, walls ~1 cm, ~200 kg with electronics | NASA/JPL (2010) |
| JunoCam raw images posted online; citizen scientists process them | NASA, SwRI (missionjuno.swri.edu) |
| Orbi: bubble board — stacks per person in their own colour; edits marked "edited", changed words blink green | `src/components/BubbleBoard.tsx` |
