# Leaning Tower of Pisa: saved by digging (HD film, 9:16)

"Do you know engineers saved the Leaning Tower of Pisa by digging soil out from under it?" The 3 m foundation on weak
ground, sinking by 1178 at the second floor, the century-long pause that let the soil settle, the upper floors built taller
on one side (the tower is curved), the lean growing until it closed in 1990, the rescue (870 t of lead, steel cables round
the 3rd level, slanted drills removing 38 m³ of soil under the high side), 45 cm back to its 1838 position, stable for 300+
years. Orbi ending: the sender picks when a file burns — 5, 10, 15, 20, 25 or 30 minutes — then the stored copy is deleted.

- `OrbiTransfer-leaning-tower-pisa.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Source: `source/` (kit/hd.js). Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 pisa_sfx.py &&
  EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## What's on screen (real scale, metres)
- The tower: "Monuments 01 – Leaning Tower of Pisa – Italy" by André Spilari (Printables #1714900, public domain), chosen
  from 8 candidates (`media/pisa-model/`, rules: `media/MODEL_SOURCING_RULES.md`). Stood upright (it was modelled at 4.00°),
  scaled to the real size (15.48 m across the base, 56.67 m along the axis), split at its cornices into the 8 storeys so
  the film can tilt it, build it storey by storey and exaggerate its curve (×6 in the curve shot, labelled); the author's
  shape, arcades, galleries and belfry are untouched. White marble (Poly Haven marble_01) weathered at the base.
- Piazza dei Miracoli at sunset: lawn, marble paths, the city walls, trees (Poly Haven "Island Tree 02", CC0). The cathedral
  and the baptistery are not shown: no licensed 3D model of them exists and they are not built from code (rules §2.4).
- Cross-section (cut through the tower and ground): weak, layered subsoil (illustrative layers), the 3 m foundation ring,
  the settlement bowl under the low side, a drill cavity closing, the high side settling. Motion exaggerated ×4, labelled.
  The tower's cut is drawn from the model: walls as cut stone, the hollow core (r < 3.68 m) dark, the stair inside.
- Tourists: BodyParts3D people posed (CC BY 4.0). No code-built crowd.

## Facts and sources
| Fact | Source |
|---|---|
| 55.86 m high on the low side, 56.67 m on the high side; white marble; base diameters 15.484 / 7.368 m; 294/296 steps | Wikipedia "Leaning Tower of Pisa" |
| The top is 3.9 m from the vertical (3.97°) today | Wikipedia (infobox: angle of slant 3.97° or 3.9 m) |
| Foundations laid 9 Aug 1173; began to sink in 1178 after construction reached the second floor; a mere 3 m foundation in weak, unstable subsoil | Wikipedia (Construction) |
| Work halted for most of a century (wars with Genoa, Lucca, Florence), which let the soil settle — otherwise it would almost certainly have toppled | Wikipedia (Construction) |
| Upper floors built with one side taller than the other: the tower is curved | Wikipedia (Construction) |
| Closed to the public on 7 January 1990 | Wikipedia (Stabilisation) |
| From 1993, 870 tonnes of lead counterweights | Wikipedia (Stabilisation) |
| Cables cinched around the third level and anchored several hundred metres away | Wikipedia (Stabilisation) |
| 38 m³ of soil removed from underneath the raised end; tilt reduced by 45 cm, back to its 1838 position | Wikipedia (Stabilisation) |
| Counterweight on the north (high) side; soil extracted by inclined drilling under the north side | Burland, Jamiolkowski & Viggiani (2003), "The stabilisation of the Leaning Tower of Pisa", *Soils and Foundations* 43(5) |
| Reopened 15 December 2001, declared stable for at least another 300 years | Wikipedia (Stabilisation) |
| Orbi: the sender picks a life of 5, 10, 15, 20, 25 or 30 minutes; at zero the stored copy is deleted; no account | site code (`src/components/Panels.tsx` LIVES; about page); `media/VIDEO_PLAYBOOK.md` verified facts |

## Assets and licences
- Tower model: André Spilari, Printables #1714900, public domain — credit: "Leaning Tower of Pisa model by André Spilari
  (Printables #1714900)". Sky: Poly Haven "Belfast sunset (pure sky)", CC0, with procedural clouds. Textures: Poly Haven (CC0)
  marble_01, grass_ground, clay_roof_tiles, wood_table_001; trees: Poly Haven "Island Tree 02" (CC0). People: BodyParts3D
  (© DBCLS, CC BY 4.0). Procedural only: ground, soil section, foundation ring, lead weights, cables, drills, walls.
- Orbi screens: live orbitransfer.com captures (2026-11-22, `source/shots_live/`), with the state drawn on top.
- Voice: Chatterbox (MIT) cloned from the house reference voice (Kokoro bm_george, Apache-2.0); checked with faster-whisper.
- Reference photos (`source/ref/`, credits in `source/ref/credits.json`): Wikimedia Commons, free licences.
