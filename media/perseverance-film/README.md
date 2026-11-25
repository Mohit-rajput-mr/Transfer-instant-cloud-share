# Perseverance: dare mighty things (HD film, 9:16)

"Do you know NASA hid a secret message on the parachute that landed on Mars?" NASA's Perseverance rover landed in Jezero Crater on
18 February 2021: it hit the Martian air at ~20,000 km/h and had about seven minutes to stop; radio took ~11 minutes to reach
Earth, so the landing was over before Earth heard of the entry; it steered itself (Terrain-Relative Navigation: camera images
matched to an onboard map). Its 21 m parachute's orange and white stripes were binary: "DARE MIGHTY THINGS" (JPL's motto, one word
per ring) and JPL's coordinates in the outer ring; space fans cracked it in hours.
Orbi ending (new for this series): anonymous spaces are never listed; you knock with their 4 letters and someone inside has to
tap Let in — the invite is sealed to the knocker's one-time key (`src/lib/space.ts` knock, `src/components/KnockBell.tsx`,
`supabase/migrations/022_knocks.sql`: knocks count for 10 minutes).

- `OrbiTransfer-perseverance.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 prs_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` → two-pass ffmpeg at 3400k.

## The rover is NASA's own model
"Mars 2020 Perseverance Rover", NASA 3D Resources, free and without copyright — `media/perseverance-model/`. Its glass
(transmission) materials render black in this renderer → replaced by plain transparent glass. Built in code (generic, labelled
DIAGRAM): Jezero ground and sky (Poly Haven textures/boulder, from the Ingenuity film), the entry fireball, the Earth–Mars signal
diagram, the terrain-relative-navigation map, the parachute (its stripes show the IDEA — words as binary letter numbers, one word
per ring — and are labelled "not the real pattern": the exact layout could not be verified, and NASA's decoder image could not be
downloaded here), the phones. No descent stage or sky crane is built.

## Facts and sources
| On screen / spoken | Source |
|---|---|
| Landed 18 Feb 2021, Jezero Crater; ~1,025 kg, ~3 m long | NASA/JPL |
| Entry at ~20,000 km/h (12,500 mph); entry-descent-landing ~7 minutes | NASA/JPL ("7 minutes of terror"), Astronomy |
| Radio ~11 minutes Mars → Earth that day | NASA/JPL |
| Terrain-Relative Navigation: camera images vs an onboard map, steering to a safe spot | NASA/JPL |
| Parachute 21 m (70 ft); orange/white gores in binary: DARE MIGHTY THINGS (each word its own ring) + JPL coordinates 34°11'58" N 118°10'31" W (outer ring); designed by Ian Clark; decoded by fans within hours | NASA "Mars Decoder Ring" (PIA24431), AP/PBS, Space.com |
| Orbi: anonymous space never listed; knock with 4 letters; Let in by a member; invite sealed to a one-time key | `src/lib/space.ts`, `src/components/Spaces.tsx`, `src/components/KnockBell.tsx` |
