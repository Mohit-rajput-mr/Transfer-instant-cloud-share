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
add(A["hook"] + 3.8, "lid")
add(A["shell"] + 4.5, "launch")
add(A["fuse"] + 1.5, "word"); add(A["fuse"] + 4.0, "strike")
add(A["stars"] + 4.5, "strike")
add(A["colour"] + 3.0, "move"); add(A["colour"] + 5.5, "done")
add(A["metals"] + 0.6, "strike"); add(A["metals"] + 1.8, "strike"); add(A["metals"] + 3.0, "strike"); add(A["metals"] + 4.2, "strike")
add(A["shape"] + 4.0, "strike")
add(A["close"] + 0.6, "strike"); add(A["close"] + 2.0, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
