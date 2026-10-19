# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(A["hook"] + 2.2, "strike")
add(A["big"] + 0.5, "click"); add(A["big"] + (A["candle"] - A["big"]) * 0.45, "click")
add(A["candle"] + 0.8, "word")
add(A["move"] + 0.3, "launch"); add(A["move"] + 0.4, "word"); add(A["move"] + 0.3 + (A["zone"] - A["move"]) * 0.5, "done")
add(A["zone"] + 0.5, "burn"); add(A["zone"] + 1.0, "click"); add(A["inside"] - 0.15, "launch")
add(A["inside"] + 0.6, "click")
sp = A["bear"] - A["return"]
for i in range(6): add(A["return"] + 0.3 + i * sp * 0.07, "tap")
add(A["return"] + sp * 0.45, "done")
add(A["bear"] + 0.6, "click"); add(A["fail"] + (A["tip"] - A["fail"]) * 0.55, "strike")
sp = A["end"] - A["tip"]
for f in (0.05, 0.35, 0.6): add(A["tip"] + sp * f, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
