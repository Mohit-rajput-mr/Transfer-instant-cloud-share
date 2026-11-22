# FIX BRIEF — Burj Khalifa + Eiffel Tower films are NOT at the required quality. Redo the visuals before handing them over.

The owner reviewed contact sheets of `burj-film` and `eiffel-film` and rejected them: the landmarks don't look like the
real buildings, the cities are grey boxes, the skies are flat white fog, and several shots are primitives or flat 2D
graphics. This breaks the hard rule in `CLAUDE.md` (HIGH END ONLY) and `media/BRIEF_LANDMARKS.md` §2. Do NOT send the
owner these films until every item below passes the checks in §4. Same rule for the other three landmark films.

## 1. What is wrong (from the owner's screenshots)
**Burj Khalifa**
- The tower is a stack of grey boxes with a grid texture: no Y-shaped (three-winged) plan, no spiralling setbacks, no
  silver glass + stainless-steel fins, no tapering spire. It reads as a generic stepped skyscraper.
- Downtown Dubai is untextured grey blocks on a beige plane: no Dubai Fountain lake, no Address/Downtown towers, no roads
  with traffic, no desert, no Gulf coast. Sky is a washed-out white haze with no sun and no depth.
- The wind-tunnel scenes are flat 2D spiral sprites around a plain cylinder primitive and a white ball: they look like
  clip-art, not airflow. The "plain tower vs Burj" comparison has no real Burj in it.
- The Orbi ending is a dark laptop on a dark slab with a fuzzy green blob; the screens are unreadable.

**Eiffel Tower**
- The tower is a uniform black wire mesh: no real proportions (the curved legs, the four big arches under the first floor,
  the 1st/2nd floor platforms with their galleries, the slender top section, the summit with antennas), no real colour
  ("Eiffel Tower brown", a warm bronze-brown), no depth or thickness in the girders.
- Paris is an endless grid of identical grey boxes: no Haussmann buildings (cream stone, grey zinc mansard roofs), no
  Seine with bridges, no Champ de Mars lawn, no Trocadéro. Sky is a flat white/grey fog.
- The rivets are toy spheres; the "red-hot rivet" is a giant glowing mushroom filling the frame; several frames are almost
  empty (blank orange or black).
- The Orbi ending repeats the dark-slab laptop; the end card is fine.

## 2. Why it happened (fix the cause, not the frame)
- Landmarks were built from generic primitives instead of their real geometry, and never compared against a photo.
- No real sky/sun: fog + low-contrast lighting flattened everything.
- City context was filler (instanced boxes) instead of a believable district.
- Diagrams (vortices, rivets) were drawn as 2D sprites or toy shapes instead of 3D effects in the real scene.
- Nobody did a side-by-side check against reference photos before rendering.

## 3. What to do (in this order)
### 3.1 Reference photos first (mandatory)
- Download 6–10 reference photos per landmark from Wikimedia Commons (free licence; note author + licence in README),
  into `media/<film>/source/ref/`: front, three-quarter, close-up of the structure, the city around it, golden hour, night.
- Every hero shot gets a matching reference photo with the same angle. You will compare against them in §4.

### 3.2 The landmark model: real geometry, real scale, real materials
Pick the best available path, in this order:
1. **A real 3D model with a permissive licence** (CC0 / CC BY) from Sketchfab, Poly Haven, Smithsonian 3D, or similar.
   Check the licence allows commercial use, credit it in the README, and check the polycount renders in time
   (decimate if needed, keep the silhouette). If the site needs an account/token the session doesn't have, say so in
   one line and use path 2 — do not stop.
