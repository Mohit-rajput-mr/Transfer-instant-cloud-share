# 1903 Wright Flyer — USE THIS MODEL

Real 3D scan by the Smithsonian (National Air and Space Museum), 3d.si.edu, Smithsonian Open Access, **CC0**.
Credit: "1903 Wright Flyer, 3D scan by the Smithsonian Institution (3d.si.edu), CC0".

## Files (media/kit/models/wright/)
- `wings.glb` (wings, elevator, rudder, struts, ribs, skids), `filler.glb` (metal: wires, chain guides, shafts, propellers),
  `engine.glb` — the 4096 "high" web parts. Shape only: normal + occlusion maps, **no colour texture** (the scan has none).
- `wright_flyer-150k-4096.glb`: the same machine as one mesh (also no colour).

## Transform
Apply each file's node matrices, then `translate(-8.041, 96.151, 35.226)` (cm) and `scale(0.01)` → metres, centred in x/z,
skid bottoms at y = 0, span along x (12.29 m = 40 ft 4 in), nose (front elevator) toward **+z**, length 6.43 m, height 2.79 m.

## Landmarks (metres)
- Propeller hubs: right (1.622, 1.499, -1.442), left (-1.544, 1.467, -1.42); blades 2.57 m (8.5 ft). Separate them from
  `filler` by triangles inside z ∈ (-1.62, -1.29), | |x| - 1.58 | < 0.34 to spin them.
- Engine ≈ (-0.33, 0.9, 0.08); hip cradle ≈ (0.45, 0.62, -0.05); elevator hinge ≈ y 1.1, z 2.75 (region z > 2.3);
  rudder pivot x 0.08, z -2.45 (region z < -2.3); wings z ≈ -1.3 … 1.2.

## Finishing (real materials)
Spruce for straight members, ash for ribs (golden varnished wood), unbleached cotton muslin ("Pride of the West") on the
surfaces, aluminium-painted propellers with canvas tips, steel wires/chains, cast-aluminium engine.
See wright-film/source/story_a.js `flyerMat` (fabric vs wood from the surface normal; warp/rudder/elevator in the vertex shader).
