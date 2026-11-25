# Webb: folded like origami (HD film, 9:16)

"Do you know the biggest telescope in space had to be folded up like origami, just to fit inside its rocket?" The James Webb
Space Telescope: 6.5 m mirror of 18 gold-coated beryllium hexagons (gold for infrared), the faint heat glow of the first
galaxies, colder than 50 K behind a five-layer sunshield (~0.1 mm per layer), launched folded on an Ariane 5 on 25 Dec 2021,
unfolded itself (344 single-point failures), ~1.5 million km away and not serviceable, segments aligned to within 50 nm.
Orbi ending (new): Nearby — files shared in your rough area appear live within about a second.

- `OrbiTransfer-webb.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`.
- Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 jwst_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py`
  → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## The telescope is NASA's own model
"James Webb Space Telescope, 3D model by NASA (NASA 3D Resources, github.com/nasa/NASA-3D-Resources), free and without
copyright" — `media/jwst-model/USE_THIS_MODEL.md`. Finishes added: gold mirror, Kapton/aluminium MLI, black paint. The model's
own parts drive the deployment (`batwing1/2` = the mirror wings, `shield`, `mid_booms`); the deployment is simplified (labelled;
the real one took about two weeks). No rocket is built: the fairing is a ghost diagram. Built in code: starfield, galaxies,
the Sun glow, Earth/Moon spheres (planet textures), infrared light paths, the map for Nearby.

## Facts and sources (Wikipedia: James Webb Space Telescope, read 2026-11-24)
| On screen / spoken | Source |
|---|---|
| Largest telescope in space; 6.5 m mirror, 18 hexagonal gold-plated beryllium segments; gold for infrared reflectivity | JWST |
| Infrared; first galaxies (z ≈ 15) among its targets | JWST |
| Must be kept below 50 K (−223 °C) | JWST |
| Sunshield: five layers of Kapton E, each ~0.1 mm; folded twelve times to fit the Ariane 5 fairing | JWST |
| Launched 25 December 2021 on an Ariane 5 from Kourou; major deployments complete 8 January 2022 | JWST |
| 344 potential single-point failures in launch and deployment | JWST |
| Near Sun–Earth L2, ~1.5 million km from Earth; a crewed repair mission would not be possible | JWST |
| Segments positioned within 50 nanometres | JWST |
| Orbi Nearby: geohash-4 area (~39 × 20 km) + neighbours; live room, a note arrives in about a second; others see only the rough area | media/VIDEO_PLAYBOOK.md |
