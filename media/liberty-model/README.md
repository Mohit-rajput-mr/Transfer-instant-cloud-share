# Statue of Liberty — 3D model test (owner challenge, 2026-11-24)

- Statue mesh: "STATUE OF LIBERTY NATIONAL MONUMENT" by VinceCZ on Printables (#110125), licence CC BY — credit
  "Statue of Liberty model by VinceCZ (Printables), CC BY 4.0". It is itself a remix of a Cults3D model by peternak3d plus
  a torch part from Thingiverse #65869; their licences could not be checked from this session (Cults3D/Thingiverse
  blocked) — confirm before using it in a paid/commercial ad.
- Re-meshed: 917k triangles welded to 456k vertices with smooth normals (`kit/models/liberty/{pos,nor,idx}.bin`, 21 MB).
- Scaled to the real size: heel to top of torch 46.05 m (NPS). Verdigris patina shader (rain-washed up-facing areas,
  darker folds, brown streaks, hammered-copper normal noise), gilded flame.
- Scene (`source/story.js`, kit/hd.js): Hunt pedestal (procedural, ~27 m), 11-point Fort Wood star, Liberty Island,
  animated harbour water reflecting the sky, Poly Haven CC0 sky + textures.
- Stills: `stills/` (9:16 + 16:9). Render again: `cd source && RS=1 node kit/render.cjs still 0.2,2.2,3.2 out` (AR=land for 16:9).
