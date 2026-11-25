# Voyager 1: one light-day (HD film, 9:16)

"Last week, a message from Earth took one full day to reach Voyager 1." On 18 November 2026 NASA marked Voyager 1 reaching one
light-day from Earth (~25.9 billion km), the first human-made object that far. Then the story of its 2023–24 rescue: unreadable
data from 14 November 2023; one failed memory chip (~3% of the flight data subsystem's memory); the code could not be moved whole
(no single free spot big enough), so engineers cut it into pieces stored in different places and rewrote the links between them;
first piece sent 18 April 2024, readable engineering data back on 20 April — for the first time in five months.
Orbi ending (new for this series): Orbi opens what you receive right away — PDF pages with real, copyable text, photos, video,
Word, Excel and slides, in the browser; nothing is downloaded unless you ask (`src/components/Viewer.tsx`).

- `OrbiTransfer-voyager.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 voy_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` → two-pass ffmpeg at 3400k.

## The spacecraft is NASA's own model
"Voyager Probe (B)", NASA 3D Resources, free and without copyright — `media/voyager-model/`. Built in code (generic, labelled
DIAGRAM where it is one): stars and the Sun, the signal wave-fronts, the solar-system map (orbits to scale), the X-ray of the bus
with the flight data computer as a box (its position inside the bus is illustrative), the memory board and memory map, Earth
(texture sphere), the phone. Photo inside the phone: Hubble's M100 (NASA, ESA, STScI, public domain).

## Facts and sources
| On screen / spoken | Source |
|---|---|
| 18 Nov 2026: one light-day from Earth; a command takes a day, the reply another day; first human-made object that far | NASA via Space.com, EarthSky, PopSci (Nov 2026) |
| 1 light-day = 25.9 billion km | 299,792.458 km/s × 86,400 s |
| Launched 5 September 1977 | NASA / Wikipedia: Voyager 1 |
| 3.7 m high-gain dish; radio transmitter about 22 W | NASA / Wikipedia: Voyager 1 |
| 14 Nov 2023: unreadable data; the FDS (one of three computers; packages data for Earth) | NASA Voyager blog (2024) |
| One chip, ~3% of the FDS memory, failed | NASA Voyager blog, 4 Apr 2024 |
| No single location large enough; code split into sections in different places, references rewritten | NASA via IEEE Spectrum / The Register (Apr 2024) |
| 18 Apr 2024 first code sent; 20 Apr engineering data back, first time in five months | NASA Voyager blog, 22 Apr 2024 |
| April 2024: ~24 billion km away | NASA / Space Daily |
| Orbi: Viewer opens PDF (selectable text, "Copy all text"), images, video, audio, text, Word, Excel, slides; "nothing is downloaded unless the user asks" | `src/components/Viewer.tsx` |
