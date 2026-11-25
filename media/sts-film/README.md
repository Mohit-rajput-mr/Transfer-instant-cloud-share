# Discovery: the glider from space (HD film, 9:16)

"Do you know the Space Shuttle came home from space with no engine running?" The real orbiter OV-103 Discovery: 39 flights
(more than any spacecraft), 37.2 m long, 23.8 m wings; re-entry heat 1,650 °C vs an aluminium body limited to 175 °C;
24,000 silica tiles (almost pure quartz sand) so fragile one could be crushed by hand; reinforced carbon-carbon on the nose
and wing leading edges; black tiles underneath, white on top; a 4.5 : 1 glide on approach; ~18,000 tiles still original.
Orbi ending (new): every file gets its own QR code; scan it, type the code, it unlocks on that phone.

- `OrbiTransfer-discovery.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`.
- Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 sts_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py`
  → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## The orbiter is the real one
"Space Shuttle Discovery (OV-103), 3D scan by the Smithsonian Institution (3d.si.edu), Smithsonian Open Access, CC0", with its
own markings — `media/sts-model/USE_THIS_MODEL.md`. Built in code (generic): Earth backdrop, plasma, the runway and grass, the
glide-slope diagram, a magnified tile patch (labelled MAGNIFIED · SECTION), an arched museum hangar, two phones with a QR code
(decorative pattern, not a scannable real link). No astronauts or the carrier 747 are built.

## Facts and sources (Wikipedia: Space Shuttle Discovery; Space Shuttle orbiter; Space Shuttle thermal protection system)
| On screen / spoken | Source |
|---|---|
| 39 launches/landings, more spaceflights than any other spacecraft; 27 years of service; at the Udvar-Hazy Center | Space Shuttle Discovery |
| Length 37.237 m, span 23.79 m; landed as a glider; glide ratio 4.5 : 1 subsonic on approach | Space Shuttle orbiter |
| 1,650 °C re-entry heat; aluminium structure limit 175 °C | Space Shuttle thermal protection system |
| LI-900 silica tiles, very pure quartz sand; so fragile one could crush a tile by hand | Space Shuttle thermal protection system |
| RCC on the nose cap and wing leading edges (above 1,260 °C); black HRSI underneath, white insulation on top | Space Shuttle thermal protection system |
| ~24,000 tiles, ~18,000 still original at the end; new tiles solid black before their first re-entry | Space Shuttle thermal protection system |
| Orbi: every file has its own QR + code; the receiver's phone derives the key from the code and unlocks it | media/VIDEO_PLAYBOOK.md; media/qr-film |
