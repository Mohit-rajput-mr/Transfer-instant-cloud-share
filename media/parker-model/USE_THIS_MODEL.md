# Parker Solar Probe — USE THIS MODEL

NASA's own 3D model (NASA 3D Resources, "Parker Solar Probe", "free and without copyright"):
`media/kit/models/parker/parker-nasa.glb` (Draco + WebP textures). Credit: "3D model: NASA".
Named nodes: `BUS`, `heatShield_Mounting`, `CoolingSystem` (+ `_frame`), `HGA`, `Instruments` (incl. the shield face, material
`PSP`), `electricAntennas`, `solarArray_arms` (`solarWing_LeftBacking/RightBacking`), `boom`, `magnetometers`, `vents`.
Units ≈ metres (shield mount ~2.0 m across; real shield 2.3 m → ×1.15). Loaded in three.js the heat shield faces −z (towards the
Sun), the magnetometer boom runs along +z. Needs DRACOLoader (`kit/lib/jsm/libs/draco/gltf/`). NASA preview: `nasa_preview.png`.
