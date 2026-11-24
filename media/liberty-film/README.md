# Statue of Liberty: a skin as thin as two pennies (HD film, 9:16)

"Do you know the Statue of Liberty's skin is only about as thick as two coins?" The 2.4 mm copper skin, the hollow statue
on Eiffel's flexible iron skeleton (central pylon, secondary frame, flat armature bars), why a rigid frame would have
cracked the copper, the sway in a storm, repoussé (heated sheets hammered over wooden moulds), the shiny copper of 1886
turning green after 1900, and why the patina protects. Orbi ending: every file is locked on your own device (AES-256)
before it leaves; the server only sees scrambled bytes.

- `OrbiTransfer-statue-of-liberty.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Source: `source/` (kit/hd.js). Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 liberty_sfx.py &&
  EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js
  story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## What's on screen (real scale, metres)
- The statue: "Statue of Liberty model by VinceCZ (Printables #110125), CC BY 4.0" — the owner's chosen model
  (`media/liberty-model/USE_THIS_MODEL.md`, mesh in `media/kit/models/liberty/`), placed exactly as specified there:
  rotateX(-90°), centred, base at the pedestal top, scaled to 46.05 m heel → torch (NPS). It remixes a Cults3D model by
  peternak3d and a Thingiverse #65869 torch part whose licences could not be checked from here — confirm before a paid ad.
  Skin: the model's verdigris shader (rain-washed up-facing areas, darker folds, brown streaks, hammered-copper noise,
  gilded flame) with this film's ageing from bright copper (1886) to patina, an x-ray mode and the storm sway (×20).
- The x-ray skeleton (Eiffel's pylon, secondary frame, armature bars, arm truss to the torch) is fitted inside the skin
  envelope measured from the model.
- Hunt's pedestal in light grey granite (rusticated corner pilasters, the loggia, a row of shields round the parapet) on
  the star-shaped Fort Wood (pedestal top 46.94 m; ground to torch 92.99 m); island trees from a Poly Haven model.
- Copper → patina shader driven by time (streaks + noise), x-ray mode revealing the iron pylon, the secondary frame that
  follows the skin and the flat bars out to it, and the arm truss. Sway shown ×20 and labelled MOTION EXAGGERATED.
- Macro: the copper sheet edge (2.4 mm) beside two pennies; the patina layer (thickness exaggerated, labelled).

## Facts and sources
| Fact | Source |
|---|---|
| Copper skin 3/32 in (2.4 mm), "the thickness of two pennies" | NPS, Statue of Liberty "Statue Statistics" / FAQ |
| Ground to tip of torch 305 ft 1 in (92.99 m); heel to top of head, arm, head, index finger (8 ft = 2.44 m), tablet | NPS "Statue Statistics" |
| Iron framework designed by Gustave Eiffel's firm: central pylon, secondary frame, flexible armature bars to the skin | NPS ("The Statue's internal structure"); Wikipedia "Statue of Liberty" (Construction) |
| Flexible so the copper could move without cracking | NPS; Wikipedia "Statue of Liberty" (Design and construction) |
| Sways up to 3 in in strong wind, the torch more (≈ 6 in) | NPS FAQ (wind and the statue) |
| Repoussé: copper sheets heated and hammered by hand over wooden moulds | NPS ("Building the Statue"); Wikipedia |
| Dedicated 28 October 1886, copper-coloured; the green patina spread after 1900 | Wikipedia "Statue of Liberty" (Dedication; patina) |
| Engineers (US Army Corps) found the patina protects the copper beneath | Wikipedia "Statue of Liberty" (patina, 1906) |
| Orbi: files are encrypted on the sender's device (AES-256-GCM) before they leave; the server stores only scrambled bytes; no account | `media/VIDEO_PLAYBOOK.md` verified facts |

## Assets and licences
- Sky: Poly Haven "Qwantani dawn (pure sky)", CC0, with a procedural storm deck. Textures: Poly Haven (CC0) green_metal_rust,
  grass_ground, concrete_wall_008, wood_table_001; trees: Poly Haven "Island Tree 02" (CC0) baked to impostors. Water: three.js `Water.js` (MIT) with Gerstner waves.
- Orbi screens: live orbitransfer.com captures (2026-11-22, `source/shots_live/`), with the state drawn on top.
- Voice: Chatterbox (MIT) cloned from the house reference voice (Kokoro bm_george, Apache-2.0); checked with faster-whisper.
- Reference photos for the side-by-side check (`source/ref/`, author + licence + link per file in `source/ref/credits.json`):
  Flickr via Openverse (CC BY / BY-SA / BY-ND) — reference only, not shown in the film.
