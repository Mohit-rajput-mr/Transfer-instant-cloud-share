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
add(A["hook"] + 4.0, "lid")
add(A["loop"] + 1.0, "move")
add(A["evap"] + 3.0, "word"); add(A["evap"] + 5.5, "done")
add(A["squeeze"] + 1.0, "launch"); add(A["squeeze"] + 4.0, "strike")
add(A["coils"] + 1.5, "move"); add(A["coils"] + 5.0, "done")
add(A["valve"] + 1.5, "click"); add(A["valve"] + 4.0, "word")
add(A["door"] + 2.5, "word")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
