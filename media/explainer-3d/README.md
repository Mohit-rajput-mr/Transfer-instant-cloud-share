# Orbi Transfer — 3D "how it works" explainer (55 s, 1080×1920, voice: bm_george)

`OrbiTransfer-how-it-works-3d.mp4` · cover `cover.jpg`. Educational, Zack-D-style: 3D people (mannequins) in a café,
the city seen from above with the area cells, a server aisle of scrambled bytes, and the 30-minute burn. Phone screens are
real captures of orbitransfer.com. Subtitles 1–3 words at a time.

Rebuild (in `source/`): `python3 vo.py <kokoro dir>` → `node render.cjs 0 1659 frames` (split into ranges; it skips frames
already rendered) → `python3 synth.py` (needs events.json) → ffmpeg as in ../explainer-film/README.md.
