# Faster than sound: the bullet-shaped Bell X-1 (HD film, 9:16)

"Do you know the first plane to fly faster than sound was shaped like a bullet?" The real X-1 46-062, the .50-calibre bullet
it copies, sound as pressure waves (343 m/s at 20 °C), waves piling into a shock near Mach 1, the tail that tilts as a whole,
the drop from a B-29, four rocket chambers (alcohol + liquid oxygen), 14 October 1947 at 13.7 km and Mach 1.05, the Mach cone,
the boom on the ground (silence, then the N-wave). Orbi ending (new): big files go in parts, 3 up at once, 4 down at once, 20 GB.

- `OrbiTransfer-bell-x1.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 x1_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py`
  → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## The aircraft is the real one
"Bell X-1, 3D scan by the Smithsonian Institution (3d.si.edu), Smithsonian Open Access, CC0" with its scanned paint —
`media/x1-model/USE_THIS_MODEL.md`. Its stabilizer is cut out of the scan so it can tilt. No B-29 and no pilot are built
(the drop is shown from the X-1 only, labelled). Built in code (generic): sky, desert, cloud deck, pressure-wave rings and
Mach cone (labelled "sound slowed down to be seen"), rocket plumes with shock diamonds, a .50-calibre bullet, a dry lake bed
with a wind sock, a gallery, phone/laptop/storage lanes. Side-by-sides vs real photos: `source/check/side_by_side.jpg`.

## Facts and sources (Wikipedia, read 2026-11-24)
| On screen / spoken | Source |
|---|---|
| Shape of a .50-calibre (12.7 mm) machine-gun bullet, known to be stable in supersonic flight | Bell X-1 |
| First piloted plane past the speed of sound in level flight, 14 Oct 1947, Mach 1.05, 45,000 ft (13.7 km) | Bell X-1; Chuck Yeager; Sound barrier |
| Elevator lost authority at Mach 0.94; the adjustable horizontal stabilizer gave control | Bell X-1 |
| Drop-launched from a B-29 bomb bay | Bell X-1 |
| Four chambers, 1,500 lbf each; ethyl alcohol (with water) + liquid oxygen | Bell X-1 |
| Span 28 ft (8.5 m); on display at the National Air and Space Museum | Bell X-1 |
| Speed of sound 343 m/s (1,234 km/h) at 20 °C; lower where the air is colder, up to 11 km | Sound barrier; Speed of sound |
| The boom is a cone behind the aircraft; observers hear nothing until it crosses them | Sonic boom |
| Orbi: parts ~32 MB, 3 at a time up, 4 ranges at once down; max 20 GB | media/VIDEO_PLAYBOOK.md (verified facts) |
