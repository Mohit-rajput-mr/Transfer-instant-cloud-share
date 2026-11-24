# Golden Gate Bridge: 27,572 wires in one cable (HD film, 9:16)

"Do you know each of the Golden Gate Bridge's two main cables is made of 27,572 steel wires?" How a suspension bridge
carries its road (deck → suspender ropes → main cables → towers → sea floor, and the anchorages), inside a main cable
(61 strands, 27,572 wires), the deck moving with heat, the International Orange colour. Orbi ending: a whole folder sent
as one bundle and unpacked back into a folder.

- `OrbiTransfer-golden-gate.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Source: `source/` (kit/hd.js). Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 goldengate_sfx.py &&
  EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## What's on screen (real scale, metres)
- Towers measured on the reference photos: two stepped cellular legs with fluted faces, four portal openings above the road
  (≈31, 30, 24, 23 m) under Art Deco struts with chamfered corners, an X-brace below the road, cable saddles and a beacon.
- Towers 227 m above the water (legs 10 × 16 m at the base), main span 1,280 m, side spans 343 m, deck 67 m above the
  water, two main cables (parabola, 143 m sag), suspender ropes every 15.2 m, stiffening truss, anchorages, traffic.
- The cable cutaway: 0.92 m cable, 61 strands in rings (1 + 6 + 12 + 18 + 24), each 452 wires of 4.9 mm → 27,572 wires,
  instanced at true size.
- Clear summer morning, sun low in the east; a low sea-fog bank rolling in from the Pacific side; Pacific swell (six
  Gerstner waves) with true water reflectance. The Orbi scene is on a Marin headlands overlook north-east of the bridge.
- The deck's range of movement (3.3 m down / 1.8 m up) is shown ×8 and labelled MOTION EXAGGERATED.

## Facts and sources
| Fact | Source |
|---|---|
| Towers 746 ft (227 m) above the water; main span 4,200 ft (1,280 m); side spans 1,125 ft (343 m) | goldengate.org "Bridge Design & Construction Statistics" |
| Two main cables, 36 3/8 in (0.92 m) thick, each of 27,572 wires in 61 strands; wire 0.192 in (4.9 mm) | goldengate.org (statistics: main cables) |
| Each anchorage weighs 60,000 tons | goldengate.org (statistics: anchorages) |
| Deck clearance 220 ft (67 m) above mean higher high water | goldengate.org (statistics) |
| The deck is designed to move up to 10.8 ft (3.3 m) down and 5.8 ft (1.8 m) up with temperature and load | goldengate.org (statistics: deflection) |
| Cable wires were spun in place across the strait, then compacted into a circle | goldengate.org (construction: cable spinning) |
| International Orange began as the primer; consulting architect Irving Morrow kept it, in part for visibility in fog | goldengate.org "International Orange"; NPR / History.com |
| Orbi: folders and many files travel as one bundle and unpack into a folder on the receiver; up to 20 GB; no app, no login | `src/lib/bundle.ts`; `media/VIDEO_PLAYBOOK.md` verified facts |

## Assets and licences
- Sky: Poly Haven "Qwantani late afternoon (pure sky)", CC0, rotated so the sun sits in the east. Hills: Poly Haven aerial_grass_rock, rock_face (CC0); concrete_wall_008 (CC0).
- Water: three.js `Water.js` (MIT) with Gerstner waves added. Everything else is procedural.
- Orbi screens: live orbitransfer.com captures (2026-11-22, `source/shots_live/`), with the state drawn on top.
- Voice: Chatterbox (MIT) cloned from the house reference voice (Kokoro bm_george, Apache-2.0); checked with faster-whisper.
- Reference photos for the side-by-side check (`source/ref/`, author + licence + link per file in `source/ref/credits.json`):
  Flickr via Openverse (CC BY 2.0 / BY-SA 2.0 / BY-ND 2.0 / CC0) — reference only, not shown in the film.
