# Kepler: balanced on sunlight (HD film, 9:16)

"Do you know NASA kept a broken space telescope working by balancing it on sunlight?" Kepler (NASA's own model) watched ~150,000
stars at once for the tiny dimming when a planet crosses its star, and found more than 2,000 planets. It needed three of its four
reaction wheels to point precisely; in May 2013 the second one failed. In the K2 mission (2014–2018) the pressure of sunlight,
balanced evenly across the spacecraft, acted as the third wheel, until the fuel ran out in 2018.
Orbi ending (new for this series): the Filter — show only photos, videos, documents, audio or archives; or only what's on your
Wi-Fi, or only yours (`src/components/KindFilter.tsx`, `src/lib/skin-list.ts` KINDS).

- `OrbiTransfer-kepler.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 kep_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` (setsid nohup) → two-pass ffmpeg at 3400k.

## The spacecraft is NASA's own model
"Kepler (A)", NASA 3D Resources, free and without copyright — `media/kepler-model/` (×0.94 → 4.7 m tall). Built in code (labelled
DIAGRAM): the star + transiting planet with its light curve, the four reaction wheels (generic flywheels), the sunlight arrows, the phone.

## Facts and sources
| On screen / spoken | Source |
|---|---|
| Watched ~150,000 stars at once; transits; more than 2,000 planets | NASA |
| Needed 3 of its 4 reaction wheels; second failed May 2013 | NASA, Scientific American |
| K2 (2014–2018): sunlight pressure balanced across the spacecraft as the third wheel | NASA, Harvard Gazette |
| Retired October 2018, out of fuel | NASA, Space.com |
| Orbi: Filter — Show: Open void / Wi-Fi / Mine; File type: All files, Photos, Videos, Documents, Audio, Archives | `src/components/KindFilter.tsx` |
