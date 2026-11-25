# The International Space Station: nothing wasted (HD film, 9:16)

"Do you know the astronauts on the space station drink water that used to be their own sweat and urine?" NASA's own ISS model,
crewed without a break since 2 Nov 2000, a 90-minute orbit (16 sunrises a day). Every litre of water has to be launched, so the
station recycles it: urine is distilled at low pressure (Urine Processor), the brine is dried with warm air (Brine Processor),
everything is filtered, heated in a catalytic reactor and given iodine (Water Processor) along with the cabin's humidity (sweat
and breath); in 2023 total water recovery reached 98% (93–94% before the brine processor). 15 countries, 5 space agencies.
Orbi ending (new for this series): the task board — name a task, @name to assign, attach files, move it through In progress →
In review → Done (`src/components/TaskBoard.tsx`; tasks are on every plan).

- `OrbiTransfer-iss.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 iss_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` → two-pass ffmpeg at 3400k.

## The station is NASA's own model
"International Space Station (ISS) (D) (IGOAL)", NASA 3D Resources, free and without copyright — `media/iss-model/` (96 MB,
555 meshes, current arrays incl. the roll-out iROSA). Built in code (generic, labelled DIAGRAM): the Earth texture sphere and stars,
the water-loop stand-in boxes and pipes (not the real hardware), the phone.

## Facts and sources
| On screen / spoken | Source |
|---|---|
| Crewed without a break since 2 Nov 2000 | NASA, ISS National Lab |
| ~90-minute orbit, 16 sunrises a day, ~27,600 km/h | NASA, EarthSky, Sky at Night |
| ~109 m across; Cupola with 7 windows | NASA |
| Urine Processor (vacuum distillation) → brine; Brine Processor (membrane + warm dry air); Water Processor (filters, catalytic reactor, iodine); humidity condensate | NASA (June 2023 water-recovery release) |
| 98% total water recovery (93–94% before the BPA), June 2023 | NASA, Space.com, NBC |
| 15 countries, 5 space agencies (NASA, Roscosmos, ESA, JAXA, CSA) | NASA |
| Orbi: task board, @name to assign, attach files, In progress / In review / Done | `src/components/TaskBoard.tsx`, `src/lib/tasks.ts` |
