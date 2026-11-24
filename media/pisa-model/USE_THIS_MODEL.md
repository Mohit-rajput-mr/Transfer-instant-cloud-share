# Leaning Tower of Pisa model — use THIS one (2026-11-24)

Picked under `media/MODEL_SOURCING_RULES.md` from 8 Printables candidates (`candidates.jpg`: author previews, then point
renders of the two finalists — top: this model, bottom: a low-poly one). Do not build the tower from code.

## Source + licence
- "Monuments 01 – Leaning Tower of Pisa – Italy" by **André Spilari**, Printables #1714900, **Public Domain (CC0)**.
  Credit anyway: "Leaning Tower of Pisa model by André Spilari (Printables #1714900), public domain".
- Rejected: FallenAngel #965224 (CC BY, very detailed but split into print parts), Díaz #1028451 (CC BY, low detail),
  others NC/ND or toy-like.

## Files
- `media/kit/models/pisa/storeys.bin` + `storeys.json` (37 MB): 8 meshes, one per storey (ground storey, six galleries,
  belfry), each `pos` float32 xyz (m), `nor` int8×4 (normalised), `idx` uint32; base of each storey at y = 0 on the axis.
  Built by `pisa_prep.py` from the STL (download: Printables API `getDownloadLink(id: "7160436", printId: "1714900")`).
- Loader: `media/pisa-film/source/story_a.js` (chain of storey nodes, `setTower(tilt, curveK, upto)`).

## Scale + frame
- y up; the model's own lean (4.00°) removed, so the tower stands upright and the film applies the lean (towards +x).
- Real size: outer diameter 15.48 m at the base, 56.67 m along the axis (Wikipedia). The author's storey proportions and
  curve are kept (no per-storey straightening). Storey bases (m): 0, 12.62, 18.77, 24.91, 30.50, 36.09, 41.67, 46.70; top 56.67.
- The ground storey is solid in the model (no stair well): for cut-aways, draw back faces seen through the cut as cut
  stone and the r < 3.68 m core dark (see the marble shader in the film) — that matches the real hollow tower.
