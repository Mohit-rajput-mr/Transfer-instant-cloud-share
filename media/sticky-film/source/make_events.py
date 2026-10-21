# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(1.2, "strike")
add(A["hook"] + 3.5, "click")
add(A["silver"] + 1.5, "word"); add(A["silver"] + 6.0, "strike")
add(A["spheres"] + 1.0, "launch")
add(A["fry"] + 5.0, "move")
add(A["launch"] + 2.0, "click"); add(A["launch"] + 5.0, "launch")
add(A["reuse"] + 1.0, "click"); add(A["reuse"] + 2.5, "click")
add(A["orbi"] + 1.0, "move"); add(A["orbi"] + 3.0, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
