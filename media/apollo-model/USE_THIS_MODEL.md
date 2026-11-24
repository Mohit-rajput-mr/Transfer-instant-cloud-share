# Apollo 11 Command Module "Columbia" — USE THIS MODEL

Real laser scan by the Smithsonian (National Air and Space Museum, Digitization Program Office), from 3d.si.edu.
Licence: Smithsonian Open Access, **CC0** (public domain). Credit anyway: "Apollo 11 Command Module Columbia, 3D scan by the
Smithsonian Institution (3d.si.edu), CC0".

## Files (media/kit/models/apollo/)
- `apollo_exterior-150k-4096.glb` (14.6 MB): exterior, 150k triangles, 4K photo textures (shell, top bay, window panes = untextured "filler").
- `apollo_interior-medium.glb` (40 MB): cabin interior (hull, panels, seats, graffiti), same scan frame as the exterior.

## Transform (both files)
Ignore the glTF node transforms (museum display tilt). Per mesh geometry: `rotateX(+90°)` → `translate(0, -43.58, 0)` → `scale(0.01)`.
Result: metres, capsule axis = +y, heat-shield bottom at y = 0, apex (top of the open bay) at y = 2.741, radius 1.955 (real: 12 ft 10 in = 3.91 m across).
The interior lines up with the exterior with the same transform (checked: docking tunnel coaxial, r ≈ 0.38 m).

## Landmarks (capsule-local, metres)
- Hatch window ≈ (0, 1.5, 1.6) side facing +z; seats ≈ y 0.83–1.89; tunnel top y ≈ 2.6.
- The "filler" mesh (no texture) = the window panes: give it dark glass.

## Notes
- This is the capsule as it is today, after the flight: scorched, forward heat shield gone, the top bay (parachute compartment) open.
  In flight it wore silver Mylar (Block II) and the forward heat shield covered the top: for flight shots keep the camera on the
  heat-shield side, or show the silver look with a shader (see apollo-film/source/story_a.js `capMat`, `uSilver`).
- Side-by-side checks against real photos: apollo-film/source/check/side_by_side.jpg.
