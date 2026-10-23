# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(1.2, "word")
add(A["three"] + 0.6, "tap"); add(A["three"] + 2.0, "tap"); add(A["three"] + 3.6, "tap")
add(A["vacuum"] + 2.0, "launch")
add(A["mirror"] + 1.5, "word")
add(A["lid"] + 1.0, "click"); add(A["lid"] + 4.0, "move")
add(A["history"] + 1.0, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
