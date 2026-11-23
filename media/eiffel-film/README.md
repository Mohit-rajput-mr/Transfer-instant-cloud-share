# Eiffel Tower: why it's taller in summer (HD film, 9:16)

"Do you know the Eiffel Tower is taller in summer?" Thermal expansion of the puddled-iron lattice, the sun side growing
more (the top leans away from the sun and draws a daily curve), 18,038 parts and 2.5 million hot rivets (a real riveted
joint up on the tower: heated, hammered, shrinking as it cools to clamp the plates), the open lattice and Eiffel's
wind-shaped curve of the legs. Orbi ending: direct device-to-device first, an encrypted cloud copy when it can't.

- `OrbiTransfer-eiffel-tower.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Source: `source/` (kit/hd.js). Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 eiffel_sfx.py &&
  EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## What's on screen (real scale, metres)
- The tower is a true instanced lattice (~10,000 members) from a profile measured on a Trocadéro photo (scaled by the
  2nd-floor platform, 41 m): 125 m base, four curved box-girder legs
  with X-bracing at two scales meeting at the 2nd floor (115.7 m), the four decorative arches, 1st floor (57.6 m) and 2nd
  floor platforms with friezes and railings, the shaft to the 3rd floor (276 m), the top and antennas (330 m). Bronze-brown
  paint, lighter towards the top.
- Paris: Haussmann perimeter blocks (≈25,000 buildings: 6-storey limestone facades with French windows, wrought-iron
  balconies on the 2nd and 5th floors, shops, grey-blue zinc mansards with dormers, chimneys, open courtyards) on irregular
  blocks cut by straight boulevards radiating from the squares; the Seine with the Pont d'Iéna and bateaux-mouches, the
  Champ de Mars, the Palais de Chaillot (Trocadéro) and the École Militaire.
- Thermal camera: each member coloured by how hot its side of the tower is; the lean and the daily path are exaggerated
  ×33 and labelled MOTION EXAGGERATED.
- The rivet: a gusset joint of L-angle chords and lattice bars at true scale (26 mm domed heads), 150 m up, Paris behind.

## Checks (2026-11-23 final render)
- Side-by-side film vs reference photo: `source/check/pair_00–04.png` (Trocadéro view, legs, lattice, Champ de Mars, top).
- ffprobe: 1080×1920, 30 fps, H.264 + AAC, 110.9 s, 65 MB. Whisper (faster-whisper) WER 0.025 against `script.json`.

## Facts and sources
| Fact | Source |
|---|---|
| 7,300 t of iron; 330 m to the top of the antenna; 300 m structure; built 1887–89 | Wikipedia "Eiffel Tower" (Design; dimensions) |
| Puddled iron (an early wrought iron) | Wikipedia "Eiffel Tower" (Design: "made of puddled iron") |
| Iron expands ≈ 12 millionths of its length per °C | Wikipedia "Thermal expansion" (coefficient table: iron 11.8 × 10⁻⁶ /K) |
| ≈ 15 cm taller on a hot day: 300 m × 0.000012 /°C × 42 °C (a +32 °C summer day vs a −10 °C winter night, the range shown on screen) ≈ 15 cm | derived from the two rows above |
| The top moves up to 18 cm away from the sun (the sun side expands more) | Wikipedia "Eiffel Tower" (Design: thermal expansion of the side facing the sun) |
| 18,038 iron parts joined with 2.5 million rivets | Wikipedia "Eiffel Tower" (Construction) |
| Hot riveting: the rivet is heated, inserted, hammered; it shrinks as it cools and clamps the plates | Wikipedia "Rivet" (hot riveting) |
| The top sways only about 9 cm in a storm | Wikipedia "Eiffel Tower" (Design / wind) |
| Eiffel: the main concern was wind resistance; the curvature of the four outer edges came from the calculations | Wikipedia "Eiffel Tower" (Design: Eiffel's 1887 statement in *Le Temps*) |
| Orbi: direct device-to-device (WebRTC) first, encrypted storage copy when it can't; locked before it leaves | `media/VIDEO_PLAYBOOK.md` verified facts |

## Assets and licences
- Skies: Poly Haven "Qwantani dawn" and "Qwantani noon" (pure sky), CC0, with procedural clouds.
- Textures: Poly Haven (CC0) asphalt_02, grass_ground, gravel_floor, old_sandstone_02, grey_roof_01, green_metal_rust,
  wood_table_001. Trees: Poly Haven "Island Tree 02" (CC0) baked into impostors. Water: three.js `Water.js` (MIT). Everything else is procedural.
- Orbi screens: live orbitransfer.com captures (2026-11-22, `source/shots_live/`), with the state drawn on top.
- Voice: Chatterbox (MIT) cloned from the house reference voice (Kokoro bm_george, Apache-2.0); checked with faster-whisper.
- Reference photos for the side-by-side check (`source/ref/`, credits in `source/ref/credits.json`): Wikimedia Commons,
  free licences (author + licence per file).
