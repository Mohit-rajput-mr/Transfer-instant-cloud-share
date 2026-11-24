# Bell X-1 "Glamorous Glennis" (46-062) — USE THIS MODEL

Real 3D scan by the Smithsonian (National Air and Space Museum), 3d.si.edu, Smithsonian Open Access, **CC0**, with its own
photo texture (orange paint, national insignia, "6062" on the fin). Credit: "Bell X-1, 3D scan by the Smithsonian Institution (3d.si.edu), CC0".

## File (media/kit/models/bellx1/)
- `bell_x1-100k-4096.glb` — Draco-compressed (use DRACOLoader, decoder at kit/lib/jsm/libs/draco/gltf/). Units: millimetres.

## Transform
Apply node matrices, `scale(0.001)` → metres, then `translate(0.155, -0.115, 0)` to put the fuselage axis on x = y = 0.
Nose toward **-z** (nose tip z = -6.19), tail cone z ≈ 4.2; span 8.57 m along x (28 ft); fin top y ≈ 2.28.

## Landmarks (after the transform, metres)
- Horizontal stabilizer: triangles with z > 2.2, scan-y 0.55–1.02, |x| > 0.26 → own pivot at (0, 0.685, 3.3) so it can tilt.
- Rocket chambers (XLR11, 4): around (±0.15, 0, 4.2) and (0, ±0.16, 4.2).
- Wings: z ≈ -3 … 0.
See x1-film/source/story_a.js for loading, the stabilizer split and the plumes.
