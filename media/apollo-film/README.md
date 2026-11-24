# Apollo 11: how three men fell out of space and lived (HD film, 9:16)

"Do you know how three astronauts fell out of space at almost forty thousand kilometres an hour, and lived?" The real
command module Columbia, then re-entry at ~11 km/s: the air can't get out of the way and turns to glowing plasma; the blunt
heat shield pushes a shock wave out in front so most heat stays in the air; the Avcoat-in-honeycomb shield chars and melts
away, carrying heat off; silver Mylar going in, scorched brown coming home; ~3 minutes of radio blackout; 6.5 g; two drogues
then three 25 m mains; splashdown in the Pacific on 24 July 1969, upside down, righted by three bags.
Orbi ending (new feature for this series): if the connection drops, the upload resumes and only the missing parts are sent.

- `OrbiTransfer-apollo-11.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Source: `source/` (kit/hd.js). Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 apollo_sfx.py &&
  EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## The capsule is the real one
- "Apollo 11 Command Module Columbia, 3D scan by the Smithsonian Institution (3d.si.edu), Smithsonian Open Access, CC0":
  exterior (150k triangles, 4K photo textures) and interior (hull, panels, seats) — `media/apollo-model/USE_THIS_MODEL.md`.
  Nothing of the capsule is built in code. It is shown as scanned (after the flight): flight shots keep the camera on the
  heat-shield side; the silver Mylar look before re-entry is a shader over the scan (the scan's detail shows through).
- Side-by-sides of film frames vs real photos: `source/check/side_by_side.jpg`.
- Built in code (generic, not famous objects): the Earth backdrop (texture set in kit/models/planets), plasma, the shock-wave
  and streamline diagram, the magnified honeycomb section (labelled MAGNIFIED), parachute canopies (orange/white ringsail
  mains, ribbon drogues), flotation bags, ocean, a dark museum gallery, phone/laptop/storage for Orbi.

## Facts and sources (Wikipedia, read 2026-11-24)
| On screen / spoken | Source |
|---|---|
| CM 12 ft 10 in (3.9 m) across; 5 windows; 3 couches | Apollo command and service module |
| ~11 km/s, "almost 40,000 km/h" (lunar return; Apollo 10's 39,897 km/h / 11.08 km/s is the record) | Apollo 10; Atmospheric entry |
| Blunt shape = best heat shield (Allen & Eggers); shock layer air ionised | Atmospheric entry |
| Shield: Avcoat (epoxy novolac resin) gunned into a fiberglass honeycomb; chars and melts away, carrying heat off; heat "sufficient to melt most metals"; 2 in thick at the base | AVCOAT; Apollo command and service module |
| Silver Mylar outer coating (Block II) | Apollo command and service module |
| Radio blackout ≈ 3 minutes for Apollo | Communications blackout |
| Apollo 11 peak 6.5 g | Apollo 11 |
| 2 drogues (16.5 ft), 3 ringsail mains (83.5 ft ≈ 25 m); splashdown 22 mph ≈ 35 km/h | Apollo command and service module |
| Splashdown 24 July 1969, North Pacific; landed upside down, righted by flotation bags | Apollo 11 |
| Orbi: uploads resume after a drop, only the missing parts are sent; no account | media/VIDEO_PLAYBOOK.md (verified mechanism facts) |

## Reference photos (check only, not in the film)
Gary Lee Todd (CC0), watts_photos (CC BY 2.0), Gary J Wood (CC BY-SA 2.0), UnaDriver (CC BY-SA 4.0), Aditya Srini (CC BY-SA 2.0),
wbaiv (CC BY-SA 2.0) — Openverse/Flickr/Wikimedia, see `source/ref/credits.json`.
