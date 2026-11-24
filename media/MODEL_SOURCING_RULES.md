# MODEL SOURCING RULES — never build a famous real thing from code (owner, 2026-11-24, hard rule)

The owner rejected agent-built landmarks (a melted-candle Statue of Liberty, a box-stack Burj Khalifa, a wire-mesh Eiffel
Tower). The Statue of Liberty that passed (`media/liberty-model/`) was NOT sculpted by an agent: it started from a real,
person-made, licensed 3D model and the agent only did the finishing. Every agent follows this from now on.

## 1. What may and may not be built from code
- **Never build from code:** statues, faces, people, animals, sculpture, drapery, famous buildings and landmarks, vehicles,
  brand-name products, anything a viewer knows from real life by its exact shape. Lofting tubes/blobs/boxes into these
  always looks fake.
- **May build from code** (procedural, from real dimensions): simple engineering geometry — pistons, gears, pipes, cables,
  lattice girders, tanks, plain walls, terrain, water, sky, particles, diagrams — and only where it passes the photo check (§4).

## 2. Where to get the model (in this order)
1. **Already in the repo:** `media/kit/models/` (Liberty statue, car, head scan, planets) and `media/kit/ph/` (Poly Haven).
   Check `media/*/USE_THIS_MODEL.md` first. If one exists for your subject, use it; do not make another.
2. **Free, no account needed (works from this sandbox):**
   - Printables: search `POST https://api.printables.com/graphql/` with
     `query { searchPrints2(query: "…", limit: 20) { items { id name license { name } } } }`, inspect with
     `print(id:) { stls { id name fileSize } image { filePath } user { publicUsername } }`, download via
     `mutation { getDownloadLink(id: "<stl id>", printId: "<print id>", fileType: stl, source: model_detail) { output { link } } }`.
   - Smithsonian 3D: `https://3d-api.si.edu/api/v1.0/content/file/search?q=…` (CC0 where marked).
   - Poly Haven (`python3 media/kit/ph_get.py model <asset>`): CC0 props, furniture, plants, rocks.
   - NASA 3D Resources; Wikimedia Commons (STL files with licences).
3. **Needs a free account token:** Sketchfab (best scans of landmarks, many CC BY). Search works without a token
   (`https://api.sketchfab.com/v3/search?type=models&q=…&downloadable=true&license=by`); downloading needs the owner's
   token (ask with `request_credential` for `api.sketchfab.com`, header `Authorization`, prefix `Token`). If the owner
   declines, use path 2.
4. If no acceptable model exists: **change the shot** (a wide view, a silhouette at dusk, a close-up of a buildable part)
   and tell the owner in one line. Never fill the gap with a code-built stand-in.

## 3. Licence check (before you download)
- Allowed for the owner's marketing films: **CC0, CC BY, CC BY-SA** (credit the author + licence + link in the film's
  README and in the post description). Not allowed: **NC (non-commercial), ND (no derivatives)**, "personal use only",
  no licence at all (e.g. random GitHub repos without a LICENSE), anything paid/ripped.
- Remixes: note the upstream models too; if their licence can't be checked, say so in the README.

## 4. Pick the best candidate, then finish it (this is the agent's job)
- Download 3–6 candidates, render each from front / ¾ / side / back / face close-up on a plain background (contact sheet),
  and compare against reference photos. Pick the one a stranger would call "that's exactly it".
- Finishing: weld + smooth normals (or keep the author's), scale to the REAL size from an official source, orient it,
  decimate only if it won't render in time (keep the silhouette and the face), then real materials (patina, stone, glass,
  painted iron…), lighting with a visible sun, and the real surroundings.
- Write `media/<subject>-model/USE_THIS_MODEL.md` (files, units, scale, landmark coordinates, credit) so the next agent
  reuses it, and add a viewer or stills.

## 5. Proof before handing over
- A side-by-side PNG per hero shot (your frame | the reference photo) in `media/<film>/source/check/`.
- One line to the owner: which model, from where, which licence, what you changed.
