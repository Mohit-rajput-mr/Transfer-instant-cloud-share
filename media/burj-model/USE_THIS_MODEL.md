# Burj Khalifa model — use THIS one (2026-11-24, media/MODEL_SOURCING_RULES.md)
- "Burj Khalifa - Dubai" by **Thomas Lagler / MiniWorld3D**, Printables #1659229, **public domain**. Credit anyway:
  "Burj Khalifa model by Thomas Lagler / MiniWorld3D (Printables #1659229)". Picked from 7 Printables candidates
  (`candidates_previews.jpg`, `candidates_renders.png`): the only one with the Y plan, the spiralling setbacks and the spire.
- Files: `media/kit/models/burj/{pos.bin float32 xyz, nor.bin int8×4, idx.bin uint32, meta.json}` (both print parts
  stacked, display plate removed, `landmark_prep.py … 828 1.6`): y up, base y = 0, spire tip 828 m, footprint centred.
- Orientation: its wings point to −10°, 120°, −130° (atan2(z, x)); the Burj film turns it by −100° about y so a wing points
  to +z. Facade: the film's glass shader (floor bands every 3.59 m, mullions, louvre bands) — see burj-film/source/story_a.js.
