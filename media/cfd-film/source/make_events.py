# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
for i in range(3): add(0.6 + i * 0.7, "click")
add(A["what"] + 0.6, "click"); add(A["long"] + 0.3, "launch"); add(A["short"] + 0.3, "launch")
add(A["lev"] + 0.4, "word"); add(A["lev"] + 1.6, "click")
sp = A["call"] - A["magnify"]; add(A["magnify"] + 0.3, "done"); add(A["magnify"] + sp * 0.5, "lid")
add(A["costs"] - 1.4, "strike"); add(A["costs"] + 0.4, "click"); add(A["costs"] + (A["why"] - A["costs"]) * 0.5, "click")
sp = A["truth"] - A["why"]
for i in range(3): add(A["why"] + 0.4 + i * sp * 0.25, "tap")
add(A["truth"] + 2.0, "strike")
sp = A["end"] - A["tip"]
for f in (0.05, 0.35, 0.6): add(A["tip"] + sp * f, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
