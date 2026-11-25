# The photo of a landing: Mars Reconnaissance Orbiter (HD film, 9:16)

"This picture looks like a spacecraft falling into a giant crater on Mars. It isn't." The real HiRISE image of NASA's Phoenix lander
hanging under its parachute on 25 May 2008, ~13 km up, with a ~10 km crater ~20 km behind it. It was taken by NASA's Mars
Reconnaissance Orbiter (NASA's own model): HiRISE has a 0.5 m mirror and ~30 cm pixels from ~300 km; that day MRO was 760 km away,
moving at 3.4 km/s — the first time a spacecraft photographed another's final descent onto a planet (JPL).
Orbi ending (new for this series): notes — send text (encrypted like any file); every link, email, phone number and code in it is
tappable, "Copy all" in one go (`src/components/Notepad.tsx` RICH, `src/components/Panels.tsx`).

- `OrbiTransfer-mro.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 mro_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` (setsid nohup) → two-pass ffmpeg at 3400k.

## Real image and model
- The photo: "Descent of Phoenix with a crater in the background taken by Mars Reconnaissance Orbiter" — NASA/JPL-Caltech/University
  of Arizona (PIA10705), public domain (Wikimedia Commons) — `source/ref/phoenix_descent_hirise.jpg`, shown as is.
- The orbiter: "Mars Reconnaissance Orbiter (MRO) (C)", NASA 3D Resources, free and without copyright — `media/mro-model/`.
- Built in code (generic, labelled DIAGRAM): Mars below (noise + a Poly Haven sand texture; no named features), the side-view
  geometry (ground, crater dip, the parachute, the sight line), the phone.

## Facts and sources
| On screen / spoken | Source |
|---|---|
| 25 May 2008; Phoenix under its parachute ~13 km up; MRO at 310 km altitude, 760 km away, 3.4 km/s | HiRISE team release (Univ. of Arizona), NASA Photojournal |
| Crater (Heimdal) ~10 km wide; Phoenix ~20 km in front of it, not falling in | HiRISE, Planetary Society, NASA APOD |
| First time a spacecraft imaged the final descent of another spacecraft onto a planetary body | JPL |
| HiRISE: 0.5 m mirror; ~30 cm per pixel from ~300 km | HiRISE / USGS / NASA |
| MRO arrays ~13.6 m tip to tip; 3 m high-gain dish | NASA/JPL |
| Orbi: notes; links, emails, phone numbers and long codes found and tappable; Copy all / Select all | `src/components/Notepad.tsx`, `src/components/Panels.tsx` |
