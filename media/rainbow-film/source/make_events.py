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
add(A["white"] + 1.0, "word")
add(A["bend"] + 1.2, "move"); add(A["bend"] + 5.5, "done")
add(A["bounce"] + 1.0, "click"); add(A["bounce"] + 5.0, "word")
add(A["angle"] + 1.0, "move"); add(A["angle"] + 6.0, "done")
add(A["circle"] + 1.0, "launch"); add(A["circle"] + 3.5, "strike")
add(A["double"] + 2.0, "word")
add(A["yours"] + 1.0, "move"); add(A["yours"] + 5.0, "click")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
