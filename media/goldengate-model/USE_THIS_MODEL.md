# Golden Gate Bridge tower — use THIS one (2026-11-24, media/MODEL_SOURCING_RULES.md)
- "Golden Gate Bridge" by **Supratik Athanti**, Printables #1562815, **CC BY 4.0** — credit in every README + post:
  "Golden Gate Bridge tower model by Supratik Athanti (Printables #1562815), CC BY 4.0".
- The print shortens the span, so only one tower (with its pier) is cut out (`tmf2stl.py` then `gg_tower_prep.py`):
  `media/kit/models/goldengate/{pos,nor,idx}.bin + meta.json`, y up, water at y = 0, top 227 m, ~35 m across (scale taken
  from the model: deck → top = 160 m). Place two 1,280 m apart along z; legs at x ≈ ±13 m. Concrete below 14 m (pier).
- Deck truss, main cables, suspender ropes: plain engineering geometry from the real dimensions (allowed by the rules).
