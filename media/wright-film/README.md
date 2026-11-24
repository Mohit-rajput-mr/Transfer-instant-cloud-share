# The first flight: shorter than a jumbo jet's wings (HD film, 9:16)

"Do you know the first flight of an airplane was shorter than the wings of a jumbo jet?" The real 1903 Wright Flyer (spruce,
ash, cotton muslin), Charlie Taylor's 12 hp engine, chains (one crossed) and counter-rotating propellers, the 1901 wind tunnel
(200 model wings), lift from a cambered wing, wing warping from the hip cradle, Kitty Hawk on 17 December 1903: the rail
into a 30+ km/h wind, 12 s and 37 m, four flights (37/53/61/260 m), and the gust that wrecked it.
Orbi ending (new for this series): private Spaces — a named room with a passcode; files never shown in public, members only.

- `OrbiTransfer-wright-flyer.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 wright_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py`
  → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## The machine is the real one
"1903 Wright Flyer, 3D scan by the Smithsonian Institution (3d.si.edu), Smithsonian Open Access, CC0" — `media/wright-model/USE_THIS_MODEL.md`.
The scan has shape only; materials are the real ones (spruce/ash, muslin, aluminium paint, steel). Propellers are the scan's own,
cut out so they spin; wing warping, rudder and elevator bend the scan in a shader. No pilot is shown (no real person is built).
Side-by-sides vs real photos: `source/check/side_by_side.jpg`.
Built in code (generic): dunes, grass, blowing sand, the launching rail and dolly, the wind-tunnel box and model wings,
the airfoil section and airflow, path lines, a dark gallery, phone/laptop/Space ring.

## Facts and sources (Wikipedia: Wright Flyer, Wright brothers, Boeing 747; read 2026-11-24)
| On screen / spoken | Source |
|---|---|
| 12 s, 120 ft (37 m), "shorter than the wingspan of a Boeing 747" (747-100 span 59.6 m) | Wright Flyer; Boeing 747 |
| Span 40 ft 4 in (12.3 m), wing area 510 sq ft (47 m²), 605 lb (274 kg) empty, camber 1-in-20 | Wright Flyer |
| Spruce (straight members), ash (ribs), cotton muslin "Pride of the West" | Wright Flyer |
| Engine by Charlie Taylor from scratch, 12 hp, 180 lb (82 kg), cast-aluminium body | Wright Flyer |
| Bicycle-style chain drive, one chain crossed → props turn opposite; hand-made spruce props; 351 rpm in tests | Wright Flyer |
| 6 ft home-built wind tunnel, 200 model wings, Oct–Dec 1901 | Wright brothers |
| Hip cradle warps the wings and turns the rudder | Wright Flyer |
| 17 Dec 1903, wind > 20 mph (> 30 km/h), 60 ft rail into the wind | Wright Flyer |
| Flights 120, 175, 200, 852 ft (59 s); then a gust tumbled it; never flew again | Wright Flyer; Wright brothers |
| The Wrights worked in secrecy, "not more than a dozen persons" in on it | Wright brothers (1906 article caption) |
| Orbi Spaces: named room, passcode (4+ chars), never in the public area, only members unlock | media/VIDEO_PLAYBOOK.md (verified facts) |

## Reference photos (check only)
roger4336, bsterling, Ken Lund — CC BY-SA 2.0 (Flickr via Openverse), see `source/ref/credits.json`.
