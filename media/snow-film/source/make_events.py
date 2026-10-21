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
add(A["seed"] + 1.0, "move")
add(A["hex"] + 1.0, "click")
add(A["temp"] + 2.8, "word"); add(A["temp"] + 5.2, "word"); add(A["temp"] + 7.6, "word")
add(A["fall"] + 1.0, "move")
add(A["unique"] + 1.5, "launch")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
