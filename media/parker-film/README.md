# Parker Solar Probe: touching the Sun (HD film, 9:16)

"Do you know the fastest thing humans have ever built is flying through the Sun's atmosphere?" NASA's Parker Solar Probe: the
first NASA spacecraft named after a living person (Eugene Parker); on 24 December 2024 it passed 6.1 million km from the Sun's
surface at ~692,000 km/h (New York → Tokyo in under a minute); its heat shield is built for ~1,400 °C on the Sun side — two
carbon-carbon skins around an 11.4 cm carbon-foam core that is 97% air — while the spacecraft behind it stays ~30 °C; near the
Sun it flies itself, keeping the shield pointed at the Sun; after the pass the team waited, and a beacon on 26 December said it was healthy.
Orbi ending (new for this series): live viewers — a green dot runs round your file for every person who has it open right now,
and downloads are counted the moment they happen (`Void.tsx` live deltas, `OrbView.tsx` edge dots, `sessions.viewing` heartbeat).

- `OrbiTransfer-parker.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 psp_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` → two-pass ffmpeg at 3400k.

## The spacecraft is NASA's own model
"Parker Solar Probe", NASA 3D Resources, free and without copyright — `media/parker-model/`. Built in code (generic, labelled
DIAGRAM / THERMAL VIEW where it is one): the Sun (granulation, corona) at its true angular size from 9.86 solar radii, the dust
streaks, the orbit diagram (Sun, Mercury, Venus, Parker's orbit to scale), Earth (texture sphere) with the New York–Tokyo arc, the
cut-open shield (layers drawn 4× thicker), the thermal colouring, the phone.

## Facts and sources
| On screen / spoken | Source |
|---|---|
| First NASA spacecraft named after a living person (2017); launched 12 Aug 2018 | NASA (renaming release), UChicago |
| 24 Dec 2024: 6.1 million km (3.8 million mi) from the surface, ~692,000 km/h (430,000 mph), fastest human-made object | NASA, Guinness World Records |
| New York–Tokyo ~10,850 km → ~56 s at 192 km/s | arithmetic |
| Shield: two carbon-carbon panels around a 4.5 in (11.4 cm) carbon-foam core, foam 97% air; ~2,500 °F (~1,370 °C) Sun side; body ~85 °F (30 °C) | NASA Goddard, JHU APL (2018) |
| Flies autonomously near the Sun, keeping the shield pointed at the Sun | NASA / JHU APL |
| Beacon received late on 26 Dec 2024: healthy | NASA, JHU (2 Jan 2025) |
| Orbi: live viewer dots + live download counts | `src/components/OrbView.tsx`, `src/components/Void.tsx`, `supabase/migrations/030_admin_since.sql` |