2. **Procedural from real drawings and dimensions**, detailed enough to pass §4:
   - **Eiffel Tower** (330 m): four curved legs following the real profile (wide splayed base, convex curve inward),
     each leg a box girder of four corner members with X-lattice bracing at TWO scales (big X panels, each panel itself
     latticed); the four decorative arches between the legs under the 1st floor; 1st floor (57 m) and 2nd floor (116 m)
     platforms with railings, galleries and the restaurant boxes; the narrow upper section rising to the 3rd floor (276 m)
     and the summit with antennas; lifts in the legs. Girders have real thickness (boxes/I-sections, not lines).
     Material: bronze-brown painted iron (roughness ~0.6, slight metallic), subtle colour gradient (darker at the base,
     lighter at the top — the real tower is painted in three shades), visible rivet bumps as a normal map.
   - **Burj Khalifa** (828 m): the real Y-shaped (tri-lobed) floor plan around a hexagonal core, three wings with
     rounded ends; 27 setbacks spiralling upward (each wing steps back in turn), tapering to the spire; curtain wall of
     reflective silver-blue glass with vertical stainless-steel fins (normal + roughness maps; the glass must reflect the
     sky and the sun); the spire with its own maintenance rings; night lighting optional.
3. Never ship a box stack or a wire mesh for a landmark again. If it still doesn't look like the photo, change the shot
   (closer detail, a different angle) rather than ship it.

### 3.3 The city around it (believable, not filler)
- **Dubai:** the Dubai Fountain lake right at the base (animated water, reflections, the fountain jets in one shot),
  Downtown towers of varied heights and glass colours, Sheikh Zayed Road with moving car lights, palm trees, desert
  beyond, the Gulf on the horizon. Golden hour sun, warm haze (not white fog).
- **Paris:** Haussmann blocks (cream limestone facades, balconies, grey-blue zinc mansard roofs, chimneys) in Paris's real
  diagonal street pattern around the tower; the Seine with the Pont d'Iéna and boats; the Champ de Mars lawn and trees;
  the Trocadéro across the river. Clear sky with clouds, sun angle matching the time of day.
- Use real PBR textures (stone, zinc, glass, asphalt, grass, water) and an HDRI-style sky with a visible sun. Keep the
  fog thin and blue-grey at distance, never a white wall.

### 3.4 Physics diagrams inside the real scene (no clip-art)
- **Vortex shedding:** real 3D smoke particles (thousands, soft sprites with lighting) streaming past the tower in a
  wind-tunnel shot with a real tunnel set (walls, flow straighteners, a fan, laser sheet light). Show the alternating
  vortex street behind a plain cylinder vs. the broken-up wake behind a correctly modelled Burj Khalifa. Same camera,
  same wind, side by side.
- **Thermal expansion:** the real tower with a thermal-camera shader on the sunny side and a measured height ruler;
  the summit path traced as a glowing line (label MOTION EXAGGERATED).
- **Rivets:** a real rivet (domed head, shank) at true scale in a close-up of two plates, heated orange-red with a glow
  that matches the metal (not a giant mushroom), hammered by a riveting hammer, cooling to dark. Never fill the frame
  with a single glowing blob.

### 3.5 The Orbi ending (readable, on brand)
- Real orbitransfer.com captures on a phone + laptop, screens bright and READABLE at phone size (screen ≥ 40% of the
  frame width at some point), on a real table (wood, concrete) in a lit room or outdoors with the landmark behind (soft
  depth of field). No dark slab, no blobs. Show the actual feature the line talks about.

## 4. Checks before you hand anything to the owner (all must pass)
1. **Side-by-side test:** for every hero shot, put your frame next to its reference photo (one PNG per pair in
   `media/<film>/source/check/`). A stranger must recognise the landmark and the city instantly. If not, fix and repeat.
2. **Contact sheets** of every section in BOTH 9:16 and 16:9 (`kit/preview.py`, `AR=land`): no empty or near-blank
   frames, no white-wall fog, no primitive stand-ins, no overlapping HUD/subtitles, readable screens.
3. **Lighting:** a visible sun or a clear key light in every outdoor shot; the brightest pixels never clip across more
   than a small area (check a histogram); the darkest shots still show detail.
4. **Facts:** every number on screen matches the README sources ("16,192 iron parts" vs "18,000", "2.1 million" vs "2.5
   million" rivets: pick ONE sourced value and use it everywhere, voice and HUD).
5. **Orbi claims:** only the playbook's verified facts; never "gone in 30 minutes" (the sender picks 5–30 min).
6. Then render both formats, verify the MP4s (ffprobe, contact sheet, Whisper on the audio), commit, push, and send.
   Log what you changed in FLEET_SYNC.md (Defect log: "landmark films shipped below quality: cause + fix").
