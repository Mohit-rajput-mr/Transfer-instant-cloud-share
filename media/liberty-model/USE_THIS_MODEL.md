# Statue of Liberty model — use THIS one (owner's pick, 2026-11-24)

The owner chose this model over the earlier procedural one (rejected as not a replica). Any agent making a Statue of
Liberty shot or film must use it.

## Files
- `media/kit/models/liberty/pos.bin` (float32 xyz), `nor.bin` (float32 smooth normals), `idx.bin` (uint32 triangles):
  456,190 vertices, 916,816 triangles, raw model space (Z-up). For films load these (see `source/story.js`).
- `viewer/`: the interactive preview (https://claude.ai/artifact/1qGbgyFgHFQvigg6YuauJt). Same mesh, Y-up, in metres,
  base at y = 0, gzip-compressed: positions uint16 quantised between `meta.lo` and `meta.hi`, normals int8, indices uint32.
  (`.wasm` is only the extension the artifact host serves; the bytes are gzip.)
- `source/story.js`: hero scene (kit/hd.js) — loading, true-scale transform, the verdigris patina + gilded flame shader,
  pedestal, Fort Wood star, harbour, camera presets for face / torch / tablet. Copy from it.
- `stills/`: reference renders (9:16 + 16:9).

## Scale + landmarks (metres, after `rotateX(-90°)`, centred in x/z, base at 0, scaled to 46.05 m heel→torch)
- Torch flame tip (-6.1, 46.05, 3.2) · torch cup ≈ (-6.0, 43.6, 3.0) · face ≈ (-1.6, 32.2, 1.6) (front = +z)
- Tablet ≈ (5.5, 18, 0.5) · statue base sits on the pedestal top (pedestal ≈ 27 m on the 6.5 m fort walls).

## Licence (must credit)
"Statue of Liberty model by VinceCZ (Printables #110125), CC BY 4.0". It remixes a Cults3D model by peternak3d and a
Thingiverse #65869 torch part; confirm those licences before a paid ad. Credit it in every film's README + description.
