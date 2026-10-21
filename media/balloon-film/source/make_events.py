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
add(A["dense"] + 1.5, "move")
add(A["lift"] + 1.0, "launch")
add(A["burner"] + 1.0, "burn"); add(A["burner"] + 2.0, "burn"); add(A["burner"] + 3.0, "burn")
add(A["down"] + 2.5, "move")
add(A["steer"] + 3.5, "move")
add(A["first"] + 1.5, "word")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
